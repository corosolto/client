import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, seedRandom } from '../harness.mjs';
import { planoUV, metrosPorUV, TEXEL_ALVO } from '../../../public/js/map_uv.js';

const digest = value => createHash('sha256').update(value).digest('hex');
const encoded = value => JSON.stringify(value);
const texture = t => t ? { width: t.image?.width || null, height: t.image?.height || null,
  repeat: t.repeat.toArray(), offset: t.offset.toArray(), rotation: t.rotation, wrap: [t.wrapS, t.wrapT],
  colorSpace: t.colorSpace, min: t.minFilter, mag: t.magFilter, anisotropy: t.anisotropy } : null;
const groundTextures = T => encoded(['concrete', 'concreteDark', 'asphalt', 'dirt', 'grass'].map(k => [k, texture(T[k])]));

function preservation(scene, world, targets, T, nextRandom) {
  const hash = createHash('sha256'), seenGeometry = new Set(), materials = new Map(), textureRefs = new Map();
  const tex = t => { if (!t) return null; if (!textureRefs.has(t)) textureRefs.set(t, textureRefs.size); return [textureRefs.get(t), texture(t)]; };
  const mat = m => {
    if (materials.has(m)) return materials.get(m);
    const n = materials.size; materials.set(m, n);
    hash.update(encoded({ material: n, type: m.type, color: m.color?.getHex(), emissive: m.emissive?.getHex(),
      roughness: m.roughness, metalness: m.metalness, opacity: m.opacity, transparent: m.transparent,
      side: m.side, alphaTest: m.alphaTest, normalScale: m.normalScale?.toArray(),
      map: tex(m.map), normal: tex(m.normalMap), rough: tex(m.roughnessMap) }));
    return n;
  };
  scene.traverse(o => {
    if (!o.isMesh) return;
    hash.update(encoded({ type: o.type, name: o.name, position: o.position.toArray(), quaternion: o.quaternion.toArray(),
      scale: o.scale.toArray(), visible: o.visible, cast: o.castShadow, receive: o.receiveShadow,
      materials: (Array.isArray(o.material) ? o.material : [o.material]).map(mat) }));
    if (o.isInstancedMesh) { hash.update('instances:' + o.count); hash.update(Buffer.from(o.instanceMatrix.array.buffer)); }
    const g = o.geometry;
    if (seenGeometry.has(g)) return;
    seenGeometry.add(g);
    for (const [name, attr] of Object.entries(g.attributes)) {
      if (name === 'uv' && targets.some(m => m.geometry === g)) continue;
      hash.update(name + ':' + attr.itemSize + ':' + attr.normalized);
      hash.update(Buffer.from(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength));
    }
    if (g.index) hash.update(Buffer.from(g.index.array.buffer, g.index.array.byteOffset, g.index.array.byteLength));
  });
  return { nonTargetUVGeometryAndMaterials: hash.digest('hex'), contracts: digest(encoded({ colliders: world.colliders,
    bounds: world.bounds, spawns: world.spawns, waypoints: world.waypoints, ctf: world.ctfPoints,
    pickups: world.pickups.map(p => ({ x: p.x, z: p.z, weapon: p.weapon, kind: p.kind })) })),
    sharedGroundTextures: digest(groundTextures(T)), nextRandom };
}

function density(m) {
  const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv, t = m.material.map;
  return { x: Math.abs((uv.getX(1) - uv.getX(0)) * t.image.width * t.repeat.x / (p.getX(1) - p.getX(0))),
    z: Math.abs((uv.getY(2) - uv.getY(0)) * t.image.height * t.repeat.y / (p.getY(2) - p.getY(0))) };
}
// Eight Float32 ULPs cover UV storage/division; this is not a visual tolerance.
const metric = d => [d.x, d.z].every(v => Number.isFinite(v) && Math.abs(v - TEXEL_ALVO) <= TEXEL_ALVO * 2 ** -20);
const uvBytes = m => Buffer.from(m.geometry.attributes.uv.array.buffer).toString('hex');
const reset = m => { const g = new THREE.PlaneGeometry(m.geometry.parameters.width, m.geometry.parameters.height); m.geometry.attributes.uv.array.set(g.attributes.uv.array); g.dispose(); };

export const FLOOR_MUTANTS = ['quebrada-sem-uv', 'escadao-sem-inicial', 'escadao-sem-onload', 'escadao-acumula', 'escadao-ignora-repeat', 'escadao-ignora-dimensoes'];

