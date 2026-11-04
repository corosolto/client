#!/usr/bin/env node
import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:9326');
const out = option('out', 'artifacts/operacao-flavio');

class EnvironmentUnavailable extends Error {}

const supportedPlatform = (platform) => platform === 'darwin';
const classifyGpuEnvironment = (platform, gpu, webgl2) => {
  if (!supportedPlatform(platform)) return { ok: false, stage: 'platform', reason: 'platform_not_supported' };
  if (webgl2 !== true) return { ok: false, stage: 'webgl2', reason: 'webgl2_unavailable' };
  if (!gpu) return { ok: false, stage: 'gpu', reason: 'gpu_absent' };
  if (/swiftshader|software|llvmpipe/i.test(gpu)) return { ok: false, stage: 'gpu', reason: 'gpu_software' };
  if (!/Apple M4 Pro|Metal/i.test(gpu)) return { ok: false, stage: 'gpu', reason: 'gpu_not_supported' };
  return { ok: true, stage: 'profile' };
};
const instanceOfSafe = (value, type) => {
  try { return value instanceof type; } catch { return false; }
};
const isNativeAssertion = (error) => instanceOfSafe(error, assert.AssertionError);
const exitCodeFor = (error) => (isNativeAssertion(error) ? 1 : 2);
const physicalOutDirectory = (stats) => Boolean(stats && stats.isDirectory() && !stats.isSymbolicLink());
const freshOutState = (stats, entries) => physicalOutDirectory(stats) && Array.isArray(entries) && entries.length === 0;
const sameOutIdentity = (stats, identity) => physicalOutDirectory(stats)
  && stats.dev === identity?.dev && stats.ino === identity?.ino;
let outReservation = null;
const reserveOut = () => {
  let stats;
  try { stats = lstatSync(out); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    mkdirSync(out, { recursive: true });
    stats = lstatSync(out);
  }
  const entries = physicalOutDirectory(stats) ? readdirSync(out) : null;
  if (!freshOutState(stats, entries)) {
    throw new Error(`stage=out reason=out_not_fresh: ${out} deve ser diretorio fisico novo ou vazio do supervisor`);
  }
  outReservation = { dev: stats.dev, ino: stats.ino };
};
const requireOwnedOut = () => {
  if (!outReservation || !sameOutIdentity(lstatSync(out), outReservation)) {
    throw new Error('stage=out reason=out_identity_changed: diretorio nao reservado ou substituido');
  }
};
const runWithCleanup = async (primary, cleanup, afterCleanup = () => {}) => {
  let hasPrimaryError = false, primaryError, hasCleanupFailure = false, cleanupErrors = [];
  try { await primary(); } catch (error) { hasPrimaryError = true; primaryError = error; }
  try { await cleanup(); } catch (error) {
    hasCleanupFailure = true;
    cleanupErrors = Array.isArray(error) ? error : [error];
  }
  if (!hasPrimaryError) {
    try { await afterCleanup(); } catch (error) { hasPrimaryError = true; primaryError = error; }
  }
  const exitCode = hasCleanupFailure ? 2 : (hasPrimaryError ? exitCodeFor(primaryError) : 0);
  return { hasPrimaryError, primaryError, hasCleanupFailure, cleanupErrors, exitCode };
};
const closeResources = async (context, browser) => {
  const closeErrors = [];
  try { await context?.close(); } catch (error) { closeErrors.push(error); }
  try { await browser?.close(); } catch (error) { closeErrors.push(error); }
  if (closeErrors.length) throw closeErrors;
};
const describeThrowable = (error) => {
  const field = (name) => { try { return error?.[name]; } catch { return undefined; } };
  const text = (value) => { try { return String(value); } catch { return '[valor sem representacao textual]'; } };
  const name = field('name'), message = field('message'), stack = field('stack');
  return {
    kind: isNativeAssertion(error) ? 'feature_assert'
      : instanceOfSafe(error, EnvironmentUnavailable) ? 'environment_unavailable' : 'infra',
    type: error === null ? 'null' : typeof error,
    name: typeof name === 'string' ? name : null,
    message: typeof message === 'string' ? message : text(error),
    stack: typeof stack === 'string' ? stack : null,
  };
};
const describeFailure = (outcome) => ({
  hasPrimaryError: outcome.hasPrimaryError,
  primary: outcome.hasPrimaryError ? describeThrowable(outcome.primaryError) : null,
  hasCleanupFailure: outcome.hasCleanupFailure,
  cleanups: outcome.cleanupErrors.map(describeThrowable),
});
const terminalFailureJSON = (outcome, receipt, exitCode) => JSON.stringify({
  ...describeFailure(outcome), receipt, exitCode,
}, null, 2);
const verifyBrowserEvents = (errors, failed) => {
  assert.deepEqual(errors, [], `erros no browser: ${errors.join(' | ')}`);
  const featureFailed = failed.filter(([, url]) => /operacao_flavio|operacao_decola|senador\\.glb/.test(url));
  assert.deepEqual(featureFailed, [], `assets da operação falharam: ${JSON.stringify(featureFailed)}`);
};

