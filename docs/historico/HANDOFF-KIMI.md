# HANDOFF — sessão Kimi (21/07) — estado do CS BRASIL

Documento de continuidade. Se esta for uma sessão nova, leia isto primeiro: aqui está onde paramos e o que vem a seguir.

## 🔄 ATUALIZAÇÃO 31/07 #28 (Claude) — v3.0.0: **A RÉGUA MUDOU** — consistência > fidelidade

**Esta entrada é a mais importante do documento. O dono jogou 3 dias e mudou a direção do projeto.** Palavras dele: *"as armas ganharam realismo mas perderam identidade... o mais importante de todos esses jogos [CS 1.6, ev.io, VALORANT] é a CONSISTÊNCIA de jogo, e o flow ser bom... o nosso está tudo quebrado... o usuário não pode notar todos esses bugs, ele tem que se preocupar em jogar e não com bugs. Às vezes é melhor ter um valor visual mais simples, mas mais consistente pro jogo."*

- **Régua nova: `tools/eval/BAR-CONSISTENCIA.md`** (25 critérios de consistência e flow) tem PRECEDÊNCIA sobre a `BAR.md` (fotorrealismo). **Melhoria visual que quebra o jogo é REGRESSÃO.** Ordem de prioridade: não ter bug perceptível > flow > legibilidade > identidade > beleza.
- **Erro de método admitido:** rodaram-se 3 gauntlets de fidelidade medindo L\* e saturação em frame parado enquanto o jogo estava quebrado em movimento. Crítico de screenshot não pega "mão solta no ar na recarga", "no ADS não vejo a arma nem a mira", "morri e não sei de onde veio". E **fan-out de 8 agentes num sistema de coerência (arma+mão+animação+ADS+mira+HUD) produziu 13 regressões numa rodada** — foi o método que criou a inconsistência que o dono reclamou. Fan-out só para coisas independentes (4 mapas em 4 arquivos). Sistema interconectado = um agente, sequencial.
- **PORTÃO NOVO — `tools/eval/invariants.mjs`.** Roda em node puro, ~3 min, imprime PASS/FAIL. **Nada commita com invariante vermelha, e todo bug que o dono reportar vira invariante permanente.** Foi a falta disso que criou o ciclo de 3 dias (cada rodada consertava uma coisa e quebrava outra, e só se descobria uma rodada depois). Estado: **10/10 críticas verdes**.
- **Arneses em NODE PURO (sem Chrome, que custa ~4 min por carga de mapa):** `botsim.mjs` (classe Game real + mapas reais, 45 s × 4 mapas × 3 sementes em ~10 s; modos SIM_CTF/SIM_DUEL), `vmrig-test.mjs` (rig de viewmodel a 240 Hz), `tp-mount-probe.mjs` (mount de 3ª pessoa com parser de GLB próprio).

**ARMAS — a causa raiz de "26 armas com visual igual", achada e corrigida:** a 3ª pessoa já usava os **26 GLBs da Mint**, um por arma, com `len`/`rot`/`gripZ` medidos em `weapons.js`. A 1ª pessoa usava OUTRO pipeline: 8 GLBs-herói da Tripo (18 MB cada) + kit procedural sobre ~5 malhas base. 26 identidades viravam 8+5. O viewmodel migrou para os mesmos 26 GLBs da Mint (250-900 KB por arma; o lazy-load deixa de ser necessário e o risco de OOM sai do caminho). Tripo intacta atrás de `?tripovm=1`.
- **Trava de borda do viewmodel:** o probe mediu a caixa do VM indo até NDC x 2,11 com centro em 1,17 — a arma estava mais fora do quadro do que dentro. Causa geométrica: a coronha é o ponto mais perto do olho e é o que projeta mais largo. Resolvido pela desigualdade `(Zg·tanH)/(Zg−back) ≤ NEAR_X·halfTanH` + `tanH` 0,600 → 0,460. Coronha ≤ NDC 0,94, boca 0,19-0,46, nas 26 armas e nos 2 aspectos.
- **`p90` estava invertida no GLB** (ponta +Z era a grossa) — corrigido no `rot`; o curativo `vmRotY`, que só consertava a 1ª pessoa, foi removido.
- **`uzi` len 0,60 → 0,47**: a "UZI maior que o corpo do Hipster" não era mount (fator 1,00, o mais exato do elenco) — era proporção do GLB (altura/comprimento 0,69, a maior do arsenal).
- **PENDÊNCIA REAL, não varrida:** os braços FP de `buildFPArms` entram com escala herdada do pipeline Tripo e viram uma massa sem forma de mão. `gripErrR = 0,001 m` prova que o cálculo do grip está certo — o errado é o TAMANHO do braço, que é rig a refazer. **Padrão no caminho Mint = arma sozinha**; `?hands=1` religa pra continuar o trabalho.

**3ª PESSOA:** "Coach com a arma pra trás", "Dollynho sem arma", "Ancap e ET segurando errado" eram UM defeito de método: o cano vinha da linha antebraço→mão e ficava entre −21° e −35° (apontado pro chão) nos **27** personagens. Agora vem do corpo (yaw +4°, pitch −6°) e o grip vai no centro medido da palma. Dollynho tinha a palma a 0,05 m do eixo contra 0,185 m de raio da garrafa — a arma nascia DENTRO do corpo.

**BOTS — todas as reclamações viraram número e entraram no alvo:** flips laterais 16,4 → **10,8**/min; giros 0,32 → **0,23**/min; preso 9,2% → **1,1%**; janela entre o 1º tiro e a morte **1,26 s → 3,65 s**; headshot 0,003; acerto 0,16. Mais: indicador direcional de dano com 4 arcos na borda por 1,5 s + tique panoramizado, e marcador de time com **duas formas, não só cor** (halo contínuo × tracejado, chevron cheio × vazado) — resolve bolsonaristas × bolsonaristas.

**MAPAS/MODOS:** `ctfOnly` (que travava) virou `ctfMode` (só define o padrão) e o badge de modo virou **botão**. **Piscinão → Piscina da Treta**: o dono reprovou ("é o pior mapa de todos, muito poluído"), então voltou o salão fechado do CS 1.6 do commit `7871a7b` (328 linhas contra 1.887); a versão temática está preservada em `map_pool_ramos.js`, fora do registro. **Havan → LOJA H** (constante `LOJA_NOME`). **Armário de armas**: eram ~52 props deitados no chão ENTRE o spawn e o centro do mapa (a faixa que o critério C4 manda deixar limpa); agora ficam atrás do spawn, em cima de mesas, em 2 fileiras de ±5,5 m. **God rays do ferro velho desligados por padrão** — efeito de recinto fechado que a céu aberto lê como cunha translúcida cortando o quadro.

**PRÓXIMO PASSO:** o dono responde `TESTE-5MIN.md` (8 perguntas sim/não). Cada "não" vira invariante. Depois: rig dos braços FP, `motion.mjs` (tira de frames + traços numéricos para as 5 invariantes que exigem pixel), e as ideias novas dele (2 times a mais, +1 jogador por time, modo novo).

**NÃO PUSHAR.** Todo o trabalho está em commits locais na branch `feat/evio-feel`; `main` segue em `origin/main`. O dono não quer o v2/v3 público antes de jogabilidade, UI e armas estarem redondas.

## 🚨 ATUALIZAÇÃO 31/07 #27 (Kimi, G2-R14 — FEEDBACK CRÍTICO DO DONO) — v2.2.0: crash OOM morto + armas FUNCIONAIS — gate 17/17

**O dono jogou 2 dias e interrompeu o gauntlet com: crash no CTF da Havan (Chrome "Aw Snap" err 15), armas grandes demais/"apontam pro outro lugar", shotgun sem ADS, piscinão poluído (skate sem sentido), respawns sem proteção física central. TUDO resolvido:**

- **CRASH = OOM do renderer (causa raiz medida)**: o preload baixava 13 arms_*.glb de uma vez (322MB heap no boot; pistol sozinha tinha texturas 4K = 255MB GPU). FIX 1 (R14A): **lazy-load** das VMs (só a classe da arma equipada + cache; boot 322→162MB). FIX 2 (R14C): **compressão** das 15 GLBs (simplify seguro 0.45/0.0005 + tex ≤1024): disco ~300→134MB, tris ~650K→~295K por GLB, pistol 4K→1024. **Heap boot 322→110MB (-66%), estado final 324→188MB.** Gate: 180s de CTF real na Havan sem crash, heap plano 110-145MB.
- **Armas funcionais (R14A)**: VM_SHRINK 0.72 global (-28% aparente); TODOS os yaws achatados pra ≤0.09 (cano colado na linha de mira — identidade vem do modelo, não do ângulo); shotgun ganhou ADS (estava explicitamente bloqueada no `_scope()`; agora AUG-style + zoom 44).
- **Lição G2**: a busca por "identidade via exposição lateral" (yaw 0.24-0.38) era a Causa do "mira num lugar, arma aponta pro outro" — funcional > exposição. O dono validou a direção "bonito E prático".
- **Piscinão declutter (R14B)**: skate park REMOVIDO (3 quarter-pipes + rail + muro + placa), guarda-sóis 34→26, chinelos/lixo/cadeiras pela metade. Faixa oeste virou areia livre.
- **Respawns físicos (R14B)**: Havan = 6 carros em pares escalonados na faixa central do estacionamento; ferro = 4 peças nas lanes centrais. map-check 0/0 nos 3 mapas.
- **Estado das heróis: 8 dedicadas** (AK/M4/MP5/AWP/P90/TAVOR/FAMAS/SVD) + UZI no kit (Tripo não produz mag-no-grip). Bug de integração lazy-load×R13 corrigido pelos 2 builders (dedMissing + pendência por classe+herói).
- **Lição de harness**: Chrome headless ZUMBI de runs falhas come 200%+ CPU (load 183) — matar por metrics-client-id; "countdown travado" era carga.
- Gate v2.2.0: **17/17 PASS** (4 mapas boot/LOS/A*/CTF 180s + smoke splash/música/25 armas com lazy-load + loading não trava).
- **PENDENTE**: confirmação do dono (crash + feel das armas menores/alinhadas). Frente identidade formalmente 7.0-7.5 (últimos 2 críticos) — a régua 8 pode ter ficado obsoleta com a nova direção do dono (funcional > identidade pura).

## 🎯 ATUALIZAÇÃO 31/07 #26 (Kimi, G2-R13 — builder) — v2.1.0: SVD-herói + paleta carbine/m92 + INTEGRAÇÃO R14A

**Rodada com CONCORRÊNCIA: outro builder (G2-R14A) editou o game.js no meio do caminho. Estado final integrado verificado.**

- **GAP1 (framing das compactas) — SUPERSEDED pelo R14A (corretamente)**: eu tinha tunado yaw 3/4 (~0.33-0.38) pra expor features (mag topo p90, mag trás tavor/uzi). O dono reclamou em paralelo "mira num lugar, a arma aponta pro outro" — o R14A achatou TODOS os yaws pra ≤0.09 (cano colado na linha de mira; identidade vem do modelo/textura/attachments, não do ângulo) + VM_SHRINK 0.72 global (-28% aparente — "armas tomam a tela"). A direção do R14A é a certa (funcional > exposição). O que sobrou da minha parte: a arquitetura de framing por ARMA (VM_FWD[key] — uzi-kit e m92-kit com entradas próprias) e o muzzle recomputado por variante com framing próprio.
- **GAP2**: carbine DESSATURADA (flatWoodT [130,64],[94,40],[70,30] — noz marrom, era mel laranja-plástico); m92 com nogal CLARO (luma ~0.35, separa da g3) + VM_FWD.m92 própria expondo a alavanca; lmgbox com costuras (3 frisos). 
- **GAP3 — herói SVD LIGADA** (Tripo `1094c10a`, arms_svd.glb 18.7MB): coronha esqueleto de madeira + PSO-1 + cano fino — tells fortes. DED_VM['svd'], kill-switch ?nosvd=1, flash na boca. SKS: baioneta 0.30→0.42 mais pra frente.
- **BUG de integração (achado e corrigido por mim; fix complementar pelo R14A)**: com o lazy-load do R14A, as heróis de armas NÃO-iniciais nunca carregavam (a variante de classe já ocupava staticVms[key] — m4/svd liam como kit). Meu fix: gatilho `dedMissing` no _applyVmVisibility. O R14A fez o complemento em paralelo: pendência por classe+herói (a 1ª pendência da classe abafava as seguintes — m4 ok, mp5/p90 bloqueadas). OS DOIS fixes são necessários e estão no arquivo.
- **Lição de harness**: Chrome headless ZUMBI de runs que falharam comia 200%+ CPU (load average 183!) — matar a instância por metrics-client-id quando uma captura morre sem browser.close(). O "countdown travado" era carga, não bug.
- Verificação: blind-capture 26 (seed 66) 0 erros, smoke 8 heróis (ak/m4/mp5/awp/svd/p90/tavor/famas) TODAS dedicadas visíveis com wait de lazy-load no g2r7b-smoke, carbine noz/m92 clara+alavanca/lmg costurada, svd×sks separados. tools/eval/g2r7b-smoke.mjs agora espera _staticVmDed.has(w) antes de capturar.

