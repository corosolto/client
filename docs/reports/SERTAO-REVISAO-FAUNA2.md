# Sertão — revisão de fauna, horizonte e Canudos

Base da rodada: d48d389c. Branch codex/sertao-astra, worktree exclusiva.
PR511 continua draft contra map2/velho-oeste, continuação de445.

## Antes e depois

O dono aprovou aproximadamente 90% do cenário e apontou galinha muito simples,
calango bípede e horizonte seco. Preservamos casario/menu/layout/objetivos.
Calango agora usa derivado quadrúpede do lagarto local, com clipe Run local,
passada alternada, pausa, fuga limitada e quatro apoios neutros. Chrome detectou
9,17 mm de flutuação causada pela caixa conservadora de morph; correção usa
vértices reais na normalização, com mutante específico.

Quatro tentativas de árvores procedurais passaram números e foram REJEITADAS
visualmente. A r5 usa seis juazeiros existentes com copa leve e 27 arbustos.
Crítico independente aprovou essa frente para revisão humana, sem regressão
material na praça/leste/sul. Quatro aves distantes (uma em low) usam duas
malhas instanciadas autorais; voo não mascara inimigos. Portal agora CANUDOS,
POP. 16.693 • IBGE 2025, estimativa datada, sem alegação de recriação histórica.

**Ainda fora do jogo:** galinha/pintinho/cabra novos. Gerados no Mint e
examinados no visualizador 3D, mas não baixados: termos de uso verificáveis
ainda pendentes da fonte solicitada ao dono. Animação animal local ainda
necessária; não atribuir ao Mint clipes não entregues. Homenagem Padre Cícero
procedural/Blender rejeitada por rosto genérico; protótipos fora do produto.

## Evidência e medidas

Galeria versionada: tools/eval/asset-evidence/sertao-fauna2/README.md.
Galeria local autocontida: artifacts/sertao-astra/fauna2-galeria.html.
Originais 3:2: fauna2-horizon-r5 e life-polish-r5 sob artifacts/sertao-astra.
Vídeo calango: calango-quadrupede/calango-motion.mp4.
Prévia de 6 s a 24 fps real: public/img/map-previews/velho_oeste.mp4; recibo associa
fontes, câmera e hashes. JPEG 4f27487808ce, MP4 3d9682b436ca.

- Mapview RV: 12/12, 496 calls / 337.248 triângulos, teto de 503 / 368.208 preservado.
- Horizonte HZ: 9/9 + 13 mutantes isolados;3 lotes / 46.230 triângulos, low: 20.853, zero
  texturas novas. Dispose libera instâncias e recursos próprios, não compartilhados.
- Aves SDB: 8/8 + 9 mutantes isolados:4/1 aves, 2 draws / 768 triângulos em médio.
- Calango CQ: 10/10 + 11 mutantes Node; CR: 6/6 + 4 mutantes Chrome.
- Fauna FA: 4/4 + 4 mutantes; 14.400 amostras de fuga, zero penetração, low: 1 calango.
- Integração LP: 4/4 + 3 mutantes; fonte atual do mutante horizonte repetida na r5.
- Preview PV: 6/6 repetido com a nova mídia; race e demais mutantes da revisão
  anterior preservados, sem modificação do controlador nesta rodada.
- Específicos: 13/13 repetidos: Sertão/VelhoOeste, spatial/occlusion/flora/mandacaru,
  contratos, ambience-registry, look, props, integridade, calango e aves.
- Partida de 30 s com 7 bots: p50 de 8,4 ms / p95 de 12,6 ms; 109,39 m, heap de 100,18 MB, zero erros.
  Métrica local; não é aprovação de equilíbrio competitivo ou FPS universal.
- Build, assert:assets, maptex e ambiência global em Chrome passaram.
  Global final: **114/115** em 399,5 s; único vermelho: `audio:check`,
  `manifest.json DEFASADO em relação ao disco`, falha herdada. Não foi
  regenerado áudio para esconder a pendência.

Logs: artifacts/sertao-astra/logs/fauna2-*.log; mutantes HZ em horizon/r5/*.log.
Tentativas inválidas de nomes de mutante SDB não contam como contraprovas;
apenas as nove execuções corretas documentadas foram contabilizadas.

## Pendências

Termos Mint, download/otimização/rig e integração da mãe/pintinhos/caprinos;
novo candidato digno para memorial; revisão adversarial humana completa.
Fundo muito distante ainda simples/esparso. Áudio sanfona/forró ausente,
manifesto herdado e lacunas de procedência Mint / texturas real-v1 continuam
registrados. Preview Vercel anterior falhou com HTTP 403 no pacote de áudio.
Sem alteração de credenciais/storage, merge ou deploy manual.

## Arquivos exatos desta rodada

Diferença desde d48d389c; inclui mudanças documentais geradas e evidências pequenas.

- `ARCH.generated.md`
- `README.md`
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
- `docs/reports/SERTAO-AVES-DISTANTES.md`
- `docs/reports/SERTAO-CALANGO-QUADRUPEDE.md`
- `docs/reports/SERTAO-CONTINUACAO.md`
- `docs/reports/SERTAO-CRITICA-FAUNA2.md`
- `docs/reports/SERTAO-FAUNA2-ASSETS.md`
- `docs/reports/SERTAO-HORIZONTE.md`
- `docs/reports/SERTAO-MEMORIAL.md`
- `mint-assets.json`
- `package.json`
- `plans/16-SERTAO.md`
- `public/img/map-previews/velho_oeste.capture.json`
- `public/img/map-previews/velho_oeste.jpg`
- `public/img/map-previews/velho_oeste.mp4`
- `public/js/ambientlife.js`
- `public/js/map_preview_media.js`
- `public/js/map_sertao_distant_birds.js`
- `public/js/map_sertao_horizon.js`
- `public/js/map_velho_oeste.js`
- `public/models/ambient/FONTE.md`
- `public/models/ambient/calango_quadrupede.glb`
- `public/models/props/FONTE.md`
- `public/models/props/sertao-procedural.json`
- `tools/derive-calango-quadruped.mjs`
- `tools/eval/asset-evidence/sertao-fauna2/README.md`
- `tools/eval/asset-evidence/sertao-fauna2/aves.jpg`
- `tools/eval/asset-evidence/sertao-fauna2/calango.jpg`
- `tools/eval/asset-evidence/sertao-fauna2/canudos.jpg`
- `tools/eval/asset-evidence/sertao-fauna2/horizonte-antes.jpg`
- `tools/eval/asset-evidence/sertao-fauna2/horizonte-depois.jpg`
- `tools/eval/calango-quadruped-check.mjs`
- `tools/eval/calango-quadruped-runtime-check.mjs`
- `tools/eval/calango-surface-check.mjs`
- `tools/eval/sertao-check.mjs`
- `tools/eval/sertao-distant-birds-check.mjs`
- `tools/eval/sertao-fauna-runtime-check.mjs`
- `tools/eval/sertao-horizon-check.mjs`
- `tools/eval/sertao-life-polish-runtime-check.mjs`
- `tools/eval/velho-oeste-check.mjs`
- `docs/reports/SERTAO-REVISAO-FAUNA2.md`
