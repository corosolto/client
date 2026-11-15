/* Teto canônico da pegada de duas mãos nas provas Blender (pulso até o anchor da arma).
   Único dono do número: as réguas de pegada comparam contra ele e conferem o
   `socketContract.maxHandDistanceMeters` que o gerador grava no recibo. */
export const TETO_PEGADA_M = 0.03;
export const tetoTexto = `${TETO_PEGADA_M.toFixed(3).replace('.', ',')} m`;

const ANCHOR_GATILHO_LOCAL = Object.freeze([0.18, 0, 0]);
const ANCHOR_APOIO_LOCAL = Object.freeze([-0.18, 0, 0]);
const mesmoVetor = (value, expected) => Array.isArray(value) && value.length === expected.length
  && value.every((component, index) => Number.isFinite(component) && component === expected[index]);

export function contratoSocketCanonico(contract) {
  return contract?.triggerHand === 'RightHand'
    && contract?.supportHand === 'LeftHand'
    && mesmoVetor(contract?.triggerAnchorLocal, ANCHOR_GATILHO_LOCAL)
    && mesmoVetor(contract?.supportAnchorLocal, ANCHOR_APOIO_LOCAL)
    && contract?.maxHandDistanceMeters === TETO_PEGADA_M;
}
