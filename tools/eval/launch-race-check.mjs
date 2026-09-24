/* LAUNCH-RACE-CHECK — a cauda do lançamento de partida acordava depois da saída e mexia
   num `game` que já não existia.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Duas issues automáticas em `2.0.0-alpha.261-c690c8831dea`, #608 e #609, o MESMO quadro
   de pilha na mesma linha, classe `codigo`:

     Falha ao abrir partida: Cannot read properties of null (reading '_requestLock')
     TypeError: Cannot read properties of null (reading '_requestLock')
         at _startGame (main.js:1376:23)          <<<  `if (!testMode) game._requestLock();`
         at async startGame (main.js:1179:5)
         at async mpMontarPartida (main.js:3455:3)
         at async net.onPartida (main.js:3440:5)
     Migalhas: 19 cliques em #game-container em 9 s

   `game` acabara de ser CONSTRUÍDO 80 linhas acima, na mesma função. Para ser nulo na
   linha 1376 alguém tem que tê-lo soltado no meio — e o meio existe: entre
   `game = new Game(...)` e o `_requestLock()` final mora um `await` de dois
   `requestAnimationFrame`, e antes dele o `await` do preload, que leva SEGUNDOS.

   LANÇAR PARTIDA É UMA CORRIDA. Três eventos chegam sozinhos nessa janela, nenhum deles
   precisa de sorte:

     1 · SAÍDA pelo menu       `quitToMenu` / `mpSair`  -> `game = null`
     2 · QUEDA do socket       `net.onClose` -> `mpDesconectou` -> `game = null`
     3 · REMONTAGEM do servidor  `onPartida` -> `mpMontarPartida` -> `startGame` de novo

   O quadro de pilha das duas issues chega por `net.onPartida`, que é o caminho 3 — o
   servidor girou o mapa. Nesse caminho a partida velha é derrubada e uma nova sobe: quem
   acorda tarde é a cauda da anterior.

   E O CRASH É O MENOS GRAVE DOS QUATRO ESTRAGOS. A cauda perdida também:
     - chamava `hideLoading()` por cima da tela de loading do lançamento NOVO, descobrindo
       uma cena pela metade (o "minecraft" que o comentário do `showLoading` proíbe);
     - mandava `game_start` de uma partida que não existe, inflando o funil;
     - construía um `Game` inteiro DEPOIS da desconexão (guarda do preload), um zumbi
       rodando atrás do menu que a queda já tinha aberto.

   O QUE FOI DESCARTADO COM MEDIÇÃO, NÃO COM PALPITE

     - "`game?._requestLock()` resolve": não. O `?.` cala o TypeError e deixa os outros três
       estragos de pé — tela roubada, funil inflado e Game zumbi. Cobre a linha do relatório,
       não o defeito.
     - "basta comparar `game !== meuJogo`": não, e é a cláusula LR2 que mede isso. O
       lançamento novo derruba o antigo (`if (game) game.dispose()`) e só atribui o `game`
       novo SEGUNDOS depois, ao fim do próprio preload: nessa janela `game` AINDA é o objeto
       da cauda velha, já descartado. A comparação por identidade passa verde e a cauda velha
       mexe num Game morto.
     - "é a queda de rede da #592/BUG-170": não. Aquela é `TypeError: network error`, sem
       quadro de pilha, classificada `recuperavel`. Esta tem pilha, linha e função — e a
       linha aponta para código nosso.

   O QUE ESTA RÉGUA MEDE, E COMO

   Ela não reescreve uma cauda parecida: EXTRAI do `public/js/main.js` as QUATRO regiões
   marcadas com `RÉGUA:launch-race` — o estado do lançamento (`_lancamento`,
   `lancamentoPerdeu`, `soltarPartida`), o NASCIMENTO (guarda do preload + `new Game`), a
   CAUDA de `game.start()` até o `_requestLock()`, e a QUEDA (o `catch` do `startGame`) — e
   roda esse código num `vm`, com `requestAnimationFrame` sob controle para poder interromper
   EXATAMENTE entre os dois quadros. Se alguém mexer no lançamento sem mexer aqui, a régua lê
   o código novo.

   CLÁUSULAS
     LR1  saída/queda entre os dois quadros -> nenhuma exceção, nenhum `_requestLock`
          (é a linha literal das issues #608/#609)
     LR2  remontagem entre os dois quadros -> a cauda velha não rouba a tela de loading
          nem o `game_start` do lançamento novo
     LR3  lançamento sem interrupção -> `start`, `hideLoading`, `game_start` e
          `_requestLock` acontecem, UMA vez cada
          -> antivacuidade: sem ela, um `return` no topo da cauda deixaria tudo verde
     LR4  `soltarPartida()` invalida o lançamento em voo E baixa a tela de loading
          (queda no meio do preload deixava "CARREGANDO MODELOS 3D…" eterno sobre o menu)
     LR5  as quatro regiões marcadas existem no `main.js` (a extração não silenciou)
     LR6  NENHUM uso de `game` depois de um `await` de `_startGame` fica sem guarda
          `lancamentoPerdeu` entre os dois -> é o que pega o await, ou a linha, que alguém
          acrescentar amanhã. Varredura em ordem, com estado: o await ARMA, a guarda DESARMA
     LR7  queda no meio do preload não constrói Game zumbi   (LR7b: antivacuidade — sem
          interrupção o Game nasce)
     LR8  o `catch` de um lançamento VELHO não derruba o que já assumiu, e não abre o modal
          de falha por cima dele — mas o relato SAI igual   (LR8b: antivacuidade — a abertura
          quebrada corrente volta pro menu E reporta, BUG-42)

   AS CLÁUSULAS 6, 7 E 8 SÃO DÍVIDA DE DUAS RODADAS DE CRÍTICA ADVERSARIAL, e é a parte mais
   útil deste cabeçalho para quem vier depois:

     1ª rodada · a LR6 lê TEXTO, e texto é cego. `if (lancamentoPerdeu(n) && false) return;`
       mantinha o token, matava o efeito, devolvia o Game zumbi e a régua ficava verde. Daí
       LR7/LR7b, que EXECUTAM a guarda do preload; o mutante `guardafalsa` ficou no arquivo
       para documentar a cegueira, não para consertá-la.
     1ª rodada · `soltarPartida()` no `catch` invalidava QUALQUER lançamento em voo, e o
       `catch` de uma abertura velha matava a partida nova. Daí LR8/LR8b.
     2ª rodada · a LR6 só olhava o PRIMEIRO uso de `game` depois de cada await: acrescentar
       `game._requestLock()` DEPOIS da guarda existente passava verde. Virou varredura com
       estado.
     2ª rodada · o `fail` do watchdog estava FORA da guarda do `catch`: o lançamento velho
       abria o modal irrecuperável ("TENTAR DE NOVO" recarrega a página) por cima da partida
       nova rodando bem, e ainda desarmava o watchdog dela. Daí o mutante `modalfora` e a
       contagem de modal na LR8.

   O QUE ELA NÃO ALCANÇA, e está medido: régua de REGIÃO não impede código acrescentado FORA
   dos marcadores. A LR6 cobre o corpo inteiro do `_startGame` contra uso de `game`, mas uma
   linha nova no `catch` do `startGame` (um `show('main-menu')`, um `soltarPartida()`) passa
   por ela. Quem cobre caminho automático para o menu é a PAUSA5 do `pause-check`.

   uso: node tools/eval/launch-race-check.mjs [--mutante=<nome>]
     semguarda    arranca a guarda da cauda: o código de alpha.261 de volta
                  -> LR1, LR2 e LR6; a LR1 reproduz a mensagem da issue
     sempreload   arranca a guarda do preload (o Game zumbi)         -> LR6 e LR7
     semepoca     `soltarPartida` não invalida mais o lançamento     -> LR1, LR4 e LR7
     semtela      `soltarPartida` não baixa mais a tela de loading   -> LR4 e LR8b
     guardafalsa  guarda com o token vivo e o efeito morto           -> LR1, LR2 e LR7
                  (LR6 fica VERDE de propósito: é a cegueira documentada acima)
     quedacega    o `catch` volta a limpar a tela sem perguntar de quem é o lançamento
                                                                     -> LR8
     modalfora    só o `fail` escapa da guarda do `catch`            -> LR8

   Nos sete mutantes a LR3 e a LR7b têm que continuar VERDES: são elas que impedem
   "consertar" a corrida desligando o lançamento.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['', 'semguarda', 'sempreload', 'semepoca', 'semtela', 'guardafalsa', 'quedacega', 'modalfora'];
if (!MUTANTES.includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
const MAIN = path.join(RAIZ, 'public/js/main.js');
const FONTE = fs.readFileSync(MAIN, 'utf8');

const falhas = [];
const linhas = [];
const ok = (c, t, d) => { linhas.push(`${c} · ${t}\n   ${d}\n   PASSA`); };
const nok = (c, t, d) => { falhas.push(c); linhas.push(`${c} · ${t}\n   ${d}\n   FALHA`); };

/* Região marcada, mesma mecânica do `launch-watchdog-check`: marcador explícito em vez de
   heurística de chaves, e a LR5 acende se o marcador sumir — senão a régua passaria medindo
   nada, que é a armadilha de vacuidade do `obb-check:28-31`. */
