import { MAP_PREVIEWS } from './map_preview_assets.js';

let active = null;
const bound = new WeakSet();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export const mapPreviewPoster = (id, version) => MAP_PREVIEWS[id]?.poster || `/img/map-previews/${id}.jpg?v=${version}`;

export function stopMapPreview() {
  if (!active) return;
  const { video, card } = active;
  active = null;
  card.classList.remove('preview-playing');
  video.pause();
  video.removeAttribute('src');
  video.load();
  video.remove();
}

function startPreview(card) {
  const asset = MAP_PREVIEWS[card.dataset.id];
  if (!asset?.video || reduced.matches || navigator.connection?.saveData || document.hidden) return;
  if (active?.card === card) return;
  stopMapPreview();
  const video = document.createElement('video');
  const entry = { card, video };
  active = entry;
  video.className = 'ms-thumb-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('aria-hidden', 'true');
  video.addEventListener('playing', () => { if (active === entry) card.classList.add('preview-playing'); });
  video.addEventListener('error', () => { if (active === entry) stopMapPreview(); });
  card.append(video);
  video.src = asset.video;
  video.play().catch(() => { if (active === entry) stopMapPreview(); });
}

export function bindMapPreviews(strip) {
  if (bound.has(strip)) return;
  bound.add(strip);
  strip.addEventListener('pointerover', event => {
    const card = event.target.closest('.ms-thumb');
    if (card && event.pointerType === 'mouse' && !card.contains(event.relatedTarget)) startPreview(card);
  });
  strip.addEventListener('pointerout', event => {
    if (active?.card.contains(event.target) && !active.card.contains(event.relatedTarget)) stopMapPreview();
  });
  strip.addEventListener('focusin', event => {
    const card = event.target.closest('.ms-thumb');
    if (card?.matches(':focus-visible')) startPreview(card);
  });
  strip.addEventListener('focusout', event => {
    if (active?.card.contains(event.target)) stopMapPreview();
  });
}

document.addEventListener('visibilitychange', () => { if (document.hidden) stopMapPreview(); });
reduced.addEventListener('change', () => { if (reduced.matches) stopMapPreview(); });
