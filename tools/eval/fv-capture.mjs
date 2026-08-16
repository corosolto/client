// Captura do Ferro Velho (fveval.html): valida o cânion BECO OESTE de ângulos de jogo.
// Uso: node tools/eval/fv-capture.mjs [outDir] [extraQS]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/fv';
const XQS = process.argv[3] ? `?${process.argv[3]}` : '';
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
const page = await browser.newPage({ viewport: { width: 1100, height: 734 } });   // ~3:2
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/fveval.html${XQS}`, { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.MAPEVAL && window.MAPEVAL.ready === true, null, { timeout: 120000 });

// [label, from, look] — ângulos da imagem-conceito + cobertura de gameplay
const shots = [
  ['beco-sul-placa', [-23, 1.7, 34], [-23, 3.5, 20]],    // boca sul: placa suspensa (o frame da referência)
  ['beco-norte', [-23, 1.7, 30], [-23, 2.5, -24]],       // dentro do cânion, olhando norte (tiro comprido)
  ['beco-sul', [-23, 1.7, -20], [-23, 3.0, 30]],         // dentro do cânion, olhando sul (pra placa)
  ['saida-miolo', [-16, 1.7, 5.5], [-23, 2.0, 5.5]],     // saída lateral z≈+5 pro cânion
  ['spawn-p', [0, 1.7, 33], [-14, 2.5, 10]],             // visão do spawn P pro beco
  ['galpao-n', [-6, 1.7, -25], [-23, 2.5, 0]],           // aproximação norte -> cânion
  ['topo', [0, 60, 2], [0, 0, 1.9]],                     // planta: layout geral
];
for (const [label, from, look] of shots) {
  await page.evaluate(([f, l]) => window.MAPEVAL.view(f, l), [from, look]);
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${OUT}/${label}.png` });
  console.log('shot', label);
}
const stats = await page.evaluate(() => window.MAPEVAL.stats());
console.log('render stats:', JSON.stringify(stats));
console.log('DONE ->', OUT);
await browser.close();
