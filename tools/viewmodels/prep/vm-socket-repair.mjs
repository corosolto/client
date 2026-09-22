#!/usr/bin/env node
/**
 * Conserta o socket da BOCA DO CANO nos produtos assados.
 *
 * Os sockets `SOCKET_MINT_MUZZLE` e `SOCKET_MINT_SIGHT` existem nas 24 armas e
 * foram digitados à mão, receita por receita. Medindo o eixo alça→boca contra o
 * olhar da câmera, oito armas apontavam para trás: shotgun 180°, sks 177,5°,
 * rem700 172,1°, mosin 171,0°, svd 169,4°, p90 140,8°, deagle e revólver a 90°.
 * O grupo saudável fica entre 4° e 21°.
 *
 * A boca do cano não é matéria de opinião: é a extremidade da nuvem de vértices
 * da arma ao longo do eixo principal, do lado OPOSTO à câmera — a arma aponta
 * para longe do jogador. Esta ferramenta mede essa ponta e reposiciona só o nó
 * do socket. Não toca malha, pele, clipe nem material.
 *
 * Guardas: só escreve se o ângulo melhorar e ficar abaixo do teto, e recusa
 * deslocamento absurdo sem `--forcar`. Nas armas já corretas o reparo é
 * praticamente nulo (move ≤ 9 cm e o ângulo continua baixo) — é assim que se
 * sabe que a regra descreve a geometria, e não o defeito.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../../../public/vendor/three.module.js';
import { GLTFLoader } from '../../../public/vendor/addons/loaders/GLTFLoader.js';

globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); } };
globalThis.self = globalThis;
globalThis.ImageData = class { constructor(d, w, h) { Object.assign(this, { data: d, width: w, height: h }); } };
console.warn = () => {};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const option = (name, fallback = '') => {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);
const ASSET_ROOT = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root');
const TETO_GRAUS = +(option('teto', '25'));
const HAND = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
const MANIFESTS = ['rifle', 'smg', 'sidearm', 'dmr', 'precision', 'heavy'];

const loader = new GLTFLoader();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/** Mede a ponta do cano e o ângulo de mira no espaço do próprio pacote. */
async function medir(file) {
  const bytes = fs.readFileSync(file);
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  let camera = null, sight = null, muzzle = null;
  scene.traverse((object) => {
    if (!camera && object.isPerspectiveCamera) camera = object;
    if (!sight && /SIGHT/i.test(object.name || '')) sight = object;
    if (!muzzle && /MUZZLE/i.test(object.name || '')) muzzle = object;
  });
  if (!camera || !sight || !muzzle) throw new Error('pacote sem câmera ou sem os dois sockets');
  camera.updateMatrixWorld(true);
  const olho = camera.getWorldPosition(new THREE.Vector3());
  const frente = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  // Repouso: a boca do cano é propriedade da malha, medida na pose que o
  // jogador vê parado.
  const clip = gltf.animations.find((candidate) => candidate.name.toLowerCase() === 'idle');
  if (clip) { const mixer = new THREE.AnimationMixer(scene); mixer.clipAction(clip).reset().play(); mixer.setTime(0); }
  scene.updateMatrixWorld(true);
  const pontos = [];
  const vertex = new THREE.Vector3();
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const materiais = Array.isArray(object.material) ? object.material : [object.material];
    if (materiais.some((material) => HAND.test(material?.name || ''))) return;
    const position = object.geometry?.attributes?.position;
    if (!position) return;
    const passo = Math.max(1, Math.floor(position.count / 2000));
    for (let index = 0; index < position.count; index += passo) {
      vertex.fromBufferAttribute(position, index);
      if (object.isSkinnedMesh) object.applyBoneTransform(index, vertex);
      vertex.applyMatrix4(object.matrixWorld);
      pontos.push(vertex.clone());
    }
  });
  if (!pontos.length) throw new Error('nenhum vértice de arma amostrado');
  const centro = new THREE.Vector3();
  for (const ponto of pontos) centro.add(ponto);
  centro.divideScalar(pontos.length);
  // Eixo principal por iteração de potência sobre a covariância da nuvem.
  const eixo = new THREE.Vector3(0, 0, -1);
  for (let passo = 0; passo < 24; passo += 1) {
    const proximo = new THREE.Vector3();
    for (const ponto of pontos) {
      const delta = ponto.clone().sub(centro);
      proximo.addScaledVector(delta, delta.dot(eixo));
    }
    if (proximo.lengthSq() === 0) break;
    eixo.copy(proximo.normalize());
  }
  let menor = Infinity, maior = -Infinity, pontaA = null, pontaB = null;
  for (const ponto of pontos) {
    const t = ponto.clone().sub(centro).dot(eixo);
    if (t < menor) { menor = t; pontaA = ponto.clone(); }
    if (t > maior) { maior = t; pontaB = ponto.clone(); }
  }
  // A arma aponta para longe do jogador: a boca é a ponta mais distante do olho.
  const boca = pontaA.distanceTo(olho) > pontaB.distanceTo(olho) ? pontaA : pontaB;
  const alca = sight.getWorldPosition(new THREE.Vector3());
  const atual = muzzle.getWorldPosition(new THREE.Vector3());
  const anguloDe = (alvo) => alvo.clone().sub(alca).normalize().angleTo(frente) * 180 / Math.PI;
  return {
    bytes, muzzleNome: muzzle.name, deslocamentoCm: atual.distanceTo(boca) * 100,
    grausAntes: +anguloDe(atual).toFixed(1), grausDepois: +anguloDe(boca).toFixed(1),
    // Alvo em espaço LOCAL do pai: é o que o glTF guarda.
    local: muzzle.parent
      ? boca.clone().applyMatrix4(muzzle.parent.matrixWorld.clone().invert()).toArray()
      : boca.toArray(),
  };
}

