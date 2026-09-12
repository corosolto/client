# Lajes — entrega local para revisão

Trabalho isolado de 06/09/2026 sobre PR #438, base `bb37c048` de `origin/map2/lajes`.
Branch `codex/lajes-visual`, worktree `/Users/ruben/csbrasil/worktrees/lajes-visual`.
Sem push, merge, deploy ou alteração da branch original. **Não aprovado para integração:**
a crítica visual independente ainda reprova o conjunto e performance permanece pendente.

## Antes e depois

O registro executa `map_lajes_authored.js`; a antiga régua visual verificava o
builder legado. A nova régua reproduziu setas inclinadas, relevo na face interna,
pneus/troncos sem oclusão e visão direta entre os spawns. O teste de movimento
mostrou que o grafo apontava para dentro de piscina e corrimãos, apesar do gate
anterior verde. A revisão visual encontrou repetição, grandes planos sem função
clara e anéis CTF grossos atravessando vãos.

Correções entregues:

- Relevo na face exterior, setas planas, oclusão dos pneus/troncos e proteção entre
  os spawns. Fios sem suporte removidos e varal retirado da travessia do spawn sul.
- Reboco/concreto CC0 do acervo local, diferenciação dos spawns e acabamento dos
  poços de escada. Nenhuma mídia externa importada; fontes e atribuições já existentes
  foram mantidas. Pesquisa e inventário em [referências](LAJES-VISUAL-REFERENCIAS.md).
- Anéis CTF planos e recortados nas lajes, mantendo raio de captura4,5m. Callback
  opcional de Game aplicado somente em Lajes, com revisão independente dos controles.
- Grafo filtrado por corpo real, desvios em torno dos obstáculos, tanque e piscina
  oeste deslocados0,20m com seus colisores, abertura de corrimãos nas junções apoiadas.
- Juntas de tábuas agrupadas por ponte e cache de materiais pelo repeat UV já usado,
  sem reduzir texturas ou mudar limites de testes.

As nove câmeras usam1536×1024, FOV70, qualidade med; poses/boot acompanham cada série.
As imagens são do jogo com GLBs carregados; não são renderizações substitutas.

| Vista | Antes | Depois V3 |
|---|---|---|
| Spawn norte | [PNG](../../artifacts/lajes-visual/baseline/spawn-norte.png) | [PNG](../../artifacts/lajes-visual/visual-v3/spawn-norte.png) |
| Spawn sul | [PNG](../../artifacts/lajes-visual/baseline/spawn-sul.png) | [PNG](../../artifacts/lajes-visual/visual-v3/spawn-sul.png) |
| Praça, chão sul | [PNG](../../artifacts/lajes-visual/baseline/praca-do-chao-sul.png) | [PNG](../../artifacts/lajes-visual/visual-v3/praca-do-chao-sul.png) |
| Praça, chão norte | [PNG](../../artifacts/lajes-visual/baseline/praca-do-chao-norte.png) | [PNG](../../artifacts/lajes-visual/visual-v3/praca-do-chao-norte.png) |
| Praça, laje leste | [PNG](../../artifacts/lajes-visual/baseline/praca-da-laje-leste.png) | [PNG](../../artifacts/lajes-visual/visual-v3/praca-da-laje-leste.png) |
| Praça, laje oeste | [PNG](../../artifacts/lajes-visual/baseline/praca-da-laje-oeste.png) | [PNG](../../artifacts/lajes-visual/visual-v3/praca-da-laje-oeste.png) |
| Descida norte | [PNG](../../artifacts/lajes-visual/baseline/descida-norte.png) | [PNG](../../artifacts/lajes-visual/visual-v3/descida-norte.png) |
| Beco | [PNG](../../artifacts/lajes-visual/baseline/beco-varal.png) | [PNG](../../artifacts/lajes-visual/visual-v3/beco-varal.png) |
| Laje oeste | [PNG](../../artifacts/lajes-visual/baseline/laje-oeste.png) | [PNG](../../artifacts/lajes-visual/visual-v3/laje-oeste.png) |

