/* O mapview precisa continuar desenhando enquanto TextureLoader/GLTFLoader concluem.
   Caso real (09/08/2026): a primeira captura de Lajes mostrou céu preto e superfícies
   sem arte; cinco segundos depois os assets estavam carregados, mas o arnês havia
   renderizado só um frame. --mutante=umframe remove o ciclo e precisa reprovar. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let src = readFileSync(path.join(root, 'public/mapview.html'), 'utf8');

if (process.argv.includes('--mutante=umframe')) {
  const before = src;
  src = src.replace(/\n\s*let frames = 0;[\s\S]*?requestAnimationFrame\(redrawWhileLoading\);/, '');
  if (src === before) throw new Error('MUTANTE NAO APLICOU: ciclo de redraw não encontrado');
}

const hasLoop = /let frames = 0;[\s\S]*renderer\.render\(scene, cam\);[\s\S]*frames < 360[\s\S]*requestAnimationFrame\(redrawWhileLoading\)/.test(src);
console.log(`${hasLoop ? 'PASSA' : 'FALHA'} MAPVIEW redesenha durante o carregamento assíncrono`);
if (!hasLoop) process.exitCode = 1;
