/* faccao-paleta-check.mjs — A COR DE FACÇÃO TEM UMA ORIGEM SÓ, E ELA COBRE O ELENCO.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTA RÉGUA (07/08)

   O dono, jogando: *"o time é quando captura bandeira não pinta de vermelho e nem põe o
   brasão."* — e era literal. `bandeiraTextura('E')` devolvia `null` na primeira linha:

     brasoes.js:126   if (!cor || !BRASAO[fac]) return null;

   `BRASAO` tinha sido renomeado no rename Time E (06/08) — `P` virou `E`, e o arquivo
   `img/brasoes/e.png` existe. `COR_TIME`, três linhas acima, NÃO foi. Com `COR_TIME['E']`
   indefinido a função saía por `!cor`, o `_flagTexFor` caía no pano procedural, e a
   bandeira do time do jogador ficava sem cor E sem brasão — os dois sintomas de uma
   causa só, que é exatamente como o dono descreveu.

   E não era um lugar: o mesmo rename passou batido em mais DOIS espelhos, com sintoma
   diferente cada um, e nenhum deles dá erro no console —

     characters.js  TEAM_RIM       sem `E` -> contorno BRANCO nos 8 do elenco E (o `|| 0xffffff`)
     characters.js  faixa do peito sem `E` -> cai no último ramo do ternário e sai AZUL

   ── O QUE MUDOU NESTA RÉGUA, E POR QUÊ ──────────────────────────────────────────
   A versão anterior comparava os espelhos entre si: lia `COR_TIME` do texto de
   `brasoes.js`, lia `_teamColor` do texto de `game.js`, e acusava quando os dois
   discordavam. Ela funcionava — e mesmo assim o defeito chegou em produção, porque
   comparar cópias só acusa DEPOIS que alguém escreveu a divergência.

   Os espelhos acabaram: a cor de facção agora nasce em `public/js/paleta.js` e é
   importada por `game.js`, `brasoes.js` e `characters.js`. Com um fato só, "os dois
   discordam" deixou de ser um estado possível, e a régua muda de pergunta:

     F1 · toda facção do ELENCO tem entrada COMPLETA em `PALETA` (os três tons).
          É a mesma pergunta de sempre — foi ela que o rename Time E reprovaria — só que
          agora contra uma tabela em vez de três.
     F2 · NÃO nasceu espelho novo: nenhum outro módulo de `public/js/` declara tabela ou
          ternário de cor indexado por letra de facção. É a cláusula que impede a
          duplicação de VOLTAR, e é ela que substitui o antigo F2 de comparação.
     F3 · o `palida` de cada facção alcança 4,5:1 sobre o chip do killfeed. (12/08)
     F4 · os hexes de PALETA batem com o registro do elenco, `factions.js`. (12/08)

   ── O QUE F3 E F4 CONSERTARAM NA RÉGUA (12/08) ──────────────────────────────────
   Dos três tons, `palida` é o ÚNICO com alvo numérico escrito — 4,5:1 da WCAG 1.4.3 — e
   era justamente o que ninguém media. F1 só perguntava "existe?", então um `palida`
   escuro demais passava: a chave está lá, o valor é um hex válido, e o texto do killfeed
   fica ilegível sem uma linha de erro em lugar nenhum. Preencher as cinco facções novas
   sem F3 seria escolher cinco cores no olho e chamar isso de verde.

   F4 é o par de F3 e nasce do mesmo defeito de 07/08. A cor de facção é decisão editorial
   e mora em `factions.js`; `paleta.js` não pode importar de lá (ciclo no boot — ver o
   cabeçalho dele), então carrega uma CÓPIA. Cópia sem régua foi exatamente o rename Time E.
   F4 é o pedágio da cópia: compara os dois arquivos hex a hex, os trinta valores.

   ── O MODELO DE F3, E ONDE ELE É OTIMISTA ───────────────────────────────────────
   O chip é `background:${cor}2e` (a própria cor a 18%) sobre a linha do killfeed, e a
   linha tem TRÊS fundos declarados em `style.css` — `.kf-row` (scrim bg-900 a 82%),
   `.me-atk` e `.me-vic`. F3 compõe o chip sobre os três e cobra o PIOR.

   Este modelo é estático e o UI1 do `ui-check.mjs` mede o DOM vivo; os dois não batem na
   vírgula. No mesmo ponto de ancoragem — o `palida` do Time E — o modelo estático dá
   6,62:1 e o número que `paleta.js` registra do UI1 é 5,9:1. O estático lê ~0,7 ALTO, ou
   seja, para o lado errado. Por isso o gate é 4,5:1 mas há um aviso de MARGEM CURTA
   abaixo de 5,5:1: valor nessa faixa passa aqui e pode reprovar no UI1, e quem estiver
   ali deve conferir no `ui-check.mjs` antes de comemorar. As dez de hoje estão em
   6,6-9,4:1, bem fora da faixa de dúvida, então a diferença de modelo não decide nada —
   mas ela está escrita para o dia em que decidir.

   As constantes de fundo e o `2e` do chip são CÓPIA de `style.css` e `game.js`. F3 checa
   que os literais continuam lá antes de medir: se o killfeed for retingido, a cláusula
   para e diz que está medindo contra um fundo que não existe mais, em vez de devolver um
   verde calmo sobre um fundo imaginário.

   ── POR QUE F2 É POR FORMA, E NÃO POR VALOR ─────────────────────────────────────
   A primeira tentativa foi proibir os hexes da paleta fora de `paleta.js`. Ela é mais
   simples e está ERRADA: `0xe03232` é a bota vermelha de um personagem em
   `characters.js:483`, `0x1faa4d` é a gola verde de outro e um cartaz em `textures.js`.
   Nenhum é cor de facção. Régua que fica vermelha sem defeito é como se ensina a ignorar
   vermelho, então o que ela procura é a FORMA do espelho — letra de facção indexando cor.

   ── A LISTA `CONHECIDAS` ────────────────────────────────────────────────────────
   Nem toda tabela indexada por facção é cor de time. `GLOVE` (fparms.js, game.js) tinge a
   luva e usa hues de propósito diferentes dos do time ("roxo Tribos" contra o azul). Elas
   ficam declaradas aqui, com motivo, em vez de a régua fingir que não as vê. Entrar nesta
   lista é decisão de quem escreve, e é o pedágio certo: obriga a dizer em voz alta que
   aquilo é outro fato, e não mais uma cópia do mesmo.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (as quatro foram executadas)
     --mutar=sem-e     remove `E` de PALETA          -> F1 acusa a facção sem cor
     --mutar=espelho   injeta uma tabela de cor por facção em brasoes.js -> F2 acusa o
                       espelho novo. É a regressão que esta régua existe para impedir:
                       alguém "resolvendo" um import com uma cópia local.
     --mutar=palida-escura  troca o `palida` dos Míticos pelo `escura` da mesma facção
                       -> F3 acusa o contraste. É a regressão REAL de quem preenche uma
                       facção nova copiando a linha de cima: hex válido, chave presente,
                       F1 verde, e o nome no killfeed ilegível.
     --mutar=cor-divergente  muda o `base` do Time E só em PALETA -> F4 acusa a cópia
                       fora de sincronia com `factions.js`. É o rename Time E de novo.

   USO
     node tools/eval/faccao-paleta-check.mjs
     node tools/eval/faccao-paleta-check.mjs --mutar=sem-e
     node tools/eval/faccao-paleta-check.mjs --mutar=espelho
     node tools/eval/faccao-paleta-check.mjs --mutar=palida-escura
     node tools/eval/faccao-paleta-check.mjs --mutar=cor-divergente

   Node puro, lê texto de arquivo, roda em milissegundos — cabe no `check:fast`, que é
   onde ela precisa estar. Régua cara demais para o gatilho errado é régua que não roda.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTAR = val('mutar', '');

const DIR = 'public/js';
const ORIGEM = 'paleta.js';
const ler = (p) => fs.readFileSync(p, 'utf8');

/* ── A FONTE: quais facções o jogo REALMENTE tem ──────────────────────────────────
   Não é lista escrita aqui — é o elenco. Facção nova entra sozinha nesta régua no
   commit que declara o primeiro personagem dela, que é o momento em que a paleta
   precisa saber dela. */
