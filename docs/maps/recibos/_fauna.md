<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

{
  "resumo": "Fail-closed da fauna implementado, provado em Chromium de verdade e em 3 mutantes; régua poly-check.mjs nova com 7 cláusulas (POLY0 de vacuidade + as 6 pedidas) rodando em 0,5 s no check:fast; dívida inicial de 49 itens declarada nominalmente em vez de teto afrouxado; POLY6 quitada no mesmo dia e a entrada REMOVIDA como o Main pediu. node --check verde nos 2 arquivos. Sem commit. Nada gerado/mintado (sem .env, sem chave).",
  "arquivos_meus": {
    "public/js/ambientlife.js": [
      "59-88: bloco FAIL-CLOSED + NODE_RUNTIME (mesmo padrão de game.js:44 / authoredvm.js:16) + setFaunaRuntime() (costura de régua, precedente do registerFaunaTemplate) + faunaProxyAllowed() exportada; kill-switch ?fauna=proxy",
      "250-252: this.faunaDropped = [] no construtor",
      "263-270: console.warn único com contagem + group.userData.faunaFailClosed (não saber custa o mesmo que estar errado)",
      "299-310: o ramo do proxy passou a ser `else if (faunaProxyAllowed())` e o `else` é o fail-closed — `return` antes de group.add/animals.push, então no browser sem GLB o bicho não existe"
    ],
    "tools/eval/poly-check.mjs": [
      "arquivo novo, 522 linhas: cabeçalho com o caso que comprou a régua, as 5 perguntas da skill, procedência de cada limiar, dívida declarada e as 3 mutações com a saída medida",
      "TETO de POLY4 lido de tools/gen-asset.mjs por regex de `arg('face-limit','N')` — se sumir, a cláusula fica VERMELHA (não há cópia do 12.000 aqui)",
      "PISO_FAUNA 2500 com a mediana da casa RECALCULADA a cada rodada (mediu 4.853; o piso sai impresso como 52% dela)",
      "POLY0 (guarda de vacuidade, não pedida mas exigida pela skill): censo pelo REGISTRO (CORREGO_FAUNA_ASSETS/faunaAssetUrl), id registrado sem GLB = vermelho, GLB órfão = aviso",
      "--alvo=<id> para apontar os mutantes de dado e provar a guarda de aplicação"
    ]
  },
  "patches_enviados_ao_Main": {
    "package.json": "eval:poly criado + acrescentado ao check:fast — APLICADO pelo Main (package.json:170)",
    "public/js/map_corrego.js": "faunaProxyAllowed no import (:12) e os dois guardas (:514 jacaré, :577 capivara) — APLICADO pelo Main; corrego-contract-check.mjs rodado depois: exit=0, todas as cláusulas de fauna verdes (o censo em node não perdeu nenhum bicho)"
  },
  "saida_real_dos_mutantes": {
    "base": "exit=0 — resumo: POLY0 0 · POLY1 4 · POLY2 5 · POLY3 5 · POLY4 35 · POLY5 1 aviso · POLY6 0 (49 em dívida, 0 reprovando) → '✓ POLY nenhum vermelho fora da dívida declarada'",
    "fauna-magra": "exit=1 — 'MUTAÇÃO fauna-magra: pigeon_ground 6.928 -> 800 tri (em memória)' / '1 REPROVA(S) — fora da dívida declarada: ✗ POLY1:pigeon_ground 800 tri < piso 2.500 (16% da mediana da casa) — re-mintar a FORMA; animação existente se retargeta, não se regenera'",
    "fauna-parada": "exit=1 — 'MUTAÇÃO fauna-parada: dog_caramelo 1 skin / 12 clipe(s) -> 0/0 (em memória)' / '1 REPROVA(S): ✗ POLY2:dog_caramelo 0 skin e 0 clipe — a locomoção é empurrada por ambientlife.js (QUAD_SPEED), o que move o bicho inteiro sem mover uma pata'",
    "proxy-vivo": "exit=1 — censo: node 12 / browser 10 / browser ?fauna=proxy 12; '5 REPROVA(S): ✗ POLY6:fy_corrego:rato|pomba|gato|galinha|barata — proxy procedural NASCE no browser sem GLB'. Jacaré e capivara ficam fora porque já passam pelo guarda do mapa (isolamento exato da regressão)",
    "guardas_de_aplicacao_exercidas": [
      "--mutante=fauna-magra --alvo=dog_caramelo → '✗ POLY0 MUTANTE NAO APLICOU: dog_caramelo já estava ABAIXO do piso (1.950 < 2.500)' exit=1",
      "--mutante=fauna-parada --alvo=tatu_campo → '✗ POLY0 MUTANTE NAO APLICOU: tatu_campo já estava sem rig E sem clipe' exit=1",
      "--alvo=tamandua → '✗ POLY0 MUTANTE NAO APLICOU: --alvo=tamandua não é nenhuma fauna medida (...)' exit=1",
      "troquei o texto do guarda no ambientlife.js (para `faunaProxyAllowed() === true`, variante válida e de comportamento idêntico) e rodei proxy-vivo: '✗ POLY0:medicao NÃO SEI MEDIR — MUTANTE NAO APLICOU: o guarda ... não existe mais' exit=1. Restaurei e confirmei por shasum -a 256 -c (OK) + node --check"
    ]
  },
  "prova_no_browser_de_verdade": {
    "por_que": "a régua mede POLY6 em node forçando o ambiente (setFaunaRuntime) — declarado no cabeçalho como aproximação. Fechei a fresta no mundo real.",
    "como": "servidor próprio em porta livre (node tools/eval/serve.mjs 9111, derrubado depois), Chromium, 44 requisições de models/ambient/*.glb ABORTADAS por interceptação, e a classe real createFavelaAmbience com 2 ratos + pomba + cachorro + barata",
    "resultado": {
      "typeof process": "undefined (NODE_RUNTIME nasce false sozinho, sem costura)",
      "browser padrão": "proxyPermitido=false · bichos=0 · malhas=0 · group.userData.faunaFailClosed=5",
      "browser ?fauna=proxy": "proxyPermitido=true · bichos=5 · 39 malhas de proxy · source='fallback' nos 5"
    },
    "observacao": "sem bloquear o GLB o caminho feliz continua igual: 5 bichos com as malhas do GLB, faunaFailClosed=0"
  },
  "divergencias_do_relatorio_que_a_medicao_corrigiu": [
    "POLY3: 5 props abaixo de 1.000 tri, não 6 — fav_house (1.070) está ACIMA do piso e quem o acusa é o POLY5",
    "POLY4: 35 props acima do teto, não 4 — 20 são carro de terceiro que nunca passou pelo gen-asset; 3 (destroyed_cars, wreck_car, lajes_bloco_tijolo) estão SERVIDOS E SEM USO (0 referência em public/js), para esses o primeiro conserto é sair do deploy",
    "POLY5: 1,79 KB/tri no fav_house (1.912 KiB), não 1,88 — o relatório usou KB decimal, a régua mede KiB e diz contra qual unidade mediu. 2º pior do acervo: fav_brasileira 0,78, então o teto 1,0 cai no vão da distribuição",
    "mediana da casa combinada (personagem+arma) = 4.853 tri",
    "dog_caramelo e vaca_campo têm ZERO imagem (cor chapada por baseColorFactor) — 486 e 846 KB de arquivo são só geometria/rig. O re-mint tem que trazer textura, não só triângulo"
  ],
  "fila_final_de_mint": {
    "nota": "NADA foi gerado: tools/gen-asset.mjs lê a chave de .env (loadEnv():34) e não existe .env nesta máquina. A decisão de gastar é do dono.",
    "a_re_mintar_forma": [
      {
        "id": "dog_caramelo",
        "hoje": "1.950 tri / 3.966 verts / 1 skin / 12 clipes / 0 textura",
        "alvo": "≥5.000 tri + textura de pelo (hoje é cor chapada)",
        "nao_pode_perder": "os 12 clipes do rig AnimalArmature (Attack, Death, Eating, Gallop, Gallop_Jump, Idle, Idle_2, Idle_2_HeadLow, Idle_HitReact_Left/Right, Jump_ToIdle, Walk) têm que ser RETARGETADOS, não regerados; e os nomes precisam manter o sufixo, porque ambientlife.js:278 casa por /(^|\\|)Idle$/, /Walk$/ e /(Run|Gallop)$/ — nome novo cai no clips[0] e o cachorro anda parado",
        "prioridade": 1
      },
      {
        "id": "vaca_campo",
        "hoje": "2.450 tri / 4.970 verts / 1 skin / 3 clipes (Gallop, Walk, Idle) / 0 textura",
        "alvo": "≥5.000 tri + textura",
        "nao_pode_perder": "os 3 clipes e a escala de 1,75 m de comprimento (normalizeModel usa target cow=1,75 pela ALTURA — se o novo GLB vier deitado num bbox diferente, a vaca muda de tamanho)",
        "prioridade": 2
      },
      {
        "id": "cat_telhado",
        "hoje": "2.448 tri / 2.276 verts / 1 skin / 3 clipes (Idle, Run, Walk) / 1 imagem (Atlas 1,3 KB)",
        "alvo": "≥4.500 tri",
        "nao_pode_perder": "os 3 clipes e o atlas de UV único (é o que deixa o gato barato em textura)",
        "prioridade": 3
      },
      {
        "id": "barata_urbana",
        "hoje": "2.124 tri / 3.540 verts / 0 skin / 0 clipe",
        "alvo": "≥4.500 tri COM rig e clipe de corrida",
        "nao_pode_perder": "o bbox no eixo Z (normalizeModel:187 documenta 'a barata já vem no Z'; virar o eixo quebra o yaw) e o alvo de 0,14 m",
        "prioridade": 4
      },
      {
        "id": "galinha_campo",
        "hoje": "2.904 tri mas só 1.651 verts / 1 skin / 2 clipes",
        "alvo": "≥4.000 tri (é a menor contagem de vértice do acervo; passa no POLY1 por pouco)",
        "nao_pode_perder": "os 2 clipes CharacterArmature|Idle e |Walk",
        "prioridade": "se sobrar rodada"
      }
    ],
    "b_so_animar": [
      {
        "id": "jacare_corrego",
        "hoje": "4.856 tri / 6.095 verts / 0 skin / 0 clipe",
        "alvo": "rig + 3 clipes (respiração, cauda, boca)",
        "nao_pode_perder": "a forma (passa folgado no POLY1) e o yawFix de π/2 do placeFauna — o focinho aponta −X no GLB; rig novo com eixo diferente move o bicho dentro do canal",
        "prioridade": 1
      },
      {
        "id": "capivara_corrego",
        "hoje": "5.005 tri / 5.660 verts / 0 skin / 0 clipe",
        "alvo": "rig + clipes de pastar/orelha/passo",
        "nao_pode_perder": "focinho +Z nativo (yawFix 0), comprimento-alvo 1,0 m e a posição de pés-no-chão que o corrego-contract-check mede",
        "prioridade": 2
      },
      {
        "id": "tatu_campo",
        "hoje": "3.136 tri / 5.084 verts / 0 skin / 0 clipe",
        "alvo": "rig + locomoção (hoje é QUAD_SPEED empurrando o objeto inteiro)",
        "nao_pode_perder": "a rotação corretiva de −π/2 (o Mint entrega o eixo longo no X; ambientlife.js:188)",
        "prioridade": 3
      },
      {
        "id": "papagaio_poleiro",
        "hoje": "2.961 tri / 4.573 verts / 0 skin / 0 clipe",
        "alvo": "rig + pouso/cabeça/asa",
        "nao_pode_perder": "o userData.faunaPart='head' que o proxy usava e o alvo de 0,34 m",
        "prioridade": 4
      },
      {
        "id": "rat_animated",
        "hoje": "3.642 tri / 1 clipe (Run) — está nos 17 mapas",
        "alvo": "2º clipe (parado/comendo)",
        "nao_pode_perder": "o clipe 'Run' com esse nome exato (ambientlife.js:285 procura 'Run' para rato)",
        "prioridade": 5
      }
    ],
    "c_decimar_sem_api_paga": [
      {
        "id": "grama_corrego_01/02",
        "hoje": "4.142 / 4.046 tri por tufo × 1.833 tufos",
        "alvo": "≤600",
        "ganho": "−6,5 M tri no fy_corrego (8,3 M → ≈1,8 M)",
        "nao_pode_perder": "a silhueta de borda (é o que lê como capim; decimar sem preservar a borda vira palheta)"
      },
      {
        "id": "wall_of_cars",
        "hoje": "242.342 tri (20,2× o teto)",
        "alvo": "≤12.000",
        "nao_pode_perder": "o perfil do muro (é occluder do ferro velho — se a malha visível encolher além da caixa de procuração, o MAP4 do map-check acusa bala no ar)"
      },
      {
        "id": "crushed_classic",
        "hoje": "132.890 tri",
        "alvo": "≤12.000",
        "nao_pode_perder": "idem, sucata é occluder"
      },
      {
        "id": "vw_9150",
        "hoje": "89.198 tri, em 7 mapas",
        "alvo": "≤12.000",
        "nao_pode_perder": "altura da carroceria (é cobertura de rota em 7 mapas)"
      },
      {
        "id": "os 20 carros de terceiro (2015_nissan_versa … 1989_ford_fiesta_xr2i_mk3)",
        "hoje": "12.957 a 76.123 tri",
        "alvo": "≤12.000 cada",
        "nao_pode_perder": "nada além do contorno; nenhum foi gerado pelo gen-asset, então nunca passaram pelo --face-limit"
      },
      {
        "id": "caixa_dagua / botijao_gas",
        "hoje": "18.749 / 17.132 tri",
        "alvo": "≤6.000",
        "nao_pode_perder": "o raio do cilindro (props pequenos e MUITO repetidos; um botijão custa 16 casas de favela hoje)"
      },
      {
        "id": "construction_rubble / fav_modular / tiara_gt83 / car_a / broken_car_2",
        "hoje": "52.967 / 16.661 / 15.199 / 27.142 / 24.983",
        "alvo": "≤12.000",
        "nao_pode_perder": "fav_modular é casario servido em 4 mapas — decimar sem achatar a fachada"
      },
      {
        "id": "destroyed_cars / wreck_car / lajes_bloco_tijolo",
        "hoje": "31.841 / 22.601 / 12.562 tri",
        "alvo": "tirar do deploy",
        "nao_pode_perder": "nada: 0 referência em public/js — são 67 k tri servidos que nenhum mapa desenha"
      }
    ],
    "nao_e_mint_e_e_o_maior_ganho": "os 6 props do POLY3 (jersey_barrier 369, lajes_casa_06 750, fav_brasileira 780, lajes_casa_05 891, shopping_cart 952, + fav_house 1.070 no POLY5) são casario e objeto de mão: é o que o jogador tem na cara em fy_lajes/quebrada/escadão e é onde o budget liberado pela decimação deve ir."
  },
  "para_o_corpo_do_PR": "não toquei em tools/eval/KNOWN-RED.json — o eval:ratchet reprovaria um PR com 49 entradas novas e isso reprovaria o PR de quem não tem nada com isso. A dívida está dentro do poly-check.mjs, no mesmo padrão (id nominal + número medido + data) e pelo mesmo motivo declarado no mapa-novo-gate.mjs:167. Se o dono quiser promovê-la, cada ID precisa de `ratchet: +ID porque <motivo>`.",
  "nao_medido": "triângulo não é beleza: nenhuma figura da fauna foi olhada nesta rodada. A régua diz que o bicho tem massa e rig, não que ele está bonito — isso exige captura olhada (portão 4 da skill csbrasil) e fica para a rodada que tiver chave."
}
