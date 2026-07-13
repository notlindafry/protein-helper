import { formatBasis } from "@/lib/format";
import type { WeightBasis } from "@/lib/types";

// Small flat chips, palette-only. No shadows/gradients (spec §9).

export function BasisBadge({ basis }: { basis: WeightBasis }) {
  return (
    <span
      title="Weight basis: whether the serving is measured raw, cooked, or as sold"
      className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--text-faint)]"
    >
      {formatBasis(basis)}
    </span>
  );
}

export function CompleteBadge({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span
        title="Complete protein: provides all nine essential amino acids"
        className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--accent-dim)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--accent)]"
      >
        complete
      </span>
    );
  }
  return (
    <span
      title="Incomplete protein: low in one or more essential amino acids"
      className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium leading-none text-[var(--text-muted)]"
    >
      incomplete
    </span>
  );
}

export function LargeServingFlag() {
  return (
    <span
      title="Large serving: this serving exceeds the practical threshold (spec §10)"
      className="inline-flex items-center gap-1 text-[11px] font-medium leading-none text-[var(--danger)]"
    >
      <span aria-hidden="true">▲</span>
      large serving
    </span>
  );
}
