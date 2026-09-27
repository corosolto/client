import fs from 'node:fs/promises';
import path from 'node:path';
import { readManifest, sha256File } from '../../../scripts/vm-assets.mjs';

export async function assertRuntimeDir(dir) {
  const manifest = readManifest();
  const expected = new Map(manifest.files.map((entry) => [entry.path, entry]));
  if (expected.size !== manifest.files.length || manifest.count !== expected.size
    || manifest.totalBytes !== manifest.files.reduce((n, entry) => n + entry.bytes, 0)) {
    throw new Error('manifesto do runtime inconsistente');
  }
  const found = [];
  async function walk(abs, rel = '') {
    for (const entry of await fs.readdir(abs, { withFileTypes: true })) {
      const name = rel ? `${rel}/${entry.name}` : entry.name;
      const file = path.join(abs, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`link simbólico proibido no runtime: ${name}`);
      if (entry.isDirectory()) await walk(file, name);
      else if (entry.isFile()) found.push(name);
      else throw new Error(`entrada não regular no runtime: ${name}`);
    }
  }
  await walk(dir);
  const extras = found.filter((name) => !expected.has(name));
  const foundSet = new Set(found);
  const missing = manifest.files.filter((entry) => !foundSet.has(entry.path));
  if (extras.length || missing.length) {
    throw new Error(`runtime privado diverge do manifesto: ${extras.length} extra(s), ${missing.length} ausente(s) (ex.: ${[...extras, ...missing.map((entry) => entry.path)].slice(0, 4).join(', ')})`);
  }
  for (const entry of manifest.files) {
    const file = path.join(dir, entry.path);
    const stat = await fs.stat(file);
    if (stat.size !== entry.bytes || await sha256File(file) !== entry.sha256) {
      throw new Error(`runtime privado diverge do manifesto: ${entry.path}`);
    }
  }
  return manifest.files.length;
}
