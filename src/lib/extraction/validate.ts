import type { CompiledItem, FilterId, QuestionOption } from "../types";
import type { MenuVocabulary } from "../vocabulary";
import { filterOptionsOf } from "../vocabulary";
import { ASK_COST, FILTER_QUESTION_IDS, gain } from "../entropy";
import { collapseSizeVariants } from "./portion";
import type { DropReason, ExtractionTrace, ModelShape } from "./trace";
import { recordDrop } from "./trace";

/* ---------- DETERMINISTIC VALIDATION ---------- */
/* The fence. Everything above this line came from a model; nothing below it
   trusts that. Invalid or invented output is rejected, never repaired into
   something plausible.

   The model is only asked for a dish list. Vocabulary is derived from the
   items that survive grounding — a model-declared option set only proved
   that the model agreed with itself. */

/** A menu with fewer than this many items is not worth compiling. */
export const MIN_ITEMS = 4;

/* Evidence is a quoted line, not a licence to quote the whole document: an
   unbounded snippet would trivially contain every name and prove nothing. */
export const MAX_EVIDENCE_CHARS = 300;

/* When evidence is omitted, dietary markers must appear on the name's line
   or an immediate neighbour — not anywhere in the document. */
const NAME_LINE_RADIUS = 1;

const ITEM_KEYS = [
  "name",
  "evidence",
  "plain",
  "format",
  "proteins",
  "protein",
  "styles",
  "style",
  "vegetarian",
  "vegan",
  "heat",
  "portion",
] as const;

/* Flavour-family slugs, not a dumped recipe. "black-pepper" is a style;
   "sweet-chilli-fenugreek-paprika-with-pakora" is a sentence. */
const MAX_STYLE_SLUG_PARTS = 4;

/* Names a model reaches for when it cannot find one. An item without a
   discernible name is dropped, never given an invented one. */
const PLACEHOLDER_NAMES = new Set([
  "",
  "-",
  "n/a",
  "na",
  "none",
  "unknown",
  "unnamed",
  "untitled",
  "item",
  "menu item",
  "dish",
  "product",
]);

const UNSAFE_KEY = /allerg|gluten|coeliac|celiac/i;

/* Dietary status is a hard constraint on the universe, so it is only ever
   taken from a marker the document itself prints. An ingredient list that
   merely looks meat-free is not a claim the menu made. */
const VEGETARIAN_MARKERS = ["vegetarian", "veggie", "meat free", "meatfree", "v"];
const VEGAN_MARKERS = ["vegan", "plant based", "plantbased", "ve", "vg"];

export type ExtractionFailure =
  | "invalid_output"
  | "unsafe_field"
  | "too_few_items"
  | "no_variety";

export interface ValidatedMenu {
  items: CompiledItem[];
  vocabulary: MenuVocabulary;
}

export type ValidationSlice = Pick<
  ExtractionTrace,
  "proposed" | "kept" | "collapsedFrom" | "drops" | "samples" | "varietyGain" | "modelShape"
>;

export type ValidationResult =
  | { ok: true; menu: ValidatedMenu; slice: ValidationSlice }
  | { ok: false; code: ExtractionFailure; slice: ValidationSlice };

