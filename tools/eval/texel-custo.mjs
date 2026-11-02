/* ============================================================================
   texel-custo.mjs — O PREÇO DA NITIDEZ, MEDIDO NO NAVEGADOR, NOS 10 MAPAS.
   ----------------------------------------------------------------------------
   POR QUE EXISTE (separado do texel-check.mjs)
   O texel-check mede densidade em node e é barato. Custo NÃO se mede em node: o
   harness troca o WebGLRenderer por um Proxy, então `renderer.info.memory.textures`
   ali é literalmente `() => {}`. Medir custo no stub seria a LIÇÃO 3 no pior lugar
   possível — o número que autoriza a mudança viria de um mundo onde a mudança não
   custa nada.

   E o custo aqui não é teórico. Subir densidade de texel tem três formas de virar
   REGRESSÃO, e esta régua vigia as três:
     · canvas maior (256² -> 512²) quadruplica bytes de textura e de mipmap;
     · `map.clone()` por superfície multiplica OBJETOS de textura (o caminho que
       esta rodada evitou de propósito — ver o comentário de aoBoxGeo em vao.js);
     · material novo por escala vira PROGRAMA de shader novo e quebra o batch,
       e o cabeçalho do mapprops.js registra que o loja_h já bateu 4.347 draw calls
       contra teto de 300-800.
   O projeto JÁ TEVE crash de OOM (ver KNOWN-BUGS), então heap tem alarme aqui.

   NÃO É UM GATE COM LIMIAR ABSOLUTO, é um A/B: rode antes da mudança gravando
   `--saida=antes.json`, rode depois com `--contra=antes.json` e ela imprime a
   variação por mapa e reprova se algum eixo piorar além da margem. Limiar de
   margem: 5% em draw calls e triângulos (ruído de bots vivos entre execuções),
   10% em texturas e heap. `--teto` liga também os tetos absolutos do cena-tetos.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/texel-custo.mjs --saida=/tmp/custo-antes.json
     node tools/eval/texel-custo.mjs --saida=/tmp/custo-depois.json --contra=/tmp/custo-antes.json
   ============================================================================ */
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (n, d = null) => {
  const p = process.argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : (process.argv.includes(`--${n}`) ? true : d);
};
const SAIDA = arg('saida');
const CONTRA = arg('contra');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const QS = arg('qs', '');
const ESPERA = +(arg('espera', 6000));

/* Margem de ruído: bots vivos mudam quantos objetos entram no frustum entre duas
   execuções, então calls/tris oscilam sozinhos. Textura e heap são estáveis (não
   dependem de quem está no frustum), por isso margem menor não faria sentido —
   é o contrário: eles só mudam se a MUDANÇA os mudou. */
/* CORREÇÃO MEDIDA (12/08) — "textura e heap são estáveis" ACIMA ESTÁ ERRADO, e a leitura
   errada custou um vermelho falso. `renderer.info.memory.textures` conta textura JÁ SUBIDA
   pra GPU, e neste harness o render é software (swiftshader, 1-2 fps): quantas subiram até
   o instante da amostra depende de quanto o mapa conseguiu desenhar, não do que a mudança
   fez. Medido no escadao, MESMO estado, 5 execuções: 198, 205, 205, 205, 218 — 10% de
   amplitude sem uma linha de código mudar, e a execução de 218 acendeu
   "✗ CUSTO escadao: textures subiu 10.1%" contra uma mudança que não cria textura
   nenhuma. `geometries` oscilou junto (1468 a 2167).
   COMO LER ESTA RÉGUA, então: uma execução de cada lado NÃO decide nada perto da margem.
   Repita 3 vezes cada lado e compare a MODA; se as duas modas forem iguais, o eixo não se
   moveu. E lembre que este contador conta OBJETO, não BYTE — ele é cego para canvas que
   dobra de 256² para 512², que é justamente o custo desta frente. Esse tem que ser contado
   à mão: 3 texturas (albedo + normal + roughness) × (512² − 256²) × 4 B × 1,33 de mipmap
   ≈ 3,1 MB por família de textura promovida. */
