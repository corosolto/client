#!/usr/bin/env node
/* ============================================================================
   vm-hand-continuity-check.mjs — A MÃO DO TIME É A MESMA EM TODA ARMA (BUG-85, #1128)
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Requisito do dono: uma identidade de mãos/braços por facção em TODAS as armas.
   A régua antiga só montava faca e pistola, com material sintético; o piloto
   `coro/pistol-hires.glb` passava com o nome de material certo e o rig de outro
   doador por baixo.

   O QUE MEDE
   Parte 1, contrato dos aplicadores (cena sintética, funções REAIS de authoredvm.js
   e meleevm.js): tint por time, donor tardio, UV legado, atlas por rig, Game.
   Parte 2, arsenal (GLB real): cada arma de WEAPON_IDS em cada rota que o runtime
   serve — `padrao` (vmFonteDe: fab#<arma>, gold#ak) e `pintura` (gold#<arma>, quando
   o jogador pinta uma arma que tem golden) — e a faca (KNIFE_URL do meleevm). O GLB
   é o arquivo que a URL aponta, com os bytes conferidos contra o `?v=`; o pacote
   sai do `cameraSpacePackage` / `_accept` reais. Por facção de TEAM_HANDS:
     MÃO1 toda malha de mão (material CoroSolto_*) leva a identidade do time, no atlas
          do rig dela, e o bind das texturas compartilhadas não a troca;
     MÃO2 outro personagem do mesmo time sai com a mesma luva;
     MÃO3 dedos seguem a direção aprovada (fingerless do time);
     MÃO4 troca de time pelo setProfile real alcança toda malha de mão.
   E uma vez por rota:
     RIG  assinatura da mão (material, vértices, ossos que deformam cada malha) igual ao
          rig aprovado da linha, congelado por hash em REFERENCIA: gold# = rig A da AK
          aprovada (gold#ak), fab# = rig K (fab#m4; o K de tools/viewmodels/lib/hand-rigs.mjs),
          faca = rig L. Medido hoje: sem pintura a AK mostra A, a faca L e as outras 24 K;
          com pintura 13 armas vão de K para A e a pistola de K para L (NOTA na saída).
          A/K/L são linhas aprovadas; o que a régua cobra é a arma ficar no rig da linha.
   A cor que chega à TELA por arma × time fica com vm-maos-time.mjs (navegador, local);
   esta roda em node puro, no CI, e mede o que o pixel não vê: a assinatura do rig.

   DÍVIDA DECLARADA (mesmo contrato do KNOWN-RED.json e do vm-reguas-divida.json)
   Reprovação que já existe e só se paga com ARTE fica em DIVIDA abaixo, com nome,
   número e o valor medido: avisa sem reprovar. Vermelho fora dela reprova. Entrada
   que passou a verde, ou que deixou de ser medida, também reprova: dívida paga que
   continua declarada deixa de morder. A lista só encolhe.

   CATÁLOGO PRIVADO
   As rotas fab# leem o catálogo privado (CSBRASIL_VM_ASSET_ROOT/viewmodels ou
   public/private-assets/viewmodels). Sem ele (CI), essas rotas saem como NÃO MEDIDA,
   listadas; `--exigir-catalogo` transforma ausência em reprovação (uso local).
   Bytes diferentes do `?v=` reprovam sempre: medir outro arquivo é não medir.

   Mutantes: luva-por-arma, pbr-por-arma, troca-rig, luva-crua, divida-paga
     luva-por-arma  a faca sintética perde a identidade do time (Parte 1)
     pbr-por-arma   o donor tardio troca o acabamento da pistola sintética (Parte 1)
     troca-rig      a arma de --arma= (padrão m4) recebe a malha de mão de outro rig,
                    com o material de nome certo: o defeito da pistola (RIG)
     luva-crua      a arma de --arma= (padrão m4) sai sem identidade de time (MÃO1)
     divida-paga    a pistola golden recebe o braço da AK: a dívida quitada e ainda
                    declarada tem de reprovar
   Uso: node tools/eval/vm-hand-continuity-check.mjs [--mutante=…] [--arma=m4] [--exigir-catalogo] [--json]
   ============================================================================ */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { clone: skeletonClone } = await import('three/addons/utils/SkeletonUtils.js');

