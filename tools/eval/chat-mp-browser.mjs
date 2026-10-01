/* chat-mp-browser.mjs: O CHAT DE SALA DE PONTA A PONTA, COM NÓ E TRÊS NAVEGADORES.
   ===================================================================================
   As réguas do chat (#686) provam cada lado sozinho: eval:chat prova o módulo puro, o
   NetClient com socket falso e as guardas do jogo; o smoke Playwright prova o painel com um
   `net` falso; o chat-smoke do backend prova o nó com sockets crus. Nenhuma delas prova que
   o que A digita no painel chega ao painel de B pelo nó de verdade, com o rótulo que o
   servidor deu. Esta régua fecha esse vão: nó real com MP_CHAT=1, site real, três
   navegadores separados (A no time E, B no time B em toque, S espectador), sala criada pela
   tela, e cada frame gravado pelo `page.on('websocket')`.

   O QUE ELA MEDE (docs/chat-de-sala.md §11, cenários CE1..CE10 do plano)
     CE0  · o nó anuncia `chat` em /health e o welcome traz a meta (v:1, eu.h, epoca)
     CE1  · o chat de sala chega a todos com o rótulo do servidor; o nick do navegador
            (`nome=ALFA`) nunca aparece em frame nem no painel
     CE2  · o chat de time não gera nenhum frame para B nem para S
     CE3  · o chat do espectador chega só ao espectador durante a partida (aud:'espectadores')
     CE4  · o bloqueio feito pelo teclado esconde as linhas antigas e as futuras; desbloquear devolve
     CE5  · a denúncia dá `recebida` (e oferece bloquear) e depois `repetida`
     CE6  · a reconexão à mesma sala funciona; com --tickets o handle é o mesmo e o chat_hist
            traz só o que já tinha sido entregue àquela chave
     CE7  · a sala 2 não recebe nada da sala 1, e vice-versa
     CE8  · digitar www, espaço e clicar com o chat aberto não mexe nem atira (espiando
            sendInput e _tryShoot), e não aparece pausa
     CE9  · figuras em 5 viewports, fechado e aberto (mais a cena do espectador abrindo
            pelo CLIQUE em #hud-chat-sala, e o toque em #hud-chat-time no 844x390), com a geometria medida no DOM contra a
            ZONA_MIRA e o #crosshair (as figuras abertas são para olhar, lei 4); cada cena
            fecha pelo que o jogador tem: Esc no desktop e no toque com teclado (o Chromium
            sem Keyboard Lock engole o keydown do primeiro Esc, só o keyup chega), FECHAR no retrato
     CE10 · zero pageerror nos três navegadores

   MODO --tickets: o nó sobe com MP_TICKET_REQUIRED=1 e um segredo aleatório; a régua emite
   os tickets com o emitirMpTicket do backend (A com pid e nick, B e S anônimos) e injeta
   `ticket=` no WebSocket e o bearer no POST /rooms por addInitScript. O patch vive só aqui:
   o cliente em ?mp=1 continua sem pedir ticket. Prova o nick verificado (nk) e o histórico.

   USO
     node tools/eval/chat-mp-browser.mjs --backend=/caminho/do/backend        # sobe nó e site
     node tools/eval/chat-mp-browser.mjs --backend=... --tickets
     NO=localhost:9000 node tools/eval/chat-mp-browser.mjs                      # nó já no ar
     --porta=4321 (site) --no-porta=8787 --figuras=<pasta> --visivel=1 --so=CE1,CE2

   Figuras em JPEG (qualidade 60, no máximo 1280 px de largura): o orçamento de contexto de
   quem abre as figuras é finito, e a mira se vê igual. Manual, fora do check:fast: precisa
   de um nó, que é outro repositório. Roda à mão antes de fechar o PR e contra o canário.
   =================================================================================== */
