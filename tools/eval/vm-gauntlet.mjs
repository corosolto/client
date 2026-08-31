#!/usr/bin/env node
/* ============================================================================
   vm-gauntlet.mjs — GAUNTLET DO VIEWMODEL: grava ARMA POR ARMA no jogo real e
   MEDE em pixel os defeitos que o dono aponta na tela (31/08).

   Por que existe: `eval:goldsrc` lê o GLB e fica verde enquanto a TELA está
   errada — arma gigante, mão flutuando longe do cabo, recarga arrancando a
   arma inteira em vez do pente. Nenhum desses defeitos aparece no GLB: eles
   nascem da COMPOSIÇÃO (escala do mount, fov, âncora) e só existem no frame.

   Como mede: liga a SONDA DE CORES no jogo (mãos = magenta, arma = ciano,
   pente = amarelo, mundo apagado), tira frames nos estados reais (idle, tiro,
   recarga em 8 tempos) e conta pixels:

     P1 · maos     — existe silhueta de mão no quadro
     P2 · escala   — a arma ocupa uma fração sã do quadro e não estoura a borda
     P3 · aperto   — a mão ENCOSTA na arma (defeito "mão/braço no ar")
     P4 · pente    — na recarga o PENTE anda e a ARMA fica (defeito "arranca a
                     arma toda"); mede excursão do pente vs da arma
     P5 · quadro   — a arma não sai do quadro no meio da recarga
     P6 · saque    — Equip nasce fora da tela, progride e fecha em Idle
     P7 · tiro     — Shoot tem excursão legível e retorna para Idle

   Uso: node tools/eval/vm-gauntlet.mjs [--armas=ak,m4] [--porta=8311]
        [--out=tools/eval/out/vm-gauntlet] [--frames] [--largura=1440]
        [--altura=960] [--mutante=sem-pente|centro|mao-direita-alta|topo|draw-idle|tiro-estatico]
   Ferramenta LOCAL: precisa dos private-assets, Playwright global e sharp.
   ============================================================================ */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import sharp from 'sharp';

import { WEAPON_IDS } from '../../public/js/weapons.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const PORTA = arg('porta') || '8311';
const BASE = `http://127.0.0.1:${PORTA}`;
const OUT = arg('out') || arg('saida') || path.join(ROOT, 'tools/eval/out/vm-gauntlet');
const SALVA_FRAMES = process.argv.includes('--frames');
const MUTANTE = arg('mutante');
const AJUSTE_X = Number(arg('ajuste-x')) || 0;
/* A faca não passa pelo caminho autorado (tem controlador melee próprio) e a
   espera pela entry estourava 120s por arma. Fica de fora por contrato. */
const ARMAS = (arg('armas') ? arg('armas').split(',')
  : arg('modo') === 'golden' ? ['ak'] : WEAPON_IDS.filter((w) => w !== 'knife')).filter(Boolean);
/* --modo=goldsrc (trilha B, padrão) | kinemation (trilha A): a MESMA régua nas
   duas trilhas é o que torna a escolha entre elas uma medida e não uma opinião. */
const MODO = arg('modo') || 'goldsrc';
const FAMILIAS_A = 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,shotgun,lmg';
const QS_MODO = MODO === 'kinemation' ? `vmready=${FAMILIAS_A}&vmgolden=0`
  : MODO === 'retarget' ? 'rt=1'
  : MODO === 'golden' ? 'vmgolden=1' : 'cs16=1';
const W = Number(arg('largura')) || 1440;
const H = Number(arg('altura')) || 960;

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

