# Gravações reais dos javaporcos

Licenças conferidas nas páginas originais em 30/10/2026. Ambos os arquivos são
CC0 1.0: <https://creativecommons.org/publicdomain/zero/1.0/>. Não há imitação
humana nem voz sintetizada. O grunhido de egomassive é uma edição de gravação de
campo de Felix Blume; os dois autores estão creditados abaixo.

| uso | título / autor | fonte original | arquivo do runtime |
|---|---|---|---|
| rosnado, fuçar, horda | Pig.ogg — egomassive; gravação original de Felix Blume | https://freesound.org/people/egomassive/sounds/536746/ ; https://freesound.org/people/felix.blume/sounds/158746/ | audio/a/3d13ee49765e6d35.mp3 |
| carga e morte | Pig - Scream 5 - 96kHz.wav — Jarred Gibb | https://freesound.org/people/JarredGibb/sounds/233151/ | audio/a/3eaaf17558623665.mp3 |

Os previews HQ disponibilizados pelo Freesound são baixados sem autenticação pelo
instalador `tools/audio/javaporcos-samples.mjs`, chamado por `scripts/fetch-audio.sh`
tanto no desenvolvimento como no build. Binários ficam fora do Git. URLs e hashes
SHA-256 completos são a fonte única em `public/js/data/javaporcos_audio.js`.
Hash divergente reprova a instalação; não substitui gravação por síntese.

Processamento no WebAudio: decodificação cacheada, normalização de pico por arquivo,
recortes curtos com envelopes e pequenas variações de velocidade. O modo conserva
o orçamento existente de vozes/energia e a espacialização de volume, pan e delay.
A horda combina grunhidos defasados dentro de um slot. Os arquivos não representam
uma captura de morte: o guincho real é utilizado como efeito de jogo.

Medição local com ffprobe, após download: grunhido 1,358292 s / 21.912 bytes;
guincho 1,965583 s / 48.192 bytes. Aceite auditivo humano ainda pendente.
