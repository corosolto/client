// SIMULADOR DO COICE DO VIEWMODEL — node puro, sem browser, sem assets, sem three.
//
// PORQUE EXISTE: o repo media o ENQUADRAMENTO PARADO (vm-mint-audit) e nao media NADA do
// estado da arma DURANTE o tiro. O coice do VM e o unico transform que pode empurrar a
// coronha ATRAVES do near plane (0.01 m) — e ele nao tinha regua. Aqui a cadeia inteira e
// reexecutada em node:
//
//   REC_DEG[w] (recoil.js)               -> grau de kick vertical declarado por arma
//   vmAmp = min(CAP, BASE + REC_DEG*MUL) -> amplitude do kick do VM  (game.js _tryShoot)
//   kickMul = 0.5 se STATIC_CLASS==pistol
//   vm.recoil = RecoilAxis(f, d, tau, share)  (game.js, springs.js)
//   k = vm.recoil.step(dt)               -> valor do eixo no quadro
//   pitch  = k * GAIN_ROT_X   (rad)      -> vm.root.rotation.x
//   pullZ  = k * GAIN_POS_Z   (m)        -> vm.root.position.z  (+ = EM DIRECAO A LENTE)
//   liftY  = k * GAIN_POS_Y   (m)        -> vm.root.position.y
//
// TODOS os numeros acima sao LIDOS por regex de public/js/game.js — nenhum e copiado aqui.
// A cadencia (rate) vem da tabela WEAPONS (game.js; weapons.js so carrega geometria) e o
// agendamento replica `p.nextShotAt = this.time + w.rate` (acumula a partir do QUADRO em
// que o tiro saiu, nao de uma grade ideal — isso muda o pico em ate 0,5 grau).
//
// A coronha: back = escalaVM * max(0, -bboxMin.z) e a distancia coronha->grip em metros,
// lida de tools/eval/vm_mint_audit.json (medida no GLB de verdade). O z de repouso da
// coronha em view space e o campo coronhaZ do mesmo JSON. No pico do coice:
//   coronhaZpico = coronhaZ + kPico * GAIN_POS_Z
// z > -0.01 significa que a coronha atravessou o near plane da vmCamera (arma cortada).
//
// Uso:  node tools/eval/vm-kick-sim.mjs [--json]
//       --json escreve tools/eval/vm_kick_sim.json
import fs from 'fs';
import path from 'path';
import { RecoilAxis } from '../../public/js/springs.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const G = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
const RJS = fs.readFileSync(path.join(ROOT, 'public/js/recoil.js'), 'utf8');
const WJS = fs.readFileSync(path.join(ROOT, 'public/js/weapons.js'), 'utf8');

const die = (m) => { throw new Error('vm-kick-sim: ' + m); };
const grab = (re, what) => { const m = re.exec(G); if (!m) die(`nao achei ${what} em game.js`); return m; };

/* ---------- 1) RecoilAxis do viewmodel (game.js ~1429) ---------- */
const mR = grab(/recoil:\s*new\s+RecoilAxis\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/, 'new RecoilAxis do vm');
const AX = { freq: +mR[1], damping: +mR[2], residualTau: +mR[3], residualShare: +mR[4] };

/* ---------- 2) formula do vmAmp (game.js ~2304) ---------- */
// Duas formas aceitas, ambas LIDAS do game.js (nenhuma constante copiada aqui):
//   linear    Math.min(CAP, BASE + (REC_DEG[w] ?? FB) * MUL) * (scoped ? S : 1)
//   sublinear (BASE + Math.sqrt(REC_DEG[w] ?? FB) * MUL)     * (scoped ? S : 1)   <- R1.c
// A sublinear existe porque a linear SATURAVA no CAP (awp/mosin/rem700 todas em 1.70).
const RE_AMP_LIN = /const\s+vmAmp\s*=\s*GUNFEEL\s*\?\s*Math\.min\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\+\s*\(REC_DEG\[p\.weapon\]\s*\?\?\s*([\d.]+)\)\s*\*\s*([\d.]+)\)\s*\*\s*\(p\.scoped\s*\?\s*([\d.]+)\s*:\s*1\)/;
const RE_AMP_SQRT = /const\s+vmAmp\s*=\s*GUNFEEL\s*\?\s*\(\s*([\d.]+)\s*\+\s*Math\.sqrt\(REC_DEG\[p\.weapon\]\s*\?\?\s*([\d.]+)\)\s*\*\s*([\d.]+)\)\s*\*\s*\(p\.scoped\s*\?\s*([\d.]+)\s*:\s*1\)/;
let AMP;
{
  const mLin = RE_AMP_LIN.exec(G), mSq = RE_AMP_SQRT.exec(G);
  if (mLin) AMP = { curva: 'linear', cap: +mLin[1], base: +mLin[2], fallback: +mLin[3], mul: +mLin[4], scoped: +mLin[5] };
  else if (mSq) AMP = { curva: 'sqrt', cap: null, base: +mSq[1], fallback: +mSq[2], mul: +mSq[3], scoped: +mSq[4] };
  else die('nao achei a formula do vmAmp em game.js (nem linear nem sqrt)');
}
const mK = grab(/const\s+kickMul\s*=\s*STATIC_CLASS\[p\.weapon\]\s*===\s*'pistol'\s*\?\s*([\d.]+)\s*:\s*1/, 'kickMul de pistola');
const KICK_MUL_PISTOL = +mK[1];

