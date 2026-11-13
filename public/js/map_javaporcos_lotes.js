import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function agruparConstrucoes(root, occluders) {
  root.updateMatrixWorld(true);
  const grupos = new Map(), fontes = new Set();
  for (const source of root.children) {
    if (!source.isMesh || !source.userData.construcaoImovel || !source.visible) continue;
    const materials = Array.isArray(source.material) ? source.material : [source.material];
    const geometry = source.geometry.clone().applyMatrix4(source.matrix);
    const faces = Array.isArray(source.material) ? source.geometry.groups : [{start:0,count:geometry.index?.count || geometry.attributes.position.count,materialIndex:0}];
    for (const face of faces) {
      const material = materials[face.materialIndex];
      if (!material) continue;
      const bloqueia = occluders.includes(source);
      const key = `${material.uuid}:${source.castShadow}:${bloqueia}:${Math.floor(source.position.x/48)}:${Math.floor(source.position.z/48)}`;
      if (!grupos.has(key)) grupos.set(key, {material,bloqueia,castShadow:source.castShadow,geometrias:[]});
      const part = geometry.clone();
      const index = geometry.index ? Array.from(geometry.index.array.slice(face.start,face.start+face.count)) : Array.from({length:face.count},(_,i)=>face.start+i);
      part.setIndex(index); part.clearGroups();
      grupos.get(key).geometrias.push(part);
    }
    geometry.dispose(); fontes.add(source);
  }
  let lotes = 0;
  for (const {material,bloqueia,castShadow,geometrias} of grupos.values()) {
    const geometry = mergeGeometries(geometrias, false);
    for (const g of geometrias) g.dispose();
    if (!geometry) throw new Error('JAV-LOTE: atributos incompatíveis');
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'cidade-lote-imovel';
    mesh.castShadow = castShadow; mesh.receiveShadow = true;
    root.add(mesh); lotes++;
    if (bloqueia) occluders.push(mesh);
  }
  // Fontes continuam como proxies de raycast e referência de autoria; só o lote desenha.
  for (const source of fontes) source.visible = false;
  for (let i=occluders.length-1;i>=0;i--) if (fontes.has(occluders[i])) occluders.splice(i,1);
  root.userData.construcoesAgrupadas = {fontes:fontes.size,lotes};
}
