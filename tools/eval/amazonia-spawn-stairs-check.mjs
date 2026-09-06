// PR #527: orientação, subida física de todas as escadas e janela B vista de dentro.
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (mutant && !['virar-b', 'bloquear-lance', 'fechar-janela'].includes(mutant)) throw Error('Mutante desconhecido');
if (mutant === 'virar-b') {
  const source = new URL('../../public/js/map_amazonia.js', import.meta.url), target = new URL(`../../public/js/.amz-stairs-${process.pid}.mjs`, import.meta.url);
  const before = '{ x: 17, z: 29, d: [-1, 0], e: 1 }', text = readFileSync(source, 'utf8');
  if (text.split(before).length !== 2) throw Error('Mutação sem alvo único');
  try { writeFileSync(target, text.replace(before, '{ x: 17, z: 29, d: [-1, 0], e: -1 }')); MAPS.amazonia.build = (await import(pathToFileURL(fileURLToPath(target)))).buildAmazonia; }
  finally { unlinkSync(target); }
}
const game = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007, bots: 0 }), world = game.world;
const stationB = world.amazonia.estacoes.find(s => s.x === 17 && s.z === 29);
if (mutant === 'bloquear-lance') {
  const f = stationB.peEscada, z = f.z + Math.sign(stationB.patamar.z-f.z);
  world.colliders.push({ minX:f.x-1, maxX:f.x+1, minZ:z-.2, maxZ:z+.2, minY:0, maxY:8 });
}
const cabin = world.cabins.find(c => c.x === 17 && c.z === 29), window = cabin.windows.find(w => w.wall === 'left');
if (mutant === 'fechar-janela') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.16, window.top-window.bottom, window.width), new THREE.MeshBasicMaterial());
  mesh.position.fromArray(window.center); world.root.add(mesh); world.occluders.push(mesh); mesh.updateMatrixWorld(true);
}
const stations = world.amazonia.estacoes.filter(s => s.temEscada), spawns = Object.entries(world.spawns).flatMap(([team, ps]) => ps.map(p => ({ ...p, team })));
const records = stations.map(station => {
  const foot = station.peEscada, top = station.patamar;
  const spawn = [...spawns].sort((a,b) => Math.hypot(a.x-top.x,a.z-top.z)-Math.hypot(b.x-top.x,b.z-top.z))[0];
  const facing = (foot.x-top.x)*(spawn.x-top.x)+(foot.z-top.z)*(spawn.z-top.z);
  const p = game.player; p.pos.set(foot.x, world.groundHeightAt(foot.x,foot.z,0),foot.z);
  p.vel.set(0,0,0); p.yaw = 0; p.crouchF = 0; p.grounded = true; p.jumpBufUntil = -1; p.weapon = 'knife';
  let ticks = 0;
  for (; ticks < 600; ticks++) {
    const dx = top.x-p.pos.x, dz = top.z-p.pos.z, d = Math.hypot(dx,dz);
    if (d < .1) break;
    game.time += 1/60; game._moveEntity(p,{ax:dx/d,az:dz/d,shift:true,jump:false},1/60);
  }
  return { station:[station.x,station.z], foot, top, spawn, facing, ticks, end:p.pos.toArray(),
    facingRespawn:facing>0, climbed:ticks<600 && Math.abs(p.pos.y-world.amazonia.deckY)<.05 };
});
const origin = new THREE.Vector3(window.center[0]+.6, cabin.floorY+1.6, window.center[2]);
const views = [-.4,0,.4].map(dz => {
  const target = new THREE.Vector3(0,-.12,origin.z+dz), dir = target.clone().sub(origin), dist = dir.length();
  const hits = new THREE.Raycaster(origin,dir.normalize(),0,dist-.05).intersectObjects(world.occluders,true);
  return { target:target.toArray(), hits:hits.length, first:hits[0] ? {name:hits[0].object.name,distance:hits[0].distance} : null };
});
const valid = records.length === world.cabins.length-1 && records.every(r => r.facingRespawn && r.climbed) && views.every(v=>v.hits===0);
const report = { valid, mutant, scope:'Geometria procedural e física reais no arnês Node; GLBs e imagem WebGL não medidos.', records, windowOrigin:origin.toArray(), views };
const out = process.argv.find(a=>a.startsWith('--out='))?.slice(6); if(out)writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2)); game.dispose(); process.exit(valid ? 0 : 1);
