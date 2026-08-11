import type { FilterOptions, QuestionOption } from "./types";

/* The option values for one menu's three filter slots. Kept free of any data
   or UI imports so the extraction pipeline (which runs inside the Worker)
   can use it without pulling the demo dataset along. */
export interface MenuVocabulary {
  format: QuestionOption[];
  protein: QuestionOption[];
  style: QuestionOption[];
  /** Uploaded menus have no sides question — we never invent menu content. */
  hasSides: boolean;
  /** How many spice levels the settings step offers, for stats only. */
  heatLevels: number;
}

export function filterOptionsOf(vocabulary: MenuVocabulary): FilterOptions {
  return {
    format: vocabulary.format.map((o) => o.id),
    protein: vocabulary.protein.map((o) => o.id),
    style: vocabulary.style.map((o) => o.id),
  };
}
