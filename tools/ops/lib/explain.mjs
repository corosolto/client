/* ============================================================================
   explain.mjs — DE SINTOMA A CAUSA PROVÁVEL, COM EVIDÊNCIA, IMPACTO E PRÓXIMO PASSO.
   ----------------------------------------------------------------------------
   Função pura: recebe o que as sondas mediram e devolve ACHADOS. Nenhuma regra
   aqui inventa número — cada uma cita o sinal medido e, quando o caso já
   aconteceu nesta base, o registro (BUG-39, #362, LICOES §5…). É o mapa
   sintoma → causa que hoje mora na cabeça de quem já apagou o incêndio.

   Severidade (decide o veredito em report.mjs):
     critico  · o jogador não joga (boot morto, backend fora, crash de partida)
     alto     · uma função inteira caiu ou vai cair no deploy (asset faltando,
                versão dessincronizada, pipeline que nunca gravou)
     medio    · degradação que o jogador sente às vezes (5xx intermitente,
                latência, incoerência de flag)
     aviso    · risco/observabilidade (sem CSP, régua que não mediu)
     info     · contexto (produção atrás da árvore, camada ainda não publicada)
     inconclusivo · a sonda não alcançou o alvo (rede/proxy) — não é verde nem
                vermelho, e o relatório diz isso em vez de esconder

   Toda regra é testável isolada: tools/ops/tests/explain.test.mjs alimenta
   resultados sintéticos e cobra id + severidade; o selftest.mjs faz o mesmo de
   ponta a ponta contra um servidor com a falha injetada.
   ============================================================================ */

export const PESO = { critico: 5, alto: 4, medio: 3, aviso: 2, info: 1, inconclusivo: 6 };

/* Limiares de latência. Procedência: DUAS medições só (06/09/2026, madrugada, sem pico) —
   raiz 132–252 ms · /api/* p95 224–1085 ms · assets p95 632 ms com cache frio. Sem medição em
   pico eles são AVISO; promover a MÉDIO exige a série dos diagnostico.json de artifacts/ops. */
export const LIMIARES = { htmlLentoMs: 2500, apiP95Ms: 2000, assetsP95Ms: 3000 };

const ach = (lista, a) => { lista.push(a); return a; };
const n = (x) => (x == null ? '—' : x);

export function explicar(res = {}) {
  const A = [];
  const ctx = res.contexto || {};
  explicaBootRemoto(A, res.boot, ctx);
  explicaApi(A, res.api, ctx);
  explicaRanking(A, res.ranking, ctx);
  explicaAssetsRemoto(A, res.assets, { ...ctx, versaoRemota: res.boot?.versaoHtml || null });
  explicaBootLocal(A, res.bootLocal, ctx);
  explicaAssetsLocal(A, res.assetsLocal, ctx);
  explicaPartidas(A, res.partidas, ctx);
  explicaNavegador(A, res.navegador, ctx);
  return A.sort((a, b) => PESO[b.severidade] - PESO[a.severidade] || a.id.localeCompare(b.id));
}

/* exit ≠ 0 sem nenhuma linha ✗ = a régua morreu (fetch failed, JSON.parse), não "grafo coerente" */
const coerenciaNaoMedida = (c) => c.exit == null || (c.exit !== 0 && !(c.problemas || []).length);

