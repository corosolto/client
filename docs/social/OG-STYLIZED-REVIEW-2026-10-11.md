# Revisão independente — personagem no cartão OG

Revisão adversarial em 2026-10-11, lane client `worktrees/social-community`, branch `feat/social-community`, base `c219a4cb1099359bfe5f471aa1e27f13a227f587`. Pedido: personagem estilizado do acervo indicado pelo dono, maior, ocupando a altura inteira; idealmente uma versão por personagem. Não construí a mudança. Li AGENTS.md, `.claude/skills/asset-review/SKILL.md`, as lições 1–5/8/11/12/14 em `csbrasil/progress/docs/LICOES.md`, o diff e o contrato anterior de privacidade. Escrevi somente este relatório e artefatos próprios `artifacts/social/og-review-*`; não usei browser, banco, credenciais, geração paga, backend ou outras lanes.

## Veredito por requisito

| Requisito | Veredito e evidência |
|---|---|
| Canarinho indicado, grande e inteiro | **APROVADO localmente.** Abri `public/img/resultado/canarinho-vitoria.webp`, `artifacts/profile-card-local.png`, a galeria final e o cartão completo. Camisa 24, calção azul, cabeça, mãos, cauda e pés correspondem à fonte. Corpo ocupa a altura entre faixas sem janela; estatísticas continuam à esquerda. |
| ID do roster seleciona sua própria fonte | **APROVADO tecnicamente para o acervo atual.** Preparação real da config executada em processo próprio. Os 63 IDs/names coincidem com o roster e os PNGs preparados coincidem pixel a pixel com a transformação do `<id>-vitoria.webp` correspondente. Inventário próprio inclui hashes e alpha bounds. Isso prova seleção, não uma autoria OpenRouter individual. |
| Corpo inteiro/alpha e composição no roster | **APROVADO visualmente para as capturas locais examinadas.** Abri as três galerias finais após a confirmação de conclusão e cartões ampliados Canarinho, Sindicato, Punk, Lobisomem, Maria Bonita, Lampião e Caipora. Personagens, acessórios, cabeça e pés aparecem sem recorte do cartão. Lobisomem/Maria Bonita mostram menor definição herdada das fontes. |
| Versão equivalente à ilustração do Canarinho para cada personagem | **REPROVADO como objetivo integral; entrega parcial.** O acervo mistura ilustração/render detalhado com modelos facetados/cartoon. Míticos/políticos não estão visualmente no mesmo acabamento do Canarinho. Sindicato e Punk também exigem auditoria individual, sem presumir que o restante do lote veio todo de OpenRouter. |
| Privacidade/opt-in existente | **APROVADO no recorte local verificado.** Ensaio próprio executa `publicProfile` e proxy reais em memória; cookies/Authorization descartados, IP forjado ignorado, privado/origem browser rejeitados, key inválida não gera fetch. Sem compartilhar, cartão não tem imagem. Integração Auth/Postgres/API/Astro real é prova do implementador, lida separadamente. |
| Deploy/runtime do pacote no alvo | **NÃO CERTIFICADO por esta revisão.** A rota HTTP local e o renderer nativo local funcionam; não há prova própria de Linux/Vercel, preview social externo ou cache de plataformas. |

As galerias são fixtures declaradas. A captura HTTP usa totais do banco local verificado: 8 pontos, posição 2, 8 abates, 4 mortes, K/D 2 e 0 horas; não representa nova partida humana. O acervo contém armas mesmo em arquivos denominados `vitoria`; a interface os usa como ilustração de identidade, sem declarar vitória ou conquista.

## Achados e ações

Nenhum P0/P1 confirmado no código de seleção, composição ou privacidade desta mudança.

