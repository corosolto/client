# Continuidade — régua de geometria final da Piscina

## Objetivo e limite

Restaurar a execução da régua existente após a proteção de curadoria introduzir
instruções entre o batching e a colocação do grafite. Não muda o mapa, arte,
colisões ou critérios de aceitação. A missão integral continua abrangendo mapas,
personagens, skins, movimento, AK/ADS, integração dos PRs, release e backend;
Operação Flávio/#1158 excluída e fluxos de UI/redes sociais posteriores.

## Ponto recuperável

- Branch: `codex/map-consistency-followup-r435-20261101`.
- Base: `210d9dcc2aaded0c595cfdc3f1731d48c0e49cc9`.
- Produto permanece byteexato à base; só o checker e este ledger mudam.
- Provas externas em `audits/2026-10-31-visual-consistency/`, no workspace pai.

## Causa e reparo

A execução oficial R436 parou na primeira asserção: o locator exigia a sequência
literal `batchStaticBoxes();` imediatamente seguida de `grafitar({`. O mapa real
preserva essa ordem, mas protege temporariamente o layout por `try/finally`.
Nenhuma verificação de curadoria ou geometria era alcançada.

O locator passa a exigir uma única chamada de batching, uma única chamada de
colocação e a ordem correta. O mutante remove somente a chamada de batching e a
reinsere antes do retorno, após a colocação. As verificações semânticas e seus
limiares permanecem intactos; âncora ausente ou duplicada continua sendo erro.

## Marco validado — 01/11/2026

`npm run eval:piscina-graffiti-batch`, Node22, R450: exit0 em 1,069s.
Log: `PISCINA-GATE-REPAIR-R450.log`; recibo: `PISCINA-GATE-REPAIR-R450.json`.

- Produção: 41 peças, sem repetição global ou invasão da faixa azul.
- Mutante sem guarda: uma arte repetida; mutante de faixa: dez artes manuais.
- Geometria final: um controle conservado; batching tardio conserva duas peças
  e reproduz área descoberta de `9.560584842693842e-7`.
- Colliders, spawns e pickups iguais entre os dois mundos; 800 raios físicos
  sem divergência. Isso compara a ordem de batching, não versões do jogo.
- O checker confirma ao final que não escreveu no mapa.

O crítico independente R454 encontrou ainda um falso verde herdado: o normalizador
manual cortava um caractere a menos e gerava `poster::arquivo`, diferente da chave
assada `poster:arquivo`. R458 executou as funções reais com dois nomes distintos
do catálogo: o par repetido escapava antes; depois é contado duas vezes sob a mesma
chave, e o par distinto continua sem duplicata. O primeiro controle externo usou
duas posições do catálogo com o mesmo nome e foi preservado como V1-REJECTED.

O checker agora remove o prefixo `decal:` nessa ramificação e inclui o controle
manual+assado e seu controle distinto. A nova asserção falhou com o normalizador
antigo (R461 RED, exit1) e o alias completo passou após o reparo (R461 GREEN,
exit0 em 0,968s), mantendo os mesmos resultados de curadoria, área e 800 raios.
Não foi demonstrada repetição atual de poster no produto. R453/R454 revisaram o
ponto anterior; o reparo do contador exige revisão do ponto atual.

R464 encontrou outro falso verde herdado: o censo distinguia `tag-larga.png` de
`tag-fina.png`, embora o helper único do produto declare o alias editorial entre
elas. R472 executou o censo real: o par manual+assado escapava antes e passou a
contar duas ocorrências da identidade canônica depois; um decal distinto continuou
sem repetição. A contraprova persistida cobre as duas orientações manual/assado,
com nomes reais do catálogo. R473 RED falhou nessa asserção antes do reparo;
R473 GREEN completou o alias oficial em 1,115s após o reparo, conservando os mesmos
resultados geométricos e os 800 raios sem divergência.

O censo agora usa `identidadeArteGrafite`, sem outra tabela de aliases, e registra
chaves canônicas `/img/decals/…` e `/posters/…`. O controle de poster permanece.
Não foi demonstrada a ocorrência simultânea desse par de tags no produto atual.
R463 é o parecer do freeze anterior e não encontrou essa lacuna; R464 exigiu
reparo. Ambos permanecem históricos, com recibo Root de vínculos em R471.

## Pendente e próximo passo

Revisão integral independente e GLM, checkpoint seletivo, push normal, revisão
formal e CI atuais. Não há aceite artístico global, navegador novo, mobile
físico, MP ou release concedido por esta prova de ferramenta.

A varredura R436/R439 encontrou nove aliases vermelhos tanto nesta base quanto
na alpha.134. Este reparo resolve a interrupção específica da régua da Piscina;
os demais defeitos não foram dispensados nem convertidos em aprovação visual.
