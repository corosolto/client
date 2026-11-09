#!/usr/bin/env node
/* Estados extras 3P: pack único lazy, direção 8-way, overlays sem congelar pernas,
   reação direcional, saque, faca, granada e cerimônia. Roda GLB/AnimationMixer reais.
   Cada mutante reintroduz um defeito visível e precisa reprovar a cláusula correspondente. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutant = process.argv.find((x) => x.startsWith('--mutante='))?.split('=')[1] || '';
const mutants = ['strafe-mudo', 'reload-perna-congelada', 'hit-sem-direcao', 'saque-mudo', 'faca-usa-rifle', 'vitoria-muda'];
assert.ok(!mutant || mutants.includes(mutant), `mutante desconhecido: ${mutant}`);
if (process.argv.includes('--self-test')) {
  for (const kind of ['', ...mutants]) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(kind ? [`--mutante=${kind}`] : [])], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, `${kind || 'normal'}: ${result.stderr.slice(-900)}`);
    assert.ok(result.stdout.includes(kind ? `MUTANTE ${kind} REPROVADO` : 'ESTADOS3P VERDE'), result.stdout.slice(-900));
    console.log(result.stdout.trim());
  }
  process.exit(0);
}

const requests = [];
const assetPath = (url) => path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
const localFetch = async (url) => {
  requests.push(String(url));
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 });
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const { THREE, CHARACTERS } = await import('./harness.mjs');
const { GLTFLoader } = await import('../../public/vendor/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  requests.push(String(url));
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    texture.needsUpdate = true; return texture;
  } }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(assetPath(url));
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((error) => { if (fail) fail(error); else throw error; });
};

let source = fs.readFileSync(path.join(root, 'public/js/glbchars.js'), 'utf8');
const once = (before, after) => {
  assert.equal(source.split(before).length, 2, `mutante deve aplicar uma vez: ${before}`);
  source = source.replace(before, after);
};
if (mutant === 'strafe-mudo') once('this._setLocoDirecional(', 'this._setLocoSemDirecao(');
if (mutant === 'reload-perna-congelada') once('this._playUpper(name, Math.max(0.05, this._reloadDur - this._reloadT))', 'this._playFull(name, Math.max(0.05, this._reloadDur - this._reloadT))');
if (mutant === 'hit-sem-direcao') once("return `hit_${quadrante}`;", "return 'hit_front';");
if (mutant === 'saque-mudo') once("this._playUpper(`draw_${this.oneHanded ? 'pistol' : 'rifle'}`, 0.65);", "this._playUpper('estado_inexistente', 0.65);");
if (mutant === 'faca-usa-rifle') once("this._playUpper('knife_stab'", "this._playUpper('shoot'");
if (mutant === 'vitoria-muda') once("this._to(nome);", "this._to('idle');");
source = source.replace(/from (['"])([^'"\n]+)\1/g, (all, quote, spec) => {
  const file = spec === 'three' ? path.join(root, 'public/vendor/three.module.js')
    : spec.startsWith('three/addons/') ? path.join(root, 'public/vendor/addons', spec.slice(13))
      : spec.startsWith('.') ? path.resolve(root, 'public/js', spec) : null;
  return file ? `from ${quote}${pathToFileURL(file).href}${quote}` : all;
});
const G = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
await G.preloadCharacterAssets(['adjim', 'capitao']);
const def = (id) => CHARACTERS.find((x) => x.id === id);
const body = (id = 'adjim', weapon = 'ak') => {
  const b = G.buildCharacterModel(def(id), { weaponId: weapon });
  assert.ok(b?.ctrl, `${id}/${weapon}: modelo real`);
  return b;
};
const step = (b, frames, moving = 0, back = false, lateral = 0) => {
  for (let i = 0; i < frames; i++) b.ctrl.update(1 / 60, moving, moving > 0, moving ? 2 : 0, back, lateral);
  b.group.updateMatrixWorld(true);
};
const esperaExtras = async (b, name) => {
  for (let i = 0; i < 100 && !b.ctrl.actions[name]; i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(b.ctrl.actions[name], `clipe lazy ${name} não registrou`);
};
const foot = (b) => b.ctrl.corpo.get('LeftFoot').getWorldQuaternion(new THREE.Quaternion()).toArray();
const results = [];
const check = (id, fn) => { try { fn(); results.push({ id, ok: true }); } catch (e) { results.push({ id, ok: false, erro: e.message }); } };

const a = body();
assert.ok(!a.ctrl.actions.strafe_left, 'extras não podem ser preload');
a.ctrl.reload(1.2);
await esperaExtras(a, 'reload_rifle');
check('EX1-pack-lazy', () => {
  assert.equal(requests.filter((u) => u.includes('models/anims/extras.glb')).length, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'public/models/anims/index.json'))).extras.length, 21);
});
step(a, 30);
check('EX2-strafe-8way', () => {
  step(a, 12, 1, false, 2);
  assert.equal(a.ctrl._locoAName, 'strafe_right');
  step(a, 12, 1, false, Math.SQRT2);
  assert.ok(a.ctrl._locoBName && a.ctrl._locoMix > 0.2 && a.ctrl._locoMix < 0.8, 'diagonal precisa misturar dois clipes');
  assert.ok(Math.abs(a.ctrl._locoA.weight + a.ctrl._locoB.weight - 1) < 1e-6, 'pesos precisam somar 1');
  const f = body(); const anterior = f.ctrl.cur; step(f, 30, 1); assert.ok(anterior.getEffectiveWeight() < 0.01, 'ação antiga não fez fade');
});
const r = body(), controle = body();
await esperaExtras(r, 'reload_rifle');
step(r, 60, 1); step(controle, 60, 1);
r.ctrl.reload(1.2); step(r, 12, 1); step(controle, 12, 1);
check('EX3-reload-pernas-livres', () => {
  assert.equal(r.ctrl._upperName, 'reload_rifle');
  const antes = foot(r), depois = foot(controle);
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(antes[i] - depois[i]) < 1e-6, `perna mudou no componente ${i}`);
  step(r, 12, 1); step(controle, 12, 1);
  const anguloPerna = r.ctrl.corpo.get('LeftFoot').getWorldQuaternion(new THREE.Quaternion()).angleTo(controle.ctrl.corpo.get('LeftFoot').getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(anguloPerna < 1e-3, `recarga alterou perna em ${anguloPerna} rad`);
});
check('EX4-hit-direcao', () => {
  a.ctrl.flinch({ x: 0, z: -1 }, 0.5, false); assert.equal(a.ctrl._upperName, 'hit_front');
  a.ctrl.flinch({ x: 0, z: 1 }, 0.5, false); assert.equal(a.ctrl._upperName, 'hit_back');
  a.ctrl.flinch({ x: 1, z: 0 }, 0.5, false); assert.equal(a.ctrl._upperName, 'hit_right');
  a.ctrl.flinch({ x: 0, z: -1 }, 0.5, true); assert.equal(a.ctrl._upperName, 'hit_head');
});
check('EX4b-hit-retoma-reload', () => {
  const h = body(); h.ctrl.reload(2); step(h, 6); h.ctrl.flinch({ x: 1, z: 0 }, 1); step(h, 32);
  assert.equal(h.ctrl._upperName, 'reload_rifle');
});
check('EX5-saque', () => {
  a.ctrl.draw(); assert.equal(a.ctrl._upperName, 'holster_rifle');
  step(a, 30); assert.equal(a.ctrl._upperName, 'draw_rifle');
});
check('EX5b-saque-morre', () => {
  const d = body(); d.ctrl.draw(); step(d, 4); d.ctrl.die(); d.ctrl.revive(); d.ctrl.flinch({ x: 1, z: 0 }, 1); step(d, 32);
  assert.notEqual(d.ctrl._upperName, 'draw_rifle');
});
check('EX6-faca', () => {
  const k = body('capitao', 'knife');
  step(k, 2); assert.equal(k.ctrl._upperName, 'knife_idle'); assert.notEqual(k.ctrl.curName, 'knife_idle');
  k.ctrl.shoot(); assert.equal(k.ctrl._upperName, 'knife_stab');
  step(k, 2); assert.equal(k.ctrl._upperName, 'knife_stab');
  assert.notEqual(k.ctrl.curName, 'shoot');
});
check('EX7-granada', () => { a.ctrl.grenade(); assert.equal(a.ctrl._upperName, 'grenade_throw'); assert.equal(a.ctrl._upperDur, 1.05); });
check('EX8-cerimonia', () => { a.ctrl.ceremony(true); assert.equal(a.ctrl.curName, 'victory'); a.ctrl.ceremony(false); assert.equal(a.ctrl.curName, 'defeat'); a.ctrl.revive(); step(a, 30, 1); assert.ok(!/^(victory|defeat)$/.test(a.ctrl.curName)); });
check('EX9-lod-fallback', () => {
  const l = body(); l.ctrl.lod = 2; l.ctrl.reload(1); step(l, 2); assert.equal(l.ctrl._upperName, null);
});
if (!mutant) {
  const ausente = source.replace("assetUrl('models/anims/extras.glb')", "assetUrl('models/anims/extras-ausente.glb')");
  const M = await import('data:text/javascript;base64,' + Buffer.from(ausente).toString('base64'));
  await M.preloadCharacterAssets(['adjim']);
  const m = M.buildCharacterModel(def('adjim'), { weaponId: 'ak' });
  m.ctrl.reload(1); step(m, 12);
  check('EX9b-pack-ausente', () => { assert.equal(m.ctrl._upperName, null); assert.ok(m.ctrl.reloadK > 0.5); });
}
const gameSource = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
check('EX10-callsites', () => {
  assert.ok(gameSource.includes('flinch?.({ x: _fx, z: _fz }, dmg / 100, head)'));
  assert.ok(gameSource.includes('ctrl?.grenade?.(ANIM_ARREMESSO)'));
  assert.ok(gameSource.includes('ctrl?.draw?.()'));
  assert.ok(gameSource.includes('ctrl?.ceremony?.('));
});

const failures = results.filter((x) => !x.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FALHA'} ${r.id}${r.erro ? ` · ${r.erro}` : ''}`);
if (mutant) {
  assert.ok(failures.length > 0, `MUTAÇÃO PASSOU — ${mutant}`);
  console.log(`MUTANTE ${mutant} REPROVADO: ${failures.map((x) => x.id).join(', ')}`);
} else {
  assert.equal(failures.length, 0, `${failures.length} cláusulas vermelhas`);
  console.log(`ESTADOS3P VERDE: ${results.length} cláusulas; pack único, pernas independentes, direção e fallbacks`);
}
