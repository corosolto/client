#!/usr/bin/env bash
# Baixa o pacote de áudio para public/audio/. O pack pode vir de release pública ou do
# Blob privado incorporado ao build; em ambos os casos os bytes continuam fora do Git.
# Cache de build: o zip fica em node_modules/.cache/csb-packs/ (a Vercel guarda a pasta
# entre builds) sob chave URL+sha; sem a pasta (máquina local) o script baixa como antes.
set -e
cd "$(dirname "$0")/.."

# URL do zip do pacote. Configure pela env AUDIO_PACK_URL ou edite aqui
# (ex.: asset de GitHub Release, ou URL privada de R2/S3 para deploys).
# Pacote completo — vozes/rounds/SFX/menu/ingame — com nomes hasheados
# (decisão do dono: nenhum título legível em URL/zip). Fecha o BUG-19
# (produção servia o pack de julho e todo som novo dava 404).
URL="${AUDIO_PACK_URL:-https://github.com/corosolto/client/releases/download/audio-pack-v9/audio-pack.zip}"
DEST="public/audio"
AUTH_ARGS=()
PACOTE_PRIVADO=0

case "$URL" in
  https://*.private.blob.vercel-storage.com/*)
    : "${BLOB_READ_WRITE_TOKEN:?BLOB_READ_WRITE_TOKEN ausente para o pacote privado de audio}"
    : "${AUDIO_PACK_SHA256:?AUDIO_PACK_SHA256 ausente para verificar o pacote privado de audio}"
    AUTH_ARGS=(-H "Authorization: Bearer ${BLOB_READ_WRITE_TOKEN}")
    PACOTE_PRIVADO=1
    ;;
esac

# O manifest que o jogo consome precisa de `mapSoundscapes` para todo mapa do
# `maps.js` — sem isso o `world.sound` de cada mapa aponta pros `audio/ambiente/*`
# que só o audio-pack-v9+ traz (sob nomes binários) e o mapa sobe mudo. O pack
# v9 traz as 17 faixas nos DOIS ramos (o blob privado carrega os mesmos bytes
# do release público), e o `ambiente-mapas.mjs` roda nos dois: cada faixa é
# conferida no disco e por sha1 contra a tabela `ambiente-pack.mjs` — track que
# o pack não traz reprova o build em vez de virar 404. Só o
# `ensure-map-soundscapes` fica restrito ao público: hum sintetizado não pode
# mascarar pack privado incompleto.
prepara_ambiencia() {
  node tools/audio/migrar-manifesto.mjs "$DEST/manifest.json"
  node tools/audio/javaporcos-samples.mjs
  node tools/audio/complete-amazonia-soundscape.mjs
  node tools/audio/extend-map-soundscapes.mjs "$DEST/manifest.json"
  node tools/audio/lajes-soundscape.mjs "$DEST/manifest.json"
  node tools/audio/ambiente-mapas.mjs
  [ "$PACOTE_PRIVADO" = 1 ] || node tools/audio/ensure-map-soundscapes.mjs
}

if [ -f "$DEST/manifest.json" ] && [ "${VERCEL:-}" != "1" ]; then
  prepara_ambiencia
  echo "audio/ já configurado — nada a fazer."
  exit 0
fi
mkdir -p "$DEST"
CACHE_DIR="node_modules/.cache/csb-packs"
if [ "${VERCEL:-}" = "1" ]; then mkdir -p "$CACHE_DIR"; fi
CACHE_ZIP="$CACHE_DIR/audio-$(printf '%s' "${AUDIO_PACK_SHA256:-}${URL}" | tr -c 'A-Za-z0-9._-' '_' | cut -c -180).zip"
confere_sha() {
  [ -z "${AUDIO_PACK_SHA256:-}" ] || printf '%s  %s\n' "$AUDIO_PACK_SHA256" "$1" | shasum -a 256 -c -
}
if [ -f "$CACHE_ZIP" ] && confere_sha "$CACHE_ZIP"; then
  echo "Pacote de áudio do cache de build: $CACHE_ZIP"
  cp "$CACHE_ZIP" /tmp/csbrasil-audio.zip
else
  rm -f "$CACHE_ZIP"
  echo "Baixando pacote de áudio de: $URL"
  curl --retry 5 --retry-delay 3 --retry-all-errors --connect-timeout 20 -fsSL \
    "${AUTH_ARGS[@]}" "$URL" -o /tmp/csbrasil-audio.zip
  confere_sha /tmp/csbrasil-audio.zip
  if [ -d "$CACHE_DIR" ]; then cp /tmp/csbrasil-audio.zip "$CACHE_ZIP"; fi
fi
unzip -o -q /tmp/csbrasil-audio.zip -d "$DEST/"
[ -f "$DEST/manifest.json" ] || cp "$DEST/manifest.example.json" "$DEST/manifest.json"
prepara_ambiencia
echo "Pronto. Áudio instalado em $DEST/."
