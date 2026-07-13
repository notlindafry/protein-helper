# gains-helper

Dinner portion-and-nutrient reference (revision v2). Set a **per-person calorie
ceiling** (e.g. `500`) and every row is **one protein scaled to the serving that spends
that ceiling** — showing the protein it delivers, its macros, and its micronutrient
value, **sorted by micronutrient density**. Results are intentionally static; variety
comes from choosing different rows, then portioning down from the serving shown.

This is **not** a meal builder: no running total, no stacking, no persistence — still
stateless and fully client-side over baked-in data (no runtime API, no tokens).

Live URL: **https://protein-helper.vercel.app**

---

## Tech stack

- **Next.js 14 (App Router) + TypeScript**, deployed on Vercel.
- **Tailwind CSS**, colours referenced as arbitrary values against the `:root` design
  tokens in `app/globals.css` (`bg-[var(--surface)]`, `text-[var(--text)]`, …).
- **Fonts** via `next/font/google` (Space Grotesk display, Inter body), self-hosted at
  build — no external font request ships.
- Core logic is **client-side over a static, baked-in dataset**. No runtime nutrition
  API, no backend.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # unit tests for the compute/units/sort logic (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # production build (what Vercel runs)
```

## Data & provenance (spec §2)

Nutrition values come from **USDA FoodData Central (FDC)** — Foundation Foods and SR
Legacy where available, with a few Branded entries only where no generic exists
(protein powders, bone broth). The dataset lives in [`lib/foods.ts`](lib/foods.ts) and
is **baked into the app**; the client bundle contains no API key and makes no nutrition
calls.

Every food records its source `fdcId` and `fdcDataType` so each number is traceable.
Per-category `weightBasis` (spec §5) is a correctness field — measure to the stated
basis:

- **raw** — muscle meats and fish (you weigh raw, then cook)
- **cooked** — legumes and grains (you measure and eat these cooked)
- **as sold** — dairy, eggs, tofu/tempeh, powders, cured meats, canned fish

### Regenerating / verifying values from live FDC

[`scripts/build-dataset.ts`](scripts/build-dataset.ts) re-pulls the exact `fdcId`s in
the committed dataset from the live FDC REST API and reports any drift; `--write` emits
`lib/foods.generated.ts` for you to diff and copy over.

```bash
# free key: https://fdc.nal.usda.gov/api-key-signup.html
FDC_API_KEY=your_key npm run build:data            # verify against live FDC
FDC_API_KEY=your_key npm run build:data -- --write # emit lib/foods.generated.ts
```

`FDC_API_KEY` is **build-time only** — used solely by this script, never imported by the
app, never shipped. See [`.env.example`](.env.example).

## Installable app (PWA)

The app is an installable Progressive Web App, tuned for Android (primary audience):

- **Web app manifest** at `/manifest.webmanifest` (`app/manifest.ts`): standalone
  display, `#0f120d` theme/splash, and icons at 192/512 with both `any` and
  **`maskable`** purposes — the flexed-arm artwork stays inside the safe zone, so
  Android adaptive (circle/squircle) masks don't clip it.
- **Icons** live in `public/icons/` (`icon-192.png`, `icon-512.png`,
  `apple-touch-icon.png`, scalable `icon.svg`); favicon + apple-touch links are set
  in `app/layout.tsx`.
- **Service worker** (`public/sw.js`, registered by `components/InstallPwa.tsx`):
  a fetch handler (required for Chrome/Android installability) plus network-first
  navigation and stale-while-revalidate asset caching for basic offline use.
- **Install button** — `components/InstallPwa.tsx` captures `beforeinstallprompt`
  and shows an "Install app" button in the header on eligible devices; it hides
  once installed. Android users can also install from the browser's ⋮ menu → *Add
  to Home screen*.

Note: with Vercel Password Protection on, the manifest/icons are fetched with
credentials (the manifest link is `crossorigin="use-credentials"`), so install
works for the authenticated user.

## Deploy to Vercel

1. Import the repo into Vercel (Framework preset: **Next.js**). No build config needed.
2. Set the production domain to `protein-helper.vercel.app`.
3. **Auth — Vercel Password Protection** (spec §12, Option A, chosen): in the Vercel
   project → **Settings → Deployment Protection → Password Protection**, enable it and
   set a single password. This is a platform-level control (Vercel **Pro** plan); it
   requires **no code and no environment variables in the project**.

### Secrets / environment variables in Vercel

