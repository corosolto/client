/* REDE CAÍDA NÃO É DEFEITO DE CÓDIGO (BUG-170, #592).
   ═══════════════════════════════════════════════════════════════════════════════════
   O coletor chamava de `codigo` — e portanto abria issue automática de crash — toda
   rejeição de fetch que caísse na janela de carga da partida. Três issues idênticas
   nasceram disso: #125 ("network error", Firefox), #201 ("Load failed", WebKit) e
   #592, que é a #125 de volta DEPOIS de fechada.

   Por que o corte antigo não pegava, nos dois degraus:

   • `isOpaqueNoise` desiste logo no começo quando há `source` OU `stack`. O launch
     watchdog SEMPRE preenche os dois (`source='promise'`, `stack='TypeError: network
     error'`), então o ramo `^network error$` de `OPAQUE_RE` nunca rodava para esses
     payloads — era letra morta justamente no caso que ele dizia cobrir.
   • E mesmo que rodasse: o watchdog embrulha a mensagem em "Falha ao abrir <etapa>: …",
     e a âncora `^…$` já não casava.

   Esta régua tranca o contrato dos dois lados: a classificação no servidor e a redação
   ESPELHADA no cliente (`src/pages/index.astro`), que é o que impede a queda de rede de
   derrubar o painel de launch. Se os dois textos divergirem, a rede volta a abrir issue
   de um lado ou a acusar falha falsa do outro.

   uso: npm run ops:test
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { classifyCrash } from '../../../src/lib/error-provenance.mjs';

const ORIGEM = 'https://www.csbrasil.online';
const raiz = (p) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));

/* Os payloads abaixo são as linhas REAIS das issues, campo por campo — "Origem" do corpo
   da issue é o `source`, e é ele (junto do stack) que desarmava o isOpaqueNoise. */

test('#592: a forma embrulhada pelo watchdog não é crash de código', () => {
  assert.equal(classifyCrash({
    message: 'Falha ao abrir partida: network error',
    source: 'promise',
    stack: 'TypeError: network error',
  }, ORIGEM), 'recuperavel');
});

test('#125: a forma crua também não — e ela CARREGA stack, que é o que matava o OPAQUE_RE', () => {
  assert.equal(classifyCrash({
    message: 'network error',
    source: '',
    stack: 'TypeError: network error',
  }, ORIGEM), 'recuperavel');
});

test('#201: "Load failed" é a mesma queda escrita pelo WebKit, com stack same-origin do three', () => {
  assert.equal(classifyCrash({
    message: 'Falha ao abrir partida: Load failed',
    source: 'promise',
    stack: '@https://www.csbrasil.online/vendor/three.module.js:43521:60',
  }, ORIGEM), 'recuperavel');
});

test('Chromium escreve "Failed to fetch" para a mesma falha', () => {
  assert.equal(classifyCrash({ message: 'Failed to fetch', source: '', stack: '' }, ORIGEM), 'recuperavel');
});

/* ── O QUE O CORTE NÃO PODE ENGOLIR ─────────────────────────────────────────────── */

test('cache-split ganha de rede: "Failed to fetch dynamically imported module" é BUG-39', () => {
  assert.equal(classifyCrash({
    message: 'Failed to fetch dynamically imported module: https://www.csbrasil.online/js/main.js',
    source: 'https://www.csbrasil.online/js/main.js',
    stack: '',
  }, ORIGEM), 'cache-split');
});

test('defeito de verdade com a palavra "fetch" na mensagem segue sendo codigo', () => {
  assert.equal(classifyCrash({
    message: "Cannot read properties of null (reading 'fetch')",
    source: 'https://www.csbrasil.online/js/main.js:1200:4',
    stack: 'TypeError: Cannot read properties of null\n    at https://www.csbrasil.online/js/main.js:1200:4',
  }, ORIGEM), 'codigo');
});

test('a âncora é a mensagem INTEIRA: rede citada no meio de um defeito não corta', () => {
  assert.equal(classifyCrash({
    message: 'falha ao montar o roster depois de network error',
    source: 'https://www.csbrasil.online/js/main.js:3455:9',
    stack: 'Error\n    at https://www.csbrasil.online/js/main.js:3455:9',
  }, ORIGEM), 'codigo');
});

/* ── ESPELHO CLIENTE ↔ SERVIDOR ─────────────────────────────────────────────────── */

test('a REDE_RE do servidor e a erroDeRede do cliente têm a MESMA redação', () => {
  const servidor = readFileSync(raiz('src/lib/error-provenance.mjs'), 'utf8');
  const cliente = readFileSync(raiz('src/pages/index.astro'), 'utf8');
  const literal = /\/\^\(\?:falha ao abrir \[\^:\]\{1,40\}: \)\?\(\?:network error\|load failed\|failed to fetch\|networkerror when attempting to fetch resource\\\.\?\)\$\/i/;
  assert.match(servidor, literal, 'REDE_RE sumiu ou mudou em src/lib/error-provenance.mjs');
  assert.match(cliente, literal, 'erroDeRede sumiu ou divergiu em src/pages/index.astro');
});

test('o watchdog do cliente consulta erroDeRede antes de derrubar o launch', () => {
  const cliente = readFileSync(raiz('src/pages/index.astro'), 'utf8');
  assert.match(
    cliente,
    /if \(lancamento\.ativo && interna && !erroIgnoravel\(r\) && !erroDeRede\(.+\)\) lancamento\.fail\(/,
    'a guarda de rede saiu do unhandledrejection — a queda de rede volta a virar "Falha ao abrir partida"',
  );
});
