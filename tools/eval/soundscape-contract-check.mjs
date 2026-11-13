#!/usr/bin/env node
/* Contrato mapa → soundscape. Um loop só é carregável quando publica `src` string;
 * `path` parece válido no mapa, mas vira fetch(undefined) no consumidor. */
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { createSoundscape, AMB_LOOPS, BIOME_SHOTS } from '../../public/js/soundscape.js';
import { resolveAmbientePack } from '../audio/ambiente-pack.mjs';

const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').slice(10) || null;
if (MUTANTE && !['path-no-lugar-de-src', 'posicao-sem-z', 'piscina-sem-loops', 'asset-ausente'].includes(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const textures = await initTextures();
const invalidos = [];
let mutanteAplicado = false;
let alvoMutado = null;
let loopsConsumidos = 0;
let piscinaVista = false;
const srcsUnicos = new Set();

async function consumirLoops(loops) {
  const originalFetch = globalThis.fetch;
  const ganhos = [];
  const parametro = (ganho = false) => {
    const param = { value: 0, chamadas: 0, setTargetAtTime(value) {
      if (!Number.isFinite(value)) throw new Error('AudioParam recebeu valor não finito');
      this.chamadas++;
    } };
    if (ganho) ganhos.push(param);
    return param;
  };
  const node = () => ({ connect() {}, start() {}, stop() {} });
  const ctx = { currentTime: 1, decodeAudioData: async () => ({ duration: 1 }),
    createBufferSource: node, createGain: () => ({ ...node(), gain: parametro(true) }),
    createStereoPanner: () => ({ ...node(), pan: parametro() }) };
  const soundscape = createSoundscape({ ctx, master: {} }, { loops });
  globalThis.fetch = async () => new Response(new Uint8Array(1));
  try {
    soundscape.update(.016, { x: 2, y: 1.65, z: -3 });
    for (let i = 0; i < 20 && soundscape.state.loops.length !== loops.length; i++)
      await new Promise(resolve => setImmediate(resolve));
    if (soundscape.state.loops.length !== loops.length) throw new Error('loops não chegaram ao consumidor');
    soundscape.update(.016, { x: 2, y: 1.65, z: -3 });
    if (ganhos.length !== loops.length || ganhos.some(param => param.chamadas === 0))
      throw new Error('update não escreveu todos os ganhos');
    loopsConsumidos += loops.length;
  } finally { soundscape.dispose(); globalThis.fetch = originalFetch; }
}

for (const [mapa, registro] of Object.entries(MAPS)) {
  const world = registro.build(new THREE.Scene(), textures);
  const loops = world.sound?.loops || [];
  for (const l of loops) if (typeof l.src === 'string') srcsUnicos.add(l.src);
  if (mapa === 'piscina_treta') {
    piscinaVista = true;
    if (MUTANTE === 'piscina-sem-loops') {
      loops.splice(0); mutanteAplicado = true; alvoMutado = { mapa, indice: -2 };
    }
    if (loops.length !== 2) invalidos.push({ mapa, indice: -2, motivo: 'Piscina precisa publicar os dois loops' });
  }
  if (MUTANTE === 'path-no-lugar-de-src' && !mutanteAplicado && loops.length) {
    loops[0] = { ...loops[0], path: loops[0].src };
    delete loops[0].src;
    mutanteAplicado = true; alvoMutado = { mapa, indice: 0 };
  }
  if (MUTANTE === 'posicao-sem-z' && !mutanteAplicado && loops.length) {
    loops[0] = { ...loops[0], pos: [0, 0] };
    mutanteAplicado = true; alvoMutado = { mapa, indice: 0 };
  }
  loops.forEach((loop, indice) => {
    if (typeof loop.src !== 'string' || !loop.src.trim() || Object.hasOwn(loop, 'path')) {
      invalidos.push({ mapa, indice, src: loop.src, path: loop.path });
    }
    if (loop.pos !== undefined && (!Array.isArray(loop.pos) || loop.pos.length !== 3 || !loop.pos.every(Number.isFinite))) {
      invalidos.push({ mapa, indice, src: loop.src, path: loop.path, pos: loop.pos, motivo: 'posição precisa de XYZ finitos' });
    }
  });
  if (!invalidos.some(item => item.mapa === mapa)) {
    try { await consumirLoops(loops); }
    catch (error) { invalidos.push({ mapa, indice: -1, motivo: error.message }); }
  }
}

if (!piscinaVista) invalidos.push({ mapa: 'piscina_treta', indice: -2, motivo: 'Piscina não foi construída' });

/* SC3 (#1137, crítica estraga-codigo): o fetch controlado do consumidor não prova
   existência — src inexistente passava nas duas cláusulas e só morria em produção.

   v9 (audio-pack): os srcs de ambiência NÃO existem na origem pelo nome — o pack
   publica-os binários (`a/<sha1-16>.mp3`, decisão do dono). Validar o nome cru na
   origem era medir 404 eterno e contabilizá-lo como "dívida". Agora cada src
   resolve pela MESMA tabela que o instalador usa (`tools/audio/ambiente-pack.mjs`)
   e a entrada resolvida tem de existir na release que o build realmente baixa —
   conferida no diretório central do zip por HTTP Range, sem baixar os 225 MB.
   Falha de rede aqui é REPROVAÇÃO, não passagem silenciosa (o HEAD antigo tratava
   timeout como presença). Timeout, erro de conexão e HTTP 408/429/5xx têm no
   máximo três tentativas com backoff curto; 404, asset ausente e zip inválido
   continuam falhando imediatamente. Src de outra família (fora de `audio/ambiente/`)
   segue no HEAD da origem de sempre. Asset novo que o código nomear sem estar no
   catálogo reprova — a dívida de publicação acabou com o v9. */
const PACK_SRC = readFileSync('scripts/fetch-audio.sh', 'utf8')
  .match(/https:\/\/github\.com\/corosolto\/client\/releases\/download\/(audio-pack-v\d+)\/audio-pack\.zip/)?.[0];
if (!PACK_SRC) {
  invalidos.push({ mapa: '*', indice: -3, motivo: 'fetch-audio.sh não declara a release do pack; SC3 não sabe o que cobrar' });
}

/* Diretório central do zip: EOCD (cauda do arquivo) dá offset/tamanho da tabela;
   a tabela dá os nomes. Zip64 fora de questão para este pack (<4 GB, <65535).
   Baixa por `node:https` (o harness desliga o `fetch` global das réguas) e segue
   o redirect da release manualmente, preservando o Range. */
const MAX_TENTATIVAS_SC3 = 3;
const ERROS_CONEXAO_SC3 = new Set([
  'ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'EHOSTUNREACH',
  'ENETUNREACH', 'ENOTFOUND', 'EPIPE', 'ETIMEDOUT', 'ERR_SOCKET_CONNECTION_TIMEOUT',
]);
const httpRepetivelSc3 = (status) => status === 408 || status === 429 || (status >= 500 && status <= 599);
const erroRepetivelSc3 = (error) => httpRepetivelSc3(Number(error?.statusCode)) || ERROS_CONEXAO_SC3.has(error?.code);
const backoffSc3 = (tentativa) => new Promise((resolve) => setTimeout(resolve, tentativa * 100));
function erroHttpSc3(status, detalhe) {
  const error = new Error(`HTTP ${status} para ${detalhe}`);
  error.statusCode = status;
  return error;
}
async function comRetrySc3(operacao) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_SC3; tentativa++) {
    try { return await operacao(); }
    catch (error) {
      if (tentativa === MAX_TENTATIVAS_SC3 || !erroRepetivelSc3(error)) throw error;
      await backoffSc3(tentativa);
    }
  }
  throw new Error('retry SC3 terminou sem veredito');
}
function transporteSc3(url) {
  return new URL(url).protocol === 'http:' ? http : https;
}

