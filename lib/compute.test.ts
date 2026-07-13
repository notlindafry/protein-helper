import { describe, it, expect } from "vitest";
import type { Food, Micronutrients } from "./types";
import {
  computeServing,
  computeServingAtGrams,
  buildResults,
  buildMatches,
  matchServingGrams,
  sortResults,
  parseCeiling,
  parseProteinTarget,
  validateDataset,
} from "./compute";
import { GRAMS_PER_OUNCE } from "./constants";

const ZERO_MICROS: Micronutrients = {
  ironMg: 0,
  potassiumMg: 0,
  magnesiumMg: 0,
  calciumMg: 0,
  zincMg: 0,
  vitaminB12Mcg: 0,
  vitaminDMcg: 0,
  seleniumMcg: 0,
  omega3Mg: 0,
};

function food(
  partial: Omit<Partial<Food>, "micros"> &
    Pick<Food, "id"> & { micros?: Partial<Micronutrients> },
): Food {
  return {
    name: partial.id,
    category: "Poultry",
    caloriesPer100g: 100,
    proteinPer100g: 20,
    fatPer100g: 0,
    carbsPer100g: 0,
    fiberPer100g: 0,
    weightBasis: "raw",
    isLiquid: false,
    isCompleteProtein: true,
    fdcId: "0",
    fdcDataType: "SR Legacy",
    ...partial,
    micros: { ...ZERO_MICROS, ...(partial.micros ?? {}) },
  };
}

describe("computeServing — ceiling anchor (§A)", () => {
  it("sets the serving that spends the calorie ceiling", () => {
    const f = food({ id: "f", caloriesPer100g: 100, proteinPer100g: 20 });
    const r = computeServing(f, 500);
    expect(r.servingGrams).toBeCloseTo(500, 6); // 500 * 100 / 100
    expect(r.calories).toBeCloseTo(500, 6);
    expect(r.proteinDelivered).toBeCloseTo(100, 6); // 20 * 500/100
    expect(r.ounces).toBeCloseTo(500 / GRAMS_PER_OUNCE, 4);
  });

  it("scales macros to the serving", () => {
    const f = food({ id: "f", caloriesPer100g: 200, fatPer100g: 10, carbsPer100g: 5 });
    const r = computeServing(f, 500); // serving = 250 g, scale 2.5
    expect(r.fat).toBeCloseTo(25, 6);
    expect(r.carbs).toBeCloseTo(12.5, 6);
    expect(r.fluidOunces).toBeNull();
  });

  it("converts liquids to fluid ounces via density", () => {
    const f = food({ id: "milk", caloriesPer100g: 50, isLiquid: true, densityGPerMl: 1.0 });
    const r = computeServing(f, 500); // serving = 1000 g
    expect(r.fluidOunces).toBeCloseTo(1000 / 1.0 / 29.5735, 3);
  });
});

describe("density score (§C1)", () => {
  it("sums %DV across tracked nutrients at the serving", () => {
    // scale 5 at ceiling 500. iron 1.8→9mg=50%DV(18), zinc 1.1→5.5mg=50%DV(11)
    const f = food({ id: "f", caloriesPer100g: 100, micros: { ironMg: 1.8, zincMg: 1.1 } });
    const r = computeServing(f, 500);
    expect(r.densityScore).toBeCloseTo(100, 4); // 50 + 50
  });

  it("caps each nutrient at NUTRIENT_CAP (100) so none dominates", () => {
    // iron 7.2→36mg=200%DV → capped to 100; zinc 1.1→50% → total 150
    const f = food({ id: "f", caloriesPer100g: 100, micros: { ironMg: 7.2, zincMg: 1.1 } });
    const r = computeServing(f, 500);
    expect(r.densityScore).toBeCloseTo(150, 4);
  });
});

describe("highlights + omega-3 (§C2/§B3)", () => {
  it("flags 'high in' (≥20% DV) sorted by %DV desc", () => {
    const f = food({ id: "f", caloriesPer100g: 100, micros: { ironMg: 1.8, zincMg: 0.33 } });
    // iron 50% (high in), zinc 0.33→1.65mg=15% (good source)
    const r = computeServing(f, 500);
    expect(r.highlights.map((h) => h.key)).toEqual(["iron"]);
    expect(r.goodSources.map((g) => g.key)).toEqual(["zinc"]);
  });

  it("marks omega-3 sources against the non-DV reference", () => {
    const seafood = food({ id: "fish", caloriesPer100g: 100, micros: { omega3Mg: 100 } });
    const r = computeServing(seafood, 500); // 100 * 5 = 500 mg ≥ 250
    expect(r.isOmega3Source).toBe(true);
    expect(r.omega3Mg).toBeCloseTo(500, 6);
  });
});

describe("flags", () => {
  it("belowProteinFloor when protein delivered < 30 g (§C4)", () => {
    const lean = food({ id: "lean", caloriesPer100g: 100, proteinPer100g: 4 }); // 20 g
    const rich = food({ id: "rich", caloriesPer100g: 100, proteinPer100g: 20 }); // 100 g
    expect(computeServing(lean, 500).belowProteinFloor).toBe(true);
    expect(computeServing(rich, 500).belowProteinFloor).toBe(false);
  });

  it("isLargePortion for very low-calorie foods (§C5)", () => {
    const light = food({ id: "light", caloriesPer100g: 30 }); // serving ~1667 g
    expect(computeServing(light, 500).isLargePortion).toBe(true);
    expect(computeServing(food({ id: "dense", caloriesPer100g: 100 }), 500).isLargePortion).toBe(
      false,
    );
  });
});

