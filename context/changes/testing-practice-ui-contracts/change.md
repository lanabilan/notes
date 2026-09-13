---
change_id: testing-practice-ui-contracts
title: Component tests for reveal-on-demand and phone layout
status: implementing
created: 2026-09-13
updated: 2026-09-13
archived_at: null
---

## Notes

Open a change folder for rollout Phase 3 of context/foundation/test-plan.md: "Practice UI contracts".
Risks covered: #7 (wrong answer auto-reveals the correct key/name instead of waiting for Reveal), #5 (on a phone, the practice screen is unusable — horizontal scroll or keys too small to tap). Test types planned: component / layout assertion.
Risk response intent: #7 prove a wrong answer does not show the correct key/name until Reveal is tapped — challenge that feedback appearing means the reveal policy holds — avoid a screenshot of a highlighted key as the oracle. #5 prove at phone width there is no horizontal scroll and keys remain tappable — challenge that desktop layout implies phone works — avoid visual snapshots of marketing/cosmic leftovers (interview Q5).
After creating the folder, follow the downstream continuation rule.
