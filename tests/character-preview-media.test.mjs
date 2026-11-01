// Helpers reais do menu; DOM/mídia controlados. Não substitui QA visual no Astro.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const raw = fs.readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
const base = { id: 'barbudo', name: 'Barbudo' };
const cyborg = { ...base, skinId: 'lula-cyborg' };
const presentation = { id: 'lula-cyborg', name: 'Barbudo Cyborg', poster: '/img/skins/lula-cyborg.webp', video: { webm: '/video/skins/lula-cyborg.webm' } };
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture({ reduced = false, compact = false, narrow = false, lean = true, play = () => Promise.resolve(), mutate = value => value, pack = false, vibe = 'ak', paints = {ak:'ouro-ak'} } = {}) {
  let equippedSkin='lula-cyborg',homeRefreshes=0,rendererCalls=0;
  let motionChange;
  const motion={matches:reduced,addEventListener:(type,callback)=>{motionChange=callback;}};
  const compactQuery={matches:compact,addEventListener:()=>{}};
  const narrowQuery={matches:narrow};
  const classes = () => { const values = new Set(); return { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value), toggle(value, force) { if (force ?? !values.has(value)) values.add(value); else values.delete(value); } }; };
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { id, dataset: {}, classList: classes(), src: '', alt: '', textContent: '', hidden: false, loads: 0, pause() {}, play, load() { this.loads++; }, removeAttribute(name) { this[name] = ''; } }); return nodes.get(id); };
  const box = node('box'), video = node('char-preview-video'), hints = node('hints');
  const block = raw.slice(raw.indexOf('const ORDEM_ARMA_EQUIPADA'),raw.indexOf('let pvToken ='))
    + '\n' + raw.slice(raw.indexOf('const portraitUrl ='), raw.indexOf('function ensurePreview()'))
    + '\nlet pvToken=0;\n' + raw.slice(raw.indexOf('function pvSetChar(def)'), raw.indexOf('function pvThumb(def)'))
    + '\n' + raw.slice(raw.indexOf('function refreshMenuEquipment()'),raw.indexOf('let hubMapReturnQuick'));
  const context = vm.createContext({ VERSION: 'fixture', staticPreviews: lean, $: node,
    document: { querySelector: selector => selector === '.char-preview-box' ? box : hints },
    matchMedia: query => query.includes('pointer: coarse')?compactQuery:query.includes('max-width')?narrowQuery:motion,
    tretaSkinPresentation: (id, character) => id === 'lula-cyborg' && character === 'barbudo' ? presentation : null,
    equippedTretaSkin: () => equippedSkin, equippedTretaEyewear: () => null,
    tretaPack:id=>id?{weaponSkins:{ak:'pack-fixture-ak',pistol:'pack-fixture-pistol'},gloveSkin:'pack-glove'}:null,
    equippedTretaPack:()=>pack?'pack-fixture':null,charWeapon:()=>vibe,
    equippedTretaWeaponSkin:id=>paints[id] || null,equippedTretaGlove:()=>null,
    tretaWeaponPresentation:(weapon,id)=>id?.startsWith('pack-')?{name:'Pack Fixture'}:id?{name:'Ouro'}:null,
    sincronizaBarraEmotes: () => {},
    ensurePreview:()=>{rendererCalls++;return null;},
    selChar:base,syncHomeCharacter:()=>{homeRefreshes++;},hubRosterRender:()=>{},
  });
  const api = new vm.Script(mutate(block) + '\n({showStaticPreview,pvStopVideo,pvSetVideo,portraitUrl,pvSetChar,refreshMenuEquipment,armaDoPreview,previewModelActive});').runInContext(context);
  return { api, node, box, video,rendererCalls:()=>rendererCalls,homeRefreshes:()=>homeRefreshes,accountSkin:id=>{equippedSkin=id;},selection:def=>{context.selChar=def;},reduceMotion:()=>{motion.matches=true;motionChange?.(motion);} };
}

