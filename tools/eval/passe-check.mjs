#!/usr/bin/env node
/* ============================================================================
   passe-check.mjs — O PASSE "SESSÃO DA TRETA" OBEDECE AO SERVIDOR
   ----------------------------------------------------------------------------
   Roda os módulos REAIS (public/js/passe.js e public/js/passe-anuncio.js) no Node,
   com fetch ligado ao mock do contrato (tools/eval/passe-mock.mjs) e um DOM mínimo.

   PS1 xp-do-cliente     · o client nunca manda XP: GET sem corpo; o único POST é
                           {action:'claim', level} (inteiro). Nenhum outro arquivo de
                           public/js chama /api/passe.
   PS2 claim-sem-conta   · visitante não manda resgate (zero POST) e recebe
                           account_required para o fluxo de login.
   PS3 personagem-travado-selecionavel · personagem com `passe` fica travado até o
                           status do servidor listar em unlocked.characters; nada no
                           localStorage destrava; logout trava de novo.
   PS8 mock na janela   · o mock do contrato não abre resgate antes de starts_at nem depois
                           de claim_until (as outras cláusulas confiam nele).
   PS7 main.js executado · os trechos REAIS de main.js rodam num vm com um personagem
                           travado: sorteio inicial, personagem do lobby, confirmação do
                           seletor (M e menu antigo), pedido no MP (o mesmo livre do lobby) e
                           início de partida offline nunca entregam o travado; destravado pelo servidor,
                           todos entregam (controle positivo). O clique do seletor do lobby
                           é medido no navegador (passe-browser.mjs, PB4).
   PS4 passe-modal-repete · o anúncio aparece uma vez por versão, só com a temporada
                           no ar, sem empilhar <dialog> e fora do ?embed=1.
   PS5 claim-duplo       · dois cliques no mesmo resgate saem como UM pedido.
   PS6 analytics         · funil do painel: modal_view quando o anúncio abre e open quando a
                           tela abre, só {action:'analytics', event}, e NADA sem consentimento
                           de medição (window.__csPrivacy), como a loja Treta.

   Uso: node tools/eval/passe-check.mjs [--mutante=<id> [--espera-reprovar]]
     --espera-reprovar  sai 0 só se o mutante derrubar a cláusula que ele mira
   ============================================================================ */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ARGS = process.argv.slice(2);
