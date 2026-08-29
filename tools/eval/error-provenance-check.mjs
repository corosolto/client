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
  'onerror-sem-src', 'boot-sem-migalha', 'payload-sem-migalhas', 'issue-sem-migalhas',
  'sem-midia', 'midia-ampla', 'sem-cota-midia',
  'cache-sem-binding', 'cache-so-ingles', 'cache-sem-especificador',
  'sem-ponte', 'ponte-ampla', 'ponte-insensivel', 'sem-ponte-cliente', 'jogo-com-ponte',
  'sem-webglstate', 'webglstate-amplo',
  'sem-capacidade', 'capacidade-ampla', 'lock-sem-catch',
  'sem-contexto', 'contexto-amplo', 'fail-no-contexto',
];
if (mutant && !mutants.includes(mutant)) throw new Error(`mutante desconhecido: ${mutant}`);

const helperPath = 'src/lib/error-provenance.mjs';
const cliPath = 'scripts/classify-crash.mjs';
let helperSource = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : '';
let api = readFileSync('src/pages/api/jserror.ts', 'utf8');
let workflow = readFileSync('.github/workflows/crash-fix.yml', 'utf8');
let page = readFileSync('src/pages/index.astro', 'utf8');
let gameJs = readFileSync('public/js/game.js', 'utf8');
let mainJs = readFileSync('public/js/main.js', 'utf8');
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
/* Redações por engine do MESMO split (#443/#362): cada mutante apaga UMA alternativa do
   CACHE_SPLIT_RE e a EP16 tem que morder — senão a redação entrou na regex sem régua. */
if (mutant === 'cache-sem-binding') helperSource = mutate(helperSource,
  'Importing binding name|', '');
if (mutant === 'cache-so-ingles') helperSource = mutate(helperSource,
  'era um especificador simples, mas não foi remapeado|', '');
if (mutant === 'cache-sem-especificador') helperSource = mutate(helperSource,
  'Failed to resolve module specifier|', '');
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

/* BUG-75 · ponte injetada por navegador/WebView/extensão (#428/#379/#380/#381). Os cinco
   mutantes cobrem os cinco jeitos de o corte deixar de valer: sumir do helper, ficar LARGO a
   ponto de engolir global NOSSO, perder a sensibilidade a caixa, sumir do cliente (que é onde
   a cota e o painel de falha são decididos) e a invariante de honestidade nunca poder acender. */
if (mutant === 'sem-ponte') helperSource = mutate(helperSource,
  'if (PONTE_INJETADA_RE.test(evidence)) return true;',
  'if (PONTE_INJETADA_RE.test(evidence)) return false;');
/* O corte largo é a armadilha REAL desta família, e ela tem nome: sete globais do JOGO são
   dunder (`__GEO_LANG__`, `__CS_MAIN_FAILED`, `__SUPPORT`…). `__\w+__` calaria crash nosso. */
if (mutant === 'ponte-ampla') helperSource = mutate(helperSource,
  'const PONTE_INJETADA_RE = ',
  'const PONTE_INJETADA_RE = /__\\w+__|reader|webkit/i; const PONTE_INJETADA_RE_ESTREITO = ');
/* Identificador JS é sensível a caixa e a mensagem o cita verbatim: com `i`, `darkreader.glb`
   num texto nosso viraria externo. É a divergência deliberada em relação à MEDIA_ABORT_RE. */
if (mutant === 'ponte-insensivel') helperSource = mutate(helperSource,
  '|webkit\\.messageHandlers)\\b/;',
  '|webkit\\.messageHandlers)\\b/i;');
if (mutant === 'sem-ponte-cliente') page = mutate(page,
  "if (injetado.test(sourceText + '\\n' + String(stack || '') + '\\n' + String(mensagem || ''))) return false;",
  'if (false) return false;');
/* A invariante de honestidade tem que PODER ficar vermelha: o dia em que o jogo falar com a
   ponte. O `jogoSemPonte` lê o fonte MUTADO por isso — régua que ninguém quebra não mede. */
if (mutant === 'jogo-com-ponte') page = mutate(page,
  'window.__gameLaunch = lancamento;',
  "window.__gameLaunch = lancamento; window.__gCrWeb.postMessage('ping');");

/* BUG-81 · a redação do WebKit sai da RECOVERABLE_RE e o aviso que o three ENGOLIU volta
   a escalar como bug do jogo. */
if (mutant === 'sem-webglstate') helperSource = mutate(helperSource,
  "|THREE\\.WebGLState: Type error", '');
/* O corte largo: qualquer `THREE.WebGLState:` vira recuperável — inclusive `Invalid
   blending`, que é constante inválida NOSSA e não erro engolido do driver. */
