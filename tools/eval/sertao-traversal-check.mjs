/* Circulação no Game real: três caminhos SP4, corpo e _updatePlayer originais.
   Ensaio determinístico 60 Hz, sem combate; não é benchmark de FPS ou de bots.
   Mutante barreira atravessa o mapa e precisa impedir a chegada (TR1 vermelho).
   A expectativa de rotas vem da régua espacial independente, antes da mutação. */
import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const mutant = process.argv.find(a=>a.startsWith('--mutante='))?.slice(10) || '';
if (mutant && !['barreira','porta'].includes(mutant)) throw Error('Mutante desconhecido');
if (mutant === 'porta' && !process.argv.includes('--offline')) throw Error('Mutante porta exige --offline');
const OUT = process.env.ARTIFACT_DIR || `artifacts/sertao-astra/traversal${mutant ? `-${mutant}` : ''}`;
const BASE = process.env.BASE || 'http://localhost:8145';
const spatial = JSON.parse(execFileSync(process.execPath, ['tools/eval/sertao-spatial-check.mjs', '--json'], {encoding:'utf8',maxBuffer:4e6}));
if (!spatial.baseline.SP4.pass) throw Error('Pré-condição: SP4 vermelho');
mkdirSync(OUT, {recursive:true});
if (process.argv.includes('--offline')) {
 const {bootGame,initTextures}=await import('./harness.mjs');
 const game=bootGame('velho_oeste',{textures:await initTextures(),bots:2});
 game.state='live';game.paused=false;
 if(mutant === 'barreira') game.world.colliders.push({minX:-34,maxX:34,minZ:-.5,maxZ:.5,minY:0,maxY:4,tag:'mutante-rota'});
 if(mutant === 'porta') game.world.colliders.push({minX:-12.5,maxX:-10.5,minY:0,maxY:3,minZ:11.6,maxZ:12,tag:'mutante-porta'});
 const p=game.player, routes=[];
 const paths=Object.entries(spatial.baseline.SP4.paths).map(([name,ids])=>[name,ids.map(i=>game.world.waypoints.nodes[i])]);
 for(const house of game.world.interiorHouses){
  const {x,z}=house.position;
  paths.push([house.name,[{x,z:z-4.8},{x,z},{x,z:z+2.5},{x,z},{x:x-2.9,z:z+.1},{x,z},{x:x+2.9,z:z+.1},{x,z},{x,z:z-4.8}]]);
 }
 for(const [name,nodes] of paths){
  p.pos.set(nodes[0].x,game._spawnY(nodes[0].x,nodes[0].z),nodes[0].z);p.vel.set(0,0,0);
  p.alive=true;p.hp=100;p.grounded=true;p.mantle=null;p.pitch=0;game.keys={KeyW:true};
  let index=1,steps=0,stuck=0,last=p.pos.clone();const trajectory=[];
  for(;steps<5400 && index<nodes.length;steps++){
   const target=nodes[index],dx=target.x-p.pos.x,dz=target.z-p.pos.z;
   if(Math.hypot(dx,dz)<.38){index++;continue;}
   p.yaw=Math.atan2(-dx,-dz);game.time+=1/60;game._updatePlayer(1/60);
   const moved=p.pos.distanceTo(last);stuck=moved<.001?stuck+1:0;last.copy(p.pos);
   if(steps%60===0)trajectory.push({t:steps/60,x:p.pos.x,y:p.pos.y,z:p.pos.z,index});
   if(stuck>180)break;
  }
  const target=nodes.at(-1);
  routes.push({name,completed:index===nodes.length,remaining:Math.hypot(target.x-p.pos.x,target.z-p.pos.z),simulatedSeconds:steps/60,index,total:nodes.length,trajectory});
 }
 const checks={TR1:routes.slice(0,3).every(r=>r.completed&&r.remaining<.5),TR3:routes.length===5&&routes.slice(3).every(r=>r.completed&&r.remaining<.5)};
 writeFileSync(`${OUT}/report.json`,JSON.stringify({mode:'Node Game._updatePlayer 60Hz; DOM stub; sem browser, GLBs ou render',checks,routes,mutant},null,2));
 console.log(JSON.stringify({checks,routes:routes.map(({trajectory,...r})=>r)}));game.dispose();
  const passed=mutant === 'porta' ? !checks.TR3 : mutant === 'barreira' ? !checks.TR1&&checks.TR3 : Object.values(checks).every(Boolean);
 process.exit(passed?0:1);
}
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
