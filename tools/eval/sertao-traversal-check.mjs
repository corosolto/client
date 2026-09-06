/* Circulação no Game real: três caminhos SP4, corpo e _updatePlayer originais.
   Ensaio determinístico 60 Hz, sem combate; não é benchmark de FPS ou de bots.
   Mutante barreira atravessa o mapa e precisa impedir a chegada (TR1 vermelho).
   A expectativa de rotas vem da régua espacial independente, antes da mutação. */
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const mutant = process.argv.includes('--mutante=barreira');
const OUT = process.env.ARTIFACT_DIR || `artifacts/sertao-astra/traversal${mutant ? '-barreira' : ''}`;
const BASE = process.env.BASE || 'http://localhost:8145';
const spatial = JSON.parse(execFileSync(process.execPath, ['tools/eval/sertao-spatial-check.mjs', '--json'], {encoding:'utf8',maxBuffer:4e6}));
if (!spatial.baseline.SP4.pass) throw Error('Pré-condição: SP4 vermelho');
mkdirSync(OUT, {recursive:true});
const {chromium} = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`).href);
const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
try {
 const page = await browser.newPage({viewport:{width:1536,height:1024}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('awpbr_settings',JSON.stringify({quality:'med',bots:4})));
 await page.goto(`${BASE}/?debug=1&map=velho_oeste&auto=B,sertanejo`);
 await page.waitForFunction(()=>window.__game?.state==='live',null,{timeout:120000});
 const routes=[];
 for (const [name, ids] of Object.entries(spatial.baseline.SP4.paths)) {
  const report = await page.evaluate(async ({name,ids,mutant})=>{
   const g=__game,w=g.world,p=g.player,nodes=ids.map(i=>w.waypoints.nodes[i]);
   if(nodes.some(n=>!n)) throw Error('Grafo browser diverge do contrato Node');
   g.paused=true; p.alive=true;p.hp=100;p.vel.set(0,0,0);p.mantle=null;
   p.pos.set(nodes[0].x,g._spawnY(nodes[0].x,nodes[0].z),nodes[0].z);p.grounded=true;
   g.keys={KeyW:true};g.player.pitch=0;
   if(mutant && !w.colliders.some(c=>c.tag==='mutante-rota')) w.colliders.push({minX:-34,maxX:34,minZ:-.5,maxZ:.5,minY:0,maxY:4,tag:'mutante-rota'});
   let index=1, distance=0,stuck=0,last=p.pos.clone(),steps=0;
   const trajectory=[];
   // 90 s simulados: mais de duas vezes o necessário aos caminhos de 100–140 m.
   for(;steps<5400 && index<nodes.length;steps++){
    const target=nodes[index],dx=target.x-p.pos.x,dz=target.z-p.pos.z;
    if(Math.hypot(dx,dz)<.38){index++;continue;}
    p.yaw=Math.atan2(-dx,-dz);g.time+=1/60;g._updatePlayer(1/60);
    const moved=p.pos.distanceTo(last);distance+=moved;stuck=moved<.001?stuck+1:0;last.copy(p.pos);
    if(steps%60===0)trajectory.push({t:steps/60,x:p.pos.x,y:p.pos.y,z:p.pos.z,index});
    if(stuck>180)break;
    if(steps%120===0) await new Promise(requestAnimationFrame);
   }
   g.keys.KeyW=false;g.renderer.render(g.scene,g.camera);
   const target=nodes.at(-1),remaining=Math.hypot(target.x-p.pos.x,target.z-p.pos.z);
   return {name,completed:index===nodes.length,remaining,distance,simulatedSeconds:steps/60,index,total:nodes.length,trajectory};
  },{name,ids,mutant});
  routes.push(report); await page.screenshot({path:`${OUT}/${name}.png`});
 }
 const checks={TR1:routes.every(r=>r.completed && r.remaining<.5),TR2:errors.length===0};
 writeFileSync(`${OUT}/report.json`,JSON.stringify({mode:'Game._updatePlayer determinístico, sem combate',checks,routes,errors,mutant},null,2));
 console.log(JSON.stringify({checks,routes:routes.map(({trajectory,...r})=>r),errors}));
 process.exitCode=mutant ? (!checks.TR1 && checks.TR2 ? 0:1) : Object.values(checks).every(Boolean)?0:1;
}finally{await browser.close();}
