# Auth Practice Tokens Implementation Plan

## Overview

Restyle `/auth/signin`, `/auth/signup`, and `/auth/confirm-email` (and the shared form islands) from leftover cosmic/purple glass to the calm light practice tokens already used on `/` and `/dashboard`. Auth flows, copy, and the Google-then-email structure stay; this is a visual unification S-02 deferred.

## Current State Analysis

Practice tokens live in `src/styles/global.css` `:root` — cool paper, ink, slate primary, explicitly “no cosmic purple.” `/` (`PracticeShell`) and `/dashboard` already follow that recipe: `bg-background text-foreground`, `min-h-dvh`, safe-area padding, `border-border` / `text-muted-foreground`, `min-h-11` taps.

Auth is a second visual system inside the same `Layout.astro` HTML shell:

- All three pages use `bg-cosmic` (navy gradient utility, auth-only), a frosted `bg-white/10` card, and purple/blue gradient titles.
- `FormField`, `SubmitButton`, `ServerError`, `PasswordToggle`, and the signup password hint hardcode white-on-glass and `bg-purple-600`.
- Google is a native POST button on signin only; signup has no Google (F-02). Confirm-email uses emoji as the hero.
- S-02 restyled dashboard and left `/auth/*` cosmic on purpose. No test runner exists; CI is lint + build.

## Desired End State

A guest who taps Sign in from practice lands on a light, centered card that reads as the same app. Sign-up and confirm-email match. Titles are solid ink. Primary actions use `--primary`. Errors use `--destructive`. Each card has a “Back to practice” text link to `/`. Confirm-email is heading + muted copy + links, no emoji. `bg-cosmic` is gone. Existing POSTs, query-param `error`, and validation copy are unchanged.

### Key Discoveries:

- Practice token recipe (S-02 dashboard contract): `bg-background text-foreground min-h-dvh`, `overflow-x-hidden`, `border-border`, `text-muted-foreground`, `min-h-11`. No `bg-cosmic`, no purple gradient title — `context/archive/2026-09-05-oauth-profile-progress/plan.md` (dashboard phase).
- Token source: `src/styles/global.css` lines 6–40 (`:root`) and 114–116 (`@utility bg-cosmic`, auth-only).
- Light card analog already in tree: `Welcome.astro` feature cards (`border-border bg-card rounded-xl`) — unused on `/` but the only tokenized card pattern.
- Only shadcn primitive is `Button` (`src/components/ui/button.tsx`). No `Input`. Auth fields are custom (`FormField` + icon + `endContent`).
- Shared islands (`FormField`, `SubmitButton`, `ServerError`) are used by both sign-in and sign-up; they cannot be retokened independently of both pages.
- Lint will not catch leftover `bg-cosmic` or purple utilities — visual/grep check only.

## What We're NOT Doing

- Auth API, OAuth/PKCE, redirect URLs, extra providers
- Adding Google to `/auth/signup`
- Login wall / `PROTECTED_ROUTES` changes / redirecting signed-in users away from auth pages
- Practice-shell header (brand + `PracticeAuthBar`) on auth pages
- Installing shadcn `Input` / Label
- Restyling `Welcome.astro` or `LibBadge.astro`
- Dark mode, new fonts, marketing redesign
- Adding a test runner
- Changing validation rules, error query-param wiring, or form `action`s

## Implementation Approach

In-place class swaps on the existing Astro pages and auth components, mirroring the S-02 dashboard restyle. Keep page structure (centered `max-w-sm` panel, Google → or → email on signin, cross-links). Swap cosmic/purple/glass for practice tokens and a light card. Drop `SubmitButton`’s purple override so the default `Button` variant shows. Delete `@utility bg-cosmic` once the three pages no longer reference it. No new layout component — three pages copy the same shell contract, as dashboard did.

## Critical Implementation Details

**Timing & lifecycle.** `FormField` / `SubmitButton` / `ServerError` are shared by sign-in and sign-up. Restyling those islands without restyling both Astro wrappers (or the reverse) yields unreadable contrast (light inputs on a dark glass card, or white text on paper). Land pages, islands, and `bg-cosmic` removal in one change.

