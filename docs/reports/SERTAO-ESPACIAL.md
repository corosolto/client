# Régua espacial do Sertão

Iniciado em 2026-09-05; atualizado em 2026-09-06. Instrumento: `tools/eval/sertao-spatial-check.mjs`.

## Contrato e fronteira

Régua pedida para acompanhar a correção do mapa em `codex/sertao-astra`: paredes procedurais RGBA opacas; nenhuma planta rolante ou mudança de colisores entre t0 e t20; casas com tag/OBB e rotação coerentes; três percursos oeste/centro/leste separados no miolo; coordenadas de spawn, pickups e CTF preservadas. A igreja usa footprint externo informado pelo coordenador, **4.35×6.30 m totais**, com sobra máxima de 0.25 m por lado.

O harness constrói o mapa real em Node com `window` temporariamente ausente, forçando proxies e `texProcedural`. `document` continua o stub do harness. Não há renderer, carregamento de GLB, navegação de personagem ou teste de bala. Um resultado verde é **contrato do mundo Node**, não aprovação do footprint visual dos GLB, da circulação real ou de FPS.

## Cláusulas

| ID | Medida e limite | Por que existe |
|---|---|---|
| SP1 | Pelo menos 2 DataTextures `oeste-adobe*` usadas em paredes; formato RGBA, tamanho width×height×4; todos os alphas 255, RGB não vazio e pelo menos 2 cores | Pega a escrita no offset errado e não aceita simplesmente tornar uma textura preta opaca |
| SP2 | Zero objetos `tumbleweed-*`; colisores idênticos após updates a cada 0.5 s de t0 a t20 | Remove western e obstáculos móveis; amostragem intermediária pega ciclos que voltam à origem em t20 |
| SP3 | 10 grupos `sertao-casa-*`; exatamente um colisor com tag igual ao nome por casa; OBB `{cx,cz,hx,hz,ry,cos,sin}` em campos planos do colisor (ou `obb` aninhado), finito, positivo e coerente com posição/yaw do grupo e envelope AABB | Fecha a diferença de rotação entre os ramos GLB/proxy; a prova executada aqui é do proxy |
| SP4 | ≥100 nós; três caminhos simples entre nearest(0,-41) e nearest(0,41); seção central `|z|<1.7`: oeste `x≤-12`, centro `|x|<12`, leste `x≥12`; nenhuma partilha de nós no interior `|z|≤30`, ao menos 5 nós internos por rota | Um único caminho não comprova três rotas. Desvios fora da seção central são permitidos; só bases compartilham acessos |
| SP5 | 4×4 spawns, mesmos x/z/yaw do baseline | Impede alterar spawn para esconder problema de layout |
| SP6 | 16 pickups, mesmos tipos e x/z | Preserva distribuição de armas |
| SP7 | 3 CTF, mesmos IDs e x/z | Preserva objetivos |
| SP8 | Igreja: semi-extensões de referência 2.175×3.15 m; sobra por lado ≤0.25 m e falta ≤0.10 m; centro igual ao grupo | Reduz volume invisível. Footprint externo não é revalidado em Node |

SP4 procura uma testemunha de três caminhos com BFS próprio, candidatos de passagem central, permutações de ordem das rotas e travessia em ambos os sentidos. Cada nova rota exclui os nós internos já usados. Não usa `world.findPath` como oráculo. Valida IDs de arestas, comprimento ≤5.11 m (passo atual 3.4 m e alcance 1.5×) e 9 pontos internos por aresta contra a seção central da rota. Os caminhos retornados são conferidos quanto a extremos, simplicidade e interseção. O resultado positivo é uma prova concreta de três caminhos nesse grafo. Resultado negativo significa que a busca delimitada não encontrou testemunha; não é prova matemática de inexistência. Há teto de 20 mil tentativas. Não raycasta obstáculos: um grafo que atravesse geometria ainda requer teste runtime/colisor.

SP5–SP7 congelam expectativas no instrumento a partir do HEAD `49441895bebdfa328a228de142d0015b4597db9f`, não da saída atual. Ordem de arrays não importa; objetos adicionais, ausentes ou coordenadas alteradas reprovam. Labels de CTF não são coordenadas e não são congelados.

## Baseline vermelho — antes do patch do mapa (instrumento inicial)

