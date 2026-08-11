/* cena-check.mjs — CUSTO DE CENA TEM TETO, E O TETO REPROVA.
   ═══════════════════════════════════════════════════════════════════════════════════
   O BURACO QUE COMPROU ESTA RÉGUA

   `tools/eval/gl-metrics.mjs` já media calls/triângulos reais por frame desde a rodada 3.
   Media, gravava JSON, e **ninguém reprovava**: `grep -nE "calls|tris|draw"
   tools/eval/invariants.mjs` não devolvia uma linha. O único teto escrito no repo era
   prosa no comentário de `mapprops.js:15-17` — *"um teto de régua de 300-800 calls e
   500 k tris"* — que nunca foi cláusula de lugar nenhum.

   É a LIÇÃO 1 do `docs/LICOES.md` com o sinal trocado. Lá, uma régua premiava o defeito
   oposto ao que media. Aqui é pior e mais banal: o número existe, está certo, e não tem
   consequência. Custo de cena podia dobrar entre dois commits e todo portão do repo
   continuaria verde — foi assim que `fy_havan` chegou a 4.347 calls e 3,65 M triângulos
   antes de alguém olhar.

   E a sonda antiga tinha uma cegueira própria, consertada aqui junto: ela cobria 4 mapas.
   O `fy_quebrada` — o mapa com mais arte urbana do jogo, o que mais tem a ganhar com um
   teto — nunca foi medido. Ver `MAPAS` em `cena-tetos.mjs`.

   O QUE ELA MEDE (no navegador, com o Astro no ar, jogo em `live`)
     CENA1 · nenhum mapa acima do teto de draw calls por frame.
     CENA2 · nenhum mapa acima do teto de triângulos por frame.
     CENA3 · a medição aconteceu mesmo — mapa que não chegou em `live`, ou que subiu com
             erro de página, REPROVA em vez de sair da conta. Régua que ignora o que não
             conseguiu medir mede outro jogo (LIÇÃO 3), e um mapa que nem carrega é
             exatamente o caso em que o silêncio parece aprovação.

   O teto NÃO mora aqui: mora em `cena-tetos.mjs`, compartilhado com a cláusula CENA1 do
   `invariants.mjs`. Dois limiares para o mesmo conceito é o instrumento discordando de
   si mesmo, e isso já custou uma rodada inteira neste repo (LIÇÃO 2).

   A MUTAÇÃO QUE A DEIXA VERMELHA
     --mutante=estoura   injeta, no `mapprops.js` servido, o desligamento do instancing e
                         do culling (o mesmo efeito de `?batch=0&cull=0`), que é a
                         regressão real que a régua existe para pegar. A mutação é em
                         MEMÓRIA, por interceptação de rota — o arquivo em disco não é
                         tocado. Se um mapa não estourar nem assim, o teto está frouxo.

   USO
     node tools/eval/cena-check.mjs                  # sobe o astro dev sozinho e reprova
     node tools/eval/cena-check.mjs --medir          # só mede e sugere teto (não reprova)
     node tools/eval/cena-check.mjs --mutante=estoura
     node tools/eval/cena-check.mjs --mapa=fy_havan  # um mapa só
     BASE=https://www.csbrasil.online node tools/eval/cena-check.mjs

   EXIGE BROWSER, então fica FORA do `check` e do `check:fast` (que rodam sem browser),
   junto do `eval:boot` — é passo de pré-deploy. Quem cabe no portão rápido é a cláusula
   CENA do `invariants.mjs`, que lê o que esta régua gravou.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { spawn, spawnSync, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MAPAS, TETOS, FOLGA, PROBE } from './cena-tetos.mjs';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');
const MEDIR = args.includes('--medir');
const PORTA = Number(val('porta', 4321));
const UM = val('mapa', '');
const EXTERNO = !!process.env.BASE;
const BASE = process.env.BASE || `http://localhost:${PORTA}`;
const ALVOS = MAPAS.filter((m) => !UM || m.id === UM);

/* Quantos frames entram na média. 10 é o que a sonda antiga usava; abaixo disso um
   frame com carregamento de textura no meio domina a média. */
const FRAMES = 10;
/* Tempo de jogo antes de medir. A cena só está completa depois que os props GLB chegam
   e o primeiro round começa — medir antes disso mede um mapa que o jogador nunca vê. */
