// Simulação completa do Game, sem render, rede ou GLBs: mede CPU, não FPS.
import { bootGame, initTextures, THREE } from './harness.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const seeds = (process.argv.find(a => a.startsWith('--seeds='))?.slice(8) || '13007,7,4321').split(',').map(Number);
const seconds = Number(process.argv.find(a => a.startsWith('--seconds='))?.slice(10) || 30);
if (!Number.isFinite(seconds) || seconds < 10 || seeds.some(s => !Number.isInteger(s))) throw Error('Amostra inválida');
const textures = initTextures(), records = [];
function run(seed, linear) {
  const g = bootGame('amazonia', { textures, ctf: true, seed, bots: 8 });
  if (linear) {
    g.world.rayOccluded = undefined;
    for (const m of g.world.occluders) if (['madeira-amazonia', 'chao-de-mata'].includes(m.name) && !m.isInstancedMesh) m.raycast = THREE.Mesh.prototype.raycast;
  }
  const parts = {}, frames = [], digest = createHash('sha256');
  for (const [o, key] of [[g, '_losClear'], [g, '_collide'], [g.world, 'findPath'], [g.world, 'update']]) {
    const fn = o[key], part = parts[key] = { calls: 0, ms: 0 };
    o[key] = function(...args) { const t = performance.now(); const v = fn.apply(this, args); part.ms += performance.now() - t; part.calls++; return v; };
  }
  let liveFrames = 0;
  for (let i = 0; i < seconds * 60; i++) {
    const t = performance.now(); g.update(1 / 60, false); frames.push(performance.now() - t);
    if (g.state === 'live') liveFrames++;
    digest.update(JSON.stringify([g.state, g.player.pos.toArray(), g.player.hp,
      g.bots.map(b => [b.pos.toArray(), b.hp, b.alive, b.yaw, b.path]) ]));
  }
  const sorted = [...frames].sort((a,b) => a-b), pct = q => sorted[Math.min(sorted.length-1, Math.floor(sorted.length*q))];
  const record = { seed, linear, sourceSha256: createHash('sha256').update(readFileSync('public/js/map_amazonia.js')).digest('hex'), bots: g.bots.length, liveFrames, frames: frames.length,
    totalMs: frames.reduce((a,b) => a+b,0), medianMs: pct(.5), p95Ms: pct(.95), p99Ms: pct(.99), maxMs: pct(1), parts, stateSha256: digest.digest('hex') };
  g.dispose(); return record;
}
const mode = process.argv.find(a => a.startsWith('--mode='))?.slice(7);
if (mode && !['linear', 'candidate'].includes(mode)) throw Error('Modo inválido');
if (mode) {
  console.log('SIM_RESULT=' + JSON.stringify(run(seeds[0], mode === 'linear')));
  process.exit(0);
}
function isolated(seed, linear) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--seeds=${seed}`, `--seconds=${seconds}`, `--mode=${linear ? 'linear' : 'candidate'}`], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout.split('SIM_RESULT=')[1].trim());
}
for (const [i, seed] of seeds.entries()) {
  // Processos novos isolam caches; ordem alternada reduz viés de carga/temperatura.
  const pair = (i % 2 ? [true, false] : [false, true]).map(linear => isolated(seed, linear));
  const candidate = pair.find(r => !r.linear), baseline = pair.find(r => r.linear);
  records.push({ seed, candidate, baseline, reductionPct: (1-candidate.totalMs/baseline.totalMs)*100,
    sameSimulation: candidate.stateSha256 === baseline.stateSha256 && candidate.sourceSha256 === baseline.sourceSha256 });
}
const valid = records.every(r => r.sameSimulation && r.candidate.bots === 15 && r.candidate.liveFrames > 0 && r.candidate.parts._losClear.calls > 0);
const report = { valid, scope: 'CPU Game.update em Node puro. Áudio, animações GLB e GPU não medidos.', node: process.version, seconds,
  sourceSha256: createHash('sha256').update(readFileSync('public/js/map_amazonia.js')).digest('hex'), records };
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6);
if (out) writeFileSync(out, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(valid ? 0 : 1);
