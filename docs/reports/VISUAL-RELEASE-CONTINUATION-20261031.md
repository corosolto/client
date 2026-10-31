# Continuidade da integração visual — 31/10/2026

Missão integral: acompanhar PRs elegíveis e release; melhorar mapas, UI visual, personagens, skins e movimento/ADS 1P/3P conforme PDF, roadmap, plano anterior e Complexo Favela. Operação Flávio excluída. Fluxos UI/redes sociais são fase posterior. Não disputar Javaporco ou itens de outros owners. Pronto exige correção medida antes/depois, evidência real, revisão atual sem dívida, CI verde e release rastreável; técnico verde não aprova arte/mobile/MP.

## Estado recuperável

- Lane: `worktrees/visual-release-review-20261031`, branch `codex/visual-release-review-20261031`, PR #1188. Base remota21f264c519 integra main49151a297; main consultada novamente permanece491. Versão continua alpha.132; nenhum bump manual.
- Produção: #1184/normais em `v2.1.0-alpha.132`; release41224203557 e prod-watch41225397893 SUCCESS, Ego verificou versão e partida offline. #1181 integrado na main491; não houve novo release de produto desde132.
- Novo produto AK: fonte636ae9389, merge QAe8b0dc25c. Fila de FX FP após pose/câmera; destino balístico congelado; clarão acompanha pose e inverse de SkinnedMesh atualizado antes de ler vértices. R6 real anterior169px, protótipoR8 ainda98px rejeitado, R9 final0px clarão-boca/3,92451px contra face física.33 tiros/traçantes/clarões,33retornos,470ticks,pool final3. Root viu PNGs. Gate com Game/Authored/SkinnedMesh reais e cinco mutantes. Regra/limites em SHOT-FINAL-POSE.md.
- Focais no ambiente QA correto:4/4 GREEN (shot-final-pose, tplocalshot, tracer3p, mp-tracer-origin). O setup tplocalshot na WT com node_modules symlink era inválido; não era regressão e não foi escondido por skip.
- Head yaw: fonte5d0548a9a, cherry6cc50e854. Desfaz delta antes do mixer, aplica uma vez sobre pose final, preserva emote/proxy e revive.24casos/28.800frames, oito mutantes e contratos TP verdes. Wiring nominal+8mutantes em eval:tp-world-contract, já listado fast/deploy/CI. Focal consolidado yaw+shot2/2 GREEN. Prova visual no Ego da QA ainda em andamento.
- CI: fonteb5767fa42, cherryf175ff608. Dez grupos independentes exigem !cancelled e deps bem instaladas; falhas anteriores continuam vermelhas. PI4 mede10×18cenários, nominal e mutações causais, eval:portaointeiro na QA GREEN. Novo shot-final-pose ligado no grupo visual. Ainda não é execução hosted.
- Atualizar gerados com npm run docs/arch antes do push; package preserva alpha132, união de comandos existentes e nova cobertura, sem remover tetos.

## Pendências obrigatórias

- Remoto #1188 ainda21, revisão b14 com dois findings. Corrigidos localmente CI/yaw, mas não resolver threads antes de publicar prova no head. Estraga atual/CI/adversarial integral continuam necessários. Não mergear só por estes focais.
- CI21 reguas-e-site falhou exit134/OOM durante os mutantes de economia-jogo, após equip-nao-perde; nenhum nominal vermelho demonstrado nesse log. Lane independente economia-heap investiga isolamento sem retirar casos nem só aumentar memória. Log PR1188-pr-fast-21-job.log no audit externo. Não competir com workflow/yaw/AK.
- Curadoria anterior14/14 mapas,458 peças reais, zero violações semânticas e crítico597relações; contratos CI71verdes, bake437/fp161c4394b4a2247a. Não equivale a aprovação artística geral, mobile físico ou FPS. Histórico detalhado: docs/visual-consistency/CONTINUATION.md na lane original consistencia-visual-release-20261031.
- Canarinho privado de dedos foi rejeitado; não adotado. Compra/equipamento autenticado, catálogo amplo de skins, MP e mobile físico seguem sem aceite. #1187 mobile permanece com outro owner; última consulta1a468351160, CHANGES_REQUESTED. Preservar 3P/F4/skins/preview seletivo ao integrar futuramente.
- Não tocar sujeira conhecida na lane original. Somente commits/fontes aceitos entram na QA. Assets privados permanecem privados.

## Próximo passo

Concluir prova visual yaw na QA4374/Space39, aguardar correção medida da economia, integrar seletivamente e regenerar docs. Depois push normal (hook completo, sem bypass), atualizar PR/threads com evidência e solicitar uma revisão integral no novo head. Acompanhar checks/revisão até zero dívida; crítico integral posterior, merge normal e release somente quando todas as condições aplicáveis passarem.

Audit externo: `audits/2026-10-31-visual-consistency/` na raiz agregadora. Space38 foi finalizada e não reaberta; Space39 é a continuidade própria. Servidores4373(AK) e4374(QA) temporários ativos, além dos antigos4367–4372 preservados; conferir PID/CWD antes de parar. Não tocar Spaces do usuário1/25. O objetivo permanece ativo e incompleto.

### Atualização pós-crítico yaw

Microfix61afae0ad integra undo também em die antes do próximo update. Nominal33casos/31.500updates e13mutantes; wiring substitui lista manual por nominal+autoteste. Ego7chars×600standingupdates/proxies~7e-15; capturaR2 em1320×880 vista. A morte ainda não tem aceite visual novo. Novos reds hosted21: AUD1C(ctxfilho),VM14(53flutuantes em5mapas), grafite-atual(404decalassets), select(referência0.675/23.6 vs atual0.689/28.6). Investigações próprias separadas, sem tetos afrouxados. Remoto ainda21; próximo gate de publicação exige fix/prova desses reds além do OOM.
