// Unit constants (spec §6).
export const GRAMS_PER_OUNCE = 28.3495; // 1 oz (weight)
export const ML_PER_FLUID_OUNCE = 29.5735; // 1 fl oz

// Impractical-serving thresholds (spec §10). Exposed as named constants so they are
// easy to tune. A row above its threshold is flagged (not hidden) as a large serving.
export const IMPRACTICAL_SOLID_GRAMS = 750; // solids: > 750 g
export const IMPRACTICAL_LIQUID_FLOZ = 24; // liquids: > 24 fl oz
