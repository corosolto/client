#!/usr/bin/env node
/* Gera candidatos de locucao fora do Git usando somente texto + um voice model
   publico do Fish Audio. A chave vem exclusivamente de FISH_API_KEY. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const REFERENCE_ID = '63e61b8d29cf4279b03b6a59b3d2de98';
const REFERENCE_URL = `https://fish.audio/m/${REFERENCE_ID}`;
const arg = (nome, padrao = '') => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '')
  .split('=').slice(1).join('=') || padrao;
const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
const model = arg('model', 's2.1-pro');
if (!dir) {
  console.error('uso: node tools/audio/generate-fish-announcer.mjs <staging-privado> [--model=s2.1-pro] [--force]');
  process.exit(2);
}
const OUT = resolve(dir);
if (!relative(RAIZ_REPO, OUT).startsWith('..') || OUT === RAIZ_REPO) {
  console.error('recusado: o staging de audio Fish precisa ficar fora do repositorio.');
  process.exit(2);
}
if (process.argv.some((value) => value.startsWith('--api-key='))) {
  console.error('recusado: a chave nao pode vir por argumento; use somente FISH_API_KEY no processo.');
  process.exit(2);
}
const apiKey = process.env.FISH_API_KEY;
if (!apiKey) {
  console.error('FISH_API_KEY ausente. Exporte a chave somente no shell temporario e tente de novo.');
  process.exit(2);
}

export const GENERAL_PHRASES = Object.freeze({
  kill: 'Kill!',
  headshot: 'Headshot!',
  doublekill: 'Double kill!',
  triplekill: 'Triple kill!',
  multikill: 'Multi kill!',
  ultrakill: 'Ultra kill!',
  megakill: 'Mega kill!',
  killingspree: 'Killing spree!',
  godlike: 'Godlike!',
});
export const ROUND_PHRASES = Object.freeze(Object.fromEntries(
  ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].map((word, i) => [String(i + 1), `Round ${word}!`]),
));

const jobs = [
  ...Object.entries(GENERAL_PHRASES).map(([key, text]) => ({ group: 'general', key, text, path: `general/${key}.wav` })),
  ...Object.entries(ROUND_PHRASES).map(([key, text]) => ({ group: 'roundNumbers', key, text, path: `rounds/round-${key.padStart(2, '0')}.wav` })),
];
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const validWav = (buffer) => buffer.length > 44
  && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
  && buffer.subarray(8, 12).toString('ascii') === 'WAVE';

async function synthesize(job) {
  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model,
      },
      body: JSON.stringify({
        text: job.text,
        reference_id: REFERENCE_ID,
        format: 'wav',
        sample_rate: 44100,
        normalize: true,
        temperature: 0.72,
        top_p: 0.75,
        prosody: { speed: 0.92, volume: -1, normalize_loudness: true },
        latency: 'normal',
      }),
    });
    if (response.ok || ![429, 503].includes(response.status) || attempt === 3) break;
    await sleep(attempt * 1500);
  }
  if (!response?.ok) {
    const raw = await response?.text().catch(() => '');
    const detail = (raw || '').slice(0, 300).replaceAll(apiKey, '<redacted>');
    throw new Error(`Fish Audio ${response?.status || 'sem resposta'} em ${job.group}.${job.key}: ${detail}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!validWav(buffer)) throw new Error(`Fish Audio devolveu arquivo invalido em ${job.group}.${job.key}.`);
  return buffer;
}

mkdirSync(OUT, { recursive: true });
const files = [];
for (const [index, job] of jobs.entries()) {
  const target = join(OUT, job.path);
  mkdirSync(dirname(target), { recursive: true });
  let buffer = null;
  if (!force && existsSync(target)) {
    const existing = readFileSync(target);
    if (validWav(existing)) buffer = existing;
  }
  if (!buffer) {
    console.log(`[${index + 1}/${jobs.length}] gerando ${job.group}.${job.key}`);
    buffer = await synthesize(job);
    const temp = `${target}.tmp`;
    writeFileSync(temp, buffer, { mode: 0o600 });
    renameSync(temp, target);
  } else {
    console.log(`[${index + 1}/${jobs.length}] reutilizando ${job.group}.${job.key}`);
  }
  files.push({
    group: job.group, key: job.key, text: job.text, path: job.path,
    bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'),
  });
}

const pools = (group) => Object.fromEntries(files.filter((file) => file.group === group).map((file) => [file.key, [file.path]]));
const manifest = {
  schemaVersion: 1,
  provider: 'fish-audio-api',
  model,
  referenceId: REFERENCE_ID,
  referenceUrl: REFERENCE_URL,
  approval: 'local-candidates-only',
  legalStatus: 'rights-review-required',
  notice: 'Voice model rotulado Mortal Kombat pelo provedor. Nao publicar sem liberar direitos de voz e IP.',
  generatedAt: new Date().toISOString(),
  general: pools('general'),
  roundNumbers: pools('roundNumbers'),
  files,
};
const manifestTmp = join(OUT, 'manifest.json.tmp');
writeFileSync(manifestTmp, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
renameSync(manifestTmp, join(OUT, 'manifest.json'));
console.log(`Fish announcer: ${files.length} candidatos privados gerados em ${OUT}.`);
console.log('Estado: somente escuta local; revisao de direitos obrigatoria antes de release.');
