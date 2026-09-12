# Lajes — resultado final dos contratos

## Estado atualizado — 06/09/2026, 00:40 UTC

**Sintaxe, build, documentação, arquitetura e skills passaram na repetição final.**
O timeout de build do baseline foi superado: `npm run build` concluiu em
14,1 s, incluindo adaptador Vercel e poda. **SSR oficial continua vermelho por
um caminho legado no teste**; uma sonda separada do handler publicado pelo
adaptador passou nas três rotas SSR. Isso não é aprovação visual/FPS, deploy
ou autorização para publicar. As falhas oficiais de evidence/assets continuam
registradas; não foram escondidas nem convertidas em verde.

Referência da rodada: HEAD `efaeef08` com alterações locais do
integrador. Janela principal: 2026-09-06T00:37:47.198Z a 2026-09-06T00:38:21.020Z.
Os sete fontes monitorados não mudaram durante nenhum dos cinco passos finais;
hashes e timestamps em [final/results.json](../../artifacts/lajes-visual/contracts/final/results.json).

| Verificação final | Resultado | Evidência |
|---|---|---|
| Sintaxe | Exit 0; 3,1 s | [log](../../artifacts/lajes-visual/contracts/final/syntax.log) |
| Build | Exit 0; 14,1 s; Complete! | [log](../../artifacts/lajes-visual/contracts/final/build.log) |
| Docs | Inicialmente 13 docs geradas desatualizadas; regeneradas; novo check exit 0 | [geração](../../artifacts/lajes-visual/contracts/final/docs-generate.log), [check final](../../artifacts/lajes-visual/contracts/final/docs-check-after.log) |
| ARCH | Índice desatualizado; regenerado; novo check exit 0 | [geração](../../artifacts/lajes-visual/contracts/final/arch-generate.log), [check final](../../artifacts/lajes-visual/contracts/final/arch-check-after.log) |
| Skills | Sete links locais criados; check exit 0 | [sync](../../artifacts/lajes-visual/contracts/final/skills-sync.log), [check](../../artifacts/lajes-visual/contracts/final/skills-check.log) |
| SSR oficial | Exit 1/SSR0: procura entrypoint no layout antigo | [log oficial](../../artifacts/lajes-visual/contracts/final/eval-ssr.log) |
| Sonda SSR do handler atual | Exit 0: três rotas com 200 e corpo não vazio | [log da sonda](../../artifacts/lajes-visual/contracts/final/ssr-current-handler.log) |
| Mutação da sonda SSR | Corpo vazio foi reprovado com exit 1 esperado | [log mutante](../../artifacts/lajes-visual/contracts/final/ssr-current-handler-mutant.log) |

### SSR: distinguir defeito do gate e artefato testado

O build atual declara em
`.vercel/output/functions/_render.func/.vc-config.json` o handler
`.vercel/output/server/entry.mjs`, relativo à função. Esse arquivo existe.
O script oficial `tools/eval/ssr-render-check.mjs` ainda fixa
`dist/server/entry.mjs`, inexistente no pacote atual; portanto seu SSR0 não
indica ausência do build nesta rodada.

A [sonda](../../artifacts/lajes-visual/contracts/final/ssr-current-handler-probe.mjs) é uma cópia do gate com
**somente a resolução de ENTRY alterada**, lendo o handler da configuração.
A [procedência da substituição](../../artifacts/lajes-visual/contracts/final/ssr-probe-provenance.json) registra
o SHA do script original e o texto exato trocado. O script oficial não foi editado.
A sonda conservou o cwd dentro da função e as demais cláusulas SSR1/SSR2/SSR3.

- `/mapa`: 200, tamanho reportado 20.091; `/ranking`: 200, 16.161;
  `/u/exemplo`: 200, 14.825. O gate rotula a unidade como bytes, mas implementa
  `(await resp.text()).length`; são comprimentos de string, não bytes UTF-8.
- Nenhum erro ao consumir o stream; nenhuma chamada a
  `moduleCacheManifest()` nas fontes SSR. A mutação de corpo vazio reprovou.
