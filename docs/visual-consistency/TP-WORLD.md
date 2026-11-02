# TP-WORLD — unidades de mundo no IK e proxy de cabeça final

Régua: `node tools/eval/tp-world-contract-check.mjs` (node puro, sobe os GLB reais).
Origem: diagnóstico independente de 31/10 (`audits/2026-10-31-visual-consistency/
CRITICO-3P-ALCANCE-DIAGNOSTICO.md`). Detalhe dos números e mutantes: cabeçalho do
próprio script.

## 1 · Palma do alcance do CCD em MUNDO (`public/js/handik.js`)

O solver media os segmentos do braço com `getWorldPosition` (metros em mundo) mas
somava `endOffset.length()` — LOCAL ao osso — ao raio. Nos rigs reais
(Armature `scale ≈ 0,01`, translações de osso em ~23–27 unidades) a parcela da
palma entrava ~100× maior que sua extensão em mundo e o clamp interno nunca
disparava. Correção: a palma entra como distância MUNDIAL entre
`end.localToWorld(endOffset)` e a origem mundial de `end`, antes do fator 0,98,
sem alocação por quadro.
Invariância exigida (WP1): A em metros com yaw 0 e B como a MESMA cena em
unidades ×100 com ancestral uniforme `scale 0,01` e yaw `0,7` — rig, alvo e
comparação do efetor girados coerentemente. A premissa de equivalência
(palma inicial de B derrotada == palma inicial de A, tol `1e-6 m`) é exigida
ANTES do solve (WP1p). Depois: mesma decisão de clamp, mesmo raio em mundo,
mesmo efetor final; vetor-alvo do caller preservado; alvo alcançável não
recortado. Em rigs reais (WP2), o raio retornado fica na casa do braço em
metros (< 2 m) — mandrake (mão L/2H) e pagodeiro (mão direita/pistola via
`tpMount`).

O pré-clamp `clampAlcanceIK` (95%, glbchars.js:1245/1345/1402/1407) NÃO foi
alterado: a ablação sem-clamp melhorou p99/contagem mas piorou o extremo
(aresta `3742↔3758`), rejeitado. O conserto aqui é só da unidade da parcela da
palma DENTRO do solver.

## 2 · Proxy da hitbox de cabeça sincronizado por ÚLTIMO (`public/js/glbchars.js`)

O sync (`this.head.position ← headBone` em espaço do grupo) rodava antes dos
overlays de tronco (lean/pitch/flinch/recoil/recarga), do emote e do tombo de
morte — todos movem ancestrais do Head depois da cópia, e o proxy (irmão do
modelo no grupo, não herda osso) ficava para trás. `game.js` identifica headshot
por `bot.mesh.parts.head`.

Correção: o bloco foi movido para o FIM de `CharController.update`, depois do
último overlay e com `updateMatrixWorld(true)` — um único sync por quadro, sem
pagar CPU dobrada. Contrato (PS1): em CADA update exercitado de idle, locomoção,
recarga (entrada efetiva reloadK>0.5), emote (_emoteK>0.5) e morte (_deathK>0.3),
a posição mundial do proxy == a posição mundial FINAL do osso Head (< 1e-4 m),
e FINITA em todos os frames do estado: frame com proxy não finito é contado por
estado e reprova sozinho — amostra finita posterior NÃO apaga frame inválido
anterior (máximo finito é conservado separadamente do contador). A decisão é
pelo DESVIO MÁXIMO por update do estado, não só pelo último frame — sync
intermitente (tela a cada 2 updates) é reprovado (idle ~0,4 mm até 8,6 cm na
morte). O fonte antecedente (sync antes da sombra/overlays) reprova na ordem
de 4–12 cm em reload/emote/death; `sync-mudo` reprova nos cinco.

## Mutantes (`--mutante=…`, MESMAS aceitações do nominal)

Toda execução roda o nominal REAL primeiro; mutante só roda com o nominal
verde, e o conjunto de cláusulas vermelhas tem que ser EXATAMENTE o esperado
(vermelho independente a mais — p.ex. regressão de IK junto de `sync-mudo` —
reprova, não "pega").

- `palma-local` — volta a palma a `.length()` local (o antecedente): reprova
  WP1a e WP2 nos dois rigs (raio ~100×, clamp mudo → `null`).
- `sync-antecipado` — devolve o sync para antes dos overlays (o antecedente):
  reprova PS1 em reload/emote/death.
- `nan-primeiro` — NaN por UM único frame após o warm-up do build (o
  `buildCharacterModel` consome 10 updates ~0,33 s antes da medição; o frame
  transitório cai dentro da janela medida): reprova PS1 nos cinco estados
  pelo contador de frames não finitos.
- `nan-sempre` — proxy NaN em todo update: reprova PS1 nos cinco estados;
  garante que aceitador não disfarça estado inválido como erro zero.
- `sync-mudo` — remove o sync: reprova PS1 nos cinco estados.
- `sync-alternado` — físico: sync só em updates pares; morto pelo desvio
  máximo por update, nos cinco estados.

Exits: 0 nominal verde / mutante pego no conjunto exato · 1 nominal vermelho
ou conjunto fora do exato · 2 CLI inválida (duplicada, sufixo, desconhecida,
argumento extra) · 3 infraestrutura, nunca "detectado" — inclusive falha de
import de harness/fonte fora dos try e promessa lançada no orquestrador
(fronteiras de preparação cobertas por catch externo com exit 3).
