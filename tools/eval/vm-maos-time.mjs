#!/usr/bin/env node
// Mãos por time em TODO viewmodel (requisito do dono 11/09: "skins de mãos diferentes por time,
// mas tudo na mesma escala"). No jogo real, por arma × time: material servido (identidade) e a
// cor que chega à tela num passe de albedo (mãos com o mapa servido, sem luz; arma em sentinela).
// Réguas: luva/manga da paleta do time (vmhands.js) e a MESMA cor em todas as armas do time.
// Uso: node tools/eval/vm-maos-time.mjs [--porta=4702] [--passe=servido|aprovadas|todos]
//      [--armas=ak,m4] [--times=E,U] [--fotos] [--saida=artifacts/maos-por-time]
//      [--mutante=golden-sem-time|faca-time-errado|atlas-trocado] [--base=origin/vm/fabrica] [--sonda=lado|escala]
// --sonda troca todo atlas de mão por um de medida (hand-rigs.mjs `sondar`) e mede em vez de julgar.
// --base serve vmhands/authoredvm/meleevm e os atlas daquele ref: é a auditoria do antes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { TEAM_HANDS, F_OPCOES, teamHandStyle } from '../../public/js/vmhands.js';
import { FACTIONS } from '../../public/js/factions.js';
import { WEAPON_IDS } from '../../public/js/weapons.js';
import { VM_WEAPON, VM_FAMILY } from '../../public/js/data/vmconfig.js';

const root = path.resolve(import.meta.dirname, '../..');
const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const FLAGS = ['porta', 'passe', 'armas', 'times', 'fotos', 'saida', 'mutante', 'base', 'sonda', 'maosf'];
for (const k of args.keys()) if (!FLAGS.includes(k)) throw Error(`flag desconhecida: ${k}`);
const MUTANTES = ['golden-sem-time', 'faca-time-errado', 'atlas-trocado'];
const mutante = args.get('mutante') || '';
if (mutante && !MUTANTES.includes(mutante)) throw Error(`mutante desconhecido: ${mutante}`);
const port = Number(args.get('porta') || 4702), base = `http://127.0.0.1:${port}`;
const out = path.resolve(root, args.get('saida') || 'artifacts/maos-por-time');
const fotos = args.has('fotos');
const SONDA = args.get('sonda') || '';
// --maosf=<opção>: roda com a proposta de FUNKEIROS escolhida (?vmmaosf=), para a página do dono.
const MAOSF = args.get('maosf') || '';
if (MAOSF && !F_OPCOES[MAOSF]) throw Error(`opção F desconhecida: ${MAOSF}`);
const estiloDe = (id) => (id === 'F' && MAOSF ? F_OPCOES[MAOSF] : teamHandStyle(id));
if (SONDA && !['lado', 'escala'].includes(SONDA)) throw Error(`sonda desconhecida: ${SONDA}`);

// Toda facção jogável tem de ter estilo próprio; neutro é só fallback.
const JOGAVEIS = FACTIONS.filter((f) => f.ready).map((f) => f.id);
const times = (args.get('times') || JOGAVEIS.join(',')).split(',');
const faltando = JOGAVEIS.filter((id) => !TEAM_HANDS[id]);

