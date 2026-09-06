# Claude Opus 5 — Lajes: desempenho e passagens

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/lajes-visual`, branch
`codex/lajes-performance`. Leia `HANDOFF.md` e identifique o PR remoto atual antes de editar.

## Objetivo

Concluir os fixes abertos de Lajes: desempenho, rotas verticais, passagens, pontos de conflito,
spawn safety e qualidade visual. Preserve o desenho competitivo aprovado e não misture mudanças
de Escadão ou outros mapas.

## Aceite

- Perfil reproduzível antes/depois separa CPU, geometria, raycast, bots e memória.
- Passagens são navegáveis e cobertas pelo grafo; mutantes fecham cada rota.
- Nenhuma otimização reduz armas no chão ou remove identidade visual sem evidência.
- Testes específicos, mapa-contrato, bots e documentação passam.
- Atualize/abra PR isolado e registre capturas offline e revisão humana pendente.

Não abra navegador, não faça merge e não publique release.
