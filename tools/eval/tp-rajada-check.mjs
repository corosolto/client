/* TPR — RAJADA EM 3ª PESSOA SEM MISTURAR COM A POSE DE BIND.
   Defeito (lane 1, 13/10/2026, mst + AK, 960×640, seed 1337): `CharController.shoot()` fazia
   reset()+fadeIn(0,06) a cada tiro. Com o `shoot` já corrente, o fade recomeçava do zero e
   nenhuma outra ação segurava peso: o mixer completava com a bind. Medido no navegador
   (capture-3p-baseline.mjs): peso total 0,28 e mão L a 30 cm do guarda-mão na rajada SP de
   0,1 s; no caminho MP (Netcode.updateRemoteBot, snapshot a 20 Hz) preso em 0,28.

   Mede em node, quadro a quadro (dt 1/60), o mst + AK pelo buildCharacterModel real:
     TPR1 · rajada SP parado, 0,1 s           peso ≥ 0,99 e mão L ≤ 2 cm em todo quadro
     TPR1b · rajada SP andando (walkfire)     idem
     TPR2 · rajada MP, tiro a cada snapshot   idem: o tiro entra como no applySnapshot (ctrl.shoot) e
            a pose sai do Netcode.prototype.updateRemoteBot real
     TPR3 · rajada MP na cadência da AK       idem
     TPR4 · tiro único: quadro a quadro igual ao shoot() antigo (o conserto só toca a rajada)
     TPR5 · idle/walk/run/death: peso ≥ 0,99 e mão L igual à da main
   Mutante: `--mutante=fade` devolve o reset()+fadeIn por tiro e tem que reprovar TPR1-3.
   Uso: node tools/eval/tp-rajada-check.mjs [--mutante=fade] */
import fs from 'node:fs';
import path from 'node:path';

