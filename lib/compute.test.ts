import { describe, it, expect } from "vitest";
import type { Food } from "./types";
import {
  computeServing,
  buildResults,
  sortResults,
  parseTarget,
  validateDataset,
} from "./compute";

function food(partial: Partial<Food> & Pick<Food, "id" | "proteinPer100g">): Food {
  return {
    name: partial.id,
    category: "Poultry",
    caloriesPer100g: 0,
    fatPer100g: 0,
    carbsPer100g: 0,
    fiberPer100g: 0,
    weightBasis: "raw",
    isLiquid: false,
    isCompleteProtein: true,
    fdcId: "0",
    fdcDataType: "SR Legacy",
    ...partial,
  };
}

const chicken = food({
  id: "chicken",
  proteinPer100g: 22.5,
  caloriesPer100g: 120,
  fatPer100g: 2.62,
});

describe("computeServing — solids", () => {
  it("scales grams to hit the target protein", () => {
    const r = computeServing(chicken, 40);
    // 100 * 40 / 22.5 = 177.777...
    expect(r.requiredGrams).toBeCloseTo(177.7778, 3);
    // protein delivered is exactly the target
    expect((r.requiredGrams / 100) * chicken.proteinPer100g).toBeCloseTo(40, 6);
  });

  it("scales macros by the same factor", () => {
    const r = computeServing(chicken, 40);
    expect(r.calories).toBeCloseTo(213.33, 2);
    expect(r.fat).toBeCloseTo(4.658, 3);
    expect(r.fluidOunces).toBeNull();
  });

  it("converts grams to weight ounces", () => {
    const r = computeServing(chicken, 40);
    expect(r.ounces).toBeCloseTo(177.7778 / 28.3495, 4);
  });

  it("flags impractical solids above the 750 g threshold", () => {
    const lean = food({ id: "lean", proteinPer100g: 5 }); // 40g needs 800g
    expect(computeServing(lean, 40).isImpractical).toBe(true);
    expect(computeServing(chicken, 40).isImpractical).toBe(false);
  });
});

describe("computeServing — liquids", () => {
  const skimMilk = food({
    id: "skim-milk",
    proteinPer100g: 3.4,
    isLiquid: true,
    densityGPerMl: 1.035,
  });

  it("converts to fluid ounces using density", () => {
    const r = computeServing(skimMilk, 40);
    // grams = 100*40/3.4 = 1176.47; mL = grams/1.035; floz = mL/29.5735
    const expected = 1176.4706 / 1.035 / 29.5735;
    expect(r.fluidOunces).toBeCloseTo(expected, 3);
  });

  it("flags impractical liquids above the 24 fl oz threshold", () => {
    // ~38 fl oz to hit 40 g from skim milk
    expect(computeServing(skimMilk, 40).isImpractical).toBe(true);
  });
});

describe("sorting", () => {
  const a = food({ id: "a", proteinPer100g: 20, caloriesPer100g: 100, carbsPer100g: 5 });
  const b = food({ id: "b", proteinPer100g: 20, caloriesPer100g: 100, carbsPer100g: 2 });
  const c = food({ id: "c", proteinPer100g: 20, caloriesPer100g: 80, carbsPer100g: 9 });

  it("defaults to calories asc, then carbs asc as tiebreak (spec §8)", () => {
    const ordered = buildResults([a, b, c], 40).map((r) => r.food.id);
    // c has fewest calories; a and b tie on calories so carbs breaks the tie (b<a)
    expect(ordered).toEqual(["c", "b", "a"]);
  });

  it("can re-sort by a chosen column and direction", () => {
    const results = buildResults([a, b, c], 40);
    const byCarbsDesc = sortResults(results, "carbs", "desc").map((r) => r.food.id);
    expect(byCarbsDesc).toEqual(["c", "a", "b"]);
  });
});

describe("parseTarget", () => {
  it("accepts positive numbers", () => {
    expect(parseTarget("40")).toEqual({ ok: true, value: 40 });
    expect(parseTarget("  33.5 ")).toEqual({ ok: true, value: 33.5 });
  });
  it("rejects empty, non-numeric, zero and negative", () => {
    expect(parseTarget("").ok).toBe(false);
    expect(parseTarget("abc").ok).toBe(false);
    expect(parseTarget("0").ok).toBe(false);
    expect(parseTarget("-5").ok).toBe(false);
  });
});

describe("validateDataset", () => {
  it("passes a valid dataset", () => {
    expect(() => validateDataset([chicken])).not.toThrow();
  });
  it("throws when a liquid is missing densityGPerMl (spec §10)", () => {
    const badLiquid = food({ id: "bad", proteinPer100g: 3, isLiquid: true });
    expect(() => validateDataset([badLiquid])).toThrow(/densityGPerMl/);
  });
  it("throws on duplicate ids", () => {
    expect(() => validateDataset([chicken, chicken])).toThrow(/duplicate/i);
  });
  it("throws on non-positive protein", () => {
    const zero = food({ id: "zero", proteinPer100g: 0 });
    expect(() => validateDataset([zero])).toThrow(/proteinPer100g/);
  });
});
