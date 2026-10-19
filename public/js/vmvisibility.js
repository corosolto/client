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
} = {}) {
  const firstPersonAlive = Boolean(alive && firstPerson);
  const scopeCovered = Boolean(realScope && Number(scopeMask) > 0.55);
  const melee = Boolean(firstPersonAlive && meleeReady);
  const root = Boolean(firstPersonAlive && !melee && !scopeCovered);
  const authored = Boolean(root && authoredMode && authoredReady);
  const fallback = Boolean(root && !authoredMode);
  return Object.freeze({ root, melee, authored, fallback, scopeCovered });
}
