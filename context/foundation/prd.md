---
project: "ReadTheKey"
version: 1
status: draft
created: 2026-08-23
context_type: greenfield
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-09-14
  after_hours_only: true
---

# ReadTheKey — Product Requirements

## Vision & Problem Statement

You want to practice piano-note reading, but every app you’ve tried interrupts that with ads or paywalls. The pain is workflow friction: you open an app to practice and can’t stay in the drill for free.

The insight: there isn’t a good free version that just lets you practice. Product intent: a staff-note → on-screen piano drill, with free and no ads as a hard constraint — not a paid/ad-supported clone of a big theory app.

At 100× user scale the core matching rule unchanged; OAuth storage, hosting, and abuse handling would need hardening — not a v1 concern for a handful of users.

## User & Persona

**Primary:** You — the first and primary user for v1. Someone who wants to practice staff → piano mapping without ads or a paywall interrupting the session.

## Success Criteria

### Primary

A guest can open the URL, complete one 10-note round (treble clef, natural notes C4–G5 on an on-screen piano), get instant correct/wrong feedback, optionally reveal the correct key and note name via a button on wrong answers, see a round summary (accuracy + average response time), and choose to practice again or start the next set — without ads, paywall, or login.

### Secondary

Optional pitch playback after each note so the learner hears what the correct note sounds like.

Post-MVP nice-to-have (not v1): adaptive AI tutor, spaced repetition, or structured courses.

### Guardrails

- No ads and no paywall — full practice remains free for guests.
- No login wall to start practicing — guest path is immediate.

## User Stories

### US-01: Guest completes a practice round on mobile

- **Given** a guest opens the app on a mobile device
- **When** they tap piano keys matching 10 treble-clef notes shown on the staff
- **Then** they receive instant feedback on each answer, see a round summary with accuracy and average response time, and can start another round — without signing in, ads, or a paywall

#### Acceptance Criteria

- Each wrong answer shows correct/wrong only; learner can tap a button to highlight the correct key and show the note name (e.g. C4)
- Round ends after exactly 10 notes
- Layout fits the phone screen with tappable keys and readable notation
- No login prompt appears before or during the round

## Functional Requirements

### Practice loop

- FR-001: Guest can see one treble-clef note (natural notes, C4–G5) on a staff. Priority: must-have
  > Socrates: Counter-argument considered: treble-only C4–G5 naturals may feel too narrow. Resolution: no counter-argument; it stands as written — smallest useful reading set for v1.
- FR-002: Guest can tap a key on a 1–2 octave on-screen piano to answer. Priority: must-have
  > Socrates: Counter-argument considered: 2-octave piano on phone may force tiny keys. Resolution: no counter-argument; it stands as written — mobile layout (FR-010) addresses tap targets.
- FR-003: Guest gets instant correct/wrong feedback; on wrong answers the correct key is not auto-highlighted — learner taps a button to reveal the correct key and note name. Priority: must-have
  > Socrates: Counter-argument considered: immediate reveal may let users tap through without learning. Resolution: revised in Phase 5 — reveal is on-demand via button, not automatic.
- FR-004: Guest completes a 10-note round and sees accuracy + average response time. Priority: must-have
  > Socrates: Counter-argument considered: timing may stress beginners. Resolution: no counter-argument; it stands as written — progress proof without accounts.
- FR-005: Guest can start another round or switch to the next practice set (random or stepwise). Priority: must-have
  > Socrates: Counter-argument considered: two set modes doubles v1 work. Resolution: no counter-argument; it stands as written — first differentiation of difficulty.
- FR-006: Guest can hear optional pitch playback for the correct note. Priority: nice-to-have
  > Socrates: Counter-argument considered: pitch may teach ear-matching not staff reading. Resolution: no counter-argument; it stands as written — optional, not required for core loop.

### Auth & progress

- FR-007: Guest can practice without signing in; guest progress is session-only and is not saved. Priority: must-have
  > Socrates: Counter-argument considered: open guest access invites abuse. Resolution: no counter-argument; it stands as written — no login wall is a guardrail. Revised post-PRD: guests do not get persistent progress.
- FR-008: Signed-in user can save progress only in their OAuth profile (scores, current set); guests have no profile storage. Priority: must-have
  > Socrates: Counter-argument considered: OAuth + profile storage may blow 3-week budget. Resolution: no counter-argument; it stands as written — user accepted v1 scope with OAuth; progress is profile-only.

### UX & device

- FR-009: User sees staff, piano, and score on one screen with a one-line prompt — no settings maze. Priority: must-have
  > Socrates: Counter-argument considered: one screen may cram small phones. Resolution: no counter-argument; it stands as written — mobile adaptation (FR-010) is the constraint solver.
- FR-010: App is mobile-first — layout adapts to mobile devices with large tap targets, readable staff, usable on phone without horizontal scroll or tiny keys. Priority: must-have
  > Socrates: Counter-argument considered: mobile-first adds significant UI work. Resolution: no counter-argument; it stands as written — primary use case is phone practice. Confirmed post-PRD: mobile-first.
- FR-011: User can reveal key labels on demand and use keyboard fallback on desktop. Priority: nice-to-have
  > Socrates: Counter-argument considered: labels/keyboard may bypass staff reading. Resolution: no counter-argument; it stands as written — on-demand only; accessibility aid.

## Non-Functional Requirements

- Feedback appears within 200 ms of a tap.
- Practice works offline after the first load.
- Usable on common mobile browsers without horizontal scroll.
- No third-party ads or tracking scripts in the practice flow.
- Guest practice requires no account data beyond the learner's optional choice to sign in with OAuth.

## Business Logic

The app picks a note from the current practice set, shows it on the staff, and decides whether the key the learner tapped is the correct match.

**Inputs:** which practice set is active (random or stepwise); which key the learner tapped.

**Output:** correct or wrong judgment on each tap. On wrong answers, the correct key is not shown automatically — the learner chooses when to tap a reveal button to highlight the correct key and display the note name. After 10 notes, round accuracy and average response time.

**In the flow:** the rule runs once per note in the practice loop until the round ends.

## Access Control

Guests use the full practice loop with no login; their progress is session-only and is not saved. Optional OAuth is available in v1 for people who want to keep track of progress — progress is stored only in the signed-in user's profile. Flat model: guest = practice only (no saved progress); signed-in = same practice + profile-saved progress. No admin/member roles.

## Non-Goals

- No ads, paywalls, or in-app purchases — practice stays free; monetization is out of scope.
- No MIDI or real keyboard input — on-screen piano only for v1.
- No bass clef, accidentals, key signatures, intervals, or chords in v1 — treble naturals only to start.
- No native iOS/Android apps — web app only for v1.
- No teacher dashboard, multiplayer, or leaderboards.
- No auto-reveal of the correct key on wrong answers — learner must tap a reveal button.
- No adaptive AI tutor, spaced repetition, or structured courses in v1 — deferred as post-MVP nice-to-have.
- No persistent progress for guests — only signed-in OAuth users store progress in their profiles.

## Open Questions

1. **Solfège vs letter names** — Owner: user. Default letter names; language toggle later.
2. **Full songs / rhythm / two-hand pieces** — Owner: user. Not discussed in shaping; assumed out of v1 scope per MVP.md unless added later.
3. **target_scale.qps / data_volume** — Owner: user. Only `users: small` was captured; ballpark QPS and data volume not set (optional for solo after-hours MVP).
4. **PWA installability** — Owner: user. Product is mobile-first web; whether to ship as an installable PWA vs mobile web page remains a stack/delivery choice.
