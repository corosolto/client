// Regra pura do colete/capacete (CS:GO OnTakeDamage): parte protegida leva dano×pen na vida e o
// colete paga o resto a 1 ponto por 2 de dano. Sem DOM/Three para o servidor poder importar um dia.
import { WEAPONS, ARMOR_PEN, ATRAVESSA_CAPACETE } from './data/weapons.js';

export const ARMADURA_MAX = 100;
export const ARMADURA_BONUS = 0.5;

// `_damage` recebe o nome curto do killfeed ('AK', 'FACA', 'FRAG'); nome desconhecido = colete não protege.
const ID_DO_NOME = Object.freeze({
  ...Object.fromEntries(Object.entries(WEAPONS).map(([id, w]) => [w.short, id])),
  FRAG: 'frag',
});
export function armaDoNome(nome) {
  if (nome && Object.prototype.hasOwnProperty.call(ARMOR_PEN, nome)) return nome;
  return ID_DO_NOME[nome] || null;
}

// `dano` já vem com cabeça e queda por distância (no CS o colete também entra por último).
// `tabela`/`atravessa` existem para a régua injetar mutantes.
export function danoComArmadura({ dano, cabeca = false, colete = 0, capacete = false, arma = null },
  tabela = ARMOR_PEN, atravessa = ATRAVESSA_CAPACETE) {
  const pontos = Math.max(0, Math.min(ARMADURA_MAX, +colete || 0));
  const bruto = Math.max(0, +dano || 0);
  const id = armaDoNome(arma);
  const pen = id && Number.isFinite(tabela[id]) ? tabela[id] : 1;
  const protegido = pontos > 0 && pen < 1 && (cabeca ? (capacete && !atravessa.includes(id)) : true);
  if (!protegido || bruto <= 0) return { vida: bruto, colete: pontos, protegido: false };
  let vida = bruto * pen;
  let gasto = (bruto - vida) * ARMADURA_BONUS;
  if (gasto > pontos) { gasto = pontos; vida = bruto - pontos / ARMADURA_BONUS; }
  return { vida, colete: pontos - gasto, protegido: true };
}
