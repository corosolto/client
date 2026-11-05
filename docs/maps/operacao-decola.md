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
- **Proteção do embarque (objetos reais):** o terminal não usa caixas procedurais de cobertura. Um balcão de check-in rotacionado em `(0,-32)` fecha a canyon da porta central norte; as jardineiras de 1,8 m em `(-7.2,-38.6)`, `(8.2,-38.6)`, `(-22.5,-41.3)`, `(-22.5,-39.8)`, `(17.5,-43)`, `(-28,-45.5)` e `(24,-44.5)` escondem um personagem de 1,72 m e cortam as lanes das portas laterais; o segundo balcão em `(15,-39)` e os bancos em `(±9,-25.5)` completam as linhas de fogo. Tudo é colisor sólido, occlude hitscan a 1,5 m e entra no grafo sem criar becos.
- **Serviço (z -16 a 22):** controle de acesso central, guaritas e separadores. A travessia oferece cinco opções: corredor central, vielas externas oeste/leste e vielas internas oeste/leste. As internas saem da porta central, contornam as coberturas em `(-12,5)` e `(12,4)` por `x = ±15.5` e convergem para `x = ±7` na entrada do hangar, sem saída cega. O gauntlet mediu o pátio aberto demais: ilhas reais escalonadas a cada ~8–12 m da lane agora cobrem a cadeia — barreiras em `(5,-4)` e `(-6.2,4)`, `carro_servico` em `(18,10)`, `trator_bagagem` em `(-19,9)` e barreiras na boca do hangar `(±11,24)`, balanceando as duas lanes de aproximação E.
- **Hangar (z 22 a 48):** estrutura aberta com oficina, veículos, containers e carrinhos. Coberturas sólidas em `(-3, 37)` e `(10, 37)` interrompem parte das visadas longitudinais sem ocupar a linha da escolta.
- **Apron protegido por GSE (z 48 a 57):** escada encostada na fuselagem em `(-3.2, 52.5)` — o GLB não expõe nó de porta, então o alinhamento é geométrico, com a plataforma tocando o dorso —, avião em `(0, 55)` e último checkpoint em `(7.2, 49.2)`. A GPU em `(-1, 44.6)`, o bay de containers `(-12, 51.4)`/`(-12, 53.6)`, o container leste `(16.5, 52)`, a GPU leste `(24, 50)`, os carrinhos `(8.6, 47)`/`(-24, 47)` e o `carro_servico` `(−8, 54.5)` ao pé da escada (cobertura dura onde os corrimãos finos não contam) fecham as lanes E (±32, 54) com contagem alta equilibrada (10 oeste × 8 leste, tolerância 2). A barreira que saturava o primeiro quadro do spawn E oeste saiu do mapa.
- **Respawn:** ondas de 8 s nos checkpoints de retaguarda; o spawn nunca muda para um ponto à frente do VIP. A sala de embarque é o retiro do time B: para o time E, o modo nunca escolhe candidato dentro do retângulo `x -29…29, z -57…-44` (metade sul do terminal e o bolso externo das portas sul) — E renasce na vanguarda ou na base. No mapa, os quatro spawns E ficam fora dessa região e nenhum caminho do grafo de um spawn E até o embarque do avião atravessa o bolso sul.
- **Rota de Flávio:** 13 checkpoints, do spawn `(-20, -48)` ao apron. Ele só avança quando pelo menos um defensor vivo está num raio de 6 m e nenhum atacante está num raio de 4 m. Contestado, para; sem escolta por 4 s, recua lentamente até o checkpoint anterior.
- **Condição de vitória:** defensores vencem quando Flávio permanece 3 s na zona da escada. Atacantes vencem ao derrubá-lo ou quando os 6 min acabam.

## Portas e navegação

- Sul: `x ±20, z -52`; norte: `x -17, 0, 17, z -16`; laterais: `x ±29, z -43 e -25`.
- O grafo combina grade de 3,5 m, centros e relés explícitos das nove portas e nós ao longo da escolta e das cinco rotas de serviço.
- Arestas ligam somente vizinhos próximos e usam interseção exata entre segmento e AABBs expandidas. Um índice espacial restringe os pares candidatos a células adjacentes; a construção não faz a antiga varredura de todos os pares.
- A cobertura oeste/leste externa exige o desvio por `x ∓19.4`; as rotas internas usam relés antes dos scanners e contornos próprios. Todos os cinco trajetos têm segmentos físicos livres e ligação pelo grafo até o embarque.

## Spawns e primeira leitura

- **B:** `(-20,-48)`, `(-17.8,-46.5)`, `(-22.2,-47.5)` e `(-20,-50.5)`, todos com `yaw = π`, voltados para o avanço em `+z` e não para a parede sul.
- **E:** `(-33,16)`, `(33,16)`, `(-32,54)` e `(32,54)`, todos com `yaw = 0`. Os pontos traseiros saem do espaço entre torres, oficinas e containers; há passagem livre imediata e ligação ao grafo.

## Cobertura (cover)

