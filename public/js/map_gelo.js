import * as THREE from 'three';

const HALF_X = 40;
const HALF_Z = 42;

function canvasTexture(name, base, light, dark, mode, repeatX = 4, repeatY = repeatX) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  let seed = [...name].reduce((value, char) => (value * 33 + char.charCodeAt(0)) >>> 0, 1977);
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  if (mode === 'stone') {
    for (let row = 0; row < 8; row++) {
      const y = row * 32;
      const offset = row % 2 ? 24 : 0;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      for (let x = offset; x < 256; x += 52) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
      }
    }
    for (let i = 0; i < 850; i++) {
      const alpha = .025 + random() * .11;
      ctx.fillStyle = random() > .45 ? `rgba(235,248,255,${alpha})` : `rgba(18,39,55,${alpha})`;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 7, 1 + random() * 4);
    }
  } else if (mode === 'snow') {
    for (let i = 0; i < 900; i++) {
      const alpha = .03 + random() * .12;
      ctx.fillStyle = random() > .35 ? `rgba(255,255,255,${alpha})` : `rgba(85,130,158,${alpha})`;
      ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 1 + random() * 5, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, light); gradient.addColorStop(.45, base); gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(205,239,255,.34)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      let x = random() * 256, y = random() * 256;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += random() * 30 - 15; y += random() * 24; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

export function buildTretaNoGelo(scene) {
  const root = new THREE.Group();
  root.name = 'treta-no-gelo';
  scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const geometries = new Map();
  const boxGeometry = (w, h, d) => {
    const key = `${w}:${h}:${d}`;
    if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(w, h, d));
    return geometries.get(key);
  };

  const textures = {
    stone: canvasTexture('gelo-pedra', '#7894a5', '#b8d0dc', '#3e5d70', 'stone', 5, 3),
    snow: canvasTexture('gelo-neve', '#dbeaf0', '#ffffff', '#8db0c2', 'snow', 6, 6),
    floor: canvasTexture('gelo-piso', '#8cb7cc', '#d8f2fb', '#416c86', 'ice', 8, 9),
    trim: canvasTexture('gelo-friso', '#5d7d92', '#afcedc', '#294657', 'stone', 8, 1),
  };
  const materials = {
    stone: new THREE.MeshStandardMaterial({ map: textures.stone, bumpMap: textures.stone, bumpScale: .055, color: 0xc7dbe4, roughness: .84 }),
    stoneDark: new THREE.MeshStandardMaterial({ map: textures.stone, bumpMap: textures.stone, bumpScale: .04, color: 0x7894a5, roughness: .9 }),
    snow: new THREE.MeshStandardMaterial({ map: textures.snow, bumpMap: textures.snow, bumpScale: .035, color: 0xffffff, roughness: .92 }),
    ice: new THREE.MeshPhysicalMaterial({ map: textures.floor, bumpMap: textures.floor, bumpScale: .025, color: 0xbfe7f4, roughness: .3, metalness: .04, clearcoat: .45, clearcoatRoughness: .28 }),
    trim: new THREE.MeshStandardMaterial({ map: textures.trim, color: 0xa3c0cf, roughness: .76 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5b3c2a, roughness: .88 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0x9a7551, roughness: .82 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x526674, metalness: .58, roughness: .5 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x8edcf2, emissive: 0x17435a, emissiveIntensity: .3, roughness: .18, metalness: .05, transparent: true, opacity: .82 }),
  };

  function addCollider(x, y, z, w, h, d, tag) {
    const collider = { minX: x-w/2, maxX: x+w/2, minY: y, maxY: y+h, minZ: z-d/2, maxZ: z+d/2, tag };
    colliders.push(collider);
    return collider;
  }
  function addBox(w, h, d, material, x, y, z, options = {}) {
    const mesh = new THREE.Mesh(boxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    if (options.ry) mesh.rotation.y = options.ry;
    mesh.name = options.name || '';
    mesh.castShadow = options.cast !== false;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (options.collide !== false) {
      const hx = Math.abs(Math.cos(options.ry || 0))*w/2 + Math.abs(Math.sin(options.ry || 0))*d/2;
      const hz = Math.abs(Math.sin(options.ry || 0))*w/2 + Math.abs(Math.cos(options.ry || 0))*d/2;
      const collider = addCollider(x, y, z, hx*2, h, hz*2, options.tag || options.name);
      mesh.userData.collider = collider;
      if (h > 1.1) occluders.push(mesh);
    }
    return mesh;
  }
  function addOctagon(radius, height, material, x, y, z, name, collide = true) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 8), material);
    mesh.position.set(x, y + height / 2, z);
    mesh.rotation.y = Math.PI / 8;
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (collide) {
      const collider = addCollider(x, y, z, radius*1.86, height, radius*1.86, name);
      mesh.userData.collider = collider;
      occluders.push(mesh);
    }
    return mesh;
  }

  scene.background = new THREE.Color(0x9fb9ca);
  scene.fog = new THREE.Fog(0xa8bfcd, 62, 135);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 116), materials.ice);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -.025;
  ground.receiveShadow = true;
  ground.name = 'gelo-patio-congelado';
  root.add(ground);

  for (const [w,d,x,z,name] of [
    [82,1.2,0,-HALF_Z,'sul'], [82,1.2,0,HALF_Z,'norte'],
    [1.2,84,-HALF_X,0,'oeste'], [1.2,84,HALF_X,0,'leste'],
  ]) {
    addBox(w, 5.4, d, materials.stone, x, 0, z, { name:`gelo-muro-${name}` });
    addBox(w+.15, .45, d+.18, materials.trim, x, 4.2, z, { name:`gelo-friso-muro-${name}`, collide:false });
    addBox(w+.35, .35, d+.35, materials.snow, x, 5.35, z, { name:`gelo-neve-muro-${name}`, collide:false });
  }

  function fortressPart(id, radius, height, x, z, central = false) {
    const group = new THREE.Group();
    group.name = central ? 'gelo-fortaleza-central' : `gelo-fortaleza-bastiao-${id}`;
    root.add(group);
    const body = addOctagon(radius, height, central ? materials.stoneDark : materials.stone, x, 0, z, `gelo-bloco-${central ? 'central' : id}`);
    const lowerTrim = addOctagon(radius+.1, .38, materials.trim, x, .38, z, `gelo-friso-inferior-${id}`, false);
    const upperTrim = addOctagon(radius+.16, .48, materials.trim, x, height-.68, z, `gelo-friso-superior-${id}`, false);
    const roof = addOctagon(radius+.32, .28, materials.snow, x, height, z, `gelo-telhado-neve-${id}`, false);
    for (const object of [body, lowerTrim, upperTrim, roof]) { root.remove(object); group.add(object); }
    return group;
  }
  fortressPart('centro', 10.8, 8.2, 0, 0, true);
  [[-23,-21],[23,-21],[-23,21],[23,21]].forEach(([x,z], index) => fortressPart(index, 6.8, 6.4, x, z));

  const wallSpecs = [
    { id: 'sul', x: -12, z: -8.5, yaw: 0 },
    { id: 'norte', x: 12, z: 8.5, yaw: Math.PI },
  ];
  function iceWall(id, x, z, yaw) {
    const group = new THREE.Group(); group.name = `gelo-parede-${id}`; root.add(group);
    const body = addBox(7.2,3.2,.9,materials.stone,x,0,z,{ry:yaw,name:`gelo-estrutura-parede-${id}`,tag:`gelo-parede-${id}`});
    const trim = addBox(7.34,.32,1.02,materials.trim,x,2.48,z,{ry:yaw,collide:false,name:`gelo-friso-parede-${id}`});
    const snow = addBox(7.48,.2,1.14,materials.snow,x,3.2,z,{ry:yaw,collide:false,name:`gelo-neve-parede-${id}`});
    for (const object of [body, trim, snow]) { root.remove(object); group.add(object); }
  }
  wallSpecs.forEach(({ id, x, z, yaw }) => iceWall(id, x, z, yaw));

  const groundHeightAt = () => 0;

  function crate(id, x, z, yaw = 0) {
    const group = new THREE.Group(); group.name = `gelo-cobertura-caixa-${id}`; root.add(group);
    const body = addBox(2.35,1.75,2.35,materials.wood,x,0,z,{ry:yaw,name:`gelo-caixa-corpo-${id}`});
    root.remove(body); group.add(body); group.userData.collider = body.userData.collider;
    for (const side of [-1,1]) {
      const band = addBox(.18,1.82,2.46,materials.metal,x+side*.78*Math.cos(yaw),0,z-side*.78*Math.sin(yaw),{ry:yaw,collide:false,name:`gelo-caixa-cinta-${id}-${side}`});
      root.remove(band); group.add(band);
    }
    const snow = addBox(2.48,.14,2.48,materials.snow,x,1.72,z,{ry:yaw,collide:false,name:`gelo-caixa-neve-${id}`});
    root.remove(snow); group.add(snow);
  }
  [[-32,-8,.1],[32,8,.1],[-31,10,-.2],[31,-10,-.2],[-13,-30,.2],[13,30,.2],[-4,-18,-.1],[4,18,-.1]].forEach((p,i)=>crate(i,...p));

  function crystalCover(id, x, z, scale = 1) {
    const group = new THREE.Group(); group.name = `gelo-cobertura-cristal-${id}`; root.add(group);
    for (const [dx,dz,h,r] of [[0,0,2.8,.72],[-.7,.25,1.9,.48],[.65,.35,2.2,.55]]) {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(r*scale, h*scale, 5), materials.crystal);
      mesh.position.set(x+dx*scale,h*scale/2,z+dz*scale); mesh.rotation.y = id*.7+dx;
      mesh.name=`gelo-cristal-${id}`; mesh.castShadow=true; group.add(mesh);
    }
    group.userData.collider = addCollider(x,0,z,2.6*scale,2.8*scale,2.2*scale,`cristal-${id}`);
    occluders.push(group);
  }
  [[-17,0,1],[17,0,1],[0,-28,1.05],[0,28,1.05]].forEach((p,i)=>crystalCover(i,...p));

  for (const [id,x,z,yaw] of [['so',-27,-33,.2],['se',27,-33,-.2],['no',-27,33,-.2],['ne',27,33,.2]]) {
    addBox(7.2,1.4,.9,materials.stone,x,0,z,{ry:yaw,name:`gelo-cobertura-barreira-${id}`});
    addBox(7.35,.18,1.02,materials.snow,x,1.36,z,{ry:yaw,collide:false,name:`gelo-neve-barreira-${id}`});
  }

  const gunMaterials = { dark: materials.metal, wood: materials.woodLight };
  function gun(kind, x, z, yaw) {
    const group = new THREE.Group(); group.name = `arma-gelo-${kind}`; group.position.set(x,.12,z); group.rotation.y=yaw; root.add(group);
    const long = !['pistol','deagle'].includes(kind);
    const body = new THREE.Mesh(boxGeometry(.15,.13,long?.92:.42),gunMaterials.dark); body.position.y=.12; group.add(body);
    if (long) { const barrel = new THREE.Mesh(boxGeometry(.07,.07,.56),gunMaterials.dark); barrel.position.set(0,.14,-.62); group.add(barrel); }
    const grip = new THREE.Mesh(boxGeometry(.12,.27,.15),gunMaterials.wood); grip.position.set(0,-.02,long?.22:.1); group.add(grip);
    pickups.push({x,z,kind,weapon:kind,readyAt:0,mesh:group});
  }
  const arsenal = ['ak','m4','awp','shotgun','mp5','smg','deagle','pistol'];
  for (let i=0;i<12;i++) {
    const x=-16+i*(32/11), kind=arsenal[i%arsenal.length];
    gun(kind,x,-13+(i%2)*2.5,.12*i); gun(kind,-x,13-(i%2)*2.5,Math.PI+.12*i);
  }

  const blocked = (x,z,pad=.72) => colliders.some((c)=>x>c.minX-pad&&x<c.maxX+pad&&z>c.minZ-pad&&z<c.maxZ+pad);
  const bounds={minX:-HALF_X+.9,maxX:HALF_X-.9,minZ:-HALF_Z+.9,maxZ:HALF_Z-.9};
  const nodes=[]; const step=2.7;
  for(let x=bounds.minX+1;x<=bounds.maxX-1;x+=step) for(let z=bounds.minZ+1;z<=bounds.maxZ-1;z+=step) if(!blocked(x,z)) nodes.push({x,z});
  const adj=nodes.map(()=>[]);
  for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
    const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z,d=Math.hypot(dx,dz);
    if(d<=step*1.48&&!blocked((nodes[i].x+nodes[j].x)/2,(nodes[i].z+nodes[j].z)/2,.58)){adj[i].push(j);adj[j].push(i);}
  }
  function nearestWaypoint(x,z){let best=0,distance=Infinity;for(let i=0;i<nodes.length;i++){const dx=nodes[i].x-x,dz=nodes[i].z-z,d=dx*dx+dz*dz;if(d<distance){distance=d;best=i;}}return best;}
  function findPath(from,to){
    if(from===to)return[from];const previous=new Int32Array(nodes.length);previous.fill(-1);const queue=[from];previous[from]=from;
    for(let head=0;head<queue.length;head++){const current=queue[head];for(const next of adj[current])if(previous[next]<0){previous[next]=current;queue.push(next);if(next===to){head=queue.length;break;}}}
    if(previous[to]<0)return[from];const path=[];for(let at=to;;at=previous[at]){path.push(at);if(at===from)break;}return path.reverse();
  }

  const hemi = new THREE.HemisphereLight(0xdceeff,0x304657,1.42); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xe8f5ff,1.72); sun.position.set(-32,48,-28); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-52; sun.shadow.camera.right=52; sun.shadow.camera.top=54; sun.shadow.camera.bottom=-54; sun.shadow.camera.far=150; sun.shadow.bias=-.00035; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6aa7cb,.42); fill.position.set(30,18,24); scene.add(fill);

  return {
    root, colliders, occluders, decalSolids:[root], pickups, sun, hemi,
    groundHeightAt, slowAt:()=>1, speedMulAt:()=>.55, surfaceAt:()=> 'ice',
    spawns:{E:[-18,-6,6,18].map(x=>({x,z:-36,yaw:0})),B:[18,6,-6,-18].map(x=>({x,z:36,yaw:Math.PI}))},
    ctfPoints:[
      {id:'E',x:0,z:-34,label:'PORTÃO SUL'},{id:'O',x:-31,z:0,label:'BASTIÃO OESTE'},
      {id:'L',x:31,z:0,label:'BASTIÃO LESTE'},{id:'B',x:0,z:34,label:'PORTÃO NORTE'},
    ],
    waypoints:{nodes,adj},nearestWaypoint,findPath,bounds,
  };
}
