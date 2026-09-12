import { readFileSync } from 'node:fs';

const CAMINHO_MAPS_PADRAO = new URL('../../public/js/maps.js', import.meta.url);

/* Lê somente as chaves do registro, sem importar `maps.js`: importar o módulo em
 * Node carrega a árvore 3D inteira e cria uma dependência de `three` que o CI de
 * assets não precisa ter. A fonte continua sendo o objeto MAPS autoritativo. */
export function carregarMapIds(caminho = CAMINHO_MAPS_PADRAO) {
  const fonte = readFileSync(caminho, 'utf8');
  const inicio = fonte.indexOf('export const MAPS = {');
  const fim = inicio < 0 ? -1 : fonte.indexOf('\n};', inicio);
  if (inicio < 0 || fim < 0) throw new Error(`registro MAPS não encontrado em ${caminho}`);
  const bloco = fonte.slice(inicio, fim);
  const ids = [...bloco.matchAll(/^\s{2}(?:'([^']+)'|"([^"]+)"|([a-zA-Z0-9_]+)):\s*\{/gm)]
    .map((match) => match[1] || match[2] || match[3]);
  if (!ids.length) throw new Error(`registro MAPS vazio em ${caminho}`);
  return ids;
}
