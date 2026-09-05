---
topic: oauth-profile-progress
change_id: oauth-profile-progress
researcher: agent
date: 2026-09-05
status: complete
---

# Research: OAuth profile progress (S-02 / FR-008)

> Grounding for `/10x-plan oauth-profile-progress`. Prefer `prd.md` over `MVP.md` where they conflict.
>
> Note: `/10x-research` is not installed in this repo’s skill set; this doc was produced ad-hoc to the schema `/10x-plan` expects.

## Goal

Let a **signed-in** learner keep last-round scores and current set mode in their OAuth `profiles` row, so progress survives refresh and a later session — without a login wall, without guest storage, and without turning the profile into history charts or multi-device sync.

## Product requirements (authoritative)

**Sources:** `context/foundation/prd.md` (FR-007, FR-008, Access Control, Guardrails, Non-Goals), `context/foundation/roadmap.md` (S-02), archived F-02 plan (`context/archive/2026-09-05-oauth-profile-scaffold/`).

| ID / source | Must-have behavior for this change |
| --- | --- |
| FR-008 | Signed-in user can save progress **only** in their OAuth profile (**scores**, **current set**); guests have no profile storage |
| FR-007 | Guest can practice without signing in; guest progress is **session-only and is not saved** |
| Access Control | Flat model: guest = practice only (no saved progress); signed-in = same practice + profile-saved progress. No admin/member roles |
| Guardrails | No ads/paywall; **no login wall** to start practicing |
| FR-009 | One screen + one-line prompt — **no settings maze** (progress UI must not become a settings page) |
| FR-010 | Mobile-first; no H-scroll; large targets |
| NFR | Visual feedback still within ~200 ms of tap; no ads/tracking; guest practice requires no account data beyond optional OAuth |
| Roadmap S-02 | Signed-in user can save practice progress (scores, current set); guests still practice without saving |
| Roadmap risk | Under `time`, resist history charts or multi-device sync beyond “saved progress” |

**What F-02 already locked (do not reopen):**

- Provider is **Google** (email/password routes remain, off practice chrome)
- `public.profiles` columns = `current_set` (`random` \| `stepwise`) + last-round `last_accuracy_percent` / `last_average_response_ms` / `last_completed_at`
- No history table; no client INSERT (trigger owns row creation); owner SELECT + UPDATE via RLS
- Practice header is Astro (`PracticeAuthBar`); island stays practice-only unless S-02 needs a prop/API
- No browser Supabase client (F-02 “NOT Doing”)

**Out of this change (explicit):**

- Guest persistence (`localStorage`, cookies for scores, anonymous Supabase) — PRD Non-Goal; prefer PRD over MVP.md
- History tables, charts, round replay, per-note sequences
- Multi-device sync as a product surface beyond “the same profile row is the source of truth”
- Extra OAuth providers, avatars, display names
- Adding `/` to `PROTECTED_ROUTES` or prompting login before/during a round
- Changing round length, scoring rules, VexFlow, pitch playback, mute persistence
- FR-006 / FR-011 (parked)
- Adding a test runner (repo still has none)

**MVP.md conflict:** MVP says guest last-score in `localStorage` and “session state survives refresh.” PRD forbids guest persistence and requires optional OAuth profile storage. **Prefer PRD.**

**Roadmap stale blocker:** S-02 detail still lists “Which OAuth provider(s)” as Block: yes and status `blocked`. F-02 chose Google and is archived. S-02 is unblocked on provider; the glance table already says `proposed`. Docs cleanup is optional during plan — not a product unknown.

## Foundation already shipped

### S-01 — guest practice round

| Contract | Detail |
| --- | --- |
| Public URL | https://readthekey.readthekey.workers.dev |
| Home | `/` → `Layout` + `PracticeShell` + `PracticeRound` (`client:only="react"`) |
| Loop | 10 notes, C4–G5 naturals; random or stepwise; summary = accuracy + avg ms |
| Persistence | **None** — React memory in `usePracticeRound`; refresh resets to `mode: "random"` |
| Archive | `context/archive/2026-08-25-guest-practice-round/` |

### F-02 — OAuth + profile scaffold

