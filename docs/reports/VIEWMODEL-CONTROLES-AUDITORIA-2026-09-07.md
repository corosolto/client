# Auditoria dos controles visuais — AK, pistola e faca

**Data:** 07/09/2026 · **Branch:** `glm/vm-controles-final` · **Base:** `d35c6658`
("docs(viewmodel): confirma fechamento local da faca"), ancestry confirmado:
descende da golden AK `1d33cb7b` e contém os 5 commits de fechamento da faca que
as lanes rifles (`f63e730f`) e precisão (`a988d72b`), divergentes de `961c70d2`,
não têm.

"Controle" aqui é o que o ledger sempre quis dizer: referência visual aprovada
ou tecnicamente verde — **não** estado final. Nada nesta auditoria promove
família, troca fonte padrão ou declara o arsenal pronto.

## Hashes conferidos (imutáveis durante toda a auditoria)

| Controle | GLB | SHA-256 |
|---|---|---|
| AK golden | `public/models/viewmodels/coro/ak-hires.glb` | `3b6ca23d…33df29` |
| Pistola | `public/private-assets/viewmodels/pistol/pistol-runtime.glb` (clone APFS local) | `edb77908…d17e05` |
| Faca | `public/models/viewmodels/coro/melee/knife-hires.glb` | `3e04fbcb…992621` (FOV 50°, marcos 30–31) |

O hash servido no jogo real (runtime-report de cada captura) bate com o arquivo
em todos os casos. Nenhum GLB foi alterado.

## Resultado por porta

| Porta | AK golden | Pistola | Faca |
|---|---|---|---|
| Contrato estrutural | verde (`ak-viewmodel-contract`) | verde (`pistol-viewmodel-contract` c/ runtime report fresco) | verde (`eval:melee-vm`, 4 réguas) |
| Reimport offline Blender | verde, 20+13 frames | verde, 20 frames | verde, 30 frames |
| Runtime 3:2 | verde (27 estados, walk/jump/parede) | verde | verde 27/27 + vídeo 225 frames + flash-check |
| Runtime 16:9 | verde | verde | verde 27/27 + vídeo |
| Gauntlet 3:2 | **verde** | vermelho P2 (ver §Abaixo) | fora do gauntlet por contrato |
| Gauntlet 16:9 | vermelho P1/P5 (geométrico, ver abaixo) | vermelho P4 (dívida conhecida) | idem |
| ADS | AD2 verde; AD1/AD3 não mensuráveis (sem Mint/sockets) | idem | não aplicável (melee) |
| Continuidade de mãos por time | fora do escopo v5 (AK não recebeu skins) | 121/121 | 121/121 |
| Identidade (check:vm) | verde c/ NOTAs | verde c/ NOTAs | régua própria (`melee-vm-check`) |

Evidências: `artifacts/viewmodels/audit-vm-controles/` (fora do Git):
`offline-{ak,knife,pistol}/`, `offline-ak-reload-detail/`, `runtime-{ak,pistol,knife}-{3x2,16x9}/`,
`gauntlet-*`, `hand-continuity-teams/`, `mut-knife-sem-ataque/`, `logs/`.

## Defeitos reproduzidos e consertados (só régua/harness; nenhum asset tocado)

### 1. Sonda do gauntlet dependia do PBR do material

`vm-gauntlet.mjs` pintava cor chapada mas só zerava `map`; normal/ORM/bump
ficavam ativos. Prova: geometria e enquadramento idênticos, a contagem de
pixels de mão variava 37.122 → 39.039 (+5%) conforme a presença de normal maps
do doador. A aprovação da pistola (3,890×) foi medida na era que subcontava;
as texturas `team-hands-5` (v5) removeram os mapas do doador e a régua mediu
4,047× sem mudança geométrica. Conserto: `pinta()` agora saneia
normal/bump/roughness/metalness/ao/alpha/displacement. Validação de
independência: `auditskin=off` + sonda corrigida mede exatamente 4,047× igual
à v5 (byte-a-byte nos contadores).

### 2. Régua de ADS (`authored-ads-check`) travava na golden

A entrega da golden (`a2396697`) tirou o wrap Mint e não trouxe
`SOCKET_MINT_*`; a espera por `mint.active` estourava 120 s e `check:vm`
(`eval:vm-ads`) morria na arma padrão. Conserto: espera a entry; com pontos
(Mint ou sockets) mede AD1–AD3 como antes (validado na M4: desvio 0,000,
colinear 0,00°); sem pontos (golden/pistola) mede AD2 pela caixa do
**esqueleto** (SkinnedMesh em bind pose não serve) e anota AD1/AD3 como não
mensuráveis. Sob mutante, entrada sem pontos reprova ("não discrimina") — a
régua nunca fica verde em silêncio.

