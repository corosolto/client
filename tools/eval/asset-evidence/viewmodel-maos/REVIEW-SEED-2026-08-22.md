# Revisão adversarial — seed de mãos v2 (reprovado)

## Candidato

- Arquivo local: `/tmp/csbrasil-vm-pilot/arms_v2_seed-rig.glb`
- Gerador: Meshy text-to-3D, tarefa `01a02716-bbdf-7917-a1f5-66e78c4f8e51`;
  refinamento `01a02717-75e8-7710-be3a-d32f09315bec`.
- Rig: Meshy, tarefa `01a02718-7201-794e-b772-990c9a783a59` (5 créditos).
- Imagens locais: `/tmp/csbrasil-vm-pilot/renders/`.
- Estado: **referência rejeitada; não copiar para `public/models/fparms/`**.

## Veredito independente

O revisor que não produziu o candidato reprovou a integração. As capturas mostram
personagem inteiro encapuzado, corpo, botas e uma pistola, enquanto a ficha pede
somente antebraços e mãos sem arma. O GLB tem uma única malha/material, 24 juntas
totais, zero juntas digitais e nenhum clipe; mede 12.453 triângulos, acima do teto
de 12 mil. Não há materiais E/B/U nem evidência de licença comercial confirmada.

O próximo candidato deve ser uma malha isolada de antebraços/mãos, sem objeto
fundido, com materiais de luva e manga separados, 30 juntas de dedos e os sete
clipes definidos em `plans/26-VIEWMODEL-MAOS-FACCIONAIS.md`. A falha central não é
consertável com cor ou offset; não habilitar `?hands=2` para este arquivo.