function regiao(rotulo) {
  const ini = FONTE.indexOf(`RÉGUA:${rotulo} início`);
  const fim = FONTE.indexOf(`RÉGUA:${rotulo} fim`);
  if (ini < 0 || fim < 0 || fim <= ini) return null;
  const dep = FONTE.indexOf('*' + '/', ini);
  return FONTE.slice(FONTE.indexOf('\n', dep) + 1, FONTE.lastIndexOf('\n', fim));
}

const SRC_ESTADO = regiao('launch-race');
const SRC_CAUDA = regiao('launch-race cauda');
const SRC_NASCIMENTO = regiao('launch-race nascimento');
const SRC_QUEDA = regiao('launch-race queda');

const REGIOES = { estado: SRC_ESTADO, cauda: SRC_CAUDA, nascimento: SRC_NASCIMENTO, queda: SRC_QUEDA };
const faltando = Object.entries(REGIOES).filter(([, v]) => !v).map(([k]) => k);
if (faltando.length) {
  nok('LR5', 'as quatro regiões marcadas existem no main.js', `SEM MARCADOR: ${faltando.join(', ')}`);
  console.log(`\n${linhas.join('\n\n')}\n`);
  console.log('demais cláusulas · não medidas: sem a região marcada a régua não lê o código de produção');
  console.log('\nREPROVA (launch-race-check)');
  process.exit(1);
}
ok('LR5', 'as quatro regiões marcadas existem no main.js',
  Object.entries(REGIOES).map(([k, v]) => `${k} ${v.split('\n').length}L`).join('   '));

