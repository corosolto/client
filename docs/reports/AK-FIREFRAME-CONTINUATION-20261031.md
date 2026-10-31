# AK fireframe — continuidade 2026-10-31

Objetivo: corrigir a emissão FP que diverge da boca final após auto-fire/update real, sem alterar balística, assets/clips, skins, hip aprovado ou consumidores 3P/bots/server. Pronto somente com RED anterior causal, after focal/mutante, fonte revisável e runtime Root independente (sem inferir boca física do mesmo socket).

- Base/branch: `21f264c519aac547148ea1bab3c5c64d847e8290`, `codex/ak-fireframe-20261031`, WT exclusiva `ak-fireframe-20261031`; status inicial limpo. Nenhuma outra WT autorizada para writes.
- Evidência aceita de problema: auditroot `ak-shot-Ego-R6.json` +4PNGs, auto-fire interno real,33shots/tracers/flashes,33retornos/470ticks, pool3; delta flash↔socket final188.6789px; câmera0.00955556rad. R5 era intermediário e não prova todos os RAF. R6 mede emissão↔pose final, não fidelidade física do socket.
- Antes de produto: AGENTS, bug-hunt, regua, quality-gates, ARCH e KNOWN-BUGS consultados. `docs/LICOES.md` ausente nesta árvore; não inventar leitura. ARCH regenerado antes da intervenção. Dependências somente symlink readonly para QA/node_modules, sem npm ci/update.
- Escritor subordinado solicitado: OMP `zai/glm-5.3`, prazo6min; produto só depois de prova RED. Sem browser/push/PR.
- Próximo passo: GLM reproduz consumidor final e implementa fix mínimo com gate causal; Codex confere diff/provas e entrega parcial se deadline sem prova. Root executa browser4373 após checkpoint estável e crítico independente.

## Evidência focal acrescentada durante investigação

- Root quantificou os 33 finalFrames R6: hip1 delta63.991px; transição2 delta70.902px; ADSisolado3 delta0; burst4 delta75.646px; shots5–32 TODOS delta169.360px com ADS1/flashAge1/60. Só último33 delta188.679px tem ADS0.938/mag0 por início de reload. Não reduzir o defeito ao último tiro/reload e não aplicar offset cego.
- `LICOES.md` foi localizado no repo de continuidade: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/progress/docs/LICOES.md`; Codex leu lições1–12 antes de qualquer alteração de produto. O arquivo permanece ausente na árvore pública desta WT.
- Comparação direta antes de produto: `_tryShoot`, `_updatePlayer`, `_flash`, `_updateFx`, `_muzzleWorld`, `_origemTracerJogador` desta base são byte-idênticos à impl que produziu o R6; AuthoredViewModels SHA8e0c95814c688f129580231120ece50211e33af4e103540f55e8b6a35b4aac10. REGRED runtime vigente, não GREEN Node substituto.

## Encerramento parcial da janela

- OMP `zai/glm-5.3` iniciou18:56:04UTC e encerrou exit1 no limite6min com `Deadline exceeded`; log só `Working...` e deadline. Não entregou probe, patch, prova RED→GREEN ou relatório. Resultado rejeitado como implementação.
- Produto/gate/package/assets permanecem intactos. `game.js` SHA256 `bafe075505180fd3e63a5e8c6286a9e89ef342a8d168baaf4aa3cf45e1b31a5c`; `authoredvm.js` SHA acima. ARCH regenerado sem diff. Checkpoint autorizado contém somente este ledger, com Signed-off-by e Agent via hooks normais.
- Diagnóstico causal a confirmar: auto-fire ocorre antes de authored.update; shoot golden reseta mixer/pose antes da emissão; o solver ADS recompõe mount depois; flash é filho de vm.root e guarda offset anterior. Repro R6 após frame completo mantém169px em28tirosADS1. Ainda falta distinguir socket físico de pose e demonstrar correção real. Não aplicar offsets cegos ou alterar balística/recoilP, nem executar Game.update duas vezes.
- Artefatos no auditroot: `AK-FIREFRAME-GLM-R1-PROMPT.md`, `GLM-AK-FIREFRAME-R1.log`, `AK-FIREFRAME-ROOT-NOTES.json`, `AK-FIREFRAME-R1-PARCIAL.md`; R6script/JSON/PNGs e críticasR5/prepR6 preservados. Nenhum browser operado nesta tentativa.
- Servidor Root4373/PID17308 preservado. R7 não deve ser apresentado como conserto antes de checkpoint com prova causal RED→GREEN. Nenhum push/PR/review reply e nenhum write em impl/QA. Próximo passo: retomar nesta WT com régua do consumidor final, fixmínimo e crítico independente; Root fará comparação real na4373 quando houver resultado verificável.

## Retomada autônoma após continuação

- Codex reassume como único escritor de combate nesta WT; nenhuma tentativa anterior entregou produto. Investigação GLM nova é somente leitura, pergunta focal sobre emissão final; patches permanecem responsabilidade Codex até prova causal.
- Dois revisores em lanes novas cuidam independentemente CI e head-yaw do #1188, sem game/authoredvm. Review atual21 solicitado, review b14 tem2graves. Missão integral continua ativa; produção alpha132 permanece limitada a normais.

## Marco validado: pose final e skin

- GLM R2 RO real exit0 produziu diagnóstico focal e recomendação fila; root implementou. Primeiro fixture rígido ficouverde, mas EgoR8 ainda98,099px: rejeitado. Crítico encontrou também compatibilidade bocacano=0.
- Fixture corrigida para SkinnedMesh sem early-return socket reproduziu RED; hooks de matriz corrigidos e GREEN. Cinco mutantes causais detectados. EgoR9 real33shots/33tracers/33flashes,delta final0, landmarkfísico3,92451px,poolrecuperado3/retornos33,470ticks,prefsrestauradas. Root viu quatro PNGs. Documentação SHOT-FINAL-POSE.md com limites.
- FocaisR3:4/5 passaram (gate novo+5mutantes,tracer3p,mporigem,shaderbudget). tplocalshot falhou em setup ERR_INVALID_URL no rig porque node_modules compartilhado aponta outro checkout; não declarar verde nem regressão resolvida até rodar na QA dona dos módulos. Primeira chamada tinha dois aliases inexistentes; não conta como falha de produto.
- CríticoR1 P1hookskin/P2kill-switch corrigidos; R2 confirmafonte e pede origem legacyexata, agoraasserida. Revisão Estraga/push ainda pendentes. Próximo: commit seletivo recuperável, integrar na QA21 junto CI/yaw, focais no ambiente correto, revisão visualyaw e push normal. Space39 própria retomada (38terminou, não foi operada); servidor4373 sessão64728 ativo.
