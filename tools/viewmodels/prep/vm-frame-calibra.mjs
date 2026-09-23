#!/usr/bin/env node
/**
 * Régua de ENQUADRAMENTO e ESCALA NA TELA, arma por arma.
 *
 * O que existia antes desta régua: travas de comprimento em metros sobre a bbox
 * local do GLB (oito armas), e um único gate que projeta na câmera real — só
 * para mosin/svd/sks. Nenhuma media o tamanho de uma arma CONTRA as outras, que
 * é exatamente o defeito que o dono reprovou nos vídeos: seis fuzis de 0,69 m a
 * 0,91 m dividindo o mesmo ponto de câmera, rotação e fov da família `ar`.
 *
 * Esta régua reproduz o caminho do runtime em repouso (sem saque, sem recuo,
 * sem ADS) e mede na tela:
 *   - `dentro`  fração dos vértices da ARMA dentro do quadro;
 *   - `diag`    diagonal aparente da arma em unidades de NDC;
 *   - `centro`  centro aparente em NDC;
 *   - `razao`   `diag` da arma ÷ `diag` da AK golden — a referência aprovada.
 *
 * Com `--sugerir` ela resolve numericamente um override de `frame` por arma
 * (z para casar a razão 1,00; x/y para casar o centro da AK) no formato que
 * `VM_WEAPON[arma].frame` agora aceita. Sugestão não é aprovação: o número
 * fecha a geometria, a imagem continua sendo julgada por gente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';
import { spawnSync } from 'node:child_process';
import * as L from '../../eval/lib/vm-limiares.mjs';

globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(value) { this._src = value; queueMicrotask(() => this.onload?.()); } };
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const warn = console.warn, error = console.error;
console.warn = (...args) => !/Couldn't load texture/.test(String(args[0] || '')) && warn(...args);
console.error = (...args) => !/Couldn't load texture/.test(String(args[0] || '')) && error(...args);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const option = (name, fallback = '') => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const ASPECTS = { '3x2': 1440 / 960, '16x9': 1440 / 810 };
// O alvo NÃO é "toda arma do tamanho da AK": uma Deagle deve aparecer menor que
// um fuzil. O alvo é a ESCALA ANGULAR POR METRO de arma — diagonal aparente
// dividida pelo comprimento declarado em `CFG.len` — constante no arsenal, com
// a AK aprovada fixando a constante. `dentro` vem do Gate F da precisão (≥85%
// da arma no quadro), aqui exigido nos DOIS aspectos.
const RAZAO_TOL = +(option('razao-tol', '0.12'));
const DENTRO_MIN = +(option('dentro-min', '0.85'));
// A LMG tem receiver longo e alimentação lateral. Levá-la ao mesmo tamanho
// angular por metro da AK deixa a alça dentro do near plane quando o runtime
// aplica o ADS de ombro (captura causal lmg-product-final-20260922). O intervalo
// próprio mantém o núcleo legível e o ADS íntegro; caixa/cinto/tampa/bandeja
// continuam sob o gate mecânico lmg-final-verify.
// As faixas por arma moram em tools/eval/lib/vm-limiares.mjs (FAIXA_ESCALA), junto
// das réguas de imagem que medem a mesma coisa: lmg (opção B do #632) e m92 (escala
// real), decisões do dono na integração K (23/09).
const RATIO_BANDS = L.FAIXA_ESCALA;
// Armas curtas: contra a PT-38 APROVADA (L.PISTOLA_APROVADA), não contra a AK.
const CURTAS = new Set(L.ARMAS_CURTAS);
// Raster manda (L.VM_FRAME_INFORMATIVO): razão e braço destas saem como informativos.
const INFORMATIVO = new Set(L.VM_FRAME_INFORMATIVO);
// Mutantes (--mutantes roda todos; cada um TEM de reprovar):
//   pistola-631        a PT-38 com o frame da reescala do #631 (z −0,566): 0,55× da aprovada.
//   curta-na-ak        as curtas voltam a ser medidas contra a AK: a aprovada dá 1,80×.
//   raster-desligado   akm/m92/mp5 deixam de ser informativas: a akm reprova (0,56×).
const MUTANTE = option('mutante');
const MUTANTES_FRAME = { 'pistola-631': 'pistol', 'curta-na-ak': 'pistol', 'raster-desligado': 'akm' };
if (MUTANTE && !MUTANTES_FRAME[MUTANTE]) throw new Error(`mutante desconhecido: ${MUTANTE} (há: ${Object.keys(MUTANTES_FRAME).join(', ')})`);
if (flag('mutantes')) {
  let vivos = 0;
  for (const [nome, arma] of Object.entries(MUTANTES_FRAME)) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${nome}`, `--armas=${arma}`], { encoding: 'utf8', env: process.env });
    const linha = (r.stdout.match(/VM_FRAME_CALIBRA=(.*)/) || [])[1] || '{}';
    const falhas = JSON.parse(linha).failures || [];
    const mordeu = r.status !== 0 && falhas.some((f) => f.startsWith(`${arma} `));
    if (!mordeu) vivos += 1;
    console.log(`  mutante ${nome.padEnd(17)} ${mordeu ? 'VERMELHO (mordeu)' : 'VERDE — NÃO MORDEU'}  ${falhas.filter((f) => f.startsWith(`${arma} `))[0] || ''}`);
  }
  if (vivos) { console.log(`vm-frame: ${vivos} mutante(s) não morderam`); process.exit(1); }
}
// Orçamento de tela do braço, em múltiplos da silhueta da AK aprovada. Folga de
// 40% porque a pose do braço varia legitimamente entre famílias; acima disso a
// manga passou a ser o assunto do quadro, que é o defeito visto em 18/09.
const BRACO_MAX = +(option('braco-max', '1.4'));

const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const { weaponCFG } = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);
const comprimento = (weapon) => weaponCFG(weapon).len || 0.9;
const source = fs.readFileSync(path.join(ROOT, 'public/js/authoredvm.js'), 'utf8');
// FAMILY_FRAME é a fonte de verdade do runtime: extraída do módulo, não copiada.
const familyFrameLiteral = source.slice(source.indexOf('const FAMILY_FRAME = Object.freeze({'));
const FAMILY_FRAME = (new Function(`return ${familyFrameLiteral.slice(familyFrameLiteral.indexOf('{'), familyFrameLiteral.indexOf('});') + 1)}`))();
const HAND_MATERIAL = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;

// LIMITE CONHECIDO desta régua: ela amostra só a ARMA — materiais de mão são
// descartados de propósito, para a escala não depender da pose do braço. O
// preço apareceu na captura: aproximar a arma da câmera traz a manga junto, e
// em lmg, mosin, sks, svd, shotgun e p90 o antebraço passou a dominar o quadro
// com a arma dentro do alvo. Por isso a medida só foi aplicada às onze armas
// validadas na imagem; fechar as outras treze exige medir também a fração de
// quadro ocupada pelas mãos e resolver as duas coisas juntas.
const manifests = ['rifle', 'smg', 'sidearm', 'dmr', 'precision', 'heavy']
  .map((name) => path.join(ROOT, 'tools/viewmodels', `${name}-candidates.json`))
  .filter((file) => fs.existsSync(file))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
const candidates = Object.assign({}, ...manifests.map((manifest) => manifest.candidates || {}));
// A AK é a referência: golden pública, versionada no Git, fora dos manifestos.
const AK_FILE = path.join(ROOT, 'public/models/viewmodels/coro/ak-hires.glb');

const loader = new GLTFLoader();
const parse = async (file) => {
  const bytes = fs.readFileSync(file);
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};

/** Vértices da arma (sem mãos), deformados na pose de repouso, em espaço de câmera. */
function weaponPoints(gltf, { pose = 'idle', weapon = null } = {}) {
  const scene = gltf.scene;
  let camera = null;
  scene.updateMatrixWorld(true);
  scene.traverse((object) => { if (!camera && object.isPerspectiveCamera) camera = object; });
  if (!camera) throw new Error('pacote sem câmera viewmodel');
  camera.updateMatrixWorld(true);
  const fovEmbutido = camera.fov;
  const inverse = camera.matrixWorld.clone().invert();
  camera.removeFromParent();
  // Repouso = primeiro quadro do idle, como o jogador vê a arma parada.
  const clip = gltf.animations.find((candidate) => candidate.name.toLowerCase() === pose);
  if (clip) {
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(clip).reset().play();
    mixer.setTime(0);
  }
  scene.applyMatrix4(inverse);
  scene.updateMatrixWorld(true);
  const points = [];
  const donos = [];
  // Mão e manga entram numa lista PRÓPRIA. Elas não podem contaminar a escala
  // da arma (dependem da pose do braço), mas precisam ser medidas: aproximar a
  // arma traz o antebraço junto, e foi assim que a calibração de 18/09 deixou
  // seis armas com a manga dominando a tela.
  const maos = [];
  const vertex = new THREE.Vector3();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const ehMao = materials.some((material) => HAND_MATERIAL.test(material?.name || ''));
    const position = object.geometry?.attributes?.position;
    if (!position) return;
    const lmgCore = weapon === 'lmg' && materials.some((material) => /CoroSolto_MG6/i.test(material?.name || ''));
    if (weapon === 'lmg' && materials.some((material) => /CoroSolto_Bullet/i.test(material?.name || ''))) return;
    const skinIndex = lmgCore ? object.geometry?.attributes?.skinIndex : null;
    const skinWeight = lmgCore ? object.geometry?.attributes?.skinWeight : null;
    // Amostragem regular: a medida é de silhueta, não precisa de malha inteira.
    const step = Math.max(1, Math.floor(position.count / 3000));
    for (let index = 0; index < position.count; index += step) {
      if (skinIndex && skinWeight) {
        const indices = [skinIndex.getX(index), skinIndex.getY(index), skinIndex.getZ(index), skinIndex.getW(index)];
        const weights = [skinWeight.getX(index), skinWeight.getY(index), skinWeight.getZ(index), skinWeight.getW(index)];
        let dominant = 0;
        for (let lane = 1; lane < 4; lane += 1) if (weights[lane] > weights[dominant]) dominant = lane;
        if (object.skeleton?.bones?.[indices[dominant]]?.name !== 'neutral_bone') continue;
      }
      vertex.fromBufferAttribute(position, index);
      // O shader faz `matrixWorld · bindMatrixInverse · skin · bindMatrix · v`:
      // `applyBoneTransform` cobre só o miolo. Sem o `matrixWorld` a escala do
      // rig (0,01 nos pacotes em centímetro) fica de fora e a medida explode.
      if (object.isSkinnedMesh) object.applyBoneTransform(index, vertex);
      vertex.applyMatrix4(object.matrixWorld);
      (ehMao ? maos : points).push(vertex.clone());
      if (!ehMao) donos.push(object.name || object.uuid.slice(0, 8));
    }
  });
  if (!points.length) throw new Error('nenhum vértice de arma amostrado');
  // Sockets do contrato de mira (R6). Existem nas 24 e nenhuma régua os usava.
  const socket = (pat) => {
    let found = null;
    scene.traverse((object) => { if (!found && pat.test(object.name || '')) found = object; });
    return found ? found.getWorldPosition(new THREE.Vector3()) : null;
  };
  return { points, maos, donos, fovEmbutido, muzzle: socket(/MUZZLE/i), sight: socket(/SIGHT/i) };
}

