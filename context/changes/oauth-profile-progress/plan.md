# OAuth Profile Progress Implementation Plan

## Overview

Wire the existing `public.profiles` row so a signed-in learner keeps last-round scores and current set across refresh and later visits. Guests stay session-only. No login wall, no history table, no new migration.

## Current State Analysis

F-02 scaffolded Google OAuth, a `profiles` row per `auth.users` (RLS owner SELECT/UPDATE, trigger INSERT), and a compact practice header. Progress columns exist and stay null. S-01’s round engine lives entirely in `usePracticeRound`: default mode is always `"random"`; `RoundSummary` appears only when `uiPhase === "summary"`. The React island takes no auth props. `/dashboard` shows email on leftover cosmic starter chrome. Nothing under `src/` reads or writes `profiles`. There is no JSON API, no `src/lib/services/`, no `zod`, and no test runner.

Product authority is PRD FR-007 / FR-008 + Access Control. Prefer PRD over MVP.md (no guest `localStorage`). Roadmap S-02 is unblocked on provider (Google already chosen); glance-table “proposed” vs detail “blocked” is stale docs, not a product unknown.

### Key Discoveries:

- Profile columns already match `PracticeSetMode` + last `RoundSummary` — `supabase/migrations/20260905144500_create_profiles.sql`, `src/types.ts` `Profile`
- Complete summary exists only after the 10th note (`usePracticeRound.ts` `goToNext` → `uiPhase: "summary"`)
- Island is `client:only="react"` with no props today (`PracticeShell.astro`); `client:only` still accepts serialized Astro props
- No INSERT policy for `authenticated` — API must UPDATE the trigger-created row
- F-02 forbade a browser Supabase client; cookie SSR `createClient` in `src/lib/supabase.ts` is the only session path
- Auth APIs today are form-POST + redirect; this slice adds the first JSON body route
- Dashboard is the account surface F-02 deferred for scores (`src/pages/dashboard.astro`)

## Desired End State

A guest on `/` practices exactly as today (no profile fetch, no save). A signed-in user opening `/` starts a new round in their saved `current_set` (or `"random"` if never finished a round). Finishing 10 notes silently UPDATEs last accuracy, average response ms, current set, and server `last_completed_at`. Refresh as signed-in restores that mode. `/dashboard` (practice tokens, not cosmic) shows those last-round fields or an empty state. Failed saves do not block Practice again / Next set. Sign-in from the header still remounts `/` and drops any in-memory guest round.

**Verify:** guest round + refresh → gone; signed-in round + refresh → same set mode; dashboard shows the last summary; guest never hits `/api/profile`; phone-width header and dashboard have no H-scroll; `/` stays public.

## What We're NOT Doing

- Guest persistence (`localStorage`, cookies for scores, anonymous auth, buffering a round across OAuth)
- History tables, charts, per-note sequences, mid-round resume
- Multi-device sync as a product surface (the profile row is enough)
- Showing last scores on the practice screen
- Saving on “Next set” / `startRound` (summary only)
- Error or “Saved” chrome on the summary
- Browser Supabase client
- New migration / extra profile columns
- Extra OAuth providers; removing email/password routes
- Adding `/` to `PROTECTED_ROUTES` or a login wall
- Changing round length, scoring, VexFlow, playback, or mute persistence
- Test runner / Vitest
- Fetching `profiles` in middleware (every request)
- Restyling `/auth/*` (stay cosmic); only `/dashboard` moves to practice tokens

## Implementation Approach

Server-only throughout. One service module used by Astro pages (SELECT) and one JSON API (UPDATE). The island learns “signed-in” and initial mode from SSR props; it writes via `fetch` on summary. Dashboard SSR-reads the same row.

1. **Profile service + save API** — typed SELECT/UPDATE helpers, `zod` body, `POST /api/profile`.
2. **Practice load + silent save** — SSR-seed `initialMode` / `canPersist`; hook honors initial mode; fire-and-forget POST once per completed round.
3. **Dashboard last-round UI** — practice-token layout; last scores + current set or empty state.

## Critical Implementation Details

