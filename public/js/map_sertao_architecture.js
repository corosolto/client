import * as THREE from 'three';

// Acabamento autoral: conserva os volumes físicos. Referências em SERTAO-REFERENCIAS.md.
export function finishTaipa(group, roofMaterial, plaster, id, w = 5.4, d = 6.8, materials) {
  const edge = new THREE.CylinderGeometry(.16, .17, .47, 5, 1, true, 0, Math.PI);
  const tiles = new THREE.InstancedMesh(edge, roofMaterial, 238);
  tiles.name = 'sertao-telhas-cobertura'; tiles.castShadow = false;
  const obj = new THREE.Object3D(); let n = 0;
  for (const z of Array.from({length:17},(_,i)=>-d/2-.45+i*(d+.9)/16)) for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const x = side * (.23 + i * .44);
    obj.position.set(x, 4.17 - Math.abs(x) * .309, z);
    obj.rotation.set(Math.PI / 2, 0, Math.PI / 2 + side * .30); obj.updateMatrix();
    tiles.setMatrixAt(n++, obj.matrix);
  }
  tiles.computeBoundingSphere(); group.add(tiles);

  // Desgaste é uma única área na parede, não um desenho repetido no tile de reboco.
  const side = id % 2 ? -1 : 1;
  const patchGeo = new THREE.PlaneGeometry(.65 + (id % 3) * .14, .45 + (id % 2) * .2, 5, 3);
  const p = patchGeo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + Math.sin(i * 2.41 + id) * .025);
  const repair = new THREE.Mesh(patchGeo, plaster);
  repair.name = 'sertao-reparo-local'; repair.position.set(side * (w / 2 + .006), .48, (id % 3 - 1) * 1.4);
  repair.rotation.y = side * Math.PI / 2; repair.receiveShadow = true; group.add(repair);
  // Três faces fechadas ganham venezianas rasas. Mantêm os sólidos e o campo de tiro.
  if (!materials) return;
  const shutter = materials.paupiqueCaiado.clone(); shutter.color.setHex(id % 2 ? 0x6e8e8b : 0x74816a);
  const batches = [[shutter, []], [materials.trim, []], [shutter, []]];
  for (const [x,z,angle] of [[-w/2-.04,0,-Math.PI/2],[w/2+.04,0,Math.PI/2],[0,-d/2-.04,Math.PI]]) {
    const face = new THREE.Matrix4().makeRotationY(angle); face.setPosition(x,0,z);
    const part = (list, px,py,pz,sx,sy,sz) => {
      const o = new THREE.Object3D(); o.position.set(px,py,pz);o.scale.set(sx,sy,sz);o.updateMatrix();list.push(face.clone().multiply(o.matrix));
    };
    for(const px of [-.25,.25]) part(batches[0][1],px,1.97,.035,.47,.86,.07);
    for(const px of [-.56,0,.56]) part(batches[1][1],px,1.97,.025,.07,1.04,.07);
    for(const py of [1.48,2.46]) part(batches[1][1],0,py,.025,1.18,.07,.07);
    part(batches[2][1],0,.37,-.008,angle===Math.PI?w:d,.40,.035);
  }
  // Venezianas e rodapés compartilham material/geometria: uma chamada por casa.
  batches[0][1].push(...batches[2][1]); batches.splice(2,1);
  for (const [i,[mat,matrices]] of batches.entries()) {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,matrices.length);
    m.name = `sertao-acabamento-taipa-${id}-${i}`;m.receiveShadow=true;
    matrices.forEach((matrix,j)=>m.setMatrixAt(j,matrix));m.computeBoundingSphere();group.add(m);
  }

}

export function finishVenda(group, materials, id) {
  const plaster = materials.paupiqueCaiado, blue = plaster.clone(); blue.color.set(0x718b83);
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m;
  };
  box(7.8, .58, .04, blue, 0, .8, 3.225);
  box(.04, .58, 6.4, blue, -3.925, .8, 0);
  box(.04, .58, 6.4, blue, 3.925, .8, 0);
  box(8.3, .12, .48, plaster, 0, 4.98, 3.1);
  const frameParts = [[-.72,1.62,.10,2.36],[.72,1.62,.10,2.36],[0,2.80,1.54,.10],[-.72,3.04,.10,.44],[.72,3.04,.10,.44],[0,3.29,1.54,.10],...[-.44,-.22,0,.22,.44].map(x=>[x,1.62,.018,2.12])];
  const frame = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),materials.trim,frameParts.length), part = new THREE.Object3D();
  frameParts.forEach(([x,y,w,h],i)=>{part.position.set(x,y,3.33);part.scale.set(w,h,.08);part.updateMatrix();frame.setMatrixAt(i,part.matrix);});
  frame.computeBoundingSphere();group.add(frame);
  if (id !== 0) return;
  // Potes sobre o peitoril existente: não acrescentam barreira ao chão da rota.
  const clay = new THREE.MeshStandardMaterial({ color: 0xa56540, roughness: 1 });
  const profile = [[.10,0],[.16,.04],[.21,.2],[.16,.32],[.09,.37],[.09,.43]];
  for (const x of [-2.65, -2.15]) {
    const pot = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x,y)), 10), clay);
    pot.position.set(x, 1.84, 3.26); pot.name = 'sertao-pote-venda'; group.add(pot);
  }
}

