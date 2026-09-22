// Penitenciária da Treta: pátio central exposto, celas transitáveis e flancos de serviço.
import * as THREE from 'three';
import { PropBatch, InstBatch } from './mapprops.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, BASE_FLOATING, onGround } from './vao.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const HALF_X = 38;
const HALF_Z = 48;

// maps.js pré-carrega MAPS[id].props; sem a entrada lá todo GLB daqui cai no fallback procedural.
export const PENITENCIARIA_PROPS = [
  'varal_roupas_01', 'varal_roupas_02', 'lajes_varal', 'arara_roupas',
  'jersey_barrier', 'botijao_gas', 'churrasqueira', 'caixa_som',
  'onibus_urbano', 'pilha_pneus', 'junkyard_container', 'construction_rubble',
  'caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_fibra',
];

export function buildPenitenciaria(scene, T = {}) {
  const root = new THREE.Group();
  root.name = 'penitenciaria-da-treta';
  scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const geometryCache = new Map();
  const boxGeo = (w, h, d) => {
    const key = `b:${w}:${h}:${d}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
    return geometryCache.get(key);
  };
  const cylGeo = (r, h, segments = 12) => {
    const key = `c:${r}:${h}:${segments}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.CylinderGeometry(r, r, h, segments));
    return geometryCache.get(key);
  };
  function proceduralTexture(name, base, detail, mode, repeatX = 4, repeatY = repeatX) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
    let seed = [...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 1977);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    if (mode === 'concrete') {
      for (let i = 0; i < 700; i++) { const a = .025 + rand() * .08; ctx.fillStyle = rand() > .5 ? `rgba(255,255,255,${a})` : `rgba(15,20,22,${a})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 3, 1 + rand() * 2); }
      ctx.strokeStyle = detail; ctx.globalAlpha = .25; for (let y = 32; y < 128; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
      ctx.globalAlpha = .42; ctx.lineWidth = .8;
      for (let i = 0; i < 9; i++) { let x = rand()*128, y = rand()*128; ctx.beginPath(); ctx.moveTo(x,y); for (let j=0;j<4;j++){x+=rand()*18-9;y+=rand()*15;ctx.lineTo(x,y);} ctx.stroke(); }
      ctx.globalAlpha = .12; for (let i=0;i<18;i++){ctx.fillStyle=rand()>.5?'#28332c':'#141716';ctx.beginPath();ctx.ellipse(rand()*128,rand()*128,3+rand()*13,1+rand()*5,rand()*Math.PI,0,Math.PI*2);ctx.fill();}
    } else if (mode === 'metal') {
      const gradient = ctx.createLinearGradient(0, 0, 128, 0); gradient.addColorStop(0, base); gradient.addColorStop(.45, detail); gradient.addColorStop(.55, base); gradient.addColorStop(1, detail); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(92,45,23,${.08 + rand() * .2})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 8, 1 + rand() * 3); }
    } else {
      for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(30,22,12,${.025 + rand() * .09})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 4, 1 + rand() * 4); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.name = name; texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY); texture.anisotropy = 8; return texture;
  }
  function ammoCrateTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#58613d'); gradient.addColorStop(.52, '#73764b'); gradient.addColorStop(1, '#353d2a');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    let seed = 1977; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = 'rgba(20,25,16,.32)';
    for (let i=0;i<170;i++) ctx.fillRect(rand()*256,rand()*256,1+rand()*9,1+rand()*3);
    ctx.strokeStyle = '#242a1c'; ctx.lineWidth = 11; ctx.strokeRect(8,8,240,240);
    ctx.strokeStyle = '#a39d6a'; ctx.lineWidth = 3; ctx.strokeRect(20,20,216,216);
    for (const y of [52,204]) { ctx.fillStyle='#252b1d'; ctx.fillRect(0,y,256,10); ctx.fillStyle='rgba(190,182,116,.45)'; ctx.fillRect(0,y+2,256,2); }
    ctx.fillStyle='rgba(25,29,20,.78)'; ctx.fillRect(31,82,194,96);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#d6cc86';
    ctx.font='900 38px Arial,sans-serif'; ctx.fillText('MUNIÇÃO',128,112);
    ctx.font='bold 17px Arial,sans-serif'; ctx.fillText('7.62 MM · 120 CART.',128,151);
    for (const x of [48,208]) { ctx.fillStyle='#b39943'; ctx.fillRect(x-5,188,10,29); ctx.fillStyle='#d5bf68'; ctx.beginPath(); ctx.arc(x,188,5,Math.PI,0); ctx.fill(); }
    const texture = new THREE.CanvasTexture(canvas); texture.name='penitenciaria-caixa-municao'; texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.anisotropy=8; return texture;
  }
  function tileTexture(name, base, grout) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = grout; ctx.fillRect(0, 0, 128, 128);
    let seed = [...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 4721);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let ix = 0; ix < 8; ix++) for (let iy = 0; iy < 8; iy++) {
      const k = .88 + rand() * .24; ctx.globalAlpha = 1;
      ctx.fillStyle = base; ctx.fillRect(ix * 16 + 1, iy * 16 + 1, 14, 14);
      ctx.fillStyle = `rgba(38,46,42,${(1 - k) * .9 + .02})`; ctx.fillRect(ix * 16 + 1, iy * 16 + 1, 14, 14);
    }
    ctx.globalAlpha = .18;
    for (let i = 0; i < 40; i++) { ctx.fillStyle = rand() > .5 ? '#4a5a50' : '#e6ece4'; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 5, 1 + rand() * 12); }
    const texture = new THREE.CanvasTexture(canvas); texture.name = name; texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3); texture.anisotropy = 8; return texture;
  }
  const tex = {
    concrete: proceduralTexture('penitenciaria-concreto', '#777b78', '#343936', 'concrete', 6),
    darkConcrete: proceduralTexture('penitenciaria-concreto-escuro', '#343a3b', '#15191a', 'concrete', 5),
    yard: proceduralTexture('penitenciaria-patio-concreto-gasto', '#555957', '#262a29', 'concrete', 8),
    steel: proceduralTexture('penitenciaria-aco-enferrujado', '#565d5e', '#8b6b49', 'metal', 3),
    // Superfícies novas do pavilhão. SUP1 mede MATERIAL sem `map`: nenhum material daqui nasce sem um.
    reboco: proceduralTexture('penitenciaria-reboco', '#8d8578', '#4b4640', 'concrete', 4),
    galv: proceduralTexture('penitenciaria-chapa-galvanizada', '#7d848a', '#4c545a', 'metal', 4),
    pintura: proceduralTexture('penitenciaria-pintura-descascada', '#5d6f63', '#2b332d', 'concrete', 3),
    azulejo: tileTexture('penitenciaria-azulejo-chuveirao', '#c8cdc4', '#7d837a'),
    ammo: ammoCrateTexture(),
  };
  /* normalMap/roughnessMap derivados do mesmo canvas + anisotropia (textures.js:130).
     O canvas local já nasce com anisotropy 8; detailFor cobre o que vem de `T`. */
  const lam = (opts) => {
    const m = new THREE.MeshStandardMaterial({ roughness: .92, ...opts });
    const d = m.map && detailFor(m.map);
    if (d && d.normalMap) { m.normalMap = d.normalMap; m.normalScale.set(.55, .55); }
    if (d && d.roughnessMap) m.roughnessMap = d.roughnessMap;
    return m;
  };
  const MAT = {
    concrete: lam({ map: tex.concrete, bumpMap: tex.concrete, bumpScale: .045, color: 0xb8bbb5, roughness: .93 }),
    darkConcrete: lam({ map: tex.darkConcrete, bumpMap: tex.darkConcrete, bumpScale: .035, color: 0x747b7b, roughness: .97 }),
    yard: lam({ map: tex.yard, bumpMap: tex.yard, bumpScale: .055, color: 0x8b8f89, roughness: 1 }),
    steel: lam({ map: tex.steel, bumpMap: tex.steel, bumpScale: .025, color: 0x8a9292, metalness: .72, roughness: .5 }),
    rust: lam({ map: T.metal || tex.steel, color: 0x714529, metalness: .42, roughness: .82 }),
    white: lam({ map: tex.concrete, bumpMap: tex.concrete, bumpScale: .025, color: 0xe6e2cf, roughness: .75 }),
    yellow: lam({ map: tex.concrete, color: 0xe5a92f, roughness: .7 }),
    red: lam({ map: T.tent || tex.concrete, color: 0xb42d25, roughness: .65 }),
    blue: lam({ map: tex.steel, color: 0x173f79, roughness: .5 }),
    black: lam({ map: tex.darkConcrete, color: 0x111519, roughness: .66 }),
    glass: new THREE.MeshPhysicalMaterial({ map: T.metal || tex.steel, color: 0x8fb2c0, roughness: .2, metalness: .1, transparent: true, opacity: .68 }),
    rubber: lam({ map: T.asphalt || tex.darkConcrete, color: 0x17191a, roughness: .96 }),
    grass: lam({ map: T.grass || tex.concrete, color: 0x52643c, roughness: 1 }),
    ammo: lam({ map: tex.ammo, bumpMap: tex.ammo, bumpScale: .035, color: 0xffffff, roughness: .76, metalness: .18 }),
    plaster: lam({ map: tex.reboco, bumpMap: tex.reboco, bumpScale: .05, color: 0xb4ad9e, roughness: .95 }),
    galv: lam({ map: tex.galv, color: 0x9aa2a6, metalness: .55, roughness: .58 }),
    tile: lam({ map: tex.azulejo, color: 0xf2f4ef, roughness: .34 }),
    paint: lam({ map: tex.pintura, bumpMap: tex.pintura, bumpScale: .035, color: 0x9fb0a4, roughness: .9 }),
    cloth: lam({ map: T.tent || tex.concrete, color: 0xffffff, roughness: .95 }),
  };
  const aoMat = aoMatFactory();
  const aoGeoCache = new Map();
  /* `ao:true` = massa nova (bandas de AO + UV em metros do vao.js); as massas antigas ficam no
     boxGeo cacheado. Cache por (dimensão, contato, MATERIAL): a UV é calibrada com a textura. */
  function aoGeo(w, h, d, y, material) {
    const key = `a:${w}:${h}:${d}:${onGround(y, h) ? 1 : 0}:${material.uuid}`;
    let g = aoGeoCache.get(key);
    if (!g) { g = aoBoxGeo(w, h, d, { base: onGround(y, h) ? undefined : BASE_FLOATING }); aoGeoCache.set(key, g); }
    return g;
  }
  function addBox(w, h, d, material, x, y, z, opts = {}) {
    const ao = opts.ao && VAO_BANDS && material && material.visible !== false;
    const geo = ao ? aoGeo(w, h, d, y, material) : boxGeo(w, h, d);
    const mesh = new THREE.Mesh(geo, ao ? aoMat(material) : material); mesh.position.set(x, y + h / 2, z);
    if (opts.ry) mesh.rotation.y = opts.ry; if (opts.rx) mesh.rotation.x = opts.rx; if (opts.rz) mesh.rotation.z = opts.rz;
    mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true; if (opts.name) mesh.name = opts.name; root.add(mesh);
    if (opts.collide !== false) {
      const hx = Math.abs(Math.cos(opts.ry || 0)) * w / 2 + Math.abs(Math.sin(opts.ry || 0)) * d / 2;
      const hz = Math.abs(Math.sin(opts.ry || 0)) * w / 2 + Math.abs(Math.cos(opts.ry || 0)) * d / 2;
      const collider = { minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz, tag: opts.tag };
      colliders.push(collider); mesh.userData.collider = collider; if (h > 1.2) occluders.push(mesh);
    }
    return mesh;
  }
  function addCylinder(r, h, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(cylGeo(r, h, opts.segments || 12), material); mesh.position.set(x, y + h / 2, z);
    if (opts.rx) mesh.rotation.x = opts.rx; if (opts.rz) mesh.rotation.z = opts.rz; mesh.castShadow = true; mesh.receiveShadow = true; if (opts.name) mesh.name = opts.name; root.add(mesh);
    if (opts.collide) { const collider = { minX: x-r, maxX: x+r, minY: y, maxY: y+h, minZ: z-r, maxZ: z+r, tag: opts.tag }; colliders.push(collider); mesh.userData.collider = collider; }
    return mesh;
  }

  /* Céu de São Paulo: o único panorama de SP na main. A névoa casa com o horizonte
     (#d6dad9) — é o que a eval:look mede nos mapas já registrados no LOOK. */
  setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xd6dad9);
  scene.fog = new THREE.Fog(0xd6dad9, 82, 165);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 175), MAT.darkConcrete); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

  // Muro maciço impede fuga; a tela metálica e o arame farpado dão a leitura prisional.
  addBox(76, 5.8, 1, MAT.concrete, 0, 0, -HALF_Z, { tag: 'muro-sul' });
  addBox(76, 5.8, 1, MAT.concrete, 0, 0, HALF_Z, { tag: 'muro-norte' });
  addBox(1, 5.8, 96, MAT.concrete, -HALF_X, 0, 0, { tag: 'muro-oeste' });
  addBox(1, 5.8, 96, MAT.concrete, HALF_X, 0, 0, { tag: 'muro-leste' });
  function fence(name, axis, fixed, from, to) {
    const group = new THREE.Group(); group.name = `penitenciaria-cerca-${name}`; root.add(group);
    for (let p = from; p <= to; p += 3) {
      const mesh = axis === 'x' ? addBox(.08, 2.5, .08, MAT.steel, p, 5.8, fixed, { collide: false }) : addBox(.08, 2.5, .08, MAT.steel, fixed, 5.8, p, { collide: false }); group.add(mesh); root.remove(mesh);
    }
    for (const y of [6.2, 7.25, 8.1]) {
      const rail = axis === 'x' ? addBox(to-from, .06, .06, MAT.steel, (from+to)/2, y, fixed, { collide: false }) : addBox(.06, .06, to-from, MAT.steel, fixed, y, (from+to)/2, { collide: false }); group.add(rail); root.remove(rail);
    }
    const wire = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 4, 10), MAT.rust); wire.rotation.y = axis === 'x' ? Math.PI / 2 : 0;
    for (let p = from + .5; p < to; p += .7) { const coil = wire.clone(); axis === 'x' ? coil.position.set(p, 8.45, fixed) : coil.position.set(fixed, 8.45, p); group.add(coil); }
  }
  fence('sul', 'x', -HALF_Z, -HALF_X, HALF_X); fence('norte', 'x', HALF_Z, -HALF_X, HALF_X);
  fence('oeste', 'z', -HALF_X, -HALF_Z, HALF_Z); fence('leste', 'z', HALF_X, -HALF_Z, HALF_Z);

  function guardTower(index, x, z) {
    const group = new THREE.Group(); group.name = `penitenciaria-guarita-${index}`; root.add(group);
    const sx = Math.sign(x), sz = Math.sign(z);
    for (const dx of [-1.8, 1.8]) for (const dz of [-1.8, 1.8]) addBox(.38, 7.2, .38, MAT.steel, x+dx, 0, z+dz, { tag: `guarita-${index}` });
    addBox(4.8, .45, 4.8, MAT.concrete, x, 6.5, z, { tag: `guarita-${index}` });
    addBox(4.2, 2.4, .25, MAT.steel, x, 6.95, z-sz*2, { tag: `guarita-${index}` });
    addBox(.25, 2.4, 4.2, MAT.steel, x-sx*2, 6.95, z, { tag: `guarita-${index}` });
    addBox(4.8, .4, 4.8, MAT.darkConcrete, x, 9.35, z, { collide: false });
    for (const side of [-1, 1]) addBox(.08, 5.8, .08, MAT.steel, x+sx*(2.25+side*.35), .2, z-sz*2.2, { collide: false });
  }
  guardTower(0, -33.5, -43.5); guardTower(1, 33.5, -43.5); guardTower(2, -33.5, 43.5); guardTower(3, 33.5, 43.5);

  function cell(side, index, z) {
    const faceX = side * 25, backX = side * 34.2, insideX = side * 29.3;
    const group = new THREE.Group(); group.name = `penitenciaria-cela-aberta-${side < 0 ? 'o' : 'l'}-${index}`;
    group.userData = { doorwayX: side * 24.8, doorwayZ: z, insideX, insideZ: z }; root.add(group);
    addBox(9.2, .35, 7.2, MAT.concrete, (faceX+backX)/2, 4.1, z, { collide: false });
    addBox(.5, 4.1, 7.2, MAT.concrete, backX, 0, z);
    addBox(9.2, 4.1, .42, MAT.concrete, (faceX+backX)/2, 0, z-3.6);
    addBox(9.2, 4.1, .42, MAT.concrete, (faceX+backX)/2, 0, z+3.6);
    const barX = faceX;
    for (const dz of [-3.25,-2.7,-2.15,2.15,2.7,3.25]) addBox(.12, 3.85, .12, MAT.steel, barX, 0, z+dz, { collide: false });
    for (const y of [.6,2,3.35]) { addBox(.12, .1, 2.9, MAT.steel, barX, y, z-2.15, { collide: false }); addBox(.12, .1, 2.9, MAT.steel, barX, y, z+2.15, { collide: false }); }
    addBox(.45, 1.1, 2.6, MAT.concrete, side*31.6, 0, z, { name: `penitenciaria-banco-${side}-${index}` });
    addBox(.1, .08, 1.5, MAT.white, backX-side*.27, 2.1, z, { collide: false });
  }
  [-30,-20,-10,10,20,30].forEach((z, i) => { cell(-1, i, z); cell(1, i, z); });

  // Pátio bruto: concreto remendado, manchas de umidade e drenagem, sem marcação esportiva.
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(35, 43), MAT.yard); yard.name = 'penitenciaria-patio'; yard.rotation.x = -Math.PI/2; yard.position.y = .018; yard.receiveShadow = true; root.add(yard);
  /* UM material para as 5 manchas (eram 5 MeshBasicMaterial novos dentro do laço — 5
     chapados no SUP1) e uma CircleGeometry compartilhada. */
  const stainGeo = new THREE.CircleGeometry(1, 18);
  const stainMat = new THREE.MeshBasicMaterial({ map: T.concreteDark || tex.darkConcrete, color: 0x252c27, transparent: true, opacity: .2, depthWrite: false });
  for (const [x,z,sx,sz] of [[-11,-14,4,1.8],[9,-12,5,2.4],[-13,10,3,5],[11,14,5,2],[-2,17,7,1.4]]) {
    const stain = new THREE.Mesh(stainGeo, stainMat);
    stain.scale.set(sx,sz,1); stain.rotation.x=-Math.PI/2; stain.position.set(x,.032,z); root.add(stain);
  }
  for (const z of [-18,18]) { addBox(29,.055,.22,MAT.steel,0,.02,z,{collide:false,cast:false}); for(let x=-13;x<=13;x+=1.1)addBox(.06,.065,1.1,MAT.black,x,.025,z,{collide:false,cast:false}); }

  function ammoCrate(index, x, z, ry=0) {
    const group = new THREE.Group(); group.name = `penitenciaria-caixa-municao-${index}`; root.add(group);
    const body = addBox(2.2, 1.25, 1.55, MAT.ammo, x, 0, z, { ry, tag: `municao-${index}` }); group.userData.collider = body.userData.collider;
    for (const y of [.18,.92]) addBox(2.28,.1,1.63,MAT.steel,x,y,z,{ry,collide:false});
    for (const dx of [-.65,0,.65]) addBox(.08,.7,1.65,MAT.black,x+dx*Math.cos(ry),.27,z-dx*Math.sin(ry),{ry,collide:false});
  }
  [[-8,-7,.2],[8,-7,-.2],[-8,7,-.15],[8,7,.15],[-16,0,1.57],[16,0,1.57]].forEach((p,i)=>ammoCrate(i,...p));

  function centerObstacle(index, kind, x, z, ry=0) {
    const marker = new THREE.Group(); marker.name = `penitenciaria-obstaculo-centro-${index}-${kind}`; marker.position.set(x,0,z); root.add(marker);
    if (kind === 'barreira') {
      addBox(4.2,1.25,.75,MAT.concrete,x,0,z,{ry,tag:`centro-${index}`});
      addBox(3.7,.16,.82,MAT.yellow,x,1.04,z,{ry,collide:false});
      for(const side of [-1,1]) addBox(.55,.3,1.25,MAT.darkConcrete,x+side*Math.cos(ry)*1.65,.02,z-side*Math.sin(ry)*1.65,{ry});
    } else if (kind === 'barris') {
      for(const [dx,dz] of [[-.7,0],[.7,0],[0,.75]]) { addCylinder(.48,1.35,MAT.rust,x+dx,0,z+dz,{collide:true,tag:`centro-${index}`,segments:16}); addCylinder(.5,.06,MAT.steel,x+dx,1.28,z+dz,{segments:16}); }
    } else if (kind === 'gaiola') {
      /* MAP1: o colchão e os montantes eram `collide:false` e a base (topo 0,25 m) não empurra
         ninguém (`_collide` exige pos.y+0,3 < maxY) — o jogador andava DENTRO do colchão,
         1,02 m de penetração. Com colisor a gaiola vira cobertura de 1,02 m, faixa útil. */
      addBox(3.1,.25,2.1,MAT.steel,x,0,z,{ry,tag:`centro-${index}`});
      for(const dx of [-1.4,1.4])for(const dz of [-.9,.9])addBox(.12,1.65,.12,MAT.steel,x+dx*Math.cos(ry)+dz*Math.sin(ry),.2,z-dx*Math.sin(ry)+dz*Math.cos(ry),{tag:`centro-${index}`});
      addBox(3.1,.12,2.1,MAT.steel,x,2.15,z,{ry,collide:false}); addBox(2.5,.75,1.5,MAT.white,x,.27,z,{ry,tag:`centro-${index}`});
    } else {
      addBox(3.5,.35,2.2,MAT.rust,x,0,z,{ry,tag:`centro-${index}`});
      addBox(2.8,.8,1.8,MAT.darkConcrete,x,.35,z,{ry}); addBox(2.3,.65,1.5,MAT.concrete,x,.95,z,{ry});
    }
  }
  /* Quatro realocações forçadas pela massa nova, todas dentro de |x|≤18, |z|≤22 (PEN4):
     `gaiola` idx2 e `entulho` idx3 saíam de dentro dos solários, `barreira` idx8 e `gaiola`
     idx9 de dentro do chuveirão, e `entulho` idx7 encostava no solário leste. */
  [['barreira',-12,-16,.15],['barris',11,-16,0],['gaiola',-16.5,-4,-.2],['entulho',16,3,.25],['barreira',-11,16,-.18],['barris',12,16,0],['gaiola',-3,-13,.12],['entulho',3,13,-.2],['barreira',-16.5,12,1.45],['gaiola',12,-8,1.5]].forEach((p,i)=>centerObstacle(i,...p));

  function policeCar(x,z,ry) {
    const group = new THREE.Group(); group.name = 'penitenciaria-carro-policia'; group.position.set(x,0,z); group.rotation.y=ry; root.add(group);
    const part=(w,h,d,m,px,py,pz)=>{const mesh=new THREE.Mesh(boxGeo(w,h,d),m);mesh.position.set(px,py+h/2,pz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
    part(2.7,.75,5.4,MAT.white,0,.55,0); part(2.55,.12,3.4,MAT.blue,0,1.05,0); part(2.35,1.05,2.65,MAT.white,0,1.12,.05);
    part(2.38,.72,.08,MAT.glass,0,1.35,-1.35); part(2.38,.72,.08,MAT.glass,0,1.35,1.35);
    for(const sx of [-1,1]) for(const sz of [-1.75,1.75]) { const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.28,16),MAT.rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(sx*1.35,.55,sz);group.add(wheel); }
    part(1.45,.18,.28,MAT.black,0,2.2,0); part(.65,.22,.3,MAT.red,-.42,2.35,0); part(.65,.22,.3,MAT.blue,.42,2.35,0);
    /* MAP4: `occluders.push(group)` era occluder fantasma — `_losClear` chama
       intersectObjects(..., false) e um Group não tem geometria. Vai a lataria, não o grupo. */
    const hx=Math.abs(Math.cos(ry))*1.55+Math.abs(Math.sin(ry))*2.8,hz=Math.abs(Math.sin(ry))*1.55+Math.abs(Math.cos(ry))*2.8;
    const collider={minX:x-hx,maxX:x+hx,minY:0,maxY:2.5,minZ:z-hz,maxZ:z+hz,tag:'carro-policia'};colliders.push(collider);group.userData.collider=collider;
    group.updateMatrixWorld(true); group.traverse(m => { if (m.isMesh) occluders.push(m); });
  }
  /* Estacionada no antepátio leste, ao lado da guarita: o corredor interno da ala de
     serviço tem 4,2 m e a viatura (3,1 m) fecharia a passagem dos dois lados. */
  policeCar(30,-39.5,1.57);

  function punchingBag(index,x,z) {
    const group=new THREE.Group();group.name=`penitenciaria-saco-boxe-${index}`;root.add(group);
    addBox(3.6,.25,2.4,MAT.steel,x,3.4,z,{collide:false}); addBox(.22,3.5,.22,MAT.steel,x-1.55,0,z); addBox(.22,3.5,.22,MAT.steel,x+1.55,0,z);
    addCylinder(.08,.85,MAT.steel,x,2.9,z,{collide:false}); addCylinder(.48,1.9,MAT.red,x,1,z,{collide:true,tag:`saco-${index}`});
  }
  punchingBag(0,-18,38); punchingBag(1,-13,38);

  function dynamite(index,x,z,ry=0) {
    /* MAP1: a banca não tinha colisor nenhum (topo 0,575 m dentro do corpo). O caixote é o
       colisor E a leitura: a dinamite passa a ficar EM CIMA dele, não no chão. */
    addBox(1.7,.65,1.8,MAT.rust,x,0,z,{ry,tag:`dinamite-${index}`,ao:true});
    const group=new THREE.Group();group.name=`penitenciaria-dinamite-${index}`;group.position.set(x,.65,z);group.rotation.y=ry;root.add(group);
    for(let i=0;i<6;i++){const stick=new THREE.Mesh(cylGeo(.11,1.25,8),MAT.red);stick.rotation.z=Math.PI/2;stick.position.set(0,.18+(i%2)*.2,(i-2.5)*.24);group.add(stick);} const band=new THREE.Mesh(boxGeo(.18,.65,1.65),MAT.black);band.position.y=.25;group.add(band);
  }
  // As duas bancas foram para o corredor de flanco: em (∓19; ∓16) ficavam dentro do anteparo.
  dynamite(0,-19.5,-20,.2); dynamite(1,19.5,20,-.25); dynamite(2,4,23,1.1);

  /* Bancos externos: saíram de (∓15; ∓26/∓24) para |z|=22. Em |z| 26 eles fechavam a
     garganta do bolsão da bandeira junto com o anteparo de flanco — a bandeira ficava
     acessível por uma fresta de 1,3 m e a CTF2 caía para 1 rota. */
  [[-15,-22],[15,22],[-15,22],[15,-22]].forEach(([x,z],i)=>{
    addBox(4.4,.38,1.05,MAT.concrete,x,.72,z,{name:`penitenciaria-banco-patio-${i}`});
    for(const dx of [-1.65,1.65]) addBox(.45,.72,.8,MAT.darkConcrete,x+dx,0,z);
  });

  /* ============== ANTEPÁTIOS E ANTEPAROS (rodada de conserto, 13/09) ==============
     A exposição de 79,3%/76,1% e a visada de 98,5 m vinham de dois antepátios VAZIOS de
     43 m: do respawn dava pra enxergar o respawn inimigo. Tudo aqui é espelhado em z
     (`for (const sz of [-1,1])`) e o x é o mesmo nos dois lados — a simetria de justiça fica.
     A pegada dos blocos é |z| 31,5-36,5: FORA das celas (|z| ≤ 33,6 em x ∓25..∓34,2) e
     fora da soleira (∓24,8; ∓30), que a PEN2 exige transitável. A receita pedia |z| 29,5-37,5
     e a soleira caía dentro da parede lateral. */
  const BLOCO_Z = 34, BLOCO_D = 5;
  const zFora = sz => sz * (BLOCO_Z + BLOCO_D / 2 - .2), zDentro = sz => sz * (BLOCO_Z - BLOCO_D / 2 + .2);
  function bloco(nome, sx, sz) {
    const marker = new THREE.Group(); marker.name = `penitenciaria-bloco-${nome}`;
    marker.position.set(sx * 19.5, 0, sz * BLOCO_Z); root.add(marker);
    const tag = `bloco-${nome}`, zO = zFora(sz), zD = zDentro(sz);
    addBox(.4, 5.8, BLOCO_D, MAT.plaster, sx * 24.8, 0, sz * BLOCO_Z, { tag, ao: true });
    addBox(.4, 5.8, BLOCO_D, MAT.plaster, sx * 14.2, 0, sz * BLOCO_Z, { tag, ao: true });
    /* Portas nas PONTAS OPOSTAS (vão 2,6 m, deslocamento 7,2 m em 4,6 m de profundidade):
       nenhuma reta em z atravessa o bloco, e quem entra tem de cruzar o hall na diagonal. */
    addBox(.6, 5.8, .4, MAT.plaster, sx * 24.7, 0, zO, { tag, ao: true });
    addBox(7.8, 5.8, .4, MAT.plaster, sx * 17.9, 0, zO, { tag, ao: true });
    addBox(7.8, 5.8, .4, MAT.plaster, sx * 21.1, 0, zD, { tag, ao: true });
    addBox(.6, 5.8, .4, MAT.plaster, sx * 14.3, 0, zD, { tag, ao: true });
    // Telhado, NÃO laje andável: `groundHeightAt` segue plano nesta rodada (cota andável é outra).
    addBox(11.4, .35, BLOCO_D, MAT.galv, sx * 19.5, 5.8, sz * BLOCO_Z, { collide: false, ao: true });
    return marker;
  }
  bloco('pavilhao-4', -1, -1); bloco('pavilhao-6', -1, 1);
  bloco('ala-servico', 1, -1); bloco('oficina', 1, 1);
  // Pórtico da Divinéia: a passagem central, com as portas trocadas de lado.
  for (const sz of [-1, 1]) {
    const marker = new THREE.Group(); marker.name = `penitenciaria-portico-${sz < 0 ? 'sul' : 'norte'}`;
    marker.position.set(0, 0, sz * BLOCO_Z); root.add(marker);
    const tag = `portico-${sz < 0 ? 's' : 'n'}`, zO = zFora(sz), zD = zDentro(sz);
    addBox(2.9, 6.4, .45, MAT.paint, -4.05, 0, zO, { tag, ao: true });
    addBox(5.5, 6.4, .45, MAT.paint, 2.75, 0, zO, { tag, ao: true });
    addBox(5.5, 6.4, .45, MAT.paint, -2.75, 0, zD, { tag, ao: true });
    addBox(2.9, 6.4, .45, MAT.paint, 4.05, 0, zD, { tag, ao: true });
    addBox(11, .5, BLOCO_D, MAT.concrete, 0, 6.4, sz * BLOCO_Z, { collide: false, ao: true });
  }
  /* Solários (muro de banho de sol) e chuveirão: cortam os dois corredores retos em
     x ≈ ∓9,5 e a diagonal spawn→spawn que passava rente ao anel da MID. Os solários ficam
     em |z| 11,5 e não em z=0 (a receita) porque em z=0 enterrariam 4 das 8 armas do miolo. */
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    addBox(8, 3.2, 2.2, MAT.plaster, sx * 9.5, 0, sz * 11.5, { tag: 'solario', ao: true });
  for (const sz of [-1, 1]) addBox(8, 3, 3.2, MAT.tile, 0, 0, sz * 8, { tag: 'chuveirao', ao: true });
  /* Anteparos do corredor de flanco (x ∓18,5..∓24,5, 59 m de reta): cortam em trechos de
     7,4 m. Ficam nos PILASTRES entre celas (|z| 5, 15, 25) e não em |z| 10/20/30 — a soleira
     de cela é em z ∓10/∓20/∓30, e anteparo ali deixa a cela sem acesso (medido: 2 celas
     ilhadas). E cada um cobre 3,5 dos 6 m ALTERNANDO o lado, com 1,0 m de superposição:
     anteparo de vão inteiro ilhava a cela de z ∓10 junto com o próprio corredor (MC3). */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [z, cx, mat] of [[5, 22.75, MAT.plaster], [15, 20.25, MAT.galv], [25, 22.75, MAT.plaster]])
    addBox(3.5, 3.4, 2.6, mat, sx * cx, 0, sz * z, { tag: 'flanco', ao: true });
  /* Taipais do corredor de serviço (o alley de 3,05 × 94 m atrás das celas). Cada taipal
     cobre 1,65 m dos 3,05 m e os lados ALTERNAM com 0,25 m de superposição: nenhuma reta em
     z atravessa dois taipais seguidos, e sobra 1,4 m de passagem em cada um. */
  [6, 16, 25].forEach((z, i) => { for (const sx of [-1, 1]) for (const sz of [-1, 1])
    addBox(1.65, 5.8, .5, MAT.plaster, sx * (i % 2 ? 36.675 : 35.275), 0, sz * z, { tag: 'taipal', ao: true });
  });

  /* ===================== RECHEIO E BRASILIDADE =====================
     Prop repetido entra por InstBatch/PropBatch: clone solto aqui recria os 2.038 draw
     calls do fy_mansao. GLB é OPCIONAL (`placeProp` devolve null sem o asset): o colisor e
     a massa são SEMPRE a caixa procedural, e o GLB só substitui a imagem. */
  const PB = new PropBatch({ bucket: 20 }), IB = new InstBatch({ bucket: 14 });
  const _inst = new THREE.Object3D();
  function instBox(geo, mat, w, h, d, x, y, z, ry = 0, rx = 0, tag = null, cor = null) {
    _inst.position.set(x, y + h / 2, z); _inst.rotation.set(rx, ry, 0);
    IB.add(geo, mat, _inst, cor);
    if (!tag) return;
    const hx = Math.abs(Math.cos(ry)) * w / 2 + Math.abs(Math.sin(ry)) * d / 2;
    const hz = Math.abs(Math.sin(ry)) * w / 2 + Math.abs(Math.cos(ry)) * d / 2;
    colliders.push({ minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz, tag });
  }
  function prop(id, x, z, { y = 0, targetH = 2.4, targetLen = 0, ry = 0, w = 1, h = 0, d = 1, mat = MAT.galv, tag, collide = true } = {}) {
    const glb = PB.add(id, { x, y, z, targetH, targetLen, ry });
    const caixa = addBox(w, h || targetH, d, mat, x, y, z, { ry, tag, collide, ao: !glb });
    if (glb) { caixa.visible = false; const i = occluders.indexOf(caixa); if (i >= 0) occluders.splice(i, 1); }
    return glb;
  }

  // 12 mesas de concreto do pátio de sol, cada uma com `ry` próprio (entram no ORT1).
  const mesaGeo = aoBoxGeo(1.8, .78, .9), mesaMat = aoMat(MAT.concrete);
  for (const [x, z, ry] of [[-15,-20,.35],[-9,-19.5,-.5],[-17,-12.5,.8],[-5.5,-8.6,-.25],[-16,-9,1.1],[-15,6,.4],
    [-4,13.5,-.7],[-14,19,.2],[-17,16,.55],[-7,20,-.95],[7,-19,-.4],[15.5,-13.5,.9]])
    instBox(mesaGeo, mesaMat, 1.8, .78, .9, x, 0, z, ry, 0, 'mesa');
  // 16 mastros de varal (a receita punha nas lajes; a cota andável ficou fora desta rodada).
  const mastroGeo = aoBoxGeo(.12, 2.2, .12), mastroMat = aoMat(MAT.steel);
  for (const sz of [-1, 1]) [-22,-16,-10,-4,4,10,16,22].forEach((x, i) =>
    instBox(mastroGeo, mastroMat, .12, 2.2, .12, x, 0, sz * 29, sz * (.2 + i * .17), 0, 'mastro'));
  /* 16 colchões e chapas de zinco encostados na fachada dos blocos (ry + inclinação 0,22
     rad): massa girada de verdade, e é a imagem de pátio de presídio. O x fica no PANO CHEIO
     da fachada — sobre o vão da porta (x ∓21,8..∓24,4) um colchão cortava a aresta do grafo
     entre o antepátio e o hall, e a bandeira ficava com uma via só (CTF2). */
  const colchaoGeo = aoBoxGeo(1.05, 1.95, .12), colchaoMat = aoMat(MAT.cloth);
  for (const sz of [-1, 1]) [-20,-18,-16.5,-15,15,16.5,18,20].forEach((x, i) =>
    instBox(colchaoGeo, colchaoMat, 1.05, 1.95, .12, x, 0, sz * 37.2, .13 + i * .19, sz * .22, 'colchao'));
  /* 24 varais entre as grades — um por meia cela, `ry` distinto de 7° a 85°. GLB quando
     existir; sem ele, dois mastros + arame + 3 panos, todos instanciados. */
  const varalIds = ['varal_roupas_01', 'varal_roupas_02', 'lajes_varal', 'arara_roupas'];
  const arameGeo = aoBoxGeo(3.2, .04, .04), arameMat = aoMat(MAT.steel);
  const panoGeo = aoBoxGeo(.55, .7, .02), panoMat = aoMat(MAT.cloth);
  const PANOS = [0xe4e7dd, 0xc9a24a, 0x7d94ad, 0xb9544c, 0x8c8f86];
  let nVaral = 0;
  for (const z of [-30,-20,-10,10,20,30]) for (const side of [-1, 1]) for (const dz of [-2, 2]) {
    const x = side * 27.5, zc = z + dz, ry = .12 + (nVaral % 13) * .13;
    if (!PB.add(varalIds[nVaral % 4], { x, z: zc, targetH: 1.9, ry })) {
      for (const s of [-1, 1]) instBox(mastroGeo, mastroMat, .12, 2.2, .12, x + s * Math.cos(ry) * 1.6, 0, zc - s * Math.sin(ry) * 1.6, ry);
      instBox(arameGeo, arameMat, 3.2, .04, .04, x, 2, zc, ry);
      for (const t of [-1, 0, 1]) instBox(panoGeo, panoMat, .55, .7, .02, x + t * Math.cos(ry) * .9, 1.25, zc - t * Math.sin(ry) * .9, ry, 0, null, PANOS[(nVaral + t + 1) % 5]);
    }
    nVaral++;
  }
  // 4 barreiras de revista nos antepátios, espelhadas em z.
  for (const sz of [-1, 1]) {
    prop('jersey_barrier', -8, sz * 40, { targetLen: 3.2, ry: sz * .3, w: 3.2, h: .95, d: .6, mat: MAT.concrete, tag: 'revista' });
    prop('jersey_barrier', 6, sz * 29, { targetLen: 3.2, ry: sz * -.4, w: 3.2, h: .95, d: .6, mat: MAT.concrete, tag: 'revista' });
  }
  // Carga da oficina leste + pátio de sol: o que dá a leitura de lugar habitado.
  for (const sz of [-1, 1]) {
    prop('junkyard_container', 27.5, sz * 44, { targetLen: 6.1, ry: 1.57, w: 2.4, h: 2.6, d: 6.1, tag: 'carga' });
    prop('pilha_pneus', 35, sz * 38, { targetH: 1.1, w: 2.2, h: 1.1, d: 2.2, mat: MAT.rubber, tag: 'carga' });
    prop('construction_rubble', 22, sz * 44, { targetH: 1.2, w: 3, h: 1.2, d: 2, mat: MAT.rust, tag: 'carga' });
  }
  prop('botijao_gas', -12, -4, { targetH: .85, w: .45, h: .85, d: .45, mat: MAT.red, tag: 'botijao' });
  prop('churrasqueira', -9, 4, { targetH: .95, w: 1, h: .95, d: .7, mat: MAT.rust, tag: 'churrasqueira' });
  // O radinho de pilha: o loop `funk` de `sound.loops` mora em cima deste (raio 18 m).
  prop('caixa_som', -11, -6, { targetH: .35, w: .45, h: .35, d: .45, mat: MAT.black, tag: 'radio' });
  prop('caixa_som', 7, 4, { targetH: .35, w: .45, h: .35, d: .45, mat: MAT.black, tag: 'radio' });
  /* 8 caixas d'água na cobertura dos 4 blocos: silhueta de laje brasileira. SEM colisor —
     a cobertura não é andável nesta rodada, e colisor inalcançável inflaria o MAP5 de graça. */
  const tanques = ['caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_fibra'];
  let nTanque = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const dx of [-3.5, 3.5]) {
    const x = sx * 19.5 + dx, z = sz * 34;
    if (!PB.add(tanques[nTanque % 3], { x, y: 6.15, z, targetH: 2.5 }))
      addCylinder(.8, 2.5, MAT.galv, x, 6.15, z, { segments: 14 });
    nTanque++;
  }
  /* 2 torres de holofote (institucional, na borda e não no centro: o centro é o pátio).
     A luz do mapa segue no sol/hemi — aqui é só a casca. */
  for (const [x, z] of [[-16, -16], [16, 16]]) {
    addBox(.5, 11, .5, MAT.steel, x, 0, z, { tag: 'holofote', ao: true });
    for (const s of [-1, 1]) addBox(.9, .6, .35, MAT.galv, x + s * .8, 10.2, z, { collide: false });
  }
  /* Mural de tinta descascada na face interna dos muros dos antepátios (4 painéis de
     12 × 3,2 m): 76 × 5,8 m de concreto liso é o que o dono chamou de chapado. Sem colisor
     e sem occluder — é pintura sobre um muro que já existe. */
  const muralMats = [
    new THREE.MeshStandardMaterial({ map: T.muralEternamente || tex.pintura, roughness: .95 }),
    new THREE.MeshStandardMaterial({ map: (T.graffiti && T.graffiti[0]) || tex.pintura, roughness: .95, transparent: true }),
  ];
  const muralGeo = new THREE.PlaneGeometry(12, 3.2);
  for (const sz of [-1, 1]) [-12, 12].forEach((x, i) => {
    const m = new THREE.Mesh(muralGeo, muralMats[i]);
    m.position.set(x, 2.5, sz * 47.4); m.rotation.y = sz < 0 ? 0 : Math.PI; m.receiveShadow = true; root.add(m);
  });
  /* Pintura institucional estarcida nas fachadas dos blocos (gestão prisional, não gore):
     é o que numera o pavilhão e dá leitura de "onde eu estou" da boca do pórtico. */
  function stencilTexture(texto) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = 'rgba(226,228,220,.88)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 62px Arial Black,Arial,sans-serif'; ctx.fillText(texto, 128, 66);
    ctx.globalAlpha = .5; ctx.fillStyle = 'rgba(40,46,42,.9)';
    let seed = 7717; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 130; i++) ctx.fillRect(rand() * 256, rand() * 128, 2 + rand() * 9, 1 + rand() * 4);
    const t = new THREE.CanvasTexture(canvas); t.name = `penitenciaria-estencil-${texto}`;
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  const letreiroGeo = new THREE.PlaneGeometry(5.4, 2.7);
  [['PAV 4', -19.5, -1], ['PAV 6', -19.5, 1], ['OFICINA', 19.5, 1], ['RAIO 4', 19.5, -1]].forEach(([texto, x, sz]) => {
    const m = new THREE.Mesh(letreiroGeo, new THREE.MeshStandardMaterial({ map: stencilTexture(texto), transparent: true, roughness: .95 }));
    m.position.set(x, 3.5, sz * 31.35); m.rotation.y = sz < 0 ? 0 : Math.PI; root.add(m);
  });
  const antesDosLotes = root.children.length;
  PB.build(root); IB.build(root);
  // Occluder é por MALHA (um Group não intersecta nada): o lote instanciado entra malha a malha.
  for (let i = antesDosLotes; i < root.children.length; i++)
    root.children[i].traverse(m => { if (m.isMesh) occluders.push(m); });

  const GM={dark:MAT.black,steel:MAT.steel,wood:MAT.rust};
  /* MAP1: a coronha descia 0,25 m ABAIXO do grupo (arma modelada em pé). O
     `_assentarNoChao` (game.js:5784) encosta a bbox no chão, então a arma inteira subia e o
     topo ia a 0,325 m — acima do degrau de 0,30 m. Agora a arma está DEITADA (extensão
     vertical 0,09 m); nenhuma arma mudou de (x,z) nem saiu do chão. */
  function gun(kind,x,z,yaw){const g=new THREE.Group();g.name=`arma-central-${kind}`;g.position.set(x,.1,z);g.rotation.y=yaw;root.add(g);const long=['awp','ak','m4','shotgun','mp5'].includes(kind);const body=new THREE.Mesh(boxGeo(.13,.09,long?1:.42),kind==='shotgun'?GM.wood:GM.dark);body.position.y=.045;g.add(body);if(long){const barrel=new THREE.Mesh(boxGeo(.05,.05,.55),GM.steel);barrel.position.set(0,.055,-.62);g.add(barrel);}const grip=new THREE.Mesh(boxGeo(.22,.07,.13),GM.wood);grip.position.set(.09,.035,long?.25:.12);g.add(grip);pickups.push({x,z,kind,weapon:kind,readyAt:0,mesh:g});}
  /* `kind` é ID de arma (chave de WEAPONS), não CLASSE: o 8º era 'smg' e crashava
     o `_updatePickups` todo quadro. KNOWN-BUGS BUG-70 / #366. */
  ['awp','ak','m4','shotgun','mp5','deagle','pistol','uzi'].forEach((kind,i)=>gun(kind,-10+i*(20/7),i%2?-2.2:2.2,i*.42));
  ['ak','m4','shotgun','deagle'].forEach((kind,i)=>{gun(kind,-15+i*10,-41,0);gun(kind,15-i*10,41,Math.PI);});

  const hemi=new THREE.HemisphereLight(0xdbe8eb,0x343a36,1.35);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe7c7,1.85);sun.position.set(-35,52,-22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-50;sun.shadow.camera.right=50;sun.shadow.camera.top=58;sun.shadow.camera.bottom=-58;sun.shadow.camera.far=180;sun.shadow.bias=-.0004;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x7897ba,.38);fill.position.set(28,24,35);scene.add(fill);

  const groundHeightAt=()=>0, slowAt=()=>false;
  const bounds={minX:-HALF_X+.9,maxX:HALF_X-.9,minZ:-HALF_Z+.9,maxZ:HALF_Z-.9};
  const blocked=(x,z,inflate=.44)=>colliders.some(c=>x>c.minX-inflate&&x<c.maxX+inflate&&z>c.minZ-inflate&&z<c.maxZ+inflate&&c.minY<1.7&&c.maxY>.1);
  const nodes=[],adj=[],step=3.2;
  for(let x=bounds.minX+1;x<=bounds.maxX-1;x+=step)for(let z=bounds.minZ+1;z<=bounds.maxZ-1;z+=step)if(!blocked(x,z))nodes.push({x,z});
  /* O corredor de serviço tem 3,05 m de largura: a grade de 3,2 m cabe UMA coluna de nós
     nele, e um taipal a corta — o corredor inteiro virava espaço ilhado (medido: 2 celas sem
     A* do spawn). Duas colunas dedicadas (x ∓35,0 e ∓36,9, as duas com folga de corpo)
     dão o zigue-zague: cada uma passa pelo taipal que a outra fecha. */
  for (const sx of [-1, 1]) for (const cx of [sx * 35, sx * 36.9])
    for (let z = -45.6; z <= 45.6; z += 2.4) if (!blocked(cx, z)) nodes.push({ x: cx, z });
  for(let i=0;i<nodes.length;i++)adj.push([]);
  const clear=(a,b)=>{for(let i=1;i<7;i++){const t=i/7;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.25))return false;}return true;};
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z;if(dx*dx+dz*dz<=step*step*2.3&&clear(nodes[i],nodes[j])){adj[i].push(j);adj[j].push(i);}}
  for(let i=0;i<nodes.length;i++)if(adj[i].length===0){let nearest=-1,distance=Infinity;for(let j=0;j<nodes.length;j++){if(i===j||!clear(nodes[i],nodes[j]))continue;const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z,d=dx*dx+dz*dz;if(d<distance){distance=d;nearest=j;}}if(nearest>=0){adj[i].push(nearest);adj[nearest].push(i);}}
  function nearestWaypoint(x,z){let best=0,distance=Infinity;for(let i=0;i<nodes.length;i++){const dx=nodes[i].x-x,dz=nodes[i].z-z,d=dx*dx+dz*dz;if(d<distance){distance=d;best=i;}}return best;}
  function findPath(fromIdx,toIdx){if(fromIdx===toIdx)return[toIdx];const prev=new Int16Array(nodes.length).fill(-1),queue=[fromIdx];prev[fromIdx]=fromIdx;while(queue.length){const n=queue.shift();for(const next of adj[n])if(prev[next]<0){prev[next]=n;if(next===toIdx){const path=[next];let p=n;while(p!==fromIdx){path.unshift(p);p=prev[p];}path.unshift(fromIdx);return path;}queue.push(next);}}return[fromIdx];}
  /* BUG-57: pombo de pátio de presídio e rato de cela. */
  const ambience = createFavelaAmbience(root, {
    map: 'penitenciaria',
    rats: [
      { pos: [-18, 0, -38], to: [-15.5, 0, -35.5], phase: .3 },
      { pos: [18, 0, 38], to: [15.5, 0, 35.5], phase: 1.4 },
      { pos: [-17, 0, 7], to: [-15.5, 0, 9.5], phase: 2.2 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-12, 0, 6], phase: .5 }, { mode: 'ground', pos: [12, 0, -6], phase: 1.6 },
      { mode: 'ground', pos: [-10.8, 0, 5], phase: .8 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.vento,pos:[0,3,0],radius:70,vol:.22},{src:AMB_LOOPS.hum,pos:[0,3,0],radius:70,vol:.16},
      /* O radinho de pilha do pátio de sol: som LOCAL (raio 18 m), não ambiente global. */
      {src:AMB_LOOPS.funk,pos:[-11,1,-6],radius:18,vol:.18}],bioma:'urbano'},root,colliders,occluders,decalSolids:[root],groundHeightAt,slowAt,pickups,sun,hemi,
    spawns:{E:[-15,-5,5,15].map(x=>({x,z:-42,yaw:0})),B:[15,5,-5,-15].map(x=>({x,z:42,yaw:Math.PI}))},
    /* CTF1 dava 0,00 POR CONSTRUÇÃO: o mapa é espelhado em z, então com as 3 bandeiras em
       x=0 a área do triângulo é zero e nenhuma reposição no eixo resolve. Numa simetria
       espelhada a altura do triângulo É o deslocamento lateral entre as pontas e o meio:
       E/B na boca dos pavilhões (x −19,5) e MID no pátio (0,0) ⇒ 19,50 m. */
    ctfPoints:[{id:'E',label:'PAVILHÃO 4',x:-19.5,z:-27.5},{id:'MID',label:'PÁTIO',x:0,z:0},{id:'B',label:'PAVILHÃO 6',x:-19.5,z:27.5}],
    waypoints:{nodes,adj},nearestWaypoint,findPath,bounds};
}
