import { privacyChoice } from './privacy-preferences.js';

const ETAPAS = Object.freeze({
  page_view: 'visit',
  match_start: 'player',
  match_end: 'finisher',
});

const slug = (value, max) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);

export function atribuirVisita({ search = '', referrer = '' } = {}) {
  let params;
  try { params = new URLSearchParams(search); } catch { params = new URLSearchParams(); }
  const utmSource = slug(params.get('utm_source'), 80);
  const utmMedium = slug(params.get('utm_medium'), 80);
  const campaign = slug(params.get('utm_campaign'), 120);
  if (utmSource) return { source: utmSource, medium: utmMedium || 'campaign', campaign };
  if (params.has('fbclid')) return { source: 'meta', medium: 'paid-social', campaign };
  if (params.has('gclid')) return { source: 'google', medium: 'paid-search', campaign };
  if (params.has('msclkid')) return { source: 'bing', medium: 'paid-search', campaign };
  if (params.has('ttclid')) return { source: 'tiktok', medium: 'paid-social', campaign };
  let host = '';
  try { host = slug(new URL(referrer).hostname, 80); } catch { /* acesso direto */ }
  return host ? { source: host, medium: 'referral', campaign: '' } : { source: 'direct', medium: 'direct', campaign: '' };
}

const estadoDoConsentimento = (choice) => choice?.analytics === true ? 'granted' : choice?.analytics === false ? 'denied' : 'unknown';

export function criarJogadoresUnicos({ enviar, escolha = privacyChoice, aquisicao }) {
  let visitou = false;
  let ultimaVersao = '';
  const manda = (stage, version) => {
    const attr = aquisicao();
    try {
      enviar(JSON.stringify({
        stage,
        consent: estadoDoConsentimento(escolha()),
        source: attr.source,
        medium: attr.medium,
        campaign: attr.campaign,
        version,
      }));
    } catch { /* medição nunca interrompe o jogo */ }
  };
  return {
    evento(event, version = '') {
      const stage = ETAPAS[event];
      if (!stage) return false;
      ultimaVersao = version;
      if (stage === 'visit') visitou = true;
      manda(stage, version);
      return true;
    },
    atualizaEscolha() { if (visitou) manda('visit', ultimaVersao); },
  };
}

const enviarDeVerdade = (body) => {
  void fetch('/api/unique', {
    method: 'POST', keepalive: true, credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'text/plain' }, body,
  }).catch(() => {});
};
const aquisicaoAtual = () => atribuirVisita({ search: location.search, referrer: document.referrer });
export const jogadoresUnicos = criarJogadoresUnicos({ enviar: enviarDeVerdade, escolha: privacyChoice, aquisicao: aquisicaoAtual });
try { window.addEventListener('cs-privacy-change', () => jogadoresUnicos.atualizaEscolha()); } catch { /* sem DOM na régua */ }