**User experience spec.** Keep Google as the first full-width primary CTA on signin, then the “or” divider, then the email form. Do not add a page header. Place “Back to practice” (`href="/"`) at the bottom of each card as a `min-h-11` text link in the same family as dashboard’s “Back to practice” — after the sign-in/sign-up cross-link (and after confirm-email’s existing sign-in link). Confirm-email: remove the emoji field and the large emoji element; keep heading, description, and the existing sign-in link text (`Go to sign in` / `Back to sign in`).

---

## Phase 1: Restyle auth to practice tokens

### Overview

Retoken the shared form islands, restyle all three auth pages to a centered light card on paper, add “Back to practice”, drop confirm-email emoji, and delete `bg-cosmic`.

### Changes Required:

#### 1. Shared form islands

**File**: `src/components/auth/FormField.tsx`

**Intent**: Make labels, inputs, icons, and field errors readable on a light card using practice tokens, with mobile tap height.

**Contract**: `inputBase` and state classes use `bg-background` / `border-input` / `text-foreground` / `placeholder:text-muted-foreground` / `focus:ring-ring` (error: `border-destructive` + `text-destructive`). Labels and icons use `text-muted-foreground`. Input control is at least `min-h-11`. Public props/API unchanged.

**File**: `src/components/auth/PasswordToggle.tsx`

**Intent**: Eye toggle must remain visible and tappable on a light input.

**Contract**: Icon color `text-muted-foreground` with `hover:text-foreground`; keep `aria-label`. Hit target at least `min-h-11`.

**File**: `src/components/auth/SubmitButton.tsx`

**Intent**: Stop overriding `Button` with purple so the default primary variant matches Welcome / practice CTAs.

**Contract**: Drop `bg-purple-600` / `hover:bg-purple-500` / hardcoded white. Keep `type="submit"`, pending spinner + `pendingText`, `w-full`, and `min-h-11`. Spinner uses `border-primary-foreground` (or equivalent on `--primary`).

**File**: `src/components/auth/ServerError.tsx`

**Intent**: Server error banner must read as an error on paper, not dark-glass red.

**Contract**: Token destructive treatment (`border-destructive`, `text-destructive`, light destructive fill). Still hidden when `message` is empty.

**File**: `src/components/auth/SignUpForm.tsx`

**Intent**: Password-length hint must remain readable on the light card.

**Contract**: Hint class `text-muted-foreground` instead of `text-blue-100/50`. Validation behavior unchanged.

#### 2. Auth pages

**File**: `src/pages/auth/signin.astro`

**Intent**: Sign-in is the primary surface; it should look like ReadTheKey, not the cosmic starter.

**Contract**:

- Outer shell: `bg-background text-foreground`, `min-h-dvh`, `overflow-x-hidden`, `items-center justify-center`, `p-4`, same `env(safe-area-inset-*)` inline padding as `PracticeShell` / `dashboard.astro`. No `bg-cosmic`.
- Card: `max-w-sm`, `rounded-xl border border-border bg-card` (Welcome card recipe). Keep existing inner padding.
- Title: solid `text-foreground font-bold tracking-tight`, no gradient clip.
- Google button: keep native POST to `/api/auth/oauth`; classes `bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 w-full` (same language as Welcome Sign In).
- “or” divider: `text-muted-foreground` + `border-border` rules.
- Footer: existing “Don’t have an account? Sign up” in muted/foreground underline links; then “Back to practice” → `/` as a `min-h-11` text link (`text-foreground`, `underline-offset-4 hover:underline`).
- `SignInForm` island and `?error=` wiring unchanged.

**File**: `src/pages/auth/signup.astro`

**Intent**: Sign-up must not remain a cosmic island once sign-in is restyled; people click between them.

**Contract**: Same shell, card, title, and “Back to practice” as signin. Keep `SignUpForm` and the “Already have an account? Sign in” cross-link (muted/foreground, not purple). No Google button.

**File**: `src/pages/auth/confirm-email.astro`

**Intent**: Post-signup status should match the other auth pages and the practice tone (no emoji-as-hero).

**Contract**: Same shell and card as signin (centered, `text-center` for this page). Drop `emoji` from the content object and the large emoji element. Heading + `text-muted-foreground` description + existing sign-in link + “Back to practice” → `/`. Dev vs prod copy (`import.meta.env.DEV`) unchanged.

#### 3. Remove leftover cosmic utility

**File**: `src/styles/global.css`

**Intent**: The navy gradient was only for auth; after the restyle it is dead CSS that invites reuse.

