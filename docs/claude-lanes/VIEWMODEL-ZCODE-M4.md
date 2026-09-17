# ZCode GLM 5.3 — M4 final, com mãos e ações completas

Leia primeiro `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts/docs/claude-lanes/VIEWMODEL-ZCODE-CORRECAO-FINAL.md`. A entrega desta tarefa é a M4
final integrada na própria branch, não apenas candidata ou evidência offline.

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles`, branch
`codex/vm-prep-rifles`. Esta é a única frente de produção de viewmodel ativa nesta
etapa. Não trabalhe em `primary`, `vm-astra-pistol`, `vm-prep-precisao`,
`vm-m4-reload-evidence`, `viewmodel-blender`, Fable ou retarget.

Antes de escrever, confira `git worktree list`, branch, HEAD, `git status --short`
e caminhos reais de symlinks. A árvore desta lane deve começar limpa em
`f63e730f`; se divergir, preserve o estado e registre a diferença, sem reset/clean.
Leia integralmente `AGENTS.md`, `docs/LICOES.md`,
`docs/development/VIEWMODEL-1P-PROFISSIONAL.md`,
`docs/reports/VM-PREP-RIFLES.md` e, na integradora somente leitura,
`../vm-astra-pistol/docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md`. Aplique as
“Instruções comuns” e a seção “Frente Rifles”. Leia também o diagnóstico do PR
#534 em `../vm-m4-reload-evidence/docs/reports/M4-RELOAD-DIAGNOSTIC-2026-09-06.md`,
mas trate toda essa worktree como somente leitura: ela contém uma investigação
interrompida que não pode ser limpa, sobrescrita ou incorporada às cegas.

## Objetivo desta etapa

Fechar a versão final da M4 preservando exatamente o idle/pose aprovado pelo
dono, a AK golden, câmera, enquadramento, materiais e identidade de luvas. Corrija
somente a recarga tática da M4 e o retorno ao idle:

- eliminar cruzamentos de anelar/mínimo com o carregador durante todo o ciclo;
- manter dedos na superfície correta do carregador, com distância assinada e
  inspeção de interseção nos dois sentidos;
- eliminar pele exposta entre manga e luva nos dois ângulos sem esconder o defeito
  com textura, câmera ou recorte;
- preservar retirada, reinserção, assentamento e eventos em 2,4 s;
- provar retorno contínuo à pega aprovada, sem bind pose, salto ou rotação torcida;
- manter `bolt_release` explícito ou registrar, com evidência do asset, por que a
  geometria não permite esse evento. Não finja o mecanismo abaixando a arma.

Use `artifacts/viewmodels/prep/rifles/m4-idle-grip-c4/` e o snapshot aprovado como
controles imutáveis. Preserve todas as tentativas rejeitadas. Crie um diretório novo
`artifacts/viewmodels/prep/rifles/m4-reload-final-zcode/` e scripts novos com prefixo
`rifles-m4-`; não sobrescreva candidatos anteriores.

## Régua obrigatória

Escreva primeiro um verificador que reprove o estado atual pelas causas acima e
inclua mutantes que reintroduzam cruzamento, pele exposta e retorno incorreto.
Depois produza a menor correção possível em Blender headless. Valide a própria
GLB após reimportação, comparando hashes/estrutura protegida e amostrando todos os
frames do ciclo; os frames 0, 13, 20, 25, 30, 35, 43, 45, 54, 62, 70 e 72 devem
ter renders 3:2, 16:9 e ângulo oposto. Gere folhas e vídeo offline contínuo se as
ferramentas locais suportarem, sem abrir navegador ou dev server.

Inspecione visualmente toda a sequência, não apenas os números. Integre a M4 na
rota autorada da própria branch, com mãos por time, ações completas, ADS e fallback.
Pode editar os símbolos de runtime/configuração estritamente necessários à M4,
mantendo commits separados. Não redesenhe atlas/material central, não altere outra
arma, HUD global, assets privados de origem ou balanceamento.

## Entrega

Atualize `docs/reports/VM-PREP-RIFLES.md` com entrada, mudanças, hashes, medidas,
aceites/rejeições, imagens e próximo passo. Faça commit pequeno, com `Agent: ZCode
GLM 5.3` e `Signed-off-by`, push na branch existente e atualize somente o PR #509.
Não faça merge ou release. Declare a M4 pronta somente quando arma, mãos, ações,
ADS, integração e testes estiverem completos. Termine informando os
arquivos alterados, comandos/resultados, pasta de evidência e limitações.
