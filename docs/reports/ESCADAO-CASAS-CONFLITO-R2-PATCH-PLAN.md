# Escadão: plano de patch das casas disputáveis

Plano executado localmente em 08/09/2026 após a nova reprovação visual do dono. A
atualização da PR #529 contra a `main` e a repetição dos portões ainda são obrigatórias
antes do merge.

## 1. Preservar a casa central já validada

Manter os dois acessos existentes: passarela a partir do patamar e escada externa a
partir da rua. Ambos precisam terminar na sala tática delimitada por
`x=-3,35..1,35`, `z=14,2..16,8`. Preservar a janela da escada na face norte e
substituir a parede sul hoje contínua por peitoril, verga e segmentos laterais que
deixem uma segunda abertura real na mesma sala. A nova abertura liga o olho
`[-1,4; 4,37; 15,7]` à aproximação inferior em `[0; 1,5; 24]`, com tiro e revide.

A janela decorativa de outro volume conectado não satisfaz essa cláusula. A
integração deve continuar com piso físico e visual na cota 2,75 m e sem visão direta
para slots de nascimento.

## 2. Transformar os dois volumes do mirante em casas táticas

Substituir apenas os volumes sólidos centrados em `[-12, -26]` e `[12, -27]` por
shells procedurais com interior no próprio nível do mirante, em 7,56 m. A face
voltada ao respawn B permanece fechada.

Cada shell terá:

- piso visível e contínuo no nível do mirante;
- volume interno com pelo menos 0,76 m livres para o corpo;
- porta na parede lateral externa;
- janela na parede lateral interna, voltada ao centro do mirante;
- peitoril e verga que não invadem o corredor de tiro;
- parede traseira sólida, impedindo leitura dos quatro slots B.

As janelas propostas ligam os olhos `[-11; 9,18; -26]` e
`[11; 9,18; -27]` às posições de revide `[-5; 9,06; -27]` e
`[5; 9,06; -27]`. Esses pares já cabem no corpo e têm LOS recíproco; o patch deve
criar arquitetura ao redor deles sem transformar a linha livre atual em spawn kill.

## 3. Abrir os acessos laterais

Abrir uma porta na face externa de cada casa, acessível pelos corredores x≈−14,55 e
x≈14,55. A passagem entra no mesmo piso de 7,56 m e precisa manter 0,76 m úteis para
a cápsula.

Os percursos declarados em `routeSpecs` são o contrato inicial; ajustes finos nas
coordenadas devem mudar a régua e o patch no mesmo commit, com a medição antes/depois.

## 4. Integrar navegação e contrajogo

Adicionar nós de waypoint no corredor lateral, na porta e no interior.
Cada aresta deve passar `_retaAndavel` com raio 0,38 m e degrau máximo de 0,30 m.
O atacante posicionado no centro do mirante precisa conseguir alcançar o posto de
tiro, para que o revide tenha também uma rota de expulsão física.

Não abrir uma segunda janela para o respawn. A posição é aceita somente quando:

- atirador e alvo são ocupáveis;
- tiro e revide atravessam o mesmo vão;
- o atacante chega ao atirador pela rota lateral;
- nenhum dos quatro slots B fica visível do interior.

## 5. Ordem de validação após o sinal

1. Atualizar a branch e resolver conflitos sem aceitar arquivos gerados antigos.
2. Rodar o escopo `full` e guardar a saída vermelha como baseline A.
3. Editar o runtime e o grafo numa única frente sequencial.
4. Rodar `full` até 24/24 sem afrouxar cápsula, degrau ou proteção do spawn.
5. Rodar os cinco mutantes e confirmar a família exata de falha.
6. Rodar as réguas existentes da casa, estrutura, descida, grafo e contrato.
7. Gerar capturas 3:2 no navegador com GLBs reais, olhando as duas portas, as duas
   janelas e a face fechada para o respawn.
8. Só então integrar a régua ao `package.json` e ao portão, regenerar documentação,
   atualizar o relatório da PR e solicitar revisão humana.

O patch não deve aproveitar esta rodada para mudar iluminação, materiais, horizonte,
decais ou outras casas. A #548 já toca materiais do Escadão; manter o diff de gameplay
restrito reduz o conflito e deixa a causa de qualquer regressão identificável.
