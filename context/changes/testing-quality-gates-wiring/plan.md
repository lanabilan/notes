# Quality-gates wiring Implementation Plan

## Overview

Add `npm test` to the existing GitHub Actions `ci` job so Phase 1–3 suites are a merge gate, not a local habit. A Node source check fails if that step disappears or moves after build. Cookbook §6.6 and `CLAUDE.md` match what shipped. Same job, no extra secrets, no second runner.

## Current State Analysis

`.github/workflows/ci.yml` runs `npm ci` → `npx astro sync` → `npm run lint` → `npm run build` (with `SUPABASE_URL` / `SUPABASE_KEY`) → deploy on push to `main`. **`npm test` is absent.** `package.json` already has `"test": "vitest run"`. The suite mocks Astro env and does not need those secrets. `vitest.config.ts` is standalone Node. `CLAUDE.md` CI text says **master**; the workflow uses **main**. §6.6 still says CI does not run tests until Phase 4.

Research: `context/changes/testing-quality-gates-wiring/research.md`.

## Desired End State

Every push/PR to `main` runs `npm test` in the same `ci` job after lint and before build. The test step has no `SUPABASE_*`. Deleting or reordering that step fails `npm test` locally. Cookbook §6.6 describes the gate. `CLAUDE.md` lists `npm test` and says `main`.

**Verify:** `npm test` and `npm run lint` pass; `ci.yml` contains `npm test` after `npm run lint`; `vitest.config.ts` still has no `getViteConfig`; no Playwright job.

### Key Discoveries:

