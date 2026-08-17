/* gen-graffiti-decals.mjs — recorta os elementos de `references/graffiti/` em PNGs
 * com fundo transparente e escreve o manifesto que o `textures.js` consome.
 *
 * USO
 *   node tools/gen-graffiti-decals.mjs              # gera tudo
 *   node tools/gen-graffiti-decals.mjs --sheet      # gera + folha de contato p/ olhar
 *   node tools/gen-graffiti-decals.mjs --only=1a426 # só as fontes que casam com o trecho
 *
 *   Sugestão de script no package.json (NÃO é meu arquivo — pedir pro dono adicionar):
 *     "decals": "node tools/gen-graffiti-decals.mjs --sheet"
 *
 * POR QUE PLAYWRIGHT E NÃO `canvas`
 *   Não existe a lib `canvas` neste node. O padrão da casa para "preciso de um canvas
 *   de verdade" é subir o Chrome pelo playwright global — igual `tools/eval/pixo-preview.mjs`
 *   e `tools/eval/g2-capture.mjs` (import de `npm root -g`, `executablePath` do Chrome).
 *
 * REGRA DA CASA
 *   Recorte mal feito não dá erro — dá franja branca em volta, e franja branca na parede
 *   é horrível. Por isso `--sheet` existe: gere a figura, OLHE a figura, descreva o que viu.
 *
 * PROCEDÊNCIA — LEIA ANTES DE COMMITAR O RESULTADO  (ver KNOWN-BUGS.md · BUG-23)
 *   `references/` é acervo de INSPIRAÇÃO baixado da web, não biblioteca licenciada, e o
 *   repositório é PÚBLICO. O precedente da casa já existe e está no `.gitignore`:
 *   `public/audio/` é ignorado ("vozes e memes têm direitos incertos; o repositório
 *   público leva só o código") e se recupera por script. `public/img/decals/` segue a
 *   mesma regra: o produto versionado é ESTE script; os PNGs se regeram na máquina de
 *   quem tem a pasta de referência.
 *   A lista `EXCLUIDOS` abaixo é auditável de propósito: cada linha diz por que ficou fora.
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'references', 'graffiti');
const OUT = path.join(ROOT, 'public', 'img', 'decals');
const SHEET = path.join(ROOT, 'tools', 'eval', 'out', 'decals-sheet.png');
const WANT_SHEET = process.argv.includes('--sheet');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
/* Rede de segurança: fração mínima de pixel opaco no recorte. MEDIDO nos 208 da 4ª
 * rodada — o menor recorte legítimo ficou em 0,092 (letra fina de alfabeto), então
 * 0,04 reprova só o que é vazio de verdade e não encosta em nada que presta. */
const COBERTURA_MIN = 0.04;
/* Rede de segurança nº 2 — FUNDO QUE NÃO SAIU. `borda` é a fração do anel de 1 px do
 * recorte que ficou OPACA: num recorte bom o anel é o vazio em volta da arte e a fração
 * é ~0; num recorte que virou retângulo de fundo o anel é o próprio fundo. É a varredura
 * automática que o dono pediu depois de ver "tags com fundo branco" no jogo.
 * O TETO É MEDIDO, não escolhido: nos 179 da 4ª rodada só dois passam de 0,15 —
 * `lobo-mau` (0,524) e `gato-rosa` (0,215), e os DOIS foram abertos em tamanho real e
 * são retângulo de fundo branco. O terceiro colocado é `caras-vintage-12` com 0,104, e
 * ele está certo. Ou seja: 0,15 cai no vão entre o pior defeito e o melhor acerto, e
 * não há nenhum arquivo entre 0,105 e 0,214 pra o teto ter que arbitrar. */
const BORDA_MAX = 0.15;

/* ── PROCEDÊNCIA ────────────────────────────────────────────────────────────────
 * Fora do pacote, com o motivo. Marca de loja/estúdio/banco de imagem impressa na
 * própria arte é o critério objetivo; foto e personagem de terceiro entram por
 * "não é graffiti, tag nem ilustração de rua" — que é o que o dono autorizou.       */
const EXCLUIDOS = {
  'beeaea08bfaca966793155bba181198b.jpg': 'pôster do AKIRA, crédito de estúdio impresso na arte (Otomo · Akira Committee · Streamline) — vetado pelo dono e por BUG-23',
  '003de6c067ac405c3f736134e1654a2c.jpg': 'folha de alfabeto com logo da loja Bombing Science + assinatura acmefourtune (BUG-23)',
  '96d9327ebc43acc027a39f82c8d4ec91.jpg': 'folha com logos das lojas Bombing Science + GROG impressos',
  'aa1939efc1452bdf28b691cda373e1b4.jpg': 'folha com logos das lojas Bombing Science + GROG impressos',
  'e4004addf9221ae1d5add4255fe26bba.jpg': 'folha com logos das lojas Bombing Science + DANG impressos',
  '61p6GBWKMKL._AC_UF894,1000_QL80_.jpg': 'nome do arquivo é ID de imagem de produto da Amazon — print à venda (BUG-23)',
  '946f910632775fad793dc0ad6afb8af3.jpg': 'marca d\'água shutterstock.com + ID 152977637 impressa na arte',
  '7a69dc612675f026702607ef0bfe1e21.jpg': 'capa do disco "Exodus" (Bob Marley & The Wailers) — arte comercial de gravadora',
  'de2ae0b20e3b1a0e06e4a993e36f3f99.jpg': 'folha promocional de site de fontes: marca d\'água "freefont" + QR code impressos',
  'b58f57d16601044df9854ab72b624959.jpg': 'personagem de terceiro (Charlie Brown / Peanuts: camisa zigue-zague, traço da série)',
  '311a976195e08889b0077d515286a668.jpg': 'fotografia P&B de estátua — não é graffiti, tag nem ilustração',
  '736b5e11601d315479426a70990286f3.jpg': 'cartaz montado sobre FOTO de pessoa real — não é graffiti, tag nem ilustração',
  'd078b6ce8b8290e8a05baf707767ccb5 (1).jpg': 'duplicata byte-a-byte de d078b6ce8b8290e8a05baf707767ccb5.jpg',
};

