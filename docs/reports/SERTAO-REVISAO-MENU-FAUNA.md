# Sertão — revisão de menu, prévia e fauna

Complementa [SERTAO-ENTREGA.md](SERTAO-ENTREGA.md), que conserva o diagnóstico
original e a pesquisa de referências/Sketchfab. Esta revisão nasce dos pedidos
de preview real, animais adicionais e menu alinhado à main. Base PR44549441895;
branch exclusiva `codex/sertao-astra`; referência de menu main69555790.

## Antes e depois

| Problema observado | Resultado verificável |
|---|---|
| Menu exibia `{FACTIONS.map(...)}` e imagem quebrada | Servidor Astro real8149 renderiza as dez facções; o harness8145 não processa Astro. |
| Shell cinematográfico divergente da main | Estrutura/CSS de home, facções, personagem e configurações alinhados, com catálogo10 e entrada local preservados. |
| Thumbnail era ilustração | JPEG e vídeo6s do mapa real,960×640, com recibo de câmera/fontes/hashes. |
| Preview podia parar após promessa antiga de play | Token de sessão impede resolução/rejeição antiga de interromper novo hover; duas contraprovas. |
| Fauna aérea ausente, poucos calangos | Três asas-brancas articuladas autorais, uma em low; mais dois calangos em rotas testadas. |
| Triângulo preto enorme no calango | Removida somente a face espúria,4958→4957tris, mesmos materiais/texturas/pose e cache por conteúdo. |
| EM PRODUÇÃO também prometia entrada | CTA de hover/foco restrita aos cards habilitados; baseline vermelho e mutante MENU8. |

O preview carrega vídeo só na interação, sem áudio. Pausa ao sair, navegar,
ocultar a aba ou mudar preferência de movimento. Toque/economia de dados e
movimento reduzido mantêm a imagem. A mudança de thumbnail é do Sertão;
as mídias dos outros mapas não foram substituídas nesta frente.

## Capturas e avaliação independente

A [galeria versionada](../../tools/eval/asset-evidence/sertao-review/README.md)
inclui praça antes/depois, menu, catálogo, personagem real, card, asa-branca e
calango. PNGs originais1536×1024 em `artifacts/sertao-astra/`; JPEGs da galeria
são apenas redimensionados para1200×800. Nenhuma imagem gerada substitui captura.

O crítico aceitou menu, personagem, miniatura e aves distantes para revisão
humana. Reprovou race do vídeo, CTA indisponível e face preta: todos corrigidos
com contraprovas e nova evidência. Não aprovou realismo completo do calango:
pose ereta e locomoção procedural continuam artificiais. A avaliação anterior
do mapa foi7/10, com piso distante repetitivo e diferença de acabamento entre
famílias de casas. Essa nota não se transforma em aprovação pelo resultado dos gates.

## Validação desta revisão

| Régua | Resultado |
|---|---|
| Sertão/VelhoOeste, spatial, occlusion, flora, mandacaru, contratos, assets, look, ambience-registry e contratos novos | 15/15 scripts próximos passaram. |
| Runtime WebGL | RV1–12 verdes;491calls/291060tris, dentro de503calls do baseline. |
| Fauna procedural | SF1–7 verdes e sete mutantes isolados. |
| Fauna servida | FA1–4 verdes e quatro mutantes isolados;14400 amostras de movimento/fuga sem colisões indevidas. |
| Superfície/calango/cache | CS1–3 verdes e três mutantes isolados; Khronos0erros e mesmo aviso herdado de tangentes. |
| Preview | PV1–6 verdes; seis mutantes isolados e um multialvo. `sem-pausa` reprovaPV4/PV5; `sem-saida` reprova sóPV4. |
| Race de preview | Promessas antigas resolve/reject preservam sessão nova; ambos mutantes detectados. |
| Menu | MENU1–8 verdes, oito mutantes isolados; redesign43/43 e contraprovaUIR26. |
| Ambience global no navegador | Passou; preservada a regra de pombas terrestres dos outros mapas. As novas asas-brancas usam módulo separado. |
| Build, assert:assets e maptex | Passaram. |

Primeira bateria global:109/112, com `audio:check` herdado, `eval:medianet`
por formato de Promise não reconhecido e `eval:docsautoria` durante atualização
dos índices. O guard de mídia foi adaptado em b917cce1 sem reduzir a régua;
baseline e dois mutantes da race continuaram passando. Índices regenerados
antes da execução global final. Não interpretar aquela primeira rodada como verde.

Execução final sobre037c48b1: **111/112 gates passaram**, em304,0s. Única falha:
`audio:check`, manifesto herdado DEFASADO. `eval:medianet`, `eval:docsautoria`,
todos os contratos novos e os demais globais passaram. Log completo:
`artifacts/sertao-astra/logs/revision-final-check-fast.log`. Build final passou;
preview repetido após b917cce1: baseline e sete mutantes detectados corretamente.

Resultados e contraprovas resumidos em
[evidence.json](../../tools/eval/asset-evidence/sertao-review/evidence.json) e
[mutations.json](../../tools/eval/asset-evidence/sertao-review/mutations.json).
Logs completos em `artifacts/sertao-astra/logs/revision-*`.

Partida de30s, sete bots, elenco/arma fixados no instrumento: p50=8,4ms,
p95=10,6ms,60,39m percorridos, nenhum erro JS,95,8MB heap. Média603,38calls e
458257triângulos/frame inclui passes do jogo; não comparar diretamente ao
mapview. Amostra histórica anteriorp95=10,0ms não constitui A/B causal desta
revisão. As três travessias completas estão documentadas no marco anterior.

