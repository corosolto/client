/* Lajes: pinta o raio CTF somente sobre as lajes existentes. O raio de captura
   continua4,5m; este adaptador não muda disputa, progresso, bots ou outros mapas. */
import * as THREE from 'three';

function clipGeometry(source, rects) {
  const positions = [], uvs = [], attr = source.attributes.position, uv = source.attributes.uv;
  const index = source.index, count = index ? index.count : attr.count;
  const clip = (poly, axis, edge, greater) => {
    const out = [], inside = (p) => greater ? p[axis] >= edge : p[axis] <= edge;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ai = inside(a), bi = inside(b);
      if (ai) out.push(a);
      if (ai !== bi) {
        const t = (edge - a[axis]) / (b[axis] - a[axis]);
        out.push(a.map((v, j) => v + (b[j] - v) * t));
      }
    }
    return out;
  };
  for (let i = 0; i < count; i += 3) {
    const triangle = [];
    for (let j = 0; j < 3; j++) {
      const k = index ? index.getX(i + j) : i + j;
      triangle.push([attr.getX(k), attr.getY(k), uv.getX(k), uv.getY(k)]);
    }
    for (const [x0, x1, y0, y1] of rects) {
      let p = clip(triangle, 0, x0, true); p = clip(p, 0, x1, false);
      p = clip(p, 1, y0, true); p = clip(p, 1, y1, false);
      for (let j = 1; j + 1 < p.length; j++) {
        const [a, b, c] = [p[0], p[j], p[j + 1]];
        if (Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-9) continue;
        for (const v of [a, b, c]) { positions.push(v[0], v[1], 0); uvs.push(v[2], v[3]); }
      }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.computeVertexNormals();
  return out;
}

export function makeLajesCTFSurface(parts, roofHeight) {
  const cache = new Map();
  return ({ id, x, z, r, ring, zone }) => {
    if (!cache.has(id)) {
      const rects = (sign) => parts.map(p => [(p.x0 - x) / r, (p.x1 - x) / r,
        Math.min(sign * (p.z0 - z) / r, sign * (p.z1 - z) / r),
        Math.max(sign * (p.z0 - z) / r, sign * (p.z1 - z) / r)]);
      const outline = new THREE.RingGeometry(.994, 1.006, 64).rotateX(Math.PI);
      const disk = new THREE.CircleGeometry(1, 64);
      cache.set(id, { ring: clipGeometry(outline, rects(1)), zone: clipGeometry(disk, rects(-1)) });
      outline.dispose(); disk.dispose();
    }
    ring.geometry = cache.get(id).ring; zone.geometry = cache.get(id).zone;
    ring.position.y = roofHeight + .025; zone.position.y = roofHeight + .018;
    zone.material.opacity = .08;
  };
}
