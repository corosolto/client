#!/usr/bin/env python3
import json
import re
import sys

SAFE_LABELS = {"documentation", "dx", "good first issue"}
SENSITIVE_LABELS = {
    "backend", "ci", "harness", "seguranca", "personagens", "armas", "graficos", "arte"
}


def main() -> int:
    payload = json.load(sys.stdin)
    issue = payload["issue"]
    prs = payload.get("prs", [])
    labels = {l["name"] for l in issue.get("labels", [])}
    title = issue["title"]
    number = issue["number"]

    labels_add: list[str] = []
    if labels and labels.issubset(SAFE_LABELS):
        labels_add.append("bot-fixable")
    elif "dx" in labels and not labels.intersection(SENSITIVE_LABELS):
        labels_add.append("bot-fixable")
    elif "documentation" in labels:
        labels_add.append("bot-fixable")

    covered = None
    pattern = re.compile(rf"(closes|fixes|resolves)\s+#?{number}\b", re.I)
    for pr in prs:
        body = pr.get("body") or ""
        if pattern.search(body):
            covered = {"number": pr["number"], "title": pr["title"], "url": pr["url"]}
            labels_add.append("covered-by-pr")
            break

    lines = [
        "## csbrasil-bot issue review",
        "",
        f"- issue: `#{number}`",
    ]
    if labels_add:
        lines.append(f"- labels sugeridas/aplicadas: `{', '.join(sorted(set(labels_add)))}`")
    else:
        lines.append("- nenhuma label adicional sugerida")
    if covered:
        lines.append(f"- já parece coberta pela PR #{covered['number']} — {covered['title']}")
    if "bot-fixable" in labels_add:
        lines.append("- candidata a `/bot-fix` por manter escopo pequeno/determinístico")

    print(json.dumps({
        "labels_add": sorted(set(labels_add)),
        "comment": "\n".join(lines),
        "covered_pr": covered,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
