import * as THREE from 'three';
import { VERSION } from './version.js';
import { LOOK } from './look.js';
import { makeAerialFog } from './bloom.js';

// Único caminho para céu fotográfico dos mapas. Os assets são panoramas 2:1;
// sem mapping equiretangular o Three trata a imagem como wallpaper preso à câmera.
export function setMapSky(scene, T, url, fallback = 0x9fb8cc) {
  scene.userData.skyUrl = url;   // a régua eval:look mede o céu USADO, não o declarado
  const fb = (T && T.sky) || (fallback && fallback.isTexture ? fallback : new THREE.Color(fallback));
  if (typeof document === 'undefined') { scene.background = fb; return fb; }
  const versionedUrl = `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(VERSION)}`;
  const tex = new THREE.TextureLoader().load(versionedUrl, undefined, undefined, () => {
    if (scene.background === tex) scene.background = fb;
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  scene.background = tex;
  return tex;
}

/* RC1 (plans/23): céu + névoa + sol + hemi de UM look só (look.js). O shadow do sol
   fica no builder do mapa — ele conhece os próprios limites. Devolve null nos mapas
   ainda não migrados, que seguem chamando setMapSky/makeAerialFog direto. */
export function applyLook(scene, T, mapId, { nofog = false } = {}) {
  const L = LOOK[mapId];
  if (!L) return null;
  setMapSky(scene, T, L.sky, L.horizonte);
  if (!nofog) scene.fog = makeAerialFog(mapId);
  const hemi = new THREE.HemisphereLight(L.hemi.ceu, L.hemi.chao, L.hemi.i);
  const sun = new THREE.DirectionalLight(L.sol.cor, L.sol.i);
  sun.position.set(L.sol.pos[0], L.sol.pos[1], L.sol.pos[2]);
  sun.castShadow = true;
  scene.add(hemi); scene.add(sun); scene.add(sun.target);
  buildHorizonte(scene, mapId);
  return { look: L, hemi, sun };
}

/* Mapa que declarar `horizonte3d` no look.js ganha morros/ilha/bruma. Vive em `scene`
   e nunca em `world.root`: é vista, não geometria de mapa. Régua: eval:mansao-beach. */
export function buildHorizonte(scene, mapId) {
  const L = LOOK[mapId], H = L && L.horizonte3d;
  if (!H) return null;
  const grupo = new THREE.Group();
  grupo.name = `HORIZONTE_${mapId}`;
  grupo.userData.horizonte = mapId;
  scene.add(grupo);
  const doHorizonte = new THREE.Color(L.horizonte ?? 0xb1aca5);

  /* Silhueta > detalhe: a 130-300 m a névoa come a textura e sobra o contorno; o
     icosaedro deformado evita a bolha lisa que o crítico reprovou na encosta. */
  const massa = (spec, semente) => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * 3.1 + semente) * Math.cos(z * 2.7 - semente) * 0.5 + Math.sin(y * 5.3 + z * 1.9) * 0.22;
      const k = 1 + n * 0.26;
      p.setXYZ(i, x * k, Math.max(0, y) * k, z * k);   // corta a metade de baixo: morro, não bola
    }
    geo.computeVertexNormals();
    const cor = new THREE.Color(spec.cor).lerp(doHorizonte, spec.mistura ?? 0.5);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cor, roughness: 1, metalness: 0, flatShading: true }));
    mesh.scale.set(spec.r, spec.h, spec.r * 0.78);
    mesh.position.set(Math.cos(spec.az) * spec.dist, -1.6, Math.sin(spec.az) * spec.dist);
    mesh.rotation.y = spec.az * 1.7;
    mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.userData.nonSolidSurface = true;
    return mesh;
  };

  (H.morros || []).forEach((spec, i) => {
    const m = massa(spec, i * 1.7 + 0.4);
    m.userData.horizonteFeature = 'morro';
    grupo.add(m);
  });
  (H.ilhas || []).forEach((spec, i) => {
    const ilha = new THREE.Group();
    ilha.position.set(Math.cos(spec.az) * spec.dist, 0, Math.sin(spec.az) * spec.dist);
    ilha.userData.horizonteFeature = 'ilha';
    const corpo = massa({ ...spec, az: 0, dist: 0 }, i * 2.9 + 1.1);
    corpo.position.set(0, -1.6, 0);
    ilha.add(corpo);
    // orla clara ao pé da ilha: sem ela a massa verde nasce direto da água e lê como mancha
    const orla = new THREE.Mesh(new THREE.CircleGeometry(spec.r * 1.16, 18),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.praia ?? 0xc0b49b).lerp(doHorizonte, spec.mistura ?? 0.5), roughness: 1 }));
    orla.rotation.x = -Math.PI / 2; orla.position.y = -0.72;
    orla.userData.nonSolidSurface = true;
    ilha.add(orla);
    grupo.add(ilha);
  });

  /* Bruma quente: anel encostado na linha do mar, opaco embaixo. É o que separa a
     camada distante da média; sem ela os morros do fundo colam nos do meio. */
  if (H.bruma) {
    const b = H.bruma;
    const geo = new THREE.CylinderGeometry(b.raio, b.raio, b.altura, 48, 1, true);
    const p = geo.attributes.position, cores = new Float32Array(p.count * 3);
    const cor = new THREE.Color(b.cor);
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + b.altura / 2) / b.altura;   // 0 embaixo, 1 em cima
      const k = 1 - t * 0.85;
      cores[i * 3] = cor.r * k; cores[i * 3 + 1] = cor.g * k; cores[i * 3 + 2] = cor.b * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: b.opacidade,
      depthWrite: false, side: THREE.BackSide, fog: false,
    }));
    mesh.position.y = b.y + b.altura / 2;
    mesh.renderOrder = -1;
    mesh.userData.horizonteFeature = 'bruma';
    mesh.userData.nonSolidSurface = true;
    grupo.add(mesh);
  }
  return grupo;
}
