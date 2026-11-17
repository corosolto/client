// Cenografia HD do Escadão (só com ?hd=1). NADA aqui tem colisão: morro, casario e mata ficam fora da arena
// (|x| > 34 ou z fora de -46..52), itens de laje só em topo ≥ 2,6 m acima do piso jogável, fachada com saliência ≤ 12 cm (verga de
// tijolo sobre os portões, relógio e eletroduto do beco oeste), postes novos fora de bounds (|x| = 19,3, entre o muro e o bairro) ou
// vestindo os postes autorais de 16 cm (seção 22 cm) com nó de fiação nos do mirante, cabos e varais ≥ 2,4 m acima do piso
// (travessias dos becos ≥ 3,7 m: cruzam de roldana a roldana), props de calçada < 0,8 m encostados em parede, corrimão de cano à
// direita dos 3 lances centrais (x 1,74, 6 cm dentro da borda). Tudo sai em desliga().
import * as THREE from 'three';
import { preloadMapProps, PropBatch } from './mapprops.js';
import { soltaAoSubir } from './hd_cenografia_lajes.js';

function rngDe(semente) { let s = semente; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function ruido2(x, y) {
  const i = Math.floor(x), j = Math.floor(y); let fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const H_TOP = 7.56;

// Malha fundida com cor por vértice: caixas, tubos, panos e sólidos de revolução viram um draw call só.
function fundidor() {
  const pos = [], cor = [], c = new THREE.Color(), m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
  const v = Array.from({ length: 8 }, () => new THREE.Vector3()), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const tri = (a, b, d) => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z); for (let i = 0; i < 3; i++) cor.push(c.r, c.g, c.b); };
  const quad = (a, b, d, f) => { tri(a, b, d); tri(a, d, f); };
  const F = {
    cor(hex, ganho = 1) { c.setHex(hex).multiplyScalar(ganho); return F; },
    quad(a, b, d, f) { quad(a, b, d, f); return F; }, tri(a, b, d) { tri(a, b, d); return F; },
    // (x, y, z) = centro da base
    caixa(x, y, z, w, h, d, ry = 0, rx = 0, rz = 0) {
      m.compose(p3.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), s3.set(w, h, d));
      for (let i = 0; i < 8; i++) v[i].set((i & 1) - .5, (i >> 1) & 1, ((i >> 2) & 1) - .5).applyMatrix4(m);
      quad(v[0], v[2], v[3], v[1]); quad(v[5], v[7], v[6], v[4]); quad(v[4], v[6], v[2], v[0]); quad(v[1], v[3], v[7], v[5]); quad(v[2], v[6], v[7], v[3]); quad(v[4], v[0], v[1], v[5]);
      return F;
    },
    tubo(pts, r, lados = 3) {
      const t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3(), cima = new THREE.Vector3(0, 1, 0), lado = new THREE.Vector3(1, 0, 0);
      let ant = null;
      for (let i = 0; i < pts.length; i++) {
        t.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
        n.crossVectors(t, Math.abs(t.y) > .9 ? lado : cima).normalize(); b.crossVectors(t, n);
        const anel = []; for (let k = 0; k < lados; k++) { const a = k / lados * Math.PI * 2; anel.push(pts[i].clone().addScaledVector(n, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r)); }
        if (ant) for (let k = 0; k < lados; k++) quad(ant[k], ant[(k + 1) % lados], anel[(k + 1) % lados], anel[k]);
        ant = anel;
      }
      return F;
    },
    // Sólido de revolução: perfil [[raio, altura], ...] a partir da base em (x, y, z), com tampa no último anel.
    torno(x, y, z, perfil, lados = 10, a0 = 0) {
      const anel = (k) => { const o = []; for (let i = 0; i < lados; i++) { const a = a0 + i / lados * Math.PI * 2; o.push(new THREE.Vector3(x + Math.cos(a) * perfil[k][0], y + perfil[k][1], z + Math.sin(a) * perfil[k][0])); } return o; };
      let ant = anel(0);
      for (let k = 1; k < perfil.length; k++) { const at = anel(k); for (let i = 0; i < lados; i++) quad(ant[i], at[i], at[(i + 1) % lados], ant[(i + 1) % lados]); ant = at; }
      const cc = new THREE.Vector3(x, y + perfil[perfil.length - 1][1], z); for (let i = 0; i < lados; i++) tri(cc, ant[(i + 1) % lados], ant[i]);
      return F;
    },
    tris: () => pos.length / 9,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); g.computeVertexNormals(); return soltaAoSubir(g); },
  };
  return F;
}
const catenaria = (A, B, barriga, n = 10) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = new THREE.Vector3().lerpVectors(A, B, t); p.y -= barriga * 4 * t * (1 - t); pts.push(p); } return pts; };
// Cabos em fita: cinza-chumbo (0x3a3c3e e vizinhos), opacos; preto puro de 1 px virava "corrente" pontilhada.
const ESCURO = 0x3a3c3e, CHUMBO2 = 0x34363a, TELECOM = 0x303234, QUENTE = 0x3e3a36, FERRO = 0x26221f;

