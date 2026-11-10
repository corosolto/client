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


def escolher(comentarios: list[dict]) -> tuple[dict | None, list[dict]]:
    """Fica o primeiro comentário oficial; só duplicatas oficiais são apagadas."""
    encontrados = comentarios_preview(comentarios)
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


def resolver_head_sha(argv: list[str], ambiente: dict[str, str]) -> str:
    """O workflow passa o SHA no terceiro argumento; a forma antiga usa o ambiente."""
    return argv[3] if len(argv) == 4 else ambiente.get("HEAD_SHA", "")


def selftest() -> int:
    """Cobre corpo, duplicatas oficiais e forjados sem rede."""
    texto = corpo("https://abc-csb-preview.rubenmarcus-dev.workers.dev", "deadbee")
    assert MARKER in texto and "<!-- sha: deadbee -->" in texto and "abc-csb-preview" in texto, texto
    principal, extras = escolher([{"id": 1, "body": "oi"}, {"id": 2, "body": f"x {MARKER}", "user": {"login": AUTOR_PREVIEW}}, {"id": 3, "body": f"y {MARKER}", "user": {"login": AUTOR_PREVIEW}}, {"id": 4}])
    assert principal and principal["id"] == 2 and [c["id"] for c in extras] == [3], (principal, extras)
    assert escolher([{"id": 1, "body": "oi"}]) == (None, []), "sem marcador não pode escolher nem apagar"
    oficial = {"id": 2, "user": {"login": AUTOR_PREVIEW}, "body": corpo("https://oficial.workers.dev", "abc123")}
    forjado = {"id": 3, "user": {"login": "externo"}, "body": corpo("https://attacker.workers.dev", "abc123")}
    antigo = {"id": 1, "user": {"login": AUTOR_PREVIEW}, "body": corpo("https://antigo.workers.dev", "def456")}
    assert comentarios_preview([forjado, oficial, antigo]) == [oficial, antigo]
    assert url_preview([oficial, forjado], "abc123") == "https://oficial.workers.dev"
    assert url_preview([forjado], "abc123") is None
    assert url_preview([antigo, oficial], "abc123") == "https://oficial.workers.dev"
    assert resolver_head_sha(["script", "1307", "https://x.workers.dev", "abc123"], {}) == "abc123"
    assert resolver_head_sha(["script", "1307", "https://x.workers.dev"], {"HEAD_SHA": "def456"}) == "def456"
    print("CF-COMMENT PASS: duplicatas oficiais e forjados ignorados")
    return 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    if len(sys.argv) not in (3, 4):
        print(f"uso: {sys.argv[0]} PR URL [HEAD_SHA]", file=sys.stderr)
        return 2
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not repo:
        print("GITHUB_REPOSITORY ausente", file=sys.stderr)
        return 2
    atualizar(repo, sys.argv[1], sys.argv[2], resolver_head_sha(sys.argv, os.environ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
