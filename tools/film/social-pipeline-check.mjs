#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), 'coro-social-check-'));
const library = join(root, 'library');
const original = join(library, 'originals', 'fixture.mp4');
const decisions = join(root, 'decisions.jsonl');
const published = join(root, 'published.jsonl');
const output = join(root, 'queue.json');
const writeJsonl = async (path, rows) => writeFile(path, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
const plan = async () => {
  await run(process.execPath, ['tools/film/social-queue.mjs', '--library', library, '--decisions', decisions,
    '--published', published, '--out', output, '--campaign', 'fixture-20261024']);
  return JSON.parse(await readFile(output, 'utf8'));
};

try {
  await mkdir(join(library, 'originals'), { recursive: true });
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
    'testsrc2=size=1280x720:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-t', '1', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-shortest', original]);
  const sha256 = createHash('sha256').update(await readFile(original)).digest('hex');
  const id = sha256.slice(0, 20);
  await run(process.execPath, ['tools/film/social-package.mjs', '--source', original,
    '--out', join(library, 'packages', id)]);
  const row = { id, sha256, file: 'originals/fixture.mp4', review: 'approved', rights: 'self',
    kind: 'gameplay', opponents: 'bots', map: 'loja_h' };
  const decision = { id, status: 'approved', visualReview: 'passed', audioReview: 'passed',
    publicationRights: true, approvedBy: 'fixture', approvedAt: '2026-10-24T12:00:00Z',
    caption: 'Combate na Loja H.', character: 'Canarinho', gameBuild: 'fixture',
    platforms: ['x', 'instagram', 'tiktok', 'youtube'], package: `packages/${id}/package.json` };
  await writeJsonl(join(library, 'index.jsonl'), [row]);
  await writeJsonl(decisions, [decision]);
  await writeJsonl(published, []);
  let result = await plan();
  assert.equal(result.count, 4);
  assert.equal(result.queue.filter(item => item.video.endsWith('portrait.mp4')).length, 3);
  assert(result.queue.every(item => item.sourceSha256 === sha256 && item.state === 'draft'));

  await writeJsonl(join(library, 'index.jsonl'), [{ ...row, review: 'pending' }]);
  result = await plan();
  assert.equal(result.count, 0);
  assert(result.blocked[0].reasons.includes('original não aprovado na biblioteca'));
  await writeJsonl(join(library, 'index.jsonl'), [row]);

  await writeJsonl(decisions, [{ ...decision, publicationRights: false }]);
  result = await plan();
  assert.equal(result.count, 0);
  await writeJsonl(decisions, [decision]);

  await writeJsonl(join(library, 'index.jsonl'), [{ ...row, sha256: '0'.repeat(64) }]);
  result = await plan();
  assert.equal(result.count, 0);
  assert(result.blocked[0].reasons.some(reason => reason.includes('hash')));
  await writeJsonl(join(library, 'index.jsonl'), [row]);

  const packagePath = join(library, decision.package);
  const pack = JSON.parse(await readFile(packagePath, 'utf8'));
  await writeFile(packagePath, JSON.stringify({ ...pack, files: { ...pack.files,
    portrait: { ...pack.files.portrait, sha256: '0'.repeat(64) } } }));
  result = await plan();
  assert.equal(result.count, 0);
  assert(result.blocked[0].reasons.some(reason => reason.includes('hash da versão portrait')));
  await writeFile(packagePath, JSON.stringify(pack));

  await writeJsonl(published, [{ id, platform: 'x', status: 'published' }]);
  result = await plan();
  assert.equal(result.count, 3);
  assert(!result.queue.some(item => item.platform === 'x'));
  process.stdout.write('social pipeline: render 16:9/9:16, direitos, revisão, integridade e deduplicação OK\n');
} finally {
  await rm(root, { recursive: true, force: true });
}
