/* Teto canônico da pegada de duas mãos nas provas Blender (pulso até o anchor da arma).
   Único dono do número: as réguas de pegada comparam contra ele e conferem o
   `socketContract.maxHandDistanceMeters` que o gerador grava no recibo. */
export const TETO_PEGADA_M = 0.03;
export const tetoTexto = `${TETO_PEGADA_M.toFixed(3).replace('.', ',')} m`;
