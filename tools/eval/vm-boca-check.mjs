/* Qual ponta é a boca do cano? A fina. Mede a seção transversal nos dois
   extremos do eixo longo da malha da ARMA (não das mãos) e diz para onde o cano
   aponta no espaço do GLB. A AK aprovada é a referência. */
import fs from 'node:fs';
const COMP={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}, NUM={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
function abrir(p){const b=fs.readFileSync(p);const l=b.readUInt32LE(12);
  return {j:JSON.parse(b.slice(20,20+l).toString('utf8')),bin:b.slice(20+l+8)};}
function ler(g,i){const a=g.j.accessors[i],bv=g.j.bufferViews[a.bufferView];
  const sz=COMP[a.componentType],n=NUM[a.type],str=bv.byteStride||sz*n;
  const off=(bv.byteOffset||0)+(a.byteOffset||0);const out=[];
  for(let k=0;k<a.count;k++){const v=[];
    for(let c=0;c<n;c++){const o=off+k*str+c*sz;
      v.push(a.componentType===5126?g.bin.readFloatLE(o):sz===2?g.bin.readUInt16LE(o):sz===4?g.bin.readUInt32LE(o):g.bin.readUInt8(o));}
    out.push(v);} return out;}

for (const arq of process.argv.slice(2)) {
  const g=abrir(arq), {j}=g;
  const pts=[];
  for(const n of (j.nodes||[])){
    if(n.mesh==null) continue;
    const nome=j.meshes[n.mesh].name||'';
    if(/Requests_Studio_Hands|armmesh|Cylinder/i.test(nome)) continue;  // só a arma
    for(const prim of (j.meshes[n.mesh].primitives||[])){
      if(prim.attributes.POSITION==null) continue;
      for(const p of ler(g,prim.attributes.POSITION)) pts.push(p);
    }
  }
  if(!pts.length){console.log(`  ${arq}: sem malha de arma`);continue;}
  let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const p of pts) for(let k=0;k<3;k++){if(p[k]<mn[k])mn[k]=p[k];if(p[k]>mx[k])mx[k]=p[k];}
  const d=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];
  const L=d.indexOf(Math.max(...d)), A=(L+1)%3, B=(L+2)%3;
  const faixa=d[L]*0.08;
  const secao=(lo,hi)=>{let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9,n=0;
    for(const p of pts){ if(p[L]<lo||p[L]>hi) continue; n++;
      if(p[A]<a0)a0=p[A]; if(p[A]>a1)a1=p[A]; if(p[B]<b0)b0=p[B]; if(p[B]>b1)b1=p[B]; }
    return n? Math.hypot(a1-a0,b1-b0) : 0; };
  const baixo=secao(mn[L],mn[L]+faixa), alto=secao(mx[L]-faixa,mx[L]);
  const boca = baixo<alto ? 'MENOS' : 'MAIS';
  const eixo='xyz'[L];
  console.log(`  ${arq.split('/').pop().padEnd(18)} eixo longo ${eixo} · seção na ponta ${eixo}- = ${baixo.toFixed(3)} · na ponta ${eixo}+ = ${alto.toFixed(3)}  →  cano aponta para ${eixo}${boca==='MENOS'?'-':'+'}`);
}
