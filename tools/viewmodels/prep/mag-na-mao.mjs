#!/usr/bin/env node
/**
 * Prende o carregador (ou clipe) à mão durante a recarga de um produto K já assado.
 *
 * Reescreve SÓ os canais da peça nos clipes pedidos: a pose-alvo é
 * `mão(t) · H`, com `H` desenhado num instante-âncora (receita `desenho`, na
 * tela do jogo), misturada com a pose original nas janelas de saída e de volta
 * ao encaixe. Braços, arma e demais clipes ficam byte a byte.
 * Receitas por arma: `mag-na-mao.json`. Produto fica fora do Git.
 *
 * Uso: node tools/viewmodels/prep/mag-na-mao.mjs --arma=mp5 --source=<glb> --output-dir=<fora-do-git>
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, blend, duration, gravarClipe, smooth } from './fk-gltf.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const arma = option('arma');
const receitas = JSON.parse(await fs.readFile(path.join(HERE, 'mag-na-mao.json'), 'utf8'));
const receita = receitas[arma];
if (!receita) throw new Error(`sem receita para ${arma}; uso: --arma=<id> --source=<glb> --output-dir=<dir>`);
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!option('source') || !option('output-dir')) throw new Error('uso: --arma=<id> --source=<glb> --output-dir=<dir>');
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== receita.sourceSha256) throw new Error(`fonte ${arma} divergente: ${digest(sourceBytes)}`);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => {
  const node = root.listNodes().find((candidate) => candidate.getName() === name);
  if (!node) throw new Error(`${arma}: nó ${name} ausente`);
  return node;
};

const rad = (deg) => (deg || [0, 0, 0]).map((value) => THREE.MathUtils.degToRad(value));

// Pose desenhada no espaço da câmera do GLB: o eixo `desce` da peça aponta para
// `baixo`, a face `frente` olha para `olha`, e o ponto `pega` cai no centro dos ossos `centro`.
function naCamera(pose, atual, desenho) {
  const camera = pose.world(desenho.camera || 'VIEWMODEL_CAMERA');
  const camRot = new THREE.Matrix4().extractRotation(camera);
  // `tela` = rotDeg do enquadramento no runtime (mount, Euler XYZ): as direções
  // da receita são as da tela do jogo, não as da câmera crua do GLB.
  const tela = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rad(desenho.tela), 'XYZ')).invert();
  const paraMundo = (v) => new THREE.Vector3(...v).normalize().applyMatrix4(tela).applyMatrix4(camRot);
  // Base ortonormal (desce, frente⊥, lateral) na peça e no alvo; rotação = alvo · peça⁻¹.
  const orto = (d, f) => { const fz = f.clone().sub(d.clone().multiplyScalar(f.dot(d))).normalize(); const x = new THREE.Vector3().crossVectors(d, fz); return new THREE.Matrix4().makeBasis(x, d, fz); };
  const rot = orto(paraMundo(desenho.baixo), paraMundo(desenho.olha))
    .multiply(orto(new THREE.Vector3(...desenho.desce).normalize(), new THREE.Vector3(...desenho.frente).normalize()).invert());
  const escala = new THREE.Vector3(); atual.decompose(new THREE.Vector3(), new THREE.Quaternion(), escala);
  const alvo = new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromRotationMatrix(rot), escala);
  const centro = desenho.centro.map((nome) => pose.pos(nome))
    .reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / desenho.centro.length);
  centro.add(new THREE.Vector3(...(desenho.deslocCam || [0, 0, 0])).applyMatrix4(tela).applyMatrix4(camRot));
  const pega = new THREE.Vector3(...desenho.pega).applyMatrix4(alvo);
  alvo.setPosition(centro.sub(pega));
  return alvo;
}

// Corpo de pente em prisma chanfrado ao longo de X (caixa no espaço da peça), para
// peça cortada da arma que não tem volume de carregador (a crista da P90).
function corpoDePente(no, corpo) {
  const [x0, y0, z0] = corpo.min; const [x1, y1, z1] = corpo.max; const c = corpo.chanfro || 0;
  const secao = [[y0, z0 + c], [y0, z1 - c], [y0 + c, z1], [y1 - c, z1], [y1, z1 - c], [y1, z0 + c], [y1 - c, z0], [y0 + c, z0]];
  const pos = []; const nor = []; const idx = [];
  const quad = (a, b, cc, d, n) => { const base = pos.length / 3; for (const v of [a, b, cc, d]) { pos.push(...v); nor.push(...n); } idx.push(base, base + 1, base + 2, base, base + 2, base + 3); };
  for (let i = 0; i < secao.length; i += 1) {
    const [ya, za] = secao[i]; const [yb, zb] = secao[(i + 1) % secao.length];
    const n = new THREE.Vector3(0, zb - za, -(yb - ya)).normalize().negate();
    quad([x0, ya, za], [x0, yb, zb], [x1, yb, zb], [x1, ya, za], n.toArray());
  }
  for (const [x, sinal] of [[x0, -1], [x1, 1]]) {
    const base = pos.length / 3;
    for (const [y, z] of secao) { pos.push(x, y, z); nor.push(sinal, 0, 0); }
    for (let i = 1; i < secao.length - 1; i += 1) idx.push(...(sinal > 0 ? [base, base + i, base + i + 1] : [base, base + i + 1, base + i]));
  }
  const material = document.createMaterial(corpo.material).setBaseColorFactor(corpo.cor)
    .setRoughnessFactor(corpo.aspereza ?? 0.55).setMetallicFactor(corpo.metal ?? 0).setDoubleSided(true);
  const acc = (tipo, arr, nome) => document.createAccessor(nome).setType(tipo).setArray(arr).setBuffer(root.listBuffers()[0]);
  const prim = document.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', acc('VEC3', new Float32Array(pos), `${corpo.material}_pos`))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(nor), `${corpo.material}_nor`))
    .setIndices(acc('SCALAR', new Uint16Array(idx), `${corpo.material}_idx`));
  no.getMesh().addPrimitive(prim);
  return { vertices: pos.length / 3, triangulos: idx.length / 3 };
}

const peca = byName(receita.node);
const corpoCriado = receita.corpo ? corpoDePente(peca, receita.corpo) : null;
const pose = new Pose(document);
const relatorio = [];
for (const [clipName, janela] of Object.entries(receita.clips)) {
  const duracao = duration(pose.clip(clipName));
  // `fora: "repouso"` ignora o trajeto antigo da peça fora da mão (a P90 herdou o
  // do pente de baixo da G3 e girava em torno da origem da arma).
  const semPeca = (janela.fora || receita.fora) === 'repouso';
  const original = (t) => pose.set(clipName, t, semPeca ? peca : null).world(peca);
  const desenho = janela.desenho || receita.desenho;
  const atual = original(janela.ancora);
  const alvoAncora = naCamera(pose.set(clipName, janela.ancora), atual, desenho);
  const H = pose.set(clipName, janela.ancora).world(receita.hand).invert().multiply(alvoAncora);
  const [a, b, c, d] = janela.tempos;
  const tempos = [];
  for (let t = 0; t < duracao - 1e-6; t += 1 / 30) tempos.push(+t.toFixed(5));
  tempos.push(duracao);
  const quadros = [];
  let maxSalto = 0; let anterior = null;
  for (const t of tempos) {
    let alvo = original(t);
    pose.set(clipName, t, peca);
    if (t >= a && t <= d) {
      const peso = t < b ? smooth((t - a) / Math.max(1e-6, b - a)) : t > c ? 1 - smooth((t - c) / Math.max(1e-6, d - c)) : 1;
      alvo = blend(alvo, pose.world(receita.hand).multiply(H), peso);
      // `arco`: na ida e na volta a peça passa por cima da arma (eixo +Y do encaixe), sem atravessá-la.
      if (janela.arco && peso > 0 && peso < 1) {
        const cima = new THREE.Vector3().setFromMatrixColumn(original(t), 1).normalize();
        alvo.setPosition(new THREE.Vector3().setFromMatrixPosition(alvo).addScaledVector(cima, janela.arco * Math.sin(Math.PI * peso)));
        pose.set(clipName, t, peca);
      }
    }
    quadros.push(pose.localFor(peca, alvo));
    const mundo = new THREE.Vector3().setFromMatrixPosition(alvo);
    if (anterior) maxSalto = Math.max(maxSalto, mundo.distanceTo(anterior));
    anterior = mundo;
  }
  gravarClipe(document, clipName, tempos, new Map([[peca, quadros]]));
  relatorio.push({ clip: clipName, duracao: +duracao.toFixed(3), tempos: janela.tempos, ancora: janela.ancora, amostras: tempos.length, maxSaltoPorQuadro: +maxSalto.toFixed(4) });
}

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, path.basename(receita.file));
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: arma, node: receita.node, hand: receita.hand, corpo: corpoCriado,
  source: { file: source, bytes: sourceBytes.length, sha256: receita.sourceSha256 },
  clips: relatorio, product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, `${arma}-mag-na-mao.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`MAG_NA_MAO_OK ${JSON.stringify(report)}`);
