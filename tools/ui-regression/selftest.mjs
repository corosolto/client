#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = await mkdtemp(join(tmpdir(), 'ui-regression-selftest-'));
const base = join(root, 'base');
const head = join(root, 'head');
const out = join(root, 'out');
const element = { visible: true, rect: [10, 10, 40, 20], text: 'JOGAR' };
const scene = () => ({ viewport: [100, 100], errors: [], assets404: [], elements: { '#btn-jogar': { ...element } }, mediaReady: true, failed: null });
const manifest = (data) => ({ version: 1, scenes: { home: data } });
const png = (color) => sharp({ create: { width: 100, height: 100, channels: 3, background: color } }).png().toBuffer();

async function check(name, changed, expected, expectedExit) {
  await writeFile(join(head, 'manifest.json'), JSON.stringify(manifest(changed)));
  const env = { ...process.env };
  delete env.GITHUB_STEP_SUMMARY;
  const result = spawnSync(process.execPath, ['tools/ui-regression/classify.mjs', '--base', base, '--head', head, '--out', out], { cwd: new URL('../..', import.meta.url), env, encoding: 'utf8' });
  const report = JSON.parse(await readFile(join(out, 'report.json'), 'utf8'));
  if (report.status !== expected || result.status !== expectedExit) {
    throw new Error(`${name}: esperado ${expected}/${expectedExit}, recebido ${report.status}/${result.status}\n${result.stderr}`);
  }
  console.log(`${name}: ${report.status}`);
}

try {
  await Promise.all([mkdir(base), mkdir(head)]);
  await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest(scene())));
  const black = await png('#000000');
  await Promise.all([writeFile(join(base, 'home.stable.png'), black), writeFile(join(head, 'home.stable.png'), black)]);
  await check('sem mutação', scene(), 'SEM_REGRESSAO', 0);
  const missingButton = scene();
  missingButton.elements['#btn-jogar'].visible = false;
  await check('CTA desapareceu', missingButton, 'REGRESSAO', 1);
  const missingAsset = scene();
  missingAsset.assets404.push('/img/novo-asset.png');
  await check('novo 404', missingAsset, 'REGRESSAO', 1);
  const ignoredAsset = scene();
  ignoredAsset.assets404.push('/audio/menu-music/m17.mp3');
  await check('asset privado ausente', ignoredAsset, 'SEM_REGRESSAO', 0);
  await writeFile(join(head, 'home.stable.png'), await png('#ffffff'));
  await check('mudança visual', scene(), 'REVISAR', 0);
  const unavailable = scene();
  unavailable.failed = 'baseline indisponível';
  await writeFile(join(base, 'manifest.json'), JSON.stringify(manifest(unavailable)));
  await check('baseline indisponível', scene(), 'INCONCLUSIVO', 1);
} finally {
  await rm(root, { recursive: true, force: true });
}
