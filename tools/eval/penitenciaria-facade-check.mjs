/* Regressões vistas nas capturas 3:2 do PR441 recuperado: as cascas aditivas dos
   holofotes pareciam paredes. Esta régua mede o mundo real do build, não a aparência
   fotográfica — a aprovação visual continua no navegador.

   PF1, PF4 e PF5 FORAM APOSENTADAS nesta base, e o motivo importa mais que as cláusulas:
     · PF1 forçava `placeProp('bloco_celas')` a devolver molde. O Carandiru da `main` não
       usa geometria Mint por decisão registrada em docs/reports/CARANDIRU-MAIN-R3.md:16
       — "O asset Mint do PR #556 não entra: a própria descrição registra termos
       comerciais ainda pendentes" — e o CR3-1 da carandiru-main-r3-check cobra
       justamente essa ausência. Manter PF1 seria exigir que uma régua quebrasse a outra.
     · PF4 cravava 16 janelas e 32 peitoris/vergas, o ritmo do pavilhão cheio. O pavilhão
       reconstruído é oco, com 12 janelas em parede real; quem mede janela sustentada
       hoje é o CR3-3 (parede, peitoril, verga, piso e posição de tiro).
     · PF5 era um sha256 de colliders+spawns+ctf+waypoints+pickups: pino de implementação
       que só sabia dizer "o mapa mudou". Alcance de pickup — o defeito que ela cercava —
       é medido de verdade pela pickup-check (VM14), que roda por mapa.

   node tools/eval/penitenciaria-facade-check.mjs [--mutante=cone-restaurado]
*/
import { THREE, MAPS, initTextures } from './harness.mjs';

const mutant = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
if (mutant && !['cone-restaurado'].includes(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);
const world = MAPS.penitenciaria.build(new THREE.Scene(), await initTextures());
world.root.updateMatrixWorld(true);
const meshes = [], lights = [], heads = [];
world.root.traverse((o) => {
  if (o.isMesh) meshes.push(o);
  if (o.isSpotLight) lights.push(o);
  if (/^penitenciaria-holofote-\d+$/.test(o.name)) heads.push(o);
});
const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
let applied = false;
if (mutant === 'cone-restaurado') {
  if (!heads.length) throw new Error('Não sei aplicar mutante: holofote ausente');
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: .055, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  heads[0].add(cone); meshes.push(cone); applied = true;
}
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok }); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detail}`); };

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

const failed = results.filter((r) => !r.ok).map((r) => r.id);
if (mutant) {
  if (!applied || !failed.includes('PF2')) throw new Error(`Mutante ${mutant} não foi detectado por PF2`);
  console.log(`Mutante ${mutant} aplicado e detectado em PF2`);
}
console.log(`PENITENCIARIA-FACADE ${failed.length ? `VERMELHA: ${failed.join(', ')}` : 'ok: PF2–PF3'}`);
process.exitCode = failed.length ? 1 : 0;
