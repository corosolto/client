/* ============================================================================
   gen-graffiti-layout.mjs — ASSA O GRAFITE DE TODOS OS MAPAS DECLARADOS.
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
     node tools/eval/serve.mjs 4510 &    # e BASE=http://127.0.0.1:4510 em cada comando
     node tools/gen-graffiti-layout.mjs            # todos os MAP_SOURCES
     node tools/gen-graffiti-layout.mjs quebrada
     node tools/gen-graffiti-layout.mjs --checkpoint=/tmp/graffiti-bake-state.json
     EGO_TASK_SPACE=32 node tools/gen-graffiti-layout.mjs  # reutiliza p2 no Ego


   Entrada que falta (GLB, decalque, erro da página) cancela o bake daquele mapa.
   `GRAFITE_DERRUBA=<regex>` derruba as requisições que casam: é o gancho da régua
   `eval:grafite-fiel`, que prova que a trava morde.
   ============================================================================ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { impressao, MAP_SOURCES } from './eval/graffiti-fingerprint.mjs';
import { capturarGrafiteEgo } from './eval/ego-graffiti-bake.mjs';

const BASE = process.env.BASE;
const SAIDA = 'public/js/graffiti_layout.js';
const MAPAS = Object.keys(MAP_SOURCES);
const ARGS = process.argv.slice(2);
const ONLY = ARGS.find((a) => !a.startsWith('--'));
const CHECKPOINT = ARGS.find(a => a.startsWith('--checkpoint='))?.slice(13);
const CHECKPOINT_ONLY = ARGS.includes('--checkpoint-only');
const EGO_SPACE = Number(process.env.EGO_TASK_SPACE || 0);
if (process.env.EGO_TASK_SPACE !== undefined && (!Number.isSafeInteger(EGO_SPACE) || EGO_SPACE <= 0)) {
  throw Error('EGO_TASK_SPACE deve ser um inteiro positivo; bake cancelado');
}
const checkpoint = CHECKPOINT && existsSync(CHECKPOINT) ? JSON.parse(readFileSync(CHECKPOINT, 'utf8')) : { maps: {} };
const inputSources = ['public/js/textures.js', 'public/js/mapprops.js', 'public/js/graffiti_art_id.js'];
const inputDigest = () => createHash('sha256').update(inputSources.map(file => file + '\0' + readFileSync(file, 'utf8')).join('\0')).digest('hex');
const producerInputs = inputDigest();
const hashAssets = (directory, assetHash) => {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) hashAssets(file, assetHash);
    else if (/\.(glb|png|jpe?g|webp)$/i.test(entry.name)) assetHash.update(file).update(readFileSync(file));
  }
};
const assetsDigest = () => {
  const assetHash = createHash('sha256');
  for (const directory of ['public/models/props', 'public/img/decals', 'public/posters']) hashAssets(directory, assetHash);
  return assetHash.digest('hex');
};
const assets = assetsDigest();
if (checkpoint.assets !== assets || checkpoint.inputs !== producerInputs) checkpoint.maps = {};
checkpoint.assets = assets;
checkpoint.inputs = producerInputs;

if (ONLY && !MAP_SOURCES[ONLY]) throw Error(`Mapa de grafite desconhecido: ${ONLY}`);
/* SÓ A IMPRESSÃO: reassina as entradas SEM reassar a colocação. Duas rodadas na mesma árvore
   já deram 2769 e 2767 peças (loja_h 300 e 298). A passada é determinística sobre a cena que
   recebe; o que pode variar é a cena (um prop que não carrega some em silêncio). O bake agora
   cancela quando falta entrada (#1109). Com os suportes da curadoria PROVADAMENTE
   preservados, é possível atualizar a impressão sem trocar a arte aprovada. Exige
   motivo, e o motivo fica gravado no arquivo. Ver KNOWN-BUGS BUG-158. */
const SO_IMPRESSAO = ARGS.includes('--so-impressao');
const MOTIVO = (ARGS.find((a) => a.startsWith('--motivo=')) || '').slice(9);
if (SO_IMPRESSAO && !MOTIVO) {
  console.error('--so-impressao exige --motivo="por que a colocação não muda"');
  process.exit(1);
}

