const startButton = document.getElementById('hud-record');
const hubButton = document.getElementById('hub-record');
const panel = document.getElementById('gameplay-recorder');
const status = document.getElementById('gameplay-recorder-status');
const detail = document.getElementById('gameplay-recorder-detail');
const stopButton = document.getElementById('gameplay-recorder-stop');
const preview = document.getElementById('gameplay-recorder-preview');
const consentLabel = document.getElementById('gameplay-recorder-consent');
const consentInput = document.getElementById('gameplay-recorder-consent-input');
const submitButton = document.getElementById('gameplay-recorder-submit');

let stream = null;
let recorder = null;
let chunks = [];
let timer = null;
let hideTimer = null;
let startedAt = 0;
let downloadUrl = null;
let busy = false;
let savedBlob = null;
let captureMap = 'partida';

const MAX_DURATION_MS = 120_000;
const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

function show(message, extra = '', active = false) {
  panel.hidden = false;
  status.textContent = message;
  detail.textContent = extra;
  panel.dataset.recording = active ? 'true' : 'false';
  stopButton.hidden = !active;
  consentLabel.hidden = active || !savedBlob;
  submitButton.hidden = active || !savedBlob;
  startButton?.setAttribute('aria-pressed', String(active));
  hubButton?.setAttribute('aria-pressed', String(active));
}

function stopTracks() {
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
}

function stop() {
  clearTimeout(timer);
  clearTimeout(hideTimer);
  if (recorder?.state === 'recording') recorder.stop();
  stopTracks();
}

function fileName() {
  const map = String(captureMap).replace(/[^a-z0-9_-]/gi, '-').slice(0, 32);
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, '-');
  return `coro-solto-${map}-${stamp}.${recorder?.mimeType?.includes('mp4') ? 'mp4' : 'webm'}`;
}

function finish() {
  clearTimeout(timer);
  clearTimeout(hideTimer);
  stopTracks();
  const duration = Math.round((Date.now() - startedAt) / 1000);
  if (!chunks.length) {
    show('GRAVAÇÃO FALHOU', 'Nenhum vídeo foi gerado. Tente outra vez.');
    busy = false;
    return;
  }
  const blob = new Blob(chunks, { type: recorder.mimeType });
  savedBlob = blob;
  chunks = [];
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(blob);
  preview.href = downloadUrl;
  preview.hidden = false;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName();
  link.textContent = `BAIXAR ${link.download}`;
  link.className = 'gameplay-recorder-download';
  panel.querySelector('.gameplay-recorder-download')?.remove();
  panel.append(link);
  show('TAKE SALVO', `${duration}s · ${(blob.size / 1048576).toFixed(1)} MB · arquivo só no seu dispositivo.`);
  link.click();
  busy = false;
}

async function start(event) {
  if (busy) { if (recorder?.state === 'recording') stop(); return; }
  if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
    show('GRAVAÇÃO INDISPONÍVEL', 'Use um navegador de desktop com captura de aba.');
    return;
  }
  busy = true;
  captureMap = event?.currentTarget === hubButton && document.getElementById('main-menu')?.dataset.hubTab === 'loja'
    ? 'loja-de-skins' : window.__game?._mapId || 'partida';
  savedBlob = null;
  preview.hidden = true;
  consentInput.checked = false;
  consentLabel.hidden = true;
  submitButton.hidden = true;
  panel.querySelector('.gameplay-recorder-download')?.remove();
  try {
    // A escolha da aba requer clique do jogador; não há permissão persistente.
    const selected = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser', frameRate: { ideal: 60 } },
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude',
    });
    const track = selected.getVideoTracks()[0];
    if (!track || track.getSettings().displaySurface !== 'browser') {
      selected.getTracks().forEach(t => t.stop());
      show('SELECIONE ESTA ABA', 'A gravação aceita somente uma aba do navegador. Clique de novo e escolha CORO SOLTO.');
      busy = false;
      return;
    }
    stream = selected;
    const mimeType = MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 16_000_000,
      audioBitsPerSecond: 192_000,
    });
    chunks = [];
    recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
    recorder.addEventListener('stop', finish, { once: true });
    recorder.addEventListener('error', () => {
      stopTracks();
      show('ERRO NA GRAVAÇÃO', 'O navegador interrompeu a captura. Confira o arquivo antes de usar.');
      busy = false;
    }, { once: true });
    track.addEventListener('ended', stop, { once: true });
    startedAt = Date.now();
    recorder.start(1000);
    const settings = track.getSettings();
    const audio = stream.getAudioTracks().length > 0 ? 'áudio da aba ativo' : 'sem áudio: ative o áudio da aba na próxima gravação';
    show('● GRAVANDO', `${settings.width || '?'}×${settings.height || '?'} · ${audio} · máximo 2 min · clique no ● do HUD para parar`, true);
    hideTimer = setTimeout(() => { if (recorder?.state === 'recording') panel.hidden = true; }, 4000);
    timer = setTimeout(stop, MAX_DURATION_MS);
  } catch (error) {
    stopTracks();
    show(error?.name === 'NotAllowedError' ? 'GRAVAÇÃO CANCELADA' : 'NÃO FOI POSSÍVEL GRAVAR',
      error?.name === 'NotAllowedError' ? 'Clique para tentar novamente quando quiser.' : 'Confira a permissão de captura do navegador.');
    busy = false;
  }
}

async function submit() {
  if (!savedBlob || !consentInput.checked || submitButton.disabled) {
    show('CONFIRME O ENVIO', 'Marque a autorização antes de enviar o take.');
    return;
  }
  submitButton.disabled = true;
  show('ENVIANDO TAKE', 'O arquivo original continua salvo no seu dispositivo.');
  try {
    const type = savedBlob.type.split(';')[0];
    const response = await fetch('/api/gameplay-upload', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ size: savedBlob.size, type, map: captureMap, consent: true }),
    });
    const target = await response.json();
    if (!response.ok) throw new Error(target.error || 'upload_unavailable');
    const form = new FormData();
    form.append('cacheControl', '0');
    form.append('', new File([savedBlob], fileName(), { type }), fileName());
    const upload = await fetch(target.uploadUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form });
    if (!upload.ok) throw new Error('upload_failed');
    savedBlob = null;
    consentLabel.hidden = true;
    submitButton.hidden = true;
    show('TAKE ENVIADO', 'Recebido na biblioteca privada para revisão. A publicação depende de seleção editorial.');
  } catch (error) {
    const messages = {
      login_required: 'Entre na conta para enviar. O arquivo local continua disponível.',
      storage_not_ready: 'A biblioteca remota ainda não está habilitada. O arquivo local continua disponível.',
      daily_limit: 'Limite de três envios por dia. O arquivo local continua disponível.',
    };
    show('ENVIO NÃO CONCLUÍDO', messages[error.message] || 'Tente novamente. O arquivo local continua disponível.');
  } finally {
    submitButton.disabled = false;
  }
}

startButton?.addEventListener('click', start);
hubButton?.addEventListener('click', start);
if (startButton) startButton.dataset.captureReady = 'true';
stopButton?.addEventListener('click', stop);
submitButton?.addEventListener('click', submit);
window.addEventListener('pagehide', () => {
  stopTracks();
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});
