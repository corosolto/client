/* FOTO x RENDER — quanto os nossos mapas estao longe de uma fotografia real.
 *
 * POR QUE EXISTE
 * Pedido literal do dono: "vamos focar em analisar contra uma fotografia real e
 * fazer a IA entender tudo isso, escala, profundidade, topografia, altura,
 * comprimento, angulo etc". Ate' aqui ninguem sabia dizer QUANTO faltava — so'
 * "ta feio" —, e por isso a iteracao visual andou dias no escuro.
 *
 * O QUE ELE FAZ
 * Roda `foto_vs_render.py` (o motor de descritores) em DOIS conjuntos que
 * passam pelo MESMO cano: fotografias reais de favela e frames do jogo. O alvo
 * de cada descritor NAO e' inventado — e' a distribuicao medida nas fotos. O
 * relatorio e' o GAP, em desvios da propria foto.
 *
 * A REGRA QUE FAZ ISTO SER REGUA E NAO RELATORIO
 *  1. ALVO VEM DA FOTO. Nenhum numero redondo escolhido a mao. `alvo` = mediana
 *     das fotos; `sigma` = MAD x 1,4826 das fotos. Gap = (mapa - alvo) / sigma.
 *  2. DESCRITOR CEGO E' CORTADO. Antes de ranquear, cada descritor e' testado
 *     por AUC (probabilidade de separar uma foto de um render tirados ao
 *     acaso). Abaixo de `AUC_MIN` ele NAO entra na distancia e sai marcado
 *     CEGO na tabela. Regua com descritor cego e' pior que regua nenhuma.
 *  3. PISO DE RUIDO. Cada mapa e' medido em 4 yaws. Se a diferenca ENTRE mapas
 *     nao for maior que a variacao DENTRO do mesmo mapa, a regua nao pode
 *     ranquear mapa nenhum — e diz isso.
 *  4. DUAS ESCALAS. Reamostrar muda espectro e histograma de aresta (a
 *     armadilha da rodada). Tudo roda em 0,55 MP e 0,25 MP e o relatorio
 *     compara os dois rankings. Ranking que nao sobrevive a troca de escala e'
 *     artefato, nao achado.
 *
 * USO
 *   node tools/eval/foto-vs-render.mjs --fotos=DIR --renders=DIR [--escala=a|b]
 *   node tools/eval/foto-vs-render.mjs --mutantes=FOTO.jpg     # o teste do teste
 *   ... --json   sai o objeto inteiro em vez da tabela
 *
 * PORTAO DE MAPA NOVO
 * Com `--portao`, um mapa reprova se ficar pior que `GAP_MAX` sigmas da foto
 * em qualquer descritor NAO-cego. O limiar sai da propria amostra (ver
 * GAP_MAX) e o mapa citado na mensagem vem junto do conserto sugerido.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MOTOR = join(HERE, 'foto_vs_render.py');

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const tem = (n) => process.argv.includes(`--${n}`);

/* AUC_MIN = 0,80. Um descritor que separa foto de render em menos de 80% dos
   pares sorteados nao sustenta ranking de mapa: a diferenca entre dois mapas
   nossos e' MENOR que a diferenca foto-vs-jogo, entao um descritor que ja'
   titubeia no caso facil nao vai acertar o dificil.

   ATENCAO, o corte AQUI E' CONSEQUENTE — e este comentario ja' mentiu uma vez.
   A versao anterior dizia que os descritores uteis mediam 1,00, os inuteis
   <0,72, e que portanto qualquer corte no vao dava o mesmo resultado. Depois de
   consertar a contaminacao de HUD no `ceu_frac`, a distribuicao real medida em
   18 fotos x 40 frames ficou CONTINUA: 0,95 · 0,87 · 0,79 · 0,77 · 0,76 · 0,75 ·
   0,74 · 0,69 · ... Nao ha' vao. Mover o corte para 0,75 admitiria mais quatro
   descritores; 0,80 e' uma escolha conservadora e ARBITRARIA, nao derivada, e
   quem mexer nela tem de reportar o ranking nos dois cortes. */
const AUC_MIN = 0.80;
/* GAP_MAX = 3 sigmas. Derivado da amostra, mas como RATCHET, nao como alvo:
   e' a mediana do "pior gap" dos 10 mapas vivos (valores medidos na escala n:
   1,1 · 2,0 · 2,1 · 2,5 · 2,8 · 2,8 · 5,1 · 5,4 · 6,7 · 9,6 -> mediana 2,8,
   arredondada para 3,0). Ou seja, hoje ele reprova a metade PIOR do proprio
   acervo (praca_poderes, fy_escadao, fy_mansao, loja_h) e aprova a metade
   melhor. E' um piso para impedir que mapa novo nasca abaixo do que ja' existe;
   NAO e' "perto de uma foto". Cada vez que a base melhorar, este numero desce —
   se ele parar de reprovar alguem, virou decoracao. */
