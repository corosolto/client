/* pixo-preview.mjs — renderiza o alfabeto de pixação e as 4 faixas num PNG.
 *
 * POR QUE EXISTE: o alfabeto de `textures.js` (PIXO_GLYPHS / pixoLine) é desenhado em
 * polilinha, e polilinha errada não dá erro — dá letra torta. A regra da casa é explícita:
 * "gere a figura, olhe a figura, e descreva o que você viu". Este arnês é a figura.
 *
 * Uso: node tools/eval/pixo-preview.mjs [saida.png]
 */
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = process.argv[2] || path.join(ROOT, 'tools', 'eval', 'out', 'pixo.png');
mkdirSync(path.dirname(OUT), { recursive: true });

const gRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// recorta do textures.js o alfabeto e o desenhador — mesma técnica do mode-check:
// o arnês roda o CÓDIGO DE PRODUÇÃO, não uma cópia que envelhece sozinha.
const src = readFileSync(path.join(ROOT, 'public', 'js', 'textures.js'), 'utf8');
const corte = (marca, fim) => {
  const i = src.indexOf(marca);
  if (i < 0) throw new Error(`não achei ${marca} em textures.js — o arnês falha em vez de passar`);
  const j = src.indexOf(fim, i);
  return src.slice(i, j);
};
const alfabeto = corte('const PIXO_GLYPHS = {', '/* Frases curtas');
const palavras = corte('const PIXO_WORDS = [', '\n\n');
const desenha = corte('function pixoLine(', '\n}\n') + '\n}\n';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
await page.setContent('<body style="margin:0;background:#9a938a"><canvas id="c" width="1100" height="720"></canvas></body>');
await page.evaluate(({ alfabeto, palavras, desenha }) => {
  // eslint-disable-next-line no-new-func
  new Function(`${alfabeto}\n${palavras}\n${desenha}
    const x = document.getElementById('c').getContext('2d');
    x.fillStyle = '#9a938a'; x.fillRect(0, 0, 1100, 720);
    // 1) alfabeto inteiro, 2 linhas
    const letras = Object.keys(PIXO_GLYPHS).filter(k => k !== ' ');
    pixoLine(x, letras.slice(0, 14).join(''), 20, 20, 110, '#111', 3);
    pixoLine(x, letras.slice(14).join(''),   20, 150, 110, '#111', 9);
    // 2) as frases, no tamanho de parede
    PIXO_WORDS.slice(0, 5).forEach((w, i) => pixoLine(x, w, 20, 300 + i * 82, 70, '#111', i * 13 + 1));
    // 3) variante branca sobre faixa escura (a que vai em parede escura)
    x.fillStyle = '#2b2b2b'; x.fillRect(600, 300, 480, 180);
    pixoLine(x, 'CORO SOLTO', 615, 320, 70, 'rgba(238,238,238,.92)', 5);
    pixoLine(x, 'ZONA LESTE', 615, 400, 62, 'rgba(238,238,238,.92)', 21);
  `)();
}, { alfabeto, palavras, desenha });
await page.locator('#c').screenshot({ path: OUT });
await browser.close();
console.log('✓', path.relative(ROOT, OUT));
