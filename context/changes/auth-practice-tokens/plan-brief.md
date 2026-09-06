# Auth Practice Tokens — Plan Brief

> Full plan: `context/changes/auth-practice-tokens/plan.md`

## What & Why

`/auth/signin`, `/auth/signup`, and `/auth/confirm-email` still use leftover cosmic/purple glass from the starter. `/` and `/dashboard` already use calm light practice tokens. This change restyles auth so the sign-in hop feels like the same app, without touching auth flows.

## Starting Point

Practice tokens live in `src/styles/global.css` `:root`. Dashboard and `PracticeShell` already follow that recipe. Auth pages wrap a frosted card in `bg-cosmic`; form islands hardcode white/purple. S-02 deferred this restyle on purpose.

## Desired End State

A guest tapping Sign in lands on a centered light card on paper: solid ink title, slate primary CTAs, muted links, “Back to practice” to `/`. Signup and confirm-email match. Confirm-email has no emoji. `bg-cosmic` is deleted. POST targets and validation stay.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Scope | All three `/auth/*` pages | Leaving any page cosmic keeps the visual split | Plan |
| Chrome | Centered form, no practice header | Form stays the hero; smallest behavior change | Plan |
| Surface | Light `bg-card` + `border-border` + `rounded-xl` | Welcome card recipe groups fields without glass | Plan |
| Escape | “Back to practice” → `/` on every card | Middleware and header Sign in otherwise dead-end | Plan |
| Confirm-email | Drop emoji; heading + muted body + links | Practice UI does not use emoji as hero | Plan |
| Components | Restyle custom islands; no shadcn Input | `FormField` already owns icons/`endContent` | Plan |

## Scope

**In scope:** Token restyle of the three auth pages and shared form islands; “Back to practice”; confirm-email without emoji; delete `bg-cosmic`.

**Out of scope:** Auth API/OAuth; Google on signup; login wall; practice-shell header on auth; shadcn Input; Welcome/LibBadge; test runner; validation/flow changes.

## Architecture / Approach

In-place class swaps. Same centered `max-w-sm` structure; swap cosmic/purple/glass for practice tokens. Shared islands and all three pages land together so contrast never inverts. `SubmitButton` drops its purple override and uses default `Button`. Google stays a native POST with primary token classes.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Restyle auth to practice tokens | Light cards on all `/auth/*`; leftover cosmic CSS gone | Shared islands shipped without both pages → unreadable contrast |

**Prerequisites:** None beyond a running app (`npm run dev`); no schema or OAuth changes.
**Estimated effort:** ~1 session, single phase.

## Open Risks & Assumptions

- Lint will not catch leftover purple/`bg-cosmic`; grep + visual check are required.
- `LibBadge` still has purple; it is out of scope and unused on live routes.
- Signed-in users can still open `/auth/signin`; this change does not add a redirect.

## Success Criteria (Summary)

- All three auth pages look like `/` / `/dashboard` (light paper, slate primary, no cosmic/purple).
- Google → or → email, signup-without-Google, and error/validation behavior are unchanged.
- Every auth card can return to practice via an in-page link.
