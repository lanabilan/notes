<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Guest Practice Round

- **Plan**: context/changes/guest-practice-round/plan.md
- **Scope**: Phases 1–2 of 4
- **Date**: 2026-08-25
- **Verdict**: NEEDS ATTENTION → triage applied
- **Findings**: 0 critical / 3 warnings / 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — VexFlow fonts reload on every resize

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/practice/StaffNote.tsx
- **Detail**: Plan requires load/set fonts once per mount; loadFonts ran inside draw() on every ResizeObserver callback.
- **Fix**: Module-level loadVexFlow() promise; redraws reuse loaded module without reloading fonts.
- **Decision**: FIXED

### F2 — Overlapping StaffNote redraw races

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/practice/StaffNote.tsx
- **Detail**: Overlapping async mount work across pitch/effect churn could write stale DOM.
- **Fix A ⭐ Recommended**: Generation token per effect; ignore stale gens before observe/draw.
- **Fix B**: Debounce ResizeObserver only.
- **Decision**: FIXED (Fix A)

### F3 — Unhandled VexFlow / font load failures

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/practice/StaffNote.tsx
- **Detail**: import/loadFonts had no try/catch; failure → unhandled rejection and blank staff.
- **Fix**: try/catch around mount; reset shared promise on load failure; leave staff empty.
- **Decision**: FIXED

### F4 — PitchId is unconstrained string

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/types.ts:2
- **Detail**: PitchId = string did not catch pitch typos at compile time.
- **Fix**: Template-literal union for C4–B5 naturals and sharps.
- **Decision**: FIXED

### F5 — Piano keys lack focus-visible rings

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/practice/PianoKeyboard.tsx:34
- **Detail**: Raw piano buttons omit focus-visible rings used by ui/button.tsx.
- **Fix**: Defer to Phase 4 mobile polish.
- **Decision**: SKIPPED
