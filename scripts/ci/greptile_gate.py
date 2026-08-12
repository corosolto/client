#!/usr/bin/env python3
import json
import sys


def main() -> int:
    payload = json.load(sys.stdin)
    comments = payload.get("comments", [])
    status_rollup = payload.get("statusCheckRollup", [])

    has_greptile_check = any(
        item.get("__typename") == "CheckRun" and item.get("name") == "Greptile Review"
        for item in status_rollup
    )
    has_greptile_comment = any(
        "greptile" in ((comment.get("author") or {}).get("login") or "").lower()
        or "greptile" in (comment.get("body") or "").lower()
        for comment in comments
    )

    print(
        json.dumps(
            {
                "needs_resolution": bool(has_greptile_check or has_greptile_comment),
                "labels_add": ["needs-greptile-resolution"] if (has_greptile_check or has_greptile_comment) else [],
                "labels_remove": ["greptile-resolved"] if (has_greptile_check or has_greptile_comment) else [],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
