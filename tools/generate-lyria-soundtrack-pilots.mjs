#!/usr/bin/env node
/*
 * Gera pilotos isolados de trilha via OpenRouter/Lyria. Os MP3s ficam em
 * soundtrack/ apenas para escuta; não roda o manifesto, não toca no menu e não
 * declara direito comercial. A confirmação do plano/termos é uma decisão humana.
 *
 * Uso:
 *   node tools/generate-lyria-soundtrack-pilots.mjs --dry-run
 *   node tools/generate-lyria-soundtrack-pilots.mjs --env /caminho/.env
 *   node tools/generate-lyria-soundtrack-pilots.mjs --max-cost-usd 3
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUTPUT_DIR = 'public/audio/soundtrack';
const LEDGER = join(OUTPUT_DIR, 'SOURCES.md');
const RECEIPT = 'tools/eval/asset-evidence/lyria-soundtrack-pilots.json';
const DEFAULT_MODEL = 'google/lyria-3-clip-preview';
const TERMS_URL = 'https://openrouter.ai/terms';
const BEGIN = '<!-- AUDIO-PROVENANCE:BEGIN -->';
const END = '<!-- AUDIO-PROVENANCE:END -->';
const PILOTS = [
  {
    id: 'pilot-boombap-menor',
    prompt: '78 BPM original Brazilian street-rap gameplay instrumental. Minor-key vinyl-worn drum break, deliberate kick and snare, low electric bass, sparse two-note piano motif, short turntable-like texture made from original sound design, tense nighttime São Paulo concrete mood. Leave space between hits; no trap hi-hat rolls, no reggaeton/dembow, no salsa or Latin-pop brass, no vocals, no spoken words, no artist imitation, no melody from an existing song.',
  },
  {
    id: 'pilot-hardcore-industrial',
    prompt: '161 BPM original Brazilian hardcore-industrial FPS instrumental. Down-tuned distorted guitar plays a short mechanical two-bar riff; dry floor-tom and snare attack, clipped bass, brief machine-stop breaks, abrasive rehearsal-room recording, no polished trailer orchestra. Make it confrontational and physical, not metal virtuoso; no vocals, no spoken words, no artist imitation, no melody from an existing song.',
  },
  {
    id: 'pilot-reggae-rock-frigio',
    prompt: '108 BPM original Brazilian street reggae-rock gameplay instrumental in a dark Phrygian color. Offbeat muted electric-guitar chops, dub bass pulse, restrained Brazilian percussion, one rough guitar hook, roomy street-band recording and a tense stop-start bridge. Avoid tropical resort mood, ska cheerfulness, Latin-pop horns and glossy EDM; no vocals, no spoken words, no artist imitation, no melody from an existing song.',
  },
  {
    id: 'pilot-mandelao-escuro',
    prompt: '129 BPM original Brazilian mandelao gameplay instrumental. Hard dry tamborzao and caixa pattern, one dark 808 sub note, low-pass distorted vocal-free texture made from original synthesis, minimal percussion breaks and a raw bedroom-speaker mix. Keep the rhythm Brazilian baile, not reggaeton or generic Latin dance; no melodic lead, no vocals, no spoken words, no artist imitation, no melody from an existing song.',
  },
  {
    id: 'pilot-forro-rua',
    prompt: '112 BPM original Brazilian urban forro gameplay instrumental. Zabumba low pulse, sharp triangle syncopation, compact accordion phrases and dry electric-bass response, bright major harmony with a slightly dirty street-recording texture. It should drive an FPS round, not a tourist postcard: no EDM drop, no pan-Latin rhythm, no vocals, no spoken words, no artist imitation, no melody from an existing song.',
  },
];

const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const resume = args.includes('--resume');
const preflightOnly = args.includes('--preflight');
const model = value('--model', DEFAULT_MODEL);
const maxCostUsd = Number(value('--max-cost-usd', '3'));
const envFile = value('--env', '.env');
const only = new Set(String(value('--only', '')).split(',').map((id) => id.trim()).filter(Boolean));
if (only.size) {
  const unknown = [...only].filter((id) => !PILOTS.some((pilot) => pilot.id === id));
  if (unknown.length) throw new Error(`--only desconhece: ${unknown.join(', ')}`);
  const chosen = PILOTS.filter((pilot) => only.has(pilot.id));
  PILOTS.splice(0, PILOTS.length, ...chosen);
}
if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) throw new Error('--max-cost-usd precisa ser positivo');

function loadEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) return [];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

const ENV = { ...loadEnv(envFile), ...process.env };
const apiKey = ENV.OPENROUTER_API_KEY;
const redact = (value) => apiKey ? String(value ?? '').split(apiKey).join('***REDACTED***') : String(value ?? '');
const headers = {
  Authorization: `Bearer ${apiKey || ''}`,
  'content-type': 'application/json',
  'HTTP-Referer': 'https://game.csbrasil.online',
  'X-Title': 'CSBRASIL soundtrack pilots',
};
const ffmpeg = ENV.FFMPEG || ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find(existsSync) || 'ffmpeg';
const ffprobe = ENV.FFPROBE || ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe'].find(existsSync) || 'ffprobe';

async function jsonRequest(url) {
  const response = await fetch(url, { headers });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${redact(body.slice(0, 700))}`);
  try { return JSON.parse(body); } catch { throw new Error(`JSON inválido de ${url}`); }
}

function duration(file) {
  return Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function audioFromSse(sse) {
  let base64 = '';
  for (const line of sse.split(/\r?\n/)) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    try { base64 += JSON.parse(line.slice(6)).choices?.[0]?.delta?.audio?.data || ''; } catch { /* stream chunk não-JSON */ }
  }
  return base64 ? Buffer.from(base64, 'base64') : null;
}

