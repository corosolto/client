// Executa init/refresh/getter reais; UI e rede controladas. Não prova render ou S25 físico.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const raw = fs.readFileSync(new URL('../public/js/treta-store.js', import.meta.url), 'utf8');
const source = raw.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const noop = () => {};
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const model = '/models/skins/lula-cyborg.glb';
const manifest = { skins: { 'lula-cyborg': { approved: true, character: 'barbudo', model } } };
const equipped = { authenticated: true, accountId: 'fixture', inventory: [{ skin_id: 'lula-cyborg', equipped: true }], catalog: [{ id: 'lula-cyborg', slot: 'character', available: true, character_id: 'barbudo', model_path: model }] };

function fixture({ inventory = equipped, accountReady = Promise.resolve(), readInventory, timeoutAPI = true, mutate = value => value } = {}) {
  const media = deferred(), controllers = [], deadlines = [], nodes = new Map(), listeners = new Map(), timers=new Map(), fetches=[];
  let timerID=0;
  const node = id => ({ id, open: false, textContent: '', dataset: {}, classList: { add: noop, remove: noop, contains: () => false }, setAttribute: noop, append: noop, replaceChildren: noop, addEventListener: noop });
  const context = vm.createContext({
    URLSearchParams, URL, console,
    document: {
      getElementById: id => { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); },
      createElement: () => node(''), querySelectorAll: () => [], querySelector: () => null,
      addEventListener: (name, callback) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(callback); },
      dispatchEvent: event => { for (const callback of listeners.get(event.type) || []) callback(event); }, documentElement: { dataset: { ui: 'v3' } },
    },
    window: {}, location: { search: '', href: 'https://fixture.invalid/', origin: 'https://fixture.invalid' },
    localStorage: { getItem: () => null, setItem: noop }, sessionStorage: { getItem: () => 'recorded', setItem: noop },
    setInterval: noop, setTimeout: (callback,ms)=>{deadlines.push(ms);const id=++timerID;timers.set(id,{callback,ms});return id;}, clearTimeout: id=>timers.delete(id), addEventListener: noop,
    AbortController: class extends AbortController { constructor(){super();controllers.push(this);} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    AbortSignal: timeoutAPI ? { timeout: ms => { const controller = new AbortController(); controllers.push(controller); deadlines.push(ms); return controller.signal; } } : {},
    TRETA_ITEMS_ENABLED: false, VERSION: 'fixture', TRETA_SKINS: [{ id: 'lula-cyborg', slot: 'character', character: 'barbudo' }],
    TRETA_WEAPON_SKINS: [], TRETA_GLOVES: [], TRETA_PACKS: [], TRETA_COINS: [], TRETA_EYEWEAR: [],
    TRETA_DEFAULT_REWARDS: {}, TRETA_COIN_ART: { poster: '/fixture.webp' },
    initTretaRewards: noop, updateTretaRewards: noop, ligarCompartilhar: noop,
    estadoDaUrl: () => null, loadAccount: async () => ({ authenticated: true }),
    socialApi: readInventory || (async () => { await accountReady; return inventory; }), assetUrl: p => '/' + p,
    fetch: async (url, options) => {
      assert.equal(url, '/models/skins/manifest.json');
      fetches.push({url,signal:options?.signal});
      options?.signal?.addEventListener('abort', () => media.reject(options.signal.reason), { once: true });
      return media.promise;
    },
  });
  const api = new vm.Script(mutate(source) + '\ndraw=()=>{};initProposals=()=>{};updateBuy=()=>{};({initTretaStore,equippedTretaSkin,desequiparTretaSkin});').runInContext(context);
  let settled = false;
  const ready = api.initTretaStore().then(() => { settled = true; });
  return { api, ready, media, deadlines, controllers, timers, fetches, settled: () => settled, emit: type => context.document.dispatchEvent({ type }), accountChanged: detail => context.document.dispatchEvent({ type: 'cs-account-change', detail }) };
}