test('static preview uses the validated equipped skin poster', () => {
  const f = fixture(); f.api.showStaticPreview(cyborg);
  assert.equal(f.node('char-preview-static').src, presentation.poster + '?v=fixture');
  assert.match(f.node('char-preview-static').alt, /Cyborg/);
});
test('failed skin poster never falls back to the base character', () => {
  const f = fixture(); f.api.showStaticPreview(cyborg);
  f.node('char-preview-static').onerror();
  assert.equal(f.node('char-preview-static').src.includes('/img/chars/'), false);
  assert.equal(f.node('char-preview-static').classList.contains('hidden'), true);
  assert.match(f.node('char-preview-skin').textContent, /indisponível/i);
});
test('base portrait retains the native base fallback', () => {
  const f = fixture(); f.api.showStaticPreview(base);
  f.node('char-preview-static').onerror();
  assert.equal(f.node('char-preview-static').src, '/img/chars/barbudo.webp?v=fixture');
});
test('skin video uses its own media instead of the base character loop', () => {
  const f = fixture(); f.api.pvSetVideo(cyborg);
  assert.equal(f.video.src, presentation.video.webm + '?v=fixture');
});
test('stopping video invalidates an already queued loaded callback', async () => {
  const f = fixture(); f.api.pvSetVideo(cyborg);
  const loaded = f.video.onloadeddata;
  f.api.pvStopVideo(); loaded(); await tick();
  assert.equal(f.box.classList.contains('has-video'), false);
  assert.equal(f.video.onloadeddata, null);
});
test('failed playback leaves the poster visible', async () => {
  const f = fixture({ play: () => Promise.reject(new Error('fixture blocked')) });
  f.api.pvSetVideo(cyborg); f.video.onloadeddata(); await tick();
  assert.equal(f.box.classList.contains('has-video'), false);
});
test('reduced motion does not start a character video', () => {
  const f = fixture({ reduced: true }); f.api.pvSetVideo(cyborg);
  assert.equal(f.video.src, '');
  assert.equal(f.box.classList.contains('has-video'), false);
});
test('switching reduced motion on stops an already visible loop',async()=>{
  const f=fixture();f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();
  assert.equal(f.box.classList.contains('has-video'),true);
  f.reduceMotion();assert.equal(f.box.classList.contains('has-video'),false);assert.equal(f.video.src,'');
});
test('successful skin video clears a prior missing-poster message',async()=>{
  const f=fixture();f.api.showStaticPreview(cyborg);f.node('char-preview-static').onerror();
  f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();
  assert.equal(f.node('char-preview-skin').textContent,presentation.name);
});
for(const stop of ['error','reduced'])test('failed poster remains identified after a visible video stops: '+stop,async()=>{
  const f=fixture();f.api.showStaticPreview(cyborg);f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();
  f.node('char-preview-static').onerror();
  if(stop==='error')f.video.onerror();else f.reduceMotion();
  assert.equal(f.box.classList.contains('has-video'),false);
  assert.match(f.node('char-preview-skin').textContent,/indisponível.*Cyborg/i);
});
test('refresh with the same video does not reload its decoder', () => {
  const f = fixture(); f.api.pvSetVideo(cyborg); const count = f.video.loads;
  f.api.pvSetVideo(cyborg); assert.equal(f.video.loads, count);
});
test('static equipment names the resolved weapon skin separately', () => {
  const f = fixture(); f.api.showStaticPreview(cyborg);
  assert.match(f.node('char-preview-weapon').textContent, /AK-47.*Ouro/);
});
test('the actual weapon resolver preserves pack and character-weapon precedence',()=>{
  const f=fixture({pack:true,vibe:'pistol'});f.api.showStaticPreview(cyborg);
  assert.equal(f.api.armaDoPreview('barbudo').weaponSkinId,'pack-fixture-pistol');
  assert.equal(f.api.armaDoPreview('barbudo').gloveSkinId,'pack-glove');
  assert.match(f.node('char-preview-weapon').textContent,/Pistola.*Pack Fixture/);
  const g=fixture({vibe:'pistol',paints:{ak:'ouro-ak',m4:'prata-m4'}});
  assert.equal(g.api.armaDoPreview('barbudo').weaponSkinId,'ouro-ak');
});
test('the real character caller resolves the equipped skin and preserves an explicit base trial', () => {
  const f=fixture();f.api.pvSetChar(base);
  assert.equal(f.node('char-preview-static').src,presentation.poster+'?v=fixture');
  f.api.pvSetChar({...base,skinId:null});
  assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');
});
test('compact cards outside the hidden hero keep a faithful skin portrait and weapon identity',()=>{
  const f=fixture();f.api.pvSetChar(base);
  for(const id of ['hub-character-portrait','char-select-portrait'])assert.equal(f.node(id).src,presentation.poster+'?v=fixture');
  for(const id of ['hub-character-equipment','char-select-equipment'])assert.match(f.node(id).textContent,/Cyborg.*AK-47.*Ouro/);
});
test('landscape coarse uses stills without creating or rendering 3D or loading a loop',()=>{
  const f=fixture({compact:true,lean:false});f.api.pvSetChar(base);f.api.pvSetVideo(base);
  assert.equal(f.rendererCalls(),0);assert.equal(f.video.src,'');
  assert.equal(f.api.previewModelActive(true,true),false);
  const narrow=fixture({narrow:true,lean:false});narrow.api.pvSetChar(base);
  assert.equal(narrow.rendererCalls(),0);
  assert.equal(narrow.api.previewModelActive(false,true),false);
  assert.equal(narrow.api.previewModelActive(true,false),true);
});
test('inventory refresh through the real caller keeps an unchanged video loaded', () => {
  const f=fixture();f.api.pvSetChar(base);f.api.pvSetVideo(base);const count=f.video.loads;
  f.api.pvSetChar(base);f.api.pvSetVideo(base);
  assert.equal(f.video.loads,count);
});
test('an image failure callback queued for another character cannot hide its replacement', () => {
  const f=fixture();f.api.showStaticPreview(cyborg);const failed=f.node('char-preview-static').onerror;
  f.api.showStaticPreview(base);failed();
  assert.equal(f.node('char-preview-static').classList.contains('hidden'),false);
  assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');
});
test('inventory and account refresh retain the open selection and clear the old skin media',()=>{
  const f=fixture();f.api.refreshMenuEquipment();
  assert.equal(f.node('char-preview-static').src,presentation.poster+'?v=fixture');
  const loaded=f.video.onloadeddata;
  f.accountSkin(null);f.api.refreshMenuEquipment();loaded();
  assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');
  assert.equal(f.homeRefreshes(),0);
  assert.equal(f.box.classList.contains('has-video'),false);
  f.selection({...base,skinId:null});f.accountSkin('lula-cyborg');f.api.refreshMenuEquipment();
  assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');
});
const replace=(from,to)=>value=>{assert.ok(value.includes(from),'mutation anchor missing');return value.replace(from,to);};
for(const [name,mutate,probe,options={}] of [
  ['base poster substituted',replace('return skin?(skin.poster?', 'return false?(skin.poster?'),f=>{f.api.showStaticPreview(cyborg);assert.equal(f.node('char-preview-static').src,presentation.poster+'?v=fixture');}],
  ['video stop loses ownership token',replace('pvVidToken++;',''),async f=>{f.api.pvSetVideo(cyborg);const old=f.video.onloadeddata;f.api.pvStopVideo();old();await tick();assert.equal(f.box.classList.contains('has-video'),false);}],
  ['reduced motion ignored',replace('|| pvReducedMotion.matches','|| false'),f=>{f.api.pvSetVideo(cyborg);assert.equal(f.video.src,'');},{reduced:true}],
  ['same presentation reloads',replace('if(key===pvStaticKey)return;',''),f=>{f.api.pvSetChar(base);f.api.pvSetVideo(base);const n=f.video.loads;f.api.pvSetChar(base);f.api.pvSetVideo(base);assert.equal(f.video.loads,n);}],
  ['old image failure retained',replace('image.onerror = () => {if(my!==pvImageToken)return;','image.onerror = () => {'),f=>{f.api.showStaticPreview(cyborg);const old=f.node('char-preview-static').onerror;f.api.showStaticPreview(base);old();assert.equal(f.node('char-preview-static').classList.contains('hidden'),false);}],
  ['explicit base trial overwritten',replace("Object.hasOwn(def,'skinId')?def.skinId:equippedTretaSkin(def.id)",'equippedTretaSkin(def.id)'),f=>{f.api.pvSetChar({...base,skinId:null});assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');}],
  ['poster failure forgotten when video stops',replace('if(label && pvPosterFailure){','if(false){'),async f=>{f.api.showStaticPreview(cyborg);f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();f.node('char-preview-static').onerror();f.reduceMotion();assert.match(f.node('char-preview-skin').textContent,/indisponível/);}],
  ['failed play promotes video',replace('try{await video.play();}catch{if(my===pvVidToken)pvStopVideo();return;}','void video.play().catch(()=>{});'),async f=>{f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();assert.equal(f.box.classList.contains('has-video'),false);},{play:()=>Promise.reject(new Error('fixture blocked'))}],
  ['compact path creates a hidden renderer',replace('staticPreviews || pvCompact.matches','staticPreviews'),f=>{f.api.pvSetChar(base);assert.equal(f.rendererCalls(),0);},{compact:true,lean:false}],
])test('causal mutant is rejected: '+name,async()=>{
  await assert.rejects(async()=>probe(fixture({...options,mutate})),{name:'AssertionError'});
});
