/* preload-roster-check.mjs — A PARTIDA CARREGA O ELENCO QUE ELA USA, NÃO O ELENCO INTEIRO.
 *
 * POR QUE EXISTE — `main.js` chama `preloadCharacterAssets([...GLB_CHARS])` antes de
 * construir o Game: os 62 personagens do jogo inteiro, BLOQUEANDO, para uma partida
 * que põe 9 bonecos em campo (jogador + 8 bots). Os outros 53 GLBs são bytes, decode
 * e VRAM que o jogador espera sem ver nada — a tela "CARREGANDO MODELOS 3D…" existe
 * só por causa disso.
 *
 * O QUE ELA NÃO PODE DEIXAR PASSAR — cortar o preload é fácil; cortar E deixar bot de
 * caixa procedural em campo é trocar espera por feiura, que é pior. Por isso a PL2
 * cobra o resultado na cena, não a intenção no código. E a tecla M deixa o jogador
 * virar QUALQUER personagem da facção inimiga: preload enxuto sem carga tardia
 * quebraria a troca de time em silêncio — é o que a PL3 cobra.
 *
 * O QUE MEDE (jogo real, ?auto=, rede de verdade)
 *   PL1  GLBs de personagem baixados no preload BLOQUEANTE <= TETO (12).
 *        Janela: do goto até `window.__game` existir — o Game só é construído depois
 *        do `await Promise.all([...])` do preload, então tudo que entra antes disso é
 *        exatamente o que o jogador espera olhando a tela de carregamento. Contar até
 *        o `live` mediria junto a carga tardia e daria 62 mesmo com o conserto no lugar
 *        (foi o que aconteceu na primeira medição). Estado antes do conserto: 63.
 *   PL2  todo BOT em campo tem malha GLB — zero boneco procedural. Só bot: o jogador
 *        é primeira pessoa e não tem malha de corpo (game.js:654 — o `player` não
 *        carrega `mesh`), então incluí-lo pintava a régua de vermelho por engano.
 *   PL3  o elenco restante CHEGA (a troca de time pela tecla M continua possível).
 *        Sonda até 60 s e passa assim que completa — janela fixa de 10 s reprovou a
 *        primeira medição com 10/62 por disputa de CPU com outra régua rodando junto,
 *        e isso é afirmação sobre DESEMPENHO de download, que não é o contrato aqui.
 *        O contrato é existência: sem carga tardia o número nunca sai do lugar, que é
 *        o que o mutante `sem-lazy` prova.
 *
 * MUTANTES (kill-switches reais do jogo, não monkey-patch de teste)
 *   --mutante=todos      abre com ?preloadall=1  → volta ao preload do elenco inteiro
 *                        → PL1 tem que ficar VERMELHA
 *   --mutante=sem-lazy   abre com ?preloadlazy=0 → sem carga tardia
 *                        → PL3 tem que ficar VERMELHA
 *
 * EXIGE BROWSER E SERVIDOR (`npm run eval:serve`) — passo de pré-deploy, não de check:fast.
 *
 * USO
 *   BASE=http://127.0.0.1:8123 node tools/eval/preload-roster-check.mjs
 *   node tools/eval/preload-roster-check.mjs --mutante=todos
 */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const MAPA = process.env.MAPA || 'quebrada';
const TETO = parseInt(process.env.TETO || '12', 10);
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['todos', 'sem-lazy']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));

/* Conta pedido de GLB de personagem NA REDE. Medir a rede e não um contador do
   próprio módulo é a diferença entre provar o que o jogador espera e acreditar no
   que o código diz que faz (a lição do decal de grafite). */
const CHAR_GLB = /\/models\/characters\/([a-z0-9-]+)\.glb/;
const pedidos = [];
page.on('request', (r) => {
  const m = CHAR_GLB.exec(r.url());
  if (m) pedidos.push({ id: m[1], t: Date.now() });
});

