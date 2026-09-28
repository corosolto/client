import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const main = readFileSync(new URL('../../../public/js/main.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../../src/pages/index.astro', import.meta.url), 'utf8');
const start = main.indexOf("$('profile-ok').onclick = ");
const end = main.indexOf('\n// ESC no menu', start);
assert.ok(start > 0 && end > start, 'handler do botão de perfil encontrado');
const handler = main.slice(start, end).replace(
  process.argv.includes('--mutante=sem-envio') ? "api('/api/register'" : '\0',
  "api('/api/sem-registro'",
);
const saveStart = main.indexOf('function saveSocials(');
const removeStart = main.indexOf('function removedSavedSocial(');
const saveEnd = main.indexOf('\nfunction updateAvatarVisibility()', saveStart);
assert.ok(saveStart > 0 && saveEnd > saveStart, 'salvamento local das redes encontrado');
assert.ok(removeStart > 0 && removeStart < saveStart, 'classificação da remoção encontrada');
const removeBlock = main.slice(removeStart, saveStart);
const saveBlock = main.slice(saveStart, saveEnd).replace(
  process.argv.includes('--mutante=sem-marca') ? 'socialsClearRequested ||= clearRequested && confirmedSocials.length > 0;' : '\0',
  '',
);
const initStart = main.indexOf("const SOCIALS_KEY = 'awpbr_socials';");
assert.ok(initStart > 0 && saveStart > initStart, 'inicialização das redes encontrada');
const initBlock = main.slice(initStart, saveStart);

async function click({ socials, response, nick = 'TestePerfil', socialsClearRequested = false, confirmedSocials = [], onRequest }) {
  const calls = [], steps = [];
  const elements = {
    'profile-ok': { disabled: false },
    'profile-save-note': { textContent: '' },
  };
  const storage = new Map();
  const ctx = {
    $: id => elements[id],
    ui: { click() {} },
    saveSettings() {},
    setSetupStep: step => steps.push(step),
    hubNavigate() {},
    nickEl: { value: nick, focus() {} },
    socials,
    socialsClearRequested,
    confirmedSocials,
    registeredNick: '',
    testMode: false,
    getToken: () => 'test-token',
    getAnonId: () => 'test-uid',
    api: async (path, body) => { calls.push({ path, body }); onRequest?.(ctx); return response; },
    localStorage: { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    NICK_KEY: 'test-nick',
    SOCIALS_CLEAR_KEY: 'test-clear',
    SOCIALS_CONFIRMED_KEY: 'test-confirmed',
    updateAvatarVisibility() {},
    renderPlayerPlate() {},
  };
  vm.runInNewContext(handler, ctx, { filename: 'main.js:profile-ok' });
  await elements['profile-ok'].onclick();
  return { calls, steps, elements, ctx, storage };
}

test('perfil confirma a gravação de nick e redes antes de avançar', async () => {
  const result = await click({
    socials: [{ net: 'github', handle: 'jogador' }],
    response: { ok: true, nick: 'TestePerfil' },
  });
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].path, '/api/register');
  assert.equal(result.calls[0].body.nick, 'TestePerfil');
  assert.equal(result.calls[0].body.socials[0].handle, 'jogador');
  assert.equal(result.calls[0].body.saveSocials, true);
  assert.deepEqual(result.steps, ['match']);
  assert.equal(result.elements['profile-ok'].disabled, false);
});

test('perfil vazio em outro navegador preserva as redes já salvas', async () => {
  const result = await click({ socials: [], response: { ok: true, nick: 'TestePerfil' } });
  assert.equal(result.calls[0].body.clearSocials, false);
});

test('remover a última rede envia intenção explícita de limpeza', async () => {
  const result = await click({ socials: [], confirmedSocials: [{ net: 'x', handle: 'persistido' }], socialsClearRequested: true, response: { ok: true, nick: 'TestePerfil' } });
  assert.equal(result.calls[0].body.clearSocials, true);
  assert.equal(result.calls[0].body.socials.length, 0);
  assert.equal(result.ctx.socialsClearRequested, false);
});

