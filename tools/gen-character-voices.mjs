#!/usr/bin/env node
/* Gera vozes originais por personagem sem pôr segredo no browser/git.

   Uso seguro (zero rede, zero crédito):
     node tools/gen-character-voices.mjs --provider openrouter --missing --dry-run
   Preflight autenticado (zero geração):
     node tools/gen-character-voices.mjs --provider openrouter --missing --preflight
   Geração real exige a chave fora do git. Não clona voz, não sobrescreve sem
   --force e persiste o recibo após cada sucesso para sobreviver a falha parcial.
*/
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SOURCE = 'content/voice-lines.json';
const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const provider = value('--provider') || 'openrouter';
const onlyCharacter = value('--character');
const onlyLine = value('--line');
const onlyFaction = value('--faction')?.toUpperCase();
const dryRun = args.includes('--dry-run');
const preflightOnly = args.includes('--preflight');
const missingOnly = args.includes('--missing');
const force = args.includes('--force');
const maxCostUsd = +(value('--max-cost-usd') || 6);
const receiptPath = value('--receipt') || 'tools/eval/asset-evidence/character-voices-generation.json';
if (!['elevenlabs', 'openrouter'].includes(provider)) throw new Error(`provider não suportado: ${provider}`);
if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) throw new Error(`--max-cost-usd inválido: ${maxCostUsd}`);

function loadEnv(file = '.env') {
  const out = {};
  let txt; try { txt = readFileSync(file, 'utf8'); } catch { return out; }
  for (const line of txt.split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line); if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const ENV = { ...loadEnv(value('--env') || '.env'), ...process.env };
const secrets = [ENV.OPENROUTER_API_KEY, ENV.ELEVENLABS_API_KEY].filter(v => v?.length > 8);
const redact = (input) => secrets.reduce((text, key) => text.split(key).join('***REDACTED***'), String(input ?? ''));
const source = JSON.parse(readFileSync(SOURCE, 'utf8'));
const modelId = value('--model') || (provider === 'openrouter'
  ? 'google/gemini-3.1-flash-tts-preview'
  : source.providerPolicy.modelId || 'eleven_multilingual_v2');
const outputFormat = source.providerPolicy.outputFormat || 'mp3_44100_128';
const jobs = [];
for (const [id, character] of Object.entries(source.characters || {})) {
  if (onlyCharacter && id !== onlyCharacter) continue;
  if (onlyFaction && character.faction !== onlyFaction) continue;
  for (const line of character.lines || []) {
    if (onlyLine && line.key !== onlyLine) continue;
    const output = `public/audio/characters/${id}/${line.event}/${line.key}.mp3`;
    const validExisting = line.output?.file === output.replace(/^public\//, '') && existsSync(output);
    if (missingOnly && validExisting) continue;
    jobs.push({ id, character, line, output });
  }
}
if (!jobs.length && !preflightOnly) throw new Error('nenhuma fala corresponde aos filtros');

const totalChars = jobs.reduce((sum, job) => sum + job.line.text.length, 0);
console.log(`CHARACTER-VOICES ${jobs.length} arquivos · ${totalChars} caracteres · ${provider}/${modelId} · teto US$ ${maxCostUsd.toFixed(2)}`);
for (const job of jobs) console.log(`${job.id.padEnd(23)} ${job.line.event.padEnd(6)} ${job.output} ← ${job.line.text}`);
if (dryRun) {
  console.log('DRY-RUN: nenhuma rede, crédito ou escrita.');
  process.exit(0);
}

const apiKey = provider === 'openrouter' ? ENV.OPENROUTER_API_KEY : ENV.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error(`${provider === 'openrouter' ? 'OPENROUTER_API_KEY' : 'ELEVENLABS_API_KEY'} ausente; use --dry-run ou configure a chave fora do git`);
const headers = { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json',
  'HTTP-Referer': 'https://game.csbrasil.online', 'X-Title': 'CORO SOLTO: Treta Suprema' };

async function jsonRequest(url) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${redact(text.slice(0, 800))}`);
  try { return JSON.parse(text); } catch { throw new Error(`JSON inválido de ${url}`); }
}

let preflight = null;
if (provider === 'openrouter') {
  const [modelsPayload, endpointPayload, creditsPayload] = await Promise.all([
    jsonRequest('https://openrouter.ai/api/v1/models'),
    jsonRequest(`https://openrouter.ai/api/v1/models/${modelId}/endpoints`),
    jsonRequest('https://openrouter.ai/api/v1/credits'),
  ]);
  const model = modelsPayload.data?.find((candidate) => candidate.id === modelId) || endpointPayload.data;
  const endpoints = endpointPayload.data?.endpoints || [];
  if (model?.id !== modelId || !endpoints.length) throw new Error(`preflight: modelo sem endpoint OpenRouter: ${modelId}`);
  const totalCredits = Number(creditsPayload.data?.total_credits);
  const totalUsage = Number(creditsPayload.data?.total_usage);
  const balanceUsd = Number.isFinite(totalCredits) && Number.isFinite(totalUsage) ? totalCredits - totalUsage : null;
  if (!Number.isFinite(balanceUsd)) throw new Error('preflight: saldo OpenRouter não pôde ser determinado');
  if (balanceUsd < Math.min(maxCostUsd, 0.05)) throw new Error(`preflight: saldo insuficiente (US$ ${balanceUsd.toFixed(4)})`);
  preflight = { checkedAt: new Date().toISOString(), modelId: model.id, modelName: model.name,
    pricing: model.pricing || endpoints[0]?.pricing || null, endpointCount: endpoints.length,
    providers: [...new Set(endpoints.map((endpoint) => endpoint.provider_name).filter(Boolean))],
    balanceUsd: +balanceUsd.toFixed(8), capUsd: maxCostUsd };
  console.log(`PREFLIGHT ✓ modelo disponível · saldo US$ ${balanceUsd.toFixed(4)} · teto US$ ${maxCostUsd.toFixed(2)}`);
}
if (preflightOnly) process.exit(0);

