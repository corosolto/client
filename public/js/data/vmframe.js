// GERADO por tools/viewmodels/prep/vm-frame-calibra.mjs — não editar à mão.
// Enquadramento por ARMA, medido na câmera real do runtime em repouso.
// Referência: AK golden (public/models/viewmodels/coro/ak-hires.glb), fov 58.0,
// escala angular alvo 1.7091 de diagonal NDC por metro de arma,
// centro alvo [0.6079,-0.6608] no aspecto 3x2.
// Antes deste arquivo o enquadramento era só por FAMÍLIA: a família `ar` ia de
// 0,93× a 3,03× da escala do arsenal com um único ponto de câmera.

export const VM_FRAME = Object.freeze({
  m4: { x: 0.0198, y: 0.061, z: -0.1649 },   // resíduo 0.946×
  md97: { x: 0.0008, y: 0.1243, z: -0.068 },   // resíduo 0.971×
  scar: { x: -0.0615, y: 0.0721, z: -0.1984 },   // resíduo 0.938×
  famas: { x: 0.0755, y: 0.0731, z: -0.1424 },   // resíduo 0.979×
  carbine: { x: -0.0399, y: 0.1605, z: -0.219 },   // resíduo 0.954×
  tavor: { x: 0.1037, y: 0.0315, z: -0.2007 },   // resíduo 0.978×
  m92: { x: 0.1461, y: -0.1409, z: -0.1648 },   // resíduo 1.007×
  g3: { x: -0.1648, y: 0.0001, z: -0.2159 },   // resíduo 0.975×
  m400: { x: -0.1503, y: 0.0934, z: -0.3929 },   // resíduo 0.973×
  awp: { x: -0.4166, y: 0.3686, z: -0.3296 },   // resíduo 0.974×
  uzi: { x: 0.4704, y: -0.454, z: -0.4408 },   // resíduo 1.008×
});
