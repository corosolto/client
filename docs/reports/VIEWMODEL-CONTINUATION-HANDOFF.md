# Continuação do programa de viewmodels

Estado congelado em 01/09/2026. Este arquivo é a fonte de retomada da sessão; não é
necessário abrir nem resumir o rollout antigo de aproximadamente 53 GB.

## Objetivo e limite atual

O programa continua abrangendo todas as famílias de armas, com a AK golden como referência
de qualidade. A frente ativa permanece exclusivamente a pistola até que Ruben a aprove no
jogo real. AWP, shotgun e demais famílias não devem avançar enquanto a pistola ainda estiver
abaixo da AK.

Worktree correto:

```text
/Users/ruben/csbrasil-worktrees/vm-retarget
```

Branch:

```text
vm-cs16-gabarito
```

## Checkpoints já preservados no Git

A branch local e `origin/vm-cs16-gabarito` apontavam para `fa5559ee` quando esta sessão foi
interrompida. Os checkpoints relevantes já estavam no remoto:

- `a2396697` — AK golden aprovada no runtime;
- `9c39afc2` — checkpoint reproduzível do piloto anterior de pistola, ainda WIP;
- `bda90c0d` — restauração da trilha KINEMATION X18/G18;
- `516aca9f` — gates para arma ausente, pente e reprodução real;
- `fa5559ee` — contrato e registro da decisão técnica da X18.

O último documento ainda chama a X18 de candidata técnica verde. A revisão visual posterior
do dono invalidou essa conclusão estética: ela não está aprovada e essa documentação precisa
ser corrigida junto da próxima solução validada, não antes.

## O que o dono viu e o que foi comprovado

As três capturas de referência locais são:

- `/Users/ruben/Documents/screenshots/Screenshot 2026-09-01 at 08.38.16.png`;
- `/Users/ruben/Documents/screenshots/Screenshot 2026-09-01 at 09.50.07.png`;
- `/Users/ruben/Documents/screenshots/Screenshot 2026-09-01 at 14.28.21.png`.

A primeira trilha customizada tornava a pistola reconhecível, mas usava braços lisos,
superdimensionados e sem acabamento, descritos pelo dono como dois canos de PVC. A trilha
KINEMATION restaurou luva, manga, materiais e rig modernos, porém a composição publicada
colocava a arma quase pelo eixo do cano. Contra o céu ou olhando para cima, a pistola virava
uma lâmina preta vertical e os braços dominavam o quadro. A arma não estava ausente: o erro
principal era a transformação final e a leitura da silhueta.

O gauntlet anterior estava cego porque aceitava presença de pixels sem medir largura/altura
da arma, proporção mão/arma ou o caso olhando para cima. A linha de base reprovada mediu:

- aspecto da arma `0,415` (largura/altura);
- `5,515×` mais pixels de mãos do que de arma.

Evidência vermelha:

```text
artifacts/viewmodels/golden-pistol/gauntlet-silhouette-red-v1/relatorio.json
```

## Experimentos desta sessão

### Trilha customizada descartada

O piloto de `tools/blender/viewmodels/build_pistol_hires_pilot.py` foi reconstruído fora da
rota pública com VFOV 58 para separar escala de asset de escala de câmera. Blender e navegador
coincidiram, mas o resultado continuou com anatomia/material inferiores à AK. Ele foi retirado
novamente da rota da pistola. Não reative `runtime: pilot` para tentar resolver apenas por
câmera.

Evidências:

```text
artifacts/viewmodels/golden-pistol/runtime-custom-pilot-v1/contact-sheet.png
artifacts/viewmodels/golden-pistol/runtime-custom-pilot-v2-fov58/contact-sheet.png
```

O GLB privado desse experimento ainda existe com SHA-256
`3f2f5ff2f030b1ef9187e39c7aa612cd7ad54d2c9cb6108289bdd3950f108403`, mas não é a fonte
ativa. O builder foi devolvido ao VFOV 34 que já estava na working tree antes deste
experimento; não confundir o binário privado temporário com um build atual do fonte.

### Trilha X18 em correção

A rota ativa voltou a ser `pistol#pistol`, `runtime: family`, usando:

```text
/Users/ruben/csbrasil-private-assets/generated/viewmodels/pistol/pistol-runtime.glb
```

SHA-256 no congelamento:

```text
f90d28788a85383f6db8dec227ff5d0481f3ffd2bb7e0f985f0b89eeb1cc94dc
```

