// Formata segundos como "45min", "3h 20min", "2d 4h".
export function fmtTime(secs: number): string {
  const m = Math.round((secs || 0) / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

// Tempo de exibição: se play_seconds = 0 (partidas antigas ao tracking),
// estima pelo nº de rounds (~99s/round) e marca com "~".
export function displayTime(p: { play_seconds?: number; rounds?: number }): string {
  if ((p.play_seconds ?? 0) > 0) return fmtTime(p.play_seconds!);
  if ((p.rounds ?? 0) > 0) return `~${fmtTime(p.rounds! * 99)}`;
  return '0min';
}
