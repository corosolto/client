#!/usr/bin/env python3
"""Gate de presença dos revisores-bot (CodeRabbit + estraga-codigo).

PR com review/comentário de bot revisor ganha `needs-coderabbit-resolution` — o
automerge (check_automerge.py) fica bloqueado até o maintainer confirmar com
`coderabbit-resolved`. A confirmação é MANUAL de propósito: threads resolvidas
via API por um agente também valem, o maintainer é o arbítrio final.

O estraga-codigo posta REVIEW (não issue-comment), então o payload precisa trazer
`reviews` além de `comments` — sem isso ele era invisível ao gate (PRs #302/#303
passaram sem trava nenhuma em 16/08).
"""
import json
import sys

REVISORES = ("coderabbit", "estraga-codigo")


def main() -> int:
    payload = json.load(sys.stdin)
    comments = payload.get("comments", [])
    reviews = payload.get("reviews", [])
    status_rollup = payload.get("statusCheckRollup", [])

    def eh_bot(login):
        return any(rev in (login or "").lower() for rev in REVISORES)

    has_coderabbit_check = any(
        item.get("__typename") == "CheckRun" and "coderabbit" in (item.get("name") or "").lower()
        for item in status_rollup
    )
    has_bot_comment = any(
        eh_bot((comment.get("author") or {}).get("login")) for comment in comments
    )
    has_bot_review = any(
        eh_bot((review.get("author") or {}).get("login")) for review in reviews
    )

    print(
        json.dumps(
            {
                "needs_resolution": bool(has_coderabbit_check or has_bot_comment or has_bot_review),
                "labels_add": ["needs-coderabbit-resolution"] if (has_coderabbit_check or has_bot_comment or has_bot_review) else [],
                "labels_remove": ["coderabbit-resolved"] if (has_coderabbit_check or has_bot_comment or has_bot_review) else [],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
