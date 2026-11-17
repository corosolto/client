// Cenografia HD do Córrego (só com ?hd=1). NADA aqui tem colisão nem raycast: fios, luminária e nó de fiação nos postes do
// mapa, cano/relógio/gato nas fachadas, caixa d'água azul sobre tijolo e varal nas lajes, lastro de tijolo nos telhados de zinco,
// guia do canal, lixo da margem, nó dos sacos autorais, varal com caimento, pano com bojo no varal autoral, toldo, boca de
// comércio (porta de enrolar + placa + freezer), portões/basculantes de tela nas fachadas livres, kit de viela nos becos, guia de
// sarjeta nas fachadas de rua, guarda tubular das rampas da travessia (a pedido do kit) e skyline de SP com grade de janelas.
// Lê a planta pelos colisores do mundo (casas = caixas ≥ 2,6 m com base ≤ 1,1 m; postes = 0,26 m × 9,4 m).
import * as THREE from 'three';
import { soltaAoSubir } from './hd_cenografia_lajes.js';
import { pintaLetreiro } from './hd_detalhes_lajes.js';

function rngDe(semente) { let s = semente; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
// Malha fundida com cor e normal por vértice (mesmo desenho do Lajes): caixas, tubos, sólidos de revolução e grades suaves
// num draw call. A normal é explícita: a grade (pano com bojo) precisa de normal média, o resto leva a normal da face.
function fundidor() {
  const pos = [], cor = [], nrm = [], c = new THREE.Color(), m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
  const v = Array.from({ length: 8 }, () => new THREE.Vector3()), p3 = new THREE.Vector3(), s3 = new THREE.Vector3(), fn = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const tri = (a, b, d, na, nb, nd) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z); for (let i = 0; i < 3; i++) cor.push(c.r, c.g, c.b);
    if (na) nrm.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nd.x, nd.y, nd.z);
    else { fn.crossVectors(t1.subVectors(b, a), t2.subVectors(d, a)).normalize(); for (let i = 0; i < 3; i++) nrm.push(fn.x, fn.y, fn.z); }
  };
  const quad = (a, b, d, f) => { tri(a, b, d); tri(a, d, f); };
  const emite = () => {
    for (let i = 0; i < 8; i++) v[i].set((i & 1) - .5, (i >> 1) & 1, ((i >> 2) & 1) - .5).applyMatrix4(m);
    quad(v[0], v[2], v[3], v[1]); quad(v[5], v[7], v[6], v[4]); quad(v[4], v[6], v[2], v[0]); quad(v[1], v[3], v[7], v[5]); quad(v[2], v[6], v[7], v[3]); quad(v[4], v[0], v[1], v[5]);
  };
  const F = {
    cor(hex, ganho = 1) { c.setHex(hex).multiplyScalar(ganho); return F; },
    quad(a, b, d, f) { quad(a, b, d, f); return F; }, tri(a, b, d) { tri(a, b, d); return F; },
    // (x, y, z) = centro da base
    caixa(x, y, z, w, h, d, ry = 0, rx = 0, rz = 0) {
      m.compose(p3.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), s3.set(w, h, d)); emite(); return F;
    },
    // Caixa deitada num plano: X = largura (descida), Y = normal do plano, Z = X × Y; base em p.
    caixaEixos(p, X, Y, Z, w, h, d) {
      m.makeBasis(t1.copy(X).multiplyScalar(w), t2.copy(Y).multiplyScalar(h), fn.copy(Z).multiplyScalar(d)).setPosition(p); emite(); return F;
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
    // Grade suave nu × nv: P(s, t) em [0,1]² devolve o ponto; normal média por diferenças centrais (pano, lona).
    grade(P, nu, nv) {
      const pts = [], ns = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pts.push(P(i / nu, j / nv));
      const at = (i, j) => pts[j * (nu + 1) + i];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const du = new THREE.Vector3().subVectors(at(Math.min(nu, i + 1), j), at(Math.max(0, i - 1), j)), dv = new THREE.Vector3().subVectors(at(i, Math.min(nv, j + 1)), at(i, Math.max(0, j - 1)));
        ns.push(du.cross(dv).normalize());
      }
      const nAt = (i, j) => ns[j * (nu + 1) + i];
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { tri(at(i, j), at(i + 1, j), at(i + 1, j + 1), nAt(i, j), nAt(i + 1, j), nAt(i + 1, j + 1)); tri(at(i, j), at(i + 1, j + 1), at(i, j + 1), nAt(i, j), nAt(i + 1, j + 1), nAt(i, j + 1)); }
      return F;
    },
    tris: () => pos.length / 9,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); return soltaAoSubir(g); },
  };
  return F;
}
const catenaria = (A, B, barriga, piso, n = 10) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = new THREE.Vector3().lerpVectors(A, B, t); p.y = Math.max(piso, p.y - barriga * 4 * t * (1 - t)); pts.push(p); } return pts; };

