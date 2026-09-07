# Encaixe da arma Mint no viewmodel autorado — conserto e réguas (07/09)

Entra aqui o que a coleta do arsenal (`docs/reports/VM-ARSENAL-COLETA-2026-09-07.md`, na
lane `glm/vm-lmg-final`) encontrou quando a retomada da LMG começou pela régua em vez do
conserto. Entrada do defeito: **BUG-76** no `KNOWN-BUGS.md`.

## Três defeitos no mesmo caminho

1. **Pack escondido sem malha para pôr no lugar.** `attachMintWeapon` chamava
   `hidePackGun(entry)` antes de resolver o wrap e saía por `if (!wrap) return null`.
   Como a malha Mint vem do modelo de MUNDO e a partida pré-carrega só as armas que
   sorteou (`weapons.js` `preloadWeapons`), a família ficava **sem arma nenhuma** pelo
   resto da sessão — luva segurando o vazio.
2. **Wrap velho preso na mão.** Trocando para outra arma da MESMA família com o GLB
   ainda ausente, o wrap da arma anterior continuava visível e o pack seguia escondido:
   a mão segurava a arma errada.
3. **Substituição silenciosa pela AWP.** `weaponModel(id)` faz
   `_cache.get(id) || _cache.get('awp')`. Com a AWP carregada e a arma pedida não, o wrap
   saía com o nome certo e a **malha da sniper** — medido: `mint_weapon_m92` com malha
   `sniper_1`, normalizado pelo `cfg.len` da Zastava. É a arma gigante e errada do frame
   `15.51.33` da revisão.

O que amarra os três: nenhum deles lança erro. O jogo continua, o console fica limpo, e
qual arma quebra muda a cada partida — por isso a revisão humana viu "todas as lanes" e a
investigação anterior viu "curva de mão da LMG".

## Conserto

`public/js/vmweapon.js`:

- o pack só sai de cena depois que existe malha Mint desta arma
  (`hasWeapon(weaponId)` obrigatório — sem ele, `weaponModel` devolve a sniper);
- `fallbackParaOPack(entry)` devolve o pack e apaga wrap de outra arma;
- `pedirModeloDeMundo(entry, id)` pede o GLB que faltou e reencaixa quando ele chega,
  porque `attachMintWeapon` só é chamado no equip.

## Réguas

| régua | o que mede | mutantes |
|---|---|---|
| `tools/eval/vm-attach-fallback-check.mjs` (`npm run eval:vm-attach`, no `check:vm`) | com o GLB de mundo bloqueado, a família continua com arma em quadro E sem wrap de outra arma | `escondepack`, `forjawrap` — os dois reprovam; a régua sai 1 se um passar |
| `tools/viewmodels/prep/vm-arsenal-frames.mjs` + `tools/eval/vm-arsenal-check.mjs` | mão em quadro, contato mão↔arma em px, escala aparente por família e fonte (mint/pack), nos dois caminhos e nos dois aspectos | `semarma`, `semmao`, `semcontato`, `escala` |

Pisos e tetos vêm das famílias que mediram bem em 07/09, não de número escolhido:
mão ≥ 100 de ~306 amostras (as boas medem 144–282; as quebradas medem 0), contato ≤ 40 px
(as boas medem 1–32), razão de escala dentro da família ≤ 1,35×.

Exceção declarada: `sniper` e `bolt` escondem o viewmodel no ADS (luneta em tela cheia) —
`awp/ads` mede 0 com ou sem defeito, então a cláusula de "arma não desenha" não vale ali.

## Antes × depois (jogo real, `piscina_treta`, 3:2, 7 capturas por arma)

| arma | arma em quadro ANTES | DEPOIS |
|---|---|---|
| `awp` | 0/0 | 292/302 |
| `shotgun` | 0/0 | 300/302 |
| `revolver38` | 0/0 | 306/306 |
| `m92` diagonal aparente | 857 px (1,55× a `ak`) | pack na malha certa quando o GLB Mint não chegou |

Quality gate: `check:fast` **88/100 com e sem o conserto** — mesma lista de 12 vermelhas
herdadas (`eval:mapid`, `docs:check`, `feet:check`, `eval:camera-grip`,
`eval:char-thumbnail`, `eval:asset-integrity`, `eval:gltf-validator`, `eval:map-new`,
`eval:devport`, `skills:check`, `eval:fixture`, `eval:docsautoria`). `check:vm` 6/7, com
`eval:vm-serving` vermelha também na base.

## Ainda ABERTO, com régua vermelha medindo

- `m92` (Zastava): escala aparente 1,49–1,55× a `ak` na mesma família, e mão saindo do
  quadro em um frame da recarga (84 e 74 de 306).
- `revolver38`: mão sem contato com a arma — 53–59 px contra teto de 40, nos dois aspectos.
- `awp/fire`: mede 0 em algumas sessões (estado da luneta durante o disparo); falta
  separar estado legítimo de defeito.

## O que este relatório NÃO verificou

- O caminho legado (`ready:false`) continua com `lmg`, `m92` e `revolver38` sem desenhar
  arma e `awp`/`shotgun`/`ak` com a mão fora do quadro — a mesma substituição da AWP mora
  lá, e o conserto desta rodada não tocou nele.
- A faca (`melee`) não é medida por estas réguas.
- Materiais: a leitura "cromado/espelhado" da `lmg` e da `m92` segue sem régua.