describe("sorting (§C3)", () => {
  it("defaults to protein delivered descending", () => {
    const a = food({ id: "a", caloriesPer100g: 100, proteinPer100g: 10 }); // 50 g
    const b = food({ id: "b", caloriesPer100g: 100, proteinPer100g: 30 }); // 150 g
    const c = food({ id: "c", caloriesPer100g: 100, proteinPer100g: 20 }); // 100 g
    expect(buildResults([a, b, c], 500).map((r) => r.food.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks protein ties by density (the secondary score)", () => {
    // equal protein (all 100 g delivered); density from iron: b > a > c
    const a = food({ id: "a", caloriesPer100g: 100, micros: { ironMg: 1.8 } }); // 50
    const b = food({ id: "b", caloriesPer100g: 100, micros: { ironMg: 3.6 } }); // 100
    const c = food({ id: "c", caloriesPer100g: 100, micros: { ironMg: 0.9 } }); // 25
    expect(buildResults([a, b, c], 500).map((r) => r.food.id)).toEqual(["b", "a", "c"]);
  });

  it("can still sort by density, and by protein ascending", () => {
    const a = food({ id: "a", caloriesPer100g: 100, proteinPer100g: 10 });
    const b = food({ id: "b", caloriesPer100g: 100, proteinPer100g: 30 });
    const results = buildResults([a, b], 500);
    expect(sortResults(results, "protein", "asc").map((r) => r.food.id)).toEqual(["a", "b"]);
    expect(sortResults(results, "density", "desc").length).toBe(2);
  });
});

describe("parseCeiling / parseProteinTarget", () => {
  it("accepts positive ceilings", () => {
    expect(parseCeiling("500")).toEqual({ ok: true, value: 500 });
  });
  it("rejects empty, non-numeric, zero, negative", () => {
    expect(parseCeiling("").ok).toBe(false);
    expect(parseCeiling("abc").ok).toBe(false);
    expect(parseCeiling("0").ok).toBe(false);
    expect(parseCeiling("-5").ok).toBe(false);
  });
  it("protein target: blank/0/negative = off, else the value", () => {
    expect(parseProteinTarget("")).toBe(0);
    expect(parseProteinTarget("0")).toBe(0);
    expect(parseProteinTarget("-3")).toBe(0);
    expect(parseProteinTarget("abc")).toBe(0);
    expect(parseProteinTarget("50")).toBe(50);
    expect(parseProteinTarget("32.5")).toBe(32.5);
  });
});

describe("two-target band search (±10%)", () => {
  it("matches an exact-ratio food at the protein target", () => {
    // ratio 10 g / 100 cal == target 50/500; serving hits both exactly
    const f = food({ id: "f", caloriesPer100g: 100, proteinPer100g: 10 });
    const g = matchServingGrams(f, 500, 50, 0.1);
    expect(g).toBeCloseTo(500, 6);
    const r = computeServingAtGrams(f, g as number);
    expect(r.proteinDelivered).toBeCloseTo(50, 6);
    expect(r.calories).toBeCloseTo(500, 6);
  });

  it("uses calorie slack to still match a slightly protein-dense food", () => {
    // 55 g protein at 500 cal (top of protein band); trims serving to center protein
    const f = food({ id: "f", caloriesPer100g: 100, proteinPer100g: 11 });
    const g = matchServingGrams(f, 500, 50, 0.1);
    expect(g).not.toBeNull();
    const r = computeServingAtGrams(f, g as number);
    expect(r.proteinDelivered).toBeGreaterThanOrEqual(45);
    expect(r.proteinDelivered).toBeLessThanOrEqual(55);
    expect(r.calories).toBeGreaterThanOrEqual(450);
    expect(r.calories).toBeLessThanOrEqual(550);
  });

  it("rejects a food that cannot hit both bands", () => {
    const lean = food({ id: "lean", caloriesPer100g: 100, proteinPer100g: 5 }); // ratio too low
    expect(matchServingGrams(lean, 500, 50, 0.1)).toBeNull();
  });

  it("buildMatches keeps only matching foods", () => {
    const a = food({ id: "a", caloriesPer100g: 100, proteinPer100g: 10 }); // matches
    const b = food({ id: "b", caloriesPer100g: 100, proteinPer100g: 5 }); // no
    expect(buildMatches([a, b], 500, 50, 0.1).map((r) => r.food.id)).toEqual(["a"]);
  });
});

describe("validateDataset", () => {
  const good = food({ id: "good", micros: { ironMg: 1 } });
  it("passes a valid dataset", () => {
    expect(() => validateDataset([good])).not.toThrow();
  });
  it("throws when caloriesPer100g is not > 0 (§A)", () => {
    expect(() => validateDataset([food({ id: "z", caloriesPer100g: 0 })])).toThrow(
      /caloriesPer100g/,
    );
  });
  it("throws when a liquid is missing densityGPerMl (§10)", () => {
    expect(() =>
      validateDataset([food({ id: "l", isLiquid: true })]),
    ).toThrow(/densityGPerMl/);
  });
  it("throws on duplicate ids", () => {
    expect(() => validateDataset([good, good])).toThrow(/duplicate/i);
  });
  it("throws when a micros field is missing/non-numeric", () => {
    const bad = food({ id: "bad" });
    // @ts-expect-error deliberately break the micros block
    bad.micros.ironMg = undefined;
    expect(() => validateDataset([bad])).toThrow(/micros\.ironMg/);
  });
});
