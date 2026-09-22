<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

> **Nota do Main:** o recibo detalhado deste mapa foi entregue pelo builder em duas partes (recibo + adendo).
> O que está abaixo é o adendo final dele; os números de antes→depois deste mapa foram **reconferidos por mim**
> com o instrumento oficial (`node tools/eval/map-check.mjs all` e `node tools/eval/mapa-novo-gate.mjs`,
> 13/09) e estão na tabela de [`../RODADA-CONSERTO.md`](../RODADA-CONSERTO.md), que é a fonte para obras_prefeitura.

{
  "regressao": "MC3 (map-contrato-check) — obras_prefeitura com 247 nós ilhados",
  "estado": "CONSERTADO e verificado",
  "diagnostico": {
    "o_que_era": "NÃO era região selada. Era UM nó órfão: componentes #0:1 e #1:247, com o nó 0 = (−26, −33) (canto sudoeste) de grau 0. Como o map-contrato-check faz BFS a partir do NÓ 0 (critério da validatePlan, map-contrato-check.mjs:9), o componente de 247 nós conta como ilhado.",
    "por_que_minha_sonda_nao_pegou": "eu fazia BFS a partir do SPAWN, que cai no componente grande — 252/1 parecia saudável. Erro de instrumento meu, não do critério da régua.",
    "causa_exata": "a kombi da §4.5 em (−25,3; ∓30): colisor AABB x −26,68…−23,92 com ry 10°, inflado 0,5 m pelo `blocked()` de map_obras.js:194, apagava o nó (−26; ∓29,8); o barracão colado no tapume do fundo apagava (−22,8; ∓33). Sobrava o canto (−26; ∓33) com as duas únicas arestas possíveis cortadas."
  },
  "conserto": {
    "onde": "public/js/map_obras.js:449-452",
    "o_que": "kombi saiu do fundo do corredor e foi para (−24,4; ∓17), ry 4°, meia-largura 0,85 m — colisor x −25,25…−23,55, inflado −25,75…−23,05, ou seja ENTRE as colunas de waypoint −26 e −22,8, sem encostar em nenhuma.",
    "nao_fiz": "não toquei em ILHADOS_MAX nem em teto nenhum do map-contrato-check.mjs; passagem real."
  },
  "eval_mapcontrato": {
    "comando": "npm run eval:mapcontrato",
    "MC1": "PASSA",
    "MC2": "PASSA",
    "MC3": "PASSA (5 com teto de ilhados)",
    "linha_do_mapa": "ok obras_prefeitura  250 nós · 1127 arestas · rota ok · conexo"
  },
  "nos_arestas_antes_depois": {
    "antes": "314 nós · 1923 arestas · 1 componente · 0 ilhados (medido com o map_obras.js do HEAD numa cópia em /tmp, já apagada)",
    "depois": "250 nós · 1127 arestas · 1 componente · 0 ilhados",
    "leitura_honesta": "os 64 nós a menos são o preço declarado do tapume do canteiro e do escoramento: área andável 3.401 → 2.958 m² (−13%), densidade de nó 0,092 → 0,085 por m². 250 nós fica acima de posto_treta (209) e piscina_treta (103); MAP5 pior razão de waypoint 0,70× contra piso de 0,35×."
  },
  "re_medicao_completa_apos_o_conserto": {
    "MAP1_corpo_dentro_de_solido": 0,
    "MAP2_exposicao_E_pct": 2.3,
    "MAP2_exposicao_B_pct": 3.2,
    "MAP2B_pior_folga_m": 1.95,
    "MAP2B_pior_area_m2": 53.6,
    "MAP4_occluder_sem_malha": 0,
    "MAP5_pior_espacamento_m": 6.13,
    "MAP5_pior_razao_prop": 0.69,
    "MAP5_pior_razao_wp": 0.7,
    "MAP6_bordas_sem_guarda": 0,
    "MAP7_occluder_sem_geometria": 0,
    "CTF1_altura_triangulo_m": 26.83,
    "CTF2_minimo_rotas": 2,
    "MC3_ilhados": 0,
    "occluders": 229,
    "ORT1": "40,3% girada / 41 ângulos",
    "SUP1_pct": 17.1,
    "SUP2_pct": 1.2,
    "skyUrl": "/img/textures/sky_sp.webp",
    "malhas_root": 340,
    "triangulos": 15478
  },
  "sonda_corrigida": "acrescentei o bloco MC3 à sonda (/tmp/obras_sonda.mjs): BFS do nó 0, número de componentes e os membros de todo componente com menos de 30 nós. CTF2 e MAP5 são cegos a nó órfão — era esse o buraco.",
  "verificacao_visual": "captura no browser do canto oeste (barracão, caixa d'água no cavalete, caçamba, tapume): virou corredor de passagem, não beco fechado. Servidor e aba fechados.",
  "escopo": "só public/js/map_obras.js (368+/38−), node --check verde, sem commit"
}

[You have received this identical output 3 times. Re-reading 'agent://FixObras' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]
