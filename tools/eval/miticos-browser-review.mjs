#!/usr/bin/env node
/* MÍTICOS NO NAVEGADOR DE VERDADE — evidência visual do Lobisomem ponta a ponta.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE

   O `miticos-runtime-review.mjs` sobe a classe `Game` em node puro: mede pose, contato de
   pata e roster, e NÃO vê shader, CSS, textura nem composição de tela. O PR #532 foi
   escrito com essa ressalva ("a revisão continua local, sem navegador"). Este script fecha
   a metade que faltava: Chrome de verdade, GLB carregado por WebGL, e uma figura de cada
   tela onde a facção M aparece — porque nesta base número sem imagem já enganou quatro
   vezes (AGENTS.md, lei 4).

   O QUE ELE MEDE, e por que cada um é asserção e não só captura:

   1. `faccao`   — as SEIS facções na tela, a placa M com brasão, arte e contador de elenco.
   2. `selecao`  — time=M resolve `lobisomem`, o retrato é o avatar próprio (e não o
                   genérico), e a ficha não escreve `undefined`.
   3. `carregando` — o palco 3D do loading roda o GLB do lobo e TROCA de ação. É aqui que
                   mora a régua de BIND POSE: um personagem que não herda clipe fica parado
                   no rest e todo quadro sai igual. Exigimos ≥ 20 quadros distintos e o par
                   `ação:clipe` batendo para run/shoot/crouch/crouchwalk/jump/walkfire — o
                   mesmo contrato que o `screen-query-browser.mjs` já cobra do Time B.
   4. `corpo`    — o CORPO INTEIRO do lobo, animado, capturado do próprio canvas WebGL do
                   palco de carregamento. É a única terceira pessoa que existe para o
                   personagem do jogador: o jogo é FPS e a câmera do jogador nunca sai da
                   cabeça dele; corpo de terceira pessoa só aparece em bot/aliado.
   5. `partida`   — partida VIVA com a plaqueta MÍTICO/MIT e a arma do personagem.
   6. `primeira`  — viewmodel em primeira pessoa (o `weaponOnly` é o padrão — BUG-145).
   7. `vitoria`/`derrota` — os retratos aprovados, com alpha, no lugar.

   ARMADILHA JÁ PAGA, escrita para o próximo não repetir: na rota `?tela=personagem` o
   preview 3D da tela de seleção sai como o BONECO PROCEDURAL de caixas, e isso NÃO é
   defeito do Lobisomem — a rota de inspeção direta não roda o preload dos GLB, então o
   elenco inteiro cai no fallback ali. Conferido lado a lado com `mandrake`, que é
   personagem publicado: mesma tela, mesmo boneco de caixas. Quem quiser o GLB na seleção
   tem de percorrer o funil de verdade. A prova de que o GLB do lobo carrega e ANIMA em
   WebGL é o item 4 aqui, e a régua da pose no caminho da seleção é o `eval:select`.

   O QUE ELE NÃO MEDE (dito alto, para não virar carimbo): não julga se a pelagem está
   bonita, se a pose agrada ou se o retrato é o melhor take. Isso é revisão humana, e
   continua pendente — ver o rodapé do PR #532 e BUG-145/146.

   USO
     npm run dev &                     # ou qualquer servidor do projeto
     BASE=http://localhost:4321 node tools/eval/miticos-browser-review.mjs
     OUT=artifacts/miticos-browser  (padrão)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4321';
const OUT = process.env.OUT || 'artifacts/miticos-browser';
const root = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
// 1536×1024 = 3:2, o formato em que o dono revisa (AGENTS.md)
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem('awpbr_nick', 'REVIEW');
  localStorage.setItem('cs_lang', 'pt');
});

const falhas = [];
const conta = (nome, ok, detalhe) => {
  if (ok) console.log(`✓ ${nome}`);
  else { console.error(`✗ ${nome}: ${JSON.stringify(detalhe)}`); falhas.push(nome); }
};
async function abre(tela, query, seletor, timeout = 240000, navOnly = true) {
  await page.goto(`${BASE}/?tela=${query}&debug=1${navOnly ? '&nav=1' : ''}`, { waitUntil: 'commit', timeout });
  await page.waitForFunction((e) => document.documentElement.dataset.inspectScreen === e, tela, { timeout });
  await page.waitForSelector(seletor, { state: 'visible', timeout });
}

try {
  // ── 1. facção ──────────────────────────────────────────────────────────────────────
  await abre('faction', '02', '#team-select');
  const faccoes = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.team-card')];
    const m = document.getElementById('btn-team-m');
    return {
      total: cards.length,
      ids: cards.map((c) => c.id),
      mNome: m?.querySelector('.team-name')?.textContent,
      mElenco: m?.querySelector('.team-desc')?.textContent,
      mBrasao: m?.querySelector('.team-crest')?.getAttribute('src'),
      mArte: getComputedStyle(m?.querySelector('.team-art')).backgroundImage,
      mVisivel: !!m && m.getBoundingClientRect().width > 0,
    };
  });
  conta('faccao: as seis placas, com MÍTICO visível, brasão e arte próprios',
    faccoes.total === 6 && faccoes.mVisivel && faccoes.mNome === 'MÍTICO'
    && faccoes.mBrasao === '/img/brasoes/m.png' && faccoes.mArte.includes('/img/faccoes/mitico.webp')
    && faccoes.mElenco === 'Lobisomem', faccoes);
  await page.screenshot({ path: `${OUT}/02_faccoes-com-mitico.png` });

  // ── 2. seleção + retrato ───────────────────────────────────────────────────────────
  await abre('character', 'personagem&time=M&char=lobisomem', '#char-select');
  const selecao = await page.evaluate(() => ({
    avatar: document.querySelector('.char-row.sel img')?.getAttribute('src'),
    nome: document.getElementById('char-info-name')?.textContent,
    ficha: document.getElementById('char-attrs')?.textContent,
    linhas: document.querySelectorAll('.char-row').length,
  }));
  conta('selecao: Lobisomem com avatar próprio e ficha sem undefined',
    selecao.avatar?.includes('/avatars/lobisomem.webp') && selecao.nome?.toUpperCase().includes('LOBISOMEM')
    && !selecao.ficha?.includes('undefined') && selecao.linhas === 1, selecao);
  await page.screenshot({ path: `${OUT}/03_selecao-lobisomem.png` });

  // ── 3. palco 3D do loading: TROCA DE AÇÃO e BIND POSE ──────────────────────────────
  await abre('loading', 'loading&time=M&map=praca_poderes', '#load-overlay');
  await page.waitForFunction(() => document.getElementById('load-character-3d')?.dataset.ready === '1', null, { timeout: 240000 });
  const vivo = await page.evaluate(async () => {
    const canvas = document.getElementById('load-character-3d');
    const acoes = [], clipes = [], pares = [], quadros = [];
    for (let i = 0; i < 44; i++) {
      await new Promise((r) => requestAnimationFrame(() => {
        acoes.push(canvas.dataset.action); clipes.push(canvas.dataset.clip);
        pares.push(`${canvas.dataset.action}:${canvas.dataset.clip}`);
        quadros.push(canvas.toDataURL('image/png'));
        r();
      }));
      await new Promise((r) => setTimeout(r, 220));
    }
    return {
      personagem: canvas.dataset.character,
      acoes: [...new Set(acoes.filter(Boolean))],
      clipes: [...new Set(clipes.filter(Boolean))],
      pares: [...new Set(pares.filter((p) => !p.startsWith(':') && !p.endsWith(':')))],
      distintos: new Set(quadros).size,
      transparente: getComputedStyle(canvas).backgroundColor === 'rgba(0, 0, 0, 0)',
    };
  });
  /* BIND POSE: `distintos` é a régua. Um personagem sem clipe próprio (ou com clipe que o
     runtime não aplica) fica congelado no rest e os 44 quadros saem idênticos — foi
     exatamente o modo de falha que o `retarget-glb.mjs` produzia quando gravava GLB sem
     nenhuma track. 20 é metade do teto do Time B (30 no screen-query-browser) porque este
     palco é menor; qualquer coisa acima de 1 já prova que não é bind, e 20 dá margem. */
  const paresEsperados = ['run:run', 'shoot:shoot', 'crouch:crouch', 'crouchwalk:crouchwalk', 'jump:jump', 'walkfire:walkfire'];
  conta('carregando: o lobo usa clipes PRÓPRIOS e troca de ação (não herda bind pose)',
    vivo.personagem === 'lobisomem' && vivo.distintos >= 20
    && paresEsperados.every((p) => vivo.pares.includes(p))
    && vivo.clipes.some((c) => c.startsWith('idle')) && vivo.transparente, vivo);
  await page.screenshot({ path: `${OUT}/00_loading-lobisomem.png` });

  /* ── 4. o CORPO, de perto ─────────────────────────────────────────────────────────
     A tela inteira mostra o lobo com 86×144 css px num canto; para revisão humana isso é
     pequeno demais para julgar pose, pata e mão. Captura o elemento do canvas sozinho,
     em cada ação, que é o que dá para OLHAR (AGENTS.md, lei 4). */
  const palco = page.locator('#load-character-3d');
  for (const alvo of ['run', 'ready', 'shoot', 'crouch', 'jump']) {
    await page.waitForFunction((a) => document.getElementById('load-character-3d')?.dataset.action === a,
      alvo, { timeout: 60000 }).catch(() => {});
    await palco.screenshot({ path: `${OUT}/01_corpo-${alvo}.png` });
  }
  console.log('✓ corpo: canvas do palco 3D capturado em run/ready/shoot/crouch/jump');

  // ── 5. partida viva ────────────────────────────────────────────────────────────────
  await abre('hud', 'hud&map=praca_poderes&time=M&char=lobisomem', '#hud', 240000, false);
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  const partida = await page.evaluate(() => {
    const g = window.__game;
    return {
      time: g._teamName(g.playerTeam), tag: g._teamTag(g.playerTeam),
      faccao: g.playerFaction, char: g.playerCharId, estado: g.state,
      arma: document.getElementById('wpn-name')?.textContent
        || document.querySelector('.hud-wpn-name')?.textContent || null,
      vida: document.getElementById('hp-num')?.textContent,
    };
  });
  conta('partida: viva, plaqueta MÍTICO/MIT e o Lobisomem com a arma dele',
    partida.time === 'MÍTICO' && partida.tag === 'MIT' && partida.faccao === 'M'
    && partida.char === 'lobisomem' && partida.estado === 'live' && partida.vida === '100', partida);
  await page.screenshot({ path: `${OUT}/05_partida-viva.png` });

  // ── 5. primeira pessoa (viewmodel + luva M) ────────────────────────────────────────
  await abre('hud', 'hud&vmlab=1&map=praca_poderes&time=M&char=lobisomem', '#hud', 240000, false);
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  const primeira = await page.evaluate(() => ({
    vm: !!window.__game?._vmlab?.group?.visible,       // mesmo handle do screen-query-browser
    mira: getComputedStyle(document.getElementById('crosshair')).display,
    somenteArma: window.__game?._weaponOnly ?? null,
  }));
  conta('primeira pessoa: viewmodel e mira em pé (weaponOnly é o padrão — BUG-145)',
    primeira.vm && primeira.mira !== 'none' && primeira.somenteArma === true, primeira);
  await page.screenshot({ path: `${OUT}/05_hud-primeira-pessoa.png` });

  // ── 6. retratos de resultado ───────────────────────────────────────────────────────
  for (const [tela, query, seletor, arquivo] of [
    ['victory', 'vitoria&time=M&char=lobisomem', '#match-end.win', '09_vitoria-lobisomem'],
    ['defeat', 'derrota&time=M&char=lobisomem', '#match-end.lose', '09_derrota-lobisomem'],
  ]) {
    await abre(tela, query, seletor);
    const r = await page.evaluate(() => {
      const hero = document.getElementById('me-hero');
      return {
        titulo: document.getElementById('match-title')?.textContent,
        arte: hero?.style.getPropertyValue('--me-art'),
        /* O alpha mora NO WEBP, não numa máscara de CSS: `maskImage` tem de ser `none`.
           É o mesmo contrato que o `screen-query-browser.mjs` cobra do `mst`, e é o que
           os invariantes UIR19/UIA1 mediram nos 88 retratos aprovados. */
        mascara: getComputedStyle(hero).maskImage,
        tamanho: getComputedStyle(hero).backgroundSize,
        posicao: getComputedStyle(hero).backgroundPosition,
        caixa: (() => { const b = hero.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; })(),
      };
    });
    conta(`${tela}: retrato do Lobisomem enquadrado como o resto do elenco`,
      r.arte?.includes(`lobisomem-${tela === 'victory' ? 'vitoria' : 'derrota'}.webp`)
      && r.mascara === 'none' && r.tamanho === 'contain' && r.posicao === '100% 100%'
      && r.caixa.every((v) => v > 0), r);
    await page.screenshot({ path: `${OUT}/${arquivo}.png` });
  }
} finally {
  await browser.close();
}

if (pageErrors.length) { console.error(`✗ ${pageErrors.length} pageerror: ${pageErrors.join(' · ')}`); falhas.push('pageerror'); }
console.log(`\nfiguras em ${OUT}/`);
if (falhas.length) { console.error(`\n✗ ${falhas.length} reprovação(ões): ${falhas.join(', ')}`); process.exit(1); }
console.log('\n✓ Míticos no navegador: facção, seleção, retrato, loading 3D, terceira e primeira pessoa, vitória e derrota.');
