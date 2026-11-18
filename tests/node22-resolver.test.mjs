import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { localizarNode22 } from '../tools/eval/lib/node22.mjs';

/* Binário falso: responde só a versão, como `node -p process.versions.node`. */
function falso(arquivo, versao) {
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, `#!/bin/sh\necho ${versao}\n`);
  chmodSync(arquivo, 0o755);
  return arquivo;
}

function comHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'cs-node22-'));
  try { return fn(home); } finally { rmSync(home, { recursive: true, force: true }); }
}

const SEM_BREW = [];

test('on Node 22 the current executable is used as is', () => {
  assert.equal(localizarNode22({ env: {}, home: '/nada', brew: SEM_BREW, atual: '22.4.0', execPath: '/x/node' }), '/x/node');
});

test('another major with no Node 22 installed resolves to null, never to itself', () => comHome(home => {
  falso(join(home, '.nvm/versions/node/v24.1.0/bin/node'), '24.1.0');
  assert.equal(localizarNode22({ env: {}, home, brew: SEM_BREW, atual: '26.12.1', execPath: '/x/node' }), null);
}));

test('picks the newest Node 22 by numeric version, skipping a directory whose binary is not 22', () => comHome(home => {
  falso(join(home, '.asdf/installs/nodejs/22.9.0/bin/node'), '22.9.0');
  falso(join(home, '.asdf/installs/nodejs/22.10.0/bin/node'), '22.10.0');
  falso(join(home, '.asdf/installs/nodejs/22.11.0/bin/node'), '24.0.0');
  const achado = localizarNode22({ env: {}, home, brew: SEM_BREW, atual: '26.12.1', execPath: '/x/node' });
  assert.equal(achado, join(home, '.asdf/installs/nodejs/22.10.0/bin/node'));
}));

test('Homebrew node@22 comes before version managers', () => comHome(home => {
  const brew = join(home, 'brew');
  const esperado = falso(join(brew, 'opt/node@22/bin/node'), '22.20.0');
  falso(join(home, '.asdf/installs/nodejs/22.23.4/bin/node'), '22.23.4');
  assert.equal(localizarNode22({ env: {}, home, brew: [brew], atual: '26.12.1', execPath: '/x/node' }), esperado);
}));

test('CSBRASIL_NODE22 wins, and pointing it at another major is a loud error', () => comHome(home => {
  const certo = falso(join(home, 'certo/node'), '22.1.0');
  const errado = falso(join(home, 'errado/node'), '26.12.1');
  falso(join(home, '.asdf/installs/nodejs/22.23.4/bin/node'), '22.23.4');
  const base = { home, brew: SEM_BREW, atual: '26.12.1', execPath: '/x/node' };
  assert.equal(localizarNode22({ ...base, env: { CSBRASIL_NODE22: certo } }), certo);
  assert.throws(() => localizarNode22({ ...base, env: { CSBRASIL_NODE22: errado } }), /não é Node 22 \(26\.12\.1\)/);
}));
