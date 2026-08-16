/* console-check.mjs — NENHUMA ROTA DO SITE CUSPE ERRO NO CONSOLE.
   ═══════════════════════════════════════════════════════════════════════════════════
   O CASO QUE COMPROU ESTA RÉGUA (07/08, achado EM PRODUÇÃO)

   O botão JOGAR ficou INERTE: `main.js` morria num TDZ na linha 483 e nada depois dela
   era ligado (BUG-34). O site respondia 200, o `astro build` passava, o `check:fast`
   inteiro passava, e o `npm run syntax` passava — TDZ é erro de runtime, não de parse.
   O sinal existia e ninguém o coletava: UMA linha no console.

   O `boot-check.mjs` fechou o caso específico da rota `/`. Esta fecha a CLASSE: erro de
   console em QUALQUER rota publicada, não só na home.

   ── AS CINCO PERGUNTAS (SKILL.md da `regua`) ─────────────────────────────────────
   1. QUAL DEFEITO ELA PREMIA? Um site que não carrega nada dá zero erro de console.
      Por isso a régua NÃO se contenta com "zero erros": cada rota tem que provar que
      CARREGOU (`C2`, âncora de DOM declarada por rota). Sem isso, apagar o `main.js`
      deixaria esta régua VERDE — o modo de falha por vacuidade que a casa já pagou no
      `obb-check`.
   2. MESMO MUNDO? Sim: Chrome de verdade contra o `astro dev`. Erro de módulo não
      existe em node — o `harness.mjs` importa `game.js` direto e nunca passa pelo
      `main.js`, que é a casca que liga o menu. Foi por essa fresta que o BUG-34 passou.
   3. LIMIAR COMPARTILHADO? O teto é ZERO erro, e é o mesmo do `boot-check.mjs` (B1).
      Quem quiser abrir exceção põe em `IGNORADOS`, aqui, com motivo escrito — e a lista
      aparece no relatório, para dívida declarada não virar dívida esquecida.
   4. COMO FALHA QUANDO NÃO SABE MEDIR? Rota que não responde, âncora que não aparece ou
      navegador que não sobe é VERMELHO, não "pulada". Não saber custa o mesmo que estar
      errado — é a lição do `gen-docs` que devolveu `null` e publicou licença errada.
   5. ORÇAMENTO? ~20 s para as rotas. Exige browser, então fica FORA do `check` (que roda
      sem browser) e ao lado do `eval:boot`, como passo antes de deploy.

   ── A MUTAÇÃO (executada) ────────────────────────────────────────────────────────
     --mutante=erro     injeta `throw` num script servido -> C1 vermelha na rota
     --mutante=vazio    troca o corpo do main.js por nada -> C2 vermelha (a prova de que
                        a régua não passa por vacuidade quando a página não carrega)
   As duas ABORTAM se o replace não casar: mutação que não aplica é confiança falsa por
   escrito, e essa a casa já pagou uma vez.

   USO
     node tools/eval/console-check.mjs
     node tools/eval/console-check.mjs --mutante=erro
     BASE=https://www.csbrasil.online node tools/eval/console-check.mjs
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const PORTA = Number(val('porta', 4321));
const EXTERNO = !!process.env.BASE;
const BASE = process.env.BASE || `http://localhost:${PORTA}`;

/* AS ROTAS, e a ÂNCORA que prova que cada uma carregou. A âncora é decisão humana (só
   quem conhece a página sabe o que nela significa "carregou"); o resto é medido. */
const ROTAS = [
  { url: '/', ancora: '#btn-jogar', nome: 'jogo' },
  { url: '/sobre', ancora: 'h2', nome: 'sobre' },
  { url: '/armas', ancora: 'img', nome: 'armas' },
  { url: '/mapas', ancora: 'h1', nome: 'mapas' },
  { url: '/personagens', ancora: 'h1', nome: 'personagens' },
  { url: '/como-jogar', ancora: 'h1', nome: 'como jogar' },
];

/* DÍVIDA DECLARADA, não silenciosa: erro de terceiro que não dá para consertar entra
   aqui com motivo, e o relatório imprime a lista toda vez. Vazio é o estado bom. */
const IGNORADOS = [
  /* SÓ VALE LOCALMENTE, e a condição é o ponto. Sem `SUPABASE_SERVICE_ROLE` na máquina,
     `/api/presence` e `/api/online` respondem 503 (`NOT_CONFIGURED`) e o Chrome loga o
     503 sozinho — não é código nosso, e não é defeito: é máquina de dev sem segredo.
     Contra PRODUÇÃO (`BASE=...`) esta linha NÃO se aplica, porque lá 503 na própria API
     é exatamente o que se quer descobrir. Medido em 07/08: produção deu 0 erro na `/`,
     local deu 2 — a diferença é o segredo, não o site. */
  { padrao: /503 \(Service Unavailable\)/, motivo: 'API sem SUPABASE_* na máquina local', soLocal: true },
];
const ignorado = (m) => IGNORADOS.find((i) => i.padrao.test(m) && (!i.soLocal || !EXTERNO));

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

