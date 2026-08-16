#!/usr/bin/env python3
import json
import sys


def main() -> int:
    issue = json.load(sys.stdin)
    title = (issue.get("title") or "").strip().lower()
    labels_add: list[str] = []
    if title.startswith("crash em produção:"):
        labels_add.append("crash-auto")
    print(json.dumps({"labels_add": sorted(set(labels_add))}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
