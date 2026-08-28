---
project: "ReadTheKey"
version: 1
status: draft
created: 2026-08-23
updated: 2026-08-28
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: ReadTheKey

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Existing piano-note apps interrupt practice with ads or paywalls. ReadTheKey is a free, ad-free staff-note → on-screen piano drill: show a note, tap the matching key, get instant feedback. Guests practice with no login; only signed-in OAuth users keep progress in their profiles.

## North star

**S-01: Guest completes a 10-note mobile practice round** — the north star (the smallest end-to-end slice whose successful delivery would prove the core product hypothesis) is placed as early as Prerequisites allow because Primary Success Criteria are this exact guest flow with no ads, paywall, or login.

## At a glance

| ID    | Change ID                 | Outcome (user can …)                                                                 | Prerequisites | PRD refs                                      | Status   |
| ----- | ------------------------- | ------------------------------------------------------------------------------------ | ------------- | --------------------------------------------- | -------- |
| F-01  | mobile-web-shell          | (foundation) Deployable mobile-first web shell is in place                           | —             | FR-010, NFR mobile/offline                    | done     |
| S-01  | guest-practice-round      | Guest can complete a 10-note treble practice round on mobile with feedback + summary | F-01          | US-01, FR-001–005, FR-007, FR-009, FR-010      | done     |
| F-02  | oauth-profile-scaffold    | (foundation) OAuth sign-in + profile store scaffold is in place                      | F-01          | Access Control, FR-008                        | proposed |
| S-02  | oauth-profile-progress    | Signed-in user can save practice progress in their OAuth profile                     | S-01, F-02    | FR-008                                        | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme           | Chain                         | Note                                                                 |
| ------ | --------------- | ----------------------------- | -------------------------------------------------------------------- |
| A      | Free practice   | `F-01` → `S-01`               | Must-have path for `speed` — prove the drill before auth.            |
| B      | Profile progress| `F-02` → `S-02`               | Joins Stream A at `S-01`; keep auth as thin as possible under `time`. |

## Baseline

What's already in place in the codebase as of `2026-08-23` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** absent — no UI / build tooling (only `MVP.md` + `context/`)
- **Backend / API:** absent — no server or API routes
- **Data:** absent — no schema / persistence layer
- **Auth:** absent — no OAuth / session code
- **Deploy / infra:** absent — no Dockerfile / CI / host config
- **Observability:** absent — no logging / error tracking

## Foundations

### F-01: Mobile-first web shell

- **Outcome:** (foundation) A deployable mobile-first web app shell is in place so practice UI can ship without redoing hosting/bootstrap per slice.
- **Change ID:** mobile-web-shell
- **PRD refs:** FR-010, Non-Functional Requirements (offline after first load; usable on common mobile browsers without horizontal scroll; no ads/tracking in practice flow)
- **Unlocks:** S-01, S-02
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - PWA installability vs mobile web page — Owner: user. Block: no (product is mobile-first either way; stack/delivery choice).
- **Risk:** Sequenced first because the repo is empty; without a shell, S-01 cannot ship. Under `speed`, keep the shell minimal — no extra tooling beyond what S-01 needs.
- **Status:** done

### F-02: OAuth + profile scaffold

- **Outcome:** (foundation) OAuth sign-in and a profile store for signed-in users are scaffolded so progress can persist without guest storage.
- **Change ID:** oauth-profile-scaffold
- **PRD refs:** Access Control, FR-008
- **Unlocks:** S-02; reduces Open Roadmap Question on OAuth provider choice once decided during plan
- **Prerequisites:** F-01
- **Parallel with:** S-01 (after F-01; auth scaffold can proceed while the guest drill is planned/built)
- **Blockers:** —
- **Unknowns:**
  - Which OAuth provider(s) to use for v1 — Owner: user. Block: yes (planning F-02/S-02 needs a provider choice).
- **Risk:** Under `time`, this is the largest schedule risk after the drill itself. Keep scope to sign-in + profile fields for scores/current set only. Do not block S-01 on this foundation.
- **Status:** blocked

## Slices

### S-01: Guest practice round (mobile)

