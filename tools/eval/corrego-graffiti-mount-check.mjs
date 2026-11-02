// Contrato SURVEY4 (31/10, Ego 32p2): nenhuma arte repetida — o pixo do Córrego é
// único, 1 aplicação física. Contrato e limites: docs/visual-consistency/CORREGO-ARTE-UNICA.md.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2), option = name => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const quality = option('quality') || 'med';
assert.ok(['med', 'low'].includes(quality));
globalThis.localStorage = { getItem: () => JSON.stringify({ quality }) };
const { THREE, MAPS, initTextures, seedRandom } = await import('./harness.mjs');
const { preloadPropGeometry } = await import('./prop-geometry-fixture.mjs');
const { COMMON_MAP_PROPS } = await import('../../public/js/mapprops.js');
const { criarSuporteGrafite, superficieGrafitavel } = await import('../../public/js/graffiti_surface.js');
const { retanguloGrafiteDesenhado } = await import('../../public/js/graffiti_pass.js');
const { measureGraffitiArea } = await import('./graffiti-area-audit.mjs');
const diagnoseArea = new Function(`return (${measureGraffitiArea.toString().replace(
  'obstacles.push({ polygon: penetrated, depth }); penetration = true;',
  `obstacles.push({ polygon: penetrated, depth }); penetration = true;
   if (globalThis.__mountPenetration.length < 256) globalThis.__mountPenetration.push({
     mesh: mesh.name, geometry: geometry.type, instance: mesh.isInstancedMesh ? instance : null,
     vertices: [v0.toArray(), v1.toArray(), v2.toArray()], normal: normal.toArray(),
     clippedArea: Math.abs(polygonArea(penetrated)), eligible,
     ancestry: (() => { const names=[]; for(let node=mesh;node;node=node.parent) names.push(node.name); return names; })()
   });`)});`)();
const path = '/img/textures/corrego_streetart_pixo.webp';
const CONTRACT = { side: 1, z: -28, y: 5.2, w: 6, h: 3.6 };
// Centros do contrato antigo (4 painéis/clones da mesma arte) — legado e mutantes.
const LEGACY = [[1, -28], [-1, 24], [1, 8], [-1, -12]];
const UV_MAX = 1.002;   // limiar compartilhado com graffiti-curation-measure.mjs:161 (uv-repetido)
const asset = readFileSync(new URL(`../../public${path}`, import.meta.url));
assert.ok(asset.length > 1000 && asset.toString('ascii', 0, 4) === 'RIFF' && asset.toString('ascii', 8, 12) === 'WEBP');
const props = [...new Set([...COMMON_MAP_PROPS, ...MAPS.corrego.props])];
await preloadPropGeometry(props);
const loader = THREE.TextureLoader.prototype.load;
let pixoTexture;
THREE.TextureLoader.prototype.load = function (...args) {
  const texture = loader.apply(this, args); texture.userData.mountFixturePath = String(args[0]);
  if (String(args[0]) === path) pixoTexture = texture;
  return texture;
};
const build = builder => { seedRandom(12345); const world = builder(new THREE.Scene(), initTextures()); world.root.updateMatrixWorld(true); return world; };
// Inventário inclui DoubleSide e opacity0 que escreve RGB; measure() julga o formato.
// NormalBlending opaco equivale a NoBlending; contrato em CORREGO-ARTE-UNICA.md.
const RGB_VISIBLE = material => material.opacity > 0 || material.blending === THREE.NoBlending
  || (material.blending === THREE.NormalBlending && material.transparent === false);
const applicationMaterial = mesh => {
  if (!(mesh.layers.mask & 1)) return null;
  for (let node = mesh; node; node = node.parent) if (!node.visible) return null;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.find(material => material?.map?.userData.mountFixturePath === path
    && material.visible !== false && material.colorWrite !== false && RGB_VISIBLE(material)) || null;
};
const potentialApplications = root => {
  const result = [];
  root.traverse(mesh => { const material = mesh.isMesh && applicationMaterial(mesh); if (material) result.push({ mesh, material }); });
  return result;
};
const artMeshes = root => potentialApplications(root)
  .filter(({ mesh, material }) => !mesh.isInstancedMesh && material.side === THREE.FrontSide && material.opacity > 0)
  .map(({ mesh }) => mesh);