function explicaBootRemoto(A, boot, ctx) {
  if (!boot) return;
  const alvo = boot.alvo;
  const h = boot.html || {};
  if (h.status === 0) {
    const inconclusivo = /^(proxy|dns)/.test(h.erro || '');
    return ach(A, {
      id: 'alvo-inalcancavel', sonda: 'boot', severidade: inconclusivo ? 'inconclusivo' : 'critico',
      titulo: `${alvo} não respondeu (${h.erro})`,
      causa: inconclusivo ? 'a rede de quem sondou bloqueia o alvo (proxy/DNS), não necessariamente o site' : 'site fora do ar, DNS/TLS quebrado ou rede sem saída',
      evidencia: `GET ${alvo}/ → sem resposta em ${h.ms} ms (${h.erro})`,
      impacto: inconclusivo ? 'nenhum medido — a sonda remota não conseguiu olhar' : 'ninguém abre o jogo',
      proximo: inconclusivo ? 'rode a diagnose de uma rede sem proxy (a máquina do dono ou o prod-watch) — `npm run ops:diag`' : 'confirme de outra rede; se persistir, painel da Vercel (Deployments) e status do DNS/Cloudflare',
    });
  }
  if (h.status !== 200) {
    return ach(A, {
      id: 'html-nao-200', sonda: 'boot', severidade: 'critico', titulo: `a raiz respondeu ${h.status}`,
      causa: h.status >= 500 ? 'função SSR/edge da Vercel falhando (deploy quebrado ou proteção de deployment)' : 'rota raiz não é mais o jogo (redirect/404 no edge)',
      evidencia: `GET ${alvo}/ → ${h.status} em ${h.ms} ms`,
      impacto: 'ninguém abre o jogo', proximo: 'Vercel → Deployments: promover o deploy anterior (rollback) e olhar os logs do que está no ar',
    });
  }
  if (!boot.importMap) {
    return ach(A, {
      id: 'html-sem-importmap', sonda: 'boot', severidade: 'critico', titulo: 'o HTML da raiz não tem import map',
      causa: 'edge/CDN serviu outra página (erro, manutenção ou HTML pré-migração) no lugar do index.astro',
      evidencia: `GET ${alvo}/ → 200, ${h.bytes} bytes, sem <script type="importmap">`,
      impacto: 'nenhum módulo resolve — jogo morto', proximo: 'purgar o cache do edge para `/` e re-sondar; se persistir, rollback na Vercel',
    });
  }
  const m = boot.mainJs;
  if (!m) {
    ach(A, {
      id: 'html-sem-main-js', sonda: 'boot', severidade: 'critico', titulo: 'o HTML não referencia /js/main.js',
      causa: 'index.astro publicado sem a tag do main.js, ou import map sem a entrada dele',
      evidencia: `scripts de módulo no HTML: ${(boot.scriptsModulo || []).join(', ') || 'nenhum'}`,
      impacto: 'menu estático sem jogo — botão JOGAR inerte', proximo: 'comparar o HTML servido com src/pages/index.astro da tag publicada; rollback se divergir',
    });
  } else if (m.status !== 200) {
    ach(A, {
      id: 'main-js-indisponivel', sonda: 'boot', severidade: 'critico', titulo: `main.js respondeu ${m.status || m.erro}`,
      causa: 'deploy sem o módulo (prune/manifesto) ou edge com HTML novo e JS velho (BUG-39)',
      evidencia: `GET ${alvo}/js/main.js?v=… → ${m.status || m.erro} em ${m.ms} ms`,
      impacto: 'botão JOGAR inerte para todo mundo', proximo: 'purge de `/js/*` no Cloudflare (crash-fix.yml faz isso) e re-sondar; se persistir, rollback',
    });
  } else if (m && m.ehHtml) {
    ach(A, {
      id: 'main-js-e-html', sonda: 'boot', severidade: 'critico', titulo: 'main.js está sendo servido como HTML',
      causa: 'rewrite/fallback do host entregando página no lugar do módulo (rota /js/* capturada pelo SSR ou 404 disfarçado)',
      evidencia: `GET ${alvo}/js/main.js → 200 com corpo HTML (content-type ${m.tipo})`,
      impacto: 'SyntaxError no parse do módulo: jogo morto', proximo: 'conferir `vercel.json` (rewrites/headers) e o `dist` publicado; rollback se a versão anterior servia JS',
    });
  }
  if (boot.versaoHtml && boot.versaoJs && boot.versaoHtml !== boot.versaoJs) {
    ach(A, {
      id: 'versao-divergente', sonda: 'boot', severidade: 'alto', titulo: `HTML é ${boot.versaoHtml}, version.js é ${boot.versaoJs}`,
      causa: 'edge servindo HTML de um deploy e JS de outro (cache split-brain, BUG-39/BUG-75) ou deploy parcial',
      evidencia: `?v= do stylesheet = ${boot.versaoHtml}; VERSION exportada em /js/version.js = ${boot.versaoJs}`,
      impacto: 'mix de versões: import nomeado pode faltar no próximo módulo; telemetria etiqueta a versão errada',
      proximo: 'purgar `/js/*` e `/` no Cloudflare, esperar o TTL curto (eval:edgecache) e re-sondar',
    });
  }
  const c = boot.coerencia;
  if (c && c.problemas?.length) {
    const faltando = c.problemas.filter((p) => /^HTTP \d+/.test(p));
    const exportsFaltando = c.problemas.filter((p) => /não exporta/.test(p));
    ach(A, {
      id: 'grafo-incoerente', sonda: 'boot', severidade: 'critico',
      titulo: `grafo de módulos incoerente (${faltando.length} módulo(s) sem resposta, ${exportsFaltando.length} export(s) faltando)`,
      causa: exportsFaltando.length ? 'módulos de deploys diferentes na mesma página — cache split-brain (BUG-39)' : 'módulo referenciado não está publicado (prune-dist, manifesto ou 404 do edge)',
      evidencia: c.problemas.slice(0, 5).join(' · '),
      impacto: 'boot morre no parse ("does not provide an export named …")',
      proximo: 'purge de `/js/*` no Cloudflare e re-sondar (`npm run prod:coherence`); se persistir, rollback do deploy',
    });
  } else if (c && coerenciaNaoMedida(c)) {
    ach(A, { id: 'coerencia-nao-medida', sonda: 'boot', severidade: 'inconclusivo', titulo: `a coerência do grafo não foi medida (prod-coherence ${c.exit == null ? 'não terminou' : `saiu ${c.exit} sem listar problema`})`, causa: 'prod-coherence.mjs explodiu (fetch/JSON sem try), não existe ou estourou o timeout — não é verde nem vermelho', evidencia: (c.saida || '').slice(-300) || 'prod-coherence não produziu saída', impacto: 'um split-brain passaria batido nesta execução', proximo: 'rodar `npm run prod:coherence` à mão e ler o erro; a diagnose sai 3 até a régua medir' });
  }
  if (!h.csp) {
    ach(A, { id: 'sem-csp', sonda: 'boot', severidade: 'aviso', titulo: 'a raiz saiu sem Content-Security-Policy', causa: 'headers do vercel.json não aplicados nesta resposta (edge/rewrite) — ou alvo não é a Vercel', evidencia: `GET ${alvo}/ sem header content-security-policy`, impacto: 'script injetado por extensão/terceiro roda sem trava', proximo: 'conferir `headers` em vercel.json e o que o edge repassa' });
  }
  if (h.ms > LIMIARES.htmlLentoMs) {
    ach(A, { id: 'html-lento', sonda: 'boot', severidade: 'aviso', titulo: `a raiz levou ${h.ms} ms (limiar ${LIMIARES.htmlLentoMs} ms, sem procedência de pico)`, causa: 'função SSR fria, edge sem cache ou rede', evidencia: `GET ${alvo}/ → 200 em ${h.ms} ms (cf-cache-status ${n(h.cfCache)})`, impacto: 'splash demora; funil perde jogador antes do menu', proximo: 'repetir a sonda em pico; se o p95 seguir acima do limiar, olhar cache da raiz e região da função — e promover a régua a MÉDIO com a série' });
  }
  if (boot.opsJs && !boot.opsJs.noHtml) {
    ach(A, { id: 'ops-runtime-ausente', sonda: 'boot', severidade: 'info', titulo: 'a versão publicada ainda não carrega public/js/ops.js', causa: 'camada operacional não deployada', evidencia: `HTML de ${boot.versaoHtml || alvo} sem <script src="/js/ops.js">`, impacto: 'sem FPS/falhas de carga/abandono por sessão no navegador', proximo: 'publicar a branch com o ops.js' });
  }
  if (boot.versaoHtml && ctx.versaoLocal && boot.versaoHtml !== ctx.versaoLocal) {
    ach(A, { id: 'producao-atras-da-arvore', sonda: 'boot', severidade: 'info', titulo: `produção em ${boot.versaoHtml}, árvore em ${ctx.versaoLocal}`, causa: 'a árvore local tem commits não publicados (ou está atrás da main)', evidencia: `HTML ?v=${boot.versaoHtml} · package.json ${ctx.versaoLocal}`, impacto: 'o retrato remoto mede outra versão; comparações de tamanho de asset ficam desligadas', proximo: 'nenhum — publique e re-sonde para medir a versão nova' });
  }
}

