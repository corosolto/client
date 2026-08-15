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


def decide(pr: dict) -> dict:
    labels = {l["name"] for l in pr.get("labels", [])}
    files = [f.get("path", "") for f in pr.get("files", [])]
    touches_workflows = any(path.startswith(".github/workflows/") for path in files)
    coderabbit_blocked = "needs-coderabbit-resolution" in labels and "coderabbit-resolved" not in labels
    eligible = (
        not pr.get("isDraft", False)
        and "safe-automerge" in labels
        and not touches_workflows
        and not coderabbit_blocked
        and pr.get("reviewDecision") != "CHANGES_REQUESTED"
        and pr.get("mergeStateStatus") in {"CLEAN", "HAS_HOOKS"}
        and check_rollup_ok(pr.get("statusCheckRollup", []))
    )
    return {
        "eligible": eligible,
        "coderabbit_blocked": coderabbit_blocked,
        "touches_workflows": touches_workflows,
    }


def selftest() -> int:
    """Fixtures do que NUNCA pode virar merge automático.

    Este script decide merge sem humano no caminho. Nasceu sem teste, e um `not`
    trocado aqui mescla PR vermelho na main - o defeito mais caro que este
    arquivo consegue produzir. Cada caso abaixo é uma condição de bloqueio.
    """
    base = {
        "isDraft": False,
        "labels": [{"name": "safe-automerge"}],
        "files": [{"path": "src/pages/index.astro"}],
        "reviewDecision": "APPROVED",
        "mergeStateStatus": "CLEAN",
        "statusCheckRollup": [{"__typename": "CheckRun", "conclusion": "SUCCESS"}],
    }

    def com(**kw):
        pr = dict(base)
        pr.update(kw)
        return pr

    casos = [
        ("caminho feliz mescla", base, True),
        ("draft não mescla", com(isDraft=True), False),
        ("sem o label safe-automerge não mescla", com(labels=[]), False),
        ("PR que toca workflow não mescla", com(files=[{"path": ".github/workflows/ci.yml"}]), False),
        ("coderabbit pendente bloqueia",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-coderabbit-resolution"}]), False),
        ("coderabbit resolvido libera",
         com(labels=[{"name": "safe-automerge"}, {"name": "needs-coderabbit-resolution"},
                     {"name": "coderabbit-resolved"}]), True),
        ("mudança pedida não mescla", com(reviewDecision="CHANGES_REQUESTED"), False),
        ("conflito não mescla", com(mergeStateStatus="DIRTY"), False),
        ("check vermelho não mescla",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": "FAILURE"}]), False),
        ("check pendente não mescla",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": None}]), False),
        ("status legado vermelho não mescla",
         com(statusCheckRollup=[{"__typename": "StatusContext", "state": "FAILURE"}]), False),
        ("skipped e neutral não bloqueiam",
         com(statusCheckRollup=[{"__typename": "CheckRun", "conclusion": "SKIPPED"},
                                {"__typename": "CheckRun", "conclusion": "NEUTRAL"}]), True),
    ]
    erros = 0
    for nome, pr, esperado in casos:
        obtido = decide(pr)["eligible"]
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: eligible={obtido} (esperado {esperado})")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(decide(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
