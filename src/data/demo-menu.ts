import type { MenuItem } from "../lib/types";

/* ---------- DATA ---------- */
/* Ported verbatim from menu-compiler.jsx. Structure modelled on a real
   flame-grilled chicken menu; every item named generically by its
   components — see .cursor/rules/000-project.mdc rule 6. */

export const MENU: MenuItem[] = [
  // Burgers (7)
  { id: "butterfly-burger", name: "Butterfly Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two chicken breasts joined by crispy skin, in a rustic roll with tomato relish, lettuce and a tangy house sauce." },
  { id: "cheese-chutney-burger", name: "Cheese & Chutney Burger", format: "burger", proteins: ["breast", "thigh"], styles: ["cheesy", "loaded"], vegetarian: false, vegan: false, heat: true, plain: "Breast or juicier thighs with melting cheddar, smoky red pepper chutney, lettuce and herb mayo. It's messy." },
  { id: "garlic-bread-burger", name: "Garlic Bread Burger", format: "burger", proteins: ["breast", "thigh"], styles: ["garlicky", "loaded"], vegetarian: false, vegan: false, heat: true, plain: "Breast or thighs with pink pickled onions, salad leaves and garlic mayo — served in a garlic-bread bun instead of a plain roll." },
  { id: "grilled-burger", name: "Grilled Chicken Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "A single grilled breast in a rustic roll with tomato relish, herb mayo, lettuce and tomato." },
  { id: "double-burger", name: "Double Chicken Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two grilled breasts in one roll — the classic build, more of it." },
  { id: "halloumi-salsa-burger", name: "Halloumi & Salsa Burger", format: "burger", proteins: ["veg"], styles: ["cheesy", "fresh"], vegetarian: true, vegan: false, heat: false, plain: "Grilled halloumi topped with pepper-and-pineapple salsa, sliced avocado and garlic mayo, in a rustic roll. Vegetarian." },
  { id: "bean-burger", name: "Bean Patty Burger", format: "burger", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, plain: "A patty of cheddar, chickpeas, sweetcorn, lentils and pumpkin seeds, with tomato relish, herb mayo, lettuce and tomato. Vegetarian." },

  // Pittas (4)
  { id: "loaded-halloumi-pitta", name: "Loaded Halloumi Pitta", format: "pitta", proteins: ["breast", "thigh"], styles: ["loaded", "cheesy", "garlicky"], vegetarian: false, vegan: false, heat: true, plain: "A toasted pitta with breast or thighs plus grilled halloumi, caramelised red onion relish, garlic aioli and lettuce." },
  { id: "grilled-pitta", name: "Grilled Chicken Pitta", format: "pitta", proteins: ["breast"], styles: ["classic", "fresh"], vegetarian: false, vegan: false, heat: true, plain: "A grilled breast in a toasted pitta with herb mayo and crunchy, tangy slaw. The lighter handheld." },
  { id: "double-pitta", name: "Double Chicken Pitta", format: "pitta", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two grilled breasts in a toasted pitta with herb mayo and slaw." },
  { id: "bean-pitta", name: "Bean Patty Pitta", format: "pitta", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, plain: "A bean-and-cheese patty in a toasted pitta with herb mayo and slaw. Vegetarian." },

  // Wraps (4)
  { id: "grilled-wrap", name: "Grilled Chicken Wrap", format: "wrap", proteins: ["breast"], styles: ["classic", "fresh"], vegetarian: false, vegan: false, heat: true, plain: "A grilled breast in a soft wrap with lettuce, lightly spiced yoghurt mayo and chilli jam." },
  { id: "double-wrap", name: "Double Chicken Wrap", format: "wrap", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two grilled breasts wrapped with lettuce, yoghurt mayo and chilli jam." },
  { id: "plant-wrap", name: "Plant Fillet Wrap", format: "wrap", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: true, heat: true, plain: "A plant-based fillet grilled in your chosen heat, sliced, with garlic mayo, lettuce and chilli jam. Fully plant-based." },
  { id: "bean-wrap", name: "Bean Patty Wrap", format: "wrap", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, plain: "A bean-and-cheese patty wrapped with lettuce, yoghurt mayo and chilli jam. Vegetarian." },

  // Plates (5)
  { id: "quarter-chicken", name: "1/4 Chicken", format: "plate", proteins: ["breast", "thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "A breast or a leg on the bone, flame-grilled with crispy skin in your chosen heat. The original order." },
  { id: "half-chicken", name: "1/2 Chicken", format: "plate", proteins: ["breast", "thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "A breast and a leg on the bone, flame-grilled with crispy skin. The serious-appetite plate." },
  { id: "boneless-thighs", name: "Boneless Thighs Plate", format: "plate", proteins: ["thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Four boneless thighs with crispy skin — the juiciest cut, no bun, no bone." },
  { id: "butterfly-plate", name: "Butterfly Breast Plate", format: "plate", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two breasts joined by crispy flame-grilled skin. Lean, and a lot of it." },
  { id: "wings-plate", name: "Wings Plate", format: "plate", proteins: ["wings"], styles: ["loaded"], vegetarian: false, vegan: false, heat: true, plain: "Flame-grilled wings in your chosen heat, with the option of an extra-saucy glaze and creamy drizzle. Napkins required." },

  // Bowls & salads (4)
  { id: "spicy-rice-bowl", name: "Spicy Rice Bowl", format: "bowl", proteins: ["breast", "thigh"], styles: ["fresh"], vegetarian: false, vegan: false, heat: true, plain: "Spicy rice with charred broccoli, crunchy slaw, pickles and houmous, topped with your choice of grilled chicken." },
  { id: "pulled-caesar", name: "Pulled Chicken Caesar", format: "bowl", proteins: ["breast"], styles: ["fresh", "cheesy"], vegetarian: false, vegan: false, heat: true, plain: "Chilled pulled chicken, crunchy cos, garlic croutons and pickled onions tossed in a rich Caesar dressing, finished in your chosen heat." },
  { id: "mediterranean-salad", name: "Mediterranean Salad", format: "bowl", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: false, heat: false, plain: "Mixed leaves, two kinds of tomato, olives, feta, cucumber and pickled onions in a light vinegar-and-oil dressing. Vegetarian." },
  { id: "grain-bowl", name: "Hearty Grain Bowl", format: "bowl", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: true, heat: false, plain: "Warm mixed grains with slaw, charred corn, herby pickles and leafy greens. Fully plant-based." },
];
