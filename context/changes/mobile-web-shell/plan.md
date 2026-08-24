# Mobile-web-shell Implementation Plan

## Overview

Turn the bootstrapped `10x-astro-starter` into a ReadTheKey-branded, mobile-first web shell: light theme, viewport/layout polish, a three-region practice placeholder on `/`, and a live Cloudflare Workers URL. Unlocks S-01 (guest practice round) without building the drill or changing auth.

## Current State Analysis

- Astro 6 SSR + React islands + Tailwind 4 + `@astrojs/cloudflare` + `wrangler.jsonc` are already present from bootstrap.
- `src/layouts/Layout.astro` provides HTML shell with viewport `width=device-width` (no `initial-scale`) and default title `"10x Astro Starter"`.
- `/` renders cosmic `Welcome.astro` (purple Topbar + marketing hero). Auth demo routes and Supabase email/password scaffolding remain and are **out of scope** for this change (F-02 owns OAuth later).
- Package/`wrangler` name is still `10x-astro-starter`. CI builds on push/PR to `master` but does not deploy.
- No PWA / service worker; offline-after-first-load NFR is deferred by decision (document only).
- Roadmap Baseline claiming “frontend absent” is stale relative to bootstrap.

### Key Discoveries:

- Deploy path in-repo is **Cloudflare Workers** via `wrangler` (`wrangler.jsonc`), not Pages — despite tech-stack hand-off saying `cloudflare-pages`. Implement against Workers config already present.
- Home currently pulls `Topbar` inside `Welcome`; the practice placeholder should **not** promote sign-in on `/` (auth routes stay reachable by URL for F-02).
- Theme tokens already live in `src/styles/global.css` (`:root` / `@theme inline`); light product look can be achieved by retuning CSS variables and dropping `bg-cosmic` from the home path.

## Desired End State

A guest opening the public Workers URL on a phone sees a ReadTheKey-branded one-screen shell: thin score bar, staff region, piano region (labeled placeholders), no horizontal scroll, readable on a narrow viewport. CI lint+build is green. Auth demo files still exist but are unused by the home shell. Offline caching and the practice drill itself are not implemented.

**Verify:** public URL loads on a real phone; layout matches the three-region contract; `npm run lint` and `npm run build` pass; worker name/title say ReadTheKey.

## What We're NOT Doing

- Guest practice loop (staff notes, piano taps, scoring) — S-01
- Service worker / PWA installability / offline asset caching — deferred; NFR stays documented
- OAuth / profile / changing auth API routes — F-02
- Deleting auth pages or Topbar component (leave for F-02 cleanup)
- Full visual identity (custom illustration, marketing site)
- Ads/tracking scripts (remain banned; do not add any)
- Updating roadmap Baseline prose (optional follow-up; not required for F-01 ship)

## Implementation Approach

Three incremental phases: (1) rename + theme + Layout mobile foundations, (2) replace `/` with practice chrome placeholders, (3) deploy publicly and smoke-test on a phone. Keep changes minimal under roadmap `speed` / `time`.

## Critical Implementation Details

**Deploy target:** Use existing Workers + `npx wrangler deploy`. Renaming `wrangler.jsonc` `name` to `readthekey` (or similar kebab) is part of identity; first deploy may require Cloudflare account login and Workers secrets if the build expects `SUPABASE_*` at runtime — local/CI already treat them as optional, but confirm the deployed app still renders `/` when secrets are unset (starter soft-disables Supabase).

**Home chrome:** Do not mount starter `Topbar` on the practice placeholder. Guests must not hit a login wall or purple starter nav on `/`.

---

## Phase 1: Identity & mobile foundation

### Overview

Rebrand the project to ReadTheKey and establish a light, mobile-friendly document shell so later UI is not fighting starter cosmic defaults.

### Changes Required:

#### 1. Package and worker identity

**File**: `package.json`, `wrangler.jsonc`

**Intent**: Rename the npm package and Cloudflare worker from `10x-astro-starter` to `readthekey` so deploy and tooling match the product.

**Contract**: `package.json` `"name"` and `wrangler.jsonc` `"name"` are `readthekey`. No other wrangler semantics change.

#### 2. Document shell defaults

**File**: `src/layouts/Layout.astro`

**Intent**: Default title and viewport meta match a mobile web app; body can host a full-viewport practice shell without starter branding leaking through.

**Contract**: Default `title` is `ReadTheKey`. Viewport includes `width=device-width, initial-scale=1`. Prefer `100dvh`-friendly body sizing (no horizontal overflow at the document level). Keep existing config `Banner` behavior unchanged.

