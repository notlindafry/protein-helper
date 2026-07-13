// Data schema (spec §3). One row per food; the app scales each to hit the target.

export type Category =
  | "Poultry"
  | "Beef"
  | "Pork"
  | "Seafood"
  | "Eggs & dairy"
  | "Soy & plant"
  | "Legumes & grains"
  | "Nuts & seeds"
  | "Protein powders"
  | "Broths & liquids";

// weightBasis is a correctness field, not cosmetic (spec §5). It states whether the
// per-100g macros — and therefore the serving the app tells you to weigh out — are
// for the raw, cooked, or as-sold form of the food.
export type WeightBasis = "raw" | "cooked" | "as_sold";

// Per-100g micronutrients from FDC (revision spec §B1). Fiber is intentionally NOT
// duplicated here — it stays as Food.fiberPer100g and is folded into the density
// score from there, so there is a single source of truth for fiber.
// omega-3 (EPA+DHA) has no FDA Daily Value; it is a seafood highlight only (§B3).
export type Micronutrients = {
  ironMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  calciumMg: number;
  zincMg: number;
  vitaminB12Mcg: number;
  vitaminDMcg: number;
  seleniumMcg: number;
  omega3Mg?: number; // EPA+DHA; seafood only; no FDA DV
};

export type Food = {
  id: string; // slug, e.g. "chicken-thigh-skinless-raw"
  name: string; // display, specific: "Chicken thigh, skinless"
  category: Category;
  proteinPer100g: number; // grams
  caloriesPer100g: number; // kcal
  fatPer100g: number; // grams
  carbsPer100g: number; // grams
  fiberPer100g: number; // grams
  weightBasis: WeightBasis;
  isLiquid: boolean;
  densityGPerMl?: number; // required if isLiquid; for fl oz conversion (spec §6)
  isCompleteProtein: boolean; // spec §7
  micros: Micronutrients; // per-100g micronutrients (revision spec §B1)
  fdcId: string; // provenance (spec §2)
  fdcDataType: string; // provenance, e.g. "Foundation" / "SR Legacy" / "Branded"
  note?: string;
};
