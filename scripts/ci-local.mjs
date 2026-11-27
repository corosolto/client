#!/usr/bin/env node
/* Ambiente do CI antes do veredito: exit 78 (EX_CONFIG) significa "não mediu".
   Uso: node scripts/ci-local.mjs [--setup|--setup-system|--diagnose|--selftest] [script-pnpm] */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SAIDA_AMBIENTE = 78;
const USO = 'Uso: node scripts/ci-local.mjs [--setup|--setup-system|--diagnose|--selftest] [script-pnpm]';
const NODE_CI = 22;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(RAIZ);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const TEXTO_LOCK = readFileSync('pnpm-lock.yaml', 'utf8');
const PNPM_CI = pkg.packageManager?.split('@')[1] || '';
const PW_CI = versaoImportador('playwright');
if (!PNPM_CI || !PW_CI) throw new Error('packageManager pnpm e Playwright do lock são obrigatórios');

/* pnpm-lock.yaml v9: o bloco `importers:` declara, por dependência direta da raiz,
   `specifier` e a `version` resolvida (com sufixo de peers que descartamos). As
   seções `packages:`/`snapshots:` listam todo grafo permitido como `nome@versão`.
   É contra esse inventário que a árvore instalada é conferida — sem reparsed YAML
   além do necessário. */
function blocoImportadores(texto = TEXTO_LOCK) {
  const linhas = texto.split('\n');
  const ini = linhas.indexOf('importers:');
  const fim = linhas.findIndex((l) => l === 'packages:' || l === 'snapshots:');
  if (ini === -1 || fim === -1 || fim < ini) throw new Error('pnpm-lock.yaml sem bloco importers');
  return linhas.slice(ini + 1, fim);
}

function versaoImportador(nome, linhas = blocoImportadores()) {
  for (let i = 0; i < linhas.length; i++) {
    const casamento = /^ {6}(?:'([^']+)'|([^':]+)):$/.exec(linhas[i]);
    if (!casamento || (casamento[1] ?? casamento[2]) !== nome) continue;
    const versao = linhas.slice(i + 1, i + 6)
      .map((l) => /^ {8}version: (.+)$/.exec(l)?.[1])
      .find(Boolean);
    return versao ? versao.split('(')[0] : '';
  }
  return '';
}

function importadores(linhas = blocoImportadores()) {
  const nomes = {};
  for (let i = 0; i < linhas.length; i++) {
    const casamento = /^ {6}(?:'([^']+)'|([^':]+)):$/.exec(linhas[i]);
    const nome = casamento && (casamento[1] ?? casamento[2]);
    if (!nome) continue;
    const versao = linhas.slice(i + 1, i + 6)
      .map((l) => /^ {8}version: (.+)$/.exec(l)?.[1])
      .find(Boolean);
    if (versao) nomes[nome] = versao.split('(')[0];
  }
  return nomes;
}

function chavesSnapshots(texto = TEXTO_LOCK) {
  const chaves = new Set();
  let dentro = false;
  for (const linha of texto.split('\n')) {
    if (!linha.trim()) continue;
    if (linha[0] !== ' ') { dentro = linha === 'packages:' || linha === 'snapshots:'; continue; }
    if (!dentro) continue;
    const casamento = /^ {2}(?:'([^']+)'|([^'\s:]+)):$/.exec(linha);
    if (casamento) chaves.add(casamento[1] ?? casamento[2]);
  }
  return chaves;
}

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

