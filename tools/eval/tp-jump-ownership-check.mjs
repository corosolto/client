// Salto interrompido deixava jumping ativo: baseline18/40, candidato40/40.
// Controladores/rigs reais em CPU; escopo e mutação em docs/visual-factory/TP-JUMP-OWNERSHIP.md.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root = process.cwd();
const option = name => process.argv.find(x => x.startsWith(name + '='))?.slice(name.length + 1);
const output = option('--out');
if (output) assert(!fs.existsSync(output), 'preserve existing output');
const loadedInputs = {};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function read(file) {
  const bytes = fs.readFileSync(file);
  loadedInputs[path.relative(root, file)] = hash(bytes);
  return bytes;
}
function assetPath(url) {
  const file = path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
  assert(file.startsWith(path.join(root, 'public') + path.sep), 'asset outside public');
  return file;
}
const localFetch = async url => {
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(read(file)) : new Response('', {status: 404});
};
Object.defineProperty(globalThis, 'fetch', {configurable: true, get: () => localFetch, set() {}});
const {THREE, Game: ActualGame, CHARACTERS} = await import(pathToFileURL(path.join(root, 'tools/eval/harness.mjs')));
const {GLTFLoader} = await import(pathToFileURL(path.join(root, 'public/vendor/addons/loaders/GLTFLoader.js')));
Object.defineProperty(globalThis, 'fetch', {configurable: true, writable: true, value: localFetch});
GLTFLoader.prototype.load = function(url, done, progress, fail) {
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'EXT_texture_webp', async loadTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  }}));
  Promise.resolve().then(async () => {
    const bytes = read(assetPath(url));
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch(error => fail?.(error));
};
// Overrides are reproduction aids; the default always checks the actual checkout.
const gameFile = path.resolve(option('--game-module') || path.join(root, 'public/js/game.js'));
const glbFile = path.resolve(option('--glb-module') || path.join(root, 'public/js/glbchars.js'));
const {Game} = await import(pathToFileURL(gameFile));
const G = await import(pathToFileURL(glbFile));
const sourceHashes = Object.fromEntries([gameFile, glbFile].map(f => [f, hash(read(f))]));


const rows=[],cases=[],controls=[];
const check=(name,pass)=>rows.push({name,pass:!!pass});
const actionName=c=>Object.keys(c.actions).find(k=>c.actions[k]===c.cur)??null;
const snap=c=>({action:actionName(c),name:c.curName,jumping:c.jumping,shooting:c.shooting,dead:c.dead,
 mixer:c.mixer.time,deadline:c._shootUntil??null,actions:Object.fromEntries(Object.entries(c.actions).map(([n,a])=>[n,{time:a.time,weight:a.getEffectiveWeight(),rate:a.timeScale,paused:a.paused,enabled:a.enabled,loop:a.loop,clamp:a.clampWhenFinished}]))});
for(const id of ['sertanejo','gotinha']) {
 const weapon=id==='sertanejo'?'ak':'pistol';await G.preloadCharacterAssets([id],{weapons:[weapon]});
 const build=()=>G.buildCharacterModel(CHARACTERS.find(d=>d.id===id),{weaponId:weapon}).ctrl;
 for(const kind of ['jump-only','jump-shoot-move','jump-death-revive','jump-crouch-release','shoot-jump-move']) {
  const c=build(),trace=[];if(kind==='shoot-jump-move')c.shoot();c.jump();
  check(id+'/'+kind+'/jump name',c.curName==='jump'&&c.cur===c.actions.jump&&c.jumping);
  const deadline=c._shootUntil, initialTime=c.actions.jump.time;c.jump();
  check(id+'/'+kind+'/repeat guard',Object.is(c.actions.jump.time,initialTime)&&c._shootUntil===deadline);
  trace.push({at:'entry',...snap(c)});
  for(let i=0;i<180;i++) {
   if(i===2&&kind==='jump-shoot-move')c.shoot();
   if(i===2&&kind==='jump-death-revive')c.die();
   if(i===8&&kind==='jump-death-revive')c.revive();
   if(i===2&&kind==='jump-crouch-release')c.setCrouch(true);
   if(i===30&&kind==='jump-crouch-release')c.setCrouch(false);
   c.update(1/60,kind==='jump-only'?0:1,false,kind==='jump-only'?0:2,false);
   if([0,2,8,30,90,179].includes(i))trace.push({frame:i,...snap(c)});
  }
  const last=trace.at(-1);check(id+'/'+kind+'/ownership lifecycle',trace.every(x=>!x.jumping||x.action==='jump')&&!last.jumping&&!last.shooting&&!last.dead&&/^(idle|idle1h|run|walk|walk1h)$/.test(last.action));
  cases.push({id,kind,trace});
 }
 {
  const c=build();c.jump();delete c.actions.shoot;c.shoot();c._to('absent');
  check(id+'/missing selections retain jump',c.jumping&&c.cur===c.actions.jump);
  c.setCrouch(true);c.shoot();c.jump();c.setCrouch(false);
  check(id+'/guard refusal retains jump',c.jumping&&c.cur===c.actions.jump);
  c._to('run');check(id+'/other actual selection cancels jump',!c.jumping&&c.cur===c.actions.run);
 }
 {
  const c=build();c.jump();delete c.actions.idle;c.revive();
  check(id+'/revive stops ownership even without idle',!c.jumping&&c.cur===null);
 }
 {
  const c=build();delete c.actions.jump;const before=snap(c);c.jump();
  check(id+'/missing jump no state change',JSON.stringify(snap(c))===JSON.stringify(before));
 }
 for(const kind of ['idle-control','shoot-control']) {
  const c=build(),trace=[];if(kind==='shoot-control')c.shoot();
  for(let i=0;i<180;i++){c.update(1/60,0,false,0,false);trace.push(snap(c));}
  controls.push({id,kind,trace});
 }
}
const result={scope:'actual controllers/GLTFLoader, CPU only; no Game event or physical jump',passed:rows.filter(r=>r.pass).length,total:rows.length,failed:rows.filter(r=>!r.pass),cases,controls,loadedInputs,sourceHashes};
if(output)fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({passed:result.passed,total:result.total,failed:result.failed.map(r=>r.name)}));if(result.failed.length)process.exitCode=1;
