/* Anúncio do passe: uma vez por versão, com a temporada no ar, sem empilhar <dialog> (molde do
   javaporcos_novidade.js); modal_view só com consentimento. Régua: tools/eval/passe-check.mjs. */
import { tr } from './i18n.js';
import { passeEstado, passeAnuncioDevido, marcarAnuncio, registrarEventoPasse } from './passe.js';

export const PASSE_ARTE = '/img/passe/sessao-da-treta-s1.svg';

const embutido = () => {
  try { return new URLSearchParams(location.search).get('embed') === '1' || document.documentElement.dataset.embedded === 'true'; } catch { return false; }
};

function no(tag, cls = '', textoNo = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (textoNo) e.textContent = textoNo;
  return e;
}

/* abrirPasse: tela do passe (conta). entrar: convite de login (visitante). */
export function anunciarPasse({ abrirPasse = () => {}, entrar = () => {} } = {}) {
  const status = passeEstado();
  if (!passeAnuncioDevido({ status, embutido: embutido(), dialogoAberto: Boolean(document.querySelector('dialog[open]')) })) return null;
  const anterior = document.activeElement;
  const dialog = no('dialog', 'tp-passe-anuncio');
  dialog.id = 'passe-anuncio';
  dialog.setAttribute('aria-labelledby', 'passe-anuncio-titulo');
  dialog.setAttribute('aria-describedby', 'passe-anuncio-texto');
  const arte = no('img', 'tp-passe-anuncio__arte');
  arte.src = PASSE_ARTE; arte.alt = tr('Sessão da Treta, temporada 1: o passe grátis da facção Fora do Ar'); arte.decoding = 'async';
  const corpo = no('div', 'tp-passe-anuncio__corpo');
  const titulo = no('h2', 'tp-disp tp-passe-anuncio__titulo');
  titulo.id = 'passe-anuncio-titulo';
  titulo.appendChild(no('span', 'tp-ital', tr('SESSÃO DA TRETA')));
  const textoP = no('p', 'tp-passe-anuncio__texto', tr('Passe grátis com 15 níveis: 30 personagens da facção Fora do Ar, skins de arma, T$ e bônus de XP. Jogue partidas e cumpra missões para subir de nível.'));
  textoP.id = 'passe-anuncio-texto';
  const nota = no('p', 'tp-passe-anuncio__nota', tr(status.authenticated ? 'Seu progresso já está contando.' : 'Para ganhar XP e resgatar as recompensas, entre na sua conta.'));
  const acoes = no('div', 'tp-passe-anuncio__acoes');
  const cta = no('button', 'tp-btn tp-btn--primario tp-passe-anuncio__cta', tr(status.authenticated ? 'VER O PASSE' : 'ENTRAR E JOGAR O PASSE'));
  cta.type = 'button'; cta.dataset.passeCta = status.authenticated ? 'passe' : 'login';
  const depois = no('button', 'tp-btn tp-btn--fantasma tp-passe-anuncio__depois', tr('AGORA NÃO'));
  depois.type = 'button'; depois.dataset.passeFechar = '';
  acoes.append(cta, depois);
  corpo.append(no('span', 'tp-chip tp-chip--novo', tr('TEMPORADA 1 · PASSE GRÁTIS')), titulo, textoP, nota, acoes);
  dialog.append(arte, corpo);
  const fechar = () => { dialog.close(); dialog.remove(); if (anterior?.isConnected) anterior.focus?.(); };
  /* decide no clique: a conta pode ter entrado enquanto o anúncio estava aberto */
  cta.addEventListener('click', () => { fechar(); if (passeEstado()?.authenticated) abrirPasse(); else entrar(); });
  depois.addEventListener('click', fechar);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); });
  document.body.append(dialog);
  dialog.showModal();
  cta.focus();
  marcarAnuncio();
  registrarEventoPasse('modal_view');
  return dialog;
}
