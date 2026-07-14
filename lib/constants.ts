import type { Food } from "./types";

// Unit constants (spec §6).
export const GRAMS_PER_OUNCE = 28.3495; // 1 oz (weight)
export const ML_PER_FLUID_OUNCE = 29.5735; // 1 fl oz

// v4 defaults to pre-fill (spec §Handoff): protein target 35 g, calorie ceiling
// blank, basis Raw, sort density, "Cooking for two" off, shared targets "Me"/"Husband".
export const DEFAULT_PROTEIN_TARGET = 35; // g
export const DEFAULT_SHARED_ME_TARGET = 35; // g (your shared-dinner default)
export const DEFAULT_SHARED_HUSBAND_TARGET = 50; // g (his shared-dinner default)

// Sane input bounds (spec §Security: positive, sane bounds). A protein target above
// this or a ceiling above CEILING_MAX is almost certainly a typo.
export const PROTEIN_TARGET_MIN = 1;
export const PROTEIN_TARGET_MAX = 300;
export const CALORIE_CEILING_MAX = 10000;

// Nutrient-density score (spec §"Nutrient density"): a single nutrient can contribute
// at most NUTRIENT_CAP %DV, so no one nutrient (selenium in fish) dominates the sum.
export const NUTRIENT_CAP = 100;

// FDA labeling thresholds on %DV, used for the "rich in" highlights.
export const HIGH_IN_PCT = 20; // "rich in" (top nutrients ≥20% DV)
export const GOOD_SOURCE_PCT = 10; // "good source" (10–19%)

// Omega-3 (EPA+DHA) has NO FDA Daily Value. It is a seafood highlight only,
// compared to a reference intake and always marked non-DV.
export const OMEGA3_REFERENCE_MG = 250; // mg/day EPA+DHA (combined), non-DV reference

// FDA adult Daily Values — 2016 Nutrition Facts label reference amounts (spec §B3).
// Verified against the current FDA "Daily Value on the New Nutrition Facts label"
// reference. Fiber is read from Food.fiberPer100g (not duplicated in micros).
export const DAILY_VALUES = {
  fiber: 28, // g
  iron: 18, // mg
  potassium: 4700, // mg
  magnesium: 420, // mg
  calcium: 1300, // mg
  zinc: 11, // mg
  vitaminB12: 2.4, // mcg
  vitaminD: 20, // mcg
  selenium: 55, // mcg
} as const;

export type TrackedNutrient = keyof typeof DAILY_VALUES;

export type NutrientUnit = "g" | "mg" | "mcg";

// Tracked-nutrient registry: display label, unit, Daily Value, and how to read the
// per-100g amount off a Food. Order controls how highlights read left to right.
export const TRACKED_NUTRIENTS: {
  key: TrackedNutrient;
  label: string;
  unit: NutrientUnit;
  dv: number;
  per100g: (food: Food) => number;
}[] = [
  { key: "fiber", label: "fiber", unit: "g", dv: DAILY_VALUES.fiber, per100g: (f) => f.fiberPer100g },
  { key: "iron", label: "iron", unit: "mg", dv: DAILY_VALUES.iron, per100g: (f) => f.micros.ironMg },
  { key: "potassium", label: "potassium", unit: "mg", dv: DAILY_VALUES.potassium, per100g: (f) => f.micros.potassiumMg },
  { key: "magnesium", label: "magnesium", unit: "mg", dv: DAILY_VALUES.magnesium, per100g: (f) => f.micros.magnesiumMg },
  { key: "calcium", label: "calcium", unit: "mg", dv: DAILY_VALUES.calcium, per100g: (f) => f.micros.calciumMg },
  { key: "zinc", label: "zinc", unit: "mg", dv: DAILY_VALUES.zinc, per100g: (f) => f.micros.zincMg },
  { key: "vitaminB12", label: "vitamin B12", unit: "mcg", dv: DAILY_VALUES.vitaminB12, per100g: (f) => f.micros.vitaminB12Mcg },
  { key: "vitaminD", label: "vitamin D", unit: "mcg", dv: DAILY_VALUES.vitaminD, per100g: (f) => f.micros.vitaminDMcg },
  { key: "selenium", label: "selenium", unit: "mcg", dv: DAILY_VALUES.selenium, per100g: (f) => f.micros.seleniumMcg },
];
