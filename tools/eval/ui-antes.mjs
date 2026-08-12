/* ui-antes.mjs — fotografa as telas como elas estão HOJE, pra servir de "antes" do redesenho.
   ═══════════════════════════════════════════════════════════════════════════════════
   Duas partes, e a segunda nasceu no bloco 2:

   FLUXO DE MENU (00-05)   splash, menu, mapa, facção, personagem. Existe porque o
                           g2ui-verify não passa do gate de clique da splash.
   TELAS DE PARTIDA (06-16) HUD, killfeed, luneta, banner, placar, respawn, pausa, fim,
                           e os quatro painéis. Existem porque o bloco 1 mediu SÓ o menu:
                           as telas que o jogador olha durante a partida inteira nunca
                           tinham sido fotografadas — e o que não se fotografa se redesenha
                           de memória (foi o erro corrigido em 77eda54).

   O caminho pra dentro da partida é o mesmo do g2ui-verify.mjs:78 — `?debug=1&auto=...`
   sobe a partida sozinha, e `window.__game` dá o resto (banner, placar, morte, pausa).
   Cada estado é montado por chamada direta ao jogo, não por sorte de gameplay: régua que
   depende de um bot atirar na hora certa é régua que falha em dia de CI lento.

   Uso: BASE=http://127.0.0.1:8123 node tools/eval/ui-antes.mjs   (saída em /tmp/ui-antes)
        W=1280 H=720 OUT=/tmp/ui-antes-720 node tools/eval/ui-antes.mjs
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { mkdirSync, readFileSync } from 'node:fs';
import { abreChrome } from './lib/browser.mjs';

const OUT = process.env.OUT || '/tmp/ui-antes';
const BASE = process.env.BASE || 'http://localhost:4399';
mkdirSync(OUT, { recursive: true });

/* SANIDADE: o BASE está servindo ESTA árvore?
   Custou uma bateria inteira de capturas descobrir que não. Havia um `serve.mjs` de OUTRO
   worktree já escutando a porta padrão; o meu não subiu (EADDRINUSE), o script conectou
   feliz e fotografou 18 telas de um checkout diferente. Nada no output denunciava: as
   fotos saíram bonitas, com nomes de facção que este branch não tem.
   Uma régua que fotografa a árvore errada em silêncio é pior que régua nenhuma - ela
   produz evidência convincente e falsa. Aqui a prova é barata: um marcador tirado do
   index.astro LOCAL em tempo de execução tem que aparecer no HTML servido. */
{
  const html = await fetch(BASE).then(r => r.text()).catch((e) => {
    throw new Error(`BASE ${BASE} não respondeu: ${e.message}\n  suba com: node tools/eval/serve.mjs <porta>`);
  });
  const servido = html.match(/<meta name="eval-cwd" content="([^"]*)">/)?.[1];
  if (servido !== process.cwd())
    throw new Error(
      `${BASE} não está servindo esta árvore.\n` +
      `  servindo:  ${servido || '(sem marcador - servidor antigo ou outro processo)'}\n` +
      `  esperado:  ${process.cwd()}\n` +
      '  provável: outro worktree já ocupa essa porta (ids de index.astro são quase iguais\n' +
      '  entre irmãos, então a foto sai plausível e errada). Suba o seu numa porta livre:\n' +
      '    node tools/eval/serve.mjs 8137   e   BASE=http://127.0.0.1:8137 ...',
    );
}

const browser = await abreChrome();
const W = +(process.env.W || 1536), H = +(process.env.H || 1024);
/* pt-BR explícito. O i18n resolve `cs_lang` > navigator.language (public/js/i18n.js:16-18) e
   o Playwright abre em en-US: sem isto a tela de fim saía "DEFEAT / PLAY AGAIN". Não é só
   idioma errado na foto - o texto em inglês é MAIS CURTO, então toda medição de quebra de
   linha, largura de botão e altura de cartão mentiria sobre o jogo que o público joga. */
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'pt-BR' });
page.on('pageerror', (e) => console.log('  [erro de página]', e.message));

