/* llm.mjs — chamada ao LLM, uma abstração, quatro provedores.
   ─────────────────────────────────────────────────────────────────────────────
   "opencode" (padrão): shells out pro `opencode run` configurado na máquina.
   "ollama": servidor local em 127.0.0.1:11434. "openai": endpoint compatível
   via LLM_BASE_URL/LLM_API_KEY/LLM_MODEL. "fixture": responde de um arquivo —
   é o que faz os testes 100% offline dos bots (sem rede, sem modelo).
   Todas devolvem TEXTO; o chamador extrai o JSON. */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* cfg = config.json DO BOT (objeto já lido). dirBot = diretório do bot. */
export async function perguntar(prompt, { cfg, dirBot }) {
  const p = cfg.provedor || 'opencode';
  if (p === 'opencode') return viaOpencode(prompt, cfg);
  if (p === 'ollama') return viaOllama(prompt, cfg);
  if (p === 'openai') return viaOpenai(prompt, cfg);
  if (p === 'fixture') return viaFixture(cfg, dirBot);
  throw new Error(`provedor desconhecido: ${p}`);
}

const semAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function viaOpencode(prompt, cfg) {
  const args = ['run', '--pure'];
  args.push('-m', cfg.modelo || 'zai-coding-plan/glm-4.7');
  args.push(prompt);
  const r = spawnSync('opencode', args, { encoding: 'utf8', timeout: 240_000, maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) {
    /* status null + signal SIGTERM = timeout do spawnSync: stderr vem vazio e
     * o erro nascia como "opencode run: " (indechifrável no log do canarinho). */
    const causa = r.signal ? `signal=${r.signal}` : `status=${r.status}`;
    throw new Error(`opencode run (${causa}): ${(semAnsi(r.stderr || r.stdout || '(sem saída)')).slice(0, 200)}`);
  }
  return semAnsi(r.stdout).split('\n').filter((l) => !/^>\s/.test(l) && l.trim() !== '').join('\n').trim();
}

async function viaOllama(prompt, cfg) {
  const r = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.modelo || 'llama3.1', prompt, stream: false }),
  });
  if (!r.ok) throw new Error(`ollama ${r.status}`);
  return (await r.json()).response;
}

async function viaOpenai(prompt, cfg) {
  const base = process.env.LLM_BASE_URL, key = process.env.LLM_API_KEY, model = cfg.modelo || process.env.LLM_MODEL;
  if (!base || !key) throw new Error('provedor openai exige LLM_BASE_URL e LLM_API_KEY');
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
  });
  if (!r.ok) throw new Error(`openai-compat ${r.status}`);
  return (await r.json()).choices[0].message.content;
}

/* fixture: arquivo com ARRAY DE STRINGS — cada string é uma resposta literal
 * do "modelo", consumida em ordem (fila em memória por processo). Config:
 * "fixture": "testes/respostas.json" relativo ao bot. */
function viaFixture(cfg, dirBot) {
  if (!cfg.fixture) throw new Error('provedor fixture exige "fixture" no config.json');
  const arq = join(dirBot, cfg.fixture);
  const fila = JSON.parse(readFileSync(arq, 'utf8'));
  if (!Array.isArray(fila) || !fila.length) throw new Error(`fixture ${arq} vazia — o teste pediu mais respostas do que há`);
  if (typeof fila[0] !== 'string') throw new Error(`fixture ${arq}: cada resposta deve ser STRING (a resposta literal do modelo)`);
  return String(fila.shift());
}
