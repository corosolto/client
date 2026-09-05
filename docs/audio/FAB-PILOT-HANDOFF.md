# Piloto de áudio Fab — handoff

Atualizado em 2026-09-05 (décima segunda rodada: feedback tátil completo no jogo local).

## Décima segunda rodada — impactos, armadura, pickup/troca e UI

Branch: `claude/audio-fab-pilot`. Base anterior preservada no checkpoint `d648a136`
(`fix(audio): preservar fallbacks e balancear boom`). Nenhum WAV entrou no Git.

O Action Game Sounds Pack agora alimenta cinco contratos específicos do manifest local:

- impacto por superfície: concreto, metal, madeira, vidro, terra e água;
- impacto de corpo e impacto rígido/armadura; headshot usa o segundo cue sem criar HP ou
  mecânica de colete;
- pickup de arma e de munição;
- saque separado por classe: pistola, SMG, rifle, shotgun e sniper;
- UI separada em confirmar, mover/hover e voltar.

O pickup não soma mais três foleys: ao pegar uma arma, toca somente `pickup.weapon`; uma
troca normal por `1`, `2`, `3` ou `Q` toca o saque da classe. Sem manifest local, todos os
caminhos preservam o synth anterior. Os samples de impacto carregam pan, atraso e distância;
o limitador de duas vozes do `game.js` continua protegendo rajadas e pellets de shotgun.

Assets privados usados pelo instalador:

- concreto: `Environment/Rock_Impact_*`;
- metal/madeira: `Combat/Shield_Metal_*` / `Combat/Shield_Wood_*`;
- vidro/terra/água: `Misc/Glass_*`, `Environment/Soil_Impact_*`,
  `Environment/Water_Splash_*`;
- corpo/armadura: `Combat/Hit_Generic_*` / `Combat/Armor_Foley_*`;
- pickup/saque: `Guns/Foley/{Handle,Insert}_Ammo_*` e `Combat/Draw_Weapon_Metal_*`;
- UI: famílias curtas `Interface_2`, `Interface_9` e `Interface_10`.

Validação automatizada já verde: `eval:audioeventos`, `eval:audiofablocal`,
`eval:audiocapacidade`, `eval:audioespacial`, `eval:audioproc`, `syntax`,
`eval:pickuparma`, `eval:charvoice` e `eval:screenquery`. O mutante
`audio-eventos-check --mutante=colapsa-pools` falha em cinco cláusulas, provando que a régua
detecta a volta a um único som genérico. O ledger mede concreto e metal como caminho
`superficie`, mas mantém `decisao: synth`: escuta local não autoriza release.

Roteiro manual em `http://127.0.0.1:8131/?tactile=1` após recarga completa:

1. No menu, mover entre itens, confirmar e voltar devem produzir três assinaturas curtas.
2. Em partida, alternar `1`, `2`, `3` e `Q`: cada classe saca sem o beep de menu.
3. Pegar uma arma com `E`: deve haver um único cue de pickup, sem fim de recarga por cima.
4. Atirar em concreto, metal/carro, madeira/caixa, vidro, terra e água: o material muda o
   ataque do impacto; distância e lado da superfície continuam audíveis.
5. Atirar no corpo e acertar um headshot/personagem de colete: o segundo usa o cue rígido de
   armadura, sem alterar dano, HP ou balanceamento.

Tudo desta rodada ainda é candidato de escuta. A próxima ação autoritativa é o dono marcar
`aprovado`, `rejeitado` ou ajuste de volume por família; merge e publicação continuam fora
de escopo até essa decisão.

## Décima primeira rodada — BOOM GUNS Designed dentro do jogo

Checkpoint de implementação: `f6f0e027` (`feat(audio): integrar boom guns designed em ab local`).

O ZIP comprado pelo dono foi localizado em `~/Downloads/guns_ds_719mb.zip`, testado com
`unzip -t` e conferido pelo SHA-256
`ad47c32d9b82c932c52169b30ab0e038c2d7a7228a3bf21c13fa821807ee76aa`. Ele contém 109 WAVs,
a EULA BOOM de 2022 e metadados PDF/XLSX. A fonte extraída permanece fora do Git em
`private-assets/audio/boom-guns-designed`; os candidatos preparados ficam em
`private-assets/audio/boom-guns-designed-game`.

A EULA local permite adaptar e incorporar os sons em videogame e produção audiovisual com
outros elementos de áudio. Ela proíbe redistribuição standalone/audio-only e uso para treinar
IA/ML, além de exigir prova de compra. Por isso nenhum WAV foi enviado a modelo: o script
`tools/audio/prepare-boom-guns-designed.mjs` usa `ffmpeg` local e determinístico. Somente nomes,
metadados e hashes entram no código/ledger.

O processamento encontrou 76 WAVs `4x SingleShots`, isolou quatro disparos por gravação e
gerou 304 WAVs privados com hashes únicos. O pack de runtime usa 256 desses candidatos em 23
armas do jogo, com estilos `huge`, `natural`, `crispy` e `light`; o Ruger 1022 oferece `bright`
no lugar de `light`. O manifest não contém caminho absoluto. O mapeamento declara se a
correspondência é exata, de família ou proxy — possuir o pack não torna artisticamente exatas
as aproximações.

- **exata:** AK, M4, Mosin e SKS;
- **família:** AKM, M92, MD-97, carabina, MP5, PT-38, Revólver .38, SVD e shotgun;
- **proxy provisório:** LMG, Tavor, Famas, SCAR, G3, Deagle, AWP, Remington 700, M400 e G3SG1;
- **sem gravação BOOM neste produto:** Uzi e P90, que continuam no pack CC0 da décima rodada.

Após a primeira entrega, o dono informou que a raiz ainda tocava os sons anteriores. A causa
foi confirmada no manifest servido: o pack BOOM existia, mas `defaultWeaponPack` estava vazio
e o runtime só o selecionava com `?gunpack=boom`. O laboratório agora declara BOOM como padrão
e o runtime respeita essa chave. `gunpack=base` retorna explicitamente à base anterior;
`gunstyle` escolhe o desenho e `guntake` fixa um disparo para comparação repetível. Sem
`guntake`, um dos takes do estilo é sorteado. A shotgun oferece 16 takes por estilo, reunindo
Ithaca M37, Maverick 88, Maverick 88 FM e Winchester 1300. As gravações BOOM tocam neutras,
sem synth, pitch ou EQ genérico por cima.

### Escuta autoritativa em `8131`

Fazer recarga completa e iniciar uma **partida nova** após trocar de link, porque a pré-carga
das armas ocorre no início da partida:

| Comparação | Link |
|---|---|
| BOOM `huge` padrão | `http://127.0.0.1:8131/` |
| Base anterior (AK Fab + restante CC0) | `http://127.0.0.1:8131/?gunpack=base` |
| BOOM `huge` explícito | `http://127.0.0.1:8131/?gunpack=boom&gunstyle=huge` |
| BOOM `natural` | `http://127.0.0.1:8131/?gunpack=boom&gunstyle=natural` |
| BOOM `crispy` | `http://127.0.0.1:8131/?gunpack=boom&gunstyle=crispy` |
| BOOM `light` | `http://127.0.0.1:8131/?gunpack=boom&gunstyle=light` |
| BOOM `huge`, take 1 fixo | `http://127.0.0.1:8131/?gunpack=boom&gunstyle=huge&guntake=1` |

Prioridade de escuta: shotgun, M4, PT-38, Revólver .38, Deagle, MP5, AK, Mosin/SVD e SKS.
Feedback mínimo útil: `huge: shotgun boa, M4 exagerada; natural: pistola boa; take 2 melhor`.
Uzi e P90 não servem para avaliar este pack porque continuam deliberadamente na fonte CC0.

Validação executada:

- `unzip -t`: verde; `--inspect`: 76/76 gravações com quatro regiões;
- 304/304 derivados privados com hash único; 23 armas e 256 URLs usadas pelo runtime;
- 256/256 URLs BOOM: HTTP 200 com MIME de áudio em `127.0.0.1:8131`;
- `build`, `syntax`, `eval:audiofablocal`, `eval:audioespacial`, `eval:audiocapacidade`,
  `eval:audioproc`, `eval:audioalcance`, `docs:check`, `arch:check`, `eval:docsautoria` e
  `git diff --check`: verdes;
- ESP1e prova seleção exata por pack, estilo e take; ESP1f prova BOOM padrão sem query;
  ESP1g prova o retorno explícito à base; ESP1b continua exigindo zero synth sobreposto ao
  WAV pré-carregado;
- mutante `sem-veto`: vermelho em LAB4/LAB5d, como esperado.

Próximo passo concreto: o dono escuta os quatro estilos no jogo e aprova/rejeita por arma ou
família. Só depois se reduz o pack a uma seleção artística. Nada desta rodada autoriza release,
publicação, derivado distribuível, push ou merge.

### Escuta do dono e correção de fechamento

O dono avaliou os novos tiros como bons e estimou que o resultado chegou a **80–90% do que
queria**, mas apontou duas pendências: o BOOM estava um pouco alto e Uzi/P90 tocavam o som
genérico, não o pack anterior. Isso é aprovação local parcial, não autorização de release.