**Contract**: Delete `@utility bg-cosmic`. `:root` practice tokens and `.dark` stay. No other token edits.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes
- Repo grep: no `bg-cosmic` remaining in `src/`
- Auth files (`src/pages/auth/**`, `src/components/auth/**`) contain no `bg-purple-`, `text-purple-`, `from-blue-200`, `text-blue-100`, `bg-white/10`, or `bg-red-900`

#### Manual Verification:

- `/auth/signin`: light paper, light card, solid title, Google then “or” then email form; Sign up + Back to practice links work
- `/auth/signup`: same visual language; Sign in + Back to practice work; no Google
- `/auth/confirm-email`: no emoji; heading/body readable; both links work (dev and the production copy path if you can toggle)
- Google POST and email/password POST still hit the same endpoints; `?error=` still shows `ServerError`
- Field validation, password show/hide, and pending submit still work
- ~390px width: no horizontal scroll; Google, submit, password toggle, and Back to practice are tappable (`min-h-11`)
- `/` and `/dashboard` look unchanged

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Phase blocks use plain bullets — the corresponding `- [ ]` checkboxes for these items live in the `## Progress` section at the bottom of the plan.

---

## Testing Strategy

### Unit Tests:

- None. There is no test runner in this repo; do not add one in this change.

### Integration Tests:

- None. Rely on `npm run lint`, `npm run build`, and grep for leftover cosmic/purple classes.

### Manual Testing Steps:

1. From `/` as a guest, tap Sign in — confirm the light card (not navy/purple).
2. Submit Google and confirm the existing OAuth hop still starts (do not need a full successful login if secrets are missing; the POST target must still be `/api/auth/oauth`).
3. Submit empty email/password — client validation still appears in destructive tokens.
4. Load `/auth/signin?error=test` — `ServerError` banner is readable on the light card.
5. Toggle password visibility on sign-in and both signup password fields.
6. Follow Sign up ↔ Sign in cross-links; each page matches the other.
7. After signup (or by visiting `/auth/confirm-email` directly), confirm no emoji and both links.
8. Tap Back to practice on all three pages — lands on `/`.
9. Narrow the viewport to ~390px; no H-scroll; tap targets remain usable.
10. Spot-check `/` practice and `/dashboard` (if signed in) for regressions.

## Performance Considerations

None beyond the existing islands (`client:load` on the forms). Do not add new client JS.

## Migration Notes

No data or auth-flow migration. The only removal is unused CSS: `@utility bg-cosmic`. After deploy, a hard refresh is enough; no cookies or sessions change.

## References

- Change notes: `context/changes/auth-practice-tokens/change.md`
- Deferred in S-02: `context/archive/2026-09-05-oauth-profile-progress/plan.md` (dashboard restyle; `/auth/signin` remains cosmic)
- Token source: `src/styles/global.css`
- Visual precedent: `src/pages/dashboard.astro`, `src/components/PracticeShell.astro`, `src/components/Welcome.astro` (card recipe)
- Auth pages: `src/pages/auth/{signin,signup,confirm-email}.astro`
- Auth islands: `src/components/auth/{FormField,SubmitButton,ServerError,PasswordToggle,SignInForm,SignUpForm}.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Restyle auth to practice tokens

#### Automated

- [x] 1.1 `npm run lint` passes — 0de79a8
- [x] 1.2 `npm run build` passes — 0de79a8
- [x] 1.3 Repo grep: no `bg-cosmic` remaining in `src/` — 0de79a8
- [x] 1.4 Auth files contain no leftover cosmic/purple utility classes — 0de79a8

#### Manual

- [x] 1.5 `/auth/signin` uses light paper + card; Google → or → email; Sign up and Back to practice work — 0de79a8
- [x] 1.6 `/auth/signup` matches sign-in; no Google; cross-link and Back to practice work — 0de79a8
- [x] 1.7 `/auth/confirm-email` has no emoji; heading/body/links readable — 0de79a8
- [x] 1.8 Google and email/password POSTs still hit the same endpoints; `?error=` still shows — 0de79a8
- [x] 1.9 Field validation, password toggle, and pending submit still work — 0de79a8
- [x] 1.10 ~390px: no H-scroll; tap targets remain `min-h-11` — 0de79a8
- [x] 1.11 `/` and `/dashboard` look unchanged — 0de79a8
