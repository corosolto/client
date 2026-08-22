// CAPTURA DE EVIDÊNCIA 3:2 — fy_corrego (frente B do swarm v2.1.0: fauna GLB + água).
// Mesmo padrão do lajes-evidence-capture (jogo real, não mapview): o dono revisa em 3:2.
// Uso: BASE=http://127.0.0.1:8131 node tools/eval/corrego-evidence-capture.mjs [outDir] [TAG]
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || 'tools/eval/asset-evidence/maps/fy_corrego/round';
const TAG = process.argv[3] || '';
const BASE = process.env.BASE || 'http://127.0.0.1:8131';
const VW = 1500, VH = 1000;   // 3:2 — o recorte em que o dono revisa

// [nome, x, y, z, yaw, pitch] — forward = (-sin yaw, -cos yaw): yaw 0 = norte(-z)
// Jacaré: proxy/GLB em (0.8, ~-1.7, -7), meio submerso na lâmina (-1.61).
// Capivara: margem alagada sul (-5.2, ~0.4, -38).
const POSES = [
  ['jacare-canal', 2.5, -1.15, -3.5, 0.40, -0.12],
  ['jacare-ponte-c', 0, 0.9, -2.5, 0, -0.55],
  ['capivara-margem', -2.0, 1.5, -34.5, 0.74, -0.23],
  ['capivara-perto', -4.0, 1.1, -36.4, 3.5, -0.18],
  ['agua-ponte-norte', 0, 1.6, -21, 0, -0.35],
  ['agua-rasante', 4.5, 0.2, 6, 0.643, -0.23],
  ['agua-fundo-canal', 2.2, -1.4, -16, 0.9, -0.1],
  ['geral-alta', 10, 8, -26, 0.558, -0.4],
];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_corrego`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; } catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await page.waitForTimeout(1500);   // GLBs de fauna/prps terminam de assentar
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
  if (g.vm && g.vm.root) g.vm.root.visible = false;
});
for (const [nome, x, y, z, yaw, pitch] of POSES) {
  await page.evaluate(([px, py, pz, yw, pt]) => {
    const g = window.__game;
    g.player.pos.set(px, py, pz);
    g.player.yaw = yw; g.player.pitch = pt;
    g.player.vel.set(0, 0, 0);
    g.player.grounded = true;
  }, [x, y, z, yaw, pitch]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${TAG}${nome}.png`, timeout: 90000 });
  console.log('  shot', nome);
}
console.log(`DONE -> ${OUT} | 0 erros = ${errors === 0}`);
await browser.close();
process.exit(errors ? 1 : 0);
