#!/usr/bin/env node
/* PUBLICA OS PACOTES DO STUDIO FIXADOS EM content-releases.js NO CLOUDFLARE R2 (API S3).
   ----------------------------------------------------------------------------
   Origem: a raiz local de instalação (STUDIO_PACK_ROOT ou --root), a mesma que o dev
   server serve em /packs/. Destino: chave `packs/<kind>/<id>/<versão>/<arquivo>` no bucket,
   servida em https://assets.corosolto.com.br/packs/... (mesmo caminho do pin).

   Regras (plano R2, fases 6 e 7):
   - só sobe pacote fixado: o SHA-256 do manifest.json local tem de bater com o pin, e cada
     arquivo do inventário tem de bater em bytes e SHA-256 antes de qualquer pedido de rede;
   - objeto publicado é imutável: mesma chave com o mesmo SHA → pula; mesma chave com outro
     conteúdo → RECUSA a rodada inteira antes do primeiro PUT (nada é sobrescrito). O PUT vai
     com `If-None-Match: *`, então nem uma corrida entre duas publicações sobrescreve;
   - Content-Type pela extensão (tabela do servidor local de /packs/), Cache-Control
     `public, max-age=31536000, immutable`, SHA-256 em x-amz-meta-sha256;
   - manifest.json de cada pacote sobe por ÚLTIMO: o pacote só "existe" com todos os arquivos;
   - verificação final: baixa CADA objeto pela origem pública, com Origin do site, e confere
     status, SHA-256, bytes, Content-Type, Cache-Control e CORS;
   - credenciais só do ambiente ou de ~/.config/corosolto/r2.env; nunca impressas.

   Uso:
     node scripts/publish-studio-packs.mjs --root ../local/studio-packs --dry-run
     node scripts/publish-studio-packs.mjs --root ../local/studio-packs
     node scripts/publish-studio-packs.mjs --root ../local/studio-packs --verify-only
   Opções: --pack <id>[@<versão>] (repetível; padrão: todos os pins), --r2-env <arquivo> (não --env-file: o node toma essa),
     --endpoint <url S3> (padrão https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com),
     --public-origin <url> (padrão: STUDIO_PACK_CDN_ORIGIN), --cors-origin <url>, --json.
   Saída: 0 ok; 1 falha de envio/verificação; 2 recusa (pin, inventário, conflito, credencial). */
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTER_RELEASES } from '../public/js/data/content-releases.js';
import { STUDIO_PACK_CDN_ORIGIN } from '../public/js/data/pack-origin.js';
import { isSafePackPath } from '../public/js/studio-character.js';
import { STUDIO_PACK_MIME } from './studio-pack-serving.mjs';

export const CACHE_IMUTAVEL = 'public, max-age=31536000, immutable';
export const ENV_FILE_PADRAO = join(homedir(), '.config', 'corosolto', 'r2.env');
export const CHAVES_CREDENCIAL = Object.freeze(['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']);
const SHA_VAZIO = createHash('sha256').update('').digest('hex');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export class PublishError extends Error {
  constructor(code, message) { super(`${code}: ${message}`); this.code = code; }
}
const recusa = (message) => { throw new PublishError('recusado', message); };

/* ── credenciais ───────────────────────────────────────────────────────────── */
export function lerEnvFile(caminho) {
  if (!caminho || !existsSync(caminho)) return {};
  const valores = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha);
    if (!m || linha.trimStart().startsWith('#')) continue;
    valores[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return valores;
}

export function carregarCredenciais({ env = process.env, envFile = ENV_FILE_PADRAO } = {}) {
  const arquivo = CHAVES_CREDENCIAL.every((k) => env[k]) ? {} : lerEnvFile(envFile);
  const creds = Object.fromEntries(CHAVES_CREDENCIAL.map((k) => [k, env[k] || arquivo[k] || '']));
  const faltando = CHAVES_CREDENCIAL.filter((k) => !creds[k]);
  return { creds, faltando };
}

