// Compra/equipamento no Astro → API → DB local. Saldo simulado e venda local
// temporária; o finally restaura catálogo e elimina contas. Não usa DB remoto.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
const arg=(key,fallback)=>process.argv.find(x=>x.startsWith(`--${key}=`))?.slice(key.length+3) || fallback;
const backend=arg('backend',''),envFile=arg('env',''),base=arg('base','http://127.0.0.1:4351');
const output=arg('fotos','test-results/treta-integration');
assert(backend && envFile,'Use --backend=<lane> --env=<private-local-env.json>');
Object.assign(process.env,JSON.parse(fs.readFileSync(envFile)));
assert(['127.0.0.1','localhost'].includes(new URL(process.env.SUPABASE_URL).hostname),'Only local DB');
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Only local site');
const {supabaseAdmin:db}=await import(pathToFileURL(path.join(backend,'api/_lib/supabase.ts')));
const {authFetch,newSession}=await import(pathToFileURL(path.join(backend,'api/_lib/social-session.ts')));
const manifest=JSON.parse(fs.readFileSync('public/models/skins/manifest.json'));
const ids=Object.keys(manifest.skins),users=[],report={checks:[],errors:[],skins:[]};
const verify=(value,label)=>{assert(value,label);report.checks.push(label);};
const original=await db.from('treta_catalog').select('id,available').in('id',ids);assert.ifError(original.error);
let browser,activePage;
fs.mkdirSync(output,{recursive:true});
async function account(){
 const tag=randomUUID().slice(0,8),email=`skins-${tag}@example.test`,password=randomUUID(),player=randomUUID();
 const created=await db.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);
 const auth=created.data.user.id;users.push({auth,player});
 assert.ifError((await db.from('players').insert({id:player,nick:`s${tag}`,token:randomUUID(),auth_user:auth})).error);
 const signed=await authFetch('/token?grant_type=password',{email,password});assert.equal(signed.status,200);
 const credentials=await signed.json();credentials.expires_at=Math.floor(Date.now()/1000)+3600;
 const session=await newSession(credentials);return {...users.at(-1),sid:session.sid};
}
async function pageFor(user,expectedBalance=10400){
 const context=await browser.newContext({viewport:{width:1200,height:800}});
 await context.addCookies([{name:'cs_social',value:user.sid,url:base,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();activePage=page;page.on('pageerror',e=>report.errors.push(e.message));
 // Aprovação temporária EXCLUSIVA da QA; os arquivos 3D são os reais.
 await page.route('**/models/skins/manifest.json',r=>r.fulfill({json:{...manifest,skins:Object.fromEntries(ids.map(id=>[id,{...manifest.skins[id],approved:true}]))}}));
 await page.addInitScript(()=>{localStorage.setItem('awpbr_settings',JSON.stringify({menuMusic:false,vol:0,speech:false,quality:'low',bots:0}));localStorage.setItem('cs_treta_intro','v1');});
 await page.goto(`${base}/?debug=1&api=${encodeURIComponent(process.env.PUBLIC_API_BASE)}`);
 await page.waitForFunction(()=>window.__CS_MAIN_READY__,null,{timeout:120000});
 await page.evaluate(()=>{document.querySelector('#boot-splash')?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));document.querySelector('#boot-splash')?.click();});
 await page.waitForFunction(()=>!document.getElementById('boot-splash') || document.getElementById('boot-splash').classList.contains('gone'),null,{timeout:60000});
 await page.waitForFunction(value=>document.getElementById('treta-balance-value')?.textContent===`T$ ${new Intl.NumberFormat('pt-BR').format(value)}`,expectedBalance,{timeout:20000});
  await page.waitForFunction(()=>document.getElementById('nick-input')?.value && document.getElementById('btn-jogar')?.getAttribute('aria-disabled')==='false',null,{timeout:5000});
 await page.evaluate(()=>{const label=document.createElement('div');label.id='qa-credit-label';label.textContent='TESTE LOCAL · CRÉDITOS SIMULADOS';label.style.cssText='position:fixed;top:0;left:0;z-index:2147483647;color:#fff;background:#6b245b;padding:5px;font:12px sans-serif;pointer-events:none';document.body.append(label);});
 return {context,page};
}
async function post(page,body){return page.evaluate(async body=>{const r=await fetch('/api/treta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};},body);}
try{
 const a=await account(),b=await account();
 assert.ifError((await db.rpc('treta_credit',{p_auth:a.auth,p_key:'local-qa:fund',p_kind:'refund',p_amount:10400})).error);
 assert.ifError((await db.from('treta_catalog').update({available:true}).in('id',ids)).error);
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio','--use-angle=metal']});
 const {page,context}=await pageFor(a);
 await page.locator('[data-hub-tab="loja"]').click();
 await page.screenshot({path:path.join(output,'shop-13-skins.png')});
 for(let index=0;index<ids.length;index++){
  const id=ids[index];
  await page.locator('.treta-card').filter({has:page.locator(`img[src="${manifest.skins[id].poster}"]`)}).click();
  await page.waitForFunction(()=>{const b=document.getElementById('treta-buy');return b && !b.disabled && b.textContent.includes('COMPRAR');},null,{timeout:30000});
  if(index===0)await page.screenshot({path:path.join(output,'skin-detail.png')});
  await page.locator('#treta-buy').click();await page.waitForFunction(()=>document.getElementById('treta-purchase')?.open,null,{timeout:15000});
  if(index===0)await page.screenshot({path:path.join(output,'purchase.png')});
  await page.locator('#treta-purchase-equip').click();
  await page.waitForFunction(()=>!document.getElementById('treta-purchase').open,null,{timeout:15000});
  const state=await page.evaluate(async()=>await (await fetch('/api/treta')).json());
  verify(state.wallet.balance===10400-800*(index+1),`${id}: débito de 800 confirmado no DB`);
  verify(state.inventory.filter(s=>s.equipped).length===1 && state.inventory.find(s=>s.skin_id===id)?.equipped,`${id}: equipamento exclusivo`);
  report.skins.push(id);
  console.log(`Comprada/equipada: ${id}`);
 }
 const replay=await post(page,{action:'purchase',skinId:ids[0],requestId:randomUUID(),price:1,balance:999999});
 verify(replay.status===200 && replay.data.wallet.balance===0 && replay.data.purchase.owned,'Recompra/price forjado não debita nem credita');
 const forbidden=await post(page,{action:'equip',skinId:'nonexistent'});verify(forbidden.status===409,'Equipamento inexistente rejeitado');
 await page.locator('.treta-card').filter({has:page.locator(`img[src="${manifest.skins['lula-drip'].poster}"]`)}).click();
 await page.waitForFunction(()=>document.getElementById('treta-buy')?.textContent==='EQUIPAR SKIN',null,{timeout:15000});
 await page.locator('#treta-buy').click();
 await page.waitForFunction(()=>document.getElementById('treta-buy')?.textContent==='JÁ EQUIPADA',null,{timeout:15000});
 await page.evaluate(()=>document.getElementById('treta-detail').close());
 await page.locator('[data-hub-tab="jogar"]').click();
 await page.locator('#btn-jogar').click();await page.locator('#hub-quick-confirm').click();
 await page.waitForFunction(()=>window.__game?.playerDef?.skinId==='lula-drip',null,{timeout:120000});
 await page.evaluate(()=>window.__game.setCamView('third'));
 await page.waitForFunction(()=>window.__game?.playerTP?.isGLB && window.__game._tpSkinId==='lula-drip',null,{timeout:30000});
 verify(await page.evaluate(()=>window.__game.playerTP.ctrl.charId==='lula-drip'),'SP usa rig da skin e offsets próprios');
 await page.evaluate(()=>document.getElementById('crash-overlay')?.click());
 await page.screenshot({path:path.join(output,'singleplayer-equipped.png')});
 report.game=await page.evaluate(()=>({skin:window.__game.playerDef.skinId,weapon:window.__game.player.weapon,map:window.__game.mapId}));
 await page.goto(`${base}/?debug=1&api=${encodeURIComponent(process.env.PUBLIC_API_BASE)}`);
 await page.waitForFunction(()=>window.__CS_MAIN_READY__,null,{timeout:120000});
 await page.locator('#splash-enter:not(.hidden)').waitFor({timeout:120000});
 await page.evaluate(()=>{document.querySelector('#boot-splash')?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));document.querySelector('#boot-splash')?.click();});
 await page.waitForFunction(()=>!document.getElementById('boot-splash') || document.getElementById('boot-splash').classList.contains('gone'));
 verify(await page.locator('#hub-character-name').textContent().then(x=>x.includes('Barbudo')),'Personagem equipado persiste após recarga');
 console.log('Recarga preservou personagem; entrando no MP');
 await page.locator('#hub-mp').click();
 await page.waitForFunction(()=>document.getElementById('mp-estado')?.dataset.s==='on',null,{timeout:60000});
 await page.locator('#hub-mp-private').click();
 await page.evaluate(()=>{document.querySelector('details.mp-criar').open=true;document.getElementById('mp-nome').value='TRETA QA';const size=document.getElementById('mp-teamsize');size.value='1';size.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#mp-amigos').click();await page.locator('#mp-modal:not(.hidden)').waitFor({timeout:20000});
 const code=(await page.locator('#mp-modal-convite').textContent()).trim();
 await page.locator('#mp-modal-entrar').click();
 await page.waitForFunction(()=>window.__game?._mp?.net?.connected && window.__game.playerDef?.skinId==='lula-drip',null,{timeout:120000});
 const otherPage=await pageFor(b,0);await otherPage.page.locator('#hub-mp').click();
 await otherPage.page.waitForFunction(()=>document.getElementById('mp-estado')?.dataset.s==='on',null,{timeout:60000});
 await otherPage.page.locator('#hub-mp-private').click();
 await otherPage.page.locator('#mp-convite-in').fill(code);await otherPage.page.locator('#mp-convite-form').evaluate(e=>e.requestSubmit());
 await otherPage.page.waitForFunction(()=>window.__game?._mp?.net?.connected,null,{timeout:120000});
 await otherPage.page.waitForFunction(()=>window.__game?._mp?.net?.meta?.roster?.some(r=>r.skinId==='lula-drip'),null,{timeout:20000});
 const multiplayer=await otherPage.page.evaluate(()=>({ownSkin:window.__game.playerDef.skinId || null,roster:window.__game._mp.net.meta.roster.map(r=>({id:r.id,team:r.team,character:r.char,skin:r.skinId || null})),bodies:window.__game.bots.map(b=>({character:b.def?.id,skin:b.def?.skinId || null,rig:b.mesh?.ctrl?.charId || null}))}));
 verify(multiplayer.ownSkin===null && multiplayer.roster.filter(r=>r.skin==='lula-drip').length===1,'MP assina skin da conta A; conta B não herda');
 verify(multiplayer.bodies.some(b=>b.skin==='lula-drip'),'MP carrega skin no corpo remoto');
 report.multiplayer=multiplayer;
 await page.evaluate(()=>{window.__game.setCamView('third');document.getElementById('crash-overlay')?.click();});
 await page.screenshot({path:path.join(output,'multiplayer-equipped.png')});
 await otherPage.context.close();await context.close();
 // Outra conta não herda armário nem saldo. A API responde à sessão real.
 const other=await browser.newContext();await other.addCookies([{name:'cs_social',value:b.sid,url:base,httpOnly:true,sameSite:'Lax'}]);
 const response=await other.request.get(`${base}/api/treta`),state=await response.json();
 verify(state.accountId===b.auth && !state.inventory.length && (!state.wallet || state.wallet.balance===0),'Conta B isolada');
 await other.close();
 verify(report.errors.length===0,`Sem pageerror: ${report.errors.join('; ')}`);
 console.log(`PASS: ${report.checks.length} checks, ${report.skins.length} skins compradas/equipadas, SP/MP reais`);
}catch(error){
 if(activePage && !activePage.isClosed()){
  report.failure=await activePage.evaluate(()=>({mpError:document.getElementById('mp-erro')?.textContent,mpState:document.getElementById('mp-estado')?.textContent,screen:document.getElementById('main-menu')?.dataset.hubNet,gameState:window.__game?.state})).catch(()=>({}));
  console.log('Boundary failure:',JSON.stringify(report.failure));
  await activePage.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
 }
 throw error;
}finally{
 await browser?.close();
 for(const row of original.data || [])assert.ifError((await db.from('treta_catalog').update({available:row.available}).eq('id',row.id)).error);
 for(const user of users){await db.from('social_session').delete().eq('auth_user',user.auth);await db.from('players').delete().eq('id',user.player);assert.ifError((await db.auth.admin.deleteUser(user.auth)).error);}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
}