A investigação reproduziu o segundo defeito: quando a partida começava sem Uzi/P90 na lista
de preload, elas apareciam depois sem buffer e o primeiro caminho acionava oito fontes do
synth genérico. O pack BOOM agora declara `fallbackWeapons: ["uzi", "p90"]`; o preload aquece
esses dois WAVs CC0 mesmo que a partida comece com outra arma. A ESP1h exige uma única fonte
WAV para cada fallback e nenhum synth. O ganho BOOM passou a `0.70` (-3,1 dB); Uzi/P90 não
recebem essa atenuação e permanecem no ganho integral do pack anterior.

O Action Game Sounds Pack tem material adicional útil já inventariado. Vários grupos já estão
ativos — 168 passos, explosão/quique/arremesso de granada, corpo/morte, perfis físicos,
início/fim de round, faca, dry-fire, foley de recarga e soundscapes de 13 mapas. O próximo
incremento de maior valor deve ser estreito: impactos por material/corpo, feedback de armadura,
foley de pickup/troca de arma e UI. Isso exige criar caminhos específicos no runtime e escuta;
não se deve ligar centenas de `Interface`/`Hit_Generic` aleatoriamente.

## Décima rodada — M4, pistolas, Uzi e o restante do arsenal deixam o pool genérico

Checkpoint de implementação: `e2ae2c5c` (`feat(audio): mapear arsenal para gravacoes cc0`).

Depois da nona rodada, a escuta do dono continuou rejeitando o resultado artístico: os tiros
pareciam genéricos e a shotgun parecia um estilingue. A pergunta seguinte tornou o escopo
explícito: rifles como M4A1, pistolas e Uzi também precisam ter fontes próprias. Portanto,
esta rodada substitui o mapeamento Fab por número por um mapeamento semântico do arsenal
inteiro; a AK mantém `Gunshot_1-1`, única fonte aprovada na escuta local.

A fonte nova é a **The Free Firearm Sound Library — Prepared SFX Library**, publicada em CC0
por Ben Jaszczak, Brian Nelson, Kevin Heras e Matthew Nanney. O arquivo original ficou fora do
Git em `private-assets/audio/free-firearm-sfx-cc0/Prepared-SFX-Library.7z`, com SHA-256
`cc1ab5a99a0a365105c7c5dd783f4b0b1fe90938114d3ceec53856bfe005f7d6`. Nenhum WAV entrou em
modelo: `tools/audio/prepare-free-firearm-cc0.mjs` usa somente `ffmpeg` local, com detecção de
silêncio, corte determinístico e fade. O resultado privado contém 29 WAVs e `manifest.json`
com fonte, arma gravada, distância, tipo de correspondência e hashes.

Correspondência registrada — e não mascarada como exata:

- **exata:** Revólver .38, Mosin, SKS e os seis candidatos 12-gauge de shotgun;
- **família/calibre próximo:** M4/AR-15, MD-97, Tavor, Famas, AKM, M92, G3, carabina,
  MP5, Uzi, PT-38 genérica, Remington 700, SVD e G3SG1;
- **proxy provisório:** SCAR, LMG, P90, Deagle, AWP e M400. Esses casos precisam ser
  substituídos se a escuta não reconhecer a personalidade esperada.

O jogo local agora instala 25 armas: AK Fab preservada e 24 armas com gravações CC0. Para
estas gravações autênticas, o runtime usa `playbackRate = 1` e não aplica EQ de classe; pitch
e filtros não podem voltar a transformar fontes diferentes num mesmo timbre genérico. A
shotgun tem seis escolhas determinísticas, todas pré-carregadas, por
`?shotguntake=1..6`. Todos os 29 URLs CC0 servidos em `8131` responderam HTTP 200 como
`audio/wav`.

Validação executada:

- `build` com Node 23, `syntax`, `eval:audiofablocal`, `eval:audioespacial`,
  `eval:audiocapacidade`, `eval:audioproc`, `eval:audioalcance`, `docs:check`, `arch:check`,
  `eval:docsautoria` e `git diff --check`: verdes;
- ESP1b: primeiro tiro pré-carregado continua com uma fonte WAV e zero synth sobreposto;
- ESP1c: `?shotguntake=4` escolhe exatamente o quarto candidato;
- ESP1d: gravação autêntica sai a rate 1 e sem filtro de família;
- mutante `sem-veto`: vermelho em LAB4/LAB5d, como esperado;
- build com o Node 16 encontrado primeiro no PATH foi bloqueado pelo requisito do Astro;
  repetido com `/opt/homebrew/bin/node` v23.6.0, ficou verde.

### Escuta autoritativa em `8131`

Fazer recarga completa e iniciar uma **partida nova** depois de cada troca de URL. Primeiro,
comparar grupos que deveriam soar claramente diferentes:

1. AK, M4, G3 e AWP;
2. PT-38, Revólver .38 e Deagle;
3. MP5, Uzi e P90;
4. shotgun nos seis links abaixo.

| Take | Gravação real | Link |
|---:|---|---|
| 1 | Mossberg Model 190, distância média/sala | `http://127.0.0.1:8131/?shotguntake=1` |
| 2 | Winchester Model 12, distância média/sala | `http://127.0.0.1:8131/?shotguntake=2` |
| 3 | Benelli Nova, distância média/sala | `http://127.0.0.1:8131/?shotguntake=3` |
| 4 | Mossberg Model 190, perto | `http://127.0.0.1:8131/?shotguntake=4` |
| 5 | Winchester Model 12, perto | `http://127.0.0.1:8131/?shotguntake=5` |
| 6 | Benelli Nova, perto | `http://127.0.0.1:8131/?shotguntake=6` |

Feedback mínimo útil: `M4 boa; Uzi fraca; Deagle sem peso; shotgun 2`. Verde técnico,
gravação real e CC0 **não equivalem** a aprovação artística. Nenhum resultado desta rodada
autoriza release, publicação, derivado distribuível, push ou merge.

## Nona rodada — remover o som antigo e devolver personalidade

Checkpoint de implementação: `5bb8b95d` (`fix(audio): remover sobreposicao e distinguir pistolas`).

A escuta do dono rejeitou quatro pontos da oitava rodada: shotgun ruim; som antigo audível
junto do Fab; morte com dramatização de jogo de luta; e pistolas difíceis de distinguir. Esse
relato é o estado autoritativo — o verde técnico anterior não substitui a escuta.

A investigação encontrou **duas** origens do som antigo:

- `_sampleGunSignature()` criava ataque de ruído e subgrave procedural por cima de cada WAV;
- o primeiro disparo de cada arma caía inteiro no synth enquanto o WAV fazia fetch/decode.

O runtime agora:

- usa **uma única fonte por disparo**: o WAV pode receber somente `playbackRate`, filtros e
  ganho. A camada procedural sobreposta foi removida;
- pré-carrega apenas os WAVs das armas sorteadas para a partida junto dos GLBs. A ESP1b exige
  que o primeiro tiro depois do preload tenha 1 `BufferSource` e 0 osciladores;
- mantém synth apenas como contingência para URL ausente/falha de decode ou chamada fora do
  fluxo normal de início de partida;
- dá perfis exatos e distintos a PT-38 (`pistol`), Revólver .38 e Deagle. A Zastava M92
  continua corretamente na família AK, não como pistola;
- preserva a AK neutra (`rate 1`, sem high-pass/low-pass audível e ganho 1), conforme a única
  aprovação humana vigente;
- aproxima a shotgun do take original (`rate 0,96`, low-pass 7,8 kHz) em vez de deixá-la lenta
  e abafada (`0,78`/`4,6 kHz`) com subgrave sintético;
- toca na morte somente a queda corporal, a `0,72 × volume`. Vocal de morte e dois stings
  tonais saíram do caminho padrão; o fallback virou um único baque seco. Vozes físicas de dor
  continuam ativas e os takes de morte permanecem no manifest para avaliação futura, não
  sobrepostos no jogo.

Validação executada:

- `build`, `syntax`, `eval:audiofablocal`, `eval:audioespacial`, `eval:audiocapacidade`,
  `eval:audioproc`, `eval:audioalcance`, `docs:check`, `arch:check`, `eval:docsautoria` e
  `git diff --check`: verdes;
- ESP1b: 1 fetch, 1 decode, 1 fonte WAV e 0 osciladores no primeiro tiro pré-carregado;
- servidor `http://127.0.0.1:8131/`: raiz HTTP 200; shotgun HTTP 200 como `audio/wav`.

### Próxima escuta autoritativa em `8131`

1. Fazer recarga completa da página e iniciar uma partida nova — partidas já abertas não
   executaram a pré-carga nova.
2. Atirar já no primeiro clique e depois em rajada com AK; não deve existir um segundo ataque,
   grave ou synth por baixo do WAV.
3. Comparar PT-38, Revólver .38 e Deagle. A ordem esperada é leve/seca, intermediária e
   pesada; se ainda parecer apenas mudança de pitch/EQ, os takes Fab precisam ser rejeitados e
   substituídos por gravações licenciadas realmente próprias, não receber mais synth.
4. Testar shotgun perto e em rajada. Esta rodada corrige o processamento que a estragava, mas
   **não declara o take aprovado**.
5. Matar um bot perto e morrer uma vez. Deve tocar somente queda/baque corporal curto, sem
   vocal dramático nem nota descendente.

