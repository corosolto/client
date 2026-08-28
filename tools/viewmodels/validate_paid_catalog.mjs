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

async function main() {
  const privateRoot = path.resolve(process.argv[2] || PRIVATE_ROOT);
  invariant(path.relative(REPO_ROOT, privateRoot).startsWith('..'), 'licensed catalog must stay outside public repository');
  const catalog = JSON.parse(await fs.readFile(path.join(privateRoot, 'catalog.json'), 'utf8'));
  invariant(Object.keys(catalog.weapons).length === 26, `expected 26 weapon mappings, found ${Object.keys(catalog.weapons).length}`);
  invariant(catalog.families.length === 15, `expected 15 built families, found ${catalog.families.length}`);
  const familyNames = new Set(catalog.families.map((family) => family.family));
  for (const [weapon, mapping] of Object.entries(catalog.weapons)) {
    if (weapon === 'knife') continue;
    invariant(familyNames.has(mapping.family), `${weapon} maps to missing family ${mapping.family}`);
  }

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const report = { schemaVersion: 1, privateRoot, weapons: 26, families: [], utilities: [] };
  for (const family of catalog.families) {
    const source = path.join(privateRoot, family.family, `${family.family}-runtime.glb`);
    const stat = await fs.stat(source);
    invariant(stat.size < 32 * 1024 * 1024, `${family.family} exceeds 32 MiB runtime budget`);
    const document = await io.read(source);
    const root = document.getRoot();
    const animations = new Map(root.listAnimations().map((animation) => [animation.getName(), animation]));
    const required = REQUIRED_SPECIAL[family.family] || ['idle', 'reload_tactical', 'reload_empty'];
    for (const clip of required) invariant(animations.has(clip), `${family.family} is missing ${clip}`);
    const arms = root.listSkins().find((skin) => skin.getName() === 'RIG_FP_ARMS');
    invariant(arms?.listJoints().length === 67, `${family.family} has invalid arms skeleton`);
    invariant(root.listCameras().length === 1, `${family.family} must contain exactly one authored camera`);

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
    });
  }
  invariant(catalog.utilities?.length === 1, 'expected one paid utility family');
  const utilityPath = path.join(privateRoot, 'grenade/grenade-runtime.glb');
  const utilityStat = await fs.stat(utilityPath);
  invariant(utilityStat.size < 32 * 1024 * 1024, 'grenade family exceeds 32 MiB runtime budget');
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
