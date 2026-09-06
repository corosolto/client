#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const mutantes = [
  'ganho-alto', 'sem-fallback-voz', 'sem-fallback-personagem', 'sem-round-mp',
  'sem-fallback-kill-mp', 'sem-voz-propria', 'fish-volta-fallback', 'menu-rejeitada-volta',
  'voz-generica-cf',
];
if (mutante && !mutantes.includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

let audio = readFileSync('public/js/audio.js', 'utf8');
let netgame = readFileSync('public/js/netgame.js', 'utf8');
let game = readFileSync('public/js/game.js', 'utf8');
let installer = readFileSync('tools/audio/fab-game-local.mjs', 'utf8');
let menuSelection = readFileSync('public/js/menu-music-selection.js', 'utf8');
if (mutante === 'ganho-alto') audio = audio.replace('return Number.isFinite(q) && q > 0 ? q : 0.42;', 'return Number.isFinite(q) && q > 0 ? q : 0.52;');
if (mutante === 'sem-fallback-voz') audio = audio.replace(': this._speak(this._voiceFallback(team), { volume: 0.72 });', ': false;');
if (mutante === 'sem-fallback-personagem') audio = audio.replace('if (!file) return this._speak(this._voiceFallback(faction), { volume: 0.78, interrupt: true });', 'if (!file) return false;');
if (mutante === 'sem-round-mp') netgame = netgame.replace("if (!game.sfx.roundNumber(game.roundNum) && !game.sfx.csSound('roundstart'))", "if (!game.sfx.csSound('roundstart'))");
if (mutante === 'sem-fallback-kill-mp') netgame = netgame.replace(
  "if (!announced && !game.sfx.general('kill')) game.sfx.voice(game._voiceKey(att.team));",
  "if (!announced && kind && !game.sfx.general('kill')) game.sfx.voice(game._voiceKey(att.team));",
);
if (mutante === 'sem-voz-propria') audio = audio.replace('this.pack?.characterVoice?.[characterId]?.[event]', 'null');
if (mutante === 'fish-volta-fallback') installer = installer.replace(
  'const selectedGeneral = fishAnnouncer?.general || legacyCallouts?.general || null;',
  'const selectedGeneral = legacyCallouts?.general || fishAnnouncer?.general || null;',
);
if (mutante === 'menu-rejeitada-volta') menuSelection = menuSelection.replace("'m03',", "'m01', 'm03',");
if (mutante === 'voz-generica-cf') audio = audio.replace("new Set(['C', 'F'])", 'new Set([])');

globalThis.location = { search: '', href: 'http://regua/' };
globalThis.window = globalThis;
const samples = [];
globalThis.Audio = class {
  constructor(src) { this.src = decodeURIComponent(src); this.volume = 1; samples.push(this.src); }
  addEventListener() {}
  play() { return Promise.resolve(); }
  pause() {}
};
const spoken = [];
let cancelled = 0;
globalThis.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text; this.volume = 1; this.rate = 1; this.pitch = 1; this.lang = ''; }
};
globalThis.speechSynthesis = {
  speak(utterance) { spoken.push(utterance); },
  cancel() { cancelled += 1; },
};

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const moduleUrl = `data:text/javascript;base64,${Buffer.from(audio).toString('base64')}#${mutante || 'normal'}`;
const { Sfx } = await import(moduleUrl);
const sfx = new Sfx();
sfx.pack = { voice: { E: [], B: [], U: [], C: [], F: [] }, round: {} };

expect(sfx.voice('E', 0) === true && spoken.at(-1)?.lang === 'pt-BR',
  'MIX1 pool de faccao vazio deixa a voz ingame muda em vez de usar locucao original.');
expect(sfx.radioVoice('E') === true && spoken.length >= 2,
  'MIX2 radio sem sample fica mudo.');
expect(sfx.characterSelectVoice('dollynho', 'B', ['dollynho']) === true && spoken.length >= 3,
  'MIX2b personagem sem arquivo no pack privado fica mudo.');
expect(sfx.voice('C', 0) === false && sfx.radioVoice('F') === false
  && sfx.characterVoice('sem-take', 'radio', { fallbackFaction: 'F' }) === false
  && sfx.characterSelectVoice('palhaco-sem-take', 'C', ['palhaco-sem-take']) === false,
  'MIX2c Palhaços/Funkeiros sem take próprio voltam a tocar dublagem genérica.');
expect(sfx.general('multikill') === true && spoken.at(-1)?.text === 'Multi kill!',
  'MIX3 multikill sem asset nao usa a locucao segura de contingencia.');
expect(sfx.roundNumber(1) === true && spoken.at(-1)?.text === 'Round one!',
  'MIX4 Round 1 sem asset nao usa a locucao segura de contingencia.');
