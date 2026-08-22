#!/usr/bin/env node
/* Transcreve vozes estáticas para provar texto/troca/corte sem fingir avaliar atuação.

   Uso seguro:
     node tools/audit-character-voices-stt.mjs --dry-run
     node tools/audit-character-voices-stt.mjs --out tools/eval/asset-evidence/character-voices-stt.json

   O relatório mede distância de palavras; aprovação de timbre e interpretação continua humana.
*/
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const onlyCharacter = value('--character');
const onlyFaction = value('--faction')?.toUpperCase();
const model = value('--model') || 'openai/whisper-large-v3';
const output = value('--out') || 'tools/eval/asset-evidence/character-voices-stt.json';
if (!dryRun && existsSync(output) && !force) throw new Error(`saída já existe: ${output} (use --force deliberadamente)`);

function loadEnv(file = '.env') {
  const out = {};
  let text; try { text = readFileSync(file, 'utf8'); } catch { return out; }
  for (const line of text.split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let current = match[2].trim();
    if ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'")))
      current = current.slice(1, -1);
    out[match[1]] = current;
  }
  return out;
}

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}

function audioMetrics(file) {
  const ffmpeg = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find(existsSync) || 'ffmpeg';
  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-af',
    'silencedetect=noise=-45dB:d=0.15,volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  if (probe.error) throw probe.error;
  const log = probe.stderr || '';
  const silences = [...log.matchAll(/silence_duration:\s*([\d.]+)/g)].map((match) => +match[1]);
  const duration = +(/Duration:\s*\d\d:\d\d:([\d.]+)/.exec(log)?.[1] || 0);
  const maxVolumeDb = +(/max_volume:\s*(-?[\d.]+) dB/.exec(log)?.[1] || Number.NaN);
  const meanVolumeDb = +(/mean_volume:\s*(-?[\d.]+) dB/.exec(log)?.[1] || Number.NaN);
  const silenceSeconds = silences.reduce((sum, value) => sum + value, 0);
  return { durationSeconds: duration, silenceSeconds: +silenceSeconds.toFixed(3),
    silenceRatio: duration ? +(silenceSeconds / duration).toFixed(3) : null,
    maxVolumeDb: Number.isFinite(maxVolumeDb) ? maxVolumeDb : null,
    meanVolumeDb: Number.isFinite(meanVolumeDb) ? meanVolumeDb : null };
}

const source = JSON.parse(readFileSync('content/voice-lines.json', 'utf8'));
const jobs = [];
for (const [characterId, character] of Object.entries(source.characters || {})) {
  if (onlyCharacter && characterId !== onlyCharacter) continue;
  if (onlyFaction && character.faction !== onlyFaction) continue;
  for (const line of character.lines || []) {
    const file = line.output?.file ? `public/${line.output.file}` : null;
    if (file && existsSync(file)) jobs.push({ characterId, line, file });
  }
}
console.log(JSON.stringify({ dryRun, model, output, files: jobs.length,
  durationSeconds: +jobs.reduce((sum, job) => sum + (job.line.output?.duration || 0), 0).toFixed(2) }, null, 2));
if (dryRun) process.exit(0);
const env = { ...loadEnv(value('--env') || '.env'), ...process.env };
if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY ausente; use --dry-run ou configure fora do git');

const results = [];
for (const [index, job] of jobs.entries()) {
  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'content-type': 'application/json',
      'HTTP-Referer': 'https://game.csbrasil.online', 'X-Title': 'CORO SOLTO: Treta Suprema' },
    body: JSON.stringify({ model, language: 'pt', temperature: 0,
      input_audio: { data: readFileSync(job.file).toString('base64'), format: 'mp3' } }),
  });
  if (!response.ok) throw new Error(`${job.characterId}/${job.line.key}: OpenRouter ${response.status} ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const expectedWords = normalize(job.line.text), actualWords = normalize(payload.text || '');
  const edits = editDistance(expectedWords, actualWords);
  const result = { characterId: job.characterId, key: job.line.key, file: job.line.output.file,
    expected: job.line.text, transcript: payload.text || '', wordEdits: edits,
    expectedWords: expectedWords.length, wordErrorRate: expectedWords.length ? +(edits / expectedWords.length).toFixed(3) : null,
    audio: audioMetrics(job.file), usage: payload.usage || null };
  results.push(result);
  console.log(`${index + 1}/${jobs.length} ${job.characterId}/${job.line.key}: WER ${result.wordErrorRate} — ${result.transcript}`);
}
const receipt = { provider: 'openrouter', model, generatedAt: new Date().toISOString(),
  note: 'STT prova conteúdo aproximado; timbre, interpretação e aprovação continuam humanos.', results };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`STT_EVIDENCE=${output}`);
