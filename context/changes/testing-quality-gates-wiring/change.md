---
change_id: testing-quality-gates-wiring
title: Wire npm test into CI next to lint and build
status: implemented
created: 2026-09-13
updated: 2026-09-13
archived_at: null
---

## Notes

Open a change folder for rollout Phase 4 of context/foundation/test-plan.md: "Quality-gates wiring".
Risks covered: cross-cutting (matching, guest/profile isolation, and practice UI contracts only stay required-for-production if CI runs them). Test types planned: gates.
Risk response intent: prove `npm test` runs in CI next to lint+build so the Phase 1–3 suites cannot be skipped on merge. Challenge that local `npm test` implies CI runs it. Avoid Astro `getViteConfig()`, Playwright, or a second runner.
After creating the folder, follow the downstream continuation rule.
