# Pintura golden — continuação R970

Objetivo autorizado: restaurar pintura equipada válida em gold#pistol e gold#ak por seleção independente do wrap Mint. Preservar todos os assets, transforms, frame/FOV, rig/ADS, clips/tempos (AK 1 s), mãos, fallback Mint/fábrica/faca e rotas sem skin. Root publica; nenhum browser/render/globalgate nesta lease, Root R967 detém Chrome.

Base d46cf5150ca6a48a6862f7753eea4477a3c77fcb; branch codex/golden-skin-selection-r970-20261101 e worktree própria homônima. R944 já foi aceito por Root com crítico R959; W821/W770/W842 e a composição R958 não são editados. Missão integral visual/release continua, Flávio #1158 excluído, UI nova/social depois.

R960 provou no-op de pintura no _loadFamily real e controller Game: pistol/AK têm weaponMeshes, mas nenhum MINT_WEAPON_*; pecasDaPintura devolve [] por exigir mint.active. Report/manifesto externos PISTOL-SKIN-R960 preservam prova/limites e o controle positivo independente de faca. Não é QA de aparência.

Marco antes do patch em 01/11/2026: checker permanente golden-skin-selection-check.mjs executou carga assíncrona real sobre GLBs públicos exatos, controller e _switchWeapon do Game, com único desvio semântico da cópia de authoredvm permitindo a guarda NODE_RUNTIME de load. Texturas neutras, sem raster. Baseline exit 1, 4,0392 s, stderr 0: seis RED causais pistol/AK body, peças irmãs e body primeiro; demais cláusulas verdes. Log A/GOLDEN-SKIN-R970-BASELINE.*. O attempt anterior tinha um callback inicial do harness ainda pendente e warning de rota fora da fixture; preservado como INFRA em BASELINE-ATTEMPT1, corrigido somente drenando a microtask antes de instalar o método e aguardando todas as operações observadas. Não foi usado como baseline limpa.

Próximo: patch mínimo com nomes explícitos únicos de body do censo R960, sem primeira mesh/maior malha ou criação de mint; nominal e mutantes body-noop/mag-unpainted/hand-painted/ak-base-changed, hashes estruturais e focais existentes; checkpoint DCO/Agent e crítica independente sob Root. Pintura/decalque/aparência Game 3:2, contato/anatomia, mobile físico e MP humano ficam UNKNOWN. HAND_DEBT f468adc9279d permanece.


## Marco — candidato e regressões validados

O seletor ganhou apenas o mapa de body por nome exato para gold#pistol/gold#ak sem wrap Mint e exige correspondência única. Ele usa weaponMeshes previamente classificadas, mantém o body primeiro e reaproveita literalmente o filtro/dedup de irmãs. _applyWeaponSkin, sua guarda sem skinId, chamada marcas:i===0, montagem, draw e restante do runtime não mudaram. Família desconhecida continua sem novo fallback; nome ausente/duplicado falha fechado.

A régua final tem 19 cláusulas. A ordem invertida e o body duplicado usam as próprias meshes reais carregadas; um quinto mutante first-mesh prova esse contrato. Os quatro mutantes requisitados continuam causais: body-noop, mag-unpainted, hand-painted e ak-base-changed. A baseline final com bytes Git da base (restaurados temporariamente só nesta WT, em finally voltando ao SHA candidato exato) ficou 7 RED/19, stderr 0. A baseline cronológica inicial 6 RED/17 continua separada. Evidência A/GOLDEN-SKIN-R970-PINNED-BASELINE.json, com hashes de fonte/teste/restauração.

Alias final eval:golden-skin-selection PASS 24,321 s, nominal 19/19 e cinco mutantes com conjuntos de RED exatos; seis protocolos, stderr 0. Hash estrutural antes/depois inclui hierarquia/TRS/matrizes, buffers de geometria/morphs/índices, bones/IBMs/bind, clips/ação, mount/frame, profile completo e câmera real do jogador (FOV/aspect/near/far/projeção/matriz). Eventos: Idle após load, início Equip e início Reload. Não equivale à cobertura temporal completa do movimento.

AK sem skin foi carregada em outro Game real com profile sem IDs, depois da instância pintada, usando o mesmo cache de GLTF: materiais/marcadores e hash estrutural ficaram idênticos antes/depois; nenhum mint criado. A AK segue Equip de 1 s/taxa 1. Pistol/AK equipadas recebem body e todas as irmãs reais; mãos ficam com os mesmos materiais/marcadores por chamada. Repetição da mesma skin é idempotente.

Focais existentes: alias composto eval:authored-transition PASS 38,9868 s (inclui R944 e novo seletor), cobertura de skin SC1–SC6 PASS e seus mutantes antigos com RED exatos; eval:skin-profile-flow nominal/mutantes PASS 4,6313 s, stderr contém apenas as rejeições rápidas intencionais de F4. Depois de enriquecer o hash com profile/câmera real, baseline e alias novo completos foram executados novamente no SHA final do checker. Sintaxe e git diff --check PASS. Nenhum gate global ou teste/render pesado executado.

Shader SB1–6 PASS; SB7 NÃO MEDIDO, exit 78 por astro ausente nesta WT. Manifesto shipping direto inclui authoredvm e muda revisão por conteúdo 93273827daf3→f6cfe2dd302f; isso não substitui HTTP/Astro. Não houve instalação de dependências. O harness existente criou somente sua ponte local three em node_modules ignorado nesta WT, sem editar vendors ou outro checkout.

Foram relidos os cinco paths do diff inteiro e fronteiras de carga/skin/seleção/controller/Game/cache, regras AGENTS/ARCH/CONTRIBUTING, skills bug-hunt/régua/pr-hardening e LICOES já aplicadas nesta sessão. Self-review autoral não é crítico independente. O SHA deste checkpoint DCO/Agent e os pins estão no manifesto externo A/GOLDEN-SKIN-R970-MANIFEST.json, evitando referência circular neste ledger.

Aceito: aplicação material CPU de IDs válidos em duas golden, invariantes estruturais/AK sem skin e regressões causais. Rejeitado: primeira mesh/maior malha, criar entry.mint, mover/reescalar arma, editar GLB/mãos/ADS/timing, generalizar a famílias não autorizadas ou apagar HAND_DEBT. Aparência/decalque no Game 3:2, contato/anatomia, mobile/MP, HTTP cache e release continuam UNKNOWN/pendentes. Não foi necessária consulta GLM.

Próximo: Root recebe HEAD congelado e clean, lê report/pins, obtém crítico independente whole e só então decide a adoção na Java final. Root é único publicador; nenhum push/PR/comentário/merge foi feito por esta lease. A missão integral e os owners permanecem preservados.
