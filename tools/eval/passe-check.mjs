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
   PS9 anuncio-desiste   · com outro <dialog> aberto (anúncio da Operação Flávio no 1º acesso) o
                           passe espera ele fechar e abre na MESMA visita; continua uma vez por
                           versão e desiste sem marcar quando a partida começou na espera.
   PS10 bot-travado-fixado · o trecho REAL de main.js que monta a escalação da partida deixa de
                           fora o pin salvo de personagem travado; destravado pelo servidor, entra.
                           O ＋ recusado no seletor é medido no navegador (passe-browser.mjs, PB9).
   PS11 forcado         · fim de partida pede liquidação NOVA: carregarPasse({forcar}) não devolve o
                           pedido em voo, o pedido mais novo manda (o velho que chega depois não
                           sobrescreve) e o forçado que falha mantém o status na tela.
   PS12 novidades       · diff entre a memória da conta+temporada (localStorage) e o status: 0→10
                           é o presente de boas-vindas, nível sobe uma vez por nível visto, missão
                           feita avisa uma vez por período, e cada conta tem a própria memória.
   PS13 resgatar-tudo   · um POST por nível, EM SEQUÊNCIA (nunca dois em voo), rate_limited espera
                           e tenta de novo, outro erro para a fila; resumo somado da trilha.
   PS14 partida         · acompanharPartidaPasse guarda o XP de antes e liquida de novo duas vezes,
                           a segunda ~8 s depois (MP chega atrasado), sempre forçada.

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
  'sorteio-reserva-travado': ['PS7', 'public/js/main.js', 'return CHARACTERS.find((character) => !personagemTravado(character)) || CHARACTERS[0];', 'return CHARACTERS[0];'],
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
  'anuncio-desiste': ['PS9', 'public/js/passe-anuncio.js', '    await semDialogoAberto();\n', '    return null;\n'],
  'bot-travado-fixado': ['PS10', 'public/js/main.js', " && !personagemTravado(CHARACTERS.find((c) => c.id === id)));", ');'],
  'forcado-devolve-voo': ['PS11', 'public/js/passe.js', 'if (carregando && !forcar) return carregando;', 'if (carregando) return carregando;'],
  'pedido-velho-sobrescreve': ['PS11', 'public/js/passe.js', 'if (minha !== epoca || meu !== ultimoPedido) return estado;', 'if (minha !== epoca) return estado;'],
  'forcado-apaga-status': ['PS11', 'public/js/passe.js', '    if (forcar && estado && (erro || !out)) return estado;\n', '\n'],
  'diff-sem-nivel': ['PS12', 'public/js/passe.js', 'const subiu = s.level > de ?', 'const subiu = s.level > de && false ?'],
  'missao-repete': ['PS12', 'public/js/passe.js', '.filter((q) => q.done && !feitas.has(q.id))', '.filter((q) => q.done)'],
  'memoria-sem-conta': ['PS12', 'public/js/passe.js', 'const chaveMemoria = (c) => `${PASSE_MEMORIA_CHAVE}:${c}:${PASSE_TEMPORADA}`;', 'const chaveMemoria = () => `${PASSE_MEMORIA_CHAVE}:${PASSE_TEMPORADA}`;'],
  'nivel-visto-cedo': ['PS12', 'public/js/passe.js', 'const memoria = { level: de,', 'const memoria = { level: s.level,'],
  'resgatar-tudo-paralelo': ['PS13', 'public/js/passe.js', 'const out = await resgatarComLimite(fila[i]);', 'const out = resgatarComLimite(fila[i]).catch(() => null);'],
  'resgatar-tudo-sem-limite': ['PS13', 'public/js/passe.js', "if (e.message !== 'rate_limited' || tentativa >= 3) throw e;", 'throw e;'],
  'partida-sem-forcar': ['PS14', 'public/js/passe.js', 'void carregarPasse({ forcar: true }); }, ms);', 'void carregarPasse(); }, ms);'],
  'partida-uma-vez': ['PS14', 'public/js/passe.js', 'PASSE_ATRASOS_PARTIDA = Object.freeze([4000, 12000]);', 'PASSE_ATRASOS_PARTIDA = Object.freeze([4000]);'],
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
const { criarPasseMock, xpAcumulado } = await import(dataUrl(ler('tools/eval/passe-mock.mjs')));

