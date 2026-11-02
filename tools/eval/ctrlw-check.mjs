/* CTRLW-CHECK — agachar andando pra frente não pode fechar a aba.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTA RÉGUA (relato do Daniel Diniz, 07/08, no LinkedIn)

     *"quando fica muito tempo com a tecla Control pressionada a página fecha"*
     *"Testei no Windows... Não acontece no Mac 🤔... testei em outros Browser e tem o
       mesmo problema. É alguma treta do Windows mesmo"*

   E não é treta do Windows: é o jogo. Agachar é `ControlLeft`/`ControlRight`
   (`game.js`, `wantCrouch`) e andar pra frente é `W`. **Agachar andando pra frente É
   Ctrl+W**, que no Windows e no Linux fecha a aba. No Mac o atalho é Cmd+W — por isso o
   dono, que joga no Mac, nunca viu. Mesma família: Ctrl+1/2/3 troca de aba do navegador,
   e 1/2/3 é a troca de arma.

   O `preventDefault` que já existia no `_kd` NÃO alcança: Ctrl+W é atalho RESERVADO e a
   página não consegue cancelar. O comentário do código registrava a derrota há tempos
   ("Ctrl+W o Chrome não deixa prevenir, use C pra agachar") — dizer ao jogador pra não
   usar a tecla padrão de FPS não é conserto, é aviso.

   O QUE MEDE, CLÁUSULA POR CLÁUSULA

     CW1 · a trava ARMA ao entrar na partida: `requestFullscreen` é pedido e
           `navigator.keyboard.lock()` é chamado com uma lista que inclui `KeyW` e os
           dígitos de troca de arma. (Keyboard Lock é a única API que captura Ctrl+W, e
           ela só funciona em tela cheia — por isso a tela cheia é parte do conserto e
           não enfeite.)
     CW2 · com partida VIVA, o `beforeunload` pede confirmação. É a segunda camada, a que
           cobre Firefox, Safari e todo caso em que a tela cheia não pegou.
     CW3 · NO MENU o `beforeunload` fica CALADO. Esta é a cláusula que protege o conserto
           de si mesmo: confirmação que aparece sempre vira praga, e praga alguém arranca
           inteira em duas semanas — levando o conserto junto.
     CW4 · o método de produção `_travaAtalhos` chama mesmo `keyboard.lock`, e com quais
           teclas (node puro, sem navegador).
     CW5 · a trava REARMA depois de perder a tela cheia. Escape sai da tela cheia e Escape
           é como se abre o menu de pausa: sem rearme, a primeira pausa da partida
           desligava a proteção até o fim dela, em silêncio. CW1 passava verde por cima
           desse buraco, porque só olhava o começo da partida.
     CW6 · o portão `emPartida()` percorrido estado por estado (live/countdown/roundEnd
           ligam; matchEnd/boot/warmup desligam). CW2 e CW3 mediam só duas pontas, e entre
           elas cabia o predicado inteiro.
     CW7 · o que o NAVEGADOR faz, não o que o nosso handler decidiu — ver o bloco da CW7
           no corpo do arquivo: no menu a saída conclui; em partida ela é BARRADA.

   O QUE O ARNÊS FORNECE, E ISSO PRECISA ESTAR ÀS CLARAS
     Chrome headless não concede tela cheia de verdade e pode não expor `navigator.keyboard`.
     O arnês então SIMULA O AMBIENTE: `requestFullscreen` resolve e `document.fullscreenElement`
     passa a responder, e `navigator.keyboard.lock` existe e grava a chamada. O que está
     sob teste nas CW1/CW4/CW5 é o CÓDIGO DO JOGO — não a capacidade do navegador headless.
     A CW7 é a exceção e por isso existe: ali nada é plantado, quem responde é o Chrome.

     O QUE ESTA RÉGUA NÃO PODE PROVAR, E NÃO FINJA QUE PROVA: que o Ctrl+W do Windows
     parou de fechar a aba. Ctrl+W é atalho RESERVADO — `preventDefault` em `keydown` não
     o alcança em Chrome nem em Firefox, e nenhuma régua consegue sintetizar o atalho do
     sistema hospedeiro (entrada injetada por CDP entra no renderer, não no navegador).
     A única API que o captura é a Keyboard Lock, que é Chromium + tela cheia. Em Firefox,
     Safari e fora da tela cheia a camada que sobra é a CONFIRMAÇÃO da CW7 — que não impede
     o fechamento, só pergunta antes. Confirmação no Windows real = tarefa manual.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (em memória, o disco não é tocado)
     --mutante=semlock       tira a chamada de `_travaAtalhos()` do `_requestLock` -> CW1
     --mutante=semprompt     tira o `preventDefault` do `beforeunload`             -> CW2/CW7b
     --mutante=promptsempre  arma a confirmação SEM olhar se tem partida           -> CW3/CW7a
     --mutante=semtravar     troca `_travaAtalhos` por um no-op no objeto bootado  -> CW4
     --mutante=semrearme     devolve o `_travaAtalhos` que não repedia a tela cheia-> CW5
     --mutante=estadoamplo   deixa `matchEnd` e `boot` entrarem no `emPartida()`   -> CW6

   USO
     node tools/eval/ctrlw-check.mjs
     node tools/eval/ctrlw-check.mjs --mutante=semlock
     BASE=https://www.csbrasil.online node tools/eval/ctrlw-check.mjs
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const PORTA = Number(val('porta', 4322));
const PACIENCIA = Number(val('paciencia', 420000));   // por passo do menu — ver o comentário no laço
const EXTERNO = !!process.env.BASE;
const BASE = process.env.BASE || `http://localhost:${PORTA}`;

let subiuAqui = false;
async function noAr() {
  const fim = Date.now() + 90_000;
  while (Date.now() < fim) {
    try { const r = await fetch(BASE + '/robots.txt'); if (r.status) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}
async function sobeServidor() {
  if (EXTERNO) return true;
  try { if ((await fetch(BASE + '/robots.txt')).status) return true; } catch { /* não estava no ar */ }
  spawn('npx', ['astro', 'dev', '--port', String(PORTA)], { stdio: 'ignore', detached: false }).on('error', () => {});
  subiuAqui = true;
  return noAr();
}
function derrubaServidor() { if (subiuAqui) spawnSync('npx', ['astro', 'dev', 'stop'], { stdio: 'ignore' }); }

