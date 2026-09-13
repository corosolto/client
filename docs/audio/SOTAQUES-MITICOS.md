# SOTAQUES — dossiê fonético para o Voice Design dos Míticos

Seis personagens reprovaram no casting da Voice Library ("sotaque ou expressões
nada a ver"). Direção do dono: pesquisar os sotaques certos e **reproduzir do
zero** no Voice Design da ElevenLabs (text-to-voice), não usar voz pronta.

**REGRA DURA:** esta pesquisa vira DESCRIÇÃO DE VOZ em texto — nunca amostra de
áudio para clonar. Proibido voice-cloning de qualquer gravação de pessoa real.

Cada seção: traços fonéticos/prosódicos → como isso entra na `voice_description`
(inglês) do `POST /v1/text-to-voice/create-previews`. Amostra falada (`text`) é
sempre fala do próprio personagem, PT-BR, ~120 caracteres.

---

## Lampião e Maria Bonita — sertão nordestino (cariri)

Traços (fontes abaixo):
- **T/D duros, sem palatalização**: "tia"/"dia" com /t/ e /d/ plenos, nunca
  "tchia/djia" — conservadorismo dos falares do interior de PE/CE (Ciberdúvidas).
- **Vogais pretônicas abertas**: e/o pretônicos como [ɛ]/[ɔ] ("pórta",
  "mélodia") — padrão Norte/Nordeste documentado pelo ALiB.
- **Melodia que sobe e desce** na frase; no sertão (vs. capital) a fala é mais
  seca e cortada — pro Lampião, ritmo **staccato de comando** de bando; pra
  Maria Bonita, a mesma fonética com entrega calma e afiada.
- Textura: voz **seca, rachada de sol** (ele); **grave feminina com aço** (ela).

Fontes: [Ciberdúvidas — consoantes t e d no Nordeste](https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/sobre-as-consoantes-t-e-d-no-nordeste-do-brasil/28747) ·
[Ciberdúvidas — pronúncia do Nordeste](https://ciberduvidas.iscte-iul.pt/consultorio/perguntas/a-pronuncia-dos-habitantes-do-nordeste-do-brasil/32275) ·
[ALiB — vogais pretônicas no falar nordestino](https://alib.ufba.br/sites/alib.ufba.br/files/maria_do_socorro_silva_de_aragao_pegar_pdf.pdf) ·
[Wikipédia — dialeto nordestino](https://pt.wikipedia.org/wiki/Dialeto_nordestino)

## Curupira e Boto — Norte amazônico (paraense)

Traços:
- **"S" final chiado** e linear ("péx", "pessoax"), sem o /i/ de apoio carioca
  — marca número um do falar paraense.
- **ti/di palatalizados** ("thi/dhi") e **"nh" puxado** ("juNHio").
- **"Tu" conjugado** ("tu foste", "tu tá") — herança portuguesa viva no Pará.
- **Melodia cantada e nasal**, garganta mais funda, influência indígena.
- Curupira: tudo isso em voz de **moleque selvagem**, rápido e provocador.
  Boto: em voz **aveludada e grave de galã ribeirinho**, lenta e convencida.

Fontes: [O Liberal — "chia absurdamente"](https://www.oliberal.com/cultura/jovem-viraliza-ao-explicar-o-sotaque-paraense-chia-absurdamente-1.838293) ·
[Babbel — o falar paraense](https://pt.babbel.com/pt/magazine/o-falar-paraense-a-mistura-entre-a-lingua-portuguesa-e-linguas-indigenas) ·
[DOL — a origem do "égua"](https://dol.com.br/especiais/872128/a-origem-do-egua-e-outras-curiosidades-do-sotaque-paraense) ·
[Parawebnews — o "nh" puxado](https://parawebnews.com/som-do-nh-puxado-no-sotaque-paraense-viraliza-nas-redes-sociais-junhio-veja-video/)

## Cuca — bruxa idosa (textura > região; fundo interior mineiro)

Traços:
- Não é sotaque regional forte: é **idade + textura**. Na tradição do Sítio
  (Lobato/TV) a Cuca é "velha bruxa de **voz rouca**", "voz horripilante".
- Voz **rachada, chiada, arrastada**, respiração audível; cadência de **ninar
  sinistro** (a lenda vem da canção "dorme neném, que a Cuca vem pegar").
- Fundo leve de **interior mineiro**: fala vagarosa, vogais alongadas, "mansa"
  antes do bote.

Fontes: [Wikipédia — Cuca (personagem)](https://pt.wikipedia.org/wiki/Cuca_(personagem)) ·
[Toda Matéria — lenda da Cuca](https://www.todamateria.com.br/lenda-da-cuca/) ·
[Xapuri — a lenda da Cuca](https://xapuri.info/a-lenda-da-malvada-da-cuca/)

## Lobisomem — interior caipira

Traços:
- **R retroflexo** ("imporrrta", "porrrteira") — marca do dialeto caipira
  (interior de SP, sul de MG, GO, MS, norte do PR); origem na Língua Geral
  Paulista de base tupi.
- Fala **branda, vagarosa, arrastada**, com alongamento das pretônicas;
  "lh" vira "i" ("muié", "trabaio") — usar com moderação (PEGI12, legibilidade).
- No personagem: essa lentidão caipira em **registro grave, gutural, com
  rosnado no fundo** — o caboclo manso que vira bicho.

Fontes: [Istoé Dinheiro — origem do R caipira](https://istoedinheiro.com.br/qual-a-origem-do-r-caipira) ·
[Mais Goiás — R retroflexo](https://www.maisgoias.com.br/brasil/sotaque-goiano-entenda-a-origem-do-r-caipira-tambem-chamado-de-retroflexo/) ·
[Filologia.org — o chamado dialeto caipira](http://www.filologia.org.br/vcnlf/anais%20v/civ6_12.htm)

---

Gerador de previews: `tools/gerar-previews-vozes-miticos.mjs` (2 rodadas × ~3
previews por personagem; o dono escolhe no ouvido antes do
`create-voice-from-preview`). Página de audição sai do próprio script.
