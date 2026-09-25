/* Contrato compartilhado da entrega privada do viewmodel (docs/reports/VM-ENTREGA-PRODUCAO.md).
   Quem publica (upload-viewmodels), quem baixa (fetch-viewmodels) e quem mede
   (eval:vm-serving-prod) leem ESTE arquivo: filtro, hash e versão não são copiados. */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = path.join(ROOT, 'tools/viewmodels/vm-assets.manifest.json');
export const SERVED_ROOT = '/private-assets/viewmodels';
export const DEST_DIR = path.join(ROOT, 'public/private-assets/viewmodels');
export const BLOB_PREFIX = 'viewmodels/sha256';
export const DEFAULT_SOURCE = path.join(process.env.HOME || '',
  'csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root/viewmodels');

const CONTENT_TYPES = Object.freeze({
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp',
  '.json': 'application/json',
});

// Só o que o runtime carrega. Relatórios de otimização e os clipes crus de
// shared/raw-general/ são intermediários do assado: não sobem nem são servidos.
export function isRuntimeAsset(rel) {
  if (rel.startsWith('shared/raw-general/')) return false;
  if (rel === 'recoil.json') return true;
  return rel.endsWith('.glb') || rel.endsWith('.webp');
}

export const contentTypeFor = (rel) => CONTENT_TYPES[path.extname(rel)] || 'application/octet-stream';
// Mesma regra do tools/viewmodels/gen-vmbytes.mjs: 10 primeiros hex do sha256.
export const versionOf = (sha256) => sha256.slice(0, 10);
export const blobPathOf = (entry) => `${BLOB_PREFIX}/${entry.sha256}${path.extname(entry.path)}`;

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file).on('error', reject).on('data', (c) => hash.update(c)).on('end', () => resolve(hash.digest('hex')));
  });
}

export function listTree(dir) {
  const out = [];
  const walk = (abs, rel) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const a = path.join(abs, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      const st = statSync(a);
      if (st.isDirectory()) walk(a, r);
      else if (st.isFile()) out.push(r);
    }
  };
  walk(dir, '');
  return out.sort();
}

export async function describeTree(dir) {
  const files = [];
  for (const rel of listTree(dir).filter(isRuntimeAsset)) {
    const abs = path.join(dir, rel);
    const sha256 = await sha256File(abs);
    files.push({ path: rel, bytes: statSync(abs).size, sha256, v: versionOf(sha256), contentType: contentTypeFor(rel) });
  }
  return files;
}

/* Manifesto vazio ou malformado é erro SEMPRE, com ou sem token: é o defeito do
   `npm run audio` que esvazia o manifesto de áudio numa máquina sem o pack. */
export function readManifest(file = MANIFEST_PATH) {
  if (!existsSync(file)) throw new Error(`manifesto ausente: ${path.relative(ROOT, file)}`);
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(m.files) || m.files.length === 0) {
    throw new Error(`manifesto sem arquivos: ${path.relative(ROOT, file)} — regenere com \`node scripts/upload-viewmodels.mjs --manifesto\` na máquina que tem a árvore`);
  }
  for (const f of m.files) {
    if (typeof f.path !== 'string' || f.path.includes('..') || f.path.startsWith('/')) throw new Error(`caminho inválido no manifesto: ${f.path}`);
    if (!/^[0-9a-f]{64}$/.test(f.sha256 || '') || !Number.isInteger(f.bytes) || f.bytes <= 0) throw new Error(`entrada inválida no manifesto: ${f.path}`);
    if (f.v !== versionOf(f.sha256)) throw new Error(`v != sha256[:10] em ${f.path}`);
  }
  return m;
}

/* Imutável só onde a URL do runtime carrega a versão pelos bytes (VM_BYTES =
   sha256[:10]): GLBs de família/arma. shared/ e recoil.json usam versão fixa
   (CATALOG_VERSION) e por isso revalidam — imutável ali é o BUG-157 de volta. */
export const IMMUTABLE_RE = /^(?!shared\/)[^/]+\/[^/]+-runtime\.glb$/;
export const cachePolicyFor = (rel) => (IMMUTABLE_RE.test(rel) ? 'immutable' : 'revalidate');
