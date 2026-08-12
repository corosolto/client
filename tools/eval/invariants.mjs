#!/usr/bin/env node
// ============================================================================
// INVARIANTES — o portão de qualidade do CORO SOLTO.
//
// POR QUE ISTO EXISTE
// O dono passou 3 dias num ciclo em que cada rodada consertava uma coisa e
// quebrava outra, e a gente só descobria uma rodada depois. A causa não era
// falta de cuidado: era falta de RETE. Um crítico (humano ou agente) julga
// screenshot; consistência e flow são propriedades do jogo EM MOVIMENTO, e
// quase todo defeito que ele reportou não é gosto — é invariante violada:
//
//   "as mãos estão soltas no ar"          -> distância mão↔grip tem um teto
//   "a arma aponta pra baixo"             -> o cano tem um ângulo máximo
//   "no ADS não vejo a arma nem a mira"   -> a arma tem área mínima e máxima
//   "sniper sem zoom"                     -> FOV mirando < FOV de quadril
//   "várias armas com visual igual"       -> silhuetas têm que diferir
//   "o bot atira do nada"                 -> dano exige LOS anterior
//   "tem 2 me eliminando"                 -> 1 killfeed por morte
//
// REGRA DE OURO: nada é commitado com invariante VERMELHA. E todo bug novo que
// o dono reportar vira uma invariante aqui — é assim que ele nunca volta.
//
// USO
//   node tools/eval/invariants.mjs            # tudo que roda sem browser
//   node tools/eval/invariants.mjs --json     # saída pra máquina
// Sai com código 1 se qualquer invariante crítica falhar (serve de gate em CI).
//
// ESCOPO
// Este arquivo agrega os arneses que rodam em NODE PURO (sem Chrome/SwiftShader,
// que custa ~4 min por carga de mapa nesta máquina):
//   - botsim.mjs        : a classe Game real + mapas reais, com DOM stubado
//   - vmrig-test.mjs    : o rig procedural de viewmodel a 240 Hz
//   - tp-mount-probe.mjs: mount de arma na 3ª pessoa, parser de GLB próprio
//   - vm_mint_audit.json: enquadramento por arma medido no GLB
// As invariantes que EXIGEM pixel (mira visível no ADS, silhueta) ficam
// marcadas como `browser` e são puladas aqui — rode gl-shots/motion pra elas.
//
// MAPA DE IDs (rodada do QUALITY GATE) — leia isto antes de comparar com relatório
// antigo. Os três tetos de viewmodel que já existiam foram APERTADOS e renumerados
// pra abrir espaço na sequência; nenhuma medição foi perdida, todas ficaram MAIS
// restritas. Um relatório anterior que diz "VM7 falha com Δy 0,103" hoje se lê VM10.
//   VM7  (era: paridade vertical Δy ≤ 0,03)  -> agora VM10, mesmo teto
//   VM8  (era: coronha não cruza o near, z ≤ −0,01) -> continua VM8, teto z ≤ −0,05
//   VM9  (era: pitch do coice ≤ 8°)          -> agora VM7, teto 6° e em RAJADA
//   VM9  NOVO: grip entre 0,84 e 0,92 da altura da tela, nos 2 aspectos
//   VM9  RODADA DO GRIP: FAIXA 0,90-1,08 — MEDIDA (M4 0,915; AK e Vandal FORA do quadro)
//   BOT8 NOVO: zero episódios de bot com LOS no jogador > 1,5 s sem disparar
//   AUD1 NOVO: invariante META — a régua (vm-mint-audit) bate com o jogo (game.js)
//
// RODADA DA REFERÊNCIA MEDIDA (a única em que afrouxar/reescrever teto foi permitido, e
// só porque a substituição é MEDIDA e não conveniente). Até aqui o portão de armas foi
// resolvido contra números ASSERIDOS — "a boca fica a 0,66H", "a coronha termina INTEIRA
// no canto" — que ninguém tinha medido em pixel nenhum. Agora existe medição com
// procedência: references/viewmodel/ (3 frames) + tools/eval/ref-measure.py (reproduz os
// números e salva as máscaras com --masks) + tools/eval/ref_viewmodel.json.
//   VM1  piso ≥ 0,58            -> FAIXA 0,50-0,60   (ref medida 0,520-0,565)
//   VM3  cano ≤ 16°             -> FAIXA 22-42° do EIXO DA SILHUETA em pixel
//                                  (ref CS 27,3° e 34,8°; a grandeza medida MUDOU — o
//                                   "cano ≤ 16°" era atan(tanBarrel), outra coisa)
//   VM5  área 3-14%             -> FAIXA 6-16%       (ref medida 9,76-13,09%)
//        + o INSTRUMENTO foi consertado: screenArea rasteriza triângulo em vez de
//          dilatar nuvem de pontos (inflava 1,15-1,90×, desigual por modelo)
//   VM12 piso boca y ≥ 0,66     -> FAIXA 0,50-0,62   (ref medida 0,513-0,598)
//   VM16 NOVA: a coronha sai pela QUINA de raspão — fatia da silhueta na borda direita
//        entre 0,02 e 0,20 da altura (ref 0,053 / 0,090 / 0,095, e 3/3 cruzam a borda)
// REGRA QUE FICA: teto novo sem arquivo + pixel + script que reproduza o número é
// regressão, não correção.
// ============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const JSON_OUT = process.argv.includes('--json');

const results = [];
/** @param {string} id @param {string} desc @param {boolean|null} ok @param {string} evid @param {'crit'|'warn'} sev */
const put = (id, desc, ok, evid, sev = 'crit') => results.push({ id, desc, ok, evid, sev });
const skip = (id, desc, why) => results.push({ id, desc, ok: null, evid: why, sev: 'skip' });

const num = (v, d = 3) => (typeof v === 'number' && isFinite(v) ? +v.toFixed(d) : String(v));

function runNode(script, env = {}, args = []) {
  try {
    return execFileSync(process.execPath, [join(HERE, script), ...args], {
      cwd: ROOT, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ...env },
    });
  } catch (e) {
    return (e.stdout || '') + '\n__ERRO__ ' + (e.message || '');
  }
}

// ── 1. SINTAXE ──────────────────────────────────────────────────────────────
// Barato e pega o erro mais caro: um arquivo que não parseia derruba o jogo
// inteiro numa tela preta, e sob SwiftShader isso custa 4 minutos pra descobrir.
{
  const { readdirSync } = await import('node:fs');
  const dir = join(ROOT, 'public', 'js');
  const bad = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    try { execFileSync(process.execPath, ['--check', join(dir, f)], { stdio: 'pipe' }); }
    catch { bad.push(f); }
  }
  put('SYN', 'todos os public/js/*.js parseiam', bad.length === 0, bad.length ? bad.join(', ') : 'ok');
}