const GUARDA_CAUDA = /\n[^\n]*if \(lancamentoPerdeu\(meuLancamento\)\) return;/;

/* Máscara para a LR6: apaga (preservando o comprimento, para as linhas continuarem batendo)
   comentário, literal de texto e CORPO DE FUNÇÃO ANINHADA. Sem a terceira, a régua acusava o
   `await preloadWeapons()` do callback de ocioso — que roda em outro lançamento e já tem a
   guarda dele (`window.__game === meuJogo`). É a lei 7: o defeito era da medição. */
function mascarar(src) {
  const out = src.split('');
  const apaga = (i, f) => { for (let k = i; k < f && k < out.length; k++) if (out[k] !== '\n') out[k] = ' '; };
  const pilha = [];   // uma entrada por `{` aberta; `true` = corpo de função
  let i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const f = src.indexOf('\n', i); apaga(i, f < 0 ? src.length : f); i = f < 0 ? src.length : f; continue; }
    if (c === '/' && d === '*') { const f = src.indexOf('*' + '/', i); apaga(i, f < 0 ? src.length : f + 2); i = f < 0 ? src.length : f + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let k = i + 1;
      while (k < src.length && src[k] !== c) k += src[k] === '\\' ? 2 : 1;
      apaga(i, k + 1); i = k + 1; continue;
    }
    if (c === '{') {
      const antes = src.slice(Math.max(0, i - 80), i);
      const funcao = /=>\s*$/.test(antes) || /\bfunction\b[^{;]*$/.test(antes);
      pilha.push(funcao);
      if (funcao && !pilha.slice(0, -1).includes(true)) {
        /* Só a função aninhada MAIS EXTERNA precisa ser apagada; o resto vem de graça. */
        let prof = 0, k = i;
        for (; k < src.length; k++) {
          if (src[k] === '{') prof++;
          else if (src[k] === '}' && --prof === 0) break;
        }
        apaga(i, k + 1);
        i = k + 1; pilha.pop(); continue;
      }
      i++; continue;
    }
    if (c === '}') { pilha.pop(); i++; continue; }
    i++;
  }
  return out.join('');
}

