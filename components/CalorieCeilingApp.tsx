"use client";

import { useMemo, useState } from "react";
import {
  buildResults,
  buildMatches,
  buildByProtein,
  parseOptionalTarget,
  type SortKey,
  type SortDir,
} from "@/lib/compute";
import { SEARCH_TOLERANCE } from "@/lib/constants";
import { FOODS } from "@/lib/foods";
import ResultsTable from "./ResultsTable";
import Legend from "./Legend";

const SORT_LABEL: Record<SortKey, string> = {
  density: "micronutrient density",
  serving: "serving size",
  protein: "protein delivered",
  fiber: "fiber",
  fat: "fat",
  carbs: "carbs",
  food: "food name",
};

const TOL_PCT = Math.round(SEARCH_TOLERANCE * 100);

type Mode = "none" | "calorie" | "protein" | "both";

export default function CalorieCeilingApp() {
  const [proteinRaw, setProteinRaw] = useState("");
  const [calorieRaw, setCalorieRaw] = useState("500");
  const [sortOverride, setSortOverride] = useState<{
    key: SortKey;
    dir: SortDir;
  } | null>(null);

  const calorie = parseOptionalTarget(calorieRaw);
  const protein = parseOptionalTarget(proteinRaw);
  const mode: Mode =
    calorie > 0 && protein > 0
      ? "both"
      : calorie > 0
        ? "calorie"
        : protein > 0
          ? "protein"
          : "none";

  // Default sort per mode: protein delivered (desc), except protein-only mode where
  // every row hits the target, so micronutrient density is the meaningful order.
  const sortKey: SortKey = sortOverride
    ? sortOverride.key
    : mode === "protein"
      ? "density"
      : "protein";
  const sortDir: SortDir = sortOverride ? sortOverride.dir : "desc";

  const results = useMemo(() => {
    switch (mode) {
      case "both":
        return buildMatches(FOODS, calorie, protein, SEARCH_TOLERANCE, sortKey, sortDir);
      case "calorie":
        return buildResults(FOODS, calorie, sortKey, sortDir);
      case "protein":
        return buildByProtein(FOODS, protein, sortKey, sortDir);
      default:
        return [];
    }
  }, [mode, calorie, protein, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    const dir =
      key === sortKey
        ? sortDir === "asc"
          ? "desc"
          : "asc"
        : key === "food"
          ? "asc"
          : "desc";
    setSortOverride({ key, dir });
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-4">
          {/* Protein target — left */}
          <div className="flex flex-1 basis-40 flex-col gap-2">
            <label
              htmlFor="protein-target"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              Protein target (g)
            </label>
            <div className="relative">
              <input
                id="protein-target"
                name="protein-target"
                type="number"
                inputMode="numeric"
                min={0}
                step="any"
                autoComplete="off"
                placeholder="any"
                value={proteinRaw}
                onChange={(e) => setProteinRaw(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-9 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]"
              >
                g
              </span>
            </div>
          </div>

          {/* Calorie target — right */}
          <div className="flex flex-1 basis-40 flex-col gap-2">
            <label
              htmlFor="calorie-target"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              Calorie target (per person)
            </label>
            <div className="relative">
              <input
                id="calorie-target"
                name="calorie-target"
                type="number"
                inputMode="numeric"
                min={0}
                step="any"
                autoComplete="off"
                placeholder="any"
                value={calorieRaw}
                onChange={(e) => setCalorieRaw(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-14 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]"
              >
                cal
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--text-faint)]">
          {mode === "both"
            ? `Two-target search: only foods whose serving fits both targets within ±${TOL_PCT}% are shown.`
            : mode === "protein"
              ? "Each serving is scaled to deliver the protein target; calories vary. Add a calorie target to match both."
              : mode === "calorie"
                ? `Each serving spends the calorie target; protein varies. Add a protein target to match both within ±${TOL_PCT}%.`
                : "Enter a protein target, a calorie target, or both to search."}
        </p>
      </form>

      {mode === "none" ? (
        <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-[var(--text-muted)]">
          Enter a protein target and/or a calorie target above to see servings.
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="font-display text-lg text-[var(--text)]">
            Per person{" "}
            {mode === "both" ? (
              <>
                near <strong className="text-[var(--text-strong)]">{calorie} cal</strong>{" "}
                &amp; <strong className="text-[var(--text-strong)]">{protein} g</strong>{" "}
                protein <span className="text-[var(--text-muted)]">(±{TOL_PCT}%)</span>
              </>
            ) : mode === "calorie" ? (
              <>
                at <strong className="text-[var(--text-strong)]">{calorie} cal</strong>
              </>
            ) : (
              <>
                delivering{" "}
                <strong className="text-[var(--text-strong)]">{protein} g</strong> protein
              </>
            )}
            , sorted by {SORT_LABEL[sortKey]}.
            {mode === "both" ? (
              <span className="text-[var(--text-muted)]">
                {" "}
                Showing {results.length} of {FOODS.length}.
              </span>
            ) : null}
          </p>
          <Legend />
          {results.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-[var(--text-muted)]">
              No food fits {calorie} cal &amp; {protein} g protein within ±{TOL_PCT}%.
              Widen a target, or clear one to search a single target.
            </p>
          ) : (
            <ResultsTable
              results={results}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </section>
      )}
    </div>
  );
}