- A sala de embarque e o apron giram em torno de **objetos reais** nos quais Flávio se esconde: jardineiras de 1,8 m, bay de containers de 2,6 m, GPUs de 2,0 m e balcões de 1,4 m (cobertura agachada, validada a 1,2 m). Cada peça é colisor sólido, oculta um personagem de 1,72 m, interrompe hitscan a 1,5 m de altura dos olhos e mantém sombra no perfil baixo. Nenhuma caixa procedural cobre o embarque ou o apron.
- Seis coberturas procedurais sólidas de 1,45 m permanecem no corredor de serviço e no hangar: serviço externo `(-23,3)` e `(23,3)`, acesso interno `(-12,5)` e `(12,4)`, hangar `(-3,37)` e `(10,37)`.
- `escortCoverPoints` expõe **43 slots com papel e zona** (`role: guard|roamer`, `zone: embarque|servico|hangar|apron`): embarque 13 guardas + 2 roamers, serviço 15 guardas, hangar 5 guardas, apron 5 guardas + 3 roamers. Isso sustenta a formação 6×6 — quatro guardas diretos junto ao VIP e dois roamers de flanco — em qualquer trecho da rota. Cada slot está livre com folga de corpo (0,46 m), a ≤1,6 m de um colisor alto, a >1 m de qualquer checkpoint e ligado ao grafo. Contrato de densidade com o modo: **cada checkpoint intermediário (1–11) tem ≥2 slots a ≤8 m** para o VIP escolher abrigo por concealment.

## Linhas de visão

- A régua exige que cada slot de guarda esteja sem linha de visão a 1,5 m da lane de aproximação contra a qual foi desenhado: portas norte `(0,-16)`/`(17,-16)` e laterais `(±29,-43)`, boca do hangar `(0,19)` e spawns E do apron `(±32,54)`.
- As peças novas quebram a canyon da porta central `(0,-16)→(0,-52)`, as lanes laterais `z -43/-25`, e as linhas leste/oeste do apron `(±32,54)→escada/CP12`, sem ocupar os segmentos entre os 13 checkpoints. A régua amostra a rota a cada 2 m e exige cobertura alta a ≤8 m em todo trecho CP1→CP12 — a cadeia de ilhas do gauntlet. O grafo continua uma componente única sem nós folha, e a distância de aproximação de cada spawn E a qualquer checkpoint permanece ≤ 35 arestas — proteção sem labirinto.
- **Marcação semântica:** cada checkpoint tem um anel âmbar emissivo (`marca-checkpoint-escolta`, render-only), distinto das faixas amarelas de pintura e do anel branco do estacionamento; a fila da guarita virou dois segmentos com vão central de 1,8 m.
- **Horizonte:** cinco volumes de serra (`serra-distante`) além de `z ±150`, dentro da faixa de névoa, devolvem contraste entre o avião claro e o céu pálido.
- **Captura preta do terminal:** era ponto de vista dentro do balcão `(0,-32)`, não luz ausente. A régua prova que nenhum waypooint válido nasce penetrado em colisor e que as três luminárias do salão (`z -46/-34/-22`) permanecem; a cintura da fila não cruza mais o campo da câmera.

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
- `node tools/eval/operacao-flavio-collider-check.mjs` cobre equivalência GLB/fallback, yaw das AABBs, escala humana e alinhamento dos oito bancos, pegada do avião, 13 checkpoints e seus segmentos, nove portas, cinco rotas físicas ligadas ao embarque, as seis coberturas procedurais restantes com oclusão, o inventário de cobertura real sólida que esconde o VIP e corta hitscan a 1,5 m, os 28 slots de cobertura com papel/zona (formação 4 guardas + 2 roamers por zona), a oclusão dos slots de guarda contra as lanes de aproximação, a sala de embarque livre de spawns/caminhos E (anti-armadilha de respawn), o grafo em componente única sem nós folha, o teto de 35 arestas na aproximação E (pressão de rota), a primeira leitura dos spawns e o corte de custo no perfil baixo sem perder sombra de fallback sólido. `operacao-flavio-proof-check.mjs collider` verifica os 24 mutantes dessas cláusulas, incluindo ilha decorativa, bay deslocado, anel de checkpoint ausente e escada sem proxy.
- `node tools/eval/operacao-flavio-door-proof.mjs` combina atravessia física e grafo na fachada, inclusive mutantes sem arestas, unidirecionais e atravessando parede. O orçamento do grafo exige candidatos locais, não todos os pares.
- As metas de simulação continuam: escolta completa em 20/20 sementes e atacantes impedindo 20–80% das partidas na dificuldade média. São metas de balanceamento, não um resultado medido declarado por esta ficha.
- Mutante sem a guarda de contestação faz a régua falhar.
- Snapshot multiplayer reproduz o mesmo checkpoint, vida e vencedor em dois
  clientes com a mesma semente.
- Capturas obrigatórias: escritório, transição, hangar e apron, em 3:2, com
  descrição visual adversarial.
- Cartaz OpenRouter e os cinco props Mint são abertos e inspecionados antes da
  integração; asset ausente cai em fallback procedural, nunca em objeto invisível.
