# Tribos Urbanas — 3º grupo de personagens (status)

Grupo novo de personagens urbanos (via Mint), pedido pelo dono. Integrados como **team `'U'`**
em `characters.js` (invisível aos filtros P/B — bots políticos NÃO os pegam) e **selecionáveis
em qualquer lado** via `tribe:'urbanas'` (`main.js` char-select). Modelos GLB riggados do Mint,
otimizados textura-only e com clips retargetados por-char.

## Pipeline por personagem (todos os passos)
1. Gerar no Mint (`start_model_generation` / `start_asset_pack_generation`, riggable T-pose).
2. Riggar (`animate_generated_model`, set `basic_locomotion`) → esqueleto Meshy (24 ossos, bate com o rig existente; faltam só `Curl_L/R` de dedos, que já não são usados).
3. Baixar o `rigged_character_glb` → `/tmp/tribos_raw/<id>.glb`.
4. Otimizar textura-only: `node tools/optimize-tribos.mjs` (resize 1024 + webp, dropa anim embutida; NUNCA quantize/simplify). Saída em `public/models/characters/<id>.glb` (~410-650 KB).
5. Retarget por-char dos clips compartilhados: `node tools/retarget-glb.mjs public/models/anims/mixamo public/models/characters/<id>.glb public/models/anims/<id>` (gera 11 clips, corrige drift, elimina 404).
6. Wire: `characters.js` (entry team `'U'`) + `glbchars.js` `GLB_CHARS`.

## Status
| char | gerado | riggado | baixado | otimizado | retarget | wired | asset id (Mint) |
|------|:--:|:--:|:--:|:--:|:--:|:--:|-----------------|
| emo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | pack th74knpfq5zje954vwz8wyrgb58bbjxs |
| blackmetal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | (mesmo pack) |
| metaleiro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | (mesmo pack) |
| punk | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | (mesmo pack) |
| skatista | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | (mesmo pack) |
| clubber | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | (mesmo pack) |
| rapper | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | (mesmo pack) |
| reggae (negro, corrigido) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ks7c2wg068tt0r269tp8zm5t1x8bbwrw |
| funkeiro v5 (Quiksilver+tattoos+Oakley) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ks7ayqvrfdn4pqp2q7mftym4td8badmq |

**9/9 jogáveis agora** (`?char=<id>` ou pela seleção). Testado headless: emo, reggae e funkeiro
carregam, animam e 0 erros. Todos com 24 ossos (compatível com os clips compartilhados).

## Como testar
- URL: `http://localhost:8123/?auto=P,punk` (ou emo/blackmetal/metaleiro/skatista/clubber/rapper).
- Na UI: escolher lado → os Tribos aparecem no fim da lista de personagens (qualquer lado).

## 3º TIME no fluxo principal (FEITO — v1.27.0)
Tribos Urbanas é uma **3ª opção de time** no team-select (`btn-team-u`, sem `?=`). Modelo:
o **LADO físico** (P/B) dirige tudo (spawns/placar/killfeed/CTF/cores) e a **FACÇÃO** (`playerFaction`
P/B/**U**) só decide o roster do jogador. Escolher Tribos → você joga como Tribo, time todo Tribos,
no lado P vs **Bolsonaristas** (lado B). Petista/Bolsonarista voltaram a listar SÓ os políticos
(desfeito o hack que misturava os Tribos nas duas listas — era o "faltando na outra lista").
Verificado headless: punk → aliados emo/blackmetal/metaleiro, inimigos Bolsonaristas, 0 erros.
Arquivos: `index.astro` (card+CSS `.team-u`), `main.js` (`pickTeam`/`startGame` por facção),
`game.js` (`playerFaction`, filtro de aliados).

## Follow-ups (menores)
- **Matchup**: hoje Tribo joga sempre vs Bolsonarista (lado B). Se quiser Tribo-vs-Petista ou
  escolher o oponente, é um seletor a mais (fácil).
- **Nome do time no HUD**: não há label textual de time em partida (usa cores/placar), então não
  mostra "Petistas" errado; se um dia adicionar label, passar o nome da facção.
- Revisar visualmente os 9 no browser (geração texto→3D; pode querer revise/regen de algum).

Ref: [[csbrasil-character-pipeline]], [[csbrasil-per-char-retarget]], [[csbrasil-meshy-rig-no-fingers]].
