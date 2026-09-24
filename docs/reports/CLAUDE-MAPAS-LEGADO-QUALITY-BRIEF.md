# Frente Claude — mapas legados com padrão visual

## Objetivo

Elevar os mapas legados mais importantes ao padrão atual sem misturar a entrega de 72 horas
(Sertão, viewmodel, Campo do Morro e Joá). Esta é uma lane exclusiva, partindo de `origin/main`
e sem alterar runtime, materiais ou registros compartilhados antes de uma proposta revisável.

## Ordem de trabalho

1. `piscina_treta`: mapa de maior uso, preservar a leitura rápida do salão e corrigir primeiro
   legibilidade, material, escala, custo e pontos de spawn/CTF. Não reativar o Piscinão fora do
   registro sem uma decisão explícita.
2. `penitenciaria`: partir do mapa que já está em `main` pelo PR #335; propor uma direção
   **Carandiru** baseada em pesquisa visual e histórica responsável, com um documento de
   referências e assets licenciados. Não alegar reconstrução fiel nem usar material sem
   proveniência. Primeira entrega é blockout/linguagem de pátio, circulação e leitura de combate.
3. `parque_treta`: partir do PR #333 já em `main`; pesquisar parques brasileiros e propor uma
   direção única antes de modelar. O candidato preferido deve ter vegetação, mobiliário,
   esporte/lazer e marcos que sustentem combate e orientação, não somente decoração.
4. **Lote Emerson:** `posto_treta`, `obras_prefeitura` e `atacadao_treta` vêm em seguida,
   nesta ordem de pesquisa e proposta. Os mapas base já estão em `main` pelos PRs #250,
   #338 e #271; os PRs visuais #457, #458 e #459 estão fechados e são referência seletiva.
   O Posto já tinha no ramo histórico `bombas_combustivel.glb` e
   `loja_conveniencia.glb`, ambos do pack Mint `posto_obras_r3`, com contratos de
   fallback e proveniência. Recuperar esses assets e seus contratos antes de criar outros.
   Um GLB explicitamente identificado como Ipiranga não foi encontrado na ponta atual do
   ramo; localizar seu recibo/arquivo antes de alegar que ele está pronto para integração.
5. Só depois: Gelo e demais mapas legados/externos, um por vez.

## Regras de produção

- Não cherry-pickar nem tentar mesclar os PRs históricos #440, #441 ou #447: todos foram
  fechados, tinham base antiga e devem servir somente como referência seletiva.
- Para cada mapa: diagnóstico de preview 3:2, rotas/spawns/CTF, oclusão, 5x5/8x8, orçamento de
  cena e captura real antes de editar; depois, a mesma matriz e mutantes para a regressão achada.
- Registrar cada asset externo com URL, autor, licença, atribuição, formato, tamanho, triângulos e
  uso planejado. MintGG precisa da mesma ficha de proveniência e do GLB validado.
- Não publicar, mesclar, abrir PR, iniciar servidor persistente ou alterar deploy sem um pacote
  revisável: diff pequeno, evidência, custo e captura humana.
- Não competir com o integrador de viewmodel nem tocar Míticos, Sertão, Campo do Morro ou Joá.

## Definição de pronto por mapa

Uma melhoria só é candidata a release com build/gates verdes, captura 3:2 real, revisão humana,
rendimentos comparados, rotas funcionais e uma história visual específica do local. Fauna e
ambiência são consequência do bioma e da leitura do mapa; não são uma cota a preencher.

## Próximo passo ao voltar a cota Claude

Usar Opus na branch `claude/mapas-legado-qualidade`. Produzir primeiro um inventário factual de
Piscina, Penitenciária e Parque, com mapas históricos/branches/PRs, dívida visual, orçamento,
referências e uma proposta de primeira intervenção por mapa. Não implementar no primeiro turno.
