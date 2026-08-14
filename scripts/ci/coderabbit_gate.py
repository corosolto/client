#!/usr/bin/env python3
import json
import sys


def main() -> int:
    payload = json.load(sys.stdin)
    comments = payload.get("comments", [])
    status_rollup = payload.get("statusCheckRollup", [])

    has_coderabbit_check = any(
        item.get("__typename") == "CheckRun" and "coderabbit" in (item.get("name") or "").lower()
        for item in status_rollup
    )
    has_coderabbit_comment = any(
        "coderabbit" in ((comment.get("author") or {}).get("login") or "").lower()
        for comment in comments
    )

    print(
        json.dumps(
            {
                "needs_resolution": bool(has_coderabbit_check or has_coderabbit_comment),
                "labels_add": ["needs-coderabbit-resolution"] if (has_coderabbit_check or has_coderabbit_comment) else [],
                "labels_remove": ["coderabbit-resolved"] if (has_coderabbit_check or has_coderabbit_comment) else [],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
