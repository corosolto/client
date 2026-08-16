# LANÇAMENTO, MONETIZAÇÃO, COMUNIDADE E CARREIRA

> **Decisão do dono: doações + anúncios próprios + portais.**
> Este plano tem uma decisão que precisa ser tomada **hoje, antes do primeiro contribuidor
> externo**: a licença. Ela trava tudo abaixo.

---

## 1. A decisão que não pode esperar: licença

Você escolheu monetizar com ads e portais. Isso cria três conflitos que se resolvem com uma
única decisão de licença, e que **ficam impossíveis de resolver depois** que alguém contribuir.

### 1.1 Os conflitos

- **Qualquer um pode forkar e remover seus anúncios.** Não é fatal — é o modelo de vários
  projetos — mas exige que o seu *moat* não seja o cliente.
- **Poki exige exclusividade web de 5 anos** e considera Discord e YouTube Playables como web.
  **Incompatível com open source.** Descarte a Poki.
- **CrazyGames limita a 250 MB totais e 1.500 arquivos.** Você tem **291 MB só em
  `public/models/`** (155 MB de `fpvm/` — os `arms_*.glb` do pipeline Tripo, 18 MB cada, que
  **estão mortos** no caminho ativo `MINT_VM`) e **172 MB de áudio**.
  → **Ação:** os `arms_*.glb` só carregam com `?tripovm=1` (`fparms.js:35`). Movê-los para fora
  do bundle publicado tira 155 MB de uma vez. Com áudio streamado sob demanda, cabe.

### 1.2 A recomendação
```
Código do cliente + servidor:  MIT           (mantém o que já está lá; permite Steam depois)
Assets, áudio, arte, memes:    CC BY-NC ou proprietária  (não vai para o fork)
Nome + logo "CORO SOLTO":      marca, não licenciada
```

**Por que MIT e não AGPL**, apesar de AGPL proteger melhor contra fork comercial:
- Você tem os `arms_*.glb` e o áudio já fora do git — a separação código/asset **já existe de
  fato**, só falta escrever.
- **Bibliotecas GPL não podem ser linkadas com o Steamworks SDK.** Se um dia quiser Steam
  (modelo Mindustry: grátis e aberto no browser, pago no Steam), AGPL trava.
- Greptile Starter é grátis para não-comercial **MIT ou Apache** (plano `05` §5).
- O *moat* real é o **servidor multiplayer oficial** (matchmaking, ranking, contas) + assets +
  marca. Não é o código do cliente.

**O que NÃO fazer:** licenças "fair source" (FSL, FCL, BUSL). São legítimas para SaaS B2B, mas
o HN e o Reddit crucificam projetos que se chamam "open source" sem licença aprovada pela OSI —
isso queima o lançamento. E **os programas de crédito de IA exigem OSS de verdade**.

### 1.3 O contrato social, no README, hoje
Seis linhas, antes da primeira contribuição externa:
- quem é dono da marca
- o que o dinheiro custeia (servidor, CDN, banda, créditos de IA, domínio)
- o que acontece se você parar
- a promessa explícita de que **o código nunca vai fechar**

**Contribuidores não se ressentem de você ganhar dinheiro. Se ressentem de descobrir depois que
as regras eram outras.** O caso canônico é o `core-js`: 9 bilhões de downloads, US$ 57/mês de
doação, e o mantenedor anunciou que "a versão livre será significativamente limitada" — o
resultado foi desconfiança, e o financiamento não decolou. A lição não é "não peça dinheiro"; é
**não peça depois de já estar amargo, e nunca vincule o pedido à ameaça de fechar o código.**

---

## 2. Monetização: os números honestos

### 2.1 O que dá para esperar

Benchmarks 2026 de eCPM:

| Formato | EUA | Europa | **Tier-3 (Brasil)** |
|---|---|---|---|
| Rewarded video | US$ 15-28 | US$ 8-15 | **US$ 1-3** |
| Intrinsic/in-game | US$ 2-6 | — | — |

**Brasil é tier-3.** O mesmo jogador vale ~10× menos que um americano. Isso não é opinião, é a
economia da publicidade digital, e é o fato mais importante deste plano.

Caso real com números publicados (GolfRoyale.io): 120 mil jogadores únicos, ~870 mil impressões,
**€400 no total** — ~€0,46 de RPM combinado, com "bom volume de países de CPM alto". Foi
rejeitado pelo AdSense e migrou para AdinPlay.

**Estimativa para o seu caso** (2 impressões/jogador/dia, mix 70% BR / 15% EU / 15% US):

