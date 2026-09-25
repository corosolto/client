#!/usr/bin/env node
/* Extrai o RecoilAnimData do pack (Unity YAML) para recoil.json (BUG-75 M5):
   amplitudes por família (pitch/roll/yaw/kick, atenuação de ADS, pivôs) e as
   curvas semi/auto AMOSTRADAS a 60 Hz — o vmrecoil.js reproduz o feel do
   ProceduralRecoilAnimationSystem sem reimplementar C#. Fica no private-assets. */
import fs from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';

const EXTRACTED = process.argv[2] || '/Users/ruben/csbrasil-private-assets/generated/extracted';
const PRIVATE_ROOT = process.argv[3] || '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const MANIFEST = JSON.parse(await fs.readFile(new URL('./paid-pack-manifest.json', import.meta.url), 'utf8'));
const ANIMATIONS = path.join(EXTRACTED, 'Assets/KINEMATION/FPSAnimationPack/Animations');

const range2 = (v) => [v?.x ?? 0, v?.y ?? 0];
const range4 = (v) => [v?.x ?? 0, v?.y ?? 0, v?.z ?? 0, v?.w ?? 0];
const vec3 = (v) => [v?.x ?? 0, v?.y ?? 0, v?.z ?? 0];

/* Hermite cúbica das AnimationCurves do Unity, amostrada densa: o runtime só faz
   lookup linear — nada de tangentes no loop de frame. */
function sampleCurve(channel, fps = 60) {
  const keys = (channel?.m_Curve || []).map((k) => ({
    t: k.time, v: k.value, si: k.inSlope, so: k.outSlope,
  }));
  if (!keys.length) return { duration: 0, values: [0] };
  const duration = keys[keys.length - 1].t;
  const count = Math.max(2, Math.round(duration * fps) + 1);
  const values = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i / (count - 1)) * duration;
    let a = keys[0];
    let b = keys[keys.length - 1];
    for (let k = 0; k < keys.length - 1; k += 1) {
      if (t >= keys[k].t && t <= keys[k + 1].t) { a = keys[k]; b = keys[k + 1]; break; }
    }
    const span = Math.max(1e-6, b.t - a.t);
    const s = Math.min(1, Math.max(0, (t - a.t) / span));
    const s2 = s * s;
    const s3 = s2 * s;
    const value = (2 * s3 - 3 * s2 + 1) * a.v
      + (s3 - 2 * s2 + s) * span * (Number.isFinite(a.so) ? a.so : 0)
      + (-2 * s3 + 3 * s2) * b.v
      + (s3 - s2) * span * (Number.isFinite(b.si) ? b.si : 0);
    values.push(Number(value.toFixed(5)));
  }
  return { duration: Number(duration.toFixed(5)), values };
}

const sampleXYZ = (curve) => ({
  x: sampleCurve(curve?.x), y: sampleCurve(curve?.y), z: sampleCurve(curve?.z),
});

async function readRecoilAsset(sourceDir) {
  const folder = path.join(ANIMATIONS, sourceDir);
  const files = (await fs.readdir(folder)).filter((name) => name.endsWith('.asset'));
  if (!files.length) return null;
  const raw = await fs.readFile(path.join(folder, files[0]), 'utf8');
  const body = raw.slice(raw.indexOf('MonoBehaviour:'));
  const doc = yaml.load(body, { schema: yaml.JSON_SCHEMA, json: true });
  return doc?.MonoBehaviour || null;
}

const out = { schemaVersion: 1, families: {} };
for (const [family, config] of Object.entries(MANIFEST.families)) {
  if (config.externalWeapon) continue;
  const data = await readRecoilAsset(config.source);
  if (!data) { console.warn(`sem RecoilAnimData para ${family} (${config.source})`); continue; }
  out.families[family] = {
    source: config.source,
    pitch: range2(data.pitch),
    roll: range4(data.roll),
    yaw: range4(data.yaw),
    kickback: range2(data.kickback),
    kickUp: range2(data.kickUp),
    kickRight: range2(data.kickRight),
    aimRot: vec3(data.aimRot),
    aimLoc: vec3(data.aimLoc),
    smoothRot: vec3(data.smoothRot),
    smoothLoc: vec3(data.smoothLoc),
    hipPivotOffset: vec3(data.hipPivotOffset),
    aimPivotOffset: vec3(data.aimPivotOffset),
    playRate: data.playRate ?? 1,
    curves: {
      semiRot: sampleXYZ(data.recoilCurves?.semiRotCurve),
      semiLoc: sampleXYZ(data.recoilCurves?.semiLocCurve),
      autoRot: sampleXYZ(data.recoilCurves?.autoRotCurve),
      autoLoc: sampleXYZ(data.recoilCurves?.autoLocCurve),
    },
  };
}

const target = path.join(PRIVATE_ROOT, 'recoil.json');
await fs.writeFile(target, `${JSON.stringify(out)}\n`);
const bytes = (await fs.stat(target)).size;
console.log(`CORO_PAID_RECOIL_EXTRACT=${JSON.stringify({ target, families: Object.keys(out.families).length, bytes })}`);
