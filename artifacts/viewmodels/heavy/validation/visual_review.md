# Revisão visual — viewmodels pesados

## Fontes e enquadramento

- Pilotos: `awp` e `shotgun`, ambos derivados das armas próprias em `public/models/weapons`.
- Doadores em Downloads foram usados somente para estudar ritmo e decomposição de ações; o build não os importa.
- Captura em 3:2, câmera de primeira pessoa a 27 mm, fundo transparente.

## AWP

- Idle: silhueta estável nos cinco quadros; arma permanece dominante e as duas mãos mantêm apoio legível.
- Fire: recuo curto; a mão direita sai da empunhadura, acompanha o ferrolho para trás e retorna. A mão esquerda permanece no fore-end.
- Reload: a mão esquerda acompanha o carregador durante retirada e reinserção, sem desaparecer do quadro final.
- Peça mecânica: ferrolho autoral separado, preso ao rig da arma.

## Shotgun

- Idle: silhueta estável e cano/tubo legíveis em três quartos.
- Fire: recuo mais forte que o sniper; bomba e mão de apoio recuam juntas e retornam.
- Reload: mão de apoio sai da bomba, acompanha o cartucho até a janela inferior e retorna ao fore-end.
- Peça mecânica: bomba, cano e tubo autorais; o stock foi removido somente da cópia de primeira pessoa porque dominava o quadro.

## Falhas rejeitadas durante a rodada

- Primeira passagem: punhos e palmas separados apesar do contato de ossos verde.
- Segunda passagem: stock da shotgun virou massa preta dominante diante da câmera.
- Terceira passagem: cartucho auxiliar aparecia fora do reload.

## Limitações explícitas

- As mãos são uma skin procedural low-poly do CORO SOLTO; ainda não usam a topologia high-res dos pilotos automáticos/pistola.
- O cartucho da shotgun fica parcialmente ocluso pela palma durante a inserção, mas não flutua separado dela.
- Esta frente é asset-only: não houve integração em runtime, ADS/HUD, teste em browser nem réplica para `g3sg1`, `mosin`, `rem700` e `svd`.
- `npm run eval:gltf-validator` não iniciou a validação nesta worktree porque o pacote `gltf-validator` não está instalado; a reimportação fail-closed no Blender 5.2 passou para os dois GLBs.
