import type { Food, WeightBasis } from "./types";
import {
  GRAMS_PER_OUNCE,
  ML_PER_FLUID_OUNCE,
  NUTRIENT_CAP,
  HIGH_IN_PCT,
  GOOD_SOURCE_PCT,
  OMEGA3_REFERENCE_MG,
  PROTEIN_TARGET_MIN,
  PROTEIN_TARGET_MAX,
  CALORIE_CEILING_MAX,
  TRACKED_NUTRIENTS,
  type TrackedNutrient,
  type NutrientUnit,
} from "./constants";

// v4 has ONE engine (spec §"Core model"): for a food and a protein target, compute
// the serving that delivers the target and the calories that serving costs, in the
// chosen weight basis. Everything on screen is a view of this. No modes.

// The weight basis the user is currently thinking in. `raw` (you shop/portion raw)
// or `cooked` (he plates already-cooked food). As-sold foods ignore it.
export type Basis = "raw" | "cooked";

// Sort options (spec §"The screen"): nutrient density, smallest serving, or fiber.
export type SortKey = "density" | "serving" | "fiber";
export const DEFAULT_SORT: SortKey = "density";

// One tracked nutrient at the serving shown: amount + %DV.
export type NutrientAmount = {
  key: TrackedNutrient;
  label: string;
  unit: NutrientUnit;
  amount: number;
  pct: number;
};

// Which per-100g numbers and basis tag to use for a food at a requested basis. The
// Raw/Cooked toggle just picks the field set (spec §"Raw vs cooked"): raw-stored
// meats/fish with cooked fields switch; as-sold and cooked-stored foods never do.
export type ResolvedBasis = {
  protein100: number;
  calories100: number;
  fat100: number;
  carbs100: number;
  fiber100: number;
  basisTag: WeightBasis; // what to display: raw / cooked / as sold
  fdcIdShown: string;
  fdcDataTypeShown: string;
  cookedApproximate: boolean; // true when we're showing cooked figures (surface caveat)
};

export function resolveBasis(food: Food, basis: Basis): ResolvedBasis {
  const canCook =
    basis === "cooked" &&
    food.weightBasis === "raw" &&
    typeof food.proteinPer100gCooked === "number" &&
    typeof food.caloriesPer100gCooked === "number";

  if (canCook) {
    return {
      protein100: food.proteinPer100gCooked as number,
      calories100: food.caloriesPer100gCooked as number,
      // Cooked macros are nice-to-have; fall back to the raw macro if absent.
      fat100: food.fatPer100gCooked ?? food.fatPer100g,
      carbs100: food.carbsPer100gCooked ?? food.carbsPer100g,
      fiber100: food.fiberPer100gCooked ?? food.fiberPer100g,
      basisTag: "cooked",
      fdcIdShown: food.fdcIdCooked ?? food.fdcId,
      fdcDataTypeShown: food.fdcDataTypeCooked ?? food.fdcDataType,
      cookedApproximate: true,
    };
  }

  // Raw basis, as-sold foods, cooked-stored legumes, or a raw food with no cooked
  // record: use the stored values and the food's own basis tag unchanged.
  return {
    protein100: food.proteinPer100g,
    calories100: food.caloriesPer100g,
    fat100: food.fatPer100g,
    carbs100: food.carbsPer100g,
    fiber100: food.fiberPer100g,
    basisTag: food.weightBasis,
    fdcIdShown: food.fdcId,
    fdcDataTypeShown: food.fdcDataType,
    cookedApproximate: false,
  };
}

// One computed row: the serving that delivers the protein target, the calories it
// costs, its fiber and micronutrient density, and whether it clears the ceiling.
export type ServingResult = {
  food: Food;
  basis: Basis; // requested basis
  basisTag: WeightBasis; // what's actually shown (raw/cooked/as sold)
  cookedApproximate: boolean;
  servingGrams: number;
  ounces: number; // weight ounces (solids)
  fluidOunces: number | null; // liquids only
  proteinTarget: number;
  proteinDelivered: number; // == target (serving is scaled to hit it)
  calories: number;
  fat: number;
  carbs: number;
  fiber: number;
  densityScore: number; // capped %DV sum across tracked nutrients
  nutrients: NutrientAmount[]; // every tracked nutrient at the serving (row-tap detail)
  highlights: NutrientAmount[]; // "rich in": pct ≥ 20, sorted desc
  goodSources: NutrientAmount[]; // "good source": 10 ≤ pct < 20
  omega3Mg: number; // EPA+DHA at the serving (non-DV highlight)
  isOmega3Source: boolean;
  overCeiling: boolean; // a ceiling is set and this serving's calories exceed it
};

