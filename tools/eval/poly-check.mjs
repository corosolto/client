/* poly-check.mjs — PISO E TETO DE POLÍGONO DO ACERVO, e o proxy de esfera que vaza pra tela.
   ═══════════════════════════════════════════════════════════════════════════════════
   O CASO QUE COMPROU ESTA RÉGUA (13/09/2026)

   Pedido do dono: "temos que melhorar os animais, nenhum pode ser lowpoly, tem que usar os
   moldes do mint gg ou mintar novos". Medindo TODO GLB servido (248 arquivos; relatório em
   docs/maps/RELATORIO-LOWPOLY.md) apareceram três coisas que NENHUMA régua olhava:

     · 4 dos 11 animais abaixo de 2.500 tri — cachorro com 1.950, que é 40% de um
       personagem jogável (mediana 4.869) e é o bicho mais visível do jogo (6 mapas);
     · 5 dos 11 sem `skins` E sem `animations` (jacaré, capivara, tatu, barata, papagaio):
       bicho parado num FPS lê como cenário quebrado, independente do polígono;
     · o low-poly DE VERDADE é o proxy procedural de esfera+cone que nasce quando o GLB não
       carrega — 114 a 561 tri, até 32× menos que o GLB que ele substitui (§2.3 do
       relatório). Nada media se ele vazava para a tela do jogador, então a resposta honesta
       para "o bicho está low-poly?" era "às vezes, e ninguém sabe quando".

   E o achado que o pedido não previa: o acervo não é pobre de triângulo, é MAL DISTRIBUÍDO.
   Um botijão de gás (17.132 tri) custa 16 casas de favela (`fav_house`, 1.070); um tufo de
   capim de 20 cm (4.142) custa quase o Congresso Nacional inteiro (4.905). Régua que só
   tivesse piso empurraria o acervo todo para cima; por isso aqui tem piso E teto.

   ── AS CINCO PERGUNTAS (SKILL.md da `regua`) ───────────────────────────────────────
   1. QUAL DEFEITO ELA PREMIA? Dois, e os dois têm cláusula irmã.
      (a) INFLAR tudo passa em POLY1/POLY3 sorrindo — por isso POLY4 (teto de prop) e POLY5
          (KB de textura ÷ tri), que acusa a forma fingida por imagem: `fav_house` tem
          2.015 KB de textura para 1.070 tri, e isso desmonta a 3 m, que é a distância de
          combate.
      (b) APAGAR a fauna deixaria POLY1/POLY2 verdes por VACUIDADE — o modo de falha que o
          `obb-check` já cobrou desta casa. Por isso POLY0: o censo vem do REGISTRO
          (`ASSETS` do ambientlife.js, via `faunaAssetUrl`), não de uma lista literal aqui,
          e id registrado sem arquivo em disco é vermelho.
   2. MESMO MUNDO? Metade e metade, declarado.
      POLY0–POLY5 leem o BINÁRIO SERVIDO (o mesmo byte que o browser baixa) — node basta e
      é honesto: triângulo de accessor não muda de valor no Chrome.
      POLY6 é sobre o que APARECE NA TELA, e aí node mente: no arnês nenhum GLB carrega por
      desenho (map-check.mjs:111), então o proxy é legítimo e a régua ficaria verde sem
      medir nada. Ela FORÇA o ambiente de browser (`setFaunaRuntime`, ambientlife.js) e
      constrói o mundo de verdade (`buildCorrego`).
      O QUE POLY6 NÃO COBRE, escrito: GLB que carrega mas está invisível, torto ou preto no
      pixel. Quem acha isso é captura de browser (tools/eval/asset-evidence/), não esta.
   3. LIMIAR COMPARTILHADO? O teto de prop (POLY4) é LIDO de `tools/gen-asset.mjs`
      (`--face-limit`, 12.000 hoje) — é o mesmo número com que o asset é GERADO; se ele
      mudar lá, esta régua muda junto, porque aqui não existe cópia dele. O piso de fauna
      (2.500) é metade da mediana da casa, e a régua RECALCULA essa mediana a cada rodada
      (personagem 4.869 / arma 4.827, 13/09) e imprime a razão: piso que deixou de ser
      metade da mediana aparece no relatório em vez de envelhecer calado.
   4. COMO FALHA QUANDO NÃO SABE MEDIR? Vermelho, sempre. GLB que não parseia, primitivo sem
      accessor de índice/POSITION, imagem sem `bufferView` nem `uri`, `--face-limit` que
      sumiu do gen-asset.mjs, mundo que não constrói — tudo entra como reprova NOMINAL.
      Nenhum arquivo é "pulado": foi um `null` com cara de fato que fez a casa publicar
      licença errada (LIÇÃO do gen-docs).
   5. ORÇAMENTO? 0,5 s medido: 252 GLB lidos só no chunk JSON (o BIN nem é decodificado) e
      três `buildCorrego` (um por estado do POLY6, 0,1 s cada). Cabe no `check:fast`, sem
      browser — e é por isso que POLY6 constrói UM mapa e não os 17: a classe que desenha a
      fauna (`FavelaAmbience`) é a mesma nos 17, então o 18º build não mediria nada novo.

   ── DÍVIDA DECLARADA, e NÃO teto afrouxado ─────────────────────────────────────────
   Na primeira medição (13/09) o estado de hoje REPROVAVA em POLY1 (4), POLY2 (5), POLY3
   (5), POLY4 (35) e POLY6 (2). POLY3 e POLY4 vieram diferentes do que o relatório estimou
   (6 e "vários") e o número medido manda; POLY6 foi CONSERTADO no mesmo dia (fail-closed
   no ambientlife.js + os dois guardas do map_corrego.js) e por isso não tem dívida.
   Baixar o piso ou subir o teto para o repositório ficar verde seria escrever no código a
   mentira que a régua existe para desmentir. Então a entrada de hoje está em `DIVIDA`
   abaixo, nominal e datada: ela AVISA e não reprova; qualquer vermelho FORA da lista
   reprova. Mesmo contrato do tools/eval/KNOWN-RED.json, e mora aqui pelo mesmo motivo que
   a dívida do mapa-novo-gate.mjs:167 mora lá: o KNOWN-RED.json é guardado pelo
   `eval:ratchet`, que reprova PR com entrada nova — despejar 49 dívidas lá de carona
   reprovaria o PR de quem não tem nada com isso. Promover é decisão de outra rodada.

   ── AS MUTAÇÕES (LEI 3: régua que não morde não existe) ────────────────────────────
     --mutante=fauna-magra   decima em memória a fauna mais gorda (a pomba, 6.928 tri, que é
                             a única acima do padrão da casa) para 800 tri  -> POLY1 vermelha
     --mutante=fauna-parada  apaga `skins` e `animations` da fauna com mais clipes (o
                             cachorro, 12)                                  -> POLY2 vermelha
     --mutante=proxy-vivo    reescreve o guarda do fallback em ambientlife.js para `true`
                             NA CARGA DO MÓDULO (hook de loader; o arquivo em disco não é
                             tocado, igual ao `page.route` do console-check.mjs:118)
                                                                            -> POLY6 vermelha
   As três ABORTAM se não aplicarem ("MUTANTE NAO APLICOU"): mutação decorativa é confiança
   falsa por escrito, e essa a casa já pagou uma vez. MEDIDO em 13/09/2026, com a dívida
   declarada no lugar (base = 0 reprova, 49 dívidas):
     fauna-magra   -> 1 reprova nova: POLY1:pigeon_ground 800 tri (era 6.928)
     fauna-parada  -> 1 reprova nova: POLY2:dog_caramelo 0 skin/0 clipe (era 1/12)
     proxy-vivo    -> 5 reprovas novas: POLY6 rato, pomba, gato, galinha e barata voltam a
                      nascer no browser (10 objetos), enquanto jacaré e capivara — que já
                      passam pelo guarda do mapa — continuam fora
   E a guarda de aplicação também foi exercida: `--mutante=fauna-magra --alvo=dog_caramelo`
   e `--mutante=fauna-parada --alvo=tatu_campo` ABORTAM (o alvo já estava vermelho), e
   trocar o texto do guarda no ambientlife.js faz o proxy-vivo abortar em vez de dar verde.

   USO
     node tools/eval/poly-check.mjs
     node tools/eval/poly-check.mjs --mutante=fauna-magra|fauna-parada|proxy-vivo
     node tools/eval/poly-check.mjs --mutante=fauna-magra --alvo=vaca_campo
     node tools/eval/poly-check.mjs --tudo          (lista todo asset medido, não só o vermelho)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { readGLB } from './tp-mount-probe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const TUDO = args.includes('--tudo');
/* `--alvo=<id>` escolhe QUAL fauna os mutantes de dado atacam (o padrão é a mais gorda /
   a mais animada, isto é, a que HOJE passa). Serve para duas coisas: mutar um bicho
   específico, e PROVAR a guarda de aplicação — apontar o mutante para um bicho que já
   está vermelho tem de abortar, não dar verde. */
