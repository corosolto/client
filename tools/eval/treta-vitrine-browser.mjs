// Vitrine SKINS NOVAS na aba JOGAR, medida no jogo real com a API da loja simulada (pedido do
// dono, 14/10/2026: as skins da loja também aparecem no menu principal).
//
//   W1  loja no ar: a vitrine mostra toda skin à venda e aprovada, com o nome do catálogo,
//       preço em T$ ou EQUIPAR/EQUIPADA, imagem loading=lazy.
//   W2  boot leve: o módulo da vitrine só baixa depois da resposta da loja; nenhum vídeo,
//       nenhum <video> e nenhum GLB de skin antes de interação.
//   W3  JOGAR no lugar: mesmo retângulo com e sem vitrine, inteiro na tela, vitrine abaixo dele
//       e acima do rodapé (1536×1024 e 390×844); no celular o título aparece inteiro sem rolar.
//   W4  hover no desktop toca o vídeo da skin certa; ao sair, pausa.
//   W5  clique leva a /loja?skin=<id> com o detalhe da skin aberto; fechar tira o ?skin=.
//   W6  EQUIPAR usa o fluxo da loja (POST action=equip) e o card vira EQUIPADA.
//   W7  loja fora do ar (TRETA_ENABLED off, 503): vitrine escondida e módulo nem baixa.
//   W8  catálogo sem skin à venda: vitrine escondida.
//   W9  toque (390×844): primeiro toque toca o vídeo, segundo abre a loja na skin.
//   W10 link direto /loja?skin=<id> abre o detalhe da skin.
//
// Uso (servidor próprio; a 8123 é de outra sessão):
//   BASE=http://localhost:9683 tools/eval/with-browser-lock.sh node tools/eval/treta-vitrine-browser.mjs
//   ... --mutations   roda os mutantes e exige que cada um reprove
//   OUT=<dir> grava screenshots e relatório (padrão /tmp/treta-vitrine)
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {TRETA_SKINS,TRETA_DEFAULT_REWARDS} from '../../public/js/treta-catalog.js';

