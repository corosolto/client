#!/usr/bin/env python3
"""Build an idempotent daily staging-to-main release plan."""
import json
import sys


def render_title(date: str) -> str:
    return f"release: daily batch {date}"


def render_body(date: str, commits: list[dict], merged_prs: list[dict]) -> str:
    commit_shas = {commit["sha"] for commit in commits}
    pr_numbers = sorted({
        int(pr["number"])
        for pr in merged_prs
        if (pr.get("mergeCommit") or {}).get("oid") in commit_shas
    })
    lines = [
        "## Daily release batch",
        "",
        f"- Date: `{date}`",
        "- Base: `main`",
        "- Head: `staging`",
        f"- New commits: **{len(commits)}**",
        "",
        "## Included pull requests",
        "",
    ]
    lines.extend([f"- #{number}" for number in pr_numbers] or ["- No merged PR metadata matched these commits."])
    lines += [
        "",
        "## Release policy",
        "",
        "- All required checks and review gates must pass before automatic merge.",
        "- The merge commit keeps `staging` intact and triggers `release.yml`.",
        "- Production is published only by the existing release train after its own green gate.",
        "",
        "<!-- csbrasil-bot:daily-release -->",
    ]
    return "\n".join(lines) + "\n"


def plan(payload: dict) -> dict:
    date = payload["date"]
    commits = payload.get("commits") or []
    existing = payload.get("existing_prs") or []
    if not commits:
        return {"action": "skip", "reason": "staging has no commits outside main"}
    result = {
        "action": "update" if existing else "create",
        "title": render_title(date),
        "body": render_body(date, commits, payload.get("merged_prs") or []),
    }
    if existing:
        result["pr_number"] = existing[0]["number"]
    return result


def selftest() -> int:
    commits = [{"sha": "a" * 40, "subject": "merge one"}, {"sha": "b" * 40, "subject": "merge two"}]
    merged = [
        {"number": 12, "mergeCommit": {"oid": "a" * 40}},
        {"number": 13, "mergeCommit": {"oid": "c" * 40}},
        {"number": 12, "mergeCommit": {"oid": "a" * 40}},
    ]
    created = plan({"date": "2026-11-09", "commits": commits, "merged_prs": merged})
    updated = plan({"date": "2026-11-09", "commits": commits, "merged_prs": merged,
                    "existing_prs": [{"number": 99}]})
    cases = [
        ("empty range skips", plan({"date": "2026-11-09", "commits": []})["action"] == "skip"),
        ("new range creates one batch", created["action"] == "create" and "daily batch 2026-11-09" in created["title"]),
        ("existing batch is reused", updated["action"] == "update" and updated["pr_number"] == 99),
        ("only merged PRs in range are listed", "- #12\n" in created["body"] and "#13" not in created["body"]),
        ("body is English and marks dedupe", "Daily release batch" in created["body"] and "csbrasil-bot:daily-release" in created["body"]),
        ("merge preserves staging and release gate", "keeps `staging` intact" in created["body"] and "triggers `release.yml`" in created["body"]),
    ]
    failures = 0
    for name, ok in cases:
        print(f"  {'ok  ' if ok else 'FALHOU'} {name}")
        failures += 0 if ok else 1
    return 0 if not failures else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(plan(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
