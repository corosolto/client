/* /app: toda a fiação da landing de WebView (borda manda app/* para cá; ver src/pages/app.astro).
   Módulo separado para a régua testar a montagem do alvo externo — o bug que o estraga-codigo
   pegou (x-safari-https://https://…) nasceu de string concatenada fora de teste. */
export function alvoExterno(destino, plataforma) {
  const caminho = destino.host + destino.pathname + destino.search;
  if (plataforma === 'android')
    return `intent://${caminho}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(destino.href)};end`;
  /* iOS: x-safari-https://<autoridade><caminho> — UMA autoridade https, nunca duas. */
  return `x-safari-https://${caminho}`;
}

export function ligar({ documento = document, aoClicar = () => {}, agora = () => Date.now() } = {}) {
  const botao = documento.getElementById('app-abrir');
  const dica = documento.getElementById('app-dica');
  if (!botao || !dica) return;
  const ua = navigator.userAgent || '';
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const webview = /musical_ly|BytedanceWebview|TikTok|Instagram|FBAN|FBAV|FB_IAB|LinkedInApp|TwitterAndroid|Twitter for iPhone/i.test(ua) || (android && /\bwv\b/.test(ua));
  const destino = new URL('/', location.origin);
  new URLSearchParams(location.search).forEach((v, k) => { if (k !== 'jogo') destino.searchParams.set(k, v); });
  destino.searchParams.set('jogo', '1');
  botao.href = destino.pathname + destino.search;
  documento.getElementById('app-aqui').href = botao.href;
  /* JOGAR do topo e VOLTAR AO JOGO também apontam para a home: sem `jogo=1` a borda traria de volta. */
  documento.querySelectorAll('a[href^="/?"], a[href="/"]').forEach((a) => { a.href = botao.href; });
  if (!webview || (!android && !ios)) return;
  botao.addEventListener('click', (ev) => {
    ev.preventDefault();
    let saiu = false;
    const marca = () => { saiu = true; };
    documento.addEventListener('visibilitychange', marca, { once: true });
    window.addEventListener('pagehide', marca, { once: true });
    location.href = alvoExterno(destino, android ? 'android' : 'ios');
    aoClicar();
    setTimeout(() => { if (!saiu && !documento.hidden) dica.hidden = false; }, 1800);
  });
}

/* No navegador liga sozinho; importado pela régua (node), só as funções puras rodam. */
if (typeof document !== 'undefined') ligar();
