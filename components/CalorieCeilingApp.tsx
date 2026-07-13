"use client";

import { useMemo, useState } from "react";
import {
  buildResults,
  parseCeiling,
  parsePeople,
  DEFAULT_SORT_KEY,
  DEFAULT_SORT_DIR,
  type SortKey,
  type SortDir,
} from "@/lib/compute";
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

export default function CalorieCeilingApp() {
  const [rawCeiling, setRawCeiling] = useState(INITIAL_CEILING);
  const [submittedCeiling, setSubmittedCeiling] = useState(INITIAL_CEILING);
  const [peopleRaw, setPeopleRaw] = useState("1");
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);

  const parsed = useMemo(() => parseCeiling(submittedCeiling), [submittedCeiling]);
  const people = parsePeople(peopleRaw);

  const results = useMemo(
    () => (parsed.ok ? buildResults(FOODS, parsed.value, sortKey, sortDir) : []),
    [parsed, sortKey, sortDir],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedCeiling(rawCeiling);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Density/serving/protein/macros read best high→low first; name low→high.
      setSortDir(key === "food" ? "asc" : "desc");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 basis-48 flex-col gap-2">
            <label
              htmlFor="calorie-ceiling"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              Calorie ceiling (per person)
            </label>
            <div className="relative">
              <input
                id="calorie-ceiling"
                name="calorie-ceiling"
                type="number"
                inputMode="numeric"
                min={0}
                step="any"
                autoComplete="off"
                placeholder="500"
                value={rawCeiling}
                onChange={(e) => setRawCeiling(e.target.value)}
                aria-invalid={!parsed.ok}
                aria-describedby={parsed.ok ? undefined : "calorie-ceiling-error"}
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

          <div className="flex w-28 flex-col gap-2">
            <label
              htmlFor="people"
              className="text-sm font-medium text-[var(--text-muted)]"
            >
              People
            </label>
            <input
              id="people"
              name="people"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              autoComplete="off"
              value={peopleRaw}
              onChange={(e) => setPeopleRaw(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            className="rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]"
          >
            Show servings
          </button>
        </div>
      </form>

      {!parsed.ok ? (
        <p
          id="calorie-ceiling-error"
          role="alert"
          className="text-sm text-[var(--danger)]"
        >
          {parsed.error}
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="font-display text-lg text-[var(--text)]">
            Per person at{" "}
            <strong className="text-[var(--text-strong)]">{parsed.value} cal</strong>
            {people > 1 ? (
              <>
                {" "}
                <span className="text-[var(--text-muted)]">(×{people} people)</span>
              </>
            ) : null}
            , sorted by {SORT_LABEL[sortKey]}.
          </p>
          <Legend />
          <ResultsTable
            results={results}
            people={people}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </section>
      )}
    </div>
  );
}
