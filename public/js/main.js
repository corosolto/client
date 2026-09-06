// Boot, menus, settings, logo, main loop.
import * as THREE from 'three';
import { initTextures } from './textures.js';
import { CHARACTERS, buildCharacter, charWeapon } from './characters.js';
import { preloadCharacterAssets, buildCharacterModel, hasModel, GLB_CHARS } from './glbchars.js';
import { preloadFPArms } from './fparms.js';
import { preloadMapProps } from './mapprops.js';
import { preloadAmbientLife } from './ambientlife.js';   // fauna do mapa (MAPS[id].ambience)
import { apiUrl, fetchComRetry } from './apibase.js';   // rotas /api de banco moram no backend (docs/APIS.md)
import { MAPS, MAP_IDS, DEFAULT_MAP, resolveMapId, mapaDaSessao } from './maps.js';
import { PALETA } from './paleta.js';
import { setHavanCarSeed } from './map_havan.js';
import { preloadWeapons } from './weapons.js';
import { Sfx } from './audio.js';
import { Game, confirmGate, CONFIRM_MAX_MS, pickMatchRoster, pickMatchWeapons } from './game.js';
import { VERSION } from './version.js';
import { LANG, resolveGeoLang, translateDom, tr, frase } from './i18n.js';
import { enableLightBloom } from './bloom.js';
import { enableStylize } from './stylize.js';
import { resolveInspectionScreen } from './screenquery.js';
import { LoadingCharacterStage } from './loading3d.js';
import { MENU_MUSIC_ACTIVE_IDS } from './menu-music-selection.js';
/* Multiplayer. O game.js NÃO importa nada disto: o netcode é injetado por aqui
   (`new Game({ mpFactory, net })`), e sem sessão de rede nenhuma linha dele executa. */
import { NOS, mpUrls, sondarNos, listRooms, createRoom, NetClient, parseConvite, linkDeConvite, salaPorConvite, httpDoNo, resolvePlayerSide, transitionSlot } from './net.js';
import { makeNetcode } from './netgame.js';
import { FACCAO_NOME_UI } from './mapcat.js';

/* ---------------- settings & nickname ---------------- */
const SETTINGS_KEY = 'awpbr_settings';
const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
if (savedSettings.invertY == null && savedSettings.invY != null) savedSettings.invertY = savedSettings.invY;
const settings = Object.assign({ sens: 1, invertY: false, vol: 0.7, quality: 'med', speech: true, map: DEFAULT_MAP, wpnMode: 'all', bots: 4, rounds: 5, ctfRounds: 3, difficulty: 'normal' }, savedSettings);
let preferredQuality = null;
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify({
  ...settings,
  quality: preferredQuality ?? settings.quality,
}));
const NICK_KEY = 'awpbr_nick';
// A coleta de jogadas exige consentimento explícito e persistente.
const TRAIN_CONSENT_KEY = 'csbr_training_consent';
const trainingEnabled = () => { try { return localStorage.getItem(TRAIN_CONSENT_KEY) === '1'; } catch { return false; } };
const SOCIAL_KEY = 'awpbr_social';
const STATS_KEY = 'awpbr_stats';   // declarado no bloco de storage: syncPlayState→renderPlayerPlate→loadStats roda ANTES da definição antiga (TDZ)
const PLAYER_AVATAR_KEY = 'awpbr_player_avatar';

/* Contexto declarado antes da música: picks de menu ficam sem gameType e nunca
   herdam a partida anterior. */
let telemetryGameContext = {
  gameType: null, node: null, roomId: null, roomOfficial: null, createdRoom: null,
};
let _matchEventId = null;
function clearTelemetryGameContext() {
  telemetryGameContext = {
    gameType: null, node: null, roomId: null, roomOfficial: null, createdRoom: null,
  };
  _matchEventId = null;
}

/* ---------------- renderer ---------------- */
// Import extra (top-level, legal em ESM) em vez de mexer no bloco de imports lá de cima:
// o tom do caminho SEM pós mora no bloom.js, que é o dono da tabela de exposição/piso por mapa.
import { applyNoPostTone } from './bloom.js';
import { criaRenderer, avisaSemWebgl } from './glcontext.js';
const container = document.getElementById('game-container');
const SAFE_MODE = new URLSearchParams(location.search).get('safe') === '1';
const renderer = criaRenderer({}, { compatibility: SAFE_MODE });
if (!renderer) {
  avisaSemWebgl('WebGL indisponível neste navegador/driver');
  throw new Error('sem_webgl');
}
const COMPAT_MODE = SAFE_MODE || renderer.__csWebgl?.degraded === true;
if (COMPAT_MODE) { preferredQuality = settings.quality; settings.quality = 'low'; }
/* AUTO-PERFIL PARA MÁQUINA FRACA: cai pra 'low' por padrão só se o jogador NUNCA escolheu
   qualidade à mão (a escolha manual sempre vence). ?perfilauto=0 desliga a heurística. */
const AUTO_PROFILE = new URLSearchParams(location.search).get('perfilauto') !== '0';
function detectaHwFraco() {
  const gpu = (renderer.__csWebgl?.renderer || '').toLowerCase();
  const integrada = /intel|iris|uhd graphics|hd graphics|mesa|microsoft basic|swiftshader|llvmpipe|softpipe/.test(gpu);
  const mem = navigator.deviceMemory;              // Chrome limita em 8; 4 GB reporta 4
  const cores = navigator.hardwareConcurrency || 8;
  return integrada || (typeof mem === 'number' && mem <= 4) || cores <= 4;
}
const WEAK_HW = !COMPAT_MODE && AUTO_PROFILE && savedSettings.quality === undefined && detectaHwFraco();
if (WEAK_HW) { settings.quality = 'low'; try { console.info('[perf] hardware modesto detectado — qualidade em BAIXA por padrão (mude em Configurações)'); } catch {} }
const LEAN = COMPAT_MODE || WEAK_HW;   // qualquer caminho leve: previews estáticos + DPR menor
const ASSET_CHECK = new URLSearchParams(location.search).get('assetcheck') === '1';
let staticPreviews = LEAN && !ASSET_CHECK;
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(LEAN ? 0.75 : 1);
renderer.shadowMap.enabled = !COMPAT_MODE;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Tonemap. Com o composer ligado three já força NoToneMapping nos materiais (só aplica
// tonemap quando o alvo é null) e quem faz a curva é o AgX do bloom.js — deixamos
// NoToneMapping EXPLÍCITO nesse caso pra não haver a menor chance de tonemap duplo.
// Estes dois valores são só o ESTADO INICIAL: quem manda no caminho sem pós é o
// applyNoPostTone() logo abaixo. Ver o bloco de comentário dele no bloom.js.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
container.appendChild(renderer.domElement);
let contextLossTimer = null;
let contextRetryTimers = [];
let contextLostCount = 0;
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  clearTimeout(contextLossTimer);
  for (const t of contextRetryTimers) clearTimeout(t);
  contextRetryTimers = [];
  contextLostCount++;
  console.warn(`[webgl] contexto perdido (recuperação ${contextLostCount})`);
  // 16a22c40 (#297): browser mata o contexto sob pressão de GPU (comum ao ABRIR a
  // arena — 53 personagens + mapa sobem juntos). O restore espontâneo raramente
  // chega em 1,5 s; o Three tem forceContextRestore() pra PEDIR a volta. Pedimos
  // em progressão (0,5 s → 1,5 s → 4 s) e o fatal só vem se nada voltou em 8 s.
  const delays = [500, 1500, 4000];
  delays.forEach((ms, i) => {
    contextRetryTimers.push(setTimeout(() => {
      try { renderer.forceContextRestore(); } catch (_) { /* ainda perdido */ }
    }, ms));
  });
  contextLossTimer = setTimeout(() => window.__gameLaunch?.fail(new Error('contexto WebGL perdido'), 'webgl-context-lost'), 8000);
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  clearTimeout(contextLossTimer);
  for (const t of contextRetryTimers) clearTimeout(t);
  contextRetryTimers = [];
  contextLossTimer = null;
  console.warn('[webgl] contexto restaurado');
  // pós-restore os render targets do composer/bloom nasceram mortos: um resize
  // força a recriação dos mesmos (mesmo caminho de uma mudança de janela)
  try { dispatchEvent(new Event('resize')); } catch (_) {}
});
// bloom leve (FASE 4) — ligado por padrão, pulado na qualidade 'low' ou com ?bloom=0
// (escape hatch p/ GPUs/extensões que derrubam a aba — suspeita do "jogo fechar sozinho")
{
  const _qp = new URLSearchParams(location.search);
  const _bloomOn = !COMPAT_MODE && settings.quality !== 'low' && _qp.get('bloom') !== '0';
  // pipeline estilizado (cel+contorno) atrás de ?style=1 — prova de conceito reversível.
  if (!COMPAT_MODE && _qp.get('style') === '1') enableStylize(renderer, { bloom: _bloomOn, quality: settings.quality });
  else if (_bloomOn) {
    enableLightBloom(renderer, { quality: settings.quality });
    if (_qp.get('post') !== 'output') renderer.toneMapping = THREE.NoToneMapping;   // AgX manda
  } else {
    // 'low' / ?bloom=0: MESMA exposição por mapa e MESMO piso de ambiente do composite,
    // aplicados dentro do material (zero passe fullscreen). Sem isso 'low' era outro jogo:
    // ~1 stop mais escuro e com curva de tom diferente (ACES crusha a sombra que o piso do
    // AgX segura). Kill-switch: ?lowtone=0 volta pro ACES puro.
    applyNoPostTone(renderer);
  }
}

const textures = initTextures();
const sfx = new Sfx(); sfx.vol = settings.vol;
sfx.speechEnabled = settings.speech !== false;
sfx.reverbOn = new URLSearchParams(location.search).get('reverb') === '1';   // reverb leve opt-in (default off)
// sidechain da música do menu: cliques/SFX abaixam a trilha por ~150-250ms e ela volta suave
sfx.onDuck = (amt, hold) => {
  const m = menuMusic;
  if (!m || m.paused || m.muted || musicFade) return;
  m.volume = MENU_MUSIC_VOL * amt;
  setTimeout(() => { if (menuMusic && !musicFade && !menuMusic.paused) menuMusic.volume = MENU_MUSIC_VOL; }, hold * 1000 + 220);
};
const sfxReady = sfx.loadManifest();

/* ---------------- selected map ---------------- */
const urlMap = new URLSearchParams(location.search).get('map');
let currentMap = mapaDaSessao({ urlMap, savedMap: settings.map, pinned: settings.mapPinned });
// sem save a rotação não avança; com ?map= o save pisaria a escolha fixada do jogador
if (!urlMap) { settings.map = currentMap; saveSettings(); }

/* ---------------- menu backdrop (orbiting map) ---------------- */
// Mint building/statue GLBs used by the Brasília map (loaded once, cloned per placement).
const MAP_PROPS = ['congresso', 'catedral', 'ministerio', 'palacio', 'justica', 'tires', 'stall', 'tent', 'bus', 'drinkstand', 'urna', 'towner',
  'quiosque', 'skate_ramp', 'lifeguard_tower', 'guarda_sol', 'arquibancada',
  'churrasqueira', 'mesa_guardasol', 'cooler', 'boia', 'placa_piscina', 'caixa_som'];   // props do Piscinão de Ramos (Mint); carros/estátua do Havan carregam por-mapa   // Havan (estátua + carros + carrinho)
let menuScene = new THREE.Scene();
MAPS[currentMap].build(menuScene, textures);
const menuCam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
/* ---------------- loading real (barra via LoadingManager compartilhado) ---------------- */
// GLTFLoader sem manager cai no THREE.DefaultLoadingManager — TODOS os GLBs (personagens,
// props de mapa, braços FP, viewmodel) passam por ele. Cada fase faz snapshot do acumulado
// (l0) e mede (loaded-l0)/(total-l0) → barra de progresso REAL, não spinner fake.
const _lstat = { loaded: 0, total: 0, phase: null };
THREE.DefaultLoadingManager.onProgress = (url, l, t) => {
  _lstat.loaded = l; _lstat.total = t;
  const ph = _lstat.phase;
  if (ph) ph.set(Math.min(0.99, (l - ph.l0) / Math.max(1, t - ph.l0)));
};
/* `statusEl` é opcional: só o overlay de partida troca o texto conforme a barra
   anda (o boot mantém a mensagem fixa, que já é curta). A escrita é condicionada a
   ter MUDADO porque `set` é chamado a cada progresso do LoadingManager — escrever
   textContent igual em toda chamada é layout à toa. */
function _mkPhase(fillEl, pctEl, statusEl) {
  const ph = {
    l0: _lstat.loaded,
    set(p) {
      fillEl.style.width = (p * 100).toFixed(0) + '%';
      pctEl.textContent = Math.round(p * 100) + '%';
      if (statusEl) {
        const t = _statusPorProgresso(p);
        if (statusEl.textContent !== t) statusEl.textContent = t;
      }
    },
  };
  _lstat.phase = ph; ph.set(0); return ph;
}
// fase de boot: props do cenário 3D do menu (carrega por baixo da splash)
const _bootPhase = _mkPhase(document.getElementById('boot-bar-fill'), document.getElementById('boot-pct'));
let _splashReady = false;
/* JANELA DE ENTRADA: o gesto que tira a splash não é escolha de menu. Em máquina lenta ele
   vazava para o item recém-focado e o JOGAR abria o submenu sozinho (régua ENTRADA1). */
const ENTRADA_MS = 350;
let _entradaEm = 0;
function _splashSetReady() {
  if (_splashReady) return; _splashReady = true;
  _bootPhase.set(1);
  if (_lstat.phase === _bootPhase) _lstat.phase = null;
  // G2-R10: o failsafe de 20s dispara DEPOIS da splash sair do DOM (debug/?auto= e
  // fluxos rápidos) — sem guarda, crashava "textContent null" (banner vermelho).
  const bs = document.getElementById('boot-status'), se = document.getElementById('splash-enter');
  if (bs) bs.textContent = 'ARENA PRONTA';
  if (se) se.classList.remove('hidden');
}
setTimeout(_splashSetReady, 20000);   // failsafe: nunca prende o jogador na splash
// overlay de loading de partida/personagens (cobre a cena montando — sem "minecraft")
const _lo = {
  box: document.getElementById('load-overlay'), fill: document.getElementById('load-bar-fill'),
  pct: document.getElementById('load-pct'), label: document.getElementById('load-label'), status: document.getElementById('load-status'),
};
const loadingStage = new LoadingCharacterStage(document.getElementById('load-character-3d'), { compatibility: LEAN });
loadingStage.show('B').catch(() => {});
function dockLoadingCharacter() {
  const canvas = document.getElementById('load-character-3d');
  const stage = document.getElementById('load-character-stage');
  if (canvas && stage && canvas.parentElement !== stage) stage.prepend(canvas);
}
/* DICAS DO CARREGAMENTO. São de JOGO, não de marketing: cada uma diz algo que muda
   a mão de quem lê. Passam pelo tr() como todo o resto da UI. */
const _DICAS = [
  'Andar com a arma no ombro (tecla F) é mais rápido do que andar mirando.',
  'Segure TAB a qualquer momento para ver o placar e quem está vivo.',
  'Agachar reduz o espalhamento do tiro — mas também a sua velocidade.',
  'Tiro na cabeça mata em quase tudo. Mire alto no corredor.',
  'A fumaça (tecla 4) corta a linha de visão dos bots, não só a sua.',
  'O radar mostra parede: use ele para saber de onde o barulho vem.',
  'Recarregar cancela o tiro. Não recarregue no meio da troca.',
  'Cada personagem muda só a aparência — a mira é toda sua.',
];
let _dicaT = null;
function _giraDica() {
  const el = document.getElementById('load-tip');
  if (!el) return;
  el.textContent = tr(_DICAS[Math.floor(Math.random() * _DICAS.length)]);
}
/* Faixa de progresso -> status, como o handoff pede. O texto muda de verdade
   conforme a barra anda, então ele não é enfeite: é o segundo sinal de vida da
   tela (o primeiro é a própria barra). */
function _statusPorProgresso(p) {
  if (p < 0.34) return tr('CARREGANDO TEXTURAS…');
  if (p < 0.72) return tr('POSICIONANDO OS BOTS…');
  return tr('AQUECENDO A TRETA…');
}
function showLoading(label, status = 'CARREGANDO MODELOS 3D…', mapName = '') {
  dockLoadingCharacter();
  const kick = document.getElementById('load-kicker');
  if (kick) kick.textContent = tr(label);   // o rótulo ("CARREGANDO <MAPA>") virou o kicker do topo (tela 00B)
  _lo.label.textContent = ''; _lo.status.textContent = tr(status);
  const mapEl = document.getElementById('load-map');
  if (mapEl) mapEl.textContent = mapName;   // tela 00B: o mapa é o protagonista da espera
  const metaEl = document.getElementById('load-meta');
  if (metaEl) metaEl.innerHTML = mapName ? ($('map-meta').textContent || '').split('·').join('<span class="lo-sep">·</span>') : '';
  // chip de confronto no topo à direita (tela 00B): seu lado × adversário, nas cores da facção
  const vs = document.getElementById('load-versus');
  if (vs) {
    const a = $('load-vs-a'), b = $('load-vs-b');
    if (mapName && currentEnemyFaction) {
      a.textContent = tr(FACTION_NAME[currentFaction] || ''); a.style.color = (PALETA[currentFaction] || {}).base || '#e0762a';
      b.textContent = tr(FACTION_NAME[currentEnemyFaction] || ''); b.style.color = (PALETA[currentEnemyFaction] || {}).base || '#8258d8';
      vs.classList.remove('hidden');
    } else vs.classList.add('hidden');
  }
  try { _lo.box.style.setProperty('--loading-wall', loadingWallUrl(_loadWallI++)); } catch {}
  _lo.box.classList.remove('hidden');
  loadingStage.show(currentFaction).catch(() => {});
  _giraDica();
  clearInterval(_dicaT); _dicaT = setInterval(_giraDica, 5000);
  _mkPhase(_lo.fill, _lo.pct, _lo.status);
}
function hideLoading() {
  _lstat.phase = null;
  clearInterval(_dicaT); _dicaT = null;   // sem isto o timer sobrevive à partida inteira
  loadingStage.hide();
  _lo.box.classList.add('hidden');
}
function rebuildMenuBackdrop() {
  menuScene = new THREE.Scene();
  MAPS[currentMap].build(menuScene, textures);
}
// The first backdrop is built before props load; rebuild once they're ready so the
// menu shows the real Brasília landmarks too. Só então a splash libera a entrada.
preloadMapProps(MAP_PROPS).then(() => { rebuildMenuBackdrop(); _splashSetReady(); }).catch(() => _splashSetReady());

/* ---------------- screens ---------------- */
const screens = ['mobile-warning', 'main-menu', 'map-screen', 'team-select', 'char-select', 'settings-panel', 'howto-panel', 'ranking-panel', 'mp-panel', 'feedback-panel', 'support-panel', 'pause-menu', 'match-end'];
function show(id) {
  for (const s of screens) document.getElementById(s).classList.toggle('hidden', s !== id);
  if (!id) for (const s of screens) document.getElementById(s).classList.add('hidden');
  if (id !== 'char-select') pvStopVideo();
  // ao navegar pra qualquer tela, fecha o painel de setup do menu CS (não fica aberto after)
  // EXCEÇÃO: map-screen é EXTENSÃO do setup (abre pelo cartaz do mapa) — o painel fica
  // aberto embaixo e o VOLTAR cai de volta nele, com mapa/modo/bots intactos.
  if (id !== 'main-menu' && id !== 'map-screen') { const ms = document.getElementById('menu-setup'); if (ms) ms.classList.remove('open'); }
  else { applyHomeWall(); if (musicArmed) startMenuMusic(); }   // volta pra home: wallpaper + música de menu
  if (id === 'main-menu') setTimeout(focusMenu, 40);   // teclado: ↑/↓ navegam assim que a home aparece
}
const $ = id => document.getElementById(id);
const FACTION_ART_URLS = ['/img/faccoes/time-e.webp', '/img/faccoes/time-b.webp', '/img/faccoes/tribos.webp', '/img/faccoes/palhacos.webp', '/img/faccoes/funkeiros.webp'];
const factionArtImages = FACTION_ART_URLS.map((src) => {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  return image;
});
const factionArtReady = Promise.all(factionArtImages.map((image) => (
  image.decode ? image.decode() : new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  })
))).catch((error) => console.warn('[facções] preload parcial', error));

/* Wallpapers rotativos (wall-1..9): 1 por tela no fluxo home→setup→lado→personagem, sem
   repetir; o offset rotaciona a cada acesso (localStorage) pra variar entre visitas.

   Estes arrays são fallback do primeiro quadro. A fonte de verdade é
   public/img/walls.json, gerado por `npm run media` a partir do disco. O manifesto
   recalcula a rotação quando chega; falha de rede mantém este fallback.

   Servidos em .webp desde 07/08: os PNG de 2–2,6 MB viraram ~250 KB (ffmpeg libwebp q85,
   comparado lado a lado antes da troca — texto do cartaz e grão idênticos). Os .png ficam
   na pasta como fonte; wallpaper novo entra como PNG e vira .webp no mesmo commit. */
const WALLS = ['/img/wall-1.webp', '/img/wall-2.webp', '/img/wall-3.webp', '/img/wall-4.webp',
  '/img/wall-5.webp', '/img/wall-6.webp', '/img/wall-7.webp', '/img/wall-8.webp',
  '/img/wall-9.webp'];
let _wallVisit = 0;
try {
  _wallVisit = parseInt(localStorage.getItem('cs_wallK') || '-1', 10) + 1;
  if (!Number.isFinite(_wallVisit)) _wallVisit = 0;
  localStorage.setItem('cs_wallK', String(_wallVisit));
} catch {}
let _wallK = _wallVisit % WALLS.length;
const wallPath = (i) => WALLS[(_wallK + i) % WALLS.length];
const wallUrl = (i) => `url('${wallPath(i)}')`;
const wall3x2Url = (i) => `url('${wallPath(i).replace('/img/', '/img/walls-3x2/')}')`;
let HOME_WALL = wallUrl(0), SETUP_WALL = wallUrl(1), TEAM_WALL = wallUrl(2), CHAR_WALL = wallUrl(3);
let HOME_WALL_3X2 = wall3x2Url(0), SETUP_WALL_3X2 = wall3x2Url(1);
// Splash e espera do mapa compartilham o lote loading-* do manifesto.
const LOADING_WALLS = ['/img/loading-1.webp', '/img/loading-2.webp', '/img/loading-3.webp',
  '/img/loading-4.webp', '/img/loading-5.webp', '/img/loading-6.webp'];
let _loadWallI = 4;
const loadingWallUrl = (i) => `url('${LOADING_WALLS[i % LOADING_WALLS.length]}')`;
function applySplashWallpaper() {
  const splash = $('boot-splash');
  if (splash) splash.style.setProperty('--loading-wall', loadingWallUrl(_wallK));
}
applySplashWallpaper();
fetch(`/img/walls.json?v=${VERSION}`)
  .then((response) => (response.ok ? response.json() : null))
  .then((manifest) => {
    if (!manifest) return;
    if (Array.isArray(manifest.walls) && manifest.walls.length) WALLS.splice(0, WALLS.length, ...manifest.walls);
    if (Array.isArray(manifest.loading) && manifest.loading.length) LOADING_WALLS.splice(0, LOADING_WALLS.length, ...manifest.loading);
    _wallK = _wallVisit % WALLS.length;
    HOME_WALL = wallUrl(0); SETUP_WALL = wallUrl(1); TEAM_WALL = wallUrl(2); CHAR_WALL = wallUrl(3);
    HOME_WALL_3X2 = wall3x2Url(0); SETUP_WALL_3X2 = wall3x2Url(1);
    applyHomeWall();
    const team = $('team-select'); if (team) team.style.setProperty('--wall', TEAM_WALL);
    const character = $('char-select'); if (character) character.style.setProperty('--wall', CHAR_WALL);
    applySplashWallpaper();
  })
  .catch(() => {});
function applyHomeWall() {
  const w = document.querySelector('#main-menu .cs-wallpaper');
  if (w) { w.style.setProperty('--menu-wall', HOME_WALL); w.style.setProperty('--menu-wall-3x2', HOME_WALL_3X2); }
}
function applySetupWall() {
  const w = document.querySelector('#main-menu .cs-wallpaper');
  if (w) { w.style.setProperty('--menu-wall', SETUP_WALL); w.style.setProperty('--menu-wall-3x2', SETUP_WALL_3X2); }
}
applyHomeWall();
{ const t = $('team-select'); if (t) t.style.setProperty('--wall', TEAM_WALL); }
{ const c = $('char-select'); if (c) c.style.setProperty('--wall', CHAR_WALL); }

