# protein-helper

A shared household protein tool for two people with opposite constraints (spec v4).
**One screen, no modes.** Enter a **protein target** and every row shows the serving of
that food which hits it — with the **calories** that serving costs, its **fiber**, and a
**nutrient-density** score. Everything else is an optional layer:

- **Calorie ceiling** (optional, item-only): rows whose own calories exceed it are
  dimmed and sorted last, never hidden. Blank = no filter.
- **Raw / Cooked** toggle: you shop and portion in raw weight; your partner plates
  cooked. Meats and fish carry real USDA cooked values; the toggle just picks the field
  set. As-sold foods (canned, dairy, eggs, tofu) and cooked-stored legumes ignore it.
- **Sort**: nutrient density (default), smallest serving, or fiber.
- **Find a food**: type "chicken" and read your number.
- **Cooking for two**: adds your partner's portion column and a raw **buy-total** for
  the shared dinner.

This is a per-meal **reference**, not a food log: no meal builder, no running total, no
history. It is fully client-side over a baked-in USDA dataset — no runtime API, no
backend, no accounts, no secrets.

Live URL: **https://protein-helper.vercel.app**

---

## The two users (this drives the design)

- **You** — dinner selection, calorie-constrained. You choose the leanest, most
  nutrient-dense route to your protein and think in **raw** weight (what you shop for).
  Set a calorie ceiling; sort by density.
- **Your partner** — solo lookup, volume-constrained (bulking, poor appetite). Any
  protein works, so no ceiling. He searches a food or sorts by **smallest serving** and
  reads his **cooked** portion directly.

His number never rules a food out; it only enters when computing his portion — which is
just arithmetic, so it falls out of the same engine.

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

## The engine (one computation)

For a food and a protein target, `computeServing` returns the **serving** that delivers
the target and the **calories** it costs, in the selected basis. Every food can hit any
target (scale the serving), so the list is never filtered by protein — it is ranked and
flagged by what matters: does it fit the calorie ceiling, and how nutrient-dense /
high-fiber is it. `buildServings` maps that over the dataset, sorts by the chosen key,
and demotes over-ceiling rows below the fitting ones. See [`lib/compute.ts`](lib/compute.ts).

## Data & provenance

Nutrition values come from **USDA FoodData Central (FDC)** — Foundation Foods and SR
Legacy where available, with a couple of Branded entries where no generic exists. The
dataset ([`lib/foods.ts`](lib/foods.ts) macros + [`lib/micros.ts`](lib/micros.ts)
micronutrients) is **baked into the app**; the client bundle contains no API key and
makes no nutrition calls. Every food records its source `fdcId` and `fdcDataType`.

v4 is **trimmed to dinner anchors** (~56 foods): Nuts & seeds, Protein powders, and
Broths & liquids are dropped, and Eggs & dairy keeps only the dinner-relevant items
(eggs, cottage cheese, Greek yogurt). Per-food `weightBasis` — measure to the stated
basis:

- **raw** — muscle meats and fish (you weigh raw, then cook)
- **cooked** — legumes and grains (you measure and eat these cooked)
- **as sold** — dairy, eggs, tofu/tempeh, cured meats, canned fish

### Cooked values (real FDC, carried in parallel) — ⚠️ verify before trusting

Meats and fish stored raw carry **parallel cooked fields** (`proteinPer100gCooked`,
`caloriesPer100gCooked`, optional cooked macros, and a cooked `fdcIdCooked`) from real
FDC "cooked, roasted" / "cooked, dry heat" records — **never** a raw→cooked multiplier.
The Raw/Cooked toggle just switches which field set the serving math reads.

The cooked figures were compiled from known FDC records but are **UNVERIFIED in this
build environment** (no `FDC_API_KEY`, and the egress policy blocks the FDC API). They
are listed in [`COOKED_VALUES.md`](COOKED_VALUES.md) and **must be confirmed** with:

```bash
FDC_API_KEY=your_key npm run build:data
```

Cooked figures also assume a representative dry-heat method (roasted / grilled); real
cooked weight shifts with method and doneness — the UI surfaces this caveat by the
toggle.

### Regenerating / verifying values from live FDC

[`scripts/build-dataset.ts`](scripts/build-dataset.ts) re-pulls every committed `fdcId`
**and every cooked `fdcIdCooked`** from the live FDC REST API and reports any drift;
`--write` emits `lib/foods.generated.ts` / `lib/micros.generated.ts` to diff and copy.