globalThis.self ??= globalThis;
// Textura não entra na medida; o GLTFLoader só precisa de um Image que carregue (vm-manga-oca-check).
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(v) { queueMicrotask(() => this.onload?.()); } };
globalThis.ImageData ??= class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const quiet = (fn) => (...args) => !/Couldn't load texture|THREE\.GLTFLoader/.test(String(args[0] || '')) && fn(...args);
console.warn = quiet(console.warn);
console.error = quiet(console.error);

const MUTANTES = ['luva-por-arma', 'pbr-por-arma', 'troca-rig', 'luva-crua', 'divida-paga'];
const FLAGS = ['mutante', 'arma', 'exigir-catalogo', 'json'];
for (const a of process.argv.slice(2)) {
  const nome = a.replace(/^--/, '').split('=')[0];
  if (!a.startsWith('--') || !FLAGS.includes(nome)) throw new Error(`flag desconhecida: ${a}`);
}
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || '';
const mutante = arg('mutante');
if (mutante && !MUTANTES.includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);
const EXIGIR_CATALOGO = process.argv.includes('--exigir-catalogo');
const JSON_OUT = process.argv.includes('--json');
const ASSETS = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  ? path.join(process.env.CSBRASIL_VM_ASSET_ROOT, 'viewmodels') : path.join(ROOT, 'public/private-assets/viewmodels'));

