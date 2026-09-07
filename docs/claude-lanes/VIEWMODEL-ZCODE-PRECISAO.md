# ZCode GLM 5.3 — Mosin, SVD e SKS finais

Leia primeiro `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts/docs/claude-lanes/VIEWMODEL-ZCODE-CORRECAO-FINAL.md`. Entregue as três armas completas,
com mãos, ações, ADS/enquadramento, integração local e testes; não pare em candidatos.

**Não inicie enquanto a tarefa `VIEWMODEL-ZCODE-M4.md` estiver escrevendo.** Esta
é a próxima etapa sequencial do catálogo.

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao`,
branch `codex/vm-prep-precisao`. Confirme worktree, branch, HEAD e árvore limpa em
`a988d72b`; preserve qualquer divergência sem reset/clean. Não edite AWP, runtime,
materiais compartilhados, outras worktrees ou assets privados de origem.

Leia integralmente `AGENTS.md`, `docs/LICOES.md`,
`docs/development/VIEWMODEL-1P-PROFISSIONAL.md`,
`docs/reports/VM-PREP-PRECISAO.md` e
`../vm-astra-pistol/docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md`. Aplique as
“Instruções comuns” e “Frente Snipers e Precisão”. O checkpoint `a988d72b` já
provou que o assembler antigo causou a divergência temporal e que a montagem C2
zera o gap das nove ações. Não repita essa arqueologia nem afrouxe a régua.

## Objetivo desta etapa

Produza versões finais separadas de Mosin, SVD e SKS a partir da montagem C2,
mantendo cada mecanismo próprio:

- Mosin: ferrolho manual, mão operadora, alimentação suportada e retorno à pega;
- SVD: mecanismo semiautomático, carregador real e apoio durante a recarga;
- SKS: mecanismo e alimentação reais do asset; não herdar pente, luneta ou gesto
  da Mk14/AK se a geometria não sustentar isso.

Para cada arma, avalie mecanismo, contato, recarga, enquadramento, ADS/luneta e
retorno ao idle separadamente. Meça distância assinada à superfície correta e
interseção frame a frame. A melhora Mosin de 1,048 para 0,714 no proxy ainda é
reprovação de contato. SVD/SKS inalteradas também não estão aprovadas. O excesso
SKS de 1,6e-5 já foi atribuído à diferença nlerp/slerp e não autoriza mudar timing.

Crie saídas novas dentro de
`artifacts/viewmodels/prep/precisao/production-zcode/`, uma pasta por arma. Use
Blender headless, reimporte a GLB e gere folhas 3:2/16:9 por ação e closes externos.
Preserve hashes e estrutura não relacionados; mantenha mutantes que falhem para
timing, contato e mecanismo. Integre as três armas e as mãos por time na rota
autorada da própria branch, com GLBs finais otimizadas e fallbacks. Não execute
builders com `privateRoot` compartilhado e não abra navegador/dev server.

## Entrega

Atualize `docs/reports/VM-PREP-PRECISAO.md` com evidência e resultado final por
arma. Faça checkpoints pequenos na branch existente, trailers `Agent: ZCode GLM
5.3` e `Signed-off-by`, push e atualize somente o PR #513 com implementação, não
apenas documentação. `ready` só pode mudar quando todos os gates técnicos da arma
passarem; mantenha o aceite humano como gate separado. Não faça merge ou release.