O assembler ganhou um experimento de pose de apoio e escala de arma, declarados no manifesto:

- `weaponScale: 1.30`;
- `supportGrip` amostrado de `reload_tactical` em `0.92`;
- a pose é aplicada a `idle` e `shoot` e misturada no início/fim das recargas.

O frame corrente, ainda experimental, é:

```text
x=0.270, y=-0.180, z=-0.320, VFOV=72°, rotação=[-7°, 30°, -15°]
```

Ele passou o gauntlet numérico com:

- caixa inicial `(0,5361; 0,6271)`;
- aspecto da arma `0,710`;
- proporção mãos/arma `2,102×`;
- centro livre;
- excursão de tiro `7,9%`;
- excursão do pente `75%`;
- mão de apoio–pente `0 px` durante a recarga.

Relatórios:

```text
artifacts/viewmodels/golden-pistol/gauntlet-side-readable-v1/relatorio.json
artifacts/viewmodels/golden-pistol/mutante-side-readable-perfil-estreito-v1/relatorio.json
```

O mutante `perfil-estreito` ficou vermelho, portanto a nova régua morde a regressão original.

Apesar do verde, a inspeção do contact sheet encontrou dois defeitos ainda concretos:

1. no `idle`, yaw/roll projetam a mão de apoio quase exatamente atrás da dominante, fazendo a
   pegada parecer unilateral;
2. uma peça retangular escura aparece junto ao cabo e precisa ser identificada estruturalmente
   antes de qualquer nova mudança de câmera.

Evidência visual atual, ainda não aprovada:

```text
artifacts/viewmodels/golden-pistol/runtime-side-readable-v1/contact-sheet.png
artifacts/viewmodels/golden-pistol/runtime-side-readable-v1/00-idle-inicio.png
artifacts/viewmodels/golden-pistol/runtime-side-readable-v1/runtime-report.json
```

O runtime sheet agora inclui `olhar-cima`. O gauntlet também captura
`olhar-cima.png` quando executado com `--frames`.

Um segundo grid, feito para separar os punhos com menos roll, terminou de renderizar no exato
momento da interrupção e ainda não foi inspecionado:

```text
/tmp/pistol-x18-frame-grid-2.png
```

Não trate nenhuma célula dele como escolhida sem abrir a imagem.

## Working tree que deve ser preservada

Não rode reset, checkout destrutivo ou limpeza em massa. No congelamento havia alterações em:

```text
package-lock.json
public/js/authoredvm.js
public/models/viewmodels/coro/pistol-hires.glb
tools/blender/viewmodels/build_pistol_hires_pilot.py
tools/eval/char_probe.json
tools/eval/golden-ak-runtime.mjs
tools/eval/map_check.json
tools/eval/mat_check.json
tools/eval/mat_scenes.json
tools/eval/pickup_check.json
tools/eval/pistol-hires-pilot-check.mjs
tools/eval/vm-gauntlet.mjs
tools/eval/vm_kick_sim.json
tools/eval/vm_mint_audit.json
tools/viewmodels/assemble_paid_family.mjs
tools/viewmodels/paid-pack-manifest.json
```

Já estavam modificados antes desta rodada e devem ser tratados como trabalho do usuário:

- `package-lock.json`;
- `public/models/viewmodels/coro/pistol-hires.glb`;
- `tools/blender/viewmodels/build_pistol_hires_pilot.py`;
- `tools/eval/pistol-hires-pilot-check.mjs`;
- os JSONs gerados de avaliação listados acima.

As mudanças experimentais desta rodada estão concentradas em:

- `public/js/authoredvm.js` — frame da X18;
- `tools/eval/golden-ak-runtime.mjs` — captura olhando para cima;
- `tools/eval/vm-gauntlet.mjs` — métricas, calibração, captura e mutante de silhueta;
- `tools/viewmodels/assemble_paid_family.mjs` — pose de apoio e escala declarativa;
- `tools/viewmodels/paid-pack-manifest.json` — parâmetros específicos da pistola.

Não faça commit automático desses cinco arquivos ao retomar. Primeiro inspecione o grid
pendente e decida quais experimentos sobrevivem.

## Próxima ação técnica

1. Abrir `/tmp/pistol-x18-frame-grid-2.png` e comparar horizonte, céu e recarga.
2. Escolher somente uma composição que mantenha a lateral da pistola legível e mostre os dois
   punhos/mangas. Se nenhuma servir, não continuar varrendo câmera: corrigir a pose de apoio no
   bake.
