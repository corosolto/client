# Granada × recarga × morte, e o braço da AK (26/10/2026)

Cinco relatos do dono, medidos antes do conserto. Réguas:
`npm run eval:granada-recarga-morte` (GRM1-GRM5) e `npm run eval:manga-tampa`
(MT1-MT7). Este documento guarda a causa e os números; o código só aponta pra cá.

## 1. A arma dispara antes da granada sair da mão

> "quando equipa a granada e antes de jogar tem um bug onde dispara a arma
> primaria e ai sim joga a granada"

Era a ÚLTIMA granada. `_throwNade` zera o porte (`p.nade = null`) no mesmo quadro
em que começa o arremesso, porque não sobrou utilidade pra manter na mão. O
auto-fire do botão segurado (`_updatePlayer` chama `_tryShoot(true)`) encontrava a
arma livre enquanto a animação de 1,05 s ainda rodava, e o release da granada só
acontece aos 58% dela (0,61 s).

Medido no arnês (AK, gatilho segurado, 1 fumaça):

| | antes | depois |
| --- | --- | --- |
| pente durante o arremesso | 30 -> 25 | 30 -> 30 |
| pente quando a animação acaba | 30 -> 17 | 30 -> 30 |

Conserto: `p.nadeBusyUntil` (game.js). Enquanto a mão é da granada, ficam
trancados o gatilho (`_tryShoot`), a recarga (`_startReload`) e um segundo
arremesso (`_throwNade`). Sem pacote pago não há animação a proteger e a janela é
zero, que é o caso do mobile e do caminho legado.

## 2. Granada no meio da recarga congelava a arma

> "quando equipa a granada durante a animação de reload, a animação para/não
> volta e as balas são resetadas"

`holdUtility` (authoredvm.js) tira a arma de cena e manda o entry dela pro idle,
mas `p.reloadUntil` continuava correndo por baixo: a recarga terminava sozinha,
sem animação nenhuma, e as camadas de som do pente tocavam com a granada na mão.

Conserto: `_cancelReload()` derruba no mesmo quadro o relógio, o aviso
"RECARREGANDO", o token das camadas de som (`_rlTok`), a animação de 1ª pessoa
(`idleWeapon`), o rig legado (`cancelReload`) e o overlay de 3ª pessoa
(`ctrl.cancelReload`). Chamam: `_equipNade`, `_throwNade` e a morte. Quem
interrompe recarrega de novo, como no CS.

Medido: pente 3/90 na hora de equipar a granada, 3/90 três segundos depois
(antes: 30/90, servido por uma recarga que ninguém viu acontecer).

## 3. Morrer terminava a animação na base

> "quando vc morre durante o reload ou quando está preste a jogar a granada você
> finaliza a animação quando volta para base, em teoria deveria parar tudo e
> voltar para a base sem fazer nenhuma animação"

`_updatePlayer` sai cedo com o jogador morto (`if (!p.alive) { ... return; }`),
e é lá dentro que rodam o `vm.authored.update` e o bloco de conclusão da recarga.
Com o jogador morto ninguém avança o mixer nem o relógio: os dois CONGELAM e
descongelam no respawn. Consequências medidas:

- a recarga concluía ao renascer (1 `sfx.reloadEnd` depois do respawn, 0 agora);
- a granada do arremesso interrompido nascia NO SPAWN, 1 s depois da morte
  (1 granada no mundo antes, 0 agora), porque o `release` só checa `p.alive` na
  hora em que roda;
- a `utility` encalhada recusava o arremesso seguinte (`throwUtility` devolve
  false enquanto houver uma em voo).

Conserto: `_abortarArmaNaMorte()` no `_kill` do jogador (cancela recarga, zera
porte e janelas, chama `abortUtility` e reseta o rig) e `_voltarPraBase()` no
respawn local e no revive do servidor (netgame `playerRespawned`), que renasce no
idle e SACA a arma.

## 4. Uma recarga servia o arsenal inteiro

> "se vc zera a 30 balas da arma primaria e troca para secundaria usa todas do
> pente e em seguida faz o reload a arma primaria faz o reload junto e está
> recarregada"

O bloco de conclusão varria `Object.keys(p.ammo)`: toda recarga enchia o pente de
TODAS as armas que tivessem reserva. Medido: AK em 0/90 virava 30/60 quando a
pistola recarregava; agora segue 0/90.

Conserto: `_armasServidasPelaRecarga()` devolve a arma que ENTROU na recarga
(`p.reloadWeapon`, gravada no `_startReload`; o netgame grava a dele no
`_syncPlayerLoadout`), com a arma da mão como retaguarda.

## 5. O braço some na AK-47

> "quando equipa a AK-47 o braço do personagem some, apenas nesta arma"

`capSleeveOpenings` (vmsleeve.js) copiava os atributos da malha escrevendo no
ARRAY CRU o valor que `getX` devolve, e `getX` DESNORMALIZA. Os GLB golden vêm
com `KHR_mesh_quantization`: POSITION é `Int16` NORMALIZADA, então gravar -0,8818
num `Int16Array` trunca pra 0. A malha `coro_solto_hires_project_sleeves` inteira
colapsava num ponto e os pesos de pele iam a zero.

Só a AK porque ela é a única arma com `golden: true` (vmconfig.js), e a tampa só
roda no caminho golden (authoredvm.js). A luva não casa com o gatilho
`/sleeve|manga|cloth/` da tampa e continuava visível: por isso o relato é "o braço
some" e não "a mão some".

Medido no jogo (brasilia, 1ª pessoa, pacote `gold#ak`):

| | antes | depois |
| --- | --- | --- |
| manga na tela | 0,00% | 2,76% |
| bbox local | 0,00006 x 0 x 0 | 2,000 x 0,3953 x 0,2251 |
| pior peso de pele | 0,004 | 1,000 |
| luva na tela | 3,39% | 3,39% |
| arma na tela | 7,95% | 7,95% |

Conserto: a cópia usa `setX/setY/setZ/setW` do `BufferAttribute` novo, que
normaliza de volta. Atributo não-normalizado (skinIndex `Uint8`) segue igual.

### Por que a régua não pegou

`manga-tampa-check.mjs` media um `CylinderGeometry().toNonIndexed()` com
`Float32Array` NÃO normalizado: nenhum atributo quantizado, 5 de 5 cláusulas
verdes com o jogo quebrado. MT6/MT7 agora montam a malha quantizada do produto
golden (Int16 normalizado em POSITION, Uint8 normalizado em skinWeight) e o
mutante `tampa-crua` reproduz o estado do relato.

`vm-manga-tela-check.mjs` filtra `c.baked && !c.golden`, então a AK, única golden,
nunca entrou na régua de manga na tela. Dívida registrada aqui.
