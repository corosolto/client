#!/usr/bin/env node
/**
 * Fecha o pacote KINEMATION P90: preserva arma/mãos/recargas/inspect originais,
 * cria tiro autocontido com alavanca, mecanismo e gatilho próprios, e acrescenta
 * os marcadores necessários ao runtime. Produto e recibo ficam fora do Git.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { unpartition } from '@gltf-transform/functions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = 'bcc168ba41a001fb0e374b0500215f3f6ebd17aaf63480512a5c547fcf67139b';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<p90-runtime.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (sourceBytes.length !== 7855720 || digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte P90 ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const arms = byName('RIG_FP_ARMS');
const rig = byName('RIG_WEAPON_P90');
const gun = byName('GEO_WEAPON_P90_SKM_PDW90');
const mag = byName('Magazine');
const charger = byName('Charger');
const mechanism = byName('Mechanism');
const trigger = byName('Trigger');
const release1 = byName('Release1');
const release2 = byName('Release2');
if (![arms, rig, gun, mag, charger, mechanism, trigger, release1, release2].every(Boolean)) {
  throw new Error('fonte P90 sem rig, arma ou mecanismos completos');
}
const sourceClips = root.listAnimations().map((clip) => clip.getName()).sort();
if (sourceClips.join(',') !== ['idle','inspect','reload_empty','reload_tactical'].sort().join(',')) {
  throw new Error(`clips da fonte divergiram: ${sourceClips.join(',')}`);
}

const marker = document.createNode('MINT_WEAPON_P90');
rig.addChild(marker);
rig.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([71.9504961, 55.7027002, -35.4639031]));
rig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([43.2541514, 51.4103969, 0.1669268]));

const buffer = root.listBuffers()[0] || document.createBuffer();
const accessor = (name, type, values) => document.createAccessor(name).setType(type)
  .setArray(new Float32Array(values)).setBuffer(buffer);
const channel = (clip, node, targetPath, times, values, type) => {
  const sampler = document.createAnimationSampler()
    .setInput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}_times`, 'SCALAR', times))
    .setOutput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}`, type, values))
    .setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel()
    .setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
};
const idle = root.listAnimations().find((clip) => clip.getName() === 'idle');
const elementSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const shootTimes = [0, 0.045, 0.09, 0.15, 0.22];
const shoot = document.createAnimation('shoot');
for (const idleChannel of idle.listChannels()) {
  const node = idleChannel.getTargetNode();
  const targetPath = idleChannel.getTargetPath();
  if (node === arms && targetPath === 'translation') continue;
  const output = idleChannel.getSampler().getOutput();
  const size = elementSize[output.getType()];
  if (!size) throw new Error(`canal idle não suportado: ${node.getName()}:${targetPath}:${output.getType()}`);
  const value = Array.from(output.getArray().slice(0, size));
  channel(shoot, node, targetPath, shootTimes, shootTimes.flatMap(() => value), output.getType());
}
const chargerBase = charger.getTranslation();
const mechanismBase = mechanism.getTranslation();
const triggerBase = trigger.getRotation();
const triggerPose = (offset) => {
  const value = [triggerBase[0], triggerBase[1], triggerBase[2] - offset, triggerBase[3]];
  const norm = Math.hypot(...value);
  return value.map((lane) => lane / norm);
};
channel(shoot, charger, 'translation', shootTimes, shootTimes.flatMap((_, index) => [
  chargerBase[0], chargerBase[1] + [0, -3, -8, -3, 0][index], chargerBase[2],
]), 'VEC3');
channel(shoot, mechanism, 'translation', shootTimes, shootTimes.flatMap((_, index) => [
  mechanismBase[0], mechanismBase[1] + [0, -4, -10, -4, 0][index], mechanismBase[2],
]), 'VEC3');
channel(shoot, trigger, 'rotation', shootTimes, [0, 0.08, 0.16, 0.06, 0].flatMap(triggerPose), 'VEC4');
channel(shoot, arms, 'translation', shootTimes, [
  0,0,0, 0.008,0.006,-0.004, 0.025,0.014,-0.010, 0.009,0.005,-0.004, 0,0,0,
], 'VEC3');

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'p90-baked-runtime.glb');
await document.transform(unpartition());
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = {
  schemaVersion: 1, weapon: 'p90', displayName: 'P90 CHINELÃO', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: sourceClips, addedClips: ['shoot'], armsRig: 'RIG_FP_ARMS',
    weaponRig: 'RIG_WEAPON_P90', weaponMesh: 'GEO_WEAPON_P90_SKM_PDW90',
    mechanisms: ['Magazine','Charger','Mechanism','Release1','Release2','Trigger'] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) },
};
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`P90_FINAL_OK ${JSON.stringify(report)}`);