const falhas = [];

/* ═══ CW4 · A TRAVA CHAMA A API COM AS TECLAS CERTAS (node puro, sem navegador) ═══
   Esta cláusula existe porque o caminho de navegador é caro e frágil nesta máquina (o `/`
   em dev leva minutos pra compilar, o preload do elenco derruba o renderer headless), e
   sem ela a pergunta mais direta — *`_travaAtalhos` chama mesmo `keyboard.lock`, e com
   quais teclas?* — ficava sem resposta enquanto CW1 não rodasse. Aqui a classe `Game` real
   sobe em node pelo `harness.mjs`, com `document.fullscreenElement` e `navigator.keyboard`
   plantados, e o método de produção é chamado direto. Não prova o fluxo do `startGame`
   (isso é a CW1); prova o contrato da trava.
     --mutante=semtravar  troca `_travaAtalhos` por um no-op no objeto bootado -> CW4 */
{
  const { bootGame, MAPS, initTextures } = await import('./harness.mjs');
  const g = bootGame(Object.keys(MAPS)[0], { textures: initTextures(), ctf: false, seed: 4242 });
  g.testMode = false;                                   // bootGame liga testMode; a trava sai cedo com ele
  const pedidas = [];
  const alvo = { nada: 1 };
  Object.defineProperty(globalThis.document, 'fullscreenElement', { get: () => alvo, configurable: true });
  /* `globalThis.navigator` é somente-leitura no Node 22 — atribuir direto lança. Tem que
     ser defineProperty, e o `keyboard` vai junto no objeto novo. */
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { ...(globalThis.navigator || {}), keyboard: { lock: (ks) => { pedidas.push(...(ks || [])); return Promise.resolve(); }, unlock() {} } },
  });
  if (MUTANTE === 'semtravar') g._travaAtalhos = () => {};
  g._travaAtalhos();
  const precisa = ['KeyW', 'Digit1', 'Digit2', 'Digit3'];
  const faltam = precisa.filter((k) => !pedidas.includes(k));
  const cw4 = pedidas.length > 0 && faltam.length === 0;
  if (!cw4) falhas.push(`CW4 · \`_travaAtalhos\` não pediu a trava das teclas certas (pediu ${JSON.stringify(pedidas)}, faltam ${JSON.stringify(faltam)}) — Ctrl+W e Ctrl+1/2/3 continuam com o navegador`);
  console.log('CW4 · o método de produção chama keyboard.lock com KeyW e os dígitos (node puro)');
  console.log(`   teclas pedidas: ${JSON.stringify(pedidas)}`);
  console.log(`   ${cw4 ? 'PASSA' : 'FALHA'}\n`);
}

