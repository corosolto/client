#!/usr/bin/env node
/* publish-packs-check.mjs — RÉGUA DO PUBLICADOR DE PACOTES DO STUDIO NO R2.
   ----------------------------------------------------------------------------
   POR QUE EXISTE: scripts/publish-studio-packs.mjs é o único caminho dos pacotes
   fixados até https://assets.corosolto.com.br. Erro nele vira personagem quebrado
   em produção (MIME/Cache-Control errados, objeto publicado sobrescrito, verificação
   que aprova byte adulterado) — e ninguém roda a publicação duas vezes para ver.

   COMO MEDE: pacotes SINTÉTICOS num diretório temporário, pins sintéticos, e um R2 de
   mentira na memória (fetchImpl): endpoint S3 que confere a assinatura SigV4 com uma
   implementação PRÓPRIA desta régua, honra If-None-Match: * e guarda metadados; e uma
   origem pública que serve os objetos com os headers gravados e CORS configurável.
   Nenhum pedido de rede real.

   Cláusulas:
     P0  manifest.json local ≠ pin, ou arquivo do inventário adulterado no disco → recusa sem nenhum pedido
     P1  bucket vazio: todos os objetos sobem com Content-Type da extensão, Cache-Control imutável,
         x-amz-meta-sha256 e If-None-Match: *; manifest.json é o último PUT do pacote; verificação limpa
     P2  segunda rodada: tudo igual, zero PUT
     P3  chave já publicada com outro conteúdo → conflito antes do primeiro PUT (zero PUT na rodada);
         P3b sem metadado decide pelo conteúdo; P3c objeto que aparece entre o HEAD e o PUT não é sobrescrito
     P4  dry-run: com credencial só HEAD, sem credencial nenhum pedido
     P5  verificação pública reprova SHA-256 adulterado, CORS ausente e Cache-Control errado; --verify-only não toca o S3
     P6  segredo nunca aparece em log nem em erro; credencial faltando nomeia só as chaves
     P7  assinatura SigV4 confere na implementação independente (o R2 de mentira responde 403 se não)
     P8  credenciais do arquivo r2.env quando o ambiente não traz; ambiente tem precedência
     P9  endpoint travado: todo fetch (S3 e origem pública) tem prazo; a rodada falha em vez de pendurar

   Mutantes (cópia mutada em diretório temporário):
     node tools/eval/publish-packs-check.mjs --mutantes */
import { spawnSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '../..');
const PUB = 'scripts/publish-studio-packs.mjs';
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];