function mesmoArquivo(a, b) {
  try { return realpathSync(a) === realpathSync(b); }
  catch { return false; }
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

function versaoPacote(caminho) {
  try { return JSON.parse(readFileSync(path.join(caminho, 'package.json'), 'utf8')).version; }
  catch { return ''; }
}

function versaoLocal(nome) {
  return versaoPacote(path.join('node_modules', nome));
}

const PNPM_LS_ARGS = ['ls', '--json', '--depth', 'Infinity'];

function falhasLockOculto(raiz = RAIZ) {
  const oculto = path.join(raiz, 'node_modules', '.pnpm', 'lock.yaml');
  const congelado = path.join(raiz, 'pnpm-lock.yaml');
  if (!existsSync(congelado)) return ['pnpm-lock.yaml ausente — rode `node scripts/ci-local.mjs --setup`'];
  if (!existsSync(oculto)) {
    return ['node_modules/.pnpm/lock.yaml ausente — a árvore instalada não registra o estado do lock; rode `node scripts/ci-local.mjs --setup`'];
  }
  if (!readFileSync(oculto).equals(readFileSync(congelado))) {
    return ['node_modules/.pnpm/lock.yaml diverge de pnpm-lock.yaml — a árvore instalada não corresponde ao lock congelado; rode `node scripts/ci-local.mjs --setup`'];
  }
  return [];
}

function inspecionarShimThree(raiz = RAIZ) {
  try {
    const modules = path.join(raiz, 'node_modules');
    const shim = path.join(modules, 'three');
    if (!lstatSync(shim).isSymbolicLink()) return '';
    const stage = realpathSync(shim);
    if (path.dirname(stage) !== realpathSync(modules) || !path.basename(stage).startsWith('.cs-three-node-')) return '';
    if (!lstatSync(stage).isDirectory()) return '';
    const meta = JSON.parse(readFileSync(path.join(stage, 'package.json'), 'utf8'));
    if (meta.name !== 'three' || meta.version !== '0.160.0' || meta.type !== 'module' || meta.main !== 'index.js'
      || meta.exports?.['.'] !== './index.js' || meta.exports?.['./addons/*'] !== './addons/*') return '';
    const vendor = path.join(raiz, 'public', 'vendor');
    if (realpathSync(path.join(stage, 'index.js')) !== realpathSync(path.join(vendor, 'three.module.js'))) return '';
    if (realpathSync(path.join(stage, 'addons')) !== realpathSync(path.join(vendor, 'addons'))) return '';
    return stage;
  } catch { return ''; }
}

/* Confere a árvore instalada (pnpm ls --json) contra o inventário derivado do
   pnpm-lock.yaml: todo pacote instalado precisa existir como snapshot
   `nome@versão` do lock, toda dependência direta precisa estar presente na
   versão exata do importador e nada além delas (exceto o shim vendido do Three)
   pode estar na raiz. Falha fechada: qualquer divergência reprova. */
function falhasEstadoInstalado(ls, chaves, destinoShim) {
  if (Array.isArray(ls) && ls.length === 1) ls = ls[0];
  const registro = (item) => item && typeof item === 'object' && !Array.isArray(item);
  const grupos = ['dependencies', 'devDependencies', 'optionalDependencies'];
  if (!registro(ls) || grupos.some((g) => ls[g] !== undefined && !registro(ls[g]))) {
    return ['pnpm ls não produziu a árvore completa de dependências'];
  }
  const falhas = [];
  const raiz = { ...ls.dependencies, ...ls.devDependencies, ...ls.optionalDependencies };
  const chavesBase = new Set([...chaves].map((k) => k.split('(')[0]));
  const aceitarShim = destinoShim === undefined ? inspecionarShimThree() : destinoShim;
  const esperados = importadores();
  function percorrer(dependencias, topo = false) {
    for (const [nome, item] of Object.entries(dependencias)) {
      if (topo && nome === 'three' && aceitarShim) continue;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        falhas.push(`pnpm ls produziu um registro inválido para ${nome}`);
        continue;
      }
      if (typeof item.version !== 'string' || !item.version) {
        falhas.push(`pnpm ls não informou versão válida para ${nome}`);
        continue;
      }
      const chave = `${nome}@${item.version}`;
      if (!chavesBase.has(chave)) falhas.push(`${chave} instalado não consta no pnpm-lock.yaml`);
      if (item.dependencies !== undefined) {
        if (!item.dependencies || typeof item.dependencies !== 'object' || Array.isArray(item.dependencies)) {
          falhas.push(`pnpm ls produziu dependências filhas inválidas para ${nome}`);
        } else {
          percorrer(item.dependencies);
        }
      }
    }
  }
  percorrer(raiz, true);
  for (const [nome, versao] of Object.entries(esperados)) {
    if (!Object.hasOwn(raiz, nome)) {
      falhas.push(`dependência ausente: ${nome}`);
    } else if (raiz[nome].version !== versao) {
      falhas.push(`${nome}: instalado ${raiz[nome].version}, pnpm-lock.yaml exige ${versao}`);
    }
  }
  for (const nome of Object.keys(raiz)) {
    if (esperados[nome] === undefined && !(nome === 'three' && aceitarShim)) {
      falhas.push(`dependência não declarada (extraneous): ${nome}`);
    }
  }
  return [...new Set(falhas)];
}