/* ------------------------------------------------------------------- o banco de testes */
/* `requestAnimationFrame` sob controle: é a única forma de interromper o lançamento
   EXATAMENTE entre os dois quadros, que é a janela do defeito. O relógio não interessa
   aqui — o que interessa é a ordem. */
function banco() {
  const chamadas = { start: 0, hideLoading: 0, requestLock: 0, dispose: 0, nasceu: 0, modal: 0 };
  const relatos = [];
  const eventos = [];
  let fila = [];

  const novoGame = (nome) => ({
    nome,
    start() { chamadas.start++; },
    dispose() { chamadas.dispose++; },
    _requestLock() { chamadas.requestLock++; },
  });

  const telas = [];
  const sandbox = {
    console: { log() {}, warn() {}, error: (m) => relatos.push(`console:${m}`) },
    Promise,
    String,
    Object,
    requestAnimationFrame(fn) { fila.push(fn); return fila.length; },
    hideLoading() { chamadas.hideLoading++; },
    testMode: false,
    $: () => ({ value: ' ruben ' }),
    nickEl: { value: 'ruben' },
    NICK_KEY: 'nick',
    localStorage: { setItem() {}, getItem: () => null },
    socials: [],
    getToken: () => null,
    getAnonId: () => 'anon',
    api: () => Promise.resolve(null),
    updateAvatarVisibility() {},
    renderPlayerPlate() {},
    va: (_tipo, ev) => eventos.push(ev),
    currentMap: 'upa_24h',
    matchMode: 'rounds',
    game: null,
    /* o nascimento: `Game` é contado, não simulado — o que a LR7 pergunta é SE ele nasce */
    Game: function Game(opcoes) {
      chamadas.nasceu++;
      this.opcoes = opcoes;
      this.start = () => { chamadas.start++; };
      this.dispose = () => { chamadas.dispose++; };
      this._requestLock = () => { chamadas.requestLock++; };
    },
    _lstat: { phase: null },
    renderer: null, textures: null, sfx: null, settings: { bots: 4 },
    TOUCH: false, makeNetcode: null,
    matchRounds: () => 5,
    recordMatchStats() {},
    trainingEnabled: () => false,
    sendTrainingFrames() {},
    /* a queda: `show` e `fail` são gravados porque a pergunta da LR8 é se o lançamento velho
       roubou a tela e abriu o modal irrecuperável por cima do novo */
    show: (id) => telas.push(id),
    __gameLaunch: { ready() {}, fail: (err) => { chamadas.modal++; relatos.push(`fail:${err && err.message}`); } },
    document: { pointerLockElement: null, fullscreenElement: null, exitPointerLock() {}, exitFullscreen: () => Promise.resolve() },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  let fonteEstado = SRC_ESTADO;
  if (MUT === 'semepoca') {
    /* MUTANTE: a soltura continua zerando `game`, mas não invalida o lançamento em voo —
       é o buraco que a comparação por identidade sozinha deixaria. */
    fonteEstado = fonteEstado.replace(/\n[^\n]*_lancamento\+\+;/, '');
  }
  if (MUT === 'semtela') {
    /* MUTANTE: soltar a partida deixa de baixar o loading. */
    fonteEstado = fonteEstado.replace(/\n[^\n]*hideLoading\(\);[^\n]*/, '');
  }
  /* `let`/`const` da região viram binding lexical do contexto, não propriedade do sandbox:
     a ponte explícita é o que deixa a régua chamar o código real de fora (mesma linha do
     `window.__gameLaunch = lancamento` do launch-watchdog-check). */
  vm.runInContext(`${fonteEstado}
    window.novoLancamento = novoLancamento;
    window.lancamentoPerdeu = lancamentoPerdeu;
    window.soltarPartida = soltarPartida;`, ctx);

  let fonteCauda = SRC_CAUDA;
  let fonteNasc = SRC_NASCIMENTO;
  let fonteQueda = SRC_QUEDA;
  if (MUT === 'semguarda') {
    /* MUTANTE: devolve a cauda de alpha.261 TAL E QUAL — só a guarda sai, nada é
       reordenado. Mutante que reordena não é o defeito: é outro bug. */
    fonteCauda = fonteCauda.replace(GUARDA_CAUDA, '');
  }
  if (MUT === 'sempreload') {
    /* MUTANTE: a guarda do preload some INTEIRA (a da cauda fica) — o Game zumbi nascendo
       depois da desconexão, sem nenhum TypeError para delatar. */
    fonteNasc = fonteNasc.replace(GUARDA_CAUDA, '');
  }
  if (MUT === 'guardafalsa') {
    /* MUTANTE DE CEGUEIRA DA PRÓPRIA RÉGUA: mantém o TOKEN da guarda e mata o efeito dela.
       A LR6, que é textual, fica VERDE — e é por isso que as guardas precisam de cláusula
       EXECUTÁVEL (LR1/LR2 na cauda, LR7 no nascimento). */
    fonteCauda = fonteCauda.replace(GUARDA_CAUDA, (m) => m.replace(')) return;', ') && false) return;'));
    fonteNasc = fonteNasc.replace(GUARDA_CAUDA, (m) => m.replace(')) return;', ') && false) return;'));
  }
  if (MUT === 'modalfora') {
    /* MUTANTE: o teardown continua condicional, mas o `fail` escapa da guarda — era assim
       que o conserto estava até o 2º crítico medir o estrago: modal irrecuperável ("TENTAR
       DE NOVO" recarrega a página) por cima da partida nova, que estava rodando bem. */
    const L = "      window.__gameLaunch?.fail(e, 'main.js:startGame');\n";
    fonteQueda = fonteQueda.replace(L, '')
      .replace(/^(\s*)\}$/m, (m) => `${m}\n    window.__gameLaunch?.fail(e, 'main.js:startGame');`);
  }
  if (MUT === 'quedacega') {
    /* MUTANTE: o catch volta a limpar a tela sem perguntar de quem é o lançamento. */
    fonteQueda = fonteQueda.replace('if (!lancamentoPerdeu(meuLancamento)) {', 'if (true) {');
  }
  vm.runInContext(`window.__cauda = async function (meuLancamento, team, charId) {\n${fonteCauda}\n};`, ctx);
  vm.runInContext(`window.__nascimento = function (meuLancamento, sessao, charId, side, faction, enemyFac, tamanhoTime, matchRoster, matchWeapons) {\n${fonteNasc}\n};`, ctx);
  vm.runInContext(`window.__queda = function (meuLancamento, e) {\n${fonteQueda}\n};`, ctx);

  const quadro = () => { const f = fila; fila = []; for (const fn of f) fn(); };

  return {
    chamadas,
    eventos,
    telas,
    relatos,
    novoGame,
    estado: sandbox,
    /* O lançamento inteiro visto da cauda: nasce o nº, nasce o Game, e `entre` roda no meio
       dos dois quadros — o instante exato em que a saída, a queda ou a remontagem chegam. */
    async lancar(entre) {
      const n = sandbox.novoLancamento();
      sandbox.game = novoGame('partida');
      sandbox.__game = sandbox.game;
      let erro = null;
      const p = sandbox.__cauda(n, 'E', 'ruben').catch((e) => { erro = e; });
      await Promise.resolve();
      quadro();
      if (entre) entre(sandbox, novoGame);
      quadro();
      await p;
      return erro;
    },
  };
}