| Prioridade | Achado confirmado | Evidência / ação mínima |
|---|---|---|
| P2 — objetivo visual pendente | Não há versão equivalente à arte indicada para todo o roster. A imagem de Sindicato é facetada/cartoon; Punk é facetado com moicano; os míticos e políticos retêm outro acabamento. Uma afirmação genérica de “63 artes OpenRouter prontas” seria incorreta. | Galeria 1, linha 1/coluna 2; galeria 2, linha 3/coluna 3; galeria 3 e cartões ampliados citados acima. Documentar fontes por ID e pendências; gerar/revisar os faltantes pelo pipeline autorizado quando houver capacidade. Não trocar IDs nem inventar recibos/modelos. A coordenação já reconheceu 19 renders GLB recentes pendentes; este crítico não usa esse número como certificação dos demais arquivos. |
| P3 — cobertura da régua, **corrigido no adendo** | A versão inicialmente revisada verificava o frame somente em Canarinho. Gerar galeria dos demais não aplicava a asserção a eles; reduzir altura apenas dos outros personagens conservava o SVG Canarinho byte a byte. | `og-review-edge.mjs/log`, `og-review-noncanarinho-small.png` mostram o buraco original. A correção mede o frame do SVG produzido para cada ID e rejeita o novo mutante; provas próprias finais abaixo. A cláusula raster exata segue limitada ao Canarinho, explicitamente. |
| P3 — limite do ajuste de nickname | O tamanho usa contagem de caracteres, sem medir largura dos glifos. 24 letras W terminam perto de x655, além da coluna nominal de texto/células, embora não encostem no Canarinho nesta fonte. | `src/lib/profile-card.mjs:7`; `og-review-long-nick.png`, aberto e olhado. Se a coluna precisa ser rígida, medir avanço da fonte embutida ou fixar um tamanho derivado dos glifos mais largos. Não é bloqueador do pedido de ampliar a arte. |

No ensaio literal da cláusula Canarinho aplicado ao roster inteiro, 59 imagens mudam pixels até y621, mas Lampião/Zumbi/Saci/Caipora terminam em y619. O ensaio próprio fica **RED** e salva a lista; não diminuí o teto para fabricar passagem. Abri Lampião e Caipora: pés estão íntegros. Não achei defeito visual nesses dois pixels de raster/alpha. É uma distinção entre o retângulo SVG e a última linha que altera RGB após composição; não afirmar “63/63 y8..621”.

A fixture extrema com valores de doze dígitos transborda células (`og-review-wide-values.png`), sem ser um perfil real observado. A fonte fixa dos números já existia antes; não classifico esse cenário sintético como regressão ou bloqueador deste pedido.

## Provas próprias reproduzíveis

Node correto: `PATH=/opt/homebrew/bin:$PATH`. Nenhum build foi executado por este crítico. Preparação real e mutações foram sequenciais no mesmo processo; fontes do sistema desativadas no Resvg.

| Prova | Resultado / artefato |
|---|---|
| Candidato Canarinho, renderer/font reais | 72764 pixels diferentes na região da imagem; y8..621; 5037 pixels claros no nickname. `og-review-normal.png`, `og-review-proof-full.log`. |
| Baseline do layout HEAD | **RED**, retrato isolado y140..504, 25733 pixels. `og-review-baseline-layout.png`, `og-review-edge.log`. O isolamento suplementar remove somente `<image>` mantendo a legenda antiga, evitando contar mudança de legenda como retrato. |
| small-portrait | **RED**, y140..504; `og-review-small-portrait.png`. |
| no-portrait | **RED**, nenhum pixel de retrato; `og-review-no-portrait.png`. |
| no-font | **RED**, nenhum pixel de nickname com fonte embutida removida e system fonts desativadas. |
| unsafe-source | **RED**, perfis browser/privados deixam de lançar a exceção exigida. |
| square-source | **RED**, a preparação real usando fontes pequenas alternativas produz PNG diferente da fonte vertical indicada. |
| Roster, pixels e alpha | 63 correspondências exatas; todas as fontes 1024×1536 com pixels transparentes e visíveis. `og-review-inventory.json`. Cláusula de altura para todos permanece RED com quatro IDs acima; `og-review-summary.json`. |
| Proxy e projeção pública | PASS, execução dos módulos reais com fetch observado, sem acessar banco ou rede. `og-review-privacy.mjs/log/json`. |
| Sem compartilhar e nickname longo | `og-review-no-share.png` e `og-review-long-nick.png`, ambos abertos e olhados. |

Reprodução dos ensaios: `node artifacts/social/og-review-proof.mjs`, `node artifacts/social/og-review-edge.mjs`, `node artifacts/social/og-review-privacy.mjs`. O primeiro termina exit1 intencionalmente na expansão literal de altura, preservando todos os resultados e imagens anteriores. Não interpretar esse RED como falha do contrato oficial de Canarinho ou como prova de corte do corpo.

