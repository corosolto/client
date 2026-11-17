// Cenografia HD do Escadão (só com ?hd=1). NADA aqui tem colisão: morro, casario e mata ficam fora da arena
// (|x| > 34 ou z fora de -46..52), itens de laje só em topo ≥ 2,6 m acima do piso jogável, fachada com saliência ≤ 12 cm (verga de
// tijolo sobre os portões, relógio e eletroduto do beco oeste), postes novos fora de bounds (|x| = 19,3, entre o muro e o bairro) ou
// vestindo os postes autorais de 16 cm (seção 22 cm) com nó de fiação nos do mirante, cabos e varais ≥ 2,4 m acima do piso
// (travessias dos becos ≥ 3,7 m: cruzam de roldana a roldana), props de calçada < 0,8 m encostados em parede. Tudo sai em desliga().
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
// Cabos em fita: cinza-chumbo (0x3a3c3e e vizinhos) a 75 % contra o céu; preto puro de 1 px virava "corrente" pontilhada.
const ESCURO = 0x3a3c3e, CHUMBO2 = 0x34363a, TELECOM = 0x303234, QUENTE = 0x3e3a36, FERRO = 0x26221f;

// Fios: fita virada para a câmera (2 vértices por ponto, abertos no vertex shader) com largura real perto e piso de 2·FIO_PX px
// longe (tubo de 1 cm a 30 m virava linha pontilhada que cintila); borda com 1 px de alfa (premultiplicado, sem escrever
// profundidade) e opacidade 0,75. Um draw call, sem luz: técnica do Córrego (fiosHD).
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
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, name: 'hd-fios', transparent: true, premultipliedAlpha: true, depthWrite: false, opacity: .75 });
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
    // Alfa cai no último pixel da meia-largura (vHdBorda.y px): borda macia sem borrar o cabo visto de perto.
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHdBorda;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= clamp((1.0 - abs(vHdBorda.x)) * vHdBorda.y, 0.0, 1.0);');
  };
  mat.customProgramCacheKey = () => 'hd-fios-escadao2';
  return mat;
}