// Música de menu (loop, volume baixo). Toca só nas telas de menu; some quando a partida
// começa e volta ao voltar pro menu. Chrome bloqueia autoplay COM som até o 1º gesto do
// usuário — contorno: a faixa toca MUDA desde o load (permitido) e desmuta com fade no 1º
// gesto, então já está rolando quando o som entra. Se o arquivo não existir, falha em silêncio.
// ATENÇÃO: use uma faixa CC0/licenciada — NÃO usar música protegida (ex.: YouTube/MPB) no
// build público (risco de copyright, igual aos sons da Valve a trocar).
const MENU_MUSIC_VOL = 0.3;
const MENU_MUSIC_REVIEW_PARAMS = new URLSearchParams(location.search);
const MENU_MUSIC_REVIEW = MENU_MUSIC_REVIEW_PARAMS.get('menumusiclab') === '1';
const _menuMusicRequested = /^m(\d{2})$/.exec(MENU_MUSIC_REVIEW_PARAMS.get('menutrack') || '');
let menuMusicReviewIndex = _menuMusicRequested ? Math.max(0, Number(_menuMusicRequested[1]) - 1) : 0;
// Trilhas do menu (public/audio/menu-music/mNN.mp3 — trims de ~105s normalizados via ffmpeg,
// ver HANDOFF). Uma aleatória POR VISITA ao menu; troca a cada partida/retorno.
//
// A curadoria aprovada é nominal para a remoção de uma faixa não deslocar as demais.
// O laboratório mantém o catálogo completo; o jogo normal e o release usam só a seleção.
const MENU_REVIEW_TRACKS = Array.from({ length: 26 }, (_, i) => `/audio/menu-music/m${String(i + 1).padStart(2, '0')}.mp3`);
const MENU_TRACKS = (MENU_MUSIC_REVIEW ? MENU_REVIEW_TRACKS : MENU_MUSIC_ACTIVE_IDS.map((id) => `/audio/menu-music/${id}.mp3`));
fetch(`/audio/manifest.json?v=${VERSION}`)
  .then((response) => (response.ok ? response.json() : null))
  .then((manifest) => {
    if (MENU_MUSIC_REVIEW) return;
    const active = new Set(MENU_MUSIC_ACTIVE_IDS);
    const list = manifest && Array.isArray(manifest.menuMusic)
      ? manifest.menuMusic.filter((url) => active.has(_menuTrackId(url))) : null;
    if (!list || !list.length) return;
    // manifest grava caminho relativo (`audio/...`); a URL do <Audio> é absoluta (`/audio/...`).
    const novas = list.map((u) => (u.startsWith('/') ? u : `/${u}`));
    if (novas.join('|') === MENU_TRACKS.join('|')) return;
    MENU_TRACKS.splice(0, MENU_TRACKS.length, ...novas);
    // O boot chama startMenuMusic() antes desta promessa resolver e _ensureMusic cacheia o
    // <Audio> pra sempre — sem soltar o cache, a lista da pasta nunca escolhe faixa.
    tracksTrocadas = true;
    // Mudo ainda: dá pra trocar agora. Com som tocando não — a troca fica pendente e o
    // _ensureMusic pega na próxima visita ao menu, que é quando a faixa muda de qualquer jeito.
    if (!musicArmed) startMenuMusic();
  })
  .catch(() => {});
let menuMusic = null, musicArmed = false, musicFade = null, tracksTrocadas = false;
const _menuTrackId = (url) => url.match(/([^/]+)\.\w+$/)?.[1] || 'desconhecida';
function _ensureMusic() {
  if (menuMusic && !tracksTrocadas) return menuMusic;
  if (menuMusic) { menuMusic.pause(); menuMusic = null; }
  tracksTrocadas = false;
  { const _mi = MENU_MUSIC_REVIEW
      ? Math.max(0, Math.min(MENU_TRACKS.length - 1, menuMusicReviewIndex))
      : (Math.random() * MENU_TRACKS.length) | 0;
    const _url = MENU_TRACKS[_mi];
    // O laboratório pode trocar a fonte local mantendo o mesmo mNN; o sufixo evita que o
    // browser reutilize no A/B um MP3 antigo que já estava em cache sob a mesma URL.
    menuMusic = new Audio(MENU_MUSIC_REVIEW ? `${_url}?review=${encodeURIComponent(VERSION)}` : _url);
    // rótulo vem do NOME do arquivo, não do índice: com lista vinda da pasta o índice pode
    // não casar mais com o número da faixa (some uma no meio e o telemetry mentiria).
    if (!MENU_MUSIC_REVIEW) _pick('musica', _menuTrackId(_url)); }
  menuMusic.loop = true; menuMusic.volume = MENU_MUSIC_VOL;
  window.__mm = menuMusic;   // hook de debug/teste (estado da música do menu)
  return menuMusic;
}
function startMenuMusic() {
  const m = _ensureMusic();
  if (musicFade) { clearInterval(musicFade); musicFade = null; }
  if (!musicArmed) {
    // tenta autoplay COM SOM (Chrome libera se o site tem Media Engagement Index alto pro
    // usuário — é por isso que o YouTube consegue). Se rejeitar (NotAllowedError), cai no
    // fluxo atual: mudo no load + desmute com fade no 1º gesto. Sem promise não tratada.
    m.muted = false; m.volume = MENU_MUSIC_VOL;
    const p = m.play();
    if (p && p.then) p.then(() => { musicArmed = true; }, () => {
      if (m.paused) { m.muted = true; m.play().catch(() => {}); }   // fallback gracioso
    });
    // o play() do boot nem sempre "gruda" (rede/dev server lento, readyState 0) —
    // re-tenta quando houver dados, enquanto a intenção for tocar no menu
    if (!m._cpHook) { m._cpHook = 1; m.addEventListener('canplay', () => { if (!menuMusic || menuMusic.paused) m.play().catch(() => {}); }); }
    return;
  }
  m.muted = false; m.volume = MENU_MUSIC_VOL;
  m.play().catch(() => {});   // silencioso se arquivo ausente
}
function stopMenuMusic() {   // fade rápido pra não cortar seco ao entrar na partida
  if (!menuMusic) return;
  if (musicFade) clearInterval(musicFade);
  musicFade = setInterval(() => {
    menuMusic.volume = Math.max(0, menuMusic.volume - 0.05);
    if (menuMusic.volume <= 0.001) { clearInterval(musicFade); musicFade = null; menuMusic.pause(); }
  }, 40);
}
// no 1º gesto (clique/tecla): desmuta com fade-in — a faixa JÁ está rolando (autoplay mudo),
// então o som "entra" instantâneo, como se fosse autoplay de verdade
const _armMusic = () => {
  if (musicArmed) return; musicArmed = true;
  const m = _ensureMusic();
  m.muted = false;
  let v = 0.02; m.volume = v;
  musicFade = setInterval(() => { v += 0.04; m.volume = Math.min(MENU_MUSIC_VOL, v); if (v >= MENU_MUSIC_VOL) { clearInterval(musicFade); musicFade = null; } }, 40);
};
// SPLASH DE BOOT ("pressione para entrar"): o gesto que sai da splash é GARANTIDO, então
// destrava o áudio COM SOM na hora — sem fallback mudo e sem fade atrapalhado. Registrado
// em capture ANTES do _armMusic, que vira no-op (musicArmed já true).
function dismissSplash(e) {
  const sp = document.getElementById('boot-splash');
  if (!sp || !_splashReady || sp.classList.contains('gone')) return;
  e?.preventDefault?.(); e?.stopPropagation?.();
  _entradaEm = performance.now();
  loadingStage.hide();
  dockLoadingCharacter();
  sp.classList.add('gone');
  window.__gameLaunch?.ready('entrada');
  setTimeout(() => sp.remove(), 480);
  setTimeout(focusMenu, 120);   // pós-splash: dá foco ao 1º botão pra ↑/↓ navegarem SEM precisar de Tab
  musicArmed = true;
  if (musicFade) { clearInterval(musicFade); musicFade = null; }
  const m = _ensureMusic();
  m.muted = false; m.volume = MENU_MUSIC_VOL; m.play().catch(() => {});
}
/* Foco no 1º item visível do menu CS: o handler de setas vive no #cs-menu e só dispara com
   o foco lá dentro. Guardas: não rouba foco de campo de texto nem do painel de setup. */
function focusMenu() {
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
  const menu = document.getElementById('main-menu');
  if (!menu || menu.classList.contains('hidden')) return;
  const ms = document.getElementById('menu-setup');
  if (ms && ms.classList.contains('open')) return;
  const first = [...document.querySelectorAll('.cs-item')].find((b) => b.offsetParent !== null);
  if (first) first.focus();
}
window.addEventListener('pointerdown', dismissSplash, true);
window.addEventListener('keydown', dismissSplash, true);
window.addEventListener('pointerdown', _armMusic);
window.addEventListener('keydown', _armMusic);
startMenuMusic();   // boot: começa MUDA imediatamente (loop rolando antes do 1º clique)

/* Laboratório local de curadoria (?menumusiclab=1). O jogo normal continua escolhendo uma
   faixa aleatória por visita; aqui a escolha é determinística e o veredito fica somente no
   localStorage. Assim dá para ouvir no contexto real do menu sem apagar um MP3 por engano. */
function mountMenuMusicReview() {
  if (!MENU_MUSIC_REVIEW || document.getElementById('menu-music-review')) return;
  const host = document.getElementById('main-menu');
  if (!host) return;
  const key = 'csbr-menu-music-review-v1';
  let verdicts = {};
  try { verdicts = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { verdicts = {}; }
  const lab = document.createElement('aside');
  lab.id = 'menu-music-review';
  lab.setAttribute('aria-label', 'Revisão das músicas do menu');
  lab.innerHTML = `
    <span class="mmr-kicker">CURADORIA LOCAL</span>
    <strong id="mmr-track">FAIXA</strong>
    <span id="mmr-progress"></span>
    <div class="mmr-row">
      <button id="mmr-prev" type="button" title="Faixa anterior">‹ ANTERIOR</button>
      <button id="mmr-restart" type="button" title="Ouvir esta faixa desde o início">REOUVIR</button>
      <button id="mmr-next" type="button" title="Próxima faixa">PRÓXIMA ›</button>
    </div>
    <div class="mmr-row mmr-verdicts">
      <button id="mmr-keep" type="button">MANTER</button>
      <button id="mmr-reject" type="button">REMOVER</button>
      <button id="mmr-clear" type="button">LIMPAR</button>
    </div>
    <span class="mmr-catalog-title">CATÁLOGO · CLIQUE PARA OUVIR</span>
    <div id="mmr-list" class="mmr-list" aria-label="Lista das músicas do menu"></div>
    <button id="mmr-copy" class="mmr-copy" type="button">COPIAR RESULTADO</button>`;
  host.appendChild(lab);

  const byId = (id) => document.getElementById(id);
  const normalizeIndex = (i) => (i + MENU_TRACKS.length) % MENU_TRACKS.length;
  const currentId = () => _menuTrackId(MENU_TRACKS[menuMusicReviewIndex]);
  const catalog = byId('mmr-list');
  catalog.innerHTML = MENU_TRACKS.map((url, index) => {
    const id = _menuTrackId(url);
    return `<button type="button" class="mmr-list-item" data-track-index="${index}" data-track-id="${id}" title="Ouvir ${id.toUpperCase()}"><span>${id.toUpperCase()}</span><b aria-hidden="true">?</b></button>`;
  }).join('');
  const sync = () => {
    const id = currentId();
    const atuais = MENU_TRACKS.map(_menuTrackId).map((track) => verdicts[track]);
    const keep = atuais.filter((v) => v === 'manter').length;
    const reject = atuais.filter((v) => v === 'remover').length;
    byId('mmr-track').textContent = `${id.toUpperCase()} · ${menuMusicReviewIndex + 1}/${MENU_TRACKS.length}`;
    byId('mmr-progress').textContent = `MANTER ${keep} · REMOVER ${reject} · PENDENTES ${MENU_TRACKS.length - keep - reject}`;
    lab.dataset.verdict = verdicts[id] || 'pendente';
    for (const item of catalog.querySelectorAll('[data-track-index]')) {
      const verdict = verdicts[item.dataset.trackId] || 'pendente';
      item.dataset.verdict = verdict;
      item.classList.toggle('current', Number(item.dataset.trackIndex) === menuMusicReviewIndex);
      item.querySelector('b').textContent = verdict === 'manter' ? '✓' : verdict === 'remover' ? '×' : '?';
    }
  };
  const play = (index, restart = false) => {
    menuMusicReviewIndex = normalizeIndex(index);
    tracksTrocadas = true;
    const m = _ensureMusic();
    if (restart) m.currentTime = 0;
    musicArmed = true; m.muted = false; m.volume = MENU_MUSIC_VOL;
    m.play().catch(() => {});
    const url = new URL(location.href);
    url.searchParams.set('menutrack', currentId());
    history.replaceState(null, '', url);
    sync();
  };
  const mark = (verdict) => {
    const id = currentId();
    if (verdict) verdicts[id] = verdict; else delete verdicts[id];
    localStorage.setItem(key, JSON.stringify(verdicts));
    sync();
    if (verdict) play(menuMusicReviewIndex + 1);
  };
  byId('mmr-prev').onclick = () => play(menuMusicReviewIndex - 1);
  byId('mmr-next').onclick = () => play(menuMusicReviewIndex + 1);
  byId('mmr-restart').onclick = () => play(menuMusicReviewIndex, true);
  byId('mmr-keep').onclick = () => mark('manter');
  byId('mmr-reject').onclick = () => mark('remover');
  byId('mmr-clear').onclick = () => mark(null);
  for (const item of catalog.querySelectorAll('[data-track-index]')) {
    item.onclick = () => play(Number(item.dataset.trackIndex));
  }
  byId('mmr-copy').onclick = async () => {
    const list = (v) => MENU_TRACKS.map(_menuTrackId).filter((id) => verdicts[id] === v);
    const text = `MANTER: ${list('manter').join(', ') || '(nenhuma)'}\nREMOVER: ${list('remover').join(', ') || '(nenhuma)'}`;
    try { await navigator.clipboard.writeText(text); byId('mmr-copy').textContent = 'COPIADO'; }
    catch { prompt('Copie o resultado:', text); }
  };
  sync();
}
mountMenuMusicReview();

const isMobile = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
/* TOUCH = aparelho de toque DE VERDADE (dedo, sem mouse). Separado do isMobile porque este
   inclui "janela estreita" — um desktop com a janela apertada NÃO deve entrar em modo toque
   (perderia o mouse-look). Só o TOUCH liga os controles de dedo e a trava de orientação. */
const TOUCH = matchMedia('(pointer: coarse)').matches;
let settingsReturn = 'main-menu';
let howtoReturn = 'main-menu';   // CONTROLES aberto pelo pause volta pro pause, pelo menu volta pro menu

/* ---------------- 3D character preview ---------------- */
let pv = null, pvDrag = null;
/* RETRATO HERO em vez do recorte low-poly. Os 44 de public/img/chars-hero/ saem do
   MESMO GLB (o render é a referência que trava a identidade — ver
   tools/gen-char-realista.mjs), só com densidade de detalhe que a malha do jogo não
   tem. Verificado: os 44 ids do characters.js têm arquivo, então não há caminho de
   404 por personagem faltando.
   Uma função só alimenta prévia estática, fallback do snapshot 3D e modo de
   qualidade baixa — trocar aqui melhora os três de uma vez. */
const portraitUrl = (def) => `/img/chars-hero/${def.id}.webp?v=${VERSION}`;
/* O antigo continua no repo e vira a rede de segurança: se o hero não carregar, a
   imagem cai para o recorte do modelo em vez de ficar quebrada. */
const portraitFallbackUrl = (def) => `/img/chars/${def.id}.webp?v=${VERSION}`;
/* VÍDEO DO PERSONAGEM (tela 03 do redesign): captura do próprio modelo, rig e clipe
   do jogo por tools/eval/char-native-vids.mjs. Falha de rede mantém o canvas/GLB. */
let pvVidToken = 0;
function previewVideoVisible() {
  return document.querySelector('.char-preview-box')?.classList.contains('has-video') === true;
}
function pvStopVideo() {
  const box = document.querySelector('.char-preview-box');
  const video = $('char-preview-video');
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.classList.add('hidden');
  box?.classList.remove('has-video');
}
function pvSetVideo(def) {
  const box = document.querySelector('.char-preview-box');
  const video = $('char-preview-video'), hints = document.querySelector('.pv-hints');
  if (!box || !video) return;
  const my = ++pvVidToken;
  box.classList.remove('has-video');
  video.classList.add('hidden');
  // no modo estático (sem WebGL) as dicas de GIRAR/ZOOM nunca aparecem — nem quando o vídeo falta
  if (hints) hints.classList.toggle('hidden', staticPreviews);
  video.onerror = () => { if (my === pvVidToken) { box.classList.remove('has-video'); video.classList.add('hidden'); } };
  video.onloadeddata = () => {
    if (my !== pvVidToken) return;
    video.play().catch(() => {});
    box.classList.add('has-video');
    video.classList.remove('hidden');
    if (hints) hints.classList.add('hidden');
  };
  video.src = `/video/chars/${def.id}.webm?v=${VERSION}`;
  video.load();
}
function showStaticPreview(def) {
  const canvas = $('char-preview'), image = $('char-preview-static'), hints = document.querySelector('.pv-hints');
  if (canvas) canvas.classList.add('hidden');
  if (image) {
    image.onerror = () => { image.onerror = null; image.src = portraitFallbackUrl(def); };
    image.src = portraitUrl(def); image.alt = def.name; image.classList.remove('hidden');
  }
  if (hints) hints.classList.add('hidden');
}
function ensurePreview() {
  if (staticPreviews) return null;
  if (pv) return pv;
  const canvas = $('char-preview');
  const r = criaRenderer({ canvas, alpha: true }, { optional: true });
  if (!r) { staticPreviews = true; return null; }
  // 640² de backing pro preview GIGANTE da tela nova (era 400² pra 380 CSS px).
  // O downscale continua dando borda limpa em qualquer tamanho de exibição.
  r.setSize(640, 640, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffe6c0, 0x5a4a38, 1.1));
  const key = new THREE.DirectionalLight(0xffe0b3, 1.8); key.position.set(2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.55); rim.position.set(-3, 2, -2); scene.add(rim);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 26), new THREE.MeshLambertMaterial({ color: 0x2e331f }));
  disc.position.y = -0.03; disc.receiveShadow = true; scene.add(disc);
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  cam.position.set(0, 1.3, 3.2); cam.lookAt(0, 0.92, 0);
  pv = { r, scene, cam, model: null, disc };
  // GIRAR/ZOOM de verdade — a dica embaixo do canvas não pode ser enfeite.
  // Arrastar gira o modelo; scroll aproxima. Durante o arraste o giro automático pausa (ver loop()).
  canvas.addEventListener('pointerdown', e => {
    pvDrag = { x: e.clientX, yaw: pv.model ? pv.model.rotation.y : 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (pvDrag && pv.model) pv.model.rotation.y = pvDrag.yaw + (e.clientX - pvDrag.x) * 0.012;
  });
  canvas.addEventListener('pointerup', () => { pvDrag = null; });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    pv.cam.position.z = Math.min(4.6, Math.max(2.2, pv.cam.position.z + e.deltaY * 0.002));
  }, { passive: false });
  return pv;
}
/* ---------- miniatura da lista de personagens ----------------------------------
   BUG DO DONO: "nas miniaturas os bonecos aparecem cinzas/sem cor, o preview grande
   tem cor". A luz e o material eram os MESMOS — o defeito era de ENQUADRAMENTO e de
   composição, e ele acontecia três vezes:
     1. a miniatura reusava a câmera do preview (corpo inteiro a 3,2 m + disco escuro):
        num quadro de 96 px o personagem saía com ~40 px, e exibido a 52 px sobrava
        ~28 px de boneco. Quase todo pixel da miniatura era FUNDO;
     2. o downscale de 96 -> 52 misturava esses poucos pixels coloridos com o preto do
        fundo, então o croma médio caía (medido no print do dono: S 0,35 na miniatura
        contra 0,42 no preview grande, mesmo personagem, mesmo frame);
     3. o PNG saía com alfa e ia compor sobre --bg-700, um segundo escurecimento.
   Correção: câmera PRÓPRIA de retrato (o personagem ocupa a miniatura inteira),
   supersampling (render a 400² -> grava a 128²), disco fora do quadro e fundo OPACO
   pintado antes do drawImage. Mesma luz, mesmo material, mesma cena: consistência. */
// Kill-switch: ?thumbcam=0 volta a gravar a miniatura com a câmera larga do preview
// (o comportamento antigo), caso o retrato corte mal algum personagem fora do padrão.
// (URLSearchParams próprio: o `params` global só é declarado mais abaixo no arquivo)
const THUMB_PORTRAIT = new URLSearchParams(location.search).get('thumbcam') !== '0';
const THUMB_PX = 128;
let _thumbCam = null;
function thumbCam() {
  if (!THUMB_PORTRAIT) return ensurePreview().cam;
  if (_thumbCam) return _thumbCam;
  // Retrato: da cintura pra cima. A altura visível a essa distância é ~1,15 m contra os
  // 1,72 m do personagem — é o recorte que faz camisa, pele e cabelo lerem a 56 px.
  const c = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  c.position.set(0, 1.30, 2.15); c.lookAt(0, 1.24, 0);
  _thumbCam = c;
  return c;
}
function snapThumb(obj, fallbackUrl) {
  const p = ensurePreview();
  if (!p) return fallbackUrl;
  const prevVis = p.model ? p.model.visible : false;
  if (p.model) p.model.visible = false;
  if (p.disc) p.disc.visible = false;   // o disco entra no quadro do retrato e só rouba contraste
  p.scene.add(obj);
  p.r.render(p.scene, thumbCam());
  const c = document.createElement('canvas'); c.width = c.height = THUMB_PX;
  const x = c.getContext('2d');
  x.fillStyle = '#1c1812';              // = var(--bg-700): a miniatura já nasce composta
  x.fillRect(0, 0, THUMB_PX, THUMB_PX);
  x.drawImage(p.r.domElement, 0, 0, THUMB_PX, THUMB_PX);   // backing 640² -> 128²: downscale = antialias de graça
  p.scene.remove(obj);
  if (p.disc) p.disc.visible = true;
  if (p.model) p.model.visible = prevVis;
  return c.toDataURL();
}
// Each character shows off a weapon that fits their vibe (not everyone with an AK).
// CHAR_WEAPON/charWeapon live in characters.js, shared with game.js (initial loadout).
let pvToken = 0;
function pvSetChar(def) {
  if (staticPreviews) { showStaticPreview(def); return; }
  const p = ensurePreview();
  if (!p) { showStaticPreview(def); return; }
  // Swap to the real rigged GLB (idle) once loaded, if this is still the selection.
  const my = ++pvToken;
  const showBox = () => {   // procedural fallback (only when there's no GLB at all)
    if (p.model) p.scene.remove(p.model);
    p.mixer = null; p.ctrl = null;
    p.model = buildCharacter(def).group;
    p.model.rotation.y = -0.4;
    p.scene.add(p.model);
  };
  // ?nav=1 mantém o preview procedural; web-assets.spec.js cobre o GLB real.
  if (navOnly) { showBox(); return; }
  if (GLB_CHARS.has(def.id)) {
    // Keep the PREVIOUS model visible while the real GLB streams in — never flash the
    // blocky placeholder for a character that has a real model (the pop-in bug).
    preloadCharacterAssets([def.id]).then(() => {
      if (my !== pvToken) return;
      // preview: porte de EXIBIÇÃO — arma atravessada no peito (estilo vitrine do CS) em
      // vez do porte funcional que aponta o cano pra câmera e esconde a silhueta da arma
      // (era o "posturas bizarras" de 05/08). Ângulos por classe em glbchars.js. No jogo,
      // nada muda.
      const m = hasModel(def.id) ? buildCharacterModel(def, { weaponId: charWeapon(def.id), preview: true }) : null;
      if (!m) { showBox(); return; }
      if (p.model) p.scene.remove(p.model);
      // Somente o GLB real marca o canvas para web-assets.spec.js.
      $('char-preview').dataset.glb = '1';
      m.group.rotation.y = -0.4;
      p.model = m.group; p.mixer = m.mixer; p.ctrl = m.ctrl;
      p.scene.add(m.group);
    }).catch(() => { if (my === pvToken) showBox(); });
  } else {
    showBox();
  }
}
function pvThumb(def) {
  if (staticPreviews) return portraitUrl(def);
  // Box-only thumbnail (tiny icon) — never triggers a GLB load.
  // Passa pelo MESMO snapThumb do GLB: antes esta versão ainda destruía o preview
  // grande (p.model = null) e gravava com outro enquadramento — duas miniaturas com
  // duas aparências na mesma lista é exatamente o tipo de inconsistência que o dono vê.
  const box = buildCharacter(def).group; box.rotation.y = 0.55;
  return snapThumb(box, portraitUrl(def));
}

/* ---------------- game lifecycle ---------------- */
let game = null, currentTeam = 'E', currentFaction = 'E', currentChar = CHARACTERS[0].id, selChar = null;
let pickingEnemy = false, currentEnemyFaction = null;   // 2º passo do team-select: escolher o adversário
let submitted = true;   // stats da partida atual já enviados?

