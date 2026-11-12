#!/usr/bin/env node
/* Ambiente do CI antes do veredito: exit 78 (EX_CONFIG) significa "não mediu".
   Uso: node scripts/ci-local.mjs [--setup|--diagnose|--selftest] [script-npm] */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, constants, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SAIDA_AMBIENTE = 78;
const NODE_CI = 22;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(RAIZ);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const NPM_CI = pkg.packageManager?.split('@')[1] || '';
const PW_CI = lock.packages?.['node_modules/playwright']?.version || '';
if (!NPM_CI || !PW_CI) throw new Error('packageManager npm e Playwright do lock são obrigatórios');

function bibliotecasAusentes(texto) {
  return [...new Set(String(texto).split('\n')
    .map((linha) => linha.match(/^\s*(\S+)\s+=>\s+not found\s*$/)?.[1])
    .filter(Boolean))];
}

function erroNativoNavegador(texto) {
  return /error while loading shared libraries|Host system is missing dependencies|missing dependencies|ERR_DLOPEN_FAILED/i.test(String(texto));
}

function ambienteFilho(base, chromeBin) {
  return { ...base, CHROME_BIN: chromeBin };
}

function executa(cmd, args, opcoes = {}) {
  const r = spawnSync(cmd, args, { cwd: RAIZ, stdio: 'inherit', ...opcoes });
  if (r.error) console.error(`[ambiente] ${cmd}: ${r.error.message}`);
  return r.status ?? 1;
}

function captura(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function versaoLocal(nome) {
  try { return JSON.parse(readFileSync(path.join('node_modules', nome, 'package.json'), 'utf8')).version; }
  catch { return ''; }
}

const NPM_LS_ARGS = [
  'ls', '--all', '--json', '--long', '--offline',
  '--include=prod', '--include=dev', '--include=optional', '--include=peer',
];

function falhasArvoreDependencias(r) {
  const falhas = [];
  if (r.error) falhas.push(`npm ls não executou: ${r.error.message}`);
  if (r.status !== 0) falhas.push(`npm ls terminou com status ${r.status ?? 'desconhecido'}`);

  let arvore;
  try { arvore = JSON.parse(r.stdout || ''); }
  catch {
    const detalhe = String(r.stderr || '').trim().slice(0, 800);
    falhas.push(`npm ls não produziu JSON válido${detalhe ? `: ${detalhe}` : ''}`);
    return falhas;
  }
  if (!arvore || typeof arvore !== 'object' || Array.isArray(arvore)) {
    falhas.push('npm ls produziu uma árvore JSON inválida');
    return falhas;
  }
  if (arvore.problems !== undefined && !Array.isArray(arvore.problems)) {
    falhas.push('npm ls produziu uma lista de problemas inválida');
  } else {
    for (const problema of arvore.problems || []) falhas.push(`npm: ${problema}`);
  }
  if (!arvore.dependencies || typeof arvore.dependencies !== 'object' || Array.isArray(arvore.dependencies)) {
    falhas.push('npm ls não produziu a árvore completa de dependências');
    return [...new Set(falhas)];
  }

  function percorrer(dependencias) {
    for (const [nome, item] of Object.entries(dependencias)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        falhas.push(`npm ls produziu um registro inválido para ${nome}`);
        continue;
      }
      // Dependência opcional ausente aparece como um objeto vazio.
      if (Object.keys(item).length === 0) continue;
      if (item.missing) falhas.push(`dependência ausente: ${nome}`);
      if (item.invalid) falhas.push(`dependência inválida: ${nome} (${item.invalid})`);
      if (item.extraneous) falhas.push(`dependência não declarada (extraneous): ${nome}`);
      if (typeof item.version !== 'string' || !item.version || typeof item.path !== 'string' || !path.isAbsolute(item.path)) {
        if (!item.missing) falhas.push(`npm ls não informou versão e caminho válidos para ${nome}`);
      } else {
        const local = path.relative(RAIZ, item.path).split(path.sep).join('/');
        const travado = lock.packages?.[local];
        if (!travado) {
          falhas.push(`${nome}@${item.version} instalado em ${local} não consta no package-lock`);
        } else if (travado.version !== item.version) {
          falhas.push(`${local}: instalado ${item.version}, package-lock exige ${travado.version || 'sem versão'}`);
        }
      }
      if (item.dependencies !== undefined) {
        if (!item.dependencies || typeof item.dependencies !== 'object' || Array.isArray(item.dependencies)) {
          falhas.push(`npm ls produziu dependências filhas inválidas para ${nome}`);
        } else {
          percorrer(item.dependencies);
        }
      }
    }
  }
  percorrer(arvore.dependencies);
  return [...new Set(falhas)];
}

