// GERADO por tools/viewmodels/prep/vm-frame-calibra.mjs — não editar à mão.
// Enquadramento por ARMA, medido na câmera real do runtime em repouso.
// Referência: AK golden (public/models/viewmodels/coro/ak-hires.glb), fov 58.0,
// escala angular alvo 1.7091 de diagonal NDC por metro de arma,
// centro alvo [0.6079,-0.6608] no aspecto 3x2.
// Antes deste arquivo o enquadramento era só por FAMÍLIA: a família `ar` ia de
// 0,93× a 3,03× da escala do arsenal com um único ponto de câmera.
// Não fecharam pela geometria do próprio produto (asset, não enquadramento):
//   akm: nem junto ao plano near a silhueta cresce até o alvo

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
  mp5: { x: 0.5353, y: -0.192, z: -1.1902 },   // resíduo 1×
  uzi: { x: 0.4704, y: -0.454, z: -0.4408 },   // resíduo 1.008×
  p90: { x: 1.1982, y: -0.3167, z: -1.1862 },   // resíduo 1×
  pistol: { x: 0.4311, y: -0.1846, z: -0.6041 },   // resíduo 1.003×
  deagle: { x: 0.3491, y: -0.1072, z: -0.288 },   // resíduo 1.028×
  revolver38: { x: 0.5173, y: -0.3072, z: -0.4459 },   // resíduo 1.029×
  rem700: { x: -0.0336, y: -0.1904, z: -0.4498 },   // resíduo 0.941×
  g3sg1: { x: 0.0602, y: 0.0016, z: -0.1373 },   // resíduo 0.997×
  mosin: { x: 0.027, y: 0.098, z: -0.3095 },   // resíduo 0.977×
  svd: { x: -0.0852, y: -0.124, z: -0.4522 },   // resíduo 1.024×
  sks: { x: 0.1176, y: 0.0393, z: -0.3688 },   // resíduo 1×
  shotgun: { x: -0.0402, y: 0.0107, z: -0.1739 },   // resíduo 1.001×
  lmg: { x: -0.0614, y: 0.1574, z: -0.4962 },   // resíduo 0.999×
});
