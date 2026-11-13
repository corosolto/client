import * as THREE from 'three';

export function visibleFrameBounds(root) {
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  root.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);
  root.traverseVisible(mesh => {
    const geometry = mesh.geometry;
    const position = geometry?.attributes.position;
    if (!mesh.isMesh || !position) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const index = geometry.index;
    const count = index ? index.count : position.count;
    const drawStart = geometry.drawRange.start;
    const drawEnd = Math.min(count, drawStart + geometry.drawRange.count);
    const groups = Array.isArray(mesh.material) ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    for (const group of groups) {
      const material = materials[group.materialIndex];
      if (!material || material.visible === false || (material.transparent && material.opacity === 0)) continue;
      const start = Math.max(drawStart, group.start);
      const end = Math.min(drawEnd, group.start + group.count);
      for (let n = start; n < end; n++) {
        const i = index ? index.getX(n) : n;
        mesh.getVertexPosition(i, vertex);
        bounds.expandByPoint(vertex.applyMatrix4(mesh.matrixWorld));
      }
    }
  });
  if (bounds.isEmpty()) throw new Error('charvideo: personagem sem geometria visível');
  return bounds;
}

export function sampleAnimatedEnvelope(root, advance, { seconds, fps }) {
  const frames = Math.ceil(seconds * fps);
  const boxes = [];
  for (let frame = 0; frame <= frames; frame++) {
    if (frame) advance(1 / fps);
    boxes.push(visibleFrameBounds(root));
  }
  return boxes;
}

export function fitPerspectiveFrame(boxes, { fov, aspect, originX, originZ, shot, fatia = 1.16, targetY }) {
  const bounds = new THREE.Box3();
  for (const box of boxes) bounds.union(box);
  if (bounds.isEmpty()) throw new Error('charvideo: envelope animado vazio');
  const height = Math.max(0.1, bounds.max.y - bounds.min.y);
  const bust = shot === 'busto';
  targetY ??= bounds.min.y + height * (bust ? 0.84 : 0.52);
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const tanX = tanY * aspect;
  let distance = 0;
  for (const box of boxes) {
    const bottom = bust ? Math.max(box.min.y, targetY - height * 0.42 / 2) : box.min.y;
    const top = bust ? Math.min(box.max.y, targetY + height * 0.42 / 2) : box.max.y;
    if (bottom > top) continue;
    for (const x of [box.min.x, box.max.x]) for (const y of [bottom, top]) for (const z of [box.min.z, box.max.z]) {
      const depth = z - originZ;
      distance = Math.max(distance, Math.abs(y - targetY) * (bust ? 1 : fatia) / tanY - depth, 0.05 - depth);
      if (!bust) distance = Math.max(distance, Math.abs(x - originX) * fatia / tanX - depth);
    }
  }
  return { bounds, targetY, distance };
}
