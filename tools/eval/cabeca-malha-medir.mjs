/* cabeca-malha-medir.mjs — MEDE A CABEÇA DE VERDADE DE CADA PERSONAGEM (sem chapéu).
═══════════════════════════════════════════════════════════════════════════════════
Por que existe: a hitbox de cabeça do tiro (public/js/hitboxes.js) era UMA esfera de
0,50 m de diâmetro a 1,60 m para todo mundo. Para ajustá-la à cabeça de cada um é
preciso saber onde e de que tamanho é a cabeça na MALHA — e isso só existe no
navegador, com o GLB carregado pelo caminho real (`buildCharacterModel`). Medir em node
mediria outro jogo (ver a `decal-probe`, regra 2 da skill `regua`).

O que mede, por personagem, na pose de idle que o bot segura (cabeça nivelada,
aimPitch 0, depois de 10 quadros de assentamento — o mesmo laço do glbchars):
  • topo do CRÂNIO, sem chapéu = osso `head_end` (fica no crânio, abaixo da copa do
    chapéu); osso fora da cabeça ou 12 cm+ abaixo do topo da malha → vértice mais alto;
  • pegada = mediana, nas fatias de 1 cm do rosto, da largura e profundidade da pele
    de cabeça (peso >= 0,5 em `Head` e descendentes), +10% — aba de chapéu, viseira e
    moicano ocupam poucas fatias e não movem a mediana;
  • queixo = onde a frente da pele de cabeça+pescoço dentro da pegada, na linha do meio
    do rosto, recua 7 cm atrás do nariz (mão e arma na frente do peito não contam), e
    nunca acima do osso `Head`;
  • cabeça = todo vértice entre queixo e topo dentro da pegada;
  • duas silhuetas da cabeça (frente: x-y; lado: z-y), rasterizadas dos TRIÂNGULOS da
    cabeça entre queixo e topo, grade de 1 cm, em bits.
Nada de ajuste aqui: o ajuste do elipsoide e a régua vivem em node
(`headshot-hitbox-check.mjs --escrever`), lendo o JSON assado por este script. O JSON
guarda o SHA do GLB: GLB trocado sem remedir = régua vermelha (resultado velho é item
de régua, não silêncio).

USO
  node tools/eval/serve.mjs <PORTA> &
  BASE=http://localhost:<PORTA> node tools/eval/cabeca-malha-medir.mjs            # todos
  BASE=... node tools/eval/cabeca-malha-medir.mjs sertanejo,gotinha             # só alguns (mescla no JSON)
  BASE=... node tools/eval/cabeca-malha-medir.mjs --prancha=sertanejo,mst --dir=evidence/x
═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const BASE = process.env.BASE;
if (!BASE) { console.error('defina BASE=http://localhost:<porta> (nunca a 8123 de outra sessão)'); process.exit(2); }
const args = process.argv.slice(2);
const PRANCHA = (args.find((a) => a.startsWith('--prancha=')) || '').split('=')[1] || '';
const DIR = (args.find((a) => a.startsWith('--dir=')) || '').split('=')[1] || 'evidence/headshot-hitbox';
const IDS = (args.find((a) => !a.startsWith('-')) || '').split(',').filter(Boolean);
export const JSON_PATH = 'tools/eval/cabecas-malha.json';

const { chromium } = await import('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/eval-character.html?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });

const alvos = IDS.length ? IDS : PRANCHA ? [] : await page.evaluate(async () => {
  const C = await import('./js/characters.js');
  const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

async function medir(cid) {
  return page.evaluate(async (cid) => {
    const THREE = await import('three');
    const G = await import('./js/glbchars.js');
    const C = await import('./js/characters.js');
    const def = C.CHARACTERS.find((c) => c.id === cid);
    if (!def) return { id: cid, erro: 'sem definição' };
    await G.preloadCharacterAssets([cid]);
    if (!G.hasModel(cid)) return { id: cid, erro: 'GLB não carregou' };
    const m = G.buildCharacterModel(def, { weapon: false });
    if (!m) return { id: cid, erro: 'buildCharacterModel devolveu null' };
    m.ctrl.aimPitch = 0;   // bot olhando no nível: é a cabeça que o atirador vê
    for (let i = 0; i < 10; i++) m.ctrl.update(1 / 30, 0, false, 0);
    m.group.updateMatrixWorld(true);
    const modelo = m.group.children.find((o) => o.isObject3D && !o.isMesh);
    const skins = []; modelo.traverse((o) => { if (o.isSkinnedMesh) skins.push(o); });
    if (!skins.length) return { id: cid, erro: 'sem SkinnedMesh' };
    let ossoHead = null, ossoEnd = null;
    modelo.traverse((o) => {
      if (!o.isBone) return;
      if (!ossoHead && /^(mixamorig:?)?head$/i.test(o.name)) ossoHead = o;
      if (!ossoEnd && /^(mixamorig:?)?head_?end$|headtop/i.test(o.name)) ossoEnd = o;
    });
    if (!ossoHead) return { id: cid, erro: 'sem osso Head' };
    const emGrupo = (o) => m.group.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
    const v = new THREE.Vector3();
    const comp = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));
    const P = [];        // todos os vértices posados [x,y,z], em espaço de grupo
    const W = [];        // peso de skin nos ossos da cabeça
    const WN = [];       // peso de skin em cabeça + pescoço
    const T = [];        // todos os triângulos (índices em P)
    for (const sk of skins) {
      const desc = new Set(), pesc = new Set();
      sk.skeleton.bones.forEach((b, i) => { for (let p = b; p; p = p.parent) if (p === ossoHead) { desc.add(i); break; } });
      sk.skeleton.bones.forEach((b, i) => { if (desc.has(i) || b === ossoHead.parent || (b === ossoHead.parent?.parent && /neck/i.test(b.name))) pesc.add(i); });
      const si = sk.geometry.attributes.skinIndex, sw = sk.geometry.attributes.skinWeight;
      if (!si || !sw) continue;
      const mapa = new Int32Array(si.count).fill(-1);
      for (let i = 0; i < si.count; i++) {
        let w = 0, wn = 0;
        for (let k = 0; k < 4; k++) { const o = comp(si, i, k), q = comp(sw, i, k); if (desc.has(o)) w += q; if (pesc.has(o)) wn += q; }
        sk.getVertexPosition(i, v); sk.localToWorld(v); m.group.worldToLocal(v);
        mapa[i] = P.length; P.push([v.x, v.y, v.z]); W.push(w); WN.push(wn);
      }
      const idx = sk.geometry.index;
      const n = idx ? idx.count : si.count;
      for (let t = 0; t + 2 < n; t += 3) {
        const a = mapa[idx ? idx.getX(t) : t], b = mapa[idx ? idx.getX(t + 1) : t + 1], c = mapa[idx ? idx.getX(t + 2) : t + 2];
        if (a >= 0 && b >= 0 && c >= 0) T.push([a, b, c]);
      }
    }
    const qs = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
    const PC = P.filter((_, i) => W[i] >= 0.5);   // vértices de cabeça pelo skin
    if (PC.length < 50) return { id: cid, erro: `cabeça com ${PC.length} vértices — não sei medir` };
    const yMax = Math.max(...PC.map((p) => p[1]));
    const yEnd = ossoEnd ? emGrupo(ossoEnd).y : null;
    const hb = emGrupo(ossoHead);
    /* TOPO DO CRÂNIO = osso `head_end`: nos chapéus ele fica no crânio, abaixo da copa
       (sertanejo 1,616 × malha 1,690; lampião 1,617 × 1,715). Osso abaixo do `Head` ou 12 cm+
       abaixo do vértice mais alto (punk: 1,389 × 1,707) não é crânio: vale a malha. */
    const fimOk = yEnd != null && yEnd > hb.y + 0.04 && yEnd <= yMax + 0.005 && yEnd >= yMax - 0.12;
    // head_end quebrado lá embaixo (punk): crânio = osso Head + 0,253 m, a mediana de
    // (head_end − Head) dos 60 personagens com osso bom — senão o moicano vira testa.
    const fimBaixo = yEnd != null && yEnd < yMax - 0.12;
    const topo = fimOk ? yEnd : fimBaixo ? Math.min(yMax, hb.y + 0.253) : yMax;
    const fonteTopo = fimOk ? 'head_end' : fimBaixo ? 'mediana' : 'malha';
    const hTopo = topo - hb.y;
    /* PEGADA DA CABEÇA: em cada fatia de 1 cm da faixa do rosto (10–60% entre o osso `Head`
       e o topo) mede largura e profundidade da pele de cabeça; vale a MEDIANA das fatias
       +10%. Aba de chapéu, viseira e moicano ocupam poucas fatias e não movem a mediana. */
    const fatias = [];
    const lado = (f) => { const xs = f.map((p) => p[0]), zs = f.map((p) => p[2]); return [qs(xs, 0.02), qs(xs, 0.98), qs(zs, 0.02), qs(zs, 0.98)]; };
    for (let y = hb.y + 0.1 * hTopo; y <= hb.y + 0.6 * hTopo; y += 0.01) {
      const f = PC.filter((p) => p[1] >= y && p[1] < y + 0.01);
      if (f.length >= 6) fatias.push(lado(f));
    }
    if (fatias.length < 3) {   // cabeça de poucos polígonos (dollynho, punk): a faixa inteira vira uma fatia
      const f = PC.filter((p) => p[1] >= hb.y + 0.1 * hTopo && p[1] <= hb.y + 0.6 * hTopo);
      if (f.length < 6) return { id: cid, erro: 'faixa do rosto sem pele de cabeça — não sei medir' };
      fatias.push(lado(f));
    }
    const mf = (k) => qs(fatias.map((f) => f[k]), 0.5);
    const meio = (a, b) => [(a + b) / 2, (b - a) / 2 * 1.1];
    const [cxF, hxF] = meio(mf(0), mf(1)), [czF, hzF] = meio(mf(2), mf(3));
    const [xA, xB, zA, zB] = [cxF - hxF, cxF + hxF, czF - hzF, czF + hzF];
    const largRosto = 2 * hxF, profRosto = 2 * hzF;
    /* QUEIXO pela GEOMETRIA, não pelo skin: na linha do meio do rosto, descendo da testa, o
       queixo é onde a frente da pele de cabeça+pescoço recua 7 cm atrás do ponto mais à
       frente já visto (nariz). Só conta pele dentro da pegada: aba de chapéu na frente do
       rosto fingia ser o nariz (sertanejo). Mão e arma na frente do peito não contam. */
    const PN = P.filter((p, i) => WN[i] >= 0.5 && p[2] <= zB + 0.02 && Math.abs(p[0] - cxF) < 0.04);
    const frenteZ = (y) => { let z = null; for (const p of PN) if (p[1] >= y && p[1] < y + 0.01 && (z == null || p[2] > z)) z = p[2]; return z; };
    let queixo = null, zMax = -Infinity;
    for (let y = hb.y + 0.5 * hTopo; y > hb.y - 0.3; y -= 0.01) {
      const z = frenteZ(y);
      if (z != null) zMax = Math.max(zMax, z);
      if (zMax > -Infinity && (z == null || z < zMax - 0.07)) { queixo = y + 0.01; break; }
    }
    // O queixo nunca fica acima do osso `Head` (a junta do pescoço com o crânio): aba de
    // chapéu e cabelo armado na frente do rosto fazem o recuo aparecer cedo (sertanejo, bonzo).
    const fonteQueixo = queixo != null && queixo <= hb.y ? 'recuo' : 'osso';
    queixo = queixo == null ? hb.y : Math.min(queixo, hb.y);
    const RES = 0.01;   // silhuetas (frente x-y, lado z-y), grade de 1 cm
    const dentro = P.map((p) => p[1] >= queixo && p[1] <= topo && p[0] >= xA && p[0] <= xB && p[2] >= zA && p[2] <= zB);
    const ps = P.filter((_, i) => dentro[i]);
    const ext = (k) => [Math.min(...ps.map((p) => p[k])), Math.max(...ps.map((p) => p[k]))];
    const silhueta = (eixo) => {
      const [u0r, u1r] = ext(eixo);
      const u0 = Math.floor(u0r / RES) * RES - RES, y0 = Math.floor(queixo / RES) * RES - RES;
      const w = Math.ceil((u1r - u0) / RES) + 2, h = Math.ceil((topo - y0) / RES) + 2;
      const bits = new Uint8Array(w * h);
      const marca = (i, j) => { if (i >= 0 && j >= 0 && i < w && j < h) bits[j * w + i] = 1; };
      for (const [a, b, c] of T) {
        if (!dentro[a] || !dentro[b] || !dentro[c]) continue;
        const pa = [P[a][eixo], P[a][1]], pb = [P[b][eixo], P[b][1]], pc = [P[c][eixo], P[c][1]];
        const lo = [Math.min(pa[0], pb[0], pc[0]), Math.min(pa[1], pb[1], pc[1])];
        const hi = [Math.max(pa[0], pb[0], pc[0]), Math.max(pa[1], pb[1], pc[1])];
        const area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1]);
        for (let i = Math.floor((lo[0] - u0) / RES); i <= Math.ceil((hi[0] - u0) / RES); i++) {
          for (let j = Math.floor((lo[1] - y0) / RES); j <= Math.ceil((hi[1] - y0) / RES); j++) {
            const x = u0 + (i + 0.5) * RES, y = y0 + (j + 0.5) * RES;
            if (y < queixo || y > topo) continue;
            if (Math.abs(area) < 1e-12) continue;
            const w1 = ((pb[0] - x) * (pc[1] - y) - (pc[0] - x) * (pb[1] - y)) / area;
            const w2 = ((pc[0] - x) * (pa[1] - y) - (pa[0] - x) * (pc[1] - y)) / area;
            if (w1 >= -1e-9 && w2 >= -1e-9 && 1 - w1 - w2 >= -1e-9) marca(i, j);
          }
        }
      }
      for (const p of ps) marca(Math.floor((p[eixo] - u0) / RES), Math.floor((p[1] - y0) / RES));
      const pack = new Uint8Array(Math.ceil(bits.length / 8));
      bits.forEach((b, k) => { if (b) pack[k >> 3] |= 1 << (k & 7); });
      let s = ''; pack.forEach((b) => { s += String.fromCharCode(b); });
      return { u0: +u0.toFixed(4), y0: +y0.toFixed(4), w, h, res: RES, bits: btoa(s) };
    };
    const r4 = (x) => +x.toFixed(4);
    return {
      id: cid, nVert: ps.length, nTri: T.length,
      queixo: r4(queixo), topo: r4(topo), fonteTopo, fonteQueixo, yMaxCabeca: r4(yMax), headEnd: yEnd == null ? null : r4(yEnd),
      ossoHead: emGrupo(ossoHead).toArray().map(r4),
      largRosto: r4(largRosto), profRosto: r4(profRosto),
      frente: silhueta(0), lado: silhueta(2),
    };
  }, cid);
}