// Passe `servido`: o que ?vmauthored=1&vmfabrica=1 põe na tela (fábrica, catálogo K, faca K,
// granada). Passe `aprovadas`: os rigs aprovados fora da fábrica — AK golden (A) e
// faca aprovada (L), servidas por ?vmgolden=ak e pela faca L no lugar da K.
// --fotos: só quadros do jogo com pós (contact sheet/página); a régua usa ?bloom=0 (render cru).
const FIREARMS = WEAPON_IDS.filter((w) => w !== 'knife');
const PASSES = {
  servido: { colunas: [...FIREARMS, 'knife', 'grenade'].map((w) => ({ id: w, arma: w })),
    qs: { vmfabrica: '1' } },
  aprovadas: { colunas: [{ id: 'ak-golden', arma: 'ak' }, { id: 'knife-L', arma: 'knife' }],
    qs: { vmgolden: 'ak' }, facaL: true },
};
const passe = args.get('passe') || 'todos';
const passes = passe === 'todos' ? ['servido', 'aprovadas'] : [passe];
const filtro = args.get('armas')?.split(',');

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function paleta(id) {
  const s = estiloDe(id);
  const p = { luva: rgb(s.glove), manga: rgb(s.sleeve), acento: rgb(s.accent), pele: [183, 137, 104],
    costura: id === 'C' ? [220, 216, 206] : [156, 153, 143] };
  if (s.fingerless) p.bainha = p.luva.map((c) => c * 0.58);
  if (s.motif === 'camo') { p.camo1 = [43, 47, 33]; p.camo2 = [90, 82, 56]; }
  return p;
}
// Distância ao raio c·v (v = tom do tecido, 0,7–1,02 como a pintura): sombra do atlas não conta.
function dist(p, c) {
  const cc = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] || 1;
  const v = Math.max(0.7, Math.min(1.02, (p[0] * c[0] + p[1] * c[1] + p[2] * c[2]) / cc));
  return Math.hypot(p[0] - v * c[0], p[1] - v * c[1], p[2] - v * c[2]);
}
const LIMIAR = 18;          // RGB: pixel mais longe que isto de toda a paleta = cor estranha ao time
const MAX_ESTRANHO = 0.12;  // fração de pixels de mão com cor estranha
const TOL_PALETA = 14;      // mediana da luva/manga × cor declarada (raio c·v)
const TOL_CONSIST = 10;     // mediana da luva/manga de cada arma × mediana do time
const MIN_PX = 600;         // pixels interiores de mão para julgar a arma

// Classificação em node: o navegador devolve pixels de mão amostrados.
function julgar(amostras, time) {
  const pal = paleta(time);
  const conta = Object.fromEntries(Object.keys(pal).map((k) => [k, 0]));
  let estranho = 0;
  const por = { luva: [], manga: [] };
  for (const p of amostras) {
    // "Estranho" usa o raio c·v; o rótulo usa a cor no tom médio (0,97): em F/U a manga é a
    // luva a 80% e o raio sozinho rotulava manga como luva.
    let melhor = '', d = Infinity, perto = Infinity;
    for (const [k, c] of Object.entries(pal)) {
      perto = Math.min(perto, dist(p, c));
      const x = Math.hypot(p[0] - 0.97 * c[0], p[1] - 0.97 * c[1], p[2] - 0.97 * c[2]);
      if (x < d) { d = x; melhor = k; }
    }
    if (perto > LIMIAR) { estranho++; continue; }
    conta[melhor]++;
    if (por[melhor]) por[melhor].push(p);
  }
  const med = (xs) => xs.length ? [0, 1, 2].map((c) => xs.map((p) => p[c]).sort((a, b) => a - b)[xs.length >> 1]) : null;
  const n = amostras.length || 1;
  return { n: amostras.length, estranho: +(estranho / n).toFixed(3),
    fracao: Object.fromEntries(Object.entries(conta).map(([k, v]) => [k, +(v / n).toFixed(3)])),
    luva: med(por.luva), manga: med(por.manga), pal };
}

async function servidor() {
  try { if ((await fetch(base, { signal: AbortSignal.timeout(1500) })).ok) return null; } catch {}
  const s = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
  process.on('exit', () => s.kill());
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) return s; } catch {} await new Promise((r) => setTimeout(r, 250)); }
  throw Error('servidor não subiu');
}

