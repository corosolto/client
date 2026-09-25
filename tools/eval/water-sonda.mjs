// Sonda pontual do caminho de render da água (RC2): composer ativo? uDepthOn?
// erro de shader? Lê tudo DENTRO de um rAF (depois de um frame renderizado).
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const BASE = process.env.BASE || 'http://localhost:8141';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const MAP = process.env.MAP || 'fy_mansao';
const GPU = process.env.GPU === '1';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: GPU ? ['--headless=new', '--mute-audio']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${MAP}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 90000 });
await page.waitForTimeout(1500);
const sonda = await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
  const g = window.__game, r = g.renderer, w = g.scene.userData.water;
  const progs = r.info.programs.map((p) => ({ name: p.name, valid: r.info.programs ? undefined : undefined }));
  res({
    postPatched: !!r.__postPatched,
    toneMapping: r.toneMapping,
    quality: (JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality) || '(default)',
    water: w ? {
      uDepthOn: w.material.uniforms.uDepthOn.value,
      tDepth: !!w.material.uniforms.tDepth.value,
      uNear: w.material.uniforms.uNear.value, uFar: w.material.uniforms.uFar.value,
      depthTest: w.material.depthTest,
      uTime: w.material.uniforms.uTime.value,
      fogD: w.material.uniforms.uFogD.value,
    } : null,
    programNames: r.info.programs.map((p) => p.name).filter((n) => /shader|mesh/i.test(n || '')).slice(0, 10),
    nPrograms: r.info.programs.length,
  });
}))));
console.log(JSON.stringify(sonda, null, 1));
const errs = logs.filter((l) => /error|invalid|not valid|Shader/i.test(l));
console.log('--- logs relevantes (' + errs.length + '/' + logs.length + ') ---');
for (const l of errs.slice(0, 25)) console.log(l.slice(0, 600));
await browser.close();