/* ---------------- TELEMETRIA ANÔNIMA (contrato em tools/eval/telemetry-check) --------------
   O ranking está desligado (src/lib/site.ts, RANKING_ON) mas a MEDIÇÃO não: o dono
   quer saber quanto tempo se joga e em que mapa.

   POR QUE UM ID PRÓPRIO E NÃO O NICK: `recordMatchStats` só fala com o backend dentro
   de `if (nick && !testMode)`. Quem entra e joga sem digitar nick — que é o caminho
   de menor atrito, e por isso o mais comum — não registra, não manda heartbeat e não
   submete: é invisível. Medir só quem se registrou enviesa a amostra exatamente para
   o jogador mais engajado, que é o contrário do que serve pra decidir mapa.

   `anonId` identifica NAVEGADOR, não pessoa: UUID no localStorage, some quando o
   jogador limpa o storage. O nick vai junto quando existe, só pra cruzar com `stats`
   quando o ranking voltar.

   Os eventos usam fetch keepalive: sobrevive ao unload e permite `credentials: omit`.
   Isto importa porque sendBeacon força credenciais e, com JSON cross-origin, depende de
   um preflight credenciado perfeito no Cloud Run. */
const ANON_KEY = 'cs_anon';
const SESSION_KEY = 'cs_session';
function clientUuid() {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  if (typeof c?.getRandomValues !== 'function') throw new Error('Web Crypto indisponível');
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function getAnonId() {
  let a = localStorage.getItem(ANON_KEY);
  if (!a) { a = clientUuid(); localStorage.setItem(ANON_KEY, a); }
  return a;
}
function getSessionId() {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) { s = clientUuid(); sessionStorage.setItem(SESSION_KEY, s); }
  return s;
}
function sendJsonKeepalive(path, payload) {
  try {
    void fetch(apiUrl(path), {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    return true;
  } catch { return false; }
}
let telemetrySent = true;
function sendTelemetry() {
  if (telemetrySent || testMode || !game) return;
  telemetrySent = true;   // uma partida = uma linha, mesmo com quit + beforeunload juntos
  const g = game;
  const payload = {
    anonId: getAnonId(),
    map: currentMap,
    mode: matchMode,
    seconds: Math.round(g.time || 0),
    rounds: (g.roundsWon?.E || 0) + (g.roundsWon?.B || 0),
    nick: registeredNick || null,
  };
  sendJsonKeepalive('/api/telemetry', payload);
}
let registeredNick = ''; // nick canônico devolvido pelo registro do UID
let rankingBloqueado = ''; // erro do register da sessão (nick de outro dono, charset…) — vira aviso claro no fim da partida
let heartbeatOff = false;

/* CONTADOR "N ONLINE" do rodapé do menu (pedido do dono, 06/08). GET /api/online lê a
   view online_now (heartbeat < 2 min). `hidden` até ter número: rodapé nunca mostra
   zero mentiroso quando o backend está fora/local. Atualiza a cada 60 s só no menu. */
{ const v = document.getElementById('mf-ver'); if (v) v.textContent = `CORO SOLTO v${VERSION}`; }
// o idioma por país resolve ANTES de traduzir o menu (o fetch começou no <head>)
await resolveGeoLang();
// EN por camada: varre o menu estático UMA vez (PT é a fonte; i18n.js explica o desenho)
translateDom(document.body);
// links do rodapé por idioma: EN vai pras gêmeas que EXISTEM (characters, how-to-play,
// weapons, maps, about, whats-new, docs/en); /mapa continua só PT (issue #54)
if (LANG === 'en') for (const a of document.querySelectorAll('.menu-footer a')) {
  const GEMEA = { '/personagens': '/characters', '/como-jogar': '/how-to-play', '/armas': '/weapons', '/mapas': '/maps', '/sobre': '/about', '/changelog': '/whats-new', '/docs/': '/docs/en/' };
  const h = a.getAttribute('href');
  if (GEMEA[h]) a.setAttribute('href', GEMEA[h]);
}
// seletor de idioma em CONFIGURAÇÕES: grava e recarrega (o dicionário aplica no boot)
{ const sel = document.getElementById('set-lang');
  if (sel) {
    let salvo = null; try { salvo = localStorage.getItem('cs_lang'); } catch {}
    sel.value = salvo || 'auto';
    sel.onchange = () => {
      try { salvo = sel.value === 'auto' ? localStorage.removeItem('cs_lang') : localStorage.setItem('cs_lang', sel.value); } catch {}
      location.reload();
    };
  } }
/* PICKS — "o que as pessoas escolhem" (dono, 06/08). keepalive: nunca atrasa nem
   quebra o jogo; o servidor conta por (kind, key) na picks_daily (migration 013). */
function _pick(kind, key) {
  try {
    sendJsonKeepalive('/api/pick', {
      kind, key, eventId: clientUuid(), anonId: getAnonId(), sessionId: getSessionId(),
      matchEventId: telemetryGameContext.gameType ? _matchEventId : null,
      ...telemetryGameContext,
    });
  } catch { /* pode rodar antes do bootstrap da telemetria; nunca quebra o menu */ }
}
function _picks(lote) {
  try {
    sendJsonKeepalive('/api/pick', {
      anonId: getAnonId(), sessionId: getSessionId(),
      matchEventId: telemetryGameContext.gameType ? _matchEventId : null,
      ...telemetryGameContext,
      picks: lote.map((pick) => ({ ...pick, eventId: clientUuid() })),
    });
  } catch { /* fail-silent */ }
}
/* PRESENÇA ANÔNIMA — o que o "N online" do rodapé passou a contar (07/08).
   Antes o único sinal de presença era o `/api/heartbeat`, que exige nick + token e
   só dispara com `game && registeredNick`: jogador REGISTRADO e DENTRO de partida.
   Com o site no ar, a Vercel Analytics mostrava 8 pessoas e o rodapé mostrava
   nada — as duas medidas certas, contando coisas diferentes, e a maioria nunca
   digita nick.

   `anonId` é o MESMO UUID da telemetria (navegador, não pessoa). Só pinga com a
   aba VISÍVEL: aba de fundo esquecida por horas inflaria o contador, e número
   inflado num rodapé de social proof é pior que número pequeno.
   45 s contra a janela de 2 min da view (migration 014): perder um pacote não
   apaga ninguém da conta. */
async function _pingPresenca(aguardar = false) {
  if (testMode) return false;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;
  const payload = JSON.stringify({ anonId: getAnonId() });
  if (aguardar) {
    try {
      const response = await fetch(apiUrl('/api/presence'), {
        method: 'POST', keepalive: true, credentials: 'omit',
        headers: { 'content-type': 'application/json' }, body: payload,
      });
      if (response.ok) return true;
    } catch { /* o beacon abaixo ainda tenta entregar */ }
  }
  sendJsonKeepalive('/api/presence', JSON.parse(payload));
  return false;
}

/* ============ TELEMETRIA NOVA (feat/telemetria: funil · aquisição · perf · match) ============
 * Quatro sinais que SAIAM do Vercel Analytics (plano grátis não filtra propriedade de
 * evento) e passam a morar no NOSSO backend, lidos pelo painel admin. Mesma regra das
 * irmãs: fetch keepalive, fail-silent, anônimas por anonId (UUID de localStorage), sem IP.
 * Contrato: /api/{match,funnel,perf,acquisition} e tools/eval/telemetry-check.mjs. */
// FUNIL (017): land → menu → match_start → match_end → quit. Converte "chegou a jogar?".
function _funnel(step) {
  if (testMode) return;
  sendJsonKeepalive('/api/funnel', { step, sessionId: getSessionId() });
}
// AQUISIÇÃO (019): 1x por navegador. referrer vira host (URL inteira pode carregar query
// sensível); UTM e ?ref= lidos da URL de entrada. first-touch-wins no servidor.
let _acqSent = false;
async function _sendAcquisition() {
  if (testMode || _acqSent) return;
  try { if (localStorage.getItem('cs_acq')) { _acqSent = true; return; } } catch {}
  const u = new URLSearchParams(location.search);
  const payload = {
    anonId: getAnonId(),
    referrer: document.referrer || null,
    utmSource: u.get('utm_source'), utmMedium: u.get('utm_medium'), utmCampaign: u.get('utm_campaign'),
    ref: u.get('ref'), landing: location.pathname,
  };
  try {
    /* fetch + keepalive, e NÃO sendBeacon: aqui a RESPOSTA importa. sendBeacon
       não devolve resposta — marcar cs_acq sem saber se o servidor gravou
       aposentava a 1ª aquisição para sempre num 503/stored:false (P1 da review,
       PR #92). keepalive mantém a entrega mesmo se a aba fechar no meio. */
    const resp = await fetch(apiUrl('/api/acquisition'), {
      method: 'POST', keepalive: true, credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const dados = await resp.json().catch(() => null);
    if (!resp.ok || !dados || dados.stored !== true) return; // próxima visita retenta
    try { localStorage.setItem('cs_acq', '1'); } catch {}
    _acqSent = true;
  } catch { /* fail-silent */ }
}
// PERF (018): 1x por sessão, EM PARTIDA. fps = contagem de frames em 1s de rAF
// ~4s após o state==='live' (fora da janela de compile de shader); bootMs = tempo
// até JOGÁVEL; loadMs = carga do módulo (o que bootMs media antes — sinal mantido).
// Até 15/08 a janela de fps media o 1º segundo de vida da página: main thread
// parseando JS e compilando shader não roda rAF, e o painel vendia esse jank de
// BOOT como "FPS P50" (98% < 30 FPS no print do dono) — número que media outra coisa.
let _perfSent = false;
const _perfLoadMs = Math.round(performance.now());
function _sendPerf() {
  if (testMode || _perfSent) return;
  _perfSent = true;
  const aguardaLive = () => {
    const g = window.__game;
    if (!g || g.state !== 'live') {
      if (performance.now() - _perfLoadMs < 120000) setTimeout(aguardaLive, 250);
      return;
    }
    const bootMs = Math.round(performance.now());
    setTimeout(() => _perfMedeFps(bootMs), 4000);
  };
  aguardaLive();
}
function _perfMedeFps(bootMs) {
  let frames = 0; const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else _perfFinish(bootMs, frames); };
  requestAnimationFrame(tick);
}
function _perfFinish(bootMs, frames) {
  let rendererStr = null;
  try {
    const gl = renderer.getContext();
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    rendererStr = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null;
  } catch { /* GPU info é melhor-esforço */ }
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const payload = {
    anonId: getAnonId(), version: VERSION,
    sessionId: getSessionId(), ...telemetryGameContext,
    fps: frames, bootMs, loadMs: _perfLoadMs,
    cores: navigator.hardwareConcurrency || null,
    memoryGb: navigator.deviceMemory || null,
    renderer: rendererStr,
    dpr: window.devicePixelRatio || null,
    vw: window.innerWidth, vh: window.innerHeight,
    connection: conn?.effectiveType || null,
    quality: settings.quality || null,
    // sinais do ops.js (boot, FPS p50/p5, falhas de carga, sessão anterior); o backend descarta o que não conhece
    ops: (() => { try { return window.__csbOps?.resumoBeacon?.() || null; } catch { return null; } })(),
  };
  sendJsonKeepalive('/api/perf', payload);
}
// MATCH EVENT (016): evento RICO por partida (anônimo), carrega arma/personagem/placar/
// resultado. Complementa o submit-match (só registrado) e a telemetria agregada (012).
// _wperf vem do game.js (abates por arma, zerado por partida no construtor).
let _matchEventSent = false;
function sendMatchEvent(result) {
  if (_matchEventSent || testMode || !game) return;
  _matchEventSent = true;
  game._flushTraining?.();   // BOTBRAIN: envia o resto dos frames ao sair/abandonar (idempotente)
  const g = game, p = g.player, wk = g._wperf || {};
  const top = Object.entries(wk).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const payload = {
    anonId: getAnonId(),
    sessionId: getSessionId(), eventId: _matchEventId, version: VERSION,
    ...telemetryGameContext,
    map: currentMap, mode: matchMode === 'ctf' ? 'ctf' : 'rounds',
    character: currentChar, team: g.playerTeam,
    faction: g.playerFaction || currentFaction,
    result: result || 'quit',
    kills: p.kills || 0, deaths: p.deaths || 0, headshots: p.headshots || 0,
    bestStreak: g.mk?.best || 0,
    rounds: (g.roundsWon?.E || 0) + (g.roundsWon?.B || 0),
    seconds: Math.round(g.time || 0),
    topWeapon: top, weaponKills: wk, botCount: g.bots?.length || 0,
    nick: registeredNick || null,
  };
  sendJsonKeepalive('/api/match', payload);
}
function sendTrainingFrames(blob) {
  if (testMode || !blob || !registeredNick || !trainingEnabled()) return;
  try {
    api('/api/train-frames', {
      uid: getAnonId(), token: getToken(), ...blob,
    });
  } catch { /* coleta nunca interrompe a partida */ }
}
/* AS CHAMADAS MORAM DEPOIS DO `const testMode` — e isto não é estilo, é o que fazia o jogo
   não abrir (07/08, medido em produção). `_pingPresenca` lê `testMode` na primeira linha;
   `const` não é hoisted como `var`: chamar a função ANTES da linha 498 lança
   `ReferenceError: Cannot access 'testMode' before initialization` — no ESCOPO DO MÓDULO,
   ou seja a avaliação inteira de `main.js` morre ali. Tudo que é ligado depois nunca
   acontece: medido no navegador, `#btn-jogar` existia e o `onclick` dele (linha ~779) era
   `null`. O botão JOGAR do site no ar estava inerte, e o console mostrava UMA linha.
   Régua: `tools/eval/boot-check.mjs`. */

async function _refreshOnline() {
  try {
    const r = await fetchComRetry(apiUrl('/api/online'));
    const { online } = await r.json();
    const box = document.getElementById('mf-online'), n = document.getElementById('mf-online-n');
    if (box && n && typeof online === 'number' && online > 0) { n.textContent = online; box.hidden = false; }
    else if (box) box.hidden = true;
  } catch { /* rodapé segue sem contador */ }
}
const params = new URLSearchParams(location.search);
const inspectionScreen = resolveInspectionScreen(params);
// A curadoria é uma sessão de teste, mas mantemos a expressão canônica abaixo porque
// screenquery-check também prova a integração do modo de inspeção por query.
if (MENU_MUSIC_REVIEW) params.set('debug', '1');
const testMode = params.get('debug') === '1' || !!inspectionScreen;
// ?nav=1 isola transições de tela; web-assets.spec.js cobre preload e render 3D.
const navOnly = params.get('nav') === '1';

/* Presença: as chamadas descem para CÁ, depois de `testMode` existir (ver o comentário na
   linha em que elas moravam). O intervalo e o comportamento são os mesmos — o que muda é
   só a ordem, que era o defeito. */
async function _iniciaPresencaOnline() {
  await _pingPresenca(true);
  await _refreshOnline();
}
void _iniciaPresencaOnline();
setInterval(_pingPresenca, 45_000);
setInterval(_refreshOnline, 60_000);

/* Telemetria nova (feat/telemetria) — dispara UMA vez na carga, depois de `testMode`
   existir (mesma lição do BUG-34: estas leem testMode na 1ª linha). */
_sendAcquisition();   // aquisição 1x por navegador (019)
_funnel('land');      // funil: chegou (017)
_sendPerf();          // perf de cliente 1x por sessão (018)
// funil 'menu': 1ª interação real (teclado ou mouse) — separa "olhou e foi" de "usou".
let _menuFuneled = false;
const _menuOnce = () => { if (_menuFuneled) return; _menuFuneled = true; _funnel('menu'); removeEventListener('pointerdown', _menuOnce); removeEventListener('keydown', _menuOnce); };
addEventListener('pointerdown', _menuOnce);
addEventListener('keydown', _menuOnce);

async function startGame(team, charId, enemyFaction, online = false) {
  /* #241: em rede lenta o preload dos GLBs passa de 60 s COM progresso andando
     (_lstat.loaded sobe a cada arquivo do DefaultLoadingManager). O watchdog
     renova enquanto há movimento e só falha se o progresso PARAR — travamento
     de verdade continua sendo pego. */
  let _wp = _lstat.loaded;
  window.__gameLaunch?.begin('partida', 60000, function () {
    if (_lstat.loaded > _wp) { _wp = _lstat.loaded; return 'rede-lenta'; }
    return !!(window.__game && window.__game.state === 'live');
  });
  try {
    await _startGame(team, charId, enemyFaction, online);
    window.__gameLaunch?.ready('partida');
  } catch (e) {
    try { hideLoading(); } catch {}
    try { if (game) game.dispose(); } catch {}
    game = null; window.__game = null;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch {}
    try { if (document.fullscreenElement) document.exitFullscreen()?.catch?.(() => {}); } catch {}
    try { show('main-menu'); } catch {}
    console.error('falha ao abrir a partida', e);
    window.__gameLaunch?.fail(e, 'main.js:startGame');
  }
}
async function _startGame(team, charId, enemyFaction, online = false) {
  const sessao = online ? mpSessao : null;
  const metaMp = sessao?.net?.meta || {};
  const salaMp = sessao?.sala || {};
  telemetryGameContext = online ? {
    gameType: 'multiplayer',
    node: String(metaMp.regiao || sessao?.no?.ticketNode || sessao?.no?.id || '').toLowerCase() || null,
    roomId: metaMp.room || salaMp.id || salaMp.room || null,
    roomOfficial: !!(metaMp.oficial ?? salaMp.oficial),
    createdRoom: !!metaMp.createdRoom,
  } : {
    gameType: 'single_player', node: null, roomId: null, roomOfficial: null, createdRoom: null,
  };
  // Nasce ANTES dos picks: pick_event.match_event_id passa a ligar a escolha ao
  // resultado/duração exatos desta partida, não apenas à aba do navegador.
  _matchEventId = clientUuid();
  // MOBILE: não bloqueia mais — entra com controles de toque. No retrato o overlay
  // "gire o celular" (CSS) cobre a tela até deitar.
  // facção = time do personagem ('E'/'B'/'U'). O jogador ESCOLHE o adversário (enemyFaction);
  // default = oposto político. Mesma facção dos dois lados = mirror (inimigo roxo no HUD).
  const faction = (CHARACTERS.find(c => c.id === charId) || {}).team || team || 'E';
  const side = resolvePlayerSide(team, faction, online);
  const enemyFac = enemyFaction || currentEnemyFaction || (side === 'B' ? 'E' : 'B');
  currentFaction = faction; currentTeam = side; currentChar = charId; currentEnemyFaction = enemyFac;
  // o lote de escolha da partida — 5 contadores numa chamada (ver /api/pick)
  _picks([
    { kind: 'mapa', key: currentMap },
    { kind: 'modo', key: matchMode === 'ctf' ? 'ctf' : 'rounds' },
    { kind: 'faccao', key: faction },
    { kind: 'personagem', key: charId || 'aleatorio' },
    { kind: 'arma', key: settings.wpnMode || 'all' },
  ]);
  stopMenuMusic();   // música é só do menu — some (fade) quando a partida começa
  if (game) game.dispose();
  show(null);
  /* TELA CHEIA PEDIDA AQUI, E O LUGAR É O QUE IMPORTA. Ela é pré-requisito da Keyboard
     Lock API, que é a única coisa que impede Ctrl+W de fechar a aba no meio da partida
     (ver `_travaAtalhos` no game.js). `requestFullscreen` exige gesto do usuário, e o
     gesto é o clique que chamou este `startGame` — mas logo abaixo vem `await sfxReady` e
     o `Promise.all` dos GLBs, que levam segundos e queimam a ativação transiente. Pedir
     depois dos awaits falha calado. Aqui em cima o clique ainda vale.
     Falhar é ACEITÁVEL: sem tela cheia não há trava de atalho, e a confirmação de saída
     do `beforeunload` cobre o caso. Por isso nada de await e nada de erro na tela. */
  if (!testMode) {
    try {
      const fs = document.documentElement.requestFullscreen?.();
      // trava de orientação só depois da tela cheia (a API exige fullscreen). Android respeita;
      // WebKit REJEITA a promessa, e sem o catch a rejeição derrubava o launch (#431/#432).
      if (TOUCH && fs?.then) fs.then(() => { try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch {} }).catch(() => {});
      else fs?.catch?.(() => {});
    } catch {}
  }
  loadingStage.hide(); dockLoadingCharacter();
  const _sp = document.getElementById('boot-splash'); if (_sp) _sp.remove();   // fluxo ?auto= pula a splash
  // LOADING REAL da partida: overlay opaco cobre TUDO enquanto os GLBs entram e o mundo
  // é construído — nada de cena parcial/"minecraft" aparecendo aos poucos
  showLoading(frase('carregando', MAPS[currentMap].name.toUpperCase()), 'CARREGANDO MODELOS 3D…', MAPS[currentMap].name.toUpperCase());
  await sfxReady;   // make sure voice/CS samples are registered before round 1 sounds
  // Preload real GLB character models + shared animation clips (bots). Falls back to
  // procedural box meshes for any archetype that isn't modeled yet. Map props (statues)
  // load in parallel and are optional — the map renders fine if they're missing.
  // sorteia os carros da Havan desta partida ANTES do preload (seleção = props do mapa)
  setHavanCarSeed((Math.random() * 1e9) | 0);
  /* SÓ OS PERSONAGENS DA PARTIDA: o roster é sorteado ANTES do preload e só esses GLBs sobem
     (jogador + ~teamSize×2). Filtro vazio = rede de segurança: elenco inteiro. Régua: PL1. */
  /* Tamanho do time é do SERVIDOR, nunca do ajuste local de bots (senão sobram corpos e o
     casamento de ids fica adivinhando). */
  const tamanhoTime = sessao ? sessao.net.meta.teamSize : Math.max(1, Math.min(8, settings.bots || 4));
  /* ELENCO: no multiplayer ele vem PRONTO do servidor (welcome.roster). Sortear o próprio faria
     cada jogador da mesma sala ver bonecos diferentes, e o nome do killfeed não bateria com o
     rosto que apareceu na tela. Fora do multiplayer, sorteio normal. */
  const matchRoster = sessao ? rosterDoServidor(side, charId) : pickMatchRoster(faction, enemyFac, tamanhoTime, charId);
  const _rosterGlb = [charId, ...matchRoster.allyDefs, ...matchRoster.enemyDefs]
    .map((d) => (typeof d === 'string' ? d : d.id))
    .filter((id, i, a) => GLB_CHARS.has(id) && a.indexOf(id) === i);
  const _charsToLoad = _rosterGlb.length ? _rosterGlb : [...GLB_CHARS];
  /* Armas da partida sorteadas aqui pelo mesmo motivo do roster: as 26 custavam 164 MB de VRAM
     e 7,5 MB de download numa partida que usa ~9. O resto chega em ocioso. Régua: ARM1. */
  /* Armas: no multiplayer também são do servidor (ele é dono do estado de arma de cada corpo).
     Pré-carregar as erradas faria a arma certa chegar como caixa procedural no meio do tiroteio. */
  const matchWeapons = sessao
    ? sessao.net.meta.roster.map((r) => r.weapon).filter(Boolean)
    : pickMatchWeapons({ mode: settings.wpnMode || 'all', teamSize: tamanhoTime });
  const _armasDaPartida = [...new Set([charWeapon(charId), ...matchWeapons])].filter(Boolean);
  try {
    if (!navOnly) {
      await Promise.all([
        preloadCharacterAssets(_charsToLoad, { weapons: _armasDaPartida }),
        sfx.preloadWeaponSamples(_armasDaPartida),
        preloadMapProps([...MAP_PROPS, ...((MAPS[currentMap] && MAPS[currentMap].props) || [])]),   // + props do mapa (Havan: carros/estátua)
        /* fauna: sem esta linha o mapa constrói, o `ambience` existe e TODO bicho cai
           no fallback procedural sem textura — verde na régua de registro, feio na tela.
           Foi literalmente o BUG-57. Lista vazia é tratada como "tudo" no ambientlife. */
        preloadAmbientLife((MAPS[currentMap] && MAPS[currentMap].ambience) || []),
        preloadFPArms(),   // braços FP dedicados (falha → fallback procedural, sem bloquear)
      ]);
    }
  } catch (e) { console.error('preload da partida falhou parcialmente', e); }
  if (_lstat.phase) _lstat.phase.set(1);
  game = new Game({
    renderer, textures, sfx,
    settings: sessao ? { ...settings, bots: tamanhoTime } : settings,
    playerCharId: charId, playerTeam: side, playerFaction: faction, enemyFaction: enemyFac, mapId: currentMap,
    nickname: $('nick-input').value, testMode, mobile: TOUCH, matchRoster, matchWeapons,
    ctf: matchMode === 'ctf',   // o modo agora é 100% escolha do jogador (ctfMode só define o PADRÃO ao trocar de mapa)
    /* `mpFactory`+`net` ligam a autoridade do servidor. Espectador roda `dedicated`, senão
       sobrariam nove corpos locais para dez entidades e um jogador ficaria invisível. */
    mpFactory: sessao ? makeNetcode : null,
    net: sessao ? sessao.net : null,
    dedicated: !!(sessao && sessao.net.espectador),
    roundsMax: matchRounds(),
    onMatchEnd: recordMatchStats,
    recordTraining: trainingEnabled(),
    onTrainingFrames: sendTrainingFrames,
  });
  window.__game = game;
  /* Resto das armas em ocioso: o drop do chão e a troca no meio da partida precisam de malha
     real, senão vira caixa procedural. Falha calada — é disponibilidade, não requisito. */
  if (!navOnly && params.get('armaslazy') !== '0') {
    const meuJogo = game;
    let tentativas = 0;
    const espera = setInterval(() => {
      if (window.__game !== meuJogo || ++tentativas > 240) { clearInterval(espera); return; }
      if (meuJogo.state !== 'live') return;
      clearInterval(espera);
      const ocioso = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
      ocioso(async () => {
        try {
          await preloadWeapons();
          if (window.__game === meuJogo) { meuJogo.refreshPickupModels(); meuJogo._applyVmVisibility?.(); }   // + viewmodel da arma na mão, se chegou agora
        } catch { /* disponibilidade: o fallback procedural continua jogável */ }
      });
    }, 250);
  }
  submitted = false;
  telemetrySent = false;   // partida nova = uma linha nova de telemetria
  _matchEventSent = false;   // partida nova = um evento rico novo (feat/telemetria)
  _funnel('match_start');    // funil: começou a jogar (017)
  retryPending();
  armSwitchHook();
  game.onOpenSettings = () => { game.setPaused(true); settingsReturn = 'pause-menu'; show('settings-panel'); };
  // pausa nova = botão destrutivo desarmado (senão um "CLIQUE DE NOVO" velho sobrevive
  // até a pausa seguinte e o primeiro clique já confirmaria)
  game.onPauseChange = () => resetConfirms();
  game.onToggleSpeech = () => {
    settings.speech = !settings.speech;
    sfx.speechEnabled = settings.speech;
    saveSettings();
    $('set-speech').checked = settings.speech;
    return settings.speech;
  };
  game.start();
  // esconde o loading só depois do 1º frame REAL da partida renderizado
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  hideLoading();
  // registra nick no ranking global (silencioso se a API não estiver no ar)
  const nick = $('nick-input').value.trim();
  registeredNick = nick; heartbeatOff = false; rankingBloqueado = '';
  if (nick && !testMode) {
    api('/api/register', {
      nick, token: getToken(),
      uid: getAnonId(),
      socials: socials.filter(s => s.handle),
    }).then((reg) => {
      if (!reg) return;
      if (reg.error) { rankingBloqueado = String(reg.message || reg.error); return; }
      if (typeof reg.nick === 'string' && reg.nick) {
        registeredNick = reg.nick;
        if (nickEl.value.trim() !== reg.nick) {
          nickEl.value = reg.nick;
          localStorage.setItem(NICK_KEY, reg.nick);
          updateAvatarVisibility(); renderPlayerPlate();
        }
      }
    });
  }
  /* `mode` faltava, e sem ele metade da pergunta não tem resposta: dá para saber QUE MAPA
     as pessoas escolhem, não SE escolhem captura ou rodadas. O `match_end` manda os quatro
     com os mesmos nomes — é o que permite comparar quem começa com quem termina. */
  try { window.va?.('event', { name: 'game_start', data: { team, character: charId, map: currentMap, mode: matchMode === 'ctf' ? 'ctf' : 'rounds' } }); } catch {}
  /* UM FUNIL SÓ pra "assumir o input". Isto era um `requestPointerLock` duplicado do que
     o `game._requestLock()` já fazia — e a duplicata é que deixava a trava de atalhos sem
     lugar pra morar no começo da partida (o RETOMAR passava pelo funil, o COMEÇAR não). */
  if (!testMode) game._requestLock();
}
function quitToMenu() {
  // corta a vinheta de round ao sair da partida (pedido do dono): o teto de 25 s do
  // audio.js e o corte no _startRound cobrem a partida em andamento, mas nenhum dos dois
  // roda quando o jogador VAI EMBORA — a vinheta seguia tocando por cima da música do menu
  try { sfx.stopRound(); } catch {}
  /* `match_abandon` — o evento que faltava para o número que mais dói. O painel mostra
     1.1K `game_start` para 215 `match_end`: oito em cada dez partidas não terminam, e
     NENHUM evento dizia por quê nem em qual mapa. Sai daqui (SAIR PRO MENU) com os mesmos
     nomes de propriedade dos outros dois, mais `seconds`, que é o que separa "não gostou
     do mapa" (sai em 20 s) de "não tinha mais tempo" (sai em 6 min).
     ISTO NÃO COBRE FECHAR A ABA: `beforeunload` não garante entrega de evento de
     analytics, e prometer que cobre seria pior que não medir. O que este evento mede é
     saída DELIBERADA pelo menu; a diferença entre ele e o `game_start` continua sendo a
     soma de "fechou a aba" com "travou". */
  try {
    if (game) {
      window.va?.('event', { name: 'match_abandon', data: {
        map: game._mapId, mode: game.ctf ? 'ctf' : 'rounds',
        character: game.playerCharId, seconds: Math.round(game.time || 0),
      } });
      sendMatchEvent('quit');   // evento rico: abandonou pelo menu (feat/telemetria, 016)
      _funnel('quit');           // funil: saiu deliberado (017)
    }
  } catch {}
  switchMode = false;   // never carry an in-match team-switch into the menu
  mpEncerrarSessao();
  clearTelemetryGameContext();
  // dispose protegido: se a limpeza da partida falhar, o menu volta MESMO assim
  // (antes, uma exceção aqui deixava o botão "SAIR PRO MENU" morto e o jogo zumbi)
  try { if (game) game.dispose(); } catch (e) { console.error('dispose falhou ao sair pro menu', e); }
  game = null; window.__game = null;
  if (document.pointerLockElement) document.exitPointerLock();
  // a tela cheia era da PARTIDA (pré-requisito da trava de Ctrl+W); no menu ela não serve
  // pra nada e prender o jogador nela é rude. O `dispose()` acima já soltou os atalhos.
  try { if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {}); } catch {}
  show('main-menu');
}

/* ---------------- heartbeat (presença/mapa) ---------------- */
setInterval(async () => {
  if (!game || !registeredNick || testMode || heartbeatOff) return;
  const res = await api('/api/heartbeat', { uid: getAnonId(), nick: registeredNick, token: getToken() });
  if (res && res.error) heartbeatOff = true;
}, 30_000);

/* ---------------- avatar upload (UID seleciona; token autentica) ---------------- */
function fallbackPlayerAvatar(seed) {
  let h = 2166136261;
  for (const ch of `${getAnonId()}|${seed || ''}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const character = CHARACTERS[h % CHARACTERS.length] || CHARACTERS[0];
  return `/img/chars/avatars/${character.id}.webp?v=${VERSION}`;
}
function applyPlayerAvatar(el, seed) {
  if (!el) return;
  let custom = '';
  try { custom = localStorage.getItem(PLAYER_AVATAR_KEY) || ''; } catch {}
  el.style.backgroundImage = `url("${custom || fallbackPlayerAvatar(seed)}")`;
  el.textContent = '';
}
$('avatar-btn').onclick = () => $('avatar-file').click();
$('avatar-file').onchange = async e => {
  const f = e.target.files[0];
  let nick = registeredNick || (nickEl.value || '').trim();
  if (!f || !nick) return;
  $('avatar-note').textContent = 'enviando…';
  try {
    if (!registeredNick) {
      const reg = await api('/api/register', {
        nick, token: getToken(), uid: getAnonId(), socials: socials.filter(s => s.handle),
      });
      if (!reg || reg.error) throw new Error(reg?.message || reg?.error || 'cadastro indisponível');
      registeredNick = typeof reg.nick === 'string' && reg.nick ? reg.nick : nick;
      nick = registeredNick;
    }
    const bmp = await createImageBitmap(f);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const s = Math.min(bmp.width, bmp.height);
    x.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 128, 128);
    const dataUrl = c.toDataURL('image/png');
    const res = await api('/api/avatar', { uid: getAnonId(), nick, token: getToken(), image: dataUrl });
    if (res && res.ok && res.url) {
      localStorage.setItem(PLAYER_AVATAR_KEY, res.url);
      renderPlayerPlate();
      $('avatar-note').textContent = 'foto atualizada! ✓';
    } else $('avatar-note').textContent = 'falhou: ' + (res?.message || res?.error || 'sem conexão');
  } catch (error) { $('avatar-note').textContent = `falhou: ${error?.message || 'tente outra imagem'}`; }
  e.target.value = '';
};

/* ---------------- menu CS 1.6 (Coro Solto) ---------------- */
/* Som de UI: mover, confirmar e voltar usam contratos distintos do manifest.
   O Sfx preserva synth como fallback quando o laboratorio local nao esta instalado. */
const ui = {
  click() { try { sfx.uiClick(); } catch {} },
  hover() { try { sfx.uiHover(); } catch {} },
  back()  { try { sfx.uiBack(); } catch {} },
};
let matchMode = 'rounds';   // 'rounds' | 'ctf' — lido em startGame (ctf)
/* O JOGADOR JÁ DISSE QUAL MODO QUER? (defeito: "esse mapa está como CAPTURA, mas eu
   selecionei single player — e esse erro se repete em outros mapas")
   O `ctfMode` do mapa é PADRÃO, não ordem. Só que `gotoMap` reescrevia `matchMode` a cada
   troca de mapa, INCONDICIONALMENTE — e o carrossel de mapas fica DEPOIS da escolha do modo
   no fluxo do menu. Quem clicava em SINGLE PLAYER e depois navegava até a Loja H ou o Ferro
   Velho tinha a escolha dele apagada no caminho e caía em CTF; e quem clicava em CAPTURE THE
   FLAG e navegava até os outros três caía em rounds. A invariante MOD1 não pegava isso: ela
   só conferia que `ctfOnly` não existe mais no registro de mapas, que é outra coisa (o mapa
   não FORÇA o modo — quem forçava era o menu).
   Esta bandeira é a diferença entre PADRÃO e ESCOLHA: enquanto ninguém escolheu, o mapa
   manda; depois que alguém escolheu, o mapa não encosta mais. Medida em tools/eval/mode-check.mjs
   (invariante MOD2), que executa o CÓDIGO REAL destas funções nos 10 casos (5 mapas × 2 modos). */
let modoEscolhido = false;
if (MAPS[currentMap].ctfMode) matchMode = 'ctf';   // Loja H / Ferro Velho ABREM em CTF (geometria feita em volta das bandeiras), mas dá pra trocar
const menuSetup = $('menu-setup');
const csItems = [...document.querySelectorAll('.cs-item')];
// Kill-switch de UI: ?ui=legacy volta o scrim do menu e o HUD ao visual da rodada 1
// (vinheta de coluna inteira, HUD sem plaquinha nem scrim de canto). Serve de degradação
// segura se o tratamento novo regredir em algum wallpaper/mapa.
if (params.get('ui') === 'legacy') document.documentElement.dataset.ui = 'legacy';
// aria-current = "o painel aberto veio DAQUI". Antes nenhum item tinha estado de seleção.
function markCurrent(act) {
  for (const it of csItems) {
    const on = !!act && it.dataset.act === act;
    if (on) it.setAttribute('aria-current', 'true'); else it.removeAttribute('aria-current');
  }
}
/* O setup tem DOIS passos no mesmo painel (data-step):
     'match'   = PASSO 1, escolher a partida — o mapa é o protagonista;
     'profile' = passo à parte, o perfil (nick/redes/foto), que o dono pediu pra tirar
                 da primeira tela ("o primeiro menu com o mapa não precisa ter o nick").
   Um container só = a máquina de estados do menu (ESC, clique fora, VOLTAR, o seletor
   :has(.cs-setup.open) do CSS) continua valendo pros dois sem duplicação. */
let setupTitle = 'MATA-MATA';
function setSetupStep(step) {
  menuSetup.dataset.step = step;
  const st = $('setup-step'), tt = $('setup-title');
  if (step === 'profile') {
    if (st) st.textContent = tr('PASSO À PARTE · NOME NA CAMISA');
    if (tt) tt.textContent = tr('SEU PERFIL');
  } else {
    if (st) st.textContent = tr(matchMode === 'ctf' ? 'PASSO 1 · A PARTIDA (CTF)' : 'PASSO 1 · A PARTIDA');
    if (tt) tt.textContent = tr(setupTitle);
  }
}
const openSetup = (mode, title, act) => {
  if (mode) { matchMode = mode; modoEscolhido = true; }   // veio de SINGLE PLAYER/CAPTURE THE FLAG = escolha explícita
  setupTitle = title;
  markCurrent(act);
  menuSetup.classList.add('open');
  setMapMode();
  setSetupStep('match');   // abrir o menu SEMPRE cai no passo da partida, nunca no perfil
  applySetupWall();   // "escolher mapa/config" usa o wallpaper da posição 2 do fluxo
};
function openModeMap(mode, title, act) {
  openSetup(mode, title, act);
  renderMapScreen();
  show('map-screen');
}
/* MULTIPLAYER e SINGLE PLAYER são PRIMEIRA INSTÂNCIA do menu (pedido do dono, 30/08):
   o degrau "JOGAR ▸ submenu" saiu — quem abre o jogo escolhe o modo no primeiro clique.
   `sp` e `ctf` seguem exatamente como estavam; só o caso 'jogar' morreu com o botão. */
csItems.forEach((it) => {
  it.onmouseenter = () => ui.hover();
  it.onclick = () => {
    if (performance.now() - _entradaEm < ENTRADA_MS) return;
    ui.click();
    switch (it.dataset.act) {
      case 'sp':    openModeMap('rounds', 'SINGLE PLAYER', 'sp'); break;
      case 'ctf':   openModeMap('ctf', 'CAPTURE THE FLAG', 'ctf'); break;
      case 'mp':    markCurrent('mp'); abrirMultiplayer(); break;
      /* MAPA saiu (mapa se escolhe no fluxo de partida); FEEDBACK entrou (07/08) */
      case 'feedback': markCurrent('feedback'); show('feedback-panel'); break;
      case 'apoie': markCurrent('apoie'); showSupport(); break;
      case 'config': markCurrent('config'); show('settings-panel'); break;
      case 'ranking': markCurrent('ranking'); showRanking(); break;
      case 'sobre': markCurrent('sobre'); howtoReturn = 'main-menu'; show('howto-panel'); break;
    }
  };
});
/* FEEDBACK saiu da lista principal e virou link de rodapé — o painel e a rota
   (/api/feedback, migration 013) são os mesmos, só o ponto de entrada mudou. */
const mfFeedback = $('mf-feedback');
if (mfFeedback) mfFeedback.onclick = () => { ui.click(); markCurrent('feedback'); show('feedback-panel'); };

// Navegação por teclado no menu (↑↓ / Home / End). Num FPS de PC não navegar no teclado
// é falha de acessibilidade E de sensação — CS2/Valorant fazem tudo sem mouse.
$('cs-menu').addEventListener('keydown', (e) => {
  /* Só os VISÍVEIS entram na roda. Com o submenu de modos recolhido, indexar o
     array estático mandava o foco para um botão dentro de [hidden]: a seta
     "engolia" um passo e o leitor de tela anunciava item que não existe na tela.
     offsetParent é null para qualquer ancestral com display:none/[hidden]. */
  const itens = csItems.filter((b) => b.offsetParent !== null);
  if (!itens.length) return;
  const i = itens.indexOf(document.activeElement);
  let n = -1;
  if (e.key === 'ArrowDown') n = (i < 0 ? 0 : (i + 1) % itens.length);
  else if (e.key === 'ArrowUp') n = (i < 0 ? itens.length - 1 : (i - 1 + itens.length) % itens.length);
  else if (e.key === 'Home') n = 0;
  else if (e.key === 'End') n = itens.length - 1;
  if (n < 0) return;
  e.preventDefault(); itens[n].focus(); ui.hover();
});
// Fechar o setup tinha UMA saída só: o botão VOLTAR. Enquanto ele estava aberto a coluna
// da esquerda ficava inerte (ver style.css, bloco `:has(.cs-setup.open)`), então quem
// clicasse em SINGLE PLAYER ficava preso ali. Agora são três saídas — botão, ESC e clique
// fora — e a nav continua clicável. `back` = tocar o som só quando foi gesto do jogador.
function closeSetup(back) {
  if (!menuSetup.classList.contains('open')) return false;
  if (back) ui.back();
  menuSetup.classList.remove('open');
  markCurrent(null);
  applyHomeWall();
  return true;
}
$('setup-back').onclick = () => { closeSetup(true); };
/* passo do perfil: entra pelo botão PERFIL e volta pro passo da partida (nunca fecha o
   menu inteiro — voltar um passo é voltar UM passo). */
function openProfileStep(focusNick) {
  ui.click();
  setSetupStep('profile');
  if (focusNick) setTimeout(() => nickEl.focus(), 60);
}
$('btn-profile').onclick = () => openProfileStep(true);
$('profile-back').onclick = () => { ui.back(); setSetupStep('match'); };
$('profile-ok').onclick = () => { ui.click(); saveSettings(); setSetupStep('match'); };
// ESC no menu = voltar um passo. Num jogo de PC, ESC é o botão de voltar universal;
// não ter isso no menu é inconsistente com o próprio jogo (ESC pausa a partida).
// no window (não no #main-menu): depois de um clique no wallpaper o foco volta pro <body>
// e um listener preso ao container nunca receberia a tecla.
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // ESC na map screen = o VOLTAR dela (cai de volta no setup, estado intacto)
  if (!$('map-screen').classList.contains('hidden')) { e.preventDefault(); ui.back(); show('main-menu'); return; }
  if ($('main-menu').classList.contains('hidden')) return;
  // ESC no passo do perfil volta pro passo da partida — só o segundo ESC fecha o painel.
  if (menuSetup.classList.contains('open') && menuSetup.dataset.step === 'profile') {
    e.preventDefault(); ui.back(); setSetupStep('match'); return;
  }
  if (closeSetup(true)) { e.preventDefault(); csItems[0]?.focus(); }
});
// Clique no wallpaper (fora do painel e fora da nav) também fecha — comportamento de
// qualquer painel docado; sem isso o jogador tenta e não acontece nada.
$('main-menu').addEventListener('pointerdown', (e) => {
  if (e.target.closest('.cs-setup') || e.target.closest('.cs-left')) return;
  closeSetup(true);
});

/* ---------------- menu wiring ---------------- */
// JOGAR sem nick era um SHAKE depois do clique; agora é ESTADO (aria-disabled), atualizado
// a cada tecla — o jogador vê que falta algo ANTES de tentar.
function syncPlayState() {
  const nick = (nickEl.value || '').trim();
  const b = $('btn-jogar'); if (b) b.setAttribute('aria-disabled', nick ? 'false' : 'true');
  // o botão do passo de perfil mostra o nick de verdade: o jogador sabe com que nome
  // vai entrar sem ter que abrir o passo pra conferir
  const p = $('btn-profile');
  if (p) {
    p.dataset.empty = nick ? '0' : '1';
    const s = $('profile-name');
    if (s) s.textContent = nick || 'PÔR O NOME NA CAMISA';
  }
  renderPlayerPlate();   // nick do card do menu acompanha a digitação
}
$('btn-jogar').onclick = async () => {
  if (!(nickEl.value || '').trim()) {
    // sem nick o JOGAR não morre: ele LEVA pro passo que falta (o nick não está mais
    // nesta tela, então um shake num campo invisível não diria nada a ninguém)
    nickEl.placeholder = 'SEM NOME NÃO TEM CORO!';
    openProfileStep(true);
    window.__gameLaunch?.ready('menu');
    nickEl.classList.add('invalid');
    setTimeout(() => nickEl.classList.remove('invalid'), 1500);
    return;   // sem nick, sem treta
  }
  sfx.uiClick();
  await factionArtReady;
  setTeamStep('side');
  show('team-select');
  window.__gameLaunch?.ready('menu');
  ensureTeamPreviews();   // thumbnails 3D dos times (async, cacheia no card)
};
$('btn-ranking').onclick = () => { sfx.uiClick(); showRanking(); };
$('ranking-back').onclick = () => { ui.back(); markCurrent(null); show('main-menu'); };
/* FEEDBACK: email + consentimento obrigatórios ANTES de enviar — a tabela é a
   semente da newsletter (migration 013), então não entra linha sem os dois. */
$('fb-back').onclick = () => { ui.back(); markCurrent(null); show('main-menu'); };
$('support-back').onclick = () => { ui.back(); markCurrent(null); show('main-menu'); };
const supportLink = $('support-link');
const supportNote = $('support-region-note');
/* URLs vêm RESOLVIDAS do servidor (index.astro injeta window.__SUPPORT a partir do
   mesmo site.ts do /apoie) — o jogo é zero-build e não lê import.meta.env. O literal
   aqui é só fallback para arquivo aberto direto do disco. */
const SUPPORT_URL_BR = window.__SUPPORT?.br || 'https://meapoia.com/vaquinhas/ajude-a-manter-o-coro-solto-online';
const SUPPORT_URL_INTL = window.__SUPPORT?.intl || 'https://ko-fi.com/corosolto';
function showSupport(region) {
  const browserLocale = String(navigator.language || '').toLowerCase();
  const timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  const br = region ? region === 'br' : browserLocale === 'pt-br' || timezone === 'America/Sao_Paulo';
  supportLink.href = br ? SUPPORT_URL_BR : SUPPORT_URL_INTL;
  supportLink.textContent = br ? 'ABRIR ME APOIA' : 'OPEN INTERNATIONAL SUPPORT';
  supportNote.textContent = br
    ? 'Você será levado ao MeApoia. O Pix da campanha fica na página de apoio.'
    : 'You will be taken to the international support page. Choose the option that works in your country.';
  const botaoBr = $('support-br'), botaoIntl = $('support-intl');
  botaoBr.setAttribute('aria-pressed', String(br));
  botaoIntl.setAttribute('aria-pressed', String(!br));
  botaoBr.classList.toggle('active', br);
  botaoIntl.classList.toggle('active', !br);
  show('support-panel');
}
$('support-br').onclick = () => showSupport('br');
$('support-intl').onclick = () => showSupport('intl');
$('fb-send').onclick = async () => {
  ui.click();
  const msg = $('fb-msg').value.trim(), email = $('fb-email').value.trim();
  const news = $('fb-news').checked, st = $('fb-status');
  const falha = (t, campo) => { st.textContent = t; st.classList.add('erro'); campo?.classList.add('invalid');
    setTimeout(() => campo?.classList.remove('invalid'), 600); };
  st.classList.remove('erro');
  if (msg.length < 3) return falha(tr('escreve o feedback primeiro'), $('fb-msg'));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return falha(tr('preenche um email válido'), $('fb-email'));
  if (!news) return falha(tr('marca o aceite da newsletter pra enviar'), null);
  $('fb-send').disabled = true; st.textContent = tr('enviando…');
  const res = await api('/api/feedback', { email, newsletter: news, message: msg, map: currentMap, version: VERSION });
  $('fb-send').disabled = false;
  if (res && res.ok) { st.textContent = tr('valeu! feedback enviado.'); $('fb-msg').value = ''; }
  else falha(res?.error === 'rate_limited' ? tr('calma — muitos envios, tenta daqui a pouco') : tr('não deu pra enviar agora, tenta de novo mais tarde'), null);
};
// carrossel de mapas: setas ‹ › trocam o mapa E o fundo 3D do menu + thumbnail real do mapa
const mapNameEl = $('map-name');
const mapThumb = $('map-thumb');
if (mapThumb) {
  mapThumb.decoding = 'async';   // decode fora da thread principal
  mapThumb.onload = () => { mapThumb.style.opacity = '1'; };
  mapThumb.onerror = () => { mapThumb.style.opacity = '0'; };   // sem captura ainda → some limpo
}
function setMapThumb() {
  if (!mapThumb) return;
  mapThumb.style.opacity = '0';
  mapThumb.src = `/img/map-previews/${currentMap}.jpg?v=${VERSION}`;
}
// Badge de modo + pontinhos de posição: o carrossel não dizia onde o jogador estava
// (quantos mapas existem, qual é este) nem que Havan/Ferro Velho SÃO CTF por natureza.
// Rótulos dos modos de arma em UM lugar (WPN_MODES lá embaixo é derivado daqui): a
// ficha do cartaz e o dropdown têm que dizer a mesma coisa com as mesmas palavras.
const WPN_MODE_LABEL = { all: 'TODAS', pistols: 'SÓ PISTOLAS', knife: 'SÓ FACA', awp: 'SÓ AWP' };
function matchRounds() {
  const fallback = matchMode === 'ctf' ? 3 : 5;
  const requested = +(matchMode === 'ctf' ? settings.ctfRounds : settings.rounds);
  return [1, 3, 5, 7].includes(requested) ? requested : fallback;
}
// Ficha da partida IMPRESSA NO CARTAZ (modo · bots · armas). O dono pediu "maior dimensão
// pro mapa" com "nome, modo, bots" — então o resumo mora sobre a arte, e não numa coluna
// de formulário ao lado dela.
function setMapMeta() {
  const el = $('map-meta'); if (!el) return;
  const n = settings.bots || 4;
  const modo = frase(matchMode === 'ctf' ? 'ctfMelhorDeN' : 'melhorDeN', matchRounds());
  el.textContent = frase('resumoPartida', modo, n, tr(WPN_MODE_LABEL[settings.wpnMode || 'all'] || 'TODAS'));
}
function setMapMode() {
  const m = $('map-mode');
  if (m) {
    m.textContent = matchMode === 'ctf' ? tr('CAPTURE THE FLAG') : tr('MATA-MATA');
    m.dataset.mode = matchMode;
  }
  const d = $('map-dots');
  if (d) d.innerHTML = MAP_IDS.map((_, i) => `<i class="${i === mapIdx ? 'on' : ''}"></i>`).join('');
  setMapMeta();
}
// O badge de modo virou BOTÃO: pedido do dono ("os mapas todos podem ser rounds ou CTF,
// mas tem uns que forçam ser CTF"). Antes ele era um <span> informativo e Loja H/Ferro Velho
// eram prisão de CTF. Agora o mapa só define o PADRÃO e o jogador alterna aqui.
{
  const mm = $('map-mode');
  if (mm) mm.addEventListener('click', () => {
    matchMode = matchMode === 'ctf' ? 'rounds' : 'ctf';
    modoEscolhido = true;   // alternar no badge também é escolha do jogador
    ui.click();
    setMapMode();
    setSetupStep('match');   // o eyebrow do passo carrega o modo (PARTIDA / PARTIDA (CTF))
  });
}
let mapIdx = Math.max(0, MAP_IDS.indexOf(currentMap));
function gotoMap(i) {
  mapIdx = (i + MAP_IDS.length) % MAP_IDS.length;
  currentMap = resolveMapId(MAP_IDS[mapIdx]);
  settings.map = currentMap; settings.mapPinned = true; saveSettings();   // escolha explícita sai da rotação
  mapNameEl.textContent = MAPS[currentMap].name;
  setMapThumb();
  // troca de mapa aplica o PADRÃO do mapa (Loja H/Ferro Velho abrem em CTF, o resto em rounds)
  // — mas SÓ enquanto o jogador não tiver escolhido. Ver `modoEscolhido` lá em cima: era
  // aqui que a escolha dele morria (main.js:692 na versão anterior).
  if (!modoEscolhido) matchMode = MAPS[currentMap].ctfMode ? 'ctf' : 'rounds';
  setMapMode();
  rebuildMenuBackdrop();
  renderMapScreen();   // se a tela cheia estiver aberta, ela acompanha o carrossel
}
function stepMap(dir, ids = MAP_IDS) {
  const pool = ids.length ? ids : MAP_IDS;
  const nextId = pool[(Math.max(0, pool.indexOf(currentMap)) + dir + pool.length) % pool.length];
  ui.click(); gotoMap(MAP_IDS.indexOf(nextId));
}
mapNameEl.textContent = MAPS[currentMap].name;
setMapThumb();
setMapMode();
$('map-prev').onclick = () => stepMap(-1);
$('map-next').onclick = () => stepMap(1);
[$('map-prev'), $('map-next')].forEach(b => b && (b.onmouseenter = () => ui.hover()));

/* ---------------- map screen (escolha de mapa em tela cheia) ----------------
   Abre pelo cartaz do mapa no setup. Lê o MESMO estado do carrossel (currentMap/mapIdx) —
   trocar aqui troca lá, e vice-versa. CONTINUAR segue o fluxo normal (nick → facção). */
const MAP_DESC = {
  praca_poderes: 'O coração do poder vira arena: rampas do Planalto, espelho d\'água e linhas de tiro longas entre os ministérios.',
  piscina_treta: 'Salão fechado, eco de tiro e briga de faca no raso. Quem controla a borda controla o round.',
  loja_h: 'Estacionamento de megastore: corredores de vaga, mezanino de sniper e a estátua te olhando atirar.',
  ferro_velho: 'Um ferro velho gigantesco onde tudo pode ser arma e toda sombra pode esconder um traira.',
  quebrada: 'Rua de baile: muros baixos, beco cego e o paredão marcando o compasso do round.',
  posto_treta: 'Posto de combustível na beira da BR: loja de conveniência, bombas de cobertura e treta no fluorescente.',
  atacadao_treta: 'Galpão de atacado em guerra: gôndolas apertadas, caixas de cobertura e o estacionamento disputado carrinho por carrinho.',
  parque_treta: 'Um parque de diversões em guerra de confete: carrossel no centro, roda-gigante, castelo colorido e três rotas de ataque.',
  velho_oeste: 'Duelo na cidade empoeirada: saloon, banco, carroças e tumbleweeds cruzando três rotas entre casas de madeira.',
  penitenciaria: 'Rebelião no pátio: celas abertas, concreto gasto, guaritas e barricadas policiais entre três rotas de confronto.',
  upa_24h: 'Pronto-socorro lotado: salas de verdade, corredor em cruz e treta no fluorescente — 100% interno.',
  obras_prefeitura: 'Canteiro de obra eterna: terreno ondulado, buracos de escavação, tapumes e a treta do desvio de verba.',
};
/* Catálogo de mapas (categoria/autoria/data): fonte única em mapcat.js — o servidor do
   multiplayer importa a MESMA tabela para as rotações das salas oficiais. */
import { MAP_CATS, MAP_AUTOR, MAP_DATA, CAT_DESC, AUTOR_CASA, catsDe, autorDe, oficialDe } from './mapcat.js';
let mapCategory = 'TODOS';
let mapAutorFiltro = 'TODOS';
function autoresDeComunidade() {
  return [...new Set(MAP_IDS.filter((id) => catsDe(id).includes('COMUNIDADE')).map(autorDe))].sort();
}
/* Quantas vezes cada mapa foi escolhido, do contador que o /api/pick alimenta desde
   06/08 (picks_daily). Chega TARDE, por rede, e pode nunca chegar: a tela abre sem ele,
   e quando chega redesenha. Nada aqui pode depender do número existir. */
let mapPlays = {};
const playsDe = (id) => mapPlays[id] || 0;
fetchComRetry(apiUrl('/api/map-plays'))
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (!j || !j.plays || typeof j.plays !== 'object') return;
    mapPlays = j.plays;
    if (!$('map-screen')?.classList.contains('hidden')) renderMapScreen();
  })
  .catch(() => { /* sem banco/rede: a tela fica sem a estatística, e é só isso */ });
function visibleMapIds() {
  /* TODOS = o acervo inteiro, ordenado do mais jogado pro menos (empate: ordem do catálogo,
     que é estável — `sort` sem desempate deixava a lista dançar entre renders).
     OFICIAIS e COMUNIDADE são recortes por categoria e mantêm a ordem do catálogo. */
  if (mapCategory === 'TODOS') {
    return MAP_IDS.slice().sort((a, b) => playsDe(b) - playsDe(a) || MAP_IDS.indexOf(a) - MAP_IDS.indexOf(b));
  }
  if (mapCategory === 'OFICIAIS') return MAP_IDS.filter((id) => !catsDe(id).includes('COMUNIDADE'));
  return MAP_IDS.filter((id) => catsDe(id).includes(mapCategory));
}
function renderMapScreen() {
  const img = $('ms-bg-img'); if (!img) return;
  /* O mapa em foco manda na aba: se não pertence à aba atual, troca pra aba que o contém.
     Trocas manuais de aba já re-ancoram o mapa antes, então isto não briga com elas. */
  if (!visibleMapIds().includes(currentMap)) {
    mapCategory = catsDe(currentMap).includes('COMUNIDADE') ? 'COMUNIDADE' : 'OFICIAIS';
  }
  const continuar = $('ms-continue')?.querySelector('span');
  if (continuar) continuar.textContent = frase('continuarSetup');
  img.decoding = 'async';   // decode fora da thread principal — não trava a UI da tela de mapas
  img.src = `/img/map-previews/${currentMap}.jpg?v=${VERSION}`;
  /* O palco é o MESMO wallpaper do menu principal, não esta preview: a foto do mapa em
     foco já está no card selecionado, e em tela cheia ela brigava com a grade. O `src`
     acima continua sendo escrito porque é dele que a sonda de tela lê o mapa em foco. */
  const palco = document.querySelector('#map-screen .ms-bg');
  if (palco) { palco.style.setProperty('--wall', HOME_WALL); palco.style.setProperty('--wall-3x2', HOME_WALL_3X2); }
  $('ms-name').textContent = MAPS[currentMap].name;
  // separadores da ficha em verde (referência 04): texto continua o mesmo do cartaz
  $('ms-meta').innerHTML = ($('map-meta').textContent || '').split('·').join('<span class="ms-sep">·</span>');
  $('ms-desc').textContent = tr(MAP_DESC[currentMap] || '');
  syncMapOptions();
  const cats = catsDe(currentMap);
  const catEl = $('ms-cat');
  catEl.innerHTML = cats.map((c) => `<span data-cat="${c}">${tr(c)}</span>`).join('<span class="ms-sep">·</span>');
  const byline = $('ms-byline');
  if (byline) byline.innerHTML = `${tr('por')} <strong>${autorDe(currentMap)}</strong> · ${MAP_DATA[currentMap] || ''}` +
    (oficialDe(currentMap) ? ` <span class="ms-badge-oficial">${tr('OFICIAL')}</span>` : ` <span class="ms-badge-comunidade">${tr('COMUNIDADE')}</span>`);
  const desc = $('ms-cat-desc');
  if (desc) desc.textContent = CAT_DESC[mapCategory] ? tr(CAT_DESC[mapCategory]) : '';
  $('ms-count').textContent = `${tr('MAPA')} ${MAP_IDS.indexOf(currentMap) + 1} ${tr('DE')} ${MAP_IDS.length}`;
  /* Estatística de partidas: só aparece quando o número EXISTE. Escrever "0 PARTIDAS"
     num mapa que ninguém mediu é afirmar o que não se sabe — sem o contador, o crachá some. */
  const plays = $('ms-plays');
  if (plays) {
    const n = playsDe(currentMap);
    plays.hidden = !n;
    plays.textContent = n ? `${n.toLocaleString('pt-BR')} ${tr(n === 1 ? 'PARTIDA' : 'PARTIDAS')}` : '';
  }
  const shown = visibleMapIds();
  $('ms-strip').style.setProperty('--map-count', shown.length);
  $('ms-strip').innerHTML = shown.map((id) =>
      `<button class="ms-thumb${id === currentMap ? ' on' : ''}" data-id="${id}" aria-pressed="${id === currentMap}" type="button">` +
      `<img class="ms-thumb-img" loading="lazy" decoding="async" src="/img/map-previews/${id}.jpg?v=${VERSION}" alt="">` +
      `<span class="ms-thumb-copy"><span class="ms-thumb-name">${MAPS[id].name}</span>` +
      `<span class="ms-thumb-sub"><span class="ms-thumb-cat" data-cat="${catsDe(id)[0]}">${catsDe(id).map((c) => tr(c)).join('·')}</span>` +
      (playsDe(id) ? `<span class="ms-thumb-plays">${playsDe(id).toLocaleString('pt-BR')}</span>` : '') +
      `</span></span>` +
      `${id === currentMap ? '<i class="ms-diamond" aria-hidden="true"></i>' : ''}</button>`).join('');
  document.querySelectorAll('.ms-tab').forEach((tab) => {
    const on = tab.dataset.cat === mapCategory;
    tab.classList.toggle('on', on);
    tab.setAttribute('aria-selected', on);
  });
  // A tira é uma grid que mostra TODOS os mapas de uma vez (sem scroll nem página). Os "dots"
  // de paginação eram falsos — marcavam páginas que não existem. Removidos.
  $('ms-dashes').innerHTML = '';
  $('ms-strip').querySelectorAll('.ms-thumb').forEach(b => {
    b.onclick = () => { ui.click(); gotoMap(MAP_IDS.indexOf(b.dataset.id)); };
    b.onmouseenter = () => ui.hover();
  });
  requestAnimationFrame(() => $('ms-strip').querySelector('.ms-thumb.on')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
}
mapThumb.title = tr('Ver mapa em tela cheia');
mapThumb.style.cursor = 'pointer';
mapThumb.onclick = () => { ui.click(); renderMapScreen(); show('map-screen'); };
$('ms-back').onclick = () => { ui.back(); show('main-menu'); };
$('ms-prev').onclick = () => stepMap(-1, visibleMapIds());
$('ms-next').onclick = () => stepMap(1, visibleMapIds());
document.querySelectorAll('.ms-tab').forEach((tab) => {
  tab.onclick = () => {
    ui.click(); mapCategory = tab.dataset.cat || 'TODOS';
    const first = visibleMapIds()[0];
    if (first && !visibleMapIds().includes(currentMap)) gotoMap(MAP_IDS.indexOf(first));
    else renderMapScreen();
  };
});
// CONTINUAR = o JOGAR de sempre: ele decide o próximo passo (perfil se falta nick, facção se não)
$('ms-continue').onclick = () => { show('main-menu'); $('btn-jogar').click(); };
// ← → trocam de mapa com a tela cheia aberta (ESC fecha — ver o handler de ESC do menu)
addEventListener('keydown', (e) => {
  if ($('map-screen').classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); stepMap(-1, visibleMapIds()); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); stepMap(1, visibleMapIds()); }
});
const wpnSel = { value: settings.wpnMode || 'all' };
// dropdown de modo de armas: renders REAIS de /img/weapons (o dono reprovou os glifos)
const _wpnImg = (id) => `<img class="dd-ico" src="/img/weapons/${id}.webp" alt="" width="44" height="17" loading="lazy">`;
const WPN_ICONS = {
  all: `<span class="dd-ico-all">${_wpnImg('ak')}${_wpnImg('pistol')}</span>`,
  pistols: _wpnImg('pistol'),
  knife: _wpnImg('knife'),
  awp: _wpnImg('awp'),
};
const WPN_MODES = Object.entries(WPN_MODE_LABEL).map(([id, label]) => ({ id, label }));
const wpnDdBtn = $('wpn-dd-btn'), wpnDdList = $('wpn-dd-list'), wpnDdLabel = $('wpn-dd-label');
function wpnLabel(id) {
  const m = WPN_MODES.find(m => m.id === id);
  wpnDdLabel.innerHTML = `<span class="dd-cur">${WPN_ICONS[id]}<span>${tr(m ? m.label : id)}</span></span>`;
}
wpnDdList.innerHTML = WPN_MODES.map(m =>
  `<button class="dd-item" data-id="${m.id}" type="button">${WPN_ICONS[m.id]}<span>${tr(m.label)}</span></button>`).join('');
wpnLabel(wpnSel.value);
wpnDdBtn.onclick = e => { e.stopPropagation(); botsDdList?.classList.add('hidden'); botsDdBtn?.classList.remove('open'); wpnDdList.classList.toggle('hidden'); wpnDdBtn.classList.toggle('open'); };
document.addEventListener('click', () => { wpnDdList.classList.add('hidden'); wpnDdBtn.classList.remove('open'); });
wpnDdList.querySelectorAll('.dd-item').forEach(b => b.onclick = () => {
  settings.wpnMode = b.dataset.id; saveSettings();
  wpnLabel(settings.wpnMode); setMapMeta(); sfx.uiClick();
});
// bots-per-side: dropdown custom (mesma cara do de armas — o <select> nativo abria o
// menu default do navegador, fora do estilo do resto do setup)
const botsDdBtn = $('bots-dd-btn'), botsDdList = $('bots-dd-list'), botsDdLabel = $('bots-dd-label');
const botsLabel = n => { if (botsDdLabel) botsDdLabel.innerHTML = `<span class="dd-cur"><span>${n} vs ${n}</span></span>`; };
if (botsDdBtn && botsDdList && botsDdLabel) {
  botsDdList.innerHTML = [2, 3, 4, 5, 6, 7, 8].map(n =>
    `<button class="dd-item" data-n="${n}" type="button"><span>${n} vs ${n}</span></button>`).join('');
  botsLabel(settings.bots || 4);
  botsDdBtn.onclick = e => { e.stopPropagation(); wpnDdList.classList.add('hidden'); wpnDdBtn.classList.remove('open'); botsDdList.classList.toggle('hidden'); botsDdBtn.classList.toggle('open'); };
  document.addEventListener('click', () => { botsDdList.classList.add('hidden'); botsDdBtn.classList.remove('open'); });
  botsDdList.querySelectorAll('.dd-item').forEach(b => b.onclick = () => {
    settings.bots = +b.dataset.n; saveSettings();
    botsLabel(settings.bots); setMapMeta(); sfx.uiClick();
  });
}
const msWpnMode = $('ms-wpn-mode'), msPlayers = $('ms-players'), msRounds = $('ms-rounds');
function syncMapOptions() {
  if (msWpnMode) msWpnMode.value = settings.wpnMode || 'all';
  if (msPlayers) msPlayers.value = String(settings.bots || 4);
  if (msRounds) msRounds.value = String(matchRounds());
}
if (msWpnMode) msWpnMode.onchange = () => {
  settings.wpnMode = msWpnMode.value; saveSettings(); wpnLabel(settings.wpnMode); setMapMeta(); renderMapScreen(); sfx.uiClick();
};
if (msPlayers) msPlayers.onchange = () => {
  settings.bots = +msPlayers.value; saveSettings(); botsLabel(settings.bots); setMapMeta(); renderMapScreen(); sfx.uiClick();
};
if (msRounds) msRounds.onchange = () => {
  settings[matchMode === 'ctf' ? 'ctfRounds' : 'rounds'] = +msRounds.value;
  saveSettings(); setMapMeta(); renderMapScreen(); sfx.uiClick();
};
const diffSel = $('diff-select');
if (diffSel) {
  [['easy', 'FÁCIL'], ['normal', 'NORMAL'], ['hard', 'DIFÍCIL'], ['insane', 'INSANO']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; diffSel.appendChild(o); });
  diffSel.value = settings.difficulty || 'normal';
  diffSel.onchange = () => { settings.difficulty = diffSel.value; saveSettings(); sfx.uiClick(); };
}
$('btn-howto').onclick = () => { sfx.uiClick(); howtoReturn = 'main-menu'; show('howto-panel'); };
$('howto-back').onclick = () => { ui.back(); markCurrent(null); const r = howtoReturn; howtoReturn = 'main-menu'; show(r); };
$('btn-settings').onclick = () => { sfx.uiClick(); settingsReturn = 'main-menu'; show('settings-panel'); };
const closeSettings = () => {
  ui.back(); saveSettings();
  if (game) game.applySettings();
  if (settingsReturn === 'main-menu') markCurrent(null);
  show(settingsReturn);
};
$('settings-back').onclick = closeSettings;
$('settings-close').onclick = closeSettings;
$('settings-apply').onclick = () => { ui.click(); saveSettings(); if (game) game.applySettings(); };
$('settings-restore').onclick = () => {
  ui.click();
  settings.quality = 'med'; settings.sens = 1; settings.invertY = false; settings.vol = 0.7; settings.speech = true; settings.xhair = '#4fe8e0';
  $('set-quality').value = settings.quality; $('set-sens').value = settings.sens; $('set-vol').value = settings.vol;
  $('set-speech').checked = true; $('set-invert-y').checked = false; $('set-xhair').value = settings.xhair;
  sfx.speechEnabled = true; sfx.setVolume(settings.vol); applyXhair(); updLabels(); saveSettings();
  if (game) game.applySettings();
};
// Abas das configurações: troca o pane visível; os inputs nunca são re-criados,
// então o wiring de persistência abaixo vale pra todos os panes.
document.querySelectorAll('.set-tab').forEach(tab => {
  tab.onclick = () => {
    sfx.uiClick();
    $('settings-panel').dataset.activeTab = tab.dataset.tab;
    document.querySelectorAll('.set-tab').forEach(t => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
    });
  };
});
$('mobile-ok').onclick = () => { sfx.uiClick(); show('main-menu'); };
$('team-back').onclick = () => { ui.back(); pickingEnemy = false; setEnemyPickMode(false); setTeamStep('side'); show('main-menu'); };
$('char-back').onclick = () => {
  ui.back();
  if (switchMode && game) {
    switchMode = false;
    currentTeam = game.playerTeam; currentFaction = game.playerFaction;
    currentEnemyFaction = game.enemyFaction; currentChar = game.playerCharId;
    show(null); game.resume(); return;
  }
  show('team-select');
};
// Setas do filmstrip: movem a SELEÇÃO (não só o scroll) e garantem a linha visível.
const stripStep = (dir) => {
  const rows = [...document.querySelectorAll('.char-row')];
  if (!rows.length) return;
  const i = Math.max(0, rows.findIndex(r => r.classList.contains('sel')));
  const next = rows[(i + dir + rows.length) % rows.length];
  next.click();
  next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};
$('strip-up').onclick = () => { ui.click(); stripStep(-1); };
$('strip-down').onclick = () => { ui.click(); stripStep(1); };
// Contador de elenco nos cards de facção ("8 PERSONAGENS" — referência telas/02)
for (const f of ['e', 'b', 'u', 'c', 'f']) {
  const n = CHARACTERS.filter(c => c.team === f.toUpperCase()).length;
  const card = $('btn-team-' + f);
  if (!card) continue;
  const chip = document.createElement('span');
  chip.className = 'team-count';
  chip.textContent = `${n} ${tr('PERSONAGENS')}`;
  card.appendChild(chip);
}
$('btn-team-e').onclick = () => { sfx.uiClick(); pickTeam('E'); };
$('btn-team-b').onclick = () => { sfx.uiClick(); pickTeam('B'); };
$('btn-team-u') && ($('btn-team-u').onclick = () => { sfx.uiClick(); pickTeam('U'); });
$('btn-team-c') && ($('btn-team-c').onclick = () => { sfx.uiClick(); pickTeam('C'); });
$('btn-team-f') && ($('btn-team-f').onclick = () => { sfx.uiClick(); pickTeam('F'); });
$('btn-resume').onclick = () => { sfx.uiClick(); game?.resume(); };
$('btn-pause-settings').onclick = () => { sfx.uiClick(); settingsReturn = 'pause-menu'; show('settings-panel'); };
$('btn-pause-controls').onclick = () => { sfx.uiClick(); howtoReturn = 'pause-menu'; show('howto-panel'); };
/* ---- AÇÕES QUE DESTROEM A PARTIDA EM ANDAMENTO: DOIS TOQUES ----------------
   "pela quinta vez o jogo reiniciou sozinho, eu estava no meio de uma partida e ele foi
   pro menu principal sozinho" (dono, 04/08).

   Não havia caminho automático: `quitToMenu()` só é chamado por estes dois `onclick`.
   O clique era REAL — o menu de pausa cai debaixo da MIRA quando o pointer lock some
   sozinho (alt-tab, ESC, notificação), e o tiro que já estava saindo apertava o botão.
   Medido com o pause aberto em 1536×1024: centro da tela = CONFIGURAÇÕES,
   centro+100 px = REINICIAR PARTIDA, centro+150 px = SAIR PRO MENU — a coluna inteira
   fica na linha de tiro. Ver PAUSE_ARM_MS em game.js e tools/eval/pause-check.mjs.

   A janela de guarda do game.js resolve o tiro em voo; esta trava resolve o resto:
   NENHUM clique único tira o jogador da partida. A REGRA do segundo toque
   (`confirmGate`) mora no game.js e é medida em node — ver a cláusula PAUSA6 de
   tools/eval/pause-check.mjs, que nasceu de uma rajada de 8 cliques a 60 ms que
   atravessou a primeira versão desta trava e saiu pro menu. */
const confirmables = [];
function needsConfirm(btn, run) {
  const label = btn.textContent;
  let armedAt = 0, t = null;
  // o aviso é INLINE de propósito: style.css é território de outra frente nesta rodada, e
  // um estado que só existe como classe sem regra seria um botão que muda de texto e não
  // avisa NADA — o jogador tem que ver que o próximo clique é o que vale
  const reset = () => {
    if (t) clearTimeout(t); t = null; armedAt = 0;
    btn.textContent = label; btn.classList.remove('confirming');
    btn.style.color = ''; btn.style.borderColor = '';
  };
  confirmables.push(reset);
  btn.onclick = () => {
    const now = performance.now();
    const acao = confirmGate(now, armedAt);
    if (acao === 'confirma') { reset(); run(); return; }
    if (acao === 'arma') sfx.uiClick();
    armedAt = now;   // 'rearma' (rajada) cai aqui também: o relógio volta ao zero
    btn.textContent = 'CLIQUE DE NOVO PRA CONFIRMAR';
    btn.classList.add('confirming');
    btn.style.color = 'var(--am, #ffc93f)'; btn.style.borderColor = 'var(--am, #ffc93f)';
    if (t) clearTimeout(t);
    t = setTimeout(reset, CONFIRM_MAX_MS);
  };
}
const resetConfirms = () => { for (const r of confirmables) r(); };
// Mesma chamada da REVANCHE do match-end: recomeça a partida com time/personagem/adversário atuais.
needsConfirm($('btn-restart'), () => startGame(currentTeam, currentChar, undefined, !!mpSessao));
needsConfirm($('btn-quit'), () => {
  sendTelemetry();   // fora do `if (pl)`: partialPayload() devolve null sem nick, telemetria não depende disso
  const pl = partialPayload();
  if (pl) { submitted = true; submitGlobal(pl); }
  quitToMenu();
});
$('btn-again').onclick = () => { sfx.uiClick(); startGame(currentTeam, currentChar, undefined, !!mpSessao); };
$('btn-menu').onclick = () => { sfx.uiClick(); quitToMenu(); };
// M in-game: escolhe o personagem do novo time antes de trocar
let switchMode = false;
function armSwitchHook() {
  game.onRequestSwitch = () => {
    game.setPaused(true);
    switchMode = true;
    pickTeam(game.enemyFaction);
  };
}
$('char-confirm').onclick = () => {
  sfx.uiClick();
  if (!selChar) return;
  // Only take the in-match "switch team" path when there's a live game to switch;
  // a stale switchMode flag (e.g. backed out of M) must NOT hit game._switchTeam on a
  // disposed game — that used to throw and leave the next match unable to load.
  if (switchMode && game) {
    switchMode = false;
    currentChar = selChar.id;
    show(null);
    try {
      game._switchTeam(selChar.id);
      currentTeam = game.playerTeam; currentFaction = game.playerFaction;
      currentEnemyFaction = game.enemyFaction; currentChar = game.playerCharId;
    } catch (e) { console.error('switch team failed', e); }
    game.resume();   // unpause + re-request pointer lock (fixes "M opens but game won't resume")
  } else {
    switchMode = false;
    // 2º passo: escolher o ADVERSÁRIO (reusa o team-select com título trocado).
    // O card da SUA facção é escondido — adversário só entre os outros 2 (sem mirror).
    currentChar = selChar.id;
    pickingEnemy = true;
    setEnemyPickMode(true, currentFaction);
    setTeamStep('enemy', currentFaction);
    show('team-select');
    ensureTeamPreviews();   // no-op se já rodou (previews ficam cacheados nos cards)
  }
};

// Esconde/mostra o card da sua facção na tela de adversário (btn-team-e/b/u).
function setEnemyPickMode(on, myFaction) {
  for (const f of ['e', 'b', 'u', 'c', 'f']) {
    const b = $('btn-team-' + f);
    if (b) b.classList.toggle('hidden', !!(on && f.toUpperCase() === myFaction));
  }
}
/* A MESMA tela serve dois passos e precisa DIZER qual é. Antes o único sinal era o
   título trocado por querySelector em 4 lugares diferentes do arquivo — e o 2º passo
   ficava com cara de formulário ("escolha o adversário" e três caixas iguais).
   Agora o passo é um estado (data-step) que a tela inteira lê: eyebrow, título, dica
   e o texto da barra de ação de cada placa (ver .team-cta no style.css). */
const FACTION_NAME = { E: 'TIME E', B: 'TIME B', U: 'TRIBOS URBANAS', C: 'PALHAÇOS', F: 'FUNKEIROS' };
function setTeamStep(step, myFaction) {
  const ts = $('team-select'); if (ts) ts.dataset.step = step;
  const st = $('team-step'), tt = $('team-title'), hint = $('team-hint');
  if (step === 'enemy') {
    if (st) st.textContent = tr('PASSO 4 · O ADVERSÁRIO');
    if (tt) tt.textContent = tr('QUEM VAI LEVAR O CORO?');
    if (hint) hint.textContent = frase('escolhaAdversario', tr(FACTION_NAME[myFaction] || 'os seus'));
  } else {
    if (st) st.textContent = tr('PASSO 2 · O SEU LADO');
    if (tt) tt.textContent = tr('ESCOLHA SEU LADO DA TRETA');
    if (hint) hint.textContent = tr('Cada facção tem elenco, grito e jeito de brigar. Escolha o coro.');
  }
}

const nickEl = $('nick-input');
nickEl.value = localStorage.getItem(NICK_KEY) || '';
nickEl.oninput = () => localStorage.setItem(NICK_KEY, nickEl.value);
const SOCIAL_NET_KEY = 'awpbr_social_net'; // legado (migração pro multi-redes)
function sanitizeHandle(v) { return v.replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, ''); }
function extractFromUrl(v) {
  const m = v.match(/(?:x\.com|twitter\.com|github\.com|instagram\.com|tiktok\.com\/@|youtube\.com\/@|linkedin\.com\/in)\/?@?([A-Za-z0-9._-]+)/i);
  return m ? m[1] : null;
}

/* ---------------- multi-redes sociais (até 3, sem login) ---------------- */
const SOCIALS_KEY = 'awpbr_socials';
const NETS = [['x', 'X / Twitter'], ['github', 'GitHub'], ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['site', 'Site próprio']];
let socials = [];
try { socials = JSON.parse(localStorage.getItem(SOCIALS_KEY) || '[]'); } catch {}
// migração do campo único antigo
if (!socials.length) {
  const oldNet = localStorage.getItem(SOCIAL_NET_KEY), oldHandle = localStorage.getItem(SOCIAL_KEY);
  if (oldNet && oldHandle) socials = [{ net: oldNet, handle: oldHandle }];
}
function saveSocials() {
  localStorage.setItem(SOCIALS_KEY, JSON.stringify(socials));
  updateAvatarVisibility();
}
function updateAvatarVisibility() {
  const hasAuto = socials.some(s => ['x', 'github'].includes(s.net) && s.handle);
  $('avatar-row').classList.toggle('hidden', hasAuto || !(nickEl.value || '').trim());
}
function renderSocials() {
  const list = $('social-list');
  list.innerHTML = '';
  socials.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'pc-row social-item';
    row.innerHTML =
      `<select>${NETS.map(([v, l]) => `<option value="${v}"${v === s.net ? ' selected' : ''}>${l}</option>`).join('')}</select>` +
      `<input maxlength="40" placeholder="usuário" value="${String(s.handle).replace(/"/g, '&quot;')}">` +
      `<button class="social-del" title="remover" type="button">✕</button>`;
    const sel = row.querySelector('select'), inp = row.querySelector('input'), del = row.querySelector('.social-del');
    sel.onchange = () => { s.net = sel.value; saveSocials(); };
    inp.oninput = () => {
      let v = extractFromUrl(inp.value) || inp.value;
      v = sanitizeHandle(v);
      if (v !== inp.value) inp.value = v;
      s.handle = v; saveSocials();
    };
    del.onclick = () => { socials.splice(i, 1); saveSocials(); renderSocials(); };
    list.appendChild(row);
  });
  $('social-add').classList.toggle('hidden', socials.length >= 3);
}
$('social-add').onclick = () => { socials.push({ net: 'x', handle: '' }); saveSocials(); renderSocials(); };
nickEl.addEventListener('input', updateAvatarVisibility);
nickEl.addEventListener('input', syncPlayState);
syncPlayState();   // estado inicial do botão JOGAR (nick vem do localStorage)
renderSocials();

