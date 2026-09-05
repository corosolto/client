#!/usr/bin/env node
/* Gate causal da locucao de combate. Nao chama a API nem le audio: usa URLs
   fantasia para provar roteamento, prioridade e cobertura do contrato. */
import { readFileSync } from 'node:fs';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && mutante !== 'colapsa-tiers') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const GAME = readFileSync('public/js/game.js', 'utf8');
const AUDIO = readFileSync('public/js/audio.js', 'utf8');
const INSTALLER = readFileSync('tools/audio/fab-game-local.mjs', 'utf8');
const GENERATOR = readFileSync('tools/audio/generate-fish-announcer.mjs', 'utf8');
const tierUrl = (key) => mutante === 'colapsa-tiers' ? 'COLAPSADO.wav' : `${key}.wav`;
const tierKeys = [
  'headshot', 'doublekill', 'triplekill', 'multikill', 'megakill', 'killingspree', 'godlike',
];
const pack = {
  general: Object.fromEntries(tierKeys.map((key) => [key, [tierUrl(key)]])),
  roundNumbers: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i + 1), [`round-${i + 1}.wav`]])),
};

globalThis.location = { search: '', href: 'http://regua/' };
globalThis.window = globalThis;
globalThis.performance = globalThis.performance || { now: () => Date.now() };
const tocados = [];
let pausados = 0;
globalThis.Audio = class {
  constructor(src) { this.src = decodeURIComponent(src); this.volume = 1; tocados.push(this.src); }
  addEventListener() {}
  play() { return Promise.resolve(); }
  pause() { pausados++; }
};
const { Sfx } = await import('../../public/js/audio.js');

const erros = [];
const sfx = new Sfx();
sfx.pack = pack;
const saidas = tierKeys.map((key) => {
  tocados.length = 0;
  const ok = sfx.general(key);
  return { key, ok, src: tocados[0] };
});
if (saidas.some((r) => r.ok !== true || !r.src)) erros.push('ANN1 algum tier nao toca exatamente pelo manifest general.');
if (new Set(saidas.map((r) => r.src)).size !== tierKeys.length) {
  erros.push(`ANN2 tiers colapsados: ${new Set(saidas.map((r) => r.src)).size}/${tierKeys.length}.`);
}
tocados.length = 0;
const rounds = Array.from({ length: 7 }, (_, i) => {
  const n = i + 1;
  const ok = sfx.roundNumber(n);
  return { n, ok, src: tocados.at(-1) };
});
if (rounds.some((r) => r.ok !== true || r.src !== `round-${r.n}.wav`)) {
  erros.push('ANN3 rounds 1..7 nao usam suas locucoes especificas.');
}
if (sfx.roundNumber(8) !== false || sfx.general('inexistente') !== false) {
  erros.push('ANN4 chave ausente precisa devolver false para o fallback atual assumir.');
}
if (sfx.general('kill') !== false || sfx.general('ultrakill') !== false) {
  erros.push('ANN4b kill simples/ultra precisam cair no fallback legado, não numa fala Fish rejeitada.');
}
if (pausados < tierKeys.length - 1) erros.push('ANN5 locucoes podem se sobrepor em vez de interromper a anterior.');

if (!/const MK_TIERS = \{[^}]*4:\s*'multikill'[^}]*5:\s*'megakill'/s.test(GAME)
  || !/count >= 6 \? 'godlike'/.test(GAME)) {
  erros.push('ANN6 progressao antiga double/triple/multi/mega/godlike não foi restaurada.');
}
if (!GAME.includes('this.sfx.roundNumber(this.roundNum)')) erros.push('ANN7 inicio da rodada nao dispara o numero falado.');
if (!GAME.includes("this.sfx.general(kind || (head ? 'headshot' : 'kill'))")) {
  erros.push('ANN8 tier, headshot e kill simples nao compartilham a locucao prioritaria.');
}
if (!AUDIO.includes('roundNumber(number)')) erros.push('ANN9 Sfx nao oferece contrato de round numerado.');
if (!GAME.includes("ANNOUNCER_LAB = ['kills', 'rounds', 'all']")
  || !GAME.includes("['headshot', 'doublekill', 'triplekill', 'multikill', 'megakill', 'killingspree', 'godlike']")
  || !GAME.includes('for (const timer of this._announcerLabTimers || []) clearTimeout(timer)')) {
  erros.push('ANN9b laboratorio ingame nao cobre/encerra a sequencia de escuta.');
}
if (!INSTALLER.includes("arg('fish-announcer')") || !INSTALLER.includes("arg('legacy-callouts')")
  || !INSTALLER.includes('legacyCallouts?.general') || !INSTALLER.includes('fishAnnouncer?.roundNumbers')) {
  erros.push('ANN10 instalador não separa callouts antigos dos rounds Fish.');
}
for (const key of tierKeys) {
  if (!GENERATOR.includes(`${key}:`)) erros.push(`ANN11 gerador Fish nao declara frase para ${key}.`);
}
if (!GENERATOR.includes('process.env.FISH_API_KEY') || !GENERATOR.includes('63e61b8d29cf4279b03b6a59b3d2de98')) {
  erros.push('ANN12 gerador nao usa credencial efemera e o reference_id escolhido.');
}

if (erros.length) {
  console.error(`AUDIO ANNOUNCER${mutante ? ` [mutante=${mutante}]` : ''}: ${erros.length} falha(s)`);
  for (const erro of erros) console.error(`  x ${erro}`);
  process.exit(1);
}
console.log('AUDIO ANNOUNCER: verde - callouts antigos e rounds Fish ficam independentes, sem sobreposição.');
