---
topic: pitch-playback
change_id: pitch-playback
researcher: agent
date: 2026-08-28
status: complete
---

# Research: Pitch playback (FR-006)

> Grounding for `/10x-plan pitch-playback`. Prefer `prd.md` over `MVP.md` where they conflict.
>
> Note: `/10x-research` is not installed in this repo’s skill set; this doc was produced ad-hoc to the schema `/10x-plan` expects.

## Goal

Let a guest optionally hear the **correct** pitch during the existing 10-note practice loop, so they can confirm “this is what that staff note sounds like” — without a login wall, without ads, and without turning the drill into ear-matching.

## Product requirements (authoritative)

**Sources:** `context/foundation/prd.md` (Secondary Success, FR-006, FR-009, FR-010, NFR feedback latency), `context/foundation/roadmap.md` (parked item), `MVP.md` (Web Audio confirmation).

| ID / source | Must-have behavior for this change |
| --- | --- |
| FR-006 | Guest can hear **optional** pitch playback for the **correct** note. Priority: **nice-to-have** |
| Secondary success | Playback happens **after each note** so the learner hears what the correct note sounds like |
| MVP.md | “Optional short audio of the correct pitch” via **Web Audio**; confirms the sound, does not replace the visual loop |
| FR-003 | Reveal stays on-demand; audio must not auto-highlight the key |
| FR-009 | One screen + one-line prompt — **no settings maze** |
| FR-010 | Mobile-first; no H-scroll; large targets |
| NFR | Visual feedback still within ~200 ms of tap; no ads/tracking; guest loop stays client-only |

**Socrates note (PRD):** pitch may teach ear-matching instead of staff reading. Resolution: it stands as written — **optional, not required for the core loop**. Implication: do **not** play the target pitch *before* the learner answers (that leaks the answer to anyone who can match by ear). Playback is confirmation, not a preview.

**Out of this change (explicit):**

- FR-011 key labels / desktop keyboard
- FR-008 OAuth / profile progress (F-02 / S-02)
- Piano-as-instrument (sounding every tapped key, including wrong black keys) — **not** what FR-006 asks; that would be a different feature
- Sampled concert-piano libraries, MIDI, native apps
- Persistence of a mute/preference across refresh (guest progress is session-only, FR-007)
- Changing round length, pitch set, VexFlow staff, or scoring rules

**Roadmap status:** FR-006 is a **parked** nice-to-have (`speed` / `time`), not a numbered slice. This change pulls it forward off the parked list; it has no `Change ID` row of its own.

## Foundation already shipped (S-01)

| Contract | Detail |
| --- | --- |
| Public URL | https://readthekey.readthekey.workers.dev |
| Home | `/` → `Layout` + `PracticeShell` + `PracticeRound` (`client:only="react"`) |
| Loop | 10 notes, C4–G5 naturals on staff; piano C4–B5 including black keys as wrong guesses |
| Feedback | Correct → **auto-advance** to next note (or summary). Wrong → stay; Reveal (optional) then Next |
| Score quirk | `lastFeedback === "correct"` is shown on the **next** note because advance is immediate |
| Auth | `/` public; practice does not use Supabase |
| Archive | `context/archive/2026-08-25-guest-practice-round/` |

## Code references

### Round loop (where audio would hook)

| File | Role |
| --- | --- |
| `src/components/hooks/usePracticeRound.ts` | UI phases `playing` \| `wrong` \| `summary`. `onNote` records result; correct calls `goToNext` immediately; wrong sets `uiPhase: "wrong"`. `reveal` / `nextAfterWrong` are the only dwell on a judged note. |
| `src/components/practice/PracticeRound.tsx` | Island chrome: prompt, score, staff, piano, Reveal/Next, summary CTAs. Piano `disabled` whenever `uiPhase !== "playing"`. |
| `src/components/practice/PianoKeyboard.tsx` | Tap → `onNote(pitch)`. No sound. Highlight only when `highlightPitch` is set (reveal). |
| `src/components/practice/StaffNote.tsx` | VexFlow SVG of `pitch`; dynamic `import("vexflow")` inside `useEffect` so Workers never evaluate it. |

### Pitch model (frequency mapping lives next to this)

| File | Role |
| --- | --- |
| `src/types.ts` | `PitchId` = naturals `C4`–`B5` plus sharps `C#`/`D#`/`F#`/`G#`/`A#` in octaves 4–5 |
| `src/lib/practice/pitches.ts` | `DRILL_NATURALS` (C4–G5), piano white/black key lists, `toVexKey` |
| `src/lib/practice/index.ts` | Barrel — add any new pure helper here |
| `src/lib/practice/scoring.ts` | Tap vs target; unchanged by audio |
| `src/lib/practice/sets.ts` | Round generators; unchanged by audio |

### Shell / constraints to preserve

| File | Role |
| --- | --- |
| `src/components/PracticeShell.astro` | `min-h-dvh`, safe-area, `overflow-x-hidden`; mounts the island |
| `src/pages/index.astro` | Home — keep public |
| `src/middleware.ts` | `PROTECTED_ROUTES = ["/dashboard"]` only |
| `src/layouts/Layout.astro` | No CSP today (AudioContext is unrestricted); config Banner unchanged |