function explicaApi(A, api, ctx) {
  if (!api) return;
  const hs = api.health;
  if (!hs || hs.status === 0 || hs.status >= 500) {
    ach(A, {
      id: 'health-indisponivel', sonda: 'api', severidade: /^(proxy|dns)/.test(hs?.erro || '') ? 'inconclusivo' : 'critico',
      titulo: `/api/health respondeu ${hs?.status || hs?.erro || '?'}`,
      causa: 'backend (Cloud Run) fora ou proxy do site sem alcançá-lo',
      evidencia: `GET ${hs?.url} → ${hs?.status || hs?.erro} em ${hs?.ms} ms`,
      impacto: 'sem ranking, presença, telemetria, ticket de multiplayer; o jogo single-player continua',
      proximo: 'logs do serviço no Cloud Run e a última revisão publicada (rollback de revisão se coincidir com deploy do backend)',
    });
  } else if (hs.status !== 200 || hs.corpo?.ok !== true) {
    ach(A, { id: 'health-nao-ok', sonda: 'api', severidade: 'critico', titulo: `/api/health não está ok (${hs.status})`, causa: 'backend respondendo, mas se declarando doente', evidencia: JSON.stringify(hs.corpo || {}).slice(0, 200), impacto: 'ranking/presença/telemetria degradados', proximo: 'ler o corpo do health e os logs do backend' });
  } else {
    const c = hs.corpo;
    if (c.database === false) ach(A, { id: 'banco-fora', sonda: 'api', severidade: 'critico', titulo: 'backend sem banco (database:false)', causa: 'Supabase indisponível ou credencial/secret do backend inválida', evidencia: `health: ${JSON.stringify({ database: c.database, telemetrySchema: c.telemetrySchema })}`, impacto: 'ranking, presença, funil, perf e partidas param de gravar; badge/ranking SSR podem dar 500', proximo: 'status do Supabase e Secret Manager do backend; conferir migrations não aplicadas' });
    if (c.telemetrySchema === false) ach(A, { id: 'schema-telemetria', sonda: 'api', severidade: 'alto', titulo: 'schema de telemetria atrasado (telemetrySchema:false)', causa: 'migration do db-privado não aplicada para a versão do backend', evidencia: `health.telemetrySchema=false`, impacto: 'beacons chegam e não gravam (falha silenciosa, LICOES §5)', proximo: 'aplicar as migrations pendentes no db-privado e re-sondar' });
    if (c.operationalFresh === false) ach(A, { id: 'mp-sem-heartbeat', sonda: 'api', severidade: 'alto', titulo: `nó(s) de multiplayer sem heartbeat: ${(c.operationalStale || []).join(', ') || '?'}`, causa: 'VM regional caída, Caddy/WebSocket parado ou identidade do nó rejeitada', evidencia: `health.operationalFresh=false stale=${JSON.stringify(c.operationalStale)} never=${JSON.stringify(c.operationalNever)}`, impacto: 'lobby sem servidor naquela região; jogador cai em outro nó ou fica sem MP', proximo: 'runbook do backend/game: subir o nó e conferir `/health` do próprio nó' });
    if (Array.isArray(c.never) && c.never.length) ach(A, { id: 'pipeline-nunca-gravou', sonda: 'api', severidade: 'alto', titulo: `pipeline(s) que nunca gravaram: ${c.never.join(', ')}`, causa: 'rota/beacon apontando para tabela nova sem linha, ou cliente não envia', evidencia: `health.never=${JSON.stringify(c.never)}`, impacto: 'painel cego nessa métrica desde o deploy', proximo: 'enviar um evento de teste (partida com ?debug=0) e conferir a tabela' });
    if (c.fresh === false && !(Array.isArray(c.never) && c.never.length)) {
      const ativos = api.rotas?.find((r) => r.rota === 'online')?.chamadas?.find((x) => x.corpo)?.corpo || '';
      const online = /"online":(\d+)/.exec(ativos)?.[1];
      ach(A, {
        id: 'pipelines-parados', sonda: 'api', severidade: 'aviso', titulo: `sem linha recente em: ${(c.stale || []).join(', ')}`,
        causa: online === '0' || online === undefined ? 'provavelmente ninguém jogou na janela (online baixo) — ou ingestão parada' : `há ${online} online e mesmo assim nada gravou — suspeitar da ingestão`,
        evidencia: `health.fresh=false stale=${JSON.stringify(c.stale)} · /api/online=${ativos.slice(0, 80) || '—'}`,
        impacto: 'painel sem dado novo; se for ingestão, DAU medido cai sem o jogo ter caído (o "40 vs 1")',
        proximo: 'jogar uma partida de teste sem ?debug e re-sondar em 5 min: `match` continuar stale = ingestão quebrada',
      });
    }
  }
  if (api.healthBackend && hs?.corpo && api.healthBackend.corpo) {
    const a = hs.corpo; const b = api.healthBackend.corpo;
    if (a.database !== b.database || a.telemetrySchema !== b.telemetrySchema) ach(A, { id: 'health-site-vs-backend', sonda: 'api', severidade: 'medio', titulo: 'o health via site difere do health direto no backend', causa: 'proxy do site apontando para outro backend/revisão', evidencia: `site ${JSON.stringify(a)} · backend ${JSON.stringify(b)}`, impacto: 'cliente antigo (proxy) e novo (direto) veem estados diferentes', proximo: 'conferir PUBLIC_API_BASE na Vercel e apibase.js' });
  }
  for (const r of api.rotas || []) {
    if (r.padrao === 'inalcancavel') continue; // a rede de quem sondou: o health já virou achado inconclusivo
    if (r.padrao === 'sempre-falha') ach(A, { id: `rota-fora:${r.rota}`, sonda: 'api', severidade: r.rota === 'leaderboard' ? 'medio' : 'alto', titulo: `/api/${r.rota} falhou em ${r.total}/${r.total} chamadas`, causa: 'rota quebrada nesta revisão do backend ou upstream (banco) recusando', evidencia: r.chamadas.map((c) => c.status || c.erro).join(','), impacto: r.rota === 'online' ? 'contador "N online" vazio no menu' : r.rota === 'map-plays' ? 'partidas por mapa somem do menu' : 'ranking sem dados', proximo: 'logs do backend para a rota; comparar com a revisão anterior' });
    else if (r.padrao === 'sempre-4xx') ach(A, { id: `rota-4xx:${r.rota}`, sonda: 'api', severidade: 'alto', titulo: `/api/${r.rota} respondeu ${r.chamadas[0]?.status} em ${r.total}/${r.total} chamadas`, causa: 'rota removida/renomeada nesta revisão do backend, ou bloqueio por origem/chave (401/403)', evidencia: r.chamadas.map((c) => c.status || c.erro).join(','), impacto: r.rota === 'online' ? 'contador "N online" vazio no menu' : r.rota === 'map-plays' ? 'partidas por mapa somem do menu' : 'ranking sem dados', proximo: 'comparar as rotas do backend publicado com apibase.js; logs do backend para a rota' });
    else if (r.padrao === 'intermitente') ach(A, { id: `rota-intermitente:${r.rota}`, sonda: 'api', severidade: 'medio', titulo: `/api/${r.rota} falhou em ${r.cincoXx + r.semResposta}/${r.total} chamadas`, causa: 'cold start / instância do Cloud Run subindo (min-instances 0) ou rate limit', evidencia: `status: ${r.chamadas.map((c) => c.status || c.erro).join(',')} · p50 ${r.p50} ms · p95 ${r.p95} ms`, impacto: 'primeira carga do menu sem contador/estatística; ticket de MP pode falhar na 1ª tentativa', proximo: 'min-instances=1 no Cloud Run ou retry com backoff no cliente; medir de novo em horário de pico' });
    else if (r.p95 != null && r.p95 > LIMIARES.apiP95Ms) ach(A, { id: `latencia-api:${r.rota}`, sonda: 'api', severidade: 'aviso', titulo: `/api/${r.rota} com p95 de ${r.p95} ms (limiar ${LIMIARES.apiP95Ms} ms, sem procedência de pico)`, causa: 'backend frio ou consulta lenta no banco', evidencia: `latências: ${r.chamadas.map((c) => c.ms).join(',')} ms`, impacto: 'menu demora a preencher', proximo: 'medir em pico; se persistir, índice/cache na rota' });
  }
  const rs = api.redeSeguranca;
  if (rs && rs.status !== 404 && rs.status !== 0) ach(A, { id: 'rede-seguranca-rota-desconhecida', sonda: 'api', severidade: rs.status === 200 ? 'medio' : 'aviso', titulo: `rota /api inexistente respondeu ${rs.status}`, causa: '[rota].ts não está filtrando por MIGRADAS, ou o edge reescreve /api/* para outro lugar', evidencia: `GET /api/ops-diag-rota-inexistente → ${rs.status} ${rs.corpo || ''}`, impacto: 'cliente antigo pode bater em rota errada sem 404 claro', proximo: 'conferir src/pages/api/[rota].ts e rewrites do vercel.json' });
}

