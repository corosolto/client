/* ==========================================================================
   pilot-system-check.mjs — props rígidos do Programador e leitura da P90 do Doidinho
   --------------------------------------------------------------------------
   POR QUE EXISTE (BUG-46/47, laudo externo alpha.60)
     "a mesma caneca aparece agora na altura do quadril/coxa, também sem ponto de
     fixação visível"; "a P90 não existe nos pixels como P90".

   O QUE MEDE
     - abre os GLBs finais: props precisam ficar atrás do plano frontal e 100%
       pesados no socket Hips; declarar nome/parenting não basta;
     - mede a projeção longitudinal da arma no MESMO raio horizontal da câmera grip
       de capture-character-game.mjs. O piso é a projeção da M4 do Programador que o
       mesmo crítico aprovou, não um número inventado;
     - preserva os marcadores geométricos já existentes na P90 raw e o contato medido
       pelo caminho real em select_mount.json.

   MUTAÇÕES
     caneca-haste, caneca-longe, caneca-presilha-solta, teclado-solto, teclado-placa-clara,
     prop-peito, prop-solto, p90-blob, p90-sem-marcadores, p90-mao-fora.
   ========================================================================== */
import { existsSync, readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { byId, charWeapon } = await import('../../public/js/characters.js');
const { weaponCFG } = await import('../../public/js/weapons.js');

const mutationArg = process.argv.find((arg) => arg.startsWith('--mutante='));
const mutation = mutationArg ? mutationArg.slice('--mutante='.length) : '';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const failures = [];
const glbcharsSource = readFileSync('public/js/glbchars.js', 'utf8');
const check = (ok, label, evidence) => {
  console.log(`${ok ? '✓' : '✗'} ${label}: ${evidence}`);
  if (!ok) failures.push(label);
};

const programadorPath = mutation === 'legacy-props-reinserted'
  ? 'tools/eval/asset-evidence/programador-virado/programador-before-causal-cleanup.glb'
  : process.env.PILOT_PROGRAMADOR_ASSET || 'public/models/characters/programador-virado.glb';
const programador = await io.read(programadorPath);
const skin = programador.getRoot().listSkins()[0];
if (!skin) throw new Error('Programador sem skin; não sei medir socket rígido');
const joints = skin.listJoints();
const hipsIndex = joints.findIndex((joint) => joint.getName() === 'Hips');
if (hipsIndex < 0) throw new Error('Programador sem joint Hips');
const spineIndex = joints.findIndex((joint) => joint.getName() === 'Spine');
if (spineIndex < 0) throw new Error('Programador sem joint Spine');
const propMaterials = new Set([
  'LAN_MugSteel', 'LAN_MugDark', 'LAN_Mouse_Rev2',
  'LAN_Trackball_Red', 'LAN_Cable_Visible', 'LAN_Mouse_Buttons',
]);
const materialNames = new Set(programador.getRoot().listMaterials().map((material) => material.getName()));
const pointsForMaterials = (names) => {
  const points = [];
  for (const mesh of programador.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!names.has(primitive.getMaterial()?.getName())) continue;
    const positions = primitive.getAttribute('POSITION');
    if (!positions) continue;
    for (let index = 0; index < positions.getCount(); index++) points.push(positions.getElement(index, []));
  }
  return points;
};
const boundsGap = (left, right) => {
  if (!left.length || !right.length) return Infinity;
  const axisGap = (axis) => {
    const aMin = Math.min(...left.map((point) => point[axis]));
    const aMax = Math.max(...left.map((point) => point[axis]));
    const bMin = Math.min(...right.map((point) => point[axis]));
    const bMax = Math.max(...right.map((point) => point[axis]));
    return Math.max(0, aMin - bMax, bMin - aMax);
  };
  return Math.hypot(axisGap(0), axisGap(1), axisGap(2));
};
let propVertices = 0;
let propFrontMax = -Infinity;
let hipRigid = 0;
for (const mesh of programador.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  if (!propMaterials.has(primitive.getMaterial()?.getName())) continue;
  const positions = primitive.getAttribute('POSITION');
  const jointAttr = primitive.getAttribute('JOINTS_0');
  const weightAttr = primitive.getAttribute('WEIGHTS_0');
  if (!positions || !jointAttr || !weightAttr) throw new Error('prop do Programador sem posição/skin');
  for (let index = 0; index < positions.getCount(); index++) {
    const position = positions.getElement(index, []);
    if (primitive.getMaterial()?.getName() === 'LAN_Mouse_Buttons' && position[1] >= 1.12) continue;
    const vertexJoints = jointAttr.getElement(index, []);
    const weights = weightAttr.getElement(index, []);
    propFrontMax = Math.max(propFrontMax, position[2]); // glTF: +Z é frente do personagem.
    const hipWeight = weights.reduce((sum, weight, slot) => sum + (vertexJoints[slot] === hipsIndex ? weight : 0), 0);
    if (hipWeight >= .999) hipRigid++;
    propVertices++;
  }
}
if (!propVertices) throw new Error('inventário de caneca/mouse vazio');
if (mutation === 'prop-peito') propFrontMax += .25;
let hipRigidPct = hipRigid / propVertices;
if (mutation === 'prop-solto') hipRigidPct = 0;
check(charWeapon('programador-virado') === 'm4', 'PROPS1 M4 aprovada permanece canônica', charWeapon('programador-virado'));
const designerWeapon = mutation === 'designer-arma-trocada' ? 'p90' : charWeapon('designer-ux');
check(designerWeapon === 'm4', 'DESIGN1 Designer UX mantém a M4 canônica do slice', designerWeapon);

