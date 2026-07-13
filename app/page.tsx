import CalorieCeilingApp from "@/components/CalorieCeilingApp";
import InstallPwa from "@/components/InstallPwa";
import { FOODS } from "@/lib/foods";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-content flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-4xl font-bold text-[var(--text-strong)] sm:text-5xl">
            gains<span className="text-[var(--accent)]">-</span>helper
          </h1>
          <InstallPwa />
        </div>
        <p className="max-w-2xl text-[var(--text-muted)]">
          Set a per-person calorie target for dinner — add a protein target to
          find servings that fit both within ±10%. Each row is one protein, ranked
          by the protein it delivers with a micronutrient-density score alongside.
          Tap any column to re-sort; portion from the serving shown.
        </p>
      </header>

      <CalorieCeilingApp />

      <footer className="mt-auto border-t border-[var(--border)] pt-5 text-xs leading-relaxed text-[var(--text-faint)]">
        <p>
          Macro and micronutrient values from the USDA FoodData Central (FDC)
          database (Foundation Foods and SR Legacy, with a few Branded entries
          where no generic exists). Every food records its{" "}
          <code className="text-[var(--text-muted)]">fdcId</code> and data type so
          each number is traceable. %DV uses FDA adult Daily Values; the density
          score is a capped %DV sum across tracked nutrients at the shown serving.
          Omega-3 (EPA+DHA) has no Daily Value and is a highlight only. Measure to
          the stated basis (raw / cooked / as sold). {FOODS.length} foods.
        </p>
      </footer>
    </main>
  );
}
