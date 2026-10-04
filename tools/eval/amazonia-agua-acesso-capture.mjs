// Evidência visual do #680: o acesso da água ao pé da escada da Amazônia.
// Câmeras fixas 3:2 (1536×1024) olhando o pé das três estações corrigidas.
// MAP_SOURCE injeta um map_amazonia.js alternativo (para o "antes"); sem ela, usa o atual.
// Uso: node tools/eval/amazonia-agua-acesso-capture.mjs <outdir>
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const globalRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const out = process.argv[2] || 'artifacts/amazonia-agua-acesso/depois';
const mapSource = process.env.MAP_SOURCE ? readFileSync(process.env.MAP_SOURCE, 'utf8') : readFileSync('public/js/map_amazonia.js', 'utf8');
const rotulo = process.env.ROTULO || (process.env.MAP_SOURCE ? 'antes' : 'depois');
mkdirSync(out, { recursive: true });

// CÂMERAS: uma por estação corrigida, enquadrando o pé da escada a partir do rio.
const VIEWS = [
  { nome: 'A-14-27', pos: [1.6, 4.8, -37.6], alvo: [9.4, 0.5, -32.2] },
  { nome: 'D-14-6', pos: [1.6, 4.8, 6.2], alvo: [9.4, 0.5, 11.4] },
  { nome: 'F--14-6', pos: [-1.6, 4.8, 6.2], alvo: [-9.4, 0.5, 11.4] },
];

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });  // 3:2
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) || u.pathname.startsWith('/api/')) return route.abort();
    if (u.pathname === '/js/map_amazonia.js') return route.fulfill({ contentType: 'text/javascript', body: mapSource });
    return route.continue();
  });
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', bots: 0, vol: 0, speech: false })));
  await page.goto(`${process.env.BASE || 'http://127.0.0.1:8146'}/?debug=1&map=amazonia&auto=B&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // `countdown` já é o mundo montado. O gate de captura do repositório espera `live`, que
  // aqui não chega porque a rodada não começa sozinha — e é o cenário que a foto mede.
  await page.waitForFunction(() => !!window.__game && !!window.__game.world?.amazonia, null, { timeout: 240000 });
  await page.waitForTimeout(6000);

  // Congela a simulação: a foto é do cenário, não de uma rodada que corre.
  await page.evaluate(() => { const g = window.__game; g.update = function () { this.renderer.render(this.scene, this.camera); }; });

  const medido = [];
  for (const v of VIEWS) {
    const info = await page.evaluate(({ pos, alvo }) => {
      const g = window.__game, w = g.world;
      g.camera.position.set(...pos); g.camera.lookAt(...alvo); g.camera.updateMatrixWorld(true);
      g.scene.updateMatrixWorld(true);
      g.renderer.render(g.scene, g.camera);
      const est = w.amazonia.estacoes.find(e => e.peEscada && Math.abs(e.peEscada.x - alvo[0]) < 0.6 && Math.abs(e.peEscada.z - alvo[2]) < 7);
      const tab = [];
      g.world.root.traverse(o => { if (o.name === 'acesso-estacao' && Math.abs(o.position.z - (est?.peEscada.z ?? 0)) < 8) tab.push(o.position.toArray().map(n => +n.toFixed(2))); });
      return est ? { estacao: [est.x, est.z], ghPe: +w.groundHeightAt(est.peEscada.x, est.peEscada.z, 0).toFixed(4), tabuleiros: tab } : { tabuleiros: tab };
    }, v);
    await page.screenshot({ path: `${out}/${rotulo}-${v.nome}.png` });
    medido.push({ ...v, ...info });
    console.log(`${rotulo}-${v.nome}.png  estacao=${JSON.stringify(info.estacao)} ghPe=${info.ghPe} tabuleiros=${JSON.stringify(info.tabuleiros)}`);
  }
  writeFileSync(`${out}/${rotulo}.json`, JSON.stringify({
    rotulo, sourceSHA256: createHash('sha256').update(mapSource).digest('hex'),
    viewport: '1536x1024 (3:2)', views: medido, errors,
  }, null, 2));
  console.log(JSON.stringify({ rotulo, out, errors, views: medido.map(m => ({ nome: m.nome, ghPe: m.ghPe, tabuleiros: m.tabuleiros?.length ?? 0 })) }));
} finally { await browser.close(); }