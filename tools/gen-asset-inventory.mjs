#!/usr/bin/env node
/* Generates and checks the reviewed inventory of runtime models, textures and posters.
 * References use the same trusted source classes as tools/eval/lixo-check.mjs.
 * The checker never deletes an asset; new orphans require explicit review in the manifest. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const ROOT = resolve(arg('root') || DEFAULT_ROOT);
const PUBLIC = join(ROOT, 'public');
const MANIFEST = resolve(arg('manifest') || join(ROOT, 'tools', 'asset-inventory.json'));
const CHECK = process.argv.includes('--check');

export const ROOTS = Object.freeze(['models', 'img/textures', 'textures', 'posters']);
const IGNORED = /\.(?:md|txt|blend\d*)$/i;
const ROOT_PATTERN = /^(?:models|img\/textures|textures|posters)\//;
const HEX256 = /^[0-9a-f]{64}$/;

const slash = (value) => value.split(sep).join('/');
const inScope = (path) => ROOTS.some((root) => path.startsWith(`${root}/`));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function walk(dir, accept, base = dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, accept, base, found);
    else if (entry.isFile()) {
      const rel = slash(relative(base, absolute));
      if (accept(rel, absolute)) found.push(absolute);
    }
  }
  return found;
}

export function diskAssets(publicDir = PUBLIC) {
  const files = [];
  for (const root of ROOTS) {
    walk(join(publicDir, ...root.split('/')), (rel) => !IGNORED.test(rel), join(publicDir, ...root.split('/')), files);
  }
  return files.map((absolute) => slash(relative(publicDir, absolute))).sort();
}

/* Keep this source filter aligned with lixo-check's corpusAssets. Public JSON is
 * intentional: it carries post-rewrite hashed model paths used at runtime. */
export function referenceSources(root = ROOT) {
  const publicDir = join(root, 'public');
  const sources = walk(join(publicDir, 'js'), (rel) => rel.endsWith('.js') && basename(rel) !== 'assetver.js');
  sources.push(...walk(join(root, 'src'), () => true));
  sources.push(...walk(publicDir, (rel) => rel.endsWith('.json')
    && !rel.startsWith('docs/') && !rel.startsWith('js/') && !rel.endsWith('.capture.json')));
  if (existsSync(publicDir)) {
    for (const name of readdirSync(publicDir, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith('.css')) sources.push(join(publicDir, name.name));
    }
  }
  return [...new Set(sources)].sort();
}

