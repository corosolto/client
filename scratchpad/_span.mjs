import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync, existsSync } from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const inf = JSON.parse(readFileSync('tools/eval/select_inflate.json','utf8'));
const porId = Object.fromEntries(inf.personagens.map(p=>[p.id,p.ruins1e4]));
const extra = { lampiao:121.5, saci:607.1, cuca:316.8, mariabonita:47.5, bandeirante:93.1, zumbi:36.3, curupira:32.1, boto:21.6 };
Object.assign(porId, extra);
const alvos = process.argv.slice(2);
const linhas = [];
for (const id of alvos) {
  const f = `public/models/characters/${id}.glb`;
  if (!existsSync(f)) continue;
  const d = await io.read(f);
  const skin = d.getRoot().listSkins()[0]; if (!skin) continue;
  const joints = skin.listJoints();
  const nome = joints.map(j=>j.getName());
  // distancia de grafo entre ossos
  const pai = new Map();
  for (const j of joints) for (const c of j.listChildren()) pai.set(c.getName(), j.getName());
  const cadeia = (n) => { const p=[]; let x=n; while(x){p.push(x); x=pai.get(x);} return p; };
  const distCache = new Map();
  const dist = (a,b) => {
    if (a===b) return 0;
    const k=a<b?a+'|'+b:b+'|'+a; if(distCache.has(k)) return distCache.get(k);
    const ca=cadeia(a), cb=cadeia(b);
    let d=99; for(let i=0;i<ca.length;i++){const j=cb.indexOf(ca[i]); if(j>=0){d=i+j;break;}}
    distCache.set(k,d); return d;
  };
  let n=0, largos=0, pior=0;
  for (const mesh of d.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    const ji=p.getAttribute('JOINTS_0')?.getArray(), jw=p.getAttribute('WEIGHTS_0')?.getArray();
    if(!ji) continue;
    for(let i=0;i<jw.length/4;i++){
      const ativos=[]; for(let k=0;k<4;k++) if(jw[i*4+k]>0.12) ativos.push(nome[ji[i*4+k]]);
      if(ativos.length<2){n++;continue;}
      let m=0; for(let a=0;a<ativos.length;a++) for(let b=a+1;b<ativos.length;b++) m=Math.max(m,dist(ativos[a],ativos[b]));
      if(m>3) largos++; pior=Math.max(pior,m); n++;
    }
  }
  linhas.push({id, pct:+(100*largos/n).toFixed(2), pior, inf:porId[id]??null});
}
linhas.sort((a,b)=>(b.inf??0)-(a.inf??0));
console.log('id              inflação   %vért com peso entre ossos distantes(>3)   pior span');
for(const l of linhas) console.log('  '+l.id.padEnd(14), String(l.inf??'?').padStart(7), String(l.pct).padStart(28)+'%', String(l.pior).padStart(10));
