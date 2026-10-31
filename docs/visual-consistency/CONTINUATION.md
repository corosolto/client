# Consistência visual e release, 31/10/2026

## Missão completa e pronto

Ruben autorizou uma janela de dez horas em worktree novo para acompanhar os
merges e o release, reaproveitar PRs abertos e investigar/corrigir inconsistências
de mapas, interface, personagens, skins e animação 1P/3P. Operação Flávio está
excluída desta missão. A melhoria posterior dos fluxos UI e páginas sociais só
começa depois da estabilidade visual. Não reduzir a missão à triagem ou a um mapa.

Direção: PDF `COROSOLTO - Planos e Ideias.pdf`, ROADMAP existente, plano de
30/10, referências públicas e vídeos locais de Complexo Favela. Consistência,
leitura em combate e acabamento humano, respeitando mobile e identidade cultural.

Requisitos explícitos: grafites sem repetição; Ferro Velho só na casa de respawn
B; Piscina só em parede branca, incluindo posters; melhor acabamento das favelas;
personagens fiéis, superfície menos facetada, poses e movimentos realistas;
arma reage ao andar; ADS/tiro da AK alinhados; skins legíveis no jogo e mapas.

Pronto por correção: defeito reproduzido, régua antes/depois e mutante quando
aplicável, captura real comparável em 3:2 e móvel, revisão independente e
regressões relevantes verdes. Pronto na integração: head atual revisado, dívida
acionável resolvida, CI verde e merge rastreável. Release exige SHA implantado,
health e caminho real do jogador verificados. Evidência parcial fica declarada.

## Checkout e ownership

- Lane: `worktrees/consistencia-visual-release-20261031`.
- Branch: `codex/consistencia-visual-release-20261031`.
- Base inicial: `364be45bb0e380dc67db6171282db8fb8ff12066` (main).
- Ego: TaskSpace 32, `Codex consistencia visual e release 20261031`, p1 referência,
  p2 jogo local. Servidor próprio em `http://127.0.0.1:4367`.
- Run Estragacodigo: `worktrees/estragacodigo-review-gate-20261031`, leitura.
- Run Javaporcos: `worktrees/modo-javalis-20261028`, leitura; PR #1160.
- Personagens: #1179, head observado `fd553b310bbe92743db6db0b19d07c615f9d9d82`,
  incorpora #1171 e #1155. Ruben apontou explicitamente para este PR e autorizou
  empilhar novos PRs com microcommits.
- Não escrever em lanes alheias nem disputar arma/mão/ADS/HUD entre agentes.
- GLM usa `zai/glm-5.3` pelo OMP; nada de fallback silencioso pago.

## Fontes recuperadas e marcos validados

- Agregador não é repo Git; nova lane criada limpa por `git worktree add`.
- Regras: AGENTS.md, docs/LICOES.md, skills regua/bug-hunt/gauntlet-fps,
  BAR-CONSISTENCIA.md e ref-measure.py. Skills Ego/PDF/PR-hardening aplicadas.
- PDF localizado em `/Volumes/Zenith/Archives/downloads/Downloads/` (três páginas,
  texto extraído e três páginas renderizadas e vistas nesta missão).
- Plano anterior: `progress/docs/DIRECAO-PROCESSO-CONTINUATION-20261030.md` e
  `corosolto-roadmap/reports/2026-10-30-revisao/CONTINUATION.md`.
- Fila remota coletada; #1179 lido. Estado é snapshot, reconsultar antes de merge.
- Javaporcos tem release autorizada após gates, integração local em curso e CI
  MAPAUD sob diagnóstico; não iniciar segundo integrador nessa lane.
- Referência pública encontrada no Ego: Google Play
  `https://play.google.com/store/apps/details?id=com.BrunoSanta.OComplexo` e
  gameplay `https://www.youtube.com/watch?v=bx8DlVC0uFY`.
- Métrica operacional em `METRICA.md`, checkpoint `8689725f1`.
- #1179 integrado apenas nesta lane por merge `ad696fb87`, sem conflitos. Ainda
  sem aprovação técnica/visual nova nem merge remoto desta missão.
