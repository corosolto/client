const OFFLINE_STATIC_PATH = /\.(?:avif|css|glb|gif|ico|jpe?g|js|json|mp3|ogg|png|svg|wasm|wav|webmanifest|webm|webp|woff2?)$/i;
let offlineRegistration = null;
let offlineRevision = null;
const MAX_RECURSOS_PENDENTES = 600;
const recursosOfflinePendentes = new Set();

function recursosOfflineVisitados(entries = window.performance?.getEntriesByType?.('resource') || [], incluiRaiz = true) {
  const origin = window.location?.origin;
  const urls = new Set(incluiRaiz ? [origin ? `${origin}/` : '/'] : []);
  for (const entry of entries) {
    try {
      const url = new URL(entry.name, origin);
      if (url.origin === origin && OFFLINE_STATIC_PATH.test(url.pathname) && !url.pathname.startsWith('/api/')) {
        urls.add(url.href);
      }
    } catch {
      // Entrada inválida não impede o cache dos demais recursos visitados.
    }
  }
  return [...urls];
}
function workerDaRevisaoAtual() {
  const workers = [
    window.navigator.serviceWorker?.controller,
    offlineRegistration?.active,
  ];
  return workers.find((worker) => {
    if (!worker?.scriptURL) return false;
    try {
      return new URL(worker.scriptURL, window.location.origin).searchParams.get('v') === offlineRevision;
    } catch {
      return false;
    }
  });
}

function guardaRecursosOffline(urls = recursosOfflineVisitados()) {
  for (const url of urls) {
    recursosOfflinePendentes.delete(url);
    recursosOfflinePendentes.add(url);
    if (recursosOfflinePendentes.size > MAX_RECURSOS_PENDENTES) {
      recursosOfflinePendentes.delete(recursosOfflinePendentes.values().next().value);
    }
  }
  if (!offlineRegistration || !recursosOfflinePendentes.size) return;
  const worker = workerDaRevisaoAtual();
  if (!worker) return;
  worker.postMessage({
    type: 'CACHE_OFFLINE_RESOURCES',
    revision: offlineRevision,
    urls: [...recursosOfflinePendentes],
  });
  recursosOfflinePendentes.clear();
}

function observaRecursosOffline() {
  if (!window.PerformanceObserver) return;
  const observer = new window.PerformanceObserver((list) => {
    void guardaRecursosOffline(recursosOfflineVisitados(list.getEntries(), false));
  });
  observer.observe({ type: 'resource' });
}

function inicializaOffline() {
  if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
  const serviceWorker = window.navigator.serviceWorker;
  if (!serviceWorker) return;
  serviceWorker.addEventListener('controllerchange', () => void guardaRecursosOffline());
  observaRecursosOffline();
  window.addEventListener('load', () => void guardaRecursosOffline());
  offlineRevision = document.querySelector('script[data-pwa-rev]')?.dataset.pwaRev || null;
  const workerUrl = offlineRevision ? `/sw.js?v=${encodeURIComponent(offlineRevision)}` : '/sw.js';
  void serviceWorker.register(workerUrl, { scope: '/' }).then((registration) => {
    offlineRegistration = registration;
    return guardaRecursosOffline();
  }).catch(() => {
    // Sem service worker o jogo continua online; a instalação manual permanece disponível.
  });
}

inicializaOffline();

const panel = document.getElementById('pwa-install');
const action = document.getElementById('pwa-install-action');
const help = document.getElementById('pwa-install-help');
const english = document.documentElement.lang === 'en';
const copy = english ? {
  label: 'Install the web beta',
  add: 'HOW TO INSTALL',
  install: 'INSTALL GAME',
  ios: 'In Safari, tap Share and choose “Add to Home Screen”. If offered, turn on “Open as Web App”.',
  generic: 'Open your browser menu and choose “Install app” or “Add to Home Screen”.',
  failed: 'Installation did not finish. To try again, open your browser menu and choose “Install app”.',
} : {
  label: 'Instalação do beta web',
  add: 'COMO ADICIONAR',
  install: 'INSTALAR JOGO',
  ios: 'No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Se aparecer, ative “Abrir como App”.',
  generic: 'Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.',
  failed: 'A instalação não foi concluída. Para tentar de novo, use o menu do navegador e escolha “Instalar app”.',
};

if (panel && action && help) {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const installed = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const appleMobile = /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  let installPrompt = null;

  if (touch && !installed) {
    panel.hidden = false;
    panel.setAttribute('aria-label', copy.label);
    if (appleMobile) {
      action.textContent = copy.add;
      help.textContent = copy.ios;
    } else {
      action.textContent = copy.add;
      help.textContent = copy.generic;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
      action.textContent = copy.install;
      help.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      panel.hidden = true;
      void guardaRecursosOffline();
    });

    action.addEventListener('click', async () => {
      if (!installPrompt) {
        help.hidden = !help.hidden;
        return;
      }

      const prompt = installPrompt;
      installPrompt = null;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === 'accepted') {
          panel.hidden = true;
          return;
        }
      } catch {
        // A instalação ainda pode ser iniciada pelo menu do navegador.
      }
      help.textContent = appleMobile ? copy.ios : copy.failed;
      help.hidden = false;
      action.textContent = copy.add;
    });
  }
}
