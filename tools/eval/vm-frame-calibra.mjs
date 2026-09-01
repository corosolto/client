#!/usr/bin/env node
/* ============================================================================
   vm-frame-calibra.mjs — CALIBRA o FAMILY_FRAME de cada arma pela MEDIDA.

   Por que existe: o gauntlet reprova `P2 enquadramento` em quase todo o
   arsenal (`VM começa em 0,42;0,54` contra o contrato C5 `x 0,50–0,66` e
   `y ≥ 0,45`) e `P2 centro`. Corrigir isso a olho é varredura de câmera — o
   erro que o handoff da pistola mandou parar de repetir. Aqui o offset sai de
   uma DERIVADA MEDIDA no jogo real: mede a caixa do viewmodel em três pontos,
   resolve o passo em metros por fração de tela, aplica e confere.

   Não é portão. O portão continua sendo `tools/eval/vm-gauntlet.mjs`; esta
   ferramenta só PROPÕE o número que o portão vai cobrar.

   Uso: node tools/eval/vm-frame-calibra.mjs --armas=m4,mp5 [--modo=goldsrc]
        [--porta=8351] [--alvo-x=0.56] [--alvo-y=0.50] [--iter=4]
        [--out=tools/eval/out/vm-frame-calibra]
   Ferramenta LOCAL: precisa dos private-assets, Playwright e sharp.
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

import { WEAPON_IDS } from '../../public/js/weapons.js';
import { VM_FAMILY, VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '8351';
const BASE = `http://127.0.0.1:${PORTA}`;
const OUT = arg('out') || path.join(ROOT, 'tools/eval/out/vm-frame-calibra');
const MODO = arg('modo') || 'goldsrc';
const W = Number(arg('largura')) || 1440;
const H = Number(arg('altura')) || 960;
/* Alvo no MEIO da faixa do contrato, não na borda: um número que encosta em
   0,50 fica vermelho de novo assim que a pose muda um pixel. */
const ALVO_X = Number(arg('alvo-x')) || 0.56;
const ALVO_Y = Number(arg('alvo-y')) || 0.50;
const ITER = Number(arg('iter')) || 4;
const ARMAS = (arg('armas') ? arg('armas').split(',') : WEAPON_IDS.filter((w) => w !== 'knife'))
  .filter(Boolean);

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
await fs.mkdir(OUT, { recursive: true });

/* Mesma sonda de cor do gauntlet, reduzida ao que a calibração precisa: pinta
   mão/arma/pente, apaga o mundo e deixa o frame do viewmodel escrevível. */
const SONDA = `((ARMA) => {
  const g = window.__game; const vm = window.__authoredVm;
  try { g._switchWeapon(ARMA); } catch (err) { return 'switch: ' + err.message; }
  if (g.player.weapon !== ARMA) return 'nao-empunhou:' + g.player.weapon;
  const e = vm?.entry?.(ARMA);
  if (!e) return 'sem-entry';
  const mats = (o) => (Array.isArray(o.material) ? o.material : [o.material]);
  const pinta = (o, r, gg, b) => {
    for (const m of mats(o)) {
      if (!m) continue;
      m.map = null; m.roughness = 1; m.metalness = 0;
      m.transparent = false; m.opacity = 1; m.toneMapped = false;
      if (m.color) m.color.setRGB(m.emissive ? 0 : r, m.emissive ? 0 : gg, m.emissive ? 0 : b);
      if (m.emissive) { m.emissive.setRGB(r, gg, b); m.emissiveIntensity = 1; }
      m.needsUpdate = true;
    }
  };
  const maos = new Set(e.handMeshes || []);
  const objetos = [];
  e.scene.traverse((o) => { if (o.isMesh) objetos.push(o); });
  for (const o of objetos) {
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => m?.clone?.() || m)
      : (o.material?.clone?.() || o.material);
    if (maos.has(o)) pinta(o, 1, 0, 1);
    else if (/MAG/i.test(o.name)) pinta(o, 1, 1, 0);
    else pinta(o, 0, 1, 1);
  }
  window.__coroFrameBase = { x: e.frame.x, y: e.frame.y };
  g.scene.visible = false;
  for (const el of document.body.children) {
    if (el.id === 'game-container' || el.tagName === 'SCRIPT' || el.tagName === 'META') continue;
    el.style.visibility = 'hidden';
  }
  return 'ok';
})`;