Também li `artifacts/social/og-stylized-baseline.log` (**RED** antes da implementação), `og-stylized-gallery-final.log` (**PASS** do contrato oficial) e `og-stylized-real-route.log` (**PASS10/10**, responsabilidade do implementador). Essas evidências não são apresentadas como execução própria. A resposta HTTP e a captura real comprovam o caminho Auth/Postgres/API/Astro local, incluindo opt-in persistido e privacidade reavaliada com cookie do dono.

## Procedência e limites

`tools/gen-pose.mjs` descreve um pipeline OpenRouter com referência, mas a existência da ferramenta não certifica o provedor de cada arquivo. Para Sindicato/Punk, o histórico lido confirma introdução em `ef0a3929e` e substituição em `69755860d`; as mensagens falam de acervo/lote, sem recibo individual de geração. O aspecto 3D observado é evidência visual; a autoria permanece incerta até rastreio específico. Não fiz afirmação jurídica sobre permissões do acervo existente ou figuras satíricas.

Nenhuma conta/DB fixture criada pelo crítico; nenhum OAuth/SMTP/migration remota, publicação, merge, geração paga ou alteração de fonte executada. Browser reservado à outra frente: não certifiquei navegação/mobile/preview social externo. Build completo, pacote Linux e gates gerais de release pertencem à coordenação e devem constar no ledger com seus resultados, sem substituir este aceite visual local ou a pendência de versões por personagem.

Próximo passo concreto: concluir a documentação individual de procedência e jobs dos faltantes, preservar a entrega visual como parcial, vincular os resultados locais ao checkpoint e continuar os gates de rollout existentes. A versão atual do Canarinho e a composição local estão aprovadas; o objetivo visual integral de todo o elenco permanece aberto.

## Adendo — documentação de procedência e preparação dos faltantes

Reli `PROFILE-PORTRAITS.md` após o ajuste da coordenação: agora declara acervo misto, distingue os renders dos políticos, aponta Sindicato/Punk como incertos e não atribui 63 arquivos a OpenRouter. Li diretamente a mensagem de `cf13fe604`: as dez artes dos políticos foram renderizadas dos GLBs e a pintura aguardava saldo. Li também `d89790dbe`, que registra a integração de mídia dos modelos míticos; não o uso como recibo individual dos nove arquivos atuais.

O erro potencial de comunicação sobre autoria uniforme foi corrigido na documentação. A pendência P2 de novas versões permanece: documentação verdadeira não transforma os renders existentes em novas ilustrações. `tools/prepare-profile-art.mjs` prepara hashes/referências/argumentos por ID sem chamadas de API. O primeiro ref é acabamento Canarinho; o segundo preserva identidade. Há 62 candidatos e o Canarinho como referência, sem promoção automática para produto. Não executei esse script, pois ele escreve artefatos da coordenação fora do prefixo próprio autorizado; minha conferência foi de fonte.

Advertência operacional precisa para a continuação: `tools/gen-image.mjs` com `--raw-only` grava em `/tmp/gen-image`, independentemente de `--out`. Copiar o master e seu hash para o volume do projeto é uma etapa explícita antes de revisão/reboot. O job deve registrar o modelo que será efetivamente usado; o default do gerador não é recibo dos assets anteriores.

A consulta de disponibilidade e a tentativa HTTP402 foram executadas pela coordenação, não por este crítico. Não houve imagem nova nesta revisão. A existência desses resultados locais não concede autorização para recarga, publicação ou substituição automática de fontes.

## Adendo final — cobertura de frame e plano revalidados

O contrato agora executa `profileCardSvg` para todos os IDs e mede os atributos do `<image>` efetivamente produzido: x650, y8, largura550, altura614 e `preserveAspectRatio="xMidYMid meet"`. Não lê apenas a declaração da constante. O mutante `other-character-small` conserva o frame Canarinho em614 e reduz os demais a365.

