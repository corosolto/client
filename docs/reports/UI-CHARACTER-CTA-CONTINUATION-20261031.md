# Seleção de personagem — continuidade do CTA, 31/10/2026

Este recorte pertence à missão integral de integrar PRs elegíveis/release e estabilizar mapas, UI visual, personagens, skins, movimento e ADS conforme PDF/roadmap/Complexo Favela. Flávio excluído; fluxos UI/redes sociais ficam para depois. O root mantém o ledger integral em [VISUAL-RELEASE-CONTINUATION-20261031.md](VISUAL-RELEASE-CONTINUATION-20261031.md).

## Estado atual R20

Candidata GLM R20 pronta apenas para medição: acrescenta `contain:size` ao preview para retirar contribuição intrínseca na linhaauto, preservando o stretch existente. CSS SHA256 `e360ccb697c6b3cfb33d642bbc9bd2576b45605a92c38e80cbc04d61f2ec1167`. Nenhuma aprovação visual; R18 permaneceu reprovada parcialmente no browser por reduzir desktop a uma fileira. Root é o único operador de browser.

## Escopo e pronto

Corrigir a oclusão de “USAR PERSONAGEM” pela grade do elenco, mantendo grade multilinha, acesso ao catálogo completo, arte/identidades/preview e controles de toque. Pronto exige A/B no jogo real, geometria sem sobreposição, hit-test e clique no botão, duas proporções de desktop, tela baixa e mobile, além de crítico independente e gates aplicáveis. Inspeção estática não aprova a correção.

## Estado recuperável

- Worktree `worktrees/ui-character-cta-20261031`; branch `codex/ui-character-cta-20261031`.
- Base/HEAD inicial `7a9d47b6f5be4fe1b0fe67f49767c115167acfdd`, árvore inicialmente limpa.
- Lease: somente `public/style.css` e este ledger. QA, outros checkouts, HTML/JS/API, dependências e navegador ficam fora deste agente. Nenhum commit/push/PR autorizado a este agente.
- Fonte CSS antes: SHA256 `665321c255f6d3b9c857a6cc612d9c2d73a3bd226c5f2673a452702bc37a0d66`.
- Evidência existente aberta por este agente: `audits/2026-10-31-visual-consistency/CI1188-UI-ARTIFACT-R17/{base,head}/character.png` e respectivos manifestos, na raiz agregadora. Em1200×800 o CTA mantém bbox y529,3–577,3; a lista muda de y660,5/117px para y532/244px e o cobre no PNG. “visible” por bbox não certifica oclusão ou clique.
- Hipótese refutada: falta de `box-sizing`; já existe `*{box-sizing:border-box}`. Baseline Ego posterior do root (`UI-CTA-EGO-BASE-R17.json` no audit) mediu palco624,5h/rows364,5+244, sheetclient363/scroll446 com overflowauto/maxheight100% e borda inferior516, CTA y526,289–574,289;9/9 hit-tests atingiram outro elemento. Portanto o CTA sai do clip da ficha e encontra o rail; max-height da ficha limita sim o contêiner. A explicação inicial GLM em contrário foi rejeitada.
- GLM5.3 via OMP R17 terminou exit0 e editou somente CSS, com guard read/edit por caminho e bloqueio de MCP/bash. A candidata R17 e o log foram preservados em `UI-CTA-GLM-CANDIDATE-R17.patch`/`UI-CTA-GLM-AUTHOR-R17.log` no audit. Inspeção rejeitou sua afirmação de acesso a uma fileira: track com piso zero mais `overflow:hidden` poderia cortar a lista de piso84px. Follow-up GLM R18 terminou exit0: reutiliza piso84 já existente e retira clipping novo do rail. O patch final está em `UI-CTA-GLM-CANDIDATE-R18.patch`, sem adoção na QA. Prazo/“Working” não contam como resultado.

## Aceito, rejeitado e próximo passo

Aceito apenas o diagnóstico visual reproduzido nos artefatos CI. Nenhuma candidata foi aprovada visualmente. Proibidos contorno por z-index, retorno à fileira única, redução arbitrária de fonte/thumb e alteração de fluxos.

Inspeção estática final: somente CSS e este ledger diferem da base; `git diff --check` exit0. Nenhum browser/build/quality gate foi executado. CSS SHA256 `d2d29f099daeb8c26698f7a1b2bd59450fd70e07f596e352e9989ee20f218069`; patch SHA256 `0fc2988905a11d1b388adb223304a63510cf28b7e3988717a6a0f38d55a61801`. As alterações preservam os pisos/grade/rolagem declarados, mas precisam ser observadas em execução.

Próximo: entregar ao root para computed styles, A/B, hit-test, interação real e crítica fresca. Browser/build/gates/dependências não foram executados por este agente. Commit recuperável fica a cargo do root depois da validação.


## R19 — validação do root e rejeição parcial da R18

O root executou o jogo real no Ego Space43 com CSS R18 `d2d29f099daeb8c26698f7a1b2bd59450fd70e07f596e352e9989ee20f218069`. `UI-CTA-EGO-CANDIDATE-R19.json` e seis PNGs no audit registram: cinco viewports suportados com9/9 hit-tests e confirmação real, rolagem até o último dos49 personagens. Retrato390×844 fica coberto por `rotate-prompt` intencional; esse bloqueio não autoriza remover a orientação do jogo. Não representa teste mobile físico.

