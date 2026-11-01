/* FERRO-BALCAO — contrato de integração do balcão (PropBatch 5 draws) via buildFerroVelho
   e GLTFLoader reais. Cada cenário roda em processo filho próprio; mutante que não aplica é erro. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.resolve(HERE, 'ferro-balcao-check.mjs');
const MUTANTES = ['escala', 'deslocado', 'fallback-visível', 'collider-removido', 'occluder-removido', 'modelo-invisível', 'triângulo-ausente', 'prop-ausente', 'switch-ignorado', 'recolor-preto', 'roughness-alt'];
const MODOS = ['model', 'fallback', 'noasset'];
const QUALIDADES = ['med', 'low'];
// mutantes que alteram o TEMPLATE entre parse e build (mordem via snapshot PBR, não via twin)
const PRE_BOOT = new Set(['recolor-preto', 'roughness-alt']);
const usage = () => {
  console.error('uso: node tools/eval/ferro-balcao-check.mjs            # régua completa (cenários + mutantes)');
  console.error('     node tools/eval/ferro-balcao-check.mjs --probe --modo=model|fallback|noasset [--qualidade=med|low] [--mutante=X] [--fantasma]');
  console.error(`mutantes: ${MUTANTES.join(', ')}`);
};

// CLI de nome EXATO e valor obrigatório em --modo/--qualidade/--mutante; desconhecida = exit 2
const parseCLI = (argv) => {
  const out = { probe: false, fantasma: false, modo: 'model', qualidade: 'med', mutante: null, erro: null };
  for (const a of argv) {
    const eq = a.indexOf('=');
    const head = eq === -1 ? a : a.slice(0, eq);
    const val = eq === -1 ? undefined : a.slice(eq + 1);
    if (head === '--probe' || head === '--fantasma') {
      if (eq !== -1) { out.erro = `opção booleana não recebe valor: ${a}`; break; }
      out[head.slice(2)] = true;
    } else if (head === '--modo' || head === '--qualidade' || head === '--mutante') {
      if (eq === -1 || val === '') { out.erro = `valor ausente em ${head} (use ${head}=valor)`; break; }
      out[head.slice(2)] = val;
    } else { out.erro = `opção desconhecida: ${a}`; break; }
  }
  return out;
};
const cli = parseCLI(process.argv.slice(2));

if (!cli.probe) {
  // orchestrator não aceita opção alguma (nem de probe): qualquer arg é erro de uso
  if (process.argv.length > 2) { console.error('orchestrator não aceita opções — opções são do --probe'); usage(); process.exit(2); }

  const run = (probeArgs, probe = true) => {
    const r = spawnSync(process.execPath, [SELF, ...(probe ? ['--probe'] : []), ...probeArgs], { encoding: 'utf8', env: process.env });
    return { status: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
  };
  const scenario = (label, probeArgs, expectOk, expectStatus = 0, probe = true) => {
    const r = run(probeArgs, probe);
    if (r.status !== expectStatus) throw new Error(`${label}: exit ${r.status} (esperado ${expectStatus})\n${r.err || r.out}`);
    let j = null;
    try { j = JSON.parse(r.out.split('\n').pop()); } catch { if (expectStatus === 0) throw new Error(`${label}: filho não devolveu JSON\n${r.out}\n${r.err}`); }
    if (expectStatus === 0 && j.ok !== expectOk) throw new Error(`${label}: acceptance ok=${j.ok} falhas=${JSON.stringify(j.failures)}`);
    return j;
  };
  const modelMed = scenario('model/med', ['--modo=model', '--qualidade=med'], true);
  const modelLow = scenario('model/low', ['--modo=model', '--qualidade=low'], true);
  const fbMed = scenario('fallback/med', ['--modo=fallback', '--qualidade=med'], true);
  const noAsset = scenario('noasset/med', ['--modo=noasset', '--qualidade=med'], true);
  for (const q of ['med', 'low']) for (const m of MUTANTES.filter((m) => !PRE_BOOT.has(m))) {
    const modo = m === 'switch-ignorado' ? 'fallback' : 'model';
    scenario(`mutante ${m}/${q}`, ['--modo=' + modo, `--qualidade=${q}`, `--mutante=${m}`], false);
  }
  for (const m of PRE_BOOT) for (const q of ['med', 'low']) scenario(`mutante ${m}/${q}`, ['--modo=model', `--qualidade=${q}`, `--mutante=${m}`], false);
  scenario('fantasma (mutação não aplicada deve ser denunciada)', ['--modo=model', '--mutante=escala', '--fantasma'], false, 3);
  scenario('mutante desconhecido exit 2', ['--modo=model', '--mutante=xyz'], false, 2);
  scenario('typo de opção exit 2 (--qualidadelow)', ['--probe', '--qualidadelow'], false, 2);
  scenario('valor ausente exit 2 (--modo sem =valor)', ['--probe', '--modo'], false, 2);
  scenario('valor inválido exit 2 (--modo=xl)', ['--probe', '--modo=xl'], false, 2);
  scenario('orchestrator rejeita opção de probe', ['--qualidade=med'], false, 2, false);
  // paridade modelo × fallback: ESTRUTURA ESTÁTICA + nextRust — não é paridade do fluxo
  // global do RNG (o branch com asset aloca Group/InstancedMesh e consome Math.random de UUID)
  for (const [label, a, b] of [['colliders', modelMed.colliders, fbMed.colliders], ['spawns', modelMed.spawns, fbMed.spawns],
    ['ctfPoints', modelMed.ctfPoints, fbMed.ctfPoints], ['occluders fora do balcão', String(modelMed.occludersOutside), String(fbMed.occludersOutside)],
    ['occluders fora do balcão (noasset)', String(modelMed.occludersOutside), String(noAsset.occludersOutside)],
    ['cor fallback (nextRust)', modelMed.fallbackColor, fbMed.fallbackColor]]) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`paridade ${label}: modelo × fallback divergem\n${JSON.stringify(a).slice(0, 400)}\n${JSON.stringify(b).slice(0, 400)}`);
  }
  if (modelMed.templateMeshes !== 24 || modelMed.glbTriangles !== 608 || modelMed.glbVertices !== 1224 || modelMed.glbMaterials !== 5)
    throw new Error(`GLB/template diverge do aprovado: meshes=${modelMed.templateMeshes} tri=${modelMed.glbTriangles} verts=${modelMed.glbVertices} mats=${modelMed.glbMaterials}`);
  console.log(`FERRO-BALCAO PASSA — model med/low ok, fallback (com template, switch off) e noasset ok, ${MUTANTES.length} mutantes mordidos, ${modelMed.draws} draws, ${modelMed.triangles} tri, envelope ${modelMed.envelope}, collider ×1, occluders ${modelMed.occludersAt}+fb${fbMed.occludersAt}, raycast bloqueado, nextRust/colisão/spawns idênticos ao fallback (estrutura estática, não fluxo global do RNG)`);
  process.exit(0);
}

// -------- probe: um cenário, mundo real, stdout = JSON --------
if (cli.erro) { console.error(cli.erro); usage(); process.exit(2); }
const { modo, qualidade, mutante, fantasma } = cli;
if (!MODOS.includes(modo)) { console.error(`--modo inválido: ${modo}`); usage(); process.exit(2); }
if (!QUALIDADES.includes(qualidade)) { console.error(`--qualidade inválida: ${qualidade}`); usage(); process.exit(2); }
if (mutante && !MUTANTES.includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); usage(); process.exit(2); }
if (mutante === 'prop-ausente' && modo !== 'model') { console.error('mutante prop-ausente só faz sentido em --modo=model'); process.exit(2); }
if (mutante === 'switch-ignorado' && modo !== 'fallback') { console.error('mutante switch-ignorado só faz sentido em --modo=fallback (cenário do kill-switch)'); process.exit(2); }
if (PRE_BOOT.has(mutante) && modo !== 'model') { console.error(`mutante ${mutante} só faz sentido em --modo=model`); process.exit(2); }
if (mutante && modo === 'noasset') { console.error('mutante em --modo=noasset não é mensurável (sem modelo)'); process.exit(2); }

// LOWQ do map_ferrovelho lê localStorage NA IMPORTAÇÃO do módulo — precisa existir antes do harness
globalThis.localStorage = { getItem: (k) => (k === 'awpbr_settings' ? JSON.stringify({ quality: qualidade }) : null), setItem() {} };
process.env.SIM_QS = modo === 'fallback' ? 'usarprop=0' : '';

const { createHash } = await import('node:crypto');
const { readFileSync } = await import('node:fs');
const assert = (await import('node:assert/strict')).default;
const { THREE, bootGame, initTextures } = await import('./harness.mjs');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { registerPropTemplate, hasProp, PropBatch } = await import('../../public/js/mapprops.js');

const FILE = path.resolve(HERE, '../../public/models/props/ferro_balcao.glb');
const HASH = 'dabc0f95b5e31ecd8460358f6ce247c443d2aa9b7c6dccf00a0df5d40b4f5b57';
const bytes = readFileSync(FILE);
assert.equal(createHash('sha256').update(bytes).digest('hex'), HASH, 'GLB servido diverge do aprovado');
const loader = new GLTFLoader();
const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const parsed = await loader.parseAsync(buf, '');
const jsonLen = bytes.readUInt32LE(12), glb = JSON.parse(bytes.subarray(20, 20 + jsonLen).toString());
let glbTriangles = 0, glbVertices = 0; const glbMatNames = new Set();
for (const mesh of glb.meshes) for (const prim of mesh.primitives) {
  const pos = glb.accessors[prim.attributes.POSITION]; glbVertices += pos.count;
  glbTriangles += (prim.indices == null ? pos.count : glb.accessors[prim.indices].count) / 3;
  if (prim.material != null) glbMatNames.add(glb.materials[prim.material].name ?? `mat${prim.material}`);
}
let templateMeshes = 0; parsed.scene.traverse((o) => { if (o.isMesh) templateMeshes++; });

// snapshot PBR independente ANTES do register/build: VALORES copiados, não referências —
// o template compartilhado por referência não pode servir de testemunha de si mesmo
const pbrSig = (scene) => { const a = []; scene.traverse((o) => { if (o.isMesh && o.material) a.push(`${o.material.uuid}:${o.material.color.getHexString()}:${o.material.roughness}:${o.material.metalness}`); }); return a.join('|'); };
const snapshotPBR = []; parsed.scene.traverse((o) => { if (o.isMesh && o.material) snapshotPBR.push({ uuid: o.material.uuid, nome: o.material.name || '', cor: o.material.color.getHexString(), rough: o.material.roughness, metal: o.material.metalness }); });

// model E fallback registram o template (o cenário do switch precisa do asset pré-build);
// só noasset fica sem — é ele quem prova o caminho sem asset de verdade
if (modo !== 'noasset' && mutante !== 'prop-ausente') registerPropTemplate('ferro_balcao', parsed.scene);
if (mutante === 'prop-ausente') registerPropTemplate('ferro_balcao', null);
const temTemplate = hasProp('ferro_balcao');
const preFalhas = [];
if (modo === 'noasset' && temTemplate) preFalhas.push('noasset com template registrado — não exercita o sem-asset');
if (modo !== 'noasset' && !temTemplate) preFalhas.push(`${modo}: template ausente pré-build — kill-switch não exercitável (régua cega)`);

// mutantes pre-boot: recolor/roughness IN-PLACE no template, entre o parse e o build
let preAplicou = false;
if (PRE_BOOT.has(mutante)) {
  const sigAntes = pbrSig(parsed.scene);
  parsed.scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    if (mutante === 'recolor-preto') o.material.color.set(0x000000);
    else o.material.roughness = 1;
  });
  preAplicou = pbrSig(parsed.scene) !== sigAntes;
}
const game = bootGame('ferro_velho', { textures: initTextures(), ctf: true, seed: 8012 });
const W = game.world;
W.root.updateMatrixWorld(true);

const CX = -8, CZ = -31.5, TOL = 0.025;
const near = (v, e, t = TOL) => Math.abs(v - e) <= t;
const boxOf = (o) => new THREE.Box3().setFromObject(o);
const isAt = (o) => { const c = boxOf(o).getCenter(new THREE.Vector3()); return Math.abs(c.x - CX) < .2 && Math.abs(c.z - CZ) < .2; };
let group = W.root.children.find((o) => o.userData?.propId === 'ferro_balcao');
const fallback = W.root.children.filter(isAt).find((o) => o.isMesh && o !== group && near(boxOf(o).max.y - boxOf(o).min.y, 1));

let applied = PRE_BOOT.has(mutante) ? preAplicou : true;
const snapshot = (f) => JSON.stringify(f());
const applyMutant = () => {
  if (!mutante || PRE_BOOT.has(mutante)) return;
  if (mutante === 'prop-ausente') return;   // aplicado pré-boot: detecção = ausência do grupo
  const before = { escala: () => group.scale.x, deslocado: () => group.position.x, 'fallback-visível': () => fallback.visible,
    'collider-removido': () => W.colliders.length, 'occluder-removido': () => W.occluders.length, 'modelo-invisível': () => group.visible,
    'switch-ignorado': () => W.root.children.length,
    'triângulo-ausente': () => { const g = group.children[0].geometry; return [g.drawRange.start, g.drawRange.count === Infinity ? -1 : g.drawRange.count].join(','); } }[mutante];
  const b = snapshot(before);
  if (mutante === 'escala') group.scale.x *= fantasma ? 1.0 : 1.15;
  if (mutante === 'deslocado') group.position.x += 0.5;
  if (mutante === 'fallback-visível') fallback.visible = true;
  if (mutante === 'collider-removido') W.colliders.splice(W.colliders.findIndex((c) => near(c.maxX - c.minX, 3.2) && near(c.maxZ - c.minZ, 1.4) && near(c.maxY, 1)), 1);
  if (mutante === 'occluder-removido') { for (let i = W.occluders.length - 1; i >= 0; i--) if (W.occluders[i] === fallback || (group && group.children.includes(W.occluders[i]))) W.occluders.splice(i, 1); }
  if (mutante === 'modelo-invisível') group.visible = false;
  if (mutante === 'triângulo-ausente') { const g = group.children[0].geometry; const n = g.index ? g.index.count : g.attributes.position.count; g.setDrawRange(0, n - 6); }
  if (mutante === 'switch-ignorado') {
    // guarda `if (USAR_BALCAO_PROP)` removida: reproduz o bloco de integração do produto
    const pb = new PropBatch({ tag: 'balcao' });
    if (pb.add('ferro_balcao', { x: -8, z: -31.5, targetH: 1.0 })) {
      const g = new THREE.Group(); g.name = 'ferro-balcao'; g.userData.propId = 'ferro_balcao';
      W.root.add(g); pb.build(g);
      g.traverse((m) => { if (m.isMesh) W.occluders.push(m); });
      fallback.visible = false;
    }
  }
  W.root.updateMatrixWorld(true);
  applied = snapshot(before) !== b;
  if (fantasma) applied = false;   // fantasma simula mutação que não morde: tem que ser denunciada
};
applyMutant();
group = W.root.children.find((o) => o.userData?.propId === 'ferro_balcao');   // switch-ignorado cria o grupo DEPOIS
if (fantasma) { console.error(`mutação ${mutante} NÃO APLICOU (fantasma) — aceitação não pode ser medida`); process.exit(3); }
if (mutante && !applied) { console.error(`mutação ${mutante} não alterou o mundo — mutante não aplicou`); process.exit(3); }
if (mutante === 'prop-ausente') applied = !group;

// -------- acceptance: o MESMO contrato mede baseline e mutantes --------
const failures = [...preFalhas];
const expectModel = modo === 'model';
if (expectModel && !group) failures.push('grupo ferro-balcao ausente com asset registrado');
if (!expectModel && group) failures.push('modelo instanciado sem asset/usarprop');
if (expectModel && !fallback) failures.push('caixa fallback legada não encontrada');

const drawn = [];
const visibleChain = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
if (group) group.traverse((m) => { if (m.isMesh && visibleChain(m) && m.material?.visible !== false) drawn.push(m); });
const draws = drawn.length;
const matSet = new Set(drawn.map((m) => m.material));
let triangles = 0;
const worldBox = new THREE.Box3();
const tmpM = new THREE.Matrix4(), tmpB = new THREE.Box3();
for (const m of drawn) {
  const g = m.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  const idx = g.index ? g.index.count : g.attributes.position.count;
  const eff = Math.min(g.drawRange.start + (g.drawRange.count === Infinity ? idx : g.drawRange.count), idx) - g.drawRange.start;
  triangles += (eff / 3) * m.count;
  for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, tmpM); tmpB.copy(g.boundingBox).applyMatrix4(tmpM).applyMatrix4(m.matrixWorld); worldBox.union(tmpB); }
}
const size = worldBox.getSize(new THREE.Vector3()), center = worldBox.getCenter(new THREE.Vector3());
const envelope = `${size.x.toFixed(3)}×${size.y.toFixed(3)}×${size.z.toFixed(3)}`;
if (expectModel) {
  if (draws !== 5) failures.push(`draws=${draws}, esperado 5 (1 por material)`);
  if (matSet.size !== 5) failures.push(`materiais desenhados=${matSet.size}, esperado 5`);
  if (triangles !== 608) failures.push(`triângulos efetivamente desenhados=${triangles}, esperado 608`);
  if (!(near(size.x, 3.2) && near(size.y, 1) && near(size.z, 1.4))) failures.push(`envelope fora do contrato: ${envelope}`);
  if (!(near(worldBox.min.y, 0) && near(center.x, CX) && near(center.z, CZ))) failures.push(`base/centro fora: minY=${worldBox.min.y.toFixed(3)} c=(${center.x.toFixed(3)},${center.z.toFixed(3)})`);
  // sem clone/recolor: material desenhado é o do template E conserva o PBR do SNAPSHOT
  // pré-register (o template em si já pode ter sido mutado — testemunha é o snapshot)
  const snap = new Map(snapshotPBR.map((s) => [s.uuid, s]));
  for (const m of drawn) {
    const s = snap.get(m.material.uuid);
    if (!s) { failures.push(`material ${m.material.name || m.material.uuid} fora do snapshot do template (clone?)`); continue; }
    if (m.material.color.getHexString() !== s.cor) failures.push(`material "${s.nome}" recolorido in-place: ${m.material.color.getHexString()} ≠ snapshot ${s.cor}`);
    if (m.material.roughness !== s.rough || m.material.metalness !== s.metal)
      failures.push(`material "${s.nome}" PBR alterado in-place (rough ${m.material.roughness}/${s.rough}, metal ${m.material.metalness}/${s.metal})`);
  }
}
if (fallback && fallback.visible !== !expectModel) failures.push(`fallback visible=${fallback.visible} com modo ${modo} (esperado ${!expectModel})`);

const colliderHit = () => W.colliders.filter((c) => near(c.maxX - c.minX, 3.2) && near(c.maxZ - c.minZ, 1.4) && near(c.maxY, 1) && near(c.minX + 1.6, CX) && near(c.minZ + 0.7, CZ));
if (colliderHit().length !== 1) failures.push(`collider legado do balcão: ${colliderHit().length} ocorrências (duplicado/removido)`);
// shot_surfaces: occluder do jogo é a superfície RENDERIZADA — caixa oculta é excluída do array
const occlAt = W.occluders.filter((o) => o === fallback || drawn.includes(o));
const expectOccl = expectModel ? 5 : 1;
if (occlAt.length !== expectOccl) failures.push(`occluders do balcão: ${occlAt.length} (esperado ${expectOccl} em modo ${modo})`);
if (expectModel && !drawn.every((m) => W.occluders.includes(m))) failures.push('malha visível do modelo fora dos occluders: tiro/LOS atravessa');
if (expectModel && W.occluders.includes(fallback)) failures.push('caixa oculta ainda registrada como occluder (superfície não renderizada)');
// consumidores reais (game.js _losClear/tiro/penetração: raycast contra world.occluders)
const ray = new THREE.Raycaster();
ray.set(new THREE.Vector3(CX, 0.5, CZ - 2.2), new THREE.Vector3(0, 0, 1)); ray.far = 3;
const blocked = ray.intersectObjects(W.occluders, false).length > 0;
if (!blocked) failures.push('raio real atravessa o balcão: occlusão/linha de tiro perdida');

const out = {
  ok: failures.length === 0, failures, modo, qualidade, mutante, applied,
  draws, triangles, materials: matSet.size, envelope, groupFound: !!group, occludersAtBalcao: occlAt.length,
  fallbackVisible: fallback ? fallback.visible : null, fallbackColor: fallback ? fallback.material.color.getHexString() : null,
  colliderCount: colliderHit().length, occludersLen: W.occluders.length, occludersAt: occlAt.length, occludersOutside: W.occluders.length - occlAt.length, rayBlocked: blocked,
  templateMeshes, glbTriangles, glbVertices, glbMaterials: glbMatNames.size,
  colliders: W.colliders, spawns: W.spawns, ctfPoints: W.ctfPoints,
};
console.log(JSON.stringify(out));
