#!/bin/bash
# como-bot.sh — roda qualquer comando `gh` COMO o estraga-codigo, sem "logar".
# O token mora no keychain (ver README); nada fica em arquivo nem env permanente.
# uso: ./como-bot.sh api user
#      ./como-bot.sh pr list -R corosolto/client
set -euo pipefail
TOKEN=$(security find-generic-password -s estraga-codigo -a token -w 2>/dev/null) \
  || { echo "token do bot não está no keychain. rode:"; \
       echo "  security add-generic-password -s estraga-codigo -a token -w '<PAT fine-grained>'"; exit 1; }
GH_TOKEN="$TOKEN" exec gh "$@"