- O build selecionou runtime Vercel Node 24 porque Node 23 local não é aceito
  pelo adaptador. A execução desta sonda foi Node 23 local; não simula toda
  infraestrutura de produção nem comprova banco/rede em deploy.

Próximo ajuste de ferramenta, fora desta subtarefa: tornar o gate oficial
compatível com o handler declarado pelo adaptador e manter suas mutações.
Até lá, reportar o verde da sonda separado do vermelho oficial.

### Diffs autorizados e limite das escritas

Foram executados `npm run docs` e `npm run arch` porque seus checks exigiram
regeneração. Alteraram 14 documentos gerados, 111 linhas adicionadas e 111
removidas, em relação a HEAD nesta rodada:

- `STATUS.md`
- `README.md`
- `docs/docs/comecando.md`
- `docs/docs/colaborar.md`
- `ARCH.generated.md`
- `docs/docs/stack.md`
- `docs/docs/arquitetura.md`
- `docs/docs/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `tools/eval/ARCH.md`

Amostras de diff conferidas: atualização de contagens de módulos/scripts, lista
do check:fast, tamanho do builder e linhas do índice de símbolos; nenhuma edição
manualmente escrita nesses blocos. Não houve mudança de produção por esta
subtarefa. O integrador deve incluir a regeneração no seu checkpoint; não houve
commit do revisor. `git diff --check` passou.

`tools/sync-skills.mjs` foi inspecionado antes da execução; `.agents` e
`.agents/skills` são diretórios reais desta worktree, não symlinks para estado
compartilhado. O script só criou os sete links relativos autorizados e preservou
`graphify`, que já era diretório real. O check enumera oito skills; esse texto
não significa que Graphify foi convertido em link. Nenhum hook Git ou checkout
alheio foi alterado.

### Pendências que a rodada final não fecha

O bug de resolução `map_adao.js` em evidence permanece; não foi corrigido por
esta subtarefa. O pacote de decalques sem procedência individual não foi baixado
para mudar o placar de assets. As limitações de browser, movimento, colisão e FPS
são da frente principal. O histórico abaixo preserva os resultados anteriores
para auditoria; suas frases de build pendente descrevem aquelas tentativas, não
o estado atualizado acima.

---

## Histórico — baseline e revisão CTF


Execução concluída em 06/09/2026 (Lisboa), worktree `worktrees/lajes-visual`,
branch `codex/lajes-visual`, base `bb37c048`. Node v23.6.0 por
`PATH=/opt/homebrew/bin:$PATH`. Janela UTC: 2026-09-05T23:49:09.694Z até 2026-09-06T00:11:18.305Z.

**Resultado: 21/28 passos passaram; 3 ficaram inconclusivos por timeout; 4 reprovaram. Build não concluído e SSR não validado.**
A integração visual continuava em paralelo: este é baseline global com snapshots
por etapa, não aprovação de uma revisão final de Lajes.

## Escopo e reprodução

Executados sequencialmente os scripts npm da tabela, sem interromper a sequência
por falha. Logs receberam limite de retenção de 1,5 MB; nenhum atingiu esse limite.
Metadados completos, duração, exit/signal, timestamps e hashes:
[results.json](../../artifacts/lajes-visual/contracts/results.json) e
[run-start.json](../../artifacts/lajes-visual/contracts/run-start.json).

Nenhum `eval:lajes-*`, navegador, renderizador, captura, instalação/download,
alteração de produção, hook Git ou commit foi executado por esta subtarefa.
O build padrão executou `copy-wasm` e gerou saída parcial local em diretórios
normais de build. Não houve publicação. `eval:map-evidence` chama somente
`capture-map-evidence.mjs --plan`, cujo retorno antecede import/launch do browser.
`eval:ambience` foi omitido porque lança Chromium; foi executado o contrato Node
`eval:ambience-registry`. Não foi chamado o agregado `check:fast`, pois inclui
os testes de Lajes reservados ao integrador e outras frentes fora deste escopo.

Reproduzir um passo: `PATH=/opt/homebrew/bin:$PATH npm run <script>`.
Os timeouts do orquestrador foram 180 s por check e 300 s para build; encerramento
pode exceder esse limite enquanto processos descendentes mantêm os pipes abertos.
A duração da tabela é a observada, não tempo máximo teórico.

## Placar observado

Horários abaixo são UTC, atravessando a meia-noite entre 05/09 e 06/09.

| Script npm | Resultado | Segundos | Início–fim UTC | Evidência |
|---|---|---:|---|---|
| `syntax` | INCONCLUSIVO (timeout) | 193.2 | 23:49:09–23:52:23 | [log](../../artifacts/lajes-visual/contracts/syntax.log) |
| `eval:release` | PASSOU | 89.1 | 23:52:23–23:53:53 | [log](../../artifacts/lajes-visual/contracts/eval-release.log) |
| `eval:identity` | PASSOU | 16.1 | 23:53:53–23:54:10 | [log](../../artifacts/lajes-visual/contracts/eval-identity.log) |
| `eval:shaderlog` | PASSOU | 1.7 | 23:54:10–23:54:11 | [log](../../artifacts/lajes-visual/contracts/eval-shaderlog.log) |
| `eval:shaderbudget` | PASSOU | 2.7 | 23:54:11–23:54:14 | [log](../../artifacts/lajes-visual/contracts/eval-shaderbudget.log) |
| `eval:mapid` | PASSOU | 7.2 | 23:54:14–23:54:21 | [log](../../artifacts/lajes-visual/contracts/eval-mapid.log) |
| `eval:mapjson` | PASSOU | 3.9 | 23:54:21–23:54:25 | [log](../../artifacts/lajes-visual/contracts/eval-mapjson.log) |
| `eval:mapcontrato` | PASSOU | 22.9 | 23:54:25–23:54:48 | [log](../../artifacts/lajes-visual/contracts/eval-mapcontrato.log) |
| `eval:map-source` | PASSOU | 0.6 | 23:54:48–23:54:48 | [log](../../artifacts/lajes-visual/contracts/eval-map-source.log) |
| `eval:maptex` | PASSOU | 0.3 | 23:54:48–23:54:49 | [log](../../artifacts/lajes-visual/contracts/eval-maptex.log) |
| `eval:map-evidence` | FALHOU | 0.4 | 23:54:49–23:54:49 | [log](../../artifacts/lajes-visual/contracts/eval-map-evidence.log) |
| `eval:ambience-registry` | PASSOU | 25.3 | 23:54:49–23:55:14 | [log](../../artifacts/lajes-visual/contracts/eval-ambience-registry.log) |
| `eval:asset-integrity` | PASSOU | 0.8 | 23:55:14–23:55:15 | [log](../../artifacts/lajes-visual/contracts/eval-asset-integrity.log) |
| `eval:gltf-validator` | PASSOU | 4.3 | 23:55:15–23:55:20 | [log](../../artifacts/lajes-visual/contracts/eval-gltf-validator.log) |
| `eval:props-acervo` | PASSOU | 0.7 | 23:55:20–23:55:20 | [log](../../artifacts/lajes-visual/contracts/eval-props-acervo.log) |
| `eval:propsuv1` | PASSOU | 1.6 | 23:55:20–23:55:22 | [log](../../artifacts/lajes-visual/contracts/eval-propsuv1.log) |
| `assert:assets` | FALHOU | 1.5 | 23:55:22–23:55:23 | [log](../../artifacts/lajes-visual/contracts/assert-assets.log) |
| `eval:grafite-editorial` | PASSOU | 0.7 | 23:55:23–23:55:24 | [log](../../artifacts/lajes-visual/contracts/eval-grafite-editorial.log) |
| `eval:look` | PASSOU | 6.0 | 23:55:24–23:55:30 | [log](../../artifacts/lajes-visual/contracts/eval-look.log) |
| `eval:wind` | PASSOU | 4.6 | 23:55:30–23:55:35 | [log](../../artifacts/lajes-visual/contracts/eval-wind.log) |
| `eval:softparticles` | PASSOU | 5.1 | 23:55:35–23:55:40 | [log](../../artifacts/lajes-visual/contracts/eval-softparticles.log) |
| `eval:escala-favela` | PASSOU | 6.9 | 23:55:40–23:55:47 | [log](../../artifacts/lajes-visual/contracts/eval-escala-favela.log) |
| `docs:check` | INCONCLUSIVO (timeout) | 182.1 | 23:55:47–23:58:49 | [log](../../artifacts/lajes-visual/contracts/docs-check.log) |
| `arch:check` | PASSOU | 141.1 | 23:58:49–00:01:11 | [log](../../artifacts/lajes-visual/contracts/arch-check.log) |
| `spec:check` | PASSOU | 160.1 | 00:01:11–00:03:51 | [log](../../artifacts/lajes-visual/contracts/spec-check.log) |
| `skills:check` | FALHOU | 34.1 | 00:03:52–00:04:26 | [log](../../artifacts/lajes-visual/contracts/skills-check.log) |
| `build` | INCONCLUSIVO (timeout) | 404.6 | 00:04:26–00:11:10 | [log](../../artifacts/lajes-visual/contracts/build.log) |
| `eval:ssr` | FALHOU | 7.4 | 00:11:10–00:11:18 | [log](../../artifacts/lajes-visual/contracts/eval-ssr.log) |

## Falhas e ações concretas

### Contrato de evidência: erro herdado no capturador

`eval:map-evidence` terminou com exit 1 e
`ENOENT: no such file or directory, open 'public/js/map_adao.js'`.
Em [capture-map-evidence.mjs](../../tools/capture-map-evidence.mjs:24),
`sourceFiles` constrói `map_${map.slice(3)}.js` para IDs que já não possuem
prefixo: `escadao` vira `adao`. O caso especial de Lajes não corrige os demais.
O gate falha antes de comparar imagens/fontes; **não comprova que o manifest está
atualizado ou desatualizado**.

Evidência de herança: capturador, gate e tabela de câmeras não diferiam de HEAD
na inspeção; `git ls-tree HEAD public/js/map_adao.js` não retornou arquivo.
Próximo passo do integrador: corrigir resolução de nomes usando IDs atuais,
executar plano sem browser e então reexecutar contrato após a captura aprovada.
Nenhum ajuste foi feito por esta subtarefa.

### Assets privados/ignorados ausentes: ambiente incompleto

`assert:assets` terminou com exit 1: `public/audio/manifest.json` ausente e
196 de 197 decalques do acervo faltando; exemplos no log incluem
`alfabeto-bolha.png`, `alfabeto-bolha2.png` e `alfabeto-escuro-01.png`.
`git check-ignore` confirmou manifest de áudio e decal de exemplo ignorados;
[STATUS.md](../../STATUS.md:53) já documenta conteúdo de áudio/decalques fora do Git.
O check de assets estava igual a HEAD. Isso é limitação da worktree, não prova de
regressão introduzida em Lajes.

Próximo passo: hidratar os pacotes pelo fluxo autorizado do projeto e repetir
`assert:assets`. Não executar fetch/instalação dentro desta subtarefa. O build
padrão não encadeia esse gate; logo, mesmo um build verde não provaria completude
desses recursos.

### Skills: links locais ausentes

`skills:check` terminou com exit 1 por falta de links em `.agents/skills/`:
`asset-review`, `bug-hunt`, `csbrasil`, `faction-pipeline`, `gauntlet-fps`,
`regua`, `revisao-antes-do-push`. O erro recomenda `npm run skills:sync`.
É configuração local do checkout, separada da qualidade visual do jogo. A ação
apropriada em frente autorizada de ambiente é sincronizar e repetir o check;
nenhum hook ou link compartilhado foi alterado aqui.

### Sintaxe/documentação: timeouts não são diagnóstico de código

`syntax` ficou sem saída e foi interrompido; `docs:check` também não concluiu.
Não houve mensagem de erro de parser nem lista de blocos desatualizados. Portanto
ambos permanecem **inconclusivos**, sem alegar herança ou regressão de código.
O host teve latência elevada: `arch:check` e `spec:check` passaram, mas levaram
mais de dois minutos cada. Um snapshot de processos mostrava outros checks e
builds em worktrees externas; não foram interrompidos nem modificados.

Próximo passo: repetir os dois após estabilizar a carga e o fonte final. Não
regenerar documentação nem mexer em código para tratar timeout como falha lógica.

### Build/SSR: bundling parcial, artefato final ausente

O build chegou a `Building server entrypoints...` e reportou dois bundles Vite
concluídos (17,34 s e 1 min). Não chegou a conclusão do adaptador/pacote SSR. Após
timeout do npm, o processo Astro desta worktree permaneceu órfão; foi verificado
pelo comando completo e encerrado exclusivamente pelo PID 99534, primeiro TERM,
depois KILL. A duração até fechar a árvore/pipes foi 404.6 s.
Não há stack de erro de compilação no log, então o resultado é **inconclusivo**.

O check seguinte, `eval:ssr`, terminou com exit 1 em SSR0: inexistência de
`.vercel/output/functions/_render.func/dist/server/entry.mjs`.
É falha de precondição decorrente do build incompleto, não um teste de renderização
que devolveu corpo vazio. Não foi demonstrada regressão SSR nem deploy funcional.
Próximo passo: concluir `npm run build` com fonte estável e carga controlada,
depois `npm run eval:ssr`. Saídas de build parciais não devem ser publicadas.

## O que os verdes provam — e seus limites

- `eval:asset-integrity`: 56 artefatos finais conferiram com SHA registrado.
  `eval:gltf-validator`: 36 GLBs finais, zero erro de especificação e 46 warnings.
  Esses escopos vêm do registro de artefatos finais, não de todo GLB existente.
- `eval:props-acervo`: 12 props v2.1 com arquivo, SHA e FONTE; `propsuv1`
  passou. Não são aprovação estética nem medição de custo no renderer.
- `eval:ambience-registry`: AR1–AR6 passaram nos 17 mapas. Lajes reportou
  18 animais (6 ratos, 9 pombos, 2 cães, 1 gato). Prova registro/posicionamento
  contratual, não animação, reação a tiros ou leitura visual no browser.
- `eval:look`: 3/3 mapas piloto passaram com ΔE76 0,0; todos usaram
  `look-horizonte.json` pré-calculado, porque Python/PIL estava indisponível.
  Pilotos: mansão, córrego e campomorro. **Não cobre Lajes e não reamostrou céus.**
- `eval:map-source` conferiu hashes/fontes, mas a saída ainda referencia
  `map_lajes.js` e céu procedural. Esse verde não certifica todas as mudanças
  do builder atual `map_lajes_authored.js`.
- `eval:shaderlog`, `eval:shaderbudget`, textura/mapid/mapjson/mapcontrato,
  grafite editorial, vento, partículas e escala passaram nos escopos definidos
  pelos scripts. Não houve medição GPU/frame time nem validação 3:2 nesta subtarefa.

## Concorrência observada

O runner registrou SHA e mtime antes/depois de cada passo para
`map_lajes_authored.js`, `map_lajes.js`, `ambientlife.js`, `textures.js` e
`package.json`. Mudanças ocorridas durante a execução:

- `eval:identity`, 2026-09-05T23:53:53.428Z → 2026-09-05T23:54:10.001Z: `public/js/map_lajes_authored.js`. SHA antes/depois: eefa65f1e1c2 → 06c463aebeb9.
- `build`, 2026-09-06T00:04:26.303Z → 2026-09-06T00:11:10.889Z: `public/js/map_lajes_authored.js`. SHA antes/depois: 06c463aebeb9 → e054563f65bf.

Ausência de mudança dentro de uma etapa não significa que toda a sequência usa a
mesma revisão. Os scripts também leem outros arquivos além desses cinco; a lista
monitorada é um detector de concorrência da integração, não snapshot completo do
repositório. O integrador deve rerodar os gates diretamente afetados após fechar
o patch e registrar o commit final.

## Continuação

Resultado desta subtarefa: baseline e causas documentados; nenhum conserto de
produção. Logs ficaram em `artifacts/lajes-visual/contracts`. O build e os timeouts continuam pendentes;
assets/skills exigem completar ambiente; o contrato de evidência exige corrigir
nome de arquivo. A validação visual, os `eval:lajes-*`, gameplay e revisão
adversarial pertencem à frente principal e não podem ser substituídos por este
placar global.

## Revisão do hook de superfície CTF — 06/09, 00:32 UTC

Escopo adicional solicitado após o baseline: revisão de
`public/js/lajes_ctf_surface.js` e da chamada opcional
`world.configureCTFPoint` em `Game._initCTF`, com contratos de CTF.
**Nenhum defeito bloqueante encontrado no hook nesta revisão.**

Resultados reproduzíveis em [ctf-hook/results.json](../../artifacts/lajes-visual/contracts/ctf-hook/results.json):

| Contrato | Exit | Segundos | Log |
|---|---:|---:|---|
| ctfround | 0 | 5.398 | [log](../../artifacts/lajes-visual/contracts/ctf-hook/ctfround.log) |
| ctfwin | 0 | 5.776 | [log](../../artifacts/lajes-visual/contracts/ctf-hook/ctfwin.log) |
| ctfhud | 0 | 0.134 | [log](../../artifacts/lajes-visual/contracts/ctf-hook/ctfhud.log) |
| ctflabels | 0 | 2.782 | [log](../../artifacts/lajes-visual/contracts/ctf-hook/ctflabels.log) |

`ctfround` cobre ferro_velho; `ctfwin` exercita todos os mapas registrados;
`ctfhud` passou cinco casos; `ctflabels` passou os rótulos do registro.
Warnings de áudio `harness sem rede` são comportamento esperado do stub, não
erros do hook nem comprovação de áudio em runtime. Nenhum servidor/API foi
exercitado; 404 locais não foram usados como critério desta revisão.

A [sonda reproduzível](../../artifacts/lajes-visual/contracts/ctf-hook/geometry-probe.mjs) executou produção pelo
harness, sem renderer, e salvou [JSON](../../artifacts/lajes-visual/contracts/ctf-hook/geometry-probe.json):

- 2.106 vértices nas superfícies recortadas; UVs correspondem ao mapeamento das
  primitivas de origem, com erro máximo observado `5.960464477539063e-8`.
- Zero normais voltadas para baixo; zero posição/UV/normal não finita. O ring
  está em Y≈5,225 e o disco em Y≈5,218. O clipping preserva a ordem do polígono;
  a rotação prévia do ring e a rotação do mesh resultam em normal mundial +Y.
- Vinte chamadas reais a `_initCTF` reutilizaram exatamente oito geometrias
  recortadas; meshes da rodada anterior foram removidas da cena.
- `Game.dispose()` executado no harness emitiu os oito eventos de descarte
  esperados. Um Game/world novo recebeu geometrias diferentes: cache isolado
  por world, sem transferência para a próxima partida.
- Controles praca_poderes, escadao, mansao e piscina_treta mantiveram as
  referências originais `_ctfRingGeo`/`_ctfZoneGeo`, raio 4,5 e callback
  ausente. O hook não altera owner/progress/capture radius nesses casos.

Revisão de lifetime: a chave do cache é somente `id`; funciona sob a invariante
atual de Lajes de x/z/r fixos por id durante o world. Se no futuro uma regra
mover pontos, mudar raio ou trocar as regiões recortáveis no mesmo world, será
necessário invalidar o cache ou incluir essas dependências na chave. Isso não
foi encontrado no fluxo atual e não é tratado como defeito desta mudança.

O descarte de materiais/mastros/bandeiras removidos em reinicialização já não é
feito pelo caminho antigo; o hook não introduziu essa alocação. A sonda prova
reuso e descarte das novas geometrias, sem afirmar ausência total de vazamento
de recursos de Game/CTF ou medir memória GPU.

A contagem de triângulos flutuantes red/green/mutante pertence ao gate da frente
principal; esta subtarefa não o reexecutou e não tomou a verificação por centroide
como prova de todos os pixels. A aparência final precisa da captura autorizada.

Build/sintaxe/documentação finais permanecem aguardando a liberação explícita
do integrador após a frente de navegação; não houve nova tentativa de build
nesta etapa. Não baixar pacote de decalques sem procedência individual apenas
para tornar `assert:assets` verde.