Esta seção substitui as instruções de escuta da oitava rodada. Nada aqui autoriza release,
publicação, derivado distribuível, push ou merge.

## Oitava rodada — o jogo deixa de soar como tiro + passos

Checkpoint de implementação: `44d39ba1` (`feat(audio): dar identidade a armas mapas e eventos`).

O relato autoritativo do dono foi que os tiros Fab estavam bons, porém genéricos — rifle,
pistola e sniper se distinguiam quase só pela cadência — e que morte, granadas, personagens
e a maior parte dos mapas continuavam mudos. A investigação confirmou duas causas, não uma
falha de codec:

- a morte tocava no mesmo barramento que o tiro e era reduzida pelo duck justamente no
  abate; a morte de bot ainda zerava em apenas 34 m;
- só Córrego declarava `world.sound`; os outros 12 mapas não tinham soundscape ligado.

O runtime e o laboratório local agora entregam:

- **morte audível e contextual:** queda corporal a `0,92 × volume` e vocal físico a
  `0,46 × volume`, ambos direto no master, fora do duck do tiro; alcance de bot aumentado
  para 55 m e posição/pan/propagação preservados no single-player e multiplayer;
- **compatibilidade:** `death(characterId, vol, pan, delay)` aceita também a assinatura antiga
  `death(vol, pan, delay)`. A primeira implementação quebrou essa compatibilidade e CAP2 ficou
  vermelho; o overload é o conserto validado, não uma precaução teórica;
- **granada completa:** pino mecânico procedural, arremesso Fab, quique Fab com força mínima e
  limite temporal, explosão Fab espacial e abertura procedural da fumaça. Os eventos `nade` e
  `boom` do multiplayer passam pelos mesmos caminhos;
- **personagens:** os 44 ids têm perfil físico `male`, `female` ou `creature`, com pools de dor
  e morte sem `scream`. É feedback corporal provisório, não 44 dublagens autorais; vozes de
  seleção/time existentes continuam separadas;
- **13 mapas:** todos recebem configuração local. Praça, Loja H, Ferro Velho, Quebrada, Córrego,
  Posto, Obras, Parque e Velho Oeste usam vento/água e eventos semanticamente compatíveis do
  Fab; Piscina usa água; UPA, Atacadão e Penitenciária usam hum procedural discreto com portas
  ou metal. One-shots são pré-carregados para o primeiro evento não desaparecer;
- **identidade de arma no sample:** pistola, SMG, AR, rifle, LMG, sniper e shotgun recebem
  pitch, faixa espectral, transiente e corpo próprios. A AK usa perfil neutro — `rate 1`, sem
  filtro nem camada — para preservar o take já aprovado na escuta local.

O manifest instalado contém 285 referências (265 URLs únicas): 25 armas, 7 pisos, 13 mapas,
3 perfis físicos, 2 takes de arremesso, 4 de quique e 4 quedas corporais. Os WAVs continuam no
staging privado e o Git contém somente código, contrato e fixtures de texto.

Validação executada neste checkpoint:

- `build`, `syntax`, `eval:audiofablocal`, `eval:audioalcance`, `eval:audioespacial`,
  `eval:audiocapacidade`, `eval:audioproc`, `docs:check`, `arch:check`, `eval:docsautoria` e
  `git diff --check`: verdes;
- mutante `eval:audiofablocal -- --mutante=sem-veto`: vermelho em LAB4/LAB5d, como esperado;
- servidor `http://127.0.0.1:8131/`: raiz e manifest HTTP 200;
- 265/265 URLs únicas do manifest: HTTP 200 com MIME `audio/wav`;
- amostras críticas de morte, vocal masculino/feminino, arremesso, quique, Córrego e UPA:
  HTTP 206 com cabeçalho `RIFF/WAVE`.

A automação do navegador não conseguiu entrar no localhost porque a checagem de política do
browser ficou indisponível em duas tentativas. Isso não foi contornado. Portanto, a prova HTTP
e os gates estão verdes, mas a escuta humana abaixo continua obrigatória.

### Escuta manual autoritativa em `8131`

1. Recarregar `http://127.0.0.1:8131/` e iniciar single-player.
2. Atirar duas vezes com a AK: o primeiro tiro aquece o buffer e pode usar synth; o segundo
   preserva o take aprovado. Trocar entre pistola/SMG/rifle/sniper/shotgun para julgar a nova
   assinatura, não apenas a cadência.
3. Tecla `4`: ouvir pino, arremesso, pelo menos um quique e abertura da fumaça após 2,2 s.
4. Tecla `5`: ouvir pino, arremesso, quique e explosão após 1,5 s. Há uma frag por round.
5. Matar um bot perto e a média distância: ouvir vocal físico + queda corporal. Deixar o
   jogador morrer uma vez para conferir a versão central/prioritária.
6. Entrar ao menos em Córrego, UPA e Ferro Velho: o leito começa após decodificação; eventos
   pontuais têm intervalos deliberados de 16–95 s e não devem competir com informação de jogo.

Próximo passo concreto: o dono marca cada família/evento/mapa como `aprovado`, `baixo`, `alto`,
`genérico` ou `semântico errado`. Nenhum resultado técnico desta rodada autoriza release,
publicação, derivado distribuível, push ou merge.

## Sétima rodada — cobertura do jogo e primeira decisão humana

Depois de testar `http://127.0.0.1:8131/`, Ruben aprovou explicitamente o take
`Guns/Gun_Shot/Gunshot_1-1.wav` para a AK: “a AK ficou muito boa”. Essa é uma aprovação
do **candidato fonte no laboratório local**. Não existe derivado de release, autorização de
publicação nem liberação do WAV; a separação está registrada em
`docs/audio/proveniencia.json` e coberta por PRV2b/PRV8b.

O laboratório local agora instala 233 referências seguras do pack:

- 25 armas de fogo com 25 takes distintos; só a AK tem aprovação humana, as outras 24 são
  hipóteses de escuta e não identidades confirmadas pelo nome genérico `Gunshot_N-M`;
- passos com pools separados para concreto, metal, madeira, terra, grama, cascalho e água;
  enquanto os mapas não expõem material sob o pé, `game.js` usa água espacial e um piso
  dominante por arena;
- 4 quedas corporais, 6 explosões de frag, dry fire, swing/hit/deploy de faca e vinhetas
  curtas distintas para início, vitória e derrota do round;
- os tiros por sample preservam pan, atraso de propagação, fallback synth e agora têm teto
  de 4 caudas simultâneas por take e 16 no total. A ESP10 reproduz a rajada de 12 tiros e
  exige o corte das oito caudas mais antigas.

Limites honestos deste checkpoint:

- reload/reloadend/bolt ainda são pools globais, não foley próprio por arma;
- o pack não oferece candidato nominal confiável para pino, lançamento e quique de granada;
  a frag tem explosão, mas `explosion()` ainda não recebe posição;
- tiros distantes e impactos de bala seguem fora do jogo e disponíveis só para avaliação;
- o primeiro tiro de cada arma usa synth enquanto o buffer decodifica; os seguintes usam o
  take próprio;
- os 24 tiros novos, passos e eventos ainda exigem escuta humana. Verde técnico não é
  aprovação visual/auditiva nem prontidão de release.

