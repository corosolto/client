#!/usr/bin/env python3
import json
import sys

from issue_review import review_issue


def main() -> int:
    payload = json.load(sys.stdin)
    prs = payload.get("prs", [])
    actions = []

    for issue in payload.get("issues", []):
        review = review_issue({"issue": issue, "prs": prs})
        labels_existing = {label["name"] for label in issue.get("labels", [])}
        labels_add = sorted(set(review.get("labels_add", [])) - labels_existing)
        covered = review.get("covered_pr")

        if labels_add or covered:
            actions.append(
                {
                    "issue_number": issue["number"],
                    "labels_add": labels_add,
                    "comment": review["comment"],
                    "should_comment": bool(covered),
                }
            )

    print(json.dumps({"actions": actions}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