/* ---------- 3) ganhos aplicados ao k (game.js 3995-3998) ---------- */
/* `[^,]*` entre o ganho e a vírgula: o commit 415b402 (liga o ViewModelRig, BUG-04) passou
   a somar `+ rg.pos.y` DEPOIS do `k * 0.015` na mesma componente, e o regex ancorado direto
   em `,\s*VM_OFF[2]` parou de casar — `die()` derrubava o import e com ele o portão INTEIRO
   (`node tools/eval/invariants.mjs` saía com stack trace, 0 invariantes avaliadas). O termo
   medido continua sendo o mesmo: o coeficiente de k na componente Y. */
const GAIN_POS_Y = +grab(/\+\s*k\s*\*\s*([\d.]+)[^,]*,\s*VM_OFF\[2\]/, 'ganho k na posicao Y')[1];
const GAIN_POS_Z = +grab(/VM_OFF\[2\]\s*\+\s*k\s*\*\s*([\d.]+)/, 'ganho k na posicao Z')[1];
const GAIN_ROT_X = +grab(/rotation\.x\s*=\s*k\s*\*\s*([\d.]+)/, 'ganho k na rotacao X')[1];
const GAIN_ROT_Y = +grab(/rotation\.y\s*=\s*ks\s*\*\s*k\s*\*\s*([\d.]+)/, 'ganho k na rotacao Y')[1];
// idem: o termo `this._swayY * …` saiu da rotation.z (hoje é `ks*k*0.022 + swRz + rg.rot.z`),
// então o regex ancora no ganho de k, que é o que esta régua mede.
const GAIN_ROT_Z = +grab(/rotation\.z\s*=\s*(?:[^;\n]*?\+\s*)?ks\s*\*\s*k\s*\*\s*([\d.]+)/, 'ganho k na rotacao Z')[1];

/* ---------- 4) REC_DEG (recoil.js) ---------- */
function loadRecDeg() {
  const marcador = 'export const REC_DEG = {';
  const i = RJS.indexOf(marcador);
  if (i < 0) die('REC_DEG nao encontrado');
  const j = RJS.indexOf('\n};', i);
  const body = RJS.slice(i + 'export const REC_DEG = '.length, j + 2);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + body)();
}
const REC_DEG = loadRecDeg();

/* ---------- 5) STATIC_CLASS (para o kickMul de pistola) ---------- */
function loadStaticClass() {
  const out = {};
  for (const m of G.matchAll(/for\s*\(const w of \[([^\]]*)\]\)\s*STATIC_CLASS\[w\]\s*=\s*'(\w+)'/g)) {
    for (const id of m[1].split(',')) { const s = id.trim().replace(/^'|'$/g, ''); if (s) out[s] = m[2]; }
  }
  for (const m of G.matchAll(/STATIC_CLASS\['(\w+)'\]\s*=\s*'(\w+)'/g)) out[m[1]] = m[2];
  return out;
}
const STATIC_CLASS = loadStaticClass();

/* ---------- 6) cadencia real (tabela WEAPONS — mudou de game.js para data/weapons.js na
   modularização da main, alpha.147; weapons.js só tem geometria) ---------- */
function loadRates() {
  const out = {};
  const dataPath = path.join(ROOT, 'public/js/data/weapons.js');
  const src = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : G;
  for (const m of src.matchAll(/^\s{2}(\w+)\s*:\s*\{[^\n]*?\brate:\s*([\d.]+)/gm)) out[m[1]] = +m[2];
  if (!Object.keys(out).length) die('nenhum `rate:` encontrado na tabela WEAPONS');
  return out;
}
const RATE = loadRates();
const AUTO = new Set();
for (const m of G.matchAll(/^\s{2}(\w+)\s*:\s*\{[^\n]*?\bauto:\s*true/gm)) AUTO.add(m[1]);
// weapons.js e a fonte da GEOMETRIA (len/gripZ/vm) — registrada no relatorio para rastrear
// de onde veio cada numero; a cadencia NAO mora la.
const GEOM = {};
for (const m of WJS.matchAll(/(\w+):\s*\{\s*len:\s*([\d.]+),\s*rot:[^}]*?gripZ:\s*([\d.]+)([^}]*)\}/g)) {
  const vm = /vm:\s*([\d.]+)/.exec(m[4]); GEOM[m[1]] = { len: +m[2], gripZ: +m[3], vm: vm ? +vm[1] : 1 };
}

