---
starter_id: 10x-astro-starter
package_manager: npm
project_name: readthekey
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

ReadTheKey is a mobile-first web app with a 3-week after-hours MVP, optional OAuth progress storage, and no payments or realtime. The recommended TypeScript default for web apps — Astro + React islands, Supabase auth/database, and Cloudflare deploy — ships auth and persistence out of the box while keeping the guest practice loop fast to build. Standard path on cloudflare-pages with GitHub Actions auto-deploy matches the starter's defaults and minimizes setup friction for a solo builder on a short timeline.
