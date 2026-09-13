---
date: 2026-09-13T17:36:33+02:00
researcher: agent
git_commit: d818adbf7e104b43ca7f45f38fddfc81a4c19c6e
branch: main
repository: lanabilan/notes
topic: "Ground rollout Phase 2 (guest access and progress isolation): Risks #2, #4, #6"
tags: [research, codebase, auth, middleware, profile, rls, vitest]
status: complete
last_updated: 2026-09-13
last_updated_by: agent
last_updated_note: "Added follow-up research for integration harness: no app.fetch in standalone Vitest; POST needs APIContext; Container skips middleware"
---

# Research: Ground rollout Phase 2 (guest access and progress isolation): Risks #2, #4, #6

**Date**: 2026-09-13T17:36:33+02:00
**Researcher**: agent
**Git Commit**: d818adbf7e104b43ca7f45f38fddfc81a4c19c6e
**Branch**: main
**Repository**: lanabilan/notes

## Research Question

Ground rollout Phase 2 of `context/foundation/test-plan.md` (“Guest access and progress isolation”).

Risks to verify: **#2** (auth/middleware gates `/` so a guest hits a login wall), **#4** (guest round persisted, or signed-in save updates another user’s profile), **#6** (invalid profile body stored as progress).

Risk response guidance to verify, not blindly accept:

- **#2**: prove unauthenticated `GET /` returns the practice round, not a login redirect, and `/dashboard` stays gated; challenge that a signed-in happy path implies guests can still practice; avoid full browser e2e when a request assertion would catch it.
- **#4**: prove a guest round never writes a profile and a signed-in save cannot retarget another user’s row; challenge that logged-in means ownership is checked, or that empty guest UI means no write happened; avoid mocking the profile service so ownership is never exercised.
- **#6**: prove an invalid set or out-of-range scores are rejected and the stored row is unchanged; challenge that validation exists so we’re safe, or that 200 on a valid body is enough; avoid a happy-path-only body.

Hot-spot directories (likelihood evidence, not anchors): `src/pages/api`, `src/components/auth`, `src`. Stack: Astro 6 SSR, standalone Vitest `node` + `@` alias, no `getViteConfig()`. Test types planned: integration.

## Summary

None of the three risks is speculative. They are live request/session/validation paths. The React island does not re-decide auth or ownership.

| Risk | Where it actually fails | Cheapest useful layer | Guidance verdict |
|------|-------------------------|----------------------|------------------|
| #2 | [`PROTECTED_ROUTES`](src/middleware.ts) in `src/middleware.ts` (`["/dashboard"]` only). `/` is public by **omission**. `src/pages/index.astro` does not check `locals.user`. | **Request** `GET /` (no cookies) vs `GET /dashboard`. Do **not** only assert the array literal. | Confirmed. Signed-in dashboard does not prove `/` stays public. Browser e2e is unnecessary if status + `Location` + body marker are asserted. |
| #4 | Island POST gated by SSR `canPersist`; API UPDATE uses `getUser().id` only; RLS `auth.uid() = id`. Guests **can** hit `POST /api/profile` (not in `PROTECTED_ROUTES`) and must get **401**. | **Request + side-effect**: unauthenticated POST → 401 and no row change; signed-in A + extra `id: B` in body still writes **A**. Do **not** mock `updateProfileProgress`. | Confirmed. Empty guest UI is not a write oracle. |
| #6 | [`profileProgressWriteSchema`](src/pages/api/profile.ts) then UPDATE. Invalid JSON/schema → **400** before the service. Valid auth+body always **200 `{ ok }`** (service failure is `{ ok: false }`, not 400). | **Request** (or handler) with invalid bodies **and** assert UPDATE was not called / row unchanged. A 200 on a valid body is not coverage. | Confirmed. Extra `user_id`/`id` is **stripped**, not 400 — use that as the IDOR case, not as “invalid body.” |

Existing tests: Phase 1 units only (`src/lib/practice/*.test.ts`). **No** auth, middleware, or `/api/profile` tests.

**Runner constraint (from Phase 1, still binding):** keep standalone `vitest.config.ts` (`environment: "node"`, `@` → `./src`). Do **not** switch to Astro `getViteConfig()` — Cloudflare + Tailwind `env.schema` is a known crash surface. `src/lib/supabase.ts` and API routes import `astro:env/server`; a naive `import { POST } from "@/pages/api/profile"` in Vitest will fail unless that virtual module is mocked or the schema is extracted to a pure module.

