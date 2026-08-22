#!/usr/bin/env python3
import json
import sys


def decide(payload: dict) -> dict:
    comments = payload.get("comments", [])
    status_rollup = payload.get("statusCheckRollup", [])

    has_greptile_check = any(
        item.get("__typename") == "CheckRun" and item.get("name") == "Greptile Review"
        for item in status_rollup
    )
    has_greptile_comment = any(
        "greptile" in ((comment.get("author") or {}).get("login") or "").lower()
        or "greptile" in (comment.get("body") or "").lower()
        for comment in comments
    )

    precisa = bool(has_greptile_check or has_greptile_comment)
    return {
        "needs_resolution": precisa,
        "labels_add": ["needs-greptile-resolution"] if precisa else [],
        "labels_remove": ["greptile-resolved"] if precisa else [],
    }


def selftest() -> int:
    """O que este portão erra é caro nos dois sentidos: falso negativo deixa PR com
    revisão pendente virar automerge; falso positivo trava PR que ninguém revisou."""
    casos = [
        ("check do greptile exige resolução",
         {"statusCheckRollup": [{"__typename": "CheckRun", "name": "Greptile Review"}]}, True),
        ("comentário do bot exige resolução",
         {"comments": [{"author": {"login": "greptile-apps[bot]"}, "body": "achei isso"}]}, True),
        ("body citando greptile exige resolução",
         {"comments": [{"author": {"login": "alguem"}, "body": "o greptile apontou X"}]}, True),
        ("PR sem greptile não exige nada", {"comments": [], "statusCheckRollup": []}, False),
        ("outro check não confunde",
         {"statusCheckRollup": [{"__typename": "CheckRun", "name": "build"}]}, False),
        ("author nulo não explode",
         {"comments": [{"author": None, "body": "texto qualquer"}]}, False),
        ("payload vazio não explode", {}, False),
    ]
    erros = 0
    for nome, payload, esperado in casos:
        d = decide(payload)
        ok = d["needs_resolution"] == esperado and bool(d["labels_add"]) == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {d['needs_resolution']}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(decide(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
