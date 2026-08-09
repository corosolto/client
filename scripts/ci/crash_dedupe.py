#!/usr/bin/env python3
import json
import re
import sys
from difflib import SequenceMatcher


def normalize(title: str) -> str:
    t = title.lower().strip()
    t = re.sub(r"blob:https?://\S+", "blob:<id>", t)
    t = re.sub(r"\b[0-9a-f]{8,}\b", "<hex>", t)
    t = re.sub(r"\s+", " ", t)
    return t


def main() -> int:
    payload = json.load(sys.stdin)
    current = payload["current"]
    others = payload["others"]
    current_norm = normalize(current["title"])
    current_num = current["number"]

    best = None
    best_score = 0.0
    for issue in others:
        if issue["number"] == current_num:
            continue
        score = SequenceMatcher(None, current_norm, normalize(issue["title"])).ratio()
        if score > best_score:
            best_score = score
            best = issue

    out = {"duplicate": None}
    if best and best_score >= 0.84:
        out["duplicate"] = {
            "number": best["number"],
            "title": best["title"],
            "url": best["url"],
            "score": round(best_score, 3),
        }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
