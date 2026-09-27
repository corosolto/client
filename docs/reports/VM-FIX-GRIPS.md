# vm-fix-grips: pegadas K de m92, md97, revolver38 e shotgun

**Data:** 23/09/2026 · **Branch:** `vm/fix-grips` · **Base:** `vm/launch-k` (`1b5858568`, PR #629).
Fila de origem: `artifacts/review-L1/FILA-CORRECAO.md` (crítico cego r2, 10/10 reprovadas).

Retrato datado. O estado vivo é o que `npm run eval:vm-pegada-k` e o crítico cego dizem.

## O que mudou, arma por arma

Os quatro produtos são pós-processados a partir do produto do catálogo Codex
(`postProcess` e `postProcessInputSha256` nos manifestos `*-candidates.json`), sem Blender:
FK + skinning em `tools/viewmodels/prep/vmpose.mjs`, IK de dois ossos em
`grip-support.mjs`. A prévia offline (`vmpose-preview.mjs`) desenha a pose na câmera do
runtime; a figura que decide continua sendo o jogo (`capture-l1.mjs`).

| Arma | Defeito medido | Conserto |
|---|---|---|
| m92 | O pacote M4 segura um punho vertical que a M92 não tem: o centro do punho esquerdo ficava 17 cm abaixo do eixo do guarda-mão. | Punho girado para o eixo do cano, centro no guarda-mão (IK em idle e recargas, desvanece quando a mão sai para o pente); repouso do nó atualizado para tiro/saque/inspeção; dedos direitos fechados nas recargas; pele do antebraço sob a manga removida. |
| md97 | Mesma herança + pente sem UV e sem textura (0,8 cinza fosco = bloco branco); socket `sight` 4,3° abaixo da linha alça–massa. | Pegada no guarda-mão com o antebraço passando na frente do pente (polo do cotovelo fixo na pegada); pente com a média do atlas da arma; ADS com `linhaDeMira` e resíduo que põe alça e massa na cruz. |
| revolver38 | Pose de duas mãos com o cano a ~55° e frame da família herdado do olho antigo; no ADS as luvas cobriam a arma; pontas do polegar e do indicador a 6,2–6,7 cm com o cartucho no meio. | Frame próprio (fov da pistola, 1,08×/1,03× da escala da AK), ADS com alça a 0,35 m e arma 0,8 cm mais alta no punho; CCD de polegar e indicador fecha a pinça nas janelas em que o cartucho está na mão. |
| shotgun | A malha da KSG estava **de trás para frente** em relação às mãos e aos sockets (boca e punho da bomba do lado da câmera); manga do pacote pesado cortada no antebraço (748 vértices, a mesma da LMG); sockets de mira fora da arma. | KSG girada 180° com o punho de pistola na mão direita; sockets remedidos (boca no anel do cano, alça na mira dobrável); manga inteira do rig K; mão esquerda no punho vertical da bomba, presa ao osso da bomba no tiro; polo do cotovelo fixo; cartucho vermelho e sem girar (segue os dedos na recarga); frame e ADS próprios. |

## Réguas

- **`eval:vm-pegada-k`** (nova): apoio dentro do corte real do guarda-mão (PG1), dedo no gatilho
  (PG2), manga até o ombro (PG3), pente não branco (PG4), pinça do cartucho (PG5), alça e massa na
  cruz no ADS simulado (PG6), arma visível acima das luvas no ADS (PG7); cláusulas por arma no
  `SCRIPTS.md`. `--mutantes`: os quatro produtos reprovados ficam vermelhos (m92 PG1, md97
  PG1/PG4/PG6, shotgun PG2/PG3/PG6, revolver38 PG5), o revólver no frame da família e o ADS sem
  resíduo também. Nem toda cláusula tem mutante próprio, e a régua pede os ativos privados: fica
  fora de `check:fast` e do CI, como as outras réguas de produto K.
- **`eval:vm-ads`**: arma com `ads.linhaDeMira` mede alça e massa, não o socket (achado transversal
  da fila L1); `ref` ausente na cena reprova. `--mutante=socket --armas=md97,shotgun` volta ao socket
  e reprova; sem arma com `linhaDeMira` o mutante também reprova (não passa medindo nada).
- **`eval:vm-shotgun-final`**: a regra antiga exigia a manga cortada (zero triângulos proximais);
  agora exige a manga inteira (manga ausente também reprova). Mutante `manga-cortada`.

Portões desta branch (logs em `artifacts/fix-grips/gates/`, não versionados): `eval:vm-rig`,
`eval:vm-cache`, `eval:vm-launch`, `eval:vm-pegada-k`, `eval:vm-ads` (4 armas, 3:2 e 16:9),
`eval:vm-autorado-vivo --todas` (25/25), `eval:vm-rifle-m92`, `eval:vm-rifle-md97`,
`eval:vm-pistol-revolver`, `eval:vm-shotgun-final` e os lifecycles de md97, revolver e shotgun
verdes. Vermelhos que já estavam: `eval:vm-frame` só pela PT-38 (reescala na frente vm-k-rebuild)
e `eval:vm-rifle-m92-lifecycle` só por `ready:false` da família AK (decisão do dono).

## Crítico cego (contexto limpo, só pixel)

| Arma | r2 da revisão L1 | depois (rodada final) | O que resta, nas palavras do crítico |
|---|---|---|---|
| m92 | REPROVADA (mão de apoio no ar) | REPROVADA, nada regrediu; a mão de apoio fecha no guarda-mão em idle/tiro/rajada/saque/inspeção | ADS com mangas achatadas sem luva (idêntico ao antes); mão do gatilho fora do punho na recarga |
| md97 | REPROVADA | **RESSALVA** | pente cinza liso sem nervura; luva amassada no tapa do ferrolho da recarga vazia (animação do pacote M4, igual ao antes) |
| revolver38 | REPROVADA (pequeno, pro alto, luvas no ADS) | REPROVADA, nada regrediu; cano deixou de apontar pro céu, tamanho na faixa da pistola | luvas grandes no ADS; revólver meio de perfil |
| shotgun | REPROVADA (gigante, punho oco, ADS de frente) | **RESSALVA** | braço de apoio longo cruzando o centro-baixo; boca da manga no punho; mangas grandes no ADS |

## O que não foi resolvido e por quê

- **Mão do gatilho da M92.** Medido na vista lateral: a mão direita do pacote M4 fecha ~19 cm à
  frente do punho de pistola real da AK, atrás do pente, em todos os clipes. Levá-la ao punho exige
  reorientar o punho fechado para o cabo inclinado da AK; a tentativa por translação pura deixou a
  mão sob o cabo e, no frame atual da M92 (80 px à direita e 85 px abaixo da AK, item Codex), o
  cabo fica fora da tela. Precisa de pose nova da mão direita + frame.
- **ADS da M92** (mangas achatadas) e ADS do revólver (luvas grandes): a M92 está idêntica ao antes;
  o revólver tem a pose de duas mãos na altura da linha de mira, então a arma só aparece acima dos
  punhos. Os dois pedem pose de ADS própria, não resíduo de config.
- **Bocas de manga** (ombro na shotgun, cotovelo no revólver) em alguns quadros: é o defeito
  compartilhado que a frente vm-fix-mesh ataca em runtime (`vmsleeve.js`). A manga cortada de 748
  vértices está também na LMG.
- **Material chapado da KSG e pente sem geometria de nervura na md97**: asset, fora da pegada.
