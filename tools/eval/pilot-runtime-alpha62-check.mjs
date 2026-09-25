/* ==========================================================================
   pilot-runtime-alpha62-check.mjs — defeitos literais do crítico runtime alpha.62
   --------------------------------------------------------------------------
   PROCEDÊNCIA
     Laudo limpo: Programador conserva asa/placas atrás dos ombros e elo longo;
     Motoca traz telefone abaixo da M4; Designer conserva placa traseira, janela
     verde e leque que some em medium. Os antigos gates estavam verdes porque
     premiavam teclado horizontal e não mediam esses props.

   MUTAÇÕES REAIS
     --mutante=programador-legado, --mutante=motoca-telefone-baixo e
     --mutante=designer-props-legados abrem os GLBs preservados imediatamente
     antes do passe. Não alteram flags do resultado: reintroduzem a geometria.
   ========================================================================== */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const mutation = process.argv.find((value) => value.startsWith('--mutante='))?.split('=')[1] || '';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const failures = [];
const check = (ok, label, evidence) => {
  console.log(`${ok ? '✓' : '✗'} ${label}: ${evidence}`);
  if (!ok) failures.push(label);
};

const paths = {
  programador: mutation === 'programador-legado'
    ? 'tools/eval/asset-evidence/programador-virado/programador-alpha62-before.glb'
    : process.env.ALPHA62_PROGRAMADOR_ASSET || 'public/models/characters/programador-virado.glb',
  motoca: mutation === 'motoca-telefone-baixo'
    ? 'tools/eval/asset-evidence/motoca-cachorro-loko/motoca-alpha62-before.glb'
    : process.env.ALPHA62_MOTOCA_ASSET || 'public/models/characters/motoca-cachorro-loko.glb',
  designer: mutation === 'designer-props-legados'
    ? 'tools/eval/asset-evidence/designer-ux/designer-alpha62-before.glb'
    : process.env.ALPHA62_DESIGNER_ASSET || 'public/models/characters/designer-ux.glb',
};

const pointsFor = (document, names) => {
  const points = [];
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!names.has(primitive.getMaterial()?.getName())) continue;
    const positions = primitive.getAttribute('POSITION');
    if (!positions) continue;
    for (let index = 0; index < positions.getCount(); index++) points.push(positions.getElement(index, []));
  }
  return points;
};
const bounds = (points) => {
  if (!points.length) return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], span: [0, 0, 0] };
  const min = [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis])));
  const max = [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis])));
  return { min, max, span: max.map((value, axis) => value - min[axis]) };
};
const gap = (left, right) => {
  if (!left.length || !right.length) return Infinity;
  const a = bounds(left), b = bounds(right);
  return Math.hypot(...[0, 1, 2].map((axis) => Math.max(0, a.min[axis] - b.max[axis], b.min[axis] - a.max[axis])));
};
const materialMap = (document) => new Map(document.getRoot().listMaterials().map((material) => [material.getName(), material]));
const primitiveCount = (document, name) => document.getRoot().listMeshes()
  .flatMap((mesh) => mesh.listPrimitives())
  .filter((primitive) => primitive.getMaterial()?.getName() === name).length;
const triangleCount = (document, materialName, predicate) => {
  let count = 0;
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (primitive.getMaterial()?.getName() !== materialName) continue;
    const positions = primitive.getAttribute('POSITION'), indices = primitive.getIndices();
    if (!positions || !indices) continue;
    for (let index = 0; index < indices.getCount(); index += 3) {
      const vertices = [0, 1, 2].map((offset) => positions.getElement(indices.getScalar(index + offset), []));
      const center = [0, 1, 2].map((axis) => vertices.reduce((sum, point) => sum + point[axis], 0) / 3);
      if (predicate(center)) count++;
    }
  }
  return count;
};
const rigidPct = (document, names, jointName) => {
  const skin = document.getRoot().listSkins()[0];
  if (!skin) return 0;
  const jointIndex = skin.listJoints().findIndex((joint) => joint.getName() === jointName);
  if (jointIndex < 0) return 0;
  let total = 0, rigid = 0;
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!names.has(primitive.getMaterial()?.getName())) continue;
    const joints = primitive.getAttribute('JOINTS_0');
    const weights = primitive.getAttribute('WEIGHTS_0');
    if (!joints || !weights) return 0;
    for (let index = 0; index < weights.getCount(); index++) {
      const js = joints.getElement(index, []), ws = weights.getElement(index, []);
      const weight = ws.reduce((sum, value, slot) => sum + (js[slot] === jointIndex ? value : 0), 0);
      if (weight >= .999) rigid++;
      total++;
    }
  }
  return total ? rigid / total : 0;
};
const f = (value) => Number.isFinite(value) ? value.toFixed(3) : 'ausente';

