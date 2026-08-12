/* Erro externo continua no console e no banco, mas não vira crash do jogo. */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const mutants = [
  'sem-extensao', 'sem-cross-origin', 'filtro-amplo',
  'sem-api', 'sem-early-return',
  'sem-workflow', 'abre-externo',
  'sem-cliente', 'cliente-mensagem-url', 'sem-teto-externo', 'debug-externo', 'console-sem-origem',
  'cache-antes-origem',
];
if (mutant && !mutants.includes(mutant)) throw new Error(`mutante desconhecido: ${mutant}`);

const helperPath = 'src/lib/error-provenance.mjs';
const cliPath = 'scripts/classify-crash.mjs';
let helperSource = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : '';
let api = readFileSync('src/pages/api/jserror.ts', 'utf8');
let workflow = readFileSync('.github/workflows/crash-fix.yml', 'utf8');
let page = readFileSync('src/pages/index.astro', 'utf8');
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
  "if (!shouldDispatchCrash(classification))",
  "if (!neverDispatchCrash(classification))");
if (mutant === 'sem-early-return') api = mutate(api,
  'if (!shouldDispatchCrash(classification)) return json({ ok: true, escalated: false, classification });',
  'if (!shouldDispatchCrash(classification)) { /* externo segue para dispatch */ }');
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
if (mutant === 'cache-antes-origem') helperSource = mutate(helperSource,
  "if (isExternalCrash(payload, ownOrigin)) return 'externo';\n  if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';",
  "if (CACHE_SPLIT_RE.test(evidence)) return 'cache-split';\n  if (isExternalCrash(payload, ownOrigin)) return 'externo';");

let classifyCrash = null;
if (helperSource) {
  try {
    const encoded = Buffer.from(helperSource).toString('base64');
    ({ classifyCrash } = await import(`data:text/javascript;base64,${encoded}`));
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
const internalFixtures = [
  { source: `${own}/js/game.js:1:2`, stack: `${own}/js/main.js:3:4`, message: 'boom' },
  { source: '', stack: '', message: 'Script error.' },
  { source: null, stack: null, message: 'uncaught exception: undefined' },
  { source: `${own}/js/main.js:1:2`, stack: 'Error at chrome-extension://abc/inpage.js:2:3', message: 'boom' },
  { source: '', stack: `Error at ${own}/js/main.js:3:4\n at chrome-extension://abc/inpage.js:2:3`, message: 'boom' },
  { message: 'falha ao carregar https://cdn.example.invalid/data' },
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
const externalIndex = api.indexOf('if (!shouldDispatchCrash(classification))');
const dispatchIndex = api.indexOf('const dispatchToken');
const dispatchFetches = (api.match(/api\.github\.com\/repos/g) || []).length;
const apiWired = api.includes("from '../../lib/error-provenance.mjs'")
  && api.includes('shouldDispatchCrash')
  && /if \(!shouldDispatchCrash\(classification\)\)\s*return json\(\{ ok: true, escalated: false, classification \}\);/.test(api)
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

const checks = [
  ['EP1', extensionFixtures.every((fixture) => classify(fixture) === 'externo'), 'esquemas de extensão são externos'],
  ['EP2', crossOriginFixtures.every((fixture) => classify(fixture) === 'externo'), 'scripts cross-origin são externos'],
  ['EP3', internalFixtures.every((fixture) => classify(fixture) === 'codigo'), 'same-origin e sinais opacos continuam acionáveis'],
  ['EP7', externalCacheFixtures.every((fixture) => classify(fixture) === 'externo')
    && classify({ source: `${own}/js/main.js`, stack: 'at chrome-extension://abc/inpage.js', message: 'boom' }) === 'codigo'
    && classify({ message: 'prod-coherence reprovou' }) === 'cache-split', 'proveniência externa vence cache-split e origem própria vence evidência secundária'],
  ['EP4', apiWired, 'API grava o erro e o early-return externo é o único corte antes do dispatch único'],
  ['EP5', workflowWired, 'workflow classifica externo sem abrir issue, em nenhum OR da condição'],
  ['EP6', clientBehavior && clientWired, 'cliente executado: mensagem não é proveniência, overlay/cota de externo são separados'],
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
  'cache-antes-origem': 'EP7',
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
