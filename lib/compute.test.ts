import { describe, it, expect } from "vitest";
import type { Food, Micronutrients } from "./types";
import {
  computeServing,
  resolveBasis,
  buildServings,
  sortServings,
  rawServingGrams,
  buyTotalGrams,
  parseProteinTarget,
  parseCalorieCeiling,
  validateDataset,
} from "./compute";
import { GRAMS_PER_OUNCE } from "./constants";
import { formatServing, formatOunces } from "./format";

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

describe("computeServing — protein anchor (one engine)", () => {
  it("scales the serving to deliver the protein target", () => {
    const f = food({ id: "f", caloriesPer100g: 100, proteinPer100g: 20 });
    const r = computeServing(f, 50, "raw");
    expect(r.servingGrams).toBeCloseTo(250, 6); // 50 * 100 / 20
    expect(r.proteinDelivered).toBeCloseTo(50, 6);
    expect(r.calories).toBeCloseTo(250, 6); // 100 * 250/100
    expect(r.ounces).toBeCloseTo(250 / GRAMS_PER_OUNCE, 4);
    expect(r.fluidOunces).toBeNull();
  });

  it("converts liquids to fluid ounces via density", () => {
    const f = food({ id: "milk", caloriesPer100g: 50, isLiquid: true, densityGPerMl: 1.0 });
    const r = computeServing(f, 20, "raw"); // serving = 100 g
    expect(r.fluidOunces).toBeCloseTo(100 / 1.0 / 29.5735, 3);
  });

  it("flags over-ceiling when the item's own calories exceed the ceiling", () => {
    const f = food({ id: "f", caloriesPer100g: 400, proteinPer100g: 20 }); // 50 g → 1000 cal
    expect(computeServing(f, 50, "raw", 500).overCeiling).toBe(true);
    expect(computeServing(f, 50, "raw", 1500).overCeiling).toBe(false);
    expect(computeServing(f, 50, "raw", 0).overCeiling).toBe(false); // no ceiling
  });
});

describe("resolveBasis — Raw/Cooked toggle picks the field set", () => {
  const raw = food({
    id: "chicken",
    weightBasis: "raw",
    proteinPer100g: 22.5,
    caloriesPer100g: 120,
    proteinPer100gCooked: 31.02,
    caloriesPer100gCooked: 165,
    fdcIdCooked: "171534",
    fdcDataTypeCooked: "SR Legacy",
  });

  it("uses cooked fields on cooked basis for a raw-stored meat", () => {
    const r = resolveBasis(raw, "cooked");
    expect(r.protein100).toBe(31.02);
    expect(r.calories100).toBe(165);
    expect(r.basisTag).toBe("cooked");
    expect(r.fdcIdShown).toBe("171534");
    expect(r.cookedApproximate).toBe(true);
  });

  it("uses raw fields on raw basis", () => {
    const r = resolveBasis(raw, "raw");
    expect(r.protein100).toBe(22.5);
    expect(r.basisTag).toBe("raw");
    expect(r.cookedApproximate).toBe(false);
  });

  it("as-sold foods are unaffected by the toggle", () => {
    const canned = food({ id: "tuna", weightBasis: "as_sold", proteinPer100g: 25 });
    expect(resolveBasis(canned, "cooked").basisTag).toBe("as_sold");
    expect(resolveBasis(canned, "cooked").protein100).toBe(25);
  });

  it("a raw food with no cooked record falls back to raw on cooked basis", () => {
    const noCook = food({ id: "x", weightBasis: "raw", proteinPer100g: 20 });
    const r = resolveBasis(noCook, "cooked");
    expect(r.basisTag).toBe("raw");
    expect(r.protein100).toBe(20);
  });

  it("cooked basis returns a smaller serving than raw (denser cooked protein)", () => {
    const rawServing = computeServing(raw, 50, "raw").servingGrams;
    const cookedServing = computeServing(raw, 50, "cooked").servingGrams;
    expect(cookedServing).toBeLessThan(rawServing);
    expect(cookedServing).toBeCloseTo((50 * 100) / 31.02, 6);
  });
});