Fonte do baseline: HEAD `49441895bebdfa328a228de142d0015b4597db9f`, mapa ainda sem correções. Comando `node tools/eval/sertao-spatial-check.mjs --self-test` executado antes do patch; saída retornou **2** por mutantes inconclusivos em cláusulas já vermelhas. Isso é dado de diagnóstico esperado, não falha escondida nem exigência de manter o baseline verde.

| ID | Resultado | Evidência |
|---|---|---|
| SP1 | FALHA | `oeste-adobe` e `oeste-adobe-paupique`: 128×128 cada; 16.384/16.384 alphas errados; apenas **1 pixel RGB não zero** por textura |
| SP2 | FALHA | 3 tumbleweeds, 111 colisores; primeira mudança em t=0.5 s |
| SP3 | FALHA | 10 casas; zero colisores identificados por tag de casa; todas as 10 sem contrato OBB auditável |
| SP4 | FALHA | 387 nós; rotas oeste **30**, centro **28**, leste **0** nós; miolos 11/11/0 nós |
| SP5 | PASSA | Spawns 4×4 preservados |
| SP6 | PASSA | 16 pickups preservados |
| SP7 | PASSA | 3 pontos CTF preservados |
| SP8 | FALHA | Semi-extensões igreja 4.4×6.7 m; sobra por lado **2.225 m / 3.55 m** sobre footprint real informado |

Hash SHA256 dos colisores serializados no baseline SP2:

- t0: `5c5bd6f31eab72a1ef94ee3f33db40741319332dbf55d426d27a7243df28c371`
- t20: `a0ce9fce7b8d4109aa8efef99738b7d9b15638aa546f660ed5fca671db1405a7`

A primeira sondagem rápida tinha 27 nós no centro; o instrumento definitivo exige também que a aresta inteira respeite a faixa e encontrou uma alternativa com **28**. Não houve mudança de mapa entre essas duas medições.

Coordenadas preservadas: E x=(-12,-4,4,12), z=-41, yaw=0; B x=(12,4,-4,-12), z=41, yaw=π. CTF E=(-12,-34), MID=(0,2), B=(12,34). Pickups: sete tipos `awp/ak/m4/shotgun/mp5/deagle/pistol` em x=-12+4i,z=-40 e x=12-4i,z=40; extras deagle=(-2,0), shotgun=(2,0).

## Mutantes independentes

Cada execução parte de outro `MAPS.velho_oeste.build`, altera estado em memória e volta a medir. Nenhum mutante força um booleano ou edita a saída da medição. Para ser MORDIDO, apenas a cláusula alvo pode mudar PASSA→FALHA; as demais devem manter seu veredito. Dados diagnósticos derivados podem variar: mudar uma tag altera o hash SP2, mas não a estabilidade entre t0/t20. Se o alvo já reprova o mundo real, o resultado é **INCONCLUSIVO**, não “mordido”. Não há conserto artificial do baseline nem fixture normalizada.

| Mutante | Mutação real | Alvo | Baseline |
|---|---|---|---|
| `alpha-zero` | Zera byte alpha da DataTexture de parede | SP1 | INCONCLUSIVO |
| `tumbleweed` | Adiciona grupo de planta rolante à cena | SP2 | INCONCLUSIVO |
| `colisor-movel` | Encapsula update e desloca `minX` de um colisor ao longo do tempo | SP2 | INCONCLUSIVO |
| `casa-yaw` | Gira grupo de casa em 0.37 rad sem girar OBB | SP3 | INCONCLUSIVO |
| `casa-tag` | Remove associação nominal de colisor de casa | SP3 | INCONCLUSIVO |
| `casa-obb` | Aumenta semi-extensão OBB sem ajustar envelope | SP3 | INCONCLUSIVO |
| `rota-leste` | Corta arestas dos nós leste próximos de z=0 | SP4 | INCONCLUSIVO |
| `spawn-deslocado` | Soma 1 m ao x de um spawn E | SP5 | MORDIDO, só SP5 |
| `pickup-deslocado` | Soma 1 m ao x de um pickup | SP6 | MORDIDO, só SP6 |
| `ctf-deslocado` | Soma 1 m ao z do CTF E | SP7 | MORDIDO, só SP7 |
| `igreja-excesso` | Aumenta footprint do colisor da igreja | SP8 | INCONCLUSIVO |

## Execução e próxima validação