/* ── assinatura AWS SigV4 (R2: região auto, serviço s3, endereço por caminho) ─── */
const hmac = (chave, texto) => createHmac('sha256', chave).update(texto).digest();
const codificaSegmento = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function assinar({ method, url, headers = {}, payloadSha256 = SHA_VAZIO, creds, agora = new Date(), region = 'auto' }) {
  const u = new URL(url);
  const amzDate = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dia = amzDate.slice(0, 8);
  const todos = { ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])),
    host: u.host, 'x-amz-content-sha256': payloadSha256, 'x-amz-date': amzDate };
  const nomes = Object.keys(todos).sort();
  const canonicos = nomes.map((n) => `${n}:${todos[n]}\n`).join('');
  const assinados = nomes.join(';');
  const caminho = u.pathname.split('/').map((s) => codificaSegmento(decodeURIComponent(s))).join('/');
  const consulta = [...u.searchParams].map(([k, v]) => [codificaSegmento(k), codificaSegmento(v)]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('&');
  const pedidoCanonico = [method, caminho, consulta, canonicos, assinados, payloadSha256].join('\n');
  const escopo = `${dia}/${region}/s3/aws4_request`;
  const texto = ['AWS4-HMAC-SHA256', amzDate, escopo, sha256(pedidoCanonico)].join('\n');
  const chave = hmac(hmac(hmac(hmac(`AWS4${creds.R2_SECRET_ACCESS_KEY}`, dia), region), 's3'), 'aws4_request');
  const assinatura = createHmac('sha256', chave).update(texto).digest('hex');
  delete todos.host;
  return { ...todos, authorization: `AWS4-HMAC-SHA256 Credential=${creds.R2_ACCESS_KEY_ID}/${escopo}, SignedHeaders=${assinados}, Signature=${assinatura}` };
}

/* ── plano local: pins → objetos verificados no disco ────────────────────────── */
export function selecionarPins(pins, filtros = []) {
  const todos = Object.values(pins);
  if (!filtros.length) return todos;
  return filtros.map((f) => {
    const [id, versao] = f.split('@');
    const pin = todos.find((p) => p.id === id && (!versao || p.version === versao));
    if (!pin) recusa(`--pack ${f} não é um pin de content-releases.js`);
    return pin;
  });
}

export async function planoLocal(root, pins) {
  if (!root) recusa('raiz local ausente: passe --root ou STUDIO_PACK_ROOT');
  const raiz = resolve(root);
  const pacotes = [];
  for (const pin of pins) {
    const prefixo = `/packs/${pin.kind}/${pin.id}/${pin.version}/`;
    if (pin.manifestUrl !== `${prefixo}manifest.json`) recusa(`${pin.id}: manifestUrl ${pin.manifestUrl} fora de ${prefixo}`);
    const pasta = join(raiz, pin.kind, pin.id, pin.version);
    let manifestBytes;
    try { manifestBytes = await readFile(join(pasta, 'manifest.json')); }
    catch { recusa(`${pin.id}@${pin.version}: manifest.json ausente em ${pasta}`); }
    const manifestSha = sha256(manifestBytes);
    if (manifestSha !== pin.manifestSha256) recusa(`${pin.id}@${pin.version}: manifest.json local ${manifestSha} ≠ pin ${pin.manifestSha256}`);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    if (manifest.kind !== pin.kind || manifest.id !== pin.id || manifest.version !== pin.version) recusa(`${pin.id}@${pin.version}: identidade do manifesto diverge do pin`);
    if (!Array.isArray(manifest.files) || !manifest.files.length) recusa(`${pin.id}@${pin.version}: files vazio`);
    const objetos = [];
    for (const entry of manifest.files) {
      if (!isSafePackPath(entry?.path)) recusa(`${pin.id}@${pin.version}: caminho inseguro ${JSON.stringify(entry?.path)}`);
      const contentType = STUDIO_PACK_MIME[extname(entry.path).toLowerCase()];
      if (!contentType) recusa(`${pin.id}@${pin.version}: extensão sem Content-Type conhecido em ${entry.path}`);
      let bytes;
      try { bytes = await readFile(join(pasta, entry.path)); }
      catch { recusa(`${pin.id}@${pin.version}: ${entry.path} ausente no disco`); }
      if (bytes.byteLength !== entry.bytes) recusa(`${pin.id}@${pin.version}: ${entry.path} com ${bytes.byteLength} bytes, inventário diz ${entry.bytes}`);
      if (sha256(bytes) !== entry.sha256) recusa(`${pin.id}@${pin.version}: ${entry.path} com SHA-256 diferente do inventário`);
      objetos.push({ key: `${prefixo.slice(1)}${entry.path}`, file: join(pasta, entry.path), sha256: entry.sha256, bytes: entry.bytes, contentType });
    }
    // manifest.json por último: o pacote só aparece depois de todos os arquivos.
    objetos.push({ key: `${prefixo.slice(1)}manifest.json`, file: join(pasta, 'manifest.json'), sha256: manifestSha, bytes: manifestBytes.byteLength, contentType: STUDIO_PACK_MIME['.json'] });
    pacotes.push({ id: pin.id, version: pin.version, objetos });
  }
  return pacotes;
}

