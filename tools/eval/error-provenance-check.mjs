/* Erro externo continua no console e no banco, mas não vira crash do jogo. */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const mutants = [
  'sem-extensao', 'sem-cross-origin', 'filtro-amplo',
  'sem-api', 'sem-early-return',
  'sem-workflow', 'abre-externo',
  'sem-cliente', 'cliente-mensagem-url', 'sem-teto-externo', 'debug-externo', 'console-sem-origem',
  'cache-antes-origem', 'sem-recuperavel', 'sem-opaco', 'opaco-sem-guarda',
  'sem-vercel-helper', 'sem-vercel-cliente', 'sem-webgl',
  'sem-fingerprint', 'escala-incoerente', 'grava-forjado', 'receita-imul', 'cliente-hash-bruto', 'cliente-sem-retrim',
  'sem-log', 'log-amplo', 'log-sobre-tudo', 'log-nao-corta', 'sem-teto-console', 'pilha-so-no-primeiro', 'times-sem-erro',
  'sem-midia', 'midia-ampla', 'sem-cota-midia',
];
if (mutant && !mutants.includes(mutant)) throw new Error(`mutante desconhecido: ${mutant}`);

const helperPath = 'src/lib/error-provenance.mjs';
const cliPath = 'scripts/classify-crash.mjs';
let helperSource = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : '';
let api = readFileSync('src/pages/api/jserror.ts', 'utf8');
let workflow = readFileSync('.github/workflows/crash-fix.yml', 'utf8');
let page = readFileSync('src/pages/index.astro', 'utf8');
let gameJs = readFileSync('public/js/game.js', 'utf8');
let mutationApplied = !mutant;

const mutate = (source, before, after) => {
  const changed = source.replace(before, after);
  mutationApplied = changed !== source;
  return changed;
};
if (mutant === 'sem-extensao') helperSource = mutate(helperSource,
  'if (EXTENSION_RE.test(sourceText)) return true;',
  'if (EXTENSION_RE.test(sourceText)) return false;');
if (mutant === 'sem-cross-origin') helperSource = mutate(helperSource,
  'if (sourceOrigin && sourceOrigin !== ownOrigin) return true;',
  'if (sourceOrigin && sourceOrigin !== ownOrigin) return false;');
if (mutant === 'filtro-amplo') helperSource = mutate(helperSource,
  'const evidence = [message, source, stack].filter(Boolean).join("\\n");',
  'if (/Script error|undefined/i.test(String(message))) return true;\n  const evidence = [message, source, stack].filter(Boolean).join("\\n");');
if (mutant === 'sem-api') api = mutate(api,
  "if (!shouldDispatchCrash(classification) || !coerente)",
  "if (!neverDispatchCrash(classification) || !coerente)");
if (mutant === 'sem-early-return') api = mutate(api,
  'if (!shouldDispatchCrash(classification) || !coerente) return json({ ok: true, escalated: false, classification });',
  'if (!shouldDispatchCrash(classification) || !coerente) { /* externo segue para dispatch */ }');
if (mutant === 'sem-workflow') workflow = mutate(workflow,
  'node scripts/classify-crash.mjs',
  'node scripts/classificador-removido.mjs');
if (mutant === 'abre-externo') workflow = mutate(workflow,
  "(steps.cls.outputs.classe == 'codigo' ||",
  "(steps.cls.outputs.classe == 'externo' || steps.cls.outputs.classe == 'codigo' ||");
if (mutant === 'sem-cliente') page = mutate(page,
  "origemDoJogo(null, r && r.stack, String((r && r.message) || r || ''))",
  'origemDoJogo(null, null, null)');
if (mutant === 'cliente-mensagem-url') page = mutate(page,
  "var prova = sourceText + '\\n' + String(stack || '');",
  "var prova = sourceText + '\\n' + String(stack || '') + '\\n' + String(mensagem || '');");
if (mutant === 'sem-teto-externo') page = mutate(page,
  'if (nExternos >= TETO_EXTERNO) return null;',
  'if (nExternos < 0) return null;');
if (mutant === 'debug-externo') page = mutate(page,
  "if (interna) showDebug('error'",
  "showDebug('error'");
/* O console foi o terceiro caminho e o único sem a guarda: extensão que chama
   console.error abria overlay e comia a cota interna (greptile, PR #202). */
if (mutant === 'console-sem-origem') page = mutate(page,
  "reporta('console', m, null, pilha, !interna)",
  "reporta('console', m, null, pilha)");
if (mutant === 'sem-vercel-helper') helperSource = mutate(helperSource,
  "if (VENDOR_RE.test(sourceText) || VENDOR_RE.test(String(stack || ''))) return true;",
  "if (VENDOR_RE.test(sourceText) || VENDOR_RE.test(String(stack || ''))) return false;");
if (mutant === 'sem-vercel-cliente') page = mutate(page,
  "if (vendor.test(sourceText) || vendor.test(String(stack || ''))) return false;",
  "if (vendor.test(sourceText) || vendor.test(String(stack || ''))) return true;");
if (mutant === 'cache-antes-origem') helperSource = mutate(helperSource,
  "if (isExternalCrash(payload, ownOrigin)) return 'externo';\n  if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';",
  "if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';\n  if (isExternalCrash(payload, ownOrigin)) return 'externo';");
if (mutant === 'sem-recuperavel') helperSource = mutate(helperSource,
  "if (RECOVERABLE_RE.test(evidence)) return 'recuperavel';",
  "if (RECOVERABLE_RE.test(evidence)) return 'codigo';");
