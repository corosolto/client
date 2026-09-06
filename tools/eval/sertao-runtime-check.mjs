/* Sertão em WebGL REAL, 3:2. Node/proxy não prova presença do GLB nem varanda.
   Orçamento do passe mapview: baseline 49441895, sete câmeras em
   artifacts/sertao-astra/before/capture.json: máximo503 calls/320181tris/86textures.
   Teto calls preservado; tris/texturas +15% conforme folga documentada em cena-tetos.
   Não compara estes números ao composer inteiro, nem declara aprovação estética.
   Mutantes alteram corpo real/colisor real/função de batching, não o resultado.
   BASE=http://localhost:8145 node tools/eval/sertao-runtime-check.mjs [--mutante=...]
*/
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const BASE = process.env.BASE || 'http://localhost:8123';
const MUT = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const EXPECTED = { 'sem-corpo': 'RV1', 'sem-glb': 'RV1', 'varanda-fantasma': 'RV2', 'sem-instancing': 'RV3', 'spawn-exposto': 'RV5', 'emenda-solo': 'RV6', 'venda-madeira': 'RV7', 'trama-repetida': 'RV8', 'solo-chapado': 'RV9', 'laterais-cegas': 'RV10', 'telhado-liso': 'RV10', 'solo-ondulado': 'RV9' };
if (MUT && !EXPECTED[MUT]) throw Error('Mutante desconhecido');
const OUT = process.env.ARTIFACT_DIR || `artifacts/sertao-astra/runtime${MUT ? `-${MUT}` : ''}`;
mkdirSync(OUT, { recursive: true });
const { chromium } = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`).href);
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
try {
 const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 if (MUT === 'sem-instancing') await page.route('**/js/map_sertao_landscape.js*', async route => {
   const response = await route.fetch(), source = await response.text();
   const body = source.replace('export function batchSertaoDecor(root, occluders) {', 'export function batchSertaoDecor(root, occluders) { return;');
   if (body === source) throw Error('Mutante não aplicado');
   await route.fulfill({ response, body });
 });
 if (MUT === 'solo-ondulado') await page.route('**/js/map_velho_oeste.js*', async route => {
   const response=await route.fetch(), source=await response.text();
   const body=source.replace('const soilMap = GLB_ON ? TX.sand : solo; soilMap.repeat.set(400, 400);', 'const soilMap = solo; soilMap.repeat.set(180, 180);');
   if(body===source) throw Error('Mutante solo-ondulado não aplicado');
   await route.fulfill({response,body});
 });
 if (MUT === 'sem-glb') await page.route('**/models/props/casa_pedra.glb*', route=>route.abort());
 await page.goto(`${BASE}/mapview.html?map=velho_oeste&hud=0&capture=1`);
 await page.waitForFunction(() => window.MAPEVAL?.ready && window.__gworld?.ambience?.ready, null, { timeout: 120000 });
 const spatial = await page.evaluate(async mutant => {
   const THREE = await import('/vendor/three.module.js'), { Game } = await import('/js/game.js');
   const w = __gworld, houses = []; w.root.traverse(o => { if (o.name.startsWith('sertao-casa-')) houses.push(o); });
   if (mutant === 'sem-corpo') houses[9].clear();
   if(mutant === 'laterais-cegas') w.root.getObjectByName('sertao-acabamento-taipa-2-0')?.removeFromParent();
   if(mutant==='telhado-liso')w.root.getObjectByName('sertao-telhas-cobertura')?.removeFromParent();
   const lateralShutters = houses.filter(h=>h.name.includes('paupique')).every(h=>{
     const panels=[];h.traverse(o=>{if(/^sertao-acabamento-taipa-.*-0$/.test(o.name))panels.push(o);});
     const roof=h.getObjectByName('sertao-telhas-cobertura');
     let openings=0;const matrix=new THREE.Matrix4();
     if(panels[0]?.isInstancedMesh)for(let i=0;i<panels[0].count;i++){panels[0].getMatrixAt(i,matrix);if(matrix.elements[13]>1)openings++;}
     return roof?.isInstancedMesh && roof.count>=28 && roof.geometry.index.count>0 && panels.length===1 && panels[0].isInstancedMesh && openings===6 && panels[0].geometry.index.count>0;
   });
   const bodies = houses.map(h => { let meshes = 0; h.traverse(o => { if (o.isMesh) meshes++; }); return { name: h.name, meshes, source:h.userData.sertaoSource, propId:h.userData.sertaoPropId };  });
   const probe = Object.create(Game.prototype); probe.world = w;
   const porches = houses.filter(h => h.name.includes('paupique')).map(h => {
     const pos = h.localToWorld(new THREE.Vector3(0, 0, 4.5));
     if (mutant === 'varanda-fantasma') w.colliders.push({ minX: pos.x - .6, maxX: pos.x + .6, minZ: pos.z - .6, maxZ: pos.z + .6, minY: 0, maxY: 2.6 });
     const body = pos.clone(); probe._collide(body, .38);
     return { name: h.name, pushed: body.distanceTo(pos) };
   });
   if (mutant === 'spawn-exposto') {
     const guards = []; w.root.traverse(o => { if (o.name.startsWith('abrigo-spawn-')) guards.push(o); });
     if (!guards.length) throw Error('Mutante não aplicado: abrigo ausente');
     for (const g of guards) { g.parent.remove(g); w.occluders = w.occluders.filter(o => o !== g); }
   }
   w.root.updateMatrixWorld(true);
   const direct = [], ray = new THREE.Raycaster();
   for (const [i,a] of w.spawns.E.entries()) for (const [j,b] of w.spawns.B.entries()) {
     const from = new THREE.Vector3(a.x, 1.62, a.z), to = new THREE.Vector3(b.x, 1.62, b.z), distance = from.distanceTo(to);
     ray.set(from, to.clone().sub(from).normalize()); ray.far = distance;
     if (!ray.intersectObjects(w.occluders, true).length) direct.push([i,j]);
   }
   const soil = w.root.getObjectByName('sertao-solo'), terrain = w.root.getObjectByName('sertao-horizonte');
   if (mutant === 'solo-chapado') { w.root.getObjectByName('sertao-marcas-chao')?.removeFromParent(); soil.material.map = null; soil.material.bumpMap = null; soil.material.needsUpdate = true; }
   if (mutant === 'emenda-solo') { terrain.material = terrain.material.clone(); terrain.material.color.set(0xff0000); }
   const seamlessSoil = !!soil && !!terrain && soil.material.map === terrain.material.map
     && soil.material.color.equals(terrain.material.color) && soil.material.roughness === terrain.material.roughness;
   const facades = [0, 1].map(i => w.root.getObjectByName(`parede-casa-${i}`));
   if (mutant === 'venda-madeira' && facades[0]) { facades[0].material = facades[0].material.clone(); facades[0].material.map = null; }
   const plasterFacades = facades.every(m => m?.material?.map?.name?.startsWith('oeste-adobe'));
   const plaster = w.root.getObjectByName('parede-casa-2')?.material?.map;
   if (mutant === 'trama-repetida' && plaster?.image?.data) {
     const {data,width,height} = plaster.image;
     for (let y=0;y<height;y++) for(let x=0;x<width;x++) if(x%17<2 || y%13<2) data[(y*width+x)*4]=128;
     plaster.needsUpdate = true;
   }
   const reds = plaster?.image?.data && Array.from(plaster.image.data).filter((_, i) => i % 4 === 0);
   // O tile anterior alternava 128 (trama) e 220–230 (reboco), carimbado 2×2.
   // O dano agora deve ser localizado; o tile de reboco não leva a trama escura.
   const plainPlaster = !!reds?.length && Math.min(...reds) > (128 + 220) / 2;
   return { bodies, lateralShutters, porches, direct, seamlessSoil, plasterFacades, plainPlaster, gpu: MAPEVAL.renderer.getContext().getParameter(MAPEVAL.renderer.getContext().getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) };
 }, MUT);
 const shots = [['praca',[0,1.62,16],[0,3,-15]],['venda',[-5,1.62,-35],[-10,2,-25]],['poco',[-29,1.62,-21],[-21,2,-13]],['forro',[-13,1.62,15],[-22,2,20]],['leste',[27,1.62,-33],[20,2,-10]],['sul',[0,1.62,38],[1,2,15]],['aerea',[55,65,65],[0,0,0]]];
 const frames = []; let groundStd = null, groundHighRms = null;
 for (const [name, from, look] of shots) {
   const measured = await page.evaluate(async ({from, look}) => {
     MAPEVAL.cam.fov = 70; MAPEVAL.cam.updateProjectionMatrix(); MAPEVAL.view(from, look);
     await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
     return { ...MAPEVAL.renderer.info.render, ...MAPEVAL.renderer.info.memory };
   }, {from, look});
   if (name === 'praca') {
     const {default: sharp} = await import('sharp');
     const png = await page.screenshot();
     const roi = {left:560,top:875,width:900,height:135};
     const hi = await sharp(png).extract(roi).greyscale().raw().toBuffer();
     const lo = await sharp(png).extract(roi).blur(3).greyscale().raw().toBuffer();
     groundHighRms = Math.sqrt(hi.reduce((sum,v,i)=>sum+(v-lo[i])**2,0)/hi.length);
     const pixels = await sharp(png).extract({left:560,top:875,width:900,height:135}).removeAlpha().raw().toBuffer();
     const values = []; for(let i=0;i<pixels.length;i+=3) values.push(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]);
     const avg=values.reduce((a,b)=>a+b,0)/values.length;
     groundStd = Math.sqrt(values.reduce((a,b)=>a+(b-avg)**2,0)/values.length);
   }
   if (!MUT) await page.screenshot({path: `${OUT}/${name}.png`});
   frames.push({name, ...measured});
 }
 const checks = {
   RV1: spatial.bodies.length === 10 && spatial.bodies.every(h => h.meshes > 0 && h.source === (/sertao-casa-(paupique|platibanda)-/.test(h.name) ? 'authored' : 'glb')),
   RV2: spatial.porches.length === 5 && spatial.porches.every(h => h.pushed < 1e-6),
   RV3: frames.every(f => f.calls <= 503 && f.triangles <= Math.ceil(320181 * 1.15) && f.textures <= Math.ceil(86 * 1.15)),
   RV4: errors.length === 0,
   RV5: spatial.direct.length === 0,
   RV6: spatial.seamlessSoil,
   RV7: spatial.plasterFacades,
   RV8: spatial.plainPlaster,
   // Grão do chão: RMS residual após blur3, mesma ROI. Baseline6.31;
   // polish3/4 rejeitadas visualmente1.59/1.55. Piso metade do baseline,
   // não derivado do candidato. Impede manchas suaves passarem só pelo contraste.
   RV9: groundStd > 2.21 * 1.15 && groundHighRms >= 6.31 / 2,
   RV10: spatial.lateralShutters,
 };
 const report = { checks, spatial, frames, groundStd, groundHighRms, errors, mutation: MUT || null };
 writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
 const failed = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
 console.log(JSON.stringify({checks, groundStd, groundHighRms, maxCalls: Math.max(...frames.map(f=>f.calls)), maxTris: Math.max(...frames.map(f=>f.triangles)), evidence:OUT, failed}));
 if (MUT) { const killed = failed.length === 1 && failed[0] === EXPECTED[MUT]; console.log(`Mutante ${MUT}: ${killed ? 'MORDIDO isolado' : 'INCONCLUSIVO/SOBREVIVEU'}`); process.exitCode = killed ? 0 : 1; }
 else process.exitCode = failed.length ? 1 : 0;
} finally { await browser.close(); }
