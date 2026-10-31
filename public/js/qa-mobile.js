/* QA MOBILE: roteiro determinístico de ~20 s pelos eventos de toque do #touch-ui, com relatório
   de FPS, escada, desenho e erros. Porquê, campos e cláusulas: docs/mobile/QA-MOBILE.md. */
import { VERSION } from './version.js';

const VERSAO_RELATORIO = 1;
const CANAL = 'coro-qa';
const PRAZO_LIVE_MS = 180_000;     // celular fraco em rede ruim leva minutos para montar o mapa
const PRAZO_HUD_MS = 20_000;       // o #touch-ui nasce junto com a partida; 20 s é folga
const TETO_MENSAGENS = 5;
const CHAVE_PRIVACIDADE = 'cs_privacy';

/* Passo e duração. Os prazos são ABSOLUTOS (t0 + soma): com prazo relativo o atraso de cada
   passo se somava e o roteiro de 20 s terminava em 31 s (docs/mobile/QA-MOBILE.md). */
const ROTEIRO = [
  ['olha-direita', 1600],
  ['anda-frente', 2600],
  ['atira', 2400],
  ['recarrega', 2600],
  ['mira', 1600],
  ['troca-pistola', 1400],
  ['troca-faca', 1200],
  ['troca-primaria', 1400],
  ['agacha', 1200],
  ['olha-esquerda', 1600],
  ['anda-tras', 2400],
];
export const DURACAO_ROTEIRO_MS = ROTEIRO.reduce((soma, [, ms]) => soma + ms, 0);

/* Identificadores de dedo separados: olhar, stick e botão podem se sobrepor no tempo
   e o game.js casa touchstart/touchend por `identifier`. */
const DEDO = { olhar: 11, stick: 12, botao: 13 };

const dorme = (ms) => new Promise((pronto) => setTimeout(pronto, ms));
const dormeAte = (fim) => dorme(Math.max(0, fim - performance.now()));
const proximoQuadro = () => new Promise((pronto) => requestAnimationFrame(() => pronto()));
const numero = (x) => (Number.isFinite(x) ? x : null);

function visivel(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}
/* Só o que o dedo alcança: o HUD Treta Pop esconde o stick direito (`display:none`),
   e disparar num elemento de caixa zero seria toque que nenhum jogador consegue dar. */
const noHud = (seletor) => visivel(document.querySelector(`#touch-ui ${seletor}`));
const centro = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

function toque(tipo, alvo, x, y, dedo) {
  const t = new Touch({
    identifier: dedo, target: alvo,
    clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y,
    radiusX: 10, radiusY: 10, rotationAngle: 0, force: 1,
  });
  const vivos = tipo === 'touchend' || tipo === 'touchcancel' ? [] : [t];
  alvo.dispatchEvent(new TouchEvent(tipo, {
    bubbles: true, cancelable: true, composed: true,
    touches: vivos, targetTouches: vivos, changedTouches: [t],
  }));
}

/* Apertar e soltar um botão pelo mesmo caminho do toque do jogador. */
async function aperta(el, ms, dedo = DEDO.botao) {
  const [x, y] = centro(el);
  toque('touchstart', el, x, y, dedo);
  await dorme(ms);
  toque('touchend', el, x, y, dedo);
}

/* Empurrar o stick e SEGURAR até o prazo: o vetor fica valendo até o touchend, e o
   touchmove periódico é o que um polegar parado de verdade produz. */
async function empurra(el, dx, dy, fim, dedo = DEDO.stick) {
  const [cx, cy] = centro(el);
  const x = cx + dx, y = cy + dy;
  toque('touchstart', el, x, y, dedo);
  while (performance.now() < fim) {
    await dorme(Math.min(100, Math.max(16, fim - performance.now())));
    toque('touchmove', el, x, y, dedo);
  }
  toque('touchend', el, x, y, dedo);
}

/* Arrastar na área de olhar. O avanço é pelo RELÓGIO, não por contagem de passos:
   num aparelho lento o dedo chega ao mesmo ponto final, só com menos amostras. */