function validarDependencias(problemas) {
  const falhas = falhasArvoreDependencias(captura('npm', NPM_LS_ARGS));
  const depsOk = falhas.length === 0;
  console.log(`  ${depsOk ? '✓' : '✗'} árvore completa de dependências conferida com package-lock (offline)`);
  if (!depsOk) {
    for (const falha of falhas.slice(0, 8)) console.error(`    ${falha}`);
    if (falhas.length > 8) console.error(`    … e mais ${falhas.length - 8} problema(s) de dependências`);
    problemas.push('dependências ausentes, inválidas ou divergentes do package-lock; rode `node scripts/ci-local.mjs --setup`');
  }
  return depsOk;
}

function validarRuntime(problemas) {
  const nodeOk = process.versions.node.split('.')[0] === String(NODE_CI);
  console.log(`  ${nodeOk ? '✓' : '✗'} Node ${process.versions.node} (CI: ${NODE_CI}.x)`);
  if (!nodeOk) problemas.push(`Node ${NODE_CI} é obrigatório; abra o Dev Container ou instale a versão do CI`);
  const r = captura('npm', ['--version']);
  const npm = r.status === 0 ? r.stdout.trim() : '';
  const npmOk = npm === NPM_CI;
  console.log(`  ${npmOk ? '✓' : '✗'} npm ${npm || 'não encontrado'} (packageManager: ${NPM_CI})`);
  if (!npmOk) problemas.push(`npm ${NPM_CI} é obrigatório; o Dev Container instala a versão de packageManager`);
}

async function diagnosticar() {
  console.log('\nCI-ENV: diagnóstico do ambiente (nenhum teste executado ainda)');
  const problemas = [];
  validarRuntime(problemas);

  validarDependencias(problemas);

  const pwLocal = versaoLocal('playwright');

  let chromium;
  try {
    const modulo = await import(pathToFileURL(path.join(RAIZ, 'node_modules', 'playwright', 'index.js')).href);
    chromium = modulo.chromium || modulo.default?.chromium;
  } catch { /* diagnosticado abaixo sem transformar import ausente em falha de teste */ }
  const localOk = pwLocal === PW_CI && !!chromium;
  console.log(`  ${localOk ? '✓' : '✗'} Playwright local ${pwLocal || 'não encontrado'} (lock: ${PW_CI})`);
  if (!localOk) problemas.push(`Playwright local ${PW_CI} ausente; rode \`node scripts/ci-local.mjs --setup\``);

  let chromeBin = process.env.CHROME_BIN || '';
  if (chromium) {
    try { if (!chromeBin) chromeBin = chromium.executablePath(); }
    catch (e) { problemas.push(`Chromium não resolveu: ${e.message}`); }
  }
  let chromeOk = false;
  if (chromeBin) {
    try { accessSync(chromeBin, constants.X_OK); chromeOk = true; } catch { /* reportado abaixo */ }
  }
  console.log(`  ${chromeOk ? '✓' : '✗'} CHROME_BIN ${chromeBin || 'não resolveu'}`);
  if (!chromeOk) problemas.push('Chromium ausente ou não executável; rode `node scripts/ci-local.mjs --setup`');

  let nativasOk = chromeOk;
  if (chromeOk && process.platform === 'linux') {
    const ldd = captura('ldd', [chromeBin]);
    const ausentes = bibliotecasAusentes(`${ldd.stdout}${ldd.stderr}`);
    nativasOk = ausentes.length === 0;
    console.log(`  ${nativasOk ? '✓' : '✗'} bibliotecas nativas do Chromium${ausentes.length ? `: ${ausentes.join(', ')}` : ''}`);
    if (ausentes.length) problemas.push(`bibliotecas nativas ausentes (${ausentes.join(', ')}); rode \`node scripts/ci-local.mjs --setup-system\` com privilégio para instalar os pacotes do sistema`);
  }

  if (chromeOk && chromium && nativasOk) {
    try {
      const browser = await chromium.launch({ executablePath: chromeBin, headless: true, timeout: 15_000 });
      await browser.close();
      console.log('  ✓ Chromium abriu e fechou sem executar uma régua');
    } catch (e) {
      const detalhe = String(e.message || e).slice(0, 1600);
      const nativo = erroNativoNavegador(detalhe);
      console.error(`  ✗ Chromium não abriu (${nativo ? 'dependência nativa/sistema' : 'configuração de processo'})\n${detalhe}`);
      problemas.push(`Chromium não abriu; ${nativo ? 'instale as dependências nativas com `node scripts/ci-local.mjs --setup-system`' : 'corrija a configuração antes de rodar testes'}`);
    }
  }

  if (problemas.length) {
    console.error(`\n⊘ SKIP CI-ENV não medido: ${problemas.length} problema(s) de ambiente`);
    for (const p of problemas) console.error(`  - ${p}`);
    console.error('Nenhuma falha acima é veredito de teste.');
  } else {
    console.log(`\nCI-ENV ok. Para terminais já abertos: export CHROME_BIN=${JSON.stringify(chromeBin)}`);
  }
  return { ok: problemas.length === 0, chromeBin };
}

