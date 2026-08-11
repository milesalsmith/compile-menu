/* ---------- TYPES ---------- */
/* Ported from menu-compiler.jsx — see .cursor/rules/010-engine.mdc for the
   invariants these types support. */

export type Format = "burger" | "pitta" | "wrap" | "plate" | "bowl";
export type Protein = "breast" | "thigh" | "wings" | "veg";
export type Style = "classic" | "cheesy" | "garlicky" | "loaded" | "fresh";

export interface MenuItem {
  id: string;
  name: string;
  format: Format;
  proteins: Protein[];
  styles: Style[];
  vegetarian: boolean;
  vegan: boolean;
  heat: boolean;
  /** When true, single vs double is a setting — not a separate product. */
  portion: boolean;
  plain: string;
}

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
