#!/usr/bin/env python3
"""Conta as conversas de revisão abertas de um PR (insumo do `politica-merge`).

`gh pr view --json` não expõe `reviewThreads`; só o GraphQL expõe. A contagem entra
no PR avaliado como `unresolvedReviewThreads`. Falha de leitura sobe exceção: o
`check_automerge.py` trata a chave ausente como desconhecida, e desconhecido não arma
auto-merge nem pinta o status de verde.

Uso:
  pr_threads.py --selftest
  pr_threads.py --inject /tmp/automerge.json <número-do-PR>
"""
import json
import os
import subprocess
import sys

QUERY = """
query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100, after: $cursor) {
        nodes { isResolved }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
"""


def count_unresolved(pages: list[dict]) -> int:
    total = 0
    for page in pages:
        threads = page["data"]["repository"]["pullRequest"]["reviewThreads"]
        total += sum(1 for node in threads["nodes"] if node["isResolved"] is not True)
    return total


def fetch_pages(repo: str, number: int, run=subprocess.run) -> list[dict]:
    owner, name = repo.split("/", 1)
    pages, cursor = [], None
    while True:
        args = [
            "gh", "api", "graphql", "-f", f"query={QUERY}",
            "-f", f"owner={owner}", "-f", f"name={name}", "-F", f"number={number}",
        ]
        if cursor:
            args += ["-f", f"cursor={cursor}"]
        page = json.loads(run(args, capture_output=True, text=True, check=True).stdout)
        pages.append(page)
        info = page["data"]["repository"]["pullRequest"]["reviewThreads"]["pageInfo"]
        if not info["hasNextPage"]:
            return pages
        cursor = info["endCursor"]


def unresolved_review_threads(repo: str, number: int) -> int:
    return count_unresolved(fetch_pages(repo, number))


def selftest() -> int:
    def page(states, has_next=False, cursor=None):
        return {"data": {"repository": {"pullRequest": {"reviewThreads": {
            "nodes": [{"isResolved": state} for state in states],
            "pageInfo": {"hasNextPage": has_next, "endCursor": cursor},
        }}}}}

    assert count_unresolved([page([])]) == 0
    assert count_unresolved([page([True, True])]) == 0
    assert count_unresolved([page([True, False]), page([False])]) == 2
    # Nó sem a chave conta como aberto: dado que não deu para ler não libera merge.
    assert count_unresolved([{"data": {"repository": {"pullRequest": {"reviewThreads": {
        "nodes": [{"isResolved": None}], "pageInfo": {"hasNextPage": False}}}}}}]) == 1

    respostas = [page([False], True, "c1"), page([True, False])]
    chamadas = []

    class Resultado:
        def __init__(self, stdout):
            self.stdout = stdout

    def falso_run(args, **_):
        chamadas.append(args)
        return Resultado(json.dumps(respostas[len(chamadas) - 1]))

    assert count_unresolved(fetch_pages("corosolto/client", 7, run=falso_run)) == 2
    assert "cursor=c1" in chamadas[1] and all("number=7" in c for c in chamadas)
    print("PR-THREADS selftest ok: paginação completa, aberto/ilegível conta como aberto")
    return 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    if len(sys.argv) != 4 or sys.argv[1] != "--inject":
        raise SystemExit("usage: pr_threads.py --inject <pr.json> <pr-number>")
    path, number = sys.argv[2], int(sys.argv[3])
    pr = json.load(open(path))
    pr["unresolvedReviewThreads"] = unresolved_review_threads(os.environ["GITHUB_REPOSITORY"], number)
    open(path, "w").write(json.dumps(pr))
    print(f"PR #{number}: {pr['unresolvedReviewThreads']} unresolved review thread(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