// No navegador: equipa, espera o mapa do time carregar e faz o passe de albedo.
const PAGINA = {
  instalar: () => {
    const vm = window.__authoredVm;
    if (!vm.__cap) {
      const orig = vm.update;
      const cap = { hold: false, ctx: { ads: 0, sway: 0, speed: 0 } };
      vm.update = function (dt, ctx) { cap.ctx = ctx || cap.ctx; if (cap.hold) return; return orig.call(this, dt, ctx); };
      vm.__cap = cap;
    }
    const g = window.__game;
    for (const c of g.combatants || []) if (c !== g.player) { c.alive = false; if (c.mesh) c.mesh.visible = false; }
    for (const b of g.bots || []) { b.nextShotAt = Infinity; b.target = null; }
    g.player.hp = 100; g.player.alive = true; g.timeLeft = 600;
  },
  perfil: (faction) => {
    const g = window.__game;
    g.playerFaction = faction;
    const profile = { id: g.playerCharId, faction, skin: g.playerDef?.pal?.skin, sleeve: g.playerDef?.pal?.shirt, accent: g.playerDef?.pal?.pants };
    g.vm.authored?.setProfile(profile);
    g.vm.melee?.setProfile(profile);
  },
  maosProntas: () => {
    const meshes = [];
    window.__game.vmScene.traverse((o) => { if (o.isMesh && o.visible !== false) meshes.push(o); });
    return meshes.every((o) => (Array.isArray(o.material) ? o.material : [o.material])
      .every((m) => !m?.userData?.teamHands || (m.map?.image?.width > 0 && m.bumpMap?.image?.width > 0)));
  },
  passe: async ({ largura, altura, sonda }) => {
    const THREE = await import('three');
    const g = window.__game, r = g.renderer;
    const HAND = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
    const RIGS = [['A', /^hand\.?R_metarig$/], ['L', /^R_wrist_026$/], ['K', /^hand_r$/]];
    const visivel = (o) => { for (let x = o; x; x = x.parent) if (x.visible === false) return false; return true; };
    const maos = [], armas = [];
    g.vmScene.traverse((o) => {
      if (!o.isMesh || !visivel(o)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      (mats.some((m) => HAND.test(m?.name || '')) ? maos : armas).push(o);
    });
    const materiais = maos.flatMap((o) => (Array.isArray(o.material) ? o.material : [o.material]).map((m) => ({
      mesh: o.name, rig: RIGS.find(([, re]) => o.skeleton?.bones.some((b) => re.test(b.name)))?.[0] || '?',
      nome: m.name, time: m.userData?.teamHands?.faction || null, chave: m.userData?.teamHands?.key || null,
      mapa: (m.map?.image?.currentSrc || m.map?.image?.src || m.map?.name || '').replace(location.origin, '') || null,
      cor: m.color?.getHexString?.() || null })));
    if (r.__postPatched) throw Error('passe de albedo exige ?bloom=0 (render cru)');
    const cor0 = r.getClearColor(new THREE.Color()), alfa0 = r.getClearAlpha(), tm = r.toneMapping;
    const trocas = [];
    const basica = (m, sentinela) => {
      const b = new THREE.MeshBasicMaterial({ toneMapped: false, side: m?.side ?? THREE.FrontSide });
      if (sentinela) b.color.setRGB(0, 1, 0, THREE.SRGBColorSpace);
      else { b.map = m.map || null; b.color.copy(m.color || new THREE.Color(1, 1, 1)); }
      return b;
    };
    for (const o of [...maos, ...armas]) {
      trocas.push([o, o.material]);
      const mao = maos.includes(o);
      o.material = Array.isArray(o.material) ? o.material.map((m) => basica(m, !mao || !HAND.test(m?.name || ''))) : basica(o.material, !mao);
    }
    r.toneMapping = THREE.NoToneMapping;
    r.setRenderTarget(null); r.setClearColor(0xff00ff, 1); r.clear(); r.render(g.vmScene, g.vmCamera);
    const gl = r.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (const [o, m] of trocas) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((b) => b.dispose()); o.material = m; }
    r.toneMapping = tm; r.setClearColor(cor0, alfa0);
    const fundo = (i) => (px[i] > 200 && px[i + 1] < 60 && px[i + 2] > 200) || (px[i] < 60 && px[i + 1] > 200 && px[i + 2] < 60);
    const amostras = [];
    let n = 0;
    const passo = Math.max(1, Math.round(W / largura));
    for (let y = 1; y < H - 1; y += passo) for (let x = 1; x < W - 1; x += passo) {
      const i = (y * W + x) * 4;
      if (fundo(i) || fundo(i - 4) || fundo(i + 4) || fundo(i - W * 4) || fundo(i + W * 4)) continue;
      n++; if (n % 3 === 0) amostras.push([px[i], px[i + 1], px[i + 2]]);
    }
    let medida = null;
    if (sonda) {
      // Faixas de 0,2 mão: transições por pixel de mão nas linhas e colunas → pixels por mão.
      const mao = (i) => !fundo(i);
      let tr = [0, 0, 0, 0], cont = [0, 0];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4, d = i + 4, b = i + W * 4;
        if (mao(i) && mao(d)) { cont[0]++; if ((px[i] > 128) !== (px[d] > 128)) tr[0]++; if ((px[i + 2] > 128) !== (px[d + 2] > 128)) tr[2]++; }
        if (mao(i) && mao(b)) { cont[1]++; if ((px[i] > 128) !== (px[b] > 128)) tr[1]++; if ((px[i + 2] > 128) !== (px[b + 2] > 128)) tr[3]++; }
      }
      const gy = Math.hypot(tr[0] / (cont[0] || 1), tr[1] / (cont[1] || 1)), gx = Math.hypot(tr[2] / (cont[0] || 1), tr[3] / (cont[1] || 1));
      const ossos = [];
      const PARES = [[/^handR_metarig$/, /^f_middle01R_metarig$/], [/^handL_metarig$/, /^f_middle01L_metarig$/], [/^R_wrist_026$/, /^R_middle1_035$/],
        [/^L_wrist_02$/, /^L_middle1_011$/], [/^hand_r$/, /^middle_01_r$/], [/^hand_l$/, /^middle_01_l$/]];
      for (const o of maos) {
        for (const [a, b] of PARES) {
          const A = o.skeleton?.bones.find((x) => a.test(x.name)), B = o.skeleton?.bones.find((x) => b.test(x.name));
          if (!A || !B) continue;
          const pa = A.getWorldPosition(new THREE.Vector3()).project(g.vmCamera), pb = B.getWorldPosition(new THREE.Vector3()).project(g.vmCamera);
          ossos.push({ osso: A.name, px: +Math.hypot((pa.x - pb.x) * W / 2, (pa.y - pb.y) * H / 2).toFixed(1), naTela: Math.abs(pa.x) < 1 && Math.abs(pa.y) < 1 });
        }
      }
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d'), im = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      ctx.putImageData(im, 0, 0);
      medida = { pxPorMaoY: gy ? +(1 / (0.2 * gy)).toFixed(1) : null, pxPorMaoX: gx ? +(1 / (0.2 * gx)).toFixed(1) : null,
        ossos: [...new Map(ossos.map((o) => [o.osso, o])).values()], imagem: cv.toDataURL('image/png') };
    }
    return { materiais, amostras, pxMao: n, tela: [W, H], alvo: [largura, altura], medida };
  },
};

