// Helpers reais do menu; DOM/mídia controlados. Não substitui QA visual no Astro.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const raw = fs.readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
const glbRaw=fs.readFileSync(new URL('../public/js/glbchars.js',import.meta.url),'utf8');
function templateDecision(def,opts,{available=true,mutate=value=>value}={}){
  const source=mutate(glbRaw),start=source.indexOf('export function buildCharacterModel(def, opts = {}) {');
  const end=source.indexOf('  const withWeapon =',start);
  assert.ok(start>=0&&end>start,'real GLB template boundary missing');
  return vm.runInNewContext(source.slice(start,end).replace('export ','')+'return template;\n}\nbuildCharacterModel(def,opts)',{
    def,opts,_clips:{},_base:new Map([['barbudo',{kind:'base'}]]),
    _skins:new Map(available?[['lula-cyborg',{character:'barbudo',model:{kind:'skin'}}]]:[]),
  });
}
const base = { id: 'barbudo', name: 'Barbudo' };
const cyborg = { ...base, skinId: 'lula-cyborg' };
const presentation = { id: 'lula-cyborg', name: 'Barbudo Cyborg', poster: '/img/skins/lula-cyborg.webp', video: { webm: '/video/skins/lula-cyborg.webm' } };
const tick = () => new Promise(resolve => setImmediate(resolve));

const mediaRule=fs.readFileSync(new URL('../tools/eval/media-net-check.mjs',import.meta.url),'utf8');
const playGuard=new vm.Script(mediaRule.slice(mediaRule.indexOf('const CATCH_DIRETO ='),mediaRule.indexOf('function arquivosJs('))
  +mediaRule.slice(mediaRule.indexOf('function playGuardado('),mediaRule.indexOf('function corpoApi('))+'\nplayGuardado').runInNewContext();
for(const [name,lines,expected] of [
  ['await enclosed by catch',['try{await video.play();}catch{stop();return;}'],true],
  ['await catch with binding',['try { await video.play(); } catch (error) { stop(); }'],true],
  ['bare await',['await video.play();'],false],
  ['missing catch',['try{await video.play();}finally{stop();}'],false],
  ['unrelated catch',['try{other();}catch{} await video.play();'],false],
  ['second unguarded play',['try{await video.play();}catch{} audio.play();'],false],
  ['catch not closed',['try{await video.play();}catch{'],false],
  ['catch returns rejection',['try{await video.play();}catch(error){return Promise.reject(error);}'],false],
  ['catch awaits another rejection',['try{await video.play();}catch{await retry();}'],false],
  ['direct promise handler',['video.play().catch(()=>{});'],true],
])test('media guard recognizes the actual containment: '+name,()=>assert.equal(playGuard(lines,0),expected));

