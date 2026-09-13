# Critical-path coverage — Plan Brief

> Full plan: `context/changes/testing-critical-path-coverage/plan.md`
> Research: `context/changes/testing-critical-path-coverage/research.md`

## What & Why

The drill can teach the wrong staff→key mapping, or lie about round length / set mode / summary, with no automated signal. This change bootstraps Vitest and unit-tests those two contracts (test-plan §3 Phase 1, Risks #1 and #3) at the cheapest layer: pure functions in `src/lib/practice`.

## Starting Point

No test runner. Matching is `isCorrectTap` (`target === tapped`); rounds come from `generateRound` + `summarizeRound`. The hook does not re-judge. CI is lint + build only.

## Desired End State

`npm test` runs Node Vitest. A bad mapping row, a wrap at G5, or a 8-note generator fails the suite. Cookbook §6.1 / §6.5 describe how to add the next matching or set-rule test.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Test layer | Unit on `src/lib/practice` | Hook/UI do not re-implement the judge or generators | Research |
| Runner | Standalone Vitest `node` + `@` alias; no `getViteConfig` | Astro 6 + this Cloudflare config is a known crash surface | Research |
| Staff glyph | Include 12-natural `toVexKey` table | Wrong glyph still teaches the wrong note; still no VexFlow | Plan |
| Stepwise | Many samples on public `generateRound` | No seed; extracting a helper is extra surface | Plan |
| Summary formula | Lock live include-wrongs / empty→null, labeled current contract | FR-004 does not specify those details; drift would still mis-score | Plan |
| File layout | `src/lib/practice/*.test.ts` | Colocated reference for cookbook §6.1 | Plan |
| CI | Not this change | Test-plan §3 Phase 4 owns gates | Test plan |

## Scope

**In scope:** Vitest bootstrap; mapping + `toVexKey` tables; `generateRound` properties; live `summarizeRound` lock; cookbook §6.1 / §6.5 / short §6.6.

**Out of scope:** Hook/reveal/layout/e2e; CI `npm test`; snapshots of generators; `Db4` as a scoring id; playback / profile rounding.

## Architecture / Approach

Tests import `@/lib/practice`. Expected values come from a test-local C4–G5 list and explicit tables, never from `DRILL_NATURALS`, `ROUND_LENGTH`, or `a === b`. RNG is checked with ~200 samples per mode, not golden arrays.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Vitest runner | `npm test` in Node, no Astro | Accidentally using `getViteConfig` |
| 2. Matching units | Mapping + `toVexKey` tables | Tautological `a === b` oracle |
| 3. Round-contract units | Length 10, bounce, live summary | Snapshotting `generateRound` |
| 4. Cookbook | §6.1 / §6.5 filled | Cookbook that does not match the files |

**Prerequisites:** Research complete; Node 22 / existing Vite 7 override.
**Estimated effort:** ~1 session across 4 short phases.

## Open Risks & Assumptions

- Stepwise end-bounce depends on samples actually hitting C4/G5; 200 rounds should, but if not, increase samples rather than extracting a helper in this change.
- Vitest major is pinned at install time to whatever runs here (floor ≥3.2).
- `*.test.ts` may need an ESLint override if React-compiler rules apply to all `*.ts`.

## Success Criteria (Summary)

- `npm test` fails if C4 is judged equal to C#4 or C5, if a round is not 10 C4–G5 naturals, or if stepwise wraps G5→C4.
- A new matching rule is a new table row; a new set rule is a new property — per cookbook, not a copied implementation.