/* ── QUALIDADE ──────────────────────────────────────────────────────────────────
 * Fonte que o recorte NÃO resolve. Cada linha entrou depois de aparecer errada na
 * folha de contato — é a regra da casa ("gere a figura e OLHE") virando lista, e não
 * um limiar numérico ajustado até derrubar exatamente estes seis arquivos, que seria
 * rigor de mentira. O que é automático aqui embaixo é só a rede de segurança
 * (`COBERTURA_MIN`), que pega recorte vazio de fonte nova.                          */
const RUINS = {
  'd078b6ce8b8290e8a05baf707767ccb5.jpg': 'grade selada: a moldura da tabela impede o flood de drenar as células, sai a folha inteira como retângulo branco quadriculado',
  '9601bd73022aa97c830e41808778a78c.jpg': 'foto desfocada da folha, com moldura — sai um retângulo cinza, nenhuma letra separável',
  'images (9).webp': 'digitalização de lápis de baixíssimo contraste: as 19 letras saem cinza-claro fantasma, ilegíveis em qualquer parede',
  '1f3cc6e0cb86b76b68f9fa1645a8b9ad.jpg': 'a tag vermelha por cima solda as letras: sobram 5 borrões, não 26 letras',
  'images (11).webp': 'foto de muro real — o fundo tem textura, não é liso, e o recorte vira retângulo de ruído',
  '97922ba593908c851b64c81078075ea8.jpg': 'folha de trama contínua: é textura de fundo, não elemento recortável',
  '630b720c21fd6685ad13606cd5ce3919.jpg': 'peça sobre respingo verde: o respingo não é fundo liso e vai junto, sai retângulo',
  /* 5ª rodada — o dono reprovou "fundo branco" olhando o jogo. Cada uma destas foi
     conferida em tamanho real (não na miniatura da folha, que é onde elas passaram): */
  '413d1125e44ca70babe31aa6915d8a02.jpg': 'o CAMPO AZUL-MARINHO do cartaz é o fundo, e ele NÃO encosta na borda em todo o contorno (as duas caixas brancas das mãos cruzam a beirada), então o flood não drena e sai um retângulo azul na parede — era o `smiley-dedo`, e estava no D_MURAL dos 4 mapas',
  'dda636c6bfc28916f5cf6d7f7d149421.jpg': 'papel branco com traço preto e SOMBRA de digitalização no canto: a sombra segura o flood, o branco fica e sai um retângulo branco (`gato-rosa`, borda medida 0,215)',
  'fa2e5644fb2be56ba3c23988d9e7ab9d.jpg': 'foto de estêncil em parede clara: o fundo é a PAREDE fotografada, com vinheta e respingo — não é cor lisa, o flood para na vinheta e sai retângulo branco (`lobo-mau`, borda medida 0,524, a maior do pacote; estava no D_MURAL dos 4 mapas e no D_PORTA da Quebrada)',
};

/* ── RÓTULOS ────────────────────────────────────────────────────────────────────
 * Os nomes de origem são hashes. Aqui vira nome legível + tipo, que o manifesto
 * carrega e o mapa usa pra escolher (não dá pra pôr alfabeto onde cabia peça).
 * tipo: alfabeto | tag | peca | ilustracao | cartaz                                */
