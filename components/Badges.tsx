import { formatBasis } from "@/lib/format";
import type { WeightBasis } from "@/lib/types";

// Small flat chips, palette-only. No shadows/gradients (spec §9). Meaning is
// explained by the always-visible legend (components/Legend.tsx), not by hover —
// the primary audience is touch/Android where tooltips don't fire.

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

export function LargeServingFlag() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium leading-none text-[var(--danger)]">
      <span aria-hidden="true">▲</span>
      large serving
    </span>
  );
}

// Touch-friendly data note: a native <details> disclosure (taps open/close, no
// hover needed). Renders nothing when the food has no note.
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
