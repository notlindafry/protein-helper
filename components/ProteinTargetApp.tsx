"use client";

import { useMemo, useState } from "react";
import {
  buildResults,
  parseTarget,
  DEFAULT_SORT_KEY,
  DEFAULT_SORT_DIR,
  type SortKey,
  type SortDir,
} from "@/lib/compute";
import { FOODS } from "@/lib/foods";
import ResultsTable from "./ResultsTable";

const SORT_LABEL: Record<SortKey, string> = {
  food: "food name",
  grams: "serving size",
  serving: "serving size",
  calories: "calories",
  fat: "fat",
  carbs: "carbs",
  fiber: "fiber",
};

const INITIAL_TARGET = "40";

export default function ProteinTargetApp() {
  const [rawInput, setRawInput] = useState(INITIAL_TARGET);
  const [submittedRaw, setSubmittedRaw] = useState(INITIAL_TARGET);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);

  const parsed = useMemo(() => parseTarget(submittedRaw), [submittedRaw]);

  const results = useMemo(
    () => (parsed.ok ? buildResults(FOODS, parsed.value, sortKey, sortDir) : []),
    [parsed, sortKey, sortDir],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedRaw(rawInput);
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label
          htmlFor="protein-goal"
          className="text-sm font-medium text-[var(--text-muted)]"
        >
          Protein goal
        </label>
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="relative flex-1 basis-48">
            <input
              id="protein-goal"
              name="protein-goal"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoComplete="off"
              placeholder="40"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              aria-invalid={!parsed.ok}
              aria-describedby={parsed.ok ? undefined : "protein-goal-error"}
              className="w-full rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-10 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]"
            >
              g
            </span>
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
          id="protein-goal-error"
          role="alert"
          className="text-sm text-[var(--danger)]"
        >
          {parsed.error}
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="font-display text-lg text-[var(--text)]">
            Servings to reach{" "}
            <strong className="text-[var(--text-strong)]">
              {parsed.value} g
            </strong>{" "}
            protein, sorted by {SORT_LABEL[sortKey]}.
          </p>
          <ResultsTable
            results={results}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </section>
      )}
    </div>
  );
}
