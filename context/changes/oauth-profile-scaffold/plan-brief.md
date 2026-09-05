# OAuth Profile Scaffold — Plan Brief

> Full plan: `context/changes/oauth-profile-scaffold/plan.md`

## What & Why

Scaffold optional **Google** sign-in and a `public.profiles` row for signed-in users so S-02 can save scores and current set later. Guests keep an immediate, login-free drill; progress is never stored for them (FR-007 / FR-008).

## Starting Point

Email/password Supabase SSR already exists (cookie client, middleware `locals.user`, `/auth/*`, protected `/dashboard`). Practice at `/` has no auth chrome. There are no migrations, no OAuth callback, and no profiles table. Local Auth `site_url` still points at port 3000 while Astro serves 4321.

## Desired End State

A guest practices on `/` with a compact **Sign in** control. Google on `/auth/signin` returns them to `/` signed in; the header shows identity, Dashboard, and Sign out. Every new auth user has a profiles row with nullable last-round + `current_set` columns. The drill still does not read or write that row.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Provider | Google only | Lowest-friction consumer OAuth for a handful of users; one callback path. |
| Email/password | Keep routes; off practice chrome | Local/dev fallback without deleting starter auth or featuring it on the drill. |
| Profile depth | Columns now, no writes | S-02 only updates fields; one migration; matches FR-008. |
| Sign-in entry | Practice header + `/auth/signin` | Optional, always reachable, not a login wall. |
| Scores shape | `current_set` + last-round columns | Matches `PracticeSetMode` / `RoundSummary`; no history table. |
| Identity surface | Header + existing `/dashboard` | Reuse protected-route demo; S-02 can add scores there later. |
| OAuth errors | `/auth/signin?error=` | Same `ServerError` pattern as password sign-in. |
| Testing | Lint/build + manual Google | Repo has no test runner; OAuth needs a real browser. |

## Scope

**In scope:** `profiles` migration + RLS + insert trigger; Google start/callback; Google CTA on sign-in; compact practice header; dashboard identity tweak; Auth URL + README/CLAUDE.md updates.

**Out of scope:** Saving/loading practice progress (S-02); guest persistence; extra providers; removing email/password routes; test runner; fetching profiles on `/`.

## Architecture / Approach

Keep the **server-only** `@supabase/ssr` cookie client. `POST /api/auth/oauth` → Google → `GET /api/auth/callback` (`exchangeCodeForSession`) → `/`. A `SECURITY DEFINER` trigger creates `profiles` on `auth.users` insert. The practice header is Astro (`Astro.locals.user`), not a React island. Google client secrets live in Supabase Auth (local `supabase/.env` / hosted Dashboard), not Astro env.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Profile store | Table, RLS, trigger, `Profile` type | Trigger/`search_path` mistakes or RLS that blocks the owner |
| 2. Google OAuth | PKCE start/callback, provider + URL config, Google CTA | Redirect allow-list / `localhost` vs `127.0.0.1` / Google Cloud URI mix-up |
| 3. Practice header | Optional Sign in on `/`; dashboard back-link | Crowding the mobile drill or looking like a login wall |

**Prerequisites:** Local Supabase (Docker), a Google Cloud OAuth **web** client, Google provider secrets in Supabase (local and/or hosted).
**Estimated effort:** ~2–3 sessions across 3 phases (Phase 2 blocked on Google Cloud + redirect config).

## Open Risks & Assumptions

- Hosted Cloudflare origin must be added to the **hosted** Supabase redirect allow-list at deploy time — `config.toml` only covers local CLI.
- Users created before the trigger are backfilled in the same migration; if Auth is empty, backfill is a no-op.
- Same-email Google vs existing password user uses default Supabase behavior (error surfaces on `/auth/signin`); no automatic linking work in this change.

## Success Criteria (Summary)

- Guest can finish practice on `/` with no login wall.
- Google sign-in returns to `/` with a session and a `profiles` row (progress columns still null).
- Signed-in header + `/dashboard` work; sign-out returns to guest; email/password still works if opened directly.
