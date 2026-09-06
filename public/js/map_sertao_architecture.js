import * as THREE from 'three';

// Acabamento autoral: conserva os volumes físicos. Referências em SERTAO-REFERENCIAS.md.
export function finishTaipa(group, roofMaterial, plaster, id, w = 5.4, d = 6.8) {
  const edge = new THREE.CylinderGeometry(.16, .17, .47, 5, 1, true, 0, Math.PI);
  const tiles = new THREE.InstancedMesh(edge, roofMaterial, 28);
  tiles.name = 'sertao-telhas-beiral'; tiles.castShadow = false;
  const obj = new THREE.Object3D(); let n = 0;
  for (const z of [-d / 2 - .45, d / 2 + .45]) for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
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
