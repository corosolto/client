import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.OUT || 'artifacts/escadao-visual/r5/browser';
const base = process.env.BASE || 'http://127.0.0.1:8148';
mkdirSync(out,{recursive:true});
const sources = Object.fromEntries(['public/js/map_escadao.js','public/js/map_escadao_home.js','public/js/map_escadao_details.js','public/js/ambientlife.js','public/js/game.js',...['cat','varanda','eletrica'].map(id=>`public/models/props/escadao_${id}_r4.glb`)].map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
const receipt = {sources,errors:[],photos:[],mutation:process.argv.includes('--mutante=gato-antigo')};
try {
  const page = await browser.newPage({viewport:{width:1536,height:1024},deviceScaleFactor:1});
  page.on('pageerror',e=>receipt.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)receipt.errors.push(`${r.status()} ${r.url()}`);});
  if(receipt.mutation)await page.route('**/js/map_escadao.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replaceAll('escadaoCat','cat')});});
  await page.addInitScript(()=>localStorage.setItem('awpbr_settings',JSON.stringify({quality:'high',vol:0,speech:false})));
  await page.goto(`${base}/?debug=1&map=escadao&auto=B,sertanejo`,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>window.__game?.state==='live',null,{timeout:240000});
  receipt.fixture = await page.evaluate(()=>{
    const g=window.__game;g.update=()=>{};g.el.banner.classList.add('hidden');g.world.ambience.reset();
    for(const b of g.bots){b.mesh.group.visible=false;if(b._mark?.halo)b._mark.halo.visible=false;}
    for(const p of g.ctfPts||[])for(const m of [p.ring,p.zone,p.pole,p.flag])if(m)m.visible=false;
    g.player.alive=true;g.player.hp=100;g.player.grounded=true;g.player.vel.set(0,0,0);g.player.mantle=null;
    g._updateBot=()=>{};g._checkCtfAlvo=()=>{};g._checkPace=()=>{};g.roundTime=1e6;g.touchMove=null;g.mouseDown0=false;
    return {state:g.state,fauna:g.world.ambience.report(),details:g.world.root.children.filter(o=>o.userData.escadaoDomestic).map(o=>o.name)};
  });
  assert.equal(receipt.fixture.details.length,2,'Dois detalhes Mint carregados');
  const views=[
    {id:'entrada-oeste',pos:[-6,0,13],look:[-6,1.62,7]},
    {id:'sob-patamar',pos:[-6,0,8.5],look:[6,1.62,8.5]},
    {id:'saida-leste',pos:[8,0,5],look:[8,1.62,10]},
    {id:'lateral-leste',pos:[16,0,1],look:[15.7,1.62,-8]},
    {id:'lateral-oeste',pos:[-16,0,1],look:[-16,1.62,-8]},
    {id:'horizonte-norte',pos:[0,7.56,-32],look:[0,17,-120]},
    {id:'horizonte-sul',pos:[0,7.56,-9],look:[0,8,75]},
    {id:'rua',pos:[0,0,25],look:[3,4,15]},
  ];
  for(const view of views){
    const pose=await page.evaluate(view=>{
      const g=window.__game,pos=view.pos;g.player.pos.fromArray(pos);const requested=g.player.pos.clone();g._collide(g.player.pos,.38);
      g.camera.position.set(pos[0],pos[1]+1.62,pos[2]);g.camera.fov=70;g.camera.updateProjectionMatrix();g.camera.lookAt(...view.look);g.scene.updateMatrixWorld(true);
      const before=g.renderer.info.render.frame;g.renderer.render(g.scene,g.camera);
      if(!g.renderer.__postPatched&&g.vmScene){g.renderer.autoClear=false;g.renderer.clearDepth();g.renderer.render(g.vmScene,g.vmCamera);g.renderer.autoClear=true;}
      return {ground:g.world.groundHeightAt(pos[0],pos[2],pos[1]),collisionDrift:g.player.pos.distanceTo(requested),rendered:g.renderer.info.render.frame>before,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};
    },view);
    assert.ok(pose.rendered);await page.screenshot({path:`${out}/${view.id}.png`});receipt.photos.push({...view,...pose});
  }
  receipt.status='captured';console.log(`R5: ${views.length} capturas reais`);
} catch(error){receipt.status='failed';receipt.error=error.stack;console.error(error.message);process.exitCode=1;}
finally{writeFileSync(`${out}/receipt.json`,JSON.stringify(receipt,null,2));await browser.close();}
