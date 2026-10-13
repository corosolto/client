import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const out=process.env.OUT || '/tmp/treta-eyewear-ui',base=process.env.BASE || 'http://127.0.0.1:4355';mkdirSync(out,{recursive:true});
const mutant=process.argv.find(a=>a.startsWith('--mutant='))?.split('=')[1];
const assets=JSON.parse(readFileSync('public/models/items/eyewear-manifest.json'));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio','--use-angle=metal']});
let approval=true,available=true,balance=1000,inventory=[{skin_id:'lula-drip',slot:'skin',equipped:true}],purchases=0;
const catalog=Object.entries(assets.eyewear).map(([id,s])=>({id,name:s.name,slot:'eyewear',character_id:'*',price:200,available:true,model_path:s.model}));
const state=()=>({authenticated:true,accountId:'eyewear-fixture',wallet:{balance},inventory,ledger:[],quests:{},catalog:catalog.map(c=>({...c,available})),campaign:{}});
const report={fixture:true,errors:[],captures:[]};
try{
 const page=await browser.newPage({viewport:{width:1536,height:1024}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('cs_treta_intro','v1');localStorage.setItem('awpbr_settings',JSON.stringify({menuMusic:false,vol:0,speech:false}));localStorage.setItem('cs_lang','pt');});
 if(mutant)await page.route('**/js/eyewear.js*',async r=>{
  const original=readFileSync('public/js/eyewear.js','utf8');
  const source=mutant==='raycast'?original.replace('o.raycast=()=>{};',''):mutant==='head-anchor'?original.replace('head.add(anchor)','model.add(anchor)'):mutant==='skin-profile'?original.replace('def.skinId || def.id','def.id'):original;
  assert.notEqual(source,original,'mutation did not apply');await r.fulfill({contentType:'text/javascript',body:source});
 });
 await page.route('**/api/**',async r=>{const u=new URL(r.request().url()),b=r.request().postDataJSON();
  if(u.pathname==='/api/treta'){
   if(b?.action==='purchase'){balance-=200;purchases++;inventory.push({skin_id:b.skinId,slot:'eyewear',equipped:false});return r.fulfill({json:{...state(),purchase:{spent:200,owned:false}}});}
   if(b?.action==='equip')inventory=inventory.map(i=>i.slot==='eyewear'?{...i,equipped:i.skin_id===b.skinId}:i);
   return r.fulfill({json:state()});
  }
  if(u.pathname==='/api/social-auth')return r.fulfill({json:{authenticated:true,accountId:'eyewear-fixture',profile:{nick:'TESTE'},providers:[],email:false}});
  return r.fulfill({json:{rooms:[],entries:[],profile:{socials:[]},online:0}});
 });
 await page.route('**/models/items/eyewear-manifest.json',r=>r.fulfill({json:{...assets,eyewear:Object.fromEntries(Object.entries(assets.eyewear).map(([id,e])=>[id,{...e,approved:approval,profiles:{capitao:{approved:true,width:.96,height:.44,depth:.04}}}]))}}));
 const boot=async()=>{await page.goto(`${base}/?debug=1&nav=1&secao=loja`,{waitUntil:'commit'});await page.locator('#splash-enter:not(.hidden)').waitFor({timeout:90000});await page.locator('#boot-splash').click();await page.locator('#boot-splash').waitFor({state:'hidden'});await page.locator('[data-treta-view=accessories]').click();};
 await boot();await page.locator('#treta-balance-value').filter({hasText:'1.000'}).waitFor();await page.locator('#treta-eyewear-grid .treta-label').first().filter({hasText:'NOVO VISUAL'}).waitFor();
 const cards=page.locator('#treta-eyewear-grid .treta-card');assert.equal(await cards.count(),6,'Six real eyewear cards required');
 for(const text of await cards.allTextContents())assert.match(text,/T\$ 200/);
 await cards.first().click();await page.locator('#treta-detail-production').filter({hasText:'Prévia 3D dos óculos.'}).waitFor({timeout:30000});
 assert.equal(await page.locator('#treta-buy').isEnabled(),true);await page.locator('#treta-buy').click();await page.locator('#treta-purchase[open]').waitFor();
 assert.equal(balance,800);assert.equal(purchases,1);await page.locator('#treta-purchase-equip').click();await page.locator('#treta-purchase').waitFor({state:'hidden'});
 assert(inventory.find(i=>i.slot==='skin').equipped,'Glasses must preserve equipped skin');
 assert(inventory.find(i=>i.slot==='eyewear').equipped,'Glasses must equip separately');
 await page.evaluate(()=>{const b=document.createElement('div');b.textContent='TESTE LOCAL · CONTA E TRANSAÇÕES SIMULADAS';b.style.cssText='position:fixed;bottom:0;left:0;background:#fff0b5;color:#111;padding:8px;z-index:99999';document.body.append(b);});
 const path=resolve(out,'eyewear-store.png');await page.screenshot({path});report.captures.push(path);
 approval=false;await boot();await cards.first().click();await page.locator('#treta-detail-production').filter({hasText:'preparação'}).waitFor();assert.equal(await page.locator('#treta-buy').isEnabled(),false,'Unapproved fit must block purchase/equip');
 await page.locator('#treta-detail [data-treta-close]').click();approval=true;
 const rendered=await page.evaluate(async()=>{
   const THREE=await import('three'),{preloadCharacterAssets,buildCharacterModel}=await import('/js/glbchars.js'),{preloadEyewearAssets,eyewearProfile}=await import('/js/eyewear.js'),{byId}=await import('/js/characters.js');
   const profile={approved:true,width:.96,height:.44,depth:.04},entry={approved:true,profiles:{capitao:profile}};
   if(eyewearProfile({...entry,approved:false},{id:'capitao'}) || eyewearProfile({...entry,profiles:{capitao:{...profile,approved:false}}},{id:'capitao'}) || eyewearProfile(entry,{id:'capitao',skinId:'other-skin'}))throw new Error('unapproved or mismatched fit accepted');
   const ids=['metal-de-rua','ouro-de-quebrada','oval-90','visor-de-pista'];
   await Promise.all([preloadCharacterAssets(['capitao'],{weapons:[]}),preloadEyewearAssets(ids)]);
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,50),renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(768,768);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;scene.add(new THREE.HemisphereLight(0xffffff,0x66553b,2));const key=new THREE.DirectionalLight(0xffedd1,3);key.position.set(3,4,5);scene.add(key);
   const env=new THREE.Scene();env.background=new THREE.Color(0xaaaaaa);const pmrem=new THREE.PMREMGenerator(renderer),et=pmrem.fromScene(env,.04);scene.environment=et.texture;pmrem.dispose();
   const host=document.createElement('div');host.id='eyewear-runtime-proof';host.style.cssText='position:fixed;inset:0;z-index:2000;background:#152339;color:white;display:grid;place-content:center';const label=document.createElement('p');label.textContent='TESTE LOCAL · ENCAIXE EM REVISÃO · SEM VENDA';host.append(label,renderer.domElement);document.body.append(host);
   const results=[];let current;
   function pose(id,yaw=0,motion='idle'){if(current)scene.remove(current.group);current=buildCharacterModel({...byId('capitao'),eyewearId:id},{weapon:false});if(!current)throw new Error('character GLB missing');scene.add(current.group);current.ctrl.setCrouch(motion==='crouch');for(let i=0;i<20;i++)current.ctrl.update(1/30,motion==='walk'?1:0,false,motion==='walk'?1:0);current.group.rotation.y=yaw;current.group.updateMatrixWorld(true);const anchor=current.group.getObjectByName('TRETA-eyewear');if(!anchor || anchor.parent.name!=='Head')throw new Error('eyewear must attach to Head');anchor.traverse(o=>{if(o.isMesh){if(o.userData.noHit!==true)throw new Error('cosmetic hit flag absent');const p=o.geometry.attributes.position,ix=o.geometry.index,vertices=[0,1,2].map(n=>new THREE.Vector3().fromBufferAttribute(p,ix?ix.getX(n):n).applyMatrix4(o.matrixWorld)),center=vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3),normal=new THREE.Vector3().subVectors(vertices[1],vertices[0]).cross(new THREE.Vector3().subVectors(vertices[2],vertices[0])).normalize(),ray=new THREE.Raycaster(center.clone().add(normal),normal.clone().negate());const hits=[];o.raycast(ray,hits);if(hits.length)throw new Error('eyewear intercepts hitscan');}});const center=anchor.parent.getWorldPosition(new THREE.Vector3());camera.position.set(0,center.y,1.35);camera.lookAt(0,center.y,0);renderer.render(scene,camera);return anchor;}
   for(const id of ids){const anchor=pose(id),initial=anchor.matrixWorld.clone();for(let i=0;i<15;i++)current.ctrl.update(1/30,1,false,1);current.group.updateMatrixWorld(true);const relative=new THREE.Matrix4().copy(anchor.parent.matrixWorld).invert().multiply(anchor.matrixWorld);if(relative.elements.some((v,i)=>Math.abs(v-anchor.matrix.elements[i])>1e-7))throw new Error('head anchor moved relative to bone');if(initial.equals(anchor.matrixWorld))throw new Error('animation did not move eyewear');results.push({id,parent:anchor.parent.name,meshes:anchor.children.length,relativeStable:true,animated:true});}
   const unsupported=buildCharacterModel({...byId('capitao'),skinId:'unreviewed-skin',eyewearId:ids[0]},{weapon:false});if(unsupported.group.getObjectByName('TRETA-eyewear'))throw new Error('base fit reused on unreviewed skin');
   window.__eyewearProof={pose};pose(ids[1]);return results;
 });report.runtime=rendered;
 for(const [id,angle,motion]of [['metal-de-rua',0],['ouro-de-quebrada',0],['ouro-de-quebrada',1.5707963268],['oval-90',0],['visor-de-pista',0],['ouro-de-quebrada',0,'walk'],['ouro-de-quebrada',0,'crouch']]){await page.evaluate(({id,angle,motion})=>window.__eyewearProof.pose(id,angle,motion),{id,angle,motion});const p=resolve(out,`runtime-${id}-${motion || (angle===0?'front':'side')}.png`);await page.screenshot({path:p});report.captures.push(p);}
 assert.equal(report.errors.length,0);console.log('PASS: six 200 T$ cards, real GLB preview, separate equip, no purchase without approved fit');
}finally{writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
