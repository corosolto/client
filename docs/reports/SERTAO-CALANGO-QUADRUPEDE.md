# Calango quadrúpede — revisão solicitada pelo dono

O calango bípede foi explicitamente rejeitado pelo dono em 06/09/2026. Esta revisão
não considera o contrato anterior de “empinado” uma exigência válida. O arquivo
original continua preservado; a substituição proposta usa um derivado separado.

## Diagnóstico medido e visto

`calango.glb` é uma malha estática sem rig nem animação: pernas traseiras apoiadas,
braços suspensos, coluna vertical, cauda curva. O problema não se resolve girando
esse corpo: as mãos continuariam longe do solo ou a cabeça seria enterrada.
`_updateCalango` ainda agravava a postura com pitch de −0,42 rad na corrida/fuga.

O único outro lagarto local, `lagarto_sertao.glb`, é quadrúpede e tem cabeça russet,
quatro patas laterais e cauda longa. Inclui uma pedra na mesma primitive, porém
em componente desconectado. Nenhum dos dois arquivos tem rig ou clipe Mint.
Os renders Blender em `artifacts/sertao-astra/calango-quadrupede/` mostram ambos,
incluindo vistas lateral e superior; `lagarto_sertao-top.png` identifica a pedra.

## Derivação mínima

`tools/derive-calango-quadruped.mjs` exige SHA da fonte, retira apenas o componente
da pedra, orienta a cabeça para +Z, ajusta os quatro apoios ao solo e elimina
buffers não usados. Preserva os três WebP byte a byte e os materiais originais.
A cauda que ultrapassava a borda da pedra é trazida ao solo, sem girar a cabeça.

A locomoção autoral usa quatro morph targets: passada de pares diagonais, elevação
de cada par e pequeno movimento lateral da cauda. O clipe `Run`, com 0,48 s,
levanta e avança um par enquanto o outro permanece apoiado. Trata-se de adaptação
local, não de rig/animação gerada no Mint. Não identifica espécie científica.

| Arquivo | Bytes | Triângulos | Rig/clipes |
|---|---:|---:|---|
| `calango.glb` rejeitado | 402.824 | 4.957 | nenhum |
| `lagarto_sertao.glb` de origem | 316.744 | 5.003 | nenhum |
| `calango_quadrupede.glb` derivado | 608.484 | 4.795 | quatro morphs / Run |

SHA da fonte: `5ef08bdcf2390e44a0e1956568392b2f5885fd450257c077257a50c3b5b4650a`.
SHA do derivado: `78cc644d948de4a98da962edf084116c2c124ec5c8284a5cc53075d0e2ef8233`.
O tamanho aumenta pela animação; nenhuma textura, material ou draw call extra.
Clones compartilham a geometria/morphs; cada instância mantém pesos próprios.

## Régua e contraprovas

`node tools/eval/calango-quadruped-check.mjs` mede o GLB servido, não uma constante:

- CQ1: razão altura/comprimento. Original bípede 0,957; derivado 0,166. Teto 0,30
  deriva da silhueta quadrúpede de origem (0,217 sem pedra) com folga para passada.
- CQ2: quatro apoios anatômicos distribuídos à frente/atrás e esquerda/direita,
  com afastamento máximo do solo de 0,002 unidades do asset (menos de 1 mm no jogo).
- CQ3: amostra os pesos do clipe real e as posições dos morphs; passada de 0,07
  unidades, avanço na fase suspensa e pelo menos dois apoios a cada amostra.
- CQ4: 4.795 triângulos, abaixo do calango rejeitado, e retirada da pedra registrada.

Baseline anterior (`--baseline`) reprova as quatro cláusulas. Contraprovas:
`bipede` restaura o GLB anterior e reprova CQ1–4; `pata-aerea` reprova CQ2/CQ3;
`sem-passada` reprova somente CQ3; `triangulos-duplicados` reprova somente CQ4.
Os efeitos multialvo são declarados, não chamados de isolamento.

