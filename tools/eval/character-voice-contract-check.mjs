/* Contrato do áudio por personagem definido em specs/0002, fase 2.

   Os 32 integrantes precisam de 2 falas select, 3 kill e 3 radio; o runtime escolhe pelo
   `def.id`/`playerCharId` e cai na voz da facção se o MP3 faltar. O texto é a fonte da
   legenda. `--mutante=fala-longa` injeta uma fala curta com 30 palavras; `--mutante=estigma`
   repõe a piada de desorientação rejeitada na revisão adversarial. `--mutante=spec-estigma`
   repõe a mesma frase apenas na ficha canônica, para provar que o lote futuro também está
   coberto. Todos devem reprovar.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const file = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const audio = file('public/js/audio.js');
const game = file('public/js/game.js');
const main = file('public/js/main.js');
const manifest = file('tools/gen-audio-manifest.mjs');
const generator = file('tools/gen-character-voices.mjs');
const sourcePath = 'content/voice-lines.json';
const data = existsSync(sourcePath) ? JSON.parse(file(sourcePath)) : { characters: {} };
const audioManifestPath = 'public/audio/manifest.json';
const audioManifest = existsSync(audioManifestPath) ? JSON.parse(file(audioManifestPath)) : {};
const roster = {
  T: ['camera-roxa', 'claquete-verde', 'microfonildo', 'controlino', 'capivara-reporter', 'chroma-rex', 'fantoche-ibope', 'nuvem-tempo'],
  N: ['programador-virado', 'designer-ux', 'streamer-tiltado', 'otaku-bairro', 'mestre-rpg', 'lenda-lanhouse', 'hacker-wifi', 'formata-vinte'],
  R: ['motoca-cachorro-loko', 'tia-pastel', 'motorista-app', 'motorista-onibus', 'pedreiro-grau', 'camelo-ambulante', 'feirante-grito', 'frentista-posto'],
  O: ['doidinho-bairro', 'noia-esquina', 'fumador-pendrive', 'mago-cobre', 'dj-bluetooth', 'profeta-calcada', 'ciclista-sem-freio', 'homem-carrinho'],
  F: ['mandrake', 'raul', 'oakley', 'criarj', 'chave', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao'],
};
const ids = Object.values(roster).flat();
const factionById = new Map(Object.entries(roster).flatMap(([faction, factionIds]) => factionIds.map((id) => [id, faction])));
const pilotIds = new Set(['camera-roxa', 'programador-virado', 'motoca-cachorro-loko', 'doidinho-bairro']);
const expectedKeys = ['select-01', 'select-02', 'kill-01', 'kill-02', 'kill-03', 'radio-contato', 'radio-avanco', 'radio-cobertura'];
const expectedKeysFor = (id) => factionById.get(id) === 'F'
  ? ['select-01', 'kill-01', 'radio-contato', 'round-01'] : expectedKeys;
const MUT = process.argv.includes('--mutante=fala-longa');
const MUT_STIGMA = process.argv.includes('--mutante=estigma');
const MUT_SPEC_STIGMA = process.argv.includes('--mutante=spec-estigma');
const MUT_RELEASE_HASH = process.argv.includes('--mutante=release-hash');
const MUT_FUNKEIRO = process.argv.includes('--mutante=funkeiro-sem-radio');
const MUT_FUNKEIRO_ROUND = process.argv.includes('--mutante=funkeiro-sem-round');
const RELEASE = process.argv.includes('--release') || MUT_RELEASE_HASH;
const GENERATED = process.argv.includes('--generated');
const VERIFY_OUTPUTS = RELEASE || GENERATED;
const failures = [];
const rejectedConfusionJokes = /ontem\s+amanhã|confirmado\s+talvez/i;
const rejectedStigma = /\b(?:crack|seringa(?:s)?|mendigo(?:s)?|drogad[oa]s?|viciad[oa]s?|doente(?:s)?\s+menta(?:l|is)|morador(?:es)?\s+de\s+rua)\b/i;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

if (RELEASE) {
  const license = data.providerPolicy?.license || '';
  if (!license || /pending/i.test(license)) failures.push('release: licença comercial continua pendente');
  if (data.providerPolicy?.noVoiceCloning !== true) failures.push('release: noVoiceCloning precisa ser true');
}

for (const [charIndex, id] of ids.entries()) {
  const character = data.characters?.[id] || {};
  const lines = (MUT_FUNKEIRO || MUT_FUNKEIRO_ROUND) && id === 'mandrake'
    ? (character.lines || []).filter((line) => line.event !== (MUT_FUNKEIRO ? 'radio' : 'round'))
    : character.lines || [];
  if (character.faction !== factionById.get(id))
    failures.push(`${id}: facção ${character.faction || 'ausente'}, esperado ${factionById.get(id)}`);
  if (!character.voiceId) failures.push(`${id}: voiceId sintético ausente`);
  if (!character.voiceDesign || !/(?:fictíci[oa]|sem\s+[^.]{0,90}(?:imit|copi|clon|pessoa\s+real|personagem\s+existente|referência))/i.test(character.voiceDesign))
    failures.push(`${id}: voiceDesign precisa vedar imitação/clone/referência pessoal`);
  const counts = Object.fromEntries(['select', 'kill', 'radio'].map((event) =>
    [event, lines.filter((line) => line.event === event).length]));
  const expectedCounts = factionById.get(id) === 'F' ? [1, 1, 1, 1] : [2, 3, 3, 0];
  const roundCount = lines.filter((line) => line.event === 'round').length;
  if (counts.select !== expectedCounts[0] || counts.kill !== expectedCounts[1] || counts.radio !== expectedCounts[2])
    failures.push(`${id}: select/kill/radio ${counts.select}/${counts.kill}/${counts.radio}, esperado ${expectedCounts.join('/')}`);
  if (roundCount !== expectedCounts[3])
    failures.push(`${id}: round ${roundCount}, esperado ${expectedCounts[3]}`);
  for (const [lineIndex, line] of lines.entries()) {
    const text = MUT && charIndex === 0 && lineIndex === 0
      ? Array(30).fill('demorada').join(' ')
      : MUT_STIGMA && id === 'noia-esquina' && lineIndex === 0
        ? 'Esse mendigo vive de crack!' : line.text || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words > 14) failures.push(`${id}/${line.key || lineIndex}: ${words} palavras (>14)`);
    if (!line.direction) failures.push(`${id}/${line.key || lineIndex}: direção ausente`);
    if (factionById.get(id) === 'O' && (rejectedConfusionJokes.test(text) || rejectedStigma.test(text)))
      failures.push(`${id}/${line.key || lineIndex}: estigma/desorientação; usar caos e gambiarra`);
    if (VERIFY_OUTPUTS) {
      const expectedUrl = `audio/characters/${id}/${line.event}/${line.key}.mp3`;
      const output = line.output;
      if (!output) {
        failures.push(`${id}/${line.key || lineIndex}: MP3/recibo de geração ausente`);
        continue;
      }
      if (output.file !== expectedUrl) failures.push(`${id}/${line.key}: caminho ${output.file}, esperado ${expectedUrl}`);
      const diskPath = `public/${output.file || ''}`;
      if (!existsSync(diskPath)) failures.push(`${id}/${line.key}: arquivo ausente em ${diskPath}`);
      else if (!/^[0-9a-f]{64}$/i.test(output.sha256 || '') || sha256(readFileSync(diskPath)) !== output.sha256)
        failures.push(`${id}/${line.key}: SHA-256 não confere`);
      const durationLimit = line.event === 'select' ? 4 : 3;
      if (!(Number.isFinite(output.duration) && output.duration > 0 && output.duration <= durationLimit))
        failures.push(`${id}/${line.key}: duração ${output.duration ?? 'ausente'} fora de 0-${durationLimit}s`);
      if (output.voiceId !== character.voiceId || output.provider !== data.providerPolicy?.primary
          || output.modelId !== data.providerPolicy?.modelId || output.license !== data.providerPolicy?.license)
        failures.push(`${id}/${line.key}: recibo diverge de voiceId/provedor/modelo/licença`);
      if (!Number.isFinite(Date.parse(output.generatedAt || '')))
        failures.push(`${id}/${line.key}: generatedAt inválido`);
      if (!pilotIds.has(id) && (!output.generationId || !Number.isFinite(output.costUsd) || output.costUsd < 0))
        failures.push(`${id}/${line.key}: recibo de custo/generationId ausente`);
      const inPool = audioManifest.characterVoice?.[id]?.[line.event]?.includes(output.file);
      if (!inPool || audioManifest.characterVoiceText?.[output.file] !== line.text)
        failures.push(`${id}/${line.key}: voz/legenda ausente ou divergente no manifest.json`);
    }
  }
  const keys = lines.map((line) => line.key);
  const expectedForCharacter = expectedKeysFor(id);
  if (JSON.stringify(keys) !== JSON.stringify(expectedForCharacter))
    failures.push(`${id}: chaves/ordem ${keys.join(',') || 'ausentes'}, esperado ${expectedForCharacter.join(',')}`);
  if (RELEASE && character.status !== 'approved') failures.push(`${id}: status ${character.status || 'ausente'}, esperado approved após escuta`);
  if (GENERATED && character.status !== 'generated') failures.push(`${id}: status ${character.status || 'ausente'}, esperado generated (escuta pendente)`);
}

// Mutação autocontida: o verificador de recibo precisa distinguir o conteúdo real
// de um SHA inventado mesmo antes de os MP3 pagos existirem nesta máquina.
if (MUT_RELEASE_HASH) {
  const fixture = Buffer.from('voz-original-do-jogo');
  if (sha256(fixture) !== '0'.repeat(64)) failures.push('mutante release-hash: SHA adulterado detectado');
}

// O JSON servido já tinha sido corrigido, mas specs/0002 continuou contendo a fala
// rejeitada e poderia reintroduzi-la ao gerar os outros sete integrantes. O contrato
// editorial cobre também as duas fontes que dirigem a produção, não só o runtime.
for (const [index, path] of [
  'specs/0002-novas-faccoes/spec.md',
  'plans/19-NOVAS-FACCOES-VERTICAL-SLICES.md',
].entries()) {
  const original = file(path);
  if (!original) {
    failures.push(`${path}: fonte editorial ausente`);
    continue;
  }
  const text = MUT_SPEC_STIGMA && index === 0 ? `${original}\nEu avisei ontem amanhã!\n` : original;
  if (rejectedConfusionJokes.test(text))
    failures.push(`${path}: conserva humor de desorientação rejeitado; usar gambiarra`);
}

const clauses = [
  ['VOICE1 Sfx.characterVoice com fallback', /characterVoice\s*\(characterId,\s*event/.test(audio) && /fallbackFaction/.test(audio)],
  ['VOICE2 seleção dispara voz do personagem', /characterVoice\(c\.id,\s*'select'/.test(main)],
  ['VOICE3 kill usa attacker.def.id', /characterVoice\(attacker\.def\?\.id,\s*'kill'/.test(game)],
  ['VOICE4 rádio usa playerCharId e b.def.id', /characterVoice\(this\.playerCharId,\s*'radio'/.test(game) && /characterVoice\(b\.def\?\.id,\s*'radio'/.test(game)],
  ['VOICE5 manifest varre characters e eventos de round', /characterVoice/.test(manifest) && /'round'/.test(manifest) && /audio[^\n]*characters|characters[^\n]*audio/i.test(manifest)],
  ['VOICE6 gerador tem dry-run e não sobrescreve sem force', /--dry-run/.test(generator) && /--force/.test(generator)],
];
globalThis.location ||= { search: '' };
const { Sfx } = await import('../../public/js/audio.js');
const probe = new Sfx();
probe.pack = { characterVoice: { teste: { select: ['audio/own.mp3'] } }, voice: { T: ['audio/fallback.mp3'] } };
let sampled = null, paused = false;
probe._sample = (path) => (sampled = path, { pause: () => { paused = true; } });
const ownOk = probe.characterVoice('teste', 'select', { fallbackFaction: 'T', interrupt: true }) && sampled === 'audio/own.mp3';
probe.characterVoice('ausente', 'select', { fallbackFaction: 'T', interrupt: true });
clauses.push(['VOICE7 runtime prefere personagem, interrompe e cai na facção', ownOk && paused && sampled === 'audio/fallback.mp3']);
clauses.push(['VOICE8 vencedor dispara fala final curta', /_roundWinnerVoice\(winner\)/.test(game) && /_roundWinnerVoice\(team\)/.test(game) && /characterVoice\(characterId, 'round'/.test(game)]);
for (const [name, ok] of clauses) if (!ok) failures.push(name);

if (failures.length) {
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`CHARACTER-VOICE ✓ ${ids.length} personagens (32 × 8 + Funkeiros × 4) + runtime/fallback/gerador${VERIFY_OUTPUTS ? ` + ${RELEASE ? 'release aprovado' : 'generated/escuta pendente'}/licença/SHA/manifest/recibos` : ''}`);
