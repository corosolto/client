import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { JAVAPORCO_GRAVACOES } from '../../public/js/data/javaporcos_audio.js';

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
for (const sample of Object.values(JAVAPORCO_GRAVACOES)) {
  const target = fileURLToPath(new URL(`../../public/${sample.file}`, import.meta.url));
  if (existsSync(target) && hash(target) === sample.sha256) continue;
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.download-${process.pid}`;
  try {
    execFileSync('curl', ['--retry', '2', '--max-time', '45', '-fsSL', sample.download, '-o', temporary], { stdio: ['ignore', 'ignore', 'inherit'] });
    if (hash(temporary) !== sample.sha256) throw new Error(`JAV-AUDIO: hash divergente em ${sample.file}`);
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}
console.log('JAV-AUDIO: gravações CC0 instaladas e hashes conferidos.');
