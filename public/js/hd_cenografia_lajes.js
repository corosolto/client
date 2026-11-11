// Cenografia HD do Lajes (só com ?hd=1). NADA aqui tem colisão: só fora de `bounds`, em telhado inalcançável (topo >= 5,3 m),
// acima de 3,6 m sobre os becos centrais, acima de 5,4 m no resto, ou colado à parede (até 12 cm de saliência).
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

// Malha fundida com cor por vértice: caixas, tubos e panos viram um draw call só.
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
    tris: () => pos.length / 9,
    geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); g.computeVertexNormals(); return g; },
  };
  return F;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Três cristas em anel (perto, meio, fundo), cada uma com altura própria por ângulo; a névoa separa os planos.
const CRISTAS = [{ r0: 56, rc: 84, h: [17, 26], k: [3, 7, 11], f: 0.7 }, { r0: 88, rc: 128, h: [38, 52], k: [2, 5, 9], f: 2.9 }, { r0: 130, rc: 192, h: [62, 80], k: [1, 4, 6], f: 5.3 }];
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
const adensado = (x, z) => ruido2(x / 46 + 3.1, z / 46 + 7.7) * .7 + ruido2(x / 17, z / 17) * .3;

// Névoa própria do morro (mais rala que a do mapa, que lavava o casario em pastel); o material fica com fog: false.
function nevoa(s, U) {
  Object.assign(s.uniforms, U);
  s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHdD;').replace('#include <project_vertex>', '#include <project_vertex>\nvHdD = length(mvPosition.xyz);');
  s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vHdD; uniform vec3 hdNevoa;\n${RUIDO_PARS}`)
    .replace('#include <fog_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, hdNevoa, 1.0 - exp(-vHdD * vHdD * 0.0000050));');
}

function morro(grupo, rng, U) {
  const NA = 128, NR = 28, pos = [], cor = [], vila = [], idx = [], c = new THREE.Color(), terra = new THREE.Color(0x5a4630), mato = new THREE.Color(0x2c4420), barro = new THREE.Color(0x6a4a34);
  for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
    const a = i / NA * Math.PI * 2, r = 56 + (R_FIM - 56) * j / NR, x = Math.cos(a) * r, z = Math.sin(a) * r, d = suave(.44, .56, adensado(x, z));
    pos.push(x, j === 0 ? -.4 : alturaMorro(x, z), z); vila.push(d);
    c.copy(mato).lerp(terra, suave(.35, .6, ruido2(x / 23 + 9, z / 23))).lerp(barro, d * .7); cor.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + NA + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const gT = new THREE.BufferGeometry(); gT.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gT.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  gT.setAttribute('hdVila', new THREE.Float32BufferAttribute(vila, 1)); gT.setIndex(idx); gT.computeVertexNormals();
  const mT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, fog: false, name: 'hd-morro' });
  // Mato em tufo escuro, capim claro e terra batida onde há vila: detalhe sem triângulo.
  mT.onBeforeCompile = (s) => { nevoa(s, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdVila; varying vec3 vHdM; varying float vHdV;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdM = position; vHdV = hdVila;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdM; varying float vHdV;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec4 hdA = texture2D(hdRuido, vHdM.xz * 0.0125), hdB = texture2D(hdRuido, vHdM.xz * 0.061);
          vec3 hdC = mix(diffuseColor.rgb, vec3(0.26, 0.24, 0.11), 0.6 * smoothstep(0.45, 0.60, hdA.a)) * (0.55 + 0.9 * hdB.r);
          hdC = mix(hdC, vec3(0.026, 0.062, 0.020) * (0.5 + 1.0 * hdB.g), smoothstep(0.47, 0.53, hdA.g * 0.7 + hdB.g * 0.3) * (1.0 - 0.5 * vHdV));
          diffuseColor.rgb = mix(hdC, vec3(0.30, 0.20, 0.14) * (0.6 + 0.8 * hdB.r), 0.55 * vHdV * smoothstep(0.48, 0.56, hdA.r)); }`);
  };
  mT.customProgramCacheKey = () => 'hd-morro4';
  const terreno = new THREE.Mesh(gT, mT); terreno.name = 'hd-morro'; grupo.add(terreno);

  // Casinhas: grade de 6,4 m com sorteio dentro das manchas adensadas; cada célula só recebe uma.
  const casas = [], arvores = [], ocupado = new Set(), CEL = 6.4;
  const TIJOLO = [0x8a4528, 0x7a3c22, 0x96502e, 0x6a3420], CRU = [0x6f685e, 0x7b7469, 0x5c5850], TINTA = [0x77807a, 0x8f8a7c, 0x7a8288];
  for (let t = 0; t < 14000 && casas.length < 640; t++) {
    const a = rng() * Math.PI * 2, r = 60 + Math.pow(rng(), 1.2) * (R_FIM - 68), x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    if (adensado(x0, z0) < .5) continue;
    const ch = `${Math.round(x0 / CEL)}_${Math.round(z0 / CEL)}`; if (ocupado.has(ch)) continue; ocupado.add(ch);
    const x = Math.round(x0 / CEL) * CEL + (rng() - .5) * 1.6, z = Math.round(z0 / CEL) * CEL + (rng() - .5) * 1.6, s = rng(), pal = s < .58 ? TIJOLO : s < .92 ? CRU : TINTA;
    casas.push({ x, z, y: alturaMorro(x, z), w: 4.2 + rng() * 2.4, d: 4.6 + rng() * 2.6, h: (1 + Math.floor(rng() * rng() * 2.9)) * 2.7 + .4, ry: Math.atan2(-x, -z) + (rng() - .5) * .7,
      cor: pal[Math.floor(rng() * 97) % pal.length], caixa: rng() < .5 });
  }
  // Puxadinho no topo: segunda caixa menor e de outra cor quebra a silhueta de cubo.
  const base = casas.length;
  for (let i = 0; i < base && casas.length < 800; i++) { const k = casas[i]; if (hash2(k.x, k.z + 4) > .3) continue;
    casas.push({ ...k, y: k.y + k.h, w: k.w * (.5 + rng() * .3), d: k.d * (.55 + rng() * .3), h: 2.7, cor: (rng() < .6 ? TIJOLO : CRU)[Math.floor(rng() * 3)], caixa: rng() < .5, x: k.x + (rng() - .5) * 1.2, z: k.z + (rng() - .5) * 1.2, topo: true }); k.caixa = false; }
  for (let t = 0; t < 9000 && arvores.length < 420; t++) {
    const a = rng() * Math.PI * 2, r = 60 + rng() * (R_FIM - 66), x = Math.cos(a) * r, z = Math.sin(a) * r, d = adensado(x, z);
    if (d > .5 ? rng() > .16 : rng() > suave(.5, .3, d) + .25) continue;
    arvores.push({ x, z, y: alturaMorro(x, z), s: 2.6 + rng() * 3.0, a: rng() * 6.28 });
  }
  const o = new THREE.Object3D(), cc = new THREE.Color();
  const mC = new THREE.MeshStandardMaterial({ roughness: .95, metalness: 0, fog: false, name: 'hd-morro-casa' });
  // Janela, viga de laje aparente e mancha saem da posição local da caixa em metros (escala da instância).
  // Caixa d'água e mato usam o mesmo material: a geometria deles leva hdLiso = 1 e pula a pintura de casa.
  mC.onBeforeCompile = (s) => { nevoa(s, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdLiso; varying float vHdLiso; varying vec3 vHdC; varying vec3 vHdCN; varying vec2 vHdCI;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 hdE = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vHdC = vec3(position.x * hdE.x, (0.5 - position.y) * hdE.y, position.z * hdE.z); vHdCN = normal; vHdCI = instanceMatrix[3].xz; vHdLiso = hdLiso;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdLiso; varying vec3 vHdC; varying vec3 vHdCN; varying vec2 vHdCI;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vHdLiso < 0.5) { vec3 hdA = abs(vHdCN); vec2 hdI = floor(vHdCI); float hdR = hdH(hdI);
          if (hdA.y > 0.5) { vec4 hdN = texture2D(hdRuido, vHdC.xz * 0.19 + hdR * 5.0);
            diffuseColor.rgb = mix(vec3(0.36, 0.35, 0.33), vec3(0.17, 0.16, 0.15), hdN.r) * (0.75 + 0.5 * hdR); }
          else { float hdU = hdA.x > 0.5 ? vHdC.z : vHdC.x; vec2 hdG = vec2(hdU / 2.1 + 0.5, vHdC.y / 2.7), hdF = fract(hdG), hdW = fwidth(hdG) * 1.2;
            vec4 hdN = texture2D(hdRuido, vec2(hdU * 0.21 + hdR * 7.0, vHdC.y * 0.10 + hdR * 3.0));
            float hdJan = smoothstep(0.31 - hdW.x, 0.31 + hdW.x, hdF.x) * smoothstep(0.69 + hdW.x, 0.69 - hdW.x, hdF.x) * smoothstep(0.34 - hdW.y, 0.34 + hdW.y, hdF.y) * smoothstep(0.72 + hdW.y, 0.72 - hdW.y, hdF.y);
            hdJan *= step(0.14, hdH(floor(hdG) + hdI));
            float hdPorta = smoothstep(0.78 - hdW.x, 0.78 + hdW.x, hdF.x) * smoothstep(0.94 + hdW.x, 0.94 - hdW.x, hdF.x) * smoothstep(0.30 - hdW.y, 0.30 + hdW.y, hdF.y) * step(0.6, hdH(floor(hdG) + hdI + 9.0));
            float hdViga = smoothstep(0.11 + hdW.y, 0.11 - hdW.y, hdF.y);
            vec3 hdC = diffuseColor.rgb * (0.56 + 0.86 * hdN.r) * (0.76 + 0.48 * hdH(vec2(floor(hdG.y), 3.0) + hdI));
            hdC = mix(hdC, dot(hdC, vec3(0.3, 0.59, 0.11)) * vec3(0.50, 0.54, 0.46), 0.75 * smoothstep(0.52, 0.78, hdN.g));
            hdC = mix(hdC, vec3(0.34, 0.33, 0.31) * (0.75 + 0.5 * hdN.a), hdViga * 0.9);
            hdC *= 1.0 - 0.55 * (1.0 - hdViga) * smoothstep(0.26 + hdW.y, 0.11, hdF.y);
            hdC = mix(hdC, hdC * 1.5 + 0.03, hdJan * smoothstep(0.69, 0.72, hdF.y));
            diffuseColor.rgb = mix(mix(hdC, vec3(0.05, 0.06, 0.07), hdPorta * 0.85), vec3(0.012, 0.016, 0.020), hdJan * 0.96 * smoothstep(0.72, 0.69, hdF.y)); } }`);
  };
  mC.customProgramCacheKey = () => 'hd-morro-casa6';
  const iC = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mC, casas.length); iC.name = 'hd-morro-casas';
  const comCaixa = casas.filter((k) => k.caixa);
  const liso = (g) => { g.setAttribute('hdLiso', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1)); return g; };
  const iX = new THREE.InstancedMesh(liso(new THREE.BoxGeometry(1, 1, 1)), mC, comCaixa.length); iX.name = 'hd-morro-caixas';
  casas.forEach((k, i) => { const af = k.topo ? 0 : 3.2; o.position.set(k.x, k.y + k.h / 2 - af / 2, k.z); o.rotation.set(0, k.ry, 0); o.scale.set(k.w, k.h + af, k.d); o.updateMatrix(); iC.setMatrixAt(i, o.matrix); iC.setColorAt(i, cc.setHex(k.cor).multiplyScalar(.8 + hash2(k.x, k.z) * .4)); });
  comCaixa.forEach((k, i) => { o.position.set(k.x + Math.sin(k.ry) * k.d * .2, k.y + k.h + .45, k.z + Math.cos(k.ry) * k.d * .2); o.rotation.set(0, k.ry, 0); o.scale.set(1.1, .9, 1.1); o.updateMatrix(); iX.setMatrixAt(i, o.matrix);
    iX.setColorAt(i, cc.setHex(hash2(k.z, k.x + 2) < .7 ? 0x174f9a : 0x1c1d20)); });
  const iA = new THREE.InstancedMesh(liso(new THREE.IcosahedronGeometry(1, 0)), mC, arvores.length); iA.name = 'hd-morro-mato';
  arvores.forEach((k, i) => { o.position.set(k.x, k.y + k.s * .3, k.z); o.rotation.set(0, k.a, 0); o.scale.set(k.s * (1 + hash2(k.x, 1) * .6), k.s * (.5 + hash2(k.z, 2) * .3), k.s * (1 + hash2(k.x, k.z) * .6)); o.updateMatrix(); iA.setMatrixAt(i, o.matrix);
    iA.setColorAt(i, cc.setHex(hash2(k.z, k.x) < .3 ? 0x2a4c1e : 0x183414).multiplyScalar(.75 + hash2(k.x, 5) * .5)); });
  for (const im of [iC, iX, iA]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; grupo.add(im); }
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
        vec3 nu = mix(vec3(0.95, 0.95, 0.94), vec3(0.42, 0.48, 0.60), miolo * 0.8) * (1.0 - 0.25 * pow(s, 3.0));
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
  [15.5, -17.5, 4.7, -18.5, 4, 1], [15.5, -15.5, 4.7, -17, 2, 0], [15.5, 18, 4.7, 18.5, 3, 1], [15.5, 15.5, 4.7, 17, 4, 0], [-9, -28.6, -4, -25.4, 3, 0]];
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
const PANOS = [0xd9d5c8, 0x46627f, 0xc9a640, 0x5d8f7a, 0xb9c4cf, 0x8f6a94, 0x2f3f55, 0xd2cbb6, 0x3f7f8a];
function pano(F, rng, cx, y, cz, dx, dz, w, h, cor) {
  const nx = -dz, nz = dx, vai = (rng() - .5) * .05, tipo = rng();
  const P = (u, v, fora = 0) => V(cx + dx * u * w + nx * (vai * v + fora), y - v * h, cz + dz * u * w + nz * (vai * v + fora));
  if (tipo < .38) { F.cor(cor, .85 + rng() * .3).quad(P(-.5, 0), P(.5, 0), P(.5, 1), P(-.5, 1)); if (rng() < .6) F.cor(PANOS[Math.floor(rng() * PANOS.length)], .9).quad(P(-.5, .58, .004), P(.5, .58, .004), P(.5, .74, .004), P(-.5, .74, .004)); }
  else if (tipo < .76) { F.cor(cor, .85 + rng() * .3).quad(P(-.34, .06), P(.34, .06), P(.36, 1), P(-.36, 1)).quad(P(-.34, 0), P(-.12, 0), P(-.12, .08), P(-.34, .08)).quad(P(.12, 0), P(.34, 0), P(.34, .08), P(.12, .08))
    .quad(P(-.34, .06), P(-.36, .40), P(-.60, .34), P(-.52, .04)).quad(P(.52, .04), P(.60, .34), P(.36, .40), P(.34, .06)); }
  else { F.cor(cor, .8 + rng() * .3).quad(P(-.5, 0), P(.5, 0), P(.5, .24), P(-.5, .24)).quad(P(-.5, .24), P(-.06, .24), P(-.10, 1), P(-.46, 1)).quad(P(.06, .24), P(.5, .24), P(.46, 1), P(.10, 1)); }
}
function varal(F, rng, x0, z0, x1, z1, y) {
  const A = V(x0, y, z0), B = V(x1, y, z1), L = A.distanceTo(B), dx = (x1 - x0) / L, dz = (z1 - z0) / L, barriga = .13, alt = (t) => y - barriga * 4 * t * (1 - t);
  F.cor(0x1c1b1a).tubo(catenaria(A, B, barriga, BECO_MIN + .6), .005, 3);
  let s = .16 + rng() * .1, n = 0;
  while (s < L - .3) { const w = .30 + rng() * .26; if (s + w > L - .12) break; const t = (s + w / 2) / L, yy = alt(t) - .012, h = Math.min(.42 + rng() * .42, yy - BECO_MIN);
    pano(F, rng, x0 + dx * (s + w / 2), yy, z0 + dz * (s + w / 2), dx, dz, w, h, PANOS[Math.floor(rng() * PANOS.length)]); s += w + .03 + rng() * .1; n++; }
  return n;
}
function beco(F, rng, s) {
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
  for (const [z0, z1, y] of [[8.75, 9.25, 4.46], [10.3, 9.7, 4.40], [12.0, 12.7, 4.7], [15.0, 15.6, 4.85], [19.6, 20.3, 4.7]]) panos += varal(F, rng, -X - .02, s * z0, X + .02, s * z1, y);
  // Caixa de passagem e medidor no alto da fachada, com o feixe descendo até ela.
  for (const [lado, z, y] of [[-1, 12.4, 4.0], [1, 16.8, 4.2], [-1, 22.6, 3.95]]) F.cor(0x6a6c69).caixa(lado * (X + .01), y, s * z, .09, .34, .26).cor(ESCURO).tubo([V(lado * X, y + .34, s * z), V(lado * X, 4.3 + (lado > 0 ? .5 : 0), s * z)], .012, 3);
  return panos;
}
function fios(grupo, rng, topo, mundo, mat) {
  const F = fundidor(); let feixes = 0;
  const poste = (x, y, z, h, ry) => { F.cor(0x2e2925).caixa(x, y - .3, z, .09, h + .3, .09, ry).caixa(x, y + h - .22, z, .62, .06, .06, ry).cor(FERRO).caixa(x, y + h - .42, z, .16, .22, .12, ry); };
  for (const [ax, az, bx, bz, n, gato] of FEIXES) {
    if (pertoDeBandeira(ax, az, bx, bz, mundo?.ctfPoints)) continue;
    const ya = topo(ax, az), yb = topo(bx, bz); if (ya === null || yb === null) continue;
    const ha = .9 + rng() * .7, hb = .9 + rng() * .7, vao = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
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
  const paredes = (mundo?.colliders || []).some((c) => Math.abs(c.maxX + 1) < .05 && c.maxY > 6 && c.minZ < 10 && c.maxZ > 13);
  const panos = paredes ? beco(F, rng, 1) + beco(F, rng, -1) : 0;
  if (!feixes && !panos) return { tris: 0, panos };
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-fios';
  grupo.add(malha); return { tris: F.tris(), panos };
}

function antena(F, x, y, z, rng) {
  const h = 2.1 + rng() * 1.3, ry = rng() * 6.28, cs = Math.cos(ry), sn = Math.sin(ry);
  F.cor(0x6f7275).caixa(x, y, z, .045, h, .045, ry).caixa(x + sn * .15, y + h - .12, z + cs * .15, .03, .03, 1.15, ry);
  for (let i = 0; i < 8; i++) { const t = -.38 + i * .135; F.caixa(x + sn * (.15 + t), y + h - .105, z + cs * (.15 + t), .78 - i * .06, .022, .022, ry); }
  F.cor(0x34302c).caixa(x, y, z, .22, .12, .22, ry);
}
function parabolica(F, x, y, z, rng, R0 = 0) {
  const R = R0 || .5 + rng() * .32, h = .3 + rng() * .25, ry = rng() * 6.28, el = .7, m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-el, ry, 0, 'YXZ')), c = V(x, y + h + R * .62, z);
  F.cor(0x55585a).caixa(x, y, z, .11, h + R * .6, .11, ry).cor(0x6b675f).caixa(x, y - .04, z, .5, .14, .5, ry)
    .cor(0x4a4c4e).tubo([V(x + Math.sin(ry) * .3, y + .05, z + Math.cos(ry) * .3), V(x, y + h + R * .3, z)], .02, 3);
  const P = (i, j) => { const r = R * j / 3, a = i / 10 * Math.PI * 2; return V(Math.cos(a) * r, Math.sin(a) * r, -(r * r) / (R * 2.4)).applyMatrix4(m).add(c); };
  F.cor(0x8d8f8c);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 10; i++) { if (j === 0) F.tri(P(0, 0), P(i, 1), P(i + 1, 1)); else F.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)); }
  const foco = V(0, 0, R * .55).applyMatrix4(m).add(c);
  F.cor(0x3a3c3e).tubo([P(2.5, 3), foco], .012, 3).tubo([P(7.5, 3), foco], .012, 3).caixa(foco.x, foco.y - .05, foco.z, .09, .1, .09, ry);
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
const TANQUES = ['caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_fibra', 'caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_fibra', 'caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_fibra', 'caixa_dagua_azul'];
const NOVOS = new Set(['caixa_dagua_azul', 'caixa_dagua_preta', 'caixa_dagua_fibra']);
// Caixas na beira do telhado que fecha cada beco central: são as que aparecem no fundo de quem olha do beco oposto.
const TANQUES_BECO = [[1.75, 9.25, 'caixa_dagua_azul', .75], [3.45, 9.4, 'caixa_dagua_preta', .35], [-1.7, 9.3, 'caixa_dagua_fibra', .55], [-3.6, 9.5, 'caixa_dagua_azul', .3]];
function telhados(grupo, rng, topo, mundo, vivo, mat) {
  const tetos = (mundo?.colliders || []).filter((c) => c.minY < .5 && c.maxY >= 5.9 && c.maxX - c.minX >= 3.5 && c.maxZ - c.minZ >= 3.5)
    .map((c) => ({ c, a: Math.atan2((c.minZ + c.maxZ) / 2, (c.minX + c.maxX) / 2) })).sort((p, q) => p.a - q.a).map((p) => p.c);
  if (!tetos.length) return 0;
  const lista = [...TANQUES.map((id) => ['tanque', id]), ...Array(8).fill(['antena']), ...Array(6).fill(['parabolica']), ...Array(8).fill(['esperas']), ...Array(4).fill(['pilha']), ...Array(5).fill(['puxadinho']), ...Array(5).fill(['lavar']), ...Array(4).fill(['esperas'])];
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  const F = fundidor(), tanques = [], usos = new Map();
  lista.forEach(([tipo, id], i) => {
    const c = tetos[Math.floor((i + .5) * tetos.length / lista.length) % tetos.length], n = usos.get(c) || 0; usos.set(c, n + 1);
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2, w = c.maxX - c.minX, d = c.maxZ - c.minZ;
    // Borda voltada para o miolo do mapa (é a que se vê do chão e da laje); o segundo objeto da casa vai para o outro canto.
    const dentroX = Math.abs(cx) > Math.abs(cz) * .6, lado = (n % 2 ? 1 : -1) * (.12 + rng() * .22), fundo = tipo === 'esperas' ? .28 : tipo === 'puxadinho' ? 2.1 : 1.0 + rng() * .5;
    let x, z;
    if (tipo === 'esperas') { x = cx + (n % 2 ? 1 : -1) * (w / 2 - .3); z = cz + (rng() < .5 ? 1 : -1) * (d / 2 - .3); }
    else if (dentroX) { x = cx - Math.sign(cx) * (w / 2 - fundo); z = cz + lado * d; } else { x = cx + lado * w; z = cz - Math.sign(cz) * (d / 2 - fundo); }
    const y = topo(x, z); if (y === null) return;
    if (tipo === 'tanque') { const h = 1.2 + rng() * .6; F.cor(0x6b675f).caixa(x, y - .1, z, 1.25, .34, 1.25, rng()); tanques.push({ id, x, y: y + .22, z, targetH: h, ry: rng() * 6.28 }); }
    else if (tipo === 'antena') antena(F, x, y - .05, z, rng);
    else if (tipo === 'parabolica') parabolica(F, x, y - .05, z, rng);
    else if (tipo === 'esperas') esperas(F, x, y, z, rng);
    else if (tipo === 'pilha') pilha(F, x, y - .03, z, rng);
    else if (tipo === 'lavar') lavar(F, x, y - .03, z, rng, dentroX ? Math.PI / 2 : 0);
    else puxadinho(F, x, y - .05, z, rng, dentroX ? Math.PI / 2 : 0);
  });
  for (const s of [1, -1]) for (const [x, z, id, pe] of TANQUES_BECO) { const y = topo(x, s * z); if (y === null) continue;
    F.cor(0x7a4a33, .9 + rng() * .2).caixa(x, y - .05, s * z, 1.3, pe + .05, 1.3, 0).cor(0x6b675f).caixa(x, y + pe, s * z, 1.45, .09, 1.45, 0);
    tanques.push({ id, x, y: y + pe + .08, z: s * z, targetH: 1.35 + rng() * .35, ry: rng() * 6.28 });
    antena(F, x + (x > 0 ? .95 : -.95), y - .05, s * (z + .5), rng); }
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-telhados'; grupo.add(malha);
  const sub = new THREE.Group(); sub.name = 'hd-tanques'; grupo.add(sub);
  preloadMapProps([...new Set(TANQUES)]).then(() => {
    if (!vivo()) return;
    const lote = new PropBatch({ bucket: 22, cast: false, tag: 'hdcen' });
    for (const t of tanques) lote.add(t.id, t);
    lote.build(sub);
    sub.traverse((o) => { if (!o.isMesh) return; o.castShadow = false; o.userData.hdNovo = NOVOS.has(o.userData.mapPropId);
      if (o.userData.hdNovo && o.material.normalMap) { o.material = o.material.clone(); o.material.normalMap = null; o.userData.hdMatProprio = true; } });
  }).catch(() => {});
  return F.tris();
}

// Fachada: cano de PVC de descida, eletroduto preto corrido e ar-condicionado de janela. Um draw call.
const PVC = [0xb9b5a6, 0x8d9290, 0x77736a];
function fachada(grupo, rng, mundo, janelas, mat) {
  const casas = (mundo?.colliders || []).filter((c) => c.casa && Math.abs(c.minX + c.maxX) / 2 < 22), niveis = mundo?.levels || [];
  if (!casas.length) return 0;
  const F = fundidor();
  const tapada = (c, x, n) => Math.abs(x + n * .5) > 19.5 || casas.some((o) => o !== c && o.minX < x + n * .4 && o.maxX > x + n * .4 && o.minZ < c.maxZ - 1 && o.maxZ > c.minZ + 1);
  for (const c of casas) {
    const sx = Math.sign(c.casaRy) || 1, loja = c.maxY < 3.2 && Math.abs((c.minZ + c.maxZ) / 2 + 4.5) < .1;
    for (const [x, n, frente] of [[sx < 0 ? c.maxX : c.minX, -sx, true], [sx < 0 ? c.minX : c.maxX, sx, false]]) {
      if (tapada(c, x, n) || (loja && frente)) continue;
      const z = frente && rng() < .5 ? c.minZ + .42 : c.maxZ - .42, topo = c.maxY - .3, xc = x + n * .066;
      F.cor(PVC[Math.floor(rng() * 2.999)], .85 + rng() * .25).tubo([V(xc, .03, z), V(xc, topo, z), V(x - n * .03, topo + .1, z)], .05, 6);
      for (let y = .45; y < topo; y += 1.45) F.cor(0x3a3d3f).caixa(x + n * .06, y, z, .12, .035, .135);
      const ye = 2.6 + rng() * .14, xe = x + n * .028, pts = [];
      for (let k = 0, N = Math.round((c.maxZ - c.minZ) / .45); k <= N; k++) pts.push(V(xe, ye - .028 * Math.abs(Math.sin(k * Math.PI / 3)), c.minZ + .12 + (c.maxZ - c.minZ - .24) * k / N));
      F.cor(0x121315).tubo(pts, .013, 3);
    }
  }
  // Relógio de luz (11 cm de saliência) com eletroduto até o beiral e gato descendo; parabólica pequena só acima de 5,4 m.
  for (const c of casas) {
    const sx = Math.sign(c.casaRy) || 1;
    for (const [x, n] of [[sx < 0 ? c.maxX : c.minX, -sx], [sx < 0 ? c.minX : c.maxX, sx]]) {
      if (tapada(c, x, n)) continue;
      const z = (rng() < .5 ? c.minZ + .34 : c.maxZ - .34), topo = c.maxY - .35, xm = x + n * .03;
      if (rng() < .7) { const y = 1.28 + rng() * .2;
        F.cor(0x8a8d8c, .9 + rng() * .2).caixa(xm, y, z, .11, .42, .3).cor(0x1b1d1e).caixa(x + n * .09, y + .2, z, .012, .14, .16).cor(0x6f7271).caixa(xm, y + .42, z, .13, .03, .34)
          .cor(0x767978).tubo([V(xm, y + .44, z - .08), V(xm, topo, z - .08)], .016, 4).tubo([V(xm, y, z + .07), V(xm, .08, z + .07)], .013, 4);
        for (let k = 0; k < 4; k++) { const pts = [], dz = .05 + k * .03, a0 = rng() * 6; for (let yy = topo; yy > y + .4; yy -= .22) pts.push(V(xm + n * .012, yy, z + dz + .035 * Math.sin(yy * (3 + k) + a0)));
          pts.push(V(xm + n * .02, y + .34, z + dz * .5)); F.cor(k % 2 ? 0x15161a : 0x2a2420).tubo(pts, .006, 3); }
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
        for (let zz = j.z - j.w / 2 + .12; zz < j.z + j.w / 2 - .2; zz += .3 + rng() * .12) if (rng() < .75) pano(F, rng, x + n * dx, yv + .01, zz + .1, 0, 1, .22 + rng() * .08, .3 + rng() * .22, PANOS[Math.floor(rng() * PANOS.length)]); }
      continue; }
    F.cor(0xb7b4a8, .8 + rng() * .3).caixa(x + n * .17, y, j.z, .34, .40, .62).cor(0x2b2d2f).caixa(x + n * .345, y + .06, j.z - .05, .012, .28, .44);
    for (let k = 0; k < 5; k++) F.cor(0x8d8b82).caixa(x + n * .352, y + .09 + k * .05, j.z - .05, .012, .014, .44);
    F.cor(0x3a3d3f).caixa(x + n * .15, y - .035, j.z - .24, .3, .035, .03).caixa(x + n * .15, y - .035, j.z + .24, .3, .035, .03);
  }
  const malha = new THREE.Mesh(F.geo(), mat); malha.name = 'hd-fachada'; malha.receiveShadow = true;
  grupo.add(malha); return F.tris();
}

export function cenografiaLajes(scene, opts = {}) {
  const lig = (k) => opts[k] !== false, mundo = opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null);
  const grupo = new THREE.Group(); grupo.name = 'hd-cenografia'; let vivo = true;
  const topo = medidorDeTopo(scene, mundo), info = {};
  const U = { hdRuido: opts.ruido || { value: null }, hdNevoa: { value: (scene.fog?.color || new THREE.Color(0xb7c4cb)).clone().multiplyScalar(.84) } };
  // Fio, telhado e fachada dividem um material: um programa só, sem sombra projetada.
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, side: THREE.DoubleSide, name: 'hd-cenografia' });
  let voltaMorro = () => {};
  if (lig('morro')) { morro(grupo, rngDe(opts.semente || 20261110), U); voltaMorro = escondeMorroVelho(scene); }
  if (lig('fios')) info.fios = fios(grupo, rngDe(7717), topo, mundo, mat);
  if (lig('fachada')) info.fachada = fachada(grupo, rngDe(9311), mundo, opts.janelas || [], mat);
  if (lig('telhados')) info.telhados = telhados(grupo, rngDe(40123), topo, mundo, () => vivo, mat);
  grupo.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(grupo);
  return { grupo, info, morro: lig('morro'), desliga() {
    vivo = false; scene.remove(grupo); voltaMorro(); mat.dispose();
    grupo.traverse((o) => { if (!o.isMesh) return;
      const prop = !!o.userData.mapPropId;
      // Geometria e material dos tanques moram no cache do mapprops (a caixa d'água do mapa usa o mesmo molde).
      if (!prop) { o.geometry.dispose(); o.material.dispose(); }
      else if (o.userData.hdNovo) for (const t of [o.material.map, o.material.normalMap, o.material.roughnessMap]) t?.dispose();
      if (o.userData.hdMatProprio) o.material.dispose();
      if (o.isInstancedMesh) o.dispose(); });
  } };
}