/* ===================== MORRO, CASARIO E MATA ===================== */
// Morro do Rio: sobe rápido ao norte e ao sul (fundo do mirante e da rua: raio em z × 1,25), mais devagar nos lados, cristas por
// ângulo. Terreno começa em r = 40: até |z| ≈ 46 fica abaixo dos muros de 2 m. Crista 25 % mais baixa que a r4 (céu acima do morro
// na pose do mirante). `encosta` = 0 no pé, 1 na crista: casario só na metade de baixo, mata na de cima.
const R0 = 40, R1 = 105;
const encosta = (x, z) => suave(R0, R1, Math.hypot(x * .85, z * 1.25));
function alturaMorro(x, z) {
  const a = Math.atan2(z, x), t = encosta(x, z);
  const crista = 7.5 * ruido2(Math.cos(a) * 2.1 + 5, Math.sin(a) * 2.1 + 3) + 5.25 * ruido2(Math.cos(a) * 4.3, Math.sin(a) * 4.3);
  return -1 + 34.5 * Math.pow(t, 1.25) + crista * suave(.35, 1, t) + 3 * (ruido2(x / 23, z / 23) - .5) * t;
}
const foraDaArena = (x, z) => Math.abs(x) > 34 || z < -46 || z > 52;
const adensado = (x, z) => ruido2(x / 37 + 1, z / 37 + 9) * .6 + ruido2(x / 13, z / 13) * .4;
function escondeHorizonte(scene) {
  const alvo = scene.getObjectByName('ESCADAO_HORIZONTE_MORRO'); if (!alvo || !alvo.visible) return () => {};
  alvo.visible = false; return () => { alvo.visible = true; };
}
// Casas do morro: branco sujo, cinza e terracota (nada de salmão); 32 % de tijolo aparente; 45 % das rebocadas com barrado de
// 1,5–1,9 m num 2º tom mais escuro (rng2 próprio: o sorteio de posição não muda).
const TONS = [0xd3cdbf, 0xc9c3b4, 0x9c5a3d, 0x8e8b84, 0x7f8588, 0xb9ad94], TIJOLO = 0x8a5236;
function morro(grupo, rng, mat, { casario = true, mata = true } = {}) {
  const rng2 = rngDe(31337);
  // Terreno: anel polar de 40 a 170 m, verde-escuro (AgX lava: mais escuro que o alvo) com terra só onde o casario adensa (pé).
  const segs = 128, linhas = 22, posA = [], corA = [], idx = [], verde = new THREE.Color(0x1f3a1c), terra = new THREE.Color(0x55493a), mato = new THREE.Color(0x2a4a22);
  for (let j = 0; j <= linhas; j++) { const r = 40 + (j / linhas) * 130;
    for (let i = 0; i <= segs; i++) { const a = i / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, y = alturaMorro(x, z);
      posA.push(x, y, z); const d = adensado(x, z), c = verde.clone().lerp(mato, ruido2(x / 9, z / 9)).lerp(terra, suave(.3, .6, d) * (encosta(x, z) < .5 ? .7 : .12));
      corA.push(c.r, c.g, c.b);
      if (j < linhas && i < segs) { const p = j * (segs + 1) + i, n = p + segs + 1; idx.push(p, n, p + 1, p + 1, n, n + 1); } } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(corA, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const terreno = new THREE.Mesh(soltaAoSubir(tg), mat); terreno.name = 'hd-morro'; grupo.add(terreno);
  const C = fundidor(), M = fundidor(); let casas = 0, blobs = 0;
  // Grade polar com jitter, mais cerrada no pé (4,4 x 4,6 m até r = 90; 6,2 x 6,4 m acima): casa só na metade de baixo da encosta
  // (t < 0,5, rareando até 0,6) onde o ruído adensa (≈ 330 casas, semente padrão); metade de cima = faixa contínua de copas
  // (90 % das células), mais blobs esparsos no pé onde não há casa.
  for (let r = 46; r < 166; r += r < 90 ? 4.4 : 6.2) { const n = Math.max(12, Math.round(2 * Math.PI * r / (r < 90 ? 4.6 : 6.4)));
    for (let i = 0; i < n; i++) { const a = (i + rng() * .8) / n * Math.PI * 2, x = Math.cos(a) * (r + (rng() - .5) * 4), z = Math.sin(a) * (r + (rng() - .5) * 4);
      if (!foraDaArena(x, z)) continue;
      const y = alturaMorro(x, z), d = adensado(x, z), t = encosta(x, z), alto = t >= .5;
      const casa = casario && t < .6 && d > .27 && rng() < (t < .5 ? .9 : .35);
      if (casa) { casas++;
        const w = 4 + rng() * 3.5, dd = 4 + rng() * 3.5, pav = 1 + Math.floor(rng() * 2.6), h = 2.9 * pav, ry = Math.atan2(x, z) + (rng() - .5) * .5, tij = rng() < .32, ti = Math.floor(rng() * TONS.length);
        C.cor(tij ? TIJOLO : TONS[ti], .82 + rng() * .3).caixa(x, y - .5, z, w, h + .5, dd, ry);
        if (!tij && rng2() < .45) C.cor(TONS[(ti + 2 + Math.floor(rng2() * 3)) % TONS.length], .6 + rng2() * .2).caixa(x, y - .5, z, w + .03, 1.5 + rng2() * .4, dd + .03, ry);
        if (rng() < .7) C.cor(0x6e6a62, .9 + rng() * .2).caixa(x, y + h, z, w + .35, .2, dd + .35, ry); else C.cor(0x7a7b76, .9).caixa(x, y + h, z, w + .4, .1, dd + .5, ry, .12);
        if (rng() < .6) { const cx = x + (rng() - .5) * w * .5, cz = z + (rng() - .5) * dd * .5, g = .5 + rng() * .25, azul = rng() < .7;
          C.cor(azul ? 0x3b6a9e : 0x8f918c, .85 + rng() * .3).torno(cx, y + h + .2, cz, [[g * .85, 0], [g, g * .9], [g * .9, g * 1.35], [g * .25, g * 1.5]], 8, rng() * 3); }
        if (casas % 3 === 0) { const ax = x + (rng() - .5) * w * .6, az = z + (rng() - .5) * dd * .6, ah = 2.2 + rng() * 1.4;
          C.cor(0x6f7275).caixa(ax, y + h + .2, az, .06, ah, .06).caixa(ax, y + h + ah - .1, az, 1.1, .03, .03, ry).caixa(ax, y + h + ah - .4, az, .9, .03, .03, ry).caixa(ax, y + h + ah - .7, az, .7, .03, .03, ry); }
        if (mata && rng() < .18) { blobs++; M.cor(0x24401f, .8 + rng() * .4).torno(x + (rng() - .5) * 8, y - .3, z + (rng() - .5) * 8, [[.9, 0], [2.0, 2.2], [1.7, 4.0], [.6, 5.2], [0, 5.8]], 6, rng() * 3); }
      } else if (mata && (alto ? rng() < .9 : ((d < .42 && rng() < .75) || rng() < .12))) { blobs++;
        const rb = (alto ? 3.2 : 2.6) + rng() * 3.4, hb = rb * (1.1 + rng() * .6), sq = .7 + rng() * .6;
        M.cor([0x1d3519, 0x24401f, 0x2c4a24, 0x1a301c][Math.floor(rng() * 4)], .75 + rng() * .5).torno(x, y - .6, z, [[rb * .5, 0], [rb, hb * .35], [rb * .85 * sq, hb * .7], [rb * .3, hb * .95], [0, hb]], 5, rng() * 3);
        if (rng() < .4) M.cor(0x223d1f, .8 + rng() * .4).torno(x + rb * .8, y - .6, z + rb * .5, [[rb * .35, 0], [rb * .6, hb * .3], [rb * .2, hb * .7], [0, hb * .8]], 5, rng() * 3); } } }
  if (C.tris()) { const mc = new THREE.Mesh(C.geo(), mat); mc.name = 'hd-casario'; grupo.add(mc); }
  if (M.tris()) { const mm = new THREE.Mesh(M.geo(), mat); mm.name = 'hd-mata'; grupo.add(mm); }
  return { casas, mata: blobs, tris: C.tris() + M.tris() + idx.length / 3 };
}
// Material do fundo (morro, casario, mata): a névoa autoral (bloom.js, d = 0,008, cor de deserto) entra a 88 % (exp2) / 92 %
// (linear): o fundo fica mais claro e mais macio que o bairro autoral à frente, e o verde-escuro ainda lê como mata.
function materialLonge() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, side: THREE.DoubleSide, name: 'hd-cenografia-longe' });
  mat.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment.replace('vFogDepth * vFogDepth', '0.88 * vFogDepth * vFogDepth').replace('fogFar, vFogDepth', 'fogFar, vFogDepth * 0.92')); };
  mat.customProgramCacheKey = () => 'hd-longe-escadao2';
  return mat;
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
    if (rng() < .3 && w > 3) { const ex = t.cx + (rng() - .5) * w * .5, ez = t.cz - lado * Math.max(0, d / 2 - .4); esperas(F, ex, mede(ex, ez, t.y), ez, rng); }
  }
  if (F.tris()) { const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-telhados'; grupo.add(malha); }
  return { topos: topos.length };
}