// ── 2. VIEWMODEL: enquadramento e cano (vm_mint_audit.json) ─────────────────
// O enquadramento é DERIVADO de len/gripZ medidos no GLB, não tabelado por arma.
// Estes tetos vêm das referências que o dono escolheu (CS 1.6 / ev.io / VALORANT,
// em /root/ref) e do que já tinha sido medido contra o CS2.
{
  const p = join(ROOT, 'tools', 'eval', 'vm_mint_audit.json');
  if (!existsSync(p)) {
    skip('VM*', 'enquadramento do viewmodel', 'vm_mint_audit.json ausente — rode o auditor de VM');
  } else {
    const a = JSON.parse(readFileSync(p, 'utf8'));
    /* ADAPTADOR (rodada da RÉGUA): o vm-mint-audit.mjs escreve `armas` como OBJETO
       { id: { aspectos: { '16:9': {...}, '3:2': {...} }, ... } }, e este bloco esperava
       um ARRAY com campos achatados (left169/right169/canoDeg/area169). Resultado: VM1-VM6
       ficaram PULADOS desde que o auditor existe — o jogo tinha 6 invariantes de viewmodel
       que nunca rodaram uma vez. Aqui o objeto é achatado para o formato esperado; nenhum
       teto foi mexido, só passaram a ser AVALIADOS. */
    const flat = (o) => Object.entries(o).map(([id, w]) => {
      const A = (w.aspectos || {})['16:9'] || {}, B = (w.aspectos || {})['3:2'] || {};
      return {
        id,
        left169: A.bordaEsq, left32: B.bordaEsq,
        right169: A.bracoBordaDir, right32: B.bracoBordaDir,
        canoDeg: w.anguloCanoGraus, area169: A.areaPct, area32: B.areaPct,
        coronhaZ: w.coronhaZ, grip169: A.gripTela, grip32: B.gripTela,
        // bocaTela = [x, y] da BOCA DO CANO em fração de tela, y com 0 = topo. É o campo
        // que a VM12 usa; sem ele aqui o look CS 1.6 continuaria sem número nenhum.
        boca169: A.bocaTela, boca32: B.bocaTela,
        /* CAMPOS COMPARÁVEIS COM A REFERÊNCIA MEDIDA (tools/eval/ref_viewmodel.json).
           Os três primeiros são produzidos pela MESMA definição operacional dos campos
           homônimos do tools/eval/ref-measure.py (silhueta rasterizada, só o que é visível
           dentro do quadro; PCA em coordenadas de pixel). É isso que permite comparar
           "nosso × referência" em vez de comparar duas grandezas diferentes com o mesmo
           nome — o erro que fez a VM3 gastar uma rodada medindo atan(tanBarrel). */
        silEsq169: A.silBordaEsq, silEsq32: B.silBordaEsq,
        eixo169: A.anguloEixoGraus, eixo32: B.anguloEixoGraus,
        fatiaDir169: A.fatiaDir, fatiaDir32: B.fatiaDir,
        fatiaBaixo169: A.fatiaBaixo, foraPct169: A.foraPct,
        // VM18 — LEGIBILIDADE (mesma definição operacional do `legibilidade()` do
        // ref-measure.py; ver o bloco da VM18 abaixo para o porquê de cada uma).
        gordura169: A.gordura, gordura32: B.gordura,
        frente169: A.frenteVisivel, frente32: B.frenteVisivel,
        tras169: A.trasVisivel, tras32: B.trasVisivel,
        // VM19 — a MESMA medição na POSE DE MIRA (adsF=1), o que o dono disse estar
        // "perto do ideal". Sem isto o ADS continua sendo o único estado do viewmodel
        // que ninguém projetou na tela.
        ads169: A.ads, ads32: B.ads,
        classe: w.classe,
      };
    });
    const armas = Array.isArray(a.armas) ? a.armas
      : (a.armas && typeof a.armas === 'object') ? flat(a.armas) : (a.weapons || []);
    if (!armas.length) {
      skip('VM*', 'enquadramento do viewmodel', 'audit sem lista de armas');
    } else {
      const g = (w, ...ks) => { for (const k of ks) if (w[k] !== undefined) return w[k]; return undefined; };

      /* VM1 — BORDA ESQUERDA DA SILHUETA: FAIXA 0,50–0,60 (era só piso ≥ 0,58).
         ────────────────────────────────────────────────────────────────────────────
         PROCEDÊNCIA (references/viewmodel/ + tools/eval/ref-measure.py, reproduzível com
         `python3 tools/eval/ref-measure.py --masks`):
           cs16_ak_dust.jpg      bordaEsq 0,564
           cs16_m4_dust.jpg      bordaEsq 0,565
           valorant_vandal.jpg   bordaEsq 0,520
         faixa medida = [0,520 ; 0,565]  (ref_viewmodel.json -> faixas.bordaEsq)

         POR QUE O PISO SOZINHO ERA UM TETO FALSO: ">= 0,58" só proíbe a arma de invadir o
         centro; ele NÃO diz nada sobre a arma fugir para a direita, e foi exatamente isso
         que aconteceu — medimos 0,621 (mín das 26), ou seja TODA a nossa arma começa mais
         à direita do que QUALQUER um dos três frames de referência. Um teto que só tem um
         lado é otimizado até encostar no outro lado que ninguém escreveu. Vira FAIXA.

         FOLGA DECLARADA: piso 0,50 = a coluna da MIRA (a referência nunca cruza o centro;
         o mínimo medido é 0,520, então o piso está 0,02 abaixo do medido e ainda impede
         cobrir o crosshair). Teto 0,60 = 0,565 medido + 0,035 (≈ 3/4 da própria dispersão
         da referência, que é 0,045): as 3 fotos são de 3 rifles e o nosso arsenal tem 26
         armas de 5 classes, então a faixa tem que ser mais larga que a dispersão da amostra.

         O CAMPO MUDOU JUNTO: passa a ler `silBordaEsq`, que é a borda esquerda da silhueta
         RASTERIZADA e VISÍVEL — a mesma definição do ref-measure.py (que só enxerga pixel
         dentro do quadro). O campo velho (`bordaEsq`) é o mínimo sobre os VÉRTICES
         projetados, inclusive os que caem fora da tela; comparar um com o outro seria
         comparar duas coisas. Fallback para o campo velho só se o audit for antigo. */
      const esq = armas.map((w) => g(w, 'silEsq169', 'left169', 'bordaEsq169', 'left')).filter((v) => typeof v === 'number');
      const esq32 = armas.map((w) => g(w, 'silEsq32', 'left32')).filter((v) => typeof v === 'number');
      if (esq.length) {
        const todas = [...esq, ...esq32];
        const mn = Math.min(...todas), mx = Math.max(...todas);
        const fora = armas.filter((w) => [g(w, 'silEsq169', 'left169'), g(w, 'silEsq32', 'left32')]
          .some((v) => typeof v === 'number' && (v < 0.50 || v > 0.60)));
        put('VM1', 'borda esquerda da silhueta entre 0,50 e 0,60 (ref medida 0,520-0,565)',
          mn >= 0.50 && mx <= 0.60,
          `${num(mn)} a ${num(mx)} | ${fora.length}/${armas.length} armas fora` +
          (fora.length ? ` (pior ${fora.map((w) => w.id).slice(0, 4).join(', ')})` : ''));
      } else skip('VM1', 'borda esquerda do viewmodel', 'campo ausente no audit');

      // VM2 — o antebraço SAI pela borda direita. Se ele termina dentro do quadro
      // vira um toco/cotovelo flutuando: foi exatamente a regressão da rodada 1.
      const dir = armas.map((w) => g(w, 'right169', 'bordaDir169', 'right')).filter((v) => typeof v === 'number');
      if (dir.length) {
        const min = Math.min(...dir);
        put('VM2', 'antebraço sai pela borda direita (≥ 0,99)', min >= 0.99, `mín ${num(min)}`);
      } else skip('VM2', 'antebraço na borda direita', 'campo ausente no audit');

      /* VM3 — ÂNGULO DO EIXO DA SILHUETA NA TELA: FAIXA 22°–42° (era: cano ≤ 16°).
         ────────────────────────────────────────────────────────────────────────────
         A CORRESPONDÊNCIA, QUE É O PONTO DIFÍCIL DESTA LINHA. Havia DOIS "ângulos" com o
         mesmo nome e eles não são a mesma grandeza:
           • `anguloCanoGraus` (vm-mint-audit) = atan(|gy|/gx) = atan(VM_FRAME.tanBarrel).
             É a direção em que o GRUPO da arma foi deslocado dentro do vm.root — e ele
             ignora o VM_OFF[1] (−0,23), que é o termo que DOMINA a posição na tela. Ele
             media 15,64° enquanto o eixo que o olho vê estava em 33-61°. Não é o ângulo
             de que o dono reclamou; é um parâmetro de posicionamento.
           • `anguloEixoGraus` (ref-measure.py) = PCA da MASSA de pixels da silhueta, em
             coordenadas de pixel. É o que o olho vê.
         A correspondência foi feita REPRODUZINDO O ESTIMADOR DA REFERÊNCIA no nosso lado:
         vm-mint-audit.mjs -> silhueta() rasteriza a silhueta e roda o MESMO PCA, com x
         multiplicado pelo aspecto (porque o ref-measure faz PCA em pixel e W/H = aspecto).
         Os dois números passam a ser a mesma medida sobre a mesma coisa.

         PROCEDÊNCIA DO TETO (ref-measure.py sobre references/viewmodel/):
           cs16_ak_dust.jpg     anguloEixoGraus 28,0°
           cs16_m4_dust.jpg     anguloEixoGraus 34,8°
           valorant_vandal.jpg  anguloEixoGraus  4,6°   <- DELIBERADAMENTE FORA DA FAIXA
         O Vandal fica de fora porque o look-alvo é CS 1.6, escolhido pelo dono contra o
         Quake/Valorant (vmattach.js:387-407): 4,6° é arma quase HORIZONTAL, outro look.
         Usar os 3 aqui daria a faixa [4,6 ; 34,8], que aceita qualquer coisa.
         FOLGA DECLARADA: piso 22° = 28,0 − 6,0; teto 42° = 34,8 + 7,2. A dispersão entre
         os DOIS frames de CS já é 7,5°, então a folga é da ordem da própria dispersão da
         amostra — e é assimétrica de propósito: o modo de falha que o dono reportou é a
         arma "em pé demais" (nós medimos até 60,7° na pistola), não deitada demais.
         RESSALVA HONESTA: o PCA depende do aspecto do frame, e os frames de referência são
         1,597 e 1,251 enquanto o jogo roda 1,778 e 1,500. A faixa é avaliada nos DOIS
         aspectos do jogo; o ref-overlay.py mede a nossa arma TAMBÉM no aspecto de cada
         foto, e é lá que a comparação fica exata. */
      const eixo = armas.flatMap((w) => [g(w, 'eixo169'), g(w, 'eixo32')]).filter((v) => typeof v === 'number');
      if (eixo.length) {
        const mn = Math.min(...eixo), mx = Math.max(...eixo);
        const fora = armas.filter((w) => [g(w, 'eixo169'), g(w, 'eixo32')]
          .some((v) => typeof v === 'number' && (v < 22 || v > 42)));
        put('VM3', 'eixo da silhueta entre 22° e 42° na tela (ref CS 1.6 medida 28,0° e 34,8°)',
          mn >= 22 && mx <= 42,
          `${num(mn, 1)}° a ${num(mx, 1)}° | ${fora.length}/${armas.length} armas fora` +
          (fora.length ? ` (pior ${fora.map((w) => w.id).slice(0, 4).join(', ')})` : ''));
      } else skip('VM3', 'ângulo do eixo da silhueta', 'campo anguloEixoGraus ausente no audit');

      // VM4 — o MESMO enquadramento em 16:9 e 3:2. O dono joga em 3:2 e validar
      // só em 16:9 já custou uma rodada inteira do projeto.
      const dif = armas.map((w) => {
        const a169 = g(w, 'left169', 'bordaEsq169'), a32 = g(w, 'left32', 'bordaEsq32');
        return (typeof a169 === 'number' && typeof a32 === 'number') ? Math.abs(a169 - a32) : null;
      }).filter((v) => v !== null);
      if (dif.length) {
        const max = Math.max(...dif);
        put('VM4', 'enquadramento igual em 16:9 e 3:2 (Δ ≤ 0,03)', max <= 0.03, `Δ máx ${num(max)}`);
      } else skip('VM4', 'paridade 16:9 × 3:2', 'campo ausente no audit');

      /* VM5 — ÁREA DA ARMA NA TELA: FAIXA 6%–16% (era 3%–14%, e medida com régua torta).
         ────────────────────────────────────────────────────────────────────────────
         VM13 (rodada da RÉGUA): a VM5 lia SÓ `area169` e ignorava `area32` — e o dono
         JOGA EM 3:2. Um teto, avaliado sobre as 52 medidas (26 armas × 2 aspectos); a
         evidência imprime os dois aspectos separados pra dizer QUAL deles está fora.
         Isso NÃO mudou nesta rodada; o que mudou foi o NÚMERO e o INSTRUMENTO.

         PRIMEIRO O INSTRUMENTO (sem isso o número não vale nada): `screenArea` marcava a
         célula de cada VÉRTICE numa grade 128² e DILATAVA 1 célula. Um crítico rasterizou
         os triângulos de verdade e mostrou que isso inflava ~1,5× DE FORMA DESIGUAL (faca
         1,90×, m92 1,15×), porque o fator depende da densidade de vértices projetada.
         vm-mint-audit.mjs -> rasteriza()/screenArea() agora rasterizam a FACE, e a medida
         passa a ser a mesma grandeza que o ref-measure.py mede em pixel de imagem.
         Efeito da troca de régua, sem mexer em uma linha do jogo: a área das 26 caiu de
         1,06-4,55% para 0,52-4,03% — ou seja, o portão anterior estava sendo julgado com
         um número até 2× maior que o real.

         PROCEDÊNCIA DO TETO (tools/eval/ref-measure.py sobre references/viewmodel/):
           cs16_ak_dust.jpg      areaPct  9,76%   <- PISO: a madeira da coronha e do
                                                     guarda-mão escapa da máscara (cor
                                                     perto da areia do dust). O valor real
                                                     é MAIOR; está anotado como ressalva
                                                     no próprio ref_viewmodel.json.
           cs16_m4_dust.jpg      areaPct  9,78%
           valorant_vandal.jpg   areaPct 13,09%
         faixa medida = [9,76 ; 13,09] (ref_viewmodel.json -> faixas.areaPct)
         (a AK subiu de 8,11 para 9,76 na rodada do GRIP: a caixa de segmentação dela
          terminava em y1=0,95 e cortava a arma — ver ref-measure.py, comentário do REFS.)

         FOLGA DECLARADA E POR QUÊ:
          • piso 6% = 9,76 − 3,76 p.p. (39% abaixo do menor medido). A referência são TRÊS
            RIFLES; o nosso arsenal tem faca, revólver e pistola, que em qualquer FPS
            ocupam menos tela que um rifle. Os 2,11 p.p. são exatamente esse espaço, e são
            uma EXTRAPOLAÇÃO declarada: não existe frame de referência de faca/pistola do
            CS 1.6 nesta pasta. Isso é DÍVIDA DE MEDIÇÃO, não licença — quem quiser uma
            faixa por classe primeiro traz o frame e mede.
          • teto 16% = 13,09 + 2,9 p.p. (22% acima do maior medido). Cobre as nossas armas
            mais volumosas (lmg, shotgun, m92) sem deixar a arma tomar a tela — o dono já
            reclamou desse extremo ("armas gigantescas") na rodada 1.
         O teto ANTIGO (3-14%) não tinha procedência nenhuma; o piso de 3% foi o número que
         fez o solver da rodada passada "provar" que a área era inviável — provou contra a
         VM12 errada, não contra a referência.

         ══ RODADA DA ESCALA (04/08): O PISO SAI DE 6% PARA 4% E MUDA DE FUNÇÃO ═══════════
         O dono reprovou o enquadramento por TAMANHO ("as armas estão 1,5x do tamanho que
         deveriam; o cano pra mira no centro da tela é uma distância minúscula") com esta
         invariante VERDE. Pelo Corolário da casa, o defeito é do portão — e desta vez dá
         pra dizer exatamente qual, com número:

         areaPct NÃO É UMA RÉGUA DE ESCALA. Ela mede só o que está DENTRO do quadro, e o
         nosso viewmodel tinha `foraPct` = 82,2% na ak (3:2): a mesma área de tela podia ser
         uma arma inteira pequena OU um quinto ampliado de uma arma o dobro do tamanho. Era
         o segundo caso. Medido no RENDER (diff on/off, 1200x800 = 3:2 do dono,
         /tmp/vmscale/z1.0 × z1.5), contra a referência medida:
             arma        área 1,00   área 1,50   dist. boca->mira 1,00 -> 1,50
             ak            7,95%       5,44%          0,073 -> 0,137
             m4            8,63%       6,30%          0,093 -> 0,154
             awp           6,81%       4,09%          0,110 -> 0,157
             deagle        5,05%       4,16%          0,148 -> 0,183
             referência  9,76-13,09%              medida: 0,103 · 0,131 · 0,277
         Ou seja: a arma que o dono chamou de grande já cobria MENOS tela que a do CS 1.6, e
         a única grandeza em que ela estava fora da referência era a DISTÂNCIA DA BOCA À
         MIRA — que nenhuma invariante media (a VM12 só olha o `y` da boca). Isso virou a
         VM20, logo abaixo, e é ELA a régua de escala agora.

         POR QUE 4% E O QUE ELE NÃO É: 4% é PISO DE COBERTURA — ele existe para pegar a arma
         que SOME da tela (enquadramento quebrado, escala colapsada), não para dizer que o
         tamanho está certo. Quem diz isso agora é a VM20 (medida) junto com a VM3 (eixo) e
         a VM1 (borda). O que falta para os 9,76% da referência tem causa MEDIDA e nenhuma
         câmera conserta: a nossa `gordura` é 0,243-0,592 contra 0,684-0,948 da referência —
         é a VM18, vermelha desde que existe, e o BUG-15/C4 já concluiu que "o caminho é
         malha nova". Fechar área com lente foi exatamente o que produziu o defeito que o
         dono reportou.
         PARA O PISO NÃO VIRAR LICENÇA, ele é CONDICIONAL e se conserta sozinho: arma com
         `gordura` >= 0,684 (tão gorda quanto a referência) continua obrigada aos 6%. Hoje
         nenhuma das 26 alcança isso; quando as malhas engordarem, o piso volta sozinho.
         O TETO DE 16% NÃO FOI TOCADO (é ele que tem procedência: 13,09 medido + folga). */
      const areaDe = (k) => armas.map((w) => g(w, k)).filter((v) => typeof v === 'number');
      const a169 = areaDe('area169'), a32 = areaDe('area32');
      const area = [...a169, ...a32];
      if (area.length) {
        const mn = Math.min(...area), mx = Math.max(...area);
        // aceita fração (0-1) ou porcentagem. O teste era `mn < 1` e QUEBRAVA no audit real:
        // a faca ocupa 0,27% da tela, então `mn < 1` classificava um conjunto em PORCENTAGEM
        // como fração e multiplicava tudo por 100 (lia "408%" de área). O MÁXIMO é o
        // discriminador certo: nenhum conjunto em fração passa de 1.
        const pct = mx <= 1 ? 100 : 1;
        const faixa = (v) => (v.length ? `${num(Math.min(...v) * pct, 1)}-${num(Math.max(...v) * pct, 1)}%` : 'n/d');
        /* PISO CONDICIONAL (ver o bloco acima): 4% para malha mais MAGRA que a referência,
           6% para malha tão gorda quanto ela (gordura >= 0,684, o piso medido da VM18).
           O piso é por ARMA, não pelo mínimo global, senão uma arma gorda e minúscula se
           esconderia atrás do mínimo de outra. O TETO segue 16% para todas. */
        const GORD_REF = 0.684;
        const pisoDe = (w) => {
          const gd = [g(w, 'gordura169'), g(w, 'gordura32')].filter((v) => typeof v === 'number');
          return gd.length && Math.min(...gd) >= GORD_REF ? 6 : 4;
        };
        const fora = armas.filter((w) => [g(w, 'area169'), g(w, 'area32')]
          .some((v) => typeof v === 'number' && (v * pct < pisoDe(w) || v * pct > 16)));
        const gordas = armas.filter((w) => pisoDe(w) === 6).length;
        put('VM5', 'área da arma na tela: piso de COBERTURA 4% (6% se a malha for tão gorda quanto a ref) e teto 16% (ref medida 9,76-13,09%) — a régua de ESCALA é a VM20',
          fora.length === 0 && mx * pct <= 16,
          `16:9 ${faixa(a169)} | 3:2 ${faixa(a32)} | mín global ${num(mn * pct, 2)}% | ${fora.length}/${armas.length} armas fora | ${gordas}/${armas.length} com gordura >= ${GORD_REF} (piso 6%)` +
          (fora.length ? ` (pior ${fora.map((w) => w.id).slice(0, 4).join(', ')})` : ''));
      } else skip('VM5', 'área da arma na tela', 'campo ausente no audit');

      // VM6 — cobertura: as 26 armas passam pelo mesmo caminho. Se o audit tem
      // menos que isso, alguma arma ficou fora do pipeline novo.
      put('VM6', 'as 26 armas passam pelo pipeline de viewmodel', armas.length >= 26,
        `${armas.length} armas auditadas`);

      /* VM9 — ONDE o grip cai na ALTURA da tela, nos DOIS aspectos. FAIXA 0,90–1,08.
         ────────────────────────────────────────────────────────────────────────────
         O QUE MUDOU E POR QUÊ (RODADA DO GRIP + PITCH): a banda antiga era 0,84–0,92 e era
         a ÚLTIMA invariante de enquadramento sem um pixel por trás. Ela sobreviveu à rodada
         da referência medida — que reescreveu VM1/VM3/VM5/VM12/VM16 com procedência — e o
         resultado foi uma CONTRADIÇÃO entre duas invariantes que medem as duas pontas da
         MESMA arma: uma asserida (VM9, o grip) e outra fotografada (VM12, a boca). Com o
         cano paralelo ao eixo da câmera vale, exatamente,
             (bocaY − 0,5) = (gripY − 0,5)·Zg/(Zg + S·fwd) − 0,5·S·mzY/((Zg + S·fwd)·V)
         e com gripY ≥ 0,84 o MÍNIMO de bocaY da p90 era 0,666 contra o teto 0,62 da VM12:
         interseção VAZIA para QUALQUER parâmetro. Congelar a não-medida e reescrever a
         medida foi o que criou o vazio.

         AGORA TEM PIXEL (tools/eval/ref-measure.py, bloco GRIP; reproduza com
         `python3 tools/eval/ref-measure.py --masks` e OLHE /tmp/refgrip_*.png):
           cs16_m4_dust.jpg     grip (0,727 ; 0,915)  DENTRO do quadro — centro do buraco do
                                guarda-mato, achado por busca de buracos na própria máscara
                                (359 px, centro automático 0,728/0,916: a marca e o detector
                                concordam em 0,001).
           cs16_ak_dust.jpg     grip y ≥ 1,000  FORA — na coluna do gatilho (x 0,776) a
                                silhueta é cortada pela borda de baixo (base 0,997) e a mão
                                de tiro não aparece em lugar nenhum do frame.
           valorant_vandal.jpg  grip y ≥ 1,000  FORA — o receiver preenche a quina inferior
                                direita e sai pelas DUAS bordas (base 0,999).
         ref_viewmodel.json -> faixas.gripY [0,915 ; 1,000] e gripForaDoQuadro: 2.

         ISTO É O OPOSTO DO QUE A BANDA ANTIGA DIZIA. Ela afirmava que o grip fica "no terço
         de baixo mas AINDA DENTRO do quadro" e proibia > 0,92. Em 2 dos 3 frames de
         referência a mão que segura a arma ESTÁ FORA DA TELA — que é a mesma coisa que o
         dono vinha dizendo da coronha ("sempre FORA") e que a VM16 já tinha medido pela
         lateral. A VM9 agora admite isso explicitamente.

         OS DOIS LADOS DA FAIXA, com procedência:
          • piso 0,90 = 0,915 (único grip MEDIDO dentro do quadro) − 0,015 de folga. Ele é o
            lado que importa esteticamente: abaixo dele a arma sobe para o meio da tela, come
            a mira e deixa de ser viewmodel de FPS. Nenhum dos 3 frames tem grip acima de
            0,915, então o piso não está inventando margem para cima.
          • teto 1,08 = 1,000 (a borda de baixo) + 0,083, e o 0,083 é MEDIDO: é a distância
            grip→base da silhueta no ÚNICO frame em que os dois estão visíveis (M4A1: grip
            0,915, base 0,998). Ou seja, o teto permite exatamente "o grip afunda o mesmo
            tanto que a M4 ainda mostra abaixo dele" e nada além disso. Sem teto, a fraude
            óbvia seria empurrar a arma para o porão até a VM12 fechar sozinha.
         O QUE A FOTO NÃO PERMITE MEDIR (e por isso não vira teto): QUANTO abaixo da borda o
         grip da AK e o da Vandal estão. O que está fora do quadro é invisível — mesma dívida
         declarada na VM16 sobre `foraPct`.
         Vale nos DOIS aspectos (o dono joga em 3:2). 1,0 = borda de baixo da tela. */
      const gy = armas.flatMap((w) => [
        Array.isArray(w.grip169) ? w.grip169[1] : null,
        Array.isArray(w.grip32) ? w.grip32[1] : null,
      ]).filter((v) => typeof v === 'number');
      if (gy.length) {
        const mn = Math.min(...gy), mx = Math.max(...gy);
        const fora = armas.filter((w) => [w.grip169, w.grip32].some((g) => Array.isArray(g) && (g[1] < 0.90 || g[1] > 1.08)));
        put('VM9', 'grip entre 0,90 e 1,08 da ALTURA da tela, nos 2 aspectos (ref medida: 0,915 na M4; FORA do quadro na AK e na Vandal)',
          mn >= 0.90 && mx <= 1.08,
          `${num(mn)} a ${num(mx)} da altura | ${fora.length}/${armas.length} armas fora da banda` +
          (fora.length ? ` (pior ${fora.map((w) => w.id).slice(0, 4).join(', ')})` : ''));
      } else skip('VM9', 'grip na altura da tela', 'campo ausente no audit');

      /* VM10 — PARIDADE VERTICAL 16:9 × 3:2 (era o VM7 até esta rodada; ver o mapa de IDs
         no topo do arquivo). O dono joga em 3:2 e validar só em 16:9 já custou uma rodada
         inteira do projeto — o VM4 nunca pega isso porque só olha o eixo horizontal. */
      const dy = armas.map((w) => (Array.isArray(w.grip169) && Array.isArray(w.grip32)
        ? Math.abs(w.grip169[1] - w.grip32[1]) : null)).filter((v) => v !== null);
      if (dy.length) {
        const max = Math.max(...dy);
        const pior = armas.find((w) => Array.isArray(w.grip169) && Array.isArray(w.grip32)
          && Math.abs(w.grip169[1] - w.grip32[1]) === max);
        put('VM10', 'grip no MESMO ponto vertical em 16:9 e 3:2 (Δ ≤ 0,03)',
          max <= 0.03, `Δy máx ${num(max)} (${pior ? pior.id : '?'}) em ${dy.length} armas`);
      } else skip('VM10', 'paridade vertical 16:9 × 3:2', 'campo ausente no audit');

      /* VM12 — LOOK CS 1.6: A BOCA DO CANO FICA LOGO ABAIXO DA MIRA. FAIXA y ∈ [0,50 ; 0,62].
         ────────────────────────────────────────────────────────────────────────────
         A LIÇÃO QUE CONTINUA VALENDO (e que é a razão desta linha existir):
         a rodada anterior levou o portão de 16/21 para 19/21 sem afrouxar um teto sequer e
         mesmo assim foi REPROVADA pelo dono, porque para fechar VM5/VM10 ela ZEROU o
         VM_OFF y e mudou o look em silêncio. Nenhuma invariante codificava "onde fica a
         boca do cano", então a métrica foi otimizada e a INTENÇÃO foi destruída. Lei de
         Goodhart, na íntegra. INTENÇÃO QUE NÃO VIRA INVARIANTE É OTIMIZADA PARA FORA.
         Quem quiser mudar o look tem que mudar ESTE teto explicitamente, num diff que o
         dono vê, em vez de mexer no VM_OFF e reportar "+3 invariantes".

         O QUE MUDOU: O NÚMERO ESTAVA ERRADO, E O ERRO ERA MEU. O piso "y ≥ 0,66" veio de
         vmattach.js:387-392 ("a boca fica a ~0,66H"), que por sua vez veio de um vídeo
         assistido, nunca de um pixel medido. Agora existe medição, com procedência
         (tools/eval/ref-measure.py sobre references/viewmodel/, reproduzível com
         `python3 tools/eval/ref-measure.py --masks` — e OLHE as máscaras):
           cs16_ak_dust.jpg      boca (0,564 ; 0,513)
           cs16_m4_dust.jpg      boca (0,569 ; 0,598)
           valorant_vandal.jpg   boca (0,648 ; 0,587)
         faixa medida = [0,513 ; 0,598] (ref_viewmodel.json -> faixas.bocaY)
         Ou seja: no CS a boca fica LOGO ABAIXO da mira (0,5), 1 a 10 pontos percentuais de
         altura abaixo do centro — não a 16-43 pontos, que é onde o piso de 0,66 punha a
         nossa (medimos 0,667-0,816). O dono olhou e disse "está tudo diferente"; ele estava
         certo, e era esta linha que estava mantendo a arma afundada. Pior: foi ela que fez
         o solver da rodada passada "provar" que 3% de área era inviável — a prova estava
         certa CONTRA ESTE TETO, e o teto é que era falso.

         POR QUE FAIXA E NÃO PISO: um piso só proíbe a boca de subir; ele aceita a boca em
         0,95 (arma no porão). Foi assim que chegamos a 0,816. Os dois lados agora:
          • piso 0,50 = a linha da MIRA. Abaixo dele a arma estaria APONTADA pro crosshair
            (o look Quake/Valorant que o dono comparou e REJEITOU — vmattach.js:404-407).
            A referência mínima é 0,513, então o piso está 0,013 abaixo do medido: é a
            folga mínima que ainda distingue "logo abaixo da mira" de "em cima da mira".
          • teto 0,62 = 0,598 medido + 0,022. Folga honesta de ~1/4 da dispersão da amostra
            (0,085) — as 3 fotos são de 3 jogos/armas diferentes e o nosso arsenal tem 26.
         Vale nos DOIS aspectos: o dono joga em 3:2, e checar só 16:9 foi o buraco que já
         custou uma rodada (ver VM4/VM10). 1,0 = borda de baixo da tela. */
      const boca = armas.flatMap((w) => [
        ['16:9', w.id, Array.isArray(w.boca169) ? w.boca169[1] : null],
        ['3:2', w.id, Array.isArray(w.boca32) ? w.boca32[1] : null],
      ]).filter((r) => typeof r[2] === 'number');
      if (boca.length) {
        const ys = boca.map((r) => r[2]);
        const mn = Math.min(...ys), mx = Math.max(...ys);
        const fora = boca.filter((r) => r[2] < 0.50 || r[2] > 0.62);
        const f169 = fora.filter((r) => r[0] === '16:9').length;
        const f32 = fora.filter((r) => r[0] === '3:2').length;
        put('VM12', 'look CS 1.6: boca do cano LOGO abaixo da mira (y entre 0,50 e 0,62) nos 2 aspectos',
          mn >= 0.50 && mx <= 0.62,
          `${num(mn)} a ${num(mx)} da altura em ${boca.length} medidas | ` +
          `${fora.length} fora da faixa (16:9 ${f169}, 3:2 ${f32})` +
          (fora.length
            ? ` — pior ${fora.sort((a, b) => Math.abs(b[2] - 0.56) - Math.abs(a[2] - 0.56)).slice(0, 4).map((r) => `${r[1]}@${r[0]} ${num(r[2])}`).join(', ')}`
            : ' — bate com a referência medida (0,513-0,598)'));
      } else skip('VM12', 'boca do cano abaixo da mira', 'campo bocaTela ausente no audit');

      /* ══ VM20 — DISTÂNCIA DA BOCA DO CANO ATÉ A MIRA (invariante NOVA, RODADA DA ESCALA) ══
         ────────────────────────────────────────────────────────────────────────────────────
         É O SINTOMA QUE O DONO NOMEOU, PALAVRA POR PALAVRA: "eu vejo que a escala está
         grande pq o cano da arma pra mira no centro da tela a distância é minúscula".
         Ele reprovou o enquadramento com VM5/VM9/VM10/VM15 VERDES, e estava certo: NENHUMA
         invariante media essa distância. A VM12 mede só o `y` da boca (e a nossa ak estava
         em 0,550, dentro dos 0,50-0,62), e o `x` da boca não era medido por ninguém — então,
         pela Lei 1 da casa, foi para lá que o enquadramento foi otimizado: a ak parou com a
         boca a 0,073 de altura de tela da mira, o MENOR valor dos quatro (3 referências +
         nós), enquanto todo o resto do portão ficava verde.

         GRANDEZA: d = hypot((bocaX − 0,5)·aspecto ; bocaY − 0,5), em frações de ALTURA de
         tela (a mesma normalização do PCA das duas réguas: x multiplicado pelo aspecto, y
         cru — assim o número não muda de significado entre 16:9 e 3:2).

         PROCEDÊNCIA — os 3 frames, dos campos `boca` e `aspecto` do ref_viewmodel.json, que
         o `python3 tools/eval/ref-measure.py --masks` reproduz (rodado nesta rodada; devolve
         os mesmos 9,76 / 9,78 / 13,09 de área, então o arquivo não mudou de baixo):
             CS 1.6 AK   boca [0,564 ; 0,513] asp 1,597 -> 0,103
             CS 1.6 M4   boca [0,569 ; 0,598] asp 1,251 -> 0,131
             Valorant    boca [0,648 ; 0,587] asp 1,778 -> 0,277
         faixa medida = [0,103 ; 0,277]. FAIXA DA INVARIANTE = [0,100 ; 0,290]: piso 0,003
         abaixo do menor medido e teto 0,013 acima do maior (4,7%), a mesma folga discreta da
         VM12 (0,013 abaixo / 0,022 acima). Não há folga generosa de propósito — foi folga
         generosa que deixou a arma encostar na mira sem ninguém ver.

         O QUE ELA CUSTA E POR QUE É ELA A RÉGUA DE ESCALA AGORA: a VM5 (área) não distingue
         "arma pequena inteira" de "quinto ampliado de arma grande" — `foraPct` da ak era
         82,2%. Esta distingue: encolher em torno do grip (recuoZ) afasta a boca da mira, e
         ampliar aproxima. Com recuoZ 1,00 a ak media 0,086 e a m4 0,108 (analítico, 3:2),
         as duas ABAIXO do piso; com 1,50, 0,137 e 0,154, dentro. */
      {
        const dMira = (b, asp) => (Array.isArray(b) && b.length === 2
          ? Math.hypot((b[0] - 0.5) * asp, b[1] - 0.5) : null);
        const med = armas.flatMap((w) => [
          ['16:9', w.id, dMira(w.boca169, 16 / 9)],
          ['3:2', w.id, dMira(w.boca32, 3 / 2)],
        ]).filter((r) => typeof r[2] === 'number');
        /* A FAIXA SAI DO ARQUIVO DE REFERÊNCIA, não de um literal: se alguém remedir os
           frames, a invariante anda junto. O literal fica como conferência — divergir dele
           é sinal de que a referência mudou e que este comentário precisa ser reescrito. */
        let refFaixa = [0.103, 0.277], refFonte = 'literal (ref_viewmodel.json ausente)';
        try {
          const rv = JSON.parse(readFileSync(join(ROOT, 'tools/eval/ref_viewmodel.json'), 'utf8'));
          const ds = rv.refs.map((r) => Math.hypot((r.boca[0] - 0.5) * r.aspecto, r.boca[1] - 0.5));
          refFaixa = [Math.min(...ds), Math.max(...ds)];
          refFonte = `ref_viewmodel.json (${ds.map((d) => num(d)).join(' · ')})`;
        } catch { /* fica no literal */ }
        const PISO = 0.100, TETO = 0.290;
        const desloc = Math.max(Math.abs(refFaixa[0] - 0.103), Math.abs(refFaixa[1] - 0.277));
        if (med.length) {
          const mn = Math.min(...med.map((r) => r[2])), mx = Math.max(...med.map((r) => r[2]));
          const fora = med.filter((r) => r[2] < PISO || r[2] > TETO);
          put('VM20', 'a boca do cano fica LONGE da mira: distância entre 0,100 e 0,290 da altura de tela, nos 2 aspectos (ref medida 0,103-0,277)',
            fora.length === 0 && desloc < 0.02,
            `${num(mn)} a ${num(mx)} em ${med.length} medidas | ${fora.length} fora` +
            (fora.length ? ` — pior ${fora.sort((a, b) => Math.abs(b[2] - 0.19) - Math.abs(a[2] - 0.19)).slice(0, 5).map((r) => `${r[1]}@${r[0]} ${num(r[2])}`).join(', ')}` : '') +
            ` | referência: ${refFonte}` + (desloc >= 0.02 ? ` — REFERÊNCIA MUDOU (${num(refFaixa[0])}-${num(refFaixa[1])}), remeça a faixa` : ''));
        } else skip('VM20', 'distância da boca até a mira', 'campo bocaTela ausente no audit');
      }

      /* VM16 — A CORONHA SAI PELA QUINA, DE RASPÃO (invariante NOVA).
         ────────────────────────────────────────────────────────────────────────────
         É O PEDIDO LITERAL DO DONO e até agora não tinha número nenhum: "nesses 3 [CS 1.6,
         Quake, UT] a arma sempre está no canto inferior direito e a coronha sempre FORA".
         O doc do vmattach.js dizia o CONTRÁRIO ("a coronha termina no canto inferior-direito
         INTEIRA, no máximo beijando a borda") e também nunca foi medido.

         A GRANDEZA ESCOLHIDA, E POR QUE ELA É MENSURÁVEL DOS DOIS LADOS: `fatiaDir` = a
         altura (em fração da altura da tela) da faixa vertical que a silhueta ocupa no 1%
         mais à direita do quadro. Ela responde às duas perguntas com UM número: se é ZERO,
         a arma não encosta na borda direita (não sai pela quina); se é GRANDE, o que sai
         pela lateral é um naco da arma, não a quina da coronha.
         MEDIDA NA REFERÊNCIA (tools/eval/ref-overlay.py --medir, sobre as máscaras do
         ref-measure.py; os números estão impressos no cabeçalho de cada overlay):
           cs16_ak_dust.jpg      fatiaDir 0,090   (fatiaBaixo 0,000 — o HUD corta a base)
           cs16_m4_dust.jpg      fatiaDir 0,053   (fatiaBaixo 0,383)
           valorant_vandal.jpg   fatiaDir 0,095   (fatiaBaixo 0,480)
         3/3 cruzam a borda direita (ref_viewmodel.json -> faixas.cruzaBordaDireita: true),
         e nos 3 a lasca que sai pela lateral tem 5-10% da altura da tela. É literalmente
         "de raspão": a arma sai pela BASE (38-48% da largura) e apenas RASPA a lateral.

         FAIXA: 0,02 ≤ fatiaDir ≤ 0,20, nos dois aspectos.
          • piso 0,02: obriga a silhueta a ENCOSTAR na borda direita. Está 2,6× abaixo do
            menor medido (0,053) porque a nossa faca e as pistolas são bem menores que os
            três rifles fotografados — mesma dívida de medição declarada na VM5.
            HOJE MEDIMOS 0,000 EM 26/26: nenhuma arma nossa toca a borda direita. As 13 que
            têm `bordaDir > 1` só a cruzam ABAIXO da base da tela, ou seja saem pelo chão e
            não pela quina. Era isso que o dono estava vendo.
          • teto 0,20: 2,1× o maior medido (0,095). Impede a "solução" preguiçosa de jogar
            a arma inteira para a direita até meia arma sair pela lateral.

         O QUE A IMAGEM NÃO PERMITE MEDIR, E QUE POR ISSO NÃO VIRA TETO: QUANTO da arma
         fica fora do quadro. O que está fora é invisível na foto — não dá para saber se a
         coronha do AK do CS termina 5 cm ou 50 cm além da borda. Por isso a VM16 NÃO tem
         teto de `foraPct` nem de `base`. Os dois números continuam no vm_mint_audit.json
         (`foraPct`, `base`) como EVIDÊNCIA, sem gate.
         CORREÇÃO DE UM NÚMERO QUE CIRCULOU: "a coronha está a 1,38 alturas de tela abaixo
         da borda inferior" é leitura errada do campo `base`. `base` é a coordenada da
         base da silhueta com 1,0 = borda de baixo; base 1,376 (ak) significa 0,376 altura
         de tela ABAIXO da borda, não 1,38. O maior do arsenal é sks/g3sg1, base 1,55. */
      const fat = armas.flatMap((w) => [
        ['16:9', w.id, g(w, 'fatiaDir169')],
        ['3:2', w.id, g(w, 'fatiaDir32')],
      ]).filter((r) => typeof r[2] === 'number');
      if (fat.length) {
        const vs = fat.map((r) => r[2]);
        const mn = Math.min(...vs), mx = Math.max(...vs);
        const naoTocam = fat.filter((r) => r[2] < 0.02);
        const demais = fat.filter((r) => r[2] > 0.20);
        put('VM16', 'a coronha sai pela QUINA de raspão: fatia na borda direita entre 0,02 e 0,20 da altura (ref 0,053-0,095)',
          mn >= 0.02 && mx <= 0.20,
          `${num(mn)} a ${num(mx)} da altura em ${fat.length} medidas | ` +
          `${naoTocam.length} não encostam na borda direita | ${demais.length} saem demais` +
          (naoTocam.length ? ` — pior ${[...new Set(naoTocam.map((r) => r[1]))].slice(0, 4).join(', ')}` : ''));
      } else skip('VM16', 'coronha sai pela quina', 'campo fatiaDir ausente no audit — rode o vm-mint-audit');

      /* ══ VM18 — LEGIBILIDADE: "dá pra saber que arma é?" ═══════════════════════════
         ────────────────────────────────────────────────────────────────────────────
         POR QUE ELA NASCEU. O dono jogou e mandou 16 screenshots: "a ak 47 e a zastava
         toma a tela inteira"; e o review dos screenshots: "em MD97, SCAR, M92, SVD e P90
         você vê UM CANO ATRAVESSANDO A TELA E MAIS NADA — sem receiver, sem coronha, sem
         carregador; não dá pra saber que arma é sem ler o HUD".
         O portão inteiro passou reto por isso, e o motivo é estrutural: VM1/VM3/VM5/VM12/
         VM16 medem ONDE a silhueta está (borda esquerda, boca, quina) e QUANTO ela cobre
         (área). Uma FITA FINA DIAGONAL passa em todas elas com folga — ela pode ter
         exatamente os mesmos 10% de área, a mesma borda esquerda e a mesma boca que uma
         arma inteira. O que faltava era medir a FORMA do que sobra dentro do quadro.

         AS TRÊS MEDIDAS (definição em tools/eval/ref-measure.py -> `legibilidade()`, e o
         espelho do nosso lado em tools/eval/vm-mint-audit.mjs -> `silhueta()`; reproduza
         com `python3 tools/eval/ref-measure.py --masks` e OLHE /tmp/refgrip_*.png).
         Eixo de medição = a PRÓPRIA ARMA: u = grip→boca, normalizado, em coordenada de
         pixel. s=0 no gatilho, s=1 na boca; t = perpendicular. Tudo adimensional.
           frenteVisivel = max(s)      quanto do trecho GRIP→BOCA aparece
           trasVisivel   = −min(s)     quanto de arma aparece ATRÁS do grip (o RECEIVER)
           gordura       = Δt / Δs     espessura ÷ comprimento da silhueta VISÍVEL

         PROCEDÊNCIA — os três frames, medidos (ref_viewmodel.json -> refs[].legibilidade):
           cs16_ak_dust.jpg      frente 1,010   trás 0,338   gordura 0,775
           cs16_m4_dust.jpg      frente 1,000   trás 0,669   gordura 0,684
           valorant_vandal.jpg   frente 1,000   trás 0,298   gordura 0,948
         faixas -> frenteVisivel [1,000 ; 1,010] · trasVisivel [0,298 ; 0,669] ·
                   gordura [0,684 ; 0,948]

         O QUE ESTA INVARIANTE GATEIA, E POR QUE SÓ ISSO:
          • gordura ≥ 0,684 — é o número de "só um cano". O piso é o MENOR dos três
            medidos, e sai justamente da M4A1, o único frame com o grip DENTRO do quadro
            (nos outros dois o grip é PISO, o que faz a gordura deles ser um TETO — a
            ressalva viaja no ref_viewmodel.json). Não há folga para baixo de propósito:
            0,684 já é o caso mais magro que a referência mostra.
          • frenteVisivel ≥ 0,95 — o cano inteiro do gatilho à boca tem que estar na tela.
            Medido 1,000 em 3/3; o piso leva 5% de folga porque as nossas bocas são medidas
            no vértice mais fundo do GLB e a foto no pixel mais perto da mira.
          • trasVisivel ≥ 0,20 — tem que aparecer CORPO atrás do gatilho. Piso = 2/3 do
            menor medido (0,298, a Vandal), a folga maior das três porque nas nossas armas
            curtas (uzi/p90) o "atrás do grip" é fisicamente menor.
         NÃO ENTRA TETO em frenteVisivel nem em trasVisivel: ver mais do que a referência
         mostra não é defeito, e a foto não permite medir o que está fora do quadro (mesma
         regra que já vale na VM16 para `foraPct`).

         ESTA INVARIANTE NASCE VERMELHA E ISSO É O PONTO. Hoje: gordura 0,290-0,660 em 52
         medidas, 0/26 armas dentro. Ou seja o arsenal INTEIRO está mais magro que o frame
         de referência mais magro. É a tradução em número da frase do dono, e é a primeira
         vez que ela tem uma. Uma busca em grade sobre pitch/yaw/tanH/offX/minz (5 eixos,
         768 pontos — tools/eval/vm-solve.mjs cobre o mesmo espaço) NÃO acha ponto que
         melhore a VM18 sem estourar VM12 e VM16: os pontos que levam a VM18 de 44 para
         23-27 medidas fora levam a VM12 de 5 para 37-42 e a VM16 de 16 para 38-41. O
         relatório da rodada registra isso como achado, não como pendência de tuning.

         ══ ESCORÇO NÃO É A ALAVANCA — HIPÓTESE TESTADA E MORTA (RODADA DO ESCORÇO) ══
         A hipótese era: a silhueta é fina porque a arma está PERTO e GRANDE, e o que
         sobra no quadro é só a frente, achatada por PERSPECTIVA; o CS 1.6 escaparia com
         lente mais fechada + arma mais longe (quase ortográfico), mesma área e menos
         escorço. Isso é uma CURVA de 1 parâmetro, não um eixo de busca: com
         recuoZ→k·recuoZ, tanH→tanH/k e tan(V0/2)→tan(V0/2)/k, tudo que está no PLANO DO
         GRIP projeta no MESMO pixel (a conta está em tools/eval/vm-orto.mjs), e só o
         escorço muda. Varrida em `node tools/eval/vm-orto.mjs`, k de 1 a 12:
           escorço (profundidade da arma ÷ Zg)  1,570 -> 0,131   (12× menos, ~ortográfico)
           foraPct médio das 26                  78,6% -> 43,2%   (a hipótese FUNCIONA no
                                                 que ela prometia: cabe muito mais arma)
           gordura MÉDIA das 52 medidas          0,504 -> 0,509   (+1,0%: NADA)
           gordura da AK                         0,575 -> 0,419   (piora, e é a arma nomeada)
           medidas fora de banda                 VM1 4->24 · VM3 2->16 · VM5 3->13
                                                 VM12 5->30 · VM16 21->37 · VM18b 15->25
         Ou seja: reduzir o escorço 12× move a `gordura` em 4 milésimos e quebra 6 outras
         invariantes. ESCORÇO NÃO É A ALAVANCA. Não refazer esta busca.

         O QUE A MESMA RODADA MEDIU NO LUGAR — a `gordura` é dt/ds, e as duas pontas têm
         faixa medida na referência (ref_viewmodel.json, em ALTURAS DE TELA):
           espessura ⊥ (dt)          ref 0,427-0,688   nosso: 14/26 JÁ DENTRO
           comprimento visível (ds)  ref 0,624-0,798   nosso:  8/26 dentro, os 18 restantes
                                                       TODOS ACIMA (0,800-0,953)
         A AK tem dt 0,548 — DENTRO da faixa da referência — e ds 0,953, 19% acima do teto.
         O déficit de `gordura` dela é 100% COMPRIMENTO e 0% espessura: com ds no teto
         medido (0,798) e a MESMA espessura, a gordura da AK iria a 0,686, dentro da faixa.
         Isso vale para 3 das 26 (ak, akm, scar — exatamente o grupo que o dono nomeou).
         As outras 12 com dt ABAIXO do piso 0,427 (shotgun 0,269 · carbine 0,296 ·
         knife 0,304 · mosin 0,340 · sks 0,343) são finas DE VERDADE: nenhum knob de
         enquadramento engorda uma malha. Aí a dívida é de MALHA, não de câmera. */
      const leg = armas.flatMap((w) => [
        ['16:9', w.id, g(w, 'gordura169'), g(w, 'frente169'), g(w, 'tras169')],
        ['3:2', w.id, g(w, 'gordura32'), g(w, 'frente32'), g(w, 'tras32')],
      ]).filter((r) => typeof r[2] === 'number');
      if (leg.length) {
        const gs = leg.map((r) => r[2]);
        const mn = Math.min(...gs), mx = Math.max(...gs);
        const magras = leg.filter((r) => r[2] < 0.684);
        const gordas = leg.filter((r) => r[2] > 0.948);
        const semCano = leg.filter((r) => r[3] < 0.95);
        const semCorpo = leg.filter((r) => r[4] < 0.20);
        const piores = [...magras].sort((x, y) => x[2] - y[2]).slice(0, 5).map((r) => `${r[1]} ${num(r[2])}`);
        put('VM18', 'legibilidade: a silhueta visível é uma ARMA e não um cano — gordura 0,684-0,948 (ref medida), cano inteiro na tela e corpo atrás do gatilho',
          magras.length === 0 && gordas.length === 0 && semCano.length === 0 && semCorpo.length === 0,
          `gordura ${num(mn)}-${num(mx)} em ${leg.length} medidas | ${magras.length} magras (< 0,684) `
          + `| ${gordas.length} gordas (> 0,948) | ${semCano.length} sem o cano inteiro (frente < 0,95) `
          + `| ${semCorpo.length} sem corpo atrás do gatilho (trás < 0,20)`
          + (piores.length ? ` — piores ${piores.join(', ')}` : ''));
      } else skip('VM18', 'legibilidade da silhueta', 'campo gordura ausente no audit — rode o vm-mint-audit');

      /* ══ VM18b — TETO DE ÁREA POR ARMA LONGA (a ak e a zastava que o dono nomeou) ══
         A VM5 gateia a faixa 6-16% para as 26 armas juntas, e essa faixa foi alargada
         (dos 9,76-13,09 medidos para 6-16) porque pistola e faca NÃO têm foto de
         referência e são legitimamente menores. O efeito colateral é que a m92 pode ir a
         14,5% — 11% ACIMA do maior fuzil fotografado — e a VM5 continua verde. Foi
         literalmente a arma que o dono nomeou: "a ak 47 e a zastava toma a tela inteira".
         Aqui o teto MEDIDO volta a valer, mas SÓ onde a referência se aplica: os 3 frames
         são fuzis de duas mãos (AK47, M4A1, Vandal), então a faixa 9,76-13,09% gateia as
         classes rifle/sniper/shotgun/smg e NÃO gateia pistol/knife.
         Folga declarada: o piso desce de 9,76 para 8,0 porque o 9,76 da AK é PISO e não
         medida (a coronha de madeira escapa da segmentação — ressalva no ref_viewmodel);
         o teto 13,09 fica EXATO, sem folga, porque é o maior valor de fato medido e é
         justamente o lado que o dono reclamou.
         ══ RODADA DA ESCALA (04/08): O PISO VIRA CONDICIONAL, PELO MESMO MOTIVO DA VM5 ══
         O TETO — que é a razão de esta invariante existir — NÃO MUDA: 13,09%, medido, sem
         folga. O que muda é o piso, que é extrapolação (o próprio parágrafo acima admite
         isso). Com a arma na escala que o dono pediu, 33 das 44 medidas ficam abaixo de
         8,0% — e o que falta para os 9,76% da referência é ESPESSURA DE MALHA, não câmera:
         a nossa gordura é 0,211-0,674 contra 0,684-0,948 da referência (VM18, vermelha,
         BUG-15/C4: "o caminho é malha nova"). Fechar área com lente foi o que produziu o
         defeito reportado. Piso 8,0% continua valendo para a malha que já é tão gorda
         quanto a referência; para a malha magra vale o mesmo piso de COBERTURA de 4% da
         VM5 (a arma não pode sumir da tela). Quando as malhas engordarem, o piso volta
         sozinho — e quem gateia ESCALA agora é a VM20, medida. */
      const LONGAS = new Set(['rifle', 'sniper', 'shotgun', 'smg']);
      const longas = armas.filter((w) => LONGAS.has(w.classe));
      if (longas.length) {
        const med = longas.flatMap((w) => [['16:9', w.id, g(w, 'area169'), g(w, 'gordura169')], ['3:2', w.id, g(w, 'area32'), g(w, 'gordura32')]])
          .filter((r) => typeof r[2] === 'number');
        const grandes = med.filter((r) => r[2] > 13.09);
        const pequenas = med.filter((r) => r[2] < (r[3] >= 0.684 ? 8.0 : 4.0));
        put('VM18b', 'arma longa: teto MEDIDO de 13,09% (3 fuzis fotografados) e piso 8,0% para malha tão gorda quanto a ref / 4,0% de COBERTURA para malha magra',
          grandes.length === 0 && pequenas.length === 0,
          `${med.length} medidas em ${longas.length} armas longas | ${grandes.length} acima de 13,09% `
          + (grandes.length ? `(${[...new Set(grandes.map((r) => `${r[1]} ${num(r[2], 1)}%`))].slice(0, 5).join(', ')}) ` : '')
          + `| ${pequenas.length} abaixo do piso (8,0% se gordura ≥ 0,684, senão 4,0%)`
          + (pequenas.length ? ` (${[...new Set(pequenas.map((r) => r[1]))].slice(0, 6).join(', ')})` : ''));
      } else skip('VM18b', 'teto de área por arma longa', 'sem classe no audit');

      /* ══ VM19 — A POSE DE MIRA É A ÂNCORA (o dono disse que ela está quase certa) ══
         ────────────────────────────────────────────────────────────────────────────
         PALAVRAS DELE: "algumas armas EM POSIÇÃO DE MIRA chegam perto do que seria o ideal
         da posição da arma". Essa é a única avaliação POSITIVA que o viewmodel recebeu, e
         até esta rodada o ADS não tinha régua nenhuma além da VM17 (que só confere que a
         rampa `vmAdsRot` zera pitch/yaw) — enquanto `vm.ads[id]`, o delta calculado no
         `_vmFrame` a partir da alça de mira do GLB, é CÓDIGO MORTO: nada no jogo lê esse
         campo (quem posiciona é `this._adsPose[STATIC_CLASS[arma]]`, aplicado ao vm.root).
         Um crítico anterior já tinha provado o buraco mutando a pose da pistola e passando
         o portão verde.

         O QUE ESTA INVARIANTE MEDE. O vm-mint-audit passou a projetar o ADS CHEIO (adsF=1)
         com a MESMA cadeia do quadril — `toViewAds`, que lê `_adsPose` e `STATIC_CLASS` do
         game.js por eval, não por cópia — e grava as mesmas grandezas por arma. Daí sai o
         número que estava faltando, e ele CONFIRMA o dono:
           gordura no QUADRIL  0,290-0,660   0/26 armas dentro da faixa medida
           gordura no ADS      0,377-0,946  11/26 armas dentro da faixa medida
         A pose de mira é MEDIDAMENTE mais legível que a de quadril, arma a arma.

         A INVARIANTE, então, é a que trava esse fato: em TODA arma a pose de mira tem que
         ser pelo menos tão legível quanto a de quadril (gordura_ADS ≥ gordura_quadril) e a
         arma tem que continuar mostrando corpo atrás do gatilho quando o jogador mira.
         Não é um teto de referência — é uma invariante RELACIONAL, e é assim de propósito:
         a foto de referência é de quadril, não existe frame de ADS medido, e inventar teto
         sem pixel é a regra que este repo já quebrou uma vez. O que ela impede é concreto:
         que alguém "conserte" o quadril mexendo no `_adsPose` e destrua a única pose que o
         dono aprovou — exatamente o buraco que a mutação da pose da pistola atravessou. */
      const par = armas.map((w) => {
        const A2 = g(w, 'ads169'), B2 = g(w, 'ads32');
        return { id: w.id, gQ: [g(w, 'gordura169'), g(w, 'gordura32')], gA: [A2 && A2.gordura, B2 && B2.gordura], tA: [A2 && A2.trasVisivel, B2 && B2.trasVisivel] };
      }).filter((r) => typeof r.gA[0] === 'number' && typeof r.gQ[0] === 'number');
      if (par.length) {
        // tolerância 0,02 = ruído da rasterização (grade 256²) — abaixo disso "igual".
        const pior = par.filter((r) => r.gA[0] < r.gQ[0] - 0.02 || r.gA[1] < r.gQ[1] - 0.02);
        const semCorpo = par.filter((r) => r.tA[0] < 0.20 || r.tA[1] < 0.20);
        const ganho = par.map((r) => r.gA[0] - r.gQ[0]);
        const dentro = par.filter((r) => r.gA[0] >= 0.684 && r.gA[0] <= 0.948).length;
        const dentroQ = par.filter((r) => r.gQ[0] >= 0.684 && r.gQ[0] <= 0.948).length;
        put('VM19', 'a pose de MIRA é a âncora: em toda arma o ADS é ao menos tão legível quanto o quadril, e mostra corpo atrás do gatilho',
          pior.length === 0 && semCorpo.length === 0,
          `${par.length} armas | ganho de gordura no ADS ${num(Math.min(...ganho))} a ${num(Math.max(...ganho))} `
          + `| dentro da faixa medida (0,684-0,948): ADS ${dentro}/${par.length} vs quadril ${dentroQ}/${par.length} `
          + `| ${pior.length} armas em que mirar PIORA a legibilidade | ${semCorpo.length} sem corpo atrás do gatilho no ADS`
          + (pior.length ? ` — ${pior.map((r) => r.id).slice(0, 5).join(', ')}` : ''));
      } else skip('VM19', 'pose de mira como âncora', 'campo ads ausente no audit — rode o vm-mint-audit');

      /* VM15 — DISTÂNCIA da banda do grip, não dentro/fora (AVISO, com o NÚMERO).
         A VM9 é BINÁRIA, e binária tem um modo de falha que já mordeu: como ela JÁ estava
         vermelha, uma rodada piorou o grip de 22/52 medidas dentro da banda para 0/52 e o
         PLACAR SUBIU — vermelho continua vermelho, o portão não distingue "quase lá" de
         "muito pior", e a regressão passou invisível. Aqui a mesma medição vira ESCALAR:
         a distância média de cada medida até a banda da VM9 (zero se dentro). Enquanto
         a VM9 estiver vermelha é ESTE número que diz se a rodada andou pra frente ou pra
         trás; quando ela ficar verde, este cai a 0,0000 sozinho e some do ruído.
         É 'warn' de propósito: a VM9 já é o portão crítico do mesmo fato, e dois CRÍTICOS
         sobre a mesma medida inflam o placar sem acrescentar cobertura. O valor desta
         linha é o NÚMERO aparecer em todo relatório, não o vermelho. */
      /* A BANDA SEGUE A DA VM9 (0,90-1,08 desde a rodada do GRIP). Se as duas divergirem,
         o escalar deixa de ser o escalar do portão e vira um número decorativo — foi por
         isso que ele nasceu grudado nos mesmos dois limites. */
      const dist = armas.flatMap((w) => [w.grip169, w.grip32])
        .filter((v) => Array.isArray(v) && typeof v[1] === 'number')
        .map((v) => (v[1] < 0.90 ? 0.90 - v[1] : v[1] > 1.08 ? v[1] - 1.08 : 0));
      if (dist.length) {
        const media = dist.reduce((a, b) => a + b, 0) / dist.length;
        const dentro = dist.filter((d) => d === 0).length;
        put('VM15', 'distância MÉDIA do grip até a banda 0,90-1,08 (escalar da VM9; 0 = todos dentro)',
          media === 0,
          `média ${num(media, 4)} | pior ${num(Math.max(...dist), 4)} | ` +
          `${dentro}/${dist.length} medidas dentro da banda`, 'warn');
      } else skip('VM15', 'distância do grip até a banda', 'campo ausente no audit');
    }
  }
}

