import * as THREE from 'three';

const PATCHES = [
  [-4.3, -5.1, .65, 1.7], [4.3, 5.1, .65, 1.7], [-4.1, 3.2, .65, 1.6], [4.1, -3.2, .65, 1.6],
  [-14.65, -10, .13, 3], [14.65, 10, .13, 3], [-14.65, 13, .13, 2], [14.65, -13, .13, 2],
];
const inPatch = (x, z, [cx, cz, rx, rz]) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 < 1;
export function addLajesGround(root, { low = false } = {}) {
  const group = new THREE.Group(); group.name = 'LAJES_GRAMADOS'; root.add(group);
  const turf = new THREE.MeshStandardMaterial({ color: 0x707342, roughness: 1, side: THREE.DoubleSide });
  const blade = new THREE.MeshStandardMaterial({ color: 0x718342, roughness: 1, side: THREE.DoubleSide });
  for (const [cx, cz, rx, rz] of PATCHES) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24 * Math.PI * 2, edge = 1 + .1 * Math.sin(i * 2.1 + cx);
      const x = Math.cos(t) * rx * edge, z = Math.sin(t) * rz * edge;
      if (!i) shape.moveTo(x, z); else shape.lineTo(x, z);
    }
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), turf);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(cx, .012, cz); mesh.receiveShadow = true; group.add(mesh);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.022, 0, 0, .022, 0, 0, .012, .19, .018, 0, 0, -.025, 0, 0, .025, -.025, .14, .01], 3));
  g.computeVertexNormals();
  const count = low ? 320 : 960, leaves = new THREE.InstancedMesh(g, blade, count);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const [cx, cz, rx, rz] = PATCHES[i % PATCHES.length], a = i * 2.399963, r = Math.sqrt(((i * 73) % 997) / 997);
    dummy.position.set(cx + Math.cos(a) * rx * r, .012, cz + Math.sin(a) * rz * r);
    dummy.rotation.y = a; dummy.scale.setScalar(.55 + ((i * 37) % 100) / 110); dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix); color.setHSL(.18 + (i % 5) * .012, .24, .22 + (i % 7) * .019); leaves.setColorAt(i, color);
  }
  leaves.receiveShadow = true; group.add(leaves);
  group.traverse(o => { o.userData.nonCollider = true; o.userData.nonSolidSurface = true; });
  return {
    surfaceAt: (x, z, y = 0) => y > .25 ? 'concrete' : PATCHES.some(p => inPatch(x, z, p)) ? 'grass' : 'dirt',
    dispose: () => { group.traverse(o => o.geometry?.dispose()); turf.dispose(); blade.dispose(); group.removeFromParent(); },
  };
}
