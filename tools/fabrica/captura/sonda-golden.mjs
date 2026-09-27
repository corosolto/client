#!/usr/bin/env node
// Sonda da malha da AK golden (coro/ak-hires.glb) no espaço do osso da arma (Rifle_metarig), no
// idle: caixa e perfil de altura ao longo do cano — de onde saem alça e massa medidas.
// Uso: node tools/fabrica/captura/sonda-golden.mjs [--porta=4671] [--osso=Rifle_metarig]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto(`http://127.0.0.1:${arg('porta', '4671')}/?debug=1&auto=E&map=piscina_treta&armaslazy=0&vmauthored=1`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
await page.evaluate(() => window.__game._switchWeapon('ak'));
await page.waitForTimeout(5000);
const r = await page.evaluate((nomeOsso) => {
  const e = window.__authoredVm.entry('ak');
  const osso = e.scene.getObjectByName(nomeOsso);
  if (!osso) return { erro: `sem ${nomeOsso}` };
  const V = e.scene.position.constructor; const v = new V();
  osso.updateWorldMatrix(true, false);
  const inv = osso.matrixWorld.clone().invert();
  const pts = [];
  const malhas = [];
  e.scene.traverse((m) => { if (m.isMesh && /ak_body/i.test(m.name)) malhas.push(m); });
  for (const m of malhas) {
    m.updateWorldMatrix(true, false);
    const n = m.geometry.attributes.position.count;
    for (let i = 0; i < n; i += 1) {
      if (m.isSkinnedMesh) m.getVertexPosition(i, v); else v.fromBufferAttribute(m.geometry.attributes.position, i);
      v.applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      pts.push([v.x, v.y, v.z]);
    }
  }
  const min = [0, 1, 2].map((k) => Math.min(...pts.map((p) => p[k])));
  const max = [0, 1, 2].map((k) => Math.max(...pts.map((p) => p[k])));
  // Eixo longo = maior extensão; perfil de máximo e mínimo nos dois outros eixos por fatia.
  const ext = [0, 1, 2].map((k) => max[k] - min[k]);
  const L = ext.indexOf(Math.max(...ext));
  const outros = [0, 1, 2].filter((k) => k !== L);
  const N = 40; const perfil = [];
  for (let b = 0; b < N; b += 1) {
    const a0 = min[L] + (ext[L] * b) / N; const a1 = a0 + ext[L] / N;
    const fat = pts.filter((p) => p[L] >= a0 && p[L] < a1);
    if (!fat.length) { perfil.push(null); continue; }
    perfil.push({ a: +((a0 + a1) / 2).toFixed(3), ...Object.fromEntries(outros.flatMap((k) => [[`max${k}`, +Math.max(...fat.map((p) => p[k])).toFixed(3)], [`min${k}`, +Math.min(...fat.map((p) => p[k])).toFixed(3)]])) });
  }
  // Onde fica a câmera no espaço do osso (o "cima" da tela aponta para lá no quadril).
  const g = window.__game; const cam = g.vmCamera; cam.updateMatrixWorld();
  const camPos = cam.getWorldPosition(new V()).applyMatrix4(inv);
  const camUp = new V(0, 1, 0).applyQuaternion(cam.getWorldQuaternion(cam.quaternion.clone())).add(cam.getWorldPosition(new V())).applyMatrix4(inv).sub(camPos);
  // Perfil fino do topo: 5 mm por fatia, máximo geral e máximo na faixa central (|x − xc| < 2 mm):
  // o entalhe da alça é onde o centro fica abaixo das bordas; a massa é o pico central na frente.
  const xc = (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
  const fino = [];
  for (let a = min[L]; a < max[L]; a += 0.005) {
    const f = pts.filter((p) => p[L] >= a && p[L] < a + 0.005);
    const c = f.filter((p) => Math.abs(p[0] - xc) < 0.002);
    if (f.length) fino.push([+(a + 0.0025).toFixed(4), +Math.max(...f.map((p) => p[2])).toFixed(4), c.length ? +Math.max(...c.map((p) => p[2])).toFixed(4) : null]);
  }
  return { malhas: malhas.map((m) => m.name), n: pts.length, min, max, L, xc, perfil, fino, camPos: camPos.toArray(), camUp: camUp.toArray() };
}, arg('osso', 'Rifle_metarig'));
console.log(JSON.stringify(r, null, 0));
await browser.close();
