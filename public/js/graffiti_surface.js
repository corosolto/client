import * as THREE from 'three';
import { criarCoberturaGrafite } from './graffiti_coverage.js';

const EXCLUDED = /decal:|mural:|poster:|faixa:|vidro|glass|window|janela|agua|water|flag|bandeira|placa_|sign|screen|tela|light|lamp|led|farol|tent|tenda|barraca|stall|banca|umbrella|sombrinha|guarda_sol|toldo|awning|canopy|marquise|lona|tarp|arquibancada|bleacher|palco|stage|platibanda|guarda_tabua|plant|folha|folhagem|veget|grass|weed|vine|leaf|leaves|tree|arvore|banana|palm|samambaia|bush|shrub|mato|grama|arbusto|cactus|cacto|sky|ceu/i;

export function superficieGrafitavel(mesh) {
  if (!mesh?.isMesh || !mesh.geometry || !mesh.material) return false;
  for (let node = mesh; node; node = node.parent) {
    if (!node.visible || node.userData.nonSolidSurface || node.userData.graffitiSupportExcluded
      || (!node.userData.graffitiNomeDoAsset && EXCLUDED.test(node.name))) return false;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.every((material) => material && material.visible !== false && material.colorWrite !== false
    && !(material.alphaTest > 0) && !material.transparent && material.opacity >= 1);
}

// 3 cm de montagem + arredondamento do bake; qualquer ponto sem parede reprova.
export const GRAFFITI_SUPPORT_DISTANCE = 0.05;

export function criarSuporteGrafite(root, grade, ignorarMesh = null) {
  root.updateMatrixWorld(true);
  const walls = [];
  root.traverse((mesh) => {
    if (mesh === ignorarMesh || !mesh.isMesh || !mesh.geometry || !mesh.material || !(mesh.layers.mask & 1)) return;
    for (let node = mesh; node; node = node.parent) {
      if (!node.visible || /^(decal:|mural:)/.test(node.name)) return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.some((material) => material?.visible !== false && material?.colorWrite !== false && material?.opacity > 0)) walls.push(mesh);
  });
  const nearby = grade ? grade(walls, 4) : () => walls;
  const covers = criarCoberturaGrafite(superficieGrafitavel, GRAFFITI_SUPPORT_DISTANCE);
  const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), direction = new THREE.Vector3();
  const normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3(), instance = new THREE.Matrix4(), local = new THREE.Matrix4();
  return (piece) => {
    const { x, y, z, ry, w, h } = piece;
    if (![x, y, z, ry, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return false;
    const nx = Math.sin(ry), nz = Math.cos(ry), ux = Math.cos(ry), uz = -Math.sin(ry);
    direction.set(-nx, 0, -nz);
    for (const su of [-0.49, -0.245, 0, 0.245, 0.49]) {
      for (const sv of [-0.49, -0.245, 0, 0.245, 0.49]) {
        const px = x + ux * su * w, pz = z + uz * su * w;
        origin.set(px + nx * 0.02, y + sv * h, pz + nz * 0.02);
        ray.set(origin, direction); ray.far = GRAFFITI_SUPPORT_DISTANCE + 0.02;
        const hit = ray.intersectObjects(nearby(px, pz), false).find((candidate) => {
          const materials = Array.isArray(candidate.object.material) ? candidate.object.material : [candidate.object.material];
          const material = materials[candidate.face?.materialIndex || 0];
          return material?.visible !== false && material?.colorWrite !== false && material?.opacity > 0;
        });
        if (!hit?.face || hit.distance < 0.019 || !superficieGrafitavel(hit.object)) return false;
        instance.copy(hit.object.matrixWorld);
        if (hit.object.isInstancedMesh) {
          hit.object.getMatrixAt(hit.instanceId, local); instance.multiply(local);
        }
        normal.copy(hit.face.normal).applyMatrix3(normalMatrix.getNormalMatrix(instance)).normalize();
        if (normal.dot(direction) > -0.98) return false;
      }
    }
    // Amostras rejeitam erros óbvios; depois o retângulo completo e suas bordas
    // precisam estar cobertos pela união dos triângulos visíveis da parede.
    const candidates = new Set();
    const dx = Math.abs(ux) * w / 2 + Math.abs(nx) * .07;
    const dz = Math.abs(uz) * w / 2 + Math.abs(nz) * .07;
    for (let gx = Math.floor((x - dx) / 4); gx <= Math.floor((x + dx) / 4); gx++) {
      for (let gz = Math.floor((z - dz) / 4); gz <= Math.floor((z + dz) / 4); gz++) {
        for (const mesh of nearby((gx + .5) * 4, (gz + .5) * 4)) candidates.add(mesh);
      }
    }
    return covers(piece, candidates);
  };
}
