/* ============================================================================
   telemetry-check.mjs — CONTRATO DE INGESTÃO E OBSERVABILIDADE DA TELEMETRIA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE (lei 3 da casa: régua que não morde não existe)
     A telemetria nova (feat/telemetria) só vale se o cliente de fato disparar os
     sendBeacon pros 4 endpoints e se o game.js contar abate por arma. Tudo isso é
     código que falha em SILÊNCIO: remover um `_funnel('match_start')` ou apagar a
     rota não dá erro de sintaxe nem de runtime — o dado simplesmente para de
     chegar e ninguém percebe. Este portão é o que transforma "esquecer" em vermelho.

   O QUE EXIGE (lê o fonte de produção, sem subir o jogo):
     · TL1  main.js dispara sendBeacon para os 4 endpoints novos:
             /api/match · /api/funnel · /api/perf · /api/acquisition
     · TL2  o funil está wired nos pontos que importam:
             land (carga) · match_start (startGame) · match_end (recordMatchStats) · quit
     · TL3  game.js tem o hook de abate por arma (`_wperf[weap]` incrementado no _kill)
     · TL4  as 4 rotas existem em src/pages/api/
     · TL5  funil tem sessionId nos dois lados (deduplicação)
     · TL6  partida envia eventId, versão e FACÇÃO, não lado E/B
     · TL7  cidade usa RPC atômica, sem read-modify-write em submit-match
     · TL8  /api/health existe e o prod-watch consulta a rota
     · TL10 /mapa agrega as cinco facções a partir dos eventos de partida
   · TL11 perf mede FPS EM PARTIDA (pós-live, com descanso) e preserva loadMs

   MUTAÇÃO (prova que morde):
     --mutante=sem-match    remove o endpoint /api/match do main.js in-memory → TL1 vermelha
     --mutante=sem-funil    remove _funnel('match_start') → TL2 vermelha
     --mutante=sem-arma     remove o hook _wperf do game.js → TL3 vermelha
     --mutante=sem-sessao   remove sessionId do cliente → TL5 vermelha
     --mutante=sem-saude    remove /api/health do prod-watch → TL8 vermelha
     --mutante=mapa-dois     remove a fonte de facções do mapa → TL10 vermelha
    --mutante=perf-no-live  mede fps na carga da página de novo → TL11 vermelha

   Uso: node tools/eval/telemetry-check.mjs [--mutante=sem-match|sem-funil|sem-arma]
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const read = (p) => readFileSync(p, 'utf8');

let main = read('public/js/main.js');
let game = read('public/js/game.js');
let funnelRoute = read('src/pages/api/funnel.ts');
let matchRoute = read('src/pages/api/match.ts');
let telemetryRoute = read('src/pages/api/telemetry.ts');
let submitRoute = read('src/pages/api/submit-match.ts');
let registerRoute = read('src/pages/api/register.ts');
let prodWatch = read('.github/workflows/prod-watch.yml');
let liveMap = read('src/pages/mapa.astro');

/* MUTAÇÃO in-memory: simula o defeito sem tocar no disco (o contrário seria o
 * portão verde com a mutação colada, que é exatamente o que a lei 3 reprova). */
if (MUT === 'sem-match')  main = main.replaceAll("'/api/match'", "'/api/REMOVIDO'");
if (MUT === 'sem-funil')  main = main.replaceAll("_funnel('match_start')", "/* removido */");
if (MUT === 'sem-arma')   game = game.replaceAll('this._wperf[weap]', '/* removido */');
if (MUT === 'sem-sessao') main = main.replaceAll('sessionId', 'sessaoRemovida');
if (MUT === 'sem-saude')  prodWatch = prodWatch.replaceAll('/api/health', '/api/REMOVIDO');
if (MUT === 'sem-uid')    main = main.replaceAll('uid: getAnonId()', 'uid: null');
if (MUT === 'mapa-dois')  liveMap = liveMap.replaceAll("from('match_event')", "from('stats')");
/* devolve o mundo em que o fps media o 1º segundo da página (jank de boot
   vendido como FPS de jogo — o que o painel do dono mostrava em 15/08) */
if (MUT === 'perf-no-live') main = main.replaceAll("setTimeout(() => _perfMedeFps(bootMs), 4000);", "_perfMedeFps(bootMs);");

const falhas = [];

// TL1 — os 4 endpoints novos são chamados pelo cliente.
const endpoints = ['/api/match', '/api/funnel', '/api/perf', '/api/acquisition'];
const faltam = endpoints.filter((e) => !main.includes(e));
if (faltam.length) falhas.push(`TL1 main.js NÃO chama: ${faltam.join(', ')}`);

// TL2 — funil wired nos 4 pontos de decisão (sem um, a conversão mente).
const funil = { land: "_funnel('land')", 'match_start': "_funnel('match_start')", 'match_end': "_funnel('match_end')", quit: "_funnel('quit')" };
const funilFalta = Object.entries(funil).filter(([, s]) => !main.includes(s)).map(([k]) => k);
if (funilFalta.length) falhas.push(`TL2 funil sem passo(s): ${funilFalta.join(', ')}`);

