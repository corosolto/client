// Botão único de compartilhar (docs/adr/0008-rotas-fixas.md): Web Share no celular, cópia do link
// no resto. Devolve o que aconteceu para o botão dizer em português.

/** Origem dos links compartilhados: corosol.to em produção; same-origin em dev e previews. */
export function origemCompartilhamento(loc = globalThis.location) {
  const origem = typeof loc?.origin === 'string' ? loc.origin : '';
  const host = typeof loc?.hostname === 'string' ? loc.hostname.toLowerCase() : (() => {
    try { return new URL(origem).hostname.toLowerCase(); } catch { return ''; }
  })();
  if (host === 'corosolto.com.br' || host.endsWith('.corosolto.com.br')) return globalThis.window?.__SHARE_ORIGIN || 'https://corosol.to';
  return origem || 'https://www.corosolto.com.br';
}


/** Link com a origem do compartilhamento, para o funil saber de onde veio a visita. */
export function linkCompartilhavel(caminho, ponto, origem = origemCompartilhamento()) {
  const url = new URL(caminho, origem);
  url.searchParams.set('utm_source', 'compartilhar');
  url.searchParams.set('utm_medium', ponto);
  return url.href;
}

/** Texto do fim de partida. Curto: vai junto com o link no zap. */
export function textoDaPartida({ venceu, mapa }) {
  return `${venceu ? 'Ganhei' : 'Perdi'} uma treta em ${mapa} no CORO SOLTO. Bora jogar?`;
}

/** Web Share quando há; senão copia o link. Devolve 'compartilhado', 'cancelado', 'copiado' ou 'manual'. */
export async function compartilhar({ titulo, texto, url }, nav = globalThis.navigator) {
  const dados = { title: titulo, text: texto, url };
  if (typeof nav?.share === 'function' && (typeof nav.canShare !== 'function' || nav.canShare(dados))) {
    try { await nav.share(dados); return 'compartilhado'; }
    catch (erro) { if (erro?.name === 'AbortError') return 'cancelado'; }
  }
  try { await nav.clipboard.writeText(url); return 'copiado'; }
  catch { return 'manual'; }
}

const AVISO = { compartilhado: 'COMPARTILHADO', copiado: 'LINK COPIADO', manual: 'COPIE O LINK' };

/** Liga um botão: ao clicar compartilha e troca o rótulo por 1,6 s. `dados` é função: lê a tela na hora do clique. */
export function ligarCompartilhar(botao, dados, { aoFalhar } = {}) {
  if (!botao) return;
  botao.onclick = async () => {
    const atual = dados();
    const resultado = await compartilhar(atual);
    if (resultado === 'manual') aoFalhar?.(atual.url);
    const aviso = AVISO[resultado];
    if (!aviso) return;
    const antes = botao.dataset.rotulo || botao.textContent;
    botao.dataset.rotulo = antes;
    botao.textContent = aviso;
    setTimeout(() => { botao.textContent = antes; }, 1600);
  };
}