const MARGEM = { calls: 0.05, tris: 0.05, textures: 0.10, heapMB: 0.15, programs: 0.10 };

const MAPAS = [
  ['praca_poderes', 'P,mst'], ['piscina_treta', 'P,mst'], ['loja_h', 'B,bozo'],
  ['ferro_velho', 'B,bozo'], ['quebrada', 'P,mst'], ['escadao', 'P,mst'],
  ['campomorro', 'P,mst'], ['lajes', 'P,mst'], ['corrego', 'P,mst'],
  ['mansao', 'P,mst'],
].filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x[0]));

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});

const out = [];
for (const [mapa, auto] of MAPAS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  const rec = { mapa };
  try {
    await page.goto(`${BASE}/?debug=1&map=${mapa}&auto=${auto}${QS}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
    await page.waitForTimeout(ESPERA);
    Object.assign(rec, await page.evaluate(() => new Promise((res) => {
      const g = window.__game, r = g && g.renderer;
      if (!r) return res({ err: 'sem renderer' });
      const F = 20;
      r.info.autoReset = false; r.info.reset();
      let n = 0; const t = performance.now();
      (function tick() {
        if (++n >= F) {
          const i = r.info, ms = (performance.now() - t) / F;
          r.info.autoReset = true;
          return res({
            calls: Math.round(i.render.calls / F), tris: Math.round(i.render.triangles / F),
            textures: i.memory.textures, geometries: i.memory.geometries,
            programs: r.info.programs ? r.info.programs.length : null,
            fps: +(1000 / ms).toFixed(1),
            heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
          });
        }
        requestAnimationFrame(tick);
      })();
    })));
  } catch (e) { rec.fatal = e.message.split('\n')[0]; }
  rec.errs = errs.slice(0, 3);
  out.push(rec);
  console.log('  ' + mapa.padEnd(16) +
    ['calls', 'tris', 'textures', 'geometries', 'programs', 'heapMB', 'fps']
      .map((k) => `${k}=${rec[k] ?? '?'}`).join('  ') + (rec.fatal ? '  FATAL:' + rec.fatal : ''));
  await page.close();
}
await browser.close();

if (SAIDA) { writeFileSync(SAIDA, JSON.stringify(out, null, 1)); console.log(`\n  → ${SAIDA}`); }

if (CONTRA) {
  const antes = JSON.parse(readFileSync(CONTRA, 'utf8'));
  const byId = new Map(antes.map((x) => [x.mapa, x]));
  const falhas = [];
  console.log('\n  A/B de custo (antes → depois, Δ%):');
  console.log('  ' + '-'.repeat(96));
  for (const d of out) {
    const a = byId.get(d.mapa);
    if (!a) { console.log(`  ${d.mapa}: sem baseline`); continue; }
    const cel = [];
    for (const k of ['calls', 'tris', 'textures', 'programs', 'heapMB', 'fps']) {
      const va = a[k], vd = d[k];
      if (va == null || vd == null) { cel.push(`${k}=n/d`); continue; }
      const dp = va ? (vd - va) / va : 0;
      cel.push(`${k} ${va}→${vd} (${dp >= 0 ? '+' : ''}${(100 * dp).toFixed(1)}%)`);
      if (MARGEM[k] != null && dp > MARGEM[k])
        falhas.push(`CUSTO ${d.mapa}: ${k} subiu ${(100 * dp).toFixed(1)}% (${va} → ${vd}), margem ${(100 * MARGEM[k]).toFixed(0)}%. ` +
          `A nitidez virou regressão: reveja se a mudança clonou textura/material por superfície em vez de escalar UV na geometria.`);
    }
    console.log(`  ${d.mapa.padEnd(16)}${cel.join('  ')}`);
  }
  console.log('  ' + '-'.repeat(96));
  if (falhas.length) { for (const x of falhas) console.error('  ✗ ' + x); process.exit(1); }
  console.log('  ✓ CUSTO: nenhum eixo além da margem.');
}
