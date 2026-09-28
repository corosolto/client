---
nome: pr-vermelho
quando: sempre
ativo: true
checagem: pr-vermelho
---
Classe: **PR aberto com checks vermelhos e ninguém resolvendo** — o caso de
16/08: três PRs com build quebrado, comentários de bot empilhando, merge
travado, e o conserto (determinístico) esperando alguém olhar.

Mede: PRs abertos cujo statusCheckRollup tem FAILURE novo (dedupe por head —
novo push é nova tentativa). Para cada um:
· classe DRIFT DE GERADOS (docs:check/arch:check): o vigia regenera num
  worktree do branch do PR, exige portão verde e COMMITA NO BRANCH quando a
  escrita é possível (branch nosso); em fork, comenta o comando exato;
· classe RÉGUA VELHA (o check acusa contrato que o PR muda de propósito):
  comentário apontando que a régua codificou o contrato antigo — atualizar
  a régua é decisão humana, o PR não está "errado";
· qualquer outra: comentário com o rabo do log e o check vermelho — o autor
  tem o diagnóstico no PR, não numa issue escondida.
