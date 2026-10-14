/* pos-alvo-check.mjs — o pós-processamento só pega o que vai para a TELA?
 *
 * `enableLightBloom` troca `renderer.render` e criava um EffectComposer para QUALQUER objeto
 * desenhado, inclusive o `Mesh` que o PMREMGenerator desenha num render target próprio ao
 * montar o IBL da partida (`Game._buildEnvMap`, `fromEquirectangular`). O composer mandava
 * esse desenho para a tela, o alvo do PMREM ficava vazio e cada Mesh deixava um composer
 * preso no Map. Medido no navegador (GPU, med, piscina_treta): `_envRT` com 0% de texel
 * não nulo com pós ligado, 25-100% por faixa com `?bloom=0`; 57 dos 58 composers vivos
 * depois de três partidas tinham um Mesh como chave.
 *
 *   PA1  desenhar um Mesh solto não cria composer;
 *   PA2  desenhar uma cena com render target ligado não cria composer;
 *   PA3  controle: a cena desenhada na tela continua passando pelo pós;
 *   PA4  o PMREM real (`fromEquirectangular`) não cria composer nenhum.
 *
 * Mutação (sai 1 se a mutação PASSAR):
 *   --mutante=sem-guarda   importa uma cópia do bloom.js sem a guarda do `patched`
 *
 *   node tools/eval/pos-alvo-check.mjs
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { renderer, THREE } from './harness.mjs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'sem-guarda'].includes(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(1);
}
const AQUI = path.dirname(fileURLToPath(import.meta.url));
let bloomUrl = pathToFileURL(path.join(AQUI, '../../public/js/bloom.js')).href;
let copia = null;
if (MUTANTE === 'sem-guarda') {
  const fonte = readFileSync(path.join(AQUI, '../../public/js/bloom.js'), 'utf8');
  const mutada = fonte
    .replace(/^.*if \(!scene\.isScene \|\| renderer\.getRenderTarget\(\) !== null\).*$/m, '')
    .replaceAll("from '../vendor/", "from '../../public/vendor/")
    .replaceAll("from './", "from '../../public/js/");
  if (!/^.*isScene/m.test(fonte) || /getRenderTarget\(\) !== null\) return rawRender/.test(mutada)) {
    console.error('MUTANTE NAO APLICOU: sem-guarda'); process.exit(1);
  }
  copia = path.join(AQUI, `.pos-alvo-mutante-${process.pid}.mjs`);
  writeFileSync(copia, mutada);
  bloomUrl = pathToFileURL(copia).href;
}
let enableLightBloom, alvoDoPos;
try { ({ enableLightBloom, alvoDoPos } = await import(bloomUrl)); } finally { if (copia) rmSync(copia, { force: true }); }

let alvo = null;
renderer.setRenderTarget = (rt) => { alvo = rt || null; };
renderer.getRenderTarget = () => alvo;
let composersCriados = 0;
const getSize = renderer.getSize;
renderer.getSize = (v) => { composersCriados++; return getSize(v); };   // EffectComposer chama no construtor
enableLightBloom(renderer, { quality: 'med' });
const cam = new THREE.PerspectiveCamera(60, 1.5, 0.1, 100);

const solto = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
renderer.render(solto, cam);
const pa1 = alvoDoPos(solto);

const fora = new THREE.Scene();
renderer.setRenderTarget(new THREE.WebGLRenderTarget(8, 8));
renderer.render(fora, cam);
renderer.setRenderTarget(null);
const pa2 = alvoDoPos(fora);

const tela = new THREE.Scene();
renderer.render(tela, cam);
const pa3 = alvoDoPos(tela);

const antes = composersCriados;
const eq = new THREE.DataTexture(new Float32Array(16 * 8 * 4).fill(0.5), 16, 8, THREE.RGBAFormat, THREE.FloatType);
eq.mapping = THREE.EquirectangularReflectionMapping; eq.needsUpdate = true;
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.fromEquirectangular(eq);
const pa4 = composersCriados - antes;

const res = [
  ['PA1', 'Mesh solto não ganha composer', pa1 === null, `alvoDoPos=${JSON.stringify(pa1)}`],
  ['PA2', 'cena com render target ligado não ganha composer', pa2 === null, `alvoDoPos=${JSON.stringify(pa2)}`],
  ['PA3', 'controle: cena na tela passa pelo pós', !!pa3, `alvoDoPos=${JSON.stringify(pa3)}`],
  ['PA4', 'PMREM do IBL não cria composer', pa4 === 0, `${pa4} composer(s) criados`],
];
for (const [id, desc, ok, evid] of res) console.log(`${ok ? '✓' : '✗'} ${id}  ${desc} — ${evid}`);
const falhou = res.some(([, , ok]) => !ok);
if (MUTANTE) {
  console.log(falhou ? `✓ mutante ${MUTANTE} ficou vermelho` : `✗ mutante ${MUTANTE} PASSOU — régua cega`);
  process.exit(falhou ? 0 : 1);
}
process.exit(falhou ? 1 : 0);
