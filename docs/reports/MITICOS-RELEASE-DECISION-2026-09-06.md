# Decisão de release — Míticos 3P

## Veredito

Não existe base para publicar o **time Míticos completo**. Cuca, Saci, Lampião, Maria Bonita, Curupira e Zumbi ainda têm bloqueios visuais ou funcionais; Boto e Bandeirante têm melhorias pontuais, mas não certificação 3P completa.

Existe um patch pequeno e defensável sem Cuca: **Lobisomem — cauda curta e mídia derivada**. A mudança já passou crítica independente em quatro poses e três ângulos, preservou rig/UV/texturas e teve vídeo, pôsteres e avatar revisados. Ela corresponde a `f05edaf9` e `e4f52162`, mas precisa ser reaplicada sobre o `origin/main` atual e novamente verificada; a branch de revisão divergiu de main em `dc6343928`, enquanto `origin/main` está em `42c01175`.

Não usar PR #481 como veículo: ele é draft, conflita e contém mapas/sistemas/times além do escopo visual.

## Estado por personagem

| Personagem | Estado 3P | Evidência atual | Decisão |
| --- | --- | --- | --- |
| Lobisomem | Verde | Cauda aprovada em 12 vistas; rig/UV/textura preservados; vídeos, pôsteres e avatar revistos | Pode entrar no patch pequeno |
| Boto | Amarelo | Postura de `idle1h`/`walk1h` e vídeo aprovados; dedos na pistola e outros ciclos ainda falham | Não vender como 3P pronto; deixar fora do patch mínimo |
| Bandeirante | Amarelo | Escala do mosquete aprovada; mão de apoio ~20 px fora da madeira | Deixar fora até contato ser resolvido |
| Zumbi | Vermelho | Candidato privado passou deformação e crítica limitada; textura provisória, controlador só AK/duas mãos, ordem de hitbox e outras armas pendentes | Não integrar/publicar |
| Cuca | Vermelho | Deformação de proxy passou, mas todas as tentativas de pegada foram reprovadas; crouch/tecido/cauda pendentes | Não integrar/publicar |
| Saci | Vermelho | Anatomia de uma perna e rig/poses reprovados | Não integrar/publicar |
| Lampião | Vermelho | Poses e semelhança histórica reprovadas | Não integrar/publicar |
| Maria Bonita | Vermelho | Poses reprovadas | Não integrar/publicar |
| Curupira | Vermelho | Retarget local passou seleção, mas ciclos, pés e grip não foram aprovados | Não integrar/publicar |

## Caminhos de release

1. **Patch de hoje, pequeno:** reimplementar apenas Lobisomem e sua mídia em uma worktree nova a partir de `origin/main`, usando o conteúdo de `f05edaf9` e `e4f52162` como referência, não como cherry-pick cego. Validar GLB, mídia derivada, seleção e partida antes de abrir PR.
2. **Limpeza de facções separada:** a remoção autorizada dos times adicionais é `1284ab42`, mas alcança cerca de 200 arquivos e documentação. É correta para o pedido do dono, porém não é um patch pequeno de Míticos; precisa de PR própria e revalidação contra main atual.
3. **Não fazer:** juntar Boto/Bandeirante para parecer um lote maior, incluir experimentos privados, ou reanimar Cuca. Isso converteria melhorias parciais em uma alegação de time 3P pronto que a evidência não sustenta.

## Gate para abrir o patch pequeno

- Diff limitado ao Lobisomem e sua mídia derivada; sem mapas, sistemas, facções ou runtime compartilhado.
- Seleção e uma partida real carregam o GLB e a mídia corretos, sem erros de página.
- Capturas 3:2 mostram corpo, arma, cauda e pés em idle/walk/run/crouch; os resultados permanecem equivalentes às 12 vistas aprovadas.
- Checks de asset e mídia passam na base atual. A aprovação final de merge/publicação continua separada.