if (process.argv.includes('--selftest-env')) {
  const failures = [];
  let cases = 0;
  const check = (condition, label) => { cases++; if (!condition) failures.push(label); };
  const gpu = (...args) => classifyGpuEnvironment(...args);
  check(gpu('darwin', 'Apple M4 Pro (Metal)', true).ok, 'darwin+apple+webgl2 deve ser aceito');
  check(!gpu('darwin', null, true).ok, 'gpu ausente deve ser EnvironmentUnavailable');
  check(!gpu('darwin', 'SwiftShader (software)', true).ok, 'gpu software deve ser EnvironmentUnavailable');
  check(!gpu('darwin', 'Metal via SwiftShader software', true).ok, 'software precede perfil na classificacao');
  check(!gpu('darwin', 'ANGLE (NVIDIA GeForce RTX)', true).ok, 'gpu nao Apple deve ser EnvironmentUnavailable');
  check(!gpu('darwin', 'Apple M4 Pro', false).ok, 'sem WebGL2 deve ser EnvironmentUnavailable');
  check(!gpu('linux', 'Apple M4 Pro', true).ok, 'linux deve ser EnvironmentUnavailable');
  check(!gpu('win32', 'Apple M4 Pro', true).ok, 'windows deve ser EnvironmentUnavailable');
  check(exitCodeFor(new assert.AssertionError({ message: 'mapa' })) === 1, 'assert nativa deve sair 1');
  check(exitCodeFor(Object.assign(new Error('forjada'), { name: 'AssertionError' })) === 2, 'nome forjado deve sair 2');
  check(exitCodeFor(new EnvironmentUnavailable('env')) === 2, 'indisponibilidade deve sair 2');
  check(exitCodeFor(new Error('chrome nao instalado')) === 2, 'infra deve sair 2');
  check(exitCodeFor(null) === 2, 'null lancado deve sair 2');
  check(exitCodeFor('boom') === 2, 'string lancada deve sair 2');
  check(exitCodeFor({ name: 'AssertionError', message: 'forjado' }) === 2, 'objeto plain com nome forjado deve sair 2');
  const native = new assert.AssertionError({ message: 'mapa' });
  const closeContext = new Error('context.close falhou');
  const closeBrowser = new Error('browser.close falhou');
  const combined = await runWithCleanup(() => { throw native; }, () => { throw [closeContext, closeBrowser]; });
  check(combined.exitCode === 2 && combined.primaryError === native && combined.cleanupErrors.length === 2
    && combined.cleanupErrors[0] === closeContext && combined.cleanupErrors[1] === closeBrowser,
  'cleanup failure exige exit 2 mantendo primary nativa e ambos closes independentes');
  const cleanRun = await runWithCleanup(() => {}, () => {});
  check(cleanRun.exitCode === 0 && cleanRun.hasPrimaryError === false && cleanRun.hasCleanupFailure === false
    && cleanRun.cleanupErrors.length === 0, 'sucesso limpo deve sair 0');
  const infraRun = await runWithCleanup(() => { throw new Error('launch falhou'); }, () => {});
  check(infraRun.exitCode === 2 && infraRun.primaryError.message === 'launch falhou', 'infra sem cleanup failure deve sair 2');
  const acquired = { closed: false };
  const setupRun = await runWithCleanup(
    () => { acquired.created = true; throw new Error('newPage falhou'); },
    () => { acquired.closed = true; },
  );
  check(setupRun.exitCode === 2 && acquired.created && acquired.closed, 'falha de setup apos aquisicao deve disparar cleanup');
  for (const value of [null, undefined, false, 0, '']) {
    const caught = await runWithCleanup(() => { throw value; }, () => {});
    check(caught.exitCode === 2 && caught.hasPrimaryError && Object.is(caught.primaryError, value)
      && caught.hasCleanupFailure === false && caught.cleanupErrors.length === 0,
    `throwable falsy ${describeThrowable(value).type}/${describeThrowable(value).message} deve permanecer infra2 no adapter real`);
  }
  const forged = { name: 'AssertionError', message: 'forjada no adapter' };
  const forgedRun = await runWithCleanup(() => { throw forged; }, () => {});
  check(forgedRun.exitCode === 2 && forgedRun.hasPrimaryError && forgedRun.primaryError === forged,
    'nome forjado deve permanecer infra2 no adapter real');
  const nativeRun = await runWithCleanup(() => { throw native; }, () => {});
  check(nativeRun.exitCode === 1 && nativeRun.hasPrimaryError && nativeRun.primaryError === native,
    'assert nativa sem cleanup failure deve permanecer1 no adapter real');
  const lateErrors = [], lateOrder = [];
  const lateRun = await runWithCleanup(
    () => { lateOrder.push('coleta'); },
    () => closeResources({ close: async () => { lateOrder.push('context'); lateErrors.push('erro tardio no close'); } },
      { close: async () => { lateOrder.push('browser'); } }),
    () => { lateOrder.push('veredito'); verifyBrowserEvents(lateErrors, []); },
  );
  check(lateRun.exitCode === 1 && lateRun.hasPrimaryError && isNativeAssertion(lateRun.primaryError)
    && JSON.stringify(lateOrder) === JSON.stringify(['coleta', 'context', 'browser', 'veredito']),
  'erro tardio deve falhar pelo verificador real somente apos ambos closes');
  const closeOrder = [], lateAndCloseErrors = [];
  const closeRun = await runWithCleanup(
    () => {},
    () => closeResources({ close: async () => { closeOrder.push('context'); lateAndCloseErrors.push('tardio'); throw closeContext; } },
      { close: async () => { closeOrder.push('browser'); throw closeBrowser; } }),
    () => verifyBrowserEvents(lateAndCloseErrors, []),
  );
  check(closeRun.exitCode === 2 && closeRun.hasPrimaryError && isNativeAssertion(closeRun.primaryError)
    && closeRun.hasCleanupFailure && closeRun.cleanupErrors[0] === closeContext && closeRun.cleanupErrors[1] === closeBrowser
    && JSON.stringify(closeOrder) === JSON.stringify(['context', 'browser']),
  'ambos closes reais tentados, ambos erros retidos e cleanup2 prevalece sobre assert tardia');
  const falsyClose = await runWithCleanup(() => {}, () => closeResources({ close: async () => { throw null; } }, null));
  check(falsyClose.exitCode === 2 && falsyClose.hasCleanupFailure && falsyClose.cleanupErrors.length === 1
    && falsyClose.cleanupErrors[0] === null, 'erro falsy de close permanece cleanup2');
  // Fixtures de metadados exercem os mesmos predicados da reserva; nao criam diretorios.
  const stats = (directory, symlink, dev = 1, ino = 2) => ({ isDirectory: () => directory, isSymbolicLink: () => symlink, dev, ino });
  check(freshOutState(stats(true, false), []), 'diretorio fisico vazio pode ser reservado');
  check(!freshOutState(stats(true, false), ['01-terminal.png']), 'captura antiga sem receipt deve ser recusada');
  check(!freshOutState(stats(true, false), ['receipt.json']), 'receipt antigo deve ser recusado');
  check(!freshOutState(stats(true, true), []), 'diretorio symlink deve ser recusado');
  check(!freshOutState(stats(false, false), []), 'arquivo regular nao e diretorio de captura');
  check(sameOutIdentity(stats(true, false), { dev: 1, ino: 2 }), 'identidade fisica reservada deve conferir');
  check(!sameOutIdentity(stats(true, false, 1, 3), { dev: 1, ino: 2 }), 'troca de inode invalida ownership');
  const checkUnknownThrowable = async (value, label, reads = null) => {
    const closed = [];
    let valid = false;
    try {
      const caught = await runWithCleanup(() => { throw value; }, () => closeResources(
        { close: async () => { closed.push('context'); } }, { close: async () => { closed.push('browser'); } },
      ));
      const before = reads ? { ...reads } : null;
      const encoded = JSON.parse(terminalFailureJSON(caught, { written: false, reason: 'fixture_cpu_sem_io' }, caught.exitCode));
      const description = encoded.primary;
      valid = caught.hasPrimaryError && Object.is(caught.primaryError, value) && caught.exitCode === 2
        && caught.hasCleanupFailure === false && JSON.stringify(closed) === JSON.stringify(['context', 'browser'])
        && encoded.hasPrimaryError === true && encoded.exitCode === 2 && Number.isFinite(encoded.exitCode)
        && description && description.kind === 'infra' && typeof description.type === 'string'
        && (description.name === null || typeof description.name === 'string')
        && typeof description.message === 'string' && (description.stack === null || typeof description.stack === 'string')
        && (!reads || ['name', 'message', 'stack'].every((key) => reads[key] - before[key] === 1));
    } catch { valid = false; }
    check(valid, label);
  };
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  await checkUnknownThrowable(revoked.proxy, 'Proxy revogado permanece infra2 com cleanup e terminal serializavel');
  await checkUnknownThrowable(new Proxy({}, { getPrototypeOf() { throw new Error('fixture getPrototypeOf'); } }),
    'getPrototypeOf lancador permanece infra2 com cleanup e terminal serializavel');
  for (const variant of ['cyclic', 'bigint']) {
    const reads = { name: 0, message: 0, stack: 0 };
    const value = {};
    value.self = value;
    for (const key of Object.keys(reads)) Object.defineProperty(value, key, { get() {
      reads[key]++;
      return reads[key] % 2 ? `fixture ${key}` : variant === 'cyclic' ? value : 42n;
    } });
    await checkUnknownThrowable(value, `getters alternantes ${variant}: uma leitura/campo e terminal primitivo`, reads);
  }
  if (failures.length) { console.error(JSON.stringify({ selftest: 'env', cases, failures })); process.exit(1); }
  console.log(JSON.stringify({ selftest: 'env', ok: true, cases }));
  process.exit(0);
}

