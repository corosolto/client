// Penitenciária da Treta: pátio central exposto, celas transitáveis e flancos de serviço.
import * as THREE from 'three';

const HALF_X = 38;
const HALF_Z = 48;

export function buildPenitenciaria(scene) {
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
    } else if (mode === 'metal') {
      const gradient = ctx.createLinearGradient(0, 0, 128, 0); gradient.addColorStop(0, base); gradient.addColorStop(.45, detail); gradient.addColorStop(.55, base); gradient.addColorStop(1, detail); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(92,45,23,${.08 + rand() * .2})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 8, 1 + rand() * 3); }
    } else {
      for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(30,22,12,${.025 + rand() * .09})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 4, 1 + rand() * 4); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.name = name; texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY); texture.anisotropy = 8; return texture;
  }
  const tex = {
    concrete: proceduralTexture('penitenciaria-concreto', '#777b78', '#343936', 'concrete', 6),
    darkConcrete: proceduralTexture('penitenciaria-concreto-escuro', '#343a3b', '#15191a', 'concrete', 5),
    court: proceduralTexture('penitenciaria-quadra-gasta', '#706747', '#403b29', 'dirt', 7),
    steel: proceduralTexture('penitenciaria-aco-enferrujado', '#565d5e', '#8b6b49', 'metal', 3),
  };
  const MAT = {
    concrete: new THREE.MeshStandardMaterial({ map: tex.concrete, color: 0xb8bbb5, roughness: .95 }),
    darkConcrete: new THREE.MeshStandardMaterial({ map: tex.darkConcrete, color: 0x747b7b, roughness: .98 }),
    court: new THREE.MeshStandardMaterial({ map: tex.court, color: 0x8f865e, roughness: 1 }),
    steel: new THREE.MeshStandardMaterial({ map: tex.steel, color: 0x8a9292, metalness: .72, roughness: .5 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x714529, metalness: .42, roughness: .82 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe6e2cf, roughness: .75 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe5a92f, roughness: .7 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb42d25, roughness: .65 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x173f79, roughness: .5 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111519, roughness: .66 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x8fb2c0, roughness: .2, metalness: .1, transparent: true, opacity: .68 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: .96 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x52643c, roughness: 1 }),
  };
  function addBox(w, h, d, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), material); mesh.position.set(x, y + h / 2, z);
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

  scene.background = new THREE.Color(0xa8b5b7); scene.fog = new THREE.Fog(0x9aa7a8, 82, 165);
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

  // Quadra desgastada ocupa o centro; marcações são decalques sem colisão.
  const court = new THREE.Mesh(new THREE.PlaneGeometry(24, 31), MAT.court); court.name = 'penitenciaria-quadra'; court.rotation.x = -Math.PI/2; court.position.y = .018; court.receiveShadow = true; root.add(court);
  for (const x of [-12,12]) addBox(.12, .025, 31, MAT.white, x, .02, 0, { collide: false, cast: false });
  for (const z of [-15.5,0,15.5]) addBox(24, .025, .12, MAT.white, 0, .02, z, { collide: false, cast: false });
  const circle = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.32, 40), MAT.white); circle.rotation.x = -Math.PI/2; circle.position.y = .03; root.add(circle);
  function goal(index, z, facing) {
    const group = new THREE.Group(); group.name = `penitenciaria-gol-${index}`; root.add(group);
    for (const x of [-3,3]) addBox(.14, 2.3, .14, MAT.white, x, 0, z, { collide: false });
    addBox(6.15, .14, .14, MAT.white, 0, 2.2, z, { collide: false });
    for (let x=-3;x<=3;x+=.6) addBox(.025,2.15,.025,MAT.white,x,0,z+facing*.8,{collide:false,cast:false});
  }
  goal(0,-15,1); goal(1,15,-1);

  function ammoCrate(index, x, z, ry=0) {
    const group = new THREE.Group(); group.name = `penitenciaria-caixa-municao-${index}`; root.add(group);
    const body = addBox(2.2, 1.25, 1.55, MAT.yellow, x, 0, z, { ry, tag: `municao-${index}` }); group.userData.collider = body.userData.collider;
    for (const y of [.18,.92]) addBox(2.28,.1,1.63,MAT.steel,x,y,z,{ry,collide:false});
    for (const dx of [-.65,0,.65]) addBox(.08,.7,1.65,MAT.black,x+dx*Math.cos(ry),.27,z-dx*Math.sin(ry),{ry,collide:false});
  }
  [[-8,-7,.2],[8,-7,-.2],[-8,7,-.15],[8,7,.15],[-16,0,1.57],[16,0,1.57]].forEach((p,i)=>ammoCrate(i,...p));

  function policeCar(x,z,ry) {
    const group = new THREE.Group(); group.name = 'penitenciaria-carro-policia'; group.position.set(x,0,z); group.rotation.y=ry; root.add(group);
    const part=(w,h,d,m,px,py,pz)=>{const mesh=new THREE.Mesh(boxGeo(w,h,d),m);mesh.position.set(px,py+h/2,pz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
    part(2.7,.75,5.4,MAT.white,0,.55,0); part(2.55,.12,3.4,MAT.blue,0,1.05,0); part(2.35,1.05,2.65,MAT.white,0,1.12,.05);
    part(2.38,.72,.08,MAT.glass,0,1.35,-1.35); part(2.38,.72,.08,MAT.glass,0,1.35,1.35);
    for(const sx of [-1,1]) for(const sz of [-1.75,1.75]) { const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.28,16),MAT.rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(sx*1.35,.55,sz);group.add(wheel); }
    part(1.45,.18,.28,MAT.black,0,2.2,0); part(.65,.22,.3,MAT.red,-.42,2.35,0); part(.65,.22,.3,MAT.blue,.42,2.35,0);
    const hx=Math.abs(Math.cos(ry))*1.55+Math.abs(Math.sin(ry))*2.8,hz=Math.abs(Math.sin(ry))*1.55+Math.abs(Math.cos(ry))*2.8;
    const collider={minX:x-hx,maxX:x+hx,minY:0,maxY:2.5,minZ:z-hz,maxZ:z+hz,tag:'carro-policia'};colliders.push(collider);group.userData.collider=collider;occluders.push(group);
  }
  policeCar(17,-25,-.35);

  function punchingBag(index,x,z) {
    const group=new THREE.Group();group.name=`penitenciaria-saco-boxe-${index}`;root.add(group);
    addBox(3.6,.25,2.4,MAT.steel,x,3.4,z,{collide:false}); addBox(.22,3.5,.22,MAT.steel,x-1.55,0,z); addBox(.22,3.5,.22,MAT.steel,x+1.55,0,z);
    addCylinder(.08,.85,MAT.steel,x,2.9,z,{collide:false}); addCylinder(.48,1.9,MAT.red,x,1,z,{collide:true,tag:`saco-${index}`});
  }
  punchingBag(0,-18,38); punchingBag(1,-13,38);

  function dynamite(index,x,z,ry=0) {
    const group=new THREE.Group();group.name=`penitenciaria-dinamite-${index}`;group.position.set(x,0,z);group.rotation.y=ry;root.add(group);
    for(let i=0;i<6;i++){const stick=new THREE.Mesh(cylGeo(.11,1.25,8),MAT.red);stick.rotation.z=Math.PI/2;stick.position.set(0,.18+(i%2)*.2,(i-2.5)*.24);group.add(stick);} const band=new THREE.Mesh(boxGeo(.18,.65,1.65),MAT.black);band.position.y=.25;group.add(band);
  }
  dynamite(0,-19,-16,.2); dynamite(1,19,17,-.25); dynamite(2,4,23,1.1);

  // Bancos externos e barreiras quebram linhas longas sem fechar as três rotas.
  [[-18,-26],[18,27],[-18,24],[18,-20]].forEach(([x,z],i)=>{
    addBox(4.4,.38,1.05,MAT.concrete,x,.72,z,{name:`penitenciaria-banco-patio-${i}`});
    for(const dx of [-1.65,1.65]) addBox(.45,.72,.8,MAT.darkConcrete,x+dx,0,z);
  });

  const GM={dark:MAT.black,steel:MAT.steel,wood:MAT.rust};
  function gun(kind,x,z,yaw){const g=new THREE.Group();g.name=`arma-central-${kind}`;g.position.set(x,.1,z);g.rotation.y=yaw;root.add(g);const long=['awp','ak','m4','shotgun','mp5'].includes(kind);const body=new THREE.Mesh(boxGeo(.13,.13,long?1:.42),kind==='shotgun'?GM.wood:GM.dark);body.position.y=.1;g.add(body);if(long){const barrel=new THREE.Mesh(boxGeo(.08,.08,.55),GM.steel);barrel.position.set(0,.13,-.62);g.add(barrel);}const grip=new THREE.Mesh(boxGeo(.11,.25,.14),GM.wood);grip.position.set(0,-.02,long?.25:.12);g.add(grip);pickups.push({x,z,kind,weapon:kind,readyAt:0,mesh:g});}
  ['awp','ak','m4','shotgun','mp5','deagle','pistol','smg'].forEach((kind,i)=>gun(kind,-10+i*(20/7),i%2?-2.2:2.2,i*.42));
  ['ak','m4','shotgun','deagle'].forEach((kind,i)=>{gun(kind,-15+i*10,-41,0);gun(kind,15-i*10,41,Math.PI);});

  const hemi=new THREE.HemisphereLight(0xdbe8eb,0x343a36,1.35);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe7c7,1.85);sun.position.set(-35,52,-22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-50;sun.shadow.camera.right=50;sun.shadow.camera.top=58;sun.shadow.camera.bottom=-58;sun.shadow.camera.far=180;sun.shadow.bias=-.0004;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x7897ba,.38);fill.position.set(28,24,35);scene.add(fill);

  const groundHeightAt=()=>0, slowAt=()=>false;
  const bounds={minX:-HALF_X+.9,maxX:HALF_X-.9,minZ:-HALF_Z+.9,maxZ:HALF_Z-.9};
  const blocked=(x,z,inflate=.44)=>colliders.some(c=>x>c.minX-inflate&&x<c.maxX+inflate&&z>c.minZ-inflate&&z<c.maxZ+inflate&&c.minY<1.7&&c.maxY>.1);
  const nodes=[],adj=[],step=3.2;
  for(let x=bounds.minX+1;x<=bounds.maxX-1;x+=step)for(let z=bounds.minZ+1;z<=bounds.maxZ-1;z+=step)if(!blocked(x,z))nodes.push({x,z});
  for(let i=0;i<nodes.length;i++)adj.push([]);
  const clear=(a,b)=>{for(let i=1;i<7;i++){const t=i/7;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.25))return false;}return true;};
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z;if(dx*dx+dz*dz<=step*step*2.3&&clear(nodes[i],nodes[j])){adj[i].push(j);adj[j].push(i);}}
  for(let i=0;i<nodes.length;i++)if(adj[i].length===0){let nearest=-1,distance=Infinity;for(let j=0;j<nodes.length;j++){if(i===j||!clear(nodes[i],nodes[j]))continue;const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z,d=dx*dx+dz*dz;if(d<distance){distance=d;nearest=j;}}if(nearest>=0){adj[i].push(nearest);adj[nearest].push(i);}}
  function nearestWaypoint(x,z){let best=0,distance=Infinity;for(let i=0;i<nodes.length;i++){const dx=nodes[i].x-x,dz=nodes[i].z-z,d=dx*dx+dz*dz;if(d<distance){distance=d;best=i;}}return best;}
  function findPath(fromIdx,toIdx){if(fromIdx===toIdx)return[toIdx];const prev=new Int16Array(nodes.length).fill(-1),queue=[fromIdx];prev[fromIdx]=fromIdx;while(queue.length){const n=queue.shift();for(const next of adj[n])if(prev[next]<0){prev[next]=n;if(next===toIdx){const path=[next];let p=n;while(p!==fromIdx){path.unshift(p);p=prev[p];}path.unshift(fromIdx);return path;}queue.push(next);}}return[fromIdx];}
  return {root,colliders,occluders,decalSolids:[root],groundHeightAt,slowAt,pickups,sun,hemi,
    spawns:{E:[-15,-5,5,15].map(x=>({x,z:-42,yaw:0})),B:[15,5,-5,-15].map(x=>({x,z:42,yaw:Math.PI}))},
    ctfPoints:[{id:'E',label:'ALA SUL',x:0,z:-39},{id:'MID',label:'QUADRA',x:0,z:0},{id:'B',label:'ALA NORTE',x:0,z:39}],
    waypoints:{nodes,adj},nearestWaypoint,findPath,bounds};
}
