const panel = document.getElementById('pwa-install');
const action = document.getElementById('pwa-install-action');
const help = document.getElementById('pwa-install-help');

if (panel && action && help) {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const installed = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  const appleMobile = /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  let installPrompt = null;

  if (touch && !installed) {
    panel.hidden = false;
    if (appleMobile) {
      action.textContent = 'COMO ADICIONAR';
      help.textContent = 'No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Se aparecer, ative “Abrir como App”.';
    } else {
      action.textContent = 'COMO ADICIONAR';
      help.textContent = 'Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.';
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
      action.textContent = 'INSTALAR JOGO';
      help.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      panel.hidden = true;
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
      help.textContent = appleMobile
        ? 'No Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.'
        : 'A instalação não foi concluída. Para tentar de novo, use o menu do navegador e escolha “Instalar app”.';
        help.hidden = false;
        action.textContent = 'COMO ADICIONAR';
    });
  }
}
