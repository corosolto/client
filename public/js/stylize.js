// Pipeline estilizado (v0 — prova de conceito) — cel/posterize + CONTORNO, pós-processo
// PURO (não toca material de cena → reversível, zero risco). Espelha o bloom.js: faz patch
// em renderer.render, compõe por cena via EffectComposer. Ordem: RenderPass → [bloom] →
// OutputPass (tone map + sRGB) → CelEdge (opera na cor de tela final, último = renderToScreen).
// Liga com ?style=1. Contorno v0 é por luminância (Sobel); upgrade futuro = baseado em
// profundidade (linhas mais limpas, sem pegar textura de chão).
import * as THREE from 'three';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { focusSunShadow } from './bloom.js';

const CelEdgeShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    edgeThresh: { value: 0.16 },   // sensibilidade do contorno
    edgeStrength: { value: 0.95 },
    levels: { value: 7.0 },        // faixas de cor (cel). Maior = mais suave
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 resolution;
    uniform float edgeThresh; uniform float edgeStrength; uniform float levels;
    varying vec2 vUv;
    float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
    void main(){
      vec2 px = 1.0 / resolution;
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float tl = luma(texture2D(tDiffuse, vUv + px*vec2(-1.0,-1.0)).rgb);
      float  l = luma(texture2D(tDiffuse, vUv + px*vec2(-1.0, 0.0)).rgb);
      float bl = luma(texture2D(tDiffuse, vUv + px*vec2(-1.0, 1.0)).rgb);
      float tr = luma(texture2D(tDiffuse, vUv + px*vec2( 1.0,-1.0)).rgb);
      float  r = luma(texture2D(tDiffuse, vUv + px*vec2( 1.0, 0.0)).rgb);
      float br = luma(texture2D(tDiffuse, vUv + px*vec2( 1.0, 1.0)).rgb);
      float  t = luma(texture2D(tDiffuse, vUv + px*vec2( 0.0,-1.0)).rgb);
      float  b = luma(texture2D(tDiffuse, vUv + px*vec2( 0.0, 1.0)).rgb);
      float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
      float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
      float edge = sqrt(gx*gx + gy*gy);
      vec3 q = floor(c * levels + 0.5) / levels;   // posterize (cel)
      float e = smoothstep(edgeThresh, edgeThresh * 2.0, edge) * edgeStrength;
      vec3 outc = mix(q, vec3(0.04,0.04,0.06), e);  // linha escura no contorno
      gl_FragColor = vec4(outc, 1.0);
    }`,
};

export function enableStylize(renderer, opts = {}) {
  const bloom = opts.bloom !== false;
  const composers = new Map();
  const rawRender = renderer.render.bind(renderer);
  renderer.__postPatched = true;   // idem bloom.js: evita o overlay manual do game.js
  const patched = (scene, camera) => {
    const cp = forScene(scene, camera);
    renderer.render = rawRender;   // evita recursão (composer chama renderer.render nos quads)
    // mesma melhora de cm/texel do pipeline padrão (ver bloom.js): a ortho do sol segue o
    // jogador em vez de cobrir 120 m. ?shadowfocus=0 desliga nos dois caminhos.
    if (scene.userData.vmPass) focusSunShadow(scene, camera);
    cp.render();
    renderer.render = patched;
  };
  const forScene = (scene, camera) => {
    let cp = composers.get(scene);
    if (!cp) {
      cp = new EffectComposer(renderer);
      cp.setPixelRatio(renderer.getPixelRatio());
      cp.setSize(innerWidth, innerHeight);
      cp.addPass(new RenderPass(scene, camera));
      // viewmodel em cena própria (mesmo esquema do bloom.js): por cima do mundo, depth limpa
      if (scene.userData.vmPass) {
        const vmp = new RenderPass(scene.userData.vmPass.scene, scene.userData.vmPass.camera);
        vmp.clear = false; vmp.clearDepth = true;
        cp.addPass(vmp);
      }
      if (bloom) cp.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.45, 0.85));
      cp.addPass(new OutputPass());
      const cel = new ShaderPass(CelEdgeShader);
      cel.uniforms.resolution.value.set(innerWidth, innerHeight);
      cp.addPass(cel);   // último → renderToScreen automático
      cp._cel = cel;
      composers.set(scene, cp);
    } else if (cp._w !== innerWidth || cp._h !== innerHeight) {
      cp.setSize(innerWidth, innerHeight);
      cp._cel.uniforms.resolution.value.set(innerWidth, innerHeight);
      cp._w = innerWidth; cp._h = innerHeight;
    }
    return cp;
  };
  renderer.render = patched;
  return () => { renderer.render = rawRender; renderer.__postPatched = false; composers.clear(); };
}