const i18nSource = fs.readFileSync(new URL('../public/js/i18n.js', import.meta.url), 'utf8');
const i18nResolver = new vm.Script(i18nSource.slice(0, i18nSource.indexOf('/* window.__GEO_LANG__')).replace(/export\s+/g, '') + '\nLANG');
function resolveLang(lang) { return i18nResolver.runInNewContext(vm.createContext({ URLSearchParams, location: { search: '?lang=' + lang } })); }
function fixture({ lang = 'pt', reduced = false, compact = false, narrow = false, lean = true, threeD = false, realModel = false, previousModel = null, modelAvailable = true, cosmeticAvailable = true, teamVisible = false, teamVisibilityAPI = true, preload = () => Promise.resolve(), screen = 'selection', play = () => Promise.resolve(), mutate = value => value, pack = false, vibe = 'ak', paints = {ak:'ouro-ak'} } = {}) {
  let equippedSkin='lula-cyborg',homeRefreshes=0,rendererCalls=0,preloads=0,thumbnailRenders=0,modelBuilds=0,boxBuilds=0;
  const query=matches=>{const q=new EventTarget();q.matches=matches;q.change=value=>{q.matches=value;const event=new Event('change');event.matches=value;q.dispatchEvent(event);};return q;};
  const motion=query(reduced),compactQuery=query(compact),narrowQuery=query(narrow);
  const classes = () => { const values = new Set(); return { add: value => values.add(value), remove: value => values.delete(value), contains: value => values.has(value), toggle(value, force) { if (force ?? !values.has(value)) values.add(value); else values.delete(value); } }; };
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { id, dataset: {}, children: [], classList: classes(), src: '', alt: '', innerHTML:'',textContent: '', hidden: false, loads: 0, style:{}, setAttribute(){}, appendChild(child){this.children.push(child);}, pause() {}, play, load() { this.loads++; }, removeAttribute(name) { this[name] = ''; } }); return nodes.get(id); };
  const show=id=>{for(const [key,page] of [['selection','char-select'],['hub','main-menu'],['team','team-select']])node(page).classList.toggle('hidden',id!==page);};
  show({selection:'char-select',hub:'main-menu',team:'team-select'}[screen]);
  node('main-menu').dataset.hubTab='jogar';node('main-menu').dataset.hubNet='sp';
  const box = node('box'), video = node('char-preview-video'), hints = node('hints');
  const previewState={scene:{add(){},remove(){}},model:previousModel};
  box.checkVisibility=()=>!compactQuery.matches && (!node('char-select').classList.contains('hidden') || (!node('main-menu').classList.contains('hidden')&&!narrowQuery.matches));
  const block = raw.slice(raw.indexOf('const screens ='),raw.indexOf('const $ = id =>'))
    + '\n' + raw.slice(raw.indexOf('const ORDEM_ARMA_EQUIPADA'),raw.indexOf('let pvToken ='))
    + '\n' + raw.slice(raw.indexOf('const portraitUrl ='), raw.indexOf('function ensurePreview()'))
    + '\nlet pvToken=0,pv=null,pvDrag=null;\n' + raw.slice(raw.indexOf('function pvSetChar(def)'), raw.indexOf('function pvThumb(def)'))
    + '\n' + raw.slice(raw.indexOf('function refreshMenuEquipment()'),raw.indexOf('let hubMapReturnQuick'))
    + '\n' + raw.slice(raw.indexOf('function pvThumb(def)'),raw.indexOf('/* ---------------- game lifecycle'))
    + '\n' + raw.slice(raw.indexOf('function glbThumb(def)'),raw.indexOf('/* Ficha do personagem'))
    + '\n' + raw.slice(raw.indexOf('function selectChar(c, row)'),raw.indexOf('function selectCharacterFromAvatar'))
    + '\n' + raw.slice(raw.indexOf('  const setHubTab ='),raw.indexOf('  tabs.forEach((button, index)'))
    + '\n' + raw.slice(raw.indexOf('  const setHubNet ='),raw.indexOf("  $('hub-sp').onclick"))
    + '\nfunction frame(dtReal){' + raw.slice(raw.indexOf('      const pvDt = pv.travado'),raw.indexOf('      pv.r.render(pv.scene, pv.cam);')+'      pv.r.render(pv.scene, pv.cam);'.length)+'\n}';
  const context = vm.createContext({ VERSION: 'fixture', staticPreviews: lean, LANG: resolveLang(lang), $: node,
    document: { getElementById:node,dispatchEvent(){},querySelector: selector => {if(selector==='.char-preview-box')return box;if(selector.includes('.team-chars')){const team=node(selector);const visible=()=>typeof teamVisible==='object'?teamVisible[selector.includes('team-e')?'E':'B']:teamVisible;team.checkVisibility=teamVisibilityAPI?visible:undefined;team.getClientRects=()=>visible()?[{}]:[];return team;}return hints;},querySelectorAll:()=>[],createElement:()=>node('row-'+nodes.size) },
    matchMedia: query => query.includes('pointer: coarse')?compactQuery:query.includes('max-width')?narrowQuery:motion,
    tretaSkinPresentation: (id, character) => id === 'lula-cyborg' && character === 'barbudo' ? presentation : null,
    equippedTretaSkin: () => equippedSkin, equippedTretaEyewear: () => null,
    tretaPack:id=>id?{weaponSkins:{ak:'pack-fixture-ak',pistol:'pack-fixture-pistol'},gloveSkin:'pack-glove'}:null,
    equippedTretaPack:()=>pack?'pack-fixture':null,charWeapon:()=>vibe,
    equippedTretaWeaponSkin:id=>paints[id] || null,equippedTretaGlove:()=>null,
    tretaWeaponPresentation:(weapon,id)=>id?.startsWith('pack-')?{name:'Pack Fixture'}:id?{name:'Ouro'}:null,
    sincronizaBarraEmotes: () => {},
    ensurePreview:()=>{rendererCalls++;return threeD?previewState:null;},
    navOnly:!realModel,PV_CAM_MAOS:false,buildCharacter:()=>{boxBuilds++;return {group:{rotation:{}}};},
    CHARACTERS:[base],podeNoLado:()=>true,GLB_CHARS:new Set(['barbudo']),
    ui:{back(){}},currentTeam:null,currentFaction:null,hideLoading(){},showLoading(){},selectCharacterFromAvatar(){},
    HUB_ENABLED:false,stopMapPreviews(){},stopMapPreview(){},applyHomeWall(){},musicArmed:false,setTimeout(){},focusMenu(){},
    updateHubTip(){},menuSetup:node('menu-setup'),setSetupStep(){},tabs:[],panes:{},mpPanel:node('mp-panel'),renderHubRanking(){},abrirMultiplayer(){},hubNavigate(){},location:{href:'https://fixture.invalid/'},CustomEvent:class{},
    tr:x=>x,FACTION_NAME:{},renderCharAttrs(){},sfxReady:Promise.resolve(),sfx:{characterVoice(){}},
    preloadCharacterAssets:()=>{preloads++;return preload();},hasModel:()=>modelAvailable,
    preloadCosmeticAssets:async()=>{},preloadEyewearAssets:async()=>{},preloadWeapons:async()=>{},preloadWeaponSkinCandidate:async()=>{},
    buildCharacterModel:(def,opts)=>{modelBuilds++;if(!templateDecision(def,opts,{available:cosmeticAvailable}))return null;return {group:{rotation:{},traverse(){}},mixer:{update(){}}};},snapThumb:()=>{thumbnailRenders++;return 'data:fixture';},
    selChar:base,syncHomeCharacter:()=>{homeRefreshes++;context.fixtureApi.pvSetChar(base);},hubRosterRender:()=>{},
  });
  const api = new vm.Script(mutate(block) + '\n({showStaticPreview,pvStopVideo,pvSetVideo,portraitUrl,pvSetChar,refreshMenuEquipment,armaDoPreview,previewModelActive,ensureTeamPreviews,pvThumb,glbThumb,pickTeam,show,setHubTab,setHubNet,frame,preview:value=>{pv=value;}});').runInContext(context);
  context.fixtureApi=api;
  return { api, node, box, video, mountedModel:()=>previewState.model,previewDescriptor:()=>previewState,renderDirty:()=>previewState.renderDirty,rendererCalls:()=>rendererCalls,preloads:()=>preloads,thumbnailRenders:()=>thumbnailRenders,modelBuilds:()=>modelBuilds,boxBuilds:()=>boxBuilds,show:api.show,compact:value=>compactQuery.change(value),narrow:value=>narrowQuery.change(value),homeRefreshes:()=>homeRefreshes,accountSkin:id=>{equippedSkin=id;},selection:def=>{context.selChar=def;},teamVisibility:value=>{teamVisible=value;},reduceMotion:()=>motion.change(true) };
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
const failureAdvertised = f => f.box.classList.contains('preview-failure');
const requirePosterFailure = f => assert.equal(failureAdvertised(f), true, 'poster failure state missing');
test('poster error advertises the failure state and a new selection clears it', () => {
  const f = fixture({ screen: 'hub' }); f.api.showStaticPreview(cyborg);
  f.node('char-preview-static').onerror();
  requirePosterFailure(f);
  assert.equal(f.node('char-preview-skin').hidden, false);
  f.api.showStaticPreview(base); f.node('char-preview-static').onload();
  assert.equal(failureAdvertised(f), false);
});
test('stale poster callbacks from a superseded request cannot flag the failure state', () => {
  const f = fixture(); f.api.showStaticPreview(cyborg);
  const stale = f.node('char-preview-static').onerror;
  f.api.showStaticPreview(base); f.node('char-preview-static').onload();
  stale();
  assert.equal(failureAdvertised(f), false);
});
test('a visible video covers the failure state and stopping it restores the warning', async () => {
  const f = fixture({ screen: 'hub' });
  f.api.showStaticPreview(cyborg); f.node('char-preview-static').onerror();
  f.api.pvSetVideo(cyborg); f.video.onloadeddata(); await tick();
  assert.equal(f.box.classList.contains('has-video'), true);
  assert.equal(failureAdvertised(f), false);
  f.api.pvStopVideo();
  assert.equal(failureAdvertised(f), true);
  assert.match(f.node('char-preview-skin').textContent, /indisponível.*Cyborg/i);
});
test('poster failing after a visible video keeps the video and hides the warning until stopped', async () => {
  const f = fixture({ screen: 'hub' }); f.api.showStaticPreview(cyborg);
  const fail = f.node('char-preview-static').onerror;
  f.api.pvSetVideo(cyborg); f.video.onloadeddata(); await tick();
  assert.equal(f.box.classList.contains('has-video'), true);
  fail();
  assert.equal(f.box.classList.contains('has-video'), true);
  assert.equal(failureAdvertised(f), false);
  f.api.pvStopVideo();
  requirePosterFailure(f);
  assert.match(f.node('char-preview-skin').textContent, /indisponível.*Cyborg/i);
});
test('en skin gets the localized failure warning with the advertised error state', () => {
  const f = fixture({ lang: 'en', screen: 'hub' }); f.api.showStaticPreview(cyborg);
  f.node('char-preview-static').onerror();
  assert.equal(f.node('char-preview-skin').textContent, 'Preview unavailable: Barbudo Cyborg');
  assert.equal(failureAdvertised(f), true);
});
test('mutation: dropping the failure-state update on poster error silences the hub warning', () => {
  const anchor = 'pvSetFailureUi(true);';
  assert.equal(raw.split(anchor).length - 1, 1, 'mutation anchor missing or ambiguous');
  const f = fixture({ screen: 'hub', mutate: replace(anchor, '') });
  f.api.showStaticPreview(cyborg); f.node('char-preview-static').onerror();
  assert.equal(f.node('char-preview-skin').textContent, 'Prévia indisponível: Barbudo Cyborg');
  assert.throws(() => requirePosterFailure(f), /poster failure state missing/);
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
const previewLangCases = [
  ['pt', 'Pintura: Pistola · Ouro', 'Prévia indisponível: Barbudo Cyborg'],
  ['en', 'Paint: Pistol · Ouro', 'Preview unavailable: Barbudo Cyborg'],
];
for(const [lang, paintCaption, unavailableCaption] of previewLangCases){
  test('preview captions localized by the real i18n resolver: '+lang, () => {
    const f = fixture({lang, vibe:'pistol', paints:{pistol:'ouro-pistol'}});
    f.api.showStaticPreview(cyborg);
    assert.equal(f.node('char-preview-weapon').textContent, paintCaption);
    assert.equal(f.node('char-preview-weapon').hidden, false);
    f.node('char-preview-static').onerror();
    assert.equal(f.node('char-preview-skin').textContent, unavailableCaption);
    assert.equal(f.node('char-preview-skin').hidden, false);
    f.api.pvStopVideo();
    assert.equal(f.node('char-preview-skin').textContent, unavailableCaption);
  });
  for(const screen of ['selection','hub']){
    test('compact captions localized by the real i18n resolver: '+lang+' '+screen, () => {
      const prefix = screen==='hub'?'hub-character':'char-select';
      const f = fixture({lang, compact:true, screen, vibe:'pistol', paints:{pistol:'ouro-pistol'}});
      f.api.pvSetChar(cyborg);
      assert.equal(f.node(prefix+'-equipment').textContent, 'Barbudo Cyborg · '+paintCaption);
      f.node(prefix+'-portrait').onerror();
      assert.equal(f.node(prefix+'-equipment').textContent, unavailableCaption+' · Ouro');
      assert.equal(f.node(prefix+'-equipment').hidden, false);
    });
  }
}
test('the real character caller resolves the equipped skin and preserves an explicit base trial', () => {
  const f=fixture();f.api.pvSetChar(base);
  assert.equal(f.node('char-preview-static').src,presentation.poster+'?v=fixture');
  f.api.pvSetChar({...base,skinId:null});
  assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');
});
test('compact cards outside the hidden hero keep a faithful skin portrait and weapon identity',()=>{
  for(const [screen,prefix] of [['hub','hub-character'],['selection','char-select']]){
    const f=fixture({compact:true,screen});f.api.pvSetChar(base);
    assert.equal(f.node(prefix+'-portrait').src,presentation.poster+'?v=fixture');
    assert.match(f.node(prefix+'-equipment').textContent,/Cyborg.*AK-47.*Ouro/);
  }
});
test('landscape coarse uses stills without creating or rendering 3D or loading a loop',()=>{
  const f=fixture({compact:true,lean:false});f.api.pvSetChar(base);f.api.pvSetVideo(base);
  assert.equal(f.rendererCalls(),0);assert.equal(f.video.src,'');
  assert.equal(f.api.previewModelActive(true,true),false);
  const narrow=fixture({narrow:true,lean:false,screen:'hub'});narrow.api.pvSetChar(base);
  assert.equal(narrow.rendererCalls(),0);
  assert.equal(narrow.api.previewModelActive(false,true),false);
  assert.equal(narrow.api.previewModelActive(true,false),false);
  narrow.node('char-preview').classList.remove('hidden');
  assert.equal(narrow.api.previewModelActive(true,false),true);
});
test('returning from compact to 3D restores the canvas instead of leaving a static image over it',()=>{
  const f=fixture({compact:true,lean:false,threeD:true});f.api.pvSetChar(base);
  assert.equal(f.node('char-preview').classList.contains('hidden'),true);
  f.compact(false);f.api.refreshMenuEquipment();
  assert.equal(f.node('char-preview').classList.contains('hidden'),false);
  assert.equal(f.node('char-preview-static').classList.contains('hidden'),true);
});
test('width change events reconcile the visible hub in both directions',()=>{
  const f=fixture({narrow:true,lean:false,threeD:true,screen:'hub'});f.api.pvSetChar(base);
  assert.equal(f.rendererCalls(),0);f.narrow(false);
  assert.equal(f.rendererCalls(),1);f.narrow(true);
  assert.equal(f.homeRefreshes(),2);
});
test('an in-flight 3D mount is discarded when width hides the hub',async()=>{
  let release;const waiting=new Promise(resolve=>{release=resolve;});
  const f=fixture({lean:false,threeD:true,realModel:true,screen:'hub',preload:()=>waiting});
  f.api.pvSetChar(base);assert.equal(f.preloads(),1);f.narrow(true);release();await tick();
  assert.equal(f.modelBuilds(),0);assert.equal(f.boxBuilds(),0);
});
for(const reject of [false,true])test('an in-flight 3D result cannot mount after leaving the preview: '+reject,async()=>{
  let release;const waiting=new Promise((resolve,fail)=>{release=()=>reject?fail(new Error('fixture failed')):resolve();});
  const f=fixture({lean:false,threeD:true,realModel:true,preload:()=>waiting});
  f.api.pvSetChar(base);f.show('team-select');release();await tick();
  assert.equal(f.modelBuilds(),0);assert.equal(f.boxBuilds(),0);
});
test('first team selection opens before it starts the visible static video',()=>{
  const f=fixture({screen:'team'});f.api.pickTeam('E');
  assert.equal(f.node('char-select').classList.contains('hidden'),false);
  assert.equal(f.video.src,presentation.video.webm+'?v=fixture');
});
test('compact media assigns only the visible card and leaves the hidden hero without an image',()=>{
  const f=fixture({compact:true});f.api.pvSetChar(base);
  assert.equal(f.node('char-preview-static').src,'');
  assert.equal(f.node('hub-character-portrait').src,'');
  assert.equal(f.node('char-select-portrait').src,presentation.poster+'?v=fixture');
});
test('3D preview retains the selected angle while idle animation advances',()=>{
  const f=fixture({lean:false});let updates=0,renders=0;
  const model={rotation:{y:0.73}};f.api.preview({model,ctrl:{update(){updates++;}},r:{render(){renders++;}}});
  f.api.frame(0.05);f.api.frame(0.05);
  assert.equal(model.rotation.y,0.73);assert.equal(updates,2);assert.equal(renders,2);
});
test('reduced motion stops idle while retaining the selected angle and a rendered frame',()=>{
  const f=fixture({lean:false});let updates=0,renders=0;
  const model={rotation:{y:0}};f.api.preview({model,ctrl:{update(){updates++;}},r:{render(){renders++;}}});
  f.api.frame(0.05);assert.equal(model.rotation.y,0);assert.equal(updates,1);
  const angle=model.rotation.y;f.reduceMotion();f.api.frame(0.05);
  assert.equal(model.rotation.y,angle);assert.equal(updates,1);assert.equal(renders,2);
});
function frameCounts({travado=false,reduced=false,mixer=false}={},f=fixture({lean:false,reduced})){
  let updates=0,renders=0;const model={rotation:{y:0.37}};const driver={update(){updates++;}};
  f.api.preview({model,travado,ctrl:mixer?null:driver,mixer:mixer?driver:null,r:{render(){renders++;}}});
  f.api.frame(0.05);f.api.frame(0.05);
  return {updates,renders,yaw:model.rotation.y};
}
test('locked preview keeps the pose and still renders a frame (ctrl)',()=>{
  const c=frameCounts({travado:true});
  assert.equal(c.updates,0);assert.equal(c.renders,2);assert.equal(c.yaw,0.37);
});
test('locked preview keeps the pose and still renders a frame (mixer)',()=>{
  const c=frameCounts({travado:true,mixer:true});
  assert.equal(c.updates,0);assert.equal(c.renders,2);assert.equal(c.yaw,0.37);
});
for(const mixer of [false,true])test('locked and reduced motion together render without advancing idle: '+(mixer?'mixer':'ctrl'),()=>{
  const c=frameCounts({travado:true,reduced:true,mixer});
  assert.equal(c.updates,0);assert.equal(c.renders,1);assert.equal(c.yaw,0.37);
});
test('team and character thumbnail callers avoid GLB preloads and renders in compact mode',async()=>{
  const f=fixture({compact:true,lean:false});f.api.ensureTeamPreviews();await tick();
  assert.equal(f.api.pvThumb(base),'/img/chars-hero/barbudo.webp?v=fixture');
  assert.equal(f.api.glbThumb(base),'/img/chars-hero/barbudo.webp?v=fixture');
  assert.equal(f.preloads(),0);assert.equal(f.thumbnailRenders(),0);
});
test('invisible team thumbnails do not mount even placeholder image markup',async()=>{
  const f=fixture({lean:false});f.api.ensureTeamPreviews();await tick();
  assert.equal(f.node('#btn-team-e .team-chars').innerHTML,'');
  assert.equal(f.node('#btn-team-b .team-chars').innerHTML,'');
  assert.equal(f.preloads(),0);assert.equal(f.modelBuilds(),0);
});
for(const transition of ['screen','tab','network'])test('compact callbacks are invalidated on actual navigation: '+transition,()=>{
  const f=fixture({compact:true,screen:'hub'});f.api.pvSetChar(base);
  const image=f.node('hub-character-portrait'),old=image.onerror,loaded=image.onload;
  if(transition==='screen')f.api.show('team-select');else if(transition==='tab')f.api.setHubTab('ranking');else f.api.setHubNet('mp');
  assert.equal(image.src,'');assert.equal(image.hidden,true);assert.equal(image.onerror,null);
  old();loaded();assert.equal(image.src,'');assert.equal(image.hidden,true);assert.equal(f.node('hub-character-equipment').hidden,true);
  f.api.refreshMenuEquipment();assert.equal(image.src,'');
});
test('inventory refresh through the real caller keeps an unchanged video loaded', () => {
  const f=fixture();f.api.pvSetChar(base);f.api.pvSetVideo(base);const count=f.video.loads;
  f.api.pvSetChar(base);f.api.pvSetVideo(base);
  assert.equal(f.video.loads,count);
});
test('an image failure callback queued for another character cannot hide its replacement', () => {
  const f=fixture();f.api.showStaticPreview(cyborg);const failed=f.node('char-preview-static').onerror;
  f.api.showStaticPreview(base);f.node('char-preview-static').onload();failed();
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
const replace=(from,to)=>value=>{assert.equal(value.split(from).length-1,1,'mutation anchor missing or ambiguous');return value.replace(from,to);};
for(const [name,mutate,probe,options={}] of [
  ['hardcoded PT preview branch',replace("const previewCopy = (pt, en) => LANG === 'en' ? en : pt;",'const previewCopy = (pt, en) => pt;'),f=>{f.api.showStaticPreview(cyborg);assert.equal(f.node('char-preview-weapon').textContent,'Paint: Pistol · Ouro');},{lang:'en',vibe:'pistol',paints:{pistol:'ouro-pistol'}}],
  ['base poster substituted',replace('return skin?(skin.poster?', 'return false?(skin.poster?'),f=>{f.api.showStaticPreview(cyborg);assert.equal(f.node('char-preview-static').src,presentation.poster+'?v=fixture');}],
  ['video stop loses ownership token',replace('pvVidToken++;',''),async f=>{f.api.pvSetVideo(cyborg);const old=f.video.onloadeddata;f.api.pvStopVideo();old();await tick();assert.equal(f.box.classList.contains('has-video'),false);}],
  ['reduced motion ignored',replace('if(!src || pvReducedMotion.matches','if(!src || false'),f=>{f.api.pvSetVideo(cyborg);assert.equal(f.video.src,'');},{reduced:true}],
  ['same presentation reloads',replace('if(key===pvStaticKey)return;',''),f=>{f.api.pvSetChar(base);f.api.pvSetVideo(base);const n=f.video.loads;f.api.pvSetChar(base);f.api.pvSetVideo(base);assert.equal(f.video.loads,n);}],
  ['old image failure retained',replace('image.onerror = () => {if(my!==pvImageToken)return;','image.onerror = () => {'),f=>{f.api.showStaticPreview(cyborg);const old=f.node('char-preview-static').onerror;f.api.showStaticPreview(base);f.node('char-preview-static').onload();old();assert.equal(f.node('char-preview-static').classList.contains('hidden'),false);}],
  ['explicit base trial overwritten',replace("Object.prototype.hasOwnProperty.call(def,'skinId')?def.skinId:equippedTretaSkin(def.id)",'equippedTretaSkin(def.id)'),f=>{f.api.pvSetChar({...base,skinId:null});assert.equal(f.node('char-preview-static').src,'/img/chars-hero/barbudo.webp?v=fixture');}],
  ['poster failure forgotten when video stops',replace('if(label && pvPosterFailure){','if(false){'),async f=>{f.api.showStaticPreview(cyborg);f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();f.node('char-preview-static').onerror();f.reduceMotion();assert.match(f.node('char-preview-skin').textContent,/indisponível/);}],
  ['failed play promotes video',replace('try{await video.play();}catch{if(my===pvVidToken)pvStopVideo();return;}','void video.play().catch(()=>{});'),async f=>{f.api.pvSetVideo(cyborg);f.video.onloadeddata();await tick();assert.equal(f.box.classList.contains('has-video'),false);},{play:()=>Promise.reject(new Error('fixture blocked'))}],
  ['compact thumbnail renders on the GPU',replace('staticPreviews || pvCompact.matches','staticPreviews'),f=>{f.api.pvThumb(base);assert.equal(f.thumbnailRenders(),0);},{compact:true,lean:false}],
  ['3D return leaves canvas hidden',replace("$('char-preview')?.classList.remove('hidden');$('char-preview-static')?.classList.add('hidden');",''),f=>{f.api.pvSetChar(base);f.compact(false);f.api.refreshMenuEquipment();assert.equal(f.node('char-preview').classList.contains('hidden'),false);},{compact:true,lean:false,threeD:true}],
  ['team preview preloads hidden models',replace('const ready = previewUsesStills() ?','const ready = false ?'),async f=>{f.api.ensureTeamPreviews();await tick();assert.equal(f.preloads(),0);},{compact:true,lean:false,teamVisible:true}],
  ['width change listener removed',replace("pvNarrow.addEventListener?.('change',()=>refreshMenuEquipment());",''),f=>{f.narrow(false);assert.equal(f.homeRefreshes(),1);},{narrow:true,screen:'hub'}],
  ['selection opens after video setup',replace("show('char-select');\n    if (firstRow) selectChar(chars[0], firstRow);","if (firstRow) selectChar(chars[0], firstRow);\n    show('char-select');"),f=>{f.api.pickTeam('E');assert.equal(f.video.src,presentation.video.webm+'?v=fixture');},{screen:'team'}],
  ['hidden hero image still loads',replace('if(!previewHeroVisible()){','if(false){'),f=>{f.api.pvSetChar(base);assert.equal(f.node('char-preview-static').src,'');},{compact:true}],
  ['inactive compact card still loads',replace('if(!active){','if(false){'),f=>{f.api.pvSetChar(base);assert.equal(f.node('hub-character-portrait').src,'');},{compact:true}],
  ['idle overwrites the selected angle',replace('if (!pv.travado && !pvReducedMotion.matches) {\n        if (pv.ctrl)','pv.model.rotation.y += pvDt * 0.9;\n      if (!pv.travado && !pvReducedMotion.matches) {\n        if (pv.ctrl)'),f=>{const model={rotation:{y:0}};f.api.preview({model,r:{render(){}}});f.api.frame(0.05);assert.equal(model.rotation.y,0);}],
  ['reduced motion still advances idle',replace('if (!pv.travado && !pvReducedMotion.matches) {','if (!pv.travado) {'),f=>{let updates=0;f.api.preview({model:{rotation:{y:0}},ctrl:{update(){updates++;}},r:{render(){}}});f.api.frame(0.05);assert.equal(updates,0);},{reduced:true}],
  ['locked preview still advances idle',replace('if (!pv.travado && !pvReducedMotion.matches) {','if (!pvReducedMotion.matches) {'),f=>{const c=frameCounts({travado:true},f);assert.equal(c.updates,0);}],
  ['late GLB mounts in a hidden preview',replace('if (my !== pvToken || !previewHeroVisible()) return;','if (my !== pvToken) return;'),async f=>{f.api.pvSetChar(base);f.show('team-select');await tick();assert.equal(f.modelBuilds(),0);},{lean:false,threeD:true,realModel:true}],
  ['late fallback mounts in a hidden preview',replace('if (my === pvToken && previewHeroVisible()) showStaticPreview(def);','if (my === pvToken) showStaticPreview(def);'),async f=>{f.api.pvSetChar(base);f.show('team-select');await tick();assert.equal(f.node('char-preview-static').src,'');},{lean:false,threeD:true,realModel:true,preload:()=>Promise.reject(new Error('fixture failed'))}],
  ['hidden team slots are populated',replace('if (!box || !(box.checkVisibility?.() ?? box.getClientRects().length > 0)) continue;','if (!box) continue;'),async f=>{f.api.ensureTeamPreviews();await tick();assert.equal(f.node('#btn-team-e .team-chars').innerHTML,'');},{lean:false}],
  ['screen change keeps compact media',replace("if (!id) for (const s of screens) document.getElementById(s).classList.add('hidden');\n  clearCompactPreviews();","if (!id) for (const s of screens) document.getElementById(s).classList.add('hidden');"),f=>{f.api.pvSetChar(base);f.api.show('team-select');assert.equal(f.node('hub-character-portrait').src,'');},{compact:true,screen:'hub'}],
  ['tab change keeps compact media',replace("$('main-menu').dataset.hubTab = tab;\n    clearCompactPreviews();","$('main-menu').dataset.hubTab = tab;"),f=>{f.api.pvSetChar(base);f.api.setHubTab('ranking');assert.equal(f.node('hub-character-portrait').src,'');},{compact:true,screen:'hub'}],
  ['network change keeps compact media',replace("$('main-menu').dataset.hubNet = net;\n    clearCompactPreviews();","$('main-menu').dataset.hubNet = net;"),f=>{f.api.pvSetChar(base);f.api.setHubNet('mp');assert.equal(f.node('hub-character-portrait').src,'');},{compact:true,screen:'hub'}],
  ['non-playing hub prepares a compact portrait',replace(" && menu.dataset.hubTab==='jogar' && menu.dataset.hubNet==='sp'",''),f=>{f.api.setHubNet('mp');f.api.pvSetChar(base);assert.equal(f.node('hub-character-portrait').src,'');},{compact:true,screen:'hub'}],
])test('causal mutant is rejected: '+name,async()=>{
  const f=fixture({...options,mutate});
  await assert.rejects(async()=>probe(f),{name:'AssertionError'});
});

for(const transition of ['screen','tab','network'])test('hero image invalidated: '+transition,()=>{const f=fixture({screen:'hub'});f.api.showStaticPreview(base);const img=f.node('char-preview-static');assert.ok(img.src);if(transition==='screen')f.api.show('team-select');if(transition==='tab')f.api.setHubTab('ranking');if(transition==='network')f.api.setHubNet('mp');assert.equal(img.src,'');assert.equal(img.onload,null);assert.equal(img.onerror,null);});
test('stale hero error cannot start hidden fallback',()=>{const f=fixture({screen:'hub'});f.api.showStaticPreview(base);const img=f.node('char-preview-static'),error=img.onerror;f.api.show('team-select');error();assert.equal(img.src,'');});
test('returning hero gets a fresh callback and request',()=>{const f=fixture();f.api.showStaticPreview(base);const img=f.node('char-preview-static'),error=img.onerror;f.api.show('team-select');f.api.show('char-select');f.api.showStaticPreview(base);assert.ok(img.src);assert.notEqual(img.onerror,error);});
test('catch that rethrows is not a contained play',()=>assert.equal(playGuard(['try{await video.play();}catch{throw new Error("play failed");}'],0),false));

function unavailableAfterPending(compact,mutate){
  const old=presentation.poster;
  try{
    const f=fixture({compact,screen:compact?'hub':'selection',mutate});
    if(compact)f.api.pvSetChar({...base,skinId:null});else f.api.showStaticPreview(base);
    const img=f.node(compact?'hub-character-portrait':'char-preview-static'),label=f.node(compact?'hub-character-equipment':'char-preview-skin'),loaded=img.onload,failed=img.onerror;
    assert.ok(img.src.includes('/img/chars'));presentation.poster=null;
    if(compact)f.api.pvSetChar(cyborg);else f.api.showStaticPreview(cyborg);
    assert.equal(img.src,'','previous request still installed for a skin without poster');assert.equal(img.onload,null);assert.equal(img.onerror,null);
    loaded();failed();assert.match(label.textContent,/indisponível.*Cyborg/i);assert.equal(compact?img.hidden:img.classList.contains('hidden'),true);
  }finally{presentation.poster=old;}
}
for(const compact of [false,true])test('skin without poster cancels the previous pending image: '+compact,()=>unavailableAfterPending(compact));
for(const compact of [false,true])test('new portrait stays hidden until its own load completes: '+compact,()=>{
  const f=fixture({compact,screen:compact?'hub':'selection'});if(compact)f.api.pvSetChar(cyborg);else f.api.showStaticPreview(cyborg);
  const img=f.node(compact?'hub-character-portrait':'char-preview-static');assert.equal(compact?img.hidden:img.classList.contains('hidden'),true);img.onload();assert.equal(compact?img.hidden:img.classList.contains('hidden'),false);
});
for(const [compact,anchor] of [[false,"const my=++pvImageToken;\n    image.onload=image.onerror=null;image.removeAttribute('src');"],[true,"image.dataset.previewToken=my;let fallback=false;\n    image.onload=image.onerror=null;image.removeAttribute('src');"]])test('causal mutant rejects a retained pending image: '+compact,()=>{
  assert.equal(raw.split(anchor).length-1,1);assert.throws(()=>unavailableAfterPending(compact,value=>value.replace(anchor,anchor.replace("image.removeAttribute('src');",''))),/previous request still installed/);
});

// Captured callbacks exercise ownership; natural browser delivery across A→exit→A
// has not been reproduced. A content key may be reused, a request token may not.
function compactReturnCallback(event,mutate){
  const f=fixture({compact:true,screen:'hub',mutate});f.api.pvSetChar(cyborg);
  const img=f.node('hub-character-portrait'),old=img[event==='load'?'onload':'onerror'];
  f.api.show('team-select');f.api.show('main-menu');f.api.pvSetChar(cyborg);
  if(event==='error')img.onload();old();
  assert.equal(img.hidden,event==='load','old same-key callback changed current visibility');
}
for(const event of ['load','error']){
  test('old compact callback stays invalid after returning to the same key: '+event,()=>compactReturnCallback(event));
  test('causal mutant rejects content key reuse as callback ownership: '+event,()=>{
    const anchor=event==='load'?'image.onload=()=>{if(image.dataset.previewToken!==my)return;':'image.onerror=()=>{if(image.dataset.previewToken!==my)return;';
    const mutate=replace(anchor,anchor.replace('image.dataset.previewToken!==my','image.dataset.previewKey!==key'));
    assert.throws(()=>compactReturnCallback(event,mutate),/old same-key callback changed current visibility/);
  });
}
function compactReturnHub(volta){
  const f=fixture({compact:true,screen:'hub'});f.api.pvSetChar(cyborg);
  const img=f.node('hub-character-portrait');
  if(volta==='jogar')f.api.setHubTab('ranking');else f.api.setHubNet('mp');
  assert.equal(img.src,'');assert.equal(img.hidden,true);assert.equal(f.node('hub-character-equipment').hidden,true);
  const before=f.homeRefreshes();
  if(volta==='jogar')f.api.setHubTab('jogar');else f.api.setHubNet('sp');
  assert.equal(f.homeRefreshes(),before+1);
  assert.equal(img.src,presentation.poster+'?v=fixture');
  img.onload();assert.equal(img.hidden,false);
}
test('returning to jogar reinstalls the compact portrait after ranking',()=>compactReturnHub('jogar'));
test('returning to sp reinstalls the compact portrait after mp',()=>compactReturnHub('sp'));
function baseFallbackVisible(compact,mutate){
  const f=fixture({compact,screen:compact?'hub':'selection',mutate});
  if(compact)f.api.pvSetChar({...base,skinId:null});else f.api.showStaticPreview(base);
  const img=f.node(compact?'hub-character-portrait':'char-preview-static'),loaded=img.onload;
  img.onerror();assert.equal(img.src,'/img/chars/barbudo.webp?v=fixture');
  assert.equal(img.onload,loaded,'fallback retains its current request handler');img.onload?.();
  assert.equal(compact?img.hidden:img.classList.contains('hidden'),false,'loaded base fallback is hidden');
}
for(const compact of [false,true]){
  test('successful base fallback becomes visible through its retained load handler: '+compact,()=>baseFallbackVisible(compact));
  test('causal mutant rejects a lost base fallback load handler: '+compact,()=>{
    const anchor=compact?'fallback=true;image.src=portraitFallbackUrl(def);':'image.src=portraitFallbackUrl(def);}};';
    const mutate=replace(anchor,anchor.replace('image.src=','image.onload=null;image.src='));
    assert.throws(()=>baseFallbackVisible(compact,mutate),/fallback retains its current request handler/);
  });
}

async function teamSideProbe(f){
 f.api.ensureTeamPreviews();await tick();assert.notEqual(f.node('#btn-team-e .team-chars').innerHTML,'');assert.equal(f.node('#btn-team-b .team-chars').innerHTML,'');
 const calls=f.preloads();f.teamVisibility({E:false,B:true});f.api.ensureTeamPreviews();await tick();assert.notEqual(f.node('#btn-team-b .team-chars').innerHTML,'');assert.equal(f.preloads(),calls+1);
 f.teamVisibility({E:true,B:true});f.api.ensureTeamPreviews();await tick();assert.equal(f.preloads(),calls+1);
}
test('team thumbnails remember completed sides separately when visibility changes',async()=>teamSideProbe(fixture({lean:false,teamVisible:{E:true,B:false}})));

test('causal mutation restoring global team completion loses the later visible side',async()=>{
 const mutate=value=>[['const teamPreviewsDone = new Set();','let teamPreviewsDone = false;'],['teamPreviewsDone.has(lado) || teamPreviewsPending.has(lado)','teamPreviewsDone || teamPreviewsPending.has(lado)'],['teamPreviewsDone.add(lado);','teamPreviewsDone = true;']].reduce((source,pair)=>replace(...pair)(source),value);
 await assert.rejects(()=>teamSideProbe(fixture({lean:false,teamVisible:{E:true,B:false},mutate})));
});

function frozenCaptureProbe({mixer=false,mutate}={}){
 const f=fixture({mutate}),model={rotation:{y:.73}};let updates=0,renders=0;
 const driver={update(){updates++;}};
 f.api.preview({travado:true,model,ctrl:mixer?null:driver,mixer:mixer?driver:null,r:{render(){renders++;}}});
 f.api.frame(.05);assert.equal(updates,0,'frozen capture advanced the pose');assert.equal(model.rotation.y,.73);assert.equal(renders,1);
}
for(const mixer of [false,true])test('capture freeze preserves pose and rendering: '+(mixer?'mixer':'controller'),()=>frozenCaptureProbe({mixer}));
test('control mutation rejects pose updates during frozen capture',()=>assert.throws(()=>frozenCaptureProbe({mutate:replace('!pv.travado && !pvReducedMotion.matches','!pvReducedMotion.matches')}),/frozen capture advanced the pose/));
async function failedPreloadPreservesModel({previous=true,hidden=false,mutate}={}){
 const old=previous?{rotation:{y:.73}}:null;let fail;
 const pending=new Promise((_r,no)=>{fail=no;});
 const f=fixture({lean:false,threeD:true,realModel:true,previousModel:old,preload:()=>pending,mutate});
 f.api.pvSetChar(base);if(hidden)f.show('team-select');fail(new Error('fixture preload failed'));await tick();
 const expected=0;
 assert.equal(f.boxBuilds(),expected,'failed preload replaced an existing or hidden model');
 if(previous)assert.equal(f.mountedModel(),old,'failed preload lost the previous model');
}
for(const [previous,hidden] of [[true,false],[true,true],[false,false],[false,true]])test('preload failure respects model and visibility: '+previous+'/'+hidden,()=>failedPreloadPreservesModel({previous,hidden}));
test('control mutation rejects replacing an existing model on preload failure',()=>assert.rejects(failedPreloadPreservesModel({mutate:replace('if (my === pvToken && previewHeroVisible()) showStaticPreview(def);','if (my === pvToken && previewHeroVisible()) showBox();')}),/failed preload replaced/));
test('obsolete preload failure cannot mount a fallback for the new selection',async()=>{
 let failOld,finishNew,calls=0;
 const old=new Promise((_r,no)=>{failOld=no;}),next=new Promise(resolve=>{finishNew=resolve;});
 const f=fixture({lean:false,threeD:true,realModel:true,preload:()=>++calls===1?old:next});
 f.api.pvSetChar(base);f.api.pvSetChar({...base,skinId:null});failOld(new Error('old failure'));await tick();
 const boxes=f.boxBuilds();finishNew();await tick();assert.equal(boxes,0,'obsolete failure mounted fallback');assert.equal(f.modelBuilds(),1);
});

test('preview GLB template rejects a missing equipped cosmetic while game fallback remains available',()=>{
 assert.equal(templateDecision(cyborg,{preview:true},{available:false}),null);
 assert.equal(templateDecision(cyborg,{},{available:false}).kind,'base');
 assert.equal(templateDecision(cyborg,{preview:true}).kind,'skin');
 assert.equal(templateDecision({...base,skinId:null},{preview:true},{available:false}).kind,'base');
});
test('failed cosmetic preload never presents the base GLB as the equipped preview',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true,cosmeticAvailable:false});
 f.api.pvSetChar(cyborg);await tick();
 assert.equal(f.mountedModel(),null,'base model falsely represents equipped skin');
 assert.equal(f.node('char-preview').classList.contains('hidden'),true);
 assert.equal(f.node('char-preview-static').src,presentation.poster+'?v=fixture');
});
test('failed replacement keeps the previous object hidden behind the correct poster',async()=>{
 const old={rotation:{y:.73}},f=fixture({lean:false,threeD:true,realModel:true,previousModel:old,preload:()=>Promise.reject(new Error('failed'))});
 f.api.pvSetChar(cyborg);await tick();
 assert.equal(f.mountedModel(),old);assert.equal(f.node('char-preview').classList.contains('hidden'),true,'wrong previous model is visible');
 const image=f.node('char-preview-static');assert.equal(image.src,presentation.poster+'?v=fixture');image.onload();assert.equal(image.classList.contains('hidden'),false);
});
test('model handoff lets its pending poster finish without revealing it again',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true});
 f.api.pvSetChar(cyborg);const image=f.node('char-preview-static'),url=image.src;await tick();
 assert.equal(image.src,url,'model handoff aborted an in-flight poster');
 assert.equal(image.classList.contains('hidden'),true);assert.equal(f.node('char-preview').classList.contains('hidden'),false);
 assert.equal(typeof image.onload,'function');image.onload();
 assert.equal(image.src,'');assert.equal(image.onload,null);assert.equal(image.onerror,null);
 assert.equal(image.classList.contains('hidden'),true);
});
test('completed poster is released immediately when its model arrives',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true});f.node('char-preview-static').complete=true;
 f.api.pvSetChar(cyborg);await tick();const image=f.node('char-preview-static');
 assert.equal(image.src,'');assert.equal(image.onload,null);assert.equal(image.onerror,null);
});
test('leaving a model handoff still cancels its pending poster immediately',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true});f.api.pvSetChar(cyborg);await tick();
 const image=f.node('char-preview-static');assert.ok(image.src);const settled=image.onload;
 f.api.show('team-select');assert.equal(image.src,'');assert.equal(image.onload,null);assert.equal(image.onerror,null);
 settled();assert.equal(image.src,'');assert.equal(image.classList.contains('hidden'),true);
});
test('late poster settlement cannot clear a newer selection',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true});f.api.pvSetChar(cyborg);await tick();
 const image=f.node('char-preview-static');assert.ok(image.src);const settled=image.onload;
 f.api.showStaticPreview({...base,skinId:null});const next=image.src;settled();assert.equal(image.src,next);
});
test('failed pending poster after model handoff never replaces the model or shows an error',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true});f.api.pvSetChar(cyborg);await tick();
 const image=f.node('char-preview-static');assert.ok(image.src);image.onerror();
 assert.equal(image.src,'');assert.equal(image.classList.contains('hidden'),true);
 assert.equal(f.node('char-preview').classList.contains('hidden'),false);assert.equal(f.node('char-preview-skin').hidden,true);
});
test('failed team preload is retried without duplicating a pending request',async()=>{
 let fail,calls=0;const pending=new Promise((_r,no)=>{fail=no;});
 const f=fixture({lean:false,teamVisible:{E:true,B:false},preload:()=>++calls===1?pending:Promise.resolve()});
 f.api.ensureTeamPreviews();f.api.ensureTeamPreviews();assert.equal(f.preloads(),1);
 fail(new Error('failed'));await tick();f.api.ensureTeamPreviews();await tick();assert.equal(f.preloads(),2,'failed side permanently marked complete');
 f.api.ensureTeamPreviews();await tick();assert.equal(f.preloads(),2);
});

