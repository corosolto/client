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


def marcados(comentarios: list[dict]) -> list[dict]:
    return [comentario for comentario in comentarios if MARKER in (comentario.get("body") or "")]


def selftest() -> int:
    corpo_teste = corpo("https://preview.example", "abc123")
    casos = [
        ("corpo preserva URL, marcador e SHA", all(
            trecho in corpo_teste
            for trecho in ("https://preview.example", MARKER, "abc123")
        )),
        ("filtra somente comentários marcados", marcados([
            {"id": 1, "body": "comentário comum"},
            {"id": 2, "body": f"preview\n{MARKER}"},
            {"id": 3, "body": None},
        ]) == [{"id": 2, "body": f"preview\n{MARKER}"}]),
    ]
    erros = [nome for nome, passou in casos if not passou]
    for nome, passou in casos:
        print(f"{'ok' if passou else 'FALHA'} {nome}")
    if erros:
        print(f"{len(erros)} caso(s) vermelho(s)")
        return 1
    print("selftest verde")
    return 0


def atualizar(repo: str, pr: str, url: str, head_sha: str) -> None:
    comentarios = json.loads(gh("api", f"repos/{repo}/issues/{pr}/comments", "--paginate") or "[]")
    encontrados = marcados(comentarios)
    for extra in encontrados[1:]:
        comentario_id = str(extra["id"])
        subprocess.run(
            ["gh", "api", "-X", "DELETE", f"repos/{repo}/issues/comments/{comentario_id}"],
            check=False,
            stdout=subprocess.DEVNULL,
        )
    body = corpo(url, head_sha)
    if encontrados:
        comentario_id = str(encontrados[0]["id"])
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
