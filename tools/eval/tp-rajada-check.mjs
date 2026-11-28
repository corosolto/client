/* TPR — RAJADA EM 3ª PESSOA SEM MISTURAR COM A POSE DE BIND.
   Defeito (lane 1, 13/10/2026, mst + AK, 960×640, seed 1337): `CharController.shoot()` fazia
   reset()+fadeIn(0,06) a cada tiro. Com o `shoot` já corrente, o fade recomeçava do zero e
   nenhuma outra ação segurava peso: o mixer completava com a bind. Medido no navegador
   (capture-3p-baseline.mjs): peso total 0,28 e mão L a 30 cm do guarda-mão na rajada SP de
   0,1 s; no caminho MP (Netcode.updateRemoteBot, snapshot a 20 Hz) preso em 0,28.

   Mede em node, quadro a quadro (dt 1/60), o mst + AK pelo buildCharacterModel real:
     TPR1 · rajada SP parado, 0,1 s           peso ≥ 0,99 e mão L ≤ 2 cm em todo quadro
     TPR1b · rajada SP preserva a passada direcional enquanto o tronco reage
     TPR2 · rajada MP, tiro a cada snapshot   idem: o tiro entra como no applySnapshot (ctrl.shoot) e
            a pose sai do Netcode.prototype.updateRemoteBot real
     TPR3 · rajada MP na cadência da AK       idem
     TPR4 · tiro único: quadro a quadro igual ao shoot() antigo (o conserto só toca a rajada)
     TPR5 · idle/walk/run/death: peso ≥ 0,99 e mão L igual à da main
   Mutantes de rajada (fade) e de contato (empunhadura-legado, empunhadura-escala, empunhadura-familia).
   Uso: npm run eval:tprajada */
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES_APOIO = {
  'empunhadura-legado': ['glbchars.js', "gripPoints(armId, autorado ? 'fp' : 'tp')", 'gripPoints(armId)', ['m4', 'awp']],
  'empunhadura-escala': ['glbchars.js', 'fore.divideScalar(gunObj.scale.x || 1);', '', ['m4', 'awp']],
  'empunhadura-familia': ['weapons.js', "SUPPORT_Z[SUPPORT_FAMILY[id] || 'rifle']", 'SUPPORT_Z.rifle', ['awp']],
};
const mutanteApoio = Object.hasOwn(MUTANTES_APOIO, MUT) ? MUTANTES_APOIO[MUT] : null;
if (MUT && MUT !== 'fade' && !mutanteApoio) throw new Error(`mutante desconhecido: ${MUT}`);
let apoioMutado = false;
if (mutanteApoio) {
  const [arquivo, antes, depois] = mutanteApoio;
  const alvo = new URL(`../../public/js/${arquivo}`, import.meta.url).href;
  registerHooks({ load(url, contexto, seguinte) {
    if (url !== alvo) return seguinte(url, contexto);
    const original = fs.readFileSync(new URL(url), 'utf8');
    if (original.split(antes).length !== 2) throw new Error(`âncora ausente ou ambígua: ${MUT}`);
    apoioMutado = true;
    return { format: 'module', source: original.replace(antes, depois), shortCircuit: true };
  } });
}

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
const { weaponModel } = await import('../../public/js/weapons.js');
const { makeNetcode } = await import('../../public/js/netgame.js');

const CHAR = 'mst', ARMA = 'ak', DT = 1 / 60, PESO_MIN = 0.99, MAO_MAX_CM = 2;
const CADENCIA_AK = 0.1;

const corposApoio = [CHAR, 'mariabonita'];
const armasApoio = [['m4', 0.25, 0.29], ['awp', 0.24, 0.28]];
const corpos = MUT === 'fade' ? [CHAR] : corposApoio;
await G.preloadCharacterAssets(corpos, { weapons: mutanteApoio ? ['m4', 'awp'] : [ARMA, 'pistol', 'm4', 'awp'] });
for (const id of corpos) if (!G.hasModel(id)) throw new Error(`${id}.glb não carregou — a régua não sabe medir`);
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
function contatoApoio({ ctrl, group }, mesh, minZ, maxZ) {
  const { gun, end, endOffset } = ctrl.ikL;
  group.updateMatrixWorld(true);
  const palm = gun.worldToLocal(end.localToWorld(endOffset.clone())).multiplyScalar(gun.scale.x);
  const touches = [-0.007, 0, 0.007].some(dz => {
    const surface = new THREE.Raycaster(new THREE.Vector3(palm.x, -0.4, palm.z + dz), new THREE.Vector3(0, 1, 0)).intersectObject(mesh, true)[0];
    return surface && Math.abs(palm.y - surface.point.y + 0.012) < 0.025;
  });
  return { palm, ok: palm.z >= minZ && palm.z <= maxZ && touches };
}

