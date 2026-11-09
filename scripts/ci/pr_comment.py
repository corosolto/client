#!/usr/bin/env python3
"""Corpo do comentário de classificação de PR.

O heading `## csbrasil-bot classification` é MARCADOR de dedupe do workflow
(csbrasil-bot-pr-classify.yml): mudou aqui, mudou lá — senão cada gatilho posta
um comentário novo em vez de atualizar o existente (BUG-68).
"""
import json
import sys

# Public explanations use English. Label identifiers remain stable.
LABEL_REASONS = {
    "target:main": "targets `main` directly, without an integration queue",
    "target:staging": "routed to the `staging` integration branch",
    "target:release": "routed to the release branch",
    "needs-staging": "runtime/UI change: validate the integrated change in staging before merging",
    "needs-human-gameplay": "changes gameplay, rendering, HUD, maps or characters: human approval required",
    "needs-human-backend": "changes API, Supabase, anti-cheat or ranking: human approval required",
    "safe-automerge": "small and reversible, outside sensitive areas: eligible under the safe-merge policy",
    "needs-estragacodigo-resolution": "has an unresolved estraga-codigo finding: requires `estragacodigo-resolved` before merging",
    "crash-auto": "created from an automated production crash report",
}

AREA_RULES = [
    ("maps", "🗺️", lambda p: p.startswith("public/js/map_")),
    ("game", "🎮", lambda p: p.startswith("public/js/")),
    ("backend", "⚙️", lambda p: p.startswith("src/pages/api") or p.startswith("src/lib")),
    ("site", "🌐", lambda p: p.startswith("src/")),
    ("CI", "🤖", lambda p: p.startswith(".github") or p.startswith("scripts/ci")),
    ("harness", "🧪", lambda p: p.startswith("tools/")),
    ("docs", "📚", lambda p: p.endswith(".md")),
    ("assets", "🎨", lambda p: p.startswith(("public/models", "public/img", "public/audio"))),
]

AREA_DEFAULT = ("other", "📦")


def area_de(path: str) -> tuple[str, str]:
    for nome, icone, casa in AREA_RULES:
        if casa(path):
            return nome, icone
    return AREA_DEFAULT


def render(payload: dict) -> str:
    labels_add = payload.get("labels_add", [])
    # `files: null` (PR grande demais para a API) não é lista vazia: `payload.get("files", [])`
    # só cobre a chave AUSENTE, então o `len(files)` morria de TypeError e derrubava o job
    # `classify` inteiro — medido no #623, 1720 arquivos. Mesmo defeito do pr_classify.py
    # (#624) e do check_automerge.py. E aqui não basta não quebrar: sem a lista o mapa por
    # área sai VAZIO, e comentário que mostra "nada mudou" num PR de 1720 arquivos mente
    # para quem revisa. Lista faltando ou truncada é DECLARADA no corpo.
    arquivos_brutos = payload.get("files")
    files = arquivos_brutos or []
    changed = int(payload.get("changedFiles") if payload.get("changedFiles") is not None else len(files))
    lista_incompleta = arquivos_brutos is None or changed > len(files)
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
    quem = f"**@{author}** opened a PR with" if author else "PR with an unknown author and"
    tamanho = f"**{changed} file(s)**"
    if entradas:
        tamanho += f" · **+{tot_add}** **−{tot_del}**"
    resumo = [f"{quem} {tamanho}, targeting **{base_branch}**."]
    if retarget:
        resumo.append(f"Automatically routed to **{retarget}**.")
    if lista_incompleta:
        resumo.append("The API returned an **incomplete file list** (the PR is too large), "
                      "so the area breakdown below does not cover the entire change.")
    caixa = "\n".join(f"> {l}" for l in resumo)

    # ── mapa da mudança: área → quantos arquivos, com amostra ─────────────
    linhas = [f"## csbrasil-bot classification", "", f"> [!NOTE]", caixa, ""]
    if entradas:
        por_area: dict[str, dict] = {}
        for e in entradas:
            nome, icone = area_de(e["path"])
            por_area.setdefault(nome, {"icone": icone, "itens": []})["itens"].append(e)
        linhas += ["### What changed", "",
                   "| area | files | + | − | sample |",
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
        acoes.append(f"- **assignee:** @{assignee} : responsible for review")
    if labels_add:
        linhas += ["### Labels", "",
                   "| label | reason |", "|:------|:--------|"]
        for lab in labels_add:
            motivo = LABEL_REASONS.get(lab, "routing rule")
            linhas.append(f"| `{lab}` | {motivo} |")
        linhas.append("")
    elif acoes or entradas:
        linhas += ["### Labels", "", "No additional labels suggested. This PR does not match the routing criteria.", ""]

    if "needs-estragacodigo-resolution" in labels_add:
        linhas += ["> [!CAUTION]",
                   "> An estraga-codigo finding is **unresolved**. Resolve it before applying `estragacodigo-resolved` and merging.", ""]

    if acoes:
        linhas += ["### Bot actions", "", *acoes, ""]
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
        ("mapa separa área de mapa", "🗺️ maps | 1 | +5 | −0" in p),
        ("mapa separa jogo", "🎮 game | 1 | +10 | −2" in p),
        ("label com motivo humano", "validate the integrated change in staging" in p),
        ("assignee listado", "**assignee:** @ruben" in p),
        ("caixa NOTE presente", "> [!NOTE]" in p),
    ]
    q = render({"files": [], "changedFiles": 0, "baseRefName": "staging",
                "labels_add": ["needs-estragacodigo-resolution"]})
    casos += [
        ("sem arquivo não quebra", "0 file(s)" in q),
        ("bloqueio estragacodigo em CAUTION", "> [!CAUTION]" in q),
        ("rótulo resolvido correto aparece", "`estragacodigo-resolved`" in q),
        ("cautela identifica o revisor ativo", "> An estraga-codigo finding" in q),
    ]
    r = render({"files": None, "changedFiles": 1720, "baseRefName": "main",
                "author_login": "ruben", "labels_add": ["needs-staging"]})
    t = render({"files": [{"path": "docs/a.md", "additions": 1, "deletions": 0}],
                "changedFiles": 300, "baseRefName": "main", "labels_add": []})
    casos += [
        ("lista nula não quebra e mantém o total", "1720 file(s)" in r),
        ("lista nula é declarada no corpo", "incomplete file list" in r),
        ("lista truncada é declarada no corpo", "incomplete file list" in t),
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