/* ---------------- global ranking API (via /api/* do site) ---------------- */
const TOKEN_KEY = 'awpbr_token';
function getToken() {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) { t = clientUuid(); localStorage.setItem(TOKEN_KEY, t); }
  return t;
}
async function api(path, body) {
  try {
    const r = await fetch(apiUrl(path), body
      ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
      : undefined);
    const j = await r.json().catch(() => ({}));
    return r.ok ? j : { error: j.error || `http_${r.status}`, message: j.message };
  } catch { return null; }
}
function submitNote(msg) {
  console.warn('[ranking]', msg);
}
function traduErroSubmit(msg) {
  if (/identity|identidade|token|uid/i.test(msg) || rankingBloqueado)
    return rankingBloqueado || 'não foi possível recuperar seu jogador; recarregue e tente de novo';
  return msg;
}

// stats parciais quando o jogador abandona a partida (sair pro menu / fechar aba)
/* "Tem partida viva agora?" — uma definição só, usada pelo payload de abandono E pela
   confirmação de saída. Eram a mesma condição escrita duas vezes, e duas cópias de uma
   condição é como uma delas fica pra trás. */
function emPartida() {
  return !!game && !testMode && ['live', 'roundEnd', 'countdown'].includes(game.state);
}
function partialPayload() {
  if (!emPartida() || submitted) return null;
  const g = game, p = g.player;
  const rounds = g.roundsWon.E + g.roundsWon.B;
  if (!p.kills && !p.deaths && !rounds && g.time < 30) return null;
  const nick = registeredNick || (nickEl.value || '').trim();
  if (!nick) return null;
  /* `mode` VAI TAMBÉM NO ABANDONO, e é aqui que ele mais importa (issue #87): este
     payload é o mais CURTO que o jogo produz — vencer a 1ª rodada de captura por
     dominação e fechar a aba manda `rounds: 1` com `seconds` de poucas dezenas. Sem o
     modo, o servidor aplicava o piso do ABATE (80 s/rodada) e recusava. */
  return {
    uid: getAnonId(), nick, token: getToken(), won: false, kills: p.kills, deaths: p.deaths,
    headshots: p.headshots || 0, bestStreak: g.mk.best || 0, rounds, team: g.playerTeam,
    faction: g.playerFaction || currentFaction,
    seconds: Math.round(g.time), character: currentChar, mode: matchMode,
  };
}
addEventListener('beforeunload', (e) => {
  sendTelemetry();   // aba fechando no meio da partida ainda conta como tempo jogado
  if (emPartida()) { sendMatchEvent('quit'); _funnel('quit'); }   // feat/telemetria
  const pl = partialPayload();
  if (pl) sendJsonKeepalive('/api/submit-match', pl);
  /* SEGUNDA CAMADA CONTRA O CTRL+W (relato do Daniel Diniz: *"quando fica muito tempo com
     a tecla Control pressionada a página fecha"* — é agachar + andar pra frente formando
     Ctrl+W no Windows). A trava de atalho do game.js resolve de verdade, mas é Chromium e
     exige tela cheia; no Firefox, no Safari e quando a tela cheia não pega, o que sobra é
     o navegador PERGUNTAR antes de fechar. Perder a partida com um diálogo é chato;
     perder sem aviso é o defeito.

     `emPartida()` é o gate, e ele é a metade que importa: no menu nada disso arma, então
     quem quer só fechar a aba fecha a aba. Uma confirmação que aparece sempre vira praga e
     em duas semanas alguém arranca ela inteira — e leva o conserto junto. Cláusula CW3 da
     `tools/eval/ctrlw-check.mjs` existe pra cobrar exatamente esse silêncio no menu. */
  if (emPartida()) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------------- fila de reenvio (rate limit do servidor) ---------------- */
const PENDING_KEY = 'awpbr_pending_submit';
function isSubmitCooldown(res) {
  const error = typeof res?.error === 'string' ? res.error : '';
  const message = typeof res?.message === 'string' ? res.message : '';
  return error === 'submit_cooldown' || /aguarde/i.test(error) || /aguarde/i.test(message);
}
async function submitGlobal(pl) {
  const res = await api('/api/submit-match', pl);
  if (isSubmitCooldown(res)) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pl));
    setTimeout(retryPending, 95_000);   // reenvia sozinho quando a janela abrir
  }
  return res;
}
async function retryPending() {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return;
  const res = await api('/api/submit-match', JSON.parse(raw));
  if (res && !res.error) localStorage.removeItem(PENDING_KEY);
  else if (isSubmitCooldown(res)) setTimeout(retryPending, 95_000);
}

