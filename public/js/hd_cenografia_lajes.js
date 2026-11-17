// Cenografia HD do Lajes (só com ?hd=1). NADA aqui tem colisão: só fora de `bounds`, em telhado inalcançável (topo >= 5,3 m),
// acima de 3,6 m sobre os becos centrais, acima de 5,4 m no resto, ou colado à parede (até 12 cm de saliência).
// ?hdnevoa=0 restaura a névoa lavada anterior para diagnóstico; ?hdprops=0 tira objetos de calçada/laje e o varal do Beco do Varal; ?hdsombra=0 tira a sombra projetada.
// ?hddenso=0 volta ao morro ralo (casario 440, sem mata no topo); ?hdcaixa=0 mantém o tambor galvanizado autoral das lajes (±11,4; ±7);
// ?hdvaral=0 mantém o varal autoral (lajes_varal.glb, corda em fita e toalhas texturizadas); ?hdloja=0 tira toldo, cadeira e engradado do mercadinho do beco oeste.
// Objetos de laje/calçada/beco novos (props, varais, caixas das lajes, esgoto do beco) só entram no quadro das poses de captura (POSES/noQuadro).
// O varal do beco em z = 19,6–20,3 (atrás da pose `beco`, fora de todas) saiu para pagar os três props de viela do beco sul.
import * as THREE from 'three';
import { preloadMapProps, PropBatch } from './mapprops.js';

const TETO_MIN = 5.3, CABO_MIN = 5.7, BECO_MIN = 3.65;
function rngDe(semente) { let s = semente; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function ruido2(x, y) {
  const i = Math.floor(x), j = Math.floor(y); let fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Poses de captura (hd_lab VISTAS.lajes: x, z, yaw; frente = (-sin, -cos)). Cenografia nova de laje, calçada e beco só entra
// onde uma delas enquadra (meio campo horizontal ≤ 51°): fora do quadro é só heap e triângulo sem retorno. A pose `beco` está
// entre paredes (|x| ≤ 1): só vê o que está dentro do beco.
const POSES = [[-2, 17, -0.0208, 1.3], [-9, -14, -2.0, 0], [-7.2, -3.5, 0.9, 0], [-6.5, -12.8, -2.0, 0]];
function noQuadro(x, z, quais = null) {
  for (const [i, [px, pz, yaw, lx]] of POSES.entries()) { if (quais && !quais.includes(i)) continue; const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz) || 1;
    if (lx && Math.abs(x) > lx) continue;
    if ((dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / l > 0.63) return true; }
  return false;
}

// Ruído do kit inteiro numa textura só (256 px, ladrilhável, com mipmap: some sozinho ao longe, sem cintilar).
// R e G: manchas (4 a 32 células por ladrilho); B: grão (64 a 128); A: mancha média (8 a 32).
export const RUIDO_PARS = `uniform sampler2D hdRuido;
  float hdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;
export function ruidoTex() {
  const N = 256, d = new Uint8Array(N * N * 4), rng = rngDe(977), buf = new Float32Array(N * N);
  const camada = (per) => { const g = new Float32Array(per * per); for (let i = 0; i < g.length; i++) g[i] = rng();
    return (x, y) => { const fx = x * per / N, fy = y * per / N, i = Math.floor(fx), j = Math.floor(fy), i1 = (i + 1) % per, j1 = (j + 1) % per; let u = fx - i, v = fy - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      const a = g[j * per + i], b = g[j * per + i1], c = g[j1 * per + i], e = g[j1 * per + i1]; return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v; }; };
  [[[4, .5], [8, .28], [16, .14], [32, .08]], [[4, .5], [8, .28], [16, .14], [32, .08]], [[64, .55], [128, .45]], [[8, .5], [16, .3], [32, .2]]].forEach((oitavas, k) => {
    const fs = oitavas.map(([per]) => camada(per)); let mn = 1e9, mx = -1e9;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let o = 0; o < fs.length; o++) s += oitavas[o][1] * fs[o](x, y); buf[y * N + x] = s; if (s < mn) mn = s; if (s > mx) mx = s; }
    for (let i = 0; i < N * N; i++) d[i * 4 + k] = Math.round((buf[i] - mn) / (mx - mn) * 255);
  });
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.name = 'hd-ruido'; t.needsUpdate = true; return t;
}

// Depois de subir para a GPU a cópia em JS não serve para nada (ninguém faz raycast nestas malhas).
export function soltaAoSubir(g) { g.computeBoundingSphere(); for (const a of [...Object.values(g.attributes), g.index]) a?.onUpload(function () { this.array = null; }); return g; }
// Malha fundida com cor por vértice: caixas, tubos e panos viram um draw call só.
export function fundidor() {
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
      const c = new THREE.Vector3(x, y + perfil[perfil.length - 1][1], z); for (let i = 0; i < lados; i++) tri(c, ant[(i + 1) % lados], ant[i]);
      return F;
    },
    tris: () => pos.length / 9,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); g.computeVertexNormals(); return soltaAoSubir(g); },
  };
  return F;
}
// Fio de varal: fita virada para a câmera (2 vértices por ponto, abertos no vertex shader), largura real perto e piso
// de 1,5 px longe (tubo de 6 mm a 10 m virava pontilhado). Um draw call, sem luz.
const FIO_PX = 0.75;
function fiador() {
  const pos = [], dir = [], lado = [], cor = [], idx = [], c = new THREE.Color();
  const F = {
    cor(hex, ganho = 1) { c.setHex(hex).multiplyScalar(ganho); return F; },
    fio(pts, r) {
      const b = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], a = pts[Math.max(0, i - 1)], n = pts[Math.min(pts.length - 1, i + 1)];
        for (const s of [-1, 1]) { pos.push(p.x, p.y, p.z); dir.push(n.x - a.x, n.y - a.y, n.z - a.z); lado.push(s * r); cor.push(c.r, c.g, c.b); }
        if (i) { const k = b + i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
      }
      return F;
    },
    n: () => idx.length / 6,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
      g.setAttribute('hdDir', new THREE.Float32BufferAttribute(dir, 3)); g.setAttribute('hdLado', new THREE.Float32BufferAttribute(lado, 1)); g.setIndex(idx); return soltaAoSubir(g); },
  };
  return F;
}
// hdRes = tamanho do buffer de desenho, reposto em onBeforeRender sem alocar (a escada de qualidade muda o pixel ratio).
function materialFio(res) {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, name: 'hd-varal-fio' });
  mat.onBeforeCompile = (s) => { s.uniforms.hdRes = res;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdDir; attribute float hdLado; uniform vec2 hdRes;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 hdC = gl_Position, hdD = projectionMatrix * modelViewMatrix * vec4(transformed + hdDir, 1.0); float hdS = 1.0;
        if (hdD.w < 0.05) { hdD = projectionMatrix * modelViewMatrix * vec4(transformed - hdDir, 1.0); hdS = -1.0; }
        vec2 hdT = hdS * (hdD.xy / max(hdD.w, 0.05) - hdC.xy / max(hdC.w, 0.05)) * hdRes; float hdL = length(hdT);
        hdT = hdL > 1e-4 ? hdT / hdL : vec2(1.0, 0.0);
        float hdPx = max(${FIO_PX.toFixed(2)}, abs(hdLado) * projectionMatrix[1][1] * hdRes.y * 0.5 / max(hdC.w, 0.05));
        gl_Position.xy += vec2(-hdT.y, hdT.x) * sign(hdLado) * hdPx * 2.0 / hdRes * hdC.w; }`); };
  mat.customProgramCacheKey = () => 'hd-varal-fio1';
  return mat;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Junta geometrias numa só (sem índice) com o atributo hdLiso por parte; as normais de cada parte são mantidas.
function juntaGeos(partes) {
  const pos = [], nor = [], liso = [];
  for (const [g, v] of partes) { const ng = g.index ? g.toNonIndexed() : g; const p = ng.attributes.position.array, n = ng.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); } for (let i = 0; i < p.length / 3; i++) liso.push(v); if (ng !== g) ng.dispose(); g.dispose(); }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); r.setAttribute('hdLiso', new THREE.Float32BufferAttribute(liso, 1));
  return r;
}

// Três cristas em anel (perto, meio, fundo), cada uma com altura própria por ângulo; a névoa separa os planos.
// Alturas a 68 % da rodada r6 (céu da pose `laje` de ~12 % para ~19 %, casario visível de novo).
const CRISTAS = [{ r0: 56, rc: 84, h: [13, 20], k: [3, 7, 11], f: 0.7 }, { r0: 88, rc: 128, h: [34, 46], k: [2, 5, 9], f: 2.9 }, { r0: 130, rc: 192, h: [56, 72], k: [1, 4, 6], f: 5.3 }];
const R_FIM = 236;
function alturaMorro(x, z) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x); let h = 0;
  const vale = 1 - .55 * suave(.80, .97, Math.cos(a - 2.2));
  for (const c of CRISTAS) {
    const v = .5 + .5 * (Math.sin(a * c.k[0] + c.f) * .5 + Math.sin(a * c.k[1] + c.f * 2.1) * .3 + Math.sin(a * c.k[2] + c.f * 3.3) * .2);
    const rc = c.rc * (1 + .07 * Math.sin(a * c.k[1] + c.f));
    h = Math.max(h, (c.h[0] + (c.h[1] - c.h[0]) * v) * (c === CRISTAS[2] ? 1 : vale) * suave(c.r0, rc, r) * (1 - .32 * suave(rc, rc + 30, r)));
  }
  return h + (ruido2(x * .05, z * .05) - .5) * 5 * suave(56, 90, r);
}
// Mata fechada: fração da altura da crista do mesmo anel e azimute (só acima de 0,8 do topo; abaixo é casario) e o anel final (serra).
function mata(x, z, h) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x), c = r < 88 ? CRISTAS[0] : r < 130 ? CRISTAS[1] : CRISTAS[2];
  const ref = Math.max(1, alturaMorro(Math.cos(a) * c.rc, Math.sin(a) * c.rc));
  return Math.max(suave(.80, .95, h / ref), suave(196, 226, r));
}
const adensado = (x, z) => ruido2(x / 46 + 3.1, z / 46 + 7.7) * .7 + ruido2(x / 17, z / 17) * .3;

// Névoa própria do morro (mais rala que a do mapa, que lavava o casario em pastel); o material fica com fog: false.
function nevoa(s, U) {
  Object.assign(s.uniforms, U);
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHdD;').replace('#include <project_vertex>', '#include <project_vertex>\nvHdD = length(mvPosition.xyz);');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vHdD; uniform vec3 hdNevoa; uniform float hdNevoaGanho;\n${RUIDO_PARS}`)
    .replace('#include <fog_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, hdNevoa, 1.0 - exp(-vHdD * vHdD * hdNevoaGanho));');
}

