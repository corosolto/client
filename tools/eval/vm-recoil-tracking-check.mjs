#!/usr/bin/env node
import fs from 'node:fs';
import { VmRecoil } from '../../public/js/vmrecoil.js';
import { VM_FABRICA, VM_WEAPON } from '../../public/js/data/vmconfig.js';
import { WEAPONS } from '../../public/js/data/weapons.js';

const measure = process.argv.includes('--measure');
const mutant = process.argv.includes('--mutante=recoil-antigo');
const families = JSON.parse(fs.readFileSync(new URL('../../public/private-assets/viewmodels/recoil.json', import.meta.url))).families;
const previous = { mp5: 7, p90: 8, famas: 7, tavor: 7 };
const baseline = (id, cfg, scale, ads) => {
  let seed = 411;
  const random = Math.random;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  try {
    const recoil = new VmRecoil();
    recoil.setFamily(families, cfg.familia, scale, cfg.recoilLoc ?? scale);
    let next = 0;
    let peak = 0, peakLoc = 0;
    for (let t = 0; t <= 1.5; t += 1 / 120) {
      if (t + 1e-8 >= next && next < 1.2) { recoil.shoot(t); next += WEAPONS[id].rate; }
      const result = recoil.update(1 / 120, ads);
      peak = Math.max(peak, Math.hypot(result.rx, result.ry, result.rz) * 180 / Math.PI);
      peakLoc = Math.max(peakLoc, Math.hypot(result.px, result.py, result.pz) * 100);
    }
    return { angle: peak, loc: peakLoc };
  } finally { Math.random = random; }
};
let failures = 0;
for (const ads of [0, 1]) {
  const ak = baseline('ak', VM_WEAPON.ak, VM_WEAPON.ak.recoilScale, ads);
  for (const id of Object.keys(previous)) {
    const cfg = VM_FABRICA[id];
    const declared = cfg.recoilScale;
    const scale = mutant ? previous[id] : declared;
    if (mutant && scale === declared) throw new Error(`mutante não aplicou: ${id}`);
    const peak = baseline(id, cfg, scale, ads);
    const ratio = peak.angle / ak.angle;
    const locRatio = peak.loc / ak.loc;
    const ok = ratio <= (id === 'mp5' || id === 'p90' ? 1.2 : 1.3) && locRatio <= 1.2;
    if (!ok) failures++;
    console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} ads=${ads}: ${JSON.stringify({ scale, peakDeg: +peak.angle.toFixed(2), akPeakDeg: +ak.angle.toFixed(2), ratio: +ratio.toFixed(2), peakLocCm: +peak.loc.toFixed(2), akLocCm: +ak.loc.toFixed(2), locRatio: +locRatio.toFixed(2) })}`);
  }
}
console.log(`vm-recoil-tracking: ${failures} falha(s)`);
process.exitCode = measure ? 0 : mutant ? Number(failures === 0) : Number(failures > 0);
