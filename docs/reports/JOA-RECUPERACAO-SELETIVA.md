# Joá / Mansão — recuperação seletiva

**Worktree:** `worktrees/joa-recuperacao`
**Branch atual:** `v2/mansao-joa-recuperacao`
**Base atual verificada:** `origin/main` em `e67addf4` (`v2.0.0-alpha.242`)
**Fontes históricas preservadas:** `astra/joa-recuperacao-seletiva` e `origin/map2/mansao`
**Método atual:** integração seletiva, gates Node, jogo local WebGL e crítica independente;
nenhum merge ou release.

## Decisão deste corte

Não há um primeiro slice de código que seja simultaneamente pequeno, coeso e seguro.
O Joá não existe no catálogo atual: recuperar uma melhoria visual isolada não muda o jogo,
e reintroduzir o mapa inteiro exige reintroduzir seu construtor, registro, prévia e contratos
de navegação em conjunto. Portanto este commit entrega a matriz de recuperação e a receita
executável para a frente seguinte, sem ocultar um merge em massa do PR #446.

## Matriz do diff histórico

| Item histórico | Estado na base atual | Recuperável neste corte? | Motivo |
|---|---|---:|---|
| `public/js/map_mansao.js` (1.333 linhas) | ausente | não isoladamente | é o único construtor do mapa; sem registro não há rota jogável para validar |
| entrada `mansao` em `public/js/maps.js` | ausente | não isoladamente | muda menu, rotação, link e pré-carregamento; exige prévia e mapa válido |
| céu Joá em `public/js/look.js` | existe como chave obsoleta fy_mansao | não | o construtor histórico chama `applyLook(..., 'mansao')`; a chave atual cairia no look padrão |
| texturas Joá (`mansao_streetart_marble`, `tex_mansao_lawn`, `tex_deck`, `concrete_br`) | presentes | sim, como dependência | os quatro arquivos existem; não são uma melhoria visível sem o mapa |
| água / `map_sky` / `soundscape` | presentes | não | APIs existem, mas pertencem a runtime compartilhado e não devem ser arrastadas pelo mapa |
| `MANSAO_AMBIENCE_ASSETS` | ausente de `ambientlife.js` | não | o import histórico falha; a base exporta somente famílias genéricas e Amazônia/Córrego |
| cinco gates `mansao-*` | ausentes | não antes do mapa | foram escritos para uma árvore antiga e precisam de adaptação e mutação contra o construtor reintroduzido |
| `docs/maps/MANSAO-R2.md` | ausente | sim, como referência | descreve a origem, mas não prova compatibilidade com os contratos atuais |

A divergência não é só de distância de commits: `origin/main...origin/map2/mansao` marca
**442 commits apenas na main e 231 apenas no histórico**, com merge-base
`463da9ffcf9ccf645e86ce8404bdd08194bcda46`.

## Evidência local

A base atual possui 16 mapas e não lista `mansao`. Os gates da base passaram sem mudanças:

```text
npm run eval:mapcontrato  PASSA — 16 mapas; MC1/MC2/MC3 verdes
npm run eval:mapid        PASSA — M1/M2/M3 verdes
npm run eval:maprotate    PASSA
```

Isso prova o estado de partida, não torna o Joá recuperado. O mapa histórico retornava
`colliders`, `occluders`, `pickups`, `ctfPoints`, `spawns`, `groundHeightAt`, waypoints e
`stairs`; esses contratos precisam ser verificados no runtime atual antes de entrar no registro.

## Receita de produção para o próximo corte

1. Criar uma branch nova sobre a `main` então vigente. Não usar o PR #446 como veículo e não
   cherry-pickar `map2/mansao` em massa.
2. Portar somente `map_mansao.js` para um arquivo temporário e adaptar as três incompatibilidades
   explícitas: remover/substituir `MANSAO_AMBIENCE_ASSETS`, trocar fy_mansao por `mansao` na
   tabela `LOOK`, e conferir o contrato atual de água/props antes de importar no catálogo.
