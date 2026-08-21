/* ============================================================================
   graffiti-layout-check.mjs — O LAYOUT DE GRAFITE NÃO ENVELHECE EM SILÊNCIO.
   ----------------------------------------------------------------------------
   POR QUE ESTA RÉGUA EXISTE (issue #82)

   A colocação do grafite dos 5 mapas é ASSADA em `public/js/graffiti_layout.js`:
   ~2.000 retângulos gerados por `npm run grafite`, que roda a passada NUM NAVEGADOR
   de verdade (único lugar onde os GLB existem). O jogo só monta a geometria pronta.
   O preço está escrito no cabeçalho do `gen-graffiti-layout.mjs`: LAYOUT VELHO É
   PEÇA NO LUGAR ERRADO. Mexeu na geometria de um mapa, na passada ou no pool de
   decalque e não regerou? A tinta continua colada onde a parede estava ontem — e
   nada no portão percebe, porque o `check:fast` não abre navegador e o `decal-probe`
   roda em node, onde nenhum GLB carrega.

   Hoje isso dependia de alguém LEMBRAR de rodar `npm run grafite`. Memória de pessoa
   não é mecanismo. Esta régua é o mecanismo — node puro, milissegundos, no portão.

   ── O QUE ELA COBRA (e o que NÃO cobra, honestamente) ───────────────────────
   Ela NÃO re-roda a passada: sem navegador nem GLB, o número de cobertura é cego
   (é a `graffiti-census` que mede aquilo, e ela EXIGE navegador). Esta aqui trava
   as ENTRADAS e a COERÊNCIA da saída, que são node-detectáveis:

   MANIFESTO (a saída assada é coerente com os pools de HOJE)
     M1  os mapas do layout == os mapas que chamam `grafitar` (nenhum a mais/menos)
     M2  cada peça é `[a,x,y,z,ry,w,h]`: `a` inteiro em faixa, números finitos,
         arredondados a ≤3 casas (o contrato de determinismo do gerador)
     M3  todo nome em `arquivos` é USADO por ≥1 peça (sem nome morto)
     M4  todo nome de `arquivos` ainda existe no pool vivo (DECAL_FILES/POSTER_FILES
         do textures.js) — nome que saiu do pool e ficou no layout é órfão: a peça
         cola PNG que não existe mais (404 branco em produção). É o #82 no arquivo.
     M5  todo mural referencia uma homenagem que existe (MURAIS_HOM)
     M6  nenhum mapa colapsou para zero peça

   FRESCOR (a entrada de hoje bate com a que gerou o layout)
     F1  o hash da passada (`graffiti_pass.js` normalizado) bate com o gravado no
         layout — algoritmo de banda/âncora mudou sem regerar → VERMELHO
     F2  o hash de cada `map_*.js` normalizado bate com o gravado — geometria de
         parede OU bloco `grafitar` (semente/banda/pool) mudou sem regerar → VERMELHO

   A impressão digital mora no MESMO módulo que o gerador usa para gravá-la
   (`graffiti-fingerprint.mjs`): uma origem só, senão o instrumento discorda de si.

   ── ALTERNATIVA ESCOLHIDA (o #82 pede para declarar) ────────────────────────
   O #82 oferece duas saídas: (a) um job de CI que sobe o navegador, re-assa num
   arquivo temporário e compara; (b) um HASH das entradas gravado no layout, e uma
   régua que só compara o hash. Escolhi (b). Motivo: (a) custa ~40 s por mapa e EXIGE
   navegador — fica fora do `check` node, igual ao `eval:boot`/`eval:cena`, e vira
   passo de pré-deploy que raramente roda. (b) custa milissegundos, roda em TODO PR
   no `check:fast`, e morde o defeito nomeado no aceite ("mexer numa coordenada de
   parede sem regerar faz o job falhar"). Perde a precisão de re-medir a colocação
   peça a peça — essa continua sendo dever da `graffiti-census`, no navegador.

   uso:
     node tools/eval/graffiti-layout-check.mjs
     node tools/eval/graffiti-layout-check.mjs --duplo        (prova o determinismo)
     node tools/eval/graffiti-layout-check.mjs --mutante=<m>
       orfao      injeta nome de PNG fora do pool no layout            (prova M4)
       morto      injeta nome em `arquivos` que nenhuma peça usa       (prova M3)
       mapa       remove um mapa do layout                             (prova M1)
       vazio      zera as peças de um mapa                             (prova M6)
       mural      renomeia um mural para homenagem inexistente         (prova M5)
       geometria  finge parede editada sem regerar (muda o fonte)      (prova F2)
       passada    finge passada editada sem regerar                    (prova F1)
   ============================================================================ */
import { pathToFileURL } from 'node:url';
import { impressao, universoDecals, MAP_SOURCES } from './graffiti-fingerprint.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const DUPLO = process.argv.includes('--duplo');
const LAYOUT = 'public/js/graffiti_layout.js';

const mod = await import(pathToFileURL(LAYOUT).href);
const GRAFITE = structuredClone(mod.GRAFITE || {});
const FP_GRAVADO = mod.GRAFITE_FP || null;
const universo = universoDecals();
let FP_ATUAL = impressao();