function emptySlice(): ValidationSlice {
  return {
    proposed: 0,
    kept: 0,
    collapsedFrom: 0,
    drops: {},
    samples: [],
    varietyGain: null,
    modelShape: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionId(value: unknown): string | null {
  const raw = text(value);
  if (raw === null) return null;
  const id = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return id.length > 0 ? id : null;
}

function slugFrom(value: unknown): string | null {
  if (isRecord(value)) return optionId(value.id);
  return optionId(value);
}

function asIdList(raw: unknown, opts: { flavour?: boolean } = {}): string[] | null {
  if (raw === undefined || raw === null) return null;
  const ids: string[] = [];
  const entries = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : null;
  if (entries === null) return null;
  for (const entry of entries) {
    const id = slugFrom(entry);
    if (id === null) return null;
    if (opts.flavour && id.split("-").filter(Boolean).length > MAX_STYLE_SLUG_PARTS) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.length > 0 ? ids : null;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function labelFromId(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* Compact fallback is only for long names: "fire cracker" vs "firecracker".
   Short strings would otherwise match inside unrelated words. */
const MIN_COMPACT_CHARS = 12;

interface FoldedText {
  padded: string;
  compact: string;
}

/* Encoding, not invention: fold diacritics, drop apostrophes, treat & as
   "and". The displayed name stays verbatim; only the grounding haystack
   changes. Cinco's / CINCOS / Cinco’s must not be three different dishes. */
function tokens(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['\u2018\u2019\u201A`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function foldText(value: string): FoldedText {
  const t = tokens(value);
  return { padded: ` ${t} `, compact: t.replace(/ /g, "") };
}

function searchable(value: string): string {
  return foldText(value).padded;
}

function containsToken(haystack: string, needle: string): boolean {
  return needle.trim().length > 0 && haystack.includes(needle);
}

function nameIn(name: string, haystack: FoldedText): boolean {
  if (containsToken(haystack.padded, searchable(name))) return true;
  const withoutPossessive = name.replace(/['\u2018\u2019\u201A`]s\b/gi, "");
  if (withoutPossessive !== name && containsToken(haystack.padded, searchable(withoutPossessive))) {
    return true;
  }
  const compactName = tokens(name).replace(/ /g, "");
  return compactName.length >= MIN_COMPACT_CHARS && haystack.compact.includes(compactName);
}

/* Locate the dish list without inventing items. Models often use dishes /
   mains / menu.items instead of our "items" key; that is finding the array,
   not repairing its contents. */
function findItemsArray(raw: Record<string, unknown>): { key: string; items: unknown[] } | null {
  if (Array.isArray(raw.items)) return { key: "items", items: raw.items };
  if (Array.isArray(raw.dishes)) return { key: "dishes", items: raw.dishes };
  if (Array.isArray(raw.mains)) return { key: "mains", items: raw.mains };
  if (isRecord(raw.menu) && Array.isArray(raw.menu.items)) {
    return { key: "menu.items", items: raw.menu.items };
  }
  return null;
}

export function describeModelShape(raw: unknown): ModelShape {
  if (raw === null) return { kind: "null", keys: [], itemsKey: null, itemCount: null };
  if (Array.isArray(raw)) {
    return { kind: "array", keys: [], itemsKey: null, itemCount: raw.length };
  }
  if (!isRecord(raw)) return { kind: "other", keys: [], itemsKey: null, itemCount: null };
  const found = findItemsArray(raw);
  return {
    kind: "object",
    keys: Object.keys(raw).slice(0, 8),
    itemsKey: found?.key ?? null,
    itemCount: found ? found.items.length : null,
  };
}

function windowAroundName(original: string, name: string): string | null {
  const lines = original.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!nameIn(name, foldText(lines[i]))) continue;
    const from = Math.max(0, i - NAME_LINE_RADIUS);
    const to = Math.min(lines.length, i + NAME_LINE_RADIUS + 1);
    return searchable(lines.slice(from, to).join("\n"));
  }
  return null;
}

function vocabularyFromItems(items: CompiledItem[]): Record<FilterId, QuestionOption[]> {
  const collect = (ids: string[]): QuestionOption[] => {
    const seen = new Set<string>();
    const options: QuestionOption[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label: labelFromId(id), note: "" });
    }
    return options;
  };
  return {
    format: collect(items.map((i) => i.format)),
    protein: collect(items.flatMap((i) => i.proteins)),
    style: collect(items.flatMap((i) => i.styles)),
  };
}

type ParseItemResult =
  | { ok: true; item: Omit<CompiledItem, "id"> }
  | { ok: false; reason: DropReason; name?: string };

/* One item, checked against the document it claims to come from. Returns a
   drop reason when rejected — a missing name or an ungrounded claim removes
   that item rather than being coerced into something valid.

   Attribute slugs are accepted as the menu's own words; the vocabulary the
   engine ranks is built from survivors afterwards, so the model cannot
   inflate the question set with unused options. */
function parseItem(value: unknown, original: string, sourceFold: FoldedText): ParseItemResult {
  if (!isRecord(value)) return { ok: false, reason: "not_an_object" };
  const maybeName = text(value.name) ?? undefined;
  if (Object.keys(value).some((k) => !(ITEM_KEYS as readonly string[]).includes(k))) {
    return { ok: false, reason: "unexpected_keys", name: maybeName };
  }

  const name = text(value.name);
  if (name === null) return { ok: false, reason: "no_name" };
  if (PLACEHOLDER_NAMES.has(name.toLowerCase())) {
    return { ok: false, reason: "placeholder_name", name };
  }

  const plain = text(value.plain);
  if (plain === null) return { ok: false, reason: "plain_missing", name };
  if (plain.toLowerCase() === name.toLowerCase()) {
    return { ok: false, reason: "plain_repeats_name", name };
  }

  /* Quoted evidence is optional. If the model supplies it, it must really be
     in the document and must contain the verbatim name. If it does not, the
     name itself still has to appear in the converted markdown. */
  const evidence = text(value.evidence);
  let markerHaystack: string;
  if (evidence !== null) {
    if (evidence.length > MAX_EVIDENCE_CHARS) return { ok: false, reason: "evidence_too_long", name };
    const quoted = foldText(evidence);
    if (!containsToken(sourceFold.padded, quoted.padded)) {
      return { ok: false, reason: "evidence_not_in_source", name };
    }
    if (!nameIn(name, quoted)) return { ok: false, reason: "name_not_in_evidence", name };
    markerHaystack = quoted.padded;
  } else {
    if (!nameIn(name, sourceFold)) {
      return { ok: false, reason: "name_not_in_source", name };
    }
    markerHaystack = windowAroundName(original, name) ?? "";
  }

  const format = optionId(value.format);
  if (format === null) return { ok: false, reason: "unknown_format", name };

  /* Locate the attribute list — string vs array vs singular key — without
     inventing values. Curry-house runs often emit style: "spicy" instead of
     styles: ["spicy"]; that is the same claim, not a repair. */
  const proteins = asIdList(value.proteins ?? value.protein);
  if (proteins === null) return { ok: false, reason: "unknown_protein", name };
  const styles = asIdList(value.styles ?? value.style, { flavour: true });
  if (styles === null) return { ok: false, reason: "unknown_style", name };

  const flags = ["vegetarian", "vegan", "heat", "portion"] as const;
  if (flags.some((f) => value[f] !== undefined && typeof value[f] !== "boolean")) {
    return { ok: false, reason: "bad_flags", name };
  }
  const vegan = value.vegan === true;
  if (vegan && value.vegetarian === false) return { ok: false, reason: "vegan_without_vegetarian", name };
  const vegetarian = value.vegetarian === true || vegan;

  /* A dietary claim the document didn't make is dropped rather than
     downgraded: the veg protein id and the vegetarian flag have to stay in
     step, so a half-corrected item is not a coherent item. */
  const marked = (markers: string[]) => markers.some((m) => containsToken(markerHaystack, ` ${m} `));
  if (vegetarian && !marked([...VEGETARIAN_MARKERS, ...VEGAN_MARKERS])) {
    return { ok: false, reason: "vegetarian_ungrounded", name };
  }
  if (vegan && !marked(VEGAN_MARKERS)) return { ok: false, reason: "vegan_ungrounded", name };

  /* subpool()'s veg branch assumes vegetarian items carry exactly ["veg"]
     and meat items never do (rule 010-engine.mdc, "Vocabulary"). */
  const isVegOnly = proteins.length === 1 && proteins[0] === "veg";
  if (vegetarian !== isVegOnly) return { ok: false, reason: "veg_protein_mismatch", name };

  return {
    ok: true,
    item: {
      name,
      plain,
      format,
      proteins,
      styles,
      vegetarian,
      vegan,
      heat: value.heat === true,
      portion: value.portion === true,
    },
  };
}

function withIds(items: Omit<CompiledItem, "id">[]): CompiledItem[] {
  const used = new Set<string>();
  return items.map((item) => {
    const base = slug(item.name);
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return { id, ...item };
  });
}

/** `source` is the converted markdown every extracted item is checked against. */
export function validateExtraction(raw: unknown, source: string): ValidationResult {
  const slice = emptySlice();
  slice.modelShape = describeModelShape(raw);
  if (!isRecord(raw)) return { ok: false, code: "invalid_output", slice };

  const found = findItemsArray(raw);

  /* Safety-critical fields are never inferred. If the model volunteered one,
     fail loudly rather than quietly dropping it. */
  const mentionsUnsafeField =
    found !== null &&
    found.items.some((entry) => isRecord(entry) && Object.keys(entry).some((k) => UNSAFE_KEY.test(k)));
  if (mentionsUnsafeField) return { ok: false, code: "unsafe_field", slice };

  if (!found) return { ok: false, code: "invalid_output", slice };

  slice.proposed = found.items.length;
  const sourceFold = foldText(source);
  const parsed: Omit<CompiledItem, "id">[] = [];
  for (const entry of found.items) {
    const result = parseItem(entry, source, sourceFold);
    if (result.ok) parsed.push(result.item);
    else recordDrop(slice, result.reason, result.name);
  }

  const items = collapseSizeVariants(withIds(parsed));
  slice.collapsedFrom = parsed.length;
  slice.kept = items.length;
  if (items.length < MIN_ITEMS) return { ok: false, code: "too_few_items", slice };

  const derived = vocabularyFromItems(items);
  const vocabulary: MenuVocabulary = {
    ...derived,
    hasSides: false,
    heatLevels: 0,
  };

  /* An extraction where every item shares one format is a broken flow, not a
     menu: no question would clear ASK_COST and there is nothing to compile. */
  const filterOptions = filterOptionsOf(vocabulary);
  const best = Math.max(...FILTER_QUESTION_IDS.map((qid) => gain(qid, items, filterOptions)));
  slice.varietyGain = Number.isFinite(best) ? best : 0;
  if (!(best > ASK_COST)) return { ok: false, code: "no_variety", slice };

  return { ok: true, menu: { items, vocabulary }, slice };
}
