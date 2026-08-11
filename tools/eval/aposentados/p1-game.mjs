// P1 — captura + sondagem in-game, UMA sessão de browser por alvo.
// POR QUE existe (em vez de reusar gl-shots.mjs): (a) sob SwiftShader o screenshot
// estoura o timeout padrão e derruba o processo, levando junto os alvos seguintes;
// (b) esta rodada precisa de PROVAS numéricas específicas — o jogador não cair fora
// do mundo em fy_pool_day e o armário estar em cima de mesa ATRÁS do spawn — que
// nenhuma captura de tela sozinha demonstra.
// Uso: node tools/eval/p1-game.mjs <outDir> [alvo1,alvo2...]
//   alvo = <mapa>@<aspecto>, aspecto = 169 | 32
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/root/shots/p1';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const ASPECTS = { '169': [1600, 900], '32': [1500, 1000] };
const AUTO = { awp_map: 'P,mst', fy_pool_day: 'P,mst', fy_havan: 'B,bozo', fy_ferrovelho: 'B,bozo' };
const TARGETS = (process.argv[3] || 'awp_map@169,awp_map@32,fy_pool_day@169,fy_havan@169').split(',');

mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const RES = existsSync(`${OUT}/_p1-metrics.json`) ? JSON.parse(readFileSync(`${OUT}/_p1-metrics.json`, 'utf8')) : [];
const save = () => writeFileSync(`${OUT}/_p1-metrics.json`, JSON.stringify(RES, null, 2));