const BASE_REF = args.get('base') || '';
const doRef = (arquivo) => { try { return execFileSync('git', ['show', `${BASE_REF}:${arquivo}`], { cwd: root, maxBuffer: 1 << 26 }); } catch { return null; } };
async function mutar(page, P) {
  if (BASE_REF) {
    if (P.qs.vmgolden) {
      // A base não tem ?vmgolden=: liga `golden` só na página, para ver o rig A como a base o trata.
      const cfg = (await fs.readFile(path.join(root, 'public/js/data/vmconfig.js'), 'utf8')).replace("ak: W('ak', { baked: true,", "ak: W('ak', { golden: true, baked: true,");
      await page.route('**/js/data/vmconfig.js*', (r) => r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: cfg }));
    }
    for (const nome of ['vmhands.js', 'authoredvm.js', 'meleevm.js']) {
      const body = doRef(`public/js/${nome}`).toString();
      await page.route(`**/js/${nome}*`, (r) => r.fulfill({ contentType: 'application/javascript; charset=utf-8', body }));
    }
    await page.route('**/models/viewmodels/coro/hands/**', (r) => {
      const rel = decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//, 'public/');
      const body = doRef(rel);
      return body ? r.fulfill({ body, contentType: 'image/webp' }) : r.fulfill({ status: 404, body: 'ausente no ref' });
    });
  }
  if (mutante === 'golden-sem-time') {
    // Volta ao comportamento da base: rig A (AK golden) fora das mãos por time.
    const src = (await fs.readFile(path.join(root, 'public/js/vmhands.js'), 'utf8'))
      .replace('export function applyTeamHandMaterial(material, profile, layout) {',
        'export function applyTeamHandMaterial(material, profile, layout) {\n  if (layout === \'ak\') return material.clone();');
    await page.route('**/js/vmhands.js*', (r) => r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: src }));
  }
  if (mutante === 'faca-time-errado') {
    // A faca (os dois rigs dela) presa no TIME B, qualquer que seja o time do jogador.
    const src = (await fs.readFile(path.join(root, 'public/js/meleevm.js'), 'utf8'))
      .replace('return layout ? applyTeamHandMaterial(material, profile, layout) : material;',
        'return layout ? applyTeamHandMaterial(material, { ...profile, faction: \'B\' }, layout) : material;')
      .replace('refreshTeamHands(meshes, profile, this.handLayout);', 'refreshTeamHands(meshes, { ...profile, faction: \'B\' }, this.handLayout);');
    await page.route('**/js/meleevm.js*', (r) => r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: src }));
  }
  if (mutante === 'atlas-trocado') {
    // Identidade certa, pixels do time errado: o atlas da luva K do E serve o conteúdo do B.
    await page.route('**/hands/pistol/glove-E.webp*', (r) => r.fulfill({ path: path.join(root, 'public/models/viewmodels/coro/hands/pistol/glove-B.webp'), contentType: 'image/webp' }));
  }
}

