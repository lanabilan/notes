# Mobile-web-shell — Plan Brief

> Full plan: `context/changes/mobile-web-shell/plan.md`

## What & Why

ReadTheKey needs a deployable mobile-first web shell before the guest practice drill (S-01). Bootstrap already gave Astro + Cloudflare; this change rebrands it, locks a three-region practice layout placeholder, and ships a public URL so practice UI can land without redoing hosting.

## Starting Point

`10x-astro-starter` is in the repo: SSR, Tailwind, Workers config, cosmic Welcome + auth demo. Viewport meta is partial; package/worker names and home UI still say starter. No PWA/offline implementation yet.

## Desired End State

A phone browser hitting a public Workers URL shows **ReadTheKey** with labeled score / staff / piano regions, no horizontal scroll, no login wall on `/`. CI is green. Auth scaffolding remains for F-02; offline caching stays deferred.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Shell scope | Product shell + placeholder chrome | Unlocks S-01 without building the drill | Plan |
| Offline / PWA | Defer SW; document NFR only | No assets to cache yet; keep F-01 thin | Plan |
| Home route | Branded three-region placeholder | Passes brand + layout contract for S-01 | Plan |
| Auth demo | Leave in place | F-02 owns OAuth; avoid rework | Plan |
| Theme | Light token retune | Drop cosmic starter look without full identity | Plan |
| Done bar | Public Cloudflare URL (+ CI green) | “Deployable” means live, not only local | Plan |
| Deploy platform | Existing Workers / wrangler | Matches repo config over hand-off “pages” label | Research |

## Scope

**In scope:** Rename to ReadTheKey; Layout viewport/title; light theme; `/` practice placeholder (three regions); public Workers deploy; phone smoke.

**Out of scope:** Practice loop; PWA/service worker; OAuth changes; deleting auth routes; heavy branding; ads/tracking.

## Architecture / Approach

Reuse Astro `Layout` + Tailwind tokens. New static Astro practice-shell component on `/` (no React yet). Do not mount starter Topbar on home. Deploy with existing `@astrojs/cloudflare` + `wrangler deploy`; CI stays lint+build.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Identity & mobile foundation | Names, viewport, light theme | Theme bleed into auth pages (acceptable) |
| 2. Practice shell placeholder | Three-region `/` chrome | Over-building fake UI into S-01 |
| 3. Ship public URL | Live Workers URL + phone smoke | Cloudflare auth / first-deploy friction |

**Prerequisites:** Bootstrap complete (done); Cloudflare account for Phase 3; CI secrets for Supabase optional as today.

**Estimated effort:** ~1–2 short sessions across 3 phases (after-hours).

## Open Risks & Assumptions

- First `wrangler deploy` after rename may create a new Worker; old starter worker may linger in the dashboard.
- Tech-stack hand-off said `cloudflare-pages`; implementation follows in-repo Workers — revisit naming only if Pages is required later.
- Offline NFR remains unmet until a later slice adds caching.

## Success Criteria (Summary)

- Public URL shows ReadTheKey practice shell on a real phone without H-scroll or login wall
- CI lint+build green
- S-01 can fill staff/piano/score regions without redesigning hosting