test('só remoção explícita marca a intenção de limpar', () => {
  const storage = new Map();
  const ctx = {
    socials: [], socialsClearRequested: false, confirmedSocials: [{ net: 'x', handle: 'persistido' }], SOCIALS_KEY: 'test-socials', SOCIALS_CLEAR_KEY: 'test-clear',
    localStorage: { setItem: (key, value) => storage.set(key, value) }, updateAvatarVisibility() {},
  };
  vm.runInNewContext(saveBlock, ctx);
  vm.runInNewContext('saveSocials()', ctx);
  assert.equal(ctx.socialsClearRequested, false);
  vm.runInNewContext('saveSocials(true)', ctx);
  assert.equal(ctx.socialsClearRequested, true);
  assert.equal(storage.get('test-clear'), '1');
});

test('apagar rascunho sem gravação confirmada não solicita limpar links remotos', () => {
  const draft = { net: 'x', handle: 'rascunho' };
  const ctx = { confirmedSocials: [] };
  vm.runInNewContext(removeBlock, ctx);
  assert.equal(vm.runInNewContext('removedSavedSocial(s)', { ...ctx, s: draft }), false);
  assert.equal(vm.runInNewContext(`${removeBlock}\nremovedSavedSocial(s)`, { confirmedSocials: [draft], s: draft }), true);
});

test('recarga preserva remoção pendente e não ressuscita link legado', () => {
  const storage = new Map([
    ['awpbr_socials', '[]'], ['awpbr_socials_clear_pending', '1'],
    ['awpbr_socials_confirmed', '[{"net":"x","handle":"persistido"}]'],
    ['awpbr_social_net', 'x'], ['awpbr_social', 'antigo'],
  ]);
  const ctx = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    SOCIAL_NET_KEY: 'awpbr_social_net', SOCIAL_KEY: 'awpbr_social',
  };
  const state = vm.runInNewContext(`${initBlock}\n({ socials, socialsClearRequested })`, ctx);
  assert.equal(state.socials.length, 0);
  assert.equal(state.socialsClearRequested, true);
  assert.equal(storage.has('awpbr_social'), false);
});

test('503, recarga e remoção de rascunho não limpam redes remotas', () => {
  const draft = { net: 'github', handle: 'nunca_salvo' };
  const storage = new Map([['awpbr_socials', JSON.stringify([draft])]]);
  const ctx = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    SOCIAL_NET_KEY: 'awpbr_social_net', SOCIAL_KEY: 'awpbr_social',
    updateAvatarVisibility() {},
  };
  const state = vm.runInNewContext(`${initBlock}\n${saveBlock}\nconst removed = socials.shift(); saveSocials(removedSavedSocial(removed)); ({ socialsClearRequested })`, ctx);
  assert.equal(state.socialsClearRequested, false);
  assert.equal(storage.has('awpbr_socials_clear_pending'), false);
});

test('link legado migra uma vez quando ainda não há chave nova', () => {
  const storage = new Map([['awpbr_social_net', 'github'], ['awpbr_social', 'jogador']]);
  const ctx = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    SOCIAL_NET_KEY: 'awpbr_social_net', SOCIAL_KEY: 'awpbr_social',
  };
  const state = vm.runInNewContext(`${initBlock}\n({ socials, socialsClearRequested })`, ctx);
  assert.equal(state.socials[0].handle, 'jogador');
  assert.equal(storage.has('awpbr_social'), false);
  assert.match(storage.get('awpbr_socials'), /jogador/);
});

test('edição durante o envio permanece no perfil para novo salvamento', async () => {
  const result = await click({
    socials: [{ net: 'x', handle: 'primeiro' }],
    response: { ok: true, nick: 'TestePerfil' },
    onRequest: ctx => { ctx.socials[0].handle = 'segundo'; },
  });
  assert.deepEqual(result.steps, []);
  assert.match(result.elements['profile-save-note'].textContent, /mudou durante/);
  assert.match(result.storage.get('test-confirmed'), /primeiro/);
  assert.equal(result.storage.has('test-clear'), false);
});

test('falha ao salvar mantém o perfil aberto e mostra aviso', async () => {
  const result = await click({
    socials: [{ net: 'x', handle: 'jogador' }],
    response: { error: 'socials_update_failed', message: 'não foi possível salvar as redes agora' },
  });
  assert.deepEqual(result.steps, []);
  assert.match(result.elements['profile-save-note'].textContent, /não foi possível salvar/);
  assert.equal(result.elements['profile-ok'].disabled, false);
});

test('a tela tem status acessível para o resultado do salvamento', () => {
  assert.ok(page.includes('id="profile-save-note" role="status"'), 'status acessível ausente');
});