async function preparar() {
  const runtime = [];
  validarRuntime(runtime);
  if (runtime.length) {
    for (const p of runtime) console.error(`  - ${p}`);
    return SAIDA_AMBIENTE;
  }
  let status = executa(process.execPath, ['scripts/setup.mjs']);
  if (status) return SAIDA_AMBIENTE;
  const cli = path.join(RAIZ, 'node_modules', 'playwright', 'cli.js');
  status = executa(process.execPath, [cli, 'install', 'chromium']);
  if (status) return SAIDA_AMBIENTE;
  return (await diagnosticar()).ok ? 0 : SAIDA_AMBIENTE;
}

async function prepararSistema() {
  const runtime = [];
  validarRuntime(runtime);
  if (runtime.length) {
    for (const p of runtime) console.error(`  - ${p}`);
    return SAIDA_AMBIENTE;
  }
  const cli = path.join(RAIZ, 'node_modules', 'playwright', 'cli.js');
  return executa(process.execPath, [cli, 'install-deps', 'chromium']);
}

function selftest() {
  assert.deepEqual(bibliotecasAusentes('\tlibatk-1.0.so.0 => not found\nlibx.so => /lib/libx.so (0x1)\nlibatk-1.0.so.0 => not found'), ['libatk-1.0.so.0']);
  assert.equal(erroNativoNavegador('error while loading shared libraries: libnss3.so'), true);
  assert.equal(erroNativoNavegador('Expected button to be visible'), false);
  const env = ambienteFilho({ PATH: '/bin' }, '/opt/chrome');
  assert.equal(env.CHROME_BIN, '/opt/chrome');
  assert.equal('PREPUSH' in env, false);
  assert.equal(ambienteFilho({ PREPUSH: '1' }, '/opt/chrome').PREPUSH, '1');
  assert.equal(lock.packages['node_modules/playwright'].version, PW_CI);
  assert.equal(lock.packages['node_modules/playwright-core'].version, PW_CI);
  assert(NPM_LS_ARGS.includes('--all') && NPM_LS_ARGS.includes('--offline'));

  const arvoreComPlaywright = (versaoCore) => JSON.stringify({
    name: pkg.name,
    dependencies: {
      playwright: {
        version: PW_CI,
        path: path.join(RAIZ, 'node_modules', 'playwright'),
        dependencies: {
          'playwright-core': {
            version: versaoCore,
            path: path.join(RAIZ, 'node_modules', 'playwright-core'),
          },
        },
      },
    },
  });
  assert.deepEqual(falhasArvoreDependencias({ status: 0, stdout: arvoreComPlaywright(PW_CI) }), []);
  const transitivaDefasada = falhasArvoreDependencias({ status: 0, stdout: arvoreComPlaywright('0.0.0') });
  assert(transitivaDefasada.some((f) => f.includes('playwright-core') && f.includes(PW_CI)),
    'transitiva defasada deve falhar mesmo com Playwright igual ao lock');
  const ausente = JSON.parse(arvoreComPlaywright(PW_CI));
  ausente.problems = ['missing: exemplo@1.0.0, required by dependente@1.0.0'];
  assert(falhasArvoreDependencias({ status: 1, stdout: JSON.stringify(ausente) }).some((f) => f.includes('missing:')));
  assert(falhasArvoreDependencias({ status: 0, stdout: '{json quebrado' }).some((f) => f.includes('JSON válido')));
  console.log('CI-ENV selftest ok: parsing nativo, ambiente filho e árvore completa de dependências cobertos.');
  for (const modo of ['--diagnose', '--selftest']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), modo, 'check:fast'], { encoding: 'utf8' });
    assert.equal(r.status, 64, `${modo} com script extra deve ser rejeitado em vez de ignorar o script`);
  }
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const modo = ['--selftest', '--setup', '--setup-system', '--diagnose'].find((flag) => args.includes(flag));
  if (modo) {
    if (args.length !== 1) {
      console.error('Uso: node scripts/ci-local.mjs [--setup|--setup-system|--diagnose|--selftest] [script-npm]');
      return 64;
    }
    if (modo === '--selftest') return selftest();
    if (modo === '--setup') return preparar();
    if (modo === '--setup-system') return prepararSistema();
    return (await diagnosticar()).ok ? 0 : SAIDA_AMBIENTE;
  }
  if (args.some((a) => a.startsWith('-')) || args.length > 1) {
    console.error('Uso: node scripts/ci-local.mjs [--setup|--diagnose|--selftest] [script-npm]');
    return 64;
  }
  const script = args[0] || 'check:fast';
  if (!pkg.scripts?.[script]) {
    console.error(`[ambiente] script npm inexistente: ${script}`);
    return 64;
  }
  const diag = await diagnosticar();
  if (!diag.ok) return SAIDA_AMBIENTE;
  console.log(`\n[testes] npm run ${script}`);
  const status = executa('npm', ['run', script], { env: ambienteFilho(process.env, diag.chromeBin) });
  if (status) console.error(`[testes] ${script} terminou com ${status}; o ambiente já havia passado no diagnóstico.`);
  return status;
}

process.exitCode = await main();
