# Practice UI contracts — Plan Brief

> Full plan: `context/changes/testing-practice-ui-contracts/plan.md`
> Research: `context/changes/testing-practice-ui-contracts/research.md`

## What & Why

A wrong answer must not show the correct key or name until Reveal (FR-003). The piano must stay usable on a phone without horizontal scroll (FR-010). This change adds the cheapest tests that catch those two regressions (test-plan §3 Phase 3, Risks #7 and #5) without snapshots or a full island mount.

## Starting Point

Standalone Node Vitest covers matching, rounds, guest `/`, and profile POST. No hook, round-UI, or piano tests. `revealed` is hook state; highlight/`"Correct note:"` are JSX. Piano is `flex-1 min-w-0` + `%` blacks. No jsdom or Testing Library yet.

## Desired End State

`npm test` fails if a wrong tap sets `revealed`, if highlight/`"Correct note:"` ignore `revealed`, or if the piano gains a px min-width. Cookbook §6.3 describes how to add the next UI-contract test. Default Vitest environment stays Node.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| #7 sequencing | `renderHook` + per-file jsdom pragma | Policy lives in the hook; avoid extracting a reducer | Research / Plan |
| #7 name/highlight | `readFile` source check of `PracticeRound.tsx` | Island mount pulls VexFlow/audio | Research / Plan |
| #5 geometry | Fit-class source contract + manual ~390px smoke | jsdom cannot prove overflow; `overflow-x-hidden` only clips | Research / Plan |
| Audio-on-wrong | Out of scope | FR-006 playback is not FR-003 visual reveal | Plan |
| Runner | Default `"node"`; no `getViteConfig` | Phase 1–2 lock; jsdom only on the hook file | Research |

## Scope

**In scope:** hook transition tests; reveal-wiring source check; piano fit-class source check; cookbook §6.3 / §6.6 note; `jsdom` + `@testing-library/react` as devDependencies.

**Out of scope:** `PracticeRound` mount, Playwright, snapshots, CI `npm test`, §1–§2 edits, production reveal/piano changes.

## Architecture / Approach

Keep Phase 1’s Node Vitest. One file opts into jsdom via pragma and drives `usePracticeRound` with `act`. Two Node files `readFile` the JSX map and piano classes, same idea as `protected-routes.test.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Reveal hook units | Transitions + highlight source check | Source regex too brittle; flipping whole suite to jsdom |
| 2. Phone layout | Fit classes; manual 390px | Treating overflow-hidden as “fits” |
| 3. Cookbook | §6.3 filled from what shipped | Writing a second style |

**Prerequisites:** Phase 1 runner (`npm test` already works).
**Estimated effort:** ~2 sessions across 3 phases.

## Open Risks & Assumptions

- `renderHook` + jsdom will lint cleanly; if `react-compiler` fires on tests, override `*.test.ts` only.
- Manual ~390px smoke is not a CI gate this rollout (Phase 4 still only adds `npm test` to CI).
- Shipped piano cap is `max-w-3xl`, not the archive’s `max-w-md`.

## Success Criteria (Summary)

- Wrong tap cannot auto-reveal without a red test; Next still required to leave the note.
- Piano cannot gain a px min-width without a red test; phone smoke still looks usable at ~390px.
- Next contributor can copy §6.3 + the reference tests.
