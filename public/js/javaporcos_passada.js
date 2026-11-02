import * as THREE from 'three';

const geometrias = new WeakMap();
const distantes = new WeakMap();
export function registrarGeometriaDistante(original, distante) { distantes.set(original,distante); }
const APOIO = .75;
const FASES = [0, .5, .75, .25];

function geometriaPatas(original) {
  if (geometrias.has(original)) return geometrias.get(original);
  const geometry = original.clone();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox, position = geometry.attributes.position;
  const height = box.max.y - box.min.y;
  const feet = Array.from({ length: 4 }, () => new THREE.Vector3(0, Infinity, 0));
  const indices = new Uint16Array(position.count * 4), weights = new Float32Array(position.count * 4);
  const midX = (box.min.x + box.max.x) / 2, midZ = (box.min.z + box.max.z) / 2;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const q = (x < midX ? 0 : 1) + (z < midZ ? 0 : 2);
    if (y < feet[q].y) feet[q].set(x, y, z);
    const t = THREE.MathUtils.clamp((y - box.min.y - height * .12) / (height * .26), 0, 1);
    const rootWeight = t * t * (3 - 2 * t);
    const headWeight = THREE.MathUtils.smoothstep(z, midZ + (box.max.z - midZ) * .4, box.max.z) * rootWeight;
    indices[i * 4 + 2] = 5;
    weights[i * 4 + 2] = headWeight;
    indices[i * 4 + 1] = q + 1;
    weights[i * 4] = rootWeight - headWeight;
    weights[i * 4 + 1] = 1 - rootWeight;
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const stride = Math.min(Math.abs(feet[2].z - feet[0].z) / 2, height * .38);
  const data = { geometry, feet, stride, height };
  geometrias.set(original, data);
  return data;
}

export function prepararPassada(pivo) {
  const sources = [];
  pivo.traverse(node => { if (node.isMesh && !node.isSkinnedMesh && node.geometry.attributes.position.count > 100) sources.push(node); });
  const rigs = [];
  for (const source of sources) {
    const data = geometriaPatas(source.geometry);
    if (!data.stride || data.feet.some(v => !Number.isFinite(v.y))) continue;
    const mesh = new THREE.SkinnedMesh(data.geometry, source.material);
    THREE.Mesh.prototype.copy.call(mesh, source, false);
    mesh.geometry = data.geometry;
    const root = new THREE.Bone();
    const bones = data.feet.map(() => { const bone = new THREE.Bone(); root.add(bone); return bone; });
    const head = new THREE.Bone(); head.position.set(0, data.geometry.boundingBox.min.y + data.height * .55, 0); root.add(head);
    mesh.add(root);
    source.parent.add(mesh);
    source.removeFromParent();
    mesh.bind(new THREE.Skeleton([root, ...bones, head]));
    data.geometry.computeBoundingSphere();
    mesh.boundingSphere = data.geometry.boundingSphere.clone();
    mesh.boundingSphere.radius += data.stride + data.height * .15;
    mesh.frustumCulled = true;
    const distante = distantes.has(source.geometry) ? geometriaPatas(distantes.get(source.geometry)).geometry : null;
    rigs.push({ mesh, bones, head, ...data, distante, pinned: [false, false, false, false],
      anchors: data.feet.map(() => new THREE.Vector3()), previousFeet: data.feet.map(() => new THREE.Vector3()),
      feetReady: false, local: new THREE.Vector3(), scale: new THREE.Vector3() });
  }
  pivo.userData.passada = { rigs, previous: new THREE.Vector3(), ready: false, phase: 0 };
}

export function selecionarDetalhePassada(pivo, distancia, mutante = '') {
  const state = pivo.userData.passada;
  if (!state) return;
  const longe = mutante !== 'sem-lod' && distancia > (state.longe ? 16 : 18);
  if (longe === state.longe) return;
  state.longe = longe;
  for (const rig of state.rigs) rig.mesh.geometry = longe && rig.distante ? rig.distante : rig.geometry;
}

export function atualizarPassada(pivo, pos, world, tempo, mutante = '') {
  const state = pivo.userData.passada;
  if (!state?.rigs.length) return;
  const distance = state.ready ? state.previous.distanceTo(pos) : 0;
  const dt = Math.min(.05, Math.max(0, tempo - (state.tempo ?? tempo)));
  state.tempo = tempo;
  state.previous.copy(pos); state.ready = true;
  pivo.updateMatrixWorld(true);
  const first = state.rigs[0];
  const stride = first.stride * first.mesh.getWorldScale(first.scale).z;
  state.phase = distance > stride * 2 ? 0 : (state.phase + distance / stride) % 1;
  for (const rig of state.rigs) {
    rig.mesh.getWorldScale(rig.scale);
    for (let i = 0; i < 4; i++) {
      const bone = rig.bones[i];
      const foot = rig.feet[i];
      if (mutante === 'patina' || distance > stride * 2) {
        bone.position.set(0, 0, 0); rig.pinned[i] = false;
        continue;
      }
      if (distance < 1e-7) {
        if (rig.pinned[i]) rig.local.copy(rig.anchors[i]);
        else {
          if (rig.feetReady && mutante !== 'parada-desliza') rig.local.copy(rig.previousFeet[i]);
          else { rig.local.copy(foot).add(bone.position); rig.mesh.localToWorld(rig.local); }
          const floor = world?.groundHeightAt?.(rig.local.x, rig.local.z) ?? rig.local.y;
          const dy = floor - rig.local.y, step = rig.height * rig.scale.y * dt;
          rig.local.y += THREE.MathUtils.clamp(dy, -step, step);
          if (Math.abs(dy) <= step) { rig.anchors[i].copy(rig.local); rig.pinned[i] = true; }
        }
        rig.mesh.worldToLocal(rig.local); bone.position.copy(rig.local).sub(foot);
        continue;
      }
      const phase = (state.phase + FASES[i]) % 1;
      if (phase < APOIO) {
        if (!rig.pinned[i]) {
          rig.local.copy(foot); rig.local.z += rig.stride * (APOIO / 2 - phase);
          rig.anchors[i].copy(rig.mesh.localToWorld(rig.local));
          if (world?.groundHeightAt) rig.anchors[i].y = world.groundHeightAt(rig.anchors[i].x, rig.anchors[i].z);
          if (mutante === 'apoio-no-ar') rig.anchors[i].y += rig.height * rig.scale.y;
          rig.pinned[i] = true;
        }
        rig.local.copy(rig.anchors[i]); rig.mesh.worldToLocal(rig.local);
        bone.position.copy(rig.local).sub(foot);
      } else {
        rig.pinned[i] = false;
        const t = (phase - APOIO) / (1 - APOIO);
        const ease = t * t * (3 - 2 * t);
        const targetY = Math.sin(Math.PI * t) * rig.height * .12;
        const dy = THREE.MathUtils.clamp(targetY - bone.position.y, -rig.height * dt * 8, rig.height * dt * 8);
        bone.position.set(0, bone.position.y + dy, rig.stride * APOIO * (ease - .5));
      }
    }
    for (let i = 0; i < 4; i++) rig.previousFeet[i].copy(rig.feet[i]).add(rig.bones[i].position).applyMatrix4(rig.mesh.matrixWorld);
    rig.feetReady = true;
  }
}

export function liberarPassada(root) {
  root?.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
}