- **Outcome:** Guest can open the app on a phone, complete a 10-note treble-clef round (natural notes C4–G5) on an on-screen piano, get instant correct/wrong feedback, optionally reveal the correct key via a button, see accuracy + average response time, and start another round or next set — with session-only progress (not saved) and no login wall.
- **Change ID:** guest-practice-round
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005, FR-007, FR-009, FR-010
- **Prerequisites:** F-01
- **Parallel with:** F-02
- **Blockers:** —
- **Unknowns:**
  - Solfège vs letter names (default letter names) — Owner: user. Block: no.
- **Risk:** This is the validation milestone for free, ad-free practice. Mobile layout (staff + piano on one screen) is the main execution risk; defer audio and desktop keyboard aids.
- **Status:** done

### S-02: OAuth profile progress

- **Outcome:** Signed-in user can save practice progress (scores, current set) in their OAuth profile; guests still practice without saving.
- **Change ID:** oauth-profile-progress
- **PRD refs:** FR-008
- **Prerequisites:** S-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Which OAuth provider(s) to use for v1 — Owner: user. Block: yes (inherits from F-02).
- **Risk:** Sequenced after the guest drill so a deadline crunch can still ship S-01 without profiles. Under `time`, resist expanding profile into history charts or multi-device sync beyond “saved progress.”
- **Status:** blocked

## Backlog Handoff

| Roadmap ID | Change ID              | Suggested issue title                                      | Ready for `/10x-plan` | Notes                                      |
| ---------- | ---------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------ |
| F-01       | mobile-web-shell       | Scaffold mobile-first deployable web shell for ReadTheKey  | yes                   | Unlocks north star S-01                    |
| S-01       | guest-practice-round   | Guest 10-note mobile practice round with feedback           | no                    | After F-01                                 |
| F-02       | oauth-profile-scaffold | OAuth + profile store scaffold                             | no                    | Blocked on OAuth provider choice           |
| S-02       | oauth-profile-progress | Save practice progress in OAuth profile                    | no                    | After S-01 + F-02; blocked on provider     |

## Open Roadmap Questions

1. **Solfège vs letter names** — Owner: user. Block: no (default letter names). Affects S-01 copy only.
2. **Full songs / rhythm / two-hand pieces** — Owner: user. Block: roadmap-wide. Assumed out of v1; stays Parked unless promoted into PRD.
3. **target_scale.qps / data_volume** — Owner: user. Block: no. Optional for solo after-hours MVP.
4. **PWA installability** — Owner: user. Block: no (F-01 Unknown). Mobile-first web is decided; installable PWA is a delivery choice.
5. **Which OAuth provider(s) for v1** — Owner: user. Block: F-02, S-02.

## Parked

- **Ads, paywalls, in-app purchases** — Why parked: PRD §Non-Goals; core pain is free practice.
- **MIDI / real keyboard input** — Why parked: PRD §Non-Goals; on-screen piano only for v1.
- **Bass clef, accidentals, key signatures, intervals, chords** — Why parked: PRD §Non-Goals; treble naturals only.
- **Native iOS/Android apps** — Why parked: PRD §Non-Goals; web only for v1.
- **Teacher dashboard, multiplayer, leaderboards** — Why parked: PRD §Non-Goals.
- **Auto-reveal of correct key** — Why parked: PRD §Non-Goals; reveal is button-only.
- **Adaptive AI tutor, spaced repetition, structured courses** — Why parked: PRD §Non-Goals; post-MVP nice-to-have.
- **Persistent progress for guests** — Why parked: PRD §Non-Goals; profile-only for signed-in users.
- **Optional pitch playback (FR-006)** — Why parked: nice-to-have; deferred under `speed` / `time`.
- **Key labels on demand + desktop keyboard fallback (FR-011)** — Why parked: nice-to-have; deferred under `speed` / `time`.
- **Full songs / rhythm / two-hand pieces** — Why parked: PRD Open Question #2; not in v1 scope.

## Done

- **F-01: (foundation) A deployable mobile-first web app shell is in place so practice UI can ship without redoing hosting/bootstrap per slice.** — Archived 2026-08-25 → `context/archive/2026-08-23-mobile-web-shell/`. Lesson: —.
- **S-01: Guest can open the app on a phone, complete a 10-note treble-clef round (natural notes C4–G5) on an on-screen piano, get instant correct/wrong feedback, optionally reveal the correct key via a button, see accuracy + average response time, and start another round or next set — with session-only progress (not saved) and no login wall.** — Archived 2026-08-28 → `context/archive/2026-08-25-guest-practice-round/`. Lesson: —.