test('causal mutant rejects silently replacing a missing cosmetic with the base GLB',()=>{
 const changed=replace('  if (opts.preview && def.skinId && !skin) return null;\n','')(glbRaw);
 const wrong=templateDecision(cyborg,{preview:true},{available:false,mutate:()=>changed});
 assert.throws(()=>assert.equal(wrong,null),/Expected values/);
});
test('causal mutant rejects caching a failed team before completion',async()=>{
 let fail,calls=0;const pending=new Promise((_r,no)=>{fail=no;});
 const f=fixture({lean:false,teamVisible:{E:true,B:false},preload:()=>++calls===1?pending:Promise.resolve(),mutate:replace('    teamPreviewsPending.add(lado);','    teamPreviewsPending.add(lado);teamPreviewsDone.add(lado);')});
 f.api.ensureTeamPreviews();fail(new Error('failed'));await tick();f.api.ensureTeamPreviews();await tick();
 assert.throws(()=>assert.equal(f.preloads(),2,'failed side not retried'),/failed side not retried/);
});

test('poster fallback suspends the hidden previous GLB render loop',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true,cosmeticAvailable:false});
 f.api.pvSetChar(cyborg);await tick();assert.equal(f.api.previewModelActive(true,false),false);
});
test('causal mutant rejects rendering the previous GLB behind a fallback poster',async()=>{
 const f=fixture({lean:false,threeD:true,realModel:true,cosmeticAvailable:false,mutate:replace(" && !$('char-preview')?.classList.contains('hidden')",'')});
 f.api.pvSetChar(cyborg);await tick();assert.throws(()=>assert.equal(f.api.previewModelActive(true,false),false));
});

