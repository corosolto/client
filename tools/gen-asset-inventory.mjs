#!/usr/bin/env node
/* Generates and checks the reviewed inventory of runtime models, textures and posters.
 * References use the same trusted source classes as tools/eval/lixo-check.mjs.
 * The checker never deletes an asset; new orphans require explicit review in the manifest. */
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
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

function identifiers(pattern, found = []) {
  if (!pattern || typeof pattern !== 'object') return found;
  if (pattern.type === 'Identifier') { found.push(pattern.name); return found; }
  if (pattern.type === 'RestElement') return identifiers(pattern.argument, found);
  if (pattern.type === 'AssignmentPattern') return identifiers(pattern.left, found);
  if (pattern.type === 'ArrayPattern') pattern.elements.forEach((element) => identifiers(element, found));
  if (pattern.type === 'ObjectPattern') pattern.properties.forEach((property) => identifiers(property.type === 'RestElement' ? property : property.value, found));
  return found;
}

function assignmentIdentifiers(pattern, found = []) {
  if (pattern?.type === 'MemberExpression') return found;
  return identifiers(pattern, found);
}

function templateText(node) {
  if (node?.type !== 'TemplateLiteral') return null;
  let text = '';
  for (let index = 0; index < node.quasis.length; index += 1) {
    text += node.quasis[index].value.raw;
    const expression = node.expressions[index];
    if (!expression) continue;
    if (expression.type !== 'Identifier') return null;
    text += `\${${expression.name}}`;
  }
  return text;
}

function inlineTemplateText(node) {
  if (node?.type !== 'TemplateLiteral') return null;
  let text = '';
  for (let index = 0; index < node.quasis.length; index += 1) {
    text += node.quasis[index].value.raw;
    const expression = node.expressions[index];
    if (!expression) continue;
    text += `\${${expression.type === 'Identifier' ? expression.name : 'expression'}}`;
  }
  return text;
}

function analyzeModule(text) {
  let program;
  try { program = parse(text, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch { return null; }
  const analysis = { imports: [], reexports: [], templates: [], inlineTemplates: [], helperBodies: new Set(), helperFunctions: new Set(), directExports: new Set(), literals: {}, shadowed: new Set(), calls: [] };
  const topLevelDeclarations = new Set();
  const readDeclaration = (declaration, directlyExported = false) => {
    if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') return;
    topLevelDeclarations.add(declaration);
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier') continue;
      if (declarator.init?.type === 'Literal' && typeof declarator.init.value === 'string') {
        analysis.literals[declarator.id.name] = declarator.init.value;
      }
      if (declarator.init?.type !== 'ArrowFunctionExpression' || !declarator.init.params.every((param) => param.type === 'Identifier')) continue;
      const template = templateText(declarator.init.body);
      if (template?.includes('${')) {
        analysis.templates.push({ name: declarator.id.name, params: declarator.init.params.map((param) => param.name), template });
        analysis.helperBodies.add(declarator.init.body);
        analysis.helperFunctions.add(declarator.init);
        if (directlyExported) analysis.directExports.add(declarator.id.name);
      }
    }
  };
  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers) {
        if (specifier.type === 'ImportSpecifier') analysis.imports.push({ imported: specifier.imported.name, local: specifier.local.name, specifier: statement.source.value });
      }
    }
    if (statement.type === 'VariableDeclaration') readDeclaration(statement);
    if (statement.type !== 'ExportNamedDeclaration') continue;
    readDeclaration(statement.declaration, true);
    for (const specifier of statement.specifiers || []) {
      analysis.reexports.push({ local: specifier.local.name, exported: specifier.exported.name, specifier: statement.source?.value || '' });
    }
  }
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type) && !analysis.helperFunctions.has(node)) {
      for (const param of node.params) identifiers(param).forEach((name) => analysis.shadowed.add(name));
    }
    if (['FunctionDeclaration', 'FunctionExpression', 'ClassDeclaration', 'ClassExpression'].includes(node.type) && node.id) analysis.shadowed.add(node.id.name);
    if (node.type === 'VariableDeclaration') {
      for (const declarator of node.declarations) {
        if (node.kind !== 'const' || !topLevelDeclarations.has(node)) identifiers(declarator.id).forEach((name) => analysis.shadowed.add(name));
      }
    }
    if (node.type === 'CatchClause' && node.param) identifiers(node.param).forEach((name) => analysis.shadowed.add(name));
    if (node.type === 'AssignmentExpression') assignmentIdentifiers(node.left).forEach((name) => analysis.shadowed.add(name));
    if (node.type === 'UpdateExpression') assignmentIdentifiers(node.argument).forEach((name) => analysis.shadowed.add(name));
    if (node.type === 'TemplateLiteral' && !analysis.helperBodies.has(node)) {
      const template = inlineTemplateText(node);
      if (template?.includes('${')) analysis.inlineTemplates.push(template);
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') analysis.calls.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type') continue;
      if (Array.isArray(value)) value.forEach((child) => visit(child));
      else if (value && typeof value.type === 'string') visit(value);
    }
  };
  visit(program);
  for (const name of analysis.shadowed) delete analysis.literals[name];
  return analysis;
}