/* ---------------- local stats (espelhados pro ranking global) ----------------
   STATS_KEY mora no bloco de storage lá em cima (TDZ: renderPlayerPlate roda antes daqui). */
function loadStats() {
  return Object.assign({ matches: 0, wins: 0, kills: 0, deaths: 0, headshots: 0, bestStreak: 0 },
    JSON.parse(localStorage.getItem(STATS_KEY) || '{}'));
}
async function recordMatchStats(s) {
  submitted = true;
  sendTelemetry();   // ANTES do guard de nick lá embaixo: telemetria cobre quem não registrou
  sendMatchEvent(s?.won ? 'won' : 'lost');   // evento rico anônimo (feat/telemetria, 016)
  _funnel('match_end');                        // funil: terminou (017)
  const st = loadStats();
  st.matches++; if (s.won) st.wins++;
  st.kills += s.kills; st.deaths += s.deaths; st.headshots += s.headshots;
  st.playSeconds = (st.playSeconds || 0) + (s.seconds || 0);
  st.rounds = (st.rounds || 0) + s.roundsP + s.roundsB;
  st.bestStreak = Math.max(st.bestStreak, s.bestStreak);
  localStorage.setItem(STATS_KEY, JSON.stringify(st));
  // espelha pro ranking global (avisa na tela se falhar)
  const nick = registeredNick || (nickEl.value || '').trim();
  if (nick && !testMode) {
    const res = await submitGlobal({
      uid: getAnonId(), nick, token: getToken(), won: s.won, kills: s.kills, deaths: s.deaths,
      headshots: s.headshots, bestStreak: s.bestStreak,
      rounds: s.roundsP + s.roundsB, team: s.team, faction: currentFaction, seconds: s.seconds || 0,
      character: s.character, mode: matchMode,
    });
    if (!res) submitNote('ranking global indisponível');
    else if (res.error) submitNote(res.message || traduErroSubmit(res.error));
  }
  renderPlayerPlate();   // XP/nível do card do menu sobem junto com os stats
}

