#!/usr/bin/env python3
import json
import os
import sys

from release_policy import is_bugfix, is_hotfix


def triage(issue: dict, bugfix_assignee: str = "nunreasonable") -> dict:
    title = (issue.get("title") or "").strip().lower()
    labels_add: list[str] = []
    if title.startswith("crash em produção:"):
        labels_add.append("crash-auto")
    bugfix = is_bugfix(issue)
    if bugfix:
        labels_add.append("bugfix")
    if is_hotfix(issue):
        labels_add.append("hotfix")
    assignees = {(a.get("login") or "").strip() for a in issue.get("assignees") or []}
    add_assignee = bugfix_assignee if bugfix and bugfix_assignee not in assignees else None
    return {"labels_add": sorted(set(labels_add)), "add_assignee": add_assignee}


def selftest() -> int:
    casos = [
        ({"title": "Fix lobby reconnect", "labels": [], "assignees": []},
         ["bugfix"], "nunreasonable"),
        ({"title": "hotfix: production loader is down", "labels": [], "assignees": []},
         ["bugfix", "hotfix"], "nunreasonable"),
        ({"title": "Jogo trava ao abrir o lobby", "labels": [], "assignees": []},
         ["bugfix"], "nunreasonable"),
        ({"title": "crash em produção: TypeError", "labels": [], "assignees": []},
         ["bugfix", "crash-auto"], "nunreasonable"),
        ({"title": "Add lobby filters", "labels": [], "assignees": []}, [], None),
        ({"title": "Fix lobby reconnect", "labels": [], "assignees": [{"login": "nunreasonable"}]},
         ["bugfix"], None),
    ]
    erros = 0
    for issue, labels, assignee in casos:
        saida = triage(issue, "nunreasonable")
        ok = saida["labels_add"] == labels and saida["add_assignee"] == assignee
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {issue['title']}: {saida}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(triage(json.load(sys.stdin), os.environ.get("BUGFIX_ASSIGNEE", "nunreasonable"))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