test('desktop hub keeps equipment identity in the character card without a duplicate portrait request',()=>{
 const f=fixture({lean:false,threeD:true,realModel:true,screen:'hub'});f.api.pvSetChar(cyborg);
 const label=f.node('hub-character-equipment');assert.equal(label.hidden,false);assert.match(label.textContent,/Cyborg.*Ouro/);
 assert.equal(f.node('hub-character-portrait').src,'');
 f.api.setHubTab('loja');assert.equal(label.hidden,true);
});

for(const visible of [false,true])test('team thumbnails use actual layout when checkVisibility is absent: '+visible,async()=>{
 const f=fixture({lean:false,teamVisible:visible,teamVisibilityAPI:false});f.api.ensureTeamPreviews();await tick();
 assert.equal(f.preloads(),visible?2:0);
 assert.equal(f.node('#btn-team-e .team-chars').innerHTML!=='',visible);
});
test('reduced-motion preview only redraws after invalidation',()=>{
 const f=fixture({reduced:true,lean:false});let renders=0;
 const p={model:{rotation:{y:0}},r:{render(){renders++;}}};f.api.preview(p);
 f.api.frame(.05);f.api.frame(.05);assert.equal(renders,1);
 p.renderDirty=true;f.api.frame(.05);f.api.frame(.05);assert.equal(renders,2);
});