/* ---------- 7) coronha em repouso: vm_mint_audit.json ---------- */
const AUDIT_PATH = path.join(ROOT, 'tools/eval/vm_mint_audit.json');
const AUDIT = fs.existsSync(AUDIT_PATH) ? JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8')) : null;
if (!AUDIT) die('rode `node tools/eval/vm-mint-audit.mjs` antes (vm_mint_audit.json ausente)');
const NEAR = 0.01;   // near plane da vmCamera (game.js:633)

/* ---------- simulacao ---------- */
const DT = 1 / 120, SHOTS = 30;
function vmAmpOf(w, { scoped = false, crouchF = 0 } = {}) {
  const deg = REC_DEG[w] ?? AMP.fallback;
  const raw = AMP.curva === 'sqrt' ? AMP.base + Math.sqrt(deg) * AMP.mul
                                   : Math.min(AMP.cap, AMP.base + deg * AMP.mul);
  const amp = raw * (scoped ? AMP.scoped : 1);
  const mul = STATIC_CLASS[w] === 'pistol' ? KICK_MUL_PISTOL : 1;
  return { vmAmp: +amp.toFixed(4), aplicado: +(amp * (1 - 0.25 * crouchF) * mul).toFixed(4), kickMul: mul };
}
// Uma rajada de `shots` tiros na cadencia real; devolve serie e picos.
function burst(w, shots, opts = {}) {
  const { aplicado } = vmAmpOf(w, opts);
  const rate = RATE[w] ?? 0.1;
  const r = new RecoilAxis(AX.freq, AX.damping, AX.residualTau, AX.residualShare);
  let t = 0, next = 0, fired = 0, peak = 0, tPeak = 0;
  const perShotPeak = [];
  let curPeak = 0;
  const tEnd = () => next + 3;               // 3 s de cauda depois do ultimo tiro
  while (fired < shots || t < tEnd()) {
    if (fired < shots && t >= next) {
      if (fired > 0) perShotPeak.push(curPeak);
      curPeak = 0;
      r.kick(aplicado); fired++; next = t + rate;   // == p.nextShotAt = this.time + w.rate
    }
    const v = r.step(DT);
    if (v > peak) { peak = v; tPeak = t; }
    if (v > curPeak) curPeak = v;
    t += DT;
  }
  perShotPeak.push(curPeak);
  return { peak, tPeak, perShotPeak, rate, shots: fired };
}

const ids = Object.keys(REC_DEG).filter((w) => RATE[w] != null);
const out = {
  gerado: new Date().toISOString(),
  fonte: {
    recoilAxis: AX, vmAmp: AMP, kickMulPistola: KICK_MUL_PISTOL,
    ganhos: { rotX: GAIN_ROT_X, rotY: GAIN_ROT_Y, rotZ: GAIN_ROT_Z, posY: GAIN_POS_Y, posZ: GAIN_POS_Z },
    dt: DT, tiros: SHOTS, nearPlane: NEAR,
    coronhaDe: 'tools/eval/vm_mint_audit.json (coronhaZ / escalaVM*|bboxMin.z|)',
  },
  armas: {},
};
const r3 = (v) => Math.round(v * 1000) / 1000;
const r2 = (v) => Math.round(v * 100) / 100;

