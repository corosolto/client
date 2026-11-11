#!/usr/bin/env node
/* Behavioral proof for the non-audio inventory and the public-audio orphan ratchet. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const GENERATOR = join(ROOT, 'tools', 'gen-asset-inventory.mjs');
const AUDIO_GENERATOR = join(ROOT, 'tools', 'gen-audio-manifest.mjs');

function runInventory(fixture, args = []) {
  return spawnSync(process.execPath, [GENERATOR, `--root=${fixture}`, ...args], { encoding: 'utf8' });
}

function runAudio(fixture, orphans, args = []) {
  return spawnSync(process.execPath, [AUDIO_GENERATOR, `--raiz=${join(fixture, 'public/audio')}`, `--orfaos=${orphans}`, ...args], { encoding: 'utf8' });
}

function put(root, rel, bytes = rel) {
  const path = join(root, ...rel.split('/'));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

function expectStatus(result, status, label) {
  assert.equal(result.status, status, `${label}\n${result.stdout || ''}${result.stderr || ''}`);
}

function mutations() {
  const fixture = mkdtempSync(join(tmpdir(), 'asset-inventory-'));
  const orphans = join(fixture, 'audio-orphans.json');
  try {
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    put(fixture, 'public/models/skins/manifest.json', '{"hero":{"model":"/models/skins/hero-ab12.glb"}}\n');
    put(fixture, 'public/models/skins/hero-ab12.glb', 'post-rewrite-model');
    put(fixture, 'public/img/textures/kept.webp', 'texture');
    put(fixture, 'public/posters/kept.jpg', 'poster');

    const manifestPath = join(fixture, 'tools/asset-inventory.json');
    let result = runInventory(fixture);
    expectStatus(result, 0, 'initial non-audio inventory generation');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 0, 'initial non-audio inventory check');
    console.log('AI1: post-rewrite JSON reference baseline passes.');

    put(fixture, 'public/models/props/new-orphan.glb', 'unreviewed');
    const beforeOrphan = readFileSync(manifestPath, 'utf8');
    result = runInventory(fixture);
    expectStatus(result, 1, 'unreviewed orphan generation');
    assert.match(result.stderr, /orphan-new: models\/props\/new-orphan\.glb/);
    assert.equal(readFileSync(manifestPath, 'utf8'), beforeOrphan);
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'generate then check cannot self-approve an orphan');
    assert.match(result.stderr, /orphan-new: models\/props\/new-orphan\.glb/);
    rmSync(join(fixture, 'public/models/props/new-orphan.glb'));
    console.log('AI2: generation refuses a new orphan and the following check still fails.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const catalog = 'catalog';\nexport const logo = 'unrelated';\n");
    put(fixture, 'public/models/props/logo.glb', 'unrelated-stem');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'stem fragment is not an asset reference');
    assert.match(result.stderr, /orphan-new: models\/props\/logo\.glb/);
    rmSync(join(fixture, 'public/models/props/logo.glb'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2b: a stem embedded in unrelated text cannot hide an orphan.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\nexport const character = 'adjim';\nexport const state = 'crouch';\n");
    put(fixture, 'public/models/anims/adjim/crouch.glb', 'dynamic-reference');
    expectStatus(runInventory(fixture), 0, 'path-qualified dynamic reference generation');
    expectStatus(runInventory(fixture, ['--check']), 0, 'path-qualified dynamic reference check');
    rmSync(join(fixture, 'public/models/anims/adjim/crouch.glb'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    expectStatus(runInventory(fixture), 0, 'dynamic reference removal generation');
    console.log('AI2c: a template with literal path values proves a dynamic reference.');

    put(fixture, 'public/models/props/legacy.glb', 'reviewed-orphan');
    const reviewed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    reviewed.files['models/props/legacy.glb'] = createHash('sha256')
      .update(readFileSync(join(fixture, 'public/models/props/legacy.glb'))).digest('hex');
    reviewed.unreferenced.push('models/props/legacy.glb');
    writeFileSync(manifestPath, `${JSON.stringify(reviewed, null, 2)}\n`);
    expectStatus(runInventory(fixture), 0, 'explicitly reviewed orphan generation');
    expectStatus(runInventory(fixture, ['--check']), 0, 'explicitly reviewed orphan check');
    console.log('AI3: an explicitly reviewed orphan remains valid through generate and check.');

    const beforeLost = readFileSync(manifestPath, 'utf8');
    rmSync(join(fixture, 'public/models/skins/hero-ab12.glb'));
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'referenced-file-lost mutant');
    assert.match(result.stderr, /referenced-file-lost: models\/skins\/hero-ab12\.glb/);
    result = runInventory(fixture);
    expectStatus(result, 1, 'generator cannot erase a live reference');
    assert.equal(readFileSync(manifestPath, 'utf8'), beforeLost);
    put(fixture, 'public/models/skins/hero-ab12.glb', 'post-rewrite-model');
    console.log('AI4: referenced-file-lost fails and generation refuses to hide it.');

    put(fixture, 'public/textures/added.webp', 'safe-add');
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const ADDED = '/textures/added.webp';\n");
    expectStatus(runInventory(fixture), 0, 'safe referenced add generation');
    expectStatus(runInventory(fixture, ['--check']), 0, 'safe referenced add check');
    assert.ok(JSON.parse(readFileSync(manifestPath, 'utf8')).files['textures/added.webp']);

    rmSync(join(fixture, 'public/models/props/legacy.glb'));
    expectStatus(runInventory(fixture), 0, 'safe reviewed orphan removal generation');
    expectStatus(runInventory(fixture, ['--check']), 0, 'safe reviewed orphan removal check');
    assert.ok(!JSON.parse(readFileSync(manifestPath, 'utf8')).files['models/props/legacy.glb']);
    console.log('AI5: referenced add and reviewed orphan removal migrate safely.');

    writeFileSync(orphans, '{"schema":1,"allow":["legacy/old.mp3"]}\n');
    put(fixture, 'public/audio/time-e/ingame/used.mp3', 'used');
    put(fixture, 'public/audio/legacy/old.mp3', 'reviewed-old-orphan');
    put(fixture, 'public/audio/curated/needed.mp3', 'needed');
    put(fixture, 'public/audio/manifest.json', '{"general":{"needed":"audio/curated/needed.mp3"}}\n');
    expectStatus(runAudio(fixture, orphans), 0, 'audio baseline generation');
    expectStatus(runAudio(fixture, orphans, ['--check']), 0, 'audio baseline check');
    console.log('AU1: allowlisted audio orphan and referenced recording pass.');

    put(fixture, 'public/audio/legacy/new.mp3', 'unreviewed');
    result = runAudio(fixture, orphans, ['--check']);
    expectStatus(result, 1, 'audio orphan-new mutant');
    assert.match(result.stderr, /orphan-new: legacy\/new\.mp3/);
    rmSync(join(fixture, 'public/audio/legacy/new.mp3'));
    console.log('AU2: audio orphan-new mutant fails.');

    rmSync(join(fixture, 'public/audio/curated/needed.mp3'));
    result = runAudio(fixture, orphans, ['--check']);
    expectStatus(result, 1, 'audio referenced-file-lost mutant');
    assert.match(result.stderr, /referenced-file-lost: audio\/curated\/needed\.mp3/);
    put(fixture, 'public/audio/curated/needed.mp3', 'needed');
    console.log('AU3: audio referenced-file-lost mutant fails.');

    put(fixture, 'public/audio/time-e/ingame/added.mp3', 'safe-audio-add');
    expectStatus(runAudio(fixture, orphans), 0, 'safe audio add generation');
    expectStatus(runAudio(fixture, orphans, ['--check']), 0, 'safe audio add check');
    rmSync(join(fixture, 'public/audio/legacy/old.mp3'));
    writeFileSync(orphans, '{"schema":1,"allow":[]}\n');
    expectStatus(runAudio(fixture, orphans), 0, 'safe audio orphan removal generation');
    expectStatus(runAudio(fixture, orphans, ['--check']), 0, 'safe audio orphan removal check');
    assert.ok(existsSync(join(fixture, 'public/audio/time-e/ingame/added.mp3')));
    console.log('AU4: audio referenced add and manual orphan removal pass.');

    console.log('ASSET-INVENTORY mutations OK: generate/check orphan refusal, explicit review, 2 referenced-file-lost, safe add/remove for both inventories.');
    return 0;
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

if (process.argv.includes('--mutations')) process.exit(mutations());
const result = spawnSync(process.execPath, [GENERATOR, '--check'], { cwd: ROOT, stdio: 'inherit' });
process.exit(result.status ?? 1);