test('causal mutant rejects redrawing an unchanged reduced-motion frame',()=>{
 const f=fixture({reduced:true,lean:false,mutate:replace('      if (pvReducedMotion.matches && pv.renderDirty === false) return;\n','')});let renders=0;
 f.api.preview({model:{rotation:{y:0}},r:{render(){renders++;}}});f.api.frame(.05);f.api.frame(.05);
 assert.throws(()=>assert.equal(renders,1),{name:'AssertionError'});
});
test('new model invalidates an already rendered reduced-motion preview',async()=>{
 const f=fixture({reduced:true,lean:false,threeD:true,realModel:true});let renders=0;
 const p=f.previewDescriptor();p.r={render(){renders++;}};f.api.preview(p);f.api.frame(.05);
 f.api.pvSetChar(cyborg);await tick();assert.equal(f.renderDirty(),true);
 f.api.frame(.05);f.api.frame(.05);assert.equal(renders,2);
});

function previewInput(mutate=value=>value){
 const handlers={},canvas={addEventListener(name,fn){handlers[name]=fn;},setPointerCapture(){}},p={model:{rotation:{y:.2}},cam:{position:{z:3.2}},renderDirty:false};
 const input=raw.slice(raw.indexOf("  canvas.addEventListener('pointerdown'"),raw.indexOf('  return pv;',raw.indexOf("  canvas.addEventListener('pointerdown'")));
 vm.runInNewContext(mutate(input),{pv:p,canvas,pvDrag:null});return {p,handlers};
}
for(const event of ['pointermove','wheel'])test('actual '+event+' handler invalidates reduced-motion frame',()=>{
 const {p,handlers}=previewInput();handlers.pointerdown({clientX:0,pointerId:1});
 handlers[event]({clientX:20,deltaY:100,preventDefault(){}});assert.equal(p.renderDirty,true);
});
for(const [event,anchor] of [['pointermove','pv.renderDirty = true; }'],['wheel','    pv.renderDirty = true;']])test('causal mutant rejects lost '+event+' invalidation',()=>{
 const {p,handlers}=previewInput(replace(anchor,anchor.replace('pv.renderDirty = true;','')));
 handlers.pointerdown({clientX:0,pointerId:1});handlers[event]({clientX:20,deltaY:100,preventDefault(){}});
 assert.throws(()=>assert.equal(p.renderDirty,true),{name:'AssertionError'});
});
function thumbnailInvalidation(mutate=value=>value){
 const p={model:{visible:true},scene:{add(){},remove(){}},r:{render(){},domElement:{}},renderDirty:false};
 const code=raw.slice(raw.indexOf('function snapThumb('),raw.indexOf('// Each character shows off a weapon'));
 vm.runInNewContext(mutate(code)+'\nsnapThumb({},"fallback");',{ensurePreview:()=>p,thumbCam(){},THUMB_PX:128,document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=>''})}});
 return p;
}
test('thumbnail rendering restores an invalidated hero frame',()=>assert.equal(thumbnailInvalidation().renderDirty,true));
test('causal mutant rejects a thumbnail left on the shared hero canvas',()=>{
 const p=thumbnailInvalidation(replace('  p.renderDirty = true;\n',''));
 assert.throws(()=>assert.equal(p.renderDirty,true),{name:'AssertionError'});
});
test('causal mutant rejects checkVisibility-only team thumbnails on older browsers',async()=>{
 const f=fixture({lean:false,teamVisible:true,teamVisibilityAPI:false,mutate:replace('if (!box || !(box.checkVisibility?.() ?? box.getClientRects().length > 0)) continue;','if (!box || box.checkVisibility?.() !== true) continue;')});
 f.api.ensureTeamPreviews();await tick();assert.throws(()=>assert.equal(f.preloads(),2),{name:'AssertionError'});
});

