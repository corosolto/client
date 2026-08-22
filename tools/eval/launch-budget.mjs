#!/usr/bin/env node
/*
 * Mede o diretório que será publicado, sem modificá-lo. A base dos limites é
 * plans/06-LANCAMENTO.md §2.3; o download inicial precisa de uma captura de rede.
 */
import { lstatSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const MiB = 1024 ** 2;
const ROOT = process.cwd();
const arg = (name) => process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
const dirArg = arg('--dir');
const target = path.resolve(ROOT, dirArg || 'dist/client');
const json = process.argv.includes('--json');
const mutant = arg('--mutante');

function positiveEnv(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} precisa ser um número positivo.`);
  return value;
}

const limits = {
  totalBytes: positiveEnv('CRAZYGAMES_MAX_TOTAL_MIB', 250) * MiB,
  files: positiveEnv('CRAZYGAMES_MAX_FILES', 1500),
};

if (!existsSync(target)) {
  throw new Error(`não achei ${path.relative(ROOT, target) || '.'}; rode npm run build antes do preflight.`);
}
if (mutant && !['size', 'files'].includes(mutant)) {
  throw new Error(`mutante desconhecido: ${mutant}`);
}

const files = [];
const problems = [];
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(target, absolute).split(path.sep).join('/');
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      problems.push(`symlink não empacotável: ${relative}`);
    } else if (stat.isDirectory()) {
      scan(absolute);
    } else if (stat.isFile()) {
      files.push({ path: relative, bytes: stat.size });
    } else {
      problems.push(`entrada não regular: ${relative}`);
    }
  }
}
scan(target);

function category(file) {
  const extension = path.extname(file.path).toLowerCase();
  if (['.glb', '.gltf', '.bin', '.fbx', '.obj'].includes(extension)) return 'modelos 3D';
  if (['.mp3', '.ogg', '.wav', '.m4a', '.aac'].includes(extension)) return 'áudio';
  if (['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.ico'].includes(extension)) return 'imagens';
  if (['.js', '.mjs', '.css', '.html', '.map', '.wasm'].includes(extension)) return 'código e dados web';
  if (['.webm', '.mp4'].includes(extension)) return 'vídeo';
  return 'outros';
}

const grouped = new Map();
for (const file of files) {
  const group = grouped.get(category(file)) || { bytes: 0, files: 0 };
  group.bytes += file.bytes;
  group.files++;
  grouped.set(category(file), group);
}

let totalBytes = files.reduce((total, file) => total + file.bytes, 0);
let fileCount = files.length;
if (mutant === 'size') totalBytes = limits.totalBytes + 1;
if (mutant === 'files') fileCount = limits.files + 1;

const status = {
  total: totalBytes <= limits.totalBytes,
  files: fileCount <= limits.files,
  package: problems.length === 0,
};
const top = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 15);
const byteText = (bytes) => `${(bytes / MiB).toFixed(1)} MiB`;
const configuredExclusions = [
  'models/fpvm', 'dev.html', 'editor/', 'js/editor/', 'img/reticle-pu.png',
];
const presentExclusions = configuredExclusions.filter((entry) => files.some((file) => file.path === entry || file.path.startsWith(entry)));
const report = {
  target: path.relative(ROOT, target) || '.',
  limits: { totalMiB: limits.totalBytes / MiB, files: limits.files },
  measured: { totalBytes, totalMiB: Number((totalBytes / MiB).toFixed(2)), files: fileCount },
  status,
  categories: Object.fromEntries([...grouped].sort(([a], [b]) => a.localeCompare(b))),
  largestFiles: top,
  packageProblems: problems,
  configuredPruneTargetsStillPresent: presentExclusions,
  startupDownload: 'não inferido do disco; validar com captura de rede/HAR antes de enviar',
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`PRE-FLIGHT WEB · ${report.target}`);
  console.log(`${status.total ? '✓' : '✗'} CG1 tamanho total: ${byteText(totalBytes)} / ${byteText(limits.totalBytes)}`);
  console.log(`${status.files ? '✓' : '✗'} CG2 arquivos: ${fileCount} / ${limits.files}`);
  console.log(`${status.package ? '✓' : '✗'} CG3 conteúdo empacotável: ${problems.length ? problems.join('; ') : 'somente arquivos regulares'}`);
  console.log('  inicial: não inferido do disco — exige HAR/Network antes do envio ao CrazyGames.');
  console.log('  por tipo:');
  for (const [name, data] of [...grouped].sort(([, a], [, b]) => b.bytes - a.bytes)) {
    console.log(`    ${name}: ${byteText(data.bytes)} · ${data.files} arquivo(s)`);
  }
  console.log('  15 maiores:');
  for (const file of top) console.log(`    ${byteText(file.bytes).padStart(10)}  ${file.path}`);
  console.log(presentExclusions.length
    ? `  ATENÇÃO: alvos já provados em scripts/prune-dist.mjs ainda publicados: ${presentExclusions.join(', ')}`
    : '  poda conhecida: os alvos literais de scripts/prune-dist.mjs não estão no publicado.');
}

if (!Object.values(status).every(Boolean)) process.exitCode = 1;