| Cenário | Ads/mês | Doações/mês | Total realista |
|---|---|---|---|
| **1.000 jogadores/dia** | US$ 120-360 | US$ 30-150 | **~US$ 150-500** |
| **10.000 jogadores/dia** | US$ 1.200-3.600 | US$ 100-600 | **~US$ 1.300-4.200** |
| 10k/dia com audiência 50% US/EU | US$ 4.000-9.000 | idem | US$ 4k-9,5k |

**A leitura dura:** 1.000/dia paga hospedagem e um café. 10.000/dia com audiência BR paga um
salário brasileiro júnior — não um salário em Portugal.

**A alavanca de maior impacto na receita não é otimizar anúncios. É mudar a geografia da
audiência.** Isso conecta direto com §4 e §5.

E o teto de referência: o **Godot**, provavelmente o projeto de jogos open source mais bem
financiado do mundo, arrecada **€31.244/mês com 1.811 apoiadores individuais + 23 patrocinadores
corporativos**. Um FPS de nicho não chega perto disso.

### 2.2 Contexto que vale ter em mente
`fly.pieter.com` (Pieter Levels, 2025): US$ 87.000/mês em 17 dias com ads in-game e upgrade
pago. Em meados de 2026 o projeto aparece como **$0/mês** no bio dele.
**Receita de jogo web viral não é recorrente. A receita foi embora junto com a atenção.**

Trate a monetização como *pagar custos + comprar tempo*, e o **posicionamento de carreira como o
ativo real**.

### 2.3 O stack recomendado

**Doações (fazer no dia 1):**
- **GitHub Sponsors** — **0% de taxa**, o GitHub cobre o processamento. Portugal é suportado.
  Opção primária.
- **LivePix** — 5% em Pix, 7% em cartão. **Essencial para os 30k seguidores BR**, que
  majoritariamente não vão usar cartão internacional.
- **Open Collective** como camada de transparência (~13% de taxa) — cada centavo entrando e
  saindo fica público. Vale como seguro reputacional (§1.3).
- **Página pública de custos.** "Preciso de US$ 800/mês para manter servidores e dedicar 2 dias
  por semana" é honesto e defensável. "Me ajudem" não é.

⚠️ Doações recorrentes recebidas em Portugal provavelmente configuram atividade tributável em
IRS. **Confirme com contabilista.** Nada aqui é aconselhamento fiscal.

**Ads no próprio domínio:**
- **AdinPlay** é o padrão de facto para .io games; **AppLixir** foca rewarded com integração JS
  simples; **Venatus** é premium. **Nenhum publica revenue share, CPM ou mínimo de tráfego** —
  tudo é negociado. **Peça os termos por e-mail antes de integrar.**
- AdSense H5 Games Ads existe, mas há relato de rejeição por não atingir 5M impressões/mês
  não-iframed (fonte: relato de dev, não doc do Google — incerto).

**Portais (não-exclusivos):**
- **Playgama Bridge** — integra uma vez, distribui em vários portais sem exclusividade.
  70% até US$1k, 80% de US$1-3k, 90% acima. Saque a partir de US$ 100.
  **Melhor custo-benefício estratégico.**
- **CrazyGames** — 60% da receita de ads / 70% de IAP (fonte: termos de uma game jam de 2026,
  **confirme no portal**). Review inicial de 1-2 dias. Limites: 50 MB de download inicial,
  250 MB total, 1.500 arquivos, 16:9, **PEGI12** (sem gore — seu jogo já é sem gore, ok).
- **Poki: descarte** (§1.1).
- **itch.io** — open revenue sharing (você define o corte, padrão 10%). Bom para devlog e
  "pay what you want", baixo tráfego orgânico para FPS 3D.

**Steam (futuro):** Steam Direct custa US$ 100 por app, recuperável após US$ 1.000 em vendas.
Precedente do modelo: **Mindustry** (GPLv3, grátis no itch, pago no Steam) e **Shattered Pixel
Dungeon** (código aberto, pago na Steam, Patreon ativo — o autor vive disso há anos).

---

## 3. O que fazer no lançamento (checklist)

```
[ ] Licença decidida e escrita (§1.2) — HOJE
[ ] Contrato social no README (§1.3) — HOJE
[ ] Os 2 furos de segurança fechados (00-RELEASE-V2.md §4)
[ ] GitHub Sponsors + LivePix ativos, com página de custos
[ ] 10-15 good-first-issue (mapas, skins, falas de bot, i18n, sons)
    → não é burocracia: é o caminho para os 20 contribuidores que destravam
      6 meses de Claude Max grátis (plano 05 §6.3)
[ ] Link do GitHub no menu do jogo (você pediu) + botão de doação
[ ] arms_*.glb (155 MB) fora do bundle publicado
[ ] Aplicar: Codex for OSS, Copilot Pro para mantenedor, Vercel OSS, Sentry OSS
[ ] GIF de 40s do gameplay (é o ativo mais reusado do lançamento inteiro)
[ ] Demo sem login, sem waitlist, entendível em <1 minuto
```