**Timing & lifecycle:** Do not await the save inside `onNote` / `goToNext` — that would stall the 200 ms visual NFR and the summary CTAs. Trigger the POST after React has committed `uiPhase === "summary"`. Dedupe so React Strict Mode (dev double-effect) and summary re-renders POST **at most once per completed round** (e.g. a `roundId` bumped in `startRound`, saved when `summary` appears). A later finished round must save again.

**No INSERT:** RLS has no client insert path. If the row is missing, UPDATE affects 0 rows — treat as a silent fail, do not upsert.

**`last_completed_at`:** Set on the server to `now()` (or ISO from the service). Do not trust a client timestamp.

**Hydration:** `PracticeShell` SELECTs only when `Astro.locals.user` and `createClient` are both present. Guests: zero profile queries. Pass `initialMode` and `canPersist` into `PracticeRound`. Failed SELECT → `initialMode: "random"`, `canPersist` still true if the user session exists (save may still succeed).

**Same-origin `fetch`:** Default cookie credentials are enough; do not add a browser Supabase client. Ignore non-OK responses.

**OAuth remount:** Google callback already redirects to `/`. In-memory guest progress is discarded; that is accepted.

## Phase 1: Profile service and save API

### Overview

Add the only persistence code path: read/update the existing `profiles` row through the cookie SSR client. No practice UI yet.

### Changes Required:

#### 1. Add zod

**File**: `package.json` (and lockfile)

**Intent**: CLAUDE.md requires API body validation; this is the first JSON body in the app. F-02 skipped zod because Google was hard-coded.

**Contract**: Add `zod` as a runtime dependency. Do not add a test runner.

#### 2. Profile service

**File**: `src/lib/services/profile.ts` (new)

**Intent**: One place for SELECT/UPDATE so Astro pages and the API do not duplicate column mapping or `last_completed_at`.

**Contract**:

- `getProfile(supabase, userId: string): Promise<Profile | null>` — `from("profiles").select(...).eq("id", userId).maybeSingle()`. Map to `Profile`. Null on error or missing row.
- `updateProfileProgress(supabase, userId, patch): Promise<boolean>` — UPDATE `current_set`, `last_accuracy_percent`, `last_average_response_ms`, `last_completed_at` (server now). `.eq("id", userId)`. Return whether a row was updated. Never insert.
- Column names match the migration / `Profile` type. Do not generate `database.types.ts`.

#### 3. Write DTO (optional small type)

**File**: `src/types.ts`

**Intent**: Shared PATCH shape for API + island; drop the “unused until S-02” comment on `Profile`.

**Contract**: Keep `Profile` fields unchanged. Export a write payload type with `current_set: PracticeSetMode`, `last_accuracy_percent: number`, `last_average_response_ms: number` (no `last_completed_at` from the client).

#### 4. Save API route

**File**: `src/pages/api/profile.ts` (new)

**Intent**: Let the practice island UPDATE the signed-in row with cookie session, without a browser Supabase client.

**Contract**: `export const prerender = false`. `POST` only. `createClient` + `getUser()`. No user or no supabase → `401` JSON. Parse JSON body with zod:

```ts
z.object({
  current_set: z.enum(["random", "stepwise"]),
  last_accuracy_percent: z.number().min(0).max(100),
  last_average_response_ms: z.number().int().nonnegative(),
});
```

Coerce/round accuracy to a 0–100 number and ms to an integer before UPDATE (island should already `Math.round` to match the score UI). Zod failure → `400`. Service false/error → `200` still acceptable (silent client) or `200` with `{ ok: false }`; the island ignores the body. Success → `200`. No GET on this route — dashboard and `/` read via SSR. Do not add this path to `PROTECTED_ROUTES` (unauthenticated POST already 401s; a redirect to sign-in would be wrong for `fetch`).

#### 5. Agent docs

**File**: `CLAUDE.md` (Auth flow / API list)

**Intent**: Next slices should not reverse-engineer the profile write.

**Contract**: List `POST /api/profile` beside the auth routes. Note that reads happen in Astro via `src/lib/services/profile.ts`, not a GET endpoint.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `src/pages/api/profile.ts` exports `prerender = false`
- `zod` is in `package.json` dependencies

#### Manual Verification:

