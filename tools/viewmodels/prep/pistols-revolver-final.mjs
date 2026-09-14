#!/usr/bin/env node
/** Fecha o revólver .38 com o candidato Viper-357 já retargetado e otimizado. Mantém
 * malha, duas skins, três ações e mecanismos; acrescenta inspect e o contrato
 * baked. Produto e recibo de build ficam fora do Git. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = 'ddb088750bbdd4db455aa415ea8b74e59d6178733687f172cdf647d32cec1516';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<revolver-runtime.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte Revólver .38 Viper-357 ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle', 'reload_empty', 'shoot'].sort().join(',')) throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
for (const name of ['MINT_WEAPON_REVOLVER38', 'SOCKET_MINT_MUZZLE', 'SOCKET_MINT_SIGHT']) if (byName(name)) throw new Error(`fonte já contém ${name}; receita precisa ser revista`);
const socket = byName('SOCKET_WEAPON_REVOLVER');
const weaponRig = byName('RIG_WEAPON_REVOLVER');
const armsRig = byName('RIG_FP_ARMS');
for (const name of ['GEO_WEAPON_REVOLVER_python.001', 'Drum', 'CraneArm', 'Ejector', 'Trigger', 'Hammer', 'hand_l', 'hand_r']) if (!byName(name)) throw new Error(`rig Revólver .38 incompleto: ${name}`);
if (!socket || !weaponRig || !armsRig) throw new Error('raízes Revólver .38 incompletas');
socket.addChild(document.createNode('MINT_WEAPON_REVOLVER38'));
// O Viper-357 aponta o cano em -Y do rig. Os dois pontos ficam no eixo real da
// arma e o sight permanece mais perto da câmera; unidades do rig são cm.
weaponRig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([0, 1.0, 0]));
weaponRig.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([0, -20.0, 0]));

const buffer = root.listBuffers()[0] || document.createBuffer();
const times = new Float32Array([0, 0.35, 0.75, 1.10, 1.45, 1.80]);
const translations = new Float32Array([0,0,0, 0.02,0.008,-0.006, 0.07,0.02,-0.014, 0.09,0.024,-0.012, 0.04,0.01,-0.006, 0,0,0]);
const rotationValues = [];
for (const angle of [0, 0.02, 0.04, 0.05, 0.025, 0]) rotationValues.push(0, 0, Math.sin(angle / 2), Math.cos(angle / 2));
const timeAccessor = document.createAccessor('inspect_times').setType('SCALAR').setArray(times).setBuffer(buffer);
const translationAccessor = document.createAccessor('inspect_translation').setType('VEC3').setArray(translations).setBuffer(buffer);
const rotationAccessor = document.createAccessor('inspect_rotation').setType('VEC4').setArray(new Float32Array(rotationValues)).setBuffer(buffer);
const inspect = document.createAnimation('inspect');
for (const [targetPath, accessor] of [['translation', translationAccessor], ['rotation', rotationAccessor]]) {
  const sampler = document.createAnimationSampler().setInput(timeAccessor).setOutput(accessor).setInterpolation('LINEAR');
  inspect.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(armsRig).setTargetPath(targetPath).setSampler(sampler));
}
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'revolver-runtime.glb');
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: 'revolver38', displayName: 'REVÓLVER .38 "TROVÃO"', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: sourceClips, addedClip: 'inspect', mesh: 'GEO_WEAPON_REVOLVER_python.001', armsRig: 'RIG_FP_ARMS', weaponRig: 'RIG_WEAPON_REVOLVER' },
  sockets: { muzzleParent: 'RIG_WEAPON_REVOLVER', muzzleLocal: [0,-20,0], sightParent: 'RIG_WEAPON_REVOLVER', sightLocal: [0,1,0] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`REVOLVER_FINAL_OK ${JSON.stringify(report)}`);