for (const w of ids) {
  const a = vmAmpOf(w);
  const one = burst(w, 1);
  const full = burst(w, SHOTS);
  // sustentado = media dos picos por tiro da 2a metade da rajada (transiente ja passou)
  const tail = full.perShotPeak.slice(Math.floor(full.perShotPeak.length / 2));
  const sust = tail.reduce((s, v) => s + v, 0) / Math.max(1, tail.length);
  const e = AUDIT.armas[w] || null;
  const back = e ? r3(e.escalaVM * Math.max(0, -e.gunSpace.bboxMin[2])) : null;
  const coronhaRepouso = e ? e.coronhaZ : null;
  const pullPico = full.peak * GAIN_POS_Z;
  const coronhaPico = coronhaRepouso == null ? null : coronhaRepouso + pullPico;
  // secundario: o pitch do vm.root tambem gira a coronha em torno da origem do root.
  // z' = y*sin(th) + z*cos(th), com (y,z) do ponto de coronha em espaco do root.
  let coronhaPicoComPitch = null;
  if (e) {
    const off = (AUDIT.lente && AUDIT.lente.vmOff) || [0, 0, 0];
    const gy = e.viewSpace.grip[1] - off[1], gz = e.viewSpace.grip[2] - off[2];
    const th = full.peak * GAIN_ROT_X, y = gy, z = gz + back;
    coronhaPicoComPitch = r3(y * Math.sin(th) + z * Math.cos(th) + off[2] + pullPico);
  }
  out.armas[w] = {
    classe: STATIC_CLASS[w] || '?', auto: AUTO.has(w), rate: full.rate, cadenciaRPM: Math.round(60 / full.rate),
    recDeg: REC_DEG[w], vmAmp: a.vmAmp, kickMul: a.kickMul, vmAmpAplicado: a.aplicado,
    kPico1Tiro: r3(one.peak), kPicoRajada: r3(full.peak), kSustentado: r3(sust),
    pitchMaxGraus: r2(full.peak * GAIN_ROT_X * 180 / Math.PI),
    pitch1TiroGraus: r2(one.peak * GAIN_ROT_X * 180 / Math.PI),
    pullZmax: r3(pullPico), liftYmax: r3(full.peak * GAIN_POS_Y),
    coronhaBack: back, coronhaZrepouso: coronhaRepouso, coronhaZpico: coronhaPico == null ? null : r3(coronhaPico),
    coronhaZpicoComPitch: coronhaPicoComPitch,
    atravessaNear: coronhaPico == null ? null : coronhaPico > -NEAR,
    tPicoS: r2(full.tPeak),
  };
}

/* ---------- veredito ---------- */
const fails = [];
for (const [w, e] of Object.entries(out.armas)) {
  if (e.atravessaNear) fails.push(`${w}: coronha atravessa o near plane no pico (z=${e.coronhaZpico} > -${NEAR})`);
  if (e.pitchMaxGraus > 8) fails.push(`${w}: pitch do VM no pico ${e.pitchMaxGraus}° (a arma sai do quadro; REC_DEG declarado ${e.recDeg}°)`);
}
out.reprovacoes = fails;
out.resumo = {
  armas: ids.length,
  atravessamNear: Object.values(out.armas).filter((e) => e.atravessaNear).length,
  pitchMaxGraus: r2(Math.max(...Object.values(out.armas).map((e) => e.pitchMaxGraus))),
  pitchMedioGraus: r2(Object.values(out.armas).reduce((s, e) => s + e.pitchMaxGraus, 0) / ids.length),
};

const AMP_TXT = AMP.curva === 'sqrt' ? `vmAmp=${AMP.base}+sqrt(REC_DEG)*${AMP.mul}` : `vmAmp=min(${AMP.cap}, ${AMP.base}+REC_DEG*${AMP.mul})`;
console.log(`RecoilAxis(${AX.freq}, ${AX.damping}, ${AX.residualTau}, ${AX.residualShare})  ${AMP_TXT}  ganhos: rotX=${GAIN_ROT_X} posZ=${GAIN_POS_Z} posY=${GAIN_POS_Y}   dt=1/${Math.round(1 / DT)}  ${SHOTS} tiros`);
console.log('arma        cls      rate    vmAmp  k1tiro  kRaj  kSust  pitch°  pullZ    coronhaZ(rep->pico)  near?');
for (const [w, e] of Object.entries(out.armas)) {
  console.log(`${w.padEnd(11)} ${String(e.classe).padEnd(8)} ${String(e.rate).padEnd(6)} ${String(e.vmAmp).padEnd(6)} ${String(e.kPico1Tiro).padEnd(7)} ${String(e.kPicoRajada).padEnd(5)} ${String(e.kSustentado).padEnd(6)} ${String(e.pitchMaxGraus).padEnd(7)} ${String(e.pullZmax).padEnd(8)} ${String(e.coronhaZrepouso).padEnd(7)} -> ${String(e.coronhaZpico).padEnd(7)}  ${e.atravessaNear ? 'CRUZA' : 'ok'}`);
}
console.log(`\nresumo: ${JSON.stringify(out.resumo)}   reprovacoes: ${fails.length}`);

if (process.argv.includes('--json')) {
  fs.writeFileSync(path.join(ROOT, 'tools/eval/vm_kick_sim.json'), JSON.stringify(out, null, 1));
  console.log('-> tools/eval/vm_kick_sim.json');
}
