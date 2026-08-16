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

   O QUE MEDE, E POR QUE SÃO TRÊS CLÁUSULAS

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

   O QUE O ARNÊS FORNECE, E ISSO PRECISA ESTAR ÀS CLARAS
     Chrome headless não concede tela cheia de verdade e pode não expor `navigator.keyboard`.
     O arnês então SIMULA O AMBIENTE: `requestFullscreen` resolve e `document.fullscreenElement`
     passa a responder, e `navigator.keyboard.lock` existe e grava a chamada. O que está
     sob teste é o CÓDIGO DO JOGO (`_travaAtalhos`, `startGame`, o `beforeunload`) — não a
     capacidade do navegador headless. A confirmação de que o Windows para de fechar a aba
     é MANUAL e não é feita aqui: está escrita no KNOWN-BUGS.md como não verificada.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (em memória, o disco não é tocado)
     --mutante=semlock       tira a chamada de `_travaAtalhos()` do `_requestLock` -> CW1
     --mutante=semprompt     tira o `preventDefault` do `beforeunload`             -> CW2
     --mutante=promptsempre  arma a confirmação SEM olhar se tem partida           -> CW3

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
     exemplo), a régua morre na hora dizendo o quê não casou. */
  const aplicou = { ok: false, alvo: '' };
  const troca = (glob, de, para) => {
    aplicou.alvo = de;
    return page.route(glob, async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      if (corpo.includes(de)) aplicou.ok = true;
      await rota.fulfill({ status: 200, contentType: 'application/javascript', body: corpo.replace(de, para) });
    });
  };
  if (MUTANTE === 'semlock') await troca('**/js/game.js*', 'this._travaAtalhos();', '/* mutante */');
  if (MUTANTE === 'semprompt') await troca('**/js/main.js*', 'if (emPartida()) { e.preventDefault(); e.returnValue = \'\'; }', '/* mutante */');
  if (MUTANTE === 'promptsempre') await troca('**/js/main.js*', 'if (emPartida()) { e.preventDefault();', 'if (true) { e.preventDefault();');

  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3500);

  console.log(`RÉGUA DO CTRL+W${MUTANTE ? `   [MUTAÇÃO: ${MUTANTE}]` : ''}   alvo ${BASE}\n`);
  /* IMPRIME A MENSAGEM, não a contagem. "4 pageerror" mandou investigar às cegas uma vez;
     o texto do erro diz na hora se é o jogo, o arnês ou asset que falta nesta máquina. */
  if (erros.length) { console.log(`   AVISO · ${erros.length} pageerror no boot:`); for (const e of erros) console.log(`     ${e}`); console.log(''); }

  if (MUTANTE && !aplicou.ok) {
    console.error(`✗ CTRLW0  MUTANTE NÃO APLICOU — o texto procurado não está no arquivo servido:\n   ${aplicou.alvo}`);
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
      document.querySelector('[data-act="ctf"]')?.click();
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
    const ok = await page.waitForFunction(pronto, { timeout: PACIENCIA, polling: 250 })
      .then(() => true).catch((e) => { motivoDoPasso = e.message.split('\n')[0]; return false; });
    if (!ok) { parouEm = nome; break; }
  }

  /* ESPERA O OVERLAY DE LOADING SUMIR, não só o `state` mudar — e a diferença custou uma
     corrida com CW1 vermelha e o conserto certo. `game.start()` já põe o estado em
     `countdown` lá na linha 577 do main.js; o `_requestLock()` (que é quem arma a trava)
     só roda ~20 linhas depois, atrás de um `await` de dois `requestAnimationFrame` e do
     `hideLoading()`. Medir no `state` media o meio do `startGame` e acusava o jogo de não
     armar algo que ele ainda nem tinha chegado a tentar. O overlay sumindo é o sinal de
     que o `startGame` terminou. */
  const viva = !parouEm && await page.waitForFunction(
    () => !!window.__game
      && ['live', 'countdown', 'roundEnd'].includes(window.__game.state)
      && !!document.getElementById('load-overlay')?.classList.contains('hidden'),
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
