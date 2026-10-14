/* Contagem agregada sem identificador (backend /api/count): só enums e faixas, sem cookie nem storage,
   independente do consentimento. Carrega antes do main.js (index.astro). Régua: tools/eval/contagem-check.mjs. */
import { apiUrl } from './apibase.js';
import { VERSION } from './version.js';

const UMA_VEZ = new Set(['page_view', 'game_loaded', 'splash_enter', 'boot_error', 'login_prompt_shown', 'login_prompt_dismissed', 'login_prompt_provider_click', 'session_end']);

export const faixaDuracao = (ms) => {
  const min = ms / 60000;
  return min < 1 ? 'lt1' : min < 5 ? '1-5' : min < 15 ? '5-15' : min < 60 ? '15-60' : 'gt60';
};
export const faixaPartidas = (n) => (n <= 0 ? '0' : n === 1 ? '1' : n <= 3 ? '2-3' : '4+');

/* Fábrica para a régua testar sem navegador; o jogo usa a instância padrão lá embaixo. */
export function criarContagem({ enviar, agora, versao = VERSION, desligado = false }) {
  const enviados = new Set();
  let partidas = 0;
  let ligado = !desligado;
  const manda = (event, campos = {}) => {
    if (!ligado) return false;
    if (UMA_VEZ.has(event)) {
      if (enviados.has(event)) return false;
      enviados.add(event);
    }
    try { enviar(JSON.stringify({ event, version: versao, ...campos })); } catch { /* contagem nunca quebra o jogo */ }
    return true;
  };
  const partida = (campos) => ({
    map: typeof campos?.map === 'string' ? campos.map : undefined,
    mode: campos?.mode === 'ctf' ? 'ctf' : 'rounds',
    game: campos?.game === 'mp' ? 'mp' : 'sp',
  });
  return {
    evento: (event) => manda(event),
    partidaIniciada(campos) { if (manda('match_start', partida(campos))) partidas++; },
    partidaTerminada(campos) { manda('match_end', partida(campos)); },
    entrouNoMp(campos) { manda('mp_join', { map: typeof campos?.map === 'string' ? campos.map : undefined, mode: campos?.mode === 'ctf' ? 'ctf' : 'rounds' }); },
    fimDaSessao() { manda('session_end', { dur: faixaDuracao(agora()), matches: faixaPartidas(partidas) }); },
    desligar() { ligado = false; },
  };
}

/* Envio: fetch keepalive sem credencial e em text/plain (sem preflight CORS). Falhou, some:
   sem nova tentativa, sem fila, sem storage. */
const enviarDeVerdade = (corpo) => {
  void fetch(apiUrl('/api/count'), {
    method: 'POST', keepalive: true, credentials: 'omit', cache: 'no-store',
    headers: { 'content-type': 'text/plain' }, body: corpo,
  }).catch(() => {});
};
const automatizado = (() => {
  try {
    const p = new URLSearchParams(location.search);
    return navigator.webdriver === true || p.get('debug') === '1' || p.get('oficina') === '1';
  } catch { return true; }
})();

export const contagem = criarContagem({ enviar: enviarDeVerdade, agora: () => performance.now(), desligado: automatizado });

/* Ganchos do script inline do index.astro (watchdog de boot), que não importa módulos. */
try { window.__csConta = (event) => contagem.evento(event); } catch { /* sem window (harness) */ }

contagem.evento('page_view');
/* Fim de sessão: o primeiro pagehide OU a primeira vez que a aba some (no celular o pagehide
   nem sempre chega). Quem troca de aba e volta encerra a sessão ali: é uma por página. */
try {
  addEventListener('pagehide', () => contagem.fimDaSessao());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') contagem.fimDaSessao(); });
} catch { /* sem DOM (harness) */ }
