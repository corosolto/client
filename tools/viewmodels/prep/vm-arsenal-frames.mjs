#!/usr/bin/env node
/* Coleta medida do viewmodel NO JOGO REAL, arma por arma, caminho autorado OU legado.
 *
 * Por que existe: a reprovação de 07/09 foi diagnosticada como "curva de mão da LMG"
 * a partir de 16 screenshots que, medidos, são SETE armas diferentes (o frame
 * apontado como caso primário é a AWP). Régua de família só não enxerga isso.
 *
 * Mede EM-PÁGINA, por captura: vértices de mão em quadro, vértices de arma em
 * quadro, contato mão↔arma em px, bbox/diagonal aparente da arma. O inventário de
 * malhas vai no relatório: régua sem alvo declarado passa por vacuidade.
 *
 * Uso: node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=8166 --aspecto=32 \
 *        --armas=lmg,m4,awp --modo=legado --tag=vermelho
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '8166');
const ASPECTO = arg('aspecto', '32');
const MODO = arg('modo', 'legado');
const TAG = arg('tag', 'run');
const ARMAS = arg('armas', '').split(',').filter(Boolean);
// o id do mapa da revisao do dono e `piscina_treta`; `piscina` cai no padrao (Brasilia)
const MAPA = arg('mapa', 'piscina_treta');
const OUT = path.resolve(arg('out', path.join(ROOT, 'artifacts/viewmodels/arsenal', `${TAG}-${MODO}-${ASPECTO}`)));
const BASE = `http://127.0.0.1:${PORTA}`;
// 3:2 é como o dono joga (CONTRIBUTING: validar só em 16:9 já custou uma rodada).
const VIEWPORT = ASPECTO === '32' ? { width: 1440, height: 960 } : { width: 1440, height: 810 };

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const ok = await fetch(BASE).then((r) => r.ok).catch(() => false);
if (!ok) { console.error(`ERRO: nada servindo em ${BASE}. Suba o servidor antes.`); process.exit(2); }

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const relatorio = { tag: TAG, modo: MODO, aspecto: ASPECTO, viewport: VIEWPORT, base: BASE, capturas: [] };

/* A medição roda dentro da página: projeta vértices skinados na câmera do
   viewmodel e conta o que cai DENTRO do quadro. Mão e arma são separadas por
   nome — os dois caminhos batem no mesmo par de regex. */
