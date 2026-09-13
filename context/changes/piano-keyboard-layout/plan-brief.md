# Piano Keyboard Layout — Plan Brief

> Full plan: `context/changes/piano-keyboard-layout/plan.md`

## What & Why

The practice piano scales to the full content width with a fixed height, so on a wide browser the keys look short and stretched. Cap it at phone-like width so desktop practice still looks like a piano.

## Starting Point

14 white keys (C4–B5) are `flex-1` in a `w-full` row (`h-28` / `sm:h-32`). S-01 chose “scale to container width” to avoid H-scroll on ~390px. That rule is what stretches on desktop.

## Desired End State

Phone: unchanged full-bleed in the `mx-4` column. Desktop: keyboard maxes at `max-w-md`, centered. Taps, range, staff, and score stay as they are.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| What to cap | Piano only | Stretch is the keyboard’s aspect ratio, not the staff | Plan |
| How | `max-w-md` + `mx-auto` | Smallest CSS change; height and tap targets stay | Plan |
| Phone | Full-bleed (cap inert below 28rem) | Preserves S-01 no-H-scroll | Plan |
| Alignment | Center in the piano section | Natural for a widget narrower than the page | Plan |
| Width | `max-w-md` (28rem) | Restores taller-than-wide keys | Plan |

## Scope

**In scope:** Width cap and centering on `PianoKeyboard`.

**Out of scope:** Staff/score/header max-width; height scaling; range/FR-011/MIDI; H-scroll; test runner.

## Architecture / Approach

One class change on the existing wrapper. Black keys are `%` of the row, so they follow the cap. Parents stay full-bleed.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Cap and center the practice piano | Desktop piano stops stretching; phone unchanged | Cap too small/large, or accidentally insetting the phone layout |

**Prerequisites:** Running `/` (`npm run dev`).
**Estimated effort:** ~1 session, single phase.

## Open Risks & Assumptions

- Empty side space on a 1440px monitor is accepted (piano stays ~448px).
- Staff remaining full-bleed next to a narrower piano is accepted.

## Success Criteria (Summary)

- ~390px: no H-scroll, piano still fills the column.
- Wide viewport: piano centered, not stretched.
- Practice behavior (tap, reveal, playback) unchanged.
