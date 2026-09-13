# Sharp / Flat Names Implementation Plan

## Overview

Show both spellings for black-key taps in the practice prompt and on piano `aria-label`s (`C#4 / Db4`). Internal `PitchId`s stay sharp-only. Drill targets stay treble naturals. Visible key labels stay parked.

## Current State Analysis

`tapped-note-name` interpolates raw `PitchId` into `You tapped ${tapped}` and `Correct note: ${target}`. Black keys are stored as sharps (`C#4` … `A#5`). `PitchId` has no flat variant. Scoring is `target === tapped`, so introducing `Db4` as an id would break equality with `C#4`. `parsePitchId` already accepts `b` in a regex, but product ids never use it. Piano buttons use `aria-label={pitch}`. Staff aria is `Staff note ${pitch}` for natural targets only.

## Desired End State

A black-key tap reads `You tapped C#4 / Db4` (sharp first, ASCII `#` and `b`, slash-separated, octave on both). White-key taps and Reveal targets stay a single name (`C4`). Screen readers hear the same dual name on black keys. Scoring, staff notation, drill set, and visible key paint are unchanged.

### Key Discoveries:

- Scoring is exact string equality (`src/lib/practice/scoring.ts` `isCorrectTap`). Display must format; it must not add flat `PitchId`s.
- Black-key list is already the complete pair set (`PIANO_BLACK_KEYS` in `src/lib/practice/pitches.ts`): C#/Db, D#/Eb, F#/Gb, G#/Ab, A# — both octaves 4 and 5.
- Prompt copy lives in `promptFor` (`PracticeRound.tsx`). Piano `aria-label` is `PianoKeyboard.tsx` lines 30 and 53.
- FR-011 (painted labels) and accidental drill targets remain parked (`prd.md` Non-Goals; `tapped-note-name` out of scope).

## What We're NOT Doing

- Accidentals as staff/drill targets
- Changing `PitchId` to include flats, or enharmonic scoring (`Db4` === `C#4`)
- Visible labels on keys (FR-011)
- Letter names drawn on the staff
- Dual names on white keys (E# / Fb, Cb / B#)
- Unicode ♯/♭ glyphs
- Staff `aria-label` changes
- Score-row pitch text, highlight, playback, range, round length
- Adding a test runner

## Implementation Approach

Add a display helper that maps a `PitchId` to a string: naturals pass through; each sharp black key becomes `{sharp} / {flat}` with the same octave. Call it from `promptFor` (tapped and target) and from piano `aria-label`. Keep storage and judgment on existing sharp ids.

## Critical Implementation Details

**User experience spec.** Black-key example: `You tapped C#4 / Db4. Not quite — reveal the answer or go next`. White-key example unchanged except the helper is used: `You tapped C4. That's the correct pitch`. Pair order is sharp then flat. Characters are ASCII `#` and `b`. Spaces around `/`.

**State sequencing.** None. Formatting is pure; Reveal still uses `results.at(-1).tapped` and `target`.

---

## Phase 1: Dual names for black keys

### Overview

Add `formatPitchName` and use it in the prompt and piano `aria-label`s so black keys show sharp and flat together.

### Changes Required:

#### 1. Display helper

**File**: `src/lib/practice/pitches.ts` (export via `src/lib/practice/index.ts`)

**Intent**: Convert a stored `PitchId` into the string learners (and screen readers) should see, without changing ids used for scoring.

**Contract**: Export `formatPitchName(pitch: PitchId): string`. Naturals return `pitch` unchanged. Each sharp black key in the C4–B5 piano set returns `{pitch} / {enharmonicFlat}` with the same octave (C#→Db, D#→Eb, F#→Gb, G#→Ab, A#→Bb). Do not add flat variants to `PitchId`.

#### 2. Practice prompt

**File**: `src/components/practice/PracticeRound.tsx`

**Intent**: Black-key taps show both names in the existing `You tapped …` / `Correct note: …` sentences.

**Contract**: `promptFor` interpolates `formatPitchName(tapped)` and `formatPitchName(target)` instead of raw ids. Sentence structure from `tapped-note-name` stays. Playing and summary strings stay as they are.

#### 3. Piano accessible names

**File**: `src/components/practice/PianoKeyboard.tsx`

**Intent**: Screen readers hear the same spelling as the prompt.

**Contract**: White and black key `aria-label` use `formatPitchName(pitch)`. No visible children / painted labels. Hit handling and highlight still use raw `PitchId`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `formatPitchName` is exported from `@/lib/practice` and used in `promptFor` and piano `aria-label`

#### Manual Verification:

- White-key tap: prompt still `You tapped C4` (single name); score Correct/Wrong unchanged
- Black-key tap: prompt is `You tapped C#4 / Db4` (sharp first, ASCII); not `Db4` only
- Reveal: `You tapped C#4 / Db4. Correct note: D4` (target still a single natural name)
- Piano keys still have no visible labels; a screen reader / inspector shows the dual name on black keys
- Staff still shows naturals only; a wrong sharp tap does not become a correct answer
- Playing, summary, playback, and highlight-on-reveal unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- None. No test runner in this repo; do not add one.

### Integration Tests:

- None. Lint, build, and an export/use check for `formatPitchName`.

### Manual Testing Steps:

1. Tap a white key (correct and wrong): prompt stays one name (`C4`).
2. Tap C# and A# (both octaves if easy): prompt is `C#4 / Db4` and `A#4 / Bb4`.
3. Reveal after a black-key miss: dual tap name + single `Correct note: {natural}`.
4. Confirm keys are still unlabeled on screen.
5. Confirm a black-key tap is still wrong against a natural staff target.

## Performance Considerations

None. Pure string map on tap/render.

## Migration Notes

None.

## References

- Change notes: `context/changes/sharp-flat-names/change.md`
- Helper home: `src/lib/practice/pitches.ts`
- Prompt: `src/components/practice/PracticeRound.tsx` (`promptFor`)
- Piano a11y: `src/components/practice/PianoKeyboard.tsx` (`aria-label`)
- Scoring (do not change): `src/lib/practice/scoring.ts`
- Prior prompt work: `context/changes/tapped-note-name/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dual names for black keys

#### Automated

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run build` passes
- [x] 1.3 `formatPitchName` is exported from `@/lib/practice` and used in `promptFor` and piano `aria-label`

#### Manual

- [x] 1.4 White-key tap: single name in the prompt; score unchanged
- [x] 1.5 Black-key tap: `C#4 / Db4` (sharp first, ASCII)
- [x] 1.6 Reveal after a black-key miss: dual tap name plus single `Correct note:`
- [x] 1.7 No visible key labels; black-key `aria-label` is the dual name
- [x] 1.8 Staff stays naturals; black-key tap is still wrong vs a natural target
- [x] 1.9 Playing, summary, playback, and highlight-on-reveal unchanged
