/* ============================================================================
   gen-graffiti-layout.mjs — ASSA A COLOCAÇÃO DO GRAFITE DOS MAPAS.
   ----------------------------------------------------------------------------
   POR QUE ASSAR (a conta que decidiu)

   A passada medida (`public/js/graffiti_pass.js`) acha parede por raycast a partir
   dos waypoints e pinta o que achar. Ela funciona: a Quebrada saiu de 12,7% para
   ~90% de cobertura de parede. Mas ela custa 8,9 s na Quebrada, e o build INTEIRO
   do Piscina custa 88 ms. São ~35.000 raycasts contra malha de verdade a ~0,15 ms
   cada, e o número de raios É a cobertura — cortar raio é cortar arte.

   Como a colocação é função pura de (geometria do mapa, semente), ela só muda
   quando alguém edita o mapa. Então roda aqui, uma vez, NO NAVEGADOR — que é o
   único lugar onde os GLB existem; em node os barracos não carregam e a passada
   pintaria a casca procedural, que é exatamente o erro que fez o dono ver parede
   pelada com o probe jurando 334 peças.

   O que sai: `public/js/graffiti_layout.js`, um módulo com nome de arquivo (nunca
   índice — índice desliza quando o pacote de decalques é renumerado) e o retângulo
   de cada peça.

   QUANDO RODAR: depois de mexer em geometria de mapa, em pool de decalque ou nas
   bandas da passada. Se não rodar, o layout fica velho e a peça pode sobrar no ar —
   e é a `graffiti-census` que cobra isso (ela conta arte sem parede atrás na cena
   real, e é por isso que ela mede o jogo e não este arquivo).

   Uso:
     npm run eval:serve &
     node tools/gen-graffiti-layout.mjs            # todos
     node tools/gen-graffiti-layout.mjs quebrada
   ============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8123';
const SAIDA = 'public/js/graffiti_layout.js';
const MAPAS = [
  'praca_poderes', 'piscina_treta', 'loja_h', 'ferro_velho', 'quebrada',
  'fy_escadao', 'fy_campomorro', 'fy_lajes', 'fy_corrego', 'fy_mansao',
];
const ONLY = process.argv[2];
const semPassada = [];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

/* Layout anterior preservado por mapa: rodar só um mapa não pode apagar os outros
   quatro (regra da casa: nada destrutivo por efeito colateral). */
const anterior = {};
if (existsSync(SAIDA)) {
  const txt = readFileSync(SAIDA, 'utf8');
  const i = txt.indexOf('export const GRAFITE =');
  if (i >= 0) {
    try {
      const json = txt.slice(txt.indexOf('{', i), txt.lastIndexOf('}') + 1);
      Object.assign(anterior, JSON.parse(json));
    } catch { /* arquivo antigo em outro formato: recomeça */ }
  }
}

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