if (mutant === 'sem-opaco') helperSource = mutate(helperSource,
  'return OPAQUE_RE.test(String(message).trim());',
  'return false;');
if (mutant === 'sem-webgl') helperSource = mutate(helperSource,
  "if (AMBIENTE_RE.test(String(payload.message || ''))) return 'externo';",
  'if (false) return false;');
if (mutant === 'opaco-sem-guarda') helperSource = mutate(helperSource,
  'if (source || stack) return false;',
  'if (false) return false;');
/* Coerente por decreto: a chave forjada volta a ser aceita e a escalar. */
if (mutant === 'sem-fingerprint') api = mutate(api,
  'const coerente = fingerprintConfere(fingerprint, { kind, message, source });',
  'const coerente = true;');
/* Deixa o incoerente escalar de novo — o vetor exato da #383. */
if (mutant === 'escala-incoerente') api = mutate(api,
  'if (!shouldDispatchCrash(classification) || !coerente)',
  'if (!shouldDispatchCrash(classification))');
/* Grava sob a chave REIVINDICADA: o dispatch não sai, mas o agrupamento já foi envenenado. */
if (mutant === 'grava-forjado') api = mutate(api,
  '    p_fingerprint: chave,',
  '    p_fingerprint: fingerprint,');
/* `Math.imul` é a FNV-1a "correta" e é a armadilha: o `digital()` do cliente multiplica em
   ponto flutuante, perde precisão acima de 2^53, e é esse número que está publicado nas issues. */
if (mutant === 'receita-imul') helperSource = mutate(helperSource,
  'h = (h * 16777619) >>> 0;',
  'h = Math.imul(h, 16777619) >>> 0;');
/* O cliente voltando a hashear o valor BRUTO: como ele envia o cortado, todo relatório com
   mensagem acima de 500 chars deixaria de bater — e a guarda o tiraria do escalonamento. */
/* Sem reaparar depois do corte, o cliente manda um espaço final que o `str()` do servidor
   tira: crash real comprido vira incoerente e sai do escalonamento sem ninguém ver. */
if (mutant === 'cliente-sem-retrim') page = mutate(page,
  "return t ? t.slice(0, max).trim() : '';",
  "return t ? t.slice(0, max) : '';");
if (mutant === 'cliente-hash-bruto') page = mutate(page,
  "var mFinal = corta(msg, 500) || '?', sFinal = corta(source, 300) || null;\n      var fp = digital(kind + '|' + mFinal + '|' + (sFinal || ''));",
  "var mFinal = corta(msg, 500) || '?', sFinal = corta(source, 300) || null;\n      var fp = digital(kind + '|' + (msg || '') + '|' + (source || ''));");

/* BUG-72 · console.error com string é log, não exceção. Os mutantes cobrem os dois lados:
   a guarda no helper, o rebaixamento na API, a cota no cliente e a pilha que o hook acha. */
if (mutant === 'sem-log') helperSource = mutate(helperSource,
  "return kind === 'console' && !stack;", 'return false;');
if (mutant === 'log-amplo') helperSource = mutate(helperSource,
  "return kind === 'console' && !stack;", "return kind === 'console';");
if (mutant === 'log-nao-corta') helperSource = mutate(helperSource,
  "classification !== 'log'", "classification !== 'log-desligado'");
if (mutant === 'log-sobre-tudo') api = mutate(api,
  "const classification = base === 'codigo' && isConsoleLog({ kind, stack }) ? 'log' : base;",
  "const classification = isConsoleLog({ kind, stack }) ? 'log' : base;");
if (mutant === 'sem-teto-console') page = mutate(page,
  'if (nConsole >= TETO_CONSOLE) return null;',
  'if (nConsole < 0) return null;');
/* `console.error('falha ao abrir a partida', e)` é o idioma de `main.js` (4 chamadas): o
   erro vem no argumento 1. Ler só o 0 joga a pilha fora e o corte silencia o relato. */
/* Sinal DELIBERADO do nosso código: sem `Error` ele não tem pilha, e o corte do BUG-72 o
   silenciaria. Não há régua de composição de times, então quem guarda esse sinal é esta. */
if (mutant === 'times-sem-erro') gameJs = mutate(gameJs,
  "console.error(new Error(msg + ' — TIMES DESIGUAIS (bug de composição)'))",
  "console.error(msg + ' — TIMES DESIGUAIS (bug de composição)')");
if (mutant === 'pilha-so-no-primeiro') page = mutate(page,
  'var pilha = null;\n        for (var j = 0; j < arguments.length && j < 4 && !pilha; j++) pilha = (arguments[j] && arguments[j].stack) || null;',
  'var pilha = (arguments[0] && arguments[0].stack) || null;');
/* BUG-73 · abort de mídia (#389). Os três mutantes cobrem os três jeitos de o corte deixar
   de valer: sumir do helper, ficar LARGO a ponto de engolir crash de verdade, e existir no
   helper sem a cota própria no cliente (que é o que impede o abort de comer o TETO_SESSAO). */
if (mutant === 'sem-midia') helperSource = mutate(helperSource,
  "if (MEDIA_ABORT_RE.test(evidence)) return 'recuperavel';",
  "if (MEDIA_ABORT_RE.test(evidence)) return 'codigo';");
if (mutant === 'midia-ampla') helperSource = mutate(helperSource,
  'const MEDIA_ABORT_RE = ',
  'const MEDIA_ABORT_RE = /aborted|interrupted/i; const MEDIA_ABORT_RE_ESTREITO = ');
if (mutant === 'sem-cota-midia') page = mutate(page,
  'if (nMidia >= TETO_MIDIA) return null;',
  'if (nMidia < 0) return null;');