// Identidade de conteúdo: span UV da geometria × |repeat| da textura VIVA do mundo construído.
// Fail-closed (CRÍTICO R1 P2-3): canal ≠0, matriz UV manual, rotação ou centro próprios são
// formato desconhecido → Infinity; repeat/offset não finito idem (crítico R4 P2-2).
const uvCoverage = mesh => {
  const uv = mesh.geometry.attributes.uv, map = mesh.material?.map;
  if (!uv || !map) return [Infinity, Infinity];
  if (map.channel !== 0 || !map.matrixAutoUpdate || map.rotation !== 0 || map.center.x !== 0 || map.center.y !== 0
    || ![map.repeat.x, map.repeat.y, map.offset.x, map.offset.y].every(Number.isFinite))
    return [Infinity, Infinity];
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    uMin = Math.min(uMin, uv.getX(i)); uMax = Math.max(uMax, uv.getX(i));
    vMin = Math.min(vMin, uv.getY(i)); vMax = Math.max(vMax, uv.getY(i));
  }
  return [(uMax - uMin) * Math.abs(map.repeat.x), (vMax - vMin) * Math.abs(map.repeat.y)];
};
// Quad UV canônico do PlaneGeometry 4-vértice (CRÍTICO R2 P2-2): exigir as 4 correspondências
// rejeita dobra/sobreposição dentro de 0–1 sem relaxar o limiar 1.002 da cobertura.
const UV_CANONICAL = [[0, 1], [1, 1], [0, 0], [1, 0]];
const uvCanonical = mesh => {
  const uv = mesh.geometry.attributes.uv;
  if (!uv || uv.count !== 4) return false;
  for (let i = 0; i < 4; i++)
    if (Math.abs(uv.getX(i) - UV_CANONICAL[i][0]) > 1e-6 || Math.abs(uv.getY(i) - UV_CANONICAL[i][1]) > 1e-6) return false;
  return true;
};
const drawnOnce = mesh => { const [u, v] = uvCoverage(mesh); return { u, v, once: u > 1e-6 && u <= UV_MAX && v > 1e-6 && v <= UV_MAX }; };
function boxFaces(mesh) {
  const { width, height, depth } = mesh.geometry.parameters;
  assert.equal(width, .05); assert.equal(height, 4.6); assert.equal(depth, 6);
  return [-1, 1].map(side => {
    const local = new THREE.Matrix4().makeRotationY(side * Math.PI / 2);
    local.setPosition(side * width / 2, 0, 0);
    const geometry = new THREE.PlaneGeometry(depth, height);
    const piece = retanguloGrafiteDesenhado(geometry, mesh.matrixWorld.clone().multiply(local));
    geometry.dispose(); assert.ok(piece); return piece;
  });
}
function firstHits(root, piece) {
  const meshes = []; root.traverse(mesh => {
    if (!mesh.isMesh || !(mesh.layers.mask & 1)) return;
    for (let ancestor = mesh; ancestor; ancestor = ancestor.parent)
      if (!ancestor.visible || /^(decal:|mural:)/.test(ancestor.name)) return;
    meshes.push(mesh);
  });
  const nx = Math.sin(piece.ry), nz = Math.cos(piece.ry), ux = Math.cos(piece.ry), uz = -Math.sin(piece.ry);
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(-nx, 0, -nz), hits = [];
  ray.far = .07;
  for (const u of [-.49, -.245, 0, .245, .49]) for (const v of [-.49, -.245, 0, .245, .49]) {
    ray.set(new THREE.Vector3(piece.x + ux * u * piece.w + nx * .02, piece.y + v * piece.h, piece.z + uz * u * piece.w + nz * .02), direction);
    const hit = ray.intersectObjects(meshes, false).find(hit => {
      const material = Array.isArray(hit.object.material) ? hit.object.material[hit.face.materialIndex] : hit.object.material;
      return material?.visible !== false && material?.colorWrite !== false && material?.opacity > 0;
    });
    if (!hit) { hits.push({ supported: false, reason: 'no-hit' }); continue; }
    const matrix = hit.object.matrixWorld.clone();
    if (hit.object.isInstancedMesh) { const instance = new THREE.Matrix4(); hit.object.getMatrixAt(hit.instanceId, instance); matrix.multiply(instance); }
    const normal = hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(matrix)).normalize();
    const alignment = -normal.dot(direction), depth = hit.distance - .02;
    const externalWall = Math.abs(Math.abs(hit.point.x) - 23.75) < 1e-5;
    hits.push({ supported: superficieGrafitavel(hit.object) && alignment >= .98 && depth >= -.001 && depth <= .05 && externalWall,
      point: hit.point.toArray(), normal: normal.toArray(), depth, alignment, externalWall,
      mesh: hit.object.name, geometry: hit.object.geometry.type, instance: hit.instanceId });
  }
  return { supported: hits.every(hit => hit.supported), samples: hits.length, hits };
}
const nominalPiece = () => ({ x: CONTRACT.side * 23.738, y: CONTRACT.y, z: CONTRACT.z,
  ry: -CONTRACT.side * Math.PI / 2, w: CONTRACT.w, h: CONTRACT.h });