---

## 4. Distribuição: o calendário

### 4.1 Hacker News é a maior alavanca isolada — e você tem uma tentativa

Dados de 19 anos de HN:
- **Blogs pessoais de devs superam blogs corporativos** (Dan Luu 93,3 pontos de média;
  OpenAI 79,2). Publique **no seu domínio** primeiro.
- **Títulos curtos ganham muito:** <20 caracteres → média 15,8 pontos, 4,05% chegam a 100+.
  Títulos de 100+ caracteres → média 5,9.
- **Domingo de manhã, ~7-8h UTC** tem a maior média (16,1) por baixa competição (17.961
  submissões vs 52.660 nas terças). Janela alternativa: **terça a quinta, 14:00-17:00 UTC**.
- **Velocidade > volume:** 10-30 upvotes nos primeiros 30-60 min quebram a front page;
  50 upvotes espalhados em 6h não fazem nada.
- **Nunca peça upvotes publicamente** — inclui tuitar "olha meu post no HN". Detecção de anel →
  shadowban permanente da URL.
- Não seja defensivo nos comentários (ativa penalidade de "overheated discussion").

**Título sugerido:**
> `Show HN: An open-source browser FPS built with Three.js`

Deixe o tempero brasileiro para o **primeiro comentário**, onde você conta a história. Título com
"Brazilian memes" filtra o público americano; o primeiro comentário conquista.

### 4.2 Newsletters — canal subestimado, ROI altíssimo
**JavaScript Weekly tem 170.000+ assinantes.** Um projeto Three.js bonito é exatamente o tipo de
item que o **Frontend Focus** e o **JavaScript Weekly** curam. Envie pela página de contato da
Cooperpress. Custo: um e-mail. Alcance potencial maior que a maioria dos posts virais.

### 4.3 Redes
- **X** (500-600M MAU) vs **Bluesky** (~43M contas, ~2-4M DAU estimados). X continua sendo onde
  está a comunidade de gamedev/graphics/AI. Faça os dois, priorize X.
- **LinkedIn 2026**, engajamento por formato (benchmark de 1,3M posts): **documento nativo 7,00%
  > carrossel 6,45% > vídeo 6,00% > imagem 5,30% > texto 4,50% > post com link 3,25%**.
  → **Poste em inglês, em documento nativo, com o link no primeiro comentário.**
  Se postar em português, o alcance internacional morre. Alterne dias, não idiomas no mesmo post.
- **Reddit:** r/threejs, r/webgl, r/gamedev, r/WebGames, r/opensource, r/programming, r/brdev.
  Cada sub tem regra própria de auto-promoção. Poste **o artigo** em r/programming e **o jogo**
  em r/WebGames e r/threejs — nunca o mesmo link nos dois no mesmo dia.
- **Product Hunt perdeu eficácia** (500+ submissões/dia, links nofollow, janela de 24h que pune
  quem não está no fuso dos EUA). Alternativas com números: **Uneed**, **ScrollLaunch**,
  **TinyLaunch**, **Peerlist Launchpad**, **Fazier**.

### 4.4 Calendário de 4 semanas
| Semana | Ação |
|---|---|
| **−2** | Repo público com README forte, LICENSE, good-first-issues, GIF de 40s, demo sem login. Newsletters contatadas |
| **1** | Build-in-public em X e LinkedIn (EN). Uneed + ScrollLaunch. **Post na base BR para gerar os primeiros 500 jogadores e feedback** |
| **2** | Post técnico #3 (Three.js performance) → r/threejs, r/webgl, JavaScript Weekly, Dev.to com canonical |
| **3** | TinyLaunch + Fazier + Peerlist. Vídeo curto (YouTube Shorts + X) |
| **4** | **Show HN**, ter-qui 14:00-17:00 UTC. Só depois de o jogo estar estável |

**Use os 30k seguidores BR como combustível de ignição, não como destino.** Eles convertem em
duas coisas valiosas: os primeiros 500 jogadores no dia 1 (que geram o sinal social que a
audiência internacional precisa ver) e os primeiros contribuidores do repo.

---

