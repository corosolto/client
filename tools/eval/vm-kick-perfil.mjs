#!/usr/bin/env node
/* ============================================================================
   vm-kick-perfil.mjs — ONDE mora o coice dentro do clipe `shoot`.

   Por que existe: o `P7` do `vm-gauntlet.mjs` amostra o Shoot em cinco frações
   e reprovou 12 das 19 armas com "recuo ilegível, excursão 0,0–3,3%". Antes de
   mexer no asset ou no teto é preciso saber se o coice NÃO EXISTE ou se ele
   existe e a amostragem passa por cima dele: os clipes da trilha CS 1.6 saem
   todos com a MESMA duração dentro de um GLB (m4: 2,4 s em equip, idle, reload
   e shoot), o que empurra o coice inteiro para o começo.

   Mede o centro projetado da ARMA em N frações do clipe e imprime o perfil.
   Não é portão: é a medida que decide qual conserto é honesto.

   Uso: node tools/eval/vm-kick-perfil.mjs --armas=m4,ak [--modo=retarget]
        [--n=24] [--porta=8361]
   ============================================================================ */
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '8361';
const BASE = `http://127.0.0.1:${PORTA}`;
const MODO = arg('modo') || 'retarget';
const N = Number(arg('n')) || 24;
const W = 1440; const H = 960;
const ARMAS = (arg('armas') || 'm4').split(',').filter(Boolean);
const FAMILIAS_A = 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,shotgun,lmg';
const QS_MODO = MODO === 'kinemation' ? `vmready=${FAMILIAS_A}&vmgolden=0`
  : MODO === 'retarget' ? 'rt=1'
  : MODO === 'golden' ? 'vmgolden=1' : 'cs16=1';

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore', cwd: ROOT });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i += 1) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

const SONDA = `((ARMA) => {
  const g = window.__game; const vm = window.__authoredVm;
  try { g._switchWeapon(ARMA); } catch (err) { return 'switch: ' + err.message; }
  const e = vm?.entry?.(ARMA);
  if (!e) return 'sem-entry';
  const mats = (o) => (Array.isArray(o.material) ? o.material : [o.material]);
  const pinta = (o, r, gg, b) => {
    for (const m of mats(o)) {
      if (!m) continue;
      m.map = null; m.roughness = 1; m.metalness = 0; m.toneMapped = false;
      if (m.color) m.color.setRGB(m.emissive ? 0 : r, m.emissive ? 0 : gg, m.emissive ? 0 : b);
      if (m.emissive) { m.emissive.setRGB(r, gg, b); m.emissiveIntensity = 1; }
      m.needsUpdate = true;
    }
  };
  const maos = new Set(e.handMeshes || []);
  const objetos = []; e.scene.traverse((o) => { if (o.isMesh) objetos.push(o); });
  for (const o of objetos) {
    o.material = Array.isArray(o.material) ? o.material.map((m) => m?.clone?.() || m)
      : (o.material?.clone?.() || o.material);
    if (maos.has(o)) pinta(o, 1, 0, 1); else pinta(o, 0, 1, 1);
  }
  g.scene.visible = false;
  for (const el of document.body.children) {
    if (el.id === 'game-container' || el.tagName === 'SCRIPT' || el.tagName === 'META') continue;
    el.style.visibility = 'hidden';
  }
  return 'ok';
})`;

async function centroArma(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  let n = 0; let sx = 0; let sy = 0; let x0 = 1e9; let y0 = 1e9; let x1 = -1; let y1 = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * ch;
      if (!(data[i + 1] > 150 && data[i + 2] > 150 && data[i] < 90)) continue;
      n += 1; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return n ? { c: [sx / n, sy / n], diag: Math.hypot(x1 - x0, y1 - y0), px: n } : null;
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
for (const arma of ARMAS) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  try {
    await page.goto(`${BASE}/?debug=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0&${QS_MODO}`,
      { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.player, null, { timeout: 180000 });
    await page.waitForFunction((w) => window.__authoredVm?.entry?.(w), arma, { timeout: 180000 });
    const sonda = await page.evaluate(`(${SONDA})(${JSON.stringify(arma)})`);
    if (sonda !== 'ok') throw new Error(sonda);
    const info = await page.evaluate((w) => {
      const vm = window.__authoredVm; const g = window.__game;
      vm.shoot(w);
      const clip = vm.entry(w)?.action?.getClip?.();
      if (!g.__perfilVmUpdate) g.__perfilVmUpdate = vm.update.bind(vm);
      g.__perfilVmUpdate(0); vm.update = () => {};
      return { clip: clip?.name, dur: clip?.duration, state: vm.entry(w)?.state };
    }, arma);
    const perfil = [];
    for (let k = 0; k <= N; k += 1) {
      const f = k / N;
      await page.evaluate(({ w, f }) => {
        const vm = window.__authoredVm; const entry = vm.entry(w); const a = entry.action;
        const d = a.getClip().duration;
        entry.mixer.stopAllAction(); a.reset(); a.enabled = true;
        a.setEffectiveWeight(1); a.setEffectiveTimeScale(a.timeScale || 1);
        a.time = Math.min(d - 1e-4, d * f); a.play(); entry.mixer.update(0); a.paused = true;
      }, { w: arma, f });
      const m = await centroArma(await page.screenshot({ type: 'png' }));
      perfil.push({ f: +f.toFixed(3), c: m ? [+m.c[0].toFixed(1), +m.c[1].toFixed(1)] : null, diag: m ? +m.diag.toFixed(0) : 0 });
    }
    const base = perfil[0];
    const exc = perfil.map((p) => (p.c && base.c
      ? Math.hypot(p.c[0] - base.c[0], p.c[1] - base.c[1]) / (base.diag || 1) : 0));
    const pico = Math.max(...exc);
    const iPico = exc.indexOf(pico);
    console.log(`${arma} [${MODO}] clip=${info.clip} dur=${info.dur?.toFixed(3)}s state=${info.state}`);
    console.log(`  pico ${(pico * 100).toFixed(1)}% em f=${perfil[iPico].f} (t=${(info.dur * perfil[iPico].f).toFixed(3)}s)`);
    console.log(`  perfil: ${exc.map((e) => (e * 100).toFixed(0)).join(' ')}`);
  } catch (e) {
    console.log(`${arma}: ERRO ${String(e.message || e).slice(0, 160)}`);
  }
  await page.close().catch(() => {});
}
await browser.close();
srv.kill();
