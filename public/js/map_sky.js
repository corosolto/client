import * as THREE from 'three';
import { VERSION } from './version.js';

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