## 5. Carreira: a parte que você não vai gostar de ler

### 5.1 O diagnóstico
**Um FPS de navegador com memes brasileiros não sinaliza "engenheiro de IA".** Sinaliza "bom com
gráficos web, entrega produto, tem audiência". São coisas boas. Não são o que abre a vaga de
100k+ em IA — um recrutador de IA lê isso como *"dev de frontend criativo"*.

**Para converter o projeto em sinal de IA, o conteúdo precisa carregar o peso.**

### 5.2 O mercado, em números (2026)
- Vagas de ML engineer **+59%** vs baseline de jan/2020; engenharia de software geral **−49%**
- Vagas mencionando skills de IA nos EUA: **275k+** (+153% vs jan/2024)
- Prêmio salarial IA vs não-IA: mid +11,9%, senior +14,2%, staff +18,7%
- **⚠️ 74% das vagas de tech são 100% presenciais, 18% híbridas, apenas 8% totalmente remotas —
  e as remotas recebem 6-10× mais candidatos**

Faixas para remoto pago em USD: mid US$ 140-210k base, **senior US$ 180-270k base**.
Europa paga 35-55% menos que os EUA no senior. Em Portugal, empresas americanas pagam
US$ 90-185k; empregadores europeus, €35-90k.

**Tradução:** 100k+ USD/ano é **perfeitamente atingível** para senior remoto contratado por
empresa americana — está *abaixo* da faixa média. **O gargalo não é o valor, é o acesso:** 8% das
vagas são remotas e recebem 6-10× mais candidatos.

**Você precisa de um canal que fure a fila de candidaturas. É exatamente para isso que o projeto
público serve.**

### 5.3 O que maximiza sinal, em ordem de força
1. **Sistemas de IA dentro do jogo, medidos.** Bots com LLM, geração procedural com IA,
   moderação com modelo pequeno no cliente. **Com benchmarks: latência p50/p99, custo por
   partida, taxa de erro, tabela antes/depois.** Isso separa "fiz um joguinho" de "engenhei um
   sistema".
2. **Post-mortem de custo com números reais.** Engenheiros sênior de IA em empresa nenhuma sabem
   isso empiricamente. Você teria dado.
3. **20+ contribuidores externos.** Prova liderança técnica e capacidade de code review — sinal
   muito mais raro que "sei treinar modelo". E é o mesmo número que destrava o Claude for OSS.
4. **Um artefato reutilizável extraído do jogo** — uma lib npm (`three-fps-netcode`,
   `llm-bot-orchestrator`) com downloads reais. Aparece em busca de dependências e é o que os
   programas OSS medem.
5. Stars do repo: sinal fraco e conhecidamente gamificável. Não otimize.

### 5.4 Palestras: o caminho realista
Meetup local (Lisboa/Porto têm cena ativa) → conferência regional → internacional, em 12-18
meses. **Um talk gravado no YouTube é pré-requisito de fato** para os grandes CFPs.

| Evento | Data | CFP | Nota |
|---|---|---|---|
| **AI Engineer Code Summit** | 11-13/nov/2026, SF | **ABERTO** — early 15/set, final **11/out/2026** | **Melhor alvo imediato.** Cobre viagem e hotel. Até 3 propostas. Foco em coding agents, workflows de IDE, evals |
| AI Engineer World's Fair 2027 | ~jun/2027, SF | acompanhar abertura | Voos + 3 noites para internacional |
| All Things Open | Raleigh | aberto | Perfeito para o ângulo "sustentabilidade de OSS" |
| NDC London | jan/2027 | deadline 30/ago/2026 | |
| JSNation / React Summit | Amsterdã | PaperCall | Fit natural para Three.js |
| JetBrains GameDev Days 2026 | online | aberto | Baixa barreira, **gera a gravação** |