/* ── cliente S3 mínimo ───────────────────────────────────────────────────────── */
function clienteS3({ endpoint, creds, fetchImpl }) {
  const urlDe = (key) => `${endpoint.replace(/\/$/, '')}/${creds.R2_BUCKET}/${key}`;
  const pedir = (method, key, { headers = {}, body, payloadSha256 } = {}) => {
    const url = urlDe(key);
    return fetchImpl(url, { method, body, headers: assinar({ method, url, headers, payloadSha256, creds }) });
  };
  return {
    async estado(objeto) {
      const res = await pedir('HEAD', objeto.key);
      if (res.status === 404) return 'enviar';
      if (!res.ok) throw new PublishError('s3', `HEAD ${objeto.key} → HTTP ${res.status}`);
      const meta = res.headers.get('x-amz-meta-sha256');
      const tamanho = Number(res.headers.get('content-length'));
      if (meta) return meta === objeto.sha256 && tamanho === objeto.bytes ? 'igual' : 'conflito';
      // Sem metadado (objeto subido por outra ferramenta): decide pelo conteúdo.
      const get = await pedir('GET', objeto.key);
      if (!get.ok) throw new PublishError('s3', `GET ${objeto.key} → HTTP ${get.status}`);
      return sha256(Buffer.from(await get.arrayBuffer())) === objeto.sha256 ? 'igual' : 'conflito';
    },
    async enviar(objeto) {
      const body = await readFile(objeto.file);
      if (sha256(body) !== objeto.sha256) throw new PublishError('recusado', `${objeto.key} mudou no disco depois do plano`);
      const res = await pedir('PUT', objeto.key, {
        body,
        payloadSha256: objeto.sha256,
        headers: { 'content-type': objeto.contentType, 'cache-control': CACHE_IMUTAVEL, 'x-amz-meta-sha256': objeto.sha256, 'if-none-match': '*' },
      });
      if (res.status === 412) return (await this.estado(objeto)) === 'igual' ? 'igual' : 'conflito';
      if (!res.ok) throw new PublishError('s3', `PUT ${objeto.key} → HTTP ${res.status}`);
      return 'enviado';
    },
  };
}

async function emLotes(itens, limite, fn) {
  const saida = new Array(itens.length);
  let proximo = 0;
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) { const i = proximo++; saida[i] = await fn(itens[i], i); }
  }));
  return saida;
}

/* ── verificação pela origem pública ─────────────────────────────────────────── */
export async function verificarPublico(pacotes, { publicOrigin, corsOrigin, fetchImpl, concorrencia = 6 }) {
  const objetos = pacotes.flatMap((p) => p.objetos);
  const falhas = [];
  await emLotes(objetos, concorrencia, async (o) => {
    const url = `${publicOrigin.replace(/\/$/, '')}/${o.key}`;
    let res;
    try { res = await fetchImpl(url, { headers: { origin: corsOrigin }, cache: 'no-store' }); }
    catch (e) { falhas.push(`${url}: ${e?.message || e}`); return; }
    if (res.status !== 200) { falhas.push(`${url}: HTTP ${res.status}`); return; }
    const corpo = Buffer.from(await res.arrayBuffer());
    if (corpo.byteLength !== o.bytes) falhas.push(`${url}: ${corpo.byteLength} bytes, esperado ${o.bytes}`);
    if (sha256(corpo) !== o.sha256) falhas.push(`${url}: SHA-256 servido ≠ ${o.sha256}`);
    const tipo = (res.headers.get('content-type') || '').toLowerCase();
    if (tipo !== o.contentType.toLowerCase()) falhas.push(`${url}: Content-Type ${tipo || '(nenhum)'} ≠ ${o.contentType}`);
    if ((res.headers.get('cache-control') || '') !== CACHE_IMUTAVEL) falhas.push(`${url}: Cache-Control ${res.headers.get('cache-control') || '(nenhum)'}`);
    const acao = res.headers.get('access-control-allow-origin');
    if (acao !== '*' && acao !== corsOrigin) falhas.push(`${url}: CORS sem ${corsOrigin} (Access-Control-Allow-Origin ${acao || 'ausente'})`);
  });
  return { conferidos: objetos.length, falhas };
}