if (mutant === 'webglstate-amplo') helperSource = mutate(helperSource,
  'THREE\\.WebGLState: Type error/i', 'THREE\\.WebGLState:/i');
/* BUG-80 · sem o ramo, a rejeição de capacidade volta a escalar. */
if (mutant === 'sem-capacidade') helperSource = mutate(helperSource,
  "if (CAPACIDADE_RE.test(evidence)) return 'recuperavel';",
  "if (CAPACIDADE_RE.test(evidence)) return 'codigo';");
/* O corte largo: `is not available` solto engole crash de verdade que apenas CITA a frase. */
if (mutant === 'capacidade-ampla') helperSource = mutate(helperSource,
  '/screen\\.orientation\\.lock\\(\\) is not available on this device/i',
  '/is not available/i');
/* O conserto REAL da #431/#432: sem o catch, a promessa do `lock()` volta a virar
   unhandledrejection e a derrubar o launch da partida. */
if (mutant === 'lock-sem-catch') mainJs = mutate(mainJs,
  "screen.orientation?.lock?.('landscape')?.catch?.(() => {})",
  "screen.orientation?.lock?.('landscape')");

/* BUG-74 · o `onerror` da tag do módulo guardava um booleano e jogava fora o ErrorEvent,
   inclusive o `src` com o `?v=`. O relatório virava paráfrase nossa, sem evidência nenhuma. */
if (mutant === 'onerror-sem-src') page = mutate(page,
  'onerror="window.__CS_MAIN_FAILED=1;window.__CS_BOOT_SRC=this.src"',
  'onerror="window.__CS_MAIN_FAILED=1"');
if (mutant === 'boot-sem-migalha') page = mutate(page,
  "            migalha('boot falhou src=' + (window.__CS_BOOT_SRC || '?'));\n", '');
if (mutant === 'payload-sem-migalhas') api = mutate(api,
  'client_payload: { fingerprint: chave, message, source, stack, origin, breadcrumbs,',
  'client_payload: { fingerprint: chave, message, source, stack, origin,');
if (mutant === 'issue-sem-migalhas') workflow = mutate(workflow,
  '**Migalhas:**', '**Migalhas removidas:**');

/* BUG-75 · perda de contexto no meio do frame (#419/#420). Os três jeitos de o corte deixar
   de valer: sumir do helper, ficar LARGO a ponto de engolir a perda persistente deliberada
   ('contexto WebGL perdido'), e o launch voltar a cair no painel pela corrida. */
if (mutant === 'sem-contexto') helperSource = mutate(helperSource,
  "if (CONTEXT_LOSS_RE.test(evidence)) return 'recuperavel';",
  "if (CONTEXT_LOSS_RE.test(evidence)) return 'codigo';");
if (mutant === 'contexto-amplo') helperSource = mutate(helperSource,
  'const CONTEXT_LOSS_RE = ',
  'const CONTEXT_LOSS_RE = /WebGL/i; const CONTEXT_LOSS_RE_ESTREITA = ');
if (mutant === 'fail-no-contexto') page = mutate(page,
  'if (lancamento.ativo && interna && !erroDeContexto(String(msg))) lancamento.fail(',
  'if (lancamento.ativo && interna) lancamento.fail(');

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
  /* BUG-81 · issue #465, PUBLICADA: `console.error` que o PRÓPRIO three emite de dentro do
     `try/catch` do `WebGLState` (`vendor/three.module.js:23761`, e mais 9 irmãos `tex*` entre
     `:23650` e `:23785`). O quadro TERMINOU — a pilha veio pelo argumento `Error` que o hook
     do `console.error` lê (`index.astro:411`), e é ela que faz o corte do BUG-72 não pegar.
     `fp` é o hash de `console|<message>|` e a cláusula EP8 confere. */
  { fp: 'c2d5e2c2', kind: 'console', source: '', message: 'THREE.WebGLState: Type error',
    stack: `texImage2D@[native code]\ntexImage2D@${own}/vendor/three.module.js:23766:23\nupdate@${own}/js/loading3d.js:146:25` },
];
/* O corte é ESTREITO: exige o prefixo `THREE.WebGLState:` E a redação do WebKit. Estas três
   seguem `codigo` — a 1ª é a que trava a decisão, porque é a ÚNICA outra mensagem com esse
   prefixo no bundle (`three.module.js:23345` e `:23371`) e é constante inválida NOSSA, não
   erro engolido do driver. A redação do Chrome nunca foi observada e fica de fora por
   decisão, não por medição: sem dado de campo, ela continua acionável. */
