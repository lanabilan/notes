# Sharp / Flat Names — Plan Brief

> Full plan: `context/changes/sharp-flat-names/plan.md`

## What & Why

Black-key taps currently print only the sharp id (`You tapped C#4`). Learners also know that key as a flat. Show both spellings in the prompt (and matching piano `aria-label`) without turning flats into drill targets or scoring ids.

## Starting Point

`tapped-note-name` already names the tap as a raw `PitchId`. `PitchId` and `PIANO_BLACK_KEYS` are sharp-only. Scoring is exact string equality, so `Db4` must not become an id.

## Desired End State

Black keys display as `C#4 / Db4`. White keys and Reveal targets stay `C4`. Keys stay unlabeled on screen. Staff and judgment stay natural-vs-sharp-id as today.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Meaning | Display only | Drill stays treble naturals; accidentals stay a PRD non-goal |
| Form | `C#4 / Db4` | No key signature to prefer one spelling |
| Characters | ASCII `#` and `b` | Matches current `PitchId` text |
| Order | Sharp first | Same as the stored id |
| Surfaces | Prompt + piano `aria-label` | Visible labels are FR-011; SR should match the prompt |
| Naturals | Single name | No E# / Fb pairs on white keys |
| Identity | Keep sharp `PitchId` | `target === tapped` must not treat `Db4` as a new pitch |

## Scope

**In scope:** `formatPitchName`, prompt interpolation, piano `aria-label`.

**Out of scope:** Accidental drill/staff, `PitchId` flats, enharmonic scoring, painted keys, staff aria, glyphs, test runner.

## Architecture / Approach

Pure formatter over existing ids. `promptFor` and `PianoKeyboard` call it. Storage, VexFlow, and `isCorrectTap` stay on sharp `PitchId`s.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Dual names for black keys | `C#4 / Db4` in prompt and piano aria | Accidentally adding `Db4` to `PitchId` / scoring |

**Prerequisites:** `tapped-note-name` shipped (`You tapped` prompt).
**Estimated effort:** ~1 session, single phase.

## Open Risks & Assumptions

- Longer prompt (`You tapped C#4 / Db4. Not quite — …`) still counts as the FR-009 one-liner.
- Screen-reader wording of `/` is acceptable (slash, not “or”).

## Success Criteria (Summary)

- Black-key taps show sharp and flat together.
- White keys and Reveal targets stay one name.
- A sharp tap is still wrong against a natural staff note.
