/* Regressões vistas nas capturas 3:2 do PR441 recuperado: cascas aditivas dos
   holofotes pareciam paredes e o caminho GLB escondia todas as janelas laterais.
   Esta régua força placeProp a devolver um molde: fallback sozinho não prova nada.
   Não prova aparência fotográfica: a aprovação visual continua no navegador.
   node tools/eval/penitenciaria-facade-check.mjs [--mutante=sem-fachada|cone-restaurado]
*/
import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const mutant = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
if (mutant && !['sem-fachada', 'cone-restaurado'].includes(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);
const fixture = new THREE.Group();
fixture.name = 'facade-fixture-bloco-celas';
fixture.add(new THREE.Mesh(new THREE.BoxGeometry(.3886, .4472, .998), new THREE.MeshStandardMaterial()));
registerPropTemplate('bloco_celas', fixture);
const world = MAPS.penitenciaria.build(new THREE.Scene(), await initTextures());
registerPropTemplate('bloco_celas', null);
world.root.updateMatrixWorld(true);
const meshes = [], lights = [], heads = [];
world.root.traverse((o) => {
  if (o.isMesh) meshes.push(o);
  if (o.isSpotLight) lights.push(o);
  if (/^penitenciaria-holofote-\d+$/.test(o.name)) heads.push(o);
});
const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const prefix = (s) => meshes.filter((m) => m.name.startsWith(s));
let applied = false;
if (mutant === 'sem-fachada') {
  for (const m of prefix('penitenciaria-pavilhao-janela-')) { m.visible = false; applied = true; }
} else if (mutant === 'cone-restaurado') {
  if (!heads.length) throw new Error('Não sei aplicar mutante: holofote ausente');
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: .055, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  heads[0].add(cone); meshes.push(cone); applied = true;
}
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok }); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detail}`); };
check('PF1', !!world.root.getObjectByName(fixture.name), 'build real usa fixture registrada de bloco_celas (ramo GLB)');

const shells = meshes.filter((m) => {
  const materials = Array.isArray(m.material) ? m.material : [m.material];
  if (!visible(m) || !materials.some((x) => x.transparent && x.blending === THREE.AdditiveBlending)) return false;
  m.geometry.computeBoundingBox();
  const size = m.geometry.boundingBox.getSize(new THREE.Vector3());
  return Math.max(size.x, size.y, size.z) > 3;
});
check('PF2', !shells.length, `${shells.length} cascas aditivas grandes (limite 3 m; a casca original tinha 30 m)`);
world.update(.1, 3);
const before = lights.map((l) => JSON.stringify(l.target.position.toArray()));
world.update(.1, 11);
const moving = lights.filter((l, i) => JSON.stringify(l.target.position.toArray()) !== before[i]).length;
const lenses = heads.filter((h) => h.children.some((o) => o.isMesh && o.geometry.type === 'CircleGeometry' && visible(o))).length;
check('PF3', lights.length === 4 && moving === 4 && lenses === 4, `${lights.length} spots, ${moving} alvos móveis, ${lenses} lentes visíveis`);

const windows = prefix('penitenciaria-pavilhao-janela-').filter(visible);
const validWindow = (m) => {
  const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const outside = c.x < 0 ? box.max.x < -4.5 : box.min.x > 4.5;
  return outside && Math.abs(c.x) < 4.7 && Math.abs(c.z) < 6 && c.y > 1.8 && c.y < 5.6
    && s.y >= 1.29 && s.z >= 1.69 && m.material.map?.name === 'penitenciaria-grade-cela';
};
const rhythm = new Set(windows.map((m) => `${Math.sign(m.position.x)}:${m.position.y.toFixed(2)}:${m.position.z.toFixed(2)}`));
const trims = [...prefix('penitenciaria-pavilhao-peitoril-'), ...prefix('penitenciaria-pavilhao-verga-')].filter(visible);
const validTrim = (m) => {
  const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  return Math.abs(c.x) > 4.5 && Math.abs(c.x) < 4.8 && s.x >= .2 && s.x <= .4 && s.z >= 1.8 && s.y <= .2;
};
check('PF4', windows.length === 16 && windows.every(validWindow) && rhythm.size === 16
  && trims.length === 32 && trims.every(validTrim),
`${windows.length}/16 janelas de grade visíveis fora do GLB, ${rhythm.size} posições distintas, ${trims.length}/32 peitoris/vergas com relevo`);

// Assinatura anterior ao conserto: inclui os contratos funcionais do PR441, não
// o mapa simplificado anterior à recuperação. O acabamento não desloca circulação.
const signature = { colliders: world.colliders, spawns: world.spawns, ctfPoints: world.ctfPoints,
  waypoints: world.waypoints, bounds: world.bounds, pickups: world.pickups.map(({ x, z, kind }) => ({ x, z, kind })) };
const hash = createHash('sha256').update(JSON.stringify(signature)).digest('hex');
check('PF5', hash === '602d8a00ef9c127ad9a6231f5453af0f311d2fbec319b9d961399f80f8b4c280', `colisão, navegação, spawns, CTF e pickups preservados (${hash.slice(0, 12)})`);
const failed = results.filter((r) => !r.ok).map((r) => r.id);
if (mutant) {
  const target = mutant === 'sem-fachada' ? 'PF4' : 'PF2';
  if (!applied || !failed.includes(target)) throw new Error(`Mutante ${mutant} não foi detectado por ${target}`);
  console.log(`Mutante ${mutant} aplicado e detectado em ${target}`);
}
console.log(`PENITENCIARIA-FACADE ${failed.length ? `VERMELHA: ${failed.join(', ')}` : 'ok: PF1–PF5'}`);
process.exitCode = failed.length ? 1 : 0;
