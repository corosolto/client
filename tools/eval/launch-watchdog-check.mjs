/* LAUNCH-WATCHDOG-CHECK — o watchdog de lançamento não acusa nem UI viva nem travamento real.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTEM ESTES DOIS DEFEITOS (o mesmo laço, medido)

   (1) `partida` (2.0.0-alpha.250, 40 linhas em 13/09 no índice `js_error`):
       "Falha ao abrir partida: tempo limite ao abrir partida" numa sessão que a migalha
       diz ter ABRIDO em 35,9 s e seguido jogando por mais 6 minutos. Dois desvios no
       mesmo laço: `setTimeout` anda com a aba no fundo (o rAF para), e o predicado de
       vivacidade (`state === 'live'`) era usado como predicado de CONCLUSÃO — `countdown`
       e `roundEnd` (4 s a cada rodada) são partida aberta. Renovar por aba oculta (LW1) e
       por rede lenta (#241) resolve; a correção do status (LW2).

   (2) `menu` (#671, regressão da alpha.22, 107 ocorrências em 5 h em produção):
       "Falha ao abrir menu: tempo limite ao abrir menu" com migalha de quem estava
       NAVEGANDO (`clique #hub-map-change`, `#hub-change-character`, `#menu-setup`,
       `#hub-mp`). O watchdog do menu tem 3 s e só desarma em três estados (menu
       escondido, passo `profile`, `#hub-quick` aberto). No hub, abrir JOGAR é SÍNCRONO
       e trocar mapa/personagem/MP é UI que MANTÉM o menu aberto de propósito: o jogador
       que só clicava por mais de 3 s era acusado de travamento. Aqui a prova de
       vivacidade é o INPUT: mexeu nos últimos 3 s, a UI está viva e o watchdog renova
       (LW7). UI PARADA sem input por 3 s ainda falha (LW8) — senão o conserto desarmaria
       o watchdog, que é a armadilha de vacuidade da LW3.

   COMO A RÉGUA MEDE

   Ela não simula um watchdog parecido: EXTRAI o `lancamento` real e os dois predicados
   reais (`RÉGUA:launch-watchdog` em index.astro e main.js, `RÉGUA:launch-watchdog menu`
   em index.astro) e roda esse código num `vm` com relógio falso (`setTimeout` E `Date.now`)
   e DOM controlável. Mexeu no laço sem mexer aqui? A régua lê o código novo.

   CLÁUSULAS
     LW1  aba oculta durante a carga NÃO gera falha (renova)
     LW2  transição de rodada (countdown/roundEnd) NÃO gera falha
     LW3  travamento DE VERDADE ainda falha -> ANTIVACUIDADE
     LW4  a SESSÃO do relatório de 13/09: 7 min de partida aberta, 0 falhas
     LW5  as três regiões marcadas existem nos arquivos (a extração não silenciou)
     LW6  aba que ocultou e VOLTOU volta a poder falhar -> antivacuidade da LW1
     LW7  #671: no hub, quem NAVEGA (input nos últimos 3 s, menu aberto, hub-quick oculto)
          NÃO gera falha de menu
     LW8  #671: no hub, PARADO sem input por 3 s ainda gera a falha de menu
          -> ANTIVACUIDADE da LW7: renovar não é desarmar

   uso: node tools/eval/launch-watchdog-check.mjs [--mutante=<nome>]
     sovivo       predicado de partida volta a `state === 'live'` na ordem original -> LW2/LW4
     semoculto    tique ignora a aba oculta                                   -> LW1
     semconsumo   latch de ocultação nunca é consumido                        -> LW6
     seminteracao remove a renovação por input do menu                      -> LW7
     semprevivo   o menu renova SEMPRE (rede-lenta incondicional)            -> LW8

   Em TODAS as mutações, a cláusula antivacuidade correspondente tem que continuar
   VERDE: é ela que impede "consertar" o falso positivo desligando a detecção real.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ASTRO = path.join(RAIZ, 'src/pages/index.astro');
const MAIN = path.join(RAIZ, 'public/js/main.js');

const falhas = [];
const linhas = [];
const ok = (c, t, d) => { linhas.push(`${c} · ${t}\n   ${d}\n   PASSA`); };
const nok = (c, t, d) => { falhas.push(c); linhas.push(`${c} · ${t}\n   ${d}\n   FALHA`); };

/* Região marcada: `/* RÉGUA:<rotulo> início *\/` ... `/* RÉGUA:<rotulo> fim *\/`.
   Marcador explícito e não heurística de chaves — e se o marcador sumir, a LW5 acende em
   vez de a régua passar medindo nada (a armadilha de vacuidade do obb-check:28-31). */
