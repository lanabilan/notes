# Guest access and progress isolation Implementation Plan

## Overview

Add standalone-Vitest tests that prove three product contracts: a guest `GET /` is not a login wall and `/dashboard` stays gated (Risk #2); `POST /api/profile` does not write without a session and cannot retarget another user (Risk #4); invalid progress bodies are 400 and do not UPDATE (Risk #6). Last phase fills `context/foundation/test-plan.md` §6.2 and §6.4 with the patterns that actually shipped.

## Current State Analysis

Phase 1 left a Node Vitest runner and practice-lib units. There are **no** auth, middleware, or `/api/profile` tests. The login wall is a middleware denylist (`PROTECTED_ROUTES = ["/dashboard"]`); `/` is public by omission. `index.astro` / `PracticeShell.astro` never redirect guests. Persist is `POST /api/profile`: own `getUser()`, zod, then `updateProfileProgress(..., user.id)`. RLS is defense-in-depth. Standalone Vitest cannot run Astro `app.fetch` or middleware (`research.md` harness follow-up). CI still does not run `npm test` (test-plan §3 Phase 4).

Research: `context/changes/testing-guest-access-and-progress-isolation/research.md`.

## Desired End State

`npm test` still runs Vitest in Node, without loading Astro. Tests fail if `/` becomes a protected prefix, if home/shell grow an unauthenticated redirect, if a guest POST writes, if a body `id` retargets the UPDATE, or if garbage progress is stored. Cookbook §6.2 / §6.4 name those files and oracles.

**Verify:** `npm test` and `npm run lint` pass; `vitest.config.ts` still has no `getViteConfig`; inverting “`/` is public” fails the suite; invalid-body cases never call UPDATE; extra `id` still `.eq` the session user.

### Key Discoveries:

- Wall is `src/middleware.ts:4-21`. Product oracle: `/` public, `/dashboard` gated — not `toEqual(["/dashboard"])` (`research.md` Risk #2).
- `PracticeRound` is `client:only="react"`. SSR HTML will not contain “Tap the key…”. Home-does-not-redirect is a **source** check of `index.astro` + `PracticeShell.astro`, not an HTTP body (`research.md` follow-up 17:42).
- Guests can still `POST /api/profile` (not in `PROTECTED_ROUTES`). Isolation is **401**, not “island did not fetch” (`research.md` Risk #4).
- Extra `id` / `user_id` is **stripped**, not 400. That is the IDOR case (`research.md` Risk #6).
- Accuracy `66.6` is **valid** (not `.int()`); `"Random"` / `"jazz"` are 400s (`research.md` follow-up 17:39).
- `updateProfileProgress` returning `true` on 0-row UPDATE means `{ ok: true }` is not “row changed”. Use a recording client, never `vi.mock` the service (`research.md` Risk #4).
- Handler imports `astro:env/server`. Mock that virtual module; call `POST` with an `APIContext` (`request` + `cookies`), not a bare `Request` (`research.md` follow-up 17:43).

## What We're NOT Doing

- `getViteConfig`, AstroContainer, `app.fetch`, workerd pool, Playwright, jsdom
- Live `astro preview` / `npm run dev` HTTP as part of `npm test`
- Docker / two-user RLS in this phase (parked; app-gate recording client is the CI proof)
- CI job for `npm test` (test-plan §3 Phase 4)
- Backporting test-plan §2 Source for Risk #2 (defer `/10x-test-plan --refresh`)
- Treating extra `id` as a 400; treating in-range float accuracy as invalid
- Mocking `updateProfileProgress` to `true`
- Island `canPersist` / empty-UI as the guest-write oracle
- Hydrated drill copy as the guest-`/` oracle
- Asserting `PROTECTED_ROUTES` array equality
- Profile GET endpoint (none exists); dashboard SSR reads

## Implementation Approach

Three phases, cheapest signal first: path guard so `/` cannot be listed without a failing test; then one POST harness covering ownership and validation; cookbook so the next API test copies a real file.

Shared rules from Phase 1: import `{ describe, expect, it }` from `"vitest"` (no globals); keep `vitest.config.ts` standalone.

## Critical Implementation Details

**Vitest must not load Astro.** Do not import `getViteConfig`. Mock `astro:env/server` **before** importing `POST` from `src/pages/api/profile.ts`. Do not load `astro.config.mjs`.

**Oracle rules (load-bearing).** Path expected values are product paths (`/` public, `/dashboard` gated, `/api/profile` public so fetch is not a redirect). Invalid bodies come from PRD set enum + 0–100 accuracy + non-negative int ms + S-02 “zod → 400”, not from `safeParse` of the production schema as the expected table. Extra `id` is the ownership case (200 + `.eq` session user), not invalid-body. Include one valid write control so “UPDATE not called” is a real spy.

**Recording client, not service mock.** The fake Supabase object must still run `.from("profiles").update(...).eq("id", userId)` (or equivalent chain the service uses) and record the id. `vi.mock("@/lib/services/profile")` is the named anti-pattern.

**Unauthenticated fixture.** Missing env (`createClient` → `null`) or `getUser()` with no user both 401. Handmade cookies do not mint a user. Prefer no session / null client over a fake Cookie header.

---

## Phase 1: Guest path guard (Risk #2)

### Overview

Extract the denylist predicate middleware already uses. Prove `/` is public and `/dashboard` is gated with path examples. Prove home/shell source does not redirect unauthenticated users. Does **not** run the Astro request pipeline.

**Behavior asserted:** unauthenticated visitors are not gated on `/` (or `/auth/signin`, `/api/profile`); they **are** gated on `/dashboard`. Home and practice shell do not `Astro.redirect` / `return …redirect` guests.

**Regression caught:** adding `"/"` to the protected prefixes; adding `if (!user) return Astro.redirect("/auth/signin")` on `index.astro` or `PracticeShell.astro`.

**Research:** `research.md` Risk #2 + follow-ups 17:42 / 17:43.

**Edge:** `/dashboard` prefix (live `startsWith` contract — label it as current, not as a PRD path). `/api/profile` must stay public (401 JSON, not a login redirect).

**Anti-pattern avoided:** `expect(PROTECTED_ROUTES).toEqual(["/dashboard"])`; full browser e2e; asserting hydrated “Tap the key”.

### Changes Required:

#### 1. Extract `isProtectedPath`

**File**: `src/lib/auth/protected-routes.ts` (new), `src/middleware.ts`

**Intent**: Give tests a pure predicate the middleware actually calls, so adding `/` to the denylist fails without importing `astro:middleware`.

**Contract**: Export `isProtectedPath(pathname: string): boolean` with the **same** prefix rule middleware uses today (`startsWith` on each protected prefix). Middleware must call this helper instead of inlining the `some(...)`. Do not export the prefix array as the test oracle.

#### 2. Path-guard tests

**File**: `src/lib/auth/protected-routes.test.ts` (new)

**Intent**: Lock public vs gated paths from the product rule, not from the prefix list.

**Contract**: Independent path table. Public (expected `false`): `/`, `/auth/signin`, `/api/profile`. Gated (expected `true`): `/dashboard`. Import `{ describe, expect, it }` from `"vitest"`. Do not import `PROTECTED_ROUTES` / the prefix array as expected values. Do not snapshot middleware.

#### 3. Home-does-not-redirect source check

**File**: `src/lib/auth/protected-routes.test.ts` (same file is fine)

**Intent**: Catch a page-level wall that never touches `isProtectedPath`.

**Contract**: Read `src/pages/index.astro` and `src/components/PracticeShell.astro` from disk. Fail if either file contains an unauthenticated redirect (`Astro.redirect` or `context.redirect` / `return` redirect). `index.astro` must still mount `PracticeShell`. Do not parse React island output.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- `vitest.config.ts` still does not import `astro/config` or `getViteConfig`
- Public path `/` is expected unprotected; flipping that expectation to protected makes `npm test` fail

#### Manual Verification:

- A reader can see `/` public vs `/dashboard` gated from the path table without opening middleware

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Profile POST integration (Risks #4 and #6)

### Overview

Call `POST` from `src/pages/api/profile.ts` with a stub `APIContext` and a recording Supabase client. Prove guest/no-session does not UPDATE; forged body `id` cannot retarget; invalid bodies 400 and do not UPDATE; one valid body does record an UPDATE for the session user.

**Behavior asserted:** no user → 401 + no UPDATE; invalid set/range/types → 400 + no UPDATE; valid body + extra `id: B` → UPDATE `.eq("id", A)` not B; one valid control records UPDATE for A.

**Regression caught:** trusting `body.id`; dropping zod so `"jazz"` / accuracy 101 persist; treating `{ ok: true }` as proof of a write without looking at the recorded `.eq`.

**Research:** `research.md` Risks #4/#6 + follow-ups 17:39 / 17:43.

**Edge:** extra `id` is **not** 400; `last_accuracy_percent: 66.6` is **not** 400; `"Random"` is 400; missing fields / non-JSON / string `"70"` are 400. Status 200 `{ ok: false }` is a service miss, not this suite’s 400 oracle.

**Anti-pattern avoided:** mock `updateProfileProgress`; happy-path-only valid body; extra `user_id` as invalid-body; empty guest UI as no-write proof.

### Changes Required:

#### 1. Env mock and recording client

**File**: `src/pages/api/profile.test.ts` (new) — helpers in the same file or `src/pages/api/profile-test-utils.ts` if needed

**Intent**: Load the handler in Node without Astro config, and exercise `.eq("id", userId)` without Docker.

**Contract**: `vi.mock("astro:env/server")` before importing `POST`. Build an `APIContext` with `request` + `cookies` (not a bare `Request`). Stub `createClient` / `getUser` as needed. Recording client must capture `.from("profiles").update(...).eq("id", …)` (the chain `updateProfileProgress` uses). Do not `vi.mock("@/lib/services/profile")`.

#### 2. Guest / no-session (Risk #4)

**File**: `src/pages/api/profile.test.ts`

**Intent**: A crafted guest POST must not write. Island `canPersist` is not this test.

**Contract**: Unauthenticated POST (null client or `getUser` with no user) → **401** `{ error: "Unauthorized" }`. Recording client must show **no** UPDATE / no `.eq`. Body may be otherwise valid so a 401 is not confused with 400.

#### 3. Invalid bodies (Risk #6)

**File**: `src/pages/api/profile.test.ts`

**Intent**: Garbage must not reach UPDATE. A 200 on one valid body is not coverage.

**Contract**: Independent payload table (product constraints, not copied `safeParse`). Authenticated session. Each invalid case → **400** `{ error: "Invalid body" }` and **no** UPDATE. Include at least: bad set (`"jazz"` or `"chromatic"`), `"Random"`, accuracy `101`, accuracy `-1`, ms `1.5`, ms `-1`, missing field, `{}` / non-JSON, accuracy string `"70"`. Do **not** expect 400 for extra `id` or for accuracy `66.6`.

#### 4. Ownership + valid control (Risk #4)

**File**: `src/pages/api/profile.test.ts`

**Intent**: Session user A is the UPDATE target even if the body names B; a valid POST does call UPDATE so the spy is live.

**Contract**: Authenticated as A. Valid progress fields **plus** `id: B` (and/or `user_id: B`) → 200 and recorded `.eq("id", A)` (not B). Separate valid control **without** extra id → UPDATE recorded for A (proves the spy is not stuck “never called”). Do not assert row bytes in Postgres.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- No test file mocks `@/lib/services/profile`
- Flipping `"jazz"` expected from 400 to 200 (or dropping the no-UPDATE assert on that row) makes `npm test` fail

#### Manual Verification:

- A reader can add a new invalid payload by copying the table
- Comments distinguish extra `id` (ownership) from 400 cases, and note 66.6 is valid

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Cookbook (§6.2 / §6.4)

### Overview

Write what shipped into `context/foundation/test-plan.md` §6.2 and §6.4. Do not invent a second style. Do not edit §1–§2 (Risk #2 Source backport is deferred).

### Changes Required:

#### 1. Integration-test recipe

**File**: `context/foundation/test-plan.md` §6.2

**Intent**: Replace TBD with how to add a guest-access / progress-isolation test.

**Contract**: Location `src/lib/auth/protected-routes.test.ts` (path guard + home source check) and `src/pages/api/profile.test.ts` (POST). Naming `<module>.test.ts`. Import from `vitest`. Run `npm test`. Oracles: product paths for #2; 401 + no UPDATE for guest POST; payload table for 400s; extra `id` is ownership not 400. Do not use `getViteConfig` / `app.fetch`. Do not mock the profile service.

#### 2. New API endpoint recipe

**File**: `context/foundation/test-plan.md` §6.4

**Intent**: Next POST/PATCH copies request → status/body **and** side-effect (recorded `.eq` / no call), not a mocked service.

**Contract**: Prefer `APIContext` + recording client when standalone Vitest cannot boot the adapter. Mock `astro:env/server` if the route imports it. Assert status **and** whether the write ran and with which id. Unauthenticated API that the island `fetch`es must 401, not redirect.

#### 3. Phase note

**File**: `context/foundation/test-plan.md` §6.6

**Intent**: Capture the Phase 2 harness so nobody “fixes” it with `getViteConfig` or Docker-only RLS.

**Contract**: 2–4 lines: standalone Node; no `app.fetch`; path guard extract + source check for `/`; POST via `APIContext` + recording client; RLS parked; CI still no `npm test` until §3 Phase 4.

### Success Criteria:

#### Automated Verification:

- `npm test` still passes
- `npm run lint` still passes (markdown is prettier-only if staged)

#### Manual Verification:

- §6.2 and §6.4 no longer read “TBD”
- A new contributor could add an invalid profile field using only §6.2 / §6.4 and `profile.test.ts`
- §2 Risk #2 Source cell is unchanged (backport deferred)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- `isProtectedPath` path table (Phase 1)
- Source check that home/shell do not redirect (Phase 1)

### Integration Tests:

- `POST /api/profile` via `APIContext` (Phase 2): 401, 400 table, extra `id`, valid control
- Not live HTTP, not RLS

### Manual Testing Steps:

1. Run `npm test` and confirm existing practice units still run.
2. Flip `/` from public to gated in the path table (or invert `isProtectedPath("/")`) and confirm failure, then revert.
3. Confirm no `vi.mock("@/lib/services/profile")` in the new tests.

## Performance Considerations

None. Handler stubs and file reads are cheap.

## Migration Notes

`isProtectedPath` must preserve today’s `startsWith("/dashboard")` behavior. No schema or API change. No RLS change.

## References

- Research: `context/changes/testing-guest-access-and-progress-isolation/research.md`
- Test plan: `context/foundation/test-plan.md` §2 Risks #2 #4 #6, §3 Phase 2, §6.2 §6.4
- PRD: FR-007, FR-008, Access Control
- S-02: `context/archive/2026-09-05-oauth-profile-progress/`
- Never a wall: `context/archive/2026-08-25-guest-practice-round/`, `context/archive/2026-09-05-oauth-profile-scaffold/`
- Phase 1 runner: `context/archive/2026-09-13-testing-critical-path-coverage/`
- Middleware: `src/middleware.ts`
- Profile API: `src/pages/api/profile.ts`
- Profile service: `src/lib/services/profile.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Guest path guard (Risk #2)

#### Automated

- [x] 1.1 `npm test` passes — 6becbda
- [x] 1.2 `npm run lint` passes — 6becbda
- [x] 1.3 `vitest.config.ts` still does not import `astro/config` or `getViteConfig` — 6becbda
- [x] 1.4 Public path `/` is expected unprotected; flipping that expectation to protected makes `npm test` fail — 6becbda

#### Manual

- [x] 1.5 A reader can see `/` public vs `/dashboard` gated from the path table without opening middleware — 6becbda

### Phase 2: Profile POST integration (Risks #4 and #6)

#### Automated

- [x] 2.1 `npm test` passes — 408c966
- [x] 2.2 `npm run lint` passes — 408c966
- [x] 2.3 No test file mocks `@/lib/services/profile` — 408c966
- [x] 2.4 Flipping `"jazz"` expected from 400 to 200 (or dropping the no-UPDATE assert on that row) makes `npm test` fail — 408c966

#### Manual

- [x] 2.5 A reader can add a new invalid payload by copying the table — 408c966
- [x] 2.6 Comments distinguish extra `id` (ownership) from 400 cases, and note 66.6 is valid — 408c966

### Phase 3: Cookbook (§6.2 / §6.4)

#### Automated

- [x] 3.1 `npm test` still passes
- [x] 3.2 `npm run lint` still passes (markdown is prettier-only if staged)

#### Manual

- [x] 3.3 §6.2 and §6.4 no longer read “TBD”
- [x] 3.4 A new contributor could add an invalid profile field using only §6.2 / §6.4 and `profile.test.ts`
- [x] 3.5 §2 Risk #2 Source cell is unchanged (backport deferred)