Logs: `baseline-red.log`, `after-green.log`, `mutante-*.log`, `derivative.json`,
`materials.json` e `validator.json`, na pasta de artefatos acima. Validador glTF:
zero erros; um aviso de tangentes geradas em runtime, também presente na fonte.
`gait-sheet.png` reúne quatro fases renderizadas do clipe. A revisão no mapa,
câmera de jogador, velocidade de solo e crítica independente cabem ao integrador.

## Integração destinada ao responsável por ambientlife.js

1. `ASSETS.calango` passa a `models/ambient/calango_quadrupede.glb`; cache deve
   usar `78cc644d948d`, mantendo o caminho antigo apenas como evidência/reparo.
2. Normalização continua por comprimento de 0,38 m. O derivado já olha para +Z;
   não acrescentar yaw e não aplicar pitch de corpo em corrida ou fuga.
3. No ramo de mixer não-QUADS em `_add`, guardar a action `Run` em `actions.run`
   para o tipo calango. `_updateCalango` chama `play()` durante run/flee/recover
   e `stop()` no idle, restaurando os morphs zero; `mixer.update(dt)` continua
   no update compartilhado. Não deixar patas correndo durante a pausa.
4. Corrigir também o fallback procedural bípede e medir ambas as superfícies.
   A geração GLB nova não torna correto o caminho de falha de download.
5. A rajada antiga cobre vários metros em 1,6 s. Preferir velocidade de solo
   medida e duração pelo comprimento da rota; verificar o ciclo no jogo para
   evitar pés patinando e gatilhos de susto que levantam o corpo novamente.
6. Estender a prova de runtime: GLB novo carregado, pitch zero no idle/run/flee,
   morphs variam em corrida, param no idle, quatro apoios na pausa e duas patas
   apoiadas na passada. Reexecutar fuga/colisão/low e gates do mapa.
7. Registrar o derivado em `mint-assets.json` e `public/models/ambient/FONTE.md`,
   com origem abaixo, ferramenta local e SHA; não mudar a autoria da fonte.

## Procedência e limites

Fonte herdada `lagarto-sertao`, asset Mint `ks7b9n65cxtmvfkxcc8a3rm93d8d4p9j`,
[chat de origem](https://mint.gg/chat/ph70g5cch8yt9tqm4aj55n2t9d8d59sj).
Licença específica e autoria humana permanecem pendentes conforme o acervo.
A derivação não resolve nem modifica essa pendência e não introduz alegação CC0.
Não houve download externo, nova geração ou cobrança nesta subtarefa.

Renders são evidência de pose/clipe, sem aprovação da aparência final em combate.
A forma continua estilizada e a pequena passada por morph tem menos articulação
que um rig completo. O dono pediu quadrupedia natural; revisão humana em movimento
continua necessária antes de considerar a fauna finalizada.

## Integração validada em runtime

ASSETS/cache, fallback, mixer e locomoção foram integrados em ambientlife.js.
Velocidade de solo0,8m/s e fuga1,2m/s; pausas interrompem oRun, recuperação usa
passos contínuos. CQ1–10 passaram com11mutantes (efeitos multialvo declarados).
OESTE2 agora observa30s contínuos, avanço em janelas0,4s e repouso de cada animal,
sem presumir o relógio/ciclo antigo; CS3 verifica o cache do arquivo ativo novo.

Chrome real encontrou e corrigiu um defeito adicional: a boundingBox conservadora
dos morphs elevava os pés9,17mm. A normalização do calango agora mede vértices da
pose neutra; CQ10 e mutante normaliza-morph guardam essa regressão.

`tools/eval/calango-quadruped-runtime-check.mjs`: CR1–6 verdes emGLBmédio,
GLBlow e fallback com download abortado. Quatro apoios no repouso, pelo menos dois
em movimento, pitchzero, dez poses de morph e velocidade máxima1,2m/s. Quatro
mutantes efetivos no Chrome: pitch-corrida(CR2/CR3), passada-congelada(CR4),
idle-correndo(CR3/CR4), fuga-teleporte(CR6). Artefatos e relatórios em
`artifacts/sertao-astra/calango-quadrupede/runtime/`; execução consolidada em
`artifacts/sertao-astra/fauna2-browser-runs.json`. Crítica independente aprovou a
postura estática em SERTAO-CRITICA-FAUNA2.md; não substitui revisão humana do ciclo.