/* --- MUTANTES: injetam o defeito no que a régua LÊ e provam que ela morde. ----- */
const primeiroMapa = Object.keys(GRAFITE)[0];
if (MUT === 'orfao') GRAFITE[primeiroMapa].arquivos[0] = 'FANTASMA-fora-do-pool.png';
if (MUT === 'morto') { GRAFITE[primeiroMapa].arquivos.push('or-graf-coro.png'); } // nome real do pool, mas sem peça apontando
if (MUT === 'mapa') delete GRAFITE[primeiroMapa];
if (MUT === 'vazio') GRAFITE[primeiroMapa].pecas = [];
if (MUT === 'mural') { const m = GRAFITE[primeiroMapa].murais; if (m && m.length) m[0][0] = 'homenagem-fantasma'; }
if (MUT === 'geometria') FP_ATUAL = { ...FP_ATUAL, maps: { ...FP_ATUAL.maps, [primeiroMapa]: 'deriva' + FP_ATUAL.maps[primeiroMapa] } };
if (MUT === 'passada') FP_ATUAL = { ...FP_ATUAL, pass: 'deriva' + FP_ATUAL.pass };

/* --- as cláusulas ------------------------------------------------------------- */
function avaliar() {
  const falhas = [];
  const mapasLayout = Object.keys(GRAFITE).sort();
  const mapasFonte = Object.keys(MAP_SOURCES).sort();

  // M1
  for (const id of mapasFonte) if (!GRAFITE[id]) falhas.push(`M1 mapa '${id}' chama grafitar mas não está no layout — rode 'npm run grafite ${id}'`);
  for (const id of mapasLayout) if (!MAP_SOURCES[id]) falhas.push(`M1 mapa '${id}' está no layout mas nenhum fonte o declara`);

  for (const [id, e] of Object.entries(GRAFITE)) {
    const usados = new Set();
    // M2
    e.pecas.forEach((p, k) => {
      if (!Array.isArray(p) || p.length !== 7) { falhas.push(`M2 ${id} peça ${k} não é [a,x,y,z,ry,w,h] (len ${p && p.length})`); return; }
      const [a, ...nums] = p;
      if (!Number.isInteger(a) || a < 0 || a >= e.arquivos.length) falhas.push(`M2 ${id} peça ${k}: índice de arquivo ${a} fora de faixa (0..${e.arquivos.length - 1})`);
      for (const v of nums) {
        if (!Number.isFinite(v)) { falhas.push(`M2 ${id} peça ${k}: número não-finito`); break; }
        if (Math.abs(v - Math.round(v * 1000) / 1000) > 1e-9) falhas.push(`M2 ${id} peça ${k}: ${v} tem mais de 3 casas (contrato de determinismo)`);
      }
      if (Number.isInteger(a)) usados.add(a);
    });
    // M3 + M4
    e.arquivos.forEach((nome, idx) => {
      if (!usados.has(idx)) falhas.push(`M3 ${id} arquivo '${nome}' (idx ${idx}) não é usado por nenhuma peça — nome morto`);
      const ok = nome.startsWith('poster:') ? universo.posters.has(nome.slice(7)) : universo.decals.has(nome);
      if (!ok) falhas.push(`M4 ${id} arquivo '${nome}' não existe mais no pool (DECAL_FILES/POSTER_FILES) — peça órfã, PNG 404. Regere: 'npm run grafite ${id}'`);
    });
    // M5
    for (const m of (e.murais || [])) if (!universo.murais.has(m[0])) falhas.push(`M5 ${id} mural '${m[0]}' não está em MURAIS_HOM`);
    // M6
    if (!e.pecas.length) falhas.push(`M6 ${id} está sem peça nenhuma — layout colapsou`);
  }

  // F1 + F2
  if (!FP_GRAVADO) {
    falhas.push('F1 layout não tem GRAFITE_FP gravado — rode \'npm run grafite\' para gravar a impressão das entradas');
  } else {
    if (FP_GRAVADO.pass !== FP_ATUAL.pass) falhas.push(`F1 graffiti_pass.js mudou (${FP_GRAVADO.pass} → ${FP_ATUAL.pass}) e o layout não foi regerado — rode 'npm run grafite'`);
    for (const id of mapasFonte) {
      if (FP_GRAVADO.maps?.[id] !== FP_ATUAL.maps[id]) falhas.push(`F2 ${id} (map_*.js) mudou (${FP_GRAVADO.maps?.[id]} → ${FP_ATUAL.maps[id]}) e o layout não foi regerado — geometria ou banda velha. Rode 'npm run grafite ${id}'`);
    }
  }
  return falhas;
}

const falhas = avaliar();

if (DUPLO) {
  const a = JSON.stringify(impressao()), b = JSON.stringify(impressao());
  if (a !== b) { console.error('DETERMINISMO QUEBRADO: impressao() deu saídas diferentes em duas leituras'); process.exit(1); }
  console.log('  ✓ impressao() é determinística (duas leituras idênticas)');
}

const totalPecas = Object.values(GRAFITE).reduce((s, e) => s + (e.pecas?.length || 0), 0);
console.log(`GRAFFITI-LAYOUT-CHECK: ${Object.keys(GRAFITE).length} mapas · ${totalPecas} peças · pool ${universo.decals.size} decals / ${universo.posters.size} cartazes / ${universo.murais.size} murais${MUT ? ` · mutante=${MUT}` : ''}`);
if (falhas.length) {
  for (const f of falhas) console.error('  ✗', f);
  process.exit(1);
}
console.log('  ✓ manifesto coerente e entradas frescas (layout não envelheceu)');
