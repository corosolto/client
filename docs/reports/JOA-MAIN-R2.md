# Mansão do Joá — reconstrução limpa sobre a main atual

Data: 10/09/2026  
Lane: `joa-main-r2` / `codex/joa-main-r2`  
Base confirmada local e remota: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`  
Fonte seletiva: `v2/mansao-joa-recuperacao@c68f5a7f7703ed17a0a17112142c3bada6bcec40` / PR #561  
Estado: **tecnicamente verde e pronto para playtest humano; não mergeado e não publicado**.

## Objetivo e definição de pronto

Recuperar somente a Mansão do Joá e seus contratos sobre a `main` vigente, sem levar os
arquivos compartilhados antigos do PR #561. Pronto técnico significa: mapa registrado e
carregado no jogo real; rotas e CTF multinível funcionais; 5×5 e 8×8 medidos; assets e
proveniência preservados; build e portão de deploy verdes; capturas reais 3:2 e 16:9 em
WebGL2 por GPU; e URL local utilizável. Aprovação visual/jogável continua sendo decisão do
dono depois do playtest.

## Por que o PR #561 não deve ser mergeado diretamente

O PR antigo está `DIRTY/CONFLICTING` e produzia 14 conflitos contra a base usada nesta
reconstrução:

- `ARCH.generated.md`, `CHANGELOG.md`, `README.md` e `STATUS.md`;
- `docs/docs/{arquitetura,comecando,quality-gates,stack}.md`;
- as quatro versões em inglês desses documentos;
- `package.json` e `tools/eval/ARCH.md`.

Esses arquivos eram documentação gerada, registro de scripts e estado global antigo. A
reconstrução não fez merge nem cherry-pick do PR. Os derivados foram regenerados a partir
do código atual. `package-lock.json` permaneceu exatamente o da `main` desta lane.

## Conteúdo portado e integração mínima

- Cenário próprio: `map_mansao.js`, `mansao_ambience.js`, `mansao_horizon.js`, preview,
  texturas, dois GLBs de fauna e 17 GLBs de props.
- Proveniência e contratos: plano da Mansão, documentos de imagens/props, manifesto de
  recuperação e somente as 15 entradas Joá adicionadas ao `mint-assets.json` atual.
- Registro atual: `mansao` no catálogo e alias legado `fy_mansao`.
- Look: somente o bloco antigo do Joá foi atualizado para o pôr do sol e horizonte 3D da
  Mansão; materiais dos demais mapas foram preservados.
- Preload: uma chamada opcional `MAPS[currentMap]?.preload?.()` foi encaixada no fluxo
  vigente.
- Jogo compartilhado: somente a semântica vertical necessária ao CTF e aos bots foi
  aplicada (`ctfLayerContains`, waypoint/guard/target com camada). Não foi substituído o
  runtime da branch antiga.
- Áudio: o extensor idempotente atual passou a aceitar `mansao` quando ausente, usando
  doadores já existentes. Nenhuma voz, música, manifesto curado ou material compartilhado
  foi substituído.
- Catálogo e gates: entrada PT/EN, alias conhecido, `eval:mansao` e 13 réguas específicas.

Checkpoints:

- `1e84c8cc2` — cenário, assets e proveniência;
- `386949d86` — integração mínima no jogo atual;
- `3d8b9b1f1` — gates causais;
- `1b80ff99e` — documentação derivada regenerada;
- `2df6cdedf` — captura parametrizada 3:2/16:9, WebGL2 e veto a renderer por software.

## RED, correções e mutantes

Antes da integração, `mansao-runtime-check` falhou porque o pedido `mansao` carregava
`praca_poderes`. Depois do primeiro GREEN estrutural, `mansao-ctf-check` encontrou um bug
real na composição com a `main`: o bot no térreo pulava o waypoint coincidente do
mezanino. A integração das camadas tornou contínua a subida ao MEZZO. O último RED foi o
pack de ambiência ausente; o extensor foi ampliado sem tocar em áudio já curado.

Foram mordidos mutantes de spawn sólido, grafo partido, camada ausente, spawn invertido,
cobertura sem suporte, parede ausente, teto baixo, salto de patamar, times presos em 4×4,
água bloqueada, piscina sem cuba, planta sobre caminho, hardscape chapado, GLB 2×, asas
travadas, praia sem areia, horizonte raso, oceano sem depth-fade e oceano sem espuma.

## Gates e resultados

| Gate | Resultado observado |
|---|---|
| instalação limpa | `npm ci`, 404 pacotes, zero vulnerabilidades |
| `npm run eval:mansao` | verde; 528 nós, 7.110 arestas, zero nó ocupado e zero aresta bloqueada |
| CTF vertical | verde; subida contínua até MEZZO: serviço 4,17 s, spawn 20,33 s |
| carga determinística, 3 seeds × 30 s | 5×5: 9 bots, stuck 2,0%, eff 0,387, spinRoam 0,070; 8×8: 15 bots, stuck 0,9%, eff 0,448, spinRoam 0,057 |
| `eval:mapid` | verde; 17 mapas e alias/preview coerentes |
| `eval:mapcontrato` | verde; Joá conectado |
| `eval:pickuparma` | verde; 62 pickups no Joá |
| `eval:ctfwin` | verde; 4 bandeiras e alvo 4 |
| `npm run build` | verde |
| `npm run check:deploy` | 39/39 verde depois do checkpoint dos docs gerados |

A primeira execução do portão marcou 38/39: `eval:docsautoria` recusou medir enquanto
`docs/docs/colaborar.md` e os derivados ainda estavam sem commit. Depois do checkpoint
`1b80ff99e`, o mesmo portão passou 39/39. Isso não foi mascarado por mudança de limiar.

## Browser, desempenho e evidência visual

Servidor local mantido em:

`http://127.0.0.1:8181/?debug=1&auto=P,mst&map=mansao&perfilauto=0&ctf=1`

