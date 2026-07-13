"use client";

import { useMemo, useState } from "react";
import {
  buildResults,
  buildMatches,
  parseCeiling,
  parseProteinTarget,
  DEFAULT_SORT_KEY,
  DEFAULT_SORT_DIR,
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

const INITIAL_CEILING = "500";
const TOL_PCT = Math.round(SEARCH_TOLERANCE * 100);

export default function CalorieCeilingApp() {
  const [rawCeiling, setRawCeiling] = useState(INITIAL_CEILING);
  const [submittedCeiling, setSubmittedCeiling] = useState(INITIAL_CEILING);
  const [proteinTargetRaw, setProteinTargetRaw] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);

  const parsed = useMemo(() => parseCeiling(submittedCeiling), [submittedCeiling]);
  const proteinTarget = parseProteinTarget(proteinTargetRaw);
  const banded = proteinTarget > 0;

  const results = useMemo(() => {
    if (!parsed.ok) return [];
    return banded
      ? buildMatches(FOODS, parsed.value, proteinTarget, SEARCH_TOLERANCE, sortKey, sortDir)
      : buildResults(FOODS, parsed.value, sortKey, sortDir);
  }, [parsed, banded, proteinTarget, sortKey, sortDir]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedCeiling(rawCeiling);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "food" ? "asc" : "desc");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 basis-48 flex-col gap-2">
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
                placeholder="500"
                value={rawCeiling}
                onChange={(e) => setRawCeiling(e.target.value)}
                aria-invalid={!parsed.ok}
                aria-describedby={parsed.ok ? undefined : "calorie-target-error"}
                className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-14 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]"
              >
                cal
              </span>
            </div>
          </div>

          <div className="flex w-32 flex-col gap-2">
            <label
              htmlFor="protein-target"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              Protein target
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
                value={proteinTargetRaw}
                onChange={(e) => setProteinTargetRaw(e.target.value)}
                className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-9 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]"
              >
                g
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
          >
            Show servings
          </button>
        </div>
        {banded ? (
          <p className="text-xs text-[var(--text-faint)]">
            Two-target search: only foods whose serving fits both targets within ±
            {TOL_PCT}% are shown.
          </p>
        ) : (
          <p className="text-xs text-[var(--text-faint)]">
            Add a protein target to search for servings that fit both calories and
            protein within ±{TOL_PCT}%.
          </p>
        )}
      </form>

      {!parsed.ok ? (
        <p
          id="calorie-target-error"
          role="alert"
          className="text-sm text-[var(--danger)]"
        >
          {parsed.error}
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="font-display text-lg text-[var(--text)]">
            Per person{" "}
            {banded ? (
              <>
                near{" "}
                <strong className="text-[var(--text-strong)]">
                  {parsed.value} cal
                </strong>{" "}
                &amp;{" "}
                <strong className="text-[var(--text-strong)]">
                  {proteinTarget} g
                </strong>{" "}
                protein{" "}
                <span className="text-[var(--text-muted)]">(±{TOL_PCT}%)</span>
              </>
            ) : (
              <>
                at{" "}
                <strong className="text-[var(--text-strong)]">
                  {parsed.value} cal
                </strong>
              </>
            )}
            , sorted by {SORT_LABEL[sortKey]}.
            {banded ? (
              <span className="text-[var(--text-muted)]">
                {" "}
                Showing {results.length} of {FOODS.length}.
              </span>
            ) : null}
          </p>
          <Legend />
          {results.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-[var(--text-muted)]">
              No food fits {parsed.value} cal &amp; {proteinTarget} g protein within
              ±{TOL_PCT}%. Widen a target, or clear the protein target to see all
              foods at the calorie target.
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