- Setup: Node 26 em `/opt/homebrew/bin/node`, node_modules compartilhado somente
  como dependência, viewmodels privados por symlink; `assets-check` verde. Áudio
  público v8 com fallback padrão de ambientes, não é aceite dos takes privados.
- Baseline antes de #1179: Piscina 475 peças assadas/47 artes, Ferro 206/37 no
  layout. Repetição confirmada no fonte gerado; cena e fontes manuais ainda exigem
  inventário cruzado. GLM reconheceu mapas somente leitura; sugestões de zona
  larga/raio de 9 m não satisfazem a regra atual de casa B/zero repetição.
- Artefatos e logs fora do Git em `../../audits/2026-10-31-visual-consistency/`:
  scouts GLM, PDF, referência local, setup e primeira captura Piscina. Captura
  inicial inclui overlay de debug e tamanho não 3:2; não conta como aceite.
- #1179 no jogo real: Piscina aplica 451 peças/46 malhas, captura 1320×880 vista,
  ainda com repetição visual forte. Overlay Vite local registrado e ocultado na
  captura; não é evidência de produção. Régua cruzada de curadoria em construção.
- Lease GLM de motion: somente `public/js/authoredvm.js`, contexto de movimento no
  `_updatePlayer` de `public/js/game.js` e `tools/eval/authored-locomotion-check.mjs`.
  Não mudar ADS, tiro, HUD, assets ou package.json. Root mantém mapas/grafite;
  um único navegador em TaskSpace 32. GLM devolve RED/GREEN/mutantes, sem commit.
- #1173 reaproveitado: cherry-pick do hardening `c097933d7` em `a63182820`, preserva
  autoria e cancela bake com entrada faltante. Revisão/execução desta integração
  ainda pendente. Não incorporamos o mapa antigo inteiro por cima do #1179.
- Régua real de curadoria RED: Piscina 465 peças/49 artes, 45 artes repetidas,
  165 fora do branco previsto; Ferro 207/38, 30 repetidas, 172 fora da casa.
  JSONs `*-1179-curation-red.json` nos audits. Primeira correção local Ferro
  mediu 21 peças/21 artes, zero fora e zero sem suporte, ainda sem novo bake.
- #1179 CI falha na economia: EJ22 ainda espera 30 s, runtime oferece 50 s;
  EJ12 também vermelho, investigar no log. Não está pronto para merge remoto.
- Protocolo vigente recuperado em `operations/corosolto-hq-20261026/ledger/REVIEW-PROTOCOL-20261031.md`:
  CodeRabbit não está habilitado; Ruben autorizou GLM via OMP + crítico independente.
  O pedido anterior ao CodeRabbit foi redundante, não repetir. Estraga-codigo é o
  revisor real em restauração. Dispensa não significa revisão recebida ou limpa.
- Lease GLM de testes grafite: `tools/eval/graffiti-curation-check.mjs` (novo),
  fixtures afetadas de `graffiti-support-check.mjs` e
  `piscina-graffiti-batch-check.mjs`; sem produto, package, browser ou commit.
- Gerador ganhou backend Ego que reutiliza apenas Space 32/p2. Régua original
  de fidelidade passou: Loja H 43 peças idênticas byte a byte em duas rodadas;
  bloquear statue_liberty.glb cancela. Mutante real removendo a trava reprovou G2
  (43 peças com entrada faltante), arquivo temporário restaurado pelo arnês.
- Diagnósticos vivos: Ferro 24 peças/24 arquivos únicos, Piscina 42/42, antes de
  gravar novo layout. Bake completo em curso no Ego, log `ego-bake-all.log`.
  Não alterar produtor/mapas durante esse bake. Fotos finais ainda pendentes.
- Auditoria SHA-256 dos arquivos de decals/posters: nenhum arquivo binário
  duplicado com outro nome. Não equivale a inspeção semântica de todas as artes.
- Novas leases GLM: economia somente `economia-jogo-check.mjs` e
  `ECONOMIA-PARTIDA.md`; atualizar EJ12/EJ22 à decisão de 50 s/recompra no respawn
  documentada no #1179, sem editar runtime. Censo personagens/skins é somente
  leitura de fontes/assets, resultados fora Git nos audits GLM-PERSONAGENS-*.
