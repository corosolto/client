// Cenografia HD do Sertão (demo ?hd=1). Nada aqui tem colisão: só existe fora de bounds, rente ao chão
// (até 12 cm), em cima ou colado em colisor que já existe, ou acima de 2,2 m. Tudo sai por desfaz().
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { placeProp } from './mapprops.js';
import { mandacaruSertao } from './map_sertao_flora.js';

const rngDe = (semente) => { let s = semente >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Mesma fórmula de sertaoLandscape (map_sertao_landscape.js): se o relevo de lá mudar, isto flutua.
const terreno = (x, z) => { const t = Math.min(1, Math.max(0, (Math.max(Math.abs(x) / 65, Math.abs(z) / 85) - 1) / 1.6));
  return t * t * (3 - 2 * t) * (12 + 7 * Math.sin(x * .018) * Math.cos(z * .021) + 3 * Math.sin(x * .07 + z * .045)) - .04; };

function pedraGeo(detalhe, semente, forca, oito = false) {
  const bruta = oito ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, detalhe); bruta.deleteAttribute('uv'); bruta.deleteAttribute('normal');
  const g = mergeVertices(bruta, 1e-4); bruta.dispose();
  const p = g.attributes.position, rnd = rngDe(semente), fase = [rnd() * 9, rnd() * 9, rnd() * 9];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + forca * (Math.sin(x * 2.3 + fase[0]) * Math.cos(y * 2.9 + fase[1]) + .5 * Math.sin(z * 5.1 + x * 3.3 + fase[2]) + .25 * Math.sin(y * 9.7 + z * 7.1));
    p.setXYZ(i, x * k, y * k, z * k); }
  g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

// Tufo de capim seco: lâminas afiladas em leque, base escura e ponta palha; normal para cima (não escurece o verso).
function tufoGeo(semente, laminas = 6) {
  const rnd = rngDe(semente), P = [], N = [], C = [], I = [];
  for (let i = 0; i < laminas; i++) {
    const a = rnd() * Math.PI * 2, incl = .12 + rnd() * .75, h = .55 + rnd() * .45, larg = .045 + rnd() * .035, r0 = rnd() * .16, giro = a + (rnd() - .5) * 1.2;
    const dx = Math.cos(a), dz = Math.sin(a), lx = -Math.sin(giro) * larg, lz = Math.cos(giro) * larg, b = P.length / 3;
    const ponto = (t, w) => { const fora = r0 + incl * h * t * t * 1.1 + incl * h * t * .25, y = h * t * (1 - .28 * incl * t);
      for (const s of [-1, 1]) { P.push(dx * fora + lx * w * s, y, dz * fora + lz * w * s); N.push(dx * .35, .93, dz * .35);
        const c = .42 + .58 * t; C.push(.55 * c + .2 * t, .48 * c + .16 * t, .30 * c + .06 * t); } };
    ponto(0, 1); ponto(.5, .7); ponto(1, .06);
    I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2, b + 2, b + 3, b + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeBoundingSphere(); return g;
}

// Acumulador de peças de madeira/arame numa malha só (1 draw call): UV em metros, cor por vértice.
function oficina() {
  const P = [], N = [], U = [], C = [], I = [], v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  const api = {
    caixa(m, w, h, d, cor, so = null) {
      nm.getNormalMatrix(m);
      const faces = [[[1, 0, 0], [0, 0, -1], [0, 1, 0], d, h, w], [[-1, 0, 0], [0, 0, 1], [0, 1, 0], d, h, w], [[0, 1, 0], [1, 0, 0], [0, 0, -1], w, d, h],
        [[0, -1, 0], [1, 0, 0], [0, 0, 1], w, d, h], [[0, 0, 1], [1, 0, 0], [0, 1, 0], w, h, d], [[0, 0, -1], [-1, 0, 0], [0, 1, 0], w, h, d]];
      for (const [nn, tu, tv, su, sv, sn] of so ? so.map((i) => faces[i]) : faces) { const b = P.length / 3, fase = (P.length % 97) * .013;
        for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          v.set(nn[0] * sn / 2 + tu[0] * a * su / 2 + tv[0] * c * sv / 2, nn[1] * sn / 2 + tu[1] * a * su / 2 + tv[1] * c * sv / 2, nn[2] * sn / 2 + tu[2] * a * su / 2 + tv[2] * c * sv / 2).applyMatrix4(m);
          n.set(nn[0], nn[1], nn[2]).applyMatrix3(nm).normalize(); P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); C.push(cor[0], cor[1], cor[2]);
          const uu = a * su / 2 / 1.1 + fase, vv = c * sv / 2 / 1.1 + fase * 3; if (su >= sv) U.push(uu, vv); else U.push(vv, uu); }
        I.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    },
    // Tronco de cone entre a e b; `aneis` opcional = [[t, fatorDeRaio]] para barriga de barril.
    cilindro(a, b, r0, r1, lados, cor, { tampas = true, aneis = null, giro = 0 } = {}) {
      const eixo = new THREE.Vector3().subVectors(b, a), L = eixo.length(); eixo.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eixo), base = P.length / 3;
      const perfil = aneis || [[0, 1], [1, 1]];
      perfil.forEach(([t, k], j) => { const r = (r0 + (r1 - r0) * t) * k;
        for (let i = 0; i <= lados; i++) { const ang = i / lados * Math.PI * 2 + giro;
          v.set(Math.cos(ang) * r, t * L, Math.sin(ang) * r).applyQuaternion(q).add(a); n.set(Math.cos(ang), 0, Math.sin(ang)).applyQuaternion(q);
          P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); C.push(cor[0], cor[1], cor[2]); U.push(t * L / 1.1, i / lados * Math.max(.35, r * 5.7)); }
        if (j) for (let i = 0; i < lados; i++) { const p0 = base + (j - 1) * (lados + 1) + i, p1 = p0 + lados + 1; I.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); } });
      if (tampas) for (const [t, k, sinal] of [[1, perfil[perfil.length - 1][1], 1], [0, perfil[0][1], -1]]) { const c0 = P.length / 3, r = (r0 + (r1 - r0) * t) * k;
        n.set(0, sinal, 0).applyQuaternion(q); v.set(0, t * L, 0).applyQuaternion(q).add(a); P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); C.push(cor[0] * .8, cor[1] * .8, cor[2] * .8); U.push(.5, .5);
        for (let i = 0; i <= lados; i++) { const ang = i / lados * Math.PI * 2 + giro; v.set(Math.cos(ang) * r, t * L, Math.sin(ang) * r).applyQuaternion(q).add(a);
          P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); C.push(cor[0] * .8, cor[1] * .8, cor[2] * .8); U.push(.5 + Math.cos(ang) * r / 1.1, .5 + Math.sin(ang) * r / 1.1); }
        for (let i = 0; i < lados; i++) if (sinal > 0) I.push(c0, c0 + 2 + i, c0 + 1 + i); else I.push(c0, c0 + 1 + i, c0 + 2 + i); }
    },
    // Pano sem espessura: os dois lados na mesma malha, cada um com a sua normal.
    tri(a, b, c, cor) { n.subVectors(b, a).cross(v.subVectors(c, a)).normalize();
      for (const s of [1, -1]) { const b0 = P.length / 3; for (const q of (s > 0 ? [a, b, c] : [a, c, b])) { P.push(q.x, q.y, q.z); N.push(n.x * s, n.y * s, n.z * s); C.push(cor[0], cor[1], cor[2]); U.push(0, 0); } I.push(b0, b0 + 1, b0 + 2); } },
    // Polígono no plano xy de m (anti-horário, visível do ponto c) extrudado `esp` em z.
    prisma(m, pts, esp, cor, c = [0, 0]) {
      nm.getNormalMatrix(m); const k = pts.length, h = esp / 2;
      for (const s of [1, -1]) { const b = P.length / 3; n.set(0, 0, s).applyMatrix3(nm).normalize();
        for (const [x, y] of [c, ...pts]) { v.set(x, y, s * h).applyMatrix4(m); P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); C.push(cor[0], cor[1], cor[2]); U.push(x / 1.1, y / 1.1); }
        for (let i = 0; i < k; i++) { const a = b + 1 + i, d = b + 1 + (i + 1) % k; if (s > 0) I.push(b, a, d); else I.push(b, d, a); } }
      for (let i = 0; i < k; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % k], L = Math.hypot(x1 - x0, y1 - y0); if (L < 1e-5) continue; const b = P.length / 3;
        n.set((y1 - y0) / L, -(x1 - x0) / L, 0).applyMatrix3(nm).normalize();
        for (const [x, y, z, u] of [[x0, y0, h, 0], [x1, y1, h, L], [x1, y1, -h, L], [x0, y0, -h, 0]]) { v.set(x, y, z).applyMatrix4(m); P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); C.push(cor[0], cor[1], cor[2]); U.push(u / 1.1, z / 1.1); }
        I.push(b, b + 2, b + 1, b, b + 3, b + 2); }
    },
    geo() { const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I); if (I.length) g.computeBoundingSphere(); return g; },
  };
  return api;
}

// Quatro oficinas, uma por quadrante do mapa: cada malha tem a sua esfera e sai do quadro com o frustum.
function oficinas() {
  const q = [oficina(), oficina(), oficina(), oficina()], de = (x, z) => q[(x < 0 ? 0 : 1) + (z < 0 ? 0 : 2)];
  return { caixa: (m, ...r) => de(m.elements[12], m.elements[14]).caixa(m, ...r), cilindro: (a, ...r) => de(a.x, a.z).cilindro(a, ...r), tri: (a, ...r) => de(a.x, a.z).tri(a, ...r), prisma: (m, ...r) => de(m.elements[12], m.elements[14]).prisma(m, ...r), geos: () => q.map((o) => o.geo()) };
}