if (!BASE && !SO_IMPRESSAO) { console.error('BASE ausente: aponte para o SEU servidor (ex.: node tools/eval/serve.mjs 4510 & BASE=http://127.0.0.1:4510 npm run grafite). Sem padrão de propósito: localhost:8123 costuma ser o servidor de outra sessão, com outra árvore.'); process.exit(2); }

/* Rodar um mapa preserva os demais layouts declarados. */
const anterior = {};
let previousFingerprint = null;
if (existsSync(SAIDA)) {
  const txt = readFileSync(SAIDA, 'utf8');
  const json = txt.match(/^export const GRAFITE = (.+);$/m)?.[1];
  if (!json) throw Error('Layout anterior não reconhecido; regeneração cancelada');
  Object.assign(anterior, JSON.parse(json));
  const previous = txt.match(/^export const GRAFITE_FP = (.+);$/m)?.[1];
  if (previous) previousFingerprint = JSON.parse(previous);
  for (const id of Object.keys(anterior)) if (!MAP_SOURCES[id]) delete anterior[id];
}

/* Reassinar sem reassar: nenhuma peça muda, só a impressão das entradas. Sai antes do
   navegador — o custo do gerador é o browser, e aqui ele não é preciso. */
if (SO_IMPRESSAO) {
  const fpNovo = impressao();
  const txt = readFileSync(SAIDA, 'utf8');
  const marca = `\n/* REASSINADO SEM REASSAR em ${new Date().toISOString().slice(0, 10)} — ${MOTIVO}\n`
    + `   As colocações existentes foram preservadas; o motivo delimita a revalidação\n`
    + `   das fontes e dos suportes. */\n`;
  const semFp = txt.replace(/\n\/\* REASSINADO SEM REASSAR[\s\S]*?\*\/\n/g, '')
    .replace(/export const GRAFITE_FP = .*;\n/, '');
  writeFileSync(SAIDA, semFp + marca + `export const GRAFITE_FP = ${JSON.stringify(fpNovo)};\n`);
  const pecas = (txt.match(/(\d+) peças no total/) || [])[1];
  console.log(`-> ${SAIDA}  impressão reassinada, ${pecas} peças INTACTAS (motivo: ${MOTIVO})`);
  process.exit(0);
}

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const inputFingerprint = impressao();
if (ONLY && !CHECKPOINT_ONLY && previousFingerprint?.pass !== inputFingerprint.pass)
  throw Error('A passada mudou: regerar um mapa não pode reassinar os demais. Regere todos ou use --checkpoint-only para diagnosticar.');
let browser;
if (!EGO_SPACE) {
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }), headless: true,
  args: ['--mute-audio'],
});
}