const tiro = async (nome) => { await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${nome}.png` }); console.log('  ->', nome); };

// nick vem do localStorage no boot; semear aqui destrava o JOGAR sem abrir o painel de setup
await page.addInitScript(() => {
  localStorage.setItem('awpbr_nick', 'CORO_TESTE');
  localStorage.setItem('cs_lang', 'pt');
});
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
await tiro('00-splash');

// atravessa o gate da splash (centro da tela: 760,500 fixo saía do viewport em 1280x720)
await page.mouse.click(W / 2, H / 2);
await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 30000 });
await page.waitForTimeout(2500);
await tiro('01-menu');


// cartaz do mapa abre a tela cheia de mapa
const thumb = await page.$('#map-thumb');
if (thumb) { await page.$eval('#map-thumb', el => el.click()); await page.waitForTimeout(1200); await tiro('02-mapa'); const back = await page.$('#ms-back'); if (back) { await page.$eval('#ms-back', el => el.click()); await page.waitForTimeout(800); } }

// JOGAR -> facção -> personagem
const jogar = await page.$('#btn-jogar');
if (jogar) {
  await page.$eval('#btn-jogar', el => el.click());
  await page.waitForTimeout(1500);
  await tiro('03-faccao');
  const teamE = await page.$('#btn-team-e');
  if (teamE) {
    await page.$eval('#btn-team-e', el => el.click()); await page.waitForTimeout(1200);
    await tiro('04-faccao-inimiga');
    const teamB = await page.$('#btn-team-b');
    if (teamB) { await page.$eval('#btn-team-b', el => el.click()); await page.waitForTimeout(2500); await tiro('05-personagem'); }
  }
}
/* ═══════════════════ TELAS DE PARTIDA (bloco 2) ═══════════════════ */

// um estado que não monta não pode derrubar os outros: a foto seguinte ainda importa
const cena = async (nome, montar) => {
  try { await montar(); await tiro(nome); }
  catch (e) { console.log(`  !! ${nome} não montou:`, e.message.split('\n')[0]); }
};

const entraNaPartida = async () => {
  await page.goto(`${BASE}/?debug=1&auto=E,mst&map=piscina_treta`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(1200);
};

await entraNaPartida();
await tiro('06-hud');

await cena('07-killfeed', () => page.evaluate(() => {
  const g = window.__game;
  const bot = (name, team) => ({ name, team, isPlayer: false });
  const me = { name: 'VOCÊ', team: 'E', isPlayer: true };
  g._feed(bot('Funkeiro', 'B'), bot('Sindicalista', 'E'), 'FRAG');
  g._feed(bot('Metaleiro', 'U'), bot('Caminhoneiro', 'B'), 'FACA');
  g._feed(bot('Doutora', 'E'), bot('Sertanejo', 'B'), 'DE');
  g._feed(bot('Coach', 'B'), bot('Punk', 'U'), 'AWP', true);
  g._feed(me, bot('Rapper', 'U'), 'AK', true);
  g._feed(bot('Clubber', 'U'), me, 'MP5');
}));

await cena('08-luneta', async () => { await page.evaluate(() => window.__game._scope(true, true)); await page.waitForTimeout(500); });
await page.evaluate(() => window.__game._scope(false, true)).catch(() => {});

await cena('09-banner', () => page.evaluate(() => window.__game._banner('VALENDO!', 'a rodada decide a partida')));
await page.waitForTimeout(3200);   // o banner se apaga sozinho em 3 s; não deixar vazar pra próxima foto

await cena('10-placar', async () => { await page.evaluate(() => window.__game._showScoreboard(true)); await page.waitForTimeout(400); });
await page.evaluate(() => window.__game._showScoreboard(false)).catch(() => {});

// morte do jogador: acende #respawn-overlay com a contagem correndo
await cena('11-respawn', async () => {
  await page.evaluate(() => {
    const g = window.__game;
    const algoz = g.combatants.find(c => !c.isPlayer && c.team !== g.playerTeam) || g.combatants[0];
    g._kill(g.player, algoz, 'AWP', true);
  });
  await page.waitForTimeout(700);
});

await cena('12-pausa', async () => {
  await page.evaluate(() => { window.__game.testMode = false; window.__game.setPaused(true); });
  await page.waitForSelector('#pause-menu:not(.hidden)', { timeout: 5000 });
});
await page.evaluate(() => window.__game.setPaused(false)).catch(() => {});

await cena('13-fim-de-partida', async () => {
  await page.evaluate(() => window.__game._endMatch());
  await page.waitForSelector('#match-end:not(.hidden)', { timeout: 5000 });
});

/* ═══════════════════ PAINÉIS (bloco 2) ═══════════════════ */

await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.mouse.click(W / 2, H / 2);
await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 30000 });
await page.waitForTimeout(1500);

const painel = async (nome, seletorAbre, painelId) => {
  await cena(nome, async () => {
    await page.$eval(seletorAbre, el => el.click());
    await page.waitForSelector(`#${painelId}:not(.hidden)`, { timeout: 5000 });
    await page.waitForTimeout(700);
  });
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
};

await painel('14-config', '[data-act="config"]', 'settings-panel');
await painel('15-ranking', '[data-act="ranking"]', 'ranking-panel');
await painel('16-feedback', '[data-act="feedback"]', 'feedback-panel');
await painel('17-como-jogar', '#btn-howto', 'howto-panel');

await browser.close();
console.log(`pronto: ${OUT}  (${W}x${H})`);
