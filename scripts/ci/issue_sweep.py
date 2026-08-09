#!/usr/bin/env python3
import json
import sys

from crash_dedupe import find_duplicate
from issue_review import review_issue


def main() -> int:
    payload = json.load(sys.stdin)
    prs = payload.get("prs", [])
    issues = payload.get("issues", [])
    actions = []

    for issue in issues:
        review = review_issue({"issue": issue, "prs": prs})
        labels_existing = {label["name"] for label in issue.get("labels", [])}
        labels_add = sorted(set(review.get("labels_add", [])) - labels_existing)
        covered = review.get("covered_pr")
        duplicate = None
        if "crash-auto" in labels_existing:
            duplicate = find_duplicate(issue, issues)

        if labels_add or covered or duplicate:
            comment = review["comment"]
            if duplicate:
                comment = "\n".join(
                    [
                        comment,
                        "",
                        "Possível duplicata automática detectada.",
                        f"- candidata: #{duplicate['number']} — {duplicate['title']}",
                        f"- link: {duplicate['url']}",
                        f"- similaridade: {duplicate['score']}",
                    ]
                )
            actions.append(
                {
                    "issue_number": issue["number"],
                    "labels_add": labels_add,
                    "comment": comment,
                    "should_comment": bool(covered or duplicate),
                }
            )

    print(json.dumps({"actions": actions}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
