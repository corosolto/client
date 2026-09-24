# Diagnóstico da recarga tática da M4 — 06/09/2026

Estado: **rejeitado; não integrar em runtime.** Este documento preserva uma
sonda offline que parte do candidato privado `m4-actions-fingers-c1`, sem alterar
arma, carregador, palma, polegar, manga, relógio ou assets compartilhados.

## Medição e mutação

No frame 62 da recarga C1, o detector de interseção de segmentos de aresta
contra a malha deformada do carregador encontrou 45 cruzamentos diretos e 6
inversos no anelar; no mínimo, 94 diretos e 13 inversos. C1 funciona como a
mutação: ao substituir a sonda C2 pelo clipe C1, os contadores retornam.

`tools/viewmodels/prep/rifles-m4-actions-fingers-c2.py` limita a escrita aos
seis quaternions `ring_0[123]_l` e `pinky_0[123]_l`, entre 1,60 e 2,32 s. Com
os insumos privados já existentes em
`artifacts/viewmodels/prep/rifles/m4-actions-fingers-c1/`, execute em Blender
background. A saída privada C2 traz `transition-fit.json`, `contact-check.json`,
`reimport-check.json` e os renders do frame 62.

A sonda eliminou os cruzamentos nos dois sentidos e preservou os ossos não
autorizados e os endpoints. O GLB de avaliação privado teve SHA-256
`c9aa6dbb58a5c7f7369f284ddd31ae58487aa2517994eb0cc85400f0d98e5576`; ele não
faz parte deste PR.

## Por que foi rejeitada

A solução exige `pinky_01_l = -83°` e `ring_01_l = -45°`. Isso não é uma
correção local visualmente defensável, mesmo com a métrica de interseção verde.
A sonda também não altera o segundo bloqueador: pele exposta no punho nos frames
13 e 45. Assim, a recarga não passa conjuntamente contatos, anatomia e
cobertura.

O próximo passo é medir a borda deformada manga/pele nos frames 13 e 45, com
seleções, pesos e distância assinada. Se uma cobertura específica à ação não
zerar nos endpoints sem editar a malha/rig comum, é necessário um novo asset de
mão/roupa; não se deve ampliar a rotação do mínimo.
