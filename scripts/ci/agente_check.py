#!/usr/bin/env python3
"""Todo commit do PR diz quem o escreveu, no trailer `Agent:`.

O hook .githooks/commit-msg já recusa antes do commit nascer; este portão existe
para o caminho que o hook não cobre: clone sem `npm run setup`, `--no-verify`, e
commit feito pela interface do GitHub. Mesmo desenho do dco_check.py.

`--selftest` prova que a régua morde: entrada com trailer passa, sem trailer
reprova, e trailer vazio reprova (silêncio não é verde).
"""
import json
import re
import subprocess
import sys

AGENT_RE = re.compile(r"^Agent:[ \t]*\S", re.IGNORECASE | re.MULTILINE)


def faltando(commits: list[tuple[str, str]]) -> list[str]:
    return [sha for sha, body in commits if not AGENT_RE.search(body)]


def commits_do_intervalo(base: str, head: str) -> list[tuple[str, str]]:
    """Um `git show` por sha, em vez de um log com sentinela de texto.

    Sentinela no meio de log é acidente esperando acontecer: corpo de commit que
    termine na linha do separador parte o registro e desgruda o trailer do sha
    (greptile, PR #207). Sha vem de uma lista, e o corpo de cada um é pedido
    separado — não existe delimitador para colidir.
    """
    shas = subprocess.check_output(
        ["git", "log", "--format=%H", f"{base}..{head}"], text=True
    ).split()
    return [
        (sha, subprocess.check_output(["git", "show", "-s", "--format=%B", sha], text=True))
        for sha in shas
    ]


MEDIR_AWK = "scripts/medir-commit.awk"


def medir(numstat: str) -> tuple[int, int]:
    saida = subprocess.run(
        ["awk", "-f", MEDIR_AWK], input=numstat, capture_output=True, text=True, check=True
    ).stdout.split()
    return int(saida[0]), int(saida[1])


def selftest() -> int:
    trailer = [
        ("com trailer", [("abc", "fix: x\n\nAgent: Kimi Code\n")], []),
        ("sem trailer", [("def", "fix: x\n\nSigned-off-by: a <b>\n")], ["def"]),
        ("trailer vazio", [("fed", "fix: x\n\nAgent:\n")], ["fed"]),
        ("humano vale", [("cba", "fix: x\n\nAgent: humano\n")], []),
        # o corpo abaixo derrubava a versão com sentinela de texto
        ("corpo com ==END==", [("777", "fix: x\n\n==END==\n\nAgent: Codex\n")], []),
    ]
    medicao = [
        ("gerado não conta", "1\t0\tpublic/docs/x.html\n2\t3\tsrc/a.js\n", (1, 5)),
        ("só gerado zera", "9\t9\tCHANGELOG.md\n4\t0\tdocs/i18n/en/x.md\n", (0, 0)),
        ("binário conta arquivo, não linha", "-\t-\tpublic/img/a.png\n1\t1\tsrc/b.js\n", (2, 2)),
        ("caminho parecido não escapa", "5\t5\tpublic/docsx/y.js\n", (1, 10)),
    ]
    erros = 0
    for nome, commits, esperado in trailer:
        obtido = faltando(commits)
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} trailer/{nome}: {obtido}")
    for nome, numstat, esperado in medicao:
        obtido = medir(numstat)
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} teto/{nome}: {obtido} (esperado {esperado})")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    ausentes = faltando(commits_do_intervalo(payload["baseRefOid"], payload["headRefOid"]))
    print(json.dumps({"ok": not ausentes, "sem_agent": ausentes}))
    if ausentes:
        print(
            "Cada commit diz quem escreveu: acrescente o trailer 'Agent: <nome do agente ou humano>'.\n"
            "  git rebase --exec 'git commit --amend --no-edit --trailer \"Agent: <nome>\"' <base>",
            file=sys.stderr,
        )
    return 0 if not ausentes else 1


if __name__ == "__main__":
    raise SystemExit(main())