// --- SONDA: pinta o pacote e apaga o resto, para o pixel virar medida --------
const SONDA = `((ARMA, MUTANTE, AJUSTE_X) => {
  const g = window.__game; const vm = window.__authoredVm;
  /* A sonda pegava a entry de \`g.player.weapon\` — que NEM SEMPRE é a arma
     pedida na URL (o loadout do spawn manda). Nessas armas a pintura não
     acontecia, o frame saía normal e a régua media o CENÁRIO. A arma vem por
     parâmetro agora, e sem entry a captura FALHA em vez de mentir. */
  /* Além de pintar a entry certa, EMPUNHA a arma pedida: o loadout do spawn
     trocava a arma depois do ?vmweapon e a captura media outra coisa. */
  try { g._switchWeapon(ARMA); } catch (err) { return 'switch: ' + err.message; }
  if (g.player.weapon !== ARMA) return 'nao-empunhou:' + g.player.weapon;
  const e = vm?.entry?.(ARMA);
  if (!e) return 'sem-entry';
  const mats = (o) => Array.isArray(o.material) ? o.material : [o.material];
  const pinta = (o, r, gg, b) => {
    for (const m of mats(o)) {
      if (!m) continue;
      if (!m.userData.__coroBackup) {
        m.userData.__coroBackup = {
          color: m.color && m.color.clone(), map: m.map,
          emissive: m.emissive && m.emissive.clone(), ei: m.emissiveIntensity,
          rough: m.roughness, metal: m.metalness,
        };
      }
      // cor CHAPADA: emissivo puro + albedo preto + toneMapped=false. Com a
      // iluminação da vmScene por cima, o magenta saía (250,180,230) e nenhum
      // limiar honesto separava isso do céu — a cor tem que ser exata.
      m.map = null; m.roughness = 1; m.metalness = 0;
      m.transparent = false; m.opacity = 1; m.toneMapped = false;
      if (m.color) m.color.setRGB(m.emissive ? 0 : r, m.emissive ? 0 : gg, m.emissive ? 0 : b);
      if (m.emissive) { m.emissive.setRGB(r, gg, b); m.emissiveIntensity = 1; }
      m.needsUpdate = true;
    }
  };
  const maos = new Set(e.handMeshes || []);
  e.scene.traverse((o) => {
    if (!o.isMesh) return;
    // Pente e corpo compartilham material. Sem clone por malha, a última
    // pintura deixa ambos cianos e a régua inventa zero pixel de pente.
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => m?.clone?.() || m)
      : (o.material?.clone?.() || o.material);
    if (maos.has(o)) pinta(o, 1, 0, 1);                    // mão = magenta
    else if (/MAG/i.test(o.name)) {
      if (MUTANTE === 'sem-pente') o.visible = false;
      pinta(o, 1, 1, 0);                                  // pente = amarelo
    }
    else pinta(o, 0, 1, 1);                                // arma = ciano
  });
  e.frame.x += AJUSTE_X;
  if (MUTANTE === 'centro') e.frame.x -= 0.42;
  if (MUTANTE === 'topo') e.frame.y += 0.5;
  g.scene.visible = false;                                 // mundo apagado
  // o canvas mora DENTRO de #game-container: esconder "tudo que não é canvas"
  // apagava o jogo inteiro (frame preto). Some só com o HUD, que tem texto
  // amarelo/verde e envenenaria a contagem de pixels.
  for (const el of document.body.children) {
    if (el.id === 'game-container' || el.tagName === 'SCRIPT' || el.tagName === 'META') continue;
    el.style.visibility = 'hidden';
  }
  return 'ok';
})`;

/* Classificador ESTRITO: só conta cor emissiva saturada. A regra relativa
   ("canal dominante") chamava o CÉU (70,120,180) de arma — o mundo apagado
   ainda deixa o céu no frame. Emissivo saturado passa de 150 e o par oposto
   fica abaixo de 90; nada do cenário cai nessa faixa. */
function classifica(r, g, b) {
  if (r > 200 && b > 200 && g < 70) return 1;  // magenta = mão
  if (g > 200 && b > 200 && r < 70) return 2;  // ciano = arma
  if (r > 200 && g > 200 && b < 70) return 3;  // amarelo = pente
  return 0;
}