const elenco = [...ler(`${DIR}/characters.js`).matchAll(/team\s*:\s*'([A-Z])'/g)].map((m) => m[1]);
const FACCOES = [...new Set(elenco)].sort();

/* ── A ORIGEM: o conteúdo de PALETA, lido do texto ────────────────────────────────
   Lido e não importado de propósito: a mutação `sem-e` precisa mexer no que a régua vê
   sem escrever no disco, e ler texto é o que deixa isso honesto. O bloco vai até o `};`
   que fecha o objeto — cada facção é uma linha `X: { base: '#...', escura: '#...',
   palida: '#...' }`. */
function paleta() {
  const src = ler(`${DIR}/${ORIGEM}`);
  const m = /export const PALETA = \{([\s\S]*?)\n\};/.exec(src);
  if (!m) return null;
  const out = {};
  for (const linha of m[1].split('\n')) {
    const f = /^\s*([A-Z])\s*:\s*\{(.+)\}/.exec(linha);
    if (!f) continue;
    const tons = {};
    for (const t of f[2].matchAll(/(base|escura|palida)\s*:\s*'(#[0-9a-fA-F]{6})'/g)) tons[t[1]] = t[2].toLowerCase();
    out[f[1]] = tons;
  }
  return out;
}

/* ── O REGISTRO DO ELENCO: a origem editorial dos hexes, para F4 ──────────────────
   `[^{}]*?` e não `[\s\S]*?` de propósito: assim a busca não consegue atravessar o fecho
   de uma entrada e casar o `color` da entrada SEGUINTE quando a primeira estiver capenga.
   Entrada sem os três campos some daqui e F4 acusa como ausente, que é o lado seguro. */
