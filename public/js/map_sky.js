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
  return { look: L, hemi, sun };
}
