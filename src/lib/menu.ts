import type { CompiledItem, FilterId, FilterOptions, Question, QuestionOption } from "./types";
import type { MenuVocabulary } from "./vocabulary";
import { filterOptionsOf } from "./vocabulary";
import type { ExtractionTrace } from "./extraction/trace";
import { FILTER_OPTIONS } from "./entropy";
import { MENU } from "../data/demo-menu";
import { QUESTIONS, UPLOAD_HEAT } from "../data/config";

/* ---------- PER-MENU VOCABULARY ---------- */
/* The three filter SLOTS (format, protein, style) are fixed; their OPTION
   VALUES belong to a particular menu. The demo dataset ships its own closed
   vocabulary; an uploaded menu describes itself in its own words. Nothing
   here touches the entropy math — it only tells the engine which option ids
   exist and gives the UI something to render (rule 010-engine.mdc). */

export type { MenuVocabulary };
export { filterOptionsOf };

export interface CompiledMenu {
  source: "demo" | "upload";
  /** Shown in the UI: "the demo menu", or the uploaded file's name. */
  label: string;
  items: CompiledItem[];
  vocabulary: MenuVocabulary;
  questions: Question[];
  filterOptions: FilterOptions;
  /** Present on uploaded menus: timings and drop reasons from the fence. */
  trace?: ExtractionTrace;
}

const FILTER_IDS: readonly FilterId[] = ["format", "protein", "style"];

/* Prompts for uploaded menus are deliberately domain-neutral; only the option
   labels come from the menu itself. */
const UPLOAD_PROMPTS: Record<FilterId, { prompt: string; sub: string }> = {
  format: {
    prompt: "How do you want to eat it?",
    sub: "Asked when it's the highest-information question — usually first.",
  },
  protein: {
    prompt: "What should the main component be?",
    sub: "The thing the dish is built around.",
  },
  style: {
    prompt: "What style sounds best?",
    sub: "The flavour family, not a specific product.",
  },
};

export function buildQuestions(vocabulary: MenuVocabulary): Question[] {
  const questions: Question[] = FILTER_IDS.map((id) => ({
    id,
    kind: "filter",
    prompt: UPLOAD_PROMPTS[id].prompt,
    sub: UPLOAD_PROMPTS[id].sub,
    options: vocabulary[id],
  }));

  questions.push({
    id: "heat",
    kind: "config",
    prompt: "How spicy?",
    sub: "Zero information gain about which product — pure setting.",
    options: UPLOAD_HEAT.map((h) => ({ id: h.id, label: h.label, note: h.note, color: h.color })),
  });

  questions.push({
    id: "portion",
    kind: "config",
    prompt: "How hungry are you?",
    sub: "Also zero-gain: size is appetite, not which product.",
    options: [
      { id: "single", label: "Standard", note: "The regular size" },
      { id: "double", label: "Larger", note: "The bigger size" },
    ],
  });

  return questions;
}

/* Derived from QUESTIONS so the demo's curated copy stays the single source
   of truth for the demo path. */
function demoVocabulary(): MenuVocabulary {
  const optionsOf = (id: FilterId): QuestionOption[] =>
    QUESTIONS.find((q) => q.id === id)?.options ?? [];
  return {
    format: optionsOf("format"),
    protein: optionsOf("protein"),
    style: optionsOf("style"),
    hasSides: true,
    heatLevels: QUESTIONS.find((q) => q.id === "heat")?.options.length ?? 0,
  };
}

export const DEMO_MENU: CompiledMenu = {
  source: "demo",
  label: "the demo menu",
  items: MENU,
  vocabulary: demoVocabulary(),
  questions: QUESTIONS,
  filterOptions: FILTER_OPTIONS,
};

export function uploadedMenu(
  label: string,
  items: CompiledItem[],
  vocabulary: MenuVocabulary,
  trace?: ExtractionTrace
): CompiledMenu {
  /* The settings step is app-authored, so its shape is decided here rather
     than by the extraction: a neutral spice scale, and never any sides. */
  const resolved: MenuVocabulary = {
    ...vocabulary,
    hasSides: false,
    heatLevels: UPLOAD_HEAT.length,
  };
  return {
    source: "upload",
    label,
    items,
    vocabulary: resolved,
    questions: buildQuestions(resolved),
    filterOptions: filterOptionsOf(resolved),
    trace,
  };
}
