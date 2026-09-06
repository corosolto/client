# Claude Opus 5 — recuperação seletiva da Mansão do Joá

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/joa-recuperacao`, branch
`astra/joa-recuperacao-seletiva`, PR #533 ou o PR de implementação que o suceder. Preserve o diff
atual: há restauração de mapa e validações interrompidas.

## Objetivo

Reintroduzir a Mansão do Joá com qualidade mínima do catálogo atual: registro, preview, contrato,
rotas, CTF, interiores, paredes, céu, fauna/ambiência com proveniência e documentação.

## Estado a retomar

A revisão encontrou captura CTF possível através do piso do mezanino e paredes com vãos
calculados incorretamente. O defeito foi reproduzido no Game real antes de a execução parar.
Corrija os dois com réguas e mutantes antes de qualquer polimento adicional.

## Aceite

- Captura exige acesso físico válido; pisos bloqueiam interação entre andares.
- Vãos de porta e janela correspondem à geometria e às colisões.
- Mapa registrado, selecionável e coberto por mapa-id, contrato, preview, rotas e bots.
- Assets possuem origem; `MANSAO_AMBIENCE_ASSETS` ou substituto equivalente é explícito.
- PR não confunde reconstrução técnica com aprovação visual final.

Não abra navegador, não faça merge e não publique release.