let classifyCrash = null, shouldDispatchCrash = null, crashFingerprint = null, fingerprintConfere = null, isConsoleLog = null;
if (helperSource) {
  try {
    const encoded = Buffer.from(helperSource).toString('base64');
    ({ classifyCrash, shouldDispatchCrash, crashFingerprint, fingerprintConfere, isConsoleLog } =
      await import(`data:text/javascript;base64,${encoded}`));
  } catch { /* cláusulas abaixo ficam vermelhas */ }
}
const own = 'https://www.csbrasil.online';
const classify = (payload) => classifyCrash ? classifyCrash(payload, own) : null;

const extensionFixtures = [
  { source: 'chrome-extension://abc/inpage.js:1:2', message: 'boom' },
  { stack: 'at send (moz-extension://abc/Content.js:883:47)', message: 'boom' },
  { message: '[Windowed] safari-web-extension://abc/content.js:2:3' },
];
const crossOriginFixtures = [
  { source: 'https://static.cloudflareinsights.com/beacon.min.js:1:136', message: 'at não existe' },
  { stack: 'Error\n at https://cdn.example.invalid/sdk.js:2:4', message: 'boom' },
];
/* #218/#219: bundles da Vercel (analytics, speed-insights) são servidos do próprio
   domínio em /_vercel/, mas o `pushState` read-only estoura DENTRO do código deles. */
const vendorFixtures = [
  { source: `${own}/_vercel/insights/script.js:1:2317`, message: "Cannot assign to read only property 'pushState' of object '#<History>'" },
  { stack: `TypeError\n    at ${own}/_vercel/speed-insights/script.js:1:12505`, message: "Cannot assign to read only property 'pushState'" },
];
/* #277/#276/#274: sem_webgl é o jogo DETECTANDO browser sem WebGL (painel amigável do
   BUG-44 já tratou). É ambiente do jogador — mesmo same-origin, não é defeito de código. */
const ambienteFixtures = [
  { source: `${own}/js/glcontext.js:105:1`, message: 'sem_webgl: nenhum contexto foi criado · experimental-webgl/economia: Could not create a WebGL context, VENDOR = 0x8086' },
  { source: `${own}/js/glcontext.js:105:1`, message: 'sem_webgl: nenhum contexto foi criado · webgl2/economia: WebGL is currently disabled.' },
];
const internalFixtures = [
  { source: `${own}/js/game.js:1:2`, stack: `${own}/js/main.js:3:4`, message: 'boom' },
  { source: `${own}/js/main.js:1:2`, stack: 'Error at chrome-extension://abc/inpage.js:2:3', message: 'boom' },
  { source: '', stack: `Error at ${own}/js/main.js:3:4\n at chrome-extension://abc/inpage.js:2:3`, message: 'boom' },
  { message: 'falha ao carregar https://cdn.example.invalid/data' },
  /* crash real do jogo cujo texto CONTÉM "undefined" mas carrega filename
     same-origin: nenhum filtro de substring pode aposentá-lo (mutante filtro-amplo). */
  { source: `${own}/js/game.js:1:2`, stack: '', message: "Cannot read properties of undefined (reading 'x')" },
  /* sem pilha, sem source, mas a mensagem NÃO bate assinatura opaca conhecida:
     ambíguo continua acionável, o corte opaco é estreito de propósito. */
  { source: '', stack: '', message: 'TypeError: x is undefined' },
];
/* Sinais opacos de terceiro/extensão/resposta corrompida: sem pilha e sem
   nome de arquivo do jogo, viram externo e não abrem issue (#109, #125, #126, #136). */
const opaqueFixtures = [
  { source: '', stack: '', message: 'Script error.' },
  { source: '', stack: '', message: 'Script error' },
  { source: null, stack: null, message: 'uncaught exception: undefined' },
  { source: null, stack: null, message: 'SyntaxError: illegal character U+009E' },
  { source: '', stack: '', message: 'network error' },
];
/* Aviso recuperável do carregador do three (issue #110): a textura embutida não
   decodifica, o three loga com console.error mas o modelo carrega. Fica no banco,
   não abre issue. Sem `source`/`stack` (o console.error do three não tem pilha). */
const recoverableFixtures = [
  { source: '', stack: '', message: "THREE.GLTFLoader: Couldn't load texture blob:https://www.csbrasil.online/bbaced98-44e1-4922-83b1-4564e004a737" },
  { message: "THREE.GLTFLoader: Couldn't load texture models/characters/mst.glb" },
];
/* BUG-73 · abort de MÍDIA (issue #389; a #122 do BUG-37 é a irmã). O navegador rejeita o
   `play()` pendente quando alguém chama `pause()` ou troca o `src` — e o jogo faz isso DE
   PROPÓSITO: `audio.js:97` (radioVoice corta a fala anterior), `:119` (characterSelectVoice
   corta a voz do avatar anterior) e `:159` (stopRound corta a vinheta com fade). Tanto que
   `character-select-voice-check.mjs:56` EXIGE a interrupção (`pausas=3`).
   Chega sem `stack` e sem `source` — então a proveniência não consegue inocentar e o rótulo
   TEM que sair da mensagem. As cinco redações são as do Chrome/Firefox/Safari. */
