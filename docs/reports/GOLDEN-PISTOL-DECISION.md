# Decisão: trilha canônica da pistola golden

**Data:** 01/09/2026  
**Estado:** candidata técnica verde; revisão de gameplay do dono ainda pendente

## Escolha

A fonte canônica é a família licenciada KINEMATION X18/G18: braços, luvas, manga, rig da
arma e animações do mesmo pacote. O build reproduzível parte de
`tools/blender/viewmodels/build_paid_family.py`, assa os clips com
`tools/viewmodels/assemble_paid_family.mjs` e publica somente no catálogo privado. O runtime
serve `/private-assets/viewmodels/pistol/pistol-runtime.glb`; a chave é `pistol#pistol`.

## Evidência observada

A captura rejeitada pelo dono em 01/09 mostrava somente dois antebraços cilíndricos e nenhuma
pistola. Não era degradação aceitável de enquadramento. Quatro causas se acumulavam:

1. o piloto customizado anterior combinava câmera e bases de rig incompatíveis e podia deixar
   a arma inteira fora do quadro;
2. o otimizador reconstruía as nove texturas compartilhadas a partir de GLBs que já continham
   placeholders 1 × 1, apagando na prática pele, luva e manga;
3. o rig de arma importado tinha conversão FBX dupla e base local diferente da animação; o
   pivô do `Mag` transformava rotação em arco enorme;
4. braços e arma tinham durações diferentes, e o pente não permanecia associado à palma no
   trecho destacado da recarga.

O pipeline agora regenera as texturas a partir dos PNGs licenciados, preserva a skin ao obter a
base dos ossos, normaliza a fase dos clips e assa uma janela declarativa de `Mag` relativo a
`hand_l`. O cache-bust do catálogo foi elevado para `paid-aaa-3`.

No frame normativo 1440 × 960, o gauntlet final mede caixa inicial em `(0,5965; 0,4906)`,
centro livre, excursão de tiro `0,115`, excursão de arma na recarga `0,22`, excursão do pente
`0,97` e distância mão de apoio–pente de `0 px`. O GLB servido tem 3.005.660 bytes e SHA-256
`0ac4e088b0c7195e8c3412052e9710ba2a4ff47398f7d0e26a1cd6f4a13a8eb6`.

## Alternativas descartadas

- `pistol-hires.glb` customizado: útil como experimento, mas reprovado no jogo real e removido
  da rota canônica;
- GoldSrc: permanece somente como referência de disciplina e timing, não como produto;
- compensar o defeito apenas com escala/FOV no JavaScript: não corrige base de osso, textura
  nem contato do pente.

## Custo e reversão

O custo aceito é manter o asset-fonte licenciado fora do repositório público e um ajuste de
recarga específico no manifesto. A reversão é colocar `VM_FAMILY.pistol.ready=false` e retirar
`runtime: 'family'` de `VM_WEAPON.pistol`; nenhum worktree ou asset anterior precisa ser
apagado.

## Verdade de exportação

```bash
python3 tools/viewmodels/build_paid_catalog.py --family pistol
node tools/viewmodels/optimize_paid_family.mjs
node tools/viewmodels/validate_paid_catalog.mjs
node tools/eval/pistol-viewmodel-contract.mjs \
  --runtime-report=artifacts/viewmodels/golden-pistol/runtime-final/runtime-report.json
node tools/eval/vm-gauntlet.mjs --armas=pistol --modo=kinemation \
  --largura=1440 --altura=960
```

Evidência visual: `artifacts/viewmodels/golden-pistol/runtime-final/contact-sheet.png`.
Relatório do jogo: `artifacts/viewmodels/golden-pistol/gauntlet-mag-grip-v1/relatorio.json`.
Os mutantes `sem-arma`, `sem-pente`, `pente-estatico`, `sem-mao-apoio`, `draw-idle` e
`tiro-estatico` ficam vermelhos. Isso libera a candidata para revisão do dono; não registra
aprovação estética em nome dele.
