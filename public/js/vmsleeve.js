import * as THREE from 'three';

// Manga KINEMATION termina aberta no deltoide, a poucos cm da câmera do pacote; o frame por
// arma (z<0) traz essa boca ao quadro. Régua: tools/eval/vm-manga-oca-check.mjs.
export const SLEEVE_MATERIAL = /CoroSolto_FP_Cloth/i;
const MIN_LOOP = 8;
const RINGS = 4;
const GET = ['getX', 'getY', 'getZ', 'getW'];

function weldKey(position, index) {
  return `${Math.round(position.getX(index) * 1e4)},${Math.round(position.getY(index) * 1e4)},${Math.round(position.getZ(index) * 1e4)}`;
}

/** Bocas abertas da malha: laços de arestas de borda após soldar vértices por posição. */
export function sleeveOpenings(geometry) {
  const position = geometry.attributes.position;
  const count = geometry.index ? geometry.index.count : position.count;
  const indexAt = geometry.index ? (i) => geometry.index.getX(i) : (i) => i;
  const weld = new Map();
  const welded = new Int32Array(position.count);
  const representative = [];
  for (let i = 0; i < position.count; i += 1) {
    const key = weldKey(position, i);
    if (!weld.has(key)) { weld.set(key, representative.length); representative.push(i); }
    welded[i] = weld.get(key);
  }
  const edges = new Map();
  for (let t = 0; t < count; t += 3) {
    const tri = [welded[indexAt(t)], welded[indexAt(t + 1)], welded[indexAt(t + 2)]];
    for (let k = 0; k < 3; k += 1) {
      const a = tri[k], b = tri[(k + 1) % 3];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = edges.get(key);
      if (hit) hit.n += 1; else edges.set(key, { a, b, n: 1 });
    }
  }
  // Aresta de borda na ordem do seu triângulo: a parede nova corre no sentido oposto.
  const next = new Map();
  for (const { a, b, n } of edges.values()) if (n === 1) next.set(a, b);
  const loops = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let v = start;
    while (v !== undefined && !seen.has(v)) { seen.add(v); loop.push(v); v = next.get(v); }
    if (v === start && loop.length >= MIN_LOOP) loops.push(loop);
  }
  return { loops, representative };
}

const readAll = (attribute) => {
  const values = [];
  for (let i = 0; i < attribute.count; i += 1) for (let c = 0; c < attribute.itemSize; c += 1) values.push(attribute[GET[c]](i));
  return values;
};

function anchorBone(skeleton, dominant) {
  for (let bone = skeleton.bones[dominant]; bone; bone = bone.parent) {
    if (/spine|neck|chest/i.test(bone.name)) return skeleton.bones.indexOf(bone);
  }
  return -1;
}

// Prolonga cada boca `length` m atrás da câmera (+z de `space`), pele indo ao tronco, ponta fechada;
// repouso resolvido na pose do idle. Caso e números: docs/reports/VM-FIX-MESH-2026-09-23.md.
export function extendSleeveOpenings(mesh, { space = null, length = 0.9, pose = null } = {}) {
  const source = mesh.geometry;
  if (!mesh.isSkinnedMesh || !source?.attributes?.position || mesh.userData.sleeveExtended) return 0;
  if (source.groups.length > 1 || !source.attributes.skinIndex) return 0;
  const { loops, representative } = sleeveOpenings(source);
  if (!loops.length) return 0;
  // A pose padrão dos nós não é a de jogo (braço ~1,9 m abaixo da câmera): resolve no idle.
  let mixer = null;
  if (pose?.clip && pose.root) {
    mixer = new THREE.AnimationMixer(pose.root);
    mixer.clipAction(pose.clip).play();
    mixer.setTime(0);
  }
  try {
    return extendAtCurrentPose(mesh, source, loops, representative, space, length);
  } finally {
    if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(pose.root); }
  }
}