function explicaRanking(A, rk, ctx) {
  if (!rk) return;
  if (rk.flagErro) ach(A, { id: 'ranking-flag-nao-lida', sonda: 'ranking', severidade: 'alto', titulo: 'RANKING_ON não pôde ser lido da árvore', causa: 'src/lib/site.ts mudou de forma e a régua lê por regex (tools/ops/lib/repo.mjs)', evidencia: rk.flagErro, impacto: 'a sonda de ranking não compara nada: flag × backend × página ficam sem régua', proximo: 'ajustar `rankingLigado` ao formato novo — a mesma flag alimenta o site-smoke' });
  const lb = rk.leaderboard; const pg = rk.pagina;
  if (rk.flagLocal === false && lb && lb.status === 200 && !lb.desligado && lb.temLista) ach(A, { id: 'ranking-ligado-sem-flag', sonda: 'ranking', severidade: 'medio', titulo: 'leaderboard ligado no backend com RANKING_ON=false na árvore', causa: 'backend e site em versões diferentes da flag', evidencia: `RANKING_ON=false · /api/leaderboard 200 com lista`, impacto: 'site esconde o ranking que o backend ainda serve (ou vice-versa)', proximo: 'alinhar a flag nos dois repositórios no mesmo release' });
  if (rk.flagLocal === true && lb && lb.desligado) ach(A, { id: 'ranking-desligado-com-flag', sonda: 'ranking', severidade: 'alto', titulo: 'RANKING_ON=true mas /api/leaderboard diz disabled', causa: 'backend com ranking desligado (env/flag) enquanto o site promete ranking', evidencia: `RANKING_ON=true · /api/leaderboard → {"disabled":true}`, impacto: 'página de ranking vazia para quem clica', proximo: 'ligar no backend ou desligar a flag no site' });
  if (pg && pg.status !== 200 && pg.status !== 0) ach(A, { id: 'pagina-ranking-quebrada', sonda: 'ranking', severidade: 'alto', titulo: `/ranking respondeu ${pg.status}`, causa: 'SSR da página lendo o banco (service_role) e falhando — env ou coluna renomeada', evidencia: `GET /ranking → ${pg.status} em ${pg.ms} ms`, impacto: 'link do menu leva a erro', proximo: 'logs da função na Vercel; `npm run eval:site` reproduz o contrato' });
  if (pg && pg.status === 200 && pg.bytes === 0) ach(A, { id: 'pagina-ranking-vazia', sonda: 'ranking', severidade: 'alto', titulo: '/ranking respondeu 200 com 0 bytes', causa: 'função SSR entregando corpo vazio (caso do eval:ssr)', evidencia: 'GET /ranking → 200, 0 bytes', impacto: 'página em branco', proximo: '`npm run build && npm run eval:ssr`' });
}