### 3. Régua de identidade (`authored-identity-check`) idem + 3 bugs de era

Mesmo wait morto; e ao destravar expôs três suposições da era AKM/KINEMATION:
ID5 tratava `map === null` como placeholder (a golden não tem baseColor map
por contrato — "fatores de base e normal maps embutidos"); ID8 comparava o
clip como `'idle'` minúsculo (a golden chama `Idle`); ID1 tratava
`GEO_WEAPON_*` como pack genérico a esconder (na pistola assada
`GEO_WEAPON_PISTOL_SK_G18` é a arma licenciada). Tudo corrigido com NOTA
explícita onde a medida não se aplica e reprovação sob mutante em entrada sem
Mint (validado: M4 escala/pack-visivel falham; ak/pistol verdes com NOTAs;
`check:vm` 6/6).

### 4. Mutantes do contrato AK verdes cegos (lei 3)

`--mutante-sem-oclusor-frontal`, `--mutante-sem-ads-autorado` e
`--mutante-ads-cortado` passavam (exit 0) contra a golden porque os checks
correspondentes são condicionados ao AKM integrado (`!isAkm || …`) e a golden
não é AKM. Conserto: mutante que não pode discriminar neste alvo reprova com
motivo explícito. Os demais mutantes do contrato já mordiam.

## Achados abertos — decisão do dono, não consertados aqui

### A. Pistola 3:2 mede mãos/arma 4,047× contra teto 4,0×

Com a sonda honesta (§1), a silhueta real do candidato v5 mede 4,047×. O teto
4,0× foi calibrado na era que subcontava 5% dos pixels de mão. A referência
CS 1.6 (molde `usp`, régua igual, 1440×960) mede **1,9×**; a AK golden mede
0,73×. Não afrouxamos o teto (veto do dono) nem mexemos no frame aprovado a
15°: é decisão do dono re-derivar o teto da referência com a régua corrigida
ou mandar reduzir a massa de mão aparente. Reprodução:

```bash
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --largura=1440 --altura=960
node tools/eval/vm-gauntlet.mjs --modo=goldsrc --armas=pistol   # referência CS 1.6: 1,9×
```

### B. AK golden 16:9: P1 luva direita cortada e P5 topo na recarga

C6 preserva a meia-tangente horizontal: em 16:9 a golden renderiza na MESMA
escala por pixel (luva esquerda 18.726 px em 3:2 vs 18.729 px em 16:9) e o
canvas menor (810 vs 960) corta o que está abaixo/acima. A luva direita cai
de 4.705 para 1.602 px (mínimo 2.109) e a recarga encosta no topo (0 px de
margem; 43 px em 3:2). Consequência aritmética do enquadramento normativo
3:2 sobre o GLB congelado — a faca resolveu o equivalente com z=-0,25 e FOV
50° aprovados. Re-enquadrar a golden é decisão do dono (freeze vigente).
Reprodução:

```bash
node tools/eval/vm-gauntlet.mjs --modo=golden --armas=ak --largura=1440 --altura=810
```

### C. P4 da pistola em 16:9 segue sem amostra (dívida conhecida)

Pente máximo 75 px contra >2.000 exigidos (era 38 px antes da sonda corrigida
— melhorou, ainda insuficiente). O ledger já dizia: distância `null` não
significa mão desconectada e não autoriza reduzir o filtro.

### D. ADS das pistola/AK golden é só pull residual

Nem wrap Mint nem sockets de mira: o bloco de alinhamento do runtime
(`ads > 0.001 && wrap`) não roda; só o `pull 0,05` do vmconfig age. Na
referência CS 1.6 a AK não tem ADS, então não há regressão de comportamento
contra a referência — mas quem quiser sight picture real nas assadas precisa
de sockets numa futura revisão do bake (a golden é congelada por hash).

## Comparação com a referência CS 1.6 (moldes CC0, régua igual, 1440×960)

| Medida | AK golden | AK molde ak47 | Pistola KINEMATION | Pistola molde usp |
|---|---|---|---|---|
| arma/frame | 0,0628 | 0,0512 | 0,0070 | 0,0188 |
| diagonal arma/diagonal tela | 0,440 | 0,426 | 0,122 | 0,212 |
| pixels mão/arma | 0,73 | 0,913 | **4,047** | **1,9** |
| quadrado central | 0 px | 0 px | 0 px | 0 px |

