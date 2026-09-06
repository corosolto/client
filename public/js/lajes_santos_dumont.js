import * as THREE from 'three';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';

export function createLajes14Bis({ low = false } = {}) {
  const model = new THREE.Group();
  model.name = 'LAJES_14BIS_MODEL';
  const materials = {
    cloth: new THREE.MeshStandardMaterial({ color: 0xe8dab1, roughness: .91, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: 0x997043, roughness: .78 }),
    wire: new THREE.MeshStandardMaterial({ color: 0x4f4a40, roughness: .6, metalness: 1 }),
    wicker: new THREE.MeshStandardMaterial({ color: 0x9b6e3c, roughness: .95 }),
    suit: new THREE.MeshStandardMaterial({ color: 0x33322e, roughness: .9 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0xe9dfce, roughness: .92 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb78868, roughness: .87 }),
    hat: new THREE.MeshStandardMaterial({ color: 0xbda77b, roughness: .91 }),
  };
  const up = new THREE.Vector3(0, 1, 0), parts = new Map();
  const group = name => { const o = new THREE.Group(); o.name = name; model.add(o); parts.set(o, new Map()); return o; };
  const airframe = group('14bis-airframe'), canard = group('14bis-canard'), pilot = group('14bis-pilot');
  const propeller = group('14bis-propeller'); propeller.position.set(0, 1.2, -4.03);
  const add = (part, kind, geometry, position = [0, 0, 0], rotation = null, scale = null) => {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), rotation ?? new THREE.Quaternion(), scale ?? new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix);
    const batches = parts.get(part); if (!batches.has(kind)) batches.set(kind, []);
    batches.get(kind).push(geometry.toNonIndexed()); geometry.dispose();
  };
  const box = (part, kind, position, size) => add(part, kind, new THREE.BoxGeometry(...size), position);
  const rod = (part, kind, a, b, radius = .025) => {
    const start = new THREE.Vector3(...a), finish = new THREE.Vector3(...b), delta = finish.clone().sub(start);
    add(part, kind, new THREE.CylinderGeometry(radius, radius, delta.length(), low ? 5 : 8), start.add(finish).multiplyScalar(.5).toArray(), new THREE.Quaternion().setFromUnitVectors(up, delta.normalize()));
  };
  const ball = (part, kind, position, size) => add(part, kind, new THREE.SphereGeometry(1, low ? 8 : 12, low ? 6 : 8), position, null, new THREE.Vector3(...size));
  const cloth = (part, corners) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); add(part, 'cloth', g);
  };
  const wingY = (x, top) => (top ? 2.15 : .15) + Math.abs(x) * .075;
  for (const side of [-1, 1]) {
    for (let cell = 0; cell < 3; cell++) {
      const x0 = side * (.55 + cell * (5.45 / 3)), x1 = side * (.55 + (cell + 1) * (5.45 / 3));
      for (const top of [false, true]) {
        const y0 = wingY(x0, top), y1 = wingY(x1, top);
        const steps = low ? 2 : 4;
        for (let s = 0; s < steps; s++) {
          const z0 = -3.8 + s * 2.5 / steps, z1 = -3.8 + (s + 1) * 2.5 / steps;
          const camber0 = Math.sin(s * Math.PI / steps) * .10, camber1 = Math.sin((s + 1) * Math.PI / steps) * .10;
          cloth(airframe, [[x0, y0 + camber0, z0], [x1, y1 + camber0, z0], [x1, y1 + camber1, z1], [x0, y0 + camber1, z1]]);
        }
        for (const z of [-3.8, -1.3]) rod(airframe, 'wood', [x0, y0, z], [x1, y1, z], .029);
        for (let r = 0; r <= (low ? 2 : 4); r++) {
          const x = x0 + (x1 - x0) * r / (low ? 2 : 4), y = wingY(x, top);
          rod(airframe, 'wood', [x, y + .018, -3.8], [x, y + .1, -2.55], .013);
          rod(airframe, 'wood', [x, y + .1, -2.55], [x, y + .018, -1.3], .013);
        }
      }
      cloth(airframe, [[x1, wingY(x1, false), -3.8], [x1, wingY(x1, true), -3.8], [x1, wingY(x1, true), -1.3], [x1, wingY(x1, false), -1.3]]);
      for (const z of [-3.8, -1.3]) {
        rod(airframe, 'wood', [x1, wingY(x1, false), z], [x1, wingY(x1, true), z], .026);
        rod(airframe, 'wire', [x0, wingY(x0, false), z], [x1, wingY(x1, true), z], .008);
        rod(airframe, 'wire', [x1, wingY(x1, false), z], [x0, wingY(x0, true), z], .008);
      }
    }
  }
  for (const y of [.15, 2.15]) cloth(canard, [[-1.1, y, 4], [1.1, y, 4], [1.1, y, 6], [-1.1, y, 6]]);
  for (const x of [-1.1, 1.1]) {
    cloth(canard, [[x, .15, 4], [x, 2.15, 4], [x, 2.15, 6], [x, .15, 6]]);
    for (const z of [4, 6]) rod(canard, 'wood', [x, .15, z], [x, 2.15, z], .026);
    for (const y of [.15, 2.15]) rod(canard, 'wood', [x, y, 4], [x, y, 6], .024);
    rod(canard, 'wire', [x, .15, 4], [x, 2.15, 6], .008);
  }
  for (const y of [.15, 2.15]) for (const z of [4, 6]) rod(canard, 'wood', [-1.1, y, z], [1.1, y, z], .024);
  for (const x of [-.32, .32]) {
    for (const y of [.15, 1.05]) rod(airframe, 'wood', [x, y, -2], [x, y, 4.8], .03);
    for (let z = -1; z < 4; z++) {
      rod(airframe, 'wood', [x, .15, z], [x, 1.05, z + 1], .02);
      rod(airframe, 'wire', [x, 1.05, z], [x, .15, z + 1], .009);
    }
    cloth(airframe, [[x, .15, 0], [x, 1.05, 0], [x, 1.05, 3.6], [x, .15, 3.6]]);
  }
  for (const x of [-.8, .8]) {
    rod(airframe, 'wire', [x, -1, -2.3], [0, .3, -1.4], .034);
    rod(airframe, 'wire', [x, -1, -2.3], [0, .4, -3.5], .028);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    add(airframe, 'suit', new THREE.TorusGeometry(.37, .045, 6, low ? 12 : 20), [x, -.9, -2.3], rotation);
    for (let s = 0; s < 8; s++) rod(airframe, 'wire', [x, -.9, -2.3], [x, -.9 + Math.cos(s * Math.PI / 4) * .35, -2.3 + Math.sin(s * Math.PI / 4) * .35], .009);
  }
  rod(airframe, 'wire', [-.9, -.9, -2.3], [.9, -.9, -2.3], .036);
  box(airframe, 'wire', [0, .65, -2.9], [.55, .45, .62]);
  for (const x of [-.3, .3]) for (let z = 0; z < 4; z++) rod(airframe, 'wire', [x, .77, -3.15 + z * .16], [x * 1.65, 1.17, -3.15 + z * .16], .071);
  rod(airframe, 'wire', [0, 1.2, -2.9], [0, 1.2, -4.03], .055);
  ball(propeller, 'wood', [0, .5, 0], [.105, .6, .038]);
  ball(propeller, 'wood', [0, -.5, 0], [.105, .6, .038]);
  ball(propeller, 'wire', [0, 0, 0], [.12, .12, .09]);
  for (const x of [-.4, .4]) box(pilot, 'wicker', [x, .47, -1.5], [.04, .68, .84]);
  for (const z of [-1.92, -1.08]) box(pilot, 'wicker', [0, .47, z], [.84, .68, .04]);
  box(pilot, 'wood', [0, .15, -1.5], [.8, .08, .84]);
  for (let y = .2; y < .82; y += .075) {
    for (const z of [-1.943, -1.057]) rod(pilot, 'wood', [-.4, y, z], [.4, y, z], .009);
    for (const x of [-.425, .425]) rod(pilot, 'wood', [x, y, -1.91], [x, y, -1.09], .009);
  }
  for (const x of [-.11, .11]) { rod(pilot, 'suit', [x, .2, -1.5], [x, 1.02, -1.5], .085); ball(pilot, 'suit', [x, .23, -1.4], [.09, .07, .18]); }
  ball(pilot, 'suit', [0, 1.23, -1.5], [.24, .38, .145]);
  box(pilot, 'shirt', [0, 1.45, -1.352], [.16, .22, .022]);
  rod(pilot, 'suit', [0, 1.48, -1.33], [0, 1.28, -1.33], .032);
  ball(pilot, 'skin', [0, 1.82, -1.48], [.14, .195, .14]);
  ball(pilot, 'skin', [0, 1.8, -1.331], [.035, .05, .047]);
  box(pilot, 'suit', [0, 1.749, -1.334], [.105, .021, .019]);
  add(pilot, 'hat', new THREE.CylinderGeometry(.145, .165, .19, low ? 10 : 16), [0, 2.065, -1.48]);
  add(pilot, 'hat', new THREE.CylinderGeometry(.25, .25, .028, low ? 12 : 20), [0, 1.984, -1.48]);
  add(pilot, 'suit', new THREE.CylinderGeometry(.166, .169, .037, low ? 10 : 16), [0, 2.005, -1.48]);
  for (const side of [-1, 1]) {
    const shoulder = [side * .2, 1.45, -1.46], elbow = [side * .31, 1.12, -1.29], hand = [side * .18, 1.22, -.93];
    rod(pilot, 'suit', shoulder, elbow, .073); rod(pilot, 'suit', elbow, hand, .063); ball(pilot, 'skin', hand, [.062, .06, .076]);
  }
  add(pilot, 'wire', new THREE.TorusGeometry(.21, .018, 6, low ? 12 : 20), [0, 1.22, -.92]);
  rod(pilot, 'wire', [0, .4, -.95], [0, 1.2, -.92], .024);
  for (const [part, batches] of parts) for (const [kind, geometries] of batches) {
    const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
    if (!geometry) throw new Error(`14-bis: geometria incompatível em ${part.name}/${kind}`);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, materials[kind]); mesh.name = kind; part.add(mesh);
  }
  model.traverse(o => { o.userData.nonCollider = true; o.userData.nonSolidSurface = true; o.castShadow = false; o.receiveShadow = false; });
  return model;
}