const MUT = (ARGS.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ESPERA = ARGS.includes('--espera-reprovar');
const MUTANTES = {
  'xp-do-cliente': ['PS1', 'public/js/passe.js', "pedir({ action: 'claim', level })", "pedir({ action: 'claim', level, xp: estado.xp })"],
  'claim-sem-conta': ['PS2', 'public/js/passe.js', "if (!estado?.authenticated) throw new Error('account_required');", ''],
  'personagem-travado-selecionavel': ['PS3', 'public/js/passe.js', 'return !estado?.authenticated || !estado.unlocked.characters.includes(def.id);', 'return false;'],
  'trava-local': ['PS3', 'public/js/passe.js', 'if (!def?.passe) return false;',
    "if (!def?.passe) return false;\n  try { if (JSON.parse(localStorage.getItem('cs-passe-destravados') || '[]').includes(def.id)) return false; } catch {}"],
  /* PS7: mantêm o texto `personagemTravado` em main.js e mudam só o comportamento */
  'partida-sem-trava': ['PS7', 'public/js/main.js', 'if (!online && escolhidoDef && personagemTravado(escolhidoDef)) charId', 'if (online && escolhidoDef && personagemTravado(escolhidoDef)) charId'],
  'livre-ignora-trava': ['PS7', 'public/js/main.js', '(def && !personagemTravado(def) ? def', '(def && (!personagemTravado(def) || def.passe) ? def'],
  'sorteio-com-travado': ['PS7', 'public/js/main.js', '&& !personagemTravado(character));', '&& (!personagemTravado(character) || !!character.passe));'],
  'confirma-sem-trava': ['PS7', 'public/js/main.js', 'if (!selChar || personagemTravado(selChar)) return;', 'if (!selChar || (personagemTravado(selChar) && !selChar.passe)) return;'],
  'mp-pede-travado': ['PS7', 'public/js/main.js', 'return def ? personagemLivre(def, escolhaSpAntesDoMp?.team || currentTeam) : null;',
    'return def ? (personagemTravado(def) ? def : personagemLivre(def, escolhaSpAntesDoMp?.team || currentTeam)) : null;'],
  'lobby-sem-trava': ['PS7', 'public/js/main.js', 'const def = personagemLivre(CHARACTERS.find((c) => c.id === currentChar) || CHARACTERS[0], currentTeam);',
    'const def = (personagemTravado(CHARACTERS[0]), CHARACTERS.find((c) => c.id === currentChar) || CHARACTERS[0]);'],
  'passe-modal-repete': ['PS4', 'public/js/passe-anuncio.js', '  marcarAnuncio();\n', '\n'],
  'anuncio-fora-da-temporada': ['PS4', 'public/js/passe.js', 'return agora >= Date.parse(status.starts_at) && agora < Date.parse(status.ends_at);', 'return true;'],
  'claim-duplo': ['PS5', 'public/js/passe.js', 'if (resgatando && resgatandoChave === chave) return resgatando;', ''],
  'claim-de-outra-conta': ['PS5', 'public/js/passe.js', 'chave = `${minha}:${level}`;', 'chave = `${level}`;'],
  'mock-pre-temporada': ['PS8', 'tools/eval/passe-mock.mjs', 'const aberto = agoraMs >= inicio && agoraMs < fimResgate;', 'const aberto = agoraMs < fimResgate;'],
  'mock-resgate-pre-temporada': ['PS8', 'tools/eval/passe-mock.mjs', 'if (agora() < inicio || agora() >= fimResgate)', 'if (agora() >= fimResgate)'],
  'analytics-sem-consentimento': ['PS6', 'public/js/passe.js', " || !globalThis.__csPrivacy?.allowed()) return;", ') return;'],
  'modal-sem-evento': ['PS6', 'public/js/passe-anuncio.js', "  registrarEventoPasse('modal_view');\n", '\n'],
  'tela-sem-evento': ['PS6', 'public/js/tp/passe.js', "  registrarEventoPasse('open');\n", '\n'],
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => {
  let t = readFileSync(p, 'utf8');
  if (MUT && MUTANTES[MUT][1] === p) {
    const [, , de, para] = MUTANTES[MUT];
    if (!t.includes(de)) { console.error(`mutante ${MUT} não aplicou em ${p}`); process.exit(2); }
    t = t.replace(de, para);
  }
  return t;
};
const dataUrl = (fonte) => `data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}`;
/* o mock entra pelo mesmo caminho dos módulos do client: mutável pela própria régua (PS8) */
const { criarPasseMock } = await import(dataUrl(ler('tools/eval/passe-mock.mjs')));

/* Relógio fixo no meio da temporada (05/11/2026 a 10/01/2027): a régua mede comportamento, não a
   data em que roda. Vale para os módulos do client e para o mock, que leem Date.now(). */
const AGORA = Date.parse('2026-11-20T15:00:00Z');
Date.now = () => AGORA;

/* ---------- DOM mínimo: o que passe.js e passe-anuncio.js tocam ---------- */
const storage = new Map();
let busca = '';
class No {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.ouvintes = {}; this.textContent = ''; this.open = false; this.parent = null; this.style = { setProperty() {} }; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(...xs) { for (const x of xs) { if (typeof x === 'string') this.textContent += x; else { x.parent = this; this.children.push(x); } } }
  appendChild(x) { this.append(x); return x; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
  addEventListener(t, f) { (this.ouvintes[t] ||= []).push(f); }
  dispara(t) { for (const f of this.ouvintes[t] || []) f({ preventDefault() {} }); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() { document.activeElement = this; }
  get isConnected() { let n = this; while (n.parent) n = n.parent; return n === document.body; }
  todos() { return this.children.flatMap((c) => [c, ...c.todos()]); }
  texto() { return [this.textContent, ...this.children.map((c) => c.texto())].join(' '); }
}
const document = {
  body: new No('body'), documentElement: { dataset: {} }, activeElement: null,
  createElement: (t) => new No(t),
  querySelector(sel) {
    if (sel === 'dialog[open]') return [this.body, ...this.body.todos()].find((n) => n.tagName === 'DIALOG' && n.open) || null;
    throw new Error(`seletor não suportado no DOM mínimo: ${sel}`);
  },
  dispatchEvent() { return true; },
};
globalThis.document = document;
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
globalThis.localStorage = { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
Object.defineProperty(globalThis, 'location', { configurable: true, get: () => ({ search: busca, hostname: 'localhost' }) });

/* ---------- fetch ligado ao mock do contrato ---------- */
let mock = criarPasseMock();
const pedidos = [];
let atrasoPost = 0;   // resgate "em voo" para medir troca de conta no meio
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url, 'http://localhost');
  pedidos.push({ path: u.pathname, search: u.search, method: init.method || 'GET', body: init.body ?? null });
  if (u.pathname !== '/api/passe') return new Response('{"error":"not_found"}', { status: 404 });
  const conta = mock;   // o pedido pertence à conta que estava ativa quando saiu
  if (init.method === 'POST' && atrasoPost) await new Promise((r) => setTimeout(r, atrasoPost));
  const { status, body } = conta.handle(init.method || 'GET', init.body || '');
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};

storage.set('cs_lang', 'pt');   // i18n.js lê o idioma no import: os textos medidos são os PT
const passeFonte = ler('public/js/passe.js');
const passeUrl = dataUrl(passeFonte);
const P = await import(passeUrl);
const anuncioFonte = ler('public/js/passe-anuncio.js')
  .replace("from './i18n.js'", `from '${pathToFileURL('public/js/i18n.js').href}'`)
  .replace("from './passe.js'", `from '${passeUrl}'`);
const A = await import(dataUrl(anuncioFonte));
const mainJs = ler('public/js/main.js');

const falhas = [];
const clausula = async (id, nome, fn) => {
  try { await fn(); console.log(`  ✓ ${id} ${nome}`); }
  catch (e) { falhas.push(id); console.log(`  ✗ ${id} REPROVOU: ${e.message.split('\n')[0]}`); }
};
const novaConta = async (opcoes) => { mock = criarPasseMock(opcoes); pedidos.length = 0; await P.trocarContaPasse(); };

await clausula('PS1', 'xp-do-cliente: só {action:"claim", level} sai do client', async () => {
  await novaConta({ autenticado: true, xp: 9000, claimed: [] });
  const s = P.passeEstado();
  assert.ok(s?.authenticated && s.claimable.length >= 3, 'status do mock não chegou');
  for (const n of [...s.claimable, s.level + 1]) await P.resgatarNivel(n).catch(() => {});
  const gets = pedidos.filter((p) => p.method === 'GET'), posts = pedidos.filter((p) => p.method === 'POST');
  assert.ok(gets.length >= 1 && gets.every((p) => p.body === null && p.search === ''), 'GET /api/passe com corpo ou query');
  assert.ok(posts.length >= 4, `só ${posts.length} resgate(s) medido(s)`);
  for (const p of posts) {
    const corpo = JSON.parse(p.body);
    const chaves = Object.keys(corpo).sort().join(',');
    assert.ok((chaves === 'action,level' && corpo.action === 'claim' && Number.isSafeInteger(corpo.level))
      || (chaves === 'action,event' && corpo.action === 'analytics' && ['modal_view', 'open'].includes(corpo.event)), `POST fora do contrato: ${p.body}`);
  }
  assert.equal(mock.chamadas.filter((c) => c.method === 'POST' && c.corpo && Object.keys(c.corpo).some((k) => /xp|progress|reward/i.test(k))).length, 0, 'servidor recebeu XP do client');
  /* só passe.js conversa com /api/passe */
  const arquivos = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? arquivos(p) : p.endsWith('.js') ? [p] : []; });
  const outros = arquivos('public/js').filter((f) => f !== join('public/js', 'passe.js') && /['"`]\/api\/passe/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(outros, [], `outros módulos chamam /api/passe: ${outros.join(', ')}`);
});

await clausula('PS2', 'claim-sem-conta: visitante não manda resgate', async () => {
  await novaConta({ autenticado: false, claimed: [] });
  assert.equal(P.passeEstado()?.authenticated, false, 'status de visitante não chegou');
  pedidos.length = 0;
  await assert.rejects(P.resgatarNivel(1), /account_required/);
  assert.equal(pedidos.filter((p) => p.method === 'POST').length, 0, 'visitante mandou POST de resgate');
  assert.deepEqual(mock.creditos.length, 0, 'mock creditou recompensa para visitante');
  /* a tela leva para o login em vez de tentar */
  const tela = readFileSync('public/js/tp/passe.js', 'utf8');
  assert.match(tela, /if \(!s\?\.authenticated\) \{ entrar\(\); return; \}/, 'tela tenta resgatar sem conta');
  assert.match(tela, /e\.message === 'account_required'\) \{[^}]*entrar\(\)/, 'account_required do servidor não leva ao login');
});

await clausula('PS3', 'personagem-travado-selecionavel: só o servidor destrava', async () => {
  const caveira = { id: 'capitao-caveira', name: 'Capitão Caveira', passe: { season: 'sessao-da-treta-s1', level: 1 } };
  const vlad = { id: 'vlad', name: 'Vlad', passe: { season: 'sessao-da-treta-s1', level: 15 } };
  const livre = { id: 'esquerdomacho', name: 'Esquerdomacho' };
  storage.set('cs-passe-destravados', JSON.stringify(['capitao-caveira', 'vlad']));
  storage.set('csbr-home-character', 'vlad');
  await novaConta({ autenticado: false, claimed: [] });
  assert.equal(P.personagemTravado(caveira), true, 'visitante joga com personagem do passe');
  assert.equal(P.personagemTravado(livre), false, 'personagem fora do passe travou');
  await novaConta({ autenticado: true, xp: 1200, claimed: [] });
  assert.equal(P.personagemTravado(caveira), true, 'nível alcançado sem resgate já destrava (ou o localStorage destravou)');
  await P.resgatarNivel(1);
  assert.equal(P.personagemTravado(caveira), false, 'resgate confirmado pelo servidor não destravou');
  assert.equal(P.personagemTravado(vlad), true, 'personagem de nível não resgatado destravou');
  mock.definir({ autenticado: false });
  await P.trocarContaPasse();
  assert.equal(P.personagemTravado(caveira), true, 'logout manteve o personagem destravado');
  assert.equal(P.nivelDoPersonagem(vlad), 15, 'nível do cadeado errado');
  storage.delete('cs-passe-destravados'); storage.delete('csbr-home-character');
});

/* Trechos reais de main.js, recortados por âncora e executados com o passe.js deste processo. */
const corta = (fonte, de, ate) => {
  const i = fonte.indexOf(de), j = fonte.indexOf(ate, i + de.length);
  if (i < 0 || j < 0) throw new Error(`âncora ausente em main.js: ${de.slice(0, 50)}`);
  return fonte.slice(i, j);
};
function caminhosDoMain() {
  const caveira = { id: 'capitao-caveira', team: 'E', name: 'Capitão Caveira', passe: { season: 'sessao-da-treta-s1', level: 1 } };
  const livreE = { id: 'esquerdomacho', team: 'E', name: 'Esquerdomacho' }, livreB = { id: 'caminhoneiro', team: 'B', name: 'Caminhoneiro' };
  const dom = new Map();
  const el = (id) => { if (!dom.has(id)) dom.set(id, { id, textContent: '', src: '', dataset: { hubTab: 'jogar', hubNet: 'sp' }, classList: { contains: () => false }, style: { setProperty() {} } }); return dom.get(id); };
  let semente = 0;
  const ctx = vm.createContext({
    CHARACTERS: [caveira, livreE, livreB], podeNoLado: (d, l) => d?.team === l, ladosDe: (d) => [d?.team || 'E'],
    personagemTravado: P.personagemTravado, rememberedSide: 'E', crypto: { getRandomValues: (a) => { a[0] = semente++; return a; } },
    HUB_ENABLED: true, $: el, document: { querySelector: () => null }, tr: (x) => x, FACTION_NAME: { E: 'TIME E', B: 'TIME B' }, PALETA: {},
    pvSetChar: (d) => { ctx.mostrado = d; }, sfx: { uiClick() {} }, show: () => {}, startGame: (t, c) => { ctx.iniciou = c; },
    localStorage: { setItem: (k, v) => { ctx.gravado[k] = v; } }, gravado: {},
    currentChar: 'capitao-caveira', currentTeam: 'E', currentFaction: 'E', currentEnemyFaction: null,
    escolhaSpAntesDoMp: null, selChar: caveira, switchMode: false, game: null, mpSessao: null,
  });
  const fonte = [
    corta(mainJs, 'const randomInitialCharacter = () => {', 'const rememberedDef ='),
    corta(mainJs, 'const ladoValido = ', 'const initialSide ='),
    corta(mainJs, 'function syncHomeCharacter() {', 'function refreshMenuEquipment() {'),
    corta(mainJs, 'function personagemEscolhido() {', 'let mpNoAtual'),
    `${corta(mainJs, "$('char-confirm').onclick = () => {", '\n};\n')}\n};`,
    `function guardaPartida(charId, team, online) {\n${corta(mainJs, '  const escolhidoDef = CHARACTERS.find(c => c.id === charId);', '  const charDef = ')}  return charId;\n}`,
  ].join('\n');
  const api = vm.runInContext(`${fonte}\n({ randomInitialCharacter, personagemLivre, syncHomeCharacter, personagemEscolhido, guardaPartida })`, ctx);
  const confirmar = (sel, atual, hub = true) => {
    Object.assign(ctx, { selChar: sel, currentChar: atual, HUB_ENABLED: hub, gravado: {}, iniciou: null });
    el('char-confirm').onclick();
    return { atual: ctx.currentChar, gravou: Object.keys(ctx.gravado).length, iniciou: ctx.iniciou };
  };
  const medir = () => {
    const sorteados = new Set(Array.from({ length: 40 }, () => api.randomInitialCharacter().id));
    Object.assign(ctx, { HUB_ENABLED: true, currentChar: 'capitao-caveira', mostrado: null }); api.syncHomeCharacter();
    return {
      sorteio: sorteados.has('capitao-caveira'), livre: api.personagemLivre(caveira, 'E').id, lobby: ctx.mostrado?.id,
      mp: api.personagemEscolhido()?.id || null, partida: api.guardaPartida('capitao-caveira', 'E', false),
      online: api.guardaPartida('capitao-caveira', 'E', true), hub: confirmar(caveira, 'esquerdomacho'), antigo: confirmar(caveira, 'esquerdomacho', false),
    };
  };
  return { medir };
}

await clausula('PS7', 'main.js executado: nenhum caminho entrega o personagem travado', async () => {
  const main = caminhosDoMain();
  await novaConta({ autenticado: false, claimed: [] });
  const t = main.medir();
  assert.equal(t.sorteio, false, 'sorteio do personagem inicial entregou o travado');
  assert.equal(t.livre, 'esquerdomacho', `personagemLivre devolveu ${t.livre}`);
  assert.equal(t.lobby, 'esquerdomacho', `lobby mostrou ${t.lobby} com o id travado salvo`);
  assert.equal(t.mp, 'esquerdomacho', `multiplayer pediu ${t.mp} (quer o mesmo livre do lobby)`);
  assert.equal(t.partida, 'esquerdomacho', `partida offline começou com ${t.partida}`);
  assert.equal(t.online, 'capitao-caveira', 'online trocou o corpo que o servidor da sala deu');
  for (const [nome, r] of [['hub', t.hub], ['menu antigo', t.antigo]]) {
    assert.ok(r.atual === 'esquerdomacho' && !r.gravou && !r.iniciou, `confirmação (${nome}) escolheu o travado: ${JSON.stringify(r)}`);
  }
  /* controle positivo: com o servidor destravando, os mesmos caminhos entregam o personagem */
  await novaConta({ autenticado: true, xp: 1200, claimed: [] });
  await P.resgatarNivel(1);
  const d = main.medir();
  assert.ok(d.livre === 'capitao-caveira' && d.lobby === 'capitao-caveira' && d.mp === 'capitao-caveira' && d.partida === 'capitao-caveira'
    && d.hub.atual === 'capitao-caveira' && d.antigo.iniciou === 'capitao-caveira', `destravado pelo servidor e ainda bloqueado: ${JSON.stringify(d)}`);
});

await clausula('PS4', 'passe-modal-repete: anúncio uma vez por versão', async () => {
  storage.clear();
  await novaConta({ autenticado: false, claimed: [] });
  const abertos = () => document.body.children.filter((n) => n.tagName === 'DIALOG');
  const primeiro = A.anunciarPasse({});
  assert.ok(primeiro?.open, 'temporada no ar e o anúncio não abriu');
  assert.match(primeiro.texto(), /ENTRAR E JOGAR O PASSE/, 'visitante sem CTA de login');
  assert.equal(storage.get(P.PASSE_ANUNCIO_CHAVE), P.PASSE_ANUNCIO_VERSAO, 'versão vista não ficou guardada');
  assert.equal(A.anunciarPasse({}), null, 'anúncio empilhou sobre o próprio <dialog>');
  primeiro.dispara('cancel');
  assert.equal(abertos().length, 0, 'ESC não fechou o anúncio');
  assert.equal(A.anunciarPasse({}), null, 'anúncio repetiu na mesma versão');
  storage.set(P.PASSE_ANUNCIO_CHAVE, 'sessao-da-treta-s1/0');
  const nova = A.anunciarPasse({});
  assert.ok(nova?.open, 'versão nova do passe não anunciou');
  nova.dispara('cancel');
  storage.clear();
  busca = '?embed=1';
  assert.equal(A.anunciarPasse({}), null, 'anúncio abriu no ?embed=1');
  busca = '';
  const outro = document.createElement('dialog'); outro.open = true; document.body.append(outro);
  assert.equal(A.anunciarPasse({}), null, 'anúncio empilhou sobre outro <dialog>');
  outro.remove();
  assert.equal(P.passeAnuncioDevido({ status: P.passeEstado(), agora: Date.parse('2027-01-11T00:00:00Z'), visto: null }), false, 'anuncia temporada encerrada');
  assert.equal(P.passeAnuncioDevido({ status: P.passeEstado(), agora: Date.parse('2026-11-01T00:00:00Z'), visto: null }), false, 'anuncia antes do início');
  assert.equal(P.passeAnuncioDevido({ status: null, visto: null }), false, 'anuncia sem resposta do servidor');
  storage.clear();
});

await clausula('PS5', 'claim-duplo: dois cliques, um pedido', async () => {
  await novaConta({ autenticado: true, xp: 1500, claimed: [] });
  pedidos.length = 0;
  const [a, b] = await Promise.all([P.resgatarNivel(1), P.resgatarNivel(1)]);
  assert.equal(pedidos.filter((p) => p.method === 'POST').length, 1, 'clique duplo virou dois pedidos');
  assert.equal(a.level, 1); assert.equal(b.level, 1);
  const repetido = await P.resgatarNivel(1);
  assert.equal(repetido.already_claimed, true, 'repetição não veio idempotente do servidor');
  assert.equal(mock.creditos.filter((c) => c.event_key.endsWith(':1')).length, 5, 'recompensas do nível 1 duplicaram');
  /* troca de conta com o resgate em voo: a conta nova manda o PRÓPRIO pedido */
  await novaConta({ autenticado: true, xp: 1500, claimed: [] });
  const contaAntiga = mock;
  pedidos.length = 0; atrasoPost = 30;
  const antiga = P.resgatarNivel(1);
  const contaNova = mock = criarPasseMock({ autenticado: true, xp: 1500, claimed: [] });
  await P.trocarContaPasse();
  const nova = P.resgatarNivel(1);
  await Promise.allSettled([antiga, nova]); atrasoPost = 0;
  assert.equal(pedidos.filter((p) => p.method === 'POST').length, 2, 'conta nova reaproveitou o resgate em voo da conta anterior');
  const doNivel1 = (conta) => conta.creditos.filter((c) => c.event_key.endsWith(':1')).length;
  assert.equal(doNivel1(contaAntiga), 5, 'conta anterior perdeu o próprio resgate');
  assert.equal(doNivel1(contaNova), 5, 'conta nova não recebeu o próprio resgate');
});

await clausula('PS6', 'analytics: modal_view e open só com consentimento', async () => {
  storage.clear(); storage.set('cs_lang', 'pt');
  await novaConta({ autenticado: false, claimed: [] });
  const eventos = () => pedidos.filter((p) => p.method === 'POST' && JSON.parse(p.body).action === 'analytics').map((p) => JSON.parse(p.body));
  const anunciar = () => { const d = A.anunciarPasse({}); d?.dispara('cancel'); storage.delete(P.PASSE_ANUNCIO_CHAVE); return d; };
  for (const [nome, privacidade] of [['sem __csPrivacy', undefined], ['recusa gravada', { allowed: () => false }]]) {
    globalThis.__csPrivacy = privacidade;
    pedidos.length = 0;
    assert.ok(anunciar(), 'anúncio não abriu para medir');
    P.registrarEventoPasse('open');
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(eventos(), [], `evento saiu ${nome}`);
  }
  globalThis.__csPrivacy = { allowed: () => true };
  pedidos.length = 0;
  anunciar();
  P.registrarEventoPasse('xp');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(eventos(), [{ action: 'analytics', event: 'modal_view' }], `anúncio com consentimento mandou ${JSON.stringify(eventos())}`);
  assert.deepEqual(mock.eventos, ['modal_view'], 'servidor não recebeu modal_view');
  delete globalThis.__csPrivacy;
  /* a tela do passe (DOM do lobby, fora do Node) manda open ao abrir */
  const tela = ler('public/js/tp/passe.js');
  assert.match(tela.slice(tela.indexOf('export function abrirPasse')), /dialog\.showModal\(\);[\s\S]*registrarEventoPasse\('open'\);/, 'abrir a tela do passe não manda open');
});

await clausula('PS8', 'mock na janela: nada de resgate fora da temporada', async () => {
  const antes = criarPasseMock({ autenticado: true, xp: 9000, claimed: [], inicio: AGORA + 86400000, fim: AGORA + 60 * 86400000 });
  assert.deepEqual(antes.status().claimable, [], `pré-temporada com níveis resgatáveis: ${antes.status().claimable}`);
  const r = antes.handle('POST', JSON.stringify({ action: 'claim', level: 1 }));
  assert.ok(r.status === 409 && r.body.error === 'season_closed', `resgate na pré-temporada: ${r.status} ${JSON.stringify(r.body)}`);
  const depois = criarPasseMock({ autenticado: true, xp: 9000, claimed: [], inicio: AGORA - 90 * 86400000, fim: AGORA - 8 * 86400000 });
  assert.deepEqual(depois.status().claimable, [], 'resgate aberto depois de claim_until');
  assert.equal(depois.handle('POST', JSON.stringify({ action: 'claim', level: 1 })).status, 409, 'resgate aceito depois de claim_until');
  const noAr = criarPasseMock({ autenticado: true, xp: 9000, claimed: [] });
  assert.ok(noAr.status().claimable.length > 0 && noAr.handle('POST', JSON.stringify({ action: 'claim', level: 1 })).status === 200, 'controle: temporada no ar sem resgate');
});

const alvo = MUT ? MUTANTES[MUT][0] : '';
if (ESPERA) {
  const mordeu = falhas.includes(alvo);
  console.log(`${mordeu ? 'MORDE' : 'CEGO '} ${alvo} (${MUT})`);
  process.exit(mordeu ? 0 : 1);
}
console.log(JSON.stringify({ mutante: MUT || null, falhas }));
process.exit(falhas.length ? 1 : 0);
