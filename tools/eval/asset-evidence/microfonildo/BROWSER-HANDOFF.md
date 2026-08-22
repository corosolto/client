# Microfonildo — handoff para captura runtime

O candidato 3D v2 foi aprovado antes da integração. Esta entrega central registra o personagem
na facção TV, usa M4 canônica, inclui os 11 clipes e o pack mesclado. O integrador não abriu
browser e não atribui nota ao resultado no jogo.

## Identidade congelada

- personagem: `public/models/characters/microfonildo.glb`
- SHA-256: `7e45cde94e8faf3afcd133832440af2a015b8aabc9cb711eb65dfcdfe057e609`
- arma: `m4`; SHA-256 `b03516d557e2ecb61de3997e339d59be9e35d69bc3b5e23c09cb7dd69cb7a677`
- merged: `public/models/anims/microfonildo.glb`; SHA-256 `95fffec3b6c891c89060647f1b1eeb61054316f0029e4ab977a5739c02d6c57e`
- versão-alvo: `2.0.0-alpha.65`

## Capturas obrigatórias do agente único de browser

Em 1536×1024, recapturar a thumbnail e os cinco estados `idle`, `walk`, `shoot`, `crouch` e
`death`, além de um close de M4/ADS que permita julgar as duas mãos. Manter o mesmo enquadramento
e escala dos pilotos para comparação. Registrar URL/parâmetros, arquivo e SHA de cada captura.

O crítico limpo deve conferir no pixel servido: leitura de criatura felpuda amarela, fones,
boom dorsal e dois reels volumétricos; ausência de invasão do peito/ADS; M4 legível, mão direita
no pistol grip e esquerda no foregrip em movimento e crouch. Não reutilizar o veredito offline
como aprovação do runtime.

## Evidência offline disponível

- receipt central: `integration-receipt.json`
- Blender idle/walk/crouch e A/B: `grip/microfonildo-grip-contact.png`
- receipt de sockets/arma: `grip/microfonildo-grip-evidence.json`
- baseline vermelho: `pilot-system-baseline-red.txt` e `pilot-grip-baseline-red.txt`
- contrato e mutantes: `tools/eval/pilot-system-check.mjs` e `tools/eval/pilot-grip-evidence-check.mjs`
