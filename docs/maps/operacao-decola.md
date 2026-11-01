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

- **Pegada:** 88 × 116 m; contato entre times em 11–15 s, travessia completa do
  objetivo em 95–130 s sem combate.
- **Ato 1 — escritório (z -52 a -16):** recepção, gabinete, arquivo, sala de
  reunião, copa, CPD e corredor em anel. Divisórias e portas alternadas formam um
  labirinto legível, sem corredores sem saída maiores que 8 m.
- **Ato 2 — serviço (z -16 a 22):** triagem, doca, almoxarifado e pátio de
  manutenção. Três rotas: corredor interno, doca central e viela externa.
- **Ato 3 — hangar (z 22 a 48):** mezanino lateral, oficina, estantes e fuselagem
  em manutenção. O centro é aberto, mas carrinhos e bancadas quebram a visada.
- **Ato 4 — apron (z 48 a 58):** faixa final de 10 m até a escada do avião.
  Área curta e exposta para criar o clímax, com GPU, trator de bagagem e pallets
  como cobertura temporária.
- **Rota de Flávio:** 12 checkpoints. Ele só avança quando pelo menos um
  defensor vivo está num raio de 6 m e nenhum atacante está num raio de 4 m.
  Contestado, para; sem escolta por 4 s, recua lentamente até o checkpoint anterior.
- **Condição de vitória:** defensores vencem quando Flávio permanece 3 s na
  zona da escada. Atacantes vencem ao derrubá-lo ou quando os 6 min acabam.
- **Respawn:** ondas de 8 s nos checkpoints de retaguarda; o spawn nunca muda
  para um ponto à frente do VIP.

## Cobertura (cover)

- Escritório: armários de arquivo, ilhas de mesa, pilares, balcão de recepção e
  divisórias opacas de 1,45 m; vidro é visual e nunca colisor invisível.
- Serviço: caixas, pallets e carrinhos em pares, deixando corredores de 1,8 m.
- Hangar: bancadas, pneus, estantes e uma aeronave em manutenção; nenhuma peça
  forma uma visada reta maior que 32 m.
- Apron: quatro covers baixos e dois altos. O avião não absorve tiro fora da
  fuselagem visível.

## Linhas de visão

- Escritório: 5–14 m, sempre com duas saídas por sala.
- Serviço: 12–24 m; a doca central é a rota rápida e exposta.
- Hangar: 18–32 m no térreo e uma única linha de 38 m no mezanino, quebrada por
  duas colunas estruturais.
- Apron: 28 m máximos; atiradores veem a zona final, mas não o último checkpoint
  dentro do hangar.
- Cada checkpoint do VIP tem duas aproximações atacantes e uma rota de retirada
  defensora. Nenhum spawn enxerga outro spawn ou o VIP.

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
- Grafo prova duas rotas independentes entre cada spawn e os 12 checkpoints.
- Bot escolta completa 20/20 sementes; bot atacante consegue impedir ao menos
  20% e no máximo 80% das partidas na dificuldade média.
- Mutante sem a guarda de contestação faz a régua falhar.
- Snapshot multiplayer reproduz o mesmo checkpoint, vida e vencedor em dois
  clientes com a mesma semente.
- Capturas obrigatórias: escritório, transição, hangar e apron, em 3:2, com
  descrição visual adversarial.
- Cartaz OpenRouter e os cinco props Mint são abertos e inspecionados antes da
  integração; asset ausente cai em fallback procedural, nunca em objeto invisível.
