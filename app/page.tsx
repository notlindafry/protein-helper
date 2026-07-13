import ProteinTargetApp from "@/components/ProteinTargetApp";
import { FOODS } from "@/lib/foods";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-content flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold text-[var(--text-strong)] sm:text-5xl">
          Protein Target
        </h1>
        <p className="max-w-2xl text-[var(--text-muted)]">
          Enter a protein goal. Each row is one food scaled to the serving that
          hits that goal on its own — so every row carries the same protein, and
          the difference is how much food it takes and what else the serving
          costs.
        </p>
      </header>

      <ProteinTargetApp />

      <footer className="mt-auto border-t border-[var(--border)] pt-5 text-xs leading-relaxed text-[var(--text-faint)]">
        <p>
          Nutrition values from the USDA FoodData Central (FDC) database
          (Foundation Foods and SR Legacy, with a few Branded entries where no
          generic exists). Every food records its {" "}
          <code className="text-[var(--text-muted)]">fdcId</code> and data type
          so each number is traceable. Values are per the referenced FDC entry
          and rounded for display; measure to the stated basis (raw / cooked / as
          sold). {FOODS.length} foods.
        </p>
      </footer>
    </main>
  );
}
