# OAuth Profile Scaffold Implementation Plan

## Overview

Scaffold Google OAuth sign-in and a signed-in `profiles` store (scores + current set columns, unused until S-02) so optional account progress can persist later — without a login wall, without guest storage, and without wiring the practice loop to save.

## Current State Analysis

The 10x Astro starter already ships **email/password** Supabase SSR: cookie client in `src/lib/supabase.ts`, middleware `getUser()` → `Astro.locals.user`, `POST /api/auth/{signin,signup,signout}`, pages under `/auth/*`, and a protected `/dashboard`. Practice at `/` is guest-public (`PROTECTED_ROUTES` is only `/dashboard`) and has **no auth chrome**. `PracticeShell` is a server-rendered header + `PracticeRound` island. There is **no** `signInWithOAuth`, **no** callback route, **no** `supabase/migrations/`, **no** `profiles` table, and **no** test runner. Local Auth `site_url` still points at starter port **3000**; `npm run dev` serves **localhost:4321**. Product authority is PRD Access Control + FR-007/FR-008 and roadmap F-02 (this change) vs S-02 (later: actually save progress).

### Key Discoveries:

- Server-only Supabase client already implements `@supabase/ssr` `getAll`/`setAll` on Astro cookies (`src/lib/supabase.ts`). OAuth PKCE must reuse this client — do **not** hand-set `sb-access-token` cookies the way older Astro snippets do.
- Practice home never mounts leftover `Topbar.astro` / `Welcome.astro` (`src/pages/index.astro` → `PracticeShell` only). Header chrome belongs in `PracticeShell`, as Astro, so the island stays practice-only.
- `src/types.ts` has `PracticeSetMode` (`"random" | "stepwise"`) and `RoundSummary` (accuracy + average ms) — profile columns should match these, not invent a history table.
- Auth API routes do not use zod (not in `package.json`) and do not export `prerender = false` despite `CLAUDE.md`. New OAuth routes should add `prerender = false`; do **not** add a zod dependency for a fixed Google provider.
- Google Cloud’s authorized redirect URI is **Supabase Auth’s** callback (`http://127.0.0.1:54321/auth/v1/callback` locally), not the app’s `/api/auth/callback`. The app URL is `redirectTo` on `signInWithOAuth` and must be listed in `additional_redirect_urls`.

## Desired End State

A learner can open `/` and practice immediately as a guest. A compact header control offers **Sign in** (never a wall). Sign-in is Google-primary on `/auth/signin` (email/password forms remain on `/auth/signin` and `/auth/signup` but are not linked from practice). After Google consent, the app exchanges the PKCE code, sets the SSR session cookie, and returns to `/` signed in. The header then shows identity + Dashboard + Sign out. `/dashboard` still shows email only (no scores). Every new `auth.users` row gets a `public.profiles` row with nullable `current_set` and last-round columns. Guests still have no profile storage. Practice round state stays in React memory.

**Verify:** guest round on `/` with no login prompt; Google happy path returns to `/` signed in; `/dashboard` still gated; a new user has a profiles row; email/password still works if you open `/auth/signin` directly; phone-width header does not crowd the drill or force horizontal scroll.

## What We're NOT Doing

- Wiring the practice loop to read or write profile columns (that is **S-02 / oauth-profile-progress**)
- Guest persistence (`localStorage`, cookies for scores, anonymous Supabase sign-in)
- History tables, charts, multi-device sync, avatars, display names
- Additional OAuth providers (GitHub, Apple)
- Removing or hiding email/password **routes** — only keeping them off practice chrome
- Adding `/` (or `/auth/*`) to `PROTECTED_ROUTES`
- Adding a test runner, Vitest, or pgTAP
- Adding `zod` or a browser Supabase client
- Changing round length, scoring, VexFlow, playback, or practice layout besides a compact header control
- Suppressing the Layout Supabase config banner

## Implementation Approach

Three phases, ordered so the first Google user cannot land without a profile row.

1. **Profile store** — first app migration: `public.profiles` + RLS + insert trigger + `Profile` type.
2. **Google OAuth** — local/hosted provider config, start + callback API routes, Google CTA on `/auth/signin`, redirect URL fixes, README/CLAUDE.md auth notes.
3. **Practice header** — optional Sign in / signed-in control on `PracticeShell`; dashboard stays a slim identity page with a back-to-practice link.

Server-only throughout: start OAuth and exchange the code with `createClient` from `@/lib/supabase`. Header is Astro reading `Astro.locals.user` — not a React island.

## Critical Implementation Details

