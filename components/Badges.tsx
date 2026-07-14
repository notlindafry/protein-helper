import { formatBasis, formatPct, formatOmega3 } from "@/lib/format";
import type { WeightBasis } from "@/lib/types";
import type { ServingResult } from "@/lib/compute";

// Small flat chips, palette-only. No shadows/gradients (spec §"Design system").
// Meaning is explained by the always-visible legend (components/Legend.tsx), not by
// hover — the primary audience is a phone in the kitchen where tooltips don't fire.

export function BasisBadge({ basis }: { basis: WeightBasis }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--text-faint)]">
      {formatBasis(basis)}
    </span>
  );
}

export function CompleteBadge({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--accent-dim)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--accent)]">
        <span aria-hidden="true">✓</span>
        complete protein
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--text-muted)]">
      incomplete protein
    </span>
  );
}

// Over the calorie ceiling: a muted --danger chip. The row is also dimmed and sorted
// below the fitting rows (spec: demoted, not hidden).
export function OverCeilingFlag() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium leading-none text-[var(--danger)]">
      <span aria-hidden="true">▲</span>
      over ceiling
    </span>
  );
}

// "Rich in" highlights — top "rich in" (≥20% DV) nutrients, plus a non-DV omega-3
// tag for qualifying seafood. Falls back to "good source" nutrients, else "—".
export function RichIn({ result }: { result: ServingResult }) {
  const primary = result.highlights.slice(0, 2);
  const fallback = primary.length === 0 ? result.goodSources.slice(0, 2) : [];

  const hasAny = primary.length > 0 || fallback.length > 0 || result.isOmega3Source;
  if (!hasAny) {
    return <span className="text-[var(--text-faint)]">—</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {primary.map((n) => (
        <span key={n.key} className="text-[13px] leading-none text-[var(--text)]">
          <span className="text-[var(--accent)]">{n.label}</span>{" "}
          <span className="tabular-nums text-[var(--text-muted)]">{formatPct(n.pct)}</span>
        </span>
      ))}
      {fallback.map((n) => (
        <span key={n.key} className="text-[13px] leading-none text-[var(--text-muted)]">
          {n.label} {formatPct(n.pct)}
        </span>
      ))}
      {result.isOmega3Source ? (
        <span
          title="EPA+DHA; omega-3 has no FDA Daily Value"
          className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--accent-dim)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--accent)]"
        >
          omega-3
        </span>
      ) : null}
    </span>
  );
}

// Optional full per-nutrient breakdown behind a row tap (spec §"Nutrient density":
// full detail may live behind a row tap). A native <details> so it works on touch.
export function NutrientDetail({ result }: { result: ServingResult }) {
  const num = (v: number, unit: string) =>
    `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10} ${unit}`;
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[var(--radius-sm)] text-[11px] font-medium leading-none text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)] [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">all nutrients ▸</span>
        <span className="hidden group-open:inline">hide ▾</span>
      </summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {result.nutrients.map((n) => (
          <div key={n.key} className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-[var(--text-muted)]">{n.label}</dt>
            <dd className="tabular-nums text-[11px] text-[var(--text)]">
              {num(n.amount, n.unit)}{" "}
              <span className="text-[var(--text-faint)]">({formatPct(n.pct)})</span>
            </dd>
          </div>
        ))}
        {result.omega3Mg > 0 ? (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-[11px] text-[var(--text-muted)]">omega-3 (EPA+DHA)</dt>
            <dd className="tabular-nums text-[11px] text-[var(--text)]">
              {formatOmega3(result.omega3Mg)}{" "}
              <span className="text-[var(--text-faint)]">(no DV)</span>
            </dd>
          </div>
        ) : null}
      </dl>
    </details>
  );
}

// Touch-friendly data note: a native <details> disclosure (taps open/close, no hover
// needed). Renders nothing when the food has no note.
export function NoteDisclosure({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[var(--radius-sm)] text-[11px] font-medium leading-none text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px]"
        >
          i
        </span>
        <span className="group-open:hidden">note</span>
        <span className="hidden group-open:inline">hide</span>
      </summary>
      <p className="mt-1.5 max-w-sm text-[11px] leading-snug text-[var(--text-muted)]">
        {note}
      </p>
    </details>
  );
}
