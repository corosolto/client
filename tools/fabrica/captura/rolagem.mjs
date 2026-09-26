#!/usr/bin/env node
// Rolagem de tela da arma no quadril ("um pouco inclinada", dono 25/09): ângulo entre o "cima" da
// arma (SOCKET_FAB_UP − SOCKET_FAB_SIGHT) e o vertical da câmera, no plano perpendicular ao cano
// (SIGHT → MUZZLE), no espaço da vmCamera, no idle, e o eixo do cano projetado na tela.
// Mede os produtos da fábrica; a M4 aprovada é a referência (a AK golden não tem os sockets).
// Uso: node tools/fabrica/captura/rolagem.mjs --armas=m4,g3 [--porta=4671]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '4671');
const ARMAS = arg('armas', 'm4').split(',').filter(Boolean);
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const q = new URLSearchParams({ debug: '1', auto: 'E', map: 'piscina_treta', armaslazy: '0', vmauthored: '1', vmqa: 'precision', vmfabrica: ARMAS.join(',') });
await page.goto(`http://127.0.0.1:${PORTA}/?${q}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(3000);
const saida = {};
for (const arma of ARMAS) {
  await page.evaluate((w) => window.__game._switchWeapon(w), arma);
  await page.waitForFunction(() => { const e = window.__authoredVm?.entry?.(window.__game.player.weapon); return e && e.drawTime >= e.drawDuration && e.state === 'idle'; }, null, { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(1500);
  const r = await page.evaluate((w) => {
    const g = window.__game; const e = window.__authoredVm.entry(w); const s = e?.sockets;
    if (!s?.sight || !s?.muzzle || !s?.up) return { erro: 'sem sockets da fábrica' };
    const cam = g.vmCamera; cam.updateMatrixWorld(); e.scene.updateWorldMatrix(true, true);
    const V = e.scene.position.constructor;
    const noCam = (o) => cam.worldToLocal(o.getWorldPosition(new V()));
    const a = noCam(s.sight); const d = noCam(s.muzzle).sub(a).normalize(); const u = noCam(s.up).sub(a);
    u.sub(d.clone().multiplyScalar(u.dot(d))).normalize();
    const y = new V(0, 1, 0); y.sub(d.clone().multiplyScalar(y.dot(d))).normalize();
    const ang = Math.atan2(new V().crossVectors(y, u).dot(d), y.dot(u)) * 180 / Math.PI;
    // Eixo do CANO na tela (linha de visada projetada): graus acima da horizontal, 3:2.
    const pa = s.sight.getWorldPosition(new V()).project(cam); const pb = s.muzzle.getWorldPosition(new V()).project(cam);
    const eixo = Math.atan2((pb.y - pa.y), (pb.x - pa.x) * cam.aspect) * 180 / Math.PI;
    return { rolagem: +(-ang).toFixed(1), eixo: +eixo.toFixed(1) };
  }, arma);
  saida[arma] = r.erro || { rolagem: r.rolagem, eixo: r.eixo };
  console.log(`${arma.padEnd(11)} rolagem ${r.rolagem ?? r.erro}° · eixo do cano na tela ${r.eixo}°`);
}
console.log(JSON.stringify(saida));
await browser.close();
