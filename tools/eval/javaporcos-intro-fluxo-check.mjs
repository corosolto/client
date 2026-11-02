import {ehMapaJavaporcos} from '../../public/js/maps.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const anchor = source.indexOf('  if (sessao) await preloadMapProps(mapaPartida.props || [], { required: true });');
const start = source.indexOf("  if (introAbort.signal.aborted || lancamentoPerdeu(meuLancamento)) return;", anchor);
const prefix = "async function fluxo(online) { const introAbort = window.__javaporcosIntroAbort;\n" + source.slice(start, source.indexOf('  /* RÉGUA:launch-race nascimento',start));
const mutant = process.argv.includes('--mutante=remontagem');
const code = mutant ? prefix.replace('&& !continuaPartida', '') : prefix;
assert.ok(!mutant || code !== prefix, 'mutante não aplicou');
let failures = 0;
for (const [label, overrides, expected] of [
  ['nova SP', {}, 1],
  ['Distrito Rural', {currentMap:'distrito_rural'}, 1],
  ['Vila da Mata', {currentMap:'vila_da_mata'}, 1],
  ['nova MP', { online: true }, 1],
  ['remontagem MP', { online: true, telemetryGameContext: { gameType: 'multiplayer', roomId: 'sala1' }, game: { _mapId: 'invasao_javaporcos' } }, 0],
  ['outro mapa', { currentMap: 'praca_poderes' }, 0],
  ['debug padrão', { testMode: true, params: new URLSearchParams() }, 0],
  ['debug forçado', { testMode: true }, 1],
]) {
  let calls = 0;
  const ctx = vm.createContext({ ehMapaJavaporcos, window: { __javaporcosIntroAbort: new AbortController() }, hideLoading: () => {}, continuaPartida: false, meuLancamento: 1, AbortController, currentMap: 'invasao_javaporcos', testMode: false, params: new URLSearchParams('hordeintro=1'),
    telemetryGameContext: {}, mpSessao: { net: { meta: { room: 'sala1' } } }, game: null,
    novoLancamento: () => 1, lancamentoPerdeu: () => false, apresentarJavaporcos: async () => { calls++; }, ...overrides, continuaPartida: label === 'remontagem MP' });
  await vm.runInContext(`${code}\n return true; }\nfluxo(${!!overrides.online})`, ctx);
  const ok = calls === expected;
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} INTRO fluxo ${label}: ${calls}, esperado ${expected}`);
}
process.exitCode = mutant ? (failures ? 0 : 1) : (failures ? 1 : 0);
