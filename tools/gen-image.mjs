// Gera arte 2D por texto (+ imagens de referência) via OpenRouter, e entrega o arquivo
// já ENQUADRADO e comprimido para a caixa em que a tela do jogo vai desenhá-lo.
//
// É o irmão 2D de `tools/gen-asset.mjs` (3D via Tripo/Meshy) e copia dele, de propósito,
// as três regras de segredo — ver bloco "REGRAS DE SEGREDO" abaixo.
//
// Uso:
//   node tools/gen-image.mjs --id team-funkeiros --prompt "..." \
//        --ref public/img/team-tribos.png --aspect 9:16 --crop 2:5 --w 640
//
// Flags:
//   --id <nome>        nome do arquivo final, sem extensão      (obrigatório)
//   --prompt "..."     o pedido                                  (obrigatório)
//   --ref <arquivo>    imagem de referência; repetível (até 6)
//   --model <id>       padrão google/gemini-3-pro-image
//   --aspect W:H       proporção pedida ao modelo (padrão 1:1)
//   --crop W:H         recorte central aplicado DEPOIS (padrão: o mesmo de --aspect)
//   --w N              largura final em px (padrão 640)
//   --out <dir>        padrão public/img
//   --fmt webp|png     padrão webp
//   --quality N        qualidade webp (padrão 82)
//   --raw-only         grava só o PNG cru em /tmp/gen-image, não recorta nem publica
//   --n N              quantas variações gerar (padrão 1; grava -v1, -v2, … em /tmp)
//   --from <png>       NÃO gera nada: recorta e publica um PNG cru que já existe. É o par
//                      de `--n 2 --raw-only`: gera as variações, OLHA as duas, publica a
//                      escolhida. Sem isto o único jeito de publicar a v2 seria gerar de
//                      novo e torcer — e aí o arquivo que vai pro commit não é o que eu vi.
//
// POR QUE O RECORTE MORA AQUI: a placa de facção é uma caixa 245×620 com
// `background-size:cover` (public/style.css, `.team-card>.team-art`). Arte em paisagem
// entra nela mostrando ~26% da largura — foi assim que quatro cartazes de elenco viraram
// quatro retratos de UM personagem. O gerador não tem essa proporção no menu de aspect
// ratio, então quem publica o arquivo é quem tem de fechar a conta: gera no aspect mais
// próximo que o modelo aceita e recorta pelo centro até a proporção REAL da caixa. Assim
// o que eu olho antes de commitar é byte a byte o que o jogador vê.
//
// REGRAS DE SEGREDO (idênticas às do gen-asset.mjs, e pelos mesmos motivos):
//   1. A chave sai SÓ para openrouter.ai. As imagens de referência viram data: URL no
//      corpo do request — nada é buscado em host de terceiro, e `redirect:'error'` impede
//      que um 3xx carregue o header para outro domínio.
//   2. Nada é impresso sem passar por `redact()`.
//   3. A chave não é escrita em arquivo nenhum. É lida do `.env` (600, gitignored) e
//      NUNCA de `argv` — argv vaza no `ps` de qualquer processo da máquina.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
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

const SECRETS = [ENV.OPENROUTER_API_KEY, ENV.TRIPO_API_KEY, ENV.MESHY_API_KEY].filter(s => s && s.length > 8);
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
const args = (name) => {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith('--')) out.push(argv[i + 1]);
  return out;
};
const flag = (name) => argv.includes(`--${name}`);

const ID = arg('id');
const PROMPT = arg('prompt');
const REFS = args('ref');
const MODEL = arg('model', 'google/gemini-3-pro-image');
const ASPECT = arg('aspect', '1:1');
const CROP = arg('crop', ASPECT);
const WIDTH = parseInt(arg('w', '640'), 10);
const OUT_DIR = arg('out', 'public/img');
const FMT = (arg('fmt', 'webp') || 'webp').toLowerCase();
const QUALITY = parseInt(arg('quality', '82'), 10);
const N = parseInt(arg('n', '1'), 10);
const RAW_DIR = '/tmp/gen-image';

const FROM = arg('from');
if (!ID) die('faltou --id (nome do arquivo final, sem extensão)');
if (!/^[a-z0-9_-]+$/.test(ID)) die(`--id inválido: "${ID}" (use só a-z, 0-9, _ e -)`);
if (!PROMPT && !FROM) die('faltou --prompt (ou --from <png> para republicar um cru)');
if (!['webp', 'png'].includes(FMT)) die(`--fmt desconhecido: ${FMT}`);
if (REFS.length > 6) die(`--ref demais (${REFS.length}); o teto é 6`);
const ratio = (s) => {
  const m = /^(\d+):(\d+)$/.exec(s || '');
  if (!m) die(`proporção inválida: "${s}" (use W:H, ex. 9:16)`);
  return +m[1] / +m[2];
};
const CROP_R = ratio(CROP);
ratio(ASPECT);

const KEY = ENV.OPENROUTER_API_KEY;
if (!KEY && !FROM) die('OPENROUTER_API_KEY não está no .env');