/* authoredvm.js com as funções internas exportadas: o mesmo código, sem cópia. */
async function runtimeModule(file, extra) {
  const base = pathToFileURL(path.join(ROOT, file)).href;
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
    .replace(/from (['"])([^'"]+)\1/g, (_, q, spec) => `from ${q}${spec.startsWith('.') ? new URL(spec, base).href : import.meta.resolve(spec)}${q}`);
  return import(`data:text/javascript;base64,${Buffer.from(source + extra).toString('base64')}`);
}
const authored = await runtimeModule('public/js/authoredvm.js',
  '\nexport { cameraSpacePackage, skinnedEntryKey, urlForKey, tintHandMaterial, bindSharedArmTextures };');
const { AuthoredViewModels, cameraSpacePackage, skinnedEntryKey, urlForKey, vmFonteDe, tintHandMaterial, bindSharedArmTextures } = authored;
const { applyTeamHandMaterial, teamHandStyle, handLayoutOfMesh, refreshTeamHands, TEAM_HANDS } = await import('../../public/js/vmhands.js');
const { KnifeMeleeViewModel } = await import('../../public/js/meleevm.js');
const { WEAPON_IDS } = await import('../../public/js/weapons.js');
const { FACTIONS } = await import('../../public/js/factions.js');
const { VM_WEAPON, VM_FABRICA } = await import('../../public/js/data/vmconfig.js');
const { GOLDEN_VER } = await import('../../public/js/data/goldenver.js');
const { MeshoptDecoder } = await import('../../public/vendor/meshopt_decoder.module.js');

/* Dívida de ARTE, com número. Chave = `<cláusula>:<arma>@<rota>`; `rigHash` = o rig ERRADO medido
   hoje. Reprovar com outro rig também reprova: a dívida é deste defeito, não de qualquer um. */
const DIVIDA = Object.freeze({
  'RIG:pistol@pintura': Object.freeze({
    rigHash: 'f468adc9279d',
    motivo: '#1128 — coro/pistol-hires.glb (gold#pistol, servido quando o jogador pinta a pistola) '
      + 'traz a malha armmesh_Mat_0 do rig L da faca (R_wrist_026) com o material CoroSolto_FP_Gloves; a linha '
      + 'golden é o rig A da AK (Requests_Studio_Hands + .001). Conserto é re-rig do GLB no Blender, não arnês.',
  }),
});

const checks = [];
const check = (id, ok, evidence) => checks.push({ id, ok: Boolean(ok), ...(evidence === undefined ? {} : { evidence }) });

/* =============================== PARTE 1 ================================== */
// Toda facção jogável (factions.js `ready`), como em vm-maos-time.mjs; sem estilo próprio = reprova.
const FACCOES = FACTIONS.filter((f) => f.ready).map((f) => f.id);
check('toda facção jogável tem mão de time própria', FACCOES.length > 0 && FACCOES.every((id) => TEAM_HANDS[id]), FACCOES.filter((id) => !TEAM_HANDS[id]));
for (const faction of ['E', 'B', 'C', 'F', 'U']) {
  const profile = { id: 'player-a', faction, skin: 0xb78968, sleeve: 0xaa3333, accent: 0xdd2222 };
  const scene = new THREE.Group(); scene.add(new THREE.PerspectiveCamera(32, 1.5, 0.01, 100));
  const material = new THREE.MeshStandardMaterial(); material.name = 'CoroSolto_FP_Gloves';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); scene.add(mesh);
  const animations = ['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab'].map((n) => new THREE.AnimationClip(n, 1, []));
  const vm = new KnifeMeleeViewModel({ parent: new THREE.Group(), profile }); vm._accept({ scene, animations });
  const gunMaterial = material.clone(); gunMaterial.name = 'CoroSolto_FP_Glove';
  const pistol = tintHandMaterial(gunMaterial, profile), second = tintHandMaterial(gunMaterial, { ...profile, id: 'player-b', sleeve: 0x0000ff, accent: 0xff0000 });
  const expected = teamHandStyle(faction);
  if (mutante === 'luva-por-arma') delete mesh.material.userData.teamHands;
  check(`${faction}: faca e pistola usam identidade do time`, mesh.material.userData.teamHands?.faction === faction && pistol.userData.teamHands?.faction === faction);
  check(`${faction}: personagem não muda luva`, JSON.stringify(pistol.userData.teamHands) === JSON.stringify(second.userData.teamHands) && pistol.color.equals(second.color));
  check(`${faction}: dedos seguem direção aprovada`, mesh.material.userData.teamHands?.fingerless === expected.fingerless && pistol.userData.teamHands?.fingerless === expected.fingerless);
  const teamMap = new THREE.Texture(), donor = new THREE.Texture(), normal = new THREE.Texture(), orm = new THREE.Texture();
  pistol.map = teamMap;
  if (mutante === 'pbr-por-arma') delete pistol.userData.teamHands;
  bindSharedArmTextures([{ material: pistol }], new Map([['T_Glove01_B', donor], ['T_Glove01_N', normal], ['T_Glove01_ORM', orm]]));
  check(`${faction}: donor tardio não troca atlas nem acabamento por time`, pistol.map === teamMap && pistol.normalMap === null && pistol.roughnessMap === null);
  const viewmodels = new AuthoredViewModels(new THREE.Group(), null, profile);
  const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(), pistol);
  viewmodels.entries.set('pistol', { handMeshes: [gunMesh] });
  vm.setProfile({ faction: 'B' }); viewmodels.setProfile({ faction: 'B' });
  check(`${faction}: troca de time atualiza as duas armas já carregadas`, mesh.material.userData.teamHands?.faction === 'B' && gunMesh.material.userData.teamHands?.faction === 'B');
  const cached = mesh.material;
  vm.setProfile({ faction: 'B', id: 'outro-personagem' });
  check(`${faction}: mesmo time não recria material`, mesh.material === cached);
  vm.dispose();
}
{
  const material = new THREE.MeshStandardMaterial(); material.name = 'CoroSolto_FP_Glove';
  const legacy = tintHandMaterial(material, { accent: 0x202735 }, true), donor = new THREE.Texture(), normal = new THREE.Texture(), orm = new THREE.Texture();
  bindSharedArmTextures([{ material: legacy }], new Map([['T_Glove01_B', donor], ['T_Glove01_N', normal], ['T_Glove01_ORM', orm]]));
  check('UV legado mantém donor e PBR próprios', legacy.map === donor && legacy.normalMap === normal && legacy.roughnessMap === orm && !legacy.userData.teamHands);
  check('UV legado mantém tint anterior', legacy.color.equals(new THREE.Color(0x202735).lerp(new THREE.Color(0xffffff), 0.45)));
}
for (const [bone, materialName, layout, key] of [['handR_metarig', 'CoroSolto_Mandrake_Sleeves', 'ak', 'ak/cloth-U'], ['handR_metarig', 'CoroSolto_FP_Gloves', 'ak', 'ak/glove-U'], ['R_wrist_026', 'CoroSolto_FP_Gloves', 'knife', 'knife/combined-U']]) {
  const b = new THREE.Bone(); b.name = bone; const m = new THREE.MeshStandardMaterial(); m.name = materialName;
  const mesh = new THREE.SkinnedMesh(new THREE.BoxGeometry(), m); mesh.bind(new THREE.Skeleton([b]));
  const found = handLayoutOfMesh(mesh); mesh.material = applyTeamHandMaterial(m, { faction: 'E' }, found); refreshTeamHands([mesh], { faction: 'U' });
  check(`${materialName} em ${bone}: atlas do rig ${layout} e troca de time no mesmo rig`, found === layout && mesh.material.userData.teamHands?.key === key);
}
const game = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
check('Game passa facção para as duas rotas', (game.match(/faction: this\.playerFaction/g) || []).length >= 2);

/* =============================== PARTE 2 ================================== */
// O que é mão para esta régua; independente da classificação do runtime, que é o que se mede.
const HAND = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
const materialsOf = (o) => (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean);
const handMeshesOf = (scene) => { const out = []; scene.traverse((o) => { if (o.isMesh && materialsOf(o).some((m) => HAND.test(m.name || ''))) out.push(o); }); return out; };
const handMaterialsOf = (meshes) => meshes.flatMap((mesh) => materialsOf(mesh).filter((m) => HAND.test(m.name || '')).map((m) => ({ mesh, m })));

const loader = new GLTFLoader();
await MeshoptDecoder.ready;
loader.setMeshoptDecoder(MeshoptDecoder);
const parseFile = (file) => {
  const b = fs.readFileSync(file);
  return loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
};
const melee = fs.readFileSync(path.join(ROOT, 'public/js/meleevm.js'), 'utf8');
const KNIFE_URL = /const KNIFE_URL = `([^`?]+)\?v=\$\{GOLDEN_VER\.knife\}`/.exec(melee)?.[1];
if (!KNIFE_URL) throw new Error('meleevm.js: KNIFE_URL mudou de forma; a régua não sabe qual GLB a faca serve');

/* URL servida → arquivo local + revisão esperada (sha256[0..10] dos bytes, BUG-157). */
function arquivoDaUrl(url) {
  const [caminho, query = ''] = url.split('?');
  const v = new URLSearchParams(query).get('v') || '';
  if (caminho.startsWith('/private-assets/viewmodels/')) return { file: path.join(ASSETS, caminho.slice('/private-assets/viewmodels/'.length)), v, privado: true };
  if (caminho.startsWith('/models/')) return { file: path.join(ROOT, 'public', caminho), v, privado: false };
  return { file: '', v, privado: false };
}
const familyOfKey = (key) => {
  // Mesma derivação de AuthoredViewModels._loadFamily.
  const bruta = key.split('#')[0], arma = key.includes('#') ? key.split('#')[1] : '';
  return bruta === 'fab' ? VM_FABRICA[arma]?.familia : (bruta === 'gs' || bruta === 'rt' || bruta === 'gold') ? (VM_WEAPON[arma]?.family || bruta) : bruta;
};
const linhaDe = (key) => (key.startsWith('melee#') ? 'melee' : key.split('#')[0]);
/* Rig aprovado de cada linha, CONGELADO pela assinatura (sha256 de assinaturaTexto). Comparar só
   com a rota de referência deixaria a própria referência, e a faca, que é linha de um membro só,
   livres para trocar de doador sem acender. Re-rig aprovado pelo dono = hash novo, de propósito. */
const REFERENCIA = Object.freeze({
  gold: Object.freeze({ key: 'gold#ak', rig: 'A', hash: '4d568d4f2f6c' }),
  fab: Object.freeze({ key: 'fab#m4', rig: 'K', hash: '135bf12bccac' }),
  melee: Object.freeze({ key: 'melee#knife', rig: 'L', hash: 'f468adc9279d' }),
});
const hashRig = (texto) => crypto.createHash('sha256').update(texto).digest('hex').slice(0, 12);

const rotas = [];
for (const weapon of WEAPON_IDS) {
  if (weapon === 'knife') {
    rotas.push({ weapon, rota: 'padrao', key: 'melee#knife', url: `${KNIFE_URL}?v=${GOLDEN_VER.knife}` });
    continue;
  }
  const padrao = vmFonteDe(weapon);
  rotas.push({ weapon, rota: 'padrao', key: padrao.chave, url: padrao.url });
  const pintada = skinnedEntryKey(weapon, { [weapon]: 'regua' });
  if (pintada !== padrao.chave) rotas.push({ weapon, rota: 'pintura', key: pintada, url: urlForKey(pintada) });
}

/* Assinatura do rig de mão: por malha, materiais, vértices e ossos que DEFORMAM a malha
   (peso > 0). Ossos da arma no mesmo skin não entram; troca de doador muda tudo. */
function assinatura(meshes) {
  return meshes.map((mesh) => {
    const g = mesh.geometry, idx = g.attributes.skinIndex, w = g.attributes.skinWeight, bones = mesh.skeleton?.bones || [];
    const deforma = new Set();
    const comp = ['getX', 'getY', 'getZ', 'getW']; // InterleavedBufferAttribute não tem getComponent
    if (idx && w) for (let i = 0; i < idx.count; i++) for (const c of comp) if (w[c](i) > 0) deforma.add(bones[idx[c](i)]?.name ?? `#${idx[c](i)}`);
    return { mesh: mesh.name, materiais: materialsOf(mesh).map((m) => m.name).join('+'), vertices: g.attributes.position.count, ossos: [...deforma].sort() };
  }).sort((a, b) => `${a.materiais}|${a.vertices}`.localeCompare(`${b.materiais}|${b.vertices}`));
}
const assinaturaTexto = (s) => s.map((x) => `${x.materiais}|v${x.vertices}|${x.ossos.join(',')}`).join(' ; ');
const resumoRig = (s) => s.map((x) => `${x.mesh} [${x.materiais}] ${x.vertices} vért., ${x.ossos.length} ossos (${x.ossos.find((o) => /^(?:R_wrist|handR|hand_r)/.test(o)) || x.ossos[0] || '-'})`).join(' + ');

