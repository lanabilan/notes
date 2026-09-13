# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-13

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents _what
   could fail_ and _why we believe it's likely_ — drawn from documents,
   interview, and codebase _signal_ (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src`, `supabase/migrations`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the _evidence that surfaced
this risk_ — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| #   | Risk (failure scenario)                                                                                                                           | Impact | Likelihood | Source (evidence — not anchor)                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A correct piano tap is judged wrong, or a wrong tap is judged correct, so the drill teaches the wrong staff→key mapping                           | High   | High       | interview Q1, Q3; PRD Business Logic / FR-001–003; hot-spot dir `src/lib/practice` (12 file-touches/30d), `src/components/practice` (17) |
| 2   | An auth/middleware change gates `/`, so a guest hits a login wall instead of the drill                                                            | High   | High       | interview Q2; PRD Success Criteria + Guardrails; archive F-02/S-02 “never a wall”; hot-spot dirs `src/pages/api`, `src/components/auth`  |
| 3   | A round is not exactly 10 notes, uses the wrong set mode (random vs stepwise bounce), or the summary accuracy/avg time does not match the tap log | High   | High       | interview Q3; PRD FR-004, FR-005; hot-spot dir `src/lib/practice`                                                                        |
| 4   | Progress isolation fails: a guest round is persisted, or a signed-in save updates another user’s profile                                          | High   | Medium     | PRD FR-007/FR-008 + Access Control; archive S-02 (silent save, no guest write); abuse lens (ownership, not merely “logged in”)           |
| 5   | On a phone, the practice screen is unusable (horizontal scroll or keys too small to tap)                                                          | High   | Medium     | PRD FR-010 / US-01; archive S-01 + piano-keyboard-layout; hot-spot dir `src/components/practice`                                         |
| 6   | Profile save accepts an invalid body (bad set or out-of-range scores) and stores it as progress                                                   | Medium | Medium     | archive S-02 (JSON body validation); CLAUDE.md API validation rule; abuse lens (untrusted input)                                         |
| 7   | A wrong answer auto-reveals the correct key/name instead of waiting for the learner to tap Reveal                                                 | Medium | Medium     | PRD FR-003 + Non-Goals; archive S-01 wrong-answer sequencing                                                                             |

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                     | Must challenge                                                                       | Context `/10x-research` must ground                                           | Likely cheapest layer                                                 | Anti-pattern to avoid                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| #1   | Given a known staff target and tap (including black-key guesses vs natural targets), correct/wrong matches the C4–G5 mapping                    | “The UI highlight is the judge” / “one C4 happy-path tap covers the set”             | Pitch-id contract, octave edges, what the staff shows vs what the piano sends | unit                                                                  | Oracle copied from the current matching function              |
| #2   | Unauthenticated `GET /` returns the practice round, not a login redirect; `/dashboard` stays gated                                              | “Signed-in happy path implies guests can still practice”                             | What counts as unauthenticated; how the guest path is exempted                | integration (request)                                                 | Full browser e2e when a request assertion would catch it      |
| #3   | Round length is 10; stepwise bounces at the ends (does not wrap); summary accuracy and avg ms match an independent calculation from the tap log | “One finished UI round means generators and stats are correct”                       | Set-mode contract, timestamp source, when a round ends                        | unit                                                                  | Golden output copied from the generator under test            |
| #4   | Guest round never writes a profile; a signed-in save cannot retarget another user’s row                                                         | “Logged in means ownership is checked” / “guest UI looks empty so no write happened” | Session shape; API vs RLS ownership; whether guests hit the save path         | integration                                                           | Mock the profile service so ownership is never exercised      |
| #5   | At phone width, no horizontal scroll and keys remain tappable                                                                                   | “Desktop layout implies phone works”                                                 | Viewport contract (~390px) from PRD/archive                                   | layout assertion or manual smoke — not a page snapshot                | Visual snapshots of marketing/cosmic leftovers (interview Q5) |
| #6   | Invalid set or out-of-range scores are rejected; stored row unchanged                                                                           | “Validation exists so we’re safe” / “200 on a valid body is enough”                  | Allowed fields; server vs client validation                                   | integration                                                           | Happy-path-only body                                          |
| #7   | Wrong answer does not show the correct key/name until Reveal is tapped                                                                          | “Feedback appearing means the reveal policy holds”                                   | Wrong-answer state machine (stay on note → Reveal optional → Next)            | unit (state) if the policy lives outside the DOM; otherwise component | Screenshot of a highlighted key as the oracle                 |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                          | Goal (one line)                                                                | Risks covered | Test types                   | Status        | Change folder                  |
| --- | ----------------------------------- | ------------------------------------------------------------------------------ | ------------- | ---------------------------- | ------------- | ------------------------------ |
| 1   | Critical-path coverage              | Bootstrap the runner and prove matching + round contract at unit layer         | #1, #3        | unit (+ runner bootstrap)    | complete      | testing-critical-path-coverage |
| 2   | Guest access and progress isolation | Prove `/` stays public and profile writes cannot cross users or accept garbage | #2, #4, #6    | integration                  | not started   | —                              |
| 3   | Practice UI contracts               | Prove reveal-on-demand and phone usability without cosmic snapshots            | #7, #5        | component / layout assertion | not started   | —                              |
| 4   | Quality-gates wiring                | Run the new suite in CI next to lint+build                                     | cross-cutting | gates                        | not started   | —                              |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session. If a useful docs
or search MCP such as Context7 or Exa.ai is not available, say that instead
of assuming access.

Test-base profile at write time: **`none`** — no runner config, 0 test files. CI is lint + build only.

| Layer                | Tool                       | Version                | Notes                                                                                                                                                                                                                                                                                        |
| -------------------- | -------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit + integration   | Vitest                     | none yet — see Phase 1 | Official Astro path: `getViteConfig()`. Astro 6 needs Vitest ≥3.2 or ≥4.1-beta.5; Astro-component tests must use `environment: 'node'`. Confirm a version that does not hit the Astro 6 `getViteConfig` crash. Matching/round logic is pure TS — first tests should not need AstroContainer. |
| API mocking          | none yet — see Phase 2     | n/a                    | Prefer the real cookie session + validation boundary over mocking internals.                                                                                                                                                                                                                 |
| e2e                  | none — not in this rollout | n/a                    | Request-level integration is cheaper for Risk #2.                                                                                                                                                                                                                                            |
| accessibility        | eslint-plugin-jsx-a11y     | 6.10.2                 | Lint-time only; not a substitute for matching tests.                                                                                                                                                                                                                                         |
| (optional) AI-native | none                       | n/a                    | No vision/post-edit layer this rollout — would fight interview Q5 and would not beat a matching unit test.                                                                                                                                                                                   |

**Stack grounding tools (current session):**

- Docs: none (Context7 / framework docs MCP not available in current session) — used official Astro testing + v6 upgrade pages via WebSearch; checked: 2026-09-13
- Search: first-party WebSearch (Exa.ai not available in current session) — Astro Vitest + Cloudflare preview docs; checked: 2026-09-13
- Runtime/browser: none (Playwright MCP / browser MCP not available in current session) — not used; checked: 2026-09-13
- Provider/platform: Linear/Figma MCP present but `needsAuth`; no GitHub/Cloudflare/Supabase MCP — not used; checked: 2026-09-13

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase \<N\>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate                                           | Where                                       | Required?                 | Catches                                                                        |
| ---------------------------------------------- | ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| lint + build                                   | local + CI                                  | required                  | syntactic / type drift; production build                                       |
| unit (matching + round contract)               | local after §3 Phase 1; CI after §3 Phase 4 | required after §3 Phase 4 | staff→key misjudge; 10-note / set-mode / summary lies                          |
| integration (guest access + profile isolation) | local after §3 Phase 2; CI after §3 Phase 4 | required after §3 Phase 4 | login-wall on `/`; cross-user or guest profile writes; garbage progress bodies |
| practice UI contracts (reveal + phone layout)  | local after §3 Phase 3; CI after §3 Phase 4 | required after §3 Phase 4 | auto-reveal; phone overflow / untappable keys                                  |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase \<N\>."

### 6.1 Adding a unit test

- **Location**: `src/lib/practice/<module>.test.ts` next to the unit under test.
- **Naming**: `<module>.test.ts`. Import `{ describe, expect, it }` from `"vitest"` (no globals).
- **Reference test**: `src/lib/practice/scoring.test.ts`.
- **Run locally**: `npm test` (`vitest run`, Node environment).
- **Runner**: standalone `vitest.config.ts` with `@` → `./src`. Do not use Astro `getViteConfig()` for lib tests.
- **Oracle**: independent table or PRD literal (e.g. length `10`, mapping rows). Never copy the function under test (`expect(isCorrectTap(a, b)).toBe(a === b)` is forbidden).

### 6.2 Adding an integration test

TBD — see §3 Phase 2 for guest `GET /` (no login wall) and profile ownership / invalid-body patterns.

### 6.3 Adding a practice UI contract test

TBD — see §3 Phase 3 for wrong-answer reveal-on-demand and phone-width usability. Do not add visual snapshots of marketing/cosmic leftovers.

### 6.4 Adding a test for a new API endpoint

TBD — see §3 Phase 2. Prefer request-level integration: session → status/body AND side-effects. Do not mock the ownership check.

### 6.5 Adding a test for a new practice-set / matching rule

- **Matching**: add a row to `MAPPING_ROWS` in `src/lib/practice/scoring.test.ts`. Expected correct/wrong comes from PRD/S-01 (C4–G5 naturals; black-key taps are wrong until accidentals enter the set), not from `===`.
- **Set / generator**: add a property on `generateRound` in `src/lib/practice/sets.test.ts` against a test-local C4–G5 list. Expected length is the number `10`, not `ROUND_LENGTH` imported from the SUT. Do not snapshot `generateRound()` output. Do not import production `DRILL_NATURALS` as the expected set.
- **Summary**: hand-build `NoteResult[]` in `scoring.test.ts`; do not call `isCorrectTap` to fill `correct`.
- **Reference tests**: `src/lib/practice/scoring.test.ts`, `src/lib/practice/sets.test.ts`.

### 6.6 Per-rollout-phase notes

Phase 1 (critical-path coverage): Vitest is a standalone Node config with an explicit `@` alias. Do not “fix” lib tests by switching to `getViteConfig()` — that loads the Cloudflare Astro config and is a known crash surface. CI still does not run `npm test` until §3 Phase 4.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Visual snapshots of marketing/cosmic leftovers** — they break constantly and catch nothing. Re-evaluate if leftover starter chrome becomes a user-facing surface. (Source: Phase 2 interview Q5.)
- **Full browser e2e of the guest drill** — not in this rollout; matching is a unit oracle and the login-wall risk is a request assertion. Re-evaluate if research shows the failure only exists in the hydrated island.
- **Pitch playback / mute** — parked relative to the matching rule. Re-evaluate if playback becomes a must-have.
- **AI-native / vision review of screens** — would not beat deterministic matching tests and overlaps Q5. Re-evaluate if a UI failure has no cheaper oracle.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-13
- Stack versions last verified: 2026-09-13
- AI-native tool references last verified: 2026-09-13

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