const naoRecuperavelFixtures = [
  { source: '', stack: '', message: 'THREE.WebGLState: Invalid blending:  201' },
  { source: '', stack: '', message: "THREE.WebGLState: TypeError: Failed to execute 'texImage2D' on 'WebGL2RenderingContext'" },
  { source: `${own}/vendor/three.module.js:29975:29`, stack: '', message: "TypeError: undefined is not an object (evaluating 'material.map.source')" },
];
/* BUG-80 · issues #431 e #432, PUBLICADAS e da MESMA sessão (as migalhas são idênticas, das
   01:54 às 01:55). Uma causa, duas fingerprints: a #432 é a rejeição crua (`index.astro:346`)
   e a #431 é a mesma frase com o prefixo do `lancamento.fail()` (`:285`) — a forma da
   #419/#420. Chegam sem stack e sem source, então o rótulo TEM que sair da mensagem. */
const capacidadeFixtures = [
  { fp: 'df013498', kind: 'promise', source: '', stack: '', message: 'screen.orientation.lock() is not available on this device.' },
  { fp: '342e306c', kind: 'error', source: 'promise', stack: '', message: 'Falha ao abrir partida: screen.orientation.lock() is not available on this device.' },
];
/* O corte não pode ser largo: `is not available` solto engole crash de verdade que apenas
   CITA a frase — a 1ª é o mutante `capacidade-ampla` em forma de fixture. */
