#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const optimizer = path.join(root, 'tools/viewmodels/optimize_paid_family.mjs');
const gates = path.join(root, 'tools/viewmodels/prep/precisao-final-gates.py');
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const run = (bin, args) => spawnSync(bin, args, { cwd: root, encoding: 'utf8' });
const checks = [];
const check = (ok, label) => {
  checks.push({ ok: Boolean(ok), label });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
};

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'csbrasil-vm-tools-'));
try {
  const input = path.join(tmp, 'mosin-baked-runtime.glb');
  const output = path.join(tmp, 'bolt', 'mosin-baked-runtime.glb');
  const report = `${output}.optimize.json`;
  const sentinel = path.join(tmp, 'svd-baked-runtime.glb');

  const document = new Document();
  const buffer = document.createBuffer();
  const pixels = await sharp({
    create: { width: 4, height: 4, channels: 4, background: '#a08060' },
  }).webp().toBuffer();
  const texture = document.createTexture('T_Arm01_B').setImage(pixels).setMimeType('image/webp');
  const material = document.createMaterial('Hand').setBaseColorTexture(texture);
  const position = document.createAccessor('position')
    .setType(Accessor.Type.VEC3)
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const primitive = document.createPrimitive().setAttribute('POSITION', position).setMaterial(material);
  const mesh = document.createMesh('fixture').addPrimitive(primitive);
  document.createScene('fixture').addChild(document.createNode('fixture').setMesh(mesh));
  await new NodeIO().write(input, document);
  await fs.writeFile(sentinel, await fs.readFile(input));
  const inputBefore = sha(await fs.readFile(input));
  const sentinelBefore = sha(await fs.readFile(sentinel));

  const optimized = run(process.execPath, [optimizer, '--familia=bolt', `--input=${input}`,
    `--output=${output}`, `--report=${report}`, tmp]);
  check(optimized.status === 0, 'otimizador aceita nome *-baked-runtime.glb por --input/--output');
  const result = JSON.parse(await fs.readFile(report, 'utf8'));
  check(result.mode === 'explicit-file' && result.families.bolt.replaced === 1,
    'modo explícito troca somente a textura redundante declarada');
  check(sha(await fs.readFile(input)) === inputBefore, 'input explícito permanece imutável');
  check(sha(await fs.readFile(sentinel)) === sentinelBefore, 'mutante vizinho prova que nenhum outro GLB mudou');
  check((await fs.stat(output)).size > 0, 'output explícito foi criado no caminho pedido');

  const incomplete = run(process.execPath, [optimizer, '--familia=bolt', `--input=${input}`, tmp]);
  check(incomplete.status !== 0 && `${incomplete.stderr}${incomplete.stdout}`.includes('--input e --output'),
    'interface fail-closed recusa somente --input');

  const help = run('python3', [gates, '--help']);
  check(help.status === 0 && ['--asset-root', '--baseline-root', '--mutant-root', '--output']
    .every((flag) => help.stdout.includes(flag)), 'gate publica todas as raízes configuráveis');
  const missingRoot = path.join(tmp, 'raiz-mutante-ausente');
  const missing = run('python3', [gates, `--asset-root=${missingRoot}`,
    `--baseline-root=${tmp}`, `--output=${path.join(tmp, 'gates.json')}`, '--weapons=mosin']);
  check(missing.status !== 0 && `${missing.stderr}${missing.stdout}`.includes(missingRoot),
    'mutante de raiz ausente prova que --asset-root governa a leitura');

  const gateSource = await fs.readFile(gates, 'utf8');
  const interfaceBites = (source) => source.includes('asset_root = args.asset_root.resolve()')
    && source.includes('candidate(asset_root, arma)');
  check(interfaceBites(gateSource), 'gate liga argumento asset-root ao resolvedor de candidatos');
  check(!interfaceBites(gateSource.replace('asset_root = args.asset_root.resolve()', 'asset_root = DEFAULT_F')),
    'mutante que volta à raiz fixa é rejeitado');
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: checks.length, failed: failed.map((x) => x.label) }));
if (failed.length) process.exitCode = 1;
