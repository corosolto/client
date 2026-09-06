import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { sertaoLeafSprig } from './map_sertao_flora.js';

const HEROES = [[-43, -26, 5.2, .2], [44, 25, 4.6, 1.6], [-46, 44, 5.6, 3.4], [43, -58, 5, 2.4], [-24, -56, 6, 4.8], [18, 59, 5.3, .9]];
const SCRUB = [[-47,-20,4], [49,30,2], [-53,43,5], [48,-61,3], [-30,-61,2], [22,65,4], [-104,-119,4], [101,121,3]];

function terrainSampler(root) {
  const terrain = root.getObjectByName('sertao-horizonte');
  if (!terrain) throw new Error('Sertão: criar paisagem antes da vegetação de horizonte');
  const { width, height, widthSegments: nx, heightSegments: nz } = terrain.geometry.parameters;
  const points = terrain.geometry.attributes.position;
  return (x, z) => {
    const u = (x + width / 2) / width * nx, v = (z + height / 2) / height * nz;
    const ix = Math.floor(u), iz = Math.floor(v), fx = u - ix, fz = v - iz, k = iz * (nx + 1) + ix;
    const a = points.getY(k), b = points.getY(k + 1), c = points.getY(k + nx + 1), d = points.getY(k + nx + 2);
    return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  };
}

function leafAnchors(mesh) {
  const points = mesh.geometry.attributes.position, unique = new Map();
  for (let i = 0; i < points.count; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(points, i).applyMatrix4(mesh.matrixWorld);
    if (p.y < 2.7 || (p.y < 4 && Math.hypot(p.x, p.z) < 1.2)) continue;
    unique.set(p.toArray().map(v => v.toFixed(4)).join('/'), p);
  }
  const candidates = [...unique.values()];
  if (candidates.length < 96) throw new Error('Sertão: molde juazeiro sem ramificação suficiente para a copa');
  const selected = [candidates.reduce((a, b) => a.y > b.y ? a : b)], distance = candidates.map(() => Infinity);
  while (selected.length < 96) {
    const latest = selected[selected.length - 1]; let best = 0;
    candidates.forEach((p, i) => { distance[i] = Math.min(distance[i], p.distanceToSquared(latest)); if (distance[i] > distance[best]) best = i; });
    selected.push(candidates[best]);
  }
  return selected;
}