/* ═══ CW5 · TELA CHEIA PERDIDA NO MEIO DA PARTIDA TEM DE SER REPEDIDA (node puro) ═══
   A CW1 mede o ARMAR, no começo da partida, e passava verde enquanto o defeito desta
   cláusula estava solto: a tela cheia é pedida UMA vez, no `startGame`, e **Escape sai da
   tela cheia**. Escape é exatamente como o jogador abre o menu de pausa (e está fora da
   lista travada de propósito, senão sair da tela cheia viraria toque longo). Ou seja: o
   caminho mais trivial da partida — pausar e voltar — derrubava a tela cheia, e o
   `_travaAtalhos` do RETOMAR então caía fora no `return` sem fazer nada. Da primeira pausa
   em diante o jogador seguia a partida inteira com Ctrl+W solto, e nada na tela dizia
   isso. O comentário do `setPaused` afirmava "o `_requestLock` do RETOMAR rearma" — a
   afirmação era falsa e ninguém tinha medido.
   Aqui o estado é montado à mão: partida viva, não pausada, SEM tela cheia. A pergunta é
   uma só — o método repede a tela cheia e, quando ela vem, trava as teclas?
     --mutante=semrearme  devolve o `_travaAtalhos` de antes (sai fora sem tela cheia) -> CW5 */
{
  const { bootGame, MAPS, initTextures } = await import('./harness.mjs');
  const g = bootGame(Object.keys(MAPS)[0], { textures: initTextures(), ctf: false, seed: 4242 });
  g.testMode = false;
  g.state = 'live';
  g.paused = false;
  const pedidas = [];
  // começa COM tela cheia: é assim que a partida de verdade começa (o `startGame` pediu)
  let fsEl = globalThis.document.documentElement, pedidosDeFs = 0;
  Object.defineProperty(globalThis.document, 'fullscreenElement', { get: () => fsEl, configurable: true });
  globalThis.document.documentElement.requestFullscreen = () => {
    pedidosDeFs++; fsEl = globalThis.document.documentElement; return Promise.resolve();
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { ...(globalThis.navigator || {}), keyboard: { lock: (ks) => { pedidas.push(...(ks || [])); return Promise.resolve(); }, unlock() {} } },
  });
  /* O mutante é o código ANTIGO, letra por letra: é ele que esta cláusula tem de reprovar.
     Mutante que não reproduz o defeito original não valida régua nenhuma. */
  if (MUTANTE === 'semrearme') {
    g._travaAtalhos = function () {
      if (this.testMode || !globalThis.document.fullscreenElement) return;
      try { globalThis.navigator.keyboard?.lock?.(['KeyW', 'Digit1', 'Digit2', 'Digit3']); } catch {}
    };
  }
  /* A SEQUÊNCIA É A DA PARTIDA DE VERDADE, nesta ordem, e a ordem é o teste:
       1. entra na partida COM tela cheia  -> arma (é a CW1 em miniatura)
       2. Escape: a tela cheia cai          -> `_soltaAtalhos`, como no `setPaused(true)`
       3. RETOMAR                           -> tem de repedir a tela cheia e rearmar
     Medir só o passo 3 isolado seria mais frouxo que o código: o método só repede tela
     cheia que ELE já teve, justamente para não brigar com o pedido em voo do `startGame`. */
  g._travaAtalhos();                                   // 1
  const armouNoComeco = pedidas.length > 0;
  pedidas.length = 0;
  fsEl = null;                                         // 2 — Escape derrubou a tela cheia
  g._soltaAtalhos();
  g._travaAtalhos();                                   // 3
  await new Promise((r) => setTimeout(r, 0));          // o lock vem no `then` da tela cheia
  const precisa5 = ['KeyW', 'Digit1', 'Digit2', 'Digit3'];
  const faltam5 = precisa5.filter((k) => !pedidas.includes(k));
  const cw5 = armouNoComeco && pedidosDeFs === 1 && faltam5.length === 0;
  if (!cw5) falhas.push(`CW5 · depois de perder a tela cheia o \`_travaAtalhos\` não rearma (armou no começo ${armouNoComeco}, requestFullscreen ${pedidosDeFs}×, teclas ${JSON.stringify(pedidas)}) — da primeira pausa com Escape em diante, Ctrl+W volta a fechar a aba pelo resto da partida`);
  console.log('CW5 · perdida a tela cheia (Escape), o RETOMAR repede e rearma a trava');
  console.log(`   armou ao entrar: ${armouNoComeco}   requestFullscreen depois: ${pedidosDeFs}×   teclas rearmadas: ${JSON.stringify(pedidas)}`);
  console.log(`   ${cw5 ? 'PASSA' : 'FALHA'}\n`);
}