/* Doador do mutante troca-rig: o braço (malhas + armadura) de um GLB de OUTRO rig, com os
   materiais renomeados para os da arma alvo — o defeito da pistola. */
const MUT_ARMA = arg('arma') || 'm4';
if ((mutante === 'troca-rig' || mutante === 'luva-crua') && !WEAPON_IDS.includes(MUT_ARMA)) throw new Error(`--arma desconhecida: ${MUT_ARMA}`);
let doadores = null;
let mutacoes = 0;
async function doadorPara(signatureAlvo) {
  if (!doadores) {
    doadores = [];
    for (const f of ['public/models/viewmodels/coro/melee/knife-hires.glb', 'public/models/viewmodels/coro/ak-hires.glb']) {
      const g = await parseFile(path.join(ROOT, f));
      doadores.push({ f, scene: g.scene, meshes: handMeshesOf(g.scene) });
    }
  }
  return doadores.find((d) => assinaturaTexto(assinatura(d.meshes)) !== signatureAlvo);
}
function plantaRig(scene, doador, { renomeia = true } = {}) {
  const alvo = handMeshesOf(scene);
  const nomes = alvo.flatMap((m) => materialsOf(m).map((x) => x.name).filter((n) => HAND.test(n)));
  const papel = (n) => (/Glove/i.test(n) ? 'glove' : /Cloth|Sleeves/i.test(n) ? 'cloth' : 'skin');
  for (const mesh of alvo) mesh.removeFromParent();
  // O braço inteiro do doador (malhas de mão + armadura), sem câmera nem arma: é o GLB re-exportado.
  const braco = skeletonClone(doador.scene);
  const sobra = [];
  braco.traverse((o) => { if (o.isCamera || (o.isMesh && !materialsOf(o).some((m) => HAND.test(m.name || '')))) sobra.push(o); });
  for (const o of sobra) o.removeFromParent();
  for (const mesh of handMeshesOf(braco)) {
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
    if (renomeia) for (const m of materialsOf(mesh)) m.name = nomes.find((n) => papel(n) === papel(m.name)) || nomes[0] || m.name;
  }
  braco.name = `mutante_troca_rig_${path.basename(doador.f, '.glb')}`;
  scene.add(braco);
}

