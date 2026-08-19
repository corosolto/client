// Captura 3:2 do JOGO REAL para a régua visual do RC1 (plans/23): fog == horizonte.
// Uma câmera fixa por mapa × duas direções, posicionada para ver geometria distante
// encontrando o céu — é lá que o descaso fog/sky aparece. Antes × depois com o MESMO
// enquadramento (a tabela SHOTS é a memória do enquadramento).
//
// Uso: npm run eval:serve (outra aba) && node tools/eval/look-capture.mjs /tmp/look-antes
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/look-shots';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// [mapa, rótulo, [x, y, z], yaw, pitch]
const SHOTS = [
  ['fy_mansao', 'piscina-mar', [0, 1.7, 30], Math.PI, 0.02],
  ['fy_mansao', 'jardim-casa', [0, 1.7, -28], 0, 0.02],
  ['fy_corrego', 'margem-norte', [0, 1.7, 33], Math.PI, 0.02],
  ['fy_corrego', 'margem-sul', [0, 1.7, -33], 0, 0.02],
  ['fy_campomorro', 'trave-leste', [30, 1.7, 0], -Math.PI / 2, 0.02],
  ['fy_campomorro', 'trave-oeste', [-30, 1.7, 0], Math.PI / 2, 0.02],
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
  await page.addStyleTag({ content: '#hud,.screen{display:none!important}' });
  await page.evaluate(([p, yw, pt]) => {
    const g = window.__game, pl = g.player;
    pl.hp = 1e9;
    pl.pos.set(p[0], p[1], p[2]);
    if (pl.vel) pl.vel.set(0, 0, 0);
    pl.yaw = yw; pl.pitch = pt;
    if (g.vm && g.vm.root) g.vm.root.visible = false;
  }, [pos, yaw, pitch]);
  await page.waitForTimeout(900);   // alguns frames: névoa, sky e composite assentam
  await page.screenshot({ path: `${OUT}/${mapId}-${label}.png` });
  console.log('  shot', `${mapId}-${label}.png`);
}
await browser.close();
console.log('frames ->', OUT);