if (!mutanteApoio) {
  for (const [weaponId, minZ, maxZ] of [['pistol', 0, 0], ...armasApoio]) {
    const m = G.buildCharacterModel(def, {weaponId});
    for (let i = 0; i < 36; i++) m.ctrl.update(DT, i < 18 ? 0 : 1, false, i < 18 ? 0 : 2.4);
    if (weaponId === 'pistol') {
      if (m.ctrl.ikL) throw Error('a pistola puxou a mão de apoio');
      continue;
    }
    const mesh = weaponModel(weaponId);
    mesh.updateMatrixWorld(true);
    const { palm, ok } = contatoApoio(m, mesh, minZ, maxZ);
    if (!ok) throw Error(`${weaponId}: palma não toca o guarda-mão (${palm.toArray().map(v => v.toFixed(3)).join(', ')} m)`);
  }
}

async function verificaRetornoApoio() {
  if (mutanteApoio && !apoioMutado) throw Error(`mutante não aplicado: ${MUT}`);
  for (const [weaponId, minZ, maxZ] of armasApoio) {
    const mesh = weaponModel(weaponId);
    mesh.updateMatrixWorld(true);
    for (const id of corposApoio) {
      const m = G.buildCharacterModel(CHARACTERS.find(c => c.id === id), {weaponId});
      const c = m.ctrl;
      c._requestExtras();
      for (let i = 0; i < 100 && !c.actions.strafe_right; i++) await new Promise(resolve => setTimeout(resolve, 10));
      const passo = () => c.update(DT, 1, true, 1.8, false, 1.8);
      for (let i = 0; i < 30; i++) passo();
      if (c.curName !== 'strafe_right') throw Error(`${id}/${weaponId}: strafe inicial ausente`);
      c.reload(1.2);
      let recarga = false;
      for (let i = 0; i < 84; i++) {
        passo();
        recarga ||= c.reloadK > 0.2 || c._upperName?.startsWith('reload_') === true;
      }
      if (!recarga || c._reloadDur || c.reloadK || c._upperName?.startsWith('reload_') || c.curName !== 'strafe_right') {
        throw Error(`${id}/${weaponId}: não completou recarga em strafe`);
      }
      const { palm, ok } = contatoApoio(m, mesh, minZ, maxZ);
      const esperado = !mutanteApoio?.[3].includes(weaponId);
      if (ok !== esperado) throw Error(`${id}/${weaponId}: contato ${ok ? 'preservado' : 'fora do guarda-mão'} com ${MUT || 'head'} (z=${palm.z.toFixed(3)} m)`);
      console.log(`TPR-apoio · ${id}/${weaponId} · ${ok ? 'contato no retorno' : 'mutante detectado'}`);
    }
  }
}
if (mutanteApoio) {
  await verificaRetornoApoio();
  process.exit(0);
}
{
  const tardio = monta(), fallback = monta();
  for (const m of [tardio, fallback]) {
    m.ctrl.die();
    for (let i = 0; i < 6; i++) m.ctrl.update(DT, 0, false);
  }
  const tempo = tardio.ctrl.mixer.time;
  tardio.ctrl.die({ x: 1, z: 0 });
  if (tardio.ctrl.mixer.time !== tempo) throw new Error('kill atrasado reiniciou o clipe');
  for (const m of [tardio, fallback]) {
    m.ctrl.update(DT, 0, false);
    m.group.updateMatrixWorld(true);
  }
  const a = tardio.ctrl.torso.spines[0].getWorldQuaternion(new THREE.Quaternion());
  const b = fallback.ctrl.torso.spines[0].getWorldQuaternion(new THREE.Quaternion());
  if (a.angleTo(b) < 0.001) throw new Error('kill atrasado não direcionou a queda em curso');
}
{
  const m = monta(), c = m.ctrl;
  c.draw();
  for (let i = 0; i < 8; i++) c.update(DT, 0, false);
  m.group.updateMatrixWorld(true);
  const mount = c.tpMount;
  const orientacao = mount.mount.getWorldQuaternion(new THREE.Quaternion());
  const esperada = mount.model.getWorldQuaternion(new THREE.Quaternion()).multiply(mount.carry);
  if (orientacao.angleTo(esperada) > 0.001 || mede(m).mao > MAO_MAX_CM) {
    throw new Error('saque desalinha a arma ou solta a mão de apoio');
  }
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
  const nc = makeNetcode({ camera: { position: new THREE.Vector3() } }, net);
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
cobra('TPR1b', 'rajada SP em movimento a 1,6 m/s preserva a passada', sp(monta(), { segundos: 1.2, tiroACada: CADENCIA_AK, tiros: 6, vf: 1.6 }), { exigeClipe: 'run' });
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

// Em vida, a palma acompanha o socket; na morte o clipe manda e a mão pode sair da arma.
for (const [cod, estado, txt, opts] of [
  ['TPR5a', 'idle', 'idle 1,5 s', { segundos: 1.5 }],
  ['TPR5b', 'walk', 'walk 1,1 m/s, 1 s', { segundos: 1.0, vf: 1.1 }],
  ['TPR5c', 'run', 'run 4,7 m/s, 0,75 s', { segundos: 0.75, vf: 4.7 }],
  ['TPR5d', 'death', 'death 1,2 s', { segundos: 1.2, morre: true }],
]) {
  const serie = sp(monta(), opts);
  const pMin = Math.min(...serie.map((s) => s.peso)), mMax = Math.max(...serie.map((s) => s.mao));
  const clipeEstavel = serie.slice(-12).every(s => s.clip === estado);
  const ok = pMin >= PESO_MIN && clipeEstavel && (opts.morre || mMax <= MAO_MAX_CM);
  console.log(`${cod} · ${txt}\n   peso mín ${fmt(pMin)} · clipe final ${serie.at(-1).clip}`
    + `${opts.morre ? '' : ` · mão L máx ${fmt(mMax)} cm (teto ${MAO_MAX_CM})`}\n   ${ok ? 'PASSA' : 'FALHA'}`);
  if (!ok) falhas.push(cod);
}

const loadStride = () => G.buildCharacterModel(def, {weaponId:ARMA}).ctrl;
const strideProbe = loadStride();
strideProbe._requestExtras();
for (let i=0; i<100 && !strideProbe.actions.strafe_right; i++) await new Promise(resolve=>setTimeout(resolve,10));
for (const [name, speed, back, lateral] of [
  ['walk',1.1,false,0], ['run',3,false,0], ['run_back',2.1,true,0],
  ['strafe_right',1.8,false,1.8], ['strafe_left',1.8,false,-1.8],
]) {
  const ctrl = loadStride(), passo = () => ctrl.update(DT, 1, true, speed, back, lateral);
  for (let i=0; i<18; i++) passo();
  const stride = ctrl.cur, before = stride.time, rate = stride.getEffectiveTimeScale();
  if (ctrl.curName !== name) throw Error(`${name}: clipe da direção indisponível (${ctrl.curName})`);
  ctrl.shoot();
  passo();
  const duration = stride.getClip().duration;
  const expected = ((before + rate * DT) % duration + duration) % duration;
  if (ctrl.cur !== stride || Math.abs(stride.time-expected)>0.001 || !ctrl._fireDur) {
    throw Error(`${name}: o disparo reiniciou a passada ou perdeu o recuo`);
  }
}

const esperadas = ['TPR1', 'TPR2', 'TPR3'];
if (MUT) {
  const pegou = esperadas.filter((c) => falhas.includes(c));
  if (pegou.length !== esperadas.length) { console.error(`✗ mutante ${MUT} NÃO foi pego em ${esperadas.filter((c) => !pegou.includes(c)).join(', ')} — a régua está cega`); process.exit(1); }
  console.log(`\n✓ mutante ${MUT} pego em ${pegou.join(', ')}`);
  process.exit(0);
}
if (falhas.length) {
  console.error(`\n✗ TPR reprovado: ${falhas.join(', ')} — veja peso, clipe e distância da mão acima.`);
  process.exit(1);
}
// O pack de extras é compartilhado; o saque acima precisa começar sem ele.
await verificaRetornoApoio();
console.log('\n✓ TPR: rajada 3P segura peso e mão de apoio em SP e MP; tiro único, clipes e contato sem rajada preservados.');