for (const id of MAPAS) {
  if (ONLY && id !== ONLY) continue;
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  // `grafite=vivo`: manda o mapa RODAR a passada em vez de aplicar o layout assado
  await page.goto(`${BASE}/mapview.html?map=${id}&grafite=vivo`, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.MAPEVAL && window.MAPEVAL.ready===true', null, { timeout: 300000 });
  const g = await page.evaluate(() => window.__grafite || null);
  await page.close();
  if (!g || !g.pass || !g.pass.layout) {
    /* Sem passada o `anterior[id]` ficaria congelado para sempre: a Mansão rodou
       meses com 18 peças de um pixo vetado porque o mapa parou de chamar
       `grafitar` e ninguém percebeu. Fóssil se apaga, e o erro sobe alto. */
    delete anterior[id];
    semPassada.push(id);
    console.log(`  ${id}: SEM PASSADA — o mapa não chama grafitar(); entrada velha apagada`);
    continue;
  }
  anterior[id] = {
    arquivos: g.pass.layout.arquivos, pecas: g.pass.layout.pecas,
    murais: (g.hom && g.hom.layout) || [],
    /* A ZONA LIMPA VIAJA JUNTO. Ela é decisão de direção de arte declarada no mapa
       ("na Loja H o grafite fica só do lado de fora"), e quem precisa dela depois é a
       `graffiti-census`: sem isso ela conta a parede interna da loja como dívida e
       reprova pra sempre uma coisa que está certa de propósito. */
    ...(g.pass.layout.limpo ? { limpo: g.pass.layout.limpo } : {}),
  };
  /* Filtro de sobreposição, mesma regra da graffiti-audit (plano ±0,35 m, fração >
     0,12): a passada às vezes ancora em face diagonal de canto (a peça de 15/08 no
     vão pinçado do lajes, ry=1,12 sobre o anexo) e o par nasce sobreposto. A régua
     cobra — então a limpeza é no assado, não no teto. Corta a peça menor do par. */
  {
    const P = anterior[id].pecas;
    let cortou = 0, mudou = true;
    while (mudou) {
      mudou = false;
      for (let i = 0; i < P.length && !mudou; i++) for (let j = i + 1; j < P.length && !mudou; j++) {
        const a = P[i], b = P[j];
        if (Math.abs(Math.cos(b[4] - a[4])) < 0.9) continue;
        const anx = Math.sin(a[4]), anz = Math.cos(a[4]), ax = Math.cos(a[4]), az = -Math.sin(a[4]);
        const dx = b[1] - a[1], dy = b[2] - a[2], dz = b[3] - a[3];
        if (Math.abs(dx * anx + dz * anz) > 0.35) continue;
        const du = Math.abs(dx * ax + dz * az), dv = Math.abs(dy);
        const ou = (a[5] + b[5]) / 2 - du, ov = (a[6] + b[6]) / 2 - dv;
        if (ou <= 0 || ov <= 0) continue;
        if ((ou * ov) / Math.min(a[5] * a[6], b[5] * b[6]) > 0.12) {
          P.splice(a[5] * a[6] < b[5] * b[6] ? i : j, 1);
          cortou++; mudou = true;
        }
      }
    }
    if (cortou) console.log(`  ${id}: ${cortou} peça(s) sobreposta(s) cortada(s) no assado`);
  }
  console.log(`  ${id}: ${anterior[id].pecas.length} peças · ${anterior[id].arquivos.length} arquivos · `
    + `${anterior[id].murais.length} murais · ${g.ms} ms de passada`);
}
await browser.close();

const total = Object.values(anterior).reduce((a, m) => a + m.pecas.length, 0);
const cabecalho = `/* ============================================================================
   graffiti_layout.js — GERADO. NÃO EDITE À MÃO.
   ----------------------------------------------------------------------------
   Sai de \`node tools/gen-graffiti-layout.mjs\`, que roda a passada de
   \`graffiti_pass.js\` NO NAVEGADOR (onde os GLB existem) e congela o resultado.
   Ver o porquê no cabeçalho do gen-graffiti-layout.mjs: a passada custa segundos e
   o build de mapa tem orçamento de milissegundos.

   Formato: por mapa, \`arquivos\` é a lista de NOMES de PNG usados (nome, não índice
   — índice desliza quando o pacote é renumerado) e cada peça é
   \`[arquivo, x, y, z, ry, largura, altura]\` com o centro do quad em coordenada de
   mundo. \`murais\` é \`[nome, x, y, z, ry, w, h]\` das homenagens.

   REGERE depois de mexer em geometria de mapa, em pool de decalque ou nas bandas.
   Layout velho aparece na \`tools/eval/graffiti-census.mjs\` como cobertura caindo
   ou como peça sem parede atrás.
   ${total} peças no total.
   ============================================================================ */
export const GRAFITE = `;
writeFileSync(SAIDA, cabecalho + JSON.stringify(anterior) + ';\n');
console.log(`-> ${SAIDA}  (${total} peças, ${(JSON.stringify(anterior).length / 1024).toFixed(0)} KB)`);
if (semPassada.length) {
  console.error(`SEM PASSADA: ${semPassada.join(', ')} — o arquivo foi gravado sem fóssil, mas o mapa precisa chamar grafitar()`);
  process.exit(1);
}