const ROTULOS = {
  'mint-pixo-lajes-01.png': ['pixo-lajes-01', 'peca'],
  '01a5764956a230e010d5dcd5c0a0e7cf.jpg': ['palhaco-bobo', 'ilustracao'],
  '09fd82cb4fab24ef663cdbb5441cc191.jpg': ['personagens-graffiti', 'ilustracao'],
  '17b43f09a66d9d221194224ec61ab8c0.jpg': ['olhos-bocas', 'ilustracao'],
  '1a426c23e35f6096b2b3cbc2b7179100.jpg': ['palhaco-meiotom', 'ilustracao'],
  '1f3cc6e0cb86b76b68f9fa1645a8b9ad.jpg': ['alfabeto-handstyle', 'alfabeto'],
  '23343461129cb3634dd0467e238ebaab.jpg': ['dont-overthink', 'cartaz'],
  '2678421cd3a61a8351243869e70fdb27.jpg': ['bandeira-vira-lata', 'ilustracao'],
  '413d1125e44ca70babe31aa6915d8a02.jpg': ['smiley-dedo', 'ilustracao'],
  '4c7779612ecbb5cc8ddf70d4d9927f54.jpg': ['personagem-muro', 'ilustracao'],
  '59672dbc0f1c70cc90a6cb1aec2fc902.jpg': ['cartaz-neutro', 'cartaz'],
  '5b35a934287ef36978ca525236de5f2f.jpg': ['alfabeto-bolha', 'alfabeto'],
  '630b720c21fd6685ad13606cd5ce3919.jpg': ['peca-palhaco', 'peca'],
  '6e1ca3ac370c18156a6d954674ba457d.jpg': ['tags-treino', 'tag'],
  '706ba3c1f6fdf8afb12fcff2535fbff0.jpg': ['cartaz-america-latina', 'cartaz'],
  '874137d3b37e53212e560a12b220958b.jpg': ['palhaco-classico', 'ilustracao'],
  '8ada0feca08ffd305a2708ccfa760eb4.jpg': ['meio-ano', 'cartaz'],
  '8ae54d837d0b1866a54f0b702118bf6c.jpg': ['coelho-rosa', 'ilustracao'],
  '92ddaa9b12cff259fc2a71342c9ebc3f.jpg': ['caras-cartoon', 'ilustracao'],
  '9601bd73022aa97c830e41808778a78c.jpg': ['alfabeto-marcador', 'alfabeto'],
  '97922ba593908c851b64c81078075ea8.jpg': ['rabisco-trama', 'tag'],
  'add6ded7b6fa1d53be002710ce3e42cb.jpg': ['palhaco-vintage', 'ilustracao'],
  'b2d22642e4916b785753571aef98eed3.jpg': ['cartaz-medo', 'cartaz'],
  'b4c71057db0952fef9cc4377383f94b4.jpg': ['palhaco-azul', 'ilustracao'],
  'bcdf70ad134aadc012708ce78ae88681.jpg': ['pra-gringo', 'cartaz'],
  'c19bff8a0efc5e5fdd799a7ff9b91dee.jpg': ['olhos-cartoon', 'ilustracao'],
  'd078b6ce8b8290e8a05baf707767ccb5.jpg': ['alfabeto-grade', 'alfabeto'],
  'dac8897c1ed078527b7577066bbeb692.jpg': ['malabares-smiley', 'ilustracao'],
  'dda636c6bfc28916f5cf6d7f7d149421.jpg': ['gato-rosa', 'ilustracao'],
  'deda7baefe875efc59cebfa9ff48d97c.jpg': ['alfabeto-bolha2', 'alfabeto'],
  'e2f18eb450bc2cd5cfe5a38ffb2f55fe.jpg': ['gratidao-sol', 'cartaz'],
  'e8a1534a9abf3dff88519d703f841606.jpg': ['alfabeto-fino', 'alfabeto'],
  'ed9c74f63902dfba15fcd1bd08ef8d4f.jpg': ['bola-amarela', 'ilustracao'],
  'f3bfe6c9dc19a4d97892130b3b0ef680.jpg': ['caras-vintage', 'ilustracao'],
  'fa2e5644fb2be56ba3c23988d9e7ab9d.jpg': ['lobo-mau', 'peca'],
  'images.webp': ['tag-flop', 'tag'],
  'images (1).webp': ['tag-selvagem', 'tag'],
  'images (2).webp': ['tag-money', 'tag'],
  'images (3).webp': ['peca-bolha', 'peca'],
  'images (4).webp': ['tag-fina', 'tag'],
  'images (5).webp': ['tag-pingo', 'tag'],
  'images (6).webp': ['tag-larga', 'tag'],
  'images (7).webp': ['alfabeto-reto', 'alfabeto'],
  'images (8).webp': ['alfabeto-escuro', 'alfabeto'],
  'images (9).webp': ['alfabeto-pixo', 'alfabeto'],
  'images (10).webp': ['alfabeto-gotico', 'alfabeto'],
  'images (11).webp': ['muro-18anos', 'peca'],
  'images (12).webp': ['alfabeto-grosso', 'alfabeto'],
};

/* Ilustração que o segmentador esfarela em pedaço solto (bola do chapéu, gola do
 * palhaço). Aqui a decisão vira manual — sai UM recorte, a peça inteira.
 * Cada nome desta lista entrou depois de aparecer errado na folha de contato. */
const INTEIRO = new Set([
  'mint-pixo-lajes-01.png',
  '01a5764956a230e010d5dcd5c0a0e7cf.jpg', '1a426c23e35f6096b2b3cbc2b7179100.jpg',
  '874137d3b37e53212e560a12b220958b.jpg', 'b4c71057db0952fef9cc4377383f94b4.jpg',
  'add6ded7b6fa1d53be002710ce3e42cb.jpg', '630b720c21fd6685ad13606cd5ce3919.jpg',
  '2678421cd3a61a8351243869e70fdb27.jpg', '413d1125e44ca70babe31aa6915d8a02.jpg',
  '4c7779612ecbb5cc8ddf70d4d9927f54.jpg', '8ae54d837d0b1866a54f0b702118bf6c.jpg',
  'dda636c6bfc28916f5cf6d7f7d149421.jpg', 'ed9c74f63902dfba15fcd1bd08ef8d4f.jpg',
  'e2f18eb450bc2cd5cfe5a38ffb2f55fe.jpg', 'dac8897c1ed078527b7577066bbeb692.jpg',
  '23343461129cb3634dd0467e238ebaab.jpg', '59672dbc0f1c70cc90a6cb1aec2fc902.jpg',
  '706ba3c1f6fdf8afb12fcff2535fbff0.jpg', 'b2d22642e4916b785753571aef98eed3.jpg',
  'bcdf70ad134aadc012708ce78ae88681.jpg', '8ada0feca08ffd305a2708ccfa760eb4.jpg',
  'fa2e5644fb2be56ba3c23988d9e7ab9d.jpg', 'images (11).webp',
  'images.webp', 'images (1).webp', 'images (2).webp', 'images (3).webp',
  'images (4).webp', 'images (5).webp', 'images (6).webp',
]);

