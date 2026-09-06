# Plano de crescimento sustentável — 2026

## Objetivo

Transformar CSBrasil de um catálogo amplo, com qualidade desigual, em um shooter
brasileiro cuja primeira partida seja clara, fluida e convidável. A janela eleitoral
ajuda a descoberta; retorno, qualidade e operação sustentável precisam sobreviver a ela.

## Arquitetura a preservar e medir

- **Cloudflare:** proxy e cache de assets estáticos. Medir cache hit, egress, erro 4xx/5xx,
  tempo de download do primeiro pacote e taxa de boot jogável por região/dispositivo.
- **GCP:** backend, salas e tempo real. Medir conexões simultâneas, salas ativas, fila,
  CPU/memória/egress, RTT, frequência de snapshots, frame server, desconexões e custo por
  partida. O limite de jogadores é determinado por esta camada e pelo banco, não por uma
  alegação de escala da Vercel.
- **Vercel:** web, APIs curtas e administração. Manter APIs fail-silent e observar
  invocações, latência, erros, rate limits e custo; não colocar estado de partida nela.

Antes de campanhas pagas ou de alcance amplo, executar carga progressiva com tráfego realista:
100, 300 e 1.000 jogadores simultâneos. Cada degrau exige relatório de custo, SLO e rollback;
DAU não substitui CCU.

## Catálogo: qualidade antes de quantidade

Não apagar mapas nem desrespeitar contribuidores. Separar a rotação e a comunicação pública:

| Faixa | Uso | Regra |
|---|---|---|
| Principal | 3 mapas e modos competitivos recomendados | Captura 3:2, rota/spawn/CTF, FPS e revisão humana aprovados |
| Evento/comunidade | Conteúdo que funciona, mas ainda não alcança a barra principal | Rótulo explícito, telemetria própria e janela limitada |
| Laboratório | Candidatos e experimentos | Fora da fila padrão e sem promessa de qualidade competitiva |

A divergência entre os lançamentos recentes e mapas de colaboradores é um problema de produto,
não de autoria. Todo mapa novo passa pelo mesmo contrato: referência visual/proveniência,
captura real, rotas e spawns, colisão/oclusão, custo em 5x5/8x8, mutante de regressão e crítica
independente. Aceite de contribuição significa aceitar esse processo, não publicar todo mapa.

## Proposta de jogo

Externamente, reduzir a escolha inicial: dois lados principais por temporada, um modo de entrada,
três mapas principais e uma chamada para convidar alguém após a primeira partida. Catálogo de
facções e mapas continua como progressão, eventos e variedade; não precisa ser a primeira decisão
de um jogador novo. Míticos e viewmodels entram quando alcançarem a barra da rotação principal.

## Mobile como beta, não adaptação superficial

Mobile pode ampliar muito a aquisição, mas não deve competir no mesmo matchmaking antes de medir:

1. Auditar boot, download, memória, WebGL, FPS, toque, giroscópio, teclado/gamepad, safe areas,
   reconnect e consumo de bateria em aparelhos Android modestos e iPhone.
2. Criar controle de toque e HUD próprios, com tutorial de 30 segundos, sensibilidade calibrável,
   assistência declarada e opção de lobby separado durante o beta.
3. Lançar beta por convite/landing mobile, medindo boot jogável, primeira partida, D1, FPS p5,
   crashes e abandono por etapa. Só abrir aquisição ampla após os limites serem aceitos.
4. Manter assets adaptativos e orçamento de rede; Cloudflare ajuda entrega, mas o primeiro pacote
   e o backend GCP precisam ser medidos em redes móveis reais.

## Dados que decidem crescimento

Corrigir primeiro a divergência entre home, admin e jogadores por round. Depois registrar, com
frescor explícito: origem/campanha, dispositivo, primeira sessão, primeira partida, primeira
vitória, convite, retorno D1/D7/D30, duração, mapa/modo, região, FPS/RTT, erro e abandono.
Nenhum gráfico que pareça atual substitui a data da última linha observada.

## Próximos marcos

1. Fechar Sertão, viewmodels e Míticos sem reduzir critérios.
2. Publicar rotação principal inicial e marcar o restante como evento ou laboratório.
3. Entregar relatório de dados confiável e funil de primeira partida/retorno.
4. Fazer teste de carga GCP + Cloudflare e definir limites de CCU/custo.
5. Construir beta mobile controlado; só depois ampliar distribuição fora do LinkedIn.