const midiaFixtures = [
  { source: '', stack: '', message: 'The play() request was interrupted by a call to pause(). https://goo.gl/LdLk22' },
  { source: '', stack: '', message: 'The play() request was interrupted by a new load request. https://goo.gl/LdLk22' },
  { source: '', stack: '', message: 'The play() request was interrupted because the media was removed from the document. https://goo.gl/LdLk22' },
  { source: '', stack: '', message: "The fetching process for the media resource was aborted by the user agent at the user's request." },
  { source: '', stack: '', message: 'AbortError: The operation was aborted.' },
];
/* O corte não pode ser largo: `aborted`/`interrupted` solto engole crash de verdade. Estes
   três continuam `codigo` — inclusive um que estoura DENTRO do módulo de áudio. */
const naoMidiaFixtures = [
  { source: `${own}/js/audio.js:55:7`, stack: '', message: "Cannot read properties of undefined (reading 'play')" },
  { source: '', stack: '', message: 'Match interrupted by host' },
  { source: '', stack: '', message: 'The upload was aborted' },
];
const externalCacheFixtures = [
  { source: 'chrome-extension://abc/inpage.js:1:2', message: 'does not provide an export' },
  { source: 'https://cdn.example.invalid/chunk.js:1:2', message: 'Failed to fetch dynamically imported module' },
  { source: 'moz-extension://abc/inpage.js:1:2', message: 'Importing a module script failed' },
  { stack: 'Error at safari-web-extension://abc/app.js:1:2', message: 'error loading dynamically imported module' },
  { source: 'https://static.cloudflareinsights.com/beacon.js:1:2', message: 'prod-coherence reprovou' },
];

/* EP4 precisa provar o early-return real: um único ponto de dispatch, depois
   da guarda que RETORNA, e o RPC de gravação antes dos dois. */
const rpcIndex = api.indexOf("rpc('report_js_error'");
const externalIndex = api.indexOf('if (!shouldDispatchCrash(classification) || !coerente)');
const dispatchIndex = api.indexOf('const dispatchToken');
const dispatchFetches = (api.match(/api\.github\.com\/repos/g) || []).length;
const apiWired = api.includes("from '../../lib/error-provenance.mjs'")
  && api.includes('shouldDispatchCrash')
  && /if \(!shouldDispatchCrash\(classification\) \|\| !coerente\)\s*return json\(\{ ok: true, escalated: false, classification \}\);/.test(api)
  && rpcIndex >= 0 && externalIndex > rpcIndex && dispatchIndex > externalIndex
  && dispatchFetches === 1;

const cli = (payload) => {
  if (!existsSync(cliPath)) return null;
  const result = spawnSync(process.execPath, [cliPath], {
    encoding: 'utf8',
    env: { ...process.env, MSG: payload.message || '', SRC: payload.source || '', STK: payload.stack || '', ORIGIN: own },
  });
  return result.status === 0 ? result.stdout.trim() : null;
};
/* O step de issue é o último do job: a condição inteira precisa estar no
   recorte, sem `externo` em nenhum OR, com always() e o fallback cache-split. */
const issueStep = workflow.match(/- name: issue deduplicada[\s\S]*$/)?.[0] || '';
const workflowWired = workflow.includes('node scripts/classify-crash.mjs')
  && issueStep.length > 0
  && issueStep.includes('always()')
  && issueStep.includes("steps.cls.outputs.classe == 'codigo'")
  && issueStep.includes("steps.cls.outputs.classe == 'cache-split'")
  && !issueStep.includes("classe == 'externo'")
  && cli({ source: 'chrome-extension://abc/a.js', message: 'x' }) === 'classe=externo'
  && cli({ source: `${own}/js/game.js`, message: 'x' }) === 'classe=codigo'
  && cli({ message: 'prod-coherence reprovou' }) === 'classe=cache-split';

/* EP6 executa a origemDoJogo INLINE do cliente — regex de fiação sozinha
   aprovaria `function origemDoJogo(){ return true; }` (pego na review). */
let origemCliente = null;
const fnMatch = page.match(/function origemDoJogo\(source, stack, mensagem\)\{[\s\S]*?\n  \}/);
if (fnMatch) {
  try {
    origemCliente = new Function('location', `${fnMatch[0]}\nreturn origemDoJogo;`)({ origin: own, href: `${own}/` });
  } catch { /* cláusula fica vermelha */ }
}
const clientFixtures = [
  ['chrome-extension://abc/inpage.js:1:2', '', 'boom', false],
  ['https://static.cloudflareinsights.com/beacon.min.js:1:136', '', 'at não existe', false],
  [`${own}/js/game.js:1:2`, 'Error at chrome-extension://abc/inpage.js:2:3', 'boom', true],
  ['', `Error at ${own}/js/main.js:3:4\n at chrome-extension://abc/inpage.js:2:3`, 'boom', true],
  [null, null, 'Script error.', true],
  [null, '', 'falha ao carregar https://cdn.example.invalid/data', true],
  [null, '', '[Windowed] send_chrome_message@moz-extension://5b3899f8/Content.js:883:47', false],
  [null, 'Error\n at https://cdn.example.invalid/sdk.js:2:4', 'boom', false],
];
const clientBehavior = !!origemCliente
  && clientFixtures.every(([source, stack, mensagem, esperado]) => origemCliente(source, stack, mensagem) === esperado);
/* Mesmo par de #218/#219 no cliente: /_vercel/ em source OU em stack não é jogo. */
const vendorClientFixtures = [
  [`${own}/_vercel/insights/script.js:1:2317`, '', "Cannot assign to read only property 'pushState'", false],
  [null, `TypeError\n    at ${own}/_vercel/speed-insights/script.js:1:12505`, 'boom', false],
];
const vendorBehavior = !!origemCliente
  && vendorClientFixtures.every(([source, stack, mensagem, esperado]) => origemCliente(source, stack, mensagem) === esperado);