| Contract | Detail |
| --- | --- |
| Sign-in | Google PKCE: `POST /api/auth/oauth` → `GET /api/auth/callback` → `/` |
| Session | Cookie SSR `@supabase/ssr`; middleware `getUser()` → `Astro.locals.user` |
| Header | Guest: Sign in → `/auth/signin`. Signed-in: email local-part, Dashboard, Sign out |
| Profile row | Trigger on `auth.users` INSERT creates `profiles (id)` with **null** progress columns |
| Dashboard | Email + Sign out + Back to practice; **does not read profiles** |
| Protected | `PROTECTED_ROUTES = ["/dashboard"]` only — `/` stays public |
| Archive | `context/archive/2026-09-05-oauth-profile-scaffold/` (commits `027cf2d`, `d9b0474`, `2e75da2`) |

## Code references

### Auth / session (reuse; do not re-scaffold)

| File | Role |
| --- | --- |
| `src/lib/supabase.ts` | Cookie-aware `createServerClient`; returns `null` if env missing |
| `src/middleware.ts` | `getUser()` → `locals.user`; gates `/dashboard` only |
| `src/pages/api/auth/oauth.ts` | Google PKCE start; `prerender = false` |
| `src/pages/api/auth/callback.ts` | `exchangeCodeForSession` → redirect `/` |
| `src/pages/api/auth/signout.ts` | `signOut` → `/` |
| `src/components/PracticeAuthBar.astro` | Optional sign-in chrome on `/` |
| `src/pages/dashboard.astro` | Identity page F-02 left for S-02 to extend |
| `src/pages/auth/signin.astro` | Google CTA + email fallback |

### Profile store (schema ready, unused)

| File | Role |
| --- | --- |
| `supabase/migrations/20260905144500_create_profiles.sql` | Table + RLS (SELECT/UPDATE own) + insert trigger + `updated_at` |
| `src/types.ts` | `Profile` — comment: “Progress fields stay unused until S-02” |

There is **no** `.from("profiles")` anywhere under `src/`. No `src/lib/services/`. No `/api/profile*`.

### Practice loop (where save/load would hook)

| File | Role |
| --- | --- |
| `src/components/hooks/usePracticeRound.ts` | In-memory engine. Default `mode: "random"`. Summary only when `uiPhase === "summary"`. `startRound(nextMode)` is the mode switch. |
| `src/components/practice/PracticeRound.tsx` | Island: no user/session props. Summary CTAs “Practice again” / “Next set”. Displays `Math.round` of accuracy and avg ms. Mute (`soundOn`) is session-only — **not** a profile field. |
| `src/components/PracticeShell.astro` | Astro chrome; mounts island with **no props**. Could SSR-seed the island if the plan chooses that. |
| `src/lib/practice/scoring.ts` | `summarizeRound` → `RoundSummary` (accuracy 0–100 float, avg ms float or null) |
| `src/lib/practice/sets.ts` | `ROUND_LENGTH = 10`; `generateRound("random" \| "stepwise")` |

### Conventions (CLAUDE.md)

- Astro chrome; React only for interactivity; **no** `"use client"`
- API routes: uppercase `GET`/`POST`, `prerender = false`, **validate with zod** (zod is **not** in `package.json`; F-02 skipped it for a fixed Google provider)
- Business logic → `src/lib/` or `src/lib/services/`
- Shared types → `src/types.ts`
- Keep server-only Supabase cookie client
- No test runner — verify with `npm run lint` + `npm run build` + manual pass

## Architecture insights

1. **The persistence shape is already decided.** F-02 columns match `PracticeSetMode` + last `RoundSummary`. S-02 writes/reads that snapshot. Inventing a history table would violate the F-02 contract and the roadmap risk note.

2. **Nothing reads or writes `profiles` today.** Practice always starts `"random"`. Dashboard never shows scores. A signed-in user who completes 10 notes and refreshes looks identical to a guest.

3. **The island is auth-blind.** `PracticeRound` takes no props; `usePracticeRound` has no fetch. Auth lives in Astro (`locals.user`). Wiring save/load requires a **bridge**: SSR props into `client:only`, and/or a cookie-session API the island `fetch`es. F-02 forbade a browser Supabase client — do not add one.

4. **Complete summary exists in one place.** `goToNext` sets `uiPhase: "summary"` when `nextResults.length >= ROUND_LENGTH`; the hook then exposes `summarizeRound(results)`. That transition is the natural **save** moment. Mid-round state (`index`, `notes[]`, `results[]`) is **not** in `Profile` and should not be persisted in this slice.

