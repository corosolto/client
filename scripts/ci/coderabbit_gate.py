#!/usr/bin/env python3
import json
import sys


def decide(payload: dict) -> dict:
    comments = payload.get("comments", [])
    status_rollup = payload.get("statusCheckRollup", [])

    has_coderabbit_check = any(
        item.get("__typename") == "CheckRun" and "coderabbit" in (item.get("name") or "").lower()
        for item in status_rollup
    )
    has_coderabbit_comment = any(
        "coderabbit" in ((comment.get("author") or {}).get("login") or "").lower()
        for comment in comments
    )

    precisa = bool(has_coderabbit_check or has_coderabbit_comment)
    return {
        "needs_resolution": precisa,
        "labels_add": ["needs-coderabbit-resolution"] if precisa else [],
        "labels_remove": ["coderabbit-resolved"] if precisa else [],
    }


def selftest() -> int:
    """O que este portão erra é caro nos dois sentidos: falso negativo deixa PR com
    revisão pendente virar automerge; falso positivo trava PR que ninguém revisou.
    Fixtures portadas do greptile_gate.py, que ganhou as mesmas no PR #209."""
    casos = [
        ("check do coderabbit exige resolução",
         {"statusCheckRollup": [{"__typename": "CheckRun", "name": "CodeRabbit"}]}, True),
        ("comentário do bot exige resolução",
         {"comments": [{"author": {"login": "coderabbitai[bot]"}, "body": "achei isso"}]}, True),
        ("check legado do greptile não confunde",
         {"statusCheckRollup": [{"__typename": "CheckRun", "name": "Greptile Review"}]}, False),
        ("PR sem coderabbit não exige nada", {"comments": [], "statusCheckRollup": []}, False),
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
