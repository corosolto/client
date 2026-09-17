#!/usr/bin/env node
/**
 * Fecha a LMG sobre a família MGX5 do pacote: mãos, recargas por cinto/caixa e
 * mecanismos próprios ficam como o pacote autorou; a receita nomeia o contrato
 * Mint, mede sockets, puxa o cinto no tiro e acrescenta um inspect autocontido.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, unpartition } from '@gltf-transform/functions';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = 'ce9921338a35cf0a5ab0959c451579d32b42e4468624f9c48b42c9e23bf88235';
const SOURCE_BYTES = 6810720;
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
if (!option('source') || !option('output-dir')) throw new Error('uso: --source=<lmg-runtime.glb> --output-dir=<fora-do-git>');
const source = path.resolve(option('source'));
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (sourceBytes.length !== SOURCE_BYTES || digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte lmg ausente ou divergente');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const byName = (name) => root.listNodes().find((node) => node.getName() === name);
const clips = new Map(root.listAnimations().map((clip) => [clip.getName(), clip]));
const expected = ['idle', 'reload_empty', 'reload_tactical'];
if ([...clips.keys()].sort().join(',') !== expected.join(',')) throw new Error(`clips lmg divergiram: ${[...clips.keys()]}`);
for (const texture of root.listTextures()) {
  const [width, height] = texture.getSize() || [];
  if (width !== 1 || height !== 1) throw new Error(`atlas ${texture.getName()} não é placeholder da fundação compartilhada`);
}
const arms = byName('RIG_FP_ARMS');
const rig = byName('RIG_WEAPON_LMG');
const gun = byName('GEO_WEAPON_LMG_MG5.001')?.setName('GEO_WEAPON_LMG_MGX5');
const box = byName('Bag')?.setName('MINT_AMMO_LMG_BOX');
const belt = byName('bullet')?.setName('MINT_AMMO_LMG_BELT');
const cover = byName('Top')?.setName('MINT_MECH_LMG_COVER');
const tray = byName('Feed_Tray')?.setName('MINT_MECH_LMG_FEED_TRAY');
const charger = byName('Lever')?.setName('MINT_MECH_LMG_CHARGER');
if (![arms, rig, gun, box, belt, cover, tray, charger].every(Boolean)) throw new Error('fonte lmg sem arma, mãos, cinto ou mecanismos completos');
if (belt.getParentNode() !== box) throw new Error('cinto não pendura da caixa própria');
rig.addChild(document.createNode('MINT_WEAPON_LMG').setExtras({ contract: 'baked-marker' }));
// Sockets medidos na malha em bind pose (centroide da boca do cano e do topo
// do receiver), expressos no espaço de RIG_WEAPON_LMG: -Z é o cano.
rig.addChild(document.createNode('SOCKET_MINT_MUZZLE').setTranslation([-0.019, 0.573, -63.191]).setExtras({ contract: 'muzzle' }));
rig.addChild(document.createNode('SOCKET_MINT_SIGHT').setTranslation([0.171, -10.467, 13.201]).setExtras({ contract: 'sight' }));
const buffer = root.listBuffers()[0] || document.createBuffer();
const accessor = (name, type, values) => document.createAccessor(name).setType(type).setArray(new Float32Array(values)).setBuffer(buffer);
const addChannel = (clip, node, targetPath, times, values, type) => {
  const sampler = document.createAnimationSampler()
    .setInput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}_times`, 'SCALAR', times))
    .setOutput(accessor(`${clip.getName()}_${node.getName()}_${targetPath}`, type, values)).setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
};
const multiply = (a, b) => [
  a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
  a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
  a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
  a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2],
];
const rotate = (q, v) => { const r = multiply(multiply(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [r[0], r[1], r[2]]; };
const stride = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
// Clipe autocontido: congela a pose completa do idle e só então acrescenta o
// movimento próprio — sem baseline, ossos sem chave voltavam ao rest pose.
const frozenIdle = (name, times) => {
  const clip = document.createAnimation(name);
  for (const idleChannel of clips.get('idle').listChannels()) {
    const target = idleChannel.getTargetNode();
    if (target === arms) continue;
    const output = idleChannel.getSampler().getOutput();
    const size = stride[output.getType()];
    if (!size) throw new Error(`canal idle não suportado: ${output.getType()}`);
    const first = Array.from(output.getArray().slice(0, size));
    addChannel(clip, target, idleChannel.getTargetPath(), times, times.flatMap(() => first), output.getType());
  }
  return clip;
};
// Tiro: o cinto avança exatamente um elo para dentro do receiver (a cadência
// do jogo reinicia o clipe a cada disparo) e o conjunto recua pela raiz.
const shootTimes = [0, 0.045, 0.09, 0.15, 0.22];
const shoot = frozenIdle('shoot', shootTimes);
const link = belt.listChildren()[0];
if (!link) throw new Error('cinto sem elos encadeados');
const linkStep = rotate(belt.getRotation(), link.getTranslation());
const beltBase = belt.getTranslation();
addChannel(shoot, belt, 'translation', shootTimes, [0, 0.35, 0.7, 1, 1].flatMap((phase) => beltBase.map((lane, axis) => lane + linkStep[axis] * phase)), 'VEC3');
addChannel(shoot, arms, 'translation', shootTimes, [0,0,0, 0.008,0.006,-0.004, 0.025,0.014,-0.010, 0.009,0.005,-0.004, 0,0,0], 'VEC3');
// Inspect: arma e duas mãos viajam juntas pela raiz e voltam exatamente ao idle.
const inspectTimes = [0, 0.35, 0.8, 1.25, 1.7, 2.1];
const inspect = frozenIdle('inspect', inspectTimes);
const qx = (degrees) => { const angle = degrees * Math.PI / 360; return [Math.sin(angle), 0, 0, Math.cos(angle)]; };
const qy = (degrees) => { const angle = degrees * Math.PI / 360; return [0, Math.sin(angle), 0, Math.cos(angle)]; };
const qz = (degrees) => { const angle = degrees * Math.PI / 360; return [0, 0, Math.sin(angle), Math.cos(angle)]; };
const inspectEuler = [[0,0,0],[-2,-5,2],[-4,-12,5],[-2,9,-4],[0,4,-1],[0,0,0]];
addChannel(inspect, arms, 'translation', inspectTimes, [0,0,0, 0.008,0.004,-0.004, 0.020,0.012,-0.010, 0.014,0.008,-0.007, 0.005,0.002,-0.002, 0,0,0], 'VEC3');
addChannel(inspect, arms, 'rotation', inspectTimes, inspectEuler.flatMap(([x, y, z]) => multiply(multiply(qx(x), qy(y)), qz(z))), 'VEC4');
// Recargas do pacote: tampa e bandeja compartilham o pivô do receiver e já
// abrem por rotação (76,6° e 45,1°), mas vinham com 87,8 cm e 54,3 cm de
// translação; a caixa saía 57,8 cm. Em primeira pessoa essas peças cruzavam o
// quadro soltas no ar. A dobradiça fica só no giro e a troca da caixa preserva
// a trajetória autorada com o módulo limitado.
const BOX_TRAVEL_CM = 18;
const boundTranslation = (clip, node, limitCm) => {
  const channel = clip.listChannels().find((candidate) => candidate.getTargetNode() === node && candidate.getTargetPath() === 'translation');
  if (!channel) throw new Error(`recarga ${clip.getName()} sem translação de ${node.getName()}`);
  const output = channel.getSampler().getOutput();
  const values = Array.from(output.getArray());
  const base = values.slice(0, 3);
  let peak = 0;
  for (let offset = 3; offset < values.length; offset += 3) {
    peak = Math.max(peak, Math.hypot(values[offset] - base[0], values[offset + 1] - base[1], values[offset + 2] - base[2]));
  }
  const factor = limitCm <= 0 ? 0 : Math.min(1, limitCm / peak);
  for (let offset = 0; offset < values.length; offset += 3) {
    for (let lane = 0; lane < 3; lane += 1) values[offset + lane] = base[lane] + (values[offset + lane] - base[lane]) * factor;
  }
  output.setArray(new Float32Array(values));
  return { node: node.getName(), peakCm: +peak.toFixed(2), factor: +factor.toFixed(4), boundCm: +(peak * factor).toFixed(2) };
};
const bounded = [];
for (const name of ['reload_tactical', 'reload_empty']) {
  const clip = clips.get(name);
  bounded.push({ clip: name, pieces: [
    boundTranslation(clip, cover, 0),
    boundTranslation(clip, tray, 0),
    boundTranslation(clip, box, BOX_TRAVEL_CM),
  ] });
}
await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'lmg-baked-runtime.glb');
await document.transform(prune({ keepExtras: true }), unpartition());
await io.write(output, document);
const outputBytes = await fs.readFile(output);
const report = {
  schemaVersion: 1, weapon: 'lmg', displayName: 'METRALHA "TRETA PESADA"', ready: false,
  source: { file: source, bytes: sourceBytes.length, sha256: SOURCE_SHA },
  preservation: { originalClips: expected, addedClips: ['shoot', 'inspect'], armsRig: arms.getName(), weaponRig: rig.getName(), weaponMesh: gun.getName(), mechanisms: [box.getName(), belt.getName(), cover.getName(), tray.getName(), charger.getName()], beltLinkStep: linkStep.map((lane) => +lane.toFixed(4)) },
  boundedTranslations: { boxTravelCm: BOX_TRAVEL_CM, clips: bounded },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) },
};
await fs.writeFile(path.join(outputDir, 'build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`LMG_FINAL_OK ${JSON.stringify(report)}`);
