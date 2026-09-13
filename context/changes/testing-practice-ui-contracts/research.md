---
date: 2026-09-13T18:12:09+02:00
researcher: agent
git_commit: 4769059f8ba15d3ae708932efb5f7dc3f72196ff
branch: main
repository: lanabilan/notes
topic: "Ground rollout Phase 3 (practice UI contracts): Risks #7, #5"
tags: [research, codebase, practice, reveal, piano, layout, vitest]
status: complete
last_updated: 2026-09-13
last_updated_by: agent
---

# Research: Ground rollout Phase 3 (practice UI contracts): Risks #7, #5

**Date**: 2026-09-13T18:12:09+02:00
**Researcher**: agent
**Git Commit**: 4769059f8ba15d3ae708932efb5f7dc3f72196ff
**Branch**: main
**Repository**: lanabilan/notes

## Research Question

Ground rollout Phase 3 of `context/foundation/test-plan.md` (“Practice UI contracts”).

Risks to verify: **#7** (wrong answer auto-reveals the correct key/name instead of waiting for Reveal), **#5** (on a phone, the practice screen is unusable — horizontal scroll or keys too small to tap).

Risk response guidance to verify, not blindly accept:

- **#7**: prove a wrong answer does not show the correct key/name until Reveal is tapped; challenge that feedback appearing means the reveal policy holds; avoid a screenshot of a highlighted key as the oracle. Ground the wrong-answer state machine (stay on note → Reveal optional → Next). Likely cheapest layer: unit (state) if the policy lives outside the DOM; otherwise component.
- **#5**: prove at phone width there is no horizontal scroll and keys remain tappable; challenge that desktop layout implies phone works; avoid visual snapshots of marketing/cosmic leftovers (interview Q5). Ground the viewport contract (~390px) from PRD/archive. Likely cheapest layer: layout assertion or manual smoke — not a page snapshot.

Test types planned in §3: **component / layout assertion**. §7 still excludes cosmic snapshots and full browser e2e of the guest drill. Runner lock from Phases 1–2: standalone Vitest `environment: "node"`, `@` → `./src`, **no** `getViteConfig()`, **no** `app.fetch`.

## Summary

Neither risk is speculative. Reveal sequencing is a live hook; phone fit is a live CSS contract. The planned “component / layout assertion” layer is **slightly too expensive** for both risks if taken to mean mounting `PracticeRound` in jsdom or screenshotting the piano.

| Risk | Where it actually fails | Cheapest useful layer | Guidance verdict |
|------|-------------------------|----------------------|------------------|
| #7 | [`usePracticeRound`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/hooks/usePracticeRound.ts) wrong path does **not** set `revealed`. Only `reveal()` does, and only when `uiPhase === "wrong"`. JSX maps `revealed` → highlight + “Correct note:” in [`PracticeRound.tsx`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/practice/PracticeRound.tsx). | **Hook unit** of `revealed` / `uiPhase` / `index` after wrong, Reveal, Next. Optionally a **source check** that `highlightPitch` is `round.revealed ? round.target : null` and that `promptFor` gates `"Correct note:"` on `revealed`. Do **not** screenshot a ring. Do **not** mount full `PracticeRound` (VexFlow + audio). | Confirmed. “Wrong” feedback and staff glyph are **not** the reveal oracle. Policy lives outside the DOM; the highlight/name wiring is a one-line JSX map. |
| #5 | Piano is 14 whites `flex-1 min-w-0` + 10 blacks as `%` of the row, capped `max-w-3xl`, `aspect-[16/5]`, `min-h-11` height only. Parents stack `overflow-x-hidden`. Viewport **~390px** is an archive/PRD verification number, **not** a literal in `src/`. | **Source / class contract** on `PianoKeyboard` + overflow ancestors (same pattern as Phase 2 home/shell source check). jsdom **cannot** prove `scrollWidth` or 44×44 hit areas. Playwright would be real geometry but §7 forbids full guest-drill e2e this rollout. | Confirmed. Desktop `max-w-3xl` does not prove phone. `overflow-x-hidden` can **mask** overflow — “no scroll” ≠ “everything fits.” No cosmic snapshots. |