**§2 backport (optional):** Risk #2 Source cites hot-spot dirs `src/pages/api` and `src/components/auth`. The login wall is **not** there — it is middleware + the absence of a check on `index.astro`. Auth UI is an optional Sign-in **link**, not a gate. Likelihood evidence is misleading, not false. See Open Questions.

## Detailed Findings

### What “unauthenticated” means (session shape)

```
Cookie header → createServerClient (`src/lib/supabase.ts`) → auth.getUser()
  → locals.user: User | null     (`src/middleware.ts`)
  → canPersist = Boolean(user && supabase)   (`PracticeShell.astro`)
  → POST /api/profile uses getUser() again (does not trust locals)
```

`createClient` returns `null` if `SUPABASE_URL` / `SUPABASE_KEY` are missing (`src/lib/supabase.ts:5-8`). Middleware then sets `locals.user = null` (`src/middleware.ts:14-16`). Missing env and missing/invalid cookies are both “unauthenticated” for gating and persist.

The API does **not** read `Astro.locals.user`. It builds its own client and calls `getUser()` (`src/pages/api/profile.ts:23-33`). A cookie-less POST is 401 even if someone later stuffed `locals`.

### Risk #2 — guest `GET /` vs gated `/dashboard`

**The wall:**

```4:24:src/middleware.ts
const PROTECTED_ROUTES = ["/dashboard"];

export const onRequest = defineMiddleware(async (context, next) => {
  // ... getUser → locals.user ...
  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }
  return next();
});
```

Guest exemption: pathname does not `startsWith("/dashboard")`. There is no allowlist for `/`. Adding `"/"` (or `""`) to that array **is** the login-wall bug.

**`/` does not re-check auth.** `src/pages/index.astro` only mounts `PracticeShell`. `PracticeShell` always renders `PracticeRound` with `canPersist={Boolean(user && supabase)}` (`src/components/PracticeShell.astro:8-30`). Guests still get the drill; they get a Sign in **link**, not a redirect (`src/components/PracticeAuthBar.astro:28-35`). The island never `location.href`s to sign-in.

**What a login wall looks like:** `GET /dashboard` without a user → `context.redirect("/auth/signin")` (Astro 302 + `Location: /auth/signin`) **before** `dashboard.astro` runs. The sign-in page title/body is “Sign in” (`src/pages/auth/signin.astro:7-14`).

**HTTP oracle (independent of copying `PROTECTED_ROUTES`):**

| Request | Expect |
|---------|--------|
| `GET /` no Cookie | 200; body includes practice chrome (`ReadTheKey`); **not** a redirect to `/auth/signin` |
| `GET /dashboard` no Cookie | redirect to `/auth/signin` (302 + `Location`); must **not** be 200 dashboard HTML |

Asserting `expect(PROTECTED_ROUTES).toEqual(["/dashboard"])` is an implementation mirror. The product rule is “`/` is public; `/dashboard` is not.”

**Second failure site:** a future `if (!Astro.locals.user) return Astro.redirect(...)` on `index.astro` would wall guests **without** touching the middleware list. A request to `GET /` catches both. A unit test of the array alone does not.

**Challenge “signed-in happy path implies guests can still practice”:** **CORRECT** to reject. Dashboard 200 as a signed-in user never exercises the `!user` branch for `/`.

**Anti-pattern (full e2e):** **CORRECT** to avoid. Hydrating the piano is out of scope (Phase 3 / §7). Status + Location + one HTML marker is enough.

**Existing tests:** none for middleware or pages.

### Risk #4 — guest write and IDOR

**Island save path** (`src/components/practice/PracticeRound.tsx:95-118`): `fetch("/api/profile")` only when `canPersist` and `uiPhase === "summary"`. The hook never fetches. `canPersist` is an SSR boolean, not a client session read (`PracticeShell.astro:10`).

Guests: `canPersist === false` → no island POST. That is **not** sufficient isolation. `POST /api/profile` is **not** in `PROTECTED_ROUTES`; a crafted guest fetch still reaches the handler and must 401 (`profile.ts:23-33`). S-02 planned that on purpose (a redirect would break `fetch`).

**Ownership (app):** schema has only `current_set`, `last_accuracy_percent`, `last_average_response_ms` (`profile.ts:9-13`). No `id` / `user_id`. UPDATE is always `updateProfileProgress(supabase, user.id, patch)` (`profile.ts:53`; `src/lib/services/profile.ts:83-96` `.eq("id", userId)`). Extra JSON keys are stripped by zod object parse.