const MEDIR = (arma) => {
  const g = window.__game;
  const cam = g.vmCamera;
  if (!cam) return { erro: 'sem vmCamera' };
  cam.updateMatrixWorld(true);
  const W = innerWidth, H = innerHeight;
  const raizes = [];
  if (g.vm?.root) raizes.push(g.vm.root);
  const ent = window.__authoredVm?.entry?.(arma);
  if (ent?.scene) raizes.push(ent.scene);
  /* `arm` cru NAO serve de token: todo skinned mesh pende de um no `Armature`, e
     com ele a primeira versao desta regua classificou a arma inteira como mao
     (m92: mao 278/306, arma 0/0). Tokens ancorados; so `fp-character` sobe na
     arvore, que e o grupo de bracos do caminho legado (fparms.js:217). */
  const eMao = (n) => /GEO_FP_SK_|fp-character|(^|[_.\-])(glove|hand|forearm|sleeve|cloth)/i.test(n || '');
  const visivel = (o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; };
  const maos = [], armas = [], invMao = [], invArma = [];
  // `entry.scene` pende de `vm.root`: sem dedupe a mesma malha entra duas vezes e
  // a amostra vira metade do que diz ser.
  const vistas = new Set();
  for (const r of raizes) {
    r.updateWorldMatrix(true, true);
    r.traverse((c) => {
      if (!c.isMesh || !c.geometry?.attributes?.position || !visivel(c)) return;
      if (vistas.has(c)) return;
      vistas.add(c);
      let n = c.name || '', p = c.parent, mao = eMao(n);
      while (!mao && p) { if (/fp-character/i.test(p.name || '')) mao = true; p = p.parent; }
      (mao ? maos : armas).push(c);
      (mao ? invMao : invArma).push(`${n || '?'}:${c.geometry.attributes.position.count}`);
    });
  }
  const V3 = cam.position.constructor;
  const amostrar = (lista, maxPts) => {
    const pts = [];
    const total = lista.reduce((s, c) => s + c.geometry.attributes.position.count, 0) || 1;
    for (const c of lista) {
      const pos = c.geometry.attributes.position;
      const passo = Math.max(1, Math.floor(total / maxPts));
      const v = new V3();
      for (let i = 0; i < pos.count; i += passo) {
        v.fromBufferAttribute(pos, i);
        if (c.isSkinnedMesh && c.applyBoneTransform) c.applyBoneTransform(i, v);
        pts.push(v.clone().applyMatrix4(c.matrixWorld));
      }
    }
    return pts;
  };
  const proj = (v) => {
    const p = v.clone().project(cam);
    return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, fora: p.z > 1 || p.z < -1 || p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1 };
  };
  /* 300 pontos por lado davam 41 px num par de mãos que a figura mostra ENCOSTADO
     (pistol/ads) contra 49 px numa mão comprovadamente solta (shotgun/ads): o teto
     caía dentro do ruído da amostra. Resolução maior separa os dois casos. */
  const maoPts = amostrar(maos, 800), armaPts = amostrar(armas, 800);
  const maoPx = [], armaPx = [];
  for (const p of maoPts) { const s = proj(p); if (!s.fora) maoPx.push(s); }
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const p of armaPts) {
    const s = proj(p);
    if (s.fora) continue;
    armaPx.push(s);
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
  }
  let contato = null;
  if (maoPx.length && armaPx.length) {
    contato = 1e9;
    for (const a of maoPx) for (const b of armaPx) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < contato) contato = d; }
    contato = Math.round(contato);
  }
  /* Espacamento da amostra: mediana da distancia ao vizinho mais proximo DENTRO da
     nuvem da arma. O contato em px cresce sozinho quando a arma ocupa mais tela — sem
     esta escala nao se separa "mao solta" de "amostra rala". */
  /* Diametro 3D da nuvem da arma, em cm: a maior distancia entre dois pontos dela no
     mundo. Corpo rigido, entao NAO muda com a pose — ao contrario da diagonal na tela,
     que oscilou 624→878 px para a mesma arma entre rodadas. */
  /* A luva e o MESMO asset em toda arma: a razao arma/mao e a unica medida de escala
     com denominador comum entre familias e entre pipelines. */
  const diam = (pts) => {
    if (pts.length < 5) return null;
    const passo = Math.max(1, Math.floor(pts.length / 200));
    let maior = 0;
    for (let i = 0; i < pts.length; i += passo) {
      for (let k = i + passo; k < pts.length; k += passo) {
        const d = pts[i].distanceTo(pts[k]);
        if (d > maior) maior = d;
      }
    }
    return Math.round(maior * 1000) / 10;
  };
  const maoDiam = diam(maoPts);
  let diam3d = null;
  if (armaPts.length > 4) {
    const passoD = Math.max(1, Math.floor(armaPts.length / 200));
    let maior = 0;
    for (let i = 0; i < armaPts.length; i += passoD) {
      for (let k = i + passoD; k < armaPts.length; k += passoD) {
        const d = armaPts[i].distanceTo(armaPts[k]);
        if (d > maior) maior = d;
      }
    }
    diam3d = Math.round(maior * 1000) / 10;
  }
  let espacamento = null;
  if (armaPx.length > 8) {
    const passoE = Math.max(1, Math.floor(armaPx.length / 120));
    const dists = [];
    for (let i = 0; i < armaPx.length; i += passoE) {
      let melhor = 1e9;
      for (let k = 0; k < armaPx.length; k += 1) {
        if (k === i) continue;
        const d = Math.hypot(armaPx[i].x - armaPx[k].x, armaPx[i].y - armaPx[k].y);
        if (d < melhor) melhor = d;
      }
      dists.push(melhor);
    }
    dists.sort((a, b) => a - b);
    espacamento = Math.round(dists[Math.floor(dists.length / 2)] * 10) / 10;
  }
  return {
    maoEmQuadro: maoPx.length, maoAmostra: maoPts.length,
    espacamento_px: espacamento,
    arma_diam3d_cm: diam3d,
    mao_diam3d_cm: maoDiam,
    razao_arma_mao: (diam3d && maoDiam) ? Math.round(diam3d / maoDiam * 100) / 100 : null,
    len_declarado_cm: window.__WEAPON_LEN?.[arma] ?? null,
    // assada (Mint dentro do GLB) ou encaixada em runtime: sao dois pipelines de
    // escala, e comparar um com o outro produz "escala em fuga" que nao existe.
    assada: !!window.__VM_BAKED?.[arma],
    contato_em_espacamentos: (contato !== null && espacamento) ? Math.round(contato / espacamento * 100) / 100 : null,
    armaEmQuadro: armaPx.length, armaAmostra: armaPts.length,
    contato_px: contato,
    arma_diag_px: maxX > minX ? Math.round(Math.hypot(maxX - minX, maxY - minY)) : 0,
    arma_bbox: maxX > minX ? [minX, minY, maxX, maxY].map(Math.round) : null,
    quadro: [W, H],
    invMao: invMao.slice(0, 12), invArma: invArma.slice(0, 12),
    autorado: !!ent,
    /* De onde veio a arma desenhada. Escala aparente so se compara entre a MESMA
       fonte: o wrap Mint e a malha do pack tem tamanhos proprios, e desde o
       conserto do encaixe uma familia pode cair no pack enquanto o GLB de mundo
       nao chega (vmweapon.js pedirModeloDeMundo). */
    fonte: (ent?.mint?.weaponId === arma && ent.mint.active?.visible) ? 'mint' : (armas.length ? 'pack' : 'nenhuma'),
    /* Arma com luneta esconde o viewmodel enquanto mirada (game.js `_scope`): medir
       0 ali e estado legitimo, nao defeito. Vem do dado do jogo, nao de lista minha. */
    luneta: !!(window.__WEAPONS_SCOPE?.[arma]),
    mirando: !!g.player?.scoped,
  };
};

