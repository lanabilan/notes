---
date: 2026-09-13T16:16:39+02:00
researcher: agent
git_commit: 0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1
branch: main
repository: lanabilan/notes
topic: "Ground rollout Phase 1 (critical-path coverage): Risks #1 and #3"
tags: [research, codebase, practice, scoring, sets, vitest]
status: complete
last_updated: 2026-09-13
last_updated_by: agent
last_updated_note: "Added follow-up research for S-01 oracle vs live summarizeRound, bounce lock citation, and getViteConfig Cloudflare crash surface"
---

# Research: Ground rollout Phase 1 (critical-path coverage): Risks #1 and #3

**Date**: 2026-09-13T16:16:39+02:00
**Researcher**: agent
**Git Commit**: 0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1
**Branch**: main
**Repository**: lanabilan/notes

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md` (“Critical-path coverage”).

Risks to verify: **#1** (staff→key misjudge) and **#3** (round not 10 notes / wrong set mode / summary that does not match the tap log).

Risk response guidance to verify, not blindly accept:

- **#1**: prove that given a known staff target and tap (including black-key guesses vs natural targets), correct/wrong matches the C4–G5 mapping; challenge that the UI highlight is the judge or that one C4 happy-path tap covers the set; avoid an oracle copied from the current matching function.
- **#3**: prove round length is 10, stepwise bounces at the ends (does not wrap), and summary accuracy/avg ms match an independent calculation from the tap log; challenge that one finished UI round means generators and stats are correct; avoid golden output copied from the generator under test.

Hot-spot directories (likelihood evidence, not anchors): `src/lib/practice`, `src/components/practice`.

Stack: Astro 6 SSR, no test runner yet. Phase 1 planned as unit tests + runner bootstrap.

## Summary

Neither risk is speculative. Both are live, pure TypeScript paths in `src/lib/practice`. The React hook is a thin state machine over that lib; the piano/staff components do **not** re-judge taps.

| Risk | Where it actually fails | Cheapest useful layer | Guidance verdict |
|------|-------------------------|----------------------|------------------|
| #1 | [`isCorrectTap`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/scoring.ts#L4-L6) (`target === tapped`). Staff glyph is a separate pure map [`toVexKey`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/pitches.ts#L108-L111). Piano emits the same `PitchId` it displays. | **Unit** on `isCorrectTap` / `createNoteResult`, plus a small `toVexKey` table for drill naturals | Confirmed. Highlight is not the judge. Do **not** assert `isCorrectTap(a,b) === (a===b)` — that copies the implementation. Use an independent (target, tap, expected) table from the music identity. |
| #3 | [`ROUND_LENGTH`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/sets.ts#L5) + [`generateRound`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/sets.ts#L57-L64) + [`summarizeRound`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/scoring.ts#L18-L38). Hook ends the round when `results.length >= ROUND_LENGTH`. | **Unit** on `generateRound` (properties, not snapshots) and `summarizeRound` (hand-built tap logs) | Confirmed. Do not snapshot `generateRound()` output. “10 notes” means **10 judged targets** (a wrong tap still counts; Reveal/Next only delays advancing). |

Existing tests: **none**. No Vitest/Jest/Playwright config, no `*.test.*` / `*.spec.*`.

Runner for this phase: **minimal Vitest + `environment: 'node'` + `@` → `./src` alias**. Do **not** load Astro `getViteConfig()` yet — Phase 1 only imports pure TS. That avoids the Astro 6 `getViteConfig` / `exports is not defined` crash. AstroContainer / jsdom belong to later UI phases.

No test-plan §2 backport required: hot-spot dirs remain valid likelihood evidence. Failure anchors are `src/lib/practice` (`scoring.ts`, `sets.ts`, `pitches.ts`), not a second copy in components.

## Detailed Findings

### Pitch-id contract

- `PitchId` is a template-literal union: naturals `C4`…`B5` plus sharps `C#4`…`A#5`. **No flat scoring ids** (`Db4` is not a `PitchId`). ([`src/types.ts:10-11`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/types.ts#L10-L11))
- Drill targets: [`DRILL_NATURALS`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/pitches.ts#L3-L17) = C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, F5, G5 (12 pitches, FR-001).
- Piano whites: C4–B5 including **A5 and B5**, which are **not** drill targets. ([`PIANO_WHITE_KEYS`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/pitches.ts#L36-L52))
- Piano blacks: sharp-only ids with `afterWhiteIndex` for layout. ([`PIANO_BLACK_KEYS`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/pitches.ts#L58-L69))
- `formatPitchName` is **display-only** (e.g. `C#4` → `C#4 / Db4`). It is not a scoring id. ([`pitches.ts:113-135`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/pitches.ts#L113-L135); confirmed by `sharp-flat-names` plan: do not add flats to `PitchId`)

**Independent oracle for the drill set:** a test fixture listing C4–G5 naturals (PRD FR-001). Do not use `DRILL_NATURALS` as both SUT and expected value — a mutated array would still “pass.”

### Risk #1 — matching / judge

**Judge (single function):**

```4:6:src/lib/practice/scoring.ts
export function isCorrectTap(target: PitchId, tapped: PitchId): boolean {
  return target === tapped;
}
```

`createNoteResult` stores `correct: isCorrectTap(target, tapped)` ([`scoring.ts:8-14`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/scoring.ts#L8-L14)).

**Call graph (tap → verdict):**

1. White/black `<button>` `onClick` → `onNote(pitch)` with that key’s `PitchId` ([`PianoKeyboard.tsx:31-33`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/practice/PianoKeyboard.tsx#L31-L33), [`:54-56`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/practice/PianoKeyboard.tsx#L54-L56))
2. `PracticeRound.handleNote` → `round.onNote(tapped)` — **no local comparison** ([`PracticeRound.tsx:120-126`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/practice/PracticeRound.tsx#L120-L126))
3. `usePracticeRound.onNote` → `createNoteResult(target, tapped, responseMs)` ([`usePracticeRound.ts:94-99`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/hooks/usePracticeRound.ts#L94-L99))
4. `target` is `notes.at(index) ?? "C4"` ([`usePracticeRound.ts:46`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/hooks/usePracticeRound.ts#L46))

**Staff vs piano:** Staff renders `toVexKey(pitch)` (`C4` → `c/4`) ([`StaffNote.tsx:65-68`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/practice/StaffNote.tsx#L65-L68), [`pitches.ts:108-111`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/pitches.ts#L108-L111)). Piano sends the raw `PitchId`. There is no enharmonic remap on the judge path. `parsePitchId` *can* parse `b`, but product ids never use flats.

**Black keys:** All tappable; ids are sharps. Against a natural target, `C#4 !== C4` so the tap is wrong. That matches the S-01 contract (black keys are guesses, not drill targets).

**Octave / range edges:** C4 vs C5 are different ids (correct tap for C4 is only `C4`). A5/B5 whites and all blacks can be tapped and will be wrong vs any drill natural. `isDrillNatural` exists but is **not** used by the judge.

**Highlight is not the judge.** `highlightPitch === pitch` only toggles CSS ([`PianoKeyboard.tsx:24`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/practice/PianoKeyboard.tsx#L24)). The “UI highlight means the judge is right” challenge is valid and currently false.

**Must challenge (confirmed):** a single `isCorrectTap("C4","C4") === true` does not cover octave errors, black-key guesses, or A5/B5. Table at least: same natural; wrong natural; octave twin (C4/C5); black vs natural; A5 vs G5.

**Anti-pattern (confirmed):** `expect(isCorrectTap(a, b)).toBe(a === b)` is an implementation mirror. Oracle rows must come from the mapping spec (same letter+octave natural = correct; otherwise wrong for v1).

**Staff-glyph adjunct:** If `toVexKey("C4")` ever returned `d/4`, the learner would see D, tap D, and be marked wrong against target C4 — still Risk #1 “teaches the wrong mapping.” Cheap unit: independent table `C4 → c/4` … `G5 → g/5` for drill naturals. Do **not** mount VexFlow in Phase 1.

### Risk #3 — round length, set modes, summary

**Round length:** `export const ROUND_LENGTH = 10` ([`sets.ts:5`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/sets.ts#L5)). Both generators loop to that constant. The hook ends when `nextResults.length >= ROUND_LENGTH` ([`usePracticeRound.ts:69-74`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/hooks/usePracticeRound.ts#L69-L74)). UI copies `{noteNumber}/{ROUND_LENGTH}`. Single source of truth — but tests of `generateRound` must assert length **`10` as a PRD literal**, not `expect(arr).toHaveLength(ROUND_LENGTH)` imported from the same module (tautology if someone changes both).

**What “10 notes” means:** Each tap in `uiPhase === "playing"` appends a `NoteResult` immediately — **including wrongs** ([`usePracticeRound.ts:98-113`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/hooks/usePracticeRound.ts#L98-L113)). Wrong answers stay on the **same target** only for Reveal / Next (`nextAfterWrong` → `goToNext(results)`). They do **not** retry the note. Ten wrong taps → summary with `total: 10`, `accuracyPercent: 0`.

**Random:** uniform index in `0 … DRILL_NATURAL_COUNT-1`, **rejects immediate repeats** when the set has more than one pitch ([`sets.ts:15-30`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/sets.ts#L15-L30)). Not a full shuffle; distant repeats allowed.

**Stepwise bounce (real, not speculative):**

```44:52:src/lib/practice/sets.ts
  for (let i = 1; i < ROUND_LENGTH; i++) {
    let next = index + direction;
    if (next < 0 || next >= DRILL_NATURAL_COUNT) {
      direction = direction === 1 ? -1 : 1;
      next = index + direction;
    }
    index = next;
    notes.push(pitchAt(index));
  }
```

Bounce at C4 / G5 (indices 0 and 11). Does **not** wrap to the other end. Consecutive steps are neighbors in `DRILL_NATURALS`. Seed index and initial direction are random.

**Summary formula** ([`summarizeRound`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/lib/practice/scoring.ts#L18-L38)):

- `total = results.length`
- `correctCount = count of result.correct`
- `accuracyPercent = total === 0 ? 0 : (correctCount / total) * 100` (not rounded here)
- `averageResponseMs = total === 0 ? null : sum(responseMs) / total` — **includes wrong notes**
- Timestamps: `performance.now() - shownAtRef` when entering `playing` ([`usePracticeRound.ts:55-58`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/hooks/usePracticeRound.ts#L55-L58), [`:98`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/hooks/usePracticeRound.ts#L98)). Phase 1 should feed `summarizeRound` **hand-built** `NoteResult[]` with known `responseMs`; do not need to mock `performance.now`.

Profile save later rounds `accuracyPercent` / `averageResponseMs` ([`PracticeRound.tsx:114-115`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/src/components/practice/PracticeRound.tsx#L114-L115)). That rounding is **out of Phase 1** (Risk #6).

**Coupling to flag, not unit-test in the hook this phase:** if `generateRound` returned fewer than 10 notes, `notes.at(index) ?? "C4"` would serve extra C4 targets until 10 results. Asserting `generateRound(mode).length === 10` for both modes is the cheap catch.

**Must challenge (confirmed):** finishing one UI round does not prove bounce, no-immediate-repeat, empty-summary (`averageResponseMs: null`), or that wrongs are included in the average.

**Anti-pattern (confirmed):** storing a recorded `generateRound("random")` array as the expected value. Use properties: length 10; every element ∈ C4–G5 naturals; no immediate index repeat (random); consecutive elements are neighbors or a bounce (stepwise). For stepwise, construct sequences with a **seeded** generator *or* inspect/export bounce logic via testing the public `generateRound("stepwise")` over many samples (all pairs are adjacent in the drill list; the sequence does not jump from G5 to C4). Prefer extracting a deterministic helper later only if samples are too weak — do not snapshot.

### UI wiring vs lib (duplication)

No second judge. Hook imports `generateRound`, `createNoteResult`, `summarizeRound`, `ROUND_LENGTH` from `@/lib/practice`. Components import key lists, `toVexKey`, `formatPitchName`, `ROUND_LENGTH`. Reveal / dwell / playback are Phase 3 / parked — not Phase 1.

**Cheapest layer for #1 and #3: unit tests on `src/lib/practice`. Confirmed.** Hook tests would be extra cost for sequencing (Reveal, dwell) — that is §3 Phase 3 (Risk #7).

### Existing tests and runner

- Test files: **0**
- `package.json` scripts: `dev`, `build`, `preview`, `lint`, `format`, `deploy` — **no `test`**
- Path alias already in [`tsconfig.json`](https://github.com/lanabilan/notes/blob/0ea1dafe6edb7ee0de86d3188b65f9b2a1010da1/tsconfig.json#L8-L11): `"@/*": ["./src/*"]`
- Astro `^6.3.1`, Vite override `^7.3.2`

**Phase 1 runner recommendation:** Vitest with `environment: 'node'` and an explicit `@` alias to `./src`. **Do not** use `getViteConfig()` from `astro/config` for this phase (official Astro path, but Astro 6 has a known crash with some Vitest versions when that helper loads `astro:server`). Pure lib tests do not need Astro, React, or jsdom. Floor: Vitest ≥3.2 is enough for a standalone config; no need to force 4.1-beta unless a later phase adopts `getViteConfig`. Add `npm test` → `vitest run`.

## Code References

- `src/types.ts:10-30` — `PitchId`, `NoteResult`, `RoundSummary`
- `src/lib/practice/pitches.ts:3-17` — `DRILL_NATURALS` (C4–G5)
- `src/lib/practice/pitches.ts:36-69` — piano white/black ids
- `src/lib/practice/pitches.ts:108-111` — `toVexKey`
- `src/lib/practice/scoring.ts:4-14` — `isCorrectTap`, `createNoteResult`
- `src/lib/practice/scoring.ts:18-38` — `summarizeRound`
- `src/lib/practice/sets.ts:5-64` — `ROUND_LENGTH`, random/stepwise, `generateRound`
- `src/lib/practice/index.ts` — public API for tests to import
- `src/components/hooks/usePracticeRound.ts:46,69-74,94-126,137-138` — target fallback, round end, judge wiring, summary
- `src/components/practice/PianoKeyboard.tsx:23-56` — tap emits `PitchId`; highlight is CSS
- `src/components/practice/StaffNote.tsx:65-68` — staff uses `toVexKey` only
- `src/components/practice/PracticeRound.tsx:120-126` — no local judge

## Architecture Insights

- Domain logic was extracted to `src/lib/practice` in S-01 on purpose; the island owns UI phase only. That split makes Phase 1 cheap.
- Equality judge is correct for v1 **because** targets are naturals and piano accidentals are a different id space. Introducing flat `PitchId`s or accidental drill targets would invalidate `===` (already documented in `sharp-flat-names`).
- `ROUND_LENGTH` is shared by generator and hook. Tests should treat **10** as the product contract (FR-004), and the constant as the implementation.
- Randomness is `Math.random()` with no seed. Property tests / many iterations, not snapshots.

## Historical Context (from prior changes)

- `context/archive/2026-08-25-guest-practice-round/plan.md` — oracles: C4–G5 naturals; exactly 10 pitches; stepwise bounce not wrap; black keys tappable and judged against the natural target; reveal-on-demand (Phase 3).
- `context/archive/2026-08-25-guest-practice-round/research.md` — same FR table; no test runner then either.
- `context/changes/sharp-flat-names/plan.md` — display dual names; **scoring stays `target === tapped`**; do not add flat ids. Does not change Risk #1’s judge, but forbids tests that treat `Db4` as a tap id.
- `context/changes/tapped-note-name/plan.md` — prompt copy only; does not change the judge.
- `context/changes/pitch-playback/research.md` — playback of **correct** pitch; scoring unchanged. Out of Phase 1 (§7).

## Related Research

- `context/archive/2026-08-25-guest-practice-round/research.md`
- `context/changes/pitch-playback/research.md`
- `context/archive/2026-09-05-oauth-profile-progress/research.md` (notes `ROUND_LENGTH` / summary as the save moment; not this phase)

## Open Questions

1. **Vitest major (3.2 vs 4.x)** — unconstrained beyond “standalone config, node env.” Pin at implement time to whatever `npm install vitest` resolves that runs `vitest run` on this Vite 7 / Node 22 repo.
2. **Seeding stepwise tests** — public API has no seed. Implement can choose many-sample property tests vs a tiny internal export. Prefer samples first (cost × signal).
3. **Hook `?? "C4"` fallback** — only reachable if generator length ≠ `ROUND_LENGTH`. Covered by the length-10 unit; no hook test in Phase 1.
4. **No §2 corrections to backport** — Risk #1/#3 wording, layers, and hot-spot dirs still hold. `src/components/practice` is wiring/churn, not a second judge.

## Suggested Phase 1 test surface (for `/10x-plan`, not an implementation)

Behavior to assert (oracles from PRD / S-01, not from copying functions):

1. `isCorrectTap` table: C4/C4 correct; C4/D4 wrong; C4/C5 wrong; C4/C#4 wrong; G5/A5 wrong; G5/G5 correct.
2. `toVexKey` table for all 12 drill naturals (`C4` → `c/4`, …).
3. `generateRound("random"|"stepwise")` length is 10; all members are C4–G5 naturals; random has no immediate repeat; stepwise neighbors bounce at ends (never G5→C4 wrap).
4. `summarizeRound`: 10 results with 7 correct → `70`; avg is mean of all `responseMs` including wrongs; empty → `accuracyPercent: 0`, `averageResponseMs: null`. Treat length-10 + “accuracy and average response time exist” as S-01/PRD oracles; treat “wrongs in the mean / empty → null” as characterization of the live aggregator (archive never specified those details).

## Follow-up Research 2026-09-13T16:32+02:00

Corroboration from archive/Vitest pass. No Risk #1/#3 wording change. Details `/10x-plan` should not blur:

- **Bounce is a locked S-01 choice**, not inferred from code: wrap-vs-bounce was an open contract; plan review fixed bounce at C4/G5 (`context/archive/2026-08-25-guest-practice-round/reviews/plan-review.md`).
- **S-01 does not define the summary formula.** Archive says “accuracy % and average response time from per-note timestamps” (`.../plan.md` scoring contract). Whether the average includes wrongs, whether accuracy is rounded, and empty-round `null` vs `0` are live `summarizeRound` behavior (also recorded in `context/archive/2026-09-05-oauth-profile-progress/research.md`). Tests may lock the live formula so it cannot drift silently, but they must not pretend FR-004 specified “include wrongs.”
- **Stay-on-wrong is hook sequencing** (`usePracticeRound` wrong → Reveal → Next). A wrong tap still appends a `NoteResult` (one of the 10). Phase 1 lib tests can judge the tap; they cannot prove stay-on-note. That remains Risk #7 / §3 Phase 3.
- **Random “no immediate repeat”** is a permitted refinement of archive “without pathological repeats,” not a later product change. Property-test it; do not elevate it to a PRD line.
- **`getViteConfig` is extra-dangerous in this repo:** `astro.config` loads Cloudflare + Tailwind Vite + `env.schema`. Official Astro 6 floor for that helper is Vitest ≥3.2 or ≥4.1-beta.5; the `exports is not defined` crash is [astro#15847](https://github.com/withastro/astro/issues/15847); Cloudflare + Vitest 4 has a second failure ([astro#15878](https://github.com/withastro/astro/issues/15878)). Phase 1 standalone `node` + `@` → `./src` alias stands. Vite does not honor `tsconfig` paths without that alias or `vite-tsconfig-paths`.
