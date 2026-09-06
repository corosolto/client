import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../public/vendor/three.module.js';

// Executa os consumidores reais com transporte GLB/DOM controlado; não julga imagem.
const read = file => readFileSync(new URL(`../../public/js/${file}`, import.meta.url), 'utf8');
const checks = [];
async function preload(mutant = '') {
  const requests = [];
  class GLTFLoader { load(url, done) { requests.push(url); done({ scene: new THREE.Group(), animations: [] }); } }
  let source = read('ambientlife.js').replace(/^import .*;$/mg, '').replace(/^export /mg, '');
  if (mutant === 'preload-global') {
    const changed = source.replace(/Object\.keys\(ASSETS\)\.filter\(id => !\[[^\]]+\]\.includes\(id\)\)/, 'Object.keys(ASSETS)');
    if (changed === source) throw Error('Mutante de preload não aplicado');
    source = changed;
  }
  if (mutant === 'lista-ignorada') source = source.replace('async function preloadAmbientLife(ids = FAVELA_AMBIENCE_ASSETS) {', 'async function preloadAmbientLife(ids = FAVELA_AMBIENCE_ASSETS) { ids = FAVELA_AMBIENCE_ASSETS;');
  const api = vm.runInNewContext(`(() => { ${source}; return { preloadAmbientLife }; })()`, { THREE, GLTFLoader, VERSION: 'test', console });
  await api.preloadAmbientLife();
  const defaultRequests = [...requests]; requests.length = 0;
  await api.preloadAmbientLife(['calango', 'lagarto', 'sertaoGoat', 'sertaoHen', 'sertaoChick']);
  return [!defaultRequests.some(url => /calango|lagarto|sertao_(cabra|galinha|pintinho)/.test(url)) && defaultRequests.some(url => /galinha_campo/.test(url)),
    requests.length === 5 && ['calango_quadrupede', 'lagarto_sertao', 'sertao_cabra', 'sertao_galinha', 'sertao_pintinho'].every(name => requests.some(url => url.includes(name)))];
}
function pause(mutant = false) {
  const source = read('game.js'), start = source.indexOf('  setPaused(v) {'), end = source.indexOf('\n  _now()', start);
  if (start < 0 || end < 0) throw Error('Método de pausa não localizado');
  let method = source.slice(start, end);
  if (mutant) method = method.replace('this.soundscape?.setPaused(v);', '');
  const calls = [], game = { state: 'live', touchMove: {}, el: { pause: { classList: { toggle() {} } } },
    soundscape: { setPaused(v) { calls.push(v); } }, _soltaAtalhos() {}, _now() { return 0; }, _syncPauseArm() {} };
  const fn = vm.runInNewContext(`({ ${method} }).setPaused`, { document: {}, PAUSE_ARM_MS: 300 });
  fn.call(game, true); fn.call(game, false);
  return calls.length === 2 && calls[0] === true && calls[1] === false;
}
const base = await preload();
checks.push({ id: 'SI1', ok: base[0], meaning: 'Fauna específica não amplia download dos outros mapas' },
  { id: 'SI2', ok: base[1], meaning: 'Lista explícita realmente carrega répteis e criação do Sertão' },
  { id: 'SI3', ok: pause(), meaning: 'Pausa e retomada chegam ao soundscape' });
const global = await preload('preload-global'), ignored = await preload('lista-ignorada');
const mutants = [{ name: 'preload-global', rejected: !global[0] }, { name: 'lista-ignorada', rejected: !ignored[1] }, { name: 'som-sem-pausa', rejected: !pause(true) }];
console.log(JSON.stringify({ checks, mutants }, null, 2));
process.exitCode = checks.every(c => c.ok) && mutants.every(m => m.rejected) ? 0 : 1;
