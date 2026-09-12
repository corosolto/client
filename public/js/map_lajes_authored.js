import * as THREE from 'three';
import { addLajesGround } from './lajes_ground.js';
import { attachLajesSantosDumont } from './lajes_santos_dumont.js';
import { placeProp, PropBatch } from './mapprops.js';
import { makeAerialFog } from './bloom.js';
import { createFavelaAmbience, attachPipaSky, FAVELA_AMBIENCE_ASSETS, PIPA_ASSETS } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';
import { makeLajesCTFSurface } from './lajes_ctf_surface.js';
import { lajesArchitecture } from './lajes_houses.js';
import { lajesOcclusionQuery } from './lajes_raycast_index.js';
import { buildLajesNavigation } from './lajes_navigation.js';
import { LAJES_SKY_PROPS, LAJES_KITE_CONFIGS, attachLajesSky, addLajesBackdrop, addLajesSkyDome, attachLajesKitePresentation } from './lajes_sky.js';

const ARCHITECTURE_ON = true;
export const LAJES_AUTHORED_ASSETS = Object.freeze([
  'lajes_casa_01', 'lajes_casa_02', 'lajes_casa_03', 'lajes_casa_04', 'lajes_casa_05', 'lajes_casa_06', 'lajes_casa_07',
  'lajes_varal', 'caixa_dagua',
]);
export const LAJES_PROPS = [...LAJES_AUTHORED_ASSETS, ...LAJES_SKY_PROPS, 'moto_cg'];
export const LAJES_AMBIENCE = Object.freeze([...FAVELA_AMBIENCE_ASSETS, ...PIPA_ASSETS]);
export const LAJES_CONNECTIONS = Object.freeze([
  'ESCADARIA NORTE OESTE', 'ESCADARIA NORTE LESTE', 'ESCADARIA SUL OESTE', 'ESCADARIA SUL LESTE',
  'PONTE OESTE', 'PONTE LESTE',
]);
export const LAJES_LOOPS = Object.freeze({ beco: 'praça e duas ruas laterais, ligados pela travessa', laje: 'duas travessias elevadas com quatro escadas retas' });
const H = 3.1;
const PLATFORMS = [-1, 1].flatMap(side => [-1, 1].map(end => ({
  name: `${side < 0 ? 'OESTE' : 'LESTE'} ${end < 0 ? 'NORTE' : 'SUL'}`,
  x0: side * 9 - 3.8, x1: side * 9 + 3.8, z0: end < 0 ? -20 : 1, z1: end < 0 ? -1 : 20, y: H,
})));
const BRIDGES = [-1, 1].map(side => ({ name: `PONTE ${side < 0 ? 'OESTE' : 'LESTE'}`, x0: side * 9 - 1.2, x1: side * 9 + 1.2, z0: -1, z1: 1, y: H }));
const STAIRS = [-1, 1].flatMap(side => [-1, 1].map(end => ({
  name: `ESCADARIA ${end < 0 ? 'NORTE' : 'SUL'} ${side < 0 ? 'OESTE' : 'LESTE'}`,
  x: side * 9, z: end * 25.4, dirZ: -end, run: 5.4, width: 2.4, steps: 18, height: H,
})));

