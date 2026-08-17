// Folha de contato: o MODELO ao lado do GERADO, para revisão de fidelidade.
//
// POR QUE UMA FOLHA E NÃO 88 ARQUIVOS SOLTOS
// -------------------------------------------
// A revisão que importa é comparativa: "o óculos do Mandrake é uma Juliet, não um
// Wayfarer" só aparece com as duas imagens no mesmo campo de visão. Abrir
// mandrake-busto.png e mandrake-gamer.png em janelas separadas esconde exatamente
// o tipo de erro que este pipeline comete — substituir o item específico pelo
// genérico da categoria.
//
// O erro sai daqui e vira uma linha em DICAS (tools/gen-char-realista.mjs), que é
// a lista de exceções. Regra dela: só entra item visto errado numa imagem de
// verdade, nunca palpite preventivo.
//
// Uso:
//   node tools/folha-contato.mjs                       # todos que existirem
//   node tools/folha-contato.mjs --estilo foto --cols 3
//
// Flags:
//   --estilo gamer|foto   qual geração comparar (padrão gamer)
//   --refs <dir>          padrão /tmp/gen-char-realista/refs
//   --gerados <dir>       padrão /tmp/gen-image
//   --out <arquivo>       padrão /tmp/folha-contato-<estilo>.jpg
//   --lado N              lado de cada miniatura (padrão 300)
//   --cols N              pares por linha (padrão 2)
import { existsSync, readdirSync } from 'node:fs';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const ESTILO = arg('estilo', 'gamer');
const REFS = arg('refs', '/tmp/gen-char-realista/refs');
const GER = arg('gerados', '/tmp/gen-image');
const OUT = arg('out', `/tmp/folha-contato-${ESTILO}.jpg`);
const L = parseInt(arg('lado', '300'), 10);
const COLS = parseInt(arg('cols', '2'), 10);
const G = 6, R = 22;

if (!existsSync(REFS)) { console.error(`ERRO: não achei as referências em ${REFS}`); process.exit(1); }

/* A lista sai dos GERADOS, não do elenco: uma folha que mostra buraco para quem
   ainda não rodou não ajuda a revisar, só assusta. */
const ids = readdirSync(GER)
  .filter((f) => f.endsWith(`-${ESTILO}.png`))
  .map((f) => f.replace(`-${ESTILO}.png`, ''))
  .filter((id) => existsSync(`${REFS}/${id}-busto.png`))
  .sort();

if (!ids.length) { console.error(`ERRO: nenhum "*-${ESTILO}.png" em ${GER} com referência em ${REFS}`); process.exit(1); }

const parW = L * 2 + G;
const celW = parW, celH = L + R;

const celulas = [];
for (const id of ids) {
  const rot = Buffer.from(
    `<svg width="${celW}" height="${R}"><rect width="100%" height="100%" fill="#0a0a0c"/>`
    + `<text x="6" y="15" font-family="monospace" font-size="12" fill="#b4d92e">${id}</text>`
    + `<text x="${L - 52}" y="15" font-family="monospace" font-size="10" fill="#5c5d63">MODELO</text>`
    + `<text x="${L + G + 6}" y="15" font-family="monospace" font-size="10" fill="#5c5d63">${ESTILO.toUpperCase()}</text>`
    + '</svg>');
  const a = await sharp(`${REFS}/${id}-busto.png`).flatten({ background: '#141519' }).resize(L, L, { fit: 'cover' }).toBuffer();
  const b = await sharp(`${GER}/${id}-${ESTILO}.png`).resize(L, L, { fit: 'cover' }).toBuffer();
  celulas.push(await sharp({ create: { width: celW, height: celH, channels: 3, background: '#0a0a0c' } })
    .composite([{ input: rot, top: 0, left: 0 }, { input: a, top: R, left: 0 }, { input: b, top: R, left: L + G }])
    .png().toBuffer());
}

const linhas = Math.ceil(celulas.length / COLS);
await sharp({
  create: {
    width: celW * COLS + G * (COLS - 1),
    height: celH * linhas + G * (linhas - 1),
    channels: 3, background: '#0a0a0c',
  },
}).composite(celulas.map((c, i) => ({
  input: c,
  top: Math.floor(i / COLS) * (celH + G),
  left: (i % COLS) * (celW + G),
}))).jpeg({ quality: 86 }).toFile(OUT);

console.log(`${ids.length} par(es) → ${OUT}`);
console.log('Revise procurando SUBSTITUIÇÃO (item específico virou genérico) e OMISSÃO');
console.log('(acessório sumiu). Cada erro vira uma linha em DICAS, no gen-char-realista.mjs.');
