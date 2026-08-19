// Captura 3:2 do JOGO REAL para a régua visual do RC1 (plans/23): fog == horizonte.
// Uma câmera elevada por mapa × duas direções opostas, para ver geometria distante
// encontrando o céu — é lá que o descaso fog/sky aparece. Antes × depois com o
// MESMO enquadramento (a tabela SHOTS é a memória do enquadramento).
//
// Uso: node tools/eval/serve.mjs 8127 (outra aba) && BASE=http://localhost:8127 node tools/eval/look-capture.mjs /tmp/look-antes
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/look-shots';
const BASE = process.env.BASE || 'http://localhost:8127';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// [mapa, rótulo, [x, y, z], yaw, pitch] — elevada de propósito: a costura névoa/céu
// mora na linha do horizonte, e do chão a maioria dos mapas fecha a vista com muro.
const SHOTS = [
  ['fy_mansao', 'mar', [-8, 5, -18], 0, -0.10],
  ['fy_mansao', 'casa', [0, 4, 30], Math.PI, -0.10],
  ['fy_corrego', 'norte', [0, 7, -28], 0, -0.08],
  ['fy_corrego', 'sul', [0, 7, 28], Math.PI, -0.08],
  ['fy_campomorro', 'norte', [0, 4, 0], 0, -0.06],
  ['fy_campomorro', 'sul', [0, 4, 0], Math.PI, -0.06],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

for (const [mapId, label, pos, yaw, pitch] of SHOTS) {
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${mapId}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
  await page.addStyleTag({ content: '#hud,.screen,#crash-overlay{display:none!important}' });
  // câmera presa por intervalo: a gravidade derruba o jogador entre um frame e outro;
  // re-afixar a cada 120 ms segura o enquadramento até o screenshot.
  const pin = await page.evaluateHandle(([p, yw, pt]) => {
    const g = window.__game, pl = g.player;
    pl.hp = 1e9;
    if (g.vm && g.vm.root) g.vm.root.visible = false;
    return setInterval(() => {
      pl.pos.set(p[0], p[1], p[2]);
      if (pl.vel) pl.vel.set(0, 0, 0);
      pl.yaw = yw; pl.pitch = pt;
      pl.hp = 1e9; if (pl.alive === false) pl.alive = true;
      if (g.vm && g.vm.models) for (const k in g.vm.models) g.vm.models[k].visible = false;
    }, 120);
  }, [pos, yaw, pitch]);
  await page.waitForTimeout(900);   // alguns frames: névoa, sky e composite assentam
  await page.screenshot({ path: `${OUT}/${mapId}-${label}.png` });
  await page.evaluate((id) => clearInterval(id), pin);
  console.log('  shot', `${mapId}-${label}.png`);
}
await browser.close();
console.log('frames ->', OUT);
