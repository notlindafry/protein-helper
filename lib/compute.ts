import type { Food } from "./types";
import {
  GRAMS_PER_OUNCE,
  ML_PER_FLUID_OUNCE,
  IMPRACTICAL_SOLID_GRAMS,
  IMPRACTICAL_LIQUID_FLOZ,
} from "./constants";

// One computed row: a food scaled to the serving that hits the protein target on its
// own. Full precision is kept here; rounding happens only at display time (spec §6).
export type ServingResult = {
  food: Food;
  requiredGrams: number;
  ounces: number; // weight ounces (shown for solids)
  fluidOunces: number | null; // shown for liquids; null for solids
  calories: number;
  fat: number;
  carbs: number;
  fiber: number;
  isImpractical: boolean; // spec §10 large-serving flag
};

// Core computation (spec §6). Every row carries the same protein (= the target); the
// differentiator is how much food that takes and what else the serving costs.
export function computeServing(food: Food, targetProtein: number): ServingResult {
  const requiredGrams = (100 * targetProtein) / food.proteinPer100g;
  const scale = requiredGrams / 100;

  const calories = food.caloriesPer100g * scale;
  const fat = food.fatPer100g * scale;
  const carbs = food.carbsPer100g * scale;
  const fiber = food.fiberPer100g * scale;

  const ounces = requiredGrams / GRAMS_PER_OUNCE;

  let fluidOunces: number | null = null;
  let isImpractical: boolean;
  if (food.isLiquid) {
    // densityGPerMl is guaranteed present for liquids by validateDataset (spec §10).
    const density = food.densityGPerMl as number;
    fluidOunces = requiredGrams / density / ML_PER_FLUID_OUNCE;
    isImpractical = fluidOunces > IMPRACTICAL_LIQUID_FLOZ;
  } else {
    isImpractical = requiredGrams > IMPRACTICAL_SOLID_GRAMS;
  }

  return {
    food,
    requiredGrams,
    ounces,
    fluidOunces,
    calories,
    fat,
    carbs,
    fiber,
    isImpractical,
  };
}

// Sortable columns. Every row holds the same protein, so protein is intentionally not
// a sort key — sorting by it would do nothing (spec §8).
export type SortKey =
  | "food"
  | "grams"
  | "serving"
  | "calories"
  | "fat"
  | "carbs"
  | "fiber";
export type SortDir = "asc" | "desc";

// Default sort (spec §8): calories ascending, then carbs ascending as tiebreak — the
// fewest calories to hit the target surfaces first, matching eating in a deficit.
export const DEFAULT_SORT_KEY: SortKey = "calories";
export const DEFAULT_SORT_DIR: SortDir = "asc";

function comparePrimary(a: ServingResult, b: ServingResult, key: SortKey): number {
  switch (key) {
    case "food":
      return a.food.name.localeCompare(b.food.name);
    case "grams":
    case "serving":
      // Both serving columns order by the underlying quantity of food (grams), which
      // is unambiguous even when the oz/fl-oz column mixes weight and volume units.
      return a.requiredGrams - b.requiredGrams;
    case "calories":
      return a.calories - b.calories;
    case "fat":
      return a.fat - b.fat;
    case "carbs":
      return a.carbs - b.carbs;
    case "fiber":
      return a.fiber - b.fiber;
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
    // Tiebreaks are always ascending: carbs, then calories, then name (spec §8).
    if (key !== "carbs" && a.carbs !== b.carbs) return a.carbs - b.carbs;
    if (key !== "calories" && a.calories !== b.calories)
      return a.calories - b.calories;
    return a.food.name.localeCompare(b.food.name);
  });
  return arr;
}

// Build the full, sorted result set for a target.
export function buildResults(
  foods: Food[],
  targetProtein: number,
  key: SortKey = DEFAULT_SORT_KEY,
  dir: SortDir = DEFAULT_SORT_DIR,
): ServingResult[] {
  return sortResults(
    foods.map((f) => computeServing(f, targetProtein)),
    key,
    dir,
  );
}

// Target-field validation (spec §10). Returns a discriminated result so the UI can
// show an inline message in --danger and render no table on invalid input.
export type ParsedTarget =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function parseTarget(raw: string): ParsedTarget {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter a protein goal in grams." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Enter a number, for example 40." };
  }
  if (value <= 0) {
    return { ok: false, error: "Protein goal must be greater than 0." };
  }
  return { ok: true, value };
}

// Dataset integrity, enforced at import (build) time — spec §10 requires a missing
// liquid density to be a build-time error, not a silent render. Also guards the
// divide-by-protein in computeServing and catches duplicate ids.
export function validateDataset(foods: Food[]): void {
  const seen = new Set<string>();
  for (const f of foods) {
    if (seen.has(f.id)) {
      throw new Error(`Dataset error: duplicate food id "${f.id}".`);
    }
    seen.add(f.id);

    if (!(f.proteinPer100g > 0)) {
      throw new Error(
        `Dataset error: food "${f.id}" must have proteinPer100g > 0.`,
      );
    }
    if (f.isLiquid && !(typeof f.densityGPerMl === "number" && f.densityGPerMl > 0)) {
      throw new Error(
        `Dataset error: liquid food "${f.id}" is missing a positive densityGPerMl (spec §10).`,
      );
    }
  }
}