/**
 * Projeta os pontos com o mount do runtime em repouso e mede na tela.
 * A extensão sai por PERCENTIL, não por min/max: vários pacotes carregam uma
 * malha perdida longe da arma (lente, variante de mundo, sobra do doador) e um
 * único vértice a 100 m inflava a caixa — a AWP media 265× a AK, a MP5 2.676×.
 * O percentil descreve a silhueta que o jogador enxerga; as malhas fora da
 * silhueta saem no diagnóstico `--malhas`, em vez de contaminar a medida.
 */
const PERCENTIL = +(option('percentil', '0.02'));
function measure(points, frame, aspect) {
  const mount = new THREE.Object3D();
  const rot = frame.rotDeg || [0, 0, 0];
  mount.rotation.set(rot[0] * THREE.MathUtils.DEG2RAD, rot[1] * THREE.MathUtils.DEG2RAD, rot[2] * THREE.MathUtils.DEG2RAD);
  mount.position.set(frame.x, frame.y, frame.z);
  mount.updateMatrixWorld(true);
  const half = Math.tan(frame.fov * THREE.MathUtils.DEG2RAD / 2);
  const vertex = new THREE.Vector3();
  const xs = [], ys = [];
  let dentro = 0, atras = 0;
  for (const point of points) {
    vertex.copy(point).applyMatrix4(mount.matrixWorld);
    const depth = -vertex.z;
    if (depth <= 1e-6) { atras += 1; continue; }
    const ndcX = vertex.x / (depth * half * aspect);
    const ndcY = vertex.y / (depth * half);
    if (ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1) dentro += 1;
    xs.push(ndcX); ys.push(ndcY);
  }
  if (!xs.length) return { dentro: 0, atras: 1, diag: null, centro: [null, null], caixa: null };
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const at = (list, q) => list[Math.min(list.length - 1, Math.max(0, Math.round(q * (list.length - 1))))];
  const minX = at(xs, PERCENTIL), maxX = at(xs, 1 - PERCENTIL);
  const minY = at(ys, PERCENTIL), maxY = at(ys, 1 - PERCENTIL);
  return {
    dentro: +(dentro / points.length).toFixed(4),
    atras: +(atras / points.length).toFixed(4),
    diag: +Math.hypot(maxX - minX, maxY - minY).toFixed(4),
    centro: [+((minX + maxX) / 2).toFixed(4), +((minY + maxY) / 2).toFixed(4)],
    caixa: [+minX.toFixed(3), +minY.toFixed(3), +maxX.toFixed(3), +maxY.toFixed(3)],
  };
}