/* ---------------- player plate (card do jogador no menu principal) ----------------
   Nível/XP derivados dos MESMOS stats locais do ranking — uma fonte só de verdade.
   2.000 XP por nível: kill 100 · headshot 25 · vitória 500 · partida 50. */
function playerXp(st) { return st.kills * 100 + st.headshots * 25 + st.wins * 500 + st.matches * 50; }
function renderPlayerPlate() {
  const el = $('player-plate'); if (!el) return;
  const st = loadStats();
  const xp = playerXp(st);
  const level = Math.floor(xp / 2000) + 1;
  const into = xp % 2000;
  const nick = (nickEl.value || '').trim();
  applyPlayerAvatar($('pp-avatar'), nick);
  $('pp-nick').textContent = nick || tr('SEM NICK');
  $('pp-level').textContent = `${tr('NÍVEL')} ${level}`;
  $('xp-fill').style.width = (into / 20) + '%';
  $('xp-num').textContent = `${into.toLocaleString('pt-BR')} / 2.000 XP`;
  el.dataset.empty = nick ? '0' : '1';
  espelhaBarraMenu();
}

/* A barra inferior do menu MOSTRA a escolha da partida; quem a MUDA continua sendo
   o setup. Espelhar em vez de duplicar o controle: dois lugares editando o mesmo
   estado é como se perde a sincronia entre eles. Se o setup ainda não montou, o
   traço fica — é o mesmo placeholder que o #map-name usa antes de escolher. */
function espelhaBarraMenu() {
  const sub = $('pp-sub');
  if (sub) {
    const s = (typeof socialList !== 'undefined' && socialList && socialList[0]) ? socialList[0] : null;
    sub.textContent = s ? `@${s.handle} · EDITAR PERFIL` : 'EDITAR PERFIL';
  }
  const armas = $('mf-armas-val'), mapa = $('mf-mapa-val');
  const caret = '<span class="caret" aria-hidden="true">▼</span>';
  if (armas) {
    const v = ($('wpn-dd-label') || {}).textContent;
    armas.innerHTML = `${(v || 'TODAS').trim()} ${caret}`;
  }
  if (mapa) {
    const v = ($('map-name') || {}).textContent;
    mapa.innerHTML = `${(v || '—').trim()} ${caret}`;
  }
}

// o plate abre o passo de perfil do setup (onde nick/avatar se editam de verdade)
$('player-plate').onclick = () => { openSetup(null, 'SEU PERFIL', null); openProfileStep(true); };
/* ARMAS e MAPA levam ao MESMO passo do setup — é lá que a escolha existe. Sem
   `markCurrent`, porque nenhum item da lista principal foi acionado. */
for (const [id, titulo] of [['mf-armas', 'MATA-MATA'], ['mf-mapa', 'MATA-MATA']]) {
  const b = $(id);
  if (b) b.onclick = () => { ui.click(); openSetup('rounds', titulo, 'sp'); };
}
function showRanking() {
  const st = loadStats();
  const kd = st.deaths ? (st.kills / st.deaths).toFixed(2) : st.kills.toFixed(2);
  const fmt = (s) => { const m = Math.round(s / 60); return m < 60 ? `${m}min` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`; };
  const secs = st.playSeconds || 0;
  const tempo = secs > 0 ? fmt(secs)
    : (st.rounds || 0) > 0 ? `~${fmt(st.rounds * 99)}`
    : st.matches > 0 ? `~${fmt(st.matches * 297)}` : '0min';
  const nick = (nickEl.value || 'VOCÊ').trim();
  const social = socials.find(s => s.handle);
  $('rank-local').innerHTML =
    `<div style="grid-column:1/-1;text-align:center;color:var(--cs);font-size:18px">${nick}` +
    (social ? ` · <span style="color:#8a8064;font-size:12px">${social.net}/${social.handle.replace(/</g, '&lt;')}</span>` : '') + `</div>` +
    `<div><b>${st.matches}</b>partidas</div><div><b>${st.wins > 0 ? st.wins : "—"}</b>vitórias</div><div><b>${kd}</b>K/D</div><div><b>${tempo}</b>arena</div>` +
    `<div><b>${st.kills}</b>kills</div><div><b>${st.deaths}</b>mortes</div><div><b>${st.headshots}</b>headshots</div><div><b>${st.rounds || 0}</b>rounds</div>`;
  show('ranking-panel');
  renderGlobal(nick);
}
async function renderGlobal(nick) {
  const box = $('rank-global');
  box.innerHTML = '<h3>RANKING GLOBAL</h3><div class="rg-off">carregando…</div>';
  const data = await api('/api/leaderboard');
  /* `disabled` é escolha, `indisponível` é defeito — e o jogador lê a diferença.
     A flag mora só no servidor (src/lib/site.ts, RANKING_ON); aqui a gente só
     reage à resposta, pra não existirem duas fontes de verdade que divergem. */
  if (data && data.disabled) {
    box.innerHTML = '<h3>RANKING GLOBAL</h3>' +
      '<div class="rg-off">desligado por enquanto — o jogo está em alpha e o ranking volta ' +
      'quando o placar for confiável. Seus stats deste navegador continuam contando, ali em cima.</div>' +
      '<div class="rg-links"><a href="/mapa" target="_blank" style="color:var(--cs)">MAPA AO VIVO ↗</a></div>';
    return;
  }
  if (!data || !data.players) {
    box.innerHTML = '<h3>RANKING GLOBAL</h3><div class="rg-off">indisponível no momento</div>';
    return;
  }
  const rows = data.players.slice(0, 10).map((p, i) =>
    `<tr class="${p.nick === nick ? 'me' : ''}"><td>${i + 1}</td><td>${p.nick}</td><td>${p.kd}</td><td>${p.kills}</td><td>${p.wins > 0 ? p.wins : "—"}</td></tr>`).join('');
  box.innerHTML = '<h3>RANKING GLOBAL (top 10)</h3>' +
    (rows
      ? `<table><tr><th>#</th><th>JOGADOR</th><th>K/D</th><th>KILLS</th><th>VIT.</th></tr>${rows}</table>`
      : '<div class="rg-off">ainda vazio — seja o primeiro!</div>') +
    `<div class="rg-links"><a href="/ranking" target="_blank" style="color:var(--cs)">RANKING COMPLETO ↗</a>` +
    (nick ? `<a href="/u/${encodeURIComponent(nick)}" target="_blank" style="color:var(--cs)">MEU PERFIL ↗</a>` : '') +
    `<a href="/mapa" target="_blank" style="color:var(--cs)">MAPA AO VIVO ↗</a></div>`;
}

// GLB idle thumbnail (no weapon), rendered off the shared preview renderer.
function glbThumb(def) {
  if (staticPreviews) return portraitUrl(def);
  if (!hasModel(def.id)) return null;
  const m = buildCharacterModel(def, { weapon: false });
  if (!m) return null;
  m.group.rotation.y = 0.5;
  for (let i = 0; i < 42; i++) m.mixer.update(1 / 60); // settle into the idle pose
  return snapThumb(m.group, portraitUrl(def));
}
/* ---------------- previews 3D dos times nos cards (pedido do dono: "uma imagem
   preview dos models, tipo um time") — renderiza 4 GLBs reais de cada facção no
   renderer de preview (dataURL) e cacheia no card. Roda 1x por visita ao menu. */
let teamPreviewsDone = false;
function ensureTeamPreviews() {
  if (teamPreviewsDone) return;
  teamPreviewsDone = true;
  for (const [btn, fac] of [['btn-team-e', 'E'], ['btn-team-b', 'B'], ['btn-team-u', 'U'], ['btn-team-c', 'C'], ['btn-team-f', 'F']]) {
    const box = document.querySelector(`#${btn} .team-chars`);
    if (!box) continue;
    const chars = CHARACTERS.filter(c => c.team === fac && GLB_CHARS.has(c.id)).slice(0, 4);
    if (!chars.length) continue;
    box.innerHTML = chars.map(() => '<span class="tc-slot"></span>').join('');
    const slots = [...box.children];
    const ready = staticPreviews ? Promise.resolve() : preloadCharacterAssets(chars.map(c => c.id));
    ready.then(() => {
      chars.forEach((c, i) => {
        const url = glbThumb(c);
        if (url && slots[i]) slots[i].innerHTML = `<img src="${url}" alt="${c.name}" title="${c.name}">`;
      });
    }).catch(() => {});
  }
}
function pickTeam(faction) {
  // 2º passo: se está escolhendo o ADVERSÁRIO, grava e começa a partida.
  // (o card da sua facção fica escondido nessa tela — adversário é sempre um dos outros 2)
  if (pickingEnemy) {
    pickingEnemy = false; currentEnemyFaction = faction;
    setEnemyPickMode(false);
    setTeamStep('side');
    startGame(currentTeam, currentChar, faction);
    return;
  }
  // faction = FACÇÃO escolhida (P/B/U). O LADO físico é P (petista/tribos) ou B (bolsonarista).
  currentFaction = faction;
  currentTeam = faction === 'B' ? 'B' : 'E';
  // estado de seleção persistente nos cards: ao voltar do personagem, a tela diz qual é o SEU lado
  for (const f of ['e', 'b', 'u', 'c', 'f']) {
    const b = $('btn-team-' + f);
    if (b) b.setAttribute('aria-pressed', String(f.toUpperCase() === faction));
  }
  const chars = CHARACTERS.filter(c => c.team === faction);   // roster da facção escolhida
  // ?nav=1 pula o preload 3D do roster (lento) — thumbnails caem no fallback pvThumb, que
  // nunca dispara GLB. A transição #char-select é o que o smoke de navegação quer provar.
  const mountCharList = () => {
    hideLoading();
    const list = $('char-list');
    list.innerHTML = '';
    let firstRow = null;
    chars.forEach((c, i) => {
      const row = document.createElement('button');
      row.className = 'char-row';
      // Avatar = busto cortado da ARTE APROVADA (molde/neutro), não do GLB low-poly —
      // referência 03: a coluna da esquerda é uma fileira de retratos, não de modelos 3D.
      const thumb0 = `/img/chars/avatars/${c.id}.webp?v=${VERSION}`;
      row.type = 'button'; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', 'false');
      row.innerHTML = `<img src="${thumb0}" alt="${c.name}"><span>${c.name}</span>`;
      row.onmouseenter = () => ui.hover();
      // A faixa é horizontal, mas ↑↓ continuam aceitos para quem já usava o fluxo antigo.
      row.onkeydown = (e) => {
        const rows = [...list.children];
        const k = rows.indexOf(row);
        let n = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (k + 1) % rows.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (k - 1 + rows.length) % rows.length;
        if (n < 0) return;
        e.preventDefault(); rows[n].focus(); rows[n].click();
      };
      row.onclick = () => selectCharacterFromAvatar(c, row, chars);
      list.appendChild(row);
      if (i === 0) firstRow = row;
    });
    // seleciona DEPOIS de gerar todos os thumbs — senão o preview fica com o último
    if (firstRow) selectChar(chars[0], firstRow);
    show('char-select');
  };
  if (navOnly || staticPreviews) { mountCharList(); return; }
  // LOADING REAL da seleção de personagem: os GLBs do roster entram ANTES da tela abrir —
  // nada de thumbnails de caixa montando aos poucos (o "minecraft" que o dono viu)
  showLoading('CARREGANDO PERSONAGENS…');
  preloadCharacterAssets(chars.map(c => c.id)).catch(() => {}).then(mountCharList);
}
/* Ficha do personagem (tela de seleção): raridade + atributos derivados da arma inicial
   (charWeapon) e de um hash estável do id. É FLAVOR de apresentação no estilo CS2/Valorant —
   NÃO afeta gameplay (vida/velocidade reais são iguais pra todo mundo). */
const ATTR_BY_WPN = {
  awp: [2, 2, 5], mosin: [2, 2, 5], deagle: [2, 3, 4], revolver38: [2, 3, 4], pistol: [2, 4, 3],
  ak: [3, 3, 3], m4: [3, 3, 4], md97: [3, 3, 3], scar: [3, 3, 4],
  mp5: [2, 4, 3], uzi: [2, 5, 2], p90: [2, 4, 2], shotgun: [4, 3, 1], lmg: [5, 1, 2],
};
/* Especialidade: flavor derivado da arma inicial (mesma fonte dos atributos).
   É o "papel" do personagem na tela de seleção, estilo agente de Valorant. */
