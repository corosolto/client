<!-- Recibo da integração da fauna Mint v2, 14/09/2026. Índice: ../MINT-ACERVO.md -->

# Fauna Mint v2 — recibo da integração

```json
{
  "resumo": "7 dos 8 GLB entraram em 10 mapas (+7 bichos, +7 draws, −39.583 triângulos no jogo). O 8º (calango) foi RECUSADO com figura. O pato estava servido com a água do lago assada dentro da malha e foi consertado no pipeline. E a medição de orientação achou um defeito velho: rato e tatu andavam DE COSTAS desde que entraram.",
  "o_que_entrou": {
    "controlador_public_js_ambientlife_js": [
      "ASSETS :22-37 — 7 ids novos (hen, chick, guinea, duck, horse, goat, carcara); o calango NÃO foi registrado e o comentário diz por quê",
      "TYPE_ASSET :40-44, FAUNA_TYPES :46, TYPE_OPTION :48-52, FAUNA_NAME :53-58 (nomes do censo: galinha choca, pintinho, galinha d’angola, pato, cavalo, cabra, carcará)",
      "QUADS :61 (+6 andarilhos) · PERCHED :64 + PERCH_SWAY :65 (novo: parrot e carcara) · ALERT_TIME :69-72 · QUAD_SPEED :73-83",
      "YAW_FIX :263-268 — tabela nova que substitui o `if` de uma linha; vale para 6 tipos + a CORREÇÃO de rato e tatu",
      "normalizeModel alvo em metros :282-283 — hen .45, chick .14, guinea .50, duck .40, horse 1.55, goat .75, carcara .55 (todos por ALTURA)",
      "constructor :302-322 — laço sobre FAUNA_TYPES/TYPE_OPTION no lugar de 27 linhas de destructuring+slice+forEach (era 3 lugares por espécie; com 16 tipos saía do controle)",
      "update :460 — despacho para `_updatePerched`",
      "_updatePerched :541-563 — era `_updateParrot`; renomeado e parametrizado pelo PERCH_SWAY. Papagaio idêntico ao de antes (.055 e .055×.64=.0352 contra .035)",
      "report :600-608 — censo por FAUNA_TYPES, toda chave presente mesmo zerada (a AM6 lê counts.rat/counts.pigeon direto)"
    ],
    "mapas": [
      "public/js/map_escadao.js:790-799 — −2 pombas, +galinha +pintinho",
      "public/js/map_lajes_authored.js:1360-1384 — −3 pombas, +carcará (ponta de laje) +galinha +pintinho",
      "public/js/map_campomorro.js:829-833 e :845-855 — −2 pombas, +galinha +pintinho +capote +cavalo +cabra",
      "public/js/map_corrego.js:1356-1369 — −1 pomba, +galinha +pintinho",
      "public/js/map_quebrada.js:1638-1651 — −1 pomba, +galinha +pintinho",
      "public/js/map_parque.js:575-598 — −1 pomba, +2 patos nos dois espelhos d'água",
      "public/js/map_mansao.js:1181-1197 — −1 pomba, +pato na PISCINA",
      "public/js/map_velho_oeste.js:527-540 — −1 pomba, +carcará no beiral +cavalo +cabra no curral",
      "public/js/map_posto.js:630-638 — −1 pomba, +cabra no gramado da rodovia",
      "public/js/map_brasilia.js:2174-2184 — −2 pombas, +carcará no teto do ônibus da caravana"
    ],
    "ferramentas": [
      "tools/optimize-ambient-fauna.mjs:101-168 — passo `dropFlatSlab` novo (remove componente conexo ≥95% horizontal e fino em Y, recompacta os vértices órfãos); :59-63 liga no job do pato. Rodado: 4.664 → 4.462 crus → 2.676 servidos / 130 KB",
      "tools/eval/poly-check.mjs:190-213 — 8 dívidas POLY2 declaradas, com a causa MEDIDA (catálogo Meshy 100% humanoide) e a quitação certa (rig CC0 de fora do Mint), não o inexequível 're-mintar e animar'"
    ]
  },
  "distribuicao_final_por_mapa": {
    "fy_lajes": "6 ratos · 4 pombas · cachorro · gato · CARCARÁ (11,4/5,2/11, ponta de laje) · GALINHA + PINTINHO (beco, 4/0/10,4)",
    "fy_escadao": "2 ratos · 1 pomba · GALINHA + PINTINHO (quintal do patamar, −1,2/−33,2)",
    "fy_campomorro": "2 ratos · 1 pomba · cachorro · 2 galinhas animadas · vaca · 2 tatus · GALINHA + PINTINHO (−11/16) · CAPOTE (−2,6/15,6) · CAVALO pastando na encosta (−28/11) · CABRA (−16/9)",
    "fy_corrego": "4 ratos · 1 pomba · gato · galinha animada · 2 baratas · GALINHA + PINTINHO (9/14,5)",
    "quebrada": "3 ratos · 2 pombas · 2 cachorros · gato · GALINHA + PINTINHO (−9/−15)",
    "parque_treta": "2 ratos · 3 pombas · cachorro · 2 papagaios · 2 PATOS nadando (20/33 e −20,5/−32,5)",
    "fy_mansao": "1 rato · 2 pombas · 2 papagaios · PATO na piscina (2/−28)",
    "velho_oeste": "2 ratos · 2 pombas · CARCARÁ no beiral da varanda (11,17/3,27/22,5) · CAVALO (21,5/22,5) · CABRA (24/21,5) no curral do estábulo",
    "posto_treta": "2 ratos · 2 pombas · 2 cachorros · CABRA no gramado da borda (25/5)",
    "praca_poderes": "2 ratos · 4 pombas · 2 tatus · CARCARÁ no teto do ônibus da caravana (−13,5/3,3/8)",
    "sem_mudanca": "piscina_treta, loja_h, ferro_velho, upa_24h, obras_prefeitura, atacadao_treta, penitenciaria"
  },
  "censo_medido": {
    "metodo": "sonda própria em /tmp/faunaprobe/censo.mjs sobre tools/eval/harness.mjs — mesma conta do ambience-check.mjs:420 (tri/draws do GLB servido × população declarada). VALIDADA contra os números de browser registrados: lajes 74.746/20, córrego 38.024/14, escadão 28.068/5, praça 55.124/10 batem exatos no estado ANTES.",
    "tabela": [
      [
        "mapa",
        "animais",
        "draws",
        "triângulos",
        "saldo"
      ],
      [
        "praca_poderes",
        "10 → 9",
        "10 → 9",
        "55.124 → 44.268",
        "−10.856"
      ],
      [
        "fy_lajes",
        "15 → 15",
        "20 → 20",
        "74.746 → 62.854",
        "−11.892"
      ],
      [
        "fy_escadao",
        "5 → 5",
        "5 → 5",
        "28.068 → 20.104",
        "−7.964"
      ],
      [
        "fy_corrego",
        "10 → 11",
        "14 → 15",
        "38.024 → 36.988",
        "−1.036"
      ],
      [
        "fy_campomorro",
        "11 → 14",
        "30 → 33",
        "44.548 → 45.587",
        "+1.039"
      ],
      [
        "quebrada",
        "9 → 10",
        "19 → 20",
        "38.058 → 37.022",
        "−1.036"
      ],
      [
        "parque_treta",
        "9 → 10",
        "14 → 15",
        "42.868 → 41.292",
        "−1.576"
      ],
      [
        "fy_mansao",
        "6 → 6",
        "6 → 6",
        "30.348 → 26.096",
        "−4.252"
      ],
      [
        "posto_treta",
        "7 → 7",
        "17 → 17",
        "31.968 → 27.914",
        "−4.054"
      ],
      [
        "velho_oeste",
        "5 → 7",
        "5 → 7",
        "28.068 → 30.112",
        "+2.044"
      ],
      [
        "TOTAL (17 mapas)",
        "+7",
        "+7",
        "—",
        "−39.583"
      ]
    ],
    "teto_am7": "fy_lajes 62.854/78.000 tri e 20/21 draws · fy_escadao 20.104/29.000 e 5/6 · fy_corrego 36.988/39.000 e 15/15. O córrego fica EXATAMENTE no teto de draws — por isso o capote não entrou lá (ver recusas). A folga volta quando a pomba for decimada, que é frente de outro.",
    "peso_de_download": "o preload de fauna é a lista inteira de ASSETS para todo mapa (main.js:300 cai no fallback 'tudo' quando o mapa não declara `ambience`). 3.358 KB → 4.492 KB por mapa (+1.134 KB, +34%). Conserto certo é declarar `ambience:` por mapa em maps.js nos 17 — fora do alvo deste ticket e em arquivo que outra frente está mexendo. Fica declarado, não escondido."
  },
  "defeito_velho_encontrado_e_consertado": {
    "o_que": "rato e tatu andavam DE COSTAS. `ambientlife.js` aplicava `rotation.y = -π/2` nos dois supondo focinho em +X; os dois apontam −X, e −π/2 leva a frente para −Z.",
    "prova": [
      "convenção confirmada em dois bichos já revisados com figura in-game: cachorro e gato apontam +Z nativos e não têm correção nenhuma (/tmp/faunaprobe/dogcat.png)",
      "tatu (estático, matriz identidade): focinho −X em duas vistas ortogonais independentes (/tmp/faunaprobe/tatu_2v.png)",
      "rato (skinned): posado pelo PRÓPRIO three com applyBoneTransform e o clipe Run em t=0 — focinho −X (/tmp/faunaprobe/rat_posed.png)",
      "o rasterizador foi calibrado contra medição alheia: jacaré focinho −X (bate com docs/maps/recibos/_fauna.md:97) e capivara +Z (bate com INTEGRACAO.md:12 e com STATIC_FAUNA_META yawFix 0). E contra a régua: corrego-contract-check.mjs:78 diz textualmente '−X no GLB → +Z após o fix' com yawFix +π/2",
      "depois do conserto: rato 0,08 × 0,12 × 0,36 m com o focinho no rumo de marcha (/tmp/faunaprobe/rat_fix_top.png); tatu idem (/tmp/faunaprobe/fim.png, tile 2)"
    ],
    "alcance": "rato está em 17 mapas, tatu em 2. INTEGRACAO.md:9 afirma que o jacaré aponta +Z — está ERRADO (aponta −X); não mexi no placeFauna porque lá o `ry` é escolhido pelo autor do mapa e o yawFix já é +π/2, que é o correto."
  },
  "recusas_com_motivo_medido": {
    "calango": "NÃO ENTROU em mapa nenhum. O arquivo servido é o `Calango do sertão` (md5 7aec6c74… idêntico ao rejeitado em docs/maps/mint/fauna.md §2) e saiu em POSE BÍPEDE ERETA: tronco vertical, braços à frente, mais um polígono escuro tipo capa soldado no corpo (não é componente separado — não dá pra remover). Calango de muro é quadrúpede rente à superfície. Figura: /tmp/faunaprobe/calango_3v.png. Sem rig não há conserto e rig de não-humanoide é exatamente o que o Mint não faz. Ficam sem fauna nova: obras_prefeitura e penitenciaria (só ganhariam calango), e velho_oeste/posto ganharam o resto da lista. O arquivo continua no disco de propósito: é a dívida POLY2:calango declarada + o AVISO do POLY0, e é o pedido de re-mint EM POSE QUADRÚPEDE.",
    "pato_no_piscina_treta": "não entrou. É lâmina de piscina de competição com raia e bloco de partida (bioma 'indoor'); pato ali lê como piada, não como ambiência. Os dois lugares de água parada de verdade (espelhos do parque, piscina da mansão) receberam.",
    "capote_no_corrego": "não entrou. Com galinha+pintinho o córrego fecha em 15 de 15 draws do teto AM7. Entra quando a pomba for decimada."
  },
  "asset_consertado": {
    "pato_lago": "o GLB servido era o `Pato do lago` que a própria docs/maps/mint/fauna.md §2 REPROVOU (md5 f04c4595… = /tmp/mintfauna/pato_do_lago.glb) — 39,8% da área da malha era uma laje horizontal: a água do lago assada dentro do modelo, um disco branco de plástico em volta da ave. Medi 3 componentes conexos 100% horizontais (94+68+40 tri crus). Conserto no pipeline (`dropFlatSlab`), não no mapa: 2.798 → 2.676 tri, 135 → 130 KB, ainda acima do piso POLY1. Figura antes/depois: /tmp/faunaprobe/pato_lago_3v.png e /tmp/faunaprobe/pato_fix.png.",
    "contradicao_registrada": "a fauna.md de hoje recomenda NÃO usar Adult Hen, Baby Chick e Pato do lago. O dono mandou usar (citou 'hen, pato de lago, baby chick' por nome). Resolvi assim: hen/chick entram (a objeção era 'galinha nunca para' — mitiguei com QUAD_SPEED curto e 3 s de idle entre pernadas, e elas são espécie NOVA ao lado da galinha animada, não substituem ninguém); o pato entra com a laje d'água removida, que era a objeção real dele. A §2 daquele documento fica desatualizada em 3 linhas — não a editei porque é de outra frente do mesmo dia."
  },
  "escala_e_orientacao_medidas": {
    "metodo": "bbox do GLB servido + composição FIM-A-FIM pelo próprio controlador (createFavelaAmbience → normalizeModel → _updateQuad andando para +Z), medida e renderizada em /tmp/faunaprobe/fim.mjs. Figura: /tmp/faunaprobe/fim.png (vista de cima, marcha para o topo da tela — todos os 7 novos + o tatu com a cara no rumo).",
    "resultado_em_metros_de_mundo": [
      [
        "galinha",
        "0,23 × 0,45 × 0,38",
        "bico +X → yaw −π/2"
      ],
      [
        "pintinho",
        "0,09 × 0,14 × 0,14",
        "bico +Z → yaw 0"
      ],
      [
        "capote",
        "0,23 × 0,50 × 0,29",
        "bico +X → yaw −π/2"
      ],
      [
        "pato",
        "0,24 × 0,40 × 0,62 (marreco real 0,50–0,65 de comprimento)",
        "bico −X → yaw +π/2"
      ],
      [
        "cavalo",
        "0,70 × 1,55 × 2,50 (cernelha 1,55, corpo 2,50)",
        "focinho +Z → yaw 0"
      ],
      [
        "cabra",
        "0,36 × 0,75 × 0,89",
        "focinho +Z → yaw 0"
      ],
      [
        "carcará",
        "0,37 × 0,56 × 0,65 (caracará real 0,50–0,65)",
        "bico +X → yaw −π/2"
      ]
    ],
    "submersao_do_pato": "a linha d'água do GLB está 0,0975 acima do fundo do modelo (média ponderada por área das 3 lajes removidas) e a escala do alvo 0,40 m é 0,772 → casco afunda 0,0753 m. Por isso o y do pato é a lâmina MENOS isso: −0,03 no parque (lâmina 0,045) e +0,005 na mansão (lâmina 0,08). Com y=lâmina o bicho boiaria 7,5 cm no ar."
  },
  "comportamento_novo": {
    "PERCHED": "tipo de comportamento, não de asset: `PERCHED = {parrot, carcara}` não anda — balança devagar, vira a cabeça em degraus de 4 s e, com tiro perto, treme no lugar sem sair do poleiro. É o `_updateParrot` de antes generalizado (papagaio sai idêntico ao que era; carcará balança 0,03 rad contra 0,055 do papagaio, que rapina pousada não gingа como papagaio de gaiola). Carcará deslizando pelo chão era o defeito que isso evita.",
    "cavalo_sem_to": "o cavalo nasce sem `to` — `_updateQuad` com span 0 nunca sai do idle. A pose do GLB é de cabeça baixa pastando; cavalo pastando que desliza é patinação. Conferido que span 0 não gera NaN (o último ramo do ciclo é inalcançável).",
    "fuga_curta": "como os 6 novos são estáticos, o teto de deslocamento no susto (`flee × 1,4`) foi calibrado curto: galinha 1,7 m, pinto 1,4 m, cavalo 0,7 m, pato 0,84 m. O pato é o único em que deslizar é fisicamente CERTO."
  },
  "reguas_rodadas": {
    "npm run eval:ambience-registry": "VERDE nos 17 mapas — AR1..AR6 PASSA. Rodado depois de cada mapa; pegou de verdade um defeito meu: o pato no espelho d'água da mansão nascia DENTRO do colisor sólido do espelho (x −11..−5, z 23..27, y −0,5..0,7, medido) — mudei para a piscina, que é cuba de verdade e está livre.",
    "mutantes da ambience-registry": "os 6 continuam mordendo — sem-ambience (AR1), fauna-em-solido (AR3), sem-gato (AR4), sem-fauna2 (AR4), pomba-voa-de-novo (AR5), sem-som (AR6).",
    "npm run eval:poly": "VERDE — '0 reprovando, 57 em dívida'. Estava VERMELHO antes de eu começar (8 reprovas POLY2, os 8 GLB novos que a rodada anterior deixou no disco sem declarar). Os 8 passam POLY1 folgado (2.676–3.098 contra piso 2.500).",
    "mutantes do poly": "fauna-magra e fauna-parada continuam reprovando (exit=1).",
    "eval:corrego-contract, eval:campo-contract, eval:parquewheel": "verdes.",
    "node --check": "verde nos 13 arquivos tocados.",
    "smoke de 60 s nos 17 mapas": "/tmp/faunaprobe/sim.mjs — 3.600 quadros por mapa com tiro ao lado de cada bicho: 0 NaN, maior salto por quadro 0,1077 m (limite da AM5b é 0,20 m), nenhum bicho a mais de 6 m de onde nasceu.",
    "nao_rodadas": "eval:ambience (AM7) e eval:occluders são de BROWSER e a regra da rodada é um agente por vez — o eval:occluders falha com ERR_CONNECTION_REFUSED sem servidor, e não é de fauna. O AM7 foi calculado pela sonda com a mesma fórmula e validado contra os quatro números de browser já registrados. tools/eval/map-check.mjs NÃO foi rodado (reescreve artefato rastreado)."
  },
  "o_que_exige_figura": [
    "A GALINHA E O PINTO ANDANDO. São os dois em que o parecer da casa dizia 'estático aqui mente'. Mitigei por comportamento (passo curto, 3 s parada entre pernadas) mas não vi rodando. Se deslizar feio, o conserto é `to` mais curto ou `to` ausente como o cavalo — uma linha por mapa.",
    "O PATO NA LÂMINA. A submersão de 7,5 cm é calculada, não vista. No parque não há cuba: os 3 cm abaixo de y=0 ficam sob o plano de chão opaco e os 4,5 cm entre 0 e a lâmina aparecem pela água translúcida — é o que quero, mas é preciso ver.",
    "O CAVALO A 1,55 m DE CERNELHA no campomorro e no velho_oeste. É de longe o maior bicho do jogo (2,50 m de corpo contra 1,75 m da vaca) e a lição da capivara de 18/08 foi exatamente essa.",
    "O CARCARÁ NOS TRÊS POLEIROS: beiral a 3,27 m (velho_oeste), ponta de laje a 5,20 m (lajes) e teto de ônibus a 3,30 m (praça). As três alturas vieram de raycast em node; GLB de ônibus em node é pegada de contingência, não malha.",
    "O RATO E O TATU DEPOIS DA CORREÇÃO DE 180°. A prova é geométrica e tripla, mas é mudança em bicho que está em 17 mapas.",
    "A PROPORÇÃO GALINHA ↔ PINTINHO (0,45 contra 0,14 m) lado a lado, a 0,6 m de distância — é a leitura de 'quintal' que o dono vai julgar."
  ],
  "nao_feito": "nenhum commit. Nada gerado no Mint (saldo intocado). Nenhum arquivo além dos 13 listados; as outras modificações no worktree (map_atacadao, map_havan, map_obras, map_penitenciaria, map_upa, maps.js e os artefatos de tools/eval) já estavam lá e são de outras frentes."
}
```