function regiao(arquivo, rotulo) {
  const src = fs.readFileSync(arquivo, 'utf8');
  const ini = src.indexOf(`RÉGUA:${rotulo} início`);
  const fim = src.indexOf(`RÉGUA:${rotulo} fim`);
  if (ini < 0 || fim < 0 || fim <= ini) return null;
  const dep = src.indexOf('*/', ini);
  return src.slice(src.indexOf('\n', dep) + 1, src.lastIndexOf('\n', fim));
}

const SRC_LANC = regiao(ASTRO, 'launch-watchdog');
const SRC_PRED = regiao(MAIN, 'launch-watchdog');
const SRC_MENU = regiao(ASTRO, 'launch-watchdog menu');

if (!SRC_LANC || !SRC_PRED || !SRC_MENU) {
  nok('LW5', 'as três regiões marcadas existem nos arquivos',
    `index.astro(lanç) ${SRC_LANC ? 'ok' : 'SEM MARCADOR'}   main.js ${SRC_PRED ? 'ok' : 'SEM MARCADOR'}   index.astro(menu) ${SRC_MENU ? 'ok' : 'SEM MARCADOR'}`);
  console.log(`\n${linhas.join('\n\n')}\n`);
  console.log('LW1–LW4 · não medidas: sem a região marcada a régua não lê o código de produção');
  console.log('\nREPROVA (launch-watchdog-check)');
  process.exit(1);
}
ok('LW5', 'as três regiões marcadas existem nos arquivos',
  `index.astro(lanç) ${SRC_LANC.split('\n').length} linhas   main.js ${SRC_PRED.split('\n').length} linhas   index.astro(menu) ${SRC_MENU.split('\n').length} linhas`);

/* ---------------------------------------------------------------- o banco de testes */
/* Relógio falso em `setTimeout` E em `Date.now`: as cláusulas LW7/LW8 medem RENOVAÇÃO por
   input RECENTE, e input recente é uma diferença de tempo — com o relógio real a régua
   mentiria para os dois lados. `Date` mínimo: só `now` é chamado pelas regiões. */
