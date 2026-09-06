import * as THREE from 'three';

export function createCabinShells({ root, colliders, occluders, wallMaterial, floorMaterial }) {
  const cabins = [], batches = new Map(), geometry = new THREE.BoxGeometry(1, 1, 1);
  const add = (st, chapa = false) => {
    const sign = st.x > 0 ? 1 : -1;
    const ax = chapa ? [-st.d[1], st.d[0]] : [sign, 0], az = chapa ? st.d : [0, sign];
    const floorY = chapa ? 2.3 : 3.85, height = chapa ? 2.5 : 2.18;
    const x0 = chapa ? -2.7 : -2, x1 = -x0, z0 = chapa ? -2.7 : -3.64, z1 = chapa ? 2.7 : -.4;
    const point = (x, y, z) => [st.x + ax[0] * x + az[0] * z, floorY + y, st.z + ax[1] * x + az[1] * z];
    const cabin = { id: `cabin-${st.x}-${st.z}`, x: st.x, z: st.z, chapa, floorY, height, ax, az, bounds: { x0, x1, z0, z1 }, segments: [], windows: [] };
    const box = (label, x, y, z, w, h, d, material = wallMaterial) => {
      if (w <= 0 || h <= 0 || d <= 0) return;
      const p = point(x, y, z), worldW = Math.abs(ax[0]) * w + Math.abs(az[0]) * d, worldD = Math.abs(ax[1]) * w + Math.abs(az[1]) * d;
      const segment = { minX: p[0] - worldW / 2, maxX: p[0] + worldW / 2, minY: p[1] - h / 2, maxY: p[1] + h / 2, minZ: p[2] - worldD / 2, maxZ: p[2] + worldD / 2, cabin: cabin.id, part: label };
      cabin.segments.push(segment); colliders.push(segment);
      const matrix = new THREE.Matrix4().makeScale(worldW, h, worldD).setPosition(...p);
      if (!batches.has(material)) batches.set(material, []);
      batches.get(material).push(matrix);
    };
    const wall = (axis, fixed, lo, hi, openings, label) => {
      const edges = [...new Set([lo, hi, ...openings.flatMap(h => [h.lo, h.hi])])].sort((a, b) => a - b);
      const segment = (a, b, bottom, top) => {
        if (axis === 'x') box(label, (a + b) / 2, (bottom + top) / 2, fixed, b - a, top - bottom, .16);
        else box(label, fixed, (bottom + top) / 2, (a + b) / 2, .16, top - bottom, b - a);
      };
      for (let i = 0; i + 1 < edges.length; i++) {
        const a = edges[i], b = edges[i + 1], middle = (a + b) / 2;
        const hole = openings.find(h => middle > h.lo && middle < h.hi);
        if (hole) { segment(a, b, 0, hole.bottom); segment(a, b, hole.top, height); }
        else segment(a, b, 0, height);
      }
      for (const h of openings.filter(h => h.kind === 'window')) {
        const middle = (h.lo + h.hi) / 2;
        cabin.windows.push({ wall: label, center: point(axis === 'x' ? middle : fixed, (h.bottom + h.top) / 2, axis === 'x' ? fixed : middle), width: h.hi - h.lo, bottom: floorY + h.bottom, top: floorY + h.top, normal: axis === 'x' ? az.map(n => n * (fixed === z1 ? 1 : -1)) : ax.map(n => n * (fixed === x1 ? 1 : -1)) });
      }
    };
    const doorX = chapa ? 0 : .6, door = { lo: doorX - .6, hi: doorX + .6, bottom: 0, top: 2.05, kind: 'door' };
    const window = (center, width) => ({ lo: center - width / 2, hi: center + width / 2, bottom: 1.0, top: 1.93, kind: 'window' });
    box('floor', (x0 + x1) / 2, -.07, (z0 + z1) / 2, x1 - x0, .14, z1 - z0, floorMaterial);
    box('threshold', doorX, -.07, z1 + .23, 1.2, .14, .46, floorMaterial);
    wall('x', z1, x0, x1, [door, window(chapa ? -1.75 : -1.05, chapa ? 1.05 : 1.15)], 'front');
    wall('x', z0, x0, x1, [window(0, 1.5)], 'back');
    for (const x of [x0, x1]) wall('z', x, z0, z1, [window((z0 + z1) / 2, 1.45)], x === x0 ? 'left' : 'right');
    cabin.door = { width: 1.2, height: 2.05, outside: point(doorX, 0, z1 + .75), threshold: point(doorX, 0, z1), inside: point(doorX, 0, z1 - .75) };
    cabin.contains = (x, z) => { const rx = x - st.x, rz = z - st.z, u = rx * ax[0] + rz * ax[1], v = rx * az[0] + rz * az[1]; return (u >= x0 && u <= x1 && v >= z0 && v <= z1) || (Math.abs(u - doorX) <= .6 && v >= z1 && v <= z1 + .46); };
    cabins.push(cabin);
    return cabin;
  };
  const build = () => {
    for (const [material, matrices] of batches) {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.name = 'paredes-cabanas-abertas'; mesh.castShadow = true; mesh.receiveShadow = true;
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      root.add(mesh); occluders.push(mesh);
    }
    batches.clear();
  };
  const floorAt = (x, z) => cabins.find(c => c.contains(x, z))?.floorY ?? null;
  return { add, build, cabins, floorAt };
}
