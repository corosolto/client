#!/usr/bin/env node
/**
 * Devolve tampa, bandeja, alavanca, trilho, seletor e caixa/fita da LMG ao corpo da arma.
 *
 * No produto `lmg-final.mjs` esses ossos são irmãos de `neutral_bone` sob RIG_WEAPON_LMG, mas
 * o transform local deles ficou num espaço sem o offset que o `neutral_bone` carrega: medido
 * no idle, a tampa fica 0,41 m à direita, 0,33 m abaixo e atrás da câmera — fora do quadro em
 * toda a recarga (crítico cego r2). O desvio é o MESMO nas seis peças (E = N·inv(Nb)·Pb·inv(P),
 * igual até 1e-4), então basta um nó pai com E entre o rig e as peças: animação intacta.
 * Régua: tools/eval/vm-lmg-tampa-tela-check.mjs.
 *
 * Uso: node lmg-part-parent-fix.mjs --entrada=<lmg-baked-runtime.glb> --saida=<fora-do-git>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../../../public/vendor/three.module.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const option = (name) => (process.argv.find((v) => v.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const entrada = path.resolve(option('entrada') || '');
const saida = path.resolve(option('saida') || '');
if (!option('entrada') || !option('saida')) throw new Error('uso: --entrada=<glb> --saida=<glb fora do Git>');
if (!path.relative(REPO, saida).startsWith('..')) throw new Error('saída precisa ficar fora do Git');
const PARTS = ['MINT_AMMO_LMG_BOX', 'MINT_MECH_LMG_FEED_TRAY', 'MINT_MECH_LMG_COVER', 'MINT_MECH_LMG_CHARGER', 'Rail', 'Switch'];
const FIX = 'LMG_PARTS_BIND_FIX';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(entrada);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
if (byName(FIX)) throw new Error(`${FIX} já existe: produto já corrigido`);
const rig = byName('RIG_WEAPON_LMG');
const neutral = byName('neutral_bone');
const skin = root.listSkins().find((s) => s.listJoints().includes(neutral));
if (!rig || !neutral || !skin) throw new Error('produto LMG sem RIG_WEAPON_LMG/neutral_bone/skin');
const joints = skin.listJoints();
const ibm = skin.getInverseBindMatrices().getArray();
const bindWorld = (node) => {
  const i = joints.indexOf(node);
  if (i < 0) throw new Error(`${node.getName()} não é junta da skin da arma`);
  return new THREE.Matrix4().fromArray(Array.from(ibm.slice(i * 16, i * 16 + 16))).invert();
};
const local = (node) => new THREE.Matrix4().fromArray(node.getMatrix());
const nodes = PARTS.map((name) => byName(name));
if (nodes.some((n) => !n || n.getParentNode() !== rig)) throw new Error('peça ausente ou fora de RIG_WEAPON_LMG');
const neutralBind = bindWorld(neutral).invert();
const corrections = nodes.map((node) => local(neutral).multiply(neutralBind.clone().multiply(bindWorld(node))).multiply(local(node).invert()));
const reference = corrections[0];
for (const [k, e] of corrections.entries()) {
  const drift = Math.max(...e.elements.map((x, i) => Math.abs(x - reference.elements[i]) / Math.max(1, Math.abs(reference.elements[i]))));
  if (drift > 1e-4) throw new Error(`desvio não é comum às peças (${PARTS[k]}: ${drift})`);
}
const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
reference.decompose(t, q, s);
const fix = document.createNode(FIX).setTranslation(t.toArray()).setRotation(q.toArray()).setScale(s.toArray())
  .setExtras({ contract: 'lmg-part-parent-fix', tool: 'tools/viewmodels/prep/lmg-part-parent-fix.mjs' });
rig.addChild(fix);
for (const node of nodes) fix.addChild(node);
fs.mkdirSync(path.dirname(saida), { recursive: true });
await io.write(saida, document);
const bytes = fs.readFileSync(saida);
console.log(JSON.stringify({ ok: true, saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  correcao: { translacao: t.toArray().map((x) => +x.toFixed(4)), rotacao: q.toArray().map((x) => +x.toFixed(5)), escala: s.toArray().map((x) => +x.toFixed(5)) } }));
