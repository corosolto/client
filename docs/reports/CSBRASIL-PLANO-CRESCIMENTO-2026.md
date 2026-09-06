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
| Mapas | Uma lane por mapa | não começar Campinho antes do checkpoint; Joá começa pelo resgate cirúrgico do PR #446 fechado, não por uma reautoria |
| Coordenação/release | Codex | evidência, CI, merge sequencial, release e rollback |

### Sprint de 72 horas — 6–8/09

**Dia 1 — integrar o que já existe.** Sertão: atualizar o PR #516, resolver seus gates, CI e
release. O integrador único do viewmodel fecha a matriz 1P em uma passada, sem separar armas,
mãos, reload, ADS ou HUD entre pessoas. Míticos 3P já têm roster, GLBs, registry e animações no
produto; a tarefa agora é aceitar ou rejeitar cada exceção visual, não refazer os personagens.
Cuca permanece fora: a última crítica rejeitou seu grip privado.

**Dia 2 — dois mapas, mudanças cirúrgicas.** Campo do Morro/Campinho recebe somente os três
defeitos que bloqueiam rotação. Joá parte do PR #446 fechado, mas recupera uma série mínima sobre
`main`: primeiro a correção de horizonte/praia que sobreviver ao merge, depois leitura competitiva
e custo. Não se faz merge dos 1.707 arquivos do ramo antigo nem se abre escopo de fauna extra.

**Dia 3 — RC e decisão.** Rodar regressão da rotação, 5x5/8x8, custo, boot, áudio e UI; captura
humana dos mapas e do viewmodel; CI; merge e release sequenciais dos candidatos aprovados. O
resultado é um RC público, com uma lista explícita do que ficou fora. Escadão entra somente se o
candidato atual fechar grafo e horizonte no mesmo prazo.

### Depois do sprint — 9–20/09

Estabilizar o RC, fazer a auditoria mobile e o teste de carga GCP/Cloudflare. Só então produzir
trailer de 30–45 s, seis clipes verticais e duas peças curtas por dia a partir de partidas reais.
O material reprovado não entra em campanha.

### Regra de corte

No fim de 8/09, só entra em release o que tiver build verde, captura real, revisão humana e
telemetria operacional. Essa regra permite velocidade sem repetir o catálogo desigual.