async function arrasta(el, dx, dy, fim, dedo = DEDO.olhar) {
  const [cx, cy] = centro(el);
  const inicio = performance.now();
  const total = Math.max(1, fim - inicio);
  toque('touchstart', el, cx, cy, dedo);
  while (performance.now() < fim) {
    await dorme(Math.min(40, Math.max(8, fim - performance.now())));
    const t = Math.min(1, (performance.now() - inicio) / total);
    toque('touchmove', el, cx + dx * t, cy + dy * t, dedo);
  }
  toque('touchend', el, cx + dx, cy + dy, dedo);
}

async function esperaAte(condicao, prazoMs, intervalo = 200) {
  const fim = performance.now() + prazoMs;
  for (;;) {
    const valor = condicao();
    if (valor) return valor;
    if (performance.now() >= fim) return null;
    await dorme(intervalo);
  }
}

/* O ops.js mede FPS só com analytics permitido. Liga para o roteiro e devolve um
   restaurador que repõe EXATAMENTE a escolha anterior (inclusive "nunca escolheu"). */
function ligaMedicao() {
  let antes = null;
  try { antes = localStorage.getItem(CHAVE_PRIVACIDADE); } catch { /* storage bloqueado */ }
  try { window.__csPrivacy?.set(true); } catch { /* sem runtime de privacidade */ }
  return () => {
    try {
      if (antes === null) localStorage.removeItem(CHAVE_PRIVACIDADE);
      else localStorage.setItem(CHAVE_PRIVACIDADE, antes);
      window.dispatchEvent(new CustomEvent('cs-privacy-change', { detail: null }));
    } catch { /* storage bloqueado */ }
  };
}

function vigiaErros() {
  const conta = { js: 0, rejeicoes: 0, mensagens: [] };
  const guarda = (texto) => {
    if (conta.mensagens.length < TETO_MENSAGENS) conta.mensagens.push(String(texto || '').slice(0, 160));
  };
  const noErro = (e) => { conta.js++; guarda(e?.message || e?.error?.message); };
  const naRejeicao = (e) => { conta.rejeicoes++; guarda(e?.reason?.message || e?.reason); };
  window.addEventListener('error', noErro);
  window.addEventListener('unhandledrejection', naRejeicao);
  return {
    conta,
    parar() {
      window.removeEventListener('error', noErro);
      window.removeEventListener('unhandledrejection', naRejeicao);
      return conta;
    },
  };
}

/* `renderer.info.render` lido num rAF devolve 0 no celular: o autoReset zera a cada render e a
   última é a do viewmodel. Acumula e divide por quadro desenhado (docs/mobile/QA-MOBILE.md). */
function vigiaDesenho(renderer, jogo) {
  const info = renderer?.info;
  if (!info) return { parar: () => ({ drawCalls: null, triangulos: null, quadros: null }) };
  const autoResetAntes = info.autoReset;
  const quadrosAntes = jogo?._rafFrames || 0;
  info.autoReset = false;
  info.reset();
  return {
    parar() {
      const quadros = Math.max(1, (jogo?._rafFrames || 0) - quadrosAntes);
      const calls = info.render.calls, tri = info.render.triangles;
      info.autoReset = autoResetAntes;
      info.reset();
      return {
        drawCalls: Math.round(calls / quadros),
        triangulos: Math.round(tri / quadros),
        quadros,
      };
    },
  };
}

/* ---- leituras de estado (nunca lançam: relatório parcial vale mais que nenhum) ---- */
function leEscada() {
  try {
    const e = window.__escada;
    return { degrau: numero(e?.escada?.degrau), nome: e?.DEGRAUS?.[e?.escada?.degrau]?.nome ?? null };
  } catch { return { degrau: null, nome: null }; }
}
function leFps() {
  try {
    const r = window.__csbOps?.resumo?.();
    return {
      p50: numero(r?.fps?.p50), p5: numero(r?.fps?.p5), min: numero(r?.fps?.min),
      amostras: numero(r?.fps?.amostras), travadas: numero(r?.fps?.travadas), congeladas: numero(r?.fps?.congeladas),
    };
  } catch { return { p50: null, p5: null, min: null, amostras: null, travadas: null, congeladas: null }; }
}
function leJogo(g) {
  const p = g?.player;
  const municao = p?.ammo?.[p?.weapon];
  return {
    arma: p?.weapon ?? null,
    municao: numero(municao?.mag),
    reserva: numero(municao?.res),
    yaw: numero(p?.yaw), pitch: numero(p?.pitch),
    x: numero(p?.pos?.x), z: numero(p?.pos?.z),
    recarregando: numero(p?.reloadUntil) > 0,
  };
}