5. **`current_set` is overloaded.** In the hook it is the mode of the round just played. “Practice again” keeps it; “Next set” switches before a new round starts. The column might mean (a) last completed mode, (b) preferred next mode after “Next set”, or (c) both written at different times. Plan must pick; research must not.

6. **OAuth roundtrip wipes in-memory progress.** Sign-in from the header goes to Google and returns to `/`, remounting the island. A guest who finishes a round then signs in **cannot** flush that summary unless S-02 adds a guest buffer (PRD forbids guest persistence). Treat mid-session sign-in as a new session, or explicitly decide otherwise in the plan.

7. **RLS already allows the write path.** Authenticated owner UPDATE is in place; there is no INSERT policy (correct — trigger created the row). Client/API must UPDATE the existing row, not insert. Anon/guest cannot select.

8. **Accuracy storage vs display.** UI shows `Math.round(accuracyPercent)` and `Math.round(averageResponseMs)`. DB is `real` / `integer`. Whether to store the raw float or the rounded display value is a plan detail. `last_average_response_ms` is integer — must round or truncate on write. Empty-round `averageResponseMs: null` cannot happen for a finished 10-note round.

9. **Offline NFR vs save.** Guest drill is already client-only and works offline after first load. Profile write needs the network. A failed save must not block the visual loop (~200 ms NFR) or the summary CTAs. Queue-vs-silent-fail is a plan decision.

10. **zod vs F-02 exception.** CLAUDE.md says API input uses zod; F-02 skipped adding it because Google was hard-coded. A profile PATCH with `current_set` + scores **does** have a body worth validating. Adding `zod` for S-02 is consistent with CLAUDE.md; skipping it for a tiny trusted island payload is the F-02 precedent. Plan decides.

11. **Dashboard vs in-drill restore.** F-02 left `/dashboard` as “the account surface S-02 can later extend.” Restoring `current_set` into the next round is a **practice** concern; showing last scores could live on dashboard, on `/` summary chrome, or both. FR-009 argues against a settings maze — a couple of numbers on dashboard or a quiet seed of mode on `/` stays thin.

12. **No new migration is required** unless the plan expands the schema. Columns, checks, RLS, and `updated_at` trigger already exist.

## Gaps this change must implement

- Server path to **UPDATE** `profiles` with last-round metrics + `current_set` for `auth.uid()` only
- Server path to **SELECT** the signed-in user’s profile (for restore and/or dashboard)
- Bridge from the React island to that path without a browser Supabase client
- Restore `current_set` (and/or last scores) when a signed-in user opens `/` — today always `"random"`
- Guest path unchanged: no writes, no login wall, island still playable with `locals.user === null`
- Failed save / missing profile row / missing Supabase env: degrade without breaking the drill
- Optional: show last scores on `/dashboard` (F-02 explicitly deferred this)
- Manual pass: signed-in complete round → refresh → mode/scores still there; guest complete round → refresh → gone; phone-width header still no H-scroll

## Decisions for `/10x-plan` (do not invent here)

1. **Save trigger:** on summary only, vs also when the learner taps “Next set” before a new round, vs both
2. **Load behavior:** seed `usePracticeRound` initial `mode` from `current_set`, vs start random and only *display* last scores, vs both
3. **Where last scores appear:** `/dashboard` only, quiet on `/` (e.g. after load or on summary), or both
4. **Write path:** island `fetch` to a new `/api/profile` (or similar) vs form POST vs Astro server action; request body validation (add zod or not)
5. **SSR seed vs client fetch:** pass `initialProfile` / `signedIn` props from `PracticeShell` into `client:only`, vs fetch after mount, vs both (SSR for mode, fetch for save)
6. **Mid-session sign-in:** accept lost in-memory round (OAuth remount), vs any allowed buffer that is **not** guest persistence
7. **Offline / failed write:** silent ignore, retry once, or a one-line error that does not block Practice again / Next set
8. **Rounding:** store `Math.round` of UI values vs raw floats (avg ms still must become integer)
9. **Dashboard scope:** add last-round fields this slice, or save/load only and leave dashboard email-only
10. **Whether a schema change is needed at all** (default: no — F-02 columns are the FR-008 contract)

## Suggested next step

→ `/10x-plan oauth-profile-progress`

Optional: `/10x-frame oauth-profile-progress` only if product wants to reopen last-snapshot vs history, or guest `localStorage`, against the locked PRD + F-02 schema.