```sh
node tools/eval/sertao-spatial-check.mjs
node tools/eval/sertao-spatial-check.mjs --json
node tools/eval/sertao-spatial-check.mjs --self-test
node tools/eval/sertao-spatial-check.mjs --mutante=rota-leste
```

Execução normal: exit 0 somente se todas as cláusulas passam; exit 1 para baseline vermelho. Mutantes: exit 0 somente se todos os solicitados são mordidos isoladamente; exit 1 se há sobrevivência/interferência; exit 2 se há alvo já vermelho ou argumento inválido. `--json` inclui caminhos por IDs para depurar o flanco leste sem despejar o grafo inteiro.

Próximo passo: responsável único pelo browser verifica GLB, footprint, circulação, spawns, pickups e CTF. Esta frente editou somente o instrumento e este relatório; nenhum commit.


## Revisão do instrumento SP3/SP4 e validação após patch

O schema real do engine guarda OBB em campos planos; a primeira versão do instrumento esperava `c.obb`. SP3 foi corrigido para aceitar o schema de runtime, sem mudar a matemática dos limites. Isso era divergência de formato do teste, não falha adicional do mapa.

A faixa rígida `|z|≤20` da primeira SP4 confundia um desvio legítimo junto das casas com inexistência de rota leste. O mapa corrigido tem um percurso leste que chega a **x=8.6 m** dentro dessa banda, mas cruza a seção central a leste de x=12. A versão atual exige separação por região apenas na seção de passagem central; em compensação, proíbe partilha de nós em uma área maior, `|z|≤30`, e verifica três testemunhas completas simultaneamente. Não foi removida a exigência de três rotas.

Para verificar que a revisão não apagou o defeito original, a versão atual do instrumento foi executada sobre `git show 49441895:public/js/map_velho_oeste.js`, importado **em memória** com os imports relativos resolvidos; o checkout não foi restaurado nem escrito. Baseline antigo continuou com **SP1/2/3/4/8 vermelhos**, **SP5/6/7 verdes**. SP4 antiga: 387 nós, **4.464 tentativas**, nenhuma tripla disjunta encontrada (sem atingir o teto). Isso não prova inexistência absoluta, apenas falta de testemunha na busca definida.

No mapa corrigido, `node tools/eval/sertao-spatial-check.mjs --self-test` retornou **exit 0**:

| Cláusula | Evidência após patch |
|---|---|
| SP1 | 2 texturas, zero alphas inválidos, 16.384 pixels RGB preenchidos em cada; 21/12 cores |
| SP2 | Zero plantas rolantes; 108 colisores; nenhuma mudança em 40 updates até 20 s |
| SP3 | 10 casas com tags únicas e OBB/yaw/AABB coerentes |
| SP4 | 401 nós; caminhos oeste/centro/leste com **29/26/30 nós**; **18/18/21 nós internos**, zero compartilhamento no interior; testemunha achada em 3 tentativas |
| SP5–7 | Coordenadas de 8 spawns, 16 pickups e 3 CTF preservadas |
| SP8 | Semi-extensões igreja 2.18×3.15 m; sobra **0.005/0 m** por lado |

Passagens centrais das testemunhas SP4, em z≈0: oeste **x=-28.8**; centro **x=1.8**; leste **x=18.8 e x=15.4**. Os IDs completos estão disponíveis por `--json`. Não foi necessário mudar posição de casas nem declarar o flanco inexistente.

SHA256 dos colisores tanto em t0 quanto em t20: `801944757a23450e75619e14659ed6745166d3da44d92d5d9ad3910ca3f1aa0d`.

**11/11 mutantes mordidos isoladamente**: `alpha-zero`, `tumbleweed`, `colisor-movel`, `casa-yaw`, `casa-tag`, `casa-obb`, `rota-leste`, `spawn-deslocado`, `pickup-deslocado`, `ctf-deslocado`, `igreja-excesso`. Todos operaram mundos novos e estado real em memória. Nenhuma cláusula não alvo mudou de veredito.

Verificação sintática: `node --input-type=module --check < tools/eval/sertao-spatial-check.mjs` passou. Nesta instalação, `node --check arquivo.mjs` isoladamente anunciou parse CommonJS; a execução ESM do script e a checagem por stdin foram bem-sucedidas.

**Estado final desta frente: contrato Node verde, mutações verificadas; GLB/runtime e imagem ainda não aprovados por este relatório.**

## Inspeção adicional de instancing/paisagem — somente leitura