/* ===================== FACHADA: PVC, RELÓGIO DE LUZ, ELETRODUTO ===================== */
const PVC = [0xb9b5a6, 0x8d9290, 0x77736a];
// Relógio de luz: caixa cinza 30 x 42 x 10 cm com 1 cm embutido na face (x, z) de normal (nx, nz) — fica 0–9 cm da parede —,
// tampa, aro escuro de 16 cm e mostrador (vidro escuro 12 x 12 cm) 1,8 cm à frente da caixa (o vidro da r4 ficava DENTRO dela).
function relogio(F, x, y, z, nx, nz, tom = 1) {
  const P = (o, w, d, cor, y0, h, g = 1) => F.cor(cor, g).caixa(x + nx * o, y0, z + nz * o, nx ? d : w, h, nx ? w : d);
  P(.04, .30, .10, 0x8a8d8c, y, .42, tom); P(.05, .34, .12, 0x6f7271, y + .42, .03);
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
// Relógio a 1,55 m (0,65 m acima da rampa), eletroduto galvanizado descendo enterrado e um pedaço curto subindo até uma caixa de
// passagem encostada no peitoril (2,41 m); os 3 fios do gato entram nessa caixa. Sem rng: o sorteio da fachada não muda.
function becoOeste(F) {
  const x = -13.9, z = 9.75, y = 1.55;
  relogio(F, x, y, z, 1, 0);
  F.cor(0x767978).tubo([V(x + .055, y - .02, z - .06), V(x + .055, .55, z - .06)], .016, 4).tubo([V(x + .055, y + .44, z + .06), V(x + .055, 2.31, z + .06)], .016, 4);
  F.cor(0x4a4c4e).caixa(x + .035, 2.31, z + .06, .07, .10, .12);
  F.cor(0x3a3d3f).caixa(x + .04, 1.0, z - .06, .06, .035, .09).caixa(x + .04, 2.2, z + .06, .06, .035, .09);
  for (let k = 0; k < 3; k++) { const a = z - .06 + k * .04; F.cor(k % 2 ? 0x15161a : 0x2a2420).tubo([V(x + .05, 2.32, a + .06), V(x + .085 + .02 * Math.sin(k * 2.0), 2.2, a + .01), V(x + .08, y + .46, a), V(x + .08, y + .37, a)], .006, 3); }
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
  fios += noDeFiacao(F, W, por.I, rng) + noDeFiacao(F, W, por.H, rng); becoOeste(F);
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-postes'; grupo.add(malha);
  return { postes: POSTES.length, fios };
}

/* ===================== VIDA: TOLDO, PLACA, VARAIS, COMÉRCIO, PROPS DE CALÇADA ===================== */
// Cores de roupa lavadas (dessaturadas e meio-tom), sem bege/rosado quente (nada com H 10–40° e S > 0,12: lia como pele); os
// neutros são frios para não virarem bege sob o sol quente. Pregadores de madeira clara cinzenta e plástico.
const PANOS = [0xd0d6d8, 0x5e728a, 0x8e9a5c, 0x7a9a8c, 0xb9c4cf, 0x977f9a, 0x4a5668, 0xc9d0c9, 0x5f8a92, 0x6f8a6a, 0x8c86a8], PREGADORES = [0xa9a9a0, 0x5f8fb8, 0x9fb23a, 0xd0d6d8, 0x7d8a6a];
// Pano em grade 4 x 3 com caimento: ondulação lateral que cresce para baixo (±1,5–3,5 cm), torção por pano e barriga no meio;
// as normais saem do fundidor (faces planas = vincos legíveis). Toalha (faixa), camisa (ombros + mangas) ou calça (duas pernas).
// Dois pregadores por pano montados na corda.
function pano(F, rng, cx, y, cz, dx, dz, w, h, cor) {
  const nx = -dz, nz = dx, vai = (rng() - .5) * .06, fase = rng() * 6.28, amp = .015 + rng() * .02, tipo = rng(), ganho = .85 + rng() * .3;
  const P = (u, v, fora = 0) => { const s = Math.sin(u * 4.2 + fase + v * 2.0) * amp * v + vai * v * v + .012 * Math.sin(v * Math.PI) * Math.cos(u * 3.0 + fase) + fora;
    return V(cx + dx * u * w + nx * s, y - v * h, cz + dz * u * w + nz * s); };
  const grade = (u0, u1, v0, v1, nu, nv, fora = 0) => { for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = u0 + (u1 - u0) * i / nu, b = u0 + (u1 - u0) * (i + 1) / nu, c = v0 + (v1 - v0) * j / nv, d = v0 + (v1 - v0) * (j + 1) / nv;
    F.quad(P(a, c, fora), P(b, c, fora), P(b, d, fora), P(a, d, fora)); } };
  F.cor(cor, ganho);
  if (tipo < .38) { grade(-.5, .5, 0, 1, 4, 3); if (rng() < .6) { F.cor(PANOS[Math.floor(rng() * PANOS.length)], .9); grade(-.5, .5, .58, .74, 4, 1, .004); } }
  else if (tipo < .76) { grade(-.34, .34, .06, 1, 4, 3); grade(-.34, -.12, 0, .08, 1, 1); grade(.12, .34, 0, .08, 1, 1);
    F.quad(P(-.34, .06), P(-.36, .40), P(-.60, .34), P(-.52, .04)).quad(P(.52, .04), P(.60, .34), P(.36, .40), P(.34, .06)); }
  else { grade(-.5, .5, 0, .24, 4, 1); grade(-.46, -.08, .24, 1, 2, 3); grade(.08, .46, .24, 1, 2, 3); }
  const ry = Math.atan2(-dz, dx), preg = PREGADORES[Math.floor(rng() * PREGADORES.length)];
  for (const u of [-.4, .4]) { const p = P(u, 0); F.cor(preg, .9 + rng() * .2).caixa(p.x, y - .012, p.z, .014, .048, .022, ry); }
}
// Roupas penduradas numa corda de A a B (barriga 10 cm); a corda vai em fita (W) para não sumir longe. Devolve nº de panos.
function roupas(F, W, rng, x0, z0, x1, z1, y, hMax = 1.3) {
  const A = V(x0, y, z0), B = V(x1, y, z1), L = A.distanceTo(B), dx = (x1 - x0) / L, dz = (z1 - z0) / L, barriga = .10, alt = (t) => y - barriga * 4 * t * (1 - t);
  W.cor(0x4a4640).cabo(A, B, barriga, .004);
  let s = .16 + rng() * .1, n = 0;
  while (s < L - .3) { const w = .30 + rng() * .26; if (s + w > L - .12) break; const t = (s + w / 2) / L, yy = alt(t) - .012;
    pano(F, rng, x0 + dx * (s + w / 2), yy, z0 + dz * (s + w / 2), dx, dz, w, Math.min(.42 + rng() * .42, hMax), PANOS[Math.floor(rng() * PANOS.length)]); s += w + .03 + rng() * .1; n++; }
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
// Porta de enrolar fechada (réguas de 8,5 cm, guias, capa de 12 cm) na face -z de uma parede; pé enferrujado, puxador no centro.
function portaDeEnrolar(F, rng, x0, x1, y0, z, alto) {
  const cx = (x0 + x1) / 2, w = x1 - x0; let i = 0;
  for (let y = y0 + .02; y < y0 + alto - .08; y += .085, i++) F.cor(i < 3 ? 0x4a3f36 : 0x55606a, (i % 2 ? .92 : 1.04) * (.95 + rng() * .1)).caixa(cx, y, z - .02, w, .08, .025);
  F.cor(0x3f4448).caixa(x0 - .03, y0, z - .035, .06, alto + .1, .06).caixa(x1 + .03, y0, z - .035, .06, alto + .1, .06).caixa(cx, y0 + alto, z - .06, w + .14, .22, .12);
  F.cor(0x1e1f21).caixa(cx, y0 + .35, z - .045, .26, .03, .03);
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
    g.fillStyle = l % 2 ? '#5a2a1e' : '#1d3a6b'; g.fillRect(0, y0, 1024, 320); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) g.fillRect(rng() * 1024, y0 + rng() * 320, 2 + rng() * 30, 1 + rng() * 3);
    g.strokeStyle = '#e9e2cf'; g.lineWidth = 10; g.strokeRect(22, y0 + 22, 980, 276);
    g.fillStyle = '#f1ebdc'; g.textAlign = 'center'; g.textBaseline = 'middle';
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
  ['caixote_madeira', -2.7, -0.95, .30, .15], ['caixote_madeira', -2.7, -0.95, .30, -.2, .30], ['botijao_gas', -3.3, -1.0, .58, 1.1],
  ['cadeira_plastico', 1.25, -23.75, .78, 2.9], ['caixote_madeira', -2.05, -23.8, .30, .2], ['caixote_madeira', -2.05, -23.8, .30, -.4, .30], ['botijao_gas', 0.55, -23.72, .58, .4],
];
function vida(grupo, rng, topos, mat, vivo, mundo, criadas, W) {
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
  // Varais entre fachadas: um em cada beco (frentes x = ∓13,9 / ∓10,1, corda a 3,05 m) e um sobre a escada no patamar 2
  // (frentes x = ±2,2 em z = -2,3, corda a 8,1 m: panos de frente para quem sobe).
  for (const [x0, z0, x1, z1, y] of [[-13.86, 12.6, -10.14, 12.6, 3.05], [10.14, 12.6, 13.86, 12.6, 3.05], [-2.16, -2.3, 2.16, -2.3, H_TOP + .55]]) { info.panos += varalEntre(F, W, rng, x0, z0, x1, z1, y); info.varais++; }
  // Boca de comércio na parede de fundo do abrigo do mirante (z = -23,3, 4,4 x 3,2 m, lisa): porta de enrolar fechada,
  // toldo, placa e relógio; a parede autoral continua sólida atrás (saliência máxima 12 cm).
  portaDeEnrolar(F, rng, -1.75, .25, H_TOP, -23.3, 2.2);
  toldo(F, rng, -1.9, .4, -23.32, -1, H_TOP + 3.05, [0xa33a2e, 0xd8d2c0]);
  relogio(F, 1.95, H_TOP + 1.25, -23.3, 0, -1);
  F.cor(0x767978).tubo([V(1.9, H_TOP + 1.69, -23.355), V(1.9, H_TOP + 3.15, -23.355)], .016, 4);
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-vida'; grupo.add(malha);
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
  const longe = materialLonge(); criadas.push(longe);
  const res = { value: new THREE.Vector2(1920, 1080) }, W = fiador();
  let voltaHorizonte = () => {};
  if (lig('morro')) { voltaHorizonte = escondeHorizonte(scene); info.morro = morro(grupo, rngDe(opts.semente || 20261115), longe, { casario: lig('casario'), mata: lig('mata') }); }
  const alvos = lig('telhados') || lig('vida') || lig('fachada') ? alvosDeRaio(scene) : [];
  const topos = lig('telhados') || lig('vida') ? telhosJogaveis(scene, mundo, alvos) : [];
  if (lig('telhados')) info.telhados = telhados(grupo, rngDe(7717), topos, mat, medidorDeTopo(alvos));
  if (lig('fachada')) info.fachada = fachada(grupo, rngDe(9311), mundo, mat, alvos);
  if (lig('postes')) info.postes = postes(grupo, rngDe(4051), mundo, mat, W);
  if (lig('vida')) info.vida = vida(grupo, rngDe(5519), topos, mat, () => vivo, mundo, criadas, W);
  if (W.n()) { const mf = materialFio(res); criadas.push(mf); const fios = new THREE.Mesh(W.geo(), mf); fios.name = 'hd-fios'; fios.frustumCulled = false;
    fios.onBeforeRender = (r) => { const t = r.getRenderTarget(); if (t) res.value.set(t.width, t.height); else r.getDrawingBufferSize(res.value); }; grupo.add(fios); info.fios = W.n(); }
  grupo.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.raycast = () => {}; o.userData.nonSolidSurface = true; } });
  scene.add(grupo);
  return { grupo, info, desliga() {
    vivo = false; scene.remove(grupo); voltaHorizonte();
    // Geometria e material dos props moram no cache do mapprops: só as malhas fundidas, os fios e as placas são nossos.
    grupo.traverse((o) => { if (!o.isMesh) return; if (!o.userData.mapPropId) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
    for (const c of criadas) c.dispose();
  } };
}