const classifica = (r, g, b) => {
  if (r > 150 && b > 150 && g < 90) return 1;              // mão = magenta
  if (g > 150 && b > 150 && r < 90) return 2;              // arma = ciano
  if (r > 150 && g > 150 && b < 90) return 3;              // pente = amarelo
  return 0;
};

async function mede(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width; const h = info.height; const ch = info.channels;
  let x0 = 1e9; let y0 = 1e9; let x1 = -1; let y1 = -1; let n = 0;
  let ax0 = 1e9; let ay0 = 1e9; let ax1 = -1; let ay1 = -1; let armaN = 0;
  let centro = 0;
  const cx0 = Math.floor(w * 0.42); const cx1 = Math.ceil(w * 0.58);
  const cy0 = Math.floor(h * 0.42); const cy1 = Math.ceil(h * 0.58);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = classifica(data[(y * w + x) * ch], data[(y * w + x) * ch + 1], data[(y * w + x) * ch + 2]);
      if (!c) continue;
      n += 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (c === 2) {
        armaN += 1;
        if (x < ax0) ax0 = x; if (x > ax1) ax1 = x;
        if (y < ay0) ay0 = y; if (y > ay1) ay1 = y;
      }
      if (x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1) centro += 1;
    }
  }
  if (!n) return null;
  return {
    vmBox: [x0, y0, x1, y1],
    vmFrac: [+(x0 / w).toFixed(4), +(y0 / h).toFixed(4)],
    centroPx: centro,
    armaFrac: +(armaN / (w * h)).toFixed(4),
    armaBordas: armaN
      ? (ax0 <= 1 ? 1 : 0) + (ay0 <= 1 ? 1 : 0) + (ax1 >= w - 2 ? 1 : 0) + (ay1 >= h - 2 ? 1 : 0)
      : 0,
    armaDiagFrac: armaN ? +(Math.hypot(ax1 - ax0, ay1 - ay0) / Math.hypot(w, h)).toFixed(4) : 0,
  };
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const saida = {};
for (const arma of ARMAS) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const registro = { arma, modo: MODO, passos: [], erro: null };
  try {
    await page.goto(
      `${BASE}/?debug=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0&${QS_MODO}`,
      { waitUntil: 'load', timeout: 180000 },
    );
    await page.waitForFunction(() => window.__game?.player, null, { timeout: 180000 });
    await page.waitForFunction((w) => window.__authoredVm?.entry?.(w), arma, { timeout: 180000 });
    const sonda = await page.evaluate(`(${SONDA})(${JSON.stringify(arma)})`);
    if (sonda !== 'ok') throw new Error(`sonda: ${sonda}`);
    registro.base = await page.evaluate(() => window.__coroFrameBase);

    const aplica = async (x, y) => {
      await page.evaluate(({ w, x: fx, y: fy }) => {
        const g = window.__game; const vm = window.__authoredVm;
        const e = vm.entry(w);
        e.frame = { ...e.frame, x: fx, y: fy };
        if (!g.__calibraVmUpdate) g.__calibraVmUpdate = vm.update.bind(vm);
        g.__calibraVmUpdate(0);
        vm.update = () => {};
      }, { w: arma, x, y });
      await new Promise((r) => setTimeout(r, 120));
      return mede(await page.screenshot({ type: 'png' }));
    };

    let x = registro.base.x; let y = registro.base.y;
    let m = await aplica(x, y);
    if (!m) throw new Error('sem silhueta no frame base');
    registro.passos.push({ x: +x.toFixed(4), y: +y.toFixed(4), ...m });

    /* Derivada MEDIDA, não assumida: um passo de 6 cm em cada eixo diz quanto
       a caixa anda por metro. Sem isso o ajuste vira varredura. */
    const D = 0.06;
    const mx = await aplica(x + D, y);
    const my = await aplica(x, y + D);
    const dxdX = mx && m ? (mx.vmFrac[0] - m.vmFrac[0]) / D : 0;
    const dydY = my && m ? (my.vmFrac[1] - m.vmFrac[1]) / D : 0;
    registro.derivada = { dxdX: +dxdX.toFixed(4), dydY: +dydY.toFixed(4) };
    if (Math.abs(dxdX) < 0.05 || Math.abs(dydY) < 0.05) {
      throw new Error(`derivada degenerada (dx/dX=${dxdX.toFixed(3)} dy/dY=${dydY.toFixed(3)})`);
    }

    for (let i = 0; i < ITER; i += 1) {
      const alvoX = x + (ALVO_X - m.vmFrac[0]) / dxdX;
      const alvoY = y + (ALVO_Y - m.vmFrac[1]) / dydY;
      x = alvoX; y = alvoY;
      m = await aplica(x, y);
      if (!m) throw new Error('viewmodel saiu do quadro durante a calibração');
      registro.passos.push({ x: +x.toFixed(4), y: +y.toFixed(4), ...m });
      const dentro = m.vmFrac[0] >= 0.50 && m.vmFrac[0] <= 0.66 && m.vmFrac[1] >= 0.45
        && m.centroPx === 0 && m.armaFrac <= 0.28 && m.armaBordas < 3
        && !(m.armaFrac < 0.02 && m.armaDiagFrac < 0.12);
      if (dentro) break;
    }
    const fim = registro.passos.at(-1);
    registro.proposta = { x: +fim.x.toFixed(3), y: +fim.y.toFixed(3) };

    /* Famílias de pistola sacam pelo arco procedural, e o `P6` cobra que o
       primeiro quadro NÃO mostre a pose pronta: a caixa tem que nascer abaixo
       de 75% da altura. `drawDrop` é o metro que empurra ela para lá. */
    const familia = VM_WEAPON[arma]?.family;
    if (VM_FAMILY[familia]?.equip === 'pistol') {
      const noSaque = async (drop) => {
        await page.evaluate(({ w, drop }) => {
          const vm = window.__authoredVm; const e = vm.entry(w);
          e.frame = { ...e.frame, drawDrop: drop };
          e.drawDuration = Math.max(0.12, e.drawDuration || 0.32);
          e.state = 'draw'; e.stateUntil = Infinity; e.drawTime = 0;
          window.__game.__calibraVmUpdate(0);
          vm.update = () => {};
        }, { w: arma, drop });
        await new Promise((r) => setTimeout(r, 120));
        return mede(await page.screenshot({ type: 'png' }));
      };
      let drop = fim.y !== undefined ? 0.22 : 0.22;
      let melhor = null;
      for (let i = 0; i < 6; i += 1) {
        const q = await noSaque(drop);
        const topo = q ? q.vmFrac[1] : 1;
        const pixels = q ? 1 : 0;
        melhor = { drop: +drop.toFixed(3), topo: +topo.toFixed(3), visivel: pixels };
        if (!q || topo >= 0.78) break;
        drop += Math.max(0.05, (0.80 - topo) / Math.abs(dydY));
        if (drop > 3) break;
      }
      registro.saque = melhor;
      registro.proposta.drawDrop = melhor?.drop;
    }
    registro.aprovado = fim.vmFrac[0] >= 0.50 && fim.vmFrac[0] <= 0.66 && fim.vmFrac[1] >= 0.45
      && fim.centroPx === 0 && fim.armaFrac <= 0.28 && fim.armaBordas < 3
      && !(fim.armaFrac < 0.02 && fim.armaDiagFrac < 0.12);
    await fs.writeFile(path.join(OUT, `${arma}-idle.png`), await page.screenshot({ type: 'png' }));
  } catch (e) {
    registro.erro = String(e.message || e).slice(0, 200);
  }
  await page.close().catch(() => {});
  saida[arma] = registro;
  const fim = registro.passos.at(-1);
  console.log(`${arma}: ${registro.erro ? `ERRO ${registro.erro}`
    : `${registro.aprovado ? 'ok ' : 'RUIM'} x=${registro.proposta.x} y=${registro.proposta.y}`
      + `${registro.proposta.drawDrop ? ` drawDrop=${registro.proposta.drawDrop}` : ''} `
      + `caixa=${fim.vmFrac[0]},${fim.vmFrac[1]} centro=${fim.centroPx}px armaFrac=${fim.armaFrac}`}`);
}
await browser.close();
srv.kill();

await fs.writeFile(path.join(OUT, 'calibra.json'), JSON.stringify(saida, null, 2));
const ruins = Object.values(saida).filter((r) => r.erro || !r.aprovado);
console.log(`\nCALIBRA [${MODO}]: ${ARMAS.length - ruins.length}/${ARMAS.length} dentro do C5 · ${path.relative(ROOT, OUT)}/calibra.json`);
process.exitCode = ruins.length ? 1 : 0;
