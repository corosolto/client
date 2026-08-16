import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const cls of ['rifle', 'pistol', 'shotgun']) {
  const doc = await io.read(`public/models/fpvm/arms_${cls}.glb`);
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const a = prim.getAttribute('POSITION').getArray();
  const n = a.length / 3;
  const P = i => [a[i*3], a[i*3+1], a[i*3+2]];
  // muzzle = centroide z>maxZ-0.06 ; stock = centroide z<minZ+0.12
  let mnz=1e9, mxz=-1e9;
  for (let i=0;i<n;i++){mnz=Math.min(mnz,a[i*3+2]);mxz=Math.max(mxz,a[i*3+2]);}
  const ctr = (pred) => { let s=[0,0,0],c=0; for(let i=0;i<n;i++){const p=P(i); if(!pred(p))continue; s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];c++;} return s.map(v=>v/c); };
  const mz = ctr(p=>p[2]>mxz-0.06), st = ctr(p=>p[2]<mnz+0.12);
  const axis = [mz[0]-st[0], mz[1]-st[1], mz[2]-st[2]];
  const L = Math.hypot(...axis); for(let i=0;i<3;i++) axis[i]/=L;
  // up0 = +Y projetado ⊥ axis
  let up = [0,1,0]; const d = up[0]*axis[0]+up[1]*axis[1]+up[2]*axis[2];
  up = [up[0]-d*axis[0], up[1]-d*axis[1], up[2]-d*axis[2]];
  const ul = Math.hypot(...up); up = up.map(v=>v/ul);
  const side = [up[1]*axis[2]-up[2]*axis[1], up[2]*axis[0]-up[0]*axis[2], up[0]*axis[1]-up[1]*axis[0]];
  // p/ cada vértice: t (0=stock,1=muzzle), h (altura no up), s (lateral)
  console.log(`\n== ${cls} == axis=[${axis.map(v=>v.toFixed(3))}] muzzle=[${mz.map(v=>v.toFixed(3))}] stock=[${st.map(v=>v.toFixed(3))}]`);
  console.log('   t |  hMin  hMax  sMin  sMax  (n)');
  for (let t0=0; t0<1.0001; t0+=0.1) {
    let hmn=1e9,hmx=-1e9,smn=1e9,smx=-1e9,c=0;
    for (let i=0;i<n;i++){
      const p=P(i); const v=[p[0]-st[0],p[1]-st[1],p[2]-st[2]];
      const t=(v[0]*axis[0]+v[1]*axis[1]+v[2]*axis[2])/L;
      if (t<t0-0.05||t>=t0+0.05) continue;
      const h=v[0]*up[0]+v[1]*up[1]+v[2]*up[2], s=v[0]*side[0]+v[1]*side[1]+v[2]*side[2];
      hmn=Math.min(hmn,h);hmx=Math.max(hmx,h);smn=Math.min(smn,s);smx=Math.max(smx,s);c++;
    }
    console.log(`  ${t0.toFixed(1)} | ${hmn.toFixed(3)} ${hmx.toFixed(3)} ${smn.toFixed(3)} ${smx.toFixed(3)} (${c})`);
  }
}