const clientWired = /origemDoJogo\(e\.filename, e\.error && e\.error\.stack, String\(msg\)\)/.test(page)
  && /origemDoJogo\(null, r && r\.stack, String\(\(r && r\.message\) \|\| r \|\| ''\)\)/.test(page)
  && /lancamento\.ativo && interna/.test(page)
  && /if \(viuPropria\) return true;/.test(page)
  && /if \(sourceText && \/\^https\?:\\\/\\\/\/i\.test\(sourceText\)/.test(page)
  && /var TETO_EXTERNO = 3;/.test(page)
  && /if \(nExternos >= TETO_EXTERNO\) return null;/.test(page)
  && /reporta\('error', msg, loc, e\.error && e\.error\.stack, !interna\)/.test(page)
  && /reporta\('promise', \(r && r\.message\) \|\| String\(r\), null, r && r\.stack, !interna\)/.test(page)
  && /if \(interna\) showDebug\('error'/.test(page)
  && /if \(interna\) showDebug\('promise'/.test(page)
  && /if \(interna\) showDebug\('console'/.test(page)
  && /reporta\('console', m, null, pilha, !interna\)/.test(page);

/* EP12 · o `fingerprint` é a chave de agrupamento do `js_error` E a chave de dedupe do
   escalonamento (`dispatched_at`). Na palavra do cliente, um curl funde erros DISTINTOS num
   grupo só e todos menos o primeiro somem sem nunca escalar. Issue #383 (BUG-71).

   PROCEDÊNCIA: os três fingerprints abaixo são os PUBLICADOS nas issues #379, #380 e #381,
   abertas pelo coletor real em 19/08 (alpha.159). Se a receita não os reproduz, é a receita
   que está errada. A multiplicação é em ponto FLUTUANTE: passa de 2^53 e perde precisão, e é
   esse número lossy que está em campo — `Math.imul` dá outro (mutante `receita-imul`). */
const fingerprintFixtures = [
  ['error', "ReferenceError: Can't find variable: __firefox__", `${own}/:1:12`, '470752a2'],
  ['error', "TypeError: undefined is not an object (evaluating 'window.__firefox__.reader')", `${own}/:1:19`, '7122f83c'],
  ['error', "ReferenceError: Can't find variable: DarkReader", `${own}/:1:11`, 'cd468274'],
];
const MSG_382 = '%c[cheat-demo] ainda sem window.__game \u2014 você está no menu. Entre numa partida (JOGAR) e o cheat ativa sozinho. color:#ff2244;font-weight:bold';
const MSG_383 = 'jserror-overload-2026-08-19T17-36-24-896Z | fase A (mesmo fingerprint) #1';

/* As DUAS funções do cliente, executadas: `digital` sozinha aprovaria um `corta` que não
   corta. É a composição das duas que tem que bater com o servidor. */
let digitalCliente = null, cortaCliente = null;
const digitalMatch = page.match(/function digital\(s\)\{[\s\S]*?\n  \}/);
const cortaMatch = page.match(/function corta\(v, max\)\{[\s\S]*?\n  \}/);
if (digitalMatch && cortaMatch) {
  try {
    ({ digital: digitalCliente, corta: cortaCliente } =
      new Function(`${digitalMatch[0]}\n${cortaMatch[0]}\nreturn { digital: digital, corta: corta };`)());
  } catch { /* cláusula fica vermelha */ }
}
/* O trecho do `reporta()` é EXTRAÍDO e EXECUTADO, não reescrito aqui: recompor a receita à
   mão foi o furo da primeira versão desta régua — ela aprovava uma composição que só existia
   dentro do próprio arnês, e o cliente podia voltar a hashear o bruto sem acender nada. */
let montaCliente = null;
const fragMatch = page.match(/var mFinal = corta\(msg, 500\)[\s\S]*?var fp = digital\([^;]*\);/);
if (fragMatch && digitalCliente && cortaCliente) {
  try {
    montaCliente = new Function('kind', 'msg', 'source', 'digital', 'corta',
      `${fragMatch[0]}\nreturn { message: mFinal, source: sFinal, fingerprint: fp };`);
  } catch { /* cláusula fica vermelha */ }
}
/* …e o que é hasheado tem que ser o que VAI no corpo: sem este par, `reporta` podia hashear
   o normalizado e serializar outra coisa. */
const clienteEnviaOQueHasheia = /c\.message = mFinal;\s*\n\s*c\.source = sFinal;/.test(page);
const corpoDoCliente = (kind, msg, source) => {
  if (!montaCliente) return null;
  const c = montaCliente(kind, msg, source, digitalCliente, cortaCliente);
  return { kind, message: c.message, source: c.source, fingerprint: c.fingerprint };
};
/* O `str()` de `jserror.ts:32` roda ANTES da conferência: sem ele a régua compara o cliente
   com ele mesmo e cega a fronteira do corte, onde o trim do servidor tira um char (BUG-71). */
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const servidorAceita = (corpo) => !!corpo && typeof fingerprintConfere === 'function'
  && fingerprintConfere(corpo.fingerprint, {
    kind: corpo.kind, message: str(corpo.message, 500), source: str(corpo.source, 300),
  });

const receitaBate = typeof crashFingerprint === 'function' && !!montaCliente && clienteEnviaOQueHasheia
  && fingerprintFixtures.every(([kind, message, source, publicado]) =>
    crashFingerprint(kind, message, source) === publicado
    && corpoDoCliente(kind, message, source)?.fingerprint === publicado);
const aceitaCoerente = fingerprintFixtures.every(([kind, message, source, publicado]) =>
  servidorAceita({ kind, message, source, fingerprint: publicado }));

/* O caminho que a primeira versão desta régua deixou passar: mensagem acima de 500 chars
   (stack embutida, console.error multi-argumento, `Falha ao abrir …` com prefixo). O cliente
   corta em 500 ANTES de serializar, então o valor bruto não cruza a rede — hashear o bruto
   tirava do escalonamento todo relatório comprido, que é justo o mais informativo. */
const caminhoRealLongo = ['error', 'promise', 'console'].every((kind) =>
  servidorAceita(corpoDoCliente(kind, `boom ${'x'.repeat(900)}`, `${own}/js/game.js:1:2`)))
  && servidorAceita(corpoDoCliente('error', '  espaço nas pontas  ', null))
  && servidorAceita(corpoDoCliente('error', 'sem source nenhum', null))
  && servidorAceita(corpoDoCliente('error', 'src comprido', `${own}/js/${'a'.repeat(400)}.js:1:2`))
  && servidorAceita(corpoDoCliente('console', '', null))
  /* Espaço EXATAMENTE na fronteira do corte: o cliente cortava e mandava o espaço final, o
     `str()` do servidor o apara, e o crash real virava incoerente — gravado e nunca escalado. */
  && servidorAceita(corpoDoCliente('error', `${'a'.repeat(499)} ${'b'.repeat(50)}`, null))
  && servidorAceita(corpoDoCliente('error', 'boom', `${own}/js/${'a'.repeat(288)} x.js:1:2`));

/* A rajada "fase A": um fingerprint só para mensagens distintas. Nenhuma é coerente, e a
   chave DERIVADA de cada uma é distinta — é isso que desfaz a fusão do grupo. */
const derivadas = new Set([1, 2, 3, 4, 5].map((n) =>
  typeof crashFingerprint === 'function' ? crashFingerprint('error', MSG_383.replace(/#1$/, `#${n}`), null) : n));
const recusaForjado = ['error', 'promise', 'console'].every((kind) =>
  !servidorAceita({ kind, message: MSG_383, source: null, fingerprint: '18084ef4' }))
  && derivadas.size === 5 && !derivadas.has('18084ef4');

/* Fiação SEM comentário: a versão anterior casava o `return json(…400)` dentro de uma linha
   COMENTADA e ficava verde com a guarda desativada. Aqui a conferência é sobre o código. */
const apiCodigo = api.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const rpcIndexCodigo = apiCodigo.indexOf("rpc('report_js_error'");
const coerenteIndex = apiCodigo.indexOf('const coerente = fingerprintConfere(fingerprint, { kind, message, source });');
const fingerprintWired = coerenteIndex >= 0 && rpcIndexCodigo >= 0 && coerenteIndex < rpcIndexCodigo
  /* incoerente é GRAVADO sob a chave derivada — recusar apagaria relatório de jogador */
  && apiCodigo.includes('const chave = coerente ? fingerprint : crashFingerprint(kind, message, source);')
  && apiCodigo.includes('p_fingerprint: chave,')
  && !/return json\(\{ error: 'fingerprint_incoerente' \}/.test(apiCodigo)
  /* …e fica FORA do escalonamento, no mesmo early-return do externo */
  && apiCodigo.includes('if (!shouldDispatchCrash(classification) || !coerente) return json({ ok: true, escalated: false, classification });')
  && apiCodigo.includes("from '../../lib/error-provenance.mjs'");

/* EP13 · BUG-72 (issue #382). `console.error` com string é linha de LOG, não exceção: a #382
   é `%c[cheat-demo] …` de um cheat colado no devtools, e de 84 issues `crash-auto` ~24 são log
   informativo. O corte é `kind:'console'` SEM pilha — com pilha o console está sinalizando
   exceção de verdade e continua escalando.

   O PONTO CEGO QUE ISTO FECHA: `main.js` chama `console.error('falha ao abrir a partida', e)`
   em 4 lugares, com o erro no argumento 1. O hook lia só `arguments[0].stack`, então jogava a
   pilha fora — esses relatos já chegavam com stack vazia, e o corte os silenciaria. O hook
   agora varre os argumentos; o mutante `pilha-so-no-primeiro` devolve o furo. */
const logFixtures = [
  { kind: 'console', stack: null, message: MSG_382 },
  { kind: 'console', stack: '', message: '[TectonicProvider] Failed to initialize' },
  { kind: 'console', stack: undefined, message: 'THREE.WebGLProgram: Shader Error 1286' },
];
const naoLogFixtures = [
  { kind: 'console', stack: `Error\n    at ${own}/js/game.js:1:2`, message: 'boom' },
  { kind: 'error', stack: null, message: 'TypeError: x is undefined' },
  { kind: 'promise', stack: null, message: 'boom' },
];
const log = (payload) => (typeof isConsoleLog === 'function' ? isConsoleLog(payload) : null);

/* O hook do console EXTRAÍDO e EXECUTADO com os mesmos argumentos que o jogo passa: regex de
   fiação sozinha aprovaria uma varredura que não varre. */
let hookConsole = null;
const hookMatch = page.match(/var partes = \[\];[\s\S]*?var pilha = [^\n]*\n(?:\s*for \(var j[^\n]*\n)?/);
if (hookMatch) {
  try { hookConsole = new Function(`${hookMatch[0]}\nreturn { m: m, pilha: pilha };`); }
  catch { /* cláusula fica vermelha */ }
}
const erroDeVerdade = new Error('falha real');
const hookAchaPilha = !!hookConsole
  /* o idioma de main.js:959,1010,1102,1841 — erro no argumento 1 */
  && !!hookConsole('falha ao abrir a partida', erroDeVerdade).pilha
  && !!hookConsole(erroDeVerdade).pilha
  /* e log puro continua sem pilha, senão o corte nunca morde */
  && hookConsole('%c[cheat-demo] ainda sem window.__game', 'color:#ff2244;font-weight:bold').pilha === null
  /* a mensagem da #382 é a concatenação dos dois argumentos, com o %c e a CSS juntos */
  && hookConsole('%c[cheat-demo] x', 'color:#ff2244').m === '%c[cheat-demo] x color:#ff2244';

/* A cota: o `reporta` real do cliente ganhou ramo próprio para console, senão log tagarela
   come o TETO_SESSAO reservado a exceção (mesmo remédio do TETO_EXTERNO da BUG-51). */
const cotaConsoleWired = /var TETO_CONSOLE = \d+;/.test(page)
  && /\bnConsole = 0\b/.test(page)
  && /\} else if \(kind === 'console' && !stack\) \{\s*\n\s*if \(nConsole >= TETO_CONSOLE\) return null;\s*\n\s*nConsole\+\+;/.test(page)
  /* console COM pilha escala, então tem que consumir o balde de exceção, não o de log. */
  && /var TETO_CONSOLE = [0-9]+;/.test(page)
  && /if \(nEnviados >= TETO_SESSAO\) return null;/.test(page);

/* A API rebaixa SÓ o que viraria bug: `cache-split` vindo do console segue disparando o purge
   do Cloudflare, e `externo`/`recuperavel` mantêm o rótulo (mutante `log-sobre-tudo`). */
const baseIndex = api.indexOf("const base = classifyCrash(");
/* O detector de times desiguais precisa carregar Error para sobreviver ao corte. */
const sinalDeliberadoTemPilha = /console\.error\(new Error\(msg \+ ' — TIMES DESIGUAIS/.test(gameJs);
const logWired = api.includes('isConsoleLog')
  && baseIndex >= 0 && baseIndex < api.indexOf('if (!shouldDispatchCrash(classification)')
  && /const classification = base === 'codigo' && isConsoleLog\(\{ kind, stack \}\) \? 'log' : base;/.test(api);

/* EP14 executa o `erroIgnoravel` INLINE do cliente, como o EP6 faz com o `origemDoJogo`:
   regex de fiação sozinha aprovaria `function erroIgnoravel(){ return true; }`, que calaria
   crash de verdade. Cliente e servidor precisam concordar na MESMA redação — se um dos dois
   souber menos, o abort volta a comer cota de exceção ou volta a abrir issue. */
let ignoravelCliente = null;
const ignMatch = page.match(/function erroIgnoravel\(r\)\{[\s\S]*?\n  \}/);
if (ignMatch) {
  try { ignoravelCliente = new Function(`${ignMatch[0]}\nreturn erroIgnoravel;`)(); }
  catch { /* clausula fica vermelha */ }
}
/* As duas formas em que o abort chega ao `unhandledrejection`: DOMException com `name`, e a
   forma só-mensagem (o `reporta` já cortou a razão para string antes de decidir a cota). */
const midiaRazoes = midiaFixtures.map((f) => f.message)
  .concat(midiaFixtures.map((f) => ({ name: 'AbortError', message: f.message })));
const naoMidiaRazoes = naoMidiaFixtures.map((f) => f.message)
  .concat([{ name: 'TypeError', message: "Cannot read properties of undefined (reading 'short')" }]);
const midiaCliente = !!ignoravelCliente
  && midiaRazoes.every((r) => ignoravelCliente(r) === true)
  && naoMidiaRazoes.every((r) => ignoravelCliente(r) === false)
  /* a escapatória por `name` é anterior a esta régua e vale só para o painel de falha:
     operação cancelada nunca é crash. O balde de mídia NÃO passa por aqui (o `reporta`
     chama com a mensagem já cortada para string), então largura de `name` não vaza cota. */
  && ignoravelCliente({ name: 'AbortError', message: 'qualquer operação cancelada' }) === true;
/* A cota: mesmo remédio do TETO_EXTERNO (BUG-51) e do TETO_CONSOLE (BUG-72) — abort de mídia
   tem balde próprio, e o de exceção continua com os dez slots inteiros. */
const cotaMidiaWired = /var TETO_MIDIA = \d+;/.test(page)
  && /\bnMidia = 0\b/.test(page)
  /* o {0,400} deixa passar o comentário do ramo, mas não deixa passar o ramo SEM a guarda:
     o que a régua exige é a adjacência balde -> teto -> incremento, não o texto ao redor. */
  && /\} else if \(erroIgnoravel\(mFinal\)\) \{[\s\S]{0,400}?if \(nMidia >= TETO_MIDIA\) return null;\s*\n\s*nMidia\+\+;/.test(page)
  && /if \(nEnviados >= TETO_SESSAO\) return null;/.test(page);

const checks = [
  ['EP1', extensionFixtures.every((fixture) => classify(fixture) === 'externo'), 'esquemas de extensão são externos'],
  ['EP2', crossOriginFixtures.every((fixture) => classify(fixture) === 'externo'), 'scripts cross-origin são externos'],
  ['EP3', internalFixtures.every((fixture) => classify(fixture) === 'codigo'), 'same-origin e mensagens sem assinatura opaca continuam acionáveis'],
  ['EP9', opaqueFixtures.every((fixture) => classify(fixture) === 'externo')
    && classify({ source: `${own}/js/main.js:1:1`, stack: '', message: 'uncaught exception: undefined' }) === 'codigo'
    && classify({ source: '', stack: `at boom (${own}/js/game.js:9:9)`, message: 'Script error.' }) === 'codigo', 'assinatura opaca sem pilha e sem source é externa, mas filename/stack same-origin mantêm código'],
  ['EP7', externalCacheFixtures.every((fixture) => classify(fixture) === 'externo')
    && classify({ source: `${own}/js/main.js`, stack: 'at chrome-extension://abc/inpage.js', message: 'boom' }) === 'codigo'
    && classify({ message: 'prod-coherence reprovou' }) === 'cache-split', 'proveniência externa vence cache-split e origem própria vence evidência secundária'],
  ['EP8', recoverableFixtures.every((fixture) => classify(fixture) === 'recuperavel')
    && classify({ source: `${own}/js/game.js:1:2`, message: 'boom' }) === 'codigo'
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('recuperavel') === false
    && shouldDispatchCrash('codigo') === true, 'aviso recuperável de textura fica na telemetria mas não vira bug do jogo'],
  ['EP4', apiWired, 'API grava o erro e o early-return externo é o único corte antes do dispatch único'],
  ['EP5', workflowWired, 'workflow classifica externo sem abrir issue, em nenhum OR da condição'],
  ['EP6', clientBehavior && clientWired, 'cliente executado: mensagem não é proveniência, overlay/cota de externo são separados'],
  ['EP10', vendorFixtures.every((fixture) => classify(fixture) === 'externo')
    && classify({ source: `${own}/js/game.js:1:2`, message: 'boom' }) === 'codigo'
    && vendorBehavior, 'bundles /_vercel/ da Vercel são externos no helper e no cliente; /js/ do jogo continua acionável'],
  ['EP11', ambienteFixtures.every((fixture) => classify(fixture) === 'externo')
    && classify({ source: `${own}/js/glcontext.js:105:1`, message: 'outra falha qualquer de contexto' }) === 'codigo',
    'sem_webgl é ambiente (browser sem WebGL, painel do BUG-44 já tratou): externo, sem issue; falha de contexto FORA da assinatura continua acionável'],
  ['EP12', receitaBate && aceitaCoerente && caminhoRealLongo && recusaForjado && fingerprintWired,
    'fingerprint conferido contra o conteúdo que veio junto: a receita reproduz os publicados em #379/#380/#381, o corpo REAL do cliente (inclusive mensagem acima de 500) continua escalando, e o forjado da #383 é gravado sob chave derivada sem escalar'],
  ['EP13', logFixtures.every((f) => log(f) === true)
    && naoLogFixtures.every((f) => log(f) === false)
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('log') === false && shouldDispatchCrash('codigo') === true
    && hookAchaPilha && cotaConsoleWired && logWired && sinalDeliberadoTemPilha,
    'console.error com string fica na telemetria e não abre issue; console COM pilha (o idioma `console.error(msg, e)` de main.js) continua escalando, e log tem cota própria'],
  ['EP14', midiaFixtures.every((fixture) => classify(fixture) === 'recuperavel')
    && naoMidiaFixtures.every((fixture) => classify(fixture) === 'codigo')
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('recuperavel') === false
    && midiaCliente && cotaMidiaWired,
    'abort de mídia (play() cortado por pause(), #389) é recuperável: fica na telemetria, não abre issue e tem cota própria no cliente; crash real dentro do módulo de áudio continua acionável'],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [id, ok, description] of checks) console.log(`${ok ? '\x1b[32m✓' : '\x1b[31m✗'} ${id} ${description}\x1b[0m`);
if (mutant && !mutationApplied) failed.push(['MUT', false, `mutação ${mutant} não alterou o fonte`]);
const mutantClause = {
  'sem-extensao': 'EP1', 'sem-cross-origin': 'EP2', 'filtro-amplo': 'EP3',
  'sem-api': 'EP4', 'sem-early-return': 'EP4',
  'sem-workflow': 'EP5', 'abre-externo': 'EP5',
  'sem-cliente': 'EP6', 'cliente-mensagem-url': 'EP6', 'sem-teto-externo': 'EP6', 'debug-externo': 'EP6',
  'console-sem-origem': 'EP6',
  'cache-antes-origem': 'EP7', 'sem-webgl': 'EP11',
  'sem-recuperavel': 'EP8',
  'sem-opaco': 'EP9', 'opaco-sem-guarda': 'EP9',
  'sem-vercel-helper': 'EP10', 'sem-vercel-cliente': 'EP10',
  'sem-fingerprint': 'EP12', 'escala-incoerente': 'EP12', 'grava-forjado': 'EP12',
  'receita-imul': 'EP12', 'cliente-hash-bruto': 'EP12', 'cliente-sem-retrim': 'EP12',
  'sem-log': 'EP13', 'log-amplo': 'EP13', 'log-sobre-tudo': 'EP13',
  'log-nao-corta': 'EP13', 'sem-teto-console': 'EP13', 'pilha-so-no-primeiro': 'EP13', 'times-sem-erro': 'EP13',
  'sem-midia': 'EP14', 'midia-ampla': 'EP14', 'sem-cota-midia': 'EP14',
};
if (mutant && !failed.some(([id]) => id === mutantClause[mutant])) {
  failed.push(['MUT', false, `mutação ${mutant} não acendeu ${mutantClause[mutant]}`]);
}
if (failed.length) {
  console.error(`\x1b[31mERROR-PROVENANCE ${failed.length} VERMELHA(S)${mutant ? ` (mutante=${mutant})` : ''}\x1b[0m`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mERROR-PROVENANCE verde: externo fica bruto, não vira bug do jogo\x1b[0m');
}
