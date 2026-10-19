/* Splash Treta Pop (tela 01). Não carrega nada: espelha sinais que o boot já produz.
   Cada etapa só fica marcada com o sinal real (régua: tools/eval/ui-v3-splash.mjs). */
import { tr } from './i18n.js';

const $ = (id) => document.getElementById(id);

function nickSalvo() {
  try { return (localStorage.getItem('awpbr_nick') || '').trim(); } catch { return ''; }
}

function linhaConvidado(alvo) {
  const nick = nickSalvo();
  const logado = ($('hub-account-login')?.dataset.state || 'guest') !== 'guest';
  const acao = (texto, id) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = texto;
    b.addEventListener('click', () => $(id)?.click());
    return b;
  };
  const nome = document.createElement('b');
  nome.textContent = nick || tr('convidado');
  alvo.replaceChildren(`${tr('Você entra como')} `, nome, ' · ', acao(tr(nick ? 'trocar nick' : 'escolher nick'), 'hub-profile'));
  if (!logado) alvo.append(' · ', acao(tr('já tenho conta'), 'hub-account-login'));
  delete alvo.dataset.vazio;
}

export function ligarSplashV3() {
  const raiz = document.querySelector('.tp-splash');
  if (!raiz) return;
  const jogar = $('tp-splash-jogar');
  const som = $('tp-splash-som');
  const musica = $('hub-music-toggle');
  const escreve = (id, texto) => { const e = $(id); if (e && texto && e.textContent !== texto) e.textContent = texto; };
  const marca = (etapa, ok) => raiz.querySelector(`[data-etapa="${etapa}"]`)?.toggleAttribute('data-feito', !!ok);

  const sincroniza = () => {
    const pct = $('boot-pct')?.textContent || '0%';
    escreve('tp-splash-pct', pct);
    raiz.style.setProperty('--p', String((parseInt(pct, 10) || 0) / 100));
    escreve('tp-splash-status', $('boot-status')?.textContent);
    const pronto = !$('splash-enter')?.classList.contains('hidden');
    marca('lobby', pronto);
    marca('personagem', $('char-preview')?.dataset.glb === '1');
    marca('audio', window.__csMusicaPronta);
    /* com o JOGAR liberado, o que ainda carrega não segura a entrada: diz isso em vez de parecer travado */
    for (const li of raiz.querySelectorAll('[data-etapa]')) li.toggleAttribute('data-fundo', pronto && !li.hasAttribute('data-feito'));
    /* Música desligada nos ajustes não carrega faixa: a etapa sairia "carregando" para sempre. */
    const ligada = musica?.getAttribute('aria-pressed') !== 'false';
    raiz.querySelector('[data-etapa="audio"]').hidden = !ligada;
    if (som && musica) {
      som.setAttribute('aria-pressed', musica.getAttribute('aria-pressed') || 'true');
      som.setAttribute('aria-label', musica.getAttribute('aria-label') || 'Música do menu');
      som.title = som.getAttribute('aria-label');
      delete som.dataset.vazio;
    }
    const ver = $('splash-ver')?.textContent;
    if (ver) { escreve('tp-splash-ver', ver); delete $('tp-splash-ver').dataset.vazio; }
    if (pronto && jogar.disabled) {
      jogar.disabled = false;
      linhaConvidado($('tp-splash-convidado'));
      /* foco automático sem anel; quem tirar o foco daqui com o teclado ganha o anel de volta */
      jogar.dataset.autoFoco = '';
      jogar.addEventListener('blur', () => delete jogar.dataset.autoFoco, { once: true });
      jogar.focus({ preventScroll: true });
    }
  };

  /* Só as fontes: observar a subárvore do splash pegaria as próprias escritas daqui. */
  const observa = new MutationObserver(sincroniza);
  for (const id of ['boot-pct', 'boot-status', 'splash-ver']) { const e = $(id); if (e) observa.observe(e, { childList: true, characterData: true, subtree: true }); }
  const fontes = [['splash-enter', 'class'], ['char-preview', 'data-glb'], ['hub-music-toggle', 'aria-pressed']];
  for (const [id, attr] of fontes) { const e = $(id); if (e) observa.observe(e, { attributes: true, attributeFilter: [attr] }); }
  window.addEventListener('cs-musica-pronta', sincroniza);
  som?.addEventListener('click', () => musica?.click());
  sincroniza();
}