for (const tgt of TARGETS) {
  const [map, aName = '169'] = tgt.split('@');
  const [W, H] = ASPECTS[aName] || ASPECTS['169'];
  const rec = { map, aspect: aName, errs: [], shots: [] };
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => rec.errs.push('[pageerror] ' + e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error') rec.errs.push('[console] ' + m.text().slice(0, 220)); });
  const shot = async (n) => {
    try { await page.screenshot({ path: `${OUT}/${n}.png`, timeout: 300000 }); rec.shots.push(n + '.png'); }
    catch (e) { rec.errs.push(`[shot ${n}] ` + e.message.split('\n')[0]); }
  };
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/?debug=1&map=${map}&auto=${AUTO[map] || 'P,mst'}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
    rec.tLive = +((Date.now() - t0) / 1000).toFixed(1);
    await page.waitForTimeout(8000);

    // SONDA 1 — geometria de spawn/armário/pickups. Roda antes de mexer na câmera.
    rec.probe = await page.evaluate(() => {
      const g = window.__game, w = g.world, p = g.player;
      const drops = (g.drops || []);
      const rack = drops.filter(d => d.rack);
      const chao = drops.filter(d => !d.rack);
      const sp = (w.spawns && w.spawns[g.playerTeam]) || [];
      const spz = sp.length ? sp[0].z : null;
      const ys = rack.map(d => +((d.mesh ? d.mesh.position.y : -99) || 0).toFixed(2));
      const zs = rack.map(d => +d.z.toFixed(2));
      // "atrás do spawn" = mais longe do centro (|z| do armário > |z| do spawn)
      const atras = spz === null ? null : zs.every(z => Math.abs(z) > Math.abs(spz) - 0.01 && Math.sign(z) === Math.sign(spz));
      return {
        estado: g.state,
        playerPos: { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2) },
        chaoNoPlayer: +(w.groundHeightAt ? w.groundHeightAt(p.pos.x, p.pos.z) : 0).toFixed(2),
        bounds: w.bounds || null,
        spawnZ: spz, spawnCount: sp.length,
        rackTotal: rack.length,
        rackYmin: ys.length ? Math.min(...ys) : null,
        rackYmax: ys.length ? Math.max(...ys) : null,
        rackZ: [...new Set(zs)].sort((a, b) => a - b),
        rackAtrasDoSpawn: atras,
        mesas: (g._rackFurniture || []).length,
        dropsNoChao: chao.length,
        pickupsDoMapa: (w.pickups || []).length,
        pickupsY: (w.pickups || []).slice(0, 40).map(pk => +(pk.mesh ? pk.mesh.position.y : -99).toFixed(2)),
        colliders: (w.colliders || []).length,
      };
    });

    // 4 ângulos: frente do spawn + 3 giros de ~92°, cobrindo 360°.
    await shot(`game-${map}-${aName}-a`);
    for (let i = 1; i <= 3; i++) {
      await page.evaluate(() => { const g = window.__game; if (g && g.player) g.player.yaw = (g.player.yaw || 0) + 1.6; });
      await page.waitForTimeout(2500);
      await shot(`game-${map}-${aName}-${'bcd'[i - 1]}`);
    }

    // SONDA 2 — o jogador cai fora do mundo? Corre 25 s com input sintético e
    // registra o pior y e se saiu do bounds. É o teste que o dono pediu pro pool.
    rec.queda = await page.evaluate(async () => {
      const g = window.__game, p = g.player, w = g.world;
      let minY = p.pos.y, foraBounds = 0, nan = 0, amostras = 0;
      const b = w.bounds;
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1]];
      for (let k = 0; k < dirs.length; k++) {
        // dirige o jogador pelo mesmo mapa de teclas que o input real usa
        g.keys = g.keys || {};
        const [fx, fz] = dirs[k];
        p.yaw = Math.atan2(fx, fz);
        g.keys['KeyW'] = true;
        const t1 = performance.now();
        while (performance.now() - t1 < 3500) {
          await new Promise(r => setTimeout(r, 100));
          amostras++;
          if (!isFinite(p.pos.y) || !isFinite(p.pos.x)) nan++;
          if (p.pos.y < minY) minY = p.pos.y;
          if (b && (p.pos.x < b.minX - 1 || p.pos.x > b.maxX + 1 || p.pos.z < b.minZ - 1 || p.pos.z > b.maxZ + 1)) foraBounds++;
        }
        g.keys['KeyW'] = false;
      }
      return {
        minY: +minY.toFixed(2), amostras, foraBounds, nan,
        fim: { x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2) },
        chaoNoFim: +(w.groundHeightAt ? w.groundHeightAt(p.pos.x, p.pos.z) : 0).toFixed(2),
      };
    });
    await shot(`game-${map}-${aName}-e-poswalk`);

    // SONDA 3 — vista de CIMA do spawn olhando pra trás: é a prova visual do armário.
    try {
      await page.evaluate(() => {
        const g = window.__game, p = g.player, w = g.world;
        const sp = (w.spawns && w.spawns[g.playerTeam]) || [];
        if (!sp.length) return;
        const s = sp[Math.floor(sp.length / 2)];
        const back = s.z > 0 ? 1 : -1;
        p.pos.x = s.x; p.pos.z = s.z - back * 6; p.pos.y = (w.groundHeightAt ? w.groundHeightAt(p.pos.x, p.pos.z) : 0);
        p.vel && p.vel.set && p.vel.set(0, 0, 0);
        p.yaw = back > 0 ? 0 : Math.PI;   // olhando PRA o armário (pro lado de fora)
        p.pitch = -0.18;
      });
      await page.waitForTimeout(3000);
      await shot(`game-${map}-${aName}-f-armario`);
    } catch (e) { rec.errs.push('[armario] ' + e.message.split('\n')[0]); }

    // métricas depois de ~30 s vivo
    const liveMs = Date.now() - (t0 + rec.tLive * 1000);
    if (liveMs < 30000) await page.waitForTimeout(30000 - liveMs);
    rec.metrics = await page.evaluate(() => {
      const g = window.__game, r = g && g.renderer, i = r && r.info;
      return {
        calls: i ? i.render.calls : null, tris: i ? i.render.triangles : null,
        textures: i ? i.memory.textures : null, geometries: i ? i.memory.geometries : null,
        programs: i && i.programs ? i.programs.length : null,
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
        state: g ? g.state : null,
      };
    });
  } catch (e) {
    rec.fatal = e.message.split('\n')[0];
  }
  RES.push(rec); save();
  console.log('[done] ' + JSON.stringify({ map, aspect: aName, tLive: rec.tLive, fatal: rec.fatal, erros: rec.errs.length }));
  try { await page.close(); } catch (e) { }
  await browser.close();
}
save();
console.log(JSON.stringify(RES, null, 2));
