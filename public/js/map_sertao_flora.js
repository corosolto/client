// Folhas e raminhos autorais; procedência e limites em docs/reports/SERTAO-FLORA.md.
import * as THREE from 'three';

let sprig;
export function sertaoLeafSprig() {
  if (sprig) return sprig;
  const vertices = [], uvs = [], indices = [];
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, x = (i >> 1) * .12 - .12, z = side * .08;
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * Math.PI * 2, length = Math.cos(a) * .065, width = Math.sin(a) * .04;
      vertices.push(x + length * .3 + width * .954, Math.sin(i * 1.7) * .005 + length * .06, z + side * (length * .954 - width * .3));
      uvs.push(.5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5);
    }
    const k = i * 6;
    indices.push(k, k + 1, k + 2, k, k + 2, k + 3, k, k + 3, k + 4, k, k + 4, k + 5);
  }
  sprig = new THREE.BufferGeometry();
  sprig.setIndex(indices);
  sprig.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  sprig.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  sprig.computeVertexNormals(); sprig.computeBoundingBox(); sprig.computeBoundingSphere();
  return sprig;
}

export function copaJuazeiro(group, folha) {
  folha.side = THREE.DoubleSide;
  folha.emissive.setHex(0x4d5b30); folha.emissiveIntensity = .16;
  const copa = new THREE.InstancedMesh(sertaoLeafSprig(), folha, 208), part = new THREE.Object3D();
  copa.name = 'copa-juazeiro';
  for (let i = 0; i < copa.count; i++) {
    const branch = i % 16, tier = Math.floor(i / 16), angle = branch * 2.39996;
    const reach = .30 + Math.sqrt(tier / 12) * 1.70, a = angle + Math.sin(i * 3.7) * .16;
    part.position.set(Math.cos(a) * reach, 4.5 - reach * .30 + Math.sin(branch * 1.7) * .25 + Math.sin(i * 1.3) * .16, Math.sin(a) * reach);
    part.rotation.set(Math.sin(i * 2.3) * .8, -a + Math.sin(i) * .5, .15 + Math.cos(i * 1.7) * .45);
    const scale = .85 + (i % 5) * .075;
    part.scale.set(scale, scale, scale); part.updateMatrix();
    copa.setMatrixAt(i, part.matrix);
    copa.setColorAt(i, new THREE.Color().setRGB(.77 + (i % 3) * .07, .83 + (i % 4) * .045, .71 + (i % 5) * .04));
  }
  copa.computeBoundingSphere(); group.add(copa);
  return copa;
}

const cactos = new Map();
function mandacaruGeometry(variant, scale) {
  const key = `${variant}/${scale}`;
  if (cactos.has(key)) return cactos.get(key);
  const positions = [], uv = [], colors = [], indices = [], ribs = [5, 6, 4][variant], sides = ribs * 2;
  const column = (rings, tip, radius, woody = false) => {
    if (!woody && rings[0][1] * scale < 2.01) {
      const oldStart = rings[0][1], oldHeight = tip[1], start = 2.01 / scale + (oldStart - 2.04) * .1;
      const height = Math.min(3.75, Math.max(oldHeight, start + .20 / scale));
      const spread = Math.min(1, (height - start) / (oldHeight - oldStart));
      rings = rings.map(([x, y, z, r]) => [x * spread, start + (y - oldStart) / (oldHeight - oldStart) * (height - start), z * spread, r]);
      tip = [tip[0] * spread, height, tip[2] * spread];
    }
    const offset = positions.length / 3;
    for (let j = 0; j < rings.length; j++) {
      const [x, y, z, taper] = rings[j];
      for (let k = 0; k < sides; k++) {
        const angle = k / sides * Math.PI * 2, r = radius * taper * (k % 2 ? .65 : 1);
        positions.push(x + Math.cos(angle) * r, y, z + Math.sin(angle) * r); uv.push(k / sides, y / 3.8);
        const base = woody ? Math.max(0, 1 - y / 1.5) : 0;
        colors.push(.90 + base * .55, .94 - base * .23, .86 + base * .18);
        if (j) {
          const a = offset + (j - 1) * sides + k, b = offset + (j - 1) * sides + (k + 1) % sides, c = offset + j * sides + k, d = offset + j * sides + (k + 1) % sides;
          indices.push(a, c, b, b, c, d);
        }
      }
    }
    const bottom = positions.length / 3;
    positions.push(rings[0][0], rings[0][1], rings[0][2], ...tip); uv.push(.5, 0, .5, 1); colors.push(1, 1, 1, .9, .94, .86);
    for (let k = 0; k < sides; k++) {
      indices.push(bottom, offset + k, offset + (k + 1) % sides);
      const top = offset + (rings.length - 1) * sides;
      indices.push(bottom + 1, top + (k + 1) % sides, top + k);
    }
  };
  column([[0, 0, 0, 1], [.02, .35, -.01, .95], [-.025, 1.2, .02, .88], [.015, 2, -.015, .83],
    [.04, 2.8, .02, .73], [.025, 3.5, .015, .62], [.025, 3.70, .015, .45], [.025, 3.77, .015, .24]], [.025, 3.8, .015], .30, true);
  const branches = 3 + variant;
  for (let i = 0; i < branches; i++) {
    const angle = i * 2.39996 + variant * .49, reach = .53 + ((i + variant) % 3) * .12;
    const start = 2.04 + ((i * 2 + variant) % 4) * .14;
    const height = Math.max(start + .75, 3.04 + ((i * 3 + variant * 2) % 7) * .09);
    const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
    column([[0, start, 0, .68], [x * .3, start + .18, z * .3, 1], [x * .74, start + .44, z * .74, 1],
      [x, height - .22, z, .9], [x + .015, height - .07, z, .54]], [x + .015, height, z], .14 + (i % 2) * .025);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices); geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  cactos.set(key, geo); return geo;
}

// Observação botânica atribuída ao principal; não altera raiz/colisor. SERTAO-FLORA.md.
export function mandacaruSertao(group, material, scale, id) {
  const variant = ((id % 3) + 3) % 3;
  material.vertexColors = true;
  const mesh = new THREE.Mesh(mandacaruGeometry(variant, scale), material);
  mesh.name = 'cacto-ramos'; mesh.scale.setScalar(scale); mesh.rotation.y = Math.floor(id / 3) * 2.39996;
  group.add(mesh); return mesh;
}
