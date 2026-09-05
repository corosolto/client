# Preparação offline: Mosin, SVD e SKS

## Continuidade da frente

Objetivo: entregar inspeção individual, evidências reproduzíveis e receita de produção
para Mosin, SVD e SKS, excluindo AWP. Pronto nesta frente significa diagnóstico
rastreável e revisão independente; não significa produção ou aprovação visual.

Worktree exclusivo: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao`.
Branch: `codex/vm-prep-precisao`. Base: `961c70d20a41336a53ba3b9abcc2068d3e7f9eb0`.
Integradora somente leitura: `../vm-astra-pistol`, observada em `1ffbc452`.
Lidos integralmente: prompt paralelo, AGENTS, LIÇÕES, contrato profissional e dois
ledgers vivos da integradora. Acabamento v4 da integradora não foi copiado.

Marco 1 validado: worktree criado da base exigida, branch/HEAD/status conferidos;
destinos de relatório/scripts/artefatos são locais, sem symlinks. Assets privados e
node_modules ausentes nesta frente; fonte privada explícita da integradora é local,
node_modules dela resolve na Fable (somente leitura). Espaço disponível >1 TB.

Insumos localizados: armas próprias estáticas, pacotes bolt/Kar98K, svd/SVD e
marksman/Mk14EBR; GLBs GoldSrc e retarget disponíveis como histórico, não certificados.
Famílias ready:false. Nenhuma produção, material compartilhado ou runtime alterado.

Próximo passo: executar inventário GLB e inspeção Blender isolada, registrar contato,
recargas, câmera e bloqueios por arma. Artefatos: `artifacts/viewmodels/prep/precisao/`.

Marco 2 validado: inventário em `inventario.json`, três armas próprias renderizadas,
fontes FBX e variantes históricas identificadas com hash. Malhas próprias monolíticas;
nenhum baked específico disponível. A reimportação padrão Blender 5.2 desloca o rig
da arma; suas imagens foram rejeitadas e preservadas em
`importacao-blender-default-invalida/`. Leitura independente das matrizes GLB em
`gltf-matrizes.json` e probe TEMPERANCE corrigem a interpretação; não é evidência
de defeito do Game. Inspeção corrigida em andamento, sem alteração dos insumos.

UV, índices, joints e pesos dos três meshes de mãos/manga são idênticos aos da
pistola no accessor decodificado (`precisao-resumo.py`, `resumo.json`). Isso demonstra
compatibilidade estrutural, não certifica aparência das luvas.
