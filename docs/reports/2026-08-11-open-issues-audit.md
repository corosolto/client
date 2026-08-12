# Auditoria das issues abertas - 2026-08-11

Fonte: 62 issues abertas consultadas pela API do GitHub em 2026-08-11, comparadas com
`main` em `2.0.0-alpha.74`, os quality gates, `KNOWN-RED.json` e a saúde de produção.
Esta segunda passada fechou somente itens comprovadamente concluídos e preservou a
evidência em cada issue.

## Resultado executivo

- **1 P0:** #116 rejeita uma partida legítima e perde progresso/estatística.
- **5 frentes P1:** qualidade visual central, confiabilidade do arnês e lacunas que
  existem em produção. Algumas issues formam uma única frente e não devem virar vários PRs.
- **41 de 62** são abertas automaticamente por crash. Elas representam famílias,
  não 41 defeitos independentes.
- **13 issues resolvidas foram fechadas com evidência:** #43, #73, #76, #77, #78, #79,
  #80, #81, #85, #86, #87, #98 e #178.
- Não há PR aberto. O #179 foi mergeado com DCO e publicado na alpha.74. A #135 aponta
  para o PR #137, fechado sem merge; portanto o worker self-hosted continua pendente.
- A base publicada está em `alpha.74`, `/api/health` está verde e o mapa expôs a causa de
  mostrar dados apenas de E/B: a página consultava `match_events`, mas a tabela real é
  `match_event`. O conserto e seu mutante acompanham esta atualização.

## Ranking

### P0 - corrigir antes de confiar no placar

| Issue | Diagnóstico | Ação |
|---|---|---|
| #116 | **Válida.** Uma partida humana com 95 kills/6 mortes foi rejeitada como “fisicamente impossível”. É perda de dado legítimo e o sintoma também aparece em BOT8. | Medir partidas reais e de bots, separar limite por modo/duração e provar com mutante que placares legítimos passam e payloads forjados continuam bloqueados. |

Os eventos `launch-watchdog` apresentados durante a triagem vieram da alpha.60. A alpha.69
separou navegação do carregamento 3D, preservou o erro no console e ganhou a régua B1-B7;
por isso eles ficam como incidente histórico, não como P0 atual. Uma recorrência em
alpha.73 ou posterior, com as ações anteriores, volta imediatamente para P0.

### P1 - próxima leva

| Issues | Diagnóstico | Ação |
|---|---|---|
| #51 | **Válida e estrutural.** O arnês headless não atualiza `matrixWorld`; a linha de visão dos bots pode medir colisores na origem. `botsim all` também omite `fy_quebrada`. | Corrigir `harness` e `botsim`, derivar a lista do catálogo canônico, recalibrar baselines e rodar todos os mapas. |
| #49, #50, #52, #55 | **Válidas.** Proporções/personagens, pés, palmas, espessura de 12 armas e mãos sem rig de dedos continuam dívidas medidas. | Tratar como duas frentes de assets: personagens/rig e viewmodels; não tentar mascarar malha com parâmetros de câmera. |
| #71 | **Válida em produção.** O acervo baixado é ignorado pelo Git e a produção fica apenas com a pequena coleção original. | Produzir e versionar arte original suficiente, atualizar pools e medir cobertura no navegador. |
| #82, #83 | **Válidas e relacionadas.** Há smoke Playwright, mas ele não prova frescor do layout nem roda `eval:grafite`/`eval:select`. | Criar um gate de navegador seletivo por paths, com hash dos insumos do layout e artefatos visuais na falha. |
| #108, #115, #120, #121, #127, #130, #169 | **Família potencialmente real**, mas observada em versões anteriores à alpha.69. São falhas de compilação/limite de shader, com #108 e #169 duplicadas. | Consolidar em uma issue de compatibilidade GPU, registrar renderer/capabilities e priorizar somente se reaparecer na versão atual. |

### P2 - importantes, sem perda imediata de partida

| Issues | Situação atual |
|---|---|
| #42 | **Válida:** `skills-lock.json` ainda não tem verificação reproduzível de hash no CI. |
| #189 | **Válida:** previews autorizados de forks continuam sem projeto Vercel acessível; não bloqueia o build confiável, mas remove a validação visual do mantenedor. |
| #46, #48 | **Válidas:** diferença visual para as referências e bloom global ainda afetam leitura dos personagens. |
| #54 | **Parcial:** docs e páginas principais têm inglês; changelog, mapa e ranking ainda não têm paridade. |
| #74 | **Válida:** Brasília ainda não recebeu o mesmo adensamento procedural dos outros mapas. |
| #75 | **Válida:** `decal-probe` e `medirParede` ainda discordam sobre 92 peças. Deve ser resolvida junto do gate #82/#83. |
| #47 | **Parcial:** wallpaper e loading usam manifesto gerado; a música de menu ainda depende de `length: 26`. |

