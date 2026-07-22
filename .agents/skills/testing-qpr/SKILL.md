---
name: testing-qpr
description: Run and test the राजभाषा QPR app (supabase/index.html) and its shared logic. Use when verifying changes to the frontend logic, the shared logic module, or the unit tests.
---

# Testing the QPR app

## Layout
- `supabase/index.html` — the whole app: a single-file React app transpiled in-browser by
  `@babel/standalone`, talking to a live Supabase project (URL + anon key hardcoded near the
  top of the babel `<script>`).
- `supabase/lib/logic.js` — pure, framework-agnostic business logic as a UMD module. In the
  browser it is exposed as `window.QPRLogic`; the babel script destructures from it. In Node
  it is `require()`-able. This is where testable logic (validation, workflow transitions,
  filters, aggregation) lives — keep it the single source of truth (don't re-inline logic
  into index.html).
- `supabase/lib/logic.test.js` — `node --test` unit tests for the module.

## Unit tests
- Run: `npm test` (from repo root) — runs `node --test`, no extra dependencies. Node 18+.
- Add new tests next to the module as `*.test.js`; `node --test` auto-discovers them.

## Runtime / manual testing (no build step)
The app is a static file but uses relative `./lib/logic.js`, so it must be **served**, not
opened via `file://`.
1. `cd supabase && python3 -m http.server 8123`
2. Open `http://localhost:8123/index.html`.
3. Expected without credentials: a brief spinner, then the "राजभाषा पोर्टल" login card.
   - If you get a **blank page** (`#root` empty), the babel script threw — most likely
     `window.QPRLogic` failed to load or a destructured symbol is missing/misspelled. Check
     the console.
   - Benign console noise you can ignore: Tailwind CDN "should not be used in production"
     warning, Babel in-browser transformer warning, and `favicon.ico` 404.

### Quick parity check for the shared module (no login needed)
In the browser console you can exercise the logic directly, e.g.:
```js
JSON.stringify([
  QPRLogic.hindiPct(1,2),                                   // "50%"
  QPRLogic.hindiPct(0,0),                                   // "-"
  QPRLogic.validateReport({b1_s1_total_files:'5',b1_s1_hindi_files:'6'},false).length, // 1
  QPRLogic.workflowActionsFor('AAO','PENDING_AAO').length,  // 2
  QPRLogic.isPart2Filled('Q4',{b2_comp_total:5})            // true
])
// => ["50%","-",1,2,true]
```

## Auth (verified working)
Login uses `supabase.auth.signInWithPassword` against the **live** Supabase project, then
looks up a row in the `profiles` table by user id. To test:
- Valid creds → a session is stored at `localStorage["sb-<projectref>-auth-token"]`; you can
  confirm with `JSON.parse(localStorage.getItem(<that key>)).user.email` in the console.
- Invalid creds → "Invalid login credentials" banner + a 400 on
  `POST /auth/v1/token?grant_type=password`; stays on login screen.
Store any test account as a secret (e.g. `QPR_TEST_EMAIL` / `QPR_TEST_PASSWORD`), never inline.

## KNOWN pre-existing bug: blank page after successful login
As of this writing, a successful login renders a **blank page** with console
`ReferenceError: channel is not defined`. Cause: `useReports()` in `index.html` contains a
duplicated nested `useReports` where `channel` is declared, while the OUTER effect's cleanup
references `channel` (out of scope). This exists on `origin/main` too — it is NOT caused by
the logic-extraction work. Until fixed, the full authenticated workflow
(SECTION → AAO → SAO → HINDI_CELL) cannot be reached through the UI. Likely fix: remove the
dead nested copy and declare `channel` in the outer effect scope. (May already be fixed later.)

## Devin Secrets Needed
- None for unit tests or boot/parity testing.
- For authenticated workflow testing: a Supabase test account — e.g. `QPR_TEST_EMAIL`,
  `QPR_TEST_PASSWORD` (not currently provisioned).
