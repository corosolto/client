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

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (as duas foram executadas)
     --mutar=sem-e     remove `E` de PALETA          -> F1 acusa a facção sem cor
     --mutar=espelho   injeta uma tabela de cor por facção em brasoes.js -> F2 acusa o
                       espelho novo. É a regressão que esta régua existe para impedir:
                       alguém "resolvendo" um import com uma cópia local.

   USO
     node tools/eval/faccao-paleta-check.mjs
     node tools/eval/faccao-paleta-check.mjs --mutar=sem-e
     node tools/eval/faccao-paleta-check.mjs --mutar=espelho

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

/* ── ESPELHOS QUE NÃO SÃO COR DE TIME ─────────────────────────────────────────────
   Declaradas, com motivo. Ver o bloco `A LISTA CONHECIDAS` no cabeçalho. */
const CONHECIDAS = [
  { nome: 'GLOVE', motivo: 'tinta da LUVA, hues próprios de propósito (roxo Tribos contra o azul do time)' },
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
  const conhecida = (trecho) => CONHECIDAS.find((c) => trecho.includes(c.nome));

  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{([^{}]*)\}/g)) {
    const chaves = [...m[2].matchAll(/\b([A-Z])\s*:\s*(?:0x[0-9a-fA-F]{6}|'#[0-9a-fA-F]{6}')/g)].map((x) => x[1]);
    const daFaccao = [...new Set(chaves)].filter((c) => FACCOES.includes(c));
    if (daFaccao.length < 2) continue;
    const c = CONHECIDAS.find((k) => k.nome === m[1]);
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

const passou = f1 && f2;
console.log(passou
  ? '✓ FAC1  cor de facção com origem única e elenco coberto'
  : '✗ FAC1  paleta de facção furada — bandeira/contorno/faixa saem errados SEM erro no console');
process.exit(passou ? 0 : 1);
