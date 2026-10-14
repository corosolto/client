import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
const arg=key=>process.argv.find(v=>v.startsWith(`--${key}=`))?.slice(key.length+3);
const base=arg('base') || 'http://127.0.0.1:4351',backend=arg('backend'),env=arg('env'),out=arg('out') || '/tmp/treta-quests-browser';
assert(backend && env,'Use --backend and --env for the local environment');
Object.assign(process.env,JSON.parse(fs.readFileSync(env)));
for(const url of [base,process.env.SUPABASE_URL])assert(['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local only');
const {supabaseAdmin:db}=await import(pathToFileURL(path.join(backend,'api/_lib/supabase.ts')));
const {authFetch,newSession}=await import(pathToFileURL(path.join(backend,'api/_lib/social-session.ts')));
const tag=randomUUID().slice(0,8),password=randomUUID(),player=randomUUID();
let user,browser;const report={checks:[],errors:[],simulatedMatches:false,simulatedCredits:false};
const check=(value,label)=>{assert(value,label);report.checks.push(label);};
try {
 const created=await db.auth.admin.createUser({email:`quest-${tag}@example.test`,password,email_confirm:true});assert.ifError(created.error);user=created.data.user.id;
 assert.ifError((await db.from('players').insert({id:player,nick:`q${tag}`,token:randomUUID(),auth_user:user})).error);
 const signed=await authFetch('/token?grant_type=password',{email:`quest-${tag}@example.test`,password});assert.equal(signed.status,200);
 const credentials=await signed.json();credentials.expires_at=Math.floor(Date.now()/1000)+3600;const session=await newSession(credentials);
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio','--use-angle=metal']});
 const context=await browser.newContext({viewport:{width:1536,height:1024}});
 await context.addCookies([{name:'cs_social',value:session.sid,url:base,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('awpbr_settings',JSON.stringify({menuMusic:false,vol:0,speech:false,quality:'low',bots:0}));localStorage.setItem('cs_treta_intro','v1');});
 const open=async()=>{
  await page.goto(`${base}/?debug=1&nav=1&secao=jogar&api=${encodeURIComponent(process.env.PUBLIC_API_BASE)}`);
  await page.waitForFunction(()=>window.__CS_MAIN_READY__,null,{timeout:120000});
  await page.locator('#splash-enter:not(.hidden)').waitFor({timeout:90000});
  await page.evaluate(()=>{const splash=document.querySelector('#boot-splash');splash?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));splash?.click();});
  await page.locator('#boot-splash').waitFor({state:'hidden',timeout:30000});
  await page.locator('[data-hub-tab="loja"]').click();
  await page.waitForFunction(()=>document.getElementById('treta-balance-value')?.textContent==='T$ 200',null,{timeout:30000});
 };
 await open();
 const request=async body=>page.evaluate(async body=>{const response=await fetch('/api/treta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};},body);
 const refreshed=await request({action:'refresh'});
 check(refreshed.status===200 && refreshed.body.wallet.balance===200,'Confirmed email quest credits exactly 200, including replay');
 check(refreshed.body.quests.email===1,'Server reports email completion');
 check(refreshed.body.topUpsEnabled===false && refreshed.body.acquisition==='quests','Quest-only acquisition policy');
 check(refreshed.body.campaign.daily_match_cap===250,'Server applies the approved 250 daily match cap');
 check(refreshed.body.ledger.length===1 && refreshed.body.ledger[0].kind==='email','No fixture/refund credit used');
 for(const body of [{action:'topup',amount:10000,paid:true},{action:'claim',quest:'singleplayer',completed:true,amount:10000}])check((await request(body)).status===400,'Forged credit route rejected: '+body.action);
 await page.locator('[data-treta-view="quests"]').click();
 check(await page.locator('.treta-quest').count()===4,'Four quest cards rendered');
 check(await page.locator('[data-quest="email"] button').isDisabled(),'Email quest cannot be repeated');
 check(await page.locator('[data-treta-view="packs"]').count()===0,'No currency packs');
 check((await page.locator('#treta-quest-period').textContent()).includes('31/10/2026'),'October calendar deadline displayed');
 fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'quests-real-email.png')});
 await page.reload();await page.waitForFunction(()=>document.getElementById('treta-balance-value')?.textContent==='T$ 200',null,{timeout:120000});
 const final=await request({action:'refresh'});check(final.body.wallet.balance===200 && final.body.ledger.length===1,'Balance persists after reload without duplicate reward');
 check(report.errors.length===0,'No browser errors');
 console.log(JSON.stringify({status:'PASS',checks:report.checks.length,simulatedCredits:false,out}));
} finally {
 await browser?.close();
 if(user){await db.from('social_session').delete().eq('auth_user',user);await db.from('players').delete().eq('id',player);assert.ifError((await db.auth.admin.deleteUser(user)).error);}
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}
