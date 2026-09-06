import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { ESCADAO_HOME } from './map_escadao_home.js';

export function buildEscadaoDetails({ root, addBox, occluders, enabled }) {
  if (!enabled) return;
  const place = (id, x, y, z, targetH, ry, solid) => {
    const object = placeProp(id, { x, y, z, targetH, ry });
    if (!object) return;
    object.name = id;
    object.userData.escadaoDomestic = true;
    root.add(object);
    object.updateMatrixWorld(true);
    if (solid) {
      const box = new THREE.Box3().setFromObject(object), size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const proxy = addBox(size.x, size.y, size.z, new THREE.MeshBasicMaterial({ visible: false }), center.x, box.min.y, center.z, { vao: false });
      proxy.visible = false;
      const index = occluders.indexOf(proxy);
      if (index >= 0) occluders.splice(index, 1);
      object.traverse((mesh) => { if (mesh.isMesh) occluders.push(mesh); });
    } else object.traverse((mesh) => { if (mesh.isMesh) mesh.userData.nonSolidSurface = true; });
  };
  place('escadao_varanda_r4', 2.55, ESCADAO_HOME.floor, 17.35, 1, .18, true);
  place('escadao_eletrica_r4', 7.7, ESCADAO_HOME.floor + .65, 18.56, .7, 0, false);
}
