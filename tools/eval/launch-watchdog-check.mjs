/* LAUNCH-WATCHDOG-CHECK — o watchdog de lançamento não acusa travamento de partida ABERTA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Defeito em produção, `2.0.0-alpha.250`, 40 ocorrências em 13/09 no índice `js_error`:

     Falha ao abrir partida: tempo limite ao abrir partida      source: launch-watchdog
     últimas ações
       00:39:38 clique #mp-quick
       00:39:54 ops live em 35935ms mapa=upa_24h modo=rounds      <<<  A PARTIDA ABRIU
       00:39:56 ops congelou 1576ms
       00:46:10 ops contexto WebGL perdido                        <<<  7 MINUTOS DEPOIS

   O MESMO relatório que diz "tempo limite ao abrir" carrega a migalha de que a partida
   abriu em 35,9 s e que o jogador seguiu nela por mais de seis minutos. Um tempo limite
   de abertura não pode ser verdade numa sessão que já registrou `live`.

   SÃO DOIS DEFEITOS NO MESMO LAÇO, e os dois nascem da mesma confusão: o watchdog mede
   o tempo com `setTimeout` e mede o sucesso com estado movido pelo `requestAnimationFrame`.

     (1) RELÓGIO QUE CORRE COM A ABA NO FUNDO. `setTimeout` dispara na aba oculta; o
         `rAF` PARA. Quem abre o jogo e troca de aba durante os ~36 s de carga volta
         para a tela amigável de falha: o relógio andou os 60 s, o jogo não andou um
         quadro, e o watchdog leu o congelamento do rAF como travamento.

     (2) PREDICADO DE VIVACIDADE USADO COMO PREDICADO DE CONCLUSÃO. O teste era
         `state === 'live'`, e `live` é só UM dos estados de partida aberta: o motor
         passa por `countdown` (game.js:2255) e `roundEnd` (game.js:4548, 4 s por rodada)
         a cada troca de rodada. Com a renovação de rede lenta (#241) o watchdog
         sobrevive ao lançamento e continua perguntando de minuto em minuto — basta um
         tique cair numa transição de rodada para ele acusar "tempo limite ao abrir" numa
         partida que o jogador está jogando. É esse cruzamento que explica as 40 linhas:
         no MP o servidor gira o mapa (net.js:175 -> main.js `onPartida` ->
         `mpMontarPartida` -> `startGame`), o lançamento é REARMADO no meio da sessão, e
         aí o tique encontra o jogo fora de `live`.

   O QUE FOI DESCARTADO COM MEDIÇÃO, NÃO COM PALPITE

     - "o teto de 60 s é curto para rede lenta": não. A migalha diz `live em 35935ms`,
       dentro do teto, e a renovação de #241 já cobre rede lenta com progresso. Subir o
       teto não teria mudado uma linha destas 40.
     - "é a perda de contexto WebGL que falha": não. Esse caminho tem mensagem própria
       (`contexto WebGL perdido`, main.js:135) e fingerprint próprio. A mensagem destas
       40 é a do watchdog, index.astro.

   O QUE ESTA RÉGUA MEDE, E COMO

   Ela não simula um watchdog parecido: ela EXTRAI o `lancamento` real do
   `src/pages/index.astro` e o predicado real do `public/js/main.js` (as duas regiões
   marcadas com `RÉGUA:launch-watchdog`) e roda esse código num `vm` com relógio falso.
   Se alguém mexer no laço sem mexer aqui, a régua lê o código novo — não uma cópia.

   CLÁUSULAS
     LW1  aba oculta durante a carga NÃO gera falha de lançamento (renova)
     LW2  transição de rodada (`countdown`/`roundEnd`) NÃO gera falha de lançamento
     LW3  travamento DE VERDADE (aba visível, zero quadro, zero progresso) AINDA falha
          -> é a cláusula antivacuidade: sem ela bastaria desarmar o watchdog p/ ficar verde
     LW4  a SESSÃO do relatório: 7 min de partida aberta, renovada por asset pingando,
          com a última renovação caindo numa troca de rodada -> nenhuma falha
     LW5  as duas regiões marcadas existem nos dois arquivos (a extração não silenciou)
     LW6  aba que ocultou e VOLTOU volta a poder falhar -> antivacuidade da LW1: a renovação
          é de graça uma vez por EPISÓDIO de ocultação, não de graça para sempre

   uso: node tools/eval/launch-watchdog-check.mjs [--mutante=<nome>]
     sovivo     predicado volta a ser `state === 'live'`, na ORDEM original
                (rede lenta primeiro) -> LW2 e LW4 vermelhas
     semoculto  tique ignora a aba oculta                       -> LW1 vermelha
     semconsumo latch de ocultação nunca é consumido no begin   -> LW6 vermelha

   Nas três mutações a LW3 tem que continuar VERDE: é ela que prova que a régua mede o
   falso positivo sem desligar a detecção de travamento real.
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
const ok = (c, t, d) => { linhas.push(`${c} · ${t}\n   ${d}\n   ${'PASSA'}`); };
const nok = (c, t, d) => { falhas.push(c); linhas.push(`${c} · ${t}\n   ${d}\n   FALHA`); };

/* Região marcada: `/* RÉGUA:launch-watchdog início *\/` ... `/* RÉGUA:launch-watchdog fim *\/`.
   Marcador explícito e não heurística de chaves: quando o bloco mudar de forma, a régua
   continua achando a região — e se o marcador sumir, a LW5 acende em vez de a régua passar
   medindo nada (é a armadilha de vacuidade do obb-check:28-31). */