- `POST /api/profile` with no session returns 401
- Signed-in `POST` with a valid body updates `current_set` + last-round columns in Studio; `last_completed_at` is set; `updated_at` bumps
- Invalid body (e.g. `current_set: "jazz"`) returns 400; row unchanged
- Guest/anon cannot UPDATE another user’s row (RLS)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Practice load and silent save

### Overview

Signed-in visits start in the saved set. Finishing a round writes the snapshot. Guests unchanged.

### Changes Required:

#### 1. SSR seed from PracticeShell

**File**: `src/components/PracticeShell.astro`

**Intent**: Restore `current_set` without a client flash of the wrong mode, and without a profile query for guests.

**Contract**: If `Astro.locals.user` and `createClient`, `getProfile`. `initialMode = profile?.current_set ?? "random"`. `canPersist = Boolean(Astro.locals.user && supabase)`. Pass both as props to `<PracticeRound client:only="react" />`. Do not pass last scores. Do not fetch in middleware.

#### 2. Hook accepts initial mode

**File**: `src/components/hooks/usePracticeRound.ts`

**Intent**: First `generateRound` must use the saved set, not always `"random"`.

**Contract**: `usePracticeRound(initialMode: PracticeSetMode = "random")`. Initialize `mode` and the first `notes` from `initialMode`. `startRound` still takes an explicit next mode (Practice again / Next set). Do not read the network from the hook.

#### 3. Island save on summary

**File**: `src/components/practice/PracticeRound.tsx`

**Intent**: Persist FR-008 fields once per finished round without touching guest UX or summary chrome.

**Contract**: Props `{ canPersist: boolean; initialMode: PracticeSetMode }`. Pass `initialMode` into the hook. When `canPersist` && `uiPhase === "summary"` && `summary` is non-null, `POST /api/profile` with rounded `current_set: round.mode`, `last_accuracy_percent`, `last_average_response_ms`. Fire-and-forget; do not await before enabling CTAs. Dedupe per completed round (see Critical Implementation Details). If `canPersist` is false, make **no** request. Do not render save errors or last-session scores. Mute / playback unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `PROTECTED_ROUTES` still does not include `/`

#### Manual Verification:

- Guest: complete a round, refresh → mode is random, no `/api/profile` in the network panel
- Signed-in: complete a stepwise round, refresh `/` → next round is stepwise (staff/piano loop, not dashboard)
- Signed-in: complete a round, Studio columns match the summary (`Math.round` of accuracy and avg ms)
- Failed save (stop Worker or revoke session) → summary CTAs still work; no error line
- Sign in from the header mid-round or on guest summary → land on `/` as signed-in with a **new** round (in-memory guest round gone)
- ~390px: drill + header still no H-scroll; Sign in / identity control unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Dashboard last-round UI

### Overview

Show the saved snapshot on `/dashboard` using the same practice visual language as `/`.

### Changes Required:

#### 1. Restyle + last-round fields

**File**: `src/pages/dashboard.astro`

**Intent**: F-02 left this page as the account surface; scores belong here, not on the drill. Drop cosmic starter chrome so it feels like ReadTheKey.

**Contract**:

- `createClient` + `getProfile` for `Astro.locals.user.id` (page is already behind `PROTECTED_ROUTES`)
- Layout: `bg-background text-foreground min-h-dvh`, `overflow-x-hidden`, practice tokens (`border-border`, `text-muted-foreground`, `min-h-11` tap targets). No `bg-cosmic`, no purple gradient title
- Always show email, Back to practice → `/`, Sign out POST `/api/auth/signout`
- If progress columns are null: one empty line, e.g. “No saved round yet”
- If set: current set (`random` / `stepwise`), last accuracy as integer percent, avg response as integer ms, last completed as a readable timestamp (`last_completed_at`)
- Do not add charts, history, or a settings form
- ~390px: no H-scroll; keep the compact header-style actions tappable

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- New signed-in user (null columns): dashboard empty state; Back to practice and Sign out work
- After a saved round: dashboard numbers match Studio / the last summary
- Unauthenticated `/dashboard` still redirects to `/auth/signin`
- Visual: light practice tokens, not cosmic; `/auth/signin` remains cosmic
- ~390px dashboard: no H-scroll

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None. Do not add a test runner.