// Segunda fatia Nerdola. O laudo externo da v4 encontrou o defeito no caminho offline:
// props baixos estavam pesados nas coxas, enquanto a torre deveria permanecer Spine01.
// A régua lê o GLB servido e separa as famílias pelo vão real entre props (<1,0 m) e
// torre (>1,0 m); material compartilhado sozinho não prova socket.
const lendaEntry = mutation === 'lenda-sem-registro' ? null : byId('lenda-lanhouse');
const lendaWeapon = mutation === 'lenda-arma-trocada' ? 'p90' : charWeapon('lenda-lanhouse');
const lendaPath = mutation === 'lenda-props-upleg'
  ? 'references/nerdolas/lenda-lanhouse/3d/meshy-t2-v1/lenda-lanhouse-v3-final-opt.glb'
  : 'public/models/characters/lenda-lanhouse.glb';
check(lendaEntry?.team === 'N' && lendaEntry?.tribe === 'nerdolas',
  'LEND1 Lenda registrada como Nerdola', lendaEntry ? `${lendaEntry.team}/${lendaEntry.tribe}` : 'ausente');
check(lendaWeapon === 'm4', 'LEND2 Lenda mantém a M4 canônica do slice', lendaWeapon);
check(glbcharsSource.includes("'lenda-lanhouse'"), 'LEND3 Lenda usa o caminho GLB real',
  glbcharsSource.includes("'lenda-lanhouse'") ? 'presente em GLB_CHARS' : 'ausente em GLB_CHARS');