export function buildLajes(scene, T) {
  const root = new THREE.Group(); root.name = 'LAJES_BAIRRO_TERREO'; scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const { M, box, home, sign, material, backgroundHome, flush, doors, dispose: disposeArchitecture } = lajesArchitecture(root, colliders, occluders, T);
  const low = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch { return false; } })();
  scene.background = new THREE.Color(0xb9ced5);
  if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('nofog')) scene.fog = makeAerialFog('lajes', { d: .0045, color: 0xb7c4cb, dir: .35 });
  const hemi = new THREE.HemisphereLight(0xd5e5ed, 0x756654, 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe7ca, 1.9); sun.position.set(25, 45, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 44, bottom: -44, far: 160 }); sun.shadow.bias = -.0005;
  scene.add(sun); scene.add(sun.target);
  const bounds = { minX: -19, maxX: 19, minZ: -32, maxZ: 32 };
  box(100, .1, 110, 0, -.1, 0, M.ground, { keep: true, tag: 'nonSolidSurface' });
  const terrain = addLajesGround(root, { low });
  for (const p of PLATFORMS) {
    const side = Math.sign(p.x0), center = (p.x0 + p.x1) / 2;
    for (let k = 0; k < 3; k++) {
      const seed = (side < 0 ? 0 : 5) + (p.z0 < 0 ? 0 : 3) + k;
      home({ x: center, z: Math.sign(p.z0 + p.z1) * (k ? 5 + k * 6 : 4.5), w: 7.6, d: k ? 6 : 7, h: H, roofSlab: .16, frontEnabled: k === 0,
        color: ['cream', 'brick', 'adobe', 'ochre', 'rose', 'sage'][seed % 6], facing: side,
        number: 12 + seed * 2,
        shop: p.z0 < 0 && k === 0 ? (side < 0 ? 'MERCEARIA DA PRAÇA' : 'BAR DO LARGO') : '' });
    }
    box(7.6, .16, 19, center, H - .16, (p.z0 + p.z1) / 2, M.concrete,
      { keep: true, tag: 'lajesPlatform' });
    for (const x of [p.x0, p.x1]) {
      box(.12, .24, 19, x, H, (p.z0 + p.z1) / 2, M.concrete, { solid: true });
      box(.055, .05, 19, x, H + .80, (p.z0 + p.z1) / 2, M.steel);
      for (let z = p.z0; z <= p.z1; z += 3) box(.05, .80, .05, x, H, z, M.steel);
      colliders.push({ minX: x - .06, maxX: x + .06, minZ: p.z0, maxZ: p.z1, minY: H, maxY: H + .85 });
    }
    for (const z of [p.z0, p.z1]) for (const dx of [-2.5, 2.5])
      box(2.6, .78, .12, center + dx, H, z, M[side < 0 ? 'adobe' : 'ochre'], { solid: true });
  }
  for (const p of BRIDGES) {
    const x = (p.x0 + p.x1) / 2;
    box(2.4, .14, 2.2, x, H - .14, 0, M.timber, { keep: true, tag: 'lajesBridge' });
    for (let z = -.95; z < 1; z += .30) box(2.36, .009, .015, x, H, z, M.dark);
    for (const dx of [-1.17, 1.17]) {
      box(.07, .80, 2, x + dx, H, 0, M.steel, { solid: true });
      box(.09, .055, 2.1, x + dx, H + .80, 0, M.steel);
    }
  }
  for (const s of STAIRS) {
    for (let i = 0; i < s.steps; i++) {
      const stepH = (i + 1) * H / s.steps, z = s.z + s.dirZ * ((i + .5) * s.run / s.steps);
      box(s.width, stepH, .3, s.x, 0, z, M.concrete);
      colliders.push({ minX: s.x - s.width / 2, maxX: s.x + s.width / 2, minY: 0,
        maxY: Math.max(0, stepH - .22), minZ: z - .15, maxZ: z + .15 });
      for (const dx of [-1.25, 1.25]) {
        box(.10, .22, .3, s.x + dx, stepH, z, M.concrete, { solid: true });
        if (i % 3 === 0) box(.045, .84, .045, s.x + dx, stepH, z, M.adobe);
        colliders.push({ minX: s.x + dx - .05, maxX: s.x + dx + .05, minZ: z - .15, maxZ: z + .15, minY: stepH, maxY: stepH + .90 });
      }
      box(2.28, .001, .035, s.x, stepH + .001, z - s.dirZ * .115, M.ochre);
    }
    for (const dx of [-1.25, 1.25]) {
      const from = new THREE.Vector3(s.x + dx, H / s.steps + .87, s.z + s.dirZ * .15);
      const to = new THREE.Vector3(s.x + dx, H + .87, s.z + s.dirZ * (s.run - .15));
      const direction = to.clone().sub(from);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(.033, .033, direction.length(), 8), M.adobe);
      rail.position.copy(from).add(to).multiplyScalar(.5);
      rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      rail.castShadow = true; root.add(rail); occluders.push(rail);
    }
    const cue = new THREE.Shape(); cue.moveTo(-.16, -.45); cue.lineTo(.16, -.45); cue.lineTo(.16, 0); cue.lineTo(.36, 0); cue.lineTo(0, .48); cue.lineTo(-.36, 0); cue.lineTo(-.16, 0);
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(cue), M.ochre); arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.z = s.dirZ > 0 ? Math.PI : 0; arrow.position.set(s.x, .015, s.z - s.dirZ * .9);
    arrow.userData.routeCue = true; root.add(arrow);
  }
  function groundHeightAt(x, z, yRef) {
    let top = 0;
    for (const p of [...PLATFORMS, ...BRIDGES]) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) top = H;
    for (const s of STAIRS) {
      const t = (z - s.z) * s.dirZ;
      if (Math.abs(x - s.x) <= s.width / 2 && t >= 0 && t <= s.run + 1e-5)
        top = Math.max(top, Math.min(s.steps, Math.floor(t / .3) + 1) * H / s.steps);
    }
    if (yRef != null && top > yRef + .55) return 0;
    return top;
  }
  const propBatch = new PropBatch({ bucket: 24, tag: 'lajes-entorno' });
  // Fachadas contíguas estreitam o beco; cada pavimento conserva escala de residência.
  for (const side of [-1, 1]) for (const end of [-1, 1]) for (let k = 0; k < 3; k++) {
    const seed = k + (end < 0 ? 0 : 3) + (side < 0 ? 0 : 6);
    const front = 14.85 + (seed % 3) * .025, stories = seed % 3 === 1 ? 3 : 2;
    home({ x: side * (front + 3), z: end * (k ? 5 + k * 6 : 4.5), w: 6, d: k ? 6 : 7,
      h: stories * 3 + .12, stories, color: ['brick', 'cream', 'brick', 'ochre'][seed % 4],
      facing: side, number: 40 + seed });
  }
  for (const side of [-1, 1]) box(4.15, 6.12, 2, side * 16.925, 0, 0, M.brick, { solid: true });
  if (ARCHITECTURE_ON) {
    for (const side of [-1, 1]) for (let row = 0; row < 5; row++) for (let k = 0; k < 18; k++) {
      const seed = k + row * 7 + (side < 0 ? 0 : 3), y = row * 1.65;
      const id = `lajes_casa_${String(seed % 7 + 1).padStart(2, '0')}`;
      const x = side * (25 + row * 6.1), z = -40 + k * 4.8 + (row % 2) * 2.1;
      if (row === 4) propBatch.add(id, { x, y, z, targetH: 7.5 + (seed % 4) * .45, ry: -side * Math.PI / 2 });
      else backgroundHome({ x, y, z, w: 6.2, d: 4.85, floors: 2 + seed % 3, side, seed });
    }
    for (const end of [-1, 1]) for (let row = 0; row < 3; row++) for (let k = 0; k < 15; k++) {
      const seed = k + row * 3, y = row * 1.3;
      backgroundHome({ x: -34 + k * 4.9, y, z: end * (38 + row * 6.3), w: 5.0, d: 6.4,
        floors: 2 + (seed % 3), side: end, seed, axis: 'z' });
    }
    for (const side of [-1, 1]) for (let row = 1; row < 5; row++)
      box(6.2, row * 1.65, 88, side * (25 + row * 6.1), 0, 2, M.ground, { bullet: false });
    for (const end of [-1, 1]) for (let row = 1; row < 3; row++)
      box(76, row * 1.3, 6.4, 0, 0, end * (38 + row * 6.3), M.ground, { bullet: false });
  }
  const beforeBatch = new Set(root.children); propBatch.build(root);
  for (const child of root.children) if (!beforeBatch.has(child)) child.traverse(m => { if (m.isMesh) occluders.push(m); });
  function centerProp(id, x, y, z, height, ry = 0, kind = '', radius = 0) {
    let o = placeProp(id, { targetH: height, ry });
    if (!o && kind === 'tank') { o = new THREE.Mesh(new THREE.CylinderGeometry(.7, .65, height, 16), M.blue); o.position.y = height / 2; }
    if (!o && kind === 'clothesline') {
      o = new THREE.Group();
      for (const dx of [-1.1, 1.1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, height, 8), M.steel);
        post.position.set(dx, height / 2, 0); o.add(post);
      }
      const line = new THREE.Mesh(new THREE.BoxGeometry(2.2, .018, .018), M.dark); line.position.y = height; o.add(line);
      for (let i = 0; i < 4; i++) {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(.40, .6, .012), [M.adobe, M.cream, M.rose][i % 3]);
        cloth.position.set(-.8 + i * .53, height - .32, 0); o.add(cloth);
      }
    }
    if (!o) return null;
    o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o);
    o.position.add(new THREE.Vector3(x - (b.min.x + b.max.x) / 2, y - b.min.y, z - (b.min.z + b.max.z) / 2));
    o.userData.lajesAuthored = id; if (kind) o.userData.rooftopDetail = kind; root.add(o);
    o.traverse(m => { if (m.isMesh) occluders.push(m); });
    if (radius) colliders.push({ minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius, minY: y, maxY: y + height });
    return o;
  }
  const leaf = material('leaf', 0x6a8150), terra = material('terra', 0x925e42), dirt = material('soil', 0x53493b);
  const leafShape = new THREE.BufferGeometry(), leafVertices = [], leafIndices = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, width = Math.pow(Math.sin(Math.PI * t), .7) * .115;
    for (const edge of [-1, 1]) leafVertices.push(edge * width, t * .56 - t * t * .14, t * t * .32);
    if (i < 10) { const a = i * 2; leafIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  leafShape.setAttribute('position', new THREE.Float32BufferAttribute(leafVertices, 3));
  leafShape.setIndex(leafIndices); leafShape.computeVertexNormals(); leaf.side = THREE.DoubleSide;
  function pot(x, y, z, scale = 1) {
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(.22 * scale, .15 * scale, .35 * scale, 16), terra);
    vase.position.set(x, y + .175 * scale, z); root.add(vase); occluders.push(vase);
    colliders.push({ minX: x - .22 * scale, maxX: x + .22 * scale, minZ: z - .22 * scale,
      maxZ: z + .22 * scale, minY: y, maxY: y + .35 * scale });
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(leafShape, leaf); mesh.scale.setScalar(scale * (.82 + i * .045));
      mesh.rotation.y = i * Math.PI / 3 + x * .3; mesh.rotation.x = (i % 2) * .15;
      mesh.position.set(x, y + .29 * scale, z); root.add(mesh);
    }
  }
  for (const p of PLATFORMS) {
    const side = Math.sign(p.x0), end = Math.sign(p.z0 + p.z1), x = side * 11.4, z = end * 16;
    centerProp('caixa_dagua', x, H, z, 1.05, 0, 'tank', .76);
    centerProp('caixa_dagua', side * 11.4, H, end * 7, .90, 0, 'tank', .70);
    centerProp('lajes_varal', side * 7.0, H, end * 11, 1.9, 0, 'clothesline');
    box(.65, .83, .60, side * 11.6, H, end * 4.3, M.cream, { solid: true });
    box(.70, .08, .65, side * 11.6, H + .83, end * 4.3, M.concrete);
    if (side === end) pot(side * 6.0, H, end * 5, 1.2);
    const antenna = new THREE.Group(); antenna.position.set(side * 12.0, H, end * 18.5); antenna.userData.rooftopDetail = 'antenna'; root.add(antenna);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, 1.7, 8), M.steel); pole.position.y = .85; antenna.add(pole);
    for (let i = -2; i <= 2; i++) { const beam = new THREE.Mesh(new THREE.BoxGeometry(.55, .025, .025), M.steel); beam.position.set(0, 1.5, i * .13); antenna.add(beam); }
    const pipe = box(.055, H + .9, .055, side * 12.85, 0, z, M.cream);
    pipe.userData.waterPipe = true;
  }
  // Dois quartos recuados quebram a silhueta sem abrir novas rotas ou reduzir portas.
  for (const side of [-1, 1]) {
    const x = side * 11.2, z = -side * 12.5, front = x - side * 1.3;
    box(2.6, 2.5, 3.4, x, H, z, M[side < 0 ? 'brick' : 'cream'], { solid: true });
    box(.04, 2.05, .9, front - side * .03, H + .02, z - .6, M.steel);
    box(.1, 1.05, .75, front - side * .06, H + .90, z + .75, M.dark);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.05, .08, 3.8), M.zinc);
    roof.position.set(x, H + 2.57, z); roof.rotation.z = side * .10;
    roof.castShadow = true; roof.receiveShadow = true; root.add(roof); occluders.push(roof);
    const canopyZ = side * 11;
    box(2.7, .075, 4.5, side * 6.9, H + 2.22, canopyZ, M.zinc);
    for (const dx of [-1.25, 1.25]) for (const dz of [-2.1, 2.1])
      box(.06, 2.22, .06, side * 6.9 + dx, H, canopyZ + dz, M.timber, { solid: true });
  }
  for (const side of [-1, 1]) {
    const x = side * 6.5, z = -side * 17, front = side * 5.22, height = side < 0 ? 2.75 : 2.95;
    box(2.55, height, 3.8, x, H, z, M[side < 0 ? 'brick' : 'adobe'], { solid: true });
    box(.12, height, .15, front, H, z - 1.81, M.concrete);
    box(.12, height, .15, front, H, z + 1.81, M.concrete);
    box(.14, .16, 3.8, front, H + height - .17, z, M.concrete);
    box(.12, 1.25, 1.5, front - side * .03, H + .83, z + .40, M.concrete);
    box(.04, 1.08, 1.31, front - side * .11, H + .92, z + .40, M.dark);
    for (const dz of [-.55, 0, .55]) box(.045, 1.08, .025, front - side * .14, H + .92, z + .4 + dz, M.steel);
    box(.32, .07, 1.55, front - side * .09, H + .83, z + .4, M.concrete);
    box(2.78, .12, 4.05, x, H + height, z, M.concrete);
    box(.035, 2.05, .9, x + side * 1.29, H + .025, z - .65, M.steel);
  }
  // Casas fecham os antigos pátios; só a praça conserva uma abertura ampla.
  for (const side of [-1, 1]) for (const end of [-1, 1]) for (let k = 0; k < 2; k++)
    home({ x: side * 3.1, z: end * (11.375 + k * 5.75), w: 4.2, d: 5.75,
      h: 6.12 + (k % 2) * .3, stories: 2, color: k ? 'brick' : side < 0 ? 'cream' : 'sage',
      facing: side, number: 62 + k + (end > 0 ? 2 : 0) + (side > 0 ? 4 : 0) });
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const x = side * 3.1, z = end * 8.5;
    box(4.2, .48, .035, x, 0, z - end * .025, M.brick);
    for (const dx of [-2, 2]) box(.14, 6.12, .14, x + dx, 0, z, M.concrete);
    for (const y of [2.95, 5.95]) box(4.2, .16, .14, x, y, z - end * .025, M.concrete);
    for (const y of [.98, 3.95]) for (const dx of [-1, 1]) {
      box(1.30, 1.22, .12, x + dx, y - .08, z - end * .035, M.concrete);
      box(1.12, 1.05, .035, x + dx, y, z - end * .11, M.dark);
      for (const bar of [-.40, 0, .40]) box(.025, 1.05, .045, x + dx + bar, y, z - end * .14, M.steel);
      box(1.38, .07, .30, x + dx, y - .06, z - end * .11, M.concrete);
      if (side === end) box(1.5, .06, .6, x + dx, y + 1.20, z - end * .22, M.zinc);
    }
    box(.055, 5.8, .055, x + side * 1.80, 0, z - end * .095, M.cream);
  }
  function streetBlock(x0, x1, z0, z1, end, seed) {
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const height = 6.05 + (seed % 3) * .22, face = end < 0 ? z0 : z1;
    box(w, height, d, x, 0, z, M[['brick', 'cream', 'ochre', 'sage'][seed % 4]], { solid: true });
    for (const y of [0, 2.88, height - .14]) box(w, .14, .12, x, y, face + end * .025, M.concrete);
    for (const dx of [-w / 2 + .07, w / 2 - .07]) box(.14, height, .14, x + dx, 0, face, M.concrete);
    const doorX = x - (w > 4 ? w * .22 : 0);
    box(1.04, 2.18, .10, doorX, .01, face + end * .04, M.concrete);
    const door = box(.90, 2.05, .035, doorX, .035, face + end * .10, M.steel, { keep: true, tag: 'lajesDoor' });
    door.userData.facadeNormal = [0, 0, end]; doors.push(door);
    for (const y of [.3, .62, .94, 1.26, 1.58, 1.90]) box(.78, .016, .035, doorX, y, face + end * .13, M.dark);
    for (const y of [3.85, ...(w > 4 ? [1.02] : [])]) {
      const wx = y < 2 ? x + w * .23 : x;
      box(1.30, 1.18, .10, wx, y - .08, face + end * .03, M.concrete);
      box(1.12, 1.02, .035, wx, y, face + end * .10, M.dark);
      for (const dx of [-.42, 0, .42]) box(.025, 1.02, .04, wx + dx, y, face + end * .13, M.steel);
    }
    box(1.35, .07, .55, doorX, 2.3, face + end * .20, M.zinc);
    sign(`${80 + seed}`, .24, .19, doorX + .65, 1.95, face + end * .13, end < 0 ? Math.PI : 0, '#d9d6c5', '#25322e');
  }
  for (const end of [-1, 1]) {
    const zs = [20 * end, 26 * end].sort((a, b) => a - b);
    for (const [i, [a, b]] of [[-19, -14.85], [-12.8, -10.3], [-7.7, -1], [1, 7.7], [10.3, 12.8], [14.85, 19]].entries())
      streetBlock(a, b, ...zs, end, i + (end > 0 ? 6 : 0));
    const rear = [28 * end, 32.25 * end].sort((a, b) => a - b);
    for (let i = 0; i < 6; i++) streetBlock(-19 + i * 38 / 6, -19 + (i + 1) * 38 / 6, ...rear, -end, 12 + i + (end > 0 ? 6 : 0));
    // O corredor de escada de 2,4 m afunila antes da travessa de 2 m.
    for (const side of [-1, 1]) for (const edge of [-1, 1])
      box(.30, 6.05, .60, side * 9 + edge * 1.15, 0, end * 25.7, M.brick, { solid: true });
  }
  // Bancos e floreiras ocupam a borda; o centro da praça e a travessa permanecem livres.
  for (const x of [-3.6, 3.6]) for (const z of [-6.5, 0, 6.5]) {
    if (x > 0 && z <= 0) continue;
    box(1, .95, 1.8, x, 0, z, M.cream, { solid: true });
    box(.88, .045, 1.68, x, .95, z, dirt);
    for (const dz of z === 0 ? [.1] : [-.45, .45]) pot(x, 1, z + dz, dz < 0 ? .65 : .88);
    if (z) {
      box(.48, .10, 1.8, x - Math.sign(x) * .75, .45, z, M.timber);
      for (const dz of [-.65, .65]) box(.35, .45, .14, x - Math.sign(x) * .75, 0, z + dz, M.concrete);
    }
  }
  const awning = new THREE.Group(); awning.position.set(4.65, 2.46, -5);
  awning.rotation.z = .16; root.add(awning);
  for (let i = 0; i < 8; i++) {
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.9, .045, .68), i % 2 ? M.cream : M.adobe);
    cloth.position.z = -2.38 + i * .68; cloth.castShadow = true; awning.add(cloth); occluders.push(cloth);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(.045, .24, .68), i % 2 ? M.cream : M.adobe);
    fringe.position.set(-.94, -.11, cloth.position.z); awning.add(fringe); occluders.push(fringe);
  }
  for (const [z, height] of [[-6.6, .62], [-6.02, .32]]) {
    box(.5, height, .5, 4.95, 0, z, M.ochre, { solid: true });
    for (const yy of [.08, .21]) for (let i = 0; i < 3; i++)
      box(.012, .06, .10, 4.691, yy, z - .15 + i * .15, M.dark);
  }
  for (const [x, z] of [[-2.7, -3.8], [2.7, 3.8]]) {
    box(.75, .06, .75, x, .71, z, M.cream);
    box(.1, .71, .1, x, 0, z, M.steel);
    for (const dz of [-.75, .75]) {
      box(.43, .06, .43, x, .43, z + dz, M.adobe);
      box(.43, .47, .055, x, .46, z + dz + Math.sign(dz) * .2, M.adobe);
      for (const dx of [-.17, .17]) box(.04, .43, .35, x + dx, 0, z + dz, M.steel);
    }
    colliders.push({ minX: x - .42, maxX: x + .42, minZ: z - 1.1, maxZ: z + 1.1, minY: 0, maxY: .9 });
  }
  centerProp('moto_cg', -4.5, 0, 5.4, 1.05, .2, '', .55);
  const poles = [];
  for (const side of [-1, 1]) for (const z of [-26.15, 0, 26.15]) {
    const p = [side * 14.8, 6.6, z]; poles.push(p);
    box(.18, 6.6, .18, p[0], 0, p[2], M.timber, { solid: true });
    box(1.3, .12, .12, p[0], 6.25, p[2], M.timber);
  }
  for (const side of [-1, 1]) for (const start of [-26.15, 0]) for (const offset of [-.35, .35]) {
    const x = side * 14.8 + offset;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 6.25, start), new THREE.Vector3(x, 5.8, start + 13.075), new THREE.Vector3(x, 6.25, start + 26.15)]);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, .014, 4, false), M.dark); root.add(wire);
  }
  for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
    const z = -17 + k * 6, poleZ = z < -12 ? -26.15 : z > 12 ? 26.15 : 0;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 14.8, 6.05, poleZ),
      new THREE.Vector3(side * 13.9, 4.6 + (k % 2) * .25, (z + poleZ) / 2),
      new THREE.Vector3(side * 12.9, 2.8, z),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, .012, 4, false), M.dark));
  }
  for (const x of [-19, 19]) box(.48, 2.4, 64, x, 0, 0, M.brick, { solid: true });
  for (const z of [-32, 32]) box(38, 2.4, .48, 0, 0, z, M.cream, { solid: true });
  const spawns = { E: [-5, -4, -3, -2].map(x => ({ x, z: -27, yaw: -Math.PI / 2 })), B: [2, 3, 4, 5].map(x => ({ x, z: 27, yaw: Math.PI / 2 })) };
  const routes = [
    { name: 'praça', points: [[-3, -27], [0, -27], [0, -18], [0, -8], [0, 8], [0, 18], [0, 27], [3, 27]] },
    { name: 'beco-oeste', points: [[-3, -27], [-13.8, -27], [-13.8, 27], [3, 27]] },
    { name: 'beco-leste', points: [[-3, -27], [13.8, -27], [13.8, 27], [3, 27]] },
  ];
  const ctfPoints = [
    { id: 'R', label: 'LAJE DA CAIXA', x: -9, z: -10 }, { id: 'E', label: 'BECO DO VARAL', x: 9, z: -10 },
    { id: 'P', label: 'LAJE DO CHURRASCO', x: -9, z: 10 }, { id: 'B', label: 'LAJE DO BAR', x: 9, z: 10 },
  ];
  for (const [kind, x, z] of [
    ['ak', -4, -27], ['m4', -2, -27], ['deagle', 2, 27], ['m400', 4, 27],
    ['mp5', -13.8, -17], ['shotgun', 13.8, 17], ['ak', -1.8, -4], ['m4', 1.8, 4],
    ['awp', -10, -9], ['mp5', 10, -9], ['shotgun', -10, 9], ['deagle', 10, 9],
  ]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.14, .12, 1), M.dark);
    mesh.position.set(x, groundHeightAt(x, z) + .1, z); root.add(mesh); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh });
  }
  flush(); root.updateMatrixWorld(true);
  const nav = buildLajesNavigation({ colliders, groundHeightAt, bounds, platforms: PLATFORMS, bridges: BRIDGES, stairs: STAIRS, spawns, groundRoutes: [...routes, { points: [[-18, 0], [18, 0]] }] });
  const ambience = createFavelaAmbience(root, { map: 'lajes', low,
    rats: [{ pos: [-13.9, 0, 8], to: [-13.9, 0, 12], phase: 1 }, { pos: [13.9, 0, -8], to: [13.9, 0, -12], phase: 2 },
      { pos: [-.35, 0, -19], to: [-.35, 0, -15], phase: .2 }, { pos: [.35, 0, 13], to: [.35, 0, 17], phase: 2.4 }],
    cockroaches: [{ pos: [-14.2, 0, -4], to: [-14.2, 0, -1.5], phase: .3 }, { pos: [14.2, 0, 4], to: [14.2, 0, 1.5], phase: 1.2 },
      { pos: [.35, 0, -12], to: [.35, 0, -9], phase: 2.1 }, { pos: [-.35, 0, 12], to: [-.35, 0, 9], phase: 3.3 }],
    pigeons: [{ mode: 'ground', pos: [-2, 0, 1], phase: .3 }, { mode: 'ground', pos: [2.5, 0, -1], phase: 1.3 },
      { mode: 'ground', pos: [-6, H, -14], phase: 2.1 }, { mode: 'ground', pos: [6, H, 14], phase: 3.5 }],
    dogs: [{ pos: [-2, 0, -2], to: [2, 0, 2], phase: .6 }],
    cats: [{ pos: [-10, H, 16], to: [-10, H, 18], phase: 1.2 }],
  });
  attachPipaSky(ambience, root, low ? LAJES_KITE_CONFIGS.slice(0, 4) : LAJES_KITE_CONFIGS);
  attachLajesKitePresentation(ambience);
  attachLajesSky(ambience, root);
  attachLajesSantosDumont(ambience, root, { low });
  const backdrop = addLajesBackdrop(root, { low }), skyDome = addLajesSkyDome(root), disposeAmbience = ambience.dispose?.bind(ambience);
  ambience.dispose = () => { terrain.dispose(); disposeArchitecture(); backdrop?.dispose(); skyDome?.dispose(); disposeAmbience?.(); };
  return { root, colliders, occluders, pickups, spawns, groundHeightAt, ctfPoints, sun, hemi, ...nav,
    rayOccluded: lajesOcclusionQuery(occluders),
    authoredSpawnYaw: true, layeredNavigation: true, footstepSurfaceAt: terrain.surfaceAt,
    configureCTFPoint: makeLajesCTFSurface(PLATFORMS, H), jumpImpulse: 5.85,
    ambience, sound: { bioma: 'favela', loops: [
      { src: AMB_LOOPS.funk, pos: [4.6, 2, -4], radius: 16, vol: .20 },
      { src: AMB_LOOPS.cidade, pos: [-4.6, 1.8, -4], radius: 20, vol: .20 },
      { src: AMB_LOOPS.passaros, pos: [0, 5, 0], radius: 38, vol: .12 },
    ] }, bounds, praca: { x0: -5.1, x1: 5.1, z0: -7.5, z1: 7.5 },
    stairs: STAIRS.map(s => ({ nome: s.name, x0: s.x - s.width / 2, x1: s.x + s.width / 2,
      z0: s.z, z1: s.z + s.dirZ * s.run })),
    staircases: STAIRS.map(s => ({ nome: s.name, bottom: { x: s.x, z: s.z, y: 0 }, top: { x: s.x, z: s.z + s.dirZ * s.run, y: H } })),
    levels: PLATFORMS.map(p => ({ nome: p.name, ...p, dePartida: p.z0 < 0 ? 'E' : 'B' })),
    design: { revision: 6, roofHeight: H, platforms: PLATFORMS, bridges: BRIDGES, stairs: STAIRS, doors,
      routes },
  };
}
