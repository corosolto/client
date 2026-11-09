import * as THREE from 'three';

export function lajesOcclusionQuery(occluders) {
  const priority = occluders.filter(mesh => mesh.name === 'lajes-alvenaria'), indexed = new Set(priority), hits = [];
  return raycaster => {
    for (const mesh of priority) {
      hits.length = 0; raycaster.intersectObject(mesh, false, hits);
      if (hits.length) return true;
    }
    for (const mesh of occluders) {
      if (indexed.has(mesh)) continue;
      hits.length = 0; raycaster.intersectObject(mesh, false, hits);
      if (hits.length) return true;
    }
    return false;
  };
}

// BUG-141: filtra faixas da malha estática sem fragmentar os lotes desenhados.
// A árvore é do espaço local da geometria: cópias do mesmo prop (mesma geometria) reaproveitam.
const arvores = new WeakMap(), pilha = [], folhas = [], porInicio = (a, b) => a.start - b.start;
export function indexLajesRaycast(mesh) {
  const source = mesh.geometry, position = source.attributes.position, index = source.index;
  const count = index?.count || position.count;
  if (mesh.isInstancedMesh || mesh.isSkinnedMesh || Object.keys(source.morphAttributes).length || count < 36) return () => {};
  let cache = arvores.get(source);
  if (!cache || cache.position !== position || cache.index !== index || cache.positionVersion !== position.version || cache.indexVersion !== index?.version) {
    cache = { position, index, positionVersion: position.version, indexVersion: index?.version, tree: montarArvore(position, index, count) };
    arvores.set(source, cache);
  }
  const tree = cache.tree, geometry = new THREE.BufferGeometry();
  geometry.attributes = source.attributes; geometry.index = index; geometry.groups = source.groups;
  // Esfera calculada só no 1º raio, como o Mesh.raycast: calcular antes deixava marca no mapa
  // (map_decals.js mede com esfera nula) e mudava a partida em relação ao raycast linear.
  const proxy = new THREE.Mesh(geometry, mesh.material), localRay = new THREE.Ray(), inverse = new THREE.Matrix4();
  const original = mesh.raycast, positionVersion = position.version, indexVersion = index?.version;
  function raycast(raycaster, hits) {
    if (mesh.geometry !== source || source.attributes.position !== position || source.index !== index ||
        position.version !== positionVersion || index?.version !== indexVersion || Array.isArray(mesh.material) ||
        source.drawRange.start % 3 !== 0) return original.call(mesh, raycaster, hits);
    proxy.matrixWorld = mesh.matrixWorld; proxy.material = mesh.material; proxy.name = mesh.name;
    if (source.boundingSphere === null) source.computeBoundingSphere();
    geometry.boundingSphere = source.boundingSphere;
    localRay.copy(raycaster.ray).applyMatrix4(inverse.copy(mesh.matrixWorld).invert());
    const firstHit = hits.length, start = source.drawRange.start, end = start + source.drawRange.count, candidates = folhas;
    // Pilha e folhas reaproveitadas entre raios (LOS de bot é dezenas por quadro): sem closure nem array novo.
    candidates.length = 0; pilha.length = 0; pilha.push(tree);
    while (pilha.length) {
      const node = pilha.pop();
      if (!localRay.intersectsBox(node.bounds)) continue;
      if (node.left) pilha.push(node.right, node.left); else candidates.push(node);
    }
    candidates.sort(porInicio);
    for (const node of candidates) {
      const lo = Math.max(start, node.start), hi = Math.min(end, node.end);
      if (hi <= lo) continue;
      geometry.boundingBox = node.bounds; geometry.setDrawRange(lo, hi - lo);
      THREE.Mesh.prototype.raycast.call(proxy, raycaster, hits);
    }
    for (let i = firstHit; i < hits.length; i++) hits[i].object = mesh;
  }
  mesh.raycast = raycast;
  return () => { if (mesh.raycast === raycast) mesh.raycast = original; geometry.dispose(); };
}

function montarArvore(position, index, count) {
  const ranges = [], point = new THREE.Vector3();
  for (let start = 0; start < count; start += 36) {
    const end = Math.min(count, start + 36), bounds = new THREE.Box3();
    for (let i = start; i < end; i++) bounds.expandByPoint(point.fromBufferAttribute(position, index ? index.getX(i) : i));
    ranges.push({ start, end, bounds });
  }
  function build(items) {
    if (items.length === 1) return items[0];
    const bounds = new THREE.Box3();
    for (const item of items) bounds.union(item.bounds);
    const size = bounds.getSize(new THREE.Vector3());
    const axis = size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
    items.sort((a, b) => (a.bounds.min[axis] + a.bounds.max[axis]) - (b.bounds.min[axis] + b.bounds.max[axis]));
    const mid = Math.floor(items.length / 2);
    return { bounds, left: build(items.slice(0, mid)), right: build(items.slice(mid)) };
  }
  return build(ranges);
}