/* LR1 — a linha literal das issues #608/#609. O jogador sai (ou o socket cai) entre os dois
   quadros; a cauda acorda com `game` nulo. */
{
  const b = banco();
  const erro = await b.lancar((s) => { s.soltarPartida(); });
  const d = `soltarPartida entre os 2 quadros   exceção ${erro ? `"${erro.message}"` : 'nenhuma'}`
    + `   _requestLock ${b.chamadas.requestLock}×`;
  if (!erro && b.chamadas.requestLock === 0) ok('LR1', 'saída entre os dois quadros não derruba o lançamento', d);
  else nok('LR1', 'saída entre os dois quadros não derruba o lançamento', d);
}

/* LR2 — remontagem (`onPartida`), que é o caminho do quadro de pilha das duas issues. O
   lançamento novo já tomou o nº e derrubou a partida velha, mas ainda está no preload: o
   `game` do módulo AINDA é o objeto da cauda velha. É aqui que comparar identidade falha. */
{
  const b = banco();
  const erro = await b.lancar((s) => {
    s.novoLancamento();          // o lançamento novo nasce…
    s.game.dispose();            // …derruba a partida velha…
    /* …e NÃO atribui `game` ainda: isso só acontece ao fim do preload dele, segundos
       depois. `game` continua sendo o objeto que a cauda velha conhece. */
  });
  const d = `remontagem entre os 2 quadros   exceção ${erro ? `"${erro.message}"` : 'nenhuma'}`
    + `   hideLoading ${b.chamadas.hideLoading}×   game_start ${b.eventos.length}   _requestLock ${b.chamadas.requestLock}×`;
  const certa = !erro && b.chamadas.hideLoading === 0 && b.eventos.length === 0 && b.chamadas.requestLock === 0;
  if (certa) ok('LR2', 'cauda velha não rouba a tela nem o funil do lançamento novo', d);
  else nok('LR2', 'cauda velha não rouba a tela nem o funil do lançamento novo', `${d}   esperado 0 em todos`);
}