check(existsSync(lendaPath), 'LEND4 GLB canônico da Lenda existe', lendaPath);
if (existsSync(lendaPath)) {
  const lenda = await io.read(lendaPath);
  const lendaSkin = lenda.getRoot().listSkins()[0];
  if (!lendaSkin) throw new Error('Lenda sem skin; não sei medir sockets');
  const lendaJoints = lendaSkin.listJoints();
  const lendaJointIndex = new Map(lendaJoints.map((joint, index) => [joint.getName(), index]));
  const hips = lendaJointIndex.get('Hips');
  const spine01 = lendaJointIndex.get('Spine01');
  if (hips == null || spine01 == null) throw new Error('Lenda sem Hips/Spine01; não sei medir sockets');
  const canonical = (name) => name === 'CS_LAN_BEIGE_PLASTIC'
    || name === 'CS_LAN_DARK_PLASTIC' || name === 'CS_LAN_VENT_METAL'
    || name === 'CS_LAN_MOUSE_TRACKBALL' || name === 'CS_LAN_ETHERNET_BLUE'
    || name.startsWith('CS_LAN_TOKEN_');
  let lowTotal = 0, lowHips = 0, towerTotal = 0, towerSpine = 0;
  for (const mesh of lenda.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!canonical(primitive.getMaterial()?.getName() || '')) continue;
    const p = primitive.getAttribute('POSITION');
    const j = primitive.getAttribute('JOINTS_0');
    const w = primitive.getAttribute('WEIGHTS_0');
    if (!p || !j || !w) throw new Error('prop canônico da Lenda sem posição/skin');
    for (let index = 0; index < p.getCount(); index++) {
      const position = p.getElement(index, []);
      const jointsAtVertex = j.getElement(index, []);
      const weights = w.getElement(index, []);
      const weightOn = (joint) => weights.reduce((sum, value, slot) => sum + (jointsAtVertex[slot] === joint ? value : 0), 0);
      if (position[1] < 1.0) { lowTotal++; if (weightOn(hips) >= .999) lowHips++; }
      else { towerTotal++; if (weightOn(spine01) >= .999) towerSpine++; }
    }
  }
  const lowPct = lowTotal ? lowHips / lowTotal : 0;
  const towerPct = towerTotal ? towerSpine / towerTotal : 0;
  check(lowTotal > 0 && lowPct >= .999, 'LEND5 mouse/fichas/argola/cabos rigidamente em Hips',
    `${(lowPct * 100).toFixed(1)}% de ${lowTotal} vértices baixos`);
  check(towerTotal > 0 && towerPct >= .999, 'LEND6 torre permanece rigidamente em Spine01',
    `${(towerPct * 100).toFixed(1)}% de ${towerTotal} vértices altos`);
}
const lendaStates = ['idle','walk','run','shoot','death','crouch','crouchwalk','jump','idle1h','walk1h','walkfire'];
let lendaPresentStates = lendaStates.filter((state) => existsSync(`public/models/anims/lenda-lanhouse/${state}.glb`));
if (mutation === 'lenda-sem-clipe') lendaPresentStates = lendaPresentStates.filter((state) => state !== 'death');
check(lendaPresentStates.length === lendaStates.length, 'LEND7 pacote da Lenda contém todos os estados',
  `${lendaPresentStates.length}/${lendaStates.length}; faltam ${lendaStates.filter((state) => !lendaPresentStates.includes(state)).join(',') || 'nenhum'}`);
check(existsSync('public/models/anims/lenda-lanhouse.glb'), 'LEND8 pacote mesclado da Lenda existe',
  existsSync('public/models/anims/lenda-lanhouse.glb') ? 'presente' : 'ausente');

// Primeira expansão da TV depois da Câmera. O v2 foi aprovado offline com três
// mutantes causais; o gate de integração mantém essas propriedades ligadas ao GLB
// realmente servido, além de cobrar registry, arma e pacote completo.
const microEntry = mutation === 'microfonildo-sem-registro' ? null : byId('microfonildo');
const microWeapon = mutation === 'microfonildo-arma-trocada' ? 'p90' : charWeapon('microfonildo');
const microPath = mutation === 'microfonildo-corpo-liso'
  ? 'references/tv/microfonildo/3d/blender-v2/mutant-body-smooth-final-opt.glb'
  : mutation === 'microfonildo-silhueta-estreita'
    ? 'references/tv/microfonildo/3d/blender-v2/mutant-silhouette-narrow-final-opt.glb'
    : mutation === 'microfonildo-reels-aro'
      ? 'references/tv/microfonildo/3d/blender-v2/mutant-reels-rings-final-opt.glb'
      : 'public/models/characters/microfonildo.glb';
const microGlbRegistered = mutation === 'microfonildo-sem-glb'
  ? false : glbcharsSource.includes("'microfonildo'");
check(microEntry?.team === 'T' && microEntry?.tribe === 'tv',
  'MIC1 Microfonildo registrado na TV', microEntry ? `${microEntry.team}/${microEntry.tribe}` : 'ausente');