Pedido posterior do coordenador: conferir `public/js/map_sertao_landscape.js` sem browser. Construídos dois mundos Node reais, com batching ligado/desligado por `location.search`, e comparadas as instâncias expandidas. O root recebeu translação (2,3,4) e rotação (0.1,0.2,0.3) para verificar também composição de matrizes com o pai.

- **2.047/2.047 meshes expandidos correspondentes**, zero sem par; 236 grupos de geometria/material em ambas as variantes.
- Comparados bytes de posição/índice da geometria, cor/mapa/bump/roughness/side do material, cast/receiveShadow e matriz world. Maior diferença absoluta de componente de matriz: **7.23e-7**, compatível com armazenamento Float32 de instâncias; tolerância 1e-4. Comparação de strings arredondadas inicialmente diferiu em limites de arredondamento; a comparação numérica pareada resolveu essa diferença sem alterar o mapa.
- Três lotes decorativos com **48, 92 e 4** instâncias. O código seleciona somente meshes sem nome diretamente sob root, exclui instâncias e occluders; usa a matriz local e compartilha geometria/material. Não foi encontrada regressão de transformação nesse mundo proxy.
- **0/1.100 centros** dos ramos instanciados de `sertao-caatinga-distante` dentro dos bounds jogáveis. A medida é dos centros, não dos extremos de cada ramo nem da visibilidade dos jogadores.

Nenhuma aprovação de visual, GLB, draw calls reais ou frame time decorre desse teste. A paisagem autoral e o novo material precisam das imagens finais; varandas/GLB ainda precisam de colisão e raycast no browser. Nenhum arquivo de runtime foi editado nesta inspeção.

## SP9: corpo e volume visual nos centros CTF

O `map-check` encontrou um barril de 1,08 m sobre o centro B, `[12,34]`, já
presente em `49441895`. O coordenador moveu somente esse barril para `[14,34]`.
SP7 continua verificando que as coordenadas das três bandeiras não mudaram;
SP9 acrescenta uma verificação física independente em cada centro atual:

- `Game._collide` real, raio do jogador de 0,38 m: nenhum deslocamento acima de
  1e-6 m é permitido. A tolerância absorve somente erro numérico.
- Raycast vertical contra malhas visíveis do root, incluindo instâncias,
  partindo de 1,5 m acima do chão até 0,01 m abaixo dele. Altura de corpo de
  1,5 m e degrau máximo de 0,30 m acompanham a física de `Game._collide` e a
  régua MAP1. Superfícies declaradas `nonSolidSurface` ficam fora da sonda.
  O maior topo acima do chão não pode exceder o degrau.

```sh
node tools/eval/sertao-spatial-check.mjs --self-test --json > artifacts/sertao-astra/logs/spatial-final-ctf-self-test.json
```

Validação após o deslocamento: **SP1–SP9 verdes e 14/14 mutantes mordidos
isoladamente**, exit 0. Nos três centros, o deslocamento do corpo foi zero;
penetração MID/B zero e E 7,33e-15 m, erro numérico do plano do chão.

| Mutante SP9 | Deslocamento do corpo em B | Penetração visual em B | Cláusulas vermelhas |
|---|---:|---:|---|
| `barril-no-ctf` | 0,38 m | 1,08 m | Somente SP9 |
| `barril-sem-colisor` | 0 m | 1,08 m | Somente SP9 |
| `colisor-sem-barril` | 0,38 m | 0 m | Somente SP9 |

Os mutantes inserem malha e/ou colisor no mundo recém-construído. Não alteram
as coordenadas CTF nem uma fixture de resultados. As versões com só malha e
só colisor comprovam que as duas medições mordem independentemente. Os valores
completos de cada alvo agora acompanham as mutações no campo `measurement`.

O mutante SP7 `ctf-deslocado` passou a mover E de z=-34 para z=-35, em vez de
z=-33: o destino antigo coincidia com outro barril e acionaria SP9 junto.
Continua sendo um deslocamento real de um metro e reprova somente SP7.

SP9 verifica os centros, não toda a área dos anéis de captura. Node não
carrega GLBs nem simula captura, combate ou jogadores reais. O problema
herdado de 1,08 m foi resolvido nas sondas; validação browser e travessia são
evidências separadas do coordenador. Os JSONs anteriores do `map-check` foram
preservados como snapshots históricos, sem nova execução pesada nesta etapa.
