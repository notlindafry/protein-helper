# Protein Target

Single-food protein-target tool. Enter a protein goal in grams and every row is **one
protein source scaled to the serving that hits that goal on its own** — so each row
carries the same protein (= your target) and the differentiator is how much food it
takes and what else that serving costs (calories, fat, carbs, fiber).

This is **not** a meal builder: no running total, no stacking of foods (spec §11).

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

## Decisions taken (spec §14 open items)

1. **Auth:** Option A — Vercel Password Protection.
2. **Sort:** calories ascending, then carbs ascending; column headers re-sort.
3. **Weight basis:** per-category (raw meat/fish, cooked legumes/grains, as-sold
   dairy/eggs/tofu/powder), shown as a small basis label on each row.

## Project structure

```
app/
  globals.css        design tokens (:root palette, spec §9) + flat base styles
  layout.tsx         fonts (next/font), metadata, themeColor
  page.tsx           page shell + provenance footer
components/
  ProteinTargetApp.tsx  input + validation + summary + sort state (client)
  ResultsTable.tsx      sortable table (desktop) / cards (mobile)
  Badges.tsx            basis label, complete-protein badge, large-serving flag
lib/
  types.ts           Food schema (spec §3)
  constants.ts       unit constants + impractical-serving thresholds
  compute.ts         scaling, units, sort, validation (spec §6/§8/§10)
  format.ts          display rounding
  foods.ts           the baked-in FDC dataset
  compute.test.ts    unit tests
scripts/
  build-dataset.ts   live-FDC verify/regenerate (build-time only)
```