const anterior = fs.existsSync(JSON_PATH) ? JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) : { personagens: {} };
const saida = { ...anterior, gerado: new Date().toISOString(), personagens: { ...(anterior.personagens || {}) } };
let falhas = 0;
for (const id of alvos) {
  const r = await medir(id);
  if (r.erro) { falhas++; console.log(`✗ ${id.padEnd(22)} ${r.erro}`); continue; }
  const glb = path.join('public/models/characters', `${id}.glb`);
  r.glbSha = crypto.createHash('sha256').update(fs.readFileSync(glb)).digest('hex').slice(0, 16);
  saida.personagens[id] = r;
  console.log(`✓ ${id.padEnd(22)} queixo ${r.queixo.toFixed(3)} (${r.fonteQueixo}) topo ${r.topo.toFixed(3)} (${r.fonteTopo}; malha ${r.yMaxCabeca.toFixed(3)}, head_end ${r.headEnd ?? '—'}) rosto ${r.largRosto.toFixed(3)}×${r.profRosto.toFixed(3)}`);
}

/* PRANCHA: personagem de frente e de lado com a esfera antiga (vermelha) e o elipsoide
   novo (verde, lido de data/cabecas-hitbox.js). É a prova visual de "justa à cabeça". */
if (PRANCHA) {
  fs.mkdirSync(DIR, { recursive: true });
  for (const cid of PRANCHA.split(',')) {
    const b64 = await page.evaluate(async (cid) => {
      const THREE = await import('three');
      const G = await import('./js/glbchars.js');
      const C = await import('./js/characters.js');
      const H = await import('./js/data/cabecas-hitbox.js');
      const def = C.CHARACTERS.find((c) => c.id === cid);
      await G.preloadCharacterAssets([cid]);
      const W = 900, Hh = 600;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      r.setSize(W, Hh, false); r.setClearColor(0x2b2f36);
      const cena = new THREE.Scene();
      cena.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2, 4, 3); cena.add(sol);
      const perfil = H.CABECAS_HITBOX[cid] || H.CABECA_PADRAO;
      const poses = [[-0.42, 0], [0.42, Math.PI / 2]];   // frente, perfil
      for (const [x, yaw] of poses) {
        const m = G.buildCharacterModel(def, { weapon: false });
        m.ctrl.aimPitch = 0; for (let i = 0; i < 10; i++) m.ctrl.update(1 / 30, 0, false, 0);
        m.group.position.x = x; m.group.rotation.y = yaw; cena.add(m.group);
        const velha = new THREE.Mesh(new THREE.SphereGeometry(0.25, 28, 18),
          new THREE.MeshBasicMaterial({ color: 0xff3344, wireframe: true, transparent: true, opacity: 0.55, depthTest: false }));
        velha.position.set(x, 1.6, 0); cena.add(velha);
        const nova = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18),
          new THREE.MeshBasicMaterial({ color: 0x33ff77, wireframe: true, depthTest: false }));
        nova.scale.set(perfil.rx, perfil.ry, perfil.rz);
        const s = Math.sin(yaw), c = Math.cos(yaw);
        nova.position.set(x + c * perfil.l + s * perfil.f, perfil.y, -s * perfil.l + c * perfil.f);
        nova.rotation.y = yaw; cena.add(nova);
      }
      const cam = new THREE.OrthographicCamera(-0.75, 0.75, 0.5, -0.5, 0.1, 50);
      cam.position.set(0, 1.55, 10); cam.lookAt(0, 1.55, 0);
      r.render(cena, cam);
      return cv.toDataURL('image/png').split(',')[1];
    }, cid);
    const f = path.join(DIR, `cabeca-${cid}.png`);
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    console.log(`prancha: ${f}`);
  }
}
await browser.close();

if (alvos.length) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(saida));
  console.log(`\njson: ${JSON_PATH}  (${Object.keys(saida.personagens).length} personagens)`);
}
process.exit(falhas ? 1 : 0);
