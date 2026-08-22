#!/usr/bin/env python3
"""A trava do autofix: decide se o que o bot mexeu pode virar commit.

O bot só pode tocar em ARQUIVO GERADO — o que uma ferramenta do repositório
reescreve inteiro a partir do código. Se o conserto encostar em qualquer outro
caminho, o run aborta e comenta em vez de commitar.

A regra não é conveniência: sem ela, o primeiro conserto errado reescreve o mapa
de um colaborador e ninguém repara. Com ela, o pior caso do bot é regenerar uma
doc que já era derivada.

Uso:  git status --porcelain | python3 scripts/ci/autofix_allowlist.py
      python3 scripts/ci/autofix_allowlist.py --selftest
"""
import sys

# Caminhos que uma ferramenta REGERA por inteiro. Crescer esta lista é decisão de
# dono: cada entrada nova é um arquivo que o bot passa a poder sobrescrever sozinho.
PERMITIDOS = (
    "ARCH.generated.md",
    "README.md",
    "STATUS.md",
    "SCRIPTS.md",
    "docs/",
    "tools/eval/ARCH.md",
)

# Caminhos que NUNCA entram, mesmo que um prefixo permitido pareça cobri-los. O
# `.github/` fica de fora porque um bot que edita o próprio workflow que o governa
# consegue ampliar a própria permissão em um commit.
PROIBIDOS = (
    ".github/",
    "scripts/",
    "supabase/",
    "package.json",
    "package-lock.json",
    "vercel.json",
)


def permitido(caminho: str) -> bool:
    if any(caminho.startswith(p) for p in PROIBIDOS):
        return False
    return any(caminho == p or caminho.startswith(p) for p in PERMITIDOS)


def separa(caminhos: list[str]) -> tuple[list[str], list[str]]:
    ok = [c for c in caminhos if permitido(c)]
    fora = [c for c in caminhos if not permitido(c)]
    return ok, fora


def caminhos_do_porcelain(texto: str) -> list[str]:
    """`git status --porcelain` -> lista de caminhos.

    Renomeio vem como `R  velho -> novo`; o que importa é o destino, senão um
    rename para fora da lista passaria como se fosse o arquivo de origem.
    """
    saida = []
    for linha in texto.splitlines():
        if len(linha) < 4:
            continue
        caminho = linha[3:].strip()
        if " -> " in caminho:
            caminho = caminho.split(" -> ", 1)[1]
        saida.append(caminho.strip('"'))
    return saida


def selftest() -> int:
    casos = [
        ("doc gerada passa", ["ARCH.generated.md"], True),
        ("pasta docs passa", ["docs/docs/comecando.md"], True),
        ("código do jogo NÃO passa", ["public/js/main.js"], False),
        ("mapa de colaborador NÃO passa", ["public/js/map_havan.js"], False),
        ("workflow NÃO passa", [".github/workflows/ci.yml"], False),
        ("script de CI NÃO passa", ["scripts/ci/pr_classify.py"], False),
        ("package.json NÃO passa", ["package.json"], False),
        ("uma proibida contamina o lote", ["STATUS.md", "public/js/game.js"], False),
        ("nada mexido é lote vazio", [], True),
    ]
    erros = 0
    for nome, caminhos, esperado in casos:
        _, fora = separa(caminhos)
        obtido = not fora
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"{'ok ' if ok else 'FALHA'} {nome}: fora={fora!r}")

    porcelain = ' M ARCH.generated.md\nR  docs/a.md -> public/js/game.js\n?? novo.txt\n'
    lidos = caminhos_do_porcelain(porcelain)
    ok = lidos == ["ARCH.generated.md", "public/js/game.js", "novo.txt"]
    erros += 0 if ok else 1
    print(f"{'ok ' if ok else 'FALHA'} renomeio é julgado pelo DESTINO: {lidos!r}")

    print("selftest verde" if not erros else f"{erros} caso(s) vermelho(s)")
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    caminhos = caminhos_do_porcelain(sys.stdin.read())
    ok, fora = separa(caminhos)
    if fora:
        print("BLOQUEADO: o conserto encostou em arquivo que o bot não pode reescrever:")
        for c in fora:
            print(f"  - {c}")
        return 1
    for c in ok:
        print(c)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
