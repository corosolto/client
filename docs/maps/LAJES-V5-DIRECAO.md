# Lajes V5 — identidade, escala e ambiência

Base local: `688765c0`, branch `codex/lajes-visual`. V4 foi REJEITADA pelo usuário: becos largos, simplificação excessiva, leitura lowpoly e perda do horizonte com pipas/helicóptero. Aprovação anterior de crítico não substitui essa rejeição. Objetivo integral e isolamento continuam em LAJES-VISUAL-CONTINUIDADE.md; sem push, merge ou deploy.

## Referências observadas

Galeria de Tuca Vieira, publicada por Vitruvius/Oxfam: https://vitruvius.com.br/revistas/read/arquiteturismo/09.105/5834 . Duas fotografias efetivamente abertas e inspecionadas no navegador:

- Paraisópolis, São Paulo (19/22): https://vitruvius.com.br/media/images/magazines/grid_12/dae661378a41_08.jpg . Fachadas contíguas de dois/três pavimentos, concreto aparente entre tijolos, marquises pequenas, fiação e planos sucessivos de casario. Rua em declive, materiais e acabamentos variados; nenhuma largura métrica inferida da foto.
- Morro da Providência, Rio (20/22): https://vitruvius.com.br/media/images/magazines/grid_12/7437dc14320c_14.jpg . Casas sobrepostas seguindo encosta, alturas e recuos diferentes, vegetação/rocha e manchas de pintura clara entre alvenaria. Horizonte com profundidade, sem fileira de blocos isolados.

Fotografias são referência somente, não texturas integradas. Direitos do fotógrafo preservados. Contexto complementar IMS/Museu Sankofa e Museu das Favelas em LAJES-V5-CEU.md. Não se pretende reproduzir uma comunidade específica nem reduzir identidades diversas à presença de helicóptero.

## Tradução para o mapa

- Fechar vazios exteriores com fachadas habitáveis em escala humana; becos físicos e visuais alvo 1,8–2,8 m, escolha de circulação do jogo. V4 medida: 5,96 m em 120 cortes.
- Preservar três percursos, quatro escadas e respawns no térreo. Novas casas exteriores não criam pisos falsamente navegáveis.
- Pavimentos com ~3 m, portas 0,90 × 2,05 m; variar alturas, acabamento e recuos sem redimensionar portas.
- Reativar normal/roughness das texturas locais documentadas. Relevo de material, vãos, vigas e coberturas devem ter leitura real no browser.
- Entorno com kit ModularSlums CC-BY 4.0 em escala de múltiplos pavimentos; não miniaturizar edifícios inteiros para altura de barraco. Substituir módulos gigantes isolados da V4.
- Horizonte contínuo, duas pipas e helicóptero GLB real, com comprovação de carregamento, movimento e visibilidade; nenhum screenshot vazio vale como evidência.

## Verificação

Baseline vermelho: `artifacts/lajes-visual/v5/gates/identidade-v4-red.json`. LID1 reprova 120 cortes; LID2/3 preservam corpo e circulação; LID4 distingue pipas existentes mas pouco perceptíveis de helicóptero ausente. Comparar câmeras V4; deslocar apenas câmera de beco para o eixo transitável novo. Inventário de portas passa de 12 para 24 com novas fachadas térreas reais, mantendo dimensões e raycasts. Testes não constituem aceite estético. Necessários: fotos1536×1024, movimento real, mutantes causais, crítica independente sem histórico, gates e build. GPU compartilhada não permite aprovação de FPS.

## Revisão após os pixels

O primeiro teste do kit ModularSlums mostrou torres estreitas com empenas de pedra: rejeitado pela crítica1. A composição final usa234construções de fundo autoradas, ligadas e com2–4pavimentos de2,85m, janelas/varandas/recuos;36instâncias do kit permanecem no plano mais distante, com atribuição existente. Não se declarou o kit aprovado apenas por sua licença. Foram acrescentados dois quartos nas lajes preservando faixas de circulação. Plantas passam a folhas curvas; serviços têm ramais e as fachadas variam dimensões de janelas/acabamento. Provas visuais e físicas estão em browser-third, ainda sujeitas à crítica2 e ao aceite do dono.
