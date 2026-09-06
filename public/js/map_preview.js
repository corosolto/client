import { SERTAO_PREVIEW } from './map_preview_media.js';
const clips = Object.freeze({ velho_oeste: `/img/map-previews/velho_oeste.mp4?v=${SERTAO_PREVIEW.video}` });
export const previewRevision = id => id === 'velho_oeste' ? `-${SERTAO_PREVIEW.poster}` : '';
const bindings = new WeakMap();
let active = null;

export function stopMapPreviews() {
  if (!active) return;
  active.token++;
  active.video?.pause();
  active.video?.classList.remove('playing');
  active = null;
}

export function bindMapPreview(host, mapId) {
  if (!host) return;
  const previous = bindings.get(host);
  if (previous) {
    previous.mapId = mapId;
    if (active === previous) stopMapPreviews();
    return;
  }
  const state = { host, mapId, video: null, token: 0 };
  bindings.set(host, state);
  host.classList.add('map-preview-host');
  const stop = () => { if (active === state) stopMapPreviews(); };
  const start = async event => {
    const url = clips[state.mapId];
    if (!url || event.pointerType === 'touch' || document.hidden ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) return;
    if (active === state) return;
    stopMapPreviews();
    active = state;
    const token = ++state.token;
    if (!state.video) {
      const video = document.createElement('video');
      video.className = 'map-hover-video';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-hidden', 'true');
      video.addEventListener('error', stop);
      host.append(video);
      state.video = video;
    }
    const video = state.video, img = host.querySelector('img');
    if (img) Object.assign(video.style, {
      width: `${img.clientWidth}px`, height: `${img.clientHeight}px`,
      left: `${img.offsetLeft}px`, top: `${img.offsetTop}px`,
    });
    if (video.getAttribute('src') !== url) video.src = url;
    video.currentTime = 0;
    try {
      const playing = video.play();
      await playing.then(() => {
        if (active === state && token === state.token) video.classList.add('playing');
        else if (active !== state) video.pause();
      });
    } catch { if (active === state && token === state.token) stop(); }
  };
  host.addEventListener('pointerenter', start);
  host.addEventListener('pointerleave', stop);
  host.addEventListener('focusin', start);
  host.addEventListener('focusout', stop);
}

document.addEventListener('visibilitychange', () => { if (document.hidden) stopMapPreviews(); });
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stopMapPreviews);
window.addEventListener('pagehide', stopMapPreviews);
