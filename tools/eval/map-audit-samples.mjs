// Aresta exata é instável após ida/volta pela matriz do objeto no raycast do Three.
// O recuo baricêntrico máximo de 1e-7 preserva a sonda na face e todos os limites métricos.
export function amostraBaricentrica(k, uv, mutante = '') {
  let u = ((k % 7) + .5) / 7, v = ((Math.floor(k / 7) % 7) + .5) / 7;
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  if (mutante !== 'borda-exata' && 1 - u - v < 1e-7) {
    const fator = (1 - 1e-7) / (u + v); u *= fator; v *= fator;
  }
  uv.u = u; uv.v = v;
  return uv;
}
