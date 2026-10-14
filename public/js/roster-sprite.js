import { startVisibleRotation } from './media-rotation.js';

const picture = document.querySelector('[data-roster-sprite]');
if (picture) {
  const image = picture.querySelector('img');
  const motion = picture.querySelector('source[media]');
  const animated = picture.querySelector('source[type]');
  let index = 0;
  try { index = Math.max(0, Number(localStorage.getItem('cs_rosterSprite') || '-1') + 1) || 0; } catch {}
  fetch(`/img/roster-sprites/manifest.json?v=${picture.dataset.rosterSprite}`)
    .then(response => response.ok ? response.json() : [])
    .then(async roster => {
      if (!Array.isArray(roster) || !roster.length) return;
      const show = async () => {
        const entry = roster[index % roster.length];
        const preview = new Image();
        preview.src = matchMedia('(prefers-reduced-motion: reduce)').matches ? entry.still : entry.animated;
        await preview.decode();
        motion.srcset = entry.still;
        animated.srcset = entry.animated;
        image.src = entry.animated;
        image.width = 192; image.height = 192;
        picture.classList.add('is-roster');
        picture.dataset.character = entry.id;
        try { localStorage.setItem('cs_rosterSprite', String(index % roster.length)); } catch {}
      };
      await show();
      startVisibleRotation(async () => { index++; await show(); }, () => true);
    })
    .catch(error => console.warn('[mídia] sprites indisponíveis', error));
}
