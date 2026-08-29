<!-- spec:mapa -->
# 13 — Córrego

Favela de São Paulo construída sobre um **córrego a céu aberto** — água escura e parada
cortando o mapa no meio, com **pontes de madeira e palafitas** ligando os dois lados.
Cada time nasce num lado do córrego. As casas são de **madeira com telhado de zinco**,
antena parabólica e caixa d'água. Trechos alagados, um **jacaré** no córrego, **capivara**
na margem e **ratos** perto do lixo. É o mapa mais brasileiro do elenco — e o mais sujo.

## Local real

Favelas de São Paulo cortadas por córrego (referência visual: Heliópolis, Paraisópolis,
favelas da zona leste — genérico, sem copiar endereço real). Textura do lugar: água
esverdeada e parada com espuma, casas de madeira sobre pilotis de concreto, telhado de
chapa de zinco ondulado, antena parabólica em todo telhado, caixa d'água azul, varal,
fio de luz estendido em estadores, muro de contenção de concreto, entulho, pneus, sofá
velho na margem. As pontes são de madeira — tabuas irregulares, sem guarda-corpo, com
buracos.

## Layout

- **O córrego:** eixo central do mapa, correndo no eixo Z (norte-sul). Largura ~5 m.
  Água a -0,3 m do nível da rua (pode cair dentro, mas é fundo o bastante pra bloquear
  tiro rasteiro). Margens de concreto inclinado (talude). O jacaré fica no centro, parado.
- **Lado leste (spawn E):** ruéla de terra com casas de madeira dos dois lados. 2-3
  vielas estreitas. Densidade alta de construção — quase tudo palafita sobre o córrego.
- **Lado oeste (spawn B):** espelho do leste, mas com um barraco de bar/beco mais largo
  e uma pequena praça de terra com bandeira.
- **As pontes:** 3-4 pontes de madeira cruzando o córrego em pontos diferentes.
  - Ponte norte: larga (3 m), com buracos — rota principal.
  - Ponte central: estreita (1,5 m), sem guarda-corpo — risco/recompensa.
  - Ponte sul: de palafita (casas que viraram passagem) — rota coberta.
  - Travessia pelo córrego: possível nos trechos alagados (água rasa, anda devagar).
- **Trechos alagados:** nas pontas norte e sul do córrego, a água sobe ao nível da rua
  (~0,1 m). São zonas de lentidão — anda pela água mas devagar. Capivara fica ali.
- **Spawns:** E no extremo leste; B no extremo oeste. Distância de contato simétrica.

## Cobertura (cover)

- **Margens do córrego:** talude de concreto (cover agachado), muro de contenção.
- **Casas de madeira:** telhado de zinco (não atravessável — layer sólida), paredes
  de madeira (cover alto). Algumas palafitas têm vão embaixo (pode atirar por baixo).
- **Pontes:** sem guarda-corpo — quem está na ponte está exposto dos dois lados.
- **Entulho:** sofá velho, pneus, geladeira, porta arrancada — cover improvisado na margem.
- **Antena parabólica:** cover estreito mas alto (pára tiro de sniper).

## Linhas de visão

- **Ao longo do córrego:** linha longa (30-40 m) — sniper nest na janela de palafita.
  Quebrada pelos pilotis e por curvas no talude.
- **Através do córrego:** curtas (10-15 m) — combate de ponte, SMG e escopeta. Quem
  atravessa a ponte está exposto por 2-3 segundos.
- **Dentro das vielas:** curtas e em L — combate de esquina.

## Fauna (decorativa, não combatente)

- **Jacaré:** modelo estático no centro do córrego, na água. Não ataca, não bloqueia
  passagem. É sátira — "tem jacaré no córrego da favela".
- **Capivara:** nas margens alagadas. Modelo estático, talvez com idle animation
  (olha em volta, coça a orelha).
- **Ratos:** 3-5 modelos pequenos que correm perto do lixo/entulho. Idle aleatório.

## Referências

- `references/favela/` (acervo local).
- Pesquisa complementar: córregos de favela de SP (Heliópolis, Paraisópolis), palafitas
  urbanas, telhado de zinco, antena parabólica. Toda imagem nova entra com `FONTE.md`.

## Régua de aceite

- O córrego é INTRANSPOSSÍVEL exceto pelas pontes e trechos alagados — medir que nenhum
  bot tenta atravessar nadando (waypoints não cruzam o córrego excito pelas pontes).
- Spawn settle coberto por `eval:spawn`.
- Cobertura de grafite dentro do teto do `eval:grafite`.
- O jacaré NÃO é colisor — não pode bloquear tiro ou movimento.
- Cada ponte tem que ter pelo menos 2 rotas alternativas (CTF2).
- Screenshot das duas margens + do córrego + de uma ponte, com descrição (portão 4).
