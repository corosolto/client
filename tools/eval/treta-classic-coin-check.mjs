// Saci clássico integrado: movimento medido no mesmo loader do jogo.
import {TRETA_COIN_ART} from '../../public/js/treta-catalog.js';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(process.argv.includes('--mutations')){
 for(const [id,reason] of [['frozen-spin','angleTo(q)'],['missing-reveal','assert(clip)']]){
  const result=spawnSync(process.execPath,[new URL(import.meta.url).pathname,`--mutante=${id}`],{encoding:'utf8'});
  assert(result.status!==0 && result.stderr.includes(reason),`Mutante ${id} sobreviveu ou falhou sem medir animação`);
 }
 console.log('PASS: 2/2 mutações da moeda detectadas');process.exit(0);
}
import * as T from '../../public/vendor/three.module.js';
import {GLTFLoader} from '../../public/vendor/addons/loaders/GLTFLoader.js';
const raw=fs.readFileSync('public'+TRETA_COIN_ART.model),n=raw.readUInt32LE(12),j=JSON.parse(raw.subarray(20,20+n));
assert.equal(j.materials.length,2);assert(j.materials.every(m=>(m.pbrMetallicRoughness?.metallicFactor ?? 1)===1));delete j.images;delete j.textures;delete j.materials;delete j.extensionsUsed;delete j.extensionsRequired;for(const m of j.meshes)for(const p of m.primitives)delete p.material;
const json=Buffer.from(JSON.stringify(j)),pad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(pad);const bin=raw.subarray(20+n),h=Buffer.alloc(20);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(20+pad.length+bin.length,8);h.writeUInt32LE(pad.length,12);h.writeUInt32LE(0x4e4f534a,16);const b=Buffer.concat([h,pad,bin]);
const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');const root=g.scene.getObjectByName('TRETA_Coin_1'),mix=new T.AnimationMixer(g.scene);
assert(raw.length<1500000,'Moeda excede 1.5 MB');
let tris=0;g.scene.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?.count || o.geometry.attributes.position.count)/3;});assert(tris<60000,'Moeda excede 60 mil triângulos');
const mutant=process.argv.find(x=>x.startsWith('--mutante='))?.split('=')[1];
if(mutant==='missing-reveal'){const n=g.animations.length;g.animations=g.animations.filter(a=>a.name!=='PurchaseReveal');assert(g.animations.length<n,'MUTANTE NÃO APLICOU');}
if(mutant==='frozen-spin'){const clip=g.animations.find(c=>c.name==='CoinSpin');assert(clip,'MUTANTE NÃO APLICOU');for(const track of clip.tracks){const n=track.getValueSize();for(let i=n;i<track.values.length;i++)track.values[i]=track.values[i%n];}}

for(const name of ['CoinSpin','PurchaseReveal']){const clip=g.animations.find(c=>c.name===name);assert(clip);mix.stopAllAction();const a=mix.clipAction(clip);if(name==='PurchaseReveal'){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;}a.reset().play();mix.setTime(0);const q=root.quaternion.clone(),s=root.scale.length();mix.update(.75);assert(root.quaternion.angleTo(q)>.1);if(name==='PurchaseReveal')assert(root.scale.length()>s);console.log(name,clip.duration);}
console.log('PASS: gold and both animations in vendored loader');
