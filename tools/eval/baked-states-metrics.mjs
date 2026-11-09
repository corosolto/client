/* Métricas QA comparáveis entre o clipe atual e o pack assado, com o sentido em que
   "pior" aponta. Única fonte para o importador e para a régua: a régua só confia numa
   exclusão cujo delta anda no sentido ruim da própria métrica. */
export const QA_METRICS = Object.freeze([
  ['footSlideCm', ['footSlide', 'maxCm'], 1],
  ['lowestVertexCm', ['lowestVertex', 'minCm'], -1],
  ['heelCm', ['lowestVertex', 'byRegionCm', 'heel'], -1],
  ['toeCm', ['lowestVertex', 'byRegionCm', 'toe'], -1],
  ['hipsMaxRatio', ['hips', 'maxRatio'], 1],
  ['loopPositionCm', ['loopSeam', 'positionCm'], 1],
  ['loopRotationDeg', ['loopSeam', 'rotationDeg'], 1],
  ['handsMaxDeviationCm', ['hands', 'maxDeviationCm'], 1],
  ['stretchMaxEdge', ['stretch', 'maxEdge', 'value'], 1],
  ['stretchBackMaxEdge', ['stretch', 'backMaxEdge', 'value'], 1],
  ['stretchHandL', ['stretch', 'handMaxEdgeL', 'value'], 1],
  ['stretchHandR', ['stretch', 'handMaxEdgeR', 'value'], 1],
  ['seamGapMax', ['stretch', 'seamGapMax', 'value'], 1],
]);
export const QA_DIRECTION = Object.freeze(Object.fromEntries(QA_METRICS.map(([name, , direction]) => [name, direction])));