function morro(grupo, rng, U, denso = true) {
  const NA = 128, NR = 28, pos = [], cor = [], vila = [], idx = [], c = new THREE.Color(), terra = new THREE.Color(0x3f2d20), mato = new THREE.Color(0x18321a), barro = new THREE.Color(0x4a3426), fechada = new THREE.Color(0x0e2412);
  const vilaDe = denso ? [.36, .50] : [.44, .56], LIM = denso ? .42 : .5;
  for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
    const a = i / NA * Math.PI * 2, r = 56 + (R_FIM - 56) * j / NR, x = Math.cos(a) * r, z = Math.sin(a) * r, h = alturaMorro(x, z), m = denso ? mata(x, z, h) : 0, d = suave(vilaDe[0], vilaDe[1], adensado(x, z)) * (1 - m);
    pos.push(x, j === 0 ? -.4 : h, z); vila.push(d, m);
    c.copy(mato).lerp(terra, suave(.35, .6, ruido2(x / 23 + 9, z / 23))).lerp(barro, d * .7).lerp(fechada, m * .85); cor.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const gT = new THREE.BufferGeometry(); gT.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gT.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  gT.setAttribute('hdVila', new THREE.Float32BufferAttribute(vila, 2)); gT.setIndex(idx); gT.computeVertexNormals();
  const mT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, fog: false, name: 'hd-morro' });
  // Mato em tufo escuro, pouco capim seco (era o que lia como colina bege ao sol) e terra escura onde há vila; hdVila = (vila, mata).
  mT.onBeforeCompile = (s) => { nevoa(s, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 hdVila; varying vec3 vHdM; varying vec2 vHdV;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdM = position; vHdV = hdVila;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdM; varying vec2 vHdV;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec4 hdA = texture2D(hdRuido, vHdM.xz * 0.0125), hdB = texture2D(hdRuido, vHdM.xz * 0.061);
          vec3 hdC = mix(diffuseColor.rgb, vec3(0.19, 0.17, 0.08), 0.35 * smoothstep(0.50, 0.66, hdA.a) * (1.0 - vHdV.y)) * (0.62 + 0.62 * hdB.r);
          hdC = mix(hdC, vec3(0.026, 0.062, 0.020) * (0.5 + 1.0 * hdB.g), smoothstep(0.40, 0.50, hdA.g * 0.7 + hdB.g * 0.3 + 0.25 * vHdV.y) * (1.0 - 0.5 * vHdV.x));
          diffuseColor.rgb = mix(hdC, vec3(0.17, 0.13, 0.09) * (0.65 + 0.7 * hdB.r), 0.55 * vHdV.x * smoothstep(0.48, 0.56, hdA.r));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(0.92, 1.0, 0.84), 0.12); }`);
  };
  mT.customProgramCacheKey = () => 'hd-morro7';
  const terreno = new THREE.Mesh(gT, mT); terreno.name = 'hd-morro'; grupo.add(terreno);

  // Casinhas: grade de 4,6 m (6,4 no modo ralo) com sorteio dentro das manchas adensadas e abaixo da linha da mata; cada célula só recebe uma.
  // Paleta terracota / cimento / branco sujo: tijolo saturado com ganho alto virava pastel rosa atrás da névoa azulada.
  const casas = [], arvores = [], ocupado = new Set(), CEL = denso ? 4.6 : 6.4, NCASAS = denso ? 840 : 440, NTOPO = denso ? 900 : 540, NARV = denso ? 500 : 420, esc = denso ? .85 : 1;
  const TIJOLO = [0x7e4a34, 0x72422c, 0x885238, 0x66392a], CRU = [0x6f685e, 0x7b7469, 0x5c5850], TINTA = [0xa39d90, 0xb0a99b, 0x8e8d84];
  for (let t = 0; t < NCASAS * 32 && casas.length < NCASAS; t++) {
    const a = rng() * Math.PI * 2, r = 60 + Math.pow(rng(), 1.2) * (R_FIM - 68), x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    if (adensado(x0, z0) < LIM) continue;
    const ch = `${Math.round(x0 / CEL)}_${Math.round(z0 / CEL)}`; if (ocupado.has(ch)) continue; ocupado.add(ch);
    const x = Math.round(x0 / CEL) * CEL + (rng() - .5) * 1.6, z = Math.round(z0 / CEL) * CEL + (rng() - .5) * 1.6, y = alturaMorro(x, z), s = rng(), pal = s < .58 ? TIJOLO : s < .86 ? CRU : TINTA;
    if (denso && mata(x, z, y) > .5) continue;
    casas.push({ x, z, y, w: (4.2 + rng() * 2.4) * esc, d: (4.6 + rng() * 2.6) * esc, h: (1 + Math.floor(rng() * rng() * 2.9)) * 2.7 + .4, ry: Math.atan2(-x, -z) + (rng() - .5) * .7,
      cor: pal[Math.floor(rng() * 97) % pal.length], caixa: rng() < (denso ? .85 : .75) });
  }
  // Puxadinho no topo: segunda caixa menor e de outra cor quebra a silhueta de cubo.
  const base = casas.length;
  for (let i = 0; i < base && casas.length < NTOPO; i++) { const k = casas[i]; if (hash2(k.x, k.z + 4) > .3) continue;
    casas.push({ ...k, y: k.y + k.h, w: k.w * (.5 + rng() * .3), d: k.d * (.55 + rng() * .3), h: 2.7, cor: (rng() < .6 ? TIJOLO : CRU)[Math.floor(rng() * 3)], caixa: rng() < .75, x: k.x + (rng() - .5) * 1.2, z: k.z + (rng() - .5) * 1.2, topo: true }); k.caixa = false; }
  // Árvores: quase todas na mata do topo (maiores e mais escuras), ralas entre as casas.
  for (let t = 0; t < NARV * 30 && arvores.length < NARV; t++) {
    const a = rng() * Math.PI * 2, r = 60 + rng() * (R_FIM - 66), x = Math.cos(a) * r, z = Math.sin(a) * r, d = adensado(x, z), y = alturaMorro(x, z), m = denso ? mata(x, z, y) : 0;
    if (rng() > (m > .5 ? 1 : d > LIM ? .14 : suave(LIM, LIM - .2, d) + .3)) continue;
    arvores.push({ x, z, y, s: (1.8 + rng() * 2.4) * (1 + .5 * m), a: rng() * 6.28, m });
  }
  const o = new THREE.Object3D(), cc = new THREE.Color();
  const mC = new THREE.MeshStandardMaterial({ roughness: .95, metalness: 0, fog: false, name: 'hd-morro-casa' });
  // Janela, viga de laje aparente e mancha saem da posição local da caixa em metros (escala da instância).
  // hdLiso por vértice: 0 pinta casa, 1 cor lisa da instância (caixa d'água, antena), 2 copa de mato, 3 concreto de laje e platibanda.
  mC.onBeforeCompile = (s) => { nevoa(s, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdLiso; varying float vHdLiso; varying vec3 vHdC; varying vec3 vHdCN; varying vec2 vHdCI;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 hdE = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vHdC = vec3(position.x * hdE.x, (0.5 - position.y) * hdE.y, position.z * hdE.z); vHdCN = normal; vHdCI = instanceMatrix[3].xz; vHdLiso = hdLiso;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdLiso; varying vec3 vHdC; varying vec3 vHdCN; varying vec2 vHdCI;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vHdLiso < 0.5) { vec3 hdA = abs(vHdCN); vec2 hdI = floor(vHdCI); float hdR = hdH(hdI);
          // Topo: 58 % telha de fibrocimento (cinza claro, onda que some com a distância, lastro escuro), o resto laje de concreto.
          if (hdA.y > 0.5) { vec4 hdN = texture2D(hdRuido, vHdC.xz * 0.19 + hdR * 5.0); float hdFib = step(0.42, hdH(hdI + 2.0));
            float hdOnda = mix(0.5, 0.5 + 0.5 * sin(vHdC.x * 33.0 + hdR * 6.0), smoothstep(0.09, 0.03, fwidth(vHdC.x)));
            vec3 hdLaje = mix(vec3(0.36, 0.35, 0.33), vec3(0.17, 0.16, 0.15), hdN.r) * (0.75 + 0.5 * hdR);
            vec3 hdTelha = vec3(0.62, 0.62, 0.58) * (0.80 + 0.3 * hdN.g) * (0.78 + 0.40 * hdOnda) * (1.0 - 0.4 * smoothstep(0.66, 0.74, hdN.a));
            diffuseColor.rgb = mix(hdLaje, hdTelha, hdFib); }
          else { float hdU = hdA.x > 0.5 ? vHdC.z : vHdC.x; vec2 hdG = vec2(hdU / 2.1 + 0.5, vHdC.y / 2.7), hdF = fract(hdG), hdW = fwidth(hdG) * 1.2;
            vec4 hdN = texture2D(hdRuido, vec2(hdU * 0.21 + hdR * 7.0, vHdC.y * 0.10 + hdR * 3.0));
            float hdJan = smoothstep(0.31 - hdW.x, 0.31 + hdW.x, hdF.x) * smoothstep(0.69 + hdW.x, 0.69 - hdW.x, hdF.x) * smoothstep(0.34 - hdW.y, 0.34 + hdW.y, hdF.y) * smoothstep(0.72 + hdW.y, 0.72 - hdW.y, hdF.y);
            hdJan *= step(0.14, hdH(floor(hdG) + hdI));
            float hdPorta = smoothstep(0.78 - hdW.x, 0.78 + hdW.x, hdF.x) * smoothstep(0.94 + hdW.x, 0.94 - hdW.x, hdF.x) * smoothstep(0.30 - hdW.y, 0.30 + hdW.y, hdF.y) * step(0.6, hdH(floor(hdG) + hdI + 9.0));
            float hdViga = smoothstep(0.11 + hdW.y, 0.11 - hdW.y, hdF.y);
            vec3 hdC = diffuseColor.rgb * (0.66 + 0.52 * hdN.r) * (0.82 + 0.34 * hdH(vec2(floor(hdG.y), 3.0) + hdI));
            hdC = mix(hdC, dot(hdC, vec3(0.3, 0.59, 0.11)) * vec3(0.50, 0.54, 0.46), 0.75 * smoothstep(0.52, 0.78, hdN.g));
            hdC = mix(hdC, vec3(0.34, 0.33, 0.31) * (0.75 + 0.5 * hdN.a), hdViga * 0.9);
            hdC *= 1.0 - 0.55 * (1.0 - hdViga) * smoothstep(0.26 + hdW.y, 0.11, hdF.y);
            hdC = mix(hdC, hdC * 1.5 + 0.03, hdJan * smoothstep(0.69, 0.72, hdF.y));
            diffuseColor.rgb = mix(mix(hdC, vec3(0.05, 0.06, 0.07), hdPorta * 0.85), vec3(0.012, 0.016, 0.020), hdJan * 0.96 * smoothstep(0.72, 0.69, hdF.y)); } }
        else if (vHdLiso > 1.5 && vHdLiso < 2.5) { vec4 hdN = texture2D(hdRuido, (vHdCI + vHdC.xz) * 0.21), hdN2 = texture2D(hdRuido, (vHdCI * 0.3 + vHdC.xz + vHdC.y) * 0.9);
          diffuseColor.rgb *= (0.55 + 0.9 * hdN.g) * mix(0.40, 1.15, 0.5 + 0.5 * vHdCN.y) * (0.82 + 0.36 * hdN2.b);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.35, 0.45, 0.25), smoothstep(0.56, 0.74, hdN2.a)); }
        else if (vHdLiso > 2.5) { vec4 hdN = texture2D(hdRuido, (vHdCI + vHdC.xz + vHdC.y) * 0.3); diffuseColor.rgb = vec3(0.40, 0.39, 0.37) * (0.78 + 0.44 * hdN.r) * (0.85 + 0.3 * hdH(floor(vHdCI))); }`);
  };
  mC.customProgramCacheKey = () => 'hd-morro-casa10';
  // Casa = caixa unitária + laje saliente + platibanda (escala da instância dá 12 cm de platibanda numa casa de 5 m).
  const casaGeo = () => { const partes = [[new THREE.BoxGeometry(1, 1, 1), 0], [new THREE.BoxGeometry(1.06, .035, 1.06).translate(0, .5175, 0), 3]];
    for (const [x, z, w, d] of [[0, -.5175, 1.06, .025], [0, .5175, 1.06, .025], [-.5175, 0, .025, 1.06], [.5175, 0, .025, 1.06]]) partes.push([new THREE.BoxGeometry(w, .07, d).translate(x, .57, z), 3]);
    return juntaGeos(partes); };
  const antenaGeo = () => { const partes = [[new THREE.BoxGeometry(.04, 2.6, .04).translate(0, 1.3, 0), 1], [new THREE.BoxGeometry(.03, .03, 1.1).translate(0, 2.5, .1), 1]];
    for (let i = 0; i < 7; i++) partes.push([new THREE.BoxGeometry(.72 - i * .07, .022, .022).translate(0, 2.49, -.35 + i * .14), 1]);
    return juntaGeos(partes); };
  // Copa de mato: quatro bolhas deformadas (jitter pelo hash da posição original, sem fenda) com normal esférica suave.
  const matoGeo = () => { const partes = [];
    for (const [x, y, z, r, det] of [[0, 0, 0, 1, 1], [.75, -.25, .35, .6, 0], [-.6, -.3, -.45, .55, 0], [.2, -.35, -.8, .5, 0]]) {
      const g = new THREE.IcosahedronGeometry(r, det), p = g.attributes.position, nr = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), j = .8 + hash2(px * 7.1 + x, pz * 5.3 + py * 2.7 + z) * .4;
        const nl = Math.hypot(px, py * 1.25, pz) || 1; p.setXYZ(i, px * j + x, py * j * .8 + y, pz * j + z); nr.setXYZ(i, px / nl, py * 1.25 / nl, pz / nl); }
      partes.push([g, 2]); }
    return juntaGeos(partes); };
  const iC = new THREE.InstancedMesh(casaGeo(), mC, casas.length); iC.name = 'hd-morro-casas';
  const comCaixa = casas.filter((k) => k.caixa && hash2(k.x + 7, k.z) < (denso ? .72 : .6)), comAntena = casas.filter((k) => hash2(k.x + 3, k.z) < .42);
  const iX = new THREE.InstancedMesh(juntaGeos([[new THREE.CylinderGeometry(.5, .45, 1, 8), 1]]), mC, comCaixa.length); iX.name = 'hd-morro-caixas';
  const iN = new THREE.InstancedMesh(antenaGeo(), mC, comAntena.length); iN.name = 'hd-morro-antenas';
  casas.forEach((k, i) => { const af = k.topo ? 0 : 3.2; o.position.set(k.x, k.y + k.h / 2 - af / 2, k.z); o.rotation.set(0, k.ry, 0); o.scale.set(k.w, k.h + af, k.d); o.updateMatrix(); iC.setMatrixAt(i, o.matrix); iC.setColorAt(i, cc.setHex(k.cor).multiplyScalar(.85 + hash2(k.x, k.z) * .3)); });
  // Caixa d'água 1,4x (lê a 1 200 px de longe): 62 % azul de polietileno saturado, 22 % cinza (fibrocimento), o resto preta.
  comCaixa.forEach((k, i) => { const g = (.85 + hash2(k.z, k.x + 9) * .5) * 1.4; o.position.set(k.x + Math.sin(k.ry) * k.d * .2, k.y + k.h + .5 * g + .05, k.z + Math.cos(k.ry) * k.d * .2); o.rotation.set(0, k.ry, 0); o.scale.set(1.3 * g, 1.0 * g, 1.3 * g); o.updateMatrix(); iX.setMatrixAt(i, o.matrix);
    const hx = hash2(k.z, k.x + 2); iX.setColorAt(i, cc.setHex(hx < .62 ? 0x2a5aa0 : hx < .84 ? 0x8f928d : 0x1c1d20)); });
  comAntena.forEach((k, i) => { const cs = Math.cos(k.ry), sn = Math.sin(k.ry), u = (hash2(k.x, k.z + 5) - .5) * .7 * k.w, v = (hash2(k.z, k.x + 8) < .5 ? -1 : 1) * .36 * k.d;
    o.position.set(k.x + u * cs + v * sn, k.y + k.h + .05, k.z - u * sn + v * cs); o.rotation.set(0, k.ry + (hash2(k.x + 1, k.z) - .5) * 1.2, 0); o.scale.setScalar(.8 + hash2(k.x + 2, k.z) * .5); o.updateMatrix(); iN.setMatrixAt(i, o.matrix);
    iN.setColorAt(i, cc.setHex(0x6f7275).multiplyScalar(.8 + hash2(k.x, k.z + 4) * .4)); });
  const iA = new THREE.InstancedMesh(matoGeo(), mC, arvores.length); iA.name = 'hd-morro-mato';
  arvores.forEach((k, i) => { o.position.set(k.x, k.y + k.s * .25, k.z); o.rotation.set(0, k.a, 0); o.scale.set(k.s * (1 + hash2(k.x, 1) * .5), k.s * (.55 + hash2(k.z, 2) * .3), k.s * (1 + hash2(k.x, k.z) * .5)); o.updateMatrix(); iA.setMatrixAt(i, o.matrix);
    iA.setColorAt(i, cc.setHex([0x16301a, 0x1e3d1c, 0x2a4a22][Math.floor(hash2(k.z, k.x) * 2.999)]).multiplyScalar((.7 + hash2(k.x, 5) * .5) * (1 - .3 * k.m))); });
  for (const im of [iC, iX, iN, iA]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; grupo.add(im); }
  terreno.frustumCulled = false;
}
// O morro liso do mapa (anel de 72 a 285 m) ficaria na frente do casario: sai de cena enquanto este estiver ligado.
function escondeMorroVelho(scene) {
  const o = scene.getObjectByName('LAJES_MORRO_BACKDROP'); if (!o || !o.visible) return () => {};
  o.visible = false; return () => { o.visible = true; };
}

