#!/usr/bin/env node
/** Fábrica — clipes do pack no GLB base, com os nomes do jogo.
 *
 * Derivado de tools/viewmodels/assemble_paid_family.mjs, sem os ajustes por
 * família (magTranslationScale, magGrip, supportGrip): a zona de contato é o
 * pack como autorado. Braço: FBX ASCII do pack via Assimp, reamostrado a 60 Hz
 * com a raiz FBX dobrada nos três ossos de topo. Arma: FBX via Blender
 * (blender/clipe_arma.py, fps do arquivo), rebase pelo pivô da fonte; tempo nativo. Clipe só de arma
 * (tiro sem braço) ganha o idle do braço; clipe só de braço (saque geral) ganha
 * a arma parada.
 *
 * Uso: node tools/fabrica/clipes.mjs <plano.json>
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { AnimationMixer, LoopOnce, Matrix4, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { BLENDER, RAIZ_REPO, foraDoRepo, lerJson } from './lib/comum.mjs';

const ASSIMP = process.env.ASSIMP || '/opt/homebrew/bin/assimp';
const FPS = 60;
const TOPO = new Set(['ik_foot_root', 'ik_hand_root', 'pelvis']);

function assimp(fonte, saida) {
  const r = spawnSync(ASSIMP, ['export', fonte, saida, '-fglb2'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`Assimp falhou em ${fonte}:\n${r.stdout}\n${r.stderr}`);
}

function blenderArma(fonte, saida) {
  const script = path.join(RAIZ_REPO, 'tools/fabrica/blender/clipe_arma.py');
  const r = spawnSync(BLENDER, ['-b', '--python-exit-code', '1', '--python', script, '--', fonte, saida], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.includes('FABRICA_CLIPE_ARMA=')) {
    throw new Error(`Blender falhou em ${fonte}:\n${r.stdout.slice(-800)}\n${r.stderr.slice(-400)}`);
  }
}

// Tira malha/skin/material do GLB de animação: só a hierarquia e as trilhas importam.
async function soAnimacao(arquivo) {
  const glb = await fs.readFile(arquivo);
  const pedacos = [];
  for (let o = 12; o < glb.length;) {
    const n = glb.readUInt32LE(o);
    pedacos.push({ tipo: glb.readUInt32LE(o + 4), dado: glb.subarray(o + 8, o + 8 + n) });
    o += 8 + n;
  }
  const js = pedacos.find((p) => p.tipo === 0x4e4f534a);
  const json = JSON.parse(js.dado.toString('utf8').replace(/\0+$/g, ''));
  for (const node of json.nodes || []) { delete node.mesh; delete node.skin; }
  for (const k of ['meshes', 'skins', 'materials', 'textures', 'images', 'samplers']) delete json[k];
  const bytes = Buffer.from(JSON.stringify(json), 'utf8');
  js.dado = Buffer.alloc(Math.ceil(bytes.length / 4) * 4, 0x20);
  bytes.copy(js.dado);
  const total = 12 + pedacos.reduce((s, p) => s + 8 + p.dado.length, 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  let o = 12;
  for (const p of pedacos) { out.writeUInt32LE(p.dado.length, o); out.writeUInt32LE(p.tipo, o + 4); p.dado.copy(out, o + 8); o += 8 + p.dado.length; }
  await fs.writeFile(arquivo, out);
}

async function carregarAnimacao(arquivo) {
  const b = await fs.readFile(arquivo);
  const gltf = await new Promise((ok, erro) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', ok, erro));
  if (gltf.animations.length !== 1) throw new Error(`esperava 1 animação em ${arquivo}, veio ${gltf.animations.length}`);
  return gltf;
}

const matrizDoNo = (n) => new Matrix4().compose(
  new Vector3().fromArray(n.getTranslation()), new Quaternion().fromArray(n.getRotation()), new Vector3().fromArray(n.getScale()));

function empurrarQuat(valores, q, anterior) {
  if (anterior && anterior.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
  valores.push(q.x, q.y, q.z, q.w);
  return q.clone();
}

function amostrar(gltf, alvos, { dobrarRaiz = false, nos }) {
  const mixer = new AnimationMixer(gltf.scene);
  const clip = gltf.animations[0];
  const acao = mixer.clipAction(clip);
  acao.setLoop(LoopOnce, 0); acao.clampWhenFinished = true; acao.play();
  const quadros = Math.round(clip.duration * FPS);
  const tempos = new Float32Array(quadros + 1);
  const m = new Matrix4(), p = new Vector3(), q = new Quaternion(), s = new Vector3();
  let conversao = null;
  if (dobrarRaiz) {
    const fonte = gltf.scene.getObjectByName('ik_hand_root');
    const alvo = nos.get('ik_hand_root');
    if (!fonte || !alvo) throw new Error('sem ik_hand_root para dobrar a raiz FBX');
    fonte.updateMatrix();
    conversao = matrizDoNo(alvo).multiply(fonte.matrix.clone().invert());
  }
  const trilhas = new Map();
  for (const nome of alvos) {
    const fonte = gltf.scene.getObjectByName(nome);
    if (!fonte) continue;
    fonte.updateMatrix();
    const alvo = dobrarRaiz ? null : nos.get(nome);
    const rebase = alvo ? { inv: fonte.matrix.clone().invert(), rest: matrizDoNo(alvo) } : null;
    trilhas.set(nome, { t: [], r: [], s: [], ant: null, fonte, rebase });
  }
  for (let f = 0; f <= quadros; f += 1) {
    const tempo = Math.min(f / FPS, clip.duration);
    tempos[f] = tempo;
    mixer.setTime(tempo);
    for (const [nome, tr] of trilhas) {
      tr.fonte.updateMatrix();
      if (dobrarRaiz && TOPO.has(nome)) {
        m.multiplyMatrices(conversao, tr.fonte.matrix).decompose(p, q, s);
      } else if (tr.rebase) {
        m.copy(tr.fonte.matrix).multiply(tr.rebase.inv).multiply(tr.rebase.rest).decompose(p, q, s);
      } else {
        p.copy(tr.fonte.position); q.copy(tr.fonte.quaternion); s.copy(tr.fonte.scale);
      }
      tr.t.push(p.x, p.y, p.z);
      tr.ant = empurrarQuat(tr.r, q, tr.ant);
      tr.s.push(s.x, s.y, s.z);
    }
  }
  mixer.stopAllAction();
  return { duracao: clip.duration, tempos, trilhas };
}

// Rotação+translação que leva pontos A → B (Kabsch, SVD 3×3 por Jacobi).
function kabsch(A, B) {
  const ca = A.reduce((s, p) => s.add(p), new Vector3()).divideScalar(A.length);
  const cb = B.reduce((s, p) => s.add(p), new Vector3()).divideScalar(B.length);
  const H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < A.length; i += 1) {
    const a = A[i].clone().sub(ca).toArray(), b = B[i].clone().sub(cb).toArray();
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) H[r][c] += a[r] * b[c];
  }
  // SVD de H via autovetores de HᵀH (Jacobi): R = V Uᵀ com correção de reflexão.
  const mul = (X, Y) => X.map((r, i) => Y[0].map((_, j) => r.reduce((s, _, k) => s + X[i][k] * Y[k][j], 0)));
  const T = (X) => X[0].map((_, j) => X.map((r) => r[j]));
  let M = mul(T(H), H), V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 60; it += 1) {
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(M[p][q]) < 1e-14) continue;
      const th = 0.5 * Math.atan2(2 * M[p][q], M[q][q] - M[p][p]);
      const c = Math.cos(th), s = Math.sin(th);
      const J = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      J[p][p] = c; J[q][q] = c; J[p][q] = s; J[q][p] = -s;
      M = mul(mul(T(J), M), J); V = mul(V, J);
    }
  }
  const sig = [0, 1, 2].map((i) => Math.sqrt(Math.max(M[i][i], 1e-20)));
  const HV = mul(H, V);
  const U = HV.map((r) => r.map((v, j) => v / sig[j]));
  let R = mul(V, T(U));
  const det = R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0])
    + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
  if (det < 0) { const V2 = V.map((r) => [r[0], r[1], -r[2]]); R = mul(V2, T(U)); }
  const m = new Matrix4().set(R[0][0], R[0][1], R[0][2], 0, R[1][0], R[1][1], R[1][2], 0, R[2][0], R[2][1], R[2][2], 0, 0, 0, 0, 1);
  const t = cb.clone().sub(ca.clone().applyMatrix4(m));
  m.setPosition(t);
  const residuo = Math.max(...A.map((a, i) => a.clone().applyMatrix4(m).distanceTo(B[i])));
  return { m, residuo };
}

// Clipe de ARMA no referencial da raiz: deformação D(t) = S(t)·S₀⁻¹ de cada osso no
// espaço da armadura da FONTE, levada ao espaço do osso Arma do ALVO por R (Kabsch
// nas cabeças dos ossos em repouso — posições não dependem da orientação que o
// importador FBX inventa para cada osso), e reaplicada sobre o repouso do alvo.
function amostrarArma(gltf, alvos, { nos, raizAlvo }) {
  const mixer = new AnimationMixer(gltf.scene);
  const clip = gltf.animations[0];
  mixer.clipAction(clip).setLoop(LoopOnce, 0).play();
  const ossos = alvos.filter((n) => gltf.scene.getObjectByName(n) && nos.get(n));
  const fonte = new Map(ossos.map((n) => [n, gltf.scene.getObjectByName(n)]));
  const raizFonte = fonte.get(ossos[0]).parent && [...fonte.values()].map((o) => o.parent).find((p) => !fonte.has(p.name));
  const noRaiz = (obj) => { // matriz do osso no espaço da raiz da fonte
    const m = new Matrix4();
    for (let o = obj; o && o !== raizFonte; o = o.parent) { o.updateMatrix(); m.premultiply(o.matrix); }
    return m;
  };
  const localAlvo = new Map();
  const alvoNaArma = new Map();
  const naArma = (n) => { // repouso do alvo no espaço do osso Arma
    if (alvoNaArma.has(n)) return alvoNaArma.get(n);
    const no = nos.get(n);
    const pai = no.getParentNode();
    const local = matrizDoNo(no);
    localAlvo.set(n, local);
    const m = pai && pai.getName() !== raizAlvo ? naArma(pai.getName()).clone().multiply(local) : local;
    alvoNaArma.set(n, m);
    return m;
  };
  for (const n of ossos) naArma(n);
  const restoFonte = new Map(ossos.map((n) => [n, noRaiz(fonte.get(n))]));
  const cab = (m) => new Vector3().setFromMatrixPosition(m);
  // Mapa fonte→alvo: a conversão Y-up do glTF (Rx +90°) é a hipótese; as cabeças dos
  // ossos em repouso a conferem. Ossos colineares (AK, KXG12) não determinam uma
  // rotação por Kabsch — por isso a hipótese vem primeiro e o Kabsch é só recurso.
  const cabF = ossos.map((n) => cab(restoFonte.get(n)));
  const cabA = ossos.map((n) => cab(alvoNaArma.get(n)));
  const erro = (m) => Math.max(...cabF.map((a, i) => a.clone().applyMatrix4(m).distanceTo(cabA[i])));
  let R = new Matrix4().makeRotationX(Math.PI / 2);
  let residuo = erro(R);
  let metodo = 'y-up';
  if (residuo > 0.05 && ossos.length >= 3) {
    const k = kabsch(cabF, cabA);
    if (k.residuo < residuo) ({ m: R, residuo } = k), metodo = 'kabsch';
  }
  if (residuo > 0.05) throw new Error(`repouso do clipe não bate com o da malha (${residuo.toFixed(3)} cm, ${metodo})`);
  const Rinv = R.clone().invert();
  const quadros = Math.round(clip.duration * FPS);
  const tempos = new Float32Array(quadros + 1);
  const trilhas = new Map(ossos.map((n) => [n, { t: [], r: [], s: [], ant: null }]));
  const p = new Vector3(), q = new Quaternion(), sc = new Vector3();
  const ordem = [...ossos].sort((a, b) => depth(nos.get(a)) - depth(nos.get(b)));
  function depth(no) { let d = 0; for (let x = no; x; x = x.getParentNode()) d += 1; return d; }
  for (let f = 0; f <= quadros; f += 1) {
    const tempo = Math.min(f / FPS, clip.duration);
    tempos[f] = tempo;
    mixer.setTime(tempo);
    const agora = new Map();
    for (const n of ordem) {
      const D = noRaiz(fonte.get(n)).multiply(restoFonte.get(n).clone().invert());
      const alvo = R.clone().multiply(D).multiply(Rinv).multiply(alvoNaArma.get(n));
      agora.set(n, alvo);
      const pai = nos.get(n).getParentNode()?.getName();
      const local = pai && agora.has(pai) ? agora.get(pai).clone().invert().multiply(alvo) : alvo;
      local.decompose(p, q, sc);
      const tr = trilhas.get(n);
      tr.t.push(p.x, p.y, p.z);
      tr.ant = empurrarQuat(tr.r, q.clone(), tr.ant);
      tr.s.push(sc.x, sc.y, sc.z);
    }
  }
  mixer.stopAllAction();
  return { duracao: clip.duration, tempos, trilhas, residuoCm: residuo, ossos: ossos.length, metodo };
}

// Pose congelada do idle já exportado (para o lado sem clipe do pack).
function poseDoIdle(doc, alvos, nos, duracao) {
  const idle = doc.getRoot().listAnimations().find((a) => a.getName() === 'idle');
  if (!idle) throw new Error('GLB base sem idle');
  const trilhas = new Map();
  for (const nome of alvos) {
    const no = nos.get(nome);
    const tr = {};
    for (const prop of ['translation', 'rotation', 'scale']) {
      const canal = idle.listChannels().find((c) => c.getTargetNode() === no && c.getTargetPath() === prop);
      const w = prop === 'rotation' ? 4 : 3;
      const v = canal ? Array.from(canal.getSampler().getOutput().getArray().slice(0, w))
        : prop === 'translation' ? no.getTranslation() : prop === 'rotation' ? no.getRotation() : no.getScale();
      tr[prop] = [...v, ...v];
    }
    trilhas.set(nome, { t: tr.translation, r: tr.rotation, s: tr.scale });
  }
  return { duracao, tempos: new Float32Array([0, duracao]), trilhas };
}

function trilha(doc, anim, buffer, no, prop, tempos, valores) {
  const w = prop === 'rotation' ? 4 : 3;
  const entrada = doc.createAccessor(`${anim.getName()}_${no.getName()}_t`, buffer).setType('SCALAR').setArray(tempos);
  const saida = doc.createAccessor(`${anim.getName()}_${no.getName()}_${prop}`, buffer)
    .setType(w === 4 ? 'VEC4' : 'VEC3').setArray(new Float32Array(valores));
  const sampler = doc.createAnimationSampler().setInput(entrada).setOutput(saida).setInterpolation('LINEAR');
  anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(no).setTargetPath(prop).setSampler(sampler));
}

function gravarClipe(doc, nome, amostras, nos) {
  const raiz = doc.getRoot();
  raiz.listAnimations().filter((a) => a.getName() === nome).forEach((a) => a.dispose());
  const anim = doc.createAnimation(nome);
  const buffer = raiz.listBuffers()[0] || doc.createBuffer('fabrica');
  // Tempo NATIVO de cada lado (o Unity toca braço e arma em velocidade 1, cada um
  // no seu comprimento); o lado mais curto segura o último quadro.
  for (const a of amostras) {
    for (const [n, tr] of a.trilhas) {
      const no = nos.get(n);
      if (!no) continue;
      trilha(doc, anim, buffer, no, 'translation', a.tempos, tr.t);
      trilha(doc, anim, buffer, no, 'rotation', a.tempos, tr.r);
      trilha(doc, anim, buffer, no, 'scale', a.tempos, tr.s);
    }
  }
  return anim;
}

async function main() {
  const plano = lerJson(process.argv[2]);
  const pasta = plano.chassi.pasta;
  const base = path.join(plano.saida.dir, 'base.glb');
  const saida = foraDoRepo(path.join(plano.saida.dir, 'clipes.glb'));
  const cru = path.join(plano.saida.dir, 'clipes-crus');
  await fs.mkdir(cru, { recursive: true });

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(base);
  const raiz = doc.getRoot();
  const nos = new Map(raiz.listNodes().map((n) => [n.getName(), n]));
  // Um skin só (braço + arma fundidos sob o osso Arma): os ossos da arma vêm da montagem.
  const montagem = lerJson(path.join(plano.saida.dir, 'montagem.json'));
  const ossosArma = new Set([...montagem.arma.ossos, montagem.arma.ossoRaiz]);
  const skin = raiz.listSkins().find((s) => s.getName() === 'RIG_FP_ARMS');
  if (!skin) throw new Error('GLB base sem o skin RIG_FP_ARMS');
  const juntas = skin.listJoints().map((n) => n.getName());
  const alvosBraco = juntas.filter((n) => !ossosArma.has(n));
  const alvosArma = juntas.filter((n) => ossosArma.has(n) && n !== montagem.arma.ossoRaiz);
  const relatorio = { schemaVersion: 1, id: plano.id, fps: FPS, clipes: [] };

  for (const [nomeJogo, fonte] of Object.entries(plano.clipes)) {
    if (nomeJogo === 'idle' || !fonte || fonte.tipo === 'procedural' || fonte.tipo === 'ausente') continue;
    const fbxBraco = fonte.braco ? path.join(fonte.geral ? plano.packAnimacoes : pasta, fonte.braco) : null;
    const fbxArma = fonte.arma ? path.join(pasta, fonte.arma) : null;
    let braco = null;
    let arma = null;
    if (fbxBraco) {
      const glb = path.join(cru, `${nomeJogo}-braco.glb`);
      assimp(fbxBraco, glb);
      await soAnimacao(glb);
      braco = amostrar(await carregarAnimacao(glb), alvosBraco, { dobrarRaiz: true, nos });
    }
    if (fbxArma) {
      const glb = path.join(cru, `${nomeJogo}-arma.glb`);
      blenderArma(fbxArma, glb);
      await soAnimacao(glb);
      arma = amostrarArma(await carregarAnimacao(glb), alvosArma, { nos, raizAlvo: montagem.arma.ossoRaiz });
    }
    const duracao = Math.max(braco?.duracao ?? 0, arma?.duracao ?? 0);
    const amostras = [
      braco || poseDoIdle(doc, alvosBraco, nos, duracao),
      arma || poseDoIdle(doc, alvosArma, nos, duracao),
    ];
    const anim = gravarClipe(doc, nomeJogo, amostras, nos);
    relatorio.clipes.push({
      nome: nomeJogo, duracao, canais: anim.listChannels().length,
      braco: fbxBraco ? path.basename(fbxBraco) : 'idle congelado',
      arma: fbxArma ? path.basename(fbxArma) : 'idle congelado',
      duracaoBraco: braco ? +braco.duracao.toFixed(4) : null,
      duracaoArma: arma ? +arma.duracao.toFixed(4) : null,
      alinhamentoArma: arma ? { ossos: arma.ossos, metodo: arma.metodo, residuoCm: +arma.residuoCm.toFixed(4) } : null,
    });
  }
  await io.write(saida, doc);
  relatorio.bytes = (await fs.stat(saida)).size;
  await fs.writeFile(path.join(plano.saida.dir, 'clipes.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
  console.log(`FABRICA_CLIPES=${JSON.stringify({ id: plano.id, clipes: relatorio.clipes.map((c) => c.nome) })}`);
}

main().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });
