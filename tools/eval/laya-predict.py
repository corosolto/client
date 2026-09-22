#!/usr/bin/env python3
# laya-predict.py — ponte stdin->Router da Laya (decision engine local, Apache-2.0).
# Lê {"state": {...}, "questions": {...}} do stdin, devolve o predict completo
# (respostas tipadas + confianças calibradas) em JSON no stdout.
# Erro = exit != 0 com mensagem no stderr; o chamador NUNCA trata falha como "ok".
#
# Uso:  echo '{"state":{"body":"..."},"questions":{...}}' | python3 laya-predict.py
# Requer: venv .ml-venv do monorepo (pip install laya torch transformers) — o wrapper
# node (laya-gate.mjs) resolve o caminho do interpretador.
import json
import sys

from laya import Router  # noqa: E402


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"stdin nao e JSON: {e}", file=sys.stderr)
        return 2
    if "state" not in payload or "questions" not in payload:
        print('payload exige chaves "state" e "questions"', file=sys.stderr)
        return 2
    router = Router()  # lazy: carrega so o checkpoint roteado no primeiro predict
    res = router.predict(payload["state"], payload["questions"])
    json.dump(res, sys.stdout, ensure_ascii=False)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
