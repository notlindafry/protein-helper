import type { Food } from "./types";
import {
  GRAMS_PER_OUNCE,
  ML_PER_FLUID_OUNCE,
  NUTRIENT_CAP,
  DINNER_PROTEIN_FLOOR,
  HIGH_IN_PCT,
  GOOD_SOURCE_PCT,
  OMEGA3_REFERENCE_MG,
  LARGE_PORTION_GRAMS,
  LARGE_PORTION_FLOZ,
  TRACKED_NUTRIENTS,
  type TrackedNutrient,
  type NutrientUnit,
} from "./constants";

// One tracked nutrient at the ceiling serving: amount + %DV.
export type NutrientAmount = {
  key: TrackedNutrient;
  label: string;
  unit: NutrientUnit;
  amount: number; // at the serving
  pct: number; // % of Daily Value at the serving
};

// One computed row (revision spec §A): the serving that spends the calorie ceiling,
// the protein it delivers, its macros, its micronutrient density, and highlights.
// Full precision is kept here; rounding happens only at display time.
export type ServingResult = {
  food: Food;
  servingGrams: number;
  ounces: number; // weight ounces (solids)
  fluidOunces: number | null; // liquids only
  calories: number; // ≈ the ceiling (kept for completeness)
  proteinDelivered: number;
  fat: number;
  carbs: number;
  fiber: number;
  densityScore: number; // capped %DV sum across tracked nutrients (§C1)
  nutrients: NutrientAmount[]; // every tracked nutrient at the serving
  highlights: NutrientAmount[]; // "high in": pct ≥ 20, sorted desc (§C2)
  goodSources: NutrientAmount[]; // "good source": 10 ≤ pct < 20
  omega3Mg: number; // EPA+DHA at the serving (non-DV highlight, §B3)
  isOmega3Source: boolean;
  belowProteinFloor: boolean; // §C4
  isLargePortion: boolean; // neutral note (§C5)
};

// Core computation (revision spec §A). The per-person calorie ceiling is the anchor;
// the serving is "max at ceiling", and protein-delivered is a displayed outcome.
export function computeServing(food: Food, ceiling: number): ServingResult {
  const servingGrams = (ceiling * 100) / food.caloriesPer100g;
  const scale = servingGrams / 100;

  const proteinDelivered = food.proteinPer100g * scale;
  const fat = food.fatPer100g * scale;
  const carbs = food.carbsPer100g * scale;
  const fiber = food.fiberPer100g * scale;
  const calories = food.caloriesPer100g * scale;

  const ounces = servingGrams / GRAMS_PER_OUNCE;
  let fluidOunces: number | null = null;
  if (food.isLiquid) {
    fluidOunces = servingGrams / (food.densityGPerMl as number) / ML_PER_FLUID_OUNCE;
  }

  const nutrients: NutrientAmount[] = TRACKED_NUTRIENTS.map((n) => {
    const amount = n.per100g(food) * scale;
    const pct = n.dv > 0 ? (amount / n.dv) * 100 : 0;
    return { key: n.key, label: n.label, unit: n.unit, amount, pct };
  });

  // NRF-style capped index: each nutrient contributes at most NUTRIENT_CAP %DV (§C1).
  const densityScore = nutrients.reduce(
    (sum, n) => sum + Math.min(n.pct, NUTRIENT_CAP),
    0,
  );

  const highlights = nutrients
    .filter((n) => n.pct >= HIGH_IN_PCT)
    .sort((a, b) => b.pct - a.pct);
  const goodSources = nutrients
    .filter((n) => n.pct >= GOOD_SOURCE_PCT && n.pct < HIGH_IN_PCT)
    .sort((a, b) => b.pct - a.pct);

  const omega3Mg = (food.micros.omega3Mg ?? 0) * scale;
  const isOmega3Source = omega3Mg >= OMEGA3_REFERENCE_MG;

  const belowProteinFloor = proteinDelivered < DINNER_PROTEIN_FLOOR;
  const isLargePortion = food.isLiquid
    ? (fluidOunces as number) > LARGE_PORTION_FLOZ
    : servingGrams > LARGE_PORTION_GRAMS;

  return {
    food,
    servingGrams,
    ounces,
    fluidOunces,
    calories,
    proteinDelivered,
    fat,
    carbs,
    fiber,
    densityScore,
    nutrients,
    highlights,
    goodSources,
    omega3Mg,
    isOmega3Source,
    belowProteinFloor,
    isLargePortion,
  };
}

