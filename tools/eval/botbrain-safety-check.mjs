import { readFileSync } from 'node:fs';
import { moduleCacheManifest } from '../../scripts/module-cache.mjs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const read = (file) => readFileSync(file, 'utf8');

let api = read('src/pages/api/train-frames.ts');
let main = read('public/js/main.js');
let game = read('public/js/game.js');
let page = read('src/pages/index.astro');
let docker = read('docker/botbrain.Dockerfile');
let compose = read('docker-compose.botbrain.yml');
let trainer = read('tools/eval/bot-train.mjs');
let brain = read('public/js/botbrain/brain.js');
let sense = read('public/js/botbrain/sense.js');
let cachedModules = moduleCacheManifest().modules;

if (mutant === 'anonimo') api = api.replace('resolvePlayerIdentity', 'resolveAnonymousIdentity');
else if (mutant === 'ctf') game = game.replace('(!this.ctf || b.target)', 'true');
else if (mutant === 'optout') main = main.replace("localStorage.getItem(TRAIN_CONSENT_KEY) === '1'", "localStorage.getItem(TRAIN_CONSENT_KEY) !== '0'");
else if (mutant === 'cache') cachedModules = cachedModules.filter((module) => module !== 'botbrain/brain.js');
else if (mutant === 'root') docker = docker.replace('USER node', '');
else if (mutant === 'poison') trainer = trainer.replace('MAX_BATCHES_PER_PLAYER', 'UNLIMITED_BATCHES_PER_PLAYER');
else if (mutant === 'localsink') {
  api = api.replaceAll('MAX_LOCAL_FILE_BYTES', 'UNLIMITED_LOCAL_FILE_BYTES');
  compose = compose.replace('127.0.0.1:4321:4321', '4321:4321');
}
else if (mutant === 'stale') sense = sense.replace('else if (!best) mem.target = null;', '');
else if (mutant) throw new Error(`mutante desconhecido: ${mutant}`);

const failures = [];
if (!api.includes('resolvePlayerIdentity') || !api.includes('validUid') || !api.includes('nick: null')
    || !api.includes('p_player_id: identity.player.id'))
  failures.push('BB1 produção não autentica a coleta por UID + token');
if (api.includes("headers.get('x-forwarded-for')") || !api.includes('clientAddress'))
  failures.push('BB2 limite de IP ainda confia em header controlado pelo cliente');
if (!api.includes("rateLimit(supabaseAdmin, 'train_frames_player', identity.player.id"))
  failures.push('BB2 falta limite pela identidade resolvida no servidor');
if (!main.includes("localStorage.getItem(TRAIN_CONSENT_KEY) === '1'") || /set-training[^>]*checked/.test(page))
  failures.push('BB3 coleta não exige consentimento explícito');
if (!/api\('\/api\/train-frames',\s*\{\s*uid:\s*getAnonId\(\),\s*token:\s*getToken\(\)/.test(main))
  failures.push('BB4 cliente não envia a identidade UID autenticável');
if (!game.includes('(!this.ctf || b.target)'))
  failures.push('BB5 bot neural ignora objetivo quando está sem alvo no CTF');
for (const module of ['brain.js', 'features.js', 'recorder.js', 'sense.js']) {
  if (!cachedModules.includes(`botbrain/${module}`)) failures.push(`BB6 ${module} não passa pelo cache-bust do import map`);
}
if (!brain.includes("weights.bin") && !brain.includes('${wpath}?v=${version}'))
  failures.push('BB6 pesos do modelo não recebem a versão do release');
if (!/^USER node$/m.test(docker)) failures.push('BB7 imagem BotBrain ainda executa como root');
if (!trainer.includes('MAX_BATCHES_PER_PLAYER') || !trainer.includes('player_id'))
  failures.push('BB8 importação remota não limita contribuição por jogador autenticado');
if (!api.includes('MAX_REQUEST_BYTES') || !api.includes('MAX_LOCAL_FILE_BYTES')
    || !api.includes('sanitizeMeta') || !api.includes('localRateLimit') || !api.includes('validLocalOrigin'))
  failures.push('BB9 sink local não limita corpo, metadados, taxa e quota em disco');
if (!compose.includes('127.0.0.1:4321:4321'))
  failures.push('BB9 serviço local expõe o sink de treino fora do loopback');
if (!sense.includes('else if (!best) mem.target = null;'))
  failures.push('BB10 memória neural conserva alvo morto ou fora do grace');

for (const failure of failures) console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
if (mutant && !failures.length) failures.push(`mutação ${mutant} não foi detectada`);

if (failures.length) {
  console.error(`\x1b[31mBOTBRAIN SAFETY ${failures.length} VERMELHA(S)\x1b[0m${mutant ? ` (mutante=${mutant})` : ''}`);
  process.exitCode = 1;
} else {
  console.error('\x1b[32mBOTBRAIN SAFETY verde: UID, consentimento, CTF, cache, contêiner e corpus protegidos\x1b[0m');
}
