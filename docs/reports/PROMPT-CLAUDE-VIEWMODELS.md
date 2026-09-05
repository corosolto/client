# Prompt de retomada para Claude

Cole o texto abaixo na sessão do Claude que vai continuar o trabalho.
Este arquivo não dispara nenhuma sessão nem transfere dados automaticamente.

---

Você está assumindo o pipeline de viewmodels do CSBrasil/CORO SOLTO. Continue
do checkpoint real, sem recomeçar a investigação ou reconstruir o que já foi
aprovado. Responda em português do Brasil.

Trabalhe exclusivamente em:
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`
na branch `codex/vm-astra-pistol`. Antes de escrever, confira `pwd`,
`git status --short --branch` e os últimos commits. Não altere `primary`,
Fable, retarget ou qualquer outro checkout. Não descarte mudanças existentes.

Leia primeiro, integralmente:

1. `AGENTS.md` e as skills exigidas para a frente;
2. `docs/reports/VIEWMODEL-SERIES-HANDOFF.md` — ledger VIVO, autoridade sobre
   este prompt quanto a progresso, comandos, pendências e próximo passo;
3. `docs/reports/VIEWMODEL-ASTRA-PISTOL-HANDOFF.md` — aprovação, evidências e
   tentativas rejeitadas;
4. `docs/development/VIEWMODEL-1P-PROFISSIONAL.md` e `docs/LICOES.md`.

Objetivo completo: preservar AK e pistola aprovadas e avançar os pilotos
**faca → sniper/AWP → escopeta**, uma família por vez, antes do restante do
arsenal. Ruben aprovou a pistola a **15° de yaw** em 05/09/2026 e autorizou
seguir para as próximas armas. Não volte para 20° nem reaplique o teste de
10°: ele falhou no tamanho mínimo. O enquadramento aprovado não resolve
automaticamente o P4 widescreen de contato com o carregador; leia o ledger.

A AK golden não é material para experimentar. Confira os hashes registrados
no ledger antes/depois. Os GLBs privados estão em uma cópia APFS local de
`public/private-assets/viewmodels/`. Não rode builders com o `privateRoot`
compartilhado padrão. Não reescreva assets de outras famílias nem `shared/`.

Use `export PATH=/opt/homebrew/bin:$PATH` antes de Node/npm. O Node antigo
do PATH quebra sharp e imports modernos. As dependências já existem; não
faça instalação gratuita. O Blender disponível é
`/Applications/Blender.app/Contents/MacOS/Blender`. Leia a skill correspondente
antes de usá-lo. Um navegador por vez; não mate Chrome/processos do Ruben.

Método: baseline real → causa medida → menor correção → teste/mutação →
capturas 3:2 e 16:9 → crítico independente com contexto limpo → revisão do
Ruben. Arma, mão, animação, câmera e HUD são um sistema: um builder só. Não
confunda captura de poses isoladas com vídeo contínuo ou medição de contato
3D. Não relaxe limites para produzir verde; dados insuficientes ficam explícitos.

A faca usa `game.vm.melee`/`KnifeMeleeViewModel`, NÃO `__authoredVm`. Reutilize
as mãos e o enquadramento aprovados pelo Ruben em 05/09 (`z=-0,25` já aplicado).
Não reconstrua essa geometria para "polir" sem novo pedido. Ruben rejeitou
o movimento antigo: esquerdo deve dar estocada frontal; direito levantar
a faca e apunhalar de cima para baixo. Vídeo do movimento antigo não é aprovação.
Há também skins por time: Palhaços/C branca, Funkeiros/F preta SEM DEDOS,
B camuflada, E com estrela e Tribos Urbanas/U preta SEM DEDOS com punho
quadriculado. Ruben aceitou essa distinção F/U; não volte a cobrir os dedos
de F. Direção aceita não certifica textura/render final. Confira progresso no ledger.
Reutilize
o capturador/testes que o ledger disser que já foram criados; não tente rodar
o capturador de arma de fogo esperando uma entry autorada de knife. Depois
da revisão da faca, AWP e escopeta são os próximos pilotos. Não declare uma
família pronta antes de realmente olhar os frames e concluir seus portões.

O usuário quer progresso autônomo reversível, não novas compras ou publicação.
Não faça push, merge, deploy, cobrança, comunicação externa nem mude ferramenta
ou modelo por conta própria. Não abra uma nova tarefa sem pedido. Se depender
de autorização/asset ausente, conclua os diagnósticos seguros e explique o bloqueio.

A cada marco validado, atualize `VIEWMODEL-SERIES-HANDOFF.md` e faça um commit
recuperável apenas dos arquivos próprios, com Signed-off-by e trailer Agent
verdadeiro para a sessão. Artefatos grandes, privados, credenciais e arquivos
não relacionados ficam fora. Antes de parar, registre: o que foi aceito e
rejeitado, provas, commits, processos próprios ainda ativos, pendências e o
comando exato do próximo passo. Não diga que continuará em segundo plano se
nada estiver executando. Não abra rollouts antigos gigantes; os ledgers e
artefatos locais substituem essa busca.