async function medeFrame(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const w = info.width; const h = info.height; const ch = info.channels;
  const mapa = new Uint8Array(w * h);
  const acc = [null,
    { n: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 },
    { n: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 },
    { n: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 }];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const c = classifica(data[i], data[i + 1], data[i + 2]);
      mapa[y * w + x] = c;
      if (!c) continue;
      const a = acc[c];
      a.n += 1; a.sx += x; a.sy += y;
      if (x < a.x0) a.x0 = x; if (x > a.x1) a.x1 = x;
      if (y < a.y0) a.y0 = y; if (y > a.y1) a.y1 = y;
    }
  }
  const cx = (a) => (a.n ? a.sx / a.n : null);
  const cy = (a) => (a.n ? a.sy / a.n : null);
  /* Contato mão↔arma. A primeira versão media "que FRAÇÃO da mão encosta na
     arma" e reprovava braço legítimo: um antebraço inteiro no quadro é quase
     todo longe da arma por definição (a AK e a M4 davam 10% com a mão NO cabo).
     O que denuncia mão no ar é DISTÂNCIA: se a silhueta da mão nunca chega
     perto da arma, ela está solta. Grade grossa de 8px para o vizinho mais
     próximo — precisão de sobra para um defeito que é de dezenas de píxeis. */
  const G = 8;
  const gw = Math.ceil(w / G); const gh = Math.ceil(h / G);
  const grade = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = mapa[y * w + x];
      if (c === 2 || c === 3) grade[((y / G) | 0) * gw + ((x / G) | 0)] = 1;
    }
  }
  const gridDist = new Int16Array(gw * gh); gridDist.fill(-1);
  const fila = new Int32Array(gw * gh); let qi = 0; let qf = 0;
  for (let i = 0; i < grade.length; i++) {
    if (grade[i]) { gridDist[i] = 0; fila[qf++] = i; }
  }
  while (qi < qf) {
    const i = fila[qi++]; const x = i % gw; const y = (i / gw) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= gw || y + dy < 0 || y + dy >= gh) continue;
      const j = (y + dy) * gw + x + dx;
      if (gridDist[j] < 0) { gridDist[j] = gridDist[i] + 1; fila[qf++] = j; }
    }
  }
  let encosta = 0;
  let distMin = Infinity;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (mapa[y * w + x] !== 1) continue;
      const gx = (x / G) | 0; const gy = (y / G) | 0;
      let achou = -1;
      for (let raio = 0; raio <= 24 && achou < 0; raio += 1) {
        for (let dy = -raio; dy <= raio && achou < 0; dy += 1) {
          const yy = gy + dy; if (yy < 0 || yy >= gh) continue;
          for (let dx = -raio; dx <= raio; dx += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue;
            const xx = gx + dx; if (xx < 0 || xx >= gw) continue;
            if (grade[yy * gw + xx]) { achou = raio; break; }
          }
        }
      }
      if (achou === 0) encosta += 1;
      if (achou >= 0) distMin = Math.min(distMin, achou * G);
    }
  }
  if (!Number.isFinite(distMin)) distMin = -1;
  // Componentes conexos separam os dois braços. O menor contato global deixava
  // um braço agarrado absolver o outro, mesmo fechado no ar.
  const vistos = new Uint8Array(w * h); const componentes = [];
  const pxFila = new Int32Array(w * h);
  for (let origem = 0; origem < mapa.length; origem++) {
    if (mapa[origem] !== 1 || vistos[origem]) continue;
    let ini = 0; let fim = 0; pxFila[fim++] = origem; vistos[origem] = 1;
    let n = 0; let sx = 0; let sy = 0; let x0 = w; let y0 = h; let x1 = -1; let y1 = -1; let menor = 32767;
    while (ini < fim) {
      const p = pxFila[ini++]; const x = p % w; const y = (p / w) | 0;
      n++; sx += x; sy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      menor = Math.min(menor, gridDist[((y / G) | 0) * gw + ((x / G) | 0)]);
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= mapa.length || vistos[q] || mapa[q] !== 1) continue;
        if ((q === p - 1 || q === p + 1) && ((q / w) | 0) !== y) continue;
        vistos[q] = 1; pxFila[fim++] = q;
      }
    }
    if (n >= 300) componentes.push({
      px: n, c: [+(sx / n).toFixed(1), +(sy / n).toFixed(1)],
      box: [x0, y0, x1, y1], armaDistPx: menor < 32767 ? menor * G : -1,
    });
  }
  componentes.sort((a, b) => b.px - a.px);
  const areaTot = w * h;
  const arma = acc[2]; const mao = acc[1]; const pente = acc[3];
  const bordas = arma.n
    ? (arma.x0 <= 1 ? 1 : 0) + (arma.y0 <= 1 ? 1 : 0) + (arma.x1 >= w - 2 ? 1 : 0) + (arma.y1 >= h - 2 ? 1 : 0)
    : 0;
  const diag = arma.n ? Math.hypot(arma.x1 - arma.x0, arma.y1 - arma.y0) : 0;
  const presentes = [arma, mao, pente].filter((a) => a.n);
  const vmBox = presentes.length ? [
    Math.min(...presentes.map((a) => a.x0)), Math.min(...presentes.map((a) => a.y0)),
    Math.max(...presentes.map((a) => a.x1)), Math.max(...presentes.map((a) => a.y1)),
  ] : null;
  let centroPx = 0;
  for (let y = Math.floor(h * 0.42); y <= Math.ceil(h * 0.58); y++) {
    for (let x = Math.floor(w * 0.42); x <= Math.ceil(w * 0.58); x++) if (mapa[y * w + x]) centroPx++;
  }
  return {
    armaPx: arma.n, maoPx: mao.n, pentePx: pente.n,
    armaFrac: +(arma.n / areaTot).toFixed(4),
    maoFrac: +(mao.n / areaTot).toFixed(4),
    armaBordas: bordas,
    armaDiag: +diag.toFixed(1),
    armaC: arma.n ? [+cx(arma).toFixed(1), +cy(arma).toFixed(1)] : null,
    maoC: mao.n ? [+cx(mao).toFixed(1), +cy(mao).toFixed(1)] : null,
    penteC: pente.n ? [+cx(pente).toFixed(1), +cy(pente).toFixed(1)] : null,
    vmBox,
    vmFrac: vmBox ? vmBox.map((v, i) => +(v / (i % 2 ? h : w)).toFixed(4)) : null,
    centroPx,
    maoComponentes: componentes.slice(0, 4),
    apertoFrac: mao.n ? +(encosta / (mao.n / 4)).toFixed(3) : 0,
    maoArmaDistPx: distMin,
  };
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});

