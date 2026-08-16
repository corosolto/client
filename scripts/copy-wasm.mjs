#!/usr/bin/env node
// Copia o binário do resvg-wasm do node_modules para public/wasm/resvg.wasm.
//
// POR QUE ESTE SCRIPT EXISTE
// `src/pages/api/badge/[...path].png.ts:19` faz
//     fetch(new URL('/wasm/resvg.wasm', req.url))
// ou seja, a rota da badge busca o wasm no PRÓPRIO site. Só que
// `public/wasm/resvg.wasm` NUNCA esteve no git e nada no build o gerava — o
// arquivo só existia na máquina de quem copiou à mão. Num deploy limpo a
// partir do repositório, o fetch dá 404, o `init()` lança, e:
//   - /api/badge/<id>.png devolve 500
//   - toda página /u/<id>/<nick> fica sem og:image e com a badge quebrada
// que é justamente o maior ativo social do projeto.
//
// Copiar do node_modules no build resolve sem baixar nada e sem versionar um
// binário de 1 MB. O caminho de origem muda entre versões do pacote, então a
// busca abaixo é tolerante.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEST_DIR = join(ROOT, 'public', 'wasm');
const DEST = join(DEST_DIR, 'resvg.wasm');

const require = createRequire(import.meta.url);

const CANDIDATOS = [
  '@resvg/resvg-wasm/index_bg.wasm',
  '@resvg/resvg-wasm/dist/index_bg.wasm',
];

let origem = null;
for (const c of CANDIDATOS) {
  try { origem = require.resolve(c); break; } catch { /* tenta o próximo */ }
}
// último recurso: resolve o pacote e procura o .wasm ao lado
if (!origem) {
  try {
    const pkg = dirname(require.resolve('@resvg/resvg-wasm/package.json'));
    for (const rel of ['index_bg.wasm', 'dist/index_bg.wasm']) {
      if (existsSync(join(pkg, rel))) { origem = join(pkg, rel); break; }
    }
  } catch { /* pacote ausente */ }
}

if (!origem) {
  console.warn('[copy-wasm] resvg-wasm não encontrado no node_modules — ' +
    '/api/badge vai depender de public/wasm/resvg.wasm já existir. ' +
    'Rode `npm install` e repita.');
  process.exit(0);   // NÃO derruba o build: o site inteiro não pode cair por causa da badge
}

mkdirSync(DEST_DIR, { recursive: true });
copyFileSync(origem, DEST);
console.log('[copy-wasm] ok:', origem, '->', 'public/wasm/resvg.wasm');