function referenceCorpus(root = ROOT) {
  return referenceSources(root).map((path) => readFileSync(path, 'utf8')).join('\n');
}

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dynamicCache = new Map();
function dynamicPatterns(corpus) {
  if (dynamicCache.has(corpus)) return dynamicCache.get(corpus);
  const patterns = [];
  const bindings = Object.fromEntries([...corpus.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*['"`](\/?(?:models|img\/textures|textures|posters)\/[^'"`]+)['"`]/g)]
    .map((match) => [match[1], match[2].replace(/^\//, '')]));
  for (const match of corpus.matchAll(/['"`]([^'"`\r\n]*\$\{[^'"`\r\n]*(?:\.(?:glb|webp|jpe?g|png|json))?)['"`]/g)) {
    const template = match[1].replace(/^\//, '').split(/[?#]/)[0]
      .replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (full, name) => bindings[name] ?? full);
    if (!ROOT_PATTERN.test(template)) continue;
    const expression = `^${escaped(template).replace(/\\\$\\\{[^}]+\\\}/g, '(.+)')}$`;
    patterns.push(new RegExp(expression));
  }
  dynamicCache.set(corpus, patterns);
  return patterns;
}

export function isReferenced(path, corpus) {
  if (new RegExp(`(?<![\\w.-])${escaped(path)}(?![\\w.-])`).test(corpus)) return true;
  for (const pattern of dynamicPatterns(corpus)) {
    const match = pattern.exec(path);
    if (match && match.slice(1).every((value) => new RegExp(`['"\`]${escaped(value)}['"\`]`).test(corpus))) return true;
  }
  return false;
}

export function literalReferences(sources) {
  const refs = new Set();
  for (const text of sources) {
    for (const match of text.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
      const value = match[1] ?? match[2] ?? match[3];
      if (value.includes('${') || /[\r\n]/.test(value)) continue;
      let path = value.trim().replace(/^\.\//, '').replace(/^\//, '');
      if (!ROOT_PATTERN.test(path)) continue;
      path = path.split(/[?#]/)[0];
      try { path = decodeURIComponent(path); } catch { continue; }
      if (!extname(path) || path.includes('\\') || path.split('/').some((part) => part === '..')) continue;
      if (inScope(path)) refs.add(path);
    }
  }
  return refs;
}

export function emptyInventory() {
  return { schema: 'asset-inventory-v1', roots: [...ROOTS], files: {}, unreferenced: [] };
}

export function validateInventory(data) {
  if (!data || data.schema !== 'asset-inventory-v1' || !Array.isArray(data.roots)
    || JSON.stringify(data.roots) !== JSON.stringify(ROOTS)
    || !data.files || Array.isArray(data.files) || typeof data.files !== 'object'
    || !Array.isArray(data.unreferenced)) {
    throw new Error('expected schema asset-inventory-v1, canonical roots, files object and unreferenced array');
  }
  const unreferenced = new Set();
  for (const [path, hash] of Object.entries(data.files)) {
    if (!inScope(path) || !HEX256.test(hash)) throw new Error(`invalid file entry: ${path}`);
    if (path.startsWith('.') || path.split('/').some((part) => part === '..')) throw new Error(`unsafe file entry: ${path}`);
  }
  for (const path of data.unreferenced) {
    if (typeof path !== 'string' || !Object.hasOwn(data.files, path)) throw new Error(`invalid unreferenced entry: ${path}`);
    if (unreferenced.has(path)) throw new Error(`duplicate unreferenced entry: ${path}`);
    unreferenced.add(path);
  }
  return data;
}

export function readInventory(path = MANIFEST) {
  if (!existsSync(path)) return { data: null, raw: '' };
  const raw = readFileSync(path, 'utf8');
  return { data: validateInventory(JSON.parse(raw)), raw };
}

export function serializeInventory(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function measureInventory({ root = ROOT, previous = null } = {}) {
  const publicDir = join(root, 'public');
  const sourcePaths = referenceSources(root);
  const sources = sourcePaths.map((path) => readFileSync(path, 'utf8'));
  const corpus = sources.join('\n');
  const literal = literalReferences(sources);
  const disk = diskAssets(publicDir);
  const onDisk = new Set(disk);
  const files = Object.fromEntries(disk.map((path) => [path, sha256(join(publicDir, ...path.split('/')))]));
  const unreferenced = disk.filter((path) => !isReferenced(path, corpus));
  const next = { schema: 'asset-inventory-v1', roots: [...ROOTS], files, unreferenced };
  const findings = [];
  const add = (code, path) => findings.push({ code, path });

  for (const path of literal) {
    if (!onDisk.has(path)) add('referenced-file-lost', path);
  }
  if (previous) {
    for (const path of Object.keys(previous.files)) {
      if (!onDisk.has(path) && isReferenced(path, corpus)) add('referenced-file-lost', path);
    }
    for (const [path, hash] of Object.entries(files)) {
      if (!Object.hasOwn(previous.files, path)) add(isReferenced(path, corpus) ? 'inventory-new' : 'orphan-new', path);
      else if (previous.files[path] !== hash) add('hash-changed', path);
    }
  }
  const unique = [...new Map(findings.map((finding) => [`${finding.code}:${finding.path}`, finding])).values()]
    .sort((a, b) => a.code.localeCompare(b.code) || a.path.localeCompare(b.path));
  return { next, findings: unique, referenced: disk.length - unreferenced.length, sources: sourcePaths.length };
}

function printFindings(findings) {
  for (const finding of findings) console.error(`  ${finding.code}: ${finding.path}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  let published;
  try {
    published = readInventory();
  } catch (error) {
    console.error(`ASSET-INVENTORY: invalid ${relative(ROOT, MANIFEST)}: ${error.message}`);
    process.exit(1);
  }
  const result = measureInventory({ previous: published.data });
  const nextRaw = serializeInventory(result.next);
  const stale = published.raw !== nextRaw;
  console.log(`ASSET-INVENTORY  ${Object.keys(result.next.files).length} files · ${result.referenced} referenced · ${result.next.unreferenced.length} reviewed orphans · ${result.sources} trusted sources`);

  if (CHECK) {
    if (!published.data) console.error(`ASSET-INVENTORY: missing ${relative(ROOT, MANIFEST)}; run node tools/gen-asset-inventory.mjs`);
    printFindings(result.findings);
    if (stale && published.data) console.error('ASSET-INVENTORY: inventory-stale; run node tools/gen-asset-inventory.mjs and review the diff');
    if (!published.data || stale || result.findings.length) process.exit(1);
    console.log('ASSET-INVENTORY: manifest and runtime references are intact');
    process.exit(0);
  }

  const lost = result.findings.filter((finding) => finding.code === 'referenced-file-lost');
  const reviewedUnreferenced = new Set(published.data?.unreferenced || []);
  const newUnreviewed = published.data
    ? result.next.unreferenced.filter((path) => !reviewedUnreferenced.has(path))
    : [];
  if (lost.length || newUnreviewed.length) {
    printFindings([...lost, ...newUnreviewed.map((path) => ({ code: 'orphan-new', path }))]);
    if (lost.length) console.error('ASSET-INVENTORY: refusing to erase a still-referenced file from the manifest; restore the file or remove its runtime reference first');
    if (newUnreviewed.length) console.error('ASSET-INVENTORY: refusing to approve unreviewed orphans; add their reviewed file hashes and unreferenced paths to the manifest first');
    process.exit(1);
  }
  mkdirSync(dirname(MANIFEST), { recursive: true });
  if (!stale) console.log('ASSET-INVENTORY: already up to date');
  else {
    writeFileSync(MANIFEST, nextRaw);
    console.log(`ASSET-INVENTORY: wrote ${relative(ROOT, MANIFEST)}; review new hashes and unreferenced entries before committing`);
  }
}
