/* Regressão r2: peitoril instanciado, posição alcançável (-13.45,0,11.92).
   _collide(R=.38) não corrigia o corpo; ombro x-.38 atingia y=1.12 do peitoril.
   MAP1 passava porque amostra o centro, não o envelope. Aqui o Game anda até a
   fachada e retorna, com _updatePlayer real e 5 raios por frame como EV3.
   Não confunde parada por colisor legítimo com travamento: precisa alcançar a
   aproximação livre, tocar a fachada e voltar. Não exige atravessar o peitoril.
   --mutante=sem-colisores-fachada remove SOMENTE escadaoFachadaDetalhe=true.
   Exige verde antes, mesmo peitoril atingido depois e verde após restauração.
   Node mede geometria procedural/instanciada, sem GPU; não aprova todos os GLBs,
   cápsula contínua, toda fachada, estética ou FPS. OUT salva facade.json.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutante && mutante !== 'sem-colisores-fachada') throw Error(`Mutante desconhecido: ${mutante}`);
const files = ['public/js/map_escadao.js', 'public/js/game.js', 'tools/eval/escadao-facade-check.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const provenance = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sources };
const g = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = g.world, p = g.player, R = .38, DT = 1 / 60, EYE = 1.62;
// Float32 dos vértices desloca a borda do peitoril ~3e-7 m além do AABB físico.
// Uma tangência exata não é penetração: amostramos 1e-5 m para dentro da borda
// somente nos raios. _collide e _retaAndavel continuam com R=.38, sem folga extra.
const RAY_EDGE_EPS = 1e-5, rayRadius = R - RAY_EDGE_EPS;
const start = [-12, 11.92], approach = [-13, 11.92], witness = [-13.45, 11.92];
const originalCollide = g._collide, dynamic = new WeakSet();
for (const animal of W.ambience?.animals || []) animal.root.traverse(o => dynamic.add(o));
const visible = o => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
g._updateBot = () => {}; g._checkCtfAlvo = () => {}; g._checkPace = () => {};
W.root.updateMatrixWorld(true);
// AABB só reduz candidatos, nunca substitui raycast dos triângulos/instâncias.
const region = new THREE.Box3(new THREE.Vector3(-15, -.2, 10), new THREE.Vector3(-10, 4, 14));
const meshes = [];
W.root.traverse(o => {
  if (!o.isMesh || !visible(o) || dynamic.has(o) || o.userData.nonSolidSurface) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  if (!mats.some(m => m && m.visible !== false && m.colorWrite !== false && (!m.transparent || m.opacity > 0))) return;
  if (region.intersectsBox(new THREE.Box3().setFromObject(o))) meshes.push(o);
});
if (!meshes.length) throw Error('Nenhuma geometria estática na região da fachada');
const ray = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0);
ray.camera = g.camera;
const hitAt = (x, y, z) => {
  ray.set(new THREE.Vector3(x, y + .31, z), up); ray.near = 0; ray.far = EYE - .31;
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? { point: hit.point.toArray(), uuid: hit.object.uuid, instanceId: hit.instanceId ?? null } : null;
};
const rawWitness = hitAt(witness[0] - R, W.groundHeightAt(...witness), witness[1]);
if (!rawWitness || rawWitness.instanceId === null) throw Error('Peitoril instanciado do caso red não foi encontrado; amostra perdeu o alvo');
const tagged = c => c.escadaoFachadaDetalhe === true;
const body = ([x, z]) => {
  const pos = new THREE.Vector3(x, W.groundHeightAt(x, z), z), corrected = pos.clone();
  originalCollide.call(g, corrected, R);
  return { position: pos.toArray(), corrected: corrected.toArray(), correction: corrected.distanceTo(pos) };
};
function measure() {
  const initial = body(start), near = body(approach), oldSpot = body(witness);
  const reachable = g._retaAndavel(...start, ...approach, R, .55);
  p.pos.fromArray(initial.position); p.vel.set(0, 0, 0); p.grounded = true;
  p.mantle = null; p.crouchF = 0; p.scoped = false; p.hp = 100; p.alive = true;
  p.pitch = 0; p.jumpBufferedUntil = 0; p.coyoteUntil = 0;
  g._spaceHeld = false; g.keys = { KeyW: true }; g.touchMove = null;
  g.mouseDown0 = false; g.state = 'live'; g.roundTime = 1e6;
  const trace = [p.pos.toArray()], hits = [], contacts = [], phases = [];
  let frames = 0, collisionCalls = 0;
  g._collide = function(pos, radius) {
    const before = pos.clone(); originalCollide.call(this, pos, radius);
    if (pos !== p.pos) return;
    collisionCalls++;
    const correction = pos.distanceTo(before);
    if (correction > 1e-6) contacts.push({ frame: frames, correction, before: before.toArray(), after: pos.toArray() });
  };
  try {
    for (const reverse of [false, true]) {
      p.yaw = reverse ? -Math.PI / 2 : Math.PI / 2;
      let count = 0;
      while (count < 90 && (!reverse || p.pos.x < start[0])) {
        g.time += DT; g._updatePlayer(DT); frames++; count++;
        if (![p.pos.x, p.pos.y, p.pos.z].every(Number.isFinite)) throw Error('Movimento não finito');
        trace.push(p.pos.toArray());
        for (const [dx, dz] of [[0, 0], [-rayRadius, 0], [rayRadius, 0], [0, -rayRadius], [0, rayRadius]]) {
          const hit = hitAt(p.pos.x + dx, p.pos.y, p.pos.z + dz);
          if (hit) hits.push({ frame: frames, reverse, position: p.pos.toArray(), offset: [dx, dz], ...hit });
        }
      }
      phases.push({ reverse, frames: count, end: p.pos.toArray() });
    }
  } finally { g._collide = originalCollide; g.keys = {}; }
  const finite = frames > 90 && collisionCalls === frames && trace.length === frames + 1 && trace.every(v => v.every(Number.isFinite));
  const returned = phases[1].frames > 0 && phases[1].end[0] >= start[0] && Math.abs(phases[1].end[2] - start[1]) < .01;
  const reachedApproach = Math.min(...trace.map(v => v[0])) <= approach[0];
  const taggedCount = W.colliders.filter(tagged).length;
  const checks = [
    ['EF0', finite && initial.correction < 1e-3 && near.correction < 1e-3 && reachable && reachedApproach,
      `série=${frames}frames/${collisionCalls}colisões, aproximação livre=${reachable && reachedApproach}`],
    ['EF1', hits.length === 0, `hits no envelope=${hits.length}; primeiro=${hits[0] ? JSON.stringify(hits[0]) : 'nenhum'}`],
    ['EF2', taggedCount > 0 && oldSpot.correction > 1e-3 && contacts.length > 0 && phases[0].end[0] > witness[0] && returned,
      `colisores fachada=${taggedCount}, correção no antigo ponto=${oldSpot.correction.toFixed(3)}m, contatos=${contacts.length}, retorno=${returned}`],
  ];
  return { checks, initial, near, oldSpot, reachable, reachedApproach, rawWitness, taggedCount, frames, collisionCalls, trace, phases, hits, contacts, returned };
}

let receipt = { provenance, mutante: mutante || null, status: 'incomplete', measurement: { dt: DT, radius: R, rayEdgeEpsilon: RAY_EDGE_EPS, rayRadius, eye: EYE, start, approach, witness, meshCount: meshes.length } };
const originalColliders = W.colliders;
try {
  const before = measure(); receipt = { ...receipt, ...before };
  if (mutante) {
    receipt.before = before;
    if (before.checks.some(([, ok]) => !ok)) throw Error('Baseline vermelho; não atribuir falha preexistente ao mutante');
    const removed = originalColliders.map((collider, index) => ({ collider, index })).filter(({ collider }) => tagged(collider));
    if (!removed.length) throw Error('Mutante não encontrou colisores marcados');
    W.colliders = originalColliders.filter(c => !tagged(c));
    if (W.colliders.length + removed.length !== originalColliders.length) throw Error('Mutante removeu conjunto inesperado');
    const after = measure();
    const causal = after.hits.some(h => h.uuid === rawWitness.uuid && h.instanceId === rawWitness.instanceId)
      && before.hits.length === 0 && after.oldSpot.correction < 1e-3;
    receipt = { ...receipt, ...after, mutation: { removed }, causal };
    if (!causal || after.checks.find(([id]) => id === 'EF1')[1] !== false) throw Error('Mutante sobreviveu ou sem causalidade no mesmo peitoril');
    W.colliders = originalColliders;
    const restored = measure(); receipt.restoredChecks = restored.checks;
    if (restored.checks.some(([, ok]) => !ok)) throw Error('Restauração não voltou ao verde');
    receipt.status = 'mutation-detected'; process.exitCode = 1;
  } else {
    receipt.status = before.checks.every(([, ok]) => ok) ? 'passed' : 'failed';
    if (receipt.status === 'failed') process.exitCode = 1;
  }
  for (const file of files) if (hash(fs.readFileSync(file)) !== sources[file]) throw Error(`Fonte mudou durante medição: ${file}`);
  for (const [id, ok, detail] of receipt.checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`);
  console.log(`ESCADÃO-FACHADA ${receipt.status}`);
} catch (error) {
  receipt.status = 'error'; receipt.error = error.stack; process.exitCode = 1; console.error(error.message);
} finally {
  W.colliders = originalColliders; g._collide = originalCollide;
  if (process.env.OUT) { fs.mkdirSync(process.env.OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.OUT, 'facade.json'), JSON.stringify(receipt, null, 2)); }
}
