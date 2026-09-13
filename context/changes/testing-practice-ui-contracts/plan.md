# Practice UI contracts Implementation Plan

## Overview

Add tests that prove two product contracts: a wrong tap does not reveal the correct key or note name until Reveal (Risk #7), and the practice piano stays a shrinking full-width row rather than a px-min-width keyboard that would overflow a phone (Risk #5). Last phase fills `context/foundation/test-plan.md` §6.3 with the patterns that actually shipped.

## Current State Analysis

Phases 1–2 left standalone Node Vitest, practice-lib units, and guest/profile integration tests. There are **no** tests for `usePracticeRound`, `PracticeRound`, or `PianoKeyboard`. Reveal sequencing is hook state (`revealed` stays false on wrong; only `reveal()` sets it). Highlight and `"Correct note:"` are a one-line JSX map. The piano is 14 `flex-1 min-w-0` whites plus `%` blacks, capped `max-w-3xl`. Parents use `overflow-x-hidden`, which can **mask** overflow. `package.json` has no `jsdom` or `@testing-library/react`. CI still does not run `npm test` (test-plan §3 Phase 4).

Research: `context/changes/testing-practice-ui-contracts/research.md`.

## Desired End State

`npm test` still defaults to Node Vitest without loading Astro. Hook tests fail if a wrong tap sets `revealed`, if Reveal is skipped as a no-op when `uiPhase === "wrong"`, or if Next is not required to leave the note. A source check fails if `highlightPitch` or `"Correct note:"` is no longer gated on `revealed`. A piano source check fails if white keys lose `min-w-0` / `flex-1` or gain a px `min-width`. Cookbook §6.3 names those files and oracles. Default `vitest.config.ts` environment stays `"node"`.

**Verify:** `npm test` and `npm run lint` pass; expecting `revealed === true` after a wrong tap makes the suite fail; `getViteConfig` is still absent; `Welcome.astro` is not snapshotted.

### Key Discoveries:

- Wrong path does not call `setRevealed(true)` (`usePracticeRound.ts:110-113`). Only `reveal()` does, and only when `uiPhase === "wrong"` (`117-120`). Next is optional-reveal then `goToNext` (`122-126`) (`research.md` Risk #7).
- `highlightPitch = round.revealed ? round.target : null` (`PracticeRound.tsx:85`). `"Correct note:"` only in `promptFor` when `state.revealed` (`23-31`). `"Wrong"` on the score row is `lastFeedback`, not reveal (`research.md` Risk #7).
- Staff always draws `round.target`. Optional `playPitch(result.target)` on a judged tap is FR-006, not FR-003. Neither is this phase’s oracle (`research.md` Insights #5).
- Piano fit is `min-w-0 flex-1` + `%` blacks, not `overflow-x-hidden`. Clip ≠ fit (`research.md` Insight #3). Viewport ~390px is archive verification, not a `src/` literal.
- Mounting `PracticeRound` pulls VexFlow (`StaffNote`) and `AudioContext` (`playback`). Hook file has neither (`research.md` Risk #7).
- Phase 2 source-check pattern: `readFileSync` in `src/lib/auth/protected-routes.test.ts:23-43`. Transfer that for JSX map + piano classes.

## What We're NOT Doing

- Mounting `PracticeRound` / `StaffNote` / VexFlow in tests
- Screenshot or visual snapshot of a highlighted key, marketing chrome, or `Welcome.astro`
- Playwright / full browser e2e of the guest drill (test-plan §7)
- jsdom layout (`scrollWidth`, computed key px) as a phone-fit oracle
- Flipping the whole suite to jsdom; `getViteConfig`; `app.fetch`; AstroContainer
- Extracting a production reducer from the hook (harness is `renderHook`)
- Exporting `promptFor` / a highlight helper
- Treating `playPitch(target)` on wrong as a Risk #7 leak (cookbook notes it is not reveal)
- Asserting key `aria-label` or the staff glyph as the reveal oracle
- Treating `overflow-x-hidden` as proof the piano fits
- CI job for `npm test` (test-plan §3 Phase 4)
- Editing test-plan §1–§2 (no Source backport)
- Changing live reveal or piano product behavior (tests only)

## Implementation Approach

Three phases, cheapest signal first: hook units so wrong cannot auto-reveal without a red test; then piano **fit** classes (not clip); cookbook so the next UI-contract test copies a real file.

Shared rules from Phases 1–2: import `{ describe, expect, it }` from `"vitest"` (no globals); keep `vitest.config.ts` standalone; default environment `"node"`.

## Critical Implementation Details

**Scoped jsdom, not a runner rewrite.** Default `test.environment` stays `"node"`. Put `// @vitest-environment jsdom` at the top of the hook test file only. Do not add `environmentMatchGlobs` that catch all `*.test.ts`. Do not import `getViteConfig`.

**Wrong tap without seeding `generateRound`.** After `renderHook(() => usePracticeRound())`, derive a guaranteed miss from the live target (e.g. tap `"D4"` if `target === "C4"`, otherwise tap `"C4"`). Do not snapshot `notes`. Do not `vi.mock` `generateRound` unless a test cannot otherwise stay on the same note (it can: wrong does not advance `index`).

**Clip vs fit.** Piano tests must require `min-w-0`, `flex-1`, `w-full`, and forbid a px `min-w-[` / `w-[Npx]` on `PianoKeyboard.tsx`. Do **not** treat `overflow-x-hidden` on Layout/shell/round as the Risk #5 oracle.

**Oracle rules (load-bearing).** `lastFeedback === "wrong"` with `revealed === false` is the “feedback ≠ reveal” challenge. `"Correct note:"` / `highlightPitch === target` are reveal. Staff target and playback of the correct pitch are not.

---

## Phase 1: Reveal hook units (Risk #7)

### Overview

Install a DOM harness used only by the hook test. Prove stay-on-note → optional Reveal → Next in `usePracticeRound`. Prove `PracticeRound.tsx` still maps highlight and `"Correct note:"` through `revealed` via a source check (Phase 2 `readFile` pattern). Do **not** render the island.

**Behavior asserted:** wrong tap → `uiPhase === "wrong"`, `revealed === false`, same `index`/`target`, `lastFeedback === "wrong"`; `reveal()` → `revealed === true`, same `index`; `nextAfterWrong()` without reveal → `revealed === false` and `index` advanced (or `uiPhase === "summary"` after the 10th); `reveal()` / `nextAfterWrong()` no-op when `uiPhase === "playing"`. Source still contains `highlightPitch = round.revealed ? round.target : null` (or equivalent) and gates `"Correct note:"` on `revealed`.

**Regression caught:** `setRevealed(true)` on the wrong branch; Reveal becoming a no-op; Next auto-firing on wrong; wiring `highlightPitch={round.target}` always; putting `"Correct note:"` in the unrevealed prompt.

**Research:** `research.md` Risk #7 + Insights #1, #4, #5.

**Edge:** Reveal remains optional (Next without Reveal still advances). `reveal()` while already revealed may stay true (current contract). Do not wait on `CORRECT_DWELL_MS` (correct path is out of this phase).

**Anti-pattern avoided:** screenshot of a highlighted key; asserting `aria-label`; mounting `PracticeRound`; treating `"Wrong"` text as reveal.

### Changes Required:

#### 1. Harness deps (hook tests only)

**File**: `package.json`, `vitest.config.ts` (only if a default-env comment is needed — prefer **no** config change)

**Intent**: Let `renderHook` run without switching lib/API tests off Node or loading Astro.

**Contract**: Add `jsdom` and `@testing-library/react` as devDependencies (implementer pins versions compatible with Vitest 5 / React 19). Default `test.environment` remains `"node"`. No `getViteConfig`. No `@testing-library/jest-dom` unless a later phase queries DOM (this phase does not). If `npm run lint` fails on the new test because of `react-compiler`, add a `**/*.test.ts` override that turns that rule off — do not weaken it for production `*.tsx`.

#### 2. Hook transition tests

**File**: `src/components/hooks/usePracticeRound.test.ts` (new)

**Intent**: Lock FR-003 / S-01 sequencing in the module that owns it.

**Contract**: File starts with `// @vitest-environment jsdom`. Import `renderHook` / `act` from `@testing-library/react` and `{ describe, expect, it }` from `"vitest"`. Drive `onNote` / `reveal` / `nextAfterWrong` through `act`. Independent miss: `target === "C4" ? "D4" : "C4"` (product: those are different drill naturals, not copied from `isCorrectTap`). Assert the table in Overview. Include one case where `lastFeedback === "wrong"` and `revealed === false` together. Do not import `PracticeRound`. Do not mock playback or VexFlow (the hook does not load them).

```ts
// @vitest-environment jsdom
```

#### 3. Reveal wiring source check

**File**: `src/components/practice/PracticeRound.reveal-source.test.ts` (new) — Node, **no** jsdom pragma

**Intent**: Catch `highlightPitch={round.target}` or an unrevealed `"Correct note:"` without mounting VexFlow.

**Contract**: `readFileSync` of `src/components/practice/PracticeRound.tsx` (same `repoRoot` style as `protected-routes.test.ts`). Fail if `highlightPitch` is not assigned from `round.revealed ? round.target : null` (allow only incidental whitespace). Fail if `"Correct note:"` appears in a prompt branch that is not gated on `revealed` / `state.revealed`. Do not snapshot the whole file. Do not parse JSX into a tree.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- `vitest.config.ts` still does not import `astro/config` or `getViteConfig`; default environment is still `"node"`
- Expecting `revealed === true` immediately after a wrong tap makes `npm test` fail
- Removing `round.revealed ?` from the `highlightPitch` assignment makes `npm test` fail

#### Manual Verification:

- A reader can see stay → optional Reveal → Next from the hook tests without opening `PracticeRound.tsx`
- A comment near the `lastFeedback` assertion states that `"Wrong"` feedback is not reveal

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Phone layout contract (Risk #5)

### Overview

Prove the piano’s **fit** contract in source: it scales with the container (`min-w-0 flex-1`, `%` blacks, `w-full`) and does not declare a px min-width that would overflow ~390px. Manual smoke at ~390px is the real-geometry check. Automated tests must not claim `scrollWidth` or treat overflow clip as fit.

**Behavior asserted:** `PianoKeyboard.tsx` keeps `w-full`, `aspect-[16/5]`, white keys `min-w-0` and `flex-1`, `min-h-11` on keys, black width as `%`. Source does not contain `100vw` or a px `min-w-[` / `w-[Npx]` on that file. Manual: at ~390px viewport, practice `/` has no page horizontal scroll and white/black keys still receive taps.

**Regression caught:** `min-w-[2rem]` (or similar) on whites; fixed `w-[800px]` keyboard; replacing `%` black width with px.

**Research:** `research.md` Risk #5 + Insight #3.

**Edge:** `overflow-hidden` on the keyboard wrapper is clip (blacks must not paint outside the row) — allowed, not the fit oracle. Desktop `max-w-3xl` is the width cap; do not assert `max-w-md` (archive plan, not shipped). `sm:` on PracticeRound is spacing, not this contract.

**Anti-pattern avoided:** visual snapshots of `Welcome.astro` / cosmic leftovers; jsdom `scrollWidth`; Playwright this rollout; asserting only `overflow-x-hidden` on Layout.

### Changes Required:

#### 1. Piano fit-class source check

**File**: `src/components/practice/PianoKeyboard.test.ts` (new) — Node, no jsdom pragma

**Intent**: Fail when the keyboard stops shrinking with its container — the failure that makes a phone unusable even if overflow is hidden.

**Contract**: Read `src/components/practice/PianoKeyboard.tsx`. Require `w-full`, `aspect-[16/5]`, `min-w-0`, `flex-1`, `min-h-11`, and a black-key `width` style that uses `%` (the live `widthPercent` assignment). Forbid `\b100vw\b`, `min-w-[`, and `w-[\d+px]`. Do not require `overflow-x-hidden`. Do not import computed styles. Do not snapshot CSS. Optional: `PIANO_WHITE_KEYS.length === 14` in `pitches.ts` as the two-octave product count (literal `14`, not imported `WHITE_COUNT` as expected).

#### 2. Do not snapshot leftovers

**File**: none (constraint on this phase)

**Intent**: Keep interview Q5 / test-plan §7.

**Contract**: No new snapshot files. No test reads `src/components/Welcome.astro` as a visual oracle.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- Adding `min-w-[800px]` to a white-key `className` in `PianoKeyboard.tsx` makes `npm test` fail
- No `*.snap` files added under `src/`

#### Manual Verification:

- At ~390px width (browser or device), `/` practice piano does not cause page horizontal scroll and keys remain tappable
- `Welcome.astro` was not used as a test oracle

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 3: Cookbook (§6.3 / §6.6)

### Overview

Write what shipped into `context/foundation/test-plan.md` §6.3 and a Phase 3 note in §6.6. Do not invent a second style. Do not edit §1–§2.

### Changes Required:

#### 1. Practice UI contract recipe

**File**: `context/foundation/test-plan.md` §6.3

**Intent**: Replace TBD with how to add reveal / phone-fit tests.

**Contract**: Hook tests: `src/components/hooks/usePracticeRound.test.ts`, `// @vitest-environment jsdom`, `renderHook` + `act`, miss derived from live `target`, assert `revealed` / `uiPhase` / `index`. Reveal wiring: `PracticeRound.reveal-source.test.ts` source check — not island mount. Phone: `PianoKeyboard.test.ts` fit classes, not overflow-hidden, not snapshots. Import from `vitest`. Run `npm test`. Name anti-patterns: highlighted-key screenshot, `aria-label` as reveal, `playPitch(target)` as reveal, jsdom layout, `getViteConfig`. Reference the three new files.

#### 2. Phase note

**File**: `context/foundation/test-plan.md` §6.6

**Intent**: Stop someone “fixing” hook tests by switching the whole runner to jsdom or `getViteConfig`.

**Contract**: 2–4 lines: default Node stays; jsdom is a per-file pragma on the hook test only; layout is a fit-class source check plus manual ~390px smoke; CI still no `npm test` until §3 Phase 4.

### Success Criteria:

#### Automated Verification:

- `npm test` still passes
- `npm run lint` still passes (markdown is prettier-only if staged)

#### Manual Verification:

- §6.3 no longer reads “TBD”
- A new contributor could add a reveal transition using only §6.3 and `usePracticeRound.test.ts`
- §2 risk Source cells are unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- `usePracticeRound` wrong / reveal / next / no-ops (Phase 1, jsdom hook harness)
- `PracticeRound.tsx` reveal-wiring source check (Phase 1, Node)
- `PianoKeyboard.tsx` fit-class source check (Phase 2, Node)

### Integration Tests:

- None this change (no `app.fetch`, no island mount)

### Manual Testing Steps:

1. Run `npm test` and confirm Phase 1–2 files still pass.
2. Flip the post-wrong `revealed` expectation to `true`, confirm failure, revert.
3. At ~390px, complete a wrong tap: score shows Wrong, piano is not highlighted until Reveal, Next advances.

## Performance Considerations

None. `renderHook` plus two `readFile` tests are cheap. Do not boot VexFlow.

## Migration Notes

New devDependencies only. No schema, API, or production behavior change. Existing `*.test.ts` files stay on Node.

## References

- Research: `context/changes/testing-practice-ui-contracts/research.md`
- Test plan: `context/foundation/test-plan.md` §2 Risks #5 #7, §3 Phase 3, §6.3, §7
- PRD: FR-003, FR-010, US-01, Non-Goals (no auto-reveal)
- S-01: `context/archive/2026-08-25-guest-practice-round/`
- Piano layout: `context/archive/2026-09-06-piano-keyboard-layout/`
- Phase 2 source-check pattern: `src/lib/auth/protected-routes.test.ts`
- Hook: `src/components/hooks/usePracticeRound.ts`
- Round UI: `src/components/practice/PracticeRound.tsx`
- Piano: `src/components/practice/PianoKeyboard.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Reveal hook units (Risk #7)

#### Automated

- [x] 1.1 `npm test` passes — 76984d9
- [x] 1.2 `npm run lint` passes — 76984d9
- [x] 1.3 `vitest.config.ts` still does not import `astro/config` or `getViteConfig`; default environment is still `"node"` — 76984d9
- [x] 1.4 Expecting `revealed === true` immediately after a wrong tap makes `npm test` fail — 76984d9
- [x] 1.5 Removing `round.revealed ?` from the `highlightPitch` assignment makes `npm test` fail — 76984d9

#### Manual

- [x] 1.6 A reader can see stay → optional Reveal → Next from the hook tests without opening `PracticeRound.tsx` — 76984d9
- [x] 1.7 A comment near the `lastFeedback` assertion states that `"Wrong"` feedback is not reveal — 76984d9

### Phase 2: Phone layout contract (Risk #5)

#### Automated

- [x] 2.1 `npm test` passes — c92627b
- [x] 2.2 `npm run lint` passes — c92627b
- [x] 2.3 Adding `min-w-[800px]` to a white-key `className` in `PianoKeyboard.tsx` makes `npm test` fail — c92627b
- [x] 2.4 No `*.snap` files added under `src/` — c92627b

#### Manual

- [x] 2.5 At ~390px width (browser or device), `/` practice piano does not cause page horizontal scroll and keys remain tappable — c92627b
- [x] 2.6 `Welcome.astro` was not used as a test oracle — c92627b

### Phase 3: Cookbook (§6.3 / §6.6)

#### Automated

- [x] 3.1 `npm test` still passes — 667baac
- [x] 3.2 `npm run lint` still passes (markdown is prettier-only if staged) — 667baac

#### Manual

- [x] 3.3 §6.3 no longer reads “TBD” — 667baac
- [x] 3.4 A new contributor could add a reveal transition using only §6.3 and `usePracticeRound.test.ts` — 667baac
- [x] 3.5 §2 risk Source cells are unchanged — 667baac