let browser = null, context = null, closed = false, observedGpu = null, stage = 'setup';
let receiptData = null;
const errors = [], failed = [], glbs = [];
const writeReceipt = (value) => {
  requireOwnedOut();
  writeFileSync(`${out}/receipt.json`, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
};
const writeFailureReceipt = (outcome) => {
  if (!outReservation) return { written: false, reason: 'out_not_reserved' };
  try {
    writeReceipt({
      generatedAt: new Date().toISOString(),
      failure: {
        ...describeFailure(outcome), stage, platform: process.platform,
        actualGPU: observedGpu, testExecuted: false, exitCode: outcome.exitCode,
      },
    });
    return { written: true };
  } catch (error) { return { written: false, error: describeThrowable(error) }; }
};
const cleanup = async () => {
  if (closed) return;
  try { await closeResources(context, browser); } finally { closed = true; }
};
const primary = async () => {
  reserveOut();
  if (!supportedPlatform(process.platform)) {
    throw new EnvironmentUnavailable(`stage=platform platform=${process.platform} reason=platform_not_supported: perfil suportado deste ensaio e Mac nativo atual (Apple M4 Pro|Metal + WebGL2)`);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  stage = 'browser';
context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.route(/\.astro\/eval-vite|dev-toolbar/, (route) => route.fulfill({
  contentType: 'text/javascript',
  body: 'export default {};',
}));
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) failed.push([response.status(), response.url()]);
  if (response.status() === 200 && response.url().includes('.glb')) glbs.push(response.url());
});