const linhas = [];
const assinaturas = new Map();
for (const r of rotas) {
  const linha = { ...r, linha: linhaDe(r.key), estado: 'MEDIDA', falhas: [] };
  linhas.push(linha);
  const { file, v, privado } = arquivoDaUrl(r.url || '');
  linha.file = file ? path.relative(ROOT, file) : '';
  if (!file) { linha.estado = 'ERRO'; linha.falhas.push(`rota sem arquivo local para ${r.url || '(sem url)'}`); continue; }
  if (!fs.existsSync(file)) {
    if (privado && !EXIGIR_CATALOGO) { linha.estado = 'NAO_MEDIDA'; linha.motivo = 'catálogo privado ausente'; continue; }
    linha.estado = 'ERRO'; linha.falhas.push(`GLB ausente: ${linha.file}`); continue;
  }
  const bytes = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  if (bytes !== v) { linha.estado = 'ERRO'; linha.falhas.push(`bytes ${bytes} ≠ ?v=${v} da URL: o arquivo local não é o servido`); continue; }
  const gltf = await parseFile(file);
  const mutaAqui = r.weapon === MUT_ARMA;
  if (mutante === 'troca-rig' && mutaAqui) {
    const doador = await doadorPara(assinaturaTexto(assinatura(handMeshesOf(gltf.scene))));
    plantaRig(gltf.scene, doador);
    linha.mutante = `malha de mão de ${doador.f}`;
    mutacoes += 1;
  }
  if (mutante === 'divida-paga' && r.key === 'gold#pistol') {
    // O conserto de arte simulado: a pistola golden recebe o braço da AK como ele é.
    await doadorPara('');
    plantaRig(gltf.scene, doadores.find((d) => d.f.endsWith('/ak-hires.glb')), { renomeia: false });
    mutacoes += 1;
  }
  /* Sobe o pacote como o runtime sobe: clone do parse, cameraSpacePackage, bind das
     texturas compartilhadas; faca pelo KnifeMeleeViewModel._accept. */
  const sobe = async (profile) => {
    const scene = skeletonClone(gltf.scene);
    if (r.key === 'melee#knife') {
      const vm = new KnifeMeleeViewModel({ parent: new THREE.Group(), profile });
      vm._accept({ scene, animations: gltf.animations });
      return { scene, meshes: handMeshesOf(scene), setProfile: (p) => vm.setProfile(p), dispose: () => vm.dispose() };
    }
    const viewmodels = new AuthoredViewModels(new THREE.Group(), null, profile);
    const visual = cameraSpacePackage({ scene, animations: gltf.animations }, profile, new THREE.Group(), familyOfKey(r.key), r.key);
    if (!r.key.startsWith('gold#')) {
      const donor = new Map(['T_Arm01', 'T_Cloth01', 'T_Glove01'].flatMap((b) => ['_B', '_N', '_ORM'].map((s) => [`${b}${s}`, new THREE.Texture()])));
      bindSharedArmTextures(visual.handMeshes, donor);
    }
    viewmodels.entries.set(r.key, { handMeshes: visual.handMeshes });
    const fora = handMeshesOf(scene).filter((m) => !visual.handMeshes.includes(m));
    return { scene, meshes: handMeshesOf(scene), fora, setProfile: (p) => viewmodels.setProfile(p), dispose: () => {} };
  };
  const sig = assinatura(handMeshesOf(gltf.scene));
  linha.rig = resumoRig(sig);
  linha.assinatura = assinaturaTexto(sig);
  linha.rigHash = hashRig(linha.assinatura);
  linha.rigNome = Object.values(REFERENCIA).find((x) => x.hash === linha.rigHash)?.rig || '?';
  assinaturas.set(r.key, linha.assinatura);
  if (!sig.length) linha.falhas.push('GLB sem malha de mão');
  const prefixo = `${r.weapon}@${r.rota}`;
  for (const [i, faction] of FACCOES.entries()) {
    const style = teamHandStyle(faction);
    const a = await sobe({ id: 'player-a', faction, skin: 0xb78968, sleeve: 0xaa3333, accent: 0xdd2222 });
    const b = await sobe({ id: 'player-b', faction, skin: 0x5a3a28, sleeve: 0x0000ff, accent: 0xff0000 });
    if (mutante === 'luva-crua' && mutaAqui) for (const { m } of handMaterialsOf(a.meshes)) { delete m.userData.teamHands; mutacoes += 1; }
    const ma = handMaterialsOf(a.meshes), mb = handMaterialsOf(b.meshes);
    const semId = ma.filter(({ mesh, m }) => !(m.userData.teamHands?.faction === faction && m.userData.teamHands.style === style.id
      && m.userData.teamHands.layout && m.userData.teamHands.layout === handLayoutOfMesh(mesh)));
    const pbr = ma.filter(({ m }) => m.userData.teamHands && (m.normalMap || m.roughnessMap || m.metalnessMap));
    check(`MÃO1:${prefixo} ${faction}: toda malha de mão leva a identidade do time no atlas do rig`,
      ma.length > 0 && !semId.length && !pbr.length && !(a.fora || []).length,
      semId.length || pbr.length || a.fora?.length ? {
        semIdentidade: semId.map(({ mesh, m }) => `${mesh.name}/${m.name}: ${JSON.stringify(m.userData.teamHands || null)} rig=${handLayoutOfMesh(mesh) || '-'}`),
        pbrDoDonor: pbr.map(({ m }) => m.name), foraDoPacote: (a.fora || []).map((m) => m.name),
      } : undefined);
    const iguais = ma.length === mb.length && ma.every(({ m }, k) => JSON.stringify(m.userData.teamHands) === JSON.stringify(mb[k].m.userData.teamHands) && m.color.equals(mb[k].m.color));
    check(`MÃO2:${prefixo} ${faction}: personagem não muda luva`, ma.length > 0 && iguais);
    check(`MÃO3:${prefixo} ${faction}: dedos seguem direção aprovada`, ma.length > 0 && ma.every(({ m }) => m.userData.teamHands?.fingerless === style.fingerless));
    const proxima = FACCOES[(i + 1) % FACCOES.length], estiloProximo = teamHandStyle(proxima);
    a.setProfile({ id: 'player-a', faction: proxima });
    const depois = handMaterialsOf(a.meshes);
    check(`MÃO4:${prefixo} ${faction}→${proxima}: troca de time alcança toda malha de mão`,
      depois.length > 0 && depois.every(({ m }) => m.userData.teamHands?.faction === proxima && m.userData.teamHands.style === estiloProximo.id));
    a.dispose(); b.dispose();
  }
}

