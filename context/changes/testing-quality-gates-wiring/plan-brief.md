# Quality-gates wiring — Plan Brief

> Full plan: `context/changes/testing-quality-gates-wiring/plan.md`
> Research: `context/changes/testing-quality-gates-wiring/research.md`

## What & Why

Phase 1–3 tests only protect production if CI runs them. Today Actions is lint + build. This change adds `npm test` to that job so a red suite blocks merge the same way lint does.

## Starting Point

One `ci` job on `main`: `npm ci`, `astro sync`, lint, build (with `SUPABASE_*`), deploy on push. `"test": "vitest run"` exists locally. No workflow step. CLAUDE.md says master.

## Desired End State

PRs and pushes to `main` run Vitest after lint and before build, without test-step secrets. A source check fails if that step vanishes. Cookbook and CLAUDE describe the gate.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Job shape | Same `ci` job, not a second workflow | Optional/extra jobs can be skipped | Research / Plan |
| Step order | After lint, before build | Tests need neither secrets nor `dist/` | Research |
| Secrets | None on `npm test` | Suite mocks `astro:env`; secrets would hide that | Research |
| Proof | `ci.test.ts` source check | Local green ≠ CI | Research / Plan |
| Docs | §6.6 + CLAUDE.md (`main`, `npm test`) | Agents currently pointed at master | Plan |
| Node | Leave `node-version: 22` | Patch drift is not this phase’s risk | Plan |

## Scope

**In scope:** `ci.yml` test step; `.github/workflows/ci.test.ts`; §6.6; CLAUDE.md Commands + CI.

**Out of scope:** Playwright, second runner, `getViteConfig`, Node pin, §1–§2/§4 rewrite, Docker RLS.

## Architecture / Approach

Insert `run: npm test` in the existing YAML. Lock order and “no secrets” with a `readFile` test. Do not change Vitest config.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. CI step + source check | Gate exists; deleting it fails locally | Putting secrets on test; second workflow |
| 2. Cookbook + CLAUDE | §6.6 and agent docs match | Leaving “CI waits on Phase 4” in present tense |

**Prerequisites:** Phase 1–3 suites already pass via `npm test`.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- First Actions run after merge is human confirmation, not the plan’s automated oracle.
- `ubuntu-latest` + `npm ci` installs jsdom (already in lockfile).

## Success Criteria (Summary)

- Merge to `main` cannot skip Vitest without a red local source check.
- Docs tell agents to use `main` and `npm test`.