Executei independentemente o trecho exato da nova guarda extraído do contrato, com o renderer SVG de produção e os 63 IDs reais: **PASS63/63**. Apliquei a mutação em memória, conferi que o SVG Canarinho continuava byte a byte igual e a guarda ficou **RED** em Esquerdomacho: `'365' !== '614'`. Artefatos: `og-review-frame-coverage.mjs/log/json`. Neste ensaio do frame, o PNG válido de Canarinho foi compartilhado intencionalmente entre IDs; somente os atributos eram a variável medida. A prova anterior, separada, já verificou as fontes de cada ID pixel a pixel. Não apresento esse ensaio de SVG como nova execução completa do raster dos 63.

O P3 de cobertura encontrado está **fechado para o frame por personagem**. A cláusula raster Canarinho y8..621 permanece intacta, e o resultado próprio y8..619 para os quatro IDs permanece registrado; nenhum teto foi afrouxado. A documentação explica essa diferença.

Li o `generation-plan.json` produzido pela coordenação e verifiquei os 63 jobs: um `style-reference`, 62 candidatos pendentes, `generated:false`; todos fixam `google/gemini-3-pro-image` também nos argumentos, usam `--raw-only`, não incluem `--out`, apontam o `rawOutput` correto em `/tmp/gen-image/social-og-<id>-styled.png` e o diretório durável separado. Conferi os hashes atuais das duas referências de cada job. Resultado **PASS**, no mesmo artefato próprio. A cópia para o volume continua uma etapa humana/operacional explícita, sem afirmar que os masters já existem.

Também conferi que o log HTTP402 sanitiza o ID da conta. A coordenação registrou `og-stylized-contract-final.log` PASS e `og-stylized-other-small.log` RED; são execuções dela, além do ensaio próprio acima. `git diff --check` passou na árvore observada.

Estado final deste recorte: composição e seleção local aprovadas, sem P0/P1 confirmado; P2 de acabamento uniforme continua aberto pelo bloqueio de geração, P3 de nickname permanece documentado. Build/deploy, Linux/Vercel e aprovação humana não são promovidos por este adendo.

## Retomada — envio bloqueado por SB7, causa não certificada

Checkpoint observado `83937415acf9162fd521c1813a083d8bb9fe5e15`, mesma branch/lane. Primeiro hook completo terminou **RED48/49**, em257s segundo o registro da coordenação, e recusou o envio. `og-stylized-push.log` identifica SB7. O ensaio social-serve não obteve resposta no prazo de inicialização60s, com `exit=null`; esse resultado permanece como falha real do gate nessa execução.

Li o caminho: `serve.mjs` aguarda `dev()` antes de abrir seu listener; carregar a config prepara os63 PNGs sequencialmente. Ao mudar módulos na fixture, o restart do renderer volta a carregar a config. Isso identifica trabalho na inicialização, mas não prova que o tempo da conversão/deflate causou a falha registrada.

A coordenação reexecutou `social-serve-check` standalone no mesmo HEAD e sem mudar produto, limites ou contrato. `artifacts/social/og-stylized-serve-baseline.log` contém **PASS HTTP real: comunidade, hashes, variáveis, import map, assets, shell e cache após edição isolada**. Esse PASS posterior não apaga o RED do hook nem identifica sua causa. Não há regressão persistente de desempenho comprovada nesse material.

Investiguei somente fonte e documentação; não executei benchmark, conversão de imagens, dev server ou build durante a triagem. A API instalada Sharp0.35.5 e a [documentação oficial de PNG](https://sharp.pixelplumbing.com/api-output/#png) confirmam compressionLevel6 por padrão, enquanto níveis menores reduzem esforço de zlib ao custo de bytes. Considerei `.png({compressionLevel:1})` como hipótese de teste lossless, preservando trim/resize/alpha. `quality`, `effort` e opções de paleta não seriam substitutos seguros: ativam quantização. Nenhuma dessas opções foi alterada ou medida, e não afirmo ganho de velocidade ou equivalência de bundle.

Decisão atual da coordenação: repetir o hook completo nas mesmas condições, sem alteração especulativa de compressão nem concorrência com ensaios pesados. O resultado ainda precisa ser vinculado ao checkpoint; até lá, a causa do primeiro SB7 continua **UNKNOWN**. Aceite visual/pixels/privacidade e pendências P2/P3 acima permanecem preservados, sem promover esse PASS standalone a conclusão do envio ou deploy.