// The single core computation: serving = target / protein-density, then everything
// derived scales with the serving. Micronutrients and the density score are read
// from the primary-basis micros (spec: density is basis-approximate), scaled to the
// serving shown.
export function computeServing(
  food: Food,
  proteinTarget: number,
  basis: Basis,
  calorieCeiling = 0,
): ServingResult {
  const r = resolveBasis(food, basis);
  const servingGrams = (proteinTarget * 100) / r.protein100;
  const scale = servingGrams / 100;

  const calories = r.calories100 * scale;
  const fat = r.fat100 * scale;
  const carbs = r.carbs100 * scale;
  const fiber = r.fiber100 * scale;

  const ounces = servingGrams / GRAMS_PER_OUNCE;
  const fluidOunces = food.isLiquid
    ? servingGrams / (food.densityGPerMl as number) / ML_PER_FLUID_OUNCE
    : null;

  const nutrients: NutrientAmount[] = TRACKED_NUTRIENTS.map((n) => {
    const amount = n.per100g(food) * scale;
    const pct = n.dv > 0 ? (amount / n.dv) * 100 : 0;
    return { key: n.key, label: n.label, unit: n.unit, amount, pct };
  });

  // Capped index: each nutrient contributes at most NUTRIENT_CAP %DV, so one very
  // high nutrient (selenium in fish) can't dominate the score.
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

  const overCeiling = calorieCeiling > 0 && calories > calorieCeiling + 1e-9;

  return {
    food,
    basis,
    basisTag: r.basisTag,
    cookedApproximate: r.cookedApproximate,
    servingGrams,
    ounces,
    fluidOunces,
    proteinTarget,
    proteinDelivered: proteinTarget,
    calories,
    fat,
    carbs,
    fiber,
    densityScore,
    nutrients,
    highlights,
    goodSources,
    omega3Mg,
    isOmega3Source,
    overCeiling,
  };
}

// Primary sort comparators. Density and fiber are descending (more is better);
// serving is ascending (smallest serving first, the second user's sort).
function compareBy(a: ServingResult, b: ServingResult, key: SortKey): number {
  switch (key) {
    case "density":
      return b.densityScore - a.densityScore;
    case "serving":
      return a.servingGrams - b.servingGrams;
    case "fiber":
      return b.fiber - a.fiber;
  }
}

// Sort by the chosen key, but always demote over-ceiling rows below fitting rows
// (spec: dimmed and sorted below, not hidden). Deterministic tiebreak: density, name.
export function sortServings(rows: ServingResult[], key: SortKey): ServingResult[] {
  return [...rows].sort((a, b) => {
    if (a.overCeiling !== b.overCeiling) return a.overCeiling ? 1 : -1;
    let primary = compareBy(a, b, key);
    if (Math.abs(primary) < 1e-9) primary = 0;
    if (primary !== 0) return primary;
    if (b.densityScore !== a.densityScore) return b.densityScore - a.densityScore;
    return a.food.name.localeCompare(b.food.name);
  });
}

export type BuildOpts = {
  proteinTarget: number;
  calorieCeiling?: number; // 0 / undefined = no filter (item-only ceiling)
  basis: Basis;
  sort: SortKey;
};

// The one build function (spec §Handoff): given a protein target, an optional
// calorie ceiling, and a basis, return each food's serving/calories/fiber/density/
// flags, sorted by the chosen sort with over-ceiling rows demoted.
export function buildServings(foods: Food[], opts: BuildOpts): ServingResult[] {
  const ceiling = opts.calorieCeiling ?? 0;
  const rows = foods.map((f) =>
    computeServing(f, opts.proteinTarget, opts.basis, ceiling),
  );
  return sortServings(rows, opts.sort);
}

// Shopping is done in RAW weight — you buy raw whatever the plate basis — so the
// shared-dinner buy-total sums both people's RAW servings regardless of display
// basis (spec §"The shared dinner"). His portion ignores the ceiling because it is
// just arithmetic, not filtering.
export function rawServingGrams(food: Food, proteinTarget: number): number {
  return (proteinTarget * 100) / food.proteinPer100g;
}

export function buyTotalGrams(
  food: Food,
  targetA: number,
  targetB: number,
): number {
  return rawServingGrams(food, targetA) + rawServingGrams(food, targetB);
}

// Protein target is required and positive (spec §Security: sane bounds). Blank /
// non-numeric / below the floor → 0 ("off"). Above the ceiling is clamped.
export function parseProteinTarget(raw: string | number): number {
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || value < PROTEIN_TARGET_MIN) return 0;
  return Math.min(value, PROTEIN_TARGET_MAX);
}

// Calorie ceiling is OPTIONAL: blank means no filter (0). Non-numeric / ≤ 0 also
// mean off. Above the ceiling is clamped to a sane maximum.
export function parseCalorieCeiling(raw: string | number): number {
  const s = typeof raw === "number" ? String(raw) : String(raw).trim();
  if (s === "") return 0;
  const value = Number(s);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, CALORIE_CEILING_MAX);
}

// Dataset integrity, enforced at import (build) time. caloriesPer100g > 0 (serving
// divides by it), proteinPer100g > 0, liquids carry a density, micros present, and
// any cooked record carries BOTH cooked protein and cooked calories (the minimum the
// serving math needs).
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
    // Cooked record: if either cooked protein or cooked calories is present, both
    // must be, and both must be positive (the serving math divides by cooked protein).
    const hasCookedProtein = typeof f.proteinPer100gCooked === "number";
    const hasCookedCalories = typeof f.caloriesPer100gCooked === "number";
    if (hasCookedProtein !== hasCookedCalories) {
      throw new Error(
        `Dataset error: food "${f.id}" cooked record must have BOTH proteinPer100gCooked and caloriesPer100gCooked.`,
      );
    }
    if (hasCookedProtein) {
      if (!((f.proteinPer100gCooked as number) > 0)) {
        throw new Error(`Dataset error: food "${f.id}" proteinPer100gCooked must be > 0.`);
      }
      if (!((f.caloriesPer100gCooked as number) > 0)) {
        throw new Error(`Dataset error: food "${f.id}" caloriesPer100gCooked must be > 0.`);
      }
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