| Name | Required? | Where | Purpose |
| --- | --- | --- | --- |
| _(none)_ | — | — | The app needs **no runtime env vars or secrets**. Data is baked in; there are no per-request API calls or LLM tokens. |
| Vercel Password Protection password | Optional (auth) | Vercel dashboard setting, **not** a project env var | Single shared password gating the deployment (Option A). Managed in Settings → Deployment Protection. |
| `FDC_API_KEY` | Optional (local/CI only) | **Not** needed in Vercel | Only for running `npm run build:data` to refresh values from live FDC. Keep it local or in CI, never in client code. |

> Auth was scoped as **access control**, not cost/rate-limit protection — with static
> data there are no LLM tokens and no runtime API calls per search. Option A keeps
> credential handling off the codebase entirely. If you ever need host portability,
> spec §12 Option B (in-app shared-password gate) would add `SITE_PASSWORD` +
> `AUTH_SECRET` env vars and Next middleware — deliberately not built.

## Security (spec §13)

- HTTPS only (Vercel default) + `Strict-Transport-Security`.
- Security headers in [`next.config.mjs`](next.config.mjs): CSP, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- No secrets in client code; input validation on the target field; generic client-facing
  errors.
- `# SECURITY TODO`s mark deliberately-scoped-out controls (nonce-based CSP; in-app auth
  is handled at the platform edge instead).

## Micronutrients & density (revision §B/§C)

- Each food carries a per-100g `micros` block (`lib/micros.ts`): iron, potassium,
  magnesium, calcium, zinc, vitamin B12, vitamin D, selenium, and omega-3 (EPA+DHA,
  seafood). Fiber stays on `Food.fiberPer100g` (single source of truth).
- **%DV** uses FDA adult Daily Values (`lib/constants.ts`, verified against the FDA
  Nutrition Facts reference). **Density** is a capped %DV sum across the tracked
  nutrients at the shown serving — each nutrient counts up to 100% so none dominates.
- **Rich in** = nutrients at ≥20% DV in that serving (FDA "high in"). **Omega-3 has no
  Daily Value** — it's a non-DV seafood highlight against a ~250 mg reference.
- **Below-dinner-protein** flag (`--danger`) marks servings under 30 g protein;
  **large-portion** is a neutral note for very low-calorie foods (big servings are the
  point at a calorie ceiling).

> Micronutrient values were resolved from USDA FDC reference data (the environment
> blocks the live FDC API); each stays tied to the food's `fdcId`. Refresh/verify them
> authoritatively with `npm run build:data` — the script now pulls the 9 micros too.

## Decisions taken (spec §14 + revision §F)

1. **Auth:** Option A — Vercel Password Protection.
2. **Anchor:** calorie-first — the ceiling is the anchor and the serving is "max at
   ceiling" (revision §A). **Default sort: protein delivered, descending** — protein is
   the primary consideration; the micronutrient density score is secondary (it breaks
   ties and is one click away as its own column). Headers re-sort.
3. **Weight basis:** per-category (raw meat/fish, cooked legumes/grains, as-sold
   dairy/eggs/tofu/powder), shown as a small basis label on each row.
4. **Protein:** a **Min-protein filter** shows only servings that deliver at least the
   entered grams at the ceiling (e.g. 500-cal servings with ≥ 40 g protein); blank = off.
   The fixed 30 g `DINNER_PROTEIN_FLOOR` flag still marks low-protein rows when no
   minimum is set.
5. **People field:** included — optional count (default 1) shows a `×people` total
   alongside the per-person serving.

## Project structure

```
app/
  globals.css        design tokens (:root palette, spec §9) + flat base styles
  layout.tsx         fonts (next/font), metadata, themeColor
  page.tsx           page shell + provenance footer
components/
  CalorieCeilingApp.tsx ceiling + people input, validation, summary, sort state
  ResultsTable.tsx      density-sorted table (desktop) / cards (mobile)
  Badges.tsx            basis, complete-protein, rich-in, protein-floor, large-portion
  Legend.tsx            always-visible key (density, rich-in, badges)
  InstallPwa.tsx        service-worker registration + Android install button
lib/
  types.ts           Food + Micronutrients schema (spec §3, revision §B1)
  constants.ts       units, Daily Values, density cap, thresholds, tracked nutrients
  compute.ts         ceiling serving, density score, highlights, sort, validation
  format.ts          display rounding
  foods.ts           baked-in FDC macros/metadata (attaches micros by id)
  micros.ts          baked-in per-100g micronutrients (keyed by id)
  compute.test.ts    unit tests
scripts/
  build-dataset.ts   live-FDC verify/regenerate of macros + micros (build-time only)
```
