---
nome: build-em-dia
quando: sempre
ativo: true
checagem: build-em-dia
---
Classe: **build da main vermelho sem dono** — CI quebrado e deploy de produção
falhando são invisíveis: ninguém recebe e-mail, a produção fica congelada no
deploy velho e o PR seguinte herda o vermelho.

O caso real documentado (release.yml): o bump do alpha.38 regenerou docs/ARCH
desatualizados e o PR SEGUINTE nasceu vermelho — build da main quebra por
drift de ARQUIVO GERADO, e a correção é determinística (`npm run docs &&
npm run arch`).

Mede: runs de workflow vermelhos na main (evento push) novos desde a última
rodada + último deployment de produção com estado de falha (build da Vercel).
Drift de gerado detectado no log → o vigia MESMO abre PR de conserto (gerador
determinístico + portão docs:check/arch:check verde no worktree); as outras
classes viram issue com o rabo do log e o comando de reprodução.
