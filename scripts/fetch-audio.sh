#!/usr/bin/env bash
# Baixa o pacote de áudio para public/audio/. O pack pode vir de release pública ou do
# Blob privado incorporado ao build; em ambos os casos os bytes continuam fora do Git.
set -e
cd "$(dirname "$0")/.."

# URL do zip do pacote. Configure pela env AUDIO_PACK_URL ou edite aqui
# (ex.: asset de GitHub Release, ou URL privada de R2/S3 para deploys).
# Pacote completo — vozes/rounds/SFX/menu/ingame — com nomes hasheados
# (decisão do dono: nenhum título legível em URL/zip). Fecha o BUG-19
# (produção servia o pack de julho e todo som novo dava 404).
URL="${AUDIO_PACK_URL:-https://github.com/corosolto/client/releases/download/audio-pack-v8/audio-pack.zip}"
DEST="public/audio"
AUTH_ARGS=()

case "$URL" in
  https://*.private.blob.vercel-storage.com/*)
    : "${BLOB_READ_WRITE_TOKEN:?BLOB_READ_WRITE_TOKEN ausente para o pacote privado de audio}"
    : "${AUDIO_PACK_SHA256:?AUDIO_PACK_SHA256 ausente para verificar o pacote privado de audio}"
    AUTH_ARGS=(-H "Authorization: Bearer ${BLOB_READ_WRITE_TOKEN}")
    ;;
esac

if [ -f "$DEST/manifest.json" ] && [ "${VERCEL:-}" != "1" ]; then
  node tools/audio/extend-map-soundscapes.mjs "$DEST/manifest.json"
  node tools/audio/lajes-soundscape.mjs "$DEST/manifest.json"
  echo "audio/ já configurado — nada a fazer."
  exit 0
fi
mkdir -p "$DEST"
echo "Baixando pacote de áudio de: $URL"
curl --retry 5 --retry-delay 3 --retry-all-errors --connect-timeout 20 -fsSL \
  "${AUTH_ARGS[@]}" "$URL" -o /tmp/csbrasil-audio.zip
if [ -n "${AUDIO_PACK_SHA256:-}" ]; then
  printf '%s  %s\n' "$AUDIO_PACK_SHA256" /tmp/csbrasil-audio.zip | shasum -a 256 -c -
fi
unzip -o -q /tmp/csbrasil-audio.zip -d "$DEST/"
[ -f "$DEST/manifest.json" ] || cp "$DEST/manifest.example.json" "$DEST/manifest.json"
node tools/audio/extend-map-soundscapes.mjs "$DEST/manifest.json"
node tools/audio/lajes-soundscape.mjs "$DEST/manifest.json"
echo "Pronto. Áudio instalado em $DEST/."
