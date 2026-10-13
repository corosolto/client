# Revisão independente da triagem de CI da PR807

Revisor: agente independente, somente leitura de produto e backend. Lane exclusiva `worktrees/social-community`, branch `feat/social-community`, HEAD de referência `0de819c42651b929fbcc10bdfdb68725d979cab1`. Data: 2026-10-11. O parecer cobre o diff de `serve.mjs`, B7 de `boot-check.mjs`, suas duas réguas novas e o wiring em `check:deploy`. Nenhum browser foi iniciado pelo revisor.

## Parecer

Aceito o recorte final como correção da infraestrutura de avaliação e da jornada de convidado de B7. Nenhum P0/P1/P2 pendente identificado nesse diff. As duas falhas P2 encontradas no candidato inicial foram corrigidas pelo responsável pelo código e estão descritas abaixo. A aprovação deste recorte não certifica o portão browser completo, o smoke remoto nem a UI remota. Esses gates continuam pendentes ou RED na evidência disponível.

## Causas comprovadas no head do CI

| Prioridade | Fonte | Evidência e classificação |
|---|---|---|
| P1 | `tools/eval/serve.mjs:57-67` em `0de819c42`, `src/pages/index.astro:3-4`, `artifacts/social/ci-portao-0de819c42.log` | O resolver parcial só tentava `.ts`, `.mjs`, `.js` e `index.ts`. Os imports `Community.astro` e `AccountEntry.astro` ativam uma incompatibilidade do renderer herdado de main. O CI registra import não resolvido de `Community.astro`. O timeout posterior de ARM não fornece medição de armas válida. |
| P2 | `tools/eval/boot-check.mjs:300-306` em `0de819c42`, log do portão a partir da linha 1021 | A jornada de B7 tenta SINGLE PLAYER sem atravessar a entrada de convidado. O log registra explicitamente `account-entry-dialog` interceptando pointer events. O problema comprovado é a jornada incompleta da régua perante o fluxo novo do produto. |
| Bloqueio de release | `artifacts/social/ci-ui-0de819c42.log:1323-1329`, `public/js/account-entry.js:5-16`, `src/pages/api/[rota].ts:7-29` | Sete telas apresentam `/api/social-auth` HTTP 404. A rota passa pelo proxy para o backend configurado. A mesma falha já estava registrada no baseline anterior em `CONTINUATION.md`; não é regressão nova comprovada da extensão de compartilhamento. A falha continua explícita. |

## Smoke de chat: RED por orçamento, badge sem defeito comprovado

O log `artifacts/social/ci-smoke-0de819c42.log:486-505` registra timeout global de 900000ms, falha na asserção de `chat-sala.spec.js:614` e `Received: undefined`. Quatro outros testes passam. Os arquivos `public/js/chat-painel.js`, `tests/smoke/chat-sala.spec.js` e `playwright.smoke.config.mjs` são iguais por hash em `e024d7a06`, `0d9fc34d6` e `0de819c42`.

O trace desktop existente foi extraído do artefato remoto 11695152728, run 38120003329, sem navegador. Local: `artifacts/social/ci-smoke-evidence-0de819c42/trace.zip`, 198206269 bytes, SHA256 `fedb5510c82135998e6f665a30631b5efbfe52bfc0a174fbac351eb3036b0e53`. A extração por HTTP Range transferiu 197218025 bytes, evitando o download integral de 592532041 bytes. O conteúdo binário permanece ignorado.

Tempos de `test.trace`, em ms do relógio monotônico do trace:

| Evento | Início | Fim |
|---|---:|---:|
| Step OCULTAR | 892831.5 | 932971.0 |
| After Hooks | 909961.7 | 933004.6 |
| Segundo clique OCULTAR | 923546.7 | 932944.1 |
| Close context | 932350.1 | 932953.6 |
| Asserção `toBeHidden` do badge | 932945.4 | 932970.8 |

A asserção dura 25.3ms e começa durante o fechamento do contexto, depois do início do teardown. O snapshot de erro mostra `1 nova` e OCULTAR pressionado, mas foi capturado durante esse encerramento e não estabelece que o handler final foi executado e deixou o badge visível. Os steps anteriores passam e consomem quase todo o orçamento. A causa da lentidão, inclusive eventual contribuição da branch, permanece não comprovada. O smoke continua RED; não há fundamento nesta evidência para alterar badge, critérios ou timeouts.