let browser;
try {
  if (!(await sobeServidor())) {
    console.error(`✗ CONSOLE0  o site não subiu em ${BASE} (90 s de espera) — a régua não conseguiu medir`);
    process.exit(1);
  }
  const gRoot = execSync('npm root -g').toString().trim();
  const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = _pw.chromium || _pw.default?.chromium;
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
  });

  console.log(`RÉGUA DE CONSOLE${MUTANTE ? `  [MUTAÇÃO: ${MUTANTE}]` : ''}   alvo ${BASE}\n`);

  const linhas = [];
  for (const r of ROTAS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const erros = [];
    page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(`console.error: ${m.text()}`); });

    /* AS MUTAÇÕES. Interceptam o JS servido — o arquivo em disco não é tocado —, e cada
       uma ABORTA se o replace não casar (`aplicou`), porque mutação que não aplica dá
       verde e parece que o guarda funcionou. */
    if (MUTANTE) {
      await page.route('**/js/main.js*', async (rota) => {
        const resp = await rota.fetch();
        const corpo = await resp.text();
        let novo;
        if (MUTANTE === 'erro') novo = `throw new Error('MUTANTE console-check');\n${corpo}`;
        else if (MUTANTE === 'vazio') novo = '/* MUTANTE: main.js esvaziado */\n';
        else { console.error(`✗ CONSOLE0  mutante desconhecido: ${MUTANTE}`); process.exit(1); }
        if (novo === corpo) { console.error('✗ CONSOLE0  MUTANTE NÃO APLICOU — o replace não casou'); process.exit(1); }
        await rota.fulfill({ status: 200, contentType: 'application/javascript', body: novo });
      });
    }

    let ancoraOk = false, motivo = '';
    try {
      /* UMA RETENTATIVA, e ela existe por defeito medido: numa rodada de 07/08 quatro
         rotas "não carregaram" e a causa era o servidor ter CAÍDO no meio — corrida do
         `astro dev stop` desta mesma régua com a execução anterior. Régua que acusa a
         página quando quem morreu foi o instrumento é pior que régua nenhuma (lei 7 da
         `bug-hunt`). Antes de retentar, confirma que o alvo ainda responde; se não
         responder, sobe de novo — e se ainda assim falhar, aí sim é vermelho da rota. */
      /* `commit` E NÃO `domcontentloaded`, e a diferença custou uma rodada inteira de
         diagnóstico errado. Script de módulo é DEFERIDO, e script deferido **segura o
         DOMContentLoaded** até terminar de avaliar. O `site-bg.js` constrói o mapa da
         Brasília inteiro no topo do módulo, então esperar aquele evento é esperar o
         3D ficar pronto — 30 s no dev, com as rotas respondendo 200 em 0,1 s (medido).
         A régua acusava "a rota não carregou" quando a rota tinha carregado e o fundo
         é que era pesado. O que interessa aqui é o CONTEÚDO estar na tela; quem mede
         peso de fundo 3D é outra régua. */
      let resp = null;
      for (let tentativa = 0; tentativa < 2; tentativa++) {
        try {
          resp = await page.goto(BASE + r.url, { waitUntil: 'commit', timeout: 30000 });
          break;
        } catch (e) {
          if (tentativa === 1) throw e;
          if (!(await noAr())) await sobeServidor();
        }
      }
      if (!resp || resp.status() >= 400) motivo = `HTTP ${resp ? resp.status() : '(sem resposta)'}`;
      /* C2: a âncora é o que separa "sem erro" de "sem página". Sem ela, apagar o JS
         inteiro deixaria a régua verde — vacuidade é o modo de falha clássico daqui. */
      try { await page.waitForSelector(r.ancora, { timeout: 15000, state: 'attached' }); } catch { /* vira ancoraOk=false abaixo */ }
      await page.waitForTimeout(2500);   // janela para o erro tardio aparecer no console
      ancoraOk = await page.evaluate((sel) => !!document.querySelector(sel), r.ancora);
      if (!ancoraOk && !motivo) motivo = `âncora \`${r.ancora}\` não apareceu em 15 s`;
    } catch (e) {
      motivo = e.message.slice(0, 120);
    }
    await page.close();

    const reais = erros.filter((m) => !ignorado(m));
    const perdoados = erros.filter((m) => ignorado(m));
    linhas.push({ ...r, erros: reais, perdoados, ancoraOk, motivo });
  }

  console.log('C1 · zero erro de console por rota  ·  C2 · a rota realmente carregou');
  let c1 = true, c2 = true;
  for (const l of linhas) {
    const okErro = l.erros.length === 0;
    if (!okErro) c1 = false;
    if (!l.ancoraOk) c2 = false;
    console.log(`   ${l.url.padEnd(13)} ${String(l.erros.length).padStart(2)} erro(s)   carregou ${l.ancoraOk ? 'sim' : `NÃO (${l.motivo})`}`);
    for (const e of l.erros.slice(0, 4)) console.log(`        ${e.slice(0, 150)}`);
    if (l.erros.length > 4) console.log(`        (+${l.erros.length - 4})`);
    for (const p of l.perdoados) console.log(`        [ignorado: ${ignorado(p).motivo}] ${p.slice(0, 90)}`);
  }
  console.log(`   C1 ${c1 ? 'PASSA' : 'FALHA'}   C2 ${c2 ? 'PASSA' : 'FALHA'}\n`);

  if (IGNORADOS.length) {
    console.log(`dívida declarada: ${IGNORADOS.length} padrão(ões) na lista IGNORADOS de tools/eval/console-check.mjs`);
    for (const i of IGNORADOS) console.log(`   ${i.padrao} — ${i.motivo}`);
    console.log('');
  }

  const passou = c1 && c2;
  console.log(passou
    ? `✓ CONSOLE1  as ${ROTAS.length} rotas carregam sem erro de console`
    : '✗ CONSOLE1  rota publicada com erro de console (ou que não carregou). Um erro de console já significou o jogo NÃO ABRIR com o site respondendo 200 — ver BUG-34. Abra a rota no navegador e leia a primeira linha: o resto costuma ser consequência dela.');
  await browser.close(); browser = null;
  derrubaServidor();
  process.exit(passou ? 0 : 1);
} catch (e) {
  console.error('✗ CONSOLE0  a régua não conseguiu medir:', e.message);
  if (browser) await browser.close().catch(() => {});
  derrubaServidor();
  process.exit(1);
}
