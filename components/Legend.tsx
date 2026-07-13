import { BasisBadge, CompleteBadge, LargeServingFlag } from "./Badges";

// Always-visible key for the row annotations. This is the primary explainer
// (touch devices have no hover), so nothing here depends on a tooltip.
export default function Legend() {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-muted)]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5">
          <BasisBadge basis="raw" />
          <BasisBadge basis="cooked" />
          <BasisBadge basis="as_sold" />
        </span>
        <span>whether you weigh the food raw, cooked, or as sold.</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CompleteBadge complete={true} />
        <span>
          has all nine essential amino acids;{" "}
          <span className="text-[var(--text)]">incomplete protein</span> is short
          on one or more.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <LargeServingFlag />
        <span>the amount needed is impractically large.</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1 text-[var(--text-faint)]">
          <span
            aria-hidden="true"
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px]"
          >
            i
          </span>
          note
        </span>
        <span>tap to see a USDA data / sourcing note for that food.</span>
      </div>
    </div>
  );
}
