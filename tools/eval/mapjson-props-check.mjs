// Props carregados devem bloquear o mesmo mundo, spawn e grafo; ausentes não criam paredes invisíveis.
import { THREE, initTextures } from './harness.mjs';
import { planFromJSON, validatePlan, buildMapFromJSON } from '../../public/js/map_json.js';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'ok' : 'FALHA'} ${name}: ${detail}`);
  if (!ok) failures.push(name);
};
const id = 'qa-sdk-solid-prop';
const spec = { bounds: { x: 12, z: 12 }, boxes: [], props: [
  { id, x: -8, z: -8, h: 2, solid: true, cw: 4, cd: 4 },
], spawns: { E: [{ x: -8, z: -8 }], B: [{ x: 8, z: 8 }] }, waypoints: { step: 2, inset: 2 } };
const textures = initTextures();
const inside = (point, prop, pad = 0) => Math.abs(point.x - prop.x) < prop.cw / 2 + pad
  && Math.abs(point.z - prop.z) < prop.cd / 2 + pad;
const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
try {
  registerPropTemplate(id, null);
  const absentPlan = planFromJSON(spec), absent = buildMapFromJSON(new THREE.Scene(), textures, spec);
  check('absent-no-ghost-collider', absentPlan.colliders.length === 4 && absent.colliders.length === 4
    && validatePlan(absentPlan).length === 0, `plan=${absentPlan.colliders.length} world=${absent.colliders.length}`);
  absent.dispose();
  registerPropTemplate(id, template);
  const invalidPlan = planFromJSON(spec);
  check('loaded-spawn-validated', validatePlan(invalidPlan).some(problem => /R3 spawn E dentro de sólido/.test(problem)),
    `problems=${JSON.stringify(validatePlan(invalidPlan))}`);
  let refused = false;
  try { buildMapFromJSON(new THREE.Scene(), textures, spec); }
  catch (error) { refused = /R3 spawn E dentro de sólido/.test(error.message); }
  check('loaded-spawn-build-refused', refused, `refused=${refused}`);
  const corridor = structuredClone(spec); corridor.props[0].x = 0; corridor.props[0].z = 0;
  const plan = planFromJSON(corridor), world = buildMapFromJSON(new THREE.Scene(), textures, corridor);
  check('loaded-plan-world-parity', plan.colliders.length === 5 && plan.navColliders.length === 5
    && JSON.stringify(plan.colliders) === JSON.stringify(world.colliders),
    `plan=${plan.colliders.length} nav=${plan.navColliders.length} world=${world.colliders.length}`);
  const badNodes = world.waypoints.nodes.filter(point => inside(point, corridor.props[0], .5));
  check('loaded-graph-avoids-prop', badNodes.length === 0, `nodes inside inflated collider=${badNodes.length}`);
  world.dispose();
} finally {
  registerPropTemplate(id, null); template.geometry.dispose(); template.material.dispose();
}
if (failures.length) { console.error(`PROPS VERMELHO: ${failures.join(', ')}`); process.exit(1); }
console.log('PROPS VERDE: collider, navegação e spawn concordam com a presença do asset');
