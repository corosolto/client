/* ============================================================================
   serve-eval.mjs — SOBE O tools/eval/serve.mjs E ESPERA COM UM PRAZO SÓ
   ----------------------------------------------------------------------------
   POR QUE EXISTE (OPS-11): cada régua tinha o próprio teto de boot (30 a 60 s,
   60×500 ms no vm-palco) e o serve.mjs (Astro + Vite) levou 51–117 s para
   responder num Mac com o volume lento. O pre-push reprovava por infraestrutura
   ("servidor de eval não subiu na porta 9177"), não pelo que a régua mede.

   Agora o prazo é um só, EVAL_BOOT_TIMEOUT_MS (padrão 180000). Porta ocupada
   reprova antes do spawn, e o filho que morre antes de responder reprova NA HORA
   com o código de saída e a cauda do stderr, em vez de esperar o prazo inteiro. Cada régua continua escolhendo a
   URL que prova "pronto" (e, se precisar, o que a resposta tem que conter).
   ============================================================================ */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CAUDA_STDERR = 2000;

export const PRAZO_BOOT_MS = (() => {
  const bruto = process.env.EVAL_BOOT_TIMEOUT_MS;
  if (bruto === undefined || bruto === '') return 180000;
  const ms = Number(bruto);
  if (!Number.isFinite(ms) || ms <= 0) throw new Error(`EVAL_BOOT_TIMEOUT_MS inválido: ${JSON.stringify(bruto)} (ms > 0)`);
  return ms;
})();

const segundos = (ms) => (ms / 1000).toFixed(1);

/* Sobe `node <script> <porta>` (padrão tools/eval/serve.mjs) e resolve quando `url` responde ok, ou quando
   `aceita(resposta)` diz que sim. Devolve { base, filho, ms, kill, saiu, stderr() }; o filho morre junto com a régua. */
export async function subirServe(porta, { url, aceita, env, cwd = RAIZ, script = 'tools/eval/serve.mjs' } = {}) {
  const base = `http://127.0.0.1:${porta}`;
  const alvo = url || `${base}/`;
  const t0 = Date.now();
  const ocupada = await new Promise((resolve) => {
    const sonda = net.createServer();
    sonda.once('error', (erro) => resolve(erro.code || erro.message));
    sonda.listen(porta, '127.0.0.1', () => sonda.close(() => resolve(null)));
  });
  if (ocupada) throw new Error(`servidor de eval não subiu na porta ${porta}: porta ocupada (${ocupada}), serve.mjs nem foi iniciado`);
  const fim = t0 + PRAZO_BOOT_MS;
  const filho = spawn(process.execPath, [script, String(porta)], {
    cwd, env: env || process.env, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  filho.stderr.setEncoding('utf8');
  filho.stderr.on('data', (parte) => { stderr = (stderr + parte).slice(-CAUDA_STDERR); });
  const kill = () => { if (filho.exitCode === null && filho.signalCode === null) filho.kill(); };
  process.on('exit', kill);

  let saida = null;
  const morreu = new Promise((resolve) => {
    filho.once('exit', (code, signal) => { saida = { code, signal }; resolve(); });
    filho.once('error', (erro) => { saida = { erro }; resolve(); });
  });
  const falhaDoFilho = () => {
    const como = saida.erro ? `não iniciou (${saida.erro.message})`
      : `saiu com código ${saida.code}${saida.signal ? ` (sinal ${saida.signal})` : ''}`;
    const cauda = stderr.trim() ? `\n${stderr.trim()}` : '';
    return new Error(`servidor de eval não subiu na porta ${porta}: ${path.basename(script)} ${como} após ${segundos(Date.now() - t0)} s, antes de responder em ${alvo}${cauda}`);
  };

  for (;;) {
    if (saida) throw falhaDoFilho();
    const resta = fim - Date.now();
    if (resta <= 0) {
      kill();
      throw new Error(`servidor de eval não subiu na porta ${porta}: ${alvo} sem resposta ok em ${segundos(Date.now() - t0)} s (prazo EVAL_BOOT_TIMEOUT_MS=${PRAZO_BOOT_MS})`);
    }
    const tentativa = (async () => {
      try {
        const resposta = await fetch(alvo, { signal: AbortSignal.timeout(resta) });
        const pronta = aceita ? await aceita(resposta) : resposta.ok;
        await resposta.body?.cancel().catch(() => {});
        return pronta;
      } catch { /* subindo */ }
      return false;
    })();
    if (await Promise.race([tentativa, morreu.then(() => false)])) {
      return { base, filho, ms: Date.now() - t0, kill, saiu: morreu, stderr: () => stderr };
    }
    if (saida) throw falhaDoFilho();
    await Promise.race([new Promise((r) => setTimeout(r, Math.min(250, Math.max(0, fim - Date.now())))), morreu]);
  }
}