function regiao(arquivo, rotulo) {
  const src = fs.readFileSync(arquivo, 'utf8');
  const ini = src.indexOf(`RÉGUA:${rotulo} início`);
  const fim = src.indexOf(`RÉGUA:${rotulo} fim`);
  if (ini < 0 || fim < 0 || fim <= ini) return null;
  // O marcador de início mora DENTRO de um comentário de bloco (de várias linhas): a região
  // começa depois do fecho dele, senão a sobra do comentário entra no `vm` como código.
  const dep = src.indexOf('*' + '/', ini);
  return src.slice(src.indexOf('\n', dep) + 1, src.lastIndexOf('\n', fim));
}

const SRC_LANC = regiao(ASTRO, 'launch-watchdog');
const SRC_PRED = regiao(MAIN, 'launch-watchdog');

if (!SRC_LANC || !SRC_PRED) {
  nok('LW5', 'as duas regiões marcadas existem nos dois arquivos',
    `index.astro ${SRC_LANC ? 'ok' : 'SEM MARCADOR'}   main.js ${SRC_PRED ? 'ok' : 'SEM MARCADOR'}`);
  console.log(`\n${linhas.join('\n\n')}\n`);
  console.log('LW1–LW4 · não medidas: sem a região marcada a régua não lê o código de produção');
  console.log('\nREPROVA (launch-watchdog-check)');
  process.exit(1);
}
ok('LW5', 'as duas regiões marcadas existem nos dois arquivos',
  `index.astro ${SRC_LANC.split('\n').length} linhas   main.js ${SRC_PRED.split('\n').length} linhas`);

/* ---------------------------------------------------------------- o banco de testes */
/* Relógio falso: `setTimeout` do watchdog sob controle, para poder avançar 60 s sem
   esperar 60 s — e, principalmente, para poder avançar o relógio SEM avançar o rAF, que
   é exatamente a assimetria que produziu o defeito. */