// Programador: a régua anterior exigia literalmente teclado horizontal, logo premiava
// a asa vista no runtime. Aqui a orientação e o inventário são medidos na geometria.
const programador = await io.read(paths.programador);
const pMaterials = materialMap(programador);
const pForbidden = ['LAN_Mouse_Buttons', 'LAN_Cable', 'LAN_Cable_Visible', 'LAN_Beige'].filter((name) => pMaterials.has(name));
const shoulderWingFaces = triangleCount(programador, 'Material_1', ([x, y, z]) =>
  z < -.13 && y > 1.22 && y < 1.55 && Math.abs(x) > .11);
const keyboard = pointsFor(programador, new Set(['LAN_Keyboard_Shell', 'LAN_Keyboard_Keys']));
const keyboardMount = pointsFor(programador, new Set(['LAN_Keyboard_Mount']));
const kb = bounds(keyboard);
const mug = pointsFor(programador, new Set(['LAN_MugSteel', 'LAN_MugDark']));
const mugClip = pointsFor(programador, new Set(['LAN_Mug_BeltClip']));
const mugBounds = bounds(mug), clipBounds = bounds(mugClip);
const kbRigid = rigidPct(programador, new Set(['LAN_Keyboard_Shell', 'LAN_Keyboard_Keys', 'LAN_Keyboard_Mount']), 'Spine');
const clipRigid = rigidPct(programador, new Set(['LAN_Mug_BeltClip']), 'Hips');
check(!pForbidden.length && shoulderWingFaces === 0, 'A62-P1 lâminas/placas legadas foram apagadas causalmente',
  `${pForbidden.join(', ') || 'materiais legados ausentes'}; asa Material_1 ${shoulderWingFaces} faces`);
check(keyboard.length > 0 && kb.span[1] / kb.span[0] >= 1.60 && kb.span[0] <= .16 && kb.span[2] <= .05,
  'A62-P2 teclado único fica vertical e legível na mochila', `${f(kb.span[0])}×${f(kb.span[1])}×${f(kb.span[2])} m; altura/largura ${f(kb.span[1] / kb.span[0])}`);
check(keyboardMount.length > 0 && gap(keyboard, keyboardMount) <= .012 && kbRigid >= .999,
  'A62-P3 teclado toca suporte estreito rigidamente em Spine', `gap ${f(gap(keyboard, keyboardMount))} m; Spine ${(kbRigid * 100).toFixed(1)}%`);
check(mug.length > 0 && mugClip.length > 0 && mugBounds.max[0] <= .27 && clipBounds.span[0] <= .045 && gap(mug, mugClip) <= .012 && clipRigid >= .999,
  'A62-P4 caneca encosta no quadril por elo curto', `x externo ${f(mugBounds.max[0])}; elo X ${f(clipBounds.span[0])}; gap ${f(gap(mug, mugClip))}; Hips ${(clipRigid * 100).toFixed(1)}%`);

// Motoca: o capacete aprovado é congelado por inventário/bounds; só telefone e suporte
// podem mudar. O piso vertical vem da borda inferior necessária para ficar acima da M4.
const motoca = await io.read(paths.motoca);
const phone = pointsFor(motoca, new Set(['Motofrete_Phone']));
const phoneMount = pointsFor(motoca, new Set(['Motofrete_PhoneMount']));
const phoneBounds = bounds(phone), mountBounds = bounds(phoneMount);
const phoneRigid = rigidPct(motoca, new Set(['Motofrete_Phone', 'Motofrete_PhoneScreen', 'Motofrete_PhoneMount']), 'Spine02');
check(phone.length > 0 && phoneBounds.span[0] <= .075 && phoneBounds.span[1] <= .120 && phoneBounds.min[1] >= 1.280,
  'A62-M1 telefone reduzido sobe ao alto do peito', `${f(phoneBounds.span[0])}×${f(phoneBounds.span[1])} m; borda inferior ${f(phoneBounds.min[1])} m`);
