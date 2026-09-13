# Tapped Note Name Implementation Plan

## Overview

After each scored piano tap, the one-line practice prompt names the key the learner hit (`You tapped C4` / `You tapped C#4`). Reveal still names the target. Score stays Correct/Wrong. Keys, staff, and flats stay out of this change.

## Current State Analysis

A tap is judged in `usePracticeRound.onNote` and stored as `results[].tapped`, then dropped from the UI. `promptFor` never reads the tap: playing says “Tap the key…”, correct says “That's the correct pitch”, wrong says “Not quite…”, Reveal says `Correct note: ${target}` (raw `PitchId`). The score row shows Correct/Wrong separately. Piano keys have `aria-label` only; FR-011 on-key labels stay parked. Black keys are sharp-only ids (`C#4`). Flat spelling is the sibling change `sharp-flat-names`.

## Desired End State

On a correct tap (400ms dwell) the prompt is `You tapped C4. That's the correct pitch`. On a wrong tap it is `You tapped C#4. Not quite — reveal the answer or go next`. After Reveal it is `You tapped C#4. Correct note: D4` (tap and target both visible). Playing and summary copy stay as they are. Score, staff, piano highlight (target-only after Reveal), and playback stay unchanged.

### Key Discoveries:

- Last tap already lives in `results[].tapped` (`src/lib/practice/scoring.ts` `createNoteResult`; appended in `usePracticeRound.ts` `onNote`). No extra scoring field is required.
- During `correct` and `wrong`, `results.at(-1)` is the tap for the current note; during `playing` / `summary` that last result is the *previous* note (or the whole round) — do not read it there.
- Reveal copy already interpolates `state.target` (`PracticeRound.tsx` `promptFor`). Tapped ≠ target on wrong answers; both must remain after Reveal.
- `PitchId` is already the display string (`C4`, `C#4`). There is no letter-only formatter; C vs C5 would be ambiguous on this keyboard.

## What We're NOT Doing

- Flat / enharmonic names (`Db`) — `sharp-flat-names`
- Labels painted on piano keys or desktop keyboard fallback (FR-011)
- Letter names on the staff
- Accidentals as drill targets
- Showing the tapped id on the Score row
- Highlighting the wrong/tapped key
- Changing dwell timing, playback, range, or round length
- Adding a test runner

## Implementation Approach

Keep the tap in `results` and teach `promptFor` to prefix `You tapped {PitchId}` whenever `uiPhase` is `correct` or `wrong`. Prefer deriving the id from `results.at(-1)` over new hook state so Reveal does not clear the tap and Next/new-round naturally drop it. One primary file: `PracticeRound.tsx`. Hook changes only if derivation from `results` is not enough to type or read cleanly.

## Critical Implementation Details

**User experience spec.** Exact prompt strings (ids are examples): playing `Tap the key that matches the note`; correct `You tapped C4. That's the correct pitch`; wrong `You tapped C#4. Not quite — reveal the answer or go next`; wrong+revealed `You tapped C#4. Correct note: D4`; summary unchanged. Always ASCII `#` in the id. Do not put the name on the score row.

**State sequencing.** The tap name must survive Reveal on the same wrong note and must disappear when the round advances (`goToNext` / `startRound` / `nextAfterWrong`). Deriving from the current result does that without a second `lastTapped` flag.

---

## Phase 1: Name the tap in the prompt

### Overview

Show `You tapped {PitchId}` on every scored tap, keep Reveal’s target name, and leave playing/summary and the score row alone.

### Changes Required:

#### 1. Practice prompt

**File**: `src/components/practice/PracticeRound.tsx`

**Intent**: After a scored tap, the one-line prompt tells the learner which key they hit, and after Reveal it still tells them the correct target.

**Contract**: `promptFor` includes `You tapped ${tapped}` for `uiPhase` `correct` and `wrong`, using `results.at(-1).tapped` (or an equivalent current-result read). Playing and summary strings stay unchanged. Revealed wrong keeps `Correct note: ${target}` in the same line. Score row, `highlightPitch`, and piano markup stay as they are.

#### 2. Round state (only if needed)

**File**: `src/components/hooks/usePracticeRound.ts`

**Intent**: Expose the current tap to the prompt if reading `results` from the island is awkward or untyped.

**Contract**: Optional. If added, a `lastTapped: PitchId | null` (or equivalent) is set in `onNote` and cleared on the same paths that clear `lastFeedback`. Prefer not adding it if `results.at(-1)` is sufficient.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `promptFor` (or its helper) includes the `You tapped` copy for scored taps

#### Manual Verification:

- Correct tap: during the short dwell, prompt is `You tapped {id}. That's the correct pitch`; score still says Correct
- Wrong tap before Reveal: prompt is `You tapped {id}. Not quite — reveal the answer or go next`; score still says Wrong
- After Reveal: prompt keeps the tap id and adds `Correct note: {target}`; piano still highlights the target only
- Playing and summary prompts unchanged; Next / new round return to “Tap the key…”
- Black-key tap shows a sharp id (`C#4`), not a flat
- Staff, piano labels, playback, and disabled-during-feedback behavior unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- None. No test runner in this repo; do not add one.

### Integration Tests:

- None. Lint, build, and a copy-presence check on `PracticeRound.tsx`.

### Manual Testing Steps:

1. Open `/`, tap the matching white key: prompt names that `PitchId` and still reads as correct; then it advances.
2. Tap a wrong white key and a wrong black key: prompt names the tap; Reveal then shows tap + `Correct note: {target}`.
3. Confirm the Score row still only says Correct or Wrong (no pitch id there).
4. Finish a round: summary prompt has no `You tapped`.
5. Start another round: first prompt is again “Tap the key that matches the note”.

## Performance Considerations

None. Copy-only UI over existing `results`.

## Migration Notes

None.

## References

- Change notes: `context/changes/tapped-note-name/change.md`
- Prompt: `src/components/practice/PracticeRound.tsx` (`promptFor`)
- Round hook: `src/components/hooks/usePracticeRound.ts` (`onNote`, `results`)
- Result shape: `src/lib/practice/scoring.ts` (`NoteResult.tapped`)
- Sibling (out of scope): `context/changes/sharp-flat-names/change.md`
- Prior prompt/reveal contract: `context/archive/2026-08-25-guest-practice-round/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Name the tap in the prompt

#### Automated

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run build` passes
- [x] 1.3 `promptFor` (or its helper) includes the `You tapped` copy for scored taps

#### Manual

- [x] 1.4 Correct tap: prompt names the id during dwell; score still says Correct
- [x] 1.5 Wrong tap before Reveal: prompt names the tap; score still says Wrong
- [x] 1.6 After Reveal: tap id plus `Correct note: {target}`; piano highlights target only
- [x] 1.7 Playing and summary unchanged; Next / new round reset the prompt
- [x] 1.8 Black-key tap shows a sharp id, not a flat
- [x] 1.9 Staff, piano labels, playback, and disabled-during-feedback unchanged
