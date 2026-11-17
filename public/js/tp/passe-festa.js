/* Novidades do passe fora da tela do passe: celebração de nível, aviso de missão concluída e o
   "+N XP do passe" na tela de resultado. Tudo nasce do diff de passe.js (PASSE_NOVIDADE, memória por
   conta+temporada no localStorage) e do marco de fim de partida (acompanharPartidaPasse); nada aqui
   pede XP nem decide nível. Régua: tools/eval/passe-browser.mjs (PB12-PB15). */
import { tr, frase } from '../i18n.js';
import { passeEstado, passeConta, resgatarTodos, resgatandoTodos, marcarNivelVisto, passePartida, progressoNivel, resumirRecompensas,
  PASSE_EVENTO, PASSE_NOVIDADE } from '../passe.js';
import { abrirPasse, passeAberto, fecharPasse, premio, elementoResumo, mensagemErro, numero, NOMES_MISSAO } from './passe.js';

const $ = (id) => document.getElementById(id);
function no(tag, cls = '', texto = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}
const movimento = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'reduzido';
const noLobby = () => { const m = $('main-menu'); const s = $('boot-splash'); return !!m && !m.classList.contains('hidden') && (!s || s.classList.contains('gone')); };
const noResultado = () => { const f = $('match-end'); return !!f && !f.classList.contains('hidden'); };