function falhasModulosDiretos(raiz = RAIZ) {
  const modules = path.join(raiz, 'node_modules');
  const esperados = importadores();
  const falhas = [];
  if (!existsSync(modules)) return ['node_modules ausente'];
  for (const nome of Object.keys(esperados)) {
    const instalado = versaoPacote(path.join(modules, nome));
    if (instalado !== esperados[nome]) falhas.push(`${nome}: link local ausente ou versão diferente do lock`);
  }
  for (const entrada of readdirSync(modules)) {
    if (entrada.startsWith('.')) continue;
    if (entrada === 'three' && inspecionarShimThree(raiz)) continue;
    const nomes = entrada.startsWith('@') ? readdirSync(path.join(modules, entrada)).map((nome) => `${entrada}/${nome}`) : [entrada];
    for (const nome of nomes) {
      if (!Object.hasOwn(esperados, nome)) falhas.push(`dependência não declarada (extraneous): ${nome}`);
    }
  }
  return falhas;
}

function validarDependencias(problemas) {
  const falhas = [...falhasLockOculto()];
  if (!falhas.length) {
    const r = captura('pnpm', PNPM_LS_ARGS);
    if (r.error) {
      falhas.push(`pnpm ls não executou: ${r.error.message}`);
    } else if (r.status !== 0) {
      const detalhe = String(r.stderr || '').trim().slice(0, 800);
      falhas.push(`pnpm ls terminou com status ${r.status}${detalhe ? `: ${detalhe}` : ''}`);
    } else {
      let arvore;
      try { arvore = JSON.parse(r.stdout || ''); }
      catch {
        falhas.push(`pnpm ls não produziu JSON válido${String(r.stderr || '').trim() ? `: ${String(r.stderr).trim().slice(0, 300)}` : ''}`);
      }
      if (arvore) falhas.push(...falhasEstadoInstalado(arvore, chavesSnapshots()));
      falhas.push(...falhasModulosDiretos());
    }
  }
  const depsOk = falhas.length === 0;
  console.log(`  ${depsOk ? '✓' : '✗'} árvore instalada conferida com pnpm-lock.yaml (grafo e versões derivados do lock)`);
  if (!depsOk) {
    for (const falha of falhas.slice(0, 8)) console.error(`    ${falha}`);
    if (falhas.length > 8) console.error(`    … e mais ${falhas.length - 8} problema(s) de dependências`);
    problemas.push('dependências ausentes, inválidas ou divergentes do pnpm-lock.yaml; rode `node scripts/ci-local.mjs --setup`');
  }
  return depsOk;
}

function validarRuntime(problemas) {
  const nodeOk = process.versions.node.split('.')[0] === String(NODE_CI);
  console.log(`  ${nodeOk ? '✓' : '✗'} Node ${process.versions.node} (CI: ${NODE_CI}.x)`);
  if (!nodeOk) problemas.push(`Node ${NODE_CI} é obrigatório; abra o Dev Container ou instale a versão do CI`);
  const r = captura('pnpm', ['--version']);
  const pnpm = r.status === 0 ? r.stdout.trim() : '';
  const pnpmOk = pnpm === PNPM_CI;
  console.log(`  ${pnpmOk ? '✓' : '✗'} pnpm ${pnpm || 'não encontrado'} (packageManager: pnpm@${PNPM_CI})`);
  if (!pnpmOk) problemas.push(`pnpm ${PNPM_CI} é obrigatório; o Dev Container instala a versão de packageManager`);
}

