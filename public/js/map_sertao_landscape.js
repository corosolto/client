// Paisagem autoral do Sertão: silhueta além da arena, sem colisores ou sombras.
// Referências e limites: docs/reports/SERTAO-REFERENCIAS.md. Nenhuma foto incorporada.
import * as THREE from 'three';
import { sertaoLeafSprig } from './map_sertao_flora.js';

export function sertaoLandscape(root, soilMaterial) {
  // Campo contínuo: o antigo anel radial desenhava um disco na vista aérea.
  const geo = new THREE.PlaneGeometry(1200, 1200, 96, 96);
  geo.rotateX(-Math.PI / 2);
  const points = geo.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), z = points.getZ(i);
    const distance = Math.max(Math.abs(x) / 65, Math.abs(z) / 85);
    const t = Math.min(1, Math.max(0, (distance - 1) / 1.6)), fade = t * t * (3 - 2 * t);
    const height = 12 + 7 * Math.sin(x * .018) * Math.cos(z * .021) + 3 * Math.sin(x * .07 + z * .045);
    points.setY(i, fade * height - .04);
  }
  geo.computeVertexNormals();
  const landscape = new THREE.Mesh(geo, soilMaterial);
  landscape.name = 'sertao-horizonte'; root.add(landscape);

  const surface = (x, z) => {
    const u = (x + 600) / 12.5, v = (z + 600) / 12.5, ix = Math.floor(u), iz = Math.floor(v);
    const fx = u - ix, fz = v - iz, k = iz * 97 + ix;
    const a = points.getY(k), b = points.getY(k + 1), c = points.getY(k + 97), d = points.getY(k + 98);
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  };
  const twigMaterial = new THREE.MeshStandardMaterial({ color: 0x807c68, roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x74784b, roughness: 1, side: THREE.DoubleSide });
  const cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x638070, roughness: 1 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x928672, roughness: 1 });
  const twigs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.55, 1, 1, 3, 1, true), twigMaterial, 144 * 10);
  const leaves = new THREE.InstancedMesh(sertaoLeafSprig(), leafMaterial, 144);
  const cactus = new THREE.InstancedMesh(new THREE.CylinderGeometry(.7, 1, 1, 3, 1, true), cactusMaterial, 96);
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rockMaterial, 40);
  const obj = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  let twigIndex = 0;
  const stem = (mesh, index, start, end, radius) => {
    obj.position.copy(start).add(end).multiplyScalar(.5);
    obj.quaternion.setFromUnitVectors(up, end.clone().sub(start).normalize());
    obj.scale.set(radius, start.distanceTo(end), radius); obj.updateMatrix(); mesh.setMatrixAt(index, obj.matrix);
  };
  const sites = [];
  // Manchas em três profundidades; o retângulo jogável fica livre inclusive nas bordas das malhas.
  for (let patch = 0; patch < 24; patch++) {
    const side = patch % 4, depth = 18 + (Math.floor(patch / 4) % 3) * 46 + (patch % 3) * 3;
    const along = Math.sin(patch * 7.13) * (side % 2 ? 62 : 78);
    const cx = side % 2 ? along : (side === 0 ? -1 : 1) * (34 + depth);
    const cz = side % 2 ? (side === 1 ? -1 : 1) * (46 + depth) : along;
    for (let j = 0; j < 6; j++) {
      const i = patch * 6 + j, angle = j * 2.39996 + patch, spread = Math.sqrt(j) * 3.3;
      const x = cx + Math.cos(angle) * spread, z = cz + Math.sin(angle) * spread, y = surface(x, z);
      const h = 1.4 + ((i * 17) % 31) / 12, base = new THREE.Vector3(x, y, z);
      const fork = new THREE.Vector3(x + .22 * Math.sin(i), y + h * .48, z + .2 * Math.cos(i));
      stem(twigs, twigIndex++, base, fork, .065 + (i % 4) * .012);
      for (let branch = 0; branch < 3; branch++) {
        const a = angle + branch * 1.7, width = h * (.28 + (branch % 2) * .12);
        const end = new THREE.Vector3(x + Math.cos(a) * width, y + h * (.65 + branch * .10), z + Math.sin(a) * width);
        stem(twigs, twigIndex++, fork, end, .035);
        for (let t = 0; t < 2; t++) {
          const tip = end.clone().add(new THREE.Vector3(Math.cos(a + t) * .5, .28 + t * .2, Math.sin(a + t) * .5));
          stem(twigs, twigIndex++, end, tip, .019);
        }
      }
      obj.position.set(x + Math.sin(i) * .4, y + h * .92, z + Math.cos(i) * .4);
      obj.rotation.set(.15 + (i % 3) * .23, angle, .2); obj.scale.set(2, 2, 2); obj.updateMatrix(); leaves.setMatrixAt(i, obj.matrix);
      sites.push({ x, y, z, h });
    }
  }
  for (let i = 0; i < 96; i++) {
    const site = sites[(Math.floor(i / 3) * 7) % sites.length], arm = i % 3;
    const x = site.x + 1.8 + arm * .32, z = site.z + .5, y = surface(x, z), h = arm ? 1.2 + (i % 5) * .2 : 2.6;
    stem(cactus, i, new THREE.Vector3(x, y, z), new THREE.Vector3(x + arm * .05, y + h, z), .13);
  }
  for (let i = 0; i < 40; i++) {
    const site = sites[(i * 13) % sites.length];
    obj.position.set(site.x + 2, surface(site.x + 2, site.z) + .14, site.z);
    obj.rotation.set(i * .7, i * 2.4, .3); obj.scale.set(.7 + (i % 3) * .3, .35, .65); obj.updateMatrix(); rocks.setMatrixAt(i, obj.matrix);
  }
  for (const [mesh, name] of [[twigs, 'ramos'], [leaves, 'folhas'], [cactus, 'cactos'], [rocks, 'pedras']]) {
    mesh.name = `sertao-caatinga-${name}`; mesh.computeBoundingSphere(); root.add(mesh);
  }
}

// Decoração repetida conserva exatamente as matrizes originais. Não toca sólidos,
// filhos semânticos, geometria animada ou materiais compartilhados de outros mapas.
export function batchSertaoDecor(root, occluders) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('batch') === '0') return;
  const protectedObjects = new Set(occluders), bins = new Map();
  for (const m of root.children) {
    if (!m.isMesh || m.isInstancedMesh || protectedObjects.has(m) || m.name || Array.isArray(m.material)) continue;
    const key = `${m.geometry.uuid}/${m.material.uuid}/${m.castShadow}/${m.receiveShadow}`;
    if (!bins.has(key)) bins.set(key, []); bins.get(key).push(m);
  }
  for (const meshes of bins.values()) {
    if (meshes.length < 3) continue;
    const first = meshes[0], batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    batch.name = 'sertao-decor-instanciado'; batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
    meshes.forEach((m, i) => { m.updateMatrix(); batch.setMatrixAt(i, m.matrix); root.remove(m); });
    batch.computeBoundingSphere(); root.add(batch);
  }
}
