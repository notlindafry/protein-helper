import { BasisBadge, CompleteBadge } from "./Badges";

// Always-visible key for the row annotations and the density score. This is the
// primary explainer (a phone in the kitchen has no hover), so nothing here relies on
// a tooltip.
export default function Legend() {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-muted)]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-[var(--text)]">Density</span>
        <span>
          = capped %DV summed across fiber, iron, potassium, magnesium, calcium,
          zinc, vitamin B12, vitamin D, and selenium at the serving shown (each
          nutrient counts up to 100%). Higher = more micronutrients on that plate.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-[var(--text)]">Rich in</span>
        <span>
          nutrients at ≥20% of the FDA Daily Value in that serving.{" "}
          <span className="text-[var(--accent)]">omega-3</span> (EPA+DHA) has no
          Daily Value, so it is a seafood highlight only.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5">
          <BasisBadge basis="raw" />
          <BasisBadge basis="cooked" />
          <BasisBadge basis="as_sold" />
        </span>
        <span>whether you weigh the food raw, cooked, or as sold.</span>
        <CompleteBadge complete={true} />
        <span>has all nine essential amino acids.</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-[var(--danger)]">▲ over ceiling</span>
        <span>
          this food&rsquo;s own calories at the target exceed the calorie ceiling;
          the row is dimmed and sorted last, not hidden.
        </span>
      </div>
    </div>
  );
}
