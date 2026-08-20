---
name: revisao-antes-do-push
description: Crítico adversarial de contexto limpo, rodado ANTES do push. Use quando um trabalho está pronto para virar PR e quem escreveu foi você — que é justamente quem não pode dar a nota.
---

# Revisão antes do push

O `AGENTS.md` já diz: **quem constrói nunca dá a nota.** Esta skill é a versão
operacional disso, com a lista do que efetivamente escapou.

Ela existe porque em 12/08/2026 um bot de revisão (greptile) achou **seis** coisas
em três PRs que dezessete portões verdes não viram — e **duas eram bugs reais**.
Nenhuma teria sido pega por linter: rodei o shellcheck 0.11 contra a versão bugada
e ele passou limpo. O que pegou foi leitura com contexto limpo.

## Como rodar

Contexto limpo é o ponto. Quem escreveu o diff lê o próprio resultado pela
justificativa que construiu enquanto escrevia. Abra uma sessão nova, dê **só** o
diff (`git diff origin/main...HEAD`) e a pergunta, sem a narrativa de como se
chegou nele.

## O que perguntar, em ordem de retorno medido

1. **Este filtro/regex/guarda alguma vez casa?** Escreva a entrada real e passe
   por ele à mão. Caso real: `grep -Ev "\t^(public/docs/|…)"` — o `^` no meio da
   linha nunca casa, e o filtro passou meses de revisão parecendo certo.
2. **Esta régua ENUMERA onde devia VARRER?** Enumeração envelhece no primeiro
   arquivo novo. Caso real: a cláusula EP6 listava dois dos três `showDebug`, e o
   terceiro nasceu desguardado. O projeto já cura isso em outro lugar — a tabela
   de superfícies da licença é gerada por essa exata razão.
3. **Qual delimitador este parser assume que o dado nunca contém?** Caso real: um
   `==END==` como sentinela de `git log`, que um corpo de commit pode conter.
4. **Este número tem comando que o reproduz?** Lei 2 da casa. E se ele mede
   histórico, está ancorado num sha — percentil de janela móvel muda a cada
   commit, inclusive o que o regenera.
5. **Este caminho novo tem os mesmos guardas dos caminhos irmãos?** Liste os
   irmãos e compare um a um. Caso real: dos três coletores de erro do cliente,
   só o `console.error` ficou sem a guarda de proveniência.
6. **O que acontece num clone RASO?** O CI usa `fetch-depth: 1`. Régua que mede
   histórico fica vermelha lá e verde na máquina — aconteceu duas vezes, nos PRs
   #91 e #207.
7. **Se este defeito voltar, o que fica vermelho?** Se a resposta é "nada", a
   correção não está pronta: falta a régua com a mutação que a faz morder.

## O que NÃO é trabalho desta revisão

Estilo, preferência e reescrita de código velho. A régua nova mede o que o diff
ACRESCENTA — ratchet, não faxina.
