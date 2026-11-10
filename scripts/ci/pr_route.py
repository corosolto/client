#!/usr/bin/env python3
import json
import re
import sys

try:
    from .release_policy import is_bugfix, is_hotfix, label_names
except ImportError:
    from release_policy import is_bugfix, is_hotfix, label_names


def normalize_branch_name(value: str) -> str:
    return re.sub(r"[^a-z0-9._/-]+", "-", value.strip().lower())


def target_label(base_branch: str) -> str:
    base = normalize_branch_name(base_branch)
    if base == "main":
        return "target:main"
    if base == "staging" or base.startswith("staging/"):
        return "target:staging"
    if base.startswith("release/") or base.startswith("release-"):
        return "target:release"
    return "target:main"


def route(payload: dict) -> dict:
    pr = payload["pr"]
    desired_base = normalize_branch_name(payload.get("desired_base") or "")

    author = ((pr.get("author") or {}).get("login") or "").strip()
    author_is_bot = bool((pr.get("author") or {}).get("is_bot"))
    current_base = normalize_branch_name(pr.get("baseRefName") or "main")
    assignees = {(a.get("login") or "").strip() for a in pr.get("assignees") or []}

    retarget_to = None
    if (not is_hotfix(pr) and "release" not in label_names(pr)
            and desired_base and desired_base != current_base and current_base == "main"):
        retarget_to = desired_base

    effective_base = retarget_to or current_base
    responsible = (payload.get("bugfix_assignee") or "nunreasonable") if is_bugfix(pr) else author
    add_assignee = responsible if responsible and (is_bugfix(pr) or not author_is_bot) and responsible not in assignees else None

    return {
        "retarget_to": retarget_to,
        "add_assignee": add_assignee,
        "target_label": target_label(effective_base),
        "effective_base": effective_base,
    }


def selftest() -> int:
    base = {
        "title": "feat: add lobby filter",
        "baseRefName": "main",
        "author": {"login": "author", "is_bot": False},
        "assignees": [],
    }
    casos = [
        ("feature segue para staging e autor", base, "staging", "author"),
        ("bugfix segue para nunreasonable", {**base, "title": "fix: repair reconnect"},
         "staging", "nunreasonable"),
        ("hotfix na main não é desviado para staging", {**base, "title": "hotfix: restore loader"},
         None, "nunreasonable"),
        ("hotfix na staging não é promovido sem medir a branch",
         {**base, "title": "hotfix: restore loader", "baseRefName": "staging"},
         None, "nunreasonable"),
        ("release explícita na main não é desviada",
         {**base, "title": "release: approved batch", "labels": [{"name": "release"}]},
         None, "author"),
        ("assignee existente não é duplicado",
         {**base, "title": "fix: repair reconnect", "assignees": [{"login": "nunreasonable"}]},
         "staging", None),
    ]
    erros = 0
    for nome, pr, base_esperada, assignee in casos:
        saida = route({"pr": pr, "desired_base": "staging", "bugfix_assignee": "nunreasonable"})
        ok = saida["retarget_to"] == base_esperada and saida["add_assignee"] == assignee
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {saida}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    print(json.dumps(route(payload)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