function resolveExportedTemplate(modulePath, exportedName, analyses, seen) {
  const key = `${modulePath}#${exportedName}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const analysis = analyses.get(modulePath);
  if (!analysis) return null;
  const reexport = analysis.reexports.find((candidate) => candidate.exported === exportedName);
  if (reexport) {
    if (reexport.specifier.startsWith('.')) {
      return resolveExportedTemplate(resolve(dirname(modulePath), reexport.specifier), reexport.local, analyses, seen);
    }
    const aliased = analysis.templates.find((candidate) => candidate.name === reexport.local);
    if (aliased) return { definition: aliased, modulePath };
    return resolveTemplateBinding(modulePath, reexport.local, analyses, seen);
  }
  if (!analysis.directExports.has(exportedName)) return null;
  const definition = analysis.templates.find((candidate) => candidate.name === exportedName);
  return definition ? { definition, modulePath } : null;
}

function resolveTemplateBinding(callerPath, localName, analyses, seen = new Set()) {
  const analysis = analyses.get(callerPath);
  if (!analysis) return null;
  for (const binding of analysis.imports) {
    if (binding.local !== localName || !binding.specifier.startsWith('.')) continue;
    const modulePath = resolve(dirname(callerPath), binding.specifier);
    const resolved = resolveExportedTemplate(modulePath, binding.imported, analyses, seen);
    if (resolved) return resolved;
  }
  return null;
}

function callReference(definition, modulePath, call, callerAnalysis, analyses) {
  if (call.arguments.length !== definition.params.length) return null;
  const values = call.arguments.map((argument) => {
    if (argument.type === 'Literal' && typeof argument.value === 'string') return argument.value;
    if (argument.type === 'Identifier' && !callerAnalysis.shadowed.has(argument.name)) return callerAnalysis.literals[argument.name];
    return undefined;
  });
  if (values.some((value) => typeof value !== 'string')) return null;
  let path = definition.template;
  definition.params.forEach((param, index) => {
    path = path.replace(new RegExp(`\\$\\{${escaped(param)}\\}`, 'g'), values[index]);
  });
  const constants = analyses.get(modulePath)?.literals || {};
  path = path.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (full, name) => constants[name] ?? full);
  path = path.replace(/^\//, '').split(/[?#]/)[0];
  return !path.includes('${') && ROOT_PATTERN.test(path) && !path.includes('..') ? path : null;
}

export function dynamicCallReferences(textByPath) {
  const analyses = new Map([...textByPath].map(([path, text]) => [path, analyzeModule(text)]));
  const references = new Set();
  const collect = (callerPath, analysis, definition, modulePath, localName) => {
    if (analysis.shadowed.has(localName)) return;
    for (const call of analysis.calls) {
      if (call.callee.name !== localName) continue;
      const path = callReference(definition, modulePath, call, analysis, analyses);
      if (path) references.add(path);
    }
  };
  for (const [callerPath, analysis] of analyses) {
    if (!analysis) continue;
    for (const definition of analysis.templates) collect(callerPath, analysis, definition, callerPath, definition.name);
    for (const binding of analysis.imports) {
      const resolved = resolveTemplateBinding(callerPath, binding.local, analyses);
      if (resolved) collect(callerPath, analysis, resolved.definition, resolved.modulePath, binding.local);
    }
  }
  return references;
}

function importedSources(sourcePath, textByPath, seen = new Set()) {
  if (!sourcePath || seen.has(sourcePath)) return [];
  seen.add(sourcePath);
  const sources = [textByPath.get(sourcePath) || ''];
  const importsOf = (path) => [...(textByPath.get(path) || '').matchAll(/\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)]
    .map((match) => match[1]).filter((specifier) => specifier.startsWith('.'));
  const visit = (path) => {
    for (const specifier of importsOf(path)) {
      const imported = resolve(dirname(path), specifier);
      if (!textByPath.has(imported) || seen.has(imported)) continue;
      seen.add(imported);
      sources.push(textByPath.get(imported) || '');
      visit(imported);
    }
  };
  visit(sourcePath);
  return sources;
}

function dynamicInlinePatterns(textByPath) {
  const patterns = [];
  for (const [sourcePath, text] of textByPath) {
    const analysis = analyzeModule(text);
    if (!analysis) continue;
    const bindings = Object.fromEntries([...text.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*['"`](\/?(?:models|img\/textures|textures|posters)\/[^'"`]+)['"`]/g)]
      .map((match) => [match[1], match[2].replace(/^\//, '')]));
    for (const raw of analysis.inlineTemplates) {
      const template = raw.replace(/^\//, '').split(/[?#]/)[0]
        .replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (full, name) => bindings[name] ?? analysis.literals[name] ?? full);
      if (!ROOT_PATTERN.test(template)) continue;
      const expression = `^${escaped(template).replace(/\\\$\\\{[^}]+\\\}/g, '(.+)')}$`;
      patterns.push({ regex: new RegExp(expression), sources: importedSources(sourcePath, textByPath) });
    }
  }
  return patterns;
}

export function isReferenced(path, corpus, publicDir = PUBLIC, inlinePatterns = []) {
  const qualified = new RegExp(`(?<![\\w./-])\\/?(?:public/)?${escaped(path)}(?![\\w./-])`);
  if (qualified.test(corpus)) return true;
  if (path.startsWith('models/anims/')) {
    const indexPath = join(publicDir, 'models/anims/index.json');
    if (existsSync(indexPath)) {
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));
      const parts = path.split('/');
      if (parts.length === 4 && parts[3].endsWith('.glb')) {
        const state = basename(parts[3], '.glb');
        return Array.isArray(index.clipes?.[parts[2]]) && index.clipes[parts[2]].includes(state);
      }
    }
  }
  for (const { regex, sources } of inlinePatterns) {
    const match = regex.exec(path);
    if (match && match.slice(1).every((value) => sources.some((text) => new RegExp(`['"\`]${escaped(value)}['"\`]`).test(text)))) return true;
  }
  return false;
}

export function literalReferences(sources) {
  const refs = new Set();
  for (const text of sources) {
    for (const match of text.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) {
      const value = match[1] ?? match[2] ?? match[3];
      if (value.includes('${') || /[\r\n]/.test(value)) continue;
      let path = value.trim().replace(/^\.\//, '').replace(/^\//, '').replace(/^public\//, '');
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
  const textByPath = new Map(sourcePaths.map((sourcePath, index) => [sourcePath, sources[index] || '']));
  const callReferences = dynamicCallReferences(textByPath);
  const inlinePatterns = dynamicInlinePatterns(textByPath);
  const referencedRuntime = (path) => callReferences.has(path) || isReferenced(path, corpus, publicDir, inlinePatterns);
  const literal = literalReferences(sources);
  const disk = diskAssets(publicDir);
  const onDisk = new Set(disk);
  const files = Object.fromEntries(disk.map((path) => [path, sha256(join(publicDir, ...path.split('/')))]));
  const unreferenced = disk.filter((path) => !referencedRuntime(path));
  const next = { schema: 'asset-inventory-v1', roots: [...ROOTS], files, unreferenced };
  const findings = [];
  const add = (code, path) => findings.push({ code, path });

  for (const path of literal) {
    if (!onDisk.has(path)) add('referenced-file-lost', path);
  }
  for (const path of callReferences) {
    if (!onDisk.has(path)) add('referenced-file-lost', path);
  }
  if (previous) {
    for (const path of Object.keys(previous.files)) {
      if (!onDisk.has(path) && referencedRuntime(path)) add('referenced-file-lost', path);
    }
    for (const [path, hash] of Object.entries(files)) {
      if (!Object.hasOwn(previous.files, path)) add(referencedRuntime(path) ? 'inventory-new' : 'orphan-new', path);
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
  const newUnreviewed = result.next.unreferenced.filter((path) => !reviewedUnreferenced.has(path));
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
