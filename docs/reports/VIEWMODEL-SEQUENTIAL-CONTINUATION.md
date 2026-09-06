# Continuação sequencial de viewmodels — 06/09/2026

## Objetivo e pronto

Continuar M4 e Mosin/SVD/SKS nas worktrees dedicadas existentes. Contato,
manga/pele, recarga e enquadramento precisam passar juntos, sem deformações.
Uma única integração arma+mãos+animação+ADS+HUD, por este executor.
Blender/background e CPU locais; sem navegador, materiais compartilhados,
merge ou release. PRs isolados de scripts/relatórios; fontes e intermediários
pagos continuam privados. Gates técnicos não substituem aprovação visual.

## Entrada verificada

- `vm-m4-reload-evidence`: `codex/vm-m4-reload-evidence`, `d56b5475`, limpa.
  PR #534 aberto contra `main`; diagnóstico C2 rejeitado.
- `vm-prep-rifles`: `codex/vm-prep-rifles`, `80245c2e`, limpa, somente leitura.
- `vm-prep-precisao`: `codex/vm-prep-precisao`, `e248aaa8`, limpa.
- `vm-astra-pistol`: `codex/vm-astra-pistol`, `d35c6658`, limpa, somente leitura.

Lidos AGENTS, VM-PREP-RIFLES, VM-PREP-PRECISAO, handoffs Astra/series e PR #534.
Idle M4 aprovado continua controle. C2 (-83°/-45°) permanece rejeitada.
Faca e pistola não integram esta intervenção; suas aprovações não são alteradas.

## Marco M4: perfil transversal

`tools/viewmodels/prep/m4-cuff-profile.py` lê C1 pelo hash e mede os 73 frames.
Seleciona punho em bind space, registra pesos, superfícies deformadas e distância
local com sinal. Rays de dois lados medem oclusão manga/luva nos vértices da pele;
não provam pixels, auto-oclusão ou contenção global de uma roupa aberta.
Material-ID usa cores de objeto em memória, sem editar materiais.

Artefatos em `artifacts/viewmodels/m4-cuff-profile/` e `m4-cuff-weights/`:
profile.json, summary.json, run.log e closes opostos. O segundo é uma sonda de
transferência baricêntrica dos pesos da cobertura aos 278 vértices do punho da
camada interna. Nenhuma malha ou curva fonte foi sobrescrita/exportada.

Baseline f13: 9/8 vértices sem oclusão, f45: 15/13, f62: 15/5.
Sonda nesses quadros: 0/0; endpoints mantêm 8/0, com deslocamento máximo
0,000300 mm. Porém f25–35 expõem a pele pelo lado oposto; f35 tem 51 vértices
sem oclusão e a imagem mostra uma dobra extrema na luva/punho. **Sonda rejeitada
como solução completa.** O máximo deslocamento interno medido em f62 é 17,508 mm.
Não promover a sonda nem usar os três frames favoráveis como aceite do ciclo.

Próximo passo M4: medir a orientação relativa mão/antebraço durante o transporte
do carregador e comparar com o controle. Corrigir trajetória/pose antes de nova
intervenção de cobertura. Colisão anelar/mínimo f62 continua pendente.

## Precisão: próxima etapa

Rastrear e reproduzir em saída isolada a normalização temporal já existente em
`assemble_paid_family.mjs::mergeSamples`. GLBs observados de Mosin/SVD terminam
canais mecânicos perto da metade dos braços; SKS difere em um frame. A hipótese
do conversor FBX a 60 Hz não basta para modificar o pacote compartilhado.
Depois, avaliar contatos e vistas dos assets próprios; alinhamento dos doadores
não certifica Mosin/SVD/SKS montados. Todos continuam `ready:false`.