V3 recebeu crítica independente sem consulta ao código: materiais, degraus e
anéis melhoraram, descida norte aprovada localmente, mas **conjunto reprovado**.
Persistem fachadas repetidas, destinos dos acessos pouco claros e laje oeste sem
função doméstica convincente. [Parecer completo](LAJES-VISUAL-CRITICA-V3.md),
[baseline](LAJES-VISUAL-CRITICA-ANTES.md) e [V2](LAJES-VISUAL-CRITICA-V2.md).
Figuras de jogadores aparecem nas capturas; não há aprovação quantitativa do
contraste contra todos os materiais/sombras nem de toda oclusão do skyline.

## Circulação real e réguas

`movement-final-driver/movement.json` comprova três percursos com `_updatePlayer`
e `_collide`, somente entrada W/Shift, sem Space ou reposicionamento intermediário:

| Percurso | Resultado | Chamadas reais a `_collide` |
|---|---|---:|
| Lajes oeste, norte→sul | passou |2764|
| Lajes leste, norte→sul | passou |2713|
| Descida norte→praça→ACESSO SUL→laje sul | passou |13184|

Prova separada de guarda/salto/queda em `physical-v2/guard-jump-fall.json`: corpo
inicia sobre laje confirmada y5,2, para diante da guarda, pula, cai e termina no
térreo y0. Mantle real registrou sete amostras na escada;12/12 pickups possuem
posição livre ao alcance real e os quatro centros CTF estão livres. Isso prova
acesso geométrico; não substitui uma partida humana de captura/coleta. A primeira
tentativa de guarda começou sobre vão e foi explicitamente rejeitada no ledger.

- Todos os11 gates Node `eval:lajes-*` passaram: rooftop, visual, nav,
  ctf-surface, authored, spatial, gap, circuito, antitrap, vertical e bots.
  `eval:lajes-browser -- --fotos=0 --movement` passou na rodada final.
- LN1/LN2:15 nós ocupados/28 arestas bloqueadas antes;0/682 e0/1512 depois.
- Seis mutantes LVA, mutante de nó na piscina e mutante do anel global reprovaram
  as cláusulas pretendidas. Restaurações verdes. LCTF1:1612/3232 triângulos com
  centro sobre vão antes;0/702 depois, anel plano. Nenhum limiar afrouxado.
- LS2 preservou duas rotas superiores. LV1 ficou entre1,16× e1,49×, limite1,50×:
  a margem B→R é pequena. `map-check` também passou.
- BUG-75 continua: bots em combate quase não descem (1/21 nesta rodada); sem
  combate11/21 chegaram ao chão,0/21 à praça. O gate atual não exige circulação
  na praça sob combate. Verde não significa que esse problema foi resolvido.
- O pé da DESCIDA SUL não possui conexão somente por nós baixos até a praça no
  grafo atual. Sonda de segmentos com `_collide` encontrou saída física de40,60m
  pelo quintal, excluído deliberadamente da malha; não é uma aresta local faltando.
  As três provas usam ACESSO SUL; não certificam todas as escadas. Evidência:
  `after/gates/descida-sul-local-route.json` (amostragem0,025m, não percurso por inputs).

[Reprodução e mutantes](LAJES-VISUAL-GATE.md). Logs finais:
`artifacts/lajes-visual/after/gates/nav-final-*`; trajetórias e capturas:
`artifacts/lajes-visual/movement-final-driver/`. Artefatos volumosos ficam locais,
ignorados pelo Git; scripts e documentação estão versionados.

## Contratos, build e custo

Sintaxe, build, docs/arquitetura e skills passaram na rodada final. Contratos de
mapa/assets registrados/ambience e quatro contratos CTF passaram nos escopos
documentados. [Resultados completos e limites](LAJES-VISUAL-CONTRATOS.md).