export function measureSurfaceFloors(mutant = null) {
  if (mutant !== null && !FLOOR_MUTANTS.includes(mutant)) throw Error('Unknown floor mutation');
  const rows = [], signatures = {}, details = {};
  const row = (id, ok, actual) => rows.push({ id, ok, actual });
  for (const id of ['quebrada', 'escadao']) {
    const originalLoad = THREE.TextureLoader.prototype.load, originalRandom = Math.random, requests = [];
    try {
      THREE.TextureLoader.prototype.load = function(url, onLoad) { const t = new THREE.Texture(); requests.push({ url, t, onLoad }); return t; };
      seedRandom(1153);
      const T = initTextures(), scene = new THREE.Scene(), world = MAPS[id].build(scene, T), nextRandom = Math.random();
      const targets = [];
      scene.traverse(m => {
        const g = m.geometry?.parameters;
        if (!m.isMesh || m.geometry?.type !== 'PlaneGeometry') return;
        if (id === 'quebrada' && g.width === 5.5 && g.height === 44 && m.position.z === 2 && m.position.y === .02) targets.push(m);
        if (id === 'escadao' && g.width === 36 && Math.abs(g.height - 34.56) < 1e-9 && Math.abs(m.position.y - 7.58) < 1e-9) targets.push(m);
      });
      if (targets.length !== (id === 'quebrada' ? 2 : 1)) throw Error('NAO_MEDIDO: floor identity ' + id);
      targets.sort((a,b) => a.position.x - b.position.x);
      const shared = groundTextures(T);
      if (mutant === 'quebrada-sem-uv' && id === 'quebrada') targets.forEach(reset);
      const floor = targets[0], mat = floor.material;
      if (id === 'escadao' && mutant?.startsWith('escadao-')) {
        if (typeof mat.userData.onExternalTex !== 'function') throw Error('NAO_APLICOU: missing floor hook');
        if (mutant === 'escadao-sem-inicial') reset(floor);
        if (mutant === 'escadao-sem-onload') delete mat.userData.onExternalTex;
        if (mutant === 'escadao-acumula') mat.userData.onExternalTex = () => planoUV(floor.geometry, 36, 34.56, metrosPorUV(mat));
        if (mutant.includes('ignora-')) {
          const base = new THREE.PlaneGeometry(36, 34.56).attributes.uv.array.slice();
          mat.userData.onExternalTex = () => {
            floor.geometry.attributes.uv.array.set(base);
            const t = mat.map, fake = { map: { image: mutant.endsWith('dimensoes') ? { width: 512, height: 512 } : t.image,
              repeat: mutant.endsWith('repeat') ? { x: 1, y: 1 } : t.repeat, wrapS: t.wrapS, wrapT: t.wrapT } };
            planoUV(floor.geometry, 36, 34.56, metrosPorUV(fake));
          };
        }
      }
      signatures[id] = { fallback: preservation(scene, world, targets, T, nextRandom) };
      details[id] = targets.map(m => ({ position: m.position.toArray(), dimensions: m.geometry.parameters, density: density(m) }));
      targets.forEach((m, i) => row(id + ':fallback:' + i, metric(density(m)), density(m)));
      if (id === 'escadao') {
        const matching = requests.filter(r => r.url === '/img/textures/concrete_br.webp' && r.t.repeat.x === 4 && r.t.repeat.y === 4);
        if (matching.length !== 1 || typeof matching[0].onLoad !== 'function') throw Error('NAO_MEDIDO: concrete loader callback');
        const request = matching[0], old = [mat.map, mat.normalMap, mat.roughnessMap];
        row('escadao:fallback-held', mat.map === T.concrete && mat.normalMap === old[1] && mat.roughnessMap === old[2]);
        request.t.image = { width: 512, height: 512 }; request.t.needsUpdate = true; request.onLoad(request.t);
        row('escadao:onload', metric(density(floor)), density(floor));
        row('escadao:adopted', mat.map === request.t && request.t.repeat.x === 4 && request.t.repeat.y === 4);
        signatures[id].external = preservation(scene, world, targets, T, nextRandom);
        const first = uvBytes(floor); request.onLoad(request.t);
        row('escadao:double', uvBytes(floor) === first);
        row('escadao:double-density', metric(density(floor)), density(floor));
        request.t.image = { width: 1024, height: 256 }; request.t.repeat.set(2, 3); request.t.needsUpdate = true; request.onLoad(request.t);
        row('escadao:dimensions-repeat', metric(density(floor)), density(floor));
        signatures[id].changedSampler = preservation(scene, world, targets, T, nextRandom);
        const changed = uvBytes(floor); request.onLoad(request.t);
        row('escadao:changed-double', uvBytes(floor) === changed && metric(density(floor)));
      }
      row(id + ':shared-ground', groundTextures(T) === shared);
    } finally { THREE.TextureLoader.prototype.load = originalLoad; Math.random = originalRandom; }
  }
  return { rows, failed: rows.filter(r => !r.ok).map(r => r.id), signatures, details };
}
