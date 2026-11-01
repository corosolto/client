// GLBs e controlador reais: a volta da recarga contra o mesmo histórico sem recarga.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutant = process.argv.find(x => x.startsWith('--mutante='))?.split('=')[1] || '';
const mutants = ['residuo', 'apos-tiro', 'apos-corrida', 'nao-finito'];
assert.ok(!mutant || mutants.includes(mutant), `mutante desconhecido: ${mutant}`);
if (process.argv.includes('--self-test')) {
  for (const kind of ['', ...mutants]) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(kind ? [`--mutante=${kind}`] : [])], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `${kind || 'normal'}: ${result.stderr.slice(-700)}`);
    assert.ok(result.stdout.includes(kind ? `MUTANTE ${kind} REPROVADO` : 'RECARGA PAREADA VERDE'), result.stdout.slice(-700));
    console.log(result.stdout.trim());
  }
  process.exit(0);
}

const assetPath = url => {
  const file = path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
  assert.ok(file.startsWith(path.join(root, 'public') + path.sep), 'asset fora de public');
  return file;
};
const localFetch = async url => {
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 });
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const { THREE, CHARACTERS } = await import('./harness.mjs');
const { GLTFLoader } = await import('../../public/vendor/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  } }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(assetPath(url));
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch(error => { if (fail) fail(error); else throw error; });
};

let source = fs.readFileSync(path.join(root, 'public/js/glbchars.js'), 'utf8');
const once = (before, after) => {
  assert.equal(source.split(before).length, 2, 'mutante deve aplicar uma vez na fonte real');
  source = source.replace(before, after);
};
if (mutant) {
  const condition = mutant === 'apos-tiro' ? 'this.shooting' : mutant === 'apos-corrida' ? "this._loco === 'run'" : 'true';
  once('reload(dur) {', `reload(dur) { this.__residuoTeste = (${condition});`);
  if (mutant === 'nao-finito') once('this.mixer.update(dt);', 'this.mixer.update(dt); if (this.__residuoTeste && this._reloadDur === 0) this.group.position.x = NaN;');
  else once('this.reloadK = this._reloadDur > 0 ? Math.sin(Math.PI * Math.min(1, this._reloadT / this._reloadDur)) : 0;',
    'this.reloadK = this._reloadDur > 0 ? Math.sin(Math.PI * Math.min(1, this._reloadT / this._reloadDur)) : (this.__residuoTeste ? 0.9 : 0);');
}
source = source.replace(/from (['"])([^'"\n]+)\1/g, (all, quote, spec) => {
  const file = spec === 'three' ? path.join(root, 'public/vendor/three.module.js')
    : spec.startsWith('three/addons/') ? path.join(root, 'public/vendor/addons', spec.slice(13))
      : spec.startsWith('.') ? path.resolve(root, 'public/js', spec) : null;
  return file ? `from ${quote}${pathToFileURL(file).href}${quote}` : all;
});
const G = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
await G.preloadCharacterAssets(['adjim', 'capitao']);

const weapons = ['uzi', 'ak', 'm4', 'mp5', 'shotgun', 'awp', 'mosin', 'g3', 'md97', 'm400', 'lmg', 'rem700', 'akm'];
const fixtures = [...weapons.map(weapon => ['adjim', weapon]), ['capitao', 'md97']];
const rows = [];
const step = (body, frames, moving = false) => {
  for (let i = 0; i < frames; i++) body.ctrl.update(1 / 60, moving ? 1 : 0, moving, moving ? 3.5 : 0, false, moving ? 3.5 : 0);
  body.group.updateMatrixWorld(true);
};
const hand = body => (body.ctrl.torso.lHand || body.ctrl.ikL.end).getWorldPosition(new THREE.Vector3());
for (const [id, weapon] of fixtures) for (const history of ['idle', 'tiro', 'corrida']) {
  const def = CHARACTERS.find(x => x.id === id);
  const measured = G.buildCharacterModel(def, { weaponId: weapon });
  const control = G.buildCharacterModel(def, { weaponId: weapon });
  assert.ok(measured?.ctrl?.ikL && control?.ctrl?.ikL, `${id}/${weapon}: corpos reais com IK`);
  for (const body of [measured, control]) {
    step(body, 120);
    if (history === 'tiro') { body.ctrl.shoot(); step(body, 3); }
    if (history === 'corrida') step(body, 90, true);
  }
  const initial = hand(measured);
  measured.ctrl.reload(1.2);
  step(measured, 36); step(control, 36);
  const mid = hand(measured).distanceTo(hand(control)) * 100;
  step(measured, 90); step(control, 90);
  rows.push({ id, weapon, history, returned: hand(measured).distanceTo(hand(control)) * 100,
    drift: initial.distanceTo(hand(control)) * 100, mid, duration: measured.ctrl._reloadDur });
  measured.ctrl.mixer.stopAllAction(); control.ctrl.mixer.stopAllAction();
}
const finite = row => [row.returned, row.mid, row.drift, row.duration].every(Number.isFinite);
const failures = rows.filter(row => !finite(row) || row.returned > 2 || row.duration !== 0);
const max = Math.max(...rows.map(row => row.returned));
assert.ok(rows.some(row => row.mid > 8), 'recarga move mão no modelo real');
assert.ok(rows.some(row => row.history === 'tiro' && row.drift > 2), 'controle separa transição do tiro de resíduo da recarga');
if (mutant) {
  const expected = mutant === 'apos-tiro' ? 'tiro' : mutant === 'apos-corrida' ? 'corrida' : null;
  assert.ok(failures.length > 0 && failures.every(row => row.duration === 0 && (mutant === 'nao-finito' ? !finite(row) : row.returned > 2 && (!expected || row.history === expected))), 'mutante precisa reprovar especificamente retorno2cm/finito no histórico esperado');
  console.log(`MUTANTE ${mutant} REPROVADO: ${failures.length}/${rows.length}, retorno máximo${max.toFixed(2)}cm; timers zerados`);
} else {
  assert.deepEqual(failures, [], 'retorno2cm em todos os históricos pareados');
  console.log(`RECARGA PAREADA VERDE: ${rows.length} casos, retorno máximo${max.toFixed(2)}cm; GLB/AnimationMixer reais, texturas brancas sem render`);
}
