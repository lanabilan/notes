# OAuth Profile Progress — Plan Brief

> Full plan: `context/changes/oauth-profile-progress/plan.md`
> Research: `context/changes/oauth-profile-progress/research.md`

## What & Why

Signed-in learners need FR-008: last-round scores and current set stored in their OAuth profile so progress survives refresh. Guests keep a login-free, session-only drill (FR-007). F-02 already created the row; this slice only reads and writes it.

## Starting Point

Google sign-in, cookie sessions, and `public.profiles` (nullable `current_set` + last accuracy / avg ms / completed-at) are live. The practice island always starts `"random"` in React memory. Dashboard is email-only on leftover cosmic chrome. No code touches `profiles`.

## Desired End State

A signed-in user opens `/` in their last finished set, completes 10 notes, and that snapshot is saved silently. `/dashboard` (practice tokens) shows those numbers or “No saved round yet.” Guests never write. A failed save does not block the loop. Signing in mid-session drops the in-memory guest round.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Persistence shape | Last-round columns only; no new migration | F-02 schema is the FR-008 contract | Research |
| Save trigger | On round summary only | One write; matches last-round columns | Plan |
| Load | Seed `usePracticeRound` from `current_set` (null → random) | Saved set has to affect the drill | Plan |
| Score UI | Dashboard only | Keep `/` as the one-screen drill (FR-009) | Plan |
| Failed save | Silent; CTAs stay live | Must not block practice or the 200 ms NFR | Plan |
| Mid-session sign-in | Accept lost in-memory round | PRD forbids guest storage; OAuth remounts `/` | Plan |
| Dashboard look | Restyle to practice tokens | Same app as `/`; drop cosmic starter chrome | Plan |
| Bridge | SSR props for load; `POST /api/profile` for save | No browser Supabase client; no guest queries | Research / Plan |
| Validation | Add `zod` on the POST body | First JSON API; matches CLAUDE.md | Plan |

## Scope

**In scope:** Profile service; `POST /api/profile`; SSR seed + silent save from the island; dashboard last-round UI in practice tokens; CLAUDE.md API note.

**Out of scope:** Guest persistence; history/charts; scores on `/`; save on Next set; save error chrome; extra providers; middleware profile fetch; auth-page restyle; test runner.

## Architecture / Approach

Astro SELECT via `src/lib/services/profile.ts` on `/` (signed-in) and `/dashboard`. `PracticeShell` passes `initialMode` + `canPersist` into the `client:only` island. On summary the island fire-and-forget POSTs rounded last-round fields; the server sets `last_completed_at`. UPDATE only (trigger owns INSERT). Guests: no SELECT, no POST.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Service + save API | zod + UPDATE route + helpers | Wrong RLS/upsert attempt; body vs column mismatch |
| 2. Practice load + save | Restore set on `/`; silent save on summary | Double POST in Strict Mode; guest accidentally fetching |
| 3. Dashboard UI | Last scores on practice-token dashboard | Crowding mobile; restyle drifting into a redesign |

**Prerequisites:** F-02 applied (`profiles` + Google); local or hosted Supabase session.
**Estimated effort:** ~2 sessions across 3 phases.

## Open Risks & Assumptions

- A missing `profiles` row (trigger skipped) fails UPDATE silently — learner keeps practicing.
- Hosted redirect/session already works from F-02; this slice does not re-touch OAuth URLs.
- Roadmap S-02 “blocked on provider” is stale (Google shipped); not a build blocker.

## Success Criteria (Summary)

- Signed-in: finish a round, refresh `/`, continue in the same set; dashboard shows that summary.
- Guest: refresh loses the round; no profile traffic.
- Save failure and mid-session Google sign-in never wall or brick the drill.
