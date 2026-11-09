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
/* Mutantes de game.js: cada um altera UM ponto do jogo e tem de reprovar só a cláusula EX10/EX11 dele. */
const MUT_JOGO = {
  'jogo-flinch-mudo': ['_ctrl?.flinch?.({ x: _fx, z: _fz }, dmg / 100, head);', '', 'EX10a-flinch'],
  'jogo-flinch-sem-cabeca': ['_ctrl?.flinch?.({ x: _fx, z: _fz }, dmg / 100, head);', '_ctrl?.flinch?.({ x: _fx, z: _fz }, dmg / 100);', 'EX10a-flinch'],
  'jogo-granada-muda': ['this.playerTP?.ctrl?.grenade?.(ANIM_ARREMESSO);', '', 'EX10b-granada'],
  'jogo-saque-tp-mudo': ['if (weaponChanged) tp.ctrl?.draw?.();', '', 'EX10c-saque-jogador'],
  'jogo-saque-bot-mudo': ['if (oldGroup) next.ctrl?.draw?.();', '', 'EX10d-saque-bot'],
  'jogo-cerimonia-muda': ['    this._cerimoniaCorpos?.(winner);\n', '', 'EX10e-cerimonia'],
  'jogo-cerimonia-invertida': ['b.mesh?.ctrl?.ceremony?.(!!winner && winner === b.team)', 'b.mesh?.ctrl?.ceremony?.(!!winner && winner !== b.team)', 'EX10e-cerimonia'],
  'bot-strafe-espelhado': ['const lat = (mz * Math.sin(b.yaw) - mx * Math.cos(b.yaw)) / dtSafe;', 'const lat = (mx * Math.cos(b.yaw) - mz * Math.sin(b.yaw)) / dtSafe;', 'EX11-bot-strafe-lado'],
};
const mutants = ['strafe-mudo', 'reload-perna-congelada', 'hit-sem-direcao', 'saque-mudo', 'faca-usa-rifle', 'vitoria-muda', 'cerimonia-vira-idle', 'flinch-preso-no-hit', ...Object.keys(MUT_JOGO)];
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
const H = await import('./harness.mjs');
const { THREE, CHARACTERS } = H;
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
if (mutant === 'cerimonia-vira-idle') once("if (/^(victory|defeat)$/.test(this.curName || '')) {", 'if (false) {');
if (mutant === 'flinch-preso-no-hit') once("    this._hitClip = name.startsWith('hit_');", '');
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
const primeiroSaque = body();
primeiroSaque.ctrl.draw();
await esperaExtras(primeiroSaque, 'holster_rifle');
step(primeiroSaque, 30);
check('EX1b-primeiro-saque-lazy', () => { assert.equal(primeiroSaque.ctrl._upperName, 'draw_rifle'); });
a.ctrl.reload(1.2);
a.ctrl._requestExtras();
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
// Overlay procedural do flinch quando o clipe de hit não está tocando: medido contra um gêmeo sem tiro.
const cabecaCm = (x, y) => { x.group.updateMatrixWorld(true); y.group.updateMatrixWorld(true);
  return x.ctrl.headBone.getWorldPosition(new THREE.Vector3()).distanceTo(y.ctrl.headBone.getWorldPosition(new THREE.Vector3())) * 100; };
