/* ============================================================================
   report.mjs — VEREDITO E RELATÓRIO CURTO.
   ----------------------------------------------------------------------------
   Duas perguntas diferentes, duas respostas separadas — misturá-las é o que faz
   "quality gate verde" virar "pode lançar":

   TECNICAMENTE VERDE · nenhuma sonda que rodou achou CRÍTICO nem ALTO, e nenhuma
   ficou INCONCLUSIVA. É a resposta de máquina: o que foi medido passou.

   PRONTO PARA LANÇAMENTO · além de verde, exige que o retrato seja COMPLETO e
   seja DO CANDIDATO: sondas remotas E locais rodaram, houve prova de boot em
   navegador, produção e árvore estão na mesma versão, nada MÉDIO em aberto e
   os pipelines de telemetria têm linha recente (ou o operador aceitou
   explicitamente a janela sem tráfego). Cada item que falta vira um motivo
   nomeado no relatório — nunca um "não" seco.
   ============================================================================ */
import { PESO } from './explain.mjs';

export const SEVERIDADES = ['inconclusivo', 'critico', 'alto', 'medio', 'aviso', 'info'];
const ROTULO = { inconclusivo: 'INCONCLUSIVO', critico: 'CRÍTICO', alto: 'ALTO', medio: 'MÉDIO', aviso: 'AVISO', info: 'INFO' };

export function veredito(achados, sondas = {}, opcoes = {}) {
  const conta = Object.fromEntries(SEVERIDADES.map((s) => [s, achados.filter((a) => a.severidade === s).length]));
  const inconclusivo = conta.inconclusivo > 0;
  const tecnicamenteVerde = !inconclusivo && conta.critico === 0 && conta.alto === 0;
  const motivos = [];
  if (inconclusivo) motivos.push('há sonda inconclusiva (alvo inalcançável desta rede)');
  if (conta.critico) motivos.push(`${conta.critico} achado(s) crítico(s)`);
  if (conta.alto) motivos.push(`${conta.alto} achado(s) alto(s)`);
  if (conta.medio) motivos.push(`${conta.medio} achado(s) médio(s) em aberto`);
  if (!sondas.boot || !sondas.api || !sondas.assets) motivos.push('sondas remotas (boot/api/assets) incompletas — o retrato não olhou a produção inteira');
  if (!sondas.bootLocal || !sondas.assetsLocal || !sondas.partidas) motivos.push('sondas locais (árvore/partida sintética) não rodaram');
  if (!sondas.navegador?.mainReady) motivos.push('sem prova de boot em navegador (sonda de navegador ausente ou reprovada)');
  if (sondas.boot?.versaoHtml && sondas.contexto?.versaoLocal && sondas.boot.versaoHtml !== sondas.contexto.versaoLocal) motivos.push(`produção (${sondas.boot.versaoHtml}) ≠ árvore (${sondas.contexto.versaoLocal}) — o que se mediu não é o candidato`);
  const health = sondas.api?.health?.corpo;
  if (health && health.fresh === false && !opcoes.aceitarSemTrafego) motivos.push(`telemetria sem linha recente em ${(health.stale || []).join(', ')} (passe --aceitar-sem-trafego se a janela for de madrugada)`);
  const prontoParaLancamento = tecnicamenteVerde && motivos.length === 0;
  return { tecnicamenteVerde, prontoParaLancamento, inconclusivo, conta, motivos };
}

export function codigoDeSaida(v) {
  if (v.inconclusivo) return 3;
  return v.tecnicamenteVerde ? 0 : 1;
}