export function attachLajesSantosDumont(ambience, root, { low = false } = {}) {
  if (!ambience || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('lajessky') === '0')) return null;
  if (ambience.lajesSantosDumont) return ambience.lajesSantosDumont;
  const group = new THREE.Group(); group.name = 'LAJES_SANTOS_DUMONT'; group.userData.skyLife = '14bis';
  const model = createLajes14Bis({ low }); group.add(model); root.add(group);
  const propeller = model.getObjectByName('14bis-propeller');
  let elapsed = 0, disposed = false;
  const pose = () => {
    const phase = elapsed * Math.PI * 2 / 105 + 1.4;
    group.position.set(Math.cos(phase) * 52, 32 + Math.sin(phase * 2) * 1.6, Math.sin(phase) * 66 + 4);
    group.rotation.set(Math.cos(phase * 2) * .025, Math.atan2(-52 * Math.sin(phase), 66 * Math.cos(phase)), -.045);
    propeller.rotation.z = elapsed * 34 % (Math.PI * 2);
  };
  pose();
  const previousUpdate = ambience.update.bind(ambience), previousDispose = ambience.dispose.bind(ambience);
  ambience.update = (dt, playerPosition) => {
    previousUpdate(dt, playerPosition);
    if (disposed || ambience.paused) return;
    elapsed += Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .05) : 0; pose();
  };
  ambience.dispose = () => {
    if (!disposed) {
      disposed = true; group.removeFromParent(); const materials = new Set();
      model.traverse(o => { if (o.isMesh) { o.geometry.dispose(); materials.add(o.material); } });
      materials.forEach(m => m.dispose());
    }
    previousDispose();
  };
  const api = { group, snapshot: () => ({ source: 'authored-procedural', position: group.position.toArray(), rotation: group.rotation.toArray().slice(0, 3), propeller: propeller.rotation.z, elapsed, disposed }) };
  ambience.lajesSantosDumont = api;
  return api;
}
