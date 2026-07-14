"use client";

import type { ServingResult } from "@/lib/compute";
import {
  formatCalories,
  formatMacro,
  formatDensity,
  formatServing,
  formatServingOunces,
  formatOunces,
  formatGrams,
} from "@/lib/format";
import {
  BasisBadge,
  CompleteBadge,
  NoteDisclosure,
  NutrientDetail,
  OverCeilingFlag,
  RichIn,
} from "./Badges";

// One display row: the primary serving (target "Me"), plus — when Cooking for two is
// on — his portion and the raw buy-total.
export type DisplayRow = {
  result: ServingResult;
  second: ServingResult | null;
  buyOunces: number | null;
  buyGrams: number | null;
};

function FoodName({ result }: { result: ServingResult }) {
  const { food } = result;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-[var(--text-strong)]">{food.name}</span>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <BasisBadge basis={result.basisTag} />
        <CompleteBadge complete={food.isCompleteProtein} />
        <NoteDisclosure note={food.note} />
      </div>
    </div>
  );
}

function ServingCell({ result }: { result: ServingResult }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-[var(--text-strong)]">
        {formatServing(result)}
      </span>
      {result.overCeiling ? <OverCeilingFlag /> : null}
    </div>
  );
}

export default function ResultsTable({
  rows,
  cookingForTwo,
  meLabel,
  husbandLabel,
}: {
  rows: DisplayRow[];
  cookingForTwo: boolean;
  meLabel: string;
  husbandLabel: string;
}) {
  return (
    <>
      {/* Desktop / tablet: real table. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border-strong)] text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <th scope="col" className="px-3 py-2.5 text-left">Food</th>
              <th scope="col" className="px-3 py-2.5 text-right">
                {cookingForTwo ? `${meLabel} · serving` : "Serving"}
              </th>
              {cookingForTwo ? (
                <>
                  <th scope="col" className="px-3 py-2.5 text-right">{husbandLabel} · serving</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Buy (raw)</th>
                </>
              ) : null}
              <th scope="col" className="px-3 py-2.5 text-right">Calories</th>
              <th scope="col" className="px-3 py-2.5 text-right">Fiber (g)</th>
              <th scope="col" className="px-3 py-2.5 text-right">Density</th>
              <th scope="col" className="px-3 py-2.5 text-left">Rich in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ result: r, second, buyOunces, buyGrams }) => (
              <tr
                key={r.food.id}
                className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)] ${
                  r.overCeiling ? "opacity-55" : ""
                }`}
              >
                <td className="px-3 py-3 align-top">
                  <FoodName result={r} />
                  <div className="mt-1.5">
                    <NutrientDetail result={r} />
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <ServingCell result={r} />
                </td>
                {cookingForTwo ? (
                  <>
                    <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text)]">
                      {second ? formatServing(second) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text-strong)]">
                      {buyOunces !== null && buyGrams !== null ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{formatOunces(buyOunces)}</span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {formatGrams(buyGrams)} g
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </>
                ) : null}
                <td className="px-3 py-3 text-right align-top tabular-nums text-[var(--text)]">
                  {formatCalories(r.calories)}
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
        {rows.map(({ result: r, second, buyOunces, buyGrams }) => (
          <li
            key={r.food.id}
            className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 ${
              r.overCeiling ? "opacity-60" : ""
            }`}
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
                <dt className="text-xs text-[var(--text-muted)]">
                  {cookingForTwo ? meLabel : "Serving"}
                </dt>
                <dd className="text-right">
                  <ServingCell result={r} />
                </dd>
              </div>
              {cookingForTwo ? (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-xs text-[var(--text-muted)]">{husbandLabel}</dt>
                    <dd className="text-right tabular-nums text-[var(--text)]">
                      {second ? formatServingOunces(second) : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2 flex items-baseline justify-between gap-2">
                    <dt className="text-xs text-[var(--text-muted)]">Buy total (raw)</dt>
                    <dd className="text-right tabular-nums text-[var(--text-strong)]">
                      {buyOunces !== null && buyGrams !== null
                        ? `${formatOunces(buyOunces)} (${formatGrams(buyGrams)} g)`
                        : "—"}
                    </dd>
                  </div>
                </>
              ) : null}
              <Metric label="Calories" value={formatCalories(r.calories)} />
              <Metric label="Fiber" value={`${formatMacro(r.fiber)} g`} />
            </dl>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-xs text-[var(--text-muted)]">Rich in</span>
              <RichIn result={r} />
            </div>
            <div className="mt-2">
              <NutrientDetail result={r} />
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
