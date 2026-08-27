/* fauna-shots.mjs — A FAUNA ESTÁ VIVA NA PARTIDA REAL? (BUG-57, port do /game)
 *
 * O ambience-registry-check (node puro) prova registro/população/sólido, mas com
 * fallback procedural — ele não prova que o GLB carregou, animou ou REAGIU. Este
 * script abre o jogo de verdade (?auto=), espera `live` e:
 *
 *   FS1  report() da fauna viva: gltf=true (GLB carregado, não fallback) e counts
 *        batendo com o registro do mapa
 *   FS2  snapshot() muda com o tempo (mixer avançando = animação rodando)
 *   FS3  um tiro REAL (Game._fireHitscan, o mesmo caminho do jogo) perto de um
 *        animal muda o estado dele para flee/takeoff dentro de 1s
 *   FS4  captura PNG na hora da reação, com o animal no enquadramento
 *
 * Uso: BASE=http://localhost:8200 node tools/eval/fauna-shots.mjs [outDir]
 *      ONLY=posto_treta,parque_tjs … filtra mapas
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/fauna-shots';
const BASE = process.env.BASE || 'http://localhost:8200';
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

/* mapa → animal-alvo (mesmas coords declaradas no createFavelaAmbience do mapa) */
const ALVOS = {
  posto_treta: { type: 'dog', pos: [-4, 0, 20] },
  parque_treta: { type: 'pigeon', pos: [-6, 0, -10] },
  velho_oeste: { type: 'pigeon', pos: [-8, 0, -6] },
  upa_24h: { type: 'rat', pos: [-3, 0, 2] },
  penitenciaria: { type: 'rat', pos: [-3, 0, 8] },
  atacadao_treta: { type: 'pigeon', pos: [-8, 0, 20] },
  obras_prefeitura: { type: 'rat', pos: [-2, 0, 6] },
  piscina_treta: { type: 'rat', pos: [-14, 0, -20] },
  quebrada: { type: 'dog', pos: [-6.5, 0, -23.5] },
  ferro_velho: { type: 'rat', pos: [-11, 0, -4] },
  loja_h: { type: 'pigeon', pos: [-9, 0, 20] },
  praca_poderes: { type: 'pigeon', pos: [-4, 0, -8] },
};

