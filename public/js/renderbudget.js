// AMAZÔNIA 8×8: orçamento medido preserva conteúdo e HUD; diagnóstico e A/B em
// docs/reports/AMAZONIA-8X8-PERF-R2.md.
export function resolveMatchPixelRatio({ quality, mapId, teamSize, devicePixelRatio = 1 }) {
  if (quality === 'high') return Math.min(devicePixelRatio, 2);
  if (quality === 'low') return 0.75;
  if (quality === 'med' && mapId === 'amazonia' && teamSize >= 8) return 0.8;
  return 1;
}