// Mesma precedência do runtime: família ← medida gerada ← override manual.
// Sem `--cru`, a régua mede o estado que o jogo serve hoje; com `--cru`, mede o
// estado sem a medida aplicada (é assim que ela reprova o estado anterior).
const framePath = path.join(ROOT, 'public/js/data/vmframe.js');
const VM_FRAME = (!flag('cru') && fs.existsSync(framePath))
  ? (await import(pathToFileURL(framePath).href)).VM_FRAME : {};
const frameFor = (weapon) => {
  const family = VM_WEAPON[weapon]?.family;
  const base = FAMILY_FRAME[family] || FAMILY_FRAME.default;
  const own = VM_WEAPON[weapon]?.frame;
  return {
    ...base,
    ...(VM_FRAME[weapon] || {}),
    ...(own && typeof own === 'object' ? own : {}),
  };
};

/**
 * Resolve um override: z pela razão de tamanho, x/y pelo centro da referência.
 * `diag` CRESCE quando z se aproxima da câmera. A arma tem de ficar à frente do
 * plano near, senão a projeção degenera e a solução de x/y explode.
 */
const Z_MAX = -0.06;
function suggest(points, frame, aspect, alvo) {
  const candidate = { ...frame };
  const diagAt = (z) => measure(points, { ...candidate, z }, aspect).diag ?? Infinity;
  const longe = Math.min(frame.z - 2.4, Z_MAX - 2.4);
  if (diagAt(longe) > alvo.diag) return { ...candidate, inalcancavel: `nem a ${longe.toFixed(2)} m a silhueta encolhe até o alvo` };
  if (diagAt(Z_MAX) < alvo.diag) return { ...candidate, inalcancavel: 'nem junto ao plano near a silhueta cresce até o alvo' };
  // z e centro não são independentes: perto da borda a perspectiva alarga a
  // silhueta, então corrigir o centro muda o tamanho. Alterna os dois até
  // fechar — resolver uma vez cada deixava as armas 0,67–0,86× do alvo.
  for (let volta = 0; volta < 6; volta += 1) {
    let lo = longe, hi = Z_MAX;
    for (let step = 0; step < 60; step += 1) {
      const mid = (lo + hi) / 2;
      if (diagAt(mid) > alvo.diag) hi = mid; else lo = mid;
    }
    candidate.z = +((lo + hi) / 2).toFixed(4);
    const now = measure(points, candidate, aspect);
    if (now.centro[0] === null) break;
    const half = Math.tan(candidate.fov * THREE.MathUtils.DEG2RAD / 2);
    const depth = -candidate.z;
    candidate.x = +(candidate.x + (alvo.centro[0] - now.centro[0]) * depth * half * aspect).toFixed(4);
    candidate.y = +(candidate.y + (alvo.centro[1] - now.centro[1]) * depth * half).toFixed(4);
  }
  const fechado = measure(points, candidate, aspect);
  candidate.residuo = { razao: +(fechado.diag / alvo.diag).toFixed(3), centro: fechado.centro };
  return candidate;
}