- Snapshot 09:05 UTC: main permanece `364be45bb`; #1180 avançou a `20cdff5c7`,
  bloqueado por CHANGES_REQUESTED/checks em fila. Não mergear por status antigo.
  Nesta branch são ancestrais os heads #1179/#1171/#1165/#1162/#1161/#1156/#1155/
  #1152/#1150; isso não comprova revisão/aceite dessas mudanças.
- 09:21 UTC: bake real dos 14 mapas concluído pelo Ego (445 peças), inclusive
  checkpoints de entradas e erro por asset ausente. `graffiti-layout-check`
  fresco; não é aceite visual. Baseline imutável `ad696fb87` servido em 4368,
  worktree `consistencia-visual-baseline-1179-20261031`; lane atual em 4367.
- Capturas comparáveis 1320×880: Ferro passou de 207 peças/38 artes, 30 artes
  repetidas e 172 peças fora da casa B para 24/24, zero repetição/fora/sem suporte.
  Piscina passou de 465/49, 45 artes repetidas para 52/52, zero fora do branco e
  sem suporte. Refinamento da régua usa a textura branca real e cobertura inteira:
  baseline são 100 fora do branco; 165 era proxy geométrico impreciso, descartado.
  O batch de props perdia exclusão e foi corrigido, não apenas o batch de paredes.
- Inventário independente cruza todas as texturas de arte, inclusive malhas sem
  nomes decal/mural/poster: encontrou Campo do Morro com a mesma colagem em 16
  superfícies que a régua anterior não enxergava. RED salvo em
  `campomorro-full-inventory-red.json`. Correção local mantém um mural no galpão,
  remove cópias decorativas sem colisão e conserva a geometria das paredes; bake
  do Campo concluído, nova captura/cobertura e verificação de física pendentes.
- Crítico visual independente examinou 14 capturas: nenhuma aprovação integral.
  Piscina está coerente no recorte; Ferro precisa escala/acabamento de tijolos;
  Campo precisa solo/reboco; Escadão tem padrão diagonal suspeito nos parapeitos;
  Lajes repete coroamentos e tijolo em topo; Córrego repete desgaste/torres;
  Quebrada repete pneus. Quatro câmeras inválidas serão recapturadas; não inferir
  defeito de navegação a partir de foto dentro de parede. M4 permanece UNKNOWN.
- Primeiro builder de motion terminou; refinamento GLM exclusivo dos mesmos
  arquivos acrescenta prova com sway real e tolerâncias derivadas da dinâmica.
  Sem aceite ADS/contato/tiro por browser ainda. Economia e censo seguem ativos.
  Builder de testes grafite atingiu deadline com diff parcial: retomar e validar,
  nunca tratar saída parcial como sucesso.


- 09:35 UTC: inventário cruzado no Ego concluído nos 14 mapas. Todas as artes
  conhecidas estão classificadas, sem duplicação por mapa e sem suporte inválido;
  Ferro 24/24, Piscina 52/52, Campo 5/5. Logs `all-map-curation-ego.log` e
  `curation-full-inventory-ego.log`; não equivalem a aceite visual integral.
- Campo após mural único: comparação física normalizada preservou 99 colliders,
  125 occluders e 11 contratos (spawns, pickups, CTF, rotas, terreno e bounds).
  `campomorro-physical-normalized.json` é a prova válida; comparação anterior
  divergia por UUID de material dos pickups e foi rejeitada como comparação final.
- Economia: GLM alinhou somente documentação/régua ao contrato do #1179, sem
  mudar produto. 23/23 casos, 20/20 mutantes e economia pura 14/14 passaram.
  Revisão GLM independente e crítico independente dos dois arquivos em curso.
- Motion 1P: régua com sway real e cinco mutantes passou, mas crítico encontrou
  dois P2: contribuição de gait fica presa ao entrar em throw segurando utilitário;
  fixture de transição não inicia gait e deixa NaN passar. Não aceito ainda.
  Correções ficam na fila até o único writer de AK devolver sua lease.
