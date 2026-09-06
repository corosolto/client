// Contrato do sistema de voz preservado após cancelar os quatro elencos adicionais.
import { readFileSync } from 'node:fs';
const file = path => readFileSync(path, 'utf8');
const audio = file('public/js/audio.js'), game = file('public/js/game.js'), main = file('public/js/main.js');
const manifest = file('tools/gen-audio-manifest.mjs'), generator = file('tools/gen-character-voices.mjs');
const failures = [];
const clauses = [
  ['VOICE1 Sfx.characterVoice com fallback', /characterVoice\s*\(characterId,\s*event/.test(audio) && /fallbackFaction/.test(audio)],
  ['VOICE2 seleção dispara voz do personagem', /characterVoice\(c\.id,\s*'select'/.test(main)],
  ['VOICE3 kill usa attacker.def.id', /characterVoice\(attacker\.def\?\.id,\s*'kill'/.test(game)],
  ['VOICE4 rádio usa playerCharId e b.def.id', /characterVoice\(this\.playerCharId,\s*'radio'/.test(game) && /characterVoice\(b\.def\?\.id,\s*'radio'/.test(game)],
  ['VOICE5 manifest varre characters/', /characterVoice/.test(manifest) && /audio[^\n]*characters|characters[^\n]*audio/i.test(manifest)],
  ['VOICE6 gerador tem dry-run e não sobrescreve sem force', /--dry-run/.test(generator) && /--force/.test(generator)],
];
globalThis.location ||= { search: '' };
const { Sfx } = await import('../../public/js/audio.js');
const probe = new Sfx();
probe.pack = { characterVoice: { teste: { select: ['audio/own.mp3'] } }, voice: { M: ['audio/fallback.mp3'] } };
let sampled = null, paused = false;
probe._sample = (path) => (sampled = path, { pause: () => { paused = true; } });
const ownOk = probe.characterVoice('teste', 'select', { fallbackFaction: 'M', interrupt: true }) && sampled === 'audio/own.mp3';
probe.characterVoice('ausente', 'select', { fallbackFaction: 'M', interrupt: true });
clauses.push(['VOICE7 runtime prefere personagem, interrompe e cai na facção', ownOk && paused && sampled === 'audio/fallback.mp3']);
for (const [name, ok] of clauses) if (!ok) failures.push(name);

if (failures.length) { failures.forEach(f => console.error(f)); process.exit(1); }
console.log(`CHARACTER-VOICE ✓ ${clauses.length}/${clauses.length} runtime/fallback/gerador`);
