// Cenografia HD do Córrego (só com ?hd=1): NADA aqui tem colisão nem raycast. Lê a planta pelos colisores do mundo (casasDe, postesDe).
// Itens (opts.<item> === false desliga), frentes r26 e o que cada um desenha: docs/hd-kit/corrego.md#cenografia e #interruptores.
import * as THREE from 'three';
import { soltaAoSubir } from './hd_cenografia_lajes.js';
import { pintaLetreiro } from './hd_detalhes_lajes.js';
import { RUIDO_GLSL } from './map_sertao_hd.js';

function rngDe(semente) { let s = semente; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
// Malha fundida com cor e normal por vértice (mesmo desenho do Lajes): caixas, tubos, sólidos de revolução e grades num draw call.
// comEixo grava em hdEixo o deslocamento do vértice ao eixo da peça (caixa e tubo), para o shader engrossar barra fina; o resto fica com zero.
function fundidor(comEixo = false) {
  const pos = [], cor = [], nrm = [], eix = [], c = new THREE.Color(), m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
  const v = Array.from({ length: 8 }, () => new THREE.Vector3()), p3 = new THREE.Vector3(), s3 = new THREE.Vector3(), fn = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const ec = new THREE.Vector3(), eu = new THREE.Vector3(); let comLinha = false;
  const desl = (p) => { if (!comLinha) { eix.push(0, 0, 0); return; } const k = (p.x - ec.x) * eu.x + (p.y - ec.y) * eu.y + (p.z - ec.z) * eu.z; eix.push(p.x - ec.x - eu.x * k, p.y - ec.y - eu.y * k, p.z - ec.z - eu.z * k); };
  const tri = (a, b, d, na, nb, nd) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z); for (let i = 0; i < 3; i++) cor.push(c.r, c.g, c.b);
    if (comEixo) { desl(a); desl(b); desl(d); }
    if (na) nrm.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nd.x, nd.y, nd.z);
    else { fn.crossVectors(t1.subVectors(b, a), t2.subVectors(d, a)).normalize(); for (let i = 0; i < 3; i++) nrm.push(fn.x, fn.y, fn.z); }
  };
  const quad = (a, b, d, f) => { tri(a, b, d); tri(a, d, f); };
  const emite = () => {
    for (let i = 0; i < 8; i++) v[i].set((i & 1) - .5, (i >> 1) & 1, ((i >> 2) & 1) - .5).applyMatrix4(m);
    if (comEixo) { const el = m.elements, l0 = Math.hypot(el[0], el[1], el[2]), l1 = Math.hypot(el[4], el[5], el[6]), l2 = Math.hypot(el[8], el[9], el[10]), k = l0 >= l1 && l0 >= l2 ? 0 : l1 >= l2 ? 4 : 8;
      eu.set(el[k], el[k + 1], el[k + 2]).normalize(); ec.set(0, .5, 0).applyMatrix4(m); comLinha = true; }
    quad(v[0], v[2], v[3], v[1]); quad(v[5], v[7], v[6], v[4]); quad(v[4], v[6], v[2], v[0]); quad(v[1], v[3], v[7], v[5]); quad(v[2], v[6], v[7], v[3]); quad(v[4], v[0], v[1], v[5]);
    comLinha = false;
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
        if (ant) { if (comEixo) { ec.copy(pts[i - 1]); eu.subVectors(pts[i], pts[i - 1]).normalize(); comLinha = true; }
          for (let k = 0; k < lados; k++) quad(ant[k], ant[(k + 1) % lados], anel[(k + 1) % lados], anel[k]);
          comLinha = false; }
        ant = anel;
      }
      return F;
    },
    // Tubo com raio e cor por anel (estaca de madeira: seca em cima, molhada e com limo na linha d'água).
    tuboG(pts, raios, lados, cores) {
      const t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3(), cima = new THREE.Vector3(0, 1, 0), lado = new THREE.Vector3(1, 0, 0), ca = new THREE.Color(), cb = new THREE.Color();
      let ant = null;
      for (let i = 0; i < pts.length; i++) {
        t.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
        n.crossVectors(t, Math.abs(t.y) > .9 ? lado : cima).normalize(); b.crossVectors(t, n);
        const anel = []; for (let k = 0; k < lados; k++) { const a = k / lados * Math.PI * 2; anel.push(pts[i].clone().addScaledVector(n, Math.cos(a) * raios[i]).addScaledVector(b, Math.sin(a) * raios[i])); }
        if (ant) { ca.setHex(cores[i - 1]); cb.setHex(cores[i]);
          for (let k = 0; k < lados; k++) { const k2 = (k + 1) % lados;
            for (const [p, col] of [[ant[k], ca], [ant[k2], ca], [anel[k2], cb], [ant[k], ca], [anel[k2], cb], [anel[k], cb]]) { pos.push(p.x, p.y, p.z); cor.push(col.r, col.g, col.b); if (comEixo) eix.push(0, 0, 0); }
            fn.crossVectors(t1.subVectors(ant[k2], ant[k]), t2.subVectors(anel[k2], ant[k])).normalize(); for (let j = 0; j < 6; j++) nrm.push(fn.x, fn.y, fn.z); } }
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
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
      if (comEixo) g.setAttribute('hdEixo', new THREE.Float32BufferAttribute(eix, 3));
      return soltaAoSubir(g); },
  };
  return F;
}
const catenaria = (A, B, barriga, piso, n = 10) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, p = new THREE.Vector3().lerpVectors(A, B, t); p.y = Math.max(piso, p.y - barriga * 4 * t * (1 - t)); pts.push(p); } return pts; };

// Fios: fita virada para a câmera, com largura real perto e piso de FIO_PX px longe (tubo fino a 30 m vira pontilhado que cintila).
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
// Topo real em (x, z) por raio para baixo: altura, chave de material do que bateu e normal de mundo da face (inclinação do telhado).
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
// Piso dos cabos entre postes: 5,0 m. A folga sobre a travessia alta (5,6 + 2,6) é de folgaPass, que encolhe a barriga até passar;
// mais alto, a cruzeta baixa (8,24) fica com cabo reto esticado. Ver docs/hd-kit/corrego.md#fios.
const CABO_MIN = 5.0;
// Pose `alto` da bancada (hd_lab.js): (−4,6, 5,6, −11) olhando (+x, −z). Prioriza laje/telhado dentro desse cone.
const noAlto = (x, z) => { const dx = x + 4.6, dz = z + 11, d = Math.hypot(dx, dz); return d > 4 && d < 48 && (dx * .7071 - dz * .7071) / d > .72; };

