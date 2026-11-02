import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const H = await import('../tools/eval/harness.mjs');

test('disposed match cannot hide the next match banner', () => {
  const original = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const timers = new Map(); let serial = 0, first, second;
  globalThis.setTimeout = (callback, ms) => { const id = ++serial; timers.set(id, { callback, ms }); return id; };
  globalThis.clearTimeout = id => timers.delete(id);
  try {
    const textures = H.initTextures();
    first = H.bootGame('posto_treta', { textures, bots: 0 });
    first._banner('FIRST', 'old');
    const previous = [first._bannerT, first._bannerT2];
    assert.deepEqual(previous.map(id => timers.get(id).ms), [2600, 3000]);
    first.dispose();
    second = H.bootGame('posto_treta', { textures, bots: 0 });
    second._banner('SECOND', 'current');
    for (const id of previous) timers.get(id)?.callback();
    assert.equal(second.el.banner.classList.contains('show'), true);
    assert.equal(second.el.banner.classList.contains('hidden'), false);
    assert.ok(previous.every(id => !timers.has(id)), 'old match owns no banner timers after disposal');
  } finally {
    second?.dispose(); if (first && !first._disposed) first.dispose();
    Object.assign(globalThis, original);
  }
});

test('error reports identify the package version regardless of CSS ordering', () => {
  const html = fs.readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const start = html.indexOf('  function versao(){'), end = html.indexOf('\n  /*', start);
  assert.ok(start >= 0 && end > start);
  const version = vm.runInNewContext(html.slice(start, end) + '\nversao();', {
    window: { __CS_BUILD: { version: pkg.version } },
    document: { querySelector: () => ({ getAttribute: () => '/social.css?v=unrelated-css-revision' }) },
  });
  assert.equal(version, pkg.version);
  assert.match(html, /<script is:inline define:vars=\{\{ GIT_SHA, V \}\}>\s*window\.__CS_BUILD = \{ sha: GIT_SHA, version: V \};/);
});