**Timing & lifecycle:** Apply the profiles migration **before** the first Google sign-in. The trigger on `auth.users` INSERT is what creates the row; there is no client insert path. Existing email/password users created before the trigger will not backfill automatically — a one-shot `INSERT … SELECT` from `auth.users` in the same migration covers leftover starter accounts.

**OAuth PKCE:** Call `signInWithOAuth` and `exchangeCodeForSession` on the existing cookie-aware server client so `@supabase/ssr` can persist the PKCE verifier and session. Do not copy Astro docs that manually `cookies.set("sb-access-token")`. On callback, treat both missing `code` and provider `error` / `error_description` query params as failures and redirect to `/auth/signin?error=` with a short safe message (do not echo raw provider dumps).

**Redirect URLs:** `redirectTo` must be `${new URL(request.url).origin}/api/auth/callback` so local, preview, and production each get their own origin. List **both** `http://localhost:4321` and `http://127.0.0.1:4321` (and the callback path) in `additional_redirect_urls` — mixing hostname aliases is a common silent OAuth failure. Hosted Supabase Dashboard redirect allow-list must include the Cloudflare production origin the same way. Google Cloud authorized redirect stays the **Supabase** `/auth/v1/callback`, not the Astro route.

**User experience:** Header control is compact (`min-h-11` tap targets, truncate email). It must not interrupt the drill, must not look like a login wall, and must not introduce horizontal scroll at ~390px. Signed-out CTA is “Sign in” → `/auth/signin` (not a direct Google hop), so errors can reuse `ServerError` on that page.

## Phase 1: Profile store

### Overview

Add the first application schema: a `profiles` row per auth user, RLS so only the owner can read/update, and TypeScript types S-02 can write to later. No UI.

### Changes Required:

#### 1. Profiles migration

**File**: `supabase/migrations/YYYYMMDDHHmmss_create_profiles.sql` (timestamp at implement time)

**Intent**: Persist one profile per signed-in user with the FR-008 fields, created automatically, never readable by guests.

**Contract**:

- Table `public.profiles`:
  - `id uuid primary key references auth.users (id) on delete cascade`
  - `current_set text null` with check `current_set is null or current_set in ('random', 'stepwise')`
  - `last_accuracy_percent real null` (0–100 when set)
  - `last_average_response_ms integer null`
  - `last_completed_at timestamptz null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- Enable RLS. Granular policies:
  - `authenticated` **SELECT** using `auth.uid() = id`
  - `authenticated` **UPDATE** using `auth.uid() = id` with the same check
  - **No** INSERT/DELETE policies for `authenticated` or `anon` (trigger is the only insert path)
- `SECURITY DEFINER` trigger on `auth.users` AFTER INSERT that inserts `profiles (id)` only; `search_path` set to `public`. Also bump `updated_at` on profile UPDATE.
- Same migration: backfill `profiles` for any existing `auth.users` rows.
- Do not add `seed.sql` content for fake profiles.

#### 2. Profile type

**File**: `src/types.ts`

**Intent**: Give S-02 a single row shape that matches the table; keep practice types unchanged.

**Contract**: Export `Profile` with `id: string`, `current_set: PracticeSetMode | null`, `last_accuracy_percent: number | null`, `last_average_response_ms: number | null`, `last_completed_at: string | null`, `created_at: string`, `updated_at: string`. Do **not** generate `database.types.ts` in this change.

#### 3. Docs: schema exists

**File**: `README.md` (Supabase / migrations paragraph)

**Intent**: Stop claiming the app uses `auth.users` only.

**Contract**: Replace the “no tables or migrations” sentence with: Auth users live in `auth.users`; signed-in app data lives in `public.profiles` via `supabase/migrations/`. Keep Google provider setup for Phase 2.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- Migration file exists under `supabase/migrations/` and enables RLS (grep-able `enable row level security`)

#### Manual Verification:

- `npx supabase db reset` (or `migration up`) applies cleanly on local Supabase
- After reset, `public.profiles` exists; RLS is on; inserting an `auth.users` row (email signup is enough) creates a matching profiles row with null progress columns
- Anon/guest cannot select profiles in Studio SQL as a non-owner (authenticated policy only)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Google OAuth

### Overview

Make Google the product sign-in: start + callback on the SSR cookie client, provider config, and a Google CTA on `/auth/signin`. Email/password routes stay.

### Changes Required:

#### 1. Local Auth URLs + Google provider

**File**: `supabase/config.toml`

**Intent**: OAuth redirects must hit the real Astro origin, and local Auth must know Google is enabled.

**Contract**:

- `site_url` → `http://localhost:4321` (not port 3000)
- `additional_redirect_urls` includes at least:
  - `http://localhost:4321`
  - `http://127.0.0.1:4321`
  - `http://localhost:4321/api/auth/callback`
  - `http://127.0.0.1:4321/api/auth/callback`
