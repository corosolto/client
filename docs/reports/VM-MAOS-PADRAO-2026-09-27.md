# Mãos novas por padrão — decisão e portões de 27/09/2026

## Decisão

O dono pediu as mãos **novas** da fábrica na `main`, sem flags de URL. A decisão
substitui a espera anterior para ativar `ready` e `VM_LAUNCH`. As 24 armas da
fábrica usam `fab#<arma>`; a AK mantém a golden autorada aprovada e a faca usa
o rig autorado próprio. `?vmauthored=0` continua como kill switch.

## Medição antes e depois

Na `main@c54a28279`, jogo real em 3:2 sem `vmauthored`/`vmfabrica`: M4, AK e
faca deram **0/3** mãos autoradas; a M4 mostrou `mode=legado`, chave vazia e
`WEAPON_ONLY=true`. Evidência local ignorada pelo Git:
`artifacts/vm-hands-default/before.log` e `before-m4.png`.

Na branch `vm/hands-default`, a mesma régua `vm-autorado-vivo --sem-flags
--todas` passou **26/26** no navegador: 24 produtos da fábrica com 3/3
malhas de mão visíveis, AK golden 2/2, faca 3/3. Capturas 3:2 de M4, AK e
faca em `artifacts/vm-hands-default/`; foram abertas e inspecionadas.
`eval:vm-launch --mutantes` passou, incluindo prontidão 27/27 (armas +
granada), cobertura das chaves, assets locais e kill switch.

## Entrega privada e bloqueios

O manifesto `tools/viewmodels/vm-assets.manifest.json` confere com a árvore
integrada: **63 assets, 159,7 MB, 0 divergências**. Ele ainda tem `blobBase`
vazio. O preview do #668 devolveu **HTTP 404** para
`/private-assets/viewmodels/fabrica/m4-fabrica.glb?v=c500cfe632`; a mesma
URL respondeu 200 no servidor local com a árvore privada. O token Blob está
ausente desta shell. Com `VM_LAUNCH=true`, `fetch-viewmodels.mjs` agora reprova
o build quando faltam assets, mesmo sem `VM_REQUIRED=1`, para impedir um
deployment verde que exiba armas sem mãos.

O placar assado anterior contém **29 células visuais vermelhas** com dono;
`eval:vm-placar` as transforma em falhas quando `VM_LAUNCH=true`. Há também
dois hashes de placar envelhecidos pela mudança de prontidão; a re-medida
3:2 e 16:9 está em andamento. Esses vermelhos não são prova de ausência de
mãos: incluem enquadramento, contato, mira e recarga. Não alterar os limites
ou suprimir P3 para obter CI verde sem decisão explícita sobre a dívida.

## Para publicar

1. O dono publica os 63 assets no Blob privado com o token em ambiente local:
   `node scripts/upload-viewmodels.mjs --publicar`. O comando usa por padrão
   `~/csbrasil-private-assets/generated/viewmodels-fabrica-integrada/overlay/viewmodels`.
   O manifesto resultante com `blobBase` precisa ser commitado; não registrar
   token, URL assinada ou binário privado no Git.
2. Validar preview limpo com `VM_REQUIRED=1` e `eval:vm-serving-prod`:
   63/63 arquivos servidos com hash e cabeçalho corretos, além de jogo sem
   flags com as 26 mãos visíveis.
3. Resolver as dívidas visuais de lançamento ou registrar a decisão do dono
   sobre elas de forma explícita e verificável antes do merge.

**Estado:** código local em validação na branch `vm/hands-default`; ainda não
publicado nem mergeado. A câmera permanece no PR #668, independente desta
mudança.
