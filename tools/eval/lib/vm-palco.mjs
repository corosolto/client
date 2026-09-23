/* ============================================================================
   vm-palco.mjs — PALCO COMUM DAS RÉGUAS DE IMAGEM DO VIEWMODEL (vm-reguas)
   ----------------------------------------------------------------------------
   POR QUE EXISTE: a revisão L1 (23/09) teve 10/10 armas reprovadas pelo crítico
   cego com os portões verdes. As réguas antigas mediam SOCKET ou VÉRTICE CRU
   (o `eval:vm-ads` AD1 media o mesmo socket que o ADS automático leva ao centro:
   tautologia, 0,000 com a mira 40–90 px fora). Estas réguas medem o QUADRO
   RENDERIZADO: a mesma vmScene, a mesma vmCamera, o mesmo skinning na GPU, com os
   materiais trocados por cor chapada (arma = vermelho, braço/mão = verde).
   A máscara é o que o jogador vê, só que rotulado.

   Mesmo caminho do capturador da revisão (artifacts/review-L1/tools/capture-l1.mjs):
   ?vmauthored=1&vmqa=precision, relógio do controlador segurado e avançado em
   passos de 1/60 s — quadro determinístico sem pular a lógica real.
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

// Quadro de referência do dono (3:2, como ele joga) e o 16:9 que já mordeu.
export const ASPECTOS = { '3x2': [1440, 960], '16x9': [1440, 810] };

export async function abrirNavegador() {
  const gRoot = execSync('npm root -g').toString().trim();
  const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = pw.chromium || pw.default?.chromium;
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
}

export async function subirServidor(porta) {
  const base = `http://127.0.0.1:${porta}`;
  try { if ((await fetch(base)).ok) return { base, kill: () => {} }; } catch { /* sobe */ }
  const srv = spawn('node', ['tools/eval/serve.mjs', String(porta)], { stdio: 'ignore' });
  process.on('exit', () => srv.kill());
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) return { base, kill: () => srv.kill() }; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`servidor de eval não subiu na porta ${porta}`);
}