Agregadores para monitorar: [cfp.watch](https://cfp.watch/), [confs.tech/cfp](https://confs.tech/cfp),
[dev.events](https://dev.events/EU/game).

**O ângulo que ninguém mais tem:**
> *"Rodei um FPS multiplayer com bots de LLM para N jogadores por US$ X/mês. Aqui está tudo que
> quebrou."*

Gamedev + IA + infra + custo, com demo ao vivo. É raro, é memorável, e é seu.

E a orientação explícita do AI Engineer: **fujam do tópico genérico de IA**, mirem no calibre de
PyCon/JSConf/StrangeLoop. Número concreto no título, promessa de takeaway acionável.

---

## 6. Os cinco blog posts

Regra de ouro: **publique no seu domínio primeiro**, crosspost no Dev.to/Hashnode com
`canonical URL` apontando para o original.

| # | Post | Por que funciona | Onde | Alvo |
|---|---|---|---|---|
| **1** | **"O que custa rodar um FPS multiplayer no navegador"** — planilha aberta, custo por jogador, o que cortou 80% | Post de custo com números reais é gênero comprovado no HN. Ninguém publica isso para jogos web | Blog → **HN**, r/gamedev, r/programming, Lobsters | Recrutador de infra + sponsors (**o post *é* a justificativa da doação**) |
| **2** | **"Bots de FPS com LLM: latência, custo, e por que 90% das ideias óbvias não funcionam"** — p50/p99, comparação de modelos, custo por partida | Interseção IA + games **com dados**. Exatamente o sinal que falta no seu perfil | Blog → **HN**, r/MachineLearning, X, LinkedIn (carrossel) | **⭐ Este é o post de carreira.** Vira proposta de CFP direto |
| **3** | **"Three.js em produção: como caber um FPS 3D em 50 MB e 60fps num notebook de 2019"** — orçamento de polígonos, atlas, streaming | Utilidade pura, alta salvabilidade. É *o* problema de quem publica em portal | Blog → **JavaScript Weekly + Frontend Focus**, r/threejs, r/webgl | Comunidade Three.js → contribuidores + convite de conferência |
| **4** | **"Ganhei US$ X com N jogadores: a economia real de um jogo web open source"** — RPM por país, comparação de redes | Transparência de receita é catnip de HN/Indie Hackers. **Praticamente ninguém publica RPM por geografia** | Blog → **HN**, Indie Hackers, r/gamedev | Credibilidade + devs de jogos web viram audiência |
| **5** | **"Como pedir dinheiro por um projeto open source sem perder a comunidade"** — o contrato social, licença, bounties | Tema recorrente e emocional no HN. Você entra com posição construtiva, não com lamento | Blog → **HN**, r/opensource, **All Things Open CFP** | Reputação OSS → sponsors corporativos |

**Sequência:** #3 primeiro (menor risco, constrói audiência técnica, traz contribuidores) → #1 →
#2 no momento de maior atenção → #4 quando houver 3+ meses de dados → #5 por último, quando
houver comunidade real.

**⚠️ O que NÃO escrever:** *"como fiz um jogo com IA em X horas"*. Esse gênero saturou em 2025 e
hoje sinaliza para um recrutador de IA exatamente o oposto do que você quer.

---

## 7. Plano de 90 dias

**Dias 1-14**
- Licença **hoje**. Repo público com contrato social e 10-15 good-first-issue de baixa fricção
- Aplicar: Codex for OSS, Copilot Pro, Cloudflare Alexandria, Vercel OSS, Sentry OSS
- GitHub Sponsors + LivePix ativos com página de custos transparente

**Dias 15-45**
- Integrar Playgama Bridge e submeter ao CrazyGames (fazer caber em 50/250 MB e 1.500 arquivos)
- **Post #3** → JavaScript Weekly + Frontend Focus + r/threejs
- **Recrutar contribuidores ativamente. Meta: 20 externos com PR merged**
- Migrar produção de conteúdo do LinkedIn para inglês, formato documento nativo

**Dias 46-90**
- **Show HN**. Uma tentativa
- **Posts #1 e #2**
- **Submeter ao AI Engineer Code Summit até 11/out/2026**
- Ao atingir 20 contribuidores: aplicar ao Claude for Open Source
- Candidatar-se a vagas remotas americanas **usando o post #2 como carta de apresentação, não o
  currículo**

---

## 8. O que está incerto neste plano

- **Todas as tabelas de receita da §2.1 são estimativas** derivadas de benchmarks públicos de
  eCPM e do caso GolfRoyale. Não são dados de um jogo comparável ao seu.
- AdinPlay, AppLixir e Venatus **não publicam revenue share nem CPM** — negocie por e-mail.
- Revenue share do CrazyGames (60/70%) vem dos termos de uma game jam, não de doc permanente.
- O limiar de 5M impressões/mês do AdSense H5 vem de relato de dev, não do Google.
- **Termos de uso comercial e redistribuição dos modelos gerados por Meshy/Tripo/Mint não foram
  verificados** — crítico para um repo open source. Cheque antes de gerar em massa.
- Sua elegibilidade ao Cloudflare Project Alexandria é duvidosa se o jogo tiver anúncios
  (critério "non-profit basis").
- **Nada aqui é aconselhamento fiscal.**
- Faixas salariais são agregados de Levels.fyi/Glassdoor/Payscale via terceiros.