#### 3. Light theme tokens

**File**: `src/styles/global.css`

**Intent**: Retune CSS variables so the default look is a simple light product theme (not purple cosmic). Leave shadcn token structure intact for future UI components.

**Contract**: `:root` background/foreground/primary read as a light, calm practice UI. Do not introduce a new design system. Auth pages may look slightly different after token changes — acceptable for F-01.

#### 4. Product-facing copy touchpoints

**File**: `README.md` (title/intro only if touched), optional favicon leave-as-is

**Intent**: Avoid leaving “10x Astro Starter” as the primary project name in the first place a developer looks. Full README rewrite is out of scope; a short title/intro update is enough if the implementer touches README.

**Contract**: If README is edited, H1 / one-line description say ReadTheKey. Cosmic screenshot may remain until replaced later.

#### 5. Home chrome light pass (addendum — review F1)

**File**: `src/components/Welcome.astro`, `src/components/Topbar.astro`

**Intent**: Strip cosmic styling from the temporary home so Phase 1 criterion 1.7 (light theme visible) passes before Phase 2 replaces `/` with the practice shell.

**Contract**: Welcome uses `bg-background` / theme tokens (no `bg-cosmic`, orbs, or starfield). Topbar uses light border/card chrome. Auth CTAs may remain until Phase 2 removes Topbar from `/`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes (with or without Supabase env; match existing CI optional secrets behavior)
- `package.json` and `wrangler.jsonc` name fields are `readthekey`
- Layout default title string is `ReadTheKey`

#### Manual Verification:

- `npm run dev` home still loads (may still show Welcome until Phase 2)
- Document viewport meta includes `initial-scale=1` when viewed in page source
- Light theme tokens visible on a simple page (body background is light, not cosmic)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Phase 2: Practice shell placeholder

### Overview

Replace the starter landing with a ReadTheKey one-screen placeholder that locks the staff / piano / score layout contract for S-01.

### Changes Required:

#### 1. Practice shell component

**File**: new component under `src/components/` (e.g. `PracticeShell.astro`) — Astro preferred (static chrome; no React needed yet)

**Intent**: Render branded product name, one-line prompt, and three labeled regions (score bar, staff, piano) in a single mobile-first column that fills the viewport without horizontal scroll.

**Contract**:
- Brand name `ReadTheKey` is hero-level (not only in `<title>`)
- One short supporting line (e.g. practice prompt or “Practice coming soon”)
- Three regions with visible labels: score / staff / piano (empty content OK)
- Layout uses full viewport height (`min-h-dvh` or equivalent), stacks vertically, large empty areas suitable for future tap targets
- No `Topbar`, no ads/tracking, no cards-as-decoration beyond what’s needed to see region boundaries
- Safe-area padding considered (`env(safe-area-inset-*)` or equivalent padding) so notches don’t clip chrome

#### 2. Home route swap

**File**: `src/pages/index.astro`

**Intent**: `/` mounts the practice shell inside `Layout` instead of `Welcome`.

**Contract**: `index.astro` imports Layout + practice shell only. `Welcome.astro` may remain on disk unused (do not delete unless trivial and unused references are cleaned) — deleting is optional cleanup, not required.

#### 3. Overflow / mobile CSS guardrails

**File**: `src/layouts/Layout.astro` and/or practice shell styles / `global.css`

**Intent**: Guarantee no horizontal scroll on common phone widths for the shell page.

**Contract**: Root and shell containers use `overflow-x: hidden` or width constraints (`max-w-full`, `w-full`) such that a ~390px-wide viewport does not scroll horizontally.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- `/` route source no longer depends on `Welcome.astro` as its primary child

#### Manual Verification:

- On a phone-width viewport (dev tools or device): three regions visible, brand readable, no horizontal scroll
- Sign-in / cosmic hero not shown on `/`
- Auth URLs (`/auth/signin`, etc.) still respond if hit directly (unchanged)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Ship public URL

### Overview

Prove the shell is deployable: CI stays green, Worker is live on a public URL, phone smoke against that URL.

### Changes Required:

#### 1. CI remains the automated gate

**File**: `.github/workflows/ci.yml` (only if rename or secrets docs require a tweak)

**Intent**: Keep lint+build as the automated quality gate. No requirement to add auto-deploy in this phase unless the implementer already has it wired; public URL may be produced by a one-shot `wrangler deploy` from a machine with Cloudflare auth.

**Contract**: CI continues to run `npm ci` → `astro sync` → lint → build with `SUPABASE_URL` / `SUPABASE_KEY` secrets. Auto-deploy-on-merge is **nice-to-have**, not a Phase 3 requirement — the required artifact is a **public URL**, however it was published.