describe("density score", () => {
  it("sums %DV across tracked nutrients at the serving", () => {
    // serving 250 g (scale 2.5). iron 3.6→9mg=50%DV, zinc 2.2→5.5mg=50%DV
    const f = food({ id: "f", proteinPer100g: 20, micros: { ironMg: 3.6, zincMg: 2.2 } });
    const r = computeServing(f, 50, "raw");
    expect(r.densityScore).toBeCloseTo(100, 4);
  });

  it("caps each nutrient at 100 %DV so none dominates", () => {
    // iron 14.4→36mg=200% → capped 100; zinc 2.2→50% → total 150
    const f = food({ id: "f", proteinPer100g: 20, micros: { ironMg: 14.4, zincMg: 2.2 } });
    const r = computeServing(f, 50, "raw");
    expect(r.densityScore).toBeCloseTo(150, 4);
  });

  it("flags 'rich in' (≥20% DV) and marks omega-3 sources (non-DV)", () => {
    const f = food({
      id: "fish",
      proteinPer100g: 20,
      micros: { ironMg: 3.6, zincMg: 0.66, omega3Mg: 200 },
    });
    const r = computeServing(f, 50, "raw"); // scale 2.5
    expect(r.highlights.map((h) => h.key)).toEqual(["iron"]); // 50%
    expect(r.goodSources.map((g) => g.key)).toEqual(["zinc"]); // 0.66*2.5=1.65mg=15%
    expect(r.omega3Mg).toBeCloseTo(500, 6);
    expect(r.isOmega3Source).toBe(true);
  });
});

describe("sorting + over-ceiling demotion", () => {
  it("sorts by density (desc) by default and keeps over-ceiling rows last", () => {
    const a = food({ id: "a", proteinPer100g: 20, caloriesPer100g: 100, micros: { ironMg: 3.6 } });
    const b = food({ id: "b", proteinPer100g: 20, caloriesPer100g: 100, micros: { ironMg: 7.2 } });
    const over = food({ id: "over", proteinPer100g: 20, caloriesPer100g: 400, micros: { ironMg: 100 } });
    const rows = buildServings([a, b, over], {
      proteinTarget: 50,
      calorieCeiling: 500, // a,b = 250 cal fit; over = 1000 cal
      basis: "raw",
      sort: "density",
    });
    expect(rows.map((r) => r.food.id)).toEqual(["b", "a", "over"]);
    expect(rows[2].overCeiling).toBe(true);
  });

  it("sorts by smallest serving (ascending grams)", () => {
    const small = food({ id: "small", proteinPer100g: 40 }); // 50g→125g
    const big = food({ id: "big", proteinPer100g: 10 }); // 50g→500g
    const rows = sortServings(
      [computeServing(big, 50, "raw"), computeServing(small, 50, "raw")],
      "serving",
    );
    expect(rows.map((r) => r.food.id)).toEqual(["small", "big"]);
  });

  it("sorts by fiber (desc)", () => {
    const hi = food({ id: "hi", proteinPer100g: 20, fiberPer100g: 8 });
    const lo = food({ id: "lo", proteinPer100g: 20, fiberPer100g: 1 });
    const rows = sortServings(
      [computeServing(lo, 50, "raw"), computeServing(hi, 50, "raw")],
      "fiber",
    );
    expect(rows.map((r) => r.food.id)).toEqual(["hi", "lo"]);
  });
});

describe("shared dinner (Cooking for two)", () => {
  it("buy-total is the sum of both RAW servings regardless of display basis", () => {
    const f = food({
      id: "chicken",
      proteinPer100g: 22.5,
      proteinPer100gCooked: 31.02,
      caloriesPer100gCooked: 165,
      fdcIdCooked: "1",
    });
    // raw servings: 30g→133.3, 50g→222.2 → total 355.6, independent of basis
    const expected = (30 * 100) / 22.5 + (50 * 100) / 22.5;
    expect(buyTotalGrams(f, 30, 50)).toBeCloseTo(expected, 6);
    expect(rawServingGrams(f, 30)).toBeCloseTo((30 * 100) / 22.5, 6);
  });
});

describe("parseProteinTarget / parseCalorieCeiling", () => {
  it("protein target: blank/0/negative = off (0), value otherwise, clamped to max", () => {
    expect(parseProteinTarget("")).toBe(0);
    expect(parseProteinTarget("0")).toBe(0);
    expect(parseProteinTarget("-5")).toBe(0);
    expect(parseProteinTarget("abc")).toBe(0);
    expect(parseProteinTarget("35")).toBe(35);
    expect(parseProteinTarget("99999")).toBe(300); // clamped
  });

  it("calorie ceiling: blank = no filter (0), value otherwise, clamped to max", () => {
    expect(parseCalorieCeiling("")).toBe(0);
    expect(parseCalorieCeiling("0")).toBe(0);
    expect(parseCalorieCeiling("-1")).toBe(0);
    expect(parseCalorieCeiling("500")).toBe(500);
    expect(parseCalorieCeiling("99999")).toBe(10000); // clamped
  });
});

describe("validateDataset", () => {
  const good = food({ id: "good", micros: { ironMg: 1 } });
  it("passes a valid dataset", () => {
    expect(() => validateDataset([good])).not.toThrow();
  });
  it("throws when caloriesPer100g is not > 0", () => {
    expect(() => validateDataset([food({ id: "z", caloriesPer100g: 0 })])).toThrow(
      /caloriesPer100g/,
    );
  });
  it("throws when a liquid is missing densityGPerMl", () => {
    expect(() => validateDataset([food({ id: "l", isLiquid: true })])).toThrow(
      /densityGPerMl/,
    );
  });
  it("throws on duplicate ids", () => {
    expect(() => validateDataset([good, good])).toThrow(/duplicate/i);
  });
  it("throws when a cooked record has protein but no calories", () => {
    expect(() =>
      validateDataset([food({ id: "c", proteinPer100gCooked: 30 })]),
    ).toThrow(/BOTH proteinPer100gCooked and caloriesPer100gCooked/);
  });
});

// Acceptance checks (spec §Handoff), verified against the current dataset, Raw basis.
describe("acceptance checks (Raw basis)", () => {
  const sockeye = food({
    id: "sockeye",
    name: "Salmon, sockeye (wild)",
    proteinPer100g: 22.25,
    caloriesPer100g: 131,
  });
  const chicken = food({
    id: "chicken",
    name: "Chicken breast, skinless",
    proteinPer100g: 22.5,
    caloriesPer100g: 120,
  });

  it("sockeye 30 g → 4.8 oz raw, ~177 cal", () => {
    const r = computeServing(sockeye, 30, "raw");
    expect(r.ounces).toBeCloseTo(4.76, 1);
    expect(formatServing(r)).toMatch(/^4\.8 oz/);
    expect(Math.round(r.calories)).toBe(177);
  });

  it("sockeye 50 g → 7.9 oz raw, ~294 cal", () => {
    const r = computeServing(sockeye, 50, "raw");
    expect(formatServing(r)).toMatch(/^7\.9 oz/);
    expect(Math.round(r.calories)).toBe(294);
  });

  it("sockeye buy-total for 30 g + 50 g → ~13 oz raw", () => {
    const grams = buyTotalGrams(sockeye, 30, 50);
    const oz = grams / GRAMS_PER_OUNCE;
    expect(oz).toBeCloseTo(12.68, 1);
    expect(formatOunces(oz)).toBe("12.7 oz"); // rounds up to ~13 / a 1 lb fillet
  });

  it("chicken breast 50 g → 7.8 oz raw, ~267 cal", () => {
    const r = computeServing(chicken, 50, "raw");
    expect(formatServing(r)).toMatch(/^7\.8 oz/);
    expect(Math.round(r.calories)).toBe(267);
  });
});
