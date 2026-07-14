/**
 * Build-time FDC dataset regenerator / verifier (spec §2 + revision §B2).
 *
 * The shipped dataset (lib/foods.ts macros/metadata + lib/micros.ts micronutrients)
 * is hardcoded — the client bundle contains no API key and makes no nutrition calls.
 * This script is the "cleaner path" for (re)resolving BOTH the macros and the
 * micronutrients from the live USDA FoodData Central REST API. BUILD-TIME ONLY;
 * never imported by the app.
 *
 * It reads the fdcId + metadata already chosen in lib/foods.ts (BOTH the raw fdcId
 * and the parallel cooked fdcIdCooked for meats/fish), fetches those exact FDC
 * entries, and:
 *   - default (verify):  prints any per-100g value (macro, micro, OR cooked
 *                        protein/calories) that drifts from the committed dataset
 *                        beyond a small tolerance.
 *   - --write:           emits lib/foods.generated.ts (macros/base + cooked fields)
 *                        and lib/micros.generated.ts (micronutrients) to diff and copy.
 *
 * IMPORTANT: the cooked values in lib/foods.ts were compiled from known USDA FDC
 * cooked records but are UNVERIFIED (no FDC_API_KEY / no network to FDC in the build
 * environment). Running this script with a key is how you confirm each cooked fdcId
 * resolves to the expected cooked protein + calories. See COOKED_VALUES.md.
 *
 * Usage:
 *   FDC_API_KEY=your_key npm run build:data
 *   FDC_API_KEY=your_key npm run build:data -- --write
 *
 * Get a free key at https://fdc.nal.usda.gov/api-key-signup.html (api.data.gov).
 * The key is used ONLY here and must never be committed or shipped in client code.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FOODS } from "../lib/foods";
import type { Food, Micronutrients } from "../lib/types";

const API_BASE = "https://api.nal.usda.gov/fdc/v1";
const TOLERANCE = 0.1; // 10% relative drift is flagged (micros vary more across samples)

// FDC nutrient numbers. Macros are stable; verify the micro numbers against the
// current FDC schema if anything looks off (revision §B2).
const NUTRIENT = {
  protein: "203",
  fat: "204",
  carbs: "205",
  energyKcal: "208",
  fiber: "291",
  iron: "303",
  potassium: "306",
  magnesium: "304",
  calcium: "301",
  zinc: "309",
  vitaminB12: "418",
  vitaminD: "328", // Vitamin D (D2 + D3), mcg  (324 is the IU version)
  selenium: "317",
  epa: "629", // 20:5 n-3 EPA
  dha: "621", // 22:6 n-3 DHA
} as const;

const ALL_NUMBERS = Object.values(NUTRIENT).map(Number);

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

type Resolved = {
  proteinPer100g: number;
  caloriesPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number;
  fdcDataType: string;
  micros: Micronutrients;
};

function num(n: AbridgedNutrient): string | undefined {
  return n.number ?? n.nutrientNumber;
}
function amt(n: AbridgedNutrient): number {
  return (n.amount ?? n.value ?? 0) as number;
}
function byNumber(nutrients: AbridgedNutrient[], number: string): number {
  const hit = nutrients.find((n) => num(n) === number);
  return hit ? amt(hit) : 0;
}
function energyKcal(nutrients: AbridgedNutrient[]): number {
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
  for (let i = 0; i < fdcIds.length; i += 20) {
    const batch = fdcIds.slice(i, i + 20);
    const res = await fetch(`${API_BASE}/foods?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fdcIds: batch, format: "abridged", nutrients: ALL_NUMBERS }),
    });
    if (!res.ok) {
      throw new Error(
        `FDC API ${res.status} ${res.statusText}. Check FDC_API_KEY and rate limits.`,
      );
    }
    out.push(...((await res.json()) as FdcFood[]));
    await new Promise((r) => setTimeout(r, 250)); // be polite to the rate limit
  }
  return out;
}

function resolve(food: FdcFood): Resolved {
  const n = food.foodNutrients ?? [];
  return {
    proteinPer100g: byNumber(n, NUTRIENT.protein),
    caloriesPer100g: energyKcal(n),
    fatPer100g: byNumber(n, NUTRIENT.fat),
    carbsPer100g: byNumber(n, NUTRIENT.carbs),
    fiberPer100g: byNumber(n, NUTRIENT.fiber),
    fdcDataType: food.dataType ?? "Unknown",
    micros: {
      ironMg: byNumber(n, NUTRIENT.iron),
      potassiumMg: byNumber(n, NUTRIENT.potassium),
      magnesiumMg: byNumber(n, NUTRIENT.magnesium),
      calciumMg: byNumber(n, NUTRIENT.calcium),
      zincMg: byNumber(n, NUTRIENT.zinc),
      vitaminB12Mcg: byNumber(n, NUTRIENT.vitaminB12),
      vitaminDMcg: byNumber(n, NUTRIENT.vitaminD),
      seleniumMcg: byNumber(n, NUTRIENT.selenium),
      omega3Mg: byNumber(n, NUTRIENT.epa) + byNumber(n, NUTRIENT.dha),
    },
  };
}

function drift(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9);
}

const MICRO_KEYS: (keyof Micronutrients)[] = [
  "ironMg",
  "potassiumMg",
  "magnesiumMg",
  "calciumMg",
  "zincMg",
  "vitaminB12Mcg",
  "vitaminDMcg",
  "seleniumMcg",
  "omega3Mg",
];

function serializeBase(f: Food): string {
  const L: string[] = ["  {"];
  L.push(`    id: ${JSON.stringify(f.id)},`);
  L.push(`    name: ${JSON.stringify(f.name)},`);
  L.push(`    category: ${JSON.stringify(f.category)},`);
  L.push(`    proteinPer100g: ${f.proteinPer100g},`);
  L.push(`    caloriesPer100g: ${f.caloriesPer100g},`);
  L.push(`    fatPer100g: ${f.fatPer100g},`);
  L.push(`    carbsPer100g: ${f.carbsPer100g},`);
  L.push(`    fiberPer100g: ${f.fiberPer100g},`);
  L.push(`    weightBasis: ${JSON.stringify(f.weightBasis)},`);
  L.push(`    isLiquid: ${f.isLiquid},`);
  if (f.densityGPerMl !== undefined) L.push(`    densityGPerMl: ${f.densityGPerMl},`);
  L.push(`    isCompleteProtein: ${f.isCompleteProtein},`);
  L.push(`    fdcId: ${JSON.stringify(f.fdcId)},`);
  L.push(`    fdcDataType: ${JSON.stringify(f.fdcDataType)},`);
  if (f.note !== undefined) L.push(`    note: ${JSON.stringify(f.note)},`);
  // Parallel cooked fields (spec §"Raw vs cooked"), preserved on round-trip.
  if (f.proteinPer100gCooked !== undefined)
    L.push(`    proteinPer100gCooked: ${f.proteinPer100gCooked},`);
  if (f.caloriesPer100gCooked !== undefined)
    L.push(`    caloriesPer100gCooked: ${f.caloriesPer100gCooked},`);
  if (f.fatPer100gCooked !== undefined)
    L.push(`    fatPer100gCooked: ${f.fatPer100gCooked},`);
  if (f.carbsPer100gCooked !== undefined)
    L.push(`    carbsPer100gCooked: ${f.carbsPer100gCooked},`);
  if (f.fiberPer100gCooked !== undefined)
    L.push(`    fiberPer100gCooked: ${f.fiberPer100gCooked},`);
  if (f.fdcIdCooked !== undefined)
    L.push(`    fdcIdCooked: ${JSON.stringify(f.fdcIdCooked)},`);
  if (f.fdcDataTypeCooked !== undefined)
    L.push(`    fdcDataTypeCooked: ${JSON.stringify(f.fdcDataTypeCooked)},`);
  L.push("  },");
  return L.join("\n");
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

  // Fetch every referenced FDC entry once: the raw fdcId AND the cooked fdcIdCooked.
  const rawIds = FOODS.map((f) => Number(f.fdcId));
  const cookedIds = FOODS.map((f) => Number(f.fdcIdCooked)).filter((n) => n > 0);
  const fdcIds = [...new Set([...rawIds, ...cookedIds])].filter(
    (n) => Number.isFinite(n) && n > 0,
  );
  const cookedCount = FOODS.filter((f) => f.fdcIdCooked).length;
  console.log(
    `Fetching ${fdcIds.length} FDC entries (macros + micros; ${cookedCount} cooked records)…`,
  );
  const fetched = await fetchFoods(fdcIds, apiKey);
  const byId = new Map<number, Resolved>();
  for (const f of fetched) byId.set(f.fdcId, resolve(f));

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
      ...MICRO_KEYS.map(
        (k) => [k, food.micros[k] ?? 0, live.micros[k] ?? 0] as [string, number, number],
      ),
    ];
    for (const [label, committed, fresh] of checks) {
      if (drift(committed, fresh) > TOLERANCE) {
        flagged++;
        console.log(`  ~ ${food.id} ${label}: committed ${committed} vs FDC ${fresh}`);
      }
    }

    // Verify the cooked record (spec §"Raw vs cooked"): the cooked fdcId must resolve
    // to the committed cooked protein + calories (the minimum the toggle needs), and
    // any committed cooked macro is checked too. This is the flagged UNVERIFIED data.
    const cooked: Partial<Food> = {};
    if (food.fdcIdCooked) {
      const liveCooked = byId.get(Number(food.fdcIdCooked));
      if (!liveCooked) {
        console.warn(
          `  ! ${food.id}: cooked fdcId ${food.fdcIdCooked} not returned by FDC`,
        );
      } else {
        const cookedChecks: [string, number | undefined, number][] = [
          ["cooked protein", food.proteinPer100gCooked, liveCooked.proteinPer100g],
          ["cooked calories", food.caloriesPer100gCooked, liveCooked.caloriesPer100g],
          ["cooked fat", food.fatPer100gCooked, liveCooked.fatPer100g],
          ["cooked carbs", food.carbsPer100gCooked, liveCooked.carbsPer100g],
          ["cooked fiber", food.fiberPer100gCooked, liveCooked.fiberPer100g],
        ];
        for (const [label, committed, fresh] of cookedChecks) {
          if (committed === undefined) continue;
          if (drift(committed, fresh) > TOLERANCE) {
            flagged++;
            console.log(`  ~ ${food.id} ${label}: committed ${committed} vs FDC ${fresh}`);
          }
        }
        cooked.proteinPer100gCooked = liveCooked.proteinPer100g;
        cooked.caloriesPer100gCooked = liveCooked.caloriesPer100g;
        if (food.fatPer100gCooked !== undefined)
          cooked.fatPer100gCooked = liveCooked.fatPer100g;
        if (food.carbsPer100gCooked !== undefined)
          cooked.carbsPer100gCooked = liveCooked.carbsPer100g;
        if (food.fiberPer100gCooked !== undefined)
          cooked.fiberPer100gCooked = liveCooked.fiberPer100g;
      }
    }

    return { ...food, ...live, ...cooked };
  });

  console.log(
    flagged === 0
      ? "All committed values match live FDC within tolerance."
      : `${flagged} value(s) drifted beyond ${TOLERANCE * 100}% — review above.`,
  );

  if (write) {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "lib");

    const foodsOut =
      "// AUTO-GENERATED by scripts/build-dataset.ts from live USDA FoodData Central.\n" +
      "// Diff against lib/foods.ts and copy over the macro/base values you trust.\n" +
      'import type { Food } from "./types";\n\n' +
      "export const FOOD_BASE: Omit<Food, \"micros\">[] = [\n" +
      refreshed.map(serializeBase).join("\n") +
      "\n];\n";
    await writeFile(path.join(dir, "foods.generated.ts"), foodsOut, "utf8");

    const microsOut =
      "// AUTO-GENERATED by scripts/build-dataset.ts from live USDA FoodData Central.\n" +
      "// Diff against lib/micros.ts and copy over the values you trust.\n" +
      'import type { Micronutrients } from "./types";\n\n' +
      "export const MICROS: Record<string, Micronutrients> = {\n" +
      refreshed
        .map(
          (f) =>
            `  ${JSON.stringify(f.id)}: { ${MICRO_KEYS.map(
              (k) => `${k}: ${f.micros[k] ?? 0}`,
            ).join(", ")} },`,
        )
        .join("\n") +
      "\n};\n";
    await writeFile(path.join(dir, "micros.generated.ts"), microsOut, "utf8");

    console.log(`Wrote ${dir}/foods.generated.ts and ${dir}/micros.generated.ts`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