/* LR3 — ANTIVACUIDADE, e ela tem que ficar VERDE nos quatro mutantes: é ela que impede
   "consertar" a corrida desarmando a cauda. Lançamento que ninguém interrompe entrega a
   partida inteira. */
{
  const b = banco();
  const erro = await b.lancar(null);
  const d = `start ${b.chamadas.start}×   hideLoading ${b.chamadas.hideLoading}×`
    + `   game_start ${b.eventos.filter((e) => e.name === 'game_start').length}   _requestLock ${b.chamadas.requestLock}×`
    + `   exceção ${erro ? `"${erro.message}"` : 'nenhuma'}`;
  const certa = !erro && b.chamadas.start === 1 && b.chamadas.hideLoading === 1
    && b.chamadas.requestLock === 1 && b.eventos.filter((e) => e.name === 'game_start').length === 1;
  if (certa) ok('LR3', 'lançamento sem interrupção entrega a partida (antivacuidade)', d);
  else nok('LR3', 'lançamento sem interrupção entrega a partida (antivacuidade)', `${d}   esperado 1× em cada`);
}

/* LR4 — `soltarPartida` é o dono das três coisas que soltar uma partida significa: o módulo
   esquece o Game, o lançamento em voo é invalidado, e a tela de loading morre com ela. A
   terceira é a que ninguém fazia: `show()` não mexe no overlay (main.js:319). */
{
  const b = banco();
  const n = b.estado.novoLancamento();
  b.estado.game = { nome: 'partida' };
  b.estado.__game = b.estado.game;
  b.estado.soltarPartida();
  const d = `game ${b.estado.game}   __game ${b.estado.__game}`
    + `   lançamento invalidado ${b.estado.lancamentoPerdeu(n)}   hideLoading ${b.chamadas.hideLoading}×`;
  const certa = b.estado.game === null && b.estado.__game === null
    && b.estado.lancamentoPerdeu(n) === true && b.chamadas.hideLoading === 1;
  if (certa) ok('LR4', 'soltar a partida invalida o lançamento e baixa a tela', d);
  else nok('LR4', 'soltar a partida invalida o lançamento e baixa a tela', `${d}   esperado null/null/true/1×`);
}

/* LR7 — o Game zumbi, e ela é EXECUTÁVEL de propósito: a guarda do preload tem que RETORNAR,
   não só existir no texto. Foi um crítico adversarial que achou o furo — com a LR6 sozinha,
   `if (lancamentoPerdeu(n) && false) return;` reintroduzia o zumbi com a régua 6/6 verde. É o
   mutante `guardafalsa`. */
{
  const b = banco();
  const n = b.estado.novoLancamento();
  b.estado.soltarPartida();     // a queda de socket chega no meio do preload
  b.estado.__nascimento(n, null, 'ruben', 'E', 'E', 'B', 4, { allyDefs: [], enemyDefs: [] }, []);
  const d = `queda no meio do preload   Game construído ${b.chamadas.nasceu}×   __game ${b.estado.__game}`;
  if (b.chamadas.nasceu === 0 && b.estado.__game === null) ok('LR7', 'lançamento perdido no preload não constrói Game zumbi', d);
  else nok('LR7', 'lançamento perdido no preload não constrói Game zumbi', `${d}   esperado 0× e null`);
}