3. Adicionar o registro `mansao` junto com prévia e alias somente depois que o construtor puder
   ser montado. Não publicar um item de menu que abra o mapa padrão silenciosamente.
4. Adaptar os cinco gates históricos (`mansao-beach`, `mansao-garden`, `mansao-glb-fit`,
   `mansao-ocean`, `mansao-water`) e adicionar uma mutação por regra. Os gates precisam medir o
   construtor realmente selecionado por `MAPS.mansao`.
5. Rodar, nesta ordem: `npm run eval:mapcontrato`, `npm run eval:mapid`, o conjunto `mansao-*`,
   `npm run eval:bots`, `npm run check:fast` e captura visual 3:2 do interior, jardim, praia,
   respawns e rota CTF.
6. Só abrir PR quando a captura mostrar que interior, praia e linhas de tiro funcionam e um crítico
   independente revisar as imagens. Nenhum destes requisitos foi executado neste corte porque o
   mapa ainda não foi reintroduzido.

## Bloqueio e próxima ação

O bloqueio é arquitetural, não falta de asset: um PR pequeno de Joá ainda precisa ser uma
**reintrodução completa e validada do mapa**, não uma alteração cosmética. A próxima ação é
atribuir essa receita a uma lane exclusiva de reintrodução; ela não deve concorrer por
`maps.js`, `look.js`, `ambientlife.js` ou runtime com outra frente de mapas.

## Continuação autorizada: produção completa (06/09/2026)

Objetivo: retornar Joá ao catálogo, com preview, contratos, rotas, CTF, ambiência e captura offline. Done: gates locais, mutações, revisão independente, checkpoints e PR #533 atualizado; sem browser, merge ou release.

Base sincronizada por fast-forward: `9e016deb`. Fonte histórica fixa: `73cf81c8b7b7909e96dd9d5f2b9c40342ca4bf22`. Os gates históricos de praia foram recuperados antes do mapa: baseline reprovou 19 cláusulas (`artifacts/joa-recuperacao/baseline-beach.log`). A execução inicial de água encontrou dependência local ausente; `npm ci --ignore-scripts` instalou o lockfile.

Correção ao relatório anterior: faltavam 17 GLBs de props no checkout; todos existem na fonte histórica e estão sendo restaurados byte a byte. Não são novas gerações. Horizonte e fauna costeira ficam em módulos exclusivos do Joá. Autoria original será preservada por fonte/commits e hashes no inventário. Capturas Blender offline terão limites explícitos frente ao renderer WebGL.

Próximo passo: fechar import de ambiência, medir navegação por corpo real, gates de água/praia/jardim e carregar GLBs reais nas capturas.

### Marco: catálogo e contratos locais

Registry, alias fy_mansao, apresentação editorial e prévia histórica restaurados. Horizonte e ambiência isolados em módulos Joá; preload explícito. Todos os mapas passam MC1/MC2/MC3 após corrigir raio do grafo, amostragem de arestas e apoio do patamar. `mansao-runtime-check` passou com 515 nós / 6936 arestas dirigidas, zero nós ocupados, zero arestas bloqueadas e rotas spawn/CTF completas. Antes: um nó ocupado, 80 arestas bloqueadas e bandeira sobre vaso. Gates históricos água/jardim/praia/GLB-fit passam.

Assets restaurados: `docs/maps/MANSAO-RECOVERY-ASSETS.json` registra SHA256 e blob de origem. A arara histórica recebeu nome exclusivo `mansao_arara_voo.glb` para preservar o asset atual usado por `skylife.js`. Fauna de céu agora possui deformação procedural de asas, medida em vértices reais; 10 verificações verdes e mutante `asas-travadas` vermelho. Autoria da fonte: commits históricos de Ruben Marcus, incluindo `fd792d0c`, `5bbcd849`, `e8acea8a`, `5d06613e`; adaptação nesta lane por Codex.

