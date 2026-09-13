---
date: 2026-09-13T18:31:40+02:00
researcher: agent
git_commit: c3b73e6540423adcf4d28293bca5313de8124eeb
branch: main
repository: lanabilan/notes
topic: "Ground rollout Phase 4 (quality-gates wiring): npm test in CI"
tags: [research, codebase, ci, github-actions, vitest, gates]
status: complete
last_updated: 2026-09-13
last_updated_by: agent
---

# Research: Ground rollout Phase 4 (quality-gates wiring): npm test in CI

**Date**: 2026-09-13T18:31:40+02:00
**Researcher**: agent
**Git Commit**: c3b73e6540423adcf4d28293bca5313de8124eeb
**Branch**: main
**Repository**: lanabilan/notes

## Research Question

Ground rollout Phase 4 of `context/foundation/test-plan.md` (“Quality-gates wiring”).

Risks: **cross-cutting** — matching, guest/profile isolation, and practice UI contracts only stay required-for-production if CI runs them.

Risk response intent to verify, not blindly accept:

- Prove `npm test` runs in CI next to lint+build so the Phase 1–3 suites cannot be skipped on merge.
- Challenge that local `npm test` implies CI runs it.
- Avoid Astro `getViteConfig()`, Playwright, or a second runner.

## Summary

The failure is real and cheap to close. `.github/workflows/ci.yml` runs `npm ci` → `npx astro sync` → `npm run lint` → `npm run build` (with `SUPABASE_*` secrets) → deploy on push to `main`. **`npm test` is absent.** Local Vitest does not appear in Actions. Adding `run: npm test` to the **same** `ci` job, **after lint and before build**, is the cheapest gate. The suite does not need `SUPABASE_*`, Docker, Playwright, `getViteConfig`, or `astro sync`.