// Postes do mapa: isolador em cada braço das cruzetas, luminária, transformador, caixa e nó de fiação; cabos em catenária entre vizinhos,
// sempre de isolador a isolador. Sobre a travessia alta a barriga encolhe até dar folga (folgaPass). Ver docs/hd-kit/corrego.md#postes.
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
    // Nó alto: caixa de emenda sob a cruzeta baixa (7,42–7,68 m) com dois laços de sobra e a descida de cada isolador baixo até ela,
    // senão o cabo chega à cruzeta sem nó nem caixa.
    { const nx2 = p.sB, nz2 = p.cB, ex2 = p.x + nx2 * .17, ez2 = p.z + nz2 * .17;
      F.cor(0x5f6361, .9 + rng() * .2).caixa(ex2, 7.42, ez2, .2, .26, .12, p.th2).cor(0x3a3c3c).caixa(ex2 + nx2 * .065, 7.46, ez2 + nz2 * .065, .14, .18, .01, p.th2);
      for (let k = 0; k < 2; k++) { const r = .14 + rng() * .06, cy = 7.3 - k * .06 - r, pts = []; for (let t = 0; t <= 12; t++) { const a = t / 12 * Math.PI * 2; pts.push(V(ex2 + nx2 * (.02 + k * .02) + p.cB * Math.cos(a) * r * 1.1, cy + Math.sin(a) * r, ez2 + nz2 * (.02 + k * .02) - p.sB * Math.cos(a) * r * 1.1)); } W.cor(ESCURO).fio(pts, .008); }
      for (const s of [-1, 1]) { const [bx3, bz3] = bracoB(p, s); W.cor(ESCURO).fio([V(bx3, ISO_B, bz3), V((bx3 + ex2) / 2, 7.92, (bz3 + ez2) / 2), V(ex2, 7.68, ez2)], .007); } }
    const viz = lista.map((q, j) => ({ q, j, d: Math.hypot(q.x - p.x, q.z - p.z) })).filter((o) => o.j !== i && o.d < 31).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const { q, j, d } of viz) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (feitos.has(k) || !livre([p.x, p.z], [q.x, q.z])) continue; feitos.add(k);
      const ux = (q.x - p.x) / d, uz = (q.z - p.z) / d, px = uz, pz = -ux;
      // Braço "esquerdo" de cada poste = o que cai do lado negativo da perpendicular ao vão; assim os dois cabos não se cruzam.
      const esq = (o) => (o.cA * px - o.sA * pz) < 0 ? 1 : -1, frente = (o, vx, vz) => (o.cB * vx - o.sB * vz) > 0 ? 1 : -1;
      for (const s of [1, -1]) {
        const [ax, az] = bracoA(p, s * esq(p)), [bx2, bz2] = bracoA(q, s * esq(q));
        cabo(V(ax, ISO_A, az), V(bx2, ISO_A, bz2), d * (.02 + rng() * .02), Math.max(8, Math.round(d * .7)), .012);
      }
      const [ax, az] = bracoB(p, frente(p, ux, uz)), [bx2, bz2] = bracoB(q, frente(q, -ux, -uz));
      cabo(V(ax, ISO_B, az), V(bx2, ISO_B, bz2), d * (.02 + rng() * .02), Math.max(8, Math.round(d * .7)), .010);
    }
  });
  return cabos;
}
// Postes de concreto da rua do spawn oeste (pose `rua`): P1 (−16,3; −8,0), P2 (−19,4; −0,7) e P3 (−12,6; −7,0), todos fora de rota.
// Posições copiadas da planta; sem casas, só postes e cabos. Cabos e descidas: docs/hd-kit/corrego.md#postes-da-rua.
function postesRua(F, W, rng, casas) {
  const P = [[-16.3, -8.0, 1], [-19.4, -0.7, -1], [-12.6, -7.0, -1]], d = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  const ux = (P[1][0] - P[0][0]) / d, uz = (P[1][1] - P[0][1]) / d, px = uz, pz = -ux, ry = Math.atan2(-pz, px);
  let cabos = 0;
  const cabo = (A, B, barriga, r) => { W.cor(ESCURO).fio(catenaria(A, B, barriga, 3.6, 10), r); cabos++; };
  for (const [x, z, lum] of P) {
    F.cor(0x8e8d86, .95).torno(x, 0, z, [[.14, 0], [.13, .4], [.105, 8.3], [.095, 8.65]], 10).cor(0x55534c).torno(x, 0, z, [[.145, 0], [.145, .45], [.135, .5]], 10);
    for (const [y, l] of [[8.3, 1.3], [7.6, 1.0]]) { F.cor(0x6d6a62).caixa(x, y, z, l, .08, .08, ry); for (const s of [-1, 1]) F.cor(0x8e8f8a).caixa(x + s * (l / 2 - .06) * px, y + .08, z + s * (l / 2 - .06) * pz, .07, .12, .07, ry); }
    F.cor(0x6d7072).tubo([V(x, 7.0, z), V(x + lum * .3, 7.4, z), V(x + lum * 1.15, 7.45, z)], .028, 4).caixa(x + lum * 1.15, 7.31, z, .5, .13, .22).cor(0xbfc3bd).caixa(x + lum * 1.15, 7.29, z, .44, .02, .18);
    F.cor(0x7a7d7a).caixa(x + lum * .17, 4.4, z, .22, .5, .34, ry);
    for (let k = 0; k < 2; k++) { const r = .2 + rng() * .06, cy = 5.6 - k * .08 - r, pts = []; for (let t = 0; t <= 14; t++) { const a = t / 14 * Math.PI * 2; pts.push(V(x + lum * .16 + px * Math.cos(a) * r * 1.1, cy + Math.sin(a) * r, z + pz * Math.cos(a) * r * 1.1)); } W.cor(ESCURO).fio(pts, .009); }
  }
  // Relógio no P1 (face da rua), eletroduto até o feixe.
  F.cor(0x8a8d8c).caixa(P[0][0] + .17, 1.3, P[0][1], .11, .42, .3, 0).cor(0x1b1d1e).caixa(P[0][0] + .23, 1.5, P[0][1], .012, .14, .16, 0).cor(0x767978).tubo([V(P[0][0] + .17, 1.73, P[0][1]), V(P[0][0] + .17, 6.95, P[0][1])], .016, 4);
  for (const s of [-1, 1]) {
    cabo(V(P[0][0] + s * .59 * px, 8.42, P[0][1] + s * .59 * pz), V(P[1][0] + s * .59 * px, 8.42, P[1][1] + s * .59 * pz), .3 + rng() * .1, .012);
    cabo(V(P[0][0] + s * .44 * px, 7.72, P[0][1] + s * .44 * pz), V(P[1][0] + s * .44 * px, 7.72, P[1][1] + s * .44 * pz), .3 + rng() * .1, .010);
  }
  for (let k = 0; k < 5; k++) { const o = (k - 2) * .09, y = 7.0 + k * .1; cabo(V(P[0][0] + o * px, y, P[0][1] + o * pz), V(P[1][0] + o * px, y, P[1][1] + o * pz), .35 + rng() * .2, .009); }
  // P1 → P3 (cruza a rua da pose rua): 2 cabos na cruzeta alta, 3 no feixe baixo, flecha 2–4 % do vão de 3 m.
  for (const s of [-1, 1]) cabo(V(P[0][0] + s * .59 * px, 8.42, P[0][1] + s * .59 * pz), V(P[2][0] + s * .59 * px, 8.42, P[2][1] + s * .59 * pz), .12 + rng() * .06, .012);
  for (let k = 0; k < 3; k++) { const o = (k - 1) * .1, y = 7.05 + k * .12; cabo(V(P[0][0] + o * px, y, P[0][1] + o * pz), V(P[2][0] + o * px, y, P[2][1] + o * pz), .15 + rng() * .1, .009); }
  const kA = casas.length ? maisPerto(casas, -9.75, 2.6) : null, kB = casas.length ? maisPerto(casas, -16.95, 1.9) : null;
  if (kA) { const f = faceDe(kA, 'z', -1), ax = f.fx + f.tx * -1.25, az = f.fz + f.tz * -1.25;
    cabo(V(P[2][0] + .1, 6.95, P[2][1]), V(ax, 4.6, az), .2, .009); cabo(V(P[2][0] - .1, 6.9, P[2][1]), V(ax + f.tx * .4, 4.5, az + f.tz * .4), .18, .009);
    F.cor(0x3a3d3f).caixa(ax, 4.55, az, .1, .1, .06, f.ry).cor(0x767978).tubo([V(ax, 4.55, az), V(ax, 1.73, az)], .016, 4).cor(0x8a8d8c).caixa(ax, 1.3, az, .3, .42, .11, f.ry); }
  if (kB) { const f = faceDe(kB, 'z', -1), bx = f.fx + f.tx * -.8 + f.nx * .055, bz = f.fz + f.tz * -.8 + f.nz * .055;
    cabo(V(P[1][0], 6.95, P[1][1]), V(bx, 4.4, bz), .14, .009);
    F.cor(0x8a8d8c).caixa(bx, 1.3, bz, .3, .42, .11, f.ry).cor(0x1b1d1e).caixa(bx + f.nx * .056, 1.5, bz + f.nz * .056, .16, .14, .012, f.ry).cor(0x767978).tubo([V(bx, 1.73, bz), V(bx, 4.4, bz)], .016, 4); }
  return cabos;
}

// Fachadas ±x: cano de PVC, relógio de luz com eletroduto, gato e ramal até o poste mais próximo; tudo com ≤ 12 cm de saliência.
// Ramal que cruza a travessia alta com menos de 2,6 m de folga sai do alto da laje ou não é desenhado. Ver docs/hd-kit/corrego.md#fachadas.
function fachadas(F, W, rng, casas, lista, relogios) {
  let n = 0;
  for (const k of casas) for (const s of [-1, 1]) {
    const nx = s * k.cs, nz = -s * k.sn, a = s * (k.hx + .06), topo = k.topo - .25;
    const [cx, cz] = mundoDe(k, a, (rng() < .5 ? 1 : -1) * (k.hz - .35));
    F.cor(PVC[Math.floor(rng() * 2.999)], .85 + rng() * .25).tubo([V(cx, .03, cz), V(cx, topo, cz), V(cx - nx * .09, topo + .09, cz - nz * .09)], .045, 5);
    for (let y = .5; y < topo; y += 1.4) F.cor(0x3a3d3f).caixa(cx - nx * .03, y, cz - nz * .03, .12, .035, .12);
    {   // relógio em TODA fachada ±x: 1 relógio + conduíte por fachada, no térreo
      const b = (rng() < .5 ? 1 : -1) * (k.hz - 1.0), [rx, rz] = mundoDe(k, s * (k.hx + .055), b), y = 1.25 + rng() * .2;
      F.cor(0x8a8d8c, .9 + rng() * .2).caixa(rx, y, rz, .11, .42, .3, k.ry).cor(0x1b1d1e).caixa(rx + nx * .056, y + .2, rz + nz * .056, .012, .14, .16, k.ry)
        .cor(0x767978).tubo([V(rx, y + .43, rz), V(rx, 3.25, rz)], .016, 4).tubo([V(rx, y, rz), V(rx, .06, rz)], .013, 4);
      relogios.push({ x: rx, y: 3.3, z: rz, lado: Math.sign(k.x), topo: k.topo }); n++;
      // Gato: feixe frouxo correndo pela fachada a 2,7 m, caindo até a caixa.
      const pts = [], L = k.hz * 2 - .4; for (let t = 0; t <= 8; t++) { const bb = -k.hz + .2 + L * t / 8, [gx, gz] = mundoDe(k, s * (k.hx + .03), bb); pts.push(V(gx, 2.72 - .06 * Math.sin(t * 1.3) - .04 * (t % 2), gz)); }
      W.cor(0x121315).fio(pts, .011);
    }
  }
  // Faces ±z livres (rua/largo): relógio + eletroduto no canto oposto à porta autoral (a = +0,6 na face +z), subindo até a cinta da laje.
  for (const k of casas) for (const s of [-1, 1]) {
    const f = faceDe(k, 'z', s); if (!faceLivre(f, casas) || f.meia < 1.6) continue;
    const u = -s * (k.hx - .6), rx = f.fx + f.tx * u + f.nx * .035, rz = f.fz + f.tz * u + f.nz * .035, y = 1.25 + rng() * .2, yT = Math.min(3.25, k.topo - .2);
    F.cor(0x8a8d8c, .9 + rng() * .2).caixa(rx, y, rz, .3, .42, .11, f.ry).cor(0x1b1d1e).caixa(rx + f.nx * .056, y + .2, rz + f.nz * .056, .16, .14, .012, f.ry)
      .cor(0x767978).tubo([V(rx, y + .43, rz), V(rx, yT, rz)], .016, 4).tubo([V(rx, y, rz), V(rx, .06, rz)], .013, 4);
    n++;
  }
  // Ramal: do alto do eletroduto ao poste mais próximo do mesmo lado (≤ 16 m), passando por cima da rua.
  for (const r of relogios) {
    const p = lista.map((q) => ({ q, d: Math.hypot(q.x - r.x, q.z - r.z) })).filter((o) => o.d < 16 && Math.sign(o.q.x) === r.lado).sort((a, b) => a.d - b.d)[0];
    if (!p) continue;
    const B = V(p.q.x, 7.85, p.q.z); let pts = catenaria(V(r.x, r.y, r.z), B, p.d * .03, 3.1, 8);
    if (!folgaPass(pts)) {
      const yA = r.topo - .3; pts = catenaria(V(r.x, yA, r.z), B, p.d * .02, 3.1, 8);
      if (!folgaPass(pts)) continue;
      F.cor(0x767978).tubo([V(r.x, 3.2, r.z), V(r.x, yA, r.z)], .016, 4);
    }
    W.cor(ESCURO).fio(pts, .009);
  }
  return n;
}