// Cúpula de céu: gradiente, halo do sol, cúmulos lidos da textura de ruído e serra lisa no horizonte.
export function ceuLajes(scene, sol, U, { nuvens = true, raio = 100 } = {}) {
  const nev = scene.fog?.color || new THREE.Color(0xb7c4cb);
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, name: 'hd-ceu',
    uniforms: { hdRuido: U.hdRuido, uH: { value: nev }, uSol: { value: sol.clone().normalize() }, uNuvem: { value: nuvens ? 1 : 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform sampler2D hdRuido; uniform vec3 uH, uSol; uniform float uNuvem;
      void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0), s = max(dot(d, uSol), 0.0);
        vec3 c = mix(uH * 0.84, vec3(0.045, 0.16, 0.52), pow(y, 0.42)) + vec3(1.0, 0.86, 0.66) * (pow(s, 5.0) * 0.04 + pow(s, 200.0) * 0.8);
        vec2 p = d.xz / (d.y + 0.40);
        float f = texture2D(hdRuido, p * 0.21 + 0.63).r * 0.60 + texture2D(hdRuido, p * 0.77 + 0.4).g * 0.28 + texture2D(hdRuido, p * 2.6).a * 0.12;
        float n = smoothstep(0.555, 0.61, f) * smoothstep(0.012, 0.05, d.y) * uNuvem, miolo = smoothstep(0.56, 0.82, f);
        vec3 nu = mix(vec3(0.74, 0.75, 0.76), vec3(0.40, 0.45, 0.56), miolo * 0.8) * (1.0 - 0.25 * pow(s, 3.0));
        c = mix(c, nu, n);
        float a = atan(d.z, d.x), h = 0.050 + 0.020 * sin(a * 3.0 + 1.0) + 0.012 * sin(a * 7.0 + 2.3) + 0.006 * sin(a * 17.0);
        c = mix(c, mix(uH * 0.84, vec3(0.10, 0.16, 0.22), 0.45), smoothstep(h, h - 0.004, d.y));
        if (d.y < 0.0) c = uH * 0.78;
        gl_FragColor = vec4(c, 1.0); }` });
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(raio, 32, 16), mat);
  cupula.name = 'hd-ceu'; cupula.renderOrder = -1000; cupula.frustumCulled = false; cupula.castShadow = false;
  cupula.onBeforeRender = (r, sc, camera) => { cupula.position.copy(camera.position); cupula.scale.setScalar(camera.far * .9 / raio); cupula.updateMatrixWorld(); };
  const ocultas = []; scene.traverse((o) => { if (o.isMesh && /SKY_DOME/i.test(o.name) && o.visible) { o.visible = false; ocultas.push(o); } });
  scene.add(cupula);
  return () => { scene.remove(cupula); cupula.geometry.dispose(); mat.dispose(); for (const o of ocultas) o.visible = true; };
}

// Topo real do telhado em (x, z): a malha da casa nem sempre fecha com o colisor. Abaixo de TETO_MIN = não usa.
function medidorDeTopo(scene, mundo) {
  const alvos = [], raio = new THREE.Raycaster(), de = new THREE.Vector3(), baixo = new THREE.Vector3(0, -1, 0), cols = mundo?.colliders || [];
  const fora = (o) => { for (let p = o; p; p = p.parent) if (/SKY|PIPA|AMBIENT|hd-|HELI|DUMONT/i.test(p.name || '')) return true; return false; };
  scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && o.visible && !fora(o)) alvos.push(o); });
  return (x, z) => {
    let col = -1; for (const c of cols) if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && c.maxY > col) col = c.maxY;
    if (col < TETO_MIN) return null;
    raio.set(de.set(x, col + 2.5, z), baixo); raio.far = col + 2.5 - TETO_MIN;
    let hit = null; try { hit = raio.intersectObjects(alvos, false)[0]; } catch (e) { hit = null; }
    return hit ? hit.point.y : col;
  };
}

const ESCURO = 0x0b0b0d, FERRO = 0x26221f;
// Feixes de cabo em catenária entre topos de casa. [ax, az, bx, bz, cabos, gato]
const FEIXES = [[-1.6, -18, 1.6, -13, 4, 1], [1.6, -17, -1.6, -10, 3, 0], [-1.6, 11, 1.6, 16, 5, 0], [1.6, 10, -1.6, 18.5, 3, 1],
  [-3.5, -9.1, -2.5, 9.1, 4, 1], [3, -9.1, 4, 9.1, 3, 0], [-4.5, -9.1, 4.5, 9.1, 2, 0], [-1.35, -8.8, -1.3, 8.8, 3, 0], [1.3, -8.8, 1.4, 8.8, 4, 0],
  [-15.5, -18.5, -4.7, -18.5, 4, 1], [-15.5, -16, -4.7, -17.5, 2, 0], [-15.5, 17.5, -4.7, 18.5, 5, 0], [-15.5, 15.5, -4.7, 17, 2, 1],
  [15.5, -17.5, 4.7, -18.5, 4, 1], [15.5, -15.5, 4.7, -17, 2, 0], [15.5, 18, 4.7, 18.5, 3, 1], [15.5, 15.5, 4.7, 17, 4, 0], [-9, -28.6, -4, -25.4, 3, 0],
  [-15.6, -15, -15.9, -3, 4, 0], [-15.6, 3, -15.9, 14, 3, 1], [15.6, -15, 15.9, -3, 3, 1], [15.6, 3, 15.9, 14, 4, 0], [4, -25.4, 9, -28.6, 3, 1]];
// Cabo que passa a menos de 4,2 m de uma bandeira cruza o objetivo na tela de quem está na laje: não entra.
const LIVRE_BANDEIRA = 4.2;
function pertoDeBandeira(ax, az, bx, bz, pontos) {
  for (const p of pontos || []) { const dx = bx - ax, dz = bz - az, t = Math.min(1, Math.max(0, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(ax + dx * t - p.x, az + dz * t - p.z) < LIVRE_BANDEIRA) return true; }
  return false;
}
const catenaria = (A, B, barriga, piso, n = 10) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = new THREE.Vector3().lerpVectors(A, B, t); p.y = Math.max(piso, p.y - barriga * 4 * t * (1 - t)); pts.push(p); } return pts; };

// Becos centrais (x de -1 a 1, |z| de 8,5 a 26, paredes de 6,1 m): fio de parede a parede, feixe corrido junto
// à fachada e varal alto. Tudo acima de BECO_MIN; `s` espelha para o beco do outro lado.
// Roupa lavada e desbotada ([cor, listra]; S ≤ 0,22, luminância linear ≥ 0,39 para aguentar o ganho 0,9): nada saturado nem escuro na faixa do corpo.
const PANOS = [[0xd8d4c8, 0xc4c0b4], [0xcfc3aa, 0xbdb29b], [0xa9b4bc, 0xa0acb4], [0xd4b5b0, 0xc4a8a3], [0xb3cbc0, 0xa2bbb0], [0xbdbdb6, 0xadada6], [0xd4cda8, 0xc4bd9a], [0xa8b6a3, 0xa2ae9e]];
const JEANS = [0xa7b0b8, 0xa2abb3];
// Peças [largura, altura] em metros: 0 camisa de manga curta, 1 calça, 2 toalha dobrada na corda, 3 lençol (um só, em telhado), 4 pano de prato.
const PECAS = [[.55, .70], [.40, .95], [.60, .55], [1.40, 1.20], [.30, .40]];
// Peça pendurada: malha 4–8 x 3–5 com barriga de vento, caimento e barra ondulada (normal por face dá o sombreado real);
// listra por quad lê como toalha/camisa; `dobra` = pendurada pela metade na corda (altura 0,55). Pregador em cada ponta.
function pano(F, rng, cx, y, cz, dx, dz, forma, [cor, cor2], dobra = false) {
  const [w, h0] = PECAS[forma], h = dobra ? h0 * .55 : h0, nx = -dz, nz = dx, vai = (rng() - .5) * .08, ond = .018 + rng() * .022, fase = rng() * 6.28, bojo = (.06 + rng() * .07) * (rng() < .5 ? 1 : -1), g = .9 + rng() * .2, s = rng();
  const P = (u, v) => { const vb = Math.min(1, v), d = vai * v + ond * Math.sin(u * 9 + fase) * (.2 + v) + bojo * Math.sin(Math.PI * vb) * (1 - Math.min(1, Math.abs(u) * 1.5)) + .01 * v * Math.sin(u * 21 + fase * 2);
    return V(cx + dx * u * w + nx * d, y - v * h * (1 + .04 * Math.sin(u * 6 + fase)), cz + dz * u * w + nz * d); };
  const faixa = (u0, u1, v0, v1, n, nv, listra = null) => { for (let k = 0; k < n; k++) for (let j = 0; j < nv; j++) { const a = u0 + (u1 - u0) * k / n, b = u0 + (u1 - u0) * (k + 1) / n, c = v0 + (v1 - v0) * j / nv, e = v0 + (v1 - v0) * (j + 1) / nv;
    if (listra) F.cor(listra(k, j) ? cor2 : cor, g); F.quad(P(a, c), P(b, c), P(b, e), P(a, e)); } };
  F.cor(cor, g);
  if (forma === 0 && !dobra) { const li = s < .4 ? (k, j) => j === 1 : null, lin = [.05, .40, .70, 1];
    // Manga curta na mesma malha do corpo (aresta u = ±0,34 compartilhada); as cavas (mangas) só existem na primeira fileira.
    for (let k = -1; k < 5; k++) for (let j = 0; j < 3; j++) { const manga = k < 0 || k > 3; if (manga && j) continue;
      const a = manga ? (k < 0 ? -.34 : .34) : -.34 + .17 * k, b = manga ? (k < 0 ? -.55 : .55) : a + .17, c = lin[j], e = lin[j + 1];
      if (li) F.cor(li(k, j) ? cor2 : cor, g);
      if (manga) F.quad(P(a, c), P(b * .95, c + .03), P(b, e), P(a, e)); else F.quad(P(a, c), P(b, c), P(b, e), P(a, e)); }
    F.cor(cor, g).quad(P(-.34, 0), P(-.12, 0), P(-.12, .05), P(-.34, .05)).quad(P(.12, 0), P(.34, 0), P(.34, .05), P(.12, .05)); }
  else if (forma === 0) faixa(-.34, .34, 0, 1, 4, 3, s < .4 ? (k, j) => j === 2 : null);
  else if (forma === 1) { if (!dobra) faixa(-.5, .5, 0, .16, 3, 1); for (const m of [-1, 1]) faixa(m * .05, m * .5, dobra ? 0 : .16, 1, 2, dobra ? 3 : 4); }
  else if (forma === 2) faixa(-.5, .5, 0, 1, 4, 5, (k, j) => j === 4 || (s < .5 && j === 3));
  else if (forma === 3) faixa(-.5, .5, 0, 1, 8, 5);
  else faixa(-.5, .5, 0, 1, 3, 3, s < .5 ? (k) => k === 1 : null);
  const pr = [.30, .42, .44, .46, .40][forma]; F.cor(s < .5 ? 0xc9c0a8 : 0x9fb0be, .95);
  for (const u of [-pr, pr]) F.caixa(cx + dx * u * w, y - .025, cz + dz * u * w, .014, .05, .012);
}
// Corda: fita de 1,5 px (FR) quando há fiador; sem ele, tubo de 1 cm. Peças em sequência (camisa, calça, toalha) só onde cabem
// acima de `piso`: o que não cabe inteiro vai dobrado na corda; a calça vai sempre dobrada (0,4 x 0,52); `lencol` abre a corda com o único lençol do kit.
function varal(F, rng, x0, z0, x1, z1, y, FR = null, piso = BECO_MIN, lencol = false) {
  const A = V(x0, y, z0), B = V(x1, y, z1), L = A.distanceTo(B), dx = (x1 - x0) / L, dz = (z1 - z0) / L, barriga = .13, alt = (t) => y - barriga * 4 * t * (1 - t), fio = catenaria(A, B, barriga, piso + .6);
  if (FR) FR.cor(0xa89f8a).fio(fio, .003); else F.cor(0x1c1b1a).tubo(fio, .005, 3);
  let s = .14 + rng() * .1, n = 0, forma = lencol ? 3 : Math.floor(rng() * 3);
  while (s < L - .25) {
    const [w, h0] = PECAS[forma]; if (s + w > L - .1) break;
    const t = (s + w / 2) / L, yy = alt(t) - .012, livre = yy - piso, dobra = forma === 1 || (forma !== 3 && h0 > livre);
    if (forma !== 3 || h0 <= livre) { pano(F, rng, x0 + dx * (s + w / 2), yy, z0 + dz * (s + w / 2), dx, dz, forma, forma === 1 ? JEANS : PANOS[Math.floor(rng() * PANOS.length)], dobra); n++; s += w + .05 + rng() * .12; }
    else s += .2;
    forma = (forma + 1 + Math.floor(rng() * 2)) % 3;
  }
  return n;
}
function beco(F, rng, s, FR) {
  const X = .94; let panos = 0;
  for (const [z, y0, y1, n] of [[9.1, 5.5, 4.9, 2], [10.2, 4.3, 5.2, 3], [11.6, 5.7, 5.3, 2], [13.1, 4.6, 4.2, 2], [15.4, 5.1, 5.6, 3], [18.2, 4.4, 4.9, 2], [21.5, 5.4, 4.7, 3], [24.3, 4.5, 5.0, 2]])
    for (let k = 0; k < n; k++) F.cor(ESCURO).tubo(catenaria(V(-X, y0 + k * .09, s * (z + k * .07)), V(X, y1 + k * .11, s * (z + .5 - k * .05)), .10 + rng() * .14, BECO_MIN + .15), .006 + rng() * .004, 3);
  for (const [lado, y, n] of [[-1, 4.25, 3], [1, 4.75, 2], [-1, 5.45, 2]]) for (let k = 0; k < n; k++) {
    const pts = []; for (let z = 8.6; z <= 25.9; z += .62) pts.push(V(lado * (X - .03 * k), y + k * .08 - .07 * Math.abs(Math.sin((z - 8.6) * Math.PI / 3.1 + k)), s * z));
    F.cor(k ? ESCURO : 0x17181a).tubo(pts, .008, 3);
    for (let z = 8.6; z <= 25.9; z += 3.1) F.cor(FERRO).caixa(lado * (X + .02), y - .05, s * z, .05, .22, .05);
  }
  // Rente à parede (até 7 cm de saliência) o feixe pode descer até 2,4 m: passa por cima dos toldos das portas.
  for (const [lado, y, n] of [[1, 2.50, 3], [-1, 2.66, 2], [1, 3.27, 2], [-1, 3.42, 3]]) for (let k = 0; k < n; k++) {
    const pts = []; for (let z = 8.6; z <= 25.9; z += .5) pts.push(V(lado * (X + .015 - .012 * k), y + k * .055 - (.05 + .03 * k) * Math.abs(Math.sin((z - 8.6) * Math.PI / 2.6 + k * .7)), s * z));
    F.cor(k === 1 ? 0x23262b : ESCURO).tubo(pts, .009, 3);
    for (let z = 8.6; z <= 25.9; z += 2.6) F.cor(0x55524c).caixa(lado * (X + .03), y - .04, s * z, .04, .16 + n * .04, .05);
  }
  for (const [lado, z, y] of [[1, 10.4, 3.27], [1, 15.6, 3.27], [-1, 13.0, 3.42], [-1, 20.8, 3.42], [1, 23.4, 3.27]]) for (let k = 0; k < 3; k++) {
    const pts = [], r0 = .16 + rng() * .1; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; pts.push(V(lado * (X + .01), y - Math.sin(a) * (r0 * 2.2 + k * .09), s * (z - r0 + i / 10 * r0 * 2 + k * .05))); }
    F.cor(ESCURO).tubo(pts, .008, 3);
  }
  for (const [z0, z1, y] of [[8.75, 9.25, 4.46], [10.3, 9.7, 4.40], [12.0, 12.7, 4.7], [15.0, 15.6, 4.85]]) panos += varal(F, rng, -X - .02, s * z0, X + .02, s * z1, y, FR);
  // Caixa de passagem e medidor no alto da fachada, com o feixe descendo até ela.
  for (const [lado, z, y] of [[-1, 12.4, 4.0], [1, 16.8, 4.2], [-1, 22.6, 3.95]]) F.cor(0x6a6c69).caixa(lado * (X + .01), y, s * z, .09, .34, .26).cor(ESCURO).tubo([V(lado * X, y + .34, s * z), V(lado * X, 4.3 + (lado > 0 ? .5 : 0), s * z)], .012, 3);
  // Tubo de queda de esgoto (PVC marrom de 7,5 cm) na junta entre casas, abraçadeira a cada 1,2 m e curva no pé: 8 cm de saliência, sem colisão. Só no quadro da pose `beco`.
  for (const [lado, z] of [[-1, 14.0], [1, 11.4], [-1, 19.3], [1, 22.0]]) { const x = lado * (X + .04); if (!noQuadro(x, s * z, [0])) continue;
    F.cor(0x5a3d2c, .9 + rng() * .2).tubo([V(x, .25, s * z), V(x, 5.9, s * z)], .037, 6).tubo([V(x, .25, s * z), V(x, .10, s * (z + .18))], .037, 5);
    for (let yy = .7; yy < 5.8; yy += 1.2) F.cor(0x6f7271).caixa(lado * (X + .02), yy, s * z, .05, .035, .11); }
  return panos;
}
// Relógio de luz (11 cm de saliência) com visor, tampa, eletroduto até o beiral e descida até o piso.
function relogio(F, rng, x, n, y, z, topo, evita) {
  const xm = x + n * .03; evita.push([x, y + .2, z], [x, (y + topo) / 2, z], [x, topo - .5, z]);
  F.cor(0x8a8d8c, .9 + rng() * .2).caixa(xm, y, z, .11, .42, .3).cor(0x1b1d1e).caixa(x + n * .09, y + .2, z, .012, .14, .16).cor(0x6f7271).caixa(xm, y + .42, z, .13, .03, .34)
    .cor(0x767978).tubo([V(xm, y + .44, z - .08), V(xm, topo, z - .08)], .016, 4).tubo([V(xm, y, z + .07), V(xm, Math.max(.08, y - 1.2), z + .07)], .013, 4);
  // Braçadeira de eletroduto a cada 60 cm: sem ela o tubo lia como decalque na parede.
  for (let yy = y + .95; yy < topo - .25; yy += .6) F.cor(0x7c7f7e).caixa(x + n * .025, yy, z - .08, .036, .03, .05);
  return xm;
}
function fios(grupo, rng, topo, mundo, mat, evita, FR) {
  const F = fundidor(); let feixes = 0;
  const poste = (x, y, z, h, ry) => { F.cor(0x3a3531).caixa(x, y - .3, z, .05, h + .3, .05, ry).cor(FERRO).caixa(x, y + h - .3, z, .12, .12, .08, ry); };
  for (const [ax, az, bx, bz, n, gato] of FEIXES) {
    if (pertoDeBandeira(ax, az, bx, bz, mundo?.ctfPoints)) continue;
    const ya = topo(ax, az), yb = topo(bx, bz); if (ya === null || yb === null) continue;
    const ha = 3.0 + rng() * .6, hb = 3.0 + rng() * .6, vao = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
    poste(ax, ya, az, ha, ry); poste(bx, yb, bz, hb, ry); feixes++;
    const px = (bz - az) / vao, pz = -(bx - ax) / vao;
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * .11, A = V(ax + px * off, ya + ha - .2 - (k % 2) * .13, az + pz * off), B = V(bx + px * off, yb + hb - .2 - ((k + 1) % 2) * .13, bz + pz * off);
      F.cor(ESCURO).tubo(catenaria(A, B, Math.max(0, Math.min(vao * (.03 + rng() * .03), Math.min(A.y, B.y) - CABO_MIN)), CABO_MIN, Math.max(8, Math.round(vao * .9))), .006 + rng() * .004, 3);
    }
    if (gato) {
      const c = V(ax, ya + ha - .25, az);
      for (let k = 0; k < 5; k++) {
        const pts = [], a0 = rng() * 6.28, r0 = .09 + rng() * .05, cai = .08 + k * .05;
        for (let i = 0; i <= 12; i++) { const a = a0 + i / 12 * 6.28 * 1.1; pts.push(V(c.x + px * (.07 + r0 * .15) + pz * Math.cos(a) * r0, Math.max(CABO_MIN, c.y - cai + Math.sin(a) * r0 * 1.25), c.z + pz * (.07 + r0 * .15) - px * Math.cos(a) * r0)); }
        F.cor(ESCURO).tubo(pts, .007 + rng() * .003, 3);
      }
      F.cor(FERRO).caixa(c.x, c.y - .42, c.z, .26, .34, .2, ry);
    }
  }
  const cols = mundo?.colliders || [];
  // Ponta dos fios autorais poste -> casa (±12,9; 2,8; z = -17 + 6k) acabava no ar: roldana na parede, descida e relógio no térreo do beco lateral.
  const temParede = (x, z) => cols.some((c) => c.casa && Math.abs((x > 0 ? c.maxX : c.minX) - x) < .15 && z > c.minZ && z < c.maxZ && c.maxY > 2.9);
  for (const side of [-1, 1]) for (let k = 0; k < 6; k++) { const z = -17 + k * 6, x = side * 12.8; if (!temParede(x, z)) continue;
    const yr = 1.3 + rng() * .3, xm = relogio(F, rng, x, side, yr, z + .1, 2.6, evita), xc = xm + side * .02, yt = yr + .42;
    F.cor(0xd8d5ca).caixa(x + side * .04, 2.72, z, .07, .12, .07);
    // Feixe de 3 cabos (3–4,5 mm) da roldana ao relógio, abraçadeira a cada 1 m na descida (antes: um traço solto).
    for (let k = 0; k < 3; k++) { const dz = (k - 1) * .013; F.cor(k === 1 ? 0x23262b : ESCURO).tubo([V(side * 12.9, 2.8, z + dz), V(x + side * .09, 2.76, z + dz), V(xc, 2.6, z + .02 + dz), V(xc, yt, z + .02 + dz)], .0045 - k * .0005, 3); }
    for (let yy = 2.35; yy > yt + .2; yy -= 1.0) F.cor(0x7c7f7e).caixa(xm + side * .008, yy, z + .02, .03, .03, .06); }
  // Postes autorais (±14,8; z = -26,15, 0, 26,15): caixa de passagem, caixa de telefonia, eletroduto, isoladores sob a cruzeta e gato enrolado.
  for (const side of [-1, 1]) for (const z of [-26.15, 0, 26.15]) { const x = side * 14.8;
    if (!cols.some((c) => Math.abs(c.minX + c.maxX - 2 * x) < .3 && Math.abs(c.minZ + c.maxZ - 2 * z) < .3 && c.maxY > 6)) continue;
    const xi = x - side * .09, xf = xi - side * .03;
    F.cor(0x6a6c69).caixa(xi - side * .06, 1.45, z, .12, .32, .24).cor(0x1b1d1e).caixa(xi - side * .125, 1.6, z + .04, .01, .1, .12).cor(0x5d6166).caixa(xi - side * .07, 2.9, z + .05, .14, .36, .28)
      .cor(0x8d9290).tubo([V(xf, 1.77, z - .05), V(xf, 6.1, z - .05)], .016, 4).tubo([V(xf, 3.26, z + .06), V(xf, 5.6, z + .06)], .013, 4);
    for (const off of [-.35, .35]) F.cor(0xd8d5ca).torno(x + off, 6.13, z, [[.03, 0], [.042, .04], [.03, .08], [.034, .12]], 6);
    for (let k = 0; k < 2; k++) { const pts = [], r0 = .10 + k * .03; for (let i = 0; i <= 12; i++) { const a = i / 12 * 6.28 * 1.15; pts.push(V(x - side * (.13 + .02 * k), 5.55 - k * .08 + Math.sin(a) * r0, z + .14 + Math.cos(a) * r0)); } F.cor(ESCURO).tubo(pts, .007, 3); }
    F.cor(ESCURO).tubo([V(x - side * .13, 5.65, z + .14), V(xf, 6.1, z - .05)], .006, 3); }
  const paredes = cols.some((c) => Math.abs(c.maxX + 1) < .05 && c.maxY > 6 && c.minZ < 10 && c.maxZ > 13);
  const panos = paredes ? beco(F, rng, 1, FR) + beco(F, rng, -1, FR) : 0;
  if (!F.tris()) return { tris: 0, panos };
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-fios';
  grupo.add(malha); return { tris: F.tris(), panos };
}

function antena(F, x, y, z, rng) {
  const h = 2.1 + rng() * 1.3, ry = rng() * 6.28, cs = Math.cos(ry), sn = Math.sin(ry);
  F.cor(0x6f7275).caixa(x, y, z, .045, h, .045, ry).caixa(x + sn * .15, y + h - .12, z + cs * .15, .03, .03, 1.15, ry);
  for (let i = 0; i < 8; i++) { const t = -.38 + i * .135; F.caixa(x + sn * (.15 + t), y + h - .105, z + cs * (.15 + t), .78 - i * .06, .022, .022, ry); }
  F.cor(0x34302c).caixa(x, y, z, .22, .12, .22, ry);
}
// Prato da parabólica (paraboloide de 10 x 3 faces) com braço e LNB, centrado em `c`.
function prato(F, c, ry, R, el = .7) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-el, ry, 0, 'YXZ'));
  const P = (i, j) => { const r = R * j / 3, a = i / 10 * Math.PI * 2; return V(Math.cos(a) * r, Math.sin(a) * r, -(r * r) / (R * 2.4)).applyMatrix4(m).add(c); };
  F.cor(0x8d8f8c);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 10; i++) { if (j === 0) F.tri(P(0, 0), P(i, 1), P(i + 1, 1)); else F.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)); }
  const foco = V(0, 0, R * .55).applyMatrix4(m).add(c);
  F.cor(0x3a3c3e).tubo([P(2.5, 3), foco], .012, 3).tubo([P(7.5, 3), foco], .012, 3).caixa(foco.x, foco.y - .05, foco.z, .09, .1, .09, ry);
}
function parabolica(F, x, y, z, rng, R0 = 0) {
  const R = R0 || .5 + rng() * .32, h = .3 + rng() * .25, ry = rng() * 6.28;
  F.cor(0x55585a).caixa(x, y, z, .11, h + R * .6, .11, ry).cor(0x6b675f).caixa(x, y - .04, z, .5, .14, .5, ry)
    .cor(0x4a4c4e).tubo([V(x + Math.sin(ry) * .3, y + .05, z + Math.cos(ry) * .3), V(x, y + h + R * .3, z)], .02, 3);
  prato(F, V(x, y + h + R * .62, z), ry, R);
}
function esperas(F, x, y, z, rng) {
  F.cor(0x6e6a62).caixa(x, y - .1, z, .24, .32 + rng() * .25, .24, 0);
  for (let i = 0; i < 4; i++) { const dx = (i & 1 ? .08 : -.08), dz = (i & 2 ? .08 : -.08), h = .6 + rng() * .6;
    F.cor(0x3a2219).tubo([V(x + dx, y, z + dz), V(x + dx + (rng() - .5) * .05, y + h * .6, z + dz + (rng() - .5) * .05), V(x + dx + (rng() - .5) * .16, y + h, z + dz + (rng() - .5) * .16)], .011, 3); }
}
function pilha(F, x, y, z, rng) {
  const ry = rng() * 6.28, n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) F.cor([0x7c4a31, 0x8a5236, 0x6f432e][i % 3], .9 + rng() * .2).caixa(x + (rng() - .5) * .06, y + i * .2, z + (rng() - .5) * .06, 1.15 - (i === n - 1 ? .38 : 0), .19, .58, ry + (rng() - .5) * .05);
  F.cor(0x77736a).caixa(x + Math.cos(ry) * 1.0, y, z - Math.sin(ry) * 1.0, .5, .32, .36, ry + .4);
}
function puxadinho(F, x, y, z, rng, ry) {
  const w = 2.5 + rng() * .8, d = 2.1 + rng() * .5, h = 2.0 + rng() * .3, cs = Math.cos(ry), sn = Math.sin(ry);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) F.cor(0x3b2c20).caixa(x + (a * w * .46) * cs + (b * d * .44) * sn, y, z - (a * w * .46) * sn + (b * d * .44) * cs, .085, h + (b > 0 ? .28 : 0), .085, ry);
  F.cor(0x74736c).caixa(x, y + h + .1, z, w + .4, .035, d + .5, ry, .13).cor(0x64635d).caixa(x, y + h + .13, z, w + .1, .035, d * .5, ry + .03, .13);
  F.cor(0x7a4a33).caixa(x - (d * .44) * sn, y, z - (d * .44) * cs, w * .9, .8 + rng() * .5, .14, ry);
}

// Tanque de lavar de concreto com batedor e botijão ao lado (só em telhado inalcançável).
function lavar(F, x, y, z, rng, ry) {
  const cs = Math.cos(ry), sn = Math.sin(ry);
  for (const a of [-.24, .24]) F.cor(0x7c7b76).caixa(x + a * cs, y, z - a * sn, .1, .52, .46, ry);
  F.cor(0x9a9993).caixa(x, y + .52, z, .64, .3, .52, ry).cor(0x595b5c).caixa(x, y + .78, z, .52, .045, .4, ry).cor(0x8b8a84).caixa(x, y + .6, z, .58, .035, .34, ry, .5);
  const bx = x + .62 * cs + .1 * sn, bz = z - .62 * sn + .1 * cs, cor = rng() < .5 ? 0x3c5f9a : 0x9aa0a4, pts = (r, y0, y1) => [V(bx, y + y0, bz), V(bx, y + y1, bz)];
  F.cor(cor).tubo(pts(.16, .04, .44), .16, 8).tubo(pts(.11, .44, .52), .11, 8).cor(0x2c2e30).tubo(pts(.14, 0, .05), .14, 6).tubo(pts(.1, .52, .62), .1, 6);
}
// Torre de tijolo baiano: fiadas de 19 cm com junta de argamassa recuada e tom por fiada; `tijolos` recorta cada tijolo (26 cm,
// amarração corrida) em placa 1 cm à frente do miolo de argamassa — só nas torres vistas de perto (ry tem de ser 0).
function torreTijolo(F, x, y, z, w, h, rng, tijolos = false, ry = 0) {
  const n = Math.max(1, Math.round(h / .193)), fh = h / n, cores = [0x87604f, 0x7c5646, 0x90675a, 0x80594b];
  if (tijolos) F.cor(0x8d8a82, .95).caixa(x, y, z, w - .02, h, w - .02, 0);
  for (let i = 0; i < n; i++) { const yb = y + i * fh;
    if (!tijolos) { F.cor(0x8d8a82, .9).caixa(x, yb, z, w - .024, .012, w - .024, ry).cor(cores[Math.floor(rng() * 4)], .9 + rng() * .2).caixa(x, yb + .012, z, w, fh - .012, w, ry); continue; }
    for (let f = 0; f < 4; f++) for (let b = -w / 2, len = i % 2 ? .135 : .27; b < w / 2 - .02; b += len, len = .27) { const e = Math.min(b + len - .01, w / 2), c = (b + e) / 2;
      F.cor(cores[Math.floor(rng() * 4)], .88 + rng() * .24);
      if (f < 2) F.caixa(x + (f ? -1 : 1) * (w / 2 - .01), yb + .012, z + c, .02, fh - .012, e - b); else F.caixa(x + c, yb + .012, z + (f === 2 ? 1 : -1) * (w / 2 - .01), e - b, fh - .012, .02); } }
}
// Caixa d'água de polietileno azul (500 ou 1000 L) com tampa, sobre torre de tijolo ou direto na laje; `lados` 24 nas vistas de perto.
// Azul menos saturado (0x1a5cb4 virava chapado no AgX), entrada com boia por cima e saída de PVC; `cor` cinza = fibrocimento (sem nervura, tampa chata).
// A torre é sempre de tijolo recortado (fiada de 19 cm = tijolo da parede): a fiada lisa de 1,2 m lia como tijolo 3x a escala.
function caixaAzul(F, x, y, z, rng, cor = 0x1d5498, comTorre = 1, g0 = 0, lados = 10) {
  const g = g0 || (rng() < .5 ? 1 : .8), torre = comTorre && rng() < .55 ? .5 + rng() * .7 : 0, r = .62 * g, h = .86 * g, tom = .85 + rng() * .3, fibro = cor === 0x8a8781;
  if (torre) { torreTijolo(F, x, y - .05, z, 1.2 * g, torre + .05, rng, true); F.cor(0x6b675f).caixa(x, y + torre, z, 1.36 * g, .08, 1.36 * g, 0); }
  const b = y + torre + (torre ? .08 : 0);
  if (fibro) F.cor(cor, tom).torno(x, b, z, [[r * .8, 0], [r * .96, h * .9], [r * .96, h], [r * 1.02, h], [r * 1.02, h * 1.04]], lados).cor(cor, tom * .92).torno(x, b + h * 1.04, z, [[r * 1.02, 0], [r * .9, h * .06], [r * .3, h * .1]], lados);
  else F.cor(cor, tom).torno(x, b, z, [[r * .84, 0], [r * .9, h * .3], [r * .93, h * .32], [r * .93, h * .62], [r * .97, h * .64], [r, h], [r * 1.04, h], [r * 1.04, h * 1.04]], lados)
    .cor(cor, tom * 1.15).torno(x, b + h * 1.04, z, [[r * 1.04, 0], [r * .7, h * .13], [r * .22, h * .19], [r * .2, h * .24]], lados);
  F.cor(0x8d9290).tubo([V(x + r * .9, b + h * .8, z), V(x + r * 1.5, b + h * .8, z), V(x + r * 1.5, y, z)], .022, 4);
  F.cor(0xb9b5a6).tubo([V(x - r * 1.4, y, z + r * .3), V(x - r * 1.4, b + h * 1.3, z + r * .3), V(x - r * .55, b + h * 1.3, z + r * .3), V(x - r * .55, b + h * 1.06, z + r * .3)], .016, 4).cor(0x5d6166).caixa(x - r * .55, b + h * 1.06, z + r * .3, .07, .06, .07);
}
// Lata de tinta de 18 L com muda de espada-de-são-jorge: tudo abaixo de 60 cm, sem cor de time.
function lataComEspada(F, x, y, z, rng, r = .15) {
  const h = r * 1.9, cor = [0xb9b6ac, 0x9aa3a8, 0xc9c3b0][Math.floor(rng() * 3)], L = 32;
  F.cor(cor, .8 + rng() * .25).torno(x, y, z, [[r, 0], [r, h], [r * 1.05, h], [r * 1.05, h * 1.04], [r * .92, h * 1.04]], L)
    .cor([0x8a8f8c, 0xb48a2a, 0x7a6a4a][Math.floor(rng() * 3)], .9).torno(x, y + h * .3, z, [[r * 1.012, 0], [r * 1.012, h * .4], [r * .98, h * .4]], L).cor(0x2a2018).torno(x, y + h * .9, z, [[r * .92, 0], [r * .5, .02]], L);
  const n = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) { const a = rng() * 6.283, d = rng() * r * .55, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d, alt = r * (.9 + rng() * .7), w = r * (.2 + rng() * .1), gi = rng() * 3.14, tx = Math.cos(gi), tz = Math.sin(gi);
    const cai = r * (.2 + rng() * .4), P = (u, v, k) => V(bx + tx * u * w * k + Math.cos(a) * cai * v * v, y + h * .9 + alt * v, bz + tz * u * w * k + Math.sin(a) * cai * v * v);
    const esc = .8 + rng() * .3;
    F.cor(0x2f5a2a, esc).quad(P(-.7, 0, .6), P(.7, 0, .6), P(.7, .5, 1), P(-.7, .5, 1)).cor(0x35622c, esc).tri(P(-.7, .5, 1), P(.7, .5, 1), P(0, 1, 0));
    for (const sn of [-1, 1]) F.cor(0xb9a83c, esc).quad(P(sn * .7, 0, .6), P(sn, 0, .6), P(sn, .5, 1), P(sn * .7, .5, 1)).tri(P(sn * .7, .5, 1), P(sn, .5, 1), P(0, 1, 0)); }
}
// Os vasos de barro do mapa (folha de agave) saem de cena e dão lugar à lata; voltam em desliga().
function vasos(scene, grupo, rng, mat) {
  const ocultos = [], F = fundidor(), cx = new THREE.Box3();
  scene.traverse((o) => { if (!o.isMesh || !o.visible || Array.isArray(o.material)) return; const n = o.material.name;
    if (n !== 'terra' && n !== 'leaf') return; ocultos.push(o);
    if (n === 'terra') { cx.setFromObject(o); lataComEspada(F, (cx.min.x + cx.max.x) / 2, cx.min.y, (cx.min.z + cx.max.z) / 2, rng, Math.min(.16, Math.max(.125, (cx.max.x - cx.min.x) * .3))); } });
  for (const o of ocultos) o.visible = false;
  if (F.tris()) { const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-vasos'; malha.userData.hdSombra = true; grupo.add(malha); }
  return () => { for (const o of ocultos) o.visible = true; };
}
const TANQUES = ['caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_azul', 'caixa_dagua_preta'];
const NOVOS = new Set(['caixa_dagua_azul', 'caixa_dagua_preta']);
// Caixas na beira do telhado que fecha cada beco central: são as que aparecem no fundo de quem olha do beco oposto.
const TANQUES_BECO = [[1.75, 9.25, 'caixa_dagua_azul', .75], [3.45, 9.4, 'caixa_dagua_preta', .35], [-1.7, 9.3, 'caixa_dagua_azul', .55], [-3.6, 9.5, 'caixa_dagua_azul', .3]];
// Tambor galvanizado autoral (±11,4; ±7, colisor r 0,70) sai de cena: caixa azul de 1 000 L sobre torre de tijolo, botijão e engradado
// no canto livre do mesmo colisor, mastro com parabólica em duas. O tambor oculto segue barrando tiros; a caixa acima de 0,9 m não.
function caixasLaje(F, scene, rng) {
  const ocultos = [], cx = new THREE.Box3();
  scene.traverse((o) => { if (o.userData.lajesAuthored !== 'caixa_dagua' || !o.visible) return; cx.setFromObject(o);
    const x = (cx.min.x + cx.max.x) / 2, z = (cx.min.z + cx.max.z) / 2; if (Math.abs(Math.abs(z) - 7) > .6 || Math.abs(Math.abs(x) - 11.4) > .6 || !noQuadro(x, z)) return;
    ocultos.push(o); const y = cx.min.y, sx = Math.sign(x), sz = Math.sign(z), tx = x + sx * .12, tz = z + sz * .12, torre = .5;
    torreTijolo(F, tx, y, tz, 1.05, torre, rng, true); F.cor(0x6b675f).caixa(tx, y + torre, tz, 1.3, .07, 1.3);
    caixaAzul(F, tx, y + torre + .07, tz, rng, 0x1d5498, 0, 1, 24);
    botijao(F, x - sx * .545, y, z + sz * .25, rng); caixaFeira(F, x + sx * .1, y, z - sz * .56, rng, 0);
    if (sx !== sz) caixaFeira(F, x + sx * .08, y + .31, z - sz * .56, rng, .1);
    // Mastro amarrado ao montante do guarda-corpo da borda (±12,8; um a cada 3 m), 2–3 m da caixa em z e 0,6 m fora dela em x:
    // fica dentro do colisor da mureta, nunca atravessa a caixa de nenhuma pose; prato com braço de LNB acima de 1,9 m.
    else { const z0 = sz < 0 ? -20 : 1, zp = z0 + 3 * Math.round((z - sz * 2.2 - z0) / 3), px = sx * 12.75;
      F.cor(0x7c7f7e).caixa(px, y, zp, .04, 2.7, .04).cor(0x55585a); for (const yy of [.3, .72]) F.caixa(px + sx * .02, y + yy, zp, .1, .03, .09);
      prato(F, V(px - sx * .16, y + 2.5, zp), Math.atan2(-x, -z) + (rng() - .5) * .8, .40); } });
  for (const o of ocultos) o.visible = false;
  return () => { for (const o of ocultos) o.visible = true; };
}
function telhados(grupo, rng, topo, mundo, vivo, mat, scene, comCaixas, FR, janelas) {
  const tetos = (mundo?.colliders || []).filter((c) => c.minY < .5 && c.maxY >= 5.9 && c.maxX - c.minX >= 3.5 && c.maxZ - c.minZ >= 3.5)
    .map((c) => ({ c, a: Math.atan2((c.minZ + c.maxZ) / 2, (c.minX + c.maxX) / 2) })).sort((p, q) => p.a - q.a).map((p) => p.c);
  if (!tetos.length) return { tris: 0, volta: () => {} };
  const lista = [...TANQUES.map((id) => ['tanque', id]), ...Array(18).fill(['caixa']), ...Array(11).fill(['antena']), ...Array(6).fill(['parabolica']), ...Array(8).fill(['esperas']), ...Array(4).fill(['pilha']), ...Array(5).fill(['puxadinho']), ...Array(5).fill(['lavar']), ...Array(4).fill(['esperas']), ...Array(7).fill(['varal'])];
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  const F = fundidor(), tanques = [], usos = new Map();
  lista.forEach(([tipo, id], i) => {
    const c = tetos[Math.floor((i + .5) * tetos.length / lista.length) % tetos.length], n = usos.get(c) || 0; usos.set(c, n + 1);
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2, w = c.maxX - c.minX, d = c.maxZ - c.minZ;
    // Borda voltada para o miolo do mapa (é a que se vê do chão e da laje); o segundo objeto da casa vai para o outro canto.
    const dentroX = Math.abs(cx) > Math.abs(cz) * .6, lado = (n % 2 ? 1 : -1) * (.12 + rng() * .22) * (n > 1 ? .4 : 1), fundo = tipo === 'esperas' ? .28 : tipo === 'puxadinho' ? 2.1 : 1.0 + rng() * .5 + (n > 1 ? 1.3 : 0);
    let x, z;
    if (tipo === 'esperas') { x = cx + (n % 2 ? 1 : -1) * (w / 2 - .3); z = cz + (rng() < .5 ? 1 : -1) * (d / 2 - .3); }
    else if (dentroX) { x = cx - Math.sign(cx) * (w / 2 - fundo); z = cz + lado * d; } else { x = cx + lado * w; z = cz - Math.sign(cz) * (d / 2 - fundo); }
    let y = topo(x, z); if (y === null) return;
    if (tipo === 'tanque') { const h = 1.2 + rng() * .6; F.cor(0x6b675f).caixa(x, y - .1, z, 1.25, .34, 1.25, rng()); tanques.push({ id, x, y: y + .22, z, targetH: h, ry: rng() * 6.28 }); }
    // Caixa (torre 1,2 m + canos): centro a ≥ 2,15 m de toda borda (1,2 m livres além do pé), nunca sobre uma janela da face mais perto; senão a instância sai.
    else if (tipo === 'caixa') { if (w < 4.3 || d < 4.3) return;
      x = Math.min(Math.max(x, c.minX + 2.15), c.maxX - 2.15); z = Math.min(Math.max(z, c.minZ + 2.15), c.maxZ - 2.15);
      const bx = Math.min(x - c.minX, c.maxX - x), bz = Math.min(z - c.minZ, c.maxZ - z);
      if (janelas.some((j) => j.y < c.maxY && (bx <= bz ? j.eixo === 0 && Math.abs(j.x - (x - c.minX < c.maxX - x ? c.minX : c.maxX)) < .3 && Math.abs(j.z - z) < 1.3
        : j.eixo === 2 && Math.abs(j.z - (z - c.minZ < c.maxZ - z ? c.minZ : c.maxZ)) < .3 && Math.abs(j.x - x) < 1.3))) return;
      y = topo(x, z); if (y === null) return; caixaAzul(F, x, y - .03, z, rng, rng() < .3 ? 0x8a8781 : 0x1d5498); }
    // Varal de laje (2 postes de 1,72 m, corda de fita) com 3–5 peças lavadas, só em telhado enquadrado pelas poses laje/lajesol.
    else if (tipo === 'varal') { if (!noQuadro(x, z)) return;
      const ax = dentroX ? 0 : 1, az = 1 - ax, L = Math.min(1.35, (ax ? w / 2 - Math.abs(x - cx) : d / 2 - Math.abs(z - cz)) - .3); if (L < .8) return;
      for (const s of [-1, 1]) F.cor(0x55585a).caixa(x + ax * s * L, y, z + az * s * L, .04, 1.72, .04).caixa(x + ax * s * L, y + 1.68, z + az * s * L, .04 + az * .4, .04, .04 + ax * .4);
      varal(F, rng, x - ax * L, z - az * L, x + ax * L, z + az * L, y + 1.64, FR, y); }
    else if (tipo === 'parabolica') parabolica(F, x, y - .05, z, rng);
    else if (tipo === 'esperas') esperas(F, x, y, z, rng);
    else if (tipo === 'pilha') pilha(F, x, y - .03, z, rng);
    else if (tipo === 'lavar') lavar(F, x, y - .03, z, rng, dentroX ? Math.PI / 2 : 0);
    else puxadinho(F, x, y - .05, z, rng, dentroX ? Math.PI / 2 : 0);
  });
  for (const s of [1, -1]) for (const [x, z, id, pe] of TANQUES_BECO) { const y = topo(x, s * z); if (y === null) continue;
    torreTijolo(F, x, y - .05, s * z, 1.3, pe + .05, rng); F.cor(0x6b675f).caixa(x, y + pe, s * z, 1.45, .09, 1.45, 0);
    if (id === 'caixa_dagua_azul' && s > 0) tanques.push({ id, x, y: y + pe + .08, z: s * z, targetH: 1.35 + rng() * .35, ry: rng() * 6.28 }); else caixaAzul(F, x, y + pe + .08, s * z, rng, id === 'caixa_dagua_preta' ? 0x1c1d20 : 0x1d5498, 0, 0, 16);
    antena(F, x + (x > 0 ? .95 : -.95), y - .05, s * (z + .5), rng);
    // Fundo do beco (caixas pastel): parabólica no telhado que fecha o beco, uma por lado, atrás da segunda caixa.
    if (Math.abs(x) > 3) { const xp = x + (x > 0 ? 1.0 : -1.0), zp = s * (z + 1.3), yp = topo(xp, zp); if (yp !== null) parabolica(F, xp, yp - .05, zp, rng, .45); } }
  const volta = comCaixas ? caixasLaje(F, scene, rng) : () => {};
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-telhados'; malha.userData.hdSombra = true; grupo.add(malha);
  const sub = new THREE.Group(); sub.name = 'hd-tanques'; grupo.add(sub);
  preloadMapProps([...new Set(TANQUES)]).then(() => {
    if (!vivo()) return;
    const lote = new PropBatch({ bucket: 22, cast: false, tag: 'hdcen' });
    for (const t of tanques) lote.add(t.id, t);
    lote.build(sub);
    sub.traverse((o) => { if (!o.isMesh) return; o.castShadow = false; o.userData.hdNovo = NOVOS.has(o.userData.mapPropId);
      if (o.userData.hdNovo && o.material.normalMap) { o.material = o.material.clone(); o.material.normalMap = null; o.userData.hdMatProprio = true; } });
  }).catch(() => {});
  return { tris: F.tris(), volta };
}

// Fachada: cano de PVC de descida, eletroduto preto corrido e ar-condicionado de janela. Um draw call.
const PVC = [0xb9b5a6, 0x8d9290, 0x77736a];
function fachada(grupo, rng, mundo, janelas, mat, evita) {
  const cols = mundo?.colliders || [], casas = cols.filter((c) => c.casa && Math.abs(c.minX + c.maxX) / 2 < 22), niveis = mundo?.levels || [];
  if (!casas.length) return 0;
  const F = fundidor();
  // Piso visível da face: 0 na rua; sobre casa mais baixa (laje andável), o topo dela; null se outra casa tapa a face até o alto.
  const pisoDe = (c, x, n) => { if (Math.abs(x + n * .5) > 19.5) return null; let p = 0;
    for (const o of casas) { if (o === c || o.minX > x + n * .4 || o.maxX < x + n * .4 || o.minZ > c.maxZ - 1 || o.maxZ < c.minZ + 1) continue; if (o.maxY > c.maxY - 2.4) return null; p = Math.max(p, o.maxY); }
    return p; };
  // Topo do guarda-corpo/mureta (colisor fino, ≤ 1,2 m) encostado na face (até 0,6 m) na altura do cano; -1 se a frente está livre.
  const barreira = (x, n, z, y0, y1) => { let t = -1;
    for (const o of cols) { if (o.maxY - o.minY > 1.2 || o.maxY <= y0 || o.minY >= y1 || o.minZ > z + .1 || o.maxZ < z - .1) continue;
      if (o.maxX < Math.min(x, x + n * .6) || o.minX > Math.max(x, x + n * .6)) continue; t = Math.max(t, o.maxY); }
    return t; };
  for (const c of casas) {
    const sx = Math.sign(c.casaRy) || 1, loja = c.maxY < 3.2 && Math.abs((c.minZ + c.maxZ) / 2 + 4.5) < .1;
    for (const [x, n, frente] of [[sx < 0 ? c.maxX : c.minX, -sx, true], [sx < 0 ? c.minX : c.maxX, sx, false]]) {
      const piso = pisoDe(c, x, n); if (piso === null || (loja && frente)) continue;
      const z = frente && rng() < .5 ? c.minZ + .42 : c.maxZ - .42, topo = c.maxY - .3, xc = x + n * .055;
      // Com guarda-corpo ou mureta à frente não há cano nem braçadeira: cano que não chega ao piso não existe.
      if (barreira(x, n, z, piso, topo) < 0) {
        F.cor(PVC[Math.floor(rng() * 2.999)], .85 + rng() * .25).tubo([V(xc, piso + .03, z), V(xc, topo, z), V(x - n * .03, topo + .1, z)], .05, 6);
        for (let y = piso + .38; y < topo; y += 1.45) F.cor(0x3a3d3f).caixa(x + n * .055, y, z, .11, .035, .135);
      } else { rng(); rng(); }
      const ye = piso + 2.6 + rng() * .14, xe = x + n * .028, fio = [];
      for (let k = 0, N = Math.round((c.maxZ - c.minZ) / .45); k <= N; k++) fio.push(V(xe, ye - .028 * Math.abs(Math.sin(k * Math.PI / 3)), c.minZ + .12 + (c.maxZ - c.minZ - .24) * k / N));
      F.cor(0x121315).tubo(fio, .013, 3);
    }
  }
  // Relógio de luz com eletroduto até o beiral e gato descendo; parabólica pequena só acima de 5,4 m.
  for (const c of casas) {
    const sx = Math.sign(c.casaRy) || 1;
    for (const [x, n] of [[sx < 0 ? c.maxX : c.minX, -sx], [sx < 0 ? c.minX : c.maxX, sx]]) {
      const piso = pisoDe(c, x, n); if (piso === null) continue;
      const z = (rng() < .5 ? c.minZ + .34 : c.maxZ - .34), topo = c.maxY - .35;
      if (rng() < .7) { const y = piso + 1.28 + rng() * .2, xm = relogio(F, rng, x, n, y, z, topo, evita);
        // Feixe preso com abraçadeira a cada 60 cm; entre elas o cabo só barriga 1,5 cm (solto, serpenteava como decalque).
        for (let k = 0; k < 4; k++) { const pts = [], dz = .05 + k * .03 + (rng() - .5) * .01; for (let yy = topo; yy > y + .4; yy -= .15) pts.push(V(xm + n * .012, yy, z + dz + (.012 + .004 * k) * Math.sin((topo - yy) / .6 * 6.2832)));
          pts.push(V(xm + n * .02, y + .34, z + dz * .5)); F.cor(k % 2 ? 0x15161a : 0x2a2420).tubo(pts, .006, 3); }
        for (let yy = topo - .6; yy > y + .7; yy -= .6) F.cor(0x2d2d2b).caixa(xm + n * .006, yy - .015, z + .095, .024, .03, .15);
        for (let k = 0; k < 2; k++) { const pts = []; for (let q = 0; q <= 8; q++) { const a = q / 8 * 6.28; pts.push(V(xm + n * .02, topo - .25 - k * .5 + Math.sin(a) * .09, z + .1 + Math.cos(a) * .07)); } F.cor(0x15161a).tubo(pts, .006, 3); } }
      if (c.maxY >= 5.9 && rng() < .45) { const zp = (c.minZ + c.maxZ) / 2 + (rng() - .5) * (c.maxZ - c.minZ) * .5; F.cor(0x4a4c4e).caixa(x + n * .12, c.maxY - .5, zp, .24, .03, .03); parabolica(F, x + n * .26, c.maxY - .5, zp, rng, .28); }
    }
  }
  // Ar-condicionado (34 cm) em 1 a cada 6 janelas de andar de cima; em outras, varal de janela. Longe de laje andável.
  for (const j of janelas) {
    if (j.eixo !== 0 || j.y < 3.5 || j.tipo === 5 || j.tipo === 6) continue;
    const s = rng(); if (s > .42) continue;
    const c = casas.find((o) => j.z > o.minZ && j.z < o.maxZ && Math.min(Math.abs(j.x - o.minX), Math.abs(j.x - o.maxX)) < .3); if (!c) continue;
    const n = Math.abs(j.x - c.maxX) < .3 ? 1 : -1, x = n > 0 ? c.maxX : c.minX, y = j.y - j.h / 2 - .5;
    if (y < 2.4 || niveis.some((l) => x + n * .4 > l.x0 - .7 && x + n * .4 < l.x1 + .7 && j.z > l.z0 - .7 && j.z < l.z1 + .7)) continue;
    if (s > .16) { const yv = y + .34;
      for (const dz of [-j.w / 2, j.w / 2]) F.cor(0x3a3d3f).caixa(x + n * .16, yv, j.z + dz, .32, .02, .02);
      for (const dx of [.14, .28]) { F.cor(0x1c1b1a).tubo([V(x + n * dx, yv + .02, j.z - j.w / 2), V(x + n * dx, yv + .02, j.z + j.w / 2)], .004, 3);
        for (let zz = j.z - j.w / 2 + .12; zz < j.z + j.w / 2 - .2; zz += .34 + rng() * .12) if (rng() < .75) pano(F, rng, x + n * dx, yv + .01, zz + .1, 0, 1, 4, PANOS[Math.floor(rng() * PANOS.length)]); }
      continue; }
    evita.push([x, y + .2, j.z]); F.cor(0xb7b4a8, .8 + rng() * .3).caixa(x + n * .17, y, j.z, .34, .40, .62).cor(0x2b2d2f).caixa(x + n * .345, y + .06, j.z - .05, .012, .28, .44);
    for (let k = 0; k < 5; k++) F.cor(0x8d8b82).caixa(x + n * .352, y + .09 + k * .05, j.z - .05, .012, .014, .44);
    F.cor(0x3a3d3f).caixa(x + n * .15, y - .035, j.z - .24, .3, .035, .03).caixa(x + n * .15, y - .035, j.z + .24, .3, .035, .03);
  }
  // Caixilho com espessura, 3 cm à frente do painel: alumínio fosco, ferro ou madeira conforme o tipo sorteado.
  const CAIXILHO = [0x9ea1a0, 0x9ea1a0, 0x30363a, 0x56665a, 0x2c2826, 0, 0, 0x6a6258, 0x9ea1a0];
  for (const j of janelas) { const cor = CAIXILHO[j.tipo], ex = j.eixo === 0; if (!cor) continue;
    const c = casas.find((o) => (ex ? j.z > o.minZ && j.z < o.maxZ && Math.min(Math.abs(j.x - o.minX), Math.abs(j.x - o.maxX)) < .3 : j.x > o.minX && j.x < o.maxX && Math.min(Math.abs(j.z - o.minZ), Math.abs(j.z - o.maxZ)) < .3)); if (!c) continue;
    const n = ex ? Math.sign(j.x - (c.minX + c.maxX) / 2) : Math.sign(j.z - (c.minZ + c.maxZ) / 2), p = (ex ? j.x : j.z) + n * ((j.e || .04) / 2 + .015), y0 = j.y - j.h / 2, g = .9 + rng() * .2;
    const barra = (u, y, w, h) => (ex ? F.caixa(p, y, j.z + u, .03, h, w) : F.caixa(j.x + u, y, p, w, h, .03));
    F.cor(cor, g); barra(-j.w / 2 + .022, y0, .044, j.h); barra(j.w / 2 - .022, y0, .044, j.h); barra(0, y0 + j.h - .044, j.w, .044); F.cor(cor, g * .86); barra(0, y0, j.w, .05); }
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-fachada'; malha.receiveShadow = true; malha.userData.hdSombra = true;
  grupo.add(malha); return F.tris();
}

// Objetos de calçada e laje, todos baixos (< 60 cm) e só em lugar já ocupado por colisor (canto do quadrado da caixa
// d'água, tampo do pilar, balcão de gás) ou em laje inalcançável. Cores sem time; nada cor de pele.
function botijao(F, x, y, z, rng) {
  const cor = rng() < .5 ? 0x3c5f9a : 0x9aa0a4, P = (r, y0, y1) => [V(x, y + y0, z), V(x, y + y1, z)];
  F.cor(cor, .85 + rng() * .3).tubo(P(.16, .04, .44), .16, 10).tubo(P(.11, .44, .52), .11, 8).cor(0x2c2e30).tubo(P(.14, 0, .05), .14, 8).tubo(P(.1, .52, .62), .1, 6).cor(0x8d9290).tubo(P(.02, .52, .6), .02, 4);
}
function balde(F, x, y, z, rng) {
  const cor = [0x2a4f8a, 0x8a2f2f, 0x1b1b1b, 0x3f6f4a][Math.floor(rng() * 3.999)], h = .28 + rng() * .06, r = .14, ry = rng() * 6.28;
  F.cor(cor, .85 + rng() * .3).torno(x, y, z, [[r * .82, 0], [r, h], [r * 1.06, h], [r * 1.06, h + .015], [r * .96, h + .015], [r * .78, .01]], 12);
  const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; pts.push(V(x + Math.cos(ry) * Math.cos(a) * r * 1.02, y + h + .01 + Math.sin(a) * .12, z - Math.sin(ry) * Math.cos(a) * r * 1.02)); }
  F.cor(0x8d9290).tubo(pts, .006, 3);
}
function bacia(F, x, y, z, rng) { F.cor(rng() < .5 ? 0x2a4f8a : 0xb9b6ac, .85 + rng() * .3).torno(x, y, z, [[.2, 0], [.27, .12], [.285, .12], [.285, .135], [.26, .135], [.19, .015]], 12); }
function caixaFeira(F, x, y, z, rng, ry) {
  const cor = [0xa12a22, 0x1f6a3a, 0x2a4f8a, 0x8a8f2a][Math.floor(rng() * 3.999)], w = .52, d = .36, h = .3, cs = Math.cos(ry), sn = Math.sin(ry);
  F.cor(cor, .8 + rng() * .3).caixa(x, y, z, w, .02, d, ry);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) F.caixa(x + (a * (w / 2 - .015)) * cs + (b * (d / 2 - .015)) * sn, y, z - (a * (w / 2 - .015)) * sn + (b * (d / 2 - .015)) * cs, .03, h, .03, ry);
  for (const yy of [.08, .17, .27]) { for (const b of [-1, 1]) F.caixa(x + (b * (d / 2 - .01)) * sn, y + yy, z + (b * (d / 2 - .01)) * cs, w, .025, .02, ry); for (const a of [-1, 1]) F.caixa(x + (a * (w / 2 - .01)) * cs, y + yy, z - (a * (w / 2 - .01)) * sn, .02, .025, d, ry); }
}
function sacoCimento(F, x, y, z, rng, ry, rx = 0) {
  F.cor(0x9a9080, .85 + rng() * .3).caixa(x, y, z, .62, .15, .40, ry, rx).cor(0x6f6a62, .9).caixa(x, y + .02, z, .63, .07, .36, ry, rx).cor(0x3a3a3a).caixa(x, y + .035, z, .64, .02, .14, ry, rx);
}
function cadeira(F, x, y, z, rng, ry) {
  const cor = rng() < .7 ? 0xd8d6cf : 0xb9b6ac, cs = Math.cos(ry), sn = Math.sin(ry);
  F.cor(cor, .9 + rng() * .15).caixa(x, y + .42, z, .42, .035, .42, ry);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) F.caixa(x + (a * .19) * cs + (b * .19) * sn, y, z - (a * .19) * sn + (b * .19) * cs, .035, .42, .035, ry, b < 0 ? .06 : -.06);
  F.caixa(x - .19 * sn, y + .45, z - .19 * cs, .42, .40, .03, ry, .12).cor(cor, .8).caixa(x - .2 * sn, y + .62, z - .2 * cs, .40, .025, .03, ry, .12);
  for (const a of [-1, 1]) F.caixa(x + (a * .21) * cs - .02 * sn, y + .45, z - (a * .21) * sn - .02 * cs, .03, .03, .38, ry);
}
// O varal autoral (lajes_varal.glb, curva de Bézier do Sketchfab) desenha a corda como fita bege de 4 cm torcida: sai de cena e entra
// varal de poste de concreto de 9 cm (lê a 1 200 px; o tubo de 3,6 cm sumia) com travessa galvanizada e corda de 1,5 px, recuado 0,5 m para fora (±7,5; ±11)
// e com roupa só na metade externa (|x| ≥ 7): da pose rente à parede (hd_lab `parede`: -6,5/3,1/-12,8, yaw -2) nada entra no corredor da laje; calça sempre dobrada. Volta em desliga().
function varais(scene, F, FR, rng) {
  const ocultos = [], cx = new THREE.Box3();
  scene.traverse((o) => { if (o.userData.lajesAuthored !== 'lajes_varal' || !o.visible) return; cx.setFromObject(o);
    const sx = Math.sign(cx.min.x + cx.max.x) || 1, x = sx * 7.5, z = (cx.min.z + cx.max.z) / 2, y = cx.min.y, h = 1.9; if (!noQuadro(x, z)) return; ocultos.push(o);
    for (const dx of [-1.1, 1.1]) F.cor(0x8e8f8a, .9 + rng() * .2).caixa(x + dx, y, z, .09, h, .09).cor(0x8d9290).tubo([V(x + dx, y + h - .014, z - .26), V(x + dx, y + h - .014, z + .26)], .014, 5).cor(0x6a6c69).caixa(x + dx, y, z, .22, .06, .22);
    for (const [dz, formas] of [[-.2, [0, 2]], [.2, [1, 0]]]) { const A = V(x - 1.1, y + h, z + dz), B = V(x + 1.1, y + h, z + dz), L = 2.2, barriga = .04;
      FR.cor(0xa89f8a).fio(catenaria(A, B, barriga, 0, 12), .003);
      let s = .72;
      for (const forma of formas) { const [w] = PECAS[forma]; if (s + w > L - .12) break; const t = (s + w / 2) / L, yy = y + h - barriga * 4 * t * (1 - t) - .01;
        pano(F, rng, sx * (6.4 + s + w / 2), yy, z + dz, 1, 0, forma, forma === 1 ? JEANS : PANOS[Math.floor(rng() * PANOS.length)], forma === 1);
        s += w + .08 + rng() * .1; } } });
  for (const o of ocultos) o.visible = false;
  return () => { for (const o of ocultos) o.visible = true; };
}
// Mercadinho na fachada de entorno 41 (x = -14,85; frente para o beco oeste): toldo listrado assentado na marquise de zinco autoral
// da vitrine (braços passariam dentro dela), cadeira e engradados na porta (0,8 m fora da rota x = -13,8). Placa: atlas de pichação.
function loja(F, rng, cols) {
  if (!cols.some((c) => c.casa && Math.abs(c.maxX + 14.85) < .06 && c.minZ < -11 && c.maxZ > -11)) return 0;
  const X = -14.85, z0 = -11.15, z1 = -8.55, y0 = 2.60, fora = .78, y1 = 2.36, aba = .17, n = 13, dz = (z1 - z0) / n;
  const P = (u, v, s) => V(X + u * fora, y0 + (y1 - y0) * u - .02 * Math.sin(Math.PI * u) - s, z0 + v * dz);
  for (let i = 0; i < n; i++) { const cor = i % 2 ? 0xcfcabc : 0x14552c, g = .86 + rng() * .22;
    F.cor(cor, g); for (let k = 0; k < 3; k++) F.quad(P(k / 3, i, 0), P((k + 1) / 3, i, 0), P((k + 1) / 3, i + 1, 0), P(k / 3, i + 1, 0));
    F.cor(cor, g * .92).quad(P(1, i, 0), P(1, i + 1, 0), P(1, i + 1, aba * .75), P(1, i, aba * .75)).tri(P(1, i, aba * .75), P(1, i + 1, aba * .75), P(1, i + .5, aba)); }
  for (const z of [z0 - .02, z1 + .02]) F.cor(0x8d9290).tubo([V(X, y0 + .01, z), V(X + fora, y1 + .01, z)], .014, 5);
  F.tubo([V(X + fora, y1 + .005, z0 - .02), V(X + fora, y1 + .005, z1 + .02)], .014, 5);
  cadeira(F, -14.55, 0, -11.3, rng, Math.PI / 2 + (rng() - .5) * .4); caixaFeira(F, -14.62, 0, -11.8, rng, .2); caixaFeira(F, -14.6, .31, -11.78, rng, -.15);
  return 1;
}
function props(grupo, rng, topo, mundo, mat, FR, scene, liga) {
  const cols = mundo?.colliders || []; if (!cols.length) return { tris: 0, volta: () => {} };
  const F = fundidor(), colEm = (x, z, y0, y1) => cols.find((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.maxY >= y0 && c.maxY <= y1);
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    // Canto do quadrado de colisão da caixa d'água (fora do cilindro) e tampo do pilar de cada laje; só no quadro das poses.
    for (const [zt, r, k] of [[16, .76, 0], [7, .70, 1]]) { const cx = side * 11.4, cz = end * zt, c = colEm(cx, cz, 3.8, 4.6); if (!c || c.minY < 2.9 || !noQuadro(cx, cz)) continue;
      const x = cx + side * (r - .14), z = cz + end * (r - .14); if (k) bacia(F, x, c.minY, z, rng); else balde(F, x, c.minY, z, rng); }
    const c2 = noQuadro(side * 11.6, end * 4.3) && colEm(side * 11.6, end * 4.3, 3.85, 4.0); if (c2) { if (side === end) sacoCimento(F, side * 11.6, c2.maxY + .08, end * 4.3, rng, rng() * .6, .08); else balde(F, side * 11.6 - side * .08, c2.maxY + .08, end * 4.3 + end * .05, rng); }
  }
  // Botijão no balcão de gás da praça (bloco baixo de 32 cm).
  const c3 = colEm(4.95, -6.02, .28, .36); if (c3) botijao(F, 4.95, c3.maxY, -6.0, rng);
  // Viela do beco central (paredes em |x| = 1, piso y = 0): caixa de feira, balde e botijão encostados à parede, nos vãos entre janela e porta
  // (nunca na frente de uma), só no quadro da pose `beco`. Sem colisão: saliência de 28–36 cm numa viela de 2 m — fora da linha de andar do meio.
  // rSemVermelho (sorteio ≥ 0,5) pula a caixa vermelha e o balde vinho: a 3–5 m da câmera nada cor de sangue.
  // Só o beco sul (z > 0): o espelhado fica a 29 m, atrás do próprio beco, e passaria em noQuadro por estar no eixo da câmera.
  if (noQuadro(-.8, 12, [0])) { const rSemVermelho = () => .5 + rng() * .5;
    caixaFeira(F, -.80, 0, 11.75, rSemVermelho, Math.PI / 2); balde(F, -.83, 0, 13.72, rSemVermelho); botijao(F, .81, 0, 13.6, rSemVermelho); }
  // Lajes inalcançáveis dos quartos de fundo (±6,5; ∓17), só no quadro: no lado do Beco do Varal, varal com roupa pendendo; do outro, cadeira, caixas de feira e saco.
  for (const side of [-1, 1]) { const x = side * 6.5, z = -side * 17, y = noQuadro(x, z) ? topo(x, z) : null; if (y === null) continue;
    if (side > 0) { for (const dz of [-1.45, 1.45]) F.cor(0x55585a).caixa(x + .25, y, z + dz, .04, 1.72, .04).caixa(x + .25, y + 1.68, z + dz, .5, .04, .04);
      varal(F, rng, x + .1, z - 1.4, x + .1, z + 1.4, y + 1.64, FR, y, true); varal(F, rng, x + .4, z - 1.4, x + .4, z + 1.4, y + 1.66, FR, y);
      botijao(F, x - .65, y, z - 1.3, rng); balde(F, x - .7, y, z + 1.1, rng); }
    else { cadeira(F, x + .35, y, z - .8, rng, 2.4 + rng()); caixaFeira(F, x - .6, y, z + 1.1, rng, .3); caixaFeira(F, x - .62, y + .31, z + 1.08, rng, .9); sacoCimento(F, x + .45, y, z + 1.2, rng, .4); balde(F, x - .25, y, z - 1.35, rng); }
  }
  const volta = liga.varal ? varais(scene, F, FR, rng) : () => {};
  if (liga.loja) loja(F, rng, cols);
  if (!F.tris()) return { tris: 0, volta };
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-props'; malha.userData.hdSombra = true; grupo.add(malha); return { tris: F.tris(), volta };
}

export function cenografiaLajes(scene, opts = {}) {
  const lig = (k) => opts[k] !== false, mundo = opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null);
  const grupo = new THREE.Group(); grupo.name = 'hd-cenografia'; let vivo = true;
  const atmosfera = opts.atmosfera !== false, topo = medidorDeTopo(scene, mundo), info = {}, evita = opts.evita || [];
  const U = { hdRuido: opts.ruido || { value: null }, hdNevoa: { value: (scene.fog?.color || new THREE.Color(0xb7c4cb)).clone().multiplyScalar(atmosfera ? .70 : .84) }, hdNevoaGanho: { value: atmosfera ? .000014 : .000030 } };
  // Fio, telhado, fachada e props dividem um material: um programa só. Sombra projetada só em fachada, telhados, vasos e props (opts.sombras).
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, side: THREE.DoubleSide, name: 'hd-cenografia' });
  // Cordas de varal (beco, lajes dos fundos e varais repostos) numa fita de 1,5 px: o único draw call a mais da cenografia.
  const FR = fiador(), res = { value: new THREE.Vector2(1, 1) };
  let voltaMorro = () => {}, voltaCaixas = () => {}, voltaVaral = () => {};
  if (lig('morro')) { morro(grupo, rngDe(opts.semente || 20261110), U, lig('denso')); voltaMorro = escondeMorroVelho(scene); }
  if (lig('fios')) info.fios = fios(grupo, rngDe(7717), topo, mundo, mat, evita, FR);
  if (lig('fachada')) info.fachada = fachada(grupo, rngDe(9311), mundo, opts.janelas || [], mat, evita);
  if (lig('telhados')) { const t = telhados(grupo, rngDe(40123), topo, mundo, () => vivo, mat, scene, lig('caixas'), FR, opts.janelas || []); info.telhados = t.tris; voltaCaixas = t.volta; }
  if (lig('props')) { const p = props(grupo, rngDe(8831), topo, mundo, mat, FR, scene, { varal: lig('varal'), loja: lig('loja') }); info.props = p.tris; voltaVaral = p.volta; }
  if (FR.n()) { const fio = new THREE.Mesh(FR.geo(), materialFio(res)); fio.name = 'hd-varal-fio'; fio.onBeforeRender = (r) => r.getDrawingBufferSize(res.value); grupo.add(fio); info.cordas = FR.n(); }
  const voltaVasos = lig('vasos') ? vasos(scene, grupo, rngDe(5519), mat) : () => {};
  const sombras = lig('sombras');
  grupo.traverse((o) => { if (o.isMesh) { o.castShadow = sombras && !!o.userData.hdSombra; o.receiveShadow = o.receiveShadow || o.castShadow; o.raycast = () => {}; } });
  scene.add(grupo);
  return { grupo, info, morro: lig('morro'), desliga() {
    vivo = false; scene.remove(grupo); voltaMorro(); voltaVasos(); voltaCaixas(); voltaVaral(); mat.dispose();
    grupo.traverse((o) => { if (!o.isMesh) return;
      const prop = !!o.userData.mapPropId;
      // Geometria e material dos tanques moram no cache do mapprops (a caixa d'água do mapa usa o mesmo molde).
      if (!prop) { o.geometry.dispose(); o.material.dispose(); }
      else if (o.userData.hdNovo) for (const t of [o.material.map, o.material.normalMap, o.material.roughnessMap]) t?.dispose();
      if (o.userData.hdMatProprio) o.material.dispose();
      if (o.isInstancedMesh) o.dispose(); });
  } };
}