const alvoAspect = ASPECTS[option('alvo-aspecto', '3x2')];
const reference = weaponPoints(await parse(AK_FILE));
// A AK golden não passa pelo FAMILY_FRAME: usa a câmera embutida e frame zero.
const akFrame = { x: 0, y: 0, z: 0, fov: reference.fovEmbutido };
const alvoAk = measure(reference.points, akFrame, alvoAspect);
// Constante do arsenal: diagonal aparente por metro de arma, fixada pela AK.
const ESCALA_ALVO = alvoAk.diag / comprimento('ak');
const alvoPara = (weapon) => ({ ...alvoAk, diag: +(ESCALA_ALVO * comprimento(weapon)).toFixed(4) });

// Referência das curtas: o produto da PT-38 APROVADA no frame aprovado, por aspecto
// (a pistola aprovada dá 1,000 nos dois). Produto com outro sha256 não é a aprovada.
const pistolaRef = {};
{
  const cfg = candidates.pistol;
  const file = cfg ? path.join(ASSET_ROOT, cfg.file) : null;
  const sha = cfg?.sha256 || cfg?.productSha256 || '';
  if (!file || !fs.existsSync(file)) pistolaRef.erro = 'produto da PT-38 ausente: sem referência para as curtas';
  else if (!sha.startsWith(L.PISTOLA_APROVADA.produto)) pistolaRef.erro = `PT-38 do manifesto (${sha.slice(0, 10)}) não é a aprovada (${L.PISTOLA_APROVADA.produto}): referência das curtas inválida`;
  else {
    const p = weaponPoints(await parse(file), { weapon: 'pistol' });
    for (const [tag, aspect] of Object.entries(ASPECTS)) {
      const m = measure(p.points, L.PISTOLA_APROVADA.frame, aspect);
      const b = p.maos.length ? measure(p.maos, L.PISTOLA_APROVADA.frame, aspect) : null;
      pistolaRef[tag] = { escala: m.diag / comprimento('pistol'), bracoDiag: b?.diag ?? null };
    }
  }
}