Nenhum pixel da Valve foi usado: os moldes goldsrc-vm são CC0 com procedência
em `public/models/viewmodels/FONTE.md`; a comparação é numérica, pela mesma
sonda. A AK golden continua colada na referência (0,440 vs 0,426 de diagonal);
a pistola mantém a desproporção mão/arma ~2× acima da referência (achado A).

## Mutantes executados (todos saem 1, como exigido)

- Contrato AK: pente-ausente, gatilho-estatico, final-reload-aberto,
  ferrolho-estatico, sem-oclusor-frontal†, sem-ads-autorado†, ads-cortado†
  († agora falham; antes passavam em silêncio).
- Contrato pistola: cano-vertical, pente-estatico, quadro-antigo,
  runtime-quadro-antigo, timing-cs16.
- Gauntlet: AK tiro-estatico/sem-pente/draw-idle; pistola
  sem-mao-apoio/pente-estatico/sem-arma (pós-correção da sonda).
- Identidade: m4 escala, m4 pack-visivel, ak escala (não-discrimina).
- ADS: ak sem-ads (não discrimina — falha como deve).
- Faca: melee-motion sem-clamp/evento-antigo/quadro-antigo/flash-externo;
  melee-vm sem-construtor; approved-attacks mesmo-golpe; atlas
  punho-descoberto/dedos-cobertos; browser sem-ataque (falha em quick/heavy
  no meio da ação, clauses certas).

## Reprodução da auditoria inteira

```bash
export PATH=/opt/homebrew/bin:$PATH
# ambiente: node_modules -> ../vm-fable51-pistol/node_modules (symlink,
# somente leitura) e clone APFS de public/private-assets/viewmodels do
# worktree aprovado (vm-astra-pistol), hash conferido.

# estáticos
node tools/eval/ak-viewmodel-contract.mjs
npm run eval:melee-vm

# reimport offline (Blender 5.2)
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/blender/viewmodels/qa_runtime_glb.py -- \
  --glb=public/models/viewmodels/coro/ak-hires.glb \
  --saida=<dir> --clipes=Equip,Idle,Shoot,Reload --largura=1440 --altura=960
# (idem knife-hires.glb com Idle,Draw,Slash,Stab,QuickThrust,HeavyStab e
#  pistol-runtime.glb com idle,shoot,reload_tactical,reload_empty)

# runtime (um browser por vez; --browser=chrome neste host)
node tools/eval/golden-ak-runtime.mjs --browser=chrome --porta=8361 --saida=<dir>            # AK 3:2
node tools/eval/golden-ak-runtime.mjs --browser=chrome --porta=8361 --arma=pistol --modo=kinemation --saida=<dir>
node tools/eval/golden-ak-runtime.mjs --browser=chrome --porta=8361 --largura=1440 --altura=810 …   # 16:9
node tools/eval/melee-runtime.mjs --browser=chrome --porta=8362 --largura=960 --altura=640 \
  --video --flash-check --saida=<dir>        # faca 3:2; 960×540 para 16:9
node tools/eval/vm-hand-continuity-runtime.mjs --browser=chrome --reload --inspection --saida=<dir>

# réguas de jogo real
node tools/eval/vm-gauntlet.mjs --modo=golden   --armas=ak     --porta=8363 --out=<dir>
node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --porta=8363 --out=<dir>
node tools/eval/vm-gauntlet.mjs --modo=goldsrc  --armas=ak,pistol --porta=8363 --out=<dir>
node tools/eval/authored-identity-check.mjs --armas=ak,pistol,m4 --porta=8378
node tools/eval/authored-ads-check.mjs --armas=ak,pistol --porta=8368

# gates
npm run check:vm
npm run check:fast
npm run build
```

## O que NÃO foi verificado

- Contato 3D interno (penetração/empunhadura integral) além das medidas
  contratuais e da inspeção das folhas — as superfícies oclusas continuam
  inconclusivas, como no marco 14 do ledger.
- Vídeos assistidos quadro a quadro (450 frames); a inspeção foi por folhas,
  estados e cláusulas do relatório, como nos marcos 26/31.
- Blends celulares/ultrawide e todo o arsenal fora dos três controles.
- Aprovação estética em nome do dono: os achados A–D são dele decidir.