const ALVO = val('alvo', '');
const MUTANTES = ['fauna-magra', 'fauna-parada', 'proxy-vivo'];
if (MUTANTE && !MUTANTES.includes(MUTANTE)) {
  console.error(`✗ POLY0  mutante desconhecido: ${MUTANTE} (conhecidos: ${MUTANTES.join(', ')})`);
  process.exit(1);
}

/* ── PROXY-VIVO: o hook tem que ser registrado ANTES de qualquer import de ambientlife.js,
   então todo import de jogo neste arquivo é DINÂMICO, lá embaixo no POLY6. O replace é o
   guarda do fail-closed (ambientlife.js:299); virar `true` devolve o proxy ao browser, que
   é exatamente a regressão que POLY6 existe para pegar. */
const PROXY_DE = '} else if (faunaProxyAllowed()) {';
const PROXY_PARA = '} else if (true) { /* MUTANTE proxy-vivo */';
if (MUTANTE === 'proxy-vivo') {
  register('data:text/javascript,' + encodeURIComponent(`
    const DE = ${JSON.stringify(PROXY_DE)}, PARA = ${JSON.stringify(PROXY_PARA)};
    export async function load(url, ctx, next) {
      const r = await next(url, ctx);
      if (!url.endsWith('/public/js/ambientlife.js')) return r;
      const src = r.source.toString();
      const novo = src.replace(DE, PARA);
      if (novo === src) throw new Error('MUTANTE NAO APLICOU: o guarda ' + JSON.stringify(DE) + ' não existe mais em public/js/ambientlife.js — o fail-closed foi reescrito e este mutante ficou decorativo');
      return { ...r, source: novo };
    }`));
}

