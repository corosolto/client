<!-- spec:mapa -->
# 02 — Invasão dos Javaporcos

Modo cooperativo de sobrevivência e pontuação na borda de uma cidade do interior.
O time segura ondas de javalis e javaporcos que saem do mato, atravessam lavoura,
currais e galpões e tentam alcançar o bairro. Sem gore: impacto, poeira, tropeço e
desaparecimento substituem ferimentos explícitos.

## Local real

Composição original da transição urbano-rural do Centro-Sul: bairro de casas
térreas e oficina na ponta sul, estrada vicinal e silo no meio, milho, pasto,
córrego e mata ciliar ao norte. O contexto ambiental é factual: o Ibama classifica
o javali (`Sus scrofa`) como espécie exótica invasora e regulamenta seu controle.
O cenário não reproduz uma propriedade ou município específico.

## Layout

- **Pegada:** 112 × 120 m; o jogador enxerga a cidade ao sul e o campo ao norte
  desde o cruzamento central.
- **Faixa urbana (z -58 a -24):** três ruas curtas, praça, oficina, casas e muro
  de escola. É a última linha de defesa e contém o depósito de munição.
- **Transição (z -24 a 18):** estrada vicinal em curva, posto rural, silo,
  armazém e curral. Corredores largos para combate de média distância.
- **Campo (z 18 a 58):** lavoura de milho em quatro talhões, pasto, córrego raso
  e mata ciliar. Trilhas amassadas formam rotas, não uma parede sólida de plantas.
- **Entradas:** quatro tocas/rasgos na mata. Cada uma liga a pelo menos duas
  rotas até a cidade; ondas nunca nascem na visão direta do jogador.
- **Objetivos:** proteger o silo, o posto de saúde rural e o portão do bairro.
  Um animal que alcança um objetivo tira integridade; a partida termina quando os
  três caem ou após oito ondas.
- **Ondas:** 35 s de combate + 12 s de preparação. Quantidade escala de 8 para
  34 inimigos, com teto de 24 vivos para manter CPU, draw calls e rede previsíveis.

## Cobertura (cover)

- Campo: fardos, trator, taipas, pedras e valas rasas. O milho mascara movimento,
  mas não absorve tiro.
- Transição: pilares do armazém, caçambas, pneus e bebedouro de concreto.
- Bairro: muros de 1,35 m, carros antigos e quiosque da praça; nenhuma porta de
  casa vira armadilha sem saída.
- Corredores de 1,8 m mínimos acomodam dois animais e um jogador sem travamento.

## Linhas de visão

- Mata e milho: 8–18 m, com silhueta e poeira denunciando a aproximação.
- Pasto e estrada: 22–38 m, quebrados pelo silo e por duas curvas de nível.
- Rua principal: 32 m máximos; o portão final nunca enxerga uma toca.
- Cada objetivo tem três setores de ataque e pelo menos duas posições de defesa.

## Pontuação e progressão

- Javali jovem: 100 pontos; javaporco: 180; matriarca: 300; aríete da onda: 500.
- Assistência vale 40% dos pontos, dividida proporcionalmente pelo dano.
- Combo cresce por abates em até 4 s: ×1,0, ×1,25, ×1,5, ×2,0; dano aliado não
  existe e acerto em objetivo não gera pontos.
- Bônus de onda: `500 × objetivos intactos`; bônus final: integridade restante
  somada ao tempo, sem prêmio por prolongar a partida.
- Placar mostra pontos, eliminações, assistências, maior combo e dano evitado.

## Modo multiplayer

- Servidor/host autoritativo decide spawn, navegação, dano, abate, pontuação,
  integridade e início/fim de onda.
- Snapshot replica `wave`, `seed`, `aliveIds`, `objectiveHealth`, `scoreByPlayer`,
  `prepLeft` e `winner`; eventos incluem `BOAR_SPAWN`, `BOAR_HIT`, `BOAR_KILLED`,
  `OBJECTIVE_HIT`, `WAVE_CLEARED` e `HORDE_FINISHED`.
- Posição usa quantização já adotada pela simulação; fauna usa IDs estáveis por
  `matchSeed + wave + ordinal`. Partículas, vegetação e música não entram no hash.
- Offline usa o mesmo estado com companheiros bots. A rede é opcional, nunca
  substitui o fallback local.

## Cinemática e áudio

- Vitória: 10 s em tempo real — câmera sobe do portão intacto, cruza o milho
  salvo e revela o amanhecer no campo; placar entra sobre a última tomada.
- Derrota: 6 s — portão cai, luzes do bairro apagam e a câmera recua, sem gore.
- Música: marcha instrumental original de 18–24 s, caixa militar, metais e viola
  caipira discreta; sem hino, voz, melodia protegida ou imitação.
- OpenRouter gera o cartaz 2D. A faixa exige um provedor de música compatível; o
  fluxo OpenRouter atual do projeto gera imagem e voz, não música. Mint só entra no
  3D: javali jovem, javaporco adulto, matriarca e aríete. Os quatro compartilham
  material e LOD, mas preservam silhuetas diferentes.

## Referências

- Ibama — manejo e controle do javali:
  https://www.gov.br/ibama/pt-br/assuntos/biodiversidade/especies-exoticas-invasoras/manejo-e-controle-do-javali
- Ibama — Manual de Boas Práticas para o Controle de Javali:
  https://www.gov.br/ibama/pt-br/assuntos/notas/2020/manejo-e-controle-de-javalis/20201217Manual_do_Javali_Digital.pdf
- Embrapa — avaliação de impacto em lavoura de milho:
  https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1148617/1/CT124-Avaliacao-Javali2022.pdf
- Prompts e resultados registram provedor e hashes em
  `public/models/enemies/javaporcos/asset-manifest.json`.

## Régua de aceite
- Ficha passa em `node tools/spec.mjs check docs/maps/invasao-javaporcos.md`.
- Oito ondas terminam em 20/20 sementes, sem mais de 24 animais vivos.
- Mutante que duplica o crédito de assistência reprova a soma de pontos.
- Mutante que remove uma entrada reprova a conectividade das quatro tocas.
- Dois clientes com a mesma semente fecham cada onda com IDs, integridade e
  pontuação idênticos.
- Bots defendem ao menos dois objetivos em 30–70% das sementes na dificuldade
  média; fora dessa faixa o balanceamento está trivial ou impossível.
- Capturas obrigatórias: bairro, transição, lavoura e mata, em 3:2, com revisão
  adversarial independente.
- Os quatro animais Mint e o cartaz OpenRouter são abertos e inspecionados; se o
  GLB não carregar, o inimigo usa fallback procedural com a mesma hitbox.