const SPEC_BY_WPN = {
  awp: ['FRANCO-ATIRADOR', 'Um tiro, uma história. Domina as linhas longas do mapa.'],
  mosin: ['FRANCO-ATIRADOR', 'Ferrolho de guerra: lento, mas cada bala conta uma lenda.'],
  deagle: ['DUELISTA', 'Canhão de mão. Recompensa mira fria e pavio curto.'],
  revolver38: ['DUELISTA', 'Seis tiros de pura confiança. Não precisa de mais.'],
  pistol: ['CORINGA', 'Leve e rápido: ganha no giro, na economia e na esperteza.'],
  ak: ['SOLDADO', 'Dano bruto por bala. Controla o recuo, controla a treta.'],
  m4: ['SOLDADO', 'Precisão consistente em qualquer distância.'],
  md97: ['SOLDADO', 'O fuzil da pátria: equilibrado em tudo, ruim em nada.'],
  scar: ['SOLDADO', 'Pesada e estável — tiroteio longo é com ela mesma.'],
  mp5: ['BATEDOR', 'Mobilidade e cadência: entra, resolve, sai.'],
  uzi: ['BATEDOR', 'A mais rápida do pedaço: o mapa inteiro é dela.'],
  p90: ['BATEDOR', '50 balas de pressão constante no corredor.'],
  shotgun: ['QUEBRA-PORTA', 'De perto não tem conversa. Nem round pro outro lado.'],
  lmg: ['PAREDE', 'Fogo de supressão: segura o corredor sozinho.'],
};
const RARITIES = [['COMUM', 'var(--ink-300)'], ['RARO', 'var(--sys)'], ['ÉPICO', '#b47aff'], ['LENDÁRIO', 'var(--br-faixa)']];
function renderCharAttrs(c) {
  let h = 0; for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const wpn = charWeapon(c.id);
  const [vida, velo, prec] = ATTR_BY_WPN[wpn] || [3, 3, 3];
  const meme = 1 + (h % 5);
  const r = h % 10, tier = r < 5 ? 0 : r < 8 ? 1 : r < 9 ? 2 : 3;   // 50% comum / 30% raro / 10% épico / 10% lendário
  const rEl = $('char-rarity');
  rEl.textContent = tr(RARITIES[tier][0]);
  rEl.style.color = RARITIES[tier][1];
  const [specName, specDesc] = SPEC_BY_WPN[wpn] || ['SOLDADO', 'Equilíbrio em tudo.'];
  $('char-spec-name').textContent = tr(specName);
  $('char-spec-desc').textContent = tr(specDesc);
  $('char-attrs').innerHTML = [['VIDA', vida], ['VELOCIDADE', velo], ['PRECISÃO', prec], ['MEME', meme]]
    .map(([l, v]) => `<div class="attr"><span>${tr(l)}</span><div class="attr-bar"><i style="width:${v * 20}%"></i></div><b>${v}</b></div>`).join('');
}
function selectChar(c, row) {
  selChar = c;
  // aria-selected além da classe: estado de seleção legível por teclado/leitor de tela
  document.querySelectorAll('.char-row').forEach(r => { r.classList.remove('sel'); r.setAttribute('aria-selected', 'false'); });
  row.classList.add('sel'); row.setAttribute('aria-selected', 'true');
  pvSetChar(c);
  if (staticPreviews) pvSetVideo(c); else pvStopVideo();
  // rótulo da facção + tamanho do elenco sobre o nome (referência 03: "PALHAÇOS · 8 PERSONAGENS")
  const tagEl = $('char-faction-tag');
  if (tagEl) tagEl.textContent = `${tr(FACTION_NAME[currentFaction] || '')} · ${CHARACTERS.filter(x => x.team === currentFaction).length} ${tr('PERSONAGENS')}`;
  $('char-info-name').textContent = c.name;
  $('char-info-blurb').textContent = tr(c.blurb);
  renderCharAttrs(c);
}

function selectCharacterFromAvatar(c, row, roster) {
  ui.click();
  selectChar(c, row);
  void sfxReady.then(() => {
    if (selChar?.id === c.id) sfx.characterSelectVoice(c.id, c.team, roster.map((entry) => entry.id));
  });
}

/* ---------------- settings wiring ---------------- */
const sensEl = $('set-sens'), invertEl = $('set-invert-y'), volEl = $('set-vol'), qualEl = $('set-quality');
sensEl.value = settings.sens; volEl.value = settings.vol; qualEl.value = settings.quality;
invertEl.checked = settings.invertY === true;
if (COMPAT_MODE) { qualEl.disabled = true; qualEl.title = 'Modo compatibilidade usa qualidade baixa nesta sessão'; }
const updLabels = () => {
  $('set-sens-val').textContent = Number(settings.sens).toFixed(1);
  $('set-vol-val').textContent = Math.round(settings.vol * 100) + '%';
  sensEl.style.setProperty('--set-pct', `${Math.round((Number(settings.sens) - 0.2) / 2.8 * 100)}%`);
  volEl.style.setProperty('--set-pct', `${Math.round(Number(settings.vol) * 100)}%`);
};
sensEl.oninput = () => { settings.sens = +sensEl.value; updLabels(); saveSettings(); };
invertEl.onchange = () => { settings.invertY = invertEl.checked; saveSettings(); ui.click(); };
volEl.oninput = () => { settings.vol = +volEl.value; sfx.setVolume(settings.vol); updLabels(); saveSettings(); };
qualEl.onchange = () => { settings.quality = qualEl.value; saveSettings(); if (game) game.applySettings(); };
// Cor da mira: a mira sai do sistema de cor do HUD (ciano = sistema, âmbar = objetivo,
// vermelho = crítico) e passa a ser escolha do jogador — puro CSS var, sem custo por frame.
// PADRÃO = CIANO, não branco. O branco foi medido em 1,28:1 contra a parede clara do
// praca_poderes (janela de 44×42 px em volta da mira) — invisível. O ciano é o único matiz que
// nenhum dos 4 cenários ocupa. Mantido em UM lugar só (XHAIR_DEF) pra não divergir do CSS.
const XHAIR_DEF = '#4fe8e0';
const xhairEl = $('set-xhair');
function applyXhair() {
  document.documentElement.style.setProperty('--xhair', settings.xhair || XHAIR_DEF);
}
if (xhairEl) {
  xhairEl.value = settings.xhair || XHAIR_DEF;
  if (!xhairEl.value) xhairEl.value = XHAIR_DEF;   // valor salvo fora da lista (ex.: o ciano antigo #39d6e0) → volta pro padrão
  xhairEl.onchange = () => { settings.xhair = xhairEl.value; applyXhair(); saveSettings(); ui.click(); };
}
applyXhair();
const speechEl = $('set-speech');
speechEl.checked = settings.speech !== false;
speechEl.onchange = () => {
  settings.speech = speechEl.checked;
  sfx.speechEnabled = settings.speech;
  saveSettings();
  if (game?.el?.hudSpeech) game.el.hudSpeech.textContent = settings.speech ? '🔊' : '🔇';
};
// Consentimento da coleta persiste separado das preferências visuais.
const trainEl = $('set-training');
if (trainEl) {
  trainEl.checked = trainingEnabled();
  trainEl.onchange = () => {
    try { localStorage.setItem(TRAIN_CONSENT_KEY, trainEl.checked ? '1' : '0'); } catch { /* paciência */ }
    if (game) game._recordEnabled = trainEl.checked && !testMode && !!game._recorder;
  };
}
updLabels();

/* ---------------- logo ---------------- */
(function drawLogo() {
  // O splash mostrava um wordmark TERMINAL/SCI-FI (soundwave ciano + aberração cromática)
  // e 3 segundos depois o menu mostrava a key art com o logo REAL do jogo: letreiramento
  // de brush, vermelho/amarelo/branco, graffiti brasileiro. Duas marcas em 3 segundos — o
  // primeiro frame do jogo mentia sobre o produto. Este desenho passa a falar a MESMA
  // língua da key art: wordmark empilhado, tinta de pincel, borda comida, respingo, faixa
  // amarelo/preto de sinaleiro. Sem ciano, sem moldura de HUD.
  const c = $('logo-canvas') || $('splash-logo'); if (!c) return;   // splash de boot (o menu usa o logo do wallpaper)
  const x = c.getContext('2d');
  const W = 900, H = 360;
  const CAL = '#f4f1e8', AMAR = '#ffc93f', SINAL = '#e2402c', TINTA = '#0b0f13';
  x.clearRect(0, 0, W, H);
  // ruído determinístico (mulberry-ish): o mesmo logo em todo boot, sem flicker entre sessões
  let seed = 20260731;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  // camada offscreen: a erosão do pincel usa destination-out e não pode comer o fundo
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const o = off.getContext('2d');
  o.textAlign = 'center'; o.lineJoin = 'round'; o.textBaseline = 'alphabetic';

  // três linhas empilhadas, levemente rotacionadas — pintura de caminhão/lambe-lambe
  const LINES = [
    { t: 'CORO',  y: 104, col: CAL,   sx: 1.00, rot: -0.020 },
    { t: 'SOLTO', y: 196, col: AMAR,  sx: 1.06, rot: 0.014 },
    { t: 'TRETA', y: 288, col: SINAL, sx: 1.02, rot: -0.010 },
  ];
  for (const L of LINES) {
    o.save();
    o.translate(W / 2, L.y); o.rotate(L.rot); o.scale(L.sx, 1);
    o.font = '900 96px "Arial Black",Impact,"Haettenschweiler",sans-serif';
    o.lineWidth = 16; o.strokeStyle = TINTA; o.strokeText(L.t, 0, 0);   // contorno de tinta grossa
    o.lineWidth = 5;  o.strokeStyle = 'rgba(0,0,0,.55)'; o.strokeText(L.t, 3, 4);
    o.fillStyle = L.col; o.fillText(L.t, 0, 0);
    o.restore();
  }
  // borda comida: mordidas irregulares no miolo das letras (pincel seco em tapume)
  o.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 320; i++) {
    const bx = 90 + rnd() * (W - 180), by = 40 + rnd() * 262;
    o.beginPath(); o.ellipse(bx, by, 1 + rnd() * 5, 1 + rnd() * 3, rnd() * 3, 0, 7); o.fill();
  }
  o.globalCompositeOperation = 'source-over';
  // respingo de spray ao redor (só onde já não há letra: fica atrás no composite final)
  for (let i = 0; i < 90; i++) {
    const bx = 60 + rnd() * (W - 120), by = 30 + rnd() * 300;
    o.fillStyle = [CAL, AMAR, SINAL][(rnd() * 3) | 0];
    o.globalAlpha = 0.18 + rnd() * 0.5;
    o.beginPath(); o.arc(bx, by, 0.7 + rnd() * 2.2, 0, 7); o.fill();
  }
  o.globalAlpha = 1;

  // Fundo: brilho quente de tinta atrás do bloco.
  // BUG CONSERTADO (R2): era um createLinearGradient HORIZONTAL pintado num
  // fillRect(-400,-142,800,284) girado -0,02 rad. Um gradiente 1D só esmaece no eixo em
  // que ele existe — no eixo vertical o alpha era constante até a borda do retângulo, e o
  // retângulo tinha aresta dura. Resultado visível em menu-00-splash.png: um painel
  // retangular INCLINADO atrás do wordmark, com topo e base marcados.
  // Agora é um gradiente RADIAL: o alpha cai em todas as direções e chega a 0 (raio 400 →
  // 168px no eixo Y depois do scale) ANTES da borda do fillRect (176px), então não existe
  // nenhuma aresta pra ver. A rotação saiu junto: sem aresta, ela não tinha o que inclinar.
  x.save();
  x.translate(W / 2, 180); x.scale(1, 0.42);   // scale = elipse deitada (canvas só faz radial circular)
  const hz = x.createRadialGradient(0, 0, 30, 0, 0, 400);
  hz.addColorStop(0, 'rgba(255,201,63,.17)');
  hz.addColorStop(.55, 'rgba(255,201,63,.075)');
  hz.addColorStop(1, 'rgba(255,201,63,0)');
  x.fillStyle = hz; x.fillRect(-420, -420, 840, 840);
  x.restore();
  x.drawImage(off, 0, 0);

  // subtítulo: "SUPREMA" entre réguas, como carimbo de placa
  x.textAlign = 'center';
  x.font = '900 26px "Arial Black",Impact,sans-serif';
  x.fillStyle = CAL; x.globalAlpha = .92;
  x.fillText('S U P R E M A', W / 2, 336);
  x.globalAlpha = 1;
  x.strokeStyle = 'rgba(255,201,63,.75)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(W / 2 - 250, 329); x.lineTo(W / 2 - 120, 329);
  x.moveTo(W / 2 + 120, 329); x.lineTo(W / 2 + 250, 329); x.stroke();
})();

/* ---------------- loop ---------------- */
function aplicarResize() {
  renderer.setSize(innerWidth, innerHeight);
  menuCam.aspect = innerWidth / innerHeight; menuCam.updateProjectionMatrix();
  if (game) game.onResize();
}
addEventListener('resize', aplicarResize);
/* iOS (WebKit): ao girar, o 1º 'resize' vem com dimensão velha (o viewport assenta com atraso)
   — por isso os re-disparos. visualViewport cobre a barra de endereço que aparece/some. */
addEventListener('orientationchange', () => { aplicarResize(); setTimeout(aplicarResize, 250); setTimeout(aplicarResize, 600); });
if (window.visualViewport) visualViewport.addEventListener('resize', aplicarResize);
const clock = new THREE.Clock();
let menuAngle = 0;
/* #295: o clamp de 50 ms é teto POR PASSO, não por frame. Como teto por frame ele
   descartava metade do tempo real abaixo de 20 FPS e o jogo virava câmera lenta.
   Fatia o frame em passos de ≤ 50 ms (mesma semântica por passo) com teto de
   fatias — máquina que não acompanha descarta o excesso em vez de acumular
   dívida (espiral da morte). */
const PASSO_TETO = 4;
function loop() {
  requestAnimationFrame(loop);
  const dtReal = clock.getDelta();
  loadingStage.update(Math.min(0.05, dtReal));
  const csOpen = !$('char-select').classList.contains('hidden');
  // A troca com M pausa a partida; o preview 3D visível continua animando nesse estado.
  if (game && !csOpen) {
    let resto = dtReal;
    for (let n = 0; n < PASSO_TETO && resto > 1e-6; n++) {
      const passo = Math.min(0.05, resto);
      resto -= passo;
      game.update(passo, resto <= 1e-6);   // só o último passo desenha (multi-render em FPS baixo seria espiral)
    }
  } else if (!game) {
    menuAngle += Math.min(0.05, dtReal) * 0.07;
    menuCam.position.set(Math.sin(menuAngle) * 34, 17 + Math.sin(menuAngle * 0.6) * 4, Math.cos(menuAngle) * 34);
    menuCam.lookAt(0, 1, 0);
    renderer.render(menuScene, menuCam);
  }
  if (csOpen && pv && pv.model && !previewVideoVisible()) {
    const pvDt = Math.min(0.05, dtReal);
    if (!pvDrag) pv.model.rotation.y += pvDt * 0.9;   // giro automático pausa enquanto arrasta
    // ctrl.update (idle + IK da mão de apoio) quando há GLB; mixer cru só no fallback box
    if (pv.ctrl) pv.ctrl.update(pvDt, 0, false, 0); else if (pv.mixer) pv.mixer.update(pvDt);
    pv.r.render(pv.scene, pv.cam);
  }
}
loop();

/* ---------------- boot ---------------- */
/* Guarda igual à da linha de baixo, e não é zelo: esta escrita roda em escopo de
   módulo DUAS linhas antes do `show()`. Se o redesign mexer na única `.footnote`
   do documento (index.astro, dentro do #pause-menu), o TypeError acontece ANTES
   de qualquer tela aparecer — o sintoma seria "o menu não abre", que não parece
   com "alguém renomeou uma classe no pause". */
{
  const fn = document.querySelector('.footnote');
  if (fn) fn.textContent =
    `v${VERSION} · Sátira política fictícia. Nenhum político real foi consultado (ou poupado).`;
}
{ const sv = document.getElementById('splash-ver'); if (sv) sv.textContent = `v${VERSION}`; }
show('main-menu');   // mobile agora entra no menu normal (fase 1: controles de toque)
window.__CS_MAIN_READY__ = true;
window.__gameLaunch?.ready('boot');
function showInspectionResult(won, character) {
  const end = $('match-end');
  end.classList.toggle('win', won);
  end.classList.toggle('lose', !won);
  $('match-title').textContent = won ? tr('VITÓRIA') : tr('DERROTA');
  const winnerName = tr(FACTION_NAME[won ? currentFaction : currentEnemyFaction] || 'TIME ADVERSÁRIO');
  $('match-sub').textContent = won ? frase('venceu', winnerName) : frase('perdeu', winnerName);
  const playerRounds = won ? 4 : 1;
  const enemyRounds = won ? 1 : 4;
  const playerOnE = currentTeam === 'E';
  const roundsE = playerOnE ? playerRounds : enemyRounds;
  const roundsB = playerOnE ? enemyRounds : playerRounds;
  $('match-stats').innerHTML = frase('statsFim', roundsE, roundsB, won ? 16 : 7, nickEl.value || 'JOGADOR', won ? 5 : 12);
  $('me-hero').style.setProperty('--me-art', `url("/img/resultado/${character.id}-${won ? 'vitoria' : 'derrota'}.webp")`);
  show('match-end');
}
async function openInspectionScreen(target) {
  document.documentElement.dataset.inspectScreen = target.screen;
  if (target.screen === 'splash') return;
  loadingStage.hide(); dockLoadingCharacter();
  document.getElementById('boot-splash')?.remove();
  const faction = target.faction;
  const character = CHARACTERS.find((c) => c.id === target.character && c.team === faction)
    || CHARACTERS.find((c) => c.team === faction) || CHARACTERS[0];
  currentFaction = faction;
  currentTeam = faction === 'B' ? 'B' : 'E';
  currentChar = character.id;
  currentEnemyFaction = faction === 'B' ? 'E' : 'B';
  if (target.map) currentMap = resolveMapId(target.map);
  mapIdx = Math.max(0, MAP_IDS.indexOf(currentMap));

  if (target.screen === 'menu') { show('main-menu'); return; }
  if (target.screen === 'maps') { renderMapScreen(); show('map-screen'); return; }
  if (target.screen === 'faction') {
    await factionArtReady;
    setEnemyPickMode(false); setTeamStep('side'); show('team-select'); ensureTeamPreviews(); return;
  }
  if (target.screen === 'character') {
    pickTeam(faction);
    if (target.character) {
      for (let i = 0; i < 180 && $('char-select').classList.contains('hidden'); i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      const roster = CHARACTERS.filter((c) => c.team === faction);
      const row = [...$('char-list').children][roster.findIndex((c) => c.id === character.id)];
      if (row) selectChar(character, row);
    }
    return;
  }
  if (target.screen === 'loading') {
    show(null);
    showLoading(frase('carregando', MAPS[currentMap].name.toUpperCase()), 'CARREGANDO MODELOS 3D…', MAPS[currentMap].name.toUpperCase());
    return;
  }
  if (target.screen === 'victory' || target.screen === 'defeat') {
    showInspectionResult(target.screen === 'victory', character);
    return;
  }
  if (target.screen === 'settings') {
    settingsReturn = 'main-menu';
    $('set-quality').value = 'high'; show('settings-panel'); return;
  }
  await startGame(currentTeam, character.id, currentEnemyFaction);
  if (target.hp != null && game?.player) { game.player.hp = target.hp; game._updateHud(); }
  if (target.screen === 'scoreboard') {
    game.roundNum = 4; game.ctf = false; game._inspectionTotalRounds = 5;
    game.roundsWon.E = 2; game.roundsWon.B = 1; game.timeLeft = 92;
    game.paused = true; game.keys = {}; game.el.pause.classList.add('hidden'); game._showScoreboard(true); return;
  }
  if (target.screen === 'pause') game?.setPaused(true);
}
if (inspectionScreen) {
  openInspectionScreen(inspectionScreen).catch((error) => window.__gameLaunch?.fail(error, 'screen-query'));
} else if (testMode && params.get('auto')) {
  const [team, char] = params.get('auto').split(',');
  startGame(team || 'E', char || CHARACTERS[0].id);
} else if (params.get('sala')) {
  /* Chegou por LINK de convite (/sala/BR-7K3M redireciona pra cá). Espera a splash sair antes
     de abrir a rede: sem gesto do usuário o áudio nem inicia e o jogo abre mudo. */
  const entrarQuandoPuder = () => window.__mpConvite?.(params.get('sala'));
  if (document.getElementById('boot-splash')) document.addEventListener('click', entrarQuandoPuder, { once: true });
  else entrarQuandoPuder();
}

/* MULTIPLAYER — navegador de servidores, salas e sessão de rede. Aqui só se escolhe ONDE e
   EM QUE sala; a autoridade é do servidor. Desenho e decisões: docs/MULTIPLAYER.md. */

/* `matchRoster` a partir do elenco do servidor. Personagem desconhecido cai no fallback em
   vez de sumir e desalinhar o casamento de ids. */
function rosterDoServidor(lado, charId) {
  const roster = mpSessao.net.meta.roster || [];
  const meu = mpSessao.net.yourEnt;
  const def = (r) => CHARACTERS.find((c) => c.id === r.char) || CHARACTERS[0];
  return {
    allyDefs: roster.filter((r) => r.team === lado && r.id !== meu).map(def),
    enemyDefs: roster.filter((r) => r.team !== lado).map(def),
  };
}

/* Sessão de rede em curso. `null` = single-player, e é o estado normal: nada de rede roda
   até alguém entrar numa sala. */
let mpSessao = null;
let mpNoAtual = null;
let mpConectando = false;   // trava de reentrada do mpEntrar (BUG-88)
let mpNos = [];
let mpTimerLista = null;

async function obterMpTicket(action) {
  /* Nó local explícito (?mp=1/localhost) roda com MP_TICKET_REQUIRED=0. Pedir o ticket à API
     pública com node=xx fazia o fluxo de desenvolvimento morrer ANTES do WebSocket. */
  const localMp = new URLSearchParams(location.search).get('mp') || '';
  if (localMp === '1' || /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(localMp)) return '';
  const node = String(mpNoAtual?.ticketNode || mpNoAtual?.id || '').toLowerCase();
  if (!/^[a-z]{2}$/.test(node)) return '';
  const r = await fetch(apiUrl('/api/mp-ticket'), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ node, action, anonId: getAnonId(), sessionId: getSessionId() }),
  });
  if (!r.ok) throw new Error(`ticket_${r.status}`);
  const body = await r.json();
  if (!body.ticket) throw new Error('ticket_ausente');
  return body.ticket;
}

const mpEl = (id) => document.getElementById(id);
function mpErro(msg, comRetry = false) {
  const e = mpEl('mp-erro'); if (!e) return;
  e.hidden = !msg; e.textContent = msg || '';
  /* erro com saída, não beco: quando a falha é de rede o botão TENTAR DE NOVO refaz a
     sondagem inteira — sem ele a única saída era VOLTAR e entrar de novo no painel. */
  if (msg && comRetry) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mp-retry'; b.textContent = 'TENTAR DE NOVO';
    b.onclick = () => { ui.click(); abrirMultiplayer(); };
    e.appendChild(b);
  }
}
/* Chip de estado da conexão (#mp-estado). Um lugar só e sempre visível: "medindo",
   "online em tal região", "conectando na sala" e "fora do ar" são estados diferentes
   e a tela antiga não distinguia nenhum deles de "travou". */
function mpEstado(s, txt) {
  const e = mpEl('mp-estado'); if (!e) return;
  e.dataset.s = s; e.textContent = txt;
}
// Faixas de ping: o limiar não é gosto — acima de ~120 ms o tiro passa a depender de
// lag compensation pra tudo, e é aí que começa o "morri atrás da parede".
const mpQualidade = (ms) => (ms == null ? 'ruim' : ms <= 60 ? 'bom' : ms <= 120 ? 'medio' : 'ruim');

async function abrirMultiplayer() {
  show('mp-panel');
  mpErro('');
  mpMontarFormulario();
  mpEstado('sondando', 'MEDINDO O PING…');
  const nos = mpEl('mp-nos');
  if (nos) nos.innerHTML = '<div class="mp-vazio">medindo o ping dos servidores…</div>';
  mpEl('mp-salas').innerHTML = '';
  mpNos = await sondarNos(NOS);
  // ordena por ping: o servidor do jogador tem que ser o PRIMEIRO da lista, não o do dono
  mpNos.sort((a, b) => (a.ping == null ? 1e9 : a.ping) - (b.ping == null ? 1e9 : b.ping));
  const local = new URLSearchParams(location.search).get('mp');
  if (local) {
    // ?mp=1 é a máquina local; ?mp=host:porta é um servidor apontado à mão (não confundir os dois).
    const u = mpUrls(local);
    const nome = local === '1' ? 'LOCAL (desenvolvimento)' : `SERVIDOR DA URL · ${local}`;
    const sonda = await sondarNos([{ id: 'url', nome, url: u.ws }]);
    mpNos.unshift(sonda[0]);
  }
  mpDesenharNos();
  const primeiro = mpNos.find((n) => n.online) || mpNos[0];
  if (primeiro && primeiro.online) mpSelecionarNo(primeiro);
  else {
    mpEstado('erro', 'SERVIDORES FORA DO AR');
    mpErro('Nenhum servidor respondeu. Pode ser a sua conexão, ou os servidores estão fora do ar.', true);
    if (primeiro) mpSelecionarNo(primeiro);
  }
}

