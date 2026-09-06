# Oclusão do Sertão: LOS e tiros

## Defeito e correção local

A comparação Node com `49441895` reproduziu um defeito herdado: os grupos
registrados em `world.occluders` não eram atingidos pelos raycasts não recursivos
de `Game._losClear` e dos tiros. Eram corpos visíveis, incluindo casas e igreja,
não caixas invisíveis. A régua visual RV5 usava raycast recursivo e, portanto,
não demonstrava o comportamento dos bots.

A prova registrada em `artifacts/sertao-astra/map-check-comparison/comparison.json`
é o segmento `[0,1.62,-30]` → `[0,1.62,0]`: antes da correção, tanto no baseline
quanto no candidato, a igreja produzia zero impactos não recursivos e três
recursivos. Os instrumentos isolados são `baseline-run.mjs` e `current-run.mjs`
no mesmo diretório. Esse `current-result.json` é anterior à correção de oclusão.

O mapa agora expande somente seus oclusores já registrados para referências
únicas às malhas, após o batching, preservando pais e matrizes. Não inclui solo,
horizonte, fauna ou sombras de contato. Copas `copa-juazeiro` e bandeirolas
`tecido-forro-*` são excluídas explicitamente: decoração flexível não vira
cobertura rígida. O código global de `Game` não precisa mudar.

## Contratos e reprodução

```sh
node --input-type=module --check < tools/eval/sertao-occlusion-check.mjs
node tools/eval/sertao-occlusion-check.mjs --self-test
```

O relatório é escrito em `artifacts/sertao-astra/occlusion/report.json`.
`ARTIFACT_DIR` permite outro destino. `--json` imprime o relatório;
`--mutante=NOME` executa um mutante isolado após conferir o baseline.

| Contrato | Mundo medido | Mutação real |
|---|---|---|
| OC1 | Lista não vazia, somente Mesh com geometria, sem duplicatas | Insere Group vazio; duplica referência de Mesh |
| OC2 | `Game._losClear` bloqueia cinco paredes de taipa e igreja; raycast de bala não recursivo encontra impacto | Retira oclusores da igreja; retira a parede da casa 2 |
| OC3 | Segmento aberto junto ao spawn permanece livre para LOS e bala | Insere Mesh física atravessando o segmento |
| OC4 | Copas e bandeirolas estão ausentes da lista | Acrescenta a copa real; acrescenta bandeirola real |

Cada mutante exige mudança no resultado e o conjunto exato de cláusulas
vermelhas igual ao seu único alvo. Baseline vermelho torna a prova inconclusiva
e a execução falha. As mutações operam sobre outro mundo recém-construído;
não alteram uma lista de resultados ou fixtures declaradas como aprovadas.

Os segmentos das paredes usam coordenadas locais fixas do corpo autoral:
`[1,1.62,4]` → `[1,1.62,2.8]`, transformadas pelo grupo da casa. A parede fica
perto de z=3,4; x=1 evita portas e janelas. Na igreja proxy, o segmento é
`[1.4,1.62,3.6]` → `[1.4,1.62,2.4]`, cruzando a nave escalada perto de z=2,829
sem depender da torre. As dimensões vêm dos construtores em
`public/js/map_velho_oeste.js`. A altura 1,62 m é o olho do jogador; a margem
final de 0,3 m é a usada por `Game._losClear`. O trecho aberto é
`[0,1.62,-43]` → `[0,1.62,-42]`, dentro dos limites do mapa.

## Limites

Esta régua mede proxies em Node, com `window` removida durante a construção;
não carrega nem aprova GLBs. O raycast de bala exercitado usa a mesma lista e
o modo não recursivo do jogo, mas não simula dano, inimigos, disparo completo,
smoke, rede ou proteção de spawn. Os probes verificam segmentos definidos,
não todas as posições possíveis. Permanecem necessárias evidências separadas
do corpo GLB, de runtime e de custo de raycast/FPS.

O achatamento muda também a interceptação de balas por troncos, cactos e partes
rígidas anteriormente ignoradas. A exclusão explícita de copas e bandeirolas
evita transformar essas decorações em barreiras. Materiais, transformações,
colisores do jogador e geometria não são alterados por esta régua.

## Evidência de fechamento em 06/09/2026

`artifacts/sertao-astra/logs/node-final-occlusion-self-test.log` e o JSON da
régua registram quatro contratos verdes e sete mutantes mordidos isoladamente.
A lista Node medida tem 568 malhas, sem grupos ou duplicatas. Todos os seis
segmentos de parede bloqueiam LOS e bala; o trecho aberto permanece livre.

O comando `node artifacts/sertao-astra/map-check-comparison/occluded-run.mjs`
executa o `map-check` com saída isolada em `occluded-result.json`, preservando
o `current-result.json` anterior. Saiu zero, com os seguintes diagnósticos:

| Medida Node | Antes da correção local | Depois |
|---|---:|---:|
| Exposição média do spawn E | 23,19% | 9,80% |
| Exposição média do spawn B | 24,49% | 7,71% |
| Maior linha até CTF E/MID/B | 90,6 / 55,8 / 88,5 m | 56,2 / 54,9 / 59,0 m |
| Mínimo de rotas separadas | 3 | 3 |
| MAP5 pior espaçamento estimado | 9,78 m | 9,78 m |
| Menor área/folga de spawn | 64,1 m² / 1,75 m | Idênticas |

MAP1 permaneceu sem penetração nas amostras de chão e spawn. MAP4 mediu 549
oclusores sem superfície sem malha, pulando 19 InstancedMesh pelo limite do
instrumento. Naquele snapshot, a bandeira B ainda tinha penetração herdada de 1,08 m;
essa sonda da bandeira é distinta das amostras de MAP1. MAP5 já excedia o teto
impresso de 7 m no baseline (9,70 m). MAP2, MAP5 e CTF1 são diagnósticos, não
cláusulas que determinam o exit code: saída zero não significa aprovação
integral do mapa. Logs completos em `map-check-comparison/occluded.log`.

## Centro da bandeira B desobstruído

A correção posterior moveu somente o barril de `[12,34]` para `[14,34]`, mantendo
CTF, spawns e pickups. SP9 em `sertao-spatial-check.mjs` agora usa
`Game._collide` com raio 0,38 m e uma sonda vertical contra as malhas visíveis
do root. A execução em
`artifacts/sertao-astra/logs/spatial-final-ctf-self-test.json` mediu deslocamento
zero nos três centros e penetração zero em MID/B; E teve apenas erro numérico
de 7,33e-15 m. O diagnóstico de 1,08 m está resolvido nesta medição Node.

Três contraprovas isoladas recolocam barril+colisor, apenas a malha ou apenas
o colisor em B. Todas derrubam somente SP9: respectivamente, deslocamento /
penetração de 0,38 / 1,08 m; 0 / 1,08 m; 0,38 / 0 m. Isso prova os dois
instrumentos independentemente. O `occluded-result.json` anterior foi
preservado como histórico; não é o estado final do barril. Browser e travessia
têm validação separada pelo coordenador.
