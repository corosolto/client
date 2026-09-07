// UV em metros: a densidade de texel passa a depender do tamanho no mundo, não do
// tamanho da malha. Motivo, medições e limites em docs/maps/POLISH-CATALOGO-CONTINUIDADE.md.
import * as THREE from 'three';

export const TEXEL_ALVO = 128;

/* Metros por unidade de UV, por eixo: `repeat` não é quadrado em toda textura.
   `uvElevacao` marca a que precisa caber uma vez na altura. Ver o handoff. */
export function metrosPorUV(material, alvo = TEXEL_ALVO) {
  const map = material?.map, largura = map?.image?.width;
  if (!largura) return null;
  return {
    u: (largura * (map.repeat?.x || 1)) / alvo,
    v: ((map.image.height || largura) * (map.repeat?.y || 1)) / alvo,
    elevacao: !!material.userData?.uvElevacao,
  };
}

export const chaveUV = (mpu) => mpu ? `${mpu.u.toFixed(4)}:${mpu.v.toFixed(4)}:${mpu.elevacao ? 'e' : 't'}` : '0';

/* `pares` traz o vão em metros (u, v) de cada face de 4 vértices, na ordem da geometria. */
export function escalaUV(geo, pares, mpu) {
  const uv = geo.attributes?.uv;
  if (!mpu || !uv) return geo;
  for (let f = 0; f < pares.length; f++) {
    const [su, sv] = pares[f];
    for (let i = f * 4; i < f * 4 + 4 && i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * su / mpu.u, mpu.elevacao ? uv.getY(i) : uv.getY(i) * sv / mpu.v);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

/* Ordem das faces da BoxGeometry: +X, -X, +Y, -Y, +Z, -Z. */
export function caixaUV(geo, w, h, d, mpu) {
  return escalaUV(geo, [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], mpu);
}

export function planoUV(geo, w, h, mpu) {
  return escalaUV(geo, [[w, h]], mpu);
}

/* Disco: a UV do círculo cresce em torno do centro (0,5 / 0,5). */
export function discoUV(geo, r, mpu) {
  const uv = geo.attributes?.uv;
  if (!mpu || !uv) return geo;
  const k = 2 * r / mpu.u;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, .5 + (uv.getX(i) - .5) * k, .5 + (uv.getY(i) - .5) * k);
  uv.needsUpdate = true;
  return geo;
}

/* Cilindro: tronco primeiro (U dá a volta, V sobe), depois as tampas em disco. */
export function cilindroUV(geo, r, h, segments, mpu) {
  const uv = geo.attributes?.uv;
  if (!mpu || !uv) return geo;
  const nTronco = (segments + 1) * 2, kU = (2 * Math.PI * r) / mpu.u, kV = h / mpu.v, kT = 2 * r / mpu.u;
  for (let i = 0; i < uv.count; i++) {
    if (i < nTronco) uv.setXY(i, uv.getX(i) * kU, mpu.elevacao ? uv.getY(i) : uv.getY(i) * kV);
    else uv.setXY(i, .5 + (uv.getX(i) - .5) * kT, .5 + (uv.getY(i) - .5) * kT);
  }
  uv.needsUpdate = true;
  return geo;
}

/* Cone: mesma ideia do cilindro, com a circunferência da base como vão de U. */
export function coneUV(geo, r, h, segments, mpu) {
  const uv = geo.attributes?.uv;
  if (!mpu || !uv) return geo;
  const nTronco = (segments + 1) * 2, kU = (2 * Math.PI * r) / mpu.u, kV = h / mpu.v, kT = 2 * r / mpu.u;
  for (let i = 0; i < uv.count; i++) {
    if (i < nTronco) uv.setXY(i, uv.getX(i) * kU, mpu.elevacao ? uv.getY(i) : uv.getY(i) * kV);
    else uv.setXY(i, .5 + (uv.getX(i) - .5) * kT, .5 + (uv.getY(i) - .5) * kT);
  }
  uv.needsUpdate = true;
  return geo;
}

/* Esfera: U dá a volta no equador (2πr), V vai de polo a polo (πr). */
export function esferaUV(geo, r, mpu) {
  const uv = geo.attributes?.uv;
  if (!mpu || !uv) return geo;
  const kU = (2 * Math.PI * r) / mpu.u, kV = (Math.PI * r) / mpu.v;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * kU, mpu.elevacao ? uv.getY(i) : uv.getY(i) * kV);
  uv.needsUpdate = true;
  return geo;
}

/* Fábricas com cache, para o builder que quer só trocar boxGeo/planeGeo por estas. */
export function fabricasUV(cache = new Map(), alvo = TEXEL_ALVO) {
  const box = (w, h, d, material) => {
    const mpu = metrosPorUV(material, alvo), key = `b:${w}:${h}:${d}:${chaveUV(mpu)}`;
    if (!cache.has(key)) cache.set(key, caixaUV(new THREE.BoxGeometry(w, h, d), w, h, d, mpu));
    return cache.get(key);
  };
  const plano = (w, h, material) => {
    const mpu = metrosPorUV(material, alvo), key = `p:${w}:${h}:${chaveUV(mpu)}`;
    if (!cache.has(key)) cache.set(key, planoUV(new THREE.PlaneGeometry(w, h), w, h, mpu));
    return cache.get(key);
  };
  const disco = (r, seg, material) => {
    const mpu = metrosPorUV(material, alvo), key = `ci:${r}:${seg}:${chaveUV(mpu)}`;
    if (!cache.has(key)) cache.set(key, discoUV(new THREE.CircleGeometry(r, seg), r, mpu));
    return cache.get(key);
  };
  const cilindro = (r, h, seg, material) => {
    const mpu = metrosPorUV(material, alvo), key = `c:${r}:${h}:${seg}:${chaveUV(mpu)}`;
    if (!cache.has(key)) cache.set(key, cilindroUV(new THREE.CylinderGeometry(r, r, h, seg), r, h, seg, mpu));
    return cache.get(key);
  };
  return { box, plano, disco, cilindro, cache };
}