function registro() {
  const src = ler(`${DIR}/factions.js`);
  const out = {};
  for (const m of src.matchAll(/id:\s*'([A-Z])'[^{}]*?color:\s*'(#[0-9a-fA-F]{6})'\s*,\s*dark:\s*'(#[0-9a-fA-F]{6})'\s*,\s*ink:\s*'(#[0-9a-fA-F]{6})'/g)) {
    out[m[1]] = { base: m[2].toLowerCase(), escura: m[3].toLowerCase(), palida: m[4].toLowerCase() };
  }
  return out;
}

/* ── COR: sRGB, composição alfa e contraste WCAG 2.1 ──────────────────────────────
   Mesma matemática do `ui-check.mjs`, reescrita aqui em seis linhas em vez de importada:
   esta régua é `check:fast` e roda em milissegundos porque não puxa o mundo do UI1 (que
   sobe DOM). Fórmula fechada da WCAG, não há o que divergir. */
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const sobre = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
const lum = (c) => { const s = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* ── O FUNDO DO CHIP: cópia de style.css/game.js, com guarda ──────────────────────
   Cada constante traz o literal que a sustenta. Se o literal sumir do arquivo, F3 para:
   medir contra um fundo que o jogo não pinta mais é pior que não medir. */
const BG_900 = [9, 7, 4];                       // --bg-900-rgb
const CHIP_ALFA = 0x2e / 255;                   // `background:${cor}2e` = 18%
const FUNDOS = [
  { nome: '.kf-row', cor: sobre(BG_900, 0.82, BG_900), guarda: ['style.css', 'rgba(var(--bg-900-rgb),.82)'] },
  { nome: '.me-atk', cor: sobre([9, 38, 42], 0.92, BG_900), guarda: ['style.css', 'rgba(9,38,42,.92)'] },
  { nome: '.me-vic', cor: sobre([44, 10, 10], 0.92, BG_900), guarda: ['style.css', 'rgba(44,10,10,.92)'] },
];
const GUARDAS = [...FUNDOS.map((f) => f.guarda), ['style.css', '--bg-900-rgb:9,7,4'], ['js/game.js', '2e;color:']];
const AA_TEXTO = 4.5;    // WCAG 1.4.3
const MARGEM = 5.5;      // abaixo disto, o modelo estático (~0,7 alto) pode estar mentindo

/* Pior contraste do `palida` sobre o chip, entre os três fundos de linha do killfeed. */
function piorContraste(base, palida) {
  return Math.min(...FUNDOS.map((f) => contraste(rgb(palida), sobre(rgb(base), CHIP_ALFA, f.cor))));
}

/* ── ESPELHOS QUE NÃO SÃO COR DE TIME ─────────────────────────────────────────────
   Declaradas, com motivo. Ver o bloco `A LISTA CONHECIDAS` no cabeçalho. */
const CONHECIDAS = [
  { nome: 'GLOVE', motivo: 'tinta da LUVA, hues próprios de propósito (roxo Tribos contra o azul do time)' },
  /* O cabeçalho desta régua já citava este objeto como o exemplo de coincidência — "onde B
     é 'Blue' de tinta de muro e não Time B". Ele passava batido porque F2 exige DUAS letras
     de facção e só `B` batia. Quando o elenco foi de 5 para 10 facções, `R` virou letra de
     facção (Profissionais do Corre) e as duas letras apareceram: `paints` acendeu como
     espelho novo sem ninguém ter escrito uma linha em `map_piscinao_ramos.js`. As letras são
     as INICIAIS das tintas de reboco (Green, White, Amarelo, Rosa, Blue), e os hexes não são
     de facção nenhuma. Fica declarado com `arquivo` — `paints` em qualquer OUTRO módulo
     continua acendendo, que é o pedágio certo. */
  { nome: 'paints', arquivo: 'map_piscinao_ramos.js', motivo: 'iniciais de tinta de REBOCO (Green/White/Amarelo/Rosa/Blue), não letra de facção' },
];

/* ── F2: procura a FORMA do espelho em todo módulo que não seja a origem ──────────
   Duas formas, que são as duas que já existiram neste repo:
     (a) objeto  `{ E: 0xff5555, B: ... }`  — foi COR_TIME e TEAM_RIM
     (b) ternário `x.team === 'E' ? 0x... ` — foi a faixa do peito
   Exige DUAS letras de facção conhecidas na mesma expressão: uma letra sozinha com um
   hex ao lado é coincidência (`{ B: '#5f7480' }` do `paints` de map_piscinao_ramos.js,
   onde B é "Blue" de tinta de muro e não Time B). */
function espelhos(nomeArquivo, src) {
  const achados = [];
  /* `arquivo` ausente = conhecida em qualquer módulo (GLOVE mora em dois). `arquivo`
     presente = conhecida SÓ ali; o mesmo nome noutro lugar volta a acender. */
  const daqui = (c) => !c.arquivo || c.arquivo === nomeArquivo;
  const conhecida = (trecho) => CONHECIDAS.find((c) => daqui(c) && trecho.includes(c.nome));

  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{([^{}]*)\}/g)) {
    const chaves = [...m[2].matchAll(/\b([A-Z])\s*:\s*(?:0x[0-9a-fA-F]{6}|'#[0-9a-fA-F]{6}')/g)].map((x) => x[1]);
    const daFaccao = [...new Set(chaves)].filter((c) => FACCOES.includes(c));
    if (daFaccao.length < 2) continue;
    const c = CONHECIDAS.find((k) => k.nome === m[1] && daqui(k));
    achados.push({ tipo: 'objeto', nome: m[1], letras: daFaccao, conhecida: c, linha: src.slice(0, m.index).split('\n').length });
  }

  for (const m of src.matchAll(/((?:[\w.]+\.team === '[A-Z]'\s*\?\s*(?:0x[0-9a-fA-F]{6}|'#[0-9a-fA-F]{6}')\s*:?\s*){2,})/g)) {
    const letras = [...new Set([...m[1].matchAll(/team === '([A-Z])'/g)].map((x) => x[1]))].filter((c) => FACCOES.includes(c));
    if (letras.length < 2) continue;
    achados.push({ tipo: 'ternário', nome: conhecida(m[1])?.nome || '(anônimo)', letras, conhecida: conhecida(m[1]), linha: src.slice(0, m.index).split('\n').length });
  }
  return achados.map((a) => ({ ...a, arquivo: nomeArquivo }));
}