async function measure(world, label, { lenient = false } = {}) {
  const candidates = potentialApplications(world.root);
  for (const { mesh, material } of candidates) {
    assert.ok(!mesh.isInstancedMesh,
      `${label}: InstancedMesh não é formato suportado — fail-closed, contrato é Mesh simples de 1 painel (CRÍTICO R1 P2-2)`);
    assert.ok(material.side === THREE.FrontSide,
      `${label}: side=${material.side} não é formato suportado — DoubleSide/BackSide são candidatas do inventário potencial, mas o contrato só aceita FrontSide (CRÍTICO R2 P2-1)`);
    assert.ok(material.opacity > 0,
      `${label}: opacity=${material.opacity} não é formato suportado — opacity 0 que escreve RGB (NoBlending, ou NormalBlending+transparent=false convertido em NoBlending pelo renderer) é candidata do inventário, não formato do contrato (CRÍTICO R3 P2-1)`);
  }
  if (!lenient) assert.equal(candidates.length, 1,
    `${label}: contrato é 1 aplicação da arte única; achei ${candidates.length} (centros: ${candidates.map(c => c.mesh.position.toArray().map(n => n.toFixed(2)).join(',')).join(' | ')})`);
  const entries = candidates.map(({ mesh }) => ({ mesh, parent: mesh.parent, matrix: mesh.matrixWorld.clone() }));
  for (const { mesh, parent } of entries) parent.remove(mesh);
  world.root.updateMatrixWorld(true);
  const support = criarSuporteGrafite(world.root), pieces = [];
  try {
    const nominal = nominalPiece();
    for (const { mesh, matrix } of entries) {
      mesh.matrixWorld.copy(matrix);
      const onContract = Math.abs(mesh.position.x - nominal.x) < 1e-8 && Math.abs(mesh.position.y - nominal.y) < 1e-8
        && Math.abs(mesh.position.z - nominal.z) < 1e-8;
      const drawn = mesh.geometry.type === 'PlaneGeometry' ? [retanguloGrafiteDesenhado(mesh.geometry, matrix)] : boxFaces(mesh);
      assert.ok(drawn.every(Boolean));
      const uv = drawnOnce(mesh);
      const uvCanonica = mesh.geometry.type === 'PlaneGeometry' ? uvCanonical(mesh) : true;
      const det = matrix.determinant();
      const normalMundo = new THREE.Vector3(0, 0, 1).applyMatrix3(new THREE.Matrix3().getNormalMatrix(matrix)).normalize();
      const orientacao = det > 1e-9 && normalMundo.dot(new THREE.Vector3(-CONTRACT.side, 0, 0)) >= .98;
      const nominalArea = await measureGraffitiArea(world.root, nominal, THREE, superficieGrafitavel);
      const faces = [];
      for (const piece of drawn) {
        const area = await measureGraffitiArea(world.root, piece, THREE, superficieGrafitavel), first = firstHits(world.root, piece);
        globalThis.__mountPenetration = [];
        if (!area.supported) await diagnoseArea(world.root, piece, THREE, superficieGrafitavel);
        faces.push({ piece, production: support(piece), independent: area, firstHits: first, penetrationTriangles: globalThis.__mountPenetration });
      }
      const transformFits = onContract && drawn.length === 1
        && Math.abs(drawn[0].x - nominal.x) < 1e-8 && Math.abs(drawn[0].y - nominal.y) < 1e-8 && Math.abs(drawn[0].z - nominal.z) < 1e-8
        && Math.abs(drawn[0].w - nominal.w) < 1e-6 && Math.abs(drawn[0].h - nominal.h) < 1e-6
        && Math.abs(Math.sin(drawn[0].ry - nominal.ry)) < 1e-8;
      pieces.push({ center: mesh.position.toArray(), geometry: mesh.geometry.type, nominal, onContract, uv, uvCanonica,
        orientacao: { ok: orientacao, det, normal: normalMundo.toArray() },
        nominalProduction: support(nominal), nominalIndependent: nominalArea, transformFits, faces,
        mounted: transformFits && orientacao && uv.once && uvCanonica && support(nominal) && nominalArea.supported
          && faces.every(face => face.production && face.independent.supported && face.firstHits.supported) });
      if (!lenient && !pieces.at(-1).mounted) assert.fail(`${label}: painel contrato [${CONTRACT.side}, z ${CONTRACT.z}] não montou — uvOnce=${uv.once} (${uv.u.toFixed(3)}x${uv.v.toFixed(3)}) uvCanonica=${uvCanonica} orientacao=${orientacao}(det=${det.toFixed(3)},normal=${normalMundo.toArray().map(n => n.toFixed(2)).join(',')}) transformFits=${transformFits}`);
    }
  } finally { for (const { mesh, parent } of entries) parent.add(mesh); world.root.updateMatrixWorld(true); }
  return { label, applications: candidates.length, pieces: pieces.length,
    mounted: pieces.filter(piece => piece.mounted).length, details: pieces };
}

