import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Resolve o mesmo Three.js vendorizado do navegador, sem carregar mapas ou DOM.
{
  const fs = await import('node:fs');
  const raiz = path.resolve(HERE, '../..');            // a raiz do projeto
  const shim = path.join(raiz, 'node_modules', 'three');
  const alvoIdx = path.resolve(raiz, 'public/vendor/three.module.js');
  const alvoAdd = path.resolve(raiz, 'public/vendor/addons');
  const liga = (de, para, tipo) => {
    // lstat vê o LINK; existsSync vê o DESTINO. Link pendurado só aparece pro lstat.
    try { fs.lstatSync(de); fs.rmSync(de, { recursive: true, force: true }); } catch { /* não existe */ }
    fs.symlinkSync(para, de, tipo);
  };
  if (!fs.existsSync(path.join(shim, 'index.js'))) {
    fs.mkdirSync(shim, { recursive: true });
    fs.writeFileSync(path.join(shim, 'package.json'), JSON.stringify({
      name: 'three', version: '0.160.0', type: 'module', main: 'index.js',
      exports: { '.': './index.js', './addons/*': './addons/*' },
    }));
    liga(path.join(shim, 'index.js'), alvoIdx);
    liga(path.join(shim, 'addons'), alvoAdd, 'dir');
  }
}
export const THREE = await import('three');