const P = paleta();
console.log(`RÉGUA DA PALETA DE FACÇÃO${MUTAR ? `  [MUTAÇÃO: ${MUTAR}]` : ''}`);
if (!P) {
  console.log(`\n✗ FAC0  não achei \`export const PALETA\` em ${DIR}/${ORIGEM} — a régua não sabe medir isto.`);
  process.exit(1);
}
if (MUTAR === 'sem-e') delete P.E;
/* Em MEMÓRIA, como as outras: o disco não é tocado. `palida-escura` é a regressão de quem
   preenche facção nova copiando a linha de cima e repetindo o tom escuro no lugar do
   pálido; `cor-divergente` é o rename Time E outra vez, mexendo na cópia e não na origem. */
if (MUTAR === 'palida-escura' && P.M) P.M = { ...P.M, palida: P.M.escura };
if (MUTAR === 'cor-divergente' && P.E) P.E = { ...P.E, base: '#ff0000' };
console.log(`elenco declara ${FACCOES.length} facções: ${FACCOES.join(', ')}`);
console.log(`origem única: ${DIR}/${ORIGEM}\n`);

const TONS = ['base', 'escura', 'palida'];
let f1 = true;
console.log(`F1 · toda facção do elenco tem os ${TONS.length} tons em PALETA`);
for (const f of FACCOES) {
  const t = P[f];
  const faltam = !t ? ['A FACÇÃO INTEIRA'] : TONS.filter((k) => !t[k]);
  if (faltam.length) f1 = false;
  console.log(`   ${f}  ${faltam.length ? `FALTA ${faltam.join(', ')}` : TONS.map((k) => t[k]).join('  ')}`);
}
const sobrando = Object.keys(P).filter((f) => !FACCOES.includes(f));
if (sobrando.length) console.log(`   (paleta tem ${sobrando.join(', ')} sem personagem no elenco — não reprova, mas é resíduo de rename)`);
console.log(`   ${f1 ? 'PASSA' : 'FALHA'}\n`);