**Ownership (RLS):** `profiles_update_own` `using` + `with check (auth.uid() = id)` (`supabase/migrations/20260905144500_create_profiles.sql:29-34`). No INSERT/DELETE client policies; INSERT is the `handle_new_user` trigger. Anon has no policies → guests cannot UPDATE even if the API were buggy, **unless** `SUPABASE_KEY` is a service_role key (RLS bypassed). Worth a plan note: tests/ops must use the anon/publishable key.

**IDOR table:**

| Attack | Result |
|--------|--------|
| Body `{ id: B, ...progress }` | Zod strips `id`; UPDATE uses session A |
| Query `?id=B` | Unused |
| No/invalid cookie | 401 |
| Service bug `.eq("id", body.id)` + anon key | RLS still blocks A→B |
| Service-role key | RLS skipped; app `.eq("id", user.id)` is the only gate |

**`updateProfileProgress` returns `error === null` even if 0 rows match** (missing row / RLS filter with no PostgREST error). Valid POST still **200 `{ ok: true }`** in that case. Isolation tests must inspect the **row**, not only `{ ok }`.

**Challenge “logged in ⇒ ownership”:** **CORRECT**. Login is necessary, not sufficient; id comes from `getUser()`, not the body.

**Challenge “guest UI empty ⇒ no write”:** **CORRECT**. Prove with unauthenticated POST → 401 + unchanged `profiles`, not with “mode stayed random.”

**Avoid mocking the service:** **CORRECT**. `vi.mock("@/lib/services/profile")` + `updateProfileProgress.mockResolvedValue(true)` never exercises `.eq("id", userId)` or RLS.

**Cheapest useful layer:** request integration. A fake Supabase client that **records** `.from("profiles").update().eq("id", …)` still exercises the app gate; two real users + Docker Supabase are required only to prove RLS. Prefer at least the app-gate request; do not skip it for a service mock.

**No `localStorage` profile write** in `src/` (PRD FR-007 over archived MVP notes).

### Risk #6 — invalid body vs stored row

**Server schema** (`src/pages/api/profile.ts:9-13`):

- `current_set`: `z.enum(["random", "stepwise"])`
- `last_accuracy_percent`: `z.number().min(0).max(100)` (JSON number; strings fail)
- `last_average_response_ms`: `z.number().int().nonnegative()`

Parse failure → 400 `{ error: "Invalid body" }` (`:42-45`) **before** `updateProfileProgress`. Non-JSON → 400 `{ error: "Invalid body" }` (`:38-40`).

After parse, accuracy is `Math.min(100, Math.max(0, Math.round(...)))` (`:49`). Values outside 0–100 never reach that clamp (zod already rejected). The clamp is not the rejection oracle.

**Client** already `Math.round`s accuracy and ms before POST (`PracticeRound.tsx:114-115`). Client rounding is **not** a security boundary.

**DB CHECK** (`create_profiles.sql:12-18`): `current_set` in `('random','stepwise')` or null; accuracy 0–100 or null. **No CHECK** on `last_average_response_ms` beyond integer column type.

**No GET** on `/api/profile`. Reads are SSR `getProfile` on `/` and `/dashboard`.

**Status contract (S-02, still live):**

| Condition | Status | Body |
|-----------|--------|------|
| No client / no user | 401 | `{ error: "Unauthorized" }` |
| Bad JSON / zod fail | 400 | `{ error: "Invalid body" }` |
| Valid body, update ok or 0-row | 200 | `{ ok: true }` or `{ ok: false }` |

A 200 on a **valid** body does not prove invalid bodies are rejected. `{ ok: false }` is a service miss, not validation.

**Invalid payloads that must 400 and must not UPDATE** (oracle: PRD set enum + Access Control / S-02 “zod failure → 400”, not a copy of the schema source):

| Body / request | Why 400 |
|----------------|---------|
| `{ current_set: "chromatic", last_accuracy_percent: 70, last_average_response_ms: 400 }` | set not in {random, stepwise} |
| `{ ..., last_accuracy_percent: 101 }` | out of range |
| `{ ..., last_accuracy_percent: -1 }` | out of range |
| `{ ..., last_average_response_ms: 1.5 }` | not int |
| `{ ..., last_average_response_ms: -1 }` | negative |
| missing any of the three fields | required |
| `{}` / non-JSON string | parse / schema |
| `last_accuracy_percent: "70"` (string) | not a number |

**Not a 400:** extra `id` / `user_id` with an otherwise valid body → 200, write **session** user. That is Risk #4, not #6.

**Happy-path-only is the named anti-pattern.** Table the cases above. Do not `safeParse` the production schema and expect the same object — extract or duplicate the **product** constraints as the expected table (enum of two set names, accuracy 0–100, non-negative int ms).

