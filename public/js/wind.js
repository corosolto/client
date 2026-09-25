import * as THREE from 'three';

/* wind.js — vento (RC4 do plans/23): o peso é a MESMA matemática no JS (`ventoPeso`,
   lida pela régua eval:wind) e no chunk GLSL. A sombra não recebe o patch de propósito. */
export const uVentoTime = { value: 0 };
export const ventoPeso = (y, altRef) => Math.pow(Math.min(Math.max(y / altRef, 0), 1), 2);
export function updateVento(dt) { uVentoTime.value += dt; }

export function aplicaVento(mat, { amp = 0.05, freq = 1.3, altRef = 0.7, dir = [0.8, 0.6] } = {}) {
  mat.userData.vento = { amp, freq, altRef };   // a régua lê os parâmetros VIVOS, não a chamada
  const n = (x) => Number(x).toFixed(4);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uVentoTime = uVentoTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uVentoTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float ventoPeso = pow(clamp(transformed.y / ${n(altRef)}, 0.0, 1.0), 2.0);
  float ventoFase = modelMatrix[3].x * 1.7 + modelMatrix[3].z * 2.3;
  #ifdef USE_INSTANCING
    ventoFase += instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
  #endif
  transformed.xz += vec2(${n(dir[0])}, ${n(dir[1])}) * (sin(uVentoTime * ${n(freq)} + ventoFase + transformed.x * 0.5) * ${n(amp)} * ventoPeso);
}`);
  };
}
