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
# Labels que o PRÓPRIO bot aplica. Não são sinal humano de escopo, então não
# entram na conta do critério: `issues: edited` re-dispara a triagem com elas
# no payload e `labels.issubset(SAFE_LABELS)` virava False na segunda passada.
BOT_LABELS = {"bot-fixable", "needs-repro", "covered-by-pr", "crash-auto"}

LABEL_REASONS = {
    "bot-fixable": "small and deterministic scope — a bot can draft the fix",
    "needs-repro": "report is too short — more context is needed before investigation",
    "covered-by-pr": "an open PR already covers this issue",
    "crash-auto": "automated production crash report",
}


def render_comment(issue: dict, labels_add: list[str], covered: dict | None) -> str:
    number = issue["number"]
    title = (issue.get("title") or "").strip()
    url = issue.get("url") or f"#"
    author = ((issue.get("author") or {}).get("login"))
    body = (issue.get("body") or "").strip()
    labels_existing = sorted(l["name"] for l in issue.get("labels", []))

    linhas = ["## csbrasil-bot issue review", ""]

    # ── verdict: the callout changes with the issue type ────────────────
    if covered:
        tipo = "IMPORTANT"
    elif "needs-repro" in labels_add:
        tipo = "WARNING"
    elif "bot-fixable" in labels_add:
        tipo = "TIP"
    else:
        tipo = "NOTE"
    quem = f"opened by **@{author}**" if author else ""
    veredito = f"**Issue #{number} — {title}** {quem}".strip()
    detalhe = ""
    if "needs-repro" in labels_add:
        detalhe = f"\n> The report has **{len(body)} characters** — too short to reproduce. Describe what you did, what you expected and what happened."
    elif "bot-fixable" in labels_add:
        detalhe = "\n> A maintainer can comment `/bot-fix` to have the bot open a branch and draft PR."
    linhas += [f"> [!{tipo}]", f"> {veredito}", detalhe, ""]

    # ── triage details: only state what the payload supports ─────────────
    linhas += ["### Triage details", ""]
    if labels_existing:
        linhas.append(f"- **existing labels:** {', '.join(f'`{l}`' for l in labels_existing)}")
    else:
        linhas.append("- **existing labels:** none")
    if labels_add:
        linhas.append("- **bot labels:**")
        linhas += [f"  - `{l}` — {LABEL_REASONS.get(l, 'triage rule')}" for l in labels_add]
    else:
        linhas.append("- **bot labels:** none — no automatic criteria matched")
    linhas.append(f"- **report length:** {len(body)} characters")
    linhas.append(f"- **link:** {url}")
    linhas.append("")

    # ── PR coverage: the decision-changing context for new readers ─────
    if covered:
        linhas += ["### Already covered by a PR", "",
                   f"**PR #{covered['number']} — {covered['title']}**", f"{covered['url']}", "",
                   "> [!TIP]",
                   "> If this PR fixes the issue, closing it will close the issue as well.", ""]

    # ── next step ───────────────────────────────────────────────────────
    linhas += ["### Next step", ""]
    if covered:
        linhas.append("- review the existing covering PR — do not open parallel work")
    elif "needs-repro" in labels_add:
        linhas.append("- author adds reproduction steps, expected result and actual result")
    elif "bot-fixable" in labels_add:
        linhas.append("- maintainer evaluates `/bot-fix` (bot opens a draft; human reviews)")
    else:
        linhas.append("- human triage: no automatic criterion matched this issue")
    return "\n".join(linhas).rstrip() + "\n"


def review_issue(payload: dict) -> dict:
    issue = payload["issue"]
    prs = payload.get("prs", [])
    labels = {l["name"] for l in issue.get("labels", [])}
    # O critério lê só o que HUMANO pôs: quem triou de verdade é quem rotulou
    # a área. Ver BOT_LABELS.
    humanas = labels - BOT_LABELS
    number = issue["number"]
    body = (issue.get("body") or "").strip()

    labels_add: list[str] = []
    if humanas and humanas.issubset(SAFE_LABELS):
        labels_add.append("bot-fixable")
    elif "dx" in humanas and not humanas.intersection(SENSITIVE_LABELS):
        labels_add.append("bot-fixable")
    elif "documentation" in humanas:
        labels_add.append("bot-fixable")
    if len(body) < 24 and "crash-auto" not in labels and not humanas.intersection(SAFE_LABELS):
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
        ("heading present", "## csbrasil-bot issue review" in c),
        ("bot-fixable uses TIP callout", "> [!TIP]" in c),
        ("report length is shown", "80 characters" in c),
        ("label reason is English", "draft the fix" in c),
        ("next step mentions /bot-fix", "/bot-fix" in c),
        ("labels_add is coherent", r["labels_add"] == ["bot-fixable"]),
    ]
    curta = dict(base, body="trava", labels=[])
    r2 = review_issue({"issue": curta, "prs": []})
    casos += [
        ("short report uses WARNING", "> [!WARNING]" in r2["comment"]),
        ("needs-repro includes length", "5 characters" in r2["comment"]),
    ]
    pr_cobre = dict(base, labels=[])
    r3 = review_issue({"issue": pr_cobre, "prs": [
        {"number": 7, "title": "fix do travamento", "url": "https://x/pull/7", "body": "fixes #42"}]})
    casos += [
        ("PR cobrinte detectada", r3["covered_pr"]["number"] == 7),
        ("covered vira caixa IMPORTANT", "> [!IMPORTANT]" in r3["comment"]),
        ("link da PR no comentário", "https://x/pull/7" in r3["comment"]),
    ]

    # `issues: edited` re-dispara a triagem com as labels que o PRÓPRIO bot já
    # aplicou no gatilho anterior. Como elas não são do SAFE_LABELS, o
    # `labels.issubset(SAFE_LABELS)` virava False na segunda passada: a issue
    # continuava com `bot-fixable` grudada e o comentário (reescrito no lugar,
    # pelo marcador) passava a dizer "fora dos critérios automáticos". Quem lia
    # não chamava `/bot-fix` — o rótulo e o texto do bot se contradiziam.
    retriagem = dict(base, labels=[{"name": "good first issue"}, {"name": "bot-fixable"}])
    r4 = review_issue({"issue": retriagem, "prs": []})
    crash_curta = {"number": 43, "title": "crash em produção: TypeError x", "url": "https://x/43",
                   "author": None, "labels": [{"name": "crash-auto"}], "body": "boom", "state": "open"}
    r5 = review_issue({"issue": crash_curta, "prs": []})
    so_do_bot = dict(base, labels=[{"name": "needs-repro"}])
    r6 = review_issue({"issue": so_do_bot, "prs": []})
    casos += [
        ("re-triagem mantém o veredito bot-fixable", r4["labels_add"] == ["bot-fixable"]),
        ("re-triagem não desmente o rótulo no comentário",
         "fora dos critérios automáticos" not in r4["comment"]),
        ("crash-auto curta não vira needs-repro", r5["labels_add"] == []),
        ("label só do bot não qualifica sozinha", r6["labels_add"] == []),
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