/* [arquivo, trecho original, trecho mutado, prefixos de cláusula que têm de morder] */
const mutacoes = {
  'pin-ignorado': [PUB, 'if (manifestSha !== pin.manifestSha256) recusa(', 'if (false) recusa(', ['P0:']],
  'inventario-ignorado': [PUB, "if (sha256(bytes) !== entry.sha256) recusa(", 'if (false) recusa(', ['P0:']],
  'mime-generico': [PUB, 'const contentType = STUDIO_PACK_MIME[extname(entry.path).toLowerCase()];', "const contentType = 'application/octet-stream';", ['P1:']],
  'sem-cache-control': [PUB, "'cache-control': CACHE_IMUTAVEL, ", '', ['P1:', 'P2:', 'P3', 'P4:', 'P5:']],
  'manifesto-primeiro': [PUB, 'for (const lote of [arquivos, manifesto])', 'for (const lote of [manifesto, arquivos])', ['P1:', 'P3c:']],
  'sobrescreve-diferente': [PUB, "return meta === objeto.sha256 && tamanho === objeto.bytes ? 'igual' : 'conflito';", "return meta === objeto.sha256 && tamanho === objeto.bytes ? 'igual' : 'enviar';", ['P3:']],
  'sem-if-none-match': [PUB, ", 'if-none-match': '*'", '', ['P1:', 'P3c:']],
  'dry-run-escreve': [PUB, '    return { pacotes, estados, enviados: 0, verificacao: null };\n', '', ['P4:']],
  'verificacao-ignora-sha': [PUB, 'if (sha256(corpo) !== o.sha256) falhas.push(', 'if (false) falhas.push(', ['P5:']],
  'verificacao-ignora-cors': [PUB, "if (acao !== '*' && acao !== corsOrigin) falhas.push(", 'if (false) falhas.push(', ['P5:']],
  'segredo-no-log': [PUB, 'log(`bucket ${creds.R2_BUCKET}: ', 'log(`bucket ${creds.R2_BUCKET} ${creds.R2_SECRET_ACCESS_KEY}: ', ['P6:']],
  'assinatura-errada': [PUB, "const assinados = nomes.join(';');", "const assinados = nomes.join(',');", ['P1:', 'P2:', 'P3', 'P4:', 'P5:', 'P7:', 'P8:']],
  'env-file-ignorado': [PUB, '[k, env[k] || arquivo[k] || \'\']', "[k, env[k] || '']", ['P8:']],
  'sem-prazo': [PUB, 'signal: opts.signal ?? AbortSignal.timeout(prazoMs)', 'signal: opts.signal', ['P9:']],
};
if (mutante && !mutacoes[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);
if (process.argv.includes('--mutantes')) {
  const vivos = [];
  for (const nome of Object.keys(mutacoes)) {
    const r = spawnSync(process.execPath, [import.meta.filename, `--mutante=${nome}`], { encoding: 'utf8' });
    const linha = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').pop();
    console.log(`${r.status === 0 ? '  ✓' : '  ✗'} ${linha}`);
    if (r.status !== 0) vivos.push(nome);
  }
  if (vivos.length) console.error(`${vivos.length} mutante(s) sobreviveram: ${vivos.join(', ')}`);
  else console.log(`${Object.keys(mutacoes).length} mutantes reprovados na cláusula certa.`);
  process.exit(vivos.length ? 1 : 0);
}

const temporario = mkdtempSync(join(tmpdir(), 'publish-packs-'));
let base = ROOT;
if (mutante) {
  const [alvo, de, para] = mutacoes[mutante];
  base = join(temporario, 'repo');
  for (const rel of [PUB, 'scripts/studio-pack-serving.mjs', 'public/js/studio-character.js', 'public/js/version.js',
    'public/js/data/content-releases.js', 'public/js/data/pack-origin.js']) {
    mkdirSync(dirname(join(base, rel)), { recursive: true });
    copyFileSync(join(ROOT, rel), join(base, rel));
  }
  const caminho = join(base, alvo);
  const original = (await import('node:fs')).readFileSync(caminho, 'utf8');
  const ocorrencias = original.split(de).length - 1;
  if (ocorrencias !== 1) throw new Error(`mutante exige âncora única: ${mutante} (${ocorrencias})`);
  writeFileSync(caminho, original.replace(de, para));
}
const P = await import(pathToFileURL(join(base, PUB)).href);

const falhas = [];
const falha = (msg) => falhas.push(msg);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const bytesDe = (rotulo, n) => Buffer.from(Array.from({ length: n }, (_, i) => (i * 37 + rotulo.charCodeAt(i % rotulo.length) * 11) & 255));

/* ── pacotes sintéticos ─────────────────────────────────────────────────────── */
const RAIZ = join(temporario, 'studio-packs');
function pacote(id, versao) {
  const pasta = join(RAIZ, 'character', id, versao);
  const arquivos = new Map([
    ['model/corpo.glb', bytesDe(`${id}-modelo`, 3000)],
    ['animations/states.glb', bytesDe(`${id}-estados`, 1800)],
    ['previews/frente.png', bytesDe(`${id}-png`, 300)],
    ['previews/34.jpg', bytesDe(`${id}-jpg`, 200)],
    ['previews/capa.webp', bytesDe(`${id}-webp`, 150)],
    ['evidence/proveniencia.json', Buffer.from(`{"id":"${id}"}`)],
  ]);
  for (const [rel, b] of arquivos) { mkdirSync(dirname(join(pasta, rel)), { recursive: true }); writeFileSync(join(pasta, rel), b); }
  const manifest = Buffer.from(JSON.stringify({
    schemaVersion: 1, kind: 'character', id, version: versao,
    files: [...arquivos].map(([path, b]) => ({ path, sha256: sha(b), bytes: b.byteLength })),
  }, null, 2));
  writeFileSync(join(pasta, 'manifest.json'), manifest);
  return { pasta, arquivos, pin: { kind: 'character', id, version: versao, manifestSha256: sha(manifest), manifestUrl: `/packs/character/${id}/${versao}/manifest.json`, minRuntime: '2.1.0', skeleton: 'meshy-28' } };
}
const A = pacote('alfa', '1.0.0');
const B = pacote('beta', '0.2.1');
const PINS = { alfa: A.pin, beta: B.pin };
const TIPOS = { '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8' };

/* ── R2 de mentira ─────────────────────────────────────────────────────────── */
const CREDS = { R2_ACCOUNT_ID: 'conta-teste', R2_ACCESS_KEY_ID: 'AKIDTESTE123', R2_SECRET_ACCESS_KEY: 'segredo-que-nao-pode-vazar-9f8e7d', R2_BUCKET: 'corosolto-assets' };
const ENDPOINT = 'https://conta-teste.r2.test';
const PUBLICO = 'https://assets.test';
const SITE = 'https://www.corosolto.com.br';

// SigV4 reescrito aqui, de propósito sem importar nada do publicador.
function assinaturaEsperada(method, url, headers) {
  const auth = headers.authorization || '';
  const m = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/auto\/s3\/aws4_request, SignedHeaders=([a-z0-9;-]+), Signature=([0-9a-f]{64})$/.exec(auth);
  if (!m || m[1] !== CREDS.R2_ACCESS_KEY_ID) return false;
  const u = new URL(url);
  const nomes = m[3].split(';');
  for (const obrigatorio of ['host', 'x-amz-content-sha256', 'x-amz-date']) if (!nomes.includes(obrigatorio)) return false;
  const valor = (n) => (n === 'host' ? u.host : String(headers[n] ?? '').trim());
  const canonico = [method, u.pathname, '', nomes.map((n) => `${n}:${valor(n)}\n`).join(''), m[3], headers['x-amz-content-sha256']].join('\n');
  const data = headers['x-amz-date'];
  if (!data?.startsWith(m[2])) return false;
  const paraAssinar = ['AWS4-HMAC-SHA256', data, `${m[2]}/auto/s3/aws4_request`, sha(canonico)].join('\n');
  let k = createHmac('sha256', `AWS4${CREDS.R2_SECRET_ACCESS_KEY}`).update(m[2]).digest();
  for (const parte of ['auto', 's3', 'aws4_request']) k = createHmac('sha256', k).update(parte).digest();
  return createHmac('sha256', k).update(paraAssinar).digest('hex') === m[4];
}

function r2({ cors = '*', adultera = new Set(), cacheErrado = new Set(), intruso = null } = {}) {
  const loja = new Map();
  const pedidos = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || 'GET';
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    pedidos.push({ method, url, headers });
    if (url.startsWith(`${PUBLICO}/`)) {
      const o = loja.get(url.slice(PUBLICO.length + 1));
      if (!o) return new Response('nada', { status: 404 });
      let corpo = o.body;
      if (adultera.has(url.slice(PUBLICO.length + 1))) { corpo = Buffer.from(corpo); corpo[0] ^= 1; }
      const h = { 'content-type': o.contentType, 'cache-control': cacheErrado.has(url.slice(PUBLICO.length + 1)) ? 'max-age=60' : o.cacheControl };
      if (cors === '*' || cors === headers.origin) h['access-control-allow-origin'] = cors;
      return new Response(corpo, { status: 200, headers: h });
    }
    const prefixo = `${ENDPOINT}/${CREDS.R2_BUCKET}/`;
    if (!url.startsWith(prefixo)) return new Response('host desconhecido', { status: 599 });
    if (!assinaturaEsperada(method, url, headers)) return new Response('SignatureDoesNotMatch', { status: 403 });
    const key = url.slice(prefixo.length);
    if (intruso?.key === key && intruso.quando === method && !loja.has(key)) {
      loja.set(key, { body: intruso.body, contentType: 'application/octet-stream', cacheControl: '', meta: { sha256: sha(intruso.body) } });
    }
    const o = loja.get(key);
    if (method === 'HEAD' || method === 'GET') {
      if (!o) return new Response(null, { status: 404 });
      const h = { 'content-type': o.contentType, 'content-length': String(o.body.byteLength) };
      if (o.meta.sha256) h['x-amz-meta-sha256'] = o.meta.sha256;
      return new Response(method === 'GET' ? o.body : null, { status: 200, headers: h });
    }
    if (method === 'PUT') {
      const body = Buffer.from(init.body);
      if (headers['x-amz-content-sha256'] !== sha(body)) return new Response('XAmzContentSHA256Mismatch', { status: 400 });
      if (headers['if-none-match'] === '*' && o) return new Response('PreconditionFailed', { status: 412 });
      loja.set(key, { body, contentType: headers['content-type'], cacheControl: headers['cache-control'], meta: { sha256: headers['x-amz-meta-sha256'] }, ifNoneMatch: headers['if-none-match'] });
      return new Response(null, { status: 200 });
    }
    return new Response('método', { status: 405 });
  };
  return { loja, pedidos, fetchImpl };
}