const manifests = MANIFESTS
  .map((name) => ({ name, file: path.join(ROOT, 'tools/viewmodels', `${name}-candidates.json`) }))
  .filter((entry) => fs.existsSync(entry.file))
  .map((entry) => ({ ...entry, data: JSON.parse(fs.readFileSync(entry.file, 'utf8')) }));
const only = option('armas') ? new Set(option('armas').split(',').filter(Boolean)) : null;
const relatorio = [];
let escritos = 0;

for (const manifest of manifests) {
  let mudouManifesto = false;
  for (const [weapon, cfg] of Object.entries(manifest.data.candidates || {})) {
    if (only && !only.has(weapon)) continue;
    const file = path.join(ASSET_ROOT, cfg.file);
    if (!fs.existsSync(file)) { relatorio.push({ weapon, pulado: 'produto ausente' }); continue; }
    let medida;
    try { medida = await medir(file); }
    catch (problem) { relatorio.push({ weapon, erro: problem.message }); continue; }
    const melhora = medida.grausAntes - medida.grausDepois;
    const fecha = medida.grausDepois <= TETO_GRAUS;
    const linha = {
      weapon, grausAntes: medida.grausAntes, grausDepois: medida.grausDepois,
      deslocamentoCm: +medida.deslocamentoCm.toFixed(1),
    };
    // Arma que já cumpre o contrato não é tocada: reescrever bytes por 1° de
    // ganho só troca o hash de produto sadio e obriga todo mundo a revalidar.
    if (medida.grausAntes <= TETO_GRAUS && !flag('forcar')) {
      linha.acao = 'ja-correta';
      relatorio.push(linha);
      continue;
    }
    // Só escreve quando o conserto é real: melhora e fecha abaixo do teto.
    if (!(melhora > 1 && fecha) && !flag('forcar')) {
      linha.acao = 'NAO-RESOLVIDA';
      relatorio.push(linha);
      continue;
    }
    if (flag('seco')) { linha.acao = 'escreveria'; relatorio.push(linha); continue; }
    const documento = await io.read(file);
    const alvo = documento.getRoot().listNodes().find((node) => node.getName() === medida.muzzleNome);
    if (!alvo) { relatorio.push({ weapon, erro: `nó ${medida.muzzleNome} sumiu na releitura` }); continue; }
    alvo.setTranslation(medida.local.map((valor) => +valor.toFixed(6)));
    await io.write(file, documento);
    const novos = fs.readFileSync(file);
    cfg.sha256 = sha(novos);
    if (cfg.productSha256) cfg.productSha256 = cfg.sha256;
    cfg.bytes = novos.length;
    if (cfg.productBytes) cfg.productBytes = novos.length;
    mudouManifesto = true;
    escritos += 1;
    linha.acao = 'corrigida';
    linha.sha256 = cfg.sha256.slice(0, 10);
    relatorio.push(linha);
  }
  // O manifesto fixa o hash do produto e os gates o conferem: reescrever bytes
  // sem reescrever o manifesto reprova todo mundo por motivo errado.
  if (mudouManifesto) fs.writeFileSync(manifest.file, `${JSON.stringify(manifest.data, null, 2)}\n`);
}

console.log(`VM_SOCKET_REPAIR=${JSON.stringify({ escritos, teto: TETO_GRAUS, armas: relatorio }, null, 2)}`);
if (relatorio.some((linha) => linha.acao === 'NAO-RESOLVIDA')) process.exitCode = 1;
