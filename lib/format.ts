import type { ServingResult } from "./compute";
import type { WeightBasis } from "./types";

// Display rounding (spec §6): servings and macros to whole numbers or one decimal for
// readability. Full precision is preserved upstream in the ServingResult.

export function formatGrams(grams: number): string {
  return Math.round(grams).toLocaleString("en-US");
}

export function formatCalories(kcal: number): string {
  return Math.round(kcal).toLocaleString("en-US");
}

export function formatMacro(grams: number): string {
  return grams.toFixed(1);
}

export function formatDensity(score: number): string {
  return Math.round(score).toLocaleString("en-US");
}

export function formatPct(pct: number): string {
  return `${Math.round(pct)}%`;
}

export function formatOmega3(mg: number): string {
  return `${Math.round(mg).toLocaleString("en-US")} mg`;
}

// The oz / fl oz column mixes units per row: weight ounces for solids, fluid ounces
// for liquids. The unit travels with the value so the column is never ambiguous.
export function formatServingSecondary(r: ServingResult): string {
  if (r.food.isLiquid && r.fluidOunces !== null) {
    return `${r.fluidOunces.toFixed(1)} fl oz`;
  }
  return `${r.ounces.toFixed(1)} oz`;
}

export function formatBasis(basis: WeightBasis): string {
  switch (basis) {
    case "raw":
      return "raw";
    case "cooked":
      return "cooked";
    case "as_sold":
      return "as sold";
  }
}
