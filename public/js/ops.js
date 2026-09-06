/* Sinais operacionais da sessão (boot, FPS, falhas de carga, WebGL, partida, abandono).
   Só coleta e expõe `window.__csbOps`; nada é desenhado — ver docs/runbooks/operacao-autonoma.md. */
const OPS_VERSAO = 1;
const TETO_AMOSTRAS = 300;
const TETO_FALHAS = 50;
// o coletor de /api/jserror guarda 20 migalhas (index.astro): o ops.js gasta no máximo 5, o resto é do jogador
const TETO_MIGALHAS = 5;
const CHAVE_ULTIMA = 'cs_ops_last';

const estado = {
  inicio: Date.now(),
  fase: 'land',
  marcos: {},
  fps: { amostras: [], travadas: 0, congeladas: 0 },
  recursos: { total: 0, falhas: [] },
  webgl: { perdidos: 0, restaurados: 0 },
  erros: { total: 0, promessas: 0, ultimos: [] },
  partida: { mapa: null, modo: null, estado: null, inicios: 0, fins: 0, erros: 0, transicoes: [] },
  abandono: null,
};
let migalhasEnviadas = 0;
let gravouUltima = false;

const agora = () => Math.round(performance.now());
function migalha(txt) {
  if (migalhasEnviadas >= TETO_MIGALHAS) return;
  migalhasEnviadas++;
  try { window.__migalha?.('ops ' + txt); } catch { /* coletor ausente */ }
}
function marco(nome) {
  if (estado.marcos[nome] != null) return false;
  estado.marcos[nome] = agora();
  return true;
}
function caminhoDe(url) {
  try { return new URL(url, location.href).pathname.slice(0, 120); } catch { return String(url).slice(0, 120); }
}
function registraFalha(caminho, status, tipo) {
  if (/\/favicon\.ico$/.test(caminho)) return;
  estado.recursos.falhas.length < TETO_FALHAS && estado.recursos.falhas.push({ caminho, status, tipo, t: agora() });
  if (estado.recursos.falhas.length <= 2) migalha(`carga falhou ${status} ${caminho}`);
}

function percentil(v, p) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

/* ---- boot: os marcos que o index.astro e o main.js já publicam ---- */
function vigiaBoot() {
  const fim = Date.now() + 120000;
  const tick = () => {
    if (window.__CS_MAIN_LOADED && marco('main_loaded')) { /* módulo chegou */ }
    if (window.__CS_MAIN_FAILED && marco('main_falhou')) migalha('main.js não carregou');
    if (window.__CS_MAIN_READY__ && marco('main_ready')) { estado.fase = 'menu'; migalha(`main pronto em ${estado.marcos.main_ready}ms`); }
    if (!estado.marcos.main_ready && !estado.marcos.main_falhou && Date.now() < fim) setTimeout(tick, 250);
  };
  tick();
}

/* ---- partida: lê o `window.__game` que o main.js expõe, 1× por segundo ---- */
let rafAtivo = false;
function vigiaPartida() {
  let anterior = null;
  setInterval(() => {
    try {
      const g = window.__game;
      const p = estado.partida;
      if (g) {
        const st = g.state || null;
        p.mapa = g._mapId || p.mapa;
        p.modo = g.ctf ? 'ctf' : 'rounds';
        if (st !== p.estado) {
          p.transicoes.length < 40 && p.transicoes.push({ de: p.estado, para: st, t: agora() });
          if (st === 'live') {
            estado.fase = 'partida';
            p.inicios++;
            if (marco('primeiro_live')) migalha(`live em ${estado.marcos.primeiro_live}ms mapa=${p.mapa} modo=${p.modo}`);
            ligaFps();
          } else if (st === 'matchEnd') {
            estado.fase = 'fim';
            p.fins++;
            resumoFps();
            desligaFps();
          }
          p.estado = st;
        }
      } else if (anterior) {
        estado.fase = 'menu';
        if (p.estado && p.estado !== 'matchEnd') { p.fins++; resumoFps(); }
        p.estado = null;
        desligaFps();
      }
      anterior = g || null;
    } catch { /* vigia nunca derruba o jogo */ }
  }, 1000);
}