- Add `[auth.external.google]` with `enabled = true`, `client_id` / `secret` from env (`env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` / `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)`). Do not commit secrets. Put local values in a **gitignored** `supabase/.env` (add the ignore rule if missing). Leave `skip_nonce_check = false`.
- Do **not** add Google client secrets to `astro.config.mjs` `env.schema` — they belong to the Supabase Auth service (local CLI env or hosted Dashboard), not the Astro worker.

#### 2. OAuth start route

**File**: `src/pages/api/auth/oauth.ts` (new)

**Intent**: Begin the Google PKCE flow with the same cookie client used for password sessions.

**Contract**: `export const prerender = false`. `POST` only. If `createClient` is null, redirect `/auth/signin?error=` “Supabase is not configured” (same copy as `signin.ts`). Call `signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/api/auth/callback" } })`. On success, `redirect` to `data.url`. On error or missing URL, redirect `/auth/signin?error=` with a short encoded message. Hard-code Google — no provider query param, no zod.

#### 3. OAuth callback route

**File**: `src/pages/api/auth/callback.ts` (new)

**Intent**: Exchange the provider `code` for a cookie session and return the learner to practice.

**Contract**: `export const prerender = false`. `GET`. If `error` query param or missing `code`, redirect `/auth/signin?error=` with a friendly message (consent denied / sign-in failed). `exchangeCodeForSession(code)` via `createClient`. On exchange error, same sign-in error redirect. On success, `redirect("/")`. Do not write tokens by hand.

#### 4. Google CTA on sign-in

**File**: `src/pages/auth/signin.astro` (and only that page)

**Intent**: Make Google the obvious product path without deleting email/password.

**Contract**: Above `SignInForm`, a POST form to `/api/auth/oauth` with a full-width “Sign in with Google” button (existing sign-in visual language: min tap target, `cn()` if classes are conditional). A short “or” separator, then the existing email island. Do **not** add Google to `/auth/signup`. Keep the “Don’t have an account? Sign up” email fallback link.

#### 5. Auth docs

**Files**: `README.md` (Auth routes + Google setup), `CLAUDE.md` (Auth flow bullet list)

**Intent**: The next slice (S-02) and a human configuring Google Cloud should not reverse-engineer routes.

**Contract**: Document: Google Cloud OAuth client (web), authorized JS origins (app origin), authorized redirect = Supabase Auth callback; Dashboard/local provider client id/secret; app routes `POST /api/auth/oauth` and `GET /api/auth/callback`; hosted redirect allow-list must include production origin + callback. Update CLAUDE.md API list to include `oauth` and `callback`. Table in README: Google is primary; email/password still listed.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `supabase/.env` (if created) is gitignored; Google secrets are not in tracked files
- New API routes export `prerender = false`

#### Manual Verification:

- Google Cloud + local (or hosted) provider configured; `npx supabase stop && npx supabase start` picks up `config.toml` / secrets
- From `/auth/signin`, Google CTA redirects to Google, then back to `/` with `locals.user` set (middleware) — confirm via `/dashboard` email
- Denying consent (or hitting callback without `code`) lands on `/auth/signin?error=` with a readable message, not a 500
- Email/password sign-in and sign-up still work when used directly
- `/` remains public with no session

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Practice header chrome

### Overview

Expose optional sign-in on the drill without crowding the staff/piano, and keep `/dashboard` as a slim identity page.

### Changes Required:

#### 1. Compact auth control on practice

**Files**: `src/components/PracticeAuthBar.astro` (new), `src/components/PracticeShell.astro`

**Intent**: Guests see a small Sign in; signed-in users see who they are and can reach dashboard / sign out — without touching the React island.

**Contract**: Server-render from `Astro.locals.user`. Place in the existing `PracticeShell` header row beside the title (flex, wrap allowed, no H-scroll). Signed out: link “Sign in” → `/auth/signin`. Signed in: truncated email (or local-part), link “Dashboard” → `/dashboard`, POST sign-out form to `/api/auth/signout` (same as dashboard). Tap targets `min-h-11`. Do **not** mount `Topbar.astro` / `Welcome.astro`. Do **not** add Sign up to the header. Do **not** pass user into `PracticeRound`.

#### 2. Dashboard as identity page

**File**: `src/pages/dashboard.astro`

**Intent**: Keep the protected-route demo as the account surface S-02 can later extend; no scores yet.

