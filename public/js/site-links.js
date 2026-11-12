// Guias no lobby; as mesmas URLs continuam navegáveis sem JavaScript.
import { LANG, resolveGeoLang } from './i18n.js';
import { estadoDaUrl } from './rotas.js';
await resolveGeoLang();
const pairs = { '/personagens': '/characters', '/como-jogar': '/how-to-play', '/armas': '/weapons', '/mapas': '/maps', '/sobre': '/about', '/changelog': '/whats-new' };
if (LANG === 'en') {
  for (const link of document.querySelectorAll('.hub-link-grid a, a.hub-changelog, .hub-content-tabs a')) {
    const translated = pairs[link.getAttribute('href')];
    if (translated) link.setAttribute('href', translated);
  }
  for (const node of document.querySelectorAll('#game-faq [data-en]')) node.textContent = node.dataset.en;
  for (const node of document.querySelectorAll('[data-content-en]')) node.textContent = node.dataset.contentEn;
}
const tabs = [...document.querySelectorAll('.hub-content-tabs [role="tab"]')];
const overview = document.getElementById('hub-about-overview');
const panel = document.getElementById('hub-about-content');
const frame = document.getElementById('hub-guide-frame');
const loading = panel?.querySelector('[role="status"]');
let observer;
let currentUrl = frame?.src || undefined;
let focusOnLoad = false;
const contentPaths = new Set([...Object.keys(pairs), ...Object.values(pairs), '/mapa', '/apoie']);
// Páginas internas sem subtab própria (documentos legais, clãs) também abrem no lobby.
const documents = { '/privacidade': 'PRIVACIDADE', '/termos': 'TERMOS DE USO', '/excluir-dados': 'EXCLUIR DADOS', '/regras-de-uso': 'REGRAS DE USO', '/clans': 'CLÃS' };
const documentGuide = pathname => (documents[pathname] ? pathname.slice(1) : null);
for (const pathname of Object.keys(documents)) contentPaths.add(pathname);
function openFrame(href, title) {
  const url = new URL(href);
  url.searchParams.set('embed', '1');
  if (url.href === currentUrl) return;
  observer?.disconnect();
  frame.hidden = true;
  loading.hidden = false;
  loading.textContent = LANG === 'en' ? 'LOADING GUIDE…' : 'CARREGANDO GUIA…';
  frame.title = title;
  currentUrl = url.href;
  frame.src = url.href;
}
/* Guia aberto mora no caminho: /guia/mapas (public/js/rotas.js, ADR 0008). Clique empilha,
   para o voltar do navegador refazer o guia anterior. */