try {
for (const id of MAPAS) {
  if (ONLY && id !== ONLY) continue;
  const mapFp = impressao();
  const saved = checkpoint.maps[id];
  if (saved?.pass === mapFp.pass && saved?.map === mapFp.maps[id]) {
    anterior[id] = saved.layout; console.log(`  ${id}: checkpoint validado (${saved.layout.pecas.length} peças)`); continue;
  }
  console.log(`  ${id}: iniciando passada viva`);
  let g, actualMap, faltas = [];
  const viewId = id;
  if (EGO_SPACE) {
    ({ g, actualMap, faltas } = capturarGrafiteEgo({ base: BASE, id, space: EGO_SPACE,
      page: process.env.EGO_PAGE || 'p2', block: process.env.GRAFITE_DERRUBA || '' }));
  } else {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  /* ENTRADA QUE FALTA CANCELA O BAKE (#1109). A passada é determinística sobre a cena que
     recebe; o que varia entre rodadas é a cena. `preloadMapProps` engole GLB que não
     carregou e o mapa sobe sem ele: só a `statue_liberty.glb` faltando leva a loja_h de
     186 a 200 peças, sem erro nenhum. Requisição perdida, erro da página e prop que não
     decodificou viram falha alta, com a lista, em vez de um layout diferente. */
  page.on('pageerror', (e) => { console.log('  [pageerror]', e.message); faltas.push(`pageerror: ${e.message}`); });
  page.on('requestfailed', (r) => faltas.push(`falhou: ${r.url()} (${r.failure()?.errorText || '?'})`));
  page.on('response', (r) => { if (r.status() >= 400) faltas.push(`${r.status()}: ${r.url()}`); });
  page.on('console', (m) => { if (/load failed/.test(m.text())) faltas.push(`console: ${m.text().slice(0, 160)}`); });
  if (process.env.GRAFITE_DERRUBA) await page.route(new RegExp(process.env.GRAFITE_DERRUBA), (route) => route.abort());
  // `grafite=vivo`: manda o mapa RODAR a passada em vez de aplicar o layout assado
  await page.goto(`${BASE}/mapview.html?map=${viewId}&grafite=vivo`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.MAPEVAL && window.MAPEVAL.ready===true', null, { timeout: 1200000 });
  g = await page.evaluate(() => window.__grafite || null);
  actualMap = await page.evaluate(() => window.__mapId);
  await page.close();
  }
  if (faltas.length) {
    throw Error(`${id}: ${faltas.length} entrada(s) faltando na cena; bake cancelado, layout anterior preservado:\n    `
      + [...new Set(faltas)].slice(0, 20).join('\n    '));
  }
  if (actualMap !== viewId || g?.mapa !== id || !g?.pass?.layout?.pecas?.length) {
    throw Error(`${id}: mapa/passada inválidos (${actualMap}/${g?.mapa}); bake cancelado`);
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
  const afterFp = impressao();
  if (afterFp.pass !== mapFp.pass || afterFp.maps[id] !== mapFp.maps[id] || inputDigest() !== producerInputs || assetsDigest() !== assets) throw Error(`${id}: entrada alterada durante a passada; checkpoint anterior preservado`);
  checkpoint.maps[id] = { pass: mapFp.pass, map: mapFp.maps[id], layout: anterior[id] };
  if (CHECKPOINT) { mkdirSync(dirname(CHECKPOINT), { recursive: true }); writeFileSync(CHECKPOINT, JSON.stringify(checkpoint)); }
  console.log(`  ${id}: ${anterior[id].pecas.length} peças · ${anterior[id].arquivos.length} arquivos · `
    + `${anterior[id].murais.length} murais · ${g.ms} ms de passada`);
}
} finally { await browser?.close(); }

if (CHECKPOINT_ONLY) {
  console.log('Checkpoint de diagnóstico concluído; layout público não foi escrito.');
  process.exit(0);
}

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
/* IMPRESSÃO DIGITAL DAS ENTRADAS (issue #82): o hash do fonte de cada map_*.js e da
   passada, gravado JUNTO com a saída assada. É contra isto que a
   `tools/eval/graffiti-layout-check.mjs` cobra FRESCOR — se a geometria/banda de um
   mapa ou o algoritmo da passada mudar e ninguém regerar, o hash não bate e o portão
   fecha. Mesma origem (`graffiti-fingerprint.mjs`) para não discordar de si mesma. */
const currentFingerprint = impressao();
if (JSON.stringify(currentFingerprint) !== JSON.stringify(inputFingerprint) || inputDigest() !== producerInputs || assetsDigest() !== assets) throw Error('Entradas alteradas durante o bake; layout anterior preservado. Reinicie com as entradas congeladas.');
const fp = ONLY ? { pass: currentFingerprint.pass, maps: { ...previousFingerprint.maps, [ONLY]: currentFingerprint.maps[ONLY] } } : currentFingerprint;
const rodape = `\n/* IMPRESSÃO DIGITAL DAS ENTRADAS (issue #82) — GERADA junto com o layout, ver\n`
  + `   tools/eval/graffiti-fingerprint.mjs. Cobrada por tools/eval/graffiti-layout-check.mjs. */\n`
  + `export const GRAFITE_FP = ${JSON.stringify(fp)};\n`;
writeFileSync(SAIDA, cabecalho + JSON.stringify(anterior) + ';\n' + rodape);
console.log(`-> ${SAIDA}  (${total} peças, ${(JSON.stringify(anterior).length / 1024).toFixed(0)} KB, fp pass ${fp.pass})`);
