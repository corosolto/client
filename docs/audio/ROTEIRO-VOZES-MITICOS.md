# ROTEIRO — Vozes do Time Mítico (IA/TTS via ElevenLabs)

Kill-shouts para os 9 personagens do Time Mítico (folclore + história BR):
reação rápida no MOMENTO DE KILL, **1 a 3 palavras**, personagem inteiro na voz
e na entonação — padrão dos packs existentes (palhaços/funkeiros). Cada
personagem tem também 1-2 falas médias como variação rara (a régua do
gen-audio-manifest corta ingame em 8 s; kill-react ideal ≤ 2 s).

Regras da casa:
- A voz descreve **arquétipo** (sotaque, energia, idade) — NUNCA imita pessoa
  real, nem viva nem morta. Nenhuma gravação comercial.
- PT-BR, PEGI12, tom satírico do jogo.
- Zumbi dos Palmares é herói histórico real: gritos de guerra dignos, coragem
  e liberdade, **sem** caricatura étnica.
- Bandeirante é "o vilão que o time tolera": a sátira mira a arrogância dele.

Gerador: `tools/gerar-vozes-miticos.mjs` (ElevenLabs; embute esta tabela).
Modelo `eleven_v3` quando a conta tem (tags de expressão tipo `[laughs]`,
`[whispers]` no texto), senão `eleven_multilingual_v2` (tags removidas
automaticamente). 2 tomadas por fala = 2 vozes do casting por personagem →
`public/audio/ia/miticos/<id>/<slug>-tN-<voz>.mp3` (gitignorado; mp3 fora do git).

Notação: `[tag]` = audio tag do eleven_v3 (não é falada). **(kill)** ≤ 2 s;
**(rara)** = variação média.

---

## Lampião (`lampiao`)
**Casting (redesign 30/08):** Voice Design — homem mais velho, voz grave e
rachada de chefe de bando, sotaque sertanejo pernambucano CARREGADO (t/d
duros, vogais abertas), fala RÁPIDA e cortada de sertão (tom da r2-p1
aprovado; empurrar sotaque e expressões regionais).

| slug | fala | direção de performance |
|---|---|---|
| oxente (kill) | "Ôxente!" | espanto-deboche rápido, meio riso |
| arre-egua (kill) | "Arre égua!" | exclamação de impacto, seca e alta |
| cabra-frouxo (kill) | "Cabra frouxo!" | desprezo staccato, cusparada de som |
| vixe (kill) | "Vixe!" | curtíssimo, quase riso engolido |
| lascou-se (kill) | "Lascou-se!" | sentença alegre, rápida |
| ave-maria (kill) | "Ave Maria!" | vitória beata de arma na mão |
| cordel (rara) | "Mais um pro cordel." | narrador de feira, rápido e cantado |
| pisar (rara) | "Quem mandou pisar no meu sertão?" | pergunta retórica em rajada, ameaça mansa |

## Maria Bonita (`mariabonita`)
**Casting (redesign do zero 30/08):** Voice Design — mulher sertaneja do
cangaço, ~30 anos, MESMA família de sotaque do Lampião, voz firme e SECA de
quem comanda, um fio de deboche — NUNCA doce, NUNCA locutora.

| slug | fala | direção de performance |
|---|---|---|
| caiu-ligeiro (kill) | "Caiu ligeiro!" | constatação rápida e cortada, deboche seco |
| assina-maria (kill) | "Assina: Maria." | carimbo de autoria, sem festejar |
| um-tiro (kill) | "Um tiro só." | fria, era óbvio |
| vixe-errou (kill) | "Vixe, errou!" | deboche curto pro alvo que atirou antes |
| arretada (kill) | "Arretada, eu." | orgulho sertanejo, ombro erguido |
| de-nada-cabra (kill) | "De nada, cabra." | ironia seca, favor prestado |
| oxente-rara (rara) | "Ôxente, caiu foi ligeiro! Assina embaixo: Maria." | rajada sertaneja + assinatura |

## Saci-Pererê (`saci`)
**Casting:** moleque travesso, agudo e rápido, risada sempre engatilhada.

| slug | fala | direção de performance |
|---|---|---|
| sumiu (kill) | "Sumiu! [laughs]" | grito + gargalhada curta de moleque |
| pegadinha (kill) | "Pegadinha!" | deleite escancarado, agudo |
| redemoinho (kill) | "Redemoinho!" | girando ao falar, palavra rodopiada |
| era-eu (kill) | "[laughs] Era eu!" | risadinha antes, revelação triunfante |
| uma-perna (kill) | "Uma perna!" | deboche atlético, ofegante de correr |
| achou-nao (kill) | "Achou não!" | provocação cantada de esconde-esconde |
| vento (rara) | "Cadê tua munição? Pergunta pro vento! [laughs]" | pergunta falsa-inocente, resposta com gargalhada |

## Curupira (`curupira`)
**Casting:** menino selvagem da mata, cantado e provocador, meio assobiado.