/* Bandeiras REAIS (dono, 31/08: "seria legal se fossem as REAIS, é só baixar e por"):
   WebP local dos SVGs oficiais do Commons — procedência em public/img/flags/FONTE.md. */
const MP_BANDEIRAS = {
  br: { img: 'br', pais: 'Brasil' },
  us: { img: 'us', pais: 'Estados Unidos' },
  eu: { img: 'es', pais: 'Espanha' },   // o nó "Europa" vive em Madri; nó novo = linha nova
};
function mpCartaoNoHTML(n) {
  const q = n.online ? mpQualidade(n.ping) : 'ruim';
  const ping = n.online ? `${n.ping} ms` : 'fora do ar';
  /* medidor de sinal: 3 barras (bom) / 2 (médio) / 1 (ruim) — o número em ms é exato,
     as barras são a leitura de longe, mesma faixa do limiar do mpQualidade */
  const acesas = q === 'bom' ? 3 : q === 'medio' ? 2 : 1;
  const barras = [1, 2, 3].map((i) => `<i class="${i <= acesas ? 'on' : ''}"></i>`).join('');
  const band = MP_BANDEIRAS[n.id];
  const flag = band
    ? `<img class="mp-flag" src="/img/flags/${band.img}.webp" width="30" height="20" alt="${band.pais}">`
    : '<span class="mp-flag" aria-hidden="true"></span>';   // nó fora do mapa (ex.: ?mp=1 local)
  return flag
    + `<span class="mp-no-info"><span class="mp-no-nome">${n.nome}</span>`
    + `<span class="mp-no-sub">${n.jogadores} jogando · ${n.salas} sala(s)</span></span>`
    + `<span class="mp-sinal" data-q="${q}" aria-hidden="true">${barras}</span>`
    + `<span class="mp-ping" data-q="${q}">${ping}</span>`;
}

function mpDesenharNos() {
  const box = mpEl('mp-nos'); if (!box) return;
  box.innerHTML = '';
  for (const n of mpNos) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mp-no'; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(mpNoAtual && mpNoAtual.id === n.id));
    b.dataset.online = n.online ? '1' : '0';
    b.innerHTML = mpCartaoNoHTML(n);
    b.onclick = () => { ui.click(); mpSelecionarNo(n); };
    box.appendChild(b);
  }
}

function mpSelecionarNo(no) {
  mpNoAtual = no;
  if (no.online) mpEstado('on', `ONLINE · ${no.nome.split('·')[0].trim()} · ${no.ping} ms`);
  mpDesenharNos();
  mpAtualizarSalas();
  // a lista se refaz sozinha: lotação muda o tempo todo e uma lista velha manda o jogador
  // pra uma sala que já encheu.
  clearInterval(mpTimerLista);
  mpTimerLista = setInterval(() => { if (!document.getElementById('mp-panel').classList.contains('hidden')) mpAtualizarSalas(); }, 5000);
}

async function mpAtualizarSalas() {
  const box = mpEl('mp-salas'); if (!box || !mpNoAtual) return;
  let salas;
  try { salas = await listRooms(mpNoAtual.http); }
  catch { box.innerHTML = '<div class="mp-vazio">não deu pra falar com esse servidor.</div>'; return; }
  if (!salas.length) { box.innerHTML = '<div class="mp-vazio">nenhuma sala aberta. crie a sua abaixo.</div>'; return; }
  // oficiais primeiro, depois as mais cheias (sala com gente é sala boa de entrar)
  salas.sort((a, b) => (b.oficial - a.oficial) || (b.players - a.players));
  box.innerHTML = '';
  for (const r of salas) {
    const div = document.createElement('div');
    div.className = 'mp-sala';
    /* sem emoji (regra do redesign): PRIVADA e espectador viram texto/tag */
    const tags = (r.oficial ? '<span class="mp-tag" data-t="oficial">OFICIAL</span>' : '')
      + (r.private ? '<span class="mp-tag" data-t="privada">PRIVADA</span>' : '')
      + (r.ctf ? '<span class="mp-tag">CTF</span>' : '');
    /* lotação como BARRA além do número: sala meio cheia e sala lotada se distinguem
       de longe, sem ler fração nenhuma */
    const frac = r.max ? Math.min(1, r.players / r.max) : 0;
    div.innerHTML =
      `<div class="mp-sala-top"><div class="mp-sala-nome">${r.name}${tags}</div>`
      + `<div class="mp-lot"><span class="mp-lot-bar"><i style="width:${Math.round(frac * 100)}%"></i></span>`
      + `<b>${r.players}</b>/${r.max}${r.spectators ? `<span class="mp-lot-spec">+${r.spectators} assistindo</span>` : ''}</div></div>`
      + `<div class="mp-sala-sub">${r.mapNome || MAPS[r.map]?.name || r.map} · ${r.nomeE} × ${r.nomeB}</div>`
      + `<div class="mp-acoes"></div>`;
    const acoes = div.querySelector('.mp-acoes');
    /* UM BOTÃO POR LADO, e não um "ENTRAR" que balanceia sozinho: o jogador quer escolher com
       quem joga, e a facção é metade da graça do jogo. O número é a vaga daquele lado — lado
       cheio apaga em vez de sumir, senão a sala parece ter menos opção do que tem. */
    for (const lado of ['E', 'B']) {
      const livres = (r.livre && r.livre[lado]) || 0;
      const b = document.createElement('button');
      b.className = 'mp-entrar'; b.type = 'button';
      b.dataset.lado = lado;
      b.textContent = `${lado === 'E' ? r.nomeE : r.nomeB} ${livres}`;
      b.title = livres ? `Entrar no time ${lado === 'E' ? r.nomeE : r.nomeB} (${livres} vaga(s))` : 'Esse lado está cheio';
      b.disabled = !livres;
      b.onclick = () => { ui.click(); mpEntrar(r, lado); };
      acoes.appendChild(b);
    }
    const assistir = document.createElement('button');
    assistir.className = 'mp-assistir'; assistir.type = 'button'; assistir.textContent = 'ASSISTIR';
    assistir.title = 'Entrar como espectador — dá pra ir pro time depois, quando abrir vaga';
    assistir.onclick = () => { ui.click(); mpEntrar(r, 'spec'); };
    const convite = document.createElement('button');
    convite.className = 'mp-convite-chip'; convite.type = 'button'; convite.textContent = r.convite || 'CONVITE';
    convite.title = 'Copiar o link de convite desta sala';
    convite.onclick = () => { ui.click(); mpCopiarConvite(r.convite, convite); };
    acoes.append(assistir, convite);
    box.appendChild(div);
  }
}

/* Copia o link e CONFIRMA na própria etiqueta. Botão de copiar sem retorno visual é o caso
   clássico de a pessoa clicar três vezes sem saber se funcionou. */
async function mpCopiarConvite(convite, botao) {
  if (!convite) return;
  const link = linkDeConvite(convite);
  const antes = botao ? botao.textContent : '';
  try { await navigator.clipboard.writeText(link); if (botao) botao.textContent = 'COPIADO!'; }
  catch { if (botao) botao.textContent = convite; mpErro(`Copie à mão: ${link}`); }
  if (botao) setTimeout(() => { botao.textContent = antes; }, 1600);
}

/* MODAL "SALA CRIADA" (dono, 31/08): o convite nasce aqui e se copia ANTES de entrar.
   Fechar (ESC/clique fora) não desfaz a criação — a lista é atualizada pra provar. */
function mpModalSalaCriada(sala, senha = '') {
  const m = mpEl('mp-modal');
  if (!m || !sala.convite) return mpEntrar(sala, 'auto', senha);   // sem modal ou sem código, o fluxo antigo vale
  mpEl('mp-modal-convite').textContent = sala.convite;
  const lot = mpEl('mp-modal-lot');
  if (lot) lot.textContent = `${sala.players | 0}/${sala.max || 10} na sala · ${sala.name || 'SALA'}`;
  const fecha = () => {
    m.classList.add('hidden');
    removeEventListener('keydown', escFecha, true);
    mpAtualizarSalas();   // a sala nova aparece na lista = prova de que fechar não cancelou
  };
  const escFecha = (e) => {
    if (e.key !== 'Escape' || m.classList.contains('hidden')) return;
    e.preventDefault(); e.stopPropagation(); ui.back(); fecha();
  };
  /* capture=true: o ESC do modal tem de vencer os outros atalhos de ESC do menu */
  addEventListener('keydown', escFecha, true);
  m.onpointerdown = (e) => { if (!e.target.closest('.mp-modal-card')) { ui.back(); fecha(); } };
  const rotula = (b, txt) => { const antes = b.textContent; b.textContent = txt; setTimeout(() => { b.textContent = antes; }, 1600); };
  const codigo = mpEl('mp-modal-copiar-codigo');
  if (codigo) codigo.onclick = async () => {
    ui.click();
    try { await navigator.clipboard.writeText(sala.convite); rotula(codigo, 'COPIADO!'); }
    catch { mpErro(`Copie à mão: ${sala.convite}`); fecha(); }
  };
  const link = mpEl('mp-modal-copiar-link');
  if (link) link.onclick = async () => {
    ui.click();
    try { await navigator.clipboard.writeText(linkDeConvite(sala.convite)); rotula(link, 'COPIADO!'); }
    catch { mpErro(`Copie à mão: ${linkDeConvite(sala.convite)}`); fecha(); }
  };
  const entrar = mpEl('mp-modal-entrar');
  if (entrar) entrar.onclick = () => { ui.click(); fecha(); mpEntrar(sala, 'auto', senha); };
  m.classList.remove('hidden');
  entrar?.focus();
}
window.__mpModalSala = mpModalSalaCriada;   // sonda/captura, mesmo precedente do __mpConvite

/* Entrada por LINK (?sala=BR-7K3M). É o caminho de quem recebeu o convite no zap: abre o jogo
   já dentro da sala, sem passar pela lista. Sala privada ainda pede senha — o link diz ONDE é
   a sala, não que você tem permissão. */
async function mpEntrarPorConvite(txt) {
  const alvo = parseConvite(txt);
  show('mp-panel'); mpMontarFormulario();
  if (!alvo) return mpErro(`Convite inválido: "${txt}". O formato é REGIÃO-CÓDIGO, tipo BR-7K3M.`);
  mpEstado('conectando', `PROCURANDO ${alvo.convite}…`);
  const http = httpDoNo(alvo.no);
  mpNoAtual = { ...alvo.no, http, ticketNode: alvo.no.id };
  const sala = await salaPorConvite(http, alvo.codigo);
  if (!sala) { await abrirMultiplayer(); return mpErro(`A sala ${alvo.convite} não existe mais. Escolha outra abaixo.`); }
  mpEntrar(sala, 'auto');
}
window.__mpConvite = mpEntrarPorConvite;

function mpMontarFormulario() {
  const e = mpEl('mp-fac-e'), b = mpEl('mp-fac-b');
  if (e && !e.options.length) {
    for (const [id, nome] of Object.entries(FACCAO_NOME_UI)) {
      e.add(new Option(nome, id)); b.add(new Option(nome, id));
    }
    e.add(new Option('SORTEAR A CADA PARTIDA', 'random'));
    b.add(new Option('SORTEAR A CADA PARTIDA', 'random'));
    e.value = 'E'; b.value = 'B';
  }
  const priv = mpEl('mp-privada'), wrap = mpEl('mp-senha-wrap');
  if (priv && wrap) priv.onchange = () => { wrap.hidden = !priv.checked; };
  const criar = mpEl('mp-criar');
  if (criar) criar.onclick = async () => {
    ui.click(); mpErro('');
    if (!mpNoAtual) return mpErro('Escolha um servidor primeiro.');
    const privada = mpEl('mp-privada').checked;
    const senha = mpEl('mp-senha').value.trim();
    if (privada && !senha) return mpErro('Sala privada precisa de senha.');
    try {
      const ticket = await obterMpTicket('create');
      const sala = await createRoom(mpNoAtual.http, {
        name: mpEl('mp-nome').value.trim(), rotacao: mpEl('mp-rotacao').value,
        faccaoE: mpEl('mp-fac-e').value, faccaoB: mpEl('mp-fac-b').value,
        ctf: mpEl('mp-modo').value === 'ctf', private: privada, password: senha, maxPlayers: 10,
        creatorNick: ($('nick-input').value || '').trim() || null,
      }, ticket);
      let cheia = { ...sala, id: sala.room || sala.id };
      /* o convite pode não vir no POST — a lista é a fonte que já o carrega; busca a sala
         recém-criada lá antes de mostrar o modal, que existe PARA o copy do código */
      if (!cheia.convite) {
        try {
          const daLista = (await listRooms(mpNoAtual.http)).find((r) => r.id === cheia.id);
          if (daLista) cheia = { ...daLista, ...cheia, convite: daLista.convite };
        } catch { /* sem lista, o modal mostra a sala sem código */ }
      }
      mpModalSalaCriada(cheia, senha);
    } catch (err) {
      mpErro(err && err.message === 'http_429'
        ? 'Esse servidor está no limite de salas. Tente outra região.'
        : 'Não deu pra criar a sala. Tente de novo.');
    }
  };
  const at = mpEl('mp-atualizar'); if (at) at.onclick = () => { ui.click(); mpAtualizarSalas(); };
  const back = mpEl('mp-back'); if (back) back.onclick = () => { ui.click(); clearInterval(mpTimerLista); show('main-menu'); };
  /* JOGO RÁPIDO: a melhor sala aberta do nó de menor ping — oficiais primeiro, depois as
     mais cheias (mesmo critério da lista). Sem sala com vaga, CRIA uma pública padrão:
     "rápido" que devolve "não achei nada" não é rápido, é beco. */
  const quick = mpEl('mp-quick');
  if (quick) quick.onclick = async () => {
    ui.click(); mpErro('');
    if (!mpNoAtual || !mpNoAtual.online) return mpErro('Nenhum servidor online agora.');
    mpEstado('conectando', 'PROCURANDO SALA…');
    let salas = [];
    try { salas = await listRooms(mpNoAtual.http); } catch { /* lista fora = cria sala */ }
    const aberta = salas
      .filter((r) => !r.private && ((r.livre?.E || 0) + (r.livre?.B || 0)) > 0)
      .sort((a, b) => (b.oficial - a.oficial) || (b.players - a.players))[0];
    if (aberta) return mpEntrar(aberta, 'auto');
    try {
      const ticket = await obterMpTicket('create');
      const sala = await createRoom(mpNoAtual.http, {
        name: 'TRETA RÁPIDA', rotacao: 'todos', faccaoE: 'random', faccaoB: 'random',
        ctf: false, private: false, password: '', maxPlayers: 10,
        creatorNick: ($('nick-input').value || '').trim() || null,
      }, ticket);
      mpEntrar({ ...sala, id: sala.room || sala.id }, 'auto');
    } catch {
      mpEstado('on', `ONLINE · ${mpNoAtual.nome.split('·')[0].trim()} · ${mpNoAtual.ping} ms`);
      mpErro('Não deu pra entrar agora. Tente uma sala da lista.');
    }
  };
  /* entrada por CÓDIGO (BR-7K3M): o caminho de quem recebeu convite fora do link */
  const form = mpEl('mp-convite-form');
  if (form && !form._ok) {
    form._ok = true;
    form.onsubmit = (e) => {
      e.preventDefault(); ui.click();
      const txt = (mpEl('mp-convite-in')?.value || '').trim();
      if (!txt) return mpErro('Digite o código do convite (formato REGIÃO-CÓDIGO, tipo BR-7K3M).');
      mpEntrarPorConvite(txt);
    };
  }
}

/* Abre o socket e SÓ ENTÃO começa a partida. A ordem importa: o welcome traz o mapa, as
   facções e o modo que o servidor está rodando — é ele que manda, não o que estava
   escolhido no menu. Começar antes seria carregar o mapa errado e trocar na cara do jogador. */
async function mpEntrar(sala, team = 'auto', senha = '') {
  if (mpConectando) return;   // dois cliques em ENTRAR não podem abrir dois sockets
  mpErro('');
  const nick = ($('nick-input').value || '').trim();
  if (sala.private && !senha) {
    senha = (prompt('Essa sala é privada. Senha:') || '').trim();
    if (!senha) return;
  }
  mpEstado('conectando', `CONECTANDO · ${sala.name || sala.convite || 'SALA'}…`);
  mpConectando = true;
  let ticket;
  try { ticket = await obterMpTicket('connect'); }
  catch {
    mpConectando = false;
    return mpErro('Não deu para autorizar a conexão. Tente novamente.');
  }
  const net = new NetClient(mpNoAtual.url.replace(/\/ws.*$/, '') + '/ws', {
    nome: nick || null, room: sala.id, pw: senha, team, ticket,
  });
  /* Espera COM feedback: o connect pode levar segundos numa região longe, e tela parada sem
     mensagem lê como "cliquei e não aconteceu nada" (BUG-88). O prazo é do net.connect(). */
  mpErro(`Conectando na sala ${sala.name || sala.id}…`);
  let welcome;
  try { welcome = await net.connect(); }
  catch (err) {
    mpConectando = false;
    const m = String(err && err.message || '');
    if (mpNoAtual.online) mpEstado('on', `ONLINE · ${mpNoAtual.nome.split('·')[0].trim()} · ${mpNoAtual.ping} ms`);
    else mpEstado('erro', 'SERVIDORES FORA DO AR');
    return mpErro(m.includes('bad_password') ? 'Senha errada.'
      : m.includes('room_full') ? 'Sala cheia.'
      : m.includes('room_not_found') ? 'Essa sala não existe mais.'
      : m.includes('timeout') ? 'O servidor demorou demais pra responder. Tente de novo ou escolha outra região.'
      : 'Não deu pra conectar nesse servidor.');
  }
  mpConectando = false;
  mpErro('');
  mpEstado('on', `NA SALA · ${sala.name || sala.convite || ''}`);
  clearInterval(mpTimerLista);
  mpSessao = { net, sala, no: mpNoAtual };
  /* O SERVIDOR dita o cenário. `currentMap`/`matchMode` são as variáveis que o startGame lê. */
  if (MAPS[welcome.map]) currentMap = welcome.map;
  matchMode = welcome.ctf ? 'ctf' : 'rounds';
  modoEscolhido = true;
  net.onClose = () => mpDesconectou();
  net.onSlot = async (m) => {
    await transitionSlot(m, net.meta, {
      team: currentTeam, faction: currentFaction, enemyFaction: currentEnemyFaction, char: currentChar,
    }, (id) => CHARACTERS.some((c) => c.id === id), async (next) => {
      currentTeam = next.team; currentFaction = next.faction;
      currentEnemyFaction = next.enemyFaction; currentChar = next.char;
      mpAtualizarBarraSpec(m);
      if (mpSessao?.net === net) await startGame(currentTeam, currentChar, currentEnemyFaction, true);
    });
  };
  // Nova partida no servidor (mapa girou): mesmo conteúdo do welcome, remonta por cima.
  // Sem isto o cliente ficava no mapa velho com ids mortos — BUG-112 (KNOWN-BUGS.md).
  net.onPartida = async (m) => {
    if (mpSessao?.net !== net) return;
    if (MAPS[m.map]) currentMap = m.map;
    matchMode = m.ctf ? 'ctf' : 'rounds';
    await mpMontarPartida(net, m);
  };
  await mpMontarPartida(net, welcome);
}

/* Monta (ou remonta) a partida a partir de um welcome/partida: lado, facções e personagem
   são do CORPO que o servidor deu; espectador usa qualquer um da facção (preload não vazio). */
async function mpMontarPartida(net, m) {
  // o lado do jogador vem do servidor; a facção também (a sala LIVRE sorteia)
  const lado = m.yourTeam === 'B' ? 'B' : 'E';
  const faccaoMinha = lado === 'B' ? m.faccaoB : m.faccaoE;
  const faccaoDele = lado === 'B' ? m.faccaoE : m.faccaoB;
  const meuNoRoster = (m.roster || []).find((r) => r.id === m.yourEnt);
  const personagem = (meuNoRoster && CHARACTERS.some((c) => c.id === meuNoRoster.char) ? meuNoRoster.char : null)
    || (CHARACTERS.find((c) => c.team === faccaoMinha) || CHARACTERS[0]).id;
  await startGame(lado, personagem, faccaoDele, true);
  if (mpSessao?.net === net) mpAtualizarBarraSpec(m);
}

/* Conexão caiu no meio da partida. Nada de "reconectar sozinho e fingir que não houve nada":
   o jogador precisa SABER, porque o corpo dele já voltou a ser bot no servidor. */
function mpDesconectou() {
  if (!mpSessao) return;
  try { if (game) sendMatchEvent('quit'); } catch { /* diagnóstico não bloqueia a saída */ }
  mpSessao = null;
  clearTelemetryGameContext();
  mpFecharBarraSpec();
  try { if (game) game.dispose(); } catch { /* já foi */ }
  game = null; window.__game = null;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* sem lock */ }
  show('mp-panel');
  /* o aviso entra DEPOIS da sondagem: abrirMultiplayer começa com mpErro('') — na ordem
     antiga a mensagem "caiu" vivia um frame e era apagada antes de alguém ler */
  abrirMultiplayer().then(() => mpErro('A conexão com o servidor caiu. Entre de novo.'));
}

/* Barra do espectador: quem está assistindo tem que saber que está assistindo, de quem é a
   visão, e como entrar em campo quando abrir vaga. Sem ela o modo espectador é
   indistinguível de "o jogo travou olhando pro outro". */
function mpAtualizarBarraSpec(estado) {
  if (!mpSessao) return;
  const espectando = !!(estado && estado.espectador);
  let bar = document.getElementById('mp-spec-bar');
  if (!espectando) { mpFecharBarraSpec(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'mp-spec-bar';
    bar.innerHTML = '<span>ASSISTINDO <b id="mp-spec-quem">—</b></span>'
      + '<button id="mp-spec-prev" type="button">◂ ANTERIOR</button>'
      + '<button id="mp-spec-next" type="button">PRÓXIMO ▸</button>'
      + '<button id="mp-spec-e" type="button">ENTRAR NO TIME E</button>'
      + '<button id="mp-spec-b" type="button">ENTRAR NO TIME B</button>'
      + '<button id="mp-spec-sair" type="button">SAIR</button>';
    document.body.appendChild(bar);
    bar.querySelector('#mp-spec-prev').onclick = () => window.__game?._mp?.trocarAlvo(-1);
    bar.querySelector('#mp-spec-next').onclick = () => window.__game?._mp?.trocarAlvo(1);
    bar.querySelector('#mp-spec-e').onclick = () => mpSessao?.net.pedirTime('E');
    bar.querySelector('#mp-spec-b').onclick = () => mpSessao?.net.pedirTime('B');
    bar.querySelector('#mp-spec-sair').onclick = () => { mpSair(); };
    /* Atualiza a lotação dos botões pelo SNAPSHOT (é o servidor que diz se há vaga). Um botão
       "ENTRAR" que está sempre aceso e não faz nada é pior que um botão apagado. */
    bar._timer = setInterval(() => {
      const mp = window.__game?._mp;
      const vagas = mp?.vagas;
      const quem = document.getElementById('mp-spec-quem');
      if (quem) quem.textContent = mp?.nomeAlvo || '—';
      const be = document.getElementById('mp-spec-e'), bb = document.getElementById('mp-spec-b');
      // nome da FACÇÃO, não a letra do lado (BUG-110)
      const meta = mpSessao?.net?.meta || {};
      const nomeE = meta.nomeE || 'TIME E', nomeB = meta.nomeB || 'TIME B';
      if (be) { be.disabled = !(vagas && vagas.E > 0); be.textContent = `ENTRAR: ${nomeE}${vagas ? ` (${vagas.E})` : ''}`; }
      if (bb) { bb.disabled = !(vagas && vagas.B > 0); bb.textContent = `ENTRAR: ${nomeB}${vagas ? ` (${vagas.B})` : ''}`; }
    }, 400);
  }
}
function mpFecharBarraSpec() {
  const bar = document.getElementById('mp-spec-bar');
  if (bar) { clearInterval(bar._timer); bar.remove(); }
}
function mpEncerrarSessao() {
  const s = mpSessao; mpSessao = null;
  mpFecharBarraSpec();
  try { s?.net.close(); } catch { /* já fechado */ }
}
/* Sair da partida online. Fecha o socket ANTES de derrubar o jogo: o servidor precisa
   liberar o corpo (senão fica um manequim segurando vaga até o heartbeat derrubar). */
function mpSair() {
  try { if (game) sendMatchEvent('quit'); } catch { /* diagnóstico não bloqueia a saída */ }
  mpEncerrarSessao();
  clearTelemetryGameContext();
  try { if (game) game.dispose(); } catch { /* já foi */ }
  game = null; window.__game = null;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* sem lock */ }
  show('main-menu');
}