// Sortable columns (spec §C3). Calories are ~constant (= the ceiling) so there is no
// calories sort key.
export type SortKey =
  | "density"
  | "serving"
  | "protein"
  | "fiber"
  | "fat"
  | "carbs"
  | "food";
export type SortDir = "asc" | "desc";

// Default: protein delivered, descending. Protein is the primary consideration;
// the micronutrient density score is secondary (it breaks ties, and is one click
// away as its own column). Revision §A defaulted to density; per follow-up feedback
// protein leads and density is the secondary score.
export const DEFAULT_SORT_KEY: SortKey = "protein";
export const DEFAULT_SORT_DIR: SortDir = "desc";

function comparePrimary(a: ServingResult, b: ServingResult, key: SortKey): number {
  switch (key) {
    case "food":
      return a.food.name.localeCompare(b.food.name);
    case "serving":
      return a.servingGrams - b.servingGrams;
    case "protein":
      return a.proteinDelivered - b.proteinDelivered;
    case "fiber":
      return a.fiber - b.fiber;
    case "fat":
      return a.fat - b.fat;
    case "carbs":
      return a.carbs - b.carbs;
    case "density":
      return a.densityScore - b.densityScore;
  }
}

export function sortResults(
  results: ServingResult[],
  key: SortKey,
  dir: SortDir,
): ServingResult[] {
  const dirFactor = dir === "asc" ? 1 : -1;
  const arr = [...results];
  arr.sort((a, b) => {
    const primary = comparePrimary(a, b, key) * dirFactor;
    if (primary !== 0) return primary;
    // Tiebreak: denser first, then more protein, then name (all deterministic).
    if (key !== "density" && b.densityScore !== a.densityScore)
      return b.densityScore - a.densityScore;
    if (b.proteinDelivered !== a.proteinDelivered)
      return b.proteinDelivered - a.proteinDelivered;
    return a.food.name.localeCompare(b.food.name);
  });
  return arr;
}

export function buildResults(
  foods: Food[],
  ceiling: number,
  key: SortKey = DEFAULT_SORT_KEY,
  dir: SortDir = DEFAULT_SORT_DIR,
): ServingResult[] {
  return sortResults(
    foods.map((f) => computeServing(f, ceiling)),
    key,
    dir,
  );
}

// Calorie-ceiling field validation (spec §A/§D). Returns a discriminated result so
// the UI can show an inline message in --danger and render no table on invalid input.
export type ParsedCeiling =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function parseCeiling(raw: string): ParsedCeiling {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter a per-person calorie ceiling." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Enter a number, for example 500." };
  }
  if (value <= 0) {
    return { ok: false, error: "Calorie ceiling must be greater than 0." };
  }
  return { ok: true, value };
}

// Optional "number of people" field (spec §D). Defaults to 1 on any bad input.
export function parsePeople(raw: string | number): number {
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

// Dataset integrity, enforced at import (build) time. Spec §A adds the
// caloriesPer100g > 0 guard (the serving divides by it); §10 keeps the liquid-density
// build-time error; and the density score requires the micros block to be present.
export function validateDataset(foods: Food[]): void {
  const microKeys: (keyof Food["micros"])[] = [
    "ironMg",
    "potassiumMg",
    "magnesiumMg",
    "calciumMg",
    "zincMg",
    "vitaminB12Mcg",
    "vitaminDMcg",
    "seleniumMcg",
  ];
  const seen = new Set<string>();
  for (const f of foods) {
    if (seen.has(f.id)) {
      throw new Error(`Dataset error: duplicate food id "${f.id}".`);
    }
    seen.add(f.id);

    if (!(f.caloriesPer100g > 0)) {
      throw new Error(
        `Dataset error: food "${f.id}" must have caloriesPer100g > 0 (serving divides by it).`,
      );
    }
    if (!(f.proteinPer100g > 0)) {
      throw new Error(`Dataset error: food "${f.id}" must have proteinPer100g > 0.`);
    }
    if (f.isLiquid && !(typeof f.densityGPerMl === "number" && f.densityGPerMl > 0)) {
      throw new Error(
        `Dataset error: liquid food "${f.id}" is missing a positive densityGPerMl (spec §10).`,
      );
    }
    if (!f.micros || typeof f.micros !== "object") {
      throw new Error(`Dataset error: food "${f.id}" is missing its micros block.`);
    }
    for (const key of microKeys) {
      if (typeof f.micros[key] !== "number") {
        throw new Error(
          `Dataset error: food "${f.id}" micros.${String(key)} must be a number.`,
        );
      }
    }
  }
}