const current = build(MAPS.corrego.build), report = { gate: 'corrego-art-mount', quality, propsLoaded: props.length,
  texture: { path, bytes: asset.length, sha256: createHash('sha256').update(asset).digest('hex') }, nodeGeometryOnly: true };
assert.ok(pixoTexture, 'real pixo texture loader was invoked');
const applications = potentialApplications(current.root);
console.log(JSON.stringify({ phase: 'built', potentialApplications: applications.length,
  centers: applications.map(a => a.mesh.position.toArray().map(n => n.toFixed(2))),
  acceptedFormat: artMeshes(current.root).length,
  uv: applications.map(a => drawnOnce(a.mesh)), namedPanels: current.root.children.filter(mesh => mesh.name.includes('corrego_streetart')).map(mesh => ({ name: mesh.name, provenance: mesh.material?.map?.userData })) }));
if (applications.length === 1) report.current = await measure(current, 'current');
else report.current = { label: 'current', applications: applications.length, mounted: 0,
  reason: applications.length === 0 ? 'art-missing: nenhuma aplicação potencial do pixo sobreviveu ao build'
    : `art-repeated: mesma arte aplicada ${applications.length}x — contrato é 1 aplicação` };
if (option('out')) writeFileSync(option('out'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ phase: 'mount-measured', current: report.current.mounted, detail: report.current.details?.map(piece => ({ center: piece.center, uv: piece.uv,
  onContract: piece.onContract, production: piece.nominalProduction, independent: piece.nominalIndependent,
  firstFailure: piece.faces?.[0]?.firstHits.hits.find(hit => !hit.supported) })) }));
