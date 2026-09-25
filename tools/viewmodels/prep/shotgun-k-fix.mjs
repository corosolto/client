#!/usr/bin/env node
// Escopeta K (KSG): conserto offline do produto assado, sem Blender.
//
// Medido no produto do catálogo (vista lateral em RIG_WEAPON_SHOTGUN, `vmpose.mjs`):
// a malha da KSG está de TRÁS PARA A FRENTE em relação às mãos e aos sockets — a
// boca e o punho vertical da bomba ficam do lado da câmera (-Z), a coronha do lado
// do cano (+Z). É o "tubo octogonal oco perto da câmera" e o "ADS vira de frente"
// da fila L1. Além disso a manga (Cloth) do pacote pesado tem só o trecho do
// antebraço (748 vértices, a mesma da LMG): o braço termina num punho oco.
//
// Receita: (1) a KSG gira 180° em torno do eixo vertical e o punho de pistola vai
// ao punho da mão direita; os sockets ficam onde estavam (+Z é a frente das mãos) e
// são remedidos na malha nova; (2) a mão esquerda vai à bomba por IK de dois ossos e
// segue o osso da bomba no tiro; (3) a manga completa do rig K (2917 vértices, doador
// da linhagem M4) substitui a manga cortada, com os mesmos ossos e pesos.
//
// Uso: node shotgun-k-fix.mjs --in=<glb> --doador-manga=<glb K com manga inteira> --out=<glb>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, io, THREE } from './vmpose.mjs';
import { aplicar as aplicarApoio } from './grip-support.mjs';

const { Vector3, Quaternion, Matrix4 } = THREE;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// Coordenadas em RIG_WEAPON_SHOTGUN (unidades do rig), medidas no produto original.
export const KSG = {
  punhoPistola: [0, -8.5, 6.5],       // centro do punho de pistola (antes do giro)
  punhoMaoDireita: [0, -3.8, -14.85], // centróide dos dedos da mão direita em idle
  // Sockets remedidos na KSG girada: boca no centro do cano (anel do corte frontal) e alça
  // no centro da abertura da mira traseira dobrável (z -6, topo 15,1).
  boca: [0, 8.3, 25.4],
  alca: [0, 13.6, -5.5],
  // O cartucho (MINT_AMMO_SHOTGUN_GAUGE) NÃO gira: a trilha dele foi animada junto com a mão
  // esquerda da recarga; girado, ele sai dos dedos ("tira no ar").
  pecasDaArma: ['neutral_bone', 'MINT_MECH_SHOTGUN_PUMP', 'MINT_MECH_SHOTGUN_TRIGGER', 'Elevator'],
};

export function girarKsg(pose) {
  const doc = pose.doc;
  const rig = pose.node('RIG_WEAPON_SHOTGUN');
  if (!rig) throw new Error('RIG_WEAPON_SHOTGUN ausente');
  const R = new Quaternion(0, 1, 0, 0);
  const alvo = new Vector3(...KSG.punhoMaoDireita);
  const t = alvo.clone().sub(new Vector3(...KSG.punhoPistola).applyQuaternion(R));
  const flip = doc.createNode('KSG_FRENTE').setTranslation(t.toArray()).setRotation([R.x, R.y, R.z, R.w]);
  rig.addChild(flip);
  for (const nome of KSG.pecasDaArma) {
    const n = pose.node(nome);
    if (!n) throw new Error(`peça ${nome} ausente`);
    rig.removeChild(n);
    flip.addChild(n);
  }
  pose.node('SOCKET_MINT_MUZZLE').setTranslation(KSG.boca);
  pose.node('SOCKET_MINT_SIGHT').setTranslation(KSG.alca);
  return { translacao: t.toArray().map((v) => +v.toFixed(3)), boca: KSG.boca, alca: KSG.alca };
}

