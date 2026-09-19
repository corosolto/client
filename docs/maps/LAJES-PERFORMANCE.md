# Lajes: travamento com mais bots (BUG-141)

O relato do dono foi reproduzido no jogo real: Lajes 8×8 gastava quase toda a thread
principal calculando a visão dos bots. A correção conserva o mapa V7 e reduz o
trabalho das consultas, sem diminuir jogadores, arquitetura, vegetação ou céu.

## Causa e correção

O lote de alvenaria juntava peças espalhadas pelo mapa. A caixa externa do lote
cruzava muitos raios, então o Three testava milhares de triângulos irrelevantes.
O índice agora organiza faixas de 12 triângulos, equivalentes às caixas originais,
e encaminha ao raycast nativo somente as faixas cruzadas. A ordem original dos
triângulos é preservada para manter desempates de impactos. O índice não participa
da cena desenhada e compartilha os atributos e índices existentes.

Após esse ajuste, o perfil no navegador revelou trabalho residual nos varais GLB:
a consulta calculava também obstáculos atrás da primeira parede. O hook opcional
`world.rayOccluded` prioriza a alvenaria indexada e encerra a busca ao encontrar um
obstáculo. Consulta todos os demais objetos quando necessário. `_losClear` mantém
fumaça, distância mínima e comportamento dos outros mapas. Hitscan continua usando
a lista completa de impactos, com os mesmos objetos, faces, UVs e normais.

O índice é exclusivo de malhas estáticas de alvenaria de Lajes. Formatos mutáveis,
material múltiplo e drawRange desalinhado usam o caminho nativo. Proxies e índice
custam memória/tempo de construção uma vez por mapa, sem novos draw calls; são
liberados com a arquitetura e não descartam os buffers visuais compartilhados.

## Evidências de 06/09/2026

Instrumento: Chrome headless, GPU real ANGLE Metal/Apple M4 Pro, 1536×1024,
qualidade média, single player com 15 bots (8×8 contando o jogador).

| Execução | Quadros / duração | P50 | P95 | Maior intervalo |
|---|---:|---:|---:|---:|
| Piscina 8×8, baseline | 1.050 / 12,0 s | 8,6 ms | 16,9 ms | 38,4 ms |
| Lajes 5×5, baseline | 271 / 12,1 s | 25,0 ms | 199,3 ms | 299,0 ms |
| Lajes 8×8, baseline | 83 / 12,2 s | 66,9 ms | 391,6 ms | 433,4 ms |
| Lajes 8×8, somente índice | 470 / 13,1 s | 24,8 ms | 58,2 ms | 108,0 ms |
| Lajes 8×8, índice + parada | 642 / 13,2 s | 16,9 ms | 32,8 ms | 52,3 ms |
| Piscina 8×8, execução longa | 4.324 / 61.5 s | 15,9 ms | 25,3 ms | 100,7 ms |
| Lajes 8×8, execução longa | 3.393 / 60,2 s | 16,7 ms | 33,3 ms | 441,2 ms |

No baseline Lajes 8×8, LOS consumiu 10,88 s de 12,2 s. Na execução corrigida de
60 s, consumiu 4,42 s em 25.567 consultas. O motor Node, sem renderização, confirmou
a mesma concentração em LOS; isso refuta GPU ou fauna animada como causa desse
crescimento com bots. Não significa que a GPU seja gratuita.

A execução longa manteve cerca de 56 FPS, sem erros JS. Houve um intervalo RAF
isolado de 441,2 ms, enquanto o maior `update` medido foi 80,8 ms. Não atribuímos
essa pausa a LOS nem alegamos ausência total de hitches. São amostras sequenciais
na mesma máquina, não benchmark de hardware exclusivo. Não validam multiplayer
online, todos os dispositivos nem 60 FPS constantes.

O script permanente mede todos os passes: até 1.041 draw calls e 1.248.982
triângulos no Lajes. Os primeiros scripts capturavam o último passe do pós
(`calls=1`, `triangles=1`); esses campos antigos não são evidência de custo visual.

## Régua e mutações

`eval:lajes-raycast` constrói o Game real. Compara 189 raios entre nós de navegação
com o Three linear: 166 atingem geometria e 13 malhas de alvenaria são inventariadas.
Compara a sequência completa de objetos, distâncias, faces, UVs e normais. A
invariante LRP1 exige reduzir em uma ordem o trabalho linear da etapa que consumia
aproximadamente 90% do frame. O teto é de primitivas testadas, não milissegundos
universais de CI. Medido: 6.059.736 → 22.056 testes (redução de 99,64%).

A consulta de visão do Game é comparada ao resultado nativo, incluindo fumaça;
nenhum objeto pode ser consultado depois do primeiro obstáculo. O stress cobre
220 casos: near/far, origem interna, aresta compartilhada, sidedness, translação,
rotação, escala não uniforme, drawRange, mudança/substituição de dados e descarte.

| Mutação | Falha esperada observada |
|---|---|
| `linear` | Volta a testar 100% dos triângulos |
| `sem-parede` | 165 raios divergem do mapa original |
| `sem-consulta` | Game não chama o hook de oclusão |
| `sem-parada` | 39.501 consultas depois de já encontrar obstáculo |

## Reproduzir

Servidor próprio em uma porta livre; não executar duas instâncias de navegador
nem medições de CPU ao mesmo tempo:

```sh
node tools/eval/serve.mjs 8147
npm run eval:lajes-raycast
node tools/eval/lajes-raycast-check.mjs --mutante=linear
node tools/eval/lajes-raycast-check.mjs --mutante=sem-parede
node tools/eval/lajes-raycast-check.mjs --mutante=sem-consulta
node tools/eval/lajes-raycast-check.mjs --mutante=sem-parada
node tools/eval/lajes-performance-browser.mjs --teams=8 --seconds=60
```

Os quatro mutantes devem sair com código 1. O browser aceita `--maps=lajes`,
`--teams=5,8`, `--quality=low|med|high`, `--seconds=5..180`, `--out=...`,
`--base=...` e `--linear` (reintrodução do custo anterior somente na sessão de teste).

Artefatos locais: `artifacts/lajes-performance/`; baseline `browser-*.json`,
`after/`, `after-occlusion/`, `sustained/`, `raycast-final.json` e os quatro
`*-final.json` dos mutantes. Imagens PNG acompanham cada execução de navegador.
A revisão independente não encontrou bloqueante de código. Build e invariants
passaram sem falha crítica nova. Check:fast teve 105/108 no primeiro passe; IDs e
autoria passaram nas verificações posteriores. Audio:check local mantém a limitação
do pack privado incompleto, sem alterações de áudio nesta correção. A PR517 foi
integrada à main em 06/09/2026 pelo merge `b64aa886`, e a correção acompanha a
release `v2.0.0-alpha.236`. Integração na main não é publicação: nenhum deploy em
produção foi verificado nesta sessão.