const relatorio = [];
for (const arma of ARMAS) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const espera = (ms) => page.waitForTimeout(ms);
  const shot = () => page.screenshot({ type: 'png' });
  const dir = path.join(OUT, arma);
  if (SALVA_FRAMES) await fs.mkdir(dir, { recursive: true });
  const r = { arma, erros: [] };
  try {
    console.log(`${arma}: abrindo runtime`);
    await page.goto(
      `${BASE}/?debug=1&${QS_MODO}&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0`,
      { waitUntil: 'domcontentloaded', timeout: 180000 },
    );
    console.log(`${arma}: aguardando partida`);
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    console.log(`${arma}: aguardando viewmodel`);
    await page.waitForFunction(
      (w) => window.__authoredVm?.entry?.(w), arma, { timeout: 120000 },
    );
    await espera(700);
    r.chave = await page.evaluate((w) => {
      const vm = window.__authoredVm;
      const e = vm.entry(w);
      return { fonte: e ? (e.key || '?') : 'sem-entry', clipes: e ? [...(e.clips?.keys?.() || [])] : [] };
    }, arma);
    if (r.chave.fonte === `gold#${arma}`) {
      r.servedGlb = await page.evaluate(async (weapon) => {
        const version = weapon === 'ak' ? 'golden-ak-4' : `golden-${weapon}-1`;
        const url = `/models/viewmodels/coro/${weapon}-hires.glb?v=${version}`;
        const response = await fetch(url, { cache: 'no-store' });
        const bytes = await response.arrayBuffer();
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
        return {
          url: response.url,
          status: response.status,
          bytes: bytes.byteLength,
          sha256: [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
        };
      }, arma);
      if (!/^[a-f0-9]{64}$/.test(r.servedGlb.sha256 || '')) r.erros.push('SHA do GLB servido ausente');
    }

    const sonda = await page.evaluate(
      `(${SONDA})(${JSON.stringify(arma)}, ${JSON.stringify(MUTANTE)}, ${JSON.stringify(AJUSTE_X)})`,
    );
    r.sonda = sonda;
    if (sonda !== 'ok') r.erros.push(`sonda: ${sonda}`);
    /* Espera o SAQUE terminar. `_switchWeapon` arma `drawUntil = t+0,42s` e o rig
       entra pela borda de baixo: capturando a 300ms, 9 das 20 armas mediram
       ZERO pixel de arma e a régua acusou "arma some" — era a régua fotografando
       o saque. As que passaram eram justamente as que o jogador JÁ segurava
       (o switch retorna cedo e não há saque). */
    await espera(1600);
    if (MUTANTE === 'mao-direita-alta') {
      await page.evaluate((w) => {
        const hand = window.__authoredVm?.entry?.(w)?.scene?.getObjectByName?.('hand_r');
        if (hand) { hand.position.y += 8; hand.updateMatrixWorld(true); }
      }, arma);
    }

    // --- IDLE ---------------------------------------------------------------
    let bIdle = await shot();
    r.idle = await medeFrame(bIdle);
    for (let tentativa = 0; tentativa < 3 && r.idle.armaPx + r.idle.maoPx === 0; tentativa += 1) {
      await espera(400);
      bIdle = await shot();
      r.idle = await medeFrame(bIdle);
    }
    if (SALVA_FRAMES) await fs.writeFile(path.join(dir, 'idle.png'), bIdle);

    // --- SAQUE (início, intermediários e fechamento) -----------------------
    r.draw = [];
    const drawFractions = [0, 0.25, 0.5, 0.75, 0.999];
    await page.evaluate(({ w, mutant }) => {
      const vm = window.__authoredVm;
      const entry = vm?.entry?.(w);
      if (mutant === 'draw-idle') vm?._idle?.(entry);
      else vm?.draw?.(w, 1);
    }, { w: arma, mutant: MUTANTE });
    for (let i = 0; i < drawFractions.length; i++) {
      const fraction = drawFractions[i];
      if (MUTANTE === 'draw-idle' && i === 1) {
        await page.evaluate((w) => window.__authoredVm?.draw?.(w, 1), arma);
      }
      const animation = await page.evaluate(({ w, fraction }) => {
        const entry = window.__authoredVm?.entry?.(w);
        const action = entry?.action;
        const duration = action?.getClip?.().duration || 0;
        if (action && duration) {
          action.paused = false;
          action.time = Math.min(duration - 1e-4, duration * fraction);
          entry.mixer.update(1e-6);
          action.paused = true;
          window.__game.update(0, true);
        }
        return { state: entry?.state || null, clip: action?.getClip?.().name || null };
      }, { w: arma, fraction });
      const b = await shot();
      const m = await medeFrame(b);
      m.fraction = fraction;
      m.state = animation.state;
      m.clip = animation.clip;
      r.draw.push(m);
      if (SALVA_FRAMES) await fs.writeFile(path.join(dir, `draw-${i}.png`), b);
    }
    await page.evaluate((w) => {
      const vm = window.__authoredVm;
      vm?._idle?.(vm.entry?.(w));
    }, arma);

    // --- TIRO ---------------------------------------------------------------
    for (let t = 0; t < 6; t++) {
      const ok = await page.evaluate(() => {
        const g = window.__game;
        const antes = g.player.ammo?.[g.player.weapon]?.mag ?? null;
        g.player.scoped = false; g.mouseDown0 = true; g._tryShoot(); g.mouseDown0 = false;
        return antes === null || (g.player.ammo?.[g.player.weapon]?.mag ?? 0) < antes;
      });
      if (ok) break;
      await espera(120);
    }
    r.tiros = [];
    const fireFractions = [0, 0.25, 0.5, 0.75, 0.999];
    for (let i = 0; i < fireFractions.length; i++) {
      const fraction = fireFractions[i];
      const animation = await page.evaluate(({ w, fraction, staticShot }) => {
        const entry = window.__authoredVm?.entry?.(w);
        const action = entry?.action;
        const duration = action?.getClip?.().duration || 0;
        if (action && duration) {
          action.paused = false;
          action.time = staticShot ? 0 : Math.min(duration - 1e-4, duration * fraction);
          entry.mixer.update(1e-6);
          action.paused = true;
          window.__game.update(0, true);
        }
        return { state: entry?.state || null, clip: action?.getClip?.().name || null };
      }, { w: arma, fraction, staticShot: MUTANTE === 'tiro-estatico' });
      const b = await shot();
      const m = await medeFrame(b);
      m.fraction = fraction;
      m.state = animation.state;
      m.clip = animation.clip;
      r.tiros.push(m);
      if (SALVA_FRAMES) await fs.writeFile(path.join(dir, `tiro-${i}.png`), b);
    }
    r.tiro = r.tiros[2];

    // --- RECARGA (6 tempos reais) ------------------------------------------
    r.reloadStart = await page.evaluate((w) => {
      const g = window.__game;
      const ammo = g.player.ammo?.[w];
      if (ammo) ammo.mag = Math.min(ammo.mag, 23);
      g.player.reloadUntil = 0;
      g.player.drawUntil = 0;
      g._startReload();
      const entry = window.__authoredVm?.entry?.(w);
      return {
        state: entry?.state || null,
        clip: entry?.action?.getClip?.().name || null,
        clipDuration: entry?.action?.getClip?.().duration || null,
        actionTime: entry?.action?.time || 0,
        timeScale: entry?.action?.timeScale || 0,
        effectiveDuration: entry?.action?.timeScale
          ? entry.action.getClip().duration / Math.abs(entry.action.timeScale) : null,
        gameplayRemaining: Math.max(0, g.player.reloadUntil - g.time),
      };
    }, arma);
    if (r.reloadStart.state !== 'reload' || !/reload/i.test(r.reloadStart.clip || '')) {
      r.erros.push(`recarga não iniciou: ${JSON.stringify(r.reloadStart)}`);
    }
    r.recarga = [];
    const reloadFractions = [0.2, 0.36, 0.52, 0.6, 0.68, 0.76, 0.84, 0.999];
    for (let i = 0; i < reloadFractions.length; i++) {
      const fraction = reloadFractions[i];
      const animation = await page.evaluate(({ w, fraction }) => {
        const entry = window.__authoredVm?.entry?.(w);
        const action = entry?.action;
        const duration = action?.getClip?.().duration || 0;
        if (action && duration) {
          action.paused = false;
          action.time = Math.min(duration - 1e-4, duration * fraction);
          entry.mixer.update(1e-6);
          action.paused = true;
          window.__game.update(0, true);
        }
        return {
          state: entry?.state || null,
          clip: action?.getClip?.().name || null,
          clipDuration: duration || null,
          actionTime: action?.time || 0,
          timeScale: action?.timeScale || 0,
          effectiveDuration: action?.timeScale ? duration / Math.abs(action.timeScale) : null,
        };
      }, { w: arma, fraction });
      const b = await shot();
      const m = await medeFrame(b);
      m.t = +((animation.effectiveDuration || 0) * fraction).toFixed(2);
      m.state = animation.state;
      m.clip = animation.clip;
      m.clipDuration = animation.clipDuration;
      m.actionTime = animation.actionTime;
      m.timeScale = animation.timeScale;
      r.recarga.push(m);
      if (SALVA_FRAMES) await fs.writeFile(path.join(dir, `recarga-${i}.png`), b);
    }
    r.reloadEnd = await page.evaluate((w) => {
      const entry = window.__authoredVm?.entry?.(w);
      const action = entry?.action;
      if (action) {
        action.paused = false;
        action.time = Math.max(0, action.getClip().duration - 1e-4);
        entry.mixer.update(0.1);
      }
      return { state: entry?.state || null, clip: entry?.action?.getClip?.().name || null };
    }, arma);
  } catch (e) {
    r.erros.push(String(e.message || e).slice(0, 200));
  }
  await page.close().catch(() => {});
  relatorio.push(r);
  console.log(`${arma}: ${r.erros.length ? `ERRO ${r.erros[0]}` : 'capturado'}`);
}