check(microWeapon === 'm4', 'MIC2 Microfonildo mantém a M4 canônica do slice', microWeapon);
check(microGlbRegistered, 'MIC3 Microfonildo usa o caminho GLB real',
  microGlbRegistered ? 'presente em GLB_CHARS' : 'ausente em GLB_CHARS');
check(existsSync(microPath), 'MIC4 GLB canônico do Microfonildo existe', microPath);
if (existsSync(microPath)) {
  const micro = await io.read(microPath);
  const microRoot = micro.getRoot();
  const microScene = microRoot.listScenes()[0];
  const worldPoints = [];
  const trianglesByMaterial = new Map();
  for (const mesh of microRoot.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    const material = primitive.getMaterial()?.getName() || '(sem material)';
    const count = primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0;
    trianglesByMaterial.set(material, (trianglesByMaterial.get(material) || 0) + Math.round(count / 3));
  }
  const visit = (node, parentMatrix = null) => {
    const local = node.getMatrix();
    const multiply = (a, b) => {
      const out = new Array(16).fill(0);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++)
        for (let k = 0; k < 4; k++) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
      return out;
    };
    const world = parentMatrix ? multiply(parentMatrix, local) : local;
    for (const primitive of node.getMesh()?.listPrimitives() || []) {
      const positions = primitive.getAttribute('POSITION');
      if (!positions) continue;
      for (let index = 0; index < positions.getCount(); index++) {
        const [x, y, z] = positions.getElement(index, []);
        worldPoints.push([
          world[0] * x + world[4] * y + world[8] * z + world[12],
          world[1] * x + world[5] * y + world[9] * z + world[13],
          world[2] * x + world[6] * y + world[10] * z + world[14],
        ]);
      }
    }
    for (const child of node.listChildren()) visit(child, world);
  };
  for (const child of microScene?.listChildren() || []) visit(child);
  const span = [0, 1, 2].map((axis) => Math.max(...worldPoints.map((p) => p[axis])) - Math.min(...worldPoints.map((p) => p[axis])));
  const furTriangles = trianglesByMaterial.get('MIC_FUR2') || 0;
  const cyanTriangles = trianglesByMaterial.get('MIC_CYAN') || 0;
  const magentaTriangles = trianglesByMaterial.get('MIC_MAGENTA') || 0;
  check(furTriangles >= 1500, 'MIC5 pelo angular contínuo sobrevive no GLB servido', `${furTriangles} tris MIC_FUR2 >= 1500`);
  check(span[0] / span[1] >= .72, 'MIC6 silhueta permanece baixa, larga e compacta', `largura/altura ${(span[0] / span[1]).toFixed(3)} >= 0,720`);
  check(cyanTriangles >= 2000 && magentaTriangles >= 1000, 'MIC7 reels continuam volumes reconhecíveis, não aros', `ciano ${cyanTriangles}; magenta ${magentaTriangles}`);
}
let microPresentStates = lendaStates.filter((state) => existsSync(`public/models/anims/microfonildo/${state}.glb`));
if (mutation === 'microfonildo-sem-clipe') microPresentStates = microPresentStates.filter((state) => state !== 'death');
check(microPresentStates.length === lendaStates.length, 'MIC8 pacote do Microfonildo contém todos os estados',
  `${microPresentStates.length}/${lendaStates.length}; faltam ${lendaStates.filter((state) => !microPresentStates.includes(state)).join(',') || 'nenhum'}`);
const microMerged = mutation === 'microfonildo-sem-mesclado' ? false : existsSync('public/models/anims/microfonildo.glb');
check(microMerged, 'MIC9 pacote mesclado do Microfonildo existe', microMerged ? 'presente' : 'ausente');
check(propFrontMax <= .05, 'PROPS2 caneca/mouse fora do plano frontal do peito', `z frontal máximo ${propFrontMax.toFixed(3)} m <= 0,050 m`);
check(hipRigidPct >= .999, 'PROPS3 caneca/mouse rigidamente presos ao socket Hips', `${(hipRigidPct * 100).toFixed(1)}% de ${propVertices} vértices`);

