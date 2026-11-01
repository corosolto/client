# Praça: seleção de props e continuação H2 — 2026-11-01

## Estado atual R48: validado focalmente, sem publicação

Root leu integralmente CRITICO-PRACA-H2-R47.md (0d68e58d): CLEAN focal dos sete
arquivos e fronteiras afetadas. Docs e arch EXIT0. Próximo: checkpoint, integrar
main atual e push normal completo; CI/wholePR/staging/merge/release pendentes.
Arte inteira/mobile/MP e igualdade de pixels não aprovados.

### Fase de autoria R45 (histórico)

Autoria nativa GLM 5.3 via OMP. Estado: **PATCH ONLY, sem testes, sem browser, sem Git** —
supervisor congela após este patch; nenhuma verificação foi executada aqui.

## Objetivo

Implementar o desenho H2 aprovado: seleção de props de mapa unificada por `mapPropIds(mapa)`,
com `MAPS.praca_poderes.propsComplete: true` (lista integral própria, sem os 11 comuns
extras). Desenho aprovado (fonte única, inventário e tabelas lá):
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-31-visual-consistency/BOOT-PRACA-H2-DESIGN-R44.md`

## Base

- WT `boot-praca-ambience-20261031`, branch `codex/boot-praca-ambience-20261031`,
  HEAD `3018ee07884b1c970a23b08ebf86adae210a6cbb`.
- H1 pré-existente/diff dirty **preservado**; `map_brasilia` (H1) e ledgers H1 fora do
  lease, intocados. `maps.js` H1 (ambience ×3) e EXPORTS de mapping não alterados.

## Escopo (7 arquivos, todos no lease)

1. `public/js/maps.js` — só `praca_poderes` ganha `propsComplete: true`, entre `props` e
   `ambience`. Demais mapas, arrays e EXPORTS intactos.
2. `public/js/mapprops.js` — nova `mapPropIds(mapa)` após `COMMON_MAP_PROPS` (23 comuns
   inalterado): 3 linhas de body, lê `mapa.props` uma vez, strict, sem mutação, sem cache,
   getter por chamada. Sem o bug GLM R44 (`typeof` + releitura repetida). `preloadMapProps`,
   loader, `_base`, `hasProp`, `placeProp`, URLs e COMMON intactos.
3. `public/js/main.js` — import 18 → `mapPropIds` (mantém `preloadMapProps`); alias
   `MAP_PROPS` e comentários obsoletos removidos; `menuProps` = `return mapPropIds(mapa)`
   (chamada 461 e ordem rebuild/propsReady/fauna/READY exatas); `_startGame`
   `preloadMapProps(mapPropIds(mapaPartida))`; `mpPreCarregarProximo`
   `preloadMapProps(mapPropIds(mapa))`. Linha MP `required` (~2015) **inalterada**.
4. `public/mapview.html` — import → `mapPropIds`; `GLOBAL_PROPS` removido;
   `allProps = mapPropIds(def)`; `Promise.all` e ordem/build conservados.
5. `tools/eval/graffiti-support-browser-check.mjs` — `measure` importa
   `{ mapPropIds, hasProp }`; `unloadedTemplates = mapPropIds(MAPS[window.__mapId])
   .filter(id => !hasProp(id))`. Predicados/limiares/flags/CLI/provas intactos.
6. `tools/eval/skin-profile-flow-check.mjs` — `mapPropIds` REAL importado de
   `public/js/mapprops.js` após `const bloco`; entra no `env` do `new Function`
   (`preloadMapProps:()=>Promise.resolve(), mapPropIds, mapaPartida:{}`), removido o
   `MAP_PROPS: []` morto. Mutantes/asserts/thresholds/causalidade intactos.
7. Este ledger.

## DoD final — PENDENTE, responsabilidade do root (aqui NÃO executar nada)

- Revisão do patch nos 7 arquivos.
- Seleção real: 12 props no menu, start direto, MP e mapview, sem os 11 extras; outros
  mapas com mesma lista/ordem e getter dinâmico (uma leitura por chamada, sem cache).
- MP `required` subset inalterado; 3 fauna (10 animais GLB/H1 — root já mediu no Ego;
  isso **não** aprova H2).
- Paridade visual: instâncias, assets, transforms, colisores, rotas.
- Bloqueio de GLB necessário com declaração esperada intacta deve REPROVAR, sem remover
  o ID esperado.
- Nominal + os 2 mutantes ORC exatos, sem alterar teto/janela/3 exemptions/READY/âncoras/
  qualidade.

## Custos e pendências conhecidas

- Custo **existente** de 1,8 MB (R41) **não é economia** após este fix; ORC-1 global segue
  **RED** até prova em contrário.
- `menu-map-props-check` legado RED conhecido, fora do lease — não editar nem agregar sem
  review do root.

## Revisão estática posterior do supervisor

Após o GLM encerrar, o bruto foi preservado fora da WT em `BOOT-PRACA-H2-R45-native`
no audit do desenho. O supervisor restaurou `initTextures()` no mapview e os bindings
`MOBILE_AUTO`/`preloadAmbientLife` na fixture, removidos acidentalmente, e corrigiu acima
a instrução do controle negativo. Só houve inspeção de diff/Git em leitura; nenhum
teste, lint, build, browser, commit ou push. O freeze distingue bruto e correções.

## R46 — primeira validação real do Root, cena/revisão ainda pendentes

Root leu integralmente patch/manifest7files e aplicou naQA1a6013f4a comgitapply,
conferindo seteSHA finais. Nenhum outro produto foi integrado. Bootreal completo
eval:bootorcamento EXIT0 sobre snapshot2487c275/205módulos: três nominais
5.636.263B/277,6.451.096B/284 e6.596.547B/282; READY porassets, trêsisenções,
propsantesfauna, mesmos tetos/janela. Cartaz-ansioso capturado exatamente
ORC1+ORC2, fauna-cedo exatamenteORC3. Todos oito passes (incluindo referências)
pediram osdozeGLBs declarados e nenhumdosonze extras. Evidência externa
BOOT-PRACA-H2-VALIDATION-R46.json e provasHTTP, sem inferir economia por subtração.

Aliasreal de skin-profile-flow (nominal+4mutantes, comnominalantesdecada) e
mp-proximo passaram Node22.23.4/26.12.1; logs preservados/hashados no mesmoJSON.
Esses contratos usam promessas controladas/source e não provam redeGLB ouMP real.
Congresso necessário bloqueado, cena/props/física completa antes/depois,
transições e crítico independente H2 ainda pendentes. SemcheckpointH2/push/CI
hosted/staging/merge/release. A dívidaORC1 histórica permanece registrada acima;
esta é a primeira prova pós-H2, não rerun favorável da fonte antiga.

## R47/R48 — cena real, controles causais e revisão independente

Root executou o driver selector/callers em Node22/26:48/48PASS por Node,18mapas,
strict/getters/seeds/callers/required e before23/fixo12. Cena Ego BEFORE/AFTER e
same-H2 reload: todas completas, med/1320×880/DPR1. Mesmos351nós/235geometrias/
69materiais/104texturas/37nós prop/12IDs/10animais,232colliders/172occluders e
2835amostras de chão. Seis digests e dados raw correspondentes são idênticos:
física/placements/fauna/geometria/materialParams/cena. Quinze GLBs têm hashes
iguais; nove fontes batem com pins respectivos (três deltas H2 intencionais).

Pixels de44CanvasTextures variam, inclusive nas mesmas44 ao recarregar H2 sem
alterar código; demais60texturas, samplers e bindings idênticos. Root abriu os
três PNGs: objetos/enquadramento preservados, ruído procedural varia. Não se
alega igualdade de pixels ou aprovação artística geral. Consolidado externo:
PRACA-H2-RUNTIME-VALIDATION-R48.json, com hashes e limites completos.

Negativo real com Congresso bloqueado manteve os12IDs esperados/own, observou
missing apenascongresso/0nótagueado e rejeição do carregador required real.
Finally desbloqueou/cachefalse/recarregou e restaurou12/10fauna/contexto válido.
Imagem aérea não mostra Congresso: ausência é prova de registro/loader, não PNG.
Transições reais de módulos+preloader na mesma página: Praça12→Penitenciária23→
Praça12, cache12→23→23, sem ausentes nem alteração da cena. Não é clique UI nem
sessão MP real. Evidências PRACA-H2-CONGRESSO-BLOCK-R48 e LOADER-TRANSITIONS-R48.

Crítico independente integral H2 (GLMRO + supervisão nativa) confrontou fontes,
logs, JSONs e imagens, sem finding acionável; Root leu o parecer inteiro. Fonte
H2 não mudou desde o freeze R45. Este append apenas consolida provas; não fecha
a missão integral nem transfere aceite para outras stacks. ORC1 histórico acima
continua histórico; bootR46 passou sem mudar teto, janela, READY ou isenções.
