# Penetração de alto calibre — AWP

## Contrato do primeiro corte

Apenas `awp` recebe penetração. Um tiro pode atravessar uma única superfície de
`madeira` ou `vidro` quando a caixa mundial da malha atingida mede no máximo
`0,28 m` no eixo do tiro. O alvo atrás recebe `50%` do dano já calculado pela
mesma regra de distância/headshot do hitscan. Concreto, metal, superfícies sem
classificação e qualquer arma sem `WEAPONS[id].penetration` continuam bloqueando
como antes.

A bala não procura uma segunda saída: depois da primeira camada, outra malha do
mundo antes do personagem bloqueia o acerto. Se não houver personagem elegível,
o tracer termina no primeiro impacto. Assim não há travessia acumulada de parede
nem tiro que cruza o mapa.

## Fluxo investigado

- O jogador chama `_tryShoot()`, que chama `_fireHitscan()` uma vez por projétil.
- O hitscan ordena raycasts contra personagens e `world.occluders`; antes deste
  corte, o primeiro `occluder` sempre encerrava o tiro.
- A classificação de superfície já existia em `_surfaceOf()`, preferindo
  `userData.surf` e depois material/nome. Não foram alterados materiais, mapas
  ou colliders.
- A saída segura vem de `Box3.setFromObject()` no próprio occluder atingido. A
  distância calculada é o intervalo de saída da caixa ao longo do raio, e é
  aceita somente sob o teto do contrato.
- `_targetFromHit()` preserva o reconhecimento de cabeça/dono usado pelo caminho
  normal; só evita duplicar a leitura da árvore de nós.

## Multiplayer e determinismo

O cliente online mantém o comportamento anterior: não prevê dano através da
parede (`this.online` desliga `_penetrationExit`). Ele espera o snapshot da
autoridade, portanto não cria HP/killfeed duplicado nem uma divergência visual
que o servidor não confirmou.

O servidor autoritativo vive no repositório `csbrasil-backend`, indisponível
nesta worktree. A classe headless compartilhada deve receber este commit antes
de ativar a mecânica em salas públicas; a prova local cobre a semântica da classe
`Game`, não um nó remoto publicado. Este é o bloqueio explícito para release
multiplayer, não uma autorização para o cliente decidir dano.

## Evidência reproduzível

`npm run eval:penetration` constrói uma cena real do `Game` no harness e cobre:

1. AWP atravessa madeira de `0,20 m`, acerta somente o primeiro inimigo e causa
   `200` de dano a partir de `400`.
2. AK não atravessa; concreto fino não atravessa; madeira de `0,50 m` não
   atravessa.
3. Uma segunda parede impede o acerto, provando o teto de uma única camada.
4. O cliente online não prevê penetração.
5. Um mutante que remove `_penetrationExit()` deixa a cláusula de travessia
   vermelha.

A régua entra em `check:fast` como `eval:penetration`.

## Limites deliberados

- Não há penetração de metal/concreto, múltiplos inimigos, ricochete ou perda de
  energia por ângulo.
- A espessura é a caixa mundial da malha de impacto. Em malha longa na direção
  do tiro o resultado é conservador e bloqueia; isso é preferível a aprovar um
  objeto espesso por engano.
- Bots e balanceamento online só devem receber o recurso após a paridade e o
  smoke no repositório autoritativo.