### Integration harness (how to test without `getViteConfig`)

Phase 1 locked standalone Vitest. That still holds.

| Approach | Exercises middleware `GET /`? | Exercises API zod + `user.id`? | Exercises RLS? | Risk |
|----------|-------------------------------|--------------------------------|----------------|------|
| `getViteConfig()` + AstroContainer / `app.fetch` | Yes | Yes | Only if real Supabase | **Forbidden** this repo (Cloudflare crash) |
| Import `POST` from `api/profile.ts` in Node | No (skips middleware) | Yes, if `astro:env/server` is mocked | No unless real client | Env virtual module; skips cookie middleware (API re-reads cookies itself — OK for POST) |
| Extract schema / `isProtectedPath` to `src/lib/*` without `astro:*` | Partial (list only) | Schema yes; not “row unchanged” | No | Array extract misses `index.astro` redirect |
| `fetch` against `astro preview` / wrangler | Yes | Yes | If preview has env + DB | Slow; not in CI until Phase 4 |
| Live `npx supabase start` + two users | n/a | Yes | **Yes** | Docker; too heavy if it is the *only* layer |

**Recommendation for `/10x-plan`:**

1. Keep `vitest.config.ts` as-is. Mock or stub `astro:env/server` **only if** handler tests import API routes; do not load `astro.config.mjs`.
2. **#2:** prefer a real HTTP `GET` if a Node-side entry exists without `getViteConfig`. If not, extract `isProtectedPath(pathname)` used by middleware **and** add a request-or-source check that `index.astro` / `PracticeShell` do not redirect unauthenticated users. Do not ship only `toEqual(["/dashboard"])`.
3. **#6:** cheapest is handler/request with a stub `getUser` **and** a recording `updateProfileProgress`/Supabase client — invalid bodies must never call UPDATE. Extracting the zod schema to `src/lib/services/` is allowed if it keeps the handler as the 400 boundary.
4. **#4:** same handler path: no cookie → 401, UPDATE not called; cookie user A + extra `id: B` → UPDATE eq A. Live RLS is **defense-in-depth**, not a substitute for the app gate; park two-user Docker as optional if it blows the phase budget (call that out in the plan, do not silently drop the request cases).
5. Colocate: `src/middleware.test.ts` or `src/pages/api/profile.test.ts` next to the unit under test, same Vitest import style as Phase 1. Fill cookbook §6.2 / §6.4 in the last implement phase.

CI still does not run `npm test` (`.github/workflows/ci.yml` lint + build only). Do not add that job here (test-plan §3 Phase 4).

## Code References

- `src/middleware.ts:4-24` — `PROTECTED_ROUTES`, `locals.user`, dashboard redirect
- `src/pages/index.astro:1-8` — no auth check; always `PracticeShell`
- `src/components/PracticeShell.astro:8-30` — `canPersist`, always mount `PracticeRound`
- `src/components/PracticeAuthBar.astro:7-35` — Sign in link vs dashboard chrome
- `src/pages/dashboard.astro:7-14` — assumes middleware already gated
- `src/pages/auth/signin.astro:7-14` — wall destination
- `src/components/practice/PracticeRound.tsx:95-118` — persist `fetch` gated by `canPersist`
- `src/pages/api/profile.ts:9-54` — zod, 401/400/200, `user.id` UPDATE
- `src/lib/services/profile.ts:73-98` — `.eq("id", userId)`
- `src/lib/supabase.ts:5-23` — cookie SSR client; null if env missing
- `src/types.ts:44-48` — `ProfileProgressWrite` (no id)
- `supabase/migrations/20260905144500_create_profiles.sql:21-34` — RLS own-row only
- `vitest.config.ts:1-10` — standalone Node + `@` alias
- `.github/workflows/ci.yml:24-25` — lint + build, no `npm test`

## Architecture Insights

- Guest practice is the default. Auth is an optional header control. Middleware is a **small denylist**, not an allowlist.
- Persist is SSR-gated (`canPersist`) plus a second server `getUser()` on POST. The island is not trusted.
- Validation, ownership, and RLS are three layers. Tests that only hit one layer leave a named hole (zod without “row unchanged”; app `.eq` without noticing service_role; RLS without noticing body id).
- Silent client: island `.catch(() => undefined)`; API 200 `{ ok }` even when UPDATE matches 0 rows. Status codes 401/400 are the testable contract; 200 is not “progress saved.”

## Historical Context (from prior changes)

