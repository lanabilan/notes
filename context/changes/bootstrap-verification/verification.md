---
bootstrapped_at: 2026-08-23T19:41:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: readthekey
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
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
```

ReadTheKey is a mobile-first web app with a 3-week after-hours MVP, optional OAuth progress storage, and no payments or realtime. The recommended TypeScript default for web apps — Astro + React islands, Supabase auth/database, and Cloudflare deploy — ships auth and persistence out of the box while keeping the guest practice loop fast to build. Standard path on cloudflare-pages with GitHub Actions auto-deploy matches the starter's defaults and minimizes setup friction for a solo builder on a short timeline.

## Pre-scaffold verification

| Signal             | Value                                              | Severity | Notes                              |
| ------------------ | -------------------------------------------------- | -------- | ---------------------------------- |
| npm package        | not run                                            | —        | cmd_template uses git clone        |
| GitHub repo        | przeprogramowani/10x-astro-starter pushed 2026-08-22 | fresh    | from card.docs_url                 |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 20
**Conflicts (.scaffold siblings)**: none
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 1 CRITICAL, 13 HIGH, 7 MODERATE, 2 LOW
**Direct vs transitive**: 0/1/2/0 direct of total 1/13/7/2

#### CRITICAL findings

- **tar** (transitive) — fix available via dependency updates upstream

#### HIGH findings

- **astro** (direct) — multiple XSS/SSRF advisories; fix available
- **brace-expansion** (transitive) — DoS advisories; fix available
- **devalue** (transitive) — DoS via sparse array deserialization; fix available
- **undici** (transitive) — multiple disclosure/injection advisories; fix available
- **vite** (transitive) — path bypass on Windows dev server; fix available
- **ws** (transitive) — memory disclosure/DoS; fix available

See full npm audit output for remaining HIGH/MODERATE/LOW entries.

## Hints recorded but not acted on

| Hint                       | Value                              |
| -------------------------- | ---------------------------------- |
| bootstrapper_confidence    | first-class                        |
| quality_override           | false                              |
| path_taken                 | standard                           |
| self_check_answers         | null                               |
| team_size                  | solo                               |
| deployment_target          | cloudflare-pages                   |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                               |
| has_payments               | false                              |
| has_realtime               | false                              |
| has_ai                     | false                              |
| has_background_jobs        | false                              |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
