// G2-R14A — prova do crash CTF na Havan: mede memória (JS heap, renderer.info, GPU
// estimada por textura) e simula a captura de bandeira (teleporta o player pra zona,
// espera os 3s de captura). Detecta crash do renderer (page.on('crash')).
// Uso: node tools/eval/aposentados/g2r14-memprobe.mjs [segundosPosCaptura]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const WAIT = parseFloat(process.argv[2] || '8');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--enable-precise-memory-info'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
let crashed = false;
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
page.on('crash', () => { crashed = true; console.error('!!! RENDERER CRASH (Aw Snap) !!!'); });

await page.goto(`${BASE}/?debug=1&auto=P,mst&map=loja_h&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
// fast-forward: em swiftshader o countdown de 3s (game-time) leva ~60s wall — avança o relógio
await page.waitForFunction(() => {
  const g = window.__game;
  if (g.state === 'countdown') g.time += 0.5;
  return g.state === 'live';
}, null, { timeout: 60000, polling: 200 });
await page.waitForTimeout(1500);

const probe = () => page.evaluate(() => {
  const g = window.__game, r = g.renderer, THREE_MAPS = ['map', 'metalnessMap', 'roughnessMap', 'normalMap', 'emissiveMap', 'aoMap', 'alphaMap'];
  let texBytes = 0, texCount = 0; const seen = new Set();
  const scan = (o) => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) for (const k of THREE_MAPS) {
      const t = m[k];
      if (t && t.image && !seen.has(t.uuid)) {
        seen.add(t.uuid); texCount++;
        const w = t.image.width || 0, h = t.image.height || 0;
        texBytes += w * h * 4 * 1.33;   // RGBA + mipmaps
      }
    }
  };
  g.scene.traverse(scan);
  if (g.vmScene) g.vmScene.traverse(scan);   // os viewmodels moram na cena própria
  // VMs estáticos carregados (templates clonados na cena do vm.root)
  const vmKeys = Object.keys(g.vm?.staticVms || {});
  return {
    jsHeapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
    jsHeapLimitMB: +(performance.memory.jsHeapSizeLimit / 1048576).toFixed(0),
    geometries: r.info.memory.geometries, textures: r.info.memory.textures,
    programs: r.info.programs.length, calls: r.info.render.calls, tris: r.info.render.triangles,
    sceneTexCount: texCount, sceneTexGpuMB: +(texBytes / 1048576).toFixed(1),
    staticVmKeys: vmKeys.length,
  };
});

const before = await probe();
console.log('MEM pós-boot (Havan CTF):', JSON.stringify(before, null, 1));

// Simula a captura: teleporta o player pra uma bandeira neutra/inimiga e FAST-FORWARD
// do game-time (swiftshader roda a ~1fps — 3s de captura seriam minutos de wall-clock).
// Chama _updateCTF com dt real: exercita o MESMO caminho de código da captura (owner,
// captureSound, HUD, win check) que o dono rodava quando o renderer morreu.
const cap0 = await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = 1e9;
  for (const b of g.bots) { b.pos.set(0, -200, 0); b.hp = 0; b.alive = false; b.respawnAt = 1e9; }   // isola: repro do dono sem interferência
  const pt = g.ctfPts[g.ctfPts.length - 1];   // bandeira do lado inimigo
  g.player.pos.set(pt.x, 0, pt.z);
  return { pt: { id: pt.id, x: pt.x, z: pt.z, owner: pt.owner } };
});
console.log('teleportado p/ bandeira:', JSON.stringify(cap0));

let captured = false;
for (let t = 0; t < WAIT && !crashed; t++) {
  const s = await page.evaluate(() => {
    const g = window.__game;
    for (let i = 0; i < 10; i++) g._updateCTF(0.1);   // +1s de game-time por iteração
    const pt = g.ctfPts[g.ctfPts.length - 1];
    return { owner: pt.owner, prog: +(pt.prog || 0).toFixed(2), caps: g.ctfCaps, heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) };
  });
  console.log(`cap+${t + 1}s(game)`, JSON.stringify(s));
  if (s.owner) { captured = true; break; }
  await page.waitForTimeout(300);
}
// Fase 2: troca por TODAS as armas-herói (força o lazy-load de cada arms_*.glb) e mede
// o crescimento de heap/GPU — prova de que o cache funciona e nada estoura.
const HEROES = ['m4', 'mp5', 'p90', 'tavor', 'famas', 'svd', 'awp', 'uzi', 'm92', 'shotgun', 'deagle', 'knife', 'ak'];
for (const w of HEROES) {
  if (crashed) break;
  const r = await page.evaluate(async (wid) => {
    const g = window.__game;
    g._switchWeapon(wid); g.player.drawUntil = 0;
    // espera o lazy-load construir o VM da classe (até 60s — GLBs de ~19MB em swiftshader,
    // com várias heróis na fila o decode pode demorar)
    const t0 = performance.now();
    while (performance.now() - t0 < 60000) {
      const key = Object.entries(g.vm.staticVms).find(([k, m]) => m.visible);
      if (key) return { w: wid, vm: key[0], waitMs: (performance.now() - t0) | 0, heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), tex: g.renderer.info.memory.textures };
      await new Promise(r => setTimeout(r, 250));
    }
    return { w: wid, vm: null, heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) };
  }, w);
  console.log('switch', JSON.stringify(r));
  await page.waitForTimeout(200);
}
const after = crashed ? null : await probe();
if (after) console.log('MEM final (pós-captura + troca de heróis):', JSON.stringify(after, null, 1));
console.log('\n=== RESULTADO ===');
console.log('captura CTF concluída sem crash:', captured && !crashed);
console.log('renderer crash:', crashed);
console.log('erros de console:', errs.length, errs.slice(0, 5));
await browser.close();
process.exit(crashed || errs.length ? 1 : 0);
