import * as THREE from 'three';

const ROUTES = [
  { x: -24, z: 88, rx: 14, rz: 11, y: 26, phase: .3 },
  { x: 24, z: -82, rx: 12, rz: 10, y: 25.5, phase: 2.4 },
  { x: -74, z: 26, rx: 12, rz: 14, y: 23.5, phase: 1.2 },
  { x: 74, z: -26, rx: 12, rz: 14, y: 23.5, phase: 4.5 },
];

function colored(geometry, color) {
  const rgb = new THREE.Color(color), values = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) values.push(rgb.r, rgb.g, rgb.b);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
  return geometry;
}

function merge(parts) {
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const values = [];
    for (const part of parts) {
      const attribute = part.attributes[name];
      for (let i = 0; i < (part.index?.count || attribute.count); i++) {
        const index = part.index ? part.index.getX(i) : i;
        values.push(attribute.getX(index), attribute.getY(index), attribute.getZ(index));
      }
    }
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, 3));
  }
  parts.forEach(part => part.dispose());
  return geometry;
}

function polygon(points, thickness = 0) {
  const contour = points.map(([x, z]) => new THREE.Vector2(x, z));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []), positions = [];
  const point = (index, y) => [points[index][0], y, points[index][1]];
  for (const [a, b, c] of faces) {
    positions.push(...point(c, thickness), ...point(b, thickness), ...point(a, thickness));
    if (thickness) positions.push(...point(a, -thickness), ...point(b, -thickness), ...point(c, -thickness));
  }
  if (thickness) for (let a = 0; a < points.length; a++) {
    const b = (a + 1) % points.length;
    positions.push(...point(a, thickness), ...point(b, thickness), ...point(b, -thickness),
      ...point(a, thickness), ...point(b, -thickness), ...point(a, -thickness));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function anatomy() {
  const torso = new THREE.SphereGeometry(1, 8, 4);
  torso.scale(.095, .073, .215);
  const head = new THREE.OctahedronGeometry(1);
  head.scale(.043, .043, .061); head.translate(0, .022, .25);
  const beak = new THREE.TetrahedronGeometry(.026);
  beak.scale(.65, .65, 1); beak.translate(0, .01, .309);
  const tail = polygon([[-.045, -.16], [.045, -.16], [.085, -.30], [-.085, -.30]], .008);
  const body = merge([colored(torso, 0x242320), colored(head, 0x393936), colored(beak, 0x807c70), colored(tail, 0x252522)]);
  const wing = polygon([[0, .12], [.28, .16], [.54, .20], [.65, .16], [.62, .115],
    [.52, .1], [.67, .055], [.65, .015], [.53, .025], [.64, -.04], [.60, -.075],
    [.49, -.05], [.50, -.125], [.25, -.15], [0, -.08]], .009);
  const patch = polygon([[.42, .07], [.57, .095], [.59, -.02], [.44, -.07]]);
  patch.translate(0, -.010, 0);
  const upperPatch = patch.clone(); upperPatch.translate(0, .020, 0);
  return [body, merge([colored(wing, 0x292a26), colored(patch, 0xa3a39b), colored(upperPatch, 0xa3a39b)])];
}

export function createSertaoDistantBirds(root, { low = false } = {}) {
  const group = new THREE.Group();
  group.name = 'sertao-urubus-distantes';
  group.userData.nonCollider = true;
  root.add(group);
  const birds = ROUTES.slice(0, low ? 1 : 4).map(route => ({ ...route, position: new THREE.Vector3(), bank: 0, glide: 0 }));
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  const geometries = anatomy();
  const meshes = geometries.map((geometry, index) => {
    const mesh = new THREE.InstancedMesh(geometry, material, birds.length * (index ? 2 : 1));
    mesh.name = index ? 'asas-distantes' : 'corpos-distantes';
    mesh.userData.nonSolidSurface = true;
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  });
  const body = new THREE.Object3D(), wing = new THREE.Object3D();
  body.add(wing);
  let elapsed = 0, disposed = false;
  function pose() {
    birds.forEach((bird, index) => {
      const angle = bird.phase + elapsed * .045;
      bird.position.set(bird.x + Math.cos(angle) * bird.rx, bird.y + Math.sin(elapsed * .13 + bird.phase) * .45,
        bird.z + Math.sin(angle) * bird.rz);
      bird.bank = -.08 + Math.sin(elapsed * .17 + bird.phase) * .045;
      bird.glide = .055 + Math.sin(elapsed * .7 + bird.phase) * .045;
      body.position.copy(bird.position);
      body.rotation.set(0, Math.atan2(-bird.rx * Math.sin(angle), bird.rz * Math.cos(angle)), bird.bank);
      body.updateMatrixWorld(true);
      meshes[0].setMatrixAt(index, body.matrixWorld);
      [-1, 1].forEach((side, sideIndex) => {
        wing.position.set(side * .058, .01, .015);
        wing.rotation.z = side < 0 ? Math.PI - bird.glide : bird.glide;
        body.updateMatrixWorld(true);
        meshes[1].setMatrixAt(index * 2 + sideIndex, wing.matrixWorld);
      });
    });
    meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
  function update(dt) { if (!disposed && Number.isFinite(dt) && dt >= 0) { elapsed += dt; pose(); } }
  function reset() { if (!disposed) { elapsed = 0; pose(); } }
  function dispose() {
    if (disposed) return;
    disposed = true; group.removeFromParent();
    meshes.forEach(mesh => mesh.dispose());
    geometries.forEach(geometry => geometry.dispose()); material.dispose();
  }
  function report() {
    return { birds: birds.length, meshes: meshes.length,
      triangles: meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3 * mesh.count, 0),
      textures: Object.values(material).filter(value => value?.isTexture).length };
  }
  reset();
  return { group, birds, update, reset, dispose, report };
}
