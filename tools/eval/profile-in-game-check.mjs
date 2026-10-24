/* profile-in-game-check.mjs — /u/<perfil> É O HUB DO JOGO SEM PERDER O SEO?
   Pedido do dono (14/10/2026): quem abre /u/<perfil> está DENTRO do jogo, no mesmo hub (menu,
   T$, música, @handle) com o perfil aberto na comunidade. Antes o SSR era uma página à parte
   e o jogo subia por cima num iframe. Agora a resposta SSR é o próprio hub, com o head do
   perfil e o perfil legível no HTML (crawler e prévia de link). A URL /u/<perfil> fica.

   Mede o ARTEFATO: o handler SSR de `.vercel/output` com o backend interceptado, comparado
   com a cópia estática do hub em `/comunidade` do mesmo build.
     PG1 · perfil público: 200, title, description, canonical, og:url, og:image, twitter:image,
           og:type=profile e hreflang no host decidido; o perfil SSR legível com o nick
     PG2 · a resposta é o hub: mesmo importmap e mesmos módulos da cópia estática, menu do hub,
           comunidade montada e o perfil SSR dentro dela; nenhum iframe de jogo
     PG3 · o perfil público não navega para outro endereço (a URL compartilhada fica)
     PG4 · perfil privado: 404, noindex, sem og:image, sem nick, com a entrada ao jogo
     PG5 · o boot do hub em /u/<perfil> não pendura ?map= e ?personagem= na URL compartilhada
     PG6 · o jogo recebe o perfil compartilhado: sem convite por cima (em /u e no ?perfil=
           antigo), painel da conta recolhido, perfil SSR trocado pela comunidade e login
           social fora de quadro quando houver um

   Uso: npm run build && node tools/eval/profile-in-game-check.mjs [--mutate]
   --mutate desfaz cada garantia numa cópia do artefato/fonte e exige vermelho. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const CANONICO = 'https://www.corosolto.com.br';
const ID = '11111111-1111-4111-8111-1111111111aa';
const PRIVADO = '22222222-2222-4222-8222-2222222222bb';
const HANDLE = 'treta_fixture';
const PERFIL = { id: ID, handle: HANDLE, nick: 'Fixture Treta', url: `/u/${HANDLE}`, visibility: 'public', source: 'server_verified',
  points: 321, kills: 45, deaths: 6, kd: 7.5, round_wins: 9, level: 4, next_level_points: 79, position: 12, bio: 'Bio da fixture',
  socials: [], avatar_url: null, last_character: null, account_verified: false };
const ROOT = process.cwd();
const FUNC = path.join(ROOT, '.vercel/output/functions/_render.func');
const MUTATE = process.argv.includes('--mutate');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');

async function coletar() {
  const cfg = path.join(FUNC, '.vc-config.json');
  const entry = existsSync(cfg) && path.join(FUNC, JSON.parse(readFileSync(cfg, 'utf8')).handler);
  if (!entry || !existsSync(entry)) return null;
  process.chdir(FUNC);
  const { default: handler } = await import(pathToFileURL(entry).href);
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (alvo, init) => {
    const url = String(alvo?.url ?? alvo);
    if (url.includes(`action=profile&id=${HANDLE}`)) return Response.json({ profile: PERFIL });
    if (url.includes(`action=profile&id=${PRIVADO}`)) return Response.json({ profile: { ...PERFIL, id: PRIVADO, visibility: 'private' } });
    return fetchReal(alvo, init);
  };
  const pedir = async (rota) => {
    const r = await handler.fetch(new Request(`${CANONICO}${rota}`, { headers: { 'x-forwarded-for': '127.0.0.1' } }));
    return { status: r.status, html: await r.text() };
  };
  const pub = await pedir(`/u/${HANDLE}`), priv = await pedir(`/u/${PRIVADO}`);
  globalThis.fetch = fetchReal;
  process.chdir(ROOT);
  return { pub, priv, hub: readFileSync(path.join(ROOT, '.vercel/output/static/comunidade/index.html'), 'utf8'), main: read('public/js/main.js'), entry: read('public/js/account-entry.js'), community: read('public/js/community.js'), rotas: read('public/js/rotas.js') };
}

const head = (html) => html.slice(0, Math.max(0, html.search(/<\/head>/i)));
const meta = (html, chave) => head(html).match(new RegExp(`<meta\\b[^>]*(?:property|name)="${chave}"[^>]*content="([^"]*)"`))?.[1]
  ?? head(html).match(new RegExp(`<meta\\b[^>]*content="([^"]*)"[^>]*(?:property|name)="${chave}"`))?.[1];
const link = (html, rel) => head(html).match(new RegExp(`<link\\b[^>]*rel="${rel}"[^>]*href="([^"]*)"`))?.[1];
const scripts = (html) => [...html.slice(html.search(/<body\b/i)).matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);

const importmap = (html) => html.match(/<script type="importmap"[^>]*>([\s\S]*?)<\/script>/)?.[1] || null;
const modulos = (html) => [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]).sort().join();
const secaoComunidade = (html) => html.match(/<section id="hub-community"[\s\S]*?<\/section>\s*<section id="hub-ranking"/)?.[0] || '';

// Executa só o script inline de redirect do perfil indisponível, com location registrada.
function redirecionamentos(html) {
  const navegou = [];
  const location = { origin: CANONICO, replace(v) { navegou.push(['replace', v]); }, assign(v) { navegou.push(['assign', v]); }, set href(v) { navegou.push(['href', v]); } };
  for (const s of scripts(html).filter((t) => /location\.(?:replace|assign|href)/.test(t) && !/__GEO_LANG__|lancamento|importmap/.test(t)))
    try { vm.runInNewContext(s, { location, window: { location }, URL }); } catch { /* script do hub sem DOM: não é redirect */ }
  return navegou;
}