| slug | fala | direção de performance |
|---|---|---|
| pe-virado (kill) | "Pé virado!" | grito-assinatura, orgulho de anomalia |
| rastro-errado (kill) | "Rastro errado!" | riso de quem armou a cilada |
| perdeu (kill) | "Se perdeu!" | cantado, sílabas esticadas de provocação |
| mata-cobra (kill) | "A mata cobra." | súbito sério, voz baixa — a floresta falou |
| voltou-nao (kill) | "Voltou não!" | deboche caipira, seco |
| fiu-fiu (kill) | "[whistles] Já era!" | assobio curto + sentença alegre |
| pegada (rara) | "Seguiu minha pegada? Chegou no lugar errado." | ironia paciente de guia que enganou |

## Cuca (`cuca`)
**Casting:** bruxa velha, voz rachada e arrastada, ninar que ameaça.

| slug | fala | direção de performance |
|---|---|---|
| nana-nenem (kill) | "[whispers] Nana, neném." | sussurro de ninar gélido, quase carinhoso |
| dorme (kill) | "Dorme." | uma palavra, peso de feitiço |
| boa-noite (kill) | "Boa noite..." | despedida arrastada, deleite no fim |
| sonho-bom (kill) | "Sonho bom? [laughs]" | pergunta falsa-doce + risada rachada |
| hora-de-dormir (kill) | "Hora de dormir." | aviso de mãe monstruosa, indiscutível |
| mais-um (kill) | "Mais um dormiu." | contagem de colecionadora, satisfeita |
| cem-anos (rara) | "Cem anos acordada... e tu já dormiu. [laughs]" | vagarosa, vitória de veterana + risada |

## Boto Cor de Rosa (`boto`)
**Casting:** galã metido, aveludado, festa ribeirinha na voz.

| slug | fala | direção de performance |
|---|---|---|
| encantei (kill) | "Encantei." | aveludado, autoelogio mínimo |
| charme-puro (kill) | "Charme puro." | brinde a si mesmo |
| meu-bem (kill) | "Meu bem..." | lamento fingido, dó de mentira |
| afundou (kill) | "Afundou." | trocadilho de rio, seco e elegante |
| que-pena (kill) | "Que pena." | zero pena, sorriso audível |
| rosa-vence (kill) | "Rosa vence." | vaidade cromática, definitivo |
| danca (rara) | "A dança acabou, meu bem. Volto pro fundo." | despedida de festa, charme escorrendo |

## Lobisomem (`lobisomem`) — SEM FALA HUMANA
**Direção (veredito 30/08):** o Lobisomem não fala — só uiva, rosna e late.
Set de SFX via ElevenLabs Sound Effects (`tools/gerar-sfx-lobisomem.mjs`),
2 tomadas por som; comparação com eleven_v3 de onomatopeia gerada junto
(`--fallback-v3`).

| slug | som | uso |
|---|---|---|
| uivo-lua | uivo longo à lua cheia (4 s) | raro/spawn |
| uivo-vitoria | uivo curto triunfante (2 s) | kill |
| rosnado-baixo | rosnado grave de ameaça (2,5 s) | kill/ameaça |
| rosnado-agressivo | rosnado de ataque, dentes à mostra (2 s) | kill |
| latido-duplo | dois latidos secos agressivos (1,5 s) | kill |
| bufo | bufo/fungada farejando (1,5 s) | provocação |
| mordida | bote de mordida com rosnado (1,5 s) | kill |
| rosnado-uivo | rosnado subindo pra uivo curto (2,5 s) | kill |

## Bandeirante (`bandeirante`)
**Casting:** homem maduro, cascalho na voz, deadpan arrogante.

| slug | fala | direção de performance |
|---|---|---|
| rastreado (kill) | "Rastreado." | burocrático, carimbo batido |
| marco-novo (kill) | "Marco novo." | como quem finca placa em cima do caído |
| fim-da-trilha (kill) | "Fim da trilha." | deadpan absoluto, sem festejar |
| previsivel (kill) | "Previsível." | tédio de especialista, quase bocejo |
| mapeado (kill) | "Mapeado." | riscando o alvo da lista |
| achei (kill) | "Achei." | sem surpresa nenhuma — achar é o ofício |
| historia (rara) | "Toda pegada conta uma história. A tua acabou." | narrador arrogante fechando o livro |

## Zumbi dos Palmares (`zumbi`)
**Casting:** líder digno, voz grave, quente e ressonante — **sem caricatura**.
Gritos de guerra heroicos, coragem e liberdade.

| slug | fala | direção de performance |
|---|---|---|
| palmares (kill) | "[shouts] Palmares!" | grito de guerra digno, peito aberto |
| liberdade (kill) | "[shouts] Liberdade!" | palavra-bandeira, sem deboche |
| avanca (kill) | "Avança!" | comando ao time, energia pra frente |
| de-pe (kill) | "De pé!" | chamado aos aliados, firme |
| pela-serra (kill) | "Pela serra!" | grito de pertencimento, épico curto |
| coragem (kill) | "Coragem!" | injeção de ânimo, grave e quente |
| quilombo (rara) | "Cai a muralha. Não cai o quilombo." | solene, pausado, sem grito — convicção |
