#!/usr/bin/env python3
import json
import subprocess
import sys


def sem_merges(registros: list[tuple[str, int, str]]) -> list[tuple[str, str]]:
    """Tira do intervalo o commit de merge, e o motivo é o botão do GitHub.

    Merge não contribui linha nenhuma: tudo que ele carrega veio de commits que a
    própria régua já cobrou um a um. E o "Merge pull request #N" que o botão do
    GitHub escreve NÃO aceita trailer — não existe ação de quem abre o PR que
    conserte aquele commit. Prova de que a regra antiga media topologia, e não
    autoria: a própria `main` deste repo tem 19 merges sem sign-off nos últimos 200
    commits, 31 nos últimos 200 merges (medido em 24/09/2026). Cobrando merge, o
    portão só acendia em PR empilhado, onde um PR irmão já mergeado aparece dentro
    do intervalo — e o único conserto seria reescrever história publicada e forçar
    push numa branch que já é base de outro PR. Mesma isenção que o
    .githooks/commit-msg já dá a merge/rebase/cherry-pick/revert no teto de tamanho.

    Só 2+ pais saem. Commit comum (1 pai) e raiz (0 pais) continuam sendo cobrados.
    """
    return [(sha, corpo) for sha, pais, corpo in registros if pais < 2]


def faltando(commits: list[tuple[str, str]]) -> list[str]:
    return [sha for sha, body in commits if "Signed-off-by:" not in body]


def commits_do_intervalo(base: str, head: str) -> list[tuple[str, str]]:
    """Um `git show` por sha, sem sentinela de texto.

    A versão anterior cortava o log em `==END==`, e corpo de commit que contenha
    essa linha partia o registro e desgrudava o trailer do sha (mesmo defeito
    achado no agente_check.py em 12/08). Sha vem de lista; corpo vem separado.

    O número de pais sai do MESMO `git log` que lista os shas (`%P`), não de uma
    segunda passada: duas leituras da mesma coisa é o instrumento discordando de si.
    """
    linhas = subprocess.check_output(
        ["git", "log", "--format=%H %P", f"{base}..{head}"], text=True
    ).splitlines()
    registros = []
    for linha in linhas:
        campos = linha.split()
        if not campos:
            continue
        sha = campos[0]
        corpo = subprocess.check_output(["git", "show", "-s", "--format=%B", sha], text=True)
        registros.append((sha, len(campos) - 1, corpo))
    return sem_merges(registros)


def selftest() -> int:
    casos = [
        ("com sign-off", [("a", "fix: x\n\nSigned-off-by: r <r@e>\n")], []),
        ("sem sign-off", [("b", "fix: x\n")], ["b"]),
        ("corpo com ==END== não parte o registro",
         [("c", "fix: x\n\n==END==\n\nSigned-off-by: r <r@e>\n")], []),
        ("um sem, outro com", [("d", "fix\n"), ("e", "fix\n\nSigned-off-by: r <r@e>\n")], ["d"]),
    ]
    # A isenção tem que ser ESTREITA: se vazar para commit comum, o portão vira
    # decoração. Por isso o par 'merge sem sign-off passa' × 'commit sem sign-off
    # reprova' é medido junto, no mesmo intervalo.
    merges = [
        ("merge do botão sai do intervalo", [("m", 2, "Merge pull request #562 from o/b\n")], []),
        ("polvo (3 pais) também sai", [("p", 3, "Merge branches a, b e c\n")], []),
        ("commit comum (1 pai) continua cobrado", [("n", 1, "fix: x\n")], [("n", "fix: x\n")]),
        ("raiz (0 pais) continua cobrada", [("r", 0, "chore: raiz\n")], [("r", "chore: raiz\n")]),
        ("merge some e o vizinho sem sign-off fica",
         [("m2", 2, "Merge pull request #566\n"), ("n2", 1, "fix: y\n")], [("n2", "fix: y\n")]),
    ]
    erros = 0
    for nome, commits, esperado in casos:
        obtido = faltando(commits)
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}: {obtido}")
    for nome, registros, esperado in merges:
        obtido = sem_merges(registros)
        ok = obtido == esperado
        erros += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'FALHOU'} merge/{nome}: {obtido}")
    # De ponta a ponta: o merge sem sign-off atravessa o portão INTEIRO e o commit
    # comum sem sign-off do mesmo intervalo continua reprovando.
    intervalo = [("m3", 2, "Merge pull request #570\n"), ("n3", 1, "fix: z\n"),
                 ("s3", 1, "fix: w\n\nSigned-off-by: r <r@e>\n")]
    obtido = faltando(sem_merges(intervalo))
    ok = obtido == ["n3"]
    erros += 0 if ok else 1
    print(f"  {'ok  ' if ok else 'FALHOU'} merge/portão inteiro: {obtido}")
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
