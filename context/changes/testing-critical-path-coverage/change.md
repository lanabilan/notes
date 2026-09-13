---
change_id: testing-critical-path-coverage
title: Bootstrap unit tests for matching and round contract
status: implemented
created: 2026-09-13
updated: 2026-09-13
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical-path coverage".
Risks covered: #1 (staff→key misjudge), #3 (round not 10 notes / wrong set mode / summary that does not match the tap log). Test types planned: unit (+ runner bootstrap).
Risk response intent: #1 prove that given a known staff target and tap (including black-key guesses vs natural targets), correct/wrong matches the C4–G5 mapping — challenge that the UI highlight is the judge or that one C4 happy-path tap covers the set — avoid an oracle copied from the current matching function. #3 prove round length is 10, stepwise bounces at the ends (does not wrap), and summary accuracy/avg ms match an independent calculation from the tap log — challenge that one finished UI round means generators and stats are correct — avoid golden output copied from the generator under test.
After creating the folder, follow the downstream continuation rule.
