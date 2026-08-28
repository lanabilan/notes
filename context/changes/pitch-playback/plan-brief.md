# Pitch Playback — Plan Brief

> Full plan: `context/changes/pitch-playback/plan.md`
> Research: `context/changes/pitch-playback/research.md`

## What & Why

Guests should hear a short confirmation of the **correct** staff pitch after each tap (FR-006), so they know what that note sounds like — without ads, login, or turning the drill into ear-matching. Playback is optional in the UI (session mute) and never plays before they answer.

## Starting Point

S-01 already ships the 10-note island on `/`. Correct taps auto-advance in the same tick (staff jumps to the next note while “Correct” still shows). There is no audio stack and no new-dep budget for Tone.js or samples.

## Desired End State

After every tap the correct pitch sounds (sine beep). On correct, the judged note stays on the staff during a short hold, then the round continues. A speaker icon in the score row starts on; mute silences for this session only. Wrong-path Reveal / Next and scoring are unchanged.

## Key Decisions Made

| Decision            | Choice                                      | Why (1 sentence)                                                                 | Source   |
| ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| Trigger             | Auto-play after every answer                | Matches PRD “after each note” with no Hear button                                | Plan     |
| Correct-path timing | Short hold on the judged note (~400 ms)     | Ear and eye must agree; also fixes “Correct” flashing on the next pitch          | Plan     |
| Optional control    | Score-row toggle, default on, session-only  | FR-006 optional + FR-009 no settings maze; FR-007 forbids persisting mute        | Plan     |
| What sounds         | Correct staff pitch only                    | FR-006; sounding tapped keys is a different feature                              | Plan     |
| Engine              | Web Audio sine oscillator, 0 new deps       | MVP.md Web Audio; after-hours; VexFlow already in the bundle                     | Research |
| No pre-answer play  | Never play the target before they tap       | Socrates: pitch must not leak the answer by ear                                  | Research |

## Scope

**In scope:** `pitchToHz`, SSR-safe `playPitch` / `stopPlayback`, `correct` UI phase + dwell, mute toggle, play-from-tap-handler on correct and wrong.

**Out of scope:** Hear button, piano-as-instrument, Tone.js/samples, mute persistence, FR-011, OAuth, test runner, layout/auth chrome.

## Architecture / Approach

Pure Hz helper on the practice barrel. Playback module is **not** on the barrel and lazy-creates `AudioContext` inside `playPitch`. `usePracticeRound` owns the `correct` dwell (no audio imports). `PracticeRound` wraps `onNote`, plays `result.target` in the same gesture, and hosts the mute icon.

## Phases at a Glance

| Phase                          | What it delivers                         | Key risk                                      |
| ------------------------------ | ---------------------------------------- | --------------------------------------------- |
| 1. Pitch Hz & playback helper  | Hz map + silent-noop oscillator player   | Accidental `AudioContext` at import → SSR     |
| 2. Dwell, mute, and wiring     | Hold + toggle + sound on every tap       | Safari gesture lost if play is in `useEffect` |

**Prerequisites:** Archived S-01 practice loop on `/`; no extra services.
**Estimated effort:** ~1–2 sessions across 2 phases.

## Open Risks & Assumptions

- iOS silent switch may swallow Web Audio even when `playPitch` ran — do not treat silence-as-failure if the oscillator started.
- Dwell slightly slows the round versus today’s instant advance; that is intentional.

## Success Criteria (Summary)

- Every tap (when unmuted) plays the **correct** pitch; first mobile tap actually sounds.
- Correct holds on the judged note, then advances; mute silences without skipping the hold.
- Reveal / Next, sets, scoring, and public `/` are unchanged.