const only = option('armas') ? new Set(option('armas').split(',').filter(Boolean)) : null;
const rows = [];
const failures = [];
const informativos = [];
for (const [weapon, cfg] of Object.entries(candidates)) {
  if (only && !only.has(weapon)) continue;
  const file = path.join(ASSET_ROOT, cfg.file);
  if (!fs.existsSync(file)) { failures.push(`produto ausente: ${weapon} (${file})`); continue; }
  let sampled;
  try { sampled = weaponPoints(await parse(file), { weapon }); }
  catch (problem) { failures.push(`${weapon}: ${problem.message}`); continue; }
  const frame = frameFor(weapon);
  if (MUTANTE === 'pistola-631' && weapon === 'pistol') Object.assign(frame, { x: 0.1648, y: -0.19, z: -0.5664 });
  const curta = CURTAS.has(weapon) && MUTANTE !== 'curta-na-ak';
  const informativo = INFORMATIVO.has(weapon) && MUTANTE !== 'raster-desligado';
  const ratioBand = curta ? { ...L.PISTOLA_APROVADA.faixa, reason: 'curta: por metro contra a PT-38 aprovada (dono, 23/09)' }
    : RATIO_BANDS[weapon] || { min: 1 - RAZAO_TOL, max: 1 + RAZAO_TOL };
  const row = { weapon, family: VM_WEAPON[weapon]?.family, frame, ratioBand, referencia: curta ? 'pistol-aprovada' : 'ak', informativo, aspectos: {} };
  // Reprovação de tamanho/braço de arma informativa vira nota: o raster do #636 manda.
  const reprova = (msg) => (informativo ? informativos : failures).push(msg);
  for (const [tag, aspect] of Object.entries(ASPECTS)) {
    const measured = measure(sampled.points, frame, aspect);
    if (curta && pistolaRef.erro) { failures.push(`${weapon} ${tag}: ${pistolaRef.erro}`); row.aspectos[tag] = measured; continue; }
    const escala = curta ? pistolaRef[tag].escala : ESCALA_ALVO;
    measured.razao = +(measured.diag / (escala * comprimento(weapon))).toFixed(3);
    // R2: o braço é presença de tela e tem de caber no orçamento junto com a
    // arma. Sem esta coluna, empurrar a arma para o alvo joga a manga por cima
    // do quadro e a régua aplaude. Curtas: contra o braço da PT-38 aprovada.
    const braco = sampled.maos.length ? measure(sampled.maos, frame, aspect) : null;
    measured.bracoDiag = braco?.diag ?? null;
    const bracoRef = curta ? pistolaRef[tag].bracoDiag : ESCALA_ALVO * comprimento('ak');
    measured.bracoRazao = braco && bracoRef ? +(braco.diag / bracoRef).toFixed(3) : null;
    row.aspectos[tag] = measured;
    const quem = curta ? 'da PT-38 aprovada' : 'da AK';
    if (measured.dentro < DENTRO_MIN) failures.push(`${weapon} ${tag}: só ${(measured.dentro * 100).toFixed(1)}% da arma no quadro`);
    if (measured.razao < ratioBand.min || measured.razao > ratioBand.max) reprova(`${weapon} ${tag}: ${measured.razao}× a escala angular por metro ${curta ? 'da PT-38 aprovada' : 'do arsenal'} (faixa ${ratioBand.min}–${ratioBand.max})`);
    if (measured.bracoRazao !== null && measured.bracoRazao > BRACO_MAX) {
      reprova(`${weapon} ${tag}: braço ocupa ${measured.bracoRazao}× a silhueta ${quem}`);
    }
  }
  // R6: eixo de mira. A boca do cano tem de estar à frente da alça e o eixo
  // alça→boca tem de apontar para onde a câmera olha, senão a arma mente sobre
  // a trajetória. Aqui é medida de repouso; o aceite do ADS é etapa própria.
  if (sampled.sight && sampled.muzzle) {
    const eixo = sampled.muzzle.clone().sub(sampled.sight).normalize();
    row.miraGrau = +(eixo.angleTo(new THREE.Vector3(0, 0, -1)) * 180 / Math.PI).toFixed(1);
    row.canoAFrente = sampled.muzzle.z < sampled.sight.z;
    if (!row.canoAFrente) failures.push(`${weapon}: boca do cano atrás da alça de mira`);
  } else {
    failures.push(`${weapon}: sem socket de mira ou de boca do cano`);
  }
  if (flag('malhas')) {
    // Quem empurra a silhueta: separa a arma de verdade das malhas perdidas.
    const porMalha = new Map();
    for (let index = 0; index < sampled.points.length; index += 1) {
      const nome = sampled.donos[index];
      if (!porMalha.has(nome)) porMalha.set(nome, []);
      porMalha.get(nome).push(sampled.points[index]);
    }
    row.malhas = [...porMalha.entries()]
      .map(([nome, pontos]) => ({ nome, vertices: pontos.length, ...measure(pontos, frame, alvoAspect) }))
      .sort((a, b) => (b.diag ?? 0) - (a.diag ?? 0));
  }
  if (flag('sugerir')) row.sugestao = suggest(sampled.points, frame, alvoAspect, alvoPara(weapon));
  rows.push(row);
}

