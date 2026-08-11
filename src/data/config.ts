import type { Question } from "../lib/types";

/* ---------- UI CONFIG DATA ---------- */
/* Ported verbatim from menu-compiler.jsx. These carry the prompts, labels
   and notes the UI renders — the engine (entropy.ts/flow.ts) only ever
   needs the ids, which is why FILTER_OPTIONS lives in entropy.ts and this
   data does not feed the gain ranking. */

export interface Diet {
  id: string;
  label: string;
}

export const DIETS: Diet[] = [
  { id: "all", label: "No requirements" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];

export interface HeatLevel {
  id: string;
  label: string;
  note: string;
  color: string;
}

export const HEAT: HeatLevel[] = [
  { id: "none", label: "No real heat", note: "Herby, zero burn", color: "#D9C46B" },
  { id: "mild", label: "Mild", note: "Fruity warmth", color: "#DFA13F" },
  { id: "medium", label: "Medium", note: "Proper flavour, gentle burn", color: "#D96B2B" },
  { id: "hot", label: "Hot", note: "You'll feel it", color: "#C43A1E" },
  { id: "xhot", label: "Extra hot", note: "Sign the waiver", color: "#8E1A1A" },
];

export const QUESTIONS: Question[] = [
  {
    id: "format",
    kind: "filter",
    prompt: "How do you want to eat it?",
    sub: "Asked when it's the highest-information question — usually first.",
    options: [
      { id: "burger", label: "Burger", note: "Soft roll, both hands" },
      { id: "pitta", label: "Pitta", note: "Lighter handheld" },
      { id: "wrap", label: "Wrap", note: "Neat and rolled" },
      { id: "plate", label: "Plate", note: "Chicken, no bread" },
      { id: "bowl", label: "Bowl / salad", note: "Grains and greens" },
    ],
  },
  {
    id: "protein",
    kind: "filter",
    prompt: "What should the main protein be?",
    sub: "Thigh is juicier, breast is leaner. Wings are wings.",
    options: [
      { id: "breast", label: "Chicken breast", note: "Lean and classic" },
      { id: "thigh", label: "Chicken thighs", note: "Juicier cut" },
      { id: "wings", label: "Wings", note: "On the bone" },
      { id: "veg", label: "Vegetarian", note: "No meat" },
    ],
  },
  {
    id: "style",
    kind: "filter",
    prompt: "What style sounds best?",
    sub: "The flavour family, not a specific product.",
    options: [
      { id: "classic", label: "Classic", note: "Just great chicken" },
      { id: "cheesy", label: "Cheesy", note: "Melted on top" },
      { id: "garlicky", label: "Garlicky", note: "Bold and savoury" },
      { id: "loaded", label: "Loaded", note: "Everything on it" },
      { id: "fresh", label: "Fresh & light", note: "Salad-leaning" },
    ],
  },
  {
    id: "heat",
    kind: "config",
    prompt: "How spicy?",
    sub: "Zero information gain about which product — pure setting.",
    options: HEAT.map((h) => ({ id: h.id, label: h.label, note: h.note, color: h.color })),
  },
  {
    id: "portion",
    kind: "config",
    prompt: "How hungry are you?",
    sub: "Also zero-gain: single vs double is appetite, not which product.",
    options: [
      { id: "single", label: "Single", note: "One breast — enough" },
      { id: "double", label: "Double", note: "Two breasts — more of it" },
    ],
  },
  {
    id: "side",
    kind: "config",
    prompt: "What does the meal need?",
    sub: "Also zero-gain: sides repeat identically on every main.",
    options: [
      { id: "crispy", label: "Something crispy", note: "Chips territory" },
      { id: "filling", label: "Something filling", note: "Rice, mash" },
      { id: "fresh", label: "Something fresh", note: "Slaw, corn" },
      { id: "surprise", label: "Surprise me", note: "Dealer's choice" },
    ],
  },
];
