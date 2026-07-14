import type { ServingResult } from "./compute";
import type { WeightBasis } from "./types";

// Display rounding (spec §6): servings primary in ounces with grams in parens,
// calories and macros to readable precision. Full precision is preserved upstream.

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

// Ounces to one decimal, weight or fluid depending on the food. Used for the serving
// column and the shared-dinner buy-total.
export function formatOunces(ounces: number): string {
  return `${ounces.toFixed(1)} oz`;
}

// Serving, primary unit: ounces (fluid ounces for liquids) with grams in parens
// (spec §"The table"): "4.8 oz (135 g)".
export function formatServing(r: ServingResult): string {
  if (r.food.isLiquid && r.fluidOunces !== null) {
    return `${r.fluidOunces.toFixed(1)} fl oz (${formatGrams(r.servingGrams)} g)`;
  }
  return `${r.ounces.toFixed(1)} oz (${formatGrams(r.servingGrams)} g)`;
}

// Just the primary ounces figure (no grams), e.g. for a compact portion cell.
export function formatServingOunces(r: ServingResult): string {
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