### Integration Tests:

- None. Persistence needs a real Supabase session.

### Manual Testing Steps:

1. Private window, guest `/`: play 2–3 notes, refresh — progress gone; no profile requests.
2. Sign in (Google). Complete a 10-note **stepwise** round. Confirm summary numbers. Refresh `/` — new round is stepwise. Open Dashboard — same accuracy / avg / set / completed time.
3. Practice again (same mode), finish, confirm dashboard **overwrites** last scores (no history).
4. Next set → finish a **random** round → refresh `/` starts random; dashboard current set is random.
5. DevTools offline (or stop `wrangler`/dev) on summary as signed-in — CTAs still work; no error copy.
6. Guest complete (or mid-round) → header Sign in → Google → `/` as signed-in; that guest round is **not** in the profile.
7. Phone-width (~390px) `/` and `/dashboard`.

## Performance Considerations

Middleware already calls `getUser()` every request. Profile SELECT runs only on `/` (signed-in) and `/dashboard`, not globally. Save POST is after the round, not per tap. Do not add polling.

## Migration Notes

- No new SQL. Hosted `profiles` from F-02 is enough (`npx supabase db push` already applied).
- Rollback is code-only: remove API + island props + dashboard fields; table can stay.
- Users with null columns are valid (never finished a signed-in round).

## References

- Related research: `context/changes/oauth-profile-progress/research.md`
- F-02 scaffold: `context/archive/2026-09-05-oauth-profile-scaffold/plan.md`
- Product: `context/foundation/prd.md` (FR-007, FR-008, Access Control)
- Roadmap S-02: `context/foundation/roadmap.md`
- Cookie client: `src/lib/supabase.ts`
- Round summary: `src/lib/practice/scoring.ts`, `src/components/hooks/usePracticeRound.ts`
- Dashboard host: `src/pages/dashboard.astro`
- Practice tokens: `src/styles/global.css` `:root`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Profile service and save API

#### Automated

- [x] 1.1 `npm run lint` passes — ce0df69
- [x] 1.2 `npm run build` passes — ce0df69
- [x] 1.3 `src/pages/api/profile.ts` exports `prerender = false` — ce0df69
- [x] 1.4 `zod` is in `package.json` dependencies — ce0df69

#### Manual

- [x] 1.5 `POST /api/profile` with no session returns 401 — ce0df69
- [x] 1.6 Signed-in `POST` with a valid body updates `current_set` + last-round columns in Studio; `last_completed_at` is set; `updated_at` bumps — ce0df69
- [x] 1.7 Invalid body (e.g. `current_set: "jazz"`) returns 400; row unchanged — ce0df69
- [x] 1.8 Guest/anon cannot UPDATE another user’s row (RLS) — ce0df69

### Phase 2: Practice load and silent save

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run build` passes
- [x] 2.3 `PROTECTED_ROUTES` still does not include `/`

#### Manual

- [x] 2.4 Guest: complete a round, refresh → mode is random, no `/api/profile` in the network panel
- [x] 2.5 Signed-in: complete a stepwise round, refresh `/` → next round is stepwise
- [x] 2.6 Signed-in: complete a round, Studio columns match the summary (`Math.round` of accuracy and avg ms)
- [x] 2.7 Failed save (stop Worker or revoke session) → summary CTAs still work; no error line
- [x] 2.8 Sign in from the header mid-round or on guest summary → land on `/` as signed-in with a new round (in-memory guest round gone)
- [x] 2.9 ~390px: drill + header still no H-scroll; Sign in / identity control unchanged

### Phase 3: Dashboard last-round UI

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run build` passes

#### Manual

- [ ] 3.3 New signed-in user (null columns): dashboard empty state; Back to practice and Sign out work
- [ ] 3.4 After a saved round: dashboard numbers match Studio / the last summary
- [ ] 3.5 Unauthenticated `/dashboard` still redirects to `/auth/signin`
- [ ] 3.6 Visual: light practice tokens, not cosmic; `/auth/signin` remains cosmic
- [ ] 3.7 ~390px dashboard: no H-scroll
