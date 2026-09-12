import { MAP_PREVIEW_MEDIA } from './map_preview_media.js';
const clips = Object.fromEntries(Object.entries(MAP_PREVIEW_MEDIA).map(([id, media]) => [id, `/img/map-previews/${id}.mp4?v=${media.video}`]));
export const previewRevision = id => MAP_PREVIEW_MEDIA[id] ? `-${MAP_PREVIEW_MEDIA[id].poster}` : '';
const bindings = new WeakMap();
let active = null;
function fitVideo() {
  const video=active?.video, img=active?.host.querySelector('img');
  if (!video || !img) return;
  Object.assign(video.style, { width:`${img.clientWidth}px`, height:`${img.clientHeight}px`,
    left:`${img.offsetLeft}px`, top:`${img.offsetTop}px`, clipPath:getComputedStyle(img).clipPath });
}
const sizeObserver = new ResizeObserver(fitVideo);

export function stopMapPreviews() {
  if (!active) return;
  sizeObserver.disconnect();
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
    if (!url || event.pointerType === 'touch' || (event.type === 'focusin' && !event.target.matches(':focus-visible')) || document.hidden ||
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
    const video = state.video;
    fitVideo();
    sizeObserver.observe(host);
    const img=host.querySelector('img');
    if(img) sizeObserver.observe(img);
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
  host.addEventListener('focusout', event => { if (!host.contains(event.relatedTarget)) stop(); });
}

document.addEventListener('visibilitychange', () => { if (document.hidden) stopMapPreviews(); });
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', stopMapPreviews);
window.addEventListener('pagehide', stopMapPreviews);
