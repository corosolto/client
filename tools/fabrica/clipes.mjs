#!/usr/bin/env node
/** Fábrica — clipes do pack no GLB base, com os nomes do jogo.
 *
 * Derivado de tools/viewmodels/assemble_paid_family.mjs, sem os ajustes por
 * família (magTranslationScale, magGrip, supportGrip): a zona de contato é o
 * pack como autorado. Braço: FBX ASCII do pack via Assimp, reamostrado a 60 Hz
 * com a raiz FBX dobrada nos três ossos de topo. Arma: FBX via Blender
 * (convert_weapon_clip_fbx.py), rebase pelo pivô da fonte. Clipe só de arma
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
  const script = path.join(RAIZ_REPO, 'tools/blender/viewmodels/convert_weapon_clip_fbx.py');
  const r = spawnSync(BLENDER, ['-b', '--python-exit-code', '1', '--python', script, '--', fonte, saida], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.includes('CORO_WEAPON_CLIP_GLB=')) {
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

function gravarClipe(doc, nome, amostras, nos, duracao) {
  const raiz = doc.getRoot();
  raiz.listAnimations().filter((a) => a.getName() === nome).forEach((a) => a.dispose());
  const anim = doc.createAnimation(nome);
  const buffer = raiz.listBuffers()[0] || doc.createBuffer('fabrica');
  for (const a of amostras) {
    // Braço e arma têm contagens diferentes mas a mesma fase autoral: normaliza.
    const k = a.duracao > 0 ? duracao / a.duracao : 1;
    const tempos = Math.abs(k - 1) < 1e-6 ? a.tempos : Float32Array.from(a.tempos, (t) => t * k);
    for (const [n, tr] of a.trilhas) {
      const no = nos.get(n);
      if (!no) continue;
      trilha(doc, anim, buffer, no, 'translation', tempos, tr.t);
      trilha(doc, anim, buffer, no, 'rotation', tempos, tr.r);
      trilha(doc, anim, buffer, no, 'scale', tempos, tr.s);
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
      arma = amostrar(await carregarAnimacao(glb), alvosArma, { nos });
    }
    const duracao = Math.max(braco?.duracao ?? 0, arma?.duracao ?? 0);
    const amostras = [
      braco || poseDoIdle(doc, alvosBraco, nos, duracao),
      arma || poseDoIdle(doc, alvosArma, nos, duracao),
    ];
    const anim = gravarClipe(doc, nomeJogo, amostras, nos, duracao);
    relatorio.clipes.push({
      nome: nomeJogo, duracao, canais: anim.listChannels().length,
      braco: fbxBraco ? path.basename(fbxBraco) : 'idle congelado',
      arma: fbxArma ? path.basename(fbxArma) : 'idle congelado',
    });
  }
  await io.write(saida, doc);
  relatorio.bytes = (await fs.stat(saida)).size;
  await fs.writeFile(path.join(plano.saida.dir, 'clipes.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
  console.log(`FABRICA_CLIPES=${JSON.stringify({ id: plano.id, clipes: relatorio.clipes.map((c) => c.nome) })}`);
}

main().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });
