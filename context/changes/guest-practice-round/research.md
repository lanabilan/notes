---
topic: guest-practice-round
change_id: guest-practice-round
researcher: agent
date: 2026-08-25
status: complete
---

# Research: Guest practice round (S-01)

> Grounding for `/10x-plan guest-practice-round`. Prefer `prd.md` + `roadmap.md` over older `MVP.md` where they conflict.
>
> Note: `/10x-research` is not installed in this repo’s skill set; this doc was produced ad-hoc to the schema `/10x-plan` expects.

## Goal

Ship the north-star guest loop on the existing mobile shell: show one treble note, tap the matching piano key, get instant feedback (reveal-on-demand when wrong), finish a 10-note round with accuracy + average response time, then practice again or start the next set — no login wall, no ads, session-only progress.

## Product requirements (authoritative)

**Sources:** `context/foundation/prd.md` (US-01, FR-001–005, FR-007, FR-009, FR-010), `context/foundation/roadmap.md` S-01.

| ID | Must-have behavior |
| --- | --- |
| FR-001 | One treble-clef natural note on a staff; pitch set **C4–G5** |
| FR-002 | Answer via **1–2 octave** on-screen piano (tap) |
| FR-003 | Instant correct/wrong; on wrong, **button** reveals correct key + note name (no auto-reveal) |
| FR-004 | Round ends after **10** notes; summary = accuracy + avg response time |
| FR-005 | After round: practice again **or** next set (**random** or **stepwise**) |
| FR-007 | No sign-in; guest progress **session-only, not saved** |
| FR-009 | One screen: staff + piano + score + one-line prompt |
| FR-010 | Mobile-first: large targets, readable staff, no horizontal scroll |

**NFR touchpoints for this flow:** feedback within ~200 ms of tap; no ads/tracking scripts; usable on common phone browsers without H-scroll.

**Out of S-01 (explicit):**

- FR-006 pitch audio, FR-011 key labels / desktop keyboard — parked / defer per roadmap risk
- FR-008 OAuth profile progress — S-02 / F-02
- Bass, accidentals, MIDI, native apps, PWA/offline SW (F-01 deferred offline NFR)
- Auto-reveal of correct key; persistent guest storage

**Open unknown (non-blocking):** solfège vs letter names — default letter names (roadmap Owner: user).

## Foundation already shipped (F-01)

| Contract | Detail |
| --- | --- |
| Public URL | https://readthekey.readthekey.workers.dev |
| Home | `/` → `Layout` + `PracticeShell` (no Topbar / Welcome) |
| Regions | Labeled Score / Staff / Piano placeholders, `min-h-dvh`, safe-area, `overflow-x-hidden` |
| Theme | Light tokens in `global.css` |
| Auth | `/` public; only `/dashboard` protected; auth pages reachable by URL |
| Archive | `context/archive/2026-08-23-mobile-web-shell/` |

## Code references

### Practice shell (fill these regions)

| File | Role |
| --- | --- |
| `src/pages/index.astro` | Home mounts `PracticeShell` only |
| `src/components/PracticeShell.astro` | Static chrome: brand, “Practice coming soon”, empty Score/Staff/Piano |
| `src/layouts/Layout.astro` | Document shell, viewport, optional Supabase missing-config `Banner` |
| `src/styles/global.css` | Calm light practice tokens (`bg-background`, borders, etc.) |

### Guest / auth boundary (do not break)

| File | Role |
| --- | --- |
| `src/middleware.ts` | `PROTECTED_ROUTES = ["/dashboard"]` only — keep `/` public |
| `src/lib/supabase.ts` | Soft-disable when env missing; practice must not depend on Supabase |
| `src/pages/auth/*`, `src/pages/api/auth/*` | Starter auth; leave for F-02; not linked from practice home |

### React island pattern to mirror

| File | Role |
| --- | --- |
| `src/pages/auth/signin.astro` | Hydrates with `client:load` |
| `src/components/auth/SignInForm.tsx` | Interactive island; **no** `"use client"` |
| `src/lib/utils.ts` | `cn()` for class merging |
| `src/components/ui/button.tsx` | shadcn Button available to islands |

### Conventions (CLAUDE.md)

- Astro for static chrome; React only for interactivity
- Hooks → `src/components/hooks/` (folder does not exist yet)
- Services/helpers → `src/lib/` or `src/lib/services/`
- Shared types → `src/types.ts` (does not exist yet)
- Path alias `@/*` → `./src/*`

## Architecture insights

1. **Chrome stays Astro; drill is a React island.** F-01 locked static layout regions. S-01 should hydrate one parent island (or small set) into Score/Staff/Piano rather than rebuilding hosting/theme.
2. **Client-only round engine is enough.** Guest session-only progress (FR-007) needs no API/DB for S-01. Round state can live in React state; do not add `/` to protected routes; do not require Supabase.
3. **No music stack in deps.** `package.json` has React/Astro/Tailwind/shadcn only — no VexFlow, Tone.js, abcjs, etc. First slice can use custom SVG/CSS staff + DOM/CSS piano. Adding a notation lib is a plan decision, not a default.
4. **No audio / SVG / canvas / game-loop code exists** under `src/` today. Expect greenfield UI for staff + piano + timing.
5. **Product authority conflicts with MVP.md:**
   - Reveal: PRD = button on wrong; MVP = auto-highlight → **prefer PRD**
   - Persistence: PRD/roadmap = session-only not saved; MVP = `localStorage` last score → **prefer PRD**
   - Second set / FR-005: PRD must-have; MVP “first slice” deferred second set → **plan must decide** whether both random + stepwise ship in S-01 or one mode + clear stub
6. **Piano range underspecified:** FR-002 says 1–2 octaves while note set C4–G5 spans >1 octave of pitch. Layout vs key count is a plan decision.
7. **Offline NFR remains deferred** unless plan explicitly pulls SW/caching into S-01 (F-01 documented-only).
8. **Parallel track:** F-02 OAuth may proceed alongside S-01 but is blocked on provider choice; must not gate the drill.
9. **Config banner risk:** missing `SUPABASE_*` still shows Layout `Banner` on `/`. Acceptable for F-01; plan may choose to suppress on practice home or leave as-is.

## Gaps S-01 must implement

- Staff renderer (treble, naturals C4–G5)
- On-screen piano with touch targets spanning the chosen octave range
- Round engine: sample note → judge tap → track correctness + latency → stop at 10
- Feedback UX: instant correct/wrong; reveal button when wrong
- Round summary UI + “practice again” / “next set” (random and/or stepwise)
- Prompt line updates during play (replace “Practice coming soon”)
- Types + pure helpers for pitch IDs, set generators, scoring
- Hooks folder if state logic is extracted

## Decisions for `/10x-plan` (do not invent here)

1. Piano layout: one vs two octaves given C4–G5
2. FR-005: both set modes in first ship, or one mode + stub
3. Confirm PRD over MVP on reveal + no guest persistence
4. Letter names vs solfège (default letters unless user overrides)
5. Notation approach: custom SVG vs dependency
6. Whether to suppress Supabase config banner on `/`
7. Whether offline/PWA stays deferred for this change

## Suggested next step

→ `/10x-plan guest-practice-round`

Optional: `/10x-frame guest-practice-round` only if product wants to reopen scope (e.g. localStorage or auto-reveal) against the locked PRD.
