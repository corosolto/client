# Auditoria final técnica dos 26 viewmodels

**Data:** 22/09/2026  
**PR:** [client#572](https://github.com/corosolto/client/pull/572) (draft)  
**Branch:** `codex/viewmodels-catalog-final`  
**HEAD auditado:** `4e7ba20b264855da49a7b3ef71cf027160f9082e`  
**Base:** `origin/main`; a branch estava `0` commits atrás e `178` à frente após o checkpoint do gate.

## Resultado

O catálogo fecha em 26 armas: 24 produtos privados e os dois controles públicos AK/faca. Vinte e
três produtos privados passam produto, rig KINEMATION, ações, mecanismo, contatos, ADS,
HUD/fallback, lifecycle e enquadramento nas duas proporções. AK e faca preservam os hashes golden.

A única exceção conhecida continua sendo a PT-38: produto, rig, ações, contatos, ADS,
HUD/fallback e lifecycle estão verdes, mas o enquadramento mede `1,796×`/`1,773×` e os braços
`2,250×`/`2,173×` em 3:2/16:9. Ela permanece congelada por decisão explícita; esta auditoria não
tocou seus bytes nem seu frame.

Esse estado é **tecnicamente fechado e visualmente pendente**. Nenhuma arma ou família foi
marcada `ready:true`; todas as famílias e o portão global continuam desligados. A promoção exige a
fila humana curta no fim deste documento.

## Integridade do checkout e do rollout

- HEAD local, `origin/codex/viewmodels-catalog-final` e o HEAD remoto do PR coincidiam antes do
  checkpoint de auditoria; depois do reparo do gate, local e remoto passaram a `4e7ba20b2`;
- `origin/main...HEAD`: `0` atrás;
- `eval:vm-foundation`: 22/22, catálogo com 26 IDs, 25 armas de fogo configuradas, fallback
  preservado, global/famílias fechados e zero asset privado versionado;
- `eval:vm-rig`: 24/24 produtos privados com 55/55 ossos KINEMATION e ações obrigatórias;
- régua de enquadramento sem PT-38: 23/23, zero falha em 3:2 e 16:9;
- todas as capturas listadas abaixo têm as duas proporções e `fatalErrors: []`;
- preview real ativo e respondendo HTTP 200 em `127.0.0.1:4401` durante a auditoria.

O `eval:vm-precision-tools` revelou um falso negativo exclusivo do macOS: o fixture criava a raiz
em `/tmp`, enquanto `Path.resolve()` do Python devolvia `/private/tmp`. O checkpoint `4e7ba20b2`
canonicaliza somente a raiz temporária do avaliador. O gate voltou a 10/10; nenhum produto, câmera,
FOV ou runtime foi alterado.

## Inventário arma por arma

Legenda: **G** = gate atual verde; **H** = evidência real nas duas proporções; **P** = revisão
humana pendente; **F** = dívida congelada. “Completo” cobre produto, mãos, mecanismo, contatos,
draw/fire/reload/inspect, ADS, HUD/fallback e lifecycle. Faca não possui ADS.

| Arma | Produto | Contrato técnico | 3:2 / 16:9 | Evidência real | Saída |
|---|---|---|---|---|---|
| AK-47 | golden público | controle, mãos/ações/lifecycle G | referência aprovada | `precision-frame-20260922-0540` + vídeo | G/H |
| Faca | golden público | controle, ações/contato/lifecycle G; ADS N/A | controle real | `precision-frame-20260922-0540` + vídeo | G/H |
| PT-38 | `04c126d931…` | completo G | **F: 1,796× / 1,773×; braços 2,250× / 2,173×** | `pistols-pt38-20260914` | F/P |
| Deagle | `d482ff82bc…` | completo G | 0,927× / 0,911× | `deagle-product-20260922` | G/H/P |
| Revólver .38 | `c1394590ae…` | completo G | 1,109× / 1,096× | `revolver-product-20260922` | G/H/P |
| M4 | `2d8e00559a…` | completo G | 0,946× / 0,881× | `rifles-m4-20260910` | G/H/P |
| MD97 | `d0989e2f56…` | completo G | 0,944× / 0,891× | `ar-frame-md97-20260922-0510` | G/H/P |
| SCAR | `958a0223cb…` | completo G | 0,972× / 0,900× | `ar-frame-scar-20260922-0512` | G/H/P |
| FAMAS | `640f3369d7…` | completo G | 0,979× / 0,925× | `rifles-famas-20260910` | G/H/P |
| Carabina | `8de215edb1…` | completo G | 0,954× / 0,899× | `rifles-carbine-20260910` | G/H/P |
| Tavor | `e90326406e…` | completo G | 0,978× / 0,921× | `rifles-tavor-20260910` | G/H/P |
| M92 | `95b0445bb1…` | completo G | 0,987× / 0,942× | `m92-kinemation-20260922-0340` | G/H/P |
| AKM | `ebcfd0d3b7…` | completo G | 0,913× / 0,905× | `akm-kinemation-20260922-0426` | G/H/P |
| G3 | `6a4cd484a8…` | completo G | 1,038× / 1,006× | `g3-kinemation-20260922-0440` | G/H/P |
| M400 | `f75e4625c1…` | completo G | 1,006× / 0,970× | `rifles-m400-20260913` | G/H/P |
| AWP | `3e6b77e457…` | completo G | 0,936× / 0,890× | `awp-kinemation-20260922-0455` | G/H/P |
| MP5 | `ac4630c494…` | completo G | 0,970× / 0,936× | `mp5-kinemation-candidate5-auto-ads` | G/H/P |
| Uzi | `353d0384ec…` | completo G | 1,008× / 0,941× | `smg-uzi-20260914` | G/H/P |
| P90 | `3eece3e0fb…` | completo G | 0,988× / 0,934× | `p90-kinemation-candidate7` | G/H/P |
| Remington 700 | `439a4859d8…` | completo G | 0,939× / 0,889× | `dmr-rem700-axis-5de60232d` | G/H/P |
| G3SG1 | `f6959a3ae2…` | completo G | 1,061× / 1,022× | `dmr-g3sg1-kinemation-f222d4991` | G/H/P |
| Mosin | `52b8db3adc…` | completo G | 0,977× / 0,934× | `precision-frame-20260922-0540` | G/H/P |
| SVD | `f44732930d…` | completo G | 1,024× / 1,023× | `precision-frame-20260922-0540` | G/H/P |
| SKS | `a52560d382…` | completo G | 1,000× / 0,955× | `precision-frame-20260922-0540` | G/H/P |
| Shotgun | `6c6c1ba3f7…` | completo G | 1,001× / 0,941× | `shotgun-product-final-20260922` | G/H/P |
| LMG | `3552c724ae…` | completo G | 0,723× / 0,691× | `lmg-product-final-184ae76b7` | G/H/P |

A LMG usa deliberadamente a faixa angular própria `0,65–0,85×`: aproximá-la até a escala da AK
atravessava o near plane durante ADS. O gate mecânico separado continua cobrindo caixa, cinto,
tampa, bandeja e alavanca.

## Gates causais, lifecycle e evidências

- os 11 fuzis passam gates próprios, mutantes independentes e lifecycle; cada lifecycle percorre
  30 ciclos e 540 amostras em 3:2/16:9;
- MP5, Uzi e P90 passam gates próprios e lifecycle;
- PT-38, Deagle e Revólver passam produto e lifecycle; a PT-38 é a única falha da régua cruzada;
- Rem700 e G3SG1 passam 13 verificações de integração, produto com mutantes e lifecycle 11/11,
  1.020 amostras;
- Mosin/SVD/SKS mantêm os hashes atuais dos manifestos, o recibo causal T/M/C/F/A verde e
  lifecycle 10/10, 630 amostras. O recibo causal preservado fica fora do Git em
  `generated/viewmodels-phase3/phase3-final-gates.json`;
- Shotgun passa 12 mutantes e lifecycle 11/11; LMG passa 16 mutantes e lifecycle 13/13;
- as evidências reais cobrem idle, draw/equip, tiro, recarga, inspect e ADS conforme o mecanismo
  de cada arma. Todas têm 1440×960 e 1440×810; os recibos escolhidos têm zero erro fatal.

Os assets privados e as capturas permanecem fora do Git em
`/Users/ruben/csbrasil-private-assets/generated/`. O repositório guarda somente manifests,
receitas, gates e recibos textuais.

## Fila humana curta

O servidor já está ativo. Abrir cada URL, usar o painel `vmqa=precision` e revisar em janela
1440×960 e 1440×810. Para cada grupo: idle, draw, tiro, recarga tática/vazia ou loop, inspect,
entrada/saída de ADS, troca rápida e morte/respawn. Registrar somente arma + estado + proporção.

1. **Controles e pistolas**  
   `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak,pistol,deagle,revolver&vmweapon=ak,pistol,deagle,revolver38&vmqa=precision`
2. **Fuzis**  
   `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ar,ak,g3&vmweapon=m4,md97,scar,famas,carbine,tavor,m92,akm,g3&vmqa=precision`
3. **Submetralhadoras**  
   `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=mp5,smg,p90&vmweapon=mp5,uzi,p90&vmqa=precision`
4. **Precisão e DMR**  
   `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=sniper,bolt,svd,marksman,g3&vmweapon=awp,m400,mosin,rem700,svd,g3sg1,sks&vmqa=precision`
5. **Pesadas**  
   `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=shotgun,lmg&vmweapon=shotgun,lmg&vmqa=precision`
6. **Fallback**  
   `http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta`

Aceite humano não muda flags automaticamente. Depois do feedback, a promoção deve ocorrer em um
checkpoint separado, por família aprovada, sem misturar a correção congelada da PT-38.

## CI do PR

No HEAD anterior `8e000e0a1`, o PR estava `OPEN`, `draft`, `CLEAN`, com `build`, `smoke`,
`portao`, `ratchet`, `dco`, CodeQL e análises verdes; jobs condicionais de release/probe estavam
`SKIPPED`, como esperado para draft. O checkpoint `4e7ba20b2` iniciou uma nova rodada de CI; seu
estado final deve ser lido no próprio PR antes da revisão humana virar promoção.

