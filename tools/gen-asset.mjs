// Gera um prop 3D por texto (Tripo ou Meshy), baixa o GLB e grava otimizado em
// public/models/props/. É a ponte que faltava entre "o mapa precisa de uma caixa de som"
// e um arquivo que o jogo consegue carregar.
//
// Uso:
//   node tools/gen-asset.mjs --prompt "caixa de som de baile" --id caixa_som
//   node tools/gen-asset.mjs --provider meshy --prompt "..." --id carro_tunado
//   node tools/gen-asset.mjs --resume <task_id> --id caixa_som     # tarefa já paga
//
// Flags: --provider tripo|meshy (padrão tripo) · --face-limit N (padrão 12000)
//        --raw-only (não otimiza) · --out <dir> (padrão public/models/props)
//        --timeout <s> (padrão 900)
//
// CHAVES: lidas de `.env` na raiz (gitignored, 600), NUNCA de argumento de linha de
// comando — argv vaza no `ps` de qualquer processo da máquina. O repo não usa dotenv
// (não está no package.json e não vale uma dependência por 12 linhas); o padrão de
// leitura de env do repo é `import.meta.env` do Astro (src/lib/supabase.ts,
// astro.config.mjs), que não existe fora do bundler — daí o parser mínimo abaixo.
//
// REGRAS DE SEGREDO, e o motivo de cada uma:
//   1. O header Authorization só sai para o HOST DA PRÓPRIA API. O GLB pronto vem de um
//      CDN de terceiro (Tripo devolve link assinado do S3/CloudFront); mandar a chave
//      junto no download entregaria a credencial pra um host que não é o do provedor.
//      `apiFetch` recusa qualquer host fora da allowlist ANTES de montar o header.
//   2. Nada é impresso sem passar por `redact()`. Corpo de erro de API repete parâmetro
//      de request com frequência, e log de agente vai parar em relatório e em commit.
//   3. A chave não é escrita em arquivo nenhum, nem em cache de tarefa.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, getBounds, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

/* ---------------------------------- .env ---------------------------------- */
function loadEnv(file = '.env') {
  const out = {};
  let txt;
  try { txt = readFileSync(file, 'utf8'); } catch { return out; }
  for (const line of txt.split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const ENV = { ...loadEnv(), ...process.env };

const SECRETS = [ENV.TRIPO_API_KEY, ENV.MESHY_API_KEY, ENV.OPENROUTER_API_KEY].filter(s => s && s.length > 8);
const redact = (s) => {
  let t = String(s ?? '');
  for (const k of SECRETS) t = t.split(k).join('***REDACTED***');
  return t;
};
const say = (...a) => console.log(...a.map(redact));
const die = (msg, code = 1) => { console.error('ERRO:', redact(msg)); process.exit(code); };

/* ---------------------------------- argv ---------------------------------- */
const argv = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(`--${name}`);

const PROVIDER = (arg('provider', 'tripo') || 'tripo').toLowerCase();
const PROMPT = arg('prompt');
const ID = arg('id');
const RESUME = arg('resume');
const OUT_DIR = arg('out', 'public/models/props');
const FACE_LIMIT = parseInt(arg('face-limit', '12000'), 10);
const TIMEOUT_S = parseInt(arg('timeout', '900'), 10);
const RAW_DIR = '/tmp/gen-asset';

const BALANCE_ONLY = flag('balance');
if (!BALANCE_ONLY && !ID) die('faltou --id (nome do arquivo final, sem .glb)');
if (ID && !/^[a-z0-9_]+$/.test(ID)) die(`--id inválido: "${ID}" (use só a-z, 0-9 e _)`);
if (!BALANCE_ONLY && !PROMPT && !RESUME) die('faltou --prompt (ou --resume <task_id>)');
if (!['tripo', 'meshy'].includes(PROVIDER)) die(`--provider desconhecido: ${PROVIDER}`);

const KEY = PROVIDER === 'tripo' ? ENV.TRIPO_API_KEY : ENV.MESHY_API_KEY;
if (!KEY) die(`${PROVIDER === 'tripo' ? 'TRIPO_API_KEY' : 'MESHY_API_KEY'} não está no .env`);

/* ------------------------------ HTTP com trava ------------------------------ */
// Allowlist de host por provedor. Sem isto, um redirect (ou um campo de URL vindo da
// própria resposta) bastaria pra reenviar a chave pra outro domínio.
const API_HOSTS = { tripo: 'api.tripo3d.ai', meshy: 'api.meshy.ai' };

async function apiFetch(url, opts = {}) {
  const host = new URL(url).host;
  if (host !== API_HOSTS[PROVIDER]) die(`recusado: header de auth só sai para ${API_HOSTS[PROVIDER]}, pediram ${host}`);
  const res = await fetch(url, {
    ...opts,
    redirect: 'error',   // redirect cross-host levaria o header junto
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* deixa json null, o texto cru vai no erro */ }
  if (!res.ok) {
    // 401/403 = chave rejeitada · 402/429 = crédito ou cota. Diz qual é, com o corpo real.
    const hint = res.status === 401 || res.status === 403 ? ' (chave rejeitada)'
      : res.status === 402 ? ' (sem crédito)'
      : res.status === 429 ? ' (rate limit / cota)' : '';
    die(`${PROVIDER} HTTP ${res.status}${hint}: ${text.slice(0, 600)}`);
  }
  return json ?? {};
}

// Download do artefato: host de CDN, SEM header de auth.
async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) die(`download HTTP ${res.status} de ${new URL(url).host}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ------------------------------- provedores ------------------------------- */
// Cada provedor devolve { taskId } no start e { done, failed, url, status, progress } no poll.
const PROVIDERS = {
  tripo: {
    async start(prompt) {
      const j = await apiFetch('https://api.tripo3d.ai/v2/openapi/task', {
        method: 'POST',
        body: JSON.stringify({ type: 'text_to_model', prompt, texture: true, pbr: true, face_limit: FACE_LIMIT }),
      });
      if (j.code !== 0 || !j.data?.task_id) die(`resposta inesperada do Tripo: ${JSON.stringify(j).slice(0, 400)}`);
      return j.data.task_id;
    },
    async poll(taskId) {
      const j = await apiFetch(`https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(taskId)}`);
      const d = j.data || {};
      const url = d.output?.pbr_model || d.output?.model || d.output?.base_model || null;
      return {
        status: d.status, progress: d.progress ?? 0,
        done: d.status === 'success' && !!url,
        failed: ['failed', 'cancelled', 'banned', 'expired', 'unknown'].includes(d.status),
        url, raw: d,
      };
    },
  },
  meshy: {
    async start(prompt) {
      const j = await apiFetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
        method: 'POST',
        body: JSON.stringify({ mode: 'preview', prompt, should_remesh: true, target_polycount: FACE_LIMIT }),
      });
      if (!j.result) die(`resposta inesperada do Meshy: ${JSON.stringify(j).slice(0, 400)}`);
      return j.result;
    },
    async poll(taskId) {
      const j = await apiFetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${encodeURIComponent(taskId)}`);
      const url = j.model_urls?.glb || null;
      return {
        status: j.status, progress: j.progress ?? 0,
        done: j.status === 'SUCCEEDED' && !!url,
        failed: ['FAILED', 'CANCELED'].includes(j.status),
        url, raw: j,
      };
    },
  },
};

