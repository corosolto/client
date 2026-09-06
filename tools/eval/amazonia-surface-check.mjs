// Baseline 5c66d28b: ponte submersa (.18 < .20), margem física sem malha,
// e 44 caixas altas no horizonte. Evidência: docs/reports/AMAZONIA-VISUAL-CONTINUATION.md.
import { THREE, bootGame, initTextures } from './harness.mjs';
const g = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007 });
const w = g.world;
w.root.updateMatrixWorld(true);
const waters = [];
w.root.traverse(o => { if (o.userData.aguaViva) waters.push(o); });
const waterY = waters[0]?.getWorldPosition(new THREE.Vector3()).y;
const bridgeY = w.groundHeightAt(0, 24, 0);
const samples = [], ray = new THREE.Raycaster();
for (const z of [-20, 20]) for (const side of [-1, 1]) for (const ax of [7, 8, 9, 9.6]) {
  const x = side * ax, expected = w.groundHeightAt(x, z, 0);
  ray.set(new THREE.Vector3(x, 0.01, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObject(w.root, true).filter(h => !h.object.userData.aguaViva && !h.object.material?.transparent);
  const actual = hits[0]?.point.y;
  samples.push({ x, z, expected, actual, delta: actual == null ? null : Math.abs(expected - actual) });
}
const towers = [];
w.root.traverse(o => {
  const p = o.geometry?.parameters;
  if (o.visible && o.geometry?.type === 'BoxGeometry' && p.height >= 6.5 && (Math.abs(o.position.x) >= 29 || Math.abs(o.position.z) >= 41.5)) towers.push(o.position.toArray());
});
const spawnLines = [];
for (const a of w.spawns.E) for (const b of w.spawns.B) {
  const from = new THREE.Vector3(a.x, 1.4, a.z), to = new THREE.Vector3(b.x, 1.4, b.z);
  const dir = to.clone().sub(from); ray.set(from, dir.clone().normalize()); ray.far = dir.length();
  if (!ray.intersectObjects(w.occluders, true).length) spawnLines.push({ a:[a.x,a.z], b:[b.x,b.z] });
}
const drySlow = [9.5,10,10.3].filter(x => w.slowAt(x,20));
const autoClimbs = [];
for (const z of [-24,0]) for (const x of [7.2,7.5,7.8,8.1,11.2,10.9]) {
  const target = g._mantleTarget(new THREE.Vector3(x, w.groundHeightAt(x,z,0), z), x < 9.4 ? 1 : -1, 0);
  if (target) autoClimbs.push({x,z,target});
}
const results = [
  { id:'AMV7', ok:autoClimbs.length === 0, value:autoClimbs, rule:'travessia baixa não escala automaticamente o teto' },
  { id:'AMV5', ok:spawnLines.length === 0, value:spawnLines.length, rule:'zero linhas diretas entre spawns em pé' },
  { id:'AMV6', ok:drySlow.length === 0, value:drySlow, rule:'margem seca não aplica lentidão de água' },
  { id: 'AMV1', ok: Number.isFinite(waterY) && bridgeY > waterY, value: { waterY, bridgeY }, rule: 'ponte acima da água' },
  { id: 'AMV2', ok: samples.every(s => s.delta !== null && s.delta < 1e-4), value: samples, rule: 'malha coincide com chão físico nas rampas' },
  { id: 'AMV3', ok: towers.length === 0, value: towers.length, rule: 'zero torres retangulares do baseline no horizonte; AMZ6 protege densidade' },
];
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.rule}: ${JSON.stringify(r.value)}`);
if (results.some(r => !r.ok)) process.exitCode = 1;
