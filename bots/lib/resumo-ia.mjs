/* resumo-ia.mjs — parágrafo opcional gerado por IA local, sempre fail-soft.
   ─────────────────────────────────────────────────────────────────────────────
   NUNCA decide nada: os bots que usam isto já apuraram o achado de forma
   100% determinística (grep, diff, comparação de rodada). Este módulo só
   pede pro Ollama NARRAR o achado em texto livre, na voz da persona, pra
   humano ler mais rápido. Se o Ollama estiver fora do ar, `resumo_ia` não
   existir no config.json do bot, ou vier `habilitada: false`, devolve null
   e o bot segue publicando sem o parágrafo — igual já fazia antes de
   qualquer LLM existir. Nenhum selftest chama isto: eles continuam 100%
   offline, testando só a parte determinística. */
import { perguntar } from './llm.mjs';
import { instrucaoDeTom } from './persona.mjs';

export async function resumoIA(fatos, { cfg, dirBot, persona, log }) {
  const rc = cfg?.resumo_ia;
  if (!rc || rc.habilitada === false) return null;
  const prompt = `${instrucaoDeTom(persona)}

Narre em até 4 frases, em português, o que os fatos abaixo significam pra
quem só vai ler o título da issue/PR. NÃO invente número, arquivo ou causa
que não esteja nos fatos. NÃO repita os fatos em lista, escreva prosa corrida.

FATOS (apurados por código determinístico, não pelo modelo):
${fatos}`;
  try {
    const texto = (await perguntar(prompt, { cfg: rc, dirBot })).trim();
    return texto || null;
  } catch (e) {
    log?.(`resumo_ia indisponível — segue sem parágrafo (${String(e.message).slice(0, 120)})`);
    return null;
  }
}