import { spawn, execSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import path from 'node:path';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const BACKEND = val('backend', '');
const TICKETS = args.includes('--tickets');
const PORTA = Number(val('porta', 4321));
const NO_PORTA = Number(val('no-porta', 8787));
const NO = process.env.NO || `localhost:${NO_PORTA}`;
const BASE = `http://localhost:${PORTA}`;
const FIGURAS = val('figuras', 'test-results/chat-mp');
const VISIVEL = val('visivel', '0') === '1';
const SO = new Set((val('so', '') || '').split(',').filter(Boolean));
const CHROME = process.env.CHROME_BIN || '';
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MAIN_LOCAL = readFileSync(path.join(RAIZ, 'public/js/main.js'), 'utf8');
const REGIAO = 'br';
const SEGREDO = randomBytes(24).toString('base64url');

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };
const roda = (id) => !SO.size || SO.has(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(FIGURAS, { recursive: true });

const ident = {
  A: { uid: randomUUID(), playerId: '30000000-0000-4000-8000-00000000000a', nick: 'Rubao', nome: 'ALFA' },
  B: { uid: randomUUID(), nome: 'BRAVO' },
  S: { uid: randomUUID(), nome: 'SIGMA' },
  S2: { uid: randomUUID(), nome: 'IMPOSTOR' },
};
const NOMES_DO_NAVEGADOR = Object.values(ident).map((i) => i.nome);

/* ---------- nó e site ---------- */
const filhos = [];
const portasMinhas = [];
/* O astro dev se relança numa sessão própria, fora do grupo do npx: quem diz qual processo
   é o servidor é a porta. Só mata o que esta régua subiu (portasMinhas). */
const pidsNaPorta = (porta) => {
  try { return [...execSync(`ss -ltnpH "sport = :${porta}"`).toString().matchAll(/pid=(\d+)/g)].map((m) => Number(m[1])); }
  catch { return []; }
};
const matarFilhos = () => {
  for (const p of filhos) { try { process.kill(-p.pid, 'SIGTERM'); } catch { /* já morreu */ } }
  for (const porta of portasMinhas) for (const pid of pidsNaPorta(porta)) { try { process.kill(pid, 'SIGTERM'); } catch { /* já morreu */ } }
};
process.on('exit', matarFilhos);
process.on('SIGINT', () => { matarFilhos(); process.exit(130); });

let emitirMpTicket = null;
const ticket = (action, quem) => (TICKETS && emitirMpTicket
  ? emitirMpTicket({ node: REGIAO, action, uid: quem.uid, playerId: quem.playerId || null, nick: quem.nick || null, ttlSeconds: 60 }, SEGREDO)
  : '');

async function saude() { try { return await (await fetch(`http://${NO}/health`)).json(); } catch { return null; } }
async function sobeNo() {
  if (await saude()) throw new Error(`já existe um nó em ${NO}; com --backend a régua sobe o dela (use --no-porta=<livre>)`);
  const log = createWriteStream(path.join(FIGURAS, 'no.log'));
  const env = { ...process.env, PORT: String(NO_PORTA), REGIAO, MP_CHAT: '1', MP_TICKET_REQUIRED: TICKETS ? '1' : '0' };
  if (TICKETS) env.MP_TICKET_SECRET = SEGREDO; else delete env.MP_TICKET_SECRET;
  delete env.MP_METRICS_URL; delete env.MP_METRICS_TOKEN; delete env.MP_CHAT_REPORT_URL;
  const p = spawn('node', ['game/index.js'], { cwd: BACKEND, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.pipe(log); p.stderr.pipe(log);
  filhos.push(p);
  portasMinhas.push(NO_PORTA);
  const fim = Date.now() + 30_000;
  while (Date.now() < fim) {
    if (p.exitCode !== null) throw new Error(`o nó saiu com ${p.exitCode} (veja ${path.join(FIGURAS, 'no.log')})`);
    if (await saude()) return;
    await sleep(250);
  }
  throw new Error('o nó não respondeu /health em 30 s');
}
const arvoreCorreta = async () => {
  try { const r = await fetch(`${BASE}/js/main.js`); return r.ok && await r.text() === MAIN_LOCAL; } catch { return false; }
};
async function sobeSite() {
  try {
    if ((await fetch(`${BASE}/robots.txt`)).status) {
      if (await arvoreCorreta()) return;
      throw new Error(`a porta ${PORTA} já serve outra árvore; use --porta=<livre>`);
    }
  } catch (e) { if (/já serve outra árvore/.test(e.message)) throw e; }
  const log = createWriteStream(path.join(FIGURAS, 'astro.log'));
  const p = spawn('npx', ['astro', 'dev', '--port', String(PORTA)], { cwd: RAIZ, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.pipe(log); p.stderr.pipe(log);
  filhos.push(p);
  portasMinhas.push(PORTA);
  const fim = Date.now() + 90_000;
  while (Date.now() < fim) { if (await arvoreCorreta()) return; await sleep(700); }
  throw new Error(`o site não subiu em ${BASE}`);
}

/* ---------- gravação de frames por navegador ---------- */
const TIPOS = new Set(['welcome', 'partida', 'slot', 'chat', 'chat_report', 'chat_hist', 'chat_nack', 'chat_denuncia', 'error']);
function gravar(page, nome) {
  const reg = { nome, recebidos: [], enviados: [], erros: [], conexoes: 0 };
  page.on('pageerror', (e) => reg.erros.push(String(e && e.message || e)));
  page.on('websocket', (ws) => {
    reg.conexoes++;
    const guarda = (lista) => (f) => {
      if (typeof f.payload !== 'string') return;
      let m; try { m = JSON.parse(f.payload); } catch { return; }
      if (m && TIPOS.has(m.type)) lista.push(m);
    };
    ws.on('framereceived', guarda(reg.recebidos));
    ws.on('framesent', guarda(reg.enviados));
  });
  return reg;
}
async function esperar(lista, pred, ms = 3000, desde = 0) {
  const fim = Date.now() + ms;
  for (;;) {
    const m = lista.slice(desde).find(pred);
    if (m) return m;
    if (Date.now() > fim) return null;
    await sleep(50);
  }
}
const silencio = async (lista, pred, desde, ms = 1500) => (await esperar(lista, pred, ms, desde)) === null;
const chatCom = (txt) => (m) => m.type === 'chat' && m.txt === txt;
// só os frames do chat: o roster do welcome ainda leva o `nome` do navegador (doc §10, fora da v1)
const vazou = (reg) => JSON.stringify([...reg.recebidos, ...reg.enviados].filter((m) => m.type.startsWith('chat'))).match(new RegExp(NOMES_DO_NAVEGADOR.join('|'))) || null;

/* ---------- a tela, como o jogador usa ---------- */
function ferramentas(page) {
  const clica = async (sel) => {
    await page.waitForFunction((s) => !!document.querySelector(s), sel, { polling: 200 });
    await page.evaluate((s) => document.querySelector(s).click(), sel);
  };
  const clicaAte = async (sel, pronto, prazo = 60_000) => {
    const fim = Date.now() + prazo;
    for (;;) {
      await clica(sel);
      try { await page.waitForFunction(pronto, null, { timeout: 3000, polling: 200 }); return; }
      catch (e) { if (Date.now() > fim) throw e; }
    }
  };
  return { clica, clicaAte };
}

async function abrirMenuMultiplayer(page, nome) {
  const { clicaAte } = ferramentas(page);
  await page.goto(`${BASE}/?mp=1`, { waitUntil: 'commit', timeout: 90_000 }).catch(() => {});
  await page.waitForFunction(() => document.readyState !== 'loading' && !!document.getElementById('btn-jogar'), null, { timeout: 90_000, polling: 250 });
  await page.waitForFunction(() => {
    const pr = document.getElementById('splash-enter');
    return window.__CS_MAIN_READY__ && pr && !pr.classList.contains('hidden');
  }, null, { timeout: 120_000, polling: 250 });
  await page.evaluate(() => {
    const sp = document.getElementById('boot-splash');
    sp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    sp.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction(() => { const sp = document.getElementById('boot-splash'); return !sp || sp.classList.contains('gone'); }, null, { timeout: 60_000, polling: 250 });
  await clicaAte('#btn-profile', () => { const i = document.getElementById('nick-input'); return !!i && i.getClientRects().length > 0; });
  await page.evaluate((n) => {
    const i = document.getElementById('nick-input');
    i.value = n; i.dispatchEvent(new Event('input', { bubbles: true }));
  }, nome);
  await page.waitForFunction(() => { const b = document.getElementById('btn-jogar'); return b && b.onclick && b.getAttribute('aria-disabled') !== 'true'; }, null, { timeout: 90_000, polling: 250 });
  await clicaAte('#btn-jogar', () => !document.getElementById('main-menu')?.classList.contains('hidden') || !!document.querySelector('[data-act="mp"]'));
  await clicaAte('[data-act="mp"]', () => document.querySelectorAll('#mp-nos .mp-no, #mp-nos button').length > 0, 90_000);
  await page.waitForFunction(() => document.getElementById('mp-estado')?.dataset.s === 'on', null, { timeout: 60_000, polling: 250 });
}

async function criarSala(page, quem) {
  const { clica } = ferramentas(page);
  await page.evaluate(() => { document.querySelector('details.mp-criar')?.setAttribute('open', ''); });
  await page.evaluate((t) => {
    document.getElementById('mp-nome').value = 'REGUA DO CHAT';
    const ts = document.getElementById('mp-teamsize');
    ts.value = '1'; ts.dispatchEvent(new Event('change', { bubbles: true }));
    window.__tickets.create = t;
  }, ticket('create', quem));
  await clica('#mp-criar');
  await page.waitForSelector('#mp-modal:not(.hidden) #mp-modal-convite', { state: 'visible', timeout: 30_000 });
  const convite = await page.evaluate(() => document.getElementById('mp-modal-convite').textContent.trim());
  await page.keyboard.press('Escape');
  const fechado = () => document.getElementById('mp-modal').classList.contains('hidden');
  try { await page.waitForFunction(fechado, null, { polling: 200, timeout: 3000 }); }
  catch {
    // o pointerdown no pano de fundo é o outro jeito de fechar o aviso (a sala continua criada)
    await page.evaluate(() => document.getElementById('mp-modal').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForFunction(fechado, null, { polling: 200, timeout: 10_000 });
  }
  return convite;
}

/* Entra pela LISTA, como o jogador que escolhe o lado: `.mp-entrar[data-lado]` ou ASSISTIR. */
async function entrarNaSala(page, convite, lado, quem) {
  const { clica } = ferramentas(page);
  const fim = Date.now() + 60_000;
  const acha = () => page.evaluate(({ c, l }) => {
    const sala = [...document.querySelectorAll('#mp-salas .mp-sala')].find((d) => d.querySelector('.mp-convite-chip')?.textContent.trim() === c);
    const b = l === 'spec' ? sala?.querySelector('.mp-assistir') : sala?.querySelector(`.mp-entrar[data-lado="${l}"]`);
    return !!b && !b.disabled;
  }, { c: convite, l: lado });
  while (!(await acha())) {
    if (Date.now() > fim) throw new Error(`a sala ${convite} não apareceu na lista com vaga em ${lado}`);
    await clica('#mp-atualizar');
    await sleep(700);
  }
  await page.evaluate(({ c, l, t }) => {
    window.__tickets.connect = t;
    const sala = [...document.querySelectorAll('#mp-salas .mp-sala')].find((d) => d.querySelector('.mp-convite-chip')?.textContent.trim() === c);
    const b = l === 'spec' ? sala.querySelector('.mp-assistir') : sala.querySelector(`.mp-entrar[data-lado="${l}"]`);
    if (!b || b.disabled) throw new Error(`sem botão para ${l} na sala ${c}`);
    b.click();
  }, { c: convite, l: lado, t: ticket('connect', quem) });
  await page.waitForFunction(() => {
    const g = window.__game;
    return g && g._mp && g._mp.net && g._mp.net.connected && g.state === 'live' && !document.getElementById('chat-sala').hidden;
  }, null, { timeout: 120_000, polling: 250 });
  return page.evaluate(() => {
    const n = window.__game._mp.net;
    return { ent: n.yourEnt, team: n.yourTeam, espectador: !!n.espectador, meta: n.meta.chat, mapa: window.__game._mapId };
  });
}

/* Y/U só valem com o jogo em 'live' e sem pausa; o round dura 99 s e a virada cai no meio. */
const esperarLive = (page) => page.waitForFunction(() => { const g = window.__game; return !!g && g.state === 'live' && !g.paused; }, null, { timeout: 60_000, polling: 100 });
const aberto = (page) => page.evaluate(() => document.getElementById('chat-sala').classList.contains('aberto'));
async function abrirChat(page, tecla = 'y') {
  await esperarLive(page);
  const fim = Date.now() + 10_000;
  while (!(await aberto(page))) {
    await page.keyboard.press(tecla);
    await sleep(350);
    if (Date.now() > fim) throw new Error(`o chat não abriu com ${tecla}`);
  }
}
async function digitar(page, reg, tecla, texto) {
  await abrirChat(page, tecla);
  const desde = reg.enviados.length;
  await page.keyboard.type(texto);
  await page.keyboard.press('Enter');
  const saiu = await esperar(reg.enviados, (m) => m.type === 'chat' && m.txt === texto, 3000, desde);
  return saiu ? saiu.cid : null;
}
const linhas = (page) => page.evaluate(() => [...document.querySelectorAll('#chat-log .chat-linha')].map((l) => ({
  id: l.dataset.id, h: l.dataset.h, quem: l.querySelector('.chat-quem')?.textContent || '', txt: l.querySelector('.chat-txt')?.textContent || '',
  propria: l.classList.contains('propria'), hist: l.classList.contains('hist'),
})));

/* ---------- geometria (a mesma fórmula do smoke e da ZONA_MIRA de ui-check.mjs) ---------- */
function zonaMira(VW, VH) {
  const fovV = 70 * Math.PI / 180, asp = VW / VH;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * asp);
  const D = 13.7, H = 1.72, W = 0.259 * 1.72;
  const fracY = (2 * Math.atan((H / 2) / D)) / fovV;
  const fracX = Math.max((2 * Math.atan((W / 2) / D)) / fovH, (2 * 30) / VW);
  return { x0: (0.5 - fracX / 2) * VW, y0: (0.5 - fracY / 2) * VH, x1: (0.5 + fracX / 2) * VW, y1: (0.5 + fracY / 2) * VH };
}
const cruza = (a, b) => a && b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const geometria = (page) => page.evaluate(() => {
  const cx = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
  const sec = document.getElementById('chat-sala');
  const log = document.getElementById('chat-log');
  // o #chat-log recorta as linhas roladas para fora; a caixa dele é o que aparece na tela
  const els = [sec, ...sec.querySelectorAll('*'), document.getElementById('chat-toque')].filter((e) => e && e.getClientRects().length && !(log && log !== e && log.contains(e)));
  const caixas = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    caixas.push({ nome: e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}.${e.className}`, ...cx(r) });
  }
  const mira = document.getElementById('crosshair');
  const cs = getComputedStyle(sec);
  return {
    caixas, mira: mira && mira.getClientRects().length ? cx(mira.getBoundingClientRect()) : null, VW: innerWidth, VH: innerHeight,
    linhas: sec.querySelectorAll('.chat-linha').length, fonte: getComputedStyle(document.getElementById('chat-entrada')).fontSize, zIndex: cs.zIndex,
    touchUi: (() => { const t = document.getElementById('touch-ui'); return t ? { classe: t.className, visivel: t.getClientRects().length > 0 && getComputedStyle(t).display !== 'none' } : null; })(),
  };
});
function cobrarGeometria(g, rotulo) {
  const zona = zonaMira(g.VW, g.VH);
  const foraDaTela = g.caixas.filter((c) => !(c.x0 >= -1 && c.y0 >= -1 && c.x1 <= g.VW + 1 && c.y1 <= g.VH + 1));
  const naZona = g.caixas.filter((c) => cruza(c, zona));
  const naMira = g.mira ? g.caixas.filter((c) => cruza(c, g.mira)) : [];
  cobra(g.caixas.length > 0 && !foraDaTela.length, `CE9 · ${rotulo}: ${g.caixas.length} caixas cabem em ${g.VW}x${g.VH}${foraDaTela[0] ? ` (fora: ${foraDaTela[0].nome} ${JSON.stringify(foraDaTela[0])})` : ''}`);
  cobra(!naZona.length, `CE9 · ${rotulo}: nada cruza a ZONA_MIRA ${JSON.stringify(zona).replace(/\.\d+/g, '')}${naZona[0] ? ` (cruza: ${naZona[0].nome})` : ''}`);
  cobra(!g.mira || !naMira.length, `CE9 · ${rotulo}: nada cruza o #crosshair${g.mira ? '' : ' (sem #crosshair na tela)'}${naMira[0] ? ` (cruza: ${naMira[0].nome})` : ''}`);
  const painel = g.caixas.find((c) => c.nome === '#chat-sala');
  console.log(`         painel ${painel ? `x ${Math.round(painel.x0)}..${Math.round(painel.x1)} y ${Math.round(painel.y0)}..${Math.round(painel.y1)}` : 'sem caixa'} · fonte do campo ${g.fonte} · z ${g.zIndex}${g.touchUi ? ` · #touch-ui ${g.touchUi.visivel ? 'visível' : 'oculto'} (${g.touchUi.classe || 'sem classe'})` : ''}`);
}
/* JPEG de no máximo 1280 px de largura: a redução é feita pelo próprio navegador num canvas. */
async function foto(page, nome) {
  const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
  const b64 = await page.evaluate(async (b) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${b}`;
    await img.decode();
    if (img.width <= 1280) return null;
    const c = document.createElement('canvas');
    c.width = 1280; c.height = Math.round(img.height * 1280 / img.width);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.6).split(',')[1];
  }, buf.toString('base64'));
  const arq = path.join(FIGURAS, `${nome}.jpg`);
  writeFileSync(arq, b64 ? Buffer.from(b64, 'base64') : buf);
  return arq;
}

/* setViewportSize recusa quando a janela do headless ficou em estado não-normal
   ("Browser.setWindowBounds: restore it to normal state first"): cai na emulação do CDP,
   que troca a viewport sem mexer na janela. */
async function redimensionar(pg, w, h) {
  try { await pg.setViewportSize({ width: w, height: h }); return; }
  catch { /* janela em estado não-normal: emula a viewport por CDP */ }
  try {
    const s = await pg.context().newCDPSession(pg);
    await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  } catch (e) { throw new Error(`nem setViewportSize nem CDP emularam ${w}x${h}: ${e.message}`); }
}

/* ---------- patch de ticket, só no navegador da régua ---------- */
const INIT_TICKETS = () => {
  window.__tickets = { connect: '', create: '' };
  const WS0 = window.WebSocket;
  const Patch = function (url, protocols) {
    let u = String(url);
    if (/^wss?:\/\/(?:localhost|127\.0\.0\.1):\d+\/ws/.test(u) && window.__tickets.connect) {
      u += `${u.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(window.__tickets.connect)}`;
      window.__tickets.connect = '';
    }
    return protocols === undefined ? new WS0(u) : new WS0(u, protocols);
  };
  Patch.prototype = WS0.prototype;
  Object.assign(Patch, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = Patch;
  const f0 = window.fetch;
  window.fetch = (input, init) => {
    const u = typeof input === 'string' ? input : input && input.url;
    if (init && init.method === 'POST' && /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/rooms$/.test(String(u)) && window.__tickets.create) {
      init = { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${window.__tickets.create}` } };
      window.__tickets.create = '';
    }
    return f0(input, init);
  };
};

/* ---------- a régua ---------- */
const navegadores = [];
try {
  if (BACKEND) {
    emitirMpTicket = (await import(pathToFileURL(path.join(BACKEND, 'api/_lib/mp-ticket.mjs')).href)).emitirMpTicket;
    await sobeNo();
  } else if (TICKETS) {
    throw new Error('--tickets precisa de --backend (a régua emite os tickets com o segredo que dá ao nó)');
  }
  const h = await saude();
  if (!h?.ok) { console.error(`x CE0  nenhum nó em ${NO}. Passe --backend=<clone do backend> ou suba um com MP_CHAT=1`); process.exit(1); }
  cobra(Array.isArray(h.features) && h.features.includes('chat'), `CE0 · /health anuncia chat (features ${JSON.stringify(h.features)})`);
  await sobeSite();

  let pw;
  try { pw = await import('playwright'); }
  catch { pw = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.js`).href); }
  const chromium = pw.chromium || pw.default?.chromium;
  const lancar = () => chromium.launch({
    headless: !VISIVEL,
    ...(CHROME ? { executablePath: CHROME } : {}),
    args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required'],
  });
  // três navegadores SEPARADOS (três processos), não três abas: sessionStorage e foco não se misturam
  const [brA, brB, brS] = await Promise.all([lancar(), lancar(), lancar()]);
  navegadores.push(brA, brB, brS);
  const pgA = await brA.newPage({ viewport: { width: 1600, height: 900 } });
  const ctxB = await brB.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const pgB = await ctxB.newPage();
  const pgS = await brS.newPage({ viewport: { width: 1280, height: 800 } });
  const paginas = { A: pgA, B: pgB, S: pgS };
  const regs = {};
  for (const [k, pg] of Object.entries(paginas)) {
    pg.setDefaultTimeout(60_000);
    pg.setDefaultNavigationTimeout(90_000);
    await pg.addInitScript(INIT_TICKETS);
    regs[k] = gravar(pg, k);
  }

  await Promise.all([abrirMenuMultiplayer(pgA, ident.A.nome), abrirMenuMultiplayer(pgB, ident.B.nome), abrirMenuMultiplayer(pgS, ident.S.nome)]);
  const convite = await criarSala(pgA, ident.A);
  console.log(`  sala ${convite} (teamSize 1)`);
  const inA = await entrarNaSala(pgA, convite, 'E', ident.A);
  const inB = await entrarNaSala(pgB, convite, 'B', ident.B);
  const inS = await entrarNaSala(pgS, convite, 'spec', ident.S);
  cobra(inA.team === 'E' && inB.team === 'B' && inS.espectador && inS.ent == null,
    `CE0 · A no time ${inA.team}, B no time ${inB.team}, S espectador (${inS.espectador}) no mapa ${inA.mapa}`);
  const metaA = inA.meta, metaB = inB.meta, metaS = inS.meta;
  cobra(metaA?.v === 1 && /^[2-9A-HJKMNP-Z]{3,5}$/.test(metaA?.eu?.h || '') && typeof metaA?.epoca === 'string' && metaA.epoca === metaB?.epoca && metaA.epoca === metaS?.epoca,
    `CE0 · a meta do welcome tem v:1, handle no alfabeto do convite e a mesma época para os três (h de A: ${metaA?.eu?.h})`);
  cobra(TICKETS ? metaA?.eu?.nk === ident.A.nick && !metaB?.eu?.nk && !metaS?.eu?.nk : !metaA?.eu?.nk,
    TICKETS ? `CE0 · com tickets, só A (pid + nick) leva nk (${metaA?.eu?.nk}); B e S anônimos não` : 'CE0 · sem ticket ninguém tem nk');
  const hA = metaA.eu.h, hS = metaS.eu.h;
  const rotuloA = TICKETS ? new RegExp(`^${ident.A.nick} \\S$`) : new RegExp(`^Anônimo #${hA}$`);

  let idA1 = null;
  if (roda('CE1')) {
    const desde = { A: regs.A.recebidos.length, B: regs.B.recebidos.length, S: regs.S.recebidos.length };
    const cid = await digitar(pgA, regs.A, 'y', 'oi galera, chat de sala');
    const ecoA = await esperar(regs.A.recebidos, chatCom('oi galera, chat de sala'), 4000, desde.A);
    const emB = await esperar(regs.B.recebidos, chatCom('oi galera, chat de sala'), 4000, desde.B);
    const emS = await esperar(regs.S.recebidos, chatCom('oi galera, chat de sala'), 4000, desde.S);
    idA1 = ecoA?.id ?? null;
    cobra(!!cid && ecoA && ecoA.cid === cid && ecoA.h === hA && ecoA.aud === 'todos' && ecoA.time === 'E' && ecoA.esp === 0,
      `CE1 · o eco volta a A com o cid (${cid}), h ${ecoA?.h}, aud ${ecoA?.aud}, time ${ecoA?.time}`);
    cobra(emB && emS && emB.id === ecoA?.id && emS.id === ecoA?.id && emB.h === hA && emS.h === hA && !('cid' in emB) && !('cid' in emS),
      `CE1 · B e S recebem a mesma mensagem (id ${emB?.id}) com o handle do servidor e sem cid`);
    cobra(TICKETS ? emB?.nk === ident.A.nick : !('nk' in (emB || {})) || emB.nk == null, TICKETS ? 'CE1 · o nk verificado de A viaja no frame' : 'CE1 · sem ticket o frame não leva nk');
    const lB = await linhas(pgB);
    const linhaB = lB.find((l) => l.id === String(ecoA?.id));
    cobra(!!linhaB && rotuloA.test(linhaB.quem) && linhaB.txt === 'oi galera, chat de sala' && !linhaB.propria,
      `CE1 · no painel de B a linha mostra o rótulo do servidor ("${linhaB?.quem}"), não o nick do navegador`);
    const lA = await linhas(pgA);
    cobra(lA.some((l) => l.id === String(ecoA?.id) && l.propria), 'CE1 · no painel de A a própria linha está marcada como própria');
    const v = ['A', 'B', 'S'].map((k) => vazou(regs[k])).filter(Boolean);
    cobra(!v.length, `CE1 · nenhum frame dos três navegadores contém ALFA, BRAVO ou SIGMA${v.length ? ` (achou ${v[0][0]})` : ''}`);
    const textoPaineis = await Promise.all(Object.values(paginas).map((p) => p.evaluate(() => document.getElementById('chat-log').textContent)));
    cobra(!textoPaineis.some((t) => /ALFA|BRAVO|SIGMA/.test(t)), 'CE1 · nenhum painel desenha o nick do navegador');
  }

  if (roda('CE2')) {
    const desde = { A: regs.A.recebidos.length, B: regs.B.recebidos.length, S: regs.S.recebidos.length };
    const cid = await digitar(pgA, regs.A, 'u', 'time, so o E ve isso');
    const ecoA = await esperar(regs.A.recebidos, chatCom('time, so o E ve isso'), 4000, desde.A);
    cobra(!!cid && ecoA && ecoA.ch === 'time' && ecoA.aud === 'time', `CE2 · o chat de time volta a A com aud time (id ${ecoA?.id})`);
    const [sB, sS] = await Promise.all([silencio(regs.B.recebidos, chatCom('time, so o E ve isso'), desde.B), silencio(regs.S.recebidos, chatCom('time, so o E ve isso'), desde.S)]);
    cobra(sB && sS, 'CE2 · nenhum frame do chat de time chega a B (outro time) nem a S (espectador)');
    cobra((await linhas(pgB)).every((l) => l.txt !== 'time, so o E ve isso'), 'CE2 · o painel de B não desenha a linha de time');
  }

  if (roda('CE3')) {
    const desde = { A: regs.A.recebidos.length, B: regs.B.recebidos.length, S: regs.S.recebidos.length };
    await abrirChat(pgS, 'u');
    const canalS = await pgS.evaluate(() => ({ txt: document.getElementById('chat-canal').textContent, desligado: document.getElementById('chat-canal').disabled, aviso: document.getElementById('chat-aviso').textContent }));
    cobra(canalS.desligado && /sala/i.test(canalS.txt), `CE3 · para o espectador U cai no canal sala e o botão de canal fica desligado ("${canalS.txt}", aviso "${canalS.aviso}")`);
    await pgS.keyboard.press('Escape');
    const cid = await digitar(pgS, regs.S, 'y', 'olho de fora');
    const ecoS = await esperar(regs.S.recebidos, chatCom('olho de fora'), 4000, desde.S);
    cobra(!!cid && ecoS && ecoS.aud === 'espectadores' && ecoS.esp === 1 && ecoS.time === null && ecoS.h === hS,
      `CE3 · o eco do espectador volta com aud ${ecoS?.aud}, esp ${ecoS?.esp}, time ${ecoS?.time}`);
    const [sA, sB] = await Promise.all([silencio(regs.A.recebidos, chatCom('olho de fora'), desde.A), silencio(regs.B.recebidos, chatCom('olho de fora'), desde.B)]);
    cobra(sA && sB, 'CE3 · com a partida rodando, o texto do espectador não chega a A nem a B');
  }

  if (roda('CE4')) {
    const desdeS = regs.S.recebidos.length;
    await digitar(pgA, regs.A, 'y', 'antes do bloqueio');
    await esperar(regs.S.recebidos, chatCom('antes do bloqueio'), 4000, desdeS);
    await abrirChat(pgS, 'y');
    let foco = null;
    for (let i = 0; i < 12 && foco !== hA; i++) {
      await pgS.keyboard.press('ArrowUp');
      foco = await pgS.evaluate(() => document.activeElement?.classList.contains('chat-linha') ? document.activeElement.dataset.h : null);
    }
    cobra(foco === hA, `CE4 · ArrowUp percorre o log e chega a uma linha de A (data-h ${foco})`);
    await pgS.keyboard.press('Enter');
    const acoes = await pgS.evaluate(() => ({ visivel: !document.getElementById('chat-acoes').hidden, foco: document.activeElement?.id }));
    cobra(acoes.visivel && acoes.foco === 'chat-bloquear', `CE4 · Enter abre as ações com o foco em BLOQUEAR (${acoes.foco})`);
    await pgS.keyboard.press('Enter');
    await sleep(150);
    const depois = await linhas(pgS);
    cobra(!depois.some((l) => l.h === hA), `CE4 · depois de bloquear pelo teclado nenhuma linha de A fica no log de S (${depois.length} linhas)`);
    const desde2 = regs.S.recebidos.length;
    await digitar(pgA, regs.A, 'y', 'depois do bloqueio');
    const chegou = await esperar(regs.S.recebidos, chatCom('depois do bloqueio'), 4000, desde2);
    await sleep(200);
    const depois2 = await linhas(pgS);
    cobra(!!chegou && !depois2.some((l) => l.txt === 'depois do bloqueio'),
      'CE4 · a mensagem seguinte de A chega no socket de S (o nó não sabe do bloqueio) e não é desenhada');
    await abrirChat(pgS, 'y');
    await pgS.evaluate(() => document.getElementById('chat-bloqueados').click());
    const lista = await pgS.evaluate(() => ({ visivel: !document.getElementById('chat-lista-bloqueados').hidden, txt: document.getElementById('chat-lista-bloqueados-ul').textContent }));
    cobra(lista.visivel && lista.txt.includes(`#${hA}`), `CE4 · a lista BLOQUEADOS mostra #${hA}`);
    await pgS.evaluate(() => document.querySelector('#chat-lista-bloqueados-ul button')?.click());
    await sleep(150);
    const devolvidas = await linhas(pgS);
    cobra(devolvidas.filter((l) => l.h === hA).length >= 3, `CE4 · desbloquear devolve as linhas de A ao log (${devolvidas.filter((l) => l.h === hA).length})`);
    await pgS.evaluate(() => document.getElementById('chat-lista-fechar').click());
    await pgS.keyboard.press('Escape');
  }

  if (roda('CE5')) {
    const alvo = (await linhas(pgS)).find((l) => l.h === hA && l.txt === 'antes do bloqueio') || (await linhas(pgS)).find((l) => l.h === hA);
    const denunciar = async () => {
      const desde = regs.S.recebidos.length;
      await abrirChat(pgS, 'y');
      await pgS.evaluate((id) => document.querySelector(`#chat-log .chat-linha[data-id="${id}"]`).click(), alvo.id);
      await pgS.evaluate(() => document.getElementById('chat-denunciar').click());
      const motivos = await pgS.evaluate(() => ({ visivel: !document.getElementById('chat-motivos').hidden, radios: document.querySelectorAll('#chat-motivos input[type="radio"]').length, livre: document.querySelectorAll('#chat-motivos textarea, #chat-motivos input[type="text"]').length }));
      await pgS.evaluate(() => { const r = document.querySelector('#chat-motivos input[value="spam"]'); r.checked = true; document.getElementById('chat-motivos-enviar').click(); });
      const resp = await esperar(regs.S.recebidos, (m) => m.type === 'chat_denuncia' && m.id === Number(alvo.id), 4000, desde);
      return { motivos, resp };
    };
    const um = await denunciar();
    cobra(um.motivos.visivel && um.motivos.radios === 5 && um.motivos.livre === 0, `CE5 · a denúncia oferece 5 motivos e nenhum texto livre`);
    cobra(um.resp?.estado === 'recebida', `CE5 · a primeira denúncia da mensagem ${alvo?.id} volta "${um.resp?.estado}"`);
    await sleep(150);
    const oferta = await pgS.evaluate(() => ({ visivel: !document.getElementById('chat-bloquear-tambem').hidden, aviso: document.getElementById('chat-aviso').textContent }));
    cobra(oferta.visivel, `CE5 · depois de recebida o painel oferece "Bloquear também" (aviso "${oferta.aviso}")`);
    const enviada = regs.S.enviados.filter((m) => m.type === 'chat_report');
    cobra(enviada.length >= 1 && enviada.at(-1).motivo === 'spam' && Object.keys(enviada.at(-1)).sort().join() === 'id,motivo,type', `CE5 · o chat_report leva só id e motivo (${JSON.stringify(enviada.at(-1))})`);
    await pgS.keyboard.press('Escape');
    const dois = await denunciar();
    cobra(dois.resp?.estado === 'repetida', `CE5 · a segunda denúncia da mesma mensagem volta "${dois.resp?.estado}"`);
    await pgS.keyboard.press('Escape');
  }

  if (roda('CE6')) {
    const entreguesA = new Set(regs.A.recebidos.filter((m) => m.type === 'chat').map((m) => m.id));
    const desdeB = regs.B.recebidos.length;
    await pgA.evaluate(() => window.__game._mp.net.close());
    await pgA.waitForFunction(() => !document.getElementById('mp-panel').classList.contains('hidden') && document.getElementById('chat-sala').hidden, null, { timeout: 30_000, polling: 200 });
    const limpo = await pgA.evaluate(() => ({ linhas: document.querySelectorAll('#chat-log .chat-linha').length, rascunho: document.getElementById('chat-entrada').value }));
    cobra(limpo.linhas === 0 && limpo.rascunho === '', 'CE6 · a queda da conexão apaga o log e o rascunho de A');
    await pgA.waitForFunction(() => document.getElementById('mp-estado')?.dataset.s === 'on', null, { timeout: 60_000, polling: 250 });
    const desdeA = regs.A.recebidos.length;
    const volta = await entrarNaSala(pgA, convite, 'E', ident.A);
    cobra(volta.team === 'E' && volta.meta?.epoca === metaA.epoca, `CE6 · A volta ao time E da mesma sala, mesma época (${volta.meta?.epoca})`);
    const hist = await esperar(regs.A.recebidos, (m) => m.type === 'chat_hist', 2500, desdeA);
    if (TICKETS) {
      cobra(volta.meta?.eu?.h === hA, `CE6 · com ticket a chave é a mesma e o handle não muda (${volta.meta?.eu?.h})`);
      const ids = (hist?.list || []).map((m) => m.id);
      cobra(!!hist && ids.length > 0 && ids.every((id) => entreguesA.has(id)) && !hist.list.some((m) => 'cid' in m),
        `CE6 · o chat_hist traz ${ids.length} mensagens, todas já entregues a A antes da queda, sem cid (${ids.join(',')})`);
      cobra(!(hist?.list || []).some((m) => m.txt === 'olho de fora'), 'CE6 · o histórico não traz o que o espectador disse só aos espectadores');
      const lA = await linhas(pgA);
      cobra(lA.filter((l) => l.hist).length === ids.length && (await pgA.evaluate(() => document.querySelectorAll('#chat-log .chat-divisor').length)) === 1,
        'CE6 · o painel desenha o histórico atrás do divisor "Mensagens anteriores"');
    } else {
      cobra(volta.meta?.eu?.h !== hA, `CE6 · sem ticket a chave é a conexão (c:) e o handle muda (${hA} para ${volta.meta?.eu?.h})`);
      cobra(!hist || !hist.list.length, 'CE6 · sem ticket a chave efêmera não recebe histórico');
    }
    const cid = await digitar(pgA, regs.A, 'y', 'voltei');
    const emB = await esperar(regs.B.recebidos, chatCom('voltei'), 4000, desdeB);
    cobra(!!cid && emB && emB.h === volta.meta?.eu?.h, `CE6 · depois de reconectar A fala e B recebe com o handle novo (${emB?.h})`);
  }

  if (roda('CE7')) {
    let WS;
    try { WS = (await import(pathToFileURL(path.join(BACKEND || '.', 'node_modules/ws/index.js')).href)).default; }
    catch { WS = globalThis.WebSocket; }
    const http = `http://${NO}`;
    const criada = await (await fetch(`${http}/rooms`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(TICKETS ? { authorization: `Bearer ${ticket('create', ident.S2)}` } : {}) },
      body: JSON.stringify({ name: 'SALA DOIS', teamSize: 1 }),
    })).json();
    const id2 = criada.room || criada.id;
    const reg2 = { recebidos: [] };
    const qs = new URLSearchParams({ room: id2, team: 'auto', nome: ident.S2.nome, ...(TICKETS ? { ticket: ticket('connect', ident.S2) } : {}) });
    const s2 = new WS(`ws://${NO}/ws?${qs}`);
    const guarda2 = (dados) => { try { const m = JSON.parse(String(dados)); if (m && TIPOS.has(m.type)) reg2.recebidos.push(m); } catch { /* binário */ } };
    if (typeof s2.on === 'function') s2.on('message', (data, binario) => { if (!binario) guarda2(data); });
    else s2.addEventListener('message', (ev) => guarda2(ev.data));
    const bemVindo = await esperar(reg2.recebidos, (m) => m.type === 'welcome', 6000);
    cobra(!!bemVindo && bemVindo.chat?.v === 1 && bemVindo.chat.epoca !== metaA.epoca, `CE7 · a sala 2 (${id2}) tem época própria (${bemVindo?.chat?.epoca})`);
    cobra(!reg2.recebidos.some((m) => m.type === 'chat_hist' && m.list.length), 'CE7 · a sala 2 não recebe histórico da sala 1');
    const desde = { A: regs.A.recebidos.length, B: regs.B.recebidos.length, S: regs.S.recebidos.length, S2: reg2.recebidos.length };
    s2.send(JSON.stringify({ type: 'chat', ch: 'sala', txt: 'canario da sala dois', cid: 'c2' }));
    const eco2 = await esperar(reg2.recebidos, chatCom('canario da sala dois'), 4000, desde.S2);
    cobra(!!eco2 && eco2.cid === 'c2', 'CE7 · o chat da sala 2 ecoa para quem está nela');
    const sil = await Promise.all(['A', 'B', 'S'].map((k) => silencio(regs[k].recebidos, chatCom('canario da sala dois'), desde[k])));
    cobra(sil.every(Boolean), 'CE7 · o canário da sala 2 não chega a A, B nem S');
    const desde2 = reg2.recebidos.length;
    await digitar(pgA, regs.A, 'y', 'sala um falando');
    await esperar(regs.B.recebidos, chatCom('sala um falando'), 4000, desde.B);
    cobra(await silencio(reg2.recebidos, chatCom('sala um falando'), desde2), 'CE7 · o que A diz na sala 1 não chega à sala 2');
    try { s2.close(); } catch { /* já fechou */ }
  }

  if (roda('CE8')) {
    await esperarLive(pgA);
    await pgA.evaluate(() => {
      const g = window.__game, net = g._mp.net;
      window.__inputs = []; window.__tiros = 0;
      const s0 = net.sendInput.bind(net);
      net.sendInput = (inp) => { window.__inputs.push({ ax: inp.ax, az: inp.az, jump: !!inp.jump, shoot: !!inp.shoot }); return s0(inp); };
      const t0 = g._tryShoot.bind(g);
      g._tryShoot = (...a) => { window.__tiros++; return t0(...a); };
    });
    await abrirChat(pgA, 'y');
    await pgA.evaluate(() => { window.__inputs.length = 0; });
    await pgA.keyboard.type('www ');
    await pgA.keyboard.press('Space');
    await pgA.keyboard.press('r');
    const antes = await pgA.evaluate(() => ({ aberto: document.getElementById('chat-sala').classList.contains('aberto'), travada: !!window.__game._entradaTravada, valor: document.getElementById('chat-entrada').value, lock: !!document.pointerLockElement }));
    cobra(antes.aberto && antes.travada && antes.valor === 'www  r', `CE8 · com o chat aberto o texto vai para o campo ("${antes.valor}") e o jogo fica travado (pointer lock ${antes.lock ? 'ligado' : 'desligado'})`);
    /* clique no campo: sem pointer lock o alvo é o campo e o compositor fica; com o lock o alvo
       é o canvas e o clique fecha o compositor. Nos dois casos nada pode atirar. */
    const campo = await pgA.evaluate(() => { const r = document.getElementById('chat-entrada').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await pgA.mouse.click(campo.x, campo.y);
    await sleep(400);
    const s = await pgA.evaluate(() => {
      const g = window.__game;
      return { travada: !!g._entradaTravada, keys: { ...g.keys }, paused: !!g.paused, mouseDown0: !!g.mouseDown0, tiros: window.__tiros, inputs: window.__inputs.slice(), pausa: document.getElementById('pause-menu')?.classList.contains('hidden'), aberto: document.getElementById('chat-sala').classList.contains('aberto') };
    });
    const mexeu = s.inputs.filter((i) => i.ax || i.az || i.jump || i.shoot);
    cobra(!s.keys.KeyW && !s.keys.Space && !s.keys.KeyR && !s.mouseDown0 && s.tiros === 0, `CE8 · W, espaço, R e clique não viram tecla nem tiro (keys ${JSON.stringify(s.keys)}, tiros ${s.tiros}; o clique ${s.aberto ? 'manteve' : 'fechou'} o compositor)`);
    cobra(s.inputs.length > 0 && !mexeu.length, `CE8 · ${s.inputs.length} sendInput no período, nenhum com movimento, pulo ou tiro`);
    cobra(!s.paused && s.pausa !== false, 'CE8 · não aparece pausa com o chat aberto');
    await pgA.evaluate(() => { document.getElementById('chat-entrada').value = ''; });
    if (s.aberto) await pgA.mouse.click(300, 200);
    await sleep(600);
    const dep = await pgA.evaluate(() => ({ paused: !!window.__game.paused, travada: !!window.__game._entradaTravada, tiros: window.__tiros, aberto: document.getElementById('chat-sala').classList.contains('aberto'), pausa: document.getElementById('pause-menu')?.classList.contains('hidden') }));
    cobra(!dep.aberto && !dep.paused && dep.pausa !== false && !dep.travada && dep.tiros === 0, 'CE8 · o clique fora fecha o compositor e destrava, sem tiro e sem menu de pausa');
  }

  if (roda('CE9')) {
    const figuras = [];
    // o painel fechado sem linha não tem caixa: sozinha (--so=CE9) a cena precisa de uma mensagem
    if (!(await linhas(pgA)).length) await digitar(pgA, regs.A, 'y', 'linha para a geometria');
    const esc = (pg) => () => pg.keyboard.press('Escape');
    const partidas = (reg) => reg.recebidos.filter((m) => m.type === 'partida').length;
    const diagnostico = (pg) => pg.evaluate(() => ({
      estado: window.__game?.state, travada: !!window.__game?._entradaTravada, ativo: document.activeElement?.id || document.activeElement?.tagName,
      secOculta: document.getElementById('chat-sala').hidden, toqueOculto: document.getElementById('chat-toque')?.hidden, eventos: (window.__ev || []).slice(-12),
    }));
    const cena = async (pg, reg, nome, abrirCom, fecharCom, comoFecha) => {
      await sleep(400);
      await esperarLive(pg);
      let g = await geometria(pg);
      cobrarGeometria(g, `${nome} fechado`);
      figuras.push(await foto(pg, `${nome}-fechado`));
      let antes = partidas(reg);
      await abrirCom();
      await sleep(250);
      // a troca de mapa no meio da cena fecha o compositor (aoTrocarJogo): isso não é o que a cena mede
      if (!(await aberto(pg)) && partidas(reg) > antes) {
        console.log(`         ${nome}: chegou partida nova durante a abertura; a cena tenta de novo`);
        await esperarLive(pg); antes = partidas(reg); await abrirCom(); await sleep(250);
      }
      g = await geometria(pg);
      const abriu = await aberto(pg);
      cobra(abriu, `CE9 · ${nome}: o painel abriu${abriu ? '' : ` (${JSON.stringify(await diagnostico(pg))})`}`);
      cobrarGeometria(g, `${nome} aberto`);
      figuras.push(await foto(pg, `${nome}-aberto`));
      await fecharCom();
      await sleep(150);
      const fechou = !(await aberto(pg));
      cobra(fechou, `CE9 · ${nome}: ${comoFecha} fechou o compositor${fechou ? '' : ` (${JSON.stringify(await diagnostico(pg))})`}`);
      return g;
    };
    for (const [w, hgt] of [[1600, 900], [1500, 1000], [1008, 655]]) {
      await redimensionar(pgA, w, hgt);
      await cena(pgA, regs.A, `${w}x${hgt}`, () => abrirChat(pgA, 'y'), esc(pgA), 'Esc');
    }
    await redimensionar(pgA, 1600, 900);
    /* botões da HUD (#686): a #mp-spec-bar (z 99999, bottom 22) cobre a faixa do HUD do
       espectador — o clique de ponteiro REAL do jogador sem pointer lock é o toque do CE9
       adiante; aqui o .click() prova o handler contra o nó de verdade e tira as figuras. */
    await cena(pgS, regs.S, '1280x800-espectador-botao', () => pgS.evaluate(() => document.getElementById('hud-chat-sala').click()), esc(pgS), 'Esc');
    await pgB.evaluate(() => {
      window.__ev = [];
      const reg = (e) => { window.__ev.push({ t: Math.round(performance.now()), tipo: e.type, alvo: e.target?.id || e.target?.tagName, tecla: e.key }); if (window.__ev.length > 40) window.__ev.shift(); };
      for (const t of ['pointerdown', 'touchend', 'click', 'keydown', 'keyup', 'focusin']) document.addEventListener(t, reg, true);
      const sec = document.getElementById('chat-sala');
      new MutationObserver(() => window.__ev.push({ t: Math.round(performance.now()), tipo: 'classe', v: sec.className })).observe(sec, { attributes: true, attributeFilter: ['class'] });
    });
    // #chat-toque alterna: só toca se o painel estiver fechado
    const toque = async () => {
      await esperarLive(pgB);
      if (await aberto(pgB)) return;
      try { await pgB.tap('#chat-toque', { timeout: 5000 }); }
      catch { await pgB.evaluate(() => document.getElementById('chat-toque').click()); }
      await pgB.waitForFunction(() => document.getElementById('chat-sala').classList.contains('aberto'), null, { timeout: 5000 }).catch(() => {});
    };
    const g1 = await cena(pgB, regs.B, '844x390-toque', toque, esc(pgB), 'um Esc no teclado físico');
    cobra(g1.touchUi && !g1.touchUi.visivel && /\bchat\b/.test(g1.touchUi.classe), `CE9 · 844x390 aberto: #touch-ui some com a classe chat (${g1.touchUi?.classe})`);
    // no toque o botão da HUD também abre: #hud-chat-time direto no canal time
    try { await pgB.tap('#hud-chat-time', { timeout: 5000 }); }
    catch { await pgB.evaluate(() => document.getElementById('hud-chat-time').click()); }
    const canalB = await pgB.evaluate(() => document.getElementById('chat-canal').textContent);
    cobra(await aberto(pgB) && canalB === 'TIME', `CE9 · 844x390: tocar em #hud-chat-time abre o compositor no canal time (canal ${canalB})`);
    await esc(pgB);
    await redimensionar(pgB, 390, 844);
    // no retrato o #rotate-prompt cobre a tela e intercepta todo toque: o FECHAR só chega por click()
    await cena(pgB, regs.B, '390x844-retrato', toque, () => pgB.evaluate(() => document.getElementById('chat-fechar').click()), 'o FECHAR do cabeçalho (click(), sob o #rotate-prompt)');
    await redimensionar(pgB, 844, 390);
    console.log(`\n  figuras (${figuras.length}):\n${figuras.map((f) => `    ${f}`).join('\n')}`);
  }

  for (const k of ['A', 'B', 'S']) cobra(regs[k].erros.length === 0, `CE10 · ${k}: nenhuma exceção na página (${regs[k].conexoes} conexões)${regs[k].erros.length ? `: ${regs[k].erros[0]}` : ''}`);
  cobra(!['A', 'B', 'S'].some((k) => regs[k].recebidos.some((m) => m.type === 'error')), 'CE10 · nenhum frame error chegou pelo chat');
  console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'}: ${ok} ok, ${falhas} falha(s)${TICKETS ? ' (modo --tickets)' : ''}`);
} catch (e) {
  falhas++;
  console.error(`\nx a régua quebrou: ${e && e.stack || e}`);
} finally {
  for (const b of navegadores) await b.close().catch(() => {});
  matarFilhos();
}
process.exit(falhas ? 1 : 0);
