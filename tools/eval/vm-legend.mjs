#!/usr/bin/env node
/* ============================================================================
   vm-legend.mjs — LEGENDA ESTRUTURAL do viewmodel no jogo real: cada malha,
   material e LADO de braço recebe uma cor chapada própria, e cada pixel do
   frame passa a ter nome (nó, material, joints dominantes).

   Por que existe: "uma peça retangular escura junto ao cabo" e "a mão de
   apoio não aparece" eram descrições de pixel sem dono. A sonda do gauntlet
   pinta TODAS as mãos de magenta — não separa a mão de apoio da dominante, e
   uma pegada a duas mãos legítima é UM componente conexo. Aqui a mão
   esquerda é verde, a direita magenta, o pente amarelo e cada material da
   arma tem cor própria: contar pixel por cor É medir presença por peça.

   Uso: node tools/eval/vm-legend.mjs [--arma=pistol] [--modo=kinemation|golden|goldsrc|retarget]
          [--largura=1440] [--altura=960] [--porta=8351]
          [--saida=artifacts/viewmodels/golden-pistol/legend]
   Estados capturados: idle, olhar-cima, fire@0.04, reload@0.60, reload@0.92.
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const ARMA = arg('arma') || 'pistol';
const MODO = arg('modo') || 'kinemation';
const PORTA = arg('porta') || '8351';
const BASE = `http://127.0.0.1:${PORTA}`;
const W = Number(arg('largura')) || 1440;
const H = Number(arg('altura')) || 960;
const OUT = path.resolve(ROOT, arg('saida') || `artifacts/viewmodels/golden-${ARMA}/legend`);
// Mesmos overrides de enquadramento do vm-gauntlet: --quadro-x/y/z/fov/pitch/yaw/roll.
const quadroNumero = (name) => (arg(name) === '' ? null : Number(arg(name)));
const QUADRO = {
  x: quadroNumero('quadro-x'), y: quadroNumero('quadro-y'), z: quadroNumero('quadro-z'),
  fov: quadroNumero('quadro-fov'), pitch: quadroNumero('quadro-pitch'),
  yaw: quadroNumero('quadro-yaw'), roll: quadroNumero('quadro-roll'),
};
const FAMILIAS_A = 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,shotgun,lmg';
const QS_MODO = MODO === 'kinemation' ? `vmready=${FAMILIAS_A}&vmgolden=0`
  : MODO === 'retarget' ? 'rt=1' : MODO === 'golden' ? 'vmgolden=1' : 'cs16=1';

/* Paleta chapada: cada entrada dista ≥120 em algum canal das outras, então o
   vizinho mais próximo classifica sem ambiguidade mesmo com antialiasing. */
const PALETA = [
  [255, 128, 0], [0, 128, 255], [255, 0, 0], [0, 0, 255], [128, 0, 255], [0, 255, 128],
  [255, 0, 128], [128, 255, 0], [0, 255, 255], [255, 255, 255], [128, 128, 255], [255, 128, 128],
  [128, 64, 0], [0, 128, 128],
];
const COR_MAO_L = [0, 255, 0];
const COR_MAO_R = [255, 0, 255];
const COR_PENTE = [255, 255, 0];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore', cwd: ROOT });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}
await fs.mkdir(OUT, { recursive: true });