async function ownedWaits(mutate) {
  const f = fixture({ mutate });
  await tick();
  const premature = f.settled();
  f.media.resolve({ ok: true, json: async () => manifest });
  await f.ready;
  assert.equal(premature, false, 'owned skin: readiness settled before the manifest');
  assert.equal(f.api.equippedTretaSkin('barbudo'), 'lula-cyborg');
}

test('owned character waits for its manifest before readiness settles', () => ownedWaits());
test('manifest first still waits for account inventory', async () => {
  const account = deferred(), f = fixture({ accountReady: account.promise });
  f.media.resolve({ ok: true, json: async () => manifest });
  await tick();
  assert.equal(f.settled(), false);
  account.resolve(); await f.ready;
  assert.equal(f.api.equippedTretaSkin('barbudo'), 'lula-cyborg');
});
test('guest does not wait for cosmetic media', async () => {
  const f = fixture({ inventory: { authenticated: false, inventory: [], catalog: [] } });
  await tick(); assert.equal(f.settled(), true); await f.ready;
  f.media.resolve({ ok: true, json: async () => manifest });
});
test('owned but unequipped character does not delay readiness', async () => {
  const inventory = { ...equipped, inventory: [{ skin_id: 'lula-cyborg', equipped: false }] };
  const f = fixture({ inventory }); await tick();
  assert.equal(f.settled(), true); await f.ready;
  f.media.resolve({ ok: true, json: async () => manifest });
});
test('weapon-only equipment does not delay readiness for character media', async () => {
  const inventory = { ...equipped, inventory: [{ skin_id: 'ouro-ak', equipped: true }], catalog: [{ id: 'ouro-ak', slot: 'weapon' }] };
  const f = fixture({ inventory }); await tick();
  assert.equal(f.settled(), true); await f.ready;
  f.media.resolve({ ok: true, json: async () => manifest });
});
for (const [name, response] of [
  ['HTTP failure', { ok: false }],
  ['invalid JSON', { ok: true, json: async () => { throw new SyntaxError('fixture'); } }],
  ['invalid manifest shape', { ok: true, json: async () => ({ skins: null }) }],
  ['manifest array', { ok: true, json: async () => ({ skins: [] }) }],
]) test(name + ' settles safely without equipping an unvalidated skin', async () => {
  const f = fixture(); f.media.resolve(response); await f.ready; await tick();
  assert.equal(f.api.equippedTretaSkin('barbudo'), null);
});
test('network failure is contained', async () => {
  const f = fixture(); f.media.reject(new Error('fixture network')); await f.ready;
  assert.equal(f.api.equippedTretaSkin('barbudo'), null);
});
for (const [name, data] of [
  ['unapproved asset', { skins: { 'lula-cyborg': { ...manifest.skins['lula-cyborg'], approved: false } } }],
  ['mismatched model', { skins: { 'lula-cyborg': { ...manifest.skins['lula-cyborg'], model: '/models/skins/other.glb' } } }],
]) test(name + ' remains unavailable after readiness', async () => {
  const f = fixture(); f.media.resolve({ ok: true, json: async () => data }); await f.ready;
  assert.equal(f.api.equippedTretaSkin('barbudo'), null);
});
async function deadlineReleasesReadiness(mutate) {
  const f = fixture({mutate}); await tick();
  assert.equal(f.deadlines.length, 1, 'manifest fetch needs a bounded request');
  assert.equal(f.deadlines[0],12000);
  assert.equal(f.timers.size,1);[...f.timers.values()][0].callback();await tick();
  const released=f.settled();f.media.resolve({ok:true,json:async()=>manifest});await f.ready;
  assert.equal(released,true,'expired manifest request still blocks readiness');
  assert.equal(f.fetches[0].signal.aborted,true,'manifest fetch did not receive its deadline signal');
  assert.equal(f.api.equippedTretaSkin('barbudo'), null);
  assert.equal(f.timers.size,0,'manifest deadline timer leaked after failure');
}
test('manifest fetch has a deadline and timeout releases readiness',()=>deadlineReleasesReadiness());
async function accountChangesDuringInit({ whileManifest = false, mutate } = {}) {
  const old = deferred(), current = deferred(); let changed = false;
  const f = fixture({ mutate, readInventory: async () => changed ? current.promise : old.promise });
  if (whileManifest) { old.resolve(equipped); await tick(); }
  changed = true;
  f.accountChanged({ authenticated: true });
  if (!whileManifest) { old.resolve({ authenticated: false, inventory: [], catalog: [] }); await tick(); }
  f.media.resolve({ ok: true, json: async () => manifest }); await tick();
  const premature = f.settled();
  current.resolve(equipped); await f.ready;
  assert.equal(premature, false, 'account change: readiness settled before the current inventory');
  assert.equal(f.api.equippedTretaSkin('barbudo'), 'lula-cyborg');
}
test('account change during inventory read waits for the current account', () => accountChangesDuringInit());
test('account change during manifest read waits for the current account', () => accountChangesDuringInit({ whileManifest: true }));
async function changedGuestDoesNotWait({ whileManifest = false, mutate } = {}) {
  const old = deferred(), current = deferred(); let changed = false;
  const f = fixture({ mutate, readInventory: async () => changed ? current.promise : old.promise });
  if (whileManifest) { old.resolve(equipped); await tick(); }
  changed = true;
  f.accountChanged({ authenticated: false });
  current.resolve({ authenticated: false, inventory: [], catalog: [] }); await tick();
  const readyForGuest = f.settled();
  old.resolve(equipped); f.media.resolve({ ok: true, json: async () => manifest }); await f.ready;
  assert.equal(readyForGuest, true, 'guest change: readiness still waits for the previous account');
}
test('guest account change does not wait for an old inventory request', () => changedGuestDoesNotWait());
test('guest account change does not wait for an old cosmetic request', () => changedGuestDoesNotWait({ whileManifest: true }));
async function unequippedDuringInit({ refresh = false, mutate } = {}) {
  const base = { ...equipped, inventory: [{ skin_id: 'lula-cyborg', equipped: false }] };
  let current = equipped;
  const f = fixture({ mutate, readInventory: async (_path, body) => body?.action === 'unequip' ? base : current });
  await tick();
  if (refresh) { current = base; f.emit('cs-shop-open'); await tick(); }
  else assert.equal(await f.api.desequiparTretaSkin(), true);
  await tick(); const readyForBase = f.settled();
  f.media.resolve({ ok: true, json: async () => manifest }); await f.ready;
  assert.equal(readyForBase, true, 'unequipped: readiness still waits for cosmetic media');
  assert.equal(f.api.equippedTretaSkin('barbudo'), null);
}
test('unequipping during init releases the cosmetic wait', () => unequippedDuringInit());
test('inventory refresh removing equipped character releases the cosmetic wait', () => unequippedDuringInit({ refresh: true }));
test('control mutation detects omitted manifest wait', async () => {
  const anchor = 'await Promise.race([skinManifestReady,changed,inventoryChanged]);';
  assert.equal(source.split(anchor).length - 1, 1);
  await assert.rejects(ownedWaits(value => value.replace('while(!skinManifestSettled && epoch===accountEpoch', 'while(false && epoch===accountEpoch')), /readiness settled before the manifest/);
});
test('control mutation detects omitted account epoch retry', async () => {
  const anchor = 'while(epoch!==accountEpoch);';
  assert.equal(source.split(anchor).length - 1, 1);
  await assert.rejects(accountChangesDuringInit({ mutate: value => value.replace(anchor, 'while(false);') }), /readiness settled before the current inventory/);
});
for (const whileManifest of [false, true]) test('control mutation detects obsolete ' + (whileManifest ? 'cosmetic' : 'inventory') + ' wait', async () => {
  const anchor = whileManifest ? 'await Promise.race([skinManifestReady,changed,inventoryChanged]);' : 'await Promise.race([refresh(),changed]);';
  const replacement = whileManifest ? 'await skinManifestReady;' : 'await refresh();';
  assert.equal(source.split(anchor).length - 1, 1);
  await assert.rejects(changedGuestDoesNotWait({ whileManifest, mutate: value => value.replace(anchor, replacement) }), /readiness still waits for the previous account/);
});
test('control mutation detects omitted inventory wake-up', async () => {
  const anchor = 'for(const resolve of inventoryWaiters)resolve();inventoryWaiters.clear();';
  assert.equal(source.split(anchor).length - 1, 1);
  await assert.rejects(unequippedDuringInit({ mutate: value => value.replace(anchor, '') }), /readiness still waits for cosmetic media/);
});

