import ProteinHelper from "@/components/ProteinHelper";
import { FOODS } from "@/lib/foods";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-content flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="wordmark">
          protein<span className="dash">-</span>helper
        </h1>
        <p className="max-w-2xl text-[var(--text-muted)]">
          One screen for a shared kitchen. Enter a protein target and each row shows
          the serving that hits it — with the calories it costs, its fiber, and a
          nutrient-density score. Set an optional calorie ceiling to demote over-budget
          picks, switch Raw/Cooked to match how you weigh, or flip “Cooking for two” for
          both portions and a buy-total.
        </p>
      </header>

      <ProteinHelper />

      <footer className="mt-auto border-t border-[var(--border)] pt-5 text-xs leading-relaxed text-[var(--text-faint)]">
        <p>
          Macro and micronutrient values from the USDA FoodData Central (FDC)
          database (Foundation Foods and SR Legacy, with a few Branded entries where
          no generic exists). Every food records its{" "}
          <code className="text-[var(--text-muted)]">fdcId</code> and data type so each
          number is traceable. Cooked figures carry a separate cooked{" "}
          <code className="text-[var(--text-muted)]">fdcId</code> and assume a
          representative dry-heat method. %DV uses FDA adult Daily Values; the density
          score is a capped %DV sum across tracked nutrients at the shown serving.
          Omega-3 (EPA+DHA) has no Daily Value and is a highlight only. Measure to the
          stated basis (raw / cooked / as sold). {FOODS.length} foods.
        </p>
      </footer>
    </main>
  );
}
