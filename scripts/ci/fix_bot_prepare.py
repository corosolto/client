#!/usr/bin/env python3
import json
import re
import sys


ISSUE_REF_RE = re.compile(rf"#?(\d+)")


def main() -> int:
    payload = json.load(sys.stdin)
    issue = payload["issue"]
    prs = payload.get("prs", [])

    issue_number = issue["number"]
    branch = f"bot/issue-{issue_number}"
    linked_pr = None
    for pr in prs:
        body = pr.get("body") or ""
        if re.search(rf"(closes|fixes|resolves)\s+#?{issue_number}\b", body, re.I):
            linked_pr = pr
            break

    out = {
        "issue_number": issue_number,
        "issue_title": issue["title"],
        "issue_url": issue["url"],
        "issue_body": issue.get("body") or "",
        "issue_labels": [label["name"] for label in issue.get("labels", [])],
        "branch": branch,
        "linked_pr": linked_pr,
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
