// Simulação completa do Game, sem render, rede ou GLBs: mede CPU, não FPS.
import { bootGame, initTextures, THREE } from './harness.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const seeds = (process.argv.find(a => a.startsWith('--seeds='))?.slice(8) || '13007,7,4321').split(',').map(Number);
const seconds = Number(process.argv.find(a => a.startsWith('--seconds='))?.slice(10) || 30);
if (!Number.isFinite(seconds) || seconds < 10 || seeds.some(s => !Number.isInteger(s))) throw Error('Amostra inválida');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (mutant && mutant !== 'menos-mata') throw Error('Mutante desconhecido');
const textures = initTextures(), records = [];
function census(world) {
  let meshes = 0, triangles = 0;
  world.root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry, count = geo.index?.count || geo.attributes?.position?.count || 0;
    meshes += o.isInstancedMesh ? o.count : 1;
    triangles += (count / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return { colliders: world.colliders.length, occluders: world.occluders.length,
    nodes: world.waypoints.nodes.length, edges: world.waypoints.adj.reduce((t, l) => t + l.length, 0),
    meshes, triangles: Math.round(triangles) };
}
function run(seed, linear) {
  const g = bootGame('amazonia', { textures, ctf: true, seed, bots: 8 });
  if (linear) {
    g.world.rayOccluded = undefined;
    for (const m of g.world.occluders) if (['madeira-amazonia', 'chao-de-mata'].includes(m.name) && !m.isInstancedMesh) m.raycast = THREE.Mesh.prototype.raycast;
  }
  /* Mutante de honestidade: apaga mata só visual (fora de occluders/colisores), que não muda
     um bit da simulação — se o censo não vir isso, dá pra "ganhar" desenho apagando mapa. */
  if (mutant === 'menos-mata' && !linear) {
    const guardados = new Set(g.world.occluders), alvos = [];
    g.world.root.traverse(o => { if (o.isMesh && !guardados.has(o)) alvos.push(o); });
    for (const m of alvos.slice(0, Math.ceil(alvos.length / 2))) m.parent?.remove(m);
  }
  const objects = census(g.world);
  const parts = {}, frames = [], digest = createHash('sha256');
  for (const [o, key] of [[g, '_losClear'], [g, '_collide'], [g.world, 'findPath'], [g.world, 'update']]) {
    const fn = o[key], part = parts[key] = { calls: 0, ms: 0 };
    o[key] = function(...args) { const t = performance.now(); const v = fn.apply(this, args); part.ms += performance.now() - t; part.calls++; return v; };
  }
  let liveFrames = 0, peakHeapMb = 0;
  const mb = n => +(n / 1048576).toFixed(2);
  const heapBeforeMb = mb(process.memoryUsage().heapUsed);
  for (let i = 0; i < seconds * 60; i++) {
    const t = performance.now(); g.update(1 / 60, false); frames.push(performance.now() - t);
    if (g.state === 'live') liveFrames++;
    if (i % 60 === 0) peakHeapMb = Math.max(peakHeapMb, mb(process.memoryUsage().heapUsed));
    digest.update(JSON.stringify([g.state, g.player.pos.toArray(), g.player.hp,
      g.bots.map(b => [b.pos.toArray(), b.hp, b.alive, b.yaw, b.path]) ]));
  }
  const usage = process.memoryUsage();
  const memory = { heapBeforeMb, heapAfterMb: mb(usage.heapUsed), peakHeapMb, rssMb: mb(usage.rss) };
  const sorted = [...frames].sort((a,b) => a-b), pct = q => sorted[Math.min(sorted.length-1, Math.floor(sorted.length*q))];
  const record = { seed, linear, mutant, sourceSha256: createHash('sha256').update(readFileSync('public/js/map_amazonia.js')).digest('hex'), bots: g.bots.length, liveFrames, frames: frames.length,
    totalMs: frames.reduce((a,b) => a+b,0), medianMs: pct(.5), p95Ms: pct(.95), p99Ms: pct(.99), maxMs: pct(1), parts, objects, memory, stateSha256: digest.digest('hex') };
  g.dispose(); return record;
}
const mode = process.argv.find(a => a.startsWith('--mode='))?.slice(7);
if (mode && !['linear', 'candidate'].includes(mode)) throw Error('Modo inválido');
if (mode) {
  console.log('SIM_RESULT=' + JSON.stringify(run(seeds[0], mode === 'linear')));
  process.exit(0);
}
function isolated(seed, linear) {
  const args = [fileURLToPath(import.meta.url), `--seeds=${seed}`, `--seconds=${seconds}`, `--mode=${linear ? 'linear' : 'candidate'}`];
  if (mutant) args.push(`--mutante=${mutant}`);
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout.split('SIM_RESULT=')[1].trim());
}
for (const [i, seed] of seeds.entries()) {
  // Processos novos isolam caches; ordem alternada reduz viés de carga/temperatura.
  const pair = (i % 2 ? [true, false] : [false, true]).map(linear => isolated(seed, linear));
  const candidate = pair.find(r => !r.linear), baseline = pair.find(r => r.linear);
  records.push({ seed, candidate, baseline, reductionPct: (1-candidate.totalMs/baseline.totalMs)*100,
    // Cena idêntica dos dois lados: ganho tem de vir da consulta, nunca de apagar conteúdo.
    sameObjects: JSON.stringify(candidate.objects) === JSON.stringify(baseline.objects),
    heapDeltaMb: +(candidate.memory.heapAfterMb - baseline.memory.heapAfterMb).toFixed(2),
    sameSimulation: candidate.stateSha256 === baseline.stateSha256 && candidate.sourceSha256 === baseline.sourceSha256 });
}
const valid = records.every(r => r.sameSimulation && r.sameObjects && r.candidate.bots === 15 && r.candidate.liveFrames > 0 && r.candidate.parts._losClear.calls > 0);
const report = { valid, scope: 'CPU Game.update em Node puro. Áudio, animações GLB e GPU não medidos.', node: process.version, seconds, mutant,
  sourceSha256: createHash('sha256').update(readFileSync('public/js/map_amazonia.js')).digest('hex'), records };
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6);
if (out) writeFileSync(out, JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
process.exit(valid ? 0 : 1);
