/* fauna-shots.mjs — A FAUNA ESTÁ VIVA NA PARTIDA REAL? (BUG-57)
 *
 * Port da régua escrita no /game4 em 19/08, adaptada ao registro DESTE repo
 * (17 mapas, fauna 2 com tatu/barata/papagaio) na recuperação de 20/08.
 *
 * POR QUE EXISTE — a irmã `ambience-registry-check.mjs` roda em node puro e prova
 * REGISTRO: que o mapa devolve `ambience`, com população e sem bicho dentro de
 * parede. Mas ela nasce com fallback procedural, então NÃO prova nenhuma das três
 * coisas que o dono realmente vê na tela: que o GLB carregou, que o mixer anda, e
 * que o bicho FOGE do tiro. Régua que mede o registro e cala sobre a tela é a
 * classe de furo do decal de grafite (12,7% real x 334 no probe).
 *
 * O QUE MEDE (jogo de verdade, ?auto=, estado `live`)
 *   FS1  report().gltf === true (todo animal veio de GLB, nenhum em fallback)
 *        e counts.total > 0
 *   FS2  a soma dos `clipTime` dos mixers AVANÇA = animação rodando. Duas lições
 *        pagas aqui, nesta ordem:
 *        (a) compara SÓ o clipTime. A primeira versão comparava o snapshot inteiro e
 *            ficava VERDE com os mixers congelados, porque bicho anda por código (x,z
 *            mudam sozinhos). Quem expôs isso foi o mutante `congela` — mantenha-o.
 *        (b) espera POR AVANÇO, não por relógio de parede. Janela fixa de 1,5 s
 *            reprovava upa_24h, fy_campomorro e loja_h com +0,00s: no headless com
 *            swiftshader um mapa pesado entrega pouquíssimo quadro, e o mixer só anda
 *            em quadro apresentado. Agora sonda até 8 s e passa no primeiro avanço —
 *            congelado nunca avança, então o mutante continua mordendo.
 *   FS3  um tiro REAL por `Game._fireHitscan` (o MESMO caminho do jogo, não um
 *        `onShot` chamado na mão) perto do alvo leva o estado dele a flee/takeoff
 *        dentro de 700 ms
 *   FS4  captura PNG antes e depois do tiro, com o animal no enquadramento —
 *        evidência para o A/B, sem limiar
 *   FS5  espécies SEM mixer, por mapa — evidência, SEM LIMIAR de propósito. Medido em
 *        20/08: tatu, barata e papagaio (a "fauna 2" inteira) nascem estáticos porque
 *        `tatu_campo.glb`, `barata_urbana.glb` e `papagaio_poleiro.glb` têm ZERO clipe
 *        no arquivo — o tatu ainda por cima está em QUADS, então cai fora dos dois
 *        ramos de `ambientlife.js:274-285` e não ganha mixer nenhum. A AR4 cobra que
 *        essas espécies EXISTAM e passa verde; ninguém cobrava que elas se mexam.
 *        Sem limiar porque o conserto é ASSET NOVO, não código: virar portão aqui
 *        pintaria o CI de vermelho por uma dívida que o portão não resolve. Quando o
 *        acervo entregar clipe pra elas, isto vira cláusula.
 *
 * LISTA DE MAPAS: vem de `MAPS` do harness, não de literal. Mapa novo entra na
 * cobrança sozinho (foi assim que o gl-shots deixou 5 mapas sem captura).
 * ALVO: escolhido em tempo de execução, o animal mais próximo do jogador — as
 * coordenadas literais da versão original apodreceram junto com os mapas.
 * Mapa que não declara fauna é contado e IMPRESSO como 'sem fauna', nunca calado.
 *
 * EXIGE BROWSER E SERVIDOR (`npm run eval:serve`) — é passo de pré-deploy, não
 * de check:fast.
 *
 * USO
 *   BASE=http://127.0.0.1:8123 node tools/eval/fauna-shots.mjs [outDir]
 *   ONLY=quebrada,fy_corrego node tools/eval/fauna-shots.mjs
 *   node tools/eval/fauna-shots.mjs --mutante=congela   # FS2 tem que ficar vermelha
 *   node tools/eval/fauna-shots.mjs --mutante=surdo     # FS3 tem que ficar vermelha
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MAPS } from './harness.mjs';

const OUT = process.argv.find((a) => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]) || '/tmp/fauna-shots';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['congela', 'surdo']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});

const mapas = Object.keys(MAPS).filter((id) => !ONLY || ONLY.has(id));
const resultados = [];
for (const mapa of mapas) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  try {
    /* sem nav=1: o modo navegável pula o preload da partida (main.js `if (!navOnly)`)
       e a fauna nasceria em fallback procedural — esconderia justo o que a FS1 mede */
    await page.goto(`${BASE}/?debug=1&map=${mapa}&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
    await page.waitForTimeout(2500);

    /* posiciona o jogador a ~4,5 m do animal mais próximo e olha pra ele.
       Escolha em tempo de execução: coordenada literal por mapa apodrece a cada
       remanejo de fauna e vira régua vermelha pelo motivo errado. */
    const alinhou = await page.evaluate(() => {
      const g = window.__game, amb = g?.world?.ambience;
      if (!amb || !Array.isArray(amb.animals) || !amb.animals.length) return { ok: false, semFauna: true };
      const p = g.player.pos;
      let alvo = null, melhor = Infinity;
      for (const a of amb.animals) {
        const d = Math.hypot(a.root.position.x - p.x, a.root.position.z - p.z);
        if (d < melhor) { melhor = d; alvo = a; }
      }
      p.set(alvo.root.position.x - 3.2, alvo.root.position.y + 1.7, alvo.root.position.z + 3.2);
      const dx = alvo.root.position.x - p.x, dy = alvo.root.position.y + 0.4 - p.y, dz = alvo.root.position.z - p.z;
      g.player.yaw = Math.atan2(dx, dz);
      g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      g.camera.position.copy(p);
      return { ok: true, id: alvo.id, tipo: alvo.type, distanciaOriginal: +melhor.toFixed(1) };
    });
    if (!alinhou.ok) {
      resultados.push({ mapa, semFauna: true, erros });
      console.log(`${mapa.padEnd(17)} SEM FAUNA (o registro não devolveu animais — caso da AR1)`);
      await page.close();
      continue;
    }
    await page.waitForTimeout(1200);

    /* MUTANTE congela: para os mixers. A FS2 tem que ficar vermelha — se não ficar,
       ela está comparando outra coisa (posição de bicho andando, p.ex.) e não animação. */
    if (MUTANTE === 'congela') {
      await page.evaluate(() => {
        const amb = window.__game.world.ambience;
        for (const a of amb.animals) if (a.mixer) a.mixer.update = () => {};
      });
    }

    /* FS1+FS2: report + snapshot antes/depois de 1,5 s de jogo */
    const antes = await page.evaluate(() => {
      const amb = window.__game.world.ambience;
      const snap = amb.snapshot();
      const semMixer = [...new Set(amb.animals.filter((a) => !a.mixer).map((a) => a.type))];
      return { report: amb.report(), snap: JSON.stringify(snap), clip: snap.reduce((t, a) => t + a.clipTime, 0), semMixer };
    });
    let meio = antes.clip, esperou = 0;
    while (esperou < 8000) {
      await page.waitForTimeout(500); esperou += 500;
      meio = await page.evaluate(() => window.__game.world.ambience.snapshot().reduce((t, a) => t + a.clipTime, 0));
      if (meio > antes.clip + 0.02) break;
    }
    await page.screenshot({ path: `${OUT}/${mapa}-1-parado.png`, timeout: 60000 });

    /* FS3: tiro REAL pelo caminho do jogo, 1,5 m ao lado do animal (é susto, não caça).
       Re-posiciona NA MESMA tacada: em partida viva os bots matam o jogador e o
       respawn o leva pra longe — tiro do spawn não chega perto do bicho. */
    const reacao = await page.evaluate(async ({ idAlvo, mutante }) => {
      const THREE = await import('three');
      const g = window.__game, amb = g.world.ambience;
      const a = amb.animals.find((x) => x.id === idAlvo);
      if (!a) return { achou: false };
      const p = g.player.pos;
      p.set(a.root.position.x - 3.2, a.root.position.y + 1.7, a.root.position.z + 3.2);
      g.camera.position.copy(p);
      /* MUTANTE surdo: o mundo perde o gancho de tiro. FS3 tem que ficar vermelha. */
      if (mutante === 'surdo') amb.onShot = () => {};
      const dir = a.root.position.clone().add(new THREE.Vector3(1.5, 0.2, 1.5)).sub(p).normalize();
      g._fireHitscan(g.player, p.clone(), dir, 12, true, 'AK', 'ak', false);
      return { achou: true, id: a.id, estadoAntes: a.state };
    }, { idAlvo: alinhou.id, mutante: MUTANTE });
    await page.waitForTimeout(700);
    const depois = await page.evaluate(() => JSON.stringify(window.__game.world.ambience.snapshot()));
    await page.screenshot({ path: `${OUT}/${mapa}-2-apos-tiro.png`, timeout: 60000 });

    const fs1 = antes.report.gltf && antes.report.counts.total > 0;
    /* Limiar de EPSILON, não de proporção: a pergunta é binária (mixer anda ou não anda).
       Limiar proporcional viraria régua instável por máquina lenta; congelado dá 0,000 exato. */
    const fs2 = meio > antes.clip + 0.02;
    const alvoDepois = JSON.parse(depois).find((s) => s.id === reacao.id);
    /* no auto= os BOTS também atiram: se o bicho JÁ estava fugindo do tiro de um bot,
       o estado pós-tiro continua válido — fugir de tiro é exatamente o contrato */
    const jaEmFuga = ['flee', 'takeoff'].includes(reacao.estadoAntes);
    const fs3 = reacao.achou && alvoDepois && (['flee', 'takeoff'].includes(alvoDepois.state)
      || (jaEmFuga && ['recover', 'fly', 'walk'].includes(alvoDepois.state)));
    resultados.push({ mapa, fs1, fs2, fs3, semMixer: antes.semMixer, alvo: alinhou, clipAntes: +antes.clip.toFixed(3), clipDepois: +meio.toFixed(3), report: antes.report, tiro: reacao, estadoPos: alvoDepois?.state, erros });
    console.log(`${mapa.padEnd(17)} FS1(gltf)=${fs1 ? 'ok' : 'FALHA'} FS2(anim)=${fs2 ? 'ok' : 'FALHA'} FS3(reacao)=${fs3 ? 'ok' : 'FALHA'}  [${antes.report.counts.total} bichos, ${antes.report.triangles} tris, alvo ${alinhou.tipo}, clip +${(meio - antes.clip).toFixed(2)}s em ${(esperou / 1000).toFixed(1)}s]`);
  } catch (e) {
    resultados.push({ mapa, fatal: e.message.split('\n')[0], erros });
    console.log(`${mapa.padEnd(17)} FATAL: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
writeFileSync(`${OUT}/_fauna.json`, JSON.stringify(resultados, null, 2));
await browser.close();

const medidos = resultados.filter((r) => !r.semFauna && !r.fatal);
const semFauna = resultados.filter((r) => r.semFauna);
const fatais = resultados.filter((r) => r.fatal);
const f1 = medidos.filter((r) => !r.fs1).length, f2 = medidos.filter((r) => !r.fs2).length, f3 = medidos.filter((r) => !r.fs3).length;
const estaticas = [...new Set(medidos.flatMap((r) => r.semMixer || []))];
console.log(`\nFS5 especies SEM mixer (evidencia, sem limiar): ${estaticas.length ? estaticas.join(', ') : 'nenhuma'}`);
console.log(`\n${medidos.length}/${mapas.length} mapas medidos · ${semFauna.length} sem fauna · ${fatais.length} fatais`);
console.log(`FS1 gltf carregado: ${f1 ? `${f1} FALHA` : 'todos'} · FS2 animação: ${f2 ? `${f2} FALHA` : 'todos'} · FS3 reação ao tiro: ${f3 ? `${f3} FALHA` : 'todos'}`);
if (MUTANTE) {
  const alvoMut = MUTANTE === 'congela' ? f2 : f3;
  console.log(alvoMut ? `MUTANTE ${MUTANTE}: régua MORDEU (${alvoMut} vermelhas) ✓` : `MUTANTE ${MUTANTE}: NÃO MORDEU — a régua não mede o que diz medir ✗`);
  process.exit(alvoMut ? 0 : 1);
}
process.exit(f1 || f2 || f3 || fatais.length ? 1 : 0);
