import type { MenuItem } from "../lib/types";

/* ---------- DATA ---------- */
/* Structure modelled on a real flame-grilled chicken menu; every item named
   generically by its components — see .cursor/rules/000-project.mdc rule 6.

   Portion (single vs double) is a CONFIG setting on the classic grilled
   handhelds, not a separate product — same identity decision as heat/sides.
   Butterfly / 1/4 vs 1/2 chicken stay distinct products (different builds). */

export const MENU: MenuItem[] = [
  // Burgers (6) — grilled + double collapsed into one portion-configurable item
  { id: "butterfly-burger", name: "Butterfly Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Two chicken breasts joined by crispy skin, in a rustic roll with tomato relish, lettuce and a tangy house sauce." },
  { id: "cheese-chutney-burger", name: "Cheese & Chutney Burger", format: "burger", proteins: ["breast", "thigh"], styles: ["cheesy", "loaded"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Breast or juicier thighs with melting cheddar, smoky red pepper chutney, lettuce and herb mayo. It's messy." },
  { id: "garlic-bread-burger", name: "Garlic Bread Burger", format: "burger", proteins: ["breast", "thigh"], styles: ["garlicky", "loaded"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Breast or thighs with pink pickled onions, salad leaves and garlic mayo — served in a garlic-bread bun instead of a plain roll." },
  { id: "grilled-burger", name: "Grilled Chicken Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, portion: true, plain: "A grilled breast in a rustic roll with tomato relish, herb mayo, lettuce and tomato — single or double." },
  { id: "halloumi-salsa-burger", name: "Halloumi & Salsa Burger", format: "burger", proteins: ["veg"], styles: ["cheesy", "fresh"], vegetarian: true, vegan: false, heat: false, portion: false, plain: "Grilled halloumi topped with pepper-and-pineapple salsa, sliced avocado and garlic mayo, in a rustic roll. Vegetarian." },
  { id: "bean-burger", name: "Bean Patty Burger", format: "burger", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, portion: false, plain: "A patty of cheddar, chickpeas, sweetcorn, lentils and pumpkin seeds, with tomato relish, herb mayo, lettuce and tomato. Vegetarian." },

  // Pittas (3)
  { id: "loaded-halloumi-pitta", name: "Loaded Halloumi Pitta", format: "pitta", proteins: ["breast", "thigh"], styles: ["loaded", "cheesy", "garlicky"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "A toasted pitta with breast or thighs plus grilled halloumi, caramelised red onion relish, garlic aioli and lettuce." },
  { id: "grilled-pitta", name: "Grilled Chicken Pitta", format: "pitta", proteins: ["breast"], styles: ["classic", "fresh"], vegetarian: false, vegan: false, heat: true, portion: true, plain: "A grilled breast in a toasted pitta with herb mayo and crunchy, tangy slaw — single or double. The lighter handheld." },
  { id: "bean-pitta", name: "Bean Patty Pitta", format: "pitta", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, portion: false, plain: "A bean-and-cheese patty in a toasted pitta with herb mayo and slaw. Vegetarian." },

  // Wraps (3)
  { id: "grilled-wrap", name: "Grilled Chicken Wrap", format: "wrap", proteins: ["breast"], styles: ["classic", "fresh"], vegetarian: false, vegan: false, heat: true, portion: true, plain: "A grilled breast in a soft wrap with lettuce, lightly spiced yoghurt mayo and chilli jam — single or double." },
  { id: "plant-wrap", name: "Plant Fillet Wrap", format: "wrap", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: true, heat: true, portion: false, plain: "A plant-based fillet grilled in your chosen heat, sliced, with garlic mayo, lettuce and chilli jam. Fully plant-based." },
  { id: "bean-wrap", name: "Bean Patty Wrap", format: "wrap", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, portion: false, plain: "A bean-and-cheese patty wrapped with lettuce, yoghurt mayo and chilli jam. Vegetarian." },

  // Plates (5) — 1/4 vs 1/2 stay distinct products (different cut composition)
  { id: "quarter-chicken", name: "1/4 Chicken", format: "plate", proteins: ["breast", "thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "A breast or a leg on the bone, flame-grilled with crispy skin in your chosen heat. The original order." },
  { id: "half-chicken", name: "1/2 Chicken", format: "plate", proteins: ["breast", "thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "A breast and a leg on the bone, flame-grilled with crispy skin. The serious-appetite plate." },
  { id: "boneless-thighs", name: "Boneless Thighs Plate", format: "plate", proteins: ["thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Four boneless thighs with crispy skin — the juiciest cut, no bun, no bone." },
  { id: "butterfly-plate", name: "Butterfly Breast Plate", format: "plate", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Two breasts joined by crispy flame-grilled skin. Lean, and a lot of it." },
  { id: "wings-plate", name: "Wings Plate", format: "plate", proteins: ["wings"], styles: ["loaded"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Flame-grilled wings in your chosen heat, with the option of an extra-saucy glaze and creamy drizzle. Napkins required." },

  // Bowls & salads (4)
  { id: "spicy-rice-bowl", name: "Spicy Rice Bowl", format: "bowl", proteins: ["breast", "thigh"], styles: ["fresh"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Spicy rice with charred broccoli, crunchy slaw, pickles and houmous, topped with your choice of grilled chicken." },
  { id: "pulled-caesar", name: "Pulled Chicken Caesar", format: "bowl", proteins: ["breast"], styles: ["fresh", "cheesy"], vegetarian: false, vegan: false, heat: true, portion: false, plain: "Chilled pulled chicken, crunchy cos, garlic croutons and pickled onions tossed in a rich Caesar dressing, finished in your chosen heat." },
  { id: "mediterranean-salad", name: "Mediterranean Salad", format: "bowl", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: false, heat: false, portion: false, plain: "Mixed leaves, two kinds of tomato, olives, feta, cucumber and pickled onions in a light vinegar-and-oil dressing. Vegetarian." },
  { id: "grain-bowl", name: "Hearty Grain Bowl", format: "bowl", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: true, heat: false, portion: false, plain: "Warm mixed grains with slaw, charred corn, herby pickles and leafy greens. Fully plant-based." },
];
