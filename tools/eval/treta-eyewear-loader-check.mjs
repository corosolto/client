import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
let source=readFileSync(new URL('../../public/js/eyewear.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replaceAll('export async function','async function').replaceAll('export function','function');
if(process.argv.includes('--mutant=no-retry')){const previous=source;source=source.replace('manifest=null;return {eyewear:{}};','return {eyewear:{}};');assert.notEqual(source,previous,'mutation did not apply');}
let calls=0,loads=0;
const context={THREE:{},GLTFLoader:class{async loadAsync(){loads++;return {scene:{}};}},console,fetch:async()=>{calls++;return {ok:calls>1,json:async()=>({eyewear:{test:{approved:true,model:'/models/items/test.glb',profiles:{capitao:{approved:true,width:.96,height:.44,depth:.04}}}}})};}};
vm.createContext(context);vm.runInContext("const TRETA_ITEMS_ENABLED = true;\n"+source,context);
await context.preloadEyewearAssets(['test']);assert.equal(loads,0);
await Promise.all([context.preloadEyewearAssets(['test']),context.preloadEyewearAssets(['test'])]);
assert.equal(calls,2,'Transient manifest failure must permit a second fetch');assert.equal(loads,1,'Concurrent preload must deduplicate GLB');
await context.preloadEyewearAssets(['test']);assert.equal(loads,1);
console.log('PASS: transient manifest error recovers; concurrent and cached preload load one GLB');
