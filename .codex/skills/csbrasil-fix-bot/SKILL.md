---
name: csbrasil-fix-bot
description: Use when continuing a bot-opened fix branch for a csbrasil issue labeled bot-fixable. Read the task payload, keep scope narrow, make small commits, run the smallest relevant checks, and leave the PR in draft unless explicitly told otherwise.
---

# csbrasil fix bot

Use this skill only on bootstrap branches `bot/issue-N` or equivalent fix-bot branches.

## Workflow

1. Read the task payload JSON passed by the runner.
2. Confirm the issue is still narrow and deterministic.
3. Inspect only the files needed for that issue.
4. Apply the smallest fix that closes the issue.
5. Commit in small steps with signed commits when the environment supports it.
6. Run the smallest relevant validation:
   - docs/DX only: targeted syntax or link checks
   - UI/CSS/runtime: smoke or targeted build checks
   - backend/API: targeted build or script checks
7. Update the draft PR body/comment with what changed, what was checked, and what remains.

## Guardrails

- Never broaden scope beyond the issue.
- Never merge the PR yourself from this skill.
- Leave gameplay, backend, anti-cheat, maps, and large refactors for human review unless the payload explicitly allows them.
- If the issue no longer matches the current repo, stop and report that mismatch in the PR.
- If validation is blocked by unrelated baseline failures, say so explicitly with the failing command.
