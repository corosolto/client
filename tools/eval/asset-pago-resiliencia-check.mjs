/* ASSET-PAGO-RESILIENCIA-CHECK — indisponibilidade de asset NÃO é crash de launch (#720/#736)
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTE

   Dois crashes de produção abertos pelo crash-fix.yml, com o mesmo formato:

     [paid-viewmodel] recoil.json Failed to fetch                        (alpha.19)
     [paid-viewmodel] general-runtime fetch for ".../general-runtime.glb?v=e902744227"
       responded with 522                                                  (alpha.17)

   MEDIDO no edge (02/10): os dois endpoints respondem 200 (~0,1–0,9 s) — a falha é
   INTERMITENTE, e a origem é a política de cache do asset privado:

     cache-control: max-age=0, must-revalidate   +   x-vercel-cache: HIT
     cf-cache-status: DYNAMIC

   Cada requisição revalida na ORIGEM. Quando a origem Vercel demora, o Cloudflare
   devolve 522 ao jogador; quando a conexão morre antes, vira `TypeError: Failed to
   fetch`. Nada disso é bug do jogo — e mesmo assim o `catch` chamava `console.error`,
   que o boot de `index.astro` intercepta e converte em linha no `js_error`
   (`reporta('console', …)`), abrindo issue pelo crash-fix.yml. Três consequências:

     1. indisponibilidade vira issue de CÓDIGO (classe errada, conserto errado);
     2. o jogador vê a tela de falha de lançamento por um `.json` de recuo faltando;
     3. meses de ruído: dezenas de issues de "crash" que ninguém reproduz.

   O QUE ESTA RÉGUA MEDE

   EXTRAI as funções reais de `public/js/authoredvm.js` (região marcada) e roda num `vm`
   com `fetch` e relógio (`setTimeout`) sob controle. O contrato real é:

     - `baixa()` é o call site: resposta `!ok` vira `Error`, e só aí o retry decide;
     - `pagoComRetry` tem TETO de tentativas e LANÇA o erro original ao esgotar;
     - quem degrada é o `.catch` do call site, via `degradouAssetPago` — `console.warn`
       + evento de analytics, nunca `console.error`.

     AR1  522 na 1ª tentativa, 200 na 2ª → RESOLVE (o retry funciona)
     AR2  522 sempre → 3 tentativas (teto) e o erro 522 original chega ao caller
     AR3  a degrada usa warn + evento, nunca console.error (não vira issue de código)
     AR4  404 (não transitório) NÃO é retried — repetir é boot desperdiçado
     AR5  teto por tentativa: fetch que nunca resolve ASSENTA (não segura o boot)
     AR6  o CATCH DO CALL SITE degrada sem console.error (o caminho que virava issue)

   MUTANTES (todos têm que reprovar a cláusula correspondente):
     semretry      uma tentativa só                    -> AR1
     semteto       remove o teto por tentativa         -> AR5
     consoleerror  degrada com console.error           -> AR3
     retenta404    retry em erro não transitório       -> AR4
     infinitas     tentativas ilimitadas               -> AR2

   uso: node tools/eval/asset-pago-resiliencia-check.mjs [--mutante=<nome>]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const VM = path.join(RAIZ, 'public/js/authoredvm.js');

const falhas = [];
const linhas = [];
const ok = (c, t, d) => linhas.push(`${c} · ${t}\n   ${d}\n   PASSA`);
const nok = (c, t, d) => { falhas.push(c); linhas.push(`${c} · ${t}\n   ${d}\n   FALHA`); };

/* Região marcada: `RÉGUA:asset-pago-resiliência início` … `fim`. Marcador explícito e não
   heurística: se o bloco mudar de forma a régua continua achando — e se o marcador sumir,
   AR0 acende em vez de a régua passar medindo nada. */
function regiao() {
  const src = fs.readFileSync(VM, 'utf8');
  const ini = src.indexOf('RÉGUA:asset-pago-resiliência início');
  const fim = src.indexOf('RÉGUA:asset-pago-resiliência fim');
  if (ini < 0 || fim < 0 || fim <= ini) return null;
  const dep = src.indexOf('*/', ini);
  return src.slice(src.indexOf('\n', dep) + 1, src.lastIndexOf('\n', fim));
}