Capturas executadas em processo Chrome novo, qualidade média, WebGL 2.0 real via
`ANGLE Metal Renderer: Apple M4 Pro`, sem SwiftShader:

| Caso | Viewport | Times reais | p50 | p95 | máximo | Erros JS | Assets essenciais ausentes |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3:2 | 1536×1024 | 5×5 | 8,4 ms | 17,1 ms | 125,1 ms | 0 | 0 |
| 16:9 | 1600×900 | 8×8 | 8,4 ms | 17,1 ms | 17,7 ms | 0 | 0 |

O máximo de 125,1 ms no caso 3:2 é um único outlier acima do p95; não foi apagado nem
usado para afirmar ausência total de long frame. O caso de maior carga, 8×8, ficou com
máximo de 17,7 ms nesta amostra.

Recibos e PNGs locais ignorados pelo Git:

- `artifacts/joa-main-r2/browser/3x2/capture.json` e nove vistas mais gameplay;
- `artifacts/joa-main-r2/browser/16x9/capture.json` e nove vistas mais gameplay;
- `artifacts/joa-main-r2/eval-mansao.log`.

A inspeção das vistas confirma fachada/garagem com volumes apoiados, interior com paredes
e dois acessos de escada, mezanino com piso/guarda, piscina e deck, praia, coqueiros,
rebentação, morros/ilhas em camadas e o avião GLB com faixa texturizada em movimento.
Essas imagens tornam o mapa revisável; não substituem andar, mirar e disputar as quatro
bandeiras no playtest humano.

Três 404 compartilhados foram registrados: `folha-pixaca-03.png`, `-04.png` e `-05.png`.
Eles já pertencem ao carregamento genérico, não são assets essenciais do Joá, não geraram
`pageerror` e não foram alterados nesta lane.

## Próximo mapa por impacto: Piscina da Treta

A Piscina é a próxima fila humana porque é descrita pelo dono como o mapa mais jogado e o
problema original atingia circulação, cobertura e congestionamento 8×8. O trabalho já
existe no draft PR #566 (`codex/piscina-rework-stack@3aed96c7e`), está `CLEAN/MERGEABLE`
e o CI remoto está verde. Não há evidência causal para outra reautoria antes do playtest.

Estado técnico confirmado no ledger da própria lane: 122 nós, 593 arestas, 24/24 rotas
spawn→bandeira, três eixos de circulação e 5×5/8×8 medium/low em Chrome/Metal/WebGL2. A
pendência é PIS7, exclusivamente o aceite humano.

Teste local já disponível:

`http://127.0.0.1:8152/?debug=1&map=piscina_treta&auto=P,mst`

Fila objetiva: jogar uma rodada 8×8 e avaliar a saída pelos três vãos dos vestiários, a
alternância entre piscina e corredores oeste/leste e se a concentração inicial se desfaz
sem engarrafar. Se passar, #566 é o próximo candidato de merge. Se falhar, o feedback deve
nomear posição e direção; a geometria volta a RED antes de nova alteração.

## Continuação

1. Fazer push desta branch e abrir um draft PR que declare supersessão do #561.
2. Aguardar CI remoto sem corrigir dívida compartilhada fora do escopo.
3. O dono testa Joá na URL 8181 e devolve feedback visual/jogável.
4. Em paralelo humano, testar Piscina na URL 8152; não iniciar nova reautoria estrutural
   antes desse resultado.
5. Merge e deploy dependem de autorização posterior; esta lane não executa nenhum deles.
