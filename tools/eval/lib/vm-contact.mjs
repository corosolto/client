import * as THREE from '../../../public/vendor/three.module.js';

export function meshTriangles(mesh, select = null) {
  const geometry = mesh.geometry, attributes = geometry.attributes;
  const vertices = Array.from({ length: attributes.position.count }, (_, i) => {
    const point = new THREE.Vector3().fromBufferAttribute(attributes.position, i);
    if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, point);
    return point.applyMatrix4(mesh.matrixWorld);
  });
  const result = [];
  const count = geometry.index?.count ?? vertices.length;
  for (let offset = 0; offset < count; offset += 3) {
    const ids = [0, 1, 2].map((i) => geometry.index ? geometry.index.getX(offset + i) : offset + i);
    if (select && !select(ids)) continue;
    const points = ids.map((i) => vertices[i]);
    result.push({ ids, points, box: new THREE.Box3().setFromPoints(points), face: offset / 3, mesh });
  }
  return result;
}

function crosses(one, two) {
  for (let i = 0; i < 3; i++) {
    const origin = one[i], delta = one[(i + 1) % 3].clone().sub(origin), length = delta.length();
    if (length < 1e-9) continue;
    const ray = new THREE.Ray(origin, delta.divideScalar(length));
    const hit = ray.intersectTriangle(...two, false, new THREE.Vector3());
    if (hit && hit.distanceTo(origin) > 1e-8 && hit.distanceTo(origin) < length - 1e-8) return hit;
  }
  return null;
}

export function intersectionPairs(one, two) {
  const region = new THREE.Box3();
  for (const triangle of one) region.union(triangle.box);
  const nearby = two.filter((triangle) => region.intersectsBox(triangle.box));
  const hits = [];
  for (const a of one) for (const b of nearby) {
    if (!a.box.intersectsBox(b.box)) continue;
    const point = crosses(a.points, b.points) || crosses(b.points, a.points);
    if (point) hits.push({ one: a, two: b, point });
  }
  return hits;
}

export function jointWeight(mesh, vertex, pattern) {
  const { skinIndex, skinWeight } = mesh.geometry.attributes;
  let sum = 0;
  for (const get of ['getX', 'getY', 'getZ', 'getW']) {
    if (pattern.test(mesh.skeleton.bones[skinIndex[get](vertex)].name)) sum += skinWeight[get](vertex);
  }
  return sum;
}

// Paridade em três direções evita confundir aresta compartilhada ou contato com interior.
export function containedVertices(one, solid, epsilon = 0.0002) {
  const bounds = new THREE.Box3();
  for (const t of solid) bounds.union(t.box);
  const directions = [[1, 0.371, 0.193], [0.217, 1, 0.413], [0.331, 0.173, 1]]
    .map(v => new THREE.Vector3(...v).normalize());
  const point = new THREE.Vector3(), triangle = new THREE.Triangle();
  let count = 0;
  for (const vertex of new Set(one.flatMap(t => t.points))) {
    if (!bounds.containsPoint(vertex)) continue;
    if (solid.some(t => t.box.distanceToPoint(vertex) <= epsilon
      && triangle.set(...t.points).closestPointToPoint(vertex, point).distanceTo(vertex) <= epsilon)) continue;
    const inside = directions.every(direction => {
      const ray = new THREE.Ray(vertex, direction), distances = [];
      for (const t of solid) {
        if (!ray.intersectsBox(t.box)) continue;
        const hit = ray.intersectTriangle(...t.points, false, point);
        if (hit) distances.push(hit.distanceTo(vertex));
      }
      distances.sort((a,b) => a-b);
      return distances.filter((v,i) => i === 0 || v-distances[i-1] > 1e-7).length % 2 === 1;
    });
    if (inside) count++;
  }
  return count;
}
