/**
 * Build-time FDC dataset regenerator / verifier (spec §2).
 *
 * The shipped dataset in `lib/foods.ts` is hardcoded — the client bundle contains no
 * API key and makes no nutrition calls. This script is the "cleaner path" for
 * (re)resolving the per-100g values from the live USDA FoodData Central REST API. It
 * is BUILD-TIME ONLY and never imported by the app.
 *
 * It reads the fdcId + metadata already chosen in `lib/foods.ts`, fetches those exact
 * FDC entries, and:
 *   - default (verify):  prints any per-100g value that drifts from the committed
 *                        dataset beyond a small tolerance, plus the resolved dataType.
 *   - --write:           emits `lib/foods.generated.ts` with refreshed nutrition
 *                        values + dataType (all other metadata preserved) so you can
 *                        diff it against the curated file and copy over.
 *
 * Usage:
 *   FDC_API_KEY=your_key npm run build:data          # verify against live FDC
 *   FDC_API_KEY=your_key npm run build:data -- --write
 *
 * Get a free key at https://fdc.nal.usda.gov/api-key-signup.html (api.data.gov).
 * The key is used ONLY here and must never be committed or shipped in client code.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FOODS } from "../lib/foods";
import type { Food } from "../lib/types";

const API_BASE = "https://api.nal.usda.gov/fdc/v1";
const TOLERANCE = 0.05; // 5% relative drift is flagged during verify

// FDC nutrient numbers (stable across Foundation / SR Legacy).
const NUTRIENT = {
  protein: "203",
  fat: "204",
  carbs: "205",
  energyKcal: "208",
  fiber: "291",
} as const;

type AbridgedNutrient = {
  number?: string;
  nutrientNumber?: string;
  name?: string;
  nutrientName?: string;
  unitName?: string;
  amount?: number;
  value?: number;
};

type FdcFood = {
  fdcId: number;
  dataType?: string;
  description?: string;
  foodNutrients?: AbridgedNutrient[];
};

type Per100g = {
  proteinPer100g: number;
  caloriesPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number;
  fdcDataType: string;
};

function num(n: AbridgedNutrient): string | undefined {
  return n.number ?? n.nutrientNumber;
}
function amt(n: AbridgedNutrient): number {
  return (n.amount ?? n.value ?? 0) as number;
}

function findByNumber(nutrients: AbridgedNutrient[], number: string): number {
  const hit = nutrients.find((n) => num(n) === number);
  return hit ? amt(hit) : 0;
}

function findEnergyKcal(nutrients: AbridgedNutrient[]): number {
  // Prefer the classic "208" kcal entry; fall back to any Energy row in kcal
  // (Foundation Foods sometimes reports Atwater energy under a different number).
  const direct = nutrients.find((n) => num(n) === NUTRIENT.energyKcal);
  if (direct) return amt(direct);
  const kcal = nutrients.find(
    (n) =>
      (n.nutrientName ?? n.name ?? "").toLowerCase().includes("energy") &&
      (n.unitName ?? "").toUpperCase() === "KCAL",
  );
  return kcal ? amt(kcal) : 0;
}

async function fetchFoods(fdcIds: number[], apiKey: string): Promise<FdcFood[]> {
  const out: FdcFood[] = [];
  // The /foods endpoint accepts up to 20 ids per call.
  for (let i = 0; i < fdcIds.length; i += 20) {
    const batch = fdcIds.slice(i, i + 20);
    const res = await fetch(`${API_BASE}/foods?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fdcIds: batch,
        format: "abridged",
        nutrients: [203, 204, 205, 208, 291],
      }),
    });
    if (!res.ok) {
      throw new Error(
        `FDC API ${res.status} ${res.statusText}. Check FDC_API_KEY and rate limits.`,
      );
    }
    const json = (await res.json()) as FdcFood[];
    out.push(...json);
    // Be polite to the ~1,000 req/hour default rate limit.
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

function toPer100g(food: FdcFood): Per100g {
  const n = food.foodNutrients ?? [];
  return {
    proteinPer100g: findByNumber(n, NUTRIENT.protein),
    caloriesPer100g: findEnergyKcal(n),
    fatPer100g: findByNumber(n, NUTRIENT.fat),
    carbsPer100g: findByNumber(n, NUTRIENT.carbs),
    fiberPer100g: findByNumber(n, NUTRIENT.fiber),
    fdcDataType: food.dataType ?? "Unknown",
  };
}

function drift(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  const base = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / base;
}

function serializeFood(f: Food): string {
  const lines: string[] = [];
  lines.push("  {");
  lines.push(`    id: ${JSON.stringify(f.id)},`);
  lines.push(`    name: ${JSON.stringify(f.name)},`);
  lines.push(`    category: ${JSON.stringify(f.category)},`);
  lines.push(`    proteinPer100g: ${f.proteinPer100g},`);
  lines.push(`    caloriesPer100g: ${f.caloriesPer100g},`);
  lines.push(`    fatPer100g: ${f.fatPer100g},`);
  lines.push(`    carbsPer100g: ${f.carbsPer100g},`);
  lines.push(`    fiberPer100g: ${f.fiberPer100g},`);
  lines.push(`    weightBasis: ${JSON.stringify(f.weightBasis)},`);
  lines.push(`    isLiquid: ${f.isLiquid},`);
  if (f.densityGPerMl !== undefined) {
    lines.push(`    densityGPerMl: ${f.densityGPerMl},`);
  }
  lines.push(`    isCompleteProtein: ${f.isCompleteProtein},`);
  lines.push(`    fdcId: ${JSON.stringify(f.fdcId)},`);
  lines.push(`    fdcDataType: ${JSON.stringify(f.fdcDataType)},`);
  if (f.note !== undefined) {
    lines.push(`    note: ${JSON.stringify(f.note)},`);
  }
  lines.push("  },");
  return lines.join("\n");
}

async function main() {
  const apiKey = process.env.FDC_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing FDC_API_KEY. Get a free key at https://fdc.nal.usda.gov/api-key-signup.html\n" +
        "Then: FDC_API_KEY=your_key npm run build:data",
    );
    process.exit(1);
  }
  const write = process.argv.includes("--write");

  const fdcIds = [...new Set(FOODS.map((f) => Number(f.fdcId)))].filter(
    (n) => Number.isFinite(n) && n > 0,
  );
  console.log(`Fetching ${fdcIds.length} FDC entries…`);
  const fetched = await fetchFoods(fdcIds, apiKey);
  const byId = new Map<number, Per100g>();
  for (const f of fetched) byId.set(f.fdcId, toPer100g(f));

  let flagged = 0;
  const refreshed: Food[] = FOODS.map((food) => {
    const live = byId.get(Number(food.fdcId));
    if (!live) {
      console.warn(`  ! ${food.id}: fdcId ${food.fdcId} not returned by FDC`);
      return food;
    }
    const checks: [string, number, number][] = [
      ["protein", food.proteinPer100g, live.proteinPer100g],
      ["calories", food.caloriesPer100g, live.caloriesPer100g],
      ["fat", food.fatPer100g, live.fatPer100g],
      ["carbs", food.carbsPer100g, live.carbsPer100g],
      ["fiber", food.fiberPer100g, live.fiberPer100g],
    ];
    for (const [label, committed, fresh] of checks) {
      if (drift(committed, fresh) > TOLERANCE) {
        flagged++;
        console.log(
          `  ~ ${food.id} ${label}: committed ${committed} vs FDC ${fresh} (${food.fdcDataType} → ${live.fdcDataType})`,
        );
      }
    }
    return { ...food, ...live };
  });

  console.log(
    flagged === 0
      ? "All committed values match live FDC within tolerance."
      : `${flagged} value(s) drifted beyond ${TOLERANCE * 100}% — review above.`,
  );

  if (write) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const outPath = path.join(__dirname, "..", "lib", "foods.generated.ts");
    const header =
      "// AUTO-GENERATED by scripts/build-dataset.ts from live USDA FoodData Central.\n" +
      "// Diff against lib/foods.ts and copy over the values you trust.\n" +
      'import type { Food } from "./types";\n' +
      'import { validateDataset } from "./compute";\n\n' +
      "export const FOODS: Food[] = [\n";
    const body = refreshed.map(serializeFood).join("\n");
    const footer = "\n];\n\nvalidateDataset(FOODS);\n";
    await writeFile(outPath, header + body + footer, "utf8");
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
