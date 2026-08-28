# Pitch Playback Implementation Plan

## Overview

Add optional Web Audio confirmation of the **correct** staff pitch after every piano tap in the guest practice loop, with a short hold on the judged note and a session-only mute toggle — without a login wall, new dependencies, or turning the piano into an instrument.

## Current State Analysis

The S-01 round is a `client:only="react"` island: `usePracticeRound` owns phases `playing | wrong | summary`, and `PracticeRound` renders prompt, score, VexFlow staff, and CSS piano. Correct taps call `goToNext` in the same tick, so the staff already shows the **next** pitch while “Correct” still refers to the previous one. Wrong taps stay on the target until Reveal / Next. There is no audio stack (`package.json` has `vexflow` only). Safari/Chrome keep `AudioContext` suspended until a user gesture. Product authority is PRD FR-006 (nice-to-have, optional, correct note, after the answer) plus FR-009 (no settings maze).

### Key Discoveries:

- Correct auto-advance is `usePracticeRound.ts` `onNote` → `goToNext` in the same tick (`src/components/hooks/usePracticeRound.ts`); piano is already `disabled` when `uiPhase !== "playing"` (`src/components/practice/PracticeRound.tsx`).
- Icon-toggle pattern exists: `PasswordToggle` uses `lucide-react` `Eye` / `EyeOff` with `aria-label` (`src/components/auth/PasswordToggle.tsx`). shadcn `Button` has `size="icon"`.
- VexFlow taught the SSR rule: never evaluate browser-only APIs at module top level. Playback must lazy-construct `AudioContext` inside `play()`, and must **not** be re-exported from the `@/lib/practice` barrel (that barrel is imported by the island today and could be imported from Astro later).
- `toVexKey` already parses `PitchId` with `/^([A-G])([#b]?)(\d)$/` (`src/lib/practice/pitches.ts`) — frequency mapping should reuse that parse, A4 = 440 Hz, C4 = MIDI 60.

## Desired End State

A guest on `/` completes a 10-note round and, after each tap, hears a short sine tone of the **correct** pitch (not the tapped key). On a correct tap the staff stays on that note with a “Correct” label while the tone plays, then the next note (or summary) appears and the label clears. On a wrong tap the tone plays immediately; Reveal / Next behavior is unchanged. A speaker control in the score row starts unmuted; muting silences audio for the rest of the session (refresh restores on) but does **not** skip the correct-path hold. First piano tap on mobile Safari produces sound. Lint/build green; no new packages.

**Verify:** one round on ~390px with sound on; mute and continue; wrong-path Reveal still works; last-note correct goes tone → summary; `/` stays public.

## What We're NOT Doing

- Playing the target **before** the learner answers (ear-matching leak)
- Sounding tapped piano keys, black keys, or A5/B5 as an instrument
- Tone.js, Howler, or sampled piano assets
- Hear-on-demand button (trigger is auto-after-answer)
- Persisting mute across refresh (`localStorage` / FR-007)
- Settings page, FR-011 key labels / desktop keyboard, OAuth / FR-008
- Changing round length, pitch set, scoring, VexFlow, or layout chrome
- Adding a test runner
- Suppressing the Layout Supabase config banner

## Implementation Approach

Two phases. Phase 1 is a pure `pitchToHz` helper plus an SSR-safe oscillator player. Phase 2 adds a `correct` UI phase (short dwell), wires `play()` into the same tap handler as `onNote` (Safari gesture), and puts a lucide speaker toggle in the score row. Round engine stays free of `AudioContext`; the island owns mute + playback calls.

## Critical Implementation Details

**State sequencing:** On correct, set `uiPhase` to `correct` **without** incrementing `index`, so staff + “Correct” still refer to the judged note. Start a dwell timer (~400 ms, slightly longer than the envelope). Only then call the existing `goToNext` path. When advancing to `playing`, clear `lastFeedback` so “Correct” does not stick on the next note. Dwell even when muted — mute only skips `play()`.

**Timing & lifecycle:** Call `play(target)` inside the tap handler that already called `onNote` (same user gesture → `AudioContext.resume()`). Do not play from a `useEffect` on phase change — that loses the gesture on Safari. Clear the dwell timeout and stop the oscillator on unmount, `startRound`, and mute-while-playing. Visual `setState` stays synchronous; do not delay feedback past the 200 ms NFR.

**User experience:** Mute is a `min-h-11` icon button in the score row (visible during play, wrong, correct, and summary). Default on. `Volume2` / `VolumeX` + `aria-label` / `aria-pressed`. Prompt during `correct` must not say “Tap the key…” while the piano is disabled.

## Phase 1: Pitch Hz & playback helper

### Overview

Map `PitchId` to Hz and add a lazy Web Audio sine player that no-ops when the API is missing — no UI yet.

### Changes Required:

#### 1. Frequency helper

**File**: `src/lib/practice/pitches.ts` (export via `src/lib/practice/index.ts`)

**Intent**: Convert any `PitchId` to equal-temperament Hz so playback does not hard-code a 12-note table.

**Contract**: `pitchToHz(pitch: PitchId): number`. A4 = 440 exactly; C4 = MIDI 60. Reuse the same letter/accidental/octave parse as `toVexKey`. Invalid ids throw (same spirit as `toVexKey`). Pure; safe to put on the barrel.

#### 2. Playback module

**File**: `src/lib/practice/playback.ts` (new) — **do not** add to the barrel

**Intent**: Play one short confirmation tone; survive SSR and missing Web Audio.

