# ROTEIRO — Vozes do Time Mítico (IA/TTS — elenco misto Fish Audio + ElevenLabs)

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

Gerador: `tools/gerar-vozes-miticos.mjs` (embute esta tabela; flags `--dry`,
`--so=`, `--backend=fish|eleven`, `--faltantes`). Tags `[assim]` valem no
`eleven_v3`; no Fish são removidas do texto. 2 tomadas por fala →
`public/audio/ia/miticos/<id>/<slug>-tN-<voz>.mp3` (gitignorado; mp3 fora do git).

Notação: `[tag]` = audio tag do eleven_v3 (não é falada). **(kill)** ≤ 2 s;
**(rara)** = variação média.

## CASTING FINAL (veredito do dono, 30/08)

| Personagem | Backend | Voz/modelo | id |
|---|---|---|---|
| Lampião | Fish Audio | A/B: "Vaqueiro Nordestino Animado" e "Nordestino" (meia-idade) | `80dfc9e3e97b45ff94978b3eff801855` / `9968a7351f6f4abda63be69518c29414` |
| Maria Bonita | Fish Audio | "NORDESTINA MENINA" | `e2415382319c40f4bdc9c5baa314cd76` |
| Saci-Pererê | ElevenLabs (library) | Açougueirão - Evil Cartoon Character | `PSkrmGGNwoOIKXqzUWs9` |
| Curupira | ElevenLabs (Voice Design r2-p2) | Curupira (Mitico CS) | `zKlPFm3CStZ8TNJn803F` |
| Cuca | ElevenLabs (Voice Design r2-p3) | Cuca (Mitico CS) | `TmfHJ19kMzZYALkBuv81` |
| Boto Cor de Rosa | ElevenLabs (Voice Design r2-p3) | Boto Cor de Rosa (Mitico CS) | `fLvlBA4sutzLZYXaKz0H` |
| Lobisomem | ElevenLabs Sound Effects | set final = tomadas `*-t2.mp3` (sem fala humana) | — |
| Bandeirante | ElevenLabs (library) | Artur Mechedjiana | `DFbzZEWhyi2l6rU3obC8` |
| Zumbi dos Palmares | ElevenLabs (library) | Carlos - Resonant & Majestic Storyteller | `NFmEzNOony1UsEJGXLth` |

Pilotos de upgrade dos times existentes (Fish, só audição — packs atuais
intactos): `tools/gerar-pilotos-fish.mjs` — cria do RJ funk (pool F)
`cf4a65e7fff3408aa30982d4ddfbddb2`, Mandrake (F)
`6a27a3ab74af45cb8890a6974e9eeb06`, Pagodeiro (U)
`c481e5eba6254be49de0f33af6736085`.

---

## Lampião (`lampiao`)
**Casting (redesign 30/08):** Voice Design — homem mais velho, voz grave e
rachada de chefe de bando, sotaque sertanejo pernambucano CARREGADO (t/d
duros, vogais abertas), fala RÁPIDA e cortada de sertão (tom da r2-p1
aprovado; empurrar sotaque e expressões regionais).

Grafia dialetal de propósito — no TTS a pronúncia sai da grafia.

| slug | fala | direção de performance |
|---|---|---|
| oxente (kill) | "Ôxente!" | espanto-deboche rápido, meio riso |
| vote (kill) | "Vôte!" | interjeição seca de espanto, cuspida |
| arre-egua (kill) | "Arre égua!" | exclamação de impacto, seca e alta |
| cabra-da-peste (kill) | "Cabra da peste!" | desprezo staccato, rajada |
| visse (kill) | "Visse?!" | provocação curta, riso engolido |
| lascou-se (kill) | "Lascô-se!" | sentença alegre, rápida |
| oia (rara) | "Óia pra isso, môço!" | deboche de feira, cantado |
| pisar (rara) | "Quem mandou pisá no meu sertão?" | pergunta retórica em rajada, ameaça mansa |

## Maria Bonita (`mariabonita`)
**Casting (redesign do zero 30/08):** Voice Design — mulher sertaneja do
cangaço, ~30 anos, MESMA família de sotaque do Lampião, voz firme e SECA de
quem comanda, um fio de deboche — NUNCA doce, NUNCA locutora.

Grafia dialetal de propósito — no TTS a pronúncia sai da grafia.

| slug | fala | direção de performance |
|---|---|---|
| caiu-ligeiro (kill) | "Caiu ligeiro, visse?" | constatação rápida e cortada, deboche seco |
| assina-maria (kill) | "Assina: Maria." | carimbo de autoria, sem festejar |
| um-tiro (kill) | "Um tiro só." | fria, era óbvio |
| vote-errou (kill) | "Vôte, errou!" | deboche curto pro alvo que atirou antes |
| arretada (kill) | "Arretada, eu." | orgulho sertanejo, ombro erguido |
| de-nada-cabra (kill) | "De nada, cabra." | ironia seca, favor prestado |
| oxente-rara (rara) | "Ôxente, caiu foi ligeiro, visse? Assina embaixo: Maria." | rajada sertaneja + assinatura |

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
Set de SFX via ElevenLabs Sound Effects (`tools/gerar-sfx-lobisomem.mjs`).
**SET FINAL APROVADO: as tomadas `*-t2.mp3`** (as t1 e a comparação
eleven_v3 ficam só de arquivo).

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