## Candidato final e provas próprias

Runtime das provas HTTP: `/opt/homebrew/bin/node`, v23.6.0, compatível com o requisito instalado do Astro (`>=22.12.0`). Não houve prova nova em Linux/Node 22 ou Chromium.

- `social-serve-check.mjs`: PASS com renderização Astro real de Community e AccountEntry, hashes, variáveis de servidor, import map, shell de personagem, bytes estáticos e ausência HTTP 404. Os mutantes `sem-componente`, `erro-200` e `shell-removido` reprovam por cláusulas de negócio, respectivamente ausência de componente, ausência de componente e shell HTTP 404.
- Prova HTTP adicional escrita e executada pelo revisor em memória: PASS para os recursos gerados `/@vite/client` e `/@id/astro/runtime/client/dev-toolbar/entrypoint.js`, além de `/@vite/env`; `/vendor/three.module.js`, `/js/main.js`, `/js/account-entry.js` e `/style.css` conferem byte a byte com `public/`. `/api/social-auth` continua HTTP 404. O shell de personagem mantém import map e não contém `main.js`.
- `social-boot-guest-check.mjs`: PASS para modal imediato, modal tardio e alvo legado sem markup social. Baseline `0de819c42`: RED por interceptação do menu. Os mutantes `sem-convidado`, `sem-trigger` e `sem-readiness`: RED por modal não fechado, convidado fora do modal e trigger sem onclick.
- `git diff --check`: PASS. A inspeção do package wiring confirma a inclusão das duas novas réguas, preservando as demais.

O wrapper usa Astro apenas na raiz e nas rotas internas Vite. Os arquivos de `public/` e o shell seguem estáticos. O bind do wrapper e do servidor Astro é 127.0.0.1; os endpoints adicionais do Vite, inclusive `/@fs`, ficam restritos ao acesso local. O renderer real evita recriar um compilador Astro parcial: aceitar componentes por extensão no parser antigo exigiria também props, scripts, estilos e transformações corretas.

B7 confirma que o markup do modal existe, aguarda o onclick real do trigger de conta, abre a entrada pelo handler do próprio produto, faz clique normal em `.account-guest` e aguarda fechamento antes dos dois cliques normais de menu. `account-entry.js:92` marca `dismissed=true` no gesto de convidado e `:107` impede reabertura por hydrate tardio. Não há force click, ocultação manual de modal, mock de Auth ou mudança de timeout. O dispatch do trigger é entrada programática real; ele não constitui prova da acionabilidade visual desse botão.

## Achados P2 resolvidos durante a revisão

1. O candidato inicial usava somente `isVisible()` antes de clicar no menu. Uma prova própria de VM reproduziu modal aparecendo depois desse snapshot e interceptando SINGLE PLAYER. O candidato final abre explicitamente a entrada após readiness e atravessa o gesto de convidado. A régua passou a cobrir hydrate tardio.
2. A régua HTTP inicialmente registrava `child.once('exit')` somente no finally. Um erro de startup anterior ao listener podia deixar o cleanup aguardando um evento já ocorrido. A prova inicial usou inadvertidamente o Node 16 do shell e mostrou pai sem filho ativo; esse runtime foi rejeitado e não repetido. O responsável moveu a promise de exit para imediatamente após spawn e acrescentou detecção de exit/signal e log de startup. As provas HTTP aceitas usam Node 23.

## Limites e próximo gate

A régua B7 executa o trecho real contra um modelo estrito de modal. Ela valida sequência e cenários de estado; não executa Playwright, geometria, pointer events do navegador, carga de GLB ou o código completo do cliente. A prova HTTP cobre recursos solicitados e bytes; não executa HMR/WebSocket, shaders ou combate. A presença de HTML e a resposta 200 não demonstram boot completo.

Nenhum produto, estado multiplayer, ranking, Auth real ou backend foi alterado pelo revisor ou pelo recorte examinado. O HTTP 404 social permanece observável. O patch não oferece sucesso para as telas de UI que dependem do rollout do backend.

Próximo passo: executar o hook completo e obter CI no novo head; quando o slot de browser estiver disponível, repetir o portão browser e o smoke mantendo os limites e verificar a jornada física de convidado. Registrar separadamente os resultados de Node/HTTP/modelo e os resultados reais de browser.

## Adendo: cache no mesmo processo e bloqueio SB7