async function capturar(page, arma, cenario) {
  const m = await page.evaluate(MEDIR, arma);
  const nome = `${arma}-${cenario}`.replace(/[^a-z0-9-]/gi, '_');
  await page.screenshot({ path: path.join(OUT, `${nome}.png`) });
  relatorio.capturas.push({ arma, cenario, png: `${nome}.png`, ...m });
  console.log(`${arma}/${cenario}: mao ${m.maoEmQuadro}/${m.maoAmostra} arma ${m.armaEmQuadro}/${m.armaAmostra} contato ${m.contato_px}px diag ${m.arma_diag_px}px${m.autorado ? ' [autorado]' : ''}`);
  return m;
}

const page = await browser.newPage({ viewport: VIEWPORT });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e).slice(0, 160)));
try {
  const q = new URLSearchParams({ debug: '1', auto: 'E', map: MAPA, armaslazy: '0' });
  if (MODO === 'autorado') q.set('vmready', 'ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,revolver,shotgun,lmg');
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  // expoe o flag de luneta do dado do jogo para a medicao ler
  await page.evaluate(async () => {
    const m = await import('/js/data/weapons.js');
    window.__WEAPONS_SCOPE = Object.fromEntries(Object.entries(m.WEAPONS).map(([k, v]) => [k, !!v.scope]));
    const c = await import('/js/data/vmconfig.js');
    window.__VM_BAKED = Object.fromEntries(Object.entries(c.VM_WEAPON).map(([k, v]) => [k, !!v.baked]));
    const w = await import('/js/weapons.js');
    window.__WEAPON_LEN = Object.fromEntries(Object.keys(c.VM_WEAPON).map((k) => [k, Math.round(w.weaponCFG(k).len * 1000) / 10]));
  });
  const lista = ARMAS.length ? ARMAS : await page.evaluate(() => window.__game.player.inventarioQA || null);
  relatorio.solicitadas = lista;   // inventário declarado: o portão reprova o que não foi medido
  for (const arma of lista) {
    let trocou = false;
    for (let t = 0; t < 3 && trocou !== true; t += 1) {
      trocou = await page.evaluate((w) => { try { window.__game._switchWeapon(w); return window.__game.player.weapon === w; } catch (e) { return String(e).slice(0, 80); } }, arma);
      if (trocou !== true) await page.waitForTimeout(600);
    }
    if (trocou !== true) { console.log(`${arma}: troca falhou (${trocou})`); continue; }
    /* 1,4 s pegava o arco de equip em voo (a mão ainda subindo, fora do quadro) e a
       medida saía 0 com a arma já em quadro — falso vermelho. Espera a contagem de
       mão estabilizar entre duas amostras antes de capturar. */
    /* Presenca NAO basta: durante o arco de equip a arma ainda se aproxima, e a
       diagonal aparente do mesmo par de armas chegou a inverter entre rodadas
       (akm 616 numa, 450 noutra). Espera a diagonal parar de andar (<3% entre duas
       amostras) antes de capturar. */
    let esperou = 0, diagAnterior = -1, assentou = false;
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(400);
      esperou += 400;
      const m = await page.evaluate(MEDIR, arma);
      if (m.maoEmQuadro > 0 && m.armaEmQuadro > 0 && esperou >= 1200) {
        const d = m.arma_diag_px || 0;
        if (diagAnterior > 0 && Math.abs(d - diagAnterior) / diagAnterior < 0.03) { assentou = true; break; }
        diagAnterior = d;
      }
    }
    relatorio.assentou = relatorio.assentou || {};
    relatorio.assentou[arma] = assentou;   // false = capturou sem assentar, o dado avisa
    relatorio.esperas = relatorio.esperas || {};
    relatorio.esperas[arma] = esperou;   // se bateu no teto, o viewmodel nao assentou
    await capturar(page, arma, 'idle');
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(600);
    await capturar(page, arma, 'ads');
    await page.mouse.up({ button: 'right' });
    /* Arma com luneta usa ADS em ALTERNANCIA (game.js: "so solta o ADS das
       nao-sniper"): soltar o botao nao desmira. Sem este toggle as capturas
       seguintes saem todas com o viewmodel escondido — falso vermelho meu. */
    for (let i = 0; i < 10; i += 1) {
      const mirando = await page.evaluate(() => !!window.__game.player?.scoped);
      if (!mirando) break;
      await page.mouse.down({ button: 'right' });
      await page.mouse.up({ button: 'right' });
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(500);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(90);
    await capturar(page, arma, 'fire');
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(500);
    const dur = await page.evaluate(() => { try { window.__game._startReload(); return window.__game.vm?.rig?.dur || 2.5; } catch { return 0; } });
    if (dur > 0) {
      let anterior = 0;
      for (const f of [0.15, 0.35, 0.6, 0.85]) {
        const espera = Math.max(0, dur * (f - anterior) * 1000); anterior = f;
        await page.waitForTimeout(espera);
        await capturar(page, arma, `reload-f${String(Math.round(f * 100)).padStart(3, '0')}`);
      }
      await page.waitForTimeout(dur * 200);
    }
  }
} catch (e) {
  console.error('FALHA:', String(e).slice(0, 400));
  relatorio.falha = String(e).slice(0, 400);
} finally {
  relatorio.errosPagina = erros.slice(0, 10);
  await fs.writeFile(path.join(OUT, 'frames.json'), JSON.stringify(relatorio, null, 1));
  await browser.close().catch(() => {});
}
console.log(`ARSENAL_FRAMES=${OUT}`);
