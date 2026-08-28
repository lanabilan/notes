# Guest Practice Round Implementation Plan

## Overview

Fill the F-01 practice shell on `/` with a guest-only 10-note treble drill: VexFlow staff note (C4–G5 naturals), two-octave on-screen piano, instant feedback with on-demand reveal, round summary (accuracy + average response time), and random/stepwise sets — no login, no persistence, no audio.

## Current State Analysis

- Public shell at https://readthekey.readthekey.workers.dev: `Layout` + `PracticeShell` with branded header and empty Score / Staff / Piano regions.
- `/` is public (`PROTECTED_ROUTES` is only `/dashboard`). Auth starter remains reachable by URL; out of scope.
- No staff/piano/round logic, no music libraries, no `src/types.ts` or `src/components/hooks/` yet.
- React islands already used for auth (`client:load`, no `"use client"`).
- Product authority is PRD + roadmap S-01; prefer over conflicting MVP.md (auto-reveal, localStorage).

### Key Discoveries:

- Shell contract to preserve: `min-h-dvh`, safe-area, `overflow-x-hidden`, light theme tokens, three labeled regions — `src/components/PracticeShell.astro`.
- Island pattern to mirror: `src/pages/auth/signin.astro` + `src/components/auth/SignInForm.tsx`.
- VexFlow 5 (`vexflow` on npm) renders via DOM/`useEffect` (SVG/canvas), not React VDOM — wrap in a small staff component with a container ref.
- Guest loop is client-only; no API or Supabase required for S-01.

## Desired End State

A guest on a phone opens `/`, plays a 10-note round against a readable treble staff and tappable two-octave piano (C4–B5 keys; targets C4–G5), sees instant correct/wrong feedback, can reveal the correct key and letter name when wrong, then views accuracy + average response time and chooses practice again or next set (random or stepwise). Session state is in memory only. Lint/build green; Layout config banner unchanged.

**Verify:** complete one round on ~390px viewport without H-scroll or login; wrong-path reveal works; both set modes reachable after summary; `npm run lint` and `npm run build` pass.

## What We're NOT Doing

- Pitch audio (FR-006), key labels / desktop keyboard (FR-011)
- OAuth / profile / auth API changes (F-02 / S-02)
- Guest persistence (`localStorage` / refresh survival) — session-only per FR-007
- Auto-reveal of correct key
- Bass clef, accidentals **as staff targets**, MIDI, PWA/offline SW
- Suppressing or removing Layout Supabase config banner
- Redesigning brand/theme/hosting; deleting Welcome/Topbar/auth pages

## Implementation Approach

Four phases: (1) pure pitch + round engine, (2) VexFlow staff + CSS piano UI into the shell, (3) wire the full interactive loop and summary/set UX, (4) mobile polish and quality gate. Keep business logic in `src/lib/` (and `src/types.ts`); React island owns UI state; Astro shell stays thin chrome.

## Critical Implementation Details

**VexFlow lifecycle:** Clear and redraw the staff container when the target pitch changes; load/set fonts once per island mount (VexFlow 5 font API). Avoid leaking duplicate SVG nodes on re-render. Do **not** rely on a bare top-level `import "vexflow"` under `client:load` (Astro still SSR-imports that module on Cloudflare). Mount the practice island with `client:only="react"`, **or** keep `client:load` only if VexFlow is loaded via dynamic `import()` inside `useEffect`.

**Wrong-answer sequencing:** On wrong tap, stay on the same note; show Reveal (optional) then require Next (or equivalent) before the following note. On correct tap, advance automatically to the next note (or summary after the 10th).

**Piano vs drill set:** Render white and black keys for C4–B5. Staff targets remain **natural** C4–G5 only (FR-001). **Black keys are interactive** — the guest may tap sharps/flats as guesses; those taps are judged against the current natural target (a `#` key is wrong unless/until accidentals enter the drill set later). Do not disable black keys.

## Phase 1: Pitch model & round engine

### Overview

Define pitch IDs, the C4–G5 natural set, random and stepwise generators, and pure functions for judging answers and aggregating round stats — no UI.

### Changes Required:

#### 1. Shared types

**File**: `src/types.ts` (new)

**Intent**: Introduce pitch and round domain types used by lib + UI.

**Contract**: Pitch id (e.g. letter+octave), practice set mode (`random` | `stepwise`), round/result DTOs sufficient for scoring and summary (correctness, response times, accuracy, average ms).

#### 2. Pitch set & generators

**File**: `src/lib/practice/` (or `src/lib/services/practice/`) — e.g. `pitches.ts`, `sets.ts`

**Intent**: Encode the natural C4–G5 set and produce a 10-note sequence for a chosen mode.

