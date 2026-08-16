const GAIT = /^(?:walk|walk1h|run)$/;

export function syncLocomotionPhase(previous, next, previousName, nextName) {
  if (!previous || !next || !GAIT.test(previousName || '') || !GAIT.test(nextName || '')) return null;
  const previousDuration = previous.getClip()?.duration || 0;
  const nextDuration = next.getClip()?.duration || 0;
  if (previousDuration <= 0 || nextDuration <= 0) return null;
  const phase = ((previous.time / previousDuration) % 1 + 1) % 1;
  next.time = phase * nextDuration;
  return phase;
}

export function dampRigValue(current, target, dt, response) {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return target;
  if (dt <= 0 || response <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-response * dt));
}
