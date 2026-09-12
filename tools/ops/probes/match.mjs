/* ============================================================================
   match.mjs — A PARTIDA COMEÇA E SOBREVIVE A 10 s DE JOGO, EM TODO MAPA E MODO?
   ----------------------------------------------------------------------------
   Corre o match-worker.mjs num processo filho com timeout: um mapa que trava o
   loop (laço infinito, GLB que nunca "chega") não pode segurar a diagnose. O
   resultado por partida carrega boot em ms, updates executados, estado final,
   número de bots e as exceções com stack — é a evidência que a bug-hunt pede.
   ============================================================================ */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RAIZ_PADRAO } from '../lib/repo.mjs';

export function sondaPartidas({ raiz = RAIZ_PADRAO, mapas = 'all', modos = 'rounds,ctf', updates = 600, timeoutMs = 150_000, mutante = '' } = {}) {
  return new Promise((resolve) => {
    const worker = fileURLToPath(new URL('./match-worker.mjs', import.meta.url));
    const env = { ...process.env };
    if (mutante) env.OPS_MUTANTE = mutante; else delete env.OPS_MUTANTE;
    const p = spawn(process.execPath, [worker, `--mapas=${mapas}`, `--modos=${modos}`, `--updates=${updates}`], { cwd: raiz, env });
    let out = ''; let err = ''; let morto = false;
    const timer = setTimeout(() => { morto = true; try { p.kill('SIGKILL'); } catch { /* já saiu */ } }, timeoutMs);
    // sem este listener, ENOENT (cwd inexistente, node ausente) derruba a diagnose inteira em vez de virar `fatal`
    p.on('error', (e) => { clearTimeout(timer); resolve({ sonda: 'partidas', exit: null, timeout: false, fatal: `worker não subiu: ${e.message}`, partidas: [], mapasDisponiveis: [], comErro: [], semLive: [], semBots: [], bootP95: null, msPorUpdateMax: 0 }); });
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (exit) => {
      clearTimeout(timer);
      const linha = out.trim().split('\n').filter(Boolean).pop() || '';
      let dados = null;
      try { dados = JSON.parse(linha); } catch { /* sem JSON: worker morreu antes de responder */ }
      const r = { sonda: 'partidas', exit, timeout: morto, fatal: dados?.fatal || (dados ? null : `worker sem resposta (exit ${exit}${morto ? ', timeout' : ''}): ${err.trim().slice(-400)}`), partidas: dados?.partidas || [], mapasDisponiveis: dados?.mapasDisponiveis || [] };
      r.comErro = r.partidas.filter((x) => x.erros.length);
      r.semLive = r.partidas.filter((x) => !x.erros.length && !x.chegouLive);
      r.semBots = r.partidas.filter((x) => !x.erros.length && (x.bots === 0 || x.bots == null));
      r.bootP95 = pct(r.partidas.map((x) => x.bootMs).filter(Number.isFinite), 95);
      r.msPorUpdateMax = Math.max(0, ...r.partidas.filter((x) => x.updates > 0).map((x) => x.updateMs / x.updates));
      resolve(r);
    });
  });
}

function pct(v, p) { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.max(0, Math.ceil(s.length * p / 100) - 1)] : null; }