check('EX4c-flinch-sem-clipe-depois-de-hit', () => {
  const h = body(), g = body(); step(h, 30); step(g, 30);
  h.ctrl.flinch({ x: 1, z: 0 }, 1); step(h, 2); step(g, 2);
  assert.ok(/^hit_/.test(h.ctrl._upperName || ''), 'primeiro hit sem clipe');
  assert.equal(h.ctrl.flinchK, 0, 'overlay somado ao clipe de hit');
  step(h, 60); step(g, 60);
  assert.equal(h.ctrl._upperName, null, 'clipe de hit não terminou');
  h.ctrl.lod = 2; g.ctrl.lod = 2;   // LOD 2: _playUpper recusa o clipe, sobra o overlay
  h.ctrl.flinch({ x: 1, z: 0 }, 1); step(h, 5); step(g, 5);
  assert.equal(h.ctrl._upperName, null);
  assert.ok(h.ctrl.flinchK > 0.5, `flinchK ${h.ctrl.flinchK} no segundo hit sem clipe`);
  assert.ok(cabecaCm(h, g) > 3, `cabeça a ${cabecaCm(h, g).toFixed(2)} cm do gêmeo`);
});
check('EX4d-flinch-volta-se-clipe-interrompido', () => {
  const h = body(), g = body(); step(h, 30); step(g, 30);
  h.ctrl.flinch({ x: 1, z: 0 }, 1); step(h, 2); step(g, 2);
  h.ctrl.reload(1.2); g.ctrl.reload(1.2); step(h, 3); step(g, 3);
  assert.equal(h.ctrl._upperName, 'reload_rifle', 'recarga não tomou o trem superior');
  assert.ok(h.ctrl.flinchK > 0.5, `flinchK ${h.ctrl.flinchK} com o hit interrompido dentro da janela de 0,18 s`);
  assert.ok(cabecaCm(h, g) > 3, `cabeça a ${cabecaCm(h, g).toFixed(2)} cm do gêmeo`);
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
check('EX8b-cerimonia-segura-parado', () => {
  // _endRound chama ceremony() e o próximo update é o de quem está parado (moving 0).
  const c = body(); c.ctrl.ceremony(true); step(c, 30, 0);
  assert.equal(c.ctrl.curName, 'victory');
  assert.equal(c.ctrl.cur, c.ctrl.actions.victory);
  assert.ok(c.ctrl.actions.victory.getEffectiveWeight() > 0.99, `peso da vitória ${c.ctrl.actions.victory.getEffectiveWeight()}`);
  assert.ok(c.ctrl.actions.idle.getEffectiveWeight() < 0.01, 'idle voltou por cima da cerimônia');
});
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
/* EX10: os quatro call sites medidos no Game real (o mesmo que o harness sobe), com o
   CharController real espionado no protótipo: quem recebe a chamada e com quais argumentos. */
const JS = path.join(root, 'public/js');
let GameMod = { Game: H.Game };
if (MUT_JOGO[mutant]) {
  const [antes, depois] = MUT_JOGO[mutant];
  let jogoSrc = fs.readFileSync(path.join(JS, 'game.js'), 'utf8');
  assert.equal(jogoSrc.split(antes).length, 2, `mutante de game.js deve aplicar uma vez: ${antes}`);
  const prefixo = pathToFileURL(JS).href;
  jogoSrc = jogoSrc.replace(antes, depois)
    .replace(/from '(\.\/[^']+)'/g, (_, rel) => `from ${JSON.stringify(prefixo + rel.slice(1))}`)
    .replace(/import\('\.\//g, `import('${prefixo}/`);
  const tmp = fs.mkdtempSync(path.join(root, 'node_modules', '.estados3p-'));
  try {
    const f = path.join(tmp, 'game.mjs'); fs.writeFileSync(f, jogoSrc);
    GameMod = await import(pathToFileURL(f).href);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
const R = await import(pathToFileURL(path.join(JS, 'glbchars.js')).href);
await R.preloadCharacterAssets(['barbudo', 'capitao'], { weapons: ['pistol', 'ak'] });
assert.ok(R.hasModel('barbudo') && R.hasModel('capitao'), 'GLB barbudo/capitao ausente');
const protoCtrl = Object.getPrototypeOf(R.buildCharacterModel(def('barbudo'), { weaponId: 'pistol' }).ctrl);
const chamadas = [];
for (const nome of ['flinch', 'draw', 'grenade', 'ceremony']) {
  const original = protoCtrl[nome];
  protoCtrl[nome] = function (...args) { chamadas.push({ nome, ctrl: this, args }); return original.apply(this, args); };
}
const de = (nome) => { const r = chamadas.filter((c) => c.nome === nome); chamadas.length = 0; return r; };
H.seedRandom(12345);
const jogo = new GameMod.Game({ renderer: H.renderer, textures: H.initTextures(), sfx: H.sfx,
  settings: { bots: 1, allyBots: 0, enemyBots: 1, quality: 'low', difficulty: 'normal', sens: 1 },
  playerCharId: 'barbudo', playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'SIM', mapId: 'posto_treta',
  ctf: false, testMode: true, matchRoster: { allyDefs: [], enemyDefs: [def('capitao')] }, matchWeapons: ['pistol'], onQuit() {}, onMatchEnd() {} });
jogo._ensureDolly = () => {}; jogo.killsToWin = Infinity; jogo.start(); jogo.state = 'live';
jogo._ensurePlayerTP(); de('draw');
const bot = jogo.bots.find((b) => b.alive && b.mesh?.ctrl);
assert.ok(jogo.playerTP?.ctrl && bot, 'Game real sem corpo 3P do jogador ou do bot');
jogo.time = 100; bot.protUntil = 0; jogo.player.protUntil = 0;
check('EX10a-flinch', () => {
  const hp0 = bot.hp; jogo._damage(bot, 20, jogo.player, 'pistol', true);
  const [b] = de('flinch');
  assert.ok(b, 'tiro no bot não chamou flinch');
  assert.equal(b.ctrl, bot.mesh.ctrl);
  assert.deepEqual(b.args, [{ x: bot.pos.x - jogo.player.pos.x, z: bot.pos.z - jogo.player.pos.z }, (hp0 - bot.hp) / 100, true]);
  jogo._damage(jogo.player, 10, bot, 'ak', false);
  const [p] = de('flinch');
  assert.ok(p && p.ctrl === jogo.playerTP.ctrl, 'tiro no jogador não chegou ao corpo 3P dele');
  assert.equal(p.args[2], false);
});
check('EX10b-granada', () => {
  const p = jogo.player; p.frags = 1; p._nextNade = 0; p.nadeBusyUntil = 0;
  jogo._throwNade('frag', 'frags', 1);
  const g = de('grenade');
  assert.equal(g.length, 1, `${g.length} chamada(s) de grenade`);
  assert.equal(g[0].ctrl, jogo.playerTP.ctrl);
  assert.deepEqual(g[0].args, [1.05]);
});
check('EX10c-saque-jogador', () => {
  const nova = jogo.player.weapon === 'ak' ? 'pistol' : 'ak';
  jogo.player.weapon = nova; jogo._ensurePlayerTP();
  const d = de('draw');
  assert.equal(d.length, 1, `${d.length} chamada(s) de draw na troca de arma`);
  assert.equal(d[0].ctrl, jogo.playerTP.ctrl);
  assert.equal(d[0].ctrl.weaponId, nova);
});
check('EX10d-saque-bot', () => {
  assert.ok(jogo._syncRemoteWeapon(bot, bot._meshWeapon === 'ak' ? 'pistol' : 'ak'), 'troca de arma do bot não reconstruiu o corpo');
  const d = de('draw');
  assert.equal(d.length, 1, `${d.length} chamada(s) de draw no bot`);
  assert.equal(d[0].ctrl, bot.mesh.ctrl);
});
check('EX10e-cerimonia', () => {
  jogo.roundKills = { E: 1, B: 0 }; jogo._endRound();
  const c = de('ceremony');
  const doBot = c.find((x) => x.ctrl === bot.mesh.ctrl), doJogador = c.find((x) => x.ctrl === jogo.playerTP.ctrl);
  assert.equal(c.length, 2, `${c.length} chamada(s) de ceremony no fim de rodada`);
  assert.deepEqual(doBot?.args, [false], 'bot do time perdedor');
  assert.deepEqual(doJogador?.args, [true], 'jogador do time vencedor');
});
/* EX11: bot do single-player andando de lado pelo _updateBot real. Posição e yaw do bot são
   roteirizados (setters ignorados, a IA não move o corpo); o resto do caminho é o do jogo.
   Convenção do jogador local (game.js, _updatePlayerTP): lateral > 0 = direita do corpo. */
jogo.state = 'live'; bot.alive = true; bot.target = null; bot.crouchBias = false; bot.mesh.ctrl.revive();
await esperaExtras(bot.mesh, 'strafe_right');
const ladoBot = (sinal) => {
  const yaw = 0.7, v = 2 * sinal, c = jogo.camera.position;
  let x = c.x + 5, z = c.z + 5;
  const pos = new THREE.Vector3(x, 0, z);
  Object.defineProperty(pos, 'x', { configurable: true, get: () => x, set() {} });
  Object.defineProperty(pos, 'z', { configurable: true, get: () => z, set() {} });
  const posOriginal = bot.pos;
  Object.defineProperty(bot, 'pos', { configurable: true, writable: true, value: pos });
  Object.defineProperty(bot, 'yaw', { configurable: true, get: () => yaw, set() {} });
  const ctrl = bot.mesh.ctrl, up = ctrl.update, laterais = [];
  ctrl.update = function (...args) { if (args.length >= 6) laterais.push(args[5]); return up.apply(this, args); };
  try {
    bot._lp = { x, z };
    for (let f = 0; f < 40; f++) {   // direita do corpo = −X local = (−cos yaw, sen yaw) no mundo
      x += -Math.cos(yaw) * v / 60; z += Math.sin(yaw) * v / 60;
      jogo._updateBot(bot, 1 / 60);
    }
  } finally {
    ctrl.update = up;
    delete bot.yaw; bot.yaw = yaw;
    Object.defineProperty(bot, 'pos', { configurable: true, writable: true, value: posOriginal });
  }
  const lado = sinal > 0 ? 'strafe_right' : 'strafe_left';
  return { lateral: laterais.at(-1), quadros: laterais.length, clipe: ctrl.curName, esperado: ctrl.oneHanded && ctrl.actions[`${lado}_pistol`] ? `${lado}_pistol` : lado };
};
check('EX11-bot-strafe-lado', () => {
  const dir = ladoBot(1), esq = ladoBot(-1);
  const txt = `direita lateral ${dir.lateral?.toFixed(2)} → ${dir.clipe}; esquerda lateral ${esq.lateral?.toFixed(2)} → ${esq.clipe}`;
  assert.ok(dir.quadros >= 30 && esq.quadros >= 30, `controlador recebeu ${dir.quadros}/${esq.quadros} updates com lateral`);
  assert.ok(dir.lateral > 1.5 && esq.lateral < -1.5, txt);
  assert.equal(dir.clipe, dir.esperado, txt);
  assert.equal(esq.clipe, esq.esperado, txt);
});

const failures = results.filter((x) => !x.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FALHA'} ${r.id}${r.erro ? ` · ${r.erro}` : ''}`);
if (mutant) {
  assert.ok(failures.length > 0, `MUTAÇÃO PASSOU — ${mutant}`);
  if (MUT_JOGO[mutant]) assert.deepEqual(failures.map((x) => x.id), [MUT_JOGO[mutant][2]], `mutante ${mutant} fora da cláusula dele`);
  console.log(`MUTANTE ${mutant} REPROVADO: ${failures.map((x) => x.id).join(', ')}`);
} else {
  assert.equal(failures.length, 0, `${failures.length} cláusulas vermelhas`);
  console.log(`ESTADOS3P VERDE: ${results.length} cláusulas; pack único, pernas independentes, direção e fallbacks`);
}
