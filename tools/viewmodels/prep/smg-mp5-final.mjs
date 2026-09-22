#!/usr/bin/env node
/** Fecha a MP5 KINEMATION já retargetada. Preserva as duas recargas e as duas
 * mãos, acrescenta tiro mecânico, inspect e o contrato baked. Produto e recibo
 * de build permanecem fora do Git. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = '4d08736e615e634b9255f7cb61d8e5d5afdcaedb0d509cd0e56296fe5e968e77';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<mp5-runtime.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte MP5 KINEMATION ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle', 'reload_empty', 'reload_tactical'].sort().join(',')) throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
for (const name of ['MINT_WEAPON_MP5', 'SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']) if (byName(name)) throw new Error(`fonte já contém ${name}; receita precisa ser revista`);
const socket = byName('SOCKET_WEAPON_MP5');
const weaponRig = byName('RIG_WEAPON_MP5');
const armsRig = byName('RIG_FP_ARMS');
const bolt = byName('Bolt');
const trigger = byName('Trigger');
for (const name of ['GEO_WEAPON_MP5_MP5.001', 'Bolt', 'ChargingHandle', 'FireSelect', 'Mag', 'ReleaseHandle', 'Trigger', 'hand_l', 'hand_r']) if (!byName(name)) throw new Error(`rig MP5 incompleto: ${name}`);
if (!socket || !weaponRig || !armsRig || !bolt || !trigger) throw new Error('raízes MP5 incompletas');
socket.addChild(document.createNode('MINT_WEAPON_MP5'));
// Pontos medidos sobre a malha já deformada no idle: alça no receiver e boca
// no fim do cano. Foram convertidos de camera-space para o espaço local do rig.
weaponRig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([44.4177, -48.8649, 30.5726]));
weaponRig.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([-0.5638, 4.5054, -30.3013]));

const buffer = root.listBuffers()[0] || document.createBuffer();
const accessor = (name, type, values) => document.createAccessor(name).setType(type).setArray(new Float32Array(values)).setBuffer(buffer);
const channel = (clip, node, targetPath, times, values, type) => {
  const sampler = document.createAnimationSampler()
    .setInput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}_times`, 'SCALAR', times))
    .setOutput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}`, type, values))
    .setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
};
const quatMul = (a, b) => [
  a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
  a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
  a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
  a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
];
const axisX = (angle) => [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];

const shootTimes = [0, 0.045, 0.09, 0.15, 0.22];
const boltBase = bolt.getTranslation();
const boltValues = [[0,0,0],[-8,-0.8,0.8],[-22,-2.2,2.0],[-7,-0.7,0.6],[0,0,0]].flatMap((delta) => delta.map((value, index) => boltBase[index] + value));
const triggerBase = trigger.getRotation();
const triggerValues = [0, 0.10, 0.27, 0.08, 0].flatMap((angle) => quatMul(triggerBase, axisX(angle)));
const shoot = document.createAnimation('shoot');
channel(shoot, bolt, 'translation', shootTimes, boltValues, 'VEC3');
channel(shoot, trigger, 'rotation', shootTimes, triggerValues, 'VEC4');
channel(shoot, armsRig, 'translation', shootTimes, [0,0,0, 0.008,0.006,-0.004, 0.025,0.014,-0.010, 0.009,0.005,-0.004, 0,0,0], 'VEC3');

const inspectTimes = [0, 0.35, 0.75, 1.10, 1.45, 1.80];
const inspect = document.createAnimation('inspect');
channel(inspect, armsRig, 'translation', inspectTimes, [0,0,0, 0.02,0.008,-0.006, 0.07,0.02,-0.014, 0.09,0.024,-0.012, 0.04,0.01,-0.006, 0,0,0], 'VEC3');
channel(inspect, armsRig, 'rotation', inspectTimes, [0,0,0,1, 0,0,0.01,0.99995, 0,0,0.02,0.9998, 0,0,0.025,0.999687, 0,0,0.0125,0.999922, 0,0,0,1], 'VEC4');

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'mp5-runtime.glb');
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: 'mp5', displayName: 'MP5 "BATIDÃO"', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: sourceClips, addedClips: ['shoot', 'inspect'], mesh: 'GEO_WEAPON_MP5_MP5.001', armsRig: 'RIG_FP_ARMS', weaponRig: 'RIG_WEAPON_MP5', mechanisms: ['Bolt','ChargingHandle','FireSelect','Mag','ReleaseHandle','Trigger'] },
  sockets: { muzzleParent: 'RIG_WEAPON_MP5', muzzleLocal: [-0.5638,4.5054,-30.3013], sightParent: 'RIG_WEAPON_MP5', sightLocal: [44.4177,-48.8649,30.5726] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`MP5_FINAL_OK ${JSON.stringify(report)}`);
