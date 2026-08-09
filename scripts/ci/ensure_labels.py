#!/usr/bin/env python3
import subprocess
import sys

LABELS = {
    "safe-automerge": ("1d76db", "PR pequena e segura para automerge"),
    "needs-staging": ("5319e7", "Mudança precisa validação integrada em staging"),
    "needs-human-gameplay": ("d93f0b", "Mudança exige revisão humana de gameplay/render/HUD"),
    "needs-human-backend": ("b60205", "Mudança exige revisão humana de backend/Supabase/anti-cheat"),
    "bot-fixable": ("0e8a16", "Issue ou PR elegível para tentativa automatizada de correção"),
    "covered-by-pr": ("fbca04", "Issue já atacada por PR aberta"),
    "crash-auto": ("B60205", "crash de produção reportado por /api/jserror ou prod-watch"),
}


def main() -> int:
    for label in sys.argv[1:]:
        if label not in LABELS:
            continue
        color, description = LABELS[label]
        subprocess.run(
            ["gh", "label", "create", label, "--color", color, "--description", description, "--force"],
            check=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