export function cenografiaSertaoHD(scene, renderer, opts = {}, kit = {}) {
  const mundo = (typeof window !== 'undefined' && window.__game?.world) || {};
  const B = mundo.bounds || { minX: -33.2, maxX: 33.2, minZ: -45.2, maxZ: 45.2 };
  const cols = (mundo.colliders || []).filter((c) => c.minY < .5 && c.maxY > .12);
  const grupo = new THREE.Group(); grupo.name = 'sertao-hd-cenografia'; grupo.userData.nonCollider = true; scene.add(grupo);
  const lixo = [], desfaz = [], rnd = rngDe(4099), obj = new THREE.Object3D(), cor = new THREE.Color();
  const interiores = []; scene.traverse((o) => { if (o.userData?.interior) { const p = o.getWorldPosition(new THREE.Vector3()); interiores.push([p.x, p.z]); } });
  const dentroDeCasa = (x, z) => interiores.some(([ix, iz]) => Math.hypot(x - ix, z - iz) < 5.4);
  const livre = (x, z, folga = 0) => !cols.some((c) => x > c.minX - folga && x < c.maxX + folga && z > c.minZ - folga && z < c.maxZ + folga);
  const zonas = (mundo.ctfPoints || []).map((q) => [q.x, q.z]);
  const naArena = (x, z, m = .3) => x > B.minX + m && x < B.maxX - m && z > B.minZ + m && z < B.maxZ - m;
  const lote = (geo, mat, n, nome, sombra = false) => { const im = new THREE.InstancedMesh(geo, mat, n); im.name = `sertao-hd-${nome}`; im.receiveShadow = true; im.castShadow = sombra;
    im.userData.nonSolidSurface = true; grupo.add(im); lixo.push(im); return im; };
  // Pé de parede: ponto na aresta de um colisor, longe das pontas (quina e ombreira de porta ficam nas pontas).
  const paredes = cols.filter((c) => c.maxY - c.minY > .8 && Math.max(c.maxX - c.minX, c.maxZ - c.minZ) > 1.5);
  const peDeParede = (afasta0, afasta1, margem = .45) => { for (let t = 0; t < 30 && paredes.length; t++) {
    const c = paredes[Math.floor(rnd() * paredes.length)], emX = rnd() < (c.maxX - c.minX) / ((c.maxX - c.minX) + (c.maxZ - c.minZ)), lado = rnd() < .5 ? -1 : 1, d = afasta0 + rnd() * (afasta1 - afasta0);
    const L = emX ? c.maxX - c.minX : c.maxZ - c.minZ; if (L < margem * 2 + .3) continue; const s = margem + rnd() * (L - margem * 2);
    const x = emX ? c.minX + s : (lado < 0 ? c.minX - d : c.maxX + d), z = emX ? (lado < 0 ? c.minZ - d : c.maxZ + d) : c.minZ + s;
    if (naArena(x, z) && livre(x, z, .03) && !dentroDeCasa(x, z)) return [x, z]; } return null; };

  const matLiso = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, name: 'hd-cen-barro' }); lixo.push(matLiso);
  // Material de pedra sem textura: mancha por posição local e base escurecida (assenta no chão sem sombra própria).
  const matPedra = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96, metalness: 0, name: 'hd-cen-pedra' });
  matPedra.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdL = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdL;${kit.RUIDO_GLSL || ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float a = hdN(vHdL.xy * 3.1 + vHdL.z * 2.3) * 0.6 + hdN(vHdL.zx * 9.0 + vHdL.y * 5.0) * 0.4;
          diffuseColor.rgb *= mix(0.5, 1.25, a) * mix(0.45, 1.0, smoothstep(-0.75, 0.15, vHdL.y)) * mix(0.7, 1.0, smoothstep(0.35, 0.5, hdN(vHdL.xz * 21.0 + vHdL.y * 17.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.05, 1.0, 0.95), smoothstep(0.55, 0.8, hdN(vHdL.yz * 2.0 + 4.0))); }`);
  };
  matPedra.customProgramCacheKey = () => 'sertao-hd-cen-pedra3';
  lixo.push(matPedra);

  if (opts.pedras !== false) {
    const n = opts.pedras?.n ?? 190, g = pedraGeo(0, 11, .22, true), im = lote(g, matPedra, n, 'pedrinhas'); lixo.push(g);
    const nucleos = Array.from({ length: 46 }, () => [B.minX + rnd() * (B.maxX - B.minX), B.minZ + rnd() * (B.maxZ - B.minZ)]);
    let k = 0;
    for (let t = 0; t < n * 12 && k < n; t++) {
      let x, z;
      if (rnd() < .42) { const p = peDeParede(.04, .7, .1); if (!p) continue; [x, z] = p; }
      else { const c = nucleos[Math.floor(rnd() * nucleos.length)], a = rnd() * 6.283, r = Math.pow(rnd(), .7) * 2.4; x = c[0] + Math.cos(a) * r; z = c[1] + Math.sin(a) * r; }
      if (!naArena(x, z, .1) || !livre(x, z, .02) || dentroDeCasa(x, z)) continue;
      const r = .011 + Math.pow(rnd(), 2.2) * .039, achat = .5 + rnd() * .35;
      obj.position.set(x, r * achat * .45, z); obj.rotation.set(rnd() * .5, rnd() * 6.283, rnd() * .5); obj.scale.set(r * (.8 + rnd() * .5), r * achat, r * (.8 + rnd() * .5)); obj.updateMatrix();
      const v = .13 + rnd() * .2, w = rnd(); im.setMatrixAt(k, obj.matrix); im.setColorAt(k++, cor.setRGB(v * (.93 + .06 * w), v * .93, v * (.97 - .05 * w)));
    }
    im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    // Pedra chata de até 11 cm no meio da rua: o cascalho miúdo some a 8 m e o chão da praça ficava liso.
    const n2 = opts.pedras?.chatas ?? 90, g2 = pedraGeo(0, 31, .26), im2 = lote(g2, matPedra, n2, 'pedras-chatas'); lixo.push(g2); let k2 = 0;
    for (let t = 0; t < n2 * 14 && k2 < n2; t++) { const x = (rnd() * 2 - 1) * 24, z = (rnd() * 2 - 1) * 40;
      if (!livre(x, z, .35) || dentroDeCasa(x, z) || zonas.some(([zx, zz]) => Math.hypot(x - zx, z - zz) < 5.8)) continue;
      const r = .1 + Math.pow(rnd(), 1.8) * .2, alt = Math.min(.055, r * (.22 + rnd() * .14));
      obj.position.set(x, alt * .5, z); obj.rotation.set(0, rnd() * 6.283, 0); obj.scale.set(r * (.8 + rnd() * .6), alt, r * (.8 + rnd() * .5)); obj.updateMatrix();
      const v = .12 + rnd() * .12, w = rnd(); im2.setMatrixAt(k2, obj.matrix); im2.setColorAt(k2++, cor.setRGB(v * (.94 + .05 * w), v * .94, v * (.99 - .04 * w))); }
    im2.count = k2; im2.instanceMatrix.needsUpdate = true; if (im2.instanceColor) im2.instanceColor.needsUpdate = true; im2.computeBoundingSphere();
  }

  if (opts.mato !== false) {
    const n = opts.mato?.n ?? 160, g = tufoGeo(5), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, name: 'hd-cen-capim' });
    const im = lote(g, mat, n, 'capim'); lixo.push(g, mat); let k = 0;
    const poe = (x, z, h, larg = 1) => { if (k >= n) return; obj.position.set(x, -.01, z); obj.rotation.set(0, rnd() * 6.283, 0); obj.scale.set(h * larg, h, h * larg); obj.updateMatrix();
      const v = .8 + rnd() * .45, w = rnd(); im.setMatrixAt(k, obj.matrix); im.setColorAt(k++, cor.setRGB(v * (1 + .1 * w), v * (.96 + .02 * w), v * (.9 - .25 * w))); };
    for (let t = 0; t < 900 && k < n * .52; t++) { const p = peDeParede(.05, .3); if (p) poe(p[0], p[1], .11 + rnd() * .18, .8 + rnd() * .5); }
    for (let t = 0; t < 400 && k < n * .70; t++) { const emX = rnd() < .43, s = rnd() < .5 ? -1 : 1;
      const x = emX ? B.minX + rnd() * (B.maxX - B.minX) : s * (B.maxX - .05 - rnd() * .5), z = emX ? s * (B.maxZ - .25 - rnd() * .5) : B.minZ + rnd() * (B.maxZ - B.minZ);
      if (emX && Math.abs(x) < 7) continue; if (livre(x, z, .05)) poe(x, z, .13 + rnd() * .17, .8 + rnd() * .5); }
    for (let t = 0; t < 400 && k < n * .78; t++) { const x = B.minX + rnd() * (B.maxX - B.minX), z = B.minZ + rnd() * (B.maxZ - B.minZ);
      if (naArena(x, z, 1) && livre(x, z, 1.3) && !dentroDeCasa(x, z)) poe(x, z, .08 + rnd() * .1, .7 + rnd() * .3); }
    for (let t = 0; t < 600 && k < n; t++) { const emX = rnd() < .45, s = rnd() < .5 ? -1 : 1, fora = 5.2 + Math.pow(rnd(), 1.6) * 14;
      const x = emX ? (rnd() * 2 - 1) * (B.maxX + 12) : s * (B.maxX + fora), z = emX ? s * (B.maxZ + fora) : (rnd() * 2 - 1) * (B.maxZ + 12);
      poe(x, z, .22 + rnd() * .3, .9 + rnd() * .5); }
    im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
  }

  // Madeira: reaproveita a imagem de madeira que o mapa já carregou (sem textura nova na GPU).
  let mapaMadeira = null; scene.traverse((o) => { if (!mapaMadeira && o.isMesh) { const m = Array.isArray(o.material) ? o.material[0] : o.material; if (/oeste-wood-real$/.test(m?.map?.name || '')) mapaMadeira = m.map; } });
  const cercaX = B.maxX + 7.3, cercaZ = B.maxZ + 7.6;
  if (opts.cerca !== false) {
    const of = oficinas(), mapa = mapaMadeira ? mapaMadeira.clone() : null;
    if (mapa) { mapa.repeat.set(1, 1); mapa.needsUpdate = true; mapa.name = 'hd-cen-madeira'; lixo.push(mapa); }
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: mapa, vertexColors: true, roughness: .92, name: 'hd-cen-madeira' });
    if (mapa && kit.relevoDeCor) { mat.normalMap = kit.relevoDeCor(mapa, 2.8); mat.normalScale.set(2.6, 2.6); lixo.push(mat.normalMap); }
    lixo.push(mat);
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    const lados = [[-cercaX, -cercaZ, cercaX, -cercaZ], [cercaX, -cercaZ, cercaX, cercaZ], [cercaX, cercaZ, -cercaX, cercaZ], [-cercaX, cercaZ, -cercaX, -cercaZ]];
    let indice = 0;
    for (const [x0, z0, x1, z1] of lados) {
      const L = Math.hypot(x1 - x0, z1 - z0), nP = Math.round(L / 2.7), nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
      for (let i = 0; i <= nP; i++, indice++) {
        const t = i / nP, onda = Math.sin(t * 9.1 + x0) * .9 + Math.sin(t * 23 + z0) * .35;
        const x = x0 + (x1 - x0) * t + nx * onda, z = z0 + (z1 - z0) * t + nz * onda, sorte = rngDe(700 + Math.floor(indice / 3) * 31)();
        // Vão onde as estradas saem pelos portões e em trechos sorteados; trecho caído deita o mourão.
        const vao = (Math.abs(z0) === cercaZ && z0 === z1 && Math.abs(x) < 8.5) || sorte < .13, caido = !vao && sorte < .27;
        if (vao) continue;
        const h = 1.32 + rnd() * .3, incl = caido ? 1.05 + rnd() * .35 : rnd() * .1, rumo = caido ? Math.atan2(z1 - z0, x1 - x0) + (rnd() - .5) * 1.4 : rnd() * 6.283, y0 = terreno(x, z);
        a.set(x, y0 - .12, z); b.set(x + Math.cos(rumo) * Math.sin(incl) * h, y0 + Math.cos(incl) * h, z + Math.sin(rumo) * Math.sin(incl) * h);
        const v = .78 + rnd() * .34; of.cilindro(a, b, .062 + rnd() * .014, .046, 4, [.50 * v, .46 * v, .42 * v], { tampas: false });
      }
    }
    const barril = (x, z, h = .92, r = .31, deitado = 0) => { const y = terreno(x, z), v = .8 + rnd() * .3, tom = [.62 * v, .47 * v, .34 * v];
      const eixo = deitado ? new THREE.Vector3(Math.cos(deitado), 0, Math.sin(deitado)) : new THREE.Vector3(0, 1, 0), p0 = new THREE.Vector3(x, y + (deitado ? r * 1.08 : 0), z);
      const p1 = p0.clone().addScaledVector(eixo, h), bojo = [[0, .86], [.2, 1], [.5, 1.09], [.8, 1], [1, .86]];
      of.cilindro(p0, p1, r, r, 9, tom, { aneis: bojo });
      for (const f of [.17, .83]) of.cilindro(p0.clone().addScaledVector(eixo, h * (f - .022)), p0.clone().addScaledVector(eixo, h * (f + .022)), r * 1.015, r * 1.015, 9, [.13, .12, .115], { tampas: false }); };
    const caixote = (x, z, s = .9, ry = 0, y = null) => { const y0 = y ?? terreno(x, z), v = .78 + rnd() * .3, tom = [.66 * v, .52 * v, .38 * v], ripa = [.5 * v, .38 * v, .27 * v];
      const R = new THREE.Matrix4().makeRotationY(ry), em = (px, py, pz) => R.clone().setPosition(new THREE.Vector3(px, py, pz).applyMatrix4(R).add(new THREE.Vector3(x, y0, z)));
      of.caixa(em(0, s / 2, 0), s, s, s, tom); const e = .07, m = s / 2;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) of.caixa(em(sx * m, s / 2, sz * m), e, s + e, e, ripa);
      for (const sy of [0, 1]) { for (const sz of [-1, 1]) of.caixa(em(0, sy * s, sz * m), s + e, e, e, ripa); for (const sx of [-1, 1]) of.caixa(em(sx * m, sy * s, 0), e, e, s + e, ripa); }
      return y0 + s; };
    const oeste = B.minX - 5.9, leste = B.maxX + 5.9, norte = B.minZ - 6.1, sul = B.maxZ + 6.1;
    barril(oeste - .3, 7.6); barril(oeste - 1.1, 7.2, .9, .3); caixote(oeste - .5, 9.2, .95, .3); barril(oeste - 1.5, 9.6, .92, .31, 1.1);
    const topo = caixote(leste + .4, -9, 1.05, .2); caixote(leste + .5, -9.1, .8, .7, topo); caixote(leste + .2, -7.4, .85, -.3); barril(leste + 1.3, -10.6); barril(leste + .2, -11.2, .95, .32);
    barril(-12.4, norte - .2); barril(-13.3, norte - .7, .88, .3); caixote(-10.9, norte - .5, .9, .5);
    caixote(14.2, sul + .3, 1, -.2); caixote(15.6, sul + .5, .8, .4); barril(12.6, sul + .4); barril(-20, sul + .6, .9, .3, .4);
    caixote(oeste - .6, -22, .9, .15); barril(oeste - .4, -20.4); barril(leste + .5, 21.5); caixote(leste + .7, 23.2, .95, .6);

    // Árvore seca em galhos de cilindro na mesma malha (o GLB custa 5 mil triângulos por pé; fica só no primeiro plano).
    const arvoreSeca = (x, z, h, sem) => { const r = rngDe(sem);
      const ramo = (p, dir, L, raio0, nivel) => { const raio = Math.max(raio0, .075), lados = nivel === 0 ? 5 : nivel === 1 ? 4 : 3, v = .8 + r() * .3, tom = [.43 * v, .37 * v, .32 * v];
        const meio = p.clone().addScaledVector(dir, L * .5).add(new THREE.Vector3(r() - .5, (r() - .5) * .5, r() - .5).multiplyScalar(L * .2));
        const fim = meio.clone().addScaledVector(dir, L * .5).add(new THREE.Vector3(r() - .5, r() * .3, r() - .5).multiplyScalar(L * .18));
        of.cilindro(p, meio, raio, raio * .8, lados, tom, { tampas: false }); of.cilindro(meio, fim, raio * .8, raio * .6, lados, tom, { tampas: false });
        if (nivel >= 3) return;
        for (let i = 0, n = nivel === 0 ? 3 : 2 + (r() < .4 ? 1 : 0); i < n; i++) { const ang = r() * 6.283, abre = .5 + r() * .55;
          ramo(fim, dir.clone().multiplyScalar(Math.cos(abre)).add(new THREE.Vector3(Math.cos(ang), .3 * (r() - .2), Math.sin(ang)).multiplyScalar(Math.sin(abre))).normalize(), L * (.64 + r() * .2), raio * .6, nivel + 1); } };
      ramo(new THREE.Vector3(x, terreno(x, z) - .12, z), new THREE.Vector3((r() - .5) * .3, 1, (r() - .5) * .3).normalize(), h * .36, h * .03, 0); };
    if (opts.flora !== false) [[-41.2, -41, 6.6], [-45.5, 9, 5.2], [-40.6, 28, 7.4], [41.4, -31, 6.2], [46, -5, 7.8], [40.8, 41, 5.6], [-9, -57, 6.4], [11, 55.5, 7], [-30, 55, 5.4],
      ...(opts.silhueta === false ? [] : [[-12.5, -52.5, 11], [14, -53.5, 11.5]])].forEach(([x, z, h], i) => arvoreSeca(x, z, h, 300 + i * 17));

    // Placa de rumo: três tábuas com ponta de seta num mourão, fora do alambrado do mapa.
    const px = oeste - .2, pz = 3.4, tabuas = [];
    if (opts.placa !== false) {
      of.cilindro(new THREE.Vector3(px, -.15, pz), new THREE.Vector3(px + .03, 2.75, pz - .02), .075, .06, 7, [.46, .41, .36]);
      [[2.42, .32, 1.35, 1], [2.05, -.22, 1.2, -1], [1.68, .12, 1.28, 1]].forEach(([y, ry, larg, mao], i) => {
        const R = new THREE.Matrix4().makeRotationY(Math.PI / 2 + ry), em = (lx, ly, lz) => R.clone().setPosition(new THREE.Vector3(lx, ly, lz).applyMatrix4(R).add(new THREE.Vector3(px, y, pz)));
        const tom = [[.74, .63, .5], [.66, .56, .46], [.7, .58, .44]][i];
        of.caixa(em(mao * .12, 0, .1), larg, .27, .035, tom);
        const bico = new THREE.Matrix4().makeRotationY(Math.PI / 2 + ry).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 4));
        bico.setPosition(new THREE.Vector3(mao * (larg / 2 + .12), 0, .1).applyMatrix4(R).add(new THREE.Vector3(px, y, pz))); of.caixa(bico, .19, .19, .033, tom);
        tabuas.push({ m: em(mao * .12, 0, .1 + .019), larg, i });
      });
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c2 = cv.getContext('2d');
      c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.font = '900 54px Georgia, serif';
      ['PRAÇA DA MATRIZ', 'FORRÓ', 'AÇUDE 2 LÉGUAS'].forEach((txt, i) => { c2.fillStyle = ['#efe6cf', '#e9dfc6', '#efe2c2'][i]; c2.fillText(txt, 256, 43 + i * 85, 480); });
      const img = c2.getImageData(0, 0, 512, 256), gasto = rngDe(77);
      for (let i = 3; i < img.data.length; i += 4) if (img.data[i] && gasto() < .16) img.data[i] *= gasto() * .7;
      c2.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.name = 'hd-cen-placa';
      const P = [], U = [], I = [], v = new THREE.Vector3();
      for (const { m, larg, i } of tabuas) { const b = P.length / 3;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { v.set(sx * (larg / 2 - .06), sy * .105, 0).applyMatrix4(m); P.push(v.x, v.y, v.z); U.push(sx > 0 ? 1 : 0, 1 - (i + (sy > 0 ? .08 : .92)) / 3); }
        I.push(b, b + 1, b + 2, b, b + 2, b + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
      const matTxt = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .25, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const letras = new THREE.Mesh(g, matTxt); letras.name = 'sertao-hd-placa-letras'; grupo.add(letras); lixo.push(g, matTxt, tex);
    }
    const liso = oficinas(), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const TINTAS = [[.17, .27, .43], [.15, .3, .17], [.4, .385, .28]], pin = oficinas(), FERRO = [.1, .095, .09], BREU = [.02, .02, .024], BARRO = [.24, .14, .095], CAL = [1, 1, 1], I4 = () => new THREE.Matrix4();
    const pl = oficina(), tl = oficina(), panos = [], escondidos = [];
    // Recortes do atlas de letreiros (px num canvas de 1024): [x, y, largura, altura].
    const RT = { bodega: [0, 0, 512, 150], barbearia: [512, 0, 512, 150], mercearia: [0, 150, 512, 150], vote: [512, 150, 512, 150], forro: [0, 300, 1024, 170], queijo: [0, 470, 640, 220], fiado: [640, 470, 384, 220],
      secos: [0, 690, 1024, 70], cabelo: [0, 760, 420, 64], n27: [420, 760, 150, 64], n104: [570, 760, 170, 64], n12: [740, 760, 100, 64], exvoto: [0, 830, 170, 194], graca: [170, 830, 300, 194], chita: [470, 830, 280, 194], fitas: [750, 830, 274, 194] };
    // Quadro de uma face de parede: x corre para a direita de quem olha de fora, z sai da parede.
    const quadro = (W, ox, oz, th) => { const F = I4().makeRotationY(th).setPosition(ox, 0, oz).premultiply(W);
      return { m: (x, y, z) => F.clone().multiply(I4().setPosition(x, y, z)), p: (x, y, z) => V3(x, y, z).applyMatrix4(F) }; };
    const letreiro = (q, nome, x, y, larg, z = .02) => panos.push({ m: q.m(x, y, z), w: larg, h: larg * RT[nome][3] / RT[nome][2], r: RT[nome] });
    const tinge = (t, g) => [t[0] * g, t[1] * g, t[2] * g];
    // Folha de porta ou janela: `base` põe a origem na dobradiça; sx diz para que lado a folha cresce.
    const folha = (base, sx, lf, h, tinta, tipo, r) => {
      const em = (x, y, z) => base(sx * x, y, z), g0 = .86 + r() * .24;
      const tab = (m, w, hh, d, k = 1) => r() < .07 ? of.caixa(m, w, hh, d, [1.3 * k, 1.15 * k, k]) : pin.caixa(m, w, hh, d, tinge(tinta, g0 * k * (.9 + r() * .2)));
      if (tipo === 'almofada') { tab(em(lf / 2, h / 2, 0), lf, h, .035, .78);
        const np = h > 1.5 ? 3 : 1, ph = (h - .16 - (np - 1) * .1) / np;
        for (let i = 0; i < np; i++) { const y = .08 + ph / 2 + i * (ph + .1); tab(em(lf / 2, y, .026), lf - .18, ph, .022, .55); tab(em(lf / 2, y, .044), lf - .3, ph - .12, .02, 1.15); }
      } else if (tipo === 'rotula') { const e = .06, nua = r() < .07, c0 = nua ? [1.3, 1.15, 1] : tinge(tinta, g0 * (.9 + r() * .2)), alvo = nua ? of : pin, passo = .15, X0 = e, X1 = lf - e, Y0 = e, Y1 = h - e;
        for (const [x, y, w, hh] of [[e / 2, h / 2, e, h], [lf - e / 2, h / 2, e, h], [lf / 2, e / 2, lf, e], [lf / 2, h - e / 2, lf, e]]) alvo.caixa(em(x, y, 0), w, hh, .04, c0);
        for (let c = Y0 - X1 + passo / 2; c < Y1 - X0; c += passo) { const a = Math.max(X0, Y0 - c), b = Math.min(X1, Y1 - c); if (b - a > .04) alvo.caixa(em((a + b) / 2, (a + b) / 2 + c, -.006).multiply(I4().makeRotationZ(sx * Math.PI / 4)), (b - a) * 1.414, .034, .012, c0, [4, 5]); }
        for (let c = X0 + Y0 + passo / 2; c < X1 + Y1; c += passo) { const a = Math.max(X0, c - Y1), b = Math.min(X1, c - Y0); if (b - a > .04) alvo.caixa(em((a + b) / 2, c - (a + b) / 2, .006).multiply(I4().makeRotationZ(-sx * Math.PI / 4)), (b - a) * 1.414, .034, .012, c0, [4, 5]); }
      } else { const nt = Math.max(2, Math.round(lf / .2)), lt = lf / nt;
        for (let t = 0; t < nt; t++) tab(em((t + .5) * lt, h / 2 - r() * .02, 0), lt - .014, h, .035);
        for (const fy of [.14, .86]) tab(em(lf / 2, h * fy, .028), lf - .04, .1, .022, .8);
        if (h > 1.5 && tipo !== 'postigo') tab(em(lf / 2, h * .5, .027).multiply(I4().makeRotationZ(sx * Math.atan2(h * .72 - .1, lf - .08))), Math.hypot(h * .72 - .1, lf - .08), .09, .02, .8);
        if (tipo === 'postigo') { const py = Math.min(h - .34, 1.5); tab(em(lf / 2, py, .03), Math.min(.4, lf - .1), .44, .03, .65); tab(em(lf / 2, py, .05), Math.min(.3, lf - .2), .34, .016, 1.14); liso.caixa(em(lf / 2, py - .1, .064), .07, .02, .02, FERRO); } }
      const tabuas = tipo === 'tabua' || tipo === 'postigo';
      for (const fy of [.17, .83]) liso.caixa(em(.07, h * fy + (tabuas ? .09 : 0), .03), .14, .04, .03, FERRO);
      if (h > 1.5) { liso.caixa(em(lf - .1, h * .52, .04), .18, .028, .028, FERRO); liso.caixa(em(lf - .06, h * .52, .05), .03, .07, .03, FERRO); }
      else tab(em(lf - .04, h * .5, .042).multiply(I4().makeRotationZ(.6)), .15, .045, .02, .72);
    };
    const LETREIROS = { 'sertao-praca-casa-interior-0': [[1, 'mercearia', 2.15, 3.13, 1.9], [1, 'secos', -2.25, 3.2, 2.5], [1, 'n27', -2.9, 2.2, .4]],
      'sertao-praca-casa-interior-1': [[1, 'barbearia', -2.15, 3.13, 1.9], [1, 'cabelo', 2.2, 3.2, 1.3], [1, 'n104', 2.9, 2.2, .46]],
      'sertao-casa-platibanda-0': [[-1, 'exvoto', 2.85, 2.56, .5], [-1, 'graca', 2.85, 1.98, .7]], 'sertao-casa-platibanda-1': [[-1, 'vote', 2.6, 3.1, 1.5], [-1, 'n12', -2.9, 2.2, .3]],
      'sertao-casa-pedra-7': [[-1, 'secos', 0, 3.12, 3.3]], 'sertao-casa-pedra-8': [[-1, 'queijo', -2.35, 3.08, 1.9]], 'sertao-casa-geminada-9': [[-1, 'forro', 0, 4.7, 4.4]] };
    let casaN = 0;
    if (opts.marcenaria !== false) scene.traverse((root) => {
      const planta = root.userData?.interior; if (!planta || !/^sertao-(casa-|praca-casa-)/.test(root.name)) return;
      root.updateWorldMatrix(true, false);
      const daPraca = /praca-casa/.test(root.name), frente = daPraca ? -1 : 1, bp = root.userData.boxParts || {}, { halfW, halfD } = planta, r = rngDe(root.name.length * 97 + Math.round(root.position.x * 7)), W = root.matrixWorld;
      const k = casaN++, tinta = TINTAS[k % 3], tPorta = ['postigo', 'almofada', 'tabua'][k % 3], tJan = k % 2 ? 'rotula' : 'tabua', faces = {};
      const em = (x, y, z, ry = 0) => I4().makeRotationY(ry).setPosition(x, y, z).premultiply(W);
      // vão = [eixo da parede, sinal para fora, centro ao longo da parede, largura, y0, y1]
      const vaos = [['z', frente, 0, 1.9, 0, 2.73], ['z', -frente, 0, daPraca ? 1.4 : 2, .82, 2.57]];
      for (const lado of [-1, 1]) vaos.push(bp[`${root.name}-peitoril-lateral-${lado}`] ? ['x', lado, .1, 1.44, .88, 2.55] : ['x', lado, 0, 1.9, 0, 2.55]);
      for (const [eixo, sinal, c, larg, y0, y1] of vaos) {
        const face = (eixo === 'z' ? halfD : halfW) + .14, v = .8 + r() * .3, tom = [.62 * v, .56 * v, .5 * v], escuro = [.4 * v, .35 * v, .31 * v];
        const q = eixo === 'z' ? quadro(W, c, sinal * face, sinal > 0 ? 0 : Math.PI) : quadro(W, sinal * face, c, sinal * Math.PI / 2);
        if (eixo === 'z') faces[sinal * frente] = q;
        of.caixa(q.m(0, y1 + .09, .03), larg + .44, .18, .14, escuro);
        if (y0 > .1) of.caixa(q.m(0, y0 - .02, .05), larg + .2, .05, .18, tom);
        const porta = y0 < .1, h = y1 - y0 - .06, lf = larg / 2 - .02;
        for (const s2 of [-1, 1]) folha((x, y, z) => q.m(s2 * (larg / 2 + .03) + x, y0 + .03 + y, .035 + z), s2, lf, h, tinta, porta ? tPorta : tJan, r);
        // Bandô de fitas ou de chita na verga da porta da frente: fica todo acima de 2,2 m.
        if (porta && eixo === 'z' && sinal === frente && k % 3 && opts.letreiros !== false) panos.push({ m: q.m(0, y1 - .25, -.12), w: larg, h: .5, r: k % 3 === 1 ? RT.fitas : RT.chita });
      }
      if (opts.letreiros !== false) for (const [lado, nome, x, y, w] of LETREIROS[root.name] || []) if (faces[lado]) letreiro(faces[lado], nome, x, y, w);
      // Lampião e chifres acima de 2,2 m: enfeite de fachada sem tocar a faixa de tiro.
      const zf = frente * (halfD + .14), lx = (r() < .5 ? -1 : 1) * 1.32;
      of.caixa(em(lx, 2.74, zf + frente * .17), .04, .04, .34, [.2, .18, .17]);
      liso.cilindro(V3(lx, 2.42, zf + frente * .3).applyMatrix4(root.matrixWorld), V3(lx, 2.72, zf + frente * .3).applyMatrix4(root.matrixWorld), .06, .06, 6, [.09, .085, .08], { aneis: [[0, 1], [.12, 1.05], [.14, .78], [.72, .78], [.74, 1.1], [.9, .5], [1, .12]] });
      liso.cilindro(V3(lx, 2.47, zf + frente * .3).applyMatrix4(root.matrixWorld), V3(lx, 2.63, zf + frente * .3).applyMatrix4(root.matrixWorld), .052, .052, 6, [3.2, 1.9, .7], { tampas: false });
      for (const s2 of [-1, 1]) { const a = V3(s2 * .07, 3.08, zf + frente * .06), b = V3(s2 * .3, 3.05, zf + frente * .2), c2 = V3(s2 * .46, 3.24, zf + frente * .26);
        for (const q of [a, b, c2]) q.applyMatrix4(root.matrixWorld);
        liso.cilindro(a, b, .048, .036, 5, [.7, .64, .5], { tampas: false }); liso.cilindro(b, c2, .036, .008, 5, [.62, .55, .42], { tampas: false }); }
      liso.caixa(em(0, 3.08, zf + frente * .05), .2, .16, .1, [.5, .44, .34]);
    });
    // Objetos de calçada: tudo encostado em parede ou esteio que já colide, em cima de peitoril, ou acima de 2,2 m.
    const moringa = (p, s = 1) => { const v = .8 + rnd() * .35; liso.cilindro(p, p.clone().add(V3(0, .3 * s, 0)), .11 * s, .11 * s, 9, tinge(BARRO, v), { aneis: [[0, .5], [.12, .86], [.38, 1], [.58, .8], [.72, .36], [.9, .3], [1, .42]] }); };
    const filtro = (p) => { const t = tinge(BARRO, 1.25); liso.cilindro(p, p.clone().add(V3(0, .24, 0)), .13, .125, 10, t, { aneis: [[0, .88], [.08, 1], [.94, 1], [1, .9]] });
      liso.cilindro(p.clone().add(V3(0, .24, 0)), p.clone().add(V3(0, .45, 0)), .12, .115, 10, tinge(BARRO, 1.1), { aneis: [[0, .92], [.08, 1], [.92, 1], [1, .9]] });
      liso.cilindro(p.clone().add(V3(0, .45, 0)), p.clone().add(V3(0, .52, 0)), .12, .12, 10, t, { aneis: [[0, 1], [.5, .6], [.8, .2], [1, .25]] }); };
    const cuia = (p) => liso.cilindro(p, p.clone().add(V3(0, .05, 0)), .045, .095, 8, [.46, .36, .16]);
    const banco = (q, x, z, L = 1.3) => { const v = .8 + rnd() * .3, t = [.66 * v, .54 * v, .4 * v];
      of.caixa(q.m(x, .43, z), L, .045, .27, t); of.caixa(q.m(x, .2, z), L - .3, .04, .04, tinge(t, .8));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) of.caixa(q.m(x + sx * (L / 2 - .13), .205, z + sz * .09).multiply(I4().makeRotationZ(sx * .1)), .05, .42, .05, tinge(t, .8)); };
    const tamborete = (q, x, z) => { const v = .8 + rnd() * .3, t = [.6 * v, .5 * v, .38 * v]; of.cilindro(q.p(x, .37, z), q.p(x, .41, z), .16, .16, 9, t);
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + .4; of.cilindro(q.p(x + Math.cos(a) * .17, 0, z + Math.sin(a) * .17), q.p(x + Math.cos(a) * .09, .37, z + Math.sin(a) * .09), .022, .022, 4, tinge(t, .8), { tampas: false }); } };
    const gaiola = (q, x, z) => { const y = 2.3, mad = [.5, .4, .24], f = (dx, yy, dz, w, h, d, c = mad) => liso.caixa(q.m(x + dx, yy, z + dz), w, h, d, c);
      f(0, y, 0, .24, .02, .24); f(0, y + .3, 0, .24, .02, .24); f(0, y + .42, 0, .012, .2, .012, FERRO);
      liso.cilindro(q.p(x, y + .3, z), q.p(x, y + .38, z), .15, .02, 4, mad, { giro: Math.PI / 4 });
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]]) f(dx * .11, y + .15, dz * .11, .012, .3, .012);
      f(0, y + .1, 0, .2, .012, .012); f(.02, y + .14, 0, .05, .055, .08, [1.7, 1.35, .25]); f(.02, y + .18, .04, .035, .035, .035, [1.7, 1.35, .25]); };
    const rede = (q, x, z) => { const cores = [[1.3, 1.22, 1.05], [.3, .5, 1.05], [1.3, 1.22, 1.05], [.95, .3, .22], [1.3, 1.22, 1.05]];
      cores.forEach((c, i) => liso.cilindro(q.p(x, 1.2 + i * .15, z), q.p(x, 1.35 + i * .15, z), .085, .085, 7, c, { tampas: i === 0 || i === 4, aneis: [[0, i === 0 ? .6 : 1], [1, i === 4 ? .6 : 1]] }));
      for (const y of [1.3, 1.62, 1.88]) liso.cilindro(q.p(x, y, z), q.p(x, y + .025, z), .092, .092, 7, [.3, .25, .18], { tampas: false });
      liso.cilindro(q.p(x, 1.95, z), q.p(x + .1, 2.4, z), .014, .014, 3, [.5, .45, .35], { tampas: false }); liso.cilindro(q.p(x, 1.2, z), q.p(x, .95, z), .03, .012, 4, [1.2, 1.1, .95], { tampas: false }); };
    const pilao = (q, x, z) => { const v = .8 + rnd() * .3, t = [.6 * v, .5 * v, .4 * v]; of.cilindro(q.p(x, 0, z), q.p(x, .62, z), .19, .19, 9, t, { aneis: [[0, 1], [.12, .92], [.42, .6], [.6, .66], [1, 1.05]] });
      of.cilindro(q.p(x + .03, .45, z), q.p(x + .16, 1.36, .06), .034, .034, 6, tinge(t, 1.15), { aneis: [[0, 1.5], [.22, 1], [.78, 1], [1, 1.5]] }); };
    const feixe = (q, x, z) => { for (const [dz, dy] of [[0, .05], [.1, .05], [-.1, .05], [.05, .13], [-.05, .13], [0, .21]]) { const v = .7 + rnd() * .4, e = (rnd() - .5) * .08;
      of.cilindro(q.p(x - .42 + e, dy, z + dz), q.p(x + .42 + e, dy, z + dz), .05, .045, 5, [.5 * v, .43 * v, .36 * v]); }
      for (const dx of [-.22, .22]) liso.cilindro(q.p(x + dx, .14, z - .17), q.p(x + dx, .14, z + .17), .012, .012, 3, [.3, .25, .18], { tampas: false }); };
    const fogao = (q, x) => { const c = (o, dx, y, z, w, h, d, cor = CAL) => o.caixa(q.m(x + dx, y, z), w, h, d, cor);
      c(pl, 0, .36, .34, 1.15, .72, .6); c(pl, 0, .755, .34, 1.25, .07, .68); c(pl, .43, 1.3, .16, .24, 1.05, .24); c(pl, .43, 1.86, .16, .32, .07, .32);
      c(liso, -.18, .3, .645, .36, .32, .02, BREU); for (const dx of [-.3, .1]) liso.cilindro(q.p(x + dx, .79, .36), q.p(x + dx, .795, .36), .11, .11, 10, BREU);
      liso.cilindro(q.p(x - .3, .795, .36), q.p(x - .3, 1.02, .36), .15, .15, 9, tinge(BARRO, .7), { aneis: [[0, .6], [.2, 1], [.7, .95], [.85, .7], [1, .78]] }); };
    const couro = (q, x, y) => { const pts = [[-.5, -.42], [-.38, -.3], [-.2, -.36], [0, -.4], [.2, -.36], [.38, -.3], [.5, -.42], [.52, -.2], [.36, -.05], [.38, .15], [.55, .38], [.4, .44], [.22, .3], [.08, .42], [0, .5], [-.08, .42], [-.22, .3], [-.4, .44], [-.55, .38], [-.38, .15], [-.36, -.05], [-.52, -.2]];
      liso.prisma(q.m(x, y, .05), pts, .012, [.2, .14, .09]); liso.prisma(q.m(x + .03, y + .02, .058), pts.map(([a, b]) => [a * .5, b * .55]), .008, [.42, .36, .27]);
      for (const [x0, y0, x1, y1] of [[-.66, -.55, .66, -.55], [-.66, .58, .66, .58], [-.62, -.6, -.62, .63], [.62, -.6, .62, .63]]) of.cilindro(q.p(x + x0, y + y0, .04), q.p(x + x1, y + y1, .04), .022, .02, 4, [.5, .44, .36], { tampas: false });
      for (const [a, b] of [[-.5, -.42], [.5, -.42], [.55, .38], [-.55, .38], [0, .5], [0, -.4]]) liso.cilindro(q.p(x + a, y + b, .05), q.p(x + a * 1.2, y + (b > 0 ? .58 : -.55), .045), .008, .008, 3, [.45, .4, .3], { tampas: false }); };
    // Casa maciça de pau a pique: porta e janelas de verdade por cima das caixas escuras do mapa, cada casa com o seu arranjo.
    const ARRANJO = { 2: { porta: 'postigo', jan: ['tabua', 'meia'], frente: ['bodega', 0, 2.68, 1.4], lado: ['queijo', 1.95, 2.52, 2.1] }, 3: { porta: 'holandesa', pano: 'chita', jan: ['rotula', 'rotula'], lado: ['fiado', -1.95, 2.5, 1.45] },
      4: { porta: 'almofada', jan: ['filtro', 'tabua'], lado: ['vote', 1.9, 2.5, 1.7] }, 5: { porta: 'holandesa', pano: 'fitas', jan: ['meia', 'tabua'], lado: ['exvoto', 1.9, 2.5, .5] }, 6: { porta: 'tabua', jan: ['rotula', 'tabua'], frente: ['n12', 1.0, 2.2, .3] } };
    if (opts.marcenaria !== false) scene.traverse((root) => { if (!/^sertao-casa-paupique-\d+$/.test(root.name)) return;
      const parede = root.children.find((c) => /^parede-casa-/.test(c.name)), g = parede?.geometry?.parameters; if (!g) return;
      root.updateWorldMatrix(true, false); const W = root.matrixWorld, id = +root.name.split('-').pop(), E = ARRANJO[id] || ARRANJO[2 + id % 5], r = rngDe(id * 131 + 7), tinta = TINTAS[id % 3], v = .8 + r() * .25, escuro = [.4 * v, .35 * v, .31 * v], tom = [.62 * v, .56 * v, .5 * v];
      for (const c of root.children) { const p = c.geometry?.parameters; if (c.isMesh && c.visible && p && Math.abs(p.width - .8) < .01 && Math.abs(p.height - .8) < .01) { c.visible = false; escondidos.push(c); } }
      const q = quadro(W, 0, g.depth / 2 + .02, 0), hol = E.porta === 'holandesa', hp = hol ? .98 : 2.03;
      for (const sx of [-1, 1]) of.caixa(q.m(sx * .64, 1.21, .09), .12, 2.14, .14, escuro);
      of.caixa(q.m(0, 2.33, .09), 1.52, .14, .17, escuro);
      for (const sx of [-1, 1]) folha((x, y, z) => q.m(-sx * .575 + x, .17 + y, .12 + z), sx, .57, hp, tinta, hol ? 'tabua' : E.porta, r);
      if (hol) { of.caixa(q.m(0, 1.17, .15), 1.2, .04, .16, tom); if (opts.letreiros !== false) panos.push({ m: q.m(0, 1.7, .1), w: 1.15, h: 1.0, r: RT[E.pano] }); }
      [-1.55, 1.55].forEach((cx, i) => { const t = E.jan[i], fora = cx < 0 ? -1 : 1;
        liso.caixa(q.m(cx, 2.05, .075), .82, .82, .02, BREU);
        for (const sx of [-1, 1]) of.caixa(q.m(cx + sx * .44, 2.05, .1), .08, .96, .12, escuro);
        of.caixa(q.m(cx, 2.49, .1), .96, .08, .12, escuro); of.caixa(q.m(cx, 1.61, .12), 1.0, .07, .22, tom);
        for (const sx of [-1, 1]) { if (t === 'filtro' || (t === 'meia' && sx === fora)) folha((x, y, z) => q.m(cx + sx * .5 + x, 1.65 + y, .05 + z), sx, .35, .8, tinta, 'tabua', r);
          else folha((x, y, z) => q.m(cx - sx * .4 + x, 1.65 + y, .11 + z), sx, .395, .8, tinta, t === 'rotula' ? 'rotula' : 'tabua', r); }
        if (t === 'filtro' && opts.objetos !== false) filtro(q.p(cx - .1, 1.645, .14)); });
      const lado = Math.sign((0 - root.position.x) * W.elements[0] + (2 - root.position.z) * W.elements[2]) || 1, qL = quadro(W, lado * (g.width / 2 + .05), 0, lado * Math.PI / 2), qF = quadro(W, 0, -(g.depth / 2 + .04), Math.PI);
      if (opts.letreiros !== false) { if (E.frente) letreiro(q, ...E.frente, .03); if (E.lado) letreiro(qL, ...E.lado, .03); }
      if (opts.objetos === false) return;
      if (id === 2) { banco(q, 1.55, .32); cuia(q.p(1.25, .455, .32)); cuia(q.p(1.8, .455, .36)); moringa(q.p(-1.9, 0, .3)); moringa(q.p(-2.25, 0, .34), .8); }
      if (id === 3) { gaiola(q, 1.5, .85); tamborete(q, -1.4, .34); tamborete(q, -2.0, .4); feixe(qF, 1.2, .3); }
      if (id === 4) { rede(q, 2.08, 1.1); pilao(q, -1.85, .36); couro(qL, -1.85, 2.55); }
      if (id === 5) { banco(q, -1.55, .32, 1.1); moringa(q.p(-1.5, .455, .32), .8); gaiola(q, -1.2, .9); couro(qL, -1.8, 2.55); }
      if (id === 6) { feixe(q, 1.6, .3); pilao(q, -1.8, .36); fogao(qF, .4); }
    });
    if (opts.objetos !== false) {
      // Mourão de amarrar montaria logo depois do limite oeste, com sela, manta e arreio.
      const hx = B.minX - .75, hz = 10.5;
      for (const dz of [-1.1, 1.1]) of.cilindro(V3(hx, -.1, hz + dz), V3(hx, 1.1, hz + dz), .06, .05, 5, [.5, .45, .4], { tampas: false });
      of.cilindro(V3(hx, 1.02, hz - 1.3), V3(hx, 1.02, hz + 1.3), .045, .045, 5, [.52, .46, .4]);
      liso.caixa(I4().setPosition(hx, 1.085, hz), .52, .03, .62, [.5, .16, .12]); liso.caixa(I4().setPosition(hx, 1.09, hz), .53, .03, .2, [.75, .7, .55]);
      liso.cilindro(V3(hx, 1.15, hz - .26), V3(hx, 1.15, hz + .26), .16, .16, 8, [.19, .115, .07], { aneis: [[0, 1.3], [.16, .95], [.5, .78], [.84, 1], [1, 1.4]] });
      for (const sx of [-1, 1]) { liso.caixa(I4().setPosition(hx + sx * .21, .82, hz), .02, .52, .045, [.14, .09, .06]); liso.caixa(I4().setPosition(hx + sx * .21, .54, hz), .03, .09, .13, FERRO); }
      liso.cilindro(V3(hx, 1.06, hz + .8), V3(hx + .1, .55, hz + .86), .012, .012, 3, [.14, .09, .06], { tampas: false }); liso.cilindro(V3(hx, 1.06, hz + .9), V3(hx - .08, .6, hz + .82), .012, .012, 3, [.14, .09, .06], { tampas: false });
    }
    // Matriz sertaneja em volume: frontispício com cunhais, cimalha, volutas, sineira aberta com sino, óculo e porta almofadada recuada.
    const matriz = (M, k) => {
      const mz = (x, y, z) => M.clone().multiply(I4().setPosition(x, y, z)), P = (x, y, z) => V3(x, y, z).applyMatrix4(M), cx = (o, x, y, z, w, h, d, cor = CAL) => o.caixa(mz(x, y, z), w, h, d, cor), r = rngDe(53);
      cx(pl, 0, 1.6, -.55, 4, 3.2, 5); pl.prisma(mz(0, 0, -3.02), [[-2, 3.2], [2, 3.2], [0, 4.16]], .06, CAL, [0, 3.4]);
      for (const s of [-1, 1]) tl.caixa(M.clone().multiply(I4().makeRotationZ(-s * .43).setPosition(s * 1.08, 3.69, -.5)), 2.55, .1, 5.35, CAL);
      tl.cilindro(P(0, 4.2, -3.2), P(0, 4.2, 2.05), .1 * k, .1 * k, 6, CAL);
      for (const s of [-1, 1]) { cx(pl, s * 1.4, 1.75, 2.3, 1.5, 3.5, .6); cx(pl, s * 1.4, .4, 2.625, 1.5, .8, .07); cx(pl, s * 1.97, 1.75, 2.65, .36, 3.5, .12); cx(pl, s * 1.97, 3.36, 2.67, .46, .1, .18);
        cx(pl, s * .74, 1.33, 2.63, .16, 2.22, .08); cx(pl, s * 1.97, 3.95, 2.38, .36, .34, .36); pl.cilindro(P(s * 1.97, 4.12, 2.38), P(s * 1.97, 4.66, 2.38), .22 * k, .02 * k, 4, CAL, { giro: Math.PI / 4 });
        const vol = [[.8, 3.78], [1.78, 3.78], [1.78, 3.96], [1.66, 4.06], [1.5, 4.1], [1.34, 4.18], [1.2, 4.32], [1.1, 4.5], [1.04, 4.7], [.98, 4.86], [.9, 4.96], [.8, 4.98]];
        pl.prisma(mz(0, 0, 2.42), s > 0 ? vol : vol.map(([x, y]) => [-x, y]).reverse(), .36, CAL, [s * .86, 3.84]);
        pl.cilindro(P(s * 1.58, 3.97, 2.6), P(s * 1.58, 3.97, 2.67), .13 * k, .13 * k, 10, CAL); pl.cilindro(P(s * .95, 4.8, 2.6), P(s * .95, 4.8, 2.66), .1 * k, .1 * k, 10, CAL);
        for (const zc of [-2.2, -.6]) { const F = M.clone().multiply(I4().makeRotationY(s * Math.PI / 2).setPosition(s * 2.0, 0, zc)), fm = (x, y, z) => F.clone().multiply(I4().setPosition(x, y, z));
          pl.caixa(fm(0, 2.52, .04), .74, .1, .1, CAL); pl.caixa(fm(0, 1.56, .04), .7, .07, .12, CAL);
          for (const sx of [-1, 1]) folha((x, y, z) => fm(-sx * .27 + x, 1.6 + y, .03 + z), sx, .265, .86, TINTAS[0], 'tabua', r); } }
      cx(pl, 0, 2.95, 2.3, 1.3, 1.1, .6); cx(liso, 0, 1.3, 2.04, 1.3, 2.2, .04, BREU);
      pl.prisma(mz(0, 0, 2.64), [[-.84, 2.42], [.84, 2.42], [.84, 2.5], [.6, 2.62], [.3, 2.7], [0, 2.72], [-.3, 2.7], [-.6, 2.62], [-.84, 2.5]], .09, CAL, [0, 2.45]);
      pl.cilindro(P(0, 3.04, 2.6), P(0, 3.04, 2.67), .31 * k, .31 * k, 16, CAL); liso.cilindro(P(0, 3.04, 2.665), P(0, 3.04, 2.676), .21 * k, .21 * k, 16, [.03, .04, .07]);
      for (const [w, h] of [[.42, .03], [.03, .42]]) pin.caixa(mz(0, 3.04, 2.682), w, h, .012, tinge(TINTAS[0], .9));
      for (const sx of [-1, 1]) folha((x, y, z) => mz(-sx * .64 + x, .23 + y, 2.1 + z), sx, .635, 2.16, TINTAS[0], 'almofada', r);
      for (const [y, w, d, h] of [[3.54, 4.5, .72, .08], [3.65, 4.66, .86, .14], [3.75, 4.76, .94, .06]]) cx(pl, 0, y, 2.38, w, h, d);
      cx(pl, 0, 4.14, 2, 1.6, .72, 1.6); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cx(pl, sx * .6, 4.75, 2 + sz * .6, .4, .5, .4);
      const arco = (a, b) => { const pts = b > a ? [[-b, 5], [-a, 5]] : [[-a, 5]]; for (let i = 1; i < 8; i++) pts.push([-a * Math.cos(i / 8 * Math.PI), 5 + a * Math.sin(i / 8 * Math.PI)]);
        pts.push([a, 5]); if (b > a) pts.push([b, 5]); pts.push([b, 5.5], [-b, 5.5]); return pts; };
      for (const sz of [-1, 1]) pl.prisma(mz(0, 0, 2 + sz * .6), arco(.4, .8), .4, CAL, [0, 5.48]);
      for (const sx of [-1, 1]) pl.prisma(M.clone().multiply(I4().makeRotationY(Math.PI / 2).setPosition(sx * .6, 0, 2)), arco(.4, .4), .4, CAL, [0, 5.48]);
      cx(pl, 0, 5.54, 2, 1.72, .08, 1.72); cx(pl, 0, 5.64, 2, 1.9, .12, 1.9);
      const cant = [[-.8, 2.8], [.8, 2.8], [.8, 1.2], [-.8, 1.2]].map(([x, z]) => P(x, 5.7, z)), apice = P(0, 6.62, 2);
      for (let i = 0; i < 4; i++) pl.tri(cant[i], cant[(i + 1) % 4], apice, CAL);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cx(pl, sx * .8, 5.78, 2 + sz * .8, .16, .16, .16); pl.cilindro(P(sx * .8, 5.86, 2 + sz * .8), P(sx * .8, 6.14, 2 + sz * .8), .09 * k, .015 * k, 4, CAL, { giro: Math.PI / 4 }); }
      liso.cilindro(P(0, 6.58, 2), P(0, 6.7, 2), .07 * k, .07 * k, 6, FERRO, { aneis: [[0, .3], [.5, 1], [1, .3]] }); cx(liso, 0, 7, 2, .05, .78, .05, FERRO); cx(liso, 0, 7.1, 2, .46, .05, .05, FERRO);
      cx(of, 0, 5.02, 2, 1.3, .08, .08, [.5, .42, .34]); liso.cilindro(P(0, 4.98, 2), P(0, 4.54, 2), .27 * k, .27 * k, 10, [.2, .15, .07], { aneis: [[0, .3], [.12, .52], [.55, .68], [.85, .88], [1, 1.08]] });
      liso.cilindro(P(0, 4.62, 2), P(0, 4.46, 2), .035 * k, .05 * k, 5, FERRO);
      cx(pl, 0, .055, 3.05, 3.4, .11, 1.3); cx(pl, 0, .165, 2.8, 2.1, .11, .7);
    };
    const igreja = opts.matriz !== false && scene.getObjectByName('sertao-igrejinha-0');
    if (igreja) { igreja.updateWorldMatrix(true, false); for (const c of igreja.children) if (c.visible) { c.visible = false; escondidos.push(c); } matriz(igreja.matrixWorld.clone(), 1); }
    if (opts.matriz !== false && opts.capela !== false) { const [mx, mz2, mh, mr] = opts.capela?.pos ?? [-24, -56.5, 2.2, 10.5], esc = (opts.capela?.altura ?? 19) / 7.3;
      matriz(I4().makeRotationY(opts.capela?.ry ?? .36).scale(V3(esc, esc, esc)).setPosition(mx, mh - .45, mz2), esc); }
    desfaz.push(() => { for (const c of escondidos) c.visible = true; });
    if (opts.praca !== false) {
      // Só em cima de colisor que já existe ou rente ao chão (até 12 cm): nenhum volume novo na linha de tiro ou de passo.
      const sobre = (X, Z, ry) => (lx, y, lz) => V3(X + Math.cos(ry) * lx + Math.sin(ry) * lz, y, Z - Math.sin(ry) * lx + Math.cos(ry) * lz);
      const pote = (p, s = 1) => { const v = .8 + rnd() * .35; liso.cilindro(p, p.clone().add(V3(0, .36 * s, 0)), .17 * s, .17 * s, 9, [.2 * v, .12 * v, .085 * v],
        { aneis: [[0, .5], [.1, .82], [.38, 1], [.62, .88], [.8, .5], [.9, .42], [1, .56]] }); };
      const saca = (p, rumo, s = 1) => { const v = .8 + rnd() * .3, e = V3(Math.cos(rumo), 0, Math.sin(rumo)), a = p.clone().addScaledVector(e, -.33 * s).add(V3(0, .17 * s, 0));
        of.cilindro(a, a.clone().addScaledVector(e, .66 * s), .2 * s, .2 * s, 8, [.52 * v, .47 * v, .37 * v], { aneis: [[0, .5], [.14, .95], [.5, 1.06], [.86, .95], [1, .5]] }); };
      const lenha = (p, rumo) => { const e = V3(Math.cos(rumo), 0, Math.sin(rumo)), t = V3(-e.z, 0, e.x);
        [[0, .05], [.1, .05], [-.1, .05], [.05, .13], [-.05, .13], [0, .21]].forEach(([dx, dy]) => { const v = .7 + rnd() * .4, a = p.clone().addScaledVector(t, dx).add(V3(0, dy, 0)).addScaledVector(e, -.42 + (rnd() - .5) * .08);
          of.cilindro(a, a.clone().addScaledVector(e, .84), .05, .045, 5, [.5 * v, .43 * v, .36 * v]); }); };
      const naZona = (x, z, L) => zonas.some(([zx, zz]) => Math.hypot(x - zx, z - zz) < 5.4 + L / 2);
      const tabua = (x, z, L, ry, esteira = false) => { if (!naArena(x, z, 1) || naZona(x, z, L) || (!esteira && dentroDeCasa(x, z))) return; const v = .8 + rnd() * .3;
        of.caixa(new THREE.Matrix4().makeRotationY(ry).setPosition(x, esteira ? .015 : .03, z), L, esteira ? .03 : .05, esteira ? 1 : .2, esteira ? [.8 * v, .68 * v, .4 * v] : [.6 * v, .53 * v, .46 * v]); };
      const mureta = sobre(4, -8, .04), carga = sobre(-9, -8, .16), feira = sobre(-3, 9, -.12);
      pote(mureta(-2.1, 1.45, 0)); pote(mureta(-1.6, 1.45, .05), .8); pote(mureta(2.1, 1.45, -.03), 1.1); saca(mureta(.7, 1.45, 0), .04);
      saca(carga(-.9, 1.1, .35), .5); saca(carga(-.75, 1.1, -.35), .1); pote(carga(1.05, 1.05, .55)); lenha(carga(.75, 1.05, -.2), 1.3);
      saca(feira(-.85, 1.05, .3), 1.2); pote(feira(-.9, 1.05, -.4), .9); pote(feira(-.35, 1.05, -.45), .7);
      for (const [x, z] of [[12, -12], [-17, 13], [-12, -33], [14, 34]]) { pote(V3(x - .18, 1.08, z + .12), .85); saca(V3(x + .2, 1.08, z - .15), x * .7, .75); }
      scene.traverse((o) => { if (o.name !== 'carroca') return; o.updateWorldMatrix(true, false); const w = (x, z) => V3(x, opts.carroca === false ? 1.575 : 1.03, z).applyMatrix4(o.matrixWorld), ry = o.rotation.y;
        saca(w(-1.0, .5), .4 - ry); saca(w(-.9, -.45), 1.5 - ry, .9); saca(w(-.2, .9), .1 - ry, .85); pote(w(1.1, .7)); pote(w(.7, -.4), .8); lenha(w(.35, -1.0), -ry); });
      [[-2.2, 6.2, 1.9, .5], [-1.7, 6.5, 1.6, .62], [5.2, 4.6, 2.1, -.3], [-6.2, -5.4, 1.8, 1.2], [-5.6, -5.1, 1.5, 1.05], [2.4, -10.2, 2, .1], [10.4, 6.4, 1.7, -.9], [-11.5, 3.3, 2.2, .2],
        [6.3, -3.2, 1.6, 2.1], [-4.4, 12.3, 1.9, -.4], [12.6, -4.2, 1.8, .8], [-12.8, -11.3, 2, -.2]].forEach(([x, z, L, ry]) => tabua(x, z, L, ry));
      [[-11.5, 10.7, 1.7, 0], [11.5, 10.7, 1.7, .05], [-9.7, -29.8, 1.6, .12], [10.3, -30.2, 1.6, -.17]].forEach(([x, z, L, ry]) => tabua(x, z, L, ry, true));
      // Cerca de faxina logo depois dos limites leste e oeste: mourão de 15 cm para não cintilar visto da praça.
      for (const sx of [-1, 1]) { let trecho = null;
        for (let z = B.minZ - 1; z < B.maxZ + 1;) { const passo = .42 + rnd() * .2, x = sx * (B.maxX + 1.05 + Math.sin(z * .21) * .25), portao = [-1.6, 20.2, -33].some((zp) => Math.abs(z - zp) < 2.6) || rngDe(900 + Math.floor(z / 5.5) * 13 + sx)() < .16;
          if (portao) { trecho = null; z += passo; continue; }
          const h = 1.2 + rnd() * .55, v = .7 + rnd() * .4, a = V3(x, -.1, z), b = V3(x + (rnd() - .5) * .16, h, z + (rnd() - .5) * .16);
          of.cilindro(a, b, .085, .065, 3, [.5 * v, .45 * v, .4 * v], { tampas: false });
          if (!trecho) trecho = z; else if (z - trecho > 3.2) { for (const y of [.5, 1.02]) of.caixa(new THREE.Matrix4().makeRotationZ((rnd() - .5) * .05).setPosition(x + sx * .09, y, (z + trecho) / 2), .07, .11, z - trecho + .3, [.42, .37, .33]); trecho = z; }
          z += passo; } }
    }
    if (opts.carroca !== false) {
      // Carroção de tábua no mesmo volume do colisor; a malha de caixas do mapa fica oculta enquanto o kit estiver ligado.
      const car = oficina(), ocultos = [], ferro = [.15, .14, .14];
      scene.traverse((o) => { if (o.name !== 'carroca') return; o.updateWorldMatrix(true, false);
        const W = o.matrixWorld, r = rngDe(Math.round(o.position.x * 13 + o.position.z * 7) + 99), I4 = () => new THREE.Matrix4();
        for (const c of o.children) if (c.visible) { c.visible = false; ocultos.push(c); }
        const em = (x, y, z) => I4().setPosition(x, y, z).premultiply(W), P = (x, y, z) => V3(x, y, z).applyMatrix4(W), tom = (k = 1) => { const v = (.8 + r() * .35) * k; return [1.05 * v, .92 * v, .76 * v]; };
        const roda = (x, cy, cz) => { const n = 32, R = .7, passo = 2 * R * Math.tan(Math.PI / n) + .004; let camba = tom();
          for (let i = 0; i < n; i++) { const a = i / n * 6.2832, sn = Math.sin(a), cs = Math.cos(a), B = I4().makeBasis(V3(1, 0, 0), V3(0, sn, cs), V3(0, -cs, sn)).setPosition(x, cy + R * sn, cz + R * cs).premultiply(W);
            if (i % 4 === 0) camba = tom(sn < -.5 ? 1.25 : 1); car.caixa(B, .1, .1, passo, camba, [0, 1, 2, 3]); }
          car.cilindro(P(x - .046, cy, cz), P(x + .046, cy, cz), R + .058, R + .058, 32, ferro, { tampas: false });
          for (let i = 0; i < 12; i++) { const a = (i + .5) / 12 * 6.2832, sn = Math.sin(a), cs = Math.cos(a);
            car.cilindro(P(x, cy + .08 * sn, cz + .08 * cs), P(x, cy + (R - .04) * sn, cz + (R - .04) * cs), .034, .027, 5, tom(), { tampas: false }); }
          car.cilindro(P(x - .14, cy, cz), P(x + .14, cy, cz), .12, .12, 10, tom(.85), { aneis: [[0, .7], [.25, 1], [.75, 1], [1, .7]] }); car.cilindro(P(x - .17, cy, cz), P(x + .17, cy, cz), .05, .05, 6, ferro); };
        for (let i = 0; i < 10; i++) car.caixa(em(-1.395 + i * .31, 1 + r() * .012, 0), .296, .05, 3, tom());
        for (const sx of [-1, 1]) { for (let j = 0; j < 3; j++) car.caixa(em(sx * 1.55, 1.13 + j * .19, (r() - .5) * .04), .04, .175, 3.04, tom());
          for (const z of [-1.3, -.45, .45, 1.3]) { car.caixa(em(sx * 1.6, 1.27, z), .06, .7, .07, tom(.9)); car.caixa(em(sx * 1.635, 1.5, z), .012, .05, .09, ferro); } }
        for (const sz of [-1, 1]) for (let j = 0; j < 3; j++) car.caixa(em((r() - .5) * .04, 1.13 + j * .19, sz * 1.5), 3.06, .175, .04, tom());
        for (const x of [-.9, .9]) car.caixa(em(x, .92, 0), .11, .13, 3, tom(.85));
        for (const sz of [-1, 1]) { const z = sz * .88; car.caixa(em(0, .84, z), 3.3, .1, .12, tom(.85)); car.cilindro(P(-1.86, .77, z), P(1.86, .77, z), .045, .045, 6, ferro); for (const sx of [-1, 1]) roda(sx * 1.75, .77, z); }
        car.cilindro(P(0, .86, -1.5), P(0, .62, -4.7), .07, .05, 8, tom()); car.caixa(em(0, .7, -4.2), 1.5, .07, .08, tom()); });
      const gc = car.geo(), mc = new THREE.Mesh(gc, mat); mc.name = 'sertao-hd-carrocas'; mc.castShadow = true; mc.receiveShadow = true; mc.userData.nonSolidSurface = true; grupo.add(mc); lixo.push(gc);
      desfaz.push(() => { for (const c of ocultos) c.visible = true; });
    }
    if (opts.contato !== false) {
      // Sombra de contato: borrão escuro rente ao chão em volta de todo colisor que pisa nele (parede, caixote, carroça).
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'), im = cx.createImageData(64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const u = Math.min(x, 63 - x) / 31.5, w = Math.min(y, 63 - y) / 31.5, i = (y * 64 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = 255 * suave(0, .3, u) * suave(0, .3, w); }
      cx.putImageData(im, 0, 0); const tex = new THREE.CanvasTexture(cv); tex.name = 'hd-cen-contato';
      const pisam = cols.filter((c) => c.minY < .15 && Math.max(c.maxX - c.minX, c.maxZ - c.minZ) < 13), gp = new THREE.PlaneGeometry(1, 1); gp.rotateX(-Math.PI / 2);
      const mp = new THREE.MeshBasicMaterial({ color: 0x140b06, map: tex, transparent: true, opacity: opts.contato?.forca ?? .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, name: 'hd-cen-contato' });
      const im2 = lote(gp, mp, pisam.length, 'contato'); im2.receiveShadow = false; lixo.push(gp, mp, tex);
      pisam.forEach((c, i) => { const w = c.hx ? c.hx * 2 : c.maxX - c.minX, d = c.hz ? c.hz * 2 : c.maxZ - c.minZ, m = .5 + Math.min(.45, .12 * Math.min(w, d));
        obj.position.set(c.hx ? c.cx : (c.minX + c.maxX) / 2, .014, c.hz ? c.cz : (c.minZ + c.maxZ) / 2); obj.rotation.set(0, c.hx ? c.ry || 0 : 0, 0); obj.scale.set(w + m, 1, d + m); obj.updateMatrix(); im2.setMatrixAt(i, obj.matrix); });
      im2.instanceMatrix.needsUpdate = true; im2.computeBoundingSphere();
    }
    if (opts.festa !== false) {
      // Poste de lampião colado na quina das casas da praça e bandeirolas entre eles: tudo que é novo fica acima de 2,2 m.
      const quina = (tag, sx, sz) => { const c = (mundo.colliders || []).find((q) => q.tag === tag); return c ? V3(sx > 0 ? c.maxX + .13 : c.minX - .13, 0, sz > 0 ? c.maxZ + .13 : c.minZ - .13) : null; };
      const pts = [[3, 1, -1], [2, 1, 1], [4, -1, 1], [5, -1, -1], [6, -1, 1]].map(([id, sx, sz]) => quina(`sertao-casa-paupique-${id}`, sx, sz));
      const TOPO = 4.75, panos = [[.5, .15, .11], [.6, .47, .18], [.18, .3, .4], [.6, .55, .46], [.24, .36, .26]];
      for (const p of pts) { if (!p) continue; const v = .8 + rnd() * .3, para = V3(-p.x, 0, -p.z).normalize();
        of.cilindro(V3(p.x, -.1, p.z), V3(p.x + (rnd() - .5) * .08, TOPO + .1, p.z + (rnd() - .5) * .08), .085, .06, 6, [.52 * v, .46 * v, .4 * v]);
        const braco = V3(p.x, 4.05, p.z).addScaledVector(para, .55); of.cilindro(V3(p.x, 4.12, p.z), braco, .03, .025, 4, [.2, .18, .17], { tampas: false });
        liso.cilindro(braco.clone().add(V3(0, -.42, 0)), braco.clone().add(V3(0, -.04, 0)), .075, .075, 6, [.09, .085, .08], { aneis: [[0, 1], [.12, 1.05], [.14, .78], [.72, .78], [.74, 1.1], [.9, .5], [1, .12]] });
        liso.cilindro(braco.clone().add(V3(0, -.36, 0)), braco.clone().add(V3(0, -.16, 0)), .066, .066, 6, [3.4, 2.1, .8], { tampas: false }); }
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [2, 4]]) { const a = pts[i], b = pts[j]; if (!a || !b) continue;
        const L = a.distanceTo(b), nseg = Math.ceil(L / .52), cede = Math.min(1.15, L * .05), em = (t) => V3(a.x + (b.x - a.x) * t, TOPO - cede * 4 * t * (1 - t), a.z + (b.z - a.z) * t);
        for (let k = 0; k < nseg; k++) { const p0 = em(k / nseg), p1 = em((k + 1) / nseg); liso.cilindro(p0, p1, .012, .012, 3, [.2, .18, .16], { tampas: false });
          if (k % 7 === 6) continue; const u0 = p0.clone().lerp(p1, .12), u1 = p0.clone().lerp(p1, .88), tom = panos[(k * 3 + i) % panos.length], g = .75 + rnd() * .4;
          liso.tri(u0, u1, u0.clone().lerp(u1, .5 + (rnd() - .5) * .3).add(V3(0, -.3 - rnd() * .08, 0)), [tom[0] * g, tom[1] * g, tom[2] * g]); } }
    }
    if (opts.chamines !== false) scene.traverse((o) => { const g = o.geometry?.parameters;
      if (!o.isMesh || o.isInstancedMesh || !/^parede-casa-\d+$/.test(o.name) || !(g?.width > 2.5) || !/paupique/.test(o.parent?.name || '')) return;
      o.updateWorldMatrix(true, false); const id = +o.name.slice(-1), x = (id % 2 ? 1 : -1) * g.width * .2, z = (id % 3 - 1) * g.depth * .24, y = g.height / 2, em = (dy) => new THREE.Matrix4().setPosition(x, y + dy, z).premultiply(o.matrixWorld);
      liso.caixa(em(.95), .46, 1.15, .46, [.6, .52, .43]); liso.caixa(em(1.56), .6, .08, .6, [.3, .21, .16]); liso.caixa(em(1.67), .3, .14, .3, [.17, .14, .12]); });
    if (opts.flora !== false && opts.arbustos !== false) {
      const ga = pedraGeo(0, 41, .3), n = 44, im = lote(ga, matPedra, n, 'arbustos'); lixo.push(ga);
      for (let i = 0; i < n; i++) { const emX = i % 2 === 0, s = rnd() < .5 ? -1 : 1, fora = 1.7 + Math.pow(rnd(), 1.4) * 4.2;
        const x = emX ? (rnd() * 2 - 1) * (B.maxX + 2) : s * (B.maxX + fora), z = emX ? s * (B.maxZ + fora + 1.2) : (rnd() * 2 - 1) * (B.maxZ + 2), r0 = .5 + rnd() * .65, y = terreno(x, z);
        if (emX && Math.abs(x) < 9.5) { obj.scale.setScalar(0); obj.updateMatrix(); im.setMatrixAt(i, obj.matrix); continue; }
        obj.position.set(x, y + r0 * .42, z); obj.rotation.set(0, rnd() * 6.283, 0); obj.scale.set(r0 * (1 + rnd() * .5), r0 * (.62 + rnd() * .3), r0 * (1 + rnd() * .4)); obj.updateMatrix(); im.setMatrixAt(i, obj.matrix);
        const v = .22 + rnd() * .14, w = rnd(); im.setColorAt(i, cor.setRGB(v * (1.15 + .2 * w), v * (1.05 + .05 * w), v * (.62 - .12 * w)));
        for (let k = 0; k < 3; k++) { const ang = rnd() * 6.283, abre = .35 + rnd() * .7, L = r0 * (1.5 + rnd() * .7), d = V3(Math.cos(ang) * Math.sin(abre), Math.cos(abre), Math.sin(ang) * Math.sin(abre)), a = V3(x, y, z), m2 = a.clone().addScaledVector(d, L * .55);
          of.cilindro(a, m2, .055, .045, 3, [.36, .31, .26], { tampas: false }); of.cilindro(m2, m2.clone().addScaledVector(d, L * .45).add(V3((rnd() - .5) * .3, .12, (rnd() - .5) * .3)), .045, .03, 3, [.4, .34, .28], { tampas: false }); } }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    }
    if (panos.length) {
      // Letreiro de pintor de parede: um atlas só, letra a letra com tremor, falha de tinta e escorrido.
      const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const c = cv.getContext('2d', { willReadFrequently: true }), rg = rngDe(1877), escorridos = [];
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const ANIL = '#1c3f8f', OXIDO = '#8a5316', PRETO = '#191613', SERIFA = { fonte: 'Georgia, "Times New Roman", serif', peso: '900' }, GROSSA = { fonte: '"Arial Black", Impact, sans-serif', peso: '900', folga: 1.04 };
      const pinta = (txt, [x, y, w, h], cor, { sombra = null, fonte = 'Impact, "Arial Black", sans-serif', peso = '', escorre = .25, folga = 1.08 } = {}) => {
        const linhas = txt.split('\n'), lh = h / linhas.length;
        linhas.forEach((ln, li) => { let px = lh * .74; c.font = `${peso} ${px}px ${fonte}`; const larg = c.measureText(ln).width * folga; if (larg > w - 28) px *= (w - 28) / larg; c.font = `${peso} ${px}px ${fonte}`;
          let cx = x + (w - c.measureText(ln).width * folga) / 2; const by = y + li * lh + lh * .5;
          for (const ch of ln) { const cw = c.measureText(ch).width * folga, jy = (rg() - .5) * px * .06, ja = (rg() - .5) * .08, js = 1 + (rg() - .5) * .08;
            c.save(); c.translate(cx + cw / 2, by + jy); c.rotate(ja); c.scale(js, js);
            if (sombra) { c.fillStyle = sombra; c.fillText(ch, px * .045, px * .045); }
            c.fillStyle = cor; c.fillText(ch, 0, 0); c.restore();
            if (ch !== ' ' && ch !== '·' && rg() < escorre) escorridos.push([cx + cw * (.3 + rg() * .4), by + px * .3, Math.min(px * (.2 + rg() * .55), y + h - 4 - (by + px * .3)), cor]);
            cx += cw; } }); };
      pinta('BODEGA', RT.bodega, ANIL, GROSSA); pinta('BARBEARIA', RT.barbearia, PRETO, SERIFA); pinta('MERCEARIA', RT.mercearia, PRETO, { ...GROSSA, escorre: .12 });
      pinta('VOTE 00', [RT.vote[0] + 14, RT.vote[1] + 8, RT.vote[2] - 28, RT.vote[3] - 16], PRETO); c.strokeStyle = ANIL; c.lineWidth = 7; c.strokeRect(RT.vote[0] + 9, RT.vote[1] + 9, RT.vote[2] - 18, RT.vote[3] - 18);
      pinta('FORRÓ HOJE', RT.forro, ANIL, { ...GROSSA, sombra: OXIDO, escorre: .3 }); pinta('VENDE-SE\nQUEIJO E RAPADURA', RT.queijo, OXIDO, { ...GROSSA, sombra: PRETO }); pinta('FIADO\nSÓ AMANHÃ', RT.fiado, PRETO, SERIFA);
      pinta('FARINHA · FEIJÃO · CARNE DE SOL', RT.secos, ANIL, { ...GROSSA, escorre: .1 }); pinta('CABELO E BARBA', RT.cabelo, PRETO, { ...GROSSA, escorre: 0 });
      pinta('Nº 27', RT.n27, PRETO, { escorre: 0 }); pinta('Nº 104', RT.n104, ANIL, { escorre: 0 }); pinta('12', RT.n12, PRETO, { escorre: 0 });
      pinta('GRAÇA\nALCANÇADA', RT.graca, ANIL, { fonte: 'Georgia, serif', peso: 'italic 700', escorre: .1 });
      { const [x, y, w, h] = RT.exvoto; c.fillStyle = ANIL; c.save(); c.translate(x + w / 2, y + h * .45); c.rotate(-.03); c.fillRect(-9, -h * .36, 18, h * .72); c.fillRect(-w * .27, -h * .17, w * .54, 17); c.restore();
        c.beginPath(); c.ellipse(x + w / 2, y + h * .86, w * .3, 11, 0, Math.PI, 0); c.fill(); for (const a of [-1, 1]) for (const b of [0, 1]) c.fillRect(x + w / 2 + a * (w * .24 + b * 12) - 2, y + h * .1 + b * 10, 4, 13); }
      for (const [dx, dy, len, cor] of escorridos) { if (len < 6) continue; const g = c.createLinearGradient(0, dy, 0, dy + len); g.addColorStop(0, cor); g.addColorStop(1, `${cor}00`); c.fillStyle = g; c.fillRect(dx - 1.5, dy, 3, len); c.beginPath(); c.arc(dx, dy + len * .8, 2.2, 0, 6.3); c.fill(); }
      const img = c.getImageData(0, 0, 1024, 1024), d = img.data, G = 48, grade = Float32Array.from({ length: (G + 2) * (G + 2) }, () => rg());
      for (let yy = 0; yy < 1024; yy++) { const fy = yy / 1024 * G, iy = fy | 0, ty = fy - iy, faixa = .86 + .14 * Math.sin(yy * 1.9 + Math.sin(yy * .13) * 4);
        for (let xx = 0; xx < 1024; xx++) { const i = (yy * 1024 + xx) * 4 + 3; if (!d[i]) continue; const fx = xx / 1024 * G, ix = fx | 0, tx = fx - ix, a = iy * (G + 2) + ix, b = a + G + 2;
          const nn = (grade[a] * (1 - tx) + grade[a + 1] * tx) * (1 - ty) + (grade[b] * (1 - tx) + grade[b + 1] * tx) * ty;
          d[i] *= Math.min(1, .82 + nn * .36) * (.62 + .38 * faixa) * (rg() < .05 ? rg() : 1); } }
      c.putImageData(img, 0, 0);
      { const [x, y, w, h] = RT.chita; c.fillStyle = '#1e5f86'; c.fillRect(x + 4, y + 4, w - 8, h - 8);
        for (let i = 0; i < 46; i++) { const fx = x + 16 + rg() * (w - 32), fy = y + 14 + rg() * (h - 44), rr = 7 + rg() * 7;
          c.fillStyle = '#2f7a46'; c.beginPath(); c.ellipse(fx + rr, fy + rr * .8, rr * .9, rr * .4, .6, 0, 6.3); c.fill();
          c.fillStyle = ['#e9d9b0', '#d9892a', '#c95a7a', '#f2efe2'][i % 4]; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(fx + Math.cos(p * 1.257) * rr * .6, fy + Math.sin(p * 1.257) * rr * .6, rr * .5, 0, 6.3); c.fill(); }
          c.fillStyle = '#e8c53a'; c.beginPath(); c.arc(fx, fy, rr * .3, 0, 6.3); c.fill(); }
        c.globalCompositeOperation = 'destination-out'; for (let i = 0; i <= 9; i++) { c.beginPath(); c.arc(x + 4 + i * (w - 8) / 9, y + h - 4, (w - 8) / 18 * .72, 0, 6.3); c.fill(); } c.globalCompositeOperation = 'source-over'; }
      { const [x, y, w, h] = RT.fitas; let fx = x + 6, n = 0; while (fx < x + w - 20) { const fw = 9 + rg() * 7; c.fillStyle = ['#b8432f', '#e0b33a', '#2f6fa8', '#2e8a57', '#ece6d6', '#d4578a'][n++ % 6]; c.fillRect(fx, y + 4, fw, h * (.7 + rg() * .27) - 8); fx += fw + 3 + rg() * 3; } }
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.name = 'hd-cen-letreiros'; tex.onUpdate = () => { cv.width = cv.height = 0; tex.onUpdate = null; };
      const Pq = [], Uq = [], Nq = [], Iq = [], vq = new THREE.Vector3(), nq = new THREE.Vector3();
      for (const { m, w, h, r: [rx, ry, rw, rh] } of panos) { const b = Pq.length / 3; nq.set(0, 0, 1).transformDirection(m);
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { vq.set(sx * w / 2, sy * h / 2, 0).applyMatrix4(m); Pq.push(vq.x, vq.y, vq.z); Nq.push(nq.x, nq.y, nq.z); Uq.push((rx + (sx > 0 ? rw - 2 : 2)) / 1024, 1 - (ry + (sy > 0 ? 2 : rh - 2)) / 1024); }
        Iq.push(b, b + 1, b + 2, b, b + 2, b + 3); }
      const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.Float32BufferAttribute(Pq, 3)); gq.setAttribute('normal', new THREE.Float32BufferAttribute(Nq, 3)); gq.setAttribute('uv', new THREE.Float32BufferAttribute(Uq, 2)); gq.setIndex(Iq); gq.computeBoundingSphere();
      const matL = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .03, roughness: 1, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'hd-cen-letreiro' });
      // A tinta herda o grão do reboco e falha em placas presas ao mundo; o pano (canto do atlas) fica inteiro.
      matL.onBeforeCompile = (sh) => { sh.uniforms.hdDet = { value: kit.pbrTex('hd_sertao/white_rough_plaster_cor') };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdPos;').replace('#include <project_vertex>', '#include <project_vertex>\nvHdPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos; uniform sampler2D hdDet;${kit.RUIDO_GLSL || ''}`).replace('#include <map_fragment>', `#include <map_fragment>
          { float hdPano = step(0.455, vMapUv.x) * step(vMapUv.y, 0.193); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
            float hdG = dot(texture2D(hdDet, hdQ / 1.1).rgb, vec3(0.3, 0.59, 0.11)) / 0.61;
            float hdF = smoothstep(0.2, 0.4, hdN(hdQ * 2.3 + 7.0) * 0.6 + hdN(hdQ * 9.0) * 0.4 + clamp(hdG, 0.0, 1.2) * 0.25);
            diffuseColor.rgb *= mix(0.86 * clamp(hdG, 0.75, 1.12), 0.8, hdPano); diffuseColor.a *= mix(mix(0.72, 1.0, hdF), 1.0, hdPano); }`); };
      matL.customProgramCacheKey = () => 'sertao-hd-letreiro4';
      const letras = new THREE.Mesh(gq, matL); letras.name = 'sertao-hd-letreiros'; letras.receiveShadow = true; letras.userData.nonSolidSurface = true; grupo.add(letras); lixo.push(gq, matL, tex);
      const placa = grupo.getObjectByName('sertao-hd-placa-letras');
      if (placa) { const m2 = matL.clone(); m2.map = placa.material.map; m2.onBeforeCompile = matL.onBeforeCompile; m2.customProgramCacheKey = matL.customProgramCacheKey; placa.material = m2; lixo.push(m2); }
    }
    let matCal = null, matTelha = null; scene.traverse((o) => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!matCal && m?.map?.name === 'oeste-adobe-paupique' && m.color?.getHex() === 0xf6efdd) matCal = m; if (!matTelha && m?.userData?.hdLaje) matTelha = m; } });
    for (const [o, m, nome] of [[pl, matCal, 'matriz'], [tl, matTelha, 'matriz-telha']]) { const g = o.geo(); lixo.push(g); if (!g.index.count) continue;
      const malha = new THREE.Mesh(g, m || matLiso); malha.name = `sertao-hd-${nome}`; malha.castShadow = true; malha.receiveShadow = true; malha.userData.nonSolidSurface = true; grupo.add(malha); }
    // Tinta a óleo queimada de sol sobre a tábua: o veio clareia a cor e a lasca miúda mostra a madeira, mais no pé.
    const matTinta = new THREE.MeshStandardMaterial({ color: 0xffffff, map: mapa, normalMap: mat.normalMap, vertexColors: true, roughness: .8, name: 'hd-cen-tinta' }); matTinta.normalScale.set(2.2, 2.2); lixo.push(matTinta);
    // Madeira crua e pintada dividem o mesmo programa: só o uniforme hdTinta muda.
    if (mapa) for (const [m, tinta] of [[mat, 0], [matTinta, 1]]) { m.onBeforeCompile = (sh) => { sh.uniforms.hdTinta = { value: tinta };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdPos;').replace('#include <project_vertex>', '#include <project_vertex>\nvHdPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos; uniform float hdTinta;${kit.RUIDO_GLSL || ''}`).replace('#include <map_fragment>', '').replace('#include <color_fragment>', `
        if (hdTinta > 0.5) { vec3 hdTx = texture2D(map, vMapUv).rgb, hdL = vec3(0.3, 0.59, 0.11); float hdV = clamp(dot(hdTx, hdL) / max(dot(texture2D(map, vMapUv, 9.0).rgb, hdL), 0.01), 0.3, 1.8);
          vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdPe = 1.0 - smoothstep(0.04, 0.5, vHdPos.y);
          float hdLasca = smoothstep(0.55, 0.62, hdN(hdQ * vec2(23.0, 11.0)) * 0.5 + hdN(hdQ * vec2(61.0, 33.0)) * 0.3 + (1.0 - hdV) * 0.32 + hdPe * 0.34);
          vec3 hdNua = mix(vec3(dot(hdTx, hdL)), hdTx, 0.45) * 2.3;
          vec3 hdPint = vColor * mix(0.78, 1.12, hdV - 0.3) * mix(0.82, 1.1, hdN(vec2(hdQ.x * 27.0, hdQ.y * 0.8)));
          diffuseColor.rgb = mix(hdPint, hdNua, hdLasca) * mix(0.74, 1.0, smoothstep(0.0, 0.35, vHdPos.y)); } else {
          #include <map_fragment>
          #include <color_fragment>
        }`); };
      m.customProgramCacheKey = () => 'sertao-hd-tinta3'; }
    for (const [geos, m, nome] of [[liso.geos(), matLiso, 'barro'], [of.geos(), mat, 'cerca'], [pin.geos(), matTinta, 'tinta']]) for (const g of geos) { lixo.push(g); if (!g.index.count) continue;
      const malha = new THREE.Mesh(g, m); malha.name = `sertao-hd-${nome}`; malha.receiveShadow = true; malha.userData.nonSolidSurface = true; grupo.add(malha); }
  }

  if (opts.flora !== false) {
    if (opts.arvoreGrande !== false) {
      // Árvore de primeiro plano da vista da praça (GLB do juazeiro, que já é um esqueleto seco): tronco fora de bounds, copa acima dos telhados.
      const molde = placeProp('sertao_juazeiro', { targetH: 1 }), fontes = [];
      if (molde) { molde.updateMatrixWorld(true); molde.traverse((m) => { if (m.isMesh) fontes.push(m); }); }
      if (fontes.length === 1 && !Array.isArray(fontes[0].material)) { const f = fontes[0], [x, z, h, ry] = opts.arvoreGrande?.pos ?? [B.minX - 5.6, -31, 15, 1.9];
        // Galho de 1 px contra o sol cintilava: incha ~5 cm ao longo da normal (o tronco nem nota).
        const mg = f.material.clone(), incha = (opts.arvoreGrande?.incha ?? .05) / (h * 1.1 * (f.matrixWorld.getMaxScaleOnAxis() || 1));
        mg.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(objectNormal) * ${incha.toFixed(6)};`); };
        mg.customProgramCacheKey = () => `sertao-hd-arvore-${incha.toFixed(6)}`; lixo.push(mg);
        const grande = new THREE.Mesh(f.geometry, mg); obj.position.set(x, -.15, z); obj.rotation.set(0, ry, 0); obj.scale.set(h * 1.25, h, h * 1.25); obj.updateMatrix();
        grande.matrixAutoUpdate = false; grande.matrix.multiplyMatrices(obj.matrix, f.matrixWorld); grande.name = 'sertao-hd-arvore-grande'; grande.castShadow = true; grande.receiveShadow = true; grupo.add(grande); }
    }
    let matCacto = null; scene.traverse((o) => { if (!matCacto && o.isMesh && o.name === 'cacto-ramos') matCacto = o.material; });
    if (matCacto) { const tmp = new THREE.Group(), gm = mandacaruSertao(tmp, matCacto, 1, 1).geometry;
      const lugares = [[42.6, 8, 1.45], [-2, 54, 1.35], ...(opts.mandacarusPerto === false ? [] : [
        [-35.6, -9, 1.5], [36.3, 3, 1.6], [-20, 48.8, 1.45], [-7.7, -49.4, 2.1], [9.3, -48.7, 1.85]])];
      const im = lote(gm, matCacto, lugares.length, 'mandacarus');
      lugares.forEach(([x, z, s], i) => { obj.position.set(x, terreno(x, z) - .05, z); obj.rotation.set(0, i * 2.4, 0); obj.scale.setScalar(s); obj.updateMatrix(); im.setMatrixAt(i, obj.matrix); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      // Flor branca na ponta dos braços mais altos (a posição sai dos vértices do próprio mandacaru).
      const pg = gm.attributes.position, pontas = [];
      for (let i = 0; i < pg.count; i++) { const x = pg.getX(i), y = pg.getY(i), z = pg.getZ(i), q = pontas.find((t) => Math.hypot(t[0] - x, t[2] - z) < .28); if (!q) pontas.push([x, y, z]); else if (y > q[1]) { q[0] = x; q[1] = y; q[2] = z; } }
      pontas.sort((a, b) => b[1] - a[1]); const tp = pontas.filter((t) => t[1] > pontas[0][1] * .6).slice(0, 3);
      if (tp.length && opts.objetos !== false) { const fl = oficina(), M4 = new THREE.Matrix4(), a = new THREE.Vector3(), b = new THREE.Vector3();
        lugares.forEach(([, , e], i) => { im.getMatrixAt(i, M4); for (const [x, y, z] of tp) { a.set(x, y - .01, z).applyMatrix4(M4); b.set(x + .02, y + .07, z).applyMatrix4(M4);
          fl.cilindro(a, b, .02 * e, .075 * e, 6, [2.3, 2.25, 2.0], { tampas: false }); fl.cilindro(a, a.clone().lerp(b, .6), .012 * e, .02 * e, 4, [2.2, 1.7, .4]); } });
        const gf = fl.geo(), mf = new THREE.Mesh(gf, matLiso); mf.name = 'sertao-hd-flores'; mf.userData.nonSolidSurface = true; grupo.add(mf); lixo.push(gf); } }
    const gp = pedraGeo(1, 23, .3), lugares = [[-39.2, -28.5, 1.5], [-40.6, -29.6, .8], [-38.6, -33.4, .6], [-40, 2, 1.1], [-41.4, 3.1, .6], [-39.5, 21, .9], [39.6, -15, 1.3], [40.9, -13.6, .7], [40, 34, 1.0],
      [41, 35.6, .55], [-16, -52.6, 1.2], [-17.6, -53.4, .65], [20, 52.4, 1.4], [18.2, 53.3, .7], [-34, 53, .9], [36, -53, 1.1]];
    const im = lote(gp, matPedra, lugares.length, 'pedras-grandes'); lixo.push(gp);
    lugares.forEach(([x, z, r], i) => { obj.position.set(x, terreno(x, z) + r * .22, z); obj.rotation.set(rnd() * .4, rnd() * 6.283, rnd() * .4); obj.scale.set(r * (.9 + rnd() * .5), r * (.55 + rnd() * .3), r * (.9 + rnd() * .4)); obj.updateMatrix();
      const v = .17 + rnd() * .1; im.setMatrixAt(i, obj.matrix); im.setColorAt(i, cor.setRGB(v * 1.08, v * .95, v * .84)); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
  }

  if (opts.capela !== false) {
    // Outeiro com a mesma terra do chão (UV casada com o plano de 1200 m) e a matriz no alto, logo depois do limite norte.
    const [cx, cz, H, R] = opts.capela?.pos ?? [-24, -56.5, 2.2, 10.5], solo = scene.getObjectByName('sertao-solo');
    const topo = (r, ang) => H * (1 - suave(4.5, R, r)) * (1 + .12 * Math.sin(ang * 3 + 1) * suave(4.5, 14, r)) - .35;
    if (solo?.material) { const P = [], U = [], I = [], AN = 9, SE = 28;
      for (let j = 0; j <= AN; j++) for (let i = 0; i <= SE; i++) { const r = j / AN * R, ang = i / SE * Math.PI * 2, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
        P.push(x, Math.max(terreno(x, z) - .3, topo(r, ang)), z); U.push((x + 600) / 1200, (600 - z) / 1200); }
      for (let j = 0; j < AN; j++) for (let i = 0; i < SE; i++) { const a = j * (SE + 1) + i, b = a + SE + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
      const outeiro = new THREE.Mesh(g, solo.material); outeiro.name = 'sertao-hd-outeiro'; outeiro.receiveShadow = true; grupo.add(outeiro); lixo.push(g); }
    const alvo = { x: cx, y: topo(0, 0) - .1, z: cz, targetH: opts.capela?.altura ?? 19, ry: opts.capela?.ry ?? .36 }, capela = opts.matriz !== false && opts.cerca !== false ? null : placeProp('igrejinha', alvo) || placeProp('sertao_capelinha', alvo);
    if (capela) { capela.name = 'sertao-hd-capelinha'; capela.traverse((m) => { if (m.isMesh) m.castShadow = false; }); grupo.add(capela); }
  }

  if (opts.serra !== false) {
    // Serra em malha: três anéis de crista, cada um mais dentro da névoa. O far da câmera é 400 m, então o último fica em ~330 m.
    const aneis = opts.serra?.aneis ?? [[176, 9, 21, .16, 31], [252, 15, 31, .34, 57], [326, 22, 45, .52, 83]];
    const SEG = 100, perfil = [[-50, -.05], [-30, .2], [-15, .6], [-5, .9], [0, 1], [22, .4]], P = [], NV = [], AL = [], I = [];
    const onda = (semente, n) => { const r = rngDe(semente), v = Array.from({ length: n }, () => r()); return (t) => { const u = ((t % 1) + 1) % 1 * n, i = Math.floor(u), f = u - i, s = f * f * (3 - 2 * f); return v[i % n] * (1 - s) + v[(i + 1) % n] * s; }; };
    for (const [raio, h0, h1, nev, sem] of aneis) {
      const o1 = onda(sem, 7), o2 = onda(sem + 1, 19), o3 = onda(sem + 2, 53), r1 = onda(sem + 3, 37), r2 = onda(sem + 4, 97), base = P.length / 3;
      for (let i = 0; i <= SEG; i++) { const t = i / SEG, ang = t * Math.PI * 2, crista = Math.pow(o1(t) * .58 + o2(t) * .29 + (1 - Math.abs(o3(t) * 2 - 1)) * .13, 1.5) * 1.45, h = h0 + (h1 - h0) * Math.min(1, crista);
        perfil.forEach(([recuo, fr], j) => { const meio = j > 0 && j < 3 ? 1 : 0, rr = raio + recuo + meio * ((r1(t + j * .013) - .5) * 20 + (r2(t) - .5) * 9), x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
          P.push(x, terreno(x, z) - 2.5 + h * fr * (1 + meio * (r2(t + .31) - .5) * .3), z); NV.push(nev); AL.push(Math.max(0, fr)); }); }
      const K = perfil.length; for (let i = 0; i < SEG; i++) for (let j = 0; j < K - 1; j++) { const a = base + i * K + j, b = a + K; I.push(a, a + 1, b, b, a + 1, b + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aNev', new THREE.Float32BufferAttribute(NV, 1));
    g.setAttribute('aAlt', new THREE.Float32BufferAttribute(AL, 1)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
    let sol = null; scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sol = o; });
    const dirSol = sol ? sol.position.clone().sub(sol.target.position).normalize() : new THREE.Vector3(-.84, .17, -.5);
    const mat = new THREE.ShaderMaterial({ fog: false, side: THREE.DoubleSide,
      uniforms: { uSol: { value: dirSol }, uNevoa: { value: new THREE.Color(scene.fog?.color?.getHex() ?? 0xd7a477) }, uRocha: { value: new THREE.Color(opts.serra?.rocha ?? 0x8a6a52) },
        uMato: { value: new THREE.Color(opts.serra?.mato ?? 0x4f5140) }, uLuz: { value: new THREE.Color(opts.serra?.luz ?? 0xffb070) }, uSombra: { value: new THREE.Color(opts.serra?.sombra ?? 0x6a6f8c) }, uBruma: { value: new THREE.Color(opts.serra?.bruma ?? 0xf6cf9c) } },
      vertexShader: `attribute float aNev, aAlt; varying vec3 vN, vP; varying float vNev, vAlt;
        void main(){ vN = normal; vP = position; vNev = aNev; vAlt = aAlt; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vN, vP; varying float vNev, vAlt; uniform vec3 uSol, uNevoa, uRocha, uMato, uLuz, uSombra, uBruma;${kit.RUIDO_GLSL || ''}
        void main(){ vec2 p = vP.xz; float m = hdN(p * 0.028 + vP.y * 0.06) * 0.5 + hdN(p * 0.09 + 3.0) * 0.3 + hdN(p * 0.31 + vP.y * 0.2) * 0.2;
          vec3 alb = mix(uRocha, uMato, smoothstep(0.36, 0.6, m)) * mix(0.72, 1.2, hdN(p * 0.7 + vP.y * 0.9));
          alb *= 1.0 - 0.3 * smoothstep(0.55, 0.9, hdN(vec2(atan(p.y, p.x) * 140.0, vP.y * 0.12)));
          vec3 n = normalize(vN); if (n.y < 0.0) n = -n;
          float l = max(dot(n, uSol), 0.0);
          vec3 c = alb * (uSombra * 0.55 + uLuz * l * 2.2);
          c = mix(c, uNevoa, clamp(vNev + (1.0 - vAlt) * 0.3, 0.0, 0.97));
          float lado = pow(max(dot(normalize(vP.xz - cameraPosition.xz), normalize(uSol.xz)), 0.0), 2.5);
          c = mix(c, uBruma, (1.0 - vAlt * 0.75) * ${(opts.serra?.brumaForca ?? .5).toFixed(3)} * (0.3 + 0.7 * lado));
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const malha = new THREE.Mesh(g, mat); malha.name = 'sertao-hd-serra'; malha.frustumCulled = false; malha.renderOrder = 900; grupo.add(malha); lixo.push(g, mat);
  }

  if (opts.anel !== false) {
    // Anel, disco e pano são do JOGO: ele recria os três a cada rodada e reescreve cor/opacidade por quadro.
    // O ajuste entra no shader (cor e símbolo do objetivo ficam intactos) e um relógio reaplica nos novos.
    const vistos = new Map(), jogo = typeof window !== 'undefined' ? window.__game : null, tempo = { value: 0 }, LUMA = 'vec3(0.3, 0.59, 0.11)';
    const pano = new THREE.PlaneGeometry(1.7, 1.05, 14, 8), faixa = new THREE.RingGeometry(.934, 1.066, 96, 1); faixa.translate(0, 0, .02); lixo.push(pano, faixa);
    const soloTex = kit.pbrTex('hd_sertao/dry_ground_rocks_cor', true), mundoXZ = (sh, extra = '') => { sh.uniforms.hdSolo = { value: soloTex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vHdW; varying vec2 vHdL;').replace('#include <project_vertex>', '#include <project_vertex>\nvHdW = (modelMatrix * vec4(transformed, 1.0)).xz * vec2(1.0, -1.0); vHdL = position.xy;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vHdW; varying vec2 vHdL; uniform sampler2D hdSolo;${extra}`); };
    const troca = (m, obc, chave) => { const s0 = { m, obc: m.onBeforeCompile, key: m.customProgramCacheKey }; m.dispose(); m.onBeforeCompile = obc; m.customProgramCacheKey = () => chave; m.needsUpdate = true; return s0; };
    const aplica = () => { for (const pt of jogo?.ctfPts || []) { const m = pt.ring?.material; if (!m || m.userData.hdCal || vistos.has(m)) continue;
      const s0 = { mats: [], anel: pt.ring, mat0: m, ageo: pt.ring.geometry, ro: pt.ring.renderOrder, rs: pt.ring.receiveShadow, flag: pt.flag, geo: pt.flag?.geometry, obr: pt.flag?.onBeforeRender, sombra: [pt.pole, pt.flag].filter((o) => o && !o.castShadow) }; vistos.set(m, s0);
      for (const o of s0.sombra) o.castShadow = true;
      // Faixa de cal gasta e íntegra: material iluminado (pega sombra como o chão); cor e opacidade seguem vindo do jogo.
      const cal = new THREE.MeshStandardMaterial({ color: m.color.clone(), transparent: true, opacity: m.opacity, depthWrite: false, roughness: 1, metalness: 0, side: THREE.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, name: 'hd-cen-anel' });
      cal.userData.hdCal = true; s0.cal = cal;
      cal.onBeforeCompile = (sh) => { mundoXZ(sh, kit.RUIDO_GLSL || ''); sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { float hdAng = atan(vHdL.y, vHdL.x), hdR = (length(vHdL) - 1.0) / 0.066;
          float hdT = dot(texture2D(hdSolo, vHdW / 4.0).rgb, ${LUMA}) / 0.0793, hdT3 = dot(texture2D(hdSolo, vHdW / 1.333 + 0.37).rgb, ${LUMA}) / 0.0793;
          float hdPinc = hdN(vec2(hdAng * 30.0, hdR * 1.6 + 3.0)) * 0.6 + hdN(vec2(hdAng * 110.0, hdR * 4.0)) * 0.4, hdGasto = hdN(vHdW * 1.3) * 0.6 + hdN(vHdW * 5.0 + 4.0) * 0.4;
          diffuseColor.rgb *= ${(opts.anel?.cal ?? 1.3).toFixed(3)} * vec3(1.02, 1.0, 0.96) * mix(0.84, 1.08, hdPinc) * mix(0.88, 1.06, hdGasto) * mix(1.0, clamp(hdT, 0.62, 1.3), 0.5) * mix(1.0, clamp(hdT3, 0.7, 1.25), 0.35);
          diffuseColor.rgb *= 1.0 - 0.14 * (1.0 - smoothstep(0.05, 0.13, abs(abs(hdR) - 0.58)));
          diffuseColor.a = mix(0.86, 1.0, diffuseColor.a) * (1.0 - smoothstep(0.8 + 0.14 * hdN(vec2(hdAng * 45.0, hdR + 2.0)), 1.0, abs(hdR))); }`); };
      cal.customProgramCacheKey = () => `sertao-hd-anel8-${opts.anel?.cal ?? 1.3}`;
      pt.ring.material = cal; pt.ring.geometry = faixa; pt.ring.renderOrder = 2; pt.ring.receiveShadow = true;
      if (pt.zone?.material) s0.mats.push(troca(pt.zone.material, (sh) => { mundoXZ(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { float hdT = dot(texture2D(hdSolo, vHdW / 4.0).rgb, ${LUMA}) / 0.0793, hdT3 = dot(texture2D(hdSolo, vHdW / 1.333 + 0.37).rgb, ${LUMA}) / 0.0793;
          diffuseColor.rgb *= mix(1.0, clamp(hdT, 0.45, 1.7), 0.6) * mix(1.0, clamp(hdT3, 0.5, 1.6), 0.45); diffuseColor.a *= ${(opts.anel?.disco ?? .5).toFixed(3)}; }`); }, `sertao-hd-disco3-${opts.anel?.disco ?? .5}`));
      if (pt.flag?.material && opts.pano !== false) { pt.flag.geometry = pano; pt.flag.onBeforeRender = () => { tempo.value = performance.now() / 1000; };
        s0.mats.push(troca(pt.flag.material, (sh) => { sh.uniforms.hdT = tempo;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float hdT; varying float vHdDobra;').replace('#include <begin_vertex>', `#include <begin_vertex>
            { float hdU = uv.x, hdA = hdU * (0.04 + 0.13 * hdU), hdF = hdU * 7.0 - hdT * 4.6 + uv.y * 3.4 + modelMatrix[3].x;
              transformed.z += (sin(hdF) + 0.5 * sin(hdF * 1.7 + 1.3 - uv.y * 4.0)) * hdA;
              transformed.y += cos(hdF * 0.5) * 0.35 * hdA - hdU * hdU * (0.1 + 0.16 * uv.y);
              transformed.x -= hdU * hdU * 0.13;
              vHdDobra = (cos(hdF) + 0.85 * cos(hdF * 1.7 + 1.3 - uv.y * 4.0)) * smoothstep(0.0, 0.3, hdU); }`);
          // Pano: sombra da dobra, bainha e trama (some quando o fio fica menor que ~2 px); cor e emblema são do jogo.
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdDobra;')
            .replace('#include <color_fragment>', `#include <color_fragment>
            diffuseColor.rgb *= clamp(0.74 + 0.27 * vHdDobra * (gl_FrontFacing ? 1.0 : -1.0), 0.4, 1.0) * vec3(0.96, 0.92, 0.88);
            #ifdef USE_MAP
            { vec2 hdTr = vMapUv * vec2(64.0, 40.0); float hdFt = smoothstep(0.55, 0.2, max(fwidth(hdTr.x), fwidth(hdTr.y)));
              diffuseColor.rgb *= 1.0 - 0.2 * hdFt * (1.0 - (0.5 + 0.5 * sin(hdTr.x * 6.2832)) * (0.5 + 0.5 * sin(hdTr.y * 6.2832)));
              diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(0.0, 0.035, min(min(vMapUv.x, 1.0 - vMapUv.x), min(vMapUv.y, 1.0 - vMapUv.y)))) * (0.88 + 0.12 * vMapUv.y); }
            #endif`); }, 'sertao-hd-pano3')); } } };
    aplica(); const relogio = setInterval(aplica, 1500);
    desfaz.push(() => { clearInterval(relogio); for (const s0 of vistos.values()) { for (const t of s0.mats) { t.m.dispose(); t.m.onBeforeCompile = t.obc; t.m.customProgramCacheKey = t.key; t.m.needsUpdate = true; }
      s0.mat0.color.copy(s0.cal.color); s0.mat0.opacity = s0.cal.opacity; s0.anel.material = s0.mat0; s0.cal.dispose(); s0.anel.geometry = s0.ageo; s0.anel.renderOrder = s0.ro; s0.anel.receiveShadow = s0.rs;
      for (const o of s0.sombra) o.castShadow = false; if (s0.flag && opts.pano !== false) { s0.flag.geometry = s0.geo; s0.flag.onBeforeRender = s0.obr; } } });
  }

  return () => { while (desfaz.length) desfaz.pop()(); scene.remove(grupo); for (const d of lixo) d.dispose(); };
}