// Laje plana: caixa d'água azul de 1 000 L ou de fibrocimento sobre fiadas de tijolo, no canto oposto ao cubo autoral; antena, parabólica e varal.
// No cone da pose `alto` a laje fica acima do olho: só aparece o que passa de ~1 m sobre a platibanda. Ver docs/hd-kit/corrego.md#lajes.
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
    // Casa térrea de laje plana também recebe caixa; tolerância de 12 cm para puxadinho.
    if (!h || /tex_zinco/.test(h.chave) || Math.abs(h.y - (k.topo + .2)) > .12) continue;
    const y = h.y, alto = noAlto(k.x, k.z), azul = alto || hash2(k.x, k.z) < .7, tom = .85 + rng() * .3, g = k.ry + (rng() - .5) * .3;
    if (alto) {
      // Par de caixas no lado +b (longe do cubo autoral em +a/−b e dos ferros de espera em b = ±(hz − 0,35)); base de 6 fiadas.
      const [bx, bz] = mundoDe(k, k.hx * .4, k.hz * .5), yb = base(F, rng, bx, y, bz, 2.5, 1.3, k.ry, 6);
      for (const a of [k.hx * .4 - .6, k.hx * .4 + .6]) { const [cx, cz] = mundoDe(k, a, k.hz * .5); caixaDagua(F, cx, yb, cz, true, tom * (.94 + rng() * .12)); }
      const [qx, qz] = mundoDe(k, k.hx * .4 - .6, k.hz * .5 + .5), [q2x, q2z] = mundoDe(k, k.hx * .4 - .6, k.hz * .5 + .8);
      F.cor(0x8d9290).tubo([V(qx, yb + .7, qz), V(q2x, yb + .7, q2z), V(q2x, y - .02, q2z)], .02, 4);
      // Caixa de escada em −a/−b (2,0 × 2,4 × 2,3 m): bloco cerâmico aparente com cinta, laje de 12 cm e porta escura na face +a;
      // a parabólica sobe para a laje dela (mastro de 1,0 m).
      const [ex, ez] = mundoDe(k, -k.hx * .62, -k.hz * .45), hE = 2.3, cE = Math.cos(k.ry), sE = Math.sin(k.ry);
      F.cor(0x6a3a26, .9 + rng() * .2).caixa(ex, y, ez, 2.0, hE - .12, 2.4, k.ry).cor(0x8b8983).caixa(ex, y + hE - .12, ez, 2.12, .12, 2.52, k.ry).cor(0x7f7d77).caixa(ex, y + 1.05, ez, 2.03, .14, 2.43, k.ry);
      F.cor(0x1a1917).caixa(ex + 1.01 * cE, y, ez - 1.01 * sE, .03, 2.05, .85, k.ry).cor(0x6e6c66).caixa(ex + 1.02 * cE, y + 2.05, ez - 1.02 * sE, .06, .1, .95, k.ry);
      const px = ex - .6 * cE + .4 * sE, pz = ez + .6 * sE + .4 * cE, py = y + hE;
      F.cor(0x5e6163).tubo([V(px, py, pz), V(px, py + 1.0, pz)], .025, 5).cor(0x34302c).caixa(px, py, pz, .22, .08, .22);
      F.cor(0xb9bcb6, .95).torno(px, py + .85, pz, [[.04, 0], [.3, .07], [.45, .19], [.47, .22]], 12).cor(0x5e6163).tubo([V(px, py + .87, pz), V(px + .22, py + 1.3, pz + .1)], .012, 3).caixa(px + .22, py + 1.27, pz + .1, .07, .07, .07);
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

// Telhado de zinco: chapa de fibrocimento remendando uma água e tijolo baiano de lastro (vai para `L`, uma InstancedMesh), no plano do raio.
// Zinco = chave `tex_zinco` OU plano inclinado acima da laje; 1 telhado em 4 vai para `ceram`, sem lastro. Ver docs/hd-kit/corrego.md#telhados.
function telhados(F, rng, casas, topo, L, ceram) {
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
    const alto = noAlto(k.x, k.z), ladoCam = Math.sign(localDe(k, -4.6, -11)[0]) || 1, ceramico = ceram && n % 4 === 1 && !alto;
    if (ceramico && ceram.length < 5) { ceram.push({ x: k.x, z: k.z, cs: k.cs, sn: k.sn, ha: k.hx + 1.1, hb: k.hz + 1.1 }); n++; continue; }
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

// Guia de concreto na beira do canal (|x| = 3,17; 24 cm): pula pontes (z = −22, 0, 22), rampas (RAMPAS) e as pontas assoreadas.
// A tira de 8 cm em |x| = 5 cobre o degrau aberto de 1 cm entre o muro e o asfalto (via-se o céu por ele). Ver docs/hd-kit/corrego.md#canal.
function guiaCanal(F, rng) {
  let n = 0;
  for (const lado of [-1, 1]) {
    F.cor(0x34332f).caixa(lado * 5, -.03, 0, .08, .042, 80);
    for (let z = -32; z < 32; z += 2) {
      const z1 = Math.min(32, z + 2), zm = (z + z1) / 2, h = .24;
      if ([-22, 0, 22].some((b) => Math.abs(zm - b) < 2.1) || RAMPAS.some(([l, a, b]) => l === lado && zm > a - 1 && zm < b + 1)) continue;
      F.cor(0x62625c, .9 + rng() * .14).caixa(lado * 3.17, -.02, zm, .3, h, z1 - z + .02);
      F.cor(0x47473f, .9 + rng() * .14).caixa(lado * 3.17, h - .02, zm, .28, .012, z1 - z + .02);
      // Mancha no topo em 2 borrões redondos desalinhados (retângulo lê como quadrado escuro sob a taboa).
      if (rng() < .3) for (let b = 0; b < 2; b++) F.cor(0x3a3a33, .9 + rng() * .2).torno(lado * 3.17 + (rng() - .5) * .12, h - .012, zm + (rng() - .5) * .9, [[.05 + rng() * .05, 0], [.08 + rng() * .07, .006], [.03, .012]], 7, rng() * 6.28);
      n++;
    }
  }
  return n;
}
// Esgoto e lixo no canal (pose `ponte`): tubo de PVC Ø 20 cm saindo do muro a −0,95 m, escorrido até a lâmina (−1,61), sacos e PET.
// Longe de pontes (z −22, 0, 22) e dos pilares da travessia (z −11 ± 1,6). Ver docs/hd-kit/corrego.md#canal.
function esgotoCanal(F, rng) {
  for (const [lado, z] of [[-1, -6.5], [1, -16]]) {
    const xw = lado * 3, s = -lado;   // s = sentido para dentro do canal
    F.cor(0x8d9290, .95).tubo([V(xw - s * .05, -.95, z), V(xw + s * .43, -.98, z)], .1, 8);
    F.cor(0x111110).quad(V(xw + s * .41, -1.05, z - .07 * s), V(xw + s * .41, -1.05, z + .07 * s), V(xw + s * .41, -.91, z + .07 * s), V(xw + s * .41, -.91, z - .07 * s));
    F.cor(0x1e2418, .9).quad(V(xw + s * .015, -.86, z - .2 * s), V(xw + s * .015, -.86, z + .2 * s), V(xw + s * .015, -1.62, z + .45 * s), V(xw + s * .015, -1.62, z - .45 * s));
    F.cor(0x6b6a52).tubo([V(xw + s * .42, -1.0, z), V(xw + s * .5, -1.25, z), V(xw + s * .58, -1.6, z)], .025, 5);
    // Espuma do despejo: 4 borrões rasos oliva-escuros de raio e tom variados em volta do pé do fio (disco claro lia como tampa/branco).
    for (let b = 0; b < 4; b++) { const a = rng() * 6.28, d = rng() * .3; F.cor([0x4a4a38, 0x3f4032, 0x55543f][b % 3], .9 + rng() * .2).torno(xw + s * .6 + Math.cos(a) * d, -1.608 + b * .002, z + Math.sin(a) * d, [[.09 + rng() * .1, 0], [.12 + rng() * .12, .008], [.05, .014]], 7 + b, rng() * 6.28); }
  }
  for (const [x, z, sz, cor] of [[-2.72, -4.2, .24, 0x24272a], [2.74, -8.0, .2, 0xb8b9b2], [-2.7, -13.3, .22, 0x2c3238], [2.7, -17.2, .19, 0x2f4a7a]]) {
    const g = rng() * 6.28;
    F.cor(cor, .9 + rng() * .2).torno(x, -1.72, z, [[sz * .55, 0], [sz * 1.05, sz * .3], [sz, sz * .75], [sz * .6, sz * 1.05], [sz * .18, sz * 1.15], [sz * .14, sz * 1.35]], 8, g);
  }
  for (const [x, z, g] of [[2.6, -5.0, .4], [-2.62, -9.6, 2.1]]) {
    const cx = Math.cos(g) * .15, cz = Math.sin(g) * .15, cor = [0x8e978e, 0x9aa39a][Math.floor(rng() * 2)];
    F.cor(cor, .95).tubo([V(x - cx, -1.59, z - cz), V(x + cx, -1.595, z + cz)], .042, 6).cor(0x2f4a6a).tubo([V(x + cx, -1.595, z + cz), V(x + cx * 1.15, -1.597, z + cz * 1.15)], .018, 5);
  }
  // Flutuantes meio afundados na lâmina (−1,61): 2 PET deitadas (40 % fora), 2 sacolas infladas, 1 bandeja de isopor — perto dos
  // muros no trecho da pose ponte (z 0 → −20), fora dos pilares da travessia (z −11 ± 1,6) e das pontes.
  for (const [x, z, g] of [[1.9, -2.6, .7], [-2.1, -14.6, 2.4]]) { const cx = Math.cos(g) * .16, cz = Math.sin(g) * .16;
    F.cor(0x9aa39a, .95).tubo([V(x - cx, -1.64, z - cz), V(x + cx * .6, -1.635, z + cz * .6), V(x + cx, -1.64, z + cz)], .045, 6).cor(0x2f4a6a).tubo([V(x + cx, -1.64, z + cz), V(x + cx * 1.15, -1.642, z + cz * 1.15)], .02, 5); }
  for (const [x, z, s, cor] of [[-1.6, -6.9, .17, 0x6f6f66], [2.2, -18.9, .15, 0x3e4448]]) F.cor(cor, .95).torno(x, -1.70, z, [[s * .5, 0], [s * 1.0, s * .35], [s * .9, s * .7], [s * .4, s * .9], [s * .12, s * 1.0]], 8, rng() * 6.28);
  F.cor(0x7a7b70, .95).caixa(0.9, -1.655, -9.0, .32, .06, .22, .5).cor(0x5e5f55).caixa(0.9, -1.60, -9.0, .26, .012, .16, .5);
  return 6;
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
// Sacos de lixo autorais [x, z, s, sz, chave, cor do kit, some]: o kit achata e varia o tamanho pela chave; aqui vai o nó amarrado no topo.
// Posições copiadas de map_corrego.js: se a planta mover o trio, isto move junto. Ver docs/hd-kit/corrego.md#sacos.
export const SACOS_AUTORAIS = [[-17.70, -2.77, .42, 1.0, '|252925', 0x2c3238], [-17.33, -3.17, .34, 1.14, '|3d4435', 0x363d40, true], [-17.87, -3.47, .30, .86, '|24211f', 0x282c31, true]];
function nosDeSaco(F, rng) {
  for (const [x, z, s, sz, , cor, some] of SACOS_AUTORAIS) {
    if (some) continue;
    const y = s * .62 + .8 * sz * s * .9, g = rng() * 6.28;
    F.cor(cor, 1.15).torno(x, y, z, [[.22 * s, 0], [.13 * s, .06 * s], [.19 * s, .12 * s], [.09 * s, .2 * s], [.04 * s, .26 * s]], 7, g);
    for (const e of [-1, 1]) F.cor(cor, 1.2).caixa(x + Math.cos(g) * e * .08 * s, y + .14 * s, z - Math.sin(g) * e * .08 * s, .2 * s, .012, .09 * s, g, 0, e * .55);
  }
  // No lugar dos dois sacos que somem: sacolas de mercado (12 lados, achatadas), papelão dobrado e seis tijolos, alguns quebrados.
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
// Guia de sarjeta: canaleta de 30 cm fechada por guia de 12 × 7 cm, só nas faces de rua/largo (a faixa úmida é do shader do chão).
// A ponta só dobra a esquina quando a face perpendicular também tem guia; senão termina com rebaixo de 12 cm. Ver docs/hd-kit/corrego.md#guias.
function guias(F, rng, casas, cols) {
  let n = 0;
  const guia = (f, dg, e0, e1) => {
    const r0 = e0 ? 0 : .12, r1 = e1 ? 0 : .12;
    const L = f.meia * 2 + e0 + e1 - r0 - r1, off = (e1 - e0 - r1 + r0) / 2, gx = f.fx + f.nx * dg, gz = f.fz + f.nz * dg, cx = gx + f.tx * off, cz = gz + f.tz * off;
    F.cor(0x9c9b93, .86 + rng() * .22).caixa(cx, -.01, cz, L, .14, .15, f.ry).cor(0x6e6d67).caixa(cx, .13, cz, L, .008, .16, f.ry);
    for (const [e, r] of [[-1, r0], [1, r1]]) if (r) { const u = e * (f.meia - .06); F.cor(0x8f8e87, .9).caixa(gx + f.tx * u, -.01, gz + f.tz * u, .12, .07, .15, f.ry); }
    if (rng() < .6) F.cor(0x4c4b46).caixa(cx + f.tx * (rng() - .5) * L * .6, .13, cz + f.tz * (rng() - .5) * L * .6, .5, .009, .17, f.ry);
    n++;
  };
  for (const k of casas) {
    const faces = [faceDe(k, 'z', -1), faceDe(k, 'z', 1)]; if (Math.abs(Math.abs(k.x) - 16.95) < 1.2) faces.push(faceDe(k, 'x', Math.sign(k.x)));
    const livres = faces.filter((f) => faceLivre(f, casas)), tem = (eixo, s) => livres.some((f) => f.eixo === eixo && f.s === s);
    for (const f of livres) {
      // t = s·(+a) na face z e −s·(+b) na face x: a face perpendicular na ponta e tem sinal s·e (z) ou −s·e (x).
      // Guia a 1,26 m quando há rua à frente (fecha a calçada de 1,2 m do shader do chão); em beco transversal estreito fica a 48 cm.
      const dg = faceLivre({ ...f, fx: f.fx + f.nx * 1.8, fz: f.fz + f.nz * 1.8 }, casas) ? 1.26 : .48;
      const ext = (e) => (f.eixo === 'z' ? tem('x', f.s * e) : tem('z', -f.s * e)) ? dg + .06 : 0;
      guia(f, dg, ext(-1), ext(1));
    }
  }
  // Fileira C: a face de rua (|x| ≈ 22,45) fecha a calçada que o shader pinta até lá; sem esquina, rebaixo nas duas pontas.
  for (const c of cols || []) {
    if (!(c.minY <= 1.1 && c.maxY >= 2.2)) continue;
    const k = caixaDe(c); if (Math.abs(k.x) < 22.5 || Math.abs(k.x) > 23.6 || k.hx > .9 || k.hz < 1.2) continue;   // sem o muro externo (|x| 24)
    guia(faceDe({ ...k, ry: Math.atan2(k.sn, k.cs) }, 'x', -Math.sign(k.x)), 1.26, 0, 0);
  }
  return n;
}

// Guarda das rampas da travessia (só com a travessia de concreto do kit, que descarta a mureta autoral): grade de ferro chato seguindo
// pisoPass, último montante em |x| 13,52 como no shader; no vão, pingadeira de 16 × 5 cm sobre a mureta. Ver docs/hd-kit/corrego.md#guarda.
function guardaTravessia(F, rng, { grade = true, capa = true, degraus = true } = {}) {
  let n = 0;
  const CHUMBO = 0x2e3136, AZUL = 0x27476a, FERRO_PE = 0x4a2e1e, L = PASS.x0 - PASS.x1, incl = Math.atan2(PASS.y, L), hip = Math.hypot(L - .14, PASS.y * (L - .14) / L);
  const tinta = () => (rng() < .4 ? AZUL : CHUMBO);
  if (grade) for (const lado of [-1, 1]) for (const dz of [-PASS.meiaL, PASS.meiaL]) {
    const z = PASS.z + dz, rz = -lado * incl, xm = lado * (PASS.x1 + PASS.x0) / 2, ym = pisoPass(xm);
    F.cor(tinta(), .9 + rng() * .2).caixa(xm, ym + .80, z, hip, .06, .025, 0, 0, rz).cor(tinta(), .9 + rng() * .2).caixa(xm, ym + .10, z, hip, .06, .025, 0, 0, rz);
    for (let ax = PASS.x1 + .15; ax < PASS.x0 - .1; ax += .20) {
      const piso = pisoPass(lado * ax); F.cor(tinta(), .85 + rng() * .25).caixa(lado * ax, piso + .16, z, .04, .64, .025);
    }
    for (let k = 0; k <= 6; k++) {
      const ax = PASS.x1 + .05 + (L - .13) * k / 6, piso = pisoPass(lado * ax);
      F.cor(tinta(), .85 + rng() * .25).caixa(lado * ax, piso + .12, z, .05, .73, .05).cor(FERRO_PE, .9 + rng() * .2).caixa(lado * ax, piso, z, .052, .12, .052);
      n++;
    }
  }
  if (capa) for (const dz of [-PASS.meiaL, PASS.meiaL]) F.cor(0x6b6a64, .95).caixa(0, PASS.y + .9, PASS.z + dz, PASS.x1 * 2 + .02, .05, .16);
  // Pilarete de concreto 20 × 20 × 0,95 arrematando a emenda mureta de bloco ↔ grade de ferro nas duas pontas do vão (|x| = 5).
  for (const lado of [-1, 1]) for (const dz of [-PASS.meiaL, PASS.meiaL]) F.cor(0x8b8983, .95).caixa(lado * 5.03, PASS.y, PASS.z + dz, .2, .95, .2).cor(0x6b6a64).caixa(lado * 5.03, PASS.y + .95, PASS.z + dz, .24, .03, .24);
  // Degraus de concreto no pé de cada rampa: 3 degraus de 46 × 30 cm (a inclinação 5,6/8,6 dá 0,30 de espelho por 0,46 de piso)
  // sobrepostos à laje — o topo coincide com a rampa no lado de cima e sobra o espelho no de baixo. Sem colisão (a rampa autoral manda).
  if (degraus) for (const lado of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x1 = PASS.x0 - .46 * i, yT = .3 * (i + 1);
    F.cor(0x8a8880, .9 + i * .04).caixa(lado * (x1 - .23), 0, PASS.z, .46, yT, PASS.meiaL * 2 - .1).cor(0x5f5e58).caixa(lado * (x1 - .015), yT - .01, PASS.z, .03, .012, PASS.meiaL * 2 - .1);
  }
  return n;
}
// ───────────── r26 (opts.r26.{tijolo,obra,telha,tapume,estaca}, vindas do kit; nada aqui tem colisão) ─────────────
// Capa de argamassa da mureta do vão, no lugar da pingadeira lisa: peças de 1,5–3 m de 14 × 4–5 cm, com falha em metade das emendas.
function capaMuretaR26(F, rng) {
  for (const dz of [-PASS.meiaL, PASS.meiaL]) { let x = -PASS.x1;
    while (x < PASS.x1 - .05) { const L = Math.min(1.5 + rng() * 1.5, PASS.x1 - x), falha = rng() < .5 ? .04 + rng() * .1 : 0;
      F.cor(0x8c8983, .88 + rng() * .2).caixa(x + (L - falha) / 2, PASS.y + .9, PASS.z + dz, L - falha, .04 + rng() * .012, .14); x += L; } }
}
// Guarda das rampas, r26 (malha F2): tubo de 5 cm a 0,85–0,90 m, montantes de 4 cm, barras de 16 mm a cada 12 cm, 2 m remendados com
// vergalhão em X; UMA cor por lance (oeste azul, leste cinza). Zarcão, ferrugem e corrimão polido são do shader de materialFerroR26.
function guardaR26Cen(F2, rng) {
  const L = PASS.x0 - PASS.x1, incl = Math.atan2(PASS.y, L), hip = Math.hypot(L - .14, PASS.y * (L - .14) / L);
  let n = 0;
  for (const lado of [-1, 1]) { const tinta = lado < 0 ? 0x4a6079 : 0x6b6f72;
    for (const dz of [-PASS.meiaL, PASS.meiaL]) {
      const z = PASS.z + dz, rz = -lado * incl, xm = lado * (PASS.x1 + PASS.x0) / 2, ym = pisoPass(xm), r0 = PASS.x1 + 1.2 + rng() * 4.5, r1 = r0 + 2;
      F2.cor(tinta, .95).caixa(xm, ym + .85, z, hip, .05, .05, 0, 0, rz).cor(tinta, .9).caixa(xm, ym + .10, z, hip, .03, .03, 0, 0, rz);
      for (let ax = PASS.x1 + .11; ax < PASS.x0 - .08; ax += .12) { if (ax > r0 && ax < r1) continue;
        F2.cor(tinta, .88 + rng() * .2).caixa(lado * ax, pisoPass(lado * ax) + .12, z, .016, .74, .016); }
      const P = (ax, h) => V(lado * ax, pisoPass(lado * ax) + h, z);
      F2.cor(0x5a3a2a).tubo([P(r0, .14), P(r1, .84)], .008, 4).tubo([P(r0, .84), P(r1, .14)], .008, 4).tubo([P(r0, .5), P(r1, .5)], .008, 4);
      for (let k = 0; k <= 6; k++) { const ax = PASS.x1 + .05 + (L - .13) * k / 6; F2.cor(tinta, .9 + rng() * .15).caixa(lado * ax, pisoPass(lado * ax), z, .04, .88, .04); n++; }
    } }
  return n;
}
function materialFerroR26(res) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .25, side: THREE.DoubleSide, name: 'hd-ferro-r26' });
  mat.onBeforeCompile = (s) => {
    // Piso de 1,5 px de largura (mesma conta do hd-fios): barra de 16 mm ao longe vira pontilhado com moiré sobre os degraus.
    s.uniforms.hdRes = res;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdP; attribute vec3 hdEixo; uniform vec2 hdRes;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vHdP = (modelMatrix * vec4(position, 1.0)).xyz;
      { float hdR = length(hdEixo); if (hdR > 1e-5) { float hdW = max(-(modelViewMatrix * vec4(position, 1.0)).z, 0.05);
        transformed += hdEixo * max(0.0, 1.5 * hdW / (projectionMatrix[1][1] * hdRes.y * 0.71 * hdR) - 1.0); } }`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdP;\n${RUIDO_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float hdRugF = 1.0, hdMetF = 1.0;
      { float hdAx = abs(vHdP.x), hdAlt = vHdP.y - (hdAx <= 5.0 ? 5.6 : 5.6 * (1.0 - (hdAx - 5.0) / 8.6)); vec2 hdQ = vec2(vHdP.x + vHdP.z * 3.0, vHdP.y);
        // Zarcão à mostra em ≈ 12 % da área; ferrugem marrom nos 10 cm do pé e nas soldas (0,13 e 0,84 m); topo do corrimão polido e escuro.
        float hdZar = smoothstep(0.66, 0.72, hdN(hdQ * vec2(5.0, 9.0) + 2.0) * 0.6 + hdN(hdQ * 23.0) * 0.4);
        float hdFer = max(1.0 - smoothstep(0.02, 0.12, hdAlt), max(1.0 - smoothstep(0.0, 0.035, abs(hdAlt - 0.13)), 1.0 - smoothstep(0.0, 0.03, abs(hdAlt - 0.84))) * smoothstep(0.35, 0.7, hdN(hdQ * 31.0)));
        float hdCorr = smoothstep(0.885, 0.895, hdAlt) * (1.0 - hdZar);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.200, 0.085, 0.050), 0.85 * hdZar);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.198, 0.069, 0.025) * (0.8 + 0.4 * hdN(hdQ * 47.0)), 0.9 * hdFer);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.042, 0.061, 0.084), 0.8 * hdCorr);
        hdRugF = 1.0 + 0.5 * hdFer + 0.2 * hdZar - 0.45 * hdCorr; hdMetF = (1.0 - hdFer) * (1.0 - 0.6 * hdZar); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRugF);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * hdMetF;');
  };
  mat.customProgramCacheKey = () => 'hd-ferro-r26-2';
  return mat;
}
// Estrutura da travessia (longarinas, transversinas, travessa por par de pilares, buzinotes, adutora Ø 150 na lateral +z).
// Invariante: tudo ≥ 1,9 m acima do piso de baixo — por isso a longarina da rampa pára em |x| 9,6 e o par de pilares do pé fica sem travessa.
function obraTravessia(F, W, rng) {
  const y0 = PASS.y - .18, L = PASS.x0 - PASS.x1, incl = Math.atan2(PASS.y, L), sn = Math.sin(incl), cs = Math.cos(incl), CONC = 0x86847d, x1 = 9.6;
  for (const dz of [-1, 1]) { const z = PASS.z + dz * (PASS.meiaL - .125);
    F.cor(CONC, .9 + rng() * .1).caixa(0, y0 - .5, z, PASS.x1 * 2, .5, .25);
    for (const lado of [-1, 1]) { const xm = lado * (PASS.x1 + x1) / 2;
      F.cor(CONC, .88 + rng() * .1).caixa(xm - lado * .35 * sn, pisoPass(xm) - .18 / cs - .35 * cs, z, (x1 - PASS.x1) / cs, .35, .25, 0, 0, -lado * incl); } }
  for (const x of [-3, 0, 3]) F.cor(CONC, .86 + rng() * .1).caixa(x, y0 - .35, PASS.z, .2, .35, PASS.meiaL * 2 - .5);
  // Travessa com marca de fôrma: 3 tábuas de ≈ 13 cm, rebaixo escuro de 6 mm entre elas, tom por tábua e escorrido (caixa lisa lia cubo chapado).
  const travessa = (x, y, w, h) => { const d = PASS.meiaL * 2 + .34, hb = (h - .012) / 3;
    for (let k = 0; k < 3; k++) { const yk = y + k * (hb + .006), sai = k === 1 ? .006 : 0;
      F.cor(CONC, (.8 + rng() * .07) * [1, .93, 1.05][k]).caixa(x, yk, PASS.z, w + sai, hb, d + sai);
      if (k < 2) F.cor(CONC, .5).caixa(x, yk + hb, PASS.z, w - .008, .006, d - .008); }
    for (const sx of [-1, 1]) for (let j = 0; j < 2; j++) { const zc = PASS.z + (rng() - .5) * (d - .6), a = .05 + rng() * .05, hh = .16 + rng() * .2, xf = x + sx * (w / 2 + .005);
      F.cor(0x4d4c46, .9 + rng() * .2).quad(V(xf, y + h, zc - a), V(xf, y + h, zc + a), V(xf, y + h - hh, zc + a * .5), V(xf, y + h - hh, zc - a * .4)); } };
  for (const x of [-1.5, 1.5]) travessa(x, y0 - .4, .3, .4);
  for (const lado of [-1, 1]) for (const t of [.25, .55]) travessa(lado * (PASS.x1 + L * t), PASS.y * (1 - t) - .53, .32, .42);
  // Buzinote: toco de PVC saindo 12 cm da borda da laje e mancha escura em trapézio na longarina, 3 mm à frente dela.
  for (const dz of [-1, 1]) for (const x of [-3.6, -.6, 2.4]) { const z = PASS.z + dz * PASS.meiaL, zf = z + dz * .004, a = .04 + rng() * .03, h = .3 + rng() * .25;
    F.cor(0xb9b5a6, .9).tubo([V(x, y0 + .06, z - dz * .03), V(x, y0 + .04, z + dz * .12)], .025, 6);
    F.cor(0x33362f, .9 + rng() * .2).quad(V(x - a, y0 + .02, zf), V(x + a, y0 + .02, zf), V(x + a * .5, y0 - h, zf), V(x - a * .4, y0 - h, zf)); }
  { const z = PASS.z + PASS.meiaL + .14, y = PASS.y - .42;   // lateral +z: a que as poses `ponte` e `rua` veem
    F.cor(0x2f4a6b, .9).tubo([V(-5.5, y, z), V(5.5, y, z)], .075, 8);
    for (const e of [-1, 1]) F.cor(0x7c7a74, .95).caixa(e * 5.62, y - .2, z - .06, .34, .36, .34);
    for (let x = -5; x <= 5; x += 2) F.cor(0x2a2c2e).caixa(x, y - .085, z, .04, .17, .17).caixa(x, y + .075, z - .07, .014, PASS.y - y - .2, .014);
    for (const [o, r] of [[-.115, .012], [-.14, .01]]) { const pts = []; for (let i = 0; i <= 22; i++) { const x = -5.4 + i * 10.8 / 22; pts.push(V(x, y + o - .02 * Math.abs(Math.sin(i * 1.571)) - rng() * .01, z + (i % 2 ? .02 : -.02))); } W.cor(0x0b0b0d).fio(pts, r); } }
  return 1;
}
// Placas de telhado autorais lidas da matriz de cada instância (addPlacaSB: geometria de referência 3,4 × 0,1 × 5,6; X atravessa a água
// — é a direção do caimento —, Y é a normal, Z corre ao longo da casa). Só as de zinco (chave do kit ou arquivo do mapa) com ≥ 1,2 m.
function placasDe(scene) {
  const out = [], M = new THREE.Matrix4(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  const zinco = (m) => /tex_zinco/.test(m?.userData?.hdChave || '') || /tex_zinco/.test(m?.map?.source?.data?.currentSrc || m?.map?.source?.data?.src || '');
  scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.geometry?.attributes?.position || !zinco(Array.isArray(o.material) ? o.material[0] : o.material)) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    if (!b || Math.abs(b.max.x - b.min.x - 3.4) > .05 || Math.abs(b.max.y - b.min.y - .1) > .02 || Math.abs(b.max.z - b.min.z - 5.6) > .05) return;
    o.updateMatrixWorld();
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); M.premultiply(o.matrixWorld); M.extractBasis(X, Y, Z);
      const w = X.length() * 3.4, h = Y.length() * .1, d = Z.length() * 5.6; if (w < 1.2 || d < 1.2 || !(h > .01)) continue;
      const p = { c: new THREE.Vector3().setFromMatrixPosition(M), X: X.clone().normalize(), Y: Y.clone().normalize(), Z: Z.clone().normalize(), w, h, d };
      if (p.Y.y < 0) { p.Y.negate(); p.X.negate(); }
      if (p.Y.y > .5) out.push(p); }
  });
  return out;
}
// Faixa do corpo: devolve um teste (x, y0, y1, z) que é falso quando o trecho vertical [y0, y1] cai entre 0,6 e 1,9 m acima de algum
// piso que o mapa conhece naquele ponto (groundHeightAt nas várias camadas: leito, rua, andar do sobrado, laje/travessia).
const foraDaFaixa = (mundo) => { if (typeof mundo?.groundHeightAt !== 'function') return () => true;
  return (x, y0, y1, z) => { for (const yr of [undefined, -1.6, .3, 3.2, 6]) { const f = mundo.groundHeightAt(x, z, yr); if (!Number.isFinite(f) || f > y1) continue; if (y1 - f > .6 && y0 - f < 1.9) return false; } return true; }; };
// Telhados, r26: caibros de 5 × 6 a cada 55 cm sob cada água, mão-francesa onde ela passa ≥ 50 cm da parede, lastro (bloco, pedra,
// pneu, tábua) nas águas com centro ≥ 4,4 m. Invariante: cada peça só entra fora da faixa do corpo de todo piso abaixo dela.
function telhadosR26(F, rng, placas, casas, ceram, mundo) {
  const MAD = [0x4b4238, 0x574c40, 0x3f382f], P = new THREE.Vector3(), Xh = new THREE.Vector3(), fora = foraDaFaixa(mundo);
  const corpos = casas.map((k) => ({ x: k.x, z: k.z, hx: k.hx, hz: k.hz, topo: k.topo }));
  for (const [x, z, w, d, h] of PALAFITAS) corpos.push({ x, z, hx: w / 2, hz: d / 2, topo: 1.8 + h });
  const ceramica = (p) => (ceram || []).some((c) => { const dx = p.c.x - c.x, dz = p.c.z - c.z; return Math.abs(dx * c.cs - dz * c.sn) < c.ha && Math.abs(dx * c.sn + dz * c.cs) < c.hb; });
  let caibros = 0, maos = 0, lastros = 0;
  for (const p of placas) {
    const cy = p.c.y, incl = Math.abs(p.X.y), sobra = .18 + rng() * .1;
    if (cy - (p.w / 2 + sobra) * incl - p.h / 2 - .07 >= 1.95) for (let zo = -p.d / 2 + .22; zo <= p.d / 2 - .2; zo += .55) {
      P.copy(p.c).addScaledVector(p.Z, zo + (rng() - .5) * .06).addScaledVector(p.Y, -p.h / 2 - .06); const m2 = p.w / 2 + sobra, tom = MAD[Math.floor(rng() * 3)], g = .85 + rng() * .3;
      if (![-1, 0, 1].every((e) => fora(P.x + p.X.x * e * m2, P.y + p.X.y * e * m2, P.y + p.X.y * e * m2 + .06, P.z + p.X.z * e * m2))) continue;
      F.cor(tom, g).caixaEixos(P, p.X, p.Y, p.Z, m2 * 2, .06, .05); caibros++; }
    // Corpo sob a placa: o eixo a do corpo é a projeção horizontal de X; a placa passa da parede do lado em que está o seu centro.
    Xh.set(p.X.x, 0, p.X.z).normalize();
    for (const k of corpos) {
      const dx = p.c.x - k.x, dz = p.c.z - k.z, a0 = dx * Xh.x + dz * Xh.z, b0 = dx * p.Z.x + dz * p.Z.z, s = Math.sign(a0) || 1, meia = p.w / 2 * Math.hypot(p.X.x, p.X.z);
      if (Math.abs(a0) > k.hx || Math.abs(b0) > .6 || Math.abs(a0) + meia < k.hx + .5) continue;
      for (let b = -k.hz + .35; b <= k.hz - .3; b += 1.1) {
        const wx = k.x + Xh.x * s * (k.hx + .03) + p.Z.x * b, wz = k.z + Xh.z * s * (k.hx + .03) + p.Z.z * b, bx = wx + Xh.x * s * .45, bz = wz + Xh.z * s * .45;
        const yB = cy - ((bx - p.c.x) * p.Y.x + (bz - p.c.z) * p.Y.z) / p.Y.y - (p.h / 2 + .06) / p.Y.y - .01, yA = Math.min(yB - .45, k.topo - .25);
        if (yA < 1.95 || yB - yA > 1.3 || !fora(wx, yA, yA + .1, wz) || !fora(bx, yB - .1, yB, bz)) continue;
        F.cor(MAD[Math.floor(rng() * 3)], .85 + rng() * .3).tubo([V(wx, yA, wz), V(bx, yB, bz)], .03, 4); maos++; }
      break;
    }
    if (cy >= 4.4 && p.w > 2 && !ceramica(p) && fora(p.c.x, cy, cy + .3, p.c.z)) {
      const sobre = (u, v, dy = 0) => P.copy(p.c).addScaledVector(p.X, u).addScaledVector(p.Z, v).addScaledVector(p.Y, p.h / 2 + dy);
      for (let i = 0, m = 2 + Math.floor(rng() * 2); i < m; i++) { sobre((rng() - .5) * p.w * .7, (rng() - .5) * p.d * .8);
        const bloco = rng() < .5; F.cor(bloco ? 0x77746e : 0x8a553c, .85 + rng() * .3).caixaEixos(P, p.X, p.Y, p.Z, bloco ? .39 : .19, bloco ? .14 : .09, .19); lastros++; }
      for (let i = 0, m = 1 + Math.floor(rng() * 3); i < m; i++) { sobre((rng() - .5) * p.w * .7, (rng() - .5) * p.d * .8, -.03); const r = .1 + rng() * .1;
        F.cor(0x6e6a62, .8 + rng() * .35).torno(P.x, P.y, P.z, [[r * .9, 0], [r, r * .35], [r * .7, r * .75], [r * .3, r * .9]], 6, rng() * 6.28); lastros++; }
      if (rng() < .55) { sobre((rng() - .5) * p.w * .5, (rng() - .5) * p.d * .6, .07); const pts = [], c0 = P.clone();
        for (let t = 0; t <= 12; t++) { const a = t / 12 * Math.PI * 2; pts.push(c0.clone().addScaledVector(p.X, Math.cos(a) * .24).addScaledVector(p.Z, Math.sin(a) * .24)); }
        F.cor(0x16171a, .9 + rng() * .3).tubo(pts, .065, 5); lastros++; }
      if (rng() < .6 && p.d > 2.6) { sobre((rng() - .5) * p.w * .4, (rng() - .5) * (p.d - 2.4));
        F.cor(MAD[Math.floor(rng() * 3)], 1.1 + rng() * .3).caixaEixos(P, p.X, p.Y, p.Z, .2, .03, 2.0); lastros++; }
    }
  }
  return { caibros, maosFrancesas: maos, lastroR26: lastros };
}
// Palafitas, r26: barrotes de 6 × 12 em balanço até a viga de borda em |x| 2,92; estacas de eucalipto com X de sarrafo no leito.
// Invariante: as estacas ficam a 8 cm do muro e páram no topo dele (acima cruzariam a visada beira → leito); o resto respeita foraDaFaixa.
function estacasR26(F, rng, cols, mundo) {
  let n = 0;
  const pil = (cols || []).filter((c) => c.minY < .05 && Math.abs(c.maxY - 2.2) < .06).map(caixaDe).filter((k) => k.hx < .12 && k.hz < .12);
  const livre = (z, lado) => ![-22, 0, 22].some((b) => Math.abs(z - b) < 1.9) && !RAMPAS.some(([l, a, b]) => l === lado && z > a - .4 && z < b + .4) && Math.abs(z - PASS.z) > 1.9 && Math.abs(z) < 31.5;
  const MAD = [0x4b4238, 0x574c40, 0x3f382f], fora = foraDaFaixa(mundo);
  for (const [x, z, w, d] of PALAFITAS) {
    const meus = pil.filter((p) => Math.hypot(p.x - x, p.z - z) < 3.2), tem = meus.length >= 3, cs = tem ? meus[0].cs : 1, sn = tem ? meus[0].sn : 0, k = { x, z, cs, sn }, s = Math.sign(x), ry = Math.atan2(sn, cs), xb = s * 2.92;
    // Ponta de cada barrote do lado do canal: onde o eixo a do corpo cruza x = ±2,9 (ou a borda do corpo + 10 cm, se não houver estaca).
    const bs = []; for (let b = -d / 2 + .25; b <= d / 2 - .2; b += .5) bs.push(b);
    const zs = bs.map((b) => { const a = (s * 2.9 - x - b * sn) / cs; return z - a * sn + b * cs; }), zMin = Math.min(...zs), zMax = Math.max(...zs);
    const postos = []; for (let zp = zMin + .15; zp <= zMax - .1; zp += 1.25) if (livre(zp, s)) postos.push(zp + (rng() - .5) * .2);
    const comEstaca = postos.length >= 2;
    bs.forEach((b, i) => { const aFim = comEstaca && livre(zs[i], s) ? (s * 2.9 - x - b * sn) / cs : -s * (w / 2 + .1), aIn = s * w * .38, len = Math.abs(aIn - aFim), tom = MAD[i % 3], g = .85 + rng() * .3;
      if (![0, 1, 2, 3, 4, 5, 6, 7, 8].every((q) => [-.08, 0, .08].every((db) => { const [jx, jz] = mundoDe(k, aFim + (aIn - aFim) * q / 8, b + db); return fora(jx, 2.08, 2.2, jz); }))) return;
      const [cx, cz] = mundoDe(k, (aIn + aFim) / 2, b); F.cor(tom, g).caixa(cx, 2.08, cz, len, .12, .06, ry); });
    for (const p of tem ? meus : []) for (let j = 0; j < 2; j++) { const r = .1 + rng() * .08, a = rng() * 6.28, px = p.x + Math.cos(a) * .3, pz = p.z + Math.sin(a) * .3, g = .8 + rng() * .3;
      if (fora(px, 0, r, pz)) F.cor(0x6e6a62, g).torno(px, 0, pz, [[r, 0], [r * 1.05, r * .4], [r * .6, r * .8]], 6, a); }
    if (!comEstaca) { n++; continue; }
    const z0 = postos[0] - .25, z1 = postos[postos.length - 1] + .25, gv = .9 + rng() * .2;
    if ([z0, (z0 + z1) / 2, z1].every((zv) => fora(xb, 1.92, 2.08, zv))) F.cor(MAD[0], gv).caixa(xb, 1.92, (z0 + z1) / 2, .06, .16, z1 - z0);
    const pes = postos.map((zp) => { const tomba = (rng() - .5) * .3, r = .055 + rng() * .015;
      F.tuboG([V(xb, -1.85, zp), V(xb, -1.61, zp + tomba * .06), V(xb, -1.15, zp + tomba * .19), V(xb, -.5, zp + tomba * .36), V(xb, -.05, zp + tomba * .48)],
        [r * 1.12, r * 1.1, r * 1.05, r, r * .97], 7, [0x3f3a33, 0x4c5a34, 0x3f3a33, 0x6e6256, 0x746a5c]).cor(0x8a8171).torno(xb, -.05, zp + tomba * .48, [[r * .97, 0], [r * .9, .012]], 7);
      return [zp, tomba]; });
    // Contraventamento em X entre estacas vizinhas, do lado do canal, só entre a lâmina e o topo do muro (y −1,45 … −0,2).
    for (let i = 0; i + 1 < pes.length; i++) { const [za, ta] = pes[i], [zb, tb] = pes[i + 1], xc = xb - s * .075, em = (zp, t, y) => zp + t * (y + 1.85) / 3.77;
      F.cor(MAD[1], .8 + rng() * .3).tubo([V(xc, -1.45, em(za, ta, -1.45)), V(xc, -.2, em(zb, tb, -.2))], .02, 4).tubo([V(xc - s * .03, -.2, em(za, ta, -.2)), V(xc - s * .03, -1.45, em(zb, tb, -1.45))], .02, 4); }
    n++;
  }
  return n;
}
// Parede +z do barraco de passagem, r26 (no lugar do quadro de portão de portaoBarraco): caibro de 5 × 6 em cada emenda de pano (x
// múltiplo de 1,10 m, como no shader hdTapumeR26), sarrafo de pé e de topo fora da faixa do corpo e mão-francesa curta só acima de 2,1 m.
function quadroBarracoR26(F, rng) {
  const x0 = -20.3, x1 = -16.1, zf = -8.62, MAD = 0x5a5148;
  for (let x = Math.ceil(x0 / 1.1) * 1.1; x < x1; x += 1.1) F.cor(MAD, .85 + rng() * .3).caixa(x, .02, zf + .03, .05, 2.96, .06);
  F.cor(MAD, .8).caixa((x0 + x1) / 2, .2, zf + .025, x1 - x0, .1, .025).cor(MAD, 1.05).caixa((x0 + x1) / 2, 2.78, zf + .025, x1 - x0, .1, .025);
  for (let x = Math.ceil(x0 / 1.1) * 1.1; x < x1 - .7; x += 2.2) F.cor(MAD, .9 + rng() * .2).tubo([V(x + .03, 2.15, zf + .05), V(x + .6, 2.74, zf + .05)], .02, 4);
  return 1;
}
// Palafitas [x, z, w, d, h] da planta (ry medido nos colisores): cada grupo de 4 pilares vira pilotis de 28 cm com sapata e viga de transição;
// réguas e cantoneiras no tapume do lado do canal. A mais próxima de (5,5; −19) vai à cerâmica. Ver docs/hd-kit/corrego.md#palafitas.
const PALAFITAS = [[-5.4, -27, 4.4, 4.2, 2.8], [5.5, -19, 4.6, 4.4, 3.1], [-5.6, 18, 4.5, 4.0, 2.8], [5.3, 24, 4.3, 4.6, 3.2], [-5.2, 4.5, 4.4, 4.2, 3.0], [5.45, -34, 4.2, 4.0, 2.8]];
function palafitas(F, rng, cols, ceram) {
  let n = 0;
  const pil = (cols || []).filter((c) => c.minY < .05 && Math.abs(c.maxY - 2.2) < .06).map(caixaDe).filter((k) => k.hx < .12 && k.hz < .12);
  for (const [x, z, w, d] of PALAFITAS) {
    // Sem os 4 colisores (planta diferente) a palafita vai na posição da tabela com ry = 0.
    const meus = pil.filter((p) => Math.hypot(p.x - x, p.z - z) < 3.2), tem = meus.length >= 3;
    const cs = tem ? meus[0].cs : 1, sn = tem ? meus[0].sn : 0, ry = Math.atan2(sn, cs), k = { x, z, cs, sn }, s = Math.sign(x);
    const pes = tem ? meus : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ({ x: x + a * w * .4, z: z + b * d * .4 }));
    for (const p of pes) F.cor(0x8d8b84, .92 + rng() * .12).caixa(p.x, 0, p.z, .28, 2.2, .28, ry).cor(0x7c7a73).caixa(p.x, 0, p.z, .5, .22, .5, ry);
    // Viga perimetral 30 × 35 sob o corpo e PAREDE DE BLOCO até o chão no lado das casas (x + s·0,4·w, fora do passeio da beira):
    // fecha a caixa por baixo; fiadas de 20 cm marcadas com junta clara. O lado do canal fica aberto (escoras + tapume autorais).
    for (const [a, b, la, lb] of [[0, -d * .4, w * .8 + .30, .30], [0, d * .4, w * .8 + .30, .30], [-w * .4, 0, .30, d * .8 + .30], [w * .4, 0, .30, d * .8 + .30]]) {
      const [vx, vz] = mundoDe(k, a, b); F.cor(0x86847d, .92 + rng() * .12).caixa(vx, 1.85, vz, la, .35, lb, ry);
    }
    { const [px, pz] = mundoDe(k, s * w * .4, 0), lp = d * .8 - .3;
      F.cor(0x6a3a26, .9 + rng() * .2).caixa(px, 0, pz, .2, 1.85, lp, ry);
      for (let yy = .2; yy < 1.8; yy += .2) F.cor(0x8a857a, .9).caixa(px, yy, pz, .21, .012, lp, ry); }
    const tx = x - s * (w / 2 + .06);
    for (let kk = -1; kk <= 1; kk++) {
      const th = ry + kk * .05, c2 = Math.cos(th), s2 = Math.sin(th), h = (kk & 1) ? 1.7 : 1.3, len = d * .62, cz = z + kk * 1.2, af = -s * .065;
      const cx = tx + af * c2, czf = cz - af * s2;
      F.cor(0x4b3a28, .9 + rng() * .2).caixa(cx, 2.62, czf, .04, .04, len, th).caixa(cx, 2.6 + h - .04, czf, .04, .04, len, th).caixa(cx, 2.64, czf, .04, h - .08, .04, th);
      for (const e of [-1, 1]) { const b = e * (len / 2 - .03); F.cor(0x3a3d42, .95).caixa(cx + b * s2, 2.6, czf + b * c2, .045, h, .045, th); }
    }
    if (ceram && Math.hypot(x - 5.5, z + 19) < 1) ceram.push({ x, z, cs, sn, ha: w / 2 + .9, hb: d / 2 + .5 });
    n++;
  }
  return n;
}
// Pano pendurado em (cx, y, cz) com o varal na direção (dx, dz): lençol, camisa ou calça em grade com bojo e normal média, dois pregadores.
// `tipoFixo` força o tipo (< 0,4 lençol) sem mudar o consumo do rng.
function pano(F, rng, cx, y, cz, dx, dz, w, h, cor, tipoFixo) {
  const nx = -dz, nz = dx, vai = (rng() - .5) * .05, tipoR = rng(), tipo = tipoFixo ?? tipoR, bojo = .05 + rng() * .03, fase = rng() * 6.28;
  const Q = (u, v, fora = 0) => { const b = bojo * Math.sin(Math.PI * Math.min(1, Math.max(0, u + .5))) * (.25 + .75 * v) + bojo * .35 * Math.sin(3.1 * Math.PI * (u + .5) + fase) * v;
    return V(cx + dx * u * w + nx * (vai * v + fora + b), y - v * h, cz + dz * u * w + nz * (vai * v + fora + b)); };
  // quadrilátero (u, v) nos cantos [s0t0, s1t0, s0t1, s1t1] como grade bilinear
  const bil = (c, nu, nv, fora = 0) => F.grade((s, t) => Q(lerp(lerp(c[0][0], c[1][0], s), lerp(c[2][0], c[3][0], s), t), lerp(lerp(c[0][1], c[1][1], s), lerp(c[2][1], c[3][1], s), t), fora), nu, nv);
  let preg = [-.42, .42];
  // Listra do lençol: só em 1 em 3, em altura sorteada (v 0,25–0,75) e 1,5 cm à frente (a 4 mm briga no z a 9 m).
  // Listra em altura fixa alinha todos os lençóis do varal numa linha só. Ver docs/hd-kit/corrego.md#panos.
  if (tipo < .4) { F.cor(cor, .85 + rng() * .3); bil([[-.5, 0], [.5, 0], [-.5, 1], [.5, 1]], 4, 3); if (rng() < .34) { const v0 = .25 + rng() * .5; F.cor(PANOS[Math.floor(rng() * PANOS.length)], .9); bil([[-.5, v0], [.5, v0], [-.5, v0 + .1], [.5, v0 + .1]], 4, 1, .015); } }
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

// Varal autoral (cabo reto a 3,2 m; o kit zera os retângulos de cor pura): linha baixa a 2,62 m, amarrada a ele, com camisa, calça e lençol.
// A barra dos panos fica em ≥ 2,1 m (fora da faixa do corpo). Ver docs/hd-kit/corrego.md#panos.
const VARAIS_AUTORAIS = [[-18.4, 13.65], [-3.2, 13.65], [16.8, 13.65], [28.4, 13.65], [-29.0, 6.0], [9.6, 6.0]];
function roupas(F, W, rng) {
  let n = 0;
  for (const lado of [-1, 1]) for (const [z, xv] of VARAIS_AUTORAIS) {
    const x = lado * xv, xc = x + lado * .12, y = 2.62, alt = (t) => y - .05 * 4 * t * (1 - t);
    W.cor(0x1c1b1a).fio([V(x, 3.2, z - 1.95), V(xc, y, z - 1.9)], .006).fio(catenaria(V(xc, y, z - 1.9), V(xc, y, z + 1.9), .05, 2.4), .006).fio([V(xc, y, z + 1.9), V(x, 3.2, z + 1.95)], .006);
    let s = -1.75 + rng() * .3, i = 0; const lencol = Math.floor(rng() * 3);
    while (s < 1.7) { const sheet = i === lencol, w = sheet ? 1.1 : .32 + rng() * .28; if (s + w > 1.85) break; const yy = alt((s + w / 2 + 1.9) / 3.8) - .012;
      pano(F, rng, xc, yy, z + s + w / 2, 0, 1, w, sheet ? yy - 2.1 : Math.min(.42 + rng() * .3, yy - 2.1), sheet ? [0xd9d5c8, 0xd2cbb6][lado > 0 ? 0 : 1] : PANOS[Math.floor(rng() * PANOS.length)], sheet ? .1 : undefined);
      s += w + .05 + rng() * .12; i++; }
    n++;
  }
  return n;
}
// Tabuleiro da travessia (pose `alto`): caixa d'água azul de 500 L em x 4,4, encostada no guarda de z −12,25, e varal de dois T na mesma borda.
// O cabo fica 20 cm para FORA (z −12,45): os panos pendem sobre o vazio, não sobre a rota. Ver docs/hd-kit/corrego.md#mirante.
function mirante(F, W, rng) {
  const y = PASS.y, z = PASS.z - PASS.meiaL, tx = 4.4, tz = z + .5, cor = 0x1b4f9c, r = .42, alt = .8;
  const yb = base(F, rng, tx, y, tz, 1.0, 1.0, 0, 2);
  F.cor(cor, .95).torno(tx, yb, tz, [[r * .84, 0], [r * .98, alt * .18], [r, alt * .72], [r * .97, alt * .9], [r * .92, alt]], 20)
    .cor(cor, 1.05).torno(tx, yb + alt, tz, [[r * .92, 0], [r * .55, alt * .06], [r * .2, alt * .09]], 20);
  for (const f of [.3, .55]) F.cor(cor, .8).torno(tx, yb + alt * f, tz, [[r * 1.01, 0], [r * 1.01, .025]], 20);
  F.cor(0x8d9290).tubo([V(tx - r * .9, yb + alt * .75, tz), V(tx - r * 1.4, yb + alt * .75, tz), V(tx - r * 1.4, y + .3, tz), V(tx - r * 1.4, y + .3, z + .06)], .02, 4);
  const x0 = -1.0, x1 = 2.2, zc = z - .2, L = x1 - x0;
  for (const px of [x0, x1]) F.cor(0x7c7f7c).tubo([V(px, y, z + .25), V(px, y + 1.75, z + .25)], .022, 5).caixa(px, y + 1.72, z + .05, .05, .05, .5).cor(0x4a4c4a).caixa(px, y, z + .25, .24, .09, .24);
  W.cor(0x1c1b1a).fio(catenaria(V(x0, y + 1.74, zc), V(x1, y + 1.74, zc), .08, y + 1.4), .006);
  let s = .25 + rng() * .2;
  while (s < L - .5) { const w = .32 + rng() * .24; if (s + w > L - .25) break; const t = (s + w / 2) / L, yy = y + 1.74 - .08 * 4 * t * (1 - t) - .012;
    pano(F, rng, x0 + s + w / 2, yy, zc, 1, 0, w, .5 + rng() * .3, PANOS[Math.floor(rng() * PANOS.length)]); s += w + .05 + rng() * .1; }
  return 1;
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
// Tela 1024 × 1024 (flipY: v = 1 − y/1024): portas de enrolar, duas placas de letrista de 512 × 120, basculantes e dois portões de 1 × 2 m.
// As UVs de comercio, portoes e basculantes dependem destas células. Mapa: docs/hd-kit/corrego.md#comercio.
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
// Boca de comércio nas fachadas que as poses enquadram (BOCAS): faixa pintada, porta de enrolar, placa de letrista, toldo, freezer e engradado.
// A placa fica à FRENTE do fundo escuro; a porta autoral da casa fica na face +z, fora destas faces. Ver docs/hd-kit/corrego.md#comercio.
const BOCAS = [{ x: -9.75, z: 2.6, eixo: 'z', s: -1, faixa: 0x1f6a3a }, { x: -9.75, z: -24.9, eixo: 'x', s: 1, faixa: 0x1d3f8a }];
function comercio(F, T, rng, casas) {
  let n = 0;
  for (const b of BOCAS) {
    const k = maisPerto(casas, b.x, b.z); if (!k) continue;
    // v0 = base da célula da placa na tela (flipY; a placa 1 fica em cima).
    const f = faceDe(k, b.eixo, b.s), { fx, fz, nx, nz, tx, tz } = f, P = (u, y, fora) => V(fx + tx * u + nx * fora, y, fz + tz * u + nz * fora), v0 = n ? .7578125 : .8828125;
    // Faixa pintada colada na alvenaria acima do embasamento (que avança 8 cm até 1,05 m; a face fx já está 2 cm à frente da parede).
    F.cor(b.faixa, .8).caixa(fx - nx * .012, 1.05, fz - nz * .012, 2.6, 1.51, .016, f.ry);
    // batente e soleira de concreto à frente do embasamento (8 cm); porta de enrolar 10,5 cm à frente da face
    F.cor(0x7c7a74, .9).caixa(fx + nx * .04, 0, fz + nz * .04, 1.9, 2.32, .12, f.ry).cor(0x5a5955).caixa(fx + nx * .1, 0, fz + nz * .1, 1.9, .06, .12, f.ry);
    // 2ª boca usa a lâmina pintada/riscada; caixa cilíndrica do rolo em cima do vão e guias laterais em U dos dois lados.
    T.quad(P(-.8, .04, .105), P(.8, .04, .105), P(.8, 2.24, .105), P(-.8, 2.24, .105), 0, n ? 0 : .5, .5, n ? .5 : 1);
    F.cor(0x5a5d60, .95).caixa(fx + nx * .13, 2.24, fz + nz * .13, 1.96, .27, .26, f.ry).cor(0x3e4144).caixa(fx + nx * .265, 2.24, fz + nz * .265, 1.96, .05, .012, f.ry);
    for (const u of [-.86, .86]) F.cor(0x4a4d50).caixa(fx + tx * u + nx * .11, .06, fz + tz * u + nz * .11, .05, 2.26, .07, f.ry);
    F.cor(0x3c3e40).caixa(fx + nx * .012, 2.95, fz + nz * .012, 2.28, .58, .03, f.ry);
    T.quad(P(-1.1, 2.98, .05), P(1.1, 2.98, .05), P(1.1, 3.5, .05), P(-1.1, 3.5, .05), .5, v0, 1, v0 + .1171875);   // célula de 120 px de altura
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
// Portão no térreo das fachadas livres (1 por face de ≥ 3,2 m, 2 a partir de 7 m): batente de concreto, folha da tela, soleira e cadeado.
// Na face +z a porta autoral está em u = 0,6: nada a < 1,3 m dela. Tipos e medidas: docs/hd-kit/corrego.md#portoes.
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
// Parede +z do barraco de passagem (x −20,3…−16,1, face em z −8,62), lida como portão na pose `rua`: ferragem de portão de correr.
// Posição copiada de map_corrego.js; nada tem colisão. Peças: docs/hd-kit/corrego.md#portoes.
function portaoBarraco(F, W, rng) {
  const x0 = -20.3, x1 = -16.1, xm = -18.2, zf = -8.62;
  F.cor(0x3f3b36).caixa(xm, 3.02, zf + .075, 4.5, .06, .05);
  for (const x of [x0 + .3, x1 - .3]) F.cor(0x2f2c28).caixa(x, 2.98, zf + .05, .08, .1, .1);
  for (const x of [xm - 1.0, xm + 1.0]) F.cor(0x2a2825).caixa(x, 2.88, zf + .06, .1, .13, .06);
  for (const x of [x0 + .08, xm, x1 - .08]) F.cor(0x3f3b36, .9 + rng() * .2).caixa(x, .03, zf + .035, .05, 2.92, .04);
  for (const y of [.25, 1.5, 2.75]) F.cor(0x3f3b36, .95).caixa(xm, y, zf + .03, 4.1, .05, .035);
  for (const y of [.45, 1.5, 2.55]) F.cor(FERRO).caixa(x0 + .16, y, zf + .045, .16, .12, .025).cor(0x4a4540).tubo([V(x0 + .05, y - .02, zf + .055), V(x0 + .05, y + .14, zf + .055)], .018, 5);
  F.cor(0x8a7a3a).caixa(xm + .06, 1.0, zf + .07, .05, .06, .025).cor(0x5b5a56).caixa(xm + .06, 1.06, zf + .07, .035, .04, .012);
  W.cor(0x2a2a2a).fio([V(xm - .02, 1.32, zf + .06), V(xm + .05, 1.16, zf + .085), V(xm + .06, 1.08, zf + .07)], .008);
  return 1;
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

// Skyline de SP: caixas instanciadas num anel de 70–185 m (fora do mundo jogável), com grade de janelas e varanda por shader.
// A névoa entra DEPOIS do tonemap e lava a janela do albedo: a grade também desconta sobre a cor final. Ver docs/hd-kit/corrego.md#skyline.
function skyline(grupo, rng) {
  const N = 150, lista = [];
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2, r = 70 + Math.pow(rng(), .8) * 115, t = rng(), h = (t < .7 ? 12 + rng() * 18 : t < .95 ? 30 + rng() * 26 : 55 + rng() * 25) * .8;
    lista.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 8 + rng() * 14, d: 8 + rng() * 14, h: h * (1 + r / 400), ry: rng() * .5, cor: [0x6e6252, 0x7a6b58, 0x655a4a, 0x80735e, 0x5e5446, 0x74685a][Math.floor(rng() * 6)] });
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
      // 3 variantes por prédio (hdSem): 0 = janela em grade 2,5 × 3,0; 1 = fita horizontal contínua a cada 3,2 m (pavimento
      // de laje marcada); 2 = janelas estreitas 1,6 × 2,9 em faixa clara. Torres idênticas leem como cópia.
      if (vHdLado < 0.5) { float hdSem = vHdYUS.z, hdTipo = floor(hdSem * 3.0);
        vec2 hdPasso = hdTipo < 0.5 ? vec2(2.5, 3.0) : hdTipo < 1.5 ? vec2(3.4, 3.2) : vec2(1.6, 2.9);
        float hdFy = fract(vHdYUS.x / hdPasso.y), hdFu = fract(vHdYUS.y / hdPasso.x);
        vec2 hdCel = floor(vec2(vHdYUS.y / hdPasso.x, vHdYUS.x / hdPasso.y)) + hdSem * 31.0;
        float hdR = fract(sin(dot(hdCel, vec2(12.9898, 78.233))) * 43758.5453);
        float hdJan = hdTipo < 1.5 ? step(0.30, hdFy) * step(hdFy, 0.72) * step(mix(0.22, 0.04, step(0.5, hdTipo)), hdFu) * step(hdFu, mix(0.78, 0.96, step(0.5, hdTipo)))
          : step(0.22, hdFy) * step(hdFy, 0.80) * step(0.30, hdFu) * step(hdFu, 0.70);
        hdJan *= step(0.4, vHdYUS.x);
        hdJanE = hdJan * step(mix(0.7, 0.85, step(0.5, hdTipo)), hdR); hdJanM = hdJan - hdJanE;
        hdVar = (step(1.5, hdTipo) * step(0.80, hdFy) + step(0.67, hdSem) * step(0.04, hdFy) * step(hdFy, 0.22)) * step(0.4, vHdYUS.x);
        diffuseColor.rgb *= mix(1.0, 0.9, step(0.5, hdTipo) * step(hdTipo, 1.5)) * (1.0 - 0.75 * hdJanE - 0.45 * hdJanM);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.54, 0.50), hdVar * 0.5); }
      else diffuseColor.rgb *= 0.9;`)
      .replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment.replace(/, fogFactor \);/, ', fogFactor * 0.72 );')
        + '\n gl_FragColor.rgb = min(gl_FragColor.rgb * (1.0 - 0.32 * hdJanE - 0.16 * hdJanM) + 0.035 * hdVar, vec3(1.0));');
  };
  mat.customProgramCacheKey = () => 'hd-skyline7';
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
  const F = fundidor(), F2 = fundidor(true), W = fiador(), T = texturador(), relogios = [], L = [], r26 = opts.r26 || {};
  const topo = casas.length && (lig('lajes') || lig('telhados')) ? medidor(scene) : null;
  if (lig('postes') && lista.length) info.cabos = postes(F, W, rngDe(7717), lista, mundo?.ctfPoints);
  if (lig('postes')) info.cabosRua = postesRua(F, W, rngDe(6161), casas);
  if (lig('fachadas') && casas.length) info.fachadas = fachadas(F, W, rngDe(9311), casas, lista, relogios);
  // `ceramicos` (array do kit): caixas orientadas que o shader da chapa pinta de telha cerâmica; a palafita da pose `alto` entra primeiro.
  if (lig('palafitas')) info.palafitas = palafitas(F, rngDe(8117), cols, opts.ceramicos);
  if (lig('lajes') && topo) Object.assign(info, lajes(F, W, rngDe(40123), casas, topo));
  if (lig('lajes')) info.mirante = mirante(F, W, rngDe(7177));
  if (lig('telhados') && topo) { info.telhados = telhados(F, rngDe(50821), casas, topo, L, opts.ceramicos); info.lastro = L.length; }
  if (lig('canal')) { info.guia = guiaCanal(F, rngDe(5519)); info.esgoto = esgotoCanal(F, rngDe(5527)); }
  if (lig('margem')) info.margem = margem(F, rngDe(7331));
  if (lig('guias') && casas.length) info.guias = guias(F, rngDe(1933), casas, cols);
  if (lig('varais') && casas.length) info.varais = varais(F, W, rngDe(1201), casas);
  if (lig('roupas')) info.roupas = roupas(F, W, rngDe(6113));
  if (lig('sacos')) info.sacos = nosDeSaco(F, rngDe(4477));
  if (lig('toldos') && casas.length) info.toldos = toldos(F, rngDe(3307), casas);
  if (lig('comercio') && casas.length && typeof document !== 'undefined') info.comercio = comercio(F, T, rngDe(2719), casas);
  if (lig('portoes') && casas.length && typeof document !== 'undefined') { info.portoes = portoes(F, T, rngDe(6121), casas); info.basculantes = basculantes(F, T, rngDe(8431), casas); }
  if (lig('portoes')) info.portaoBarraco = r26.tapume ? quadroBarracoR26(F, rngDe(6131)) : portaoBarraco(F, W, rngDe(6131));
  if (lig('becos') && casas.length) info.becos = becos(F, rngDe(2213), casas);
  // Só a pedido do kit (travessia de concreto ligada). r26: a grade e os 3 degraus do pé saem com `obra`, a pingadeira lisa com `tijolo`.
  if (opts.guarda) info.guarda = guardaTravessia(F, rngDe(3119), { grade: !r26.obra, capa: !r26.tijolo, degraus: !r26.obra });
  if (opts.guarda && r26.tijolo) capaMuretaR26(F, rngDe(3123));
  if (opts.guarda && r26.obra) { info.guardaR26 = guardaR26Cen(F2, rngDe(3121)); info.obra = obraTravessia(F, W, rngDe(3127)); }
  if (r26.telha && lig('telhados')) Object.assign(info, telhadosR26(F, rngDe(50891), placasDe(scene), casas, opts.ceramicos, mundo));
  if (r26.estaca && lig('palafitas')) info.estacas = estacasR26(F, rngDe(8123), cols, mundo);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, side: THREE.DoubleSide, name: 'hd-cenografia' });
  if (F.tris()) { const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-cenografia-fundida'; malha.receiveShadow = true; grupo.add(malha); info.tris = F.tris(); }
  if (F2.tris()) { const res = { value: new THREE.Vector2(1920, 1080) }, ferro = new THREE.Mesh(F2.geo(), materialFerroR26(res)); ferro.name = 'hd-cenografia-ferro-r26'; ferro.receiveShadow = true;
    ferro.onBeforeRender = (r) => { const t = r.getRenderTarget(); if (t) res.value.set(t.width, t.height); else r.getDrawingBufferSize(res.value); };
    grupo.add(ferro); info.trisFerro = F2.tris(); }
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
