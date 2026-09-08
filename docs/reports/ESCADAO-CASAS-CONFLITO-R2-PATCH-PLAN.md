# Escadão: plano de patch das casas disputáveis

Este plano começa somente após a estabilização da fundação #540–#551 e a atualização
da PR #529 contra a `main`. Nenhuma etapa de runtime abaixo foi executada neste
checkpoint.

## 1. Preservar a casa central já validada

Manter os dois acessos existentes: passarela a partir do patamar e escada externa a
partir da rua. Preservar a janela da escada e a janela voltada à aproximação inferior
nos pontos já verdes da matriz. A integração deve continuar com piso físico e visual
na cota 2,75 m e sem visão direta para slots de nascimento.

## 2. Transformar os dois volumes do mirante em sobrados táticos

Substituir apenas os volumes sólidos centrados em `[-12, -26]` e `[12, -27]` por
shells procedurais com pavimento superior. A cota de entrada é 7,56 m e o piso alto
é 10,61 m. A face voltada ao respawn B permanece fechada.

Cada shell terá:

- laje visível e contínua no piso alto;
- volume interno com pelo menos 0,76 m livres para o corpo;
- porta na parede lateral externa;
- janela na parede lateral interna, voltada ao centro do mirante;
- peitoril e verga que não invadem o corredor de tiro;
- parede traseira sólida, impedindo leitura dos quatro slots B.

As janelas propostas ligam os olhos `[-10,35; 12,23; -26]` e
`[10,35; 12,23; -27]` às posições de revide `[-5; 9,06; -27]` e
`[5; 9,06; -27]`. Esses pares já cabem no corpo e têm LOS recíproco; o patch deve
criar arquitetura ao redor deles sem transformar a linha livre atual em spawn kill.

## 3. Construir os acessos laterais

Adicionar uma escada estreita por fora de cada sobrado, nos corredores x≈−14,55 e
x≈14,55. A subida total é 3,05 m. O perfil deve usar espelhos de no máximo 0,30 m,
com patamar diante da porta lateral e guarda somente na borda de queda.

A física precisa reconhecer a progressão da escada e o piso alto usando `yRef`:
um jogador no mirante não pode ser teleportado para 10,61 m ao passar sob a laje.
Os percursos declarados em `routeSpecs` são o contrato inicial; ajustes finos nas
coordenadas devem mudar a régua e o patch no mesmo commit, com a medição antes/depois.

## 4. Integrar navegação e contrajogo

Adicionar nós de waypoint ao longo de cada escada, do patamar lateral e do interior.
Cada aresta deve passar `_retaAndavel` com raio 0,38 m e degrau máximo de 0,30 m.
O atacante posicionado no centro do mirante precisa conseguir alcançar o posto de
tiro, para que o revide tenha também uma rota de expulsão física.

Não abrir uma segunda janela para o respawn. A posição é aceita somente quando:

- atirador e alvo são ocupáveis;
- tiro e revide atravessam o mesmo vão;
- o atacante chega ao atirador pela rota lateral;
- nenhum dos quatro slots B fica visível do pavimento superior.

## 5. Ordem de validação após o sinal

1. Atualizar a branch e resolver conflitos sem aceitar arquivos gerados antigos.
2. Rodar o escopo `full` e guardar a saída vermelha como baseline A.
3. Editar o runtime e o grafo numa única frente sequencial.
4. Rodar `full` até 22/22 sem afrouxar cápsula, degrau ou proteção do spawn.
5. Rodar os três mutantes e confirmar a família exata de falha.
6. Rodar as réguas existentes da casa, estrutura, descida, grafo e contrato.
7. Gerar capturas 3:2 no navegador com GLBs reais, olhando as duas escadas, as duas
   janelas e a face fechada para o respawn.
8. Só então integrar a régua ao `package.json` e ao portão, regenerar documentação,
   atualizar o relatório da PR e solicitar revisão humana.

O patch não deve aproveitar esta rodada para mudar iluminação, materiais, horizonte,
decais ou outras casas. A #548 já toca materiais do Escadão; manter o diff de gameplay
restrito reduz o conflito e deixa a causa de qualquer regressão identificável.
