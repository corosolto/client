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
  EJ12 também vermelho, investigar no log. Revisão CodeRabbit solicitada para o
  head atual sem review. Não está pronto para merge remoto.
- Lease GLM de testes grafite: `tools/eval/graffiti-curation-check.mjs` (novo),
  fixtures afetadas de `graffiti-support-check.mjs` e
  `piscina-graffiti-batch-check.mjs`; sem produto, package, browser ou commit.

## Aceites, rejeições e limites

Nenhuma correção de produto ou aprovação visual nova ainda. Head do #1179 contém
afirmações de melhorias e limitações contraditórias no corpo: tratar como pistas,
nunca como aceite. Não usar status histórico alpha.7 como versão atual.
Não há permissão inferida para interromper processos, remover locks, comprar
recursos ou publicar mensagens externas. Merge/release scoped pelo pedido atual;
gates e ownership continuam obrigatórios. Não chamar resultado técnico de visual.

## Próximo passo concreto

Capturar baseline do #1179 no Ego com viewport confirmado, registrar manual +
assado + mural e medir repetição e suporte. Escrever régua que reprove esse head,
depois corrigir curadoria sem tocar física/nav. Acompanhar GLM de personagens,
owners/revisões dos PRs e release sem disputar escrita.
