import { register } from 'node:module';
import { lstatSync, mkdirSync, mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Reescreve a resolução, preservando pacotes instalados e os outros ganchos do grafo.
const vendor = new URL('../../public/vendor/', import.meta.url).href;
const modules = fileURLToPath(new URL('../../node_modules/', import.meta.url));
const shim = path.join(modules, 'three');
// Instrumentos com import antecipado ainda precisam da ponte em disco.
// A publicação por symlink recusa um destino criado por outro processo.
let exists = false;
try { lstatSync(shim); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!exists) {
  mkdirSync(modules, { recursive: true });
  const stage = mkdtempSync(path.join(modules, '.cs-three-node-'));
  let published = false;
  try {
    writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
      name: 'three', version: '0.160.0', type: 'module', main: 'index.js',
      exports: { '.': './index.js', './addons/*': './addons/*' },
    }));
    symlinkSync(fileURLToPath(new URL('three.module.js', vendor)), path.join(stage, 'index.js'));
    symlinkSync(fileURLToPath(new URL('addons/', vendor)), path.join(stage, 'addons'), 'dir');
    try { symlinkSync(stage, shim, 'dir'); published = true; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  } finally { if (!published) rmSync(stage, { recursive: true, force: true }); }
}
register(`data:text/javascript,${encodeURIComponent(`
  const vendor = ${JSON.stringify(vendor)};
  export function resolve(specifier, context, nextResolve) {
    const target = specifier === 'three' ? 'three.module.js'
      : specifier.startsWith('three/addons/') ? 'addons/' + specifier.slice('three/addons/'.length) : null;
    return nextResolve(target ? new URL(target, vendor).href : specifier, context);
  }
`)}`);
export const THREE = await import('three');
