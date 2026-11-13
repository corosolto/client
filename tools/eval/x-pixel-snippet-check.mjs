#!/usr/bin/env node
/* x-pixel-snippet-check.mjs — o código-base do pixel do X insere o <script> do uwt.js.
   ops-diag #1231: `a.parentNode.insertBefore(s,a)` passava a função twq em vez do elemento
   e o boot de produção lançava "insertBefore … parameter 1 is not of type 'Node'".
   Executa o snippet real de cada página num DOM falso e exige o elemento antes do 1º script.
   Uso: node tools/eval/x-pixel-snippet-check.mjs [--mutante=insere-funcao] */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && mutante !== 'insere-funcao') throw new Error(`mutante desconhecido: ${mutante}`);
const PAGINAS = ['src/layouts/Layout.astro', 'src/pages/index.astro'];
const BLOCO = /<!-- X conversion tracking base code -->\s*<script is:inline define:vars=\{\{ X_PIXEL_ID \}\}>([\s\S]*?)<\/script>/;
const { X_PIXEL_ID } = { X_PIXEL_ID: readFileSync('src/lib/x-pixel.ts', 'utf8').match(/X_PIXEL_ID = '([^']+)'/)[1] };

let falhas = 0;
for (const pagina of PAGINAS) {
  let codigo = readFileSync(pagina, 'utf8').match(BLOCO)?.[1];
  try {
    assert.ok(codigo, `${pagina}: bloco do pixel do X ausente`);
    if (mutante) codigo = codigo.replace('insertBefore(u,a)', 'insertBefore(s,a)');
    const inseridos = [], primeiro = { tag: 'script' };
    class Elemento { constructor(tag) { this.tag = tag; } }
    const pai = { insertBefore(no, ref) {
      if (!(no instanceof Elemento)) throw new TypeError("Failed to execute 'insertBefore' on 'Node': parameter 1 is not of type 'Node'.");
      inseridos.push({ no, ref });
    } };
    primeiro.parentNode = pai;
    const window = {};
    const document = { createElement: (tag) => new Elemento(tag), getElementsByTagName: (tag) => (tag === 'script' ? [primeiro] : []) };
    vm.runInNewContext(`const X_PIXEL_ID = ${JSON.stringify(X_PIXEL_ID)};\nvar twq;\n${codigo}`, Object.assign(window, { window, document }));
    assert.equal(inseridos.length, 1, `${pagina}: o uwt.js não foi inserido`);
    assert.equal(inseridos[0].no.tag, 'script', `${pagina}: inseriu algo que não é <script>`);
    assert.equal(inseridos[0].no.src, 'https://static.ads-twitter.com/uwt.js', `${pagina}: src do uwt.js errado`);
    assert.equal(inseridos[0].no.async, true, `${pagina}: uwt.js sem async`);
    assert.equal(inseridos[0].ref, primeiro, `${pagina}: uwt.js fora da posição do 1º script`);
    assert.deepEqual([...window.twq.queue[0]], ['config', X_PIXEL_ID], `${pagina}: twq('config') não entrou na fila`);
    console.log(`✓ ${pagina}: uwt.js inserido como <script async> e config na fila`);
  } catch (e) {
    falhas++;
    console.error(`✗ ${pagina}: ${e.message}`);
  }
}
if (mutante) {
  assert.ok(falhas > 0, 'mutante insere-funcao passou verde: a régua não morde');
  console.log('✓ mutante insere-funcao reprovado');
} else process.exitCode = falhas ? 1 : 0;
