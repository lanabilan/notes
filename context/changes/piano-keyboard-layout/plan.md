# Piano Keyboard Layout Implementation Plan

## Overview

Stop the practice piano from stretching across wide viewports. Cap the keyboard at `max-w-md`, center it, and leave phone full-bleed. Range, height, tap logic, staff, and score stay as they are.

## Current State Analysis

S-01 sized the piano to **container width** so ~390px phones never H-scroll. `PianoKeyboard` is `w-full`; 14 white keys are `flex-1`; black keys are `%` of that row. Height is fixed (`h-28` / `sm:h-32`). Parents (`PracticeShell`, `PracticeRound` piano section) are also full-bleed with only `mx-4`.

On a phone that is piano-like (~25px × 112px whites). On a 1440px desktop, whites become ~100px × 128px — wide and short. There is no historical “don’t stretch” rule; this change is the desktop follow-up to that mobile-first scale.

## Desired End State

On a phone (~390px) the piano still fills the `mx-4` column with no H-scroll. On tablet/desktop the keyboard stops growing at `max-w-md` (28rem) and sits centered in the piano section. Black keys stay aligned because they are percentages of the capped row. Staff, score, header, C4–B5 range, and note handling are unchanged.

### Key Discoveries:

- Stretch is width-unbounded + height-capped: `PianoKeyboard.tsx` lines 21–22 (`w-full`, `h-28 sm:h-32`) and white keys `flex-1 min-w-0` (line 35).
- Black-key placement is `%` of `WHITE_COUNT` (lines 46–60) — a width cap on the same row is enough; no formula change.
- Piano section inset is `mx-4` (`PracticeRound.tsx` line 210). At 390px, content ≈ 358px, which is below 28rem, so `max-w-md` is inert on the verification phone.
- S-01 contract: “scale to container width” / avoid H-scroll (`context/archive/2026-08-25-guest-practice-round/plan.md`).
- FR-011 (key labels / desktop keyboard) stays parked.

## What We're NOT Doing

- Capping staff, score, or the practice header
- Growing piano height with viewport width
- Changing C4–B5 range, drill targets, or tap/highlight behavior
- Horizontal scroll on phones
- FR-011 labels or physical-keyboard fallback
- MIDI, bass/accidentals on staff, or playback changes
- Adding a test runner

## Implementation Approach

Constrain the existing `PianoKeyboard` wrapper: `max-w-md mx-auto` on top of `w-full`. Phone stays full-bleed; wider viewports center a 28rem piano. Black keys inherit the cap. One file, one phase.

## Critical Implementation Details

**User experience spec.** The cap must not inset the piano on ~390px. With the section’s `mx-4`, usable width is already under 28rem, so `max-w-md` only engages above that. Do not add a second `max-w-*` on `PracticeRound` / `PracticeShell`. Keep `overflow-hidden` so black keys cannot paint outside the capped row.

---

## Phase 1: Cap and center the practice piano

### Overview

Apply `max-w-md` and horizontal centering on the keyboard wrapper so desktop keys stop stretching while phones stay full-bleed.

### Changes Required:

#### 1. Keyboard wrapper

**File**: `src/components/practice/PianoKeyboard.tsx`

**Intent**: Give the piano a desktop width cap without changing key markup, height, or hit handling.

**Contract**: Outer wrapper stays `w-full overflow-hidden` and gains `max-w-md mx-auto` (replace `max-w-full`, which only mirrored the parent). Inner row, `flex-1` whites, `%` blacks, `h-28 sm:h-32`, `min-h-11`, and `className` merge stay. Props unchanged.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `PianoKeyboard` wrapper includes `max-w-md` and `mx-auto`

#### Manual Verification:

- ~390px: piano still fills the padded column; no H-scroll; keys remain tappable
- Wide desktop (~1280px+): piano is clearly not full-bleed; centered; keys look taller than wide
- Black keys still sit on the correct white-key boundaries
- Tapping, highlight-on-reveal, disabled-during-feedback, and playback still work
- Staff, score, header, and summary CTAs are unchanged in width

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- None. No test runner in this repo; do not add one.

### Integration Tests:

- None. Lint, build, and a class-presence check on `PianoKeyboard.tsx`.

### Manual Testing Steps:

1. Open `/` at ~390px width: piano spans the content column; no horizontal scroll.
2. Widen to a laptop/desktop width: piano stops around 448px and is centered; leftover space is empty, not extra-wide keys.
3. Confirm black keys still align between the intended whites (C# over C/D, etc.).
4. Play a note, trigger wrong → reveal (highlight), and complete a round — behavior unchanged.
5. Spot-check header, staff, and summary buttons still full-bleed in the `mx-4` column.

## Performance Considerations

None. Class-only change; no extra JS.

## Migration Notes

None.

## References

- Change notes: `context/changes/piano-keyboard-layout/change.md`
- Keyboard: `src/components/practice/PianoKeyboard.tsx`
- Parent section: `src/components/practice/PracticeRound.tsx` (piano `section`)
- Range: `src/lib/practice/pitches.ts` (`PIANO_WHITE_KEYS` / `PIANO_BLACK_KEYS`)
- Prior layout: `context/archive/2026-08-25-guest-practice-round/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Cap and center the practice piano

#### Automated

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run build` passes
- [x] 1.3 `PianoKeyboard` wrapper includes `max-w-md` and `mx-auto`

#### Manual

- [x] 1.4 ~390px: piano fills the column; no H-scroll; keys tappable
- [x] 1.5 Wide desktop: piano capped and centered; keys taller than wide
- [x] 1.6 Black keys still align on the correct white-key boundaries
- [x] 1.7 Tap / reveal highlight / disabled / playback still work
- [x] 1.8 Staff, score, header, and summary width unchanged
