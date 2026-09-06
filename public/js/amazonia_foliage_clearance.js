import * as THREE from 'three';

export function clearCabinFoliage(root, cabins, occluders) {
  root.updateMatrixWorld(true);
  const rooms = cabins.map(c => {
    const box = new THREE.Box3();
    for (const x of [c.bounds.x0, c.bounds.x1]) for (const z of [c.bounds.z0, c.bounds.z1]) {
      box.expandByPoint(new THREE.Vector3(c.x + c.ax[0] * x + c.az[0] * z, c.floorY, c.z + c.ax[1] * x + c.az[1] * z));
    }
    box.min.x -= .3; box.min.z -= .3; box.max.x += .3; box.max.z += .3;
    // Alturas das coberturas em map_amazonia.estacao e tools/amazonia-cabin-asset.mjs.
    const roofY = c.chapa ? c.floorY + c.height + .30 + Math.sin(.18) * 1.65 + Math.cos(.18) * .05 : 7.1;
    box.max.y = roofY + .05;
    return box;
  });
  for (const cabin of cabins) for (const window of cabin.windows || []) {
    const [nx, nz] = window.normal, box = new THREE.Box3(), halfWidth = window.width / 2 + .15;
    for (const depth of [-.1, .9]) for (const side of [-halfWidth, halfWidth]) {
      box.expandByPoint(new THREE.Vector3(window.center[0] + nx * depth - nz * side, window.bottom - .1, window.center[2] + nz * depth + nx * side));
    }
    box.max.y = window.top + .1; rooms.push(box);
  }
  const stats = { inspectedInstances: 0, affectedInstances: 0, removedTriangles: 0, createdMeshes: 0, rooms: cabins.length, clearanceVolumes: rooms.length };
  if (!rooms.length) return stats;
  const candidates = [];
  root.traverse(mesh => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (mesh.isMesh && !mesh.userData.cabinFoliageClearance && materials.some(m => /Árvore de mata|Palmeira babaçu/i.test(m?.name || ''))) candidates.push(mesh);
  });
  const rootInverse = root.matrixWorld.clone().invert(), local = new THREE.Matrix4(), world = new THREE.Matrix4();
  const triangle = new THREE.Triangle(), triBounds = new THREE.Box3(), bounds = new THREE.Box3(), color = new THREE.Color();
  const trimmedGeometry = (source, matrix) => {
    if (!source.boundingBox) source.computeBoundingBox();
    bounds.copy(source.boundingBox).applyMatrix4(matrix);
    const nearby = rooms.filter(room => room.intersectsBox(bounds));
    if (!nearby.length) return null;
    const positions = source.getAttribute('position'), index = source.index;
    const count = index ? index.count : positions.count, kept = [], groupCounts = [];
    let removed = 0;
    for (let start = 0; start < count; start += 3) {
      const ids = [0, 1, 2].map(i => index ? index.getX(start + i) : start + i);
      triangle.a.fromBufferAttribute(positions, ids[0]).applyMatrix4(matrix);
      triangle.b.fromBufferAttribute(positions, ids[1]).applyMatrix4(matrix);
      triangle.c.fromBufferAttribute(positions, ids[2]).applyMatrix4(matrix);
      triBounds.setFromPoints([triangle.a, triangle.b, triangle.c]);
      if (nearby.some(room => room.intersectsBox(triBounds) && room.intersectsTriangle(triangle))) { removed++; continue; }
      kept.push(...ids);
      if (source.groups.length) {
        const group = source.groups.find(g => start >= g.start && start < g.start + g.count);
        const materialIndex = group?.materialIndex || 0, previous = groupCounts[groupCounts.length - 1];
        if (previous?.materialIndex === materialIndex) previous.count += 3;
        else groupCounts.push({ start: kept.length - 3, count: 3, materialIndex });
      }
    }
    if (!removed) return null;
    const geometry = source.clone(); geometry.setIndex(kept); geometry.clearGroups();
    for (const group of groupCounts) geometry.addGroup(group.start, group.count, group.materialIndex);
    geometry.setDrawRange(0, kept.length); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    stats.removedTriangles += removed;
    return geometry;
  };
  for (const mesh of candidates) {
    if (!mesh.isInstancedMesh) {
      stats.inspectedInstances++;
      const geometry = trimmedGeometry(mesh.geometry, mesh.matrixWorld);
      if (geometry) { mesh.geometry = geometry; mesh.userData.cabinFoliageClearance = true; stats.affectedInstances++; }
      continue;
    }
    let retained = 0;
    for (let i = 0; i < mesh.count; i++) {
      stats.inspectedInstances++; mesh.getMatrixAt(i, local); world.multiplyMatrices(mesh.matrixWorld, local);
      const geometry = trimmedGeometry(mesh.geometry, world);
      if (!geometry) {
        if (i !== retained) {
          mesh.setMatrixAt(retained, local);
          if (mesh.instanceColor) { mesh.getColorAt(i, color); mesh.setColorAt(retained, color); }
        }
        retained++;
        continue;
      }
      stats.affectedInstances++;
      if (!geometry.index.count) { geometry.dispose(); continue; }
      let material = mesh.material;
      if (mesh.instanceColor) {
        mesh.getColorAt(i, color);
        const tinted = m => { const copy = m.clone(); if (copy.color) copy.color.multiply(color); return copy; };
        material = Array.isArray(material) ? material.map(tinted) : tinted(material);
      }
      const replacement = new THREE.Mesh(geometry, material);
      replacement.name = mesh.name; replacement.userData = { ...mesh.userData, cabinFoliageClearance: true };
      replacement.castShadow = mesh.castShadow; replacement.receiveShadow = mesh.receiveShadow;
      replacement.frustumCulled = mesh.frustumCulled; replacement.layers.mask = mesh.layers.mask;
      replacement.renderOrder = mesh.renderOrder; replacement.visible = mesh.visible;
      replacement.matrix.multiplyMatrices(rootInverse, world);
      replacement.matrix.decompose(replacement.position, replacement.quaternion, replacement.scale);
      replacement.matrixAutoUpdate = false;
      root.add(replacement); occluders.push(replacement); stats.createdMeshes++;
    }
    if (retained !== mesh.count) {
      mesh.count = retained; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (retained) { mesh.computeBoundingBox(); mesh.computeBoundingSphere(); }
      else {
        mesh.visible = false;
        for (let i = occluders.length - 1; i >= 0; i--) if (occluders[i] === mesh) occluders.splice(i, 1);
      }
    }
  }
  root.updateMatrixWorld(true);
  return stats;
}
