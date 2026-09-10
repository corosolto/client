#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const manifestUrl = process.argv.find((arg) => arg.startsWith('--manifest-url='))?.slice(15) || '';
if (mutante && mutante !== 'fu-ia-volta') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const legacy = JSON.parse(readFileSync('tools/eval/audio-fu-v7-pools.json', 'utf8'));
const provenance = JSON.parse(readFileSync('docs/audio/proveniencia.json', 'utf8'));
let audio = readFileSync('public/js/audio.js', 'utf8');
if (mutante === 'fu-ia-volta') {
  const before = audio;
  audio = audio
    .replace('return allowlist ? pool.filter((file) => allowlist.has(file)) : pool;', 'return pool;')
    .replace('const rollback = !!LEGACY_VOICE_ALLOWLIST[fallbackFaction];', 'const rollback = false;')
    .replace('const rollback = !!LEGACY_VOICE_ALLOWLIST[faction];', 'const rollback = false;');
  if (audio === before) throw new Error('mutante fu-ia-volta não aplicou');
}

globalThis.location = { search: '', href: 'http://regua/' };
globalThis.performance ||= { now: () => Date.now() };
const played = [];
globalThis.Audio = class {
  constructor(src) { this.src = decodeURIComponent(src); this.volume = 1; played.push(this.src); }
  addEventListener() {}
  play() { return Promise.resolve(); }
  pause() {}
};

const { Sfx } = await import(`data:text/javascript;base64,${Buffer.from(audio).toString('base64')}#${mutante || 'normal'}`);
const sfx = new Sfx();
sfx._pick = (pool) => pool?.[0] || null;

const rejectedF = 'audio/a/fish-ou-gemini-novo-f.mp3';
const rejectedU = 'audio/a/fish-novo-u.mp3';
sfx.pack = {
  voice: {
    F: [...legacy.F, rejectedF],
    U: [...legacy.U, rejectedU],
    M: ['audio/a/mitico-aprovado.mp3'],
  },
  characterVoice: {
    mandrake: { select: ['audio/a/gemini-mandrake-select.mp3'], kill: ['audio/a/gemini-mandrake-kill.mp3'] },
    funkraiz: { select: ['audio/a/gemini-funkraiz-select.mp3'] },
    pagodeiro: { select: ['audio/a/fish-pagodeiro-select.mp3'], radio: ['audio/a/fish-pagodeiro-radio.mp3'] },
    saci: { kill: ['audio/a/mitico-saci-kill.mp3'] },
  },
};

const failures = [];
const check = (id, ok, detail) => {
  if (!ok) failures.push(`${id}: ${detail}`);
  console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detail}`);
};

const filteredF = sfx._voicePool('F');
const filteredU = sfx._voicePool('U');
check('FU1', JSON.stringify(filteredF) === JSON.stringify(legacy.F),
  `${filteredF.length}/45 entradas históricas F, sem anexos do v8`);
check('FU2', JSON.stringify(filteredU) === JSON.stringify(legacy.U),
  `${filteredU.length}/11 entradas históricas U, sem anexos do v8`);

played.length = 0;
sfx.characterVoice('mandrake', 'kill', { fallbackFaction: 'F' });
check('FU3', played.at(-1) === legacy.F[0],
  `mandrake resolve ${played.at(-1) || 'silêncio'}; esperado pool F v7`);

played.length = 0;
const funkRoster = ['mandrake', 'raul', 'oakley', 'criarj', 'chave', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao'];
sfx.characterSelectVoice('funkraiz', 'F', funkRoster);
check('FU4', played.at(-1) === 'audio/a/d5b87c3d2638e166.mp3',
  `funkraiz resolve ${played.at(-1) || 'silêncio'}; esperado bordão v7`);

played.length = 0;
sfx.characterVoice('pagodeiro', 'radio', { fallbackFaction: 'U' });
check('FU5', played.at(-1) === legacy.U[0],
  `pagodeiro resolve ${played.at(-1) || 'silêncio'}; esperado pool U v7`);

played.length = 0;
sfx.pack.voice.F = [rejectedF];
const closedEvent = sfx.characterVoice('mandrake', 'radio', { fallbackFaction: 'F' });
const closedSelect = sfx.characterSelectVoice('mandrake', 'F', funkRoster);
check('FU6', closedEvent === false && closedSelect === false && played.length === 0,
  'pack F só com take novo fica em silêncio');

played.length = 0;
sfx._lastKillVoice = 0;
const otherFaction = sfx.characterVoice('saci', 'kill', { fallbackFaction: 'M' });
check('FU7', otherFaction === true && played.at(-1) === 'audio/a/mitico-saci-kill.mp3',
  'voz própria aprovada de outra facção permanece alcançável');
check('FU8', !/speechSynthesis|SpeechSynthesisUtterance/.test(audio),
  'runtime continua sem Web Speech ou voz gerada no cliente');
check('FU9', provenance.fontes?.['character-voices-openrouter-gemini']?.deployPrivado?.build === false,
  'ledger revoga o lote Gemini em novos builds privados');

if (manifestUrl) {
  const manifest = await fetch(manifestUrl, { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    return response.json();
  });
  const live = new Sfx();
  live.pack = manifest;
  live._pick = (pool) => pool?.[0] || null;
  const livePlayed = [];
  live._sample = (file) => { livePlayed.push(file); return { pause() {} }; };
  const structuredF = funkRoster.filter((id) => manifest.characterVoice?.[id]);
  const urbanRoster = ['emo', 'blackmetal', 'metaleiro', 'punk', 'skatista', 'clubber', 'rapper', 'reggae', 'pagodeiro'];
  const structuredU = urbanRoster.filter((id) => manifest.characterVoice?.[id]);
  const liveF = live._voicePool('F');
  const liveU = live._voicePool('U');
  const sameSet = (actual, expected) => {
    const a = new Set(actual), e = new Set(expected);
    return a.size === e.size && [...a].every((item) => e.has(item));
  };
  check('FU10', sameSet(liveF, legacy.F) && sameSet(liveU, legacy.U),
    `manifest vivo filtrado para F=${liveF.length} takes únicos, U=${liveU.length}`);
  live.characterVoice('mandrake', 'kill', { fallbackFaction: 'F' });
  const mandrake = livePlayed.pop();
  live.characterSelectVoice('funkraiz', 'F', funkRoster);
  const funkraiz = livePlayed.pop();
  live.characterSelectVoice('clubber', 'U', urbanRoster);
  const clubber = livePlayed.pop();
  check('FU11', structuredF.length === 9 && structuredU.length === 0
    && new Set(legacy.F).has(mandrake)
    && funkraiz === 'audio/a/d5b87c3d2638e166.mp3'
    && clubber === 'audio/a/08290068f8d9935f.mp3',
  `manifest vivo: estruturadas F=${structuredF.length}, U=${structuredU.length}; mandrake=${mandrake || 'silêncio'}; resolvedor retorna v7`);
}

if (mutante) {
  if (failures.length) {
    console.log(`MUTANTE ${mutante} DETECTADO — ${failures.length} cláusula(s) vermelha(s)`);
    process.exit(0);
  }
  console.error(`MUTANTE ${mutante} PASSOU BATIDO`);
  process.exit(1);
}
if (failures.length) {
  console.error(`AUDIO-FU-ROLLBACK VERMELHA (${failures.length})`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log('AUDIO-FU-ROLLBACK verde — F/U usam somente pools v7; take novo falha fechado.');
