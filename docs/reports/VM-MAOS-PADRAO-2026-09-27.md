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

O placar assado contém **15 pares arma/régua distintos** com alerta automático,
medidos em dois formatos: 14 células em 3:2 e 15 em 16:9, somando 29 medições.
Não são 29 armas reprovadas. Os 15 pares são 9 de enquadramento/ângulo
relativos à AK (AWP, G3, MD97, M400, Mosin, Rem700, SVD, G3SG1 e SKS), ADS
da AK, contato da mão de apoio na Tavor e quatro verificações de carregador
(Tavor, FAMAS, Uzi e Deagle). As re-medidas 3:2 (14,8 min) e 16:9 (14,9 min)
deram **exatamente as mesmas células vermelhas da main, sem novo vermelho nem
mudança de valor vermelho**. O dono relatou ter aprovado os screenshots
estáticos de todas as armas no HTML de revisão; essa aprovação cobre a
aparência dos quadros vistos, enquanto ADS e recarga exigem seus próprios
quadros em movimento.
Antes do aceite, `eval:vm-placar` transformava as 29 medições em falhas P3
quando `VM_LAUNCH=true`. Esses alertas não são prova de ausência de mãos:
incluem enquadramento, contato, mira e recarga. Na Tavor, a mão aparece mas
o contato reprova. O dono confirmou a publicação com os alertas conhecidos,
deixando sua correção para depois. `vm-launch-aceite-visual.json` registra as
29 células por formato com estado, valor e SHA-256 da mensagem medida. P3 e a
régua ao vivo só aceitam esses resultados **exatos**; célula nova, valor ou
mensagem alterados e `NAO_MEDE` continuam vermelhos. O placar passou 0 falhas;
os mutantes de valor alterado e célula nova reprovaram. Uma amostra no jogo
real, `cobertura/awp` 3:2, continuou com o valor aprovado e passou como
aceite. A dívida original com dono permanece para o trabalho de correção.

O `check:vm` completo no head publicado `923047a94` terminou **7/9 em
1338,6 s**: só `eval:vm-placar` (29 medições P3) e `eval:vm-reguas` (14
células 3:2 aceitas como dívida antes da chave) reprovaram. As outras sete
réguas passaram. A execução está em
`artifacts/vm-hands-default/check-vm.log`, ignorado pelo Git.
Após o aceite explícito do dono, o `check:vm` completo passou **9/9 em
1150,2 s**, inclusive `eval:vm-reguas` ao vivo (985,8 s) e o placar 0 falhas.
Log local ignorado: `artifacts/vm-hands-default/check-vm-aceito.log`.

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

Foi encontrado e corrigido um conflito entre `fetch-viewmodels` e
`prepare_precision_preview --assert-clean`: o primeiro instala o runtime
privado como diretório físico e o segundo antes rejeitava todo diretório.
Agora o build aceita somente um diretório com **exatamente** os 63 arquivos do
manifesto, sem links simbólicos, extras ou hash divergente; a proteção contra
symlink de preview local permanece. Fixture com 63/63 passou, mutantes de
arquivo extra e hash incorreto reprovaram. Em worktree destacado isolado,
com apenas os 63 assets em links físicos para os bytes locais, `npm run build`
passou e `eval:vm-serving-prod` confirmou 63/63 hashes tanto em
`.vercel/output/static` quanto em `dist/client`, 0 extras, cabeçalhos e
vínculo VM_BYTES. O worktree temporário foi removido após a verificação.

## Para publicar

1. O dono publica os 63 assets no Blob privado com o token em ambiente local:
   `node scripts/upload-viewmodels.mjs --publicar`. O comando usa por padrão
   `~/csbrasil-private-assets/generated/viewmodels-fabrica-integrada/overlay/viewmodels`.
   O manifesto resultante com `blobBase` precisa ser commitado; não registrar
   token, URL assinada ou binário privado no Git.
2. Validar preview limpo com `VM_REQUIRED=1` e `eval:vm-serving-prod`:
   63/63 arquivos servidos com hash e cabeçalho corretos, além de jogo sem
   flags com as 26 mãos visíveis.
3. Depois do merge, corrigir os 15 pares arma/régua aceitos e retirar cada
   entrada do aceite quando a régua correspondente ficar verde.

**Estado:** branch `vm/hands-default` publicada no PR draft #669; ainda não
mergeada. O `check:vm` completo fechou 7/9 no head `923047a94`, antes do
aceite; a nova execução com aceite fechou 9/9. A câmera
permanece no PR #668, independente desta mudança.
