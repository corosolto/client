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

O placar assado contém **29 células visuais vermelhas** com dono;
`eval:vm-placar` as transforma em falhas quando `VM_LAUNCH=true`. As re-medidas
3:2 (14,8 min) e 16:9 (14,9 min) fecharam em **14 + 15 vermelhas, exatamente
as mesmas 29 da main, sem novo vermelho nem mudança de valor vermelho**.
`eval:vm-placar` passou P1/P2 (placares atuais e dívidas com dono) e reprovou
apenas P3 com 29 falhas. Esses vermelhos não são prova de ausência de mãos:
incluem enquadramento, contato, mira e recarga. Na Tavor, a mão aparece mas
o contato reprova. Não alterar os limites ou suprimir P3 para obter CI verde
sem decisão explícita sobre a dívida.

`check:deploy` passou **46/46** em 119,5 s. `check:fast` passou **163/167** em
449 s; as quatro falhas (`eval:mapid`, `audio:check`, `eval:audiovoicemix` e
`eval:amazonia`) foram reproduzidas no checkout limpo `origin/main@c54a28279`
e são herdadas. `eval:vm-orientacao --mutantes` passou: 17 produtos medidos,
e o mutante voltou a detectar as quatro armas invertidas do catálogo antigo.
`eval:vm-maos-time` passou. `eval:vm-manga-tela-fabrica` reprova pela Uzi:
vmsleeve 0,63% da tela na recarga vazia a 92%, acima do teto de 0,5%.
A mesma falha e o mesmo valor foram reproduzidos em `origin/main@c54a28279`.
`eval:vm-mira-janela` e `eval:vm-mira-golden` passaram.
`eval:vm-serving` passou pela URL efetiva das 25 armas, granada, armas baked
e recursos compartilhados no Astro real, com os assets privados copiados para
`public/private-assets/viewmodels` local ignorado pelo Git. O teste anterior
sondava 11 rotas K que não são o lançamento e reutilizava uma porta ocupada
por servidor de outro worktree; a régua agora escolhe porta livre, fecha o
Astro que abriu e mantém mutante de granada ausente vermelho. O mutante do
jogo sem a ligação `authored.setWeapon` também reprovou 0/2 (M4 e AK sem mãos).

O PR draft #669 está publicado em `923047a94`. No CI desse head, smoke, DCO,
ratchet e CodeQL passaram; o build e o preview Vercel reprovaram porque o
runner não contém os GLBs privados e o manifesto ainda está sem `blobBase`.
O portão VL6 agora admite um runner limpo apenas se o manifesto versionado
tiver a base Blob privada, estrutura consistente e todas as rotas do lançamento
com versão correta. Simulações passaram com manifesto completo; os mutantes
sem upload e sem M4 reprovaram. O próprio build continua conferindo SHA-256
dos bytes baixados antes de publicar. Sem upload, o CI permanece vermelho.

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

**Estado:** branch `vm/hands-default` publicada no PR draft #669; ainda não
mergeada. O `check:vm` completo foi iniciado no head `923047a94`; registrar
seu resultado ao terminar. A câmera permanece no PR #668, independente desta
mudança.
