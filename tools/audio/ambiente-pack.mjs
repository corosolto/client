/* ============================================================================
   ambiente-pack.mjs — O MAPA nome → a/<sha1-16> DO PACK v9, ESCRITO UMA VEZ SÓ.
   ----------------------------------------------------------------------------
   Os arquivos de ambiência (plans/22) entram no pack com nome binário — decisão
   do dono: nenhum título legível em URL/zip. O jogo, porém, nomeia os arquivos
   pelo nome (`soundscape.js`: `audio/ambiente/grilos.mp3`). Alguém precisa
   traduzir, e a tradução não pode morar na cabeça de quem empacota:

     · `tools/audio/ambiente-mapas.mjs` usa a tabela para escrever os overrides
       `mapSoundscapes` do manifest com os caminhos RESOLVIDOS do pack;
     · `tools/eval/soundscape-contract-check.mjs` usa a MESMA tabela (lição 2:
       mesmo conceito, mesma fonte) para cobrar do pack, na release, cada entrada
       que o código nomeia.

   O esquema de nomes é o do empacotador (`scripts/build-audio-pack.mjs`):
   `a/<sha1 do conteúdo, 16 hex>.<ext>` — as 17 entradas do v9 foram geradas PELO
   empacotador real, então a tabela é verificável por conteúdo, não por fé:
   `sha1Arquivo(caminho) === hash` tem de valer para todo arquivo instalado.
   Procedência arquivo a arquivo: `public/audio/ambiente/FONTE.md`.
   ============================================================================ */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const AMBIENTE_PACK = Object.freeze({
  'funk-bar.mp3': '54e0c05ef0bbcb42',
  'grilos.mp3': '3824f90eabcc611e',
  'passaros.mp3': '0fef0e9bde2b37f4',
  'vento.mp3': '2646fa0e5181cd8c',
  'ondas.mp3': '00555596fbe1cf8d',
  'agua-corrego.mp3': '91625b5c89fbf198',
  'piscina.mp3': '2919480ad1faa614',
  'cidade.mp3': '3ed86e69a972bcd5',
  'obra.mp3': 'e5f57cc4cbd639b2',
  'hum-indoor.mp3': '98220cbea06991bd',
  'latido-1.mp3': '636762ba2fadd647',
  'latido-2.mp3': '4df6a654317bf53f',
  'galo.mp3': 'e596fd95f61cc0a5',
  'passaro-1.mp3': 'f929730d2c83b607',
  'passaro-2.mp3': '166ad706345bcbac',
  'panela.mp3': 'b583d89468da7c86',
  'buzina.mp3': 'f56c84909a6b6446',
});

const PREFIXO = 'audio/ambiente/';

/* `audio/ambiente/grilos.mp3` -> `audio/a/3824f90eabcc611e.mp3`; null quando o
   src não é de ambiência OU não está catalogado (catálogo menor que o código é
   defeito que as réguas têm de ver, não coincidência pra engolir). */
export function resolveAmbientePack(src) {
  if (typeof src !== 'string' || !src.startsWith(PREFIXO)) return null;
  const hash = AMBIENTE_PACK[src.slice(PREFIXO.length)];
  return hash ? `audio/a/${hash}.mp3` : null;
}

export function sha1Arquivo(caminho) {
  return createHash('sha1').update(readFileSync(caminho)).digest('hex').slice(0, 16);
}
