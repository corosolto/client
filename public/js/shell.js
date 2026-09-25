import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* Contrato com tools/blender/build_lajes_shell.py: TEXCOORD_1 = lightmap, servida em
   arquivo irmão `<nome>_lm.webp`; glTF usa flipY=false e a lightmap à parte precisa igual. */
export async function loadShell(root, url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const shell = gltf.scene;
  const lm = await new THREE.TextureLoader().loadAsync(url.replace(/\.glb$/, '_lm.webp'));
  lm.flipY = false; lm.channel = 1; lm.colorSpace = THREE.SRGBColorSpace;
  shell.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      if (o.geometry.getAttribute('uv1')) { m.lightMap = lm; m.lightMapIntensity = 1; }
      m.needsUpdate = true;
    }
  });
  root.add(shell);
  return shell;
}
