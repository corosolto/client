const VIDEO_MAPS = new Set(['lajes']);

export function createMapPreview(host, { id, version, media = host, isActive = () => true }) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = win.navigator.connection;
  let mapId = id, video = null, failed = false, disposed = false, request = 0;
  const blocked = () => disposed || failed || doc.hidden || motion.matches || connection?.saveData ||
    !VIDEO_MAPS.has(mapId) || !isActive() || !host.isConnected || !host.getClientRects().length;
  function stop() {
    request++;
    if (media.classList.contains('map-preview-playing')) media.classList.toggle('map-preview-playing', false);
    if (video) { video.pause(); video.currentTime = 0; }
  }
  function release() {
    stop();
    if (!video) return;
    video.onerror = null;
    video.removeAttribute('src'); video.load(); video.remove(); video = null;
  }
  function fail() { failed = true; stop(); }
  async function start(event) {
    if (event?.pointerType === 'touch' || blocked()) return;
    if (!video) {
      video = doc.createElement('video');
      video.className = 'map-preview-video';
      video.preload = 'none'; video.muted = true; video.defaultMuted = true;
      video.loop = true; video.playsInline = true;
      video.setAttribute('aria-hidden', 'true'); video.setAttribute('tabindex', '-1');
      video.src = `/video/map-previews/${mapId}.webm?v=${version}`;
      video.onerror = fail;
      media.append(video);
    }
    const playing = video, token = ++request;
    try {
      const started = await playing.play().catch(() => false);
      if (token !== request) return;
      if (started === false) { fail(); return; }
      if (blocked()) { stop(); return; }
      media.classList.toggle('map-preview-playing', true);
    } catch {
      if (token === request) fail();
    }
  }
  const blur = event => { if (!host.contains(event.relatedTarget)) stop(); };
  const visibility = () => { if (blocked()) stop(); };
  const observer = new win.MutationObserver(() => {
    if (!host.isConnected) dispose();
    else if (video && !video.paused) visibility();
  });
  for (let ancestor = host; ancestor; ancestor = ancestor.parentElement) {
    observer.observe(ancestor, { childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }
  host.addEventListener('pointerenter', start);
  host.addEventListener('pointerleave', stop);
  host.addEventListener('focusin', start);
  host.addEventListener('focusout', blur);
  doc.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', visibility);
  connection?.addEventListener('change', visibility);
  function dispose() {
    if (disposed) return;
    disposed = true; release(); observer.disconnect();
    host.removeEventListener('pointerenter', start);
    host.removeEventListener('pointerleave', stop);
    host.removeEventListener('focusin', start);
    host.removeEventListener('focusout', blur);
    doc.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', visibility);
    connection?.removeEventListener('change', visibility);
  }
  return {
    stop, dispose,
    setMap(next) {
      if (next === mapId || disposed) return;
      release(); mapId = next; failed = false;
    },
  };
}