const base=process.env.BASE;
if(!base){console.error('passe BASE=http://localhost:<porta> explícito');process.exit(2);}
/* Cada mutante: [arquivo, trecho, troca]. */
const MUTANTS={
  /* vitrine montada do catálogo estático, sem olhar o que o servidor vende */
  flag:[['treta-store.js','if(!state?.catalog || refreshFailed || !Object.keys(manifest.skins).length)return null;','if(!Object.keys(manifest.skins).length)return null;'],
    ['treta-store.js','filter(s=>available(s.id) && manifest.skins[s.id]?.poster)','filter(s=>manifest.skins[s.id]?.approved && manifest.skins[s.id]?.poster)'],
    ['treta-store.js','price:item(s.id).price','price:s.price']],
  video:[['treta-vitrine.js',"img.loading='lazy';","img.loading='lazy';{const v=document.createElement('video');v.src=`/video/skins/${s.id}.webm`;v.preload='auto';abrir.append(v);}"]],
  nome:[['treta-vitrine.js',"node('strong',s.name)","node('strong',s.id.replace(/-/g,' '))"]],
  lazy:[['treta-vitrine.js',"img.loading='lazy';",'']],
  /* título do celular mais alto: fica cortado pela DICA sem rolar */
  titulo:[['treta.css','.treta-vitrine{padding-top:4px}','.treta-vitrine{padding-top:14px}']],
};
const EXPECT={flag:'W7',video:'W2',nome:'W1',lazy:'W1',titulo:'W3m'};
if(process.argv.includes('--mutations')){
  for(const [id,expect] of Object.entries(EXPECT)){
    const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,`--mutante=${id}`],{encoding:'utf8',env:{...process.env,OUT:`${process.env.OUT || '/tmp/treta-vitrine'}-mut-${id}`}});
    assert(r.status!==0 && (r.stderr+r.stdout).includes(`${expect} REPROVOU`),`mutante ${id} não reprovou em ${expect}\n${(r.stderr+r.stdout).slice(-600)}`);
    console.log(`mutante ${id}: reprovou em ${expect}`);
  }
  console.log(`PASS: ${Object.keys(EXPECT).length}/${Object.keys(EXPECT).length} mutações da vitrine detectadas`);process.exit(0);
}
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
if(mutant && !MUTANTS[mutant]){console.error(`mutante desconhecido: ${mutant}`);process.exit(2);}
const out=process.env.OUT || '/tmp/treta-vitrine';
mkdirSync(out,{recursive:true});
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const bin=process.env.CHROME_BIN || (existsSync(chrome)?chrome:null);
const browser=await chromium.launch({...(bin?{executablePath:bin}:{}),args:['--mute-audio','--autoplay-policy=no-user-gesture-required']});
const manifest=JSON.parse(readFileSync('public/models/skins/manifest.json','utf8'));
const vendidas=TRETA_SKINS.filter(s=>manifest.skins[s.id]?.approved===true && manifest.skins[s.id]?.poster);
assert(vendidas.length>=4,`manifesto com poucas skins aprovadas (${vendidas.length}): a régua não mede nada`);
const [equipada,naoEquipada]=[vendidas[3],vendidas[1]];
const report={base,mutant:mutant || null,runs:{},checks:[]};
const check=(id,ok,detail)=>{report.checks.push({id,ok,detail});if(!ok)throw new Error(`${id} REPROVOU: ${detail}`);console.log(`${id} ok · ${detail}`);};
const estado=({available=true}={})=>({authenticated:true,acquisition:'quests',topUpsEnabled:false,accountId:'fixture-account',
  wallet:{balance:1600,referral_code:'00000000-0000-4000-8000-000000000001'},
  inventory:[{skin_id:equipada.id,equipped:true},{skin_id:naoEquipada.id,equipped:false}],ledger:[],quests:{},
  campaign:{...TRETA_DEFAULT_REWARDS,starts_at:new Date(Date.now()-86400000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()},
  catalog:TRETA_SKINS.map(s=>({id:s.id,name:s.name,character_id:s.character,price:800,available,model_path:manifest.skins[s.id]?.model}))});

async function abrir(name,{viewport,touch=false,loja='on',caminho='/'}) {
  const context=await browser.newContext({viewport,isMobile:touch,hasTouch:touch});
  const page=await context.newPage();
  const requests=[],posts=[];let tretaRespondida=0;
  page.on('request',r=>requests.push({url:new URL(r.url()).pathname,type:r.resourceType(),t:Date.now()}));
  /* /.astro/eval-vite/deps/* é módulo da barra de dev do Astro, que o serve.mjs não repassa. */
  page.on('pageerror',e=>{if(!/\/\.astro\/eval-vite\//.test(e.message))report.checks.push({id:'pageerror',ok:false,detail:`${name}: ${e.message.slice(0,160)}`});});
  await page.addInitScript(()=>{localStorage.setItem('awpbr_settings',JSON.stringify({menuMusic:false,vol:0,speech:false}));localStorage.setItem('cs_lang','pt');localStorage.setItem('awpbr_nick','TESTE UI');localStorage.setItem('cs_treta_intro','v1');});
  if(mutant)for(const arquivo of new Set(MUTANTS[mutant].map(m=>m[0])))await page.route(arquivo.endsWith('.css')?`**/${arquivo}*`:`**/js/${arquivo}*`,async r=>{
    let source=readFileSync(arquivo.endsWith('.css')?`public/${arquivo}`:`public/js/${arquivo}`,'utf8');
    for(const [f,from,to] of MUTANTS[mutant])if(f===arquivo){const antes=source;source=source.replace(from,to);if(source===antes)throw new Error(`MUTANTE NÃO APLICOU em ${arquivo}`);}
    await r.fulfill({contentType:arquivo.endsWith('.css')?'text/css':'text/javascript',body:source});
  });
  let atual=estado({available:loja!=='itens-off'});
  await page.route('**/api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(path==='/api/treta'){
      if(loja==='off')return route.fulfill({status:503,json:{error:'treta_unavailable'}});
      if(req.method()==='POST'){
        const body=JSON.parse(req.postData() || '{}');posts.push(body);
        if(body.action==='equip')atual={...atual,inventory:atual.inventory.map(s=>({...s,equipped:s.skin_id===body.skinId?true:s.equipped}))};
      }
      tretaRespondida=tretaRespondida || Date.now();
      return route.fulfill({json:atual});
    }
    if(path==='/api/social-auth')return route.fulfill({json:{authenticated:true,accountId:'fixture-account',profile:{nick:'TESTE UI',id:'fixture-profile'},providers:[],email:false}});
    return route.fulfill({json:{profile:{avatar_url:'/img/chars/barbudo.webp',socials:['fixture']},rooms:[],entries:[],online:0}});
  });
  page.setDefaultTimeout(20000);
  await page.goto(caminho==='/'?`${base}/?ui=legacy`:`${base}${caminho}`,{waitUntil:'commit',timeout:30000});
  if(caminho==='/'){
    await page.locator('#splash-enter:not(.hidden)').waitFor({timeout:90000});
    await page.locator('#boot-splash').dispatchEvent('pointerdown');
  }
  await page.locator('#hub-ui:not([hidden])').waitFor({timeout:90000});
  if(loja==='on')await page.waitForFunction(()=>document.querySelectorAll('#treta-vitrine:not([hidden]) .treta-vitrine-card').length>0,null,{timeout:20000}).catch(()=>{});
  else await page.waitForTimeout(4000);
  await page.waitForFunction(()=>[...document.querySelectorAll('#treta-vitrine img')].every(i=>i.loading==='lazy' && i.getBoundingClientRect().left>innerWidth || i.complete),null,{timeout:10000}).catch(()=>{});
  await page.waitForTimeout(1200);
  return {context,page,requests,posts,tretaRespondida:()=>tretaRespondida};
}
const rect=(page,sel)=>page.locator(sel).first().evaluate(e=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),visivel:r.width>0 && r.height>0};}).catch(()=>null);
const vitrineVisivel=page=>page.evaluate(()=>{const v=document.getElementById('treta-vitrine');return Boolean(v && !v.hidden && v.getClientRects().length);});
const cards=page=>page.$$eval('#treta-vitrine .treta-vitrine-card',l=>l.map(c=>({id:c.dataset.skin,nome:c.querySelector('strong')?.textContent,preco:c.querySelector('.treta-vitrine-texto b')?.textContent || null,equipar:c.querySelector('.treta-vitrine-equipar')?.textContent || null,equipada:c.querySelector('.treta-vitrine-equipada')?.textContent || null,lazy:c.querySelector('img')?.loading,src:new URL(c.querySelector('img').src).pathname})));
const media=reqs=>reqs.filter(r=>r.url.startsWith('/video/') && !r.url.endsWith('.webp') || r.type==='media');
const glbSkin=reqs=>reqs.filter(r=>/^\/models\/skins\/.+\.glb$/.test(r.url));
const tocando=(page,sel)=>page.waitForFunction(sel=>{const v=document.querySelector(sel);return v && !v.paused && v.readyState>=2 && v.currentTime>0.2;},sel,{timeout:20000}).then(()=>true,()=>false);
const shot=(page,key)=>page.screenshot({path:resolve(out,`${key}.png`)});
const jogarNaTela=(j,f,h)=>j && j.visivel && j.top>=0 && j.bottom<=Math.min(h,f?.top ?? h);