await browser.close();
srv.kill();

// --- VEREDITO ---------------------------------------------------------------
const notas = [];
for (const r of relatorio) {
  const f = [];
  if (r.erros.length) f.push(`captura falhou: ${r.erros[0]}`);
  const i = r.idle;
  if (i) {
    if (i.maoPx < 3000) f.push(`P1 mãos: só ${i.maoPx}px de mão no quadro`);
    if ((i.maoComponentes || []).filter((c) => c.px >= 1000).length < 2) f.push('P1 mãos: não há duas silhuetas de braço independentes');
    if (i.armaFrac > 0.28) f.push(`P2 escala: arma ocupa ${(i.armaFrac * 100).toFixed(0)}% do quadro`);
    if (i.armaFrac < 0.02) f.push(`P2 escala: arma some (${(i.armaFrac * 100).toFixed(1)}% do quadro)`);
    if (i.armaBordas >= 3) f.push(`P2 quadro: arma estoura ${i.armaBordas} bordas`);
    if (i.vmFrac && (i.vmFrac[0] < 0.50 || i.vmFrac[0] > 0.66 || i.vmFrac[1] < 0.45)) {
      f.push(`P2 enquadramento: VM começa em ${i.vmFrac[0].toFixed(2)},${i.vmFrac[1].toFixed(2)}; contrato C5 = x 0,50–0,66 e y ≥0,45`);
    }
    if (i.centroPx > 0) f.push(`P2 centro: ${i.centroPx}px invadem o quadrado central`);
    if (i.maoPx >= 3000 && (i.maoArmaDistPx < 0 || i.maoArmaDistPx > 24)) {
      f.push(`P3 aperto: a mão fica a ${i.maoArmaDistPx < 0 ? '>192' : i.maoArmaDistPx}px da arma (mão no ar)`);
    }
    const soltas = (i.maoComponentes || []).filter((c) => c.px >= 1000 && (c.armaDistPx < 0 || c.armaDistPx > 24));
    if (soltas.length) f.push(`P3 aperto: ${soltas.length} braço(s) sem contato individual (distâncias ${soltas.map((c) => c.armaDistPx).join(',')}px)`);
  }
  const draw = r.draw || [];
  if (draw.length) {
    const first = draw[0];
    const last = draw.at(-1);
    if ((first.armaPx + first.maoPx + first.pentePx) > 1200
        && (!first.vmBox || first.vmBox[1] < H * 0.75)) {
      f.push(`P6 saque: primeiro frame pisca a pose pronta (${first.armaPx + first.maoPx + first.pentePx}px, topo ${first.vmBox?.[1] ?? 'ausente'})`);
    }
    if (!last.vmBox || last.armaPx < 500) f.push('P6 saque: não termina com a arma visível');
    if (draw.some((q) => q.state !== 'draw' || !/equip/i.test(q.clip || ''))) {
      f.push('P6 saque: frames intermediários não pertencem ao clip Equip');
    }
  }
  const tiros = r.tiros || [];
  if (tiros.length) {
    const base = tiros[0];
    const diag = base.armaDiag || 1;
    const excursion = Math.max(...tiros.map((q) =>
      q.armaC && base.armaC ? Math.hypot(q.armaC[0] - base.armaC[0], q.armaC[1] - base.armaC[1]) / diag : 0));
    r.tiroResumo = { armaExcursao: +excursion.toFixed(3) };
    if (excursion < 0.04) {
      f.push(`P7 tiro: recuo ilegível, excursão ${(excursion * 100).toFixed(1)}% do tamanho da arma`);
    }
    if (tiros.some((q) => q.state !== 'fire' || !/shoot/i.test(q.clip || ''))) {
      f.push('P7 tiro: frames intermediários não pertencem ao clip Shoot');
    }
  }
  const rec = r.recarga || [];
  if (rec.length) {
    const desl = (a, b, k) => (a?.[k] && b?.[k] ? Math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]) : null);
    const base = rec[0];
    let maxArma = 0; let maxPente = 0;
    for (const q of rec) {
      maxArma = Math.max(maxArma, desl(base, q, 'armaC') ?? 0);
      maxPente = Math.max(maxPente, desl(base, q, 'penteC') ?? 0);
    }
    const diag = base.armaDiag || 1;
    r.recargaResumo = {
      armaExcursao: +(maxArma / diag).toFixed(2),
      penteExcursao: +(maxPente / diag).toFixed(2),
      penteVisto: rec.some((q) => q.pentePx > 200),
    };
    if (r.recargaResumo.armaExcursao > 0.55) {
      f.push(`P4 recarga: a ARMA anda ${(r.recargaResumo.armaExcursao * 100).toFixed(0)}% do próprio tamanho (arranca a arma toda)`);
    }
    if (!r.recargaResumo.penteVisto) f.push('P4 recarga: pente independente não aparece');
    if (r.recargaResumo.penteVisto && r.recargaResumo.penteExcursao < 0.12) {
      f.push('P4 recarga: o pente não sai do lugar');
    }
    if (rec.some((q) => q.state !== 'reload' || !/reload/i.test(q.clip || ''))) {
      f.push('P4 recarga: os frames intermediários não pertencem ao clip Reload');
    }
    if (Math.abs((r.reloadStart?.effectiveDuration || 0) - (r.reloadStart?.gameplayRemaining || 0)) > 0.03) {
      f.push('P4 recarga: duração do clip diverge da cadência de gameplay');
    }
    if (r.reloadEnd?.state !== 'idle' || !/idle/i.test(r.reloadEnd?.clip || '')) {
      f.push('P4 recarga: o término do clip não retorna a Idle');
    }
    if (rec.some((q) => q.armaPx < 500)) f.push('P5 quadro: a arma some do quadro no meio da recarga');
    const top = Math.min(...rec.filter((q) => q.vmBox).map((q) => q.vmBox[1]));
    if (Number.isFinite(top) && top < 8) f.push(`P5 quadro: recarga corta o viewmodel no topo (${top}px de margem)`);
  }
  notas.push({ arma: r.arma, falhas: f });
}

await fs.writeFile(path.join(OUT, 'relatorio.json'), JSON.stringify({ relatorio, notas }, null, 2));
let vermelhas = 0;
for (const n of notas) {
  if (!n.falhas.length) { console.log(`\x1b[32m✓\x1b[0m ${n.arma}`); continue; }
  vermelhas += 1;
  console.log(`\x1b[31m✗\x1b[0m ${n.arma}`);
  for (const f of n.falhas) console.log(`    ${f}`);
}
console.log(`\nGAUNTLET [${MODO}]: ${relatorio.length - vermelhas}/${relatorio.length} limpas · relatório em ${path.relative(ROOT, OUT)}/relatorio.json`);
process.exitCode = vermelhas ? 1 : 0;
