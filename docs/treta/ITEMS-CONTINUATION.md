# Continuidade — itens separados e desativados

Pedido13/10/2026: manter produção apenas com personagens; acessórios em PR própria para correção gradual. Saci com óculos abaixo dos olhos e escala incorreta foi reprovado pelo dono; nenhum encaixe novo aprovado.

Branch própria codex/treta-items-review-20261013, snapshot da lane ativa treta-skin-store/base80afbcb61 preservado em private-assets/growth-readiness/ranking-20261012/treta-split-20261013/source-snapshot. Copiados somente runtime, ferramentas e seis assets de itens, sem alterar/resetar a lane ativa. O corte próprio codex/treta-approved-skins-20261013 será a base desta PR; inclui grade só com12skins aprovadas e quests/armário.

TRETA_ITEMS_ENABLED=false em módulo puro; sem URL/storage para ativar. Manifesto/fetch, preload, perfil, mount, grid, propostas, compra/equipamento e exposição de equipamento bloqueados com OFF. Aba hidden/removida da navegação; preço de óculos não anunciado. Fixtures ON são testes isolados, não ativação de produção. Seis itens approved=false/profiles vazios preservados para revisão posterior.

Validação Node24: loader/retry/dedup PASS; adversarial cinco mutações existentes detectadas; asset checker seis GLBs/2.698.568B com hashes/bytecount/triângulos/posters PASS; régua funcional OFF cobre preload/mount/store/propostas/grade/navegação/compra/equip e rejeita6/6mutantes. Compiler-rs transform dos dois componentes PASS. Revisão independente items-off-review.md/adendos sem achados restantes no cliente. Testes usam DOM simulado; nenhum fit aprovado nem browser ON certificado. Browser real do corte skins confirmou12cards/0acessórios, build PASS; carteira indisponível por API ausente naquele dev.

Backend próprio: codex/treta-characters-backend-20261013 reverte056/contrato de acessórios de#73; codex/treta-items-backend-20261013 preservará exatamente esse contrato em PR separada. SQL não executado, nenhuma migração já aplicada desfeita. Kill switch global da loja e rollout social/economia ainda são gates.

Definição de pronto desta separação: PRs draft próprias de skins e itens, par cliente/backend explícito, default OFF demonstrado, dados/artefatos reprovados preservados; release de personagens após gates reais. Itens só ativam depois de aprovação por item×personagem/skin e gameplay MP pareado. Não basta alterar approved global: adicionar perfil validado, capturar3:2/rever com dono e revalidar hitscan/retarget/performance.

Objetivo completo: ranking semanal Brasília/MP2×, cinco logins, newsletter/email, campanha e ordem de23PRs estão no ledger progress/growth. Quatro testes aguardam único remetente fale@corosolto.com.br; não enviados nem substituídos pelo subdomínio auth.

Próximo: checkpoint runtime/assets, empilhar sobre corte skins, regenerar inventários/docs, build/hook e publicar drafts; atualizar ledger/ordem com links. Não fazer merge/deploy nem publicar itens reprovados.

Marco13/10: empilhado sobre0a3f56786/client#824; conflitos em store/componente resolvidos mantendo o OFF revisado e filtro de skins aprovadas. Build final exit0 (items-build.log). Doc/ARCH regenerados; publicação ainda depende de hook e draft próprio. Corte backend de8053a/#75; itens38af14a, equivalência API/game/test/db com547fa724d comprovada, ownership/roster e WS reais PASS (welcome, peer existente, espectador, troca/reuso de corpo, disconnect, query/body forjado). Sem SQL/API de compra ou produção certificado.
