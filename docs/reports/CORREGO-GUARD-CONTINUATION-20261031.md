# Córrego: protótipo das guardas da travessia alta

A missão integral de consistência visual/release continua com Root. Esta lane contém apenas o protótipo autorizado de FAVELA-M3-PROXIMA-INTERVENCAO-RO-R1; não é adoção nem aceite M3.

Base `6a5b12b4280941e8e689dc199ad50582f6522887`; branch `codex/corrego-guard-finish-20261031`; WT `worktrees/corrego-guard-finish-20261031`, criada limpa. QA/outros WTs, browser, geração de assets, serviços pagos, gates/baselines, push/PR/merge ficaram fora desta lane. ARCH regenerado sem diff.

## Alteração e evidência

GLM5.3 implementou em `public/js/map_corrego.js` somente o material e a UV da família local: 2 guardas centrais e 4 inclinadas. O albedo existente `tex_madeira.webp` usa Source compartilhada, Texture/repeat próprios em 1×1 e cor branca; roughness .9 preservado. UV autorada por metro antes da rotação do lote; marcador local impede segunda escala dependente da carga da imagem. Codex apenas restituiu uma linha de comentário perdida pelo hunk. Nenhuma nova malha ou imagem.

Diagnóstico privado de `buildCorrego` real, seed44031, med/low × fria/quente: 488/442 malhas totais e 3 malhas alvo (2 diretas + lote das 4 rampas). Todos os atributos position/index/normal/color, grupos, matrizes, side/layers e malhas não alvo iguais. Mudaram apenas UV/UV1, mapa/cor das guardas e seu marcador de UV. Colliders, navegação/rotas e campos físicos serializados iguais; grade amostrada de groundHeightAt e 4 rays reais iguais. Samplers de madeira não alvo iguais; Source compartilhada e Texture/repeat distintos confirmados. UV finita, não colapsada e hashes iguais fria/quente em cada qualidade. Os valores singulares medidos são ~0.36–0.58465 ciclos/m, apenas diagnóstico da receita, sem novo limiar artístico.

Node22.23.4: contratos Córrego (contract, water, superficie, ponte) verdes; graffiti mount med/low com self-tests verdes; wrappers favela (5 mutantes), materiais (8), uv (4) verdes com REDs exatos. Source estável em todos os runs. Syntax passa em Node22.23.4 e Node26.12.1. Nenhum contrato ou baseline foi alterado. Um run disparado enquanto GLM ainda escrevia foi renomeado INFLIGHT e excluído da prova; os runs citados ocorreram após fonte estável.

## Artefatos e reprodução

Audit comum: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-31-visual-consistency/`.

- `CORREGO-GUARD-MANIFEST-BEFORE-AFTER-R1.json`: manifesto compacto com hashes/tamanhos dos 8 snapshots, diferenças permitidas, sampler e limites; diagnóstico `CORREGO-GUARD-DIAG-R1.mjs`, comparação privada `CORREGO-GUARD-COMPARE-R1.py`.
- `CORREGO-GUARD-BASE-6a5.js`: fonte anterior imutável SHA256 `ef7bb3c6f512c6c18dcdd3abe8edc339a10d72954ef5d708534d644c8582b295`. Fonte candidata SHA256 `44710cfb1ffe0181723d93ab3c3cdf5ce8c40aa8a5be755e065a25899826111b`.
- `CORREGO-GUARD-CONTRACTS-NODE22-R1.json`: comandos, cwd, status, hashes da fonte e logs; `CORREGO-GUARD-GLM-R1.log`/`...REPORT.md`: implementação real. Revisão focal GLM5.3 somente leitura concluiu sem blocker técnico; registro em `CORREGO-GUARD-GLM-REVIEW-R1.log`. As alegações de custo/render do modelo não foram adotadas como evidência.

Repro diagnóstico: `node <audit>/CORREGO-GUARD-DIAG-R1.mjs <WT> before|after med|low cold|warm <OUT.json>`. A opção quente é fixture explícita de dimensões 512×512 somente da madeira, não decode/render no browser. Os arquivos privados permanecem fora do Git.

## Próximo passo e limites

Root captura antes fresco na base e depois no candidato, mesma luz/estado/assets prontos, med/raw, adaptive off, FOV66°, 1320×880 (3:2): R1 posição `[0,-0.15,-30]` mirando `[0,-0.4,30]`; R3 `[13.6,1.6,-11]` mirando `[-13.6,6.4,-11]`; oblíqua superior `[18,12,-26]` mirando `[0,3.6,-11]`. A projeção dos cantos das 6 caixas cabe no frustum; isso não prova ausência de oclusão (artefato `CORREGO-GUARD-OBLIQUE-PROJECTION-R1.json`). Histórico de screenshots não substitui esse A/B. Rejeitar ruído sobre a faixa plana, dupla tintura, pregos/emendas carimbados, veio incoerente ou ganho apenas em close. Preservar leitura do piso, PBR e silhueta já aceitos; revisão crítica independente antes de adoção.

Locators: runtime `.name` vazio; símbolos `matGuarda`/`uvGuarda`. Centrais x[-5,5], y[5.6,6.5], z=-12.25/-9.75. Inclinadas com centro x±9.3, y3.355, z=-12.30/-9.70, rz∓atan2(5.6,8.6). UV esperada: centrais Uspan≈5.8465 e Vspan0.324, rampas Uspan6 e Vspan0.198; faces de topo/espessura usam a fração correspondente da textura. Avaliar se o recorte mostra uma faixa representativa, sem pregos/emendas repetidos.

Preparação do serve: node_modules é diretório real, não symlink, contendo apenas shim `three` criado pelo harness. Import verificado resolve para o `public/vendor/three.module.js` desta WT e map_corrego para esta WT. `astro` e `.bin/astro` ausentes; serve Astro não foi iniciado nem validado, nenhuma dependência instalada. Root prepara o servidor e Ego39.

Texture.clone compartilha Source e needsUpdate pode incrementar sua versão; não há alegação de custo de upload/shader/FPS idêntico. Sem browser, decode real, mobile, MP ou aceite artístico nesta lane. O próximo dono é Root para captura A/B e crítico; a missão de release principal permanece independente.


Root adotou o material/UV na QA comoe692854f1 após A/B EgoAB-R2 válido e crítico visual independente CLEANfocal; não é publicação. Estado integral e limites atuais em VISUAL-RELEASE-CONTINUATION-20261031.md. Root conferiu seis capturas e dois contratos consolidados, exit0. A tentativaAB-R1 semdecalsfoirejeitada e mantida comoinfra; referências finais citadas no ledger principal.