const logs = [];
const opcoes = (bucket, extra = {}) => ({
  root: RAIZ, pins: PINS, env: { ...CREDS }, envFile: join(temporario, 'nao-existe.env'), endpoint: ENDPOINT,
  publicOrigin: PUBLICO, corsOrigin: SITE, fetchImpl: bucket.fetchImpl, log: (l) => logs.push(String(l)), concorrencia: 3, ...extra,
});
const puts = (bucket) => bucket.pedidos.filter((p) => p.method === 'PUT');
async function exigeErro(clausula, promessa, codigo) {
  try { await promessa; falha(`${clausula} rodada aceita, devia falhar com ${codigo}`); return null; }
  catch (e) { if (e?.code !== codigo) falha(`${clausula} falhou com ${e?.code || e?.name}: ${e?.message} (queria ${codigo})`); return e; }
}
const erros = [];

try {
  // ── P0 ──
  {
    const bucket = r2();
    const pins = { alfa: { ...A.pin, manifestSha256: 'f'.repeat(64) } };
    erros.push(await exigeErro('P0:', P.publicar(opcoes(bucket, { pins })), 'recusado'));
    const original = A.arquivos.get('previews/frente.png');
    writeFileSync(join(A.pasta, 'previews/frente.png'), Buffer.concat([original.subarray(0, 10), Buffer.from([original[10] ^ 1]), original.subarray(11)]));
    erros.push(await exigeErro('P0:', P.publicar(opcoes(bucket)), 'recusado'));
    writeFileSync(join(A.pasta, 'previews/frente.png'), original);
    if (bucket.pedidos.length) falha(`P0: ${bucket.pedidos.length} pedido(s) de rede com pacote local inválido`);
  }

  // ── P1 / P2 ──
  const cheio = r2();
  {
    const r = await P.publicar(opcoes(cheio)).catch((e) => { falha(`P1: publicação em bucket vazio falhou: ${e?.code} ${e?.message}`); return null; });
    const esperados = [A, B].flatMap((p) => [...p.arquivos.keys(), 'manifest.json'].map((rel) => `packs/character/${p.pin.id}/${p.pin.version}/${rel}`));
    if (r && r.enviados !== esperados.length) falha(`P1: ${r.enviados} enviados, esperado ${esperados.length}`);
    for (const key of esperados) {
      const o = cheio.loja.get(key);
      if (!o) { falha(`P1: ${key} não chegou ao bucket`); continue; }
      const tipo = TIPOS[key.slice(key.lastIndexOf('.'))];
      if (o.contentType !== tipo) falha(`P1: ${key} com Content-Type ${o.contentType}, devia ${tipo}`);
      if (o.cacheControl !== 'public, max-age=31536000, immutable') falha(`P1: ${key} com Cache-Control ${o.cacheControl}`);
      if (o.meta.sha256 !== sha(o.body)) falha(`P1: ${key} sem x-amz-meta-sha256 do conteúdo`);
      if (o.ifNoneMatch !== '*') falha(`P1: ${key} enviado sem If-None-Match: *`);
    }
    for (const p of [A, B]) {
      const doPacote = puts(cheio).map((x) => x.url).filter((u) => u.includes(`/${p.pin.id}/${p.pin.version}/`));
      if (!doPacote.at(-1)?.endsWith('/manifest.json')) falha(`P1: manifest.json de ${p.pin.id} não foi o último PUT do pacote`);
    }
    if (r && (!r.verificacao || r.verificacao.falhas.length)) falha(`P1: verificação pública com falha: ${r?.verificacao?.falhas?.[0] ?? 'não rodou'}`);
    if (r && r.verificacao?.conferidos !== esperados.length) falha(`P1: verificação conferiu ${r?.verificacao?.conferidos} de ${esperados.length}`);
    const n = puts(cheio).length;
    const r2b = await P.publicar(opcoes(cheio)).catch((e) => { falha(`P2: segunda rodada falhou: ${e?.code} ${e?.message}`); return null; });
    if (puts(cheio).length !== n || (r2b && r2b.enviados !== 0)) falha(`P2: segunda rodada fez ${puts(cheio).length - n} PUT`);
  }

  // ── P3 ──
  {
    const bucket = r2();
    const key = `packs/character/beta/0.2.1/model/corpo.glb`;
    bucket.loja.set(key, { body: bytesDe('outro', 3000), contentType: 'model/gltf-binary', cacheControl: '', meta: { sha256: sha(bytesDe('outro', 3000)) } });
    erros.push(await exigeErro('P3:', P.publicar(opcoes(bucket)), 'conflito'));
    if (puts(bucket).length) falha(`P3: ${puts(bucket).length} PUT numa rodada com conflito (devia recusar antes do primeiro)`);
    if (sha(bucket.loja.get(key).body) !== sha(bytesDe('outro', 3000))) falha('P3: objeto publicado foi sobrescrito');

    const semMeta = r2();
    const igual = `packs/character/alfa/1.0.0/previews/frente.png`;
    semMeta.loja.set(igual, { body: A.arquivos.get('previews/frente.png'), contentType: 'image/png', cacheControl: '', meta: {} });
    await P.publicar(opcoes(semMeta)).catch((e) => falha(`P3b: objeto igual sem metadado virou ${e?.code}`));
    if (puts(semMeta).some((p) => p.url.endsWith(igual))) falha('P3b: objeto igual sem metadado foi reenviado');
    const diferente = r2();
    diferente.loja.set(igual, { body: bytesDe('x', 300), contentType: 'image/png', cacheControl: '', meta: {} });
    erros.push(await exigeErro('P3b:', P.publicar(opcoes(diferente)), 'conflito'));

    const corrida = r2({ intruso: { key: 'packs/character/alfa/1.0.0/animations/states.glb', quando: 'PUT', body: bytesDe('intruso', 1800) } });
    erros.push(await exigeErro('P3c:', P.publicar(opcoes(corrida)), 'conflito'));
    const ficou = corrida.loja.get('packs/character/alfa/1.0.0/animations/states.glb')?.body;
    if (!ficou || sha(ficou) !== sha(bytesDe('intruso', 1800))) falha('P3c: objeto que apareceu entre HEAD e PUT foi sobrescrito ou não chegou ao PUT');
    if (corrida.loja.has('packs/character/alfa/1.0.0/manifest.json')) falha('P3c: manifest.json publicado com arquivo do pacote em conflito');
  }

  // ── P4 ──
  {
    const bucket = r2();
    const r = await P.publicar(opcoes(bucket, { dryRun: true })).catch((e) => { falha(`P4: dry-run falhou: ${e?.code} ${e?.message}`); return null; });
    if (puts(bucket).length || bucket.loja.size) falha(`P4: dry-run escreveu ${puts(bucket).length} objeto(s)`);
    if (r && !bucket.pedidos.some((p) => p.method === 'HEAD')) falha('P4: dry-run com credencial não consultou o bucket');
    const semCred = r2();
    await P.publicar(opcoes(semCred, { dryRun: true, env: {} })).catch((e) => falha(`P4: dry-run sem credencial falhou: ${e?.code}`));
    if (semCred.pedidos.length) falha(`P4: dry-run sem credencial fez ${semCred.pedidos.length} pedido(s)`);
  }

  // ── P5 ──
  {
    const pacotes = await P.planoLocal(RAIZ, Object.values(PINS));
    const alvo = 'packs/character/alfa/1.0.0/model/corpo.glb';
    for (const [nome, opc] of [['SHA-256', { adultera: new Set([alvo]) }], ['CORS', { cors: 'https://outro.site' }], ['Cache-Control', { cacheErrado: new Set([alvo]) }]]) {
      const bucket = r2(opc);
      for (const [k, v] of cheio.loja) bucket.loja.set(k, v);
      const v = await P.verificarPublico(pacotes, { publicOrigin: PUBLICO, corsOrigin: SITE, fetchImpl: bucket.fetchImpl });
      if (!v.falhas.some((f) => f.includes(nome))) falha(`P5: verificação aprovou ${nome} errado (${v.falhas.length} falha[s])`);
    }
    const so = r2();
    for (const [k, v] of cheio.loja) so.loja.set(k, v);
    const r = await P.publicar(opcoes(so, { verifyOnly: true, env: {} })).catch((e) => { falha(`P5: --verify-only falhou: ${e?.code}`); return null; });
    if (so.pedidos.some((p) => p.url.startsWith(ENDPOINT))) falha('P5: --verify-only tocou o endpoint S3');
    if (r && r.verificacao?.falhas.length) falha(`P5: --verify-only reprovou bucket íntegro: ${r.verificacao.falhas[0]}`);
  }

  // ── P6 ──
  {
    erros.push(await exigeErro('P6:', P.publicar(opcoes(r2(), { env: { R2_BUCKET: 'b' } })), 'credencial'));
    const textos = [...logs, ...erros.filter(Boolean).map((e) => `${e.message}\n${e.stack}`)];
    if (textos.some((t) => t.includes(CREDS.R2_SECRET_ACCESS_KEY))) falha('P6: segredo R2_SECRET_ACCESS_KEY apareceu em log ou erro');
    const semCred = erros.find((e) => e?.code === 'credencial');
    if (semCred && !/R2_ACCOUNT_ID.*R2_ACCESS_KEY_ID.*R2_SECRET_ACCESS_KEY/.test(semCred.message)) falha(`P6: erro de credencial não nomeia as chaves: ${semCred.message}`);
  }

  // ── P7 ──
  {
    const bucket = r2();
    await P.publicar(opcoes(bucket, { pins: { beta: B.pin } })).catch((e) => falha(`P7: publicação falhou: ${e?.code} ${e?.message}`));
    const s3 = bucket.pedidos.filter((p) => p.url.startsWith(ENDPOINT));
    const ruins = s3.filter((p) => !assinaturaEsperada(p.method, p.url, p.headers));
    if (!s3.length || ruins.length) falha(`P7: ${ruins.length}/${s3.length} pedido(s) S3 com assinatura SigV4 inválida`);
  }

  // ── P8 ──
  {
    const arquivo = join(temporario, 'r2.env');
    writeFileSync(arquivo, `# comentário\nexport R2_ACCOUNT_ID=${CREDS.R2_ACCOUNT_ID}\nR2_ACCESS_KEY_ID="${CREDS.R2_ACCESS_KEY_ID}"\nR2_SECRET_ACCESS_KEY='${CREDS.R2_SECRET_ACCESS_KEY}'\nR2_BUCKET=errado\n`);
    const { creds, faltando } = P.carregarCredenciais({ env: { R2_BUCKET: CREDS.R2_BUCKET }, envFile: arquivo });
    if (faltando.length || JSON.stringify(creds) !== JSON.stringify(CREDS)) falha(`P8: credenciais do r2.env não carregaram (faltando ${faltando.join(',') || 'nada'}; bucket ${creds.R2_BUCKET})`);
    const bucket = r2();
    await P.publicar(opcoes(bucket, { pins: { beta: B.pin }, env: { R2_BUCKET: CREDS.R2_BUCKET }, envFile: arquivo }))
      .catch((e) => falha(`P8: publicação com r2.env falhou: ${e?.code} ${e?.message}`));
  }

  // ── P9 ── endpoint que nunca responde: o prazo aborta e a rodada falha, sem esperar para sempre.
  {
    const travado = (url, opts = {}) => new Promise((_, rej) => {
      opts.signal?.addEventListener('abort', () => rej(opts.signal.reason ?? new Error('abortado')));
    });
    const vigia = new Promise((res) => setTimeout(() => res('pendurado'), 3000));
    const rodada = P.publicar(opcoes({ fetchImpl: travado }, { pins: { beta: B.pin }, prazoMs: 50 }))
      .then(() => 'aceita', () => 'erro');
    const fim = await Promise.race([rodada, vigia]);
    if (fim !== 'erro') falha(`P9: endpoint travado deixou a rodada ${fim === 'pendurado' ? 'pendurada' : 'aceita'}; todo fetch precisa de prazo`);
  }
} finally {
  rmSync(temporario, { recursive: true, force: true });
}

if (mutante) {
  const prefixos = mutacoes[mutante][3];
  const morde = falhas.length > 0 && falhas.every((f) => prefixos.some((p) => f.startsWith(p)));
  if (morde) console.log(`mutante ${mutante} reprovado como devia: ${falhas[0]}`);
  else {
    console.error(`MUTAÇÃO PASSOU — ${mutante} não foi visto na cláusula ${prefixos.join('/')} (${falhas.length} falha(s): ${falhas.join(' | ') || 'nenhuma'}).`);
    process.exitCode = 1;
  }
} else if (falhas.length) {
  console.error('publicador R2 reprovado:');
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log(`publicador R2 confere: imutável, MIME/Cache-Control/CORS/SHA verificados, segredo fora do log, ${Object.keys(mutacoes).length} mutantes de código.`);
}
process.exit(process.exitCode || 0);
