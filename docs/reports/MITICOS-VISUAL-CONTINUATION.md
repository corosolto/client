# Míticos/Lendas — revisão visual e entrega

Atualizado em 2026-09-06.

## Objetivo e conclusão
Revisar visualmente o time Mítico com Ruben, corrigir personagens deformados, validar seleção e jogo e entregar a versão aprovada hoje. Conclusão exige imagens revisadas, validação técnica, revisão adversarial, integração compatível com main e publicação verificada.

## Estado recuperável
- Worktree: `/Users/ruben/csbrasil/worktrees/miticos-visual`.
- Branch: `codex/miticos-visual`, criada do PR #481 (`origin/merge/399`, `3abed0888385be1d3bea3fb885ad03e08bb04c96`).
- Origem: PR #399; #481 integra uma main antiga e está CONFLICTING na consulta de 06/09.
- O pacote inclui mapas e sistemas além do time; corte de integração ainda por determinar.
- BUG-40/41 documentam deformação, identidade do Boto e rig ausente do Bandeirante; estado atual ainda precisa ser medido.
- Lobisomem preto forte já foi aprovado pelo dono no histórico do BUG-40; a descrição antiga de lobo-guará no plano foi revogada.

## Milestones
- Localizados PRs e histórico; worktree isolada criada sem alterar outras frentes.
- Nenhum modelo alterado, nenhum novo resultado visual aprovado, nenhum push/merge/deploy nesta sessão.

## Próximo passo
Medir e capturar os nove Míticos com select-inflate e o menu real, revisar imagens com Ruben e localizar a causa das deformações. Artefatos locais em `artifacts/miticos-review/`.

## Baseline validado em 06/09
`eval:mitico` passou 9/9 GLB, rig e PBR. `select-inflate` reproduziu exatamente BUG-86: Saci 607,1; Cuca 309,5; Lampião 121,5; Maria 47,5; Zumbi 36,3; Curupira 32,1 arestas ruins/10 mil, contra teto 23,6. O exit 0 é dívida tolerada, NÃO aprovação dos seis. JSON/log e lineup: `artifacts/miticos-review/`.

A revisão adversarial de contexto limpo preserva direção de arte dos sete demais e reprova Cuca/Boto. Aprovação de arte NÃO aprova animação; Saci tem rasgos visíveis no rosto/pescoço. Perguntas ao dono pendentes sobre direção do Boto e visuais a preservar.

A captura do menu herdada falhou porque tenta clicar CTF antes de expandir JOGAR. `select-inflate` também omite `preview:true` usado por `pvSetChar`: baseline acima mede porte funcional, ainda falta o porte real da seleção. Corrigir instrumentos antes de fechar diagnóstico. Blender audit foi executado em Saci/Cuca; imagens da bind saíram cortadas, não servem como aprovação.