function explicaAssetsRemoto(A, as, ctx) {
  if (!as) return;
  if (as.semResposta.length === as.total && as.total) return ach(A, { id: 'assets-inalcancaveis', sonda: 'assets', severidade: 'inconclusivo', titulo: 'nenhum asset respondeu', causa: 'rede/proxy bloqueando o alvo', evidencia: as.semResposta.slice(0, 3).join(' · '), impacto: 'não medido', proximo: 'rodar de uma rede sem proxy' });
  if (as.faltando.length) {
    const grupos = new Set(as.itens.filter((i) => as.faltando.includes(i.caminho)).map((i) => i.grupo));
    const vital = ['armas', 'personagens', 'anims', 'vendor', 'css'].some((g) => grupos.has(g));
    // a amostra vem da ÁRVORE: com produção atrás dela, 404 pode ser só asset ainda não publicado
    const arvoreAFrente = !!ctx.versaoRemota && !!ctx.versaoLocal && ctx.versaoRemota !== ctx.versaoLocal;
    ach(A, {
      id: 'asset-404', sonda: 'assets', severidade: arvoreAFrente ? 'aviso' : grupos.has('vendor') || grupos.has('css') ? 'critico' : vital ? 'alto' : 'medio',
      titulo: `${as.faltando.length} asset(s) da amostra em 404 no edge (${[...grupos].join(', ')})${arvoreAFrente ? ' — produção atrás da árvore' : ''}`,
      causa: arvoreAFrente ? `a amostra é da árvore (${ctx.versaoLocal}) e a produção serve ${ctx.versaoRemota}: pode ser asset novo ainda não publicado; se o caminho já existia, é o mesmo caso abaixo` : 'arquivo removido no prune-dist, renomeado sem o consumidor ou deploy incompleto (LICOES §12)',
      evidencia: as.faltando.slice(0, 6).join(' · '),
      impacto: grupos.has('armas') ? 'arma sem modelo: viewmodel/pickup somem sem erro no console' : grupos.has('personagens') ? 'personagem cai no fallback ou não aparece' : 'textura/prop em branco chapado',
      proximo: arvoreAFrente ? 'publicar e re-sondar; se persistir na mesma versão, seguir o caso de deploy incompleto' : 'conferir se o caminho existe em `dist/client` do build atual; se existir, purgar o edge; senão, o commit que removeu',
    });
  }
  if (as.conteudoErrado.length) ach(A, { id: 'asset-conteudo-errado', sonda: 'assets', severidade: 'alto', titulo: `${as.conteudoErrado.length} asset(s) com corpo que não é o formato esperado`, causa: 'edge/host devolvendo HTML (fallback/erro) ou arquivo truncado no lugar do asset', evidencia: as.conteudoErrado.slice(0, 5).join(' · '), impacto: 'parser do three falha na hora de usar: partida sem o modelo', proximo: 'baixar o arquivo com curl e olhar o começo; comparar com o do repo' });
  if (as.tamanhoDiverge.length) ach(A, { id: 'asset-tamanho-diverge', sonda: 'assets', severidade: 'medio', titulo: `${as.tamanhoDiverge.length} asset(s) com tamanho diferente do disco na MESMA versão`, causa: 'edge segurando arquivo de deploy anterior (immutable + mesmo ?v=) ou build alterando o asset (otimização)', evidencia: as.tamanhoDiverge.slice(0, 4).join(' · '), impacto: 'jogador recebe asset velho até o cache expirar', proximo: 'purge dos caminhos citados; se o build otimiza GLB, registrar isso na régua' });
  if (as.outrosErros.length) ach(A, { id: 'asset-erro-http', sonda: 'assets', severidade: 'medio', titulo: `${as.outrosErros.length} asset(s) com erro HTTP fora de 404`, causa: 'edge/origem instável (5xx) ou bloqueio (403)', evidencia: as.outrosErros.slice(0, 5).join(' · '), impacto: 'carga da partida falha de forma intermitente', proximo: 're-sondar; olhar status do Cloudflare/Vercel' });
  if (as.semResposta.length) ach(A, { id: 'asset-sem-resposta', sonda: 'assets', severidade: 'medio', titulo: `${as.semResposta.length} asset(s) sem resposta (timeout/rede)`, causa: 'edge lento para arquivo grande ou rede da sonda', evidencia: as.semResposta.slice(0, 4).join(' · '), impacto: 'carga longa; watchdog de boot pode acusar rede lenta', proximo: 're-sondar com timeout maior (`--timeout=30000`)' });
  if (as.p95ms != null && as.p95ms > LIMIARES.assetsP95Ms) ach(A, { id: 'assets-lentos', sonda: 'assets', severidade: 'aviso', titulo: `p95 de ${as.p95ms} ms para pedir 16 bytes de asset (limiar ${LIMIARES.assetsP95Ms} ms, sem procedência de pico)`, causa: 'cache do edge frio (MISS) ou origem longe', evidencia: `${as.cacheHits}/${as.total} com cf-cache-status HIT`, impacto: 'primeira partida depois de um deploy carrega devagar', proximo: 'aquecer o cache depois do deploy (pedir os GLB das armas) ou aceitar' });
}

