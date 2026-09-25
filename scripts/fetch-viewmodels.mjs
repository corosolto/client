#!/usr/bin/env node
/* Baixa o viewmodel autorado (arte KINEMATION, privada) do Vercel Blob privado para
   public/private-assets/viewmodels/ no build, conferindo bytes e SHA-256 contra o
   manifesto versionado. Chamado por scripts/fetch-viewmodels.sh.

   Ambiente:
     BLOB_READ_WRITE_TOKEN (ou VM_BLOB_TOKEN)  credencial; só vai para *.private.blob.vercel-storage.com
     VM_BLOB_BASE_URL   sobrepõe o `blobBase` do manifesto
     VM_REQUIRED=1      qualquer asset faltando ou divergente reprova o build (produção)
     VM_SOURCE_DIR      copia de uma árvore local em vez do Blob (build local do dono)
     VM_DEST            destino alternativo (réguas)
   Sem credencial e sem VM_REQUIRED: avisa e sai 0 — o jogo cai no viewmodel legado. */
import { createHash, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { DEST_DIR, ROOT, blobPathOf, readManifest, sha256File } from './vm-assets.mjs';

const REQUIRED = process.env.VM_REQUIRED === '1';
const DEST = path.resolve(process.env.VM_DEST || DEST_DIR);
const SOURCE_DIR = process.env.VM_SOURCE_DIR ? path.resolve(process.env.VM_SOURCE_DIR) : '';
const TOKEN = process.env.VM_BLOB_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
const CONCURRENCY = 6;
const rel = (p) => (p.startsWith(`${ROOT}${path.sep}`) ? path.relative(ROOT, p) : p);
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

let manifest;
try { manifest = readManifest(); } catch (error) {
  console.error(`FALHA viewmodel: ${error.message}`);
  process.exit(1);
}
const BASE = (process.env.VM_BLOB_BASE_URL || manifest.blobBase || '').replace(/\/+$/, '');
const CONSEQUENCIA = 'o jogo publicado cai no viewmodel LEGADO nessas armas';

async function isGood(entry) {
  const file = path.join(DEST, entry.path);
  if (!existsSync(file) || statSync(file).size !== entry.bytes) return false;
  return (await sha256File(file)) === entry.sha256;
}

async function pending() {
  const out = [];
  for (const entry of manifest.files) if (!(await isGood(entry))) out.push(entry);
  return out;
}

function finish(missing, why) {
  const total = manifest.files.length;
  if (!missing.length) {
    console.log(`viewmodel: ${total}/${total} assets conferidos por SHA-256 em ${rel(DEST)} (${mb(manifest.totalBytes)}).`);
    process.exit(0);
  }
  const exemplos = missing.slice(0, 4).map((e) => e.path).join(', ');
  const msg = `${missing.length} de ${total} assets do viewmodel ausentes ou divergentes (ex.: ${exemplos}) — ${why}. Sem eles ${CONSEQUENCIA}.`;
  if (REQUIRED) {
    console.error(`FALHA viewmodel (VM_REQUIRED=1): ${msg}`);
    process.exit(1);
  }
  console.warn(`AVISO viewmodel: ${msg} Defina VM_REQUIRED=1 para reprovar o build em vez de degradar.`);
  process.exit(0);
}

const baseOk = (b) => /^https:\/\/[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i.test(b)
  || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(b);

async function download(entry, tmp) {
  const url = `${BASE}/${blobPathOf(entry)}`;
  let last = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(120000) });
      if (!res.ok) {
        last = `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403 || res.status === 404) break;
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        const sha = createHash('sha256').update(buf).digest('hex');
        if (buf.length === entry.bytes && sha === entry.sha256) { writeFileSync(tmp, buf); return ''; }
        last = `conteúdo divergente (${buf.length} bytes, sha ${sha.slice(0, 10)} != ${entry.v})`;
      }
    } catch (error) {
      last = error.name === 'TimeoutError' ? 'timeout' : error.code || error.name;
    }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  return last;
}

async function install(entry) {
  const target = path.join(DEST, entry.path);
  mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${randomBytes(4).toString('hex')}`;
  try {
    if (SOURCE_DIR) {
      copyFileSync(path.join(SOURCE_DIR, entry.path), tmp);
      if ((await sha256File(tmp)) !== entry.sha256) return 'cópia local diverge do manifesto';
    } else {
      const err = await download(entry, tmp);
      if (err) return err;
    }
    renameSync(tmp, target);
    return '';
  } catch (error) {
    return error.code || error.message;
  } finally {
    rmSync(tmp, { force: true });
  }
}

let missing = await pending();
if (!missing.length) finish([], '');

if (existsSync(DEST) && lstatSync(DEST).isSymbolicLink()) {
  finish(missing, `${rel(DEST)} é symlink para a árvore local do dono; o fetch não escreve através dele — atualize a árvore ou regenere o manifesto (\`node scripts/upload-viewmodels.mjs --check\`)`);
}
if (!SOURCE_DIR) {
  if (!TOKEN) finish(missing, 'BLOB_READ_WRITE_TOKEN ausente (fork/local sem credencial)');
  if (!BASE) finish(missing, 'manifesto sem `blobBase` e VM_BLOB_BASE_URL vazio — rode `node scripts/upload-viewmodels.mjs --publicar`');
  if (!baseOk(BASE)) finish(missing, `base do Blob recusada (${BASE}): a credencial só vai para *.private.blob.vercel-storage.com`);
}

console.log(`viewmodel: instalando ${missing.length} asset(s) (${mb(missing.reduce((s, e) => s + e.bytes, 0))}) de ${SOURCE_DIR ? rel(SOURCE_DIR) : 'Blob privado'}`);
const erros = new Map();
const queue = [...missing];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let entry = queue.shift(); entry; entry = queue.shift()) {
    const err = await install(entry);
    if (err) erros.set(entry.path, err);
  }
}));
for (const [p, e] of [...erros].slice(0, 8)) console.error(`  ${p}: ${e}`);
missing = await pending();
finish(missing, erros.size ? `download falhou (${[...new Set(erros.values())].slice(0, 3).join('; ')})` : 'conferência pós-instalação reprovou');