/* ---- FPS: contagem de frames por segundo só enquanto há partida ---- */
let ultimoFrame = 0, framesNoSegundo = 0, inicioSegundo = 0;
function passoFps(t) {
  if (!rafAtivo) return;
  if (ultimoFrame) {
    const dt = t - ultimoFrame;
    if (dt > 100 && dt < 5000 && !document.hidden) {
      estado.fps.travadas++;
      if (dt > 1000) { estado.fps.congeladas++; if (estado.fps.congeladas <= 1) migalha(`congelou ${Math.round(dt)}ms`); }
    }
  }
  ultimoFrame = t;
  framesNoSegundo++;
  if (!inicioSegundo) inicioSegundo = t;
  if (t - inicioSegundo >= 1000) {
    if (estado.fps.amostras.length >= TETO_AMOSTRAS) estado.fps.amostras.shift();
    if (!document.hidden) estado.fps.amostras.push(framesNoSegundo);
    framesNoSegundo = 0; inicioSegundo = t;
  }
  requestAnimationFrame(passoFps);
}
function ligaFps() { if (rafAtivo) return; rafAtivo = true; ultimoFrame = 0; framesNoSegundo = 0; inicioSegundo = 0; requestAnimationFrame(passoFps); }
function desligaFps() { rafAtivo = false; }
// aba de volta do fundo: o primeiro frame traz o dt do tempo escondido e não é congelamento
function zeraFrame() { ultimoFrame = 0; framesNoSegundo = 0; inicioSegundo = 0; }
function resumoFps() {
  const a = estado.fps.amostras;
  if (a.length) migalha(`fps p50=${percentil(a, 50)} p5=${percentil(a, 5)} travadas=${estado.fps.travadas}`);
}

/* ---- recursos: o que o navegador pediu e voltou ≥ 400 (ou nem voltou) ---- */
function vigiaRecursos() {
  try {
    const po = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) {
        estado.recursos.total++;
        const st = e.responseStatus;
        if (st >= 400) registraFalha(caminhoDe(e.name), st, e.initiatorType || '?');
      }
    });
    po.observe({ type: 'resource', buffered: true });
  } catch { /* sem PerformanceObserver */ }
  window.addEventListener('error', (e) => {
    const alvo = e.target;
    if (!alvo || alvo === window || !(alvo.src || alvo.href)) return;
    registraFalha(caminhoDe(alvo.src || alvo.href), 'erro', String(alvo.tagName || '?').toLowerCase());
  }, true);
}

/* ---- WebGL e exceções: contagem, nunca o conteúdo digitado ---- */
function vigiaErros() {
  window.addEventListener('webglcontextlost', () => { estado.webgl.perdidos++; migalha('contexto WebGL perdido'); }, true);
  window.addEventListener('webglcontextrestored', () => { estado.webgl.restaurados++; }, true);
  window.addEventListener('error', (e) => {
    if (!e || typeof e.message !== 'string') return;
    estado.erros.total++;
    if (estado.fase === 'partida') estado.partida.erros++;
    estado.erros.ultimos.length < 5 && estado.erros.ultimos.push(String(e.message || '').slice(0, 120));
  });
  window.addEventListener('unhandledrejection', () => {
    estado.erros.promessas++;
    if (estado.fase === 'partida') estado.partida.erros++;
  });
}

/* ---- abandono: em que fase a aba fechou/escondeu; fica no storage da próxima visita ---- */
function vigiaSaida() {
  const grava = (motivo) => {
    if (gravouUltima && motivo === 'hidden') return;
    estado.abandono = { fase: estado.fase, motivo, t: agora() };
    try { localStorage.setItem(CHAVE_ULTIMA, JSON.stringify(resumo())); gravouUltima = true; } catch { /* storage bloqueado */ }
  };
  window.addEventListener('pagehide', () => grava('pagehide'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) grava('hidden'); else zeraFrame(); });
}

function resumo() {
  const a = estado.fps.amostras;
  return {
    v: OPS_VERSAO, inicio: estado.inicio, fase: estado.fase, marcos: { ...estado.marcos }, uptimeMs: agora(),
    fps: { amostras: a.length, p50: percentil(a, 50), p5: percentil(a, 5), min: a.length ? Math.min(...a) : null, travadas: estado.fps.travadas, congeladas: estado.fps.congeladas },
    recursos: { total: estado.recursos.total, falhas: estado.recursos.falhas.slice(0, 20) },
    webgl: { ...estado.webgl },
    erros: { ...estado.erros, ultimos: estado.erros.ultimos.slice() },
    partida: { ...estado.partida, transicoes: estado.partida.transicoes.slice(-10) },
    abandono: estado.abandono,
  };
}
function ultimaSessao() {
  try { const s = localStorage.getItem(CHAVE_ULTIMA); return s ? JSON.parse(s) : null; } catch { return null; }
}
function snapshot() { return { ...resumo(), ultimaSessao: ultimaSessao() }; }
function brief() {
  const r = resumo();
  return `fase=${r.fase} ready=${r.marcos.main_ready ?? '-'}ms live=${r.marcos.primeiro_live ?? '-'}ms fps50=${r.fps.p50 ?? '-'} falhas=${r.recursos.falhas.length} gl=${r.webgl.perdidos} err=${r.erros.total}`;
}

try {
  vigiaBoot(); vigiaPartida(); vigiaRecursos(); vigiaErros(); vigiaSaida();
  if (new URLSearchParams(location.search).get('ops') === '1') setInterval(() => console.info('[ops]', brief()), 30000);
} catch { /* diagnóstico nunca derruba o jogo */ }

window.__csbOps = { versao: OPS_VERSAO, snapshot, brief, resumo, _estado: estado, _percentil: percentil };
export { snapshot, brief, percentil };