test('causal mutant rejects mounting a new model without invalidating its frame',async()=>{
 const f=fixture({reduced:true,lean:false,threeD:true,realModel:true,mutate:replace('    p.renderDirty = true;\n','')});
 const p=f.previewDescriptor();p.r={render(){}};f.api.preview(p);f.api.frame(.05);
 f.api.pvSetChar(cyborg);await tick();assert.throws(()=>assert.equal(f.renderDirty(),true),{name:'AssertionError'});
});

async function emoteFixture({reduced=false,mutate=value=>value,mutateListener=value=>value}={}){
 const buttons=[],attrs=new Map(),bar={hidden:false,innerHTML:'',classList:{add(){},remove(){}},querySelectorAll:()=>buttons,querySelector:()=>buttons[0],appendChild:b=>buttons.push(b)};
 let active=null,starts=0,stops=0,sync;
 const ctrl={emoteAtual:()=>active,emote:id=>{active=id;starts++;},pararEmote:()=>{active=null;stops++;}},motion=new EventTarget();motion.matches=reduced;
 const node=()=>({dataset:{},setAttribute:(k,v)=>attrs.set(k,v)});
 const start=raw.indexOf('function sincronizaBarraEmotes()'),end=raw.indexOf('\nfunction pvSetChar(def)',start);assert.ok(start>=0&&end>start);
 const ctx={pv:{ctrl},pvReducedMotion:motion,staticPreviews:false,EMOTES_ENABLED:true,document:{getElementById:id=>id==='pv-emotes'?bar:null,createElement:node},carregaEmotes:async()=>({EMOTES:[{id:'dance',nome:'Dance',origem:'fixture'}]})};
 const api=vm.runInNewContext('let emotesMontados=false;\n'+mutate(raw.slice(start,end))+'\n({sincronizaBarraEmotes,pvTocaEmote,montaBarraEmotes})',ctx);
 const listenerStart=raw.indexOf("pvReducedMotion.addEventListener?.('change'");const listenerEnd=raw.indexOf('\n',listenerStart);assert.ok(listenerEnd>listenerStart);
 vm.runInNewContext(mutateListener(raw.slice(listenerStart,listenerEnd)),{...ctx,sincronizaBarraEmotes:api.sincronizaBarraEmotes,pvStopVideo(){}});
 const toggle=value=>{motion.matches=value;const event=new Event('change');event.matches=value;motion.dispatchEvent(event);};
 return{api,bar,ctrl,toggle,attrs,button:node(),starts:()=>starts,stops:()=>stops};
}
test('reduced-motion users are not offered an inactive dance button',async()=>{
 const f=await emoteFixture({reduced:true});f.api.sincronizaBarraEmotes();assert.equal(f.bar.hidden,true);
 f.api.pvTocaEmote('dance',f.button);assert.equal(f.starts(),0);assert.equal(f.attrs.has('aria-pressed'),false);
});
test('turning reduced motion on stops the current dance and synchronizes the bar',async()=>{
 const f=await emoteFixture();f.api.sincronizaBarraEmotes();f.api.pvTocaEmote('dance',f.button);assert.equal(f.starts(),1);
 f.toggle(true);assert.equal(f.bar.hidden,true);assert.equal(f.ctrl.emoteAtual(),null);
 f.toggle(false);assert.equal(f.bar.hidden,false);assert.equal(f.ctrl.emoteAtual(),null);
});

