#!/usr/bin/env bash
# Virada de produção Vercel -> Cloudflare Workers (docs/runbooks/MIGRACAO-CLOUDFLARE.md, fase 4).
#
# O DNS NÃO muda: os registros proxied continuam apontando para a Vercel e uma Worker Route por
# host desvia o tráfego antes de a requisição sair da Cloudflare: www vai ao csb-prod e o apex
# csbrasil.online ao csb-apex (só o 308 para o www). Desligar a rota devolve o host à Vercel.
#
#   bash tools/cf/virada.sh status     lista as rotas e para onde cada host aponta
#   bash tools/cf/virada.sh liga       cria as rotas (idempotente)
#   bash tools/cf/virada.sh desliga    remove as rotas (rollback para a Vercel)
#
# Credencial: CLOUDFLARE_API_TOKEN (Zone: Workers Routes Edit) ou o OAuth do `wrangler login`.
set -euo pipefail

ROTAS=(
  "corosolto.com.br www.corosolto.com.br/* csb-prod"
  "csbrasil.online www.csbrasil.online/* csb-prod"
  "csbrasil.online csbrasil.online/* csb-apex"
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
preflight_propriedade() {
  local item dominio padrao alvo atual dono
  for item in "${ROTAS[@]}"; do
    read -r dominio padrao alvo <<<"$item"
    atual=$(rota_id "$(zona "$dominio")" "$padrao")
    if [ -n "$atual" ]; then
      dono="${atual#* }"
      [ "$dono" = "$alvo" ] || {
        echo "recusado: $padrao pertence a $dono, não a $alvo; nenhuma rota foi alterada" >&2
        return 1
      }
    fi
  done
}
trava_exclusiva() {
  LOCK_DIR="${TMPDIR:-/tmp}/csb-cf-virada.lock"
  mkdir "$LOCK_DIR" 2>/dev/null || {
    echo "outra virada já está em andamento ($LOCK_DIR)" >&2
    return 1
  }
  trap 'rmdir "$LOCK_DIR"' EXIT
}

case "${1:-status}" in
  status)
    for item in "${ROTAS[@]}"; do
      read -r dominio padrao alvo <<<"$item"
      atual=$(rota_id "$(zona "$dominio")" "$padrao")
      if [ -n "$atual" ]; then echo "$padrao -> ${atual#* }"; else echo "$padrao -> Vercel (sem rota)"; fi
    done
    ;;
  liga)
    trava_exclusiva
    preflight_propriedade
    for item in "${ROTAS[@]}"; do
      read -r dominio padrao alvo <<<"$item"
      z=$(zona "$dominio")
      atual=$(rota_id "$z" "$padrao")
      if [ -n "$atual" ]; then
        dono="${atual#* }"
        [ "$dono" = "$alvo" ] || {
          echo "recusado: $padrao já pertence a $dono, não a $alvo" >&2
          exit 1
        }
      else
        api -X POST "https://api.cloudflare.com/client/v4/zones/$z/workers/routes" \
          -d "{\"pattern\":\"$padrao\",\"script\":\"$alvo\",\"request_limit_fail_open\":true}" >/dev/null
      fi
      echo "$padrao -> $alvo"
    done
    ;;
  desliga)
    trava_exclusiva
    preflight_propriedade
    for item in "${ROTAS[@]}"; do
      read -r dominio padrao alvo <<<"$item"
      z=$(zona "$dominio")
      atual=$(rota_id "$z" "$padrao")
      if [ -n "$atual" ]; then
        dono="${atual#* }"
        [ "$dono" = "$alvo" ] || {
          echo "recusado: $padrao pertence a $dono; rollback de $alvo não pode removê-la" >&2
          exit 1
        }
        api -X DELETE "https://api.cloudflare.com/client/v4/zones/$z/workers/routes/${atual%% *}" >/dev/null
      fi
      echo "$padrao -> Vercel (sem rota)"
    done
    ;;
  *) echo "uso: $0 status|liga|desliga" >&2; exit 2 ;;
esac