**Contract**: Still shows `user.email` and Sign out. Add a text link back to `/` (“Back to practice”). Do not read `profiles` or show last-round fields. `PROTECTED_ROUTES` stays `["/dashboard"]` only.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `PROTECTED_ROUTES` still does not include `/`

#### Manual Verification:

- Guest on `/` (~390px): drill is immediate; header Sign in is tappable; no login modal; no H-scroll; staff + piano still fit
- Sign in (Google) → return to `/` with signed-in header (email + Dashboard + Sign out); practice island still works
- Dashboard link works; unauthenticated `/dashboard` still redirects to `/auth/signin`; Back to practice returns to `/`
- Sign out from header returns to `/` as guest (Sign in visible again)
- Email/password is not linked from the practice header

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None. Do not add a test runner.

### Integration Tests:

- None. OAuth requires a real Google client and browser redirect.

### Manual Testing Steps:

1. Guest: open `/` on desktop and ~390px — complete a note or two with no auth prompt; header shows Sign in only.
2. Apply migrations; email sign-up still creates a `profiles` row (Studio).
3. Configure Google (Cloud console + Supabase provider). Click Sign in → Sign in with Google → allow → land on `/` signed in; open Dashboard; email matches; Sign out.
4. Repeat and deny Google consent — land on `/auth/signin?error=`.
5. Direct `/auth/signin` email/password still authenticates; header on `/` updates.
6. Hit `/dashboard` in a private window — redirect to sign-in.
7. Confirm a Google user’s `public.profiles` row exists with null progress columns.

## Performance Considerations

Middleware already calls `getUser()` on every request. Do not add a profiles fetch on `/` in this change — the header only needs `locals.user`. Profile reads belong to S-02.

## Migration Notes

- First app migration. Local: Docker + `npx supabase start` then `db reset` or `migration up`.
- Hosted: `npx supabase db push` (or linked migrate) as part of deploy; enable Google on the **hosted** Auth providers UI and add production redirect URLs. Worker env stays `SUPABASE_URL` / `SUPABASE_KEY` only.
- Rollback: drop trigger/function + `public.profiles` in a reverse migration if needed; Auth users remain. OAuth routes can be removed independently of the table.
- Users created before Phase 1 are backfilled in the same SQL file; no separate script.

## References

- Product: `context/foundation/prd.md` (FR-007, FR-008, Access Control)
- Roadmap F-02 / S-02: `context/foundation/roadmap.md`
- Cookie client: `src/lib/supabase.ts`
- Middleware / `PROTECTED_ROUTES`: `src/middleware.ts`
- Practice header host: `src/components/PracticeShell.astro`
- Sign-in error pattern: `src/pages/api/auth/signin.ts`, `src/components/auth/ServerError.tsx`
- Supabase Google (web): authorized redirect is the **Supabase** `/auth/v1/callback`
- SSR PKCE: `@supabase/ssr` `exchangeCodeForSession` via existing `createClient`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Profile store

#### Automated

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run build` passes
- [x] 1.3 Migration file exists under `supabase/migrations/` and enables RLS

#### Manual

- [x] 1.4 `npx supabase db reset` (or `migration up`) applies cleanly on local Supabase
- [x] 1.5 Inserting an `auth.users` row creates a matching profiles row with null progress columns
- [x] 1.6 Anon/guest cannot select another user’s profiles (authenticated owner policy only)

### Phase 2: Google OAuth

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npm run build` passes
- [ ] 2.3 `supabase/.env` (if created) is gitignored; Google secrets are not in tracked files
- [ ] 2.4 New API routes export `prerender = false`

#### Manual

- [ ] 2.5 Google provider configured; local Auth restart picks up config/secrets
- [ ] 2.6 Google CTA completes and returns to `/` with a session (`/dashboard` shows email)
- [ ] 2.7 Denied consent / missing code lands on `/auth/signin?error=` (no 500)
- [ ] 2.8 Email/password sign-in and sign-up still work when used directly
- [ ] 2.9 `/` remains public with no session

### Phase 3: Practice header chrome

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run build` passes
- [ ] 3.3 `PROTECTED_ROUTES` still does not include `/`

#### Manual

- [ ] 3.4 Guest on `/` (~390px): immediate drill; tappable Sign in; no login wall; no H-scroll
- [ ] 3.5 Signed-in header on `/` after Google; practice island still works
- [ ] 3.6 Dashboard link + unauthenticated redirect + Back to practice
- [ ] 3.7 Sign out from header returns to `/` as guest
- [ ] 3.8 Email/password is not linked from the practice header
