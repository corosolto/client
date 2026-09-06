# Escadão: casa central e abrigo disputável — PR #529

## Continuidade e definição de concluído

Trabalho exclusivo em `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito`,
branch `astra/escadao-casas-conflito`. Objetivo: janela funcional para a aproximação do respawn,
fechamento fora da abertura e abrigo que o time de baixo alcance perto do spawn superior,
com acesso, retorno, revide e proteção dos slots verificados. Validar localmente, capturar
offline, atualizar o PR e publicar progresso; sem navegador, merge ou release.

Base do PR: `42c01175`. Checkpoints herdados: `35e49547` (janela), `68981594` (abrigo).
A revisão de 06/09/2026 rejeitou a prova de tiro herdada: origem fora da parede em
`conflict-home` e origem dentro do colisor lateral em `home`. O corpo era deslocado pela
colisão; posições ocupáveis não atingiam o alvo antigo. A régua fortalecida também reprova
`68981594` ao executar seu builder via hook de importação, sem trocar o checkout.

## Alterações aceitas tecnicamente

- Janela traseira deslocada para a aproximação leste. A moradia existente na rua bloqueia
  as diagonais para os slots E. Fachada fechada fora da abertura, com peitoril, verga e
  caixilho; preservados escada lateral, passarela e janela frontal.
- Abrigo do mirante com ombreiras à altura do jogador e verga: a frente anterior era
  quase toda vazada. Duas portas laterais permanecem abertas, agora com vergas.
- Testes partem de pés ocupáveis e exigem alvo ocupável, tiro e revide. O alvo final
  `[10.8, 1.5, 24]` também está livre contra todas as malhas visíveis do arnês; o candidato
  `[11, 1.5, 23]` foi rejeitado porque o caixilho decorativo interceptava o raio.

## Evidência local de 06/09/2026

Recibos: `artifacts/escadao-casas-conflito/review/` (não versionados).
Comandos executados com Node 23 em `/opt/homebrew/bin/node`:

- `tools/eval/escadao-home-check.mjs`: entrada, passarela e retorno; 250 posições de movimento.
- `tools/eval/escadao-conflict-home-check.mjs`: 445 posições ocupáveis, 21.360 raios aos
  spawns bloqueados, olhos em pé/agachado e alvos em três alturas; rota até a casa.
- `tools/eval/escadao-mirante-abrigo-check.mjs`: 204 posições com corpo contido no abrigo,
  4.896 raios aos slots B bloqueados, 140 frames atravessando as portas e retornando;
  rotas do time de baixo e de contestação pelo time superior.
- Estrutura, descida, detalhes, grafo e contrato específicos: 5/5 passaram (`map-checks.log`).
- Cinco mutantes falharam na asserção esperada, conferida no texto de erro (`mutants.json`):
  `rear-window-sealed`, `canto-aberto`, `saidas-seladas`, `sem-ombreiras`, `fundo-aberto`.
- `npm run build`: passou. `npm run check:fast`: execução completa em `check-fast.log`,
  incluindo `mapcontrato`, `spawn`, `botsim-golden` e os testes do Escadão.
- Crítico independente, contexto limpo e somente leitura, confirmou os defeitos anteriores,
  as correções, os mutantes e a possibilidade de contestar o abrigo.

## Capturas offline reproduzíveis

```sh
node tools/escadao-conflict-offline.mjs artifacts/escadao-casas-conflito/review/before 68981594
node tools/escadao-conflict-offline.mjs artifacts/escadao-casas-conflito/review/after
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/render-escadao-conflict-offline.py -- artifacts/escadao-casas-conflito/review/before
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/render-escadao-conflict-offline.py -- artifacts/escadao-casas-conflito/review/after
```

Cada diretório contém geometria exportada do builder, hashes dos fontes, recibo das câmeras
 e quatro PNGs 1536×1024. A esfera laranja é alvo de diagnóstico, não um objeto do mapa.
As imagens finais mostram janela enquadrada e escada lateral livre; no mirante, janela
central e portas distinguíveis. Há faixas escuras nas quinas e interiores escuros no render.
Este é um estudo de geometria procedural em Cycles CPU, sem GLBs, texturas, HUD ou renderer
do jogo. Não equivale à aprovação estética humana em runtime. Tentativas do exportador
que omitiam faces de materiais únicos foram descartadas e as capturas foram refeitas.

## Limites, resultados rejeitados e próximo passo

- Não há aprovação de equilíbrio competitivo nem garantia de ausência de camping.
  A proteção do mirante cobre o corpo totalmente contido no interior; as soleiras das
  portas têm exposição. Entradas independentes e revide demonstram contestabilidade.
- `eval:escadao-rota` segue vermelho: um lance inferior sem destino. Reproduzido no builder
  da base `42c01175` e no final. A varredura alta não lê slots E em nenhum dos dois;
  ela mede **zero pontos para B**, pois exclui a mesma cota. A régua nova do abrigo
  cobre explicitamente esse caso, sem apresentar `0/0` como prova de proteção.
- `eval:grafitelayout` exige regenerar o layout do Escadão após a geometria mudar.
  O gerador usa Chromium; não foi executado por restrição do usuário. Hash não foi
  atualizado sem regeneração. Esta é pendência real antes de integrar.
- `audio:check` não passa porque o acervo privado está ausente nesta worktree; não se
  regenerou manifesto vazio. `eval:docsautoria` exige documentação gerada commitada;
  revalidar após o checkpoint. O script `npm run check` não existe nesta versão.
- Próximo passo de integração: regenerar grafites em uma frente autorizada a usar navegador,
  revisar o resultado em 3:2 com GLBs reais e avaliar exposição nas portas em partida.
  Esta frente entrega refinamento, evidências e PR atualizado, sem merge/release.
