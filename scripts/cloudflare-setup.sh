#!/usr/bin/env bash
# Configura a zona csbrasil.online na Cloudflare via API (fase A do runbook
# docs/runbooks/cdn-cloudflare.md): SSL strict, Brotli/HTTP3/Early Hints e as
# cache rules (bypass /api/*, mídia longa no edge, /js/ CURTO — BUG-39).
#
# NÃO guarda segredo em arquivo: a chave vem de variável de ambiente.
#
# Uso:
#   export CF_EMAIL="seu-email@da-conta-cloudflare"
#   export CF_GLOBAL_KEY="sua-global-api-key"     # dash → My Profile → API Tokens → Global API Key → View
#   bash scripts/cloudflare-setup.sh
#
# (Ou, com API Token em vez da global key: export CF_API_TOKEN="..." — o token
# precisa de Zone → Settings → Edit e Zone → Rulesets → Edit na zona.)
set -e
cd "$(dirname "$0")/.."

ZONE="csbrasil.online"
API="https://api.cloudflare.com/client/v4"

if [ -n "$CF_API_TOKEN" ]; then
  AUTH=(-H "Authorization: Bearer $CF_API_TOKEN")
elif [ -n "$CF_GLOBAL_KEY" ] && [ -n "$CF_EMAIL" ]; then
  AUTH=(-H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY")
else
  echo "Faltou credencial: exporte CF_API_TOKEN, ou CF_EMAIL + CF_GLOBAL_KEY."
  exit 1
fi

cf() { # cf <MÉTODO> <path> [json]
  local m="$1" p="$2" d="${3:-}"
  local args=(-sS -X "$m" "${AUTH[@]}" -H "Content-Type: application/json")
  [ -n "$d" ] && args+=(--data "$d")
  curl "${args[@]}" "$API$p"
}

check() { # morre se o último retorno não foi success:true (tolerante a espaço/pretty-print)
  echo "$1" | grep -qE '"success":\s*true' || { echo "FALHOU: $1"; exit 1; }
}

echo "== 1/4 · zona"
R=$(cf GET "/zones?name=$ZONE")
check "$R"
ZONE_ID=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const z=JSON.parse(s).result[0];console.log(z.id)})")
NS=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).result[0].name_servers.join(' '))})")
STATUS=$(echo "$R" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).result[0].status)})")
echo "   zone_id=$ZONE_ID  status=$STATUS  ns=$NS"
[ "$STATUS" = "active" ] || echo "   ⚠ zona ainda NÃO está active (nameservers propagando). As regras valem mesmo assim."

echo "== 2/4 · SSL strict + Brotli + HTTP/3 + Early Hints"
check "$(cf PATCH "/zones/$ZONE_ID/settings/ssl"          '{"value":"strict"}')"
check "$(cf PATCH "/zones/$ZONE_ID/settings/brotli"       '{"value":"on"}')"
check "$(cf PATCH "/zones/$ZONE_ID/settings/http3"        '{"value":"on"}')"
check "$(cf PATCH "/zones/$ZONE_ID/settings/early_hints"  '{"value":"on"}')"
echo "   ok"

echo "== 3/4 · cache rules (substitui a ruleset de cache inteira pelas 3 regras certas)"
read -r -d '' RULES <<'JSON' || true
{
  "rules": [
    {
      "ref": "bypass_api",
      "description": "bypass-api: /api/* nunca cacheia (SSR/telemetria fresca)",
      "expression": "(starts_with(http.request.uri.path, \"/api/\"))",
      "action": "set_cache_settings",
      "action_parameters": { "cache": false }
    },
    {
      "ref": "assets_midia",
      "description": "assets-midia: áudio/modelos/imagens/fontes no edge por 1 mês",
      "expression": "(http.host eq \"www.csbrasil.online\" and (starts_with(http.request.uri.path, \"/audio/\") or starts_with(http.request.uri.path, \"/models/\") or starts_with(http.request.uri.path, \"/img/\") or starts_with(http.request.uri.path, \"/fonts/\") or starts_with(http.request.uri.path, \"/posters/\")))",
      "action": "set_cache_settings",
      "action_parameters": {
        "cache": true,
        "edge_ttl": { "mode": "override_origin", "default": 2592000 },
        "browser_ttl": { "mode": "respect_origin" }
      }
    },
    {
      "ref": "assets_js",
      "description": "assets-js: /js/ no edge por 10 min — TTL de 1 mês montava main.js de um deploy com fparms.js de outro (BUG-39/BUG-75); URLs já são ?v= por conteúdo, deploy novo nem depende deste TTL (tools/eval/edge-cache-check.mjs)",
      "expression": "(http.host eq \"www.csbrasil.online\" and starts_with(http.request.uri.path, \"/js/\"))",
      "action": "set_cache_settings",
      "action_parameters": {
        "cache": true,
        "edge_ttl": { "mode": "override_origin", "default": 600 },
        "browser_ttl": { "mode": "respect_origin" }
      }
    }
  ]
}
JSON
check "$(cf PUT "/zones/$ZONE_ID/rulesets/phases/http_request_cache_settings/entrypoint" "$RULES")"
echo "   ok (bypass_api acima de assets_midia/assets_js; /js/ curto de propósito — BUG-39)"

echo "== 4/4 · verificação"
if [ "$STATUS" = "active" ]; then
  H1=$(curl -sI "https://www.csbrasil.online/js/version.js" | tr -d '\r')
  H2=$(curl -sI "https://www.csbrasil.online/js/version.js" | tr -d '\r')
  echo "$H2" | grep -i '^cf-cache-status' || true
  echo "$H2" | grep -i '^cache-control' || true
  echo "$H2" | grep -iq '^server: cloudflare' && echo "   proxy Cloudflare ATIVO" || echo "   ⚠ resposta ainda não veio da Cloudflare"
else
  echo "   propagação pendente — rode de novo depois do e-mail 'site is active' pra verificar."
fi
echo "PRONTO."