Capturas em geração: `artifacts/joa-recuperacao/offline/scene.json`, export de 30 GLBs do disco, 826 objetos e 76 texturas. Render Blender não é aprovação de shaders WebGL. Próximo: revisão visual independente, física contínua/CTF, mutações, gates amplos e atualização do PR.

Checkpoint de origem/vegetação: `df0a1295`. Mobília e jardim complementares a seguir, sem alterar os bytes históricos.

Checkpoint de mobília: registrado no histórico da branch; céu corrigido da r2, aves e faixa seguem a mesma origem do inventário. Revisão independente em andamento achou captura entre pisos e dimensões incorretas das paredes com vãos; reprodução em `artifacts/joa-recuperacao/ctf-before.log`. Próximo passo: corrigir esses contratos antes do checkpoint de runtime.

### Marco: os dois defeitos da revisão, com régua e mutante

Ambos foram reproduzidos no Game real antes do conserto e ambos ganharam régua própria
dentro de `npm run eval:mansao`. História, números e tabela de medição em `KNOWN-BUGS.md`
(BUG-142, BUG-143, BUG-144).

**Captura entre andares (BUG-142).** `Game._updateCTF` media só XZ, então o hall térreo
capturava, contestava e guardava a bandeira do mezanino 4,5 m acima. Reprodução em
`artifacts/joa-recuperacao/ctf-before.log`. O mapa passou a declarar
`world.ctfLayerContains` e `world.configureCTFPoint`, e o `game.js` consulta a camada nos
três caminhos: soma do anel, crédito da captura e `_botCtf`. Régua
`tools/eval/mansao-ctf-check.mjs` — camada, contestação, bot e pintura apoiada no piso;
mutante `sem-camada` vermelho.

**Vãos de porta e janela (BUG-143).** `paredeComVao` só recortava no eixo X; as paredes
leste/oeste caíam no early-return e os segmentos eram escritos à mão. Medido com corpo
r=0,38 (`artifacts/joa-recuperacao/vaos-before.log`): a janela leste de 5 m era um buraco
de 10 m com dois rasgos de 2,5 m sem parede nem vidro, a porta oeste de 3 m tinha 3,5 m, e
o ripado decorativo atravessava a porta norte parando bala que o corpo cruzava. Agora
`MANSAO_VAOS` é fonte única, a parede nasce do vão nos dois eixos e o vidro nasce do mesmo
registro, com peitoril e verga. Régua `tools/eval/mansao-vaos-check.mjs` com três cláusulas
independentes — V1 corpo (`_collide`), V2 bala (raycast em `occluders`) e V3 perfil
(continuidade vertical da coluna, que é a única que enxergava as frestas de 0,30 m e
0,20 m). Mutantes `vao-largo` e `fresta-janela` vermelhos.

**Consequência achada pelo conserto (BUG-144).** Com as paredes corretas, `eval:mapcontrato`
MC3 continuou vermelho só no mansao: 8 nós ilhados. A sala sob o mezanino tinha uma única
fresta de 0,86 m entre a divisória da cozinha e o corrimão da escada — existia para o
jogador e não para o bot. A divisória passou a parar em x=-5,8. Depois: 528 nós, 7.104
arestas dirigidas, zero nós ocupados, zero arestas bloqueadas, zero ilhados.

Ambiência local do mapa entrou na tabela curada de `tools/audio/fab-game-local.mjs`
(mar, vento de encosta e vegetação), e `eval:audiofablocal` voltou ao verde com 17 mapas.

**Verde local:** `eval:mansao` (9 réguas), `eval:mapcontrato`, `eval:mapid`,
`eval:maprotate`, `eval:mappreview`, `eval:mapjson`, `eval:audiofablocal`,
`eval:botsim-golden`, `docs:check`, `arch:check`. `botsim 60 s` no mansao: stuck 2,9%,
entre escadão (2,1%) e amazônia (3,5%).

**Vermelho herdado, não desta lane:** `audio:check` (pack privado ausente na máquina) e
`eval:grafitelayout` F2 do **escadao** — `map_escadao.js` está intocado por esta branch
(`git diff origin/main` vazio) e a regeneração pertence à lane do Escadão.