if (!existsSync(SRC)) {
  console.error(`[decals] ${path.relative(ROOT, SRC)} não existe.\n` +
    '  A pasta é local (gitignorada em 04/08 — ver HANDOFF A0.2). Sem ela não há o que recortar.');
  process.exit(1);
}

const fontes = readdirSync(SRC)
  .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
  .filter(f => !EXCLUIDOS[f])
  .filter(f => !RUINS[f])
  .filter(f => !ONLY || f.includes(ONLY))
  .sort();

/* Chave que não casa com arquivo nenhum é sempre erro de digitação, e erro de
 * digitação aqui é SILENCIOSO: o rótulo some, o arquivo entra com nome de hash, e
 * pior — uma linha de EXCLUIDOS com hash errado deixa passar o que devia barrar.
 * Custou uma rodada inteira (quatro rótulos com hash truncado). Por isso é ruído
 * alto na saída, não comentário. */
const todos = new Set(readdirSync(SRC));
for (const [nome, mapa] of [['EXCLUIDOS', EXCLUIDOS], ['RUINS', RUINS], ['ROTULOS', ROTULOS]]) {
  for (const k of Object.keys(mapa)) if (!todos.has(k)) console.warn(`[decals] AVISO ${nome}: "${k}" não existe em references/graffiti`);
}
for (const k of INTEIRO) if (!todos.has(k)) console.warn(`[decals] AVISO INTEIRO: "${k}" não existe em references/graffiti`);

console.log(`[decals] ${fontes.length} fontes · ${Object.keys(EXCLUIDOS).length} fora por procedência`
  + ` · ${Object.keys(RUINS).length} fora por qualidade`);

const gRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
page.on('pageerror', e => { console.error('[pageerror]', e.message); });
await page.setContent('<body></body>');
await page.addScriptTag({ content: RECORTE_JS() });

if (!ONLY) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifesto = [];
const xadrezados = [];
for (const f of fontes) {
  const [slug, tipo] = ROTULOS[f] || [f.replace(/\.\w+$/, '').slice(0, 12), 'peca'];
  const mime = /\.webp$/i.test(f) ? 'image/webp' : /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
  const dataUri = `data:${mime};base64,${readFileSync(path.join(SRC, f)).toString('base64')}`;
  let pecas;
  try {
    pecas = await page.evaluate(
      ([uri, inteiro, tp]) => window.__recorta(uri, { inteiro, tipo: tp }),
      [dataUri, INTEIRO.has(f), tipo],
    );
  } catch (e) {
    console.error(`  ✗ ${f}: ${e.message}`);
    continue;
  }
  const antes = pecas.length;
  pecas = pecas.filter(p => p.cobertura >= COBERTURA_MIN);
  if (pecas.length < antes) console.log(`      (${antes - pecas.length} recorte(s) quase vazio(s) descartado(s))`);
  const antesB = pecas.length;
  pecas = pecas.filter(p => p.borda <= BORDA_MAX);
  if (pecas.length < antesB) console.log(`      (${antesB - pecas.length} recorte(s) com FUNDO NÃO REMOVIDO descartado(s) — borda > ${BORDA_MAX})`);
  if (pecas[0] && pecas[0].xadrez) xadrezados.push(f);
  pecas.forEach((p, i) => {
    const nome = pecas.length > 1 ? `${slug}-${String(i + 1).padStart(2, '0')}.png` : `${slug}.png`;
    writeFileSync(path.join(OUT, nome), Buffer.from(p.png, 'base64'));
    manifesto.push({
      file: nome, w: p.w, h: p.h,
      aspect: Math.round((p.w / p.h) * 1000) / 1000,
      tipo, claro: p.lum > 128, origem: f,
      cobertura: Math.round(p.cobertura * 1000) / 1000, borda: Math.round(p.borda * 1000) / 1000,
    });
  });
  const dbg = pecas[0] ? ` (comps ${pecas[0].comps}/${pecas[0].brutos})` : '';
  console.log(`  ${String(pecas.length).padStart(3)} · ${slug}${process.env.DECAL_DEBUG ? dbg : ''}`);
}

manifesto.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  gerado: new Date().toISOString().slice(0, 10),
  script: 'tools/gen-graffiti-decals.mjs',
  aviso: 'Derivado de references/graffiti (local, não versionado). Ver KNOWN-BUGS.md BUG-23.',
  excluidos: EXCLUIDOS,
  ruins: RUINS,
  decals: manifesto,
}, null, 2) + '\n');
console.log(`[decals] ${manifesto.length} elementos → ${path.relative(ROOT, OUT)}`);
console.log(`[decals] xadrez de transparência detectado e removido em ${xadrezados.length} fonte(s): ${xadrezados.join(', ') || '—'}`);

// ── sincroniza o bloco gerado dentro do textures.js ────────────────────────────
sincronizaTextures(manifesto);

