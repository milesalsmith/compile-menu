import type { CompiledItem, FilterId, QuestionOption } from "../types";
import type { MenuVocabulary } from "../vocabulary";
import { filterOptionsOf } from "../vocabulary";
import { ASK_COST, FILTER_QUESTION_IDS, gain } from "../entropy";
import { collapseSizeVariants } from "./portion";

/* ---------- DETERMINISTIC VALIDATION ---------- */
/* The fence. Everything above this line came from a model; nothing below it
   trusts that. Invalid or invented output is rejected, never repaired into
   something plausible. */

/** A menu with fewer than this many items is not worth compiling. */
export const MIN_ITEMS = 4;

/* Evidence is a quoted line, not a licence to quote the whole document: an
   unbounded snippet would trivially contain every name and prove nothing. */
export const MAX_EVIDENCE_CHARS = 300;

const ITEM_KEYS = [
  "name",
  "evidence",
  "plain",
  "format",
  "proteins",
  "styles",
  "vegetarian",
  "vegan",
  "heat",
  "portion",
] as const;

const OPTION_KEYS = ["id", "label", "note"] as const;

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

export type ValidationResult =
  | { ok: true; menu: ValidatedMenu }
  | { ok: false; code: ExtractionFailure };

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

function parseOptions(value: unknown): QuestionOption[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const options: QuestionOption[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (Object.keys(entry).some((k) => !(OPTION_KEYS as readonly string[]).includes(k))) return null;
    const id = optionId(entry.id);
    const label = text(entry.label);
    if (id === null || label === null || seen.has(id)) continue;
    seen.add(id);
    options.push({ id, label, note: text(entry.note) ?? "" });
  }
  return options.length > 0 ? options : null;
}

