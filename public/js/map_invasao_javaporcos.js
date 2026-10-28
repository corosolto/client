import * as THREE from 'three';
import { aplicaSombraSol } from './mapquality.js';
import { preloadJavaporcos } from './mode_javaporcos.js';

const HALF_X = 56;
const HALF_Z = 60;
export const INVASAO_JAVAPORCOS_PROPS = [];
export { preloadJavaporcos };

export function buildInvasaoJavaporcos(scene, T) {
  const root = new THREE.Group();
  root.name = 'invasao-javaporcos';
  scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
  const MAT = {
    terra: lam(0x765537), asfalto: lam(0x34383a), calcada: lam(0xb8ad96), grama: lam(0x617744),
    milho: lam(0xb1a843), folha: lam(0x4f6c32), agua: lam(0x3b7f92, { transparent: true, opacity: .72 }),
    parede: lam(0xd0b785), telha: lam(0x8f3f2c), madeira: lam(0x68462c), metal: lam(0x7f8988),
    silo: lam(0xb8b6a9), saude: lam(0xe4dfd1), oficina: lam(0x777d78), objetivo: lam(0xd9a62e),
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const floorGeo = new THREE.PlaneGeometry(1, 1);
  const addFloor = (w, d, mat, x, z, y = 0) => {
    const mesh = new THREE.Mesh(floorGeo, mat);
    mesh.scale.set(w, d, 1); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z);
    mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const addBox = (w, h, d, mat, x, y, z, collide = true) => {
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.scale.set(w, h, d); mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    if (collide) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(mesh);
    }
    return mesh;
  };
  const casa = (x, z, w, d, cor = 0xd0b785) => {
    addBox(w, 3.2, d, lam(cor), x, 0, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * .72, 2.3, 4), MAT.telha);
    roof.position.set(x, 4.3, z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; root.add(roof);
    addBox(w * .26, 2.2, .08, lam(0x41535c), x, .45, z + d / 2 + .05, false);
  };

  scene.background = new THREE.Color(0xc6d8dd);
  scene.fog = new THREE.Fog(0xc6d8dd, 82, 190);
  addFloor(HALF_X * 2, HALF_Z * 2, MAT.terra, 0, 0);
  addFloor(HALF_X * 2, 35, MAT.grass || MAT.grama, 0, 38, .015);
  addFloor(18, 120, MAT.asfalto, 0, 0, .025);
  addFloor(112, 20, MAT.asfalto, 0, -40, .026);
  for (const x of [-46, -31, 31, 46]) addFloor(14, 29, MAT.calcada, x, -43, .03);

  // Bairro: três ruas curtas, praça, oficina, casas e o portão final.
  for (const [x, z, w, d, c] of [[-47,-50,14,12,0xd4a878],[-31,-50,12,12,0xc8c3a8],[31,-50,12,12,0xaabfbd],[47,-50,14,12,0xd5bf94],[-46,-32,14,10,0xb8a27e],[46,-32,14,10,0xd0aa92]]) casa(x,z,w,d,c);
  addBox(19, 4.6, 10, MAT.oficina, -31, 0, -31);
  addBox(17, .45, 10, MAT.metal, -31, 3.5, -25.9, false);
  addFloor(19, 15, MAT.calcada, 31, -31, .04);
  for (const [x,z] of [[25,-34],[31,-34],[37,-34],[25,-27],[31,-27],[37,-27]]) addBox(1.1,.45,3.4,MAT.madeira,x,0,z);
  addBox(26, 2.2, .7, MAT.parede, 0, 0, -56);
  addBox(12, 2.2, .7, MAT.parede, -44, 0, -56);
  addBox(12, 2.2, .7, MAT.parede, 44, 0, -56);
  for (const x of [-11, 11]) addBox(.8, 3.7, .8, MAT.metal, x, 0, -55.5);
  addBox(21, .5, .5, MAT.objetivo, 0, 2.8, -55.5, false).name = 'portao-bairro';

  // Transição: posto rural, armazém, silo e currais quebram as linhas longas.
  addBox(22, 5, 15, MAT.parede, -38, 0, -8);
  addBox(22, .5, 15, MAT.telha, -38, 5, -8, false);
  for (const x of [-46,-38,-30]) addBox(.45,3,.45,MAT.madeira,x,0,0);
  addBox(30, 6.8, 18, MAT.madeira, 33, 0, 2);
  addBox(32, .7, 20, MAT.telha, 33, 6.8, 2, false);
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 15, 20), MAT.silo);
  silo.position.set(16, 7.5, -10); silo.castShadow = true; silo.receiveShadow = true; root.add(silo); occluders.push(silo);
  colliders.push({ minX: 11, maxX: 21, minY: 0, maxY: 15, minZ: -15, maxZ: -5 });
  const siloRoof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3, 20), MAT.metal);
  siloRoof.position.set(16, 16.5, -10); siloRoof.castShadow = true; root.add(siloRoof);
  for (const side of [-1,1]) for (let i=0;i<6;i++) addBox(.22,1.25,7.2,MAT.madeira,side*(26+i*3.2),0,16,false);
  for (const x of [-42,-24,24,42]) addBox(6, 2.1, 2.8, MAT.madeira, x, 0, 12);

  // Campo: quatro talhões de milho, córrego e mata ciliar com trilhas abertas.
  const cornGeo = new THREE.CylinderGeometry(.09, .14, 1.9, 5);
  const corn = [];
  for (const [x0,x1,z0,z1] of [[-52,-12,23,39],[12,52,23,39],[-52,-12,44,56],[12,52,44,56]]) {
    for (let x=x0;x<=x1;x+=1.55) for (let z=z0;z<=z1;z+=1.55) {
      if ((Math.abs(x)%10)<2.2 || (Math.abs(z-40)%13)<2.1) continue;
      corn.push([x,z]);
    }
  }
  const cornMesh = new THREE.InstancedMesh(cornGeo, MAT.milho, corn.length);
  const matrix = new THREE.Matrix4();
  corn.forEach(([x,z],i) => { matrix.makeTranslation(x, .95, z); cornMesh.setMatrixAt(i, matrix); });
  cornMesh.castShadow = true; root.add(cornMesh);
  addFloor(112, 5.5, MAT.agua, 0, 20, .03);
  for (let x=-54;x<=54;x+=6) {
    if (Math.abs(x) < 8) continue;
    const trunk = addBox(.45, 3.4, .45, MAT.madeira, x, 0, 22, false);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.7, 7, 5), MAT.folha);
    crown.position.set(x,4.1,22 + Math.sin(x)*1.2); crown.castShadow = true; root.add(crown);
  }
  for (const [x,z] of [[-49,55],[-17,57],[17,57],[49,55]]) {
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(2.1,.5,8,18,Math.PI), MAT.terra);
    mouth.position.set(x,1.1,z); mouth.rotation.x = Math.PI / 2; root.add(mouth);
  }
  for (const [x,z] of [[-45,30],[-28,47],[-4,32],[25,48],[44,31]]) addBox(5,1.4,2.4,MAT.madeira,x,0,z);

  // Limites baixos preservam o horizonte e mantêm a simulação dentro da arena.
  addBox(112, 2.4, .7, MAT.madeira, 0, 0, -59.5);
  addBox(.7, 2.4, 120, MAT.madeira, -55.5, 0, 0);
  addBox(.7, 2.4, 120, MAT.madeira, 55.5, 0, 0);

  const sun = new THREE.DirectionalLight(0xffe3b0, 2.2); sun.position.set(-32, 54, -28); scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x57442e, 1.3); scene.add(hemi);
  aplicaSombraSol(sun, { half: 74, far: 170, mapSize: 2048 });

  const groundHeightAt = () => 0;
  const insideCollider = (x,z) => colliders.some((c) => x > c.minX - .8 && x < c.maxX + .8 && z > c.minZ - .8 && z < c.maxZ + .8);
  const nodes = [];
  const index = new Map();
  for (let z=-56;z<=56;z+=4) for (let x=-52;x<=52;x+=4) if (!insideCollider(x,z)) {
    index.set(`${x},${z}`, nodes.length); nodes.push({ x, z });
  }
  const adj = nodes.map(() => []);
  for (let i=0;i<nodes.length;i++) for (const [dx,dz] of [[4,0],[-4,0],[0,4],[0,-4]]) {
    const j = index.get(`${nodes[i].x+dx},${nodes[i].z+dz}`); if (j !== undefined) adj[i].push(j);
  }
  const nearestWaypoint = (x,z) => {
    let best=0, distance=Infinity; for (let i=0;i<nodes.length;i++) { const d=(nodes[i].x-x)**2+(nodes[i].z-z)**2; if (d<distance) { best=i; distance=d; } } return best;
  };
  const findPath = (from,to) => {
    if (from===to) return [to]; const prev=new Int32Array(nodes.length).fill(-1), queue=[from]; prev[from]=from;
    for (let q=0;q<queue.length;q++) for (const next of adj[queue[q]]) if (prev[next]===-1) { prev[next]=queue[q]; if (next===to) { const path=[to]; for (let cur=queue[q];cur!==from;cur=prev[cur]) path.unshift(cur); path.unshift(from); return path; } queue.push(next); }
    return [from];
  };
  const spawns = {
    E: [-12,-4,4,12].map((x) => ({ x, z: -49, yaw: 0 })),
    B: [-42,-14,14,42].map((x) => ({ x, z: 53, yaw: Math.PI })),
  };
  const boarEntrances = [{x:-49,z:54},{x:-17,z:56},{x:17,z:56},{x:49,z:54}];
  const hordeObjectives = [{ id:'silo', x:16, z:-17, hp:1000 },{ id:'posto', x:-38, z:-17, hp:1000 },{ id:'portao', x:0, z:-54, hp:1000 }];

  return {
    mode: 'horde', root, colliders, occluders, groundHeightAt, spawns, sun, hemi, pickups,
    waypoints: { nodes, adj }, nearestWaypoint, findPath, boarEntrances, hordeObjectives,
    bounds: { minX:-55.5,maxX:55.5,minZ:-59.5,maxZ:59.5 },
  };
}
