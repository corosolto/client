#!/usr/bin/env python3
"""Triagem de issue: labels de decisão + comentário de review.

`review_issue()` é importada pelo issue_sweep.py — assinatura é contrato.
"""
import json
import re
import sys

SAFE_LABELS = {"documentation", "dx", "good first issue"}
SENSITIVE_LABELS = {
    "backend", "ci", "harness", "seguranca", "personagens", "armas", "graficos", "arte"
}

LABEL_REASONS = {
    "bot-fixable": "escopo pequeno e determinístico — dá pra um bot rascunhar o conserto",
    "needs-repro": "relato curto demais — falta contexto antes de alguém atacar",
    "covered-by-pr": "já existe PR aberta que fecha esta issue",
    "crash-auto": "report automático de crash em produção",
}


def render_comment(issue: dict, labels_add: list[str], covered: dict | None) -> str:
    number = issue["number"]
    title = (issue.get("title") or "").strip()
    url = issue.get("url") or f"#"
    author = ((issue.get("author") or {}).get("login"))
    body = (issue.get("body") or "").strip()
    labels_existing = sorted(l["name"] for l in issue.get("labels", []))

    linhas = ["## csbrasil-bot issue review", ""]

    # ── veredito: a caixa colorida muda com a natureza da issue ───────────
    if covered:
        tipo = "IMPORTANT"
    elif "needs-repro" in labels_add:
        tipo = "WARNING"
    elif "bot-fixable" in labels_add:
        tipo = "TIP"
    else:
        tipo = "NOTE"
    quem = f"aberta por **@{author}**" if author else ""
    veredito = f"**Issue #{number} — {title}** {quem}".strip()
    detalhe = ""
    if "needs-repro" in labels_add:
        detalhe = f"\n> O relato tem **{len(body)} caracteres** — curto demais pra reproduzir. Descreva o que fez, o que esperava e o que aconteceu."
    elif "bot-fixable" in labels_add:
        detalhe = "\n> Mantainer pode comentar `/bot-fix` pra o bot abrir branch + draft PR."
    linhas += [f"> [!{tipo}]", f"> {veredito}", detalhe, ""]

    # ── ficha da triagem: máximo de detalhe que o payload sustenta ────────
    linhas += ["### Ficha da triagem", ""]
    if labels_existing:
        linhas.append(f"- **labels existentes:** {', '.join(f'`{l}`' for l in labels_existing)}")
    else:
        linhas.append("- **labels existentes:** nenhuma")
    if labels_add:
        linhas.append("- **labels do bot:**")
        linhas += [f"  - `{l}` — {LABEL_REASONS.get(l, 'critério da triagem')}" for l in labels_add]
    else:
        linhas.append("- **labels do bot:** nenhuma — fora dos critérios automáticos")
    linhas.append(f"- **tamanho do relato:** {len(body)} caracteres")
    linhas.append(f"- **link:** {url}")
    linhas.append("")

    # ── cobertura por PR: a informação que muda a decisão de quem chegou ──
    if covered:
        linhas += ["### Já tem PR cobrindo", "",
                   f"**PR #{covered['number']} — {covered['title']}**", f"{covered['url']}", "",
                   "> [!TIP]",
                   "> Se o conserto dessa PR resolver, dá close nela que a issue fecha junto.", ""]

    # ── próximo passo: quem lê sabe o que fazer ────────────────────────────
    linhas += ["### Próximo passo", ""]
    if covered:
        linhas.append("- revisar a PR que já cobre — não abrir frente paralela")
    elif "needs-repro" in labels_add:
        linhas.append("- autor completa o relato (passos, esperado, aconteceu)")
    elif "bot-fixable" in labels_add:
        linhas.append("- maintainer avalia `/bot-fix` (bot abre rascunho; humano revisa)")
    else:
        linhas.append("- triagem humana: esta issue não casou nenhum critério automático")
    return "\n".join(linhas).rstrip() + "\n"


def review_issue(payload: dict) -> dict:
    issue = payload["issue"]
    prs = payload.get("prs", [])
    labels = {l["name"] for l in issue.get("labels", [])}
    number = issue["number"]
    body = (issue.get("body") or "").strip()

    labels_add: list[str] = []
    if labels and labels.issubset(SAFE_LABELS):
        labels_add.append("bot-fixable")
    elif "dx" in labels and not labels.intersection(SENSITIVE_LABELS):
        labels_add.append("bot-fixable")
    elif "documentation" in labels:
        labels_add.append("bot-fixable")
    if len(body) < 24 and "crash-auto" not in labels and not labels.intersection(SAFE_LABELS):
        labels_add.append("needs-repro")

    covered = None
    pattern = re.compile(rf"(closes|fixes|resolves)\s+#?{number}\b", re.I)
    for pr in prs:
        pr_body = pr.get("body") or ""
        if pattern.search(pr_body):
            covered = {"number": pr["number"], "title": pr["title"], "url": pr["url"]}
            labels_add.append("covered-by-pr")
            break

    return {
        "labels_add": sorted(set(labels_add)),
        "comment": render_comment(issue, sorted(set(labels_add)), covered),
        "covered_pr": covered,
    }


def selftest() -> int:
    base = {"number": 42, "title": "jogo trava no ferro velho", "url": "https://x/42",
            "author": {"login": "ze"}, "labels": [{"name": "documentation"}],
            "body": "x" * 80, "state": "open"}
    casos = []
    r = review_issue({"issue": base, "prs": []})
    c = r["comment"]
    casos += [
        ("heading presente", "## csbrasil-bot issue review" in c),
        ("bot-fixable vira caixa TIP", "> [!TIP]" in c),
        ("ficha cita tamanho do relato", "80 caracteres" in c),
        ("label com motivo humano", "rascunhar o conserto" in c),
        ("próximo passo menciona /bot-fix", "/bot-fix" in c),
        ("labels_add coerente", r["labels_add"] == ["bot-fixable"]),
    ]
    curta = dict(base, body="trava", labels=[])
    r2 = review_issue({"issue": curta, "prs": []})
    casos += [
        ("relato curto vira WARNING", "> [!WARNING]" in r2["comment"]),
        ("needs-repro com contagem", "5 caracteres" in r2["comment"]),
    ]
    pr_cobre = dict(base, labels=[])
    r3 = review_issue({"issue": pr_cobre, "prs": [
        {"number": 7, "title": "fix do travamento", "url": "https://x/pull/7", "body": "fixes #42"}]})
    casos += [
        ("PR cobrinte detectada", r3["covered_pr"]["number"] == 7),
        ("covered vira caixa IMPORTANT", "> [!IMPORTANT]" in r3["comment"]),
        ("link da PR no comentário", "https://x/pull/7" in r3["comment"]),
    ]
    erros = 0
    for nome, ok in casos:
        print(f"  {'ok  ' if ok else 'FALHOU'} {nome}")
        erros += 0 if ok else 1
    return 0 if not erros else 1


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    print(json.dumps(review_issue(json.load(sys.stdin))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
