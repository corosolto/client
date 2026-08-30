#!/usr/bin/env node
/* A fala pertence ao clique no avatar, não à seleção automática que monta a tela.
   O índice no elenco precisa produzir um arquivo distinto do pool da própria facção,
   e personagens com bordão conhecido precisam manter a identidade mesmo se o pool mudar. */
import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !['sem-clique', 'auto-fala', 'mesmo-som', 'sem-identidade', 'troca-clubber-rasta', 'faria-volta-lula', 'pack-antigo'].includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

let main = readFileSync('public/js/main.js', 'utf8');
let fetchAudio = readFileSync('scripts/fetch-audio.sh', 'utf8');
if (mutante === 'sem-clique') {
  main = main.replace(
    'row.onclick = () => selectCharacterFromAvatar(c, row, chars);',
    'row.onclick = () => selectChar(c, row);',
  );
}
if (mutante === 'auto-fala') {
  main = main.replace('if (row) selectChar(character, row);', 'row?.click();');
}
if (mutante === 'pack-antigo') fetchAudio = fetchAudio.replace('audio-pack-v6', 'audio-pack-v5');

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };
const selectStart = main.indexOf('function selectChar(c, row) {');
let depth = 0, selectEnd = -1;
for (let i = main.indexOf('{', selectStart); i >= 0 && i < main.length; i += 1) {
  if (main[i] === '{') depth += 1;
  if (main[i] === '}' && --depth === 0) { selectEnd = i + 1; break; }
}
const selectBody = selectStart >= 0 && selectEnd > selectStart ? main.slice(selectStart, selectEnd) : '';

expect(/row\.onclick\s*=\s*\(\)\s*=>\s*selectCharacterFromAvatar\(c, row, chars\)/.test(main),
  'VOICE1 o clique do avatar não chama o fluxo de fala');
