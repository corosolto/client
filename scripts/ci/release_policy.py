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
    if is_hotfix(item) or labels.intersection({"bug", "bugfix", "crash-auto"}):
        return True
    title = item.get("title") or ""
    if re.match(r"^\s*(?:feat|feature|docs|chore|refactor|perf|style|build|ci|test)(?:\([^)]*\))?\s*:", title, re.IGNORECASE):
        return False
    return bool(BUGFIX_TITLE.search(title))


def release_channel(item: dict) -> str:
    return "hotfix" if is_hotfix(item) else "batch"


def hotfix_has_only_main_ancestors(
    head_commits: list[str], staging_commits: list[str], main_is_ancestor: bool = False
) -> bool:
    return bool(head_commits) and main_is_ancestor and set(head_commits).isdisjoint(staging_commits)


def ancestry_result(payload: dict) -> dict:
    for field in ("head_commits", "staging_commits"):
        if field not in payload or not isinstance(payload[field], list):
            raise ValueError(f"{field} must be an explicit commit list")
        if any(not isinstance(sha, str) or not re.fullmatch(r"[0-9a-f]{40}", sha) for sha in payload[field]):
            raise ValueError(f"{field} contains an invalid commit SHA")
    if not isinstance(payload.get("main_is_ancestor"), bool):
        raise ValueError("main_is_ancestor must be an explicit boolean")
    return {
        "hotfix_main_only": hotfix_has_only_main_ancestors(
            payload["head_commits"], payload["staging_commits"], payload["main_is_ancestor"]
        )
    }


def selftest() -> int:
    cases = [
        ({"title": "fix: repair reconnect"}, True, False, "batch"),
        ({"title": "hotfix: restore loader"}, True, True, "hotfix"),
        ({"title": "[hotfix] Restore loader"}, True, True, "hotfix"),
        ({"title": "Add telemetry", "labels": [{"name": "bug"}]}, True, False, "batch"),
        ({"title": "Jogo trava no lobby"}, True, False, "batch"),
        ({"title": "feat: add error telemetry", "body": "fix: not the title"}, False, False, "batch"),
        ({"title": "feat: add crash telemetry"}, False, False, "batch"),
        ({"title": "feat: add crash telemetry", "labels": [{"name": "bug"}]}, True, False, "batch"),
        ({"title": "Add prefix fixer"}, False, False, "batch"),
    ]
    ancestry_cases = [
        (["hotfix-1"], ["staging-1"], True, True),
        (["hotfix-1", "staging-1"], ["staging-1", "staging-2"], True, False),
        (["hotfix-1"], ["staging-1"], False, False),
        ([], ["staging-1"], True, False),
        (["hotfix-1"], [], True, True),
    ]
    failures = 0
    for item, bugfix, hotfix, channel in cases:
        actual = (is_bugfix(item), is_hotfix(item), release_channel(item))
        expected = (bugfix, hotfix, channel)
        ok = actual == expected
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {item['title']}: {actual}")
    for head, staging, main_is_ancestor, expected in ancestry_cases:
        actual = hotfix_has_only_main_ancestors(head, staging, main_is_ancestor)
        ok = actual == expected
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} ancestry head={head} staging={staging} main={main_is_ancestor}: {actual}")
    valid_head = "a" * 40
    valid_staging = "b" * 40
    if ancestry_result({"head_commits": [valid_head], "staging_commits": [valid_staging], "main_is_ancestor": True})["hotfix_main_only"]:
        print("  ok   ancestry explícita sem interseção")
    else:
        failures += 1
        print("  FALHOU ancestry explícita sem interseção")
    if ancestry_result({"head_commits": [valid_head], "staging_commits": [], "main_is_ancestor": False})["hotfix_main_only"]:
        failures += 1
        print("  FALHOU branch sem main como ancestor foi aceita")
    else:
        print("  ok   branch sem main como ancestor é rejeitada")
    if ancestry_result({"head_commits": [], "staging_commits": [], "main_is_ancestor": True})["hotfix_main_only"]:
        failures += 1
        print("  FALHOU ancestry vazia não pode provar main-only")
    else:
        print("  ok   ancestry vazia não prova main-only")
    for invalid in (
        {"staging_commits": []},
        {"head_commits": [valid_head]},
        {"head_commits": "not-a-list", "staging_commits": []},
        {"head_commits": ["not-a-sha"], "staging_commits": [], "main_is_ancestor": True},
        {"head_commits": [valid_head], "staging_commits": [], "main_is_ancestor": "yes"},
    ):
        try:
            ancestry_result(invalid)
        except ValueError:
            print(f"  ok   payload inválido rejeitado: {invalid}")
        else:
            failures += 1
            print(f"  FALHOU payload inválido aceito: {invalid}")
    return 0 if not failures else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    if "--ancestry" in sys.argv:
        payload = json.load(sys.stdin)
        print(json.dumps(ancestry_result(payload)))
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
