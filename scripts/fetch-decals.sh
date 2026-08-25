#!/usr/bin/env bash
# Baixa o pacote de decalques de grafite para public/img/decals/.
# Os 196 PNGs do acervo ficam FORA do git (curadoria — ver .gitignore, bloco
# "Decalques de graffiti"); sem este passo o deploy renderiza os mapas SEM
# grafite (T.decals vira 404 silencioso — foi o "os mapas perderam toda textura
# de graffitis" do dono em 06/08). Publicação do pack autorizada pelo dono.
set -e
cd "$(dirname "$0")/.."

# v2 (07/08): 196 arquivos. O v1 tinha 174 e o `DECAL_FILES` do textures.js já pedia 196
# — os 22 `folha-*` (pixação, throw-up, personagem, stencil, lambe) davam 404 em produção,
# e com eles sumiam 513 das 4.671 peças de grafite dos 5 mapas (30% da Quebrada). Ninguém
# tinha como ver isso até o `npm run assert:assets` do T1, que agora reprova o build se o
# pacote vier atrás do que o jogo pede.
URL="${DECALS_PACK_URL:-https://github.com/corosolto/client/releases/download/decals-pack-v2/decals-pack.zip}"
DEST="public/img/decals"

# Sentinela por MARCA, não por contagem (regenerada em 25/08): o PR #399 versionou
# `pixo-lajes-01.png` (obra própria, sem prefixo or-) e a contagem antiga via ">0 PNG
# não-or" no clone limpo da Vercel — o pack nunca baixava e o assert:assets derrubava
# o deploy com 196 decalques faltando. A marca só existe depois de um download bom.
if [ -f "$DEST/.decals-pack-v2" ]; then
  echo "decals/ já configurado — nada a fazer."
  exit 0
fi
mkdir -p "$DEST"
echo "Baixando decalques de: $URL"
curl --retry 5 --retry-delay 3 --retry-all-errors --connect-timeout 20 -fsSL "$URL" -o /tmp/csbrasil-decals.zip
unzip -o -q /tmp/csbrasil-decals.zip -d "$DEST/"
touch "$DEST/.decals-pack-v2"
echo "Pronto. $(ls -1 "$DEST"/*.png | wc -l | tr -d ' ') decalques em $DEST/."