export function createSertaoHorizon(root, { low = false, enabled = true, leafMaterial, heroTemplate } = {}) {
  const group = new THREE.Group(); group.name = 'sertao-horizonte-vegetacao'; group.userData.nonCollider = true; root.add(group);
  const active = enabled && (typeof location === 'undefined' || new URLSearchParams(location.search).get('sertaoHorizon') !== '0');
  const sites = [], batches = [], ownedGeometries = [], ownedMaterials = [], leafOwners = [];
  let disposed = false, missingHeroes = 0;
  if (active) {
    const ground = terrainSampler(root), object = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    const heroSites = HEROES.filter((_, i) => !low || i % 2 === 0);
    const template = heroTemplate === undefined ? placeProp('sertao_juazeiro', { targetH: 4.6 }) : heroTemplate;
    const leafMat = leafMaterial || root.getObjectByName('copa-juazeiro')?.material;
    const addBatch = (name, geometry, material, count) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.name = `sertao-fundo-${name}`;
      mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.nonSolidSurface = true; group.add(mesh); batches.push(mesh); return mesh;
    };
    if (template && leafMat) {
      template.updateMatrixWorld(true); const sources = []; template.traverse(mesh => { if (mesh.isMesh) sources.push(mesh); });
      if (sources.length !== 1 || Array.isArray(sources[0].material)) throw new Error('Sertão: juazeiro deve conservar uma malha e um material');
      const source = sources[0], anchors = leafAnchors(source);
      const trees = addBatch('juazeiros-glb', source.geometry, source.material, heroSites.length);
      const leafGeometry = sertaoLeafSprig().clone(); ownedGeometries.push(leafGeometry);
      const perTree = low ? 64 : 96, leaves = addBatch('copas', leafGeometry, leafMat, heroSites.length * perTree);
      heroSites.forEach(([x, z, h, yaw], index) => {
        const y = ground(x, z), scale = h / 4.6;
        object.position.set(x, y, z); object.rotation.set(0, yaw, 0); object.scale.setScalar(scale); object.updateMatrix();
        const world = object.matrix.clone(); trees.setMatrixAt(index, world.clone().multiply(source.matrixWorld));
        sites.push({ x, y, z, h, kind: 'glb', instance: index });
        for (let j = 0; j < perTree; j++) {
          object.position.copy(anchors[j]); object.rotation.set(.35 * Math.sin(j * 2.1), j * 2.39996, .35 * Math.cos(j));
          object.scale.setScalar(1 + (j % 4) * .1); object.updateMatrix();
          leaves.setMatrixAt(index * perTree + j, world.clone().multiply(object.matrix)); leafOwners.push(index);
        }
      });
    } else missingHeroes = heroSites.length;
    const bark = new THREE.MeshStandardMaterial({ color: 0x898575, roughness: 1 }); ownedMaterials.push(bark);
    const twigGeometry = new THREE.CylinderGeometry(.45, 1, 1, 3, 1, true); ownedGeometries.push(twigGeometry);
    const shrubs = SCRUB.filter((_, i) => !low || i < 4);
    const stems = addBatch('arbustos', twigGeometry, bark, shrubs.reduce((n, site) => n + site[2], 0) * 14);
    let stemIndex = 0;
    const stem = (a, b, radius) => {
      object.position.copy(a).add(b).multiplyScalar(.5); object.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      object.scale.set(radius, a.distanceTo(b), radius); object.updateMatrix(); stems.setMatrixAt(stemIndex++, object.matrix);
    };
    shrubs.forEach(([cx, cz, count], patch) => {
      for (let j = 0; j < count; j++) {
        const angle = (patch * 5 + j) * 2.39996, spread = j ? Math.sqrt(j) * 2.7 : 0;
        const x = cx + Math.cos(angle) * spread, z = cz + Math.sin(angle) * spread, y = ground(x, z), h = 1.1 + ((patch * 3 + j) % 5) * .26;
        const start = stemIndex, base = new THREE.Vector3(x, y, z), knee = new THREE.Vector3(x + Math.sin(angle) * .13, y + h * .28, z + Math.cos(angle) * .11);
        const fork = new THREE.Vector3(x - Math.sin(angle) * .08, y + h * .49, z - Math.cos(angle) * .09);
        stem(base, knee, .045); stem(knee, fork, .031);
        for (let branch = 0; branch < 3; branch++) {
          const a = angle + branch * 2.1, reach = h * (.27 + (branch % 2) * .13);
          const bend = new THREE.Vector3(x + Math.cos(a) * reach * .45, y + h * .64, z + Math.sin(a) * reach * .45);
          const tip = new THREE.Vector3(x + Math.cos(a + .2) * reach, y + h * (.83 + branch * .07), z + Math.sin(a + .2) * reach);
          stem(fork, bend, .02); stem(bend, tip, .012);
          for (let t = 0; t < 2; t++) stem(tip, tip.clone().add(new THREE.Vector3(Math.cos(a + t) * .23, .2, Math.sin(a + t) * .23)), .007);
        }
        sites.push({ x, y, z, h, kind: 'scrub', instance: start });
      }
    });
    batches.forEach(mesh => mesh.computeBoundingSphere());
  }
  function report() {
    return { plants: sites.length, heroTrees: sites.filter(site => site.kind === 'glb').length, missingHeroes, meshes: batches.length,
      triangles: batches.reduce((sum, mesh) => sum + (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3 * mesh.count, 0), newTextures: 0 };
  }
  function dispose() {
    if (disposed) return; disposed = true; group.removeFromParent();
    batches.forEach(mesh => mesh.dispose());
    ownedGeometries.forEach(geometry => geometry.dispose()); ownedMaterials.forEach(material => material.dispose());
  }
  return { group, sites, leafOwners, report, dispose };
}
