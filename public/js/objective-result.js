const DOIS_TIMES = Object.freeze(['E', 'J']);
const TRES_TIMES = Object.freeze(['E', 'B', 'J']);

export function timesComTerritorio(objective) {
  const territorio = objective?.state?.territorio;
  if (!territorio || typeof territorio !== 'object') return null;
  return objective.regras?.times === 3 ? TRES_TIMES : DOIS_TIMES;
}
