// GAUNTLET 2.0 capture: entra numa partida debug (piscina_treta, outdoor claro), troca de
// arma via _switchWeapon e captura cada viewmodel. Viewport configurável (aspect 16:9 e
// 3:2 do MacBook do dono). Falha em qualquer erro de console.
// Uso: node tools/eval/g2-capture.mjs <outDir> <W,H> [arma1,arma2,...] [segundosEspera]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gauntlet/g2';
const [VW, VH] = (process.argv[3] || '1600,900').split(',').map(Number);
const LIST = (process.argv[4] || 'ak,akm,m4,mp5,g3,scar,famas,p90,deagle,pistol,revolver38,shotgun,md97,awp,knife').split(',');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
await page.waitForTimeout(1200);
// isola o player: bots vivos mas teleportados/congelados (sem respawn, sem round restart,
// sem bot cruzando a lente — r75 rondou esse problema: bot point-blank lia como "VM invasivo")
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
});

for (const id of LIST) {
  const ok = await page.evaluate((wid) => {
    const g = window.__game;
    if (!g._switchWeapon) return false;
    g._switchWeapon(wid); g.player.drawUntil = 0;
    // olhar levemente p/ o horizonte, parado — framing de referência
    g.player.pitch = 0; g.player.vel?.set?.(0, 0, 0);
    return true;
  }, id);
  await page.waitForTimeout(450);
  await page.evaluate(() => { const g = window.__game; g.player.drawUntil = 0; g.player.reloadUntil = 0; g.player.pitch = 0; });
  await page.screenshot({ path: `${OUT}/${id}.png` });
  // crop do quadrante do VM (canto inferior direito) p/ inspeção de mãos/attachments
  await page.screenshot({ path: `${OUT}/${id}-crop.png`, clip: { x: VW * 0.45, y: VH * 0.45, width: VW * 0.55, height: VH * 0.55 } });
  console.log(ok ? 'shot' : 'NO MODEL', id);
}
const meta = await page.evaluate(() => {
  const g = window.__game;
  return { aspect: innerWidth / innerHeight, vmFov: g.vmCamera?.fov, camFov: g.camera?.fov, vms: Object.keys(g.vm.staticVms || {}) };
});
console.log('meta', JSON.stringify(meta));
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
