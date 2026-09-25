#!/usr/bin/env node
// Coice no QUADRIL legível? Mede a excursão do centro projetado da ARMA (vértices com
// skin, pela vmCamera) após um tiro em câmera lenta, em % da diagonal da arma na tela.
// Referência: P7 do vm-gauntlet (≥ 4%); a AK golden mede ~9%.
// Uso: node tools/fabrica/captura/coice.mjs --armas=ak,m4 [--query=vmfabrica=m4] [--porta=4671] [--total]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '4671');
const ARMAS = arg('armas', '').split(',').filter(Boolean);
const EXTRA = arg('query', '');
const TIROS = Number(arg('tiros', '3'));
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const q = new URLSearchParams({ debug: '1', auto: 'E', map: 'piscina_treta', armaslazy: '0', vmauthored: '1', vmqa: 'precision' });
for (const [k, v] of new URLSearchParams(EXTRA)) q.set(k, v);
await page.goto(`http://127.0.0.1:${PORTA}/?${q}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(3000);
await page.evaluate((total) => { window.__coiceModoTotal = total;
  const g = window.__game;
  for (const c of g.combatants || []) if (c !== g.player) { c.alive = false; if (c.mesh) c.mesh.visible = false; }
  const a = window.__authoredVm;
  window.__vmSlow = 1;
  if (a && !a.__slow) { const o = a.update.bind(a); a.update = (dt, ctx) => o(dt * window.__vmSlow, ctx); a.__slow = true; }
  // Coice procedural = transformação do MOUNT. Guarda o centro da arma no espaço do mount
  // (vértices com skin, 1 a cada 7, só os no quadro) e a diagonal na tela; depois só
  // reprojeta esse ponto fixo — o que se mexe dentro do clipe (ferrolho, cartucho) não conta.
  window.__coiceRef = () => {
    const e = a.entry(g.player.weapon);
    const meshes = e?.weaponMeshes || [];
    if (!meshes.length) return null;
    const cam = g.vmCamera; cam.updateMatrixWorld(); e.mount.updateMatrixWorld();
    const V = e.mount.position.constructor;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    const soma = new V(); let n = 0;
    const v = new V(); const w = new V();
    for (const m of meshes) {
      if (!m.visible || !m.geometry?.attributes?.position) continue;
      m.updateMatrixWorld();
      const cnt = m.geometry.attributes.position.count;
      for (let i = 0; i < cnt; i += 7) {
        if (m.isSkinnedMesh) m.getVertexPosition(i, v); else v.fromBufferAttribute(m.geometry.attributes.position, i);
        v.applyMatrix4(m.matrixWorld);
        w.copy(v).project(cam);
        if (w.z > 1 || w.z < -1 || Math.abs(w.x) > 1.2 || Math.abs(w.y) > 1.2) continue;
        x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); y0 = Math.min(y0, w.y); y1 = Math.max(y1, w.y);
        soma.add(e.mount.worldToLocal(v.clone())); n += 1;
      }
    }
    if (!n) return null;
    window.__coiceC = soma.multiplyScalar(1 / n);
    window.__coiceE = e;
    const r = window.__coiceMede();
    return { ...r, diag: Math.hypot((x1 - x0) * cam.aspect, y1 - y0) };
  };
  // --total: centro dos vértices NA TELA a cada quadro (entra o clipe de tiro da golden).
  window.__coiceTotal = () => {
    const e = window.__coiceE; const cam = g.vmCamera; cam.updateMatrixWorld();
    const V = e.mount.position.constructor; const v = new V();
    let sx = 0; let sy = 0; let n = 0;
    for (const m of e.weaponMeshes || []) {
      if (!m.visible || !m.geometry?.attributes?.position) continue;
      m.updateMatrixWorld();
      const cnt = m.geometry.attributes.position.count;
      for (let i = 0; i < cnt; i += 7) {
        if (m.isSkinnedMesh) m.getVertexPosition(i, v); else v.fromBufferAttribute(m.geometry.attributes.position, i);
        v.applyMatrix4(m.matrixWorld).project(cam);
        if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) continue;
        sx += v.x; sy += v.y; n += 1;
      }
    }
    return { cx: (sx / n) * cam.aspect, cy: sy / n };
  };
  window.__coiceMede = () => {
    if (window.__coiceModoTotal) return window.__coiceTotal();
    const e = window.__coiceE; const cam = g.vmCamera;
    cam.updateMatrixWorld(); e.mount.updateMatrixWorld();
    const p = e.mount.localToWorld(window.__coiceC.clone()).project(cam);
    return { cx: p.x * cam.aspect, cy: p.y };
  };
}, process.argv.includes('--total'));
const quadros = async (n) => { const f0 = await page.evaluate(() => window.__game._rafFrames || 0);
  await page.waitForFunction((f) => (window.__game._rafFrames || 0) >= f, f0 + n, { timeout: 20000 }).catch(() => null); };
const saida = {};
for (const arma of ARMAS) {
  let ok = false;
  for (let t = 0; t < 4 && !ok; t += 1) {
    ok = await page.evaluate((w) => { try { window.__game._switchWeapon(w); return window.__game.player.weapon === w; } catch { return false; } }, arma);
    if (!ok) await page.waitForTimeout(700);
  }
  if (!ok) { console.log(`${arma}: troca falhou`); continue; }
  await page.waitForFunction(() => { const e = window.__authoredVm?.entry?.(window.__game.player.weapon); return !e || (e.drawTime >= e.drawDuration && e.state === 'idle'); }, null, { timeout: 12000 }).catch(() => null);
  await page.waitForTimeout(1500);
  const exc = [];
  for (let s = 0; s < TIROS; s += 1) {
    const r0 = await page.evaluate(() => window.__coiceRef());
    if (!r0) break;
    await page.evaluate(() => { const p = window.__game.player; p.ammo[p.weapon].mag = Math.max(p.ammo[p.weapon].mag, 5); window.__vmSlow = 0.1; });
    await page.evaluate(() => window.__vmPrecisionQa.shoot());
    let pico = 0;
    for (let k = 0; k < 14; k += 1) {
      await quadros(1);
      const r = await page.evaluate(() => window.__coiceMede());
      if (r) pico = Math.max(pico, Math.hypot(r.cx - r0.cx, r.cy - r0.cy) / r0.diag);
    }
    exc.push(pico);
    await page.evaluate(() => { window.__vmSlow = 1; });
    await page.waitForTimeout(1600);
  }
  const med = exc.length ? exc.reduce((a, b) => a + b, 0) / exc.length : NaN;
  saida[arma] = +(med * 100).toFixed(1);
  console.log(`${arma.padEnd(11)} excursão ${(med * 100).toFixed(1)}% (${exc.map((e) => (e * 100).toFixed(1)).join(' / ')})`);
}
console.log(JSON.stringify(saida));
await browser.close();
