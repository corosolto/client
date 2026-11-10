#!/usr/bin/env python3
import subprocess
import sys

LABELS = {
    "safe-automerge": ("1d76db", "PR pequena e segura para automerge"),
    "needs-staging": ("5319e7", "Mudança precisa validação integrada em staging"),
    "needs-human-gameplay": ("d93f0b", "Mudança exige revisão humana de gameplay/render/HUD"),
    "needs-human-backend": ("b60205", "Mudança exige revisão humana de backend/Supabase/anti-cheat"),
    "target:main": ("0366d6", "PR apontando para a branch main"),
    "target:staging": ("0e8a16", "PR apontando para a branch staging"),
    "target:release": ("5319e7", "PR apontando para uma branch de release"),
    "needs-estragacodigo-resolution": ("b60205", "PR não pode ser mergeada enquanto houver pendência do estraga-codigo"),
    "estragacodigo-resolved": ("0e8a16", "Maintainer confirmou que os apontamentos do estraga-codigo foram resolvidos"),
    "bot-fixable": ("0e8a16", "Issue ou PR elegível para tentativa automatizada de correção"),
    "covered-by-pr": ("fbca04", "Issue já atacada por PR aberta"),
    "crash-auto": ("B60205", "crash de produção reportado por /api/jserror ou prod-watch"),
    "stale-backlog": ("c2e0c6", "Issue antiga ou desalinhada com o checkout atual; precisa revalidação"),
    "needs-repro": ("f9d0c4", "Issue precisa passos de reprodução mais concretos"),
    "preview-autorizado": ("0e8a16", "Mantenedor revisou o SHA atual e liberou preview do fork na Vercel"),
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