async function impossibleEquipmentDoesNotWait({kind='unknown-client',mutate}={}){const inventory={...equipped,inventory:kind==='unknown-client'?[{skin_id:'unknown-character',equipped:true}]:equipped.inventory,catalog:kind==='unknown-client'?[{...equipped.catalog[0],id:'unknown-character'}]:kind==='missing-server'?[]:[{...equipped.catalog[0],available:false}]};const f=fixture({inventory,mutate});await tick();const settled=f.settled();f.media.resolve({ok:true,json:async()=>manifest});await f.ready;assert.equal(settled,true,'unusable equipment still waits for the manifest');assert.equal(f.api.equippedTretaSkin('barbudo'),null);}
for(const kind of ['unknown-client','missing-server','server-unavailable'])test('unusable equipment does not delay readiness: '+kind,()=>impossibleEquipmentDoesNotWait({kind}));

for(const ms of [1,120000])test('control mutation rejects changed manifest deadline: '+ms,async()=>{const anchor='setTimeout(()=>controller.abort(),12000)';assert.equal(source.split(anchor).length-1,1);await assert.rejects(deadlineReleasesReadiness(value=>value.replace(anchor,'setTimeout(()=>controller.abort(),'+ms+')')),{name:'AssertionError'});});
for(const [kind,anchor] of [['unknown-client',"product(s.skin_id)?.slot==='character' && "],['server-unavailable',"item(s.skin_id)?.available===true && "]])test('control mutation rejects wait for unusable equipment: '+kind,async()=>{assert.equal(source.split(anchor).length-1,1);await assert.rejects(impossibleEquipmentDoesNotWait({kind,mutate:value=>value.replace(anchor,'')}),/unusable equipment still waits for the manifest/);});

