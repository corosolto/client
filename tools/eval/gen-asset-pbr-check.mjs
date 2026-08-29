/* O gerador Meshy baixava a etapa `preview`, que a API define como malha sem textura.
   Isso transformava "gerar arquitetura" em outra fonte de caixas cinzas. O contrato
   permanente é preview -> refine, com PBR e textura 2K, antes de baixar o GLB final.
   Mutante: --mutante=sem-refine troca enable_pbr por false e precisa ficar vermelho. */
import { readFileSync } from 'node:fs';

const file = new URL('../gen-asset.mjs', import.meta.url);
let src = readFileSync(file, 'utf8');
const mutante = process.argv.includes('--mutante=sem-refine');
if (mutante) {
  const quebrado = src.replace('enable_pbr: true', 'enable_pbr: false');
  if (quebrado === src) throw new Error('MUTANTE NAO APLICOU: enable_pbr: true ausente');
  src = quebrado;
}

const checks = [
  ['AG1', 'Meshy cria uma tarefa refine a partir do preview',
    /mode:\s*['"]refine['"]/.test(src) && /preview_task_id:\s*previewTaskId/.test(src)],
  ['AG2', 'refine gera mapas PBR', /enable_pbr:\s*true/.test(src)],
  ['AG3', 'refine usa textura 2K, suficiente para prop de mapa',
    /texture_resolution:\s*['"]2k['"]/.test(src)],
  ['AG4', 'o download final acontece depois de poll da tarefa refine',
    /refineTaskId[\s\S]{0,1200}pollUntil\(refineTaskId\)[\s\S]{0,1600}download\(result\.url/.test(src)],
];

let falhas = 0;
for (const [id, desc, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc}`);
  if (!ok) falhas++;
}
if (falhas) {
  console.error(`ASSET-GEN PBR FALHA: ${falhas}/${checks.length} - rodar Meshy agora pode entregar geometria cinza.`);
  process.exitCode = 1;
} else if (mutante) {
  console.error('MUTANTE sem-refine sobreviveu');
  process.exitCode = 1;
} else console.log('ASSET-GEN PBR OK');