## Limitações e revisão local

- Licença específica/autoria dos assets Mint herdados e texturas real-v1 ainda
  precisam de comprovação. Nenhum novo download/gasto: Mint abriu sem sessão;
  aves são código autoral, calango é reparo do acervo existente.
- Sanfona/forró ainda ausente, pacote de áudio não distribui ambiente e manifesto
  de áudio continua defasado. Os sete áudios CC0 recuperados têm procedência no
  relatório anterior. Nenhum asset foi inventado para ocultar essa pendência.
- Main foi referência visual; multiplayer/backend dela não foram transplantados.
- PR445 continua com conflito contra feat/times-e-mapas-completo. Esta branch
  entra como PR contra map2/velho-oeste, sem modificar a branch original.
- Fluxo normal chegou ao jogo. Chrome com janela confirmou pointer lock e giro
  de10,479rad (~600°), sem erros JS; headless não obteve lock. Usar aba própria sem debug.

Servidor correto: `http://localhost:8149/?map=velho_oeste&lang=pt`.
Se precisar iniciá-lo: `npm run dev -- --host 127.0.0.1 --port 8149`, com Node22+
na worktree `/Users/ruben/csbrasil/worktrees/sertao-astra`. Se a porta estiver
ocupada, conferir a porta efetivamente anunciada pelo Astro. O servidor8145 é
arnês de avaliação, não referência para menu. Nenhum merge ou deploy autorizado.

## Arquivos

A lista abaixo é o diff acumulado contra49441895, incluindo o marco original e
esta revisão. Não inclui artefatos volumosos ignorados pelo Git.

- `.gitignore`
- `ARCH.generated.md`
- `README.md`
- `SCRIPTS.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/docs/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/reports/SERTAO-AUDIO-PENDENCIAS.md`
- `docs/reports/SERTAO-CEU.md`
- `docs/reports/SERTAO-CONTINUACAO.md`
- `docs/reports/SERTAO-CRITICA-BASELINE.md`
- `docs/reports/SERTAO-CRITICA-FINAL.md`
- `docs/reports/SERTAO-CRITICA-R2.md`
- `docs/reports/SERTAO-CRITICA-R4.md`
- `docs/reports/SERTAO-ENTREGA.md`
- `docs/reports/SERTAO-ESPACIAL.md`
- `docs/reports/SERTAO-FAUNA-VOO.md`
- `docs/reports/SERTAO-FLORA.md`
- `docs/reports/SERTAO-MENU-MAIN.md`
- `docs/reports/SERTAO-OCLUSAO.md`
- `docs/reports/SERTAO-REFERENCIAS.md`
- `docs/reports/SERTAO-REVISAO-MENU-FAUNA.md`
- `mint-assets.json`
- `package.json`
- `public/audio/ambiente/FONTE.md`
- `public/img/map-previews/FONTE.md`
- `public/img/map-previews/velho_oeste.capture.json`
- `public/img/map-previews/velho_oeste.jpg`
- `public/img/map-previews/velho_oeste.mp4`
- `public/js/ambientlife.js`
- `public/js/look.js`
- `public/js/main.js`
- `public/js/map_preview.js`
- `public/js/map_preview_media.js`
- `public/js/map_sertao_architecture.js`
- `public/js/map_sertao_fauna.js`
- `public/js/map_sertao_flora.js`
- `public/js/map_sertao_landscape.js`
- `public/js/map_sky.js`
- `public/js/map_velho_oeste.js`
- `public/map-preview.css`
- `public/models/ambient/FONTE.md`
- `public/models/ambient/calango.glb`
- `public/models/props/FONTE.md`
- `public/models/props/sertao-procedural.json`
- `public/style.css`
- `src/pages/index.astro`
- `tools/capture-sertao-preview.mjs`
- `tools/eval/ARCH.md`
- `tools/eval/ambience-check.mjs`
- `tools/eval/asset-evidence/sertao-review/README.md`
- `tools/eval/asset-evidence/sertao-review/asa-branca.jpg`
- `tools/eval/asset-evidence/sertao-review/calango.jpg`
- `tools/eval/asset-evidence/sertao-review/evidence.json`
- `tools/eval/asset-evidence/sertao-review/faccoes.jpg`
- `tools/eval/asset-evidence/sertao-review/mapas.jpg`
- `tools/eval/asset-evidence/sertao-review/menu.jpg`
- `tools/eval/asset-evidence/sertao-review/mutations.json`
- `tools/eval/asset-evidence/sertao-review/personagem.jpg`
- `tools/eval/asset-evidence/sertao-review/partida.jpg`
- `tools/eval/asset-evidence/sertao-review/praca-antes.jpg`
- `tools/eval/asset-evidence/sertao-review/praca-depois.jpg`
- `tools/eval/calango-surface-check.mjs`
- `tools/eval/cinematic-ui-contract-check.mjs`
- `tools/eval/look-check.mjs`
- `tools/eval/map-preview-check.mjs`
- `tools/eval/map-preview-race-check.mjs`
- `tools/eval/redesign-check.mjs`
- `tools/eval/sertao-check.mjs`
- `tools/eval/sertao-fauna-check.mjs`
- `tools/eval/sertao-fauna-runtime-check.mjs`
- `tools/eval/sertao-flora-check.mjs`
- `tools/eval/sertao-occlusion-check.mjs`
- `tools/eval/sertao-runtime-check.mjs`
- `tools/eval/sertao-spatial-check.mjs`
- `tools/eval/sertao-traversal-check.mjs`
- `tools/eval/velho-oeste-check.mjs`
- `tools/repair-calango-surface.mjs`