/* --------------------------------- pipeline -------------------------------- */
// `--balance`: saldo antes de gastar. "Sem crédito" e "chave errada" produzem falhas
// parecidas no meio de uma geração; separar os dois custa uma chamada de leitura.
if (flag('balance')) {
  if (PROVIDER === 'tripo') {
    const j = await apiFetch('https://api.tripo3d.ai/v2/openapi/user/balance');
    say('tripo balance:', JSON.stringify(j.data ?? j));
  } else {
    const j = await apiFetch('https://api.meshy.ai/openapi/v1/balance');
    say('meshy balance:', JSON.stringify(j));
  }
  process.exit(0);
}

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const P = PROVIDERS[PROVIDER];
const taskId = RESUME || await P.start(PROMPT);
say(`[${PROVIDER}] task ${taskId}${RESUME ? ' (retomada)' : ''}`);

const t0 = Date.now();
let last = '';
let result = null;
while ((Date.now() - t0) / 1000 < TIMEOUT_S) {
  const st = await P.poll(taskId);
  const line = `${st.status} ${st.progress}%`;
  if (line !== last) { say(`  ${((Date.now() - t0) / 1000) | 0}s · ${line}`); last = line; }
  if (st.done) { result = st; break; }
  if (st.failed) die(`tarefa ${taskId} terminou em "${st.status}": ${JSON.stringify(st.raw).slice(0, 500)}`);
  await sleep(6000);
}
if (!result) die(`timeout de ${TIMEOUT_S}s esperando a tarefa ${taskId} (retome com --resume ${taskId})`);

// URL assinada do Tripo expira em ~5 min: baixa AGORA, antes de qualquer otimização.
const rawPath = `${RAW_DIR}/${ID}.glb`;
const rawBytes = await download(result.url, rawPath);
say(`baixado ${rawPath} · ${(rawBytes / 1024) | 0} KB (host ${new URL(result.url).host})`);

if (flag('raw-only')) { say('--raw-only: parou antes de otimizar'); process.exit(0); }

// Mesmo pipeline dos props que já estão no jogo (tools/optimize-props.mjs): dedup +
// textura webp 1024 + prune, e SEM quantize/simplify — a nota do optimize-tribos.mjs
// vale aqui também (malha quantizada explode no GPU real e passa batido no headless).
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(rawPath);
for (const a of doc.getRoot().listAnimations()) a.dispose();
await doc.transform(
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  prune(),
);
const outPath = `${OUT_DIR}/${ID}.glb`;
await io.write(outPath, doc);
const outBytes = statSync(outPath).size;
say(`OK ${outPath} · ${(outBytes / 1024) | 0} KB (de ${(rawBytes / 1024) | 0} KB, -${(100 - outBytes * 100 / rawBytes).toFixed(1)}%)`);
say('   registre o prop no mapa à parte — este script só produz o arquivo.');

// Inspeção do que saiu, pra não registrar no mapa um GLB vazio ou de escala absurda.
// Feita AQUI e não pelo `tools/inspect-glb.mjs`: aquele abre com `new NodeIO()` sem
// extensão nenhuma e estoura em "Missing required extension, EXT_texture_webp" — que é
// exatamente a extensão que o textureCompress acima acabou de gravar.
const b = getBounds(doc.getRoot().listScenes()[0]);
const dim = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));
const prim = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives());
const tris = prim.reduce((n, p) => n + ((p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0) / 3), 0);
say(`   malha: ${dim.join(' × ')} m · ${prim.length} primitiva(s) · ${tris | 0} triângulos · ${doc.getRoot().listTextures().length} textura(s)`);
if (!prim.length || dim.every(d => d === 0)) die('GLB saiu vazio — não registre no mapa');