function extendAtCurrentPose(mesh, source, loops, representative, space, length) {
  space?.updateWorldMatrix(true, false);
  mesh.updateWorldMatrix(true, false);
  // updateWorldMatrix não renova o bindMatrixInverse do modo attached; o render renova.
  if (mesh.bindMode === 'attached') mesh.bindMatrixInverse.copy(mesh.matrixWorld).invert();
  for (const bone of mesh.skeleton.bones) bone.updateWorldMatrix(true, false);
  const toSpace = new THREE.Matrix4();
  if (space) toSpace.copy(space.matrixWorld).invert();
  toSpace.multiply(mesh.matrixWorld);
  const boneMatrix = (index) => new THREE.Matrix4().multiplyMatrices(mesh.skeleton.bones[index].matrixWorld, mesh.skeleton.boneInverses[index]);
  const names = Object.keys(source.attributes);
  const itemSize = Object.fromEntries(names.map((name) => [name, source.attributes[name].itemSize]));
  // glTF pode intercalar atributos: `.array` seria o buffer inteiro, então lê por componente.
  const data = Object.fromEntries(names.map((name) => [name, readAll(source.attributes[name])]));
  const morphNames = Object.keys(source.morphAttributes || {});
  const morph = Object.fromEntries(morphNames.map((name) => [name, source.morphAttributes[name].map((a) => ({ values: readAll(a), itemSize: a.itemSize }))]));
  const indices = source.index
    ? Array.from({ length: source.index.count }, (_, i) => source.index.getX(i))
    : Array.from({ length: source.attributes.position.count }, (_, i) => i);
  let vertexCount = source.attributes.position.count;
  const read = (name, i) => data[name].slice(i * itemSize[name], (i + 1) * itemSize[name]);
  const skinOf = (i) => {
    const bones = read('skinIndex', i), weights = read('skinWeight', i);
    return bones.map((b, k) => [b, weights[k]]).filter(([, w]) => w > 0);
  };
  const push = (from, position, skin) => {
    for (const name of names) {
      if (name === 'position') data[name].push(...position);
      else if (name === 'skinIndex') data[name].push(...skin.map(([b]) => b));
      else if (name === 'skinWeight') data[name].push(...skin.map(([, w]) => w));
      else data[name].push(...read(name, from));
    }
    for (const name of morphNames) for (const target of morph[name]) target.values.push(...new Array(target.itemSize).fill(0));
    return vertexCount++;
  };
  const posed = (i) => {
    const v = new THREE.Vector3(...read('position', i));
    mesh.applyBoneTransform(i, v);
    return v.applyMatrix4(toSpace);
  };
  const ends = [];
  const back = new THREE.Vector3(0, 0, 1);
  for (const loop of loops) {
    const ring = loop.map((w) => representative[w]);
    const totals = new Map();
    for (const i of ring) for (const [b, w] of skinOf(i)) totals.set(b, (totals.get(b) || 0) + w);
    const dominant = [...totals].sort((a, b) => b[1] - a[1])[0]?.[0];
    const anchor = dominant === undefined ? -1 : anchorBone(mesh.skeleton, dominant);
    if (anchor < 0) continue;
    const start = ring.map(posed);
    // Boca à frente da câmera (antebraço cortado no cotovelo: lmg, shotgun) ganha a distância que falta.
    const reach = length + Math.max(0, -start.reduce((z, p) => Math.min(z, p.z), Infinity));
    let previous = ring;
    for (let r = 1; r <= RINGS; r += 1) {
      const f = r / RINGS;
      const current = ring.map((i, k) => {
        const blend = new Map([[anchor, f]]);
        for (const [b, w] of skinOf(i)) blend.set(b, (blend.get(b) || 0) + w * (1 - f));
        const skin = [...blend].sort((a, b) => b[1] - a[1]).slice(0, 4);
        const sum = skin.reduce((s, [, w]) => s + w, 0);
        skin.forEach((pair) => { pair[1] /= sum; });
        while (skin.length < 4) skin.push([0, 0]);
        const mixed = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        for (const [b, w] of skin) {
          if (w <= 0) continue;
          const m = boneMatrix(b);
          for (let e = 0; e < 16; e += 1) mixed.elements[e] += m.elements[e] * w;
        }
        const full = new THREE.Matrix4().copy(toSpace).multiply(mesh.bindMatrixInverse).multiply(mixed).multiply(mesh.bindMatrix);
        const rest = start[k].clone().addScaledVector(back, reach * f).applyMatrix4(full.invert());
        return push(i, rest.toArray(), skin);
      });
      for (let k = 0; k < ring.length; k += 1) {
        const a = previous[k], b = previous[(k + 1) % ring.length];
        const a2 = current[k], b2 = current[(k + 1) % ring.length];
        indices.push(b, a, a2, b, a2, b2);
      }
      previous = current;
    }
    const tipRest = previous.reduce((sum, i) => sum.add(new THREE.Vector3(...read('position', i))), new THREE.Vector3()).divideScalar(previous.length);
    const tip = push(previous[0], tipRest.toArray(), read('skinIndex', previous[0]).map((b, k) => [b, read('skinWeight', previous[0])[k]]));
    for (let k = 0; k < ring.length; k += 1) indices.push(previous[(k + 1) % ring.length], previous[k], tip);
    ends.push(...previous, tip);
  }
  if (!ends.length) return 0;
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const attribute = source.attributes[name];
    // getX já devolve valor desnormalizado; grava cru, sem `normalized`.
    const Typed = name === 'skinIndex' ? Uint16Array : attribute.normalized ? Float32Array : attribute.array.constructor;
    out.setAttribute(name, new THREE.BufferAttribute(new Typed(data[name]), attribute.itemSize, false));
  }
  for (const name of morphNames) {
    out.morphAttributes[name] = morph[name].map((target, k) => {
      const attribute = new THREE.Float32BufferAttribute(target.values, target.itemSize);
      attribute.name = source.morphAttributes[name][k].name;
      return attribute;
    });
  }
  out.morphTargetsRelative = source.morphTargetsRelative;
  out.setIndex(vertexCount > 65535 ? new THREE.Uint32BufferAttribute(indices, 1) : new THREE.Uint16BufferAttribute(indices, 1));
  if (source.groups.length === 1) out.addGroup(0, indices.length, source.groups[0].materialIndex);
  out.computeBoundingBox();
  out.computeBoundingSphere();
  mesh.geometry = out;
  mesh.userData.sleeveExtended = loops.length;
  mesh.userData.sleeveEnds = ends;
  return loops.length;
}
