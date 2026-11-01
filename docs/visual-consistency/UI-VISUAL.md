# UI visual — seleção de lado/personagem e carteira TRETA$

Escopo: modal `hub-roster` (lado/personagem/skins/escalação) e a carteira `T$` do hub.
Fonte dos defeitos: `audits/2026-10-31-visual-consistency/CRITICO-UI-VISUAL-R1.md`.

## Decisões

- **Camada EN dos writes dinâmicos.** O dicionário (`public/js/i18n.js`) cobre o
  estático via `translateDom`; todo texto escrito depois do boot usa `tr()` para
  rótulos exatos e `frase()` para templates (o mecanismo existente do framework).
  R2 cobriu: linha de escalação, "Selecionado:", títulos do chip ＋, erros de
  skin/equip e a carteira guest `T$ · ENTRAR` nos DOIS produtores
  (`treta-rewards.js` e `treta-store.js`).
- **Categorias.** `FACTION_NAME` usa `PALHACOS`/`MITICOS` sem cedilha; o dicionário
  tem as chaves canônicas `PALHAÇOS`/`MÍTICO`. Corrigido com chaves-alias exatas em
  vez de alterar `FACTION_NAME` (IDs/lados/facções intocados). Nomes de grupos
  mantidos como identidade (FUNKEIROS, NERDOLAS, NOIAS, TV) — decisão do próprio
  dicionário; nomes próprios de personagens nunca traduzem.
- **Chip ＋ (coarse/landscape).** Pintura de28×28 e alvo invisível44×44. A
  borda real de1px deixa padding-box26×26; `::after inset:-9px` produz44×44.
  Top/right8px mantêm esse halo dentro da célula e da área de scroll, inclusive
  na primeira linha. Desktop mantém top/right6px e halo do botão. Rótulos
  escalados mais largos preservam seu tamanho natural; aria-pressed e foco
  permanecem no botão. Root mediu RED anterior42×41 por hit-test real em844×390
  coarse (JSON ui-pin-R2-RED); R7 confirma44×44/45×44 por hit-test.
- **Erro de carteira autenticada.** O estado dinâmico visível usa
  `tr('T$ · ERRO')`, gerando `T$ · ERROR` emEN e mantendoPT. Guest, loading, saldo
  e aria-labels preservados.

## Régua visual (U1–U4, de `METRICA.md`)

| Estado | U1 hierarquia | U2 legibilidade | U3 coerência | U4 estabilidade |
|---|---:|---:|---:|---|
| R1 (antes) | 2 | 2 | 1 | UNKNOWN |
| R3 (Ego PT/EN desktop e landscape coarse) | 2 | 2 | 2 | UNKNOWN global |

R7 guarda8capturas reais e `ui-visual-R7.json` no audit de31/10. Em844×390,
toque CDP nativo no halo (`pointerType=touch`, `isTrusted=true`) escalou e
desescalou o mesmo personagem, restaurando a escalação. Desktop1320×880
preserva hierarquia; categorias CLOWNS/MYTHIC e título dinâmico estão emEN.

Retrato390×844 coarse mostra o aviso para girar. É a política preexistente
explícita em `public/css/tp/lobby.css`: JOGAR emv3 pede paisagem, enquanto
loja/comunidade funcionam em pé. O modal atrás desse aviso não foi declarado
usável em retrato; as capturas antigas semcoarse não provam esse caso.
Nenhum fluxo de orientação foi alterado nesta revisão visual.

U4 medido em844×390 PT: antes/depois de escalar e desescalar Barbudo por toque
nativo, as5células, scrollTop e caixa do diálogo ficaram exatamente iguais.
`ui-U4-native-temporal.json` e3capturas registram o recorte. Isso não mede
animação da prévia3D nem estabilidade de todos os estados de erro/autenticação;
por isso não encerra a dimensão U4 global.
