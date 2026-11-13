export function equipeJavaporcos(settings) {
  const raw = Number(settings.javaporcos?.defensores ?? (1 + (settings.allyBots || 0)));
  const total = Math.max(4, Math.min(8, Number.isFinite(raw) ? Math.round(raw) : 4));
  const tres = settings.javaporcos?.times === 3;
  const aliados = tres ? Math.ceil(total / 2) : total;
  return {...settings, allyBots: aliados - 1, enemyBots: tres ? total - aliados : 0,
    javaporcos: {...settings.javaporcos, defensores: total}};
}