const resultados = [];
for (const [mapa, alvo] of Object.entries(ALVOS)) {
  if (ONLY && !ONLY.has(mapa)) continue;
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  try {
    /* sem nav=1: o modo navegável pula o preload da partida (main.js `if (!navOnly)`)
       e a fauna nasceria em fallback procedural, esconderia justo o que FS1 mede */
    await page.goto(`${BASE}/?debug=1&map=${mapa}&auto=P,mst`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
    await page.waitForTimeout(2500);

    /* posiciona o jogador a 4 m do animal e olha pra ele (convenção conferida
       in loco: se o dot da câmera apontar pro lado errado, soma π e de novo) */
    const alinhou = await page.evaluate(({ alvo }) => {
      const g = window.__game, amb = g?.world?.ambience;
      if (!amb) return { ok: false, motivo: 'sem ambience' };
      /* MAIS PRÓXIMO da coord declarada (não raio fixo): os bots do auto= atiram
         e um bicho assustado anda — threshold duro viraria flakiness de teste */
      let alvoAnimal = null, melhor = Infinity;
      for (const a of amb.animals) {
        if (a.type !== alvo.type) continue;
        const d = Math.hypot(a.root.position.x - alvo.pos[0], a.root.position.z - alvo.pos[2]);
        if (d < melhor) { melhor = d; alvoAnimal = a; }
      }
      if (!alvoAnimal) return { ok: false, motivo: 'sem animal do tipo no mapa' };
      const p = g.player.pos;
      p.set(alvoAnimal.root.position.x - 3.2, alvoAnimal.root.position.y + 1.7, alvoAnimal.root.position.z + 3.2);
      const dx = alvoAnimal.root.position.x - p.x, dy = alvoAnimal.root.position.y + 0.4 - p.y, dz = alvoAnimal.root.position.z - p.z;
      const yaw = Math.atan2(dx, dz);
      g.player.yaw = yaw; g.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      g.camera.position.copy(p);
      return { ok: true, id: alvoAnimal.id, estadoAntes: alvoAnimal.state };
    }, { alvo });
    if (!alinhou.ok) throw new Error(alinhou.motivo);
    await page.waitForTimeout(1200);

    /* FS1+FS2: report + snapshot antes/depois de 1,5 s de jogo */
    const antes = await page.evaluate(() => {
      const amb = window.__game.world.ambience;
      return { report: amb.report(), snap: JSON.stringify(amb.snapshot()) };
    });
    await page.waitForTimeout(1500);
    const meio = await page.evaluate(() => JSON.stringify(window.__game.world.ambience.snapshot()));
    await page.screenshot({ path: `${OUT}/${mapa}-1-parado.png`, timeout: 60000 });

    /* FS3: tiro REAL pelo caminho do jogo, 2 m à esquerda do animal.
       Re-posiciona NA MESMA tacada: em partida viva os bots matam o jogador e o
       respawn o leva pra longe — tiro do spawn não chega perto do bicho. */
    const reacao = await page.evaluate(async ({ idAlvo }) => {
      const THREE = await import('three');
      const g = window.__game, amb = g.world.ambience;
      const a = amb.animals.find(x => x.id === idAlvo);
      if (!a) return { achou: false };
      const p = g.player.pos;
      p.set(a.root.position.x - 3.2, a.root.position.y + 1.7, a.root.position.z + 3.2);
      g.camera.position.copy(p);
      const dir = a.root.position.clone().add(new THREE.Vector3(1.5, 0.2, 1.5)).sub(p).normalize();
      g._fireHitscan(g.player, p.clone(), dir, 12, true, 'AK', 'ak', false);
      return { achou: true, id: a.id, estadoAntes: a.state };
    }, { idAlvo: alinhou.id });
    await page.waitForTimeout(700);
    const depois = await page.evaluate(() => {
      const amb = window.__game.world.ambience;
      return { snap: JSON.stringify(amb.snapshot()), estados: amb.animals.map(a => ({ id: a.id, s: a.state })) };
    });
    await page.screenshot({ path: `${OUT}/${mapa}-2-apos-tiro.png`, timeout: 60000 });

    const fs1 = antes.report.gltf && antes.report.counts.total > 0;
    const fs2 = antes.snap !== meio;
    const alvoDepois = JSON.parse(depois.snap).find(s => s.id === reacao.id);
    /* no auto= os BOTS também atiram: se o bicho JÁ estava fugindo do tiro de um bot,
     o estado pós-tiro continua válido — fugir de tiro é exatamente o contrato */
    const jaEmFuga = ['flee', 'takeoff'].includes(reacao.estadoAntes);
    const fs3 = reacao.achou && alvoDepois && (['flee', 'takeoff'].includes(alvoDepois.state)
      || (jaEmFuga && ['recover', 'fly', 'walk'].includes(alvoDepois.state)));
    resultados.push({ mapa, fs1, fs2, fs3, report: antes.report, tiro: reacao, estadoPos: alvoDepois?.state, erros });
    console.log(`${mapa.padEnd(17)} FS1(gltf)=${fs1 ? 'ok' : 'FALHA'} FS2(anim)=${fs2 ? 'ok' : 'FALHA'} FS3(reacao)=${fs3 ? 'ok' : 'FALHA'}  [${antes.report.counts.total} bichos, ${antes.report.triangles} tris]`);
  } catch (e) {
    resultados.push({ mapa, fatal: e.message.split('\n')[0], erros });
    console.log(`${mapa.padEnd(17)} FATAL: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
writeFileSync(`${OUT}/_fauna.json`, JSON.stringify(resultados, null, 2));
await browser.close();
const f1 = resultados.filter(r => !r.fs1).length, f2 = resultados.filter(r => !r.fs2).length, f3 = resultados.filter(r => !r.fs3).length;
console.log(`\nFS1 gltf carregado: ${f1 ? `${f1} FALHA` : 'todos'} · FS2 animação: ${f2 ? `${f2} FALHA` : 'todos'} · FS3 reação ao tiro: ${f3 ? `${f3} FALHA` : 'todos'}`);
process.exit(f1 || f2 || f3 ? 1 : 0);