/* ---- o roteiro ---- */
async function executaPasso(nome, fim, g, interacao, falhas) {
  const exige = (seletor) => {
    const el = noHud(seletor);
    if (!el) falhas.push(`${nome}: sem ${seletor} no HUD de toque`);
    return el;
  };
  switch (nome) {
    case 'olha-direita': case 'olha-esquerda': {
      const el = exige('.touch-look');
      if (!el) return dormeAte(fim);
      /* O giro é medido POR PASSO e somado em módulo: o roteiro olha para os dois
         lados, e a diferença entre o começo e o fim da partida se cancelaria. */
      const antes = leJogo(g).yaw;
      const largura = el.getBoundingClientRect().width;
      await arrasta(el, (nome === 'olha-direita' ? -1 : 1) * Math.min(160, largura * 0.6), -20, fim);
      const depois = leJogo(g).yaw;
      if (antes !== null && depois !== null) interacao.giroAcumulado += Math.abs(depois - antes);
      return undefined;
    }
    case 'anda-frente': case 'anda-tras': {
      const el = exige('.touch-joy-l');
      if (!el) return dormeAte(fim);
      interacao.tentouAndar = true;   // intenção; a PROVA de que andou é o `deltaPos` do relatório
      return empurra(el, 0, nome === 'anda-frente' ? -48 : 48, fim);
    }
    case 'atira': {
      // Quatro toques, porque arma sem `segurar` dá um tiro por aperto.
      const el = visivel(document.querySelector('#touch-ui .tp-toque-atira'))
        || noHud('.touch-fire');
      if (!el) { falhas.push('atira: nenhum gatilho de toque visível'); return dormeAte(fim); }
      interacao.gatilho = el.className.split(/\s+/).find((c) => c.startsWith('t')) || 'toque';
      interacao.municaoAntes = leJogo(g).municao;
      const toques = 4, inicio = performance.now(), total = Math.max(1, fim - inicio);
      for (let i = 0; i < toques; i++) {
        const prazo = inicio + (total * (i + 1)) / toques;
        await aperta(el, Math.min(200, Math.max(60, (prazo - performance.now()) * 0.4)));
        await dormeAte(prazo);
      }
      interacao.municaoDepois = leJogo(g).municao;
      return undefined;
    }
    case 'recarrega': {
      const el = exige('.touch-reload');
      if (!el) return dormeAte(fim);
      await aperta(el, 120);
      await dorme(200);
      interacao.recarregou = leJogo(g).recarregando;
      return dormeAte(fim);
    }
    case 'mira': {
      const el = exige('.touch-ads');
      if (!el) return dormeAte(fim);
      return aperta(el, Math.max(0, fim - performance.now()));
    }
    case 'troca-pistola': case 'troca-faca': case 'troca-primaria': {
      const slot = { 'troca-pistola': 'secondary', 'troca-faca': 'knife', 'troca-primaria': 'primary' }[nome];
      const el = exige(`.touch-wep[data-wep="${slot}"]`);
      if (!el) return dormeAte(fim);
      await aperta(el, 120);
      await dorme(240);
      const arma = leJogo(g).arma;
      if (arma && !interacao.armas.includes(arma)) interacao.armas.push(arma);
      return dormeAte(fim);
    }
    case 'agacha': {
      const el = exige('.touch-crouch');
      if (!el) return dormeAte(fim);
      return aperta(el, Math.max(0, fim - performance.now()));
    }
    default:
      return dormeAte(fim);
  }
}

function publica(relatorio) {
  window.__CS_QA_RESULT__ = relatorio;
  try { console.info('[qa-mobile]', JSON.stringify(relatorio)); } catch { /* console mudo */ }
  try {
    const ponte = window.ReactNativeWebView;
    if (ponte?.postMessage) ponte.postMessage(JSON.stringify({ source: CANAL, kind: 'relatorio', relatorio }));
  } catch { /* sem ponte nativa: o relatório fica em window.__CS_QA_RESULT__ */ }
  try { window.dispatchEvent(new CustomEvent('cs-qa-mobile', { detail: relatorio })); } catch { /* ambiente sem CustomEvent */ }
  return relatorio;
}

