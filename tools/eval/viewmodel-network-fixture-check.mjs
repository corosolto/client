#!/usr/bin/env node
/* RÉGUA da fixture que serve o viewmodel publicado ao portão de armas
   (tools/eval/viewmodel-network-fixture.mjs), contra um servidor HTTP local programável.
     R1  500/503 voltam e a tentativa seguinte serve; conexão cortada (antes da resposta e no meio
         do corpo) e timeout também
     R2  404 reprova na 1ª ida, sem nova tentativa
     R3  bytes fora do manifesto reprovam na 1ª ida, sem nova tentativa
     R4  falha persistente para no teto de tentativas e o erro lista cada uma
     R5  a concorrência fica no limite pedido e todos os pedidos terminam
   Mutantes (cada um tem de reprovar com exit 1): sem-retry, retenta-404, retenta-bytes-errados,
   sem-checar-bytes, sem-limite. */
import { createHash } from 'node:crypto';
import http from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const MUTANTE = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
const MUTACOES = {
  'sem-retry': ['const { tentativas, timeoutMs, esperaBaseMs } = { ...PADRAO_REDE, ...opcoes };',
    'const { timeoutMs, esperaBaseMs } = { ...PADRAO_REDE, ...opcoes }; const tentativas = 1;'],
  'retenta-404': ['if (response.status < 500) throw new FalhaDefinitiva(', 'if (response.status < 400) throw new FalhaDefinitiva('],
  // Divergência tratada como corte de conexão: volta a tentar em vez de reprovar.
  'retenta-bytes-errados': ['throw new FalhaDefinitiva(`viewmodel publicado diverge do manifesto: ${entry.path} veio com ${body.length} bytes e sha256 ${sha256}, manifesto ${entry.bytes} bytes e ${entry.sha256}`);',
    "throw Object.assign(new Error('viewmodel publicado diverge do manifesto'), { code: 'ECONNRESET' });"],
  'sem-checar-bytes': ['if (body.length !== entry.bytes || sha256 !== entry.sha256) {', 'if (false) {'],
  'sem-limite': ['if (ativos < maximo) ativos++;', 'if (true) ativos++;'],
};
if (MUTANTE && !MUTACOES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let fonte = readFileSync(path.join(AQUI, 'viewmodel-network-fixture.mjs'), 'utf8');
if (MUTANTE) {
  const [de, para] = MUTACOES[MUTANTE];
  if (!fonte.includes(de)) { console.error(`mutante ${MUTANTE} não encontrou o trecho`); process.exit(2); }
  fonte = fonte.replace(de, para);
}
const dir = mkdtempSync(path.join(tmpdir(), 'vm-rede-'));
const arquivo = path.join(dir, 'fixture.mjs');
writeFileSync(arquivo, fonte);
const { criarBuscadorViewmodels } = await import(pathToFileURL(arquivo).href);

const corpo = Buffer.from('glb-do-manifesto-'.repeat(64));
const errado = Buffer.from(corpo).fill(0x41, 0, 8);
const ROTEIROS = ['flaky500', 'reset', 'truncado', 'lento', 'nao-existe', 'bytes-errados', 'sempre503'];
const manifesto = {
  servedRoot: '/private-assets/viewmodels',
  files: [...ROTEIROS, ...Array.from({ length: 10 }, (_, i) => `conc${i}`)].map((nome) => ({
    path: `${nome}/arma.glb`, bytes: corpo.length, sha256: createHash('sha256').update(corpo).digest('hex'), contentType: 'model/gltf-binary',
  })),
};

const idas = new Map();
let emVoo = 0;
let picoEmVoo = 0;
const servidor = http.createServer((req, res) => {
  const nome = new URL(req.url, 'http://local').pathname.split('/')[3];
  const ida = (idas.get(nome) || 0) + 1;
  idas.set(nome, ida);
  const serve = (dados = corpo) => { res.writeHead(200, { 'content-type': 'model/gltf-binary', 'content-length': dados.length }); res.end(dados); };
  if (nome === 'flaky500') return ida <= 2 ? (res.writeHead(500), res.end('erro')) : serve();
  if (nome === 'reset') return ida === 1 ? req.socket.destroy() : serve();
  if (nome === 'truncado') {
    if (ida > 1) return serve();
    res.writeHead(200, { 'content-type': 'model/gltf-binary', 'content-length': corpo.length });
    res.write(corpo.subarray(0, 100));
    return setTimeout(() => req.socket.destroy(), 20);
  }
  if (nome === 'lento') return ida === 1 ? undefined : serve();
  if (nome === 'nao-existe') return res.writeHead(404), res.end('not_found');
  if (nome === 'bytes-errados') return serve(errado);
  if (nome === 'sempre503') return res.writeHead(503), res.end('indisponivel');
  emVoo++;
  picoEmVoo = Math.max(picoEmVoo, emVoo);
  setTimeout(() => { emVoo--; serve(); }, 60);
});
await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
const origem = new URL(`http://127.0.0.1:${servidor.address().port}`);
const buscar = criarBuscadorViewmodels({ origem, manifesto, tentativas: 4, timeoutMs: 300, esperaBaseMs: 10, concorrencia: 3 });
const pedir = async (nome) => {
  try {
    const { body } = await buscar(new URL(`http://jogo${manifesto.servedRoot}/${nome}/arma.glb?v=1`));
    return { ok: body.equals(corpo) };
  } catch (error) {
    return { ok: false, erro: error.message };
  }
};

const falhas = [];
const check = (ok, id, msg) => { if (!ok) falhas.push(id); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${msg}`); };

for (const [nome, idasEsperadas] of [['flaky500', 3], ['reset', 2], ['truncado', 2], ['lento', 2]]) {
  const r = await pedir(nome);
  check(r.ok && idas.get(nome) === idasEsperadas, 'R1', `${nome}: ${r.ok ? 'serviu' : r.erro} após ${idas.get(nome)} ida(s)`);
}
const r404 = await pedir('nao-existe');
check(!r404.ok && idas.get('nao-existe') === 1 && /404/.test(r404.erro || ''), 'R2', `404: ${idas.get('nao-existe')} ida(s), ${r404.erro}`);
const rBytes = await pedir('bytes-errados');
check(!rBytes.ok && idas.get('bytes-errados') === 1 && /diverge do manifesto/.test(rBytes.erro || ''),
  'R3', `bytes errados: ${idas.get('bytes-errados')} ida(s), ${rBytes.erro}`);
const r503 = await pedir('sempre503');
check(!r503.ok && idas.get('sempre503') === 4 && (r503.erro?.match(/tentativa \d: HTTP 503/g) || []).length === 4,
  'R4', `503 persistente: ${idas.get('sempre503')} ida(s)\n${r503.erro}`);
const conc = await Promise.all(Array.from({ length: 10 }, (_, i) => pedir(`conc${i}`)));
check(conc.every((r) => r.ok) && picoEmVoo <= 3 && picoEmVoo >= 2, 'R5', `10 pedidos com limite 3: pico ${picoEmVoo} em voo`);

servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`viewmodel-network-fixture${MUTANTE ? ` [mutante ${MUTANTE}]` : ''}: ${falhas.length ? `${falhas.length} falha(s): ${[...new Set(falhas)].join(', ')}` : 'PASS'}`);
process.exit(falhas.length ? 1 : 0);
