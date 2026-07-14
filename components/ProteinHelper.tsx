"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildServings,
  computeServing,
  buyTotalGrams,
  parseProteinTarget,
  parseCalorieCeiling,
  DEFAULT_SORT,
  type Basis,
  type SortKey,
} from "@/lib/compute";
import {
  GRAMS_PER_OUNCE,
  DEFAULT_PROTEIN_TARGET,
  DEFAULT_SHARED_HUSBAND_TARGET,
} from "@/lib/constants";
import { FOODS } from "@/lib/foods";
import ResultsTable, { type DisplayRow } from "./ResultsTable";
import Legend from "./Legend";

// The only persisted state (spec Decision 5): raw/cooked preference, the two
// shared-dinner default targets, and the last sort. No PII, nothing else.
const LS_KEY = "protein-helper.v4";
type Persisted = {
  basis: Basis;
  sort: SortKey;
  meTarget: string;
  husbandTarget: string;
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "density", label: "Nutrient density" },
  { key: "serving", label: "Smallest serving" },
  { key: "fiber", label: "Fiber" },
];

function loadPersisted(): Partial<Persisted> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<Persisted>;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

export default function ProteinHelper() {
  // Main protein anchor = your ("Me") target. Pre-filled to 35 g (spec §Handoff).
  const [proteinRaw, setProteinRaw] = useState(String(DEFAULT_PROTEIN_TARGET));
  const [ceilingRaw, setCeilingRaw] = useState(""); // blank = no filter (item-only)
  const [basis, setBasis] = useState<Basis>("raw");
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [search, setSearch] = useState("");
  const [onlyFits, setOnlyFits] = useState(false);
  const [cookingForTwo, setCookingForTwo] = useState(false);
  const [husbandRaw, setHusbandRaw] = useState(String(DEFAULT_SHARED_HUSBAND_TARGET));
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted prefs after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const p = loadPersisted();
    if (p.basis === "raw" || p.basis === "cooked") setBasis(p.basis);
    if (p.sort === "density" || p.sort === "serving" || p.sort === "fiber") setSort(p.sort);
    if (typeof p.meTarget === "string" && p.meTarget !== "") setProteinRaw(p.meTarget);
    if (typeof p.husbandTarget === "string" && p.husbandTarget !== "")
      setHusbandRaw(p.husbandTarget);
    setHydrated(true);
  }, []);

  // Persist the four allowed values whenever they change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = {
      basis,
      sort,
      meTarget: proteinRaw,
      husbandTarget: husbandRaw,
    };
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      /* storage unavailable (private mode) — the app still works without it */
    }
  }, [hydrated, basis, sort, proteinRaw, husbandRaw]);

  const proteinTarget = parseProteinTarget(proteinRaw);
  const ceiling = parseCalorieCeiling(ceilingRaw);
  const husbandTarget = parseProteinTarget(husbandRaw);

  const rows = useMemo<DisplayRow[]>(() => {
    if (proteinTarget <= 0) return [];
    let results = buildServings(FOODS, {
      proteinTarget,
      calorieCeiling: ceiling,
      basis,
      sort,
    });
    const q = search.trim().toLowerCase();
    if (q) results = results.filter((r) => r.food.name.toLowerCase().includes(q));
    if (onlyFits && ceiling > 0) results = results.filter((r) => !r.overCeiling);

    return results.map((r) => {
      if (!cookingForTwo || husbandTarget <= 0) {
        return { result: r, second: null, buyOunces: null, buyGrams: null };
      }
      const second = computeServing(r.food, husbandTarget, basis);
      const buyGrams = buyTotalGrams(r.food, proteinTarget, husbandTarget);
      return {
        result: r,
        second,
        buyGrams,
        buyOunces: buyGrams / GRAMS_PER_OUNCE,
      };
    });
  }, [proteinTarget, ceiling, basis, sort, search, onlyFits, cookingForTwo, husbandTarget]);

  const meLabel = "Me";
  const husbandLabel = "Husband";

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
        {/* Row 1: the two numeric anchors. */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 basis-40 flex-col gap-2">
            <label htmlFor="protein-target" className="text-sm font-medium text-[var(--text-muted)]">
              Protein target {cookingForTwo ? `(${meLabel})` : ""}
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
                placeholder="35"
                value={proteinRaw}
                onChange={(e) => setProteinRaw(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-9 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]">
                g
              </span>
            </div>
          </div>

          <div className="flex flex-1 basis-40 flex-col gap-2">
            <label htmlFor="calorie-ceiling" className="text-sm font-medium text-[var(--text-muted)]">
              Calorie ceiling <span className="text-[var(--text-faint)]">(optional)</span>
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
                placeholder="none"
                value={ceilingRaw}
                onChange={(e) => setCeilingRaw(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-14 font-display text-3xl text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-dim)]"
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-faint)]">
                cal
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: basis toggle + sort + search. */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Weigh as</span>
            <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-strong)] p-0.5">
              {(["raw", "cooked"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={basis === b}
                  onClick={() => setBasis(b)}
                  className={`rounded-[6px] px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    basis === b
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-[var(--text-muted)]">
              Sort by
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-1 basis-48 flex-col gap-2">
            <label htmlFor="search" className="text-sm font-medium text-[var(--text-muted)]">
              Find a food
            </label>
            <input
              id="search"
              type="search"
              autoComplete="off"
              placeholder="e.g. chicken"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Cooked caveat, right by the toggle it qualifies. */}
        {basis === "cooked" ? (
          <p className="text-xs text-[var(--text-faint)]">
            Cooked figures assume a representative dry-heat method (roasted or grilled).
            Real cooked weight shifts with cooking method and doneness, so treat cooked
            servings as close, not exact. As-sold foods (canned, dairy, eggs, tofu) and
            legumes are unaffected by the toggle.
          </p>
        ) : null}

        {/* Row 3: optional layers — only-what-fits + cooking for two. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={onlyFits}
              disabled={ceiling <= 0}
              onChange={(e) => setOnlyFits(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)] disabled:opacity-40"
            />
            Only show what fits the ceiling
          </label>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={cookingForTwo}
              onChange={(e) => setCookingForTwo(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Cooking for two
          </label>

          {cookingForTwo ? (
            <div className="flex items-center gap-2">
              <label htmlFor="husband-target" className="text-sm text-[var(--text-muted)]">
                {husbandLabel}
              </label>
              <div className="relative">
                <input
                  id="husband-target"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="any"
                  autoComplete="off"
                  placeholder="50"
                  value={husbandRaw}
                  onChange={(e) => setHusbandRaw(e.target.value)}
                  className="w-24 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 pr-7 text-sm text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--accent)]"
                />
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-faint)]">
                  g
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </form>

      {proteinTarget <= 0 ? (
        <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-[var(--text-muted)]">
          Enter a protein target above to see each food&rsquo;s serving.
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="font-display text-lg text-[var(--text)]">
            Serving that delivers{" "}
            <strong className="text-[var(--text-strong)]">{proteinTarget} g</strong>{" "}
            protein, {basis},{" "}
            {ceiling > 0 ? (
              <>
                ceiling <strong className="text-[var(--text-strong)]">{ceiling} cal</strong>,{" "}
              </>
            ) : null}
            sorted by {SORT_OPTIONS.find((o) => o.key === sort)?.label.toLowerCase()}.
            <span className="text-[var(--text-muted)]"> {rows.length} of {FOODS.length}.</span>
          </p>
          <Legend />
          {rows.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-[var(--text-muted)]">
              No food matches{search.trim() ? ` “${search.trim()}”` : ""}
              {onlyFits && ceiling > 0 ? ` under ${ceiling} cal` : ""}. Clear the search
              {onlyFits ? " or the “only what fits” filter" : ""} to see more.
            </p>
          ) : (
            <ResultsTable
              rows={rows}
              cookingForTwo={cookingForTwo && husbandTarget > 0}
              meLabel={meLabel}
              husbandLabel={husbandLabel}
            />
          )}
        </section>
      )}
    </div>
  );
}