check(phoneMount.length > 0 && mountBounds.min[1] >= 1.270 && phoneRigid >= .999,
  'A62-M2 suporte inteiro termina acima do corredor da M4', `borda inferior ${f(mountBounds.min[1])} m; Spine02 ${(phoneRigid * 100).toFixed(1)}%`);
const helmet = bounds(pointsFor(motoca, new Set(['CS_HARD_Motofrete_Helmet_FullFace'])));
const visor = bounds(pointsFor(motoca, new Set(['Motofrete_Visor_Smoke'])));
check(Math.abs(helmet.span[0] - .280) <= .002 && Math.abs(helmet.span[1] - .410) <= .002 && Math.abs(visor.span[0] - .2537) <= .002,
  'A62-M3 capacete full-face aprovado permanece congelado', `shell ${f(helmet.span[0])}×${f(helmet.span[1])}; visor ${f(visor.span[0])} m`);

// Designer: Material_1 era precisamente o conjunto traseiro cru deixado de propósito
// pelo acabamento v6. A ausência dele prova remoção, em vez de cobertura por outro prop.
const designer = await io.read(paths.designer);
const dMaterials = materialMap(designer);
const tablet = pointsFor(designer, new Set(['CS_UX_TABLET_SCREEN']));
check(!dMaterials.has('Material_1') && tablet.length > 0 && primitiveCount(designer, 'CS_UX_TABLET_SCREEN') === 1,
  'A62-D1 placa traseira removida e só um tablet permanece no quadril', `Material_1 ${dMaterials.has('Material_1') ? 'presente' : 'ausente'}; tablet ${primitiveCount(designer, 'CS_UX_TABLET_SCREEN')} primitive`);
const thermos = pointsFor(designer, new Set(['CS_UX_THERMOS_METAL']));
const pump = pointsFor(designer, new Set(['CS_UX_THERMOS_PUMP_BLACK']));
const metal = dMaterials.get('CS_UX_THERMOS_METAL');
const pumpMaterial = dMaterials.get('CS_UX_THERMOS_PUMP_BLACK');
const pumpColor = pumpMaterial?.getBaseColorFactor().slice(0, 3) || [1, 1, 1];
const pumpLuma = .2126 * pumpColor[0] + .7152 * pumpColor[1] + .0722 * pumpColor[2];
check(thermos.length > 0 && pump.length > 0 && metal?.getAlphaMode() === 'OPAQUE' && metal.getMetallicFactor() >= .70 && pumpLuma <= .03,
  'A62-D2 garrafa opaca/metálica tem tampa arredondada e bomba preta', `metal ${metal?.getMetallicFactor().toFixed(2) ?? 'ausente'}; alpha ${metal?.getAlphaMode() ?? 'ausente'}; bomba luma ${pumpLuma.toFixed(3)}`);
const fanNames = new Set(Array.from({ length: 9 }, (_, index) => `CS_UX_FAN_${index}`));
const fan = pointsFor(designer, fanNames), fanBounds = bounds(fan);
check(fan.length > 0 && fanBounds.span[0] >= .25 && fanBounds.span[1] >= .20 && fanBounds.max[0] >= .44 && fanBounds.min[0] >= .18,
  'A62-D3 leque ampliado sai da perna e sobrevive em medium', `${f(fanBounds.span[0])}×${f(fanBounds.span[1])} m; X ${f(fanBounds.min[0])}…${f(fanBounds.max[0])}`);
const thermosRigid = rigidPct(designer, new Set(['CS_UX_THERMOS_METAL', 'CS_UX_THERMOS_PUMP_BLACK']), 'Spine02');
const fanRigid = rigidPct(designer, fanNames, 'Hips');
check(thermosRigid >= .999 && fanRigid >= .999,
  'A62-D4 garrafa e leque usam sockets rígidos corretos', `Spine02 ${(thermosRigid * 100).toFixed(1)}%; Hips ${(fanRigid * 100).toFixed(1)}%`);

if (mutation) {
  if (!failures.length) {
    console.error(`MUTANTE PASSOU: ${mutation} não reintroduziu defeito mensurável.`);
    process.exit(1);
  }
  console.log(`mutante ${mutation} reprovado como esperado: ${failures.join(', ')}`);
  process.exit(1);
}
if (failures.length) process.exit(1);
console.log('PILOT-RUNTIME-ALPHA62 ✓ 3 GLBs no contrato causal do laudo limpo');
