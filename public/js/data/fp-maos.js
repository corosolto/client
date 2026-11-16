/* Corpos fora do humano não cabem no rig de mãos compartilhado de `buildFPArms` (#1119).
   Para eles o `?hands=1` cai no só-arma em vez de pendurar uma mão grande e solta. */
export const SEM_MAOS_FP = Object.freeze(['lobisomem']);
export const maosFpSuportadas = (id) => !SEM_MAOS_FP.includes(id);
