// Diagnostic for BUG-89: local walking loops can hide inside a low whole-match efficiency.
// Candidate thresholds describe a complete circuit, not a gameplay acceptance gate.
// A circle has area/path² ≈ 0.08; 0.02 rejects thin out-and-back lanes.
const DEFAULTS = Object.freeze({ windowSeconds: 6, minDurationSeconds: 5.85,
  minPathMeters: 3, maxNetToPath: 0.35, minRadiusMeters: 0.45,
  minTurns: 0.8, minDirectionality: 0.7, minAreaToPathSquared: 0.02,
  maxGapSeconds: 0.45,
  maxStepSpeed: 12 });

const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

function inspectWindow(points, options) {
  const duration = points.at(-1).t - points[0].t;
  if (duration < options.minDurationSeconds) return null;
  let path = 0;
  for (let i = 1; i < points.length; i++) path += distance(points[i - 1], points[i]);
  if (path < options.minPathMeters) return null;
  const net = distance(points[0], points.at(-1));
  if (net / path > options.maxNetToPath) return null;
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cz = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  const radii = points.map((p) => Math.hypot(p.x - cx, p.z - cz)).sort((a, b) => a - b);
  if (radii[Math.floor(radii.length / 2)] < options.minRadiusMeters) return null;
  let angle = 0, absoluteAngle = 0, twiceArea = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const ax = a.x - cx, az = a.z - cz, bx = b.x - cx, bz = b.z - cz;
    const turn = Math.atan2(ax * bz - az * bx, ax * bx + az * bz);
    angle += turn;
    absoluteAngle += Math.abs(turn);
    twiceArea += a.x * b.z - b.x * a.z;
  }
  twiceArea += points.at(-1).x * points[0].z - points[0].x * points.at(-1).z;
  if (Math.abs(twiceArea) / 2 / (path * path) < options.minAreaToPathSquared) return null;
  const turns = Math.abs(angle) / (2 * Math.PI);
  if (turns < options.minTurns || Math.abs(angle) / Math.max(absoluteAngle, 1e-9) < options.minDirectionality) return null;
  const engagedShare = points.filter((p) => p.engaged).length / points.length;
  const targetPoints = points.filter((p) => p.engaged && typeof p.targetKey === 'string'
    && Number.isFinite(p.targetX) && Number.isFinite(p.targetZ));
  let switches = 0;
  for (let i = 1; i < targetPoints.length; i++)
    if (targetPoints[i].targetKey !== targetPoints[i - 1].targetKey) switches++;
  const stableTarget = targetPoints.length === points.length && switches === 0;
  let targetTravel = null, centerOffset = null;
  if (stableTarget) {
    targetTravel = 0;
    for (let i = 1; i < targetPoints.length; i++)
      targetTravel += Math.hypot(targetPoints[i].targetX - targetPoints[i - 1].targetX,
        targetPoints[i].targetZ - targetPoints[i - 1].targetZ);
    centerOffset = targetPoints.reduce((sum, p) => sum + Math.hypot(p.targetX - cx, p.targetZ - cz), 0) / targetPoints.length;
  }
  return { start: +points[0].t.toFixed(2), end: +points.at(-1).t.toFixed(2),
    path: +path.toFixed(2), net: +net.toFixed(2), turns: +turns.toFixed(2),
    kind: engagedShare >= 0.5 ? 'target-present' : 'target-absent',
    target: { sampleShare: +(targetPoints.length / points.length).toFixed(2), switches,
      key: stableTarget ? targetPoints[0].targetKey : null,
      travel: targetTravel === null ? null : +targetTravel.toFixed(2),
      centerOffset: centerOffset === null ? null : +centerOffset.toFixed(2) } };
}

export function inspectMovingLoops(samples, overrides = {}) {
  const options = { ...DEFAULTS, ...overrides };
  const events = [];
  let eligibleWindows = 0;
  let segment = [];
  let previous = null;
  let nextEligible = -Infinity;
  for (const sample of samples) {
    if (!Number.isFinite(sample.t) || (previous && sample.t <= previous.t))
      throw new Error('bot-moving-loops: tempo ausente ou fora de ordem');
    if (!sample.alive) { segment = []; previous = sample; continue; }
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.z))
      throw new Error('bot-moving-loops: posição ausente');
    const gap = previous ? sample.t - previous.t : 0;
    if (!previous?.alive || gap > options.maxGapSeconds
      || distance(previous, sample) / Math.max(gap, 1e-9) > options.maxStepSpeed) segment = [];
    segment.push(sample);
    while (segment.length > 1 && sample.t - segment[0].t > options.windowSeconds) segment.shift();
    if (segment.length > 1 && sample.t - segment[0].t >= options.minDurationSeconds) eligibleWindows++;
    if (sample.t >= nextEligible) {
      const event = inspectWindow(segment, options);
      if (event) { events.push(event); nextEligible = sample.t + options.windowSeconds; }
    }
    previous = sample;
  }
  return { events, eligibleWindows };
}

export const findMovingLoops = (samples, overrides) => inspectMovingLoops(samples, overrides).events;