const extra = MUTANTE === 'todos' ? '&preloadall=1' : MUTANTE === 'sem-lazy' ? '&preloadlazy=0' : '';
const t0 = Date.now();
await page.goto(`${BASE}/?debug=1&map=${MAPA}&auto=P,mst${extra}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
/* fim da janela bloqueante: o Game acabou de ser construído (main.js: `window.__game = game`
   é a linha seguinte ao preload). Sondagem de 50 ms contra um preload de segundos — a folga
   é irrelevante, e a carga tardia só solta depois do `live`, bem mais adiante. */
await page.waitForFunction(() => !!window.__game, null, { timeout: 300000, polling: 50 });
const bloqueante = pedidos.length;
const tBloq = Date.now();
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
const tLive = Date.now();
const noLive = pedidos.length;

const cena = await page.evaluate(() => {
  const g = window.__game;
  return {
    bots: g.bots.length,
    procedurais: g.bots.filter((b) => !b.mesh?.isGLB).map((b) => b.def?.id || b.name),
    ids: [g.playerCharId, ...g.bots.map((b) => b.def?.id)].filter(Boolean),
  };
});

/* PL3: sonda até completar. A régua cobra que a carga tardia EXISTA, não que ela seja
   rápida — por isso espera generosa e saída no primeiro sucesso. */
const conta = () => page.evaluate(async () => {
  const m = await import('/js/glbchars.js');
  let prontos = 0;
  for (const id of m.GLB_CHARS) if (m.hasModel(id)) prontos++;
  return { prontos, total: m.GLB_CHARS.size };
});
let tarde = await conta(), esperou = 0;
while (tarde.prontos < tarde.total && esperou < 60000) {
  await page.waitForTimeout(2000); esperou += 2000;
  tarde = await conta();
}
await browser.close();

const pl1 = bloqueante <= TETO;
const pl2 = cena.procedurais.length === 0;
const pl3 = tarde.prontos === tarde.total;

console.log(`\nmapa ${MAPA}${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}`);
console.log(`  espera bloqueante: ${((tBloq - t0) / 1000).toFixed(1)}s  ·  ate 'live': ${((tLive - t0) / 1000).toFixed(1)}s  (evidencia do A/B, sem limiar — headless nao e maquina de jogador)`);
console.log(`  PL1 GLBs no bloqueante (<= ${TETO}): ${bloqueante}  ${pl1 ? 'OK' : 'FALHOU'}   [ate o 'live', com a carga tardia: ${noLive}]`);
console.log(`  PL2 bots sem GLB (== 0):         ${cena.procedurais.length} de ${cena.bots}  ${pl2 ? 'OK' : 'FALHOU'}${cena.procedurais.length ? `  [${cena.procedurais.join(', ')}]` : ''}`);
console.log(`      elenco da partida (${cena.ids.length}): ${cena.ids.join(', ')}`);
console.log(`  PL3 elenco carregado (${tarde.total}/${tarde.total}):   ${tarde.prontos} em ${(esperou / 1000).toFixed(0)}s  ${pl3 ? 'OK' : 'FALHOU'}`);
if (erros.length) console.log(`  erros de pagina: ${erros.length}\n   - ${erros.slice(0, 3).join('\n   - ')}`);

if (MUTANTE) {
  const alvo = MUTANTE === 'todos' ? !pl1 : !pl3;
  console.log(alvo ? `\nMUTANTE ${MUTANTE}: regua MORDEU ✓` : `\nMUTANTE ${MUTANTE}: NAO MORDEU — a regua nao mede o que diz medir ✗`);
  process.exit(alvo ? 0 : 1);
}
const falhas = [!pl1 && 'PL1', !pl2 && 'PL2', !pl3 && 'PL3'].filter(Boolean);
console.log(falhas.length ? `\nPRELOAD-ROSTER: ${falhas.join(' ')} vermelha(s)` : '\nPRELOAD-ROSTER: verde');
process.exit(falhas.length ? 1 : 0);