3. Identificar a peça retangular por nome, skin e joint no GLB; verificar se é o pente assentado,
   parte real da X18 ou classificação incorreta da sonda.
4. Tornar o gate de duas mãos específico para `idle`/`fire`. O gate atual procura separação em
   `idle + recarga` e pode ficar verde porque a segunda mão só aparece durante a recarga.
5. Provar o gate com mutação antes de corrigir o asset.
6. Rebuildar a X18 somente pelo pipeline reproduzível e repetir contrato, gauntlet, sheet com
   `olhar-cima` e smoke da AK.
7. Olhar as imagens. Só então criar commits pequenos e dar push no mesmo branch.

Comandos de referência:

```bash
cd /Users/ruben/csbrasil-worktrees/vm-retarget
python3 tools/viewmodels/build_paid_catalog.py --family pistol
node tools/viewmodels/assemble_paid_family.mjs --family pistol
node tools/viewmodels/optimize_paid_family.mjs
node tools/viewmodels/validate_paid_catalog.mjs
node tools/eval/pistol-viewmodel-contract.mjs \
  --runtime-report=artifacts/viewmodels/golden-pistol/runtime-side-readable-v1/runtime-report.json
node tools/eval/vm-gauntlet.mjs --armas=pistol --modo=kinemation \
  --largura=1440 --altura=960 --frames
node tools/eval/golden-ak-runtime.mjs --arma=pistol --largura=1440 --altura=960
```

Confirme os argumentos atuais dos scripts antes de reconstruir; não presuma que um comando
copiado deste handoff substitui `--help` ou a leitura do fonte.

## Prompt completo para reiniciar

```text
Continue o programa de viewmodels do CoroSolto a partir do handoff
`docs/reports/VIEWMODEL-CONTINUATION-HANDOFF.md` no worktree
`/Users/ruben/csbrasil-worktrees/vm-retarget`, branch `vm-cs16-gabarito`.

Antes de editar, leia integralmente `AGENTS.md`, as lições 1–5, 11, 12 e 14 de
`docs/LICOES.md`, `STATUS.md`, `VIEWMODEL_CONTRACT.md`,
`docs/reports/GOLDEN-AK-DECISION.md`, `docs/reports/GOLDEN-PISTOL-DECISION.md` e o
handoff. Rode `git status --short --branch`, confirme todos os worktrees e preserve
rigorosamente a working tree descrita no handoff. Não leia nem reimporte o rollout antigo
de aproximadamente 53 GB. Não descarte `package-lock.json`, binários ou JSONs gerados que
já estavam modificados.

A AK golden está aprovada e não pode regredir. Trabalhe somente na pistola. A captura do
dono de 14:28 prova que a candidata anterior é inaceitável: arma quase pelo eixo do cano,
silhueta de lâmina preta e braços dominantes. A trilha customizada com braços lisos/PVC foi
descartada. A rota ativa deve permanecer KINEMATION X18/G18 (`pistol#pistol`, runtime
`family`) até que evidência contrária justifique uma decisão registrada.

Comece abrindo `/tmp/pistol-x18-frame-grid-2.png`; ele foi renderizado, mas não inspecionado.
Compare horizonte, olhar para cima e 60% da recarga. O frame corrente é experimental e o
contact sheet ainda revela mão de apoio ocultada pela dominante e uma peça retangular junto
ao cabo. Identifique essa peça no GLB por nome/skin/joint. Se o grid não produzir dois punhos
legíveis com silhueta lateral convincente, pare de varrer câmera e corrija a pose de apoio no
bake.

Antes do conserto, estenda o gauntlet para exigir duas mãos em `idle`/`fire`, não apenas em
algum frame da recarga, e prove a régua com mutação. Depois rebuilda pelo pipeline
reproduzível, valida o GLB servido, draw, idle, fire, reload, pente, corrida, salto, parede e
olhar para cima no jogo real em 3:2. Gere e olhe o contact sheet. Rode regressão da AK. Não
declare a pistola golden sem aprovação visual explícita do Ruben.

Faça commits pequenos com trailer `Agent:` e push frequente para
`origin/vm-cs16-gabarito`, sem merge, force-push ou alteração de remote. Em cada atualização,
informe prova, causa, alteração, testes, capturas, falha restante e próxima ação concreta.
```

