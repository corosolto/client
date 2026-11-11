#!/usr/bin/env python3
import subprocess
import sys

LABELS = {
    "safe-automerge": ("1d76db", "Small and safe PR eligible for automatic merge"),
    "needs-staging": ("5319e7", "Change requires integrated validation in staging"),
    "needs-human-gameplay": ("d93f0b", "Change requires human gameplay/render/HUD review"),
    "needs-human-backend": ("b60205", "Change requires human backend/Supabase/anti-cheat review"),
    "target:main": ("0366d6", "PR targets the main branch"),
    "target:staging": ("0e8a16", "PR targets the staging integration branch"),
    "target:release": ("5319e7", "PR targets a release branch"),
    "needs-estragacodigo-resolution": ("b60205", "PR has an unresolved estraga-codigo finding"),
    "estragacodigo-resolved": ("0e8a16", "Maintainer confirmed that estraga-codigo findings are resolved"),
    "bot-fixable": ("0e8a16", "Issue or PR is eligible for an automated fix attempt"),
    "covered-by-pr": ("fbca04", "An open PR already covers this issue"),
    "crash-auto": ("B60205", "Production crash reported by /api/jserror or prod-watch"),
    "stale-backlog": ("c2e0c6", "Issue is stale or out of sync with the current checkout and needs revalidation"),
    "needs-repro": ("f9d0c4", "Issue needs concrete reproduction steps"),
    "preview-autorizado": ("0e8a16", "Maintainer reviewed the current SHA and authorized the fork preview on Vercel"),
    "pronto-pra-merge": ("0e8a16", "Required checks passed and the diff is eligible for automatic merge"),
    "bugfix": ("d93f0b", "Bug fix routed to the configured bugfix assignee"),
    "hotfix": ("b60205", "Urgent production fix; targets main for an immediate release"),
    "release": ("5319e7", "Merging this PR into main triggers the release train"),
    "release-batch": ("0e8a16", "Change waits for the next staging-to-main release batch"),
    "release-hotfix": ("b60205", "Hotfix channel; immediate release only when targeting main"),
    "needs-hotfix-review": ("b60205", "Hotfix branch contains staging commits or unverified ancestry; maintainer review required"),
}


def comandos(nomes: list[str]) -> list[list[str]]:
    """Os `gh label create` que ESTE pedido produz.

    Nome fora do dicionário some em silêncio, e foi assim que `preview-autorizado`
    passou meses sendo pedida por um workflow sem nunca ser criada — o job de preview
    de fork inteiro virou código morto atrás de um rótulo que ninguém podia aplicar.
    """
    out = []
    for label in nomes:
        if label not in LABELS:
            continue
        color, description = LABELS[label]
        out.append(["gh", "label", "create", label, "--color", color, "--description", description, "--force"])
    return out


def selftest() -> int:
    casos = [
        ("rótulo conhecido vira um comando", ["safe-automerge"], ["safe-automerge"]),
        ("desconhecido é ignorado", ["nao-existe"], []),
        ("conhecido junto de desconhecido não contamina", ["nao-existe", "bot-fixable"], ["bot-fixable"]),
        ("lista vazia não faz nada", [], []),
        ("preview-autorizado está registrado", ["preview-autorizado"], ["preview-autorizado"]),
        ("pendência do estragacodigo está registrada",
         ["needs-estragacodigo-resolution"], ["needs-estragacodigo-resolution"]),
        ("resolução do estragacodigo está registrada",
         ["estragacodigo-resolved"], ["estragacodigo-resolved"]),
        ("canais de release estão registrados",
         ["bugfix", "hotfix", "release", "release-batch", "release-hotfix", "needs-hotfix-review"],
         ["bugfix", "hotfix", "release", "release-batch", "release-hotfix", "needs-hotfix-review"]),
    ]
    erros = 0
    for nome, pedido, esperado in casos:
        obtido = [c[3] for c in comandos(pedido)]
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"{'ok ' if ok else 'FALHA'} {nome}: {obtido!r}")
    print("selftest verde" if not erros else f"{erros} caso(s) vermelho(s)")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    for comando in comandos(sys.argv[1:]):
        subprocess.run(comando, check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
