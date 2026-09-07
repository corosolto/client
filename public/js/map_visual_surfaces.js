import * as THREE from 'three';
import { StaticBatch } from './mapprops.js';
const surfaceCache = new WeakMap();

// Escala física só no UV; posição, normal e índice permanecem iguais para colisão/bala.
export function surfaceMeters(mesh, meters = 2) {
  const texture = mesh.material?.map;
  if (!texture || !['BoxGeometry', 'PlaneGeometry'].includes(mesh.geometry.type)) return;
  const source = mesh.geometry, key = `${meters}:${texture.repeat.x}:${texture.repeat.y}`;
  let cache = surfaceCache.get(source);
  if (!cache) { cache = new Map(); surfaceCache.set(source,cache); }
  if (cache.has(key)) { mesh.geometry=cache.get(key); mesh.userData.surfaceMeters=meters; return; }
  const geometry = mesh.geometry.clone(), p = geometry.attributes.position;
  const n = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const nz = Math.abs(n.getZ(i));
    const u = nx > ny && nx > nz ? p.getZ(i) : p.getX(i);
    const v = ny > nx && ny > nz ? p.getZ(i) : p.getY(i);
    uv.setXY(i, u / (meters * texture.repeat.x), v / (meters * texture.repeat.y));
  }
  mesh.geometry = geometry;
  cache.set(key,geometry);
  mesh.userData.surfaceMeters = meters;
}

export function civicSurround(root, kind) {
  const group = new THREE.Group(); group.name = `${kind}-visual-surround`;
  group.userData.nonCollider = true; root.add(group);
  const batch = new StaticBatch({ name: `${kind}-surround-batch` });
  const mat = color => new THREE.MeshLambertMaterial({ color });
  const wall = mat(0xc4baa5), trim = mat(0xe4dac4), dark = mat(0x45504b);
  const brick = mat(0x947c63), leaf = mat(0x476343);
  const matrix = new THREE.Matrix4();
  function box(w,h,d,x,y,z,material) {
    const geo = new THREE.BoxGeometry(w,h,d);
    matrix.makeTranslation(x,y+h/2,z);
    batch.add(geo,matrix,material,{cast:false}); geo.dispose();
  }
  if (kind === 'penitenciaria') {
    // Pavilhões fora do muro: referência arquitetônica, sem nova área transitável.
    for (const side of [-1,1]) {
      box(12,18,76,side*52,0,0,wall);
      box(12.5,.45,76.5,side*52,18,0,trim);
      for (const y of [6.6,9.8,13,16.2]) {
        box(.16,.25,76,side*45.9,y-0.6,0,trim);
        for(let z=-34;z<=34;z+=4) {
          box(.18,1.6,1.9,side*45.82,y,z,dark);
          box(.21,1.6,.1,side*45.8,y,z,trim);
        }
      }
      for(let z=-36;z<=36;z+=12) box(.24,12.3,.35,side*45.76,5.7,z,brick);
    }
    for(const z of [-60,60]) {
      box(52,14,10,0,0,z,wall); box(53,.4,11,0,14,z,trim);
      for(const y of [7,10.3]) for(let x=-23;x<=23;x+=4) box(1.8,1.65,.16,x,y,z-Math.sign(z)*5.1,dark);
    }
  } else {
    box(106,.1,116,0,-.16,0,mat(0x6a7950));
    for(const side of [-1,1]) {
      for(const z of [-30,-12,12,30]) {
        const x=side*39, h=10+(Math.abs(z)===12?1.5:0);
        const trunk = new THREE.CylinderGeometry(.18,.32,h,7);
        matrix.makeTranslation(x,h/2,z); batch.add(trunk,matrix,brick,{cast:false}); trunk.dispose();
        for(let k=0;k<9;k++) {
          const a=k*Math.PI*2/9, points=[];
          for(let s=0;s<5;s++) {
            const r=s*1.05, width=Math.sin(s*Math.PI/4)*.65;
            for(const edge of [-1,1]) points.push(Math.cos(a)*r-Math.sin(a)*width*edge,
              Math.sin(s*Math.PI/4)*1.1-s*.32, Math.sin(a)*r+Math.cos(a)*width*edge);
          }
          const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
          const ix=[]; for(let s=0;s<4;s++) { const i=s*2; ix.push(i,i+2,i+1,i+1,i+2,i+3,i+1,i+2,i,i+3,i+2,i+1); }
          geo.setIndex(ix); geo.computeVertexNormals(); matrix.makeTranslation(x,h,z);
          batch.add(geo,matrix,leaf,{cast:false}); geo.dispose();
        }
      }
      for(const z of [-22,22]) {
        const x=side*41;
        for(const dx of [-3.5,3.5]) for(const dz of [-4,4]) box(.3,4,.3,x+dx,0,z+dz,dark);
        for(const dx of [-3.5,3.5]) box(.25,.35,9,x+dx,4,z,brick);
        for(let dz=-4;dz<=4;dz+=.8) box(8,.18,.22,x,4.35,z+dz,trim);
      }
      for(let z=-44;z<=44;z+=14) {
        const h=5+(Math.abs(z)%3)*1.2, x=side*51;
        box(8,h,10,x,0,z,wall); box(8.4,.25,10.4,x,h,z,brick);
        for(const dz of [-2.5,2.5]) box(.15,1.2,1.4,x-side*4.1,h-2.3,z+dz,dark);
      }
    }
  }
  batch.build(group);
  group.traverse(o => { o.userData.nonCollider=true; });
  return group;
}
