/* tiro-mp-browser.mjs — O TIRO DO SERVIDOR CHEGA AOS OLHOS DO JOGADOR.
   ═══════════════════════════════════════════════════════════════════════════════════
   As réguas headless desta rodada provam a CONTA do tiro autoritativo: o nó sorteia o
   cone (`game/dispersao-check.mjs`, 13 cláusulas) e o cliente não desenha um segundo.
   Nenhuma delas prova o que o jogador vê, e esta casa já pagou quatro vezes por número
   sem figura. Esta régua fecha esse vão: navegador de verdade, nó de verdade, sala
   criada pela tela, e o traçante saindo do ponto de impacto que veio do servidor.

   O QUE ELA MEDE (na rota real `/`, com um nó local no ar)
     TB1 · a sala nasce no mapa que a tela escolheu (o seletor de mapas da rodada passada)
     TB2 · o cliente recebe corpo (`yourEnt`) e o jogo fica `live`
     TB3 · ao atirar, chega um evento `tiro` DO SERVIDOR com pontos de impacto
     TB4 · o número de pontos é o número de pellets da arma que o servidor diz ter usado
     TB5 · o cliente desenha a partir desses pontos (traçantes entram na cena)
     TB6 · e desenha UMA vez: o cliente não soma o cone dele ao do servidor
     TB7 · nenhuma exceção durante a partida
     TB8 · a poeira do impacto sai no ponto do servidor, com o material que ele mandou
     TB9 · a normal da superfície vem junto, que é o que deita o furo na parede

   A MUTAÇÃO QUE A DEIXA VERMELHA (executada)
     --mutante=sem-desenho   tira a chamada de `tiroDeRede` do despacho de eventos: o evento
                             continua chegando (TB3/TB4 verdes) e a tela fica muda — é essa
                             distinção que a régua existe para fazer, e por isso o evento é
                             contado na CHEGADA e não no desenho.
     --mutante=cone-local    devolve ao cliente o sorteio próprio do cone; o mesmo tiro vira
                             traçante do servidor + traçante local e TB6 cai. (A primeira
                             versão de TB6 cobrava um TETO de 4 por tiro e este mutante
                             passava verde com arma de bala única: régua frouxa não é régua.)
   A mutação é em MEMÓRIA (interceptação de rota); o arquivo em disco não é tocado.

   A FIGURA sai DURANTE a rajada, não no fim: traçante vive 32 ms e a poeira meio segundo.
   São três quadros seguidos (`-2`, `-3`), porque um só cai no intervalo entre dois tiros.

   JANELA DE VERDADE, e isso não é preciosismo: em `--headless=new` esta página CONGELA —
   `requestAnimationFrame` e `setTimeout` param de disparar depois do boot e o jogo não
   avança um quadro. Com `--use-angle=swiftshader` ela roda, mas a 2 FPS, e a 2 FPS o painel
   de rede mostra "snap 274 Hz" (a taxa é dividida pela janela de render): mediria o
   renderizador, não o tiro. `--visivel=0` deixa tentar headless no dia em que isso mudar.

   USO
     node tools/eval/tiro-mp-browser.mjs                  # usa astro em 8202 e nó em 8787
     node tools/eval/tiro-mp-browser.mjs --mutante=sem-desenho
     NO=localhost:9000 node tools/eval/tiro-mp-browser.mjs --foto=/tmp/tiro.png

   PRÉ-REQUISITO honesto: ela precisa de um nó no ar. Não sobe o backend sozinha porque
   ele é outro repositório — por isso não entra no portão-browser do CI, onde só existe
   o cliente. Quem segura o tiro no CI é `dispersao-check` (nó) e `cliente-contrato`
   (build da imagem); esta aqui é a FIGURA, e roda à mão antes de fechar o PR.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const PORTA = Number(val('porta', 8202));
const FOTO = val('foto', '/tmp/tiro-mp.png');
const MAPA = val('mapa', 'atacadao_treta');
const NO = process.env.NO || 'localhost:8787';
const BASE = `http://localhost:${PORTA}`;
const MAIN_LOCAL = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');

const MUTANTES = new Set(['', 'sem-desenho', 'cone-local']);
if (!MUTANTES.has(MUTANTE)) { console.error(`✗ TB0  mutante desconhecido: ${MUTANTE}`); process.exit(1); }

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

let subiuAqui = false;
const arvoreCorreta = async () => {
  try { const r = await fetch(`${BASE}/js/main.js`); return r.ok && await r.text() === MAIN_LOCAL; } catch { return false; }
};
async function sobeServidor() {
  try {
    if ((await fetch(`${BASE}/robots.txt`)).status) {
      if (await arvoreCorreta()) return true;
      throw new Error(`a porta ${PORTA} já serve outra árvore; use --porta=<livre>`);
    }
  } catch (e) { if (/já serve outra árvore/.test(e.message)) throw e; }
  spawn('npx', ['astro', 'dev', '--port', String(PORTA)], { stdio: 'ignore' }).on('error', () => {});
  subiuAqui = true;
  const fim = Date.now() + 90_000;
  while (Date.now() < fim) { if (await arvoreCorreta()) return true; await new Promise((r) => setTimeout(r, 700)); }
  return false;
}

let browser;
try {
  let saude = null;
  try { saude = await (await fetch(`http://${NO}/health`)).json(); } catch { /* sem nó */ }
  if (!saude?.ok) {
    console.error(`✗ TB0  nenhum nó em ${NO}. Suba um:\n`
      + '   cd ../../csbrasil-backend && PORT=8787 REGIAO=br MP_TICKET_REQUIRED=0 node server/index.js');
    process.exit(1);
  }
  if (!(await sobeServidor())) { console.error(`✗ TB0  o site não subiu em ${BASE}`); process.exit(1); }

  const gRoot = execSync('npm root -g').toString().trim();
  const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = _pw.chromium || _pw.default?.chromium;
  /* JANELA DE VERDADE, e não é preciosismo: em `--headless=new` esta página congela —
     rAF e `setTimeout` param de disparar depois do boot, o jogo não avança um quadro e a
     régua mede uma tela parada. É o mesmo mal da aba oculta. Com janela, o laço roda.
     `--visivel=0` deixa tentar headless de novo no dia em que isso for consertado. */
  const semJanela = val('visivel', '1') === '0';
  browser = await chromium.launch({
    headless: semJanela,
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      // GPU de verdade quando há janela: com swiftshader esta cena roda a 2 FPS, e a 2 FPS
      // o teste dispara UM tiro em 900 ms — mede o renderizador, não o tiro.
      ...(semJanela ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
      '--mute-audio', '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--autoplay-policy=no-user-gesture-required'],
  });
  /* `browser.newPage()` e não `newContext()`: nesta máquina o `domcontentloaded` de um
     contexto novo nunca chega nesta página (90 s sem evento, com o título já carregado).
     Página direta carrega em ~1 s — e o que a régua mede não muda. */
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const ctx = page;

  let mutou = !MUTANTE;
  if (MUTANTE) {
    await ctx.route('**/js/netgame.js*', async (rota) => {
      const r = await rota.fetch(); const corpo = await r.text(); let novo = corpo;
      if (MUTANTE === 'sem-desenho') novo = novo.replace('this.tiroDeRede(att, e);', '/* MUTANTE: tela muda */');
      mutou = MUTANTE !== 'sem-desenho' || novo !== corpo;
      await rota.fulfill({ response: r, body: novo });
    });
  }
  if (MUTANTE === 'cone-local') {
    await ctx.route('**/js/game.js*', async (rota) => {
      const r = await rota.fetch(); const corpo = await r.text();
      const novo = corpo.replace('const servidorDesenha = this.online && !!this._mp?._evOn;', 'const servidorDesenha = false;');
      mutou = novo !== corpo;
      await rota.fulfill({ response: r, body: novo });
    });
  }

  page.setDefaultTimeout(60_000);
  /* Clique pelo HANDLER e não pelo pixel: o menu tem animação de entrada e wallpaper por
     cima, e o hit-test do Playwright fica minutos em "element is not stable". `el.click()`
     dispara o MESMO `onclick` que o mouse dispara — o que a régua mede é o que acontece
     depois dele. A splash é a exceção (ouve `pointerdown`), e ali o clique é de verdade. */
  const clica = async (sel) => {
    await page.waitForFunction((s) => !!document.querySelector(s), sel, { polling: 200 });
    await page.evaluate((s) => document.querySelector(s).click(), sel);
  };
  /* Clique que INSISTE até o efeito aparecer. Metade dos itens do menu é HTML estático com
     handler delegado ligado lá no fim do `main.js`: clicar antes da ligação não dá erro
     nenhum, o clique só se perde — e a régua morria esperando uma tela que nunca abriu. */
  const clicaAte = async (sel, pronto, prazo = 60_000) => {
    const fim = Date.now() + prazo;
    for (;;) {
      await clica(sel);
      try { await page.waitForFunction(pronto, null, { timeout: 3000, polling: 200 }); return; }
      catch (e) { if (Date.now() > fim) throw e; }
    }
  };
  page.setDefaultNavigationTimeout(90_000);
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message || e)));
  /* `commit` e não `domcontentloaded`: o astro dev reinicia quando qualquer arquivo da
     árvore muda, e a navegação em curso fica sem o evento para sempre — a página carrega,
     o evento não chega. Quem diz que a página está de pé é o DOM, não o evento. */
  await page.goto(`${BASE}/?mp=1`, { waitUntil: 'commit', timeout: 90_000 }).catch(() => {});
  await page.waitForFunction(() => document.readyState !== 'loading' && !!document.getElementById('btn-jogar'), null, { timeout: 90_000, polling: 250 });

  // ── a tela, como o jogador usa: nick → JOGAR → MULTIPLAYER → mapa → CRIAR E ENTRAR
  // sem nick o JOGAR fica `aria-disabled` (é estado, não shake): a régua digita como gente
  /* a splash de entrada só sai no CLIQUE (é ela que destrava o áudio do navegador) —
     esperar `__CS_MAIN_READY__` e clicar é literalmente o primeiro gesto do jogador. */
  await page.waitForFunction(() => {
    const pr = document.getElementById('splash-enter');
    return window.__CS_MAIN_READY__ && pr && !pr.classList.contains('hidden');
  }, null, { timeout: 120_000, polling: 250 });
  /* o wallpaper do menu fica por cima da splash no hit-test, então o clique real nunca
     chega nela; os dois eventos que importam (o `pointerdown` de captura no window e o
     `click` no document) são despachados no elemento certo. */
  await page.evaluate(() => {
    const sp = document.getElementById('boot-splash');
    sp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    sp.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const sp = document.getElementById('boot-splash');
    return !sp || sp.classList.contains('gone');
  }, null, { timeout: 60_000, polling: 250 });

  // o nick mora no passo de PERFIL, fechado no menu: abre como o jogador abre
  await clicaAte('#btn-profile', () => {
    const i = document.getElementById('nick-input');
    return !!i && i.getClientRects().length > 0;
  });
  await page.waitForFunction(() => !!document.getElementById('nick-input'), null, { polling: 200 });
  await page.evaluate(() => {
    const i = document.getElementById('nick-input');
    i.value = 'REGUA'; i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const b = document.getElementById('btn-jogar');
    return b && b.onclick && b.getAttribute('aria-disabled') !== 'true';
  }, null, { timeout: 90_000, polling: 250 });
  await clicaAte('#btn-jogar', () => !document.getElementById('main-menu')?.classList.contains('hidden')
    || !!document.querySelector('[data-act="mp"]'));
  await clicaAte('[data-act="mp"]', () => document.querySelectorAll('#mp-nos .mp-no, #mp-nos button').length > 0, 90_000);
  await page.evaluate(() => { document.querySelector('details.mp-criar')?.setAttribute('open', ''); });
  await page.evaluate(() => {
    document.getElementById('mp-nome').value = 'REGUA DO TIRO';
    const r = document.getElementById('mp-rotacao');
    r.value = 'escolher'; r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForSelector(`#mp-mapas-grade .mp-mapa[data-id="${MAPA}"]`, { timeout: 20_000 });
  await page.evaluate((m) => {
    document.querySelectorAll('#mp-mapas-grade .mp-mapa.on').forEach((b) => { if (b.dataset.id !== m) b.click(); });
    const alvo = document.querySelector(`#mp-mapas-grade .mp-mapa[data-id="${m}"]`);
    if (alvo && !alvo.classList.contains('on')) alvo.click();
  }, MAPA);
  await clica('#mp-criar');
  await page.waitForSelector('#mp-modal-entrar', { state: 'visible', timeout: 30_000 });
  await clica('#mp-modal-entrar');

  await page.waitForFunction(() => {
    const g = window.__game; return g && g._mp && g._mp.net.yourEnt != null && g.state === 'live' && g.player?.alive;
  }, null, { timeout: 120_000, polling: 250 });

  const entrada = await page.evaluate(() => {
    const g = window.__game;
    return { mapa: g._mapId, ent: g._mp.net.yourEnt, evOn: !!g._mp._evOn, arma: g.player.weapon };
  });
  cobra(entrada.mapa === MAPA, `TB1 · a sala nasceu no mapa que a tela escolheu (${entrada.mapa})`);
  cobra(entrada.ent != null, `TB2 · o jogador recebeu corpo no servidor (ent ${entrada.ent}) e a partida está viva`);

  // ── conta os eventos `tiro` do servidor e os traçantes que eles produzem
  const medindo = page.evaluate(async () => {
    const g = window.__game, mp = g._mp;
    const { WEAPONS } = await import('/js/game.js');
    /* O evento é contado na CHEGADA (`_evento`), não no desenho (`tiroDeRede`): contar no
       desenho faz "o nó não mandou" e "a tela não desenhou" darem a mesma leitura, e a
       régua perde justamente a distinção que ela existe para fazer. */
    const eventos = [];
    const meu = mp.net.yourEnt;
    const ev0 = mp._evento.bind(mp);
    mp._evento = (e) => { if (e.k === 'tiro' && (e.a | 0) === (meu | 0)) eventos.push({ w: e.w, n: (e.p || []).length, s: String(e.s || ''), nor: (e.n || []).filter(Array.isArray).length }); return ev0(e); };
    /* conta CRIAÇÃO de traçante, não quantos estão vivos: o traçante dura 32 ms, e ler o
       tamanho do vetor no fim do teste é ler uma cena onde todos já morreram — a primeira
       versão desta régua falhou assim, medindo o próprio atraso dela. */
    let tracers = 0, puffs = 0;
    const tr0 = g._tracer.bind(g);
    g._tracer = (a, b) => { tracers++; return tr0(a, b); };
    const pf0 = g._puff.bind(g);
    g._puff = (pos, n, surf) => { puffs++; return pf0(pos, n, surf); };
    g.mouseDown0 = true;
    await new Promise((r) => setTimeout(r, 450));
    window.__reguaAtirando = true;   // a figura é tirada AQUI: o traçante dura 32 ms
    await new Promise((r) => setTimeout(r, 450));
    g.mouseDown0 = false;
    await new Promise((r) => setTimeout(r, 400));
    const w = eventos[0]?.w || g.player.weapon;
    const st = mp.net.stats || {};
    return {
      eventos, tracersNovos: tracers, puffs,
      rede: { hz: st.hz | 0, alvo: mp.snapshotHz | 0, kbps: +(st.kbps || 0).toFixed(1), ping: Math.round(st.ping || 0), ents: st.ents | 0, fps: mp._nsFps ?? null },
      pellets: WEAPONS[w]?.pellets || 1, arma: w,
      municao: g.player.ammo?.[g.player.weapon]?.mag,
    };
  });

  /* A FIGURA sai DURANTE a rajada: traçante vive 32 ms e poeira meio segundo — a captura
     no fim do teste mostrava a cena já limpa, e figura que não mostra o efeito não prova
     nada. Três quadros seguidos porque um só pega o intervalo entre dois tiros. */
  await page.waitForFunction(() => window.__reguaAtirando, null, { polling: 30, timeout: 60_000 });
  for (let i = 0; i < 3; i++) await page.screenshot({ path: i ? FOTO.replace(/\.png$/, `-${i + 1}.png`) : FOTO });
  const medida = await medindo;

  const tiros = medida.eventos.length;
  cobra(tiros > 0, `TB3 · o servidor devolveu ${tiros} evento(s) de tiro com ponto de impacto (arma ${medida.arma})`);
  const certos = medida.eventos.filter((e) => e.n === Math.min(12, medida.pellets)).length;
  cobra(tiros > 0 && certos === tiros,
    `TB4 · cada tiro trouxe ${medida.pellets} ponto(s) — o número de pellets da ${medida.arma} (${certos}/${tiros})`);
  cobra(medida.tracersNovos > 0, `TB5 · o cliente desenhou a partir do servidor (${medida.tracersNovos} traçantes novos)`);
  /* TB6 · IGUALDADE, não teto. A primeira versão cobrava "no máximo 4 por tiro" (o corte de
     FX do `tiroDeRede`) e o mutante `cone-local` passava verde: com arma de bala única o
     desenho dobrado dá 2, que cabe no teto. Régua frouxa é régua que não existe. O número
     esperado é o que os pontos do servidor justificam, e nada além disso. */
  const esperado = medida.eventos.reduce((a, e) => a + Math.min(4, e.n), 0);
  cobra(tiros > 0 && medida.tracersNovos === esperado,
    `TB6 · o cliente desenha o tiro do servidor e só ele (${medida.tracersNovos} traçantes para ${esperado} pontos entregues)`);
  console.log(`  rede: snapshot ${medida.rede.hz} Hz (alvo ${medida.rede.alvo}) · ${medida.rede.kbps} KB/s · ${medida.rede.ents} ents · ping ${medida.rede.ping} ms · ${medida.rede.fps} fps`);
  /* TB8 · POEIRA no ponto de impacto. O `_puff` saía do `_fireHitscan`, que o online não
     chama mais desde que o cone virou do servidor: o tiro na parede ficou mudo e limpo.
     A conta é a mesma de TB6 — um efeito por ponto que veio com material. */
  const comMaterial = medida.eventos.reduce(
    (a, e) => a + [...e.s.slice(0, Math.min(4, e.n))].filter((c) => c && c !== '-').length, 0);
  cobra(comMaterial > 0 && medida.puffs === comMaterial,
    `TB8 · o impacto desenha poeira no ponto do servidor (${medida.puffs} para ${comMaterial} pontos com material)`);
  /* TB9 · a NORMAL da superfície chega junto. Sem ela o furo de bala deita virado para o
     atirador, e no chão fica de pé: o cliente não raycasta mais para descobrir sozinho. */
  const normais = medida.eventos.reduce((a, e) => a + e.nor, 0);
  cobra(normais >= comMaterial,
    `TB9 · a normal da parede vem no evento e orienta o furo (${normais} normais para ${comMaterial} impactos com material)`);
  cobra(erros.length === 0, `TB7 · nenhuma exceção no console durante a partida${erros.length ? `: ${erros[0]}` : ''}`);

  await page.screenshot({ path: FOTO });
  console.log(`\n  figura: ${FOTO}`);
  if (MUTANTE && !mutou) { console.error(`✗ TB0  o mutante ${MUTANTE} não casou com o código`); falhas++; }
  console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
} finally {
  await browser?.close();
  if (subiuAqui) spawnSync('npx', ['astro', 'dev', 'stop'], { stdio: 'ignore' });
}
process.exit(falhas ? 1 : 0);
