# Cooked values — VERIFY BEFORE TRUSTING

> ⚠️ **These cooked figures are UNVERIFIED in this build environment.** The FDC API
> (and the general internet) is not reachable from where this branch was built — no
> `FDC_API_KEY`, and the egress policy blocks `api.nal.usda.gov`. Per the v4 spec,
> cooked values were **not** derived from a raw→cooked multiplier; they were compiled
> from known USDA FoodData Central "cooked, roasted" / "cooked, dry heat" records
> (SR Legacy, plus one Branded ground-chicken entry). **They must be confirmed
> against the live FDC API before being relied on.** Correct-but-flagged, not
> fabricated.

## How to verify

```bash
FDC_API_KEY=your_key npm run build:data
```

`scripts/build-dataset.ts` now fetches each `fdcIdCooked` below and prints any cooked
protein/calories (and cooked macro) that drifts more than 10% from the committed
value. Zero drift lines = every cooked record confirmed. Get a free key at
<https://fdc.nal.usda.gov/api-key-signup.html>. To write the refreshed values out for
diffing: `FDC_API_KEY=your_key npm run build:data -- --write`.

Any row that drifts, or whose `fdcIdCooked` FDC does not return, should be corrected
in `lib/foods.ts` (and this table) from the FDC record before trusting the cooked
basis for that food.

## The cooked records used (per 100 g)

Minimum required per affected food is **cooked protein + calories**; cooked
fat/carbs/fiber are nice-to-have and included where known. Only raw-stored muscle
meats and fish get cooked fields — as-sold foods (canned tuna, sardines, bacon, ham,
eggs, dairy, tofu) and cooked-stored legumes/grains are unaffected by the toggle.

| Food | raw fdcId | **cooked fdcId** | cooked protein (g) | cooked kcal | cooked method (assumed) |
| --- | --- | --- | --- | --- | --- |
| Chicken breast, skinless | 171077 | 171534 | 31.02 | 165 | roasted, meat only |
| Chicken thigh, skinless | 173627 | 172863 | 26.00 | 209 | roasted, meat only |
| Chicken thigh, skin-on | 172385 | 172852 | 23.55 | 247 | roasted, meat + skin |
| Chicken drumstick, skinless | 173614 | 172861 | 24.24 | 155 | roasted, meat only |
| Chicken wing | 172390 | 172854 | 30.46 | 290 | roasted, meat + skin |
| Ground chicken, 93/7 | 2278952 | 2646174 | 27.10 | 189 | cooked (Branded) |
| Turkey breast, skinless | 174515 | 171496 | 29.55 | 135 | roasted, meat only |
| Ground turkey, 93/7 | 172850 | 172856 | 27.37 | 203 | cooked |
| Duck breast, skinless | 172410 | 172413 | 23.48 | 201 | roasted, meat only |
| Duck leg, skin-on | 172409 | 172412 | 19.00 | 337 | roasted, meat + skin (whole-bird proxy) |
| Pork tenderloin | 168249 | 168251 | 26.17 | 143 | roasted, lean |
| Pork loin chop | 168237 | 168238 | 27.10 | 175 | cooked, lean |
| Pork shoulder | 167843 | 167844 | 24.65 | 269 | roasted, lean |
| Ground pork | 167902 | 167903 | 25.69 | 297 | cooked |
| Ground beef, 90/10 | 174030 | 174034 | 25.80 | 217 | pan-broiled |
| Ground beef, 80/20 | 174036 | 174037 | 25.75 | 254 | pan-broiled |
| Top sirloin, lean | 174055 | 174056 | 29.40 | 194 | broiled, lean |
| Ribeye, lean | 172143 | 172144 | 27.90 | 213 | broiled, lean |
| Flank steak, lean | 174776 | 174777 | 28.50 | 192 | broiled, lean |
| Chuck, lean | 174051 | 174052 | 30.50 | 213 | braised, lean |
| Tenderloin, lean | 171812 | 171813 | 28.20 | 207 | broiled, lean |
| Top round, lean | 171816 | 171817 | 30.90 | 202 | braised, lean |
| Veal, leg (top round) | 174320 | 174321 | 31.90 | 172 | braised, lean |
| Lamb, leg | 172542 | 172543 | 28.18 | 191 | roasted, lean |
| Lamb, shoulder | 172554 | 172555 | 28.60 | 259 | braised, lean |
| Lamb loin chop | 172524 | 172525 | 28.83 | 215 | broiled, lean |
| Ground lamb | 174389 | 174390 | 25.03 | 283 | broiled |
| Goat | 174379 | 174380 | 27.10 | 143 | roasted |
| Wild boar | 174384 | 174385 | 28.29 | 160 | roasted |
| Venison (deer) | 174375 | 174376 | 30.21 | 158 | roasted |
| Bison, lean | 174372 | 174373 | 28.44 | 143 | roasted, lean |
| Salmon, Atlantic (farmed) | 175167 | 175168 | 25.44 | 206 | dry heat |
| Salmon, sockeye (wild) | 173691 | 173692 | 26.48 | 156 | dry heat |
| Tuna, yellowfin | 175159 | 175160 | 29.15 | 139 | dry heat |
| Cod, Atlantic | 171955 | 171956 | 22.83 | 105 | dry heat |
| Tilapia | 175176 | 175177 | 26.15 | 128 | dry heat |
| Shrimp | 15149 | 171992 | 24.00 | 99 | moist heat |
| Halibut | 174200 | 174201 | 26.69 | 140 | dry heat |
| Mackerel, Atlantic | 175119 | 175120 | 23.85 | 262 | dry heat |
| Rainbow trout (farmed) | 173717 | 173718 | 24.27 | 168 | dry heat |
| Scallops | 174220 | 174221 | 20.54 | 111 | cooked |
| Mussels, blue | 174216 | 174217 | 23.80 | 172 | moist heat |
| Crab, blue | 174204 | 174205 | 20.20 | 100 | moist heat |

42 cooked records. Micronutrients and the density score stay on the primary (raw)
basis, so density is basis-approximate under the toggle (per spec).

Note: the lamb, goat, game (boar/venison/bison), veal, and duck-leg records above
were added later and are compiled from USDA SR Legacy game/lamb entries; like the
rest of this table they are UNVERIFIED here and must be confirmed with `build:data`.
The duck-leg record uses the whole-bird "meat and skin" entry as a proxy (USDA has
no discrete leg cut).
