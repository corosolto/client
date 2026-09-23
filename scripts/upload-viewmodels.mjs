#!/usr/bin/env node
/* Publica a árvore privada do viewmodel no Vercel Blob privado e regenera o manifesto
   versionado (tools/viewmodels/vm-assets.manifest.json). Operação: docs/reports/VM-ENTREGA-PRODUCAO.md.

   Uso:
     node scripts/upload-viewmodels.mjs                 # ensaio: mostra o que subiria, não escreve nada
     node scripts/upload-viewmodels.mjs --manifesto     # só regrava o manifesto (sem rede)
     node scripts/upload-viewmodels.mjs --check         # sai 1 se o manifesto diverge da árvore
     node scripts/upload-viewmodels.mjs --publicar      # sobe o que falta e regrava o manifesto
   Opções: --fonte=<dir> (ou VM_SOURCE_DIR), --permitir-remocao.
   Blobs são endereçados por conteúdo (viewmodels/sha256/<sha>.<ext>): subir de novo é
   idempotente e o blob antigo continua lá, então rollback é reverter o manifesto no Git. */
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  BLOB_PREFIX, DEFAULT_SOURCE, MANIFEST_PATH, ROOT, SERVED_ROOT,
  blobPathOf, describeTree, readManifest,
} from './vm-assets.mjs';

const has = (flag) => process.argv.includes(flag);
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const MODE = has('--publicar') ? 'publicar' : has('--manifesto') ? 'manifesto' : has('--check') ? 'check' : 'ensaio';
const SOURCE = path.resolve(arg('fonte') || process.env.VM_SOURCE_DIR || DEFAULT_SOURCE);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

if (!existsSync(SOURCE)) {
  console.error(`FALHA: árvore de origem não encontrada: ${SOURCE}\n  passe --fonte=<dir> ou VM_SOURCE_DIR. O manifesto NÃO foi tocado.`);
  process.exit(1);
}

const files = await describeTree(SOURCE);
if (!files.length) {
  console.error(`FALHA: nenhum asset de runtime em ${SOURCE}. O manifesto NÃO foi tocado (não se publica manifesto vazio).`);
  process.exit(1);
}

let current = null;
try { current = readManifest(); } catch (error) {
  if (MODE === 'check') { console.error(`REPROVADO — ${error.message}`); process.exit(1); }
  console.log(`aviso: ${error.message} (será criado)`);
}
const before = new Map((current?.files || []).map((f) => [f.path, f]));
const removed = [...before.keys()].filter((p) => !files.some((f) => f.path === p));
const changed = files.filter((f) => before.get(f.path)?.sha256 !== f.sha256);
const totalBytes = files.reduce((s, f) => s + f.bytes, 0);

const manifest = {
  schema: 1,
  servedRoot: SERVED_ROOT,
  blobPrefix: BLOB_PREFIX,
  blobBase: current?.blobBase ?? null,
  count: files.length,
  totalBytes,
  files,
};

console.log(`fonte: ${SOURCE}`);
console.log(`${files.length} assets de runtime, ${mb(totalBytes)}; ${changed.length} novos/alterados, ${removed.length} removidos em relação ao manifesto versionado`);
for (const f of changed) console.log(`  ${before.has(f.path) ? '~' : '+'} ${f.path.padEnd(42)} ${mb(f.bytes).padStart(8)}  -> ${blobPathOf(f)}`);
for (const p of removed) console.log(`  - ${p}`);

if (MODE === 'check') {
  const ok = !changed.length && !removed.length;
  console.log(ok ? 'APROVADO — manifesto bate com a árvore' : 'REPROVADO — manifesto diverge da árvore; rode --publicar (ou --manifesto) e commite');
  process.exit(ok ? 0 : 1);
}
if (removed.length && !has('--permitir-remocao') && MODE !== 'ensaio') {
  console.error(`FALHA: ${removed.length} asset(s) sairiam do manifesto. Se é intencional, repita com --permitir-remocao.`);
  process.exit(1);
}

const writeManifest = () => {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifesto escrito: ${path.relative(ROOT, MANIFEST_PATH)} (${files.length} entradas)`);
};

if (MODE === 'ensaio') {
  const unique = new Map(files.map((f) => [f.sha256, f]));
  console.log(`ENSAIO: subiria até ${unique.size} blobs (${mb([...unique.values()].reduce((s, f) => s + f.bytes, 0))}) em ${BLOB_PREFIX}/, pulando os que já existem. Nada foi escrito nem enviado.`);
  process.exit(0);
}
if (MODE === 'manifesto') { writeManifest(); process.exit(0); }

// --publicar
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) { console.error('FALHA: BLOB_READ_WRITE_TOKEN ausente no ambiente (nunca passe por argumento).'); process.exit(1); }
let blob;
try { blob = await import('@vercel/blob'); } catch {
  console.error('FALHA: pacote @vercel/blob não instalado. `npm i --no-save @vercel/blob` e repita.');
  process.exit(1);
}
const { createReadStream } = await import('node:fs');
const done = new Set();
let uploaded = 0;
for (const f of files) {
  const pathname = blobPathOf(f);
  if (done.has(pathname)) continue;
  done.add(pathname);
  try {
    const meta = await blob.head(pathname, { token });
    if (Number(meta.size) === f.bytes) {
      manifest.blobBase ??= new URL(meta.url).origin;
      continue;
    }
  } catch { /* ausente: sobe */ }
  const res = await blob.put(pathname, createReadStream(path.join(SOURCE, f.path)), {
    access: 'private', token, contentType: f.contentType, addRandomSuffix: false, allowOverwrite: true,
  });
  manifest.blobBase = new URL(res.url).origin;
  uploaded += 1;
  console.log(`  subiu ${f.path} -> ${pathname}`);
}
if (!manifest.blobBase?.endsWith('.private.blob.vercel-storage.com')) {
  console.error(`FALHA: base do Blob inesperada (${manifest.blobBase}); o store precisa ser PRIVADO. Manifesto não escrito.`);
  process.exit(1);
}
console.log(`${uploaded} blob(s) enviados, ${done.size - uploaded} já existiam.`);
writeManifest();
