import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export function moduleCacheManifest(root = 'public/js', read = readFileSync) {
  const absoluteRoot = resolve(root);
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
    }
  };
  walk(absoluteRoot);
  const modules = files.map((file) => relative(absoluteRoot, file).split(sep).join('/')).sort();
  const hash = createHash('sha256');
  for (const module of modules) {
    hash.update(`${module}\0`);
    hash.update(read(join(absoluteRoot, ...module.split('/'))));
    hash.update('\0');
  }
  return { modules, revision: hash.digest('hex').slice(0, 12) };
}
