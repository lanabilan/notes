# MVP — Learn Piano Notes

A single-player web app that trains beginners to **see a note on the staff and find it on the piano**.

## Problem

Reading music is the usual blocker for new piano students. Apps either dump full theory or gamify songs before the learner can name a note. This product does one job: make staff → key mapping automatic.

## Who it is for

A complete beginner (or returning adult) who knows where middle C is and wants to read treble (then bass) without a teacher sitting next to them. First session is 5 minutes on a phone or laptop. No MIDI keyboard required.

## One-sentence product

Show a note on a staff, tap the matching key on an on-screen piano, get instant feedback, and keep going until the mapping sticks.

## Core loop (the whole MVP)

1. App shows one note on a staff (treble clef, C4–G5 to start).
2. Learner taps a key on a one-octave (then two-octave) on-screen piano.
3. Immediate result: correct / wrong, with the right key highlighted and the note name spoken or shown (`C4`, `F#`).
4. Next note. Optional short audio of the correct pitch.
5. End of round (10 notes): accuracy + time, then “practice again” or “next set”.

If this loop is not fun and obvious in 30 seconds, nothing else matters.

## In scope

| Piece | Why it is MVP |
| --- | --- |
| Treble clef, natural notes C–B in a 2-octave window around middle C | Smallest useful reading set |
| On-screen piano (click/tap), no hardware | Zero setup |
| Immediate visual feedback + note name | Learning happens here |
| Optional pitch playback (Web Audio) | Confirms “this is what that note sounds like” |
| Practice sets: random notes, or stepwise (C then D then E) | First differentiation of difficulty |
| Round summary: n/10 correct, average response time | Proof of progress without accounts |
| Local-only: last score in `localStorage` | No auth, no backend |

## Out of scope (deliberately)

- Accounts, cloud sync, leaderboards
- MIDI / real keyboard input
- Full songs, rhythm, both-hands pieces
- Bass clef, ledger lines beyond one, key signatures, intervals, chords
- Adaptive AI tutor, spaced-repetition engine, “courses”
- Native iOS/Android apps
- Teacher dashboard

Bass clef and accidentals (`#` / `♭`) are the first post-MVP additions, not v1.

## Success (ship it when)

A stranger can open the URL, complete one 10-note round, and say which notes they miss — without instructions beyond a one-line prompt: *“Tap the piano key that matches the note.”*

Quantitatively, after a week of casual use by ~5 beginners:

- First-round completion rate ≥ 80%
- Median time-to-first-tap < 8s (they understood the task)
- Repeat round rate ≥ 40% in the same session (the loop is sticky)

## Constraints

- One screen: staff on top, piano on the bottom, score in a thin bar. No settings maze.
- Works offline after first load. No login wall.
- Accessible: keys labeled on demand (`C D E…`), large tap targets, keyboard fallback (A–K or similar) on desktop.
- Session state survives refresh (current set + last score only).

## First slice to build

Staff + piano + tap-to-answer + right/wrong + 10-note round. Audio, localStorage, and a second difficulty set come after that loop is playable.

## Open decisions (do not block the first slice)

- Mobile-first PWA vs simple desktop web page (default: mobile-first web).
- Solfège (`do re mi`) vs letter names (default: letter names, language-toggle later).
- Whether wrong answers repeat immediately or only at end of round (default: show correct key, then next note).