## 🎯 ATUALIZAÇÃO 30/07 #25 (Kimi, G2-R12 — builder) — v2.0.0: UZI revertida pro kit + wear por arma + attachments PBR

**Crítico 7.5/10 (cego 18.5/26, par-cego 3/6). 3 GAPs + 1 menor:**

- **GAP1 — UZI-herói REVERTIDA pro kit procedural**: 2 gerações Tripo sem o tell "mag no grip" (v1 lia AKS-74U com folding stock; v2 com prompt cirúrgico "magazine INSIDE the pistol grip, no tower, stubby" veio compacta mas mag continua mid-body — o tell é estrutural, nenhum framing cria). O kit (rifle mesh + uzimag no grip + uzimagcover + dScale 0.78) tem a mag no grip VISÍVEL — mais UZI que a herói. `uzi` removida do DED_VM e do preload; `arms_uzi.glb` (v1) fica no disco sem uso; `arms_uzi2.glb` (v2) arquivada em /tmp. Lição: Tripo text-to-3D tem viés forte de "SMG genérica moderna" — tells estruturais específicos (mag-no-grip) não saem nem com prompt explícito; pra esses casos o kit procedural com attachment dedicado é superior.
- **GAP2 — wear por arma**: o rifle_orm_wear compartilhado dava crackle IDÊNTICO em 6+ rifles. Novo variant `wearpergun` no vm-variant-tex.mjs: mesma value-noise do wearorm, seed = 1337 + FNV(nome) — `rifle_orm_<arma>.webp` por arma (10 arquivos, lmg incluída). Wiring: orm por arma no RIFLE_VM + preload. Comparativo visual: /tmp/orm_compare.png (nuvens de desgaste distintas por arma).
- **GAP3 — attachments PBR**: lmgbox de mat(0x1c1e1c, met 0.15 — "cubo preto chapado") pra mat(0x2e3236, met 0.55, rough 0.5); mount do bipé de dark pra gunmetal. Menor: lever da m92 maior e mais alta (torus 0.058→0.068, h -0.10→-0.055 — a mão cobria no framing R8).
- **Estado das heróis: 7 dedicadas** (AK/M4/MP5/AWP/P90/TAVOR/FAMAS) + UZI no kit procedural.
- Verificação: blind-capture 26 (seed 42) 0 erros, trio uzi×lmg×m92 e wear g3×m92×carbine em montagem, 3:2 uzi, smoke heróis limpa. (blind-capture.mjs: screenshot timeout 30s→90s — flake sob carga; 2 crashes transitórios antes de passar limpo.)

## 🔫 ATUALIZAÇÃO 30/07 #24 (Kimi, G2-R11B — builder) — v1.99.0: heróis TAVOR + FAMAS (bullpups completam o desbloqueio)

- **As 2 ligaram** (30 créditos cada, /tmp/tripo-{tavor,famas}): `public/models/fpvm/arms_{tavor,famas}.glb` (~18.5MB, ~355K verts). TAVOR = bullpup moderna com rail flat e mag atrás do gatilho; FAMAS = a alça de transporte ARQUEADA veio perfeita (inconfundível). Malhas íntegras na órbita.
- **Armadilha do tip (tavor)**: o slab em Z pegou a mão da frente (muzzle y=-0.211 baixo) — bore real = 1% dos vértices mais distantes AO LONGO do eixo ([-0.463, 0.291, 0.377], validado com landmarks no mzmarks). O EIXO ficou o do slab (framing já estava bom); só o `tip` mudou (flash na boca). Famas: slab serviu de primeira.
- Framing (bullpup = arma inteira no quadro): tavor yaw 0.278 roll 0.029 pitch -0.018 pos [0.20,-0.13,-0.38] s 0.44; famas yaw 0.262 roll -0.097 pitch 0.011 pos idem s 0.44. Kill-switches ?notavor=1/?nofamas=1.
- Verificação: lado a lado ×g3 (`g2r11b-pair-{tavor,famas}xg3.png`) e ×kit antigo (`-novavold`), 16:9+3:2+flash na boca, smoke heróis limpa, blind 26 (seed 23) 0 erros.
- **Estado das heróis: 8 dedicadas** (AK/M4/MP5/AWP/P90/UZI/TAVOR/FAMAS). Blob restante do crítico: g3/m92/lmg + shotguns (md97) + pistols (deagle/revolver38).

## 🔫 ATUALIZAÇÃO 30/07 #23 (Kimi, G2-R11 — builder) — v1.98.0: heróis P90 + UZI (blob SMG desfeito)

- **As 2 gerações vieram boas e as 2 ligaram** (30 créditos cada, tasks em /tmp/tripo-{p90,uzi}): `public/models/fpvm/arms_{p90,uzi}.glb` (~18MB, ~350K verts cada). P90 = bullpup compacta com mag horizontal no TOPO do receiver; UZI = SMG compacta boxy com coronha dobrável (a mag-no-grip clássica não veio — veio mag à frente do gatilho, mas compacta e distinta, aprovada). Malhas íntegras na órbita (dedos, sights, mag da p90).
- **ARMADILHA NOVA (p90)**: o slab em Z do gun-space mediu o eixo errado (z-dominante) — o cano da p90 corre em **-X subindo** no model space; refeito pelo trilho do cano em fatias de X (bore = centro do muzzle brake x∈[-0.475,-0.42]). Sintoma: arma de topo/bore pra câmera que nenhum yaw consertava (igual à MP5 na R7B). UZI: slab em Z serviu de primeira.
- **Framing "SMG mostra a arma INTEIRA"** (é o que diferencia de rifle): p90 yaw 0.242 roll -0.05 pitch 0.125 pos [0.20,-0.13,-0.38] s 0.44; uzi yaw 0.235 roll -0.13 pitch 0.067 pos [0.20,-0.13,-0.38] s 0.42 (sweep view-space, g2r8-sweep com SETs explícitos p90/uzi).
- Wiring: `DED_VM += { p90:'p90', uzi:'uzi' }` (kill-switches ?nop90=1/?nouzi=1), preload fparms, `VM_GUNSPACE.{p90,uzi}` — muzzles validados em mzmarks + flash na boca nos 2 aspects.
- Verificação: lado a lado novo×kit (`g2r11-pair-{p90,uzi}-novavold.png`) e ×rifle g3 (`g2r11-pair-{p90,uzi}xg3.png` — claramente compactas), 16:9+3:2+flash, smoke ak/m4/mp5/awp limpa, blind 26 (seed 91) 0 erros.

## 🎯 ATUALIZAÇÃO 30/07 #22 (Kimi, G2-R10 — builder) — v1.97.0: SMGs menores de verdade + trio sniper + madeira lisa

**Crítico 7.5/10 (falta 0.5). 3 GAPs + 1 bug preexistente:**

- **GAP1 — "alegado ≠ visível" das SMGs (diagnóstico)**: o dScale uzi/p90 ESTAVA aplicado (probe: 0.36/0.383) — mas o dPos z+ aproximava a arma e COMIA a redução aparente (tamanho na tela ∝ escala/|z|): uzi lia só ~12% menor, p90 ~8%, e a mp5-herói lia MAIOR que um rifle (0.48/0.39=1.23 vs 1.07 do g3). Fix: uzi 0.78 sem avançar z (aparente ~0.84), p90 0.85 idem (~0.91), mp5-herói 0.48→0.41 + z -0.40 (-15% aparente). E a boca do cano passou a recomputar por variante com dScale/dPos (o flash ficava na posição da classe). Pares provados: uzi×g3, p90×tavor claramente menores.
- **GAP2 — trio sniper svd/sks/g3sg1**: a madeira da SKS existia na textura mas era área pequena atrás da luva (o texel-classifier só repintava madeira existente). Fix: acabamento `skswood` por REGIÃO gun-space (corpo de madeira até t 0.58 — a SKS inteira lê madeira agora) + attachment `sksclip` (pente no topo) + SVD esqueleto maior + G3SG1 `g3sg1guard` (handguard largo) + `bipod` reusado do lmg. Trio separa: SVD preta+PSO-1, SKS madeira, G3SG1 cinza-verde larga.
- **GAP3 — "mármore trincado"**: a textura base do arms_rifle É camuflada verde — os patches escuros caem no classificador de LUVA (isGloveHue) e escapam do acabamento (por isso a carbine lia camo mesmo com flatWoodT). Fix: `weaponTest` bypass SÓ na carbine (!isSkin — luvas seguem protegidas pela proximidade 3D da pele) + madeira mel lisa por região (corpo t<0.55, receiver/mag/cano metal). m92 manteve o default (escuro esconde a fronteira).
- **BUG preexistente**: `_splashSetReady` (failsafe 20s da splash) crashava "textContent null" depois da splash sair do DOM (banner vermelho em sessões longas/debug) — guarda de null em main.js.
- Verificação: blind-capture 26 (seed 55) 0 erros, pares uzi×g3 / p90×tavor / trio svd×sks×g3sg1 / carbine×m92 em montagem, 3:2 uzi+sks, smoke heróis limpa, muzzleCls.awp intacto.

## 🎯 ATUALIZAÇÃO 30/07 #21 (Kimi, G2-R9 — builder) — v1.96.0: paleta divergente + SMGs + M4 two-tone

**Crítico 6.5/10; snipers/TAVOR/heróis/pose-rifle encerrados. 3 GAPs corrigidos:**

- **GAP1 (decisivo) — paleta DIVERGENTE nas regiões grandes de UV** (vm-variant-tex.mjs, os acabamentos convergiam pra laranja/marrom): akm = corpo PRETO com SÓ o mag bakelite laranja; m92 = nogal escuro fosco + aço azulado escuro (a 1ª versão com azul forte leu "brinquedo" — B 95→62); carbine = madeira mel clara; p90 = polímero preto; famas = cinza-verde; tavor = textura própria `rifle_tavor` polímero preto (era rifle_famas); g3 oliva intacta. **Meu teste dos 3 pares que falhavam (cells do blind seed 31): akm×m92 (preto+mag laranja × nogal/aço azulado), p90×g3 (preto compacto+mag no topo × oliva coronha larga), tavor×famas (bullpup preto × cinza-verde com carry handle) — os 3 separam à primeira vista por FORMA+COR.** Montagens em /tmp/gauntlet/g2r9/pair-*.png.
- **GAP2 — SMGs leem como SMGs**: dScale/dPos por arma generalizado no transform do VM (era só classe awp — agora qualquer variante): uzi 0.80, p90 0.85 (eram "corpo de rifle gigante"). p90mag horizontal subiu (h 0.16→0.185) e alongou — recorta a linha do receiver no framing novo.
- **GAP3 — M4-herói two-tone**: `tools/m4-twotone.mjs` — edita a textura baseColor DENTRO de arms_m4.glb (FDE tan no handguard em gun-space, receiver preto, mãos/luvas preservadas pelo classificador pele/oliva). Sem mudança de runtime; backup em /tmp/arms_m4_backup.glb.
- Verificação: blind-capture 26 (seed 31) 0 erros, 3:2 (uzi/p90/akm), smoke heróis ak/m4/mp5/awp limpas, muzzleCls.awp intacto.

## 🎯 ATUALIZAÇÃO 30/07 #20 (Kimi, G2-R8 — builder) — v1.95.0: TIER 2 de identidade (framing + TAVOR + pares)

**Crítico 5.5/10 na identidade; heróis aprovadas (7.5-8). 3 GAPs corrigidos:**

