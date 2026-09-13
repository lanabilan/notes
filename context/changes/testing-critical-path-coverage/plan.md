# Critical-path coverage Implementation Plan

## Overview

Bootstrap a standalone Vitest runner and add unit tests that prove two product contracts: a piano tap is judged against the C4–G5 natural mapping (Risk #1), and a round is 10 notes with stepwise bounce and a summary that matches the tap log (Risk #3). Last phase fills `context/foundation/test-plan.md` §6.1 and §6.5 with the patterns that actually shipped.

## Current State Analysis

There is no test runner, no `npm test`, and no `*.test.*` files. Matching and round logic already live as pure functions in `src/lib/practice` (`isCorrectTap`, `createNoteResult`, `summarizeRound`, `generateRound`, `toVexKey`). The React hook is a thin consumer; the piano/staff do not re-judge. CI is lint + build only; wiring `npm test` into GitHub Actions is test-plan §3 Phase 4, not this change.

Research: `context/changes/testing-critical-path-coverage/research.md`.

## Desired End State

`npm test` runs Vitest in Node, without loading Astro. Colocated tests fail if the C4–G5 tap mapping, staff `toVexKey` map, 10-note generation, bounce-not-wrap, or live summary formula drift. Cookbook §6.1 / §6.5 name those files and oracles so the next matching/set rule is added the same way.

**Verify:** `npm test` and `npm run lint` pass; inverting one mapping-table row fails the suite; `generateRound` is never snapshotted; `getViteConfig` is not in the config.

### Key Discoveries:

- Judge is `target === tapped` in `src/lib/practice/scoring.ts:4-6`. Tests must not restate that as the expected value. Oracle is an independent (target, tap, expected) table from FR-001 / S-01 (`research.md` Risk #1).
- `toVexKey("C4")` → `c/4` is the staff-side of the same mapping. A wrong glyph still teaches the wrong note. Table the 12 drill naturals; do not mount VexFlow (`research.md` staff-glyph adjunct).
- `ROUND_LENGTH = 10` in `sets.ts:5` is shared by generator and hook. Assert length **`10` as a PRD literal**, not `toHaveLength(ROUND_LENGTH)` imported from the SUT (`research.md` Risk #3).
- Stepwise bounce was locked in S-01 plan review (not wrap). `generateRound` has no seed — many samples on the public API (`research.md` follow-up).
- `summarizeRound` includes wrongs in the mean and returns `averageResponseMs: null` on empty. FR-004 did not specify that; lock it as **current contract**, labeled in the test (`research.md` follow-up).
- Astro `getViteConfig()` loads this repo’s Cloudflare + Tailwind config and is a known crash surface (astro#15847 / #15878). Phase 1 uses a standalone Vitest config (`research.md` runner).

## What We're NOT Doing

- Hook / React / VexFlow / Playwright tests (stay-on-wrong, reveal, layout — test-plan §3 Phases 2–3, Risks #2 #5 #7)
- CI job for `npm test` (test-plan §3 Phase 4)
- `getViteConfig`, AstroContainer, jsdom, `vite-tsconfig-paths` unless the explicit `@` alias fails
- Snapshotting `generateRound()` output
- Importing `DRILL_NATURALS` or `ROUND_LENGTH` as the expected oracle
- `expect(isCorrectTap(a, b)).toBe(a === b)`
- Treating `Db4` as a tap `PitchId` (`sharp-flat-names`)
- Pitch playback, `formatPitchName`, profile save rounding, ESLint/CI redesign beyond a `*.test.ts` override if React rules fire on test files

## Implementation Approach

Four phases, cheapest signal first: runner so later files can execute; matching table (Risk #1); round properties (Risk #3); cookbook so the next test copies a real file.

Shared fixture in tests: a **literal** ordered C4–G5 list written in the test file (or a test-only fixture module that is not imported by production). Production `DRILL_NATURALS` is the SUT, not the expected value.

## Critical Implementation Details

**Timing & lifecycle.** Install Vitest and land a config that `vitest run` accepts *before* adding assertions. Default Vitest fails when zero test files exist — set `test.passWithNoTests: true` in Phase 1 (harmless after files land). Import `{ describe, expect, it }` from `"vitest"`; do not enable globals (avoids a `tsconfig` `types` dance with `projectService`).

**Oracle rules (load-bearing).** Mapping expected values come from music identity / FR-001 / S-01, not from calling `isCorrectTap` to build the table. Round length expected value is the number `10`. Drill-set membership expected value is the test’s own C4–G5 literal. Summary “wrongs in the mean / empty → null” must be commented as live contract, not FR-004.

**Vitest must not load Astro.** Do not import `getViteConfig` from `astro/config`. `tsconfig` paths are not applied automatically; the config must alias `@` → `./src`.

---

## Phase 1: Vitest runner

### Overview

Add Vitest so `npm test` executes TypeScript tests in Node with the `@/` alias, without booting Astro or Cloudflare.

### Changes Required:

#### 1. Dev dependency and script

**File**: `package.json`

**Intent**: Make a single, documented command the way tests are run locally.

**Contract**: Add `vitest` as a devDependency (implementer pins a version that runs on this repo’s Vite 7 / Node 22; floor ≥3.2). Add `"test": "vitest run"`. Do not add a CI step.

#### 2. Standalone Vitest config

**File**: `vitest.config.ts` (new)

**Intent**: Node environment + path alias, no Astro config merge.

**Contract**: `test.environment` is `"node"`. `test.passWithNoTests` is `true`. Resolve alias `@` to `./src` (fileURLToPath of `import.meta.url`). No `getViteConfig`. No jsdom.

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", passWithNoTests: true },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

#### 3. Lint / ignore hygiene

**File**: `eslint.config.js`, `.gitignore`

**Intent**: Test files type-check under existing `projectService`; React-compiler rules must not fail on non-React `*.test.ts`. Coverage output stays out of git.

**Contract**: If `npm run lint` errors on `*.test.ts` because of `react-compiler` / React recommended, add a `files: ["**/*.test.ts"]` override that turns those off. Append `coverage/` to `.gitignore`.

### Success Criteria:

#### Automated Verification:

- `npm test` exits 0 (zero tests is OK)
- `npm run lint` passes
- `vitest.config.ts` does not import `astro/config` or `getViteConfig`

#### Manual Verification:

- `npm test` output is clearly a Vitest run (not Astro / wrangler)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Matching units (Risk #1)

### Overview

Prove staff→key judgment and staff-glyph ids with independent tables. Happy-path C4/C4 is not enough.

**Behavior asserted:** same natural letter+octave is correct; any other piano id (wrong natural, octave twin, sharp, A5/B5) is wrong; each drill natural maps to the conventional VexFlow key (`C4` → `c/4`, … `G5` → `g/5`).

**Regression caught:** a swapped octave (C4 vs C5), a black-key tap marked correct against a natural, or `toVexKey("C4")` returning `d/4`.

**Research source:** `research.md` Risk #1 + staff-glyph adjunct; PRD FR-001; S-01 black keys as guesses (`context/archive/2026-08-25-guest-practice-round/plan.md`).

**Edge / boundary:** C4 vs C5; G5 vs A5; `C4` vs `C#4`; G5 vs G5 (still need one in-range correct besides C4).

**Anti-pattern avoided:** `expect(isCorrectTap(a,b)).toBe(a === b)`; building the expected table by calling the SUT; `Db4` as a tap id.

### Changes Required:

#### 1. Mapping table

**File**: `src/lib/practice/scoring.test.ts` (new)

**Intent**: Lock `isCorrectTap` / `createNoteResult` to the product mapping, not to string equality as a tautology.

**Contract**: Table (at least): `(C4,C4,true)`, `(C4,D4,false)`, `(C4,C5,false)`, `(C4,C#4,false)`, `(G5,A5,false)`, `(G5,G5,true)`. Assert `isCorrectTap` and `createNoteResult(...).correct` against those expected booleans. Do not import production `DRILL_NATURALS` to generate rows.

#### 2. Staff key table

**File**: `src/lib/practice/pitches.test.ts` (new)

**Intent**: Lock the glyph mapping so a staff/id drift cannot silently teach the wrong note.

**Contract**: For every pitch in the test’s C4–G5 literal, `toVexKey(pitch)` equals `{letter-lowercase}/{octave}` with no accidental (`C4` → `c/4`, `G5` → `g/5`). Do not instantiate VexFlow. Do not table black keys in this change.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- Inverting `(C4, C#4)` expected from false to true makes `npm test` fail

#### Manual Verification:

- A reader can add a new mapping row by copying the table (no need to read `isCorrectTap` body)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Round-contract units (Risk #3)

### Overview

Prove generation and summary without snapshotting RNG output.

**Behavior asserted:** `generateRound("random"|"stepwise")` always has length 10; every element is in the test’s C4–G5 literal; random has no immediate consecutive repeat; stepwise consecutive pairs are neighbors on that ordered list (C4’s only neighbor is D4; G5’s only neighbor is F5 — never G5→C4 wrap). `summarizeRound` on a hand-built log: 7/10 correct → `70`; average is mean of **all** `responseMs`; empty → `accuracyPercent: 0`, `averageResponseMs: null`.

**Regression caught:** round of 8 or 12; wrap from G5 to C4; random `C4,C4` adjacent; summary that drops wrongs from the mean; empty log reporting `0` ms instead of `null`.

**Research source:** `research.md` Risk #3 + follow-up; PRD FR-004 / FR-005; bounce lock in `context/archive/2026-08-25-guest-practice-round/reviews/plan-review.md`.

**Edge / boundary:** bounce at C4 and G5 (rely on enough samples to observe ends; 200 rounds per mode); empty summary; a log that mixes correct and wrong `responseMs`.

**Anti-pattern avoided:** `expect(generateRound("random")).toEqual(<recorded array>)`; `toHaveLength(ROUND_LENGTH)` imported from `sets.ts`; using `DRILL_NATURALS` as the expected membership set; claiming FR-004 specified “include wrongs.”

### Changes Required:

#### 1. Generator properties

**File**: `src/lib/practice/sets.test.ts` (new)

**Intent**: Lock length, set membership, no-adjacent-repeat (random), and bounce (stepwise) on the public API.

**Contract**: Independent ordered fixture: C4,D4,E4,F4,G4,A4,B4,C5,D5,E5,F5,G5. Run `generateRound` many times (on the order of 200 per mode). Every sample: `.length === 10`; every element ∈ fixture. Random: `notes[i] !== notes[i+1]`. Stepwise: for each adjacent pair, the second is a neighbor of the first on the fixture (index ± 1); never a jump from last to first. Comment that “no immediate repeat” is the live random refinement, not a PRD line.

#### 2. Summary of a tap log

**File**: `src/lib/practice/scoring.test.ts` (append)

**Intent**: Lock `summarizeRound` to an independent calculation from a hand-built `NoteResult[]`, and label the empty / include-wrongs behavior as current contract.

**Contract**: Build results explicitly (do not call `isCorrectTap` to fill `correct`). Example: 10 notes, 7 `correct: true`, known `responseMs` including wrongs → `accuracyPercent === 70`, `averageResponseMs ===` arithmetic mean of those ten numbers. Empty array → `accuracyPercent === 0`, `averageResponseMs === null`. Comment those two empty/include-wrongs expectations as live contract, not FR-004.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- No test file contains a recorded `generateRound` output array as `toEqual` expected value

#### Manual Verification:

- Stepwise tests mention bounce / neighbors in names or comments so a later accidental wrap is obvious

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 4: Cookbook (§6)

### Overview

Write what shipped into `context/foundation/test-plan.md` §6.1 and §6.5 so the next matching or set-rule test copies a real pattern. Do not invent a second style.

### Changes Required:

#### 1. Unit-test recipe

**File**: `context/foundation/test-plan.md` §6.1

**Intent**: Replace the TBD placeholder with location, naming, reference test, run command, and oracle rule.

**Contract**: Location `src/lib/practice/*.test.ts`. Naming `<module>.test.ts`. Reference test `src/lib/practice/scoring.test.ts`. Run locally `npm test`. Note: import from `vitest`; Node env; do not use `getViteConfig` for lib tests. Oracle: independent table / PRD literals, never copy the function under test.

#### 2. Practice-set / matching-rule recipe

**File**: `context/foundation/test-plan.md` §6.5

**Intent**: Tell a future change how to extend matching or generators without tautologies.

**Contract**: New matching rule → new row in the scoring table (spec from PRD/S-01, not from `===`). New set rule → property on `generateRound` against the test fixture list; length expected is `10`, not `ROUND_LENGTH`. Point at `sets.test.ts` as reference. Remind: black-key taps stay wrong until accidentals enter the drill set.

#### 3. Phase note

**File**: `context/foundation/test-plan.md` §6.6

**Intent**: Capture the runner gotcha so Phase 2+ of the rollout does not “fix” it by switching to `getViteConfig`.

**Contract**: 2–3 lines: standalone Vitest + `@` alias; do not load Astro for `src/lib/practice` tests; CI still does not run `npm test` until test-plan §3 Phase 4.

### Success Criteria:

#### Automated Verification:

- `npm test` still passes
- `npm run lint` still passes (markdown is prettier-only if staged)

#### Manual Verification:

- §6.1 and §6.5 no longer read “TBD”
- A new contributor could add a mapping row using only §6.1 / §6.5 and the reference files

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- Mapping table + `createNoteResult.correct` (Phase 2)
- `toVexKey` for 12 drill naturals (Phase 2)
- `generateRound` properties (Phase 3)
- `summarizeRound` on hand-built logs (Phase 3)

### Integration Tests:

- None this change (test-plan §3 Phase 2).

### Manual Testing Steps:

1. Run `npm test` and confirm Vitest, not Astro.
2. Flip `(C4, C#4)` to expected `true` and confirm the suite fails, then revert.
3. Skim `sets.test.ts` for snapshots of generator output (there should be none).

## Performance Considerations

None. Hundreds of `generateRound` calls are cheap.

## Migration Notes

None. No production behavior change.

## References

- Research: `context/changes/testing-critical-path-coverage/research.md`
- Test plan: `context/foundation/test-plan.md` §2 Risks #1 #3, §3 Phase 1, §6.1 §6.5
- PRD: FR-001, FR-004, FR-005
- S-01 bounce lock: `context/archive/2026-08-25-guest-practice-round/reviews/plan-review.md`
- Judge: `src/lib/practice/scoring.ts`
- Generators: `src/lib/practice/sets.ts`
- Glyph map: `src/lib/practice/pitches.ts` `toVexKey`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Vitest runner

#### Automated

- [x] 1.1 `npm test` exits 0 (zero tests is OK) — 546700b
- [x] 1.2 `npm run lint` passes — 546700b
- [x] 1.3 `vitest.config.ts` does not import `astro/config` or `getViteConfig` — 546700b

#### Manual

- [x] 1.4 `npm test` output is clearly a Vitest run (not Astro / wrangler) — 546700b

### Phase 2: Matching units (Risk #1)

#### Automated

- [x] 2.1 `npm test` passes — 0d571e3
- [x] 2.2 `npm run lint` passes — 0d571e3
- [x] 2.3 Inverting `(C4, C#4)` expected from false to true makes `npm test` fail — 0d571e3

#### Manual

- [x] 2.4 A reader can add a new mapping row by copying the table — 0d571e3

### Phase 3: Round-contract units (Risk #3)

#### Automated

- [x] 3.1 `npm test` passes — cd566e4
- [x] 3.2 `npm run lint` passes — cd566e4
- [x] 3.3 No test file contains a recorded `generateRound` output array as `toEqual` expected value — cd566e4

#### Manual

- [x] 3.4 Stepwise tests mention bounce / neighbors in names or comments — cd566e4

### Phase 4: Cookbook (§6)

#### Automated

- [x] 4.1 `npm test` still passes
- [x] 4.2 `npm run lint` still passes (markdown is prettier-only if staged)

#### Manual

- [x] 4.3 §6.1 and §6.5 no longer read “TBD”
- [x] 4.4 A new contributor could add a mapping row using only §6.1 / §6.5 and the reference files
