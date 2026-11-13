import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
const source = readFileSync(process.env.MENU_AUDIO_MAIN || new URL('../public/js/main.js', import.meta.url), 'utf8');
const start = source.indexOf('const MENU_MUSIC_VOL =');
const end = source.indexOf('/* Laboratório local de curadoria', start);
assert.ok(start >= 0 && end > start, 'actual menu audio lifecycle must be extractable');
const active = ['m11', 'm14', 'm16', 'm17', 'm22'];
function boot({ coarse = true, enabled = true, ready = false, query = '' } = {}) {
  const audios = [], intervals = new Map(), events = new Map(), picked = [], gone = new Set(); let nextTimer = 0, finishManifest;
  const button = { setAttribute() {}, getAttribute() { return ''; }, onclick: null };
  const splash = { classList: { contains: key => gone.has(key), add: key => gone.add(key) }, remove() {} };
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.plays = 0; this.pauses = 0; this.listeners = new Map(); audios.push(this); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.pauses++; this.paused = true; }
    addEventListener(key, fn) { this.listeners.set(key, fn); }
  }
  const window = { addEventListener(key, fn, capture) { if (!events.has(key)) events.set(key, []); events.get(key).push({ fn, capture }); }, dispatchEvent() {} };
  const context = vm.createContext({
    Audio, window, settings: { menuMusic: enabled }, location: { search: query }, URLSearchParams, VERSION: 'fixture', MENU_MUSIC_ACTIVE_IDS: active,
    POINTER_COARSE: coarse, _splashReady: ready, _entradaEm: 0, performance: { now: () => 123 }, Event: class {},
    $: id => id === 'hub-music-toggle' ? button : null, tr: x => x, saveSettings() {}, _pick: (...x) => picked.push(x),
    fetch: () => new Promise(resolve => { finishManifest = data => resolve({ ok: true, json: async () => data }); }),
    setInterval(fn) { const id = ++nextTimer; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id), setTimeout: () => ++nextTimer,
    document: { querySelector: () => null, getElementById: id => id === 'boot-splash' ? splash : null },
    loadingStage: { hide() {} }, dockLoadingCharacter() {}, contagem: { evento() {} }, marcoFunil() {}, _lobbyEntrou() {},
  });
  vm.runInContext(source.slice(start, end) + '\nglobalThis.musicTest = { start:startMenuMusic, arm:_armMusic, dismiss:dismissSplash, stop:stopMenuMusic, armed:()=>musicArmed, tracks:()=>[...MENU_TRACKS], current:()=>menuMusic };', context);
  return { context, api: context.musicTest, audios, button, intervals, picked, events, gone, manifest: async data => { finishManifest(data); await new Promise(resolve => setImmediate(resolve)); } };
}
test('desktop normal boot does not construct or fetch menu audio before entry', () => {
  const r = boot({ coarse: false }); assert.equal(r.audios.length, 0); assert.equal(r.api.armed(), false);
});
test('central start refuses unarmed normal callers', () => {
  const r = boot(); r.api.start(); assert.equal(r.audios.length, 0);
});
test('manifest catalogue arriving before a gesture cannot start audio', async () => {
  const r = boot(); await r.manifest({ menuMusic: [...active].reverse().map(id => 'audio/menu-music/' + id + '.mp3') });
  assert.equal(r.audios.length, 0); assert.deepEqual(Array.from(r.api.tracks()), [...active].reverse().map(id => '/audio/menu-music/' + id + '.mp3'));
});
test('input while splash is loading does not arm or fetch music', () => {
  const r = boot(); r.api.arm(); assert.equal(r.api.armed(), false); assert.equal(r.audios.length, 0);
});
test('first ready gesture actively starts one approved track without muted preplay', () => {
  const r = boot({ ready: true }); r.api.arm(); assert.equal(r.api.armed(), true); assert.equal(r.audios.length, 1); assert.equal(r.audios[0].plays, 1); assert.equal(r.audios[0].muted, false);
  assert.ok(active.some(id => r.audios[0].src === '/audio/menu-music/' + id + '.mp3')); r.api.arm(); assert.equal(r.audios.length, 1); assert.equal(r.audios[0].plays, 1);
});
test('splash entry capture starts music and bubbling cannot create a second player', () => {
  const r = boot({ ready: true }); r.api.dismiss({ target: { closest: () => false }, preventDefault() {}, stopPropagation() {} }); r.api.arm();
  assert.ok(r.gone.has('gone')); assert.equal(r.audios.length, 1); assert.equal(r.audios[0].plays, 1); assert.equal(r.audios[0].volume, .3);
});
test('disabled setting prevents startup and entry music, explicit enable plays', () => {
  const r = boot({ ready: true, enabled: false }); r.api.start(); r.api.dismiss(); assert.equal(r.audios.length, 0);
  r.button.onclick(); assert.equal(r.context.settings.menuMusic, true); assert.equal(r.audios.length, 1); assert.equal(r.audios[0].plays, 1);
  r.button.onclick(); assert.equal(r.context.settings.menuMusic, false); assert.equal(r.audios[0].paused, true); assert.equal(r.audios[0].muted, true);
});
test('explicit music enable is sufficient user intent even without prior pointer event', () => {
  const r = boot({ enabled: false }); r.button.onclick(); assert.equal(r.api.armed(), true); assert.equal(r.audios.length, 1); assert.equal(r.audios[0].plays, 1);
});
test('manifest update does not interrupt playing track; next visit uses approved catalogue', async () => {
  const r = boot({ ready: true }); r.api.dismiss(); const old = r.audios[0];
  await r.manifest({ menuMusic: [...active].reverse().map(id => 'audio/menu-music/' + id + '.mp3') });
  assert.equal(r.audios.length, 1); assert.equal(old.pauses, 0); r.api.start(); assert.equal(old.pauses, 1); assert.equal(r.audios.length, 2); assert.equal(r.audios[1].plays, 1);
});
test('review lab can explicitly start its selected track and does not emit normal pick telemetry', () => {
  const r = boot({ query: '?menumusiclab=1&menutrack=m07' }); r.api.start(); assert.equal(r.audios.length, 1); assert.equal(r.audios[0].src, '/audio/menu-music/m07.mp3?review=fixture'); assert.equal(r.audios[0].plays, 1); assert.equal(r.picked.length, 0);
});
test('menu stop retains fade and eventually pauses the existing audio', () => {
  const r = boot({ ready: true }); r.api.dismiss(); const audio = r.audios[0]; r.api.stop();
  for (let i = 0; i < 10; i++) for (const fn of [...r.intervals.values()]) fn(); assert.equal(audio.paused, true); assert.equal(r.audios.length, 1);
});