function loadLedger() {
  const source = readFileSync(LEDGER, 'utf8');
  const start = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (start < 0 || end < 0 || end <= start) throw new Error(`${LEDGER} não tem marcadores de procedência`);
  const fragment = source.slice(start + BEGIN.length, end).replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
  return { source, start, end, data: JSON.parse(fragment) };
}

function writeLedger(records) {
  const ledger = loadLedger();
  const withoutPilots = ledger.data.assets.filter((asset) => !PILOTS.some((pilot) => asset.path === `soundtrack/${pilot.id}.mp3`));
  const next = { ...ledger.data, assets: [...withoutPilots, ...records] };
  const replacement = `${BEGIN}\n\`\`\`json\n${JSON.stringify(next, null, 2)}\n\`\`\`\n${END}`;
  writeFileSync(LEDGER, `${ledger.source.slice(0, ledger.start)}${replacement}${ledger.source.slice(ledger.end + END.length)}`);
}

async function receiptFor(generationId) {
  if (!generationId) return { costUsd: null, usage: null };
  let last;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    try {
      const data = await jsonRequest(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`);
      const cost = Number(data.data?.total_cost ?? data.data?.usage?.cost);
      if (Number.isFinite(cost)) return { costUsd: cost, usage: data.data?.usage ?? null };
      last = new Error('total_cost ausente');
    } catch (error) { last = error; }
  }
  return { costUsd: null, usage: null, error: redact(last?.message || last) };
}

console.log(`LYRIA-SOUNDTRACK ${PILOTS.length} pilotos · ${model} · teto US$ ${maxCostUsd.toFixed(2)}`);
for (const pilot of PILOTS) console.log(`  soundtrack/${pilot.id}.mp3`);
if (dryRun) {
  console.log('DRY-RUN: nenhuma rede, crédito ou escrita.');
  process.exit(0);
}
if (!apiKey) throw new Error(`OPENROUTER_API_KEY ausente; use --env com uma credencial local fora do git`);

const [models, endpoints, credits] = await Promise.all([
  jsonRequest('https://openrouter.ai/api/v1/models'),
  jsonRequest(`https://openrouter.ai/api/v1/models/${model}/endpoints`),
  jsonRequest('https://openrouter.ai/api/v1/credits'),
]);
const modelData = models.data?.find((candidate) => candidate.id === model) || endpoints.data;
const endpointList = endpoints.data?.endpoints || [];
if (modelData?.id !== model || !endpointList.length) throw new Error(`preflight: ${model} não está disponível no OpenRouter`);
const totalCredits = Number(credits.data?.total_credits);
const totalUsage = Number(credits.data?.total_usage);
const balanceUsd = totalCredits - totalUsage;
if (!Number.isFinite(balanceUsd) || balanceUsd <= 0) throw new Error('preflight: saldo OpenRouter indisponível ou insuficiente');
console.log(`PREFLIGHT ✓ ${model} disponível · saldo US$ ${balanceUsd.toFixed(4)} · ${endpointList.length} endpoint(s)`);
if (preflightOnly) process.exit(0);

const receipt = {
  schemaVersion: 1,
  provider: 'OpenRouter',
  model,
  startedAt: new Date().toISOString(),
  completedAt: null,
  status: 'running',
  maxCostUsd,
  totalCostUsd: 0,
  accountPlan: 'pending confirmation',
  commercialUse: false,
  note: 'Pilotos de escuta. Plano, termos e direito comercial não foram confirmados; não integrar ao pacote/publicação.',
  preflight: { endpointCount: endpointList.length, pricing: modelData.pricing || endpointList[0]?.pricing || null },
  completed: [],
  failures: [],
};
if (resume && existsSync(RECEIPT)) {
  const previous = JSON.parse(readFileSync(RECEIPT, 'utf8'));
  for (const item of previous.completed || []) {
    if (PILOTS.some((pilot) => pilot.id === item.id) && item.file && existsSync(item.file)) {
      receipt.completed.push(item);
      receipt.totalCostUsd += Number(item.costUsd) || 0;
    }
  }
}
const persistReceipt = () => {
  mkdirSync(dirname(RECEIPT), { recursive: true });
  writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
};
persistReceipt();

const records = receipt.completed.map((item) => ({
  path: `soundtrack/${item.id}.mp3`, kind: 'generated', provider: 'OpenRouter', model,
  accountPlan: 'pending confirmation', generatedAt: item.generatedAt, generationId: item.generationId || 'pending receipt', termsUrl: TERMS_URL,
  commercialUse: false, rightsBasis: 'Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.', sha256: item.sha256,
}));
let spent = receipt.totalCostUsd;
for (const [index, pilot] of PILOTS.entries()) {
  const output = join(OUTPUT_DIR, `${pilot.id}.mp3`);
  if (resume && receipt.completed.some((item) => item.id === pilot.id && existsSync(output))) {
    console.log(`↷ ${index + 1}/${PILOTS.length} ${pilot.id} já registrado; retomando sem nova chamada`);
    continue;
  }
  if (existsSync(output) && !force) throw new Error(`${output} já existe; use --force deliberadamente`);
  if (spent >= maxCostUsd) throw new Error(`teto atingido antes de ${pilot.id}: US$ ${spent.toFixed(6)}`);
  let raw = null;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers,
      body: JSON.stringify({
        model, stream: true, modalities: ['text', 'audio'], audio: { format: 'wav' },
        messages: [{ role: 'user', content: `Generate a 30-second original instrumental gameplay music pilot. ${pilot.prompt}` }],
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter ${response.status} ${redact((await response.text()).slice(0, 700))}`);
    const bytes = audioFromSse(await response.text());
    if (!bytes?.length) throw new Error(`${pilot.id}: resposta Lyria não continha áudio SSE`);
    const generationId = response.headers.get('x-generation-id');
    const providerReceipt = await receiptFor(generationId);
    if (providerReceipt.costUsd !== null) {
      spent += providerReceipt.costUsd;
      receipt.totalCostUsd = +spent.toFixed(10);
    }
    if (spent > maxCostUsd) throw new Error(`${pilot.id}: teto excedido após chamada (US$ ${spent.toFixed(6)} > US$ ${maxCostUsd.toFixed(2)})`);
    mkdirSync(dirname(output), { recursive: true });
    raw = `${output}.raw.wav`;
    writeFileSync(raw, bytes);
    const candidate = `${output}.new.mp3`;
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', raw,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '128k', candidate]);
    renameSync(candidate, output);
    const seconds = duration(output);
    if (!Number.isFinite(seconds) || seconds < 10 || seconds > 60) throw new Error(`${pilot.id}: duração inválida ${seconds}`);
    const hash = sha256(output);
    const generatedAt = new Date().toISOString();
    const item = { id: pilot.id, file: output, sha256: hash, durationSeconds: +seconds.toFixed(3), generationId,
      costUsd: providerReceipt.costUsd, costReceiptError: providerReceipt.error || null, generatedAt, prompt: pilot.prompt };
    receipt.completed.push(item);
    records.push({
      path: `soundtrack/${pilot.id}.mp3`, kind: 'generated', provider: 'OpenRouter', model,
      accountPlan: 'pending confirmation', generatedAt, generationId: generationId || 'pending receipt', termsUrl: TERMS_URL,
      commercialUse: false, rightsBasis: 'Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.', sha256: hash,
    });
    persistReceipt();
    console.log(`✓ ${index + 1}/${PILOTS.length} ${pilot.id} · ${seconds.toFixed(2)} s · ${providerReceipt.costUsd === null ? 'custo pendente' : `US$ ${providerReceipt.costUsd.toFixed(6)}`}`);
  } catch (error) {
    receipt.status = 'failed';
    receipt.completedAt = new Date().toISOString();
    receipt.failures.push({ id: pilot.id, at: new Date().toISOString(), error: redact(error?.message || error) });
    persistReceipt();
    rmSync(`${output}.new.mp3`, { force: true });
    throw error;
  } finally {
    if (raw) rmSync(raw, { force: true });
  }
}
const hashes = new Set(records.map((record) => record.sha256));
if (hashes.size !== records.length) throw new Error('validação: hashes duplicados entre os pilotos');
writeLedger(records);
receipt.status = 'complete';
receipt.completedAt = new Date().toISOString();
persistReceipt();
console.log(`LYRIA-SOUNDTRACK ✓ ${records.length} MP3s distintos · US$ ${spent.toFixed(6)} · ${RECEIPT}`);