### P3 - produto e automação opcional

| Issues | Situação atual |
|---|---|
| #13 | Sugestão útil, mas quiz de facção não corrige uma falha do jogo. |
| #56 | Identidade própria do bot melhora autoria/auditoria, sem impacto direto no jogador. |
| #135 | Continua válida. O PR #137 foi fechado sem merge e não há worker self-hosted ativo. |
| #176 | Sugestão boa para o roadmap de progressão, mas estabilização, novos mapas/facções e multiplayer vêm antes. |

## Fechadas nesta varredura

| Issue | Evidência |
|---|---|
| #73 | Guarda de modo, check de HUD e mutação já estão no gate; dois comentários de manutenção confirmam a correção. |
| #77 | `assets-check` já valida os arquivos citados pelo layout e possui mutação. |
| #78 | `prune-check.mjs` cobre os dois destinos e o comportamento de `KEEP_FPVM`. |
| #79 | Aspectos foram corrigidos e `poster-aspect-check` está no gate. |
| #80 | Esta atualização recompõe o histórico alpha.33-alpha.69 e impede versão atual sem seção no changelog. As alpha.5-alpha.32 já estão agrupadas na seção alpha.32. |
| #81 | `tripovm` e `tvm` foram removidos junto com o pipeline de 154 MB; não há mais flag funcional para avisar sobre assets podados. |
| #85 | `feedback.ts` chama o notificador somente depois de persistir o dado e não derruba a resposta se o provedor falhar. |
| #86 | `mutate.mjs`, catálogo de mutantes e ratchet já existem. |
| #87 | O próprio autor confirmou a correção após várias partidas; a regressão tem `eval:submitguard`. |
| #98 | Foi aberta a partir de checkout antigo; os caminhos citados existem e o comentário da própria issue já invalida a evidência. |
| #43 | O PR #187 aposentou as famílias obsoletas e foi publicado na alpha.73. |
| #76 | O PR #180 passou a medir três alturas nos cinco mapas e foi publicado na alpha.72. |
| #178 | O alerta operacional recuperou; `/api/health` e as execuções seguintes do `prod-watch` estão verdes. |

## Quarenta e um crashes automáticos e suas famílias

### 1. WebGL indisponível ou contexto perdido - consolidar 13

#104, #105, #106, #107, #123, #124, #128, #129, #132, #150, #153, #167 e #181.

São variantes de WebGL desativado, driver sem configuração, sandbox ou context loss. O
produto deve degradar para a tela explicativa e a telemetria deve agrupar a família. Manter
13 issues separadas não produzem 13 correções. A #181 confirma recorrência na alpha.70
em `llvmpipe`; ela deve alimentar a issue canônica de compatibilidade, não uma correção
específica para esse renderer de software.

### 7. Alerta operacional recuperado

#178 registrou uma reprovação do `prod-watch`. A saúde atual e as execuções seguintes estão
verdes; o incidente foi fechado como recuperado e deve reaparecer automaticamente se o mesmo
fingerprint voltar.

### 2. Shader/limite da GPU - consolidar 7

#108, #115, #120, #121, #127, #130 e #169.

#108/#169 são a mesma falha de `trim()` sobre log nulo; #120/#121 são a mesma limitação de
varyings. Uma issue canônica deve carregar GPU, renderer, limites e versão do jogo.

### 3. Textura GLTF em blob - consolidar 5

#110, #111, #112, #113 e #114 ocorreram na mesma janela e têm a mesma assinatura. Manter
uma ocorrência com asset/navegador e fechar as quatro cópias.

### 4. Código externo/extensões - filtrar 7

#138, #142, #144, #152, #156, #157 e #166 vêm de carteira, extensão ou beacon externo.
Devem continuar visíveis nos logs brutos, mas não abrir issue do jogo automaticamente.

### 5. Comportamento esperado do navegador - filtrar 2

#117 é bloqueio de autoplay e #122 é mídia abortada pelo usuário/agente. São estados a
tratar sem crash, não defeitos que pedem PR individual.

### 6. Sinais únicos sem reprodução - observar 7

#109, #125, #126, #136, #151, #170 e #171. `Load failed`, `network error`, `Script error`
e fluxo de entrada não têm contexto suficiente. #171 pode ser defeito real, mas deve ser
reaberta/priorizada somente com recorrência na alpha.69, stack útil e ações anteriores.

## Regra de manutenção proposta

1. O bot procura assinatura canônica antes de abrir issue.
2. Extensões, autoplay, abortos de mídia e WebGL indisponível viram categorias de
   telemetria, não backlog individual.
3. Crash de versão antiga só fica P1 se reaparecer na versão atual ou tiver reprodução.
4. Toda issue resolvida pelo código ganha comentário com o gate/mutante correspondente e
   é fechada; “covered-by-pr” não basta quando o PR foi encerrado sem merge.
