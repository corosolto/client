/* RÉGUA DA PARIDADE DE SIMULAÇÃO — o cliente recusa nó que roda OUTRA versão do jogo?
 *
 * POR QUE ELA EXISTE. Em 11/09 os três nós rodavam uma imagem com o cliente fixado em
 * `alpha.206` enquanto o site servia `alpha.247`. O protocolo de snapshot era o mesmo, o
 * handshake passava, ninguém via erro — e servidor e cliente eram jogos diferentes
 * (relato do dono: "matei 3x o mesmo bot pra ele morrer"). O `CLIENT_REF` do Dockerfile
 * é manual, e "lembrar de subir" não é portão.
 *
 * Conserto medido aqui: o nó anuncia no `welcome` a versão do cliente que ele SIMULA
 * (`clientVersion`, lida de `public/js/version.js` da árvore clonada) e o cliente recusa
 * a entrada quando ela não é a dele.
 *
 * Cláusulas:
 *   P1 · `versaoCompativel` aceita igual e recusa diferente.
 *   P2 · versão ausente (nó anterior ao conserto) NÃO derruba ninguém — degrada.
 *   P3 · o caminho real de conexão recusa: `welcome` com versão alheia rejeita com
 *        `versao_incompativel` e fecha o socket, sem virar sessão.
 *   P4 · a UI tem mensagem própria para esse erro (não cai no genérico).
 *   P5 · o nó anuncia `clientVersion` no welcome e no /health.
 *
 * Mutação (no FONTE, não no teste): --mutante=aceita-tudo faz `versaoCompativel` devolver
 * sempre true → P1 e P3b têm de ficar vermelhas.
 *
 *   node tools/eval/mp-paridade-check.mjs [--mutante=aceita-tudo]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let falhas = 0;
const cobra = (ok, msg, extra = '') => {
  console.log(`  ${ok ? 'PASSA' : 'FALHA'} ${msg}${extra ? ` — ${extra}` : ''}`);
  if (!ok) falhas += 1;
};

// O jogo lê `location` no caminho do welcome (kill-switch ?mpversao=0): em node não existe.
globalThis.location = { search: '', hostname: 'localhost' };

const NET_SRC = path.join(ROOT, 'public/js/net.js');
let fonte = fs.readFileSync(NET_SRC, 'utf8');
if (MUT === 'aceita-tudo') {
  const antes = fonte;
  fonte = fonte.replace(
    /export const versaoCompativel = [^;]+;/,
    'export const versaoCompativel = () => true;',
  );
  if (fonte === antes) { console.error('mutante não encontrou versaoCompativel em net.js'); process.exit(1); }
}
/* O módulo mutado vive ao LADO do original para que os imports relativos (./nos.js,
   ./netcodec.js, ./version.js) resolvam na árvore de verdade. */
const alvo = MUT ? path.join(ROOT, `public/js/.net-mutante-${process.pid}.js`) : NET_SRC;
if (MUT) fs.writeFileSync(alvo, fonte);
let mod;
try { mod = await import(pathToFileURL(alvo).href); } finally { if (MUT) fs.unlinkSync(alvo); }

const { VERSION } = await import(pathToFileURL(path.join(ROOT, 'public/js/version.js')).href);
const compativel = mod.versaoCompativel;

cobra(compativel(VERSION) === true && compativel('2.0.0-alpha.1') === false,
  'P1 · versaoCompativel aceita a nossa versão e recusa outra', `nossa=${VERSION}`);
cobra(compativel(undefined) === true && compativel('') === true,
  'P2 · nó sem clientVersion (anterior ao conserto) continua entrando');

/* P3 roda o `_conectar` de PRODUÇÃO com um transporte falso: sem browser e sem rede, mas
   é o código do jogo que decide entrar ou recusar. */
const transporteFalso = (versao) => {
  const tp = {
    fechado: false,
    abrir({ aberto, mensagem }) {
      aberto?.();
      setTimeout(() => mensagem(JSON.stringify({
        type: 'welcome', yourEnt: 1, yourTeam: 'E', map: 'praca_poderes',
        roster: [], clientVersion: versao,
      }), false, 0), 0);
    },
    fechar() { tp.fechado = true; },
    enviar() {},
  };
  return tp;
};

const NetClient = mod.NetClient || mod.default;
async function tentar(versao) {
  const cli = new NetClient('ws://x/ws', { nome: 'r', room: 'r' });
  const tp = transporteFalso(versao);
  try {
    await cli._conectar(2000, () => tp);
    return { entrou: true, fechou: tp.fechado };
  } catch (e) {
    return { entrou: false, erro: String(e.message || e), fechou: tp.fechado, detalhe: e.detalhe };
  }
}

if (typeof NetClient === 'function') {
  const igual = await tentar(VERSION);
  const outra = await tentar('2.0.0-alpha.1');
  cobra(igual.entrou === true, 'P3a · versão igual entra normalmente', igual.erro || '');
  cobra(outra.entrou === false && /versao_incompativel/.test(outra.erro || '') && outra.fechou,
    'P3b · versão diferente é recusada e o socket fecha',
    `entrou=${outra.entrou} erro=${outra.erro || '-'} fechou=${outra.fechou}`);
} else {
  cobra(false, 'P3 · net.js exporta NetClient', 'export não encontrado');
}

const main = fs.readFileSync(path.join(ROOT, 'public/js/main.js'), 'utf8');
cobra(/versao_incompativel/.test(main) && /outra vers[ãa]o do jogo/i.test(main),
  'P4 · a UI tem mensagem própria para versão incompatível');

const idx = path.resolve(ROOT, '../../../csbrasil-backend/worktrees/perf-jogabilidade/game/index.js');
if (fs.existsSync(idx)) {
  const server = fs.readFileSync(idx, 'utf8');
  cobra(/VERSION as CLIENT_VERSION/.test(server)
      && /welcome[\s\S]{0,400}clientVersion: CLIENT_VERSION/.test(server)
      && /\/health[\s\S]{0,900}clientVersion: CLIENT_VERSION/.test(server),
    'P5 · o nó anuncia clientVersion (welcome e /health) lendo version.js da árvore clonada');
} else {
  console.log('  NOTA P5 · backend não está ao lado desta árvore; cláusula não medida');
}

console.log(`\n${falhas ? 'VERMELHO' : 'VERDE'} — paridade de simulação cliente↔nó (${falhas} falha(s))`);
if (MUT && !falhas) { console.error(`RÉGUA CEGA: mutante '${MUT}' passou`); process.exit(1); }
if (MUT && falhas) { console.log(`mutante '${MUT}' reprovado como devia`); process.exit(0); }
process.exit(falhas ? 1 : 0);
