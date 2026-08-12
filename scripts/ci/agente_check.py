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


def faltando(log: str) -> list[str]:
    ausentes = []
    for chunk in log.split("==END==\n"):
        if not chunk.strip():
            continue
        parts = chunk.split("\x00", 2)
        if len(parts) < 2:
            continue
        sha, body = parts[0].strip(), parts[1]
        if not AGENT_RE.search(body):
            ausentes.append(sha)
    return ausentes


def selftest() -> int:
    casos = [
        ("com trailer", "abc\x00fix: x\n\nAgent: Kimi Code\n\x00==END==\n", []),
        ("sem trailer", "def\x00fix: x\n\nSigned-off-by: a <b>\n\x00==END==\n", ["def"]),
        ("trailer vazio", "fed\x00fix: x\n\nAgent:\n\x00==END==\n", ["fed"]),
        ("humano vale", "cba\x00fix: x\n\nAgent: humano\n\x00==END==\n", []),
    ]
    erros = 0
    for nome, log, esperado in casos:
        obtido = faltando(log)
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {obtido}")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    payload = json.load(sys.stdin)
    log = subprocess.check_output(
        ["git", "log", "--format=%H%x00%B%x00==END==", f"{payload['baseRefOid']}..{payload['headRefOid']}"],
        text=True,
    )
    ausentes = faltando(log)
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