// O terceiro laudo limpo encontrou dois defeitos que PROPS2/3 premiavam: a
// caneca podia estar 100% em Hips mas longe do corpo, ligada por uma haste longa,
// e o teclado podia manter uma placa clara solta. O passe final troca os dois por
// componentes nomeados, curtos e em contato geométrico com o prop que sustentam.
const mugPoints = pointsForMaterials(new Set(['LAN_MugSteel', 'LAN_MugDark']));
const clipPoints = pointsForMaterials(new Set(['LAN_Mug_BeltClip']));
const keyboardPoints = pointsForMaterials(new Set(['LAN_Keyboard_Shell', 'LAN_Keyboard_Keys']));
const keyboardMountPoints = pointsForMaterials(new Set(['LAN_Keyboard_Mount']));
const rigidPctForMaterials = (names, jointIndex) => {
  let total = 0, rigid = 0;
  for (const mesh of programador.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (!names.has(primitive.getMaterial()?.getName())) continue;
    const jointsAttr = primitive.getAttribute('JOINTS_0');
    const weightsAttr = primitive.getAttribute('WEIGHTS_0');
    if (!jointsAttr || !weightsAttr) return 0;
    for (let index = 0; index < weightsAttr.getCount(); index++) {
      const vertexJoints = jointsAttr.getElement(index, []);
      const weights = weightsAttr.getElement(index, []);
      const weight = weights.reduce((sum, value, slot) => sum + (vertexJoints[slot] === jointIndex ? value : 0), 0);
      if (weight >= .999) rigid++;
      total++;
    }
  }
  return total ? rigid / total : 0;
};
let mugOuterX = mugPoints.length ? Math.max(...mugPoints.map((point) => point[0])) : Infinity;
let mugClipGap = boundsGap(mugPoints, clipPoints);
let keyboardMountGap = boundsGap(keyboardPoints, keyboardMountPoints);
let clipRigidPct = rigidPctForMaterials(new Set(['LAN_Mug_BeltClip']), hipsIndex);
let keyboardRigidPct = rigidPctForMaterials(new Set(['LAN_Keyboard_Shell', 'LAN_Keyboard_Keys', 'LAN_Keyboard_Mount']), spineIndex);
let legacyCable = materialNames.has('LAN_Cable_Visible');
let legacyKeyboardPlate = materialNames.has('LAN_Beige') || materialNames.has('LAN_Cable');
if (mutation === 'caneca-longe') mugOuterX += .10;
if (mutation === 'caneca-haste') legacyCable = true;
if (mutation === 'caneca-presilha-solta') clipRigidPct = 0;
if (mutation === 'teclado-solto') { keyboardMountGap = .08; keyboardRigidPct = 0; }
if (mutation === 'teclado-placa-clara') legacyKeyboardPlate = true;
check(!legacyCable && materialNames.has('LAN_Mug_BeltClip'),
  'PROPS4 caneca sem haste diagonal e com presilha curta declarada',
  `LAN_Cable_Visible ${legacyCable ? 'presente' : 'ausente'}; BeltClip ${materialNames.has('LAN_Mug_BeltClip') ? 'presente' : 'ausente'}`);
check(mugOuterX <= .31 && mugClipGap <= .012 && clipRigidPct >= .999,
  'PROPS5 caneca encosta no quadril pela presilha, sem flutuar lateralmente',
  `x externo ${mugOuterX.toFixed(3)} m <= 0,310; contato ${mugClipGap.toFixed(3)} m <= 0,012; Hips ${(clipRigidPct * 100).toFixed(1)}%`);
check(!legacyKeyboardPlate && materialNames.has('LAN_Keyboard_Shell') && materialNames.has('LAN_Keyboard_Keys'),
  'PROPS6 teclado não conserva placa clara/triangular legada',
  `legado ${legacyKeyboardPlate ? 'presente' : 'ausente'}; shell/keys canônicos`);
check(materialNames.has('LAN_Keyboard_Mount') && keyboardMountGap <= .012 && keyboardRigidPct >= .999,
  'PROPS7 teclado tem suporte em contato com o dorso/mochila',
  `contato teclado↔mount ${keyboardMountGap.toFixed(3)} m <= 0,012; Spine ${(keyboardRigidPct * 100).toFixed(1)}%`);