const views = [
  { id: '01-terminal', camera: [-24, 5.8, -50], target: [-3, 1.4, -27], description: 'fachada, portal, balcões e assentos do terminal sem trilha no chão' },
  { id: '02-seguranca', camera: [0, 1.8, -24], target: [0, 1.35, 3], description: 'scanners Mint, guaritas e coberturas do controle de acesso' },
  { id: '03-hangar', camera: [-10, 4.2, 17], target: [4, 2.2, 39], description: 'equipamentos de manutenção, carga e eixo protegido do hangar' },
  { id: '04-apron', camera: [27, 5.2, 61], target: [0, 2.2, 55], description: 'avião nivelado, balizamento, escada e equipamentos detalhados do pátio' },
];

  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', allyBots: 3, enemyBots: 4, bots: 4, vol: 0, speech: false }));
  });
  stage = 'page';
  await page.goto(`${base}/?debug=1&auto=B,senador&map=operacao_flavio&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(3200);
  await page.addStyleTag({ content: '#crash-overlay,astro-dev-toolbar{display:none!important}' });

  const runtime = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.bots.find((bot) => bot._objectiveNpc === 'flavio');
    const gl = g.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const mintNames = [
      'terminal_fachada', 'terminal_portal', 'balcao_recepcao', 'assentos_aeroporto',
      'scanner_bagagem', 'carro_servico', 'energia_solo', 'torre_iluminacao',
      'barreiras_aeroporto', 'estacao_manutencao', 'containers_carga', 'jardineira',
    ];
    const pointBlocked = (x, z, inflate = 0.46) => g.world.colliders.some((c) => (
      x > c.minX - inflate && x < c.maxX + inflate
      && z > c.minZ - inflate && z < c.maxZ + inflate
      && c.minY < 1.8 && c.maxY > 0.1
    ));
    const blockedRouteSamples = [];
    for (let i = 0; i < g.world.escortPath.length - 1; i++) {
      const a = g.world.escortPath[i], b = g.world.escortPath[i + 1];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15);
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        if (pointBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) {
          blockedRouteSamples.push(i);
          break;
        }
      }
    }
    const weapon = g.player.weapon;
    const visibility = g._vmVisibility || {};
    const authoredEntry = g.vm.authored?.entry?.(weapon);
    return {
      map: g._mapId,
      mode: g.world.mode,
      ctf: g.ctf,
      state: g.state,
      objective: !!g.objective,
      checkpoints: g.world.escortPath?.length || 0,
      vip: vip ? { char: vip.def?.id, name: vip.name, weapon: vip.weapon, primary: vip.primary, secondary: vip.secondary, meshWeapon: vip._meshWeapon, team: vip.team } : null,
      plane: g.world.objectivePlane ? {
        clearance: g.world.objectivePlane.userData.groundClearance,
        groundY: g.world.objectivePlane.userData.groundY,
        height: g.world.objectivePlane.userData.placedHeight,
      } : null,
      signs: g.world.root.children.filter((object) => object.name.startsWith('placa-')).map((object) => object.name),
      mintProps: mintNames.filter((name) => g.world.root.getObjectByName(name)),
      mintPropInstances: g.world.root.children.filter((object) => mintNames.includes(object.name)).length,
      routeMeshCount: g.world.root.children.filter((object) => object.name === 'rota-operacao-flavio').length,
      vm: {
        mode: g.camView,
        root: Boolean(g.vm.root?.visible),
        authored: Boolean(visibility.authored),
        fallback: Boolean(visibility.fallback),
        legacyVisible: Boolean(g.vm.models?.[weapon]?.visible),
        authoredVisible: Boolean(authoredEntry?.mount?.visible),
      },
      nodes: g.world.waypoints.nodes.length,
      colliders: g.world.colliders.length,
      occluders: g.world.occluders.length,
      blockedCheckpoints: (g.world.escortPath || []).flatMap((point, index) => (
        pointBlocked(point.x, point.z) ? [index] : []
      )),
      blockedRouteSamples: [...new Set(blockedRouteSamples)],
      disconnectedRouteSegments: (g.world.escortPath || []).slice(1).flatMap((point, index) => {
        const from = g.world.nearestWaypoint(g.world.escortPath[index].x, g.world.escortPath[index].z);
        const to = g.world.nearestWaypoint(point.x, point.z);
        return from !== to && g.world.findPath(from, to).length <= 1 ? [index] : [];
      }),
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
      webgl2: g.renderer.capabilities.isWebGL2,
      modeLabel: document.getElementById('map-mode')?.textContent,
      objectiveLabel: document.getElementById('escort-objective')?.textContent,
    };
  });
  stage = 'profile';
  observedGpu = runtime.gpu ?? null;
  const profile = classifyGpuEnvironment(process.platform, runtime.gpu, runtime.webgl2);
  if (!profile.ok) {
    throw new EnvironmentUnavailable(`stage=${profile.stage} platform=${process.platform} reason=${profile.reason} gpu=${runtime.gpu ?? null} webgl2=${runtime.webgl2}: ambiente fora do perfil suportado (Apple M4 Pro|Metal + WebGL2), nao e falha do mapa`);
  }
  stage = 'feature';
  assert.equal(runtime.map, 'operacao_flavio');
  assert.equal(runtime.mode, 'escort');
  assert.equal(runtime.ctf, false);
  assert.equal(runtime.objective, true);
  assert.equal(runtime.checkpoints, 13);
  assert.deepEqual(runtime.vip && {
    char: runtime.vip.char,
    weapon: runtime.vip.weapon,
    primary: runtime.vip.primary,
    secondary: runtime.vip.secondary,
    meshWeapon: runtime.vip.meshWeapon,
    team: runtime.vip.team,
  }, { char: 'senador', weapon: 'knife', primary: 'knife', secondary: 'knife', meshWeapon: 'knife', team: 'B' });
  assert.ok(Math.abs(runtime.plane?.clearance || 0) <= 0.01, `avião fora do solo: ${runtime.plane?.clearance}`);
  assert.ok(runtime.plane?.groundY >= 0.07, `avião sem folga do pátio: ${runtime.plane?.groundY}`);
  assert.ok(runtime.plane?.height > 1, `altura inválida do avião: ${runtime.plane?.height}`);
  assert.deepEqual(runtime.signs.sort(), ['placa-embarque', 'placa-hangar', 'placa-rota-patio']);
  assert.equal(runtime.mintProps.length, 12);
  assert.ok(runtime.mintPropInstances >= 37, `poucos props detalhados no mapa: ${runtime.mintPropInstances}`);
  assert.equal(runtime.routeMeshCount, 0, 'a trilha amarela da escolta continua desenhada no chão');
  assert.equal(runtime.vm.mode, 'first');
  assert.ok(runtime.vm.root && (runtime.vm.legacyVisible || runtime.vm.authoredVisible),
    `arma de primeira pessoa invisível: ${JSON.stringify(runtime.vm)}`);
  assert.ok(runtime.nodes >= 500);
  assert.ok(runtime.colliders >= 50);
  assert.ok(runtime.occluders >= 50);
  assert.deepEqual(runtime.blockedCheckpoints, [], `checkpoints dentro de colisores: ${runtime.blockedCheckpoints.join(', ')}`);
  assert.deepEqual(runtime.blockedRouteSamples, [], `rota física atravessa colisores: ${runtime.blockedRouteSamples.join(', ')}`);
  assert.deepEqual(runtime.disconnectedRouteSegments, [], `trechos sem navegação: ${runtime.disconnectedRouteSegments.join(', ')}`);
  assert.match(runtime.objectiveLabel || '', /OPERAÇÃO FLÁVIO/);
  for (const file of [
    'aviao_executivo.glb', 'trator_bagagem.glb', 'carrinho_ferramentas.glb', 'arco_seguranca.glb', 'escada_embarque.glb',
    'terminal_fachada.glb', 'terminal_portal.glb', 'balcao_recepcao.glb', 'assentos_aeroporto.glb',
    'scanner_bagagem.glb', 'carro_servico.glb', 'energia_solo.glb', 'torre_iluminacao.glb',
    'barreiras_aeroporto.glb', 'estacao_manutencao.glb', 'containers_carga.glb', 'jardineira.glb', 'senador.glb',
  ]) {
    assert.ok(glbs.some((url) => url.includes(file)), `${file} não carregou por HTTP 200`);
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.player.pos.set(-40, g.world.groundHeightAt(-40, -55), -55);
    let side = -1;
    for (const bot of g.bots) {
      if (bot.team !== 'E') continue;
      bot.pos.set(40 * side, g.world.groundHeightAt(40 * side, 54), 54);
      bot.target = null;
      bot.path = null;
      side *= -1;
    }
  });
  const escortTrace = [];
  for (let second = 0; second < 8; second++) {
    await page.waitForTimeout(1000);
    escortTrace.push(await page.evaluate(() => {
      const g = window.__game;
      const vip = g.objective.vip;
      const guardDistances = g.bots
        .filter((bot) => bot !== vip && bot.team === 'B' && bot.alive)
        .map((bot) => Math.hypot(bot.pos.x - vip.pos.x, bot.pos.z - vip.pos.z))
        .sort((a, b) => a - b);
      const overlaps = g.world.colliders.filter((c) => (
        vip.pos.x > c.minX - 0.46 && vip.pos.x < c.maxX + 0.46
        && vip.pos.z > c.minZ - 0.46 && vip.pos.z < c.maxZ + 0.46
        && c.minY < 1.8 && c.maxY > 0.1
      )).length;
      return {
        x: vip.pos.x, z: vip.pos.z,
        checkpoint: g.objective.state.checkpoint,
        escortCount: g.objective.state.escortCount,
        guardDistances,
        overlaps,
        weapon: vip.weapon,
        meshWeapon: vip._meshWeapon,
      };
    }));
  }
  const firstEscort = escortTrace[0], lastEscort = escortTrace.at(-1);
  assert.ok(Math.hypot(lastEscort.x - firstEscort.x, lastEscort.z - firstEscort.z) > 7, 'Flávio não avançou com escolta autônoma');
  assert.ok(lastEscort.checkpoint > firstEscort.checkpoint, 'Flávio não alcançou o próximo checkpoint');
  assert.ok(escortTrace.every((sample) => sample.escortCount >= 2
    && sample.guardDistances.filter((distance) => distance <= 6.1).length >= 2),
  `bots abandonaram a formação protetora: ${JSON.stringify(escortTrace)}`);
  assert.ok(escortTrace.every((sample) => sample.overlaps === 0),
    `Flávio atravessou um colisor: ${JSON.stringify(escortTrace)}`);
  assert.ok(escortTrace.every((sample) => sample.weapon === 'knife' && sample.meshWeapon === 'knife'), 'Flávio trocou a faca durante a escolta');

  const threatBefore = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.objective.vip;
    const checkpoint = g.objective.state.checkpoint;
    const cover = g.objective.state.caminho[checkpoint];
    const threat = g.bots.find((bot) => bot.team === 'E');
    threat.alive = true; threat.hp = 1000; threat.protUntil = Infinity;
    threat.pos.set(vip.pos.x, 0, vip.pos.z + 5);
    threat.target = null; threat.path = null;
    for (const bot of g.bots) if (bot.team === 'E' && bot !== threat) bot.pos.set(38, 0, 54);
    return {
      checkpoint,
      distanceToCover: Math.hypot(vip.pos.x - cover.x, vip.pos.z - cover.z),
    };
  });
  await page.waitForTimeout(1800);
  const threatAfter = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.objective.vip;
    const cover = g.objective.state.caminho[g.objective.state.checkpoint];
    return {
      checkpoint: g.objective.state.checkpoint,
      threatened: g.objective.state.threatened,
      inCover: g.objective.state.inCover,
      crouched: Boolean(vip.mesh?.ctrl?.crouch),
      distanceToCover: Math.hypot(vip.pos.x - cover.x, vip.pos.z - cover.z),
      hud: document.getElementById('escort-objective')?.textContent || '',
      guardsInside: g.bots.filter((bot) => bot !== vip && bot.team === 'B' && bot.alive
        && Math.hypot(bot.pos.x - vip.pos.x, bot.pos.z - vip.pos.z) <= 6.1).length,
    };
  });
  assert.equal(threatAfter.checkpoint, threatBefore.checkpoint);
  assert.ok(threatAfter.threatened && threatAfter.inCover && threatAfter.crouched,
    `Flávio não buscou cobertura: ${JSON.stringify({ threatBefore, threatAfter })}`);
  assert.ok(threatAfter.distanceToCover <= threatBefore.distanceToCover + 0.05,
    `Flávio se afastou do abrigo: ${JSON.stringify({ threatBefore, threatAfter })}`);
  assert.match(threatAfter.hud, /COBERTURA/);
  assert.ok(threatAfter.guardsInside >= 2, `guardas não protegeram Flávio sob ameaça: ${JSON.stringify(threatAfter)}`);
  await page.evaluate(() => {
    const g = window.__game;
    for (const bot of g.bots) if (bot.team === 'E') {
      bot.protUntil = 0; bot.hp = 100; bot.pos.set(bot.pos.x < 0 ? -38 : 38, 0, 54);
      bot.target = null; bot.path = null;
    }
  });

  for (const view of views) {
    await page.evaluate(({ camera, target }) => {
      const g = window.__game;
      g.paused = true;
      g.camera.position.set(...camera);
      g.camera.lookAt(...target);
      g.renderer.render(g.scene, g.camera);
    }, view);
    requireOwnedOut();
    await page.screenshot({ path: `${out}/${view.id}.png` });
  }

  await page.evaluate(() => {
    const g = window.__game;
    g.paused = false;
    g.state = 'live';
    g.objective.vip.hp = 0;
    g.objective.vip.alive = false;
  });
  await page.waitForTimeout(1000);
  const death = await page.evaluate(() => {
    const g = window.__game;
    return {
      state: g.state,
      winner: g.objective?.cinematic?.winner,
      announced: g.objective?.deathAnnounced,
      result: g._resultado,
      hud: document.getElementById('escort-objective')?.textContent || '',
    };
  });
  assert.equal(death.state, 'roundEnd');
  assert.equal(death.winner, 'E');
  assert.equal(death.announced, true);
  assert.equal(death.result?.titulo, 'FLÁVIO FOI MORTO');
  assert.match(death.result?.sub || '', /escolta fracassou/i);
  assert.match(death.hud, /FLÁVIO FOI MORTO · ESCOLTA FRACASSOU/);
  requireOwnedOut();
  await page.screenshot({ path: `${out}/05-morte-flavio.png` });

  await page.evaluate(() => {
    const g = window.__game;
    g._startRound();
    g.state = 'live';
    g.paused = false;
    g._endRound('B');
  });
  const sampleBoardingPlane = () => page.evaluate(() => {
    const g = window.__game;
    const cinematic = g.objective?.cinematic;
    const owner = cinematic?.owner || g.objective;
    const boarding = owner?._boarding;
    const session = owner?._boardingSession;
    const boardPlane = cinematic && boarding?.session && boarding.stage?.visible && session === cinematic && boarding.plane
      ? boarding.plane
      : g.world.objectivePlane;
    boardPlane.updateWorldMatrix(true, false);
    return {
      elapsed: owner?._elapsedCinematic(),
      planeZ: boardPlane.getWorldPosition(boardPlane.position.clone()).z,
      activeIsBoardingPlane: boardPlane === boarding?.plane,
    };
  });
  const waitForElapsed = (target) => page.waitForFunction((t) => {
    const owner = window.__game?.objective?.cinematic?.owner || window.__game?.objective;
    const elapsed = owner?._elapsedCinematic();
    return !!owner?.cinematic && Number.isFinite(elapsed) && elapsed >= t && elapsed < 9;
  }, target, { timeout: 9000 });
  await waitForElapsed(1.0);
  const preDoorA = await sampleBoardingPlane();
  await waitForElapsed(6.1);
  const preDoorB = await sampleBoardingPlane();
  requireOwnedOut();
  await page.screenshot({ path: `${out}/06-cinematica-vitoria-porta.png` });
  await waitForElapsed(7.4);
  const taxi = await sampleBoardingPlane();
  requireOwnedOut();
  await page.screenshot({ path: `${out}/06-cinematica-vitoria.png` });
  assert.ok(preDoorA.planeZ === 55 && preDoorB.planeZ === 55, `FB_PRE_DOOR avião de embarque deve permanecer em z=55 antes da porta (A ${preDoorA.planeZ}, B ${preDoorB.planeZ})`);
  assert.equal(preDoorA.planeZ, preDoorB.planeZ, `avião de embarque deve ficar imóvel antes do fechamento da porta (${preDoorA.planeZ} vs ${preDoorB.planeZ})`);
  assert.ok(taxi.planeZ > 55, `FB_TAXI_ADVANCE avião deve avançar além de z=55 após o início do táxi em 6.8s (z ${taxi.planeZ})`);
  const cinematic = await page.evaluate(() => {
    const g = window.__game;
    const c = g.objective?.cinematic;
    const owner = c?.owner || g.objective;
    const boarding = owner?._boarding;
    const boardPlane = c && boarding?.session && boarding.stage?.visible && owner?._boardingSession === c && boarding.plane
      ? boarding.plane
      : g.world.objectivePlane;
    boardPlane.updateWorldMatrix(true, false);
    return {
      active: !!c,
      winner: c?.winner,
      duration: g.stateUntil - c?.startedAt,
      planeZ: boardPlane.getWorldPosition(boardPlane.position.clone()).z,
      result: g._resultado,
    };
  });
  cinematic.samples = { preDoorA, preDoorB, taxi };
  assert.equal(cinematic.active, true);
  assert.equal(cinematic.winner, 'B');
  assert.ok(cinematic.duration >= 8.9, `FB_DURATION duração da cinemática deve ser >= 8.9 (dur ${cinematic.duration})`);
  assert.ok(cinematic.planeZ > 55);

  receiptData = {
    generatedAt: new Date().toISOString(), base, runtime, escortTrace,
    threatBefore, threatAfter, death, cinematic, views, errors, failed, glbs,
  };
};
// Eventos finais e recibo terminal somente depois das duas tentativas de close.
let outcome = await runWithCleanup(primary, cleanup, () => verifyBrowserEvents(errors, failed));
if (!outcome.hasPrimaryError && !outcome.hasCleanupFailure) {
  try {
    if (!receiptData) throw new Error('stage=receipt reason=missing_collected_data');
    writeReceipt(receiptData);
    console.log(JSON.stringify(receiptData, null, 2));
  } catch (error) {
    outcome = { ...outcome, hasPrimaryError: true, primaryError: error, exitCode: exitCodeFor(error) };
  }
}
if (outcome.hasPrimaryError || outcome.hasCleanupFailure) {
  const receipt = writeFailureReceipt(outcome);
  const exitCode = receipt.error ? 2 : outcome.exitCode;
  console.error(terminalFailureJSON(outcome, receipt, exitCode));
  process.exit(exitCode);
}