- AK no jogo real baseline: traçante coincide com muzzle, mas alça/massa ficam em
  y=591/485 para cruz y=440 em 1320x880. Experimento apenas em memória com
  `ads.linha=true` centralizou ambas sem mudar hip/tiro físico. Builder GLM
  exclusivo vmconfig AK + ads1p-linha-check + AK-ADS.md deve provar geometria real
  e mutante, sem relaxar limites. Fotos pretas descartadas; captura contínua válida
  `ak-linha-experiment-continuous.png`. Correção de produto ainda em curso.
- Leases adicionais: acabamento GLM somente map_campomorro/map_ferrovelho e doc,
  mantendo curadoria/física; testes grafite retomados em três arquivos de testes.
  Antes de novo bake aguardar devolução dos dois mapas e validar UV/assíncrono.
- Censo somente leitura: 63 personagens registrados/arquivos, 26 skins e 56 luvas;
  faltas de normal/rough em quatro personagens e caminhos de luva sem flags/FX
  são pistas, não defeitos visuais comprovados. Resultados nos audits GLM-PERSONAGENS-*.
- Main avançou a 602c0fe35 (#1169). #1179 remoto agora DIRTY; integrar main após
  checkpoint dos componentes e revisão, sem disputar owners #1180/#1160.
  #1160 ainda falha em relatório MAPAUD fresco; owner possui correções locais.
  Gate select-inflate do #1179 acusa drift de referência: investigar causa,
  sem elevar teto congelado ou dívida apenas para obter verde.


- 09:43 UTC: revisão adversarial REABRIU a régua de curadoria: cenas mutantes reais
  no Ego (clone baked, translação geometry 1000m, poster sem prefixo) ficaram
  falsamente GREEN. `curation-drawn-mutations.json` confirma a brecha; os números
  anteriores não são mais gate final. Lease GLM exclusiva measure + inventory +
  novo graffiti-drawn-check/doc para geometria efetivamente desenhada e
  reconciliação de metadados; repetição/allowlist do produto não foi relaxada.
- Revisores GLM e crítico independentes não acharam P1/P2 no microdiff economia;
  conferência contou 23 mutantes reais, não 20 do relatório anterior. GLM recebe
  followup para nitpicks e compra real após respawn (EJ23), seguida de gate inteiro.
- Censo luvas: achado de sombras/FX foi REFUTADO. attachGloves vem antes do passe
  de materiais em buildCharacterModel; runtime com esquerdomacho equipado confirmou
  castShadow=true, receiveShadow=true e shaderHook do corpo. Não corrigir algo já
  correto. Fotos iniciais de personagens com overlay GO/recorte preto rejeitadas;
  versões `character-surface-*-pool-clear.png` são 3:2 válidas na luz/cena real da
  Piscina, atores comparativos injetados com loader/controlador reais. Não são
  partida natural nem aceite integral; Lampião/controle mostram facetas no corpo.
- Nova investigação GLM readonly de normais/topologia dos personagens/skins e
  outra do drift select-inflate; nenhuma mudança de asset autorizada por hipótese.
  Ablacões de albedo/normal/vertexColor do Escadão em curso somente em memória.

## Aceites, rejeições e limites

Correções de produto locais acima ainda sem commit ou aprovação integral. Head do #1179 contém
afirmações de melhorias e limitações contraditórias no corpo: tratar como pistas,
nunca como aceite. Não usar status histórico alpha.7 como versão atual.
Não há permissão inferida para interromper processos, remover locks, comprar
recursos ou publicar mensagens externas. Merge/release scoped pelo pedido atual;
gates e ownership continuam obrigatórios. Não chamar resultado técnico de visual.

## Próximo passo concreto

Receber testes grafite, revisão de economia, builder AK e acabamento GLM. Corrigir
os dois P2 de motion depois de liberar a lease de AK; validar movimento e ADS no
jogo real. Revisar UV/acabamento, repetir física e bake dos mapas alterados e
recapturar os quatro pontos inválidos. Fechar checkpoints por componente, revisar
diff inteiro e integrar main antes de abrir PRs empilhados. Continuar personagens,
skins, mapas restantes e acompanhamento de merges/release durante a janela completa.
