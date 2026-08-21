#!/usr/bin/env bash
# Baixa o pacote de áudio (vozes meme + sons de arma) para public/game/audio/.
# O pacote NÃO fica no git por licenciamento — ver README, seção "Pacote de áudio".
set -e
cd "$(dirname "$0")/.."

# URL do zip do pacote. Configure pela env AUDIO_PACK_URL ou edite aqui
# (ex.: asset de GitHub Release, ou URL privada de R2/S3 para deploys).
# Pacote completo — vozes/rounds/SFX/menu/ingame — com nomes hasheados
# (decisão do dono: nenhum título legível em URL/zip). Fecha o BUG-19
# (produção servia o pack de julho e todo som novo dava 404).
URL="${AUDIO_PACK_URL:-https://github.com/corosolto/client/releases/download/audio-pack-v6/audio-pack.zip}"
DEST="public/audio"

if [ -f "$DEST/manifest.json" ]; then
  echo "audio/ já configurado — nada a fazer."
  exit 0
fi
mkdir -p "$DEST"
echo "Baixando pacote de áudio de: $URL"
curl --retry 5 --retry-delay 3 --retry-all-errors --connect-timeout 20 -fsSL "$URL" -o /tmp/csbrasil-audio.zip
unzip -o -q /tmp/csbrasil-audio.zip -d "$DEST/"
[ -f "$DEST/manifest.json" ] || cp "$DEST/manifest.example.json" "$DEST/manifest.json"
echo "Pronto. Áudio instalado em $DEST/."