function linhaSonda(nome, s) {
  if (!s) return `| ${nome} | não rodou | — |`;
  if (s.sonda === 'boot') return `| boot remoto | ${s.html?.status === 200 ? 'ok' : `HTML ${s.html?.status || s.html?.erro}`} | ${s.html?.ms ?? '—'} ms · ${Object.keys(s.importMap || {}).length} entradas no import map · v ${s.versaoHtml || '?'}/${s.versaoJs || '?'} · grafo ${s.coerencia ? (s.coerencia.problemas.length ? `${s.coerencia.problemas.length} problema(s)` : 'coerente') : 'não medido'} |`;
  if (s.sonda === 'api') return `| api | ${s.health?.status === 200 && s.health?.corpo?.ok ? 'ok' : `health ${s.health?.status || s.health?.erro}`} | ${(s.rotas || []).map((r) => `${r.rota} ${r.ok}/${r.total} p95 ${r.p95 ?? '—'} ms`).join(' · ')} |`;
  if (s.sonda === 'ranking') return `| ranking | ${s.pagina?.status === 200 ? 'ok' : `página ${s.pagina?.status || s.pagina?.erro}`} | flag ${s.flagLocal} · leaderboard ${s.leaderboard?.desligado ? 'desligado' : s.leaderboard?.status} |`;
  if (s.sonda === 'assets') return `| assets no edge | ${s.faltando.length || s.conteudoErrado.length || s.semResposta.length ? `${s.faltando.length} 404 · ${s.conteudoErrado.length} corpo errado · ${s.semResposta.length} sem resposta` : 'ok'} | ${s.total} sondados · p95 ${s.p95ms ?? '—'} ms · ${s.cacheHits} HIT |`;
  if (s.sonda === 'boot-local') return `| boot local | ${s.coerencia?.problemas?.length ? `${s.coerencia.problemas.length} problema(s)` : 'ok'} | package ${s.versaoPackage} · version.js ${s.versaoJs} · ${s.manifesto?.modulos} módulos · ops.js ${s.indexAstro?.temOpsJs ? 'ligado' : 'ausente'} |`;
  if (s.sonda === 'assets-local') return `| assets na árvore | ${s.faltando.length || s.conteudoErrado.length ? `${s.faltando.length} faltando · ${s.conteudoErrado.length} corrompido(s)` : 'ok'} | ${s.total} conferidos |`;
  if (s.sonda === 'partidas') return `| partida sintética | ${s.fatal ? 'não subiu' : s.comErro.length || s.semLive.length ? `${s.comErro.length} crash · ${s.semLive.length} sem live` : 'ok'} | ${s.partidas.length} partidas · boot p95 ${s.bootP95 ?? '—'} ms · ${s.msPorUpdateMax ? s.msPorUpdateMax.toFixed(2) : '—'} ms/update máx |`;
  if (s.sonda === 'navegador') return `| navegador | ${s.indisponivel ? 'não rodou' : s.mainReady ? 'ok' : 'boot morto'} | ${s.indisponivel ? s.motivo : `ready em ${s.readyMs ?? '—'} ms · ${(s.pageErrors || []).length} exceções · ${(s.requestsFalhas || []).length} recursos falhos · partida ${s.partida ? (s.partida.chegouLive ? `live em ${s.partida.ms} ms` : 'não chegou a live') : 'não pedida'} · fps p50 ${s.ops?.fps?.p50 ?? '—'} · ${(s.escritasBloqueadas || []).length} escrita(s) bloqueada(s)`} |`;
  return `| ${nome} | ? | |`;
}

export function renderMarkdown(diag) {
  const { alvo, quando, achados, veredito: v, sondas, comandos = [], limitacoes = [], duracaoMs } = diag;
  const L = [];
  L.push(`# Diagnóstico operacional — ${alvo || 'árvore local'} — ${quando}`);
  L.push('');
  L.push(`**Tecnicamente verde:** ${v.inconclusivo ? 'INCONCLUSIVO' : v.tecnicamenteVerde ? 'SIM' : 'NÃO'} · **Pronto para lançamento:** ${v.prontoParaLancamento ? 'SIM' : 'NÃO'}`);
  if (!v.prontoParaLancamento) for (const m of v.motivos) L.push(`- falta: ${m}`);
  L.push('');
  const relevantes = achados.filter((a) => a.severidade !== 'info');
  L.push(`## Achados (${relevantes.length}${achados.length !== relevantes.length ? ` + ${achados.length - relevantes.length} info` : ''})`);
  if (!achados.length) L.push('Nenhum. Tudo que foi medido passou.');
  achados.forEach((a, i) => {
    L.push('');
    L.push(`${i + 1}. **[${ROTULO[a.severidade]}] ${a.titulo}** _(${a.sonda})_`);
    L.push(`   - Causa provável: ${a.causa}`);
    L.push(`   - Evidência: ${a.evidencia}`);
    L.push(`   - Impacto: ${a.impacto}`);
    L.push(`   - Próximo passo: ${a.proximo}`);
  });
  L.push('');
  L.push('## Sondas');
  L.push('');
  L.push('| sonda | resultado | evidência |');
  L.push('|---|---|---|');
  for (const [nome, chave] of [['boot remoto', 'boot'], ['api', 'api'], ['ranking', 'ranking'], ['assets no edge', 'assets'], ['boot local', 'bootLocal'], ['assets na árvore', 'assetsLocal'], ['partida sintética', 'partidas'], ['navegador', 'navegador']]) L.push(linhaSonda(nome, sondas[chave]));
  if (limitacoes.length) { L.push(''); L.push('## Limitações desta execução'); for (const l of limitacoes) L.push(`- ${l}`); }
  if (comandos.length) { L.push(''); L.push('## Comandos executados'); L.push(''); L.push('```'); for (const c of comandos) L.push(c); L.push('```'); }
  L.push('');
  L.push(`_${achados.length} achado(s) · ${Math.round((duracaoMs || 0) / 100) / 10} s · tools/ops/diagnose.mjs_`);
  return L.join('\n');
}

export function renderJson(diag) {
  return JSON.stringify(diag, (k, v) => (v instanceof Uint8Array ? `<${v.length} bytes>` : v), 2);
}

export { ROTULO, PESO };