#### 2. First production deploy

**File**: operational — `wrangler.jsonc` already configured; may need Cloudflare dashboard / `wrangler login` / project secrets

**Intent**: Publish the Worker so `readthekey` (or the chosen worker name) is reachable on the internet.

**Contract**: A stable HTTPS URL loads the Phase 2 home shell. Document the URL in `context/changes/mobile-web-shell/change.md` Notes (or plan Progress notes) so S-01 has a known endpoint.

#### 3. Phone smoke on public URL

**File**: none (manual)

**Intent**: Confirm FR-010 basics on a real device against production, not only desktop responsive mode.

**Contract**: On a phone browser: open public URL, see ReadTheKey + three regions, no horizontal scroll, page usable without login.

### Success Criteria:

#### Automated Verification:

- CI job on the branch/PR or `master` is green after Phase 1–2 commits land
- `npm run build` still passes locally before deploy

#### Manual Verification:

- Public Cloudflare Workers URL opens the practice shell
- Real-phone smoke: brand + three regions, no H-scroll, no login wall
- Auth demo not required for the guest path on `/`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. F-01 is complete when the public URL smoke passes.

---

## Testing Strategy

### Unit Tests:

- None required for F-01 (static Astro shell; no new business logic)

### Integration Tests:

- None required; rely on lint + production build + manual smoke

### Manual Testing Steps:

1. Phase 1: confirm title/viewport/theme locally
2. Phase 2: phone-width layout — three regions, no H-scroll, no Topbar on `/`
3. Phase 3: open public URL on a real phone; confirm same layout
4. Spot-check `/auth/signin` still loads (regression: auth not deleted)

## Performance Considerations

Static shell with no SW; keep home free of heavy cosmic backgrounds and large decorative blurs so first paint on mobile stays light. No ads/tracking scripts.

## Migration Notes

- Existing bookmarks to starter marketing `/` will see the new shell after deploy.
- Worker rename may create a **new** Workers project on first deploy (`readthekey`); old `10x-astro-starter` worker can be deleted manually in Cloudflare later.
- Supabase optional soft-disable banners may still appear if env missing — acceptable; do not block F-01 on Supabase setup.

## References

- Roadmap F-01: `context/foundation/roadmap.md`
- PRD FR-010 + offline NFR (deferred): `context/foundation/prd.md`
- Tech stack hand-off: `context/foundation/tech-stack.md`
- Layout: `src/layouts/Layout.astro`
- Home: `src/pages/index.astro`
- Theme: `src/styles/global.css`
- Deploy: `wrangler.jsonc`, `README.md` deploy section
- Bootstrap verification: `context/changes/bootstrap-verification/verification.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Identity & mobile foundation

#### Automated

- [x] 1.1 `npm run lint` passes — 06c44a3
- [x] 1.2 `npm run build` passes (with or without Supabase env; match existing CI optional secrets behavior) — 06c44a3
- [x] 1.3 `package.json` and `wrangler.jsonc` name fields are `readthekey` — 06c44a3
- [x] 1.4 Layout default title string is `ReadTheKey` — 06c44a3

#### Manual

- [x] 1.5 `npm run dev` home still loads (may still show Welcome until Phase 2) — 06c44a3
- [x] 1.6 Document viewport meta includes `initial-scale=1` when viewed in page source — 06c44a3
- [x] 1.7 Light theme tokens visible on a simple page (body background is light, not cosmic) — 06c44a3

### Phase 2: Practice shell placeholder

#### Automated

- [x] 2.1 `npm run lint` passes — 40de1fb
- [x] 2.2 `npm run build` passes — 40de1fb
- [x] 2.3 `/` route source no longer depends on `Welcome.astro` as its primary child — 40de1fb

#### Manual

- [x] 2.4 On a phone-width viewport: three regions visible, brand readable, no horizontal scroll — 40de1fb
- [x] 2.5 Sign-in / cosmic hero not shown on `/` — 40de1fb
- [x] 2.6 Auth URLs (`/auth/signin`, etc.) still respond if hit directly (unchanged) — 40de1fb

### Phase 3: Ship public URL

#### Automated

- [ ] 3.1 CI job on the branch/PR or `master` is green after Phase 1–2 commits land
- [ ] 3.2 `npm run build` still passes locally before deploy

#### Manual

- [ ] 3.3 Public Cloudflare Workers URL opens the practice shell
- [ ] 3.4 Real-phone smoke: brand + three regions, no H-scroll, no login wall
- [ ] 3.5 Auth demo not required for the guest path on `/`
