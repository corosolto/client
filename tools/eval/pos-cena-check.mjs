/* pos-cena-check.mjs — o pós-processamento solta a cena quando a partida morre?
 *
 * `enableLightBloom` cria um EffectComposer por cena e o guarda num Map. Sem liberação,
 * cada partida (e cada fundo de menu) deixava a cena inteira e os render targets de tela
 * cheia presos para sempre. Medido no navegador (swiftshader, 1536×1024, piscina_treta):
 * `renderer.info.memory.textures` no menu subia ~47 por ciclo sair→jogar e o heap ~5 MB.
 *
 *   PC1  depois de `Game.dispose()`, todo render target que o pós usou na cena da partida
 *        recebeu `dispose`;
 *   PC2  e o pós não conhece mais a cena (`alvoDoPos` devolve null);
 *   PC3  o REINICIAR descarta a partida e aguarda o preload com `game` ainda apontando para
 *        ela, então o loop continua desenhando a cena morta: o pós não pode adotá-la de novo.
 *   PC4  `rebuildMenuBackdrop` de main.js (extraída do texto, como em tests/menu-backdrop)
 *        libera o pós do fundo de menu que ela troca.
 *   PC5  o pipeline estilizado (`?style=1`, stylize.js) guarda composers do mesmo jeito: o
 *        dispose da partida libera os render targets dele também;
 *   PC6  e desenhar a cena descartada não recria o composer estilizado.
 *
 * Mutações (sai 1 se a mutação PASSAR):
 *   --mutante=sem-chamada   remonta `Game.prototype.dispose` sem a linha que libera o pós
 *   --mutante=libera-vazio  troca a liberação instalada pelo bloom por uma função vazia
 *   --mutante=menu-sem-chamada  apaga de rebuildMenuBackdrop a linha que libera o pós
 *   --mutante=estilo-vazio  troca a liberação instalada pelo stylize por uma função vazia
 *
 *   node tools/eval/pos-cena-check.mjs
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { renderer, bootGame, initTextures, Game, THREE } from './harness.mjs';
import { enableLightBloom, alvoDoPos } from '../../public/js/bloom.js';
import { enableStylize } from '../../public/js/stylize.js';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'sem-chamada', 'libera-vazio', 'menu-sem-chamada', 'estilo-vazio'].includes(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE}`);
  process.exit(1);
}

const desligaBloom = enableLightBloom(renderer, { quality: 'med' });
if (MUTANTE === 'libera-vazio') renderer.liberaPosDaCena = () => {};
if (MUTANTE === 'sem-chamada') {
  const fonte = Game.prototype.dispose.toString();
  const mutada = fonte.replace(/^.*liberaPosDaCena.*$/m, '');
  if (mutada === fonte) { console.error('MUTANTE NAO APLICOU: sem-chamada'); process.exit(1); }
  Game.prototype.dispose = new Function(`return ({ ${mutada} }).dispose;`)();
}

const usados = new Set();
renderer.setRenderTarget = (rt) => { if (rt) usados.add(rt); };

const g = bootGame('praca_poderes', { textures: initTextures() });
usados.clear();
renderer.render(g.scene, g.camera);
const vivos = new Set(usados);
for (const rt of usados) rt.addEventListener('dispose', () => vivos.delete(rt));
const nUsados = usados.size;
const antes = alvoDoPos(g.scene);
g.dispose();
const depois = alvoDoPos(g.scene);
renderer.render(g.scene, g.camera);
const readotada = alvoDoPos(g.scene);

const main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const ini = main.indexOf('function rebuildMenuBackdrop(');
const fim = main.indexOf('\n}', ini);
if (ini < 0 || fim < 0) { console.error('rebuildMenuBackdrop não encontrada em public/js/main.js'); process.exit(1); }
let rebuild = main.slice(ini, fim + 2);
if (MUTANTE === 'menu-sem-chamada') {
  const mutada = rebuild.replace(/^.*liberaPosDaCena.*$/m, '');
  if (mutada === rebuild) { console.error('MUTANTE NAO APLICOU: menu-sem-chamada'); process.exit(1); }
  rebuild = mutada;
}
const fundoVelho = new THREE.Scene();
fundoVelho.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
renderer.render(fundoVelho, g.camera);
const menuAntes = alvoDoPos(fundoVelho);
const ctx = vm.createContext({ renderer, THREE, menuScene: fundoVelho, menuBackdropWorld: null, currentMap: 'm', textures: null, MAPS: { m: { build() {} } }, settings: { quality: 'med' }, ajustarAnisotropia() {} });
vm.runInContext(`${rebuild}\nrebuildMenuBackdrop(MAPS.m);`, ctx);
const menuDepois = alvoDoPos(fundoVelho);

// Estilizado: no jogo ele entra no lugar do bloom, nunca junto. Desliga o bloom e tira a
// liberação dele do renderer, senão a do bloom responderia pelo stylize.
desligaBloom();
delete renderer.liberaPosDaCena;
enableStylize(renderer, { bloom: true });
if (MUTANTE === 'estilo-vazio') renderer.liberaPosDaCena = () => {};
const gs = bootGame('praca_poderes', { textures: initTextures() });
usados.clear();
renderer.render(gs.scene, gs.camera);
const vivosEst = new Set(usados);
for (const rt of usados) rt.addEventListener('dispose', () => vivosEst.delete(rt));
const nEst = usados.size;
gs.dispose();
usados.clear();
renderer.render(gs.scene, gs.camera);
const readotadosEst = usados.size;

const res = [
  ['PC1', 'render targets do pós liberados no dispose da partida',
    nUsados > 0 && vivos.size === 0, `${nUsados - vivos.size}/${nUsados} liberados`],
  ['PC2', 'o pós esquece a cena da partida descartada',
    !!antes && depois === null, `antes=${JSON.stringify(antes)} depois=${JSON.stringify(depois)}`],
  ['PC3', 'desenhar a cena descartada não recria o composer',
    readotada === null, `depois de desenhar=${JSON.stringify(readotada)}`],
  ['PC4', 'trocar o fundo de menu libera o pós do fundo antigo',
    !!menuAntes && menuDepois === null && ctx.menuScene !== fundoVelho,
    `antes=${JSON.stringify(menuAntes)} depois=${JSON.stringify(menuDepois)} — public/js/main.js rebuildMenuBackdrop`],
  ['PC5', 'render targets do estilizado liberados no dispose da partida',
    nEst > 0 && vivosEst.size === 0, `${nEst - vivosEst.size}/${nEst} liberados — public/js/stylize.js`],
  ['PC6', 'desenhar a cena descartada não recria o composer estilizado',
    readotadosEst === 0, `${readotadosEst} render targets usados depois do dispose`],
];
for (const [id, desc, ok, evid] of res) console.log(`${ok ? '✓' : '✗'} ${id}  ${desc} — ${evid}`);
const falhou = res.some(([, , ok]) => !ok);
if (MUTANTE) {
  console.log(falhou ? `✓ mutante ${MUTANTE} ficou vermelho` : `✗ mutante ${MUTANTE} PASSOU — régua cega`);
  process.exit(falhou ? 0 : 1);
}
process.exit(falhou ? 1 : 0);
