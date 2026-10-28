/* ============================================================================
   economia-check.mjs — TRETA$ DA PARTIDA: REGRAS ESTILO CS, SEPARADAS DO MENU
   ----------------------------------------------------------------------------
   O dono decidiu (28/10): moeda de partida estilo CS, vale só naquela partida e
   NUNCA lê nem escreve o TRETA$ do menu (carteira/loja de skins, treta-store.js).
   Esta régua mede o módulo puro (public/js/economia-partida.js + compra-catalogo.js):

     EC1 saldo inicial 800
     EC2 recompensa por kill segue a classe do CS (faca > escopeta > SMG > fuzil > AWP),
         e toda arma de WEAPONS tem valor explícito (não saber = vermelho)
     EC3 fim de rodada: vitória 3250; derrota em sequência 1400→3400 e satura
     EC4 teto de 16000: nenhum crédito passa dele
     EC5 compra fora do tempo, fora do spawn, sem saldo, morto ou repetida é RECUSADA
         e não debita; compra válida debita o preço exato
     EC6 NaN/undefined em tempo ou distância recusa (compra nunca passa por omissão)
     EC7 arma assinatura do personagem tem desconto e continua paga
     EC8 kill-switch ?economia=0, modos especiais e MP desligam a economia
     EC9 isolamento do menu: (a) nenhum import do grafo alcança treta-store/rewards/
         catalog/account-entry nem cita /api/treta; (b) uma partida simulada de 15
         rodadas não escreve em localStorage nem chama fetch

   Mutantes (rodam sempre, cada um TEM de deixar a régua vermelha):
     sem-teto, sem-tempo, sem-zona, carteira-menu (creditar grava saldo no
     localStorage do menu), import-loja (o módulo importa treta-store.js).

   Uso: node tools/eval/economia-check.mjs
   ============================================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS = path.join(ROOT, 'public/js');
const { WEAPONS } = await import(pathToFileURL(path.join(JS, 'data/weapons.js')));
const PROIBIDOS = ['treta-store.js', 'treta-rewards.js', 'treta-catalog.js', 'account-entry.js'];

// grafo de import estático a partir do módulo (só caminhos relativos de public/js)
function grafo(arquivo, visto = new Set()) {
  if (visto.has(arquivo)) return visto;
  visto.add(arquivo);
  const src = fs.readFileSync(arquivo, 'utf8');
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]/g)) {
    const alvo = path.resolve(path.dirname(arquivo), m[1] || m[2]);
    if (fs.existsSync(alvo)) grafo(alvo, visto);
    else visto.add(alvo);   // import que não resolve também entra: o nome basta para reprovar
  }
  return visto;
}

async function medir(dir) {
  const rows = [];
  const check = (id, nome, pass, obs = {}) => rows.push({ id, nome, pass: !!pass, obs });
  const modPath = path.join(dir, 'economia-partida.js');

  // EC9a antes do import: um import proibido nem chega a rodar
  const nos = [...grafo(modPath)];
  const proibidos = nos.filter((f) => PROIBIDOS.includes(path.basename(f)));
  const citaApi = nos.filter((f) => fs.existsSync(f) && /\/api\/treta|localStorage/.test(fs.readFileSync(f, 'utf8')));
  check('EC9a', 'grafo de import longe da carteira do menu', !proibidos.length && !citaApi.length,
    { proibidos: proibidos.map((f) => path.basename(f)), citaApi: citaApi.map((f) => path.basename(f)) });

  let E, C;
  try {
    E = await import(pathToFileURL(modPath) + `?t=${Date.now()}`);
    C = await import(pathToFileURL(path.join(dir, 'compra-catalogo.js')) + `?t=${Date.now()}`);
  } catch (e) {
    check('EC0', 'módulo carrega', false, { erro: String(e.message).slice(0, 160) });
    return rows;
  }
  const { ECONOMIA } = E;

  check('EC1', 'saldo inicial 800', E.novaCarteira().saldo === 800 && ECONOMIA.saldoInicial === 800,
    { saldo: E.novaCarteira().saldo });

  const rk = (w) => E.recompensaKill(w);
  const semValor = Object.keys(WEAPONS).filter((w) => !C.itemDaCompra(w) && !(w in C.RECOMPENSA_FORA_DO_CATALOGO));
  check('EC2', 'kill paga por classe e toda arma tem valor',
    rk('knife') === 1500 && rk('shotgun') === 900 && rk('mp5') === 600 && rk('ak') === 300
    && rk('awp') === 100 && rk('knife') > rk('mp5') && rk('mp5') > rk('ak') && rk('ak') > rk('awp')
    && E.recompensaKill('ak', { mesmoTime: true }) === 0 && !semValor.length,
    { faca: rk('knife'), escopeta: rk('shotgun'), smg: rk('mp5'), fuzil: rk('ak'), awp: rk('awp'), semValor });

  const der = [1, 2, 3, 4, 5, 6, 9].map((n) => E.recompensaRodada('derrota', n));
  let seq = 0; const seqs = [];
  for (const r of ['derrota', 'derrota', 'vitoria', 'derrota']) { seq = E.proximaSequencia(seq, r); seqs.push(seq); }
  check('EC3', 'rodada: vitória 3250, derrota em sequência satura em 3400',
    E.recompensaRodada('vitoria', 3) === 3250 && der.join() === '1400,1900,2400,2900,3400,3400,3400'
    && seqs.join() === '1,2,0,1', { derrotas: der, seqs });

  const rica = { saldo: 15900 };
  const ganhou = E.creditar(rica, 3250);
  const r2 = { saldo: 16000 }; E.creditar(r2, 1500);
  check('EC4', 'teto 16000', rica.saldo === 16000 && ganhou === 100 && r2.saldo === 16000, { rica: rica.saldo, ganhou, r2: r2.saldo });

  const base = { id: 'ak', agora: 5, compraAte: 23, distSpawn: 2, vivo: true, possui: [] };
  const tenta = (extra, saldo = 4000) => { const c = { saldo }; const r = E.comprar(c, { ...base, ...extra }); return { ...r, saldo: c.saldo }; };
  const ok = tenta({});
  const recusas = {
    tempo: tenta({ agora: 23.01 }), zona: tenta({ distSpawn: ECONOMIA.raioCompraM + 0.01 }),
    saldo: tenta({}, 2699), morto: tenta({ vivo: false }), 'ja-tem': tenta({ possui: ['ak'] }), item: tenta({ id: 'colete' }),
  };
  const todasRecusadas = Object.entries(recusas).every(([m, r]) => !r.ok && r.motivo === m && r.saldo === (m === 'saldo' ? 2699 : 4000));
  check('EC5', 'compra fora de tempo/spawn/saldo recusada sem debitar; válida debita o preço',
    ok.ok && ok.preco === 2700 && ok.saldo === 1300 && todasRecusadas,
    { ok: { ok: ok.ok, saldo: ok.saldo }, recusas: Object.fromEntries(Object.entries(recusas).map(([k, r]) => [k, r.motivo || 'ACEITOU'])) });

  const nan = [tenta({ agora: NaN }), tenta({ compraAte: undefined }), tenta({ distSpawn: NaN })];
  check('EC6', 'NaN/undefined recusa', nan.every((r) => !r.ok && r.saldo === 4000), { motivos: nan.map((r) => r.motivo || 'ACEITOU') });

  const pa = E.precoDe('ak', { assinatura: 'ak' }), pm = E.precoDe('m4', { assinatura: 'ak' });
  check('EC7', 'assinatura com desconto e paga', pa > 0 && pa < 2700 && pa % 50 === 0 && pm === 2900, { ak: pa, m4: pm });

  const lig = (o) => E.economiaLigada(o);
  check('EC8', 'kill-switch, modos especiais e MP desligam',
    lig({}) && !lig({ busca: '?economia=0' }) && lig({ busca: '?economia=1' })
    && !lig({ wpnMode: 'awp' }) && !lig({ wpnMode: 'knife' }) && !lig({ wpnMode: 'pistols' })
    && !lig({ online: true }) && !lig({ dedicado: true }) && E.modoDeCompra({ semRodada: true }) === 'respawn'
    && E.modoDeCompra({}) === 'rodada');

  // EC9b: partida simulada com espiões em localStorage e fetch
  const escritas = [];
  // descritor (e não leitura direta): no Node 22+ ler globalThis.localStorage já avisa no stderr
  const lsAntes = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), fAntes = globalThis.fetch;
  const espiao = {
    getItem: (k) => { escritas.push(`get:${k}`); return null; },
    setItem: (k) => escritas.push(`set:${k}`), removeItem: (k) => escritas.push(`rm:${k}`), clear: () => escritas.push('clear'),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: espiao, configurable: true, writable: true });
  globalThis.fetch = (u) => { escritas.push(`fetch:${u}`); return Promise.resolve({ ok: true, json: async () => ({}) }); };
  try {
    const times = { E: 0, B: 0 };
    const gente = Array.from({ length: 10 }, (_, i) => ({ team: i % 2 ? 'B' : 'E', c: E.novaCarteira() }));
    const armas = Object.keys(WEAPONS);
    for (let r = 0; r < 15; r++) {
      for (const p of gente) for (const id of ['ak', 'mp5', 'awp', 'deagle']) E.comprar(p.c, { ...base, id, possui: [] });
      for (let k = 0; k < 20; k++) {
        const a = gente[k % 10], v = gente[(k * 3 + 1) % 10];
        E.creditar(a.c, E.recompensaKill(armas[k % armas.length], { mesmoTime: a.team === v.team }));
      }
      const venc = r % 3 ? 'E' : 'B';
      for (const t of ['E', 'B']) {
        const res = t === venc ? 'vitoria' : 'derrota';
        times[t] = E.proximaSequencia(times[t], res);
        for (const p of gente) if (p.team === t) E.creditar(p.c, E.recompensaRodada(res, times[t]));
      }
    }
  } finally {
    if (lsAntes) Object.defineProperty(globalThis, 'localStorage', lsAntes); else delete globalThis.localStorage;
    globalThis.fetch = fAntes;
  }
  check('EC9b', 'partida simulada não toca localStorage nem fetch', escritas.length === 0, { escritas: escritas.slice(0, 5) });
  return rows;
}

const MUTANTES = {
  'sem-teto': (s) => s.replace('Math.min(ECONOMIA.teto, antes + v)', 'antes + v'),
  'sem-tempo': (s) => s.replace("if (!(agora <= compraAte)) return 'tempo';", ''),
  'sem-zona': (s) => s.replace("if (!(distSpawn <= ECONOMIA.raioCompraM)) return 'zona';", ''),
  'carteira-menu': (s) => s.replace('  return carteira.saldo - antes;',
    "  globalThis.localStorage?.setItem('cs_treta_saldo', String(carteira.saldo));\n  return carteira.saldo - antes;"),
  'import-loja': (s) => s.replace("import { itemDaCompra", "import './treta-store.js';\nimport { itemDaCompra"),
};

const print = (rows) => rows.map((r) => `${r.pass ? 'ok ' : 'XX '} ${r.id} ${r.nome}${r.pass ? '' : ' ' + JSON.stringify(r.obs)}`).join('\n');
const real = await medir(JS);
console.log(print(real));
const falhaReal = real.filter((r) => !r.pass);

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'economia-mut-'));
const cegos = [];
try {
  const src = fs.readFileSync(path.join(JS, 'economia-partida.js'), 'utf8');
  for (const [nome, f] of Object.entries(MUTANTES)) {
    const mut = f(src);
    if (mut === src) throw new Error(`MUTANTE NÃO APLICOU: ${nome} — o texto de economia-partida.js mudou; atualize o mutante`);
    const dir = path.join(tmpBase, nome);
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'economia-partida.js'), mut);
    fs.copyFileSync(path.join(JS, 'compra-catalogo.js'), path.join(dir, 'compra-catalogo.js'));
    const rows = await medir(dir);
    const vermelhas = rows.filter((r) => !r.pass).map((r) => r.id);
    console.log(`mutante ${nome}: ${vermelhas.length ? 'VERMELHO (' + vermelhas.join(',') + ')' : 'VERDE — régua cega'}`);
    if (!vermelhas.length) cegos.push(nome);
  }
} finally {
  fs.rmSync(tmpBase, { recursive: true, force: true });
}

console.log(`\neconomia: ${real.length - falhaReal.length}/${real.length} verdes; mutantes cegos: ${cegos.length ? cegos.join(',') : 'nenhum'}`);
if (falhaReal.length || cegos.length) process.exitCode = 1;
