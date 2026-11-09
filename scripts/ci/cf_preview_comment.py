#!/usr/bin/env python3
"""Cria ou atualiza o comentário único do preview Cloudflare."""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys

MARKER = "<!-- cf-preview -->"
AUTOR_PREVIEW = "github-actions[bot]"


def gh(*args: str, input_data: str | None = None) -> str:
    comando = ["gh", *args]
    return subprocess.check_output(comando, text=True, input=input_data)


def comentarios_preview(comentarios: list[dict], head_sha: str = "") -> list[dict]:
    """Só o bot oficial controla a URL; SHA e URL precisam coexistir no mesmo corpo."""
    return [
        c for c in comentarios
        if c.get("user", {}).get("login") == AUTOR_PREVIEW
        and MARKER in (c.get("body") or "")
        and (not head_sha or f"<!-- sha: {head_sha} -->" in (c.get("body") or ""))
    ]


def url_preview(comentarios: list[dict], head_sha: str) -> str | None:
    for comentario in reversed(comentarios_preview(comentarios, head_sha)):
        match = re.search(r"https://[^\s]+\.workers\.dev", comentario["body"])
        if match:
            return match.group(0)
    return None


def corpo(url: str, head_sha: str) -> str:
    return f"🟠 **preview Cloudflare** → {url}\n\n{MARKER}\n<!-- sha: {head_sha} -->\n"


def atualizar(repo: str, pr: str, url: str, head_sha: str) -> None:
    comentarios = json.loads(gh("api", f"repos/{repo}/issues/{pr}/comments", "--paginate") or "[]")
    encontrados = comentarios_preview(comentarios)
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


def selftest() -> None:
    oficial = {"id": 2, "user": {"login": AUTOR_PREVIEW}, "body": corpo("https://oficial.workers.dev", "abc123")}
    forjado = {"id": 3, "user": {"login": "externo"}, "body": corpo("https://attacker.workers.dev", "abc123")}
    antigo = {"id": 1, "user": {"login": AUTOR_PREVIEW}, "body": corpo("https://antigo.workers.dev", "def456")}
    assert comentarios_preview([forjado, oficial, antigo]) == [oficial, antigo]
    assert url_preview([oficial, forjado], "abc123") == "https://oficial.workers.dev"
    assert url_preview([forjado], "abc123") is None
    assert url_preview([antigo, oficial], "abc123") == "https://oficial.workers.dev"
    print("CF-COMMENT PASS: autor oficial, SHA e URL no mesmo comentário; forjados ignorados")


def main() -> int:
    if "--selftest" in sys.argv:
        selftest()
        return 0
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
