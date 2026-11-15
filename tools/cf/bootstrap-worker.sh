#!/usr/bin/env bash
# Cria somente um Worker ausente. Nunca substitui um script existente.
set -euo pipefail

WORKER="${1:?uso: bootstrap-worker.sh <worker>}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN ausente}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID ausente}"

resposta=$(mktemp)
trap 'rm -f "$resposta"' EXIT
codigo=$(curl -sS -o "$resposta" -w '%{http_code}' \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER")
case "$codigo" in
  200)
    echo "$WORKER já existe; bootstrap preservou o script atual"
    ;;
  404)
    npx --yes wrangler@4.158.0 deploy tools/cf/bootstrap-worker.mjs \
      --name "$WORKER" \
      --compatibility-date 2026-11-09 \
      --no-bundle
    ;;
  *)
    echo "consulta de $WORKER falhou com HTTP $codigo" >&2
    cat "$resposta" >&2
    exit 1
    ;;
esac
