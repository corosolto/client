// Mesmos limites do P4: a ausência de amostra reprova, mas não é uma distância.
export function summarizeMagazineSupportContact(frames) {
  const minMagazinePx = 2000;
  const eligible = frames.filter((frame) => frame.pentePx > minMagazinePx
    && (frame.maoComponentes || []).length >= 2);
  const distances = eligible.flatMap((frame) => frame.maoComponentes.slice(1)
    .map((component) => component.penteDistPx))
    .filter((distance) => Number.isFinite(distance) && distance >= 0);
  const distancePx = distances.length ? Math.min(...distances) : null;
  const status = distancePx === null ? 'insufficient-sample'
    : distancePx > 24 ? 'detached' : 'contact';
  const maxMagazinePx = Math.max(0, ...frames.map((frame) => frame.pentePx || 0));
  const failure = status === 'insufficient-sample'
    ? `P4 recarga: amostra insuficiente para medir mão↔pente (pente máximo ${maxMagazinePx}px; requer >${minMagazinePx}px e apoio separado); distância não medida`
    : status === 'detached'
      ? `P4 recarga: mão de apoio fica ${distancePx}px longe do pente destacado`
      : null;
  return { status, distancePx, samples: distances.length, eligibleFrames: eligible.length,
    maxMagazinePx, minMagazinePx, failure };
}