function explicaBootLocal(A, bl, ctx) {
  if (!bl) return;
  if (bl.versaoPackage && bl.versaoJs && bl.versaoPackage !== bl.versaoJs) ach(A, { id: 'versao-local-desincronizada', sonda: 'boot-local', severidade: 'alto', titulo: `package.json diz ${bl.versaoPackage}, version.js diz ${bl.versaoJs}`, causa: 'bump manual sem sincronizar, ou release.yml interrompido', evidencia: `package.json=${bl.versaoPackage} · public/js/version.js=${bl.versaoJs}`, impacto: 'telemetria e cache-bust etiquetam versões diferentes na mesma build', proximo: '`node scripts/release.mjs` (ou o passo de sync do release.yml) antes de publicar' });
  const ia = bl.indexAstro || {};
  if (ia.temImportMap === false || ia.temMainJs === false) ach(A, { id: 'index-astro-sem-boot', sonda: 'boot-local', severidade: 'critico', titulo: 'index.astro sem import map ou sem o script do main.js', causa: 'edição no HTML do jogo apagou a cadeia de boot', evidencia: JSON.stringify(ia), impacto: 'o build publicaria um jogo morto', proximo: 'restaurar o bloco do import map e a tag `<script type="module" src="/js/main.js…">`' });
  if (ia.temColetorDeErros === false) ach(A, { id: 'index-astro-sem-coletor', sonda: 'boot-local', severidade: 'alto', titulo: 'index.astro sem o coletor de /api/jserror', causa: 'script inline de captura removido', evidencia: 'nenhum `/api/jserror` em src/pages/index.astro', impacto: 'crash em produção deixa de virar issue automática', proximo: 'restaurar o bloco inline do coletor' });
  if (ia.temOpsJs === false || bl.manifesto?.temOps === false) ach(A, { id: 'ops-runtime-nao-ligado', sonda: 'boot-local', severidade: 'info', titulo: 'ops.js não está ligado no index.astro/manifesto', causa: 'camada operacional ausente nesta árvore', evidencia: `temOpsJs=${ia.temOpsJs} · manifesto.temOps=${bl.manifesto?.temOps}`, impacto: 'sem métricas de sessão no navegador', proximo: 'incluir `<script type="module" src="/js/ops.js?v=…">` antes do main.js' });
  const c = bl.coerencia;
  if (c && c.problemas?.length) ach(A, { id: 'grafo-local-incoerente', sonda: 'boot-local', severidade: 'critico', titulo: `o grafo de módulos da ÁRVORE não fecha (${c.problemas.length} problema(s))`, causa: 'import nomeado de símbolo que o módulo alvo não exporta, ou módulo referenciado que não existe — quebraria o boot no deploy', evidencia: c.problemas.slice(0, 5).join(' · '), impacto: 'o próximo deploy morre no parse do main.js', proximo: 'corrigir o import/export citado antes de publicar; `npm run syntax` não pega isso' });
  else if (c && coerenciaNaoMedida(c)) ach(A, { id: 'coerencia-local-nao-medida', sonda: 'boot-local', severidade: 'inconclusivo', titulo: `coerência local não medida (prod-coherence ${c.exit == null ? 'não terminou' : `saiu ${c.exit} sem listar problema`})`, causa: 'prod-coherence.mjs explodiu ou não terminou contra o servidor local', evidencia: (c.saida || '').slice(-300) || 'prod-coherence não produziu saída', impacto: 'split-brain lógico passaria', proximo: 'rodar `node tools/eval/prod-coherence.mjs http://127.0.0.1:<porta>` contra um servidor local e ler o erro' });
}

