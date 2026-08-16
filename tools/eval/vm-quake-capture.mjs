// Captura A/B do viewmodel p/ tuning do look Quake 4/UT/Halo.
// Para cada arma: 1 frame com o VM visível + 1 frame com vm.root escondido (mesma cena,
// mesmo yaw) — o diff dos dois isola a máscara EXATA do viewmodel (arma + braços FP),
// sem máscara manual e sem o truque de girar o yaw. Também lê a rotação do grupo do VM
// de cada arma e REPROVA se pitch/yaw saírem de 0 (regra dura: cano paralelo à mira).
// Uso: node tools/eval/vm-quake-capture.mjs <outDir> [armas] [W,H] [extraQS]
//   ex: node tools/eval/vm-quake-capture.mjs /tmp/vmq/a svd,ak 1200,800 'vmfov=88&vmzmul=0.92'
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/vmq';
const LIST = (process.argv[3] || 'svd,ak').split(',');
const [W, H] = (process.argv[4] || '1200,800').split(',').map(Number);   // 1200×800 = 3:2
const XQS = process.argv[5] ? `&${process.argv[5]}` : '';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('[console.error]', m.text().slice(0, 200)); });
await page.goto(`${BASE}/?debug=1&auto=P,mst${XQS}`, { waitUntil: 'commit', timeout: 90000 });
await page.waitForFunction(() => !!window.__game, null, { timeout: 240000 });
// O rAF rasteja no headless/SwiftShader (segundos por frame) e o countdown nunca vira
// 'live' sozinho — força a virada e, daí em diante, dirige os frames NA MÃO via
// g.update() (que também renderiza, game.js update():5308). Determinístico.
await page.evaluate(() => { const g = window.__game; if (g.state === 'countdown') { g.stateUntil = 0; g.update(0.05); } });
const settle = (n) => page.evaluate((k) => { const g = window.__game; for (let i = 0; i < k; i++) g.update(0.016); }, n);
console.log(`viewport ${W}x${H} (aspecto ${(W / H).toFixed(3)}) QS='${XQS}'`);

let fail = 0;
for (const id of LIST) {
  // `drawUntil = 0` já pulava a rampa de saque ANTIGA. Desde que o ViewModelRig entrou no
  // viewmodel (BUG-04), quem segura a arma fora do quadro no início do saque é o estado
  // 'draw' do rig — 0,42 s na AK contra os 0,096 s que este settle avança. Sem o reset a
  // captura pega a arma no meio da subida e o A/B compara enquadramentos diferentes.
  await page.evaluate((wid) => { const g = window.__game; g._switchWeapon(wid); g.player.drawUntil = 0; g.player.pitch = 0; g.player.yaw = 0; if (g.vm.rig) g.vm.rig.reset(); }, id);
  await settle(6);
  // direção real do cano: rotation do grupo do VM TEM que ser (0,0,roll) — faca é exceção
  const rot = await page.evaluate((wid) => {
    const m = window.__game.vm.models[wid];
    return m ? [m.rotation.x, m.rotation.y, m.rotation.z] : null;
  }, id);
  if (rot && id !== 'knife' && (Math.abs(rot[0]) > 1e-6 || Math.abs(rot[1]) > 1e-6)) {
    fail++;
    console.log(`BARREL FAIL ${id}: rotation=(${rot.map(r => r.toFixed(4)).join(',')}) — pitch/yaw deviam ser 0`);
  } else console.log(`barrel ok ${id}: rotation=(${rot ? rot.map(r => r.toFixed(4)).join(',') : '?'})`);
  await page.screenshot({ path: `${OUT}/${id}-on.png` });
  // root.visible/root.position são REESCRITOS a cada frame (game.js:3914/3984) — esconder
  // tem que ser na cena inteira (o renderer pula Object3D com visible=false; nada reseta).
  await page.evaluate(() => { window.__game.vmScene.visible = false; });
  await settle(1);
  await page.screenshot({ path: `${OUT}/${id}-off.png` });
  await page.evaluate(() => { window.__game.vmScene.visible = true; });
  console.log('shot', id);
}
await browser.close();
console.log(fail ? `BARREL FAIL (${fail})` : 'BARREL OK');
console.log('DONE ->', OUT);
process.exit(fail ? 2 : 0);