const playwright = await import(pathToFileURL(`${execFileSync('npm', ['root', '-g']).toString().trim()}/playwright/index.js`));
const chromium = playwright.chromium || playwright.default?.chromium;
await fs.mkdir(path.join(out, 'fotos'), { recursive: true });
const srv = await servidor();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const report = { base: BASE_REF || null, mutante: mutante || null, times, jogaveis: JOGAVEIS, faltandoEstilo: faltando, celulas: [], erros: [],
  escopo: 'albedo das mãos no quadro de idle do jogo real (mapa servido × paleta do vmhands); não mede luz, movimento nem gosto' };
const families = [...new Set(Object.values(VM_WEAPON).map((e) => e.family)), ...Object.keys(VM_FAMILY)];
try {
  for (const nome of passes) {
    const P = PASSES[nome];
    const colunas = P.colunas.filter((c) => !filtro || filtro.includes(c.id) || filtro.includes(c.arma));
    if (!colunas.length) continue;
    const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
    page.on('pageerror', (e) => report.erros.push(`${nome}: ${String(e.message).slice(0, 200)}`));
    page.on('response', (r) => { if (r.status() >= 400 && /viewmodels|vmhands|hands\//.test(r.url())) report.erros.push(`${nome}: ${r.status()} ${r.url()}`); });
    if (P.facaL) {
      const facaL = path.join(root, 'public/models/viewmodels/coro/melee/knife-hires.glb');
      await page.route('**/viewmodels/knife/knife-baked-runtime.glb*', (r) => r.fulfill({ path: facaL, contentType: 'model/gltf-binary' }));
    }
    await mutar(page, P);
    if (SONDA) {
      const { HAND_RIGS, lerRig, campos, sondar } = await import('../viewmodels/lib/hand-rigs.mjs');
      const sharp = (await import('sharp')).default;
      const dir = path.join(out, 'sonda', SONDA);
      for (const layout of Object.keys(HAND_RIGS)) {
        const rig = await lerRig(layout);
        for (const prim of rig.primitivas) {
          const f = path.join(dir, layout, `${prim.papel}.png`);
          await fs.mkdir(path.dirname(f), { recursive: true });
          const c = campos(layout, prim);
          await sharp(sondar(c, SONDA), { raw: { width: c.size, height: c.size, channels: 3 } }).png().toFile(f);
        }
      }
      await page.route(/\/models\/viewmodels\/coro\/hands\/(\w+)\/(\w+)-\w+\.webp/, (r) => {
        const [, layout, papel] = /hands\/(\w+)\/(\w+)-\w+\.webp/.exec(r.request().url());
        return r.fulfill({ path: path.join(dir, layout, `${papel}.png`), contentType: 'image/png' });
      });
    }
    const qs = new URLSearchParams({ debug: '1', auto: times[0], map: 'piscina_treta', armaslazy: '0', vmauthored: '1', vmqa: 'precision',
      vmready: [...new Set(families)].join(','), vmweapon: Object.keys(VM_WEAPON).join(','), ...P.qs,
      ...(fotos ? {} : { bloom: '0' }), ...(MAOSF ? { vmmaosf: MAOSF } : {}) });
    await page.goto(`${base}/?${qs}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#crash-overlay,#aviso-software,.tutorial-overlay,[data-vmqa]{display:none!important}' });
    await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa && window.__authoredVm, null, { timeout: 240000 });
    await page.evaluate(PAGINA.instalar);
    for (const col of colunas) {
      const t0 = Date.now();
      let servido = 'legado';
      try {
        await page.evaluate(() => { window.__authoredVm.__cap.hold = false; });
        if (col.arma === 'grenade') {
          await page.evaluate(() => window.__vmPrecisionQa.equip('pistol'));
          await page.waitForFunction(() => window.__authoredVm.entries.has('grenade'), null, { timeout: 120000 });
          await page.evaluate(() => { const vm = window.__authoredVm; vm.utility = null; vm.throwUtility('frag', 3); });
          await page.waitForTimeout(700);
          servido = await page.evaluate(() => window.__authoredVm.entries.get('grenade')?.key || 'legado');
        } else if (col.arma === 'knife') {
          if (!(await page.evaluate(() => window.__vmPrecisionQa.equip('knife')))) throw Error('não equipou');
          await page.waitForFunction(() => window.__game.vm.melee?.loaded || window.__game.vm.melee?.error, null, { timeout: 120000 });
          servido = await page.evaluate(() => (window.__game.vm.melee?.loaded ? `melee:${window.__game.vm.melee.handLayout}` : 'legado'));
          await page.waitForTimeout(900);
        } else {
          if (!(await page.evaluate((w) => window.__vmPrecisionQa.equip(w), col.arma))) throw Error('não equipou');
          servido = await page.waitForFunction((w) => {
            const e = window.__authoredVm.entry(w);
            if (e?.mount.visible) return e.key;
            return window.__game._vmVisibility?.fallback && !window.__authoredVm.pending.size ? 'legado' : false;
          }, col.arma, { timeout: 120000 }).then((h) => h.jsonValue());
          await page.waitForTimeout(1400);
        }
        await page.evaluate(() => { window.__authoredVm.__cap.hold = true; });
        for (const time of times) {
          await page.evaluate(PAGINA.perfil, time);
          await page.waitForFunction(PAGINA.maosProntas, null, { timeout: 30000 });
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          if (fotos) {
            const f0 = await page.evaluate(() => window.__game._rafFrames || 0);
            await page.waitForFunction((f) => (window.__game._rafFrames || 0) >= f + 3, f0, { timeout: 20000 });
            const foto = `fotos/${col.id}-${time}.jpg`;
            await page.screenshot({ path: path.join(out, foto), type: 'jpeg', quality: 80 });
            report.celulas.push({ passe: nome, coluna: col.id, arma: col.arma, servido, time, foto });
            continue;
          }
          const res = await page.evaluate(PAGINA.passe, { largura: 480, altura: 320, sonda: Boolean(SONDA) });
          if (SONDA) {
            const img = `sonda/${SONDA}/${col.id}.png`;
            await fs.writeFile(path.join(out, img), Buffer.from(res.medida.imagem.split(',')[1], 'base64'));
            report.celulas.push({ passe: nome, coluna: col.id, arma: col.arma, servido, time, imagem: img, pxMao: res.pxMao,
              pxPorMaoY: res.medida.pxPorMaoY, pxPorMaoX: res.medida.pxPorMaoX, ossos: res.medida.ossos });
            continue;
          }
          const j = julgar(res.amostras, time);
          report.celulas.push({ passe: nome, coluna: col.id, arma: col.arma, servido, time, pxMao: res.pxMao,
            materiais: res.materiais, estranho: j.estranho, fracao: j.fracao, luva: j.luva, manga: j.manga });
        }
      } catch (e) {
        report.celulas.push({ passe: nome, coluna: col.id, arma: col.arma, servido, erro: String(e.message || e).slice(0, 300) });
      }
      console.error(`${nome}/${col.id}: ${servido} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  srv?.kill();
}

// Réguas. Célula com mão do rig autorado e sem mapa do time = mão sem skin de time.
if (SONDA) {
  await fs.writeFile(path.join(out, `sonda-${SONDA}.json`), JSON.stringify(report, null, 1));
  for (const c of report.celulas) console.log(c.coluna, c.servido, c.erro || '', c.pxPorMaoY, c.pxPorMaoX, JSON.stringify(c.ossos));
  // Mesma arma, dois rigs: o motivo da golden (A) na tela tem de ter a escala do da AK K (±15%).
  const gold = report.celulas.find((c) => c.coluna === 'ak-golden'), k = report.celulas.find((c) => c.coluna === 'ak');
  if (SONDA === 'escala' && gold && k) {
    const r = ['pxPorMaoY', 'pxPorMaoX'].map((e) => +(gold[e] / k[e]).toFixed(3));
    const ok = r.every((x) => Math.abs(x - 1) <= 0.15);
    console.log(JSON.stringify({ escalaGoldenSobreK: r, ok }));
    process.exit(ok ? 0 : 1);
  }
  process.exit(0);
}
if (fotos) {
  await fs.writeFile(path.join(out, 'fotos.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ fotos: report.celulas.length, erros: report.erros }));
  process.exit(report.erros.length ? 1 : 0);
}
const checks = [];
const check = (ok, nome, evid) => checks.push({ ok: Boolean(ok), nome, ...(evid ? { evid } : {}) });
check(!faltando.length, 'toda facção jogável tem estilo de mão próprio', faltando);
check(!report.erros.length, 'sem erro de página nem 404 de viewmodel/atlas', report.erros.slice(0, 6));
const julgaveis = report.celulas.filter((c) => !c.erro && c.materiais?.length && c.pxMao >= MIN_PX);
for (const c of report.celulas) {
  const tag = `${c.coluna}/${c.time || '-'}`;
  if (c.erro) { check(false, `${tag}: capturou`, c.erro); continue; }
  if (c.servido === 'legado') continue;
  const semTime = c.materiais.filter((m) => m.time !== c.time);
  check(!semTime.length, `${tag}: todo material de mão é do time`, semTime.map((m) => `${m.rig}:${m.nome}=${m.time || 'sem-time'}`));
  if (c.pxMao < MIN_PX) continue;
  check(c.estranho <= MAX_ESTRANHO, `${tag}: cor da mão é da paleta do time`, { estranho: c.estranho, pxMao: c.pxMao });
  const pal = paleta(c.time);
  check(c.luva && dist(c.luva, pal.luva) <= TOL_PALETA, `${tag}: luva na cor do time`, { luva: c.luva, time: pal.luva });
  if ((c.fracao.manga || 0) >= 0.03) check(c.manga && dist(c.manga, pal.manga) <= TOL_PALETA, `${tag}: manga na cor do time`, { manga: c.manga, time: pal.manga });
}
const consist = {};
for (const time of times) {
  const cel = julgaveis.filter((c) => c.time === time && c.servido !== 'legado');
  for (const parte of ['luva', 'manga']) {
    const xs = cel.filter((c) => c[parte] && (parte === 'luva' || (c.fracao.manga || 0) >= 0.03));
    if (xs.length < 2) continue;
    const med = [0, 1, 2].map((k) => xs.map((c) => c[parte][k]).sort((a, b) => a - b)[xs.length >> 1]);
    const piores = xs.map((c) => ({ coluna: c.coluna, d: +Math.hypot(...c[parte].map((v, k) => v - med[k])).toFixed(1) })).sort((a, b) => b.d - a.d);
    consist[`${time}/${parte}`] = { mediana: med, pior: piores[0] };
    check(piores[0].d <= TOL_CONSIST, `${time}: ${parte} igual em todas as armas (±${TOL_CONSIST})`, piores.slice(0, 3));
  }
}
report.consistencia = consist;
report.checks = checks;
report.ok = checks.every((c) => c.ok);
report.tetos = { LIMIAR, MAX_ESTRANHO, TOL_PALETA, TOL_CONSIST, MIN_PX,
  procedencia: 'atlas pintados com tom v∈[0,7;1,02] × cor (tools/viewmodels/lib/hand-rigs.mjs); passe de albedo sem luz nem tone mapping' };
await fs.writeFile(path.join(out, mutante ? `relatorio-${mutante}.json` : BASE_REF ? 'relatorio-base.json' : 'relatorio.json'), JSON.stringify(report, null, 1));
const falhas = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ ok: report.ok, mutante: mutante || null, celulas: report.celulas.length, checks: checks.length,
  falhas: falhas.length, primeiras: falhas.slice(0, 8), consistencia: consist }, null, 1));
process.exitCode = report.ok ? 0 : 1;