function explicaAssetsLocal(A, al, ctx) {
  if (!al) return;
  if (al.faltando.length) {
    const grupos = new Set(al.itens.filter((i) => al.faltando.includes(i.caminho)).map((i) => i.grupo));
    ach(A, { id: 'asset-local-faltando', sonda: 'assets-local', severidade: ['armas', 'personagens', 'vendor', 'css', 'anims'].some((g) => grupos.has(g)) ? 'critico' : 'alto', titulo: `${al.faltando.length} asset(s) que o runtime pede não existem na árvore (${[...grupos].join(', ')})`, causa: 'id registrado (WEAPON_IDS/elenco) sem o arquivo, ou arquivo fora do git (LFS/pack privado não baixado)', evidencia: al.faltando.slice(0, 6).join(' · '), impacto: 'o deploy publicaria 404 para esses assets', proximo: 'restaurar o arquivo ou tirar o id do registro; `npm run assert:assets` para o pacote privado' });
  }
  if (al.conteudoErrado.length) ach(A, { id: 'asset-local-corrompido', sonda: 'assets-local', severidade: 'alto', titulo: `${al.conteudoErrado.length} asset(s) na árvore sem o cabeçalho esperado`, causa: 'arquivo truncado (checkout interrompido) ou ponteiro LFS no lugar do binário', evidencia: al.conteudoErrado.slice(0, 5).join(' · '), impacto: 'three falha ao parsear; partida sem o modelo', proximo: '`git checkout -- <arquivo>` e conferir `git lfs`/tamanho' });
}

function explicaPartidas(A, pt, ctx) {
  if (!pt) return;
  if (pt.fatal) return ach(A, { id: 'partida-nao-medida', sonda: 'partidas', severidade: 'alto', titulo: 'a partida sintética não subiu', causa: 'harness (tools/eval/harness.mjs) ou three vendorizado quebrados nesta árvore', evidencia: pt.fatal.slice(0, 300), impacto: 'régua cega: um crash de partida passaria', proximo: '`node tools/eval/harness.mjs`-dependentes (ex.: `npm run eval:bots`) para ver o erro completo' });
  if (pt.timeout) ach(A, { id: 'partida-travou', sonda: 'partidas', severidade: 'alto', titulo: 'a partida sintética estourou o tempo', causa: 'laço sem fim no update de algum mapa/modo ou build de mapa lento demais', evidencia: `worker morto por timeout; ${pt.partidas.length} partida(s) reportadas antes`, impacto: 'jogador veria a partida congelar', proximo: 'rodar `node tools/ops/probes/match-worker.mjs --mapas=<id>` por mapa para achar o culpado' });
  for (const p of pt.comErro || []) ach(A, { id: `partida-crash:${p.mapa}:${p.modo}`, sonda: 'partidas', severidade: 'critico', titulo: `crash em ${p.mapa} (${p.modo}) no update ${p.erros[0].update}`, causa: 'exceção no loop do Game — o mesmo crash que o jogador vê como partida congelada', evidencia: `${p.erros[0].mensagem} · ${p.erros[0].stack}`, impacto: `ninguém termina uma partida em ${p.mapa}/${p.modo}`, proximo: 'abrir com a skill bug-hunt: régua primeiro, depois o conserto; registrar em KNOWN-BUGS.md' });
  for (const p of pt.semLive || []) ach(A, { id: `partida-nao-comeca:${p.mapa}:${p.modo}`, sonda: 'partidas', severidade: 'alto', titulo: `${p.mapa} (${p.modo}) não saiu de ${p.estadoFinal} em ${p.updates} updates`, causa: 'countdown não termina (estado preso) ou round não inicia', evidencia: `estado final ${p.estadoFinal}, tempo de jogo ${p.tempoJogo}s`, impacto: 'jogador fica no countdown para sempre', proximo: 'inspecionar `_startRound`/countdown para o mapa' });
  for (const p of pt.semBots || []) ach(A, { id: `partida-sem-bots:${p.mapa}:${p.modo}`, sonda: 'partidas', severidade: 'medio', titulo: `${p.mapa} (${p.modo}) subiu sem bots`, causa: 'spawns do mapa/roster não preenchidos', evidencia: `bots=${p.bots}`, impacto: 'partida vazia', proximo: 'conferir spawns do mapa e o roster sorteado' });
}