/* RIG: o rig de mão da rota é o rig aprovado da linha dela (hash congelado em REFERENCIA). */
for (const linha of linhas) {
  const prefixo = `RIG:${linha.weapon}@${linha.rota}`;
  if (linha.estado === 'NAO_MEDIDA') continue;
  if (linha.estado === 'ERRO') { check(`${prefixo} (${linha.key}): GLB medido`, false, linha.falhas); continue; }
  const ref = REFERENCIA[linha.linha];
  if (!ref) { check(`${prefixo} (${linha.key}): linha com rig aprovado`, false, `linha ${linha.linha} sem referência`); continue; }
  const ok = linha.rigHash === ref.hash && !linha.falhas.length;
  check(`${prefixo} (${linha.key}): rig de mão = rig ${ref.rig} de ${ref.key}`, ok, ok ? undefined : {
    rigHash: linha.rigHash,
    medido: `rig ${linha.rigNome} ${linha.rigHash}: ${linha.rig}`, esperado: `rig ${ref.rig} ${ref.hash}: ${linhas.find((l) => l.key === ref.key)?.rig || '(referência não medida nesta corrida)'}`,
    igualA: [...assinaturas].filter(([k, a]) => k !== linha.key && a === linha.assinatura).map(([k]) => k),
    falhas: linha.falhas.length ? linha.falhas : undefined,
  });
}