expect(/function selectCharacterFromAvatar\(c, row, roster\)[\s\S]*selectChar\(c, row\)[\s\S]*characterSelectVoice\(c\.id, c\.team, roster\.map/.test(main),
  'VOICE2 o fluxo clicado não seleciona e fala pelo id/facção/elenco reais');
expect(!/characterSelectVoice/.test(selectBody),
  'VOICE3 selectChar fala durante a montagem automática da tela');
expect(!/row\?\.click\(\)/.test(main),
  'VOICE4 a query string simula clique humano e dispara fala');
expect(/releases\/download\/audio-pack-v8\/audio-pack\.zip/.test(fetchAudio),
  'VOICE12 o build não baixa o pacote com as vozes do time Mítico e o upgrade dos funkeiros (v8; inclui o Faria Limer corrigido e o menu Suno do v7)');

globalThis.location ||= { search: '' };
const { Sfx } = await import('../../public/js/audio.js');
const probe = new Sfx();
probe.pack = { voice: { T: ['audio/t-0.mp3', 'audio/t-1.mp3', 'audio/t-2.mp3'] } };
const played = [];
let paused = 0;
probe._sample = (file) => { played.push(file); return { pause: () => { paused += 1; } }; };
if (mutante === 'mesmo-som') {
  probe.characterSelectVoice = function () {
    this._characterSelectAudio?.pause();
    this._characterSelectAudio = this._sample(this.pack.voice.T[0]);
    return true;
  };
}

const roster = ['alfa', 'beta', 'gama'];
if (typeof probe.characterSelectVoice === 'function') {
  const results = roster.map((id) => probe.characterSelectVoice(id, 'T', roster));
  probe.characterSelectVoice('alfa', 'T', roster);
  expect(results.every(Boolean), 'VOICE5 algum personagem com pool suficiente ficou sem fala');
  expect(new Set(played.slice(0, 3)).size === roster.length,
    `VOICE6 personagens compartilharam fala: ${played.slice(0, 3).join(', ')}`);
  expect(played[0] === played[3], 'VOICE7 o mesmo personagem mudou de fala entre cliques');
  expect(paused === 3, `VOICE8 a fala anterior não foi interrompida (pausas=${paused})`);
  probe.speechEnabled = false;
  expect(probe.characterSelectVoice('beta', 'T', roster) === false && played.length === 4,
    'VOICE9 a preferência de desligar falas não foi respeitada');
} else {
  failures.push('VOICE5 Sfx.characterSelectVoice não existe');
}

const voice = {
  E: [
    'audio/a/08290068f8d9935f.mp3', 'audio/a/4329db27852691d2.mp3',
    'audio/a/31d1d7d947c3ef9f.mp3', 'audio/a/64e819ba2bb74260.mp3',
    'audio/a/7b47311cd2145ca5.mp3', 'audio/a/318f54a1b727550d.mp3',
    'audio/a/105ae74fefea3bd0.mp3', 'audio/a/d0cbfa48cb69c0e4.mp3',
    'audio/a/cc77ec4f134a71ba.mp3',
  ],
  B: [
    'audio/a/fc5bf11f5b8287f5.mp3', 'audio/a/498a8d5c67b525f7.mp3',
    'audio/a/53f12f5f3f70279f.mp3', 'audio/a/55678d5886537476.mp3',
    'audio/a/de46aa01bf0536c0.mp3', 'audio/a/28bdd9175f8338dc.mp3',
    'audio/a/33a0d106ef0cfc05.mp3', 'audio/a/ce8b872c7b338955.mp3',
    'audio/a/d4293b376e11b00f.mp3',
  ],
  U: [
    'audio/a/b5242f85607ebaab.mp3', 'audio/a/9da8f773246c8a52.mp3',
    'audio/a/08290068f8d9935f.mp3', 'audio/a/68f5020a85ddcc19.mp3',
    'audio/a/367e076ce5f06810.mp3', 'audio/a/f180be207d0b440b.mp3',
    'audio/a/c8ac59c01c879673.mp3', 'audio/a/328140743c79f962.mp3',
    'audio/a/bbc7294183784969.mp3', 'audio/a/fe496d769d8c6dc8.mp3',
    'audio/a/d983d18b544ff48a.mp3',
  ],
  F: [
    'audio/a/9cef270856898158.mp3', 'audio/a/4329db27852691d2.mp3',
    'audio/a/748d29b120ec101a.mp3', 'audio/a/8739926e33a4e7c1.mp3',
    'audio/a/9dc9797e88094f17.mp3', 'audio/a/f97622e12fe31d31.mp3',
    'audio/a/5824ce67c28f9b0e.mp3', 'audio/a/5468d1161dc1da1e.mp3',
    'audio/a/ba0cf9e4cd794621.mp3', 'audio/a/7ab54e035e2be080.mp3',
    'audio/a/d5b87c3d2638e166.mp3',
  ],
};
const identityCases = [
  { id: 'gotinha', faction: 'E', roster: ['esquerdomacho', 'sindicato', 'mst', 'doutora', 'mistico', 'gotinha', 'hipster', 'et'], expected: 'audio/a/cc77ec4f134a71ba.mp3' },
  { id: 'farialimer', faction: 'B', roster: ['caminhoneiro', 'sertanejo', 'coach', 'farialimer', 'bombado', 'dollynho', 'ancap', 'canarinho', 'proerd'], expected: 'audio/a/fc5bf11f5b8287f5.mp3' },
  { id: 'dollynho', faction: 'B', roster: ['caminhoneiro', 'sertanejo', 'coach', 'farialimer', 'bombado', 'dollynho', 'ancap', 'canarinho', 'proerd'], expected: 'audio/a/dc26854fa366d0ec.mp3' },
  { id: 'clubber', faction: 'U', roster: ['emo', 'blackmetal', 'metaleiro', 'punk', 'skatista', 'clubber', 'rapper', 'reggae', 'pagodeiro'], expected: 'audio/a/08290068f8d9935f.mp3' },
  { id: 'reggae', faction: 'U', roster: ['emo', 'blackmetal', 'metaleiro', 'punk', 'skatista', 'clubber', 'rapper', 'reggae', 'pagodeiro'], expected: 'audio/a/f180be207d0b440b.mp3' },
  { id: 'funkraiz', faction: 'F', roster: ['mandrake', 'raulfranja', 'oakley', 'criarj', 'chavesp', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao'], expected: 'audio/a/d5b87c3d2638e166.mp3' },
];
const identityProbe = new Sfx();
identityProbe.pack = { voice };
const identityPlayed = [];
identityProbe._sample = (file) => { identityPlayed.push(file); return { pause() {} }; };
if (mutante === 'sem-identidade') {
  identityProbe.characterSelectVoice = function (characterId, faction, rosterIds) {
    const file = this.pack.voice[faction]?.[rosterIds.indexOf(characterId)];
    this._characterSelectAudio = file ? this._sample(file) : null;
    return !!this._characterSelectAudio;
  };
}
if (mutante === 'troca-clubber-rasta') {
  const original = identityProbe.characterSelectVoice;
  identityProbe.characterSelectVoice = function (characterId, faction, rosterIds) {
    const swapped = characterId === 'clubber' ? 'reggae' : characterId === 'reggae' ? 'clubber' : characterId;
    return original.call(this, swapped, faction, rosterIds);
  };
}
if (mutante === 'faria-volta-lula') {
  const original = identityProbe.characterSelectVoice;
  identityProbe.characterSelectVoice = function (characterId, faction, rosterIds) {
    if (characterId === 'farialimer') {
      this._characterSelectAudio = this._sample('audio/a/55678d5886537476.mp3');
      return true;
    }
    return original.call(this, characterId, faction, rosterIds);
  };
}
for (const testCase of identityCases) {
  const before = identityPlayed.length;
  const result = identityProbe.characterSelectVoice(testCase.id, testCase.faction, testCase.roster);
  const actual = identityPlayed[before];
  expect(result && actual === testCase.expected,
    `VOICE10 ${testCase.id} tocou ${actual || 'nada'}; esperado ${testCase.expected}`);
}
const urbanRoster = identityCases.find(({ id }) => id === 'clubber').roster;
const urbanStart = identityPlayed.length;
for (const id of urbanRoster) identityProbe.characterSelectVoice(id, 'U', urbanRoster);
const urbanFiles = identityPlayed.slice(urbanStart);
expect(new Set(urbanFiles).size === urbanRoster.length,
  `VOICE11 bordões reservados colidiram dentro de Urbanas: ${urbanFiles.join(', ')}`);

if (mutante) {
  if (failures.length) {
    console.log(`✓ mutante ${mutante}: ${failures.length} cláusula(s) vermelha(s); a régua morde`);
    process.exit(0);
  }
  console.error(`✗ mutante ${mutante} sobreviveu`);
  process.exit(1);
}

if (failures.length) {
  console.error(`CHARACTER-SELECT-VOICE VERMELHA (${failures.length})`);
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}
console.log('CHARACTER-SELECT-VOICE VERDE — clique fala; montagem silencia; identidade e bordões preservados.');
