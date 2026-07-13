"use client";

import type { ServingResult, SortKey, SortDir } from "@/lib/compute";
import {
  formatGrams,
  formatMacro,
  formatDensity,
  formatServingSecondary,
} from "@/lib/format";
import {
  BasisBadge,
  CompleteBadge,
  NoteDisclosure,
  ProteinFloorFlag,
  LargePortionNote,
  RichIn,
} from "./Badges";

type Column = {
  key: SortKey | null; // null = not sortable
  label: string;
  align: "left" | "right";
};

const COLUMNS: Column[] = [
  { key: "food", label: "Food", align: "left" },
  { key: "serving", label: "Serving", align: "right" },
  { key: "protein", label: "Protein (g)", align: "right" },
  { key: "fat", label: "Fat (g)", align: "right" },
  { key: "carbs", label: "Carbs (g)", align: "right" },
  { key: "fiber", label: "Fiber (g)", align: "right" },
  { key: "density", label: "Density", align: "right" },
  { key: null, label: "Rich in", align: "left" },
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
      <span className="font-medium text-[var(--text-strong)]">{food.name}</span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <BasisBadge basis={food.weightBasis} />
        <CompleteBadge complete={food.isCompleteProtein} />
        <NoteDisclosure note={food.note} />
      </div>
    </div>
  );
}

function ServingCell({ result, people }: { result: ServingResult; people: number }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-[var(--text)]">
        {formatGrams(result.servingGrams)} g
      </span>
      <span className="text-xs tabular-nums text-[var(--text-muted)]">
        {formatServingSecondary(result)}
      </span>
      {people > 1 ? (
        <span className="text-xs tabular-nums text-[var(--text-faint)]">
          ×{people} = {formatGrams(result.servingGrams * people)} g
        </span>
      ) : null}
      {result.isLargePortion ? <LargePortionNote /> : null}
    </div>
  );
}

function ProteinCell({ result }: { result: ServingResult }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-[var(--text-strong)]">
        {formatMacro(result.proteinDelivered)}
      </span>
      {result.belowProteinFloor ? <ProteinFloorFlag /> : null}
    </div>
  );
}

export default function ResultsTable({
  results,
  people,
  sortKey,
  sortDir,
  onSort,
}: {
  results: ServingResult[];
  people: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <>
      {/* Desktop / tablet: real table. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-strong)]">
              {COLUMNS.map((col) => {
                const active = col.key !== null && sortKey === col.key;
                const base = `px-3 py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                  col.align === "right" ? "text-right" : "text-left"
                }`;
                return (
                  <th
                    key={col.label}
                    scope="col"
                    aria-sort={
                      active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
                    }
                    className={base}
                  >
                    {col.key === null ? (
                      <span>{col.label}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSort(col.key as SortKey)}
                        className={`inline-flex items-center rounded-[var(--radius-sm)] px-1 py-0.5 transition-colors hover:text-[var(--text-strong)] ${
                          active ? "text-[var(--text-strong)]" : ""
                        } ${col.align === "right" ? "flex-row-reverse" : ""}`}
                      >
                        <span>{col.label}</span>
                        <SortArrow active={active} dir={sortDir} />
                      </button>
                    )}
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
                <td className="px-3 py-3 align-top">
                  <ServingCell result={r} people={people} />
                </td>
                <td className="px-3 py-3 align-top">
                  <ProteinCell result={r} />
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
                <td className="px-3 py-3 text-right align-top tabular-nums font-medium text-[var(--accent)]">
                  {formatDensity(r.densityScore)}
                </td>
                <td className="max-w-[16rem] px-3 py-3 align-top">
                  <RichIn result={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / narrow: stacked cards. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {results.map((r) => (
          <li
            key={r.food.id}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <FoodName result={r} />
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  density
                </span>
                <span className="tabular-nums text-lg font-medium text-[var(--accent)]">
                  {formatDensity(r.densityScore)}
                </span>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-[var(--text-muted)]">Serving</dt>
                <dd className="text-right">
                  <ServingCell result={r} people={people} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-[var(--text-muted)]">Protein</dt>
                <dd className="text-right">
                  <ProteinCell result={r} />
                </dd>
              </div>
              <Metric label="Fat" value={`${formatMacro(r.fat)} g`} />
              <Metric label="Carbs" value={`${formatMacro(r.carbs)} g`} />
              <Metric label="Fiber" value={`${formatMacro(r.fiber)} g`} />
            </dl>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-xs text-[var(--text-muted)]">Rich in</span>
              <RichIn result={r} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="tabular-nums text-[var(--text)]">{value}</dd>
    </div>
  );
}
