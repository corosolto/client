# Claude Opus 5 — auditoria da penetração da AWP

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/weapon-penetration`, branch
`astra/weapon-penetration-high-caliber`, PR #535. Esta implementação já existe; faça auditoria e
correções pequenas, não uma segunda implementação.

## Contrato atual

A AWP atravessa no máximo uma superfície de madeira ou vidro até a espessura permitida, aplica
redução de dano e é bloqueada por concreto, metal, outra arma e segunda parede. O cliente online
não deve prever dano autoritativo.

## Aceite

- `npm run eval:penetration` passa e todos os mutantes relevantes falham.
- Espessura, material, dano, alcance e ciclo de vida do projétil são medidos no uso real.
- AK e demais armas continuam sem penetração.
- Netcode e autoridade do servidor não sofrem regressão.
- Atualize o PR apenas se encontrar defeito reproduzível.

Não abra navegador, não faça merge e não publique release.
