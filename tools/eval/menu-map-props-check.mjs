/* Backdrop do menu precisa reconstruir DEPOIS dos props do mapa selecionado.
   Caso real (09/08/2026): thumbnails prometiam GLBs, mas o menu construía caixas cinzas;
   o preload inicial usava só MAP_PROPS global. --mutante=sempropsmapa remove a expansão
   específica e prova que a cláusula lê o caminho usado, não só uma declaração. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let src = readFileSync(path.join(root, 'public/js/main.js'), 'utf8');
if (process.argv.includes('--mutante=sempropsmapa')) {
  const before = src;
  src = src.replace(/\.\.\.\(\(MAPS\[id\][\s\S]*?\.props\)[\s\S]*?\[\]\)/, '/* props específicos removidos */');
  if (src === before) throw new Error('MUTANTE sempropsmapa não aplicou');
}

const helper = /function menuProps\(id\)[\s\S]*?MAP_PROPS[\s\S]*?MAPS\[id\][\s\S]*?\.props[\s\S]*?\n\}/.test(src);
const preload = /preloadMapProps\(menuProps\(id\)\)[\s\S]*?rebuildMenuBackdrop\(\)/.test(src);
const troca = /function gotoMap\([\s\S]*?loadMenuBackdrop\(\)/.test(src);
console.log(`${helper ? 'PASSA' : 'FALHA'} MENUPROP1 lista inclui MAPS[id].props`);
console.log(`${preload ? 'PASSA' : 'FALHA'} MENUPROP2 rebuild definitivo ocorre depois do preload específico`);
console.log(`${troca ? 'PASSA' : 'FALHA'} MENUPROP3 toda troca de mapa dispara o preload/rebuild`);
if (!helper || !preload || !troca) process.exitCode = 1;