function explicaNavegador(A, nav, ctx) {
  if (!nav) return;
  if (nav.indisponivel) return ach(A, { id: 'navegador-indisponivel', sonda: 'navegador', severidade: 'aviso', titulo: 'sonda de navegador não rodou', causa: nav.motivo || 'Playwright/Chromium não encontrados', evidencia: nav.motivo || '', impacto: 'sem prova de que o main.js AVALIA nem de FPS/falhas de carga', proximo: '`npm i -g playwright` (ou PLAYWRIGHT_MODULE=…) e CHROME_BIN apontando para um Chrome; ver docs/runbooks/operacao-autonoma.md' });
  if (nav.mainReady === false) ach(A, { id: 'boot-navegador-morto', sonda: 'navegador', severidade: 'critico', titulo: 'o main.js não terminou de avaliar no navegador', causa: nav.pageErrors?.length ? `exceção no boot: ${nav.pageErrors[0]}` : 'módulo não chegou (rede) ou travou antes de `__CS_MAIN_READY__`', evidencia: `mainLoaded=${nav.mainLoaded} mainReady=${nav.mainReady} erros=${(nav.pageErrors || []).slice(0, 2).join(' | ')}`, impacto: 'botão JOGAR inerte (o caso de 07/08)', proximo: '`npm run eval:boot` com Chrome real e o stack acima' });
  else if (nav.pageErrors?.length) ach(A, { id: 'excecao-no-navegador', sonda: 'navegador', severidade: 'alto', titulo: `${nav.pageErrors.length} exceção(ões) não tratadas no boot`, causa: 'erro de runtime fora do caminho crítico (o menu abriu)', evidencia: nav.pageErrors.slice(0, 3).join(' | '), impacto: 'funcionalidade parcial; vira issue crash-auto em produção', proximo: 'reproduzir com ?debug=1 e olhar o stack' });
  if (nav.btnJogar === false && nav.mainReady) ach(A, { id: 'btn-jogar-inerte', sonda: 'navegador', severidade: 'critico', titulo: '#btn-jogar sem onclick com main.js pronto', causa: 'o handler é atribuído no fim do main.js; ausência = avaliação interrompida ou DOM mudou de id', evidencia: 'document.getElementById("btn-jogar").onclick == null', impacto: 'ninguém entra na partida', proximo: '`npm run eval:boot` (B2)' });
  if (nav.webgl2 === false) ach(A, { id: 'sem-webgl2', sonda: 'navegador', severidade: nav.headless ? 'aviso' : 'alto', titulo: 'WebGL2 indisponível no navegador da sonda', causa: nav.headless ? 'headless sem GPU (SwiftShader desligado) — normal em CI' : 'driver/flags do navegador', evidencia: `webgl2=${nav.webgl2} webgl1=${nav.webgl1}`, impacto: nav.headless ? 'FPS não é medível nesta execução' : 'jogo cai no fallback sem WebGL', proximo: nav.headless ? 'rodar com `--gpu` ou Chrome real' : 'testar em outro navegador/driver' });
  if (nav.requestsFalhas?.length) ach(A, { id: 'recursos-falhando-no-boot', sonda: 'navegador', severidade: nav.requestsFalhas.some((r) => /\/js\/|\/vendor\//.test(r)) ? 'critico' : 'medio', titulo: `${nav.requestsFalhas.length} recurso(s) falharam durante o boot`, causa: '404/rede em asset ou módulo pedido pela página', evidencia: nav.requestsFalhas.slice(0, 5).join(' · '), impacto: 'módulo → boot morto; asset → branco chapado/sem som', proximo: 'cruzar com a sonda de assets e o deploy' });
  if (nav.consoleErros?.length) ach(A, { id: 'console-error-no-boot', sonda: 'navegador', severidade: 'medio', titulo: `${nav.consoleErros.length} console.error no boot`, causa: 'aviso do jogo (textura, áudio) ou erro engolido', evidencia: nav.consoleErros.slice(0, 3).join(' | '), impacto: 'vira linha no js_error e come cota de relatório (BUG-72)', proximo: 'ler cada um com ?debug=1' });
  const ops = nav.ops;
  if (ops?.recursos?.falhas?.length && !nav.requestsFalhas?.length) ach(A, { id: 'ops-falhas-de-carga', sonda: 'navegador', severidade: 'medio', titulo: `ops.js viu ${ops.recursos.falhas.length} falha(s) de carga`, causa: 'asset 404/rede durante a sessão', evidencia: ops.recursos.falhas.slice(0, 4).map((f) => `${f.caminho} ${f.status}`).join(' · '), impacto: 'asset ausente na partida', proximo: 'sonda de assets nos caminhos citados' });
  if (ops?.webgl?.perdidos > 0) ach(A, { id: 'ops-contexto-perdido', sonda: 'navegador', severidade: 'alto', titulo: `contexto WebGL perdido ${ops.webgl.perdidos}×`, causa: 'GPU/driver ou excesso de VRAM (roster inteiro carregado — preload-check)', evidencia: JSON.stringify(ops.webgl), impacto: 'tela congela até restaurar', proximo: 'eval:preload e orçamento de cena (eval:cena)' });
  if (ops?.fps?.amostras > 5 && ops.fps.p50 != null && ops.fps.p50 < 30 && !nav.headless) ach(A, { id: 'fps-baixo', sonda: 'navegador', severidade: 'medio', titulo: `FPS p50 ${ops.fps.p50} em partida`, causa: 'cena acima do orçamento ou GPU fraca da sonda', evidencia: `fps p50 ${ops.fps.p50} p5 ${ops.fps.p5} travadas>100ms ${ops.fps.travadas}`, impacto: 'jogabilidade abaixo do piso de 30 FPS', proximo: '`npm run eval:cena` no mapa medido' });
  if (nav.partida && nav.partida.chegouLive === false) ach(A, { id: 'partida-navegador-nao-comeca', sonda: 'navegador', severidade: 'critico', titulo: 'a partida automática (?auto=) não chegou a `live` no navegador', causa: nav.partida.erro || 'carregamento preso (GLB/textura) ou exceção no startGame', evidencia: JSON.stringify(nav.partida).slice(0, 300), impacto: 'ninguém joga', proximo: '`npm run eval:boot` e o watchdog de launch (índice `launch-watchdog` no js_error)' });
}
