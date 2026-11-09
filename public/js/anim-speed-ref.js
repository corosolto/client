/* Ref de velocidade POR CLIPE (estados assados): m/s do índice × escala do modelo; sem ref, a
   global. Por que e como medir: docs/ANIM-3P.md "Estados assados por estado". */
const refsBrutas = new WeakMap();

export function marcarRef(clip, mps) {
  if (clip && mps > 0) refsBrutas.set(clip, mps);
}

export function refsDoCorpo(acoes, escala, globais) {
  const out = {};
  for (const [estado, global] of Object.entries(globais)) {
    const bruta = refsBrutas.get(acoes[estado]?.getClip());
    out[estado] = bruta > 0 && escala > 0 ? bruta * escala : global;
  }
  return out;
}
