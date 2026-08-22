#!/usr/bin/env python3
"""Corpo do comentário de classificação de PR.

O heading `## csbrasil-bot classification` é MARCADOR de dedupe do workflow
(csbrasil-bot-pr-classify.yml): mudou aqui, mudou lá — senão cada gatilho posta
um comentário novo em vez de atualizar o existente (BUG-68).
"""
import json
import sys

# Razão de cada label em português de gente — a label sozinha não diz nada
# pra quem chegou agora; a frase sim.
LABEL_REASONS = {
    "target:main": "vai direto pra `main`, sem fila de integração",
    "target:staging": "encaminhada pra branch de integração `staging`",
    "target:release": "encaminhada pra branch de release",
    "needs-staging": "mudança de runtime/UI — valida integrado no staging antes do merge",
    "needs-human-gameplay": "toca gameplay/render/HUD/mapa/personagem — decisão de humano",
    "needs-human-backend": "toca API/Supabase/anti-cheat/ranking — decisão de humano",
    "safe-automerge": "pequena e reversível, fora de superfície sensível — elegível a merge automático",
    "needs-coderabbit-resolution": "há apontamento de revisor automático pendente — não mergear sem `coderabbit-resolved`",
    "crash-auto": "veio do report automático de crash em produção",
}

AREA_RULES = [
    ("mapas", "🗺️", lambda p: p.startswith("public/js/map_")),
    ("jogo", "🎮", lambda p: p.startswith("public/js/")),
    ("backend", "⚙️", lambda p: p.startswith("src/pages/api") or p.startswith("src/lib")),
    ("site", "🌐", lambda p: p.startswith("src/")),
    ("CI", "🤖", lambda p: p.startswith(".github") or p.startswith("scripts/ci")),
    ("arnês", "🧪", lambda p: p.startswith("tools/")),
    ("docs", "📚", lambda p: p.endswith(".md")),
    ("assets", "🎨", lambda p: p.startswith(("public/models", "public/img", "public/audio"))),
]

AREA_DEFAULT = ("outros", "📦")


def area_de(path: str) -> tuple[str, str]:
    for nome, icone, casa in AREA_RULES:
        if casa(path):
            return nome, icone
    return AREA_DEFAULT


def render(payload: dict) -> str:
    labels_add = payload.get("labels_add", [])
    files = payload.get("files", [])
    changed = payload.get("changedFiles", len(files))
    base_branch = payload.get("baseRefName", "main")
    author = payload.get("author_login")
    assignee = payload.get("add_assignee")
    retarget = payload.get("retarget_to")

    entradas = []
    for f in files:
        path = f.get("path", "")
        entradas.append({
            "path": path,
            "add": int(f.get("additions") or 0),
            "del": int(f.get("deletions") or 0),
        })
    tot_add = sum(e["add"] for e in entradas)
    tot_del = sum(e["del"] for e in entradas)

    # ── resumo em caixa colorida: a primeira coisa que o olho pega ─────────
    quem = f"**@{author}** abriu" if author else "PR de autor desconhecido com"
    tamanho = f"**{changed} arquivo(s)**"
    if entradas:
        tamanho += f" · **+{tot_add}** **−{tot_del}**"
    resumo = [f"{quem} {tamanho}, base **{base_branch}**."]
    if retarget:
        resumo.append(f"Reencaminhada automaticamente para **{retarget}**.")
    caixa = "\n".join(f"> {l}" for l in resumo)

    # ── mapa da mudança: área → quantos arquivos, com amostra ─────────────
    linhas = [f"## csbrasil-bot classification", "", f"> [!NOTE]", caixa, ""]
    if entradas:
        por_area: dict[str, dict] = {}
        for e in entradas:
            nome, icone = area_de(e["path"])
            por_area.setdefault(nome, {"icone": icone, "itens": []})["itens"].append(e)
        linhas += ["### O que mudou", "",
                   "| área | arquivos | + | − | amostra |",
                   "|:------|---------:|--:|--:|:--------|"]
        for nome, d in sorted(por_area.items(), key=lambda kv: -len(kv[1]["itens"])):
            itens = d["itens"]
            amostra = ", ".join(f"`{i['path'].split('/')[-1]}`" for i in itens[:3])
            if len(itens) > 3:
                amostra += " …"
            a = sum(i["add"] for i in itens)
            r = sum(i["del"] for i in itens)
            linhas.append(f"| {d['icone']} {nome} | {len(itens)} | +{a} | −{r} | {amostra} |")
        linhas.append("")

    # ── o que o bot fez de ação (só o que aconteceu de verdade) ───────────
    acoes = []
    if assignee:
        acoes.append(f"- **assignee:** @{assignee} — responsável pela revisão")
    if labels_add:
        linhas += ["### Labels", "",
                   "| label | por quê |", "|:------|:--------|"]
        for lab in labels_add:
            motivo = LABEL_REASONS.get(lab, "critério do roteador")
            linhas.append(f"| `{lab}` | {motivo} |")
        linhas.append("")
    elif acoes or entradas:
        linhas += ["### Labels", "", "nenhuma label adicional sugerida — PR fora dos critérios de roteamento.", ""]

    if "needs-coderabbit-resolution" in labels_add:
        linhas += ["> [!CAUTION]",
                   "> Há apontamento de revisor automático **pendente**. Não mergear sem aplicar `coderabbit-resolved`.", ""]

    if acoes:
        linhas += ["### Ações do bot", "", *acoes, ""]
    return "\n".join(linhas).rstrip() + "\n"


def selftest() -> int:
    """Fixtures do formato: o marcador de dedupe e os números têm que bater.

    O heading é contrato com o workflow (dedupe por marcador) e os totais
    vêm de soma dupla (arquivo→área) — os dois já mentiram em texto plano.
    """
    casos = []
    p = render({
        "files": [
            {"path": "public/js/game.js", "additions": 10, "deletions": 2},
            {"path": "public/js/map_favela.js", "additions": 5, "deletions": 0},
            {"path": "docs/README.md", "additions": 1, "deletions": 3},
        ],
        "changedFiles": 3, "baseRefName": "main", "author_login": "ruben",
        "add_assignee": "ruben",
        "labels_add": ["needs-staging", "target:main"],
    })
    casos += [
        ("heading-marcador-de-dedupe", "## csbrasil-bot classification" in p),
        ("resumo soma totais", "+16" in p and "−5" in p),
        ("mapa separa área de mapa", "🗺️ mapas | 1 | +5 | −0" in p),
        ("mapa separa jogo", "🎮 jogo | 1 | +10 | −2" in p),
        ("label com motivo humano", "valida integrado no staging" in p),
        ("assignee listado", "**assignee:** @ruben" in p),
        ("caixa NOTE presente", "> [!NOTE]" in p),
    ]
    q = render({"files": [], "changedFiles": 0, "baseRefName": "staging",
                "labels_add": ["needs-coderabbit-resolution"]})
    casos += [
        ("sem arquivo não quebra", "0 arquivo(s)" in q),
        ("bloqueio coderabbit em CAUTION", "> [!CAUTION]" in q),
    ]
    erros = 0
    for nome, ok in casos:
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}")
        erros += 0 if ok else 1
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(render(json.load(sys.stdin)), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