- Workflow is one job `ci` on `ubuntu-latest`, Node `22`, triggers `main` (`ci.yml:3-21`). Local Vitest is not a gate (`research.md` Summary).
- Tests do not read `process.env.SUPABASE_*`. `profile.test.ts` mocks `astro:env/server` (`research.md` Suite vs env).
- Fail-fast slot: after lint, before build — tests do not need `dist/` or secrets (`research.md` Where the test step belongs).
- `getViteConfig` remains forbidden (astro#15847 / #15878). Playwright and a second workflow are out of scope (`research.md` Runner locks).
- Source-check pattern already used for home/shell, reveal wiring, and piano fit (`protected-routes.test.ts`, `PracticeRound.reveal-source.test.ts`, `PianoKeyboard.test.ts`).

## What We're NOT Doing

- Playwright, a second workflow/job, workerd / `app.fetch` / AstroContainer
- `getViteConfig` or changing `vitest.config.ts` (except a comment if useful — prefer no change)
- Putting `SUPABASE_*` on the test step
- Pinning CI Node to `.nvmrc` / `22.14.0`
- Rewriting test-plan §1–§2 or the §4 stack table (defer `--refresh`)
- Docker RLS, preview HTTP as the suite
- Making the ~390px phone smoke a CI gate
- Splitting deploy into a required PR check

## Implementation Approach

Two phases: wire the job and lock the YAML in a source test; then write the cookbook and CLAUDE so the next person copies the same job, not a new runner.

Shared: keep `"test": "vitest run"`; import `{ describe, expect, it }` from `"vitest"` in the new test file.

## Critical Implementation Details

**Same job, ordered steps.** Insert `- run: npm test` immediately after `- run: npm run lint` and before `- run: npm run build`. Do not add `env:` on the test step. Do not create `.github/workflows/test.yml`.

**Oracle for the source check.** Product: the merge job runs the existing npm script after lint. Assert `ci.yml` text contains `npm test` after `npm run lint` and before `npm run build` (index order). Do not assert the whole file snapshot. Do not require `npx vitest` or `getViteConfig`.

**Secrets stay on build.** If a future test needs live Supabase, that is a new change — not “add env to npm test.”

---

## Phase 1: CI test step + workflow source check

### Overview

Add `npm test` to `.github/workflows/ci.yml`. Prove with a Node `readFile` that the step exists in the `ci` job after lint and before build, with no `getViteConfig` in `vitest.config.ts`.

**Behavior asserted:** the `ci` job runs `npm test` after `npm run lint` and before `npm run build`. Test step has no `SUPABASE_URL` / `SUPABASE_KEY`. Default Vitest config stays standalone Node.

**Regression caught:** removing the test step; moving tests after build; adding a second workflow instead of this step; switching Vitest to `getViteConfig` “for CI.”

**Research:** `research.md` Summary + How to prove the gate.

**Edge:** `npm test` must be the `package.json` script name (`vitest run`), not `npx vitest --config astro`. Deploy `if:` stays push-to-main only.

**Anti-pattern avoided:** second runner; Playwright; secrets on the test step; treating local `npm test` as proof of CI.

### Changes Required:

#### 1. Workflow step

**File**: `.github/workflows/ci.yml`

**Intent**: Make a red suite fail the same job that lint and build use, before secrets/build/deploy.

**Contract**: After `npm run lint`, add `run: npm test` with no `env` mapping. Leave `npm ci`, `astro sync`, lint, build+secrets, and deploy conditions unchanged. Triggers stay `main`.

#### 2. Workflow source check

**File**: `.github/workflows/ci.test.ts` (new) — Node, no jsdom pragma

**Intent**: Local `npm test` fails if CI stops running the suite — the challenge that local green ≠ CI.

**Contract**: `readFileSync` of `.github/workflows/ci.yml` from repo root (same helper style as `protected-routes.test.ts`). Fail if `npm test` is missing. Fail if `npm run lint` does not appear before `npm test`, or `npm test` does not appear before `npm run build`. Fail if the test step’s immediate YAML (the `run: npm test` step) includes `SUPABASE_URL` or `SUPABASE_KEY`. Also `readFile` `vitest.config.ts` and fail if it imports `astro/config` or `getViteConfig`. Do not snapshot either file. Import `{ describe, expect, it }` from `"vitest"`.

### Success Criteria:

#### Automated Verification:

- `npm test` passes
- `npm run lint` passes
- `.github/workflows/ci.yml` contains `npm test` after `npm run lint` and before `npm run build`
- Removing the `npm test` step (or commenting it out) makes `npm test` fail
- `vitest.config.ts` still does not import `astro/config` or `getViteConfig`

#### Manual Verification:

- A reader can see lint → test → build in `ci.yml` without opening GitHub Actions
- The test step has no `env:` block

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Cookbook and CLAUDE.md

### Overview

Write what shipped into `context/foundation/test-plan.md` §6.6 and align `CLAUDE.md` Commands + CI with `main` and `npm test`. Do not rewrite §1–§2 or §4.

**Behavior asserted:** §6.6 no longer claims CI omits tests. CLAUDE lists `npm test` and describes CI as lint + test + build on **main**.

**Regression caught:** leaving “until §3 Phase 4” as present tense so the next agent skips adding tests to a new workflow.

**Research:** `research.md` Cookbook / docs.

**Anti-pattern avoided:** a second cookbook style; editing §2 Source cells.

### Changes Required:

#### 1. Phase notes

**File**: `context/foundation/test-plan.md` §6.6

**Intent**: Replace stale “CI still does not run `npm test`” on Phase 1–3 notes with past tense or a pointer, and add a Phase 4 note.

**Contract**: Phase 1–3 bullets must not say CI still waits on Phase 4. Phase 4 note (2–4 lines): same `ci` job; `npm test` after lint, before build; no `SUPABASE_*` on the test step; no `getViteConfig`; source check `.github/workflows/ci.test.ts`. Optional one-line recipe: add CI steps by editing `ci.yml`, not a new workflow.

#### 2. Agent/human CI docs

**File**: `CLAUDE.md`

**Intent**: Stop sending agents to `master` and hide `npm test`.

**Contract**: Commands list includes `npm test` — Vitest (`vitest run`). CI paragraph: push/PR to **main**; lint + test + build; `SUPABASE_*` remain **build** secrets, not test. Do not claim Playwright.

### Success Criteria:

#### Automated Verification:

- `npm test` still passes
- `npm run lint` still passes (markdown/CLAUDE are prettier-only if staged)

#### Manual Verification:

- §6.6 Phase 4 note is present; Phase 1–3 no longer say CI waits on Phase 4
- `CLAUDE.md` CI section says `main` and `npm test`
- §2 risk Source cells are unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- `ci.yml` step order + no secrets on test + no `getViteConfig` (`ci.test.ts`)

### Integration Tests:

- None new. Existing suite is what CI will execute.

### Manual Testing Steps:

1. Read `ci.yml` and confirm lint → test → build.
2. After merge, optional: confirm the GitHub Actions run executed `npm test` (not required to close this plan).

## Performance Considerations

Vitest is seconds on ubuntu-latest after `npm ci`. Placing it before build fails faster than after Cloudflare compile.

## Migration Notes

PRs and pushes to `main` will run the existing 8 test files. No new GitHub secrets. Deploy still only on push to `main` after a green job.

## References

- Research: `context/changes/testing-quality-gates-wiring/research.md`
- Test plan: `context/foundation/test-plan.md` §3 Phase 4, §5, §6.6
- Workflow: `.github/workflows/ci.yml`
- Runner: `vitest.config.ts`, `package.json` `"test"`
- Prior source-check pattern: `src/lib/auth/protected-routes.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: CI test step + workflow source check

#### Automated

- [x] 1.1 `npm test` passes — 3490d77
- [x] 1.2 `npm run lint` passes — 3490d77
- [x] 1.3 `.github/workflows/ci.yml` contains `npm test` after `npm run lint` and before `npm run build` — 3490d77
- [x] 1.4 Removing the `npm test` step (or commenting it out) makes `npm test` fail — 3490d77
- [x] 1.5 `vitest.config.ts` still does not import `astro/config` or `getViteConfig` — 3490d77

#### Manual

- [x] 1.6 A reader can see lint → test → build in `ci.yml` without opening GitHub Actions — 3490d77
- [x] 1.7 The test step has no `env:` block — 3490d77

### Phase 2: Cookbook and CLAUDE.md

#### Automated

- [x] 2.1 `npm test` still passes — 2c6c3a9
- [x] 2.2 `npm run lint` still passes (markdown/CLAUDE are prettier-only if staged) — 2c6c3a9

#### Manual

- [x] 2.3 §6.6 Phase 4 note is present; Phase 1–3 no longer say CI waits on Phase 4 — 2c6c3a9
- [x] 2.4 `CLAUDE.md` CI section says `main` and `npm test` — 2c6c3a9
- [x] 2.5 §2 risk Source cells are unchanged — 2c6c3a9
