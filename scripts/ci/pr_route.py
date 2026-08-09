#!/usr/bin/env python3
import json
import re
import sys


def normalize_branch_name(value: str) -> str:
    return re.sub(r"[^a-z0-9._/-]+", "-", value.strip().lower())


def target_label(base_branch: str) -> str:
    base = normalize_branch_name(base_branch)
    if base == "main":
        return "target:main"
    if base == "staging" or base.startswith("staging/"):
        return "target:staging"
    if base.startswith("release/") or base.startswith("release-"):
        return "target:release"
    return "target:main"


def main() -> int:
    payload = json.load(sys.stdin)
    pr = payload["pr"]
    desired_base = normalize_branch_name(payload.get("desired_base") or "")

    author = ((pr.get("author") or {}).get("login") or "").strip()
    author_is_bot = bool((pr.get("author") or {}).get("is_bot"))
    current_base = normalize_branch_name(pr.get("baseRefName") or "main")
    assignees = {(a.get("login") or "").strip() for a in pr.get("assignees") or []}

    retarget_to = None
    if desired_base and desired_base != current_base and current_base == "main":
        retarget_to = desired_base

    effective_base = retarget_to or current_base
    add_assignee = author if author and not author_is_bot and author not in assignees else None

    print(
        json.dumps(
            {
                "retarget_to": retarget_to,
                "add_assignee": add_assignee,
                "target_label": target_label(effective_base),
                "effective_base": effective_base,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