const report = {
  schemaVersion: 1, kind: 'vm-frame-calibra',
  referencia: { arma: 'ak', arquivo: path.relative(ROOT, AK_FILE), fov: +akFrame.fov.toFixed(2), comprimento: comprimento('ak'), escalaPorMetro: +ESCALA_ALVO.toFixed(4), ...alvoAk },
  limites: { razaoTolerancia: RAZAO_TOL, razaoPorArma: RATIO_BANDS, curtas: { armas: [...CURTAS], ...L.PISTOLA_APROVADA }, informativas: [...INFORMATIVO], dentroMinimo: DENTRO_MIN, alvoAspecto: option('alvo-aspecto', '3x2') },
  armas: rows, failures, informativos,
};
const out = option('out');
if (out) fs.writeFileSync(path.resolve(out), `${JSON.stringify(report, null, 2)}\n`);
// Valor medido mora em módulo GERADO, não copiado à mão para o vmconfig: a
// procedência (data, referência, resíduo) fica junto do número, e recalibrar é
// rodar a régua de novo. `VM_WEAPON[arma].frame` continua valendo como override
// manual acima deste arquivo.
const escrever = option('escrever');
if (escrever) {
  const linhas = [];
  for (const row of rows) {
    const s = row.sugestao;
    if (!s || s.inalcancavel) continue;
    linhas.push(`  ${row.weapon}: { x: ${s.x}, y: ${s.y}, z: ${s.z} },`);
  }
  const naoFechadas = rows.filter((row) => row.sugestao?.inalcancavel)
    .map((row) => `//   ${row.weapon}: ${row.sugestao.inalcancavel}`);
  const corpo = `// GERADO por tools/viewmodels/prep/vm-frame-calibra.mjs — não editar à mão.
// Enquadramento por ARMA, medido na câmera real do runtime em repouso.
${naoFechadas.length ? `// Não fecharam pela geometria do próprio produto (asset, não enquadramento):\n${naoFechadas.join('\n')}\n` : ''}
export const VM_FRAME = Object.freeze({
${linhas.join('\n')}
});
`;
  fs.writeFileSync(path.resolve(ROOT, escrever), corpo);
  console.log(`escrito ${escrever} com ${linhas.length} armas`);
}
console.log(`VM_FRAME_CALIBRA=${JSON.stringify({ ok: failures.length === 0, armas: rows.length, failures, informativos, ...(MUTANTE ? { mutante: MUTANTE } : {}) })}`);
if (flag('tabela')) {
  console.log(`\nreferência AK: diag ${alvoAk.diag} por ${comprimento('ak')} m → ${ESCALA_ALVO.toFixed(4)}/m · centro [${alvoAk.centro}] · fov ${akFrame.fov.toFixed(1)}\n`);
  if (pistolaRef['3x2']) console.log(`referência das curtas: PT-38 aprovada (${L.PISTOLA_APROVADA.produto}, frame z ${L.PISTOLA_APROVADA.frame.z}) → ${pistolaRef['3x2'].escala.toFixed(4)}/m em 3:2, ${(pistolaRef['3x2'].escala / ESCALA_ALVO).toFixed(3)}× a da AK\n`);
  console.log('arma        fam       razão3x2 dentro3x2 razão16x9 dentro16x9  centro3x2        contra');
  for (const row of rows.sort((a, b) => a.aspectos['3x2'].razao - b.aspectos['3x2'].razao)) {
    const a = row.aspectos['3x2'], b = row.aspectos['16x9'];
    const contra = row.referencia === 'pistol-aprovada' ? 'PT-38 aprovada' : row.informativo ? 'AK (informativa: raster manda)' : RATIO_BANDS[row.weapon] ? `AK (faixa ${row.ratioBand.min}–${row.ratioBand.max})` : 'AK';
    console.log(`${row.weapon.padEnd(11)} ${String(row.family).padEnd(9)} ${String(a.razao).padStart(7)} ${String((a.dentro * 100).toFixed(1) + '%').padStart(9)} ${String(b.razao).padStart(9)} ${String((b.dentro * 100).toFixed(1) + '%').padStart(10)}  [${a.centro}]  ${contra}`);
  }
  for (const nota of informativos) console.log(`INFORMATIVO (raster manda) ${nota}`);
}
if (failures.length) process.exitCode = 1;