// Abre o jogo com TODAS as armas autoradas liberadas (como a revisão L1).
export async function abrirJogo(browser, base, aspecto = '3x2') {
  const ROOT = process.cwd();
  const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
  const familias = [...new Set(Object.values(VM_WEAPON).map((e) => e.family))];
  const query = new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'piscina_treta', armaslazy: '0',
    vmauthored: '1', vmqa: 'precision', vmready: familias.join(','), vmweapon: Object.keys(VM_WEAPON).join(',') }).toString();
  const [width, height] = ASPECTOS[aspecto];
  const page = await browser.newPage({ viewport: { width, height } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 300)));
  await page.goto(`${base}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#crash-overlay,#aviso-software,.tutorial-overlay,[data-vmqa]{display:none!important}' });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa && window.__authoredVm, null, { timeout: 240000 });
  await page.evaluate(INSTALAR);
  return { page, erros, width, height };
}

// ---- funções que rodam NA PÁGINA (autocontidas) ---------------------------
function INSTALAR() {
  const vm = window.__authoredVm;
  if (!vm.__cap) {
    const orig = vm.update;
    const cap = { hold: false, lastCtx: { ads: 0, sway: 0, speed: 0 }, orig };
    vm.update = function (dt, ctx) { cap.lastCtx = ctx || cap.lastCtx; if (cap.hold) return; return orig.call(this, dt, ctx); };
    cap.step = (secs, ads = 0) => { let r = secs; while (r > 1e-6) { const s = Math.min(1 / 60, r); orig.call(vm, s, { ...cap.lastCtx, ads, scoped: ads > 0 }); r -= s; } };
    vm.__cap = cap;
  }
  const g = window.__game;
  // bindMatrixInverse do skinned só atualiza em updateMatrixWorld (render): sem isto a medida lia o
  // quadro anterior (R1, tools/eval/vm-carregador-repete.mjs). __palcoPoseVelha = mutante pose-velha.
  window.__palcoPoseFresca = (e) => {
    e.scene.updateWorldMatrix(true, false);
    if (!window.__palcoPoseVelha) e.scene.updateMatrixWorld(true);
    else e.scene.updateWorldMatrix(false, true);
  };
  window.__palcoCalmo = () => {
    for (const b of g?.bots || []) { b.nextShotAt = Infinity; b.target = null; }
    g.player.hp = 100; g.player.alive = true; g.timeLeft = 600;
  };
  return true;
}

export const segurar = (page, on) => page.evaluate((v) => { window.__authoredVm.__cap.hold = v; }, on);
export const passo = (page, s) => page.evaluate((x) => window.__authoredVm.__cap.step(x), s);

// Espera o jogo DESENHAR (contador de render), não só rAF — sob swiftshader o
// update pode não ter virado quadro ainda (r1 do crítico foi descartada por isso).
export async function esperarQuadro(page) {
  const f0 = await page.evaluate(() => window.__game._rafFrames || 0);
  await page.waitForFunction((f) => (window.__game._rafFrames || 0) >= f + 3, f0, { timeout: 20000 });
}

export async function equipar(page, w) {
  await page.evaluate(() => window.__palcoCalmo());
  await segurar(page, false);
  if (!await page.evaluate((x) => window.__vmPrecisionQa.equip(x), w)) throw new Error(`${w}: não equipou`);
  await page.waitForFunction((x) => { const e = window.__authoredVm.entry(x); return e && (e.golden || e.mint?.active || e.weaponMeshes?.length) && e.mount.visible; }, w, { timeout: 120000 });
  await page.waitForTimeout(1800);   // saque + idle assentados em tempo real
  await page.evaluate(() => window.__palcoCalmo());
}

// ADS em tempo real (estado estável), depois congela. Devolve se ficou escopado.
export async function entrarAds(page) {
  await segurar(page, false);
  await page.evaluate(() => { if (!window.__game.player.scoped) window.__vmPrecisionQa.ads(); });
  await page.waitForTimeout(1300);
  await segurar(page, true);
  await esperarQuadro(page);
  return page.evaluate(() => ({ scoped: Boolean(window.__game.player.scoped), ads: +(window.__authoredVm.adsAmount || 0).toFixed(3) }));
}

export async function sairAds(page) {
  await segurar(page, false);
  for (let i = 0; i < 4; i += 1) {
    if (!await page.evaluate(() => window.__game.player.scoped)) break;
    await page.evaluate(() => window.__vmPrecisionQa.ads());
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
}

/* Máscara do QUADRO: renderiza a vmScene pela vmCamera com cada malha da arma
   ativa em vermelho e cada malha de braço/mão em verde (MeshBasicMaterial pega o
   skinning da GPU), fundo transparente. Nada é recalculado na CPU: a pose é a
   que o jogo acabou de desenhar. Devolve a máscara 1 byte/pixel (0 fundo,
   1 arma, 2 braço), em linhas de CIMA para baixo, em base64. */
function MASCARA(opts) {
  const g = window.__game;
  const vm = window.__authoredVm;
  const entry = vm.entry(opts.arma);
  if (!entry) return { erro: 'sem entry autorada' };
  const r = g.renderer;
  const w = opts.w; const h = opts.h;
  if (!g.__palcoMat) g.__palcoMat = {};
  const basic = (hex) => {
    const key = `c${hex}`;
    if (g.__palcoMat[key]) return g.__palcoMat[key];
    const Ctor = window.__palcoBasic;
    const m = new Ctor({ color: hex, toneMapped: false, fog: false });
    g.__palcoMat[key] = m;
    return m;
  };
  if (!window.__palcoBasic) return { erro: 'MeshBasicMaterial indisponível (instale __palcoBasic)' };
  const pesoArma = new Set(entry.weaponMeshes);
  const pesoMao = new Set(entry.handMeshes);
  const trocados = [];
  const escondidos = [];
  g.vmScene.traverse((o) => {
    if (!o.isMesh && !o.isLine && !o.isPoints && !o.isSprite) return;
    const soPeca = opts.soDestaque && !(pesoArma.has(o) && new RegExp(opts.destaque, 'i').test(o.name));
    // Esconde pelo MATERIAL (Material.visible), não pelo nó: o carregador costuma
    // ser filho do corpo da arma e esconder o nó esconderia a peça junto.
    if (soPeca) {
      if (!g.__palcoMat.nada) { g.__palcoMat.nada = new (window.__palcoBasic)(); g.__palcoMat.nada.visible = false; }
      trocados.push([o, o.material]);
      o.material = Array.isArray(o.material) ? o.material.map(() => g.__palcoMat.nada) : g.__palcoMat.nada;
      return;
    }
    if (pesoArma.has(o) || pesoMao.has(o)) {
      trocados.push([o, o.material]);
      const destaque = opts.destaque && pesoArma.has(o) && new RegExp(opts.destaque, 'i').test(o.name);
      const cor = destaque ? 0x0000ff : pesoArma.has(o) ? 0xff0000 : 0x00ff00;
      o.material = Array.isArray(o.material) ? o.material.map(() => basic(cor)) : basic(cor);
    } else if (o.visible) { escondidos.push(o); o.visible = false; }
  });
  const bg = g.vmScene.background; const env = g.vmScene.environment; const fog = g.vmScene.fog;
  g.vmScene.background = null; g.vmScene.fog = null;
  const RT = window.__palcoRT;
  const rt = new RT(w, h);
  const prevRT = r.getRenderTarget();
  const prevClear = r.getClearColor(new (window.__palcoColor)());
  const prevAlpha = r.getClearAlpha();
  const prevAuto = r.autoClear;
  r.setRenderTarget(rt);
  r.setClearColor(0x000000, 0);
  r.autoClear = true;
  r.clear(true, true, true);
  r.render(g.vmScene, g.vmCamera);
  const buf = new Uint8Array(w * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, w, h, buf);
  // Passo de PROFUNDIDADE (opcional): mesma cena, MeshDepthMaterial empacotado
  // em RGBA; vira distância ao olho em mm (uint16) por pixel.
  let prof = null;
  if (opts.profundidade) {
    if (!g.__palcoMat.depth) g.__palcoMat.depth = new (window.__palcoDepth)({ depthPacking: 3201 });
    for (const [o] of trocados) o.material = Array.isArray(o.material) ? o.material.map(() => g.__palcoMat.depth) : g.__palcoMat.depth;
    r.clear(true, true, true);
    r.render(g.vmScene, g.vmCamera);
    const dbuf = new Uint8Array(w * h * 4);
    r.readRenderTargetPixels(rt, 0, 0, w, h, dbuf);
    const near = g.vmCamera.near; const far = g.vmCamera.far;
    prof = new Uint16Array(w * h);
    const K = 255 / 256;
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4;
      for (let x = 0; x < w; x++) {
        const i = src + x * 4;
        if (buf[i + 3] < 128) continue;
        const d = K * (dbuf[i] / 255 / 16777216 + dbuf[i + 1] / 255 / 65536 + dbuf[i + 2] / 255 / 256 + dbuf[i + 3] / 255);
        const viewZ = (near * far) / ((far - near) * d - far);
        prof[y * w + x] = Math.min(65535, Math.round(-viewZ * 1000));
      }
    }
  }
  // Passo de NORMAIS (opcional): MeshNormalMaterial = normal no espaço da vista,
  // codificada em RGB (n*0,5+0,5). Serve à rolagem (normal do topo da arma).
  let nrm = null;
  if (opts.normais) {
    if (!g.__palcoMat.normal) g.__palcoMat.normal = new (window.__palcoNormal)();
    for (const [o] of trocados) o.material = Array.isArray(o.material) ? o.material.map(() => g.__palcoMat.normal) : g.__palcoMat.normal;
    r.clear(true, true, true);
    r.render(g.vmScene, g.vmCamera);
    const nbuf = new Uint8Array(w * h * 4);
    r.readRenderTargetPixels(rt, 0, 0, w, h, nbuf);
    nrm = new Uint8Array(w * h * 3);
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4;
      for (let x = 0; x < w; x++) { const i = src + x * 4; const o = (y * w + x) * 3; nrm[o] = nbuf[i]; nrm[o + 1] = nbuf[i + 1]; nrm[o + 2] = nbuf[i + 2]; }
    }
  }
  r.setRenderTarget(prevRT);
  r.setClearColor(prevClear, prevAlpha);
  r.autoClear = prevAuto;
  rt.dispose();
  g.vmScene.background = bg; g.vmScene.environment = env; g.vmScene.fog = fog;
  for (const [o, m] of trocados) o.material = m;
  for (const o of escondidos) o.visible = true;
  const out = new Uint8Array(w * h);
  let nArma = 0; let nMao = 0;
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4;
    for (let x = 0; x < w; x++) {
      const i = src + x * 4;
      if (buf[i + 3] < 128) continue;
      // 1 arma, 2 braço/mão, 3 peça em destaque (é arma também; ver ehArma).
      const v = buf[i + 2] > 128 ? 3 : buf[i] > buf[i + 1] ? 1 : 2;
      out[y * w + x] = v;
      if (v !== 2) nArma++; else nMao++;
    }
  }
  let s = '';
  for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  let s16 = '';
  if (prof) {
    const b8 = new Uint8Array(prof.buffer);
    for (let i = 0; i < b8.length; i += 0x8000) s16 += String.fromCharCode.apply(null, b8.subarray(i, i + 0x8000));
  }
  let sN = '';
  if (nrm) for (let i = 0; i < nrm.length; i += 0x8000) sN += String.fromCharCode.apply(null, nrm.subarray(i, i + 0x8000));
  return { w, h, nArma, nMao, b64: btoa(s), prof64: prof ? btoa(s16) : null, nrm64: nrm ? btoa(sN) : null, fov: g.vmCamera.fov, aspect: g.vmCamera.aspect };
}

// three.js do jogo: pega os construtores pelo import map (mesmo módulo, mesma instância).
async function instalarThree(page) {
  await page.evaluate(async () => {
    if (window.__palcoBasic) return;
    const T = await import('three');
    window.__palcoBasic = T.MeshBasicMaterial;
    window.__palcoRT = T.WebGLRenderTarget;
    window.__palcoColor = T.Color;
    window.__palcoDepth = T.MeshDepthMaterial;
    window.__palcoThree = T;
    window.__palcoNormal = T.MeshNormalMaterial;
  });
}

export async function mascara(page, arma, { profundidade = false, destaque = '', soDestaque = false, normais = false } = {}) {
  await instalarThree(page);
  const { width, height } = page.viewportSize();
  const m = await page.evaluate(MASCARA, { arma, w: width, h: height, profundidade, destaque, soDestaque, normais });
  if (m.erro) throw new Error(`${arma}: máscara falhou — ${m.erro}`);
  m.px = Uint8Array.from(Buffer.from(m.b64, 'base64'));
  delete m.b64;
  if (m.prof64) { const b = Buffer.from(m.prof64, 'base64'); m.prof = new Uint16Array(b.buffer, b.byteOffset, b.length / 2); }
  delete m.prof64;
  if (m.nrm64) m.nrm = Uint8Array.from(Buffer.from(m.nrm64, 'base64'));
  delete m.nrm64;
  return m;
}

// ---- análise da máscara (Node) --------------------------------------------
export function caixa(m, filtro = (v) => v > 0) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1; let n = 0;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!filtro(m.px[y * m.w + x])) continue;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return n ? { x0, y0, x1, y1, n, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 } : { n: 0 };
}

// PNG rotulado (para --fotos): fundo = captura escurecida opcional; aqui só a máscara.
export function salvarMascaraPng(m, arquivo, marcas = []) {
  const { w, h } = m;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const v = m.px[y * w + x];
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = v === 1 ? 220 : 20; raw[o + 1] = v === 2 ? 200 : 20; raw[o + 2] = v === 3 ? 240 : 30;
    }
  }
  const pinta = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2];
  };
  for (const mk of marcas) {
    const c = mk.cor || [255, 255, 0];
    for (let d = -mk.r; d <= mk.r; d++) { pinta(Math.round(mk.x) + d, Math.round(mk.y), c); pinta(Math.round(mk.x), Math.round(mk.y) + d, c); }
  }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// Posição de ossos/nós no ESPAÇO DA vmCamera (metros; -z à frente), a pose que
// acabou de ser desenhada. Nome ausente volta null (quem chama decide se é vermelho).
export async function nosNaVista(page, arma, nomes) {
  return page.evaluate(({ arma, nomes }) => {
    const g = window.__game;
    const e = window.__authoredVm.entry(arma);
    if (!e) return null;
    g.vmCamera.updateMatrixWorld(true);
    const inv = g.vmCamera.matrixWorldInverse;
    const out = {};
    for (const n of nomes) {
      const o = e.scene.getObjectByName(n);
      if (!o) { out[n] = null; continue; }
      o.updateWorldMatrix(true, false);
      const p = o.getWorldPosition(e.scene.position.clone()).applyMatrix4(inv);
      out[n] = [p.x, p.y, p.z];
    }
    return out;
  }, { arma, nomes });
}

// Vista (m) -> pixel, com a projeção da máscara.
export function projetar(m, p) {
  const t = Math.tan((m.fov * Math.PI) / 360);
  const ndcX = p[0] / (-p[2] * t * m.aspect);
  const ndcY = p[1] / (-p[2] * t);
  return { x: (ndcX + 1) / 2 * m.w, y: (1 - ndcY) / 2 * m.h };
}

// Pixel + profundidade da máscara (mm) -> ponto na vista (m).
export function desprojetar(m, x, y) {
  const d = m.prof[y * m.w + x] / 1000;
  const t = Math.tan((m.fov * Math.PI) / 360);
  const ndcX = ((x + 0.5) / m.w) * 2 - 1;
  const ndcY = 1 - ((y + 0.5) / m.h) * 2;
  return [ndcX * d * t * m.aspect, ndcY * d * t, -d];
}

/* Distância de pontos (nós da mão) à SUPERFÍCIE da malha da arma na pose que
   acabou de ser desenhada: triângulos transformados pelo matrixWorld de cada
   malha (e pelos ossos, se for skinned — applyBoneTransform, o mesmo cálculo do
   shader). Volta, por ponto, a distância em metros de cena e o comprimento da
   palma (hand→middle_01) para normalizar: a escala de cena varia por produto. */
export async function contatoMao(page, arma, { lado = 'l', excluir = '', rig = 'k' } = {}) {
  await instalarThree(page);
  const nomes = OSSOS_MAO[rig](lado);
  return page.evaluate(({ arma, lado, excluir, nomes }) => {
    const T = window.__palcoThree;
    const e = window.__authoredVm.entry(arma);
    if (!e) return { erro: 'sem entry' };
    window.__palcoPoseFresca(e);
    const no = (n) => { const o = e.scene.getObjectByName(n); if (!o) return null; o.updateWorldMatrix(true, false); return o.getWorldPosition(new T.Vector3()); };
    const palmaNos = nomes.palma.map(no);
    if (palmaNos.some((p) => !p)) return { erro: `ossos da mão ${lado} ausentes` };
    const palma = palmaNos.reduce((a, p) => a.add(p), new T.Vector3()).multiplyScalar(1 / palmaNos.length);
    const compPalma = no(nomes.comp[0]).distanceTo(no(nomes.comp[1]));
    // falange do meio de cada dedo (o que fecha em volta do guarda-mão)
    const dedos = nomes.dedos.filter((n) => /_02_|02[LR]_/.test(n)).map(no).filter(Boolean);
    const pontos = [palma, ...dedos];
    const best = pontos.map(() => Infinity);
    const tri = new T.Triangle(); const a = new T.Vector3(); const b = new T.Vector3(); const c = new T.Vector3(); const q = new T.Vector3();
    const rx = excluir ? new RegExp(excluir, 'i') : null;
    let malhas = 0;
    for (const m of e.weaponMeshes) {
      if (rx && rx.test(m.name)) continue;
      let vis = true; for (let o = m; o; o = o.parent) if (!o.visible) { vis = false; break; }
      if (!vis) continue;
      m.updateWorldMatrix(true, false);
      const pos = m.geometry.attributes.position; const idx = m.geometry.index;
      const nv = pos.count; const W = new Float32Array(nv * 3); const v = new T.Vector3();
      for (let i = 0; i < nv; i++) {
        v.fromBufferAttribute(pos, i);
        if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
        v.applyMatrix4(m.matrixWorld); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z;
      }
      malhas++;
      const nt = idx ? idx.count / 3 : nv / 3;
      for (let t = 0; t < nt; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3; const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1; const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        a.set(W[i0 * 3], W[i0 * 3 + 1], W[i0 * 3 + 2]); b.set(W[i1 * 3], W[i1 * 3 + 1], W[i1 * 3 + 2]); c.set(W[i2 * 3], W[i2 * 3 + 1], W[i2 * 3 + 2]);
        tri.set(a, b, c);
        for (let k = 0; k < pontos.length; k++) {
          const p = pontos[k];
          // prefiltro barato: vértice a mais de 2× o melhor já achado + lado do triângulo
          const lim = best[k];
          if (Number.isFinite(lim) && a.distanceTo(p) > lim + a.distanceTo(b) + a.distanceTo(c)) continue;
          tri.closestPointToPoint(p, q);
          const d = q.distanceTo(p); if (d < best[k]) best[k] = d;
        }
      }
    }
    if (!malhas) return { erro: 'nenhuma malha de arma visível' };
    return { palma: best[0], dedos: Math.min(...best.slice(1)), compPalma, malhas };
  }, { arma, lado, excluir, nomes });
}

// Ossos de mão por linhagem de rig (K = KINEMATION; metarig = golden AK/faca).
export const OSSOS_MAO = {
  k: (s) => ({
    palma: ['hand', 'index_01', 'middle_01', 'ring_01', 'pinky_01'].map((n) => `${n}_${s}`),
    comp: [`hand_${s}`, `middle_01_${s}`],
    dedos: ['index', 'middle', 'ring', 'pinky', 'thumb'].flatMap((d) => [1, 2, 3].map((k) => `${d}_0${k}_${s}`)),
  }),
  metarig: (s) => {
    const S = s.toUpperCase();
    return {
      palma: [`hand${S}_metarig`, ...[1, 2, 3, 4].map((k) => `palm0${k}${S}_metarig`)],
      comp: [`hand${S}_metarig`, `f_middle01${S}_metarig`],
      dedos: ['index', 'middle', 'ring', 'pinky'].flatMap((d) => [1, 2, 3].map((k) => `f_${d}0${k}${S}_metarig`))
        .concat([1, 2, 3].map((k) => `thumb0${k}${S}_metarig`)),
    };
  },
};

/* PEÇA DO CARREGADOR na pose desenhada. `spec.malhas` (regex de nome de malha)
   e/ou `spec.osso` (malhas penduradas nesse osso + vértices skinned com peso
   ≥ 0,5 nele, para arma de malha única). Tudo em comprimentos de PALMA
   (junta hand_l→middle_01_l), porque a escala de cena varia por produto:
     dArma  menor distância peça → resto da arma (grade espacial de vértices)
     dMao   menor distância peça → junta de mão (as duas mãos)
     local  centro da peça no referencial do CORPO da arma (malha rígida: o
            matrixWorld dela; skinned: o osso que mais pesa no corpo)
     tamPeca/tamCorpo  maior dimensão, para o teste de "carregador fantasma". */
export async function pecaCarregador(page, arma, spec, rig = 'k') {
  await instalarThree(page);
  const maos = [OSSOS_MAO[rig]('l'), OSSOS_MAO[rig]('r')];
  return page.evaluate(({ arma, spec, maos }) => {
    const T = window.__palcoThree;
    const g = window.__game;
    const e = window.__authoredVm.entry(arma);
    if (!e) return { erro: 'sem entry' };
    window.__palcoPoseFresca(e);
    g.vmCamera.updateMatrixWorld(true);
    const inv = g.vmCamera.matrixWorldInverse;
    const no = (n) => { const o = e.scene.getObjectByName(n); return o ? o.getWorldPosition(new T.Vector3()) : null; };
    const palmaL = maos[0].palma.map(no);
    if (palmaL.some((p) => !p)) return { erro: 'ossos de mão ausentes' };
    const comp = no(maos[0].comp[0]).distanceTo(no(maos[0].comp[1]));
    // mão de apoio na tela? (junta hand projetada dentro do quadro, à frente da câmera)
    const hv = no(maos[0].comp[0]).applyMatrix4(inv);
    const th = Math.tan((g.vmCamera.fov * Math.PI) / 360);
    const maoNaTela = hv.z < 0 && Math.abs(hv.x / (-hv.z * th * g.vmCamera.aspect)) < 1 && Math.abs(hv.y / (-hv.z * th)) < 1;
    const juntas = maos.flatMap((m) => [...m.palma, ...m.dedos]).map(no).filter(Boolean);
    const rx = spec.malhas ? new RegExp(spec.malhas, 'i') : null;
    const osso = spec.osso ? e.scene.getObjectByName(spec.osso) : null;
    const sobOsso = (m) => { for (let o = m.parent; o; o = o.parent) if (o === osso) return true; return false; };
    const ehMalhaPeca = (m) => (rx && rx.test(m.name)) || (osso && sobOsso(m));
    const efetivo = (m) => { for (let o = m; o; o = o.parent) if (!o.visible) return false; return true; };
    // corpo = maior malha de arma que não é peça
    let corpo = null;
    for (const m of e.weaponMeshes) if (!ehMalhaPeca(m) && (!corpo || m.geometry.attributes.position.count > corpo.geometry.attributes.position.count)) corpo = m;
    const peca = []; const resto = [];
    let visivel = false; let temPeca = false; let escala = 1;
    const v = new T.Vector3(); const sc = new T.Vector3();
    const pesoOsso = new Map();
    for (const m of e.weaponMeshes) {
      const vis = efetivo(m);
      const pos = m.geometry.attributes.position;
      const boneIdx = spec.osso && m.isSkinnedMesh ? m.skeleton.bones.findIndex((b) => b.name === spec.osso) : -1;
      const inteira = ehMalhaPeca(m);
      if (inteira) {
        temPeca = true;
        m.matrixWorld.decompose(new T.Vector3(), new T.Quaternion(), sc);
        escala = Math.min(escala, Math.min(sc.x, sc.y, sc.z) / Math.max(1e-9, m.userData.__palcoEscala0 ?? (m.userData.__palcoEscala0 = Math.min(sc.x, sc.y, sc.z))));
        if (vis) visivel = true;
      }
      if (!vis) continue;
      const si = m.geometry.attributes.skinIndex; const sw = m.geometry.attributes.skinWeight;
      const passo = Math.max(1, Math.floor(pos.count / 6000));
      for (let i = 0; i < pos.count; i += passo) {
        let ehPeca = inteira;
        if (si && sw) {
          const is = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)]; const ws = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)];
          if (boneIdx >= 0) for (let k = 0; k < 4; k++) if (is[k] === boneIdx && ws[k] >= 0.5) ehPeca = true;
          if (ehPeca && boneIdx >= 0) { temPeca = true; visivel = true; }
          if (m === corpo && !ehPeca) for (let k = 0; k < 4; k++) pesoOsso.set(is[k], (pesoOsso.get(is[k]) || 0) + ws[k]);
        }
        v.fromBufferAttribute(pos, i);
        if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
        v.applyMatrix4(m.matrixWorld);
        (ehPeca ? peca : resto).push(v.x, v.y, v.z);
      }
    }
    if (!temPeca) return { erro: `peça do carregador não encontrada (${spec.malhas || ''}${spec.osso ? ` osso ${spec.osso}` : ''})` };
    if (osso && !rx) {
      osso.matrixWorld.decompose(new T.Vector3(), new T.Quaternion(), sc);
      const e0 = osso.userData.__palcoEscala0 ?? (osso.userData.__palcoEscala0 = Math.min(sc.x, sc.y, sc.z));
      escala = Math.min(sc.x, sc.y, sc.z) / Math.max(1e-9, e0);
    }
    // referencial do corpo
    let refCorpo = corpo ? corpo.matrixWorld : e.scene.matrixWorld;
    if (corpo?.isSkinnedMesh && pesoOsso.size) {
      const [idx] = [...pesoOsso.entries()].sort((a, b) => b[1] - a[1])[0];
      refCorpo = corpo.skeleton.bones[idx].matrixWorld;
    }
    const invCorpo = refCorpo.clone().invert();
    const tamDe = (arr) => {
      const b = new T.Box3();
      for (let i = 0; i < arr.length; i += 3) b.expandByPoint(v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(invCorpo));
      const s3 = b.getSize(new T.Vector3()).multiplyScalar(1 / refCorpo.getMaxScaleOnAxis());
      return Math.max(s3.x, s3.y, s3.z);
    };
    const nP = peca.length / 3;
    const tamCorpo = tamDe(resto);
    if (!visivel || !nP || escala < 0.2) return { comp, visivel: false, escala, nP, tamCorpo, maoNaTela };
    const cel = comp * 0.25; const grade = new Map();
    const chave = (x, y, z) => `${Math.floor(x / cel)},${Math.floor(y / cel)},${Math.floor(z / cel)}`;
    for (let i = 0; i < resto.length; i += 3) { const k = chave(resto[i], resto[i + 1], resto[i + 2]); let l = grade.get(k); if (!l) grade.set(k, l = []); l.push(i); }
    let dArma = Infinity; let dMao = Infinity; const cen = new T.Vector3();
    for (let i = 0; i < peca.length; i += 3) {
      const x = peca[i]; const y = peca[i + 1]; const z = peca[i + 2];
      cen.x += x; cen.y += y; cen.z += z;
      const cx = Math.floor(x / cel); const cy = Math.floor(y / cel); const cz = Math.floor(z / cel);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const l = grade.get(`${cx + a},${cy + b},${cz + c}`); if (!l) continue;
        for (const j of l) { const d = Math.hypot(resto[j] - x, resto[j + 1] - y, resto[j + 2] - z); if (d < dArma) dArma = d; }
      }
      for (const p of juntas) { const d = Math.hypot(p.x - x, p.y - y, p.z - z); if (d < dMao) dMao = d; }
    }
    cen.multiplyScalar(1 / nP);
    const local = cen.clone().applyMatrix4(invCorpo).multiplyScalar(refCorpo.getMaxScaleOnAxis() / comp);
    const vista = cen.clone().applyMatrix4(inv);
    const t = Math.tan((g.vmCamera.fov * Math.PI) / 360);
    const ndc = [vista.x / (-vista.z * t * g.vmCamera.aspect), vista.y / (-vista.z * t)];
    return { comp, visivel: true, escala, nP, dArma: dArma / comp, dMao: dMao / comp, local: [local.x, local.y, local.z], ndc,
      vista: [vista.x / comp, vista.y / comp, vista.z / comp], maoNaTela,
      tamPeca: tamDe(peca), tamCorpo };
  }, { arma, spec, maos });
}

// Dispara a recarga pelo caminho do jogo (mesmo do capturador L1) com o relógio segurado.
export async function iniciarRecarga(page, arma, magLeft) {
  return page.evaluate(({ x, magLeft }) => {
    const g = window.__game; const p = g.player;
    p.reloadUntil = 0; p.drawUntil = 0; g._scope(false, true);
    const a = p.ammo[x]; a.mag = magLeft; a.res = 999;
    g._startReload();
    const e = window.__authoredVm.entry(x);
    return { ok: e.state === 'reload', clip: e.action?.getClip?.()?.name || null };
  }, { x: arma, magLeft });
}
