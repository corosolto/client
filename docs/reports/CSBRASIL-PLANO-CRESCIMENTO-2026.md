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