function banco({ oculta = false, predicado = SRC_PRED, mutante = MUT } = {}) {
  let agora = 0;
  let seq = 0;
  const timers = new Map();
  const falhasVistas = [];
  const jogo = { state: 'boot', time: 0 };
  const estado = { oculto: oculta, lstat: { loaded: 0 }, ouvintes: [], elementos: {}, dataset: {} };

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout(fn, ms) { const id = ++seq; timers.set(id, { t: agora + (ms || 0), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    Error,
    String,
    Date: { now: () => agora },
    document: {
      get visibilityState() { return estado.oculto ? 'hidden' : 'visible'; },
      get hidden() { return estado.oculto; },
      documentElement: { dataset: estado.dataset },
      getElementById: (id) => estado.elementos[id] || null,
      addEventListener(tipo, fn) { estado.ouvintes.push({ tipo, fn }); },
    },
    /* stubs do coletor: o que a régua mede é SE o fail acontece, não o que ele envia */
    reporta(kind, msg, source) { falhasVistas.push({ kind, msg, source }); return { fp: 'x', corpo: '{}' }; },
    mostraFalha() {},
    consoleErroNativo: null,
    relatorioFalha: null,
    migalha() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  Object.defineProperty(sandbox, '__game', { get: () => (jogo.state === null ? null : jogo) });

  const ctx = vm.createContext(sandbox);
  let fonteLanc = SRC_LANC;
  if (mutante === 'semoculto') {
    /* MUTANTE: devolve o defeito (1) — o tique deixa de perguntar pela aba oculta. */
    fonteLanc = fonteLanc.replace(/if \(self\.ocultou[^\n]*\n/, '\n');
  }
  if (mutante === 'semconsumo') {
    /* MUTANTE: mantém a renovação por aba oculta, mas NUNCA consome o latch — era este o
       furo que a LW1 sozinha deixava passar (uma troca de aba desarmava o watchdog para o
       resto da sessão). */
    fonteLanc = fonteLanc.replace(/this\.ocultou = document\.visibilityState === 'hidden';\n/, '\n');
  }
  vm.runInContext(`${fonteLanc}\nwindow.__gameLaunch = lancamento;`, ctx);

  /* O predicado do MENU entra pelo mesmo vm e arma o watchdog de 3 s de verdade. */
  let fonteMenu = SRC_MENU;
  if (mutante === 'seminteracao') {
    /* MUTANTE: volta ao predicado anterior — sem a linha de renovação por input, quem
       só navega no hub estoura o teto de 3 s. É o defeito da #671 literal. */
    fonteMenu = fonteMenu.replace(/if \(lancamento\.ultimaInteracao[^\n]*\n/, '\n');
  }
  if (mutante === 'semprevivo') {
    /* MUTANTE: "renova sempre" — o modo preguiçoso de matar o falso positivo: mata também
       a detecção de menu TRAVADO. A LW8 existe para morder isto. */
    fonteMenu = fonteMenu.replace(/if \(lancamento\.ultimaInteracao[^\n]*\n/, "if (true) return 'rede-lenta';\n");
  }
  vm.runInContext(fonteMenu, ctx);

  let fontePred = predicado;
  if (mutante === 'sovivo') {
    /* MUTANTE: devolve o defeito (2) TAL E QUAL ele era em alpha.250 — tira a prova de
       quadro e devolve a vivacidade no fim, NA ORDEM ORIGINAL. Mutante que reordena não é
       o defeito: é outro bug. */
    fontePred = fontePred.replace(/ {4}if \(g && g\.time > 0\) return true;\n/, '')
      .replace(/ {4}return false;\n/, "    return !!(g && g.state === 'live');\n");
  }
  /* o parâmetro se chama `_lstat` de propósito: a região extraída do main.js lê
     `_lstat.loaded` e tem de continuar lendo o mesmo nome, sem reescrita. */
  vm.runInContext(`window.__arma = function(_lstat){\n${fontePred}\n};`, ctx);

  const corre = (ms) => {
    const alvo = agora + ms;
    for (;;) {
      let prox = null;
      for (const [id, t] of timers) if (t.t <= alvo && (!prox || t.t < prox[1].t)) prox = [id, t];
      if (!prox) break;
      timers.delete(prox[0]);
      agora = prox[1].t;
      prox[1].fn();
    }
    agora = alvo;
  };

  return {
    arma() { sandbox.__arma(estado.lstat); },
    /* DOM do menu: `#main-menu` presente e VISÍVEL, `#hub-quick` oculto. É exatamente o
       estado de quem está dentro do hub sem o compositor de confirmação aberto (#671). */
    montaHub() {
      estado.dataset.homeUi = 'hub';
      estado.elementos['main-menu'] = { hidden: false, classList: { contains: () => false }, dataset: {} };
      estado.elementos['menu-setup'] = { hidden: false, classList: { contains: () => true }, dataset: { step: 'match' } };
      estado.elementos['hub-quick'] = { hidden: true, classList: { contains: () => false }, dataset: {} };
    },
    /* input do jogador: os ouvintes de pointerdown/keydown/click que o watchdog registrou
       viram carimbo de tempo no relógio falso. */
    interage() { for (const o of estado.ouvintes) if (o.tipo === 'pointerdown' || o.tipo === 'keydown' || o.tipo === 'click') o.fn(); },
    ocultar(v) {
      estado.oculto = v;
      for (const o of estado.ouvintes) if (o.tipo === 'visibilitychange') o.fn();
    },
    quadro(dt = 0.016) { jogo.time += dt; },
    estadoDoJogo(s) { jogo.state = s; },
    carrega(n) { estado.lstat.loaded += n; },
    avanca: corre,
    falhas: falhasVistas,
    ativo: () => sandbox.__gameLaunch.ativo,
  };
}

/* LW1 — aba oculta durante a carga. O cenário literal do defeito: o jogador clica em
   jogar, troca de aba, o rAF para (zero quadro, `state` travado em `countdown`) e o
   `setTimeout` de 60 s dispara de todo jeito. */
{
  const b = banco();
  b.arma();
  b.estadoDoJogo('countdown');   // game.start() já rodou; nenhum quadro ainda
  b.ocultar(true);
  b.avanca(180_000);             // três tetos de 60 s com a aba no fundo
  const d = `quadros 0   estado countdown   aba oculta 180 s   falhas ${b.falhas.length}`;
  if (b.falhas.length === 0) ok('LW1', 'aba oculta durante a carga não gera falha de lançamento', d);
  else nok('LW1', 'aba oculta durante a carga não gera falha de lançamento', `${d}   <- "${b.falhas[0].msg}"`);
}

/* LW2 — transição de rodada. Partida aberta e andando; o watchdog sobreviveu ao
   lançamento (renovado pela rede lenta) e o tique cai nos 4 s de `roundEnd`. */
{
  const b = banco();
  b.arma();
  b.estadoDoJogo('countdown');
  for (let i = 0; i < 30; i++) b.quadro();       // a partida abriu de verdade
  b.estadoDoJogo('live');
  b.carrega(3);                                  // GLB chegando: renova (rede lenta, #241)
  b.avanca(60_000);
  b.estadoDoJogo('roundEnd');                    // fim de rodada: 4 s fora de 'live'
  b.avanca(60_000);
  const d = `estado roundEnd com partida aberta   falhas ${b.falhas.length}`;
  if (b.falhas.length === 0) ok('LW2', 'transição de rodada não gera falha de lançamento', d);
  else nok('LW2', 'transição de rodada não gera falha de lançamento', `${d}   <- "${b.falhas[0].msg}"`);
}

/* LW3 — ANTIVACUIDADE. Travamento de verdade: aba visível, nenhum quadro, nenhum
   progresso de carga. Esta cláusula tem que ficar VERDE inclusive nos mutantes: é ela
   que impede "consertar" o falso positivo desarmando o watchdog. */
{
  const b = banco();
  b.arma();
  b.estadoDoJogo(null);          // nem __game nasceu
  b.avanca(61_000);
  const d = `aba visível   quadros 0   progresso 0   falhas ${b.falhas.length}`;
  const certa = b.falhas.length === 1 && /tempo limite ao abrir partida/.test(b.falhas[0].msg);
  if (certa) ok('LW3', 'travamento real ainda falha (antivacuidade)', d);
  else nok('LW3', 'travamento real ainda falha (antivacuidade)', `${d}   esperado 1 com "tempo limite ao abrir partida"`);
}

/* LW4 — a SESSÃO INTEIRA do relatório de produção, não um instante dela. Sete minutos de
   MP em `rounds`, com o jogador jogando (quadros andando), GLB pingando de vez em quando
   (cada um renova o watchdog pela cláusula de rede lenta) e as rodadas girando
   countdown -> live -> roundEnd. O `ready()` NÃO é chamado aqui de propósito — no
   relatório real o lançamento seguia armado sete minutos depois do clique em `#mp-quick`. */
{
  const b = banco();
  b.arma();
  b.estadoDoJogo('countdown');
  for (let min = 0; min < 7; min++) {
    for (let i = 0; i < 60; i++) b.quadro();        // o jogador está jogando
    const ultimo = min === 6;
    b.estadoDoJogo(ultimo ? 'roundEnd' : 'live');
    if (!ultimo) b.carrega(2);                      // asset chegando: renova
    b.avanca(60_000);
  }
  const d = `7 min jogando   6 renovações por asset   7º tique em roundEnd   falhas ${b.falhas.length}`;
  if (b.falhas.length === 0) ok('LW4', 'sete minutos de partida aberta não geram nenhuma falha de lançamento', d);
  else nok('LW4', 'sete minutos de partida aberta não geram nenhuma falha de lançamento', `${d}   <- "${b.falhas[0].msg}"`);
}

/* LW6 — ANTIVACUIDADE DA LW1, e ela pegou um furo real durante este próprio conserto. A
   renovação por aba oculta é de graça UMA VEZ POR EPISÓDIO, não de graça para sempre: sem
   consumir o latch no `begin`, uma única troca de aba na sessão desarmava o watchdog pelo
   resto dela — e a LW1 ficaria verde exatamente do mesmo jeito. */
{
  const b = banco();
  b.arma();
  b.estadoDoJogo('countdown');
  b.ocultar(true);
  b.avanca(60_000);              // tique 1: aba oculta -> renova
  b.ocultar(false);              // o jogador voltou para a aba
  b.avanca(180_000);
  const d = `oculta 60 s, volta, 180 s à frente sem um quadro   falhas ${b.falhas.length}`;
  const certa = b.falhas.length === 1 && /tempo limite ao abrir partida/.test(b.falhas[0].msg);
  if (certa) ok('LW6', 'aba que ocultou e VOLTOU volta a poder falhar (antivacuidade da LW1)', d);
  else nok('LW6', 'aba que ocultou e VOLTOU volta a poder falhar (antivacuidade da LW1)', `${d}   esperado 1`);
}

/* LW7 — #671. O cenário LITERAL da migalha de produção: hub ligado, menu aberto, hub-quick
   oculto, e o jogador NAVEGANDO (troca de mapa/personagem/MP) — cada clique a menos de 3 s
   do tique. Antes: nenhuma das três condições de desarme acontecia e o watchdog accusava
   "tempo limite ao abrir menu" em quem estava usando o menu. Aqui: 10 tetos de 3 s com
   input recente = 0 falhas. */
{
  const b = banco();
  b.montaHub();
  b.interage();                  // o clique no JOGAR arma o watchdog
  for (let volta = 0; volta < 10; volta++) {
    b.avanca(2_900);             // navega (2,9 s depois do clique anterior: input recente)
    b.interage();
  }
  b.avanca(2_900);
  const d = `hub   menu aberto   hub-quick oculto   10 tiques de 3 s com input a cada 2,9 s   falhas ${b.falhas.length}`;
  if (b.falhas.length === 0) ok('LW7', 'no hub, navegar (input recente) não gera falha de menu (#671)', d);
  else nok('LW7', 'no hub, navegar (input recente) não gera falha de menu (#671)', `${d}   <- "${b.falhas[0].msg}"`);
}

/* LW8 — ANTIVACUIDADE DA LW7. Menu PARADO: hub ligado, menu aberto, hub-quick oculto e o
   jogador sem mexer em nada por mais de 3 s. Isso É travamento (a UI não respondeu ao
   clique) e tem que continuar falhando — senão "renovar por input" é só desarmar com
   outro nome. */
{
  const b = banco();
  b.montaHub();
  b.interage();                  // clique no JOGAR arma o watchdog; depois, silêncio
  b.avanca(4_000);
  const d = `hub   menu aberto   hub-quick oculto   4 s SEM input   falhas ${b.falhas.length}`;
  const certa = b.falhas.length === 1 && /tempo limite ao abrir menu/.test(b.falhas[0].msg);
  if (certa) ok('LW8', 'no hub, menu parado sem input ainda falha (antivacuidade da LW7)', d);
  else nok('LW8', 'no hub, menu parado sem input ainda falha (antivacuidade da LW7)', `${d}   esperado 1 com "tempo limite ao abrir menu"`);
}

console.log(`\n${linhas.join('\n\n')}\n`);
if (MUT) console.log(`mutante aplicado: --mutante=${MUT}\n`);
console.log(falhas.length === 0
  ? 'PASSA (launch-watchdog-check) — 8/8 cláusulas'
  : `REPROVA (launch-watchdog-check) — ${falhas.join(', ')}`);
process.exit(falhas.length === 0 ? 0 : 1);