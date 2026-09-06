import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8149';
const OUT = process.env.ARTIFACT_DIR || 'artifacts/sertao-astra/calango-quadrupede/runtime';
const mut = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const targets = { 'pitch-corrida': ['CR2', 'CR3'], 'passada-congelada': ['CR4'], 'idle-correndo': ['CR3', 'CR4'], 'fuga-teleporte': ['CR6'] };
if (mut && !targets[mut]) throw Error(`Mutante desconhecido: ${mut}`);
const file = readFileSync('public/models/ambient/calango_quadrupede.glb');
const json = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12))), contacts = json.extras.contacts;
const sha = createHash('sha256').update(file).digest('hex');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const samples = [];
try {
  for (const [quality, fallback] of [['med', false], ['low', false], ['med', true]]) {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(q => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: q })), quality);
    if (fallback) await page.route('**/models/ambient/calango_quadrupede.glb*', route => route.abort());
    await page.goto(`${BASE}/mapview.html?map=velho_oeste&capture=1&hud=0`);
    await page.waitForFunction(() => window.__gworld?.ambience?.ready, null, { timeout: 90000 });
    const sample = await page.evaluate(async ({ contacts, mut, fallback }) => {
      const THREE = await import('three'), w = __gworld, ambience = w.ambience;
      const animals = ambience.animals.filter(a => a.type === 'calango'), animal = animals[0];
      if (!animal) throw Error('Nenhum calango carregado');
      const original = ambience._updateCalango;
      if (mut === 'pitch-corrida') ambience._updateCalango = function(a, dt) { original.call(this, a, dt); if (a.state === 'run') a.root.rotation.x = -.42; };
      if (mut === 'passada-congelada' && !fallback) for (const a of animals) { if (!a.actions?.run) throw Error('Mutante não aplicou'); a.actions.run.setEffectiveTimeScale = function() { this.timeScale = 0; return this; }; }
      if (mut === 'idle-correndo' && !fallback) ambience._updateCalango = function(a, dt) { original.call(this, a, dt); if (a.state === 'idle') a.actions?.run.play(); };
      if (mut === 'fuga-teleporte') ambience._updateCalango = function(a, dt) { original.call(this, a, dt); if (a.state === 'flee' && !a.mutated) { a.root.position.z += 4; a.mutated = true; } };
      let mesh; animal.root.traverse(o => { if (o.isMesh && o.morphTargetInfluences?.length === 4) mesh = o; });
      let maxPitch = 0, maxSpeed = 0, maxIdleMorph = 0, minIdleFeet = 4, minMovingFeet = 4, runFrames = 0, idleFrames = 0;
      const poses = new Set(), states = new Set(); ambience.reset();
      for (let frame = 0; frame < 2400; frame++) {
        if (frame === 900) ambience.onShot(new THREE.Vector3(animal.root.position.x - 1, animal.root.position.y, animal.root.position.z), animal.root.position.clone());
        const before = animal.root.position.clone(); ambience.update(1 / 60, null); animal.root.updateMatrixWorld(true);
        const speed = animal.root.position.distanceTo(before) * 60, moving = speed > .01;
        maxSpeed = Math.max(maxSpeed, speed); maxPitch = Math.max(maxPitch, Math.abs(animal.root.rotation.x), Math.abs(animal.root.rotation.z)); states.add(animal.state);
        if (animal.state === 'run') runFrames++;
        if (animal.state === 'idle') idleFrames++;
        if (mesh) {
          const feet = contacts.map(i => mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
          const grounded = feet.filter(p => Math.abs(p.y - animal.root.position.y) <= .002).length;
          if (moving) { minMovingFeet = Math.min(minMovingFeet, grounded); poses.add(mesh.morphTargetInfluences.map(v => v.toFixed(3)).join(',')); }
          else { minIdleFeet = Math.min(minIdleFeet, grounded); maxIdleMorph = Math.max(maxIdleMorph, ...mesh.morphTargetInfluences.map(Math.abs)); }
        }
      }
      const parts = []; animal.root.traverse(o => { if (o.userData.calangoLeg !== undefined) parts.push(o); });
      const box = new THREE.Box3().setFromObject(animal.root), size = box.getSize(new THREE.Vector3());
      return { count: animals.length, sources: animals.map(a => a.source), morphMeshes: !!mesh, maxPitch, maxSpeed, maxIdleMorph, minIdleFeet, minMovingFeet, poseCount: poses.size, runFrames, idleFrames, states: [...states], fallbackLegs: parts.length, fallbackRatio: size.y / Math.max(size.x, size.z) };
    }, { contacts, mut, fallback });
    samples.push({ quality, fallback, errors, ...sample });
    await page.evaluate(() => { const a = __gworld.ambience.animals.find(a => a.type === 'calango'), p = a.root.position; MAPEVAL.cam.fov = 55; MAPEVAL.cam.updateProjectionMatrix(); MAPEVAL.view([p.x + .65, p.y + .28, p.z + .55], [p.x, p.y + .04, p.z]); });
    await page.screenshot({ path: `${OUT}/map-${quality}-${fallback ? 'fallback' : 'gltf'}${mut ? `-${mut}` : ''}.png` });
    await page.close();
  }
} finally { await browser.close(); }
const [normal, low, fallback] = samples;
const checks = {
  CR1: normal.sources.every(s => s === 'gltf') && low.sources.every(s => s === 'gltf') && normal.morphMeshes && low.morphMeshes && samples.every(s => !s.errors.length),
  CR2: samples.every(s => s.maxPitch < .000001),
  CR3: [normal, low].every(s => s.minIdleFeet === 4 && s.minMovingFeet >= 2 && s.morphMeshes),
  CR4: [normal, low].every(s => s.poseCount > 8 && s.maxIdleMorph < .000001 && s.runFrames > 60 && s.idleFrames > 60),
  CR5: low.count === 1 && fallback.sources.every(s => s === 'fallback') && fallback.fallbackLegs === 4 && fallback.fallbackRatio < .30,
  CR6: samples.every(s => s.maxSpeed <= 1.21 && ['run', 'idle', 'flee', 'recover'].every(state => s.states.includes(state))),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
writeFileSync(`${OUT}/report${mut ? `-${mut}` : ''}.json`, JSON.stringify({ sha, checks, samples, failed, expected: mut ? targets[mut] : [] }, null, 2));
console.log(JSON.stringify({ checks, samples, failed }));
process.exitCode = mut ? +(JSON.stringify(failed) !== JSON.stringify(targets[mut])) : +!!failed.length;