// ── folha de contato: a figura que prova que o recorte não tem franja ──────────
if (WANT_SHEET) {
  mkdirSync(path.dirname(SHEET), { recursive: true });
  const COLS = 10, CELL = 150;
  const linhas = Math.ceil(manifesto.length / COLS);
  // metade escura / metade clara: franja branca aparece no escuro, franja escura no claro
  const html = `<body style="margin:0;background:#2b2b2b;font:9px monospace;color:#8f8">
  <div style="display:grid;grid-template-columns:repeat(${COLS},${CELL}px)">
  ${manifesto.map((m, i) => `<div style="width:${CELL}px;height:${CELL + 12}px;background:${i % 2 ? '#2b2b2b' : '#b9b2a6'}">
    <img src="${pathToFileURL(path.join(OUT, m.file)).href}" style="width:100%;height:${CELL - 2}px;object-fit:contain">
    <div style="height:12px;color:#fff;background:#000;overflow:hidden">${m.file.replace('.png', '')}</div>
  </div>`).join('')}</div></body>`;
  const htmlPath = SHEET.replace(/\.png$/, '.html');
  writeFileSync(htmlPath, html);
  const p2 = await browser.newPage({ viewport: { width: COLS * CELL + 4, height: Math.min(30000, linhas * (CELL + 12) + 4) } });
  await p2.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await p2.waitForTimeout(2000);
  await p2.screenshot({ path: SHEET, fullPage: true });
  console.log(`[decals] folha de contato → ${path.relative(ROOT, SHEET)} — OLHE ANTES DE ACEITAR`);
}

await browser.close();

/* ── escreve DECAL_FILES dentro do textures.js, entre marcadores ──────────────
 * O padrão da casa é lista literal no textures.js (POSTER_FILES). Manter a lista
 * na mão com centenas de itens envelhece sozinha; então o gerador reescreve o
 * miolo e o resto do arquivo fica intocado.                                     */
function sincronizaTextures(man) {
  const alvo = path.join(ROOT, 'public', 'js', 'textures.js');
  const ini = '/* DECALS:GERADO-INICIO */', fim = '/* DECALS:GERADO-FIM */';
  const src = readFileSync(alvo, 'utf8');
  const a = src.indexOf(ini), b = src.indexOf(fim);
  if (a < 0 || b < 0) { console.warn('[decals] marcadores DECALS:GERADO não achados em textures.js — pulei'); return; }
  const linhas = man.map(m => `    ['${m.file}', ${m.aspect}, '${m.tipo}', ${m.claro ? 1 : 0}],`).join('\n');
  const bloco = `${ini}\n  const DECAL_FILES = [\n${linhas}\n  ];\n  `;
  writeFileSync(alvo, src.slice(0, a) + bloco + src.slice(b));
  console.log(`[decals] textures.js: DECAL_FILES com ${man.length} entradas`);
}

/* ── O RECORTE (roda dentro do Chrome) ────────────────────────────────────────
 * 1. cor(es) de fundo = as 2 mais comuns na borda (2 porque metade das fontes vem
 *    com xadrez de "transparente" chapado na imagem — 1 cor só deixaria metade)
 * 2. flood fill a partir de TODA a borda: só some fundo LIGADO à borda, então
 *    branco do olho do personagem sobrevive
 * 3. mata linha de grade: as folhas de alfabeto têm célula desenhada, e a grade
 *    liga as 26 letras num borrão só — sem isso não existe "uma letra por recorte"
 * 4. franja: alpha = dist(px, fundo)/TOL_SUAVE e des-mistura a cor do fundo.
 *    É isto que tira o halo branco que aparece na parede escura
 * 5. componentes conexos com folga de proximidade (pingo do i junto da letra)
 * 6. >= 6 componentes -> folha múltipla, um PNG por elemento; senão, um PNG só  */
