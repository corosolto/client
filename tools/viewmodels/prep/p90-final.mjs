#!/usr/bin/env node
/**
 * Fecha a P90 sobre a câmera e as malhas de mãos estáveis da fundação SMG.
 * As ações autorais da P90 são retargetadas por nome; arma, pente e mecanismos
 * continuam vindo do pacote P90 e permanecem no produto privado.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const FOUNDATION_SHA = 'aed9fd871b9b9281f3a7fbe7db2baab0095cc5f5f5cc7cbd802ae31cabd5d102';
const SOURCE_SHA = 'bcc168ba41a001fb0e374b0500215f3f6ebd17aaf63480512a5c547fcf67139b';
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('foundation') || !option('source') || !option('output-dir')) {
  throw new Error('uso: --foundation=<smg-runtime.glb> --source=<p90-runtime.glb> --output-dir=<fora-do-git>');
}
const foundation = path.resolve(option('foundation'));
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const foundationBytes = await fs.readFile(foundation);
const sourceBytes = await fs.readFile(source);
if (foundationBytes.length !== 3764304 || digest(foundationBytes) !== FOUNDATION_SHA) throw new Error('fundação SMG ausente ou divergente');
if (sourceBytes.length !== 7855720 || digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte P90 ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(foundation);
const p90Document = await io.read(source);
const root = document.getRoot();
const p90Root = p90Document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const sourceByName = (name) => p90Root.listNodes().find((node) => node.getName() === name);
const baseNodes = new Map(root.listNodes().filter((node) => node.getName()).map((node) => [node.getName(), node]));
const baseClips = root.listAnimations();
const arms = byName('RIG_FP_ARMS');
const baseIkGun = byName('ik_hand_gun');
const donorRig = byName('RIG_WEAPON_SMG');
const p90RigSource = sourceByName('RIG_WEAPON_P90');
const p90Scene = p90Root.listScenes()[0];
const p90Clips = p90Root.listAnimations();
if (!arms || !baseIkGun || !donorRig || !p90RigSource || !p90Scene) throw new Error('fundação SMG ou pacote P90 incompleto');
const sourceClipNames = p90Clips.map((clip) => clip.getName()).sort();
if (sourceClipNames.join(',') !== ['idle','inspect','reload_empty','reload_tactical'].sort().join(',')) {
  throw new Error(`clips P90 divergiram: ${sourceClipNames.join(',')}`);
}

const p90WeaponNodes = new Set();
const collect = (node) => { p90WeaponNodes.add(node); for (const child of node.listChildren()) collect(child); };
collect(p90RigSource);
const map = mergeDocuments(document, p90Document);
const copiedScene = map.get(p90Scene);
const p90Rig = map.get(p90RigSource);
if (!copiedScene || !p90Rig) throw new Error('merge P90 não preservou cena/rig');
p90Rig.getParentNode()?.removeChild(p90Rig);
baseIkGun.addChild(p90Rig);
for (const sourceClip of p90Clips) {
  for (const sourceChannel of sourceClip.listChannels()) {
    const sourceTarget = sourceChannel.getTargetNode();
    if (p90WeaponNodes.has(sourceTarget)) continue;
    const target = baseNodes.get(sourceTarget?.getName());
    if (!target) throw new Error(`canal P90 sem alvo na fundação: ${sourceTarget?.getName()}`);
    map.get(sourceChannel).setTargetNode(target);
  }
}
for (const clip of baseClips) clip.dispose();
donorRig.getParentNode()?.removeChild(donorRig);
copiedScene.dispose();

const p90RigNode = p90Rig;
const gun = map.get(sourceByName('GEO_WEAPON_P90_SKM_PDW90'));
const mag = map.get(sourceByName('Magazine'))?.setName('MINT_WEAPON_MAG_P90');
const charger = map.get(sourceByName('Charger'))?.setName('MINT_MECH_P90_CHARGER');
const mechanism = map.get(sourceByName('Mechanism'))?.setName('MINT_MECH_P90_MECHANISM');
const trigger = map.get(sourceByName('Trigger'))?.setName('MINT_MECH_P90_TRIGGER');
const release1 = map.get(sourceByName('Release1'))?.setName('MINT_MECH_P90_RELEASE_L');
const release2 = map.get(sourceByName('Release2'))?.setName('MINT_MECH_P90_RELEASE_R');
if (![p90RigNode, gun, mag, charger, mechanism, trigger, release1, release2].every(Boolean)) throw new Error('produto P90 perdeu arma ou mecanismos');
p90RigNode.addChild(document.createNode('MINT_WEAPON_P90').setExtras({ contract: 'baked-marker' }));
p90RigNode.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([71.9504961, 55.7027002, -35.4639031]).setExtras({ contract: 'muzzle' }));
p90RigNode.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([43.2541514, 51.4103969, 0.1669268]).setExtras({ contract: 'sight' }));

const buffer = root.listBuffers()[0] || document.createBuffer();
const accessor = (name, type, values) => document.createAccessor(name).setType(type).setArray(new Float32Array(values)).setBuffer(buffer);
const channel = (clip, node, targetPath, times, values, type) => {
  const sampler = document.createAnimationSampler()
    .setInput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}_times`, 'SCALAR', times))
    .setOutput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}`, type, values)).setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
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
const triggerPose = (offset) => { const value = [triggerBase[0], triggerBase[1], triggerBase[2] - offset, triggerBase[3]]; const norm = Math.hypot(...value); return value.map((lane) => lane / norm); };
channel(shoot, charger, 'translation', shootTimes, shootTimes.flatMap((_, index) => [chargerBase[0], chargerBase[1] + [0,-3,-8,-3,0][index], chargerBase[2]]), 'VEC3');
channel(shoot, mechanism, 'translation', shootTimes, shootTimes.flatMap((_, index) => [mechanismBase[0], mechanismBase[1] + [0,-4,-10,-4,0][index], mechanismBase[2]]), 'VEC3');
channel(shoot, trigger, 'rotation', shootTimes, [0,0.08,0.16,0.06,0].flatMap(triggerPose), 'VEC4');
channel(shoot, arms, 'translation', shootTimes, [0,0,0, 0.008,0.006,-0.004, 0.025,0.014,-0.010, 0.009,0.005,-0.004, 0,0,0], 'VEC3');

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'p90-baked-runtime.glb');
await document.transform(prune({ keepExtras: true }), unpartition());
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = {
  schemaVersion: 1, weapon: 'p90', displayName: 'P90 CHINELÃO', ready: false,
  foundation: { file: foundation, bytes: foundationBytes.length, sha256: FOUNDATION_SHA },
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: sourceClipNames, addedClips: ['shoot'], armsRig: 'RIG_FP_ARMS', weaponRig: 'RIG_WEAPON_P90', weaponMesh: 'GEO_WEAPON_P90_SKM_PDW90', mechanisms: ['MINT_WEAPON_MAG_P90','MINT_MECH_P90_CHARGER','MINT_MECH_P90_MECHANISM','MINT_MECH_P90_RELEASE_L','MINT_MECH_P90_RELEASE_R','MINT_MECH_P90_TRIGGER'] },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) },
};
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`P90_FINAL_OK ${JSON.stringify(report)}`);
