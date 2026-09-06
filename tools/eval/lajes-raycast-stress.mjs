import { THREE } from './harness.mjs';
import { StaticBatch } from '../../public/js/mapprops.js';
import { indexLajesRaycast } from '../../public/js/lajes_raycast_index.js';

export function stressLajesRaycast() {
  const root = new THREE.Group(), material = new THREE.MeshBasicMaterial(), batch = new StaticBatch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const x of [0,1,2,3]) batch.add(box, new THREE.Matrix4().makeTranslation(x,0,0), material);
  box.dispose(); const [mesh] = batch.build(root), source = mesh.geometry;
  const original = mesh.raycast, dispose = indexLajesRaycast(mesh), indexed = mesh.raycast;
  const raycaster = new THREE.Raycaster(), round = n => Math.round(n*1e6)/1e6;
  const signature = h => [h.object === mesh, round(h.distance), h.faceIndex, h.face.a, h.face.b, h.face.c,
    h.point.toArray().map(round), h.uv.toArray().map(round), h.normal.toArray().map(round)];
  const attributes = source.attributes, index = source.index;
  const positions = Array.from(attributes.position.array);
  let cases = 0, mismatches = 0;
  try {
    for (const transformed of [false,true]) {
      mesh.position.set(transformed ? 11 : 0, transformed ? 2 : 0, transformed ? -7 : 0);
      mesh.rotation.set(0, transformed ? .6 : 0, transformed ? .2 : 0);
      mesh.scale.set(transformed ? 1.7 : 1, transformed ? .8 : 1, transformed ? 1.2 : 1); root.updateMatrixWorld(true);
      for (const side of [THREE.FrontSide,THREE.BackSide,THREE.DoubleSide]) for (const range of [[0,Infinity],[3,33],[1,70]]) {
        material.side = side; source.setDrawRange(...range);
        for (const [origin,direction] of [ [[0,0,3],[0,0,-1]], [[.5,.5,3],[0,0,-1]], [[0,0,0],[1,0,0]], [[0,-3,0],[0,1,0]] ]) {
          for (const [near,far] of [[0,Infinity],[.25,1],[2,4]]) {
            raycaster.set(new THREE.Vector3(...origin).applyMatrix4(mesh.matrixWorld), new THREE.Vector3(...direction).transformDirection(mesh.matrixWorld));
            raycaster.near = near; raycaster.far = far;
            mesh.raycast = original; const expected = raycaster.intersectObject(mesh,false).map(signature);
            mesh.raycast = indexed; const actual = raycaster.intersectObject(mesh,false).map(signature);
            cases++; if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches++;
          }
        }
      }
    }
    const unchanged = mesh.geometry === source && source.attributes === attributes && source.index === index &&
      JSON.stringify(positions) === JSON.stringify(Array.from(attributes.position.array));
    source.setDrawRange(0,Infinity); material.side = THREE.DoubleSide; raycaster.near = 0; raycaster.far = Infinity;
    raycaster.set(new THREE.Vector3(0,0,3).applyMatrix4(mesh.matrixWorld), new THREE.Vector3(0,0,-1).transformDirection(mesh.matrixWorld));
    const compare = () => {
      mesh.raycast = original; const expected = raycaster.intersectObject(mesh,false).map(signature);
      mesh.raycast = indexed; const actual = raycaster.intersectObject(mesh,false).map(signature);
      cases++; if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches++;
    };
    source.addGroup(0,index.count,0); mesh.material = [material]; compare(); mesh.material = material; source.clearGroups();
    const replacement = source.clone(); mesh.geometry = replacement; compare(); mesh.geometry = source; replacement.dispose();
    source.setIndex(index.clone()); compare(); source.setIndex(index);
    attributes.position.setX(0,attributes.position.getX(0)+.1); attributes.position.needsUpdate = true;
    source.computeBoundingSphere(); source.computeBoundingBox(); compare();
    attributes.position.array.set(positions); attributes.position.needsUpdate = true;
    dispose(); const restored = mesh.raycast === original;
    return { valid: mismatches === 0 && unchanged && restored, cases, mismatches, unchanged, restored };
  } finally { dispose(); source.dispose(); material.dispose(); }
}