/* LR7b — ANTIVACUIDADE da LR7: sem interrupção o Game nasce. Sem ela, `return` no topo do
   nascimento deixaria a LR7 verde com o jogo nunca abrindo. */
{
  const b = banco();
  const n = b.estado.novoLancamento();
  b.estado.__nascimento(n, null, 'ruben', 'E', 'E', 'B', 4, { allyDefs: [], enemyDefs: [] }, []);
  const d = `lançamento corrente   Game construído ${b.chamadas.nasceu}×   __game ${b.estado.__game ? 'atribuído' : 'null'}`;
  if (b.chamadas.nasceu === 1 && b.estado.__game) ok('LR7b', 'lançamento corrente constrói o Game (antivacuidade da LR7)', d);
  else nok('LR7b', 'lançamento corrente constrói o Game (antivacuidade da LR7)', `${d}   esperado 1× e atribuído`);
}

/* LR8 — o `catch` de um lançamento velho não derruba o novo. Outro achado do crítico: o
   `soltarPartida()` do catch invalidava QUALQUER lançamento em voo, e o `show('main-menu')`
   levava o jogador pro menu por causa de uma abertura que já tinha sido substituída. */
{
  const b = banco();
  const velho = b.estado.novoLancamento();
  const novo = b.estado.novoLancamento();        // outro `onPartida` chegou e assumiu
  b.estado.game = b.novoGame('partida-nova');
  b.estado.__game = b.estado.game;
  b.estado.__queda(velho, new Error('preload caiu'));   // a abertura VELHA falha agora
  const d = `lançamento velho ${velho} < corrente ${novo}   game ${b.estado.game ? b.estado.game.nome : 'null'}`
    + `   dispose ${b.chamadas.dispose}×   telas [${b.telas.join(',')}]   modal ${b.chamadas.modal}×`
    + `   relatos ${b.relatos.length}`;
  /* O modal de falha é irrecuperável (só "TENTAR DE NOVO", que recarrega): abri-lo por cima da
     partida que assumiu é pior que o crash original. Mas o RELATO tem que sair igual — é a
     disciplina do BUG-170, corta o modal e nunca a telemetria. */
  const certa = b.estado.game && b.estado.game.nome === 'partida-nova'
    && b.chamadas.dispose === 0 && !b.telas.includes('main-menu')
    && b.chamadas.modal === 0 && b.relatos.length === 1;
  if (certa) ok('LR8', 'catch de lançamento velho não derruba o que assumiu (e não abre o modal)', d);
  else nok('LR8', 'catch de lançamento velho não derruba o que assumiu (e não abre o modal)', `${d}   esperado partida-nova / 0× / sem main-menu / modal 0× / 1 relato`);
}

/* LR8b — ANTIVACUIDADE da LR8: a abertura que falha SENDO a corrente tem que limpar a tela e
   voltar pro menu, que é o BUG-42 sendo entregue ao modal. */
{
  const b = banco();
  const meu = b.estado.novoLancamento();
  b.estado.game = b.novoGame('partida-quebrada');
  b.estado.__game = b.estado.game;
  b.estado.__queda(meu, new Error('preload caiu'));
  const d = `lançamento corrente falhou   game ${b.estado.game}   dispose ${b.chamadas.dispose}×`
    + `   hideLoading ${b.chamadas.hideLoading}×   telas [${b.telas.join(',')}]   modal ${b.chamadas.modal}×`;
  const certa = b.estado.game === null && b.chamadas.dispose === 1
    && b.chamadas.hideLoading === 1 && b.telas.includes('main-menu') && b.chamadas.modal === 1;
  if (certa) ok('LR8b', 'abertura quebrada corrente volta pro menu e reporta (antivacuidade da LR8)', d);
  else nok('LR8b', 'abertura quebrada corrente volta pro menu e reporta (antivacuidade da LR8)', `${d}   esperado null / 1× / 1× / main-menu / modal 1×`);
}