O hook de `e49962cce3cd7b7d8d12479a50a0c0a8017ef79b` detectou SB7 RED. A aprovação inicial acima cobria HTTP de entrada e B7; a edição de módulo durante a vida do servidor ainda não havia sido medida. Este adendo amplia o escopo para o cache e para `shader-budget-check.mjs`.

O candidato inicial tinha uma regressão real de cache: Astro calculava o manifesto ao iniciar, enquanto o servidor anterior recalculava por request. A prova salva antes do conserto em `artifacts/social/ci-cache-baseline.log` registra `account-entry.js` com revisão antiga `f34077554ce6` após a fixture passar a exigir `748e22eb933e`. A inspeção confirmou o manifesto injetado uma vez no primeiro renderer. O gate preservou uma invariante necessária, embora sua implementação anterior também exigisse a forma textual do parser removido.

O candidato final recalcula `moduleCacheManifest()` antes de encaminhar raiz e recursos Vite. Uma revisão diferente reinicia Astro com override de `vite.define.__MANIFESTO_JS__`; requests concorrentes aguardam a mesma promise de refresh. O shutdown aguarda esse refresh antes de parar o renderer. O override mantém o uso da configuração Astro existente, em vez de duplicar o HTML e os imports. Nenhum hash ou limite foi fixado para fazer a prova passar.

A régua copia `src`, `public/js`, configuração e package para uma fixture própria em `artifacts/social`. Assets, scripts e dependências são consultados por symlink. A única edição de conteúdo é na cópia de `public/js/vao.js`. O cache Vite usa `.astro/eval-vite` dentro da fixture: o cache padrão de Astro em `node_modules/.vite` poderia escrever através do symlink, e esse risco de isolamento foi removido. O cleanup encerra o filho e remove a fixture.

Provas próprias do revisor, executadas em Node 23, sem browser:

| Prova | Resultado |
|---|---|
| `social-serve-check.mjs` ampliado | PASS: duas raízes concorrentes após edição entregam HTML igual e HTTP200, inventário exato de módulos publicados, revisão atual em todas as URLs, main e Community atualizados, bytes de vao iguais à cópia editada. Componentes, variáveis, import map, localhost, shell e ausência HTTP404 continuam medidos. |
| `shader-budget-check.mjs` normal | Exit0, SB7 PASS; demais cláusulas normais também passam. |
| `cache-antigo`, `cache-omitido`, `cache-constante`, `cache-podado`, `cache-entry-site` | Cinco execuções, todas exit1 com SB7 RED; nenhuma reprovação por mutação cega. |
| `cache-serve-constante` | Exit1 com SB7 RED; delega ao mutante `cache-gele` da prova HTTP, que conserva a revisão antiga durante a edição isolada. |
| Syntax de serve, prova HTTP e shader-budget; `git diff --check` | PASS. |

A inspeção final do responsável identificou que `mkdtemp` pressupunha `artifacts/social` existente, condição satisfeita localmente e não garantida em CI limpo. O candidato passou a criar esse parent com `mkdir({ recursive: true })`. Uma prova adicional do revisor executou a régua em cwd isolado sem `artifacts/social`, usando fontes e assets consultados por symlink: exit0 e HTTP/cache PASS; o diretório privado foi removido ao final. `public/js/vao.js` vivo também foi comparado por hash com HEAD e permaneceu idêntico.

SB7 agora combina a prova HTTP real com as verificações existentes de inventário, dependências alcançáveis, módulos podados, manifesto do build e URLs de index/Layout. As cláusulas SB1 a SB6 e os cinco mutantes de cache anteriores continuam presentes. A invocação HTTP passou a ocorrer por `eval:shaderbudget`; `check:deploy` remove a segunda invocação direta de `eval:social-serve`, preservando o script como comando independente e mantendo `eval:social-boot-guest` direto. `check:vercel` não foi ampliado.

Aceito o recorte ampliado, sem P0/P1/P2 pendente identificado. A prova cobre duas requisições concorrentes após uma edição local e o cache de URLs em HTTP; não mede browser já aberto durante o restart, reconexão HMR/WebSocket, edição simultânea durante uma resposta em voo ou limites de desempenho do CI remoto. O hook completo e o CI do novo head continuam gates necessários. Smoke/UI anteriores permanecem RED e os limites de browser, infraestrutura e Auth real continuam os mesmos.