## Calendário executável: 6–20 de setembro

### Donos fixos

| Área | Dono | Limite |
|---|---|---|
| Viewmodel em primeira pessoa | Um único integrador | mãos, arma, animação, ADS e HUD sequenciais; não dividir entre agentes |
| Personagens em terceira pessoa | Emerson | clips e poses 3P, com contrato explícito de entrega para não competir com o integrador de viewmodel |
| UI e áudio | Ruben | mudanças pequenas, isoladas e congeladas antes do RC |
| Mapas | Uma lane por mapa | não começar Campinho e Joá antes do checkpoint de entrada de cada um |
| Coordenação/release | Codex | evidência, CI, merge sequencial, release e rollback |

### 6–8/09 — fechar o núcleo que já está em andamento

- **Sertão:** atualizar PR516 para a `main` atual, corrigir gates remotos, CI verde, merge e
  release observada. Este é o único deploy novo antes de o PR estar limpo.
- **Viewmodel:** o integrador único fecha M4 como decisão binária: candidato legível e com
  contato/cobertura/reload/idle aprovados, ou permanece fora. Emerson mantém somente os clips
  3P correspondentes; não muda mãos, câmera ou HUD de 1P.
- **Míticos:** Cuca fica no experimento privado de retarget aprovado; não entra por métrica
  parcial. Definir uma lista curta do que é necessário para um PR substituto ao #481.
- **Escadão:** fechar grafo/horizonte ou explicitamente rebaixar para o próximo lote; não deixar
  um candidato sem dono bloquear a rotação principal.
- **Dados:** reconciliar online, sessões e jogadores por round; publicar a data real de cada
  métrica e o funil de primeira partida.

### 9/09 — corte de conteúdo e de escopo

Criar uma release candidate interna com Sertão e tudo que efetivamente passou. Congelar novas
facções, armas, mapas e mecânicas. A decisão de Míticos/viewmodels é de aceite ou adiamento,
nunca de “quase pronto”. Gravar uma sessão de captura para trailer e clipes somente com conteúdo
aceito.

### 10–12/09 — Campo do Morro (Campinho)

- Diagnóstico de entrada: preview 3:2, arte, spawns, rotas, CTF, oclusão, 5x5/8x8 e custo.
- Corrigir somente os três defeitos que impedem rotação principal; a própria especificação já
  aponta preview, materiais, mato no campo e bandeirinhas como dívida.
- Criar mutantes para regressões encontradas, revisão independente e decidir: rotação principal,
  evento ou laboratório.

### 13–15/09 — Mansão do Joá

- Fazer o mesmo diagnóstico de entrada; não começar por fauna/avião/faixa antes de leitura de
  combate, visada, água, performance e preview.
- Entregar uma versão competitiva legível; ambiência extra fica apenas se couber no orçamento.
- Capturar material de trailer apenas após a revisão humana do mapa.

### 16–17/09 — estabilização e mobile gate

- Ruben fecha áudio e UI de alto impacto: boot, escolha de partida, convite, feedback de fim de
  rodada e erros/reconnect. Sem redesenho grande neste ciclo.
- Rodar regressão da rotação, dados, assets, áudio e UI; congelar o RC.
- Executar auditoria mobile em dispositivos reais ou laboratório: tamanho inicial, boot, FPS,
  memória, toque, reconnect e legibilidade. O resultado é uma decisão de beta, não promessa de
  lançamento mobile.

### 18–20/09 — lançamento e preparação de campanha

- Teste de carga progressivo GCP/Cloudflare, rollback e limites de salas antes de tráfego pago.
- Release do RC aprovado; monitorar boot jogável, erro, RTT/FPS e jogadores por round.
- Produzir um trailer de 30–45 s, seis clipes curtos verticais e screenshots/kit de imprensa;
  cada peça mostra uma partida real, não render isolado.
- Agendar duas peças curtas por dia e uma sessão ao vivo por semana. TikTok, Shorts, Reels e X
  recebem o mesmo material adaptado; LinkedIn fica para engenharia e bastidores.

### Regra de corte

Em 20/09, só entra na campanha o que tiver build verde, captura real, revisão humana e telemetria
operacional. O que falhar vira evento/laboratório na próxima janela. Assim o lançamento não herda
o problema de catálogo desigual nem coloca marketing em cima de um build instável.