export function crateBattens(group, material, crates) {
  const batch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, crates.length * 8);
  batch.name = 'sertao-travessas-caixotes';
  const obj = new THREE.Object3D(); let i = 0;
  for (const [x,y,z,w,h,d] of crates) for (const side of [-1,1]) {
    for (const sx of [-1,1]) {
      obj.position.set(x + sx * w * .39, y + h/2, z + side * (d/2+.025));
      obj.scale.set(.12, h, .055); obj.updateMatrix(); batch.setMatrixAt(i++,obj.matrix);
    }
    for (const sy of [.08,.92]) {
      obj.position.set(x, y + h*sy, z + side*(d/2+.025));
      obj.scale.set(w,.10,.055); obj.updateMatrix(); batch.setMatrixAt(i++,obj.matrix);
    }
  }
  batch.computeBoundingSphere(); group.add(batch);
}

export function settlementGround(root) {
  const group = new THREE.Group(); group.name = 'sertao-marcas-chao'; root.add(group);
  // Contato barato sob flora: não projeta a copa em shadow maps a cada frame.
  const canvas = document.createElement('canvas'); canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'), gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(33,29,22,.25)'); gradient.addColorStop(1,'rgba(33,29,22,0)');
  ctx.fillStyle=gradient; ctx.fillRect(0,0,64,64);
  const plants=root.children.filter(o => /^sertao-(mandacaru|juazeiro|pedra)-/.test(o.name));
  const contacts=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}),plants.length);
  const obj=new THREE.Object3D();
  plants.forEach((p,i)=>{obj.position.set(p.position.x,.012,p.position.z);obj.rotation.x=-Math.PI/2;obj.scale.set(p.name.includes('juazeiro')?3:2.2,p.name.includes('juazeiro')?3:2.2,1);obj.updateMatrix();contacts.setMatrixAt(i,obj.matrix);});
  contacts.computeBoundingSphere(); group.add(contacts);
}

// Quatro amostras do MESMO albedo, com offsets por célula e transição contínua.
// Impede a estrada diagonal do tile legado virar listras até o horizonte.
// Só o solo Sertão usa este shader; ?soil=legacy permite comparação de custo.
export function untileSertaoSoil(material) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('soil') === 'legacy') return;
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
      vec2 sertaoOffset(vec2 p) {
        return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453)*19.0;
      }
      #ifdef USE_MAP
      vec4 sertaoSoilSample(vec2 uv, vec2 cell) {
        vec2 offset = sertaoOffset(cell);
        float angle = offset.x * 6.2831853;
        float c = cos(angle), s = sin(angle);
        mat2 rotation = mat2(c,-s,s,c);
        #ifdef texture2DGradEXT
          return texture2DGradEXT(map, rotation*uv+offset, rotation*dFdx(uv), rotation*dFdy(uv));
        #else
          return texture2D(map, rotation*uv+offset);
        #endif
      }
      #endif`);
    const fragment = THREE.ShaderChunk.map_fragment.replace('vec4 sampledDiffuseColor = texture2D( map, vMapUv );', `
      vec2 cell = floor(vMapUv * .35), f = fract(vMapUv * .35);
      f = f*f*(3.0-2.0*f);
      vec4 a = sertaoSoilSample(vMapUv,cell);
      vec4 b = sertaoSoilSample(vMapUv,cell+vec2(1.,0.));
      vec4 c = sertaoSoilSample(vMapUv,cell+vec2(0.,1.));
      vec4 d = sertaoSoilSample(vMapUv,cell+vec2(1.,1.));
      vec4 sampledDiffuseColor = mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
      // Média linear medida no albedo legado. Distância elimina padrões macroscópicos,
      // preservando o grão na arena; não acrescenta névoa que esconda adversários.
      float detail = mix(.9,.18,smoothstep(25.,140.,length(vViewPosition)));
      sampledDiffuseColor.rgb = mix(vec3(.32666,.17893,.07580),sampledDiffuseColor.rgb,detail);`);
    if (fragment === THREE.ShaderChunk.map_fragment) throw Error('map_fragment mudou: shader Sertão precisa revisão');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',fragment);
  };
  material.customProgramCacheKey = () => 'sertao-soil-offset-v1';
}
