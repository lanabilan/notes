# Guest access and progress isolation — Plan Brief

> Full plan: `context/changes/testing-guest-access-and-progress-isolation/plan.md`
> Research: `context/changes/testing-guest-access-and-progress-isolation/research.md`

## What & Why

Guests must reach the drill at `/` without a login wall; signed-in progress must not write another user’s row or accept garbage. Phase 1 only covered matching/round units. This change adds the cheapest tests that catch those three regressions (test-plan §3 Phase 2, Risks #2 #4 #6).

## Starting Point

Standalone Vitest + practice-lib units exist. Middleware denylists only `/dashboard`. `POST /api/profile` uses `getUser().id` + zod. No auth/API tests. Vitest cannot run Astro `app.fetch` without the forbidden `getViteConfig`.

## Desired End State

`npm test` fails if `/` is protected, if home/shell redirect guests, if a guest POST writes, if body `id` retargets UPDATE, or if invalid progress is stored. Cookbook §6.2 / §6.4 describe how to add the next integration/API test the same way.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Risk #2 harness | Extract `isProtectedPath` + read home/shell source | No `app.fetch` in Node Vitest; array equality is an implementation mirror | Research / Plan |
| Home wall companion | `readFile` forbids unauthenticated redirect | Catches `index.astro` redirect that never touches the denylist | Plan |
| #4/#6 harness | Mock `astro:env/server`; `POST` + `APIContext` + recording client | Handler is the 400/401 boundary; service mock skips `.eq("id", …)` | Research / Plan |
| RLS | Park Docker two-user suite | App-gate recording client is enough for `npm test`; RLS is defense-in-depth | Research / Plan |
| Extra body `id` | Ownership case (200), not 400 | Zod strips unknown keys | Research |
| §2 Source backport | Defer to `--refresh` | This change only fills §6.2 / §6.4 | Plan |

## Scope

**In scope:** `isProtectedPath` extract + tests; `profile.test.ts` 401/400/IDOR/valid control; cookbook §6.2 / §6.4 / §6.6 note.

**Out of scope:** `getViteConfig`, preview HTTP, Playwright, CI `npm test`, Docker RLS, §1–§2 edits.

## Architecture / Approach

Keep Phase 1’s Node Vitest. Middleware calls a pure `isProtectedPath`. Profile tests stub env + Auth and record `.from("profiles").update().eq("id", …)` instead of talking to Postgres.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Guest path guard | `/` public, `/dashboard` gated, home source check | Source regex too brittle or too weak |
| 2. Profile POST | 401 / 400 table / extra `id` / valid control | Mocking the service by accident; treating extra `id` as 400 |
| 3. Cookbook | §6.2 / §6.4 filled from what shipped | Writing a second style |

**Prerequisites:** Phase 1 runner (`npm test` already works).
**Estimated effort:** ~2 sessions across 3 phases.

## Open Risks & Assumptions

- `startsWith("/dashboard")` is locked as live prefix behavior (not a PRD path list).
- Recording client must match the real `updateProfileProgress` chain or the spy lies.
- RLS remains untested until a later change budgets Docker.

## Success Criteria (Summary)

- Guest `/` cannot be gated without a red test; dashboard stays gated.
- Guest POST is 401 with no UPDATE; forged `id` cannot retarget; garbage is 400 with no UPDATE.
- Next contributor can copy §6.2 / §6.4 + the reference tests.
