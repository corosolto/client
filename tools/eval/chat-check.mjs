/* RÉGUA DO CHAT DE SALA (issue #686). Contrato: docs/chat-de-sala.md.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTE

   Chat é a primeira superfície do jogo em que texto de um desconhecido é desenhado na
   tela de outro, e a primeira em que a pessoa DIGITA durante a partida. Cada uma das
   duas coisas tem um jeito clássico de dar errado sem ninguém ver no teste manual:
     · texto vira HTML (o `_feed` do game.js monta linha com innerHTML; copiar dali
       daria XSS de graça), ou vira controle bidi que reescreve o rótulo de quem falou;
     · a tecla digitada no campo continua chegando ao jogo: W anda, espaço pula, o
       clique atira, e perder o pointer lock abre o menu de pausa no meio da frase;
     · o cliente manda `chat` para um nó que não anunciou chat (nó velho), ou manda
       pelo datagrama (que o WebTransport pode perder ou reordenar).
   Nada disso aparece em screenshot. Então é medido aqui, em node, com o Game real do
   arnês, o NetClient real atrás de um WebSocket falso, e os módulos puros importados
   direto.

   CLÁUSULAS (as da doc, §11)
     CC1 · normalizarTexto/chaveTexto/validarEnvio: a tabela de vetores do §3, mais os
           casos de borda (não string, 641 UTF-16, surrogate solto, U+FE0F, U+2800).
     CC2 · NetClient: inerte sem `meta.chat` e depois de `partida` sem meta; envia
           `chat`/`chat_report` SÓ por `tp.enviar`; checagem leve de forma nos ramos
           `chat`, `chat_hist`, `chat_nack`, `chat_denuncia`; `_chatFila` com teto.
     CC3 · guardas do jogo (bootGame): tecla e clique num alvo de entrada própria não
           viram tecla nem tiro; Y/U chamam `onAbrirChat`; `travarEntrada` zera keys,
           mouse, sticks e desliga `_acceptInput`; `_plc` não pausa com o chat aberto
           nem nos 400 ms depois de fechar.
     CC4 · ChatEstado: dedupe por id, teto de linhas, histórico, bloqueio (próprio,
           teto, storage que estoura), linhasVisiveis, canaisPara, proximoCid, ativo.
     CC5 · montarLinha com um DOM em que o setter de innerHTML LANÇA: rótulo e texto
           saem em <bdi dir="auto"> separados, XSS e nick verificado ficam texto.
     CC6 · fonte: sala/[codigo].astro e o sitemap não citam chat; chat-painel.js não
           usa innerHTML; game.js não importa chat; chat.js é puro (sem import/DOM).
     CC7 · a tabela de limites do §6 da doc é IGUAL a CHAT_LIMITES (mesmas chaves,
           mesmos valores), MOTIVOS_DENUNCIA é a lista do §2, e o teto da fila do
           net.js é o `filaClienteMax` da tabela.

   MUTANTES (em memória: o fonte é reescrito e importado por data: URL; nada toca o
   disco). Mutante que não morde, ou que não aplica, REPROVA a régua.
     trava-inerte   game.js: `this._entradaTravada || entradaPropria(e.target)` vira
                    `false` (a guarda de _kd/_ku/_md some)              -> CC3 vermelha
     plc-antigo     game.js: a chamada `this._chatSeguraPausa()` em _plc vira `false`
                                                                          -> CC3 vermelha
     chat-inseguro  net.js: enviarChat manda por `enviarInseguro`      -> CC2 vermelha
     chat-sem-meta  net.js: `_chatPronto` ignora `chatLigado()`         -> CC2 vermelha
     sem-bidi       chat-painel.js: 'bdi' vira 'span'                   -> CC5 vermelha
     innerhtml      chat-painel.js: o primeiro `.textContent =` vira
                    `.innerHTML =`                                       -> CC5 vermelha

   GANCHOS QUE A RÉGUA ESPERA (é o contrato entre a régua e quem implementa):
     game.js      entradaPropria(t) (INPUT, TEXTAREA, isContentEditable,
                  closest('[data-entrada-propria]'), null-safe); `_entradaTravada`;
                  travarEntrada(v); `_chatSeguraPausa()` consultado por `_plc`;
                  `onAbrirChat(ch)` chamado por Y ('sala') e U ('time') com
                  preventDefault, antes do portão _acceptInput, nunca com o jogo pausado;
                  travarEntrada alterna a classe `chat` em #touch-ui.
     net.js       onChat, _chatFila, drenarChat(), chatLigado(), enviarChat(ch, txt, cid),
                  denunciarChat(id, motivo), CHAT_FILA_MAX exportado.
     chat.js      CHAT_LIMITES, MOTIVOS_DENUNCIA, CANAIS, CID_RE, normalizarTexto,
                  contarChars, chaveTexto, validarEnvio, rotuloDe, chaveArmazenamento,
                  ChatEstado.
     chat-painel  montarLinha(msg, { rotulo }) devolve um elemento com data-id e data-h
                  e dois <bdi dir="auto"> (rótulo, texto), só textContent.

   Uso: node tools/eval/chat-check.mjs [--so=CC1,CC4] [--sem-mutantes]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Game, CHARACTERS, PCHAR, bootGame, initTextures, renderer, seedRandom, sfx } from './harness.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const SO = arg('so') ? new Set(arg('so').split(',')) : null;
const SEM_MUTANTES = process.argv.includes('--sem-mutantes');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- placar: cada grupo roda com um coletor; o mutante roda o mesmo grupo em silêncio ---------- */
let ok = 0, falhas = 0;
function coletor(silencioso) {
  const c = { ok: 0, falhas: 0, mensagens: [] };
  c.cobra = (cond, msg) => {
    if (cond) { c.ok++; if (!silencioso) console.log(`  ok   ${msg}`); }
    else { c.falhas++; c.mensagens.push(msg); if (!silencioso) console.log(`  FALHA ${msg}`); }
  };
  return c;
}
async function medir(nome, fn, ctx, silencioso = false) {
  const c = coletor(silencioso);
  try { await fn(c.cobra, ctx); }
  catch (e) { c.cobra(false, `${nome} estourou: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
  return c;
}

/* ---------- módulos: ausente não estoura, reprova com a mensagem que diz qual commit falta ---------- */
async function carregar(rel, commit) {
  const abs = path.join(RAIZ, rel);
  if (!existsSync(abs)) return { mod: null, motivo: `módulo ausente: ${rel} (${commit})` };
  try { return { mod: await import(pathToFileURL(abs).href), motivo: '' }; }
  catch (e) { return { mod: null, motivo: `${rel} não importa: ${e.message}` }; }
}

/* Reescrita em memória: os imports relativos viram file: absolutos para o módulo mutado
   resolver os vizinhos DE VERDADE (mesma instância do three e dos módulos do jogo). */
async function importarMutado(rel, mutar, nome) {
  const abs = path.join(RAIZ, rel);
  if (!existsSync(abs)) throw new Error(`mutante ${nome} não aplicou: ${rel} ausente`);
  const src = readFileSync(abs, 'utf8');
  const mutado = mutar(src);
  if (mutado === src) throw new Error(`mutante ${nome} não aplicou: o padrão que ele reescreve não existe em ${rel}`);
  const base = pathToFileURL(abs).href;
  const three = pathToFileURL(path.join(RAIZ, 'node_modules/three/index.js')).href;
  const addons = pathToFileURL(path.join(RAIZ, 'node_modules/three/addons/')).href;
  const fonte = mutado
    .replace(/from '\.\/([^']+)'/g, (_m, f) => `from '${new URL(f, base).href}'`)
    .replace(/import\('\.\/([^']+)'\)/g, (_m, f) => `import('${new URL(f, base).href}')`)
    .replace(/from 'three\/addons\/([^']+)'/g, (_m, f) => `from '${addons}${f}'`)
    .replace(/from 'three'/g, `from '${three}'`);
  return import(`data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}`);
}

const DOC = path.join(RAIZ, 'docs/chat-de-sala.md');
const META_CHAT = {
  v: 1, eu: { h: 'K3F' }, pode: 1, canais: ['sala', 'time'], max: 160, epoca: 'QX9W2A7B',
  denuncia: ['ofensa', 'odio', 'assedio', 'spam', 'outro'],
};
const msgChat = (id, extra = {}) => ({ id, t: 1000 + id, ch: 'sala', aud: 'todos', h: `H${id}`, esp: 0, time: 'E', txt: `msg ${id}`, ...extra });

/* ============================== CC1 · normalização ============================== */
/* Os vetores são os do §3 da doc, na mesma ordem; as linhas depois de "a".repeat(161)
   são as bordas que a doc descreve em prosa (passos 1, 5 e 6). */
const VETORES = [
  ['"  oi\\t\\tgalera\\n"', '  oi\t\tgalera\n', 'oi galera'],
  ['"ＧＧ" (U+FF27 U+FF27)', 'ＧＧ', 'GG'],
  ['"𝐟𝐝𝐩" (negrito matemático)', '\u{1D41F}\u{1D41D}\u{1D429}', 'fdp'],
  ['"a\\u202Eb\\u2066c" (controles bidi)', 'a‮b⁦c', 'abc'],
  ['"x\\u200By\\uFEFFz\\u00ADw" (invisíveis Cf)', 'x​y﻿z­w', 'xyzw'],
  ['"\\u3164" (preenchimento Hangul)', 'ㅤ', { motivo: 'vazia' }],
  ['família com ZWJ fica inteira', '\u{1F468}‍\u{1F469}‍\u{1F467}', '\u{1F468}‍\u{1F469}‍\u{1F467}'],
  ['"a\\u200Db" (ZWJ fora de emoji)', 'a‍b', 'ab'],
  /* NFKC compõe z + U+0301 em ź (U+017A) antes do corte; sobram 2 das 29 marcas restantes. */
  ['"z" + 30 × U+0301 -> z com 2 marcas', 'z' + '́'.repeat(30), 'ź́́'],
  ['"tag\\u{E0041}" (tag invisível)', 'tag\u{E0041}', 'tag'],
  ['"a".repeat(161)', 'a'.repeat(161), { motivo: 'longa' }],
  ['"<img src=x onerror=alert(1)>" fica igual', '<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)>'],
  ['"  "', '  ', { motivo: 'vazia' }],
  ['não string (passo 1)', 42, { motivo: 'invalida' }],
  ['641 unidades UTF-16 cruas (passo 1)', 'a'.repeat(641), { motivo: 'longa' }],
  ['160 emojis (320 UTF-16, 160 code points) passam (passos 1 e 9)', '\u{1F600}'.repeat(160), '\u{1F600}'.repeat(160)],
  ['U+00A0, U+2028 e U+2029 viram espaço (passo 3)', 'a b c d', 'a b c d'],
  ['surrogate solto sai (passo 5)', 'a\uD83Db', 'ab'],
  ['U+034F e U+2800 saem (passo 5)', 'a͏b⠀c', 'abc'],
  ['U+FE0F depois de pictograma fica (passo 6)', '❤️', '❤️'],
  ['U+FE0F depois de letra sai (passo 6)', 'a️b', 'ab'],
  ['acento com til cabe nas 2 marcas (passo 7)', 'ã́', 'ã́'.normalize('NFKC')],
];

async function cc1(cobra, { chat }) {
  if (!chat.mod) return cobra(false, chat.motivo);
  const { normalizarTexto, contarChars, chaveTexto, validarEnvio, CANAIS } = chat.mod;
  for (const [nome, entrada, esperado] of VETORES) {
    const r = normalizarTexto(entrada);
    if (typeof esperado === 'string') {
      cobra(r && r.ok === true && r.txt === esperado, `CC1 ${nome} -> ${JSON.stringify(esperado)} (veio ${JSON.stringify(r)})`);
    } else {
      cobra(r && r.ok === false && r.motivo === esperado.motivo, `CC1 ${nome} -> recusado como ${esperado.motivo} (veio ${JSON.stringify(r)})`);
    }
  }
  cobra(contarChars('\u{1F468}‍\u{1F469}') === 3 && contarChars('') === 0, 'CC1 contarChars conta code points');
  cobra(chaveTexto('Oi, galera!') === 'oigalera' && chaveTexto('OI  GALERA') === chaveTexto('oi galera'),
    'CC1 chaveTexto ignora caixa, espaço e pontuação');
  cobra(Array.isArray(CANAIS) && CANAIS.join() === 'sala,time', 'CC1 CANAIS é [sala, time]');
  const v1 = validarEnvio('sala', '  oi  ');
  cobra(v1.ok === true && v1.txt === 'oi', `CC1 validarEnvio normaliza antes de aceitar (${JSON.stringify(v1)})`);
  cobra(validarEnvio('time', 'oi', ['sala']).motivo === 'sem_time', 'CC1 validarEnvio: time sem canal de time é sem_time');
  cobra(validarEnvio('geral', 'oi').motivo === 'invalida', 'CC1 validarEnvio: canal desconhecido é invalida');
  cobra(validarEnvio('sala', '').motivo === 'vazia' && validarEnvio('sala', 'a'.repeat(161)).motivo === 'longa',
    'CC1 validarEnvio repassa vazia e longa');
}

/* ============================== CC2 · NetClient ============================== */
class WsFalso {
  constructor() { WsFalso.ultimo = this; this.readyState = 1; this.OPEN = 1; this.enviados = []; }
  send(p) { this.enviados.push(p); }
  close() { this.readyState = 3; }
}
async function conectar(NetClient, welcome) {
  const ws0 = globalThis.WebSocket; globalThis.WebSocket = WsFalso;
  try {
    const cli = new NetClient('ws://x/ws');
    const conectando = cli.connect();
    const ws = WsFalso.ultimo;
    ws.onopen && ws.onopen();
    ws.onmessage({ data: JSON.stringify({ type: 'welcome', yourEnt: 1, yourTeam: 'E', espectador: false, events: 1, snapshotHz: 30, clientSha: 'abc', ...welcome }) });
    await conectando;
    const tp = cli.tp, enviar0 = tp.enviar.bind(tp);
    const seguros = [], inseguros = [];
    tp.enviar = (p) => { seguros.push(JSON.parse(p)); return enviar0(p); };
    tp.enviarInseguro = (p) => { inseguros.push(JSON.parse(p)); return enviar0(p); };
    const chega = (m) => ws.onmessage({ data: JSON.stringify(m) });
    return { cli, seguros, inseguros, chega };
  } finally { globalThis.WebSocket = ws0; }
}

async function cc2(cobra, { net }) {
  if (!net.mod) return cobra(false, net.motivo);
  const { NetClient } = net.mod;
  const c = new NetClient('ws://x/ws');
  if (typeof c.enviarChat !== 'function' || typeof c.denunciarChat !== 'function') {
    return cobra(false, 'CC2 NetClient sem enviarChat/denunciarChat (commit 3 do plano)');
  }
  // 2a · nó velho: welcome sem `chat`
  {
    const { cli, seguros, inseguros, chega } = await conectar(NetClient, {});
    const recebidos = []; cli.onChat = (m) => recebidos.push(m);
    const a = cli.enviarChat('sala', 'oi', 'c1'), b = cli.denunciarChat(1, 'spam');
    chega(msgChat(1));
    const soChat = (l) => l.filter((m) => String(m.type).startsWith('chat'));
    cobra(a === false && b === false && soChat(seguros).length === 0 && soChat(inseguros).length === 0,
      `CC2a sem meta.chat: enviarChat=${a}, denunciarChat=${b}, frames de chat enviados=${soChat(seguros).length + soChat(inseguros).length}`);
    cobra(recebidos.length === 0 && (cli._chatFila || []).length === 0, 'CC2a sem meta.chat: frame `chat` que chega é descartado');
    cobra(cli.chatLigado() === false, 'CC2a chatLigado() é false sem meta.chat');
    chega({ type: 'partida', yourEnt: 2, yourTeam: 'E', espectador: false, events: 1, chat: { ...META_CHAT, v: 2 } });
    cobra(cli.enviarChat('sala', 'oi', 'c1') === false, 'CC2a meta.chat com versão desconhecida (v:2) é tratada como ausente');
  }
  // 2b/2c · nó com chat: só pelo canal confiável, com a forma do contrato
  {
    const { cli, seguros, inseguros, chega } = await conectar(NetClient, { chat: META_CHAT });
    cobra(cli.chatLigado() === true, 'CC2b chatLigado() é true com meta.chat v1');
    const a = cli.enviarChat('sala', 'oi galera', 'c1');
    const f = seguros.find((m) => m.type === 'chat');
    cobra(a === true && f && f.ch === 'sala' && f.txt === 'oi galera' && f.cid === 'c1' && Object.keys(f).length === 4,
      `CC2b enviarChat manda {type:'chat', ch, txt, cid} (${JSON.stringify(f)})`);
    cobra(cli.enviarChat('time', 'oi', 'c2') === true, 'CC2b canal time é aceito quando a meta o anuncia');
    const d = cli.denunciarChat(7, 'spam');
    const r = seguros.find((m) => m.type === 'chat_report');
    cobra(d === true && r && r.id === 7 && r.motivo === 'spam' && Object.keys(r).length === 3,
      `CC2c denunciarChat manda {type:'chat_report', id, motivo} (${JSON.stringify(r)})`);
    cobra(cli.denunciarChat(7, 'porque sim') === false && cli.denunciarChat('7', 'spam') === false,
      'CC2c denúncia com motivo fora da lista ou id não inteiro não sai');
    cobra(cli.enviarChat('geral', 'oi', 'c3') === false && cli.enviarChat('sala', 'oi', 'cid com espaço!') === false
      && cli.enviarChat('sala', 'oi', 'a'.repeat(13)) === false && cli.enviarChat('sala', 42, 'c4') === false,
      'CC2c canal desconhecido, cid fora de ^[A-Za-z0-9_-]{1,12}$ ou texto não string não saem');
    cobra(inseguros.filter((m) => String(m.type).startsWith('chat')).length === 0 && seguros.filter((m) => String(m.type).startsWith('chat')).length === 3,
      `CC2g chat e chat_report saem SÓ por tp.enviar (confiável): ${seguros.filter((m) => String(m.type).startsWith('chat')).length} por enviar, ${inseguros.filter((m) => String(m.type).startsWith('chat')).length} por enviarInseguro`);
    // 2d · ramos de entrada com checagem leve de forma
    const recebidos = []; cli.onChat = (m) => recebidos.push(m);
    chega(msgChat(1, { cid: 'c1' }));
    chega({ type: 'chat', id: '2', ch: 'sala', h: 'H2', txt: 'x' });
    chega({ type: 'chat', id: 3, ch: 'sala', h: 'H3', txt: 42 });
    chega({ type: 'chat', id: 4, ch: 'sala', txt: 'sem h' });
    chega({ type: 'chat', id: 5, ch: 'geral', h: 'H5', txt: 'canal inventado' });
    chega({ type: 'chat_xyz', id: 6 });
    chega({ type: 'error', error: 'qualquer' });
    cobra(recebidos.length === 1 && recebidos[0].id === 1 && recebidos[0].cid === 'c1',
      `CC2d frame chat bem formado chega ao onChat; id string, txt número, sem h, canal inventado e tipo desconhecido são descartados (${recebidos.length} entregue)`);
    chega({ type: 'chat_hist', list: [msgChat(10), { id: 'x' }, msgChat(11)] });
    const hist = recebidos.find((m) => m.type === 'chat_hist');
    cobra(hist && Array.isArray(hist.list) && hist.list.length === 2 && hist.list[1].id === 11,
      `CC2d chat_hist chega como um frame só, com a lista filtrada (${hist && hist.list.length})`);
    chega({ type: 'chat_hist', list: 'nada' });
    cobra(recebidos.filter((m) => m.type === 'chat_hist').length === 1, 'CC2d `chat_hist` sem lista é descartado');
    chega({ type: 'chat_nack', cid: 'c1', motivo: 'rapido', espera: 1200 });
    chega({ type: 'chat_nack', motivo: 'rapido' });
    chega({ type: 'chat_denuncia', id: 7, estado: 'recebida' });
    chega({ type: 'chat_denuncia', estado: 'recebida' });
    cobra(recebidos.filter((m) => m.type === 'chat_nack').length === 1 && recebidos.filter((m) => m.type === 'chat_denuncia').length === 1,
      'CC2d `chat_nack` precisa de cid e motivo, `chat_denuncia` precisa de id inteiro e estado');
    // 2e · fila para frames que chegam antes de existir painel
    cli.onChat = null;
    for (let i = 100; i < 170; i++) chega(msgChat(i));
    cobra(cli._chatFila.length === 64 && cli._chatFila[0].id === 106 && cli._chatFila[63].id === 169,
      `CC2e sem onChat os frames vão para _chatFila, que segura 64 e solta os mais velhos (${cli._chatFila.length}, primeiro id ${cli._chatFila[0] && cli._chatFila[0].id})`);
    const drenados = cli.drenarChat();
    cobra(drenados.length === 64 && cli._chatFila.length === 0 && cli.drenarChat().length === 0, 'CC2e drenarChat() devolve a fila e a esvazia');
    // 2f · partida sem meta de chat desliga; com meta, religa
    chega({ type: 'partida', yourEnt: 2, yourTeam: 'E', espectador: false, events: 1 });
    cobra(cli.enviarChat('sala', 'oi', 'c9') === false && cli.chatLigado() === false, 'CC2f depois de `partida` sem chat o cliente fica inerte');
    chega({ type: 'partida', yourEnt: 2, yourTeam: 'E', espectador: false, events: 1, chat: META_CHAT });
    cobra(cli.enviarChat('sala', 'oi', 'c9') === true, 'CC2f `partida` com chat religa');
    chega({ type: 'partida', yourEnt: 2, yourTeam: 'E', espectador: false, events: 1, chat: { ...META_CHAT, pode: 0 } });
    cobra(cli.enviarChat('sala', 'oi', 'c9') === false && cli.denunciarChat(1, 'spam') === true,
      'CC2f com pode:0 não fala, mas ainda denuncia');
  }
}

/* ============================== CC3 · guardas do jogo ============================== */
let TEX = null;
function bootar(Classe) {
  TEX = TEX || initTextures();
  if (Classe === Game) return bootGame('praca_poderes', { textures: TEX, bots: 2 });
  seedRandom(12345);
  const def = CHARACTERS.find((c) => c.id === PCHAR);
  const g = new Classe({
    renderer, textures: TEX, sfx, settings: { bots: 2, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'praca_poderes', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {}; g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  return g;
}
const alvoInput = { tagName: 'INPUT', isContentEditable: false, closest: () => null };
const alvoPainel = { tagName: 'DIV', isContentEditable: false, closest: (s) => (s === '[data-entrada-propria]' ? {} : null) };
const alvoCanvas = { tagName: 'CANVAS', isContentEditable: false, closest: () => null };
const tecla = (code, target) => { const e = { code, target, ctrlKey: false, metaKey: false, prevenido: false }; e.preventDefault = () => { e.prevenido = true; }; return e; };

async function cc3(cobra, { GameClasse }) {
  const g = bootar(GameClasse);
  try {
    g.state = 'live'; g.paused = false;
    // 3a · tecla num alvo de entrada própria não vira tecla do jogo
    g.keys = {};
    g._kd(tecla('KeyW', alvoInput)); g._kd(tecla('Space', alvoInput)); g._kd(tecla('KeyR', alvoPainel));
    cobra(!g.keys.KeyW && !g.keys.Space && !g.keys.KeyR, `CC3a W, espaço e R num INPUT ou dentro de [data-entrada-propria] não viram tecla (keys=${JSON.stringify(g.keys)})`);
    let placar = 0; g._showScoreboard = () => { placar++; };
    const tab = tecla('Tab', alvoInput); g._kd(tab);
    cobra(placar === 0 && !tab.prevenido, 'CC3a Tab dentro do campo é do painel (prisão de foco), não do placar');
    g.keys.KeyW = true; g._ku(tecla('KeyW', alvoInput));
    cobra(g.keys.KeyW === true, 'CC3a keyup vindo do campo não mexe no estado das teclas');
    g.keys = {};
    // 3b · clique no campo não atira nem arma o mouse
    let tiros = 0; g._tryShoot = () => { tiros++; }; g.mouseDown0 = false;
    g._md({ button: 0, target: alvoInput });
    cobra(tiros === 0 && !g.mouseDown0, `CC3b mousedown num INPUT não atira (${tiros} tiro, mouseDown0=${g.mouseDown0})`);
    // 3c · Y e U abrem o chat, com preventDefault, e não com o jogo pausado
    const aberturas = []; g.onAbrirChat = (ch) => aberturas.push(ch);
    const y = tecla('KeyY', alvoCanvas), u = tecla('KeyU', alvoCanvas);
    g._kd(y); g._kd(u);
    cobra(aberturas.join() === 'sala,time' && y.prevenido && u.prevenido, `CC3c Y abre 'sala' e U abre 'time' com preventDefault (${JSON.stringify(aberturas)})`);
    g.paused = true; g._kd(tecla('KeyY', alvoCanvas)); g.paused = false;
    cobra(aberturas.length === 2, 'CC3c com o jogo pausado Y não abre o chat');
    g.keys = {};
    // 3d · travarEntrada zera tudo e desliga o portão de input
    if (typeof g.travarEntrada !== 'function') {
      cobra(false, 'CC3d travarEntrada(v) ausente em game.js (commit 6 do plano)');
    } else {
      g.keys.KeyW = true; g.mouseDown0 = true; g._fireStick = { l: true, r: true };
      g.touchMove.x = 1; g.touchMove.z = 1; g.touchLook.x = 1; g.touchLook.y = 1;
      g.travarEntrada(true);
      cobra(g._acceptInput() === false, 'CC3d _acceptInput() é false com a entrada travada');
      cobra(!g.keys.KeyW && !g.mouseDown0 && !g._fireStick.l && !g._fireStick.r && g.touchMove.x === 0 && g.touchMove.z === 0 && g.touchLook.x === 0 && g.touchLook.y === 0,
        'CC3d travarEntrada zera keys, mouse, sticks de toque e _fireStick');
      cobra(globalThis.document.getElementById('touch-ui').classList.contains('chat') === true, 'CC3d travarEntrada(true) põe a classe `chat` em #touch-ui');
      g._kd(tecla('KeyW', alvoCanvas));
      cobra(!g.keys.KeyW, 'CC3d com a entrada travada nem tecla no canvas vira tecla');
      g._md({ button: 0, target: alvoCanvas });
      cobra(tiros === 0, 'CC3d com a entrada travada o clique não atira');
      // 3e · perder o pointer lock não pausa com o chat aberto, nem nos 400 ms depois de fechar
      g.testMode = false; g.state = 'live'; g.paused = false;
      const lock0 = globalThis.document.pointerLockElement; globalThis.document.pointerLockElement = null;
      g._plc();
      cobra(g.paused === false, 'CC3e _plc não pausa com a entrada travada (chat aberto)');
      g.travarEntrada(false);
      cobra(g._acceptInput() === true || !!g.paused === false, 'CC3e destravar devolve o jogo (sem pausa)');
      cobra(globalThis.document.getElementById('touch-ui').classList.contains('chat') === false, 'CC3e travarEntrada(false) tira a classe `chat` de #touch-ui');
      g._plc();
      cobra(g.paused === false, 'CC3e _plc não pausa nos 400 ms depois de fechar o chat');
      await dormir(450);
      g._plc();
      cobra(g.paused === true, 'CC3e passados os 400 ms, perder o lock volta a pausar (a guarda não é permanente)');
      g.testMode = true; g.paused = false; globalThis.document.pointerLockElement = lock0;
    }
  } finally { try { g.dispose(); } catch { /* o jogo mutado pode não desmontar limpo */ } }
}

/* ============================== CC4 · ChatEstado ============================== */
function storageFalso({ estoura = false } = {}) {
  const dados = new Map();
  return {
    dados,
    getItem(k) { if (estoura) throw new Error('storage indisponível'); return dados.has(k) ? dados.get(k) : null; },
    setItem(k, v) { if (estoura) throw new Error('storage indisponível'); dados.set(k, String(v)); },
    removeItem(k) { dados.delete(k); },
  };
}

async function cc4(cobra, { chat }) {
  if (!chat.mod) return cobra(false, chat.motivo);
  const { ChatEstado, CHAT_LIMITES, chaveArmazenamento, rotuloDe, CID_RE } = chat.mod;
  const meta = { chat: META_CHAT };
  cobra(chaveArmazenamento('ABCD', 'QX9W2A7B') === 'cs_chat_bloq:ABCD:QX9W2A7B', 'CC4 chaveArmazenamento é cs_chat_bloq:<convite>:<epoca>');
  cobra(rotuloDe({ h: 'K3F' }) === 'Anônimo #K3F' && rotuloDe({ h: 'K3F', nk: 'Rubao' }).startsWith('Rubao') && rotuloDe({ h: 'K3F', nk: 'Rubao' }) !== 'Rubao',
    `CC4 rotuloDe: sem nk é "Anônimo #<h>", com nk leva a marca de verificado em texto (${rotuloDe({ h: 'K3F', nk: 'Rubao' })})`);
  cobra(rotuloDe({ h: 'K3F', nk: '<b>x</b>' }) === 'Anônimo #K3F' && rotuloDe({ h: 'K3F', nk: 'a'.repeat(15) }) === 'Anônimo #K3F',
    'CC4 rotuloDe revalida o nk com a regex do ticket; nk inválido vira anônimo');
  const st = storageFalso();
  const e = new ChatEstado({ convite: 'ABCD', meta, storage: st });
  cobra(e.ativo() === true && new ChatEstado({ convite: 'ABCD', meta: null }).ativo() === false
    && new ChatEstado({ convite: 'ABCD', meta: { chat: { ...META_CHAT, v: 2 } } }).ativo() === false,
    'CC4 ativo() só com meta.chat v1');
  cobra(e.receber(msgChat(1)) === true && e.receber(msgChat(1)) === false && e.linhas.length === 1, 'CC4 dedupe por id');
  cobra(e.receber({ id: 'x' }) === false && e.receber(null) === false, 'CC4 mensagem sem id inteiro não entra');
  for (let i = 2; i <= 130; i++) e.receber(msgChat(i));
  cobra(e.linhas.length === CHAT_LIMITES.logClienteMaxLinhas && e.linhas[0].id === 31,
    `CC4 o log segura ${CHAT_LIMITES.logClienteMaxLinhas} linhas e solta as mais velhas (${e.linhas.length}, primeiro id ${e.linhas[0].id})`);
  const n = e.receberHist([msgChat(200), msgChat(130), msgChat(201)]);
  cobra(n === 2 && e.linhas.filter((l) => l.hist).length === 2 && e.receberHist([msgChat(200)]) === 0,
    `CC4 receberHist marca hist, deduplica e devolve quantas entraram (${n})`);
  // bloqueio
  cobra(e.bloquear('K3F') === false && e.estaBloqueado('K3F') === false, 'CC4 ninguém bloqueia o próprio handle');
  cobra(e.bloquear('H200') === true && e.estaBloqueado('H200') === true && e.bloquear('H200') === true, 'CC4 bloquear por handle (idempotente)');
  cobra(e.linhasVisiveis().every((l) => l.h !== 'H200') && e.linhasVisiveis().length === e.linhas.length - 1,
    'CC4 linhasVisiveis esconde a linha do bloqueado, inclusive a do histórico');
  e.receber(msgChat(300, { h: 'H200' }));
  cobra(e.linhas.some((l) => l.id === 300) && !e.linhasVisiveis().some((l) => l.id === 300), 'CC4 linha futura do bloqueado também fica escondida');
  const chave = chaveArmazenamento('ABCD', META_CHAT.epoca);
  let guardado = null; try { guardado = JSON.parse(st.getItem(chave)); } catch { /* fica null */ }
  cobra(Array.isArray(guardado) && guardado.includes('H200'), `CC4 o bloqueio vai para o storage em ${chave} (${st.getItem(chave)})`);
  const e2 = new ChatEstado({ convite: 'ABCD', meta, storage: st });
  cobra(e2.estaBloqueado('H200') === true, 'CC4 um ChatEstado novo com o mesmo storage relê o bloqueio');
  const e3 = new ChatEstado({ convite: 'ABCD', meta: { chat: { ...META_CHAT, epoca: 'OUTRA' } }, storage: st });
  cobra(e3.estaBloqueado('H200') === false, 'CC4 época nova invalida os bloqueios antigos');
  cobra(e.desbloquear('H200') === true && e.estaBloqueado('H200') === false && e.linhasVisiveis().length === e.linhas.length && !(JSON.parse(st.getItem(chave)) || []).includes('H200'),
    'CC4 desbloquear devolve as linhas e some do storage');
  for (let i = 0; i < CHAT_LIMITES.bloqueiosMax; i++) e.bloquear(`B${i}`);
  cobra(e.bloqueados().length === CHAT_LIMITES.bloqueiosMax && e.bloquear('MAIS1') === false && e.estaBloqueado('MAIS1') === false,
    `CC4 no máximo ${CHAT_LIMITES.bloqueiosMax} bloqueios`);
  const ruim = new ChatEstado({ convite: 'ABCD', meta, storage: storageFalso({ estoura: true }) });
  cobra(ruim.bloquear('H9') === true && ruim.estaBloqueado('H9') === true, 'CC4 storage que estoura cai para memória sem quebrar');
  const semStorage = new ChatEstado({ convite: 'ABCD', meta });
  cobra(semStorage.bloquear('H9') === true && semStorage.estaBloqueado('H9') === true, 'CC4 sem storage nenhum o bloqueio vive em memória');
  // canais, cid, limpeza
  cobra(e.canaisPara(true).join() === 'sala' && e.canaisPara(false).join() === 'sala,time', 'CC4 canaisPara: espectador só tem sala');
  const cids = new Set(); for (let i = 0; i < 200; i++) cids.add(e.proximoCid());
  cobra(cids.size === 200 && [...cids].every((c) => CID_RE.test(c)), `CC4 proximoCid gera 200 cids únicos dentro de ${CID_RE}`);
  cobra(e.motivosDenuncia().join() === META_CHAT.denuncia.join(), 'CC4 motivosDenuncia vem da meta, filtrado pela lista fechada');
  e.limpar();
  cobra(e.linhas.length === 0 && e.receber(msgChat(1)) === true, 'CC4 limpar() zera o log (destruir) e aceita ids de novo');
}

/* ============================== CC5 · montarLinha ============================== */
function elFalso(tag) {
  const el = {
    tagName: String(tag).toUpperCase(), children: [], atributos: {}, dataset: {}, textContent: '', dir: '',
    classList: { _s: new Set(), add(...a) { a.forEach((x) => this._s.add(x)); }, remove(...a) { a.forEach((x) => this._s.delete(x)); }, toggle(x, v) { (v ?? !this._s.has(x)) ? this._s.add(x) : this._s.delete(x); }, contains(x) { return this._s.has(x); } },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { for (const c of cs) this.children.push(typeof c === 'string' ? { tagName: '#TEXT', textContent: c, children: [] } : c); },
    prepend(c) { this.children.unshift(c); return c; },
    setAttribute(k, v) { this.atributos[k] = String(v); if (k === 'dir') this.dir = String(v); },
    getAttribute(k) { return this.atributos[k] ?? null; },
    addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  };
  Object.defineProperty(el, 'innerHTML', { get() { return ''; }, set() { throw new Error('innerHTML é proibido no chat'); } });
  Object.defineProperty(el, 'outerHTML', { get() { return ''; }, set() { throw new Error('outerHTML é proibido no chat'); } });
  el.insertAdjacentHTML = () => { throw new Error('insertAdjacentHTML é proibido no chat'); };
  return el;
}
const colher = (el, pred, acc = []) => { if (!el) return acc; if (pred(el)) acc.push(el); for (const c of el.children || []) colher(c, pred, acc); return acc; };

async function cc5(cobra, { chat, painel }) {
  if (!painel.mod) return cobra(false, painel.motivo);
  if (!chat.mod) return cobra(false, chat.motivo);
  const { montarLinha } = painel.mod;
  if (typeof montarLinha !== 'function') return cobra(false, 'CC5 chat-painel.js não exporta montarLinha');
  const criar0 = globalThis.document.createElement;
  globalThis.document.createElement = (t) => elFalso(t);
  try {
    const xss = '<img src=x onerror=alert(1)>';
    const casos = [
      [msgChat(1, { txt: xss }), 'Anônimo #H1'],
      [msgChat(2, { nk: 'Rubao', txt: 'שלום hello' }), chat.mod.rotuloDe({ h: 'H2', nk: 'Rubao' })],
    ];
    for (const [msg, rotulo] of casos) {
      let linha = null, erro = '';
      try { linha = montarLinha(msg, { rotulo }); } catch (e) { erro = e.message; }
      cobra(linha && !erro, `CC5 montarLinha(${msg.id}) monta sem tocar em innerHTML (${erro || 'ok'})`);
      if (!linha) continue;
      const bdis = colher(linha, (n) => n.tagName === 'BDI');
      cobra(bdis.length >= 2 && bdis.every((b) => b.dir === 'auto' || b.atributos.dir === 'auto'),
        `CC5 linha ${msg.id}: rótulo e texto em <bdi dir="auto"> separados (${bdis.length} bdi)`);
      cobra(bdis.some((b) => b.textContent === rotulo) && bdis.some((b) => b.textContent === msg.txt),
        `CC5 linha ${msg.id}: o rótulo e o texto vão inteiros em textContent (${JSON.stringify(bdis.map((b) => b.textContent))})`);
      cobra(String(linha.dataset.id) === String(msg.id) && linha.dataset.h === msg.h, `CC5 linha ${msg.id} carrega data-id e data-h para bloquear e denunciar`);
    }
  } finally { globalThis.document.createElement = criar0; }
}

/* ============================== CC6 · fonte ============================== */
const ler = (rel) => (existsSync(path.join(RAIZ, rel)) ? readFileSync(path.join(RAIZ, rel), 'utf8') : null);
async function cc6(cobra) {
  const semChat = (rel) => { const s = ler(rel); cobra(s !== null && !/chat/i.test(s), `CC6 ${rel} ${s === null ? 'não existe' : /chat/i.test(s) ? 'cita chat (SEO)' : 'não cita chat'}`); };
  semChat('src/pages/sala/[codigo].astro');
  semChat('src/pages/sitemap.xml.ts');
  semChat('src/pages/sitemap-[page].xml.ts');
  semChat('src/lib/sitemap.ts');
  const painel = ler('public/js/chat-painel.js');
  cobra(painel !== null && !/innerHTML|outerHTML|insertAdjacentHTML/.test(painel),
    `CC6 public/js/chat-painel.js ${painel === null ? 'ausente (commit 5 do plano)' : /innerHTML|outerHTML|insertAdjacentHTML/.test(painel) ? 'usa innerHTML' : 'não usa innerHTML'}`);
  const game = ler('public/js/game.js');
  cobra(game !== null && !/from '\.\/chat/.test(game) && !/import\('\.\/chat/.test(game), 'CC6 game.js não importa o chat');
  const chat = ler('public/js/chat.js');
  cobra(chat !== null && !/^\s*import\s/m.test(chat) && !/\bdocument\b|\bwindow\b|\bnavigator\b/.test(chat),
    `CC6 public/js/chat.js ${chat === null ? 'ausente (commit 4 do plano)' : 'é puro: sem import, sem document/window'}`);
}

/* ============================== CC7 · tabela da doc ============================== */
function tabelaDaDoc() {
  const doc = readFileSync(DOC, 'utf8');
  const secao = doc.split(/^## 6\. /m)[1]?.split(/^## 7\. /m)[0] || '';
  const limites = {};
  for (const m of secao.matchAll(/^\| `(\w+)` \| (\d+) \|$/gm)) limites[m[1]] = Number(m[2]);
  const den = doc.match(/denuncia: \[([^\]]+)\]/);
  const motivos = den ? den[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')) : [];
  return { limites, motivos };
}
async function cc7(cobra, { chat, net }) {
  const { limites, motivos } = tabelaDaDoc();
  const n = Object.keys(limites).length;
  cobra(n >= 30 && motivos.length === 5, `CC7 a doc tem uma tabela de limites legível (${n} linhas) e a lista de motivos (${motivos.length})`);
  if (!chat.mod) return cobra(false, chat.motivo);
  const { CHAT_LIMITES, MOTIVOS_DENUNCIA } = chat.mod;
  const dif = [];
  for (const k of Object.keys(limites)) if (CHAT_LIMITES?.[k] !== limites[k]) dif.push(`${k}: doc ${limites[k]} vs código ${CHAT_LIMITES?.[k]}`);
  for (const k of Object.keys(CHAT_LIMITES || {})) if (!(k in limites)) dif.push(`${k}: no código e fora da doc`);
  cobra(dif.length === 0 && Object.keys(CHAT_LIMITES || {}).length === n, `CC7 CHAT_LIMITES == tabela do §6 (${n} chaves)${dif.length ? ': ' + dif.join('; ') : ''}`);
  cobra(Object.isFrozen(CHAT_LIMITES) && Object.isFrozen(MOTIVOS_DENUNCIA), 'CC7 CHAT_LIMITES e MOTIVOS_DENUNCIA são congelados');
  cobra(Array.isArray(MOTIVOS_DENUNCIA) && MOTIVOS_DENUNCIA.join() === motivos.join(), `CC7 MOTIVOS_DENUNCIA == lista do §2 (${motivos.join(', ')})`);
  if (!net.mod) return cobra(false, net.motivo);
  cobra(net.mod.CHAT_FILA_MAX === limites.filaClienteMax, `CC7 net.js CHAT_FILA_MAX (${net.mod.CHAT_FILA_MAX}) == filaClienteMax da doc (${limites.filaClienteMax})`);
}

/* ============================== execução ============================== */
const ctx = {
  chat: await carregar('public/js/chat.js', 'commit 4 do plano'),
  net: await carregar('public/js/net.js', 'net.js'),
  painel: await carregar('public/js/chat-painel.js', 'commit 5 do plano'),
  GameClasse: Game,
};
const GRUPOS = [
  ['CC1', 'normalização: os vetores do §3', cc1],
  ['CC2', 'NetClient inerte sem meta, só tp.enviar, forma dos frames, fila', cc2],
  ['CC3', 'guardas do jogo com o chat aberto', cc3],
  ['CC4', 'ChatEstado', cc4],
  ['CC5', 'montarLinha sem innerHTML, com bdi', cc5],
  ['CC6', 'fonte: SEO, innerHTML, imports', cc6],
  ['CC7', 'tabela da doc == constantes', cc7],
];
const soma = (c) => { ok += c.ok; falhas += c.falhas; };
for (const [id, titulo, fn] of GRUPOS) {
  if (SO && !SO.has(id)) continue;
  console.log(`\n· ${id} ${titulo}`);
  soma(await medir(id, fn, ctx));
}

/* Cada mutante roda o grupo que ele quebra em silêncio; morde se o grupo ficar vermelho
   com uma falha que NÃO é "módulo ausente". */
const MUTANTES = [
  ['trava-inerte', 'CC3', cc3, async () => ({ ...ctx, GameClasse: (await importarMutado('public/js/game.js', (s) => s.replace(/this\._entradaTravada \|\| entradaPropria\(e\.target\)/g, 'false'), 'trava-inerte')).Game })],
  ['plc-antigo', 'CC3', cc3, async () => ({ ...ctx, GameClasse: (await importarMutado('public/js/game.js', (s) => s.replace(/this\._chatSeguraPausa\(\)/, 'false'), 'plc-antigo')).Game })],
  ['chat-inseguro', 'CC2', cc2, async () => ({ ...ctx, net: { mod: await importarMutado('public/js/net.js', (s) => s.replace(/this\.tp\.enviar\(JSON\.stringify\(\{ type: 'chat',/, "this.tp.enviarInseguro(JSON.stringify({ type: 'chat',"), 'chat-inseguro'), motivo: '' } })],
  ['chat-sem-meta', 'CC2', cc2, async () => ({ ...ctx, net: { mod: await importarMutado('public/js/net.js', (s) => s.replace(/return this\.chatLigado\(\) && !!this\.tp\?\.pronto;/, 'return !!this.tp?.pronto;'), 'chat-sem-meta'), motivo: '' } })],
  ['sem-bidi', 'CC5', cc5, async () => ({ ...ctx, painel: { mod: await importarMutado('public/js/chat-painel.js', (s) => s.replace(/'bdi'/g, "'span'"), 'sem-bidi'), motivo: '' } })],
  ['innerhtml', 'CC5', cc5, async () => ({ ...ctx, painel: { mod: await importarMutado('public/js/chat-painel.js', (s) => s.replace(/\.textContent = /, '.innerHTML = '), 'innerhtml'), motivo: '' } })],
];
if (!SEM_MUTANTES) {
  console.log('\n· mutantes (cada um tem de deixar o seu grupo vermelho)');
  for (const [nome, grupo, fn, montar] of MUTANTES) {
    if (SO && !SO.has(grupo)) continue;
    let r;
    try { r = await medir(grupo, fn, await montar(), true); }
    catch (e) { cobra_(false, `MUTANTE ${nome}: ${e.message}`); continue; }
    const reais = r.mensagens.filter((m) => !/módulo ausente|ausente em game\.js|não exporta/.test(m));
    cobra_(reais.length > 0, `MUTANTE ${nome} morde ${grupo}: ${reais.length ? reais[0].slice(0, 110) : 'a régua continuou verde (cega)'}`);
  }
}
function cobra_(c, m) { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } }

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} - ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
