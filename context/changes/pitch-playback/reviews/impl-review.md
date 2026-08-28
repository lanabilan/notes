<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Pitch Playback

- **Plan**: context/changes/pitch-playback/plan.md
- **Scope**: Phase 1 of 2 + Phase 2 of 2
- **Date**: 2026-08-28
- **Verdict**: APPROVED
- **Findings**: 0 critical 1 warning 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Wrong-path Next does not stop in-flight tone

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/practice/PracticeRound.tsx:177
- **Detail**: Next called `round.nextAfterWrong` only. Correct-path dwell outlasts the 350 ms envelope, but wrong-path Next can fire immediately, so the previous target can still sound after the staff has moved.
- **Fix**: Wrap Next like `handleStartRound` — `stopPlayback()` then `round.nextAfterWrong()`.
- **Decision**: FIXED

### F2 — resume().catch can tear down a newer oscillator

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/practice/playback.ts:109
- **Detail**: `oscillator.onended` checks `activeOscillator === oscillator` before `disconnectActive()`. The `resume().catch` handler always disconnected, so a late reject from an earlier `playPitch` would stop a newer tone.
- **Fix**: Guard the catch the same way as `onended`: `if (activeOscillator === oscillator) disconnectActive()`.
- **Decision**: FIXED
