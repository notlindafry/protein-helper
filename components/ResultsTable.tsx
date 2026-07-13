"use client";

import type { ServingResult, SortKey, SortDir } from "@/lib/compute";
import {
  formatGrams,
  formatCalories,
  formatMacro,
  formatServingSecondary,
} from "@/lib/format";
import { BasisBadge, CompleteBadge, LargeServingFlag } from "./Badges";

type Column = {
  key: SortKey;
  label: string;
  align: "left" | "right";
};

const COLUMNS: Column[] = [
  { key: "food", label: "Food", align: "left" },
  { key: "grams", label: "Serving (g)", align: "right" },
  { key: "serving", label: "Serving (oz / fl oz)", align: "right" },
  { key: "calories", label: "Calories", align: "right" },
  { key: "fat", label: "Fat (g)", align: "right" },
  { key: "carbs", label: "Carbs (g)", align: "right" },
  { key: "fiber", label: "Fiber (g)", align: "right" },
];

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return null;
  return (
    <span aria-hidden="true" className="ml-1 text-[var(--accent)]">
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function FoodName({ result }: { result: ServingResult }) {
  const { food } = result;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="font-medium text-[var(--text-strong)]">{food.name}</span>
        {food.note ? (
          <span
            title={food.note}
            aria-label={food.note}
            className="cursor-help text-[var(--text-faint)]"
          >
            &#9432;
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <BasisBadge basis={food.weightBasis} />
        <CompleteBadge complete={food.isCompleteProtein} />
        {result.isImpractical ? <LargeServingFlag /> : null}
      </div>
    </div>
  );
}

export default function ResultsTable({
  results,
  sortKey,
  sortDir,
  onSort,
}: {
  results: ServingResult[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <>
      {/* Desktop / tablet: real table. Scrolls horizontally only if truly needed. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-strong)]">
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`px-3 py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`inline-flex items-center rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors hover:text-[var(--text-strong)] ${
                        active ? "text-[var(--text-strong)]" : ""
                      } ${col.align === "right" ? "flex-row-reverse" : ""}`}
                    >
                      <span>{col.label}</span>
                      <SortArrow active={active} dir={sortDir} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.food.id}
                className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <td className="px-3 py-3 align-top">
                  <FoodName result={r} />
                </td>
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text)]">
                  {formatGrams(r.requiredGrams)}
                </td>
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text-muted)]">
                  {formatServingSecondary(r)}
                </td>
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text-strong)]">
                  {formatCalories(r.calories)}
                </td>
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text)]">
                  {formatMacro(r.fat)}
                </td>
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text)]">
                  {formatMacro(r.carbs)}
                </td>
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text)]">
                  {formatMacro(r.fiber)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, same data, no horizontal scrolling. */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {results.map((r) => (
          <li
            key={r.food.id}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <FoodName result={r} />
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Metric label="Serving" value={`${formatGrams(r.requiredGrams)} g`} />
              <Metric label="≈" value={formatServingSecondary(r)} />
              <Metric
                label="Calories"
                value={formatCalories(r.calories)}
                strong
              />
              <Metric label="Fat" value={`${formatMacro(r.fat)} g`} />
              <Metric label="Carbs" value={`${formatMacro(r.carbs)} g`} />
              <Metric label="Fiber" value={`${formatMacro(r.fiber)} g`} />
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd
        className={`tabular-nums ${
          strong ? "text-[var(--text-strong)]" : "text-[var(--text)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
