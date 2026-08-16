/* O fundo editorial usa Brasília, o mesmo mundo inicial do menu. */
import * as THREE from 'three';
import { initTextures } from './textures.js';
import { buildBrasilia } from './map_brasilia.js';
import { criaRenderer } from './glcontext.js';

const canvas = document.getElementById('bg-canvas');
/* WebGL é decorativo nestas rotas; sem contexto, o conteúdo continua utilizável. */
const renderer = criaRenderer({ canvas, antialias: true }, { optional: true });
if (!renderer) {
  canvas && (canvas.style.display = 'none');   // sem tela preta boba no lugar do fundo
} else {
  startBackground(renderer);
}

function startBackground(activeRenderer) {
  activeRenderer.setSize(innerWidth, innerHeight);
  activeRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  activeRenderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  buildBrasilia(scene, initTextures());
  const cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
  let angle = Math.random() * 10, last = performance.now();
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    angle += dt * 0.06;
    cam.position.set(Math.sin(angle) * 34, 17 + Math.sin(angle * 0.6) * 4, Math.cos(angle) * 34);
    cam.lookAt(0, 1, 0);
    activeRenderer.render(scene, cam);
  }
  addEventListener('resize', () => {
    activeRenderer.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  });
  requestAnimationFrame(loop);
}