**Contract**: `playPitch(pitch: PitchId): void` and `stopPlayback(): void`. Lazy-create `AudioContext` on first `playPitch`; `resume()` in that call. Sine `OscillatorNode` + gain envelope (~300–400 ms decay). Stop any in-flight oscillator before starting a new one. If `AudioContext` is undefined or `resume()` / node setup throws, swallow and no-op. **No** `new AudioContext()` (or `window` audio access) at module top level.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `pitchToHz("A4")` is 440 — **automated gate is TypeScript compile via `npm run build`** (export must typecheck). Do **not** add a test runner.

#### Manual Verification:

- Read `playback.ts`: `AudioContext` is constructed only inside `playPitch`, not at import time

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Dwell, mute, and round wiring

### Overview

Hold the judged note on correct, play the correct pitch from the tap handler on both correct and wrong, and add a session mute toggle to the score row.

### Changes Required:

#### 1. Correct dwell phase

**File**: `src/components/hooks/usePracticeRound.ts`

**Intent**: Keep the judged note visible long enough for ear and eye to agree, then advance.

**Contract**: Extend `PracticeUiPhase` with `"correct"`. On correct tap: record result, `lastFeedback: "correct"`, `uiPhase: "correct"`, start dwell timer, then `goToNext`. On wrong: unchanged phase, still `lastFeedback: "wrong"`. `onNote` returns `NoteResult | undefined` (`undefined` if ignored because `uiPhase !== "playing"`). Named dwell constant (~400 ms). Clear timer on `startRound` and unmount. When `goToNext` enters `playing`, set `lastFeedback` to `null`. Piano already disables when not `playing`.

#### 2. Mute + play from the island

**File**: `src/components/practice/PracticeRound.tsx` (optional small helper hook under `src/components/hooks/` if mute+play is extracted)

**Intent**: Auto-play the **correct** pitch after every answer, skip when muted, unlock audio on the first tap.

**Contract**: Wrap piano `onNote`: call round `onNote`, then if a result was returned and sound is on, `playPitch(result.target)` (never `result.tapped`). Mute toggle: `useState(true)` (on = sound enabled), session-only. Toggling off calls `stopPlayback()`. `startRound` / summary CTAs also stop in-flight audio. Do not play from `useEffect`.

#### 3. Score-row speaker control and prompt

**File**: `src/components/practice/PracticeRound.tsx`

**Intent**: Make playback optional without a settings maze; avoid a lying “tap” prompt during dwell.

**Contract**: Icon button in the score section (`min-h-11`, lucide `Volume2` / `VolumeX`), `aria-label` + `aria-pressed`, visible in playing / correct / wrong / summary. Default on. `promptFor`: `correct` uses a short confirmation line, not “Tap the key that matches the note”. Wrong / summary copy unchanged. No H-scroll; existing `ActionButton` / `cn()` patterns.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- No new audio/sample dependencies in `package.json`

#### Manual Verification:

- Correct path: staff holds the judged note, tone plays, then advances; “Correct” does not stick on the next note
- Wrong path: correct pitch plays; Reveal / Next unchanged; no auto-highlight
- Mute toggle (default on) silences; next unmuted tap sounds; refresh resets to on
- Phone-width (~390px) + first tap makes sound (Safari if available); no H-scroll; no login wall
- Last-note correct: tone then summary; muted still dwells

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No test runner in this repo — do not add one. `pitchToHz("A4") === 440` is a compile/export invariant, not a CI test.

### Integration Tests:

- None. Guest loop stays client-only; no API.

### Manual Testing Steps:

1. Open `/` on desktop, unmute (default): complete a round; every tap plays the **staff** pitch; correct holds then advances.
2. Mute mid-round: remaining taps are silent; correct still pauses; unmute and the next tap sounds.
3. Wrong path: miss a note, confirm tone of the **correct** pitch, Reveal highlights the key, Next continues.
4. Last note correct: tone, then summary; Practice again / Next set still work.
5. Refresh: mute is on again. Hard reload with missing Web Audio is not easily testable — code-level no-op is the fallback.
6. Phone ~390px (Safari if possible): first key tap makes sound; no horizontal scroll; no sign-in CTA.

## Performance Considerations

Reuse one `AudioContext` for the session. Stop the previous oscillator before starting the next. Envelope is short so it cannot smear into the following staff note. Do not recreate VexFlow factories as a side effect of audio (staff still redraws only on pitch change).

## Migration Notes

None. Session-only UI state; no persistence, no schema, no feature flag.

## References

- Related research: `context/changes/pitch-playback/research.md`
- Round hook: `src/components/hooks/usePracticeRound.ts`
- Round island: `src/components/practice/PracticeRound.tsx`
- Pitch parse: `src/lib/practice/pitches.ts` (`toVexKey`)
- Icon toggle pattern: `src/components/auth/PasswordToggle.tsx`
- Prior loop (no audio): `context/archive/2026-08-25-guest-practice-round/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Pitch Hz & playback helper

#### Automated

- [x] 1.1 `npm run lint` passes
- [x] 1.2 `npm run build` passes
- [x] 1.3 `pitchToHz("A4")` is 440 (compile/export via build; no test runner)

#### Manual

- [x] 1.4 Playback module does not construct AudioContext at import time

### Phase 2: Dwell, mute, and round wiring

#### Automated

- [ ] 2.1 `npm run lint` passes
- [ ] 2.2 `npm run build` passes
- [ ] 2.3 No new audio/sample dependencies in `package.json`

#### Manual

- [ ] 2.4 Correct path: staff holds the judged note, tone plays, then advances; “Correct” does not stick on the next note
- [ ] 2.5 Wrong path: correct pitch plays; Reveal / Next unchanged; no auto-highlight
- [ ] 2.6 Mute toggle (default on) silences; next unmuted tap sounds; refresh resets to on
- [ ] 2.7 Phone-width (~390px) + first tap makes sound (Safari if available); no H-scroll; no login wall
- [ ] 2.8 Last-note correct: tone then summary; muted still dwells