// Fios: fita virada para a câmera (2 vértices por ponto, abertos no vertex shader) com largura real perto e piso de 2·FIO_PX px
// longe (tubo de 1 cm a 30 m virava linha pontilhada que cintila). Opaca e com profundidade (a 75 % o feixe de 7 cabos do relógio
// fundia com a parede = cabo fantasma). Um draw call, sem luz: técnica do Córrego (fiosHD).
const FIO_PX = 1.2;
function fiador() {
  const pos = [], dir = [], lado = [], cor = [], idx = [], c = new THREE.Color();
  const F = {
    cor(hex) { c.setHex(hex); return F; },
    fio(pts, r) {
      const b = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], a = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
        for (const s of [-1, 1]) { pos.push(p.x, p.y, p.z); dir.push(n.x - a.x, n.y - a.y, n.z - a.z); lado.push(s * r); cor.push(c.r, c.g, c.b); }
        if (i) { const k = b + i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      }
      return F;
    },
    cabo(A, B, barriga, r = .011) { return F.fio(catenaria(A, B, barriga, 12), r); },
    n: () => idx.length / 6,
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
      g.setAttribute('hdDir', new THREE.Float32BufferAttribute(dir, 3)); g.setAttribute('hdLado', new THREE.Float32BufferAttribute(lado, 1));
      g.setIndex(idx); return soltaAoSubir(g);
    },
  };
  return F;
}
// hdRes = tamanho do buffer de desenho (atualizado em onBeforeRender, sem alocar): a escada de qualidade muda o pixel ratio.
function materialFio(res) {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, name: 'hd-fios' });
  mat.onBeforeCompile = (s) => {
    s.uniforms.hdRes = res;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdDir; attribute float hdLado; uniform vec2 hdRes; varying vec2 vHdBorda;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 hdC = gl_Position, hdD = projectionMatrix * modelViewMatrix * vec4(transformed + hdDir, 1.0); float hdS = 1.0;
        if (hdD.w < 0.05) { hdD = projectionMatrix * modelViewMatrix * vec4(transformed - hdDir, 1.0); hdS = -1.0; }
        vec2 hdT = hdS * (hdD.xy / max(hdD.w, 0.05) - hdC.xy / max(hdC.w, 0.05)) * hdRes; float hdL = length(hdT);
        hdT = hdL > 1e-4 ? hdT / hdL : vec2(1.0, 0.0);
        float hdPx = max(${FIO_PX.toFixed(2)}, abs(hdLado) * projectionMatrix[1][1] * hdRes.y * 0.5 / max(hdC.w, 0.05));
        vHdBorda = vec2(sign(hdLado), hdPx);
        gl_Position.xy += vec2(-hdT.y, hdT.x) * sign(hdLado) * hdPx * 2.0 / hdRes * hdC.w; }`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHdBorda;');
  };
  mat.customProgramCacheKey = () => 'hd-fios-escadao3';
  return mat;
}

/* ===================== MORRO, CASARIO E MATA ===================== */
// Morro do Rio: sobe rápido ao norte e ao sul (fundo do mirante e da rua: raio em z × 1,25), mais devagar nos lados, cristas por
// ângulo. Terreno começa em r = 40: até |z| ≈ 46 fica abaixo dos muros de 2 m. Crista 25 % mais baixa que a r4 (céu acima do morro
// na pose do mirante). `encosta` = 0 no pé, 1 na crista: casario só na metade de baixo, mata na de cima.
// r22: cartão de fundo atrás da linha do telhado (poses spawn/escada): de t = 0,25 a 0,6 o morro sobe mais 22 m (norte/sul inteiro,
// lados 40 %): a 50–70 m fica a 13–44 m, acima dos telhados de 8–11 m; abaixo de |z| ≈ 46 nada muda.
const R0 = 40, R1 = 105;
const encosta = (x, z) => suave(R0, R1, Math.hypot(x * .85, z * 1.25));
function alturaMorro(x, z) {
  const a = Math.atan2(z, x), t = encosta(x, z), sa = Math.sin(a);
  const crista = 7.5 * ruido2(Math.cos(a) * 2.1 + 5, Math.sin(a) * 2.1 + 3) + 5.25 * ruido2(Math.cos(a) * 4.3, Math.sin(a) * 4.3);
  return -1 + 34.5 * Math.pow(t, 1.25) + crista * suave(.35, 1, t) + 3 * (ruido2(x / 23, z / 23) - .5) * t + 22 * suave(.25, .6, t) * (.4 + .6 * sa * sa);
}
const foraDaArena = (x, z) => Math.abs(x) > 34 || z < -46 || z > 52;
const adensado = (x, z) => ruido2(x / 37 + 1, z / 37 + 9) * .6 + ruido2(x / 13, z / 13) * .4;
function escondeHorizonte(scene) {
  const alvo = scene.getObjectByName('ESCADAO_HORIZONTE_MORRO'); if (!alvo || !alvo.visible) return () => {};
  alvo.visible = false; return () => { alvo.visible = true; };
}
// Casas do morro: branco sujo, cinza, terracota e cartões lavados (azul, verde, ocre: nada de salmão nem pele); 32 % de tijolo
// aparente; 45 % das rebocadas com barrado de 1,5–1,9 m num 2º tom mais escuro (rng2 próprio: o sorteio de posição não muda).
// r23: saturação ≤ 0,3 em todos (o laranja saturado lia como cartão; o AgX + névoa já tingem).
const TONS = [0xd3cdbf, 0xc9c3b4, 0x9b7a6c, 0x8e8b84, 0x7f8588, 0xb9ad94, 0x7f8c99, 0x8a9478, 0xa89a7a, 0x8f8694], TIJOLO = 0x8c6f63;
// Atlas do horizonte (canvas 512, células de 128): linhas 0–1 = 8 fachadas de UM pavimento (parede branca tingida pelo instanceColor,
// janelas escuras com caixilho, varanda com guarda-corpo em 3 variantes, marquise); linha 2 col 0 = laje (cinza com manchas); linha 3 =
// 4 copas (alpha radial em cachos, miolo escuro e borda clara). Gerado em runtime, sem textura em disco.
function atlasHorizonte(rng) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.clearRect(0, 0, 512, 512);
  const ruido = (x0, y0, w, h, n, a) => { g.fillStyle = `rgba(0,0,0,${a})`; for (let i = 0; i < n; i++) g.fillRect(x0 + rng() * w, y0 + rng() * h, 1 + rng() * 3, 1 + rng() * 2); };
  for (let k = 0; k < 8; k++) { const x0 = (k % 4) * 128, y0 = Math.floor(k / 4) * 128;
    g.fillStyle = '#ffffff'; g.fillRect(x0, y0, 128, 128); ruido(x0, y0, 128, 128, 90, .06);
    const nj = 2 + (k % 3), jw = k % 2 ? 22 : 16, jh = k < 4 ? 30 : 36, jy = y0 + 44 + (k % 2) * 6;
    for (let j = 0; j < nj; j++) { const jx = x0 + 128 * (j + .5) / nj - jw / 2;
      g.fillStyle = '#9a9a98'; g.fillRect(jx - 3, jy - 3, jw + 6, jh + 6); g.fillStyle = k % 3 === 2 ? '#2c3036' : '#1d1f22'; g.fillRect(jx, jy, jw, jh);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(jx + 2, jy + 2, jw / 2 - 3, jh / 2 - 3); g.fillStyle = '#6a6a66'; g.fillRect(jx - 4, jy + jh + 3, jw + 8, 3); }
    if (k === 1 || k === 5 || k === 6) { g.fillStyle = '#8f8f8a'; g.fillRect(x0, y0 + 92, 128, 6); g.fillStyle = '#5a5c5e'; for (let b = 6; b < 128; b += 9) g.fillRect(x0 + b, y0 + 64, 2, 28); g.fillRect(x0, y0 + 62, 128, 3); }
    if (k === 3 || k === 7) { g.fillStyle = '#7a7a76'; g.fillRect(x0, y0 + 36, 128, 5); }
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x0, y0 + 122, 128, 6); g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x0, y0, 128, 4); }
  g.fillStyle = '#8c8c86'; g.fillRect(0, 256, 128, 128); ruido(0, 256, 128, 128, 120, .12); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 8; i++) { const r = 6 + rng() * 14; g.beginPath(); g.arc(10 + rng() * 108, 266 + rng() * 108, r, 0, 6.3); g.fill(); }
  for (let k = 0; k < 4; k++) { const x0 = k * 128, y0 = 384;
    for (let i = 0; i < 26; i++) { const a = rng() * 6.28, d = rng() * 38 * (k === 3 ? .8 : 1), r = 12 + rng() * 16, cx = x0 + 64 + Math.cos(a) * d, cy = y0 + 58 + Math.sin(a) * d * .8;
      const gr = g.createRadialGradient(cx - r * .3, cy - r * .3, 1, cx, cy, r); gr.addColorStop(0, 'rgba(235,245,220,1)'); gr.addColorStop(.6, 'rgba(120,140,95,1)'); gr.addColorStop(1, 'rgba(50,70,35,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.fill(); }
    g.fillStyle = '#4a3a28'; g.fillRect(x0 + 61, y0 + 92, 6, 36); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.name = 'hd-horizonte'; return t;
}
// Caixa unitária (base em y = 0) com laje/beiral de 12 cm e 6 cm de altura; uv 0..1 por face; hdFace = 1 nas faces horizontais e no beiral.
function geoCasa() {
  const pos = [], nor = [], uv = [], face = [], idx = [];
  const quad = (a, b, c, d, n, f) => { const k = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); face.push(f); } uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const caixa = (x0, y0, z0, x1, y1, z1, f) => {
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], f); quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], f);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], f); quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], f);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1); };
  caixa(-.5, 0, -.5, .5, 1, .5, 0); caixa(-.56, 1, -.56, .56, 1.06, .56, 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('hdFace', new THREE.Float32BufferAttribute(face, 1)); g.setIndex(idx); return g;
}
// Copa: 2 quads cruzados em X (1 x 1, base em y = 0), uv 0..1; a célula vem por instância (hdCel).
function geoCopa() {
  const pos = [], uv = [], idx = [], nor = [];
  for (const [dx, dz] of [[.5, 0], [0, .5]]) { const k = pos.length / 3; pos.push(-dx, 0, -dz, dx, 0, dz, dx, 1, dz, -dx, 1, -dz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); for (let i = 0; i < 4; i++) nor.push(0, 1, 0); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('hdFace', new THREE.Float32BufferAttribute(new Float32Array(8), 1)); g.setIndex(idx); return g;
}
function morro(grupo, rng, longe, { casario = true, mata = true } = {}) {
  const rng2 = rngDe(31337);
  // Terreno: anel polar 192 x 48 de 40 a 170 m, relevo fractal de 3 oitavas (11 / 5,5 / 2,7 m) e ravinas (cristas invertidas de 19 m)
  // crescendo com a encosta; normais suaves (indexado). Cor por vértice: mata verde-escura (H 83–87°), terra onde o casario adensa,
  // granito cinza por ruído de 17 m na metade de cima. O shader (longe.terreno) põe cachos de copas (fbm 3 oitavas a 2–4 m) e estrias.
  const segs = 192, linhas = 48, posA = [], corA = [], idx = [], verde = new THREE.Color(0x2e4a0e), terra = new THREE.Color(0x4a4232), mato = new THREE.Color(0x3c5a12), granito = new THREE.Color(0x6e6f6a);
  const relevo = (x, z, t) => { const rav = 1 - Math.abs(2 * ruido2(x / 19 + 7, z / 19 + 2) - 1);
    return t * (2.2 * (ruido2(x / 11, z / 11) - .5) + 1.1 * (ruido2(x / 5.5 + 2, z / 5.5) - .5) + .5 * (ruido2(x / 2.7, z / 2.7 + 4) - .5) - 2.5 * rav * rav * rav); };
  for (let j = 0; j <= linhas; j++) { const r = 40 + (j / linhas) * 130;
    for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, t = encosta(x, z), y = alturaMorro(x, z) + relevo(x, z, t);
      posA.push(x, y, z); const d = adensado(x, z), c = verde.clone().lerp(mato, ruido2(x / 9, z / 9)).lerp(terra, suave(.3, .6, d) * (t < .5 ? .55 : .08));
      c.lerp(granito, suave(.62, .72, ruido2(x / 17 + 3, z / 17 + 1)) * suave(.45, .6, t) * (.7 + .3 * ruido2(x / 4, z / 4)));
      corA.push(c.r, c.g, c.b);
      if (j < linhas && i < segs) { const p = j * (segs + 1) + i, n = p + segs + 1; idx.push(p, n, p + 1, p + 1, n, n + 1); } } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(corA, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const terreno = new THREE.Mesh(soltaAoSubir(tg), longe.terreno); terreno.name = 'hd-morro'; grupo.add(terreno);
  const C = fundidor(); let casas = 0, blobs = 0; const cs = [], ar = [];
  // Grade polar com jitter, mais cerrada no pé (4,4 x 4,6 m até r = 90; 6,2 x 6,4 m acima) = fileiras seguindo a encosta (ruas em
  // degraus): casa só na metade de baixo (t < 0,6, rareando de 0,5 a 0,6) onde o ruído adensa; no pé (t < 0,3) prédios de 2–5
  // pavimentos (cartões acima da linha do telhado nas poses spawn/escada); metade de cima = faixa contínua de copas (90 % das células).
  // Casas = InstancedMesh (caixa + laje/beiral, fachada do atlas por instância, cor lavada); caixas d'água e antenas na malha fundida C;
  // copas = InstancedMesh de cartões cruzados em 3 escalas (3,5 / 6 / 9 m).
  for (let r = 46; r < 166; r += r < 90 ? 4.4 : 6.2) { const n = Math.max(12, Math.round(2 * Math.PI * r / (r < 90 ? 4.6 : 6.4)));
    for (let i = 0; i < n; i++) { const a = (i + rng() * .8) / n * Math.PI * 2, x = Math.cos(a) * (r + (rng() - .5) * 4), z = Math.sin(a) * (r + (rng() - .5) * 4);
      if (!foraDaArena(x, z)) continue;
      const t = encosta(x, z), y = alturaMorro(x, z) + relevo(x, z, t), d = adensado(x, z), alto = t >= .5;
      const casa = casario && t < .6 && d > .27 && rng() < (t < .5 ? .9 : .55);
      if (casa) { casas++;
        const w = 4 + rng() * 3.5, dd = 4 + rng() * 3.5, pav = 1 + Math.floor(rng() * (t < .3 ? 4.6 : 2.6)), h = 2.9 * pav, ry = Math.atan2(x, z) + (rng() - .5) * .5, tij = rng() < .32, ti = Math.floor(rng() * TONS.length);
        cs.push({ x, y: y - .5, z, w, h: h + .5, d: dd, ry, cor: tij ? TIJOLO : TONS[ti], g: .82 + rng() * .3, cel: Math.floor(rng() * 8), pav, nx: Math.max(1, Math.round(w / 3.2)) });
        if (!tij && rng2() < .45) rng2();
        if (rng() < .6) { const cx = x + (rng() - .5) * w * .5, cz = z + (rng() - .5) * dd * .5, g = .5 + rng() * .25, azul = rng() < .7;
          C.cor(azul ? 0x3b6a9e : 0x8f918c, .85 + rng() * .3).torno(cx, y + h + .06, cz, [[g * .85, 0], [g, g * .9], [g * .9, g * 1.35], [g * .25, g * 1.5]], 8, rng() * 3); }
        if (casas % 3 === 0) { const ax = x + (rng() - .5) * w * .6, az = z + (rng() - .5) * dd * .6, ah = 2.2 + rng() * 1.4;
          C.cor(0x6f7275).caixa(ax, y + h + .06, az, .06, ah, .06).caixa(ax, y + h + ah - .1, az, 1.1, .03, .03, ry).caixa(ax, y + h + ah - .4, az, .9, .03, .03, ry).caixa(ax, y + h + ah - .7, az, .7, .03, .03, ry); }
        if (mata && rng() < .18) { blobs++; ar.push({ x: x + (rng() - .5) * 8, y: y - .3, z: z + (rng() - .5) * 8, s: 3.5 + rng() * 1.5, cor: 0x2f4a10, g: .8 + rng() * .4, cel: Math.floor(rng() * 4), ry: rng() * 3 }); }
      } else if (mata && (alto ? rng() < .9 : ((d < .42 && rng() < .75) || rng() < .3))) { blobs++;
        const esc = rng(), s = esc < .4 ? 3.5 + rng() * 1.5 : esc < .8 ? 6 + rng() * 2 : 9 + rng() * 3;
        ar.push({ x, y: y - .6, z, s, cor: [0x28400c, 0x2f4c10, 0x3a5a14, 0x24380e][Math.floor(rng() * 4)], g: .75 + rng() * .5, cel: Math.floor(rng() * 4), ry: rng() * 3 });
        if (rng() < .4) { blobs++; ar.push({ x: x + s * .4, y: y - .6, z: z + s * .25, s: s * .6, cor: 0x2c4610, g: .8 + rng() * .4, cel: Math.floor(rng() * 4), ry: rng() * 3 }); } } } }
  const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), Q4 = new THREE.Quaternion(), S3 = new THREE.Vector3(), E3 = new THREE.Euler(), COR = new THREE.Color();
  if (cs.length) { const im = new THREE.InstancedMesh(geoCasa(), longe.casario, cs.length), cel = new Float32Array(cs.length * 2), rep = new Float32Array(cs.length * 2);
    cs.forEach((c, k) => { M4.compose(P3.set(c.x, c.y, c.z), Q4.setFromEuler(E3.set(0, c.ry, 0)), S3.set(c.w, c.h, c.d)); im.setMatrixAt(k, M4); im.setColorAt(k, COR.setHex(c.cor).multiplyScalar(c.g));
      cel[k * 2] = (c.cel % 4) * .25; cel[k * 2 + 1] = .75 - Math.floor(c.cel / 4) * .25; rep[k * 2] = c.nx; rep[k * 2 + 1] = c.pav; });
    im.geometry.setAttribute('hdCel', new THREE.InstancedBufferAttribute(cel, 2)); im.geometry.setAttribute('hdRep', new THREE.InstancedBufferAttribute(rep, 2));
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.name = 'hd-casario'; grupo.add(im); }
  if (ar.length) { const im = new THREE.InstancedMesh(geoCopa(), longe.mata, ar.length), cel = new Float32Array(ar.length * 2), rep = new Float32Array(ar.length * 2).fill(1);
    ar.forEach((c, k) => { M4.compose(P3.set(c.x, c.y, c.z), Q4.setFromEuler(E3.set(0, c.ry, 0)), S3.set(c.s, c.s * 1.05, c.s)); im.setMatrixAt(k, M4); im.setColorAt(k, COR.setHex(c.cor).multiplyScalar(c.g * 1.6));
      cel[k * 2] = c.cel * .25; cel[k * 2 + 1] = 0; });
    im.geometry.setAttribute('hdCel', new THREE.InstancedBufferAttribute(cel, 2)); im.geometry.setAttribute('hdRep', new THREE.InstancedBufferAttribute(rep, 2));
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.name = 'hd-mata'; grupo.add(im); }
  if (C.tris()) { const mc = new THREE.Mesh(C.geo(), longe.liso); mc.name = 'hd-casario-topo'; grupo.add(mc); }
  return { casas, mata: blobs, tris: C.tris() + cs.length * 24 + ar.length * 4 + idx.length / 3 };
}
// Materiais do fundo: a névoa autoral (bloom.js patcheia fog_fragment com `owfD`; d = 0,008, cor de deserto) entra a 55 % (exp2) /
// 70 % (linear) — r21 substituía `vFogDepth`, que o chunk patcheado não tem: a névoa entrava inteira e o morro lia como serra de
// areia. Quatro materiais, um programa cada: terreno (fbm de copas + estrias de granito por posição de mundo), casario (atlas por
// instância: célula hdCel, repetição hdRep = [n janelas, pavimentos] por fract, laje na célula (0; 0,25)), mata (cartão com alpha) e liso.
const FBM_GLSL = `float hdHs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hdVn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hdHs(i), hdHs(i + vec2(1.0, 0.0)), f.x), mix(hdHs(i + vec2(0.0, 1.0)), hdHs(i + vec2(1.0, 1.0)), f.x), f.y); }
  float hdFbm(vec2 p){ return 0.5 * hdVn(p) + 0.3 * hdVn(p * 2.1 + 3.7) + 0.2 * hdVn(p * 4.3 + 1.3); }`;
function materiaisLonge(atlas) {
  const nevoa = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment
    .replace('owfD * owfD', '0.08 * owfD * owfD').replace('fogFar, owfD', 'fogFar, owfD * 0.4').replace('vFogDepth * vFogDepth', '0.08 * vFogDepth * vFogDepth').replace('fogFar, vFogDepth', 'fogFar, vFogDepth * 0.4')); };
  const base = (nome, extra = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, side: THREE.DoubleSide, name: 'hd-longe-' + nome, ...extra });
  const terreno = base('terreno');
  terreno.onBeforeCompile = (s) => { nevoa(s);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHdW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdW;\n${FBM_GLSL}`).replace('#include <color_fragment>', `#include <color_fragment>
      { float hdCh = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)); float hdGran = 1.0 - smoothstep(0.025, 0.06, hdCh);
        float hdCop = smoothstep(0.32, 0.78, hdFbm(vHdW.xz / 3.0)); vec3 hdMata = diffuseColor.rgb * mix(0.58, 1.3, hdCop) * (0.88 + 0.24 * hdVn(vHdW.xz * 1.7 + 9.0));
        float hdEstr = 0.5 + 0.5 * sin(vHdW.y * 7.0 + 3.0 * hdVn(vHdW.xz * 0.8)); vec3 hdGr = diffuseColor.rgb * mix(0.8, 1.14, hdEstr) * (0.9 + 0.2 * hdVn(vHdW.xz * 3.0));
        diffuseColor.rgb = mix(hdMata, hdGr, hdGran); }`); };
  terreno.customProgramCacheKey = () => 'hd-longe-terreno1';
  // r23: fract(uv·hdRep) era feito no VÉRTICE (uv = 0/1 nos cantos → fract = 0: a face inteira amostrava o canto branco da célula = caixa
  // lisa laranja); agora o vértice passa uv·hdRep e a célula, e o fragmento faz o fract. Janelas do atlas com +50 % de contraste.
  const atlasUV = (s) => { s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 hdCel; attribute vec2 hdRep; attribute float hdFace; varying vec2 vHdCel;')
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      { vHdCel = hdFace > 0.5 ? vec2(0.0, 0.25) : hdCel; vMapUv = uv * (hdFace > 0.5 ? vec2(1.0) : hdRep); }`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHdCel;')
      .replace('vec4 sampledDiffuseColor = texture2D( map, vMapUv );', `vec4 sampledDiffuseColor = texture2D( map, vHdCel + 0.006 + fract(vMapUv) * 0.238 );
      { float hdL = dot(sampledDiffuseColor.rgb, vec3(0.3, 0.59, 0.11)); sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * mix(0.5, 1.08, smoothstep(0.1, 0.9, hdL)), 0.6); }`); };
  const casario = base('casario', { map: atlas, vertexColors: false });
  casario.onBeforeCompile = (s) => { nevoa(s); atlasUV(s); }; casario.customProgramCacheKey = () => 'hd-longe-casario2';
  const mata = base('mata', { map: atlas, alphaTest: .5, vertexColors: false });
  mata.onBeforeCompile = (s) => { nevoa(s); atlasUV(s); }; mata.customProgramCacheKey = () => 'hd-longe-mata2';
  const liso = base('liso'); liso.onBeforeCompile = nevoa; liso.customProgramCacheKey = () => 'hd-longe-escadao4';
  return { terreno, casario, mata, liso, todos: [terreno, casario, mata, liso] };
}

/* ===================== LAJES INALCANÇÁVEIS ===================== */
// Malhas que o raio de cima pode acertar (sem céu, cenografia, fiação, vegetação).
function alvosDeRaio(scene) {
  const fora = (o) => { for (let p = o; p; p = p.parent) if (/SKY|PIPA|AMBIENT|hd-|HELI|DUMONT|HORIZONTE|fiacao|vegetacao/i.test(p.name || '')) return true; return false; };
  const alvos = []; scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && o.visible && !fora(o)) alvos.push(o); }); return alvos;
}
// Topo medido em (x, z): raio de cima no ponto e em 8 vizinhos a 1 m, fica o acerto mais alto em [y0 − 0,35, y0 + 1,2]
// (platibanda ao lado levanta a base acima da linha do telhado; o pé de tijolo preenche). Sem acerto, y0.
function medidorDeTopo(alvos) {
  const raio = new THREE.Raycaster(), de = new THREE.Vector3(), baixo = new THREE.Vector3(0, -1, 0);
  return (x, z, y0) => { let y = y0;
    for (let i = 0; i < 9; i++) { const dx = i ? Math.cos(i * Math.PI / 4) : 0, dz = i ? Math.sin(i * Math.PI / 4) : 0; raio.set(de.set(x + dx, y0 + 3, z + dz), baixo); raio.far = 3.6;
      try { const h = raio.intersectObjects(alvos, false)[0]; if (h && h.point.y >= y0 - .35 && h.point.y <= y0 + 1.2 && h.point.y > y) y = h.point.y; } catch (e) { /* fica y0 */ } }
    return y; };
}
// Topos que o jogador não pisa: colisores largos cujo topo fica ≥ 2,6 m acima do piso jogável (groundHeightAt) no centro
// e nos cantos, medidos por raio de cima (a laje de borda do mapa fica 12–14 cm acima do colisor); mais os blocos
// instanciados do bairro externo (caixas unitárias com escala ≥ 8 m de altura).
function telhosJogaveis(scene, mundo, alvos) {
  const cols = mundo?.colliders || [], chao = mundo?.groundHeightAt || (() => 0), raio = new THREE.Raycaster(), de = new THREE.Vector3(), baixo = new THREE.Vector3(0, -1, 0);
  const fora = (o) => { for (let p = o; p; p = p.parent) if (/SKY|PIPA|AMBIENT|hd-|HELI|DUMONT|HORIZONTE|fiacao|vegetacao/i.test(p.name || '')) return true; return false; };
  const topos = [], vistos = [];
  for (const c of cols) {
    const w = c.maxX - c.minX, d = c.maxZ - c.minZ, cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    if (w < 2 || d < 2 || Math.abs(cx) > 19) continue;
    let ok = true; for (const [px, pz] of [[cx, cz], [c.minX + .4, c.minZ + .4], [c.maxX - .4, c.maxZ - .4], [c.minX + .4, c.maxZ - .4], [c.maxX - .4, c.minZ + .4]]) { const g = chao(px, pz); if (!(c.maxY - g >= 2.6) || g > c.maxY) { ok = false; break; } }
    if (!ok) continue;
    raio.set(de.set(cx, c.maxY + 3, cz), baixo); raio.far = 3.6; let y = c.maxY;
    try { const h = raio.intersectObjects(alvos, false)[0]; if (h) { if (h.point.y < c.maxY - .35) continue; y = h.point.y; } } catch (e) { /* sem raio: topo do colisor */ }
    if (vistos.some((v) => Math.abs(v.cx - cx) < 1.2 && Math.abs(v.cz - cz) < 1.2 && Math.abs(v.y - y) < .6)) continue;
    const t = { x0: c.minX, x1: c.maxX, z0: c.minZ, z1: c.maxZ, cx, cz, y, perto: true }; vistos.push(t); topos.push(t);
  }
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  scene.traverse((o) => { if (!o.isInstancedMesh || o.geometry?.type !== 'BoxGeometry' || o.count < 20 || fora(o)) return;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.decompose(p, q, s); if (s.y < 8 || s.x < 3 || s.z < 3 || (Math.abs(p.x) < 19 && p.z < 44)) continue;
      topos.push({ x0: p.x - s.x / 2, x1: p.x + s.x / 2, z0: p.z - s.z / 2, z1: p.z + s.z / 2, cx: p.x, cz: p.z, y: p.y + s.y / 2 + .16, perto: false }); } });
  return topos;
}

/* ===================== TELHADOS: CAIXAS D'ÁGUA, ANTENAS, ESPERAS ===================== */
function antena(F, x, y, z, rng) {
  const h = 2.1 + rng() * 1.3, ry = rng() * 6.28, cs = Math.cos(ry), sn = Math.sin(ry);
  F.cor(0x6f7275).caixa(x, y, z, .045, h, .045, ry).caixa(x + sn * .15, y + h - .12, z + cs * .15, .03, .03, 1.15, ry);
  for (let i = 0; i < 8; i++) { const t = -.38 + i * .135; F.caixa(x + sn * (.15 + t), y + h - .105, z + cs * (.15 + t), .78 - i * .06, .022, .022, ry); }
  F.cor(0x34302c).caixa(x, y, z, .22, .12, .22, ry);
}
function esperas(F, x, y, z, rng) {
  F.cor(0x6e6a62).caixa(x, y - .1, z, .24, .32 + rng() * .25, .24, 0);
  for (let i = 0; i < 4; i++) { const dx = (i & 1 ? .08 : -.08), dz = (i & 2 ? .08 : -.08), h = .6 + rng() * .6;
    F.cor(0x3a2219).tubo([V(x + dx, y, z + dz), V(x + dx + (rng() - .5) * .05, y + h * .6, z + dz + (rng() - .5) * .05), V(x + dx + (rng() - .5) * .16, y + h, z + dz + (rng() - .5) * .16)], .011, 3); }
}
// Caixa d'água de polietileno (azul 0x3b6a9e, S ≈ 0,6, tampa cinza-clara) ou fibrocimento (cinza) com tampa, diâmetro ≤ 1,15 m,
// sobre pé de tijolo de 0,9 m alinhado ao eixo Y do mundo e às bordas da laje (nunca girado: o GLB caixa_dagua_fibra vinha torto
// 8–10° na origem), do topo nominal (y) ao medido (y + pe) e, às vezes, mais 25–55 cm; sujeira no pé (30 % de baixo mais escuro
// e pardo); cano descendo. Sem sombra projetada (o grupo zera castShadow).
function caixaDagua(F, x, y, z, rng, azul, pe = 0) {
  const g = azul ? (rng() < .5 ? 1 : .8) : .9, r = (azul ? .55 : .5) * g, h = (azul ? .85 : .55) * g, tom = .85 + rng() * .3, cor = azul ? 0x3b6a9e : 0x8c8f8a, base = pe + (rng() < .5 ? .25 + rng() * .3 : 0);
  if (base > 0) F.cor(0x8a4c30, .9 + rng() * .2).caixa(x, y - .03, z, .9 * g, base + .03, .9 * g);
  const b = y + base;
  F.cor(azul ? 0x2e4a5e : 0x5f5e57, tom * .9).torno(x, b, z, [[r * .84, 0], [r * .9, h * .3]], 10)
    .cor(cor, tom).torno(x, b + h * .3, z, [[r * .9, 0], [r * .93, h * .02], [r * .93, h * .32], [r * .97, h * .34], [r, h * .7], [r * 1.04, h * .7], [r * 1.04, h * .74]], 10)
    .cor(azul ? 0x9ea19f : cor, azul ? tom : tom * 1.15).torno(x, b + h * 1.04, z, [[r * 1.04, 0], [r * .7, h * .13], [r * .22, h * .19], [r * .2, h * .24]], 10);
  F.cor(0x8d9290).tubo([V(x + r * .9, b + h * .8, z), V(x + r * 1.5, b + h * .8, z), V(x + r * 1.5, y, z)], .022, 4);
}
function telhados(grupo, rng, topos, mat, mede) {
  const F = fundidor(); let n = 0;
  for (const t of topos) { n++;
    const w = t.x1 - t.x0, d = t.z1 - t.z0, paraDentro = Math.sign(-t.cx) || 1, lado = (n % 2 ? 1 : -1);
    // Canto voltado para o miolo do mapa, 1,2 m da borda (pé de 0,9 m fica ≥ 0,3 m dentro da platibanda); base no topo medido ali.
    const x = t.cx + paraDentro * Math.max(0, w / 2 - 1.2), z = t.cz + lado * Math.max(0, d / 2 - 1.2), azul = rng() < .68, pe = mede(x, z, t.y) - t.y;
    caixaDagua(F, x, t.y, z, rng, azul, pe);
    if (n % 3 === 0) { const ax = t.cx - paraDentro * Math.max(0, w / 2 - .6), az = t.cz - lado * Math.max(0, d / 2 - .6); antena(F, ax, mede(ax, az, t.y), az, rng); }
    // Vergalhões de espera em toda laje ≥ 2 m, no canto oposto à caixa d'água (0,4 m da borda); as largas (> 3 m) sorteiam uma 2ª no meio.
    if (w > 2) { const ex = t.cx - paraDentro * Math.max(0, w / 2 - .4), ez = t.cz - lado * Math.max(0, d / 2 - .4); esperas(F, ex, mede(ex, ez, t.y), ez, rng); }
    if (rng() < .3 && w > 3) { const ex = t.cx + (rng() - .5) * w * .5, ez = t.cz - lado * Math.max(0, d / 2 - .4); esperas(F, ex, mede(ex, ez, t.y), ez, rng); }
  }
  if (F.tris()) { const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-telhados'; grupo.add(malha); }
  return { topos: topos.length };
}

/* ===================== FACHADA: PVC, RELÓGIO DE LUZ, ELETRODUTO ===================== */
const PVC = [0xb9b5a6, 0x8d9290, 0x77736a];
// Relógio de luz: caixa cinza 30 x 42 x 10 cm com 1 cm embutido na face (x, z) de normal (nx, nz) — fica 0–9 cm da parede —,
// tampa, aro escuro de 16 cm e mostrador (vidro escuro 12 x 12 cm) 1,8 cm à frente da caixa (o vidro da r4 ficava DENTRO dela).
function relogio(F, x, y, z, nx, nz, tom = 1, corpo = 0x8a8d8c, tampa = 0x6f7271) {
  const P = (o, w, d, cor, y0, h, g = 1) => F.cor(cor, g).caixa(x + nx * o, y0, z + nz * o, nx ? d : w, h, nx ? w : d);
  P(.04, .30, .10, corpo, y, .42, tom); P(.05, .34, .12, tampa, y + .42, .03);
  P(.096, .16, .012, 0x3a3c3c, y + .19, .16); P(.106, .12, .008, 0x0e1012, y + .21, .12); P(.095, .06, .01, 0x2b2d2e, y + .05, .07);
}
// Roldana de porcelana Ø 2r (8 cm por padrão) em suporte de ferro, (3,5 cm + r) para fora da face (x, z) de normal (nx, nz).
// Devolve o ponto da borda externa onde o cabo sai: nenhum cabo atravessa o corpo. Substitui os cubos de ancoragem.
function roldana(F, x, y, z, nx, nz, r = .04) {
  const d = .035 + r;
  F.cor(0x3a3d3f).caixa(x + nx * .008, y - .025, z + nz * .008, nx ? .016 : .05, .05, nx ? .05 : .016)
    .caixa(x + nx * d * .5, y - .006, z + nz * d * .5, nx ? d : .012, .012, nx ? .012 : d);
  F.cor(0x9a9690).torno(x + nx * d, y - r * .55, z + nz * d, [[r * .15, 0], [r * .65, 0], [r, r * .3], [r, r * .8], [r * .65, r * 1.1]], 8);
  return V(x + nx * (d + r), y, z + nz * (d + r));
}
// Verga de tijolo exposto sobre cada portão autoral (marco de 0,91 x 2,08 m: colisor escadaoFachadaDetalhe fino, 2,0–2,5 m): 3 fiadas
// de 7,3 cm (tijolos de 19 cm, junta de 1 cm) por até 1,24 m, 1,2 cm fora do reboco sobre leito de argamassa 2 cm maior; reboco
// quebrado em volta = 7 lascas de emboço de 6–15 cm a 8 mm, borda irregular. Só em parede que não é tijolo (metricTile 1.65),
// achada por raio horizontal a partir do marco; a verga é recortada 12 cm antes das bordas da parede. Fica acima de 2,1 m.
const VERGA_TIJOLO = [0x8a5a44, 0x95624a, 0x7e5340];
function vergas(F, rng, mundo, alvos) {
  const cols = mundo?.colliders || [], raio = new THREE.Raycaster(), caixa = new THREE.Box3(); raio.far = .6; let n = 0;
  for (const k of cols) {
    const w = k.maxX - k.minX, d = k.maxZ - k.minZ, h = k.maxY - k.minY;
    if (!k.escadaoFachadaDetalhe || h < 2.0 || h > 2.5 || Math.min(w, d) > .13 || Math.abs(Math.max(w, d) - .91) > .02) continue;
    const emX = w < d, cx = (k.minX + k.maxX) / 2, cz = (k.minZ + k.maxZ) / 2, y0 = k.maxY + .01;
    let hit = null, nrm = null;
    for (const s of [-1, 1]) { const dir = emX ? V(s, 0, 0) : V(0, 0, s); raio.set(V(cx, y0 + .13, cz), dir);
      try { const hs = raio.intersectObjects(alvos, false); if (hs.length && (!hit || hs[0].distance < hit.distance)) { hit = hs[0]; nrm = dir.clone().negate(); } } catch (e) { /* sem raio: sem verga */ } }
    if (!hit || hit.distance > .45) continue;
    const m = Array.isArray(hit.object.material) ? hit.object.material[hit.face?.materialIndex || 0] : hit.object.material;
    if (!m || m.userData?.metricTile === 1.65) continue;
    caixa.setFromObject(hit.object); const a0 = (emX ? caixa.min.z : caixa.min.x) + .12, a1 = (emX ? caixa.max.z : caixa.max.x) - .12, ac = emX ? cz : cx;
    const W = Math.min(1.24, 2 * Math.min(ac - a0, a1 - ac)); if (W < .95) continue;
    const fx = hit.point.x, fz = hit.point.z;
    const box = (a, y, hgt, len, out, thick, cor, g = 1) => { const x = emX ? fx + nrm.x * (out + thick / 2) : ac + a, z = emX ? ac + a : fz + nrm.z * (out + thick / 2);
      F.cor(cor, g).caixa(x, y, z, emX ? thick : len, hgt, emX ? len : thick); };
    const hb = .073, j = .01;
    box(0, y0 - .01, 3 * (hb + j) + .02, W + .04, 0, .006, 0x6a665f, .9);
    for (let r = 0; r < 3; r++) { const y = y0 + r * (hb + j) + j / 2; let a = -W / 2 + (r % 2 ? -.1 : 0);
      while (a < W / 2 - .005) { const b0 = Math.max(a, -W / 2), b1 = Math.min(a + .19, W / 2); if (b1 - b0 > .03) box((b0 + b1) / 2, y, hb, b1 - b0, .006, .012, VERGA_TIJOLO[Math.floor(rng() * 3)], .85 + rng() * .3); a += .19 + j; } }
    for (let i = 0; i < 7; i++) { const ang = rng() * 6.283; if (Math.sin(ang) < -.3) continue;
      const a = Math.cos(ang) * (W / 2 + .05 + rng() * .06), yy = y0 + 1.5 * (hb + j) + Math.sin(ang) * (.15 + rng() * .05);
      box(a, yy - .03 - rng() * .04, .05 + rng() * .1, .06 + rng() * .09, 0, .008, 0xa8a195, .85 + rng() * .25); }
    n++;
  }
  return n;
}
function fachada(grupo, rng, mundo, mat, alvos) {
  const cols = mundo?.colliders || [], chao = mundo?.groundHeightAt || (() => 0), F = fundidor(); let feitas = 0;
  const dentro = (x, y, z, nao) => cols.some((c) => c !== nao && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && y > c.minY && y < c.maxY);
  // Folha de porta/portão (colisor fino ≤ 20 cm e 1,4–2,4 m de altura) ou marco/janela autoral a menos de 0,35 m da caixa.
  const folhaPerto = (x, y, z, nao) => cols.some((k) => k !== nao && (k.escadaoFachadaDetalhe || (Math.min(k.maxX - k.minX, k.maxZ - k.minZ) <= .2 && k.maxY - k.minY >= 1.4 && k.maxY - k.minY <= 2.4))
    && k.maxY > y - .3 && k.minY < y + .7 && x > k.minX - .5 && x < k.maxX + .5 && z > k.minZ - .5 && z < k.maxZ + .5);
  for (const c of cols) {
    // Muro de limite (80 m, x = ±17,75) não é fachada: o eletroduto a 2,6 m ficava enterrado no mirante e lia como fio solto no spawn.
    const w = c.maxX - c.minX, d = c.maxZ - c.minZ, h = c.maxY - c.minY; if (h < 3.5 || Math.min(w, d) > .8 || Math.max(w, d) < 2.2 || Math.max(w, d) > 12) continue;
    const emX = w <= d;   // parede fina em x: faces voltadas para ±x
    for (const n of [-1, 1]) {
      const face = emX ? (n > 0 ? c.maxX : c.minX) : (n > 0 ? c.maxZ : c.minZ);
      const ponto = (along, out) => emX ? [face + n * out, along] : [along, face + n * out];
      const a0 = emX ? c.minZ : c.minX, a1 = emX ? c.maxZ : c.maxX, am = (a0 + a1) / 2;
      const [px, pz] = ponto(am, .6), g = chao(px, pz);
      if (g < c.minY - .4 || c.maxY - g < 2.5 || Math.abs(px) > 17.9 || Math.abs(pz) > 39.9 || dentro(px, g + 1.0, pz, c) || dentro(px, g + 2.4, pz, c)) continue;
      // Canto da descida de PVC: só onde nenhuma porta/janela autoral cruza a prumada (1,0 / 2,2 / 4,5 m); a braçadeira sobre a
      // veneziana do beco (r4) vinha daqui. Sem canto livre, a fachada fica sem PVC (eletroduto e relógio continuam).
      const livre = (a) => { const [qx, qz] = ponto(a, .1), g0 = chao(qx, qz); return [1.0, 2.2, 4.5].every((hh) => !folhaPerto(qx, g0 + hh, qz, c)); };
      const cantos = rng() < .5 ? [a0 + .35, a1 - .35] : [a1 - .35, a0 + .35], cantoPvc = cantos.find(livre), canto = cantoPvc ?? cantos[0];
      const [cx, cz] = ponto(canto, .066), gc = chao(...ponto(canto, .5)), topo = c.maxY - .25;
      if (cantoPvc !== undefined) {
        // Descida de PVC com braçadeiras até o beiral.
        F.cor(PVC[Math.floor(rng() * 2.999)], .85 + rng() * .25).tubo([V(cx, gc + .03, cz), V(cx, topo, cz), V(...(emX ? [face - n * .03, topo + .1, cz] : [cx, topo + .1, face - n * .03]))], .05, 6);
        for (let y = gc + .45; y < topo; y += 1.45) { const [bx, bz] = ponto(canto, .06); F.cor(0x3a3d3f).caixa(bx, y, bz, emX ? .12 : .135, .035, emX ? .135 : .12); }
      }
      // Eletroduto preto corrido a 2,6 m, com caimento entre fixações.
      const pts = [], N = Math.max(2, Math.round((a1 - a0) / .45)), ye = Math.max(gc + 2.55, c.minY + 2.6) + rng() * .12;
      for (let k = 0; k <= N; k++) { const [ex, ez] = ponto(a0 + .12 + (a1 - a0 - .24) * k / N, .028); pts.push(V(ex, ye - .028 * Math.abs(Math.sin(k * Math.PI / 3)), ez)); }
      F.cor(0x121315).tubo(pts, .013, 3);
      // Relógio de luz (9 cm de saliência, com mostrador) a 1,3 m: 1ª posição livre a ≥ 0,35 m de folha de porta/portão e de marco
      // autoral, senão fica sem. Eletroduto sobe até caixa de passagem encostada na linha da laje (topo do colisor); cabos do gato
      // saem de uma roldana sob o beiral e entram na tampa do relógio.
      if (rng() < .65) { const dir = canto < am ? 1 : -1, ar = [canto + dir * .95, canto + dir * 1.6, am].find((a) => { const [qx, qz] = ponto(a, .1); return a > a0 + .3 && a < a1 - .3 && !folhaPerto(qx, chao(qx, qz) + 1.25, qz, c); });
        if (ar !== undefined) { const [fx, fz] = ponto(ar, 0), gr = chao(...ponto(ar, .5)), y = gr + 1.25 + rng() * .15;
          relogio(F, fx, y, fz, emX ? n : 0, emX ? 0 : n, .9 + rng() * .2);
          const [tx, tz] = ponto(ar - .08, .055), [bx, bz] = ponto(ar + .07, .055), [kx, kz] = ponto(ar - .08, .035);
          F.cor(0x767978).tubo([V(tx, y + .44, tz), V(tx, c.maxY - .13, tz)], .016, 4).tubo([V(bx, y, bz), V(bx, gr + .08, bz)], .013, 4);
          F.cor(0x4a4c4e).caixa(kx, c.maxY - .13, kz, emX ? .07 : .12, .12, emX ? .12 : .07);
          const [ox, oz] = ponto(ar + .08, 0), P0 = roldana(F, ox, c.maxY - .10, oz, emX ? n : 0, emX ? 0 : n, .03);
          for (let k = 0; k < 3; k++) { const fio = [P0], a1k = ar + .05 + k * .03, f0 = rng() * 6;
            for (let yy = topo - .2; yy > y + .5; yy -= .22) { const [fx, fz] = ponto(a1k + .03 * Math.sin(yy * (3 + k) + f0), .095); fio.push(V(fx, yy, fz)); }
            const [lx, lz] = ponto(ar + .02 + k * .04, .08); fio.push(V(lx, y + .44, lz), V(lx, y + .36, lz)); F.cor(k % 2 ? 0x15161a : 0x2a2420).tubo(fio, .006, 3); } } }
      feitas++;
    }
  }
  const nVergas = vergas(F, rng, mundo, alvos);
  if (F.tris()) { const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-fachada'; malha.receiveShadow = true; grupo.add(malha); }
  return { fachadas: feitas, vergas: nVergas };
}

/* ===================== POSTES E FIOS ===================== */
// Postes de concreto duplo-T com cruzeta (3 isoladores), travessa baixa, luminária de braço e caixa de passagem. Três famílias:
// `veste` = poste autoral de 16 cm (x = ±15 / ±14; a seção de 22 cm o engole, +3 cm por lado) prolongado 2,6 m acima do topo
// autoral; `novo` = fora de bounds (|x| = 19,3, entre o muro e o bairro), 12 m; `longe` = atrás dos muros de fundo. Cabos em
// fita (fiador): 3 na cruzeta + 1 de telecom mais grosso entre postes vizinhos, descidas para roldanas de fachada e
// travessias sobre os becos e sobre a escada. Tudo ≥ 3,5 m acima do piso jogável.
const POSTES = [
  { id: 'A', x: -15, z: 32, topo: 6.15 + 2.6, veste: true, rot: 0 }, { id: 'B', x: -15, z: 12, topo: 6.85 + 2.6, veste: true, rot: 0 },
  { id: 'D', x: 15, z: 34, topo: 6.45 + 2.6, veste: true, rot: 0 }, { id: 'E', x: 15, z: 12, topo: 6.95 + 2.6, veste: true, rot: 0 },
  { id: 'H', x: -14, z: -27, topo: H_TOP + 5.35 + 2.6, veste: true, rot: 0 }, { id: 'J', x: -14, z: -36, topo: H_TOP + 5.75 + 2.6, veste: true, rot: 0 },
  { id: 'I', x: 14, z: -29, topo: H_TOP + 5.55 + 2.6, veste: true, rot: 0 }, { id: 'K', x: 14, z: -34, topo: H_TOP + 5.45 + 2.6, veste: true, rot: 0 },
  { id: 'C', x: -19.3, z: 5, topo: 12, rot: 0 }, { id: 'G', x: 19.3, z: 5, topo: 12, rot: 0 },
  { id: 'L', x: -19.3, z: -22, topo: 12, rot: 0 }, { id: 'M', x: 19.3, z: -22, topo: 12, rot: 0 },
  { id: 'F1', x: -8.6, z: 40.7, topo: 8.2, rot: Math.PI / 2 }, { id: 'F2', x: 9.4, z: 40.7, topo: 8.4, rot: Math.PI / 2 }, { id: 'F3', x: -4, z: -40.9, topo: 11.2, rot: Math.PI / 2 },
];
// Ligações poste–poste (3 cabos na cruzeta + telecom) e descidas poste → roldana de fachada [x, y, z, nx, nz] (2 cabos finos;
// nx/nz = normal da face onde a roldana se apoia).
const LIGACOES = [['F1', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'L'], ['L', 'H'], ['H', 'J'], ['F2', 'D'], ['D', 'E'], ['E', 'G'], ['G', 'M'], ['M', 'I'], ['I', 'K'], ['A', 'D'], ['H', 'I'], ['F3', 'J'], ['F3', 'K']];
const DESCIDAS = {
  F1: [[-9.2, 3.08, 29.75, 0, 1], [-14.9, 3.1, 29.75, 0, 1]], F2: [[9.1, 3.08, 31.75, 0, 1], [14.9, 3.1, 31.75, 0, 1]], F3: [[-7.1, 10.72, -26.05, 0, -1], [6.9, 10.72, -26.05, 0, -1]],
  B: [[-13.85, 4.4, 12.4, 1, 0]], E: [[10.15, 4.4, 12.4, 1, 0]], C: [[-13.85, 6.4, 2.3, 1, 0]], G: [[13.85, 7.5, 3.0, -1, 0]],
  H: [[-9.15, 10.2, -24.5, -1, 0]], I: [[9.15, 10.2, -24.5, 1, 0]], L: [[-9.15, 10.3, -23.0, -1, 0]],
};
// Travessias fachada ↔ fachada [A, B, barriga], de roldana a roldana (normal = sentido da outra ponta): sobre os becos (z = 12,8),
// sobre a escada (faces x = ±2,2 das frentes laterais) e, em cada beco, duas travessias baixas (x = ∓13,9 ↔ ∓10,1) com o ponto
// mais baixo ≥ 3,7 m: ficam acima do quadro da pose do beco (teto a 3,39 m na parede) e cruzam o beco inteiro.
const TRAVESSIAS = [
  [[-13.85, 4.4, 12.8], [-10.15, 5.1, 12.8], .12], [[10.15, 4.4, 12.8], [13.85, 5.1, 12.8], .12],
  [[-2.2, 11.6, -2.6], [2.2, 9.8, -2.4], .25], [[-2.2, 6.6, 11.3], [2.2, 4.8, 11.1], .22],
  [[-13.88, 3.8, 10.9], [-10.12, 4.15, 10.6], .10], [[-13.88, 3.85, 11.3], [-10.12, 4.3, 9.9], .12],
  [[13.88, 3.8, 10.9], [10.12, 4.15, 10.6], .10], [[13.88, 3.85, 11.3], [10.12, 4.3, 9.9], .12],
];
// Nó de fiação nos postes do mirante (I e H, os que a pose da escada vê contra o céu): caixa de emenda, rolo de sobra e 10 laçadas
// de cabo em volta do poste a 2,3 m abaixo do topo, mais uma ponta solta pendurada. Devolve nº de fios.
function noDeFiacao(F, W, p, rng) {
  const x = p.x, z = p.z, y = p.topo - 2.3;
  F.cor(0x3a3a3c).caixa(x + .13, y - .15, z, .16, .3, .12).cor(0x2a2b2d).torno(x, y + .3, z, [[.17, 0], [.2, .05], [.17, .11]], 8);
  for (let k = 0; k < 10; k++) { const a = rng() * 6.283, r = .25 + rng() * .4, dy = (rng() - .5) * .9, P = V(x + Math.cos(a) * r, y + dy - .1 - rng() * .3, z + Math.sin(a) * r);
    W.cor(k % 3 ? ESCURO : TELECOM).cabo(V(x, y + dy, z), P, .08 + rng() * .15, .009).cabo(P, V(x, y + dy - .35 - rng() * .3, z), .05 + rng() * .1, .009); }
  W.cor(ESCURO).cabo(V(x + .1, y, z), V(x + .2 + rng() * .2, y - 1.3 - rng() * .5, z + .15), .02, .009);
  return 21;
}
// Beco oeste, parede da pose (face x = −13,9, frente de z 10,4): o único trecho livre fica sob a veneziana (z 9,4–10,4, até 2,41 m).
// r22: a caixa clara 30 x 42 lia como pedestal de reboco e os 3 fios do gato + 7 cabos em fita (feixe de 10 cm) como eletrodutos
// rígidos / cano d'água. Agora: caixa de policarbonato cinza-escuro chumbada na parede (1 cm embutida) a 1,55 m com visor, conduíte
// corrugado preto SÓ vertical (descendo enterrado e subindo até a caixa de passagem no peitoril, 2,41 m); 3 fios do gato em fita
// com barriga própria entram na caixa de passagem; dela saem 3 cabos pretos de 4–5 mm com catenárias distintas (6–16 cm) até a
// roldana da pilastra de z 9,29, sobem colados a ela e cruzam a fachada a 3,9 m até a pilastra de z 11,51. Fio de extensão laranja
// desce do relógio e corre pelo pé da parede até os caixotes no pé do portão (z 11,0). Sem rng: o sorteio da fachada não muda.
function becoOeste(F, W, chao) {
  const x = -13.9, z = 9.75, y = 1.55;
  relogio(F, x, y, z, 1, 0, 1, 0x2f3234, 0x232527);
  F.cor(0xd9d7cc).torno(x + .11, y + .27, z, [[.03, 0], [.03, .006]], 10).cor(0x1a1b1d).caixa(x + .118, y + .27, z + .012, .004, .028, .004, 0, 0, .6)
    .cor(0xf0efe8).caixa(x + .11, y + .12, z, .006, .024, .07).cor(0x1a1b1d).caixa(x + .115, y + .125, z - .02, .002, .014, .009).caixa(x + .115, y + .125, z, .002, .014, .009).caixa(x + .115, y + .125, z + .02, .002, .014, .009);
  // Conduíte corrugado (anéis de 2,5 cm em tom alternado) só na vertical.
  for (const [y0, y1, dz] of [[.55, y - .02, -.06], [y + .44, 2.31, .06]]) for (let yy = y0; yy < y1; yy += .025) F.cor(Math.round(yy / .025) % 2 ? 0x1c1d1f : 0x2a2b2d).tubo([V(x + .05, yy, z + dz), V(x + .05, Math.min(y1, yy + .025), z + dz)], .014, 5);
  F.cor(0x4a4c4e).caixa(x + .035, 2.31, z + .06, .07, .10, .12);
  F.cor(0x3a3d3f).caixa(x + .04, 1.0, z - .06, .06, .035, .09).caixa(x + .04, 2.2, z + .06, .06, .035, .09);
  for (let k = 0; k < 3; k++) { const a = z - .06 + k * .04; W.cor(k % 2 ? 0x15161a : 0x2a2420).fio([V(x + .05, 2.32, a + .06), V(x + .09 + .02 * Math.sin(k * 2.0), 2.18, a + .02), V(x + .10, 1.9 + .02 * k, a - .005), V(x + .08, y + .46, a)], .003); }
  const R1 = roldana(F, x + .065, 2.36, 9.22, 1, 0, .03), R2 = roldana(F, x + .065, 3.9, 9.22, 1, 0, .03), R3 = roldana(F, x + .065, 3.95, 11.55, 1, 0, .03);
  for (let k = 0; k < 3; k++) { const c = k % 2 ? 0x141517 : 0x202224, r = .002 + .0005 * k, dz = .02 * (k - 1), dy = .03 * k;
    W.cor(c).cabo(V(x + .06, 2.30 + .02 * k, z + .02 + .03 * k), V(R1.x, R1.y + dy, R1.z + dz), .06 + .05 * k, r).cabo(V(R1.x + .006 * k, R1.y + dy, R1.z + dz), V(R2.x + .006 * k, R2.y + dy, R2.z + dz), 0, r)
      .cabo(V(R2.x, R2.y + dy, R2.z + dz), V(R3.x, R3.y + dy, R3.z + dz), .10 + .04 * k, r); }
  // Fio de extensão: sai pela base do relógio, pende 25 cm, corre pelo pé da parede (3 cm acima do chão) até o pé do portão.
  const pts = [V(x + .09, y + .02, z + .10), V(x + .12, y - .25, z + .14), V(x + .10, chao(x + .1, z + .3) + .03, z + .3)];
  for (let zz = z + .5; zz <= 11.05; zz += .25) pts.push(V(x + .08 + .02 * Math.sin(zz * 7.0), chao(x + .1, zz) + .025, zz));
  pts.push(V(x + .25, chao(x + .25, 11.05) + .12, 11.05)); F.cor(0xb8552a).tubo(pts, .005, 3);
  F.cor(0xe8e5dc).caixa(x + .25, chao(x + .25, 11.05) + .10, 11.05, .06, .035, .09, 0.3);
}
function duploT(F, x, z, base, topo, rot, rng) {
  const h = topo - base, cs = Math.cos(rot), sn = Math.sin(rot);
  // Seção 22 x 22 cm embaixo (duas mesas + alma), 18 x 18 no terço de cima; cinza de concreto com sujeira no pé.
  for (const [y0, hh, e] of [[base - .3, h * .62 + .3, 1], [base + h * .62, h * .38, .82]]) {
    F.cor(0x8a8781, .86 + .09 * e).caixa(x + sn * .085 * e, y0, z + cs * .085 * e, .22 * e, hh, .05 * e, rot).caixa(x - sn * .085 * e, y0, z - cs * .085 * e, .22 * e, hh, .05 * e, rot)
      .cor(0x7f7c76, .9).caixa(x, y0, z, .08 * e, hh, .12 * e, rot); }
  F.cor(0x4a4844).caixa(x, base, z, .24, .6, .24, rot);
  // Cruzeta de 1,8 m com 3 isoladores e mãos-francesas; travessa baixa de 1,2 m com 2 isoladores; caixa de passagem + eletroduto.
  F.cor(0x6e6b66).caixa(x, topo - .5, z, 1.8, .1, .1, rot).caixa(x, topo - 1.15, z, 1.2, .08, .08, rot);
  for (const k of [-.7, 0, .7]) F.cor(0x9a9690).torno(x + cs * k, topo - .4, z - sn * k, [[.04, 0], [.05, .08], [.03, .14]], 6);
  for (const k of [-.5, .5]) F.cor(0x3a3a3c).caixa(x + cs * k, topo - 1.07, z - sn * k, .12, .12, .12);
  for (const k of [-1, 1]) F.cor(0x5e5b56).caixa(x + cs * k * .35, topo - .95, z - sn * k * .35, .04, .62, .04, rot, 0, k * .62);
  F.cor(0x4a4c4e).caixa(x + sn * .2, base + 3.4, z + cs * .2, .22, .5, .14, rot).cor(0x2a2b2d).tubo([V(x + sn * .2, base + .1, z + cs * .2), V(x + sn * .2, base + 3.4, z + cs * .2)], .02, 4);
  // Luminária: braço de 1,2 m para o lado do miolo do mapa, cabeça cinza com difusor claro.
  const lx = x > 0 ? -1 : 1, bx = x + lx * 1.15, by = topo - 1.6;
  F.cor(0x6f7275).tubo([V(x, by - .35, z), V(x + lx * .6, by + .05, z), V(bx, by, z)], .025, 5);
  F.cor(0x6b6e70).caixa(bx - lx * .1, by - .08, z, .55, .1, .22).cor(0xd9d7cc).caixa(bx - lx * .1, by - .11, z, .4, .03, .16);
  if (rng() < .5) F.cor(0x2d2d2f).caixa(x - sn * .13, base + 2.6, z - cs * .13, .18, .26, .02, rot);
}
// Padrão de entrada no muro de 2 m do spawn (face +z, ponta oeste): relógio encostado (0–9 cm), pontalete galvanizado ao lado da
// ponta do muro (x = −3,08) até 1,75 m = 0,25 m abaixo do rufo de zinco (2,0 m): não cruza o beiral do abrigo atrás. O ramal sobe
// do isolador à roldana no beiral do prédio de trás (x −3,6; 5,6 m) sem cruzar o rufo (fica a x < −3,05) e de lá vai ao poste A.
// Único trecho abaixo de 2,4 m: os 0,5 m iniciais do ramal, colados à ponta do muro e à fachada (fora da circulação).
function padrao(F, W, x, z, lig) {
  relogio(F, x, 1.2, z, 0, 1);
  const mx = x - .28, mz = z + .04, R = V(-3.6, 5.6, 24.53);
  F.cor(0x9a9d9a).tubo([V(mx, .95, mz), V(mx, 1.75, mz)], .02, 5).cor(0x6f7271).caixa(mx + .1, 1.05, z + .02, .2, .03, .04).caixa(mx + .1, 1.55, z + .02, .2, .03, .04);
  F.cor(0x9a9690).torno(mx, 1.75, mz, [[.03, 0], [.035, .05], [.02, .11]], 6);
  for (const n of [0, 1]) { const c = n ? ESCURO : CHUMBO2, Rn = roldana(F, R.x, R.y + n * .10, R.z, 0, 1);
    W.cor(c).cabo(V(mx, 1.86 + n * .03, mz), Rn, .04, .009).cabo(Rn, V(lig.x, lig.y - n * .1, lig.z), .7, .009);
    W.cor(QUENTE).cabo(V(mx + .02 * n, 1.84, mz), V(x - .08 + .04 * n, 1.65, z + .07), .02, .006); }
}
function postes(grupo, rng, mundo, mat, W) {
  const F = fundidor(), chao = mundo?.groundHeightAt || (() => 0), por = {}; let fios = 0;
  for (const p of POSTES) { p.base = p.veste ? chao(p.x, p.z) : (Math.abs(p.z) > 40 ? -.3 : -.1); por[p.id] = p; duploT(F, p.x, p.z, p.base, p.topo, p.rot, rng); }
  const iso = (p, k) => V(p.x + Math.cos(p.rot) * k, p.topo - .3, p.z - Math.sin(p.rot) * k);
  for (const [a, b] of LIGACOES) { const P = por[a], Q = por[b], L = Math.hypot(P.x - Q.x, P.z - Q.z), sag = .25 + L * .035;
    for (const k of [-.7, 0, .7]) { fios++; W.cor(k ? ESCURO : CHUMBO2).cabo(iso(P, k), iso(Q, k), sag * (1 + .1 * k), .011); }
    fios++; W.cor(TELECOM).cabo(V(P.x, P.topo - 1.0, P.z), V(Q.x, Q.topo - 1.0, Q.z), sag * 1.35, .016); }
  for (const [id, lista] of Object.entries(DESCIDAS)) { const P = por[id];
    for (const [fx, fy, fz, nx, nz] of lista) for (let n = 0; n < 2; n++) { fios++; W.cor(n ? ESCURO : QUENTE).cabo(iso(P, n ? .7 : -.7), roldana(F, fx, fy + n * .10, fz, nx, nz), .35 + rng() * .25, .008); } }
  for (const [a, b, barriga] of TRAVESSIAS) { const ux = Math.sign(b[0] - a[0]), uz = ux ? 0 : Math.sign(b[2] - a[2]);
    for (let n = 0; n < 2; n++) { fios++; W.cor(n ? ESCURO : QUENTE).cabo(roldana(F, a[0], a[1] + n * .10, a[2], ux, uz), roldana(F, b[0], b[1] + n * .10, b[2], -ux, -uz), barriga * (1 + .15 * n), .008); } }
  padrao(F, W, -2.8, 25.175, iso(por.A, -.7)); fios += 6;
  fios += noDeFiacao(F, W, por.I, rng) + noDeFiacao(F, W, por.H, rng); becoOeste(F, W, chao); fios += 21;
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-postes'; grupo.add(malha);
  return { postes: POSTES.length, fios };
}

/* ===================== VIDA: TOLDO, PLACA, VARAIS, COMÉRCIO, PROPS DE CALÇADA ===================== */
// Cores de roupa lavadas (S 0,25–0,45, meio-tom), sem bege/rosado quente (nada com H 10–40° e S > 0,12: lia como pele) e nada
// vermelho-sangue; os neutros são frios para não virarem bege sob o sol quente. Pregadores de madeira clara cinzenta e plástico.
const PANOS = [0xd0d6d8, 0x5e728a, 0x8e9a5c, 0x7a9a8c, 0xb9c4cf, 0x977f9a, 0x4a5668, 0xc9d0c9, 0x5f8a92, 0x6f8a6a, 0x8c86a8, 0x4e6a9a, 0x7a8a5a], PREGADORES = [0xa9a9a0, 0x5f8fb8, 0x9fb23a, 0xd0d6d8, 0x7d8a6a];
// Atlas de tecido (canvas 512, 4 x 4 células de 128): trama fina (linhas de 1 px a cada 2 px, ±4 %), silhueta por alpha e estampa
// em cinza (a cor vem do vértice). Tipos (col): 0 camiseta (mangas e gola), 1 calça (2 pernas, costuras), 2 lençol (alpha 0,92:
// translúcido), 3 toalha (barras nas pontas), 4 pano de prato (xadrez); linha 1 = mesmas com estampa (listras / bolinhas / xadrez).
// Lençol/toalha/pano ocupam a célula inteira; camiseta/calça têm a silhueta recortada.
const ROUPA_TIPOS = [{ w: .55, h: .62 }, { w: .42, h: .95 }, { w: 1.3, h: 1.15, lencol: true }, { w: .5, h: .85 }, { w: .3, h: .36 }];
function atlasRoupas(rng) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.clearRect(0, 0, 512, 512);
  // 5 colunas de 102,4 px (desenho em coordenadas de 128 com escala 0,8 em x), 4 linhas de 128 (2 usadas).
  const cel = (col, lin, alpha, estampa) => { const x0 = 0, y0 = 0; g.save(); g.translate(col * 102.4, lin * 128); g.scale(.8, 1); g.beginPath();
    if (col === 0) { g.moveTo(x0 + 36, y0 + 6); g.lineTo(x0 + 92, y0 + 6); g.lineTo(x0 + 124, y0 + 30); g.lineTo(x0 + 114, y0 + 58); g.lineTo(x0 + 94, y0 + 50); g.lineTo(x0 + 94, y0 + 126); g.lineTo(x0 + 34, y0 + 126); g.lineTo(x0 + 34, y0 + 50); g.lineTo(x0 + 14, y0 + 58); g.lineTo(x0 + 4, y0 + 30); g.closePath(); }
    else if (col === 1) { g.moveTo(x0 + 30, y0 + 2); g.lineTo(x0 + 98, y0 + 2); g.lineTo(x0 + 100, y0 + 126); g.lineTo(x0 + 70, y0 + 126); g.lineTo(x0 + 64, y0 + 40); g.lineTo(x0 + 58, y0 + 126); g.lineTo(x0 + 28, y0 + 126); g.closePath(); }
    else g.rect(x0 + 2, y0 + 2, 124, 124);
    g.clip(); g.fillStyle = `rgba(255,255,255,${alpha})`; g.fillRect(x0, y0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,.045)'; for (let i = 0; i < 128; i += 2) { g.fillRect(x0, y0 + i, 128, 1); g.fillRect(x0 + i, y0, 1, 128); }
    g.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 50; i++) g.fillRect(x0 + rng() * 128, y0 + rng() * 128, 1 + rng() * 4, 1);
    if (col === 0) { g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x0 + 64, y0 + 6, 18, 10, 0, 0, 6.3); g.fill(); g.fillRect(x0 + 33, y0 + 50, 62, 2); }
    if (col === 1) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x0 + 30, y0 + 2, 68, 7); g.fillRect(x0 + 62, y0 + 40, 4, 86); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0 + 44, y0 + 12, 2, 112); g.fillRect(x0 + 84, y0 + 12, 2, 112); }
    if (col === 3) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 + 2, y0 + 10, 124, 6); g.fillRect(x0 + 2, y0 + 112, 124, 6); }
    if (col === 4) { g.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 128; i += 16) { g.fillRect(x0 + i, y0, 8, 128); g.fillRect(x0, y0 + i, 128, 8); } }
    if (estampa === 1) { g.fillStyle = 'rgba(0,0,0,.26)'; for (let i = 8; i < 128; i += 18) g.fillRect(x0, y0 + i, 128, 7); }
    if (estampa === 2) { g.fillStyle = 'rgba(0,0,0,.30)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(x0 + 8 + rng() * 112, y0 + 8 + rng() * 112, 3 + rng() * 2, 0, 6.3); g.fill(); } }
    if (estampa === 3) { g.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 128; i += 24) { g.fillRect(x0 + i, y0, 10, 128); g.fillRect(x0, y0 + i, 128, 10); } }
    g.restore(); };
  for (let col = 0; col < 5; col++) { cel(col, 0, col === 2 ? .92 : 1, 0); cel(col, 1, col === 2 ? .92 : 1, 1 + (col % 3)); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'hd-roupas'; return t;
}
// Malha das roupas: grade 6 x 8 por peça com caimento (barriga entre pregadores, dobra lateral que cresce para baixo, torção ±4°),
// normais suaves por diferença finita, AO por vértice nas dobras (vales 22 % mais escuros), uv na célula do atlas. Um draw call.
function roupeiro() {
  const pos = [], nor = [], uv = [], cor = [], idx = [], c = new THREE.Color();
  return {
    peca(rng, cx, y, cz, dx, dz, w, h, tipo, estampa, hex, ganho) {
      const nx = -dz, nz = dx, vai = (rng() - .5) * .06, fase = rng() * 6.28, amp = .012 + rng() * .02, tw = (rng() - .5) * .14, NU = 6, NV = 8, b = pos.length / 3;
      const P = (u, v) => { const s = Math.sin(u * 5.0 + fase + v * 2.0) * amp * v + vai * v * v + .014 * Math.sin(v * Math.PI) * Math.cos(u * 3.0 + fase) + tw * u * w * v;
        return V(cx + dx * u * w + nx * s, y - v * h, cz + dz * u * w + nz * s); };
      c.setHex(hex).multiplyScalar(ganho);
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU - .5, v = j / NV, p = P(u, v);
        const du = P(u + .01, v).sub(P(u - .01, v)), dv = P(u, v + .01).sub(P(u, v - .01)), n = du.cross(dv).normalize();
        const ao = .78 + .22 * (.5 + .5 * Math.cos(u * 5.0 + fase + v * 2.0)) * (.4 + .6 * v) + .08 * (1 - v);
        pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push((tipo + .5 + u * .98) / 5, 1 - (estampa + .01 + v * .98) / 4); cor.push(c.r * ao, c.g * ao, c.b * ao); }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const k = b + j * (NU + 1) + i; idx.push(k, k + NU + 1, k + 1, k + 1, k + NU + 1, k + NU + 2); }
      return P;
    },
    n: () => idx.length / 6,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); g.setIndex(idx); return soltaAoSubir(g); },
  };
}
let ROUPEIRO = null;
// Roupas penduradas numa corda de A a B (catenária real de 10 cm em fita de 3 mm, W): peças do roupeiro (camiseta, calça, lençol só
// com hMax ≥ 1,1, toalha, pano de prato), 30 % estampadas, 2 pregadores de madeira 1 x 3 cm por peça (F). Devolve nº de peças.
function roupas(F, W, rng, x0, z0, x1, z1, y, hMax = 1.3) {
  const A = V(x0, y, z0), B = V(x1, y, z1), L = A.distanceTo(B), dx = (x1 - x0) / L, dz = (z1 - z0) / L, barriga = .10, alt = (t) => y - barriga * 4 * t * (1 - t);
  W.cor(0x4a4640).cabo(A, B, barriga, .0015);
  let s = .16 + rng() * .1, n = 0; const ry = Math.atan2(-dz, dx);
  while (s < L - .3) { let tipo = Math.floor(rng() * 5); if (ROUPA_TIPOS[tipo].lencol && hMax < 1.1) tipo = 3; let ww = ROUPA_TIPOS[tipo].w * (.9 + rng() * .2);
    if (s + ww > L - .12) { if (ww > .45) { tipo = 4; ww = .3; } else break; }
    const t = (s + ww / 2) / L, yy = alt(t) - .012, h = Math.min(ROUPA_TIPOS[tipo].h * (.9 + rng() * .2), hMax);
    const P = ROUPEIRO.peca(rng, x0 + dx * (s + ww / 2), yy, z0 + dz * (s + ww / 2), dx, dz, ww, h, tipo, rng() < .3 ? 1 : 0, PANOS[Math.floor(rng() * PANOS.length)], .85 + rng() * .3);
    const preg = PREGADORES[Math.floor(rng() * PREGADORES.length)];
    for (const u of [-.38, .38]) { const p = P(u, 0); F.cor(preg, .9 + rng() * .2).caixa(p.x, y - .01, p.z, .01, .03, .016, ry); }
    s += ww + .04 + rng() * .1; n++; }
  return n;
}
// Varal de laje: dois mourões de ferro e corda a 1,7 m sobre a laje.
function varal(F, W, rng, x0, z0, x1, z1, y) {
  for (const [x, z] of [[x0, z0], [x1, z1]]) F.cor(0x3a3d3f).caixa(x, y - 1.7, z, .05, 1.75, .05).cor(0x6e6a62).caixa(x, y - 1.7, z, .3, .12, .3);
  return roupas(F, W, rng, x0, z0, x1, z1, y);
}
// Varal entre duas fachadas (beco/escada): gancho em cada parede, corda ≥ 3,0 m, panos até 0,85 m abaixo (nunca na cabeça).
function varalEntre(F, W, rng, x0, z0, x1, z1, y) {
  const ux = Math.sign(x1 - x0), uz = ux ? 0 : Math.sign(z1 - z0), a = roldana(F, x0, y, z0, ux, uz, .02), b = roldana(F, x1, y, z1, -ux, -uz, .02);
  return roupas(F, W, rng, a.x, a.z, b.x, b.z, y, .85);
}
// Toldo de comércio: lona listrada com lambrequim e armação tubular, borda baixa a 2,45 m (acima da cabeça).
function toldo(F, rng, x0, x1, z, dz, yAlto, cores) {
  const prof = .95, yBaixo = yAlto - .42, n = Math.max(2, Math.round((x1 - x0) / .45));
  for (let i = 0; i < n; i++) { const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n, cor = cores[i % 2];
    F.cor(cor, .9 + rng() * .15).quad(V(a, yAlto, z), V(b, yAlto, z), V(b, yBaixo, z + dz * prof), V(a, yBaixo, z + dz * prof));
    F.cor(cor, .75).quad(V(a, yBaixo, z + dz * prof), V(b, yBaixo, z + dz * prof), V(b, yBaixo - .17 - .04 * (i % 2), z + dz * prof), V(a, yBaixo - .17 - .04 * (i % 2), z + dz * prof)); }
  F.cor(0x5a5c5e).tubo([V(x0, yBaixo, z + dz * prof), V(x1, yBaixo, z + dz * prof)], .018, 4).tubo([V(x0, yAlto, z), V(x0, yBaixo, z + dz * prof)], .016, 4).tubo([V(x1, yAlto, z), V(x1, yBaixo, z + dz * prof)], .016, 4)
    .tubo([V(x0 + .15, yBaixo - .02, z + dz * prof), V(x0 + .15, yAlto - 1.0, z + dz * .02)], .014, 4).tubo([V(x1 - .15, yBaixo - .02, z + dz * prof), V(x1 - .15, yAlto - 1.0, z + dz * .02)], .014, 4);
}
// Porta de enrolar na face -z de uma parede: lâminas contínuas de passo 8 cm de mundo (corpo 6,5 cm + lábio de 1,5 cm 25 % mais
// claro, 6 mm à frente: a quebra de tom lê de longe), azul-aço desbotado (S ≈ 0,2 antes do AgX) com tom por lâmina ±4 %, sujeira
// escurecendo os 35 cm de baixo e ferrugem crescente nos 40 cm (com respingo), guias em U de 7 cm, capa de 12 cm, puxador no centro.
// `aberto` > 0: lâminas só acima dessa altura (lâmina de fecho com puxador na borda); o vão fica para o interior (interiorLoja).
function portaDeEnrolar(F, rng, x0, x1, y0, z, alto, aberto = 0) {
  const cx = (x0 + x1) / 2, w = x1 - x0; let i = 0;
  for (let y = y0 + .02 + aberto; y < y0 + alto - .08; y += .08, i++) { const ferr = Math.max(0, 1 - (y - y0) / .42) * (.6 + rng() * .4), suj = Math.max(0, 1 - (y - y0) / .35), t = (.96 + rng() * .08) * (1 - .22 * suj), cor = ferr > .35 ? 0x5a4634 : 0x58646f;
    F.cor(cor, t * (1 - .25 * ferr)).caixa(cx, y, z - .02, w, .065, .025).cor(cor, t * 1.25 * (1 - .2 * ferr)).caixa(cx, y + .065, z - .026, w, .015, .031); }
  F.cor(0x3f4448).caixa(x0 - .035, y0, z - .04, .07, alto + .1, .07).caixa(x1 + .035, y0, z - .04, .07, alto + .1, .07).caixa(cx, y0 + alto, z - .06, w + .14, .22, .12);
  if (aberto > 0) F.cor(0x33383c).caixa(cx, y0 + aberto - .03, z - .024, w, .05, .04);
  F.cor(0x1e1f21).caixa(cx, y0 + aberto + .35, z - .045, .26, .03, .03);
}
// Interior da mercearia visto pelo vão da porta meio aberta: malha SEM luz (MeshBasicMaterial, lê como emissivo fraco), tudo à
// frente da parede autoral sólida (≤ 7 cm): fundo pardo-escuro quente, piso, 2 prateleiras com caixas e garrafões. +1 draw call.
function interiorLoja(x0, x1, y0, z, h) {
  const F = fundidor(), cx = (x0 + x1) / 2, w = x1 - x0;
  F.cor(0x2a180a).caixa(cx, y0, z - .003, w, h, .002).cor(0x3a2c1c).caixa(cx, y0, z - .004, w, .08, .003);
  for (const yy of [.32, .62]) { F.cor(0x6a4a26).caixa(cx, y0 + yy, z - .035, w - .1, .025, .06);
    for (let x = x0 + .12; x < x1 - .15; x += .19) { const k = Math.round(x * 37) % 4; F.cor([0x8a7a40, 0x3a5a8a, 0xa09a88, 0x6a3a2a][k], .9).caixa(x, y0 + yy + .025, z - .03, .12 + .02 * k, .14 + .04 * (k % 2), .05); } }
  F.cor(0x7aa0c0, .8).torno(x0 + .25, y0 + .08, z - .05, [[.07, 0], [.08, .18], [.05, .3], [.025, .34]], 6).torno(x0 + .45, y0 + .08, z - .05, [[.07, 0], [.08, .18], [.05, .3], [.025, .34]], 6);
  return F.geo();
}
// Placas pintadas à mão (texto genérico, sem marca): um canvas com uma linha por placa, tábua azul-escuro com letras tortas.
// Item objeto { linhas: [[nome, preço], ...] } = tabuleta de preços: fundo claro com moldura fina e 4 linhas à mão, desenhada só nos
// 430 px da esquerda (proporção 0,62 x 0,46 da tabuleta; a malha usa uMax).
function placasPintadas(textos, rng) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320 * textos.length; const g = c.getContext('2d');
  textos.forEach((texto, l) => { const y0 = 320 * l;
    if (typeof texto === 'object') {
      g.fillStyle = '#d9d2bf'; g.fillRect(0, y0, 1024, 320); g.fillStyle = 'rgba(70,60,40,.16)'; for (let i = 0; i < 30; i++) g.fillRect(rng() * 430, y0 + rng() * 320, 2 + rng() * 20, 1 + rng() * 3);
      g.strokeStyle = '#2a2f3a'; g.lineWidth = 8; g.strokeRect(12, y0 + 12, 406, 296);
      g.fillStyle = '#20263a'; g.textBaseline = 'middle';
      texto.linhas.forEach(([nome, preco], i) => { g.save(); g.translate(0, y0 + 58 + i * 66); g.rotate((i % 2 ? -1 : 1) * .012); g.font = `700 ${44 + (i % 2) * 4}px "Arial Black", Impact, sans-serif`;
        g.textAlign = 'left'; g.fillText(nome, 34, 0, 230); g.textAlign = 'right'; g.fillText(preco, 396, 0, 130); g.restore(); });
      return; }
    g.fillStyle = l % 2 ? '#1d3a6b' : '#5a2a1e'; g.fillRect(0, y0, 1024, 320); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) g.fillRect(rng() * 1024, y0 + rng() * 320, 2 + rng() * 30, 1 + rng() * 3);
    g.strokeStyle = l % 2 ? '#e8c53a' : '#e9e2cf'; g.lineWidth = 10; g.strokeRect(22, y0 + 22, 980, 276);
    g.fillStyle = l % 2 ? '#e8c53a' : '#f1ebdc'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const partes = texto.split(' · '); partes.forEach((p, i) => { g.save(); g.translate(1024 * (i + .5) / partes.length, y0 + 160 + (i % 2 ? 6 : -6)); g.rotate((i % 2 ? -1 : 1) * .03); g.font = `900 ${i === 1 ? 150 : 122}px "Arial Black", Impact, sans-serif`; g.fillText(p, 0, 0, 1024 / partes.length - 40); g.restore(); }); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'hd-placa'; return t;
}
// Uma malha para todas as placas: quad w x h (1,3 x 0,41 por padrão) por placa, UV na linha `l` do canvas até uMax; `ry` = normal da face (0 = +z).
function malhaPlacas(placas) {
  const pos = [], uv = [], idx = [], n = placas.length;
  placas.forEach(([x, y, z, ry, l, w = 1.3, h = .41, uMax = 1], k) => { const cs = Math.cos(ry), sn = Math.sin(ry);
    for (const [su, sv] of [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5]]) { const u = su * w, v = sv * h; pos.push(x + cs * u, y + v, z - sn * u); uv.push((su + .5) * uMax, 1 - (l + .5 - v / h) / n); }
    idx.push(k * 4, k * 4 + 3, k * 4 + 1, k * 4 + 1, k * 4 + 3, k * 4 + 2); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Props de calçada (GLB do acervo), sem colisão, todos < 0,8 m, encostados em parede e fora da linha de deslocamento:
// atrás do spawn E, em frente ao portão do beco oeste, pé da frente do beco leste, encosto do patamar 2 e frente do comércio.
const PROPS = [
  ['caixote_madeira', 10.05, 31.15, .30, .4], ['caixote_madeira', 10.6, 31.15, .30, -.3], ['caixote_madeira', 10.3, 31.15, .30, .1, .30], ['caixa_papelao', 11.2, 31.2, .42, .8],
  ['botijao_gas', 14.55, 31.2, .58, 0], ['botijao_gas', 14.1, 31.25, .58, 1.2], ['botijao_gas', 17.25, 30.6, .58, 2.0],
  ['cadeira_plastico', 12.9, 31.1, .78, .3], ['cadeira_plastico', -14.55, 29.2, .78, -2.7], ['cadeira_plastico', -11.3, 29.15, .78, 2.9],
  ['caixa_papelao', -17.3, 35.5, .42, .5], ['caixa_papelao', -17.0, 34.9, .38, -.9], ['caixote_madeira', 17.2, 24.8, .30, .2],
  ['cadeira_plastico', -13.3, 11.45, .78, -1.4], ['botijao_gas', 13.4, 11.3, .58, .7],
  ['caixote_madeira', -13.55, 11.0, .30, .25], ['caixote_madeira', -13.55, 11.0, .30, -.15, .30], ['caixote_madeira', -13.5, 10.55, .30, .4],
  ['caixote_madeira', -2.7, -0.95, .30, .15], ['caixote_madeira', -2.7, -0.95, .30, -.2, .30], ['botijao_gas', -3.3, -1.0, .58, 1.1],
  ['cadeira_plastico', 1.25, -23.75, .78, 2.9], ['caixote_madeira', -2.05, -23.8, .30, .2], ['caixote_madeira', -2.05, -23.8, .30, -.4, .30], ['botijao_gas', 0.55, -23.72, .58, .4],
];
/* ===================== r23: FIOS FINOS, PARAPEITOS, MURETAS, BICICLETA, CAIXILHOS, MÃO-FRANCESA ===================== */
// Cabos autorais (grupo escadao_fiacao: cilindros de 2–5 cm, retos, soltos no ar) somem (visible = false, voltam em desliga) e os
// mesmos ramais (userData.escadaoRamais: a, b, queda) voltam em fita de 4 mm com a MESMA catenária, presos em roldana de porcelana
// (face x = ±2,2 das frentes da escada) ou isolador no topo do poste autoral (|x| ≥ 14). Devolve nº de fios.
function fiosFinos(F, W, scene, escondidos) {
  const g = scene.getObjectByName('escadao_fiacao'); if (!g || !g.visible) return 0;
  g.visible = false; escondidos.push(g); let n = 0;
  const ponta = (p) => { if (Math.abs(p[0]) >= 14) { F.cor(0xd0d0c8).torno(p[0], p[1] - .02, p[2], [[.02, 0], [.034, .025], [.034, .05], [.022, .07]], 6); return V(p[0], p[1] + .07, p[2]); }
    if (Math.abs(Math.abs(p[0]) - 2.1) < .2) return roldana(F, p[0], p[1], p[2], -Math.sign(p[0]), 0, .03);
    return V(p[0], p[1], p[2]); };
  for (const r of g.userData?.escadaoRamais || []) { const A = ponta(r.a), B = ponta(r.b); W.cor(n % 3 ? ESCURO : CHUMBO2).cabo(A, B, r.queda, r.raio > .02 ? .003 : .002); n++; }
  return n;
}
// Parapeito de tijolo (3 fiadas de 7,5 cm, 20 cm de espessura, recuado 5 cm da borda) em volta de cada laje perto da escada (|x| ≤ 9,
// z −10..10) e sobre muros finos altos (≤ 0,8 m de espessura, ≥ 1,5 m, topo ≥ 2,4 m acima do piso nas 2 pontas e no centro, nada
// em cima); ferragem de espera num canto. Topos de "cartão" das poses escada/spawn. Tudo acima de 2,4 m: sem colisão.
function parapeitos(F, rng, mundo, topos, alvos) {
  const cols = mundo?.colliders || [], chao = mundo?.groundHeightAt || (() => 0), mede = medidorDeTopo(alvos); let n = 0;
  const fiadas = (x0, z0, x1, z1, y, e) => { const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let k = 0; k < 3; k++) { const rec = (k % 2 ? .006 : 0); F.cor(VERGA_TIJOLO[(k + n) % 3], .92 + rng() * .16).caixa((x0 + x1) / 2, y + k * .078, (z0 + z1) / 2, L, .07, e - rec * 2, ry);
      F.cor(0x8e8a80, .9).caixa((x0 + x1) / 2, y + k * .078 + .07, (z0 + z1) / 2, L, .008, e - .02, ry); } };
  const semNada = (c) => !cols.some((k) => k !== c && k.minY < c.maxY + .3 && k.maxY > c.maxY && k.maxX > c.minX && k.minX < c.maxX && k.maxZ > c.minZ && k.minZ < c.maxZ);
  for (const t of topos) { if (!t.perto || Math.abs(t.cx) > 9 || t.cz < -10 || t.cz > 10) continue; const y = t.y + .005, i = .05;
    fiadas(t.x0 + i, t.z0 + i + .1, t.x1 - i, t.z0 + i + .1, y, .2); fiadas(t.x0 + i, t.z1 - i - .1, t.x1 - i, t.z1 - i - .1, y, .2);
    fiadas(t.x0 + i + .1, t.z0 + i, t.x0 + i + .1, t.z1 - i, y, .2); fiadas(t.x1 - i - .1, t.z0 + i, t.x1 - i - .1, t.z1 - i, y, .2); n++;
    esperas(F, t.x0 + .35, mede(t.x0 + .35, t.z1 - .35, t.y), t.z1 - .35, rng); }
  for (const c of cols) { const w = c.maxX - c.minX, d = c.maxZ - c.minZ, cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    if (Math.min(w, d) > .8 || Math.max(w, d) < 1.5 || Math.abs(cx) > 9 || cz < -8 || cz > 8 || !semNada(c)) continue;
    const emX = w <= d, a0 = emX ? c.minZ : c.minX, a1 = emX ? c.maxZ : c.maxX, pt = (a) => emX ? [cx, a] : [a, cz];
    if ([a0 + .2, (a0 + a1) / 2, a1 - .2].some((a) => c.maxY - chao(...pt(a)) < 2.4)) continue;
    const e = Math.min(w, d) + .02, [x0, z0] = pt(a0 + .05), [x1, z1] = pt(a1 - .05); fiadas(x0, z0, x1, z1, c.maxY + .005, e); n++;
    const [ex, ez] = pt(a1 - .25); esperas(F, ex, c.maxY, ez, rng); }
  return n;
}
// Mureta baixa de bloco de concreto (39 x 19 x 14, 3 fiadas, junta de 1 cm sobre lastro escuro) de (x0, z0) a (x1, z1), base em y.
function muretaBloco(F, rng, x0, z0, x1, z1, y, fiadas = 3) {
  const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, ry = Math.atan2(-uz, ux);
  F.cor(0x4a4844).caixa((x0 + x1) / 2, y, (z0 + z1) / 2, L, fiadas * .2, .12, ry);
  for (let k = 0; k < fiadas; k++) { let a = k % 2 ? .2 : 0; if (k % 2) F.cor(0x8d8a82, .9 + rng() * .1).caixa(x0 + ux * .1, y + k * .2, z0 + uz * .1, .19, .19, .14, ry);
    for (; a + .39 <= L + .01; a += .40) F.cor(0x8d8a82, .88 + rng() * .14).caixa(x0 + ux * (a + .195), y + k * .2, z0 + uz * (a + .195), .39, .19, .14, ry);
    if (L - a > .05) F.cor(0x8d8a82, .9).caixa(x0 + ux * (a + (L - a) / 2), y + k * .2, z0 + uz * (a + (L - a) / 2), L - a, .19, .14, ry); }
  F.cor(0x9a9790).caixa((x0 + x1) / 2, y + fiadas * .2, (z0 + z1) / 2, L + .02, .03, .16, ry);
}
// Bicicleta encostada numa parede: plano da roda em (u, y) ao longo de (ux, uz) a partir de (x0, y0, z0), tombada 7° para a parede
// (normal nx, nz). Aros de 14 lados em tubo, quadro de 6 tubos, garfo, guidão, selim e pedal. Fundida: 0 draw calls.
function bicicleta(F, x0, y0, z0, ux, uz, nx, nz) {
  const P = (u, y) => V(x0 + ux * u - nx * y * .12, y0 + y, z0 + uz * u - nz * y * .12);
  const roda = (u, r) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2; pts.push(P(u + Math.cos(a) * r, r + Math.sin(a) * r)); } F.cor(0x1c1c1c).tubo(pts, .016, 4);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; F.cor(0x9a9a96).tubo([P(u + Math.cos(a) * r, r + Math.sin(a) * r), P(u - Math.cos(a) * r, r - Math.sin(a) * r)], .003, 3); } };
  roda(-.45, .33); roda(.55, .33);
  const B = P(0, .30), R = P(-.45, .33), Fa = P(.55, .33), H = P(.42, .92), S = P(-.05, .86);
  F.cor(0x2f4a6e); for (const [a, b] of [[R, S], [R, B], [B, S], [S, H], [B, H], [H, Fa]]) F.tubo([a, b], .014, 5);
  F.cor(0x3a3d3f).tubo([P(.42, .98).addScaledVector(V(nx, 0, nz), -.22), P(.42, .98).addScaledVector(V(nx, 0, nz), .22)], .011, 4).caixa(x0 + ux * .05 - nx * .11, y0 + .88, z0 + uz * .05 - nz * .11, .24, .05, .1, Math.atan2(-uz, ux))
    .tubo([P(-.06, .30), P(.06, .30)], .012, 4).caixa(x0 + ux * .06 - nx * .04, y0 + .27, z0 + uz * .06 - nz * .04, .04, .02, .1, Math.atan2(-uz, ux));
}
// Caixilho fino (tiras de 5 x 5 cm, 3 cm à frente do vidro) e peitoril de 12 cm nas janelas instanciadas do bairro externo
// (material do vidro autoral: cor 273b42 sem mapa; só instâncias fora da arena: |x| > 17,9 ou z > 40). De longe liam como retângulo cinza.
function caixilhos(F, rng, scene) {
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); let n = 0;
  scene.traverse((o) => { if (!o.isInstancedMesh || !o.material || Array.isArray(o.material) || o.material.map || o.material.color?.getHex() !== 0x273b42) return;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(p, q, s); if (Math.abs(p.x) < 17.9 && p.z < 40) continue;
      const emZ = s.z < s.x, w = emZ ? s.x : s.z, h = s.y, nx = emZ ? 0 : -Math.sign(p.x), nz = emZ ? -1 : 0, fx = p.x + nx * (s.x / 2 + .03), fz = p.z + nz * (s.z / 2 + .03), tom = .9 + rng() * .2;
      const tira = (dx, dz, dy, cw, ch) => F.cor(0xb9b5aa, tom).caixa(fx + dx, p.y + dy, fz + dz, emZ ? cw : .05, ch, emZ ? .05 : cw);
      tira(0, 0, h / 2 - .05, w + .1, .05); tira(0, 0, -h / 2, w + .1, .05);
      tira(emZ ? -w / 2 - .025 : 0, emZ ? 0 : -w / 2 - .025, -h / 2, .05, h); tira(emZ ? w / 2 + .025 : 0, emZ ? 0 : w / 2 + .025, -h / 2, .05, h);
      F.cor(0x8f8c84, tom).caixa(fx + nx * .045, p.y - h / 2 - .04, fz + nz * .045, emZ ? w + .14 : .12, .04, emZ ? .12 : w + .14);
      if (rng() < .5) F.cor(0x2a2d30).caixa(fx + nx * .005, p.y - h / 2, fz + nz * .005, emZ ? w + .02 : .012, h * .55, emZ ? .012 : w + .02); n++; } });
  return n;
}
// Mão-francesa (2 por prateleira) sob as prateleiras de zinco dos vasos autorais (map_escadao.js:1187: placa 48 x 6 cm a y − 0,2):
// barra vertical chumbada na parede, horizontal sob a placa e diagonal de ferro de 12 mm. [x, yPlaca, z, nx, nz, dist à parede].
function maosFrancesas(F, chao) {
  const H = 7.56, lista = [[-13.65, 2.6, 8.8, 1, 0, .25], [-13.65, 4.0, 7.2, 1, 0, .25], [-2.0, chao(0, 5) + 1.85, 5, 1, 0, .2], [2.0, chao(0, -3.7) + 1.85, -3.7, -1, 0, .2], [-7, H + 1.9, -21.85, 0, -1, .05], [7, H + 1.9, -21.85, 0, -1, .05]];
  for (const [x, y, z, nx, nz, d] of lista) { if (!Number.isFinite(y)) continue; const tx = -nz, tz = nx;
    for (const s of [-.16, .16]) { const wx = x - nx * d + tx * s, wz = z - nz * d + tz * s;
      F.cor(0x2e3133).caixa(wx + nx * .012, y - .3, wz + nz * .012, nx ? .024 : .03, .3, nx ? .03 : .024).caixa(wx + nx * .11, y - .035, wz + nz * .11, nx ? .22 : .03, .022, nx ? .03 : .22)
        .tubo([V(wx + nx * .015, y - .28, wz + nz * .015), V(wx + nx * .21, y - .04, wz + nz * .21)], .006, 4); } }
  return lista.length;
}
function r23(F, W, rng, mundo, topos, alvos, scene, escondidos, info) {
  const chao = mundo?.groundHeightAt || (() => 0), cols = mundo?.colliders || [];
  info.fiosFinos = fiosFinos(F, W, scene, escondidos);
  info.parapeitos = parapeitos(F, rng, mundo, topos, alvos);
  // Mureta baixa de bloco no patamar 2, encostada à parede da direita (1º colisor com minX em 1,9–3,5 cruzando z −1,9..3), sem colisão.
  const dir = cols.filter((c) => c.minX > 1.9 && c.minX < 3.5 && c.maxZ > -1.9 && c.minZ < 3.0 && c.maxY > 6.0).sort((a, b) => a.minX - b.minX)[0];
  if (dir) { const z0 = Math.max(dir.minZ, -1.9), z1 = Math.min(dir.maxZ, 2.9); if (z1 - z0 > 1.2) { muretaBloco(F, rng, dir.minX - .07, z0, dir.minX - .07, z1, 5.04, 2); info.mureta = 1; } }
  // Mirante: muro baixo de bloco colado à esquerda da mercearia (x −4,1..−2,33, frente z −23,3) e bicicleta encostada na frente da
  // casa de tijolo (x −6,6..−4,95, z −26,1), ambos no quadro da pose.
  muretaBloco(F, rng, -4.1, -23.37, -2.33, -23.37, H_TOP, 3);
  bicicleta(F, -6.55, H_TOP, -26.36, 1, 0, 0, -1);
  info.caixilhos = caixilhos(F, rng, scene); info.maosFrancesas = maosFrancesas(F, chao);
}
function vida(grupo, rng, topos, mat, vivo, mundo, criadas, W, scene, escondidos, alvos = [], r23on = true) {
  // Roupas: roupeiro (malha subdividida + atlas de tecido, 1 draw call); os varais autorais do mapa (userData.escadaoVaral:
  // GLB varal_roupas_01/02 ou corda + 3 caixas) somem (visible = false, volta em desliga) e o kit pendura as peças na mesma corda.
  ROUPEIRO = roupeiro();
  if (scene) scene.traverse((o) => { if (o.userData?.escadaoVaral && o.visible) { o.visible = false; escondidos.push(o); } });
  const F = fundidor(), chao = mundo?.groundHeightAt || (() => 0), info = { varais: 0, panos: 0, props: 0 };
  // Toldos do mercadinho (frente z 31,7, x 9–15) e do bar (frente z 29,7, x -15–-9): abaixo da placa autoral.
  toldo(F, rng, 9.35, 14.65, 31.66, -1, 2.92, [0x1f4d3a, 0xd8d2c0]);
  toldo(F, rng, -14.65, -11.2, 29.66, -1, 2.92, [0x8a3a2a, 0xd8d2c0]);
  // Dois varais com roupa pendendo nas lajes que ladeiam a escada (as mais perto de (-3,8; 5) e (3,8; -3,7)).
  for (const alvo of [[-3.8, 5], [3.8, -3.7]]) { let melhor = null, dm = 1e9;
    for (const t of topos) { if (!t.perto) continue; const d = Math.hypot(t.cx - alvo[0], t.cz - alvo[1]); if (d < dm) { dm = d; melhor = t; } }
    if (!melhor || dm > 4) continue; const w = melhor.x1 - melhor.x0, d = melhor.z1 - melhor.z0, aoLongoZ = d >= w;
    const x0 = aoLongoZ ? melhor.cx : melhor.x0 + .5, x1 = aoLongoZ ? melhor.cx : melhor.x1 - .5, z0 = aoLongoZ ? melhor.z0 + .5 : melhor.cz, z1 = aoLongoZ ? melhor.z1 - .5 : melhor.cz;
    info.panos += varal(F, W, rng, x0, z0, x1, z1, melhor.y + 1.7); info.varais++; }
  // Varais autorais escondidos (lajes do mirante, x ±12, z −26/−27, map_escadao.js:801-802): corda de 2,7 m na altura do GLB (y + 0,72 h).
  for (const [x, z, h, ry] of [[-12, -26, 1.5, .12], [12, -27, 1.45, -Math.PI / 2]]) { const cx = Math.cos(ry) * 1.35, cz = -Math.sin(ry) * 1.35;
    info.panos += varal(F, W, rng, x - cx, z - cz, x + cx, z + cz, H_TOP + 3.05 + h * .72); info.varais++; }
  // Varais entre fachadas: um em cada beco (frentes x = ∓13,9 / ∓10,1, corda a 3,05 m) e um sobre a escada no patamar 2
  // (frentes x = ±2,2 em z = -2,3, corda a 8,1 m: panos de frente para quem sobe).
  for (const [x0, z0, x1, z1, y] of [[-13.86, 12.6, -10.14, 12.6, 3.05], [10.14, 12.6, 13.86, 12.6, 3.05], [-2.16, -2.3, 2.16, -2.3, H_TOP + .55]]) { info.panos += varalEntre(F, W, rng, x0, z0, x1, z1, y); info.varais++; }
  // Boca de comércio na parede de fundo do abrigo do mirante (z = -23,3, 4,4 x 3,2 m, lisa): porta de enrolar meio aberta (0,9 m)
  // com interior escuro quente atrás (interiorLoja), toldo, placa azul/amarela, relógio, janela gradeada (0,8 x 0,45 a 1,9 m),
  // freezer branco à direita e 2 engradados na calçada; a parede autoral continua sólida atrás (saliência máxima 12 cm).
  portaDeEnrolar(F, rng, -1.75, .25, H_TOP, -23.3, 2.2, .9);
  toldo(F, rng, -1.9, .4, -23.32, -1, H_TOP + 3.05, [0x1f3a6b, 0xd8d2c0]);
  relogio(F, 1.95, H_TOP + 1.25, -23.3, 0, -1);
  F.cor(0x767978).tubo([V(1.9, H_TOP + 1.69, -23.355), V(1.9, H_TOP + 3.15, -23.355)], .016, 4);
  { const jx = 1.3, jy = H_TOP + 1.9, jw = .8, jh = .45, jz = -23.3;
    F.cor(0x10171a).caixa(jx, jy, jz - .003, jw, jh, .002);
    F.cor(0x4c5052).caixa(jx, jy - .04, jz - .02, jw + .08, .04, .04).caixa(jx, jy + jh, jz - .02, jw + .08, .04, .04).caixa(jx - jw / 2 - .02, jy, jz - .02, .04, jh, .04).caixa(jx + jw / 2 + .02, jy, jz - .02, .04, jh, .04);
    for (let k = 0; k < 5; k++) F.cor(0x2b2e30).caixa(jx - jw / 2 + jw * (k + .5) / 5, jy, jz - .03, .016, jh, .016);
    F.cor(0x2b2e30).caixa(jx, jy + jh * .5, jz - .03, jw, .016, .016); }
  F.cor(0xd4d8d2).caixa(1.9, H_TOP, -23.62, .75, .85, .62).cor(0xe6e9e4).caixa(1.9, H_TOP + .85, -23.62, .77, .04, .64).cor(0x8a8d8a).caixa(1.9, H_TOP + .84, -23.935, .77, .012, .01)
    .cor(0x2a4a8a).caixa(1.9, H_TOP + .45, -23.94, .22, .12, .01).cor(0x3a3d3f).caixa(1.9, H_TOP, -23.62, .71, .05, .58);
  for (const [ex, ey, cor] of [[-1.35, 0, 0x1f3f7a], [-1.33, .3, 0x9a7a1a]]) { F.cor(cor).caixa(ex, H_TOP + ey, -23.55, .35, .3, .3);
    for (let k = 0; k < 3; k++) F.cor(0x0e0e10).caixa(ex, H_TOP + ey + .06 + .08 * k, -23.705, .28, .04, .004); }
  // Corrimão de cano no lado direito dos 3 lances centrais (x = 1,74, 6 cm dentro da borda; o autoral fica à esquerda): montantes
  // verticais (eixo Y) de 4 cm a cada 4 degraus com o pé no piso REAL amostrado (groundHeightAt; a rampa média afundava 9 cm no degrau),
  // cano de Ø 4 cm a 0,94 m paralelo à rampa, verde-escuro lascado; sem colisão (nonSolidSurface). O cano baixo a 0,5 m só nos dois
  // primeiros lances: no 3º (pose escada, visto de viés da P2) o par de canos paralelos lia como corrimão inclinado 13° para fora.
  for (const [z1, base, baixo] of [[14.0, 0, 1], [6.52, 2.52, 1], [-1.96, 5.04, 0]]) { const z0 = z1 - 3.48, sx = 1.74;
    for (let i = 0; i <= 12; i += 4) { const z = z1 - i * .29 - .12, yr = base + 2.52 * Math.min(1, (z1 - z) / 3.48), yc = chao(sx, z), y = Number.isFinite(yc) && Math.abs(yc - yr) < .3 ? yc : yr;
      F.cor(0x2f4a3a, .9 + .1 * (i % 8 ? 1 : 0)).caixa(sx, y, z, .04, base + .94 + 2.52 * (z1 - z) / 3.68 - y, .04).cor(0x6e6a62).caixa(sx, y, z, .1, .02, .1); }
    F.cor(0x35543f).tubo([V(sx, base + .94, z1), V(sx, base + 2.52 + .94, z0 - .2)], .02, 5);
    if (baixo) F.cor(0x2f4a3a).tubo([V(sx, base + .5, z1), V(sx, base + 2.52 + .5, z0 - .2)], .014, 5); }
  // Calçada de 1 m com meio-fio de 15 cm ao pé do prédio verde do bairro externo (face x = −20,5, z 23,4–29,6, fora dos limites
  // e visto do spawn E; tapa os 5 cm entre o solo externo a −0,05 e a base do bloco), balde de plástico e caixa de feira de madeira
  // encostados na parede. Tudo na malha fundida: 0 draw calls.
  F.cor(0x8f8c83).caixa(-20.0, -.05, 26.5, 1.0, .2, 6.2).cor(0x74716a).caixa(-19.56, -.05, 26.5, .12, .2, 6.2).cor(0x9d9a90).caixa(-19.56, .13, 26.5, .12, .02, 6.2);
  F.cor(0x1f3a6a).torno(-20.34, .15, 25.3, [[.02, 0], [.12, 0], [.145, .30], [.125, .30], [.11, .05]], 10)
    .cor(0x2b2b2e).tubo([V(-20.34 - .13, .45, 25.3), V(-20.34, .56, 25.3), V(-20.34 + .13, .45, 25.3)], .004, 3);
  { const cx = -20.29, cz = 27.4, ry = Math.PI / 2 + .12, cs = Math.cos(ry), sn = Math.sin(ry);
    F.cor(0x4a3f33).caixa(cx, .15, cz, .50, .28, .34, ry);
    for (const yy of [.17, .27, .37]) {
      for (const s of [-1, 1]) F.cor(0xb39a72, .95 + .05 * s).caixa(cx + s * .17 * sn, yy, cz + s * .17 * cs, .52, .07, .02, ry).caixa(cx + s * .26 * cs, yy, cz - s * .26 * sn, .02, .07, .36, ry); } }
  // r23 (opts.r23 === false / ?hdr23=0 desliga): fios finos no lugar dos cabos autorais, parapeitos, muretas, bicicleta, caixilhos, mão-francesa.
  if (r23on) r23(F, W, rngDe(2311), mundo, topos, alvos, scene, escondidos, info);
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-vida'; grupo.add(malha);
  if (ROUPEIRO.n()) { const ta = atlasRoupas(rng), mr = new THREE.MeshStandardMaterial({ map: ta, vertexColors: true, side: THREE.DoubleSide, roughness: .92, metalness: 0, alphaTest: .5, transparent: true, name: 'hd-roupas' }); criadas.push(ta, mr);
    const roupasMesh = new THREE.Mesh(ROUPEIRO.geo(), mr); roupasMesh.name = 'hd-roupas'; roupasMesh.frustumCulled = false; grupo.add(roupasMesh); info.pecas = ROUPEIRO.n(); }
  ROUPEIRO = null;
  const mi = new THREE.MeshBasicMaterial({ vertexColors: true, name: 'hd-interior' }); criadas.push(mi);
  const interior = new THREE.Mesh(interiorLoja(-1.75, .25, H_TOP, -23.3, .9), mi); interior.name = 'hd-interior'; grupo.add(interior);
  // Placas pintadas à mão: empena leste do bar (x = -9, acima da faixa do corpo), ao lado da porta de enrolar do mirante e a
  // tabuleta de preços (0,62 x 0,46 m) entre a porta e o relógio da mercearia, a 1,55 m.
  const tp = placasPintadas(['GÁS · ÁGUA · GELO', 'MERCEARIA · PÃO · GELO', { linhas: [['PÃO', '0,75'], ['GELO', '6,00'], ['ÁGUA', '2,50'], ['CAFÉ', '2,00']] }], rng), mp = new THREE.MeshStandardMaterial({ map: tp, roughness: .85, name: 'hd-placa' }); criadas.push(tp, mp);
  const placa = new THREE.Mesh(malhaPlacas([[-8.975, 2.3, 31.2, Math.PI / 2, 0], [1.1, H_TOP + 2.5, -23.33, Math.PI, 1], [1.05, H_TOP + 1.55, -23.33, Math.PI, 2, .62, .46, 430 / 1024]]), mp); placa.name = 'hd-placa'; grupo.add(placa);
  const ids = [...new Set(PROPS.map((p) => p[0]))], sub = new THREE.Group(); sub.name = 'hd-props'; grupo.add(sub);
  // Botijão (botijao_gas.glb: textura escura + metalness pelo mapa → quase preto sem envmap) vira P13 cinza-aço fosco 0x7c8084
  // num lote próprio (tag hdcen-gas: materiais clonados ficam no cache do mapprops, o template do mapa não muda).
  const gas = (m) => { m.map = null; m.metalnessMap = null; m.roughnessMap = null; m.color.setHex(0x7c8084); m.metalness = .15; m.roughness = .62; m.needsUpdate = true; };
  preloadMapProps(ids).then(() => { if (!vivo()) return;
    const lote = new PropBatch({ bucket: 12, cast: false, tag: 'hdcen' }), loteGas = new PropBatch({ bucket: 12, cast: false, tag: 'hdcen-gas', matTweak: gas });
    for (const [id, x, z, h, ry, dy = 0] of PROPS) if ((id === 'botijao_gas' ? loteGas : lote).add(id, { x, y: chao(x, z) + dy, z, targetH: h, ry })) info.props++;
    lote.build(sub); loteGas.build(sub); sub.traverse((o) => { if (o.isMesh) { o.name = 'hd-prop'; o.castShadow = false; o.raycast = () => {}; o.userData.nonSolidSurface = true; } }); }).catch(() => {});
  return info;
}

export function cenografiaEscadao(scene, opts = {}) {
  const lig = (k) => opts[k] !== false, mundo = opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null);
  const grupo = new THREE.Group(); grupo.name = 'hd-cenografia'; let vivo = true; const info = {}, criadas = [];
  // Telhados, fachada, postes e vida dividem um material (um programa); morro, casario e mata usam o de longe (névoa
  // reduzida); todos os cabos e cordas vão numa fita só (hd-fios). Nenhum projeta sombra. Draw calls: +1 (fios) sobre a r4.
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: 0, side: THREE.DoubleSide, name: 'hd-cenografia' }); criadas.push(mat);
  const atlasH = atlasHorizonte(rngDe(777)), longe = materiaisLonge(atlasH); criadas.push(atlasH, ...longe.todos);
  const res = { value: new THREE.Vector2(1920, 1080) }, W = fiador();
  let voltaHorizonte = () => {};
  if (lig('morro')) { voltaHorizonte = escondeHorizonte(scene); info.morro = morro(grupo, rngDe(opts.semente || 20261115), longe, { casario: lig('casario'), mata: lig('mata') }); }
  const alvos = lig('telhados') || lig('vida') || lig('fachada') ? alvosDeRaio(scene) : [];
  const topos = lig('telhados') || lig('vida') ? telhosJogaveis(scene, mundo, alvos) : [];
  if (lig('telhados')) info.telhados = telhados(grupo, rngDe(7717), topos, mat, medidorDeTopo(alvos));
  if (lig('fachada')) info.fachada = fachada(grupo, rngDe(9311), mundo, mat, alvos);
  if (lig('postes')) info.postes = postes(grupo, rngDe(4051), mundo, mat, W);
  const escondidos = [];
  if (lig('vida')) info.vida = vida(grupo, rngDe(5519), topos, mat, () => vivo, mundo, criadas, W, scene, escondidos, alvos, lig('r23'));
  if (W.n()) { const mf = materialFio(res); criadas.push(mf); const fios = new THREE.Mesh(W.geo(), mf); fios.name = 'hd-fios'; fios.frustumCulled = false;
    fios.onBeforeRender = (r) => { const t = r.getRenderTarget(); if (t) res.value.set(t.width, t.height); else r.getDrawingBufferSize(res.value); }; grupo.add(fios); info.fios = W.n(); }
  grupo.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.raycast = () => {}; o.userData.nonSolidSurface = true; } });
  scene.add(grupo);
  return { grupo, info, desliga() {
    vivo = false; scene.remove(grupo); voltaHorizonte(); for (const o of escondidos) o.visible = true;
    // Geometria e material dos props moram no cache do mapprops: só as malhas fundidas, os fios e as placas são nossos.
    grupo.traverse((o) => { if (!o.isMesh) return; if (!o.userData.mapPropId) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
    for (const c of criadas) c.dispose();
  } };
}