// Troca a manga cortada pela manga inteira de um produto K irmão (mesmo rig de 67 juntas).
export async function mangaInteira(pose, doadorArquivo) {
  const doador = await carregar(doadorArquivo);
  const origem = doador.node('GEO_FP_SK_Cloth_01');
  const alvo = pose.node('GEO_FP_SK_Cloth_01');
  const skinAlvo = alvo.getSkin();
  const juntasAlvo = new Map(skinAlvo.listJoints().map((j) => [j.getName(), j]));
  const skinOrigem = origem.getSkin();
  const doc = pose.doc;
  const buffer = doc.getRoot().listBuffers()[0];
  // Skin novo: mesmas juntas do alvo, na ordem do doador, com as matrizes de bind do doador.
  const juntas = skinOrigem.listJoints().map((j) => {
    const n = juntasAlvo.get(j.getName());
    if (!n) throw new Error(`junta ${j.getName()} ausente no alvo`);
    return n;
  });
  const ibm = doc.createAccessor('manga_ibm').setType('MAT4')
    .setArray(new Float32Array(skinOrigem.getInverseBindMatrices().getArray())).setBuffer(buffer);
  const skin = doc.createSkin('manga_inteira').setInverseBindMatrices(ibm);
  juntas.forEach((j) => skin.addJoint(j));
  if (skinAlvo.getSkeleton()) skin.setSkeleton(skinAlvo.getSkeleton());
  const material = alvo.getMesh().listPrimitives()[0].getMaterial();
  const mesh = doc.createMesh('manga_inteira');
  for (const p of origem.getMesh().listPrimitives()) {
    const prim = doc.createPrimitive().setMaterial(material).setMode(p.getMode());
    for (const sem of p.listSemantics()) {
      const a = p.getAttribute(sem);
      prim.setAttribute(sem, doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice())
        .setNormalized(a.getNormalized()).setBuffer(buffer));
    }
    const idx = p.getIndices();
    prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(idx.getArray().slice()).setBuffer(buffer));
    mesh.addPrimitive(prim);
  }
  const antiga = alvo.getMesh();
  alvo.setMesh(mesh).setSkin(skin);
  const verts = (m) => m.listPrimitives().reduce((s, p) => s + p.getAttribute('POSITION').getCount(), 0);
  return { verticesAntes: verts(antiga), verticesDepois: verts(mesh), doador: path.basename(doadorArquivo) };
}

export async function consertar({ entrada, doadorManga, saida, etapas = ['giro', 'manga', 'cartucho', 'apoio'] }) {
  const pose = await carregar(entrada);
  const rel = { arma: 'shotgun', etapas };
  if (etapas.includes('giro')) rel.giro = girarKsg(pose);
  if (etapas.includes('manga')) rel.manga = await mangaInteira(pose, doadorManga);
  if (etapas.includes('cartucho')) {
    // O cartucho usava o mesmo aço escuro do corpo e some na luva: plástico vermelho de cartucho 12.
    const m = pose.doc.getRoot().listMaterials().find((x) => x.getName() === 'CoroSolto_KSG_Ammo');
    if (!m) throw new Error('material CoroSolto_KSG_Ammo ausente');
    m.setBaseColorFactor([0.42, 0.035, 0.03, 1]).setMetallicFactor(0).setRoughnessFactor(0.55);
    rel.cartucho = { material: 'CoroSolto_KSG_Ammo', base: [0.42, 0.035, 0.03, 1] };
  }
  await io.write(saida, pose.doc);
  if (etapas.includes('apoio')) {
    const apoio = await aplicarApoio({ arma: 'shotgun', entrada: saida, saida });
    rel.apoio = apoio;
  }
  const bytes = fs.readFileSync(saida);
  rel.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return rel;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = path.resolve(opt('out'));
  if (!path.relative(ROOT, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  const rel = await consertar({ entrada: path.resolve(opt('in')), doadorManga: path.resolve(opt('doador-manga')), saida,
    etapas: opt('etapas', 'giro,manga,cartucho,apoio').split(',') });
  if (opt('relatorio')) fs.writeFileSync(opt('relatorio'), JSON.stringify(rel, null, 2) + '\n');
  console.log(JSON.stringify(rel));
}
