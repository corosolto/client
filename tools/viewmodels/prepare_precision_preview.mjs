#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await fs.readFile(path.join(repo, 'tools/viewmodels/precision-candidates.json'), 'utf8'));
const assetRoot = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  || '/Users/ruben/csbrasil-private-assets/generated');
const privateDir = path.join(repo, 'public/private-assets');
const link = path.join(privateDir, 'viewmodels');
const linkTarget = path.join(assetRoot, 'viewmodels');
const sha256 = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const mode = process.argv[2] || 'prepare';

if (mode === '--cleanup' || mode === '--assert-clean') {
  const linkStat = await fs.lstat(link).catch(() => null);
  if (linkStat && !linkStat.isSymbolicLink()) throw new Error(`${link} existe e não é symlink`);
  if (linkStat) {
    const current = path.resolve(repo, await fs.readlink(link));
    if (current !== linkTarget) throw new Error(`${link} aponta para ${current}; não será removido`);
    if (mode === '--assert-clean') throw new Error(`preview privado montado em ${link}; execute npm run cleanup:vm-precision antes do build`);
    await fs.unlink(link);
  }
  console.log(`PASS preview privado ${mode === '--cleanup' ? 'desmontado' : 'ausente'}`);
  process.exit(0);
}

if (!path.relative(repo, assetRoot).startsWith('..')) {
  throw new Error('CSBRASIL_VM_ASSET_ROOT precisa ficar fora do repositório público');
}
for (const [weapon, candidate] of Object.entries(manifest.candidates)) {
  const file = path.join(assetRoot, candidate.file);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) throw new Error(`${weapon}: candidato privado ausente em ${file}`);
  const actual = await sha256(file);
  if (stat.size !== candidate.optimizedBytes || actual !== candidate.optimizedSha256) {
    throw new Error(`${weapon}: candidato divergiu do manifesto (${stat.size} bytes; ${actual})`);
  }
  console.log(`PASS ${weapon} ${stat.size} bytes ${actual}`);
}
for (const file of ['viewmodels/recoil.json', 'viewmodels/shared/general-runtime.glb',
  'viewmodels/shared/T_Arm01_B.webp', 'viewmodels/shared/T_Arm01_N.webp',
  'viewmodels/shared/T_Arm01_ORM.webp', 'viewmodels/shared/T_Cloth01_B.webp',
  'viewmodels/shared/T_Cloth01_N.webp', 'viewmodels/shared/T_Cloth01_ORM.webp',
  'viewmodels/shared/T_Glove01_B.webp', 'viewmodels/shared/T_Glove01_N.webp',
  'viewmodels/shared/T_Glove01_ORM.webp']) {
  const stat = await fs.stat(path.join(assetRoot, file)).catch(() => null);
  if (!stat?.isFile()) throw new Error(`dependência privada ausente: ${file}`);
}

const linkStat = await fs.lstat(link).catch(() => null);
await fs.mkdir(privateDir, { recursive: true });
if (!linkStat) await fs.symlink(linkTarget, link, 'dir');
else {
  if (!linkStat.isSymbolicLink()) throw new Error(`${link} existe e não é symlink; não será substituído`);
  const current = path.resolve(repo, await fs.readlink(link));
  if (current !== linkTarget) throw new Error(`${link} aponta para ${current}; não será substituído`);
}
console.log(`PASS staging ignorado ${link} -> ${linkTarget}`);
console.log('TESTE http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=mosin,svd,sks&vmqa=precision');
console.log('ENCERRAR npm run cleanup:vm-precision');
