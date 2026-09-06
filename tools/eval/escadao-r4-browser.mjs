import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.OUT || 'artifacts/escadao-visual/r4/browser';
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
  receipt.pests=await page.evaluate(()=>{
    const g=window.__game,amb=g.world.ambience;amb.reset();
    const animals=['rat','cockroach'].map(type=>amb.animals.find(a=>a.type===type));
    const starts=animals.map(a=>a.root.position.clone());
    for(let i=0;i<120;i++)amb.update(1/60);
    return animals.map((a,i)=>({type:a.type,count:amb.animals.filter(b=>b.type===a.type).length,source:a.source,
      travel:a.root.position.distanceTo(starts[i]),clear:g._retaAndavel(a.origin.x,a.origin.z,a.to.x,a.to.z,.38,.3),
      floorError:Math.abs(a.root.position.y-g.world.groundHeightAt(a.root.position.x,a.root.position.z)),nonCollider:a.root.userData.nonCollider}));
  });
  for(const animal of receipt.pests){assert.ok(animal.count>=3);assert.equal(animal.source,'gltf');assert.ok(animal.travel>.1);assert.ok(animal.clear);assert.ok(animal.floorError<.01);assert.ok(animal.nonCollider);}
  receipt.home=await page.evaluate(()=>{
    const g=window.__game,p=g.player,trace=[];p.pos.set(9.2,0,23.2);p.crouchF=0;p.scoped=false;p.jumpBufferedUntil=0;p.coyoteUntil=0;
    for(const [x,z] of [[9.2,20],[9.2,17.5],[9.2,16],[7,16],[6.15,15.5],[7,16],[9.2,16],[9.2,20],[9.2,23.2]]){
      let frames=0;
      while(Math.hypot(x-p.pos.x,z-p.pos.z)>.15 && frames++<300){p.yaw=Math.atan2(p.pos.x-x,p.pos.z-z);p.pitch=0;g.keys={KeyW:true};g.time+=1/60;g._updatePlayer(1/60);trace.push(p.pos.toArray());}
      if(frames>=300)throw Error(`Corpo travou: ${p.pos.toArray()} rumo ${x},${z}`);
    }
    g.keys={};return {trace,final:p.pos.toArray()};
  });
  assert.ok(receipt.home.trace.every(v=>v.every(Number.isFinite)));
  receipt.windowShot=await page.evaluate(async()=>{
    const THREE=await import('three'),g=window.__game;
    const from=new THREE.Vector3(6.15,4.37,15.5),target=new THREE.Vector3(6.15,g.world.groundHeightAt(6.15,9)+1.5,9);
    const saved=g.bots;g.bots=[];
    try {const end=g._fireHitscan(g.player,from,target.clone().sub(from).normalize(),12,true,'AK','ak',false);return {from:from.toArray(),target:target.toArray(),end:end.toArray(),distance:from.distanceTo(end),targetDistance:from.distanceTo(target)};}
    finally {g.bots=saved;}
  });
  assert.ok(receipt.windowShot.distance>receipt.windowShot.targetDistance,'Tiro real atravessa a janela até o patamar');
  receipt.cat=await page.evaluate(async()=>{
    const THREE=await import('three'),g=window.__game,amb=g.world.ambience,a=amb.animals.find(a=>a.type==='cat');
    if(a.source!=='gltf'||a.root.userData.assetId!=='escadaoCat')throw Error('Gato Mint ausente');
    amb.reset();for(let i=0;i<60;i++)amb.update(1/60);const idle=a.action;
    for(let i=0;i<180;i++)amb.update(1/60);
    const walk=a.action,start=a.root.position.clone();for(let i=0;i<12;i++)amb.update(1/60);const distance=start.distanceTo(a.root.position);
    const walkClip=a.actions.walk.getClip().name,runClip=a.actions.run.getClip().name;
    const shotStart=a.root.position.clone().add(new THREE.Vector3(2,1,2));
    const direction=a.root.position.clone().add(new THREE.Vector3(1,.2,1)).sub(shotStart).normalize();
    g._fireHitscan(g.player,shotStart,direction,12,true,'AK','ak',false);for(let i=0;i<6;i++)amb.update(1/60);
    return {asset:a.root.userData.assetId,source:a.source,idle,walk,walkClip,runClip,distance,seconds:.2,afterShot:a.state,actionAfterShot:a.action,skinned:(()=>{let n=0;a.model.traverse(o=>{if(o.isSkinnedMesh)n++;});return n;})()};
  });
  assert.equal(receipt.cat.idle,'idle');assert.equal(receipt.cat.walk,'walk');assert.equal(receipt.cat.afterShot,'flee');assert.equal(receipt.cat.actionAfterShot,'run');assert.ok(receipt.cat.skinned>0);
  assert.notEqual(receipt.cat.walkClip,receipt.cat.runClip);assert.ok(Math.abs(receipt.cat.distance/.2-.55)<.01);
  const views=[
    {id:'rua-casa',pos:[0,0,25],look:[3,4,15]},
    {id:'acesso-casa',pos:[11.5,0,24.5],look:[9.1,3.5,17.5]},
    {id:'escada-central',pos:[0,null,12.9],look:[0,7,-2]},
    {id:'beco-leste',pos:[12,null,11.5],look:[12,5,4]},
    {id:'beco-desvio',pos:[12,2.52,6.1],look:[9.4,4.1,5.95]},
    {id:'beco-retorno',pos:[8.05,2.52,6.2],look:[7.95,4.1,8.3]},
    {id:'beco-patamar',pos:[7.7,2.52,8.7],look:[3.3,4.1,8.5]},
    {id:'base-fechada',pos:[12,null,10],look:[4,4,-2]},
    {id:'casa-entrada',pos:[9.3,2.75,16],look:[6,4.1,16]},
    {id:'casa-janela',pos:[6.15,2.75,15.5],look:[6.15,4.02,9]},
    {id:'casa-interior',pos:[7,2.75,15.7],look:[2.55,3.5,17.35]},
    {id:'ratos-baratas',pos:[12,0,26],look:[11.3,.1,24.3]},
    {id:'gato',cat:true},
  ];
  for(const view of views){
    const pose=await page.evaluate(view=>{
      const g=window.__game;let pos=view.pos,look=view.look;
      for(const b of g.bots)b.mesh.group.visible=false;
      if(view.id==='casa-janela'){const b=g.bots.find(b=>b.team!==g.playerTeam);b.pos.set(6.15,g.world.groundHeightAt(6.15,9),9);b.mesh.group.position.copy(b.pos);b.mesh.group.rotation.y=0;b.mesh.group.visible=true;for(let i=0;i<60;i++)b.mesh.ctrl?.update(1/60,0,true,0);}
      if(view.cat){const amb=g.world.ambience;amb.reset();amb.update(0);const a=amb.animals.find(a=>a.type==='cat');pos=[a.root.position.x+1.3,a.root.position.y,a.root.position.z+1.4];look=[a.root.position.x,a.root.position.y+.25,a.root.position.z];}
      else if(pos[1]===null)pos[1]=g.world.groundHeightAt(pos[0],pos[2]);
      g.player.pos.fromArray(pos);const requested=g.player.pos.clone();g._collide(g.player.pos,.38);if(g.player.pos.distanceTo(requested)>.03)throw Error(`Câmera em sólido: ${view.id}`);g.camera.position.set(pos[0],pos[1]+1.62,pos[2]);g.camera.fov=70;g.camera.updateProjectionMatrix();g.camera.lookAt(...look);g.scene.updateMatrixWorld(true);
      const before=g.renderer.info.render.frame;g.renderer.render(g.scene,g.camera);
      if(!g.renderer.__postPatched && g.vmScene){g.renderer.autoClear=false;g.renderer.clearDepth();g.renderer.render(g.vmScene,g.vmCamera);g.renderer.autoClear=true;}
      return {pos,look,fov:g.camera.fov,rendered:g.renderer.info.render.frame>before};
    },view);
    assert.ok(pose.rendered,'Captura exige render real após mudar câmera');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:`${out}/${view.id}.png`});receipt.photos.push({...view,...pose});
  }
  assert.equal(receipt.errors.length,0,JSON.stringify(receipt.errors));
  receipt.status='passed';console.log(`R4 browser PASS: ${receipt.home.trace.length} posições, Mint carregado, gato animado e reação a tiro; ${views.length} capturas`);
} catch(error){receipt.status='failed';receipt.error=error.stack;console.error(error.message);process.exitCode=1;}
finally{writeFileSync(`${out}/receipt.json`,JSON.stringify(receipt,null,2));await browser.close();}
