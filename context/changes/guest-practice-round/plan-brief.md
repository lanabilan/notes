# Guest Practice Round — Plan Brief

> Full plan: `context/changes/guest-practice-round/plan.md`
> Research: `context/changes/guest-practice-round/research.md`

## What & Why

Ship the north-star guest drill on the existing ReadTheKey mobile shell: see a treble note, tap the matching piano key, get instant feedback (reveal on demand when wrong), finish 10 notes with accuracy + average response time, then practice again or switch set mode — without ads, paywall, or login.

## Starting Point

F-01 left a branded three-region placeholder on `/` (Score / Staff / Piano) at https://readthekey.readthekey.workers.dev. No drill logic or music libraries exist yet; React islands are already used for auth forms.

## Desired End State

A guest on a phone can complete a full practice round in one screen: VexFlow staff, two-octave piano, feedback/reveal, summary, and both random and stepwise sets. Progress is session-only. Auth and config banner behavior stay unchanged.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Product authority | PRD over MVP | Reveal-on-button + session-only match locked PRD | Research |
| Piano range | Two octaves C4–B5; drill targets C4–G5 naturals | Fits FR-002 and full set without scrolling | Plan |
| Piano black keys | Interactive; `#` taps allowed as guesses (wrong vs natural targets in v1) | Realistic keyboard; accidentals stay out of staff set | Plan |
| Practice sets | Both random and stepwise (stepwise bounces at C4/G5) | Fully satisfies FR-005 | Plan |
| Notation | VexFlow 5 | Real treble engraving for readability | Plan |
| Note names | Letter names (C4…) | Roadmap default | Plan |
| Wrong-answer flow | Stay + optional Reveal + Next; correct auto-advances | Matches FR-003 pedagogy | Plan |
| Config banner | Leave Layout banner | Avoid scope creep | Plan |
| Offline/PWA | Stay deferred | F-01 decision; not S-01 | Research |

## Scope

**In scope:** Pitch model + generators; VexFlow staff; CSS piano; round loop; summary; random/stepwise; mobile one-screen polish; lint/build.

**Out of scope:** Audio, key labels/desktop keyboard, OAuth/persistence, auto-reveal, bass/accidentals **on the staff**, PWA, banner removal, auth cleanup.

## Architecture / Approach

Astro shell stays chrome; one React `PracticeRound` island (`client:only="react"`, or dynamic VexFlow import) owns UI state. Pure TS in `src/lib/practice/` + `src/types.ts` for pitches/sets/scoring. VexFlow redraws staff via DOM ref; piano is CSS/DOM taps.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Pitch model & round engine | Types + generators + scoring helpers | Stepwise edge rule |
| 2. Staff + piano UI | VexFlow + two-octave keyboard in shell | Bundle size / H-scroll |
| 3. Round loop & summary | Full 10-note UX + set modes | Reveal/next state machine |
| 4. Mobile polish & ship check | Phone smoke + quality gate | Fit on narrow viewports |

**Prerequisites:** F-01 archived/done (satisfied).
**Estimated effort:** ~2–3 sessions across 4 phases.

## Open Risks & Assumptions

- VexFlow font loading on Cloudflare Workers client bundle may need a one-time mount workaround.
- Showing black keys as tappable (accidentals as wrong guesses vs natural targets) must stay clear so guests don’t think sharps are on the staff set yet.
- Optional production redeploy is implementer choice; local/phone-width verification is required.

## Success Criteria (Summary)

- Guest completes a 10-note round on phone-width without login or H-scroll
- Wrong → reveal letter name + key; summary shows accuracy + avg time; both set modes work
- Lint/build green; no ads/tracking; auth URLs still load
