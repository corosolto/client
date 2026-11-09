#!/usr/bin/env python3
"""Cria ou atualiza o comentário único do preview Cloudflare."""
from __future__ import annotations

import json
import os
import subprocess
import sys

MARKER = "<!-- cf-preview -->"


def gh(*args: str, input_data: str | None = None) -> str:
    comando = ["gh", *args]
    return subprocess.check_output(comando, text=True, input=input_data)


def corpo(url: str, head_sha: str) -> str:
    return f"🟠 **preview Cloudflare** → {url}\n\n{MARKER}\n<!-- sha: {head_sha} -->\n"


def escolher(comentarios: list[dict]) -> tuple[dict | None, list[dict]]:
    """Fica o primeiro comentário com o marcador; os demais são duplicata a apagar."""
    encontrados = [c for c in comentarios if MARKER in (c.get("body") or "")]
    return (encontrados[0] if encontrados else None), encontrados[1:]


def atualizar(repo: str, pr: str, url: str, head_sha: str) -> None:
    comentarios = json.loads(gh("api", f"repos/{repo}/issues/{pr}/comments", "--paginate") or "[]")
    principal, extras = escolher(comentarios)
    for extra in extras:
        comentario_id = str(extra["id"])
        subprocess.run(
            ["gh", "api", "-X", "DELETE", f"repos/{repo}/issues/comments/{comentario_id}"],
            check=False,
            stdout=subprocess.DEVNULL,
        )
    body = corpo(url, head_sha)
    if principal:
        comentario_id = str(principal["id"])
        gh(
            "api",
            "-X",
            "PATCH",
            f"repos/{repo}/issues/comments/{comentario_id}",
            "-f",
            f"body={body}",
        )
    else:
        gh(
            "api",
            "-X",
            "POST",
            f"repos/{repo}/issues/{pr}/comments",
            "--input",
            "-",
            input_data=json.dumps({"body": body}),
        )


def selftest() -> int:
    """Prova sem rede: o corpo carrega marcador, sha e URL; com dois comentários marcados fica
    o primeiro e o segundo vai para a lista de apagar; sem marcador, nada é escolhido."""
    texto = corpo("https://abc-csb-preview.rubenmarcus-dev.workers.dev", "deadbee")
    assert MARKER in texto and "<!-- sha: deadbee -->" in texto and "abc-csb-preview" in texto, texto
    principal, extras = escolher([{"id": 1, "body": "oi"}, {"id": 2, "body": f"x {MARKER}"}, {"id": 3, "body": f"y {MARKER}"}, {"id": 4}])
    assert principal and principal["id"] == 2 and [c["id"] for c in extras] == [3], (principal, extras)
    assert escolher([{"id": 1, "body": "oi"}]) == (None, []), "sem marcador não pode escolher nem apagar"
    print("cf_preview_comment selftest: ok")
    return 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    if len(sys.argv) != 3:
        print(f"uso: {sys.argv[0]} PR URL", file=sys.stderr)
        return 2
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not repo:
        print("GITHUB_REPOSITORY ausente", file=sys.stderr)
        return 2
    atualizar(repo, sys.argv[1], sys.argv[2], os.environ.get("HEAD_SHA", ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
