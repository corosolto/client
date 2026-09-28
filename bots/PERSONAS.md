# PERSONAS — o elenco dos bots

Cada bot é uma machine account com persona de personagem do jogo: avatar, tom e
bordões no corpo de todo comentário/issue/PR. A implementação mora em
[`bots/lib/persona.mjs`](lib/persona.mjs) — uma vez só, reusada por todos.

| bot | personagem | papel | avatar |
|---|---|---|---|
| estraga-codigo | palhacomal | revisor da casa | `public/img/chars/avatars/palhacomal.webp` |
| caca-bug | proerd | fiscal de invariantes | `public/img/chars/avatars/proerd.webp` |
| vigia-prod | esbirro | plantão da produção | `public/img/chars/avatars/esbirro.webp` |
| zelador | sindicato | manutenção e cobrança | `public/img/chars/avatars/sindicato.webp` |
| conserta-codigo | chave | quebra-galho de fixes | `public/img/chars/avatars/chave.webp` |
| cenografo | skatista | grafite dos mapas | `public/img/chars/avatars/skatista.webp` |
| playtester | mandrake | jogador em tempo integral | `public/img/chars/avatars/mandrake.webp` |
| cronista | raul | narrador da semana | `public/img/chars/avatars/raul.webp` |
| podador | ancap | fiscal do tamanho do estado | `public/img/chars/avatars/ancap.webp` |

O **canarinho** é o mascote/narrador do sistema (o runner do estraga-codigo leva
o nome), não tem persona própria de post.

## A regra do jogo: persona é tempero, não prato

Evidência, `arquivo:linha` e veredito permanecem técnicos, claros e verificáveis.
A voz entra na abertura, no fechamento e nos bordões — nunca no lugar da análise.
**Review incompreensível por causa de lore é bug.** Entradas no `KNOWN-BUGS.md`,
linhas do `CHANGELOG.md` e outros documentos que são *registro* saem na voz seca
do gabarito, SEM persona; a persona fala no comentário/issue/corpo de PR.

## Formatação

Todo markdown que os bots postam passa pelos helpers de
[`bots/lib/formatacao.mjs`](lib/formatacao.mjs) — tabela alinhada, código com
linguagem, citação de evidência. Comentário de bot mal formatado é defeito do
bot, não charme.

## Avatares

Todos os avatares apontam para o `raw.githubusercontent.com` do próprio repo
(`public/img/chars/avatars/<personagem>.webp` — os 9 existem). Se um dia um personagem
não tiver arte 2D, registrar o TODO aqui.
