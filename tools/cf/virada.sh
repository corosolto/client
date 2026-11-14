#!/usr/bin/env bash
# Virada de produção Vercel -> Cloudflare Workers (docs/runbooks/MIGRACAO-CLOUDFLARE.md, fase 4).
#
# O DNS NÃO muda: os registros proxied continuam apontando para a Vercel e uma Worker Route por
# host desvia o tráfego para o csb-prod antes de a requisição sair da Cloudflare. Desligar a
# rota devolve o host à Vercel na hora, sem esperar propagação.
#
#   bash tools/cf/virada.sh status     lista as rotas e para onde cada host aponta
#   bash tools/cf/virada.sh liga       cria as rotas (idempotente)
#   bash tools/cf/virada.sh desliga    remove as rotas (rollback para a Vercel)
#
# Credencial: CLOUDFLARE_API_TOKEN (Zone: Workers Routes Edit) ou o OAuth do `wrangler login`.
set -euo pipefail

WORKER="${CSB_WORKER:-csb-prod}"
ROTAS=(
  "corosolto.com.br www.corosolto.com.br/*"
  "csbrasil.online www.csbrasil.online/*"
  "csbrasil.online csbrasil.online/*"
)

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  CONF="${HOME}/Library/Preferences/.wrangler/config/default.toml"
  [ -f "$CONF" ] || CONF="${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/config/default.toml"
  TOKEN=$(awk -F'"' '/^oauth_token/{print $2}' "$CONF" 2>/dev/null || true)
fi
[ -n "$TOKEN" ] || { echo "sem credencial: defina CLOUDFLARE_API_TOKEN ou rode npx wrangler login" >&2; exit 2; }

api() { curl -fsS -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' "$@"; }
zona() { api "https://api.cloudflare.com/client/v4/zones?name=$1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s).result;if(!r.length)process.exit(1);console.log(r[0].id)})'; }
rota_id() {
  api "https://api.cloudflare.com/client/v4/zones/$1/workers/routes" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s).result.find(x=>x.pattern===process.argv[1]);if(r)console.log(`${r.id} ${r.script||"(sem worker)"}`)})' "$2"
}

case "${1:-status}" in
  status)
    for item in "${ROTAS[@]}"; do
      read -r dominio padrao <<<"$item"
      atual=$(rota_id "$(zona "$dominio")" "$padrao")
      if [ -n "$atual" ]; then echo "$padrao -> ${atual#* }"; else echo "$padrao -> Vercel (sem rota)"; fi
    done
    ;;
  liga)
    for item in "${ROTAS[@]}"; do
      read -r dominio padrao <<<"$item"
      z=$(zona "$dominio")
      atual=$(rota_id "$z" "$padrao")
      if [ -n "$atual" ]; then
        api -X PUT "https://api.cloudflare.com/client/v4/zones/$z/workers/routes/${atual%% *}" \
          -d "{\"pattern\":\"$padrao\",\"script\":\"$WORKER\"}" >/dev/null
      else
        api -X POST "https://api.cloudflare.com/client/v4/zones/$z/workers/routes" \
          -d "{\"pattern\":\"$padrao\",\"script\":\"$WORKER\"}" >/dev/null
      fi
      echo "$padrao -> $WORKER"
    done
    ;;
  desliga)
    for item in "${ROTAS[@]}"; do
      read -r dominio padrao <<<"$item"
      z=$(zona "$dominio")
      atual=$(rota_id "$z" "$padrao")
      [ -z "$atual" ] || api -X DELETE "https://api.cloudflare.com/client/v4/zones/$z/workers/routes/${atual%% *}" >/dev/null
      echo "$padrao -> Vercel (sem rota)"
    done
    ;;
  *) echo "uso: $0 status|liga|desliga" >&2; exit 2 ;;
esac
