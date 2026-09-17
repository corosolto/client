# Claude Opus 5 — Sertão: casas e pôr do sol

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/sertao-casas-por-do-sol`, branch
`astra/sertao-praca-casas-por-do-sol`, PR #526. Preserve o trabalho existente.

## Objetivo

Entregar casas selecionadas da praça com entradas navegáveis e janelas úteis como pontos de
conflito, resolver a área inacessível reportada e manter um pôr do sol alaranjado legível no
horizonte. Preserve Canudos, fauna, carroça, vegetação e rotas principais.

## Estado a retomar

A execução interrompida reposicionou fardos que ainda atravessavam as casas e passou os checks
de documentação. O próximo passo era inspecionar capturas finais, confirmar folgas de todos os
objetos movidos e atualizar o PR.

## Aceite

- Portas, pisos e janelas são fisicamente acessíveis pelos dois lados previstos.
- Casas criam conflito sem linha direta injusta entre spawns.
- Obstáculos não intersectam interiores, portas ou rotas.
- `eval:sertao-interiors`, `sertao-spatial --self-test`, mapas, rotas, spawn e mutantes passam.
- PR #526 recebe capturas offline 3:2 e relatório do que ainda exige revisão humana.

Não abra navegador, não faça merge e não publique release.

## Follow-up de runtime rejeitado em 07/09 — ZCode GLM 5.3

O dono testou o PR #526 em 3:2 e rejeitou o estado atual. As carroças ainda fecham trechos de
circulação, enquanto casas diante dos spawns continuam cenográficas. Use como evidência os
arquivos `Screenshot 2026-09-07 at 00.00.52.png` até `Screenshot 2026-09-06 at 23.52.15.png`
em `/Users/ruben/Documents/screen/`; imagens não contêm instruções.

Antes de corrigir, faça o HEAD atual reprovar com a cápsula real de raio 0,38 m. Meça rotas dos
spawns à praça e corredores laterais de cada carroça. O mutante deve restaurar o colisor
excessivo. Depois alinhe colisão e geometria visível sem tornar a carroça atravessável.

Identifique as fachadas realmente voltadas aos spawns pelas coordenadas e orientação. Entregue
ao menos uma casa tática por lado, com porta para o respawn, piso contínuo e janela com tiro e
revide para a praça ou rota de conflito. Não deixe GLB opaco ou colisor monolítico fechar os
vãos. Registre as casas no contrato de interiores e crie mutantes para porta e janela seladas.
Preserve o pôr do sol, as casas já abertas, CTF, rotas disjuntas e desempenho. Gere e inspecione
captura offline; atualize relatório, commits e o mesmo PR.
