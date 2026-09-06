/* boot-check.mjs — O JOGO ABRE? É a régua mais barata e a mais cara de não ter.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTA RÉGUA (07/08, achado EM PRODUÇÃO)

   `public/js/main.js` chamava `_pingPresenca()` no escopo do módulo na linha 483, e a
   função lê `testMode` na primeira linha — `const` declarado só na 498. `const` não é
   hoisted como `var`: a chamada lança

     ReferenceError: Cannot access 'testMode' before initialization

   **no escopo do módulo**, o que mata a avaliação inteira de `main.js` ali. Tudo depois
   da linha 483 nunca acontece — inclusive o `onclick` do `#btn-jogar` (linha ~779).
   Medido no navegador contra `www.csbrasil.online`: o botão JOGAR existia e era INERTE.
   O site respondia 200, o build passava, o `check:fast` inteiro passava, o `npm run
   syntax` passava (é erro de RUNTIME, não de sintaxe) — e ninguém conseguia jogar.

   ── POR QUE NENHUM PORTÃO EXISTENTE PEGOU ───────────────────────────────────────
   Todos mediam OUTRA coisa, e cada um com boa razão:
     · `syntax`      — parseia o módulo; TDZ não é erro de parse.
     · `eval:site`   — status HTTP e JSON-LD das 13 rotas; a `/` respondia 200 com o HTML
                       inteiro, porque o HTML não depende do JS ter avaliado.
     · `harness.mjs` — sobe a classe `Game` em node, importando `game.js` DIRETO. Ele
                       nunca passa por `main.js`, que é justamente a casca que liga o menu.
     · as capturas   — usam `/?debug=1&auto=1` ou importam módulos soltos.
   Faltava a pergunta mais boba de todas, e é sempre a mais boba que fica sem régua:
   **o main.js terminou de avaliar?**

   O QUE ELA MEDE (na rota REAL `/`, no navegador, com o Astro no ar)
     B1 · zero `pageerror` durante o boot.
     B2 · o `main.js` terminou de avaliar — prova pelo EFEITO, não pela ausência de erro:
          `#btn-jogar` tem `onclick`, que é atribuído lá embaixo no arquivo.
     B3 · uma exceção injetada no começo da partida volta ao menu e abre uma mensagem
          acionável, sem stack nem overlay técnico no modo normal.
     B4 · o relatório automático chega e o botão de confirmação consegue reenviá-lo.
     B5 · `?debug=1` continua mostrando o diagnóstico técnico para quem está depurando.

   A MUTAÇÃO QUE A DEIXA VERMELHA (executada)
     --mutante=tdz   injeta, no topo do main.js servido, uma leitura de `testMode` antes
                     da declaração — reproduz exatamente o defeito de 07/08. A mutação é
                     em MEMÓRIA (interceptação de rota), o arquivo em disco não é tocado.
     --mutante=sem-amigavel  tira a chamada de recuperação do catch de `startGame`.
     --mutante=vaza-detalhe  remove a guarda que restringe o overlay técnico a `?debug=1`.
     --mutante=sem-console-watchdog  volta a esconder do console o timeout do watchdog.

   USO
     node tools/eval/boot-check.mjs                 # sobe o astro dev sozinho
     node tools/eval/boot-check.mjs --mutante=tdz   # prova que a régua morde
     BASE=https://www.csbrasil.online node tools/eval/boot-check.mjs   # alvo externo
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const PORTA = Number(val('porta', 4321));
const FOTO = val('foto', '');
const EXTERNO = !!process.env.BASE;
const BASE = process.env.BASE || `http://localhost:${PORTA}`;
const MAIN_LOCAL = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const MUTANTES = new Set(['', 'tdz', 'sem-amigavel', 'vaza-detalhe', 'sem-console-watchdog']);
if (!MUTANTES.has(MUTANTE)) {
  console.error(`✗ BOOT0  mutante desconhecido: ${MUTANTE}`);
  process.exit(1);
}

let subiuAqui = false;
async function arvoreCorreta() {
  try {
    const r = await fetch(BASE + '/js/main.js');
    return r.ok && await r.text() === MAIN_LOCAL;
  } catch { return false; }
}
async function noAr() {
  const fim = Date.now() + 90_000;
  while (Date.now() < fim) {
    if (await arvoreCorreta()) return true;
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}
async function sobeServidor() {
  if (EXTERNO) return true;
  try {
    if ((await fetch(BASE + '/robots.txt')).status) {
      if (await arvoreCorreta()) return true;
      throw new Error(`a porta ${PORTA} já serve outra árvore; use --porta=<livre>`);
    }
  } catch (e) {
    if (/já serve outra árvore/.test(e.message)) throw e;
  }
  // mesmo padrão do site-smoke.mjs: o `astro dev` daemoniza, quem derruba é o `stop`.
  spawn('npx', ['astro', 'dev', '--port', String(PORTA)], { stdio: 'ignore', detached: false }).on('error', () => {});
  subiuAqui = true;
  return noAr();
}
function derrubaServidor() { if (subiuAqui) spawnSync('npx', ['astro', 'dev', 'stop'], { stdio: 'ignore' }); }

let browser;
try {
  if (!(await sobeServidor())) {
    console.error(`✗ BOOT0  o site não subiu em ${BASE} (90 s de espera)`);
    process.exit(1);
  }
  const gRoot = execSync('npm root -g').toString().trim();
  const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = _pw.chromium || _pw.default?.chromium;
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
  });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const relatorios = [];
  let mutacaoAplicou = !MUTANTE;

  /* Falha determinística no PRIMEIRO passo da partida. No modo normal ela fica dormente,
     porque a rota inicial não usa `?auto`; a segunda navegação abre esse caminho sem
     depender de asset, GPU ou tempo de rede. */
  await context.route('**/js/main.js*', async (rota) => {
    const r = await rota.fetch();
    const corpo = await r.text();
    let novo = corpo;
    if (MUTANTE === 'tdz') {
      novo = `void testMode;\n${novo}`;
      mutacaoAplicou = true;
    } else {
      // ancorado no NOME: a lista de parâmetros já mudou uma vez (#489, `online = false`) e cegou a régua
      const inicioPartida = /async function _startGame\([^)]*\) \{/;
      novo = novo.replace(inicioPartida, (m) => `${m}\n  throw new Error('SEGREDO_BOOT_CHECK');`);
      novo = novo.replace("if (testMode && params.get('auto'))", "if (params.get('auto'))");
      if (!novo.includes("throw new Error('SEGREDO_BOOT_CHECK')") || novo === corpo)
        throw new Error('fixture de falha não aplicou em main.js');
      if (MUTANTE === 'sem-amigavel') {
        const chamada = "window.__gameLaunch?.fail(e, 'main.js:startGame');";
        if (!novo.includes(chamada)) throw new Error('mutante sem-amigavel não casou');
        novo = novo.replace(chamada, '/* MUTANTE: recuperação amigável removida */');
        mutacaoAplicou = true;
      }
    }
    await rota.fulfill({ status: 200, contentType: 'application/javascript', body: novo });
  });

  if (MUTANTE === 'vaza-detalhe' || MUTANTE === 'sem-console-watchdog') {
    await context.route(/\/\?auto=E,$/, async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      const novo = MUTANTE === 'vaza-detalhe'
        ? corpo.replace('if (!DEBUG) return;', 'if (false) return; /* MUTANTE */')
        : corpo.replace("try { consoleErroNativo('Falha ao abrir ' + etapa, err); } catch(_) {}", '/* MUTANTE: log nativo removido */');
      if (novo === corpo) throw new Error(`mutante ${MUTANTE} não casou`);
      mutacaoAplicou = true;
      await rota.fulfill({ status: r.status(), headers: r.headers(), body: novo });
    });
  }

  await context.route('**/api/jserror', async (rota) => {
    try { relatorios.push(JSON.parse(rota.request().postData() || '{}')); } catch { relatorios.push({ invalido: true }); }
    await rota.fulfill({ status: 204, body: '' });
  });

  const page = await context.newPage();

  const erros = [];
  const consoleErros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErros.push(m.text()); });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(3500);

  console.log(`RÉGUA DE BOOT${MUTANTE ? `  [MUTAÇÃO: ${MUTANTE}]` : ''}   alvo ${BASE}\n`);

  const b1 = erros.length === 0;
  console.log('B1 · zero pageerror durante o boot');
  if (b1) console.log('   nenhum');
  else for (const e of erros) console.log(`   ${e}`);
  console.log(`   ${b1 ? 'PASSA' : 'FALHA'}\n`);

  /* B2 mede o EFEITO e não a ausência de erro: `pageerror` engolido por um `catch` de
     terceiro deixaria B1 verde com o jogo morto do mesmo jeito. O `onclick` do JOGAR é
     atribuído perto do FIM do main.js — se ele está lá, o módulo avaliou inteiro. */
  const alvo = await page.evaluate(() => {
    const b = document.getElementById('btn-jogar');
    return { existe: !!b, ligado: !!(b && b.onclick) };
  });
  const b2 = alvo.existe && alvo.ligado;
  console.log('B2 · o main.js terminou de avaliar (o JOGAR está ligado)');
  console.log(`   #btn-jogar existe ${alvo.existe}   onclick ligado ${alvo.ligado}`);
  console.log(`   ${b2 ? 'PASSA' : 'FALHA'}\n`);

  let b3 = false, b4 = false, b5 = false, b6 = false, b7 = false;
  if (b1 && b2) {
    erros.length = 0;
    await page.goto(`${BASE}/?auto=E,`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1200);
    const estado = await page.evaluate(() => {
      const modal = document.getElementById('launch-error');
      const card = modal?.querySelector('.launch-error-card');
      const menu = document.getElementById('main-menu');
      const loading = document.getElementById('load-overlay');
      const rect = card?.getBoundingClientRect();
      return {
        modal: !!modal && !modal.classList.contains('hidden'),
        menu: !!menu && !menu.classList.contains('hidden'),
        loading: !!loading && !loading.classList.contains('hidden'),
        tecnico: !!document.getElementById('crash-overlay'),
        vazou: document.body.innerText.includes('SEGREDO_BOOT_CHECK'),
        codigo: document.getElementById('launch-error-code')?.textContent || '',
        retry: document.getElementById('launch-error-retry')?.textContent?.trim() || '',
        report: document.getElementById('launch-error-report')?.textContent?.trim() || '',
        dentro: !!rect && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      };
    });
    b3 = estado.modal && estado.menu && !estado.loading && !estado.tecnico && !estado.vazou
      && /^CÓDIGO [0-9A-F]{8}$/.test(estado.codigo) && estado.retry === 'TENTAR DE NOVO'
      && estado.report === 'REPORTAR ERRO' && estado.dentro;
    console.log('B3 · falha ao abrir a partida recupera para mensagem amigável em 3:2');
    console.log(`   modal ${estado.modal}   menu ${estado.menu}   loading ${estado.loading}   técnico ${estado.tecnico}`);
    console.log(`   detalhe vazou ${estado.vazou}   código ${JSON.stringify(estado.codigo)}   card dentro da tela ${estado.dentro}`);
    console.log(`   ${b3 ? 'PASSA' : 'FALHA'}\n`);

    if (FOTO) await page.screenshot({ path: FOTO, fullPage: false, timeout: 120000 });

    const automaticos = relatorios.length;
    await page.evaluate(() => document.getElementById('launch-error-report')?.click());
    await page.waitForTimeout(350);
    const manual = relatorios.at(-1) || {};
    const confirmacao = await page.evaluate(() => ({
      texto: document.getElementById('launch-error-report')?.textContent?.trim() || '',
      status: document.getElementById('launch-error-status')?.textContent?.trim() || '',
    }));
    b4 = automaticos >= 1 && relatorios.length > automaticos
      && estado.codigo.endsWith(String(manual.fingerprint || '').toUpperCase())
      && /SEGREDO_BOOT_CHECK/.test(manual.message || '')
      && confirmacao.texto === 'RELATÓRIO ENVIADO ✓' && /ajuda a gente/i.test(confirmacao.status);
    console.log('B4 · relatório automático + confirmação manual chegam ao coletor');
    console.log(`   automáticos ${automaticos}   total após confirmação ${relatorios.length}   fingerprint confere ${estado.codigo.endsWith(String(manual.fingerprint || '').toUpperCase())}`);
    console.log(`   botão ${JSON.stringify(confirmacao.texto)}`);
    console.log(`   ${b4 ? 'PASSA' : 'FALHA'}\n`);

    if (b3 && b4) {
      const debug = await context.newPage();
      await debug.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await debug.evaluate(() => console.error(new Error('DETALHE_DEBUG_BOOT_CHECK')));
      await debug.waitForTimeout(100);
      const painel = await debug.locator('#crash-overlay').textContent().catch(() => '');
      b5 = /DEBUG \(console\)/.test(painel || '') && /DETALHE_DEBUG_BOOT_CHECK/.test(painel || '');
      console.log('B5 · ?debug=1 preserva o painel técnico');
      console.log(`   painel técnico ${b5 ? 'visível com o detalhe' : 'ausente ou sem o detalhe'}`);
      console.log(`   ${b5 ? 'PASSA' : 'FALHA'}\n`);
      await debug.close();
    } else {
      console.log('B5 · não medido porque a recuperação amigável já falhou\n');
    }

    const antes = consoleErros.length;
    await page.evaluate(() => {
      window.__gameLaunch?.begin('teste do console', 60000, () => false);
      window.__gameLaunch?.fail(new Error('tempo limite ao abrir teste do console'), 'launch-watchdog');
    });
    await page.waitForTimeout(100);
    const novos = consoleErros.slice(antes);
    b6 = novos.some((m) => /Falha ao abrir teste do console/.test(m) && /tempo limite ao abrir teste do console/.test(m));
    console.log('B6 · timeout do watchdog permanece visível no console');
    console.log(`   ${b6 ? 'erro e stack preservados' : 'nenhum erro correspondente no console'}`);
    console.log(`   ${b6 ? 'PASSA' : 'FALHA'}\n`);

    const watchdogsAntes = relatorios.filter((r) => r.source === 'launch-watchdog').length;
    await page.close();
    const jornada = await context.newPage();
    await jornada.goto(`${BASE}/?nav=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await jornada.locator('#splash-enter:not(.hidden)').waitFor({ timeout: 120000 });
    await jornada.locator('#boot-splash').dispatchEvent('pointerdown');
    await jornada.waitForTimeout(3100);
    const entradaOk = await jornada.locator('#launch-error').evaluate((el) => el.classList.contains('hidden'));
    // SINGLE PLAYER abre os modos contra bots; Mata-mata inicia a jornada padrão.
    await jornada.locator('.cs-item[data-act="single-player"]').click();
    await jornada.locator('.cs-item[data-act="sp"]:visible').click();
    await jornada.evaluate(() => {
      const nick = document.getElementById('nick-input');
      nick.value = 'BOOT_CHECK';
      nick.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await jornada.locator('#ms-continue').click();
    await jornada.locator('#btn-team-c').click();
    await jornada.locator('#char-select:not(.hidden)').waitFor({ timeout: 120000 });
    await jornada.waitForTimeout(3100);
    const menuOk = await jornada.locator('#launch-error').evaluate((el) => el.classList.contains('hidden'));
    const watchdogsDepois = relatorios.filter((r) => r.source === 'launch-watchdog').length;
    b7 = entradaOk && menuOk && watchdogsDepois === watchdogsAntes;
    console.log('B7 · avançar rápido pela entrada e pelo menu não dispara falso timeout');
    console.log(`   entrada ${entradaOk}   menu ${menuOk}   novos watchdogs ${watchdogsDepois - watchdogsAntes}`);
    console.log(`   ${b7 ? 'PASSA' : 'FALHA'}\n`);
    await jornada.close();
  } else {
    console.log('B3–B7 · não medidos porque o boot não concluiu\n');
  }

  const passou = b1 && b2 && b3 && b4 && b5 && b6 && b7 && mutacaoAplicou;
  console.log(passou
    ? '✓ BOOT1  o jogo abre e falhas de entrada têm recuperação amigável, reportável e depurável'
    : '✗ BOOT1  boot ou recuperação de falha não cumpriu o contrato');
  await browser.close(); browser = null;
  derrubaServidor();
  process.exit(passou ? 0 : 1);
} catch (e) {
  console.error('✗ BOOT0  a régua não conseguiu medir:', e.message);
  if (browser) await browser.close().catch(() => {});
  derrubaServidor();
  process.exit(1);
}