/* Relógio fixo no meio da temporada (05/11/2026 a 10/01/2027): a régua mede comportamento, não a
   data em que roda. Vale para os módulos do client e para o mock, que leem Date.now(). */
const AGORA = Date.parse('2026-11-20T15:00:00Z');
Date.now = () => AGORA;

/* ---------- DOM mínimo: o que passe.js e passe-anuncio.js tocam ---------- */
const storage = new Map();
let busca = '';
/* MutationObserver mínimo: qualquer mudança de <dialog> (abrir, fechar, sair do DOM) avisa todos. */
const observadores = new Set();
globalThis.MutationObserver = class { constructor(cb) { this.cb = cb; } observe() { observadores.add(this); } disconnect() { observadores.delete(this); } };
const mudou = () => queueMicrotask(() => { for (const o of [...observadores]) o.cb([]); });
class No {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.ouvintes = {}; this.textContent = ''; this.open = false; this.parent = null; this.style = { setProperty() {} }; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(...xs) { for (const x of xs) { if (typeof x === 'string') this.textContent += x; else { x.parent = this; this.children.push(x); } } mudou(); }
  appendChild(x) { this.append(x); return x; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; mudou(); }
  addEventListener(t, f) { (this.ouvintes[t] ||= []).push(f); }
  dispara(t) { for (const f of this.ouvintes[t] || []) f({ preventDefault() {} }); }
  showModal() { this.open = true; mudou(); }
  close() { this.open = false; mudou(); }
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
  dispatchEvent(e) { if (e?.type === 'cs-passe-novidade') novidades.push(e.detail); return true; },
};
globalThis.document = document;
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
globalThis.localStorage = { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
Object.defineProperty(globalThis, 'location', { configurable: true, get: () => ({ search: busca, hostname: 'localhost' }) });

/* ---------- fetch ligado ao mock do contrato ---------- */
let mock = criarPasseMock();
const pedidos = [];
const novidades = [];   // PASSE_NOVIDADE despachado por passe.js (subida de nível, missão feita)
let atrasoPost = 0;   // resgate "em voo" para medir troca de conta no meio
let atrasosGet = [];  // atraso de cada GET, na ordem; a resposta é a do servidor NO ENVIO
let emVoo = 0, maxEmVoo = 0;   // resgates simultâneos (RESGATAR TUDO tem de ser em sequência)
let respostaPost = null;       // (nº do POST, corpo) -> {status, body} para simular rate_limited/erro
let falhaGet = false;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url, 'http://localhost');
  pedidos.push({ path: u.pathname, search: u.search, method: init.method || 'GET', body: init.body ?? null });
  if (u.pathname !== '/api/passe') return new Response('{"error":"not_found"}', { status: 404 });
  const conta = mock;   // o pedido pertence à conta que estava ativa quando saiu
  if (init.method !== 'POST') {
    if (falhaGet) throw new TypeError('fetch failed');
    const { status, body } = conta.handle('GET', '');
    const ms = atrasosGet.shift() || 0;
    if (ms) await new Promise((r) => setTimeout(r, ms));
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }
  emVoo++; maxEmVoo = Math.max(maxEmVoo, emVoo);
  try {
    if (atrasoPost) await new Promise((r) => setTimeout(r, atrasoPost));
    const nPost = pedidos.filter((p) => p.method === 'POST').length;
    const { status, body } = respostaPost?.(nPost, JSON.parse(init.body || '{}')) || conta.handle('POST', init.body || '');
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  } finally { emVoo--; }
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
    // Brasão por slug do registro de facções (main.js usa urlDoBrasao(factionDefinition(lado).crest)).
    urlDoBrasao: (crest) => `img/brasoes/${crest}.png`, factionDefinition: (id) => ({ crest: String(id).toLowerCase() }),
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
    ctx.rememberedSide = 'P'; const reserva = api.randomInitialCharacter().id; ctx.rememberedSide = 'E';   // lado sem ninguém livre
    Object.assign(ctx, { HUB_ENABLED: true, currentChar: 'capitao-caveira', mostrado: null }); api.syncHomeCharacter();
    return {
      sorteio: sorteados.has('capitao-caveira'), reserva, livre: api.personagemLivre(caveira, 'E').id, lobby: ctx.mostrado?.id,
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
  assert.equal(t.reserva, 'esquerdomacho', `sorteio sem ninguém livre no lado entregou ${t.reserva}`);
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

await clausula('PS9', 'anuncio-desiste: outro <dialog> aberto, o passe espera e abre na mesma visita', async () => {
  storage.clear();
  await novaConta({ autenticado: false, claimed: [] });
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const abrirOutro = () => { const d = document.createElement('dialog'); document.body.append(d); d.showModal(); return d; };
  const fecharOutro = (d) => { d.close(); d.remove(); };
  /* 1º acesso: o anúncio da Operação Flávio está aberto quando o passe chega */
  const flavio = abrirOutro();
  let pronto = false;
  const vez = A.anunciarPasseNaVez({}).then((d) => { pronto = true; return d; });
  await tick();
  assert.equal(pronto, false, 'com o Flávio aberto o passe desistiu em vez de esperar');
  assert.equal(document.body.children.filter((n) => n.tagName === 'DIALOG' && n.open).length, 1, 'passe empilhou sobre o Flávio');
  assert.equal(storage.get(P.PASSE_ANUNCIO_CHAVE), undefined, 'marcou o anúncio como visto sem abrir');
  fecharOutro(flavio);
  const passe = await Promise.race([vez, new Promise((r) => setTimeout(() => r('esperando'), 200))]);
  assert.ok(passe?.open && passe.id === 'passe-anuncio', `Flávio fechou e o passe não abriu na mesma visita (${passe === 'esperando' ? 'ainda esperando' : 'desistiu'})`);
  assert.equal(storage.get(P.PASSE_ANUNCIO_CHAVE), P.PASSE_ANUNCIO_VERSAO, 'versão vista não ficou guardada');
  passe.dispara('cancel');
  /* uma vez por versão: já visto, não espera outro diálogo para repetir */
  const outro = abrirOutro();
  const visto = await Promise.race([A.anunciarPasseNaVez({}), tick().then(() => 'esperando')]);
  assert.equal(visto, null, `anúncio já visto ficou esperando para repetir (${visto})`);
  fecharOutro(outro);
  /* a partida começou durante a espera: desiste sem abrir nem marcar */
  storage.clear();
  const antes = abrirOutro();
  const naPartida = A.anunciarPasseNaVez({}, { seguir: () => false });
  fecharOutro(antes);
  assert.equal(await naPartida, null, 'abriu o anúncio por cima da partida');
  assert.equal(storage.get(P.PASSE_ANUNCIO_CHAVE), undefined, 'marcou visto sem mostrar');
  storage.clear();
});

await clausula('PS10', 'bot-travado-fixado: pin salvo de personagem travado fica fora da partida', async () => {
  const caveira = { id: 'capitao-caveira', team: 'E', name: 'Capitão Caveira', passe: { season: 'sessao-da-treta-s1', level: 1 } };
  const livre = { id: 'esquerdomacho', team: 'E', name: 'Esquerdomacho' };
  const linha = corta(mainJs, '  const _escalados = ', '\n');
  const ctx = vm.createContext({ CHARACTERS: [caveira, livre], personagemTravado: P.personagemTravado, settings: { pinnedChars: ['capitao-caveira', 'esquerdomacho'] } });
  const escalados = (charId) => Array.from(vm.runInContext(`(() => {\n${linha}\nreturn _escalados; })()`, Object.assign(ctx, { charId, sessao: null })));   // array deste realm: deepEqual compara protótipo
  await novaConta({ autenticado: false, claimed: [] });
  assert.deepEqual(escalados('caminhoneiro'), ['esquerdomacho'], `visitante: escalação da partida ${JSON.stringify(escalados('caminhoneiro'))} leva o travado como bot`);
  await novaConta({ autenticado: true, xp: 400, claimed: [] });
  assert.deepEqual(escalados('caminhoneiro'), ['esquerdomacho'], 'conta sem o nível resgatado leva o travado como bot');
  /* controle positivo: destravado pelo servidor, o pin vale */
  await novaConta({ autenticado: true, xp: 1200, claimed: [] });
  await P.resgatarNivel(1);
  assert.deepEqual(escalados('caminhoneiro'), ['capitao-caveira', 'esquerdomacho'], 'destravado pelo servidor e o pin sumiu da partida');
});

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const gets = () => pedidos.filter((p) => p.method === 'GET').length;

await clausula('PS11', 'forcado: fim de partida liquida de novo, sem reaproveitar o pedido em voo', async () => {
  await novaConta({ autenticado: true, xp: 2350, claimed: [] });
  pedidos.length = 0;
  atrasosGet = [60, 5];   // o pedido velho volta DEPOIS do forçado
  const velho = P.carregarPasse();
  assert.equal(P.carregarPasse(), velho, 'pedido normal com outro em voo não reaproveitou o pedido');
  mock.definir({ xp: 2800 });   // a partida liquidou no servidor depois que o pedido velho saiu
  const novo = P.carregarPasse({ forcar: true });
  await Promise.all([velho, novo]);
  assert.equal(gets(), 2, `forçado com pedido em voo fez ${gets()} GET (quer 2)`);
  assert.equal(P.passeEstado()?.xp, 2800, `o pedido velho, que voltou depois, sobrescreveu o novo: xp ${P.passeEstado()?.xp}`);
  falhaGet = true;
  await P.carregarPasse({ forcar: true });
  falhaGet = false;
  assert.ok(P.passeEstado()?.xp === 2800 && !P.passeFalhou(), 'liquidação forçada que falhou apagou o status da tela');
  atrasosGet = [];
});

await clausula('PS12', 'novidades: diff por conta+temporada (nível, boas-vindas, missão uma vez)', async () => {
  const status = (opcoes) => P.normalizarStatus(criarPasseMock({ autenticado: true, claimed: [], ...opcoes }).status());
  const s10 = status({ xp: xpAcumulado(10) });
  const primeira = P.novidadesPasse(null, s10, AGORA);
  assert.ok(primeira.subiu && primeira.subiu.de === 0 && primeira.subiu.para === 10 && primeira.subiu.boasVindas && primeira.subiu.niveis.length === 10,
    `primeira vez no nível 10 sem presente de boas-vindas: ${JSON.stringify(primeira.subiu && { ...primeira.subiu, niveis: primeira.subiu.niveis.length })}`);
  assert.deepEqual(primeira.missoes, [], 'primeira vez avisou missão feita antes de existir memória');
  const vista = { ...primeira.memoria, level: 10 };
  const s11 = status({ xp: xpAcumulado(11), progresso: { login: 1, play_3: 3, win_1: 1 } });
  const depois = P.novidadesPasse(vista, s11, AGORA);
  assert.ok(depois.subiu && depois.subiu.de === 10 && depois.subiu.para === 11 && !depois.subiu.boasVindas && depois.subiu.niveis.map((l) => l.n).join() === '11',
    `10 -> 11 errado: ${JSON.stringify(depois.subiu && { ...depois.subiu, niveis: depois.subiu.niveis.map((l) => l.n) })}`);
  assert.deepEqual(depois.missoes.map((q) => q.id), ['play_3'], `missão nova: ${depois.missoes.map((q) => q.id)} (quer só play_3)`);
  const amanha = P.novidadesPasse({ ...depois.memoria, level: 11 }, s11, AGORA + 86400000);
  assert.ok(!amanha.subiu && amanha.missoes.map((q) => q.id).sort().join() === 'login,play_3,win_1',
    `dia novo: diárias feitas de novo têm de avisar (veio ${amanha.missoes.map((q) => q.id)})`);
  assert.equal(P.novidadesPasse(null, status({ autenticado: false }), AGORA), null, 'visitante com novidade');
  /* integrado: GET com conta -> PASSE_NOVIDADE, memória no localStorage desta conta */
  storage.clear(); novidades.length = 0;
  mock = criarPasseMock({ autenticado: true, xp: xpAcumulado(10), claimed: [] });
  await P.trocarContaPasse('conta-a');
  assert.ok(novidades.length === 1 && novidades[0].subiu?.para === 10 && novidades[0].subiu.boasVindas, `conta nova no nível 10: ${JSON.stringify(novidades)}`);
  await P.carregarPasse();
  assert.ok(novidades.length === 2 && novidades[1].subiu?.para === 10, 'celebração que não apareceu sumiu no GET seguinte (nível marcado visto antes da hora)');
  P.marcarNivelVisto(10);
  await P.carregarPasse();
  assert.equal(novidades.length, 2, 'nível já visto celebrou de novo');
  mock.definir({ progresso: { play_3: 3 } });
  await P.carregarPasse();
  assert.ok(novidades.length === 3 && !novidades[2].subiu && novidades[2].missoes.map((q) => q.id).join() === 'play_3', `missão concluída: ${JSON.stringify(novidades[2])}`);
  await P.carregarPasse();
  assert.equal(novidades.length, 3, 'a mesma missão avisou duas vezes');
  await P.trocarContaPasse('conta-b');
  assert.ok(novidades.length === 4 && novidades[3].subiu?.de === 0 && novidades[3].conta === 'conta-b', 'outra conta herdou a memória da primeira');
  await P.trocarContaPasse();
  assert.equal(novidades.length, 4, 'sem conta identificada saiu novidade');
  storage.clear(); storage.set('cs_lang', 'pt');
});

await clausula('PS13', 'resgatar-tudo: em sequência, com rate limit, resumo da trilha', async () => {
  await novaConta({ autenticado: true, xp: xpAcumulado(10), claimed: [] });
  pedidos.length = 0; maxEmVoo = 0; atrasoPost = 15;
  const esperas = [], progresso = [];
  const espera = async (ms) => { esperas.push(ms); };
  const a = P.resgatarTodos({ espera, aoProgresso: (p) => progresso.push(p) });
  assert.equal(P.resgatarTodos({ espera }), a, 'segundo RESGATAR TUDO abriu outra fila');
  const out = await a;
  const niveis = pedidos.filter((p) => p.method === 'POST').map((p) => JSON.parse(p.body).level);
  assert.equal(maxEmVoo, 1, `${maxEmVoo} resgates em voo ao mesmo tempo (quer 1)`);
  assert.deepEqual(niveis, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `ordem dos resgates: ${niveis}`);
  assert.deepEqual(out.niveis, niveis, 'resumo não bate com os resgates');
  assert.ok(out.recompensas.personagens.length === 20 && out.recompensas.skins.length === 10 && out.recompensas.moedas === 950 && out.recompensas.boost === 20,
    `resumo: ${JSON.stringify({ ...out.recompensas, personagens: out.recompensas.personagens.length, skins: out.recompensas.skins.length })}`);
  assert.ok(P.passeEstado().claimable.length === 0 && progresso.at(-1)?.feitos === 10, 'status ou progresso final errado');
  /* rate_limited no 3º: espera o prazo e tenta o MESMO nível de novo */
  await novaConta({ autenticado: true, xp: xpAcumulado(10), claimed: [] });
  pedidos.length = 0; esperas.length = 0;
  let limitou = false;
  respostaPost = (n) => (n === 3 && !limitou ? (limitou = true, { status: 429, body: { error: 'rate_limited' } }) : null);
  const comLimite = await P.resgatarTodos({ espera });
  assert.ok(comLimite.niveis.length === 10 && !comLimite.erro && esperas.includes(P.PASSE_ESPERA_LIMITE_MS),
    `rate_limited no meio: ${comLimite.niveis.length} níveis, erro ${comLimite.erro}, esperas ${esperas}`);
  /* outro erro para a fila e devolve o que já saiu */
  await novaConta({ autenticado: true, xp: xpAcumulado(10), claimed: [] });
  pedidos.length = 0;
  respostaPost = (n, corpo) => (corpo.level === 4 ? { status: 409, body: { error: 'season_closed' } } : null);
  const parou = await P.resgatarTodos({ espera });
  const tentados = pedidos.filter((p) => p.method === 'POST').map((p) => JSON.parse(p.body).level);
  assert.ok(parou.niveis.join() === '1,2,3' && parou.erro === 'season_closed' && tentados.join() === '1,2,3,4', `erro no nível 4: ${JSON.stringify(parou)} tentados ${tentados}`);
  respostaPost = null; atrasoPost = 0;
  await novaConta({ autenticado: false, claimed: [] });
  pedidos.length = 0;
  await assert.rejects(P.resgatarTodos({ espera }), /account_required/);
  assert.equal(pedidos.filter((p) => p.method === 'POST').length, 0, 'visitante mandou resgate');
});

await clausula('PS14', 'partida: XP de antes guardado, duas liquidações forçadas, a 2ª ~8 s depois', async () => {
  const [a1, a2] = P.PASSE_ATRASOS_PARTIDA;
  assert.ok(P.PASSE_ATRASOS_PARTIDA.length === 2 && a2 - a1 >= 7000 && a2 - a1 <= 10000, `atrasos ${P.PASSE_ATRASOS_PARTIDA} (quer 2, o segundo ~8 s depois do primeiro)`);
  await novaConta({ autenticado: true, xp: 2350, claimed: [] });
  pedidos.length = 0;
  atrasosGet = [60];   // a 1ª liquidação ainda está em voo quando a 2ª sai
  const marco = P.acompanharPartidaPasse({ atrasos: [5, 30] });
  mock.definir({ xp: 2530 });
  await tick(15);
  mock.definir({ xp: 2650 });   // MP do nó chegou depois
  await tick(120);
  assert.ok(marco?.xp === 2350 && P.passePartida()?.xp === 2350, 'XP de antes da partida não ficou guardado');
  assert.equal(gets(), 2, `${gets()} GET depois da partida (quer 2)`);
  assert.equal(P.passeEstado()?.xp, 2650, `XP depois da partida ${P.passeEstado()?.xp} (quer 2650, a última liquidação)`);
  await novaConta({ autenticado: false, claimed: [] });
  pedidos.length = 0;
  assert.equal(P.acompanharPartidaPasse({ atrasos: [5] }), null, 'visitante com marco de partida');
  await tick(30);
  assert.equal(gets(), 1, 'visitante: o fim de partida parou de perguntar ao servidor');
  atrasosGet = [];
});

const alvo = MUT ? MUTANTES[MUT][0] : '';
if (ESPERA) {
  const mordeu = falhas.includes(alvo);
  console.log(`${mordeu ? 'MORDE' : 'CEGO '} ${alvo} (${MUT})`);
  process.exit(mordeu ? 0 : 1);
}
console.log(JSON.stringify({ mutante: MUT || null, falhas }));
process.exit(falhas.length ? 1 : 0);
