---
name: csbrasil-smoke-check
description: Use when validating that a change did not break the basic playable flow of this repository, especially menu, ranking, team/character selection, and initial game boot.
---

# CSBRASIL smoke check

Use this skill when a PR changes UI, menu flow, HUD, runtime boot, or site/game integration.

## Minimum flow

1. Open `/`
2. Confirm main menu renders
3. Open ranking and return
4. Fill nick
5. Enter team select
6. Enter character select
7. Confirm a character
8. Confirm the game reaches initial HUD without immediate crash

## Notes

- Prefer stable selectors by `id`.
- For automated runs, use `?debug=1` when useful.
- If the game boot path is flaky, at least prove the menu→team→character flow remains intact.
