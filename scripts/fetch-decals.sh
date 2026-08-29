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

# Sentinela exige o acervo completo. `pixo-lajes-01.png` é versionado mas integra a
# mesma lista do acervo; os outros 196 chegam no zip. Qualquer contagem menor deixa
# mapas sem grafite em clone limpo, mesmo que a pasta já exista.
EXPECTED_DECALS=197
decal_count=0
if [ -d "$DEST" ]; then
  decal_count="$(find "$DEST" -maxdepth 1 -type f -name '*.png' ! -name 'or-*.png' | wc -l | tr -d ' ')"
fi
if [ "$decal_count" -ge "$EXPECTED_DECALS" ]; then
  echo "decals/ já configurado — nada a fazer."
  exit 0
fi
mkdir -p "$DEST"
echo "Baixando decalques de: $URL"
curl --retry 5 --retry-delay 3 --retry-all-errors --connect-timeout 20 -fsSL "$URL" -o /tmp/csbrasil-decals.zip
unzip -o -q /tmp/csbrasil-decals.zip -d "$DEST/"
echo "Pronto. $(ls -1 "$DEST"/*.png | wc -l | tr -d ' ') decalques em $DEST/."
