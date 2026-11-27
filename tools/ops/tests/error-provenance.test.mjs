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
import { classifyCrash, crashFamily, crashFamilyKey, crashFingerprint } from '../../../src/lib/error-provenance.mjs';

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

test('#798 (1): o payload do teste é o da issue (fingerprint 1cda8537)', () => {
  assert.equal(crashFingerprint('error', EVAL_CSP_798, BLOB_798), '1cda8537');
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

/* ── FAMÍLIA: a mesma falha em cada língua do navegador é UMA issue ─────────────── */

/* Mensagens literais de `js_error` (alpha.156/157) e das issues #1425 #1435 #1436 #1439 #1445. */
const TRES_FORA_DO_MAPA = [
  'TypeError: The specifier “three” was a bare specifier, but was not remapped to anything. Relative module specifiers must start with “./”, “../” or “/”.',
  'Falha ao abrir a arena: O especificador “three” era um especificador simples, mas não foi remapeado para nada. Especificadores de módulo relativos devem começar com “./”, “../” ou “/”.',
  'Falha ao abrir a arena: Le spécificateur « three » était un spécificateur simple, mais n’a pas été remappé. Les spécificateurs relatifs de modules doivent commencer par « ./ », « ../ » ou « / ».',
  'Falha ao abrir a arena: “three” belirteci çıplak boş belirteçti ama hiçbir şeyle eşlenmedi. Göreli modül belirteçleri “./”, “../” veya “/” ile başlamalıdır.',
  'Falha ao abrir a arena: O indicador «three» estaba baleiro, pero non se volveu asociar a nada. Os indicadores de módulo relativos deben comezar con «./», «../», ou «/».',
  'TypeError: Спецификатор «three» являлся голым спецификатором, но не был переназначен на что-либо. Связанные спецификаторы модуля должны начинаться с «./», «../» или «/».',
  'TypeError: “three”是一个裸说明符，但未重新进行任何映射。相对模块说明符必须以“./”、 “../”或 “/”开头。',
  'Uncaught TypeError: Failed to resolve module specifier "three". Relative references must start with either "/", "./", or "../".',
  'Uncaught TypeError: Failed to resolve module specifier "three/addons/loaders/GLTFLoader.js". Import Map: "three/addons/loaders/GLTFLoader.js" matches with "three/addons/" but is blocked by a null value',
  "Falha ao abrir a arena: Module name, 'three' does not resolve to a valid URL.",
];

test('o `three` fora do import map é uma família só, em toda língua e engine', () => {
  for (const message of TRES_FORA_DO_MAPA) assert.equal(crashFamily(message), 'modulo-nao-mapeado:three', message);
  assert.equal(new Set(TRES_FORA_DO_MAPA.map(crashFamilyKey)).size, 1);
});

test('bare specifier sem import map é codigo: purga não resolve (alpha.157, 27/11)', () => {
  for (const message of TRES_FORA_DO_MAPA) {
    assert.equal(classifyCrash({ message, source: 'https://www.csbrasil.online/js/main.js', stack: '' }, ORIGEM), 'codigo', message);
  }
});

test('o prefixo do launch watchdog não separa a família do erro cru', () => {
  const cru = "Uncaught TypeError: Cannot read properties of null (reading 'update')";
  const embrulhado = "Falha ao abrir partida: Cannot read properties of null (reading 'update')";
  assert.equal(crashFamily(cru), crashFamily(embrulhado));
  assert.notEqual(crashFamily(cru), crashFamily("Falha ao abrir partida: Cannot read properties of null (reading 'net')"));
});

test('caminho relativo citado num erro comum não vira módulo fora do mapa', () => {
  assert.notEqual(crashFamily('Error: "./js/main.js" failed, see ../docs'), 'modulo-nao-mapeado:.');
  assert.doesNotMatch(crashFamily("Cannot read properties of undefined (reading './x')"), /^modulo-nao-mapeado/);
});

test('a chave da família é estável e cabe na busca da issue', () => {
  assert.equal(crashFamilyKey(TRES_FORA_DO_MAPA[0]), `familia-${crashFingerprint('familia', 'modulo-nao-mapeado:three', '')}`);
  assert.match(crashFamilyKey('qualquer coisa'), /^familia-[0-9a-f]{8}$/);
});
