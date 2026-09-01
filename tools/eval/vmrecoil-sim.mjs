#!/usr/bin/env node
/* ============================================================================
   vmrecoil-sim.mjs — O TIRO MEXE A ARMA, NA DOSE CERTA, E ELA VOLTA
   ----------------------------------------------------------------------------
   POR QUE EXISTE (BUG-75): 12/15 famílias do pack não têm clipe de fire e o
   branch autorado zerava o kick legado — a arma ficava PARADA atirando. O
   vmrecoil reproduz o recuo procedural do pack; esta régua simula rajadas de
   5 tiros por família (recoil.json real) e cobra três contratos:
   RS1 pico de pitch entre 1° e 12° (mexe de verdade, sem virar caricatura);
   RS2 recuperação: 0,9 s após o último tiro, rotação < 0,15° e posição < 2 mm;
   RS3 kickback nunca passa de 6 cm em direção à lente (near plane é 1 cm).
   Mutante: --mutante=zerado (parâmetros nulos) tem que reprovar RS1.
   Requer private-assets (recoil.json) — régua LOCAL, fora do check:fast.
   ============================================================================ */
import fs from 'node:fs';

import { VmRecoil } from '../../public/js/vmrecoil.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'zerado') throw new Error(`mutante desconhecido: ${MUT}`);
const PRIVATE_ROOT = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const DATA = JSON.parse(fs.readFileSync(`${PRIVATE_ROOT}/recoil.json`, 'utf8'));
const CATALOG = JSON.parse(fs.readFileSync(`${PRIVATE_ROOT}/catalog.json`, 'utf8'));
const CLIPS = new Map(CATALOG.families.map((f) => [f.family, new Set(f.clips)]));
const DEG = 180 / Math.PI;
// Cadência realista por família: bolt/sniper cicla entre tiros; DMR/canos
// pesados atiram mais devagar que o full-auto de 0,1 s.
const CADENCE = { bolt: 1.6, sniper: 1.7, svd: 0.35, marksman: 0.35, deagle: 0.35, revolver: 0.4, shotgun: 0.9 };
const scaleOf = (family) => {
  const weapon = Object.keys(VM_WEAPON).find((id) => VM_WEAPON[id].family === family);
  return VM_WEAPON[weapon]?.recoilScale ?? 1;
};

let failures = 0;
function check(ok, label, evidence = '') {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${label}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) failures += 1;
}

const zerado = (params) => Object.fromEntries(Object.entries(params).map(([family, p]) => [family, {
  ...p,
  pitch: [0, 0], roll: [0, 0, 0, 0], yaw: [0, 0, 0, 0],
  kickback: [0, 0], kickUp: [0, 0], kickRight: [0, 0],
}]));

const families = MUT === 'zerado' ? zerado(DATA.families) : DATA.families;
const DT = 1 / 240;
const results = [];

for (const family of Object.keys(families)) {
  const recoil = new VmRecoil();
  recoil.setFamily(families, family, scaleOf(family));
  const params = families[family];
  const semAmplitude = Math.max(...params.pitch.map(Math.abs), ...params.roll.map(Math.abs)) === 0;
  const cadence = CADENCE[family] || 0.1;
  const shots = 5;
  const curveDur = Math.max(
    params.curves.semiRot.x.duration, params.curves.autoRot.x.duration,
    params.curves.semiLoc.z.duration, params.curves.autoLoc.z.duration,
  );
  const settle = Math.max(0.9, curveDur * 1.1);
  let peakPitch = 0;
  let peakPz = 0;
  let out = null;
  for (let t = 0, shot = 0; t <= (shots - 1) * cadence + settle; t += DT) {
    if (shot < shots && t >= shot * cadence) { recoil.shoot(t); shot += 1; }
    out = recoil.update(DT, 0);
    peakPitch = Math.max(peakPitch, Math.abs(out.rx) * DEG);
    peakPz = Math.max(peakPz, out.pz);
  }
  const rotResidualDeg = Math.max(Math.abs(out.rx), Math.abs(out.ry), Math.abs(out.rz)) * DEG;
  const posResidual = Math.max(Math.abs(out.px), Math.abs(out.py), Math.abs(out.pz));
  if (semAmplitude) {
    // sniper/bolt: o pack autora o tiro no CLIPE assado, não no recuo procedural.
    check(CLIPS.get(family)?.has('shoot'), `RS1 ${family}: sem amplitude, mas o clipe de tiro assado cobre`);
  } else {
    check(peakPitch >= 1 && peakPitch <= 12, `RS1 ${family}: pico de pitch 1°–12°`, `${peakPitch.toFixed(2)}°`);
  }
  check(rotResidualDeg < 0.15 && posResidual < 0.002,
    `RS2 ${family}: recupera após a curva`, `rot ${rotResidualDeg.toFixed(3)}° pos ${(posResidual * 1000).toFixed(2)} mm`);
  check(peakPz <= 0.06, `RS3 ${family}: kickback ≤ 6 cm`, `${(peakPz * 100).toFixed(1)} cm`);
  results.push({ family, peakPitch: Number(peakPitch.toFixed(2)), peakPzCm: Number((peakPz * 100).toFixed(2)) });
}

console.log(JSON.stringify({ mutante: MUT || null, families: results.length, results, failures }, null, 2));
process.exit(failures ? 1 : 0);
