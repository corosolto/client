# Revisão adversarial — base isolada de mãos (reprovada para integração)

## Candidato

- Arquivo local: `/tmp/csbrasil-vm-pilot/arms_v2_isolated.glb`
- Gerador Meshy: tarefa `01a0271d-921e-786f-8ab6-611b63e1504d`; refinamento
  `01a0271e-64dd-725e-b162-38037e8d8877`.
- Imagens locais: `/tmp/csbrasil-vm-pilot/renders-isolated/`.
- Estado: **base visual local; não integrar nem habilitar com `?hands=2`**.

## Veredito independente

O candidato melhora o recorte: só há antebraços e mãos, sem rosto, corpo, arma,
marca, texto ou gore. Também fica dentro do orçamento (9.374 triângulos, três
texturas WebP 1024 e sem Draco).

Ainda assim, não é um view model funcional. A pose tem palmas abertas e cruzadas,
incompatível com a empunhadura; o GLB não possui skin, osso, junta digital, clipe
ou materiais separados para luva/manga. A correção econômica é reposar esta malha
antes do rig, separar materiais e então criar o armature de 30 juntas digitais e
os sete clipes previstos na ficha. Sem essa sequência, ajustes de código só
repetiriam a mão solta que o projeto já reprovou.