const naoCapacidadeFixtures = [
  { source: `${own}/js/audio.js:31:5`, stack: '', message: "TypeError: 'AudioContext' is not available in this context" },
  { source: `${own}/js/main.js:1034:7`, stack: '', message: 'TypeError: document.documentElement.requestFullscreen is not a function' },
  { source: '', stack: '', message: 'screen.orientation.lock() failed because the page is not fullscreen' },
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
/* BUG-75 · ponte injetada por navegador/WebView/extensão no mundo da página (issues #428,
   #379, #380 e #381; as irmãs #138 e #166 são a mesma ideia, mas traziam `chrome-extension://`
   e já caíam na EXTENSION_RE).
   PROCEDÊNCIA: as QUATRO primeiras são o payload PUBLICADO nas issues, campo por campo — o
   fingerprint de cada uma é o hash EXATO de `error|<message>|<source>`, e é isso que a
   cláusula confere abaixo. O WebKit reporta o script injetado como frame único `global code@`
   com o filename da PRÓPRIA PÁGINA: same-origin, e por isso o atalho de origem acusava o jogo. */
const injetadoFixtures = [
  { fp: 'd85ae7e1', source: `${own}/:1:9`,  stack: `global code@${own}/:1:9`,  message: "ReferenceError: Can't find variable: __gCrWeb" },
  { fp: '470752a2', source: `${own}/:1:12`, stack: `global code@${own}/:1:12`, message: "ReferenceError: Can't find variable: __firefox__" },
  { fp: '7122f83c', source: `${own}/:1:19`, stack: `global code@${own}/:1:19`, message: "TypeError: undefined is not an object (evaluating 'window.__firefox__.reader')" },
  { fp: 'cd468274', source: `${own}/:1:11`, stack: `global code@${own}/:1:11`, message: "ReferenceError: Can't find variable: DarkReader" },
  /* SINTÉTICAS, e marcadas como tal (sem `fp`, porque nunca abriram issue): a próxima ponte
     não deve precisar de PR. O corte é por FAMÍLIA e não uma regex por incidente — a crítica
     que a BUG-72 fez ao padrão antigo. Misturar sintético com publicado é justo o vetor de
     "fixture arrumada" que o EP12 existe para pegar, por isso o `fp` é que separa os dois. */
  { source: `${own}/:1:23`, stack: `global code@${own}/:1:23`, message: "TypeError: undefined is not an object (evaluating 'webkit.messageHandlers.cs.postMessage')" },
  { source: `${own}/:1:15`, stack: `global code@${own}/:1:15`, message: "ReferenceError: Can't find variable: __gCrWebForms" },
];
/* O corte é ESTREITO: exige o NOME do global de terceiro, e a caixa dele. Estas sete
   continuam `codigo`, e as duas primeiras são as que travam a decisão de cortar por NOME e
   não por FORMA: têm a MESMA forma da família (raiz do documento, frame único `global code@`)
   com global NOSSO. A linha 1 do `dist/client/index.html` tem 268 chars e o nosso primeiro
   `<script is:inline>` começa na coluna 167 dela — `:1:N` NÃO é prova de terceiro. */
const naoInjetadoFixtures = [
  { source: `${own}/:1:9`,  stack: `global code@${own}/:1:9`,  message: "TypeError: undefined is not an object (evaluating 'window.__game.start')" },
  { source: `${own}/:1:167`, stack: `global code@${own}/:1:167`, message: "TypeError: undefined is not an object (evaluating 'window.__SUPPORT.br')" },
  { source: `${own}/js/glcontext.js:12:3`, stack: '', message: "TypeError: undefined is not an object (evaluating 'window.__webglTentativa.push')" },
  /* o MESMO idioma de mensagem da #428, com global nosso: a forma da frase não é proveniência. */
  { source: `${own}/js/main.js:1:2`, stack: '', message: "ReferenceError: Can't find variable: __GEO_LANG__" },
  /* caixa baixa: `DarkReader` só vale como IDENTIFICADOR (mutante `ponte-insensivel`). */
  { source: `${own}/js/game.js:1:2`, stack: '', message: 'falha ao carregar darkreader.glb' },
  /* `webkit` solto NÃO foi comprado, e este é o preço de ter comprado `webkit.messageHandlers`:
     o jogo usa `window.webkitAudioContext` de verdade (audio.js). */
  { source: `${own}/js/audio.js:1:2`, stack: '', message: "TypeError: undefined is not an object (evaluating 'window.webkitAudioContext')" },
  { source: '', stack: '', message: "TypeError: undefined is not an object (evaluating 'window.__CS_MAIN_FAILED')" },
];
/* INVARIANTE DE HONESTIDADE. O corte acima só é legítimo porque o jogo NÃO fala com ponte
   nenhuma: no dia em que alguém escrever `window.DarkReader` de verdade, esta cláusula fica
   VERMELHA e obriga a revisar o corte, em vez de ele virar mordaça silenciosa sobre código
   nosso. Varre pela forma de USO (`window.X`, `X.`, `X(`, `X =`) e NÃO pelo nome solto: o
   literal da própria regex traz os nomes, e nome solto deixaria a cláusula vermelha desde o
   primeiro dia — foi de graça na BUG-51 porque lá o nome vem prefixado, aqui não vem.
   Lê o fonte MUTADO do `index.astro` e do helper: sem isso nenhum mutante consegue acendê-la,
   e régua que ninguém pode quebrar não mede nada. O escopo é o JOGO (`src/`, `public/js/`) e
   não `tools/`: as fixtures desta régua carregam o payload da #428 de propósito. PONTO CEGO
   DECLARADO: `public/vendor/` (three vendorizado) fica fora, igual ao resto das réguas daqui. */
const USO_DE_PONTE = /(?:window|globalThis|self)\.(?:__gCrWeb|__firefox__|DarkReader|__REACT_DEVTOOLS_GLOBAL_HOOK__|__VUE_DEVTOOLS_GLOBAL_HOOK__)|\b(?:__gCrWeb|__firefox__|DarkReader|__REACT_DEVTOOLS_GLOBAL_HOOK__|__VUE_DEVTOOLS_GLOBAL_HOOK__)\s*[.(=]|webkit\.messageHandlers/;
const fontesDoJogo = spawnSync('git', ['ls-files', 'src', 'public/js'], { encoding: 'utf8' })
  .stdout.split('\n').filter((f) => /\.(?:m?js|ts|astro)$/.test(f));
const textoDoJogo = (f) => {
  if (f === 'src/pages/index.astro') return page;
  if (f === helperPath) return helperSource;
  if (f === 'public/js/main.js') return mainJs;
  if (f === 'public/js/game.js') return gameJs;
  try { return readFileSync(f, 'utf8'); } catch { return ''; }
};
const jogoSemPonte = fontesDoJogo.length > 0 && fontesDoJogo.every((f) => !USO_DE_PONTE.test(textoDoJogo(f)));
const externalCacheFixtures = [
  { source: 'chrome-extension://abc/inpage.js:1:2', message: 'does not provide an export' },
  { source: 'https://cdn.example.invalid/chunk.js:1:2', message: 'Failed to fetch dynamically imported module' },
  { source: 'moz-extension://abc/inpage.js:1:2', message: 'Importing a module script failed' },
  { stack: 'Error at safari-web-extension://abc/app.js:1:2', message: 'error loading dynamically imported module' },
  { source: 'https://static.cloudflareinsights.com/beacon.js:1:2', message: 'prod-coherence reprovou' },
  { source: 'chrome-extension://abc/inpage.js:1:2', message: "Importing binding name 'x' is not found." },
];
/* O split do BUG-39 nas redações que a regex NÃO conhecia (#443/#362): WebKit para export
   ausente (a alpha.138 nem continha `resolveGeoLang` — o erro só existe na interseção de
   dois deploys no edge) e bare specifier sem import map nas quatro redações conhecidas — a
   da #362 chegou em pt-BR, traduzida pelo Firefox do jogador. Todas viram purge, não issue.
   As duas primeiras e a da #362 são as mensagens LITERAIS publicadas nas issues. */
const cacheSplitFixtures = [
  { source: '', stack: '', message: "SyntaxError: Importing binding name 'resolveGeoLang' is not found." },
  { source: '', stack: '', message: "SyntaxError: Importing binding name 'default' cannot be resolved by star export entries." },
  { source: `${own}/js/main.js?v=2.0.0-alpha.157-c722ebcb6f3a:2:24`, message: 'TypeError: O especificador “three” era um especificador simples, mas não foi remapeado para nada. Especificadores de módulo relativos devem começar com “./”, “../” ou “/”.' },
  { message: 'TypeError: The specifier “three” was a bare specifier, but was not remapped to anything. Relative module specifiers must start with “./”, “../” or “/”.' },
  { message: 'TypeError: Failed to resolve module specifier "three". Relative references must start with either "/", "./", or "../".' },
  { message: `TypeError: Module specifier, 'three' does not start with "/", "./", or "../". Referenced from ${own}/js/main.js` },
];
/* O corte continua estreito: crash citando o MESMO símbolo, ou palavra solta das redações,
   segue acionável — purge por engano esconderia bug de código atrás de remediação de cache. */
const naoCacheSplitFixtures = [
  { source: `${own}/js/i18n.js:1:2`, message: "ReferenceError: Can't find variable: resolveGeoLang" },
  { source: '', stack: '', message: 'binding lost' },
  { source: '', stack: '', message: 'invalid module specifier' },
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

/* EP15 · BUG-74 (issue #386). O watchdog de boot relatava "o código do jogo não chegou"
   sem UMA evidência: o `onerror` da tag do módulo (index.astro) descartava o ErrorEvent
   inteiro, `migalha()` só era chamada no clique, e as migalhas gravadas nunca entravam no
   `client_payload`, logo nunca chegavam à issue. Instrumentar, não suprimir.

   A fixture do fingerprint amarra isto à BUG-71: a instrumentação vai para a MIGALHA e não
   para a mensagem, senão o `?v=` criaria fingerprint novo a cada release e picotaria o
   agrupamento. Se alguém mover a evidência para o texto, este número muda e a cláusula cai. */
const MSG_386 = 'Falha ao abrir a arena: o código do jogo não chegou (verifique a conexão)';
const fingerprint386Estavel = typeof crashFingerprint === 'function'
  && crashFingerprint('error', MSG_386, 'boot-watchdog') === '9703f595';

/* O `onerror` guarda o src (o `?v=` distingue CDN sem o módulo de conexão caída). */
const onerrorGuardaSrc = /onerror="window\.__CS_MAIN_FAILED=1;window\.__CS_BOOT_SRC=this\.src"/.test(page)
  && /onload="window\.__CS_MAIN_LOADED=1[^"]*"/.test(page);

/* O ramo do boot-watchdog registra migalha ANTES do fail, senão a evidência não viaja. */
const migalhaIndex = page.indexOf("migalha('boot falhou src=");
const failIndex = page.indexOf("lancamento.fail(erroDoBoot || new Error('o código do jogo não chegou");
const bootMigalha = migalhaIndex >= 0 && failIndex > migalhaIndex
  && page.includes("importmap suportado=")
  && page.includes('rede online=');

/* As migalhas atravessam a API e aparecem na issue: sem os dois elos elas morrem no banco. */
const migalhasNoPayload = /client_payload: \{ fingerprint: chave, message, source, stack, origin, breadcrumbs,/.test(api);
const migalhasNaIssue = workflow.includes('**Migalhas:**') && workflow.includes('$MIGALHAS')
  /* `join` porque breadcrumbs é array: sem ele o corpo sai como [object Object]. */
  && /MIGALHAS: \$\{\{ join\(github\.event\.client_payload\.breadcrumbs/.test(workflow);
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

/* EP17 executa o `origemDoJogo` recortado do fonte com os payloads REAIS, como o EP6 e o EP14
   fazem: regex de fiação sozinha aprovaria `function origemDoJogo(){ return true; }`. É no
   cliente que se decide a cota (`TETO_EXTERNO`), o overlay e — o que mais importa aqui — se o
   erro vira `erroDoBoot`/`lancamento.fail`: hoje uma ponte que estoura durante o boot pode ser
   acusada de ter derrubado o carregamento do jogo. */
const injetadoCliente = !!origemCliente
  && injetadoFixtures.every((f) => origemCliente(f.source, f.stack, f.message) === false)
  /* e o corte NÃO pode cegar o cliente para crash NOSSO: as sete vizinhas seguem internas,
     inclusive as que estouram no script inline da própria página — é ali que mora o código de
     boot do `index.astro`, e cegar isso apagaria o painel de falha. */
  && naoInjetadoFixtures.every((f) => origemCliente(f.source, f.stack, f.message) === true);
/* Nenhuma cota nova: ponte é externo e cai no balde do `TETO_EXTERNO` que a BUG-51 já abriu —
   ao contrário do `TETO_MIDIA`, que a BUG-73 precisou criar. */
const injetadoNoBaldeExterno = /var TETO_EXTERNO = \d+;/.test(page)
  && /if \(nExternos >= TETO_EXTERNO\) return null;/.test(page)
  && /var injetado = \/.*__gCrWeb.*\/;/.test(page);
/* PROCEDÊNCIA: os quatro fingerprints PUBLICADOS nas issues são o hash exato de
   `error|<message>|<source>`. Se algum dia alguém "arrumar" a fixture, o número deixa de bater
   e a cláusula acusa que ela não é mais o que a produção mandou. As sintéticas não têm `fp` e
   por isso não podem se passar por publicadas. */
const injetadoProcede = typeof crashFingerprint === 'function'
  && injetadoFixtures.filter((f) => f.fp).length === 4
  && injetadoFixtures.filter((f) => f.fp).every((f) => crashFingerprint('error', f.message, f.source) === f.fp);

/* PROCEDÊNCIA, mesma trava do EP12 e do EP17: os fingerprints PUBLICADOS nas três issues são
   o hash EXATO de `<kind>|<message>|<source>`. Se alguém "arrumar" a fixture, o número deixa
   de bater e a cláusula acusa que ela não é mais o que a produção mandou. */
const procedeFp = (f) => typeof crashFingerprint === 'function'
  && crashFingerprint(f.kind, f.message, f.source) === f.fp;
const webglStateProcede = recoverableFixtures.filter((f) => f.fp).length === 1
  && recoverableFixtures.filter((f) => f.fp).every(procedeFp);
const capacidadeProcede = capacidadeFixtures.length === 2 && capacidadeFixtures.every(procedeFp);

/* EP18 · BUG-80 (issues #431 e #432). `screen.orientation.lock()` devolve PROMESSA, e a
   rejeição do WebKit ("not available on this device") virava `unhandledrejection`: o handler
   de `index.astro:347` chama `lancamento.fail()`, e a etapa 'partida' (aberta em `main.js:986`
   com janela de 60 s) ainda estava de pé — o jogador via "Falha ao abrir partida" numa partida
   que ia carregar sozinha. O `try/catch` da linha NÃO alcançava: ele pega throw síncrono.

   O corte é na ORIGEM e por FAMÍLIA, não uma regex por incidente: TODA chamada às quatro APIs
   de capacidade que devolvem promessa, em todo o fonte do jogo, nasce com catch COLADO nela.
   Colado, e não "em algum lugar da linha": no `main.js:1037` o `.catch` do `requestFullscreen`
   mora na MESMA linha, e uma cláusula por linha aprovaria o defeito de volta. */
const CHAMADA_DE_CAPACIDADE = /(?:orientation\??\.lock|requestPointerLock|requestFullscreen|exitFullscreen)\??\.?\([^()]*\)/g;
const CATCH_COLADO = /^\s*\??\.?catch\??\.?\(/;
const sitiosDeCapacidade = [];
for (const arquivo of fontesDoJogo) {
  textoDoJogo(arquivo).split('\n').forEach((linha, i) => {
    for (const m of linha.matchAll(CHAMADA_DE_CAPACIDADE)) {
      sitiosDeCapacidade.push({
        arquivo, linha: i + 1, texto: linha.trim(),
        comCatch: CATCH_COLADO.test(linha.slice(m.index + m[0].length)),
      });
    }
  });
}
const semCatch = sitiosDeCapacidade.filter((s) => !s.comCatch);
/* A ÚNICA exceção declarada: o `requestFullscreen` guarda a promessa em `fs` porque a trava de
   orientação depende dela, e os DOIS ramos das duas linhas seguintes a capturam. Sítio novo
   sem catch reprova — é isso que impede a próxima promessa solta de nascer. */
const capacidadeNaOrigem = sitiosDeCapacidade.length >= 5
  && semCatch.length === 1
  && semCatch[0].arquivo === 'public/js/main.js'
  && /^const fs = document\.documentElement\.requestFullscreen\?\.\(\);$/.test(semCatch[0].texto)
  && /\}\)\.catch\(\(\) => \{\}\);\n\s*else fs\?\.catch\?\.\(\(\) => \{\}\);/.test(mainJs);
/* EP19 · BUG-82 (issues #420/#419, WebKit, alpha.176). Perda de contexto WebGL no MEIO do
   frame: `_isContextLost` do three só vira verdade quando o evento DOM chega (assíncrono);
   na janela da corrida createShader() (ocorrência única no vendor) devolve null e
   shaderSource(null,…) lança TypeError — 1 por frame, porque o rAF é a 1ª linha do loop.
   main.js já recupera (forceContextRestore em 0,5/1,5/4 s; WG7 tranca os listeners) e a SL8
   fecha a corrida no vendor; a perda PERSISTENTE continua escalando pela mensagem deliberada
   'contexto WebGL perdido' de main.js — que esta regex NÃO pode casar. */
const SRC_420 = `${own}/vendor/three.module.js:19355:17`;
const STACK_420 = `shaderSource@[native code]\nWebGLShader@${SRC_420}`;
const contextoFixtures = [
  /* a forma crua da #420 (uncaught, window.onerror) e a prefixada da #419 (lancamento.fail) */
  { source: SRC_420, stack: STACK_420, message: "TypeError: Argument 1 ('shader') to WebGL2RenderingContext.shaderSource must be an instance of WebGLShader" },
  { source: SRC_420, stack: STACK_420, message: "Falha ao abrir partida: Argument 1 ('shader') to WebGL2RenderingContext.shaderSource must be an instance of WebGLShader" },
  /* WebGL1 (fallback do glcontext.js) e outro entry point tipado da mesma família */
  { source: '', stack: '', message: "Argument 1 ('shader') to WebGLRenderingContext.compileShader must be an instance of WebGLShader" },
];
/* Vizinhas que continuam `codigo` DE PROPÓSITO (mutante contexto-amplo): o fatal deliberado
   da perda persistente, crash real dentro do vendor, e a forma Chrome nunca observada nas
   crash-auto — largura só entra com dado de campo (molde do BUG-73). */
const naoContextoFixtures = [
  { source: 'webgl-context-lost', stack: '', message: 'Falha ao abrir a arena: contexto WebGL perdido' },
  { source: `${own}/vendor/three.module.js:29975:29`, stack: '', message: "undefined is not an object (evaluating 'material.program')" },
  { source: '', stack: '', message: "Failed to execute 'shaderSource' on 'WebGL2RenderingContext': parameter 1 is not of type 'WebGLShader'." },
];
/* O espelho do cliente EXTRAÍDO e EXECUTADO, como EP6/EP14: regex de fiação sozinha
   aprovaria `function erroDeContexto(){ return true; }`. */
let contextoCliente = null;
const ctxMatch = page.match(/function erroDeContexto\(m\)\{[\s\S]*?\n  \}/);
if (ctxMatch) {
  try { contextoCliente = new Function(`${ctxMatch[0]}\nreturn erroDeContexto;`)(); }
  catch { /* cláusula fica vermelha */ }
}
const contextoClienteOk = !!contextoCliente
  && contextoFixtures.every((f) => contextoCliente(f.message) === true)
  && naoContextoFixtures.every((f) => contextoCliente(f.message) === false);
/* O fail() do launch é segurado SÓ para a corrida: erro de contexto não mata a abertura com
   o restore a 500 ms — o watchdog da etapa e o fatal de 8 s continuam de rede de segurança.
   O reporta() da linha anterior NÃO é suprimido: a linha segue no js_error. */
const failContextoWired = /if \(lancamento\.ativo && interna && !erroDeContexto\(String\(msg\)\)\) lancamento\.fail\(/.test(page)
  && /reporta\('error', msg, loc, e\.error && e\.error\.stack, !interna\);/.test(page);
/* Procedência (molde da EP12): os fingerprints PUBLICADOS nas #420/#419, reproduzidos pela
   receita real — se a família mudar de texto, estes números mudam e a cláusula cai. */
const fingerprintsDaFamilia = typeof crashFingerprint === 'function'
  && crashFingerprint('error', contextoFixtures[0].message, SRC_420) === '645208c8'
  && crashFingerprint('error', contextoFixtures[1].message, SRC_420) === '9e9db234';

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
    && naoRecuperavelFixtures.every((fixture) => classify(fixture) === 'codigo')
    && webglStateProcede
    && classify({ source: `${own}/js/game.js:1:2`, message: 'boom' }) === 'codigo'
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('recuperavel') === false
    && shouldDispatchCrash('codigo') === true,
    'aviso recuperável de textura e o erro que o three ENGOLE no WebGLState (#465) ficam na telemetria mas não viram bug do jogo; `Invalid blending`, que é constante inválida nossa, continua acionável'],
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
  ['EP15', fingerprint386Estavel && onerrorGuardaSrc && bootMigalha
    && migalhasNoPayload && migalhasNaIssue,
    'falha de boot chega com evidência: o onerror guarda o src do módulo, o watchdog registra migalha com import map e rede, e as migalhas atravessam a API até a issue sem mover o fingerprint'],
  ['EP14', midiaFixtures.every((fixture) => classify(fixture) === 'recuperavel')
    && naoMidiaFixtures.every((fixture) => classify(fixture) === 'codigo')
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('recuperavel') === false
    && midiaCliente && cotaMidiaWired,
    'abort de mídia (play() cortado por pause(), #389) é recuperável: fica na telemetria, não abre issue e tem cota própria no cliente; crash real dentro do módulo de áudio continua acionável'],
  ['EP16', cacheSplitFixtures.every((fixture) => classify(fixture) === 'cache-split')
    && naoCacheSplitFixtures.every((fixture) => classify(fixture) === 'codigo')
    && typeof crashFingerprint === 'function'
    /* mesma trava do EP12: a receita tem que reproduzir os fingerprints PUBLICADOS. */
    && crashFingerprint('error', cacheSplitFixtures[0].message, null) === '6b4fb05e'
    && crashFingerprint('error', cacheSplitFixtures[2].message, cacheSplitFixtures[2].source) === '82b4da8e'
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('cache-split') === true,
    'redações do WebKit para export ausente (#443) e de bare specifier sem import map (#362, inclusive pt-BR) são cache-split — purge do edge, não issue; crash citando o mesmo símbolo continua codigo'],
  ['EP17', injetadoFixtures.every((fixture) => classify(fixture) === 'externo')
    && naoInjetadoFixtures.every((fixture) => classify(fixture) === 'codigo')
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('externo') === false
    && injetadoProcede && injetadoCliente && injetadoNoBaldeExterno && jogoSemPonte,
    'ponte injetada por navegador/WebView/extensão (#428/#379/#380/#381) é externa mesmo com filename same-origin e frame único `global code@`: fica na telemetria, não abre issue e cai no balde de externo; crash NOSSO na MESMA forma (window.__game, window.__SUPPORT no script inline da própria página) continua acionável, e o jogo segue sem falar com ponte nenhuma'],
  ['EP18', capacidadeFixtures.every((fixture) => classify(fixture) === 'recuperavel')
    && naoCapacidadeFixtures.every((fixture) => classify(fixture) === 'codigo')
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('recuperavel') === false
    && capacidadeProcede && capacidadeNaOrigem,
    'promessa de capacidade do navegador nasce com catch colado na chamada (#431/#432): a rejeição do orientation.lock não vira unhandledrejection nem derruba o launch, as duas formas de campo ficam na telemetria sem abrir issue, e crash que só CITA "is not available" continua acionável'],
  ['EP19', contextoFixtures.every((fixture) => classify(fixture) === 'recuperavel')
    && naoContextoFixtures.every((fixture) => classify(fixture) === 'codigo')
    && typeof shouldDispatchCrash === 'function'
    && shouldDispatchCrash('recuperavel') === false
    && contextoClienteOk && failContextoWired && fingerprintsDaFamilia,
    'perda de contexto no meio do frame (#419/#420) é recuperável: fica na telemetria, não abre issue nem derruba o launch; a perda persistente (contexto WebGL perdido), crash real no vendor e a forma Chrome não observada continuam acionáveis'],
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
  'onerror-sem-src': 'EP15', 'boot-sem-migalha': 'EP15',
  'payload-sem-migalhas': 'EP15', 'issue-sem-migalhas': 'EP15',
  'sem-midia': 'EP14', 'midia-ampla': 'EP14', 'sem-cota-midia': 'EP14',
  'cache-sem-binding': 'EP16', 'cache-so-ingles': 'EP16', 'cache-sem-especificador': 'EP16',
  'sem-ponte': 'EP17', 'ponte-ampla': 'EP17', 'ponte-insensivel': 'EP17',
  'sem-ponte-cliente': 'EP17', 'jogo-com-ponte': 'EP17',
  'sem-webglstate': 'EP8', 'webglstate-amplo': 'EP8',
  'sem-capacidade': 'EP18', 'capacidade-ampla': 'EP18', 'lock-sem-catch': 'EP18',
  'sem-contexto': 'EP19', 'contexto-amplo': 'EP19', 'fail-no-contexto': 'EP19',
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