// Fios: fita virada para a câmera (2 vértices por ponto, abertos no vertex shader) com largura real perto e piso de
// FIO_PX px longe. Tubo de 1 cm a 30 m media 0,4 px e virava linha pontilhada que cintila. Um draw call, sem luz.
const FIO_PX = 0.75;   // meia largura mínima em pixels (1,5 px de traço contínuo)
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
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdDir; attribute float hdLado; uniform vec2 hdRes;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 hdC = gl_Position, hdD = projectionMatrix * modelViewMatrix * vec4(transformed + hdDir, 1.0); float hdS = 1.0;
        if (hdD.w < 0.05) { hdD = projectionMatrix * modelViewMatrix * vec4(transformed - hdDir, 1.0); hdS = -1.0; }
        vec2 hdT = hdS * (hdD.xy / max(hdD.w, 0.05) - hdC.xy / max(hdC.w, 0.05)) * hdRes; float hdL = length(hdT);
        hdT = hdL > 1e-4 ? hdT / hdL : vec2(1.0, 0.0);
        float hdPx = max(${FIO_PX.toFixed(2)}, abs(hdLado) * projectionMatrix[1][1] * hdRes.y * 0.5 / max(hdC.w, 0.05));
        gl_Position.xy += vec2(-hdT.y, hdT.x) * sign(hdLado) * hdPx * 2.0 / hdRes * hdC.w; }`);
  };
  mat.customProgramCacheKey = () => 'hd-fios1';
  return mat;
}

// Colisor girado guarda (cx, cz, hx, hz, cos, sin); o alinhado só a AABB. Ponto local (a, b) → mundo.
const caixaDe = (c) => c.cx !== undefined ? { x: c.cx, z: c.cz, hx: c.hx, hz: c.hz, cs: c.cos, sn: c.sin }
  : { x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2, hx: (c.maxX - c.minX) / 2, hz: (c.maxZ - c.minZ) / 2, cs: 1, sn: 0 };
const mundoDe = (k, a, b) => [k.x + a * k.cs + b * k.sn, k.z - a * k.sn + b * k.cs];
// Mundo → local da casa (a ao longo de cs, b ao longo de sn).
const localDe = (k, x, z) => [(x - k.x) * k.cs - (z - k.z) * k.sn, (x - k.x) * k.sn + (z - k.z) * k.cs];
// Face da casa k: eixo 'x' (lados ±a) ou 'z' (lados ±b), s = ±1. n = normal para fora; t = direita de quem olha a fachada
// de fora (texto não espelha); ry = giro de caixa com a largura ao longo da fachada; meia = meia-largura da fachada.
function faceDe(k, eixo, s) {
  const nx = eixo === 'x' ? s * k.cs : s * k.sn, nz = eixo === 'x' ? -s * k.sn : s * k.cs;
  const [fx, fz] = eixo === 'x' ? mundoDe(k, s * (k.hx + .02), 0) : mundoDe(k, 0, s * (k.hz + .02));
  return { k, eixo, s, fx, fz, nx, nz, tx: nz, tz: -nx, ry: eixo === 'x' ? k.ry - Math.PI / 2 : k.ry, meia: eixo === 'x' ? k.hz : k.hx };
}
// A face dá para rua/largo se nenhuma outra casa está a 1,6 m à frente dela (beco de 3 m conta como rua; encosto não).
const faceLivre = (f, casas) => !casas.some((o) => { if (o === f.k) return false; const [a, b] = localDe(o, f.fx + f.nx * 1.6, f.fz + f.nz * 1.6); return Math.abs(a) < o.hx + .3 && Math.abs(b) < o.hz + .3; });

// Casas: um corpo por centro (base ≤ 1,1 m, ≥ 2,6 m de lado, nas fileiras |x| 7,5–19,5); o topo é o maior maxY das caixas com o mesmo centro.
function casasDe(cols) {
  const out = [];
  for (const c of cols) {
    if (!(c.minY <= 1.1 && c.maxY >= 2.2)) continue;
    const k = caixaDe(c);
    if (k.hx < 1.3 || k.hz < 1.3 || Math.abs(k.x) < 7.5 || Math.abs(k.x) > 19.5) continue;
    let topo = c.maxY;
    for (const o of cols) { if (o === c) continue; const q = caixaDe(o); if (Math.abs(q.x - k.x) < .25 && Math.abs(q.z - k.z) < .25 && Math.abs(q.hx - k.hx) < .5 && o.maxY > topo) topo = o.maxY; }
    out.push({ ...k, topo, ry: Math.atan2(k.sn, k.cs) });
  }
  return out;
}
const maisPerto = (casas, x, z) => casas.map((k) => ({ k, d: Math.hypot(k.x - x, k.z - z) })).sort((p, q) => p.d - q.d)[0]?.k;
// Poste autoral: colisor girado por ry×0,4 (map_corrego.js), logo a cruzeta de 1,9 m (base 8,7 m) está em th = atan2/0,4
// e a de 1,4 m (base 8,0 m) em th×0,5+0,5. Sem isso o cabo acabava 0,55 m fora da cruzeta, solto no ar.
const postesDe = (cols) => cols.filter((c) => c.minY < .05 && Math.abs(c.maxY - 9.4) < .06).map(caixaDe).filter((k) => k.hx < .25 && k.hz < .25)
  .map((k) => { const th = Math.atan2(k.sn, k.cs) / .4, th2 = th * .5 + .5; return { ...k, th, th2, cA: Math.cos(th), sA: Math.sin(th), cB: Math.cos(th2), sB: Math.sin(th2) }; });
// Ponta do braço s (±1) da cruzeta alta (0,75 m) e da baixa (0,52 m), onde o isolador senta.
const bracoA = (p, s) => [p.x + s * .75 * p.cA, p.z - s * .75 * p.sA];
const bracoB = (p, s) => [p.x + s * .52 * p.cB, p.z - s * .52 * p.sB];
const ISO_A = 8.84 + .12, ISO_B = 8.12 + .12;   // topo do isolador = ponto de chegada do cabo
// Topo real em (x, z) por raio para baixo: altura, chave de material do que bateu (telha de zinco não recebe caixa) e normal
// de mundo da face (inclinação do telhado, para deitar chapa e tijolo no plano certo).
function medidor(scene) {
  const alvos = [], raio = new THREE.Raycaster(), de = new THREE.Vector3(), baixo = new THREE.Vector3(0, -1, 0);
  const fora = (o) => { for (let p = o; p; p = p.parent) if (/SKY|PIPA|AMBIENT|hd-|HELI|DUMONT/i.test(p.name || '')) return true; return false; };
  scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && o.visible && !fora(o)) alvos.push(o); });
  return (x, z, yMax, yMin) => {
    raio.set(de.set(x, yMax + 2.5, z), baixo); raio.far = yMax + 2.5 - yMin;
    let hit = null; try { hit = raio.intersectObjects(alvos, false)[0]; } catch (e) { hit = null; }
    if (!hit) return null;
    const mats = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
    const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0); if (n.y < 0) n.negate();
    return { y: hit.point.y, chave: mats.map((m) => m?.userData?.hdChave || '').join(','), n };
  };
}

const ESCURO = 0x0b0b0d, FERRO = 0x26221f, PVC = [0xb9b5a6, 0x8d9290, 0xa8a69a];
// Copiado de map_corrego.js (SOBRADOS, RAMPAS, PASS): posições fixas da planta autoral; se a planta mudar, isto muda junto.
const SOBRADOS = [[10.15, -15.1], [-9.7, -18.3], [-16.28, -20.5], [-16.28, -24.6]];
const RAMPAS = [[-1, -33, -27], [1, -13, -7], [-1, 9, 15], [1, 26, 32]];
// Travessia alta: tabuleiro a 5,6 m em |x| ≤ 5 e rampas até |x| 13,6 (z −12,25…−9,75). Todo fio tem de passar ≥ 2,6 m acima.
const PASS = { z: -11, y: 5.6, meiaL: 1.25, x1: 5, x0: 13.6 }, FOLGA = 2.6;
const pisoPass = (x) => { const ax = Math.abs(x); return ax <= PASS.x1 ? PASS.y : ax <= PASS.x0 ? PASS.y * (1 - (ax - PASS.x1) / (PASS.x0 - PASS.x1)) : -9; };
export const folgaPass = (pts) => pts.every((p) => Math.abs(p.z - PASS.z) > PASS.meiaL + .4 || p.y >= pisoPass(p.x) + FOLGA);
// Panos lavados (saturação ≤ 0,22): roupa de varal ao sol de SP é desbotada; os tons puros liam como bandeirinha.
const PANOS = [0xd9d5c8, 0x6b7784, 0xb5ae95, 0x7f8f88, 0xb9c4cf, 0x8c8090, 0x4a525c, 0xd2cbb6, 0x6d8186, 0xc9c0b8];
const PREGADOR = [0xb08a5a, 0x8fa0b0, 0xc9b8a0, 0x9aa88a];
const CABO_MIN = 7.7;   // a travessia alta fica a 5,6 m: cabo entre postes nunca desce abaixo da cabeça de quem anda nela
// Pose `alto` da bancada (hd_lab.js): (−4,6, 5,6, −11) olhando (+x, −z). Prioriza laje/telhado dentro desse cone.
const noAlto = (x, z) => { const dx = x + 4.6, dz = z + 11, d = Math.hypot(dx, dz); return d > 4 && d < 48 && (dx * .7071 - dz * .7071) / d > .72; };

// Postes do mapa: isolador em cada braço real das cruzetas, luminária, transformador, caixa e nó de fiação (caixa de emenda
// com três laços de sobra pendurados); cabos em catenária entre vizinhos, sempre de isolador a isolador (cruzeta alta: um
// cabo por lado; cruzeta baixa: braço virado para o vizinho). Sobre a travessia alta a barriga encolhe até dar folga.
function postes(F, W, rng, lista, ctf) {
  let cabos = 0;
  const livre = (a, b) => !(ctf || []).some((p) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.min(1, Math.max(0, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(a[0] + dx * t - p.x, a[1] + dz * t - p.z) < 3.5; });
  const cabo = (A, B, barriga, n, r) => { let pts = catenaria(A, B, barriga, CABO_MIN, n); for (let i = 0; i < 6 && !folgaPass(pts); i++) { barriga *= .5; pts = catenaria(A, B, barriga, CABO_MIN, n); } W.cor(ESCURO).fio(pts, r); cabos++; };
  const feitos = new Set();
  lista.forEach((p, i) => {
    for (const s of [-1, 1]) { const [ax, az] = bracoA(p, s), [bx2, bz2] = bracoB(p, s); F.cor(0x8e8f8a).caixa(ax, 8.84, az, .07, .12, .07, p.th).cor(0x7d7f7a).caixa(bx2, 8.12, bz2, .06, .12, .06, p.th2); }
    // Luminária pública: braço de 1,1 m ao longo da cruzeta, virado para o canal; é a silhueta que diz "rua de SP".
    const sl = -Math.sign(p.x || 1) * Math.sign(p.cA || 1), bx = p.x + sl * .2 * p.cA, bz = p.z - sl * .2 * p.sA, ex = p.x + sl * 1.15 * p.cA, ez = p.z - sl * 1.15 * p.sA;
    F.cor(0x6d7072).tubo([V(p.x, 7.55, p.z), V(bx, 7.95, bz), V(ex, 8.0, ez)], .028, 4).caixa(ex, 7.86, ez, .5, .13, .22, p.th).cor(0xbfc3bd).caixa(ex, 7.84, ez, .44, .02, .18, p.th);
    if (i % 3 === 0) F.cor(0x5b5f5a).torno(p.x - sl * .42 * p.cA, 6.85, p.z + sl * .42 * p.sA, [[.26, 0], [.3, .12], [.3, .8], [.22, .86], [.1, .9]], 10).cor(FERRO).caixa(p.x - sl * .3 * p.cA, 6.8, p.z + sl * .3 * p.sA, .5, .05, .5, p.th);
    F.cor(0x7a7d7a).caixa(p.x, 4.4, p.z, .34, .5, .22, p.th);
    // Nó de fiação: caixa de emenda cinza na face perpendicular à cruzeta e três laços de cabo sobrando, pendurados abaixo dela.
    const qx = p.sA, qz = p.cA, cx = p.x + qx * .19, cz = p.z + qz * .19;
    F.cor(0x6f7370, .9 + rng() * .2).caixa(cx, 5.95, cz, .24, .34, .14, p.th).cor(0x3a3c3c).caixa(cx + qx * .075, 6.0, cz + qz * .075, .16, .22, .01, p.th);
    for (let k = 0; k < 3; k++) {
      const r = .19 + rng() * .08, cy = 5.55 - k * .07 - r, lx = cx + qx * (.03 + k * .025), lz = cz + qz * (.03 + k * .025), f0 = rng() * 6.28, pts = [];
      for (let t = 0; t <= 14; t++) { const a = f0 + t / 14 * Math.PI * 2; pts.push(V(lx + p.cA * Math.cos(a) * r * 1.15, cy + Math.sin(a) * r, lz - p.sA * Math.cos(a) * r * 1.15)); }
      W.cor(k ? ESCURO : 0x1a1b1d).fio(pts, .009);
    }
    W.cor(ESCURO).fio([V(cx, 5.95, cz), V(cx + qx * .06 + p.cA * .05, 5.3, cz + qz * .06 - p.sA * .05), V(cx + qx * .04, 4.75 + rng() * .3, cz + qz * .04)], .008);
    const viz = lista.map((q, j) => ({ q, j, d: Math.hypot(q.x - p.x, q.z - p.z) })).filter((o) => o.j !== i && o.d < 31).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const { q, j, d } of viz) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (feitos.has(k) || !livre([p.x, p.z], [q.x, q.z])) continue; feitos.add(k);
      const ux = (q.x - p.x) / d, uz = (q.z - p.z) / d, px = uz, pz = -ux;
      // Braço "esquerdo" de cada poste = o que cai do lado negativo da perpendicular ao vão; assim os dois cabos não se cruzam.
      const esq = (o) => (o.cA * px - o.sA * pz) < 0 ? 1 : -1, frente = (o, vx, vz) => (o.cB * vx - o.sB * vz) > 0 ? 1 : -1;
      for (const s of [1, -1]) {
        const [ax, az] = bracoA(p, s * esq(p)), [bx2, bz2] = bracoA(q, s * esq(q));
        cabo(V(ax, ISO_A, az), V(bx2, ISO_A, bz2), Math.min(d * (.03 + rng() * .025), 1.0), Math.max(8, Math.round(d * .7)), .012);
      }
      const [ax, az] = bracoB(p, frente(p, ux, uz)), [bx2, bz2] = bracoB(q, frente(q, -ux, -uz));
      cabo(V(ax, ISO_B, az), V(bx2, ISO_B, bz2), Math.min(d * (.03 + rng() * .025), 1.0), Math.max(8, Math.round(d * .7)), .010);
    }
  });
  return cabos;
}

// Fachadas voltadas para ±x (as que o jogador vê): cano de PVC de descida, relógio de luz com eletroduto, gato pendurado
// e ramal até o poste mais próximo. Tudo com ≤ 12 cm de saliência; o ramal sobe da fachada para o poste (7,85 m, sob a
// cruzeta baixa). Se cruzar a travessia alta com menos de 2,6 m de folga, sai do alto do eletroduto estendido até a laje; se
// nem assim, não é desenhado: cabo a 1,2 m do piso da travessia era o que a pose `alto` mostrava.
function fachadas(F, W, rng, casas, lista, relogios) {
  let n = 0;
  for (const k of casas) for (const s of [-1, 1]) {
    const nx = s * k.cs, nz = -s * k.sn, a = s * (k.hx + .06), topo = k.topo - .25;
    const [cx, cz] = mundoDe(k, a, (rng() < .5 ? 1 : -1) * (k.hz - .35));
    F.cor(PVC[Math.floor(rng() * 2.999)], .85 + rng() * .25).tubo([V(cx, .03, cz), V(cx, topo, cz), V(cx - nx * .09, topo + .09, cz - nz * .09)], .045, 5);
    for (let y = .5; y < topo; y += 1.4) F.cor(0x3a3d3f).caixa(cx - nx * .03, y, cz - nz * .03, .12, .035, .12);
    if (rng() < .8) {
      const b = (rng() < .5 ? 1 : -1) * (k.hz - 1.0), [rx, rz] = mundoDe(k, s * (k.hx + .055), b), y = 1.25 + rng() * .2;
      F.cor(0x8a8d8c, .9 + rng() * .2).caixa(rx, y, rz, .11, .42, .3, k.ry).cor(0x1b1d1e).caixa(rx + nx * .056, y + .2, rz + nz * .056, .012, .14, .16, k.ry)
        .cor(0x767978).tubo([V(rx, y + .43, rz), V(rx, 3.25, rz)], .016, 4).tubo([V(rx, y, rz), V(rx, .06, rz)], .013, 4);
      relogios.push({ x: rx, y: 3.3, z: rz, lado: Math.sign(k.x), topo: k.topo }); n++;
      // Gato: feixe frouxo correndo pela fachada a 2,7 m, caindo até a caixa.
      const pts = [], L = k.hz * 2 - .4; for (let t = 0; t <= 8; t++) { const bb = -k.hz + .2 + L * t / 8, [gx, gz] = mundoDe(k, s * (k.hx + .03), bb); pts.push(V(gx, 2.72 - .06 * Math.sin(t * 1.3) - .04 * (t % 2), gz)); }
      W.cor(0x121315).fio(pts, .011);
    }
  }
  // Ramal: do alto do eletroduto ao poste mais próximo do mesmo lado (≤ 16 m), passando por cima da rua.
  for (const r of relogios) {
    const p = lista.map((q) => ({ q, d: Math.hypot(q.x - r.x, q.z - r.z) })).filter((o) => o.d < 16 && Math.sign(o.q.x) === r.lado).sort((a, b) => a.d - b.d)[0];
    if (!p) continue;
    const B = V(p.q.x, 7.85, p.q.z); let pts = catenaria(V(r.x, r.y, r.z), B, .18, 3.1, 8);
    if (!folgaPass(pts)) {
      const yA = r.topo - .3; pts = catenaria(V(r.x, yA, r.z), B, .12, 3.1, 8);
      if (!folgaPass(pts)) continue;
      F.cor(0x767978).tubo([V(r.x, 3.2, r.z), V(r.x, yA, r.z)], .016, 4);
    }
    W.cor(ESCURO).fio(pts, .009);
  }
  return n;
}

// Laje plana: caixa d'água de polietileno azul de 1 000 L (24 lados, Ø 1,1 × 0,95 m) ou de fibrocimento cinza sobre duas
// fiadas de tijolo com tampo de concreto, no canto oposto ao cubo autoral; antena de TV em metade, parabólica em um quarto;
// varal de laje (dois T de cano, cabo e 3–4 panos) nas lajes dentro do cone da pose `alto` e em 1 em 3 das outras.
// No cone da pose `alto` a única laje plana (9,75; −34,35; topo 8,6) fica ACIMA do olho (7,2 m): só o que passa de ~1 m sobre a
// platibanda (9,0) aparece. Por isso ali vão duas caixas azuis sobre 6 fiadas (topo 10,0), parabólica com braço e o varal.
function base(F, rng, x, y, z, w, d, g, fiadas) {
  const h = fiadas * .07, ga = Math.cos(g), gs = Math.sin(g);
  for (let f = 0; f < fiadas; f += 3) {
    const hf = Math.min(3, fiadas - f) * .07;
    for (const [a, b, ww, dd] of [[0, -d / 2, w, .1], [0, d / 2, w, .1], [-w / 2, 0, .1, d - .2], [w / 2, 0, .1, d - .2]])
      F.cor([0x8a553c, 0x935d44, 0x7f4e38][Math.floor(rng() * 3)], .9 + rng() * .2).caixa(x + a * ga + b * gs, y + f * .07, z - a * gs + b * ga, ww, hf, dd, g);
  }
  F.cor(0x7a776f).caixa(x, y + h, z, w + .02, .04, d + .02, g);
  return y + h + .04;
}
function caixaDagua(F, x, y, z, azul, tom) {
  const cor = azul ? 0x1b4f9c : 0x8f9089, r = azul ? .55 : .5, alt = azul ? .95 : .62;
  F.cor(cor, tom).torno(x, y, z, [[r * .84, 0], [r * .98, alt * .18], [r, alt * .72], [r * .97, alt * .9], [r * .92, alt]], 24)
    .cor(cor, tom * 1.1).torno(x, y + alt, z, [[r * .92, 0], [r * .55, alt * .06], [r * .2, alt * .09]], 24);
  if (azul) for (const f of [.3, .55]) F.cor(cor, tom * .82).torno(x, y + alt * f, z, [[r * 1.01, 0], [r * 1.01, .025]], 24);
  return { r, alt };
}
function lajes(F, W, rng, casas, topo) {
  let n = 0, varais = 0;
  for (const k of casas) {
    // Sobrados jogáveis têm laje andável: nada em cima deles. Laje plana = raio bate na laje de 20 cm (topo + 0,2); telha de zinco bate mais alto.
    if (k.topo < 2.6 || SOBRADOS.some(([sx, sz]) => Math.abs(k.x - sx) < .6 && Math.abs(k.z - sz) < .6)) continue;
    const [x, z] = mundoDe(k, -k.hx * .5, k.hz * .5), h = topo(x, z, k.topo + .8, k.topo - .4);
    // Casa térrea de laje plana também recebe caixa (antes só topo ≥ 5 m: 1 laje em 10 tinha caixa); tolerância 12 cm para puxadinho.
    if (!h || /tex_zinco/.test(h.chave) || Math.abs(h.y - (k.topo + .2)) > .12) continue;
    const y = h.y, alto = noAlto(k.x, k.z), azul = alto || hash2(k.x, k.z) < .7, tom = .85 + rng() * .3, g = k.ry + (rng() - .5) * .3;
    if (alto) {
      // Par de caixas no lado +b (longe do cubo autoral em +a/−b e dos ferros de espera em b = ±(hz − 0,35)); base de 6 fiadas.
      const [bx, bz] = mundoDe(k, k.hx * .4, k.hz * .5), yb = base(F, rng, bx, y, bz, 2.5, 1.3, k.ry, 6);
      for (const a of [k.hx * .4 - .6, k.hx * .4 + .6]) { const [cx, cz] = mundoDe(k, a, k.hz * .5); caixaDagua(F, cx, yb, cz, true, tom * (.94 + rng() * .12)); }
      const [qx, qz] = mundoDe(k, k.hx * .4 - .6, k.hz * .5 + .5), [q2x, q2z] = mundoDe(k, k.hx * .4 - .6, k.hz * .5 + .8);
      F.cor(0x8d9290).tubo([V(qx, yb + .7, qz), V(q2x, yb + .7, q2z), V(q2x, y - .02, q2z)], .02, 4);
      // Parabólica em −a/−b (longe do varal em b = 0 e da antena autoral em −a/+b), mastro de 1,25 m e braço do LNB.
      const [px, pz] = mundoDe(k, -k.hx * .7, -k.hz * .4);
      F.cor(0x5e6163).tubo([V(px, y, pz), V(px, y + 1.25, pz)], .025, 5).cor(0x34302c).caixa(px, y, pz, .22, .08, .22);
      F.cor(0xb9bcb6, .95).torno(px, y + 1.1, pz, [[.04, 0], [.3, .07], [.45, .19], [.47, .22]], 12).cor(0x5e6163).tubo([V(px, y + 1.12, pz), V(px + .22, y + 1.55, pz + .1)], .012, 3).caixa(px + .22, y + 1.52, pz + .1, .07, .07, .07);
    } else {
      const yb = base(F, rng, x, y, z, 1.3, 1.3, g, 2), { r, alt } = caixaDagua(F, x, yb, z, azul, tom);
      F.cor(0x8d9290).tubo([V(x + r * .9, yb + alt * .75, z), V(x + r * 1.45, yb + alt * .75, z), V(x + r * 1.45, y - .02, z)], .02, 4);
      const sel = hash2(k.z, k.x);
      if (sel < .5) { const ax = x - r * 1.6, az = z + r * 1.2, ah = 2.0 + rng(), ry = rng() * 6.28, cs = Math.cos(ry), sn = Math.sin(ry);
        F.cor(0x6f7275).caixa(ax, y, az, .04, ah, .04, ry).caixa(ax + sn * .15, y + ah - .12, az + cs * .15, .03, .03, 1.1, ry);
        for (let i = 0; i < 7; i++) { const t = -.36 + i * .13; F.caixa(ax + sn * (.15 + t), y + ah - .105, az + cs * (.15 + t), .74 - i * .06, .02, .02, ry); }
        F.cor(0x34302c).caixa(ax, y, az, .2, .1, .2, ry); }
      else if (sel < .75) { const [px, pz] = mundoDe(k, k.hx * .6, k.hz * .6);
        F.cor(0x5e6163).tubo([V(px, y, pz), V(px, y + 1.25, pz)], .025, 5).cor(0x34302c).caixa(px, y, pz, .22, .08, .22);
        F.cor(0xb9bcb6, .95).torno(px, y + 1.1, pz, [[.04, 0], [.3, .07], [.45, .19], [.47, .22]], 12).cor(0x5e6163).tubo([V(px, y + 1.12, pz), V(px + .22, y + 1.55, pz + .1)], .012, 3).caixa(px + .22, y + 1.52, pz + .1, .07, .07, .07); }
    }
    // Varal de laje ao longo de `a` em b = 0: entre o cubo autoral (+a/−b) e a caixa do kit (−a/+b); dois T a 1,75 m, cabo e panos.
    const quer = alto || hash2(k.x + 1, k.z) < .34;
    if (quer && k.hx > 1.6) {
      const [x0, z0] = mundoDe(k, -k.hx * .65, 0), [x1, z1] = mundoDe(k, k.hx * .65, 0), L = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / L, dz = (z1 - z0) / L;
      for (const [px, pz] of [[x0, z0], [x1, z1]]) F.cor(0x7c7f7c).tubo([V(px, y, pz), V(px, y + 1.75, pz)], .022, 5).caixa(px, y + 1.72, pz, .05, .05, .5, k.ry).cor(0x4a4c4a).caixa(px, y, pz, .24, .09, .24, k.ry).cor(0x7c7f7c);
      const A = V(x0, y + 1.74, z0), Bv = V(x1, y + 1.74, z1); W.cor(0x1c1b1a).fio(catenaria(A, Bv, .08, y + 1.4), .006);
      let s = .25 + rng() * .2;
      while (s < L - .5) { const w = .32 + rng() * .24; if (s + w > L - .25) break; const t = (s + w / 2) / L, yy = y + 1.74 - .08 * 4 * t * (1 - t) - .012;
        pano(F, rng, x0 + dx * (s + w / 2), yy, z0 + dz * (s + w / 2), dx, dz, w, Math.min(.5 + rng() * .3, yy - y - .15), PANOS[Math.floor(rng() * PANOS.length)]); s += w + .05 + rng() * .1; }
      varais++;
    }
    n++;
  }
  return { lajes: n, varaisLaje: varais };
}

// Telhado de zinco (duas águas): chapa de fibrocimento 1,1 × 2,44 m remendando uma água, e tijolo baiano deitado como lastro
// (2–3 por chapa, mais 3–5 soltos na onda), tudo deitado no plano medido pela normal do raio. Tijolos vão para `L` (uma
// InstancedMesh, um draw call); a chapa vai à malha fundida. O referência (Jaqueline/Vila Sônia) é cinza + laranja.
// Zinco = chave `tex_zinco` OU plano inclinado acima da laje (a chave só existe depois que a textura chega; sem o fallback, a
// cenografia, que roda antes, não punha nada). No cone da pose `alto` a chapa vai na água virada para a câmera, com 4–6 tijolos.
function telhados(F, rng, casas, topo, L) {
  let n = 0;
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), P = new THREE.Vector3(), dh = new THREE.Vector3();
  const plano = (h, k, lado) => {
    Y.copy(h.n); dh.set(h.n.x, 0, h.n.z);
    if (dh.lengthSq() < 1e-4) dh.set(lado * k.cs, 0, -lado * k.sn);
    X.copy(dh).addScaledVector(Y, -dh.dot(Y)).normalize(); Z.crossVectors(X, Y).normalize();
  };
  for (const k of casas) {
    if (k.topo < 5 || SOBRADOS.some(([sx, sz]) => Math.abs(k.x - sx) < .6 && Math.abs(k.z - sz) < .6)) continue;
    let feito = false;
    const alto = noAlto(k.x, k.z), ladoCam = Math.sign(localDe(k, -4.6, -11)[0]) || 1;
    for (const lado of [-1, 1]) {
      const a0 = lado * k.hx * .55, b0 = (rng() - .5) * k.hz * .9, [x, z] = mundoDe(k, a0, b0), h = topo(x, z, k.topo + 1.4, k.topo - .3);
      if (!h || h.n.y < .5 || !(/tex_zinco/.test(h.chave) || (h.n.y < .995 && h.y > k.topo + .25))) continue;
      plano(h, k, lado); feito = true;
      const Xc = X.clone(), Yc = Y.clone(), Zc = Z.clone(), chapa = lado === (alto ? ladoCam : (hash2(k.x, k.z + 7) < .5 ? -1 : 1)), vMax = Math.max(.3, k.hz * .8 - Math.abs(b0));
      if (chapa) {
        P.set(x, h.y, z).addScaledVector(Y, .02);
        F.cor([0x9d9c94, 0xa6a39a, 0x8f8e88][Math.floor(rng() * 3)], .92 + rng() * .16).caixaEixos(P, X, Y, Z, 1.1, .012, 2.44);
        for (let i = 0, m = alto ? 4 + Math.floor(rng() * 3) : 2 + Math.floor(rng() * 2); i < m; i++) L.push({ x, y: h.y + .032, z, X: Xc, Y: Yc, Z: Zc, u: -.4 + rng() * .8, v: -1.0 + (i + rng() * .6) * (2.0 / m), g: (rng() - .5) * .3 });
      }
      for (let i = 0, m = 3 + Math.floor(rng() * 3); i < m; i++) L.push({ x, y: h.y, z, X: Xc, Y: Yc, Z: Zc, u: -.3 + rng() * .6, v: (rng() - .5) * 2 * vMax, g: (rng() - .5) * .5 });
    }
    if (feito) n++;
  }
  return n;
}
function lastro(L, rng) {
  const geo = new THREE.BoxGeometry(.19, .09, .19), mat = new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0, name: 'hd-lastro' });
  const im = new THREE.InstancedMesh(geo, mat, L.length), M = new THREE.Matrix4(), R = new THREE.Matrix4(), c = new THREE.Color(), p = new THREE.Vector3(), X2 = new THREE.Vector3(), Z2 = new THREE.Vector3();
  const CORES = [0x9a5a3a, 0x8c5236, 0xa0634a, 0x6e6b63, 0x94573d];
  L.forEach((e, i) => {
    const cg = Math.cos(e.g), sg = Math.sin(e.g);
    X2.copy(e.X).multiplyScalar(cg).addScaledVector(e.Z, sg); Z2.crossVectors(X2, e.Y);
    p.set(e.x, e.y, e.z).addScaledVector(e.X, e.u).addScaledVector(e.Z, e.v).addScaledVector(e.Y, .045);
    M.makeBasis(X2, e.Y, Z2).setPosition(p); im.setMatrixAt(i, M); im.setColorAt(i, c.setHex(CORES[Math.floor(rng() * CORES.length)]).multiplyScalar(.85 + rng() * .3));
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.frustumCulled = false; im.name = 'hd-lastro'; im.castShadow = false; im.receiveShadow = true;
  return im;
}

// Guia de concreto na beira do canal (|x| = 3,17; 26 cm): pula pontes (z = −22, 0, 22) e rampas (RAMPAS de map_corrego.js) e as pontas assoreadas.
// Afundada 2 cm e com o topo encardido: o topo claro ao sol lia como linha de 1 px correndo rente ao chão.
function guiaCanal(F, rng) {
  let n = 0;
  for (const lado of [-1, 1]) for (let z = -32; z < 32; z += 2) {
    const z1 = Math.min(32, z + 1.98), zm = (z + z1) / 2, h = .24 + (hash2(z, lado) - .5) * .03;
    if ([-22, 0, 22].some((b) => Math.abs(zm - b) < 2.1) || RAMPAS.some(([l, a, b]) => l === lado && zm > a - 1 && zm < b + 1)) continue;
    F.cor(0x8a8a84, .82 + rng() * .3).caixa(lado * 3.17, -.02, zm, .3, h, z1 - z - .02, 0, 0, lado * (rng() - .5) * .02);
    F.cor(0x6a6964, .85 + rng() * .2).caixa(lado * 3.17, h - .02, zm, .31, .012, z1 - z - .02);
    if (rng() < .3) F.cor(0x45443f).caixa(lado * 3.17, h - .01, zm + (rng() - .5), .32, .012, .6);
    n++;
  }
  return n;
}
// Margem do canal (passeio entre a guia e a fileira A, |x| 3,4–4,6): sacos de lixo pretos amarrados, sacolas claras e garrafas
// PET deitadas, longe de ponte, rampa e geladeira. Os tufos de capim são os autorais, reposicionados em map_corrego_hd.js.
function margem(F, rng) {
  let n = 0;
  const vago = (lado, z) => ![-22, 0, 22].some((b) => Math.abs(z - b) < 2.6) && !RAMPAS.some(([l, a, b]) => l === lado && z > a - 1.2 && z < b + 1.2) && Math.abs(Math.abs(z) - 10) > 1.6 && Math.abs(z) < 31;
  for (let i = 0; i < 40 && n < 16; i++) {
    const lado = i % 2 ? 1 : -1, z = -31 + rng() * 62; if (!vago(lado, z)) continue;
    const x = lado * (3.42 + rng() * 1.0), t = n % 5, g = rng() * 6.28;
    if (t < 2) { const s = .26 + rng() * .1, cor = [0x24272a, 0x2c3238, 0x343a35, 0x3a3f44][Math.floor(rng() * 4)];
      F.cor(cor, .9 + rng() * .2).torno(x, 0, z, [[s * .55, 0], [s * 1.05, s * .3], [s * 1.0, s * .75], [s * .6, s * 1.05], [s * .18, s * 1.15], [s * .14, s * 1.35]], 8, g);
      if (rng() < .5) F.cor(cor, 1.05).torno(x + Math.cos(g) * s * 1.2, 0, z + Math.sin(g) * s * 1.2, [[s * .4, 0], [s * .8, s * .25], [s * .7, s * .6], [s * .2, s * .85]], 7, g + 1); }
    else if (t === 2) { F.cor([0xb8b9b2, 0xc9c6b8][Math.floor(rng() * 2)], .95).torno(x, 0, z, [[.09, 0], [.17, .05], [.15, .14], [.06, .2], [.02, .25]], 12, g); }
    else { const cx = Math.cos(g) * .15, cz = Math.sin(g) * .15, cor = [0x8e978e, 0x9aa39a, 0x7f8a86][Math.floor(rng() * 3)];
      F.cor(cor, .95).tubo([V(x - cx, .04, z - cz), V(x + cx * .6, .04, z + cz * .6), V(x + cx, .035, z + cz)], .042, 6).cor(0x2f4a6a).tubo([V(x + cx, .035, z + cz), V(x + cx * 1.15, .034, z + cz * 1.15)], .018, 5);
      if (rng() < .5) F.cor(cor, .95).tubo([V(x + .3, .04, z - .2), V(x + .05, .04, z + .05)], .04, 6); }
    n++;
  }
  return n;
}
// Sacos de lixo autorais (map_corrego.js: 3 dodecaedros de raio s no grupo (−18,05; 0; −3,05), escala (0,75; 1; 0,62), cor pura
// `|252925` `|3d4435` `|24211f`): map_corrego_hd.js achata (y × 0,8) e varia o tamanho (sz) pela chave; aqui vai o nó amarrado
// com duas orelhas no topo de cada um. [x, z, s, sz, chave, cor do kit]. Se a planta mover o trio, isto move junto.
export const SACOS_AUTORAIS = [[-17.70, -2.77, .42, 1.0, '|252925', 0x2c3238], [-17.33, -3.17, .34, 1.14, '|3d4435', 0x363d40, true], [-17.87, -3.47, .30, .86, '|24211f', 0x282c31, true]];
function nosDeSaco(F, rng) {
  for (const [x, z, s, sz, , cor, some] of SACOS_AUTORAIS) {
    if (some) continue;
    const y = s * .62 + .8 * sz * s * .9, g = rng() * 6.28;
    F.cor(cor, 1.15).torno(x, y, z, [[.22 * s, 0], [.13 * s, .06 * s], [.19 * s, .12 * s], [.09 * s, .2 * s], [.04 * s, .26 * s]], 7, g);
    for (const e of [-1, 1]) F.cor(cor, 1.2).caixa(x + Math.cos(g) * e * .08 * s, y + .14 * s, z - Math.sin(g) * e * .08 * s, .2 * s, .012, .09 * s, g, 0, e * .55);
  }
  // No lugar dos dois sacos que somem: sacolas de mercado (branco sujo, azul; 12 lados e achatadas — com 7 liam como poliedro),
  // papelão dobrado encostado e seis tijolos (19 × 9 × 9), dois deles sobre o papelão deitado: 3 inteiros, 2 com o canto
  // quebrado (caixa curta + lasca de meia espessura sobrepostas) e 1 meio tijolo com a quebra em degrau; tudo na malha fundida.
  for (const [x, z, s, cor] of [[-17.3, -3.2, .2, 0xb8b6ad], [-17.05, -3.45, .17, 0x2f4a7a], [-17.6, -3.75, .19, 0xc2bfb3]]) {
    const g = rng() * 6.28; F.cor(cor, .9 + rng() * .2).torno(x, 0, z, [[s * .55, 0], [s * 1.1, s * .28], [s * 1.05, s * .62], [s * .5, s * .88], [s * .14, s * 1.0], [s * .11, s * 1.12]], 12, g);
    F.cor(cor, .95).caixa(x + Math.cos(g) * s * .3, s * 1.1, z + Math.sin(g) * s * .3, s * .25, .01, s * .12, g);
  }
  F.cor(0x7a6a50, .9).caixa(-18.1, 0, -3.3, .62, .42, .03, 1.1, -.28, 0).cor(0x6e6049).caixa(-18.3, 0, -3.6, .5, .02, .4, .4).cor(0x8a7a60).caixa(-18.0, .02, -3.9, .44, .02, .34, 1.9);
  for (const [x, y, z, tipo] of [[-17.55, 0, -2.45, 1], [-17.75, 0, -2.3, 2], [-17.4, 0, -2.2, 0], [-17.95, 0, -2.6, 1], [-18.32, .02, -3.52, 0], [-18.05, .04, -3.95, 0]]) {
    const g = rng() * 3, cs = Math.cos(g), sn = Math.sin(g);   // eixo do comprimento = (cs, −sn) no mundo (giro ry = g)
    F.cor([0x7a4a34, 0x8a5540][Math.floor(rng() * 2)], .9 + rng() * .2);
    if (tipo === 0) F.caixa(x, y, z, .19, .09, .09, g);
    else if (tipo === 2) F.caixa(x, y, z, .10, .09, .09, g).caixa(x + cs * .06, y, z - sn * .06, .025, .07, .05, g);
    else F.caixa(x - cs * .025, y, z + sn * .025, .14, .09, .09, g).caixa(x + sn * .0225, y, z + cs * .0225, .19, .09, .045, g);
  }
  return SACOS_AUTORAIS.length;
}
// Guia de sarjeta: canaleta de 30 cm junto à fachada (a faixa úmida é do shader do chão) fechada por guia de concreto de
// 12 × 7 cm, só nas faces de rua/largo (fileira B para a rua do spawn, barracos da fileira C (|x| 23,05, 1 m de fundo, fora de
// `casas`) para a mesma rua; faces ±z de A e B para beco transversal e largo). A ponta só dobra a esquina (+54 cm) quando a face
// perpendicular também tem guia; senão termina no canto da fachada com um rebaixo de 12 cm (ponta solta lia mal na pose `rua`).
function guias(F, rng, casas, cols) {
  let n = 0;
  const guia = (f, dg, e0, e1) => {
    const r0 = e0 ? 0 : .12, r1 = e1 ? 0 : .12;
    const L = f.meia * 2 + e0 + e1 - r0 - r1, off = (e1 - e0 - r1 + r0) / 2, gx = f.fx + f.nx * dg, gz = f.fz + f.nz * dg, cx = gx + f.tx * off, cz = gz + f.tz * off;
    F.cor(0x9c9b93, .86 + rng() * .22).caixa(cx, -.01, cz, L, .08, .12, f.ry).cor(0x6e6d67).caixa(cx, .07, cz, L, .008, .13, f.ry);
    for (const [e, r] of [[-1, r0], [1, r1]]) if (r) { const u = e * (f.meia - .06); F.cor(0x8f8e87, .9).caixa(gx + f.tx * u, -.01, gz + f.tz * u, .12, .045, .12, f.ry); }
    if (rng() < .6) F.cor(0x4c4b46).caixa(cx + f.tx * (rng() - .5) * L * .6, .07, cz + f.tz * (rng() - .5) * L * .6, .5, .009, .14, f.ry);
    n++;
  };
  for (const k of casas) {
    const faces = [faceDe(k, 'z', -1), faceDe(k, 'z', 1)]; if (Math.abs(Math.abs(k.x) - 16.95) < 1.2) faces.push(faceDe(k, 'x', Math.sign(k.x)));
    const livres = faces.filter((f) => faceLivre(f, casas)), tem = (eixo, s) => livres.some((f) => f.eixo === eixo && f.s === s);
    for (const f of livres) {
      // t = s·(+a) na face z e −s·(+b) na face x: a face perpendicular na ponta e tem sinal s·e (z) ou −s·e (x).
      // Guia a 1,26 m da fachada quando há rua à frente (nada a 3,4 m): fecha a calçada de 1,2 m que o shader do chão pinta em
      // concreto claro; beco transversal estreito mantém a guia a 48 cm. A esquina só dobra à mesma distância da face perpendicular.
      const dg = faceLivre({ ...f, fx: f.fx + f.nx * 1.8, fz: f.fz + f.nz * 1.8 }, casas) ? 1.26 : .48;
      const ext = (e) => (f.eixo === 'z' ? tem('x', f.s * e) : tem('z', -f.s * e)) ? dg + .06 : 0;
      guia(f, dg, ext(-1), ext(1));
    }
  }
  // Fileira C: a face de rua (|x| ≈ 22,45) fecha a calçada que o shader pinta até lá; sem esquina, rebaixo nas duas pontas.
  for (const c of cols || []) {
    if (!(c.minY <= 1.1 && c.maxY >= 2.2)) continue;
    const k = caixaDe(c); if (Math.abs(k.x) < 22.5 || Math.abs(k.x) > 23.6 || k.hx > .9 || k.hz < 1.2) continue;   // o muro externo (|x| 24, hx 0,25) fica de fora
    guia(faceDe({ ...k, ry: Math.atan2(k.sn, k.cs) }, 'x', -Math.sign(k.x)), 1.26, 0, 0);
  }
  return n;
}

// Guarda tubular das rampas da travessia alta (só com a travessia de concreto de map_corrego_hd.js, que descarta a mureta
// autoral da rampa: ela flutuava 23 cm sobre a laje e acabava sem montante): corrimão a 0,81 m e barra a 0,44 m seguindo
// pisoPass de |x| 5 ao pé, 7 montantes do piso ao corrimão com pé enferrujado (o último em |x| 13,52, o mesmo do shader), tampa
// fechando o tubo em 13,56 — nada passa de 13,6 (pé da rampa) — e chapa de base sob os montantes do vão (os do shader, a cada
// 1,4 m); z −11 ± 1,25, como a caixa autoral do vão. Mesma tinta do shader.
function guardaTravessia(F, rng) {
  let n = 0;
  const TINTA = 0xbfa052, FERRO_PE = 0x4a2e1e;
  for (const lado of [-1, 1]) for (const dz of [-PASS.meiaL, PASS.meiaL]) {
    const z = PASS.z + dz, P = (ax, h) => V(lado * ax, Math.max(0, pisoPass(lado * ax)) + h, z);
    F.cor(TINTA, .9 + rng() * .2).tubo([P(PASS.x1 - .03, .81), P(PASS.x0 - .04, .81)], .045, 8).cor(TINTA, .85 + rng() * .2).tubo([P(PASS.x1 - .03, .44), P(PASS.x0 - .04, .44)], .03, 8);
    F.cor(TINTA, .9).caixa(lado * (PASS.x0 - .04), .765, z, .04, .09, .09);
    for (let k = 0; k <= 6; k++) {
      const ax = PASS.x1 + .05 + (PASS.x0 - PASS.x1 - .13) * k / 6;
      F.cor(TINTA, .85 + rng() * .25).tubo([P(ax, .11), P(ax, .84)], .03, 8).cor(FERRO_PE, .9 + rng() * .2).tubo([P(ax, 0), P(ax, .11)], .032, 8);
      n++;
    }
  }
  for (const dz of [-PASS.meiaL, PASS.meiaL]) for (let k = -3; k <= 4; k++) F.cor(0x6a5a44, .9).caixa(k * 1.4 - .67, PASS.y, PASS.z + dz, .13, .012, .13);
  return n;
}

// Pano pendurado em (cx, y, cz) com o varal na direção (dx, dz): lençol (listra opcional), camisa ou calça, em grade 4×3 com
// bojo de 5–8 cm (mais embaixo e no meio, com uma dobra de 3 ondas) e normal média; dois pregadores no topo.
function pano(F, rng, cx, y, cz, dx, dz, w, h, cor) {
  const nx = -dz, nz = dx, vai = (rng() - .5) * .05, tipo = rng(), bojo = .05 + rng() * .03, fase = rng() * 6.28;
  const Q = (u, v, fora = 0) => { const b = bojo * Math.sin(Math.PI * Math.min(1, Math.max(0, u + .5))) * (.25 + .75 * v) + bojo * .35 * Math.sin(3.1 * Math.PI * (u + .5) + fase) * v;
    return V(cx + dx * u * w + nx * (vai * v + fora + b), y - v * h, cz + dz * u * w + nz * (vai * v + fora + b)); };
  // quadrilátero (u, v) nos cantos [s0t0, s1t0, s0t1, s1t1] como grade bilinear
  const bil = (c, nu, nv, fora = 0) => F.grade((s, t) => Q(lerp(lerp(c[0][0], c[1][0], s), lerp(c[2][0], c[3][0], s), t), lerp(lerp(c[0][1], c[1][1], s), lerp(c[2][1], c[3][1], s), t), fora), nu, nv);
  let preg = [-.42, .42];
  if (tipo < .4) { F.cor(cor, .85 + rng() * .3); bil([[-.5, 0], [.5, 0], [-.5, 1], [.5, 1]], 4, 3); if (rng() < .6) { F.cor(PANOS[Math.floor(rng() * PANOS.length)], .9); bil([[-.5, .58], [.5, .58], [-.5, .74], [.5, .74]], 4, 1, .004); } }
  else if (tipo < .76) { F.cor(cor, .85 + rng() * .3); bil([[-.34, .06], [.34, .06], [-.36, 1], [.36, 1]], 4, 3);
    F.quad(Q(-.34, 0), Q(-.12, 0), Q(-.12, .08), Q(-.34, .08)).quad(Q(.12, 0), Q(.34, 0), Q(.34, .08), Q(.12, .08));
    bil([[-.34, .06], [-.52, .04], [-.36, .40], [-.60, .34]], 2, 2); bil([[.52, .04], [.34, .06], [.60, .34], [.36, .40]], 2, 2); preg = [-.23, .23]; }
  else { F.cor(cor, .8 + rng() * .3); bil([[-.5, 0], [.5, 0], [-.5, .24], [.5, .24]], 4, 1);
    bil([[-.5, .24], [-.06, .24], [-.46, 1], [-.10, 1]], 2, 3); bil([[.06, .24], [.5, .24], [.10, 1], [.46, 1]], 2, 3); }
  const ry = Math.atan2(-dz, dx);
  for (const u of preg) F.cor(PREGADOR[Math.floor(rng() * PREGADOR.length)], .9 + rng() * .2).caixa(cx + dx * u * w, y - .045, cz + dz * u * w, .014, .075, .024, ry);
}
// Varal com caimento atravessando o beco 1 (de fachada A a fachada B), com panos pendurados; vão livre ≥ 2,45 m.
function varais(F, W, rng, casas) {
  const A = casas.filter((k) => Math.abs(Math.abs(k.x) - 9.75) < 1), B = casas.filter((k) => Math.abs(Math.abs(k.x) - 16.95) < 1);
  let n = 0;
  for (const kb of B) {
    if (hash2(kb.x, kb.z + 3) > .7 || n >= 10) continue;
    const ka = A.filter((k) => Math.sign(k.x) === Math.sign(kb.x) && Math.abs(k.z - kb.z) < 1.6).sort((p, q) => Math.abs(p.z - kb.z) - Math.abs(q.z - kb.z))[0]; if (!ka) continue;
    const s = -Math.sign(kb.x), [x0, z0] = mundoDe(kb, s * (kb.hx + .02), (rng() - .5) * kb.hz), [x1, z1] = mundoDe(ka, -s * (ka.hx + .02), (rng() - .5) * ka.hz);
    const y = 3.15 + rng() * .3, Aa = V(x0, y, z0), Bb = V(x1, y + .1, z1), L = Aa.distanceTo(Bb), dx = (x1 - x0) / L, dz = (z1 - z0) / L, barriga = .12, alt = (t) => y - barriga * 4 * t * (1 - t);
    W.cor(0x1c1b1a).fio(catenaria(Aa, Bb, barriga, 2.6), .006); F.cor(0x55524c).caixa(x0, y - .05, z0, .05, .14, .05).caixa(x1, y + .05, z1, .05, .14, .05);
    // Feixe de fios (gato) cruzando o beco meio metro acima do varal, preso nas duas fachadas.
    W.cor(ESCURO).fio(catenaria(V(x0 + dx * .3, y + .55, z0 + dz * .3), V(x1 - dx * .3, y + .7, z1 - dz * .3), .22, 2.6), .012); F.cor(0x3a3d3f).caixa(x0 + dx * .3, y + .5, z0 + dz * .3, .1, .1, .06).caixa(x1 - dx * .3, y + .65, z1 - dz * .3, .1, .1, .06);
    let sIni = .25 + rng() * .2;
    while (sIni < L - .4) { const w = .3 + rng() * .26; if (sIni + w > L - .2) break; const t = (sIni + w / 2) / L, yy = alt(t) - .012, h = Math.min(.42 + rng() * .3, yy - 2.45);
      if (h > .2) pano(F, rng, x0 + dx * (sIni + w / 2), yy, z0 + dz * (sIni + w / 2), dx, dz, w, h, PANOS[Math.floor(rng() * PANOS.length)]); sIni += w + .04 + rng() * .1; }
    n++;
  }
  return n;
}

// Pano no varal autoral (map_corrego.js: cabo reto de 4,2 m a 3,2 m, 12 varais): os retângulos de cor pura vão a escala
// zero no kit e aqui entram camisa, calça e lençol pendurados no mesmo cabo. Posições copiadas da planta.
const VARAIS_AUTORAIS = [[-18.4, 13.65], [-3.2, 13.65], [16.8, 13.65], [28.4, 13.65], [-29.0, 6.0], [9.6, 6.0]];
function roupas(F, rng) {
  let n = 0;
  for (const lado of [-1, 1]) for (const [z, xv] of VARAIS_AUTORAIS) {
    const x = lado * xv; let s = -1.75 + rng() * .3;
    while (s < 1.7) { const w = .32 + rng() * .28; if (s + w > 1.95) break;
      pano(F, rng, x, 3.19, z + s + w / 2, 0, 1, w, .5 + rng() * .3, PANOS[Math.floor(rng() * PANOS.length)]); s += w + .05 + rng() * .12; }
    n++;
  }
  return n;
}

// Toldo listrado com dois tirantes na fachada f (faceDe), com a aba a `y`; `placa` = placa cega acima (sem texto).
function toldoEm(F, f, y, cores, placa) {
  const { fx, fz, nx, nz, tx, tz } = f, W = 1.9, D = .8;
  const P = (u, v, dy = 0) => V(fx + tx * u * W + nx * v * D, y + dy - v * .25, fz + tz * u * W + nz * v * D);
  for (let i = 0; i < 8; i++) { const u0 = -.5 + i / 8, u1 = u0 + 1 / 8; F.cor(cores[i % 2], .9).quad(P(u0, 0), P(u1, 0), P(u1, 1), P(u0, 1)).quad(P(u0, 1), P(u1, 1), P(u1, 1, -.14), P(u0, 1, -.14)); }
  F.cor(0x4a4c4e); for (const u of [-.48, .48]) { F.tubo([P(u, 0, .02), P(u, 1, .02)], .018, 4).tubo([P(u, 1, .0), P(u, 0, .6)], .014, 3); }
  if (placa) F.cor(0xe0d8b8, .9).caixa(fx + nx * .04, y + .35, fz + nz * .04, W + .1, .46, .06, f.ry).cor(cores[0], .8).caixa(fx + nx * .075, y + .4, fz + nz * .075, W - .3, .14, .01, f.ry);
}
const CORES_TOLDO = [[0xb23a2e, 0xe8e2d2], [0x1f4f7a, 0xe8e2d2], [0x2f6b3a, 0xe2d9b8]];
// Mercadinho/bar de porta: toldo listrado e placa cega acima, em 3 fachadas da fileira B viradas para o beco 1.
function toldos(F, rng, casas) {
  const B = casas.filter((k) => Math.abs(Math.abs(k.x) - 16.95) < 1), alvos = [];
  for (const bz of [-21, -8.7, 11.1, 24.3]) { const k = B.filter((c) => !alvos.includes(c)).sort((p, q) => Math.abs(p.z - bz) - Math.abs(q.z - bz))[0]; if (k) alvos.push(k); }
  let n = 0;
  for (const k of alvos.slice(0, 3)) { toldoEm(F, faceDe(k, 'x', -Math.sign(k.x)), 2.3, CORES_TOLDO[n % 3], true); n++; }
  return n;
}

// Malha com UV para o que precisa de textura (porta de enrolar e placa escrita): um mesh, um material, uma tela.
function texturador() {
  const pos = [], uv = [];
  const T = {
    // quad a-b-c-d (anti-horário visto de frente) com UV [u0,v0]–[u1,v1]
    quad(a, b, c, d, u0, v0, u1, v1) {
      for (const [p, u, v] of [[a, u0, v0], [b, u1, v0], [c, u1, v1], [a, u0, v0], [c, u1, v1], [d, u0, v1]]) { pos.push(p.x, p.y, p.z); uv.push(u, v); }
      return T;
    },
    n: () => pos.length / 18,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return soltaAoSubir(g); },
  };
  return T;
}
// Tela 1024 × 1024 (flipY: v = 1 − y/1024): porta de aço de enrolar cinza (0,0–512,512) e variante pintada/riscada com respingo
// da cor da fachada (0,512–512,1024); duas placas de letrista de 512 × 120 (512,0 / 512,128; proporção 4,2:1 da placa de
// 2,2 × 0,52 m; frases genéricas, sem marca); basculante 1 × 1 m sem e com grade (512,256 / 768,256, 256²); portão de grade
// cinza 1 × 2 m (512,512–768,1024) e portão de chapa óxido 1 × 2 m (768,512–1024,1024). Letras de hd_detalhes_lajes.js.
function telaComercio() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d'), r = rngDe(8821);
  const enrolar = (y0, base, lam, passo, tinta) => {
    g.fillStyle = base; g.fillRect(0, y0, 512, 512);
    for (let y = y0 + 8; y < y0 + 484; y += passo) {
      g.fillStyle = lam(); g.fillRect(30, y, 452, passo - 8);
      g.fillStyle = 'rgba(36,40,44,.6)'; g.fillRect(30, y + passo - 8, 452, 5); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(30, y + 1, 452, 2);
    }
    g.fillStyle = '#383c3f'; g.fillRect(0, y0, 30, 512); g.fillRect(482, y0, 30, 512); g.fillRect(24, y0 + 486, 464, 26);
    g.fillStyle = '#2a2d2f'; g.fillRect(220, y0 + 492, 72, 10);
    for (let i = 0; i < 46; i++) { const y = y0 + 300 + Math.pow(r(), .6) * 190; g.fillStyle = `rgba(${88 + r() * 30 | 0},${58 + r() * 18 | 0},${34 + r() * 10 | 0},${.12 + r() * .3})`; g.fillRect(30 + r() * 440, y, 3 + r() * 14, 2 + r() * 36 * (y - y0 - 290) / 190); }
    if (tinta) {
      // Tinta descascada em placas, riscos horizontais de chave/pedra e respingo verde da faixa da fachada no pé.
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(90,94,98,${.35 + r() * .5})`; g.fillRect(30 + r() * 440, y0 + r() * 480, 6 + r() * 40, 3 + r() * 9); }
      for (let i = 0; i < 28; i++) { g.fillStyle = `rgba(230,232,228,${.2 + r() * .4})`; g.fillRect(40 + r() * 380, y0 + 60 + r() * 380, 20 + r() * 110, 1 + r() * 2); }
      for (let i = 0; i < 120; i++) { const y = y0 + 400 + Math.pow(r(), .7) * 90; g.fillStyle = `rgba(31,106,58,${.25 + r() * .5})`; g.fillRect(30 + r() * 450, y, 1 + r() * 5, 1 + r() * 4); }
    }
  };
  enrolar(0, '#585d61', () => `rgb(${126 + r() * 18 | 0},${132 + r() * 16 | 0},${136 + r() * 14 | 0})`, 22, false);
  enrolar(512, '#4e4a3e', () => `rgb(${168 + r() * 16 | 0},${150 + r() * 14 | 0},${92 + r() * 14 | 0})`, 26, true);
  const placa = (y, fundo, borda, texto, cor, px) => {
    g.fillStyle = fundo; g.fillRect(512, y, 512, 120); g.strokeStyle = borda; g.lineWidth = 5; g.strokeRect(520, y + 8, 496, 104);
    pintaLetreiro(g, r, texto, 530, y + 60, 476, px, cor);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(58,50,42,${.04 + r() * .1})`; g.fillRect(512 + r() * 512, y + r() * 120, 2 + r() * 18, 2 + r() * 30); }
  };
  placa(0, '#e6dcb9', '#163f27', 'BAR DO ZÉ · GELADA', '#163f27', 68);
  placa(128, '#d6bf4c', '#1d3f8a', 'MERCADINHO', '#1d3f8a', 76);
  // Basculante de alumínio (3 folhas inclinadas, vidro azulado com reflexo em diagonal); a 2ª célula leva grade de ferro.
  const basc = (x0, grade) => {
    g.fillStyle = '#9a9c98'; g.fillRect(x0, 256, 256, 256); g.fillStyle = '#2b3238'; g.fillRect(x0 + 14, 270, 228, 228);
    for (let k = 0; k < 3; k++) { const y = 272 + k * 76; const gr = g.createLinearGradient(x0, y, x0 + 256, y + 70); gr.addColorStop(0, '#6f8796'); gr.addColorStop(.5, '#a8bcc6'); gr.addColorStop(1, '#5a7080');
      g.fillStyle = gr; g.fillRect(x0 + 18, y, 220, 64); g.fillStyle = 'rgba(20,24,28,.55)'; g.fillRect(x0 + 18, y + 58, 220, 8); g.fillStyle = '#b9bbb6'; g.fillRect(x0 + 18, y - 2, 220, 4); }
    if (grade) { g.fillStyle = '#34373a'; for (let i = 0; i < 4; i++) g.fillRect(x0 + 34 + i * 56, 262, 9, 244); g.fillRect(x0 + 10, 330, 236, 8); g.fillRect(x0 + 10, 430, 236, 8); }
    for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(70,60,50,${.08 + r() * .2})`; g.fillRect(x0 + r() * 256, 256 + r() * 256, 2 + r() * 10, 2 + r() * 14); }
  };
  basc(512, false); basc(768, true);
  // Portão de grade (1 × 2 m): quintal escuro atrás, barras verticais cinza-chumbo pintadas, chapa lisa nos 60 cm de baixo, fechadura.
  g.fillStyle = '#1b1c1e'; g.fillRect(512, 512, 256, 512);
  g.fillStyle = '#6e7276'; for (let i = 0; i < 7; i++) g.fillRect(528 + i * 34, 520, 9, 496); g.fillRect(520, 520, 232, 10); g.fillRect(520, 700, 232, 8); g.fillRect(520, 1006, 232, 10);
  g.fillStyle = '#5d6165'; g.fillRect(520, 860, 232, 156); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(520, 860, 232, 6);
  g.fillStyle = '#2d2f31'; g.fillRect(728, 780, 18, 40); g.fillStyle = '#c9b25a'; g.fillRect(733, 790, 8, 8);
  for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(110,70,40,${.1 + r() * .35})`; g.fillRect(520 + r() * 232, 860 + r() * 156, 2 + r() * 8, 2 + r() * 20); }
  // Portão de chapa com zarcão oxidado (1 × 2 m): chapa marrom-alaranjada com 3 nervuras horizontais, escorrido de ferrugem e dobradiças.
  g.fillStyle = '#6a3f2c'; g.fillRect(768, 512, 256, 512);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${40 + r() * 30 | 0},${22 + r() * 14 | 0},${12 + r() * 8 | 0},${.1 + r() * .3})`; g.fillRect(768 + r() * 256, 512 + r() * 512, 3 + r() * 30, 2 + r() * 40); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${150 + r() * 40 | 0},${85 + r() * 30 | 0},${30 + r() * 20 | 0},${.12 + r() * .3})`; g.fillRect(768 + r() * 256, 512 + r() * 512, 6 + r() * 30, 3 + r() * 10); }
  for (const y of [560, 760, 960]) { g.fillStyle = '#7a4a34'; g.fillRect(776, y, 240, 14); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(776, y + 14, 240, 5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(776, y - 2, 240, 3); }
  g.fillStyle = '#3a3634'; g.fillRect(768, 512, 8, 512); for (const y of [600, 900]) g.fillRect(768, y, 20, 40);
  g.fillStyle = '#2b2a28'; g.fillRect(990, 770, 18, 48); g.fillStyle = '#a8a088'; g.fillRect(996, 780, 6, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'hd-comercio';
  return t;
}
// Boca de comércio em fachadas que as poses da bancada enquadram: `rua`/`parede` veem a face −z da casa A(−9,75; 2,6) no
// largo do spawn; `ponte` vê a face +x (lado do canal) da casa A(−9,75; −24,9). Cada boca: faixa pintada na parede, porta de
// enrolar 1,6 × 2,2 m com batente, placa de letrista 2,2 × 0,52 m acima da cinta da laje (à FRENTE do fundo escuro: antes o
// fundo de 4 cm cobria a tela e a fascia ficava sem letreiro), toldo, freezer branco com caixa de isopor em cima e engradado.
// A porta autoral da casa fica na face +z (local a = 0,6), fora destas duas faces.
const BOCAS = [{ x: -9.75, z: 2.6, eixo: 'z', s: -1, faixa: 0x1f6a3a }, { x: -9.75, z: -24.9, eixo: 'x', s: 1, faixa: 0x1d3f8a }];
function comercio(F, T, rng, casas) {
  let n = 0;
  for (const b of BOCAS) {
    const k = maisPerto(casas, b.x, b.z); if (!k) continue;
    const f = faceDe(k, b.eixo, b.s), { fx, fz, nx, nz, tx, tz } = f, P = (u, y, fora) => V(fx + tx * u + nx * fora, y, fz + tz * u + nz * fora), v0 = n ? .7578125 : .8828125;   // tela: flipY, placa 1 em cima
    // Faixa pintada colada na alvenaria acima do embasamento (que avança 8 cm até 1,05 m; a face fx já está 2 cm à frente da parede).
    F.cor(b.faixa, .8).caixa(fx - nx * .012, 1.05, fz - nz * .012, 2.6, 1.51, .016, f.ry);
    // batente e soleira de concreto à frente do embasamento (8 cm); porta de enrolar 10,5 cm à frente da face
    F.cor(0x7c7a74, .9).caixa(fx + nx * .04, 0, fz + nz * .04, 1.9, 2.32, .12, f.ry).cor(0x5a5955).caixa(fx + nx * .1, 0, fz + nz * .1, 1.9, .06, .12, f.ry);
    // 2ª boca usa a lâmina pintada/riscada; caixa cilíndrica do rolo em cima do vão e guias laterais em U dos dois lados.
    T.quad(P(-.8, .04, .105), P(.8, .04, .105), P(.8, 2.24, .105), P(-.8, 2.24, .105), 0, n ? 0 : .5, .5, n ? .5 : 1);
    F.cor(0x5a5d60, .95).caixa(fx + nx * .13, 2.24, fz + nz * .13, 1.96, .27, .26, f.ry).cor(0x3e4144).caixa(fx + nx * .265, 2.24, fz + nz * .265, 1.96, .05, .012, f.ry);
    for (const u of [-.86, .86]) F.cor(0x4a4d50).caixa(fx + tx * u + nx * .11, .06, fz + tz * u + nz * .11, .05, 2.26, .07, f.ry);
    F.cor(0x3c3e40).caixa(fx + nx * .012, 2.95, fz + nz * .012, 2.28, .58, .03, f.ry);
    T.quad(P(-1.1, 2.98, .05), P(1.1, 2.98, .05), P(1.1, 3.5, .05), P(-1.1, 3.5, .05), .5, v0, 1, v0 + .1171875);   // 120 px: com 240 a placa 1 cabia só na metade de baixo
    toldoEm(F, f, 2.42, CORES_TOLDO[(n + 1) % 3], false);
    // Freezer horizontal (0,95 × 0,86 × 0,58) encostado à direita da porta, com isopor em cima; engradado à esquerda.
    const ux = fx + tx * 1.5 + nx * .36, uz = fz + tz * 1.5 + nz * .36;
    F.cor(0x8d8f8a).caixa(ux, 0, uz, .95, .07, .58, f.ry).cor(0xc4c8c4, .95).caixa(ux, .07, uz, .95, .79, .58, f.ry).cor(0x3a3d3f).caixa(ux, .78, uz, .97, .02, .6, f.ry)
      .cor(0x2f3335).caixa(ux + nx * .29, .5, uz + nz * .29, .5, .03, .02, f.ry);
    F.cor(0xd8d9d2).caixa(ux - tx * .12, .88, uz - tz * .12, .56, .36, .4, f.ry + .15).cor(0x9b9c95).caixa(ux - tx * .12, 1.18, uz - tz * .12, .58, .014, .42, f.ry + .15);
    F.cor(0x2f4a6a, .9).caixa(fx - tx * 1.35 + nx * .2, 0, fz - tz * 1.35 + nz * .2, .36, .3, .28, f.ry + .2).cor(0x8e978e).caixa(fx - tx * 1.35 + nx * .2, .3, fz - tz * 1.35 + nz * .2, .3, .26, .22, f.ry + .2);
    n++;
  }
  return n;
}

// Faces de fachada candidatas a portão/janela: ±z de toda casa, a face externa da fileira B (|x| ≈ 16,95) e a face da fileira A
// (|x| ≈ 9,75) voltada para a rua do canal. Sem as bocas de comércio.
function facesDe(k, casas) {
  const faces = [faceDe(k, 'z', -1), faceDe(k, 'z', 1)];
  if (Math.abs(Math.abs(k.x) - 16.95) < 1.2) faces.push(faceDe(k, 'x', Math.sign(k.x)));
  if (Math.abs(Math.abs(k.x) - 9.75) < 1.2) faces.push(faceDe(k, 'x', -Math.sign(k.x)));
  return faces.filter((f) => faceLivre(f, casas) && !BOCAS.some((b) => b.eixo === f.eixo && b.s === f.s && maisPerto(casas, b.x, b.z) === k));
}
// Portão no térreo das fachadas livres (1 por face de ≥ 3,2 m, 2 a partir de 7 m): batente de concreto de 14 cm saindo 22 cm da
// face (passa o embasamento de 8 cm), folha da tela 11 cm atrás do batente, soleira e cadeado. Grade de 1 × 2 m, chapa de
// 1 × 2 m ou chapa de 2 folhas 2,2 × 2,1 m (célula espelhada). Na face +z a porta autoral está em u = 0,6: nada a < 1,3 m dela.
function portoes(F, T, rng, casas) {
  let n = 0;
  for (const k of casas) for (const f of facesDe(k, casas)) {
    const L = f.meia * 2; if (L < 3.2) continue;
    const { fx, fz, nx, nz, tx, tz } = f, P = (u, y, fora) => V(fx + tx * u + nx * fora, y, fz + tz * u + nz * fora);
    const us = L >= 7 ? [-f.meia * .5, f.meia * .5] : [(rng() - .5) * (L - 2.6)];
    for (const u of us) {
      if (f.eixo === 'z' && f.s === 1 && Math.abs(u - .6) < 1.3) continue;
      if (f.eixo === 'x' && Math.abs(u) > f.meia - 1.6) continue;
      const t = hash2(k.x + u, k.z + f.s), grade = t < .42, dupla = t >= .78, w = dupla ? 2.2 : 1.0, h = dupla ? 2.1 : 2.0, u0 = grade ? .5 : .75;
      F.cor(0x8f8d86, .9 + rng() * .15);
      for (const e of [-1, 1]) F.caixa(fx + tx * (u + e * (w / 2 + .07)) + nx * .11, 0, fz + tz * (u + e * (w / 2 + .07)) + nz * .11, .14, h + .12, .22, f.ry);
      F.caixa(fx + tx * u + nx * .11, h, fz + tz * u + nz * .11, w + .28, .14, .22, f.ry).cor(0x6f6d67).caixa(fx + tx * u + nx * .16, 0, fz + tz * u + nz * .16, w + .28, .035, .32, f.ry);
      if (dupla) { T.quad(P(u - 1.1, .03, .09), P(u, .03, .09), P(u, h, .09), P(u - 1.1, h, .09), .75, 0, 1, .5).quad(P(u, .03, .09), P(u + 1.1, .03, .09), P(u + 1.1, h, .09), P(u, h, .09), 1, 0, .75, .5);
        F.cor(0x2b2a28).caixa(fx + tx * u + nx * .1, 1.0, fz + tz * u + nz * .1, .04, .5, .03, f.ry); }
      else T.quad(P(u - .5, .03, .09), P(u + .5, .03, .09), P(u + .5, h, .09), P(u - .5, h, .09), u0, 0, u0 + .25, .5);
      // Cadeado com corrente curta no lado da fechadura.
      const uc = dupla ? u : u + .42; F.cor(0x8a7a3a).caixa(fx + tx * uc + nx * .105, .98, fz + tz * uc + nz * .105, .035, .05, .022, f.ry).cor(0x5b5a56).caixa(fx + tx * uc + nx * .105, 1.03, fz + tz * uc + nz * .105, .028, .035, .012, f.ry);
      n++;
    }
  }
  return n;
}
// Basculante 1 × 1,2 m com grade no pavimento de cima (tijolo cru: y de topo − 2,8) das fachadas livres ±z de casas de ≥ 2 pavimentos;
// aro de concreto de 6 cm e peitoril escuro. Na face +z a janela autoral está em u = 0,6 (só a célula −meia·0,45 e, se couber, +meia·0,6).
function basculantes(F, T, rng, casas) {
  let n = 0;
  for (const k of casas) {
    if (k.topo < 5.5) continue;
    for (const f of facesDe(k, casas)) {
      if (f.eixo !== 'z' || f.meia < 1.6) continue;
      const { fx, fz, nx, nz, tx, tz } = f, P = (u, y, fora) => V(fx + tx * u + nx * fora, y, fz + tz * u + nz * fora), y0 = k.topo - 2.8 + 1.0;
      const us = f.s === 1 ? (f.meia >= 3.1 ? [-f.meia * .45, f.meia * .6] : [-f.meia * .45]) : [-f.meia * .45, f.meia * .45];
      for (const u of us) {
        const grade = hash2(k.z + u, k.x) < .6, u0 = grade ? .75 : .5;
        // O pavimento de tijolo é 3 cm mais estreito que o corpo (w − 0,06): a face do tijolo fica em fora = −0,05.
        T.quad(P(u - .5, y0, -.02), P(u + .5, y0, -.02), P(u + .5, y0 + 1.2, -.02), P(u - .5, y0 + 1.2, -.02), u0, .5, u0 + .25, .75);
        F.cor(0x8d8b85, .92 + rng() * .12);
        for (const e of [-1, 1]) F.caixa(fx + tx * (u + e * .53) - nx * .01, y0 - .06, fz + tz * (u + e * .53) - nz * .01, .06, 1.32, .08, f.ry);
        F.caixa(fx + tx * u - nx * .01, y0 + 1.2, fz + tz * u - nz * .01, 1.12, .06, .08, f.ry).cor(0x55534e).caixa(fx + tx * u + nx * .01, y0 - .07, fz + tz * u + nz * .01, 1.14, .07, .12, f.ry);
        n++;
      }
    }
  }
  return n;
}
// Kit de viela nos becos entre as fileiras A e B (faces x de A para fora e de B para dentro, com casa a < 3,4 m à frente):
// 2–3 de balde, caixa de feira, saco de cimento/areia, vassoura e pneu encostados a 35 cm da fachada, longe do relógio (|u| ≤ meia − 1,5).
function becos(F, rng, casas) {
  let n = 0;
  const prop = (i, x, z, g, cs, sn) => {
    if (i === 0) { F.cor([0x1d3f8a, 0x1b1c1e, 0x8a8c88][Math.floor(rng() * 3)], .9 + rng() * .2).torno(x, 0, z, [[.13, 0], [.15, .02], [.155, .27], [.16, .3]], 10, g); }
    else if (i === 1) { const cor = [0x1d3f8a, 0x2f6b3a, 0xb59a2a][Math.floor(rng() * 3)]; F.cor(cor, .9).caixa(x, 0, z, .52, .3, .34, g);
      for (const e of [-1, 1]) F.cor(cor, .45).caixa(x + e * .14 * Math.cos(g), .09, z - e * .14 * Math.sin(g), .16, .14, .35, g); }
    else if (i === 2) { const cor = rng() < .5 ? 0xa9a398 : 0xb9b2a0; F.cor(cor, .9 + rng() * .2).caixa(x, 0, z, .62, .15, .4, g).cor(cor, .95).caixa(x, .15, z, .5, .04, .3, g).cor(cor, .7).caixa(x, .12, z, .56, .012, .36, g); }
    else if (i === 3) { const ax = x - cs * .28, az = z - sn * .28; F.cor(0x9a7a4a).tubo([V(x, .06, z), V(ax, 1.35, az)], .012, 4).cor(0x5a4a30).caixa(x, 0, z, .26, .07, .05, g); }
    else { F.cor(0x1a1b1b, .9 + rng() * .2).torno(x, 0, z, [[.3, 0], [.33, .04], [.33, .17], [.3, .21]], 12, g).cor(0x4a4640).torno(x, .21, z, [[.17, 0], [.17, .004]], 10, g); }
  };
  for (const k of casas) {
    const A = Math.abs(Math.abs(k.x) - 9.75) < 1.2, B = Math.abs(Math.abs(k.x) - 16.95) < 1.2; if (!A && !B) continue;
    const f = faceDe(k, 'x', A ? Math.sign(k.x) : -Math.sign(k.x));
    if (faceLivre({ ...f, fx: f.fx + f.nx * 1.8, fz: f.fz + f.nz * 1.8 }, casas) || f.meia < 2) continue;
    const m = 2 + (hash2(k.z, k.x + 2) < .5 ? 1 : 0), base = Math.floor(rng() * 5);
    for (let i = 0; i < m; i++) {
      const u = (-f.meia + 1.5) + (f.meia - 1.5) * 2 * (i + .2 + rng() * .6) / m, x = f.fx + f.tx * u + f.nx * .35, z = f.fz + f.tz * u + f.nz * .35;
      prop((base + i) % 5, x, z, f.ry + (rng() - .5) * .6, f.nx, f.nz); n++;
    }
  }
  return n;
}

// Skyline de SP: caixas instanciadas num anel de 70–185 m (fora do mundo jogável, atrás dos muros de 8 m), com grade de
// janelas por shader (fiada a cada 3 m, 2 colunas por 5 m, 30 % escuras / 70 % médias) e varanda como faixa clara em metade
// dos prédios. A névoa (72 %) entra DEPOIS do tonemap e lavava a janela do albedo: a grade também desconta sobre a cor final,
// senão a torre lia como bloco bege liso.
function skyline(grupo, rng) {
  const N = 150, lista = [];
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2, r = 70 + Math.pow(rng(), .8) * 115, t = rng(), h = (t < .7 ? 12 + rng() * 18 : t < .95 ? 30 + rng() * 26 : 55 + rng() * 25) * .8;
    lista.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 8 + rng() * 14, d: 8 + rng() * 14, h: h * (1 + r / 400), ry: rng() * .5, cor: [0x5e6670, 0x6f7680, 0x66707c, 0x545c66, 0x727880, 0x5a6470][Math.floor(rng() * 6)] });
  }
  const mat = new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0, name: 'hd-skyline' });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdYUS; varying float vHdLado;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { float hdSem = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        float hdU = abs(normal.x) > 0.5 ? (position.z + 0.5) * length(instanceMatrix[2].xyz) : (position.x + 0.5) * length(instanceMatrix[0].xyz);
        vHdYUS = vec3((position.y + 0.5) * length(instanceMatrix[1].xyz), hdU, hdSem); vHdLado = abs(normal.y); }`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdYUS; varying float vHdLado;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      float hdJanE = 0.0, hdJanM = 0.0, hdVar = 0.0;
      if (vHdLado < 0.5) { float hdSem = vHdYUS.z, hdFy = fract(vHdYUS.x / 3.0), hdFu = fract(vHdYUS.y / 2.5);
        vec2 hdCel = floor(vec2(vHdYUS.y / 2.5, vHdYUS.x / 3.0)) + hdSem * 31.0;
        float hdR = fract(sin(dot(hdCel, vec2(12.9898, 78.233))) * 43758.5453);
        float hdJan = step(0.30, hdFy) * step(hdFy, 0.72) * step(0.22, hdFu) * step(hdFu, 0.78) * step(0.4, vHdYUS.x);
        hdJanE = hdJan * step(0.7, hdR); hdJanM = hdJan - hdJanE;
        hdVar = step(0.5, hdSem) * step(0.04, hdFy) * step(hdFy, 0.28) * step(0.4, vHdYUS.x);
        diffuseColor.rgb *= 1.0 - 0.55 * hdJanE - 0.30 * hdJanM;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.54, 0.50), hdVar * 0.5); }
      else diffuseColor.rgb *= 0.9;`)
      .replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment.replace(/, fogFactor \);/, ', fogFactor * 0.72 );')
        + '\n gl_FragColor.rgb = min(gl_FragColor.rgb * (1.0 - 0.20 * hdJanE - 0.09 * hdJanM) + 0.035 * hdVar, vec3(1.0));');
  };
  mat.customProgramCacheKey = () => 'hd-skyline5';
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, N), o = new THREE.Object3D(), c = new THREE.Color();
  lista.forEach((k, i) => { o.position.set(k.x, k.h / 2 - 2, k.z); o.rotation.set(0, k.ry, 0); o.scale.set(k.w, k.h, k.d); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.setHex(k.cor).multiplyScalar(.85 + rng() * .3)); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.name = 'hd-skyline'; im.castShadow = false; im.receiveShadow = false;
  grupo.add(im);
  return N;
}

export function cenografiaCorrego(scene, opts = {}) {
  const lig = (k) => opts[k] !== false, mundo = opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null);
  const cols = mundo?.colliders || [], casas = casasDe(cols), lista = postesDe(cols), info = { casas: casas.length, postes: lista.length };
  const grupo = new THREE.Group(); grupo.name = 'hd-cenografia';
  const F = fundidor(), W = fiador(), T = texturador(), relogios = [], L = [];
  const topo = casas.length && (lig('lajes') || lig('telhados')) ? medidor(scene) : null;
  if (lig('postes') && lista.length) info.cabos = postes(F, W, rngDe(7717), lista, mundo?.ctfPoints);
  if (lig('fachadas') && casas.length) info.fachadas = fachadas(F, W, rngDe(9311), casas, lista, relogios);
  if (lig('lajes') && topo) Object.assign(info, lajes(F, W, rngDe(40123), casas, topo));
  if (lig('telhados') && topo) { info.telhados = telhados(F, rngDe(50821), casas, topo, L); info.lastro = L.length; }
  if (lig('canal')) info.guia = guiaCanal(F, rngDe(5519));
  if (lig('margem')) info.margem = margem(F, rngDe(7331));
  if (lig('guias') && casas.length) info.guias = guias(F, rngDe(1933), casas, cols);
  if (lig('varais') && casas.length) info.varais = varais(F, W, rngDe(1201), casas);
  if (lig('roupas')) info.roupas = roupas(F, rngDe(6113));
  if (lig('sacos')) info.sacos = nosDeSaco(F, rngDe(4477));
  if (lig('toldos') && casas.length) info.toldos = toldos(F, rngDe(3307), casas);
  if (lig('comercio') && casas.length && typeof document !== 'undefined') info.comercio = comercio(F, T, rngDe(2719), casas);
  if (lig('portoes') && casas.length && typeof document !== 'undefined') { info.portoes = portoes(F, T, rngDe(6121), casas); info.basculantes = basculantes(F, T, rngDe(8431), casas); }
  if (lig('becos') && casas.length) info.becos = becos(F, rngDe(2213), casas);
  if (opts.guarda) info.guarda = guardaTravessia(F, rngDe(3119));   // só a pedido do kit (travessia de concreto ligada)
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, side: THREE.DoubleSide, name: 'hd-cenografia' });
  if (F.tris()) { const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-cenografia-fundida'; malha.receiveShadow = true; grupo.add(malha); info.tris = F.tris(); }
  if (W.n()) {
    const res = { value: new THREE.Vector2(1920, 1080) }, fios = new THREE.Mesh(W.geo(), materialFio(res));
    fios.name = 'hd-cenografia-fios'; fios.receiveShadow = false; fios.onBeforeRender = (r) => { const t = r.getRenderTarget(); if (t) res.value.set(t.width, t.height); else r.getDrawingBufferSize(res.value); };
    grupo.add(fios); info.fios = W.n();
  }
  if (T.n()) {
    const tela = telaComercio(), comer = new THREE.Mesh(T.geo(), new THREE.MeshStandardMaterial({ map: tela, roughness: .7, metalness: .15, side: THREE.DoubleSide, name: 'hd-comercio' }));
    comer.name = 'hd-cenografia-comercio'; comer.receiveShadow = true; grupo.add(comer);
  }
  if (L.length) grupo.add(lastro(L, rngDe(9013)));
  if (lig('skyline')) info.skyline = skyline(grupo, rngDe(20261115));
  grupo.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.raycast = () => {}; o.userData.nonSolid = true; o.userData.nonSolidSurface = true; } });
  scene.add(grupo);
  return { grupo, info, desliga() {
    scene.remove(grupo);
    grupo.traverse((o) => { if (!o.isMesh) return; o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m?.map?.dispose(); m?.dispose(); } });
  } };
}