/* Contagem animada de um número (nível, XP): sem movimento, o valor final na hora. */
function contar(el, de, para, ms, formato = String) {
  if (!movimento() || de === para) { el.textContent = formato(para); return; }
  const t0 = performance.now();
  const passo = (t) => {
    if (!el.isConnected) return;
    const p = Math.min(1, (t - t0) / ms), k = 1 - (1 - p) ** 3;
    el.textContent = formato(Math.round(de + (para - de) * k));
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

/* ---------- celebração de nível ---------- */
/* fila: o level-up pendente, sempre com a conta dona (detail.conta do PASSE_NOVIDADE). Conta trocada
   descarta a fila, os avisos e a celebração aberta: nada de uma conta aparece para outra. */
let festa = null, fila = null, liberada = false;

function montarFesta() {
  const d = no('dialog', 'tp-passe-festa');
  d.id = 'tp-passe-festa';
  d.setAttribute('aria-labelledby', 'tp-passe-festa-titulo');
  d.setAttribute('aria-describedby', 'tp-passe-festa-sub');
  d.innerHTML = '<div class="tp-passe-festa__raios" aria-hidden="true"></div><div class="tp-passe-festa__confete" aria-hidden="true"></div>';
  const confete = d.querySelector('.tp-passe-festa__confete');
  for (let i = 0; i < 18; i++) { const c = no('i'); c.style.setProperty('--i', String(i)); confete.appendChild(c); }
  d.addEventListener('close', () => { d.remove(); festa = null; setTimeout(tentarFesta, 0); });
  return d;
}

function abrirFesta(f) {
  const s = passeEstado();
  if (!s?.authenticated) return;
  const d = montarFesta();
  d.dataset.de = String(f.de); d.dataset.para = String(f.para);
  if (f.boasVindas) d.dataset.boasVindas = '';
  const corpo = no('div', 'tp-passe-festa__corpo');
  const titulo = no('h2', 'tp-disp tp-passe-festa__titulo');
  titulo.id = 'tp-passe-festa-titulo';
  titulo.appendChild(no('span', 'tp-ital', tr(f.boasVindas ? 'PRESENTE DE BOAS-VINDAS' : 'SUBIU DE NÍVEL!')));
  const nivel = no('div', 'tp-passe-festa__nivel');
  const n = no('strong', 'tp-disp tp-passe-festa__n', String(f.de));
  n.setAttribute('aria-hidden', 'true');
  nivel.append(no('span', 'tp-rotulo', tr('NÍVEL')), n);
  const sub = no('p', 'tp-passe-festa__sub', f.boasVindas ? tr('Presente de boas-vindas: você começa no nível 10') : frase('passeFestaSubiu', f.para));
  sub.id = 'tp-passe-festa-sub';
  const resumoNiveis = resumirRecompensas(f.niveis.flatMap((l) => l.rewards));
  const premios = no('ul', 'tp-passe-festa__premios');
  premios.setAttribute('aria-label', tr('Recompensas liberadas'));
  const personagens = f.niveis.flatMap((l) => l.rewards.filter((r) => r.kind === 'character'));
  for (const r of personagens.slice(0, 6)) premios.appendChild(premio(r));
  const skin = f.niveis.flatMap((l) => l.rewards.filter((r) => r.kind === 'weapon_skin'))[0];
  if (skin) premios.appendChild(premio(skin));
  const itens = no('ul', 'tp-passe-festa__itens');
  const chip = (k, texto) => { const li = no('li', 'tp-chip tp-passe-festa__item', texto); li.dataset.resumo = k; itens.appendChild(li); };
  if (resumoNiveis.personagens.length) chip('personagens', frase('passeResumoPersonagens', resumoNiveis.personagens.length));
  if (resumoNiveis.skins.length) chip('skins', frase('passeResumoSkins', resumoNiveis.skins.length));
  if (resumoNiveis.moedas) chip('moedas', `T$ ${numero(resumoNiveis.moedas)}`);
  if (resumoNiveis.boost) chip('boost', frase('passeResumoBoost', resumoNiveis.boost));
  const estado = no('p', 'tp-passe-festa__estado');
  estado.setAttribute('role', 'status'); estado.setAttribute('aria-live', 'polite');
  const acoes = no('div', 'tp-passe-festa__acoes');
  const ver = no('button', 'tp-btn tp-btn--fantasma tp-passe-festa__ver', tr('VER PASSE'));
  ver.type = 'button'; ver.dataset.festaVer = '';
  ver.addEventListener('click', () => { d.close(); abrirPasse(); });
  if (s.claimable.length) {
    const tudo = no('button', 'tp-btn tp-btn--primario tp-passe-festa__tudo', frase('passeResgatarTudo', s.claimable.length));
    tudo.type = 'button'; tudo.dataset.festaTudo = '';
    tudo.addEventListener('click', async () => {
      if (resgatandoTodos()) return;
      tudo.disabled = true; ver.disabled = true;
      const out = await resgatarTodos({ aoProgresso: (p) => { if (p.nivel) { tudo.textContent = frase('passeResgatandoTudo', p.feitos + 1, p.total); estado.textContent = tudo.textContent; } } })
        .catch((e) => ({ niveis: [], recompensas: null, erro: e.message }));
      tudo.remove(); ver.disabled = false;
      estado.textContent = out.niveis.length ? frase('passeResumoNiveis', out.niveis.length) : mensagemErro(out.erro);
      premios.remove(); itens.remove();
      corpo.insertBefore(elementoResumo(out), acoes);
      ver.className = 'tp-btn tp-btn--primario tp-passe-festa__ver';
      ver.focus();
    });
    acoes.appendChild(tudo);
  }
  acoes.appendChild(ver);
  const fechar = no('button', 'tp-passe__fechar tp-passe-festa__fechar', '✕');
  fechar.type = 'button'; fechar.setAttribute('aria-label', tr('Fechar'));
  fechar.addEventListener('click', () => d.close());
  corpo.append(no('span', 'tp-rotulo tp-passe-festa__passe', tr('SESSÃO DA TRETA')), titulo, nivel, sub, premios, itens, estado, acoes);
  d.append(corpo, fechar);
  document.body.appendChild(d);
  festa = d;
  d.showModal();
  (acoes.querySelector('[data-festa-tudo]') || ver).focus();
  contar(n, f.de, f.para, 900);
  marcarNivelVisto(f.para);
}

/* Na vez: lobby à vista, sem outro <dialog> (o passe aberto fecha, VER PASSE reabre) e depois das
   novidades de entrada do lobby (anúncio do passe, Javaporcos), que chamam liberarFestaPasse(). */
export function tentarFesta() {
  if (!fila || festa || !liberada || !noLobby()) return;
  const abertos = [...document.querySelectorAll('dialog[open]')];
  if (abertos.some((d) => d.id !== 'tp-passe')) return;
  const s = passeEstado();
  if (!s?.authenticated || s.level < fila.para) { fila = null; return; }
  const f = fila;
  fila = null;
  if (passeAberto()) fecharPasse();
  abrirFesta(f);
}
export function liberarFestaPasse() { liberada = true; tentarFesta(); }

/* ---------- missão concluída: aviso por cima de tudo (popover no top layer, acima de <dialog>) ---------- */
let avisos = null;
const pendentes = [];
function caixaAvisos() {
  if (avisos) return avisos;
  avisos = no('div', 'tp-toasts tp-passe-avisos');
  avisos.setAttribute('role', 'status'); avisos.setAttribute('aria-live', 'polite');
  avisos.popover = 'manual';
  document.body.appendChild(avisos);
  return avisos;
}
function mostrarMissoes() {
  if (!pendentes.length || !(noLobby() || noResultado())) return;
  const caixa = caixaAvisos();
  for (const q of pendentes.splice(0)) {
    const t = no('div', 'tp-toast tp-passe-aviso');
    t.dataset.missao = q.id;
    t.append(no('strong', 'tp-num tp-passe-aviso__xp', frase('passeMissaoXp', numero(q.xp))),
      no('span', 'tp-passe-aviso__nome', tr(NOMES_MISSAO[q.id] || q.id)));
    caixa.appendChild(t);
    requestAnimationFrame(() => t.toggleAttribute('data-visivel', true));
    setTimeout(() => { t.removeAttribute('data-visivel'); setTimeout(() => { t.remove(); if (!caixa.childElementCount) caixa.hidePopover?.(); }, 400); }, 5200);
  }
  /* reabrir sobe a caixa para o topo do top layer, acima de um <dialog> aberto depois dela */
  try { if (caixa.matches(':popover-open')) caixa.hidePopover(); caixa.showPopover(); } catch { /* sem popover: fica no fluxo fixo */ }
}

/* ---------- pós-partida: "+N XP do passe" na tela de resultado ---------- */
function blocoResultado() {
  const raiz = document.querySelector('#match-end .tp-res__passe');
  if (!raiz) return;
  const s = passeEstado(), marco = passePartida();
  const ganho = s?.authenticated && marco ? s.xp - marco.xp : 0;
  if (!(ganho > 0) || !noResultado()) return;
  const anterior = Number(raiz.dataset.ganho || 0);
  if (anterior === ganho) return;
  raiz.dataset.ganho = String(ganho);
  const subiu = s.level > marco.level;
  const p = progressoNivel(s);
  const antes = subiu ? 0 : progressoNivel({ ...s, xp: marco.xp }).p;
  const xp = no('strong', 'tp-disp tp-res__passe-xp', frase('passeGanhoXp', numero(anterior)));
  const barra = no('div', 'tp-barra tp-res__passe-barra');
  barra.style.setProperty('--p', String(raiz.hidden ? antes : Number(raiz.style.getPropertyValue('--p-atual') || antes)));
  barra.appendChild(no('i'));
  barra.setAttribute('role', 'progressbar'); barra.setAttribute('aria-label', tr('XP do nível'));
  barra.setAttribute('aria-valuemin', '0'); barra.setAttribute('aria-valuemax', String(p.ate)); barra.setAttribute('aria-valuenow', String(p.de));
  const legenda = no('span', 'tp-res__passe-legenda', subiu ? frase('passeFestaSubiu', s.level)
    : s.nextLevelXp ? frase('passeFaltaProximo', numero(s.nextLevelXp - s.xp), s.level + 1) : tr('NÍVEL MÁXIMO'));
  const topo = no('div', 'tp-res__passe-topo');
  topo.append(no('span', 'tp-rotulo', tr('PASSE SESSÃO DA TRETA')), xp);
  raiz.replaceChildren(topo, barra, legenda);
  raiz.dataset.subiu = subiu ? '1' : '0';
  raiz.setAttribute('aria-label', `${frase('passeGanhoXp', numero(ganho))}. ${legenda.textContent}`);
  raiz.hidden = false;
  raiz.style.setProperty('--p-atual', String(p.p));
  contar(xp, anterior, ganho, 700, (v) => frase('passeGanhoXp', numero(v)));
  requestAnimationFrame(() => requestAnimationFrame(() => barra.style.setProperty('--p', String(p.p))));
}
function limparResultado() {
  const raiz = document.querySelector('#match-end .tp-res__passe');
  if (!raiz) return;
  raiz.hidden = true; raiz.replaceChildren(); delete raiz.dataset.ganho; raiz.style.removeProperty('--p-atual');
}

/* Conta trocou (login, logout): celebração aberta fecha, level-up e avisos pendentes da conta anterior
   somem, e o bloco do resultado (marco de partida da conta anterior) também. */
function esquecerConta() {
  fila = null;
  pendentes.length = 0;
  if (festa?.open) festa.close();
  if (avisos) { avisos.replaceChildren(); try { avisos.hidePopover(); } catch { /* já fechado */ } }
  limparResultado();
}

let ligado = false;
export function ligarFestaPasse() {
  if (ligado) return;
  ligado = true;
  document.addEventListener(PASSE_NOVIDADE, (e) => {
    const { subiu, missoes, conta } = e.detail || {};
    if (!conta || conta !== passeConta()) return;
    if (fila && fila.conta !== conta) fila = null;
    if (subiu) fila = fila ? { ...subiu, conta, de: Math.min(fila.de, subiu.de), boasVindas: fila.boasVindas || subiu.boasVindas,
      niveis: subiu.de <= fila.de ? subiu.niveis : [...fila.niveis, ...subiu.niveis.filter((l) => !fila.niveis.some((x) => x.n === l.n))] } : { ...subiu, conta };
    for (const q of missoes || []) if (!pendentes.some((x) => x.id === q.id)) pendentes.push({ ...q, conta });
    mostrarMissoes();
    tentarFesta();
  });
  document.addEventListener('cs-account-change', esquecerConta);
  document.addEventListener(PASSE_EVENTO, blocoResultado);
  document.addEventListener('cs-match-end', limparResultado);
  /* lobby de volta, resultado na tela, <dialog> fechado: tenta de novo o que ficou na fila. Observa só
     o atributo open (qualquer <dialog>), a classe das três telas e os filhos diretos do body: a HUD da
     partida mexe no DOM o tempo todo e não pode acordar isto. */
  const reavaliar = () => { if (fila) tentarFesta(); if (pendentes.length) mostrarMissoes(); if (passePartida()) blocoResultado(); };
  new MutationObserver(reavaliar).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  const telas = new MutationObserver(reavaliar);
  telas.observe(document.body, { childList: true });
  for (const id of ['main-menu', 'match-end', 'boot-splash']) { const el = $(id); if (el) telas.observe(el, { attributes: true, attributeFilter: ['class'] }); }
}