const AQUECIMENTO = 30_000;

let subiuAqui = false;
async function noAr() {
  const fim = Date.now() + 90_000;
  while (Date.now() < fim) {
    try { const r = await fetch(BASE + '/robots.txt'); if (r.status) return true; } catch { /* ainda não */ }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

/* É O JOGO QUE ESTÁ ATENDENDO, OU SÓ *ALGUÉM*?
   Custou uma hora na primeira execução desta régua: a porta 4321 já tinha um `astro dev`
   de OUTRO projeto (um portfólio) no ar. O padrão herdado do `boot-check.mjs` é "se
   /robots.txt responde, o servidor subiu" — e robots.txt qualquer site tem. O resultado
   não foi erro: foi a régua carregar a página errada, esperar `window.__game` que nunca
   ia existir, e estourar o timeout como se o JOGO estivesse quebrado. Diagnóstico errado
   é pior que régua vermelha, porque manda consertar o que não está quebrado.

   `#btn-jogar` é o marcador: existe no `src/pages/index.astro` e em nenhum outro site.
   A mesma checagem serve para `BASE=` externo — apontar para o domínio errado falha aqui,
   com o motivo escrito, em vez de falhar 5 minutos depois sem explicação. */
async function ehOJogo() {
  try {
    const html = await (await fetch(BASE + '/')).text();
    return html.includes('btn-jogar');
  } catch { return false; }
}

async function sobeServidor() {
  if (EXTERNO) return true;
  try { if ((await fetch(BASE + '/robots.txt')).status) return true; } catch { /* não estava no ar */ }
  spawn('npx', ['astro', 'dev', '--port', String(PORTA)], { stdio: 'ignore', detached: false }).on('error', () => {});
  subiuAqui = true;
  return noAr();
}
function derrubaServidor() { if (subiuAqui) spawnSync('npx', ['astro', 'dev', 'stop'], { stdio: 'ignore' }); }

const semTeto = ALVOS.filter((m) => !TETOS[m.id] || TETOS[m.id].calls == null || TETOS[m.id].tris == null);
if (!MEDIR && semTeto.length) {
  console.error(`✗ CENA0  sem teto para: ${semTeto.map((m) => m.id).join(', ')}`);
  console.error('         rode `node tools/eval/cena-check.mjs --medir` e escreva os tetos em tools/eval/cena-tetos.mjs.');
  console.error('         a régua RECUSA medir contra teto nulo: não saber custa o mesmo que estar errado.');
  process.exit(1);
}

let browser;
try {
  if (!(await sobeServidor())) {
    console.error(`✗ CENA0  o site não subiu em ${BASE} (90 s de espera)`);
    process.exit(1);
  }
  if (!(await ehOJogo())) {
    console.error(`✗ CENA0  tem alguém atendendo ${BASE}, mas NÃO é este jogo (sem #btn-jogar em /).`);
    console.error('         quase sempre é outro `astro dev` ocupando a porta. Confira com:');
    console.error(`           lsof -nP -iTCP:${PORTA} -sTCP:LISTEN`);
    console.error('         e rode com --porta=<livre>, ou derrube o outro servidor.');
    derrubaServidor();
    process.exit(1);
  }
  const gRoot = execSync('npm root -g').toString().trim();
  const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = _pw.chromium || _pw.default?.chromium;
  /* BACKEND DE GL, e por que o padrão NÃO é swiftshader.

     O que esta régua conta é `renderer.info.render`, que o three.js incrementa ao EMITIR
     a chamada — é contabilidade da biblioteca, não do driver. Trocar o backend não move
     `calls` nem `tris`: move `fps`, que é reportado e de propósito NÃO tem teto (medir
     quadro por segundo dentro de headless com o resto da máquina ocupada mediria a
     máquina, não o jogo).

     Medido nesta máquina, mesmo mapa: swiftshader levou 79 s para chegar em `live` e
     derrubou o processo de GPU no meio da medição ("GPU process exited unexpectedly:
     exit_code=15") depois dos 30 s de aquecimento; o padrão chegou em 8,3 s e mediu
     inteiro. Régua que cai sozinha ensina a ignorar régua vermelha.

     `--gl=swiftshader` fica disponível para CI sem GPU, que é onde swiftshader é a
     escolha certa — e lá o custo de 10× em tempo é aceitável porque não há alternativa. */
  const GL = val('gl', 'padrao');
  const ARGS_GL = GL === 'swiftshader'
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : [];
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--headless=new', '--mute-audio', '--no-sandbox', ...ARGS_GL],
  });

  console.log(`RÉGUA DE CUSTO DE CENA${MUTANTE ? `  [MUTAÇÃO: ${MUTANTE}]` : ''}${MEDIR ? '  [MODO MEDIR]' : ''}   alvo ${BASE}`);
  console.log(`${ALVOS.length} mapa(s), média de ${FRAMES} frames após ${AQUECIMENTO / 1000}s de jogo\n`);

  const medidos = [];
  for (const { id, auto } of ALVOS) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const erros = [];
    page.on('pageerror', (e) => erros.push('[pageerror] ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push('[console] ' + m.text()); });

    /* A MUTAÇÃO. Não mexe no teto nem no número: recria a REGRESSÃO que o teto existe
       para pegar, desligando instancing e culling no módulo servido. É o mesmo efeito de
       `?batch=0&cull=0`, mas por interceptação, para provar que a régua morde sem
       depender de um kill-switch que alguém pode remover. */
    if (MUTANTE === 'estoura') {
      await page.route('**/js/mapprops.js*', async (rota) => {
        const r = await rota.fetch();
        const corpo = await r.text();
        const mutado = corpo
          .replace(/export const PROP_CULL = [^;]+;/, 'export const PROP_CULL = false;')
          .replace(/export const PROP_BATCH = [^;]+;/, 'export const PROP_BATCH = false;');
        await rota.fulfill({ status: 200, contentType: 'application/javascript', body: mutado });
      });
    }

    let rec = { mapa: id, calls: null, tris: null, erros: [] };
    try {
      await page.goto(`${BASE}/?debug=1&map=${id}&auto=${auto}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
      await page.waitForTimeout(AQUECIMENTO);
      const m = await page.evaluate((F) => new Promise((res) => {
        const g = window.__game, r = g && g.renderer;
        if (!r) return res({ err: 'sem renderer' });
        /* `info.autoReset` desligado + `reset()` manual: o three zera `info.render` a cada
           `renderer.render()`, e o composer chama render várias vezes por frame. Sem isto
           o número seria o do ÚLTIMO passe, não o do frame. */
        r.info.autoReset = false;
        r.info.reset();
        let n = 0;
        const t = performance.now();
        (function tick() {
          if (++n >= F) {
            const i = r.info, ms = (performance.now() - t) / F;
            const o = {
              calls: Math.round(i.render.calls / F),
              tris: Math.round(i.render.triangles / F),
              textures: i.memory.textures,
              geometries: i.memory.geometries,
              fps: +(1000 / ms).toFixed(1),
              state: g.state,
            };
            r.info.autoReset = true;
            return res(o);
          }
          requestAnimationFrame(tick);
        })();
      }), FRAMES);
      Object.assign(rec, m);
    } catch (e) { rec.fatal = e.message.split('\n')[0]; }
    rec.erros = erros;
    medidos.push(rec);
    const t = TETOS[id] || {};
    const marca = (v, teto) => (v == null ? '—' : `${v}${teto == null ? '' : `/${teto}`}${teto != null && v > teto ? ' ✗' : ''}`);
    console.log(`  ${id.padEnd(15)} calls ${String(marca(rec.calls, t.calls)).padEnd(14)} tris ${String(marca(rec.tris, t.tris)).padEnd(18)} fps ${rec.fps ?? '—'}${rec.fatal ? `  FATAL ${rec.fatal}` : ''}${rec.erros.length ? `  ${rec.erros.length} erro(s)` : ''}`);
    await page.close();
  }

  /* O probe é gravado SEMPRE, inclusive quando reprova: quem lê depois (a cláusula CENA
     do invariants) precisa ver o estado real, não só os verdes. `medidoEm` e `commit`
     existem porque medição gravada envelhece, e cláusula que lê medição velha jura verde
     sobre um jogo que não existe mais — é a LIÇÃO 3 pelo lado do tempo. */
  let commit = null;
  try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* árvore sem git */ }
  /* RODADA DE MUTAÇÃO NÃO ESCREVE NO PROBE DE VERDADE. Descoberto na primeira execução do
     `--mutante=estoura`: ele gravou 3.518 calls do fy_havan por cima da medição real de
     307, e quem lesse o probe depois (a cláusula CENA do invariants, um humano no PR)
     veria uma regressão que não existe. Mutante é instrumento de teste da régua, não
     medição do jogo — vai para arquivo próprio, que é lixo descartável. */
  const destino = MUTANTE ? PROBE.replace(/\.json$/, `.mutante-${MUTANTE}.json`) : PROBE;
  writeFileSync(destino, JSON.stringify({
    medidoEm: new Date().toISOString(),
    commit,
    base: BASE,
    frames: FRAMES,
    aquecimentoMs: AQUECIMENTO,
    mutante: MUTANTE || null,
    mapas: medidos,
  }, null, 2) + '\n');

  if (MEDIR) {
    console.log(`\nprobe gravado em ${destino}`);
    console.log(`\nsugestão de teto (medido + ${(FOLGA * 100) | 0}% de folga) — cole em tools/eval/cena-tetos.mjs:\n`);
    console.log('export const TETOS = {');
    for (const r of medidos) {
      const c = r.calls == null ? null : Math.ceil((r.calls * (1 + FOLGA)) / 10) * 10;
      const t = r.tris == null ? null : Math.ceil((r.tris * (1 + FOLGA)) / 10000) * 10000;
      console.log(`  ${r.mapa}: { calls: ${c}, tris: ${t} },${r.calls == null ? '   // NÃO MEDIDO — não escreva teto por cima disto' : ''}`);
    }
    console.log('};');
    await browser.close(); browser = null;
    derrubaServidor();
    process.exit(0);
  }

  console.log('');
  const naoMediu = medidos.filter((r) => r.calls == null || r.tris == null || r.fatal);
  const acimaCalls = medidos.filter((r) => r.calls != null && r.calls > TETOS[r.mapa].calls);
  const acimaTris = medidos.filter((r) => r.tris != null && r.tris > TETOS[r.mapa].tris);

  const c1 = acimaCalls.length === 0;
  console.log('CENA1 · nenhum mapa acima do teto de draw calls por frame');
  for (const r of medidos) if (r.calls != null) console.log(`   ${r.mapa.padEnd(15)} ${String(r.calls).padStart(5)} contra teto ${TETOS[r.mapa].calls}`);
  console.log(`   ${c1 ? 'PASSA' : `FALHA — ${acimaCalls.map((r) => `${r.mapa} ${r.calls}>${TETOS[r.mapa].calls}`).join(', ')}`}\n`);

  const c2 = acimaTris.length === 0;
  console.log('CENA2 · nenhum mapa acima do teto de triângulos por frame');
  for (const r of medidos) if (r.tris != null) console.log(`   ${r.mapa.padEnd(15)} ${String(r.tris).padStart(8)} contra teto ${TETOS[r.mapa].tris}`);
  console.log(`   ${c2 ? 'PASSA' : `FALHA — ${acimaTris.map((r) => `${r.mapa} ${r.tris}>${TETOS[r.mapa].tris}`).join(', ')}`}\n`);

  const c3 = naoMediu.length === 0;
  console.log('CENA3 · todo mapa alvo foi realmente medido');
  console.log(`   ${naoMediu.length ? naoMediu.map((r) => `${r.mapa}: ${r.fatal || 'sem número'}`).join(' | ') : `${medidos.length}/${medidos.length} medidos`}`);
  console.log(`   ${c3 ? 'PASSA' : 'FALHA'}\n`);

  const passou = c1 && c2 && c3;
  console.log(passou
    ? '✓ CENA  custo de cena dentro do teto nos 5 mapas'
    : '✗ CENA  CUSTO DE CENA ESTOUROU — ver acima qual mapa e contra qual teto');
  console.log(`  probe: ${destino}`);
  await browser.close(); browser = null;
  derrubaServidor();
  process.exit(passou ? 0 : 1);
} catch (e) {
  console.error('✗ CENA0  a régua não conseguiu medir:', e.message);
  if (browser) await browser.close().catch(() => {});
  derrubaServidor();
  process.exit(1);
}
