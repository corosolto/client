#!/usr/bin/env python3
import json
import sys

from crash_dedupe import find_duplicate
from issue_review import review_issue


def sweep(payload: dict) -> dict:
    """Varre issues abertas e decide ação por issue: label, comentário ou nada.

    Só abre fio (should_comment) quando há PR cobrindo ou duplicata — label
    sozinha não comenta, senão a varredura vira spam semanal.
    """
    prs = payload.get("prs", [])
    issues = payload.get("issues", [])
    actions = []

    for issue in issues:
        review = review_issue({"issue": issue, "prs": prs})
        labels_existing = {label["name"] for label in issue.get("labels", [])}
        labels_add = sorted(set(review.get("labels_add", [])) - labels_existing)
        covered = review.get("covered_pr")
        duplicate = None
        if "crash-auto" in labels_existing:
            duplicate = find_duplicate(issue, issues)

        if labels_add or covered or duplicate:
            comment = review["comment"]
            if duplicate:
                comment = "\n".join(
                    [
                        comment,
                        "",
                        "> [!TIP]",
                        "> **Possível duplicata detectada na varredura.**",
                        "> ",
                        f"> - candidata: **#{duplicate['number']}** — {duplicate['title']}",
                        f"> - similaridade: **{duplicate['score']}**",
                        f"> - comparar: {duplicate['url']}",
                    ]
                )
            actions.append(
                {
                    "issue_number": issue["number"],
                    "labels_add": labels_add,
                    "comment": comment,
                    "should_comment": bool(covered or duplicate),
                }
            )

    return {"actions": actions}


def selftest() -> int:
    crash_a = {"number": 1, "title": "crash em produção: TypeError x",
               "url": "u1", "author": None, "labels": [{"name": "crash-auto"}],
               "body": "b" * 40, "state": "open"}
    crash_b = {"number": 2, "title": "crash em produção: TypeError x",
               "url": "u2", "author": None, "labels": [{"name": "crash-auto"}],
               "body": "b" * 40, "state": "open"}
    coberta = {"number": 3, "title": "bug do ferro velho", "url": "u3",
               "author": {"login": "ze"}, "labels": [{"name": "documentation"}],
               "body": "c" * 40, "state": "open"}
    muda = {"number": 4, "title": "issue calada", "url": "u4",
            "author": {"login": "ze"}, "labels": [{"name": "graficos"}],
            "body": "d" * 60, "state": "open"}
    prs = [{"number": 9, "title": "fix ferro velho", "url": "u9", "body": "fixes #3"}]
    out = sweep({"prs": prs, "issues": [crash_a, crash_b, coberta, muda]})
    por_issue = {a["issue_number"]: a for a in out["actions"]}
    casos = [
        ("issue coberta gera ação", 3 in por_issue),
        ("issue coberta comenta (PR existe)", por_issue.get(3, {}).get("should_comment") is True),
        ("issue sensível sem PR não gera ação", 4 not in por_issue),
        ("crash com gêmeo detecta duplicata", "> [!TIP]" in por_issue.get(1, {}).get("comment", "") or "> [!TIP]" in por_issue.get(2, {}).get("comment", "")),
        ("comentário reusa o formato da review", "csbrasil-bot issue review" in por_issue.get(3, {}).get("comment", "")),
    ]
    erros = 0
    for nome, ok in casos:
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}")
        erros += 0 if ok else 1
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(sweep(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
