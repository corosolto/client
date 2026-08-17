#!/usr/bin/env python3
"""Distribuição de tamanho dos commits da main — a procedência do teto do commit-msg.

Lê `git log --format='%H%x00%s' --numstat` no stdin. Ignora merge, `chore(release)`
e arquivo gerado (a mesma lista do `scripts/medir-commit.awk`). Existe para que o
número do teto seja reproduzível em vez de asserido: `CONTRIBUTING.md`, seção
"Commit grande pede motivo".

    git log --no-merges -400 --format='%H%x00%s' --numstat | python3 scripts/medir-historico.py
"""
import re
import sys

GERADOS = re.compile(
    r"^(public/docs/|graphify-out/|docs/i18n/|package-lock\.json|CHANGELOG\.md"
    r"|STATUS\.md|tools/eval/ARCH\.md|public/js/version\.js)"
)


def main() -> int:
    commits, atual = [], None
    for linha in sys.stdin:
        linha = linha.rstrip("\n")
        if "\x00" in linha:
            if atual:
                commits.append(atual)
            atual = {"assunto": linha.split("\x00", 1)[1], "arquivos": 0, "linhas": 0}
        elif linha.strip() and atual:
            partes = linha.split("\t")
            if len(partes) != 3 or GERADOS.match(partes[2]) or partes[0] == "-":
                continue
            atual["arquivos"] += 1
            atual["linhas"] += int(partes[0]) + int(partes[1])
    if atual:
        commits.append(atual)

    reais = [c for c in commits if not c["assunto"].startswith("chore(release)") and c["arquivos"]]
    if not reais:
        print("nenhum commit medível na entrada", file=sys.stderr)
        return 1
    arquivos = sorted(c["arquivos"] for c in reais)
    linhas = sorted(c["linhas"] for c in reais)

    def pct(v, p):
        return v[min(len(v) - 1, int(len(v) * p / 100))]

    print(f"{len(reais)} commits não-release, sem arquivo gerado")
    for p in (50, 75, 90, 95, 99):
        print(f"  p{p}: {pct(arquivos, p):3d} arquivos, {pct(linhas, p):5d} linhas")
    print(f"  máx: {arquivos[-1]} arquivos, {linhas[-1]} linhas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