let browser;
try {
  if (!(await sobeServidor())) {
    console.error(`✗ CTRLW0  o site não subiu em ${BASE} (90 s de espera)`);
    process.exit(1);
  }
  const gRoot = execSync('npm root -g').toString().trim();
  const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = _pw.chromium || _pw.default?.chromium;
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    /* AS TRÊS FLAGS DE THROTTLING NÃO SÃO ENFEITE. Sem elas o Chrome trata a página
       headless como plano de fundo e praticamente para o `requestAnimationFrame` — e o
       `startGame` do main.js espera DOIS rAF antes de `hideLoading()` e do
       `_requestLock()`. Resultado medido: o jogo chegava a `countdown`, o overlay de
       loading nunca sumia, a trava nunca era chamada, e a régua acusava o conserto de não
       armar algo que o `startGame` ainda nem tinha alcançado. Defeito de INSTRUMENTO, e
       do tipo que acusa código inocente. */
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  /* ── O ARNÊS: tela cheia e Keyboard Lock que o headless não tem ───────────────── */
  await page.addInitScript(() => {
    window.__ctrlw = { fullscreen: 0, locks: [], unlocks: 0 };
    let fsEl = null;
    Object.defineProperty(document, 'fullscreenElement', { get: () => fsEl, configurable: true });
    Element.prototype.requestFullscreen = function () { window.__ctrlw.fullscreen++; fsEl = this; return Promise.resolve(); };
    document.exitFullscreen = function () { fsEl = null; return Promise.resolve(); };
    Object.defineProperty(navigator, 'keyboard', {
      configurable: true,
      value: {
        lock: (ks) => { window.__ctrlw.locks.push(ks || []); return Promise.resolve(); },
        unlock: () => { window.__ctrlw.unlocks++; },
      },
    });
  });

  /* ── AS MUTAÇÕES, em memória (o arquivo em disco não é tocado) ──────────────────
     `aplicou` NÃO É ZELO. Mutação que não casa o texto e segue em frente devolve VERDE, e
     esse verde é lido como "o guarda funciona" — foi assim que um mutante de licença
     plantou `**MIT License**` com um replace que não casava e o check passou. Aqui, se o
     texto procurado não estiver no arquivo servido (alguém reformatou a linha, por
     exemplo), a régua morre na hora dizendo o quê não casou.

     CASAR UMA VEZ NÃO BASTA — TEM DE CASAR EXATAMENTE UMA. Medido hoje, e doeu: o mutante
     `estadoamplo` procurava `['live', 'roundEnd', 'countdown'].includes(game.state)`, que
     aparece DUAS vezes no `main.js` (uma no retorno do `emPartida()`, linha 3572, outra
     num `show('main-menu')` na 2707). `String.replace` com texto troca só a PRIMEIRA — a
     mutação caiu na ocorrência errada, o `emPartida()` ficou intacto, `aplicou.ok` deu
     verdadeiro e a régua inteira fechou VERDE com o mutante "aplicado". Um mutante que não
     muta é pior que mutante nenhum: ele certifica uma cláusula que nunca foi exercitada.
     Agora a contagem é parte do contrato, e 2 ocorrências mata a corrida igual a 0. */
  const aplicou = { ok: false, alvo: '', vezes: -1, usaRota: false };
  const troca = (glob, de, para) => {
    aplicou.alvo = de;
    aplicou.usaRota = true;
    return page.route(glob, async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      const vezes = corpo.split(de).length - 1;
      if (vezes >= 0) aplicou.vezes = Math.max(aplicou.vezes, vezes);
      if (vezes === 1) aplicou.ok = true;
      await rota.fulfill({ status: 200, contentType: 'application/javascript', body: vezes === 1 ? corpo.replace(de, para) : corpo });
    });
  };
  if (MUTANTE === 'semlock') await troca('**/js/game.js*', 'this._travaAtalhos();', '/* mutante */');
  if (MUTANTE === 'semprompt') await troca('**/js/main.js*', 'if (emPartida()) { e.preventDefault(); e.returnValue = \'\'; }', '/* mutante */');
  if (MUTANTE === 'promptsempre') await troca('**/js/main.js*', 'if (emPartida()) { e.preventDefault();', 'if (true) { e.preventDefault();');
  /* O `return` inteiro, e não só o `includes`: é o que torna o alvo ÚNICO no arquivo.
     Sem ele a troca caía na linha 2707 e o `emPartida()` saía ileso — ver o comentário
     da contagem acima. */
  if (MUTANTE === 'estadoamplo') await troca('**/js/main.js*', "return !!game && !testMode && ['live', 'roundEnd', 'countdown'].includes(game.state);", "return !!game && !testMode && ['live', 'roundEnd', 'countdown', 'matchEnd', 'boot'].includes(game.state);");

  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3500);

  console.log(`RÉGUA DO CTRL+W${MUTANTE ? `   [MUTAÇÃO: ${MUTANTE}]` : ''}   alvo ${BASE}\n`);
  /* IMPRIME A MENSAGEM, não a contagem. "4 pageerror" mandou investigar às cegas uma vez;
     o texto do erro diz na hora se é o jogo, o arnês ou asset que falta nesta máquina. */
  if (erros.length) { console.log(`   AVISO · ${erros.length} pageerror no boot:`); for (const e of erros) console.log(`     ${e}`); console.log(''); }

  /* `usaRota` separa dois tipos de mutante: os que reescrevem o arquivo servido (estes, que
     precisam casar) e os de node puro — `semtravar`/`semrearme` — que trocam o método no
     objeto bootado lá em cima e nunca registram rota. Sem essa distinção a régua matava a
     corrida dos dois últimos com "MUTANTE NÃO APLICOU", escondendo o veredito que as
     CW4/CW5 já tinham imprimido corretamente. */
  if (MUTANTE && aplicou.usaRota && !aplicou.ok) {
    const motivo = aplicou.vezes === 0 || aplicou.vezes === -1
      ? 'o texto procurado NÃO ESTÁ no arquivo servido'
      : `o texto procurado aparece ${aplicou.vezes}× no arquivo servido — ambíguo, e \`replace\` trocaria só a primeira`;
    console.error(`✗ CTRLW0  MUTANTE NÃO APLICOU — ${motivo}:\n   ${aplicou.alvo}`);
    console.error('   A régua NÃO foi validada. Verde daqui seria mentira: ajuste o trecho procurado.');
    await browser.close(); browser = null;
    derrubaServidor();
    process.exit(1);
  }

  /* ── CW3 · NO MENU, SILÊNCIO ──────────────────────────────────────────────────
     Medida ANTES de começar a partida, que é o estado de menu mais limpo que existe.
     `dispatchEvent` de um beforeunload cancelável e a pergunta é: alguém cancelou? */
  const sonda = () => page.evaluate(() => {
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  const noMenu = await sonda();
  const cw3 = noMenu === false;
  if (!cw3) falhas.push('CW3 · o beforeunload pede confirmação NO MENU — quem quer só fechar a aba é impedido, e uma confirmação que aparece sempre é arrancada inteira depois');
  console.log('CW3 · no menu o beforeunload fica calado');
  console.log(`   confirmação no menu: ${noMenu}   ${cw3 ? 'PASSA' : 'FALHA'}\n`);

  /* ── CW7 · O QUE O NAVEGADOR DE VERDADE FAZ (não o que o nosso handler decidiu) ──
     A CW3/CW2 medem o CÓDIGO: `beforeunload` sintético e `defaultPrevented`. Isso prova
     que o nosso handler cancelou — e NÃO prova que o navegador respeitou. São perguntas
     diferentes, e a issue #1112 cobra a segunda.

     O GATILHO FOI MEDIDO, NÃO ESCOLHIDO POR GOSTO. A primeira versão desta cláusula usava
     `page.close({ runBeforeUnload: true })` e escutava o evento `dialog`. Ela passava
     verde — e passava verde TAMBÉM com o mutante `promptsempre`, que deixa a confirmação
     armada no menu inteiro. Uma sonda isolada (página mínima que sempre cancela, Chrome
     headless E headed) deu o veredito: com `close`, o diálogo NUNCA aparece, nem na página
     que cancela; a aba simplesmente fecha. Instrumento morto, verde mentiroso.
     Com NAVEGAÇÃO (`page.goto`) a mesma sonda discrimina perfeitamente, nos dois modos:
       cancela=true  -> dialog=beforeunload, navegação BARRADA (ERR_ABORTED), aba viva
       cancela=false -> nenhum diálogo,      navegação concluída
     Por isso o gatilho aqui é navegar, e são DOIS sinais independentes: o evento `dialog`
     e o EFEITO (a saída foi mesmo barrada?). O efeito é o que o jogador sente.

     ATIVAÇÃO PEGAJOSA: o Chrome só honra `beforeunload` se a aba já recebeu entrada
     confiável. `element.click()` dentro de `evaluate` NÃO concede ativação — só entrada
     sintetizada de verdade, como `page.mouse.click`. Sem esse clique, "nenhum diálogo"
     seria verdade por motivo errado em qualquer estado. */
  const sondaNavegador = async (p, destino) => {
    let dialogo = null;
    const ouvinte = (d) => { dialogo = d.type(); d.dismiss().catch(() => {}); };
    p.on('dialog', ouvinte);
    let barrou = false, erro = '';
    /* 30 s, não 8: com a máquina carregada (seis corridas de régua em fila, swiftshader) um
       `goto` de 8 s estourava por lentidão e a cláusula lia isso como "a saída foi barrada".
       Foi medido: numa corrida do `semprompt` a CW7a acusou bloqueio no MENU com
       `diálogo: null` — bloqueio sem diálogo não existe, era o cronômetro. */
    try { await p.goto(destino, { timeout: 30000 }); } catch (e) { barrou = true; erro = e.message.split('\n')[0]; }
    await new Promise((r) => setTimeout(r, 500));
    p.off('dialog', ouvinte);
    /* BLOQUEIO SEM DIÁLOGO É INSTRUMENTO QUEBRADO, NÃO VEREDITO. O `beforeunload` só barra
       navegação levantando a caixa de confirmação; se a navegação falhou e nenhum diálogo
       apareceu, quem falhou foi a rede/o servidor/o relógio. Devolver isso como "a saída
       foi barrada" acusaria o jogo por um defeito do arnês — e acusar código inocente é o
       pior que uma régua faz. */
    const inconclusivo = barrou && dialogo === null;
    return { dialogo, barrou, erro, inconclusivo };
  };

  /* ── CW7a · NO MENU, O NAVEGADOR DEIXA SAIR SEM PERGUNTAR ─────────────────── */
  await page.mouse.click(8, 8);   // ativação pegajosa; o canto não tem botão de menu
  const saidaNoMenu = await sondaNavegador(page, `${BASE}/robots.txt`);
  const cw7a = !saidaNoMenu.inconclusivo && saidaNoMenu.dialogo === null && saidaNoMenu.barrou === false;
  if (saidaNoMenu.inconclusivo) falhas.push(`CW7a · NÃO MEDIDA: a navegação falhou sem nenhum diálogo (${saidaNoMenu.erro}) — isso é o arnês, não o jogo, e NÃO é aprovação`);
  else if (!cw7a) falhas.push(`CW7a · o NAVEGADOR barrou a saída NO MENU (diálogo "${saidaNoMenu.dialogo}") — quem só quer fechar a aba é impedido, e confirmação que aparece sempre acaba arrancada inteira`);
  console.log('CW7a · no menu, o navegador de verdade deixa sair sem perguntar');
  console.log(`   diálogo: ${saidaNoMenu.dialogo ?? 'nenhum'}   saída barrada: ${saidaNoMenu.barrou}   ${cw7a ? 'PASSA' : 'FALHA'}\n`);
  // volta pro menu: a sonda acima levou a aba pro robots.txt
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3500);

  /* ── começa uma partida DE VERDADE ────────────────────────────────────────────
     Nada de `?debug=1&auto=1` aqui, e o motivo é o defeito: em `testMode` tanto a tela
     cheia quanto a trava de atalhos quanto a confirmação de saída são desligadas DE
     PROPÓSITO (as ferramentas de captura dependem disso). Medir pelo caminho de debug
     mediria justamente os caminhos que não existem lá. */
  /* O MENU TEM CINCO PASSOS, e descobrir isso custou uma corrida: parar no `btn-jogar`
     deixava a régua parada em `team-select` por 180 s reportando "não começou". Cada passo
     espera a tela seguinte APARECER antes de clicar — `waitForTimeout` fixo aqui é a
     receita da medição intermitente (foi assim que 17 de 26 miniaturas nunca chegaram a
     ser pedidas na régua das armas). */
  const passos = [
    ['nick + modo captura', () => {
      const n = document.getElementById('nick-input');
      if (n) { n.value = 'REGUA'; n.dispatchEvent(new Event('input', { bubbles: true })); }
      document.querySelector('[data-act="sp"]')?.click();   // o menu agora tem MULTIPLAYER e SINGLE PLAYER; o modo se escolhe na tela de mapa
    }, () => !!document.getElementById('menu-setup')?.classList.contains('open')],
    ['JOGAR', () => document.getElementById('btn-jogar')?.click(),
      () => !document.getElementById('team-select')?.classList.contains('hidden')],
    ['minha facção', () => document.getElementById('btn-team-e')?.click(),
      () => document.querySelectorAll('#char-list .char-row').length > 0],
    ['personagem', () => document.querySelector('#char-list .char-row')?.click(),
      () => !!document.querySelector('#char-list .char-row.sel')],
    ['confirma personagem', () => document.getElementById('char-confirm')?.click(),
      () => !document.getElementById('team-select')?.classList.contains('hidden')],
    ['facção inimiga', () => document.getElementById('btn-team-b')?.click(), () => true],
  ];
  let parouEm = null, motivoDoPasso = '';
  for (const [nome, acao, pronto] of passos) {
    await page.evaluate(acao);
    /* PACIÊNCIA LONGA POR PASSO, e ela foi medida, não chutada. O passo "minha facção"
       dispara `preloadCharacterAssets` do elenco inteiro antes de montar o `#char-list`, e
       no headless com swiftshader isso passa de 180 s nesta máquina. Com 60 s e com 180 s
       a régua dizia "travou no menu"; o diagnóstico impresso no fim mostrou
       `charRows: 8` — as fileiras existiam, só chegaram depois. Timeout curto não é
       rigor, é relatório que manda caçar defeito onde só faltava esperar.
       `--paciencia=<ms>` para máquina mais lenta ainda. */
    /* `polling: 250` NÃO É DETALHE — é a causa raiz de três corridas vermelhas. O padrão do
       `waitForFunction` é pollar em `requestAnimationFrame`, e o rAF fica estrangulado
       exatamente durante o preload pesado que estamos esperando: o predicado morria de
       fome enquanto o `evaluate` do diagnóstico, logo depois, enxergava `charRows: 8`. A
       régua acusava "travou no menu" com o menu montado na frente dela. */
    /* NADA DE `.catch(() => false)` CEGO AQUI. Ele transformou uma exceção do próprio
       Playwright em "não ficou pronto", e a régua passou três corridas dizendo "travou no
       menu" enquanto o diagnóstico logo abaixo imprimia `charRows: 8`. Instrumento que
       engole o próprio erro manda caçar defeito no lugar errado. */
    /* DUAS CORREÇÕES DE INSTRUMENTO AQUI, e as duas mentiam em direções opostas.
       (1) `waitForFunction(fn, arg, opções)` — a chamada antiga passava `{timeout, polling}`
           na vaga do ARGUMENTO. Resultado: a paciência de 420 s e o `polling: 250` que os
           comentários acima defendem com tanto cuidado NUNCA valeram; o que rodava era o
           padrão de 30 s pollando em rAF. Os comentários descreviam um instrumento que não
           existia, e a corrida de hoje reprovou em "Timeout 30000ms" com a paciência
           supostamente em 420 s.
       (2) O MENU ENCURTOU. Neste build, clicar em JOGAR no single player já entra na
           partida: `team-select` não reaparece, e o passo esperava por ele até estourar —
           com o jogo VIVO na frente da régua (o diagnóstico imprimia `estado: "live"`).
           Régua que reprova um jogo funcionando é pior que régua ausente. Agora cada passo
           corre contra "a partida já está viva": o que vier primeiro manda, e partida viva
           encerra o passeio pelo menu sem falha. */
    const vivoSrc = `(!!window.__game && ['live','countdown','roundEnd'].includes(window.__game.state)
      && !!document.getElementById('load-overlay')?.classList.contains('hidden'))`;
    const alvo = `(() => (${vivoSrc} ? 'vivo' : ((${pronto.toString()})() ? 'passo' : false)))()`;
    const qual = await page.waitForFunction(alvo, null, { timeout: PACIENCIA, polling: 250 })
      .then((h) => h.jsonValue()).catch((e) => { motivoDoPasso = e.message.split('\n')[0]; return null; });
    if (qual === 'vivo') break;
    if (qual !== 'passo') { parouEm = nome; break; }
  }

  /* ESPERA O OVERLAY DE LOADING SUMIR, não só o `state` mudar — e a diferença custou uma
     corrida com CW1 vermelha e o conserto certo. `game.start()` já põe o estado em
     `countdown` lá na linha 577 do main.js; o `_requestLock()` (que é quem arma a trava)
     só roda ~20 linhas depois, atrás de um `await` de dois `requestAnimationFrame` e do
     `hideLoading()`. Medir no `state` media o meio do `startGame` e acusava o jogo de não
     armar algo que ele ainda nem tinha chegado a tentar. O overlay sumindo é o sinal de
     que o `startGame` terminou. */
  /* `null` na vaga do argumento: mesma armadilha corrigida no laço acima — sem ele o
     `{timeout, polling}` ia parar no parâmetro da função e a espera caía nos 30 s padrão. */
  const viva = !parouEm && await page.waitForFunction(
    () => !!window.__game
      && ['live', 'countdown', 'roundEnd'].includes(window.__game.state)
      && !!document.getElementById('load-overlay')?.classList.contains('hidden'),
    null,
    { timeout: 180000, polling: 250 },
  ).then(() => true).catch(() => false);

  if (!viva) {
    /* Diagnóstico junto: sem ele "não começou" manda investigar às cegas. Onde o fluxo
       parou (tela visível, se o Game existe, qual o estado) e os erros que apareceram
       DEPOIS do clique separam "meu conserto quebrou o começo da partida" de "esta
       máquina não tem os assets que o preload pede". */
    /* Conta rAF em 500 ms: `overlayDeLoadingPreso + rafs 0` é assinatura de throttling do
       arnês, não de defeito do jogo. Distinguir os dois é o que impede a régua de mandar
       alguém caçar bug no `startGame`. */
    const diag = await page.evaluate(async () => ({
      temGame: !!window.__game,
      estado: window.__game?.state ?? null,
      rafs: await new Promise((r) => { let n = 0; const t = (() => { n++; requestAnimationFrame(t); }); requestAnimationFrame(t); setTimeout(() => r(n), 500); }),
      loading: !document.getElementById('load-overlay')?.classList.contains('hidden'),
      charList: !!document.getElementById('char-list'),
      charRows: document.querySelectorAll('#char-list .char-row').length,
      charFilhos: document.getElementById('char-list')?.children.length ?? -1,
      classesDoPrimeiro: document.getElementById('char-list')?.children[0]?.className ?? null,
      visiveis: [...document.querySelectorAll('.screen,[id$="-panel"],#main-menu,#loading')]
        .filter((el) => !el.classList.contains('hidden')).map((el) => el.id).filter(Boolean),
    })).catch(() => null);
    falhas.push(parouEm
      ? `CW0 · o fluxo do menu travou no passo "${parouEm}" — a régua não mediu CW1/CW2 (isto NÃO é aprovação)`
      : 'CW0 · a partida não começou em 180 s — a régua não conseguiu medir CW1/CW2 (isto NÃO é aprovação)');
    console.log('CW1/CW2 · NÃO MEDIDAS: a partida não subiu no headless');
    console.log(`   passo que travou: ${parouEm || '(o menu completou; o Game é que não ficou vivo)'}`);
    if (motivoDoPasso) console.log(`   motivo do Playwright: ${motivoDoPasso}`);
    console.log(`   diagnóstico: ${JSON.stringify(diag)}`);
    console.log(`   erros até aqui: ${erros.length ? erros.join(' | ') : 'nenhum'}\n`);
  } else {
    /* As três condições que o `_travaAtalhos` consulta vêm juntas. Sem elas, "lock: 0×" é
       um beco: pode ser testMode, pode ser tela cheia que não pegou, pode ser o método
       não existir. Cada uma tem conserto diferente. */
    const est = await page.evaluate(() => ({
      ...window.__ctrlw,
      estado: window.__game.state,
      testMode: !!window.__game.testMode,
      temFullscreen: !!document.fullscreenElement,
      temMetodo: typeof window.__game._travaAtalhos === 'function',
      temApi: typeof navigator.keyboard?.lock === 'function',
    }));

    /* ── CW1 · A TRAVA ARMOU ─────────────────────────────────────────────────── */
    const listas = est.locks.flat();
    const temW = listas.includes('KeyW');
    const temDigitos = ['Digit1', 'Digit2', 'Digit3'].every((k) => listas.includes(k));
    const cw1 = est.fullscreen > 0 && est.locks.length > 0 && temW && temDigitos;
    if (!cw1) falhas.push(`CW1 · a trava de atalhos não armou (tela cheia pedida ${est.fullscreen}×, keyboard.lock ${est.locks.length}×, KeyW ${temW}, dígitos ${temDigitos}) — Ctrl+W continua fechando a aba`);
    console.log('CW1 · ao entrar na partida, tela cheia + keyboard.lock com KeyW e os dígitos');
    console.log(`   requestFullscreen: ${est.fullscreen}×   keyboard.lock: ${est.locks.length}×   teclas: ${JSON.stringify(listas)}`);
    console.log(`   condições do _travaAtalhos: testMode=${est.testMode} fullscreenElement=${est.temFullscreen} método=${est.temMetodo} API=${est.temApi}`);
    console.log(`   ${cw1 ? 'PASSA' : 'FALHA'}\n`);

    /* ── CW2 · CONFIRMAÇÃO COM PARTIDA VIVA ──────────────────────────────────── */
    const naPartida = await sonda();
    const cw2 = naPartida === true;
    if (!cw2) falhas.push('CW2 · com partida viva o beforeunload NÃO pede confirmação — no Firefox/Safari, e sempre que a tela cheia não pegar, a aba fecha seca no meio do tiroteio');
    console.log('CW2 · com partida viva o beforeunload pede confirmação');
    console.log(`   estado do jogo: ${est.estado}   confirmação: ${naPartida}   ${cw2 ? 'PASSA' : 'FALHA'}\n`);

    /* ── CW6 · O PREDICADO "ESTÁ EM PARTIDA" LIGA E DESLIGA O HANDLER ─────────
       CW2 e CW3 medem duas pontas (partida viva / menu) e entre elas cabe um predicado
       inteiro. `emPartida()` é o único portão do `beforeunload`, e ele é a metade que
       protege o conserto de virar praga: se afrouxar, a confirmação começa a aparecer em
       `matchEnd` (a tela de fim de partida, onde a pessoa está justamente saindo) e em
       `boot`. Aqui a tabela inteira é percorrida, estado por estado, cada um com a
       resposta esperada. É determinístico: nada depende de tempo, de rede ou de animação.
         --mutante=estadoamplo  admite `matchEnd` e `boot` na lista de estados -> CW6 */
    const tabela = [['live', true], ['countdown', true], ['roundEnd', true],
      ['matchEnd', false], ['boot', false], ['warmup', false]];
    const linhas = [];
    for (const [estado, esperado] of tabela) {
      const obtido = await page.evaluate((s) => {
        window.__game.state = s;
        const ev = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(ev);
        return ev.defaultPrevented;
      }, estado);
      linhas.push({ estado, esperado, obtido, ok: obtido === esperado });
    }
    await page.evaluate(() => { window.__game.state = 'live'; });   // devolve o estado pra CW7b
    const cw6 = linhas.every((l) => l.ok);
    if (!cw6) falhas.push(`CW6 · o portão \`emPartida()\` não segue a tabela de estados (${linhas.filter((l) => !l.ok).map((l) => `${l.estado}: esperado ${l.esperado}, obtido ${l.obtido}`).join('; ')})`);
    console.log('CW6 · o portão `emPartida()` liga e desliga o beforeunload estado por estado');
    for (const l of linhas) console.log(`   ${l.estado.padEnd(10)} esperado ${String(l.esperado).padEnd(5)} obtido ${String(l.obtido).padEnd(5)} ${l.ok ? 'ok' : 'ERRADO'}`);
    console.log(`   ${cw6 ? 'PASSA' : 'FALHA'}\n`);

    /* ── CW7b · COM PARTIDA VIVA, O NAVEGADOR BARRA A SAÍDA ───────────────────
       O par da CW7a e a prova que a issue #1112 cobra: não `defaultPrevented`, mas o
       navegador. Mesmo gatilho medido na sonda (navegar), mesmos dois sinais — o evento
       `dialog` e a saída BARRADA. Em modo automatizado o Chrome responde ao diálogo
       sozinho (`dismiss`), que é justamente o "ficar na página"; num navegador com gente
       na frente é o botão "Sair"/"Cancelar" da caixa de confirmação.
       FICA POR ÚLTIMO: se a saída for barrada a aba continua no jogo, mas se algum dia
       deixar de ser, a aba sai do jogo e nada depois daqui mediria o que quer medir. */
    await page.mouse.click(640, 360);   // ativação pegajosa (clique real, não `evaluate`)
    const saidaNaPartida = await sondaNavegador(page, `${BASE}/robots.txt`);
    const cw7b = saidaNaPartida.dialogo === 'beforeunload' && saidaNaPartida.barrou === true;
    if (saidaNaPartida.inconclusivo) falhas.push(`CW7b · NÃO MEDIDA: a navegação falhou sem nenhum diálogo (${saidaNaPartida.erro}) — isso é o arnês, não o jogo, e NÃO é aprovação`);
    else if (!cw7b) falhas.push(`CW7b · com partida viva o NAVEGADOR não barrou a saída (diálogo ${saidaNaPartida.dialogo ?? 'nenhum'}, barrou ${saidaNaPartida.barrou}) — a aba fecha seca no meio do tiroteio`);
    console.log('CW7b · com partida viva, o navegador de verdade barra a saída e pergunta');
    console.log(`   diálogo: ${saidaNaPartida.dialogo ?? 'nenhum'}   saída barrada: ${saidaNaPartida.barrou}   ${cw7b ? 'PASSA' : 'FALHA'}\n`);
  }

  const passou = falhas.length === 0;
  console.log(passou
    ? '✓ CTRLW  agachar andando pra frente não fecha mais a aba — e o menu continua livre'
    : `✗ CTRLW  ${falhas.length} reprovação(ões):`);
  for (const f of falhas) console.log(`   ${f}`);
  await browser.close(); browser = null;
  derrubaServidor();
  process.exit(passou ? 0 : 1);
} catch (e) {
  console.error('✗ CTRLW0  a régua não conseguiu medir:', e.message);
  if (browser) await browser.close().catch(() => {});
  derrubaServidor();
  process.exit(1);
}
