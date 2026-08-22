# Recuperação do áudio IA local

Este repositório contém o pacote de distribuição de áudio em `public/audio/a/`.
Ele é deliberadamente opaco e serve para execução; não é a biblioteca-fonte das
faixas IA nem permite reedição por título.

## Fonte encontrada

- Instância de trabalho do Claude: `/Users/ruben/corosolto/client`.
- Biblioteca Suno autenticada: perfil `rubenmarcus_dev`; nela estão as faixas
  instrumentais "Garage Punk de São Paulo", "Sertanejo de São Paulo",
  "Proibidão de São Paulo", "Mandelão de São Paulo", "Pancadão de Rua" e
  "Beat Raiz 90s" (duas tomadas em cada caso).
- Cinco pilotos musicais já renderizados pelo Mint, projeto **CSBRASIL Audio
  Original**: `/Users/ruben/corosolto/client/public/audio/ia/rounds-piloto/`
  (`r-e`, `r-b`, `r-u`, `r-c`, `r-f`). Eles ainda não foram incorporados ao
  pacote de execução.

## O que o Claude deixou pronto

- `tools/trilha-ia.mjs`: mede/corta/normaliza faixas do Suno e faz loop.
- `tools/gerar-vinhetas-lyria.mjs`: cinco vinhetas musicais Lyria 3 via
  OpenRouter, com saída em `public/audio/ia/rounds-lyria/`.
- `tools/gerar-vozes-piloto.mjs`: 18 tomadas TTS (seis textos, três vozes) via
  OpenRouter, com saída em `public/audio/ia/piloto/`.
- `tools/eval/trilha-medida.py` e `tools/eval/perfil-trilha.json`: régua de
  conjunto das faixas.

Os dois geradores OpenRouter ficaram no estado **pronto, mas não executado**:
a sessão do Claude não tinha `OPENROUTER_API_KEY`. Nenhum áudio Lyria ou TTS
deve ser alegado como gerado até que essa execução seja feita e auditada.

## Consolidação segura

1. Copiar os scripts e a régua acima para este repositório.
2. Baixar as faixas escolhidas do Suno para uma área de fontes, preservando
   título, URL/origem, duração e checksum.
3. Ouvir e aprovar os cinco pilotos Mint; só então produzir as versões de jogo
   com `trilha-ia.mjs`.
4. Rodar Lyria/TTS apenas com aprovação de gasto e registrar modelo, custo,
   prompt, arquivo resultante e checksum.
5. Atualizar o manifest de execução somente com arquivos aprovados.