const keyboardWidth = keyboardPoints.length ? Math.max(...keyboardPoints.map((point) => point[0])) - Math.min(...keyboardPoints.map((point) => point[0])) : 0;
const keyboardHeight = keyboardPoints.length ? Math.max(...keyboardPoints.map((point) => point[1])) - Math.min(...keyboardPoints.map((point) => point[1])) : Infinity;
const keyboardDepth = keyboardPoints.length ? Math.max(...keyboardPoints.map((point) => point[2])) - Math.min(...keyboardPoints.map((point) => point[2])) : Infinity;
const legacyLooseProps = ['LAN_Mouse_Rev2', 'LAN_Trackball_Red', 'LAN_Cable_Visible'].filter((name) => materialNames.has(name));
check(keyboardHeight / keyboardWidth >= 1.6 && keyboardWidth <= .16 && keyboardDepth <= .06 && !legacyLooseProps.length,
  'PROPS8 só restam teclado vertical no dorso e caneca em presilha curta',
  `teclado ${keyboardWidth.toFixed(3)}×${keyboardHeight.toFixed(3)}×${keyboardDepth.toFixed(3)} m; legado ${legacyLooseProps.join(',') || 'ausente'}`);

const p90 = await io.read('public/models/weapons/p90.glb');
const position = p90.getRoot().listMeshes()[0]?.listPrimitives()[0]?.getAttribute('POSITION');
if (!position) throw new Error('P90 sem malha; não sei medir marcadores');
const points = Array.from({ length: position.getCount() }, (_, index) => position.getElement(index, []));
const spanX = (subset) => subset.length ? Math.max(...subset.map((point) => point[0])) - Math.min(...subset.map((point) => point[0])) : 0;
let topSpan = spanX(points.filter((point) => point[1] >= .10));
let lowerSpan = spanX(points.filter((point) => point[1] <= -.08));
if (mutation === 'p90-sem-marcadores') { topSpan *= .2; lowerSpan *= .2; }
check(topSpan >= .28, 'P90-1 carregador/trilho superior preserva eixo horizontal', `span raw ${topSpan.toFixed(3)} m >= 0,280 m`);
check(lowerSpan >= .80, 'P90-2 corpo bullpup e arcos inferiores preservam silhueta', `span raw ${lowerSpan.toFixed(3)} m >= 0,800 m`);

const glbchars = glbcharsSource;
const yawBlock = glbchars.match(/const TP_CHAR_CARRY_YAW = new Map\(\[([\s\S]*?)\]\);/)?.[1] || '';
const charYaw = yawBlock.match(/\['doidinho-bairro',\s*(-?[\d.]+)\]/)?.[1];
let doidinhoYaw = charYaw == null ? 4 : Number(charYaw);
if (mutation === 'p90-blob') doidinhoYaw = 4;
// Câmera grip: x=0,48/z=1,65 em relação ao personagem, no capturador real.
const cameraYaw = Math.atan2(.48, 1.65) * 180 / Math.PI;
const projected = weaponCFG('p90').len * Math.sin(Math.abs(doidinhoYaw - cameraYaw) * Math.PI / 180);
const reference = weaponCFG('m4').len * Math.sin(Math.abs(4 - cameraYaw) * Math.PI / 180);
check(projected >= reference, 'P90-3 perfil projetado iguala a M4 aprovada no mesmo frame', `${projected.toFixed(3)} m >= referência M4 ${reference.toFixed(3)} m (yaw ${doidinhoYaw.toFixed(1)}°)`);

const mount = JSON.parse(readFileSync('tools/eval/select_mount.json', 'utf8'));
const doidinhoMount = mount.personagens.find((entry) => entry.id === 'doidinho-bairro');
if (!doidinhoMount) throw new Error('select_mount.json sem Doidinho; ausência de medição é vermelho');
const handDistance = mutation === 'p90-mao-fora' ? .15 : doidinhoMount.dMaoL;
check(charWeapon('doidinho-bairro') === 'p90', 'P90-4 ID canônico continua P90', charWeapon('doidinho-bairro'));
check(handDistance <= .02 && doidinhoMount.gripCurl >= .5, 'P90-5 mão dianteira alcança o arco/guarda-mão', `dMaoL ${handDistance.toFixed(3)} m; curl ${doidinhoMount.gripCurl.toFixed(2)} rad`);

