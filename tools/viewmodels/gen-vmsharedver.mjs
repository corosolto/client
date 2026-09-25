#!/usr/bin/env node
/**
 * Gera `public/js/data/vmsharedver.js`: versão de URL pelos BYTES dos arquivos COMPARTILHADOS
 * do catálogo privado (atlas `T_*` do braço, `general-runtime.glb`, `recoil.json` e as trilhas
 * goldsrc/retarget quando existirem). Até aqui eles versionavam pela string fixa `paid-aaa-3`:
 * re-exportar um deles servia o cache velho (BUG-157). Só o resumo entra no Git.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'public/js/data/vmsharedver.js');
export const SHARED_REQUIRED = Object.freeze([
  ...['Arm01', 'Cloth01', 'Glove01'].flatMap((base) => ['B', 'N', 'ORM'].map((kind) => `shared/T_${base}_${kind}.webp`)),
  'shared/general-runtime.glb',
  'recoil.json',
]);
export const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);

export function gerar(assetRoot = path.join(ROOT, 'public/private-assets/viewmodels')) {
  const missing = SHARED_REQUIRED.filter((name) => !fs.existsSync(path.join(assetRoot, name)));
  if (missing.length) throw new Error(`Catálogo privado incompleto (${missing.join(', ')}); manifesto preservado.`);
  const names = [...SHARED_REQUIRED];
  for (const dir of ['goldsrc-vm', 'retarget-vm']) {
    const full = path.join(assetRoot, dir);
    if (fs.existsSync(full)) names.push(...fs.readdirSync(full).filter((f) => f.endsWith('-runtime.glb')).map((f) => `${dir}/${f}`));
  }
  const entries = names.sort().map((name) => [name, hashFile(path.join(assetRoot, name))]);
  const text = '// GERADO por tools/viewmodels/gen-vmsharedver.mjs — não editar à mão.\n'
    + '// Versão de URL pelos bytes dos arquivos compartilhados do catálogo privado (BUG-157).\n'
    + `export const SHARED_VER = Object.freeze(${JSON.stringify(Object.fromEntries(entries), null, 2)});\n`;
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== text) fs.writeFileSync(OUT, text);
  return { arquivos: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(gerar()));