/* LR6 — a cláusula que pega o await de AMANHÃ. Não basta as duas guardas de hoje estarem no
   lugar: a invariante é que, depois de cada `await` de `_startGame`, ninguém volte a tocar em
   `game` sem antes perguntar se o lançamento ainda é o corrente. Lê o USO, não a declaração —
   é o furo que deixou um mutante passar 20/22 VERDE (AGENTS.md, lei 3). */
{
  const ini = FONTE.indexOf('\nasync function _startGame(');
  const fim = FONTE.indexOf('\nfunction quitToMenu(', ini);
  let corpo = FONTE.slice(ini, fim);
  if (MUT === 'semguarda') {
    /* As duas guardas casam a mesma redação: aqui a mutação tem de pegar a DA CAUDA, senão
       ela arranca a do preload e a LR6 acusa o await errado. */
    const c = corpo.indexOf('RÉGUA:launch-race cauda início');
    corpo = corpo.slice(0, c) + corpo.slice(c).replace(GUARDA_CAUDA, '');
  }
  if (MUT === 'sempreload') {
    /* MUTANTE: só a guarda do preload sai — a do fim da cauda fica. É o Game zumbi nascendo
       depois da desconexão, sem nenhum TypeError para delatar. */
    corpo = corpo.replace(/\n[^\n]*if \(lancamentoPerdeu\(meuLancamento\)\) return;(?=[\s\S]*game = new Game)/, '');
  }
  /* `game` do módulo: exclui `window.__game`, `gameType` e afins. */
  const USO = /(?<![\w.$])game\b/g;
  /* A máscara começa DEPOIS da chave do próprio `_startGame`, senão ela lê o corpo da função
     inteiro como função aninhada e apaga tudo — a régua achava 0 await e passava verde. */
  const abre = corpo.indexOf('{');
  const visto = corpo.slice(0, abre + 1).replace(/[^\n]/g, ' ') + mascarar(corpo.slice(abre + 1));
  const awaits = [...visto.matchAll(/\bawait\b/g)].map((m) => m.index);
  /* Varredura em ORDEM, com estado — não "o primeiro uso depois de cada await". A versão
     que olhava só o primeiro ficava verde com um `game._requestLock()` acrescentado DEPOIS
     da guarda existente (achado do 2º crítico): o 1º uso estava protegido e todos os
     seguintes eram invisíveis. Aqui o `await` ARMA e a guarda DESARMA; qualquer `game`
     tocado com o gatilho armado é desprotegido. */
  const marcos = [
    ...awaits.map((i) => ({ i, tipo: 'await' })),
    ...[...visto.matchAll(/lancamentoPerdeu\(/g)].map((m) => ({ i: m.index, tipo: 'guarda' })),
    ...[...visto.matchAll(USO)].map((m) => ({ i: m.index, tipo: 'uso' })),
  ].sort((a, b) => a.i - b.i);
  const desprotegidos = [];
  let armado = null;
  for (const m of marcos) {
    if (m.tipo === 'await') { if (armado === null) armado = m.i; continue; }
    if (m.tipo === 'guarda') { armado = null; continue; }
    if (armado !== null) {
      const linha = FONTE.slice(0, ini + m.i).split('\n').length;
      desprotegidos.push(`${linha}: ${visto.slice(m.i, m.i + 44).split('\n')[0].trim()}`);
    }
  }
  const d = `${awaits.length} await de lançamento no _startGame   uso de \`game\` depois de await sem guarda: `
    + (desprotegidos.length ? desprotegidos.join(' | ') : 'nenhum');
  /* Piso de 3 await: é a antivacuidade da própria máscara. Se ela apagar demais (já apagou o
     corpo inteiro numa volta desta régua), a LR6 acende em vez de passar medindo nada. */
  if (!desprotegidos.length && awaits.length >= 3) ok('LR6', 'nenhum uso de `game` depois de await fica sem guarda', d);
  else nok('LR6', 'nenhum uso de `game` depois de await fica sem guarda', `${d}   (piso: 3 await)`);
}

console.log(`\n${linhas.join('\n\n')}\n`);
if (MUT) console.log(`mutante aplicado: --mutante=${MUT}\n`);
console.log(falhas.length === 0
  ? 'PASSA (launch-race-check) — 10/10 cláusulas'
  : `REPROVA (launch-race-check) — ${falhas.join(', ')}`);
process.exit(falhas.length === 0 ? 0 : 1);
