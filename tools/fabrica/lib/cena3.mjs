// GLB da fábrica no three.js do node (sem textura: o loader pediria Image).
// Serve às medidas offline de contato — mesma hierarquia e mesmo skinning do runtime.
import fs from 'node:fs';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function carregarGlb(arquivo) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(new Uint8Array(fs.readFileSync(arquivo)));
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const e of doc.getRoot().listExtensionsUsed()) if (/webp/i.test(e.extensionName)) e.dispose();
  const b = await io.writeBinary(doc);
  return new Promise((ok, erro) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', ok, erro));
}

export function posar(gltf, clipe, fracao) {
  gltf.mixer ||= new THREE.AnimationMixer(gltf.scene);
  gltf.mixer.stopAllAction();
  const clip = gltf.animations.find((c) => c.name === clipe);
  if (!clip) throw new Error(`clipe ${clipe} ausente`);
  const a = gltf.mixer.clipAction(clip);
  a.reset().play();
  gltf.mixer.setTime(clip.duration * fracao);
  gltf.scene.updateMatrixWorld(true);
  return clip.duration;
}

export function camera(gltf) {
  let cam = null;
  gltf.scene.traverse((o) => { if (!cam && o.isCamera) cam = o; });
  return cam;
}

// Vértices skinados no espaço da câmera, por malha (amostra 1 a cada `passo`).
export function verticesNaCamera(gltf, filtro = () => true, passo = 3) {
  const cam = camera(gltf);
  const inv = cam.matrixWorld.clone().invert();
  const saida = [];
  const v = new THREE.Vector3();
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !filtro(o)) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += passo) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
      saida.push({ malha: o.name, p: v.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv), i });
    }
  });
  return saida;
}

export function projetar(gltf, p, aspecto = 1.5, vfov16 = null) {
  const cam = camera(gltf);
  const v0 = THREE.MathUtils.degToRad(vfov16 ?? cam.fov);
  const meiaH = Math.atan(Math.tan(v0 / 2) * (16 / 9));
  const tanV = Math.tan(meiaH) / aspecto;
  return { x: (p.x / -p.z) / Math.tan(meiaH), y: (p.y / -p.z) / tanV, frente: -p.z };
}
