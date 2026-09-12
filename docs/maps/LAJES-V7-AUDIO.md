# Lajes V7 — compatibilidade do pacote de áudio

O primeiro build Vercel da PR atualizada reprovou em `ASSETS-CHECK`: o pacote privado
continha overrides para 13 mapas e Lajes era o décimo quarto. Um override parcial
silencia o mapa novo; o gate permaneceu obrigatório.

`tools/audio/lajes-soundscape.mjs` completa apenas a entrada Lajes ausente, usando
uma cópia independente da ambiência externa já instalada de Quebrada. Na fonte
Fab (`tools/audio/fab-game-local.mjs`), ela usa `Wind_Loop_1.wav` e
`Tree_Rustling_1-4.wav`. Caminhos empacotados, volumes e intervalos são preservados.
Nenhum áudio foi criado, comprado, baixado ou publicado por essa adaptação; ela
reutiliza referências existentes e não muda as regras de procedência do pacote.

O helper roda após a extração em `scripts/fetch-audio.sh` e também quando o
instalador encontra um manifesto já instalado. O gerador local Fab usa a mesma
função para que pacotes futuros incluam Lajes desde a origem.

Contratos preservados:

- Uma entrada Lajes existente, inclusive inválida, permanece intacta; o gate decide
  se ela é válida. Não substitui ambiência autorada.
- Pacotes sem overrides mantêm o fluxo legado e o preparo separado do preview público.
- Outros mapas ausentes continuam ausentes e reprovam no gate.
- Sem loops e one-shots válidos de Quebrada, a adaptação falha explicitamente.
  Não introduz hum sintético de produção.
- O helper não altera o manifesto de entrada nem compartilha arrays entre mapas.

Validação: `node tools/eval/lajes-soundscape-check.mjs`, dez contratos; o teste
executa fetch cache/unzip com fixtures locais e o `ASSETS-CHECK` real. O caso
13/14 reprova antes da adaptação, 14/14 passa depois, e Córrego ausente continua
reprovando. Os mutantes `sem-lajes`, `sobrescreve-autorado` e
`clone-compartilhado` reprovam nos contratos esperados.

Também passaram `eval:audioalcance`, `eval:audioespacial`, `eval:audiocapacidade`,
`eval:audioproc`, `eval:audiofablocal` e `eval:assetfetch`. O gate Fab passou a ler
os IDs do catálogo autoritativo, incluindo Lajes. Logs da rodada estão em
`artifacts/lajes-visual/v7/gates/lajes-audio-*.log`.
