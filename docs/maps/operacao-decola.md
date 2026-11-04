<!-- spec:mapa -->
# 02 - Operação Flávio

Modo assimétrico de escolta em um aeroporto executivo. O time bolsonarista
protege o senador Zero Um durante a fuga do escritório até um avião; o outro
time precisa interromper a evacuação. O personagem jogável `senador`, já
existente no elenco como Zero Um, representa Flávio dentro da sátira do jogo.

## Local real

Composição original inspirada em aeroportos executivos brasileiros: bloco
administrativo baixo, corredor de segurança, pátio de serviço, hangar de
manutenção e apron. A planta não reproduz a segurança de um aeroporto
específico. O contraste visual é deliberado: escritório apertado e quente,
hangar industrial azul-cinza e pista aberta na luz do fim da tarde.

## Layout

- **Espaço jogável:** limites de `x -43…43` e `z -57…57` (86 × 114 m). O piso visual do aeroporto é maior, 94 × 124 m, e os volumes externos são apenas cenário.
- **Escritório (z -52 a -16):** terminal aberto com recepção, assentos, jardineiras e corredores entre móveis. Não há salas fechadas em anel nem mezanino. As paredes sul, norte e laterais têm aberturas reais. Cada banco de assentos tem 2,6 × 1,05 × 0,9 m, abaixo da estatura de 1,72 m dos personagens; GLB e fallback usam as mesmas dimensões e o mesmo proxy rotacionado.
- **Serviço (z -16 a 22):** controle de acesso central, guaritas e separadores. A travessia oferece cinco opções: corredor central, vielas externas oeste/leste e vielas internas oeste/leste. As internas saem da porta central, contornam as coberturas em `(-12,5)` e `(12,4)` por `x = ±15.5` e convergem para `x = ±7` na entrada do hangar, sem saída cega.
- **Hangar (z 22 a 48):** estrutura aberta com oficina, veículos, containers e carrinhos. Coberturas sólidas em `(-3, 37)` e `(10, 37)` interrompem parte das visadas longitudinais sem ocupar a linha da escolta.
- **Apron (z 48 a 57):** escada em `(4.2, 52)`, avião em `(0, 55)` e último checkpoint em `(7.2, 49.2)`. A cobertura em `(-1,45)` fecha a visada aberta sem tocar a aproximação da escada, que fica fora dos proxies da fuselagem e das asas.
- **Rota de Flávio:** 13 checkpoints, do spawn `(-20, -48)` ao apron. Ele só avança quando pelo menos um defensor vivo está num raio de 6 m e nenhum atacante está num raio de 4 m. Contestado, para; sem escolta por 4 s, recua lentamente até o checkpoint anterior.
- **Condição de vitória:** defensores vencem quando Flávio permanece 3 s na zona da escada. Atacantes vencem ao derrubá-lo ou quando os 6 min acabam.
- **Respawn:** ondas de 8 s nos checkpoints de retaguarda; o spawn nunca muda para um ponto à frente do VIP.

## Portas e navegação

- Sul: `x ±20, z -52`; norte: `x -17, 0, 17, z -16`; laterais: `x ±29, z -43 e -25`.
- O grafo combina grade de 3,5 m, centros e relés explícitos das nove portas e nós ao longo da escolta e das cinco rotas de serviço.
- Arestas ligam somente vizinhos próximos e usam interseção exata entre segmento e AABBs expandidas. Um índice espacial restringe os pares candidatos a células adjacentes; a construção não faz a antiga varredura de todos os pares.
- A cobertura oeste/leste externa exige o desvio por `x ∓19.4`; as rotas internas usam relés antes dos scanners e contornos próprios. Todos os cinco trajetos têm segmentos físicos livres e ligação pelo grafo até o embarque.

## Spawns e primeira leitura

- **B:** `(-20,-48)`, `(-17.8,-46.5)`, `(-22.2,-47.5)` e `(-20,-50.5)`, todos com `yaw = π`, voltados para o avanço em `+z` e não para a parede sul.
- **E:** `(-33,16)`, `(33,16)`, `(-32,54)` e `(32,54)`, todos com `yaw = 0`. Os pontos traseiros saem do espaço entre torres, oficinas e containers; há passagem livre imediata e ligação ao grafo.

## Cobertura e linhas de visão

- Nove coberturas procedurais sólidas de 1,45 m: terminal `(-7,-37)` e `(8,-37)`, serviço externo `(-23,3)` e `(23,3)`, acesso interno `(-12,5)` e `(12,4)`, hangar `(-3,37)` e `(10,37)` e apron `(-1,45)`. Elas têm colisor, oclusão e sombra também no perfil baixo.
- `escortCoverPoints` contém 20 posições utilizáveis junto a essas coberturas, à barreira do apron e à escada. São posições separadas dos checkpoints; a presença dos pontos no contrato do mapa não afirma, por si só, uma política tática dos bots.
- As novas peças quebram as visadas centrais do terminal, as duas vielas internas e as linhas longas do hangar/apron sem ocupar os segmentos entre os 13 checkpoints. Móveis e equipamentos existentes continuam formando cobertura complementar.