function RECORTE_JS() {
  return `
const TRAB_MAX = 1400;   // teto da resolução de trabalho (custo)
const SAIDA_MAX = 512;   // teto do PNG de saída
const TOL_DURO = 34;     // tolerância do flood fill (chebyshev RGB)
const TOL_SUAVE = 64;    // rampa de alpha da borda — o que mata a franja
const MIN_FRAC = 0.0004; // área mínima de tinta de um componente, fração da imagem
const MIN_LADO = 18;     // lado mínimo do bbox, em px de trabalho
const MIN_PARA_DIVIDIR = 6;
const MAX_POR_FONTE = 40;

const cheb = (r, g, b, c) => Math.max(Math.abs(r - c[0]), Math.abs(g - c[1]), Math.abs(b - c[2]));

window.__recorta = async (uri, opt) => {
  const img = await new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => ok(im); im.onerror = () => no(new Error('imagem não decodificou'));
    im.src = uri;
  });
  const esc = Math.min(1, TRAB_MAX / Math.max(img.width, img.height));
  const W = Math.max(1, Math.round(img.width * esc)), H = Math.max(1, Math.round(img.height * esc));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0, W, H);
  const id = cx.getImageData(0, 0, W, H), d = id.data;

  // 1) cores de fundo = as 2 mais frequentes na borda (quantizadas em 16)
  const conta = new Map();
  const amostra = (x, y) => {
    const i = (y * W + x) * 4;
    const k = (d[i] >> 4) * 4096 + (d[i + 1] >> 4) * 256 + (d[i + 2] >> 4) * 16;
    const e = conta.get(k) || [0, 0, 0, 0];
    e[0] += d[i]; e[1] += d[i + 1]; e[2] += d[i + 2]; e[3]++;
    conta.set(k, e);
  };
  for (let x = 0; x < W; x++) { amostra(x, 0); amostra(x, H - 1); }
  for (let y = 0; y < H; y++) { amostra(0, y); amostra(W - 1, y); }
  const total = 2 * (W + H);
  const ord = [...conta.values()].sort((a, b) => b[3] - a[3]);
  const fundos = [[ord[0][0] / ord[0][3], ord[0][1] / ord[0][3], ord[0][2] / ord[0][3]]];
  if (ord[1] && ord[1][3] / total >= 0.12) fundos.push([ord[1][0] / ord[1][3], ord[1][1] / ord[1][3], ord[1][2] / ord[1][3]]);
  const distFundo = (i) => {
    let m = 1e9;
    for (const f of fundos) { const v = cheb(d[i], d[i + 1], d[i + 2], f); if (v < m) m = v; }
    return m;
  };

  /* 1b) XADREZ DE TRANSPARÊNCIA CHAPADO NA IMAGEM — remoção GLOBAL, não por conexão.
   *     Metade das fontes são captura de tela de editor: o "transparente" veio rasterizado
   *     como o xadrez cinza-claro/branco. O flood da borda só apaga o xadrez LIGADO à
   *     borda — o que fica cercado por tinta (o miolo de uma bolha, o vão de um "R") não
   *     tem caminho até a borda e SOBREVIVE. Foi exatamente isso que o dono viu e chamou
   *     de "tags em xadrez": MEDIDO em tag-pingo.png (255,255,255 a 3,7% e 237,237,237
   *     dentro das letras) e em peca-bolha.png (4,2% + 2,0%), as duas no D_TAG/D_MURAL
   *     de 4 mapas.
   *     O xadrez é fundo POR DEFINIÇÃO, em qualquer lugar da imagem — então a remoção é
   *     global. O gatilho é a assinatura do padrão, não o arquivo: DUAS cores de borda,
   *     as duas neutras, separadas por 8..70 de luminância, cada uma ocupando >= 25% da
   *     borda (é o que alternância quadriculada produz e o que fundo de cor lisa NUNCA
   *     produz). Sem o gatilho isto não roda, e papel branco continua saindo inteiro —
   *     que é o que impede a regra de furar o miolo branco de um desenho. */
  const neutra = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) <= 12;
  const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const XADREZ = fundos.length === 2 && neutra(fundos[0]) && neutra(fundos[1])
    && luma(fundos[0]) >= 150 && luma(fundos[1]) >= 150
    && Math.abs(luma(fundos[0]) - luma(fundos[1])) >= 8
    && Math.abs(luma(fundos[0]) - luma(fundos[1])) <= 70
    && ord[0][3] / total >= 0.25 && ord[1][3] / total >= 0.25;
  /* tolerância PRÓPRIA, mais apertada que a do flood: aqui não há a proteção da
   * conectividade, então 34 comeria cinza-médio de arte legítima. 20 cobre o
   * anti-aliasing do xadrez e nada mais. */
  const TOL_XADREZ = 20;

  // 2) flood fill a partir da borda inteira (só some fundo LIGADO à borda)
  const ehFundo = new Uint8Array(W * H);
  const pilha = new Int32Array(W * H);
  const inunda = () => {
    let sp = 0;
    const push = (p) => {
      if (ehFundo[p]) return;
      if (distFundo(p * 4) > TOL_DURO) return;
      ehFundo[p] = 1; pilha[sp++] = p;
    };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (sp > 0) {
      const p = pilha[--sp], x = p % W, y = (p / W) | 0;
      if (x > 0) push(p - 1);
      if (x < W - 1) push(p + 1);
      if (y > 0) push(p - W);
      if (y < H - 1) push(p + W);
    }
  };
  if (XADREZ) for (let p = 0; p < W * H; p++) if (distFundo(p * 4) <= TOL_XADREZ) ehFundo[p] = 1;
  inunda();

  /* 3) LINHA DE GRADE — e a segunda inundação, que é o ponto.
   *    As folhas de alfabeto vêm com a célula desenhada. A moldura externa da
   *    tabela SELA o papel de dentro: o flood entra pela borda da imagem, bate na
   *    linha e para, e as 26 células ficam brancas e ligadas entre si. MEDIDO na
   *    3ª rodada: "alfabeto-grade" saía 1 recorte — a folha inteira, com grade e
   *    tudo, um retângulo branco na parede.
   *    A espessura é medida contra a COR do fundo (ehClaro) e não contra a máscara
   *    do flood; medir contra a máscara era o bug: dentro da célula o branco ainda
   *    contava como tinta, a caminhada perpendicular nunca terminava em 3 px e
   *    nenhuma linha era reconhecida como linha.
   *    Depois de abrir os furos, inunda() de novo — é a segunda passada que drena
   *    o interior das células.                                                    */
  const ESP = 3, COB = 0.5;
  const ehClaro = (p) => distFundo(p * 4) <= TOL_DURO;
  const mataLinhas = () => {
    const alvo = [];
    const fino = (p, eixo) => {
      const x = p % W, y = (p / W) | 0;
      if (ehClaro(p)) return false;
      let t = 1;
      if (eixo === 0) {
        let u = y - 1, v = y + 1;
        while (u >= 0 && !ehClaro(u * W + x) && t <= ESP) { t++; u--; }
        while (v < H && !ehClaro(v * W + x) && t <= ESP) { t++; v++; }
      } else {
        let u = x - 1, v = x + 1;
        while (u >= 0 && !ehClaro(y * W + u) && t <= ESP) { t++; u--; }
        while (v < W && !ehClaro(y * W + v) && t <= ESP) { t++; v++; }
      }
      return t <= ESP;
    };
    for (let y = 0; y < H; y++) {
      const linha = [];
      for (let x = 0; x < W; x++) { const p = y * W + x; if (fino(p, 0)) linha.push(p); }
      if (linha.length >= COB * W) alvo.push(...linha);
    }
    for (let x = 0; x < W; x++) {
      const col = [];
      for (let y = 0; y < H; y++) { const p = y * W + x; if (fino(p, 1)) col.push(p); }
      if (col.length >= COB * H) alvo.push(...col);
    }
    for (const p of alvo) ehFundo[p] = 1;
    return alvo.length;
  };
  if (mataLinhas() > 0) inunda();

  /* 4) alpha por distância + des-mistura, SÓ NA BANDA DA BORDA.
   *    A rampa de alpha vale apenas para pixel a <= BANDA px do fundo — que é onde
   *    mora a franja do anti-aliasing. Aplicá-la no miolo foi o primeiro erro desta
   *    versão e a folha de contato pegou: o rosto BRANCO do palhaço sobre papel
   *    creme está a ~15 de distância do fundo, virava alpha 0,23 e o palhaço saía
   *    fantasma. Miolo é opaco por definição: se está cercado de tinta, é tinta. */
  const BANDA = 2;
  const naBanda = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (ehFundo[p]) continue;
    for (let dy = -BANDA; dy <= BANDA && !naBanda[p]; dy++) {
      for (let dx = -BANDA; dx <= BANDA; dx++) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= W || v >= H || ehFundo[v * W + u]) { naBanda[p] = 1; break; }
      }
    }
  }
  const alpha = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (ehFundo[p]) { d[i + 3] = 0; alpha[p] = 0; continue; }
    const a = naBanda[p] ? Math.min(1, distFundo(i) / TOL_SUAVE) : 1;
    alpha[p] = a;
    if (a <= 0.004) { d[i + 3] = 0; alpha[p] = 0; continue; }
    // acha o fundo mais próximo p/ des-misturar contra ele
    let melhor = fundos[0], md = 1e9;
    for (const f of fundos) { const v = cheb(d[i], d[i + 1], d[i + 2], f); if (v < md) { md = v; melhor = f; } }
    for (let c = 0; c < 3; c++) {
      d[i + c] = Math.max(0, Math.min(255, Math.round((d[i + c] - melhor[c] * (1 - a)) / a)));
    }
    d[i + 3] = Math.round(a * 255);
  }
  cx.putImageData(id, 0, 0);

  /* 5) componentes conexos numa grade reduzida, com dilatação de proximidade.
   *    O passo da grade é NORMALIZADO (~400 células no lado maior) em vez de fixo
   *    em 4 px. MEDIDO na 2ª rodada: com passo fixo, os "images (N).webp" — que são
   *    miniaturas de ~340 px — davam UM componente bruto para a folha inteira,
   *    porque 4 px de célula + 1 de folga já fechavam o vão entre as letras. Com o
   *    passo proporcional, folha grande e miniatura enxergam a mesma vizinhança. */
  const B = Math.max(1, Math.round(Math.max(W, H) / 400));
  const GW = Math.ceil(W / B), GH = Math.ceil(H / B);
  const cheio = new Uint8Array(GW * GH), tinta = new Float32Array(GW * GH);
  for (let p = 0; p < W * H; p++) {
    if (alpha[p] < 0.35) continue;
    const g = (((p / W) | 0) / B | 0) * GW + (((p % W) / B) | 0);
    cheio[g] = 1; tinta[g] += alpha[p];
  }
  /* Raio de folga: só o bastante pra colar o pingo do "i" no corpo da letra.
   * MEDIDO na 1ª rodada: com 0.011 do diagonal (≈20 px de raio, 40 px de vão
   * fechado) as 26 letras de TODA folha de alfabeto viraram UM componente só —
   * saíam 1 recorte no lugar de 26. 0.004 é o que separa letra de letra. */
  const R = Math.max(1, Math.round(0.004 * Math.hypot(W, H) / B));
  const gordo = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    if (!cheio[gy * GW + gx]) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const y = gy + dy, x = gx + dx;
      if (x >= 0 && y >= 0 && x < GW && y < GH) gordo[y * GW + x] = 1;
    }
  }
  const rot = new Int32Array(GW * GH).fill(-1);
  const caixas = []; const fila = new Int32Array(GW * GH);
  for (let s = 0; s < GW * GH; s++) {
    if (!gordo[s] || rot[s] >= 0) continue;
    const id2 = caixas.length; let qi = 0, qn = 0;
    rot[s] = id2; fila[qn++] = s;
    const bx = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, tinta: 0, rot: id2 };
    while (qi < qn) {
      const g = fila[qi++], gx = g % GW, gy = (g / GW) | 0;
      if (cheio[g]) {
        if (gx < bx.x0) bx.x0 = gx; if (gx > bx.x1) bx.x1 = gx;
        if (gy < bx.y0) bx.y0 = gy; if (gy > bx.y1) bx.y1 = gy;
        bx.tinta += tinta[g];
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
        const n = y * GW + x;
        if (gordo[n] && rot[n] < 0) { rot[n] = id2; fila[qn++] = n; }
      }
    }
    if (bx.x1 >= 0) caixas.push(bx);
  }
  const tintaTotal = caixas.reduce((s, c) => s + c.tinta, 0) || 1;
  let comps = caixas
    .filter(c => c.tinta >= MIN_FRAC * W * H
      && (c.x1 - c.x0 + 1) * B >= MIN_LADO && (c.y1 - c.y0 + 1) * B >= MIN_LADO)
    .sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));

  // Folha de alfabeto É folha múltipla por definição — o rótulo já diz isso, então
  // ela não precisa juntar 6 componentes pra ganhar o direito de ser dividida.
  const minDiv = opt.tipo === 'alfabeto' ? 3 : MIN_PARA_DIVIDIR;
  /* Os rótulos que sobreviveram ao filtro. Precisa ser capturado ANTES do colapso
   * em união, senão a máscara do recorte único fica com conjunto vazio e o PNG sai
   * 100% transparente — foi exatamente o que aconteceu na 4ª rodada com
   * alfabeto-grade, alfabeto-bolha2, alfabeto-marcador e peca-palhaco. */
  const guardados = new Set(comps.map(c => c.rot));
  const divide = !opt.inteiro && comps.length >= minDiv;
  if (!divide) {
    // uma peça só: bbox da união do que sobrou (ignora sujeira solta minúscula)
    const uso = comps.length ? comps : caixas;
    const u = uso.reduce((a, c) => ({
      x0: Math.min(a.x0, c.x0), y0: Math.min(a.y0, c.y0),
      x1: Math.max(a.x1, c.x1), y1: Math.max(a.y1, c.y1),
      tinta: tintaTotal,
    }), { x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
    comps = u.x1 >= 0 ? [u] : [];
  } else {
    comps = comps.sort((a, b) => b.tinta - a.tinta).slice(0, MAX_POR_FONTE)
      .sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
  }

  /* 6) recorta, APAGA O QUE NÃO É DESTE COMPONENTE, mede e serializa.
   *    A máscara por componente é o que impede a letra vizinha de aparecer meio
   *    cortada no canto do recorte, e é o que limpa a sujeira de compressão do
   *    webp (ilha de 4 px que passou no flood mas não virou componente).           */
  const saida = [];
  for (const c of comps) {
    const pad = Math.max(2, Math.round(0.02 * Math.max((c.x1 - c.x0) * B, (c.y1 - c.y0) * B)));
    const x0 = Math.max(0, c.x0 * B - pad), y0 = Math.max(0, c.y0 * B - pad);
    const x1 = Math.min(W, (c.x1 + 1) * B + pad), y1 = Math.min(H, (c.y1 + 1) * B + pad);
    const cw = x1 - x0, ch = y1 - y0;
    if (cw < MIN_LADO || ch < MIN_LADO) continue;

    // recorte em resolução de trabalho, já mascarado
    const mc = document.createElement('canvas'); mc.width = cw; mc.height = ch;
    const mx = mc.getContext('2d', { willReadFrequently: true });
    mx.drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);
    const mi = mx.getImageData(0, 0, cw, ch), md = mi.data;
    const meus = c.rot !== undefined ? new Set([c.rot]) : guardados;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const g = (((y + y0) / B) | 0) * GW + (((x + x0) / B) | 0);
      if (!meus.has(rot[g])) md[(y * cw + x) * 4 + 3] = 0;
    }
    mx.putImageData(mi, 0, 0);

    const k = Math.min(1, SAIDA_MAX / Math.max(cw, ch));
    const ow = Math.max(1, Math.round(cw * k)), oh = Math.max(1, Math.round(ch * k));
    const oc = document.createElement('canvas'); oc.width = ow; oc.height = oh;
    const ox = oc.getContext('2d', { willReadFrequently: true });
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(mc, 0, 0, cw, ch, 0, 0, ow, oh);

    /* MEDIDAS DE ACEITE — a régua que reprova recorte ruim sem eu ter que olhar
     * 1000 PNGs de novo. "cobertura" pega o fantasma (fonte de baixo contraste
     * que virou quase nada). "borda" pega o oposto: fundo que NÃO saiu, e o
     * recorte é um retângulo cheio (foto de muro, peça sobre respingo). */
    const od = ox.getImageData(0, 0, ow, oh).data;
    let sl = 0, sa = 0, opacos = 0;
    for (let i = 0; i < od.length; i += 4) {
      const a = od[i + 3] / 255; if (a < 0.5) continue;
      opacos++;
      sl += (0.299 * od[i] + 0.587 * od[i + 1] + 0.114 * od[i + 2]) * a; sa += a;
    }
    let anel = 0, anelOp = 0;
    const toca = (x, y) => { const a = od[(y * ow + x) * 4 + 3]; anel++; if (a > 127) anelOp++; };
    for (let x = 0; x < ow; x++) { toca(x, 0); toca(x, oh - 1); }
    for (let y = 0; y < oh; y++) { toca(0, y); toca(ow - 1, y); }

    saida.push({
      w: ow, h: oh, lum: sa ? sl / sa : 0, comps: comps.length, brutos: caixas.length,
      cobertura: opacos / (ow * oh), borda: anelOp / anel, xadrez: XADREZ,
      png: oc.toDataURL('image/png').split(',')[1],
    });
  }
  return saida;
};
`;
}