const CASOS = [
  ['PG1 · perfil público mantém status, metas e o perfil SSR', (b) => {
    const { status, html } = b.pub;
    if (status !== 200) return `status ${status}`;
    const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1] || '';
    if (!titulo.includes(PERFIL.nick)) return `title sem o nick: ${titulo}`;
    if (!/321 pontos/.test(meta(html, 'description') || '')) return `description sem os pontos: ${meta(html, 'description')}`;
    const esperado = CANONICO + PERFIL.url, img = `${CANONICO}/api/profile-card/${HANDLE}.png`;
    if (link(html, 'canonical') !== esperado) return `canonical ${link(html, 'canonical')}`;
    if (meta(html, 'og:url') !== esperado) return `og:url ${meta(html, 'og:url')}`;
    if (meta(html, 'og:image') !== img) return `og:image ${meta(html, 'og:image')}`;
    if (meta(html, 'twitter:image') !== img) return `twitter:image ${meta(html, 'twitter:image')}`;
    if (meta(html, 'og:type') !== 'profile') return `og:type ${meta(html, 'og:type')}`;
    if (!new RegExp(`<link\\b[^>]*hreflang="pt-BR"[^>]*href="${esperado}"`).test(head(html))) return 'hreflang pt-BR ausente';
    if (/name="robots" content="noindex/.test(html)) return 'perfil público marcado noindex';
    if (!/<article\b[^>]*profile-sheet[\s\S]*Fixture Treta[\s\S]*<\/article>/.test(html)) return 'perfil SSR legível ausente';
    return null;
  }],
  ['PG2 · a resposta é o hub do jogo, com o perfil dentro da comunidade', (b) => {
    const { html } = b.pub;
    if (!importmap(b.hub)) return 'cópia estática do hub sem importmap (build quebrado?)';
    if (importmap(html) !== importmap(b.hub)) return 'importmap diferente do hub estático: /u não sobe o mesmo jogo';
    if (modulos(html) !== modulos(b.hub)) return `módulos diferentes do hub: ${modulos(html)} vs ${modulos(b.hub)}`;
    if (!/<base href="\/">/.test(head(html))) return 'sem <base href="/">: o jogo não resolve assets em /u/<perfil>';
    for (const id of ['main-menu', 'hub-ui', 'hub-treta-wallet', 'hub-music-toggle', 'hub-account-login', 'community'])
      if (!html.includes(`id="${id}"`)) return `hub sem #${id}`;
    const comunidade = secaoComunidade(html);
    if (!/id="community"/.test(comunidade)) return 'comunidade fora do pane do hub';
    if (!/id="perfil-ssr"[\s\S]*<article\b[^>]*profile-sheet[\s\S]*Fixture Treta/.test(comunidade)) return 'perfil SSR fora da comunidade do hub';
    if (/<iframe\b[^>]*profile-game|frame\.className=.profile-game/.test(html)) return 'ainda sobe o jogo num iframe por cima';
    return null;
  }],
  ['PG3 · perfil público não navega para outro endereço', (b) => {
    const navegou = redirecionamentos(b.pub.html);
    if (navegou.length) return `o documento navegou: ${JSON.stringify(navegou)}`;
    return null;
  }],
  ['PG4 · perfil privado segue indisponível, com a entrada ao jogo', (b) => {
    const { status, html } = b.priv;
    if (status !== 404) return `status ${status}`;
    if (!/name="robots" content="noindex/.test(html)) return 'privado sem noindex';
    if (meta(html, 'og:image')) return 'privado expõe og:image';
    if (html.includes(PERFIL.nick)) return 'privado vaza o nick';
    const navegou = redirecionamentos(html);
    if (!navegou.some(([tipo, alvo]) => tipo === 'replace' && /secao=comunidade/.test(alvo) && alvo.includes(PRIVADO))) return `privado perdeu a entrada ao jogo: ${JSON.stringify(navegou)}`;
    return null;
  }],
  ['PG5 · o boot não suja a URL compartilhada', (b) => {
    const boot = b.main.match(/^\s*([^\n]*hubNavigate\(\{ map: currentMap, personagem: currentChar \}, true\);)[^\n]*$/m)?.[1];
    if (!boot) return 'bloco de boot do hub não encontrado';
    const chamou = (pathname) => { let n = 0; vm.runInNewContext(boot, { location: { pathname }, hubNavigate: () => { n++; }, currentMap: 'm', currentChar: 'c' }); return n; };
    if (chamou(`/u/${HANDLE}`) !== 0 || chamou(`/u/${HANDLE}/conquistas`) !== 0) return 'boot pendura ?map= e ?personagem= em /u/<perfil>';
    if (chamou('/') !== 1 || chamou('/loja') !== 1) return 'boot deixou de gravar mapa e personagem no hub comum';
    return null;
  }],
  ['PG6 · o jogo recebe o perfil compartilhado: sem convite por cima, conta recolhida, login fora do quadro', async (b) => {
    const decl = b.main.match(/^const perfilCompartilhado = ([^\n]*);$/m)?.[1];
    if (!decl) return 'perfilCompartilhado não encontrado em main.js';
    for (const re of [/initAccountEntry\(\{skipPrompt:Boolean\([^\n]*?perfilCompartilhado\)/, /initLoginPrompt\(\{\.\.\.ready,skip:Boolean\([^\n]*?perfilCompartilhado\)/, /initTretaStore\(\{skipPrompt:Boolean\([^\n]*?perfilCompartilhado\)/])
      if (!re.test(b.main)) return `convite sem a guarda do perfil compartilhado: ${re}`;
    const { estadoDaUrl } = await import(`data:text/javascript;base64,${Buffer.from(b.rotas).toString('base64')}`);
    const avalia = (url) => { const u = new URL(url, CANONICO); return vm.runInNewContext(decl, { params: u.searchParams, estadoDaUrl, location: { href: u.href }, Boolean }); };
    if (avalia(`/u/${HANDLE}`) !== true || avalia(`/u/${ID}/conquistas`) !== true) return 'convite de conta cobre /u/<perfil>';
    if (avalia('/?secao=comunidade&social=profile&perfil=' + ID) !== true) return 'convite de conta cobre o link antigo ?perfil=';
    if (avalia('/?secao=jogar') !== false || avalia('/comunidade') !== false) return 'convite de conta sumiu da entrada comum';
    /* Desde 22/10 quem recolhe é painelDaConta(), chamada antes do boot: o visitante vê o perfil,
       não o painel de login. Medimos a função rodando, não o texto de uma linha. */
    const fn = b.community.match(/^\s*(function painelDaConta\(\)\{[^\n]*)$/m)?.[1];
    if (!fn) return 'painelDaConta não existe em community.js';
    if (!/painelDaConta\(\);\s*void boot\(\);/.test(b.community)) return 'painelDaConta não é chamada antes do boot';
    for (const [search, pathname] of [['?perfil=' + ID, '/'], ['', `/u/${HANDLE}`], ['', '/']]) {
      const painel = { open: true, hidden: false, removeAttribute(k) { if (k === 'open') this.open = false; } };
      vm.runInNewContext(`${fn};painelDaConta()`, { URLSearchParams, location: { search, pathname },
        auth: null, tab: 'profile', painelPedido: false, account: { closest: (s) => (s === 'details' ? painel : null) } });
      if (painel.open) return `painel da conta continua aberto por cima do perfil (${pathname}${search})`;
    }
    const comConta = { open: true, hidden: false, removeAttribute() {} };
    vm.runInNewContext(`${fn};painelDaConta()`, { URLSearchParams, location: { search: '', pathname: '/comunidade' },
      auth: { authenticated: true, profile: { id: ID } }, tab: 'settings', painelPedido: false, account: { closest: (s) => (s === 'details' ? comConta : null) } });
    if (!comConta.hidden) return 'painel da conta aparece para quem já tem conta';
    const troca = b.community.match(/^\s*(document\.getElementById\?\.\('perfil-ssr'\)\?\.remove\(\);)$/m)?.[1];
    if (!troca) return 'comunidade não troca o perfil SSR pelo dela (ficaria duplicado)';
    const leave = b.entry.match(/^const leaveTo=[^\n]*$/m)?.[0];
    if (!leave) return 'account-entry sem saída do quadro para o login social';
    if (/location\.assign\(out\.url\)/.test(b.entry) || (b.entry.match(/leaveTo\(out\.url\)/g) || []).length < 2) return 'login social ainda navega dentro do quadro';
    const ida = (cenario) => {
      const log = [], location = { origin: CANONICO, assign: (u) => log.push(['quadro', u]) };
      const self = {};
      const top = cenario === 'topo' ? self : cenario === 'mesma' ? { location: { origin: CANONICO, assign: (u) => log.push(['topo', u]) } }
        : { get location() { throw new Error('SecurityError'); } };
      vm.runInNewContext(`${leave};leaveTo('https://accounts.example/oauth')`, { location, top, self });
      return log.map(([onde]) => onde).join();
    };
    if (ida('mesma') !== 'topo') return 'login dentro de quadro da mesma origem não sai do quadro';
    if (ida('topo') !== 'quadro') return 'login fora de quadro mudou de destino';
    if (ida('outra') !== 'quadro') return 'portal de outra origem quebrou o login';
    return null;
  }],
];

const rodar = async (b) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(b); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const build = await coletar();
if (!build) { console.error('✗ sem build: rode `npm run build` antes (precisa de .vercel/output).'); process.exit(1); }

if (MUTATE) {
  const pub = (b, f) => ({ ...b, pub: { ...b.pub, html: f(b.pub.html) } });
  const MUTANTES = [
    ['PG1', 'canonical some do perfil', (b) => pub(b, (h) => h.replace(/<link rel="canonical"[^>]*>/, ''))],
    ['PG1', 'og:image some do perfil', (b) => pub(b, (h) => h.replace(/<meta property="og:image" [^>]*>/, ''))],
    ['PG1', 'canonical vira a home', (b) => pub(b, (h) => h.replace(`<link rel="canonical" href="${CANONICO}/u/${HANDLE}"`, `<link rel="canonical" href="${CANONICO}/"`))],
    ['PG1', 'perfil SSR some e só o jogo fica', (b) => pub(b, (h) => h.replace(/<article\b[\s\S]*?<\/article>/, ''))],
    ['PG2', 'página à parte em vez do hub (sem o menu)', (b) => pub(b, (h) => h.replaceAll('id="main-menu"', 'id="pagina-perfil"'))],
    ['PG2', 'importmap de outro build', (b) => pub(b, (h) => h.replace(/(<script type="importmap"[^>]*>)/, '$1 '))],
    ['PG2', 'perfil SSR fora da comunidade', (b) => pub(b, (h) => h.replace('id="perfil-ssr"', 'id="perfil-solto"'))],
    ['PG2', 'volta o iframe por cima', (b) => pub(b, (h) => h.replace('</body>', "<script>frame.className='profile-game'</script></body>"))],
    ['PG3', 'perfil público redireciona', (b) => pub(b, (h) => h.replace('</body>', '<script>location.replace("/?secao=comunidade");</script></body>'))],
    ['PG4', 'privado sem a entrada ao jogo', (b) => ({ ...b, priv: { ...b.priv, html: b.priv.html.replace('location.replace(game)', 'void game') } })],
    ['PG5', 'boot suja /u com ?map=', (b) => ({ ...b, main: b.main.replace("  if (!location.pathname.startsWith('/u/')) hubNavigate(", '  hubNavigate(') })],
    ['PG6', 'convite de conta cobre /u/<perfil>', (b) => ({ ...b, main: b.main.replace(" || estadoDaUrl(location.href)?.perfil", '') })],
    ['PG6', 'painel da conta aberto por cima do perfil compartilhado', (b) => ({ ...b, community: b.community.replace("if(!auth?.authenticated && tab==='profile' && !painelPedido)panel.open=false;", '') })],
    ['PG6', 'painel só recolhe depois do boot', (b) => ({ ...b, community: b.community.replace(/painelDaConta\(\);(\s*)void boot\(\);/, 'void boot();') })],
    ['PG6', 'painel da conta aparece para quem já tem conta', (b) => ({ ...b, community: b.community.replace('panel.hidden=!!auth?.profile;', 'panel.hidden=false;') })],
    ['PG6', 'perfil SSR fica duplicado ao lado da comunidade', (b) => ({ ...b, community: b.community.replaceAll("document.getElementById?.('perfil-ssr')?.remove();", '') })],
    ['PG6', 'login social navega dentro do quadro', (b) => ({ ...b, entry: b.entry.replace(/^const leaveTo=[^\n]*$/m, 'const leaveTo=url=>location.assign(url);') })],
  ];
  let cegas = 0;
  console.log('PERFIL NO JOGO (MUTANTES: cada um tem que FALHAR)\n');
  for (const [alvo, nome, aplica] of MUTANTES) {
    const m = aplica(build);
    if (JSON.stringify(m) === JSON.stringify(build)) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = (await rodar(m)).some((r) => r.nome.startsWith(alvo) && r.erro);
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`\n✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const res = await rodar(build);
for (const r of res) console.log(` ${r.erro ? '✗' : '✓'} ${r.nome}${r.erro ? '\n     ' + r.erro : ''}`);
const falhas = res.filter((r) => r.erro).length;
console.log(`\n${falhas ? '✗' : '✓'} perfil no jogo ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
