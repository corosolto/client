#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4321';
const OUT = process.env.OUT || '/tmp/screen-query-browser';
const root = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem('awpbr_nick', 'EMERSON');
  localStorage.setItem('cs_lang', 'pt');
});

async function abrirModosLocais() {
  /* MATA-MATA e CTF vivem num SUBMENU desde `009c87da` — `SINGLE PLAYER` deixou de ser um
     degrau e virou o interruptor de `#cs-modos`, que nasce `hidden`. Este portão continuava
     clicando `[data-act="sp"]` direto e morria em timeout de 30 s ("element is not visible"),
     sem chegar em nenhuma das telas que ele existe para medir. Abrir o submenu é o caminho
     do jogador, não um atalho: `aria-expanded` é conferido nos dois sentidos para que um
     submenu que pare de abrir REPROVE aqui em vez de virar timeout mudo. */
  const gatilho = '.cs-item[data-act="single-player"]';
  if (await page.getAttribute(gatilho, 'aria-expanded') !== 'false') throw new Error('submenu de modos já nasce aberto: `aria-expanded` não é o estado do `#cs-modos`');
  await page.click(gatilho);
  await page.waitForSelector('#cs-modos', { state: 'visible', timeout: 30000 });
  if (await page.getAttribute(gatilho, 'aria-expanded') !== 'true') throw new Error('submenu de modos abriu sem anunciar `aria-expanded=true`');
}