/* ── LIMIARES ──────────────────────────────────────────────────────────────────────
   PISO_FAUNA: 2.500 tri. Procedência: mediana dos 63 personagens jogáveis 4.869 e das 27
   armas 4.827 (os dois catálogos saídos do MESMO pipeline Mint, recalculados abaixo em
   `medianaDaCasa`). 2.500 é metade disso e é o DEGRAU MEDIDO que separa os 4 piores
   (cachorro 1.950, barata 2.124, gato 2.448, vaca 2.450) do resto da fauna (2.904 pra
   cima): não é número redondo escolhido no gosto, é o vão que existe na distribuição.
   PISO_PROP: 1.000 tri. Abaixo disso, no acervo de hoje, só há casario e objeto de mão
   (`jersey_barrier` 369, `lajes_casa_06` 750, `fav_brasileira` 780, `lajes_casa_05` 891,
   `shopping_cart` 952) — a família que o jogador tem na cara em fy_lajes/quebrada/escadão.
   RAZAO_KB_TRI: 1,0 KB de textura por triângulo, e KB aqui é KiB (bytes ÷ 1024) — o
   relatório escreveu "2.015 KB" em decimal, esta régua mede os MESMOS bytes e diz 1.912.
   Quem passa hoje é só o `fav_house`: 1,79 KB/tri (1.912 KiB de imagem para 1.070 tri), e
   ele é o retrato da forma fingida por imagem — a casa é uma caixa, quem finge o relevo é
   a textura, e isso desmonta a 3 m, que é a distância de combate. O 2º pior do acervo mede
   0,78, então 1,0 passa no vão da distribuição e não no meio de um aglomerado.
   AVISA, não reprova: existe prop legítimo cuja graça É a textura (pôster, placa, tapume). */
const PISO_FAUNA = 2500;
const PISO_PROP = 1000;
const RAZAO_KB_TRI = 1.0;

/* TETO_PROP não é escrito aqui de propósito (LIÇÃO 2: limiar único, lido da fonte). */
function tetoDoGenAsset() {
  const arquivo = path.join(ROOT, 'tools/gen-asset.mjs');
  const src = fs.readFileSync(arquivo, 'utf8');
  const m = src.match(/arg\(\s*'face-limit'\s*,\s*'(\d+)'\s*\)/);
  if (!m) {
    throw new Error("não achei `arg('face-limit', 'N')` em tools/gen-asset.mjs — o teto de "
      + 'prop é o MESMO com que o asset é gerado e não tem cópia aqui. Conserto: ou o '
      + 'gen-asset mudou a flag (ajuste este regex) ou ele perdeu o limite (aí o problema é lá).');
  }
  return parseInt(m[1], 10);
}

/* ── DÍVIDA DECLARADA — entrada aqui AVISA; vermelho fora da lista REPROVA.
   NÃO ACRESCENTE NADA AQUI PARA FICAR VERDE. Todos os números abaixo foram medidos em
   13/09/2026 por esta régua e estão em docs/maps/RELATORIO-LOWPOLY.md, com a fila de
   conserto no §4 daquele documento. Quando um item passar, a régua manda REMOVER a entrada
   (linha "QUITADAS"), porque dívida paga que continua declarada é dívida que deixa de
   morder se o asset regredir. */