expect(sfx.general('inexistente') === false && sfx.roundNumber(8) === false,
  'MIX5 chave desconhecida inventa uma fala.');
expect(cancelled >= 2, 'MIX6 locucoes prioritarias podem se sobrepor.');

spoken.length = 0;
sfx.pack.general = { multikill: ['audio/licenciado.wav'] };
expect(sfx.general('multikill') === true && samples.at(-1) === 'audio/licenciado.wav' && spoken.length === 0,
  'MIX7 fallback fala por cima do sample licenciado.');

let tiro = NaN;
const mix = new Sfx();
mix.pack = {};
mix._gunshot = (_classe, _dist, volume) => { tiro = volume; };
mix.shotWeapon('ak');
expect(Math.abs(tiro - 0.42) < 1e-9,
  `MIX8 ganho padrao da AK deveria ser 0.42 e chegou a ${Number.isFinite(tiro) ? tiro : 'nada'}.`);
expect(audio.includes("get('gunvol')"), 'MIX9 ajuste A/B ?gunvol=N deixou de existir.');

samples.length = 0; spoken.length = 0;
sfx.pack.characterVoice = {
  mandrake: {
    select: ['audio/characters/mandrake/select/select-01.mp3'],
    kill: ['audio/characters/mandrake/kill/kill-01.mp3'],
    radio: ['audio/characters/mandrake/radio/radio-contato.mp3'],
    round: ['audio/characters/mandrake/round/round-01.mp3'],
  },
};
expect(sfx.characterSelectVoice('mandrake', 'F', ['mandrake']) === true
  && samples.at(-1)?.endsWith('/select/select-01.mp3') && spoken.length === 0,
  'MIX9b seleção do funkeiro não prioriza a fala própria aprovada.');
expect(typeof sfx.characterVoice === 'function'
  && sfx.characterVoice('mandrake', 'kill', { fallbackFaction: 'F' }) === true
  && samples.at(-1)?.endsWith('/kill/kill-01.mp3') && spoken.length === 0,
  'MIX9c kill do funkeiro não prioriza a fala própria aprovada.');

expect(netgame.includes("if (!game.sfx.roundNumber(game.roundNum) && !game.sfx.csSound('roundstart'))"),
  'MIX10 countdown multiplayer nao tenta falar o numero do round antes do sting.');
expect(netgame.includes("if (!announced && !game.sfx.general('kill')) game.sfx.voice(game._voiceKey(att.team));"),
  'MIX11 kill multiplayer nao percorre personagem, locutor e faccao sem ficar mudo.');
expect(installer.includes("arg('character-voices')")
  && installer.includes('characterVoice: selectedCharacterVoices')
  && installer.includes('const selectedGeneral = fishAnnouncer?.general || legacyCallouts?.general || null;'),
  'MIX12 instalador não prioriza o locutor Fish nem incorpora as vozes próprias aprovadas.');
expect(game.includes("this.sfx.characterVoice(attacker.def?.id, 'kill'")
  && game.includes("this.sfx.characterVoice(this.playerCharId, 'radio'")
  && game.includes("this.sfx.characterVoice(characterId, 'round'"),
  'MIX13 single-player não roteia kill, rádio e fim de round pelo personagem real.');
expect(netgame.includes("game.sfx.characterVoice(att.def?.id, 'kill'")
  && netgame.includes("this.game.sfx.characterVoice(ent.def?.id, kind"),
  'MIX14 multiplayer não roteia kill e rádio pelo personagem remoto/local real.');
const menuIds = [...menuSelection.matchAll(/'m(\d{2})'/g)].map((match) => `m${match[1]}`);
expect(JSON.stringify(menuIds) === JSON.stringify(['m03', 'm05', 'm10', 'm11', 'm14', 'm16', 'm17', 'm22'])
  && installer.includes("arg('menu-music')") && installer.includes('menuMusic: selectedMenuMusic'),
  `MIX15 rotação/pack do menu não está presa às 8 faixas mantidas (${menuIds.join(', ')}).`);

if (mutante) {
  if (failures.length) {
    console.log(`OK mutante ${mutante}: ${failures.length} clausula(s) vermelha(s); a regua morde.`);
    process.exit(0);
  }
  console.error(`FALHA: mutante ${mutante} sobreviveu.`);
  process.exit(1);
}
if (failures.length) {
  console.error(`AUDIO VOICE MIX VERMELHA (${failures.length})`);
  failures.forEach((failure) => console.error(`  x ${failure}`));
  process.exit(1);
}
console.log('AUDIO VOICE MIX VERDE - efeitos equilibrados; vozes e rounds nunca ficam mudos.');
