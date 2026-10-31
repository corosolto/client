# #1188 — recentro da cabeça

Objetivo: verificar o finding Estraga inline4432950826/thread PRRT_kwDOTbwe3M6yTxcg contra o CharController real, corrigir a causa comprovada e entregar checkpoint isolado ao integrador. Base21f264c519aac547148ea1bab3c5c64d847e8290, branch codex/head-yaw-1188-20261031. Não tocar game/authoredvm, assets, QA, impl, browser ou outras lanes. Sem push/resolução remota.

Estado inicial: claim de sinal contrário rejeitada provisoriamente por geometria (+Z corpo, yaw cabeça+θ => curYaw=-θ). Hipótese a medir: reaplicação da correção sobre pose estática não reescrita pelo mixer; clip com quaternion reescrito pode responder diferente. Régua antes da implementação, produção importada com export apenas de CharController no módulo temporário, Three vendorizado e AnimationMixer real. Também verificar limites/estados e proxy final.

GLM-5.3 OMP análise RO iniciada, max3min, prompt/log HEAD-YAW-GLM-R1 no audit externo. Regras AGENTS, bug-hunt/regua, quality-gates, LICOES e KNOWN-BUGS lidas; ARCH regenerado (modo PR preserva contagens e linhas antigas por design do gerador). Aplicada skill blender-motion-state-inspection para distinguir eixos/quaternions de impressão visual; nenhuma edição Blender/asset.

Próximo: capturar RED iterativo, decidir delta removido antes do mixer/reaplicado uma vez na pose final, validar mutantes, checkpoint e relatar limites de browser.

## Marco validado — 19:14UTC

- RED12/12 antes do produto; track constante+.5rad chegou+.6505 e cruzou o centro. AnimationMixer real pode não reescrever head quando o buffer não muda. Sinal do review original rejeitado por geometria e pelo mutante de sinal.
- Conserto remove delta local anterior antes do mixer, aplica1× na pose final antes do proxy, preserva ganho/teto/tempo/deadzone e libera cabeça no emote. Limpa memória fora do porte parado. Nenhum asset/game/authoredvm alterado.
- GLM R1 análise real entregue; confirmou sinal correto e regime estático, mas sua alegação sem oscilação e cache pós-mixer foram rejeitados pela reprodução/ordem. GLM R2 revisão RO confirmou conjugação/undo; A3 sinal rejeitado novamente pela medição. A1 transição e A2 respawn motivaram prova extra: revive sem frame intermediário foi RED24/24 (erro0,38rad no exemplo), corrigido com helper de undo antes da ativação de ações/emote/shoot/revive e reset antes de stopAllAction.
- Gate atual R4 GREEN24casos/28.800frames, maxerro8.37e-9rad, proxy0. Cobre tracks ausente/constante/animado/pausado, ancestral yaw/pitch/escala,30/60/120Hz, estados e revive vivo + die/revive sem update intermediário. Sete mutantes originais R2 detectados; versão com helper e oitavo mutante revive-pendente ainda será rodada.
- TP-WORLD nominal+6mutantes anterior passou. SB7 R1 foi78por ausência Astro; R2 com apenas Astro symlink foi1por dependências incompletas do config. Troca de dependências própria: node_modules shim local guardado em /private/tmp/coro-head-yaw-node-modules-20261031-1913; node_modules agora symlink somente leitura à QA, sem npmci nem mudanças em dependências compartilhadas. SB7 R3 em execução; não chamar de verde ainda.

Próximo: oito mutantes atuais, focais finais, GLM R3 sobre transições corrigidas, commit seletivo. Integração deve wire gate+mutantes no script eval:tp-world-contract já existente (package não editado para evitar disputa), passar browser Ego/critico final na lane do integrador. Sem push/resolução até lá.

## Focais finais da implementação

Oito mutantes atuais detectados com exit0/statusRED, relatório `HEAD-YAW-MUTANTS-R3-verdict.json`; nominal `HEAD-YAW-GREEN-R4.json` GREEN. `eval:shaderbudget` R3 exit0, SB1–SB7 verdes com dependências completas compartilhadas; R1/R2 são tentativas infra rejeitadas, não regressão do produto. ARCH regenerado/check verde, sintaxe e diff-check verdes. `eval:tp-world-contract` R2 ainda aguardando completion; não presumir resultado. GLM R3 revisão final focada em execução, sem browser.

TP-WORLD R2 completou exit0 (nominal e todos os mutantes previstos). Gate R5 acrescenta aimPitch variável e mantém GREEN24/28.800, max8.37e-9rad/proxy0; oito mutantes R4 detectados, exits0, em `HEAD-YAW-MUTANTS-R4-verdict.json`. CLI inválida sai2. Saída padrão limita exemplos vermelhos a dois casos, preservando failedCases e máximos; dados detalhados da rodada R4 ficam no audit. Pronto para checkpoint local; GLM R3 ainda em execução.
