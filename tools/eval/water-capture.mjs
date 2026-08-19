// Captura 3:2 da ÁGUA (RC2, plans/23) no jogo real — Lei 4: número nenhum fecha
// água, a figura tem que ser OLHADA. Mesmo enquadramento do look-capture ('mar')
// + uma tomada alta da linha d'água (espuma/depth-fade leem de cima, como nos
// prints de referência do dono). Dois frames a 1,2 s de intervalo por tomada:
// o diff de pixels é a prova de que a onda/normais se movem.
//
// Uso: node tools/eval/serve.mjs 8141 (outra aba) && BASE=http://localhost:8141 node tools/eval/water-capture.mjs /tmp/rc2-agua
// GPU=0 força swiftshader (caminho 'low', sem composer — é o fallback uDepthOn=0);
// o padrão é GPU real: o swiftshader é marcado 'degraded' pelo glcontext e aí o
// jogo inteiro cai no caminho sem composer — a água viva (depth-fade/espuma) NÃO
// existe nesse caminho e a captura mediria o fallback, não a frente.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/rc2-agua';
const BASE = process.env.BASE || 'http://localhost:8141';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// [mapa, rótulo, [x, y, z], yaw, pitch]
const SHOTS = [
  ['fy_mansao', 'mar', [-8, 5, -18], 0, -0.10],        // MESMO enquadramento do look-capture
  ['fy_mansao', 'costa', [4, 14, -28], 0, -0.72],      // de cima: espuma, raso, fundo
  // RC2 córrego: DENTRO do canal (água entrável, 14 cm) e de cima do canal
  ['fy_corrego', 'dentro', [0, -0.1, 8], 0, -0.18],    // em pé na lâmina, olhando o canal
  ['fy_corrego', 'canal', [0, 6, 20], 0, -0.55],       // de cima: margens, pontes, lâmina
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: process.env.GPU === '0' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio']
    : ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text().slice(0, 300)); });

for (const [mapId, label, pos, yaw, pitch] of SHOTS) {
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${mapId}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
  await page.addStyleTag({ content: '#hud,.screen,#crash-overlay{display:none!important}' });
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
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${mapId}-${label}-t0.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${mapId}-${label}-t1.png` });
  const info = await page.evaluate(() => new Promise((res) => {
    const r = window.__game.renderer;
    r.info.autoReset = false; r.info.reset();
    let frames = 0;
    const conta = () => { if (++frames < 12) return requestAnimationFrame(conta);
      const out = { callsPorFrame: Math.round(r.info.render.calls / frames),
        trisPorFrame: Math.round(r.info.render.triangles / frames),
        waterDepthOn: window.__game.scene.userData.water ? window.__game.scene.userData.water.material.uniforms.uDepthOn.value : null };
      r.info.autoReset = true; res(out); };
    requestAnimationFrame(conta);
  }));
  console.log('  shot', `${mapId}-${label}-t0/t1.png`, JSON.stringify(info));
  await page.evaluate((id) => clearInterval(id), pin);
}
await browser.close();
console.log('frames ->', OUT);