async function open(screen, query, selector, timeout = 120000, navigationOnly = true) {
  await page.goto(`${BASE}/?tela=${query}&debug=1${navigationOnly ? '&nav=1' : ''}`, { waitUntil: 'commit', timeout });
  await page.waitForFunction((expected) => document.documentElement.dataset.inspectScreen === expected, screen, { timeout });
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

try {
  for (const target of [
    ['splash', '00', '#boot-splash', '00_splash-direto'],
    ['menu', '01', '#main-menu', '01_menu-direto'],
    ['faction', '02', '#team-select', '02_faccao-direto'],
    ['character', '03&time=E&char=mst', '#char-select', '03_personagem-direto'],
    ['settings', '07', '#settings-panel', '07_config-direto'],
  ]) {
    await open(target[0], target[1], target[2]);
    if (target[0] === 'splash') {
      await page.waitForSelector('#splash-enter:not(.hidden)', { state: 'visible', timeout: 120000 });
      await page.waitForFunction(() => document.getElementById('load-character-3d')?.dataset.ready === '1', null, { timeout: 240000 });
    }
    if (target[0] === 'settings') {
      const settings = await page.evaluate(() => ({
        quality: document.getElementById('set-quality')?.value,
        label: document.getElementById('set-quality')?.selectedOptions[0]?.textContent,
        panelWidth: Math.round(document.querySelector('#settings-panel .settings-wrap')?.getBoundingClientRect().width || 0),
        invertVertical: !!document.getElementById('set-invert-y'),
      }));
      if (settings.quality !== 'high' || settings.label !== 'Padrão ouro' || settings.panelWidth !== 980 || !settings.invertVertical) {
        throw new Error(`configuração direta inválida: ${JSON.stringify(settings)}`);
      }
      await page.click('.set-tab[data-tab="controls"]');
      await page.click('label:has(#set-invert-y) .set-toggle b');
      const invertSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('awpbr_settings') || '{}').invertY);
      if (invertSaved !== true) throw new Error('inversão vertical não persistiu');
      await page.click('label:has(#set-invert-y) .set-toggle b');
    }
    await page.screenshot({ path: `${OUT}/${target[3]}.png` });
    console.log(`✓ ${target[0]} direto`);
  }

  const wallpaperViewports = [
    [1920, 1080, '16x9'], [1536, 1024, '3x2'], [1024, 768, '4x3'],
    [2560, 1080, 'ultrawide'], [390, 844, 'mobile'],
  ];
  for (const [width, height, label] of wallpaperViewports) {
    await page.setViewportSize({ width, height });
    await open('menu', '01', '#main-menu');
    const wallpaper = await page.evaluate(() => {
      const wall = document.querySelector('#main-menu .cs-wallpaper');
      const primary = getComputedStyle(wall, '::after');
      const fill = getComputedStyle(wall, '::before');
      const rect = wall.getBoundingClientRect();
      return {
        frame: [Math.round(rect.width), Math.round(rect.height)],
        primarySize: primary.backgroundSize,
        primaryRepeat: primary.backgroundRepeat,
        primaryImage: primary.backgroundImage,
        fillSize: fill.backgroundSize,
        fillRepeat: fill.backgroundRepeat,
        fillImage: fill.backgroundImage,
      };
    });
    const isThreeTwo = label === '3x2';
    const expectedPrimarySize = isThreeTwo ? 'cover' : 'contain';
    const expectedPath = isThreeTwo ? '/img/walls-3x2/wall-' : '/img/wall-';
    if (wallpaper.frame.join('x') !== `${width}x${height}` || wallpaper.primarySize !== expectedPrimarySize
      || wallpaper.primaryRepeat !== 'no-repeat' || wallpaper.fillSize !== 'cover'
      || wallpaper.fillRepeat !== 'no-repeat' || !wallpaper.primaryImage.includes(expectedPath)
      || wallpaper.primaryImage !== wallpaper.fillImage) {
      throw new Error(`wallpaper ${label} inválido: ${JSON.stringify(wallpaper)}`);
    }
    await page.screenshot({ path: `${OUT}/01_menu-wall-${label}.png` });
  }
  await page.setViewportSize({ width: 1536, height: 1024 });
  console.log('✓ wallpaper inteiro em todos os formatos e variante cheia dedicada no 3:2');

  await open('menu', '01', '#main-menu');
  const menuProfile = await page.evaluate(() => {
    const version = document.getElementById('mf-ver');
    const versionStyle = getComputedStyle(version);
    const versionRect = version.getBoundingClientRect();
    return {
      avatar: getComputedStyle(document.getElementById('pp-avatar')).backgroundImage,
      avatarText: document.getElementById('pp-avatar').textContent,
      support: document.querySelector('.cs-item[data-act="feedback"]')?.textContent.trim(),
      version: {
        text: version.textContent,
        position: versionStyle.position,
        right: parseFloat(versionStyle.right),
        bottom: parseFloat(versionStyle.bottom),
        rightGap: innerWidth - versionRect.right,
        bottomGap: innerHeight - versionRect.bottom,
      },
    };
  });
  if (!menuProfile.avatar.includes('/img/chars/avatars/') || menuProfile.avatarText || menuProfile.support !== '▸ENVIE SEU FEEDBACK'
    || !menuProfile.version.text.startsWith('CORO SOLTO v') || menuProfile.version.position !== 'fixed'
    || Math.abs(menuProfile.version.right - menuProfile.version.rightGap) > 1
    || Math.abs(menuProfile.version.bottom - menuProfile.version.bottomGap) > 1) {
    throw new Error(`perfil/suporte do menu inválido: ${JSON.stringify(menuProfile)}`);
  }
  const registeredMaps = await page.evaluate(async () => (await import('/js/maps.js')).MAP_IDS.length);
  // SINGLE PLAYER abre os modos locais; MATA-MATA é o primeiro deles (ver abrirModosLocais)
  await abrirModosLocais();
  await page.click('.cs-item[data-act="sp"]');
  await page.waitForSelector('#map-screen', { state: 'visible' });
  const modeMap = await page.evaluate(() => ({
    mode: document.getElementById('setup-title')?.textContent,
    cards: document.querySelectorAll('#ms-strip .ms-thumb').length,
    full: !document.getElementById('map-screen')?.classList.contains('hidden'),
    rounds: document.getElementById('ms-rounds')?.value,
  }));
  if (modeMap.mode !== 'MATA-MATA' || modeMap.cards !== registeredMaps || !modeMap.full || modeMap.rounds !== '5') throw new Error(`Mata-mata não entrou pelo catálogo: ${JSON.stringify({ registeredMaps, ...modeMap })}`);
  await page.selectOption('#ms-wpn-mode', 'awp');
  await page.selectOption('#ms-players', '6');
  await page.selectOption('#ms-rounds', '7');
  const dmOptions = await page.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem('awpbr_settings') || '{}'),
    meta: document.getElementById('ms-meta')?.textContent,
    selected: [
      document.getElementById('ms-wpn-mode')?.value,
      document.getElementById('ms-players')?.value,
      document.getElementById('ms-rounds')?.value,
    ],
  }));
  if (dmOptions.selected.join('/') !== 'awp/6/7' || dmOptions.stored.wpnMode !== 'awp'
    || dmOptions.stored.bots !== 6 || dmOptions.stored.rounds !== 7 || !dmOptions.meta?.includes('7 ROUNDS')) {
    throw new Error(`opções Mata-mata não persistiram: ${JSON.stringify(dmOptions)}`);
  }
  await page.screenshot({ path: `${OUT}/01_mata-mata-abre-mapas.png` });
  await open('menu', '01', '#main-menu');
  /* CTF pelos DOIS caminhos, porque os dois existem e já divergiram: o item próprio do
     submenu (o do jogador) e o interruptor `#map-mode` da tela de mapa (o que este portão
     media). Medir só o interruptor deixava `[data-act="ctf"]` sem régua nenhuma. */
  await abrirModosLocais();
  await page.click('.cs-item[data-act="ctf"]');
  await page.waitForSelector('#map-screen', { state: 'visible' });
  if (await page.evaluate(() => document.getElementById('setup-title')?.textContent) !== 'CAPTURE THE FLAG') throw new Error('item CAPTURE A BANDEIRA do submenu não abriu o setup em CTF');
  await open('menu', '01', '#main-menu');
  await abrirModosLocais();
  await page.click('.cs-item[data-act="sp"]');
  await page.evaluate(() => document.getElementById('map-mode')?.click());   // CTF entra também pelo interruptor de modo da tela de mapa
  await page.waitForSelector('#map-screen', { state: 'visible' });
  const ctfMap = await page.evaluate(() => ({
    mode: document.getElementById('setup-title')?.textContent,
    cards: document.querySelectorAll('#ms-strip .ms-thumb').length,
    rounds: document.getElementById('ms-rounds')?.value,
  }));
  if (ctfMap.mode !== 'CAPTURE THE FLAG' || ctfMap.cards !== registeredMaps || ctfMap.rounds !== '3') throw new Error(`CTF não entrou pelo catálogo: ${JSON.stringify({ registeredMaps, ...ctfMap })}`);
  await page.selectOption('#ms-rounds', '1');
  const ctfOptions = await page.evaluate(() => JSON.parse(localStorage.getItem('awpbr_settings') || '{}'));
  if (ctfOptions.ctfRounds !== 1 || ctfOptions.rounds !== 7) {
    throw new Error(`rounds independentes por modo não persistiram: ${JSON.stringify(ctfOptions)}`);
  }
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('awpbr_settings') || '{}');
    localStorage.setItem('awpbr_settings', JSON.stringify({ ...stored, wpnMode: 'all', bots: 4, rounds: 5, ctfRounds: 3 }));
  });
  console.log(`✓ segunda interação: os dois modos abrem os ${registeredMaps} mapas; armas, jogadores e rounds persistem com padrões 5/3`);

  for (const [team, character] of [['E', 'gotinha'], ['U', 'punk']]) {
    await open('character', `personagem&time=${team}&char=${character}`, '#char-select');
    const identity = await page.evaluate((id) => ({
      selected: document.querySelector('.char-row.sel img')?.getAttribute('src'),
      name: document.getElementById('char-info-name')?.textContent,
      difficulty: document.getElementById('char-attrs')?.textContent.includes('DIFICULDADE'),
      undefined: document.getElementById('char-attrs')?.textContent.includes('undefined'),
    }), character);
    if (!identity.selected?.includes(`/avatars/${character}.webp`) || identity.difficulty || identity.undefined) {
      throw new Error(`identidade ${character} inválida: ${JSON.stringify(identity)}`);
    }
    await page.screenshot({ path: `${OUT}/03_${character}-avatar.png` });
  }
  console.log('✓ seleção: Punk/Gotinha usam os avatares próprios e a ficha não mostra DIFICULDADE/undefined');

  await open('maps', 'mapas&map=quebrada', '#map-screen');
  const maps = await page.evaluate(() => {
    const preview = document.querySelector('.ms-bg').getBoundingClientRect();
    const catalog = document.querySelector('.ms-strip').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.ms-thumb')];
    return {
      count: cards.length,
      selected: cards.filter((card) => card.getAttribute('aria-pressed') === 'true').length,
      visual: cards.every((card) => !!card.querySelector('img.ms-thumb-img') && !!card.querySelector('.ms-thumb-copy')),
      /* As setas continuam sendo a régua da navegação; os "dashes" NÃO. `ccd47a1f` apagou
         os pontos de paginação de propósito — a tira mostra os mapas todos de uma vez,
         então marcavam páginas que não existem — e este portão continuou exigindo
         `#ms-dashes i`, ou seja, exigindo de volta o defeito que foi consertado. A
         decisão vira invariante ao contrário: o contêiner tem de ficar VAZIO. Que as
         setas FUNCIONAM é medido logo abaixo (`cityNavigation`), o que é mais forte do
         que conferir que o elemento existe. */
      navigation: !!document.getElementById('ms-prev') && !!document.getElementById('ms-next')
        && document.querySelectorAll('#ms-dashes i').length === 0,
      options: ['ms-wpn-mode', 'ms-players', 'ms-rounds'].every((id) => {
        const rect = document.getElementById(id)?.getBoundingClientRect();
        return rect && rect.width > 0 && rect.height > 0;
      }),
      fullBleed: preview.left === 0 && preview.top === 0
        && Math.abs(preview.right - innerWidth) <= 1 && Math.abs(preview.bottom - innerHeight) <= 1,
      overlay: catalog.left >= preview.left && catalog.right <= preview.right,
      selectedId: cards.find((card) => card.getAttribute('aria-pressed') === 'true')?.dataset.id,
      name: document.getElementById('ms-name').textContent,
      image: document.getElementById('ms-bg-img').getAttribute('src'),
      catalog: { left: catalog.left, right: catalog.right, width: catalog.width },
      preview: { left: preview.left, right: preview.right, top: preview.top, bottom: preview.bottom, width: preview.width },
    };
  });
  if (maps.count !== registeredMaps || maps.selected !== 1 || !maps.visual || !maps.navigation || !maps.options || !maps.fullBleed || !maps.overlay
    || maps.selectedId !== 'quebrada' || !maps.name.includes('Quebrada') || !maps.image.includes('/quebrada.jpg')) {
    throw new Error(`mapas inválidos: ${JSON.stringify(maps)}`);
  }
  await page.screenshot({ path: `${OUT}/04_mapas-direto.png` });
  console.log(`✓ mapas direto: palco único ${Math.round(maps.preview.width)}px e carrossel visual com ${maps.count} missões`);
  /* AS ABAS SÃO TODOS/OFICIAIS/COMUNIDADE, e não mais as temáticas. Este bloco media
     `CIDADES` e `ARENA`, que deixaram de existir como aba (`.ms-tabs` no index.astro), e
     por isso morria em timeout antes de medir qualquer coisa. O CONTRATO medido continua
     o mesmo, ponto por ponto: (a) a aba filtra a tira, (b) a seta anda DENTRO do recorte
     e (c) sobra exatamente um card selecionado. O que mudou é de onde sai o esperado — do
     `mapcat.js`, que é a fonte que a tela também usa, em vez da lista de ids escrita à
     mão que envelheceu junto com as abas. O passo da seta também virou medida em vez de
     nome fixo: `stepMap` anda uma casa na ordem visível, e é isso que se confere. */
  const recortes = await page.evaluate(async () => {
    const { MAP_IDS } = await import('/js/maps.js');
    const { ehComunidade, ehOficial } = await import('/js/mapcat.js');
    return { COMUNIDADE: MAP_IDS.filter(ehComunidade), OFICIAIS: MAP_IDS.filter(ehOficial) };
  });
  for (const aba of ['COMUNIDADE', 'OFICIAIS']) {
    await page.click(`.ms-tab[data-cat="${aba}"]`);
    const antes = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ms-thumb')];
      return { ids: cards.map((c) => c.dataset.id), sel: cards.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.id };
    });
    await page.click('#ms-next');
    const depois = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ms-thumb')];
      return {
        ids: cards.map((c) => c.dataset.id),
        selecionados: cards.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.id),
      };
    });
    const esperado = recortes[aba];
    const esperadaApos = antes.ids[(antes.ids.indexOf(antes.sel) + 1) % antes.ids.length];
    if (!esperado.length || depois.ids.join(',') !== esperado.join(',')
      || depois.selecionados.length !== 1 || depois.selecionados[0] !== esperadaApos
      || !esperado.includes(depois.selecionados[0])) {
      throw new Error(`aba ${aba} inválida: ${JSON.stringify({ esperado, esperadaApos, ...depois })}`);
    }
    console.log(`✓ mapas ${aba}: ${esperado.length} mapas do recorte, seta anda dentro dele (${antes.sel} → ${depois.selecionados[0]}) e sobra um card selecionado`);
  }
  await page.click('.ms-tab[data-cat="TODOS"]');
  const todos = await page.evaluate(() => [...document.querySelectorAll('.ms-thumb')].map((c) => c.dataset.id));
  if (todos.length !== registeredMaps) throw new Error(`aba TODOS não traz o acervo inteiro: ${todos.length} de ${registeredMaps}`);
  console.log(`✓ mapas TODOS: o acervo inteiro (${todos.length}) volta ao voltar para a aba`);

  await open('loading', 'loading&time=B&map=praca_poderes', '#load-overlay');
  await page.waitForFunction(() => document.getElementById('load-character-3d')?.dataset.ready === '1', null, { timeout: 240000 });
  const live3d = await page.evaluate(async () => {
    const canvas = document.getElementById('load-character-3d');
    const actions = [];
    const frames = [];
    const clips = [];
    const pairs = [];
    for (let i = 0; i < 44; i++) {
      await new Promise((resolve) => requestAnimationFrame(() => {
        actions.push(canvas.dataset.action);
        clips.push(canvas.dataset.clip);
        pairs.push(`${canvas.dataset.action}:${canvas.dataset.clip}`);
        frames.push(canvas.toDataURL('image/png'));
        resolve();
      }));
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    return {
      character: canvas.dataset.character,
      ready: canvas.dataset.ready,
      actions: [...new Set(actions.filter(Boolean))],
      clips: [...new Set(clips.filter(Boolean))],
      pairs: [...new Set(pairs.filter((pair) => !pair.startsWith(':') && !pair.endsWith(':')))],
      frames: new Set(frames).size,
      backing: [canvas.width, canvas.height],
      stage: (() => {
        const rect = document.getElementById('load-character-stage').getBoundingClientRect();
        return [Math.round(rect.width), Math.round(rect.height)];
      })(),
      actionLabel: getComputedStyle(document.getElementById('load-character-action')).display,
      transparent: getComputedStyle(canvas).backgroundColor === 'rgba(0, 0, 0, 0)',
      oldSprite: !!document.getElementById('load-char'),
    };
  });
  if (live3d.character !== 'canarinho' || live3d.ready !== '1'
    || !['run', 'ready', 'shoot', 'crouch', 'crouchwalk', 'jump', 'walkfire'].every((action) => live3d.actions.includes(action))
    || !['run', 'shoot', 'crouch', 'crouchwalk', 'jump', 'walkfire'].every((clip) => live3d.clips.includes(clip))
    || !live3d.clips.some((clip) => clip.startsWith('idle'))
    || !live3d.pairs.some((pair) => pair.startsWith('ready:idle'))
    || !['run:run', 'shoot:shoot', 'crouch:crouch', 'crouchwalk:crouchwalk', 'jump:jump', 'walkfire:walkfire']
      .every((pair) => live3d.pairs.includes(pair))
    || live3d.frames < 30 || live3d.backing.some((value) => value <= 1)
    || live3d.stage.join('x') !== '86x144' || live3d.actionLabel !== 'none'
    || !live3d.transparent || live3d.oldSprite) {
    throw new Error(`palco 3D truncado: ${JSON.stringify(live3d)}`);
  }
  await page.screenshot({ path: `${OUT}/00B_loading-direto.png` });
  console.log(`✓ loading Time B: GLB ${live3d.character} em ${live3d.stage.join('×')}; ações ${live3d.actions.join(', ')}; clipes reais ${live3d.clips.join(', ')}; ${live3d.frames} quadros distintos; canvas transparente`);

  await open('victory', 'vitoria&time=E&char=mst', '#match-end.win');
  const victory = await page.evaluate(() => ({
    title: document.getElementById('match-title').textContent,
    art: document.getElementById('me-hero').style.getPropertyValue('--me-art'),
    stage: (() => { const r = document.getElementById('me-hero').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })(),
    mask: getComputedStyle(document.getElementById('me-hero')).maskImage,
    size: getComputedStyle(document.getElementById('me-hero')).backgroundSize,
    position: getComputedStyle(document.getElementById('me-hero')).backgroundPosition,
    wrapAfter: getComputedStyle(document.querySelector('.me-wrap'), '::after').content,
    heroAfter: getComputedStyle(document.getElementById('me-hero'), '::after').content,
  }));
  const victoryStage = victory.stage;
  const resultViewport = page.viewportSize();
  if (victory.title !== 'VITÓRIA' || !victory.art.includes('mst-vitoria.webp')
    || Math.abs(victoryStage[0] - resultViewport.width * .44) > 1 || Math.abs(victoryStage[1] - resultViewport.height * .025) > 1
    || Math.abs(victoryStage[0] + victoryStage[2] - resultViewport.width) > 1
    || Math.abs(victoryStage[1] + victoryStage[3] - resultViewport.height) > 1
    || victory.mask !== 'none' || victory.size !== 'contain' || victory.position !== '100% 100%'
    || victory.wrapAfter !== 'none' || victory.heroAfter !== 'none') {
    throw new Error(`vitória inválida: ${JSON.stringify(victory)}`);
  }
  await page.screenshot({ path: `${OUT}/08_vitoria-direto.png` });
  console.log('✓ vitória direta: veredito e arte do personagem escolhido');

  await open('defeat', 'derrota&time=E&char=mst', '#match-end.lose');
  const defeat = await page.evaluate(() => ({
    title: document.getElementById('match-title').textContent,
    art: document.getElementById('me-hero').style.getPropertyValue('--me-art'),
    stage: (() => { const r = document.getElementById('me-hero').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })(),
    mask: getComputedStyle(document.getElementById('me-hero')).maskImage,
    size: getComputedStyle(document.getElementById('me-hero')).backgroundSize,
    filter: getComputedStyle(document.getElementById('me-hero')).filter,
    wrapAfter: getComputedStyle(document.querySelector('.me-wrap'), '::after').content,
    heroAfter: getComputedStyle(document.getElementById('me-hero'), '::after').content,
  }));
  const defeatStage = defeat.stage;
  if (defeat.title !== 'DERROTA' || !defeat.art.includes('mst-derrota.webp')
    || Math.abs(defeatStage[0] - resultViewport.width * .44) > 1 || Math.abs(defeatStage[1] - resultViewport.height * .025) > 1
    || Math.abs(defeatStage[0] + defeatStage[2] - resultViewport.width) > 1
    || Math.abs(defeatStage[1] + defeatStage[3] - resultViewport.height) > 1
    || defeat.mask !== 'none' || defeat.size !== 'contain'
    || defeat.wrapAfter !== 'none' || defeat.heroAfter !== 'none'
    || !defeat.filter.includes('saturate(0.48)') || !defeat.filter.includes('brightness(0.72)')) {
    throw new Error(`derrota inválida: ${JSON.stringify(defeat)}`);
  }
  await page.screenshot({ path: `${OUT}/09_derrota-direto.png` });
  console.log('✓ derrota direta: veredito e arte do personagem escolhido');

  await open('victory', 'vitoria&time=B&char=canarinho', '#match-end.win');
  const victoryB = await page.evaluate(() => ({
    rounds: document.querySelector('#match-stats div b')?.textContent,
    art: document.getElementById('me-hero').style.getPropertyValue('--me-art'),
  }));
  if (victoryB.rounds !== '1 × 4' || !victoryB.art.includes('canarinho-vitoria.webp')) {
    throw new Error(`vitória do lado B inválida: ${JSON.stringify(victoryB)}`);
  }
  console.log('✓ vitória direta do lado B: placar mantém ordem E × B');

  await open('hud', 'hud&vmlab=1&map=praca_poderes&time=E&char=mst', '#hud', 240000, false);
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  await page.waitForSelector('#weapon-hud .weapon-slot[data-slot="5"]', { timeout: 30000 });
  await page.evaluate(() => window.__game._feed(
    { isPlayer: true, team: 'E', name: 'VOCÊ' },
    { isPlayer: false, team: 'B', name: 'ALVO' },
    'AK', false,
  ));
  await page.waitForTimeout(500);
  const hud = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('#weapon-hud .weapon-slot')];
    const slotRects = slots.map((slot) => {
      const rect = slot.getBoundingClientRect();
      return {
        key: slot.dataset.slot, right: rect.right, top: rect.top, bottom: rect.bottom,
        mask: !!slot.querySelector('.weapon-mask'), flat: !!slot.querySelector('.weapon-mask,.kf-ic'),
        raster: !!slot.querySelector('img'),
      };
    });
    const center = { x: innerWidth / 2, y: innerHeight / 2 };
    const crosshair = document.getElementById('crosshair');
    const marks = [...crosshair.querySelectorAll('i,b')].map((mark) => {
      const rect = mark.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, color: getComputedStyle(mark).backgroundColor };
    });
    return {
      player: {
        weapon: window.__game?.player?.weapon,
        primary: window.__game?.player?.primary,
        secondary: window.__game?.player?.secondary,
      },
      slots: slotRects,
      active: slots.filter((slot) => slot.classList.contains('on')).length,
      vertical: slotRects.every((rect, index) => !index || rect.top >= slotRects[index - 1].bottom - 1),
      sidebar: slotRects.every((rect) => rect.right > innerWidth - 48 && rect.right <= innerWidth),
      ammoArt: getComputedStyle(document.getElementById('ammo-weapon-art')).display,
      crosshairDisplay: getComputedStyle(crosshair).display,
      crosshairColor: getComputedStyle(document.documentElement).getPropertyValue('--xhair').trim(),
      centered: marks.some((rect) => rect.left <= center.x && rect.right >= center.x)
        && marks.some((rect) => rect.top <= center.y && rect.bottom >= center.y),
      viewmodelVisible: !!window.__game?._vmlab?.group?.visible
        && Object.values(window.__game?._vmlab?.models || {}).some((model) => model.visible),
      killfeed: (() => {
        const mask = document.querySelector('.kf-row .kf-weapon-mask');
        const fallback = document.querySelector('.kf-row .kf-fallback');
        return {
          image: mask ? getComputedStyle(mask).maskImage || getComputedStyle(mask).webkitMaskImage : '',
          fallback: fallback ? getComputedStyle(fallback).display : '',
        };
      })(),
      marks,
    };
  });
  if (hud.slots.map((slot) => slot.key).join('') !== '12345'
    || hud.slots.some((slot) => !slot.flat || slot.raster) || hud.slots.filter((slot) => slot.mask).length < 3
    || hud.active !== 1 || !hud.vertical || !hud.sidebar
    || hud.ammoArt !== 'none' || hud.crosshairDisplay === 'none'
    || hud.crosshairColor.toLowerCase() !== '#4fe8e0' || !hud.centered || !hud.viewmodelVisible) {
    throw new Error(`HUD/mira inválidos: ${JSON.stringify(hud)}`);
  }
  if (!hud.killfeed.image.includes('/img/weapons/ak.webp') || hud.killfeed.fallback !== 'none') {
    throw new Error(`killfeed 2D inválido: ${JSON.stringify(hud.killfeed)}`);
  }
  await page.screenshot({ path: `${OUT}/05_vmlab-mira-sidebar.png` });
  console.log('✓ vmlab=1: viewmodel e mira; sidebar 1–5 plana; killfeed do abate usa a máscara WebP da AK');

  await open('hud', 'hud&vmlab=1&vida=23&map=praca_poderes&time=E&char=mst', '#hud', 240000, false);
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  const lowHud = await page.evaluate(() => ({
    hp: document.getElementById('hp-num')?.textContent,
    low: document.getElementById('hp-num')?.classList.contains('low'),
    vignette: getComputedStyle(document.getElementById('damage-vignette')).opacity,
  }));
  if (lowHud.hp !== '23' || !lowHud.low || lowHud.vignette !== '1') throw new Error(`vida baixa inválida: ${JSON.stringify(lowHud)}`);
  await page.screenshot({ path: `${OUT}/05_vida-baixa.png` });
  console.log('✓ vida=23: número, barra e vinheta de dano reproduzem o tweak Vida baixa');

  await open('scoreboard', '08&map=praca_poderes&time=E&char=mst', '#scoreboard', 240000, false);
  await page.waitForFunction(() => window.__game?.paused === true, null, { timeout: 240000 });
  const scoreboard = await page.evaluate(() => ({
    clock: document.querySelector('.sb-clock')?.innerText,
    cols: document.querySelectorAll('.sb-col').length,
    heads: [...document.querySelectorAll('.sb-chead')].map((head) => head.innerText),
    scoreCrests: [...document.querySelectorAll('.sb-score .sb-crest')].map((img) => ({ src: img.getAttribute('src'), size: [img.clientWidth, img.clientHeight] })),
    columnCrests: [...document.querySelectorAll('.sb-chead .sb-crest')].map((img) => ({ src: img.getAttribute('src'), size: [img.clientWidth, img.clientHeight] })),
    verticalDelta: (() => {
      const boxes = [document.querySelector('#scoreboard h3'), document.getElementById('sb-cols')]
        .map((element) => element.getBoundingClientRect());
      const top = Math.min(...boxes.map((box) => box.top));
      const bottom = Math.max(...boxes.map((box) => box.bottom));
      return Math.abs((top + bottom) / 2 - innerHeight / 2);
    })(),
    pauseHidden: document.getElementById('pause-menu')?.classList.contains('hidden'),
  }));
  if (scoreboard.clock !== 'RODADA 4/5 · 1:32' || scoreboard.cols !== 2 || !scoreboard.pauseHidden
    || scoreboard.heads.some((head) => head !== 'JOGADOR\nK\nD\nSCORE\nPING')
    || scoreboard.scoreCrests.map((crest) => crest.src).join(',') !== '/img/brasoes/e.png,/img/brasoes/b.png'
    || scoreboard.columnCrests.map((crest) => crest.src).join(',') !== '/img/brasoes/e.png,/img/brasoes/b.png'
    || [...scoreboard.scoreCrests, ...scoreboard.columnCrests].some((crest) => crest.size.some((value) => value <= 0))
    || scoreboard.verticalDelta > 2) {
    throw new Error(`placar direto inválido: ${JSON.stringify(scoreboard)}`);
  }
  await page.screenshot({ path: `${OUT}/08_placar-direto.png` });
  console.log('✓ placar direto: 4/5 · 1:32, duas tabelas e nenhuma sobreposição do menu de pausa');

  await open('pause', 'pausa&map=praca_poderes&time=E&char=mst', '#pause-menu', 240000, false);
  await page.waitForFunction(() => window.__game?.paused === true, null, { timeout: 240000 });
  await page.screenshot({ path: `${OUT}/06_pausa-direto.png` });
  console.log('✓ pausa direta: partida viva e pausada');
} finally {
  await browser.close();
}

if (pageErrors.length) throw new Error(`${pageErrors.length} pageerror: ${pageErrors.join(' · ')}`);