let rodando = null;

export function ligarQaMobile() {
  if (rodando) return rodando;
  const params = new URLSearchParams(location.search);
  const origem = params.get('qa') === 'mobile' ? 'url' : (window.__CS_QA__ ? 'injetado' : null);
  if (!origem) return null;   // guarda redundante: quem decide é o main.js, mas o arquivo não roda sozinho
  rodando = rodar(origem).catch((erro) => publica({
    versao: VERSAO_RELATORIO, ok: false, origem,
    falhas: [`harness quebrou: ${String(erro?.message || erro).slice(0, 160)}`],
  }));
  return rodando;
}

async function rodar(origem) {
  const restauraPrivacidade = ligaMedicao();
  const falhas = [];
  const jogo = await esperaAte(() => (window.__game?.state === 'live' ? window.__game : null), PRAZO_LIVE_MS);
  if (!jogo) {
    restauraPrivacidade();
    return publica({ versao: VERSAO_RELATORIO, ok: false, origem, falhas: [`a partida não chegou a 'live' em ${PRAZO_LIVE_MS} ms`] });
  }
  if (!await esperaAte(() => noHud('.touch-joy-l'), PRAZO_HUD_MS)) falhas.push('o HUD de toque (#touch-ui) não apareceu');

  const vigia = vigiaErros();
  const desenho = vigiaDesenho(window.__escada?.renderer, jogo);
  const antes = leJogo(jogo);
  const escadaInicial = leEscada();
  const interacao = {
    gatilho: null, municaoAntes: null, municaoDepois: null,
    recarregou: false, tentouAndar: false, armas: [], giroAcumulado: 0,
  };
  const passos = [];
  const t0 = performance.now();
  let prazo = t0;
  for (const [nome, ms] of ROTEIRO) {
    const inicio = performance.now();
    prazo += ms;
    try { await executaPasso(nome, prazo, jogo, interacao, falhas); }
    catch (erro) { falhas.push(`${nome}: ${String(erro?.message || erro).slice(0, 120)}`); }
    passos.push({ passo: nome, ms: Math.round(performance.now() - inicio) });
  }
  const duracaoMs = Math.round(performance.now() - t0);
  await proximoQuadro();
  const depois = leJogo(jogo);
  const erros = vigia.parar();
  const render = desenho.parar();
  const fps = leFps();
  const escadaFinal = leEscada();
  let dpr = null;
  try { dpr = numero(window.__escada?.renderer?.getPixelRatio?.()); } catch { /* renderer sumiu com a partida */ }
  restauraPrivacidade();

  const delta = (a, b) => (a === null || b === null ? null : Number((b - a).toFixed(4)));
  const relatorio = {
    versao: VERSAO_RELATORIO,
    origem,
    duracaoMs,
    roteiroMs: DURACAO_ROTEIRO_MS,
    passos,
    identificacao: {
      mapa: jogo._mapId || null,
      modo: jogo.ctf ? 'ctf' : 'rounds',
      versao: VERSION,
      userAgent: String(navigator.userAgent || '').slice(0, 200),
      tela: { largura: innerWidth, altura: innerHeight, dprJanela: numero(devicePixelRatio) },
    },
    fps,
    escada: { inicial: escadaInicial.degrau, final: escadaFinal.degrau, nome: escadaFinal.nome },
    render: { dpr, ...render },
    erros: { js: erros.js, rejeicoes: erros.rejeicoes, mensagens: erros.mensagens },
    interacao: {
      ...interacao,
      giroAcumulado: Number(interacao.giroAcumulado.toFixed(4)),
      tiros: interacao.municaoAntes === null || interacao.municaoDepois === null
        ? null : Math.max(0, interacao.municaoAntes - interacao.municaoDepois),
      deltaYaw: delta(antes.yaw, depois.yaw),
      deltaPitch: delta(antes.pitch, depois.pitch),
      deltaPos: antes.x === null || depois.x === null ? null
        : Number(Math.hypot(depois.x - antes.x, depois.z - antes.z).toFixed(3)),
      armaInicial: antes.arma, armaFinal: depois.arma,
    },
    falhas,
  };
  relatorio.ok = falhas.length === 0 && erros.js === 0 && erros.rejeicoes === 0;
  return publica(relatorio);
}

export default ligarQaMobile;