async function diagnosticar() {
  console.log('\nCI-ENV: diagnóstico do ambiente (nenhum teste executado ainda)');
  const problemas = [];
  validarRuntime(problemas);

  validarDependencias(problemas);

  const pwLocal = versaoLocal('playwright');
  const localOk = pwLocal === PW_CI;
  console.log(`  ${localOk ? '✓' : '✗'} Playwright local ${pwLocal || 'não encontrado'} (lock: ${PW_CI})`);
  if (!localOk) problemas.push(`Playwright local ${PW_CI} ausente; rode \`node scripts/ci-local.mjs --setup\``);

  let chromium;
  try {
    const modulo = await import(pathToFileURL(path.join(RAIZ, 'node_modules', 'playwright', 'index.js')).href);
    chromium = modulo.chromium || modulo.default?.chromium;
  } catch { /* diagnosticado abaixo sem transformar import ausente em falha de teste */ }
  const importOk = pwLocal === PW_CI && !!chromium;
  console.log(`  ${importOk ? '✓' : '✗'} Playwright local importável e na versão do lock (${PW_CI})`);
  if (!importOk) problemas.push(`Playwright ${PW_CI} não importável de node_modules; rode \`node scripts/ci-local.mjs --setup\``);

  let chromeBin = '';
  if (chromium) {
    try { chromeBin = chromium.executablePath(); }
    catch (e) { problemas.push(`Chromium não resolveu: ${e.message}`); }
  }
  const chromeConfigurado = process.env.CHROME_BIN || '';
  const chromeCoerente = !chromeConfigurado || (!!chromeBin && mesmoArquivo(chromeConfigurado, chromeBin));
  console.log(`  ${chromeCoerente ? '✓' : '✗'} CHROME_BIN ${chromeConfigurado || chromeBin || 'não resolveu'}`);
  if (!chromeCoerente) problemas.push(`CHROME_BIN não aponta para o Chromium do Playwright ${PW_CI}; remova a sobrescrita ou aponte para ${chromeBin}`);
  let chromeOk = false;
  if (chromeBin) {
    try { accessSync(chromeBin, constants.X_OK); chromeOk = true; } catch { /* reportado abaixo */ }
  }
  console.log(`  ${chromeOk ? '✓' : '✗'} Chromium ${chromeBin || 'não resolveu'}`);
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
      problemas.push(`Chromium não abriu; ${nativo ? (process.platform === 'linux' ? 'instale as dependências nativas com `node scripts/ci-local.mjs --setup-system`' : 'instale as dependências nativas exigidas pelo Chromium para este sistema') : 'corrija a configuração antes de rodar testes'}`);
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

async function prepararSistema(plataforma = process.platform, executar = executa, validar = validarRuntime) {
  if (plataforma !== 'linux') {
    console.error('[ambiente] --setup-system está disponível apenas no Linux; instale as dependências nativas exigidas pelo Chromium para este sistema');
    return SAIDA_AMBIENTE;
  }
  const runtime = [];
  validar(runtime);
  if (runtime.length) {
    for (const p of runtime) console.error(`  - ${p}`);
    return SAIDA_AMBIENTE;
  }
  const cli = path.join(RAIZ, 'node_modules', 'playwright', 'cli.js');
  return executar(process.execPath, [cli, 'install-deps', 'chromium']) === 0 ? 0 : SAIDA_AMBIENTE;
}

async function selftest() {
  assert.equal(await prepararSistema('darwin'), SAIDA_AMBIENTE);
  assert.equal(await prepararSistema('linux', () => 1, () => {}), SAIDA_AMBIENTE);
  assert.equal(await prepararSistema('linux', () => 0, () => {}), 0);
  assert.deepEqual(bibliotecasAusentes('\tlibatk-1.0.so.0 => not found\nlibx.so => /lib/libx.so (0x1)\nlibatk-1.0.so.0 => not found'), ['libatk-1.0.so.0']);
  assert.equal(erroNativoNavegador('error while loading shared libraries: libnss3.so'), true);
  assert.equal(erroNativoNavegador('Expected button to be visible'), false);
  const env = ambienteFilho({ PATH: '/bin' }, '/opt/chrome');
  assert.equal(env.CHROME_BIN, '/opt/chrome');
  assert.equal('PREPUSH' in env, false);
  assert.equal(ambienteFilho({ PREPUSH: '1' }, '/opt/chrome').PREPUSH, '1');
  assert.equal(mesmoArquivo(process.execPath, process.execPath), true);
  assert.equal(mesmoArquivo(process.execPath, fileURLToPath(import.meta.url)), false);
  assert.equal(mesmoArquivo(process.execPath, path.join(RAIZ, 'nao-existe')), false);
  assert.ok([...chavesSnapshots()].some((k) => k.startsWith(`playwright@${PW_CI}`)));
  assert.equal(importadores()['playwright'], PW_CI);
  assert.equal(versaoImportador('playwright'), PW_CI);
  assert.equal(versaoImportador('pacote-fora-do-lock'), '');

  const dirLock = mkdtempSync(path.join(tmpdir(), 'cs-ci-local-lock-'));
  try {
    writeFileSync(path.join(dirLock, 'pnpm-lock.yaml'), 'lockfileVersion: \'9.0\'\n');
    mkdirSync(path.join(dirLock, 'node_modules', '.pnpm'), { recursive: true });
    const oculto = path.join(dirLock, 'node_modules', '.pnpm', 'lock.yaml');
    assert.deepEqual(falhasLockOculto(dirLock), ['node_modules/.pnpm/lock.yaml ausente — a árvore instalada não registra o estado do lock; rode `node scripts/ci-local.mjs --setup`']);
    writeFileSync(oculto, 'lockfileVersion: \'9.0\'\n');
    assert.deepEqual(falhasLockOculto(dirLock), []);
    writeFileSync(oculto, 'lockfileVersion: \'9.1\'\n');
    assert.deepEqual(falhasLockOculto(dirLock).length, 1);
    assert.match(falhasLockOculto(dirLock)[0], /diverge de pnpm-lock\.yaml/);
    rmSync(path.join(dirLock, 'pnpm-lock.yaml'));
    assert.match(falhasLockOculto(dirLock)[0], /pnpm-lock\.yaml ausente/);
  } finally { rmSync(dirLock, { recursive: true, force: true }); }

  const chaves = chavesSnapshots();
  const arvoreConforme = () => [{
    dependencies: Object.fromEntries(Object.keys(pkg.dependencies).map((nome) => [nome, { version: versaoImportador(nome) }])),
    devDependencies: Object.fromEntries(Object.keys(pkg.devDependencies).map((nome) => [nome, {
      version: versaoImportador(nome),
      ...(nome === 'playwright' ? { dependencies: { 'playwright-core': { version: PW_CI } } } : {}),
    }])),
  }];
  assert.deepEqual(falhasEstadoInstalado(arvoreConforme(), chaves, ''), []);
  const arvoreCoreDefasado = arvoreConforme();
  arvoreCoreDefasado[0].devDependencies.playwright.dependencies['playwright-core'].version = '0.0.0';
  const defasada = falhasEstadoInstalado(arvoreCoreDefasado, chaves, '');
  assert(defasada.some((f) => f.includes('playwright-core') && f.includes('não consta no pnpm-lock.yaml')),
    'transitiva defasada deve falhar mesmo com Playwright igual ao lock');
  const raizSolta = arvoreConforme();
  raizSolta[0].dependencies['pacote-soltinho'] = { version: '1.0.0' };
  assert(falhasEstadoInstalado(raizSolta, chaves, '').some((f) => f.includes('extraneous') || f.includes('não consta no pnpm-lock.yaml')));
  const semPlaywright = arvoreConforme();
  delete semPlaywright[0].devDependencies.playwright;
  assert(falhasEstadoInstalado(semPlaywright, chaves, '').some((f) => f.includes('dependência ausente: playwright')));
  const comThree = arvoreConforme();
  comThree[0].dependencies.three = { version: '0.160.0' };
  assert(falhasEstadoInstalado(comThree, chaves, '').some((f) => f.includes('three')));
  const stageThree = path.join(RAIZ, 'node_modules', '.cs-three-node-teste');
  assert.deepEqual(falhasEstadoInstalado(comThree, chaves, stageThree), []);
  assert.equal(falhasEstadoInstalado(null, chaves, '').length, 1);

  const fixture = mkdtempSync(path.join(tmpdir(), 'cs-ci-local-shim-'));
  try {
    const stage = path.join(fixture, 'node_modules', '.cs-three-node-teste');
    const shim = path.join(fixture, 'node_modules', 'three');
    const vendor = path.join(fixture, 'public', 'vendor');
    mkdirSync(stage, { recursive: true });
    mkdirSync(path.join(vendor, 'addons'), { recursive: true });
    writeFileSync(path.join(vendor, 'three.module.js'), 'export const Mesh = null;\n');
    writeFileSync(path.join(vendor, 'addons', 'loader.js'), 'export {};\n');
    writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
      name: 'three', version: '0.160.0', type: 'module', main: 'index.js',
      exports: { '.': './index.js', './addons/*': './addons/*' },
    }));
    const ligaIndex = () => symlinkSync(path.join(vendor, 'three.module.js'), path.join(stage, 'index.js'));
    const ligaAddons = () => symlinkSync(path.join(vendor, 'addons'), path.join(stage, 'addons'), 'dir');
    ligaIndex();
    ligaAddons();
    symlinkSync(stage, shim, 'dir');
    assert.equal(inspecionarShimThree(fixture), realpathSync(stage));

    rmSync(path.join(stage, 'index.js'));
    symlinkSync(path.join(stage, 'package.json'), path.join(stage, 'index.js'));
    assert.equal(inspecionarShimThree(fixture), '');
    rmSync(path.join(stage, 'index.js'));
    ligaIndex();

    rmSync(path.join(stage, 'addons'));
    symlinkSync(path.join(stage, 'package.json'), path.join(stage, 'addons'), 'dir');
    assert.equal(inspecionarShimThree(fixture), '');
    rmSync(path.join(stage, 'addons'));
    ligaAddons();

    rmSync(shim);
    mkdirSync(shim);
    assert.equal(inspecionarShimThree(fixture), '');
  } finally { rmSync(fixture, { recursive: true, force: true }); }
  console.log('CI-ENV selftest ok: pnpm do packageManager, lock congelado vs. árvore instalada, Chromium fixado e shim do Three cobertos.');
  for (const modo of ['--diagnose', '--selftest']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), modo, 'check:fast'], { encoding: 'utf8' });
    assert.equal(r.status, 64, `${modo} com script extra deve ser rejeitado em vez de ignorar o script`);
  }
  const desconhecido = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--setup-syste'], { encoding: 'utf8' });
  assert.equal(desconhecido.status, 64);
  assert.match(desconhecido.stderr, /--setup-system/);
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const modo = ['--selftest', '--setup', '--setup-system', '--diagnose'].find((flag) => args.includes(flag));
  if (modo) {
    if (args.length !== 1) {
      console.error(USO);
      return 64;
    }
    if (modo === '--selftest') return selftest();
    if (modo === '--setup') return preparar();
    if (modo === '--setup-system') return prepararSistema();
    return (await diagnosticar()).ok ? 0 : SAIDA_AMBIENTE;
  }
  if (args.some((a) => a.startsWith('-')) || args.length > 1) {
    console.error(USO);
    return 64;
  }
  const script = args[0] || 'check:fast';
  if (!pkg.scripts?.[script]) {
    console.error(`[ambiente] script pnpm inexistente: ${script}`);
    return 64;
  }
  const diag = await diagnosticar();
  if (!diag.ok) return SAIDA_AMBIENTE;
  console.log(`\n[testes] pnpm run ${script}`);
  const status = executa('pnpm', ['run', '--silent', script], { env: ambienteFilho(process.env, diag.chromeBin) });
  if (status) console.error(`[testes] ${script} terminou com ${status}; o ambiente já havia passado no diagnóstico.`);
  return status;
}

process.exitCode = await main();