**Contract**: Exported constants/helpers for the drill pitch list; `generateRound(mode)` returns exactly 10 pitches. Random = uniform (or shuffled without pathological repeats if easy). Stepwise = consecutive scale steps within the set; **bounce at ends** (reverse direction at C4 / G5 — do not wrap).

#### 3. Scoring helpers

**File**: same practice lib module(s)

**Intent**: Judge taps and compute round summary metrics without React.

**Contract**: Pure functions: compare tap vs target; accumulate results; compute accuracy % and average response time from per-note timestamps.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- Pitch set includes exactly the C4–G5 naturals; `generateRound` returns length 10 for both modes — **automated gate is TypeScript compile via `npm run build`** (exports must typecheck). Do **not** add a test runner in this phase; behavior spot-check is Manual 1.4.

#### Manual Verification:

- Spot-check generator outputs in a short REPL/dev log: random varies; stepwise moves by adjacent naturals

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Staff + piano UI

### Overview

Add `vexflow`, render the current target note on a treble staff, and render a two-octave piano; mount a React island into the practice shell regions (static chrome can remain Astro around the island).

### Changes Required:

#### 1. Dependency

**File**: `package.json` / lockfile

**Intent**: Add VexFlow 5 for notation rendering.

**Contract**: Dependency `vexflow` installed; build succeeds with the library imported from a React component.

#### 2. Staff component

**File**: `src/components/practice/StaffNote.tsx` (name flexible under `practice/`)

**Intent**: Draw one treble-clef natural note for the current pitch via VexFlow into a sized container.

**Contract**: Props: pitch id (+ optional highlight state later). Uses ref + `useEffect` redraw; load VexFlow via dynamic `import()` in that effect (or rely on parent `client:only="react"` so the module never evaluates on the server). No time signature clutter required. Readable on ~390px width.

#### 3. Piano component

**File**: `src/components/practice/PianoKeyboard.tsx`

**Intent**: Two-octave on-screen piano (C4–B5) with large tap targets; emit pitch on press.

**Contract**: Props: `onNote` / disabled / optional highlight pitch for reveal. All white and black keys in C4–B5 are tappable; emit pitch id including accidentals (e.g. `C#4`). Avoid H-scroll (scale to container width). Use `cn()` and theme tokens.

#### 4. Shell integration (skeleton)

**File**: `src/components/PracticeShell.astro`, `src/pages/index.astro` as needed

**Intent**: Replace empty Staff/Piano placeholders with a hydrated island that can show a sample/static pitch (full round loop is Phase 3).

**Contract**: Island mounted with `client:only="react"` (preferred) so VexFlow never hits Workers SSR; dynamic `import("vexflow")` in `useEffect` is an acceptable alternative if `client:load` is kept. Brand header remains. Score region may still be placeholder until Phase 3.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `vexflow` present in `package.json`

#### Manual Verification:

- Devtools ~390px: staff shows a treble note; piano visible without horizontal scroll; tapping a key logs/fires callback
- No Topbar / sign-in CTAs on `/`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Round loop & summary

### Overview

Wire the round engine to the UI: live score/prompt, feedback + reveal + next, 10-note completion, summary with practice-again and next-set (mode choice for random/stepwise).

### Changes Required:

#### 1. Round island / hook

**File**: `src/components/practice/PracticeRound.tsx` and optionally `src/components/hooks/usePracticeRound.ts`

**Intent**: Own round state (current index, results, mode, UI phase: playing | wrong | summary).

**Contract**: Starts a round on mount (default mode: random unless product prefers last choice — default **random** for first visit). Tracks response time from note shown → tap. Correct → next note or summary. Wrong → feedback + Reveal (highlights piano key + shows letter name) + Next to continue without auto-advancing.

#### 2. Score bar & prompt

**File**: same island / shell header integration

**Intent**: Replace “Practice coming soon” with a one-line practice prompt; score region shows progress (e.g. note i/10) and lightweight feedback text.

**Contract**: FR-009 one-line prompt; score bar stays thin (`shrink-0`). Letter names only (e.g. `C4`).

#### 3. Summary & sets

**File**: within PracticeRound UI

**Intent**: After 10 notes, show accuracy + average response time; actions: practice again (same mode) and next set (switch or pick random/stepwise).

**Contract**: Both modes available per FR-005 (e.g. “Practice again”, “Next set: stepwise/random”). No persistence across refresh.

#### 4. Keep guest boundary

**File**: `src/middleware.ts` (verify only)

**Intent**: Ensure `/` stays public.

**Contract**: Do not add `/` to `PROTECTED_ROUTES`. No new auth requirements.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `/` still mounts practice island (no Welcome as primary child)

#### Manual Verification:

- Complete a full 10-note round; summary shows accuracy + avg time
- Wrong path: reveal shows correct key + letter name; Next continues
- Correct path: advances without forcing reveal
- Can start another round and a round in the other set mode
- No login wall; session state lost on full refresh (expected)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Mobile polish & ship check

