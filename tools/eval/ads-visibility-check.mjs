#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ASPECTOS, mascara, salvarMascaraPng } from './lib/vm-palco.mjs';
import { ocupacao } from './lib/vm-analise.mjs';
import * as L from './lib/vm-limiares.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutant = process.argv.includes('--mutante=ads-antigo');
const remote = process.argv.find((value) => value.startsWith('--base='))?.slice('--base='.length).replace(/\/$/, '');
const assetBase = process.argv.find((value) => value.startsWith('--asset-base='))?.slice('--asset-base='.length).replace(/\/$/, '');
const assetOverlay = process.argv.find((value) => value.startsWith('--asset-overlay='))?.slice('--asset-overlay='.length);
const assetRoot = process.argv.find((value) => value.startsWith('--asset-root='))?.slice('--asset-root='.length);
const auto = process.argv.find((value) => value.startsWith('--auto='))?.slice('--auto='.length) || 'E';
const catalog = process.argv.includes('--catalogo');
const ASPECTO = process.argv.find((v) => v.startsWith('--aspecto='))?.slice('--aspecto='.length) || '3x2';
if (!ASPECTOS[ASPECTO]) throw new Error(`--aspecto fora da régua: ${ASPECTO} (há: ${Object.keys(ASPECTOS).join(', ')})`);
// Geometria e tetos NÃO são novos: vêm de tools/eval/lib/vm-limiares.mjs, o mesmo
// lugar que o vm-reguas lê. A sliver da alça logo abaixo da cruz é o ADS correto e
// ocupa ~1,5% do disco; o que reprova é a arma SENTADA na cruz, não a alça sob ela.
const RAIO_CRUZ = L.COBERTURA_CRUZ_RAIO;
const CRUZ_PCT_MAX = 0.05;
const TETO_JANELA_ALTA = L.ADS_JANELA_ALTA_MAX;
const TETO_JANELA_BAIXA = L.ADS_JANELA_BAIXA_MAX;
const out = path.join(root, 'artifacts/vm-ads-visibility', auto === 'E' ? '' : auto.replace(/[^a-z0-9_-]+/gi, '-'));
fs.mkdirSync(out, { recursive: true });
const assetDir = assetBase ? fs.mkdtempSync(path.join(os.tmpdir(), 'csbr-ads-assets-')) : null;
const playwrightRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(path.join(playwrightRoot, 'playwright/index.js')).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const port = remote ? null : await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const selected = probe.address().port;
    probe.close(() => resolve(selected));
  });
});
const base = remote || `http://127.0.0.1:${port}`;
const server = remote ? null : spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
let browser;
const failures = [];
const check = (name, pass, details) => {
  console.log(`${pass ? 'PASSA' : 'FALHA'} ${name}: ${JSON.stringify(details)}`);
  if (!pass) failures.push(name);
};
try {
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    try { ready = (await fetch(base)).ok; if (ready) break; } catch { /* boot */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('servidor local não subiu');
  console.log(`jogo: ${base}`);
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: ASPECTOS[ASPECTO][0], height: ASPECTOS[ASPECTO][1] } });
  page.on('pageerror', (error) => console.log(`pageerror: ${error.message.slice(0, 180)}`));
  if (assetBase || assetRoot) await page.route('**/private-assets/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/private-assets/viewmodels/')) throw new Error(`asset inesperado: ${pathname}`);
    const override = assetOverlay && path.join(assetOverlay, pathname.slice('/private-assets/'.length));
    const local = assetRoot && path.join(assetRoot, pathname.slice('/private-assets/viewmodels/'.length));
    const file = override && fs.existsSync(override) ? override : local || path.join(assetDir, pathname.slice(1));
    if (!fs.existsSync(file)) {
      if (!assetBase) throw new Error(`asset local ausente: ${file}`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const output = execFileSync('vercel', ['curl', pathname, '--deployment', assetBase, '--',
        '--silent', '--show-error', '--output', file, '--write-out', '%{http_code}'],
      { cwd: root, encoding: 'utf8', timeout: 60000 }).trim();
      if (!output.endsWith('200')) throw new Error(`asset ${pathname}: HTTP ${output.slice(-3)}`);
    }
    await route.fulfill({ path: file, contentType: pathname.endsWith('.glb') ? 'model/gltf-binary' : 'application/octet-stream' });
  });
  /* ads-antigo: o FOV do vmCamera NO ADS é o que encolhe a arma e a tira do centro —
     `game.js:6300`. Sem a abertura (×1,50 rifles / ×1,35 curtas) a arma fica do
     tamanho do quadril e a alça invade a janela do alvo. As âncoras são lidas do
     arquivo CURRENT: mutante com âncora morta é pior que nenhum. */
  if (mutant) {
    const source = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
    const broken = source.replace('(shortGun ? 0.35 : 0.50) * a', '0 * a');
    if (source === broken || !broken.includes('(1 + 0 * a)')) throw new Error('mutante não aplicou: âncora do FOV de ADS mudou em game.js');
    await page.route('**/js/game.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: broken }));
  }
  // 10 min: o jogo sobe swiftshader (sem GPU) e o `load` espera TODOS os GLBs do
  // catálogo. Em máquina disputada com outras réguas o boot leva minutos, e um
  // timeout curto reprova por contenção, não por defeito.
  await page.goto(`${base}/?debug=1&auto=${encodeURIComponent(auto)}&vmauthored=1&vmfabrica=1&vmweapon=m4&map=brasilia&armaslazy=1&vmqa=precision&bloom=0`, { waitUntil: 'load', timeout: 600000 });
  console.log('página carregada');
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 90000 });
  console.log('partida live');
  await page.evaluate(() => window.__game._ensureVmPrecisionQa());
  if (await page.locator('#aviso-software button').count()) await page.locator('#aviso-software button').click({ force: true });
  await page.evaluate(() => document.querySelector('#crash-overlay')?.remove());
  const read = () => page.evaluate(() => {
    const g = window.__game;
    const eye = g._eyeWorld, cam = g.camera;
    const right = g._tpRight;
    const delta = cam.position.clone().sub(eye);
    return {
      mode: g.camView, weapon: g.player.weapon, scoped: g.player.scoped, state: g.state,
      aimF: g._aimF, adsF: g.vm.adsF,
      authored: g.vm.authored?.active(g.player.weapon),
      authoredMountVisible: g.vm.authored?.entry(g.player.weapon)?.mount.visible || false,
      fov: cam.fov, vmFov: g.vmCamera.fov, vmHipFov: g.vm.authored?.fov(g.player.weapon, g.vmCamera.aspect),
      side: Math.abs(delta.dot(right)), distance: Math.hypot(delta.x, delta.z),
      mask: g._scopeMask || 0, vmVisible: g.vm.root.visible,
      svdScopeMesh: Boolean(g.vm.root.getObjectByName('GEO_WEAPON_ZL_LUNETA-SVD')),
      svdOwnMesh: Boolean(g.vm.root.getObjectByName('GEO_WEAPON_SVD')),
    };
  });
  const equip = async (weapon) => {
    await page.evaluate((id) => { window.__vmPrecisionQa.equip(id); }, weapon);
    await page.waitForFunction((id) => window.__game?.player.weapon === id && window.__game.vm.authored?.active(id), weapon, { timeout: 120000 });
    await page.waitForFunction((id) => window.__game.vm.authored?.state(id) === 'idle', weapon, { timeout: 15000 });
    await page.waitForTimeout(250);
  };
  const aim = async (on) => {
    await page.evaluate((wanted) => {
      const g = window.__game;
      g._scope(wanted, true);
    }, on);
    await page.waitForFunction((wanted) => {
      const g = window.__game;
      const target = wanted ? g?._zoomFov(g.player.weapon) : 70;
      const realScope = wanted && target <= 40;
      return g?.player.scoped === wanted && Math.abs(g.camera.fov - target) <= 0.25
        && (wanted ? g._aimF >= 0.95 : g._aimF <= 0.05)
        && (wanted ? (realScope ? g._scopeMask > 0.9 : g.vm.adsF >= 0.95) : g.vm.adsF <= 0.05)
        && (realScope ? !g.vm.root.visible : g._scopeMask <= 0.05 && g.vm.root.visible
          && g.vm.authored?.entry(g.player.weapon)?.mount.visible);
    }, on, { timeout: 10000 });
    // O estado é atualizado antes do composer desenhar a vmScene; captura só
    // depois que dois frames puderam apresentar a nova malha ao canvas.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const settle = async () => {
    await page.waitForTimeout(300);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  for (const weapon of ['m4', 'p90', 'md97', 'pistol', 'revolver38']) {
    await equip(weapon);
    await page.evaluate(() => window.__game.setCamView('first'));
    await aim(false);
    await aim(true);
    await settle();
    const ads = await read();
    await page.screenshot({ path: path.join(out, `${weapon}-first-ads.png`) });
    const vmScale = Math.tan(ads.vmFov * Math.PI / 360) / Math.tan(ads.vmHipFov * Math.PI / 360);
    // As curtas liberam a cruz por deslocamento da pose; o fator de projeção
    // delas continua 1,35. A ocupação raster é aferida em eval:vm-reguas.
    check(`${weapon} primeira pessoa: janela do alvo`, ads.authored && ads.scoped && ads.fov >= 54 && vmScale >= (['pistol', 'revolver38'].includes(weapon) ? 1.3 : 1.35),
      { fov: ads.fov, vmFov: ads.vmFov, vmHipFov: ads.vmHipFov, vmScale });
    for (const mode of ['third', 'shoulder']) {
      await page.evaluate((m) => window.__game.setCamView(m), mode);
      await page.waitForFunction((m) => window.__game.camView === m &&
        Math.abs(window.__game.camera.position.clone().sub(window.__game._eyeWorld).dot(window.__game._tpRight)) >= 0.48,
      mode, { timeout: 10000 });
      await settle();
      const view = await read();
      await page.screenshot({ path: path.join(out, `${weapon}-${mode}-ads.png`) });
      check(`${weapon} ${mode}: corpo fora da mira`, view.mode === mode && view.fov >= 54 && view.side >= 0.48,
        { fov: view.fov, side: view.side, distance: view.distance });
    }
  }
  await equip('lmg');
  await page.evaluate(() => window.__game.setCamView('first'));
  await aim(true);
  const scope = await read();
  await page.screenshot({ path: path.join(out, 'lmg-scope.png') });
  check('MGX5: luneta limpa', scope.mask >= 0.88 && !scope.vmVisible, scope);
  await equip('svd');
  await aim(false);
  const svd = await read();
  await page.screenshot({ path: path.join(out, 'svd-idle.png') });
  check('SVD: luneta física no produto autorado', svd.weapon === 'svd' && svd.authored && svd.vmVisible
    && (svd.svdScopeMesh || svd.svdOwnMesh), svd);
  const svdReload = await page.evaluate(() => {
    window.__vmPrecisionQa.reload();
    const g = window.__game;
    return { start: g.time, duration: g.player.reloadUntil - g.time };
  });
  await page.waitForFunction(({ start, duration }) => window.__game.time >= start + duration * 0.35,
    svdReload, { timeout: 15000 });
  await page.screenshot({ path: path.join(out, 'svd-reload-mid.png') });
  await equip('awp');
  await aim(false);
  const started = await page.evaluate(() => { window.__vmPrecisionQa.reload(); return window.__game.time; });
  await page.waitForFunction((t) => window.__game.time >= t + 1.3, started, { timeout: 15000 });
  await page.screenshot({ path: path.join(out, 'awp-reload-mid.png') });
  const awp = await read();
  check('AWP: recarga autorada em partida', awp.weapon === 'awp' && awp.authored && awp.vmVisible, awp);
  /* #679: a varredura que faltava. Mede o CATÁLOGO INTEIRO (as 25 armas de tiro;
     a faca não tem ADS) e a OBSTRUÇÃO REAL EM PIXELS da arma/mão sobre a cruz e a
     janela do alvo, nos DOIS aspectos. As janelas e os tetos NÃO são novos: são os
     de tools/eval/lib/vm-limiares.mjs (COBERTURA_CRUZ_RAIO, ADS_JANELA_ALTA_MAX,
     ADS_JANELA_BAIXA_MAX) — os mesmos que o vm-reguas usa no ADS. Um gate de FOV
     isolado passa com a arma em cima do alvo; esta régua conta os pixels que o
     jogador deixa de enxergar. */
  if (catalog) {
    const ids = await page.evaluate(async () => (await import('/js/weapons.js')).WEAPON_IDS);
    const dir = path.join(out, 'catalogo', ASPECTO);
    fs.mkdirSync(dir, { recursive: true });
    const tabela = [];
    for (const id of ids) {
      if (id === 'knife' || id === 'grenade') continue;
      // Sai do ADS ANTES de trocar: uma luneta da arma anterior fica engatada e o
      // `aim` da próxima arma espera um FOV que não vem (escopeta da fábrica, 24/09).
      await aim(false).catch(() => {});
      await equip(id);
      await page.evaluate(() => window.__game.setCamView('first'));
      await aim(false);
      await aim(true);
      await settle();
      const data = await read();
      await page.screenshot({ path: path.join(dir, `${id}.png`) });
      const scale = Math.tan(data.vmFov * Math.PI / 360) / Math.tan(data.vmHipFov * Math.PI / 360);
      const scoped = await page.evaluate(() => Boolean(window.__game.player.scoped && window.__game._scopeMask > 0.85));
      // Máscara rotulada da MESMA cena que o jogador viu: arma vermelha, braço verde.
      const m = await mascara(page, id);
      await salvarMascaraPng(m, path.join(dir, `${id}-mascara.png`), [{ x: m.w / 2, y: m.h / 2, r: 12 }]);
      const r = Math.round(RAIO_CRUZ * m.w);
      const cx = m.w / 2;
      const cy = m.h / 2;
      const areaCruz = Math.PI * r * r;
      let pxCruz = 0;
      for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(m.h, cy + r); y++) {
        for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(m.w, cx + r); x++) {
          if (m.px[y * m.w + x] && Math.hypot(x - cx, y - cy) <= r) pxCruz++;
        }
      }
      const janelaAlta = ocupacao(m, { x0: 0.43, x1: 0.57, y0: 0.45, y1: 0.55 });
      const janelaBaixa = ocupacao(m, { x0: 0.43, x1: 0.57, y0: 0.50, y1: 0.65 });
      const pxAlta = Math.round(janelaAlta * m.w * 0.14 * m.h * 0.10);
      const pxBaixa = Math.round(janelaBaixa * m.w * 0.14 * m.h * 0.15);
      const linha = {
        id,
        aspecto: ASPECTO,
        pxCruz,
        pctCruz: +((100 * pxCruz) / areaCruz).toFixed(2),
        janelaAlta: +janelaAlta.toFixed(3),
        janelaBaixa: +janelaBaixa.toFixed(3),
        pxAlta,
        pxBaixa,
        fov: +data.fov.toFixed(1),
        vmScale: +scale.toFixed(2),
        scoped,
        autorada: data.authored,
      };
      tabela.push(linha);
      console.log(`catálogo ${ASPECTO} ${id}: ${pxCruz} px na cruz (${linha.pctCruz}%), janela alta ${(janelaAlta * 100).toFixed(1)}% (${pxAlta} px), baixa ${(janelaBaixa * 100).toFixed(1)}% (${pxBaixa} px), escopada ${scoped}`);
      /* Luneta real: o viewmodel some e entra o overlay 2D — 0 px é o resultado CERTO.
         Sem luneta a arma tem de ficar visível, com a janela do alvo no teto e a cruz
         só com a sliver da alça (COBERTURA_CRUZ_PCT_MAX), nunca tapada. */
      check(`catálogo ${ASPECTO} ${id}`, data.authored && (scoped
        ? !data.vmVisible && data.fov <= 40 && pxCruz === 0 && janelaAlta === 0 && janelaBaixa === 0
        : data.vmVisible && data.authoredMountVisible && data.fov >= 54 && scale >= 1.3
          && pxCruz <= areaCruz * CRUZ_PCT_MAX
          && janelaAlta <= TETO_JANELA_ALTA && janelaBaixa <= TETO_JANELA_BAIXA),
      { pxCruz, pctCruz: linha.pctCruz, janelaAlta: linha.janelaAlta, janelaBaixa: linha.janelaBaixa,
        fov: data.fov, vmScale: linha.vmScale, scoped, autorada: data.authored });
    }
    fs.writeFileSync(path.join(out, `catalogo-${ASPECTO}.json`), `${JSON.stringify(tabela, null, 2)}\n`);
  }
} catch (error) {
  check('execução', false, error.stack || String(error));
} finally {
  await browser?.close();
  server?.kill();
  if (assetDir) fs.rmSync(assetDir, { recursive: true, force: true });
}
if (mutant) {
  // Morde = a janela do alvo do m4 foi para binnen do ADS. Vale tanto na varredura
  // de FOV quanto na varredura de pixels do catálogo (`--catalogo`).
  const mordeu = failures.includes('m4 primeira pessoa: janela do alvo')
    || failures.some((f) => f.startsWith(`catálogo ${ASPECTO} m4`));
  const aberta = failures.includes('execução') ? ' (erro de execução)' : '';
  console.log(`MUTANTE ads-antigo ${mordeu ? 'MORDEU' : 'CEGO'}${aberta}: ${failures.length} falha(s)`);
  process.exitCode = mordeu ? 0 : 1;
} else {
  console.log(`ads-visibility: ${failures.length} falha(s)`);
  process.exitCode = failures.length ? 1 : 0;
}