const DIVIDA = {
  // POLY1 — fauna abaixo do piso. Fila de re-mint no §4.1 do relatório.
  'POLY1:dog_caramelo': '1.950 tri — o mais pobre da fauna e o bicho mais visível do jogo (6 mapas); re-mintar ≥5.000 RETARGETANDO os 12 clipes',
  'POLY1:barata_urbana': '2.124 tri e 0 animação — re-mintar ≥4.500 + animar (ela corre)',
  'POLY1:cat_telhado': '2.448 tri / 2.276 verts — re-mintar ≥4.500',
  'POLY1:vaca_campo': '2.450 tri para um bicho de 1,75 m (a menor densidade do acervo) — re-mintar ≥5.000',
  // POLY2 — fauna sem rig e sem clipe: a locomoção é empurrada por código (ambientlife QUAD_SPEED).
  'POLY2:jacare_corrego': '4.856 tri, 0 clipe — forma boa, bicho imóvel no mapa em que é atração; animar (respiração, cauda, boca)',
  'POLY2:capivara_corrego': '5.005 tri, 0 clipe — animar (pastar, orelha, passo)',
  'POLY2:tatu_campo': '3.136 tri, 0 clipe — animar (locomoção hoje é procedural)',
  'POLY2:barata_urbana': '2.124 tri, 0 clipe — animar junto do re-mint do POLY1',
  'POLY2:papagaio_poleiro': '2.961 tri, 0 clipe — animar (pouso, cabeça, asa)',
  /* POLY2 · vida 2 (14/09) — os 8 GLB da rodada da fauna paga do Mint. A dívida é a MESMA
     das cinco de cima e agora tem causa MEDIDA, não suposta: `list_model_animation_options`
     devolve 673 clipes e os 673 são `humanoid animation`; os 15 conjuntos curados têm todos
     a tag `humanoid`; e o único não-humanoide que a conta já riggou (o boto) voltou em
     `t_pose` (docs/maps/mint/fauna.md §4, quatro evidências independentes). Ou seja: NÃO
     adianta "re-mintar e animar" — animar quadrúpede/ave é coisa que este fornecedor não
     faz. A quitação é rig/clipe de FORA do Mint (Quaternius CC0 entrega cachorro com 12
     clipes, gato com 3, vaca com 3 — foi de lá que veio tudo que se move no jogo).
     Enquanto isso, a mitigação é de COMPORTAMENTO e já está no ambientlife: quem não pode
     andar sem mentir não anda (carcará e papagaio são `PERCHED`; o cavalo pasta sem `to`),
     e o único que desliza com razão é o pato, porque pato nadando desliza mesmo. */
  'POLY2:galinha_hen': '3.046 tri, 0 clipe — galinha de quintal (lajes, escadão, córrego, quebrada, campomorro); rig/clipe fora do Mint (ciscar, passo)',
  'POLY2:pintinho': '2.846 tri, 0 clipe — pinto anda atrás da galinha; rig/clipe fora do Mint',
  'POLY2:galinha_angola': '3.031 tri, 0 clipe — capote de terreiro no campomorro; pose de alerta parada é a menos mentirosa do lote',
  'POLY2:pato_lago': '2.676 tri, 0 clipe — pato NADANDO (parque, mansão); deslizar na lâmina é correto, o que falta é o balanço da água',
  'POLY2:cavalo_sitio': '3.098 tri, 0 clipe — cavalo pastando de cabeça baixa; nasce SEM `to` (não anda), então a dívida só aparece no susto',
  'POLY2:cabra_caatinga': '2.874 tri, 0 clipe — cabra do curral e da beira de pista; rig/clipe fora do Mint',
  'POLY2:carcara': '3.000 tri, 0 clipe — rapina POUSADA (PERCHED, não anda); dívida é só a cabeça/asa, não a locomoção',
  /* NÃO É SERVIDO e por isso também aparece no AVISO do POLY0: o calango saiu do Mint em
     pose BÍPEDE ERETA (tronco vertical, braços à frente) e lagarto de muro é quadrúpede
     rente à superfície — figura em /tmp/faunaprobe/calango_3v.png, mesmo veredito da §2 do
     fauna.md. Fica no disco como evidência do pedido de re-mint EM POSE QUADRÚPEDE (§3.4);
     apagar o arquivo apagaria a dívida junto. */
  'POLY2:calango': '2.726 tri, 0 clipe — e NÃO ENTROU em mapa nenhum: pose bípede ereta, inútil como calango de muro. Re-mintar pedindo pose quadrúpede no prompt',
  /* POLY3 — prop servido abaixo do piso. MEDIDO 5, e não os 6 que o §3 do relatório
     anunciou: o `fav_house` (1.070) está ACIMA do piso de 1.000 e quem o acusa é o POLY5,
     não este. 4 dos 5 são casario ou objeto de mão — o que o jogador tem na cara. */
  'POLY3:jersey_barrier': '369 tri — barreira de rua; encostada é chapa. Alvo ≥2.500',
  'POLY3:lajes_casa_06': '750 tri — casario do fy_lajes. Alvo ≥4.000',
  'POLY3:fav_brasileira': '780 tri com 611 KB de textura — casa inteira. Alvo ≥4.000',
  'POLY3:lajes_casa_05': '891 tri — casario. Alvo ≥4.000',
  'POLY3:shopping_cart': '952 tri — objeto de mão no Atacadão. Alvo ≥2.500',
  /* POLY4 — prop acima do teto do próprio gerador: 35 arquivos, e não os 4 que o §4.3 do
     relatório listou. A diferença tem nome: 20 deles são CARRO DE TERCEIRO, que nunca
     passou pelo `gen-asset --face-limit` porque não foi gerado por ele. Conserto é local e
     de graça (tools/optimize-props-v21.mjs), sem chave de API e sem decisão de gasto.
     3 estão SERVIDOS E SEM USO em qualquer map_*.js (0 referência fora de public/models):
     para esses, decimar é o segundo melhor conserto — o primeiro é sair do deploy. */
  'POLY4:wall_of_cars': '242.342 tri (20,2× o teto) — muro de carros do ferro velho, o prop mais caro do acervo; decimar ≤12.000',
  'POLY4:crushed_classic': '132.890 tri (11,1× o teto) — sucata do ferro velho; decimar ≤12.000',
  'POLY4:vw_9150': '89.198 tri (7,4× o teto) — caminhão de cenário em 7 mapas; decimar ≤12.000',
  'POLY4:2015_nissan_versa_sedan_1.6': '76.123 tri (6,3× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:old_vw_bug': '61.471 tri (5,1× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2017_kia_picanto_gt-line': '53.010 tri (4,4× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:construction_rubble': '52.967 tri (4,4× o teto) — entulho de obra (obras, penitenciária); decimar ≤12.000',
  'POLY4:2023_nissan_altima__teana': '51.841 tri (4,3× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2019_ford_fiesta_st': '44.058 tri (3,7× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:1981_dmc_delorean': '41.819 tri (3,5× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:1999_mercedes_benz_s600': '40.140 tri (3,3× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:uno_mille': '39.807 tri (3,3× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2023_toyota_rav4_hybrid': '35.008 tri (2,9× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2021_volkswagen_polo_plus': '31.845 tri (2,7× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:destroyed_cars': '31.841 tri (2,7× o teto) — SERVIDO E SEM USO (0 referência em public/js); tirar do deploy antes de decimar',
  'POLY4:1965_ford_mustang_coupe_289': '31.814 tri (2,7× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2022_chevrolet_tracker_rs_335t': '31.435 tri (2,6× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:car_a': '27.142 tri (2,3× o teto) — carro do estacionamento do Havan; decimar ≤12.000',
  'POLY4:broken_car_2': '24.983 tri (2,1× o teto) — sucata do ferro velho; decimar ≤12.000',
  'POLY4:wreck_car': '22.601 tri (1,9× o teto) — SERVIDO E SEM USO (0 referência em public/js); tirar do deploy antes de decimar',
  'POLY4:2020_bmw_m8_coupe': '21.861 tri (1,8× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:fiat_uno': '21.188 tri (1,8× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:peugeot_405': '20.177 tri (1,7× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2020_nissan_sentra_sylphy': '19.794 tri (1,6× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:caixa_dagua': '18.749 tri (1,6× o teto) — caixa d\u2019água pequena e MUITO repetida; decimar ≤6.000',
  'POLY4:botijao_gas': '17.132 tri (1,4× o teto) — um botijão custa 16 casas de favela; decimar ≤6.000',
  'POLY4:fav_modular': '16.661 tri (1,4× o teto) — casario modular em 4 mapas; decimar ≤12.000',
  'POLY4:tiara_gt83': '15.199 tri (1,3× o teto) — cupê rebaixado da quebrada; decimar ≤12.000',
  'POLY4:1986_ford_escort_xr3': '15.121 tri (1,3× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2014_mini_cooper_s_f56': '14.574 tri (1,2× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:2021_nissan_kicks': '14.039 tri (1,2× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:fiat_toro': '13.260 tri (1,1× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:1993_fiat_punto': '13.019 tri (1,1× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:1989_ford_fiesta_xr2i_mk3': '12.957 tri (1,1× o teto) — carro de terceiro; decimar ≤12.000',
  'POLY4:lajes_bloco_tijolo': '12.562 tri (1,0× o teto) — SERVIDO E SEM USO (0 referência em public/js); tirar do deploy antes de decimar',
  /* POLY6 — SEM DÍVIDA. Os dois proxies do próprio map_corrego.js (jacaré :455-520 e
     capivara :522-583) nasceram nesta lista em 13/09 e foram QUITADOS no mesmo dia: o
     `faunaProxyAllowed()` entrou nos dois guardas (map_corrego.js:514 e :577) e a cláusula
     ficou verde, então a entrada SAIU — dívida paga que continua declarada é dívida que
     deixa de morder se o asset regredir (mesma regra do mapa-novo-gate.mjs:177). */
};

