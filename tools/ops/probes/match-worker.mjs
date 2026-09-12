/* ============================================================================
   match-worker.mjs — PARTIDA SINTÉTICA: o Game de verdade, em node, mapa a mapa.
   ----------------------------------------------------------------------------
   Processo filho de match.mjs (o harness planta globais de DOM; isolar evita
   contaminar a diagnose). Para cada mapa e modo: bootGame → N updates de 1/60 s
   → conferir que o estado saiu de `countdown` para `live`, que há bots e que
   nenhuma exceção escapou do `update`. Exceção aqui é o mesmo crash que o
   jogador vê como "partida congelou" — só que com stack e mapa no relatório.

   Saída: UMA linha JSON no stdout. Erros de import (harness quebrado) também
   viram JSON, com `fatal`, para a diagnose não confundir "não medi" com "verde".

   OPS_MUTANTE=partida-quebrada faz o primeiro update explodir — é a mutação que
   prova que a sonda acusa crash (lei 3 da casa), em memória, sem tocar game.js.
   ============================================================================ */
const arg = (n, d) => { const v = (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MAPAS = arg('mapas', 'all');
const MODOS = arg('modos', 'rounds,ctf').split(',').filter(Boolean);
const UPDATES = Number(arg('updates', 600));
const MUTANTE = process.env.OPS_MUTANTE || '';

const out = { partidas: [], fatal: null, mapasDisponiveis: [] };
try {
  const H = await import(new URL('../../eval/harness.mjs', import.meta.url).href);
  const { MAPS, initTextures, bootGame } = H;
  const ids = Object.keys(MAPS);
  out.mapasDisponiveis = ids;
  const alvo = MAPAS === 'all' ? ids : (/^\d+$/.test(MAPAS) ? ids.slice(0, Number(MAPAS)) : MAPAS.split(','));
  const textures = initTextures();
  const consoleErro = console.error; const consoleWarn = console.warn; const consoleLog = console.log;
  for (const mapId of alvo) {
    for (const modo of MODOS) {
      const p = { mapa: mapId, modo, bootMs: null, updateMs: null, updates: 0, erros: [], estadoFinal: null, bots: null, tempoJogo: null, chegouLive: false };
      const capturados = [];
      console.error = (...a) => { capturados.push(a.map(String).join(' ').slice(0, 200)); };
      console.warn = () => {}; console.log = () => {};
      try {
        const t0 = Date.now();
        const g = bootGame(mapId, { textures, ctf: modo === 'ctf', seed: 12345, bots: 4 });
        p.bootMs = Date.now() - t0;
        p.bots = g.bots?.length ?? null;
        const t1 = Date.now();
        for (let i = 0; i < UPDATES; i++) {
          try {
            if (MUTANTE === 'partida-quebrada' && i === 0) throw new TypeError("Cannot read properties of undefined (reading 'position') [mutante partida-quebrada]");
            g.update(1 / 60);
            p.updates++;
          } catch (e) {
            p.erros.push({ update: i, mensagem: String(e?.message || e).slice(0, 300), stack: String(e?.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 600) });
            if (p.erros.length >= 3) break;
          }
          if (g.state === 'live') p.chegouLive = true;
        }
        p.updateMs = Date.now() - t1;
        p.estadoFinal = g.state ?? null;
        p.tempoJogo = Number.isFinite(g.time) ? Math.round(g.time * 10) / 10 : null;
      } catch (e) {
        p.erros.push({ update: -1, mensagem: `boot: ${String(e?.message || e).slice(0, 300)}`, stack: String(e?.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 600) });
      } finally {
        console.error = consoleErro; console.warn = consoleWarn; console.log = consoleLog;
      }
      p.consoleErros = capturados.slice(0, 5);
      out.partidas.push(p);
    }
  }
} catch (e) {
  out.fatal = `harness: ${String(e?.message || e).slice(0, 400)}`;
}
process.stdout.write(JSON.stringify(out) + '\n');