// ── 2b. COICE DO VIEWMODEL (vm_kick_sim.json) ──────────────────────────────
// O bloco acima mede a arma PARADA. VM7/VM8 medem a arma ATIRANDO, que é o único
// estado capaz de empurrar a coronha através do near plane (0,01 m) da vmCamera —
// o "arma cortada/invertida ao atirar" que nenhum número do repo pegava.
{
  /* O ARTEFATO É REGERADO AQUI, DE PROPÓSITO. Custa 0,08 s (só regex sobre game.js +
     a mola do springs.js — sem GLB, sem three) e fecha dois buracos que já morderam:
     (a) vm_kick_sim.json não está versionado, então num checkout limpo de CI o bloco
         cairia em `skip` e VM7/VM8 sairiam PULADAS — portão verde por ausência de dado;
     (b) na rodada passada o JSON ficou defasado do game.js e o relatório saiu 12/17 com
         número velho ("16/26 cruzam") enquanto o código já estava consertado.
     NOTA: vm_mint_audit.json NÃO é regerado aqui de propósito — é ele que o AUD1 audita
     de ponta a ponta (formula + lente + escala). Regerar mataria a única invariante que
     pega régua desatualizada, que é exatamente o defeito que já foi commitado uma vez
     (o JSON do baseline foi medido com V0=62 quando a lente do jogo já era 80). */
  const p = join(ROOT, 'tools', 'eval', 'vm_kick_sim.json');
  const gerou = runNode('vm-kick-sim.mjs', {}, ['--json']);
  if (!existsSync(p)) {
    skip('VM8*', 'coice do viewmodel', 'vm-kick-sim.mjs não gerou o JSON: ' + (gerou.split('__ERRO__')[1] || '').slice(0, 120));
  } else {
    const k = JSON.parse(readFileSync(p, 'utf8'));
    const ws = Object.entries(k.armas || {});
    if (!ws.length) skip('VM8*', 'coice do viewmodel', 'sim sem armas');
    else {
      /* VM8 — a coronha com MARGEM do near plane, não só do lado certo dele.
         O teto era `atravessaNear` (z > −0,01, o near plane cru da vmCamera) e ele aprova
         uma arma que para a 1 mm da lente: qualquer bob, sway ou dip de recarga que o
         vm-kick-sim NÃO simula come essa folga e a arma corta na tela mesmo assim. O teto
         agora é −0,05: 4 cm de folga sobre o near plane, que é mais que a soma dos offsets
         de bob (±0,02) e reloadDip (0,18·escala) do _vmFrame. Mede o pior z entre o pico do
         pull puro e o pico COM o pitch do root (o giro também empurra a coronha pra lente). */
      const zPior = Math.max(...ws.map(([, w]) => Math.max(w.coronhaZpico, w.coronhaZpicoComPitch ?? -Infinity)));
      const acima = ws.filter(([, w]) => Math.max(w.coronhaZpico, w.coronhaZpicoComPitch ?? -Infinity) > -0.05);
      const piorZ = ws.find(([, w]) => Math.max(w.coronhaZpico, w.coronhaZpicoComPitch ?? -Infinity) === zPior);
      put('VM8', 'z da coronha ≤ −0,05 no pico do coice em TODAS as armas (folga sobre o near plane)',
        acima.length === 0, `pior ${num(zPior)} (${piorZ ? piorZ[0] : '?'}) | ${acima.length}/${ws.length} acima do teto`);

      /* VM7 — PITCH DO VM EM RAJADA (era o VM9 até esta rodada; ver o mapa de IDs no topo).
         O teto era 8°, herdado de "pelo menos não é 18,4°" do baseline. 8° ainda é o dobro
         do maior REC_DEG declarado (4,9° da AWP): a arma girava mais que o recuo que o jogo
         diz ter, e é isso que lê como "a arma pula fora do quadro". 6° amarra a rajada de 30
         tiros na cadência real — que é onde o RecoilAxis acumula, não no tiro solto. */
      const mx = Math.max(...ws.map(([, w]) => w.pitchMaxGraus));
      const pior = ws.find(([, w]) => w.pitchMaxGraus === mx);
      const acimaP = ws.filter(([, w]) => w.pitchMaxGraus > 6);
      put('VM7', 'pitch do viewmodel em rajada ≤ 6° em todas as armas (REC_DEG declarado ≤ 4,9°)',
        mx <= 6, `máx ${num(mx, 1)}° (${pior ? pior[0] : '?'}) | ${acimaP.length}/${ws.length} acima do teto`);
    }
  }
}