- **GAP1 (central) — fim do "coronha-na-cara"**: a pose da classe rifle mostrava coronha+traseira e escondia as MÃOS — elas ficam ABAIXO da linha inferior do quadro na pose antiga (py -0.13). Descoberta-chave: não era ângulo, era ALTURA — subir a arma (py -0.13→-0.08) trouxe as mãos pro quadro. Receita aplicada nas 3 classes (tunada em VIEW-SPACE com g2r8-sweep.mjs — o euler do VM_FWD é em MODEL space e os eixos trocam conforme a orientação baked; o sweep converte e imprime o euler model-space pra colar no código): rifle (yaw 0.261 roll -0.071 pitch 0.065, pos [0.18,-0.08,-0.42], s 0.45), shotgun (0.265/-0.078/0.037, [0.19,-0.09,-0.44], 0.42 — pump/tube agora lê), awp-classe (0.254/-0.053/0.012, [0.17,-0.10,-0.43], 0.46 — mão no grip + ferrolho da mosin leem). Cano pra frente preservado (sem regressão do "armas invertidas"). ADS intacto.
- **GAP1b — muzzle da shotgun calibrado**: o slab em Z do gun-space pega a MÃO da pump (o flash nascia na coronha). Bore = 1% dos vértices mais distantes AO LONGO do eixo: `VM_GUNSPACE.shotgun.tip = [-0.251, 0.335, 0.476]`; a recomputação de classe agora usa `tip || muzzle`. rifle/awp conferidos (slab já estava certo).
- **GAP2 — TAVOR/FAMAS**: attachments de identidade (tavorbody/mag/shroud, famashump) de `black` (0x101214 — lia "caixa preta sem textura") pra `gunmetal` (0x2a2d30, casa com o corpo) + tavorbody ~15% mais estreito. Com o framing novo o corpo estendido da TAVOR lê como bullpup, não como caixa.
- **GAP3 — pares separados** (tools/vm-variant-tex.mjs, mesmas regiões gun-space): `rifle_m92` (nogal + aço azulado escuro — era rifle_ak, lia como AK; a alavanca+cano longo já existiam), `rifle_carbine` (madeira clara M1 + parkerizado — era rifle_lift, lia como uzi), `pistol_polymer` (polímero preto na base — separa da deagle cromada). Preload do fparms + entradas RIFLE_VM/base pistol atualizadas.
- **Lição de harness**: NÃO rodar duas sessões headless pesadas em paralelo no serve.mjs — a concorrência derruba o boot (pageerror "textContent null" no load-overlay / timeout 60s). Sozinhas, todas limpas.
- Verificação: blind-capture 26 (seed 77) em /tmp/gauntlet/g2r8, pares akm×m92 e uzi×carbine em montagem, smoke heróis ak/m4/mp5/awp intactas, muzzleCls.awp preservado, 0 erros console (rodadas solo).

## 🔫 ATUALIZAÇÃO 30/07 #19 (Kimi, G2-R7B — builder) — v1.94.0: heróis M4/MP5/AWP ligadas (escala da prova AK)

- **As 3 gerações vieram boas e as 3 ligaram** (30 créditos cada, tasks em /tmp/tripo-{m4,mp5,awp}): `public/models/fpvm/arms_{m4,mp5,awphero}.glb` (~18MB, ~350K verts cada — mesmo optimize-fpvm). Malhas validadas em órbita: rail+red dot da M4, mag fina+cocking tube da MP5, luneta+cano fluted da AWP — dedos/sights intactos. Prompts moderados (silhueta, sem nome/calibre) passaram de primeira; a AWP-herói é o arquivo `arms_awphero.glb` — NÃO sobrescreve a arms_awp.glb da classe (que segue servindo mosin/rem700/m400/svd/g3sg1/sks).
- **Wiring generalizado** (game.js): `DED_VM = { ak:'ak', m4:'m4', mp5:'mp5', awp:'awphero' }` — chave arma → chave de template/gun-space/VM_FWD. Kill-switches `?nom4=1`, `?nomp5=1`, `?noawp=1` (padrão do `?noak=1`). Detalhe: na classe awp a herói ocupa a chave-base ('awp'), então a boca da CLASSE é medida num clone do template da classe com o transform da classe (senão as outras 6 snipers herdariam o muzzle da herói — verificado: muzzleCls.awp intacto no smoke).
- **ARMADILHA NOVA (MP5)**: o cano dela corre ao longo de -X no model space — (a) o medidor de gun-space por slab em Z falha (pega dedos); medir seguindo o TRILHO do cano em fatias do eixo dominante; (b) no euler LOCAL do VM_FWD os papéis trocam: "roll" vira elevação do cano e "pitch" vira rolagem — a MP5 usa roll -0.24 (elevação) onde AK/M4/AWP usam -0.07. Sintoma de eixo errado: arma "deitada lateral" na tela que yaw nenhum conserta.
- Framing final (VM_FWD): m4 = ak-like (0.02/0.28/-0.07, pos [0.19,-0.12,-0.37], s 0.54); mp5 = (0.02/0.28/-0.24, pos [0.21,-0.13,-0.39], s 0.48); awphero = ak-like. Muzzles: os 3 tips do gun-space medido caíram certos de primeira (sem contaminação de dedos na ponta — validado com tools/eval/g2r7b-mzmarks.mjs).
- **Verificação** (/tmp/gauntlet/g2r7b-*): hip+mãos+flash+ADS em 16:9 e 3:2 pra cada herói, side-by-side vs versão antiga (`g2r7b-sidebyside-{m4,mp5,awp}.png` — vitória clara das 3), ADS preservado (rifle AUG-style sai da tela; AWP com luneta real), smoke 11 armas fora das dedicadas inalteradas, console limpo em ~15 sessões headless. Tools novas: g2r7b-sweep.mjs (framing), g2r7b-mzmarks.mjs (muzzle), g2r7b-capture.mjs (hip/mãos/flash/ADS), g2r7b-smoke.mjs.
- **Estado das heróis**: AK/M4/MP5/AWP dedicadas fotorreal. Próximas candidatas se o dono quiser continuar: deagle, shotgun (md97), famas/p90 (silhuetas fortes).

## 🔫 ATUALIZAÇÃO 30/07 #18 (Kimi, G2-R7 — builder) — v1.93.0: AK-HERÓI TRIPO DEDICADA ligada (prova de conceito APROVADA)

