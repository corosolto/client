---
name: csbrasil-pr-triage
description: Use when classifying, reviewing, or deciding mergeability of pull requests in this repository, especially to decide whether a PR is safe to merge, needs staging, or requires human gameplay/backend review.
---

# CSBRASIL PR triage

Use this skill for PR review in this repo.

## Core rules

- Treat `public/js/game.js`, map files, render/HUD changes, `src/pages/api/*`, and `supabase/*` as sensitive.
- Small docs/workflow/text-only PRs can be candidates for `safe-automerge`.
- If a PR touches gameplay or backend, prefer human review even when checks pass.
- If the diff mixes unrelated concerns, recommend split before merge.

## Labels

- `safe-automerge`: only small, reversible, non-sensitive changes
- `needs-staging`: multi-surface changes or user-visible runtime changes
- `needs-human-gameplay`: gameplay/render/HUD/maps/characters
- `needs-human-backend`: API/Supabase/ranking/anti-cheat

## Review flow

1. Read PR summary, changed files, and checks.
2. Classify the surface area.
3. Check for risky overlaps with sensitive files.
4. State one of:
   - mergeable now
   - fix before merge
   - human review required
   - stage first