Existing tests: Phase 1 units + Phase 2 integration. **No** tests import `usePracticeRound`, `PracticeRound`, or `PianoKeyboard`.

**Runner constraint (still binding):** keep standalone `vitest.config.ts` default `environment: "node"` and the `@` alias. Do **not** switch to Astro `getViteConfig()`. If hook tests need `@testing-library/react` `renderHook`, scope jsdom with `environmentMatchGlobs` on `*.test.tsx` (or a per-file pragma). Do not flip the whole suite to jsdom. There is **no** `jsdom` / `@testing-library/react` in `package.json` today.

## Detailed Findings

### Product oracles (not code)

**Reveal (Risk #7)**

- FR-003 (`context/foundation/prd.md:70`): instant correct/wrong; on wrong answers the correct key is **not** auto-highlighted — learner taps a button to reveal the correct key and note name.
- Non-Goals (`prd.md:124`): no auto-reveal of the correct key on wrong answers.
- US-01 (`prd.md:57`): each wrong answer shows correct/wrong only; learner can tap a button to highlight the correct key and show the note name (e.g. C4).
- S-01 (`context/archive/2026-08-25-guest-practice-round/plan.md:46`): on wrong tap, **stay on the same note**; show Reveal (optional) then require Next before the following note. Correct tap auto-advances.

**Phone (Risk #5)**

- FR-010 (`prd.md:90`): mobile-first, large tap targets, readable staff, usable on phone **without horizontal scroll or tiny keys**.
- US-01 (`prd.md:59`): layout fits the phone with tappable keys and readable notation.
- NFR (`prd.md:99`): usable on common mobile browsers without horizontal scroll.
- Numeric viewport: **not in the PRD**. Archive + test-plan use **~390px** as the verification width (`guest-practice-round/plan.md:26`, `piano-keyboard-layout/plan.md:9–11`, `test-plan.md:58`). No 44px/48px tap-size literal in the PRD.

### Risk #7 — wrong-answer / Reveal state machine

**Sequencing lives in the hook.** `usePracticeRound` owns `uiPhase` and `revealed`. There is no exported reducer; driving it requires mounting the hook.

Wrong tap (`usePracticeRound.ts:110-113`): `lastFeedback: "wrong"`, `uiPhase: "wrong"`. Does **not** call `setRevealed(true)`. Does **not** change `index` / `target`.

Reveal (`117-120`): no-op unless `uiPhase === "wrong"`; then `setRevealed(true)`.

Next (`122-126`): no-op unless `uiPhase === "wrong"`; then `goToNext(results)`, which clears `revealed` and either advances `index` or goes to `summary` (`69-80`). Reveal is **optional** — Next does not require it.

Correct tap (`102-109`): `uiPhase: "correct"`, 400ms dwell, then `goToNext`. Piano disabled whenever `uiPhase !== "playing"` (`PracticeRound.tsx:84`).

Stay-on-note is therefore: wrong → same `index`/`target` → optional `reveal()` → `nextAfterWrong()`.

**Highlight and name live only in JSX.**

```85:85:src/components/practice/PracticeRound.tsx
  const highlightPitch = round.revealed ? round.target : null;
```

```23:31:src/components/practice/PracticeRound.tsx
  if (state.uiPhase === "wrong") {
    if (tapped === undefined) {
      return state.revealed
        ? `Correct note: ${formatPitchName(state.target)}`
        : "Not quite — reveal the answer or go next";
    }
    return state.revealed
      ? `You tapped ${formatPitchName(tapped)}. Correct note: ${formatPitchName(state.target)}`
      : `You tapped ${formatPitchName(tapped)}. Not quite — reveal the answer or go next`;
  }
```

`promptFor` is **not exported**. Reveal/Next buttons show whenever `uiPhase === "wrong"`, including after Reveal (`PracticeRound.tsx:224-230`). Score row shows `"Wrong"` from `lastFeedback` (`181`) — that is **feedback**, not reveal.

`PianoKeyboard` has no `revealed` concept. Highlight CSS is `highlightPitch === pitch` (`PianoKeyboard.tsx:24,38` and `:45,65`). Every key always has `aria-label={formatPitchName(pitch)}` (`30`, `53`) — **aria-label is not a reveal oracle**.

**Paths that are NOT auto-reveal of the correct key/name (do not confuse tests):**

- Staff always draws `round.target` (`PracticeRound.tsx:218`) — the stimulus, independent of `revealed`.
- Optional audio: a judged tap (including wrong) plays `result.target` when sound is on (`PracticeRound.tsx:120-125`). FR-006 is nice-to-have playback of the **correct** pitch; it is not FR-003 visual reveal. Out of scope for Risk #7 unless `/10x-plan` expands it.
- `"Wrong"` text can appear while `revealed === false`. **Challenge held:** feedback appearing does not mean the reveal policy holds.

**Valid oracles (no screenshot):**

| After | Assert |
| ----- | ------ |
| Wrong tap | `uiPhase === "wrong"`, `revealed === false`, same `index`/`target` |
| `reveal()` | `revealed === true` (still same `index`) |
| `reveal()` while not wrong | no-op |
| `nextAfterWrong()` | `revealed === false`, advanced `index` or `uiPhase === "summary"` |
| JSX map | `highlightPitch` is null unless `revealed`; `"Correct note:"` only when `revealed` |

**Do not** use a highlighted-key screenshot, key `aria-label`, or staff glyph as the reveal oracle.

**Mounting `PracticeRound` is the expensive path:** it imports playback (`AudioContext`) and `StaffNote` (dynamic `vexflow` + fonts + `ResizeObserver`). The hook file itself has no DOM, audio, or VexFlow. `performance.now` and `setTimeout` work in Node.

### Risk #5 — phone layout

**Shipped piano (live, not the archive’s `max-w-md`):**

- 14 white keys C4–B5, 10 black keys (`pitches.ts:37-69`; `WHITE_COUNT = PIANO_WHITE_KEYS.length` in `PianoKeyboard.tsx:12`).
- Outer: `mx-auto w-full max-w-3xl overflow-hidden` (`PianoKeyboard.tsx:21`). Archive plan said `max-w-md`; shipped cap is `max-w-3xl` (`piano-keyboard-layout/change.md:14`).
- Row: `relative flex aspect-[16/5] w-full touch-manipulation` (`22`).
- Whites: `h-full min-h-11 min-w-0 flex-1` (`35`) — **no min width**.
- Blacks: absolute `%` left/width from `WHITE_COUNT`, `h-[58%] min-h-11` (`46-62`).
- Height floor is Tailwind `min-h-11` (44px). Width at ~390px with `mx-4` (~358px content) is archive-estimated ~26px white / ~16px black — **narrower than 44px**. “Tappable” in product terms is qualitative FR-010, not a 44×44 box.

**Overflow stack (can hide H-scroll):**

- `html, body { overflow-x: hidden }` (`Layout.astro:44-50`)
- PracticeShell: `w-full max-w-full … overflow-x-hidden` (`PracticeShell.astro:21`)
- PracticeRound root: `w-full max-w-full … overflow-x-hidden` (`PracticeRound.tsx:146`)
- Piano wrapper: `overflow-hidden` (`PianoKeyboard.tsx:21`)

A source check that overflow is hidden would pass even if keys were clipped. Plan/tests must challenge **masking vs fitting**. The **fit** contract in source is: no fixed piano `min-w-*`, whites `min-w-0 flex-1`, blacks `%` of row, `w-full`, no `100vw` on the practice path.

**What would break phone usability:**

- Adding a px `min-width` on the keyboard wider than the column.
- Removing `%` black placement so keys paint outside the row (today clipped by `overflow-hidden`).
- Header chrome without wrap/`min-w-0` (today `flex-wrap` + truncated email).
- `disabled:pointer-events-none` when `uiPhase !== "playing"` — expected during wrong/correct, not a layout bug.

**Viewport:** no `390` / `375` / `414` literals in `src/`. Meta is `width=device-width, initial-scale=1`. Practice `sm:` classes are spacing/type, not piano width. Verification width remains **~390px** from archive/test-plan.

**jsdom cannot honestly prove** document `scrollWidth > clientWidth`, flex+aspect geometry, or touch hit-testing. Phase 2 already uses Node `readFile` source contracts (`protected-routes.test.ts`). That pattern transfers.

**Cosmic leftovers (do not snapshot):** `src/components/Welcome.astro` still exists and is **not** mounted by `/` (`index.astro` → `PracticeShell` only). `global.css:7` comments “no cosmic purple.” §7 + interview Q5 still bind.

Prior piano decision (`piano-keyboard-layout` + S-01): **two octaves C4–B5, scale to container, do not H-scroll**. Not one octave; not a scrollable keyboard. Desktop later added a width cap; phone stays full-bleed in the `mx-4` column.

### Test infrastructure

| Fact | Where |
|------|--------|
| Vitest 5, `environment: "node"`, `@` alias | `vitest.config.ts`, `package.json:13,59` |
| No jsdom / happy-dom / Testing Library | `package.json` |
| All current tests `*.test.ts` | `src/lib/practice/*`, `src/lib/auth/protected-routes.test.ts`, `src/pages/api/profile.test.ts` |
| `jsx: "react-jsx"` already | `tsconfig.json` |
| Phase 1 “no jsdom” was for **lib** tests, not a forever ban on a scoped DOM env | archive `testing-critical-path-coverage` |

Adding jsdom for the **whole** suite would be a regression (heavier, unnecessary for scoring/API). Per-file `// @vitest-environment jsdom` or `environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]]` keeps lib tests on Node without `getViteConfig()`.

Alternative that stays 100% Node: extract a pure transition helper from the hook and unit-test that. That is a **production** change, not required to prove Risk #7 if `renderHook` is acceptable.

## Code References

- [`src/components/hooks/usePracticeRound.ts#L9-L28`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/hooks/usePracticeRound.ts#L9-L28) — `PracticeUiPhase`, `revealed`, `reveal`, `nextAfterWrong`
- [`src/components/hooks/usePracticeRound.ts#L94-L126`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/hooks/usePracticeRound.ts#L94-L126) — wrong does not set `revealed`; `reveal()` / `nextAfterWrong()` gates
- [`src/components/practice/PracticeRound.tsx#L16-L38`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/practice/PracticeRound.tsx#L16-L38) — `promptFor` gates `"Correct note:"` on `revealed`
- [`src/components/practice/PracticeRound.tsx#L84-L85`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/practice/PracticeRound.tsx#L84-L85) — `highlightPitch = revealed ? target : null`
- [`src/components/practice/PracticeRound.tsx#L224-L233`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/practice/PracticeRound.tsx#L224-L233) — Reveal/Next buttons; piano `highlightPitch`
- [`src/components/practice/PianoKeyboard.tsx#L21-L66`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/practice/PianoKeyboard.tsx#L21-L66) — `max-w-3xl`, `aspect-[16/5]`, `min-w-0 flex-1`, `min-h-11`, black `%` width
- [`src/layouts/Layout.astro#L44-L50`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/layouts/Layout.astro#L44-L50) — `overflow-x: hidden` on `html, body`
- [`src/components/PracticeShell.astro#L20-L30`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/components/PracticeShell.astro#L20-L30) — overflow + `client:only="react"` island
- [`src/lib/practice/pitches.ts#L37-L69`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/src/lib/practice/pitches.ts#L37-L69) — 14 whites, 10 blacks
- [`vitest.config.ts`](https://github.com/lanabilan/notes/blob/4769059f8ba15d3ae708932efb5f7dc3f72196ff/vitest.config.ts) — standalone Node runner

## Architecture Insights

1. **Split oracle for #7.** Sequencing (`revealed` stays false on wrong) is hook state. Showing the key/name is a trivial JSX map. A hook test plus a source (or tiny exported) check of that map beats mounting the island. Challenge “feedback appearing means reveal holds” by asserting `"Wrong"` / `lastFeedback` can coexist with `revealed === false`.
2. **§3 “component / layout assertion” vs cost × signal.** Research (ground truth per test-plan §1.3) says hook unit + CSS source contract. Full component tests pull VexFlow. jsdom layout is a false oracle for overflow. Plan should not promote to Playwright because e2e “feels safer.”
3. **Overflow hidden is a clip, not a fit.** Risk #5 tests that only grep `overflow-x-hidden` would pass a keyboard with `min-w-[800px]`. The fit signals are `min-w-0`, `flex-1`, `%` blacks, `w-full`, absence of a piano `min-w-*` px floor.
4. **Phase 1 “no jsdom” vs hook tests.** Default Node stays. A scoped jsdom for `*.test.tsx` does not require `getViteConfig()`. Extracting a reducer is optional and would keep #7 entirely in Node.
5. **Staff + audio are not reveal.** Tests that fail because the staff shows the target, or because `playPitch(result.target)` runs on wrong, are testing the wrong contract.

## Historical Context (from prior changes)

- `context/archive/2026-08-25-guest-practice-round/plan.md` — S-01 wrong-answer flow; two-octave piano without scrolling; VexFlow only inside `client:only` / dynamic import.
- `context/archive/2026-09-06-piano-keyboard-layout/plan.md` — scale to container at ~390px; 14 `flex-1` whites; shipped follow-up cap became `max-w-3xl` + `aspect-[16/5]` (see that folder’s `change.md`).
- `context/archive/2026-09-13-testing-critical-path-coverage/research.md` — standalone Vitest Node, no `getViteConfig`; stay-on-wrong left to Phase 3 / Risk #7.
- `context/changes/testing-guest-access-and-progress-isolation/research.md` — same runner lock; no `app.fetch`; source-check pattern for home/shell.

## Related Research

- `context/archive/2026-09-13-testing-critical-path-coverage/research.md`
- `context/changes/testing-guest-access-and-progress-isolation/research.md`
- `context/archive/2026-08-25-guest-practice-round/research.md` (S-01 product/engine; pre-dates current piano cap)

## Open Questions

1. **`renderHook` + scoped jsdom vs extract a pure transition helper.** Both prove #7 sequencing. Plan should pick one; default in this research is `renderHook` so production code stays as-is, with jsdom **only** for hook tests.
2. **How hard to challenge overflow masking.** A source contract that forbids piano `min-w-[` / `min-w-px` / `w-[` px on `PianoKeyboard.tsx` is honest. Claiming “no H-scroll at 390px” without a browser is not. Manual smoke remains the real-geometry fallback; it is not a CI gate this phase.
3. **Whether to export `promptFor` / `highlightPitch` helper.** Exporting would let Node tests assert the name string without source grep. Optional; source check is enough and matches Phase 2.
4. **Audio-on-wrong.** Out of Risk #7 as product-written (visual key/name). Flag if plan authors want a non-goal note so testers do not treat `playPitch(target)` as a leak.
5. **§2 Source for Risk #5** cites `src/components/practice`. That directory is the right neighborhood (unlike Phase 2’s misleading auth hot-spot). Optional `/10x-test-plan --refresh` only if we want to name `PianoKeyboard.tsx` in Source — do **not** do that in §2; anchors stay in this research.