// TL3 — hook de abate por arma no _kill (sem ele, weapon_kills vem sempre vazio).
if (!game.includes('this._wperf[weap]')) falhas.push('TL3 game.js sem hook _wperf no _kill (weapon_kills nunca seria preenchido)');

// TL4 — as 4 rotas existem (sem rota, o sendBeacon vai pro vazio e o dado some).
const rotas = ['match', 'funnel', 'perf', 'acquisition'].map((r) => `src/pages/api/${r}.ts`);
const rotasFaltam = rotas.filter((r) => !existsSync(r));
if (rotasFaltam.length) falhas.push(`TL4 rota(s) ausente(s): ${rotasFaltam.join(', ')}`);

// TL5 — a mesma sessão acompanha o funil até a RPC que faz a deduplicação.
if (!main.includes('sessionId: getSessionId()') || !funnelRoute.includes('p_session_id'))
  falhas.push('TL5 funil sem sessionId ponta a ponta (pode contar reload/retry duas vezes)');

// TL6 — evento idempotente e dimensão de facção real (team E/B é só o lado da rodada).
if (!main.includes('eventId: _matchEventId') || !matchRoute.includes('p_event_id'))
  falhas.push('TL6 partida sem eventId ponta a ponta');
if (!main.includes('team: g.playerTeam') || !main.includes('faction: g.playerFaction || currentFaction') || !matchRoute.includes('p_faction'))
  falhas.push('TL6 evento não separa lado E/B da facção real');

// TL7 — nenhuma concorrência entre select e upsert no contador de cidades.
if (!telemetryRoute.includes("rpc('track_city_match'"))
  falhas.push('TL7 telemetria não chama incremento atômico de cidade');
if (/from\(['"]city_daily['"]\)[\s\S]{0,300}select\(/.test(submitRoute))
  falhas.push('TL7 submit-match voltou a fazer read-modify-write de city_daily');

// TL8 — observabilidade precisa medir produção, não só existir no repositório.
if (!existsSync('src/pages/api/health.ts') || !prodWatch.includes('/api/health'))
  falhas.push('TL8 health ausente ou fora do prod-watch');
if (!prodWatch.includes('node --input-type=module -'))
  falhas.push('TL8 probe usa top-level await sem modo ESM');

// TL9 - erros internos usam o UUID anônimo; nick não deve aparecer no log.
const submitComUid = (main.match(/uid: getAnonId\(\),\s*nick, token/g) || []).length >= 2;
if (!submitComUid || !submitRoute.includes("{ uid }") || !registerRoute.includes("{ uid }"))
  falhas.push('TL9 uid não acompanha register/submit até o log interno');
if (/logInternalError\([^\n]+\{[^\n]*nick/.test(submitRoute + registerRoute))
  falhas.push('TL9 log interno voltou a expor nick');

// TL10 - o mapa público usa a dimensão de facção e renderiza o catálogo canônico completo.
if (!liveMap.includes("from('match_event')") || !liveMap.includes('FACCOES.map') || !/urbanas:\s*'U'/.test(liveMap) || !/palhacos:\s*'C'/.test(liveMap) || !/funkeiros:\s*'F'/.test(liveMap))
  falhas.push('TL10 /mapa não agrega as cinco facções da telemetria');

// TL11 - o fps de /api/perf mede PARTIDA, não o parse da página (15/08: o painel
// "FPS P50" do dono media jank de boot — 98% < 30 FPS — porque a janela de rAF
// abria no 1º segundo de vida do módulo, com a main thread compilando shader).
// Três laços: (a) a janela só abre depois de state==='live'; (b) há um descanso
// entre o live e a medição (compile de shader sai da janela); (c) o sinal de
// carga do módulo sobrevive em loadMs (coluna que já existia morta na RPC).
if (!/state\s*!==\s*'live'/.test(main) || !main.includes('_perfMedeFps'))
  falhas.push('TL11 perf sem espera por state===live — fps volta a medir jank de boot, não partida');
if (!/setTimeout\(\(\)\s*=>\s*_perfMedeFps\(bootMs\),\s*4000\)/.test(main))
  falhas.push('TL11 medição de fps sem descanso pós-live — janela ainda pega compile de shader');
if (!main.includes('loadMs: _perfLoadMs'))
  falhas.push('TL11 payload sem loadMs — o sinal de carga do módulo (ex-bootMs) se perde');

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m TL1–TL11 ingestão wired, idempotente, atômica e monitorada');

// prova que a mutação morde: se veio --mutante e NÃO acendeu, o portão é cego.
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
console.log(falhas.length ? `\x1b[31mTELEMETRY ${falhas.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}` : '\x1b[32mTELEMETRY verde\x1b[0m');
if (falhas.length) process.exitCode = 1;