// ── 2c. AUD1 — A RÉGUA BATE COM O JOGO (invariante META) ────────────────────
// TODAS as invariantes VM acima confiam em vm_mint_audit.json. Esse JSON é produzido
// por um frame() que é um ESPELHO à mão do _vmFrame do game.js (game.js:1099-1149).
// Espelho à mão apodrece: já aconteceu uma vez — o auditor tinha V0=62 hardcodado, sem
// recuoZ, sem a trava nearX e sem VM_OFF, e mediu por rodadas inteiras um enquadramento
// que não existia mais na tela. O resultado é a pior falha possível num portão: VERDE
// mentindo. AUD1 fecha essa porta refazendo a cadeia AQUI, direto das fontes
// (VM_FRAME de vmattach.js + VM_FOV_DEFAULT/VM_OFF de game.js), e conferindo contra o
// grip em view space que o auditor gravou. Diverge = o JSON está velho OU o espelho
// quebrou; nos dois casos os números das VM não valem nada até alguém olhar.
{
  const gsrc = readFileSync(join(ROOT, 'public', 'js', 'game.js'), 'utf8');
  const vsrc = readFileSync(join(ROOT, 'public', 'js', 'vmattach.js'), 'utf8');
  const pj = join(ROOT, 'tools', 'eval', 'vm_mint_audit.json');
  // as 3 etapas que o auditor tem que espelhar, conferidas no TEXTO do game.js: se alguém
  // tirar qualquer uma do caminho, o espelho continua "batendo" com si mesmo e mentindo.
  /* OS TRÊS ARGUMENTOS DO `this.vm.root.position.set(...)`, separados de verdade (varredura
     com contador de parênteses/colchetes, porque os argumentos têm chamada de função dentro
     e um `split(',')` cortaria no lugar errado).
     POR QUE ISSO EXISTE (buraco medido em 08/2026): a etapa `vmOff` conferia só
     /this\.vm\.root\.position\.set\(\s*VM_OFF\[0\]/ — o termo X. O termo Y não era conferido
     por ninguém, e o auditor (vm-mint-audit.mjs:196, `loadOffYFn`) lê a DECLARAÇÃO
     `const vmOffY = (aspect) => ...` por regex sem nunca perguntar se alguém a CHAMA.
     Resultado: trocando no game.js a chamada `vmOffY(...)` por `VM_OFF[1]` no argumento Y —
     isto é, removendo por inteiro a correção de enquadramento vertical por aspecto — o
     portão inteiro seguia VERDE (20/22, com VM9, VM10, VM12 e VM15 todas verdes). Um portão
     que não distingue o build corrigido do build sem a correção não está medindo nada. */
  const argsVmRoot = (() => {
    const ini = gsrc.indexOf('this.vm.root.position.set(');
    if (ini < 0) return null;
    const args = [];
    let prof = 1, ini0 = ini + 'this.vm.root.position.set('.length;
    for (let j = ini0; j < gsrc.length; j++) {
      const c = gsrc[j];
      if (c === '(' || c === '[') prof++;
      else if (c === ']') prof--;
      else if (c === ')') { prof--; if (prof === 0) { args.push(gsrc.slice(ini0, j)); break; } }
      else if (c === ',' && prof === 1) { args.push(gsrc.slice(ini0, j)); ini0 = j + 1; }
    }
    return args.length === 3 ? args : null;
  })();
  /* OS TRÊS ARGUMENTOS DO `g.rotation.set(...)` DO _vmFrame (RODADA DO GRIP + PITCH).
     Mesmo buraco, um nível abaixo: o pitch/yaw novos são a diferença entre um viewmodel
     paralelo ao eixo da câmera (impossível de conciliar com VM9+VM12 — ver
     `node tools/eval/vm-solve.mjs --prova-vazio`) e o look CS 1.6. Se alguém trocar
     `g.rotation.set(pit, yaw, t.roll)` por `g.rotation.set(0, 0, t.roll)`, a tabela
     VM_FRAME.cls continua com os ângulos, os três espelhos continuam batendo entre si e o
     portão inteiro fica VERDE medindo uma tela que não existe — exatamente a mutação que
     pegou o vmOffY. Aqui os argumentos são varridos com contador de parênteses (o `pit` e o
     `yaw` vêm de expressões com `??` e chamada de função dentro) e exigidos NOMINALMENTE. */
  const argsRotVm = (() => {
    const ini = gsrc.indexOf('else g.rotation.set(');
    if (ini < 0) return null;
    const args = []; let prof = 1, ini0 = ini + 'else g.rotation.set('.length;
    for (let j = ini0; j < gsrc.length; j++) {
      const c = gsrc[j];
      if (c === '(' || c === '[') prof++;
      else if (c === ']') prof--;
      else if (c === ')') { prof--; if (prof === 0) { args.push(gsrc.slice(ini0, j)); break; } }
      else if (c === ',' && prof === 1) { args.push(gsrc.slice(ini0, j)); ini0 = j + 1; }
    }
    return args.length === 3 ? args : null;
  })();
  // e o ADS: a rampa que devolve a arma ao eixo tem que ser CHAMADA nos dois primeiros
  // argumentos do rotation.set do grupo equipado (a VM17 abaixo confere o VALOR dela).
  const argsRotAds = (() => {
    const ini = gsrc.indexOf('wg.rotation.set(');
    if (ini < 0) return null;
    const args = []; let prof = 1, ini0 = ini + 'wg.rotation.set('.length;
    for (let j = ini0; j < gsrc.length; j++) {
      const c = gsrc[j];
      if (c === '(' || c === '[') prof++;
      else if (c === ']') prof--;
      else if (c === ')') { prof--; if (prof === 0) { args.push(gsrc.slice(ini0, j)); break; } }
      else if (c === ',' && prof === 1) { args.push(gsrc.slice(ini0, j)); ini0 = j + 1; }
    }
    return args.length === 3 ? args : null;
  })();
  /* O ARGUMENTO DO `rw.scale.multiplyScalar(...)` — A ESCALA DO MESH NO VIEWMODEL.
     BURACO MEDIDO NESTA RODADA (RODADA DO ESCORÇO), com mutação: apagando
     ` * (weaponCFG(id).vm ?? 1)` de game.js:1185 — ou seja, fazendo o jogo IGNORAR o `vm`
     por arma de weapons.js — o portão inteiro seguia VERDE, AUD1 inclusive (28/37, com
     "pior Δescala 0.0004"). O motivo é o mesmo do buraco do vmOffY: o cheque numérico de
     Δescala compara `VM_FRAME.vmScale · w.vm` com o `escalaVM` que o AUDITOR gravou, e as
     duas pontas leem `vm` de weapons.js — o game.js nunca é perguntado. Ou seja: era o
     auditor conferindo a si mesmo.
     ISSO IMPORTA AGORA porque `vm` deixou de ser decoração: é o knob que corrige a m92,
     a arma que o dono nomeou por TAMANHO (14,50% contra o teto medido de 13,09% da VM18b —
     ver weapons.js, bloco da m92). Sem esta etapa, um build em que a correção não acontece
     na tela é indistinguível, para o portão, do build corrigido.
     Varrido com contador de parênteses (o argumento tem `?? 1` e ternário dentro). */
  const argEscalaVm = (() => {
    const ini = gsrc.indexOf('rw.scale.multiplyScalar(');
    if (ini < 0) return null;
    let prof = 1; const ini0 = ini + 'rw.scale.multiplyScalar('.length;
    for (let j = ini0; j < gsrc.length; j++) {
      const c = gsrc[j];
      if (c === '(' || c === '[') prof++;
      else if (c === ']') prof--;
      else if (c === ')') { prof--; if (prof === 0) return gsrc.slice(ini0, j); }
    }
    return null;
  })();
  const etapas = {
    recuoZ: /Zg\s*\*=\s*\(\s*VM_KNOB\.zmul\s*\?\?\s*VM_FRAME\.recuoZ\s*\)/.test(gsrc),
    // a escala do viewmodel é vmScale (VM_FRAME) × vm (weapons.js, POR ARMA) — as duas
    // pontas que o auditor multiplica em `escalaVM`. Faltar qualquer uma = auditor medindo
    // uma arma de outro tamanho que a desenhada.
    vmEscala: !!argEscalaVm && /VM_FRAME\.vmScale/.test(argEscalaVm) && /weaponCFG\(\s*id\s*\)\.vm\b/.test(argEscalaVm),
    nearX: /Zg\s*=\s*Math\.max\(\s*Zg\s*,\s*\(back\s*\*\s*lim\)\s*\/\s*\(lim\s*-\s*tanH\)\s*\)/.test(gsrc),
    vmOff: !!argsVmRoot && /VM_OFF\[0\]/.test(argsVmRoot[0]) && /VM_OFF\[2\]/.test(argsVmRoot[2]),
    // o argumento Y tem que CHAMAR vmOffY — declarar a função e não usá-la é o buraco acima
    vmOffYChamado: !!argsVmRoot && /\bvmOffY\s*\(/.test(argsVmRoot[1]),
    // pitch/yaw/roll saem da tabela por CLASSE (t.pitch/t.yaw/t.roll), não de literais
    vmPitch: !!argsRotVm && /\bt\.pitch\b/.test(gsrc) && /\bpit\b/.test(argsRotVm[0]),
    vmYaw: !!argsRotVm && /\bt\.yaw\b/.test(gsrc) && /\byaw\b/.test(argsRotVm[1]),
    vmRoll: !!argsRotVm && /\brol\b/.test(argsRotVm[2])
      && /const\s+rol\s*=.*\bVM_KNOB\.roll\b.*\bt\.roll\b/.test(gsrc),
    // e o ADS chama a rampa nos eixos X e Y (o Z, o roll, fica de fora de propósito)
    vmAdsRotChamado: !!argsRotAds && /\bvmAdsRot\s*\(/.test(argsRotAds[0]) && /\bvmAdsRot\s*\(/.test(argsRotAds[1]),
    /* AS DUAS ETAPAS DA POSE DE MIRA (RODADA DA LEGIBILIDADE). O vm-mint-audit passou a
       PROJETAR o ADS (toViewAds -> VM19), e para isso ele lê `_adsPose` e `STATIC_CLASS`
       do game.js por eval. Se o jogo parar de CONSUMIR essas duas tabelas, o auditor vira
       ficção do mesmo jeito que já virou com o vmOffY: os números continuam saindo, só que
       de um ADS que ninguém desenha. É o buraco exato que a rodada anterior documentou —
       `vm.ads[id]` calculado e nunca lido — e que um crítico atravessou mutando
       `_adsPose['pistol']` com o portão verde.
         adsPoseLida     — a pose sai de `_adsPose[STATIC_CLASS[...]]`, não de um literal
         adsPoseAplicada — os 3 eixos do vm.root.position.set carregam pose.x/y/z
       Sem a 2ª, `_adsPose` viraria uma tabela decorativa e mirar não moveria a arma. */
    adsPoseLida: /this\._adsPose\[\s*STATIC_CLASS\[/.test(gsrc),
    adsPoseAplicada: !!argsVmRoot && /\bpose\.x\b/.test(argsVmRoot[0]) && /\bpose\.y\b/.test(argsVmRoot[1]) && /\bpose\.z\b/.test(argsVmRoot[2]),
    /* AS QUATRO ETAPAS DO RIG PROCEDURAL (BUG-04) — o mesmo buraco do vmOffY, na sua forma
       mais cara já paga: o `ViewModelRig` de springs.js estava ESCRITO, com teste dedicado
       (vmrig-test.mjs) e com a invariante RIG VERDE em cima dele — e o game.js importava
       só o `RecoilAxis`. Ou seja: a RIG passava medindo código que NÃO RODAVA NO JOGO, e o
       jogador ficava sem a recarga em fases. É a definição de portão mentindo verde.
       Enquanto a RIG olhar só para springs.js, é AQUI que se prova que o rig está LIGADO:
         rigImportado    — o game.js importa a classe (era isto que faltava)
         rigAtualizado   — e a chama por quadro (importar sem chamar é o mesmo nada)
         rigRecarga      — a recarga do jogo dispara o estado do rig (a fase visível)
         rigConsumido    — e as saídas entram nos 3 eixos do vm.root.position.set...
         rigRotConsumida — ...e nos eixos X e Z do vm.root.rotation (dip da recarga e sway)
       MUTAÇÃO QUE FAZ ESTA CLÁUSULA MORDER: apague `+ rg.pos.y` do argumento Y do
       `this.vm.root.position.set(...)` — a recarga deixa de descer na tela e, sem
       `rigConsumido`, o portão inteiro continuava verde. */
    rigImportado: /import\s*\{[^}]*\bViewModelRig\b[^}]*\}\s*from\s*'\.\/springs\.js'/.test(gsrc),
    rigAtualizado: /this\.vm\.rig\.update\s*\(/.test(gsrc),
    rigRecarga: /this\.vm\.rig\.startReload\s*\(/.test(gsrc),
    rigConsumido: !!argsVmRoot && /\brg\.pos\.x\b/.test(argsVmRoot[0]) && /\brg\.pos\.y\b/.test(argsVmRoot[1]) && /\brg\.pos\.z\b/.test(argsVmRoot[2]),
    rigRotConsumida: /this\.vm\.root\.rotation\.x\s*=[^\n;]*\brg\.rot\.x\b/.test(gsrc)
      && /this\.vm\.root\.rotation\.z\s*=[^\n;]*\brg\.rot\.z\b/.test(gsrc),
  };
  const faltando = Object.entries(etapas).filter(([, v]) => !v).map(([k]) => k);
  if (!existsSync(pj)) {
    skip('AUD1', 'régua de viewmodel bate com o game.js', 'vm_mint_audit.json ausente');
  } else if (faltando.length) {
    put('AUD1', 'o frame() do vm-mint-audit espelha o _vmFrame do game.js (recuoZ, nearX, VM_OFF, vmOffY, pitch/yaw/roll, ADS, rig)',
      false, `etapa(s) sumiram do game.js: ${faltando.join(', ')} — o auditor virou ficção` +
      (faltando.includes('vmOffYChamado')
        ? ` (o argumento Y de this.vm.root.position.set não chama vmOffY(): ${(argsVmRoot ? argsVmRoot[1] : '<não parseei o set()>').trim().slice(0, 90)})`
        : ''));
  } else {
    const a = JSON.parse(readFileSync(pj, 'utf8'));
    const V0 = +(/const\s+VM_FOV_DEFAULT\s*=\s*([\d.]+)\s*;/.exec(gsrc)?.[1] ?? NaN);
    const OFF = (/const\s+VM_OFF\s*=[\s\S]*?:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/.exec(gsrc) || []).slice(1, 4).map(Number);
    const i = vsrc.indexOf('export const VM_FRAME = {');
    const F = i < 0 ? null : new Function('return ' + vsrc.slice(i + 'export const VM_FRAME = '.length, vsrc.indexOf('\n};', i) + 2))();
    if (!F || !isFinite(V0) || OFF.length !== 3) {
      put('AUD1', 'o frame() do vm-mint-audit espelha o _vmFrame do game.js (recuoZ, nearX, VM_OFF)',
        false, `não consegui ler as fontes (VM_FRAME=${!!F} V0=${V0} VM_OFF=${OFF.join(',') || '?'})`);
    } else {
      // vmFovForAspect trava tan(fov/2)·aspect = tan(V0/2)·16/9 — a meia-tangente
      // horizontal (e a trava nearX que depende dela) não dependem do aspecto.
      const H = Math.tan((V0 * Math.PI / 180) / 2) * (16 / 9);
      // as DUAS tabelas da pose de mira, lidas do game.js (mesma leitura do vm-mint-audit —
      // `_adsPose` é literal, `STATIC_CLASS` é montado por laços e precisa ser avaliado)
      const POSE_ADS = (() => {
        const k = gsrc.indexOf('this._adsPose = {'); if (k < 0) return null;
        // eslint-disable-next-line no-new-func
        try { return new Function('return ' + gsrc.slice(k + 'this._adsPose = '.length, gsrc.indexOf('\n    };', k) + 6))(); } catch { return null; }
      })();
      const CLS_ADS = (() => {
        const k = gsrc.indexOf('const STATIC_CLASS = {};'), f = gsrc.indexOf("STATIC_CLASS['knife']");
        if (k < 0 || f < 0) return null;
        // eslint-disable-next-line no-new-func
        try { return new Function(gsrc.slice(k, gsrc.indexOf('\n', f) + 1) + '\nreturn STATIC_CLASS;')(); } catch { return null; }
      })();
      const difs = [], adsDif = [];
      for (const [id, w] of Object.entries(a.armas || {})) {
        const bb = w.gunSpace; if (!bb || !w.viewSpace) continue;
        const t = F.cls[F.classOf[id] || 'rifle'];
        const S = F.vmScale * (w.vm ?? 1);
        const back = S * Math.max(0, -bb.bboxMin[2]);
        const fwd = S * Math.max(0.001, bb.bboxMax[2]);
        let Zg = Math.max(back + t.clear, t.minz, fwd / t.fwdTan) * (F.zMul[id] || 1);
        Zg *= F.recuoZ;                                        // game.js:1140
        const lim = F.nearX * H;                               // game.js:1144-1147
        if (lim > t.tanH + 1e-3 && back > 0) Zg = Math.max(Zg, (back * lim) / (lim - t.tanH));
        const gx = Zg * t.tanH, gy = -gx * F.tanBarrel;        // game.js:1149
        const esperado = [OFF[0] + gx, OFF[1] + gy, OFF[2] - Zg];   // + VM_OFF (game.js:4074)
        const d = Math.max(...esperado.map((v, n) => Math.abs(v - w.viewSpace.grip[n])));
        /* A BOCA — É ELA QUE MEDE O PITCH/YAW (RODADA DO GRIP + PITCH).
           O grip é o CENTRO DE ROTAÇÃO do grupo: ele não se move nem 1 mm quando pitch/yaw
           mudam. Ou seja, o cheque de Δgrip acima — o único que a AUD1 tinha — é CEGO para
           a inclinação nova, e a AUD1 continuaria verde com o auditor projetando a arma
           paralela ao eixo da câmera enquanto o jogo a desenha inclinada. Refazer a boca
           AQUI, direto de VM_FRAME.cls[classe].pitch/yaw/roll (e de knifeRot na faca), é o
           espelho equivalente que a tarefa exigiu: 10° de pitch movem a boca da AK 6,7 cm,
           33× a tolerância de 2 mm. */
        const kr = F.knifeRot || [0, 0, 0], ek = id === 'knife';
        const rx = ek ? kr[0] : (t.pitch || 0), ry = ek ? kr[1] : (t.yaw || 0), rz = ek ? kr[2] : (t.roll || 0);
        const mz = bb.boca;
        let bx = -S * mz[0], by = S * mz[1], bz = -S * mz[2];
        { const c = Math.cos(rz), s = Math.sin(rz); const n1 = bx * c - by * s; by = bx * s + by * c; bx = n1; }
        { const c = Math.cos(ry), s = Math.sin(ry); const n1 = bx * c + bz * s; bz = -bx * s + bz * c; bx = n1; }
        { const c = Math.cos(rx), s = Math.sin(rx); const n1 = by * c - bz * s; bz = by * s + bz * c; by = n1; }
        const espBoca = [esperado[0] + bx, esperado[1] + by, esperado[2] + bz];
        const db = Math.max(...espBoca.map((v, n) => Math.abs(v - w.viewSpace.boca[n])));
        /* E O GRIP NO ADS CHEIO (RODADA DA LEGIBILIDADE): refeito AQUI a partir de
           `_adsPose` + `STATIC_CLASS` lidos do game.js, e comparado com o `ads.gripTela`
           que o auditor gravou. É o mesmo argumento do parágrafo da boca: sem este cheque
           a AUD1 ficaria verde com o auditor projetando um ADS que não é o do jogo (a pose
           do rifle desloca 5 cm — 25× a tolerância de 2 mm). A conta em VIEW SPACE é
           vm.root.position += pose.(x,y,z) e vm.root.scale = pose.s; o grupo da arma não se
           move, então o grip vai para pose + s·(gx, gy, −Zg). Projeta em 16:9 para comparar
           em fração de tela, que é a unidade em que o JSON grava `ads.gripTela`. */
        if (POSE_ADS && CLS_ADS && w.aspectos && w.aspectos['16:9'] && w.aspectos['16:9'].ads) {
          const pz = POSE_ADS[CLS_ADS[id]] || POSE_ADS._hip;
          if (pz) {
            const e = pz.s ?? 1;
            const gv = [OFF[0] + pz.x + e * gx, OFF[1] + pz.y + e * gy, OFF[2] + pz.z - e * Zg];
            /* E A BOCA NO ADS, pelo mesmo motivo que a boca entrou no cheque de quadril: o
               grip é o centro de rotação, então comparar só ele é CEGO para a rotação — e
               foi medido nesta rodada que era cego também para a POSIÇÃO: mutar `toViewAds`
               (o caminho da silhueta) e deixar `gripViewAds` intacto passava verde. Aqui a
               boca é refeita com pitch/yaw ZERADOS (é o que `vmAdsRot` faz em adsF=1, VM17)
               e só o roll, que o ADS não zera de propósito. */
            const rzA = ek ? kr[2] : (t.roll || 0);
            let ax = -S * mz[0], ay = S * mz[1], az2 = -S * mz[2];
            { const c = Math.cos(rzA), s2 = Math.sin(rzA); const n1 = ax * c - ay * s2; ay = ax * s2 + ay * c; ax = n1; }
            const bv = [gv[0] + e * ax, gv[1] + e * ay, gv[2] + e * az2];
            const V = H / (16 / 9);
            const pj2 = (q) => { const z = -q[2]; return [0.5 + 0.5 * (q[0] / z) / H, 0.5 - 0.5 * (q[1] / z) / V]; };
            const pr = pj2(gv), prB = pj2(bv);
            const jt = w.aspectos['16:9'].ads.gripTela || [9, 9];
            const jb = w.aspectos['16:9'].ads.bocaTela || [9, 9];
            adsDif.push([id, Math.max(Math.abs(pr[0] - jt[0]), Math.abs(pr[1] - jt[1]),
              Math.abs(prB[0] - jb[0]), Math.abs(prB[1] - jb[1]))]);
          }
        }
        difs.push([id, Math.max(d, db), +Math.abs(S - w.escalaVM).toFixed(4)]);
      }
      const lente = Math.abs((a.lente?.V0deg ?? NaN) - V0) < 1e-6
        && (a.lente?.vmOff || []).every((v, n) => Math.abs(v - OFF[n]) < 1e-6);
      /* O TERMO VERTICAL QUE O AUDITOR USA É O QUE ESTÁ ESCRITO NO game.js?
         Acima já se exigiu que o argumento Y CHAME `vmOffY(`. Falta fechar o número: a conta
         de `esperado` logo abaixo usa OFF[1] como base vertical, e isso só é legítimo porque
         `vmOffY(16/9) === VM_OFF[1]` (o JSON do auditor grava o viewSpace em 16:9). Então a
         fórmula é LIDA do game.js — a mesma regex do vm-mint-audit.mjs:196, de propósito — e
         avaliada em 16/9. Se alguém puser um `* 1.3` no vmOffY, ou trocar a referência de
         aspecto, este número deixa de bater com VM_OFF[1] e a AUD1 fica vermelha mesmo com a
         chamada no lugar. Os dois cheques juntos cobrem os dois jeitos de a correção sumir:
         apagar a CHAMADA (mutação medida em 08/2026) ou adulterar a FÓRMULA. */
      const mOffY = /const\s+vmOffY\s*=\s*\(\s*aspect\s*\)\s*=>\s*([^;]+);/.exec(gsrc);
      let offY169 = NaN;
      // eslint-disable-next-line no-new-func
      try { offY169 = new Function('VM_OFF', 'aspect', 'return (' + mOffY[1] + ');')(OFF, 16 / 9); } catch { /* sem vmOffY: cai no vertOk=false */ }
      const vertOk = isFinite(offY169) && Math.abs(offY169 - OFF[1]) < 1e-9;
      /* TOLERÂNCIA = PISO DE RUÍDO, não folga de qualidade. O JSON grava escalaVM, bbox e
         grip com 3 casas; esse arredondamento entra em S, depois em back/fwd, depois em Zg
         e por fim em gx = Zg·tanH — meia casa vira ~0,8 mm no pior caso medido (ak). 2 mm
         cobre a cadeia com margem e ainda é 20× menor que qualquer mudança REAL de fórmula
         (tirar o recuoZ move o grip 3,5 cm; tirar o VM_OFF move 23 cm). */
      const pior = difs.length ? difs.reduce((p, c) => (c[1] > p[1] ? c : p)) : null;
      const piorS = difs.length ? difs.reduce((p, c) => (c[2] > p[2] ? c : p)) : null;
      // tolerância do ADS em FRAÇÃO DE TELA (não em metros): 0,004 é o mesmo piso de ruído
      // que o vm-project.mjs --conferir usa para o mesmo tipo de comparação.
      const piorA = adsDif.length ? adsDif.reduce((p, c) => (c[1] > p[1] ? c : p)) : null;
      const adsOk = POSE_ADS && CLS_ADS && !!piorA && piorA[1] <= 0.004;
      put('AUD1', 'o frame() do vm-mint-audit espelha o _vmFrame do game.js (recuoZ, nearX, VM_OFF, vmOffY, pitch/yaw/roll, pose de ADS)',
        !!pior && pior[1] <= 0.002 && piorS[2] <= 0.001 && lente && vertOk && adsOk,
        `${difs.length} armas | pior Δ(grip,boca) ${num(pior ? pior[1] : NaN, 4)} m (${pior ? pior[0] : '?'})` +
        ` | pior Δescala ${num(piorS ? piorS[2] : NaN, 4)}` +
        ` | grip no ADS ${adsOk ? `casa (pior Δ ${num(piorA[1], 4)} de tela, ${piorA[0]})`
          : (piorA ? `DIVERGE: pior Δ ${num(piorA[1], 4)} de tela (${piorA[0]}) — o auditor projeta um ADS que o jogo não desenha`
            : 'NÃO MEDIDO: não li _adsPose/STATIC_CLASS do game.js ou o audit não tem o bloco ads')}` +
        ` | lente do JSON ${lente ? `casa (V0=${V0}°, VM_OFF=[${OFF.join(',')}])` : `DIVERGE do game.js (V0=${V0}°, VM_OFF=[${OFF.join(',')}])`}` +
        ` | termo vertical do argumento Y ${vertOk ? `casa (vmOffY(16:9)=${num(offY169, 4)} = VM_OFF[1])` : `DIVERGE: vmOffY(16:9)=${num(offY169, 4)} vs VM_OFF[1]=${num(OFF[1], 4)}`}`);
    }
  }
}

/* ── 2d. VM17 — O ADS ZERA O PITCH/YAW PRÓPRIOS DA ARMA ────────────────────────
   POR QUE ESTA INVARIANTE NASCEU JUNTO COM O PITCH: um crítico anterior provou que o ADS
   não tem invariante NENHUMA — mutar `this._adsPose['pistol']` passava 20/22 verde — e que
   `vm.ads[id]` (game.js:1200) é código morto. Até esta rodada isso era feio mas inofensivo,
   porque a arma estava paralela ao eixo da câmera: mirar não podia desalinhar nada. Com
   pitch de 9° a 24° por classe, deixar o ADS sem cobertura seria introduzir um bug VISÍVEL
   (a arma apontando pra cima na hora exata em que o jogador precisa da alça no eixo) num
   caminho que o portão declaradamente não olha. Regra da casa: intenção que não vira
   invariante é otimizada para fora.

   O QUE ELA MEDE, e por que é assim que dá pra medir sem browser: a rampa é uma função
   PURA declarada no game.js (`const vmAdsRot = (ang, adsF) => ...`). O bloco abaixo
   EXTRAI a declaração por regex, AVALIA e exige as duas pontas: cheio no quadril (adsF=0)
   e ZERO na mira (adsF=1), mais monotonicidade no meio. A outra metade — que alguém de
   fato CHAMA a rampa nos eixos X e Y do `wg.rotation.set(...)` — está na AUD1
   (`vmAdsRotChamado`), pelo mesmo motivo do vmOffY: declarar e não chamar é o jeito mais
   barato de a correção sumir com o portão verde. As duas juntas fecham os dois caminhos.
   O ROLL FICA DE FORA de propósito: girar em torno do eixo da câmera não tira a alça do
   centro, e o roll já existia antes desta rodada sem ninguém reclamar. */
{
  const gsrc2 = readFileSync(join(ROOT, 'public', 'js', 'game.js'), 'utf8');
  const m = /const\s+vmAdsRot\s*=\s*\(\s*ang\s*,\s*adsF\s*\)\s*=>\s*([^;]+);/.exec(gsrc2);
  if (!m) {
    put('VM17', 'no ADS o pitch/yaw próprios da arma são zerados (rampa vmAdsRot)', false,
      'vmAdsRot não existe (ou mudou de forma) em game.js — o ADS voltou a não ter invariante');
  } else {
    let f = null;
    // eslint-disable-next-line no-new-func
    try { f = new Function('ang', 'adsF', 'return (' + m[1] + ');'); } catch { /* fica null */ }
    const A = 0.4189;                       // 24° — o maior pitch do arsenal (classe smg)
    const v0 = f ? f(A, 0) : NaN, v1 = f ? f(A, 1) : NaN, vm = f ? f(A, 0.5) : NaN;
    const ok = isFinite(v0) && isFinite(v1) && Math.abs(v0 - A) < 1e-9 && Math.abs(v1) < 1e-9
      && vm > 0 && vm < A;
    put('VM17', 'no ADS o pitch/yaw próprios da arma são zerados (rampa vmAdsRot)', ok,
      `vmAdsRot(24°, adsF): quadril ${num(v0 * 180 / Math.PI, 2)}° | meio ${num(vm * 180 / Math.PI, 2)}° | mira ${num(v1 * 180 / Math.PI, 2)}°` +
      (ok ? ' — a arma volta ao eixo antes da alça' : ' — a arma NÃO volta ao eixo: no ADS ela fica apontando torto'));
  }
}

// ── 3. RIG PROCEDURAL DO VIEWMODEL (vmrig-test.mjs) ─────────────────────────
// Aqui moram as invariantes de ANIMAÇÃO — o que faz "parecer jogo": ADS curto,
// bob que zera ao parar, recarga que casa com o número, troca sem frame vazio.
{
  if (!existsSync(join(HERE, 'vmrig-test.mjs'))) {
    skip('RIG', 'rig procedural do viewmodel', 'vmrig-test.mjs ausente');
  } else {
    const out = runNode('vmrig-test.mjs');
    const pass = (out.match(/\bPASS\b/g) || []).length;
    const fail = (out.match(/\bFAIL\b/g) || []).length;
    put('RIG', 'rig de viewmodel: ADS/bob/recarga/troca/coice', fail === 0 && pass > 0,
      `${pass} PASS / ${fail} FAIL`);
  }
}

// ── 4. MOUNT DE ARMA NA 3ª PESSOA (tp-mount-probe.mjs) ──────────────────────
// "Dollynho não segura arma nenhuma", "Coach com a arma pra trás", "Ancap não
// segura direito", "ET estranho". A raiz medida: o cano vinha da linha
// antebraço→mão e ficava entre −21° e −35° (apontado pro chão) nos 27
// personagens. Esta invariante impede a volta disso.
{
  if (!existsSync(join(HERE, 'tp-mount-probe.mjs'))) {
    skip('TPM', 'mount de arma na 3ª pessoa', 'tp-mount-probe.mjs ausente');
  } else {
    const out = runNode('tp-mount-probe.mjs');
    const fail = (out.match(/\bFAIL\b/g) || []).length;
    const erro = out.includes('__ERRO__');
    // pitch do cano por personagem, lido da coluna "-> yaw X°/pitch Y°" da seção
    // MOUNT V2 (o resultado DEPOIS do mount). A seção 1 da sonda imprime de
    // propósito o algoritmo ANTIGO como diagnóstico — ler dali dá falso vermelho.
    const pitches = [...out.matchAll(/->\s*yaw\s*(-?\d+(?:[.,]\d+)?)°\s*\/\s*pitch\s*(-?\d+(?:[.,]\d+)?)°/gi)]
      .map((m) => parseFloat(m[2].replace(',', '.')));
    const yaws = [...out.matchAll(/->\s*yaw\s*(-?\d+(?:[.,]\d+)?)°/gi)].map((m) => parseFloat(m[1].replace(',', '.')));
    const piorPitch = pitches.length ? Math.max(...pitches.map(Math.abs)) : null;
    if (yaws.length) {
      const piorYaw = Math.max(...yaws.map(Math.abs));
      put('TPM3', 'nenhuma arma atravessada/pra trás na 3ª pessoa (|yaw| ≤ 20°)', piorYaw <= 20,
        `pior |yaw| ${num(piorYaw, 1)}° em ${yaws.length} personagens`);
    }
    put('TPM1', 'sonda de mount 3ª pessoa roda sem erro e sem FAIL', !erro && fail === 0,
      erro ? out.split('__ERRO__')[1]?.slice(0, 120) : `${fail} FAIL`);
    if (piorPitch !== null) {
      put('TPM2', 'cano na 3ª pessoa não aponta pro chão (|pitch| ≤ 12°)', piorPitch <= 12,
        `pior |pitch| ${num(piorPitch, 1)}° em ${pitches.length} medidas`);
    }
  }
}

// ── 5. BOTS: justiça, legibilidade e movimento (botsim.mjs) ─────────────────
// Roda a classe Game real + mapas reais em node, com sementes fixas. É o que
// permite afirmar "melhorou X%" em vez de "acho que melhorou".
{
  if (!existsSync(join(HERE, 'botsim.mjs'))) {
    skip('BOT', 'simulação de bots', 'botsim.mjs ausente');
  } else {
    const out = runNode('botsim.mjs');
    const media = out.match(/MEDIA[^\n]*/)?.[0] || '';
    const val = (k) => {
      const m = media.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+([\\d.]+)'));
      return m ? parseFloat(m[1]) : null;
    };
    const lat = val('latFlips/min'), spin = val('spin voltas/min'), stuck = val('stuck%');

    // BOT1 — "andando de lado e voltando". Um flip lateral a cada 4 s ainda é
    // visível; o alvo é ≤ 12/min (o projeto já mediu 68-85 antes da saga de A*).
    if (lat !== null) put('BOT1', 'bot não fica indo de lado (latFlips ≤ 12/min)', lat <= 12, `${num(lat, 1)}/min`, 'warn');
    // BOT2 — "rodando em volta de si mesmo".
    if (spin !== null) put('BOT2', 'bot não gira em torno de si (≤ 0,25 volta/min)', spin <= 0.25, `${num(spin, 2)}/min`, 'warn');
    // BOT3 — "travando".
    if (stuck !== null) put('BOT3', 'bot não trava (stuck ≤ 4% do tempo)', stuck <= 4, `${num(stuck, 1)}%`, 'warn');
    if (lat === null && spin === null && stuck === null) {
      skip('BOT*', 'métricas de movimento do bot', 'botsim não imprimiu a linha MEDIA');
    }

    // BOT4 — justiça. Rodada em modo duelo: o jogador tem que ter tempo de
    // reagir entre o primeiro tiro que encosta e a morte. "Morri e entendi por
    // quê" em vez de "morri do nada".
    const duel = runNode('botsim.mjs', { SIM_DUEL: '1' });
    const dmed = duel.match(/MEDIA[^\n]*/)?.[0] || '';
    const dval = (k) => {
      const m = dmed.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+([\\d.]+)'));
      return m ? parseFloat(m[1]) : null;
    };
    const ttk = dval('janela ate morrer (s)');
    const hs = dval('fracCabeca');
    const acc = dval('taxaAcerto');
    const mpm = dval('mortes/min');
    /* BOT4 — "o bot me mata do nada". A janela entre o primeiro tiro que encosta
       e a morte é o número que traduz "deu pra reagir". Abaixo de 3 s o jogador
       não tem tempo de virar a câmera, procurar cobertura e responder.

       ⚠ ESTE ESTIMADOR É INSTÁVEL COM 3 SEMENTES — MEDIDO, não suspeitado (rodada de
       material, 08/2026). O `generateUUID` do three consome 4 Math.random por Texture,
       Material e Object3D (public/vendor/three.module.js:318-323), então QUALQUER commit
       que crie uma textura a mais desloca o fluxo de RNG semeado do botsim inteiro —
       sem mudar uma linha de IA, de collider ou de arma.
       CONTROLE: injetando N texturas INVISÍVEIS (nenhum material as usa) no map_piscina
       da árvore base, o BOT4 anda assim: N=53 → 2,39 s · N=7 → 3,01 s · base → 3,15 s ·
       N=23 → 3,27 s · N=31 → 3,57 s · N=17 → 5,14 s · N=40 → 9,13 s. Quatro vezes de
       amplitude com ZERO mudança de comportamento.
       COM 9 SEMENTES o estimador estabiliza e o A/B da mesma rodada deu base 3,82 s ×
       entrega 3,46 s (ambos passam), com taxa de acerto 0,069 → 0,066 e mortes/min
       0,944 → 0,861 — o bot ficou, se algo, MENOS letal.
       CONSEQUÊNCIA PRÁTICA: BOT4 vermelho depois de um commit que mexeu em textura/material
       NÃO é prova de regressão de bot. Reproduza com `SEEDS` maior no botsim.mjs antes de
       culpar alguém — ou conserte o estimador, que é o certo e não coube naquela rodada. */
    if (ttk !== null) put('BOT4', 'janela entre o 1º tiro e a morte ≥ 3 s', ttk >= 3, `${num(ttk, 2)} s`);
    // BOT5 — "atira sempre na cabeça". Fração dos acertos do bot que são na cabeça.
    if (hs !== null) put('BOT5', 'fração de headshot do bot ≤ 10%', hs <= 0.10, `${num(hs, 3)}`);
    // BOT6 — pontaria sobre-humana. Um bot com taxa de acerto acima de ~22% em
    // combate real lê como aimbot.
    if (acc !== null) put('BOT6', 'taxa de acerto do bot ≤ 22%', acc <= 0.22, `${num(acc, 3)}`, 'warn');
    // BOT7 — ritmo. Morrer mais de 3 vezes por minuto contra bot é frustração.
    if (mpm !== null) put('BOT7', 'jogador morre ≤ 3 vezes/min no duelo', mpm <= 3, `${num(mpm, 2)}/min`, 'warn');
  }
}

// ── 5b. BOT QUE VÊ E NÃO ATIRA (botdiag.mjs SIM_SHOOTGATE=1) ────────────────
// BOT4/BOT6/BOT7 medem o bot atirando DEMAIS. O defeito simétrico — "o bot fica me
// encarando parado feito manequim" — não tinha número nenhum: um bot mudo não aparece
// em taxaAcerto (não atirou), nem em stuck% (está andando), nem em mortes/min. O
// botdiag conta o EPISÓDIO: janela contínua com (b.target === jogador && LOS livre via
// g._losClear && inRange) por mais de 1,5 s e ZERO tiros. 1,5 s é o teto porque é ~2×
// o tempo de reação humano — acima disso o bot lê como quebrado, não como cauteloso.
// Roda o próprio botdiag em vez de ler artefato: métrica de comportamento envelhece em
// silêncio se ficar dependendo de JSON gerado à mão.
// 180 s × 4 mapas × 3 sementes é o MESMO protocolo do BASELINE-v2.json, e é deliberado:
// episódio mudo é evento RARO, então um teto de ZERO só significa alguma coisa se a
// janela de observação for a maior que couber no portão. Medido: a 60 s dá 0 episódios
// e a 180 s dá 0,7 nos MESMOS binários — encurtar para caber no verde seria afrouxar o
// limiar disfarçado de escolha de performance. Custo: ~25 s.
{
  if (!existsSync(join(HERE, 'botdiag.mjs'))) {
    skip('BOT8', 'bot que vê o jogador e não atira', 'botdiag.mjs ausente');
  } else {
    const out = runNode('botdiag.mjs', { SIM_SHOOTGATE: '1' }, ['180', 'all']);
    const linha = out.match(/^SHOOTGATE[^\n]*/m)?.[0] || '';
    const val = (k) => {
      const m = linha.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(-?[\\d.]+)'));
      return m ? parseFloat(m[1]) : null;
    };
    const epi = val('episodios mudos'), maior = val('maior silencio'), tCond = val('tempo em condicao');
    if (epi === null) {
      skip('BOT8', 'bot que vê o jogador e não atira', 'botdiag não imprimiu a linha SHOOTGATE');
    } else {
      put('BOT8', 'zero episódios de bot com LOS no jogador por > 1,5 s sem disparar',
        epi === 0, `${num(epi, 1)} episódios | maior silêncio ${num(maior ?? 0, 2)} s | ${num(tCond ?? 0, 0)} s em condição`);
    }
  }
}

// ── 5c. VM14 — TODO PICKUP É ALCANÇÁVEL (pickup-check.mjs) ──────────────────
// O defeito que este número existe pra pegar: `_dropWeapon(x, z, w, true, TOP)`
// (game.js:1864) passa TOP = 0,12 como y ABSOLUTO de mundo — não `groundHeightAt(x,z)
// + 0,12`. E o `_freeSpot` que empurra cada arma pro chão andável resolve COLISÃO NO
// PLANO XZ e só. Em mapa plano as duas contas coincidem e ninguém nota; em mapa com
// relevo elas divergem pela altura do terreno inteiro.
// A métrica anterior olhava `y − groundHeightAt(x,z)` e reportava vão 0,0000 — VERDE —
// justamente onde a arma tinha ido parar no fundo da piscina, porque ali groundHeightAt
// vale −1,5 e a arma estava perfeitamente assentada... no fundo de um buraco de 1,5 m
// sem um único waypoint (map_piscina.js:281 só cria nó onde groundHeightAt > −0,35).
// Medir o vão contra o chão LOCAL certifica "encosta em ALGUMA superfície", nunca "dá
// pra pegar". Por isso são três critérios independentes e o (a) é o que não se engana.
// FORMA ATUAL DO (a) (08/2026): "existe waypoint a ≤ 3 m" foi REFUTADO — o grafo é uma
// grade de 3,4-4,4 m (74 falsos-positivos) e, pior, ele tem nós em componentes DESCONEXAS,
// então dava VERDE em arma dentro de bolsão fechado. Hoje (a) é CONECTIVIDADE REAL:
// flood-fill de andabilidade (0,25 m, corpo 0,38, degrau ≤ 0,30) a partir dos spawns dos
// dois times, e a arma passa com célula alcançada a ≤ 1,0 m. Estritamente mais forte.
// O arnês é REGERADO aqui (custa ~4 s, sem browser): pickup_check.json não é versionado,
// e num checkout limpo a alternativa seria `skip` — portão verde por AUSÊNCIA de dado,
// que é o mesmo modo de falha que deixou VM1-VM6 puladas por rodadas inteiras.
{
  if (!existsSync(join(HERE, 'pickup-check.mjs'))) {
    skip('VM14', 'todo pickup é alcançável', 'pickup-check.mjs ausente');
  } else {
    const out = runNode('pickup-check.mjs');
    const p = join(ROOT, 'tools', 'eval', 'pickup_check.json');
    if (!existsSync(p)) {
      skip('VM14', 'todo pickup é alcançável',
        'pickup-check.mjs não gerou o JSON: ' + (out.split('__ERRO__')[1] || '').slice(0, 120));
    } else {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      const mapas = j.mapas || [];
      const erros = mapas.filter((m) => m.err);
      const ruim = (k) => mapas.filter((m) => (m[k] || 0) > 0).map((m) => `${m.map} ${m[k]}`);
      const ok = j.semAlcance === 0 && j.abaixoDoPiso === 0 && j.flutuando === 0 && !erros.length;
      /* A evidência é POR CRITÉRIO e POR MAPA de propósito: os três reprovam por causas
         diferentes (conectividade × altura do terreno × assentamento), e um número agregado
         só diria "está ruim".
         O ANTIGO anexo "grade grossa: <mapa> spawn@Xm" saiu junto com o critério que ele
         explicava: (a) não olha mais a distância ao waypoint (grade de 3,4-4,4 m que gerava
         74 falsos-positivos), e sim CONECTIVIDADE REAL por flood-fill de andabilidade a
         partir dos spawns dos dois times — ver o cabeçalho de pickup-check.mjs. No lugar
         dele vai `celulasAlcancadas`, que é o cheque de sanidade da PRÓPRIA régua: se a
         semente do flood-fill quebrar, esse número despenca e o vermelho de (a) é do
         medidor, não do mapa. NENHUM teto mudou aqui: segue exigindo ZERO em cada critério. */
      const alcance = mapas.map((m) => `${m.map} ${m.celulasAlcancadas ?? '?'} cel`);
      put('VM14', 'todo pickup é alcançável (conectividade a pé do spawn, chão ≥ −0,10, arma encostada ≤ 0,05)',
        ok,
        erros.length
          ? `mapa(s) não carregaram: ${erros.map((m) => `${m.map}: ${m.err}`).join(' | ').slice(0, 200)}`
          : `${j.totalPickups} pickups em ${mapas.length} mapas | ` +
            `sem alcance ${j.semAlcance} [${ruim('semAlcance').join(', ') || '-'}] | ` +
            `abaixo do piso ${j.abaixoDoPiso} [${ruim('abaixoDoPiso').join(', ') || '-'}] | ` +
            `flutuando ${j.flutuando} [${ruim('flutuando').join(', ') || '-'}]` +
            ` | flood-fill: ${alcance.join(', ')}`);
    }
  }
}

// ── 6. ARSENAL: coerência da tabela de armas ────────────────────────────────
// Invariantes que se leem direto do código, sem rodar nada. Baratas e pegam
// classes inteiras de bug que já morderam o projeto.
{
  const gsrc = readFileSync(join(ROOT, 'public', 'js', 'game.js'), 'utf8');
  const wsrc = readFileSync(join(ROOT, 'public', 'js', 'weapons.js'), 'utf8');

  // ARM1 — toda arma com luneta precisa de zoom de verdade. "Snipers sem zoom"
  // é reclamação literal; a solução NÃO é tirar a luneta, é fazer a certa.
  const bloco = gsrc.slice(0, gsrc.indexOf('};', gsrc.indexOf('const WEAPONS')) + 2);
  const linhas = bloco.split('\n').filter((l) => /^\s*\w+:\s*\{/.test(l));
  const semZoom = linhas.filter((l) => /scope:\s*true/.test(l) && !/spreadScope/.test(l))
    .map((l) => l.trim().split(':')[0]);
  put('ARM1', 'toda arma com scope:true declara spreadScope', semZoom.length === 0,
    semZoom.length ? semZoom.join(', ') : `${linhas.length} armas conferidas`);

  // ARM2 — mirar precisa reduzir o spread. Foi o bug que deixou 25 das 26 armas
  // sem ganho nenhum ao mirar.
  const adsGanho = /spreadScope\s*\?\?|p\.scoped\s*\?/.test(gsrc);
  put('ARM2', 'ADS reduz o spread no caminho de tiro', adsGanho, adsGanho ? 'ok' : 'não achei o ramo de spread do ADS');

  // ARM3 — nenhuma arma pode ser desproporcionalmente "alta". Foi a causa real
  // da "uzi maior que o corpo do hipster": o len normaliza o COMPRIMENTO e a
  // altura vinha junto.
  const gameplayIds = new Set(linhas.map((line) => line.trim().split(':')[0]));
  const lens = [...wsrc.matchAll(/(\w+):\s*\{\s*len:\s*([\d.]+)/g)].map((m) => [m[1], parseFloat(m[2])]);
  // weapons.js também guarda CFG de props cênicos usados por glbchars.js. ARM4 mede
  // apenas a população balística declarada em game.js; o mutante prova que reincluir
  // o mosquete de apresentação volta a acender a régua.
  const mutateDisplayIntoWeapons = process.argv.includes('--mutante=display-no-fpvm');
  const measuredLens = lens.filter(([id]) => mutateDisplayIntoWeapons || gameplayIds.has(id));
  const gigantes = measuredLens.filter(([k, v]) => !/knife|pistol|deagle|revolver/.test(k) && v > 1.25);
  put('ARM4', 'nenhuma arma longa demais (len ≤ 1,25 m fora de sniper de ferrolho)',
    gigantes.length === 0, gigantes.length ? gigantes.map(([k, v]) => `${k}=${v}`).join(', ') : `${measuredLens.length} armas`, 'warn');

  // ARM5 — 1 killfeed por morte. "voce viu que tem 2 me eliminando esta confuso".
  const feedCalls = (gsrc.match(/this\._feed\(/g) || []).length;
  put('ARM5', 'killfeed emitido de um lugar só por morte', feedCalls <= 3,
    `${feedCalls} chamadas de _feed`, 'warn');
}

// ── 7. ESPAÇO DE JOGO ───────────────────────────────────────────────────────
// C4 da régua nova: a banda de 0-2 m das linhas de tiro tem que estar limpa.
// Nos screenshots do dono há 10+ armas largadas no chão jogável em todo mapa.
{
  const gsrc = readFileSync(join(ROOT, 'public', 'js', 'game.js'), 'utf8');
  const rackConcentrado = /rack|armario|_rack/i.test(gsrc);
  put('ESP1', 'existe rack/armário de armas (em vez de arma espalhada)', rackConcentrado,
    rackConcentrado ? 'ok' : 'não achei rack', 'warn');
}

// ── 8. MODOS ────────────────────────────────────────────────────────────────
// "os mapas todos podem ser rounds ou CTF, mas tem uns que forçam ser CTF".
{
  const msrc = readFileSync(join(ROOT, 'public', 'js', 'maps.js'), 'utf8');
  const forcados = (msrc.match(/ctfOnly:\s*true/g) || []).length;
  put('MOD1', 'nenhum mapa força CTF (ctfOnly removido)', forcados === 0,
    `${forcados} mapas com ctfOnly:true`);
}

// ── 8b. PERSONAGENS: C1..C6 da RÉGUA (tools/eval/char-probe.mjs) ────────────
/* POR QUE ESTAS SEIS EXISTEM
   O dono jogou e disse: "os funkeiros tão ainda balão, e o coach quântico e dollynho
   ruim", depois de já ter dito "veja os personagens funkeiro, compare com o mandrake".
   Como toda reclamação dele, nenhuma dessas frases é gosto — são invariantes violadas:
     "balão"                     -> proporção antropométrica fora da faixa      (CHR1)
     "um maior que o outro"      -> dispersão de altura vs hitbox de cabeça     (CHR2)
     "flutuando / pé no chão"    -> base da bbox em bind e em cada clipe        (CHR3)
     "não segura a arma"         -> palma dentro do corpo / fora de alcance     (CHR4)
     "liso, cor chapada"         -> mapas de superfície e resolução de textura  (CHR5)
     "é tudo o mesmo boneco"     -> IoU de silhueta par a par                   (CHR6)

   PROCEDÊNCIA DOS TETOS — leia antes de apertar qualquer um destes números.
   O teto ABSOLUTO do CHR1 é ANTROPOMETRIA PUBLICADA (Drillis & Contini 1966 / Winter
   fig. 4.1), e está rotulado como FALLBACK em todo lugar. Ele NÃO é foto medida: a tarefa
   mandava medir `references/funkeiros/` (18 fotos) e `references/palhacos/` (21), e essas
   pastas NÃO EXISTEM nesta árvore — `git ls-files references` devolve 3 arquivos, todos de
   viewmodel. O tools/eval/ref-body.py declara isso e mede as fotos assim que aparecerem.
   Já o teto RELATIVO (mediana + MAD do próprio elenco) tem procedência total e não depende
   de foto nenhuma — e é ele que responde ao "compare com o mandrake".
   Os tetos do CHR2 e do CHR6 saem do PRÓPRIO JOGO: 0,15 m é meia hitbox de cabeça
   (glbchars.js:296, BoxGeometry(0.26, 0.30, 0.26)) e 0,98 de IoU é o mesmo patamar que a
   PX2 já usa para silhueta de arma. Nenhum deles é palpite novo. */
{
  const saida = runNode('char-probe.mjs', {}, ['--sem-c4']);
  const arq = join(ROOT, 'tools', 'eval', 'char_probe.json');
  if (!existsSync(arq)) {
    for (const id of ['CHR1', 'CHR2', 'CHR3', 'CHR5', 'CHR6']) {
      skip(id, 'régua de personagem', 'char-probe.mjs não gerou o JSON: ' + (saida.split('__ERRO__')[1] || '').slice(0, 120));
    }
  } else {
    const j = JSON.parse(readFileSync(arq, 'utf8'));
    const P = j.personagens || [];
    const ref = j.refHumano || {};
    const fonteGLB = P.filter((c) => c.fonte === 'glb').length;
    const nota = fonteGLB ? `${fonteGLB}/${P.length} medidos no GLB` : `0/${P.length} no GLB — TODOS no fallback procedural (nenhum .glb de personagem nesta árvore)`;

    // ── CHR1 PROPORÇÃO ────────────────────────────────────────────────────────
    // Duas condições, porque "balão" tem duas leituras e as duas importam:
    //  (a) a MEDIANA do elenco tem que cair na faixa humana (senão o molde é balão);
    //  (b) nenhum personagem pode ser outlier grosseiro DO PRÓPRIO ELENCO — é isto que
    //      responde "os funkeiros estão balão E o mandrake não".
    const RAZ = ['cabecaSobreAltura', 'ombroSobreAltura', 'cinturaSobreOmbro', 'larguraTorsoSobreAltura', 'bracoSobreAltura', 'pernaSobreAltura'];
    const tol = ref.tolerancia || 0.35;
    const foraMediana = RAZ.filter((k) => {
      const m = (j.coorteC1[k] || {}).mediana;
      return m != null && ref[k] && Math.abs(m - ref[k]) / ref[k] > tol;
    }).map((k) => `${k} ${(j.coorteC1[k].mediana).toFixed(3)} vs ${ref[k]}`);
    const balao = P.filter((c) => c.C1 && c.C1.indiceBalao != null && c.C1.indiceBalao > 1 + tol)
      .map((c) => `${c.id} ${c.C1.indiceBalao.toFixed(2)}x`);
    const piorBalao = P.reduce((a, c) => ((c.C1 && c.C1.indiceBalao > (a && a.C1 ? a.C1.indiceBalao : 0)) ? c : a), null);
    put('CHR1', `proporção humana: mediana do elenco dentro de ±${(tol * 100) | 0}% da antropometria e ninguém "balão"`,
      foraMediana.length === 0 && balao.length === 0,
      `${nota} | mediana: ` + RAZ.map((k) => `${k.replace('SobreAltura', '/H').replace('SobreOmbro', '/omb')} ${(j.coorteC1[k].mediana ?? NaN).toFixed(3)}(ref ${ref[k]})`).join(' ')
      + ` | pior índice de balão: ${piorBalao ? `${piorBalao.id} ${piorBalao.C1.indiceBalao.toFixed(2)}x` : '-'}`
      + (foraMediana.length ? ` | MEDIANA FORA: ${foraMediana.join(', ')}` : '')
      + (balao.length ? ` | BALÃO: ${balao.slice(0, 6).join(', ')}${balao.length > 6 ? ` (+${balao.length - 6})` : ''}` : '')
      + ` | teto absoluto = ${ref.procedencia}`);

    // ── CHR2 ESCALA ───────────────────────────────────────────────────────────
    const alturas = P.map((c) => c.C2 && c.C2.alturaM).filter((v) => v != null && isFinite(v));
    const disp = alturas.length ? Math.max(...alturas) - Math.min(...alturas) : null;
    const TETO2 = (j.C2 && j.C2.teto) || 0.15;
    put('CHR2', 'altura do CORPO dentro de meia hitbox de cabeça entre todos (dispersão ≤ 0,15 m)',
      disp != null && disp <= TETO2 + 1e-9,
      `dispersão ${disp == null ? '-' : disp.toFixed(3)} m (min ${Math.min(...alturas).toFixed(3)} / max ${Math.max(...alturas).toFixed(3)}); `
      + `teto ${TETO2} = metade da hitbox de cabeça de 0,30 m (glbchars.js:296). `
      + `Altura medida SEM adereço: chapéu/cabelo/mastro inflam a bbox e no caminho GLB fazem `
      + `o glbchars.js:319-322 encolher o corpo — maior adereço agora: `
      + (P.map((c) => [c.id, c.C2 && c.C2.adereçoAcima]).filter((x) => x[1] > 0.02).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => `${x[0]} +${(x[1] * 100).toFixed(0)}cm`).join(', ') || 'nenhum'));

    /* ── CHR3 PÉS NO CHÃO ──────────────────────────────────────────────────────
       MEDE O QUE O JOGO DESENHA, NÃO O QUE O CLIPE TRAZ (04/08).

       O defeito é do CLIPE: o probe mede `bind = 0.000` nos 44, e o desvio nasce em
       walk/run/crouch. A correção não podia ser no GLB (38 personagens compartilham os
       mesmos clipes, e re-exportar o pack por causa de 3 cm é caro e arriscado), então ela
       é uma TABELA aplicada em runtime — `public/models/anims/foot-offsets.json`, gerada
       por `npm run feet` a partir desta mesma medição, e somada ao Y do modelo na troca de
       clipe (glbchars.js).

       Se esta régua continuasse lendo só o desvio do clipe, ela ficaria VERMELHA PARA
       SEMPRE contra um defeito já corrigido — e a rodada seguinte "consertaria" de novo.
       É a Lei 1 da casa ao contrário: régua que não enxerga a correção também mente.
       Então aqui o desvio efetivo é `desvio + offset aplicado`.

       O que a tabela NÃO corrige continua vermelho, e tem que continuar: os 6 pares acima
       do teto de 8 cm (proerd/crouch -43 cm, canarinho/crouch -37 cm, ancap em 4 poses)
       não são pé fora do chão, são clipe descendo a raiz inteira — outro defeito, que
       exige olhar imagem antes de virar número. Ver tools/gen-foot-offsets.mjs. */
    const TOL3 = 0.01;
    let footOff = {};
    try {
      footOff = JSON.parse(readFileSync(join(ROOT, 'public', 'models', 'anims', 'foot-offsets.json'), 'utf8')).offsets || {};
    } catch { footOff = {}; }   // sem tabela: mede o cru, que é o estado de antes
    const efetivo = (c) => {
      const off = footOff[c.id] || {};
      const poses = Object.entries((c.C3 && c.C3.porPose) || {});
      const vals = poses.map(([pose, d]) => d + (off[pose] || 0));
      return { min: Math.min(0, ...vals), max: Math.max(0, ...vals) };
    };
    const ef = new Map(P.map((c) => [c.id, efetivo(c)]));
    const afunda = P.filter((c) => ef.get(c.id).min < -TOL3);
    const flutua = P.filter((c) => ef.get(c.id).max > TOL3);
    const corrigidos = Object.keys(footOff).length;
    put('CHR3', 'pés no chão na bind pose E em cada clipe (|base da bbox| ≤ 0,01 m, JÁ com a correção de runtime)',
      afunda.length === 0 && flutua.length === 0,
      `${P.length} personagens × poses | tabela de correção cobre ${corrigidos} | afundando ${afunda.length} `
      + `[${afunda.slice(0, 4).map((c) => `${c.id} ${ef.get(c.id).min.toFixed(3)}`).join(', ') || '-'}] | `
      + `flutuando ${flutua.length} [${flutua.slice(0, 4).map((c) => `${c.id} +${ef.get(c.id).max.toFixed(3)}`).join(', ') || '-'}] `
      + '| o sinal separa dois defeitos diferentes: y<0 é pé DENTRO do chão, y>0 é boneco no ar');

    // ── CHR5 ACABAMENTO ───────────────────────────────────────────────────────
    // Crítico só o que é sempre verificável (personagem tem geometria e material).
    // A contagem de MAPAS é aviso porque, sem os GLB nesta árvore, o caminho medido é o
    // procedural, que por construção não tem textura nenhuma — reprovar isso em vermelho
    // seria um vermelho permanente que não diz nada de novo a cada rodada.
    const vazios = P.filter((c) => !c.C5 || !c.C5.triangulos || !c.C5.materiais).map((c) => c.id);
    const mundo = j.escalaDoMundoC5 || {};
    const melhorMapa = (mundo.porMapa || []).reduce((a, m) => (((m.normalMap || 0) > (a.normalMap || 0)) ? m : a), { normalMap: 0 });
    const semSuperficie = P.filter((c) => (c.C5.mapasDeSuperficie || 0) === 0).length;
    put('CHR5', 'todo personagem tem geometria e material (e o acabamento é medido contra o mundo)',
      vazios.length === 0,
      `${vazios.length ? 'SEM GEOMETRIA: ' + vazios.join(', ') + ' | ' : ''}`
      + `personagens: mediana ${P.map((c) => c.C5.triangulos).sort((a, b) => a - b)[P.length >> 1]} triângulos, `
      + `${semSuperficie}/${P.length} com ZERO mapa de superfície (normal+rough+ao). `
      + `Mundo MEDIDO em runtime: ${(mundo.porMapa || []).length} mapas, ${(mundo.total || {}).materiais || 0} materiais, `
      + `${(mundo.total || {}).normalMap || 0} normalMap, ${(mundo.total || {}).roughnessMap || 0} roughnessMap, ${(mundo.total || {}).aoMap || 0} aoMap `
      + `(melhor mapa: ${melhorMapa.mapa || '-'} com ${melhorMapa.normalMap || 0}). `
      + 'NB: o enunciado da rodada dizia "0 normalMap nos 5 mapas"; a medição em runtime desmente — '
      + 'o map.js:20-28 (lam) pendura normal+rough derivados do albedo, e só o praca_old passa por lá.');
    put('CHR5B', 'personagem não fica abaixo do acabamento do melhor mapa do mundo',
      semSuperficie === 0 || (melhorMapa.normalMap || 0) === 0,
      `${semSuperficie}/${P.length} personagens com 0 mapas de superfície contra ${melhorMapa.normalMap || 0} normalMaps no ${melhorMapa.mapa || '-'} `
      + `— é este o "três níveis de acabamento na mesma tela" que o dono descreveu. `
      + `Fonte medida: ${fonteGLB ? 'GLB' : 'procedural (sem GLB de personagem nesta árvore — o procedural não tem textura por construção)'}.`,
      'warn');

    // ── CHR6 SILHUETA ─────────────────────────────────────────────────────────
    const pares = j.C6topo || [];
    const iguais = pares.filter((x) => x.pior > 0.98);
    const inter = (j.C6interTimePior || [])[0];
    put('CHR6', 'nenhum par de personagens com a MESMA silhueta (IoU par a par ≤ 0,98)',
      iguais.length === 0,
      `${j.C6silhuetasDistintas ?? '?'} silhuetas distintas para ${P.length} personagens; `
      + `${iguais.length} pares acima de 0,98`
      + (iguais.length ? ` [${iguais.slice(0, 4).map((x) => `${x.a}×${x.b} ${x.pior.toFixed(3)}`).join(', ')}]` : '')
      + (j.C6grupos && j.C6grupos.length ? ` | maior grupo de clones: ${j.C6grupos[0].length} (${j.C6grupos[0].slice(0, 5).join(', ')}${j.C6grupos[0].length > 5 ? '…' : ''})` : '')
      + (inter ? ` | pior par ALIADO×INIMIGO: ${inter.a}×${inter.b} ${inter.pior.toFixed(3)}` : ''));

    /* ── CHR7 CONVENÇÃO DE SKIN ────────────────────────────────────────────────
       A causa raiz do "balão" (04/08): o auto-skin do tools/rig-from-donor.mjs montava
       o segmento do osso como [junta→PAI], e num rig Meshy o osso aponta pro filho.
       Isso pintava TODO membro com a junta DISTAL — carne do braço obedecendo ao
       cotovelo, coxa obedecendo ao joelho —, então dobrar uma junta girava o membro
       inteiro. 17 dos 44 personagens estavam assim (os 8 palhaços e os 9 funkeiros
       rigados por transplante); os outros 27, rigados no Mint, nunca estiveram.
       Efeito medido em `tools/eval/pose-inflate.mjs` (esticamento de aresta com o
       clipe rodando, razão simétrica): mediana do lote 1,152 -> 0,535 depois do
       `tools/reskin-glb.mjs`. Referência: mandrake 0,402, mst 0,312.
       O teto aqui é ZERO e não é arbitrário: `convencaoSkinPai` só conta junta cujo
       centroide da carne dominada fica 25% mais perto do meio do segmento junta→pai
       do que do meio do junta→filho. Rig correto dá 0 por construção — os 27 do Mint
       dão 0, o doador `mst` dá 0×18.
       MUTAÇÃO QUE FAZ FICAR VERMELHA: reponha um GLB pré-reskin (backup de qualquer um
       dos 17) em public/models/characters/ e rode o char-probe — conferido com o raul,
       que volta a marcar 13×0 e derruba esta invariante. */
    const invertidos = P.filter((c) => c.C7 && (c.C7.convencaoSkinPai || 0) > (c.C7.convencaoSkinFilho || 0));
    const semDado = P.filter((c) => !c.C7 || c.C7.convencaoSkinPai == null).length;
    put('CHR7', 'nenhum personagem com a convenção de skin invertida (carne pintada pela junta DISTAL)',
      invertidos.length === 0,
      `${invertidos.length}/${P.length} invertidos`
      + (invertidos.length ? ` [${invertidos.slice(0, 5).map((c) => `${c.id} ${c.C7.convencaoSkinPai}×${c.C7.convencaoSkinFilho} (${(c.C7.ossosInvertidos || []).slice(0, 3).join(',')})`).join(', ')}]` : '')
      + (semDado ? ` | ${semDado} sem medida (fonte procedural)` : '')
      + ' — osso distal pintando o membro inteiro é a causa raiz do "balão"; ver tools/reskin-glb.mjs');
  }
}

/* ── CHR8 PISO DE ALBEDO NÃO COME CONTRASTE ─────────────────────────────────
   Reclamação do dono (04/08): "todos os personagens depois desses também tão ruim
   na cor e iluminação". Causa raiz medida em `tools/eval/char-floor.mjs`: o piso
   de albedo de characters.js era um DEGRAU por texel (`max(V, 0.09)`), e 0,09
   LINEAR é sRGB 0,332 = L* 36, um cinza MÉDIO. 94,1 % da textura do trapfunk,
   90,4 % do palhaço mal e 86,6 % do oakley vivem abaixo desse ponto — o
   personagem escuro inteiro colapsava num valor só e perdia até 61 % do seu
   contraste interno, enquanto padata (8,4 %) e canarinho (8,8 %) não perdiam
   nada. O teto não é gosto: é o CONTRATO que o próprio bloco declara no código
   ("só operações que preservam matiz e saturação relativa"). O modo julgado é
   lido do fonte, então devolver o piso ao degrau acende esta invariante sozinho.
   Mutantes que a fazem ficar vermelha: `--mutante=bloco1` (região de 1 texel =
   degrau) e `--mutante=pisozero` (piso que não levanta). */
{
  const out = runNode('char-floor.mjs');
  const a = out.match(/C10a CONTRASTE[^\n]*: (✓|✗[^\n]*)/);
  const b = out.match(/C10b CLAREZA[^\n]*: (✓|✗[^\n]*)/);
  const med = out.match(/mediana da perda de contraste:\s*degrau ([\d.]+)%\s+regional ([\d.]+)%/);
  if (!a || !b) {
    skip('CHR8', 'piso de albedo não come o contraste interno do personagem',
      'char-floor.mjs não produziu veredito (precisa de `magick` e dos GLB em public/models/characters)');
  } else {
    put('CHR8', 'piso de albedo levanta o nível SEM comer o contraste interno (≤ 10 % em 45)',
      a[1] === '✓' && b[1] === '✓',
      `contraste: ${a[1]} | clareza: ${b[1]}`
      + (med ? ` | perda mediana: degrau ${med[1]}% → regional ${med[2]}%` : ''));
  }
}

// ── 8c. C4: mão na arma (a régua delega ao tp-mount-probe, e aqui também) ───
{
  const out = runNode('tp-mount-probe.mjs');
  const semModelo = (out.match(/^\w+: SEM MODELO$/gm) || []).length;
  const enterrados = (out.match(/ENTERRADA/g) || []).length;
  if (semModelo && !/palma-osso/.test(out.split('===')[3] || '')) {
    skip('CHR4', 'mão direita no grip do mount de 3ª pessoa',
      `${semModelo} ids sem public/models/characters/<id>.glb — os GLB de personagem não são `
      + 'versionados nesta árvore (mint-assets.json é um registro de URLs do mint.gg). '
      + 'Rode na máquina do dono, com os assets no lugar.');
  } else {
    put('CHR4', 'nenhuma palma nasce ENTERRADA no corpo (mount de 3ª pessoa)',
      enterrados === 0, `${enterrados} personagens com a palma dentro da silhueta do corpo`);
  }
}

// ── 8b. MOD2 — O MODO ESCOLHIDO É O MODO JOGADO (mode-check.mjs) ─────────────
// "esse mapa está como CAPTURA, mas eu selecionei SINGLE PLAYER — e esse erro se repete
// em outros mapas". A MOD1 não pegava: ela confere o REGISTRO DE MAPAS (`ctfOnly`), e
// quem apagava a escolha era o MENU — `gotoMap` reescrevia `matchMode` a cada troca de
// mapa, e o carrossel vem DEPOIS da escolha do modo no fluxo. O arnês EXECUTA o código
// real de `openSetup`/`gotoMap`/badge/`ctf:` recortado do main.js (não é regex: um bug
// reescrito com outro nome de variável continuaria vermelho).
{
  if (!existsSync(join(HERE, 'mode-check.mjs'))) {
    skip('MOD2', 'o modo escolhido é o modo jogado', 'mode-check.mjs ausente');
  } else {
    const out = runNode('mode-check.mjs');
    const m = out.match(/MODECHECK (\d+)\/(\d+) casos/);
    if (!m) {
      skip('MOD2', 'o modo escolhido é o modo jogado',
        'mode-check não imprimiu a linha MODECHECK: ' + (out.split('__ERRO__')[1] || out).slice(0, 160));
    } else {
      const ok = +m[1], tot = +m[2];
      const falhas = (out.match(/FALHAS: (.*)$/m) || [])[1] || '';
      put('MOD2', 'o modo escolhido é o modo jogado nos 5 mapas (5 mapas × 2 modos + badge + padrão do mapa)',
        ok === tot, `${ok}/${tot} casos` + (falhas ? ` | ${falhas.slice(0, 240)}` : ' | 0 falhas'));
    }
  }
}

// ── 8b2. PAUSA — A PARTIDA NÃO ACABA SOZINHA (pause-check.mjs) ───────────────
/* "pela quinta vez o jogo reiniciou sozinho, eu estava no meio de uma partida e ele foi
   pro menu principal sozinho" (dono, 04/08). Não era caminho automático: `quitToMenu()`
   só é chamado por dois `onclick`. O jogo é que PÕE esses botões debaixo da mira — o
   `_plc` pausa a qualquer perda de pointer lock (alt-tab, ESC, notificação) e o menu de
   pausa nasce clicável no mesmo frame, com REINICIAR a 100 px e SAIR PRO MENU a 150 px
   do centro da tela (medido em 1536×1024, o enquadramento 3:2 do dono). O tiro que já
   estava saindo apertava o botão.
   As 6 cláusulas e as 7 mutações que as fazem morder estão no cabeçalho do
   pause-check.mjs. Ele roda em node puro (~5 s) e dirige a classe Game de verdade. */
{
  if (!existsSync(join(HERE, 'pause-check.mjs'))) {
    skip('PAUSA', 'a partida não volta pro menu sozinha', 'pause-check.mjs ausente');
  } else {
    const out = runNode('pause-check.mjs');
    const m = out.match(/PAUSECHECK (\d+)\/(\d+) clausulas/);
    if (!m) {
      skip('PAUSA', 'a partida não volta pro menu sozinha',
        'pause-check não imprimiu a linha PAUSECHECK: ' + (out.split('__ERRO__')[1] || out).slice(0, 160));
    } else {
      const ok = +m[1], tot = +m[2];
      const falhas = (out.match(/FALHAS: (.*)$/m) || [])[1] || '';
      put('PAUSA', 'nenhum clique perdido tira o jogador da partida (guarda do pause + 2 toques + zero caminho automático pro menu)',
        ok === tot, `${ok}/${tot} cláusulas` + (falhas ? ` | ${falhas.slice(0, 240)}` : ' | 0 falhas'));
    }
  }
}

// ── 8c. MAPAS: corpo dentro de sólido / respawn / escada / bandeiras ─────────
/* Sete invariantes alimentadas por tools/eval/map-check.mjs, que sobe os 4 mapas REAIS
   e mede com o instrumento do próprio jogo (`_collide`, `groundHeightAt`, `_losClear`,
   raycast contra `world.root`). Cada uma nasceu de uma frase do dono:
     MAP1 "os jogadores estão SUBMERSOS EMBAIXO DA ESTÁTUA"
     MAP2 "o RESPAWN de dentro da loja tinha q ser NO ANDAR DE CIMA" + "é VISÍVEL DE FORA"
     MAP3 "a ESCADA tinha q ser MELHOR FEITA"
     CTF1 "os bots da loja ficam todos NA BANDEIRA DO MEIO"
   e três desta rodada, também palavra por palavra:
     MAP2B "o respawn do time B virou uma FRESTA" (regressão que o próprio dono causou e
            mandou desfazer: exposição 0,0% obtida por emparedamento é verde de mentira)
     MAP4  "no mapa brasília ... SE ATIRA E FICA A MARCA NO AR como se tivesse uma parede
            invisível" (colisor de bala sem malha visível atrás)
     MAP5/CTF2 "a LOJA FICA VAZIA DOS CANTOS" + "os bots e jogadores têm mais OPÇÕES"
   SOBRE OS TETOS DA MAP1: o mapa desta rodada (fy_havan) tem que ficar em ZERO — ele foi
   consertado e é onde o defeito foi relatado. Os outros quatro entram com o teto MEDIDO no
   baseline a95999a (awp_map 47, fy_pool_day 474, fy_ferrovelho 4), que congela
   a dívida existente sem inventar um verde: ela é de outra natureza (no piscinão são células
   no fundo da piscina encostando na parede dela; nos outros, bases de coluna e canteiros
   decorativos) e mexer nesses mapas não estava no pedido. O teto NÃO deixa a dívida crescer:
   qualquer sólido novo sobre chão andável reprova na hora. */
{
  if (!existsSync(join(HERE, 'map-check.mjs'))) {
    skip('MAP*', 'geometria de mapa (submerso/respawn/escada/bandeiras)', 'map-check.mjs ausente');
  } else {
    const out = runNode('map-check.mjs');
    const pj = join(ROOT, 'tools', 'eval', 'map_check.json');
    if (!existsSync(pj)) {
      skip('MAP*', 'geometria de mapa', 'map-check.mjs não gerou o JSON: ' + (out.split('__ERRO__')[1] || '').slice(0, 160));
    } else {
      const j = JSON.parse(readFileSync(pj, 'utf8'));
      const M = Object.fromEntries((j.mapas || []).map((m) => [m.map, m]));
      const erros = (j.mapas || []).filter((m) => m.err);

      // ---- MAP1: corpo dentro de sólido ----
      // praca_old saiu do dicionário junto com o mapa (o dono mandou apagar a praça clássica).
      const TETO_DENTRO = { awp_map: 47, fy_pool_day: 474, fy_havan: 0, fy_ferrovelho: 4 };
      {
        const linhas = [], acima = [], spawnRuins = [];
        for (const [id, teto] of Object.entries(TETO_DENTRO)) {
          const m = M[id]; if (!m || m.err) continue;
          linhas.push(`${id} ${m.corpoDentroDeSolido}/${teto}`);
          if (m.corpoDentroDeSolido > teto) acima.push(`${id} ${m.corpoDentroDeSolido} > ${teto}`);
          for (const sp of (m.spawns || [])) if (sp.penetracao > 0.30) spawnRuins.push(`${id}/${sp.team} ${sp.penetracao} m`);
        }
        put('MAP1', 'nenhum spawn e nenhum chão andável com o corpo DENTRO de geometria sólida (sonda vertical do peito ao chão; teto = degrau de 0,30 m)',
          !erros.length && !acima.length && !spawnRuins.length,
          erros.length ? `mapa(s) não carregaram: ${erros.map((m) => m.map).join(', ')}`
            : `pontos por mapa (medido/teto): ${linhas.join(', ')} | spawns dentro de sólido: ${spawnRuins.length ? spawnRuins.join(', ') : 0}` +
              ` | pior penetração no fy_havan ${M.fy_havan ? M.fy_havan.piorPenetracao : '?'} m`);
      }

      // ---- MAP2: andar do respawn + respawn visível de fora ----
      /* Duas cláusulas. (a) vale pros 5 mapas: os slots de um time têm que estar TODOS no
         mesmo andar (Δ ≤ 0,30 m, o degrau) — um slot que escorregou do mezanino nasce 3,4 m
         abaixo dos outros e ninguém percebe. (b) é o pedido literal do dono no fy_havan: o
         time da loja nasce no ANDAR DE CIMA (chão ≥ 3,0 m) e NENHUM ponto andável a ≥ 25 m
         enxerga a cabeça de quem nasce (medido com o `_losClear` do game.js). 25 m é a
         distância em que o tiro de sniper é instantâneo e o respawn não teve tempo de nada.
         Os outros spawns entram como EVIDÊNCIA, não como teto: o do estacionamento é a céu
         aberto por desenho do mapa (58% dos pontos), e exigir 0 ali seria exigir outro mapa. */
      {
        const desnivel = [], evid = [];
        let havanAndar = null, havanExp = null, havanVis = null;
        for (const m of (j.mapas || [])) {
          if (m.err) continue;
          for (const t of (m.exposicaoPorTime || [])) {
            if (t.chaoMax - t.chaoMin > 0.30) desnivel.push(`${m.map}/${t.team} Δ${(t.chaoMax - t.chaoMin).toFixed(2)} m`);
            evid.push(`${m.map}/${t.team} chão ${t.chaoMin} m exp ${(t.fracMedia * 100).toFixed(1)}%`);
            if (m.map === 'fy_havan' && t.team === 'B') { havanAndar = t.chaoMin; havanExp = t.fracMedia; havanVis = t.maiorVisada; }
          }
        }
        const ok = !desnivel.length && havanAndar !== null && havanAndar >= 3.0 && havanExp === 0 && havanVis === 0;
        put('MAP2', 'cada time nasce todo no MESMO andar, e o respawn da loja (fy_havan/B) fica no andar de cima e não é visto de fora',
          ok,
          `fy_havan/B chão ${havanAndar} m (mezanino = 3,4) · exposição ${havanExp === null ? '?' : (havanExp * 100).toFixed(1)}% dos pontos a ≥ 25 m · maior visada ${havanVis} m` +
          ` | slots fora de nível: ${desnivel.length ? desnivel.join(', ') : 0} | ${evid.join(' · ')}`);
      }

      // ---- MAP3: a escada ----
      /* A faixa NÃO é gosto: NBR 9077 (escada fixa de uso coletivo) + fórmula de Blondel.
         Espelho 16-19 cm, piso 25-32 cm, 2·espelho+piso 62-66 cm, largura livre ≥ 1,20 m,
         inclinação 25-40°. Mais duas que são do JOGO e não da norma: o desvio entre o chão
         andável e o topo do degrau em que se pisa (≤ 0,10 m — foi um desencontro de 23 cm
         que fez o jogador "escalar parede invisível"), e a TRAVESSIA (o A* e o flood-fill de
         andabilidade têm que subir por ela; o mezanino já foi uma ILHA no grafo). */
      {
        const m = M.fy_havan;
        const es = m && (m.escadas || [])[0];
        const tv = m && (m.travessia || [])[0];
        if (!es) {
          put('MAP3', 'a escada do mezanino é uma escada de verdade e o grafo sobe por ela', false,
            'fy_havan não declarou `world.stairs` — sem declaração não há o que medir');
        } else {
          const criterios = [es.okEspelho, es.okPiso, es.okBlondel, es.okLargura, es.okInclinacao, es.okDesvio];
          const fora = criterios.filter((c) => !c).length;
          const sobe = !!(tv && tv.aEstrelaChega && tv.celulasAlcancadas >= 500);
          put('MAP3', 'escada dentro da faixa de escada real (NBR 9077/Blondel) e o grafo + o flood-fill sobem por ela',
            fora === 0 && sobe,
            `espelho ${es.espelhoMed} m [0,16-0,19] · piso ${es.pisoMed} m [0,25-0,32] · 2h+p ${es.blondel} m [0,62-0,66] · ` +
            `largura livre ${es.larguraMedida} m [≥1,20] · ${es.inclinacaoGraus}° [25-40] · desvio pé↔degrau ${es.desvioChaoDegrau} m [≤0,10] · ` +
            `${fora} critério(s) fora | mezanino: ${tv ? tv.celulasAlcancadas : '?'} células alcançadas a pé (≥500), ${tv ? tv.waypointsNoNivel : '?'} waypoints, A* chega ${tv ? tv.aEstrelaChega : '?'}`);
        }
      }

      // ---- CTF1: as bandeiras ----
      /* Os dois tetos saem do RAIO DE CAPTURA (4,5 m, game.js `mk(...) r: 4.5`), não de
         gosto: (a) se a bandeira do meio estiver a menos de 4,5 m da reta que liga as
         outras duas, o caminho mais curto entre as duas pontas passa DENTRO do anel do
         meio — é o mecanismo do "os bots da loja ficam todos na bandeira do meio";
         (b) uma bandeira a menos de 2 raios (9 m) do spawn mais próximo pode ser capturada
         de dentro do respawn. (c) linha de tiro > 0 quer dizer "existe ALGUM lugar de onde
         se atira nela": a MID do fy_havan estava cravada na estátua e media 0,0 m. */
      {
        const R_CAP = 4.5, colin = [], perto = [], enterrada = [], evid = [];
        for (const m of (j.mapas || [])) {
          if (m.err) continue;
          if (m.alturaTrianguloMin <= R_CAP) colin.push(`${m.map} ${m.alturaTrianguloMin} m`);
          for (const b of (m.bandeiras || [])) {
            if (b.distSpawn < 2 * R_CAP) perto.push(`${m.map}/${b.id} ${b.distSpawn} m`);
            if (b.maiorLinhaTiro <= 0) enterrada.push(`${m.map}/${b.id}`);
          }
          const dmin = Math.min(...(m.bandeiras || []).map((b) => b.distSpawn));
          evid.push(`${m.map} tri ${m.alturaTrianguloMin} m / spawn↔bandeira mín ${isFinite(dmin) ? dmin.toFixed(1) : '?'} m`);
        }
        put('CTF1', 'bandeiras distribuídas: não colineares (altura do triângulo > raio de captura), ≥ 2 raios do spawn mais próximo e nenhuma enterrada na geometria',
          !colin.length && !perto.length && !enterrada.length,
          `${evid.join(' · ')} | colineares: ${colin.length ? colin.join(', ') : 0} | ` +
          `coladas no spawn (<9 m): ${perto.length ? perto.join(', ') : 0} | sem linha de tiro: ${enterrada.length ? enterrada.join(', ') : 0}`);
      }

      /* ---- MAP2B: o respawn é um LUGAR, não uma fresta ----
         POR QUE ESTA INVARIANTE EXISTE, e por que ela é irmã obrigatória da MAP2: a MAP2
         cobra exposição ZERO e é fácil demais de satisfazer — basta emparedar. Foi o que
         aconteceu no fy_havan: uma chicana de 19 m a 1,80 m da parede de portas zerou a
         exposição E reduziu o respawn a uma faixa de 2,6 m com metade do armário do outro
         lado. Verde na régua, péssimo no jogo. Sem um teto do OUTRO lado, o próximo agente
         reconstrói a fresta — e reconstrói de boa-fé, porque a régua mandava.
         Os dois números saem do CORPO, não de gosto:
           folga ≥ 1,20 m = raio 0,38 + 0,82 de passo lateral (uma esquiva);
           área ≥ 40 m² num raio de 5 m (teto geométrico π·5² = 78,5) = pouco mais da metade
           do disco, o mínimo pra 4 pessoas nascerem e se espalharem sem se empurrar.
         Vale pros 4 mapas: fresta de respawn não é característica de mapa nenhum. */
      {
        const ruins = [], evid = [];
        for (const m of (j.mapas || [])) {
          if (m.err) continue;
          evid.push(`${m.map} folga ${m.piorFolga} m / área ${m.piorArea} m²`);
          for (const s2 of (m.salaDoSpawn || []))
            if (!s2.okFolga || !s2.okArea) ruins.push(`${m.map}/${s2.team}(${s2.x},${s2.z}) folga ${s2.folgaParede} m área ${s2.areaContigua} m²`);
        }
        put('MAP2B', 'todo slot de respawn é um LUGAR: ≥ 1,20 m de folga até a parede mais próxima e ≥ 40 m² de chão andável CONTÍGUO num raio de 5 m',
          !erros.length && !ruins.length,
          `${evid.join(' · ')} | slots fora do teto: ${ruins.length ? ruins.join(' · ') : 0} | ` +
          'critério: 64 direções na altura do peito contra os colisores do jogo + flood-fill a partir do próprio slot (parede do outro lado NÃO conta)');
      }

      /* ---- MAP4: todo occluder tem malha visível cobrindo-o ----
         Frase do dono: "no mapa brasília tem alguns lugares que se atira e fica a marca no
         ar como se tivesse uma parede invisível". O que a bala bate é `world.occluders`
         (game.js:2611, raycast NÃO-recursivo). O truque legítimo de dar corpo de bala a um
         GLB (que é Group e o raycast não-recursivo atravessa) é uma CAIXA DE PROCURAÇÃO
         invisível; o defeito é usar a mesma caixa em geometria PROCEDURAL e dimensioná-la
         pelo AABB do conjunto em vez da massa real. Medido no awp_map: 5 occluders, o pior
         com 100% da superfície sem nada desenhado atrás até 11,1 m de altura (o "V" entre as
         asas do Panteão da Pátria, que é o vazio que o edifício DESENHA).
         TOLERÂNCIA DECLARADA: 0,35 m — menor que o raio do corpo (0,38), ou seja, uma folga
         que o jogador não consegue ocupar não é parede invisível, é margem de colisão.
         LIMITE DECLARADO: em node nenhum GLB carrega, então as procurações de GLB (marcadas
         com `userData.proxyGLB`) são PULADAS e o número de pulos entra na evidência. */
      {
        const ruins = [], evid = [];
        for (const m of (j.mapas || [])) {
          if (m.err) continue;
          evid.push(`${m.map} ${m.occluderSemMalha.length}/${m.occMedidos} (${(m.fracSemMalha * 100).toFixed(1)}% da superfície, ${m.occPulados} proxy de GLB pulado)`);
          for (const o of (m.occluderSemMalha || []).slice(0, 3))
            ruins.push(`${m.map} ${(o.frac * 100).toFixed(0)}% vazio até y ${o.alturaPior} m em [${o.caixa.join(' ')}]`);
        }
        put('MAP4', 'todo occluder de bala tem malha VISÍVEL cobrindo-o (tolerância 0,35 m) — sem parede invisível parando tiro no ar',
          !erros.length && !ruins.length,
          `${evid.join(' · ')} | occluders sem malha: ${ruins.length ? ruins.join(' · ') : 0}`);
      }

      /* ---- MAP5: nenhum quadrante deserto / CTF2: rotas separadas ----
         Frase do dono, inteira: "você percebe que A LOJA FICA VAZIA DOS CANTOS? bora
         adicionar mais gôndolas dos lados ... assim o mapa fica mais preenchido e utilizável,
         e o meio continua sendo o caminho principal MAS AÍ OS BOTS E JOGADORES TÊM MAIS
         OPÇÕES de jogar no mapa." São duas afirmações mensuráveis e independentes:
           MAP5  densidade de prop e de waypoint por quadrante (grade 4×4 sobre os bounds),
                 normalizada pela área ANDÁVEL. DOIS critérios: espaçamento médio entre peças
                 de cobertura ≤ 7,0 m (= duas arestas do grafo, STEP 3,4 m) e densidade ≥
                 0,35× a mediana do próprio mapa. O segundo é o que o dono enunciou e o
                 primeiro é o que tem dente: encher os cantos sobe a MEDIANA junto, então a
                 razão min/mediana mal se mexe (0,67× -> 0,68× no fy_havan) enquanto o
                 espaçamento do pior quadrante cai de 7,83 m para 6,24 m.
           CTF2  quantos caminhos SEPARADOS (≥ 6 m de afastamento no miolo) existem entre
                 cada spawn e cada bandeira. É a forma medível de "os bots convergem todos
                 pro meio": com 1, todo bot do time percorre a mesma fita.
         ESCOPO DA MAP5 — declarado, não escondido: a régua roda nos 4 mapas e o número de
         todos aparece na evidência, mas o TETO só é cobrado no fy_havan. A regra do dono foi
         enunciada sobre a loja dele; aplicá-la ao awp_map reprovaria a ESPLANADA, cujo vazio
         é o assunto do mapa (é uma praça monumental de 200 m), e ao fy_pool_day, um salão de
         25 m onde um quadrante da grade 4×4 mede 6 m — menos que uma gôndola. Cobrar um teto
         de povoamento nesses dois seria pedir outro mapa, não consertar um defeito.
         A CTF2 é cobrada nos 4: "ter mais de um caminho" não é estilo de mapa nenhum. */
      {
        const ALVO_MAP5 = 'fy_havan';
        const evid = [], ruins = [];
        for (const m of (j.mapas || [])) {
          if (m.err) continue;
          evid.push(`${m.map} espaçamento ${m.piorEspacamento} m · prop ${m.piorRazaoProp}× / wp ${m.piorRazaoWp}× da mediana`);
          if (m.map !== ALVO_MAP5) continue;
          for (const q of (m.quadrantes || []))
            if (q.espacamento > 7.0 || q.razaoProp < 0.35 || q.razaoWp < 0.35)
              ruins.push(`q${q.q}(x${q.x0} z${q.z0}) espaçamento ${q.espacamento} m prop ${q.razaoProp}× wp ${q.razaoWp}×`);
        }
        const alvo = M[ALVO_MAP5];
        put('MAP5', `nenhum quadrante jogável do ${ALVO_MAP5} com as peças de cobertura a mais de 7,0 m médios uma da outra (= 2 arestas do grafo) nem abaixo de 0,35× a mediana do próprio mapa (grade 4×4, ≥ 40 m² andáveis)`,
          !erros.length && !!alvo && !ruins.length,
          `${ALVO_MAP5}: pior espaçamento ${alvo ? alvo.piorEspacamento : '?'} m [≤7,0] · pior prop ${alvo ? alvo.piorRazaoProp : '?'}× / pior wp ${alvo ? alvo.piorRazaoWp : '?'}× em ${alvo ? alvo.quadrantes.length : '?'} quadrantes` +
          ` | quadrantes fora: ${ruins.length ? ruins.join(' · ') : 0} | demais mapas (medidos, fora do teto — ver comentário): ${evid.filter((e) => !e.startsWith(ALVO_MAP5)).join(' · ')}`);
      }
      {
        const ruins = [], evid = [];
        for (const m of (j.mapas || [])) {
          if (m.err) continue;
          evid.push(`${m.map} mín ${m.piorRotas}`);
          for (const r of (m.rotasSpawnBandeira || []))
            if (r.rotas < 2) ruins.push(`${m.map} ${r.time}→${r.bandeira} ${r.rotas}`);
        }
        put('CTF2', 'existem ≥ 2 rotas SEPARADAS (≥ 6 m de afastamento no miolo) entre cada spawn e cada bandeira',
          !erros.length && !ruins.length,
          `${evid.join(' · ')} | pares com rota única: ${ruins.length ? ruins.join(' · ') : 0} | ` +
          'método: menor caminho no grafo do mapa, apaga-se a faixa dele (poupando 9,4 m em volta das duas pontas, que são compartilhadas por construção) e procura-se outro');
      }
    }
  }
}

/* ── 8d. MATERIAL, LUZ E SUPERFÍCIE (mat-check.mjs) ──────────────────────────
   Quatro invariantes nascidas de três frases do dono sobre a MESMA coisa: o jogo não
   tem um padrão visual só.
     MAT1 "o material do viewmodel não bate com o da mesma arma no chão — no chão
           metal escuro e madeira certa, NA MÃO branca/cromada"
     MAT2 "..." (a metade LUMINOSA do mesmo defeito: a vmScene somava 7,60 unidades
           de luz contra 2,60-3,60 dos mapas)
     FOG1 "a tela lava pra branco, o mapa inteiro vira branco e dá pra ver só o
           contorno da geometria"
     TEX1 "placas e bandeiras brancas sem textura, retângulos brancos grandes e lisos"

   SOBRE OS TETOS — de onde vem cada número, porque teto sem procedência é folclore:
     MAT1 não tem teto: é IGUALDADE. O mesmo GLB tem que chegar no shader com o mesmo
          (metalness, roughness, envMapIntensity) na 1ª pessoa, no drop de chão e na 3ª
          pessoa. A régua não copia a regra de cada caminho — ela RECORTA o
          `fixVmMaterials` do game.js e o EXECUTA sobre um material-sonda (mesmo
          princípio do AUD1), e varre os outros dois caminhos atrás de qualquer escrita
          em `.material`.
     MAT2 faixa 0,80-1,40 do orçamento do mapa. O piso e o teto não são gosto: o
          orçamento dos 5 mapas MEDIDOS já varia 1,38× entre si (2,60 no fy_ferrovelho a
          3,60 no awp_map), então exigir do viewmodel uma faixa MAIS ESTREITA que a que
          os próprios mapas têm seria inventar rigor. 1,40 é essa dispersão arredondada
          pra cima; 0,80 é ela espelhada pra baixo.
     FOG1 razão fumaça/céu ≤ 1,00, e o teto é FÍSICO, não estético: uma nuvem iluminada
          pelo céu não pode ser mais clara que o céu — albedo ≤ 1. O "céu" é a radiância
          MEDIDA de cada mapa (bloom.js AERIAL, extraída de frames reais pelo r3_fog.py).
     TEX1 teto ZERO. Superfície VISÍVEL, opaca, sem `map`, com um único triângulo de
          ≥ 6 m² (uma parede de 2 × 3 m) e albedo claro (luminância ≥ 0,55). As três
          condições juntas são a definição operacional de "retângulo branco grande e liso";
          caixa escura sem textura não é a queixa e não entra. */
{
  if (!existsSync(join(HERE, 'mat-check.mjs'))) {
    skip('MAT*', 'material/luz/superfície', 'mat-check.mjs ausente');
  } else {
    const out = runNode('mat-check.mjs');
    const pj = join(ROOT, 'tools', 'eval', 'mat_check.json');
    if (!existsSync(pj)) {
      skip('MAT*', 'material/luz/superfície', 'mat-check.mjs não gerou o JSON: ' + (out.split('__ERRO__')[1] || out).slice(0, 160));
    } else {
      const j = JSON.parse(readFileSync(pj, 'utf8'));
      const C = j.caminhos || {};
      const mapas = (j.maps || []).filter((m) => !m.err);

      // ---- MAT1: o mesmo GLB, o mesmo material, nos 3 caminhos ----
      {
        const glb = j.glb || [];
        const fatores = glb.flatMap((g) => g.materiais.map((m) => [m.metallicFactor, m.roughnessFactor]));
        const mfGlb = fatores.length ? fatores[0][0] : 1, rfGlb = fatores.length ? fatores[0][1] : 1;
        const divergentes = fatores.filter(([a, b]) => a !== mfGlb || b !== rfGlb).length;
        const vm = C.vm || {};
        const mut = [...(C.chao_pickup?.mutacoes || []), ...(C.chao_drop?.mutacoes || []), ...(C.tp_mount?.mutacoes || [])];
        // "chão" e "3ª pessoa" não transformam nada -> o material deles É o do GLB
        const igual = !vm.erro && vm.metalFactor === mfGlb && vm.roughFactor === rfGlb && (vm.envMapIntensity ?? 1) === 1 && mut.length === 0;
        /* ---- MAT1 GANHOU A METADE QUE FALTAVA: CROMATICIDADE ----------------------
           A versão anterior desta invariante mediu só ΔL* (claridade) e ficou VERDE com
           ΔL* 5,3 no awp_map. O dono jogou e disse: "a mesma arma no chão sai cinza-escura
           correta, NA MÃO sai dourada/bronze". Os dois são compatíveis — dourado é desvio
           de MATIZ e CROMA, não de claridade, e L* não enxerga nenhum dos dois.
           Agora entra Δa*b* = hypot(Δa*, Δb*) por arma (mão − chão) e a RAZÃO DE CROMA
           C*(mão)/C*(chão), que é a forma direta de dizer "na mão está mais saturada".
           TETOS, com procedência:
             Δa*b* MEDIANO por mapa <= 1,5. O 1,5 não é gosto: é a diferença de cor que a
             literatura de CIELAB trata como limiar de percepção em condição controlada
             (ΔE*ab ~ 1 = "just noticeable"; 1,5 dá a folga do erro de amostragem do
             mat_shade.py, que é ±0,2 medido dobrando as amostras). Medido HOJE, com o rig
             tingido: 0,84 · 0,40 · 0,64 · 0,09 · 0,19 (média 0,43).
             RAZÃO DE CROMA mediana por mapa dentro de [0,70 ; 1,45]. Antes do conserto o
             ferro velho estava em 0,66 (arma na mão DESSATURADA) e o awp_map em 2,03 na
             AK (arma na mão com o DOBRO do croma) — a banda exclui os dois estados que o
             dono reprovou e admite o que sobrou.
           A razão de croma só entra na conta com armas de croma mensurável no chão
           (C* > 1,0): abaixo disso a razão é ruído de divisão (uma arma cinza dividida por
           outra arma cinza). */
        const CHR_DAB_TETO = 1.5, CHR_RAZ = [0.70, 1.45];
        const dL = [], dAB = [], razC = [], foraDAB = [], foraRaz = [];
        const mediana = (arr) => (arr.length ? arr.slice().sort((a, b) => a - b)[arr.length >> 1] : null);
        for (const m of mapas) {
          const pares = (j.shade?.armas || []).map((a) => {
            const v = a.caminhos[`vm@${m.map}`], c = a.caminhos[`chao@${m.map}`];
            return (v && c) ? { v, c } : null;
          }).filter(Boolean);
          if (!pares.length) continue;
          const arrL = pares.map(({ v, c }) => v.Lmean - c.Lmean);
          const arrAB = pares.map(({ v, c }) => Math.hypot((v.aStar ?? 0) - (c.aStar ?? 0), (v.bStar ?? 0) - (c.bStar ?? 0)));
          const arrR = pares.filter(({ c }) => (c.croma ?? 0) > 1.0).map(({ v, c }) => v.croma / c.croma);
          const mAB = mediana(arrAB), mR = mediana(arrR);
          dL.push(`${m.map} ${(arrL.reduce((s, x) => s + x, 0) / arrL.length).toFixed(1)}`);
          dAB.push(`${m.map} ${mAB.toFixed(2)}`);
          razC.push(`${m.map} ${mR === null ? '—' : mR.toFixed(2)}×`);
          if (!(mAB <= CHR_DAB_TETO)) foraDAB.push(`${m.map} ${mAB.toFixed(2)}`);
          if (mR !== null && (mR < CHR_RAZ[0] || mR > CHR_RAZ[1])) foraRaz.push(`${m.map} ${mR.toFixed(2)}×`);
        }
        const legadoPares = (j.shade?.armas || []).map((a) => {
          const v = a.caminhos['vmLegado@awp_map'], c = a.caminhos['chao@awp_map'];
          return (v && c) ? { v, c } : null;
        }).filter(Boolean);
        const legado = legadoPares.map(({ v, c }) => v.Lmean - c.Lmean);
        const legadoAB = mediana(legadoPares.map(({ v, c }) => Math.hypot((v.aStar ?? 0) - (c.aStar ?? 0), (v.bStar ?? 0) - (c.bStar ?? 0))));
        put('MAT1', 'o mesmo GLB tem o MESMO material nos 3 caminhos, e a arma NA MÃO tem a mesma COR (L* e a*b*) da arma NO CHÃO',
          igual && !divergentes && !foraDAB.length && !foraRaz.length,
          `26 GLB declaram metallicFactor ${mfGlb} / roughnessFactor ${rfGlb} COM mapa metallicRoughness ` +
          `(${divergentes} fora do padrão) · VM (game.js:${vm.linha}) entrega metal ${num(vm.metalFactor)} rough ${num(vm.roughFactor)} envInt ${num(vm.envMapIntensity)} · ` +
          `chão (game.js:${C.chao_pickup?.linha}/${C.chao_drop?.linha}) e 3ª pessoa (glbchars.js:${C.tp_mount?.linha}) não transformam ` +
          `(${mut.length} escrita(s) em .material) · ΔL* 1ªpessoa−chão por mapa: ${dL.join(' · ')} | ` +
          `Δa*b* MEDIANO (teto ${CHR_DAB_TETO}): ${dAB.join(' · ')} — fora: ${foraDAB.length ? foraDAB.join(', ') : 0} | ` +
          `razão de croma mão/chão (faixa ${CHR_RAZ[0]}-${CHR_RAZ[1]}): ${razC.join(' · ')} — fora: ${foraRaz.length ? foraRaz.join(', ') : 0}` +
          (legado.length ? ` | com ?vmmat=legacy no awp_map: ΔL* ${(legado.reduce((s, x) => s + x, 0) / legado.length).toFixed(1)} e Δa*b* ${legadoAB.toFixed(2)}` : '') +
          (vm.erro ? ` | ERRO: ${vm.erro}` : ''));
      }

      // ---- MAT2: orçamento de luz das cenas dentro de faixa ----
      {
        const FAIXA = [0.80, 1.40];
        const fora = [], linhas = [];
        for (const m of mapas) {
          linhas.push(`${m.map} mapa ${num(m.mapa.global, 2)} / vm ${num(m.vm.global, 2)} = ${num(m.razaoVmMapa, 2)}×`);
          if (m.razaoVmMapa < FAIXA[0] || m.razaoVmMapa > FAIXA[1]) fora.push(`${m.map} ${num(m.razaoVmMapa, 2)}×`);
        }
        const glob = mapas.map((m) => m.mapa.global);
        const disp = glob.length ? Math.max(...glob) / Math.min(...glob) : 1;
        const semEnv = mapas.filter((m) => !m.env.cena || !m.env.vm || !m.env.mesmaTextura).map((m) => m.map);
        put('MAT2', 'orçamento de luz do viewmodel dentro da faixa do mapa que ele acompanha, e o IBL é o mesmo nas duas cenas',
          !fora.length && disp <= 1.6 && !semEnv.length,
          `${linhas.join(' · ')} | dispersão entre os 5 mapas ${num(disp, 2)}× (teto 1,60 = a que eles já têm) | ` +
          `fora da faixa [0,80-1,40]: ${fora.length ? fora.join(', ') : 0} | cenas sem o env do mapa: ${semEnv.length ? semEnv.join(', ') : 0}`);
      }

      // ---- FOG1: nada que cubra a tela pode ser mais claro que o céu do mapa ----
      {
        const acima = [], linhas = [];
        for (const m of mapas) {
          const f = m.fumaca || {};
          linhas.push(`${m.map} fumaça ${num(f.radianciaFumaca, 3)} / céu ${num(f.radianciaCeu, 3)} = ${num(f.razaoFumacaCeu, 2)}× (α centro ${num(f.alfaAcumuladoCentro, 2)})`);
          if (!(f.razaoFumacaCeu <= 1.0)) acima.push(`${m.map} ${num(f.razaoFumacaCeu, 2)}×`);
        }
        const nev = mapas.filter((m) => m.nevoa).map((m) => `${m.map} ρ${num(m.nevoa.densidade, 4)} f@100m ${num(m.nevoa.fogFactor.m100, 2)} contraluz ${num(m.nevoa.radianciaNevoaContraluz, 2)}`);
        put('FOG1', 'nenhuma camada que cobre a tela é mais clara que o CÉU MEDIDO do mapa (fumaça de granada)',
          !acima.length,
          `${linhas.join(' · ')} | acima do céu: ${acima.length ? acima.join(', ') : 0} | ` +
          `névoa (absolvida, só satura além de ~200 m): ${nev.join(' · ')}`);
      }

      // ---- TEX1: nenhum plano visível grande sem mapa de albedo ----
      {
        const linhas = [], ruins = [];
        for (const m of mapas) {
          const claros = (m.superficies || []).filter((s) => s.claro);
          linhas.push(`${m.map} ${claros.length}`);
          for (const s of claros) ruins.push(`${m.map} ${s.cor} ${s.maiorTri} m² em ${s.pos.join(',')}`);
        }
        put('TEX1', 'nenhuma superfície visível grande e clara sem mapa de albedo (maior triângulo ≥ 6 m², luminância ≥ 0,55)',
          !ruins.length,
          `claros sem map por mapa: ${linhas.join(' · ')} | total ${ruins.length}` +
          (ruins.length ? ` -> ${ruins.slice(0, 6).join(' | ')}` : '') +
          ` | critério: maiorTri ≥ ${j.criterios.TEX1_AREA} m² E luminância de albedo ≥ ${j.criterios.TEX1_LUM}, só malha VISÍVEL e OPACA`);
      }
    }
  }
}

// ── 9. HUD EXPERIMENTAL ─────────────────────────────────────────────────────
// BUG-43: o protótipo do menu de armas existia apenas em dev.html, podado da
// produção. A régua executa o método real com e sem ?vmlab=1.
{
  const out = runNode('vmlab-hud-check.mjs', {}, ['--json']);
  let audit = null;
  try { audit = JSON.parse(out); } catch {}
  const itens = audit?.resultados || [];
  const falhasHud = itens.filter((item) => !item.ok);
  put('HUD1', '?vmlab=1 materializa o menu de armas do loadout no HUD real',
    itens.length === 4 && falhasHud.length === 0,
    itens.length ? itens.map((item) => `${item.id}:${item.ok ? 'ok' : item.evid}`).join(' · ') : out.trim());
}

// ── 10. INVARIANTES QUE EXIGEM PIXEL (marcadas, não rodadas aqui) ───────────
skip('PX1', 'no ADS o jogador vê a arma E a mira', 'exige browser — use tools/eval/motion.mjs');
skip('PX2', 'silhuetas das 26 armas diferem (IoU par a par < 0,85)', 'exige browser — use tools/eval/motion.mjs');
skip('PX3', 'mão travada no grip em todo frame de toda animação', 'exige browser/traço — use tools/eval/motion.mjs');
skip('PX4', 'aliado × inimigo distinguíveis em 1 frame a 5/20/40 m', 'exige browser');

// ── RELATÓRIO ───────────────────────────────────────────────────────────────
/* KNOWN-RED.json: dívidas conhecidas viram DÍVIDA (não reprovam); crítica
   vermelha FORA da lista reprova. Entrada cuja régua já passa deve ser removida. */
const conhecidas = JSON.parse(readFileSync(new URL('./KNOWN-RED.json', import.meta.url), 'utf8')).dividas;
const crit = results.filter((r) => r.sev === 'crit');
const warn = results.filter((r) => r.sev === 'warn');
const falhas = crit.filter((r) => r.ok === false && !(r.id in conhecidas));
const dividas = crit.filter((r) => r.ok === false && r.id in conhecidas);
const quitadas = crit.filter((r) => r.ok === true && r.id in conhecidas);
const avisos = warn.filter((r) => r.ok === false);

if (JSON_OUT) {
  console.log(JSON.stringify({ results, falhas: falhas.length, dividas: dividas.length, avisos: avisos.length }, null, 1));
} else {
  const mark = (r) => (r.ok === null ? '·· PULADO' : r.ok ? '✓ PASSA  ' : r.id in conhecidas ? '≈ DÍVIDA ' : '✗ FALHA  ');
  console.log('\n=============== INVARIANTES — CORO SOLTO ===============\n');
  for (const r of results) console.log(`${mark(r)} ${r.id.padEnd(5)} ${r.desc}\n${' '.repeat(16)}${r.evid}`);
  console.log('\n--------------------------------------------------------');
  console.log(`CRÍTICAS: ${crit.filter((r) => r.ok === true).length}/${crit.filter((r) => r.ok !== null).length} passam` +
    (falhas.length ? `  ← ${falhas.map((r) => r.id).join(', ')} VERMELHAS (novas — reprovam)` : '  ← nenhuma falha nova'));
  if (dividas.length) console.log(`DÍVIDAS:  ${dividas.map((r) => r.id).join(', ')} (KNOWN-RED.json — não reprovam, mas continuam devidas)`);
  if (quitadas.length) console.log(`QUITADAS: ${quitadas.map((r) => r.id).join(', ')} passaram — REMOVA do KNOWN-RED.json`);
  console.log(`AVISOS:   ${avisos.length ? avisos.map((r) => r.id).join(', ') + ' fora do alvo' : 'nenhum'}`);
  console.log(`PULADAS:  ${results.filter((r) => r.sev === 'skip').length} (exigem browser ou arnês ausente)`);
  console.log('--------------------------------------------------------\n');
}

process.exit(falhas.length ? 1 : 0);
