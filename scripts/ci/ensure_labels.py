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
    "needs-coderabbit-resolution": ("b60205", "PR não pode ser mergeada enquanto houver pendência do CodeRabbit"),
    "coderabbit-resolved": ("0e8a16", "Maintainer confirmou que os apontamentos do CodeRabbit foram resolvidos"),
    "bot-fixable": ("0e8a16", "Issue ou PR elegível para tentativa automatizada de correção"),
    "covered-by-pr": ("fbca04", "Issue já atacada por PR aberta"),
    "crash-auto": ("B60205", "crash de produção reportado por /api/jserror ou prod-watch"),
    "stale-backlog": ("c2e0c6", "Issue antiga ou desalinhada com o checkout atual; precisa revalidação"),
    "needs-repro": ("f9d0c4", "Issue precisa passos de reprodução mais concretos"),
}


def rotulos_validos(argv: list) -> list:
    return [label for label in argv if label in LABELS]


def selftest() -> int:
    # hermético: valida a tabela e o filtro sem chamar o gh.
    for nome, (cor, descricao) in LABELS.items():
        assert len(cor) == 6 and int(cor, 16) >= 0, (nome, cor)
        assert descricao.strip(), nome
    assert rotulos_validos(["target:main", "inventado"]) == ["target:main"]
    print("selftest ok")
    return 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    for label in rotulos_validos(sys.argv[1:]):
        color, description = LABELS[label]
        subprocess.run(
            ["gh", "label", "create", label, "--color", color, "--description", description, "--force"],
            check=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