function parseVocabulary(value: unknown): Record<FilterId, QuestionOption[]> | null {
  if (!isRecord(value)) return null;
  const format = parseOptions(value.format);
  const protein = parseOptions(value.protein);
  const style = parseOptions(value.style);
  if (!format || !protein || !style) return null;
  return { format, protein, style };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

/* Reduce text to space-separated alphanumeric tokens, so a quotation still
   matches across markdown table pipes, bullets and curly punctuation. Padded
   with spaces at both ends so every containment check lands on a token
   boundary rather than mid-word. */
function searchable(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function containsToken(haystack: string, needle: string): boolean {
  return needle.trim().length > 0 && haystack.includes(needle);
}

/* One item, checked against the declared vocabulary AND against the document
   it claims to come from. Returns null when the item is rejected — an
   invented attribute value, a missing name or an ungrounded claim removes
   that item rather than being coerced into something valid.

   Vocabulary closure alone would only prove the model agrees with itself:
   it writes both the option list and the attributes it fills in. `source` is
   the converted markdown, the one input to this step the model did not
   write, so anything load-bearing is checked against that instead. */
function parseItem(
  value: unknown,
  vocabulary: Record<FilterId, QuestionOption[]>,
  source: string
): Omit<CompiledItem, "id"> | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((k) => !(ITEM_KEYS as readonly string[]).includes(k))) return null;

  const name = text(value.name);
  if (name === null || PLACEHOLDER_NAMES.has(name.toLowerCase())) return null;

  const plain = text(value.plain);
  if (plain === null || plain.toLowerCase() === name.toLowerCase()) return null;

  /* The quoted passage must really be in the document, and the item's name
     must really be in the quoted passage. Names are verbatim or the item
     doesn't ship. */
  const evidence = text(value.evidence);
  if (evidence === null || evidence.length > MAX_EVIDENCE_CHARS) return null;
  const quoted = searchable(evidence);
  if (!containsToken(source, quoted)) return null;
  if (!containsToken(quoted, searchable(name))) return null;

  const known = (slot: FilterId) => new Set(vocabulary[slot].map((o) => o.id));

  const format = optionId(value.format);
  if (format === null || !known("format").has(format)) return null;

  const list = (raw: unknown, slot: FilterId): string[] | null => {
    if (!Array.isArray(raw)) return null;
    const allowed = known(slot);
    const ids: string[] = [];
    for (const entry of raw) {
      const id = optionId(entry);
      if (id === null || !allowed.has(id)) return null;
      if (!ids.includes(id)) ids.push(id);
    }
    return ids.length > 0 ? ids : null;
  };

  const proteins = list(value.proteins, "protein");
  const styles = list(value.styles, "style");
  if (!proteins || !styles) return null;

  const flags = ["vegetarian", "vegan", "heat", "portion"] as const;
  if (flags.some((f) => typeof value[f] !== "boolean")) return null;
  const vegetarian = value.vegetarian as boolean;
  const vegan = value.vegan as boolean;
  if (vegan && !vegetarian) return null;

  /* A dietary claim the document didn't make is dropped rather than
     downgraded: the veg protein id and the vegetarian flag have to stay in
     step, so a half-corrected item is not a coherent item. */
  const marked = (markers: string[]) => markers.some((m) => containsToken(quoted, ` ${m} `));
  if (vegetarian && !marked([...VEGETARIAN_MARKERS, ...VEGAN_MARKERS])) return null;
  if (vegan && !marked(VEGAN_MARKERS)) return null;

  /* subpool()'s veg branch assumes vegetarian items carry exactly ["veg"]
     and meat items never do (rule 010-engine.mdc, "Vocabulary"). */
  const isVegOnly = proteins.length === 1 && proteins[0] === "veg";
  if (vegetarian !== isVegOnly) return null;

  return {
    name,
    plain,
    format,
    proteins,
    styles,
    vegetarian,
    vegan,
    heat: value.heat as boolean,
    portion: value.portion as boolean,
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

/* Options no surviving item uses are dropped, so the UI never offers a dead
   branch and an over-eager vocabulary cannot inflate the question set. */
function pruneVocabulary(
  vocabulary: Record<FilterId, QuestionOption[]>,
  items: CompiledItem[]
): Record<FilterId, QuestionOption[]> {
  const used: Record<FilterId, Set<string>> = {
    format: new Set(items.map((i) => i.format)),
    protein: new Set(items.flatMap((i) => i.proteins)),
    style: new Set(items.flatMap((i) => i.styles)),
  };
  return {
    format: vocabulary.format.filter((o) => used.format.has(o.id)),
    protein: vocabulary.protein.filter((o) => used.protein.has(o.id)),
    style: vocabulary.style.filter((o) => used.style.has(o.id)),
  };
}

/** `source` is the converted markdown every extracted item is checked against. */
export function validateExtraction(raw: unknown, source: string): ValidationResult {
  if (!isRecord(raw)) return { ok: false, code: "invalid_output" };

  /* Safety-critical fields are never inferred. If the model volunteered one,
     fail loudly rather than quietly dropping it. */
  const mentionsUnsafeField =
    Array.isArray(raw.items) &&
    raw.items.some((entry) => isRecord(entry) && Object.keys(entry).some((k) => UNSAFE_KEY.test(k)));
  if (mentionsUnsafeField) return { ok: false, code: "unsafe_field" };

  const parsedVocabulary = parseVocabulary(raw.vocabulary);
  if (!parsedVocabulary || !Array.isArray(raw.items)) return { ok: false, code: "invalid_output" };

  const document = searchable(source);
  const parsed = raw.items
    .map((entry) => parseItem(entry, parsedVocabulary, document))
    .filter((item): item is Omit<CompiledItem, "id"> => item !== null);

  const items = collapseSizeVariants(withIds(parsed));
  if (items.length < MIN_ITEMS) return { ok: false, code: "too_few_items" };

  const pruned = pruneVocabulary(parsedVocabulary, items);
  const vocabulary: MenuVocabulary = {
    ...pruned,
    hasSides: false,
    heatLevels: 0,
  };

  /* An extraction where every item shares one format is a broken flow, not a
     menu: no question would clear ASK_COST and there is nothing to compile. */
  const filterOptions = filterOptionsOf(vocabulary);
  const best = Math.max(...FILTER_QUESTION_IDS.map((qid) => gain(qid, items, filterOptions)));
  if (!(best > ASK_COST)) return { ok: false, code: "no_variety" };

  return { ok: true, menu: { items, vocabulary } };
}