- `context/archive/2026-08-25-guest-practice-round/` — `/` public; `PROTECTED_ROUTES` only `/dashboard`; FR-007 session-only.
- `context/archive/2026-09-05-oauth-profile-scaffold/` — “never a wall”; do not add `/` to `PROTECTED_ROUTES`.
- `context/archive/2026-09-05-oauth-profile-progress/` — `canPersist`, zod 400, UPDATE-only, unauthenticated POST 401 not redirect, guests no SELECT/POST from the island.
- `context/archive/2026-09-13-testing-critical-path-coverage/` — standalone Vitest; never `getViteConfig()`; cookbook §6.1 / §6.5; §6.2 / §6.4 still TBD for this phase.

## Related Research

- `context/archive/2026-09-13-testing-critical-path-coverage/research.md` — Phase 1 runner + matching/round (not this phase’s failure paths)
- `context/archive/2026-09-05-oauth-profile-progress/research.md` — original persist/RLS exploration (path may live only under archive)

## Open Questions

1. **Harness for `GET /`:** **Resolved — no.** Standalone Node Vitest cannot run the Astro SSR/`app.fetch` pipeline. `experimental_AstroContainer` does not run middleware; built `dist/server/entry.mjs` needs workerd (`cloudflare:workers`). Cover #2 by extracting `isProtectedPath` used by middleware **plus** a check that `index.astro` / `PracticeShell` do not redirect; optional `astro preview` fetch is a **separate** script, not default `npm test`.
2. **§2 Source for Risk #2:** hot-spot dirs `src/pages/api` and `src/components/auth` are not where the wall lives. Backport the Source cell to mention middleware / public `src/pages` (still no file:line anchors), or defer to `/10x-test-plan --refresh`.
3. **RLS in this phase:** two-user Docker vs recording fake client for `.eq("id", sessionUser)`. Recommend fake client for CI-local `npm test`; document RLS as a manual/optional check unless the plan explicitly adds Supabase in the test run.
4. **`astro:env/server` in Vitest:** whether to mock the module or extract the zod schema so handler tests do not import Astro env.

## Follow-up Research 2026-09-13T17:39:00+02:00

Oracle nits from the Risk #6 trace (do not treat these as 400s):

- **Accuracy is not `.int()`.** `last_accuracy_percent: 66.6` is **valid**; zod passes, then `Math.round` → 67. Only strings / out-of-range fail. Do not copy `.min(0).max(100)` into the test and also reject in-range floats.
- **Set names are case-sensitive.** `"Random"` and S-02’s `"jazz"` are 400s; `"random"` is not.
- **Include one valid write control** in the same suite (known seed row → valid POST → fields change). Invalid-only cases cannot prove “row unchanged” is a real SELECT. Extra `user_id` remains Risk #4 (200 + strip), not Risk #6.

## Follow-up Research 2026-09-13T17:42:00+02:00

HTTP oracle nits from the Risk #2 trace:

- **`PracticeRound` is `client:only="react"`.** Guest `GET /` SSR HTML will **not** contain “Tap the key…”. Assert Astro chrome: `ReadTheKey`, header Sign in → `/auth/signin`, and **absence** of the sign-in card (`action="/api/auth/oauth"`, `action="/api/auth/signin"`).
- **Status-only is not enough.** A future `rewrite` to `/auth/signin` can return **200** with the sign-in body and no `Location`. Require 200 + no sign-in `Location` + practice markers, not 200 alone.
- **Guest fixture:** no `Cookie` header. Invalid cookies take the same `locals.user === null` branch; they need live Auth and add little signal for this risk.

## Follow-up Research 2026-09-13T17:43:00+02:00

Harness lock from the integration-runner trace (closes Open Question 1):

- **No `app.fetch` in standalone Vitest.** `getViteConfig` remains forbidden. `experimental_AstroContainer` does not run middleware. Built Worker entry needs workerd, not Node.
- **`POST` tests take an `APIContext`** (`request` + `cookies`), not a bare `Request`. Mock `astro:env/server` (or extract schema) so `createClient` can load. Handler re-calls `getUser()` — skipping middleware is OK for `/api/profile`.
- **Colocate:** `src/pages/api/profile.test.ts` for #4/#6; `src/lib/auth/protected-routes.test.ts` (or `src/middleware.test.ts`) for the extracted path guard + home-does-not-redirect check. Optional preview HTTP lives in a **separate** script, not default `npm test`.
- **Missing env** (`createClient` → `null`) is a valid unauthenticated fixture without Docker. Handmade cookies do not mint a user.
