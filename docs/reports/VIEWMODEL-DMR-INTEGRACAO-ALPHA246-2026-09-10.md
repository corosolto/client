# Integração DMR sobre alpha.246 — Rem700 e G3SG1

## Resultado e decisão

Rem700 e G3SG1 foram reconstruídas por fonte sobre
`origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`, integradas apenas como candidatas opt-in no
draft #572 e recapturadas no Game em 1440×960 e 1440×810. As duas permanecem `ready:false`; a flag
global continua desligada e nenhuma promoção, merge ou deploy foi feito.

A branch `claude/vm-dmr-final@701e98e44b` não podia ser promovida diretamente. O manifesto local
estava stale e a primeira reprodução confirmou um falso verde visual: Rem700/G3SG1 apareciam como
geometria enorme, deslocada para o alto/esquerda e desconectada das mãos. O verificador antigo
media nomes, comprimento em bind pose e excursão de mundo, por isso não detectava o defeito.

## Causa e correção

O splice calculava `local = inverse(parent_bind) × peça`, embora o runtime aplique `idle` ao
equipar. A assembly agora amostra a primeira chave de `idle` e usa o mundo do pai nessa pose. O
gate mede centro/eixo do corpo na mesma pose e o mutante `desalinha_corpo_idle` reproduz a falha.

Havia uma segunda perda: materiais Mint eram copiados sem `textures`, `images` e `samplers`; os
índices apontavam para recursos do doador. A assembly agora copia e reindexa a cadeia inteira,
inclusive `EXT_texture_webp`. O gate resolve a imagem de cor esperada e o mutante
`remove_imagens_mint` precisa reprovar.

O mecanismo passou a ser medido no referencial do corpo para separar o curso da peça do movimento
global das mãos. O mutante `congela_peca` prende a peça ao corpo e precisa zerar a excursão. Esses
números são guarda causal, não aprovação estética.

## Produtos privados e recibos

Os binários e imagens ficam fora do Git em
`/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/`.

| Arma | Fonte SHA-256 / bytes | Otimizado SHA-256 / bytes |
|---|---:|---:|
| Rem700 | `7d686ab53e23449e750c0b4edee97d7085046653ecc732257deb60877de92c16` / 4.675.768 | `d81a0cbbe82dd29925efecac7a40d00f084d41a7704f6225e7b0e2d066e82d6e` / 4.673.620 |
| G3SG1 | `5169685b0f2932a9a7352375bde90cac117be6b8409590ac79a8006ed1a12088` / 4.037.144 | `10c08eecd3b7d71d5036830f8e4aa5f5c71e2829e89bee48fa225fdad3391a1e` / 4.036.252 |

Evidência persistente: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/evidence/dmr-20260910/`.

| Evidência | SHA-256 |
|---|---|
| `capture.json` | `2c24a82107c0a4808b644ffc9e40b5910a5ddf883a116545e2232c39dec8e40e` |
| `contact-sheet-3x2.jpg` | `4d308817b53013e074901fb7b424a76f1efd531eb1a39f85a15a1fb4eec3ac08` |
| `contact-sheet-16x9.jpg` | `cb09ad2d2fb812f109a9b4249fde296610122310626f09bbf6aa79a6a9a369ca` |
| `manifest.json` | `78d09162b39b10d0f7759eb8fdbbfef8fad6dfd9b84e9ed108f88270fc7320ec` |

Foram geradas 24 imagens. O recibo registra 168 erros de recursos opcionais localhost/CORS e zero
erro fatal; eles não impediram a montagem das candidatas. As folhas mostram arma, mãos e material
próprio presentes em idle, ADS, tiro e recarga nas duas proporções. Isso encerra os defeitos
causais conhecidos, mas a aceitação visual continua pertencendo ao dono.

## Gates e teste humano

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root npm run eval:vm-dmr-assets
npm run eval:vm-dmr-tools
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root npm run preview:vm-precision
```

Abrir:

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=mosin,svd,sks,rem700,g3sg1&vmqa=precision
```

Revisar Rem700 em idle, tiro/ferrolho, recarga e ADS; depois G3SG1 em idle, recarga tática e ADS,
nas janelas 1440×960 e 1440×810. Ao terminar, executar `npm run cleanup:vm-precision`.