const GAP_MAX = 3.0;

function py(args) {
  const r = spawnSync('python3', [MOTOR, ...args], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error(`x motor de medida falhou: ${(r.stderr || r.stdout || '').slice(0, 4000)}`);
    process.exit(2);
  }
  return JSON.parse(r.stdout);
}

const imgs = (d) => readdirSync(d).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => join(d, f));

// mediana / MAD robustos: a amostra de fotos e' pequena e tem outlier por
// composicao (foto com muito ceu, foto sem ceu). Media e desvio simples
// deixariam uma foto so' definir o alvo.
const med = (v) => {
  const a = v.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const mad = (v) => {
  const m = med(v);
  return Number.isFinite(m) ? med(v.filter(Number.isFinite).map((x) => Math.abs(x - m))) * 1.4826 : NaN;
};

/* AUC de Mann-Whitney: probabilidade de um render sorteado ficar de um lado e
   uma foto sorteada do outro. 0,5 = cego; 1,0 = separa sempre. Simetrizado
   (max(a, 1-a)) porque a DIRECAO nao importa para saber se separa. */
function auc(as, bs) {
  const A = as.filter(Number.isFinite);
  const B = bs.filter(Number.isFinite);
  if (A.length < 3 || B.length < 3) return NaN;
  let s = 0;
  for (const a of A) for (const b of B) s += a > b ? 1 : a === b ? 0.5 : 0;
  const v = s / (A.length * B.length);
  return Math.max(v, 1 - v);
}

const CAMPOS = [
  ['obliqua_10', '1 angulo', 'massa de aresta FORA de 0/90 graus'],
  ['angulos_distintos', '1 angulo', 'bins de 5 graus com >=1% da massa'],
  ['orient_entropia', '1 angulo', 'entropia do histograma de orientacao'],
  ['espectro_incl', '2 detalhe', 'inclinacao log-log do espectro radial'],
  ['meio_sobre_baixa_db', '2 detalhe', 'energia media / baixa (dB)'],
  ['alta_sobre_baixa_db', '2 detalhe', 'energia alta / baixa (dB)'],
  ['juncao_dens', '3 profund', 'densidade de juncao (3+ orientacoes)'],
  ['contraste_espalh', '3 profund', 'espalhamento do contraste local'],
  ['ceu_frac', '4 altura', 'fracao de ceu no quadro'],
  ['linha_media', '4 altura', 'onde a linha do ceu corta (0=topo)'],
  ['linha_serrilha', '4 altura', 'serrilhado da linha do ceu'],
  ['escala_entropia', '5 escala', 'entropia da energia por oitava'],
  ['superf_sd', '6 superf', 'desvio de L* dentro da superficie'],
  ['superf_chapada', '6 superf', 'fracao de blocos com desvio < 2,0'],
];

const mapaDe = (f) => (basename(f).match(/^game-([a-z0-9_]+)-(?:169|32)-[a-d]\./) || [])[1] || null;

function medir(caminhos, escala, ui = false) {
  const saida = [];
  for (let i = 0; i < caminhos.length; i += 12) {
    saida.push(...py([...caminhos.slice(i, i + 12), `--escala=${escala}`, ...(ui ? ['--ui'] : [])]));
  }
  const ruins = saida.filter((s) => s._erro);
  if (ruins.length) { // nao saber medir custa o mesmo que estar errado
    console.error(`x ${ruins.length} imagem(ns) ilegivel(is): ${ruins.map((r) => `${basename(r.arquivo)} (${r._erro})`).join(', ')}`);
    process.exit(2);
  }
  return saida;
}

function analisar(fotos, renders) {
  const porMapa = new Map();
  for (const r of renders) {
    const m = mapaDe(r.arquivo);
    if (!m) continue;
    if (!porMapa.has(m)) porMapa.set(m, []);
    porMapa.get(m).push(r);
  }
  const linhas = [];
  for (const [campo, grupo, oque] of CAMPOS) {
    const vf = fotos.map((x) => x[campo]);
    const vr = renders.map((x) => x[campo]);
    const alvo = med(vf);
    const sigma = mad(vf);
    const a = auc(vr, vf);
    const mapas = {};
    for (const [m, fs] of porMapa) {
      const v = med(fs.map((x) => x[campo]));
      mapas[m] = { v, gap: Number.isFinite(sigma) && sigma > 0 ? (v - alvo) / sigma : NaN };
    }
    /* SIGMA ~ 0 = as fotos sao UNANIMES naquele descritor. Dividir por isso
       cospe z-score de 12 sigmas e o descritor sequestra o ranking sem ter
       poder nenhum. Nesse caso ele nao vira distancia — vira observacao
       categorica ("as N fotos medem X"). Piso: 2% da mediana. */
    const degenerado = !(Number.isFinite(sigma) && sigma > Math.abs(alvo) * 0.02 && sigma > 1e-9);
    linhas.push({
      campo, grupo, oque, alvo, sigma, auc: a, degenerado,
      cego: degenerado || !(a >= AUC_MIN),
      indefFoto: vf.filter((x) => !Number.isFinite(x)).length,
      indefRender: vr.filter((x) => !Number.isFinite(x)).length,
      render: med(vr), mapas,
    });
  }
  return { linhas, porMapa };
}

/* PISO DE RUIDO: os 4 yaws do mesmo mapa sao a mesma cena — o que varia entre
   eles e' o que a regua NAO consegue distinguir. Se o espalhamento entre mapas
   nao for maior que esse, nao existe ranking. */
function pisoDeRuido(linhas, porMapa) {
  const out = [];
  for (const l of linhas.filter((x) => !x.cego)) {
    const dentro = [...porMapa.values()].map((fs) => {
      const v = fs.map((x) => x[l.campo]).filter(Number.isFinite);
      return v.length >= 3 ? mad(v) / (l.sigma || NaN) : NaN;
    }).filter(Number.isFinite);
    const entre = mad(Object.values(l.mapas).map((m) => m.gap));
    out.push({ campo: l.campo, dentroMapa: med(dentro), entreMapas: entre,
               ranqueavel: entre > 1.5 * med(dentro) });
  }
  return out;
}

const n = (x, c = 2) => (Number.isFinite(x) ? x.toFixed(c) : '  --');

function tabela(res, escala) {
  const maps = [...res.porMapa.keys()];
  console.log(`\n=== GAP POR DESCRITOR (escala ${escala}) — em sigmas da FOTO ===`);
  console.log(`    alvo = mediana das fotos | sigma = MAD x 1,4826 das fotos | AUC = separa foto de render?\n`);
  const w = 22;
  console.log(['descritor'.padEnd(w), 'alvo'.padStart(7), 'sigma'.padStart(7), 'AUC'.padStart(5), '', ...maps.map((m) => m.slice(0, 9).padStart(10))].join(' '));
  for (const l of res.linhas) {
    const marca = l.degenerado ? 'UNAN' : l.cego ? 'CEGO' : '    ';
    const cel = maps.map((m) => {
      const g = l.mapas[m].gap;
      return (l.cego ? '  .' : Number.isFinite(g) ? (g > 0 ? '+' : '') + g.toFixed(1) : '--').padStart(10);
    });
    console.log([l.campo.padEnd(w), n(l.alvo).padStart(7), n(l.sigma).padStart(7), n(l.auc).padStart(5), marca, ...cel].join(' '));
  }
  const uteis = res.linhas.filter((l) => !l.cego);
  console.log(`\n  ${uteis.length}/${res.linhas.length} descritores separam foto de render (AUC >= ${AUC_MIN}). Os CEGO nao entram na distancia.`);

  console.log(`\n=== RANKING DOS MAPAS (distancia mediana |gap| nos descritores nao-cegos) ===`);
  const rank = maps.map((m) => ({
    m, d: med(uteis.map((l) => Math.abs(l.mapas[m].gap))),
    pior: uteis.map((l) => ({ c: l.campo, g: l.mapas[m].gap }))
      .filter((x) => Number.isFinite(x.g)).sort((a, b) => Math.abs(b.g) - Math.abs(a.g))[0],
  })).sort((a, b) => a.d - b.d);
  rank.forEach((r, i) => console.log(
    `  ${String(i + 1).padStart(2)}. ${r.m.padEnd(16)} ${n(r.d).padStart(6)} sigma   pior: ${r.pior ? `${r.pior.c} ${r.pior.g > 0 ? '+' : ''}${r.pior.g.toFixed(1)}` : '--'}`));
  return rank;
}

// ---------------------------------------------------------------------------
if (tem('mutantes') || arg('mutantes')) {
  const foto = arg('mutantes');
  const dir = mkdtempSync(join(tmpdir(), 'fvr-mut-'));
  const muts = py(['mutar', foto, dir]);
  const base = medir([foto], 'a')[0];
  const meds = medir(muts.map((m) => m.caminho), 'a');
  console.log(`\n=== MUTANTES (o teste do teste) — base: ${basename(foto)} ===`);
  console.log(`    cada mutante degrada UMA foto real num eixo so'. O descritor certo tem de se mover.\n`);
  const OLHAR = ['obliqua_10', 'espectro_incl', 'meio_sobre_baixa_db', 'alta_sobre_baixa_db', 'superf_sd', 'superf_chapada'];
  console.log(['mutante'.padEnd(15), ...OLHAR.map((c) => c.slice(0, 12).padStart(13))].join(' '));
  console.log(['BASE'.padEnd(15), ...OLHAR.map((c) => n(base[c]).padStart(13))].join(' '));
  for (let i = 0; i < muts.length; i++) {
    console.log([muts[i].nome.padEnd(15), ...OLHAR.map((c) => {
      const d = meds[i][c] - base[c];
      return `${n(meds[i][c])} (${d > 0 ? '+' : ''}${n(d)})`.padStart(13);
    })].join(' '));
  }
  console.log('\n  esperado por mutante:');
  muts.forEach((m) => console.log(`    ${m.nome.padEnd(15)} ${m.espera}`));
  process.exit(0);
}

const dirF = arg('fotos');
const dirR = arg('renders');
if (!dirF || !dirR) {
  console.error('uso: node tools/eval/foto-vs-render.mjs --fotos=DIR --renders=DIR [--escala=a|b] [--json] [--portao]');
  process.exit(2);
}
const escalas = arg('escala') ? [arg('escala')] : ['a', 'b'];
const tudo = {};
let rankA = null;
for (const e of escalas) {
  const res = analisar(medir(imgs(dirF), e), medir(imgs(dirR), e, !tem('sem-ui')));
  const rank = tem('json') ? null : tabela(res, e);
  // o portao usa o ranking da PRIMEIRA escala rodada, seja ela qual for. Antes
  // isto era `if (e === 'a')`, e com `--escala=n --portao` o portao passava
  // calado por falta de dado — o pior tipo de verde que existe.
  if (!rankA) rankA = rank;
  else if (rank) {
    const ra = rankA.map((x) => x.m), rb = rank.map((x) => x.m);
    const desloc = ra.map((m, i) => Math.abs(i - rb.indexOf(m)));
    console.log(`\n=== ESTABILIDADE DE ESCALA (a=0,55MP vs b=0,25MP) ===`);
    console.log(`  deslocamento maximo no ranking: ${Math.max(...desloc)} posicao(oes); mediano: ${med(desloc)}`);
    console.log(`  ${Math.max(...desloc) <= 2 ? 'OK — o ranking sobrevive a' : 'ATENCAO — o ranking MUDA com a'} reamostragem.`);
  }
  if (!tem('json')) {
    const piso = pisoDeRuido(res.linhas, res.porMapa);
    console.log(`\n=== PISO DE RUIDO (escala ${e}) — espalhamento entre os 4 yaws do MESMO mapa ===`);
    for (const p of piso) {
      console.log(`  ${p.campo.padEnd(22)} dentro ${n(p.dentroMapa).padStart(5)} s | entre ${n(p.entreMapas).padStart(6)} s | ${p.ranqueavel ? 'ranqueavel' : 'NAO ranqueavel (ruido come o sinal)'}`);
    }
    const indef = res.linhas.filter((l) => l.indefFoto || l.indefRender);
    if (indef.length) {
      console.log(`\n=== INDEFINIDOS (nao medido != medido zero) ===`);
      for (const l of indef) console.log(`  ${l.campo.padEnd(22)} ${l.indefFoto} foto(s) e ${l.indefRender} frame(s) sem a grandeza`);
    }
  }
  tudo[e] = res.linhas;
}
if (tem('json')) console.log(JSON.stringify(tudo, null, 2));

if (tem('portao') && rankA) {
  const ruins = rankA.filter((r) => r.pior && Math.abs(r.pior.g) > GAP_MAX);
  if (ruins.length) {
    console.error(`\nx ${ruins.length} mapa(s) acima de ${GAP_MAX} sigmas da foto real:`);
    for (const r of ruins) console.error(`    ${r.m}: ${r.pior.c} a ${r.pior.g.toFixed(1)} sigmas — o mapa nao tem a grandeza que TODA foto de favela tem.`);
    process.exit(1);
  }
  console.log(`\nOK todos os mapas dentro de ${GAP_MAX} sigmas da foto real.`);
}