function guideUrl(guide) {
  const pageUrl = new URL(location.href);
  pageUrl.pathname = guide && guide !== 'overview' ? `/guia/${guide}` : '/guia';
  for (const key of ['secao', 'guia', 'janela', 'origem']) pageUrl.searchParams.delete(key);
  return pageUrl;
}
function syncGuide(guide) {
  const pageUrl = guideUrl(guide);
  if (pageUrl.href !== location.href) history.pushState(history.state, '', pageUrl);
}
const guideFromUrl = () => estadoDaUrl(location.href)?.guia || null;
function select(tab, syncUrl = true) {
  const general = tab.dataset.guide === 'overview';
  if (syncUrl) syncGuide(tab.dataset.guide);
  for (const item of tabs) {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  }
  overview.hidden = !general;
  panel.hidden = general;
  if (general) return;
  panel.removeAttribute('aria-label');
  panel.setAttribute('aria-labelledby', tab.id);
  openFrame(tab.href, tab.textContent.trim());
}
function selectDocument(pathname, syncUrl = true) {
  if (syncUrl) syncGuide(documentGuide(pathname));
  for (const item of tabs) {
    item.setAttribute('aria-selected', 'false');
    item.tabIndex = item === tabs[0] ? 0 : -1;
  }
  overview.hidden = true;
  panel.hidden = false;
  panel.removeAttribute('aria-labelledby');
  panel.setAttribute('aria-label', documents[pathname]);
  openFrame(new URL(pathname, location.origin).href, documents[pathname]);
}
for (const tab of tabs) {
  tab.addEventListener('click', event => { event.preventDefault(); select(tab); });
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab);
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    tabs[next].focus();
    select(tabs[next]);
  });
}
frame?.addEventListener('load', () => {
  const doc = frame.contentDocument;
  if (!doc?.body) return;
  currentUrl = frame.contentWindow.location.href;
  loading.hidden = true;
  frame.hidden = false;
  if (focusOnLoad) { focusOnLoad = false; frame.focus(); }
  const resize = () => {
    const height = `${Math.ceil(doc.body.getBoundingClientRect().height) + 2}px`;
    if (frame.style.height !== height) requestAnimationFrame(() => { frame.style.height = height; });
  };
  observer?.disconnect();
  observer = new ResizeObserver(resize);
  observer.observe(doc.body);
  resize();
  doc.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    // mailto:, tel: e afins ficam com o navegador; origin "null" não é outro site.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    const current = new URL(frame.contentWindow.location.href);
    if (url.hash && url.pathname === current.pathname && url.origin === current.origin) {
      const target = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) {
        event.preventDefault();
        const top = window.scrollY + frame.getBoundingClientRect().top + target.getBoundingClientRect().top;
        window.scrollTo({ top: Math.max(0, top - 16), behavior: 'smooth' });
        return;
      }
    }
    if (url.origin !== location.origin) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return;
    }
    const hubState = url.pathname === '/' || !contentPaths.has(url.pathname) ? estadoDaUrl(url.href) : null;
    if (hubState) {
      // /?secao=... ou /comunidade, /loja...: vai para a seção pedida; o roteador do hub (main.js) cuida da comunidade.
      event.preventDefault();
      const section = hubState.secao;
      if (section === 'comunidade') {
        const proxy = Object.assign(document.createElement('a'), { href: url.href, hidden: true });
        document.getElementById('hub-ui').append(proxy);
        proxy.click();
        proxy.remove();
        return;
      }
      const hubTab = section && [...document.querySelectorAll('.hub-tabs [data-hub-tab]')].find(item => item.dataset.hubTab === section);
      (hubTab ?? document.querySelector('.hub-tabs [data-hub-tab="jogar"]'))?.click();
    } else if (contentPaths.has(url.pathname) || url.pathname.startsWith('/grupos/') || url.pathname.startsWith('/clans/')) {
      if (LANG === 'en' && pairs[url.pathname]) url.pathname = pairs[url.pathname];
      url.searchParams.set('embed', '1');
      link.href = url.href;
    }
  });
});
// Cards de guias e changelog abrem a subtab correspondente dentro do lobby.
for (const link of document.querySelectorAll('.hub-link-grid a, a.hub-changelog, #hub-ui a[href="/mapa"], .menu-footer a, .hub-footer a')) {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || new URLSearchParams(location.search).get('home') === 'legacy') return;
    const url = new URL(link.href);
    if (LANG === 'en' && pairs[url.pathname]) url.pathname = pairs[url.pathname];
    const tab = tabs.find(item => item.href === url.href);
    if (!tab && !documentGuide(url.pathname)) return;
    event.preventDefault();
    document.querySelector('.hub-tabs [data-hub-tab="sobre"]')?.click();
    if (!tab) { focusOnLoad = true; selectDocument(url.pathname); return; }
    select(tab);
    tab.focus();
  });
}

const requested = guideFromUrl();
const initialTab = tabs.find(tab => tab.dataset.guide === requested);
if (initialTab) select(initialTab, false);
else if (documents[`/${requested}`]) selectDocument(`/${requested}`, false);
window.addEventListener('popstate', () => {
  const guide = guideFromUrl();
  if (documents[`/${guide}`]) return selectDocument(`/${guide}`, false);
  select(tabs.find(tab => tab.dataset.guide === guide) ?? tabs[0], false);
});
