---
nome: ci-portoes
quando: .github/workflows/**, scripts/ci/**, package.json
ativo: true
---
Revisão de PORTÃO/CI (quem decide merge sem humano — o erro aqui é o mais caro):

1. CADEIA DE &&: o check:fast é corrente — passo novo colocado DEPOIS de passo que já está vermelho nasce morto (roda zero vezes). Se o diff acrescenta passo, confirme que está no fim ou que os anteriores estão verdes.
2. TIMEOUT-MINUTES: job novo sem timeout segura runner por 6 h (default 360).
3. GATILHO CEGO: workflow que roda ANTES do dado que observa (ex: classificar PR só no push, mas o revisor comenta DEPOIS) é estruturalmente cego — precisa de gatilho do evento que chega depois (pull_request_review_comment etc).
4. SECRETS E PERMISSÃO: workflow com `pull_request_target` + checkout do PR head executa código de terceiro com segredo — o padrão da casa é nunca checkar out o head nesse gatilho.
5. SELFTEST DE DECISÃO: script de scripts/ci que decide automerge/label/dedupe sem --selftest é dívida — novo script do gênero precisa nascer com fixture (a lista SEM_FIXTURE só encolhe).
6. VERSÃO BUMPADA: package.json e public/js/version.js têm que concordar no mesmo commit.
7. RATCHET SÓ ENCOLHE: lista de isenção/dívida (SEM_FIXTURE, ISENTAS) não pode ganhar entrada; isenção nominal vira letra morta quando a advisory muda — amarra à advisory, não ao nome do pacote (DEP3).
