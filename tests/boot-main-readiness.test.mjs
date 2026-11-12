import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
function region(label) {
  const startMarker = `/* RÉGUA:${label} início */`;
  const endMarker = `/* RÉGUA:${label} fim */`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `região real ${label} deve existir`);
  return source.slice(start + startMarker.length, end);
}

const sequencingSource = region('boot-module-sequencing');
const bootstrapSource = region('boot-main-ready');
const dismissSource = region('boot-splash-dismiss');
const pendingSource = region('boot-pending-entry');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
  let resolveBackdrop;
  let armCalls = 0;
  let removed = false;
  const events = [];
  const launchReady = [];
  const handlers = new Map();
  const classes = new Set();
  const splash = {
    dataset: {},
    classList: {
      add: (name) => classes.add(name),
      contains: (name) => classes.has(name),
    },
    remove: () => { removed = true; },
  };
  const backdrop = new Promise((resolve) => { resolveBackdrop = resolve; });
  const context = vm.createContext({
    clearInterval() {},
    clearTimeout() {},
    contagem: { evento: (event) => events.push(event) },
    directRoute: false,
    dockLoadingCharacter() {},
    document: {
      activeElement: null,
      getElementById: (id) => id === 'boot-splash' ? splash : null,
      querySelector: () => null,
    },
    focusMenu() {},
    inspectionScreen: true,
    loadingStage: { hide() {} },
    mapasDoMenu: () => [],
    marcoFunil: (event) => events.push(event),
    menuBackdropSettled: backdrop,
    MOBILE_AUTO: false,
    musicArmed: false,
    musicFade: null,
    params: { get: () => null },
    performance: { now: () => 123 },
    Promise,
    setTimeout: (fn) => { fn(); return 1; },
    startMenuMusic() {},
    testMode: false,
    window: {
      __gameLaunch: { ready: (stage) => launchReady.push(stage) },
      addEventListener: (type, handler, capture) => {
        const listeners = handlers.get(type) || [];
        listeners.push({ handler, capture });
        handlers.set(type, listeners);
      },
      removeEventListener: (type, handler) => {
        const listeners = handlers.get(type) || [];
        handlers.set(type, listeners.filter((listener) => listener.handler !== handler));
      },
    },
    _armMusic: () => { armCalls++; context.musicArmed = true; },
    _entradaEm: 0,
    _lobbyEntrou() {},
    _menuBackdropBypass: null,
    _splashReady: true,
  });
  vm.runInContext(sequencingSource, context);
  vm.runInContext(dismissSource, context);
  vm.runInContext(bootstrapSource, context);

  return {
    consume: () => vm.runInContext(pendingSource, context),
    sequence: vm.runInContext('moduleSequencingReady', context),
    resolveBackdrop,
    handlers,
    dispatch: (type, event) => {
      for (const listener of [...(handlers.get(type) || [])]) listener.handler(event);
    },
    get armCalls() { return armCalls; },
    get armed() { return context.window.__CS_BOOT_FALLBACK_ARMED__; },
    get bypass() { return context._menuBackdropBypass; },
    get events() { return events; },
    get launchReady() { return launchReady; },
    get pendingEntry() { return splash.dataset.csEntradaPendente; },
    get removed() { return removed; },
    get splashGone() { return classes.has('gone'); },
  };
}

test('failsafe aceita e consome a entrada enquanto a arena termina', async () => {
  const f = fixture();
  const pointers = f.handlers.get('pointerdown');
  assert.equal(pointers?.length, 2, 'fallback e dismiss real devem ouvir o gesto');
  assert.equal(pointers[0].capture, true, 'entrada deve interceptar o watchdog em capture');
  assert.equal(typeof f.bypass, 'function', 'o gesto deve poder liberar a espera da arena');
  assert.equal(f.armed, true, 'watchdog deve reconhecer que a entrada leve está armada');

  f.dispatch('pointerdown', {
    target: { closest: () => null },
    preventDefault() {},
    stopPropagation() {},
  });
  await f.sequence;
  await flush();

  assert.equal(f.pendingEntry, '1', 'o boot completo deve receber a intenção pendente');
  assert.equal(f.armCalls, 1, 'o gesto real destrava o áudio antes de perder a ativação');
  assert.equal(f.bypass, null, 'o resolver transitório não sobrevive ao boot');
  assert.equal(f.armed, false, 'o recibo global não sobrevive à espera da arena');
  assert.equal(f.handlers.get('pointerdown').length, 1, 'só o fallback capture é removido');
  assert.equal(f.splashGone, false, 'a intenção espera finishBoot antes de sair da splash');
  assert.deepEqual(f.launchReady, [], 'a entrada não é confirmada antes de finishBoot');
  assert.equal(f.events.includes('splash_enter'), false, 'telemetria de entrada espera o boot');

  f.consume();
  assert.equal(f.pendingEntry, undefined, 'a intenção é consumida uma vez');
  assert.equal(f.splashGone, true, 'a splash real entra no fluxo de saída');
  assert.equal(f.removed, true, 'a splash real é removida');
  assert.deepEqual(f.launchReady, ['entrada']);
  assert.ok(f.events.includes('splash_enter'));
  assert.equal(f.events[0], 'game_loaded', 'boot completo precede a telemetria da entrada');
});

test('assets prontos encerram o fallback sem inventar uma entrada', async () => {
  const f = fixture();
  f.resolveBackdrop();
  await f.sequence;
  await flush();

  assert.equal(f.pendingEntry, undefined);
  assert.equal(f.armCalls, 0);
  assert.equal(f.bypass, null);
  assert.equal(f.armed, false);
  assert.equal(f.handlers.get('pointerdown').length, 1);
});

test('controles que permanecem na splash não liberam a arena', async () => {
  const f = fixture();
  f.dispatch('pointerdown', {
    target: { closest: () => ({}) },
    preventDefault() { throw new Error('não deveria prevenir'); },
    stopPropagation() { throw new Error('não deveria parar'); },
  });

  assert.equal(f.pendingEntry, undefined);
  assert.equal(f.armCalls, 0);
  assert.equal(typeof f.bypass, 'function');
  f.resolveBackdrop();
  await f.sequence;
});
