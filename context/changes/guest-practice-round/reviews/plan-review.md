<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Guest Practice Round

- **Plan**: context/changes/guest-practice-round/plan.md
- **Mode**: Deep
- **Date**: 2026-08-25
- **Verdict**: SOUND (after triage fixes; was REVISE)
- **Findings**: 0 critical 3 warnings 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING → addressed |
| Blind Spots | WARNING → addressed |
| Plan Completeness | WARNING → addressed |

## Grounding

Existing paths ✓ (new paths intentional), symbols ✓, brief↔plan ✓

## Findings

### F1 — VexFlow + client:load may break SSR build

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 — Staff component / shell integration
- **Detail**: client:load still SSR-imports the React module; top-level vexflow can break Workers build.
- **Fix A ⭐ Recommended**: Lock client:only="react" or dynamic import("vexflow") in useEffect
- **Decision**: FIXED via Fix A

### F2 — Stepwise edge rule left to implementer

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — Pitch set & generators
- **Detail**: Contract said wrap or bounce — pick one.
- **Fix**: Lock bounce at ends
- **Decision**: FIXED — bounce at C4/G5

### F3 — Black-key hit policy still dual-pathed

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details — Piano vs drill set
- **Detail**: Plan preferred decorative black keys but left alternatives open.
- **Fix**: User override — black keys interactive; # taps allowed as guesses (wrong vs natural staff targets in v1)
- **Decision**: FIXED differently (user: black keys should work for # guesses)

### F4 — Phase 1 criterion 1.3 hard to automate without a runner

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 Success Criteria / Progress 1.3
- **Detail**: No test runner in package.json; criterion was mushy.
- **Fix**: Clarify 1.3 as compile/export via build only; spot-check is Manual 1.4
- **Decision**: FIXED
