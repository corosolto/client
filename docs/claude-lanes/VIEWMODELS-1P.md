# Claude Opus 5 — viewmodels em primeira pessoa

Esta é uma frente sequencial. Um único integrador deve trabalhar em arma, mãos, animação, ADS,
mira e HUD. Use as worktrees dedicadas existentes; nunca edite duas ao mesmo tempo.

Comece por `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles`, branch
`codex/vm-prep-rifles`, e leia o PR #534. Depois use exclusivamente
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao`, branch
`codex/vm-prep-precisao`, para Mosin, SVD e SKS. Pistolas, faca e AWP ficam fora até esse ciclo
estar checkpointado.

## Objetivo

- M4: corrigir contato dos dedos, manga/pele e recarga sem rotações deformadas.
- Mosin/SVD: corrigir a divergência temporal entre arma e braços e validar contato durante cada
  mecanismo e recarga.
- SKS: explicar e corrigir apenas se necessário a diferença de um frame/interpolação, mantendo
  contato e silhueta.
- Para cada arma: mecanismo, contato, recarga, enquadramento, ADS e retorno ao idle são avaliações
  separadas.

## Estado a retomar

A tentativa M4 C2 foi rejeitada por deformar mínimo e anelar; não a publique. Há uma nova
trajetória interrompida que melhorou frames intermediários e mantém relação com o carregador,
mas ainda exige revisão completa. Em `vm-prep-precisao` há mudanças preservadas em
`precisao-blender.py` e `precisao-gltf.py`; não as descarte.

## Aceite

- Blender, GLB reimportado e folhas 3:2/16:9 por ação, com inspeção descrita.
- Contato mede distância assinada e superfície correta, não apenas proximidade.
- Duração e amostragem de arma/braços são justificadas e mutantes falham.
- Nenhum GLB candidato entra em runtime antes da aprovação visual humana.
- Commits e PRs por família, sem materiais compartilhados ou assets privados no Git.

Não abra navegador, não faça merge e não publique release.
