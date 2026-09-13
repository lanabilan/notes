# Tapped Note Name — Plan Brief

> Full plan: `context/changes/tapped-note-name/plan.md`

## What & Why

After a tap, the learner never sees which letter they hit — only Correct/Wrong, and (if they Reveal) the *target* name. Name the tapped key in the one-line prompt so a miss on C# vs D is readable without painting labels on the keys.

## Starting Point

`results[].tapped` already stores the id. `promptFor` ignores it. Reveal already prints `Correct note: C4`. Piano keys stay unlabeled (FR-011 parked). Flats are a sibling change.

## Desired End State

Every scored tap prefixes `You tapped C4` (or `C#4`) on the prompt. Wrong+Reveal keeps that tap and adds the target. Playing, summary, and the Score row stay as they are.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Where | Prompt only | FR-009 is one line; score stays Correct/Wrong |
| Format | `C4` / `C#4` | Matches Reveal; letter-only is ambiguous (C4 vs C5) |
| When | Every scored tap | Correct currently never names the pitch either |
| Reveal | Tap + `Correct note: …` | Tapped ≠ target; both are useful |
| Copy | Always “You tapped {id}” | Stable clause across correct/wrong/reveal |
| Flats | Out of scope | Owned by `sharp-flat-names` |

## Scope

**In scope:** Prompt copy for correct, wrong, and wrong+revealed using existing `PitchId`s.

**Out of scope:** Key labels, staff names, accidental drill, flats, score-row ids, highlighting the tapped key, test runner.

## Architecture / Approach

Derive the current tap from `results.at(-1)` while `uiPhase` is `correct` or `wrong`. Change `promptFor` in `PracticeRound.tsx`. Avoid a second `lastTapped` flag unless typing requires it.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Name the tap in the prompt | `You tapped {id}` on scored taps; Reveal still names the target | Reading `results.at(-1)` during playing/summary would show the wrong note |

**Prerequisites:** Running `/` (`npm run dev`).
**Estimated effort:** ~1 session, single phase.

## Open Risks & Assumptions

- ASCII `#` in `C#4` is accepted until `sharp-flat-names`.
- Longer wrong-line copy still counts as the FR-009 one-line prompt.

## Success Criteria (Summary)

- Correct and wrong taps name the key in the prompt.
- Reveal shows tap and target together.
- Score, staff, keys, and playback unchanged.
