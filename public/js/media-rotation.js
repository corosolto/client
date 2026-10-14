export function startVisibleRotation(advance, visible, interval = 20000) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false;
  const tick = () => {
    if (busy || document.hidden || motion.matches || !visible()) return;
    busy = true;
    Promise.resolve().then(advance)
      .catch(error => console.warn('[mídia] rotação indisponível', error))
      .finally(() => { busy = false; });
  };
  const timer = setInterval(tick, interval);
  return () => clearInterval(timer);
}
