# BOOT-PRACA-AMBIENCE — continuação H1 (2026-10-31)

## Objetivo / DoD
Declarar no registro os 3 tipos de fauna que `praca_poderes` (Brasília) já instancia (2 ratos,
6 pombos, 2 tatus), eliminando o `ambience: []` que fazia o ambient loader cair no fallback
de 11 e baixar 8 espécies não usadas. DoD do patch H1: 2 JS alterados, 1 ledger, sem tocar
instâncias/rotas/colisores/materiais, sem afrouxar tetos (8_200_000B / 340 requests /
3 exemptions / ordem props→fauna intactos).

## Branch / base
`codex/boot-praca-ambience-20261031` @ `3018ee07884b1c970a23b08ebf86adae210a6cbb` (WT
`boot-praca-ambience-20261031`, verificado limpo antes da edição).

## Fonte / evidência
Relatório externo ABSOLUTO:
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-31-visual-consistency/ORC1-LOAD-RO-R42.md`
e dados `BOOT-ORC1-COST-R41.json` na mesma pasta. Números e tabelas derivados não são
duplicados aqui — ver lá. Nota: R41 nominal original tinha pequena margem e o push do R40
falhou; **nada se declara consertado antes de prova**.

## Autoria
Patch mínimo H1 autoral nativo GLM5.3 via OMP.

## Fonte alterada e limites
- `public/js/map_brasilia.js`: nova linha após `export BRASILIA_PROPS` —
  `export const BRASILIA_AMBIENCE = Object.freeze(['rat', 'pigeonGround', 'armadillo']);`
- `public/js/maps.js`:
  - `MAPS.praca_poderes`: acrescentada `ambience: ['rat', 'pigeonGround', 'armadillo'],`
    depois de `props` (mesma ordem dos outros mapas).
  - `EXPORTS.praca_poderes`: acrescentado `ambience: 'BRASILIA_AMBIENCE'` na mesma
    declaração `build`/`props`.
- Nenhuma mudança em instâncias, assets, rotas, colisores, build, materiais, `main`,
  `ambientlife`, checker, READY, janela ou tetos. Outros mapas intactos. H2 (props comuns)
  permanece SEPARADO e não foi tocado.

## Estado
DONE apenas como patch. **Runtime NÃO testado.** Nenhum browser, teste, build, quality gate,
commit ou push foi rodado. Fonte alterada não é produto aprovado nem ORC1 pós-fix green.

## Pendências / next steps (dependem do ROOT)
- Revisão do diff de 3 arquivos.
- Prova real: 3 assets / 10 animais GLB / 0 fallback depois da fauna resolvida + rebuild;
  paridade visual/posições/rotas/colisores/assets.
- Nominal + 2 mutantes causais sem alterar contrato.
- Supervisor fará freeze externo (manifest/patch fora da WT).

## Validação real Root R43/R44 (ainda sem publicação)

QA base3018 recebeu somente os2JS byteexatos f88fee0b/8a3e3e6d para a prova.
Ego43/Praça/med: dez animais reais GLB, zero fallback, configurações dos2ratos,
6pombos e2tatus exatamente iguais antes/depois. Colisores232, occluders172
com atributos/índices/matrizes, spawns/CTF/bounds/rotas309nós e2835amostras
finas do chão preservados; SHA físico ae865ea7cebb811d74ce06737a4ad71f560fce266f0b0e387a207cbce127218d.
Fonte servida f88/8a3e conferida, contexto válido, prefs restauradas; Root abriu
PRACA-H1-EGO-1320x880-R44.png. PRACA-H1-VALIDATION-R44.json conserva o escopo.

No Ego debug/autostart coldcache foram6requests para3URLs (2porURL); não se
alega eliminação de duplicatas concorrentes. O buffer default da baseline
perdeu entradas, logo seu count2 não é baseline de rede válida. As3rodadas
boot independentes registram exatamente3requests de fauna necessária cada.

BOOT-PRACA-H1-R43.log terminou EXIT1: nominais8.123.822B/324 e7.753.911B/325
GREEN, cartaz-ansioso11.973.370B/348 detectado exatamenteORC1+ORC2. Terceiro
nominal8.335.149B/326 RED (135.149B acima do teto), portanto fauna-cedoNÃO
aplicado. H1 é redução real de espécies sem consumidor, NÃO é ORC1 aprovado.
Investigação H2 sobre onze props comuns sem consumidor segue separada.
Nenhum teto/janela/isenção/ordem foi alterado; sem rerun por sorte.

Crítico independente focal H1 e checkpoint seletivo ainda pendentes. O push
R40 já havia falhado no ORC1, sem publicar; remoto1188 permanece31dcb7 e
staging ausente. Missão integral/release/arte/mobile/MP continuam incompletos.

Root leu integralmente CRITICO-PRACA-H1-R43.md (8735B/SHA66082fbdad74bd105f6ce160a8c516621ceb37bbefebb1f02858b9cadbc24ae0):
CLEAN focalH1/appendR44, semfindingacionável. ORC1globalRED/H2pendente
inalterados. Checkpoint seletivo registra redução necessária com escopo
validado, semafirmar push/CIhosted/staging/release aprovados.