**O que este PR NÃO é:** aprovação visual. Nada foi aberto em navegador; os números acima
são de arnês em node e de render Blender offline, que não valida shader WebGL. Interior,
jardim, praia e linhas de tiro seguem pendentes de crítica humana sobre captura real.

### Marco: correção de teto e CTF entre camadas

O teste de CTF que dependia de `_ctfMoving` foi ajustado para refletir o comportamento real do bot no andar errado. A cobertura sobre o mezanino foi elevada e o contrato de salto passou a medir do olho do jogador no mezanino, não do piso do térreo. O runtime local voltou verde em `mansao-runtime-check` com 515 nós e 6932 arestas dirigidas; `mansao-ctf-check` também passou.

Gates verdes nesta rodada: `mansao-runtime-check`, `mansao-ctf-check`, `mansao-beach-check`, `mansao-garden-check`, `mansao-glb-fit`, `mansao-ocean-check`, `mansao-water-check`, `mansao-ambience-check`.

Gate amplo `npm run check:fast` ainda estava em execução quando este marco foi registrado e já sinalizou falhas em `eval:mapcontrato`, `docs:check`, `arch:check`, `audio:check`, `eval:audiofablocal`, `eval:grafitelayout` e `eval:docsautoria`. Esses itens precisam de leitura separada antes de qualquer conclusão de integração total.

### Marco: build de /maps consertado (PR #533, 06/09/2026)

