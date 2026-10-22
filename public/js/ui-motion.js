/* Movimento da Treta Pop num lugar só: os cinco tipos do mapa da tela 39 (fade
   180/280, cortina 480+480, drawer 280/220, overlay 180/280, toast 280·4s·280). */
/* Durações saem dos tokens --tp-d-*, então "Reduzir animações" vale sem segunda regra.
   Não cria estado: observa o .hidden que game.js e main.js já alternam. */

const raiz = () => document.documentElement;
const v3 = () => raiz().dataset.ui === 'v3';

/* Lê a duração do token em vez de repetir o número: quem reduz animação reescreve
   o token, e o JS obedece sem saber que existe uma preferência. */
export function duracao(nome) {
  const bruto = getComputedStyle(raiz()).getPropertyValue(`--tp-d-${nome}`).trim();
  const n = parseFloat(bruto);
  if (!Number.isFinite(n)) return 0;
  return bruto.endsWith('ms') || !bruto.endsWith('s') ? n : n * 1000;
}
export const movimentoReduzido = () => getComputedStyle(raiz()).getPropertyValue('--tp-mov').trim() === '0';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* Cortina: faixa lima cobre a tela, a troca acontece atrás dela e ela sai pelo
   outro lado. É o que esconde o engasgo do carregamento. */
let cortinaViva = null;
export async function cortina(troca) {
  if (!v3() || movimentoReduzido()) { await troca?.(); return; }
  if (cortinaViva) { await cortinaViva; }
  const d = duracao('cena') || 480;
  const faixa = document.createElement('div');
  faixa.className = 'tp-cortina';
  faixa.setAttribute('aria-hidden', 'true');
  document.body.appendChild(faixa);
  cortinaViva = (async () => {
    faixa.classList.add('tp-cortina--fecha');
    await espera(d);
    try { await troca?.(); } finally {
      faixa.classList.add('tp-cortina--abre');
      await espera(d);
      faixa.remove();
      cortinaViva = null;
    }
  })();
  return cortinaViva;
}

/* Fade: View Transitions quando o navegador tem (um repaint só), senão classes
   CSS. Mesmo desenho nos dois caminhos: 180 saindo, 280 entrando. */
export async function fade(troca, alvo = document.body) {
  if (!v3() || movimentoReduzido()) { await troca?.(); return; }
  if (document.startViewTransition) {
    raiz().classList.add('tp-vt-fade');
    try { await document.startViewTransition(() => troca?.()).finished; }
    catch { /* transição cancelada não pode derrubar a troca de tela */ }
    finally { raiz().classList.remove('tp-vt-fade'); }
    return;
  }
  alvo.classList.add('tp-fade-sai');
  await espera(duracao('rapido') || 180);
  await troca?.();
  alvo.classList.remove('tp-fade-sai');
  alvo.classList.add('tp-fade-entra');
  await espera(duracao('painel') || 280);
  alvo.classList.remove('tp-fade-entra');
}

/* Overlays (morte, round, placar, pausa): o jogo segue alternando .hidden; aqui
   só se marca o elemento para o CSS animar sem cobrir o placar do topo. */
const OVERLAYS_HUD = ['respawn-overlay', 'round-banner', 'scoreboard', 'pause-menu'];
function observarOverlay(el) {
  if (!el || el.dataset.tpOverlay === '1') return;
  el.dataset.tpOverlay = '1';
  el.classList.add('tp-overlay');
}

/* Toast: recompensa e aviso nunca abrem modal (tela 17). O desenho é o
   .tp-toasts/.tp-toast que o kit já traz. */
let toastHost = null;
export function toast(texto, { acao = null, aoClicar = null, tempo = 4000 } = {}) {
  if (!v3() || !texto) return null;
  if (!toastHost) {
    toastHost = document.querySelector('.tp-toasts');
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'tp-toasts';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
  }
  const caixa = document.createElement('div');
  caixa.className = 'tp-toast';
  const corpo = document.createElement('span');
  corpo.textContent = texto;
  caixa.appendChild(corpo);
  let saiu = false;
  const sair = () => {
    if (saiu) return;
    saiu = true;
    delete caixa.dataset.visivel;
    setTimeout(() => caixa.remove(), (duracao('painel') || 280) + 40);
  };
  if (acao && aoClicar) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tp-btn tp-btn--fantasma';
    btn.textContent = acao;
    btn.style.pointerEvents = 'auto';
    btn.addEventListener('click', () => { aoClicar(); sair(); });
    caixa.appendChild(btn);
  }
  toastHost.appendChild(caixa);
  requestAnimationFrame(() => { caixa.dataset.visivel = '1'; });
  setTimeout(sair, movimentoReduzido() ? 1200 : tempo);
  return sair;
}
/* Drawer: usa a .tp-gaveta do kit (280 entra, 220 sai) e o .tp-recuado, que já
   desenha o fundo recuando. */
export function drawer(el, aberto, fundo = document.getElementById('hub-ui')) {
  if (!el) return;
  el.classList.add('tp-gaveta');
  if (aberto) el.dataset.aberta = '1'; else delete el.dataset.aberta;
  fundo?.classList.toggle('tp-recuado', !!aberto && v3() && !movimentoReduzido());
}

/* Única aresta que o módulo dispara sozinho: #load-overlay aparecendo ou sumindo
   é lobby -> carregamento -> HUD, e o mapa manda cortina. */
function observarCarregamento() {
  const caixa = document.getElementById('load-overlay');
  if (!caixa) return;
  let visivel = !caixa.classList.contains('hidden');
  const obs = new MutationObserver(() => {
    const agora = !caixa.classList.contains('hidden');
    if (agora === visivel) return;
    visivel = agora;
    /* A troca já aconteceu quando o observador acorda; a cortina passa por cima
       para o corte não aparecer seco. */
    cortina(() => {});
  });
  obs.observe(caixa, { attributes: true, attributeFilter: ['class'] });
}

export function ligar() {
  if (!v3() || raiz().dataset.tpMotion === '1') return;
  raiz().dataset.tpMotion = '1';
  for (const id of OVERLAYS_HUD) {
    const el = document.getElementById(id);
    if (el) observarOverlay(el);
  }
  observarCarregamento();
}