let f2 = true;
console.log('F2 · nenhum espelho novo: cor por facção só nasce na origem');
const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.js') && f !== ORIGEM);
const todos = [];
for (const a of arquivos) {
  let src = ler(path.join(DIR, a));
  /* A MUTAÇÃO. Injeta um espelho em MEMÓRIA — o arquivo em disco não é tocado. É a
     regressão real: alguém "resolvendo" o import com uma cópia local da paleta. */
  if (MUTAR === 'espelho' && a === 'brasoes.js') {
    src += `\nconst COR_TIME_LOCAL = { E: '#ff5555', B: '#55dd66', U: '#4aa3ff' };\n`;
  }
  todos.push(...espelhos(a, src));
}
if (!todos.length) console.log('   nenhuma tabela de cor por facção fora da origem');
for (const e of todos) {
  const ok = !!e.conhecida;
  if (!ok) f2 = false;
  console.log(`   ${e.arquivo}:${e.linha}  ${e.tipo} ${e.nome} [${e.letras.join(',')}]  ${ok ? `conhecida — ${e.conhecida.motivo}` : 'ESPELHO NOVO'}`);
}
console.log(`   ${f2 ? 'PASSA' : 'FALHA'}\n`);

/* ── F3 · o `palida` alcança 4,5:1 sobre o chip do killfeed ───────────────────────
   Antes das medidas, as guardas: as constantes de fundo são cópia, e cópia sem guarda é
   como esta régua vira verde medindo um jogo que não existe mais. */
let f3 = true;
console.log(`F3 · \`palida\` legível sobre o chip do killfeed (>= ${AA_TEXTO.toFixed(1)}:1, pior dos ${FUNDOS.length} fundos)`);
const soltas = GUARDAS.filter(([arq, lit]) => !ler(arq === 'style.css' ? 'public/style.css' : `public/${arq}`).includes(lit));
if (soltas.length) {
  f3 = false;
  for (const [arq, lit] of soltas) console.log(`   ✗ o literal \`${lit}\` sumiu de ${arq} — F3 está medindo contra um fundo que o jogo não pinta mais`);
} else {
  for (const f of FACCOES) {
    const t = P[f];
    if (!t?.base || !t?.palida) { console.log(`   ${f}  (sem base/palida — já reprovado em F1)`); continue; }
    const c = piorContraste(t.base, t.palida);
    const cheia = Math.min(...FUNDOS.map((x) => contraste(rgb(t.base), sobre(rgb(t.base), CHIP_ALFA, x.cor))));
    if (c < AA_TEXTO) f3 = false;
    const nota = c < AA_TEXTO ? 'ILEGÍVEL' : (c < MARGEM ? 'MARGEM CURTA — confira no ui-check.mjs (UI1)' : '');
    console.log(`   ${f}  ${t.palida}  ${c.toFixed(2)}:1   (a cor cheia daria ${cheia.toFixed(2)}:1)  ${nota}`);
  }
}
console.log(`   ${f3 ? 'PASSA' : 'FALHA'}\n`);