// O crítico limpo seguinte aprovou P90/rig/roupa, mas o chuveiro/medidor creme
// virou um disco branco chapado no ombro. Mede cor E projeção do prop final.
const doidinho = await io.read('public/models/characters/doidinho-bairro.glb');
const doidinhoMaterials = new Map(doidinho.getRoot().listMaterials().map((material) => [material.getName(), material]));
const meterBody = doidinhoMaterials.get('Gambiarra_MeterBody_Teal');
const meterFace = doidinhoMaterials.get('Gambiarra_MeterFace_Copper');
const meterSelector = doidinhoMaterials.get('Gambiarra_MeterSelector_Color');
const color3 = (material) => material?.getBaseColorFactor().slice(0, 3) || [1, 1, 1];
let bodyColor = color3(meterBody), faceColor = color3(meterFace);
if (mutation === 'doidinho-disco-branco') bodyColor = faceColor = [.9, .9, .9];
const luma = (color) => .2126 * color[0] + .7152 * color[1] + .0722 * color[2];
const chroma = (color) => Math.max(...color) - Math.min(...color);
const propPoints = [];
for (const mesh of doidinho.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  if (!/^Gambiarra_(?:Shower|Meter)/.test(primitive.getMaterial()?.getName() || '')) continue;
  const positions = primitive.getAttribute('POSITION');
  for (let index = 0; index < positions.getCount(); index++) propPoints.push(positions.getElement(index, []));
}
if (!propPoints.length) throw new Error('Doidinho sem geometria Gambiarra');
const propMin = [0, 1, 2].map((axis) => Math.min(...propPoints.map((point) => point[axis])));
const propMax = [0, 1, 2].map((axis) => Math.max(...propPoints.map((point) => point[axis])));
let propWidth = propMax[0] - propMin[0], propHeight = propMax[1] - propMin[1];
let propCenterX = (propMin[0] + propMax[0]) / 2, propFront = propMax[2];
if (mutation === 'doidinho-prop-ombro') { propWidth += .12; propCenterX += .12; propFront += .10; }
check(meterBody && luma(bodyColor) <= .25 && chroma(bodyColor) >= .08,
  'DPROP1 corpo teal não lê como disco branco', `luma ${luma(bodyColor).toFixed(3)}; chroma ${chroma(bodyColor).toFixed(3)}`);
check(meterFace && luma(faceColor) <= .45 && chroma(faceColor) >= .15,
  'DPROP2 aro cobre separa o mostrador da carcaça', `luma ${luma(faceColor).toFixed(3)}; chroma ${chroma(faceColor).toFixed(3)}`);
check(meterSelector && chroma(color3(meterSelector)) >= .35,
  'DPROP3 seletor colorido sobrevive no medidor', `chroma ${chroma(color3(meterSelector)).toFixed(3)}`);
check(propWidth <= .14 && propHeight <= .28 && propCenterX <= .10 && propFront <= .02,
  'DPROP4 prop reduzido fica na mochila, fora de ombro/arma', `${propWidth.toFixed(3)}×${propHeight.toFixed(3)} m; centroX ${propCenterX.toFixed(3)}; frenteZ ${propFront.toFixed(3)}`);

let mutacaoCega = false;
if (mutation) {
  if (!failures.length) {
    console.error(`MUTANTE PASSOU: ${mutation} não acendeu nenhuma cláusula.`);
    mutacaoCega = true;
  } else {
    console.log(`mutante ${mutation} reprovado como esperado: ${failures.join(', ')}`);
  }
}
process.exit(mutacaoCega || failures.length ? 1 : 0);
console.log('PILOT-SYSTEM ✓ pilotos preservados + Microfonildo TV/M4/11 clipes/identidade');