const localFetch = async (url) => {
  const file = path.resolve('public', String(url).split('?')[0].replace(/^\//, ''));
  if (!fs.existsSync(file)) return new Response('', { status: 404 });
  return new Response(fs.readFileSync(file));
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const { THREE, CHARACTERS } = await import('./harness.mjs');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const file = path.resolve('public', url.split('?')[0].replace(/^\//, ''));
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'EXT_texture_webp',
    async loadTexture() { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; },
  }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(file);
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((e) => fail?.(e));
};
const G = await import('../../public/js/glbchars.js');
const { makeNetcode } = await import('../../public/js/netgame.js');

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'fade') throw new Error(`mutante desconhecido: ${MUT}`);
const CHAR = 'mst', ARMA = 'ak', DT = 1 / 60, PESO_MIN = 0.99, MAO_MAX_CM = 2;
const CADENCIA_AK = 0.1;

await G.preloadCharacterAssets([CHAR], { weapons: [ARMA] });
if (!G.hasModel(CHAR)) throw new Error(`${CHAR}.glb não carregou — a régua não sabe medir`);
const def = CHARACTERS.find((c) => c.id === CHAR);

function shootAntigo() {
  if (this.dead || this.crouch || !this.actions.shoot) return;
  this.shooting = true;
  this._shootUntil = this.mixer.time + this.actions.shoot.getClip().duration;
  this.actions.shoot.reset();
  this.actions.shoot.setLoop(THREE.LoopOnce, 1);
  this.actions.shoot.clampWhenFinished = true;
  this.actions.shoot.enabled = true; this.actions.shoot.fadeIn(0.06).play();
  if (this.cur && this.cur !== this.actions.shoot) this.cur.fadeOut(0.06);
  this.cur = this.actions.shoot;
}

function monta(shootFn) {
  const m = G.buildCharacterModel(def, { weaponId: ARMA });
  if (!m?.ctrl?.ikL || !m.ctrl.actions.shoot) throw new Error('sem IK da mão L ou sem clipe shoot no mst+AK — a régua não sabe medir');
  if (shootFn) m.ctrl.shoot = shootFn;
  else if (MUT === 'fade') m.ctrl.shoot = shootAntigo;
  m.ctrl.aimPitch = 0;
  for (let i = 0; i < 20; i++) m.ctrl.update(DT, 0, true, 0, false);
  return m;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function mede(m) {
  const c = m.ctrl;
  m.group.updateMatrixWorld(true);
  let peso = 0;
  for (const a of Object.values(c.actions)) if (a.enabled && c.mixer._isActiveAction(a)) peso += a.getEffectiveWeight();
  _a.copy(c.ikL.endOffset); c.ikL.end.localToWorld(_a);
  _b.copy(c.ikL.fore); c.ikL.gun.localToWorld(_b);
  return { peso, mao: _a.distanceTo(_b) * 100, clip: Object.keys(c.actions).find((k) => c.actions[k] === c.cur) };
}

function sp(m, { segundos, tiroACada = 0, tiros = Infinity, vf = 0, morre = false }) {
  const out = [];
  let t = 0, prox = 0, n = 0;
  for (let f = 0; f < Math.round(segundos / DT); f++) {
    t += DT;
    m.group.position.z += vf * DT;
    if (tiroACada && n < tiros && t >= prox) { prox = t + tiroACada; n++; m.ctrl.shoot(); }
    if (morre && !m.ctrl.dead) m.ctrl.die();
    const spd = Math.abs(vf);
    m.ctrl.update(DT, spd < 0.35 ? 0 : 1, true, spd, vf < -0.25);
    out.push(mede(m));
  }
  return out;
}

function mp(m, { segundos, tiroACada }) {
  let clock = 100000;
  const net = { meta: { snapshotHz: 20 }, startPing() {}, stopPing() {}, onSlot: null, onPersonagem: null };
  const nc = makeNetcode({}, net);
  clearInterval(nc._nsTimer);
  nc._now = () => clock;
  const ent = { def, team: 'E', mesh: m, weapon: ARMA, pos: new THREE.Vector3(), yaw: 0, alive: true, _remote: 7, _netBot: true,
    _bufAt: [], _bufX: [], _bufY: [], _bufZ: [], _bufYaw: [], _bufPitch: [], _netSpd: 0 };
  const out = [];
  let ultimoSnap = -Infinity, proxTiro = clock;
  for (let f = 0; f < Math.round(segundos / DT); f++) {
    clock += DT * 1000;
    if (clock - ultimoSnap >= 50) {
      ultimoSnap = clock;
      ent._bufAt.push(clock); ent._bufX.push(0); ent._bufY.push(0); ent._bufZ.push(0); ent._bufYaw.push(0); ent._bufPitch.push(0);
      if (ent._bufAt.length > 10) for (const k of ['_bufAt', '_bufX', '_bufY', '_bufZ', '_bufYaw', '_bufPitch']) ent[k].shift();
      if (clock >= proxTiro) { proxTiro = clock + tiroACada * 1000 - 1; ent._fireAtMs = clock; m.ctrl.shoot(); }
    }
    nc.updateRemoteBot(ent, DT);
    out.push(mede(m));
  }
  nc.dispose();
  return out;
}

const falhas = [];
const fmt = (v) => v.toFixed(2).replace('.', ',');
function cobra(cod, txt, serie, { exigeClipe } = {}) {
  if (exigeClipe && !serie.some((s) => s.clip === exigeClipe)) { console.log(`${cod} · ${txt}\n   nenhum quadro em ${exigeClipe} — a rajada não chegou ao clipe, nada foi medido\n   FALHA`); falhas.push(cod); return; }
  const pMin = Math.min(...serie.map((s) => s.peso)), mMax = Math.max(...serie.map((s) => s.mao));
  const iP = serie.findIndex((s) => s.peso < PESO_MIN), iM = serie.findIndex((s) => s.mao > MAO_MAX_CM);
  const ok = iP < 0 && iM < 0;
  console.log(`${cod} · ${txt}\n   ${serie.length} quadros · peso mín ${fmt(pMin)} (piso ${fmt(PESO_MIN)}) · mão L máx ${fmt(mMax)} cm (teto ${MAO_MAX_CM})`
    + `${iP >= 0 ? `\n   1º quadro com peso baixo: #${iP} (${fmt(serie[iP].peso)}, ${serie[iP].clip}) — o mixer completa com a bind` : ''}`
    + `${iM >= 0 ? `\n   1º quadro com mão solta: #${iM} (${fmt(serie[iM].mao)} cm, ${serie[iM].clip})` : ''}\n   ${ok ? 'PASSA' : 'FALHA'}`);
  if (!ok) falhas.push(cod);
}

cobra('TPR1', 'rajada SP parado, tiro a cada 0,1 s por 0,6 s + 0,6 s depois', sp(monta(), { segundos: 1.2, tiroACada: CADENCIA_AK, tiros: 6 }), { exigeClipe: 'shoot' });
cobra('TPR1b', 'rajada SP andando 1,6 m/s, tiro a cada 0,1 s (walkfire)', sp(monta(), { segundos: 1.2, tiroACada: CADENCIA_AK, tiros: 6, vf: 1.6 }), { exigeClipe: 'walkfire' });
cobra('TPR2', 'rajada MP, tiro a cada snapshot (20 Hz), Netcode.updateRemoteBot', mp(monta(), { segundos: 1.2, tiroACada: 0.05 }), { exigeClipe: 'shoot' });
cobra('TPR3', 'rajada MP na cadência da AK (0,1 s), Netcode.updateRemoteBot', mp(monta(), { segundos: 1.2, tiroACada: CADENCIA_AK }), { exigeClipe: 'shoot' });

{
  const novo = sp(monta(Object.getPrototypeOf(monta().ctrl).shoot), { segundos: 1.2, tiroACada: 9, tiros: 1 });
  const velho = sp(monta(shootAntigo), { segundos: 1.2, tiroACada: 9, tiros: 1 });
  const dif = Math.max(...novo.map((s, i) => Math.max(Math.abs(s.peso - velho[i].peso), Math.abs(s.mao - velho[i].mao))));
  const mMax = Math.max(...novo.map((s) => s.mao));
  const ok = dif < 1e-6 && mMax <= MAO_MAX_CM && novo.every((s) => s.peso >= PESO_MIN);
  console.log(`TPR4 · tiro único idêntico ao shoot() antigo\n   ${novo.length} quadros · maior diferença ${dif.toExponential(1)} · mão L máx ${fmt(mMax)} cm\n   ${ok ? 'PASSA' : 'FALHA'}`);
  if (!ok) falhas.push('TPR4');
}

/* Locomoção não passa pelo shoot(): a mão L de cada estado fica onde estava na main
   890ddd060 (medido por este script), com folga de 0,05 cm. */
const LOCO_MAIN = { idle: 2.38, walk: 0.10, run: 0.96, death: 55.67 };
for (const [cod, estado, txt, opts] of [
  ['TPR5a', 'idle', 'idle 1,5 s', { segundos: 1.5 }],
  ['TPR5b', 'walk', 'walk 1,1 m/s, 1 s', { segundos: 1.0, vf: 1.1 }],
  ['TPR5c', 'run', 'run 4,7 m/s, 0,75 s', { segundos: 0.75, vf: 4.7 }],
  ['TPR5d', 'death', 'death 1,2 s', { segundos: 1.2, morre: true }],
]) {
  const serie = sp(monta(), opts);
  const pMin = Math.min(...serie.map((s) => s.peso)), mMax = Math.max(...serie.map((s) => s.mao));
  const ok = pMin >= PESO_MIN && Math.abs(mMax - LOCO_MAIN[estado]) <= 0.05;
  console.log(`${cod} · ${txt} inalterado\n   peso mín ${fmt(pMin)} · mão L máx ${fmt(mMax)} cm (main ${fmt(LOCO_MAIN[estado])})\n   ${ok ? 'PASSA' : 'FALHA'}`);
  if (!ok) falhas.push(cod);
}

const esperadas = ['TPR1', 'TPR2', 'TPR3'];
if (MUT) {
  const pegou = esperadas.filter((c) => falhas.includes(c));
  if (pegou.length !== esperadas.length) { console.error(`✗ mutante ${MUT} NÃO foi pego em ${esperadas.filter((c) => !pegou.includes(c)).join(', ')} — a régua está cega`); process.exit(1); }
  console.log(`\n✓ mutante ${MUT} pego em ${pegou.join(', ')}`);
  process.exit(0);
}
if (falhas.length) {
  console.error(`\n✗ TPR reprovado: ${falhas.join(', ')} — a rajada 3P mistura com a bind. Conserto: em CharController.shoot() (glbchars.js), com o shoot já corrente, reinicie o tempo sem recomeçar o fadeIn.`);
  process.exit(1);
}
console.log('\n✓ TPR: rajada 3P segura peso e mão de apoio em SP e MP; tiro único e locomoção inalterados.');