/* ------------------------------ HTTP com trava ------------------------------ */
const API_HOST = 'openrouter.ai';

async function apiFetch(url, opts = {}) {
  const host = new URL(url).host;
  if (host !== API_HOST) die(`recusado: header de auth só sai para ${API_HOST}, pediram ${host}`);
  const res = await fetch(url, {
    ...opts,
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://game.csbrasil.online',
      'X-Title': 'CORO SOLTO: Treta Suprema',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* deixa null; o texto cru vai no erro */ }
  if (!res.ok) {
    const hint = res.status === 401 || res.status === 403 ? ' (chave rejeitada)'
      : res.status === 402 ? ' (sem crédito)'
      : res.status === 429 ? ' (rate limit / cota)' : '';
    die(`openrouter HTTP ${res.status}${hint}: ${text.slice(0, 800)}`);
  }
  // OpenRouter devolve 200 com `error` no corpo quando o provedor recusa (moderação,
  // modelo fora do ar). Sem esta checagem o script "passava" e gravava zero imagem.
  if (json?.error) die(`openrouter (200 com erro): ${JSON.stringify(json.error).slice(0, 800)}`);
  return json ?? {};
}

/* --------------------------------- pipeline -------------------------------- */
mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const outs = [];
if (FROM) {
  if (!existsSync(FROM)) die(`--from não existe: ${FROM}`);
  outs.push(FROM);
  say(`--from ${FROM} (nada foi gerado, nenhuma chamada de API)`);
}
const content = [{ type: 'text', text: `${PROMPT}\n\nAspect ratio: ${ASPECT} (vertical portrait if height > width).` }];
for (const p of FROM ? [] : REFS) {
  if (!existsSync(p)) die(`--ref não existe: ${p}`);
  const ext = p.split('.').pop().toLowerCase();
  const mime = MIME[ext];
  if (!mime) die(`--ref com extensão não suportada: ${p}`);
  // Referência grande estoura o corpo do request e não melhora o resultado: 1024px de
  // lado maior é o que o modelo enxerga. Reduz aqui, não no disco do repo.
  const buf = await sharp(p).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${buf.toString('base64')}` } });
  say(`  ref: ${basename(p)} (${(buf.length / 1024) | 0} KB no corpo)`);
}

const body = {
  model: MODEL,
  modalities: ['image', 'text'],
  messages: [{ role: 'user', content }],
};
// `image_config` é o caminho oficial de aspect ratio dos modelos de imagem do Gemini via
// OpenRouter. Se o modelo escolhido não o aceitar, a linha de texto do prompt continua
// pedindo a proporção — e o --crop fecha a conta de qualquer jeito.
if (ASPECT !== '1:1') body.image_config = { aspect_ratio: ASPECT };

for (let i = 1; !FROM && i <= N; i++) {
  const t0 = Date.now();
  const j = await apiFetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) });
  const msg = j.choices?.[0]?.message ?? {};
  const imgs = msg.images ?? [];
  if (!imgs.length) {
    die(`o modelo não devolveu imagem (finish_reason=${j.choices?.[0]?.finish_reason}). texto: ${String(msg.content ?? '').slice(0, 500)}`);
  }
  const url = imgs[0].image_url?.url || imgs[0].url;
  if (!url?.startsWith('data:')) die(`imagem veio como URL externa, não data: — ${String(url).slice(0, 120)}`);
  const raw = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  const rawPath = `${RAW_DIR}/${ID}${N > 1 ? `-v${i}` : ''}.png`;
  writeFileSync(rawPath, raw);
  const meta = await sharp(rawPath).metadata();
  say(`[${MODEL}] v${i} · ${((Date.now() - t0) / 1000) | 0}s · ${meta.width}×${meta.height} · ${(raw.length / 1024) | 0} KB → ${rawPath}`);
  outs.push(rawPath);
}

if (flag('raw-only')) { say('--raw-only: parou antes de recortar/publicar'); process.exit(0); }

// Recorte central para a proporção REAL da caixa + resize + compressão.
const src = outs[0];
const m = await sharp(src).metadata();
let cw = m.width, ch = Math.round(m.width / CROP_R);
if (ch > m.height) { ch = m.height; cw = Math.round(m.height * CROP_R); }
const outPath = `${OUT_DIR}/${ID}.${FMT}`;
const pipe = sharp(src)
  .extract({ left: Math.round((m.width - cw) / 2), top: Math.round((m.height - ch) / 2), width: cw, height: ch })
  .resize({ width: WIDTH });
await (FMT === 'webp' ? pipe.webp({ quality: QUALITY }) : pipe.png({ compressionLevel: 9 })).toFile(outPath);
const bytes = statSync(outPath).size;
const om = await sharp(outPath).metadata();
say(`OK ${outPath} · ${om.width}×${om.height} · ${(bytes / 1024).toFixed(0)} KB (recorte ${CROP} de ${m.width}×${m.height})`);
say('   OLHE o arquivo antes de commitar — silhueta, mão e texto o gerador erra em silêncio.');
