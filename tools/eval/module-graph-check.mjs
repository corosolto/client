/* ============================================================================
   module-graph-check.mjs — O GRAFO DE MÓDULOS DA ÁRVORE FECHA ANTES DO DEPLOY?
   ----------------------------------------------------------------------------
   O CASO (#524, 06/09/2026): `f95dcac0c` pôs em `sertao_map_preview.js`
     import { SERTAO_PREVIEW } from './map_preview_media.js';
   mas o arquivo da main só exportava `MAP_PREVIEW_MEDIA` — o capturador da
   Amazônia (`0af5e1180`) e o do Sertão escreviam o mesmo módulo. O CI ficou
   verde, a alpha subiu, e só o prod-watch viu: quatro reprovações em 3,5 h,
   purge do edge incluído, porque o defeito estava na ORIGEM e não no cache.
   Consertado à mão em `20430018b` (OPS-523). A régua para a classe já existia
   (`sondaBootLocal`, do `ops:diag`), mas só rodava quando alguém chamava.

   O QUE MEDE: sobe `public/` com o mesmo import map do index.astro e corre o
   `prod-coherence.mjs` contra ele. Reusa as duas peças; não copia nenhuma.

   MUTAÇÃO: `--mutante=06-09` copia a árvore JS para um diretório temporário,
   devolve a linha de import de 06/09 e EXIGE vermelho citando `SERTAO_PREVIEW`.

   Uso: node tools/eval/module-graph-check.mjs [--raiz=DIR] [--mutante=06-09]
   ============================================================================ */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { coerenciaDoGrafo, servidorEstaticoDePublic } from '../ops/probes/boot.mjs';
import { RAIZ_PADRAO } from '../ops/lib/repo.mjs';

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1];
const raiz = resolve(arg('raiz') || RAIZ_PADRAO);
const mutante = arg('mutante');
if (mutante && mutante !== '06-09') throw new Error(`mutante desconhecido: ${mutante}`);

async function mede(dir) {
  const s = await servidorEstaticoDePublic(dir);
  try { return await coerenciaDoGrafo(s.base, dir); } finally { await s.fechar(); }
}

function arvoreMutante() {
  const dir = mkdtempSync(join(tmpdir(), 'modgraph-'));
  for (const p of ['package.json', 'scripts/module-cache.mjs', 'tools/eval/prod-coherence.mjs', 'public/js', 'public/vendor'])
    cpSync(join(raiz, p), join(dir, p), { recursive: true });
  const alvo = join(dir, 'public/js/sertao_map_preview.js');
  const src = readFileSync(alvo, 'utf8');
  const mutado = src.replace(/from\s+'\.\/sertao_preview_media\.js'/, "from './map_preview_media.js'");
  if (mutado === src) throw new Error('mutante não aplicou: o import de sertao_preview_media.js mudou de forma');
  writeFileSync(alvo, mutado);
  return dir;
}

if (mutante) {
  const dir = arvoreMutante();
  try {
    const r = await mede(dir);
    if (r.exit === 0 || !r.problemas.some((p) => p.includes("'SERTAO_PREVIEW'"))) {
      console.error('MUTAÇÃO PASSOU — a régua está cega para o caso de 06/09.\n' + r.saida);
      process.exit(1);
    }
    console.log(`mutante 06-09 reprovado como devia: ${r.problemas[0]}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
} else {
  const r = await mede(raiz);
  if (r.exit !== 0) {
    console.error(`grafo de módulos da árvore NÃO fecha (${raiz}):`);
    for (const p of r.problemas.length ? r.problemas : [r.saida]) console.error('  ✗ ' + p);
    process.exit(1);
  }
  console.log('grafo de módulos da árvore fecha: todo import nomeado tem export no alvo.');
}
