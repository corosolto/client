import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { TEAM_HANDS, teamHandStyle } from '../../public/js/vmhands.js';

const root = path.resolve(import.meta.dirname, '../..');
const inspection = JSON.parse(await fs.readFile(path.join(root, 'artifacts/viewmodels/astra-series/hand-continuity/inspection.json')));
const size = 512;
const parse = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const skin = [183, 137, 104];
const styles = [...Object.values(TEAM_HANDS), teamHandStyle('M')];
const output = path.join(root, 'public/models/viewmodels/coro/hands');
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const normalize = a => a.map(v => v / Math.hypot(...a));
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const gauss=(v,w)=>Math.exp(-(v*v)/(w*w));
const star=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?.085:.2;return [Math.cos(a)*r,Math.sin(a)*r];});
const inStar=(x,y)=>{let hit=false;for(let i=0,j=9;i<10;j=i++){
  const [a,b]=star[i],[c,d]=star[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
}return hit;};
const report = [];
for (const [layout, inventory] of Object.entries(inspection)) {
  const rig = inventory.rigs[0];
  const coord = {};
  for (const side of ['l', 'r']) {
    const names = layout === 'knife'
      ? (side === 'l' ? ['L_wrist_02', 'L_middle1_011', 'L_point1_07'] : ['R_wrist_026', 'R_middle1_035', 'R_point1_031'])
      : [`hand_${side}`, `middle_01_${side}`, `index_01_${side}`];
    const [w, m, i] = names.map(n => rig.bones.find(b => b.name === n)?.head);
    if (!w || !m || !i) throw new Error(`referencial ausente ${layout} ${side}`);
    const length = Math.hypot(...sub(m, w)), y = normalize(sub(m, w));
    const z = normalize(cross(y, sub(i, m))), x = normalize(cross(y, z));
    coord[side] = p => ({ x: dot(sub(p, w), x) / length, y: dot(sub(p, w), y) / length, z: dot(sub(p, w), z) / length });
  }
  for (const mesh of inventory.meshes.filter(m => m.hand)) {
    const geo = JSON.parse(await fs.readFile(path.join(root, `artifacts/viewmodels/astra-series/hand-continuity/${layout}-${mesh.name}.json`)));
    const role = layout === 'knife' ? 'combined' : /Cloth/.test(mesh.materials[0]) ? 'cloth' : /Glove/.test(mesh.materials[0]) ? 'glove' : 'skin';
    // Campos interpolados no UV real: posição da mão, peso dos dedos distais e manga.
    const attr = geo.vertices.map(v => {
      const best = v.weights.reduce((a, b) => b[1] > (a?.[1] || 0) ? b : a, null)?.[0] || '';
      const side = /^(L_)|_l$/.test(best) ? 'l' : 'r';
      const c = coord[side](v.p);
      const tip = v.weights.filter(([b]) => layout === 'knife'
        ? /(?:point|middle|ring|pink|thumb)[23]_/.test(b)
        : /(?:index|middle|ring|pinky|thumb)_0[23]_/.test(b)).reduce((s, [, w]) => s + w, 0);
      return [c.x, c.y, c.z, tip];
    });
    const fields = new Float32Array(size * size * 4), covered = new Uint8Array(size * size);
    for (const face of geo.faces) {
      const p = face.uv.map(([u,v]) => [u * size, (1-v)*size]);
      const den = (p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);
      if (Math.abs(den)<1e-9) continue;
      const x0=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0])))), x1=Math.min(size-1,Math.ceil(Math.max(...p.map(v=>v[0]))));
      const y0=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))), y1=Math.min(size-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const a=((p[1][1]-p[2][1])*(x+.5-p[2][0])+(p[2][0]-p[1][0])*(y+.5-p[2][1]))/den;
        const b=((p[2][1]-p[0][1])*(x+.5-p[2][0])+(p[0][0]-p[2][0])*(y+.5-p[2][1]))/den, c=1-a-b;
        if(Math.min(a,b,c)<-1e-6)continue;
        const ix=y*size+x;covered[ix]=1;
        for(let j=0;j<4;j++)fields[ix*4+j]=attr[face.vertices[0]][j]*a+attr[face.vertices[1]][j]*b+attr[face.vertices[2]][j]*c;
      }
    }
    // Dilatação evita costuras de mipmap nas bordas das ilhas, sem alterar UVs.
    for(let pass=0;pass<8;pass++){
      const next=covered.slice();
      for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
        const ix=y*size+x;if(covered[ix])continue;
        const from=[ix-1,ix+1,ix-size,ix+size].find(n=>covered[n]);if(from===undefined)continue;
        next[ix]=1;for(let j=0;j<4;j++)fields[ix*4+j]=fields[from*4+j];
      }
      covered.set(next);
    }
    await fs.mkdir(path.join(output,layout),{recursive:true});
    for(const style of styles){
      const glove=parse(style.glove),sleeve=parse(style.sleeve),accent=parse(style.accent);
      const pixels=Buffer.alloc(size*size*3);
      const heights=Buffer.alloc(size*size);
      for(let ix=0;ix<size*size;ix++){
        const [x,y,z,tip]=fields.subarray(ix*4,ix*4+4);
        const isSleeve=role==='cloth'||(role==='combined'&&y<-.15);
        const exposed=(role==='skin'&&(style.fingerless||y<-.15))||(style.fingerless&&tip>.48);
        const edge=style.fingerless&&role!=='skin'?gauss(tip-.445,.035):0;
        const cuffSeam=gauss(y+.15,.015);
        const panel=(gauss(x-.23,.012)+gauss(x+.23,.012))*smooth(.05,.2,y)*(1-smooth(.72,.9,y));
        const fold=gauss(y-.08,.16)*(Math.sin(y*65+x*5+z*8)+Math.sin(y*98-x*4))*.5;
        let color=exposed?skin:isSleeve?sleeve:glove;
        const cuff=y>-.38&&y<.06;
        if(!exposed&&style.motif==='camo'){
          const n=Math.sin(x*14+y*9)+Math.cos(y*18-z*13)+Math.sin(z*24+x*11);
          color=n>.8?accent:n<-.9?[43,47,33]:n<-.15?[90,82,56]:glove;
        }
        if(!exposed&&cuff&&style.motif==='checker')color=(Math.floor(x*9)+Math.floor(y*10))%2===0?accent:glove;
        if(!exposed&&style.motif==='star'&&cuff){
          color=sleeve;
          if(inStar(x,(y+.15)*1.4))color=accent;
        }
        // Bainha contínua + costura; transição antialias segue pesos reais dos dedos.
        if(style.fingerless&&role!=='skin'&&tip>.38){
          const t=smooth(.465,.505,tip);
          const hem=glove.map(c=>c*.58);
          color=hem.map((c,i)=>c*(1-t)+skin[i]*t);
        }
        const seam=Math.max(cuffSeam,panel,edge);
        const stitch=seam*Math.pow(Math.max(0,Math.sin(x*120+y*85+z*50)),8);
        const noise=Math.sin(ix*12.9898)*43758.5453%1;
        const weave=(ix%size)%3===0?.99:1;
        const value=exposed&&edge<.1?1:(.97+noise*.025-.18*seam+.10*stitch+fold*.035)*weave;
        for(let c=0;c<3;c++)pixels[ix*3+c]=Math.round(Math.max(0,Math.min(255,color[c]*value)));
        const grain=Math.sin(x*180+z*90)*Math.cos(y*190-z*45);
        heights[ix]=Math.round(Math.max(0,Math.min(255,128+(exposed?0:grain*3+fold*10)+seam*46+stitch*10)));
      }
      const file=path.join(output,layout,`${role}-${style.id}.webp`);
      await sharp(pixels,{raw:{width:size,height:size,channels:3}}).webp({quality:92}).toFile(file);
      const heightFile=file.replace('.webp','-height.webp');
      await sharp(heights,{raw:{width:size,height:size,channels:1}}).webp({quality:95}).toFile(heightFile);
      report.push({layout,role,faction:style.id,file:path.relative(root,file),bytes:(await fs.stat(file)).size});
      report.push({layout,role,faction:style.id,file:path.relative(root,heightFile),bytes:(await fs.stat(heightFile)).size});
    }
  }
}
await fs.writeFile(path.join(root,'artifacts/viewmodels/astra-series/hand-continuity/texture-build.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({textures:report.length,bytes:report.reduce((s,r)=>s+r.bytes,0)}));
