#!/usr/bin/env node
/** Validate the private paid-viewmodel catalog without redistributing its binaries. */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../node_modules/@gltf-transform/extensions/dist/index.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const PRIVATE_ROOT = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
// Posições de socket medidas ANTES do conserto do bone-parent (BUG-75): a arma
// nova tem que cair no mesmo lugar com o idle aplicado, agora seguindo o bone.
const SOCKET_BASELINE_PATH = path.join(SCRIPT_DIR, 'vm-socket-baseline.json');
const SOCKET_POS_TOLERANCE = 2e-3;
const REQUIRED_SPECIAL = Object.freeze({
  shotgun: ['idle', 'reload_start', 'reload_loop', 'reload_end', 'pump', 'pump_empty'],
  bolt: ['idle', 'reload_empty', 'reload_start', 'reload_loop', 'reload_end', 'shoot'],
  revolver: ['idle', 'reload_empty'],
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteArray(array) {
  for (const value of array) if (!Number.isFinite(value)) return false;
  return true;
}

function quatScaleMatrix(t, q, s) {
  const [x, y, z, w] = q;
  const R = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  const M = R.map((row, i) => [...row.map((v, j) => v * s[j]), t[i]]);
  M.push([0, 0, 0, 1]);
  return M;
}

function matMul(A, B) {
  return A.map((row, i) => row.map((_, j) => row.reduce((acc, _v, k) => acc + A[i][k] * B[k][j], 0)));
}

/* Anda da raiz até o nó aplicando o primeiro keyframe do idle em cada ancestral:
   é a pose que o jogo mostra de fato (em rest, o socket agora vive no head do bone). */
function idleWorldPosition(root, targetNode) {
  const parentOf = new Map();
  for (const node of root.listNodes()) {
    for (const child of node.listChildren()) parentOf.set(child, node);
  }
  const idle = root.listAnimations().find((animation) => animation.getName() === 'idle');
  const override = new Map();
  for (const channel of idle?.listChannels() ?? []) {
    const node = channel.getTargetNode();
    if (!node) continue;
    const output = channel.getSampler()?.getOutput()?.getArray();
    if (!output) continue;
    const size = channel.getTargetPath() === 'rotation' ? 4 : 3;
    if (!override.has(node)) override.set(node, {});
    override.get(node)[channel.getTargetPath()] = Array.from(output.slice(0, size));
  }
  const chain = [targetNode];
  while (parentOf.has(chain[0])) chain.unshift(parentOf.get(chain[0]));
  let world = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  for (const node of chain) {
    const o = override.get(node) || {};
    const local = quatScaleMatrix(
      o.translation || node.getTranslation(),
      o.rotation || node.getRotation(),
      o.scale || node.getScale(),
    );
    world = matMul(world, local);
  }
  return [world[0][3], world[1][3], world[2][3]];
}

async function main() {
  const privateRoot = path.resolve(process.argv[2] || PRIVATE_ROOT);
  invariant(path.relative(REPO_ROOT, privateRoot).startsWith('..'), 'licensed catalog must stay outside public repository');
  const catalog = JSON.parse(await fs.readFile(path.join(privateRoot, 'catalog.json'), 'utf8'));
  const socketBaseline = JSON.parse(await fs.readFile(SOCKET_BASELINE_PATH, 'utf8'));
  invariant(Object.keys(catalog.weapons).length === 26, `expected 26 weapon mappings, found ${Object.keys(catalog.weapons).length}`);
  invariant(catalog.families.length === 15, `expected 15 built families, found ${catalog.families.length}`);
  const familyNames = new Set(catalog.families.map((family) => family.family));
  for (const [weapon, mapping] of Object.entries(catalog.weapons)) {
    if (weapon === 'knife') continue;
    invariant(familyNames.has(mapping.family), `${weapon} maps to missing family ${mapping.family}`);
  }

  // Orçamentos pós-de-dup (M4): braços compartilhados 1× em shared/, GLB de
  // família só com o próprio conteúdo — a troca de arma parou de baixar 23 MB.
  const shared = JSON.parse(await fs.readFile(path.join(privateRoot, 'shared/shared-manifest.json'), 'utf8'));
  const sharedNames = Object.keys(shared);
  invariant(sharedNames.length === 9, `expected 9 shared arm textures, found ${sharedNames.length}`);
  let sharedTotal = 0;
  for (const [name, entry] of Object.entries(shared)) {
    const stat = await fs.stat(path.join(privateRoot, 'shared', `${name}.webp`));
    invariant(stat.size === entry.bytes, `shared texture ${name} drifted from its manifest`);
    sharedTotal += stat.size;
  }
  invariant(sharedTotal <= 6 * 1024 * 1024, `shared arm set exceeds 6 MiB (${sharedTotal})`);

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const report = { schemaVersion: 1, privateRoot, weapons: 26, families: [], utilities: [], sharedBytes: sharedTotal };
  let catalogTotal = 0;
  for (const family of catalog.families) {
    const source = path.join(privateRoot, family.family, `${family.family}-runtime.glb`);
    const stat = await fs.stat(source);
    invariant(stat.size < 8 * 1024 * 1024, `${family.family} exceeds 8 MiB runtime budget (${stat.size})`);
    catalogTotal += stat.size;
    const document = await io.read(source);
    const root = document.getRoot();
    for (const texture of root.listTextures()) {
      const bytes = texture.getImage()?.byteLength ?? 0;
      invariant(bytes <= 300 * 1024,
        `${family.family}: embedded texture ${texture.getName()} is ${bytes} B (arm set must live in shared/)`);
    }
    const animations = new Map(root.listAnimations().map((animation) => [animation.getName(), animation]));
    const required = REQUIRED_SPECIAL[family.family] || ['idle', 'reload_tactical', 'reload_empty'];
    for (const clip of required) invariant(animations.has(clip), `${family.family} is missing ${clip}`);
    const arms = root.listSkins().find((skin) => skin.getName() === 'RIG_FP_ARMS');
    invariant(arms?.listJoints().length === 67, `${family.family} has invalid arms skeleton`);
    invariant(root.listCameras().length === 1, `${family.family} must contain exactly one authored camera`);

    // BUG-75: a raiz da arma tem que descer de ik_hand_gun (bone ANIMADO) e cair,
    // com o idle aplicado, onde o weld estático antigo a deixava — senão flutua.
    const baselineEntry = socketBaseline[family.family];
    invariant(baselineEntry, `${family.family} has no socket baseline in vm-socket-baseline.json`);
    const weaponRoot = root.listNodes().find((node) => node.getName() === baselineEntry.node);
    invariant(weaponRoot, `${family.family} lost weapon root node ${baselineEntry.node}`);
    const parentOf = new Map();
    for (const node of root.listNodes()) {
      for (const child of node.listChildren()) parentOf.set(child, node);
    }
    let ikAncestor = false;
    for (let node = parentOf.get(weaponRoot); node; node = parentOf.get(node)) {
      if (node.getName() === 'ik_hand_gun') { ikAncestor = true; break; }
    }
    invariant(ikAncestor, `${family.family}: ${baselineEntry.node} is not parented under ik_hand_gun`);
    const idlePos = idleWorldPosition(root, weaponRoot);
    const idleDelta = Math.hypot(...idlePos.map((v, i) => v - baselineEntry.worldIdlePos[i]));
    invariant(
      idleDelta <= SOCKET_POS_TOLERANCE,
      `${family.family}: weapon root drifted ${idleDelta.toFixed(4)} m from the authored idle position`,
    );
    const ikDriven = new Set();
    for (const animation of root.listAnimations()) {
      if (!animation.getName().startsWith('reload')) continue;
      for (const channel of animation.listChannels()) {
        if (channel.getTargetNode()?.getName() === 'ik_hand_gun') ikDriven.add(animation.getName());
      }
    }
    invariant(ikDriven.size > 0, `${family.family}: no reload clip animates ik_hand_gun (gun would stay welded)`);

    for (const [name, animation] of animations) {
      const targets = new Set();
      for (const channel of animation.listChannels()) {
        const sampler = channel.getSampler();
        const input = sampler?.getInput()?.getArray();
        const output = sampler?.getOutput()?.getArray();
        invariant(input && output, `${family.family}/${name} contains an incomplete channel`);
        invariant(finiteArray(input) && finiteArray(output), `${family.family}/${name} contains non-finite keyframes`);
        for (let index = 1; index < input.length; index += 1) {
          invariant(input[index] > input[index - 1], `${family.family}/${name} has duplicate or reversed timestamps`);
        }
        const key = `${channel.getTargetNode()?.getName()}:${channel.getTargetPath()}`;
        invariant(!targets.has(key), `${family.family}/${name} animates ${key} twice`);
        targets.add(key);
      }
    }
    report.families.push({
      family: family.family,
      bytes: stat.size,
      skins: root.listSkins().length,
      armsJoints: arms.listJoints().length,
      clips: [...animations.keys()],
      weaponRoot: baselineEntry.node,
      ikHandGunAncestor: ikAncestor,
      idlePosDeltaM: Number(idleDelta.toFixed(6)),
      reloadDrivesIkHandGun: [...ikDriven].sort(),
    });
  }
  invariant(catalogTotal + sharedTotal <= 100 * 1024 * 1024,
    `weapon catalog exceeds 100 MiB (${catalogTotal + sharedTotal})`);
  invariant(catalog.utilities?.length === 1, 'expected one paid utility family');
  const utilityPath = path.join(privateRoot, 'grenade/grenade-runtime.glb');
  const utilityStat = await fs.stat(utilityPath);
  invariant(utilityStat.size < 8 * 1024 * 1024, 'grenade family exceeds 8 MiB runtime budget');
  const utilityDocument = await io.read(utilityPath);
  const utilityRoot = utilityDocument.getRoot();
  const utilityClips = new Set(utilityRoot.listAnimations().map((animation) => animation.getName()));
  for (const clip of ['idle', 'throw_start', 'throw_loop', 'throw_end']) {
    invariant(utilityClips.has(clip), `grenade family is missing ${clip}`);
  }
  const utilityModels = new Set(utilityRoot.listNodes().map((node) => node.getName()));
  for (const model of ['UTILITY_HE', 'UTILITY_FLASH', 'UTILITY_SMOKE']) {
    invariant(utilityModels.has(model), `grenade family is missing ${model}`);
  }
  const utilityArms = utilityRoot.listSkins().find((skin) => skin.getName() === 'RIG_FP_ARMS');
  invariant(utilityArms?.listJoints().length === 67, 'grenade family has invalid arms skeleton');
  invariant(utilityRoot.listCameras().length === 1, 'grenade family must contain one authored camera');
  report.utilities.push({
    family: 'grenade', bytes: utilityStat.size,
    clips: [...utilityClips], models: [...utilityModels].filter((name) => name.startsWith('UTILITY_')),
  });
  const worldPath = path.join(privateRoot, 'grenade/grenades-world.glb');
  const worldStat = await fs.stat(worldPath);
  invariant(worldStat.size < 8 * 1024 * 1024, 'world grenade pack exceeds 8 MiB budget');
  const worldDocument = await io.read(worldPath);
  const worldNames = new Set(worldDocument.getRoot().listNodes().map((node) => node.getName()));
  for (const model of ['UTILITY_HE', 'UTILITY_FLASH', 'UTILITY_SMOKE']) {
    invariant(worldNames.has(model), `world grenade pack is missing ${model}`);
  }
  report.utilities[0].worldBytes = worldStat.size;
  const reportPath = path.join(privateRoot, 'validation-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`CORO_PAID_VIEWMODEL_VALIDATION=${JSON.stringify({ reportPath, families: report.families.length, weapons: report.weapons })}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