function banco({ oculta = false, predicado = SRC_PRED, mutante = MUT } = {}) {
  let agora = 0;
  let seq = 0;
  const timers = new Map();
  const falhasVistas = [];
  const jogo = { state: 'boot', time: 0 };
  const estado = { oculto: oculta, lstat: { loaded: 0 }, ouvintes: [] };

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout(fn, ms) { const id = ++seq; timers.set(id, { t: agora + (ms || 0), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    Error,
    String,
    Date,
    document: {
      get visibilityState() { return estado.oculto ? 'hidden' : 'visible'; },
      get hidden() { return estado.oculto; },
      getElementById: () => null,
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

  let fontePred = predicado;
  if (mutante === 'sovivo') {
    /* MUTANTE: devolve o defeito (2) TAL E QUAL ele era em alpha.250 — tira a prova de
       quadro e devolve a vivacidade no fim, NA ORDEM ORIGINAL (a renovação de rede lenta
       vinha primeiro). Mutante que reordena não é o defeito: é outro bug. */
    fontePred = fontePred.replace(/ {4}if \(g && g\.time > 0\) return true;\n/, '')
      .replace(/ {4}return false;\n/, "    return !!(g && g.state === 'live');\n");
  }
  /* o parâmetro se chama `_lstat` de propósito: a região extraída do main.js lê
     `_lstat.loaded` e tem de continuar lendo o mesmo nome, sem reescrita. */
  vm.runInContext(`window.__arma = function(_lstat){\n${fontePred}\n};`, ctx);

  return {
    arma() { sandbox.__arma(estado.lstat); },
    ocultar(v) {
      estado.oculto = v;
      for (const o of estado.ouvintes) if (o.tipo === 'visibilitychange') o.fn();
    },
    /* um quadro real: só isto move `time`, e no browser só o rAF chama o update() */
    quadro(dt = 0.016) { jogo.time += dt; },
    estadoDoJogo(s) { jogo.state = s; },
    carrega(n) { estado.lstat.loaded += n; },
    avanca(ms) {
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
    },
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
   countdown -> live -> roundEnd. Foi essa cadeia, e não um tique isolado, que produziu as
   40 linhas: é ela que mantém o watchdog vivo tempo suficiente para cair numa transição.
   O `ready()` NÃO é chamado aqui de propósito — no relatório real o lançamento seguia
   armado sete minutos depois do clique em `#mp-quick`. */
{
  const b = banco();
  b.arma();
  b.estadoDoJogo('countdown');
  /* O MECANISMO exato, e é ele que mantinha o watchdog vivo: o predicado antigo perguntava
     pela rede lenta ANTES de perguntar pelo estado, então todo tique com asset chegando
     renovava sem nem olhar o jogo. Seis renovações assim, e no sétimo tique — o único sem
     asset novo — o jogo estava numa troca de rodada. */
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
  /* Três tetos com a aba à frente. MEDIDO: o primeiro deles ainda renova, porque o latch
     que a renovação anterior gravou foi lido quando a aba AINDA estava oculta — ou seja, ao
     voltar o jogo ganha uma janela inteira e limpa de 60 s antes de ser julgado, que é o
     comportamento desejado. O que a cláusula cobra é que a falha VOLTE a ser possível. */
  b.avanca(180_000);
  const d = `oculta 60 s, volta, 180 s à frente sem um quadro   falhas ${b.falhas.length}`;
  const certa = b.falhas.length === 1 && /tempo limite ao abrir partida/.test(b.falhas[0].msg);
  if (certa) ok('LW6', 'aba que ocultou e VOLTOU volta a poder falhar (antivacuidade da LW1)', d);
  else nok('LW6', 'aba que ocultou e VOLTOU volta a poder falhar (antivacuidade da LW1)', `${d}   esperado 1`);
}

console.log(`\n${linhas.join('\n\n')}\n`);
if (MUT) console.log(`mutante aplicado: --mutante=${MUT}\n`);
console.log(falhas.length === 0
  ? 'PASSA (launch-watchdog-check) — 6/6 cláusulas'
  : `REPROVA (launch-watchdog-check) — ${falhas.join(', ')}`);
process.exit(falhas.length === 0 ? 0 : 1);