/* ── MEDIÇÃO DO CONTAINER GLB ──────────────────────────────────────────────────────
   Mesma conta do char-probe.mjs:642 e do relatório, de propósito (limiar compartilhado
   precisa de MEDIDA compartilhada): soma por PRIMITIVO declarado em `meshes[]`, índice
   quando existe, POSITION quando não. Isso conta a malha do ARQUIVO, não as instâncias na
   cena — é o que o browser baixa e o que o gerador limita com `--face-limit`.
   `mode` ausente é 4 (TRIANGLES) por spec glTF; ponto e linha (0-3) não têm triângulo. */
function medirGLB(arquivo) {
  const { json } = readGLB(arquivo);
  if (!json) throw new Error('chunk JSON ausente (GLB truncado?)');
  let tri = 0, prims = 0;
  for (const [mi, mesh] of (json.meshes || []).entries()) {
    for (const [pi, prim] of (mesh.primitives || []).entries()) {
      if (prim.mode !== undefined && prim.mode !== 4) continue;
      const idx = prim.indices !== undefined ? prim.indices : prim.attributes?.POSITION;
      const acc = idx !== undefined ? json.accessors?.[idx] : undefined;
      if (!acc || typeof acc.count !== 'number') throw new Error(`meshes[${mi}].primitives[${pi}] sem accessor de índice/POSITION`);
      tri += acc.count / 3;
      prims++;
    }
  }
  /* KB de textura = bytes de IMAGEM, embutida (bufferView) ou ao lado (uri). Não é o
     tamanho do arquivo: num GLB o BIN carrega malha + imagem juntas. */
  let texBytes = 0;
  for (const [ii, img] of (json.images || []).entries()) {
    if (img.bufferView !== undefined) {
      const bv = json.bufferViews?.[img.bufferView];
      if (!bv || typeof bv.byteLength !== 'number') throw new Error(`images[${ii}] aponta bufferView inexistente`);
      texBytes += bv.byteLength;
    } else if (typeof img.uri === 'string' && img.uri.startsWith('data:')) {
      texBytes += Math.round((img.uri.length - img.uri.indexOf(',') - 1) * 3 / 4);
    } else if (typeof img.uri === 'string') {
      const lado = path.join(path.dirname(arquivo), decodeURIComponent(img.uri));
      if (!fs.existsSync(lado)) throw new Error(`images[${ii}] aponta ${img.uri}, que não existe em disco`);
      texBytes += fs.statSync(lado).size;
    } else {
      throw new Error(`images[${ii}] sem bufferView e sem uri — não sei medir`);
    }
  }
  return {
    tri: Math.round(tri), prims,
    skins: (json.skins || []).length,
    anims: (json.animations || []).length,
    texKB: Math.round(texBytes / 1024),
    arquivoKB: Math.round(fs.statSync(arquivo).size / 1024),
  };
}

const glbsDe = (dir, recursivo = false) => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true, recursive: recursivo })
    .filter((e) => e.isFile() && e.name.endsWith('.glb'))
    .map((e) => path.join(e.parentPath || e.path || abs, e.name))
    .sort();
};

const erros = [];              // "não sei medir" = vermelho, nunca pulado
function medirLote(arquivos) {
  const fora = [];
  for (const arquivo of arquivos) {
    const id = path.basename(arquivo, '.glb');
    try {
      fora.push({ id, arquivo, ...medirGLB(arquivo) });
    } catch (e) {
      erros.push(`${path.relative(ROOT, arquivo)}: ${e.message}`);
    }
  }
  return fora;
}