O CI do PR #533 reprovava o build com `TypeError: Cannot read properties of undefined
(reading 'nome')` em `/maps`. Reproduzido localmente antes do conserto com Node 23
(`npm run build`): a entrada `mansao` entrou no dataset `MAPAS` de `src/data/jogo.ts`,
mas o overlay `MAP_EN` de `src/pages/maps.astro` não ganhou a chave — `en(m.id).nome`
retornava `undefined.nome` no JSON-LD da página. O `/mapas` (PT) não quebra porque lê
o dataset diretamente.

Correção mínima de catálogo: entrada `mansao` em `MAP_EN` (nome/resumo/detalhe em
inglês, mesma forma das demais). A prévia `/img/map-previews/mansao.jpg` já existia;
nenhuma mudança em `public/js/`, CTF por camada, vãos, bot graph ou gates.

Verificação nesta rodada (Node 23):

- `npm run build` — completo, `/maps/index.html` renderiza "Joá's Mansion".
- `npm run eval:mansao` — verde (suite completa, MA1–MA8 e glb-fit).
- `npm run docs:check` — DOCS1 verde (26 blocos em 33 marcadores).

Não verificado: browser/SSR ao vivo, `check:fast` completo (falhas herdadas listadas
no marco anterior seguem sem leitura nova), revisão visual humana.

### Marco: verificação local final (07/09/2026)

Com o Node empacotado do ambiente local (`.../codex-primary-runtime/dependencies/node/bin/node`):

- `npm run eval:mansao` — verde na suíte completa (runtime 528 nós/7.104 arestas,
  vãos, CTF por camada, água, jardim, praia/horizonte, oceano, GLB e ambiência).
- `npm run build` — verde; `/maps/index.html` foi prerenderizado e o pós-processamento
  concluiu sem alterações pendentes no worktree.
- `npm run check:fast` — 122/124 verdes. Os únicos vermelhos são `audio:check`
  (manifest de áudio defasado/pack privado ausente nesta máquina) e
  `eval:grafitelayout` (F2 do `escadao`, mapa fora desta lane).

O primeiro `eval:mansao` com o `/usr/local/bin/node` (v16.13.0) falhou em
`import.meta.dirname`; isso é incompatibilidade do runtime local antigo e não uma
falha do mapa. O teste válido acima usa o Node empacotado.

Após abrir a URL de debug no navegador local, a primeira partida revelou uma
incompatibilidade do Three vendorizado (`BufferAttribute` sem `setUsage`) na animação
das asas. `mansao_ambience.js` agora trata essa API opcional e mantém `needsUpdate`; a
partida reiniciada entrou na arena com HUD CTF visível (JARDIM, SALA, MEZZO e PISCINA),
sem `launch-error`. A suíte `eval:mansao` permaneceu verde depois do ajuste.

### Marco: auditoria pré-fundação e carga (08/09/2026)

Lane confirmada limpa em `640da258` antes desta rodada. `origin/main` avançou para
`38803801` (`v2.0.0-alpha.239`): 36 commits exclusivos na main, 11 na lane. PR #533
segue `CONFLICTING/DIRTY`. O `merge-tree` encontrou 14 conflitos atuais: 12 arquivos
derivados e dois autorados (`KNOWN-BUGS.md`, `package.json`). `game.js` automescla no
texto, mas o CTF por camada deve ser revalidado contra o combate final.

A fundação #540–#551 ainda não é base estável: #540 conflita com main; a pilha de mapas
#541/#542/#545/#547/#548/#550/#551 só é mergeável contra suas bases encadeadas e está
`UNSTABLE`. Nenhum conflito foi resolvido e nenhuma arte foi ampliada. Plano e inventário
completos: `docs/reports/JOA-INTEGRACAO-FOUNDATION-AUDIT.md`.

Novo gate de carga CTF, com três sementes × 30 s: 5x5 ficou em stuck 0,867%/eficiência
0,402; 8x8 em 1,967%/0,393. O mutante que força 4x4 fica vermelho. `eval:mansao`,
`eval:mapcontrato`, `eval:mapid`, `eval:maprotate` e `eval:botsim-golden` estão verdes. O map-check registra
folga mínima de 0,8 m no spawn E (área contígua 45,6 m²), risco para playtest manual.

O capturador WebGL 3:2 produziu oito quadros em
`artifacts/joa-recuperacao/runtime-3x2/`, com zero pageerror e zero asset essencial
ausente. Três 404s de `folha-pixaca-03/04/05.png`, também ausentes em origin/main,
ficaram registrados no recibo. O mezanino esparso e o horizonte simplificado pertencem
à lane de polish; não serão corrigidos aqui antes da estabilização da fundação.

### Marco: recuperação seletiva sobre a main alpha.242 (08/09/2026)

A espera pela pilha #540–#551 foi encerrada após nova auditoria: #540 continuava em
conflito e a sequência era estável apenas contra bases encadeadas. A branch limpa
`v2/mansao-joa-recuperacao` nasceu de `origin/main` em `e67addf4`; o PR #533 e sua
branch ficaram intactos. Entraram somente arquivos semânticos e assets do Joá, pequenas
integrações atuais e quinze registros mesclados em `mint-assets.json`. Os dois overlays
de Lajes e os documentos gerados antigos não foram transportados.

O runtime foi validado no jogo local. O avião usa o GLB e a textura da faixa, move-se
durante a amostra e aparece na câmera dedicada. O capturador agora guarda a partida viva
com HUD antes de congelar as nove vistas de auditoria e mede 180 frames em `low` e `med`.

A revisão adversarial encontrou spawns virados para fora, salto horizontal de waypoints
entre andares, patamar da escada de serviço com colisão duplicada, cobertura sem apoios e
vasos verdes repetidos. As cinco observações foram corrigidas e protegidas por gates ou
mutantes. Em 8x8, o stuck caiu de 17,0% na semente problemática para 0,9% na média das
três sementes; a rota contínua ao MEZZO leva 4,17 s pela escada de serviço e 20,33 s
desde o spawn.

Estado técnico: `eval:mansao`, contratos dos 17 mapas, map-check, IDs, rotação, golden dos
bots e regressões de Amazônia/Lajes verdes. Aprovação visual humana permanece um gate
separado. O horizonte low poly e a dívida global de descarte de materiais/texturas do
`Game.dispose()` ficam registrados como limites; a segunda exige desenho de ownership do
runtime compartilhado e não foi ampliada nesta recuperação de mapa.