/* ============================== VEREDITO =================================== */
const medidas = new Set(checks.map((c) => c.id.split(' ')[0]));
const vermelhos = [], declarados = [], quitados = [];
for (const c of checks) {
  const chave = c.id.split(' ')[0];
  if (c.ok) continue;
  const divida = Object.hasOwn(DIVIDA, chave) ? DIVIDA[chave] : null;
  if (divida && (!divida.rigHash || divida.rigHash === c.evidence?.rigHash)) declarados.push(c);
  else vermelhos.push(divida ? { ...c, id: `${c.id} — fora da dívida: medido ${c.evidence?.rigHash}, declarado ${divida.rigHash}` } : c);
}
for (const chave of Object.keys(DIVIDA)) {
  if (!medidas.has(chave)) quitados.push(`${chave}: não foi medida nesta corrida (rota sumiu?) — remova da DIVIDA`);
  else if (checks.filter((c) => c.id.split(' ')[0] === chave).every((c) => c.ok)) quitados.push(`${chave}: passou a verde — remova da DIVIDA`);
}
const naoMedidas = linhas.filter((l) => l.estado === 'NAO_MEDIDA');
const ok = !vermelhos.length && !quitados.length;
/* Mutante que não achou onde morder sai 0: o `!` do package.json então reprova (verde cego). */
const naoAplicado = ['troca-rig', 'luva-crua', 'divida-paga'].includes(mutante) && !mutacoes;

