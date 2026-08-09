#!/usr/bin/env python3
import json
import sys

GOOD = {"SUCCESS", "SKIPPED", "NEUTRAL"}


def check_rollup_ok(rollup: list[dict]) -> bool:
    for item in rollup:
        t = item.get("__typename")
        if t == "CheckRun":
            if item.get("conclusion") not in GOOD:
                return False
        elif t == "StatusContext":
            if item.get("state") not in {"SUCCESS"}:
                return False
    return True


def main() -> int:
    pr = json.load(sys.stdin)
    labels = {l["name"] for l in pr.get("labels", [])}
    eligible = (
        not pr.get("isDraft", False)
        and "safe-automerge" in labels
        and pr.get("reviewDecision") != "CHANGES_REQUESTED"
        and pr.get("mergeStateStatus") in {"CLEAN", "HAS_HOOKS"}
        and check_rollup_ok(pr.get("statusCheckRollup", []))
    )
    print(json.dumps({"eligible": eligible}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