const receipt = { schemaVersion: 1, provider, modelId, startedAt: new Date().toISOString(),
  completedAt: null, status: 'running', maxCostUsd, totalCostUsd: 0, plannedJobs: jobs.length,
  plannedCharacters: [...new Set(jobs.map((job) => job.id))], preflight,
  note: 'Vozes sintéticas originais; nenhuma clonagem. Status generated exige escuta humana posterior.',
  completed: [], failures: [] };
const persistReceipt = () => {
  mkdirSync(dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
};
const persistSource = () => writeFileSync(SOURCE, `${JSON.stringify(source, null, 2)}\n`);
persistReceipt();

async function generationReceipt(generationId) {
  if (!generationId) throw new Error('resposta sem X-Generation-Id; custo não auditável');
  let last = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    try {
      const payload = await jsonRequest(`https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`);
      const cost = Number(payload.data?.total_cost ?? payload.data?.usage?.cost);
      if (Number.isFinite(cost)) return { costUsd: cost, data: payload.data };
      last = new Error('total_cost ausente');
    } catch (error) { last = error; }
  }
  throw new Error(`recibo ${generationId} indisponível: ${redact(last?.message || last)}`);
}

const ffmpeg = ENV.FFMPEG || ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find(existsSync) || 'ffmpeg';
const ffprobe = ENV.FFPROBE || ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe'].find(existsSync) || 'ffprobe';
let spent = 0;
const reservePerCall = 0.03; // teto conservador; uma fala curta nunca pode iniciar sem esta folga.
for (const [index, job] of jobs.entries()) {
  if (!job.character.voiceId) throw new Error(`${job.id}: voiceId sintético ausente`);
  if (existsSync(job.output) && !force) throw new Error(`${job.output}: existe sem recibo válido; use --force deliberadamente`);
  if (spent + reservePerCall > maxCostUsd) throw new Error(`teto impediria próxima chamada: US$ ${spent.toFixed(6)} + reserva ${reservePerCall} > ${maxCostUsd}`);
  const openRouter = provider === 'openrouter';
  const rawPcm = openRouter && modelId.startsWith('google/gemini-');
  const url = openRouter ? 'https://openrouter.ai/api/v1/audio/speech'
    : `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(job.character.voiceId)}?output_format=${outputFormat}`;
  const instructions = `${job.character.voiceDesign} Direção desta fala: ${job.line.direction}. Português brasileiro. Fale somente o texto fornecido, sem introdução nem efeito adicional.`;
  const body = openRouter ? { model: modelId, input: job.line.text, voice: job.character.voiceId,
    response_format: rawPcm ? 'pcm' : 'mp3', speed: 1, instructions }
    : { text: job.line.text, model_id: modelId };
  let response;
  try {
    response = await fetch(url, { method: 'POST', redirect: 'error',
      headers: openRouter ? headers : { 'xi-api-key': apiKey, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`${provider} ${response.status} ${redact((await response.text()).slice(0, 800))}`);
    const generationId = response.headers.get('x-generation-id');
    const bytes = Buffer.from(await response.arrayBuffer());
    const costReceipt = openRouter ? await generationReceipt(generationId) : { costUsd: 0, data: null };
    spent += costReceipt.costUsd;
    receipt.totalCostUsd = +spent.toFixed(10);
    if (spent > maxCostUsd) throw new Error(`teto excedido pelo provedor: US$ ${spent.toFixed(6)} > ${maxCostUsd}`);
    mkdirSync(dirname(job.output), { recursive: true });
    const raw = `${job.output}.${rawPcm ? 'raw.pcm' : 'raw.mp3'}`;
    writeFileSync(raw, bytes);
    try {
      const inputArgs = rawPcm ? ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw] : ['-i', raw];
      execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...inputArgs,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '128k', job.output]);
      rmSync(raw);
    } catch (error) {
      rmSync(raw, { force: true });
      throw new Error(`ffmpeg falhou: ${redact(error?.message || error)}`);
    }
    let duration = +execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', job.output], { encoding: 'utf8' }).trim();
    const limit = job.line.event === 'select' ? 4 : 3;
    // O TTS varia a cadência mesmo com o mesmo prompt. Excesso pequeno não justifica
    // gastar outra chamada: comprime até 25% e mede novamente. Acima disso, a fala ou
    // a direção estão erradas e o portão continua vermelho.
    if (Number.isFinite(duration) && duration > limit && duration <= limit * 1.25) {
      const adjusted = `${job.output}.tempo.mp3`;
      const tempo = duration / (limit - 0.08);
      try {
        execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', job.output,
          '-af', `atempo=${tempo.toFixed(6)}`, '-ar', '44100', '-b:a', '128k', adjusted]);
        renameSync(adjusted, job.output);
      } finally { rmSync(adjusted, { force: true }); }
      duration = +execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', job.output], { encoding: 'utf8' }).trim();
    }
    if (!Number.isFinite(duration) || duration <= 0 || duration > limit)
      throw new Error(`duração ${Number.isFinite(duration) ? duration.toFixed(2) : 'inválida'} s fora de 0-${limit} s`);
    const generatedAt = new Date().toISOString();
    job.line.output = { file: job.output.replace(/^public\//, ''), provider, modelId,
      voiceId: job.character.voiceId, license: source.providerPolicy.license,
      generatedAt, duration, generationId, costUsd: +costReceipt.costUsd.toFixed(10),
      sha256: createHash('sha256').update(readFileSync(job.output)).digest('hex') };
    if (job.character.lines.every((line) => line.output?.file && existsSync(`public/${line.output.file}`)))
      job.character.status = 'generated';
    receipt.completed.push({ characterId: job.id, key: job.line.key, event: job.line.event,
      file: job.line.output.file, sha256: job.line.output.sha256, duration,
      generationId, costUsd: job.line.output.costUsd, usage: costReceipt.data?.usage || null, generatedAt });
    persistSource();
    persistReceipt();
    console.log(`✓ ${index + 1}/${jobs.length} ${job.output} (${duration.toFixed(2)} s · US$ ${costReceipt.costUsd.toFixed(6)} · lote US$ ${spent.toFixed(6)})`);
  } catch (error) {
    receipt.status = 'failed'; receipt.completedAt = new Date().toISOString();
    receipt.failures.push({ characterId: job.id, key: job.line.key, at: new Date().toISOString(), error: redact(error?.message || error) });
    persistReceipt();
    console.error(`✗ ${job.id}/${job.line.key}: ${redact(error?.message || error)}`);
    process.exit(1);
  }
}
receipt.status = 'complete'; receipt.completedAt = new Date().toISOString();
persistReceipt();
console.log(`CHARACTER-VOICES ✓ ${receipt.completed.length} gerados · US$ ${spent.toFixed(6)} · recibo ${receiptPath}`);