### Overview

Harden one-screen mobile UX and confirm quality gates; document any deploy follow-up (redeploy is optional if already live from F-01).

### Changes Required:

#### 1. Layout polish

**File**: practice components / `PracticeShell.astro` as needed

**Intent**: Ensure staff + piano + score fit without H-scroll; tap targets remain usable; reveal highlight visible.

**Contract**: ~390px viewport: no horizontal scroll; feedback within snappy feel (aim &lt;200 ms to show correct/wrong state — no network).

#### 2. Quality gate

**File**: none operational beyond fixes

**Intent**: CI-equivalent local lint+build green.

**Contract**: `npm run lint` and `npm run build` pass.

#### 3. Deploy note (optional)

**File**: `context/changes/guest-practice-round/change.md` Notes if redeployed

**Intent**: If implementer runs `wrangler deploy`, record that production URL now serves the drill.

**Contract**: Public URL still https://readthekey.readthekey.workers.dev unless hosting changes.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Phone or phone-width: full round playable without H-scroll or login
- Spot-check `/auth/signin` still loads
- No ads/tracking scripts added

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. S-01 is complete when the full guest round works on a phone-width viewport.

---

## Testing Strategy

### Unit Tests:

- None required if no test runner exists; prefer pure functions that are easy to test later
- Do not add Vitest/Jest solely for this change unless already in the stack

### Integration Tests:

- None required; rely on lint + build + manual round smoke

### Manual Testing Steps:

1. Start round; confirm staff note and piano on one screen
2. Tap correct key → advances; tap wrong → Reveal + Next
3. Finish 10 notes → summary metrics sensible
4. Practice again + other set mode
5. Hard refresh → progress gone (session-only)
6. `/auth/signin` still responds

## Performance Considerations

VexFlow adds bundle weight — keep staff redraw scoped to pitch changes; avoid re-creating factories every frame. Piano should be CSS/DOM, not canvas-per-frame. No audio work in this change.

## Migration Notes

- Guests who bookmarked the F-01 placeholder see a live drill after deploy.
- No data migration; no schema changes.
- Auth demo and config banner behavior unchanged.

## References

- Related research: `context/changes/guest-practice-round/research.md`
- PRD: `context/foundation/prd.md` (US-01, FR-001–005, 007, 009–010)
- Roadmap S-01: `context/foundation/roadmap.md`
- F-01 archive: `context/archive/2026-08-23-mobile-web-shell/`
- Shell: `src/components/PracticeShell.astro`
- Island example: `src/pages/auth/signin.astro`, `src/components/auth/SignInForm.tsx`
- VexFlow: https://www.npmjs.com/package/vexflow

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Pitch model & round engine

#### Automated

- [x] 1.1 `npm run lint` passes — ae997d1
- [x] 1.2 `npm run build` passes — ae997d1
- [x] 1.3 Pitch set is C4–G5 naturals; `generateRound` length 10 both modes (compile/export via build; no test runner) — ae997d1

#### Manual

- [x] 1.4 Spot-check generator outputs: random varies; stepwise uses adjacent naturals — ae997d1

### Phase 2: Staff + piano UI

#### Automated

- [x] 2.1 `npm run lint` passes — 1e9164c
- [x] 2.2 `npm run build` passes — 1e9164c
- [x] 2.3 `vexflow` present in `package.json` — 1e9164c

#### Manual

- [x] 2.4 ~390px: staff note + piano visible, no H-scroll; key tap fires — 1e9164c
- [x] 2.5 No Topbar / sign-in CTAs on `/` — 1e9164c

### Phase 3: Round loop & summary

#### Automated

- [x] 3.1 `npm run lint` passes — 5fece19
- [x] 3.2 `npm run build` passes — 5fece19
- [x] 3.3 `/` mounts practice island (not Welcome) — 5fece19

#### Manual

- [x] 3.4 Complete 10-note round; summary shows accuracy + avg time — 5fece19
- [x] 3.5 Wrong path: reveal key + letter name; Next continues — 5fece19
- [x] 3.6 Correct path advances without forced reveal — 5fece19
- [x] 3.7 Practice again + other set mode works — 5fece19
- [x] 3.8 No login wall; refresh clears session state — 5fece19

### Phase 4: Mobile polish & ship check

#### Automated

- [x] 4.1 `npm run lint` passes — cf55a78
- [x] 4.2 `npm run build` passes — cf55a78

#### Manual

- [x] 4.3 Phone-width: full round without H-scroll or login — cf55a78
- [x] 4.4 `/auth/signin` still loads — cf55a78
- [x] 4.5 No ads/tracking scripts added — cf55a78
