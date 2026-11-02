import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { MENU_MUSIC_ACTIVE_IDS } from '../../public/js/menu-music-selection.js';
import { JAVAPORCO_GRAVACOES } from '../../public/js/data/javaporcos_audio.js';

const root = mkdtempSync(join(tmpdir(), 'jav-audio-private-'));
const audio = join(root, 'audio');
const put = (rel, bytes) => {
  const target = join(root, rel);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, bytes);
};
try {
  const manifest = { _privateBuild: { format: 'content-addressed-v1' }, menuMusic: [] };
  for (const id of MENU_MUSIC_ACTIVE_IDS) {
    const bytes = Buffer.from(`fixture-${id}`);
    const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 16);
    put(`audio/menu-music/${id}.mp3`, bytes);
    put(`audio/a/${hash}.mp3`, bytes);
    manifest.menuMusic.push(`audio/a/${hash}.mp3`);
  }
  for (const sample of Object.values(JAVAPORCO_GRAVACOES)) put(sample.file, 'fixture');
  put('audio/manifest.json', JSON.stringify(manifest));
  const check = () => spawnSync(process.execPath, ['tools/gen-audio-manifest.mjs', '--check', `--raiz=${audio}`], { encoding: 'utf8' });
  let result = check();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  console.log('JAP1: manifesto privado aceita as gravações referenciadas pelo runtime.');
  put('audio/a/orfao.mp3', 'fixture');
  result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /órfão.*audio\/a\/orfao\.mp3/);
  rmSync(join(audio, 'a/orfao.mp3'));
  console.log('JAP2: mutante órfão continua reprovado.');
  const missing = Object.values(JAVAPORCO_GRAVACOES)[0].file;
  rmSync(join(root, missing));
  result = check();
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(missing) && result.stderr.includes('ausente'));
  console.log('JAP3: mutante gravação ausente continua reprovado.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