### Conventions (CLAUDE.md)

- Astro chrome; React only for interactivity; **no** `"use client"`
- Hooks → `src/components/hooks/`
- Pure helpers → `src/lib/practice/`
- Shared types → `src/types.ts`
- Path alias `@/*` → `./src/*`
- No test runner — verify with `npm run lint` + `npm run build` + manual phone pass

## Architecture insights

1. **Audio is 100% client-side.** Cloudflare Workers never play sound. Follow the VexFlow pattern: keep any browser audio API behind the React island (`client:only="react"`), never import it from Astro frontmatter or a top-level SSR module.

2. **Correct-path auto-advance is the integration snag.** `onNote` → correct → `goToNext` in the same tick. The staff then shows the *next* pitch while “Correct” still refers to the previous one. Playing the previous note’s frequency at that moment would sonically disagree with the visible staff. Wrong-path is easy: the target stays on screen until Next.

3. **Mobile autoplay policy is the other snag.** Safari/Chrome start `AudioContext` **suspended** until a user gesture. Piano taps and Reveal/Next **are** gestures, so playback-on-tap (or on a Hear button) can `resume()` in the same handler. Playback-on-note-shown (no tap yet) will silently fail on the first note of a session.

4. **No audio stack exists.** `package.json` has `vexflow` but nothing for sound (no Tone.js, Howler, sample files). `src/` has zero `AudioContext` / oscillator usage. No CSP header to relax.

5. **Oscillator vs library vs samples:**
   - **Web Audio `OscillatorNode` + gain envelope** — 0 deps, works offline with no assets, tiny, sounds like a synth beep. Matches MVP.md’s “Web Audio” wording and the “confirmation” job. Preferred default for an after-hours nice-to-have.
   - **Tone.js** — nicer API/synths, but a large extra bundle on top of VexFlow; overkill for ~12 drill pitches.
   - **Sampled piano (mp3/ogg)** — more realistic, but asset weight, decode latency, and no extra pedagogy for “hear the pitch class.” Skip unless the user wants realism.

6. **Frequency math is a pure function of `PitchId`.** A4 = 440 Hz, MIDI note 69; `C4` = MIDI 60. Reuse the same `/^([A-G])([#b]?)(\d)$/` parse already in `toVexKey`. FR-006 only needs **correct** drill naturals (C4–G5), not black keys or A5/B5 — unless the plan also sounds the piano.

7. **“Optional” is overloaded.** PRD uses it for (a) nice-to-have priority and (b) “not required for the core loop.” It does **not** specify a mute toggle vs always-on-after-answer vs a Hear button. FR-009 argues against a settings screen. Session-only (FR-007) argues against persisting a preference.

8. **NFR 200 ms is visual.** Audio start must not delay `setLastFeedback` / phase changes. Fire-and-forget a short envelope (~200–400 ms decay) after the state update, or from the same tap handler after `resume()`.

9. **iOS silent switch is inconsistent** for Web Audio (sometimes plays, sometimes not). Manual verify on a real iPhone, not only desktop Chrome. Do not treat silence-as-failure if the oscillator ran.

10. **Do not play before the answer.** Previewing the target on note-show (or a Hear-before-tap that plays the staff pitch) is the ear-matching leak Socrates flagged. A Hear button that plays the target *after* wrong, or auto-play of the correct pitch *after* a tap, stays in product intent.

## Gaps this change must implement

- `PitchId` → frequency (Hz) helper next to `src/lib/practice/pitches.ts`
- Tiny playback helper: create/resume `AudioContext`, play one pitch with a short envelope, ignore overlapping notes (stop previous oscillator)
- Unlock/resume context on the first qualifying user gesture
- Hook into the round UI at the chosen trigger (plan decision) without regressing auto-advance, Reveal/Next, or summary
- Visible optional control if the plan chooses mute/Hear (must fit FR-009: score bar or staff row, not a settings page)
- Degrade silently if `AudioContext` is missing or `resume()` rejects — visual loop unchanged
- Manual pass on phone Safari: first-tap actually makes sound; no H-scroll; no login wall

## Decisions for `/10x-plan` (do not invent here)

1. **Trigger:** auto-play correct pitch after every answer, vs Hear button, vs both (e.g. auto after correct + Hear on wrong)
2. **Correct-path dwell:** insert a short hold so audio matches the visible note, vs skip audio on correct (wrong-path only), vs play previous pitch while next note is already showing
3. **Oscillator vs Tone.js vs samples** (research default: Web Audio oscillator, 0 new deps)
4. **Mute/off control:** always-on once shipped, vs in-session toggle, vs Hear-only (no auto)
5. **Waveform/duration:** sine vs triangle; envelope length — keep short so it cannot smear into the next staff note
6. **Scope of pitches:** drill naturals only (FR-006) vs also sounding the tapped piano key (out of FR-006; only if the user wants it)

## Suggested next step

→ `/10x-plan pitch-playback`

Optional: `/10x-frame pitch-playback` only if product wants to reopen “play before answer” or “sound the whole piano” against the locked PRD.
