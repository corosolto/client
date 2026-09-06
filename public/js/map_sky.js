import * as THREE from 'three';
import { VERSION } from './version.js';
import { LOOK } from './look.js';
import { makeAerialFog } from './bloom.js';

// Único caminho para céu fotográfico dos mapas. Os assets são panoramas 2:1;
// sem mapping equiretangular o Three trata a imagem como wallpaper preso à câmera.
export function setMapSky(scene, T, url, fallback = 0x9fb8cc) {
  scene.userData.skySource = { kind: 'webp', url };
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

function setProceduralSky(scene, L) {
  const cfg = L.sky;
  if (cfg.kind !== 'procedural' || cfg.model !== 'dry-afternoon') throw new Error('Modelo de céu desconhecido');
  const width = 1024, height = 512;
  const data = new Uint8Array(width * height * 4);
  const horizon = new THREE.Color(L.horizonte), zenith = new THREE.Color(L.zenite);
  const glow = new THREE.Color(cfg.halo);
  const sunDir = new THREE.Vector3(...L.sol.pos).normalize();
  const color = new THREE.Color();
  const longitudeSun = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const longitude = (x / (width - 1) - .5) * Math.PI * 2;
    longitudeSun[x] = Math.cos(longitude) * sunDir.x + Math.sin(longitude) * sunDir.z;
  }
  const srgb = new Uint8Array(4097);
  for (let i = 0; i < srgb.length; i++) {
    color.setRGB(i / 4096, 0, 0).convertLinearToSRGB();
    srgb[i] = Math.round(color.r * 255);
  }
  const smooth = t => t * t * (3 - 2 * t);
  for (let y = 0; y < height; y++) {
    const latitude = (y / (height - 1) - .5) * Math.PI;
    const up = Math.sin(latitude), radius = Math.cos(latitude);
    const altitude = Math.max(0, (up - cfg.horizonHold) / (1 - cfg.horizonHold));
    const blend = smooth(Math.min(1, altitude ** cfg.curve));
    color.copy(horizon).lerp(zenith, blend);
    const r = color.r, g = color.g, b = color.b;
    for (let x = 0; x < width; x++) {
      const towardSun = radius * longitudeSun[x] + up * sunDir.y;
      const halo = cfg.haloStrength * Math.exp((towardSun - 1) * cfg.haloFocus) * blend * (1 - blend);
      const i = (y * width + x) * 4;
      data[i] = srgb[Math.round((r + (glow.r - r) * halo) * 4096)];
      data[i + 1] = srgb[Math.round((g + (glow.g - g) * halo) * 4096)];
      data[i + 2] = srgb[Math.round((b + (glow.b - b) * halo) * 4096)];
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, width, height);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.wrapS = THREE.RepeatWrapping;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  scene.background = tex;
  delete scene.userData.skyUrl;
  scene.userData.skySource = { kind: 'procedural', model: cfg.model };
  return tex;
}

/* RC1 (plans/23): céu + névoa + sol + hemi de UM look só (look.js). O shadow do sol
   fica no builder do mapa — ele conhece os próprios limites. Devolve null nos mapas
   ainda não migrados, que seguem chamando setMapSky/makeAerialFog direto. */
export function applyLook(scene, T, mapId, { nofog = false } = {}) {
  const L = LOOK[mapId];
  if (!L) return null;
  if (typeof L.sky === 'string') setMapSky(scene, T, L.sky, L.horizonte);
  else setProceduralSky(scene, L);
  if (!nofog) scene.fog = makeAerialFog(mapId);
  const hemi = new THREE.HemisphereLight(L.hemi.ceu, L.hemi.chao, L.hemi.i);
  const sun = new THREE.DirectionalLight(L.sol.cor, L.sol.i);
  sun.position.set(L.sol.pos[0], L.sol.pos[1], L.sol.pos[2]);
  sun.castShadow = true;
  scene.add(hemi); scene.add(sun); scene.add(sun.target);
  return { look: L, hemi, sun };
}
