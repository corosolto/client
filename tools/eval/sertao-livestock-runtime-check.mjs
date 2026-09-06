// Chrome real: presença, deformação, percurso físico, orçamento e ciclo de vida.
// LG1 parte do pedido do dono; LG4 cabe na folga RV3 (baseline 49441895).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';
const BASE = process.env.BASE || 'http://localhost:8149';
const OUT = process.env.ARTIFACT_DIR || 'artifacts/sertao-astra/livestock-runtime';
const mut = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const expected = { 'sem-caprinos':'LG1', 'patas-paradas':'LG2', parede:'LG3', sombra:'LG4', 'low-cheio':'LG5', 'reset-ausente':'LG6', 'sem-contato':'LG7', 'dispose-ausente':'LG8', 'rig-nao-descartado':'LG8' };
if (mut && !expected[mut]) throw Error('Mutante desconhecido');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }), headless: true, args: ['--mute-audio'] });
const samples = [], errors = [];
const servedAssets = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const disk = Object.fromEntries(['cabra','galinha','pintinho'].map(name => [name, hash(readFileSync(`public/models/ambient/sertao_${name}.glb`))]));
try {
  for (const quality of ['med', 'low']) {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    const downloads = [];
    page.on('response', response => {
      const match = response.url().match(/\/sertao_(cabra|galinha|pintinho)\.glb/);
      if (match) downloads.push(response.body().then(bytes => servedAssets.push({quality,name:match[1],status:response.status(),sha256:hash(bytes)})));
    });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(quality => localStorage.setItem('awpbr_settings', JSON.stringify({quality})), quality);
    if (mut && !['sem-caprinos','reset-ausente','sombra'].includes(mut)) await page.route('**/js/map_sertao_livestock.js*', async route => {
      const response = await route.fetch(), source = await response.text();
      const replacements = {
        'patas-paradas':['a.mixer.update(dt);','a.mixer.update(0);'],
        parede:['center: [-24, 29]','center: [0, -15.5]'],
        'low-cheio':['if (low && (index === 1 || index === 5)) continue;','/* low removido */'],
        'sem-contato':['mesh.name = \'sertao-contato-criacao\';','mesh.name = \'sertao-contato-criacao\'; mesh.count = 0;'],
        'dispose-ausente':['group.removeFromParent();','/* dispose removido */'],
        'rig-nao-descartado':['a.model.traverse(mesh => mesh.skeleton?.dispose());','/* skeleton dispose removido */'],
      };
      const body = source.replace(...replacements[mut]);
      if (body === source) throw Error('Mutante não aplicado');
      await route.fulfill({response,body});
    });
    if (['reset-ausente','sombra'].includes(mut)) await page.route('**/js/map_velho_oeste.js*', async route => {
      const response=await route.fetch(),source=await response.text(),body=mut==='sombra'
        ? source.replace('if (mesh.isMesh) mesh.castShadow = false;','if (mesh.isMesh) mesh.castShadow = true;')
        : source.replace('livestock.reset();','/* reset removido */');
      if(body===source)throw Error('Mutante não aplicado');
      await route.fulfill({response,body});
    });
    await page.goto(`${BASE}/mapview.html?map=velho_oeste&hud=0&capture=1`);
    await page.waitForFunction(() => window.MAPEVAL?.ready, null, { timeout: 90000 });
    const sample = await page.evaluate(async ({quality,mut}) => {
      const {Vector3,Box3}=await import('/vendor/three.module.js'),{Game}=await import('/js/game.js');
      const w=__gworld,life=w.livestock;
      if(!life)return {quality,missing:true};
      if(mut==='sem-caprinos')for(const a of life.animals.filter(a=>a.type==='goat'))a.root.removeFromParent();
      const probe=Object.create(Game.prototype);probe.world=w;
      const vec=new Vector3(),body=new Vector3();
      const presence=life.animals.map(a=>{
        let meshes=0;a.root.traverse(o=>{if(o.isMesh && o.visible && o.geometry?.attributes.position?.count)meshes++});
        return {type:a.type,meshes,attached:a.root.parent===life.group && life.group.parent===w.root,clips:Object.keys(a.actions)};
      });
      const shape=a=>{
        a.root.updateMatrixWorld(true);
        const points=[];a.model.traverse(mesh=>{
          if(!mesh.isMesh)return;
          mesh.skeleton?.update();
          for(let i=0;i<mesh.geometry.attributes.position.count;i+=17){mesh.getVertexPosition(i,vec);points.push(vec.x,vec.y,vec.z)}
        });return points;
      };
      const poses=life.animals.map(a=>[]),grounds=life.animals.map(()=>({min:Infinity,max:-Infinity}));
      life.reset();const initial=life.animals.map(a=>[...a.root.position, ...shape(a)]);
      let blocked=0,maxPush=0,observed=0,minObjective=Infinity;
      for(let frame=0;frame<2400;frame++){
        w.update(1/60,frame/60);
        for(const [i,a] of life.animals.entries()){
          body.copy(a.root.position);probe._collide(body,a.type==='goat'?.65:a.type==='hen'?.25:.09);
          const push=body.distanceTo(a.root.position);maxPush=Math.max(maxPush,push);if(push>.001)blocked++;observed++;
          for(const p of w.ctfPoints)minObjective=Math.min(minObjective,Math.hypot(a.root.position.x-p.x,a.root.position.z-p.z));
          if(frame%37===0){
            const vertices=shape(a);
            if(frame>=480 && frame<960)poses[i].push(vertices);
            const box=new Box3().setFromObject(a.model,true);
            grounds[i].min=Math.min(grounds[i].min,box.min.y);grounds[i].max=Math.max(grounds[i].max,box.min.y);
          }
        }
      }
      const deformation=poses.map(frames=>{
        const base=frames[0]||[];let max=0;
        for(const frame of frames)for(let i=0;i<base.length;i+=3)max=Math.max(max,Math.hypot(base[i]-frame[i],base[i+1]-frame[i+1],base[i+2]-frame[i+2]));
        return max;
      });
      const distance=life.animals.map(a=>a.distance),report=life.report();
      w.ambience.reset();const reset=life.animals.every((a,i)=>[...a.root.position,...shape(a)].every((n,j)=>Math.abs(n-initial[i][j])<1e-5));
      const physical=new Set(w.occluders);let solid=0;life.group.traverse(o=>{if(physical.has(o))solid++});
      return {quality,presence,deformation,grounds,distance,blocked,maxPush,observed,minObjective,report,reset,solid};
    },{quality,mut});
    samples.push(sample);
    const contactImages=[];
    for(const visible of [false,true]){
      await page.evaluate(visible=>{
        const contact=__gworld.livestock?.group.getObjectByName('sertao-contato-criacao');
        if(contact)contact.visible=visible;
        MAPEVAL.cam.fov=70;MAPEVAL.cam.updateProjectionMatrix();MAPEVAL.view([18,1.62,30],[15,.3,26]);
      },visible);
      contactImages.push(await sharp(await page.screenshot()).removeAlpha().raw().toBuffer());
    }
    sample.contactDarkenedPixels=0;
    for(let i=0;i<contactImages[0].length;i+=3){
      const before=contactImages[0][i]+contactImages[0][i+1]+contactImages[0][i+2];
      const after=contactImages[1][i]+contactImages[1][i+1]+contactImages[1][i+2];
      if(after<before)sample.contactDarkenedPixels++;
    }
    if(!mut && quality==='med'){
      for(const [name,from,to] of [
        ['cabras',[-18,1.62,32],[-23,.6,28]],['familia',[18,1.62,30],[15,.3,26]],
        ['cabras-contexto',[-17,1.62,35],[-23,1,26]],['familia-contexto',[18,1.62,33],[15,1,26]],
      ]){
        await page.evaluate(({from,to})=>{MAPEVAL.cam.fov=70;MAPEVAL.cam.updateProjectionMatrix();MAPEVAL.view(from,to)},{from,to});
        await page.screenshot({path:`${OUT}/${name}.png`});
      }
      const thumbs=[];
      for(let i=0;i<8;i++){
        await page.evaluate(i=>{if(i===0){__gworld.ambience.reset();for(let f=0;f<480;f++)__gworld.update(1/60,f/60)}for(let f=0;f<20;f++)__gworld.update(1/60,f/60);MAPEVAL.view([-18,1.62,32],[-23,.6,28]);},i);
        const png=await page.screenshot();
        thumbs.push({input:await sharp(png).resize(576,384).png().toBuffer(),left:(i%4)*576,top:Math.floor(i/4)*384});
      }
      await sharp({create:{width:2304,height:768,channels:3,background:'#222'}}).composite(thumbs).png().toFile(`${OUT}/cabras-movimento.png`);
    }
    sample.disposal = await page.evaluate(() => {
      const life=__gworld.livestock;if(!life)return null;
      const contact=life.group.getObjectByName('sertao-contato-criacao');
      const bones=new Set(),cachedMaps=new Set();
      life.group.traverse(mesh=>{if(mesh.skeleton?.boneTexture)bones.add(mesh.skeleton.boneTexture);if(mesh.material?.map && mesh!==contact)cachedMaps.add(mesh.material.map)});
      let releases=0,rigReleases=0,cacheReleases=0;
      for(const resource of [contact?.geometry,contact?.material,contact?.material.map])resource?.addEventListener('dispose',()=>releases++);
      for(const texture of bones)texture.addEventListener('dispose',()=>rigReleases++);
      for(const texture of cachedMaps)texture.addEventListener('dispose',()=>cacheReleases++);
      const before=life.animals.map(a=>a.root.position.clone());
      life.dispose();life.dispose();life.update(.05);life.reset();
      return { detached:life.group.parent===null,releases,bones:bones.size,rigReleases,cacheReleases,
        positionsRetained:life.animals.every((a,i)=>a.root.position.equals(before[i])) };
    });
    await Promise.all(downloads); await page.close();
  }
}finally{await browser.close()}
const [normal,low]=samples;
const checks={
  LG1: normal?.presence?.length===6 && normal.presence.filter(a=>a.type==='goat').length===2
    && normal.presence.filter(a=>a.type==='hen').length===1 && normal.presence.filter(a=>a.type==='chick').length===3
    && normal.presence.every(a=>a.meshes>0 && a.attached && a.clips.includes('Idle') && a.clips.includes('Walk'))
    && servedAssets.length===6 && servedAssets.every(a=>a.status===200 && a.sha256===disk[a.name]),
  LG2: !!normal?.deformation?.length && normal.deformation.every(n=>n>.001)
    && normal.grounds.every(g=>g.min>=-.015 && g.max<=.03),
  LG3: normal?.observed===14400 && normal.blocked===0 && normal.distance.every(d=>d>2)
    && normal.minObjective>3 && normal.solid===0,
  // Seis rigs + um único passe instanciado de contato. O teto global RV3 permanece intacto.
  LG4: samples.every(s=>s.report && s.report.modelMeshes<=6 && s.report.meshes<=7 && s.report.triangles<=26000 && s.report.casters===0),
  LG5: low?.presence?.length===4 && low.presence.filter(a=>a.type==='goat').length===1
    && low.presence.filter(a=>a.type==='hen').length===1 && low.presence.filter(a=>a.type==='chick').length===2,
  LG6: samples.every(s=>s.reset) && errors.length===0,
  LG7: samples.every(s=>s.report?.contactPasses===1 && s.report.contactInstances===s.report.animals && s.contactDarkenedPixels>0),
  LG8: samples.every(s=>s.disposal?.detached && s.disposal.releases===3 && s.disposal.bones>0
    && s.disposal.rigReleases===s.disposal.bones && s.disposal.cacheReleases===0 && s.disposal.positionsRetained),
};
const failed=Object.keys(checks).filter(k=>!checks[k]);
writeFileSync(`${OUT}/report${mut?`-${mut}`:''}.json`,JSON.stringify({checks,samples,servedAssets,errors,failed},null,2));
console.log(JSON.stringify({checks,failed,samples,errors,evidence:OUT}));
process.exitCode=mut?+(failed.length!==1||failed[0]!==expected[mut]):+!!failed.length;
