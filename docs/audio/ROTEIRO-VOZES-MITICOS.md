# ROTEIRO — Vozes do Time Mítico (IA/TTS)

Falas de INGAME (provocação, grito de guerra, bordão) para os 9 personagens do
Time Mítico (folclore + história BR). Tom satírico do jogo, PT-BR, PEGI12,
falas curtas (≤ 4 s faladas).

Regras da casa:
- A instrução de VOZ descreve **arquétipo** (sotaque, energia, idade) — NUNCA
  imita pessoa real, nem viva nem morta.
- Nenhuma gravação comercial; tudo TTS via OpenRouter.
- Zumbi dos Palmares é herói histórico real: tratamento digno, falas de
  coragem e liberdade, **sem** caricatura étnica e sem sotaque forçado.
- Bandeirante é o "vilão que o time tolera" (blurb oficial): a sátira mira a
  arrogância dele, não glorifica a figura histórica.

Gerador: `tools/gerar-vozes-miticos.mjs` (embute esta tabela). 2 tomadas por
fala, vozes-base distintas → `public/audio/ia/miticos/<id>/<slug>-tN-<voz>.mp3`
(public/audio é gitignorado; só script e roteiro entram no git).

---

## Lampião (`lampiao`)
> Blurb: "Cangaço no gatilho. Quanto mais segura o tiro, mais dano faz — Virgem Maria!"

**Direção de voz:** homem adulto, sotaque nordestino do sertão, voz seca e
rouca de chefe de bando, autoridade teatral de cordel, meio cantado.

| slug | fala |
|---|---|
| virgem-maria | "Virgem Maria! Aqui quem manda é o cangaço!" |
| sertao | "No sertão, quem atira primeiro é quem conta a história." |
| aceiro | "Avisa o teu bando: hoje tem fogo no aceiro!" |
| chapeu | "Meu chapéu tem mais estrela que o teu time inteiro." |
| arreda | "Arreda, moço! O cangaço passou aqui." |

## Maria Bonita (`mariabonita`)
> Blurb: "Cangaceira de precisão. Parou, mirou, acertou — a rainha do primeiro tiro."

**Direção de voz:** mulher adulta, sotaque nordestino, calma e afiada, sorriso
no canto da voz, confiança de quem nunca precisa do segundo tiro.

| slug | fala |
|---|---|
| assina | "Parou, mirou, acertou. Assina embaixo: Maria." |
| moda | "No cangaço, a moda sou eu — e a mira também." |
| um-tiro | "Um tiro só, meu bem. Mais que isso é desperdício." |
| costume | "Bonita é o nome. Certeira é o costume." |
| avisar | "Atiro duas vezes: uma pra acertar, outra pra avisar." |

## Saci-Pererê (`saci`)
> Blurb: "Moleque de uma perna só. Redemoinho de fumaça e some — o gorro vermelho é hitbox."

**Direção de voz:** moleque travesso, agudo, rápido, risadinha no fim, energia
de pião de redemoinho.

| slug | fala |
|---|---|
| redemoinho | "Cadê tua munição? Pergunta pro redemoinho!" |
| uma-perna | "Uma perna só e ainda corro mais que tu!" |
| atras | "Pega o gorro se puder... psiu — tô aqui atrás!" |
| sumiu | "Virou o vento, virei eu — sumiu!" |
| cadarco | "Teu cadarço desamarrou. Mentira! ... Ou será?" |

## Curupira (`curupira`)
> Blurb: "Menino de cabelo de fogo, pés virados. As pegadas apontam pro lado errado."

**Direção de voz:** menino selvagem da mata, provocador, cadência meio cantada
de quem brinca de esconde-esconde, assobio implícito.

| slug | fala |
|---|---|
| pe-virado | "Pé virado, rastro errado — vem me achar!" |
| pegada | "Seguindo minha pegada? Então tu já tá voltando pra casa." |
| mata | "Quem mexe com a mata... se perde nela." |
| cabelo-fogo | "Meu cabelo é fogo. Meu rastro é mentira." |
| assobio | "Assobiei três vezes. Pronto: tu tá perdido." |

## Cuca (`cuca`)
> Blurb: "A bruxa de Lobato. Lança poção de lentidão e visão embaralhada — 'dorme com o medo'."

**Direção de voz:** bruxa velha, voz rachada e arrastada, ameaça de canção de
ninar, terror-comédia teatral, ritmo lento que acelera no bote.

| slug | fala |
|---|---|
| dorme-nenem | "Dorme, neném... que a Cuca já chegou." |
| cem-anos | "Eu não durmo há cem anos. Tu vai dormir agorinha." |
| pocao | "Nana, nenê... a poção já tá no teu ar." |
| feitico | "Bruxa aqui não faz feitiço de brincadeira, não." |
| caverna | "Na minha caverna sempre cabe mais um." |

## Boto Cor de Rosa (`boto`)
> Blurb: "Golfinho rosa do Amazonas. Sai da cobertura, encanta a mira inimiga e responde de Deagle."

**Direção de voz:** galã metido, voz aveludada e sedutora de festa ribeirinha,
charme escorrendo, convencido até o osso.

| slug | fala |
|---|---|
| chapeu | "Bonito é o chapéu. Melhor não perguntar o que tem embaixo." |
| encantar | "Saí do rio só pra te encantar, meu bem." |
| madrugada | "Dança comigo até de madrugada... depois eu volto pro fundo." |
| rosa | "Rosa é a cor de quem nunca erra o alvo." |
| charme | "O charme é meu, a mira era tua. Era." |

## Lobisomem (`lobisomem`)
> Blurb: "Sétimo filho, maldição da encruzilhada. O lobo preto acorda forte, dentuço e sem coleira."

**Direção de voz:** homem adulto, voz grave e gutural com rosnado no fundo,
lenta e pesada, prazer de caçador.

| slug | fala |
|---|---|
| setimo | "Sétimo filho... primeira mordida." |
| lua-cheia | "Lua cheia, arena cheia. Melhor pra caçar." |
| coleira | "A coleira? Arrebentou faz tempo." |
| cheiro | "Sente esse cheiro? É medo. E é teu." |
| encruzilhada | "Na encruzilhada eu virei bicho. Tu vai virar placar." |

## Bandeirante (`bandeirante`)
> Blurb: "Caçador de pegadas. Vê onde o inimigo pisou — o vilão que o time tolera."

**Direção de voz:** homem maduro, voz de cascalho, arrogância seca de velho
explorador, deadpan — a sátira é a prepotência dele.

| slug | fala |
|---|---|
| pegada | "Toda pegada conta uma história. A tua termina aqui." |
| trilha | "Eu abro a trilha. Tu vira marco no caminho." |
| mapa | "Mapa? Eu sou o mapa." |
| vilao | "Vilão do time? Pode ser. Mas ninguém rastreia melhor." |
| sinal | "Pisou no mato, deixou sinal. Já tô chegando." |

## Zumbi dos Palmares (`zumbi`)
> Blurb: "Capitão quilombola. O grito de Palmares ecoa e acelera a recarga dos aliados."

**Direção de voz:** líder digno, voz grave, quente e ressonante, calma de
comando, heroica — **sem caricatura, sem sotaque forçado**. Falas de coragem
e liberdade.

| slug | fala |
|---|---|
| palmares | "Palmares vive em cada passo meu." |
| liberdade | "Liberdade não se pede. Se toma." |
| juntos | "Comigo, ninguém luta sozinho." |
| avanca | "O grito da serra ecoa: avança!" |
| quilombo | "Cai a muralha. Não cai o quilombo." |