A candidata R18 foi **rejeitada parcialmente para adoção visual**: nos três desktops o rail ficou84px, uma única fileira. Em1200×800 a primeira linha ficou524,5px, embora a ficha usasse447,789px; em1320×880 ficou598,906px com ficha450,906px. O conteúdo intrínseco do preview infla o trackauto. Este agente abriu os PNGs1200/1320 e leu o JSON; CTA está exposto, mas há só uma fileira de avatares. A comparação de wallpaper entre esses quadros não é controlada; o root fixará `cs_wallK` no próximo A/B.

Próximo experimento GLM R20: remover somente a contribuição intrínseca do preview para o trackauto, mantendo o box esticado na gridarea e seus filhos renderizados. Hipótese `contain:size` deve ser justificada pela fonte CSS/grid, sem suprimir preview/arte ou alterar a ficha. Novo A/B e crítico seguem obrigatórios. R17/R18 e seus logs permanecem preservados.


## R20 — candidata focal, sem validação visual

GLM5.3 via OMP terminou exit0 com o mesmo guard de ferramentas/caminhos. Em relação à R18, somente `.char-preview-box` ganha `contain:size` e comentário de duas linhas; a ficha, linhas do grid, lista, fontes, assets, handlers e orientação não foram alterados nesta rodada. A hipótese é que a ficha determine a altura da linhaauto e o itempreview continue esticado nessa área, deixando o restante para a grade.

A justificativa estática usa [CSSWG Containment2 §3.1](https://drafts.csswg.org/css-contain-2/#size-containment), Editor’s Draft de15/10/2026: a contribuição intrínseca ignora descendentes, mas o layout interno ocorre no box atribuído. A preservação da altura do nosso preview é inferência da fonte e continua dependente de browser. O mesmo seletor é usado no hub, onde há width/height100% e pai com dimensões explícitas; essa leitura não substitui uma captura de regressão desse contexto.

O log `UI-CTA-GLM-AUTHOR-R20.log` foi preservado integralmente. Não aceitar seus cálculos de rail como medição: ele usou gap20 em vez do16 da fonte e confundiu primeira linha598,906 com palco698,906 em1320×880. Mantendo as medidas R19, a hipótese aritmética é rail≈160,711px em1200 e232px em1320; esses são valores esperados, não resultados reais. A alegação genérica de suporte de browsers no log não foi validada nem adotada.

`git diff --check` exit0. Nenhum browser, build, harness, dependência, commit ou push foi executado por este agente. O root precisa aplicar a candidata por diff, comparar com wallpaper `cs_wallK` fixo, medir preview nãozero/legível e rail multilinha onde há altura, repetir os9 hit-tests e confirmação real/scroll completo nos perfis suportados, respeitar o rotate-prompt e obter crítica fresca. Artefatos externos: `UI-CTA-GLM-CANDIDATE-R20.patch`, `UI-CTA-GLM-AFTER-R20.json`, prompt/log R20. O relatório integral do projeto segue com o root.


## R23–R26 — CTA e ficha aceitos focalmente

R23 restringiu contain:size ao preview filho direto do palco. A diferença de hub em R22 estava contaminada pela animação hub-in; não sustenta uma regressão causal de contain. R24 parou em5/13 visitas e foi rejeitada: Professor do Arcabouço em1280×720 cortava o botão. A reprodução UI-LONGEST-FAILURE-R25 mostrou ficha bottom596, scroll481/client443 e CTA bottom609.648, com6/9hits.

GLM5.3 R25, exit0, separou cinco blocos da ficha em char-sheet-body rolável com região nomeada/foco; CTA irmão flexível fixo fora da rolagem. Em coarse baixo, display:contents preserva a ficha compacta. CSS SHA256 c76d800b585fa0831a7dca94be6359dd323de2f2fa4dda6765be1387b0aaab9b; index.astro 57ec1d3a57351caaefcc95b8d9783fe848bf5a97a58b20ac5d6b8fda258f2a7c. Nenhum handler, asset ou fluxo alterado.

Root R26 real no Ego43:13visitas/28PNGs, fontes e animações finitas estabilizadas, CSS servido/hash e wrapper conferidos, preferências restauradas. Sete combinações desktop/coarse dos dois times:9/9hits antes e após último/maior título e sete confirmações reais. Catálogos49/50, união63 documentada R21. Professor1280:body331/369, roda38.5 e Home0, CTA bottom571 estável. Rails1200/1320 com160.711/232px;720 conserva piso84. Hub desktop baseline/candidato têm geometria idêntica x762/y59/384×616 e contain:none. Portrait rotate é intencional; coarse baixo já oculta preview.

Crítico independente CRITICO-UI-CTA-R26.md revisou todo diff, consumidores e28imagens: nenhum finding acionável, ACCEPT estritamente focal; U1=3,U2=2,U3=3 no escopo,U4=UNKNOWN, sem média. Root leu relatório integral e evidência visual. Arte de todos personagens, v3, leitor de tela/Tab completo, estabilidade temporal, toque físico, desempenho móvel e MP não aprovados. R18/R20/R23 rejeições preservadas; não reabrir o layout aceito sem falha nova.

Artefatos externos em audits/2026-10-31-visual-consistency/: UI-CTA-EGO-CANDIDATE-R26.{mjs,json,log}, UI-CTA-{BASE,CANDIDATE,LAST,LONGEST,BODY}-R26-*.png, CRITICO-UI-CTA-R26.md, UI-CTA-GLM-AUTHOR-R25.log. Próximo: checkpoint seletivo QA, gates normais, head publicado e revisão completa atual antes merge/release. A missão integral permanece no ledger principal.