function pedacoRangeUmaVez(url, range, saltos = 0) {
  return new Promise((resolve, reject) => {
    if (saltos > 5) return reject(new Error('muitos redirecionamentos na release do pack'));
    const pedido = transporteSc3(url).request(new URL(url), { method: 'GET', headers: { Range: range } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(pedacoRangeUmaVez(res.headers.location, range, saltos + 1));
      }
      if (res.statusCode !== 206) { res.resume(); return reject(erroHttpSc3(res.statusCode, `Range ${range}`)); }
      const pedacos = [];
      res.on('data', (c) => pedacos.push(c));
      res.on('end', () => resolve({ buf: Buffer.concat(pedacos), tamanhoTotal: Number(res.headers['content-range']?.split('/')[1] || 0) }));
    });
    pedido.setTimeout(15_000, () => {
      const error = new Error('timeout lendo o zip do pack');
      error.code = 'ETIMEDOUT';
      pedido.destroy(error);
    });
    pedido.on('error', reject);
    pedido.end();
  });
}

async function pedacoRange(url, range) {
  return comRetrySc3(() => pedacoRangeUmaVez(url, range));
}

async function statusOrigem(src, origem) {
  const url = new URL(src.replace(/^\//, ''), origem.endsWith('/') ? origem : origem + '/');
  try {
    return await comRetrySc3(async () => {
      const status = await new Promise((resolve, reject) => {
        const pedido = transporteSc3(url).request(url, { method: 'HEAD' }, (res) => { res.resume(); resolve(res.statusCode); });
        pedido.setTimeout(10_000, () => {
          const error = new Error('timeout no HEAD do asset');
          error.code = 'ETIMEDOUT';
          pedido.destroy(error);
        });
        pedido.on('error', reject);
        pedido.end();
      });
      if (httpRepetivelSc3(status)) throw erroHttpSc3(status, `HEAD ${src}`);
      return status;
    });
  } catch (error) {
    return Number(error.statusCode) || 0;
  }
}

/* Prova local e determinística do retry: duas falhas transitórias antes do 206;
   o 404 é contrato e precisa parar na primeira resposta. */
async function provarRetrySc3() {
  let transitórias = 0;
  let ausentes = 0;
  const servidor = http.createServer((req, res) => {
    if (req.url === '/transitorio') {
      transitórias++;
      if (transitórias < 3) {
        res.writeHead(transitórias === 1 ? 503 : 504);
        res.end();
        return;
      }
      res.writeHead(206, { 'Content-Range': 'bytes 0-0/1', 'Content-Length': '1' });
      res.end('x');
      return;
    }
    if (req.url === '/ausente') {
      ausentes++;
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(400);
    res.end();
  });
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const endereco = servidor.address();
  const base = `http://127.0.0.1:${endereco.port}`;
  try {
    const resposta = await pedacoRange(`${base}/transitorio`, 'bytes=0-0');
    assert.equal(resposta.buf.toString(), 'x');
    assert.equal(resposta.tamanhoTotal, 1);
    assert.equal(transitórias, 3, '503/504 precisam parar no terceiro 206');
    await assert.rejects(pedacoRange(`${base}/ausente`, 'bytes=0-0'), /HTTP 404/);
    assert.equal(ausentes, 1, '404 não pode tentar de novo');
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
  }
}

async function entradasDoPack(url) {
  /* O proxy de release não aceita Range sufixo (`bytes=-N` → 501); primeiro um
     `0-0` para aprender o tamanho, depois os pedaços com offsets explícitos. */
  const ponta = await pedacoRange(url, 'bytes=0-0');
  const tamanhoZip = ponta.tamanhoTotal;
  if (!tamanhoZip) throw new Error('release do pack não reportou tamanho no content-range');
  const cauda = await pedacoRange(url, `bytes=${tamanhoZip - 65557}-${tamanhoZip - 1}`);
  const eocd = cauda.buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('EOCD não encontrado no zip do pack');
  const tamanhoCd = cauda.buf.readUInt32LE(eocd + 12);
  const inicioCd = cauda.buf.readUInt32LE(eocd + 16);
  if (tamanhoCd === 0xffffffff || inicioCd === 0xffffffff) throw new Error('zip64 não suportado pela régua');
  const cd = await pedacoRange(url, `bytes=${inicioCd}-${inicioCd + tamanhoCd - 1}`);
  const nomes = new Set();
  let p = 0;
  while (p + 46 <= cd.buf.length && cd.buf.readUInt32LE(p) === 0x02014b50) {
    nomes.add(cd.buf.toString('utf8', p + 46, p + 46 + cd.buf.readUInt16LE(p + 28)));
    p += 46 + cd.buf.readUInt16LE(p + 28) + cd.buf.readUInt16LE(p + 30) + cd.buf.readUInt16LE(p + 32);
  }
  if (!nomes.size) throw new Error('diretório central do pack veio vazio');
  return nomes;
}

if (!MUTANTE || MUTANTE === 'asset-ausente') {
  if (!MUTANTE) await provarRetrySc3();
  const ORIGEM = process.env.ASSET_ORIGIN || 'https://www.corosolto.com.br';
  const alvos = [...srcsUnicos, ...Object.values(AMB_LOOPS)];
  for (const pools of Object.values(BIOME_SHOTS)) for (const pool of pools) alvos.push(...pool.srcs);
  /* Mutante: o primeiro src de ambiente resolve para um hash que não existe no
     pack (entrada sumida) E um probe cru fora do catálogo entra na lista. As duas
     cláusulas novas têm de morder. */
  const forcarAusente = MUTANTE === 'asset-ausente'
    ? [...alvos].find((src) => resolveAmbientePack(src))
    : null;
  if (MUTANTE === 'asset-ausente') alvos.push('audio/ambiente/asset-ausente-probe.mp3');
  let nomes = null;
  try { nomes = PACK_SRC ? await entradasDoPack(PACK_SRC) : null; } catch (e) {
    invalidos.push({ mapa: '*', indice: -3, motivo: `pack inacessível para o contrato SC3: ${e.message}` });
  }
  const ausentesOrigem = [];
  const ausentesPack = new Set();
  for (const src of new Set(alvos)) {
    const pack = src === forcarAusente ? 'audio/a/0000000000000000.mp3' : resolveAmbientePack(src);
    if (pack !== null) {
      if (nomes && !nomes.has(pack.replace(/^audio\//, ''))) ausentesPack.add(`${src} → ${pack} ausente de ${PACK_SRC.split('/').slice(-2)[0]}`);
      continue;
    }
    if (typeof src === 'string' && src.startsWith('audio/ambiente/')) {
      ausentesPack.add(`${src} fora do catálogo do pack (ambiente-pack.mjs)`);
      continue;
    }
    const status = await statusOrigem(src, ORIGEM);
    if (status >= 400 || status === 0) ausentesOrigem.push(`${src} (HTTP ${status})`);
  }
  if (MUTANTE === 'asset-ausente') {
    const mordeuCatalogo = [...ausentesPack].some((a) => a.includes('asset-ausente-probe'));
    const mordeuPack = [...ausentesPack].some((a) => a.includes('0000000000000000'));
    console.log(`${mordeuCatalogo && mordeuPack ? 'MUTANTE MORDIDO' : 'MUTANTE NÃO DETECTADO'}: asset-ausente`);
    console.log(`  SC3 catálogo: probe cru fora da tabela ${mordeuCatalogo ? 'reprovou — PASSA' : 'passou — FALHA'}`);
    console.log(`  SC3 pack: hash forçado ausente da release ${mordeuPack ? 'reprovou — PASSA' : 'passou — FALHA'} (${alvos.length - 1} srcs reais ok)`);
    process.exit(mordeuCatalogo && mordeuPack ? 0 : 1);
  }
  for (const a of ausentesPack) invalidos.push({ mapa: '*', indice: -3, motivo: `asset ausente do pack: ${a}` });
  for (const a of ausentesOrigem) invalidos.push({ mapa: '*', indice: -3, motivo: `asset inexistente na origem: ${a}` });
}

if (MUTANTE && !mutanteAplicado) {
  console.error('MUTANTE NÃO APLICOU: nenhum mapa declarou loop de áudio');
  process.exit(1);
}

console.log(`SOUNDSCAPE — contrato de ${Object.keys(MAPS).length} mapas${MUTANTE ? ` [mutante: ${MUTANTE}]` : ''}`);
if (invalidos.length) {
  for (const item of invalidos) console.log(`  x ${item.mapa} loop ${item.indice}: src=${String(item.src)} path=${String(item.path)} ${item.motivo ?? ''} pos=${JSON.stringify(item.pos)}`);
  if (MUTANTE) {
    const detected = invalidos.some(item => item.mapa === alvoMutado.mapa && item.indice === alvoMutado.indice
      && (MUTANTE !== 'posicao-sem-z' || item.motivo));
    console.log(`${detected ? 'MUTANTE MORDIDO' : 'MUTANTE NÃO DETECTADO'}: ${MUTANTE}`);
    process.exit(detected ? 0 : 1);
  }
  process.exit(1);
}
if (MUTANTE) {
  console.error(`MUTANTE SOBREVIVEU: ${MUTANTE}`);
  process.exit(1);
}
console.log('  SC1 todos os loops publicam src string e posição XYZ finita — PASSA');
console.log(`  SC2 consumidor real atualizou ${loopsConsumidos} loops com AudioParams finitos (fetch/decode locais) — PASSA`);
console.log(`  SC3 pack v9: todo src de ambiente do código resolve e existe na release do pack (nomes binários; HEAD na origem só para famílias fora do catálogo) — PASSA`);
console.log('  SC3 retry: 503/504 duas vezes antes do 206 e 404 sem nova tentativa — PASSA');