if (JSON_OUT) {
  console.log(JSON.stringify({ ok, mutante: mutante || null, rotas: linhas.map(({ assinatura: _, ...l }) => l), vermelhos, declarados, quitados, checks }, null, 2));
} else {
  const porRota = (l) => {
    const prefixo = `${l.weapon}@${l.rota}`;
    const deRota = checks.filter((c) => c.id.split(' ')[0].endsWith(`:${prefixo}`));
    const cl = (n) => { const x = deRota.filter((c) => c.id.startsWith(`${n}:`)); return !x.length ? '-' : x.every((c) => c.ok) ? 'ok' : `${x.filter((c) => !c.ok).length}✗`; };
    const rig = cl('RIG'), divida = declarados.some((d) => d.id.startsWith(`RIG:${prefixo} `)) ? ' (dívida)' : '';
    return `${prefixo.padEnd(20)} ${l.key.padEnd(15)} ${l.estado === 'MEDIDA' ? `MÃO1 ${cl('MÃO1')} MÃO2 ${cl('MÃO2')} MÃO3 ${cl('MÃO3')} MÃO4 ${cl('MÃO4')} RIG ${rig}${divida}` : `${l.estado}${l.motivo ? ` (${l.motivo})` : ''}`}`;
  };
  console.log(`vm-hand-continuity: ${FACCOES.length} facções (${FACCOES.join(',')}), ${linhas.length} rotas de ${WEAPON_IDS.length} armas${mutante ? ` [mutante ${mutante}${['troca-rig', 'luva-crua'].includes(mutante) ? ` em ${MUT_ARMA}` : ''}]` : ''}`);
  for (const l of linhas) console.log(`  ${porRota(l)}`);
  const ref = (k) => linhas.find((l) => l.key === k);
  console.log('  referências de rig:');
  for (const [linha, x] of Object.entries(REFERENCIA)) console.log(`    ${linha.padEnd(5)} rig ${x.rig} ${x.hash} ${x.key.padEnd(12)} ${ref(x.key)?.rig ? `${ref(x.key).rigHash} ${ref(x.key).rig}` : ref(x.key)?.estado || 'fora das rotas'}`);
  /* Fora das cláusulas, de propósito: A/K/L são linhas aprovadas pelo dono (faca, pistola e AK
     em 07/09; fábrica no lançamento). Mostra onde a pintura troca o rig da mesma arma. */
  const trocas = WEAPON_IDS.map((w) => [w, ...['padrao', 'pintura'].map((rota) => linhas.find((l) => l.weapon === w && l.rota === rota))])
    .filter(([, p, q]) => p?.rigHash && q?.rigHash && p.rigHash !== q.rigHash);
  const padrao = Object.entries(Object.groupBy(linhas.filter((l) => l.rota === 'padrao' && l.rigHash), (l) => l.rigNome)).map(([n, ls]) => `${n} em ${ls.length > 3 ? `${ls.length} armas` : ls.map((l) => l.weapon).join(',')}`);
  if (padrao.length) console.log(`  NOTA rig sem pintura: ${padrao.join('; ')}`);
  if (trocas.length) console.log(`  NOTA rig por arma: a pintura troca o rig em ${trocas.length} arma(s): ${trocas.map(([w, p, q]) => `${w} ${p.rigNome}→${q.rigNome}`).join(', ')}`);
  const parte1 = checks.filter((c) => !/^(MÃO\d|RIG):/.test(c.id));
  console.log(`  parte 1 (contrato dos aplicadores): ${parte1.filter((c) => c.ok).length}/${parte1.length}`);
  if (naoMedidas.length) console.log(`  NÃO MEDIDAS (${naoMedidas.length}): ${naoMedidas.map((l) => l.key).join(', ')} — catálogo privado ausente em ${path.relative(ROOT, ASSETS) || ASSETS}; local: --exigir-catalogo`);
  if (declarados.length) {
    console.log(`  DÍVIDA DECLARADA (${declarados.length}) — avisa, não reprova:`);
    for (const d of declarados) console.log(`   ~ ${d.id}\n     medido: ${JSON.stringify(d.evidence)}\n     ${DIVIDA[d.id.split(' ')[0]].motivo}`);
  }
  for (const q of quitados) console.error(`  ✗ DÍVIDA ${q}`);
  for (const v of vermelhos) console.error(`  ✗ ${v.id}${v.evidence === undefined ? '' : `\n     ${JSON.stringify(v.evidence)}`}`);
  console.log(ok ? `  ✓ ${checks.length} cláusulas, ${declarados.length} na dívida declarada, nenhum vermelho novo`
    : `  ✗ ${vermelhos.length} vermelho(s) fora da dívida, ${quitados.length} dívida(s) a remover`);
}
if (naoAplicado) console.error(`  ✗ MUTANTE ${mutante} NÃO APLICADO: ${MUT_ARMA} não tem rota medida nesta corrida`);
process.exitCode = naoAplicado ? 0 : ok ? 0 : 1;
