#!/usr/bin/env python3
import json
import sys


def main() -> int:
    payload = json.load(sys.stdin)
    labels_add = payload.get("labels_add", [])
    files = payload.get("files", [])
    changed = payload.get("changedFiles", len(files))

    lines = [
        "## csbrasil-bot classification",
        "",
        f"- arquivos alterados: `{changed}`",
    ]
    if labels_add:
        lines.append(f"- labels sugeridas/aplicadas: `{', '.join(labels_add)}`")
    else:
        lines.append("- nenhuma label adicional sugerida")

    if "needs-human-gameplay" in labels_add:
        lines.append("- motivo: toca gameplay/render/HUD/mapa/personagem")
    if "needs-human-backend" in labels_add:
        lines.append("- motivo: toca API/Supabase/anti-cheat/ranking")
    if "needs-staging" in labels_add:
        lines.append("- motivo: mudança de runtime/UI precisa validação integrada")
    if "safe-automerge" in labels_add:
        lines.append("- motivo: PR pequena e reversível fora de superfícies sensíveis")

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
