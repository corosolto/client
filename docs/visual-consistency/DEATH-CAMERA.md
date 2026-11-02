# DEATH-CAMERA — morte em 1ª pessoa não desenha o próprio corpo

**Defeito (P2, CRITICO-MOTION-REAL-R2, 31/10/2026).** `_tpDeath` forçava
`playerTP.group.visible = true` mesmo em `camView === 'first'`, e o ramo morto de
`_updatePlayer` (game.js, `if (!p.alive)`) só abaixa/inclina a câmera — que continua
no olho, **dentro** do próprio crânio. Vídeo 1320×880, frames 341/350 (PTS 11,403 /
11,703): interior do crânio, órbitas pretas e nuca ocupando a tela.

**Decisão.** Morto em `first`, as malhas próprias ficam ocultas (mesmo mecanismo do
`selfOccluded` de `_updatePlayerTP`: `selfMeshes` + `ocultarArmadura`), com o corpo
ainda animado caindo no mundo. Em `third`/`shoulder`, o cadáver continua visível e a câmera acompanha a cabeça animada. `_tpRevive` restaura `selfMeshes`/armadura/`selfOccluded` no respawn
(SP e MP SNAPSHOT — BUG-86). Corpos remotos (bots/outros jogadores) usam groups
próprios e não são tocados. Câmera first morta continua descendo/inclinando — agora
vendo o mundo, não o interior da cabeça.

**Onde.** `public/js/game.js`: `_tpDeath` (guarda per-frame por `camView`) e
`_tpRevive` (restauração). Nenhuma remoção global de cabeça, nenhuma mudança em
animação/corpo dos outros.

**Morto no online (R4, CRITICO-DEATH-CAMERA-R3 P2-1).** O ramo morto de
`_updatePlayer` retornava incondicionalmente depois de `_respawnPlayer()` quando o
timer vencia — mas no online `_respawnPlayer` é no-op (o revive vem do SNAPSHOT do
servidor, `netgame.js`), e a câmera first parava de descer/inclinar até o snapshot
chegar. Agora o `return` só acontece se `p.alive` ficou `true` de fato (respawn SP);
morto no online segue caindo/rolando. Fluxo SP/TP inalterado.

**Régua (R2).** `tools/eval/death-camera-self-check.mjs` (node puro). Instancia a
classe REAL de `--game-module` em TODOS os cenários (deps do harness: renderer, textures,
sfx, settings, onQuit — nunca o `bootGame` fechado), mata pelo caminho real `_kill` e
exige visibilidade **efetiva** de malha: `visible` do material, `colorWrite`, opacidade,
ancestrais e layers — não só `group.visible`. Cláusulas estáveis `DC2-*` (26 no nominal, mais `DC2-IDS-UNICOS`):

- `DC2-FIRST-OCULTO` · `DC2-FIRST-CAM-DESCE` · `DC2-FIRST-CAM-FINITA` ·
  `DC2-DEATH-VM-OCULTO` — morte em first;
- `DC2-THIRD-CADAVER` · `DC2-THIRD-CAM-FINITA` · `DC2-THIRD-CAM-FORA-CRANIO` ·
  `DC2-THIRD-CAM-BOOM` (idem `DC2-SHOULDER-*`) — morte direto em 3ª/ombro;
- `DC2-TRANS-FIRST-THIRD` · `DC2-TRANS-FIRST-SHOULDER` · `DC2-TRANS-VOLTA-FIRST` —
  morto em first, troca para third/shoulder ANTES do respawn e volta ao first;
- `DC2-RESPAWN-REVIVE` · `DC2-RESPAWN-ORIGINAL` (restaura `item.visible` original,
  inclusive malha que JÁ nascera invisível) · `DC2-RESPAWN-CORPO-THIRD`;
- `DC2-ONLINE-MORTE-SEM-RESPAWN` · `DC2-ONLINE-MORTE-CAM-DESCE` — online com timer
  vencido: sem respawn local e câmera first continuando a descer (R4);
- `DC2-BOT-CADAVER-INTACTO` — cadáver remoto morto por `_kill` real, corpo e malhas
  intactos (nunca um booleano `bot.alive`);
- `DC2-CAUSAL-INSTANCIA` · `DC2-CAUSAL-METODOS` — provam que a classe de
  `--game-module` foi a exercitada (contadores de constructor/`_tpDeath`/`_tpRevive`/
  `_updatePlayerTP`); sem isso o RED não é aceito como seleção causal.

**Finitude de câmera (R5).** Distância válida não prova câmera renderizável.
Cada `_updatePlayer` do percurso morto atualiza e mede a câmera, acumulando qualquer
falha sem permitir recuperação posterior. As cláusulas `DC2-*-CAM-FINITA` exigem elementos
finitos de posição, quaternion, euler, `matrixWorld` (atualizada com
`camera.updateMatrixWorld(true)` após os métodos reais) e `projectionMatrix`, ANTES
de aceitar as cláusulas geométricas. `DC2-CAM-FINITA-TODOS-FRAMES` agrega todos
os percursos, incluindo troca de vista e estado final após respawn. NaN transitório
não é escondido por recuperação posterior: é FALHA.

