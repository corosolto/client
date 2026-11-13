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

function combinedStatus(...results) {
  return results.every((result) => result.status === 0) ? 0 : 1;
}

function mutations() {
  assert.equal(combinedStatus({ status: 0 }, { status: 0 }), 0);
  assert.equal(combinedStatus({ status: 0 }, { status: null }), 1);
  assert.equal(combinedStatus({ status: null }, { status: 0 }), 1);
  const fixture = mkdtempSync(join(tmpdir(), 'asset-inventory-'));
  const orphans = join(fixture, 'audio-orphans.json');
  try {
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    put(fixture, 'public/models/skins/manifest.json', '{"hero":{"model":"/models/skins/hero-ab12.glb"}}\n');
    put(fixture, 'public/models/skins/hero-ab12.glb', 'post-rewrite-model');
    put(fixture, 'public/img/textures/kept.webp', 'texture');
    put(fixture, 'public/posters/kept.jpg', 'poster');

    const manifestPath = join(fixture, 'tools/asset-inventory.json');
    mkdirSync(join(fixture, 'tools'), { recursive: true });
    const reviewedPath = 'models/skins/manifest.json';
    writeFileSync(manifestPath, `${JSON.stringify({
      schema: 'asset-inventory-v1',
      roots: ['models', 'img/textures', 'textures', 'posters'],
      files: {
        [reviewedPath]: createHash('sha256')
          .update(readFileSync(join(fixture, 'public/models/skins/manifest.json'))).digest('hex'),
      },
      unreferenced: [reviewedPath],
    }, null, 2)}\n`);
    const initialReview = readFileSync(manifestPath, 'utf8');
    rmSync(manifestPath);
    expectStatus(runInventory(fixture), 1, 'bootstrap without a reviewed manifest');
    writeFileSync(manifestPath, initialReview);
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

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const catalog = 'catalog';\nexport const logo = 'unrelated';\nexport const backup = 'models/props/logo.glb.backup';\nexport const preview = 'models/props/logo.glb/preview';\nexport const prefix = 'backup/models/props/logo.glb';\n");
    put(fixture, 'public/models/props/logo.glb', 'unrelated-stem');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'stem fragment is not an asset reference');
    assert.match(result.stderr, /orphan-new: models\/props\/logo\.glb/);
    rmSync(join(fixture, 'public/models/props/logo.glb'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2b: a stem embedded in unrelated text cannot hide an orphan.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\nexport const character = 'adjim';\nexport const state = 'crouch';\nexport const url = clipUrl(character, state);\n");
    put(fixture, 'public/models/anims/adjim/crouch.glb', 'dynamic-reference');
    expectStatus(runInventory(fixture), 0, 'path-qualified dynamic reference generation');
    expectStatus(runInventory(fixture, ['--check']), 0, 'path-qualified dynamic reference check');
    rmSync(join(fixture, 'public/models/anims/adjim/crouch.glb'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    expectStatus(runInventory(fixture), 0, 'dynamic reference removal generation');
    console.log('AI2c: a direct local template call proves a dynamic reference.');

    put(fixture, 'public/js/refs.js', "export const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/models/anims/other.json', '{"id":"adjim","state":"crouch"}\n');
    put(fixture, 'public/models/anims/adjim/crouch.glb', 'dynamic-reference');
    result = runInventory(fixture);
    expectStatus(result, 1, 'values from another module do not prove a dynamic reference');
    rmSync(join(fixture, 'public/models/anims/adjim/crouch.glb'));
    rmSync(join(fixture, 'public/models/anims/other.json'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2d: dynamic values must come from the template module.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/mid.js', "export { clipUrl } from './refs.js';\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './mid.js';\nexport const character = 'adjim';\nexport const state = 'crouch';\nexport const url = clipUrl(character, state);\n");
    put(fixture, 'public/models/anims/adjim/crouch.glb', 'dynamic-reference-from-importers');
    expectStatus(runInventory(fixture), 0, 'reverse importer graph generation');
    expectStatus(runInventory(fixture, ['--check']), 0, 'reverse importer graph check');
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './mid.js';\nexport const character = 'adjim';\nexport const state = 'crouch';\nexport const unrelated = 'doidinho-bairro';\nexport const url = clipUrl(character, state);\n");
    put(fixture, 'public/models/anims/doidinho-bairro.glb', 'unrelated-importer-literal');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'unrelated importer literal remains an orphan');
    assert.match(result.stderr, /orphan-new: models\/anims\/doidinho-bairro\.glb/);
    rmSync(join(fixture, 'public/models/anims/doidinho-bairro.glb'));
    rmSync(join(fixture, 'public/models/anims/adjim/crouch.glb'));
    rmSync(join(fixture, 'public/js/mid.js'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    expectStatus(runInventory(fixture), 0, 'reverse importer graph cleanup');
    console.log('AI2e: values from a two-level reverse importer chain prove a dynamic reference.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst character = 'dead';\nconst state = 'idle';\nexport const load = (items) => items.map(character => clipUrl(character, state));\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'shadowed-literal');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'shadowed constant cannot prove a dynamic reference');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2f: a bare-arrow parameter cannot self-approve the shadowed module literal.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nexport const load = (items) => items.map(function (clipUrl) { return clipUrl('dead', 'idle'); });\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'shadowed-callee');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'shadowed imported callee cannot prove a dynamic reference');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2g: a function parameter cannot masquerade as the imported template.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nexport let url;\nif (clipUrl) { url = clipUrl('adjim', 'idle'); }\n");
    put(fixture, 'public/models/anims/adjim/idle.glb', 'guarded-real-call');
    expectStatus(runInventory(fixture), 0, 'control-flow guard preserves imported template call');
    expectStatus(runInventory(fixture, ['--check']), 0, 'control-flow guard reference check');
    rmSync(join(fixture, 'public/models/anims/adjim/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    expectStatus(runInventory(fixture), 0, 'control-flow guard cleanup');
    console.log('AI2h: an if guard does not shadow the imported template callee.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nexport const helpers = { clipUrl };\nhelpers.clipUrl('dead', 'idle');\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'property-callee');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'property call cannot prove the imported template binding');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2i: a property call cannot masquerade as the imported binding.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst id = 'dead';\nconst state = 'idle';\nexport const helpers = { clipUrl(id, state) /* method */ { return null; } };\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'method-declaration');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'method declaration cannot prove an imported template call');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2j: an object method signature is not a template call.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst id = 'dead';\nconst state = 'idle';\nfor (const id of ids) clipUrl(id, state);\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'loop-shadowed-literal');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'top-level loop const cannot reuse the outer literal');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2k: a top-level loop binding shadows the outer literal.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst id = 'adjim';\nconst state = 'idle';\nconst record = {};\nrecord.id = runtimeId;\nrecord.state++;\nexport const url = clipUrl(id, state);\n");
    put(fixture, 'public/models/anims/adjim/idle.glb', 'member-assignment');
    expectStatus(runInventory(fixture), 0, 'member assignments preserve unrelated lexical constants');
    expectStatus(runInventory(fixture, ['--check']), 0, 'member assignment reference check');
    rmSync(join(fixture, 'public/models/anims/adjim/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    expectStatus(runInventory(fixture), 0, 'member assignment cleanup');
    console.log('AI2l: member writes do not invalidate same-named lexical constants.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst id = 'adjim';\nconst state = 'idle';\nfunction inspect({ id: other }) { return other; }\nexport const url = clipUrl(id, state);\n");
    put(fixture, 'public/models/anims/adjim/idle.glb', 'destructuring-alias');
    expectStatus(runInventory(fixture), 0, 'destructuring key does not shadow outer literal');
    expectStatus(runInventory(fixture, ['--check']), 0, 'destructuring alias reference check');
    rmSync(join(fixture, 'public/models/anims/adjim/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    expectStatus(runInventory(fixture), 0, 'destructuring alias cleanup');
    console.log('AI2m: an aliased property key is not a lexical binding.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst id = 'dead';\nconst state = 'idle';\nfunction load({ ...id }) { return clipUrl(id, state); }\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'object-rest-binding');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'object rest binding shadows the outer literal');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2n: an object-rest parameter shadows the outer literal.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nexport const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nconst recursive = function clipUrl() { return clipUrl('dead', 'idle'); };\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'named-function-expression');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'named function expression shadows the imported callee');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2o: a named function expression cannot reuse the imported callee binding.');

    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\nconst clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\nconst other = (id, state) => null;\nexport { other as clipUrl };\n");
    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nexport const url = clipUrl('dead', 'idle');\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'private-template-alias');
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'private same-named template cannot satisfy an export alias');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2p: an export alias never resolves to a same-named private template.');

    put(fixture, 'public/js/refs.js', "export const clipUrl = (id, state) => `models/anims/${id}/${state}.glb`;\nexport const character = 'dead';\nexport const state = 'idle';\n");
    put(fixture, 'public/models/anims/dead/idle.glb', 'unused-template');
    result = runInventory(fixture);
    expectStatus(result, 1, 'unused local template cannot approve an on-disk orphan');
    assert.match(result.stderr, /orphan-new: models\/anims\/dead\/idle\.glb/);
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'unused local template also fails check');
    rmSync(join(fixture, 'public/models/anims/dead/idle.glb'));
    console.log('AI2q: an unused template and same-module literals cannot prove a call site.');

    put(fixture, 'public/js/consumer.js', "import { clipUrl } from './refs.js';\nexport const url = clipUrl('dead', 'idle');\n");
    result = runInventory(fixture);
    expectStatus(result, 1, 'dynamic call target missing from disk is lost');
    assert.match(result.stderr, /referenced-file-lost: models\/anims\/dead\/idle\.glb/);
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'dynamic missing target also fails check');
    assert.match(result.stderr, /referenced-file-lost: models\/anims\/dead\/idle\.glb/);
    rmSync(join(fixture, 'public/js/consumer.js'));
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2r: a resolved dynamic call whose target was never present fails generation and check.');

    put(fixture, 'public/js/refs.js', "export const id = 'ghost';\nexport const url = `models/props/${id}.glb`;\n");
    result = runInventory(fixture);
    expectStatus(result, 1, 'fully resolved inline target missing from disk is lost');
    assert.match(result.stderr, /referenced-file-lost: models\/props\/ghost\.glb/);
    result = runInventory(fixture, ['--check']);
    expectStatus(result, 1, 'fully resolved inline target also fails check');
    assert.match(result.stderr, /referenced-file-lost: models\/props\/ghost\.glb/);
    put(fixture, 'public/js/refs.js', "export const TEXTURE = '/img/textures/kept.webp';\nexport const POSTER = '/posters/kept.jpg';\n");
    console.log('AI2s: a fully resolved inline template whose target was never present fails generation and check.');

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

    put(fixture, 'public/audio/time-e/ingame/used.mp3', 'used');
    put(fixture, 'public/audio/legacy/old.mp3', 'reviewed-old-orphan');
    put(fixture, 'public/audio/curated/needed.mp3', 'needed');
    put(fixture, 'public/audio/manifest.json', '{"general":{"needed":"audio/curated/needed.mp3"}}\n');
    writeFileSync(orphans, `${JSON.stringify({ schema: 2, allow: [{ path: 'legacy/old.mp3', sha256: createHash('sha256').update('reviewed-old-orphan').digest('hex') }] })}\n`);
    expectStatus(runAudio(fixture, orphans), 0, 'audio baseline generation');
    expectStatus(runAudio(fixture, orphans, ['--check']), 0, 'audio baseline check');
    console.log('AU1: allowlisted audio orphan and referenced recording pass.');

    put(fixture, 'public/audio/legacy/new.mp3', 'unreviewed');
    result = runAudio(fixture, orphans, ['--check']);
    expectStatus(result, 1, 'audio orphan-new mutant');
    assert.match(result.stderr, /orphan-new: legacy\/new\.mp3/);
    rmSync(join(fixture, 'public/audio/legacy/new.mp3'));
    console.log('AU2: audio orphan-new mutant fails.');

    put(fixture, 'public/audio/legacy/old.mp3', 'tampered-content');
    result = runAudio(fixture, orphans, ['--check']);
    expectStatus(result, 1, 'approved audio with changed bytes is rejected');
    assert.match(result.stderr, /orphan-new: legacy\/old\.mp3/);
    put(fixture, 'public/audio/legacy/old.mp3', 'reviewed-old-orphan');
    console.log('AU2b: an allowlisted path with different bytes is rejected.');

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
    writeFileSync(orphans, '{"schema":2,"allow":[]}\n');
    expectStatus(runAudio(fixture, orphans), 0, 'safe audio orphan removal generation');
    expectStatus(runAudio(fixture, orphans, ['--check']), 0, 'safe audio orphan removal check');
    assert.ok(existsSync(join(fixture, 'public/audio/time-e/ingame/added.mp3')));
    console.log('AU4: audio referenced add and manual orphan removal pass.');

    console.log('ASSET-INVENTORY mutations OK: generate/check orphan refusal, explicit review, 4 referenced-file-lost, safe add/remove for both inventories.');
    return 0;
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

if (process.argv.includes('--mutations')) process.exit(mutations());
const result = spawnSync(process.execPath, [GENERATOR, '--check'], { cwd: ROOT, stdio: 'inherit' });
const audioManifest = join(ROOT, 'public/audio/manifest.json');
const audioPrepare = existsSync(audioManifest)
  ? { status: 0 }
  : spawnSync(process.execPath, [AUDIO_GENERATOR], { cwd: ROOT, stdio: 'inherit' });
const audioResult = audioPrepare.status === 0
  ? spawnSync(process.execPath, [AUDIO_GENERATOR, '--check'], { cwd: ROOT, stdio: 'inherit' })
  : { status: 1 };
process.exit(combinedStatus(result, audioPrepare, audioResult));
