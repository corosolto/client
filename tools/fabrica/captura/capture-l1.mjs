#!/usr/bin/env node
// Captura de revisão do dono (lote L1/L2) NO JOGO REAL, `?vmauthored=1&vmqa=precision`.
// Os estados são disparados pela API do jogo (equip/shoot/_startReload/ADS) e o relógio
// do controlador autorado é segurado e avançado em passos de 1/60 s: o quadro sai
// determinístico sem pular a lógica real (sequência de recarga, arco de saque, recuo).
// Uso: node capture-l1.mjs --porta=4631 --armas=shotgun,sks --out=artifacts/review-L1/shots [--aspectos=3x2,16x9]
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PORT = opt('porta', '4631');
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.resolve(opt('out', 'artifacts/review-L1/shots'));
const ARMAS = opt('armas', 'shotgun').split(',').filter(Boolean);
const ASPECTS = { '3x2': [1440, 960], '16x9': [1440, 810] };
const aspects = opt('aspectos', '3x2,16x9').split(',');
const ROOT = process.cwd();
const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const { WEAPONS } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/weapons.js')).href);
const families = [...new Set(Object.values(VM_WEAPON).map((e) => e.family))];
const query = new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'piscina_treta', armaslazy: '0',
  vmauthored: '1', vmqa: 'precision', vmready: families.join(','), vmweapon: Object.keys(VM_WEAPON).join(',') }).toString();

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
fs.mkdirSync(OUT, { recursive: true });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
const report = { base: BASE, query, revision: execSync('git rev-parse HEAD').toString().trim(), records: [], failures: [], errors: [] };

// Instala o relógio segurado no controlador autorado (idempotente).
const INSTALL = () => {
  const vm = window.__authoredVm;
  if (vm.__cap) return true;
  const orig = vm.update;
  const cap = { hold: false, lastCtx: { ads: 0, sway: 0, speed: 0 }, orig };
  vm.update = function (dt, ctx) { cap.lastCtx = ctx || cap.lastCtx; if (cap.hold) return; return orig.call(this, dt, ctx); };
  cap.step = (secs) => { let r = secs; while (r > 1e-6) { const s = Math.min(1 / 60, r); orig.call(vm, s, { ...cap.lastCtx, ads: 0, scoped: false }); r -= s; } };
  vm.__cap = cap;
  return true;
};
const HOLD = (on) => { window.__authoredVm.__cap.hold = on; };
const STEP = (s) => { window.__authoredVm.__cap.step(s); };
const RUNTIME = (w) => {
  const vm = window.__authoredVm; const e = vm.entry(w); const g = window.__game;
  const a = e?.action; const clip = a?.getClip?.();
  return { weapon: g.player.weapon, authored: Boolean(e), golden: Boolean(e?.golden), mint: e?.mint?.active?.name || null,
    state: e?.state, clip: clip?.name || null, clipTime: a ? +a.time.toFixed(3) : null, clipDur: clip ? +clip.duration.toFixed(3) : null,
    queue: (e?.queue || []).length, mountVisible: Boolean(e?.mount?.visible), scoped: Boolean(g.player.scoped),
    ads: +(vm.adsAmount || 0).toFixed(3), fallback: Boolean(g._vmVisibility?.fallback), mag: g.player.ammo[w]?.mag };
};
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));

