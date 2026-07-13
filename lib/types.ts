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
  fdcId: string; // provenance (spec §2)
  fdcDataType: string; // provenance, e.g. "Foundation" / "SR Legacy" / "Branded"
  note?: string;
};