for(const [name,from,to,probe] of [
 ['hidden bar','!staticPreviews && !pvReducedMotion.matches && !!(pv && pv.ctrl)','!staticPreviews && !!(pv && pv.ctrl)',f=>{f.api.sincronizaBarraEmotes();assert.equal(f.bar.hidden,true);}],
 ['blocked stale click','if (!ctrl || pvReducedMotion.matches) return;','if (!ctrl) return;',f=>{f.api.pvTocaEmote('dance',f.button);assert.equal(f.starts(),0);}],
])test('causal mutant rejects reduced-motion dance '+name,async()=>{
 const f=await emoteFixture({reduced:true,mutate:replace(from,to)});assert.throws(()=>probe(f),{name:'AssertionError'});
});

test('reduced motion switched during emote loading cannot start a hidden dance',async()=>{
 const f=await emoteFixture();const pending=f.api.montaBarraEmotes();f.toggle(true);await pending;
 assert.equal(f.bar.hidden,true);assert.equal(f.starts(),0);assert.equal(f.ctrl.emoteAtual(),null);
});
for(const [name,from,probe] of [
 ['stop current dance','pv?.ctrl?.pararEmote?.();',f=>assert.equal(f.ctrl.emoteAtual(),null)],
 ['sync controls','sincronizaBarraEmotes();',f=>assert.equal(f.bar.hidden,true)],
])test('causal mutant rejects reduced-motion toggle without '+name,async()=>{
 const f=await emoteFixture({mutateListener:replace(from,'')});f.api.pvTocaEmote('dance',f.button);f.toggle(true);
 assert.throws(()=>probe(f),{name:'AssertionError'});
});