/* ── orquestração ────────────────────────────────────────────────────────────── */
export async function publicar({
  root, pins = CHARACTER_RELEASES, filtros = [], dryRun = false, verifyOnly = false,
  env = process.env, envFile = ENV_FILE_PADRAO, endpoint, publicOrigin = STUDIO_PACK_CDN_ORIGIN,
  corsOrigin = 'https://www.corosolto.com.br', fetchImpl = globalThis.fetch, log = console.log, concorrencia = 6,
} = {}) {
  const pacotes = await planoLocal(root, selecionarPins(pins, filtros));
  const objetos = pacotes.flatMap((p) => p.objetos);
  const totalBytes = objetos.reduce((s, o) => s + o.bytes, 0);
  log(`plano local: ${pacotes.length} pacote(s), ${objetos.length} objeto(s), ${totalBytes} bytes; SHA-256 de pin e inventário conferidos`);

  if (verifyOnly) {
    const v = await verificarPublico(pacotes, { publicOrigin, corsOrigin, fetchImpl, concorrencia });
    return { pacotes, estados: null, enviados: 0, verificacao: v };
  }

  const { creds, faltando } = carregarCredenciais({ env, envFile });
  if (faltando.length) {
    if (dryRun) {
      log(`dry-run sem credenciais (${faltando.join(', ')} ausente[s]): só o plano local, sem consultar o bucket`);
      for (const o of objetos) log(`  plano ${o.key} ${o.bytes}B ${o.contentType}`);
      return { pacotes, estados: null, enviados: 0, verificacao: null };
    }
    throw new PublishError('credencial', `faltando ${faltando.join(', ')} (ambiente ou ${envFile})`);
  }
  const s3 = clienteS3({ endpoint: endpoint || `https://${creds.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, creds, fetchImpl });

  const estados = await emLotes(objetos, concorrencia, (o) => s3.estado(o));
  const conflitos = objetos.filter((_, i) => estados[i] === 'conflito');
  const pendentes = objetos.filter((_, i) => estados[i] === 'enviar');
  log(`bucket ${creds.R2_BUCKET}: ${pendentes.length} a enviar, ${objetos.length - pendentes.length - conflitos.length} iguais (pula), ${conflitos.length} em conflito`);
  if (conflitos.length) {
    for (const o of conflitos) log(`  CONFLITO ${o.key}: já existe com outro conteúdo; objeto publicado não é sobrescrito`);
    throw new PublishError('conflito', `${conflitos.length} chave(s) já publicadas com outro conteúdo; nada foi enviado`);
  }
  if (dryRun) {
    for (const o of pendentes) log(`  enviaria ${o.key} ${o.bytes}B ${o.contentType}`);
    return { pacotes, estados, enviados: 0, verificacao: null };
  }

  let enviados = 0;
  for (const pacote of pacotes) {
    const doPacote = pendentes.filter((o) => pacote.objetos.includes(o));
    const arquivos = doPacote.filter((o) => !o.key.endsWith('/manifest.json'));
    const manifesto = doPacote.filter((o) => o.key.endsWith('/manifest.json'));
    for (const lote of [arquivos, manifesto]) {
      const r = await emLotes(lote, concorrencia, (o) => s3.enviar(o));
      const corrida = lote.filter((_, i) => r[i] === 'conflito');
      if (corrida.length) throw new PublishError('conflito', `${corrida[0].key} apareceu com outro conteúdo durante o envio`);
      enviados += r.filter((x) => x === 'enviado').length;
    }
    log(`  ${pacote.id}@${pacote.version}: ${doPacote.length} enviado(s), ${pacote.objetos.length - doPacote.length} já publicados`);
  }

  const verificacao = await verificarPublico(pacotes, { publicOrigin, corsOrigin, fetchImpl, concorrencia });
  return { pacotes, estados, enviados, verificacao };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────── */
function argumentos(argv) {
  const opcoes = { filtros: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => { const v = argv[++i]; if (v === undefined) recusa(`${a} sem valor`); return v; };
    if (a === '--dry-run') opcoes.dryRun = true;
    else if (a === '--verify-only') opcoes.verifyOnly = true;
    else if (a === '--json') opcoes.json = true;
    else if (a === '--root') opcoes.root = valor();
    else if (a === '--pack') opcoes.filtros.push(valor());
    else if (a === '--r2-env') opcoes.envFile = valor();
    else if (a === '--endpoint') opcoes.endpoint = valor();
    else if (a === '--public-origin') opcoes.publicOrigin = valor();
    else if (a === '--cors-origin') opcoes.corsOrigin = valor();
    else recusa(`opção desconhecida: ${a}`);
  }
  opcoes.root ??= process.env.STUDIO_PACK_ROOT;
  return opcoes;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { json, ...opcoes } = argumentos(process.argv.slice(2));
    const r = await publicar(opcoes);
    const v = r.verificacao;
    if (v) {
      for (const f of v.falhas) console.error(`  ✗ ${f}`);
      console.log(`verificação pública: ${v.conferidos - new Set(v.falhas.map((f) => f.split(': ')[0])).size}/${v.conferidos} objeto(s) conferidos (SHA-256, bytes, Content-Type, Cache-Control, CORS)`);
    }
    if (json) console.log(JSON.stringify({ enviados: r.enviados, pacotes: r.pacotes.map((p) => `${p.id}@${p.version}`), falhas: v?.falhas ?? [] }));
    process.exit(v?.falhas.length ? 1 : 0);
  } catch (e) {
    console.error(e instanceof PublishError ? e.message : (e?.stack || e));
    process.exit(e instanceof PublishError && e.code !== 's3' ? 2 : 1);
  }
}
