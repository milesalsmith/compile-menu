/* ---------- TYPES ---------- */
/* Ported from menu-compiler.jsx — see .cursor/rules/010-engine.mdc for the
   invariants these types support. */

export type Format = "burger" | "pitta" | "wrap" | "plate" | "bowl";
export type Protein = "breast" | "thigh" | "wings" | "veg";
export type Style = "classic" | "cheesy" | "garlicky" | "loaded" | "fresh";

/* What the engine actually needs from an item. Attribute values are plain
   strings because the three filter SLOTS are fixed but their OPTION VALUES
   are per-menu: the demo dataset uses its own closed vocabulary below, an
   uploaded menu brings its own (rule 010-engine.mdc, "Vocabulary"). */
export interface CompiledItem {
  id: string;
  /** The item's name. Verbatim from the source on uploaded menus. */
  name: string;
  format: string;
  proteins: string[];
  styles: string[];
  vegetarian: boolean;
  vegan: boolean;
  heat: boolean;
  /** When true, portion (single vs double) is a setting — not a separate product. */
  portion: boolean;
  /** One sentence describing the components, never a branded name. */
  plain: string;
}

/** The shipped demo dataset narrows the attributes to its closed vocabulary. */
export interface MenuItem extends CompiledItem {
  format: Format;
  proteins: Protein[];
  styles: Style[];
}

export type FilterId = "format" | "protein" | "style";

/** The option values available on each filter slot, for one menu. */
export type FilterOptions = Record<FilterId, readonly string[]>;

export type QuestionId = "format" | "protein" | "style" | "heat" | "portion" | "side";
export type QuestionKind = "filter" | "config";

export interface QuestionOption {
  id: string;
  label: string;
  note: string;
  color?: string;
}

export interface Question {
  id: QuestionId;
  kind: QuestionKind;
  prompt: string;
  sub: string;
  options: QuestionOption[];
}

/* qid -> chosen option id, accumulated one per answered question */
export type Answers = Partial<Record<QuestionId, string>>;
