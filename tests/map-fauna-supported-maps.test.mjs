import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE,MAPS,initTextures,carregaMapa } from '../tools/eval/harness.mjs';
await Promise.all(['campomorro','corrego','quebrada','escadao'].map(carregaMapa));
for(const [map,counts] of [['campomorro',{cat:2,chicken:2}],['corrego',{cat:1,chicken:1}],['quebrada',{cat:1}]])test(`${map}: all authored cats and hens use curated preloaded assets and bounded routes`,()=>{
 const world=MAPS[map].build(new THREE.Scene(),initTextures());
 try {
  for(const [type,count] of Object.entries(counts)){
   const animals=world.ambience.animals.filter(a=>a.type===type),id=type==='cat'?'escadaoCat':'sertaoHen';
   assert.equal(animals.length,count);assert.ok(MAPS[map].ambience.includes(id));
   for(const a of animals){assert.equal(a.root.userData.assetId,id);assert.ok(a.fleeArea);assert.equal(a.turnRate,6);}
  }
  if(map==='campomorro')for(const a of world.ambience.animals.filter(a=>a.type==='chicken'||a.id==='cat-1')){
   assert.equal(typeof a.heightAt,'function');
   for(let i=0;i<600;i++){world.ambience.update(1/60,null);const p=a.root.position;assert.ok(Math.abs(p.y-world.groundHeightAt(p.x,p.z))<1e-9);}
  }
 }finally{world.ambience.dispose();}
});

test('low keeps the curated census and caps only legacy ambient fauna', async () => {
  const { apararFaunaLow } = await import('../public/js/ambientlife.js');
  const curada = (id) => ({ assetId: id });
  assert.deepEqual(apararFaunaLow([curada('a'), {}, curada('b'), {}], true).map((c) => c.assetId || 'legacy'), ['a', 'legacy', 'b']);
  assert.equal(apararFaunaLow([{}, {}, {}], true).length, 1);
  assert.equal(apararFaunaLow([{}, {}, {}], false).length, 3);
  const fs = await import('node:fs/promises');
  for (const mapa of ['campomorro', 'quebrada']) {
    const fonte = await fs.readFile(new URL(`../public/js/map_${mapa}.js`, import.meta.url), 'utf8');
    assert.match(fonte, /createFavelaAmbience\(root,\s*\{[^}]*low: LOWQ/, `${mapa}: ambience precisa seguir a qualidade real (LOWQ), não o teto de textura`);
  }
});

test('Escadao curated cat and hen follow the rendered terrace rather than the lower collision datum',()=>{
 const world=MAPS.escadao.build(new THREE.Scene(),initTextures()),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 try{
  const targets=world.ambience.animals.filter(a=>a.type==='cat'||a.type==='chicken');assert.equal(targets.length,2);
  for(let frame=0;frame<600;frame++){
   world.ambience.update(1/60,null);if(frame%30)continue;world.root.updateMatrixWorld(true);
   for(const a of targets){const p=a.root.position;ray.set(new THREE.Vector3(p.x,p.y+.2,p.z),down);ray.far=.4;
    const hit=ray.intersectObject(world.root,true).find(h=>{for(let n=h.object;n;n=n.parent)if(n===world.ambience.group||!n.visible)return false;return true;});
    assert.ok(hit,`${a.id} rendered support missing`);assert.ok(Math.abs(hit.point.y-p.y)<1e-6,`${a.id} root ${p.y} differs from rendered support ${hit.point.y}`);
   }
  }
 }finally{world.ambience.dispose();}
});