/* ── F4 · a cópia bate com o registro do elenco ───────────────────────────────────
   Os trinta valores, um a um. É o pedágio de `paleta.js` não poder importar `factions.js`. */
let f4 = true;
console.log('F4 · os hexes de PALETA batem com o registro do elenco (factions.js)');
const REG = registro();
/* A mutação `palida-escura` é aplicada TAMBÉM aqui, e é de propósito: se ela mexesse só em
   PALETA, F4 acenderia junto e o vermelho de F3 não provaria nada — poderia ser F4 vazando.
   Propagada aos dois arquivos ela vira o caso honesto ("a escolha editorial em si é
   ilegível"), F1/F2/F4 ficam verdes e sobra F3 sozinho acusando. É essa a prova. */
if (MUTAR === 'palida-escura' && REG.M) REG.M = { ...REG.M, palida: REG.M.escura };
for (const f of FACCOES) {
  const a = P[f], b = REG[f];
  if (!b) { f4 = false; console.log(`   ${f}  factions.js NÃO declara color/dark/ink para esta facção`); continue; }
  if (!a) { console.log(`   ${f}  (ausente em PALETA — já reprovado em F1)`); continue; }
  const dif = TONS.filter((k) => a[k] !== b[k]);
  if (dif.length) f4 = false;
  console.log(`   ${f}  ${dif.length ? dif.map((k) => `${k}: paleta ${a[k]} != registro ${b[k]}`).join('  ') : 'idêntico'}`);
}
console.log(`   ${f4 ? 'PASSA' : 'FALHA'}\n`);

/* ── AVISO (não reprova): quem CONSOME esta paleta ────────────────────────────────
   Descoberto em 12/08 ao completar as dez: `game.js`, `brasoes.js` e `characters.js`
   deixaram de ler `PALETA` e passaram a ler `factions.js` — os comentários deles dizem o
   motivo em voz alta, "`paleta.js` só cobre as 5 primeiras facções". Com as dez aqui esse
   motivo acabou, mas religar os consumidores é conserto em arquivo de OUTRO dono, então
   este aviso não reprova. Ele existe para o verde acima não ser lido como "a bandeira
   pinta certo": F1/F3/F4 provam que a TABELA está correta, não que alguém a usa. */
const importadores = fs.readdirSync(DIR).filter((a) => a.endsWith('.js') && a !== ORIGEM)
  .map((a) => [a, /import\s*\{([^}]*)\}\s*from\s*'\.\/paleta\.js'/.exec(ler(path.join(DIR, a)))])
  .filter(([, m]) => m).map(([a, m]) => [a, m[1].split(',').map((s) => s.trim()).filter(Boolean)]);
const usam = importadores.filter(([, nomes]) => nomes.some((n) => ['PALETA', 'FACCOES', 'BASE_POR_FACCAO', 'tons'].includes(n)));
console.log('AVISO · quem importa desta origem (não reprova)');
if (!importadores.length) console.log(`   NINGUÉM importa ${ORIGEM}.`);
for (const [a, nomes] of importadores) console.log(`   ${a}  ${nomes.join(', ')}`);
if (!usam.length) console.log(`   ⚠ nenhum módulo lê PALETA/FACCOES/BASE_POR_FACCAO/tons — a tabela está CORRETA e OCIOSA.\n     A cor que o jogo pinta hoje vem de factions.js. F4 garante que as duas dizem a mesma coisa.`);
console.log('');

const passou = f1 && f2 && f3 && f4;
console.log(passou
  ? '✓ FAC1  cor de facção com origem única e elenco coberto'
  : '✗ FAC1  paleta de facção furada — bandeira/contorno/faixa saem errados SEM erro no console');
process.exit(passou ? 0 : 1);