for (const aspect of aspects) {
  const [width, height] = ASPECTS[aspect];
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => report.errors.push({ aspect, kind: 'pageerror', message: String(e.message).slice(0, 300) }));
  page.on('console', (e) => { if (e.type() === 'error' && !/favicon/i.test(e.text())) report.errors.push({ aspect, kind: 'console', message: e.text().slice(0, 300) }); });
  await page.goto(`${BASE}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#crash-overlay,#aviso-software,.tutorial-overlay,[data-vmqa]{display:none!important}' });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa && window.__authoredVm, null, { timeout: 240000 });
  const holdRound = () => page.evaluate(() => {
    const g = window.__game;
    for (const b of g?.bots || []) { b.nextShotAt = Infinity; b.target = null; }
    g.player.hp = 100; g.player.alive = true; g.timeLeft = 600;
  });
  for (const w of ARMAS) {
    const t0 = Date.now();
    const snap = async (state, extra = {}) => {
      // Espera o jogo DESENHAR de novo (contador de render do game), não só rAF: sob
      // swiftshader o passo de update pode não ter virado quadro ainda.
      const f0 = await page.evaluate(() => window.__game._rafFrames || 0);
      await page.waitForFunction((f) => (window.__game._rafFrames || 0) >= f + 3, f0, { timeout: 20000 });
      await page.evaluate(frames);
      await page.waitForTimeout(80);
      const file = path.join(OUT, `${w}-${state}-${aspect}.png`);
      const runtime = await page.evaluate(RUNTIME, w);
      await page.screenshot({ path: file });
      report.records.push({ weapon: w, aspect, state, file: path.basename(file), sha: sha(file), runtime, ...extra });
    };
    try {
      await holdRound();
      await page.evaluate(INSTALL);
      await page.evaluate(HOLD, false);
      if (!await page.evaluate((x) => window.__vmPrecisionQa.equip(x), w)) throw new Error('não equipou');
      await page.waitForFunction((x) => { const e = window.__authoredVm.entry(x); return e && (e.golden || e.mint?.active) && e.mount.visible; }, w, { timeout: 120000 });
      await page.waitForTimeout(1200);

      if (process.env.SO_ADS !== '1') {
      // Saque: sai para a faca e volta com o relógio segurado.
      await page.evaluate(HOLD, true);
      await page.evaluate(() => window.__vmPrecisionQa.equip('knife'));
      await page.evaluate(() => { window.__game.player.drawUntil = 0; });
      await page.evaluate((x) => { const g = window.__game; g.player.lastSwitchAt = -9; g._switchWeapon(x); }, w);
      const drawDur = await page.evaluate((x) => {
        const e = window.__authoredVm.entry(x); const a = e.action;
        const clipD = a && e.state === 'draw' && /equip/i.test(a.getClip().name) ? a.getClip().duration / Math.max(0.01, Math.abs(a.timeScale || 1)) : 0;
        return Math.max(clipD, e.drawTime < e.drawDuration ? e.drawDuration : 0, 0.2);
      }, w);
      let done = 0;
      for (const f of [0.3, 0.65]) { await page.evaluate(STEP, drawDur * f - done); done = drawDur * f; await snap(`saque-${Math.round(f * 100)}`, { drawDur }); }
      await page.evaluate(STEP, drawDur - done + 0.6);

      // Idle assentado em tempo real e depois congelado.
      await page.evaluate(HOLD, false);
      await page.waitForTimeout(1500);
      await holdRound();
      await page.evaluate(HOLD, true);
      await snap('idle');

      // Primeiro tiro e rajada.
      await page.evaluate(() => window.__vmPrecisionQa.shoot());
      let tAcc = 0;
      for (const t of (process.env.TIRO_T || '0.06,0.12').split(',').map(Number)) { await page.evaluate(STEP, t - tAcc); tAcc = t; await snap(t === 0.06 ? 'tiro-1' : `tiro-${Math.round(t * 1000)}ms`, { recoil: await page.evaluate(() => { const r = window.__authoredVm.recoil; return r ? JSON.stringify(r).slice(0, 200) : null; }) }); }
      await page.evaluate(STEP, 1.2);
      const rate = Math.max(WEAPONS[w].rate || 0.1, 0.1);
      for (let i = 0; i < 6; i += 1) { await page.evaluate(() => window.__vmPrecisionQa.shoot()); if (i < 5) await page.evaluate(STEP, rate); }
      await page.evaluate(STEP, 0.04);
      await snap('rajada', { shots: 6, interval: rate });
      await page.evaluate(STEP, 1.5);

      // Recargas: tática (metade do carregador) e vazia.
      const reload = async (tag, magLeft, fractions) => {
        const dur = WEAPONS[w].reload;
        const ok = await page.evaluate(({ x, magLeft }) => {
          const g = window.__game; const p = g.player; const W = window.__WEAPONS_DATA;
          p.reloadUntil = 0; p.drawUntil = 0; g._scope(false, true);
          const a = p.ammo[x]; a.mag = magLeft; a.res = 999;
          g._startReload();
          return window.__authoredVm.entry(x).state === 'reload';
        }, { x: w, magLeft });
        let prev = 0;
        for (const f of fractions) { await page.evaluate(STEP, dur * (f - prev)); prev = f; await snap(`${tag}-${String(Math.round(f * 100)).padStart(2, '0')}`, { reloadStarted: ok, reloadDur: dur }); }
        await page.evaluate(STEP, dur * (1 - prev) + 0.8);
        await page.evaluate(() => { window.__game.player.reloadUntil = 0; });
      };
      await reload('recarga-tatica', Math.max(1, Math.floor(WEAPONS[w].mag / 2)), [0.3, 0.55, 0.8]);
      await reload('recarga-vazia', 0, [0.15, 0.35, 0.55, 0.75, 0.95]);

      // Inspeção (não há tecla no jogo; chama o clipe do controlador).
      const insp = await page.evaluate((x) => {
        const vm = window.__authoredVm; const ok = vm.inspect(x); const a = vm.entry(x).action;
        return ok ? a.getClip().duration / Math.max(0.01, Math.abs(a.timeScale || 1)) : 0;
      }, w);
      if (insp > 0) {
        await page.evaluate(STEP, insp * 0.35); await snap('inspecao-35', { inspectDur: insp });
        await page.evaluate(STEP, insp * 0.35); await snap('inspecao-70', { inspectDur: insp });
        await page.evaluate(STEP, insp * 0.3 + 0.6);
      } else report.failures.push({ weapon: w, aspect, message: 'sem clipe inspect' });
      }

      // ADS em tempo real (ADS é estado estável, sai do update verdadeiro).
      await page.evaluate(HOLD, false);
      await page.waitForTimeout(600);
      await page.evaluate(() => window.__vmPrecisionQa.ads());
      await page.waitForTimeout(1300);
      // vm-fix-grips: sob carga o toggle podia não ter assentado; espera o ADS de fato em 1.
      // L3L5: arma de luneta (WEAPONS.scope) não leva o VM ao ADS (máscara da luneta): espera só o scoped.
      if (WEAPONS[w].scope) await page.waitForFunction(() => window.__game.player.scoped, null, { timeout: 20000 }).then(() => page.waitForTimeout(500));
      else await page.waitForFunction(() => (window.__authoredVm.adsAmount || 0) > 0.995 && window.__game.player.scoped, null, { timeout: 20000 })
        .catch(async () => { await page.evaluate(() => window.__vmPrecisionQa.ads()); await page.waitForFunction(() => (window.__authoredVm.adsAmount || 0) > 0.995, null, { timeout: 20000 }); });
      await page.waitForTimeout(400);
      await page.evaluate(HOLD, true);
      await snap('ads');
      await page.evaluate(HOLD, false);
      for (let i = 0; i < 4; i += 1) {
        if (!await page.evaluate(() => window.__game.player.scoped)) break;
        await page.evaluate(() => window.__vmPrecisionQa.ads());
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(500);
      console.log(`CAP ${w} ${aspect} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      await page.evaluate(HOLD, false).catch(() => {});
      report.failures.push({ weapon: w, aspect, message: String(e.message || e).slice(0, 300) });
      console.log(`FALHA ${w} ${aspect}: ${String(e.message || e).slice(0, 200)}`);
    }
  }
  await page.close();
}
await browser.close();
const jsonPath = path.join(OUT, `capture-${process.env.SO_ADS === '1' ? 'ads-' : ''}${ARMAS.join('_')}.json`);
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify({ ok: report.failures.length === 0, shots: report.records.length, failures: report.failures.length, errors: report.errors.length, json: jsonPath }));