| Question | Finding | Cheapest proof |
|----------|---------|----------------|
| Does local `npm test` imply CI? | **No.** Workflow has lint+build only (`ci.yml:23-28`). | Add `npm test` to the job; optional source check that `ci.yml` contains `npm test` after lint. |
| Need secrets for tests? | **No.** Only `profile.test.ts` touches Astro/Supabase, both mocked (`profile.test.ts:9-16`). | Do not copy build `env:` onto the test step. |
| Need a second job/runner? | **No.** One job `ci` on `ubuntu-latest`. `npm ci` already installs `vitest`, `jsdom`, `@testing-library/react`. | Same job, extra step. |
| Need `getViteConfig` / Playwright? | **No.** Standalone `vitest.config.ts`. Forbidden crash surface (astro#15847 / #15878). | Do not touch Vitest config except if a comment is useful. |

**§5 after this phase:** unit, integration, and practice UI contract gates become **required in CI**. Lint+build already are.

## Detailed Findings

### Live workflow

```3:35:.github/workflows/ci.yml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
# ...
      - run: npm ci
      - run: npx astro sync
      - run: npm run lint
      - run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      - name: Deploy to Cloudflare Workers
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

- Single job `ci`, `ubuntu-latest`, Node `22` with npm cache (`ci.yml:13-21`).
- Concurrency cancels in-progress runs on the same ref (`9-11`).
- Deploy is **not** a quality gate for PRs; tests on PR+push are.
- Only workflow under `.github/workflows/`.

**Doc drift:** `CLAUDE.md:56` says PRs to **master**. Workflow and deploy prose use **main** (`ci.yml:5,7,30`; `CLAUDE.md:52`).

**Node:** `.nvmrc` is `22.14.0`; CI is `node-version: 22` (latest 22.x). Major matches; patch can drift. Not a Phase 4 blocker unless the plan wants to pin `.nvmrc`.

### Where the test step belongs

| Step | Needs tests? | Needs secrets? | Needs `dist/`? |
|------|----------------|----------------|----------------|
| `npm ci` | installs vitest + jsdom | no | no |
| `astro sync` | no (tests mock `astro:env`) | no | no |
| `lint` | no | no | no |
| **`npm test`** | yes | **no** | **no** |
| `build` | no | yes in CI today | produces artifact |
| deploy | no | Cloudflare tokens | yes, after build |

Slot with fail-fast and no extra secrets: **after lint, before build**. A red suite should not wait on Cloudflare build. Tests must not become a second workflow.

### Suite vs env

Eight `*.test.ts` files. None read `process.env.SUPABASE_*`.

- Practice units, path guard, piano/reveal source checks: Node, no Astro runtime.
- `usePracticeRound.test.ts`: `// @vitest-environment jsdom` only; deps already in `package.json`.
- `profile.test.ts`: `vi.mock("astro:env/server")` + `vi.mock("@/lib/supabase")` before importing `POST`.

`npm test` in Actions with **zero** `SUPABASE_*` is the intended path. Putting secrets on the test step would hide a mock regression (suite starts needing real env).

`npx astro sync` is for lint/types, not Vitest. Leave it where it is (before lint). Do not require it before tests.

### Runner locks (still binding)

- Standalone `vitest.config.ts`: `environment: "node"`, `@` → `./src`. No `getViteConfig`.
- No `app.fetch` / AstroContainer / workerd pool.
- jsdom stays a per-file pragma.
- No Playwright this rollout (`test-plan.md` §7).
- Manual ~390px smoke is **not** a CI gate (`test-plan.md:141`).

### How to prove the gate without a GitHub UI wait

Local `npm test` does **not** prove Actions. Cheapest honest oracle: the workflow file contains a step that runs `npm test` (literal script from `package.json:13`) in the `ci` job, after lint. A Node `readFile` of `ci.yml` (same pattern as piano/reveal source checks) can fail if that step disappears. An actual Actions run is confirmation, not the cheapest automated oracle.

Challenge held: “we run tests locally” is not a merge gate.

### Cookbook / docs this phase should update

- `test-plan.md` §6.6 still says “CI still does not run `npm test` until §3 Phase 4” on all three prior notes — those lines become stale when this ships. Add a Phase 4 note: same job, after lint, no secrets, no `getViteConfig`.
- There is no §6.7 “adding a CI step” yet; a short recipe (edit `ci.yml`, keep one job, `npm test` not `npx vitest` via `getViteConfig`) belongs in §6.6 or a new 6.x.
- `CLAUDE.md` Commands omit `npm test`; CI paragraph says master. Optional in this change if the plan wants docs to match the gate.

## Code References

- [`/.github/workflows/ci.yml`](https://github.com/lanabilan/notes/blob/c3b73e6540423adcf4d28293bca5313de8124eeb/.github/workflows/ci.yml) — lint+build+deploy; no test
- [`/package.json#L13`](https://github.com/lanabilan/notes/blob/c3b73e6540423adcf4d28293bca5313de8124eeb/package.json#L13) — `"test": "vitest run"`
- [`/vitest.config.ts`](https://github.com/lanabilan/notes/blob/c3b73e6540423adcf4d28293bca5313de8124eeb/vitest.config.ts) — standalone Node
- [`/src/pages/api/profile.test.ts#L9-L16`](https://github.com/lanabilan/notes/blob/c3b73e6540423adcf4d28293bca5313de8124eeb/src/pages/api/profile.test.ts#L9-L16) — env + client mocks
- [`/.nvmrc`](https://github.com/lanabilan/notes/blob/c3b73e6540423adcf4d28293bca5313de8124eeb/.nvmrc) — 22.14.0
- [`/CLAUDE.md#L54-L56`](https://github.com/lanabilan/notes/blob/c3b73e6540423adcf4d28293bca5313de8124eeb/CLAUDE.md#L54-L56) — CI docs; says master

## Architecture Insights

1. **Same job is the signal.** A separate `test` workflow can be skipped or marked optional. Putting `npm test` in `ci` before build means a red suite blocks deploy on `main` the same way lint does.
2. **Secrets on build, not test.** Tests that start requiring live Supabase would need Docker/RLS — parked in Phase 2. Do not “fix” CI by injecting `SUPABASE_*` into Vitest.
3. **YAML source check vs hoping GHA ran.** Cost × signal matches Phases 2–3. Cannot prove ubuntu actually executed Vitest from the repo alone; can prove the step exists and is ordered.
4. **§4 stack table is stale** (“Vitest none yet”). Optional `--refresh`; this phase should not rewrite §1–§2. Updating §6.6 is in-scope for the implement cookbook sub-phase.

## Historical Context (from prior changes)

- `context/archive/2026-09-13-testing-critical-path-coverage/` — parked CI; `getViteConfig` crash (astro#15847, #15878).
- `context/changes/testing-guest-access-and-progress-isolation/research.md` — recording client is the CI-local profile proof; no `app.fetch`.
- `context/changes/testing-practice-ui-contracts/` — jsdom pragma; 390px smoke not CI.
- Phase 1–3 plans: “CI job for `npm test` (test-plan §3 Phase 4)” as explicit out-of-scope.

## Related Research

- `context/archive/2026-09-13-testing-critical-path-coverage/research.md`
- `context/changes/testing-guest-access-and-progress-isolation/research.md`
- `context/changes/testing-practice-ui-contracts/research.md`

## Open Questions

1. **Source-check `ci.yml` in-repo** vs rely on the workflow file alone. Recommended: one Node test that `ci.yml` contains `npm test` after `npm run lint` (product: the merge gate exists), so deleting the step fails `npm test` locally too.
2. **CLAUDE.md `master` → `main` and list `npm test` in Commands.** Docs accuracy; not required to make the gate exist.
3. **Pin `node-version-file: .nvmrc` vs leave `22`.** Patch drift is real, not the Phase 4 risk. Default: leave Node as-is unless the plan wants a one-line alignment.
4. **§4 “Vitest none yet”** — defer to `--refresh`; do not rewrite strategy in this change.