```bash
# free key: https://fdc.nal.usda.gov/api-key-signup.html
FDC_API_KEY=your_key npm run build:data            # verify macros + micros + cooked
FDC_API_KEY=your_key npm run build:data -- --write # emit generated files
```

`FDC_API_KEY` is **build-time only** — used solely by this script, never imported by the
app, never shipped. See [`.env.example`](.env.example).

## Nutrient density

**Density** is a capped %DV sum across the tracked nutrients (fiber, iron, potassium,
magnesium, calcium, zinc, vitamin B12, vitamin D, selenium) at the shown serving — each
nutrient counts up to 100% so one very-high nutrient (selenium in fish) can't dominate.
**Rich in** = nutrients at ≥20% DV. **Omega-3** (EPA+DHA) has no FDA Daily Value, so it
is a non-DV seafood highlight against a ~250 mg reference. Micros and the density score
stay on the primary (raw) basis, so density is **basis-approximate** under the toggle.
Full per-nutrient detail is available behind a row tap.

## Persistence

Exactly three things are stored in `localStorage` (no PII): the **raw/cooked
preference**, the **two shared-dinner default targets** (Me / Husband), and the **last
sort** — so each person's device lands on their own basis. Nothing else is persisted.

## Installable app (bare PWA)

A **bare installable manifest + icons** so the app can sit on a phone home screen for
kitchen use — **no service worker and no offline caching** (spec Decision 7). Manifest
at `/manifest.webmanifest` (`app/manifest.ts`); icons in `public/icons/`. Modern
Chrome/Safari allow "Add to Home Screen" from the manifest alone.

## Deploy to Vercel

1. Import the repo into Vercel (Framework preset: **Next.js**). No build config needed.
2. Set the production domain to `protein-helper.vercel.app`.

**No auth.** v4 drops the v2 Vercel Password Protection (spec §Security): this is a
static, two-user reference tool with no login, no accounts, no PII, no database, no
writes, and no secrets, so there is nothing to authorize or rate-limit. The URL is
publicly reachable (a nutrition table); `robots.ts`, a `noindex` meta, and the
`X-Robots-Tag` header keep it out of search indexes.

### Environment variables

| Name | Required? | Where | Purpose |
| --- | --- | --- | --- |
| _(none at runtime)_ | — | — | The app needs **no runtime env vars or secrets**. Data is baked in; no per-request API calls. |
| `FDC_API_KEY` | Optional (local/CI only) | **Not** needed in Vercel | Only for `npm run build:data` to verify values against live FDC. Keep it local or in CI, never in client code. |

## Security

- HTTPS only (Vercel default) + `Strict-Transport-Security`.
- Security headers in [`next.config.mjs`](next.config.mjs): CSP, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- No secrets in client code; input validation with sane bounds on the numeric fields;
  generic client-facing errors.
- No auth, no service worker, no runtime backend — intentional for this app.

## Project structure

```
app/
  globals.css        design tokens (:root palette) + flat base styles
  layout.tsx         fonts (next/font), metadata, themeColor, bare-PWA icons
  page.tsx           page shell + provenance footer
components/
  ProteinHelper.tsx  the one screen: controls, localStorage, builds display rows
  ResultsTable.tsx   serving/calorie/fiber/density table (desktop) / cards (mobile)
  Badges.tsx         basis, complete-protein, rich-in, over-ceiling, nutrient detail
  Legend.tsx         always-visible key (density, rich-in, badges, over-ceiling)
lib/
  types.ts           Food + Micronutrients schema (incl. parallel cooked fields)
  constants.ts       units, defaults/bounds, Daily Values, density cap, thresholds
  compute.ts         basis resolver, serving engine, sort/demotion, buy-total, validation
  format.ts          display rounding (ounces + grams, calories, density)
  foods.ts           baked-in FDC macros/metadata + cooked fields (attaches micros)
  micros.ts          baked-in per-100g micronutrients (keyed by id)
  compute.test.ts    unit tests, incl. the spec acceptance checks
scripts/
  build-dataset.ts   live-FDC verify/regenerate of macros + micros + cooked (build-time)
COOKED_VALUES.md     the flagged cooked records to confirm with build:data
```
