import * as THREE from 'three';

const FLIGHTS = Object.freeze([
  { radiusX: 46, radiusZ: 68, phase: .24, height: 11.5, wingPhase: 0 },
  { radiusX: 47, radiusZ: 69, phase: .29, height: 12.1, wingPhase: 1.9 },
  { radiusX: 45.5, radiusZ: 68, phase: .19, height: 11.8, wingPhase: 3.8 },
]);

function merge(parts) {
  const positions = [], normals = [];
  for (const part of parts) {
    const geo = part.index ? part.toNonIndexed() : part;
    positions.push(...geo.attributes.position.array);
    normals.push(...geo.attributes.normal.array);
    if (geo !== part) geo.dispose();
    part.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function ellipsoid(scale, position) {
  const geometry = new THREE.SphereGeometry(1, 10, 7);
  geometry.scale(...scale); geometry.translate(...position);
  return geometry;
}

function feather(points, height = .008) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => index ? shape.lineTo(x, z) : shape.moveTo(x, z));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function anatomy() {
  const torso = merge([
    ellipsoid([.064, .052, .118], [0, 0, .015]),
    ellipsoid([.038, .043, .049], [0, .029, .125]),
    ellipsoid([.032, .032, .038], [0, .044, .16]),
  ]);
  const breast = ellipsoid([.049, .025, .09], [0, -.028, .052]);
  const details = merge([
    ellipsoid([.009, .009, .024], [0, .038, .202]),
    ellipsoid([.005, .005, .005], [-.03, .051, .172]),
    ellipsoid([.005, .005, .005], [.03, .051, .172]),
    ...[-2, -1, 0, 1, 2].map(i => feather([[i * .014 - .011, -.07], [i * .017 - .012, -.185], [i * .017 + .012, -.192], [i * .014 + .011, -.07]])),
  ]);
  const inner = feather([[0, .075], [.075, .062], [.165, .013], [.15, -.088], [.095, -.096], [0, -.062]]);
  const primary = merge([0, 1, 2, 3, 4].map(i => {
    const start = i * .018;
    return feather([[0, .018 - start], [.115 - i * .009, -.052 - start], [.145 - i * .01, -.091 - start], [.12 - i * .01, -.103 - start], [0, -.004 - start]]);
  }));
  const white = feather([[.041, -.045], [.13, -.057], [.146, -.071], [.128, -.085], [.035, -.063]], .018);
  const collar = merge([-1, 1].map(side => ellipsoid([.005, .017, .027], [side * .031, .035, .119])));
  return { torso, breast, details, inner, primary, white, collar };
}

export function createSertaoFauna(root, { low = false, enabled = true } = {}) {
  const group = new THREE.Group();
  group.name = 'sertao-aves-asa-branca';
  group.userData.nonCollider = true;
  root.add(group);
  const queryEnabled = typeof location === 'undefined' || new URLSearchParams(location.search).get('sertaoFauna') !== '0';
  const birds = enabled && queryEnabled ? FLIGHTS.slice(0, low ? 1 : 3).map(config => ({ ...config, position: new THREE.Vector3(), flap: 0 })) : [];
  const materials = [];
  const geometries = [];
  let time = 0;
  let disposed = false;
  const batches = {};
  if (birds.length) {
    const forms = anatomy();
    const gray = new THREE.MeshStandardMaterial({ color: 0x787b7b, roughness: .93, side: THREE.DoubleSide });
    const mauve = new THREE.MeshStandardMaterial({ color: 0x947e78, roughness: .94 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x373c42, roughness: .94, side: THREE.DoubleSide });
    const white = new THREE.MeshStandardMaterial({ color: 0xdcdad1, roughness: .95, side: THREE.DoubleSide });
    materials.push(gray, mauve, dark, white);
    const specs = [
      ['corpo', forms.torso, gray, 1], ['peito', forms.breast, mauve, 1], ['cauda-bico-olhos', forms.details, dark, 1],
      ['asa-interna', forms.inner, gray, 2], ['asa-primaria', forms.primary, dark, 2], ['asa-faixa-branca', forms.white, white, 2], ['colar', forms.collar, white, 1],
    ];
    for (const [name, geometry, material, count] of specs) {
      geometries.push(geometry);
      const mesh = new THREE.InstancedMesh(geometry, material, birds.length * count);
      mesh.name = name;
      mesh.userData.nonSolidSurface = true;
      mesh.castShadow = false; mesh.receiveShadow = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      group.add(mesh); batches[name] = mesh;
    }
  }
  const body = new THREE.Object3D();
  const wing = new THREE.Object3D();
  const tip = new THREE.Object3D();
  body.add(wing); wing.add(tip);

  function pose() {
    birds.forEach((bird, index) => {
      const angle = time * .075 + bird.phase;
      bird.position.set(Math.cos(angle) * bird.radiusX, bird.height + Math.sin(time * .35 + bird.wingPhase) * .35, Math.sin(angle) * bird.radiusZ);
      bird.flap = Math.sin(time * 2 * Math.PI * 3.2 + bird.wingPhase) * .68;
      body.position.copy(bird.position);
      body.rotation.set(0, Math.atan2(-Math.sin(angle) * bird.radiusX, Math.cos(angle) * bird.radiusZ), -.07);
      body.updateMatrixWorld(true);
      for (const name of ['corpo', 'peito', 'cauda-bico-olhos', 'colar']) batches[name].setMatrixAt(index, body.matrixWorld);
      [-1, 1].forEach((side, sideIndex) => {
        wing.position.set(side * .039, .012, .011);
        wing.rotation.set(0, 0, side < 0 ? Math.PI - bird.flap : bird.flap);
        tip.position.set(.145, 0, -.005);
        tip.rotation.set(0, -.08, Math.sin(time * 2 * Math.PI * 3.2 + bird.wingPhase - .45) * .22);
        body.updateMatrixWorld(true);
        const slot = index * 2 + sideIndex;
        batches['asa-interna'].setMatrixAt(slot, wing.matrixWorld);
        batches['asa-faixa-branca'].setMatrixAt(slot, wing.matrixWorld);
        batches['asa-primaria'].setMatrixAt(slot, tip.matrixWorld);
      });
    });
    group.children.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }

  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return;
    time += dt;
    pose();
  }
  function reset() { if (!disposed) { time = 0; pose(); } }
  function dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }
  function report() {
    return { birds: birds.length, meshes: group.children.length, triangles: group.children.reduce((sum, mesh) => sum + (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3 * mesh.count, 0), textures: 0 };
  }
  reset();
  return { group, birds, update, reset, dispose, report };
}
