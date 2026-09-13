---
change_id: testing-guest-access-and-progress-isolation
title: Integration tests for guest drill access and profile isolation
status: implementing
created: 2026-09-13
updated: 2026-09-13
archived_at: null
---

## Notes

Open a change folder for rollout Phase 2 of context/foundation/test-plan.md: "Guest access and progress isolation".
Risks covered: #2 (auth/middleware gates `/` so a guest hits a login wall), #4 (guest round persisted or signed-in save updates another user’s profile), #6 (invalid profile body stored as progress). Test types planned: integration.
Risk response intent: #2 prove unauthenticated GET `/` returns the practice round, not a login redirect, and `/dashboard` stays gated — challenge that a signed-in happy path implies guests can still practice — avoid full browser e2e when a request assertion would catch it. #4 prove a guest round never writes a profile and a signed-in save cannot retarget another user’s row — challenge that logged-in means ownership is checked, or that empty guest UI means no write happened — avoid mocking the profile service so ownership is never exercised. #6 prove an invalid set or out-of-range scores are rejected and the stored row is unchanged — challenge that validation exists so we’re safe, or that 200 on a valid body is enough — avoid a happy-path-only body.
After creating the folder, follow the downstream continuation rule.
