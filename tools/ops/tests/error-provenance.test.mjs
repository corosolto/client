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
import { classifyCrash, crashFingerprint } from '../../../src/lib/error-provenance.mjs';

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

/* ── #798: EvalError DE CSP VINDO DE SCRIPT blob: INJETADO ───────────────────────────
   O jogo não roda script blob: nem eval (script-src sem blob: e sem 'unsafe-eval'). O
   source `blob:https://…` não casava /^https?:/ e a URL de dentro do blob dava origem
   própria: virava `codigo`. Mutantes que esta régua pega: apagar a guarda; mover a guarda
   para depois do bloco sourceOrigin; exigir só a mensagem (3); exigir só o blob: (4);
   divergir a redação de um lado (7). */

const EVAL_CSP_798 = "Uncaught EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script: script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com\".";
const BLOB_798 = 'blob:https://www.csbrasil.online/a5428b51-d0be-4e18-a6da-fd19c6f8ad38:2:1320381';

/* O 1cda8537 publicado é da receita anterior à #1151, sobre o texto bruto: confere a
   procedência do payload, não a chave de agrupamento de hoje. */
const fnvBruto = (texto) => {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return `0000000${h.toString(16)}`.slice(-8);
};

test('#798 (1): o payload do teste é o da issue (fingerprint 1cda8537)', () => {
  assert.equal(fnvBruto(`error|${EVAL_CSP_798}|${BLOB_798}`), '1cda8537');
});

test('#798 (2): EvalError de CSP com source blob: é externo', () => {
  assert.equal(classifyCrash({ message: EVAL_CSP_798, source: BLOB_798 }, ORIGEM), 'externo');
});

test('#798 (3): o mesmo EvalError vindo de /js/*.js é eval nosso e segue codigo', () => {
  assert.equal(classifyCrash({ message: EVAL_CSP_798, source: 'https://www.csbrasil.online/js/main.js:10:5' }, ORIGEM), 'codigo');
});

test('#798 (4): outro erro com source blob: segue codigo', () => {
  assert.equal(classifyCrash({ message: 'TypeError: x is not a function', source: BLOB_798 }, ORIGEM), 'codigo');
});

test('#798 (5): textura blob: do GLTFLoader segue recuperavel', () => {
  assert.equal(classifyCrash({
    message: "THREE.GLTFLoader: Couldn't load texture blob:https://www.csbrasil.online/0b6f6c3e-1d2a-4c55-9f0e-2a7d1c9b8e11",
    source: '',
    stack: '',
  }, ORIGEM), 'recuperavel');
});

test('#798 (6): o EvalError sem source nem stack segue codigo', () => {
  assert.equal(classifyCrash({ message: EVAL_CSP_798, source: '', stack: '' }, ORIGEM), 'codigo');
});

test('#798 (7): a EVAL_CSP_RE do servidor e a evalCsp do cliente têm a MESMA redação', () => {
  const servidor = readFileSync(raiz('src/lib/error-provenance.mjs'), 'utf8');
  const cliente = readFileSync(raiz('src/pages/index.astro'), 'utf8');
  const literal = /\/\\bEvalError\\b\.\*'unsafe-eval' is not an allowed source of script\//;
  const guarda = /\/\^blob:\/i\.test\(sourceText\) && evalCsp\.test\(String\(mensagem \|\| ''\)\)\) return false;/;
  assert.match(servidor, literal, 'EVAL_CSP_RE sumiu ou mudou em src/lib/error-provenance.mjs');
  assert.match(cliente, literal, 'evalCsp sumiu ou divergiu em src/pages/index.astro');
  assert.match(cliente, guarda, 'a guarda blob: do espelho sumiu em src/pages/index.astro');
});

/* ── #1151: UUID DE blob: NÃO ENTRA NA CHAVE ───────────────────────────────────────────
   O GLTFLoader cria um object URL por textura, e cada UUID novo virava uma linha de 1 hit
   no js_error (106 linhas de uma família só). A origem continua na chave: localhost e
   produção não podem dividir o mesmo balde. */

const TEXTURA_1151 = (uuid, host = 'https://www.corosolto.com.br') =>
  `THREE.GLTFLoader: Couldn't load texture blob:${host}/${uuid}`;

test('#1151 (1): dois UUIDs da mesma origem dão o mesmo fingerprint', () => {
  assert.equal(
    crashFingerprint('warn', TEXTURA_1151('689c89d8-2851-4666-9d3f-f7a651f69583'), null),
    crashFingerprint('warn', TEXTURA_1151('12282842-f62c-48d1-978d-448b82325a94'), null),
  );
  assert.equal(
    crashFingerprint('error', EVAL_CSP_798, BLOB_798),
    crashFingerprint('error', EVAL_CSP_798, BLOB_798.replace('a5428b51-d0be-4e18-a6da-fd19c6f8ad38', 'ea680e47-79f1-4a5b-bc15-fa0bb7ab250e')),
  );
});

test('#1151 (2): origens diferentes continuam em chaves diferentes', () => {
  const uuid = 'ea680e47-79f1-4a5b-bc15-fa0bb7ab250e';
  assert.notEqual(
    crashFingerprint('warn', TEXTURA_1151(uuid), null),
    crashFingerprint('warn', TEXTURA_1151(uuid, 'http://localhost:4321'), null),
  );
});

test('#1151 (3): o reporte do index.astro normaliza mensagem e source antes do hash', () => {
  const pagina = readFileSync(fileURLToPath(new URL('../../../src/pages/index.astro', import.meta.url)), 'utf8');
  assert.match(pagina, /digital\(kind \+ '\|' \+ normalizaFingerprint\(mFinal\) \+ '\|' \+ normalizaFingerprint\(sFinal \|\| ''\)\)/);
  assert.match(pagina, /function normalizaFingerprint\(v\)\{[^}]*blob:\(https\?:/);
});