async function withoutTimeoutAPILoads(mutate){
  const f=fixture({timeoutAPI:false,mutate});await tick();
  const requested=f.fetches.length,premature=f.settled();
  f.media.resolve({ok:true,json:async()=>manifest});await f.ready;
  assert.equal(requested,1,'manifest was never requested without AbortSignal.timeout');
  assert.equal(premature,false,'manifest wait was skipped without AbortSignal.timeout');
  assert.equal(f.api.equippedTretaSkin('barbudo'),'lula-cyborg');
  assert.equal(f.timers.size,0,'manifest deadline timer leaked after success');
}
test('manifest loads with its equipped skin without AbortSignal.timeout',()=>withoutTimeoutAPILoads());

test('deadline stays active while the manifest body is pending',async()=>{
  const body=deferred(),f=fixture({timeoutAPI:false});
  f.media.resolve({ok:true,json:()=>body.promise});await tick();
  assert.equal(f.timers.size,1);assert.equal(f.settled(),false);
  body.resolve(manifest);await f.ready;
  assert.equal(f.timers.size,0);assert.equal(f.api.equippedTretaSkin('barbudo'),'lula-cyborg');
});
for(const [name,anchor,replacement,check] of [
  ['static-only timeout',"const controller=new AbortController();manifestTimer=setTimeout(()=>controller.abort(),12000);return fetch(assetUrl('models/skins/manifest.json'),{signal:controller.signal});","return fetch(assetUrl('models/skins/manifest.json'),{signal:AbortSignal.timeout(12000)});",withoutTimeoutAPILoads],
  ['omitted timer cleanup','clearTimeout(manifestTimer);','',withoutTimeoutAPILoads],
  ['omitted deadline abort','()=>controller.abort()','()=>{}',deadlineReleasesReadiness],
  ['disconnected fetch signal','{signal:controller.signal}','{}',deadlineReleasesReadiness],
])test('control mutation rejects '+name,async()=>{
  assert.equal(source.split(anchor).length-1,1);
  await assert.rejects(check(value=>value.replace(anchor,replacement)),{name:'AssertionError'});
});