// Pinta no navegador e devolve a legenda cor → peça.
const PINTA = `((ARMA, PALETA, COR_L, COR_R, COR_PENTE, QUADRO) => {
  const g = window.__game; const vm = window.__authoredVm;
  try { g._switchWeapon(ARMA); } catch (err) { return { erro: 'switch: ' + err.message }; }
  if (g.player.weapon !== ARMA) return { erro: 'nao-empunhou:' + g.player.weapon };
  const e = vm?.entry?.(ARMA);
  if (!e) return { erro: 'sem-entry' };
  if (Object.values(QUADRO).some((value) => value !== null)) {
    e.frame = {
      ...e.frame,
      x: QUADRO.x ?? e.frame.x, y: QUADRO.y ?? e.frame.y, z: QUADRO.z ?? e.frame.z,
      rotDeg: [QUADRO.pitch ?? e.frame.rotDeg[0], QUADRO.yaw ?? e.frame.rotDeg[1], QUADRO.roll ?? e.frame.rotDeg[2]],
    };
    if (QUADRO.fov !== null) e.cameraFov = QUADRO.fov;
    g.vmCamera.fov = vm.fov(ARMA, g.vmCamera.aspect); g.vmCamera.updateProjectionMatrix();
  }
  const flat = (m, [r, gg, b]) => {
    const c = m.clone();
    c.map = null; c.normalMap = null; c.roughnessMap = null; c.metalnessMap = null; c.emissiveMap = null;
    c.roughness = 1; c.metalness = 0; c.transparent = false; c.opacity = 1; c.toneMapped = false;
    c.envMapIntensity = 0;
    if (c.color) c.color.setRGB(c.emissive ? 0 : r / 255, c.emissive ? 0 : gg / 255, c.emissive ? 0 : b / 255);
    if (c.emissive) { c.emissive.setRGB(r / 255, gg / 255, b / 255); c.emissiveIntensity = 1; }
    c.needsUpdate = true;
    return c;
  };
  const maos = new Set(e.handMeshes || []);
  const legenda = [];
  let paletaIdx = 0;
  const dominantes = (o, indices) => {
    // joints dominantes (soma de peso) do subconjunto de vértices
    const jo = o.geometry.getAttribute('skinIndex'); const we = o.geometry.getAttribute('skinWeight');
    if (!jo || !we || !o.skeleton) return [];
    const soma = new Map();
    for (const v of indices) {
      for (const k of ['X', 'Y', 'Z', 'W']) {
        const j = jo['get' + k](v); const w = we['get' + k](v);
        if (w > 0) soma.set(j, (soma.get(j) || 0) + w);
      }
    }
    return [...soma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([j, w]) => o.skeleton.bones[j]?.name + ':' + (w / Math.max(1, indices.length)).toFixed(2));
  };
  const objetos = []; e.scene.traverse((o) => { if (o.isMesh) objetos.push(o); });
  // Toda malha vira grupos + array de materiais: é a única forma de pintar
  // subconjuntos de triângulos (lado do braço, pente) sem clonar geometria.
  const reagrupa = (o, particoes) => {
    const geo = o.geometry.clone(); const novo = []; let off = 0; const mats2 = [];
    for (const p of particoes) {
      if (!p.tris.length) continue;
      novo.push(...p.tris); mats2.push(flat(p.mat, p.cor));
      geo.clearGroups && null;
      p.start = off; p.count = p.tris.length; off += p.tris.length;
    }
    geo.setIndex(novo); geo.clearGroups();
    let gi = 0; for (const p of particoes) { if (!p.tris.length) continue; geo.addGroup(p.start, p.count, gi++); }
    o.geometry = geo; o.material = mats2;
  };
  for (const o of objetos) {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const idx = o.geometry.index?.array;
    if (!idx) { o.material = mats.map((m) => flat(m, [128, 128, 128])); continue; }
    const jo = o.geometry.getAttribute('skinIndex'); const we = o.geometry.getAttribute('skinWeight');
    const grupos = o.geometry.groups?.length ? o.geometry.groups : [{ start: 0, count: idx.length, materialIndex: 0 }];
    if (maos.has(o) && o.isSkinnedMesh) {
      const lado = (v) => {
        let l = 0; let r = 0;
        for (const k of ['X', 'Y', 'Z', 'W']) {
          const name = o.skeleton.bones[jo['get' + k](v)]?.name || ''; const w = we['get' + k](v);
          if (/_l$/i.test(name)) l += w; else if (/_r$/i.test(name)) r += w;
        }
        return l > r ? 0 : r > l ? 1 : 2;
      };
      const part = [[], [], []];
      for (let i = 0; i < idx.length; i += 3) {
        const tri = [idx[i], idx[i + 1], idx[i + 2]];
        const votos = [0, 0, 0]; tri.forEach((v) => votos[lado(v)]++);
        part[votos[0] >= 2 ? 0 : votos[1] >= 2 ? 1 : 2].push(...tri);
      }
      const base = mats[0];
      reagrupa(o, [{ tris: part[0], mat: base, cor: COR_L }, { tris: part[1], mat: base, cor: COR_R }, { tris: part[2], mat: base, cor: [128, 128, 128] }]);
      legenda.push({ cor: COR_L, no: o.name, material: base.name, parte: 'mão/braço ESQUERDO', tris: part[0].length / 3, joints: dominantes(o, [...new Set(part[0])]) });
      legenda.push({ cor: COR_R, no: o.name, material: base.name, parte: 'mão/braço DIREITO', tris: part[1].length / 3, joints: dominantes(o, [...new Set(part[1])]) });
      continue;
    }
    const magJoint = o.isSkinnedMesh ? o.skeleton.bones.findIndex((b) => b.name === 'Mag') : -1;
    const ehMag = (v) => {
      if (magJoint < 0 || !jo || !we) return false;
      let w = 0;
      for (const k of ['X', 'Y', 'Z', 'W']) if (jo['get' + k](v) === magJoint) w += we['get' + k](v);
      return w > 0.5;
    };
    const particoes = grupos.map((grp) => ({ tris: [], mat: mats[grp.materialIndex ?? 0] || mats[0], cor: null }));
    const magTris = [];
    grupos.forEach((grp, gi) => {
      for (let i = grp.start; i < grp.start + grp.count; i += 3) {
        const tri = [idx[i], idx[i + 1], idx[i + 2]];
        (tri.filter(ehMag).length >= 2 ? magTris : particoes[gi].tris).push(...tri);
      }
    });
    for (const p of particoes) {
      if (!p.tris.length) continue;
      p.cor = /MAG/i.test(o.name) ? COR_PENTE : PALETA[paletaIdx++ % PALETA.length];
      legenda.push({ cor: p.cor, no: o.name, material: p.mat?.name, parte: /MAG/i.test(o.name) ? 'pente' : 'arma', tris: p.tris.length / 3, joints: dominantes(o, [...new Set(p.tris)]) });
    }
    if (magTris.length) {
      particoes.push({ tris: magTris, mat: mats[0], cor: COR_PENTE });
      legenda.push({ cor: COR_PENTE, no: o.name, material: '(joint Mag)', parte: 'pente', tris: magTris.length / 3, joints: dominantes(o, [...new Set(magTris)]) });
    }
    reagrupa(o, particoes);
  }
  g.scene.visible = false;
  for (const el of document.body.children) {
    if (el.id === 'game-container' || el.tagName === 'SCRIPT' || el.tagName === 'META') continue;
    el.style.visibility = 'hidden';
  }
  return { legenda, chave: e.key, clips: [...e.clips.keys()], frame: e.frame, fov: g.vmCamera.fov };
})`;