if (option('baseline-ref')) {
  const mapURL = new URL('../../public/js/map_corrego.js', import.meta.url);
  const source = execFileSync('git', ['show', `${option('baseline-ref')}:public/js/map_corrego.js`], { encoding: 'utf8' });
  assert.ok(source.includes('addBox(0.05, 4.6, 6.0, TEX.pixo, x, 1.4, z'), 'ref do baseline tem que ser o produtor histórico de 4 caixas');
  const resolved = source.replace(/(\bfrom\s*)(['"])([^'"\n]+)\2/g, (_full, prefix, _quote, specifier) =>
    prefix + JSON.stringify(specifier.startsWith('.') ? new URL(specifier, mapURL).href : import.meta.resolve(specifier)));
  const previous = await import(`data:text/javascript,${encodeURIComponent(resolved)}`);
  const baselineWorld = build(previous.buildCorrego);
  report.baseline = await measure(baselineWorld, option('baseline-ref'), { lenient: true });
  report.baseline.artRepeated = artMeshes(baselineWorld.root).length > 1 || report.baseline.details.some(piece => !piece.uv.once);
  assert.ok(report.baseline.details.length >= 1, 'baseline tem que emitir pelo menos 1 caixa para auditar');
  assert.equal(report.baseline.mounted, 0, 'baseline histórico (4 caixas inválidas) continua reprovado pelo contrato novo');
  assert.ok(report.baseline.artRepeated, 'baseline repete a arte (4 caixas da mesma textura e/ou UV 2x2)');
  assert.ok(report.baseline.details.every(piece => piece.faces.length === 0 || piece.faces.every(face => !face.production && !face.independent.supported)),
    'faces do baseline falham produção E medição independente');
}
const mutants = {};
if (args.includes('--self-test')) {
  const [art] = artMeshes(current.root);
  // CRÍTICO R1 P2-1: todo mutante é reprovado pela MESMA aceitação do gate (measure real),
  // nunca por assert auxiliar isolado. Padrão casa a cláusula específica que tem que morder.
  const rejectByAcceptance = async (label, clause) => {
    try { await measure(current, label); }
    catch (error) {
      assert.ok(clause.test(error.message), `${label}: reprovado, mas pela cláusula errada: ${error.message}`);
      return { detected: true, clause: error.message };
    }
    assert.fail(`MUTANTE ${label} NAO DETECTADO — a aceitação real do gate aceitou o defeito`);
  };

  // mutante CLONE: 2ª aplicação da mesma arte — cláusula de contagem da aceitação.
  const clone = new THREE.Mesh(new THREE.PlaneGeometry(CONTRACT.w, CONTRACT.h), art.material);
  clone.position.set(-1 * 23.738, CONTRACT.y, LEGACY[1][1]); clone.rotation.y = Math.PI / 2;
  clone.name = art.name; clone.updateMatrixWorld(true); current.root.add(clone);
  try {
    assert.ok(clone.parent === current.root && clone.material.map === art.material.map, 'MUTANTE clone NAO APLICOU');
    mutants.clone = await rejectByAcceptance('mutante-clone', /1 aplicação da arte única; achei 2/);
  } finally { clone.removeFromParent(); clone.geometry.dispose(); current.root.updateMatrixWorld(true); }
  // mutante REPEAT: repeat 2x2 na textura VIVA do próprio painel (P3-1: nunca na última
  // textura global — quebra com --baseline-ref), preservando o repeat exato anterior.
  const repeatMap = art.material.map, priorRepeat = repeatMap.repeat.clone();
  try {
    repeatMap.repeat.set(2, 2);
    assert.equal(repeatMap.repeat.x, 2, 'MUTANTE repeat NAO APLICOU');
    mutants.repeat = await rejectByAcceptance('mutante-repeat', /não montou—uvOnce=false|uvOnce=false/);
  } finally { repeatMap.repeat.copy(priorRepeat); }
  // mutante OFFSET-NÃO-FINITO (CRÍTICO R4 P2-2): NaN no offset da textura viva entra na
  // matriz UV do renderer; finitude tem que reprovar antes de medir span/canônico.
  const priorOffset = repeatMap.offset.clone();
  try {
    repeatMap.offset.x = NaN;
    assert.ok(Number.isNaN(repeatMap.offset.x), 'MUTANTE offset-nao-finito NAO APLICOU');
    mutants['offset-nao-finito'] = await rejectByAcceptance('mutante-offset-nao-finito', /uvOnce=false/);
  } finally { repeatMap.offset.copy(priorOffset); }
  // mutante UV-CHANNEL: shader passaria a ler uv1 escalado 2x com repeat 1x1 — fail-closed (P2-3).
  try {
    const uv = art.geometry.attributes.uv;
    art.geometry.setAttribute('uv1', new THREE.BufferAttribute(new Float32Array(uv.array.length), 2));
    for (let i = 0; i < uv.count; i++) art.geometry.attributes.uv1.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
    repeatMap.channel = 1;
    assert.equal(repeatMap.channel, 1, 'MUTANTE uv-channel NAO APLICOU');
    mutants['uv-channel'] = await rejectByAcceptance('mutante-uv-channel', /uvOnce=false/);
  } finally { art.geometry.deleteAttribute('uv1'); repeatMap.channel = 0; }
  // mutante UV-MATRIX: matriz UV manual 2x2 com repeat 1x1 e matrixAutoUpdate off — fail-closed (P2-3).
  try {
    repeatMap.matrixAutoUpdate = false; repeatMap.matrix.set(2, 0, 0, 0, 2, 0, 0, 0, 1);
    assert.equal(repeatMap.matrixAutoUpdate, false, 'MUTANTE uv-matrix NAO APLICOU');
    mutants['uv-matrix'] = await rejectByAcceptance('mutante-uv-matrix', /uvOnce=false/);
  } finally { repeatMap.matrixAutoUpdate = true; repeatMap.matrix.identity(); }
  // mutantes INSTANCED (P2-2): count=0 (nada desenhado) e count=2 (2ª aplicação real) —
  // ambos reprovados pela rejeição fail-closed da aceitação.
  const swapInstanced = count => {
    const instanced = new THREE.InstancedMesh(art.geometry, art.material, count);
    instanced.name = art.name; instanced.position.copy(art.position); instanced.rotation.copy(art.rotation);
    const identity = new THREE.Matrix4().identity(), shifted = new THREE.Matrix4().makeTranslation(0, 0, 36);
    if (count > 0) instanced.setMatrixAt(0, identity);
    if (count > 1) instanced.setMatrixAt(1, shifted);
    instanced.instanceMatrix.needsUpdate = true; instanced.updateMatrixWorld(true);
    art.parent.add(instanced); art.removeFromParent();
    return instanced;
  };
  const artParent = art.parent;
  for (const count of [0, 2]) {
    let instanced;
    try {
      instanced = swapInstanced(count);
      // Guarda pelo ESTADO FÍSICO da cópia (CRÍTICO R3 P3-1): nunca pelo enumerador sob
      // mutação — abort pré-measure mascararia a cláusula de aceitação.
      assert.ok(instanced.isInstancedMesh && instanced.parent === artParent
        && instanced.count === count && instanced.geometry === art.geometry
        && instanced.material === art.material && art.parent === null,
        'MUTANTE instanced NAO APLICOU');
      if (count === 2) {
        const probe = new THREE.Matrix4(); instanced.getMatrixAt(1, probe);
        assert.ok(Math.abs(probe.elements[14] - 36) < 1e-9, 'MUTANTE instanced NAO APLICOU');
      }
      mutants[`instanced-${count}`] = await rejectByAcceptance(`mutante-instanced-${count}`, /InstancedMesh não é formato suportado/);
    } finally {
      if (instanced) { instanced.removeFromParent(); instanced.dispose(); }
      artParent.add(art); current.root.updateMatrixWorld(true);
    }
  }
  // mutante INVISIBLE: painel declarado mas não desenhado — deixa de contar aplicação (P2-4).
  try {
    art.visible = false;
    assert.equal(art.visible, false, 'MUTANTE invisible NAO APLICOU');
    mutants.invisible = await rejectByAcceptance('mutante-invisible', /1 aplicação da arte única; achei 0/);
  } finally { art.visible = true; }
  // mutante BACKSIDE: pintura vista do lado de fora do muro — contrato é FrontSide (P2-4).
  try {
    art.material.side = THREE.BackSide;
    assert.equal(art.material.side, THREE.BackSide, 'MUTANTE backside NAO APLICOU');
    mutants.backside = await rejectByAcceptance('mutante-backside', /não é formato suportado/);
  } finally { art.material.side = THREE.FrontSide; }
  // mutante DOUBLESIDE-CLONE (CRÍTICO R2 P2-1): cópia DoubleSide da mesma arte num 2º centro —
  // o renderer desliga culling para DoubleSide, então a cópia é candidata potencialmente
  // desenhada; a aceitação reprova pelo formato sem excluí-la do inventário.
  const dsMaterial = art.material.clone();
  dsMaterial.side = THREE.DoubleSide;
  const dsClone = new THREE.Mesh(new THREE.PlaneGeometry(CONTRACT.w, CONTRACT.h), dsMaterial);
  dsClone.position.set(-1 * 23.738, CONTRACT.y, LEGACY[1][1]); dsClone.rotation.y = Math.PI / 2;
  dsClone.name = art.name; dsClone.updateMatrixWorld(true); current.root.add(dsClone);
  try {
    assert.ok(dsClone.parent === current.root && dsClone.material.side === THREE.DoubleSide
      && dsClone.material.map === art.material.map && dsClone.geometry.type === 'PlaneGeometry',
      'MUTANTE doubleside-clone NAO APLICOU');
    mutants['doubleside-clone'] = await rejectByAcceptance('mutante-doubleside-clone', /não é formato suportado/);
  } finally { dsClone.removeFromParent(); dsClone.geometry.dispose(); dsMaterial.dispose(); current.root.updateMatrixWorld(true); }
  // Opacity0 opaca ainda desenha RGB; o inventário deve contar essa cópia.
  // A mesma aceitação reprova seu formato, conforme CORREGO-ARTE-UNICA.md.
  const ozMaterial = art.material.clone();
  ozMaterial.opacity = 0;
  const ozClone = new THREE.Mesh(new THREE.PlaneGeometry(CONTRACT.w, CONTRACT.h), ozMaterial);
  ozClone.position.set(-1 * 23.738, CONTRACT.y, LEGACY[1][1]); ozClone.rotation.y = Math.PI / 2;
  ozClone.name = art.name; ozClone.updateMatrixWorld(true); current.root.add(ozClone);
  try {
    assert.ok(ozClone.parent === current.root && ozMaterial.opacity === 0
      && ozMaterial.transparent === false && ozMaterial.blending === THREE.NormalBlending
      && ozMaterial.alphaTest === 0 && ozMaterial.map === art.material.map,
      'MUTANTE opaco-zero-clone NAO APLICOU');
    mutants['opaco-zero-clone'] = await rejectByAcceptance('mutante-opaco-zero-clone', /opacity=0 não é formato suportado/);
  } finally { ozClone.removeFromParent(); ozClone.geometry.dispose(); ozMaterial.dispose(); current.root.updateMatrixWorld(true); }
  // mutante UV-FOLD (CRÍTICO R2 P2-2): UV do vértice 3 dobrada na do vértice 0 — o span
  // continua 1x1 (once=true), mas os dois triângulos amostram a mesma meia-arte; a cláusula
  // do quad canônico reprova no MESMO acceptance, sem relaxar o limiar 1.002.
  try {
    const uvAttr = art.geometry.attributes.uv;
    uvAttr.setXY(3, uvAttr.getX(0), uvAttr.getY(0));
    assert.ok(uvAttr.getX(3) === uvAttr.getX(0) && uvAttr.getY(3) === uvAttr.getY(0), 'MUTANTE uv-fold NAO APLICOU');
    mutants['uv-fold'] = await rejectByAcceptance('mutante-uv-fold', /uvCanonica=false/);
  } finally { art.geometry.attributes.uv.setXY(3, UV_CANONICAL[3][0], UV_CANONICAL[3][1]); }
  // mutante REFLECTED (CRÍTICO R2 P2-3): yaw +PI/2 com scale.x=-1 preserva o quad medido
  // (apoio, UV e área seguem válidos — mutação causal) mas det<0 vira a frente FrontSide
  // para o muro; a MESMA measure reprova pela cláusula de orientação.
  const priorRotationY = art.rotation.y;
  try {
    art.scale.x = -1; art.rotation.y = Math.PI / 2; current.root.updateMatrixWorld(true);
    assert.equal(art.scale.x, -1, 'MUTANTE reflected NAO APLICOU');
    mutants.reflected = await rejectByAcceptance('mutante-reflected', /orientacao=false/);
  } finally { art.scale.x = 1; art.rotation.y = priorRotationY; current.root.updateMatrixWorld(true); }
  // mutante PERPENDICULAR: geometria antiga de caixa — montagem plena tem que reprovar.
  const originalGeometry = art.geometry, originalPosition = art.position.clone();
  try {
    art.geometry = new THREE.BoxGeometry(.05, 4.6, 6);
    art.position.x = Math.sign(art.position.x) * 23.72; art.position.y = 3.7;
    current.root.updateMatrixWorld(true);
    assert.equal(art.geometry.type, 'BoxGeometry', 'MUTANTE perpendicular NAO APLICOU');
    const boxMeasure = await measure({ root: current.root }, 'old-perpendicular-box', { lenient: true });
    mutants.perpendicular = { mounted: boxMeasure.mounted, detected: boxMeasure.mounted === 0 };
    assert.equal(boxMeasure.mounted, 0, 'mutante perpendicular não pode montar');
    assert.ok(boxMeasure.details.every(piece => piece.faces.length === 0 || piece.faces.every(face => !face.production && !face.independent.supported)),
      'faces do mutante falham produção E medição independente');
  } finally {
    art.geometry.dispose(); art.geometry = originalGeometry; art.position.copy(originalPosition);
    current.root.updateMatrixWorld(true);
  }
  report.geometryMutationDetected = mutants.perpendicular.detected;
  for (const [name, mutant] of Object.entries(mutants))
    assert.ok(mutant.detected, `MUTANTE ${name} NAO DETECTADO — a régua está cega para este defeito`);
}
const finalCount = potentialApplications(current.root).length;
report.mutants = mutants;
report.ok = report.current.mounted === 1 && finalCount === 1 && Object.values(mutants).every(mutant => mutant.detected);
if (option('out')) writeFileSync(option('out'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ gate: report.gate, quality, propsLoaded: props.length,
  current: `${report.current.mounted}/1`, applications: finalCount, uv: report.current.details?.[0]?.uv,
  baseline: report.baseline ? `${report.baseline.mounted}/${report.baseline.pieces} artRepeated=${report.baseline.artRepeated}` : undefined,
  mutants, output: option('out'), ok: report.ok }));
THREE.TextureLoader.prototype.load = loader;
if (!report.ok) {
  console.error(`[corrego-art-mount] RED: ${report.current.reason || 'painel contrato não montou'} — ` +
    `1 aplicação em [lado ${CONTRACT.side}, z ${CONTRACT.z}] com repeat 1,1 (docs/visual-consistency/CORREGO-ARTE-UNICA.md)`);
  process.exitCode = 1;
}
