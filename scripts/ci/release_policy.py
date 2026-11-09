#!/usr/bin/env python3
"""Shared bugfix and release-channel classification for issues and pull requests."""
import json
import re
import sys

HOTFIX_TITLE = re.compile(r"^(?:\s*\[hotfix\]|\s*hotfix\s*:)", re.IGNORECASE)
BUGFIX_TITLE = re.compile(
    r"^(?:\s*(?:fix|bugfix|hotfix)(?:\([^)]*\))?\s*:|\s*(?:fix|bug|crash|regression)\b)"
    r"|\b(?:bug|crash|regression|erro|falha|trava|travando|corrigir|correcao|correção)\b",
    re.IGNORECASE,
)


def label_names(item: dict) -> set[str]:
    return {(label.get("name") or "").strip().lower() for label in item.get("labels") or []}


def is_hotfix(item: dict) -> bool:
    return "hotfix" in label_names(item) or bool(HOTFIX_TITLE.search(item.get("title") or ""))


def is_bugfix(item: dict) -> bool:
    labels = label_names(item)
    return is_hotfix(item) or bool(labels.intersection({"bug", "bugfix", "crash-auto"})) or bool(
        BUGFIX_TITLE.search(item.get("title") or "")
    )


def release_channel(item: dict) -> str:
    return "hotfix" if is_hotfix(item) else "batch"


def hotfix_has_only_main_ancestors(head_commits: list[str], staging_commits: list[str]) -> bool:
    return set(head_commits).isdisjoint(staging_commits)


def selftest() -> int:
    cases = [
        ({"title": "fix: repair reconnect"}, True, False, "batch"),
        ({"title": "hotfix: restore loader"}, True, True, "hotfix"),
        ({"title": "[hotfix] Restore loader"}, True, True, "hotfix"),
        ({"title": "Add telemetry", "labels": [{"name": "bug"}]}, True, False, "batch"),
        ({"title": "Jogo trava no lobby"}, True, False, "batch"),
        ({"title": "feat: add error telemetry", "body": "fix: not the title"}, False, False, "batch"),
        ({"title": "Add prefix fixer"}, False, False, "batch"),
    ]
    ancestry_cases = [
        (["hotfix-1"], ["staging-1"], True),
        (["hotfix-1", "staging-1"], ["staging-1", "staging-2"], False),
        ([], ["staging-1"], True),
    ]
    failures = 0
    for item, bugfix, hotfix, channel in cases:
        actual = (is_bugfix(item), is_hotfix(item), release_channel(item))
        expected = (bugfix, hotfix, channel)
        ok = actual == expected
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {item['title']}: {actual}")
    for head, staging, expected in ancestry_cases:
        actual = hotfix_has_only_main_ancestors(head, staging)
        ok = actual == expected
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} ancestry head={head} staging={staging}: {actual}")
    return 0 if not failures else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    if "--ancestry" in sys.argv:
        payload = json.load(sys.stdin)
        print(json.dumps({
            "hotfix_main_only": hotfix_has_only_main_ancestors(
                payload.get("head_commits") or [], payload.get("staging_commits") or []
            )
        }))
        return 0
    item = json.load(sys.stdin)
    print(json.dumps({
        "bugfix": is_bugfix(item),
        "hotfix": is_hotfix(item),
        "release_channel": release_channel(item),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
