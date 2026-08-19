#!/usr/bin/env python3
import json
import subprocess
import sys


def faltando(commits: list[tuple[str, str]]) -> list[str]:
    return [sha for sha, body in commits if "Signed-off-by:" not in body]


def commits_do_intervalo(base: str, head: str) -> list[tuple[str, str]]:
    """Um `git show` por sha, sem sentinela de texto.

    A versão anterior cortava o log em `==END==`, e corpo de commit que contenha
    essa linha partia o registro e desgrudava o trailer do sha (mesmo defeito
    achado no agente_check.py em 12/08). Sha vem de lista; corpo vem separado.
    """
    shas = subprocess.check_output(["git", "log", "--format=%H", f"{base}..{head}"], text=True).split()
    return [(sha, subprocess.check_output(["git", "show", "-s", "--format=%B", sha], text=True)) for sha in shas]


def selftest() -> int:
    casos = [
        ("com sign-off", [("a", "fix: x\n\nSigned-off-by: r <r@e>\n")], []),
        ("sem sign-off", [("b", "fix: x\n")], ["b"]),
        ("corpo com ==END== não parte o registro",
         [("c", "fix: x\n\n==END==\n\nSigned-off-by: r <r@e>\n")], []),
        ("um sem, outro com", [("d", "fix\n"), ("e", "fix\n\nSigned-off-by: r <r@e>\n")], ["d"]),
    ]
    erros = 0
    for nome, commits, esperado in casos:
        obtido = faltando(commits)
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {obtido}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    missing = faltando(commits_do_intervalo(payload["baseRefOid"], payload["headRefOid"]))
    print(json.dumps({"ok": not missing, "missing": missing}))
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())
