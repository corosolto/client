// Diagnóstico no Game com GLBs: física de jogador real, tempo fixo, bots congelados.
// Não mede FPS. Reposiciona apenas o início de cada trajeto independente.
import { writeFileSync } from 'node:fs';
export async function walkAmazonia(page, out) {
  const routes = [
    ...[-24, 0, 24].flatMap(z => [
      { name: `ponte-${z}-leste`, from: [-10.7, .18, z], to: [10.7, .18, z] },
      { name: `ponte-${z}-oeste`, from: [10.7, .18, z], to: [-10.7, .18, z] },
    ]),
    { name: 'sair-agua-oeste', from: [-7, -.51, 20], to: [-11, 0, 20] },
    { name: 'sair-agua-leste', from: [7, -.51, 20], to: [11, 0, 20] },
    { name: 'passarela-A-C', from: [9.4, 1.8, -24.4], to: [9.4, 1.8, -10.6] },
    { name: 'passarela-C-D', from: [9.4, 1.8, -7.4], to: [9.4, 1.8, 4.4] },
    { name: 'passarela-D-M', from: [7.8, 1.8, 6], to: [1.6, 1.8, 6] },
    { name: 'passarela-M-F', from: [-1.6, 1.8, 6], to: [-7.8, 1.8, 6] },
  ];
  if (process.env.FOREST === '1') routes.push(
    {name:'mata-oeste',from:[-20,0,-22],to:[-20,0,-16]},
    {name:'mata-leste',from:[20,0,12],to:[20,0,18]},
  );
  const deckY = await page.evaluate(() => window.__game.world.amazonia.deckY);
  for (const r of routes) if (r.name.startsWith('passarela')) { r.from[1]=deckY; r.to[1]=deckY; }
  const stairs = await page.evaluate(() => {
    const w=window.__game.world;
    return w.amazonia.estacoes.filter(s=>s.peEscada).map(s=>({ name:`escada-${s.x}-${s.z}`,
      from:[s.peEscada.x,w.groundHeightAt(s.peEscada.x,s.peEscada.z,0),s.peEscada.z],
      to:[s.patamar.x,w.amazonia.deckY,s.patamar.z] }));
  });
  routes.push(...stairs);
  const results = [];
  for (const route of routes) {
    const result = await page.evaluate(route => {
      const g = window.__game, p = g.player, w = g.world;
      p.pos.set(...route.from); p.vel.set(0, 0, 0); p.alive = true; p.hp = 100;
      p.grounded = true; p.mantle = null; p.pitch = 0; p.crouchF = 0; p.scoped = false;
      g.touchMove = { x: 0, z: 0 }; g.keys = { KeyW: true };
      const samples = [], originalCollide = g._collide;
      let collideCalls = 0, ticks = 0;
      g._collide = function(...args) { collideCalls++; return originalCollide.apply(this, args); };
      try {
        for (; ticks < 2400; ticks++) {
          const dx = route.to[0] - p.pos.x, dz = route.to[2] - p.pos.z;
          if (Math.hypot(dx, dz) < .16) break;
          p.yaw = Math.atan2(-dx, -dz);
          g.time += 1 / 120; g._updatePlayer(1 / 120);
          if (ticks % 12 === 0) samples.push(p.pos.toArray());
        }
      } finally { g._collide = originalCollide; g.keys = {}; }
      const distance = Math.hypot(p.pos.x-route.to[0], p.pos.z-route.to[2]);
      return { ...route, end:p.pos.toArray(), ticks, collideCalls, distance, samples,
        ok:distance < .25 && collideCalls > 0 && Math.abs(p.pos.y-route.to[1]) < .31 };
    }, route);
    await page.screenshot({ path: `${out}/walk-${route.name}.png` });
    results.push(result);
    console.log(`${result.ok ? 'PASS' : 'FAIL'} WALK ${route.name}: residual=${result.distance.toFixed(3)}m, collide=${result.collideCalls}`);
  }
  const spawns = await page.evaluate(async () => {
    const THREE = await import('three'), g = window.__game, w = g.world;
    const ray = new THREE.Raycaster(), los = [], settlement = [];
    const pos = p => Array.isArray(p) ? new THREE.Vector3(...p) : new THREE.Vector3(p.x, p.y || 0, p.z);
    for (const [team, slots] of Object.entries(w.spawns)) for (const slot of slots) {
      const p = pos(slot); p.y = w.groundHeightAt(p.x,p.z,0);
      const before = p.clone(); g._collide(p,.38);
      settlement.push({team, before:before.toArray(), after:p.toArray(), shift:p.distanceTo(before)});
    }
    for (const a of w.spawns.E) for (const b of w.spawns.B) {
      const aa = pos(a), bb = pos(b); aa.y += 1.4; bb.y += 1.4;
      const dir = bb.clone().sub(aa), distance = dir.length();
      ray.set(aa,dir.normalize()); ray.far = distance;
      if (!ray.intersectObjects(w.occluders,true).length) los.push({a:aa.toArray(),b:bb.toArray()});
    }
    return { settlement, directLines:los, ok:los.length === 0 && settlement.every(s=>s.shift<.05) };
  });
  console.log(`${spawns.ok ? 'PASS' : 'FAIL'} SPAWNS: ${spawns.directLines.length} linhas diretas`);
  writeFileSync(`${out}/walk.json`, JSON.stringify({ routes:results, spawns },null,2));
  return results.every(r=>r.ok) && spawns.ok;
}