**Estados e saídas.** CLI estrita: só `--game-module=<caminho>` e `--mutante=<id>`;
vazio, desconhecido, duplicado, posicional ou forma com espaço → usage + exit 2.
Módulo ausente/sem `Game`/exceção de boot → `INFRA DC2` + exit 3. RED semântico
somente com exit 1. Não existe tolerância `KNOWN_RED`: com `--mutante`, o nominal
roda primeiro pelo MESMO CLI em subprocesso e tem que estar GREEN (exit 0); erro,
sinal, nominal-RED ou **qualquer status de variante que não seja 0/1/2/3** →
`INFRA DC2` exit 3 (R4, P2-3: antes, status inesperado com os 4 IDs esperados no
stdout era aceito como DETECTADO; agora exige `status===1` para RED semântico).

**Mutantes reais (R3/R4).** Cópia temporária do módulo em
`public/js/.dc2-mutante-<pid>.js` (mesmo diretório: imports relativos), executada
pelo MESMO CLI; exige conjunto EXATO de falhas + IDs únicos + nominal prévio GREEN:

- `--mutante=camera-mudo` — remove SOMENTE a chamada
  `this._updatePlayerTPCamera(dt, eye, anchor);` dentro de `_tpDeath` (o cadáver continua
  caindo). Detectado pelas 6 cláusulas `*-CAM-FORA-CRANIO`/`*-CAM-BOOM`/`*-CORPO-ENQUADRADO` (câmera
  congelada no olho, dist 0).
- `--mutante=cam-nan` — injeta `this.camera.quaternion.x = NaN;` após a mesma
  chamada. Detectado pelas 2 cláusulas `*-CAM-FINITA`, 2 `*-CORPO-ENQUADRADO` e pela global.
- `--mutante=cam-nan-primeiro` — injeta NaN apenas na primeira chamada de cada
  instância a `_tpDeath` em terceira pessoa. Exige as mesmas 3 falhas: a câmera
  recuperada no frame seguinte não apaga a falha inicial.

**R3 (31/10/2026) — queda da câmera morta em chão local.** O ramo morto de
`_updatePlayer` em `first` descia a câmera até o piso **global** `max(0.5, …)`.
Morto no mirante do `fy_escadao` a câmera afundava até ver a laje de baixo. Agora o
clamp é `groundHeightAt(cam.x, cam.z, p.pos.y) + 0,5` — `yRef` = **pé do cadáver**,
consultado antes da descida: com o `yRef` do olho (`cam.y`) o vão do córrego
devolve o **tabuleiro** (`map_corrego.js` exige `yRef < fundo+0,9`) e a câmera
SUBIA ao morrer sob a ponte. O gate `death-camera-check.mjs` (CAMMORTE) não mudou:
nominal GREEN (chão+0,50 exato nos 3 mapas: campomorro 1,50 · escadao 8,06 ·
loja_h 3,90) e `--mutante=yglobal` RED exit 1.

**Enquadramento R8.** As gravações reais R1 mostraram o cadáver fora da tela. A tentativa Y-only R2 ainda cortava a cabeça na vista de ombro; foi rejeitada. O helper recebe âncora XYZ opcional apenas no ramo morto, lida do headBone animado após ctrl.update. Posição física do player fica intacta; o default vivo não muda. Câmera, boom e lookAt usam a mesma âncora, respeitando piso/oclusão/máscara. Sem cabeça finita, usa a âncora anterior.

O gate R8 carrega o GLB real de Esquerdomacho, rig, geometria e clipes reais via preloadCharacterAssets. Na fixture Node, imagens/texturas são omitidas e materiais são substituídos por materiais simples (inclusive sem preservar doubleSided); geometria, rig e clipes são os reais. Portanto esta é uma fixture geométrica simplificada, não prova de materiais/render. Nenhum binário de produto é reexportado. Head e marco de tronco são projetados em1.5 e844/390 e precisam ficar finitos, dentro do viewport e do volume de recorte após a morte. O gate anterior com fallback procedural deixava o mutante olho-vivo passar; foi rejeitado como cobertura insuficiente. Com GLB real, olho-vivo restaura a câmera no olho em pé e viola exatamente THIRD/SHOULDER-CORPO-ENQUADRADO.

Nominal R8:27PASS. Quatro mutantes reais com nominal prévio/exactsets: olho-vivo2falhas, camera-mudo6, cam-nan5, cam-nan-primeiro3. Vídeos reais R3 em1320×880 e844×390 têm13.5s, oito transições morte/troca/respawn cada, câmera finita e cabeça dentro nas vistas mortas. Escopo: Game.update real, botAI congelada/HUD oculto, persistência da câmera desativada, desktop em duas proporções. Não são teste em celular físico, partida MP nem benchmarkFPS. Crítico independente R8: sem P1/P2 residual focal; enquadramento R3 aceito localmente nos quadros/transições amostrados, com54framesextraídos e102+100amostras TPmortas sem cabeça fora. Default vivo byteequivalente ao helperanterior em128casos. Isso não aprova todos os frames/rigs/MP/mobile. O P3 documental sobre materiais simplificados foi corrigido nesta redação.