const SRC = regiao();
if (!SRC) {
  nok('AR0', 'a região marcada existe em authoredvm.js', 'SEM MARCADOR — a régua não leu o código de produção');
  console.log(`\n${linhas.join('\n\n')}\n\nREPROVA (asset-pago-resiliencia-check) — AR0`);
  process.exit(1);
}
ok('AR0', 'a região marcada existe em authoredvm.js', `${SRC.split('\n').length} linhas extraídas do código real`);

/* ------------------------------------------------------------------ o banco de testes */
function banco(mutante = MUT) {
  let agora = 0;
  let seq = 0;
  const timers = new Map();
  const warns = [];
  const erros = [];
  const eventos = [];
  const pedidos = [];
  let plano = [];

  const sandbox = {
    console: {
      log() {}, warn(...a) { warns.push(a.join(' ')); }, error(...a) { erros.push(a.join(' ')); },
    },
    setTimeout(fn, ms) { const id = ++seq; timers.set(id, { t: agora + (ms || 0), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    Error, String, Number, Math, JSON, Map, Set, Promise, RegExp, isFinite,
    va: (...a) => eventos.push(a),          // `window.va` no código real (analytics)
    fetch(url) {
      pedidos.push(url);
      const passo = plano.shift();
      if (!passo) return Promise.reject(new TypeError('Failed to fetch'));
      /* `pendurar`: o fetch que NUNCA resolve nem rejeita — o caso real de socket morto.
         É o que o teto por tentativa tem de cortar. */
      if (passo.pendurar) return new Promise(() => {});
      return Promise.resolve({
        ok: passo.status >= 200 && passo.status < 300,
        status: passo.status,
        json: () => Promise.resolve(passo.corpo),
      });
    },
  };
  sandbox.globalThis = sandbox;
  /* `window` tem de ser o PRÓPRIO sandbox: o código real publica em `window.__pago`, e o vm
     precisa enxergar essa escrita no mesmo objeto que a régua testa. */
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);

  let fonte = SRC;
  if (mutante === 'semretry') {
    fonte = fonte.replace('tentativas = 3', 'tentativas = 1');
  } else if (mutante === 'infinitas') {
    /* MUTANTE: sem teto de tentativas — um 522 permanente vira loop de boot. */
    fonte = fonte.replace('tentativas = 3', 'tentativas = 9999');
  } else if (mutante === 'consoleerror') {
    /* MUTANTE: a degrada volta ao console.error — exatamente o caminho que transformou
       indisponibilidade de asset em issue de código (#720/#736). */
    fonte = fonte.replace(/console\.warn\(`\[vm-pago\][^\n]*\n/, "console.error('[paid-viewmodel]', texto);\n");
  } else if (mutante === 'retenta404') {
    /* MUTANTE: retry em QUALQUER erro, inclusive 404 (que nunca vai passar). Substitui a
       expressão inteira — um replace em regex aninhada é frágil e quebrar o script não é
       mutação, é defeito da régua. */
    fonte = fonte.replace(
      'if (tentativa >= tentativas || !REDE_TRANSITORIA.test(String(error?.message || error))) throw error;',
      'if (tentativa >= tentativas) throw error;',
    );
  } else if (mutante === 'semteto') {
    /* MUTANTE: sem teto por TENTATIVA — o `baixa()` pendurado segura o boot. Para o AR5
       reprovar, o stub precisa de uma resposta que NÃO VOLTA: `pendurar` devolve uma
       promessa parada, como um fetch de socket morto. */
    fonte = fonte.replace(/comTetoTentativa\(baixa\(\), tetoMs\)/, 'baixa()');
  }
  vm.runInContext(`${fonte}\nwindow.__pago = { pagoComRetry, degradouAssetPago };`, ctx);

  const corre = (ms) => {
    const alvo = agora + ms;
    for (;;) {
      let prox = null;
      for (const [id, t] of timers) if (t.t <= alvo && (!prox || t.t < prox[1].t)) prox = [id, t];
      if (!prox) break;
      timers.delete(prox[0]);
      agora = prox[1].t;
      prox[1].fn();
    }
    agora = alvo;
  };

  return {
    plano(respostas) { plano = respostas.slice(); },
    /* `baixa` reproduz o contrato REAL do call site: resposta !ok vira Error. Um stub que
       só resolve o Response mediria uma função que não existe no jogo. */
    carrega(asset, opcoes) {
      return sandbox.__pago.pagoComRetry(asset, () => sandbox.fetch('/private-assets/x').then((r) => {
        if (!r.ok) throw new Error(`fetch for "/private-assets/x" responded with ${r.status}`);
        return r.json();
      }), opcoes || {});
    },
    degrada(asset, erro) { return sandbox.__pago.degradouAssetPago(asset, erro); },
    avanca: corre,
    pendentes: () => timers.size,
    pedidos, warns, erros, eventos,
  };
}

/* O relógio do vm só anda quando a régua chama `avanca`: todo cenário precisa assentar em
   laçadas explícitas (avançar → deixar as microtarefas assentarem → repetir). */
async function assentar(b, passos, ms) {
  for (let i = 0; i < passos; i++) {
    b.avanca(ms);
    await new Promise((r) => setImmediate(r));
  }
}

const ALVO = { tetoMs: 10_000 };

/* AR1 — 522 na primeira, 200 na segunda: o retry RESOLVE. É o cenário real da origem
   lenta do Cloudflare, e o que o conserto precisa acertar. */
{
  const b = banco();
  b.plano([{ status: 522 }, { status: 200, corpo: { families: { ak: { recuo: 1 } } } }]);
  let resultado = 'pendente';
  b.carrega('recoil.json', ALVO).then((r) => { resultado = r; }).catch((e) => { resultado = `throw:${e.message}`; });
  await assentar(b, 10, 5_000);
  const resolveu = resultado && resultado.families;
  const d = `522 → 200   ${b.pedidos.length} tentativas   resultado ${resolveu ? 'familias carregadas' : resultado}`;
  if (resolveu && b.pedidos.length === 2) ok('AR1', '522 na 1ª tentativa, 200 na 2ª → resolve (o retry funciona)', d);
  else nok('AR1', '522 na 1ª tentativa, 200 na 2ª → resolve (o retry funciona)', d);
}

/* AR2 — 522 em TODA tentativa: o retry tem TETO e o erro ORIGINAL chega ao caller, que
   degrada para o viewmodel legado. O contrato de `pagoComRetry` é lançar ao esgotar. */
{
  const b = banco();
  b.plano([{ status: 522 }, { status: 522 }, { status: 522 }, { status: 522 }, { status: 522 }, { status: 522 }]);
  let resultado = 'pendente';
  b.carrega('recoil.json', ALVO)
    .then(() => { resultado = 'resolveu-mesmo-com-522'; })
    .catch((e) => { resultado = /responded with 522/.test(String(e.message)) ? 'erro-522-original' : `throw:${e.message}`; });
  await assentar(b, 20, 10_000);
  const d = `522 sempre   ${b.pedidos.length} tentativas (teto = 3)   desfecho ${resultado}`;
  if (resultado === 'erro-522-original' && b.pedidos.length === 3)
    ok('AR2', 'indisponibilidade persistente: teto de 3 tentativas e o erro original chega ao caller', d);
  else nok('AR2', 'indisponibilidade persistente: teto de 3 tentativas e o erro original chega ao caller', d);
}

/* AR3 — a degrada NÃO pode ser `console.error`: o boot intercepta console.error e vira
   linha no js_error → issue automática do crash-fix.yml. Este é o mutante que traz a
   issue de volta. */
{
  const b = banco();
  b.degrada('recoil.json', new Error('fetch for "/private-assets/x" responded with 522'));
  await assentar(b, 2, 1_000);
  const degradou = b.warns.some((w) => w.includes('vm-pago'));
  const evento = b.eventos.some((e) => JSON.stringify(e).includes('vm_degradado'));
  const sujo = b.erros.some((e) => e.includes('paid-viewmodel'));
  const d = `warn ${b.warns.length}   console.error ${b.erros.length}   evento analytics ${b.eventos.length}`;
  if (degradou && !sujo && evento) ok('AR3', 'a degrada usa warn + evento, nunca console.error (não vira issue de código)', d);
  else nok('AR3', 'a degrada usa warn + evento, nunca console.error (não vira issue de código)', d);
}

/* AR4 — 404 NÃO é transitório: repetir é boot desperdiçado. Uma tentativa só. */
{
  const b = banco();
  b.plano([{ status: 404 }, { status: 200, corpo: {} }, { status: 200, corpo: {} }]);
  let resultado = 'pendente', pedidosNoErro = 0;
  /* teto ALTO de propósito: a régua mede se o 404 é RETENTADO, e um teto curto dispara
     `stall:` no relógio falso antes do 404 chegar, medindo outra coisa. */
  b.carrega('recoil.json', { tetoMs: 600_000 }).then((r) => { resultado = `ok:${JSON.stringify(r)}`; })
    .catch((e) => { resultado = `throw:${e.message}`; pedidosNoErro = b.pedidos.length; });
  await assentar(b, 6, 1_000);
  const d = `404 (não transitório)   ${pedidosNoErro} tentativa(s) quando o erro chegou (esperado 1)   desfecho ${resultado}`;
  if (pedidosNoErro === 1) ok('AR4', 'erro não transitório (404) não é retried', d);
  else nok('AR4', 'erro não transitório (404) não é retried', d);
}

/* AR5 — teto por TENTATIVA. O fetch NUNCA resolve (nem rejeita): sem teto, a tentativa fica
   pendurada para sempre e o watchdog de lançamento (3 s no menu, 60 s na partida) estoura
   a tela do jogador. Com teto, cada tentativa estoura sozinha e a sequência assenta. */
{
  const b = banco();
  b.plano([{ pendurar: true }, { pendurar: true }, { pendurar: true }, { pendurar: true }]);
  let assentou = false;
  b.carrega('general-runtime.glb', { tetoMs: 10_000, tentativas: 2 })
    .then(() => { assentou = true; }).catch(() => { assentou = true; });
  await assentar(b, 20, 30_000);
  const d = `fetch pendurado (socket morto), 2 tentativas, 600 s de relógio falso   assentou ${assentou ? 'sim' : 'NÃO'}   timers pendentes ${b.pendentes()}`;
  if (assentou) ok('AR5', 'teto por tentativa: o fetch pendurado assenta e não segura o boot', d);
  else nok('AR5', 'teto por tentativa: o fetch pendurado assenta e não segura o boot', d);
}

/* AR6 — o ponto que os mutantes não alcançam: o CATCH DO CALL SITE. As cláusulas acima
   medem as funções da região; esta mede o código que as CHAMA, onde o `console.error`
   que vira issue de produção vivia. Sem ela, voltar o call site ao `console.error`
   antigo deixaria a régua 6/6 — que é exatamente o furo que esta cláusula cobre.
   O corpo vem do arquivo real por extração textual: `generalMotionsPromise = …` até o
   `;` que fecha a atribuição. */
{
  const src = fs.readFileSync(VM, 'utf8');
  const ini = src.indexOf('generalMotionsPromise = ');
  const fim = src.indexOf(';', src.indexOf('.catch(', ini));
  const corpo = ini >= 0 && fim > ini ? src.slice(ini, fim) : null;
  if (!corpo) {
    nok('AR6', 'o catch do call site degrada sem console.error', 'não consegui extrair o corpo de generalMotions');
  } else {
    const usaError = /console\.error\(/.test(corpo);
    const usaDegrade = /degradouAssetPago\(/.test(corpo);
    const d = `console.error ${usaError ? 'PRESENTE' : 'ausente'}   degradouAssetPago ${usaDegrade ? 'presente' : 'AUSENTE'}`;
    if (!usaError && usaDegrade) ok('AR6', 'o catch do call site degrada sem console.error (o caminho que virava issue)', d);
    else nok('AR6', 'o catch do call site degrada sem console.error (o caminho que virava issue)', d);
  }
}

console.log(`\n${linhas.join('\n\n')}\n`);
if (MUT) console.log(`mutante aplicado: --mutante=${MUT}\n`);
console.log(falhas.length === 0
  ? 'PASSA (asset-pago-resiliencia-check) — 7/7 cláusulas'
  : `REPROVA (asset-pago-resiliencia-check) — ${falhas.join(', ')}`);
process.exit(falhas.length === 0 ? 0 : 1);