Falhas oficiais preservadas: `assert:assets` por áudio/decalques ignorados ausentes;
`eval:map-evidence` por resolução herdada de `escadao` como `map_adao.js`;
`eval:ssr` procura caminho antigo do adaptador. O probe do handler real produzido
pelo build retornou200 e HTML nas três rotas, mas não torna o gate oficial verde.
`eval:look` cobre outros três mapas; seu verde não certifica Lajes.

Custo medido com `renderer.info.autoReset=false`, reset antes de `g.update`,
somando os passes completos. Mesmo script/URL, nove câmeras, med/FOV70:

| Medida | Antes | Depois |
|---|---:|---:|
| Maior número de chamadas (spawn sul) |4142|3954|
| Triângulos nessa vista |1928521|1896756|
| Faixa de chamadas nas nove vistas |2103–4142|2038–3954|

Contagens em `custo-comparado.json`, dados em `runtime-baseline/` e `runtime-after/`.
As chamadas diminuíram0,9–4,5%, mas população/animação não foram congeladas:
não atribuir todo delta à otimização. A série V3 força CTF e não é comparação
direta com esse baseline. Sem janela exclusiva, nenhum FPS/frame time/GPU aprovado.

Lajes não tem teto próprio em `cena-tetos`. Referências históricas pesadas:
Havan360calls/1,410Mtri, Ferrovelho620/1,170M, Piscinão860/0,870M;
Quebrada2060/1,810M já carregava ressalva de custo. Lajes segue caro e requer
orçamento próprio e nova medição exclusiva. Não há variação dia/noite em Lajes.

## Continuação

Revisar os commits locais, resolver repetição/uso doméstico e leitura de acessos
com nova prova visual, completar circulação da descida sul e investigação BUG-75,
hidratar assets pelo fluxo de procedência do projeto e alinhar os contratos
legados em frente apropriada. Só depois executar janela exclusiva de performance
e revisão humana. Nenhum destes itens foi silenciosamente aprovado.

O histórico de decisões, commits e tentativas rejeitadas está no
[ledger](LAJES-VISUAL-CONTINUIDADE.md).

## Checkpoints locais

- `f8dada79`: baseline, pesquisa e diagnóstico independente.
- `9c798af9`: relevo, setas, oclusão e nova régua visual.
- `efaeef08`: adaptador CTF e régua de superfície.
- `d041b2ba`: navegação, materiais e otimização local.
- `91f2916c`: três percursos no navegador e reprodução.
- `767dfc0b`: contratos e críticas independentes V2/V3.
- `138d3b40`: documentação gerada atualizada.

Todos possuem DCO e trailer `Agent:`. O commit deste relatório fecha a entrega.

## Lista exata de arquivos alterados

- `.gitignore`
- `ARCH.generated.md`
- `README.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/docs/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/maps/LAJES-VISUAL-CONTINUIDADE.md`
- `docs/maps/LAJES-VISUAL-CONTRATOS.md`
- `docs/maps/LAJES-VISUAL-CRITICA-ANTES.md`
- `docs/maps/LAJES-VISUAL-CRITICA-V2.md`
- `docs/maps/LAJES-VISUAL-CRITICA-V3.md`
- `docs/maps/LAJES-VISUAL-ENTREGA.md`
- `docs/maps/LAJES-VISUAL-GATE.md`
- `docs/maps/LAJES-VISUAL-REFERENCIAS.md`
- `package.json`
- `public/js/game.js`
- `public/js/lajes_ctf_surface.js`
- `public/js/map_lajes_authored.js`
- `tools/eval/ARCH.md`
- `tools/eval/lajes-browser-check.mjs`
- `tools/eval/lajes-ctf-surface-check.mjs`
- `tools/eval/lajes-nav-occupancy-check.mjs`
- `tools/eval/lajes-visual-check.mjs`
- `tools/eval/lajes-visual-measure.mjs`