## Avião e colisores

- Cada prop sólido declara seu yaw. O proxy é a AABB que envolve o retângulo rotacionado, e é idêntico com GLB carregado ou fallback procedural.
- O avião usa proxy de fuselagem de 3,4 × 12 m e proxy de asas de 16 × 3,2 m, ambos centrados na área visual de pouso. Fuselagem e asas não atingem o último checkpoint nem o segmento da escolta que chega a ele; a escada é sólida e sua subida ocorre na cinemática.
- As AABBs são envelopes conservadores, não colisão por polígono nem OBB. Cantos vazios de um prop rotacionado podem parecer mais fechados que o modelo visual.
- A navegação é 2D e `groundHeightAt` permanece zero. Não há mezanino jogável nem subida livre pela escada; o embarque pela escada pertence à cinemática.

## Qualidade e desempenho

- No perfil baixo, o vidro do mapa usa `MeshStandardMaterial` transparente, sem `transmission`; materiais transmissivos dos GLBs também são convertidos preservando os parâmetros visuais comuns. Em médio/alto, o vidro físico e sua transmissão são preservados.
- No perfil baixo, decoração não sólida, tesouras e props não sólidos deixam de projetar sombra. Paredes, coberturas e props sólidos continuam no shadow pass, inclusive quando o GLB falha e o fallback procedural é usado; o fallback não duplica o proxy explícito. Geometria, posições, cores de vidro e sinalização não mudam entre os perfis.
- Essas medidas reduzem trabalho de material e de sombra por construção. Não há neste documento uma medição de FPS ou de tempo de frame que sustente um ganho numérico.

## Modo multiplayer

- Simulação autoritativa replica `phase`, `checkpoint`, `flavioPosition`,
  `flavioHealth`, `escortCount`, `contested`, `timeLeft` e `winner`.
- Eventos discretos: `FLAVIO_HIT`, `FLAVIO_CHECKPOINT`, `FLAVIO_CONTESTED`,
  `FLAVIO_BOARDED` e `ESCORT_FINISHED`; clientes não decidem avanço ou vitória.
- O mesmo contrato roda offline com bots. A ausência da sessão de rede nunca
  remove o modo local.
- Estado é determinístico por `matchSeed`; o hash de simulação inclui o objetivo,
  não câmera, partículas, música ou a cinemática.

## Cinemática e áudio

- Vitória defensora: 9 s em tempo real - Flávio sobe a escada, a porta fecha,
  o avião taxia e a partida corta para o placar. Vitória atacante: luzes do
  hangar apagam, sirene vermelha e câmera para no avião imobilizado.
- A cinemática é pulável depois de 2 s e nunca bloqueia o fechamento da partida.
- Música: marcha instrumental original de 18–24 s, caixa militar e metais, sem
  melodia de hino, sem voz e sem imitação de obra existente.
- OpenRouter gera o cartaz 2D do modo. A faixa original exige um provedor de
  música compatível; o fluxo OpenRouter atual do projeto gera imagem e voz, não música.
  Mint gera somente os props 3D: avião executivo, trator de bagagem, carrinho
  de ferramentas, arco de segurança e escada móvel.

## Referências

- ANAC, infraestrutura aeroportuária e segurança operacional:
  https://www.gov.br/anac/pt-br/assuntos/aerodromos
- Prompts e resultados registram provedor e hashes em
  `public/models/props/operacao_decola/asset-manifest.json`.

## Régua de aceite
- Ficha passa em `node tools/spec.mjs check docs/maps/operacao-decola.md`.
- `node tools/eval/operacao-flavio-collider-check.mjs` cobre equivalência GLB/fallback, yaw das AABBs, escala humana e alinhamento dos quatro bancos, pegada do avião, 13 checkpoints e seus segmentos, nove portas, cinco rotas físicas ligadas ao embarque, nove coberturas com oclusão, 20 pontos de cobertura, primeira leitura dos spawns e corte de custo no perfil baixo sem perder sombra de fallback sólido. `operacao-flavio-proof-check.mjs collider` verifica os mutantes dessas cláusulas.
- `node tools/eval/operacao-flavio-door-proof.mjs` combina atravessia física e grafo na fachada, inclusive mutantes sem arestas, unidirecionais e atravessando parede. O orçamento do grafo exige candidatos locais, não todos os pares.
- As metas de simulação continuam: escolta completa em 20/20 sementes e atacantes impedindo 20–80% das partidas na dificuldade média. São metas de balanceamento, não um resultado medido declarado por esta ficha.
- Mutante sem a guarda de contestação faz a régua falhar.
- Snapshot multiplayer reproduz o mesmo checkpoint, vida e vencedor em dois
  clientes com a mesma semente.
- Capturas obrigatórias: escritório, transição, hangar e apron, em 3:2, com
  descrição visual adversarial.
- Cartaz OpenRouter e os cinco props Mint são abertos e inspecionados antes da
  integração; asset ausente cai em fallback procedural, nunca em objeto invisível.