let failed=null;
try {
  const jogarSem={};
  for(const [vp,viewport,touch] of [['desktop',{width:1536,height:1024},false],['mobile',{width:390,height:844},true]]){
    const {context,page,requests}=await abrir(`${vp}-off`,{viewport,touch,loja:'off'});
    const vit=requests.filter(r=>r.url.endsWith('/js/treta-vitrine.js'));
    check(`W7${vp==='mobile'?'m':''}`,!await vitrineVisivel(page) && (await cards(page)).length===0 && vit.length===0,`${vp} com /api/treta 503: vitrine visível=${await vitrineVisivel(page)}, cards=${(await cards(page)).length}, módulo baixado=${vit.length}`);
    jogarSem[vp]=await rect(page,'#btn-jogar');
    await shot(page,`${vp}-loja-fora`);await context.close();
  }
  {
    const {context,page}=await abrir('itens-off',{viewport:{width:1536,height:1024},loja:'itens-off'});
    check('W8',!await vitrineVisivel(page) && (await cards(page)).length===0,`catálogo sem skin à venda: vitrine visível=${await vitrineVisivel(page)}`);
    await context.close();
  }
  {
    const {context,page,requests,posts,tretaRespondida}=await abrir('desktop',{viewport:{width:1536,height:1024}});
    const lista=await cards(page);
    report.runs.desktop={cards:lista};
    const esperado=vendidas.map(s=>s.id);
    const nomesOk=lista.every(c=>c.nome===TRETA_SKINS.find(s=>s.id===c.id)?.name);
    const precoOk=lista.every(c=>c.id===equipada.id?c.equipada==='EQUIPADA' && !c.preco:c.id===naoEquipada.id?c.equipar==='EQUIPAR' && !c.preco:c.preco==='T$ 800');
    check('W1',await vitrineVisivel(page) && JSON.stringify(lista.map(c=>c.id))===JSON.stringify(esperado) && nomesOk && precoOk && lista.every(c=>c.lazy==='lazy'),`${lista.length}/${esperado.length} skins, nomes do catálogo=${nomesOk}, preço/EQUIPAR/EQUIPADA=${precoOk}, lazy=${lista.filter(c=>c.lazy==='lazy').length}`);
    const vit=requests.find(r=>r.url.endsWith('/js/treta-vitrine.js'));
    const imgs=requests.filter(r=>r.type==='image' && lista.some(c=>c.src===r.url));
    check('W2',vit && vit.t>=tretaRespondida() && media(requests).length===0 && await page.locator('#treta-vitrine video').count()===0 && glbSkin(requests).length===0,`módulo depois da loja=${Boolean(vit && vit.t>=tretaRespondida())}, vídeos=${media(requests).length}, <video>=${await page.locator('#treta-vitrine video').count()}, GLB de skin=${glbSkin(requests).length}, imagens da vitrine baixadas=${imgs.length}`);
    report.runs.desktop.imagens=imgs.map(r=>r.url);
    const j=await rect(page,'#btn-jogar'),v=await rect(page,'#treta-vitrine'),f=await rect(page,'.hub-footer');
    check('W3',jogarNaTela(j,f,1024) && Math.abs(j.top-jogarSem.desktop.top)<=1 && v.top>=j.bottom && v.bottom<=f.top,`JOGAR ${JSON.stringify(j)} (sem vitrine top=${jogarSem.desktop.top}), vitrine ${v.top}-${v.bottom}, rodapé ${f.top}`);
    await shot(page,'desktop-vitrine');
    const alvo=`#treta-vitrine [data-skin="${vendidas[2].id}"] .treta-vitrine-abrir`;
    await page.locator(alvo).hover();
    const ok=await tocando(page,`${alvo} video`);
    const src=ok?await page.locator(`${alvo} video`).evaluate(v=>new URL(v.currentSrc).pathname):null;
    await page.waitForTimeout(500);await shot(page,'desktop-hover');
    await page.mouse.move(5,5);await page.waitForTimeout(400);
    check('W4',ok && src?.startsWith(`/video/skins/${vendidas[2].id}.`) && await page.locator(`${alvo} video`).evaluate(v=>v.paused),`hover tocou ${src}, saiu e pausou`);
    await page.locator(`#treta-vitrine [data-skin="${naoEquipada.id}"] .treta-vitrine-equipar`).click();
    await page.waitForFunction(id=>document.querySelector(`#treta-vitrine [data-skin="${id}"] .treta-vitrine-equipada`),naoEquipada.id,{timeout:10000}).catch(()=>{});
    const eq=posts.find(p=>p.action==='equip');
    check('W6',eq?.skinId===naoEquipada.id && await page.locator(`#treta-vitrine [data-skin="${naoEquipada.id}"] .treta-vitrine-equipada`).count()===1,`POST ${JSON.stringify(eq)}; card virou EQUIPADA`);
    await shot(page,'desktop-equipada');
    await page.locator(`#treta-vitrine [data-skin="${vendidas[2].id}"] .treta-vitrine-abrir`).click();
    await page.locator('#treta-detail[open]').waitFor({timeout:10000}).catch(()=>{});
    const u=new URL(page.url()),nome=await page.locator('#treta-detail-name').textContent();
    const loja=await page.locator('#hub-shop:not([hidden])').count();
    await page.waitForTimeout(600);await shot(page,'desktop-clique-loja');
    await page.keyboard.press('Escape');await page.waitForTimeout(400);
    const depois=new URL(page.url());
    check('W5',u.pathname==='/loja' && u.searchParams.get('skin')===vendidas[2].id && nome===vendidas[2].name && loja===1 && depois.pathname==='/loja' && !depois.searchParams.has('skin'),`clique foi a ${u.pathname}${u.search}, detalhe "${nome}", loja aberta=${loja}; fechou e ficou ${depois.pathname}${depois.search}`);
    await context.close();
  }
  {
    const {context,page,requests}=await abrir('mobile',{viewport:{width:390,height:844},touch:true});
    const j=await rect(page,'#btn-jogar'),v=await rect(page,'#treta-vitrine'),f=await rect(page,'.hub-footer'),t=await rect(page,'#treta-vitrine>header'),m=await rect(page,'#menu-setup');
    /* Sem rolar, só o título cabe abaixo do JOGAR: ele tem de aparecer inteiro, não cortado pela DICA. */
    check('W3m',jogarNaTela(j,f,844) && Math.abs(j.top-jogarSem.mobile.top)<=1 && v.top>=j.bottom && t.bottom<=Math.min(f.top,m.bottom),`390×844: JOGAR ${JSON.stringify(j)} (sem vitrine top=${jogarSem.mobile.top}), título da vitrine ${t.top}-${t.bottom}, área visível até ${Math.min(f.top,m.bottom)}`);
    check('W2m',media(requests).length===0 && glbSkin(requests).length===0,`boot mobile: vídeos=${media(requests).length}, GLB de skin=${glbSkin(requests).length}`);
    await shot(page,'mobile-vitrine');
    await page.locator('#treta-vitrine').scrollIntoViewIfNeeded();await page.waitForTimeout(600);
    await shot(page,'mobile-vitrine-rolada');
    const alvo=`#treta-vitrine [data-skin="${vendidas[2].id}"] .treta-vitrine-abrir`;
    await page.locator(alvo).tap();
    const ok=await tocando(page,`${alvo} video`),aindaJogar=await page.locator('#hub-play:not([hidden])').count();
    await page.waitForTimeout(400);await shot(page,'mobile-primeiro-toque');
    check('W9',ok && aindaJogar===1 && await page.locator('#treta-detail[open]').count()===0,`primeiro toque: vídeo=${ok}, continua no JOGAR=${aindaJogar===1}`);
    await page.locator(alvo).tap();
    await page.locator('#treta-detail[open]').waitFor({timeout:10000}).catch(()=>{});
    const u=new URL(page.url());
    check('W9b',u.pathname==='/loja' && u.searchParams.get('skin')===vendidas[2].id && await page.locator('#treta-detail[open]').count()===1,`segundo toque: ${u.pathname}${u.search}, detalhe aberto`);
    await page.waitForTimeout(600);await shot(page,'mobile-segundo-toque-loja');
    await context.close();
  }
  {
    const {context,page}=await abrir('deeplink',{viewport:{width:1536,height:1024},caminho:`/loja?skin=${vendidas[1].id}`});
    await page.locator('#treta-detail[open]').waitFor({timeout:15000}).catch(()=>{});
    const nome=await page.locator('#treta-detail[open] #treta-detail-name').textContent().catch(()=>null);
    check('W10',nome===vendidas[1].name,`/loja?skin=${vendidas[1].id} abriu o detalhe "${nome}"`);
    await context.close();
  }
  const errors=report.checks.filter(c=>c.id==='pageerror');
  check('W0',errors.length===0,`erros de página: ${errors.length} ${errors.map(e=>e.detail).join(' | ')}`);
} catch(e){failed=e;}
finally {writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
if(failed){console.error(failed.message);process.exit(1);}
console.log(`PASS: vitrine SKINS NOVAS (W0-W10) · ${out}`);