const mediana = (ns) => {
  if (!ns.length) return null;
  const s = [...ns].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const n = (x) => x.toLocaleString('pt-BR');

/* ── ACERVO ─────────────────────────────────────────────────────────────────────
   "prop SERVIDO" = GLB na RAIZ de public/models/props. As 3 subpastas guardam a saída CRUA
   do Mint ao lado do otimizado (1,8-1,9 M tri cada) e nenhum mapa as baixa: medir aquilo
   como prop servido reprovaria o POLY4 por um arquivo que ninguém desenha. */
const fauna = medirLote(glbsDe('public/models/ambient'));
const props = medirLote(glbsDe('public/models/props'));
const personagens = medirLote(glbsDe('public/models/characters'));
const armas = medirLote(glbsDe('public/models/weapons'));
const medianaDaCasa = mediana([...personagens, ...armas].map((a) => a.tri));

let TETO_PROP = null;
try { TETO_PROP = tetoDoGenAsset(); } catch (e) { erros.push(`teto de POLY4: ${e.message}`); }

/* ── MUTANTES DE DADO (os de POLY1/POLY2). Aplicam DEPOIS da medição, em memória, e
   ABORTAM se o alvo escolhido já estivesse vermelho — mutante que muta o que já falhava
   não prova nada. */
function escolherAlvo(ordem) {
  if (!fauna.length) { console.error('✗ POLY0  MUTANTE NAO APLICOU: nenhuma fauna medida — não há o que mutar'); process.exit(1); }
  if (!ALVO) return [...fauna].sort(ordem)[0];
  const alvo = fauna.find((a) => a.id === ALVO);
  if (!alvo) { console.error(`✗ POLY0  MUTANTE NAO APLICOU: --alvo=${ALVO} não é nenhuma fauna medida (${fauna.map((a) => a.id).join(', ')})`); process.exit(1); }
  return alvo;
}
function mutarDado() {
  if (MUTANTE === 'fauna-magra') {
    const alvo = escolherAlvo((a, b) => b.tri - a.tri);
    if (alvo.tri < PISO_FAUNA) { console.error(`✗ POLY0  MUTANTE NAO APLICOU: ${alvo.id} já estava ABAIXO do piso (${n(alvo.tri)} < ${n(PISO_FAUNA)}) — decimá-lo não provaria nada, o POLY1 já o acusa. Escolha outro --alvo.`); process.exit(1); }
    const antes = alvo.tri;
    alvo.tri = 800;
    alvo.mutado = `decimado ${n(antes)} -> 800 tri`;
    console.log(`MUTAÇÃO fauna-magra: ${alvo.id} ${n(antes)} -> 800 tri (em memória)\n`);
  }
  if (MUTANTE === 'fauna-parada') {
    const alvo = escolherAlvo((a, b) => (b.anims + b.skins) - (a.anims + a.skins));
    if (!alvo.anims && !alvo.skins) { console.error(`✗ POLY0  MUTANTE NAO APLICOU: ${alvo.id} já estava sem rig E sem clipe — apagar o que não existe não provaria nada, o POLY2 já o acusa. Escolha outro --alvo.`); process.exit(1); }
    const antes = `${alvo.skins} skin / ${alvo.anims} clipe(s)`;
    alvo.skins = 0; alvo.anims = 0;
    alvo.mutado = `rig e clipes apagados (era ${antes})`;
    console.log(`MUTAÇÃO fauna-parada: ${alvo.id} ${antes} -> 0/0 (em memória)\n`);
  }
}
mutarDado();

/* ── RELATÓRIO ─────────────────────────────────────────────────────────────────── */
const vermelhos = [];          // {clausula, chave, msg}
const avisos = [];
const reprova = (clausula, chave, msg) => vermelhos.push({ clausula, chave: `${clausula}:${chave}`, msg });
const usadas = new Set();

console.log(`RÉGUA DE POLÍGONO${MUTANTE ? `  [MUTAÇÃO: ${MUTANTE}]` : ''}   ${new Date().toISOString().slice(0, 10)}`);
console.log(`acervo: ${fauna.length} fauna · ${props.length} props servidos · ${personagens.length} personagens · ${armas.length} armas`);
console.log(`mediana da casa (personagem+arma, o mesmo pipeline Mint): ${n(medianaDaCasa ?? 0)} tri`
  + `   piso de fauna ${n(PISO_FAUNA)} = ${medianaDaCasa ? (PISO_FAUNA / medianaDaCasa * 100).toFixed(0) : '??'}% dela`);
console.log(`teto de prop (POLY4): ${TETO_PROP === null ? 'NÃO LIDO' : n(TETO_PROP)} tri — lido de tools/gen-asset.mjs --face-limit\n`);

/* POLY0 — censo pelo REGISTRO (guarda de vacuidade das outras cláusulas) */
const { faunaAssetUrl, CORREGO_FAUNA_ASSETS } = await import(pathToFileURL(path.join(ROOT, 'public/js/ambientlife.js')).href)
  .catch((e) => { erros.push(`POLY0: não consegui importar public/js/ambientlife.js: ${e.message}`); return {}; });
/* `CORREGO_FAUNA_ASSETS` = os 9 ids da ambiência + jacaré e capivara, e os dois últimos
   JÁ estão em `ASSETS` — a lista tem 13 entradas para 11 arquivos. Dedupe pelo ARQUIVO,
   que é o que existe em disco. */
const registro = [...new Set(CORREGO_FAUNA_ASSETS || [])];
const noDisco = new Set(fauna.map((a) => a.id));
const registrados = new Set();
console.log('POLY0 · censo de fauna pelo registro (ambientlife.js ASSETS)');
for (const id of registro) {
  const url = faunaAssetUrl(id);
  const base = url ? path.basename(url, '.glb') : null;
  if (base) registrados.add(base);
  if (!base || !noDisco.has(base)) reprova('POLY0', id, `registrado em ambientlife.js${url ? ` como ${url}` : ''} e SEM GLB em disco — a fauna desaparece do jogo e as cláusulas POLY1/POLY2 ficariam verdes por vacuidade`);
}
for (const a of fauna) if (!registrados.has(a.id)) avisos.push(`POLY0 ${a.id}: GLB em public/models/ambient que NENHUM id do registro serve (${n(a.tri)} tri, ${n(a.arquivoKB)} KB mortos no deploy)`);
console.log(`      ${registro.length} ids no registro · ${registrados.size} GLB que eles apontam · ${fauna.length} GLB em public/models/ambient`
  + ` · ${vermelhos.filter((v) => v.clausula === 'POLY0').length} registrado(s) sem arquivo\n`);

/* POLY1 — piso de fauna */
console.log(`POLY1 · fauna abaixo de ${n(PISO_FAUNA)} tri (metade da mediana da casa)`);
console.log('      animal                 tri   skin  clipes   texKB   arqKB   veredito');
for (const a of [...fauna].sort((x, y) => x.tri - y.tri)) {
  const ruim = a.tri < PISO_FAUNA;
  if (ruim) reprova('POLY1', a.id, `${n(a.tri)} tri < piso ${n(PISO_FAUNA)} (${(a.tri / (medianaDaCasa || 1) * 100).toFixed(0)}% da mediana da casa) — re-mintar a FORMA; animação existente se retargeta, não se regenera`);
  if (ruim || TUDO) {
    console.log(`      ${a.id.padEnd(20)}${String(n(a.tri)).padStart(7)}${String(a.skins).padStart(6)}${String(a.anims).padStart(8)}${String(n(a.texKB)).padStart(8)}${String(n(a.arquivoKB)).padStart(8)}   ${ruim ? 'REPROVA' : 'ok'}${a.mutado ? `  [${a.mutado}]` : ''}`);
  }
}

/* POLY2 — bicho sem rig E sem clipe */
console.log(`\nPOLY2 · fauna sem \`skins\` E sem \`animations\` (bicho empurrado por código)`);
for (const a of [...fauna].sort((x, y) => x.id.localeCompare(y.id))) {
  const parado = !a.skins && !a.anims;
  if (parado) reprova('POLY2', a.id, `0 skin e 0 clipe — a locomoção é empurrada por ambientlife.js (QUAD_SPEED), o que move o bicho inteiro sem mover uma pata`);
  if (parado || TUDO) console.log(`      ${a.id.padEnd(20)}${String(a.skins).padStart(7)} skin${String(a.anims).padStart(5)} clipe(s)   ${parado ? 'REPROVA' : 'ok'}${a.mutado ? `  [${a.mutado}]` : ''}`);
}

/* POLY3 / POLY4 — piso e teto de prop servido */
console.log(`\nPOLY3 · prop servido abaixo de ${n(PISO_PROP)} tri`);
for (const p of [...props].sort((x, y) => x.tri - y.tri)) {
  if (p.tri >= PISO_PROP && !TUDO) continue;
  const ruim = p.tri < PISO_PROP;
  if (ruim) reprova('POLY3', p.id, `${n(p.tri)} tri < piso ${n(PISO_PROP)}, com ${n(p.texKB)} KB de textura — forma pobre onde o jogador encosta`);
  console.log(`      ${p.id.padEnd(30)}${String(n(p.tri)).padStart(8)} tri${String(n(p.texKB)).padStart(7)} KB   ${ruim ? 'REPROVA' : 'ok'}`);
}
console.log(`\nPOLY4 · prop servido acima do teto do próprio gerador (${TETO_PROP === null ? 'TETO NÃO LIDO — vermelho' : n(TETO_PROP)} tri)`);
if (TETO_PROP !== null) {
  for (const p of [...props].sort((x, y) => y.tri - x.tri)) {
    if (p.tri <= TETO_PROP && !TUDO) continue;
    const ruim = p.tri > TETO_PROP;
    if (ruim) reprova('POLY4', p.id, `${n(p.tri)} tri > teto ${n(TETO_PROP)} (${(p.tri / TETO_PROP).toFixed(1)}× o --face-limit com que ele foi gerado) — decimar com tools/optimize-props-v21.mjs`);
    console.log(`      ${p.id.padEnd(30)}${String(n(p.tri)).padStart(8)} tri  ${(p.tri / TETO_PROP).toFixed(1)}×   ${ruim ? 'REPROVA' : 'ok'}`);
  }
}

/* POLY5 — forma fingida por imagem. AVISA (existe prop cuja graça É a textura). */
console.log(`\nPOLY5 · KB de textura ÷ tri > ${RAZAO_KB_TRI.toFixed(1)} (forma fingida por imagem) — AVISA`);
for (const p of [...fauna, ...props].sort((x, y) => (y.texKB / Math.max(1, y.tri)) - (x.texKB / Math.max(1, x.tri)))) {
  const razao = p.texKB / Math.max(1, p.tri);
  if (razao <= RAZAO_KB_TRI && !TUDO) continue;
  if (razao > RAZAO_KB_TRI) avisos.push(`POLY5 ${p.id}: ${razao.toFixed(2)} KB/tri (${n(p.texKB)} KB de textura para ${n(p.tri)} tri) — quem finge o relevo é a imagem, e isso desmonta a 3 m`);
  console.log(`      ${p.id.padEnd(30)}${razao.toFixed(2).padStart(6)} KB/tri  (${n(p.texKB)} KB / ${n(p.tri)} tri)`);
}

/* ── POLY6 — o proxy de esfera não pode ser alcançável no caminho do BROWSER ─────
   Mede o mundo CONSTRUÍDO, nos três estados que importam. `fy_corrego` porque é o mapa com
   mais fauna (12 bichos: 10 pela classe FavelaAmbience, que é o mesmo código de todos os
   17 mapas, + os 2 proxies próprios do map_corrego.js). */
console.log('\nPOLY6 · proxy procedural de fauna alcançável no browser');
let estados = null;
try {
  const { THREE, initTextures } = await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')).href);
  const { buildCorrego } = await import(pathToFileURL(path.join(ROOT, 'public/js/map_corrego.js')).href);
  const { setFaunaRuntime, faunaProxyAllowed } = await import(pathToFileURL(path.join(ROOT, 'public/js/ambientlife.js')).href);
  const T = initTextures();
  const censo = () => {
    const cena = new THREE.Scene();
    const mundo = buildCorrego(cena, T);
    const bichos = [];
    ((mundo && mundo.root) || cena).traverse((o) => { if (o.userData?.fauna) bichos.push(o.userData.fauna); });
    return bichos;
  };
  estados = [];
  for (const [rotulo, env] of [
    ['node (arnês)', null],
    ['browser', { node: false, search: '' }],
    ['browser ?fauna=proxy', { node: false, search: '?fauna=proxy' }],
  ]) {
    setFaunaRuntime(env);
    estados.push({ rotulo, permitido: faunaProxyAllowed(), bichos: censo() });
  }
  setFaunaRuntime(null);
} catch (e) {
  erros.push(`POLY6: não consegui construir o mundo: ${e.message}`);
}
if (estados) {
  const [noNode, noBrowser, comSwitch] = estados;
  for (const e of estados) console.log(`      ${e.rotulo.padEnd(22)} proxy permitido=${String(e.permitido).padEnd(6)} fauna na cena: ${e.bichos.length}${e.bichos.length ? ` (${e.bichos.join(', ')})` : ''}`);
  /* 6a: no browser sem GLB, nenhum bicho. Cada sobrevivente é NOMINAL — é o que separa
     "o fail-closed do ambientlife funcionou" de "o mapa tem proxy próprio" (os 2 do
     map_corrego, que estão na DIVIDA). */
  for (const bicho of new Set(noBrowser.bichos)) {
    reprova('POLY6', `fy_corrego:${bicho}`, `proxy procedural de "${bicho}" NASCE no browser sem GLB — é boneco de esfera/cone (114-561 tri) no lugar de um GLB de 1.950-6.928. Conserto: passe o desenho pelo guarda \`faunaProxyAllowed()\` do ambientlife.js`);
  }
  // 6b: o kill-switch tem que devolver o proxy, senão não existe A/B pra olhar os dois lados.
  if (comSwitch.bichos.length <= noBrowser.bichos.length) reprova('POLY6', 'kill-switch', `\`?fauna=proxy\` não devolveu o proxy (${comSwitch.bichos.length} vs ${noBrowser.bichos.length} sem ele) — sem kill-switch não há A/B, e um fail-closed que ninguém consegue desligar é o próximo mistério`);
  // 6c: em node o proxy CONTINUA — régua que perde a fauna perde o censo dela.
  if (noNode.bichos.length < comSwitch.bichos.length) reprova('POLY6', 'censo-node', `o arnês perdeu fauna (${noNode.bichos.length} contra ${comSwitch.bichos.length} com o proxy ligado) — o fail-closed vazou para node, onde NENHUM GLB carrega por desenho, e as réguas de fauna (corrego-contract-check) passariam a medir mapa vazio`);
}

/* ── VEREDITO ──────────────────────────────────────────────────────────────────── */
for (const e of erros) reprova('POLY0', 'medicao', `NÃO SEI MEDIR — ${e}`);
const dividas = [], falhas = [];
for (const v of vermelhos) {
  if (DIVIDA[v.chave]) { dividas.push(v); usadas.add(v.chave); } else falhas.push(v);
}
const quitadas = Object.keys(DIVIDA).filter((k) => !usadas.has(k));

console.log('\n═══ VEREDITO ═══');
if (falhas.length) {
  console.log(`\n${falhas.length} REPROVA(S) — fora da dívida declarada:`);
  for (const f of falhas) console.log(`  ✗ ${f.chave}  ${f.msg}`);
}
if (dividas.length) {
  console.log(`\n${dividas.length} DÍVIDA(S) DECLARADA(S) (13/09/2026 — avisam, não reprovam; fila em docs/maps/RELATORIO-LOWPOLY.md §4):`);
  for (const d of dividas) console.log(`  · ${d.chave}  ${DIVIDA[d.chave]}`);
}
if (avisos.length) {
  console.log(`\n${avisos.length} AVISO(S):`);
  for (const a of avisos) console.log(`  ⚠ ${a}`);
}
if (quitadas.length) {
  console.log(`\n${quitadas.length} QUITADA(S) — passaram, REMOVA a entrada de DIVIDA (dívida paga que continua declarada deixa de morder se o asset regredir):`);
  for (const q of quitadas) console.log(`  ✓ ${q}`);
}
const porClausula = (c) => vermelhos.filter((v) => v.clausula === c).length;
console.log(`\nresumo: POLY0 ${porClausula('POLY0')} · POLY1 ${porClausula('POLY1')} · POLY2 ${porClausula('POLY2')}`
  + ` · POLY3 ${porClausula('POLY3')} · POLY4 ${porClausula('POLY4')} · POLY5 ${avisos.filter((a) => a.startsWith('POLY5')).length} aviso(s)`
  + ` · POLY6 ${porClausula('POLY6')}   (${dividas.length} em dívida, ${falhas.length} reprovando)`);
console.log(falhas.length
  ? `\n✗ POLY  ${falhas.length} vermelho(s) fora da dívida declarada — asset abaixo do piso, acima do teto ou proxy de esfera na tela do jogador.`
  : `\n✓ POLY  nenhum vermelho fora da dívida declarada (${dividas.length} dívida(s) de 13/09/2026 pendentes).`);
process.exit(falhas.length ? 1 : 0);