const PROJETA = `((ARMA, W, H) => {
  const g = window.__game; const e = window.__authoredVm.entry(ARMA);
  e.scene.updateWorldMatrix(true, true); g.vmCamera.updateWorldMatrix(true, false);
  const nomes = ['hand_l', 'hand_r', 'ik_hand_gun', 'Mag', 'Slider', 'Barrel', 'lowerarm_l', 'lowerarm_r', 'index_01_l', 'thumb_01_l'];
  const out = {};
  for (const n of nomes) {
    const o = e.scene.getObjectByName(n); if (!o) continue;
    const p = new (o.position.constructor)(); o.getWorldPosition(p);
    const q = p.clone().project(g.vmCamera);
    out[n] = { x: +((q.x + 1) * W / 2).toFixed(1), y: +((1 - q.y) * H / 2).toFixed(1), z: +q.z.toFixed(3), dentro: Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1 };
  }
  return out;
})`;

function maisProxima(r, g, b, cores) {
  let melhor = -1; let dist = 1e9;
  cores.forEach((c, i) => {
    const d = Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b);
    if (d < dist) { dist = d; melhor = i; }
  });
  return dist <= 90 ? melhor : -1;
}

async function mede(buf, cores) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width; const h = info.height; const ch = info.channels;
  const acc = cores.map(() => ({ px: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const k = maisProxima(data[i], data[i + 1], data[i + 2], cores);
      if (k < 0) continue;
      const a = acc[k]; a.px++; a.sx += x; a.sy += y;
      if (x < a.x0) a.x0 = x; if (x > a.x1) a.x1 = x; if (y < a.y0) a.y0 = y; if (y > a.y1) a.y1 = y;
    }
  }
  return acc.map((a) => (a.px ? { px: a.px, c: [+(a.sx / a.px).toFixed(1), +(a.sy / a.px).toFixed(1)], box: [a.x0, a.y0, a.x1, a.y1] } : { px: 0, c: null, box: null }));
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const relatorio = { arma: ARMA, modo: MODO, viewport: { W, H }, legenda: [], estados: [] };
try {
  await page.goto(`${BASE}/?debug=1&${QS_MODO}&auto=E&vmweapon=${ARMA}&map=brasilia&armaslazy=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForFunction((w) => window.__authoredVm?.entry?.(w), ARMA, { timeout: 120000 });
  await page.waitForTimeout(700);
  const pintado = await page.evaluate(`(${PINTA})(${JSON.stringify(ARMA)}, ${JSON.stringify(PALETA)}, ${JSON.stringify(COR_MAO_L)}, ${JSON.stringify(COR_MAO_R)}, ${JSON.stringify(COR_PENTE)}, ${JSON.stringify(QUADRO)})`);
  if (pintado.erro) throw new Error(pintado.erro);
  // Entradas com a MESMA cor (lado do braço nas três malhas, pente) somam-se.
  const porCor = new Map();
  for (const l of pintado.legenda) {
    const k = l.cor.join(',');
    if (!porCor.has(k)) porCor.set(k, { ...l, no: [l.no], tris: 0, joints: [] });
    const m = porCor.get(k); if (!m.no.includes(l.no)) m.no.push(l.no); m.tris += l.tris; m.joints = [...new Set([...m.joints, ...l.joints])].slice(0, 6);
  }
  relatorio.legenda = [...porCor.values()].map((l) => ({ ...l, no: l.no.join('+') }));
  relatorio.chave = pintado.chave; relatorio.clips = pintado.clips; relatorio.frame = pintado.frame; relatorio.fov = pintado.fov;
  relatorio.servedGlb = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((u) => u.includes('/viewmodels/') && u.includes('.glb'));
    if (!url) return null;
    const bytes = await (await fetch(url, { cache: 'no-store' })).arrayBuffer();
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return { url, bytes: bytes.byteLength, sha256: [...d].map((b) => b.toString(16).padStart(2, '0')).join('') };
  });
  await page.waitForTimeout(1600); // saque termina
  const cores = relatorio.legenda.map((l) => l.cor);

  const captura = async (nome, setup) => {
    const meta = await page.evaluate(`(${setup})(${JSON.stringify({ w: ARMA })})`);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const ossos = await page.evaluate(`(${PROJETA})(${JSON.stringify(ARMA)}, ${W}, ${H})`);
    const buf = await page.screenshot({ type: 'png' });
    await fs.writeFile(path.join(OUT, `${nome}.png`), buf);
    const contagem = await mede(buf, cores);
    relatorio.estados.push({ nome, meta, ossos, pecas: relatorio.legenda.map((l, i) => ({ parte: l.parte, no: l.no, material: l.material, cor: l.cor, ...contagem[i] })) });
    return buf;
  };
  const congela = (fraction, clipAlias, stateName) => `({ w }) => {
    const game = window.__game; const vm = window.__authoredVm; const entry = vm.entry(w);
    if (!game.__legendVmUpdate) game.__legendVmUpdate = vm.update.bind(vm);
    const clip = entry.clips.get(${JSON.stringify(clipAlias)});
    if (!clip) return { erro: 'sem clip ${clipAlias}' };
    const action = entry.mixer.clipAction(clip);
    entry.mixer.stopAllAction(); action.reset(); action.enabled = true; action.setEffectiveWeight(1); action.setEffectiveTimeScale(1);
    action.time = Math.min(clip.duration - 1e-4, clip.duration * ${fraction}); action.play(); entry.mixer.update(0); action.paused = true;
    entry.state = ${JSON.stringify(stateName)}; entry.action = action;
    vm.update = () => {}; entry.qaUpdateMag?.();
    return { clip: clip.name, fraction: ${fraction}, time: action.time };
  }`;
  await captura('idle', `({ w }) => { const e = window.__authoredVm.entry(w); return { state: e.state, clip: e.action?.getClip?.().name }; }`);
  await captura('olhar-cima', `({ w }) => { const g = window.__game; g.player.pitch = 1.05; g.update(0, true); return { pitch: 1.05 }; }`);
  await page.evaluate(() => { const g = window.__game; g.player.pitch = 0; g.update(0, true); });
  await captura('fire-004', congela(0.04, 'shoot', 'fire'));
  await captura('reload-060', congela(0.6, 'reload_tactical', 'reload'));
  await captura('reload-092', congela(0.92, 'reload_tactical', 'reload'));

  // Folha legível: cada estado com a legenda ao lado.
  const CELL = { w: 720, h: 480 };
  const linhas = relatorio.legenda.map((l, i) => {
    const px = relatorio.estados.map((s) => s.pecas[i].px);
    return `<rect x="8" y="${8 + i * 22}" width="14" height="14" fill="rgb(${l.cor.join(',')})"/>` +
      `<text x="28" y="${20 + i * 22}" font-family="monospace" font-size="13" fill="#f4f7fa">${l.parte} · ${l.no} · ${l.material || ''} · ${l.joints.slice(0, 2).join(' ')} · px ${px.join('/')}</text>`;
  }).join('');
  const legendaSvg = Buffer.from(`<svg width="${CELL.w * 2}" height="${Math.max(CELL.h, 30 + relatorio.legenda.length * 22)}"><rect width="100%" height="100%" fill="#071019"/>${linhas}</svg>`);
  const cells = await Promise.all(relatorio.estados.map(async (s) => sharp(path.join(OUT, `${s.nome}.png`)).resize(CELL.w, CELL.h)
    .composite([{ input: Buffer.from(`<svg width="${CELL.w}" height="40"><rect width="100%" height="40" fill="#071019dd"/><text x="12" y="28" font-family="monospace" font-size="22" fill="#f4f7fa">${s.nome} · L ${s.pecas.find((p) => p.parte.includes('ESQ'))?.px ?? '-'}px · R ${s.pecas.find((p) => p.parte.includes('DIR'))?.px ?? '-'}px</text></svg>`), top: 0, left: 0 }])
    .png().toBuffer()));
  const legendaPng = await sharp(legendaSvg).png().toBuffer();
  const legendaMeta = await sharp(legendaPng).metadata();
  const cols = 3; const rows = Math.ceil(cells.length / cols);
  const sheet = await sharp({ create: { width: CELL.w * cols, height: CELL.h * rows + legendaMeta.height, channels: 3, background: '#071019' } })
    .composite([...cells.map((input, i) => ({ input, left: (i % cols) * CELL.w, top: Math.floor(i / cols) * CELL.h })), { input: legendaPng, left: 0, top: CELL.h * rows }])
    .png().toBuffer();
  await fs.writeFile(path.join(OUT, 'legend-sheet.png'), sheet);
  await fs.writeFile(path.join(OUT, 'legend-report.json'), JSON.stringify(relatorio, null, 2));
  for (const s of relatorio.estados) {
    console.log(`\n[${s.nome}] ${JSON.stringify(s.meta)}`);
    for (const p of s.pecas) if (p.px) console.log(`  ${String(p.px).padStart(7)}px  ${p.parte.padEnd(20)} ${p.no} · ${p.material || ''} · box ${JSON.stringify(p.box)}`);
    console.log(`  ossos: ${Object.entries(s.ossos).map(([k, v]) => `${k}(${v.x},${v.y}${v.dentro ? '' : ' FORA'})`).join(' ')}`);
  }
  console.log(`\nlegenda em ${path.relative(ROOT, OUT)}/legend-sheet.png`);
} finally {
  await browser.close();
  srv.kill();
}
