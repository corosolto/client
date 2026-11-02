// Decisão pura e única de apresentação do viewmodel. `scopeMask` é a opacidade
// real do overlay: em 0,55 a arma ainda ancora a mira; acima disso a luneta cobre.
export function viewmodelVisibility({
  alive = true,
  firstPerson = true,
  realScope = false,
  scopeMask = 0,
  meleeReady = false,
  authoredMode = false,
  authoredReady = false,
  utilityReady = false,
} = {}) {
  const firstPersonAlive = Boolean(alive && firstPerson);
  const scopeCovered = Boolean(realScope && Number(scopeMask) > 0.55);
  // Utilidade na mão vence arma E faca: sem isto o arremesso com a faca equipada
  // acontecia fora de tela. Régua: tools/eval/granada-porte-check.mjs (GP1).
  const utility = Boolean(firstPersonAlive && utilityReady && !scopeCovered);
  const melee = Boolean(firstPersonAlive && meleeReady && !utility);
  const root = Boolean(firstPersonAlive && !melee && !scopeCovered);
  const authored = Boolean(root && authoredMode && authoredReady && !utility);
  const fallback = Boolean(root && !authored && !utility);
  return Object.freeze({ root, melee, authored, fallback, scopeCovered, utility });
}
