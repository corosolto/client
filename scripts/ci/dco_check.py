#!/usr/bin/env python3
import json
import subprocess
import sys


def main() -> int:
    payload = json.load(sys.stdin)
    base = payload["baseRefOid"]
    head = payload["headRefOid"]
    log = subprocess.check_output(
        ["git", "log", "--format=%H%x00%B%x00==END==", f"{base}..{head}"],
        text=True,
    )
    chunks = [c for c in log.split("==END==\n") if c.strip()]
    missing = []
    for chunk in chunks:
      parts = chunk.split("\x00", 2)
      if len(parts) < 2:
          continue
      sha, body = parts[0].strip(), parts[1]
      if "Signed-off-by:" not in body:
          missing.append(sha)
    print(json.dumps({"ok": not missing, "missing": missing}))
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
