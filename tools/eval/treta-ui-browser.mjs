import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {TRETA_SKINS,TRETA_DEFAULT_REWARDS} from '../../public/js/treta-catalog.js';
const base=process.env.BASE || 'http://127.0.0.1:4347';
const out=process.env.OUT || '/tmp/treta-ui-evidence';
mkdirSync(out,{recursive:true});
const privateRoot=process.env.TRETA_PRIVATE_ROOT;
const baseline=process.argv.includes('--baseline');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio','--use-angle=metal']});
const report={fixture:true,base,captures:[],errors:[],performance:[],requests:[]};
let balance=1600,inventory=[],ledger=[],mode='normal',purchases=0;
const state=()=>({authenticated:true,accountId:'fixture-account',wallet:{balance,referral_code:'00000000-0000-4000-8000-000000000001'},inventory,ledger,campaign:TRETA_DEFAULT_REWARDS,catalog:TRETA_SKINS.map(s=>({id:s.id,character_id:s.character,price:800,available:true,model_path:`/__fixture__/${s.id}.glb`}))});
try {
 for(const [name,viewport] of [['desktop',{width:1536,height:1024}],['mobile',{width:390,height:844}]]) {
  balance=1600;inventory=[];ledger=[];mode='normal';purchases=0;
  const page=await browser.newPage({viewport,isMobile:name==='mobile',hasTouch:name==='mobile'});
  page.on('pageerror',e=>report.errors.push({name,message:e.message.slice(0,160)}));
  await page.addInitScript(()=>{localStorage.setItem('awpbr_settings',JSON.stringify({menuMusic:false,vol:0,speech:false}));localStorage.setItem('cs_lang','pt');localStorage.setItem('awpbr_nick','TESTE UI');localStorage.setItem('cs_treta_intro','v1');});
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),data=route.request().postDataJSON();
   if(url.pathname==='/api/treta') {
    report.requests.push({name,action:data?.action || 'read'});
    if(mode==='loading')await new Promise(r=>setTimeout(r,1500));
    if(mode==='error')return route.fulfill({status:503,json:{error:'unavailable'}});
    if(data?.action==='purchase') {
     if(balance<800)return route.fulfill({status:409,json:{error:'insufficient_balance'}});
     balance-=800;purchases++;inventory.push({skin_id:data.skinId,equipped:false});
     return route.fulfill({json:{...state(),purchase:{owned:false,spent:800}}});
    }
    if(data?.action==='equip')inventory=inventory.map(s=>({...s,equipped:s.skin_id===data.skinId}));
    return route.fulfill({json:state()});
   }
   if(url.pathname==='/api/social-auth')return route.fulfill({json:{authenticated:true,accountId:'fixture-account',profile:{nick:'TESTE UI',id:'fixture-profile'},providers:[],email:false}});
   return route.fulfill({json:{profile:{avatar_url:'/img/chars/barbudo.webp',socials:['fixture']},rooms:[],entries:[],online:0}});
  });
  await page.route('**/models/skins/manifest.json',r=>r.fulfill({json:{skins:Object.fromEntries(TRETA_SKINS.map(s=>[s.id,{approved:true,character:s.character,model:`/__fixture__/${s.id}.glb`,poster:`/img/chars/${s.character}.webp` }]))}}));
  await page.route('**/__fixture__/*.glb',async r=>{
   const id=new URL(r.request().url()).pathname.split('/').pop();
   const file={'lula-drip.glb':'lula-drip-idle.glb','bolsonaro-drip.glb':'bolsonaro-drip-idle.glb','senador-drip.glb':'senador-idle.glb','janja.glb':'janja-idle.glb','michelle-bolsonaro.glb':'michelle-idle.glb'}[id];
   if(privateRoot && existsSync(resolve(privateRoot,file)))return r.fulfill({path:resolve(privateRoot,file),contentType:'model/gltf-binary'});
   return r.fulfill({status:404,body:'Fixture GLB unavailable'});
  });
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/?debug=1&nav=1&secao=jogar`,{waitUntil:'commit',timeout:30000});
  await page.locator('#splash-enter:not(.hidden)').waitFor({timeout:90000});
  await page.locator('#boot-splash').click({timeout:15000,force:baseline});
  await page.locator('#boot-splash').waitFor({state:'hidden',timeout:30000});
  await page.locator('#hub-ui:not([hidden])').waitFor({timeout:90000});
  console.log('menu ready',name);
  await page.evaluate(()=>{const b=document.createElement('div');b.id='fixture-label';b.textContent='TESTE LOCAL · CONTA E TRANSAÇÕES SIMULADAS';document.addEventListener('cs-treta-stage-ready',e=>{window.__tretaMeasures ??=[];window.__tretaMeasures.push({host:e.target.id,...e.detail});});b.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff0b5;color:#191919;text-align:center;padding:5px;font:11px system-ui;pointer-events:none';document.body.append(b);});
  const shot=async key=>{const path=resolve(out,`${name}-${key}.png`);await page.screenshot({path});report.captures.push(path);};
  await page.waitForTimeout(1000);
  await page.locator('#hub-treta-total').filter({hasText:'1.600'}).waitFor();
  await shot('menu');
  await page.locator('[data-hub-tab="loja"]').click({force:baseline});
  await page.locator('#hub-shop:not([hidden])').waitFor();
  await page.locator('#treta-balance-value').filter({hasText:'1.600'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.treta-card img')].every(i=>i.complete && i.naturalWidth>0),null,{timeout:20000});
  await shot('store');
  assert.equal(await page.locator('#hub-music-toggle').getAttribute('aria-pressed'),'false');
  if(baseline) {await page.close();continue;}
  assert.equal(await page.locator('[data-treta-view="packs"]').count(),1,'Packs need a separate view');
  await page.locator('.treta-card').first().click();
  await page.locator('#treta-stage canvas').waitFor();
  await page.waitForTimeout(1000);await shot('detail');
  assert.equal(await page.locator('#treta-buy').isEnabled(),true);
  await page.locator('#treta-buy').click();
  await page.locator('#treta-purchase[open]').waitFor();await page.waitForTimeout(1000);await shot('purchase');
  assert.equal(purchases,1);assert.equal(balance,800);
  await page.locator('#treta-purchase [data-treta-close]').last().click();
  await page.locator('[data-treta-filter="owned"]').click();await shot('wardrobe');
  assert.equal(await page.locator('.treta-card').count(),1);
  await page.locator('[data-treta-view="packs"]').click();await shot('packs');
  assert.equal(await page.locator('.treta-pack').count(),3);
  assert.equal(await page.locator('.treta-pack button:enabled').count(),0);
  await page.locator('[data-treta-view="accessories"]').click();await shot('accessories');
  await page.locator('#treta-balance').click();await page.locator('#treta-info[open]').waitFor();await shot('wallet');
  await page.locator('#treta-info [data-treta-close]').last().click();
  await page.locator('[data-treta-view="skins"]').click();
  balance=100;inventory=[];mode='normal';
  await page.evaluate(()=>document.dispatchEvent(new Event('cs-shop-open')));
  await page.locator('#treta-balance-value').filter({hasText:'100'}).waitFor();
  await shot('empty');
  await page.locator('[data-treta-filter="all"]').click();
  await page.locator('.treta-card').first().click();await shot('insufficient');
  assert.equal(await page.locator('#treta-buy').isEnabled(),false);
  assert.match(await page.locator('#treta-buy-status').textContent(),/700/);
  await page.locator('#treta-detail [data-treta-close]').click();
  mode='error';await page.evaluate(()=>document.dispatchEvent(new Event('cs-shop-open')));
  await page.locator('#treta-status').filter({hasText:'indisponível'}).waitFor();await shot('error');
  mode='loading';await page.locator('#treta-retry').click();await shot('loading');
  await page.locator('#treta-status').filter({hasText:'sincronizados'}).waitFor();mode='normal';
  ledger=[{id:`fixture-reward-${name}`,kind:'email',amount:200}];balance=300;
  await page.evaluate(()=>document.dispatchEvent(new Event('cs-shop-open')));
  await page.locator('#treta-earned:not([hidden])').waitFor();await shot('reward');
  assert.match(await page.locator('#treta-earned-reason').textContent(),/EMAIL/);
  const geometry=await page.evaluate(()=>{const ids=['.hub-header','#hub-treta-wallet','#hub-shop'];return ids.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {selector:s,x:r.x,y:r.y,width:r.width,height:r.height};});});
  for(const r of geometry)assert(r.x>=0 && r.x+r.width<=viewport.width+1,`${name} ${r.selector} must fit viewport`);
  const stages=await page.evaluate(()=>window.__tretaMeasures || []);
  assert(stages.length>=4 && stages.every(s=>s.fitsViewport),'All 3D bounds must fit the rendered viewport');
  assert(stages.filter(s=>s.host==='treta-purchase-stage').every(s=>s.count===(name==='mobile'?1:4)),'Mobile must avoid four copies of the coin mesh');
  report.performance.push({name,stages});
  await page.close();
 }
 writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:'PASS',baseline,captures:report.captures.length,pageErrors:report.errors,out}));
} finally {writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