- **Prova de conceito de arma-herói por GLB dedicada** (o caminho apontado na #17 pra identidade ≥8): `public/models/fpvm/arms_ak.glb` — arms+AK-47 gerados numa peça só via Tripo text-to-3D (`v3.1-20260211`, texture detailed, **geometry standard**, 30 créditos, task `fa345413`). Prompt moderado depois de um 400 code 2008 (content policy): "AK-47" e calibre explícito disparam moderação — descrever a silhueta ("classic wooden assault rifle with curved magazine") passa. Pose de mira horizontal pra frente obrigatória (igual à saga do arms_rifle).
- **Otimização segura** (mesma da saga): weld tol 0.0005 + simplify ratio 0.45 err 0.0005 + tex 512 webp = **19MB, 349K verts** (`tools/optimize-fpvm.mjs`, novo — o optimize-static.mjs antigo usa error 0.02, que destrói). Malha validada em órbita (`tools/eval/g2r7-orbit.mjs`): dedos, front sight, gas block e mag curva intactos.
- **Wiring só pra `ak`** (as outras 12 rifles seguem no kit): fparms preload ganha classe `'ak'`; `VM_GUNSPACE.ak` medido (`tools/g2r7-measure.mjs`); game.js clona o template dedicado na variante `ak` da classe rifle **sem** textura-variante/attachments (a GLB já nasce AK) — só material fix global. `?noak=1` = A/B reversível pro dono. Framing próprio (`VM_FWD.ak`, yaw POSITIVO 0.28 — muzzle varre pra esquerda e expõe a lateral ESQUERDA, a composição "behind-right" do Tripo; yaw negativo mostra topo/direita). Tunado em sweep ao vivo de uma sessão (`tools/eval/g2r7-aksweep.mjs`, usa `m.userData.qAlign` salvo no build).
- **ARMADILHA do muzzle**: os DEDOS da mão esquerda passam da boca do cano em +Z — o centroide "z>maxZ" (heurística do g2-gunspace) cai nos dedos, ~80px abaixo da boca real. Boca calibrada com landmarks anotados em screenshot (`tools/eval/g2r7-mzmarks.mjs`): `VM_GUNSPACE.ak.tip = [-0.10, 0.33, 0.44]` → `_vmMuzzle.ak` (flash/tracer na coroa, verificado 16:9 e 3:2).
- **Comparativo** (/tmp/gauntlet/g2r7-sidebyside-169.png e -32.png): a AK atual (classe rifle + kit) lê "brinquedo laranja"; a dedicada é fotorreal com as duas mãos — sem comparação. ADS sai da tela igual à classe rifle (comportamento R7.6 preservado). Smoke m4/mp5/awp/shotgun/deagle/faca inalterados, console limpo em todas as capturas (`tools/eval/g2r7-capture.mjs`, `g2r7-smoke.mjs`).
- **Recomendação registrada: ESCALAR pra M4/MP5/AWP** (~30 créditos cada + ~30-40min de tuning por arma; o pipeline todo está pronto e é repetível).

## 🛠️ ATUALIZAÇÃO 29/07 #17 (Kimi, GAUNTLET 2.0 R6 — REGRESSÕES DO DONO) — v1.92.0: gate 17/17

**O dono jogou e reportou 4 regressões + 4 pedidos. TUDO resolvido com causa raiz (v1.92.0, gate 17/17 PASS):**
1. **"Armas invertidas/perderam o model"** — CAUSA: as poses da rodada de identidade (R5, z-0.47 + rotações quaternion) deixaram rifle com cano diagonal pra cima-esquerda e pistol deitada yaw -90°. FIX: poses recalculadas (cano pra frente, gun-space medido), identidade por arma preservada, mãos no quadro. Lição: tuning de pose validado só em 16:9 não basta — validar no 3:2 do dono.
2. **"Faixa preta ao pegar rifle"** — CAUSA: M400/SVD/G3SG1/SKS tinham `scope:true` → botão direito estourava a máscara de luneta full-screen preta. FIX: `scope:false` nas 4 semi-auto (ADS AUG-style como todo rifle); ferrolhos (AWP/Mosin/Rem700) mantêm luneta real.
3. **"Bots andando pro lado e pro outro"** — CAUSA MÚLTIPLA (medida c/ sim fast-forward): nearestWaypoint atrás de muro no pool, sidestep aleatório ±0.5 a cada 0.5s, pêndulo senoidal de combate (metrônomo), CTF re-sorteado a cada 3-5s, flap LOS. FIX: `_walkReach` + A* local com banidos + juke esparso + histerese CTF + grace LOS. latFlips/min: pool 68-85→12-25, stuck 32%→0%.
4. **Furo de cache-bust**: vmattach.js e stylize.js estavam SEM `?v=` no import map do index.astro — browser podia servir kits velhos. Adicionados (23 refs no bump).
5. **Loading real** (R6B): `#load-overlay` com barra de % REAL via DefaultLoadingManager (mapa + personagens + VMs), sai só depois do 1º frame renderizado. Fim da "tela minecraft".
6. **Splash "CLIQUE OU PRESSIONE QUALQUER TECLA"** (R6B): cobre o boot; o gesto destrava áudio COM SOM imediato (verdade do browser: sem gesto não existe autoplay com som fora do Media Engagement Index — a splash é a solução profissional padrão). `?debug=1&auto=` a ignora (harness).
7. **Proteção física de respawn** (R6B): Havan P = barreira de 5 carros, B = bolso de gôndolas; ferro = fileiras prensadas + jerseys; pool = bancos de concreto nos corredores. map-check 0/0 nos 3. (A proteção lógica SPAWN_PROT já existia em game.js.)
8. **Menu reenquadrado** (R6B): painel 400px com borda/acento, clamp de fonte + media queries de altura, sem sobreposição em 1280/1600/1512.
- Gauntlet 2.0 até aqui: menus/UI 8.5 ✓, Havan greco-romana 8.0 ✓, Lagoa 8.0 ✓, identidade de armas ~7 (TRAVADA — ver abaixo), polish ✓.
- **PENDENTE DECISÃO DO DONO — identidade de armas ≥8**: 3 críticos oscilaram 7.0/5.0/3.0 por metodologia (teste cego de NOMEAR 26 armas sem referência é impossível até com modelos perfeitos). Estado real: kits de silhueta + texturas por arma em cima de ~5 meshes base. Pra identidade de verdade (8+) o caminho é gerar GLBs Tripo por arma-herói (~30 créditos cada: AK, M4, MP5, AWP...) e fazer composite com os braços — projeto separado, caro. Alternativa: aceitar o estado atual (a reclamação original "todos iguais" está objetivamente respondida — ver grid /tmp/gauntlet/g2e-final/grid.png).
- Gate v1.92.0: 17/17 (4 mapas boot/LOS/A*/CTF + smoke splash+menu+música com som + loading não trava + 25 armas).

## 🔫 ATUALIZAÇÃO 29/07 #16 (Kimi, GAUNTLET 2.0 R5 — builder) — v1.83.0: FRAMING DE ARMA INTEIRA + scopes diferenciadas — 22/26 ✓

**Dois críticos divergiram (7.0 vs 5.0); diagnóstico comum: "o framing mostra só receiver+mãos — cano/boca/coronha fora do quadro, os kits não leem".** Rodada cirúrgica:
- **Framing afastado** (arma inteira no quadro, atende também o "armas gigantescas" do dono): rifle z -0.35→-0.47, shotgun z -0.36→-0.46, awp z -0.25→-0.38. `_vmMuzzle` rifle/shotgun/**awp** agora recomputa do model space no build (awp saiu do hardcoded R7.6). Flash revalidado na boca (/tmp/gauntlet/g2e-ak-fire.png). ADS AUG-style preservado.
- **Scopes diferenciadas por sniper** (é o que aparece no frame): AWP campânula r 0.055, SVD/PSO-1 copo de borracha no ocular + objetiva pequena, Mosin PU objetiva fina/longa, G3SG1 ZF curta, Rem700 caça média.
- **P90**: shroud cobrindo a mag vertical baked (identidade = top mag + SEM mag embaixo).
- **revolver38**: conjunto cilindro+grua POR FORA do frame lateral (lê no ângulo FP).
- **blind-capture.mjs**: crop alargado (x 0.40 — o cano chega perto do centro com o framing novo).
- **Teste cego (seed 77, frames completos): 22/26** (meta ≥22 ✓). Erros: g3↔tavor (inversão — o bevel do g3stock lê como degrau da cheek) e m92↔akm (inversão — as duas são madeira+curva; a alavanca vs slant brake permutam em alguns ângulos). Antes dos reforços (seed 61): 19/26.

## 🔫 ATUALIZAÇÃO 29/07 #15 (Kimi, GAUNTLET 2.0 R4 — builder) — v1.82.0: SNIPER KITS + engrossar + script do crítico

**Crítico R3 deu 7.0 (régua 8): "7 snipers = 1 GLB com 7 pinturas" + kits finos demais + attachments "colados".** Correções:
- **Kits de silhueta classe awp** (gun-space medido, L=0.921 — eixo quase reto): SVD coronha esqueleto (frame com vão + cheek), Mosin ferrolho lateral + cano longo fino, SKS pente integral + baioneta, Rem700 bull barrel (r 0.042), G3SG1 coronha G3 + cheek riser. Avaliado weapons/*.glb por arma como base do VM: REJEITADO — perderia as mãos baked aprovadas ("ponto forte" do crítico) e exigiria pipeline de composite com braços; kit procedural é o mesmo pipeline dos rifles.
- **Engrossar (ângulo FP)**: supressor MP5 r 0.046→0.060 len 0.34→0.44 (muzzleExt 0.42), m92barrel r→0.030, longbarrel r→0.028, alavanca m92 maior/visível, g3stock com bevel.
- **Attachments casados**: gunmetal 0x2a2d30 (não mais preto chapado sobre corpo camuflado) + bevelBox (ExtrudeGeometry bevel 6mm) nas caixas principais.
- **blind-capture.mjs do crítico** (tools/eval/): captura 26 armas isolando o player, corta #weapon-name E contador de munição, embaralha com seed determinística (mulberry32), gera cells cor+gray + grids + key.txt separado. Uso: `node tools/eval/blind-capture.mjs <outDir> [seed]`.
- **Testes cegos (builder)**: cor ~22/26, **grayscale 22/26** (meta ≥20 ✓). Erros 100% no bloco sniper (permutas awp↔svd, m400↔rem700, mosin↔sks); rifles 13/13, pistolas 3/3, shotguns 2/2, faca 1/1 nos DOIS testes. Snipers com traços detectáveis mas pares confundidos (frame=SVD lê, cheek=G3SG1 lê, pente+baioneta=SKS lê — atribuição ao par errado em ~4 células).
- **Ferrolho da Mosin**: fraco — a luneta baked oclui o flanco do receiver no ângulo FP (3 posições tentadas); a mosin lê pelo cano longo fino. Próximo passo se o crítico pesar: mexer a luneta dos outros snipers ou aceitar mosin≈sks.

## 🔫 ATUALIZAÇÃO 29/07 #14 (Kimi, GAUNTLET 2.0 R3 — builder) — v1.81.0: FORMAS NO CAMPO VISÍVEL + grayscale-proof

**Crítico R2 deu 6.5: "as formas distintivas estão FORA DO CAMPO DE VISÃO — de quadril o jogador vê o topo/traseira do receiver".** Correções:
- **FAMAS**: carry handle ARQUEADO ALTO com vão (2 montantes + laje recortando o céu) — não mais corcova embutida.
- **TAVOR**: cheek rest subindo no topo traseiro + mag atrás do grip protruindo BEM abaixo da linha da coronha.
- **MP5**: supressor 0.22→0.34 (projetando-se adiante — o "nub" não lia); muzzleExt 0.32.
- **UZI**: shroud cobrindo a mag baked (Uzi = mag no grip, SEM pente frontal).
- **AK×AKM em FORMA** (grayscale): AKM ganhou slant brake + gas tube; AK ficou lisa — não depende mais de pente preto vs laranja.
- **shotgun×md97 em FORMA**: md97 ganhou handguard tático ventilado (caixa com slots cobrindo o pump de madeira) + cunha pistol-grip; M3 segue clássica de madeira.
- **Gambiarras integradas**: alavanca M92 rente ao grip, caixa LMG com cinto de cartuchos (5 elos brass), SCAR com aimpoint TUBULAR (não mais cubo preto idêntico ao EOTech do M4).
- **VM -10% de escala** (rifle 0.5→0.45, shotgun 0.42→0.38 — crítico: receiver ocupava ~40% da tela); _vmMuzzle é recomputado do transform no build (automático), aspect 3:2 revalidado (77.9°).
- **Testes cegos do builder** (seed nova, HUD cortado): **cor 26/26, grayscale 26/26** — ressalva honesta: as 7 snipers em grayscale foram coin-flips tonais que caíram certas (permutam); o bloco rifle (o que falhava) foi 13/13 por forma pura e shotgun×md97 separaram por forma. `/tmp/gauntlet/g2c-blind{,-gray}/`, grids `g2c-grid-{blind,named,gray}.png`.

## 🔫 ATUALIZAÇÃO 29/07 #13 (Kimi, GAUNTLET 2.0 R2 — builder) — v1.80.0: SILHOUETTE KITS — identidade por FORMA

**Crítico R1 deu 4.5: "identidade é FORMA, não cor; AK≠AKM e P90=M4 na silhueta".** Resposta:
- **`public/js/vmattach.js` virou biblioteca de silhouette kits** (gun-space, medidas de tools/g2-gunspace.mjs): AK/AKM mag curva 7.62 (torus cobrindo a mag reta baked — lê de perfil) + gas tube; MP5 supressor + mag fina curvada p/ frente; UZI receiver boxy protruindo o trilho + mag longa no grip; P90 mag horizontal no topo (O traço); FAMAS corcova sólida embutida (a 1ª versão "poste" morreu — bloco baixo colado); TAVOR corpo estendido p/ trás + mag atrás do grip + shroud na mag baked; G3 coronha fixa larga + mag longa; M92 cano longo + magazine tubular + alavanca; carbine cano longo slim; LMG caixa de munição + bipé; revolver38 tambor À FRENTE da mão (t 0.68 — atrás fica 100% interno: o frame da pistol é sólido); holo/reflex ×1.6 (GAP c) + pose rifle rotacionada p/ expor o flanco esquerdo (f = (-0.32,0.03,-1)).
- **Regra de ouro (medida)**: peça só lê se PROTURIR o envelope da base — topo do trilho h≈0.16, base da mão h≈-0.20, mag baked meia-largura ~0.03 (cobrir, não "afinar"). Bounds medidos por estação em gun-space excluindo pele/oliva.
- **Teste cego do builder: 26/26** (células embaralhadas sem HUD, /tmp/gauntlet/g2b-blind/, gabarito conferido depois — ressalva: eu construí os kits, o crítico fresco é mais estrito).
- **Muzzle por arma** estendido p/ canos novos (mp5 0.20, m92 0.28, carbine 0.26 — flash verificado na boca da m92, /tmp/gauntlet/g2b-m92-fire.png).
- **Reprovado em captura**: extensão de slide da deagle (lia como "cartão branco" no ângulo FP — deagle fica só no cromo, já aprovado R1), carry handle fino da FAMAS.
- **Armadilha headless nova**: `+` em querystring decodifica como espaço (kits múltiplos no vm-inspect ficaram mudos — split(/[+ ]+/)).

## 🔫 ATUALIZAÇÃO 29/07 #12 (Kimi, GAUNTLET 2.0 R1 — builder) — v1.79.0: IDENTIDADE DAS ARMAS + fix 3:2 + re-pose rifle/shotgun

**A frente do dono: "rifles todos iguais, snipers todas iguais, armas+mãos não tá muito bom".**
- **Identidade por arma (13 rifles, 3 pistols, 2 shotguns)** sobre os MESMOS GLBs de classe: texturas variantes novas (`tools/vm-variant-tex.mjs` ganhou `applyGunVariant` — gun-space por triângulo: eixo stock→muzzle medido em `tools/g2-gunspace.mjs`, regiões coronha/grip/handguard/mag/cano por (t,h), veio de madeira com grain, classificador de texel pele/luva-oliva-clara/luva-oliva-escura-por-região + proximidade 3D GLOVE_R=0.04) + ATTACHMENTS procedurais (`public/js/vmattach.js`, primitivas em gun-space anexadas ao clone): MP5SD supressor (boca real estendida — `_vmMuzzle` por arma), M4/SCAR holo, P90/FAMAS reflex, MD97 cartucheira c/ shells vermelhos. AK=madeira+mag aço, AKM=laminado+bakelite, G3=oliva, SCAR=tan, deagle=cromo (ORM próprio), revolver38=blued, md97=full-black. Wiring: `RIFLE_VM/PISTOL_VM/SHOTGUN_VM` + `staticVmKey()` em game.js; preload em fparms.js.
- **Bug 3:2 (MacBook 3024×1964)**: vmCamera agora tem FOV HORIZONTAL constante (`vmFovForAspect`, ref 16:9=70°) — em 1.54:1 abre p/ 77.9°; 16:9 fica bit-idêntico. A/B em /tmp/gauntlet/g2-aspect-{comfix,semfix}.png.
- **Re-pose rifle/shotgun (a causa real do "framing invasivo")**: a pose velha deixava o CANO atrás da near plane (cano baked em diagonal ~35° p/ cima) — a arma cruzava a lente. Novos transforms (quaternion por basis stock→muzzle→f): rifle rot(2.752,-0.845,3.029) pos(0.15,-0.08,-0.35); shotgun rot(2.869,-0.654,3.036) pos(0.21,-0.12,-0.36) — arma inteira no quadro apontando p/ frente, mãos naturais. `_vmMuzzle` rifle/shotgun recomputado do model space no build (anchors R7.6 eram da pose velha); ADS AUG-style preservado (verificado), flash na ponta do supressor (verificado c/ tiro).
- **Lição headless**: bot point-blank na lente lia como "VM invasivo/gigante" em várias rodadas — `tools/eval/g2-capture.mjs`/`g2-tune.mjs` teleportam os bots p/ (0,-60,0) + player invencível antes de capturar. Prints "16.07" do dono eram do terminal, não do jogo.
- **Ficou de fora**: tambor do revolver38 (frame da pistol é sólido, tambor ficava 100% interno — identidade ficou na textura blued), mag curvo AK (textura já resolve), carry handle FAMAS (virava poste na tela), rifles m92/carbine/uzi/tavor/lmg (usam a base M4).

## 🏆 ATUALIZAÇÃO 29/07 #11 (Kimi, goal mode) — v1.78.0: GAUNTLET COMPLETO — as 5 frentes ≥7 + gate 16/16

**GOAL CONCLUÍDO.** Notas finais (críticos frescos independentes, barra = screenshots Claude-of-Duty):
- **Viewmodels 7.0** (crítico holístico final deu 8.0) — R5, v1.65
- **Mapas 7.0 agregado** (Brasília âncora 7.5, Ferro 7.5, Piscinão 7.0, Havan 6.5→fixada depois) — R6+R6.11, v1.73-1.75
- **UI/HUD 7.3** — R3, v1.57
- **Feel/Gunplay 7.0** (saga 6.0→6.0→6.5→6.5→7.0) — R7-R7.7, v1.74-1.78
- **Áudio 7.2** (holístico deu 7.5) — R4, v1.59
- **Checks objetivos: 16/16 PASS na v1.78.0** (4 mapas × boot 0 erros / 0 LOS spawn↔spawn / 0 A* quebrado / CTF capturando + smoke menu+25 armas).

**R7 (feel) — o que mudou (tudo public/js/game.js):**
- Tracer: "raio laser" → segmento fino (r 0.0035) branco-quente que VIAJA ~50ms, ≤2m, opacidade caindo no trajeto.
- Muzzle flash: cone-polígono gigante → sprites additivos (estrela irregular + núcleo) **filhos do vm.root** na vmScene — colados na boca por construção (crítico mediu 89-226px → **0.5-0.7px** de distância boca×flash DURANTE o kick). Offset da boca por classe via `vm.root.matrixWorld` (`_muzzleWorld`), NÃO ponto fixo de câmera.
- Camera punch: recuperação `0.55+3.5×recoilP` zerava o kick em 1 frame → `0.06+2.0×recoilP` (punch ~96ms, peak rajada 0.0125 rad, recupera total). Kick de pistola ×0.5.
- ADS rifle: VM desliza pra fora em adsF>0.8 + crosshair de precisão (estilo AUG — sight picture real é impossível com o asset baked diagonal; aceito pelo crítico). Máscara do scope com opacidade rampando junto do FOV (fim do frame preto). ADS de pistola e scope AWP intocados.
- Hitmarker: opacidade 1 no 1º frame (sem ramp-in), dmg number mín 24px.
- **Ressalva aberta**: atirar em ADS (rifle) não tem flash visível (VM fora da tela, flash spawna fora do viewport) + entrada de ADS ~250-380ms — 2 opcionais do crítico final não feitos.
- **Havan R6.11**: mezanino ganhou fascia+contrapiso+colunas (piso single-sided era a causa dos "props flutuantes" do spawn B), faixa amarela+letreiros de seção+pôsteres na parede do fundo, AO sob gôndolas, trilhas de carrinho.

**Lições finais do gauntlet:** (a) crítico mede nos pixels — critérios com número funcionam; (b) validar em cena CLARA e escura (o "flash fraco" era invisível contra parede, a "pirâmide" só aparecia no sol); (c) features têm que registrar no pixel (placas com offset de 2cm = claim falso); (d) headless: usar 127.0.0.1 (localhost→IPv6 quebra), mapas em sequência (4 Chromes = CPU saturada = timeout falso), `?map=` pra escolher mapa; (e) o "eco" era transientes atrasados + dedupe, não grafo; (f) GLB de 1 material → texturas variantes offline com máscara, nunca tint.

## ✅ ATUALIZAÇÃO 28/07 #10 (Kimi, goal mode) — v1.73.0: gauntlet R6 (mapas Ferro+Piscinão) — PASSOU 7.0/7.0

**Frente MAPAS FECHADA** — os 4 mapas ≥7: Brasília (pronto), Havan 7.0 (R2), Ferro Velho 7.0 (R6.5), Piscinão 7.0 (R6.10, saga 5.5→6.0→6.5→6.8→6.9→6.9→6.9→**7.0**).
- **Zona CTF transversal (game.js)**: disco verde-chapado → disco de terra compactada c/ anel pintado gasto (anel fino, cor de time dessaturada 45%); bandeira CTF = pano texturizado ondulado dessaturado 25%. Smoke testado nos 4 mapas.
- **Ferro**: zinco/grafites 6m/postes c/ catenárias/caixa d'água/nuvens+disco solar (FOG SEGUE PROIBIDO), óleo especular, chão tiling fino+cascalho, skyline 2 camadas de cards.
- **Piscinão**: streaks verticais (fim da "pelagem de vaca"), lambril azulejo 1.3m c/ grade 2 direções+jitter+verdete+scum, murais ("PISCINÃO — DOMINGO É DIA DE PISCINA" — muralTex tem fit automático c/ measureText), letreiros N/S no topo do muro, janelas falsas, silhuetas 9-11m + postes c/ fios N/S, **tobogã 9.8m no miolo** (marco visível dos 2 spawns; lane central aberta movendo blocos ±3.5→±5.2), planters c/ folhagem icosaedro flatShading, **AO assado** nas bases, bandeirinhas juninas grandes/densas, fog 48-170 (permitido aqui), placas SAUNA/BAR/JARDIM (DoubleSide+polygonOffset+offset 10cm — a versão 2-3cm era invisível, quase virou "claim falso").
- **Bug bônus R6**: spawns do ferro/piscinão olhavam pra parede dos fundos (yaw na convenção oposta — forward = (-sin yaw, -cos yaw)); invertidos.
- Lições: (a) alegação de feature tem que registrar NO PIXEL (crítico fotografa a 2m); (b) superfícies GRANDES (muros/céu/discos) pesam mais que props; (c) probe de pathing dedicado (`/tmp/gauntlet/probe-path.mjs`) pra mapa sem ctfPoints.
- **Próximo: verificação FULL final + crítico final por frente (5 frents c/ nota).**

## ✅ ATUALIZAÇÃO 28/07 #9 (Kimi, goal mode) — v1.65.0: gauntlet R5 (viewmodels) — PASSOU 7.0/10

**Frente VIEWMODELS FECHADA** (6 críticos frescos: 4 → 4.5 → 6.0 → 6.5 → 6.5 → 6.8 → **7.0**).
- **vmScene própria** (viewmodel renderizado em cena separada c/ rig 3-pontos + RenderPass extra no composer — port do CoD; layers NÃO filtram luz por objeto no three). Fallback sem pós ok.
- **Todas as classes no pipeline estático Tripo** (arms_{rifle,pistol,shotgun,awp,knife}.glb ~18MB cada) — pipeline IK morto de vez (mão-balão rosa RIP). ADS com damping por classe.
- **tools/vm-variant-tex.mjs** (o coração da rodada): máscara mãos-vs-arma por classificação de triângulo (pele por cor + luva=oliva adjacente à pele em 3D) → texturas variantes 512 por arma SEM tingir mãos: 7 acabamentos de sniper (SVD preto/Mosin madeira/M400 tan...), luva oliva em todas as classes (dedos-salmão RIP), veio de madeira por ilha UV+PCA, gradiente de roughness na lâmina (fio 0.30→dorso 0.55), lente da luneta c/ céu falso radial+anel (maior ilha compacta normal+Z), ORM de desgaste procedural (value noise 2 oitavas).
- **AK em backlight**: o problema era albedo ~0.005 no pé da curva — nem gamma nem fill resolviam; fix = **piso emissivo mascarado** (rifle_emissive.webp cinza 0.1 só na arma, emissiveIntensity 5) → mediana do receiver 7.9→37.5/255 (medida por 2 agentes independentes). Trade-off: AK levemente mais clara que o ambiente em mapa escuro (aceito).
- Lições: (a) validar VM em ÁREA ABERTA sob sol, não contra parede do spawn; (b) crítico mede nos pixels (sharp) — critérios de aceite com número funcionam; (c) tint de material não funciona em GLB de 1 material único (tinge mãos) — textura variante offline é o caminho.
- Opcionais não feitos (nota 7 não exigia): texturas 1024 + normal maps de micro-detalhe, roughness por peça (cano vs receiver).
- **Próximo: R6 = mapas Ferro(6.5)/Piscinão(5.5)** ground detail + depois verificação FULL + crítico final por frente.

## ✅ ATUALIZAÇÃO 28/07 #8 (Kimi, goal mode) — v1.59.0: gauntlet R4 (áudio) — PASSOU 7.2/10

**Frente ÁUDIO FECHADA** (crítico cético verificou TODAS as alegações no código + sondas: 7.2/10).
- **Causa raiz do "eco estranho" do dono (PROVADA com sondas)**: não era grafo duplicado nem delay node — era (a) transientes atrasados por design (ferrolho AWP +0.19s, shotgun +0.16s, ground bounce +0.12s, bolt com beeps square a +420ms) + (b) 4 SFX por kill (hitmark+killConfirm juntos) + (c) death() de bot sem escala de distância (thud no ouvido a 50m).
- Fixes: caps de delay (mech ≤0.12s, bounce ≤0.08s), bolt usa sample real cs.bolt, kill sem hitmark duplo, death() com vol por distância (corte <0.12), **ducking sidechain** (duckBus + samples HTMLAudio + música do menu via onDuck), **limiter** no master (pico 3.478→0.869), reverb IR sintético opt-in OFF padrão (`?reverb=1`), passos round-robin + pitch ±8% + vol ±15% + surface `water` no piscinão (world.slowAt).
- R4.5: bug headshot não-letal mudo corrigido (`_hitmarker(isKill, isHead)` flags separados); **pan estéreo** por direção relativa (StereoPannerNode, pan = sin(ângulo-yaw)×0.8, player central) + **delay de propagação** dist/343 pra tiros/mortes de bots.
- Sondas reusáveis: `tools/eval/audio-probe{,2,3,4,5}.mjs`.
- **Próximo: R5 = VIEWMODELS** (maior gap restante: 4/10 na R1.5 — armas-por-arma, rim light, mãos melhores). Depois: maps Ferro(6.5)/Piscinão(5.5) ground detail + verificação FULL + crítico final por frente.

## ✅ ATUALIZAÇÃO 28/07 #7 (Kimi, goal mode) — v1.57.0: gauntlet R3 (UI/HUD) — PASSOU 7.3/10

**Frente UI/HUD FECHADA** (crítico fresco final: 7.3/10, acima do corte 7.0; barra CoD = 9-10).
- R3: damage numbers flutuantes 3D→tela (head âmbar/kill vermelho), hitmarker vermelho em kill/head, banners de round animados (letter-spacing settle + linha divisória), scoreboard polido (chips PET × BOL, zebra, linha do jogador), tela VITÓRIA/DERROTA estilo Valorant, radar com clip circular + cone de visão + anel duplo + N.
- R3.5 (crítico 6.8 → fixes): dmg numbers 23px weight 800 + outline 8 shadows + escala por distância (clamp 18-34px); radar disco escuro ciano apagado + ticks N/E/S/W; killfeed com silhuetas SVG 34×20; HP bar 6px + flash vermelho ao tomar dano.
- R3.6 (crítico 6.8 → fixes): 💀→`_skullIcon()` SVG, 🥟 removido do copy; chips killfeed escuros translúcidos (tint time 18% alpha) com TEXTO na cor do time; readouts (HP/ammo/timer/dmg/scoreboard) de Share Tech Mono → Rajdhani (mono só p/ flavor).
- R3.7 polish: `#weapon-name` amarelo→cinza; micro-texto órfão virou `RODADA 1 · PET 0 × 0 BOL` (#rounds-row); ✚ do HP removido.
- Aprendizado de ambiente: headless throttla frames (congela relógio de animações CSS) — provas de animação usam 1º frame pausado ou inline+transition; em navegador real anima normal.
- **Próximo: R4 = áudio/polish** (ducking de vozes ao atirar, reverb leve opcional, variação de passos) + verificação FULL final (4 mapas: boot 0 erros, 0 LOS, 0 A* quebrado, CTF capturando) + crítico final c/ nota por frente. Depois: re-avaliar Ferro/Piscinão (6.5/5.5 na R2) com o ground-detail pass se o veredito final cobrar.

## ✅ ATUALIZAÇÃO 28/07 #6 (Kimi, goal mode) — v1.53.0: gauntlet R2 (mapas — textura/densidade)

**Crítico R2 (fresco): Havan 7.0 (PASSOU), Ferro Velho 6.5, Piscinão 5.5.** Brasília intocada.
- Havan: estacionamento com vagas demarcadas (linhas + blocos de parede/óleo), interior com mais densidade; estátua ry=-π/2 confirmada contra print do dono (de costas pra loja, frente pro spawn do estacionamento).
- Ferro Velho: REMOVIDOS `destroyed_car` e `broken_car_2` de SINGLES — eram os photoscans pretos brilhantes que destoavam ("carro-blob"). Fog segue REMOVIDO (fog+EffectComposer = tela preta nesse mapa; não reativar).
- Piscinão: água finalmente renderiza (deck era plano único cobrindo a lagoa → virou anel + água com rippleTex), mesas nos spawns, toalhas, quadra fora da margem.
- **Gap nº1 cross-mapa (crítico): primeiro plano morto** — chão liso nos 5m à frente da câmera. "Ground detail pass" transversal (decals/micro-props) entrou PARCIAL (trilhas, óleo, toalhas, vagas); levar em conta na próxima iteração de mapas.
- A* já corrigido antes nos 4 mapas (0 LOS spawn↔spawn, 0 conexões quebradas) via `/tmp/map-check.mjs`.
- **Próximo: R3 = UI/HUD** (scoreboard/match-end, radar circular c/ borda, banners de round animados, damage numbers flutuantes estilo CoD). Depois R4 = áudio/polish + verificação full final + crítico final.

## ✅ ATUALIZAÇÃO 28/07 #5 (Kimi, goal mode) — v1.51.0: gauntlet R1 (feel + viewmodels 3 classes)

**GOAL MODE ativo** (gauntlet loop autônomo, barra = CoD, crítico fresco por rodada, relatório por rodada).
- **Feel/locomoção FECHADO** (medido): accel chão 92 m/s² (full sprint 0.12s), gravidade 20.6 + jumpV 5.0 (apex 0.57m ≈ alvo CoD 0.60), air control 25% com cap sem ganho, coyote 90ms + buffer 130ms, sprint FOV kick já existia. Crítico: "locomoção não é mais o gargalo — pare de tunar isso".
- **Viewmodels estáticos Tripo em 3 classes** (`fpvm/arms_{rifle,pistol,shotgun}.glb`, ~18MB cada, `STATIC_CLASS` no game.js; snipers/faca ficam no pipeline IK antigo — a composição da AWP antiga é o gabarito). Material fix: metalness clamp 0.55 + roughness 0.45 + envMapIntensity 1.2 (a "silhueta preta" era material, não iluminação). Transforms por classe após ~25 capturas: rifle/shotgun (0.6, [-0.15,0.25,0], [0.12,-0.1,-0.04]), pistol (0.3, [0,-π/2,0], [0.14,-0.15,-0.06]).
- Crítico R1.5: **3/10 → 4/10**. Gaps restantes pra R2+: luz dedicada/rim no viewmodel, mãos mais visíveis, armas-por-arma (classe única por enquanto).
- Dev page nova: `public/vm-inspect.html?src=<glb>` (órbita de viewmodel p/ entender composição — resolveu o mistério da pistola em 1 render).

## ✅ ATUALIZAÇÃO 28/07 #4 (Kimi) — v1.47.0: estátua DE VERDADE + killfeed com ícones 2D

- **Estátua invertida (round 2)**: o dono tinha razão — o print dele mostrava ela de costas pro spawn. O GLB olha +x de fábrica (não -x como eu li errado no teste): ry=+π/2 virava ela PRA LOJA. Correto = **ry=-π/2** (verificado por screenshot do lado do spawn: rosto/frontal pra quem nasce no estacionamento). Lição: validar orientação de prop por render do POV do jogador, não por câmera arbitrária.
- **Build do dono estava VELHA**: os prints dele (23:18-23:20) mostram viewmodels antigos — a 4322 serve v1.47 c/ tudo (curl confirmado), o Chrome dele estava com build em cache/aba antiga. **Hard refresh (Cmd+Shift+R) resolve.** O HTML vai com `Cache-Control: no-cache`.
- **Killfeed com ícones 2D de arma** (pedido "armas no hud 2d" estilo CoD): `_wpnIcon(short)` no game.js — SVG inline por classe (rifle/sniper/shotgun/pistol/knife) entre os nomes, 💀 no headshot.

## ✅ ATUALIZAÇÃO 28/07 #3.5 (Kimi) — v1.46.0: STATIC VM TRIPO NO AR (classe rifle)

- **`public/models/fpvm/arms_rifle.glb`**


- **`public/models/fpvm/arms_rifle.glb`** (18MB — Tripo aim-pose v3 `geometry standard`, 750K→~340K verts, weld tol 0.0005 + simplify 0.45/err 0.0005 + tex 512) é o viewmodel da **classe rifle 2-mãos não-sniper/shotgun** (`STATIC_VM_GUNS` no game.js: ak/akm/m4/m92/g3/md97/carbine/mp5/uzi/p90/scar/tavor/famas/lmg). Arma procedural + braços IK escondem nessa classe; pistolas/faca/snipers/shotgun seguem no pipeline antigo (arma + IK arms c/ luvas 0.55).
- **Framing travado** (13 iterações de captura): scale 0.75, rot (0,0.15,0), pos (-0.02,-0.16,-0.06). Lição-chave: o modelo é composto "behind-right" — deixar a lateral esquerda visível (x levemente negativo), NÃO olhar o rifle de cima (vira "coroa de espinhos" preta).
- Otimização que NÃO quebra Tripo denso: weld com tolerância + simplify error ≤0.0005 + RENDER de validação (simplify padrão destrói sights/rail/dedos).

## ✅ ATUALIZAÇÃO 28/07 #3.4 (Kimi) — v1.45.0: Tripo arms — saga completa do static vm

Estado do wiring: `fparms.preloadStaticVm` + `STATIC_VM_GUNS` (game.js) + gate `?svm=1`. Ainda NÃO liberado por padrão.
Tentativas até agora:
1. **arms+rifle v1 (low-ready pose)** — framing impossível (pose diagonal de nascença).
2. **character-pipeline (rig biped)** — gerou manequim robô (descartado).
3. **aim-pose v2 (detailed geometry)** — composição BOA (render correto) mas **994K verts (57MB)**. meshopt `simplify` QUEBRA a malha fina (sights/rail/dedos viram caco) em QUALQUER ratio/error (0.001..0.02). Quantize (sem simplify) = 37MB (índices dominam). Sem caminho.
4. **EM ANDAMENTO: aim-pose v3 `--geometry-quality standard`** (`/tmp/tripo-arms-aim-std/`) — a expectativa: ~50-100K verts → otimiza limpo pra <5MB. Se vier: `optimize-static 512 0.3`, framing começando por (scale 0.8, ry ~0, pos ~(0,-0.05,0)), tirar o gate `?svm=1`. Se falhar: **shelve o static-vm**, ficar com braços IK + luvas 0.55.
Lições: (a) "detailed geometry" do Tripo = ~1M verts, inutilizável pra browser; (b) simplify do meshopt destrói malhas com estruturas finas — medir sempre com render antes de adotar; (c) quantize NÃO reduz índice.

## ✅ ATUALIZAÇÃO 28/07 #3.3 (Kimi) — v1.45.0: viewmodel estático gated + lições Tripo



- **Static vm Tripo (arms_rifle)**: wiring pronto (farms.preloadStaticVm + `STATIC_VM_GUNS` no game.js, esconde arma+braços IK na classe rifle) mas **gated por `?svm=1`** — o modelo arms+rifle do Tripo é pose LOW-READY (diagonal) e 8 iterações de framing não salvaram; pose errada, não dá pra rotacionar até virar mira. Mannequin rigado do character-pipeline = robô de brinquedo (descartado, `/tmp/tripo-arms-rig/`). **Simplify ratio 0.12 destrói malha** (vira caco; 0.25 fica limpa, 14MB).
- **Em andamento**: Tripo round 2 com prompt de AIM-POSE explícita (`/tmp/tripo-arms-aim/`). Se vier certa: trocar `public/models/fpvm/arms_rifle.glb`, destravar o gate (tirar `?svm=1`), refazer framing do zero. Se falhar também: manter braços IK atuais (luvas 0.55) e arquivar a ideia de static vm.
- Lição registrada: prompt de pose importa mais que detalhe de malha; "weapon-holding pose" vira low-ready — tem que dizer "aiming down sights / barrel horizontal pointing away from viewer".

## ✅ ATUALIZAÇÃO 28/07 #3.2 (Kimi) — v1.44.0: mira, armas gigantes, luvas suaves, autoplay diagnosticado

- **Crosshair invisível**: regressão da UI v2 (tirei o outline) — restaurado contorno escuro + traços 1px maiores (style.css).
- **Armas gigantes** (dono: "gigantescas"): captura objetiva de TODAS as 26 armas (`/tmp/vm-all/`) — gigantes eram awp/mosin/lmg (scope/caixão). `vm` scale por arma no weapons.js CFG: awp .78, mosin .75, rem700 .78, lmg .72, svd .8, g3/m400/g3sg1/sks .85, md97 .88. Re-verificado visual.
- **Luvas por time "bloco colorido"**: tint emissive+color 0.85 → **0.55** (o 85% cobria a textura da mão). ATENÇÃO: a textura do arms.glb é pobre — a solução real é o modelo Tripo (abaixo).
- **Autoplay música**: testado no servidor do dono (:4322) — FUNCIONA (toca muda no load, desmuta c/ fade no 1º gesto; arquivos 200 OK, v1.43 servida). Se "não rola": hard-refresh (Cmd+Shift+R), aba não-mutada, e lembrar que som audível SEM nenhum gesto é impossível no Chrome. Porta certa do jogo: **4322** (4321 404 = outra coisa).
- **Mãos remodel (em andamento)**: Tripo `character-pipeline` rodando em bg (arms-only, rig biped, `/tmp/tripo-arms-rig/`). Quando sair: validate-rig → retarget p/ rig atual (tools/retarget-glb.mjs) → trocar `models/fparms/arms.glb` mantendo o IK do fparms.js. Modelo arms+rifle anterior (desrigado) em `/tmp/tripo-arms/` p/ referência visual.
- Pendência vista: faca no FP quase invisível (quadradinho ciano) — revisar mount da faca.

## ✅ ATUALIZAÇÃO 28/07 #3.1 (Kimi) — v1.43.0: música "autoplay" do menu

- Chrome não libera autoplay COM som antes de gesto do usuário — contorno padrão: a faixa toca **MUDA desde o load** (permitido) e **desmuta com fade no 1º clique/tecla** (já rola de verdade, o som só "entra"). Detalhe que quebrava: o `play()` do boot não "grudava" com rede lenta (readyState 0) — re-tenta no evento `canplay`. Verificado headless: tocando muda em t+4.5s, desmuta c/ fade após clique. Hook de debug: `window.__mm`.

## ✅ ATUALIZAÇÃO 28/07 #3 (Kimi) — v1.42.0: A* bug, gauntlet loop, soundtrack, spawns/LOS

- **A* QUEBRADO EM 2 MAPAS (o bug dos bots)**: `map_ferrovelho.js` E `map_havan.js` tinham `open[fromIdx] = 1` faltando no findPath → A* falhava SEMPRE → bots andavam em LINHA RETA com sidestep ("bots não sabem se movimentar"). map_brasilia/map_pool_day/map.js estavam certos. Fix 1 linha cada. CTF verify depois: bots capturam nos 2.
- **Ferramenta `/tmp/map-check.mjs <mapa>`** (via mapview.html `__gworld`): LOS spawn↔spawn (segmento vs colliders altos) + conectividade A* spawn→bandeira. **Os 4 mapas: 0 LOS livre, 0 conexão ruim.** Rodar a cada mudança de layout.
- **Layout**: ferro v3 ganhou muros E-W I(-6,8) e J(0,-6) (0 LOS) + anel de silhueta fora do muro (horizonte) + `gpropV` (flip+tint por instância, mata repetição). Havan: estátua ry=π/2 (de costas p/ loja) + collider 11m, teto DoubleSide+grid+luminárias+PointLights (loja era breu), corredores laterais fechados, ilha central na gôndola 2 (mata LOS pela porta), spawn B entre gôndolas (z=-31; atrás da fileira era ILHA do A* — 6.8m > alcance da aresta 5.27m), carros-flanco no spawn P. Piscinão: jardineiras-chicane (blocos h2.2 em (-3,8)/(3,-8)), spawns x [-5,-2,1,4], texturas (concreteTex/rippleTex) — água com ripples.
- **Soundtrack**: 15 faixas da pasta `public/audio/soundtrack/` trimadas p/ ~105s (22% in, fade 1.5/5s, loudnorm -16 LUFS) em `public/audio/menu-music/m01-m15.mp3` via ffmpeg. Menu toca aleatória por visita (`MENU_TRACKS` no main.js). Tirar faixa = apagar o m*.mp3. PDFs estranhos na pasta soundtrack não são do jogo.
- **Killfeed CoD** (ref 18.29.27): pills c/ VOCÊ em destaque (ciano atacante, vermelho vítima), 💀 headshot, arma mono.
- **Gauntlet loop** (método somethingbig.ai/gauntlet-loop): crítico FRESCO por rodada (subagent explore, sem histórico do builder) comparando `/tmp/gauntlet/*.png` vs barra (CoD 18.29.35 + diretrizes do dono). R1: 5/5.5/3 → R2: **6.5/6/4.5**. Gap nº1 restante: iluminação/sombras (parcialmente artefato SwiftShader — no Mac real há sombras; validar), fachada Havan (janelas/vitrines), ferro horizonte além do anel, piscinão geometria flutuante+spawn caixa.
- **Mãos (piloto Tripo OK)**: modelo braços+rifle do Tripo (detailed, 50 créditos) ficou BOM (`/tmp/tripo-arms/`) mas veio DESRIGADO. Próximo passo real: gerar arms-only + rigging Tripo → retarget p/ rig atual (tools/retarget-glb.mjs) mantendo o IK. **SSL python**: precisa `SSL_CERT_FILE=$(python3 -c "import certifi; print(certifi.where())")` nos comandos do skill. Chaves Tripo/Meshy: no chat 27/07 (não gravar em arquivo).
- Nada commitado (dono revisa).

## ✅ ATUALIZAÇÃO 28/07 #2 (Kimi) — v1.40.0: F5 feel/áudio CoD + F6 luvas por time

- **Áudio (resolve o "eco estranho")**: `_gunshot` reescrito = port do CoD `audio/weapons.js` — **mix por distância** (perto = click/crack/mech; longe = boom grave + cauda + ground bounce), mech só <14m (era o click atrasado que soava eco), cauda curta de perto/longa de longe (era a "sala" de 0.6s em todo tiro), round-robin de 6 timbres/classe, pellets de shotgun. **API mudou**: `shotWeapon(arma, dist, vol)` (era vol) — game.js passa 0 (player) e `_sd` (bot). **whizz()** novo: quase-acerto no player = tiro passando do ouvido. Medido OfflineAudioContext: energia pós-200ms ≈ 0 (antes cauda 0.46-0.62s).
- **Viewmodel feel**: `public/js/springs.js` (port Spring+RecoilAxis do CoD) — recoil com spring snappy + residual (era decay linear); bob figure-eight Lissajous (x+y). Movement: **coyote 90ms + jump buffer 130ms** (game.js; pulo testado).
- **Bloom→composite AgX** (bloom.js reescrito): UnrealBloomPass + ShaderPass próprio (CA radial + vinheta cos⁴ em linear + **tone map AgX** + grain/dither, port do composite.js). A/B: `?post=output` = OutputPass ACES antigo. **BUG ferro+fog+composer**: frame inteiro preto-avermelhado (Havan+fog OK, ferro+fog quebra até no FogExp2) — fog REMOVIDO do ferro velho; investigar depois se quiser névoa de volta.
- **F6 — mãos/luvas por time**: viewmodel volta a ter braços POR PADRÃO (era só-arma; `?hands=0` desativa). Luvas P vermelha/B verde/U roxa nos braços dedicados (fparms.js) E no fallback procedural (skinMat). **Causa raiz do "não tingia"**: o arms.glb tem `emissive` BRANCO (textura no emissiveMap, unlit) — tingir só `color` não fazia nada; tinha que ler o emissive também. Verificado P/B/U em screenshots (/tmp/ui-v2/18-hands-*).
- **Verificação full**: 4 mapas boot CTF + 0 erros (resultado no log da sessão). Nada commitado (dono revisa).
- **FALTA**: piloto mapa-único + comparativo Mint×Tripo×Meshy (chaves no chat 27/07), F4-polish (damage numbers), fog do ferro (se quiser), teste real no MacBook.

## ✅ ATUALIZAÇÃO 28/07 (Kimi) — v1.39.0: plano mapas+UI (fases 1-4 parciais ENTREGUES)

Plano aprovado pelo dono: `~/.kimi-code/sessions/.../plans/falcon-black-hawk-cyclops.md` (mapas nível Brasília + UI Valorant + feel Claude-of-Duty; Brasília PRONTA, não mexer).

**F1 — Peso: ENTREGUE.** Havan 81MB→~9MB/partida: re-otimização 256/ratio0.15 (41 props) + **seleção de 12 carros por seed de partida** (`havanCarSelection`/`setHavanCarSeed` em map_havan.js; maps.js usa getter `props`; HEAVY >1.5MB fora da rotação) + fallback mini-carro colorido. Ferro 49MB→~8MB (photoscans fora).
**F2 — Bots: verificado** (CTF verify ferro+havan: P e B capturam, 0 erros; pool boot OK). Contest stalemate não observado de novo — vigiar.
**F3 — Conteúdo: ENTREGUE.** 4 packs Mint (registrados em mint-assets.json): ferro-velho (muro/fileira/monte de carros, guindaste, prensa, pneus — **photoscans wall_of_cars/crushed_classic APOSENTADOS**, maze refeito c/ painéis muro_carros), havan-loja (gôndolas cheias mercado/eletro, caixa c/ esteira, painel TVs, arara, manequim — loja não é mais vazia; mezanino mobiliado), **carros BR** (kombi/opala/chevette/brasilia_vw/saveiro/fusca/moto_cg — sempre na partida via MINT_BR; RY_FIX p/ modelos c/ comprimento no eixo X; ônibus no fundo do estacionamento), piscinão (churrasqueira/mesa/cooler/boia/placa/caixa_som). **BUG GRAVE do piscinão corrigido**: o deck era UM plano cobrindo a lagoa — a água nunca existiu visualmente; virou anel de deck. Quadra (grama) empurrada pra fora da margem da água.
**F4 — UI Valorant: 1ª pass ENTREGUE.** style.css reescrito (fontes self-host Rajdhani+ST Mono em public/fonts/, tokens --ink1/2/3 + --line + --cut clip-path, SEM scanlines/blur/glow/border-radius), ctf-hud inline→CSS (index.astro), link style.css?v=. Verificado c/ screenshots /tmp/ui-v2/ (menu/setup/team/char/enemy/ingame — ficou BOM).
**Mint packs (ids p/ follow-up):** ferro th7cgpxf57s7twyjcj093qgryd8bad0k · loja th740djrzedmygcxze9g6gm77n8bakz8 · carrosBR th79jvsrbgpr605gj2sf5p1f3x8bazc0 · piscinão th7eg134zfrsmpzg4tb3rwr3b18ba3jb.
**Chaves Tripo (`tsk_`) e Meshy (`msy_`)**: o dono TEM (passou no chat 27/07) — NÃO gravar em arquivo; usar via env por comando. Piloto comparativo de providers (plano item 13b) ainda NÃO rodado.
**FALTA (próxima sessão):** F5 feel/áudio Claude-of-Duty (springs/tuning → movement, viewmodel layers, round-robin de tiro — resolve "eco", bloom+AgX), F6 luvas por time (P/B/U), F4-polish (damage numbers, scoreboard live check), piloto mapa-único Mint/Tripo/Meshy (plano item 13). Verificação full pendente: 4 mapas boot + menu flow + medir boot real no MacBook (props leves agora). Nada commitado (dono revisa).

## ✅ ATUALIZAÇÃO 27/07 #2 (Kimi) — v1.37.0: ferro velho LABIRINTO, Havan maior, fix adversário

- **Fix team-select (bug do usuário)**: a tela de adversário mostrava os 3 times e o usuário caía em mirror. Agora o card da SUA facção é **escondido** no 2º passo (`setEnemyPickMode` no main.js — adversário só entre os outros 2) e o `team-back` restaura os cards + reseta `pickingEnemy` (bug latente: voltar pulava a escolha de personagem na próxima partida). Verificado: P escondido/B,U visíveis; voltar restaura; P vs U → `enemyFaction=U`.
- **Ferro velho v2 = LABIRINTO de carros**: `wall_of_cars` (muro de carros empilhados, 3m — não dá pra ver por cima) × 4 segmentos N-S + `crushed_classic` (fileira de prensados) × 4 E-W, corredores ≥5m. Novos props: construction_rubble, jersey_barrier, sandbags, concrete_roadblock, dumpster (batch `/tmp/wrecks2-src`, ratio 0.18 — o scan de 102MB virou 16MB). Texturas ricas via `noiseTex` (manchas/rachaduras/pedras, canvas seeded) p/ terra e muro, névoa de poeira (`scene.fog`).
- **Havan v2**: estacionamento dobrou (76×116, ~44 vagas, 34 modelos de carro — batch `/tmp/cars2-src`: mustang, delorean, s600, m8, rav4, polo, tracker, altima, sentra, picanto, mini, fiesta ST, golf R32, versa, old_vw_bug, uno_mille). Asfalto c/ óleo+rachadura, azul Havan c/ sujeira, névoa leve. 573 waypoints.
- **Verificado headless**: ferro (4 bandeiras, P+B capturam, 0 erros), Havan (captura P em ~60s wall — SwiftShader roda o jogo em câmera lenta com 36 carros; em GPU real é normal), team-select UI, screenshots em `/tmp/mapview-fy_*/`. Boot Havan no headless demora ~3min (77MB de props + SwiftShader) — medir primeiro load real.
- Nada commitado (dono revisa).

## ✅ ATUALIZAÇÃO 27/07 (Kimi) — Ferro Velho + CTF sem query string (v1.36.0)

- **Mapa novo `fy_ferrovelho` "Ferro Velho do Zé"** (`public/js/map_ferrovelho.js`): pátio de sucata 64×72, CTF **4 bandeiras** (PORTÃO · PILHA OESTE · CONTAINERS · GALPÃO) via `world.ctfPoints`. 11 wrecks GLB otimizados de `/Users/ruben/glb` → `public/models/props/` (`tools/optimize-static.mjs`, ratio 0.25; 167KB–4.7MB cada). Galpão/escritório, 3 containers-dumpster, pilhas multi-carro (burned-out_cars, burned_police_cars, ruined_cars, wreck_car), 10 carros unitários, pneus/barris/poças de óleo. `FERRO_PROPS` exportado p/ preload por-mapa. Registrado em `maps.js` com `ctfOnly: true`.
- **CTF sem query string**: `ctfOnly` agora é consumido no `main.js` — init, `stepMap` (título do setup vira "· CTF") e `startGame` (`ctf: matchMode==='ctf' || ctfOnly`). Selecionar Havan/Ferro Velho no carrossel ativa CTF automaticamente.
- **`game.js`**: vitória CTF generalizada p/ N bandeiras (era hardcoded `owners.length===3` — com 4 nunca vencia).
- **Verificado headless** (servidor `tools/eval/serve.mjs 8123` que ficou da sessão Claude): ferro velho live com 4 bandeiras, bots buscam/capturam (P e B capturaram as bases), 0 erros; Havan e Brasília regressão OK; fluxo completo do menu SEM query string → partida CTF 4 bandeiras. 404s de `/api/register|heartbeat` são pré-existentes (backend ausente no serve estático). Nova página dev `public/mapview.html?map=<id>` (eval genérico de mapa, tipo mapeval.html mas qq mapa) + scripts em /tmp (mapview-capture, ctf-map-verify).
- Nada commitado (regra da sessão: dono revisa).

## ✅ ATUALIZAÇÃO 22/07 (sobrescreve onde conflitar com o resto do doc)

**Mint CONECTADO** (OAuth feito; pro tier; tools `mcp__mint__*` funcionando; agentes geram/animam/baixam GLBs em background com sucesso — pipeline: start_model_generation(riggable t_pose) → animate_generated_model(basic_locomotion) → artifact manifest → rigged GLB → otimizar LOCAL com gltf-transform (resize 512/webp/dedup/prune; **NUNCA optimize_generated_model — Draco quebra o GLTFLoader pelado**)).

**Entregue nesta sessão** (tudo verificado com screenshots/testes, 0 erros):
- **3 personagens novos**: `bozo` (P, palhaço Bozo), `canarinho` (B, Canarinho Pistola camisa 24), `proerd` (B, Leão do Proerd camisa PRETA c/ logo vermelho). Rigs Meshy compatíveis (26 nós = dollynho menos Curl_R/L) → clipes compartilhados bindam 100% (idle/walk/shoot/death verificados via `botview.html?char=<id>&anim=walk`). Wiring: characters.js + GLB_CHARS + CHAR_WEAPON (`bozo:revolver38, canarinho:deagle, proerd:md97`). Registro em `mint-assets.json`. ATENÇÃO: Bozo v2 semi-real veio com rig QUEBRADO (A-pose reportada como t_pose) — **v1 restaurado**; lição: sempre validar anims com `botview.html` antes de trocar um char, bones.match sozinho NÃO basta (proporção/bind importam).
- **Spawn protection (issue #24)**: `SPAWN_PROT=3s` — `protUntil` em player/bots, guard no `_damage`, blink nos bots, badge `#prot-badge` no HUD. Round start NÃO ganha proteção.
- **Mapa Brasília**: urna eletrônica no centro `(0,0)`, Towner = carrinho de hotdog `(12,-15)`, +2 stalls +2 tents no lado B (z −21..−27). Props novos: `public/models/props/{urna,towner}.glb` (26MB→252KB e 14MB→1.7MB via gltf-transform); adicionar SEMPRE em `MAP_PROPS` (main.js) **e na lista hardcoded do `mapeval.html`**.
- **Dollynho dançando** no fim de round: `models/dollynho_dance.glb` (clipe Mixamo embutido) toca num canvas próprio dentro do `#scoreboard` (`_ensureDolly`/`_tickDolly` no game.js).
- **Bots**: pool agora ROTACIONA por partida (antes só os 8 primeiros do time apareciam).

**FASE 1 (mãos 1ª pessoa) — ✅ ENTREGUE**: `fparms.js` (novo) — clone SkeletonUtils do GLB do próprio personagem pendurado no `vm.root` (Head scale 0.0001), pose idle congelada (`mixer.setTime(0.6)` p/ zerar drift CCD), IK CCD (`handik.js`) por frame: R no grip / L no guarda-mão (`poseToWeapon` depois dos transforms do vm.root; kick/reloadDip/sway/bob/ADS/draw intocados — mãos re-travam em todos). Detalhes que fizeram a diferença: **efetor da palma medido dos skin weights** (`measurePalmLocal` — sem isso a palma flutuava 9cm), orientação da mão = transplante da pose congelada c/ correção do eixo do rifle (`qFix`, 2 passadas). `gripPoints(id)` em weapons.js = fonte única (grip na origem, cano +Z; fore null em ONE_HANDED). ARM_MOUNTS aproximaram as armas p/ alcance real (z −0.5 era além do braço). Draw animation nova (sobe de baixo). **Métrica: gripError ≤ 3.7mm em 12 armas** (exceção: bozo+AWP L 37mm — braço curto, visual ainda OK). Fallback procedural (`fpArm/frontHand` mantidos) p/ doutora/influencer/senhora/sindicato (props FUNDIDOS na malha, inspetado) e canarinho (ave). **Bugs latentes corrigidos**: `this.playerCharId` NUNCA era atribuído no Game (afetava pal+spawn weapon); `_swayX/Y` undefined→NaN escondia o viewmodel inteiro em headless (`|| 0`).

**FASE 2 (IK 3ª pessoa + tela de seleção) — ✅ ENTREGUE**: `ctrl.ikL` (chain LeftArm→LeftForeArm→LeftHand) resolvido no guarda-mão da arma montada após o mixer em `CharController.update` (glbchars.js) — vale p/ bots E preview da seleção (main.js agora dirige `pv.ctrl.update` em vez de mixer cru). Select: mão esquerda agora SEGURA o guarda-mão; pistola sai da altura do rosto. Pendência conhecida: pistoleiros na seleção ainda fazem pose de 2 mãos (só há clipe de rifle; precisa clipe 1-mão no futuro). Team-switch (M) mantém os braços do char original até reload.

**FASE 4 (gráfico/som) — ✅ ENTREGUE**: sons REAIS CC0 por arma (Freesound qubodup, `public/audio/cc0/` completo, SOURCES.md) — `manifest.default.json` (produção) e `manifest.json` (dev) apontam p/ cc0 (AWP→sniper-fps, mosin→sniper-field, ak/akm→ak47, g3→g3, m4→m16, shotgun→shotgun-fp, pistolas→gunshot-pistol, reloads rifle/sniper). Bloom leve: `public/js/bloom.js` (novo) faz patch em `renderer.render` — EffectComposer por cena (RenderPass→UnrealBloomPass 0.25/0.45/0.85→OutputPass; OutputPass é OBRIGATÓRIO no r160 p/ ACES/sRGB; raw restaurado durante composer.render p/ não recursar). Ligado por padrão, pulado em quality 'low'. Vendor novo: `public/vendor/addons/postprocessing/` + `shaders/` (three 0.160 jsdelivr).

**FASE 3 (bots) — ✅ ENTREGUE**: a maioria já existia na branch (lanePref, exploração 40% far-node, anti-moonwalk c/ backpedal reverso, stuck-sidestep) — verificado c/ vídeos before/after (`/tmp/fase3/`, rotas se espalham em leque ✓). O que faltava, "olhar pra baixo", foi corrigido em **malha fechada**: `ctrl.aimPitch` (game.js, pitch pro alvo) → em `CharController.update` (glbchars.js) mede o pitch REAL do olhar (eixo +Z da cabeça em mundo) e gira o osso Head pela DIFERENÇA (clamp ±0.5 rad ≈ 28°, suavizado dt*6, só quando aimPitch definido = bots; seleção/FP intocados). Medido ao vivo: clipes assavam ~12-28° de tilt pra baixo; correção converge pra 0.202-0.5 conforme o char.

**RODADA 5 — CS v2 alpha (correções finais) — ✅**:
- **Roster CORRIGIDO** (eu tinha lido ao contrário na rodada 2): saem Tia Zilá e Influencer de Dubai; voltam **Canarinho Pistola e Leão do Proerd** (GLBs restaurados via `git checkout 6063150`). Time B = caminhoneiro, sertanejo, coach, farialimer, bombado, dollynho, ancap, canarinho, proerd (9×9 com P). Lição: "substituir X por Y" em PT é ambíguo — confirmar sempre quem sai.
- **Stance**: idle/walk trocados pelas variantes **não-aim** (`rifle_idle_1`, `rifle_walk_1` — a aim/bladed deixava os chars corcundas). Re-retarget pelo `tools/retarget-mixamo.mjs` (EXPORT map editável). Novo `WALK_REF 1.43→0.84` (medido via stance-speed). run/crouchwalk mantidos (2.08/0.75).
- **ikL skip pra mascotes** (`IK_L_SKIP` no glbchars): dollynho, gotinha, et, canarinho — braços-toco viravam mão gigante flutuando (caso do Dollynho no select).
- **fpArm/frontHand esbeltados** (palma 0.036→0.030, dedos mais longos/finos, antebraço mais magro, escala fallback 0.85) — adeus "blocão redonda".
- **walk1h** (`pistol_aim_walk` do mirror) entregue — mata o 404 e dá walk de 1 mão pros pistoleiros.
- gripError ≤ 0.0014, build ✓, select B verificado (Proerd/Canarinho/Dollynho).
- **Seleção**: correção da cabeça volta a ser SÓ nos bots (em todos deixava esquisito) — preview com a pose natural do clipe reparado.
- **Roster**: Proerd e Canarinho REMOVIDOS a pedido do usuário (time B fica Tia Zilá + Influencer). GLBs deletados, mint-assets.json anotado, 18 arquétipos.
- **Dollynho inteiro no placar**: framing por **bounding sphere skinned-aware** (r160) no `_tickDolly` — quadril NÃO serve de referência nesse rig (fica a 1.75m).
- **Mãos FP proporcionais**: `FP_SCALE=0.93` em fparms.js (?fps= tunável), CCD iterations 8→14, L_OFF baixado, ARM_MOUNTS z restaurado (-0.42/-0.36/-0.36), mão procedural fallback escalada 0.85. gripError ≤ 0.002 (faca 0.02). Licão: escala corporal e distância da arma afetam o ALCANCE do IK — medir gripError a cada ajuste.
- **Pendente registrado**: mira ADS ainda cruza a manga esquerda levemente (precisa IK com pole-vector no cotovelo); mão "blocão redonda" dos chars fallback é o fpArm procedural (design — props fundidos no GLB).
- **Pacote Mixamo rifle ADOTADO como padrão** (`models/anims/mixamo/`, 8 estados, fonte S-N-D-R/UnityMixamoLibrary + `tools/retarget-mixamo.mjs` novo): rifle-hold real em TODOS os estados (stance bladed ~40°), death com queda real, crouch tático. REFs recalibrados medidos: `WALK_REF 0.79→1.43, RUN_REF 1.92→2.08, CROUCH_REF 0.83→0.75`. `ANIM_DIR` default trocado no glbchars.js (override: ?animdir=models/anims). gripError até melhorou (≤0.001). Aposentado: clips Meshy antigos (backup em models/anims/ na raiz).
- **Cabeça dobrando até sumir (seleção/idle)**: causa raiz = `idle.glb` com TODOS os keyframes no tempo 0 (duração zero → `action.time=NaN` → mixer não escreve nenhum osso) + HEAD_UP open-loop acumulando ~2°/frame. Fix duplo: (1) `idle.glb` reparado (keyframes duplicados pra [0,1.766]; backup /tmp/idle-zeroed-backup.glb); (2) correção da cabeça agora é SEMPRE malha fechada (alvo = aimPitch ?? 0; o HEAD_UP fixo foi removido do glbchars.js). Verificado: cabeça estável t=4.5s+. Lição: validar duração dos clipes com `node trackcheck` (min/max dos tempos).
- **Braços FP deformados (lençóis brancos, patas-camarão, rabo, gola)**: anatomias não-humanas não aguentam o IK. `FP_FALLBACK` agora inclui: doutora, influencer, senhora, sindicato (props fundidos), canarinho (ave), **gotinha (gota), et (alien), dollynho (garrafa), proerd (patas+rabo)** e **bozo (gola-gargantilha invade o quadro em qualquer ?fpy=)**. mst e humanoides normais mantêm braços reais IK. Verificado com screenshots por char.
- **Idle de 1 mão p/ pistolas (idle1h) — ✅ ENTREGUE**: clipe `Gesture_with_Hand_on_Gun` (Meshy action 292, set pistol_combat no bozo v1, 6.17s) strippado c/ `tools/strip-anim.mjs` → `models/anims/idle1h.glb` (raiz, p/ override) e `models/anims/mixamo/idle1h.glb` (padrão). Wiring em glbchars.js: `OPT_STATES=['idle1h','walk1h']` (load opcional, falha silenciosa = fallback 2 mãos), `ctrl.oneHanded = ONE_HANDED.has(opts.weaponId)`, máquina de estados troca idle→idle1h (walk→walk1h quando existir). Pistoleiros (esquerdomacho, coach…) não ficam mais com a arma na altura do rosto + mão L vazia: seguram a pistola só na mão D, L no quadril. **walk1h ENTREGUE na rodada 5** (`pistol_aim_walk` retargetado do mirror Mixamo; o walk "Walk_Forward_While_Shooting" do set Meshy foi rejeitado por recuo baked-in). Validar clipes novos com `node tools/check-clip.mjs` (ossos/duração/root-motion). Verificado: botview before/after, seleção, bot em jogo (roundEnd), gripError ≤ 0.0007.

## Branch e commits recentes (tudo verificado em jogo, 0 erros)

Branch: `feat/evio-feel`. Commits desta sessão (mais novos primeiro):
- `d949204` **loadout**: (1) knife com a lâmina pra frente; (2) arsenal COMPLETO no respawn em 4 fileiras por tipo (snipers/rifles/bullpups-SMG/pistolas), sem arma espalhada (removido drop de bot); (3) player spawna com a arma da tela de seleção; (4) slot-memory (tecla 1 = última primária, 2 = última pistola).
- `c3dbbc9` **armas invertidas rodada 2**: +5 (tavor, uzi, m400, p90, revolver38) via medição OBJETIVA.
- `04459e2` **armas invertidas rodada 1**: 6 (ak, m92, g3, md97, rem700, mosin).
- `3310d9a` **partículas GPU batched** (flash+puff em 1 draw call; tracers pooled).
- `36d9bc8` **mount da arma** = média antebraço→mão na walk (cano pra frente em todos os rigs).
- `7a36aaa` **dedos curvando** na empunhadura (curl bones nos 17).

## Aprendizados-chave (NÃO repetir erros)

- **Orientação de arma**: NUNCA julgar à olho em render pequeno (eu errei nas bullpups). Usar a **medição objetiva** do `weapontest.html` (seção transversal: cano=fino, coronha=grossa) — `node tools/eval/weapon-capture.mjs`. `weaponModel()` em `weapons.js` tem `rot` POR ARMA; alimenta 1ª E 3ª pessoa.
- **Verificação**: sempre com evidência (screenshot/métrica/vídeo) antes de declarar pronto. Tools em `tools/eval/`: `weapon-capture`, `mount-capture` (usa `public/mounttest.html`), `walk-video`, `fx-test`, `loadout-test`, `stance-speed`.
- **Clipes**: os atuais são Meshy **in-place** (plantam o pé: walk vFoot 0.78). O retarget UE5 foi **aposentado** (fonte root-motion, sem in-place → patina). Backups em `/tmp/backup-*-meshy.glb`.
- **Sem API keys** de Tripo/Gemini/ElevenLabs. **Mint** = via MCP (ver abaixo).
- Usuário testa em `localhost:4321` (Astro). Servidor de teste meu: `node tools/eval/serve.mjs 8123`.

## Mint MCP — conexão pendente (FAZER PRIMEIRO)

Criei `.kimi-code/mcp.json` com o servidor `mint` (`https://mcp.mint.gg/mcp`). Pra ativar:
1. **`kimi resume`** desta sessão (MCP só carrega no startup; resume mantém o histórico).
2. `/mcp-config login mint` → OAuth no navegador (uma vez).
3. `/mcp` pra confirmar `mint` conectado → aí tenho as tools `mcp__mint__*`.

## Plano ev.io (prioridade do usuário) — próximos passos

1. **FASE 1 — mãos/braços em 1ª pessoa** (maior salto visual; hoje são cápsulas). Viewmodel com braço+mão real por personagem + animações draw/reload/switch. Via Mint (se conectar) ou Mixamo/Sketchfab grátis.
2. **FASE 2 — holds/IK + andar**: IK da mão de apoio no guarda-mão (`handik.js` existe) integrado no `buildCharacterModel`; isso resolve a **tela de seleção** (mão esquerda vazia em pistola — hack de osso foi revertido por piorar). Walk/run melhores (in-place).
3. **FASE 3 — bots**: rotas variadas (hoje mesmo caminho), moonwalk, olhar pra baixo.
4. **FASE 4 — gráfico/som**: bloom leve, **som por arma** (nagant/AKM/AK74/G3/M92 reais, não CS).
5. **FASE 5 — +3 personagens**: usuário tem 3 ideias. `ASSETS-PROMPTS.md` tem o formato pronto (10 arquétipos) pra gerar no Mint.

## Pendências abertas

- Tela de seleção: arma na altura do rosto + mão esquerda vazia (arma 1 mão). Causa: só há clipe de rifle. Conserto = Fase 2 (IK) ou clipe de 1 mão. NÃO tentar rotação de osso (piora).
- Usuário vai mandar as 3 ideias de personagem.