O pack comprado já oferece candidato para toda arma e para os eventos pedidos, portanto
nenhum arquivo externo foi baixado nesta rodada. Se um take for rejeitado, o fallback
prioritário é avaliar a [Free Firearm Sound Library](https://opengameart.org/content/the-free-firearm-sound-library),
marcada como CC0, e conferir licença, autoria, arquivo e hash no momento da importação.
“CC0” no título ou no upload não basta quando o conteúdo remasteriza áudio de outro jogo.

## Sexta rodada — escuta dentro do jogo, sem publicar o pack

O checkpoint `fe169ff1` adiciona um instalador local que mantém os WAVs no staging privado e
cria somente dois itens ignorados pelo Git: `public/audio/fab-dev` (symlink) e
`public/audio/manifest.json`. Ele recusa pack dentro do repositório, arquivo ausente, path
traversal, nome vetado por gore e qualquer manifest/symlink preexistente que não pertença ao
laboratório.

Estado validado nesta máquina:

- jogo local: `http://127.0.0.1:8131/`;
- escuta A/B e biblioteca segura completa: `http://127.0.0.1:8130/`;
- manifest servido com HTTP 200 e sample da AK servido como `audio/wav`, PCM 16-bit, 44,1 kHz,
  estéreo;
- 48 candidatos ligados a 5 eventos que o runtime alcança: um tiro fixo da AK, 6 saídas de
  carregador, 9 entradas, 8 foleys ambíguos de ferrolho e 24 passos em concreto;
- tiro distante, morte corporal e os dois impactos continuam somente em A/B porque o runtime
  ainda não tem caminho compatível; nenhum deles foi forçado para outra semântica;
- nenhum candidato Fab foi aprovado, copiado para o Git, empacotado ou autorizado para release.

Para reinstalar depois de reiniciar a máquina, mantenha o volume `Zenith` montado e rode:

```bash
npm run audio:game:local -- /Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack
env PATH=/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run dev -- --host 127.0.0.1 --port 8131
```

O primeiro disparo da AK aquece o buffer e cai no synth; do segundo em diante o sample toca.
Recarga, ferrolho e passos ainda são pools globais no runtime e só podem ser julgados usando a
AK neste laboratório — não estão tecnicamente prontos para aprovação por arma/superfície.

Validação do checkpoint: `eval:audiofablocal`, `eval:audioproc`, `eval:audiocapacidade`,
`eval:audioespacial`, `audio:shortlist:autoteste`, `docs:check`, `eval:docsautoria`, syntax com
Node 24 e `git diff --check` verdes. O mutante `sem-veto` acendeu LAB4. A escuta humana dentro
do jogo continua pendente e é o próximo passo autoritativo.

## Objetivo e definição de pronto

Substituir sons de procedência insegura por um primeiro conjunto licenciado e audivelmente
coerente, sem reabrir o arsenal inteiro nem distribuir o pacote fonte.

O piloto só fica pronto quando estes eventos estiverem aprovados no jogo real:

- AK em primeira pessoa: tiro, carregador sai, carregador entra e ferrolho;
- passos em concreto;
- morte corporal;
- impactos em concreto e metal.

O restante continua usando o fallback sintetizado até passar pelo mesmo processo.

**A etapa concluída nesta rodada não é o piloto.** É a pipeline que o recebe: as réguas que
reprovam antes de um arquivo sem procedência chegar ao jogador, e os dois defeitos que a
integração ia herdar calada.

## Branch e limites

- worktree: `/Users/ruben/csbrasil/worktrees/audio-fab-pilot`;
- branch: `claude/audio-fab-pilot`;
- base: `origin/main` em `dcd8858edc7ed5141d3f3227b74946b0f951166b`;
- não fazer push, merge, deploy ou release sem aprovação do dono;
- não tocar em `/Users/ruben/csbrasil/worktrees/viewmodel-blender`;
- não usar a lane divergente `feat/audio-voices-test` como base de merge.

### Commits desta rodada

| Commit | O que é |
|---|---|
| `e3e8792f` | handoff inicial (antes desta rodada) |
| `d84dbca5` | régua de alcance do empacotamento (ALC) — **vermelha**, 17 de 17 |
| `fd4481ef` | conserto: ambiente entra no manifest e no pack — ALC verde |
| `e86bb393` | régua espacial do tiro por sample (ESP) — **3 cláusulas vermelhas** |
| `b4065a67` | conserto: tiro por sample entra no grafo — ESP 7 de 7 verde |
| `d7a38530` | contrato de procedência por asset (PRV) + PRV5 no `assert:assets` |
| `4f6e7361` | inventariador local do staging privado + `.gitignore` |
| `7ec05c95` | conserto de defeito **introduzido** pelo `b4065a67`, achado pela ESP7 |
| `1462c8d0` | BUG-126 e BUG-127 no `KNOWN-BUGS.md` |
| `86cebd8d` | **ALC2 era falso-verde** — o empacotador morria em toda execução |
| `a35e3bd1` | sample que não carrega cai no synth, não em silêncio (ESP8) |
| `fa513890` | **P0**: trava de redistribuição Fab + PRV5 volta a poder disparar |
| `2b66bc80` | a decisão do ledger controla o gerador (PRV7) |
| `c9f5e49f` | shortlist por metadado e escuta A/B local |
| `9940d631` | handoff da 2ª rodada e BUG-128..131 |
| `68b9f862` | rajada com cache frio faz 1 requisição, não 1 por tiro (ESP9) |
| `0ce13b40` | inventariador sinaliza falha POR ARQUIVO e sai 1 |
| `f8b1eb7c` | `sha256Fonte` exige formato E é conferido contra o arquivo real (PRV8) |
| `159d6fe7` | **gate de capacidade**: só se aprova o que o runtime sabe tocar (CAP) |
| `a6fe38c7` | legado CS/Valve/UT catalogado e bloqueado (PRV9) |
| `7cec535f` | handoff da 3ª rodada e BUG-132..136 |
| `58d6dc10` | **P0 fail-closed**: allowlist no prefixo derivado, nas três camadas |
| `b0d3d1a4` | registra o escape P0 e corrige o que os docs superdeclaravam |
| `6b9b744f` | resultados da 4ª rodada; `audio:check` registrado como vermelho |
| `6a1bc05b` | **P1**: ledger ausente aborta o gerador, nos dois modos (PRV12) |
| `9f278f56` | **P2**: prova automatizada do `assets-check` contra fixture (PRV13) |
| `f57d8b9f` | handoff da 5ª rodada e BUG-138/139 |
| `4531147e` | fixture PRV13 isolada do ledger real |
| `de1c83b8` | biblioteca Fab segura completa disponível na escuta local |
| `fe169ff1` | laboratório Fab ligado ao jogo local sem versionar os WAVs |
| `b46d452f` | escuta no jogo local registrada e servidor 8131 documentado |
| `cfe7f7ed` | 25 tiros próprios, eventos, pisos, limites de voz e gates CAP5/ESP10 |
| `44d39ba1` | assinaturas de arma, granadas, morte prioritária, perfis físicos e 13 soundscapes |
| `5bb8b95d` | fonte única, preload do primeiro tiro, pistolas distintas, shotgun recuperada e morte seca |

## Fonte e licença

Fonte comprada pelo dono: [Action Game Sounds Pack](https://www.fab.com/listings/4950a0c3-ace9-4cce-86dc-ce551263b6ce),
de PlaceHolder Inc., sob Fab Standard License.

Os arquivos fonte devem ficar fora do Git público. Não publicar os WAVs nem um ZIP que
funcione como redistribuição standalone. A build pode receber apenas derivados selecionados,
convertidos, renomeados por conteúdo e incorporados ao projeto.

A listagem está marcada como `Allows usage with AI: No`. Claude pode trabalhar no contrato,
no código, nos testes e em metadados, mas não deve receber os WAVs brutos como entrada.
**Nenhum byte de áudio entrou em nenhuma medição desta rodada:** as réguas rodam sobre
fixtures geradas na hora (arquivos de texto de 44 bytes na ALC, `ArrayBuffer` de 32 bytes
na ESP, WAVs de ruído gerados pelo próprio autoteste no inventariador).

## O caminho real do áudio, mapeado

Antes de qualquer conserto, o inventário do caminho que um som percorre hoje:

| Etapa | Arquivo | O que faz |
|---|---|---|
| disco | `public/audio/` | **gitignored**; não existe em clone limpo |
| manifesto | `tools/gen-audio-manifest.mjs` | varre a pasta e escreve `manifest.json`; `cs/weapons/general/weaponSamples` são curados e preservados do manifest anterior |
| empacotamento | `scripts/build-audio-pack.mjs` | copia **só o que o manifest nomeia** (+ `menu-music/`), renomeia por sha-1 do conteúdo e monta o zip |
| instalação | `scripts/fetch-audio.sh` | baixa a release e descompacta em `public/audio/`; cai no `manifest.example.json` se o zip não trouxer manifest |
| portão de build | `tools/eval/assets-check.mjs` | piso de 250 caminhos + todo caminho existe no disco |
| runtime SFX | `public/js/audio.js` | `loadManifest` → `weaponSamples` liga o caminho por sample; synth é o primário |
| runtime ambiente | `public/js/soundscape.js` | `AMB_LOOPS` + `BIOME_SHOTS`; `map_corrego.js` é o único mapa com `world.sound` hoje |
| chamador | `public/js/game.js:3035` e `:6336` | player = distância 0; bot = distância, pan e `dist/343` |

Foi esse mapa que produziu os dois defeitos abaixo — registrados como **BUG-126** e
**BUG-127** no `KNOWN-BUGS.md`. Os dois eram invisíveis: um só aparece em produção, o outro
só aparece depois que o pack de samples é ligado.

**O segundo é LATENTE, e isso muda o risco desta rodada.** `grep -rn weaponSamples` acha a
leitura em `audio.js`, a preservação em `gen-audio-manifest.mjs:54` e as sondas
aposentadas, que o forçam a `false` — **nada no repositório liga o caminho por sample**. O
jogo de hoje roda o sintetizado, então a única mudança de `public/js/audio.js` que alcança
produção agora é o `duck(dist < 12 ? 0.3 : 0.55)` virar `duck(Sfx.duckTiro(dist))`: a mesma
expressão, com nome. Todo o resto do conserto está no caminho que o piloto vai ligar.

## Réguas escritas, e a mutação de cada uma

Toda régua foi escrita **antes** do conserto e commitada vermelha, com a medição no corpo
do commit. As mutações rodaram **depois** do conserto, contra o código já verde.

### `eval:audioalcance` (ALC) — o som que o código nomeia chega na build?

`soundscape.js` nomeia 17 arquivos de ambiente. Nenhum era alcançado: o gerador não tinha
regra para `ambiente/`, então eles entravam como órfãos, não viravam folha do manifest, e o
empacotador — que copia só o que o manifest nomeia — não os punha no zip. Em produção, 404
que `soundscape.js:59` engole com um `console.warn`.

A régua arma uma fixture sintética e roda o gerador e o empacotador **reais** contra ela
(`--raiz=`), em vez de depender do pacote privado: régua que só roda na máquina de quem já
tem tudo é o furo da lição 12.

| Execução | Resultado |
|---|---|
| antes do conserto | ALC1 17/17 fora do manifest · ALC2 17/17 fora do pack |
| depois | verde, 17/17 |
| `--mutante=nome-trocado` | ALC1 e ALC2 vermelhas por 1 — prova que lê por NOME (lição 14) |
| `--mutante=sem-copia` | só ALC2 vermelha, ALC1 verde — separa gerador de empacotador |

Conserto: regra `ambiente` no gerador (a pasta é a verdade, igual às outras famílias) e
cláusula irmã no `assets-check`, que mede o **pacote instalado** enquanto a ALC mede a
**pipeline**. As duas leem a lista da mesma fonte, `soundscape.js` (lição 2).

Por que a cláusula de produção é nominal e não entra no piso de 250: medido nesta árvore,
com uma fixture de 317 caminhos e a chave `ambiente` removida do manifest, o piso e a
cláusula de "existe no disco" ficam **verdes** e só a cláusula nova acende, por 17 de 17.

### `eval:audioespacial` (ESP) — o tiro por sample ouve a distância?

`game.js:6336` entrega distância, pan e `dist/343` em todo tiro de bot. O caminho por
sample descartava os três:

```js
if (this.pack?.weaponSamples) { … this.duck(0.3, 0.16); this._sample(f, vol); return; }
```

`_sample` é `new Audio(...).play()`: sem grafo, sem pan, sem agendamento. Bot a 40 m às
suas costas soaria igual a bot a 2 m à sua frente — a informação de jogo que o dono cobrou
("não vejo de onde vem o tiro, parece cheater") existe no synth e sumiria no instante em
que o pack Fab fosse ligado. O `duck` de `0.3` fixo era a lição 2 em miniatura: o synth
ducka `dist < 12 ? 0.3 : 0.55`.

A régua planta um `AudioContext` falso que grava o grafo e importa o `audio.js` **de
produção**.

| Cláusula | Antes | Depois |
|---|---|---|
| ESP1 cache frio não silencia | verde | verde |
| ESP2 pan chega a um `StereoPanner` | **vermelha** | verde |
| ESP3 som começa em `currentTime + propDelay` | **vermelha** | verde |
| ESP4 duck pela mesma regra do synth (40 m) | **vermelha** | verde |
| ESP4b mesma regra a 0 m | verde | verde |
| ESP5 IRMÃ: o synth continua espacializando | verde | verde |
| ESP6 fallback synth intacto | verde | verde |
| ESP7 volume do usuário entra uma vez | não existia | **vermelha** no `b4065a67`, verde no `7ec05c95` |

ESP4b passava no código quebrado porque a 0 m os dois valores coincidem em 0,3 — é
exatamente por isso que ESP4 mede a 40 m. E ESP5 existe porque, sem ela, apagar a
espacialização dos **dois** caminhos deixaria ESP2/ESP3 verdes por ausência de comparação
(lição 1).

| Mutação | Resultado |
|---|---|
| `--mutante=sem-pan` | ESP2 e ESP5 vermelhas |
| `--mutante=sem-propagacao` | ESP3 e ESP5 vermelhas |
| `--mutante=duck-fixo` | ESP4 vermelha |

**A ESP7 nasceu de um defeito que EU introduzi.** Revisando o próprio diff do
`b4065a67`, o ganho do `_shotSample` aplicava `this.vol` e o `master` aplicava de novo —
`_sample` multiplica na mão porque HTMLAudio não passa pelo `master`, e um `BufferSource`
passa. Medido com vol 0,5, `this.vol` 0,7 e `GUN_VOL` 0,62: ganho até o destino **0,1519**
onde a conta certa é **0,2170** — o sample sairia 30% mais baixo que antes do conserto,
sem erro nenhum no console. Cada nó, isolado, parecia certo; só o produto do trajeto
inteiro mostra. A cláusula roda com `?gunvol=1` para fazer a conta sem copiar o `0,62`
para dentro da régua, e repor o ganho antigo a deixa vermelha por 0,2450 contra 0,3500.

Isso é o corolário do `AGENTS.md` em ação e também o seu limite: a régua pegou o defeito
porque alguém foi olhar o diff, não porque o portão estava verde. **Quem construiu não deu
a nota — e continua sem poder dar.**

As duas primeiras acendem a irmã junto, e isso é o esperado: elas mutam a entrada do `Sfx`,
então o synth também para de espacializar. A primeira versão do mutante `sem-propagacao`
**não acendia nada** — ela zerava o valor que a própria cláusula usava como referência, e
mutação que se auto-anula parece mutação que passou (lição 8). A interceptação foi movida
para dentro do `Sfx`, com o valor pedido preservado na cláusula, e uma guarda que sai 2
quando a mutação não intercepta nenhuma chamada.

Conserto: `_shotSample` decodifica uma vez por arma e toca por
`BufferSource → gain → StereoPanner → master`, agendado em `currentTime + propDelay`. O duck
virou `Sfx.duckTiro(dist)`, chamado pelos dois caminhos. Cache frio toca pelo `_sample`
antigo — sem pan, mas audível — e falha de rede grava `null` e não retenta.

### `eval:audioproc` (PRV) — asset sem origem não entra numa build

`.gitignore` protege o git e **só** o git: o pacote é montado à parte e servido em
produção, então um arquivo de procedência desconhecida chega ao jogador sem passar por
commit nenhum. É o caminho que o BUG-23 abriu nos decalques, e o piloto Fab o percorre
inteiro.

- ledger: `docs/audio/proveniencia.json` — metadado, nenhum byte de som;
- contrato: `docs/audio/PROVENIENCIA.md` — o que cada campo significa e por quê;
- `eval:audioproc` cobra a forma (PRV1–PRV4); `assert:assets` cobra a build (PRV5:
  todo caminho sob `audio/piloto/` tem entrada no ledger com sha-256 batendo com o disco).

**PRV2 é a regra que não se negocia:** `aprovacao: "aprovado"` exige `escutaAB` com quem
ouviu e quando. Nenhuma régua desta base ouve som — elas provam que o arquivo chegou
inteiro e veio de onde diz que veio. Quem aprova é o dono, no jogo real, A/B contra o synth.

| Mutação | Resultado |
|---|---|
| `--mutante=aprovado-sem-escuta` | PRV2 vermelha |
| `--mutante=derivado-sem-fonte` | PRV4 vermelha |
| `--mutante=evento-sem-decisao` | PRV3 vermelha |

PRV5 foi medida numa fixture local de 301 caminhos: caminho sob o prefixo sem entrada no
ledger **reprova**; com hash correto **passa**; com o hash trocado **reprova** por "o
arquivo que a build serve não é o que foi aprovado".

## O ESCAPE P0 DA 4ª RODADA — e a correção que ele forçou

**A auditoria final provou que a trava de licença que eu declarei fechada não estava
fechada.** Reproduzido com o empacotador real:

```
fonte `proibida-standalone`, derivados: [], manifest -> audio/piloto/nao-catalogado.wav
node scripts/build-audio-pack.mjs out --raiz=… --ledger=…
  -> PACK: 1 arquivos hasheados | exit 0 | zip gerado, com o arquivo dentro
```

**A causa é a forma da régua, não um descuido pontual.** Eu montava uma DENYLIST a partir
de `ledger.derivados`: ela barrava o hash conhecido e deixava passar o desconhecido. É a
lição 1 do `docs/LICOES.md` na veia — a régua perguntava *"este arquivo é um mau
conhecido?"* e era **estruturalmente incapaz** de ver o estado ruim, que era exatamente
"não catalogado". O `assets-check` dava `continue` no mesmo caso, e o gerador carregava uma
terceira cópia da mesma decisão errada.

**Correção:** a regra virou ALLOWLIST e passou a morar em `tools/audio/politica.mjs`, uma
vez só para as três camadas — três cópias divergiriam na próxima edição (lição 2). Sob
`prefixoDerivado`, nada atravessa sem estar no ledger com hash coerente, `aprovacao:
"aprovado"`, evento em `derivado` com caminho específico (`arma`, `superficie` ou
`evento`) e fonte compatível. Caminho do legado reprova por NOME.

| Prova | Camada | Antes | Depois |
|---|---|---|---|
| PRV10a não catalogado sob o prefixo | empacotador | **exit 0, zip gerado** | recusa |
| PRV10b IRMÃ: catalogado/aprovado/livre | empacotador | — | aceita e gera o zip |
| PRV10c caminho do legado por nome | empacotador | aceitava | recusa |
| PRV11 + irmã | gerador | deixava no manifest | tira o não catalogado, mantém o outro |
| PRV5 + irmã | `assets-check` | `continue` mudo | recusa; a irmã passa |

As irmãs não são enfeite: sem elas, um empacotador que recusasse tudo passaria em PRV10a
sem proteger nada.

### O que esta correção NÃO cobre, dito na cara

- **Pós-rename não há cobertura por conteúdo.** Depois que o empacotador reescreve para
  `audio/a/<sha1>`, o prefixo some e um derivado não catalogado fica indistinguível de
  qualquer outro áudio. Por isso a camada **decisiva** é o empacotador, que roda antes do
  rename. O `assets-check` é segunda linha.
- **O legado é barrado por NOME, não por conteúdo.** Não há hash porque os arquivos não
  existem em clone limpo. Renomear um arquivo legado o faria escapar do bloqueio nominal.
  Isso é limitação declarada, não cobertura.
- **A 2ª e a 3ª rodada superdeclararam.** Os títulos "todos fechados" viraram "fechados na
  Nª rodada", porque o P0 mostra que a lista de bloqueadores nunca esteve completa — ela
  estava completa *até onde aquela revisão olhou*.

## A 5ª rodada — os dois pontos que sobraram do P0

A reauditoria confirmou o escape fechado nas três camadas e apontou dois restos.

### P1 — o gerador falhava ABERTO sem ledger

O empacotador e o `assets-check` abortavam sem ledger. O gerador não: `barrado()` fazia
`if (politica.erro) return null` e seguia.

```
node tools/gen-audio-manifest.mjs --raiz=… --ledger=<inexistente>
  antes   exit 0 nos dois modos, sem diagnóstico,
          `audio/piloto/nao-catalogado.wav` MANTIDO no manifest
  depois  exit 1 nos dois modos, dizendo que falta o ledger, manifest intocado
```

"Não consigo verificar" virava "pode passar" — o oposto da lição 5, e a única das três
camadas que contradizia a própria documentação. **PRV12** cobre os dois modos de propósito:
`--check` é o que roda no portão, e era o que abortava sem dizer o motivo (saía pelo diff
do manifest, não pela procedência). A irmã exige que, com ledger válido, o gerador gere —
abortar sempre não é falhar fechado, é não funcionar.

### P2 — a prova do `assets-check` era manual

PRV10 e PRV11 rodavam o empacotador e o gerador de verdade; a terceira camada só tinha
prova feita à mão numa rodada e não repetida. Prova manual vale no dia em que alguém a
digita. **PRV13** roda o script real contra fixture, com os mesmos três cenários:

| | cenário | resultado |
|---|---|---|
| PRV13a | `audio/piloto/nao-catalogado.wav` | reprova — `NÃO CATALOGADO` |
| PRV13c | `audio/game/awp-cs-1-6.mp3` | reprova — legado bloqueado, por nome |
| PRV13b | IRMÃ: catalogado/aprovado/livre | **passa** |

Conferido que a e c reprovam pelo motivo **certo** — a mensagem é a da cláusula de
procedência, não o piso de 250 nem outro efeito colateral da fixture. Para isso o script
ganhou `--raiz=`, `--ledger=` e `--so=audio`, no padrão que o gerador e o empacotador já
tinham; sem os flags nada muda.

**A mutação viva** — devolver a semântica de denylist em `tools/audio/politica.mjs` —
acende **PRV10a, PRV11 e PRV13a juntas**. As três camadas leem a mesma função, e é assim
que se vê que leem.

Nada disso muda os limites já declarados: **pós-rename continua sem cobertura por
conteúdo**, e o **legado continua barrado só por NOME**, porque não há hash.

## ESTADO POR EVENTO — as cinco situações, sem misturar

O piloto tem 8 eventos. Chamar tudo de "pendente" esconde que os motivos são
diferentes e as saídas também.

| Evento | Candidato no pacote | Caminho de runtime | Estado |
|---|---|---|---|
| `ak.shot` | 43, em 8 famílias | **`arma`** (específico) | fonte local **aprovada**; release bloqueado |
| `ak.magOut` | 6 (`Unload_1`) | `global` | **sem caminho runtime** |
| `ak.magIn` | 9 | `global` | **sem caminho runtime** |
| `ak.bolt` | 8 (`Load_1`, ambíguo) | `global` | candidato semântico fraco + sem caminho por arma |
| `passo.concreto` | 24 | **`superficie`** | **pronto para escuta** |
| `morte.corpo` | 4 (`Body_Falling`) | **`evento`** | **pronto para escuta** |
| `impacto.concreto` | — | `nenhum` | **sem candidato** + sem caminho |
| `impacto.metal` | — | `nenhum` | **sem candidato** + sem caminho |

E, atravessando todos eles, o **bloqueio de licença/canal**: mesmo `ak.shot`, que é o único
pronto dos dois lados, não pode chegar ao jogador enquanto a forma de incorporação não for
decidida.

### O que cada estado significa

**Fechado** — a pipeline faz e há régua com mutação que prova. Alcance do empacotamento,
espacialização do tiro, procedência, recusa de redistribuição, capacidade, inventário.

**Bloqueado por licença/canal** — `audio-pack.zip` é asset de release e é um pacote só de
áudio, que é a forma que a Fab Standard License proíbe. A trava está implementada; a rota de
incorporação **não foi escolhida** porque a diferença entre "incorporado" e "redistribuído"
é julgamento jurídico do dono. Bloqueio 1.

**Sem candidato** — o pacote não tem som semanticamente bom: `ak.bolt`,
`impacto.concreto`, `impacto.metal`. Não foram forçados. Bloqueio 4.

**Sem caminho runtime** — o jogo não sabe tocar aquele som *especificamente*. Medido por
sonda: `reloadStart()`, `reloadEnd()` e `bolt()` não recebem arma e leem chaves globais;
`step(surface)` recebe a superfície e mesmo assim sorteia de `cs.footsteps`, pool única;
`death()` e `ricochet()` não consultam o pack. Aprovar aqui poria o mesmo ferrolho em 26
armas, o mesmo passo em grama e metal, e deixaria morte e impactos aprovados no papel e
mudos no jogo. **7 dos 8 eventos estão neste estado.** Bloqueio 5.

**Legado ainda pendente** — 45 de 62 caminhos do `manifest.example.json` versionado têm
nome de Valve/Epic. **Esta lane não substituiu nenhum**, e a PRV5 não os cobre porque não há
hash em clone limpo. Catalogados e bloqueados. Bloqueio 6.

## Os cinco achados da segunda revisão — fechados na 3ª rodada

| Achado | O que era | Régua |
|---|---|---|
| `sha256Fonte` era texto livre | "conferido a olho" passava por procedência | PRV1 + **PRV8** |
| ledger aprovava o que o runtime não toca | agora 5 de 8 sem caminho específico | **CAP1–CAP5** |
| legado fora de cobertura | 45 caminhos CS/Valve/UT sem catalogação | **PRV9** |
| inventariador mascarava falha | WAV ilegível saía com tudo `null`, exit 0 | INV6–INV8 |
| cache duplicava download | rajada de 10 tiros = 10 fetch + 10 decode | **ESP9** |

Detalhes medidos:

- **PRV8** — formato não é prova. Um hash bem formado e inventado passa na PRV1 e morre na
  PRV8, que recalcula o sha-256 do arquivo em `origemNoPack`. Em clone limpo declara **NÃO
  MEDIDA** em vez de fingir. E separa duas ausências que pareciam uma: staging inteiro
  ausente é não medido; staging presente com o arquivo apontado ausente é `origemNoPack`
  errado, e reprova.
- **CAP4 pegou a própria sonda.** A primeira versão gravava só `new Audio()`, e como
  `ak.shot` agora toca por WebAudio ela mediu `nenhum` para tudo — o que bateria com um
  ledger todo `nenhum` e ficaria verde pelos dois lados errados. A cláusula irmã existe
  exatamente para isso.
- **ESP9** — `_shotBuf.set(url, undefined)` era sentinela que não sentinelava: `.get()`
  devolve `undefined` para chave ausente também. 10 fetch e 10 decode viraram 1 e 1.
- **INV6–INV8** — `medicao` por arquivo (`ok · falhou · ausente · pulado`), `falhas` no topo
  e exit 1. Inventário real regerado: 900 arquivos, 900 `ok/ok`, 0 falhas, com os sha-256 e
  os valores de pico/loudness idênticos aos de antes.

## Os cinco bloqueadores da 1ª revisão — fechados na 2ª rodada

Cada um com teste vermelho antes do conserto. Dois deles eram defeitos **nas minhas
próprias réguas da rodada anterior**, e é isso que o corolário do `AGENTS.md` prevê: quem
constrói não dá a nota.

### ALC2 era falso-verde — a régua tinha dentro o defeito que ela caça

A régua engolia o código de saída do empacotador com um `catch {}` e um comentário que
racionalizava a escolha. Medido com `--verboso`: **o empacotador quebrava com `ENOENT` em
`menu-music` em TODA execução**, nunca gerava o zip, e a ALC2 declarava verde — ela lia o
`pack/manifest.json` que o builder escreve *antes* de morrer. O "ALC2 verde" do commit
`fd4481ef` nunca mediu um build inteiro. Lição 5, escrita por mim, dentro da régua da
lição 5. Conserto: cláusula ALC3 (código de saída 0 **e** zip existe), fixture com
`menu-music/`, e o builder diz o que falta em vez de cuspir stack. Mutação:
`--mutante=sem-menu-music`.

### PRV5 era letra morta — filtrava por prefixo que o empacotador apaga

A cláusula filtrava folhas do manifest por `audio/piloto/`, e o empacotador reescreve todo
caminho para `audio/a/<sha1>`. Medido rodando o empacotador real: no manifest que o jogador
recebe, o filtro casa **zero**. Cláusula estruturalmente incapaz de ver o defeito que ela
nomeia — lição 1. Conserto: casa por **sha-256**, que é o que sobrevive ao rename. Provado
com um derivado Fab instalado como `audio/a/b1b3d9230e48b0a1.wav`: acende e ainda mapeia o
nome hasheado de volta para a entrada do ledger.

### O fallback nunca chegava ao synth

`_shotSample` devolvia `true` mesmo depois de gravar a falha de fetch/decode, então
`shotWeapon` retornava antes do synth e o jogo repetia `new Audio()` numa URL que acabou de
dar 404 — silêncio a cada tiro, para sempre. Conserto: as duas saídas sem buffer devolvem
`false`. Cláusula ESP8, com o limiar **medido** (o mesmo tiro pelo synth puro é o controle):

| | 1ª chamada | 2ª chamada | HTMLAudio |
|---|---|---|---|
| antes | 0 disparos | 0 | 1, numa URL morta |
| depois | 11 | 11 | 0 |
| controle (synth puro) | 11 | — | — |

### O ledger não controlava nada

`decisao` e `aprovacao` estavam declarados e ninguém lia. Com `weaponSamples: true` o
runtime sorteia por `_pick(pack.weapons[w])` e toca qualquer caminho que esteja lá.
Conserto: o gerador poda dos curados todo caminho cujo sha-256 case derivado não aprovado,
ou cujo evento esteja em `synth` — e **relata** o que barrou. PRV7 monta três derivados do
mesmo evento (aprovado, pendente, rejeitado) com `weaponSamples: true`: antes saíam os 3,
depois sobra 1. Cláusula irmã junto — se o aprovado também sumisse, reprova.

### P0: o empacotador aceitava derivado que não pode ser redistribuído

Ver o bloqueio 1. PRV6 é a régua end-to-end com o builder real, e traz a irmã: sem o
derivado Fab, o mesmo empacotador tem que **aceitar** — senão um builder que recusasse tudo
passaria sem proteger nada.

## Shortlist do pacote — o que ele tem e o que ele não tem

Gerada por `npm run audio:shortlist`, só de metadado, com 14 arquivos barrados pelo veto de
gore (sangue, osso, grito).

| Evento | Candidatos | Famílias |
|---|---|---|
| `ak.shot` | 43 | `Gunshot_1` … `Gunshot_8` |
| `ak.shot.distante` | 16 | `Gunshot_Distant_1/2/3` |
| `ak.magOut` | 6 | `Unload_1` |
| `ak.magIn` | 9 | `Insert_Ammo_1`, `Loading_Ammo_1` |
| `passo.concreto` | 24 | `Concrete_Walk_1`, `Concrete_Run_1` |
| `morte.corpo` | 4 | `Body_Falling_1/2` |
| `ak.bolt` | **sem candidato** | — |
| `impacto.concreto` | **sem candidato** | — |
| `impacto.metal` | **sem candidato** | — |

**Nenhum arquivo do pacote identifica a arma.** Os 43 candidatos de tiro são "gunshot"
genéricos em 8 famílias numeradas; qual soa como AK é pergunta para o ouvido, não para o
nome. É por isso que a shortlist preserva o número da família — colapsar `Gunshot_3-5` em
`Gunshot` apagaria exatamente a comparação que decide.

**Os três sem candidato têm motivo, e não foram forçados.** O pacote de combate é corpo a
corpo e medieval — arco, flecha, escudo, estocada — e **não tem impacto de projétil em
superfície**: `Hit_Generic` é pancada de luta, não bala em parede. E o ferrolho que existe
é de revólver (`Hammer_Back`, `Spinning_Cylinder`), bombeada (`Pumping`) e alavanca
(`Loading_Gate`), não de fuzil. Forçar um casamento aqui seria inventar procedência sonora
— o mesmo erro do contrato de licença, com outra roupa.

Achado útil de graça: as 3 famílias `Gunshot_Distant_` são matéria-prima pronta para o
bloqueio 2 (lei de distância), por camada em vez de curva inventada.

## Seleção reversível e o fallback

`derivados` está **vazio** e os 8 eventos do piloto estão em `decisao: "synth"`. Esse é o
estado correto **mesmo com o pacote já baixado** — ele foi baixado, inventariado e
catalogado em 04/09, com 900 WAVs em staging privado. Desde a sétima rodada, a fonte da AK
foi ouvida e aprovada para o laboratório local; o que falta é criar uma arquitetura e um
asset de release permitido, então aprovar esse derivado no jogo. Escuta da fonte não cria
derivado automaticamente.

O A/B é uma palavra no ledger: `synth` ↔ `derivado` por evento. No runtime, o interruptor
que já existia continua valendo — `weaponSamples` no manifest liga o caminho por sample, e
sem ele (ou para arma fora de `weapons`) o synth toca. ESP6 é a régua que impede o fallback
de morrer calado.

## Portões: baseline herdado × regressão nova

Baseline medido nesta árvore **antes** de qualquer alteração:

```
npm run check:fast   ->  69/70 passaram (91,5 s)
                         falhou: audio:check
```

`audio:check` é vermelho **por ambiente, não por regressão**: `public/audio/` é gitignored e
esta worktree nunca rodou `fetch-audio.sh`, então o gerador vê 0 arquivos no disco e acusa
"manifest DEFASADO". `assert:assets` reprova pelo mesmo motivo, mais os 196 decalques do
acervo. Nenhum dos dois é medível aqui sem baixar os pacotes, o que está fora do escopo
desta rodada.

Depois das alterações, com os 4 passos novos no `check:fast`:

```
npm run check:fast   ->  73/74 passaram (107,6 s)   [1ª rodada]
                         falhou: audio:check

npm run check:fast   ->  74/75 passaram ( 92,7 s)   [2ª rodada]
                         falhou: audio:check

npm run check:fast   ->  75/76 passaram ( 92,4 s)   [3ª rodada]
                         falhou: audio:check

npm run check:fast   ->  75/76 passaram ( 92,4 s)   [4ª rodada]
                         falhou: audio:check

npm run check:fast   ->  75/76 passaram ( 92,6 s)   [5ª rodada]
                         falhou: audio:check
```

**`audio:check` NÃO é verde e não vai ser chamado de verde.** Ele é o vermelho herdado
desde o baseline, e o motivo é ambiente, não regressão: `public/audio/` é gitignored e
`fetch-audio.sh` nunca rodou nesta worktree, então o gerador vê 0 arquivos no disco e acusa
"manifest DEFASADO". `assert:assets` reprova pelo mesmo motivo. Nenhum dos dois é medível
aqui sem baixar o pacote público de áudio do jogo, o que está fora do escopo desta lane.

**Nenhuma regressão nova em nenhuma das três.** Os 6 passos acrescentados no total
(`eval:audioalcance`, `eval:audioespacial`, `eval:audioproc`, `eval:audiocapacidade`,
`audio:inventario:autoteste`, `audio:shortlist:autoteste`) entram verdes, os 69 do baseline
continuam passando, e o único vermelho é sempre o mesmo, pelo mesmo motivo de ambiente.
`docs:check` e `arch:check` verdes com os blocos regerados.

As onze mutações das quatro réguas foram rodadas contra o código já verde na 4ª rodada e
**todas saem 1**:
ALC `nome-trocado|sem-copia|sem-menu-music`, ESP `sem-pan|sem-propagacao|duck-fixo`,
PRV `aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao`,
CAP `declara-errado|aprova-sem-caminho`.

Fora dos mutantes nomeados, as rodadas mediram ainda: ESP9 com a guarda revertida (10 fetch
e 10 decode), PRV8 nos quatro estados de `sha256Fonte`, PRV9 nas quatro formas de furar o
catálogo do legado, INV6–INV8 com um WAV ilegível, e — na 4ª rodada — a **mutação viva da
política**, devolvendo a semântica de denylist em `tools/audio/politica.mjs`, que acende
PRV10a e PRV11 juntas.

A reprodução manual do escape original, contra o código consertado, sai **1 sem gerar
zip**, com o diagnóstico `NÃO CATALOGADO: nenhum derivado do ledger tem o sha-256 638b216e…`.

## Resultados aceitos e rejeitados

Aceito:

- começar por um piloto pequeno, comparável e reversível;
- manter fallback synth para todo evento ainda não aprovado;
- guardar fontes em staging privado fora do repositório;
- usar análise determinística local (`ffprobe`, waveform, loudness e duração), sem enviar os
  WAVs ao Claude;
- corrigir os dois defeitos de pipeline **antes** de o pacote entrar, com régua vermelha
  commitada antes de cada conserto.

Rejeitado:

- trocar todas as armas e eventos de uma vez;
- publicar os arquivos fonte ou o pacote bruto;
- reutilizar referências de Valve/CS, Sounddogs ou captura de YouTube;
- declarar sucesso só porque manifesto e testes passam, sem escuta no jogo real;
- **inventar a lei de volume por distância do sample** — ver o bloqueio 2 abaixo.

## Limitações desta rodada

- **Há uma decisão humana, e só uma:** Ruben aprovou `Gunshot_1-1.wav` como candidato fonte
  da AK no laboratório local. Todas as demais escolhas continuam pendentes. As réguas
  provam alcance, espacialização, procedência, recusa de redistribuição e determinismo —
  **nenhuma delas ouve nada**.
- **Nenhum byte de áudio entrou no modelo.** O que foi lido foi `catalog.json` e
  `inventory.json` — nome, hash, duração, canais, taxa, pico, loudness. A listagem diz
  `Allows usage with AI: No` e isso foi respeitado.
- **O caminho por sample rodou no navegador local e a AK foi ouvida**, mas os demais takes,
  a latência sob carga e a mistura de uma partida cheia ainda não tiveram aprovação humana.
- **A página A/B não é o registro autoritativo da aprovação da AK:** a decisão ocorreu no
  jogo real local e foi fixada no ledger por caminho e sha-256.
- **`audio:check` e `assert:assets` seguem vermelhos nesta worktree**, por ausência de
  insumo (`public/audio/` é gitignored e o `fetch-audio.sh` nunca rodou aqui).
- **O pacote publicado é anterior à regra `ambiente`**, e agora também é anterior à trava de
  redistribuição. Regerar o pack é obrigatório antes de qualquer deploy.

## Bloqueios

### 1. Como o derivado Fab chega ao jogador — P0, ABERTO

**Este é o bloqueio que trava o piloto.** O `audio-pack.zip` é publicado como asset de
release (`fetch-audio.sh` aponta para `audio-pack-v8`) e é um arquivo **só de áudio**:
qualquer pessoa baixa um pacote de sons navegável, sem o jogo. É literalmente a forma que a
Fab Standard License proíbe — `redistribuicao: proibida-standalone`. **Nome hasheado não
resolve**: o que é redistribuído é o conteúdo, não o nome.

O que está feito é a **proibição**, em três camadas e **fail-closed desde a 4ª rodada**
(até ela, era fail-open — ver o escape P0 acima):

| Camada | Onde | O que faz |
|---|---|---|
| autoria | `tools/gen-audio-manifest.mjs` | não deixa entrar no manifest local |
| **decisiva** | `scripts/build-audio-pack.mjs` | recusa e sai 1 **antes** de o zip existir |
| 2ª linha | `tools/eval/assets-check.mjs` | reprova o pacote instalado |

As três chamam `tools/audio/politica.mjs`, a mesma função — não três cópias da decisão.

**O que NÃO está decidido, e não foi inventado:** como o derivado chega ao jogador sem ser
redistribuído como pacote separado. As opções — servir individualmente a partir do build,
zip privado fora de release pública, ou não usar Fab e ficar no synth/fonte livre — têm
implicações jurídicas que não são minhas para escolher. Estão escritas em
[`PROVENIENCIA.md`](PROVENIENCIA.md). **Decisão do dono.**

### 2. Lei de volume por distância do sample — exige ouvido

O caminho por sample honra pan, propagação e duck; **não** honra atenuação de nível por
distância. O synth não atenua nível, troca timbre, e o chamador manda `vol` fixo em `0.45`
para bot de qualquer distância. Um sample é plano e não tem esse mecanismo.

Novidade desta rodada: **o pacote tem 16 arquivos `Gunshot_Distant_` em 3 famílias**, que é
matéria-prima pronta para resolver isto por camada em vez de por curva inventada. Continua
sendo decisão de ouvido — teto sem procedência é opinião (lei 2 do `AGENTS.md`).

### 3. Rajada com `BufferSource` — exige navegador

Em full-auto, 8 bots podem disparar ~50 tiros/s (`game.js:6329`). Cada um cria
`BufferSource + gain + panner`. O synth já criava mais nós que isso por tiro, então o custo
tende a cair — mas isso é raciocínio, não medição.

### 4. Três eventos do piloto sem candidato no pacote

`ak.bolt`, `impacto.concreto` e `impacto.metal` não têm som semanticamente bom no Action
Game Sounds Pack. Não foram forçados. Ou saem do piloto, ou saem de outra fonte, ou ficam
no synth. **Decisão do dono.**

### 5. Cinco dos oito eventos ainda não têm caminho de runtime específico

Medido por sonda causal (`npm run eval:audiocapacidade`), `ak.shot`, `passo.concreto` e
`morte.corpo` têm caminho específico. `reloadStart()`, `reloadEnd()` e `bolt()` ainda não
recebem arma; `ricochet()` ainda não consulta o pack.

Passos agora leem `footstepsBySurface[surface]` e morte lê `cs.death`; CAP4b varia concreto
contra metal e CAP5 mantém a allowlist alinhada com `arma|superficie|evento`. CAP3 continua
impedindo derivado para caminhos `global|nenhum`.

Para fechar o restante: implementar `weaponFoley.<arma>.<magOut|magIn|bolt>` e depois
impactos por material. O som de passo já está separado por superfície, mas a superfície
seca ainda é uma aproximação dominante por mapa.

### 6. Legado CS/Valve/UT ainda no manifest de exemplo — NOVO

45 de 62 caminhos do `public/audio/manifest.example.json` versionado têm nome de Valve ou
Epic. **Esta lane não substituiu nenhum deles.** Estão catalogados como
`bloqueado-por-procedencia-desconhecida`, com a fonte marcada `redistribuicao: "proibida"`,
e a PRV9 impede declarar que foram resolvidos ou que a PRV5 os cobre — ela não cobre, por
falta de hash em clone limpo.

Substituir isso é outra frente, do tamanho do piloto inteiro. **Decisão do dono.**

## Próximo passo concreto

1. ~~mapear o caminho real de áudio e registrar o baseline~~ **feito**;
2. ~~fechar o alcance do empacotamento~~ **feito**;
3. ~~fechar a espacialização do tiro por sample~~ **feito**;
4. ~~contrato de procedência e ferramenta de inventário~~ **feito**;
5. ~~baixar o pacote~~ **feito pelo dono** — 900/900 WAVs, PCM estéreo 44,1 kHz/16 bits,
   2022 s no total, em staging privado fora do Git;
6. ~~fechar os cinco bloqueadores da revisão independente~~ **feito** (ver a tabela de
   commits);
7. ~~shortlist por metadado e página de escuta A/B~~ **feito**;
8. **[bloqueado — decisão do dono]** escolher a forma de incorporação do bloqueio 1. Nada
   de Fab pode entrar numa build antes disso, e a trava garante que não entre;
9. **[para o Ruben, de manhã]** abrir a escuta A/B e decidir:

   ```bash
   npm run audio:ab -- /Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack --por=ruben
   ```

   A AK já foi escolhida. Agora vale escutar as outras 24 armas, passos, morte, frag e os
   três estados de round dentro do jogo. Aprovação continua individual por take/evento;
10. decidir os bloqueios 1 (canal), 5 (foley por arma e impactos) e 6 (legado). Os
    três são decisões de arquitetura ou jurídicas, não de execução;
11. só depois escrever as entradas de `derivados` no ledger, com os dois hashes e
    `escutaAB` preenchido — PRV2 reprova `aprovado` sem escuta, PRV8 confere o
    `sha256Fonte` contra o arquivo real e CAP3 barra evento sem caminho;
12. regerar o pack e rodar `assert:assets` contra ele;
13. ~~limitar caudas de rajada~~ **feito por ESP10**; ainda medir mistura e custo numa
    partida cheia no navegador antes de considerar o arsenal aprovado.

## Comandos de validação

```bash
npm run eval:audioalcance      # ALC1-ALC3  pipeline alcança o que o código nomeia
npm run eval:audioespacial     # ESP1-ESP10 pan, propagação, duck, fallback, volume, rajada
npm run eval:audioproc         # PRV1-PRV13 ledger, redistribuição, fail-closed nas 3 camadas
npm run eval:audiocapacidade   # CAP1-CAP5  só se aprova o que o runtime sabe tocar
npm run audio:inventario:autoteste
npm run audio:shortlist:autoteste
npm run check:fast             # os seis acima entram aqui
npm run assert:assets          # PRV5 + ambiente contra o pacote instalado (precisa do pack)
```

Mutações que provam que cada uma morde:

```bash
node tools/eval/audio-alcance-check.mjs --mutante=nome-trocado|sem-copia|sem-menu-music
node tools/eval/audio-espacial-check.mjs --mutante=sem-pan|sem-propagacao|duck-fixo
node tools/eval/audio-proveniencia-check.mjs --mutante=aprovado-sem-escuta|derivado-sem-fonte|evento-sem-decisao
node tools/eval/audio-capacidade-check.mjs --mutante=declara-errado|aprova-sem-caminho
```

## Estado privado e hashes

Fora do Git, ignorado por `.gitignore` (`private-assets/`):

```
/Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack/
  extracted-wav/catalog.json   sha256 51de2264a7c764053bda638d0eb40a852d2eb9942a54de0f3840c60a8b2dbea1
  inventory.json               sha256 abc2e6df2289159f2e8c648b913147d3b9006c791836cf5bbff93ccfdd533289
                               (mudou na 3ª rodada: campo `medicao` por arquivo;
                                os sha-256 e os níveis por arquivo são idênticos)
  shortlist-piloto.json        gerado por `npm run audio:shortlist`
  decisoes-escuta.jsonl        criado pela página A/B (não existe até alguém escutar)
```

Os dois primeiros hashes foram conferidos nesta rodada e batem com o estado declarado.
900 WAVs, PCM estéreo 44,1 kHz/16 bits, 2022 s. Categorias: Combat 146, Doors 50,
Environment 103, Explosions 70, Footstep 168, Guns 127, Human_Vocalizations 66,
Interface 92, Misc 78.
