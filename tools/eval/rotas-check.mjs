#!/usr/bin/env node
/* rotas-check.mjs: TODA TELA DO HUB TEM ROTA FIXA (docs/adr/0008-rotas-fixas.md).
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTE

   Até 14/10/2026 o hub guardava a tela na query (/?secao=jogar&partida=multiplayer...).
   O canonical era sempre `/`, então para o buscador o hub inteiro era UMA página, e um
   link compartilhado dependia de 3 a 5 parâmetros certos. Pedido do dono: cada tela com
   endereço único, bom de indexar e de compartilhar.

   O que pode quebrar, e o que cada item mede:
   RT1  ida e volta: o caminho de cada rota da tabela (public/js/rotas.js) volta ao mesmo
        estado, e o estado volta ao mesmo caminho. Se não volta, o deep-link abre outra tela.
   RT2  link antigo: cada URL com ?secao= vira o caminho novo no cliente. `perfil=` fica na
        query de propósito (iframe de /u, lido pela régua do backend, api/reguas/ranking-check.mjs).
   RT3  301 do servidor: o vercel.json redireciona cada link antigo para o MESMO caminho
        que o cliente calcula, e não toca em nada com `perfil=` (senão o iframe de /u
        recarrega a página SSR dentro dele mesmo).
   RT4  community.js tem a mesma tabela de abas que rotas.js (lá não pode haver import:
        a régua do backend roda o arquivo num vm sem módulos).
   RT5  `<base href="/">` no hub ANTES do importmap. Sem ele, em /jogar/multiplayer o
        `three` vira /jogar/vendor/three.module.js (404) e o jogo não sobe.
   RT8  nenhum link de marcação (href) usa mais a forma antiga `/?secao=`: link novo nasce no caminho.
   RT6  (--dist) o build tem uma página por rota, com canonical, robots, og:url e base
        certos, e o sitemap lista as indexáveis.

   uso: node tools/eval/rotas-check.mjs [--dist] [--mutante=caminho|legado|redirect|abas|base|robots|perfil|perfil-aba|href-antigo]
   Cada mutante quebra de propósito o que um item mede; o item TEM que ficar vermelho. */
import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const DIST = process.argv.includes('--dist');
const SITE = 'https://www.corosolto.com.br';

let fonteRotas = readFileSync('public/js/rotas.js', 'utf8');
const mutar = (texto, de, para, nome) => {
  const novo = texto.replace(de, para);
  if (novo === texto) { console.error(`MUTANTE ${nome} NÃO APLICOU`); process.exit(2); }
  return novo;
};
if (MUT === 'caminho') fonteRotas = mutar(fonteRotas, "return servidor === 'privado' ? '/jogar/multiplayer/privado'", "return servidor === 'privado' ? '/jogar/multiplayer'", MUT);
if (MUT === 'perfil') fonteRotas = mutar(fonteRotas, "if (perfil) return perfilNoCaminho ? `/u/", "if (perfil) return null; return perfilNoCaminho ? `/u/", MUT);
if (MUT === 'perfil-aba') fonteRotas = mutar(fonteRotas, "...(Object.hasOwn(ABAS_PERFIL, segundo || '') ? { aba: segundo } : {})", '', MUT);
if (MUT === 'legado') fonteRotas = mutar(fonteRotas, "if (secao === 'loja') return '/loja';", "if (secao === 'loja') return null;", MUT);
const R = await import(`data:text/javascript;base64,${Buffer.from(fonteRotas).toString('base64')}`);

const falhas = [];
const item = (id, ok, msg) => { if (!ok) falhas.push(`${id} ${msg}`); else console.log(`✓ ${id}`); };

// RT1
{
  const erros = [];
  for (const rota of R.ROTAS_HUB) {
    const caminho = R.caminhoDoEstado(rota.estado);
    if (caminho !== rota.caminho) erros.push(`${rota.caminho}: estado volta como ${caminho}`);
    try { assert.deepEqual(R.estadoDaUrl(SITE + rota.caminho), rota.estado); }
    catch { erros.push(`${rota.caminho}: abre ${JSON.stringify(R.estadoDaUrl(SITE + rota.caminho))}`); }
    if (R.estadoDaUrl(SITE + rota.caminho + '/')?.secao !== rota.estado.secao) erros.push(`${rota.caminho}/ com barra final não abre a mesma tela`);
  }
  if (new Set(R.ROTAS_HUB.map((r) => r.caminho)).size !== R.ROTAS_HUB.length) erros.push('caminho repetido na tabela');
  item('RT1', !erros.length, `ida e volta quebrada em ${erros.length} de ${R.ROTAS_HUB.length} rotas: ${erros.slice(0, 4).join('; ')}. O deep-link abriria outra tela; confira caminhoDoEstado em public/js/rotas.js.`);
}

// Links antigos e o caminho que cada um tem que virar. null = continua na query.
const LEGADO = [
  ['/?secao=jogar&partida=singleplayer', '/'],
  ['/?secao=jogar&partida=multiplayer&servidor=publico', '/jogar/multiplayer'],
  ['/?secao=jogar&partida=multiplayer&servidor=privado', '/jogar/multiplayer/privado'],
  ['/?secao=jogar&partida=singleplayer&janela=perfil', '/jogar/perfil'],
  ['/?secao=jogar&partida=singleplayer&janela=mapas', '/jogar/mapas'],
  ['/?secao=jogar&partida=singleplayer&janela=personagens', '/jogar/personagens'],
  ['/?secao=jogar&partida=singleplayer&janela=confirmar', '/jogar/confirmar'],
  ['/?secao=loja&janela=configuracoes', '/configuracoes'],
  ['/?secao=loja', '/loja'],
  ['/?secao=comunidade', '/comunidade'],
  ['/?secao=comunidade&social=profile', '/comunidade'],
  ['/?secao=comunidade&social=friends', '/comunidade/amigos'],
  ['/?secao=comunidade&social=ranking', '/comunidade/ranking'],
  ['/?secao=comunidade&social=notifications', '/comunidade/notificacoes'],
  ['/?secao=comunidade&social=feed', '/comunidade/feed'],
  ['/?secao=comunidade&social=settings', '/comunidade/configuracoes'],
  ['/?secao=sobre', '/guia'],
  ['/?secao=sobre&guia=mapas', '/guia/mapas'],
  ['/?secao=sobre&guia=privacidade', '/guia/privacidade'],
  ['/?secao=feedback', '/feedback'],
  ['/?secao=apoie', '/apoiar'],
  ['/?secao=comunidade&social=profile&perfil=11111111-1111-4111-8111-111111111111', null],
  ['/?secao=ranking', '/ranking'],
];

// RT2
{
  const erros = [];
  for (const [antiga, nova] of LEGADO) {
    const url = R.urlDoEstado(R.estadoDaUrl(SITE + antiga), SITE + antiga);
    const esperado = nova ?? '/';
    if (url.pathname !== esperado) erros.push(`${antiga} → ${url.pathname} (esperado ${esperado})`);
    if (nova && R.CHAVES_DE_TELA.some((k) => url.searchParams.has(k))) erros.push(`${antiga} deixou chave de tela na query: ${url.search}`);
    if (!nova && url.search !== new URL(SITE + antiga).search) erros.push(`${antiga} mexeu na query que o backend lê: ${url.search}`);
  }
  const extra = R.urlDoEstado(R.estadoDaUrl(`${SITE}/?secao=loja&map=lajes&utm_source=zap`), `${SITE}/?secao=loja&map=lajes&utm_source=zap`);
  if (extra.searchParams.get('map') !== 'lajes' || extra.searchParams.get('utm_source') !== 'zap') erros.push(`parâmetro que não é tela se perdeu: ${extra.href}`);
  item('RT2', !erros.length, `${erros.length} de ${LEGADO.length} links antigos não viram o caminho certo: ${erros.slice(0, 4).join('; ')}`);
}

// RT3: simula o casamento de redirects da Vercel (has/missing de query, primeiro que casa).
{
  const vercel = JSON.parse(readFileSync('borda.json', 'utf8'));
  let redirects = vercel.redirects;
  if (MUT === 'redirect') {
    const i = redirects.findIndex((r) => r.destination === '/jogar/multiplayer/privado');
    if (i < 0) { console.error('MUTANTE redirect NÃO APLICOU'); process.exit(2); }
    redirects = redirects.filter((_, j) => j !== i);
  }
  const casa = (regra, url) => {
    const fonte = regra.source.replace('{/}?', '');
    if (fonte !== url.pathname && !(regra.source.endsWith('{/}?') && url.pathname === fonte + '/')) return null;
    const grupos = {};
    for (const h of regra.has || []) {
      if (h.type !== 'query') return null;
      const v = url.searchParams.get(h.key);
      if (v === null) return null;
      if (h.value !== undefined) {
        const m = new RegExp(`^(?:${h.value})$`).exec(v);
        if (!m) return null;
        Object.assign(grupos, m.groups || {});
      }
    }
    for (const m of regra.missing || []) if (m.type === 'query' && url.searchParams.has(m.key)) return null;
    return regra.destination.replace(/:(\w+)/g, (_, k) => grupos[k] ?? `:${k}`);
  };
  const destino = (caminho) => { const url = new URL(SITE + caminho); for (const r of redirects) { const d = casa(r, url); if (d !== null) return { d, r }; } return null; };
  const erros = [];
  for (const [antiga, nova] of LEGADO) {
    const achado = destino(antiga);
    if (nova === null) { if (achado) erros.push(`${antiga} é redirecionado para ${achado.d}, e não pode (iframe de /u)`); continue; }
    if (nova === '/') { if (achado) erros.push(`${antiga} redireciona para ${achado.d}: com a query preservada vira laço`); continue; }
    if (!achado) erros.push(`${antiga} sem 301 no vercel.json`);
    else {
      if (achado.d !== nova) erros.push(`${antiga} → ${achado.d} no servidor, mas o cliente usa ${nova}`);
      if (achado.r.statusCode !== 301) erros.push(`${antiga} redireciona com ${achado.r.statusCode || (achado.r.permanent ? 308 : 307)}, não 301`);
    }
  }
  if (destino('/')) erros.push('`/` sem query é redirecionado');
  if (destino('/jogar')?.d !== '/') erros.push('/jogar não leva a /');
  for (const rota of R.ROTAS_HUB) if (destino(rota.caminho)) erros.push(`rota nova ${rota.caminho} é redirecionada`);
  item('RT3', !erros.length, `redirects 301 do vercel.json fora do contrato (${erros.length}): ${erros.slice(0, 4).join('; ')}`);
}

// RT4
{
  let comunidade = readFileSync('public/js/community.js', 'utf8');
  if (MUT === 'abas') comunidade = mutar(comunidade, "friends:'amigos'", "friends:'amizades'", MUT);
  const m = /const SLUG_DA_ABA=(\{[^}]*\})/.exec(comunidade);
  let ok = false, visto = 'ausente';
  if (m) {
    const daComunidade = Function(`return ${m[1]}`)();
    visto = JSON.stringify(daComunidade);
    ok = Object.entries(daComunidade).every(([social, slug]) => R.caminhoDoEstado({ secao: 'comunidade', social }) === (slug ? `/comunidade/${slug}` : '/comunidade'));
  }
  item('RT4', ok, `abas da comunidade em public/js/community.js (${visto}) não batem com public/js/rotas.js: clicar numa aba gravaria uma URL que abre outra.`);
}

// RT5
{
  let hub = readFileSync('src/pages/index.astro', 'utf8');
  if (MUT === 'base') hub = mutar(hub, '<base href="/">', '', MUT);
  const base = hub.indexOf('<base href="/">'), mapa = hub.indexOf('<script type="importmap"');
  item('RT5', base > 0 && mapa > base, `index.astro sem <base href="/"> antes do importmap (base=${base}, importmap=${mapa}). Em /jogar/multiplayer o three resolveria para /jogar/vendor/three.module.js e o jogo não subiria.`);
}

// RT7: perfil na janela de cima mora em /u/<perfil>; no iframe de /u continua na query.
{
  const erros = [];
  const ID = '11111111-1111-4111-8111-111111111111';
  for (const [caminho, perfil] of [['/u/rubenmarcus', 'rubenmarcus'], ['/u/rubenmarcus/conquistas', 'rubenmarcus'], [`/u/${ID}/Nick`, ID], ['/u/rubenmarcus/', 'rubenmarcus']]) {
    const e = R.estadoDaUrl(SITE + caminho);
    if (e?.secao !== 'comunidade' || e?.social !== 'profile' || e?.perfil !== perfil) erros.push(`${caminho} abre ${JSON.stringify(e)}`);
  }
  if (R.estadoDaUrl(`${SITE}/u/x`)) erros.push('/u/x (handle inválido) virou estado do hub');
  const estado = { secao: 'comunidade', social: 'profile', perfil: 'rubenmarcus' };
  if (R.caminhoDoEstado(estado, { perfilNoCaminho: true }) !== '/u/rubenmarcus') erros.push(`janela de cima: ${R.caminhoDoEstado(estado, { perfilNoCaminho: true })}`);
  if (R.caminhoDoEstado(estado) !== null) erros.push('iframe: perfil saiu da query e quebraria o iframe de /u');
  // /u/<perfil>/<aba> é o hub: a aba fica no endereço (o boot não a apaga); o nick antigo não é aba.
  const comAba = R.estadoDaUrl(`${SITE}/u/rubenmarcus/conquistas`);
  if (comAba?.aba !== 'conquistas' || R.caminhoDoEstado(comAba, { perfilNoCaminho: true }) !== '/u/rubenmarcus/conquistas') erros.push(`aba do perfil some do endereço: ${JSON.stringify(comAba)}`);
  if (R.estadoDaUrl(`${SITE}/u/${ID}/Nick`)?.aba) erros.push('nick antigo virou aba');
  const legado = R.urlDoEstado(R.estadoDaUrl(`${SITE}/?secao=comunidade&social=profile&perfil=${ID}`), `${SITE}/?secao=comunidade&social=profile&perfil=${ID}`, { perfilNoCaminho: true });
  if (legado.pathname !== `/u/${ID}` || legado.search) erros.push(`link antigo de perfil na janela de cima virou ${legado.href}`);
  if (!R.ABAS_PERFIL || Object.keys(R.ABAS_PERFIL).join() !== 'conquistas,partidas,privacidade') erros.push(`ABAS_PERFIL ${JSON.stringify(R.ABAS_PERFIL)}`);
  const pagina = readFileSync('src/pages/u/[...path].astro', 'utf8');
  const abasSsr = /const ABAS:Record<string,string>=(\{[^}]*\})/.exec(pagina)?.[1];
  if (!abasSsr || JSON.stringify(Function(`return ${abasSsr}`)()) !== JSON.stringify(R.ABAS_PERFIL)) erros.push(`abas do SSR (${abasSsr}) diferentes de ABAS_PERFIL`);
  item('RT7', !erros.length, `perfil fora do contrato (${erros.length}): ${erros.slice(0, 4).join('; ')}`);
}

// RT8
{
  const { readdirSync, statSync } = await import('node:fs');
  const arquivos = (dir) => readdirSync(dir).flatMap((n) => { const p = `${dir}/${n}`; return statSync(p).isDirectory() ? arquivos(p) : /\.(astro|js|ts|mjs)$/.test(n) ? [p] : []; });
  const achados = [];
  for (const arquivo of [...arquivos('src'), ...arquivos('public/js')]) {
    let texto = readFileSync(arquivo, 'utf8');
    if (MUT === 'href-antigo' && arquivo === 'src/pages/index.astro') texto += '\n<a href="/?secao=loja">loja</a>';
    for (const m of texto.matchAll(/href=["'{`]+\/\?secao=[^"'`}\s>]*/g)) achados.push(`${arquivo}: ${m[0]}`);
  }
  item('RT8', !achados.length, `${achados.length} link(s) na forma antiga: ${achados.slice(0, 4).join('; ')}. Use o caminho de public/js/rotas.js (ex.: /comunidade, /loja).`);
}

// RT6
if (DIST) {
  const erros = [];
  const raiz = 'dist/client';
  if (!existsSync(`${raiz}/index.html`)) erros.push(`${raiz}/index.html não existe: rode npm run build antes de --dist`);
  for (const rota of R.ROTAS_HUB) {
    const arquivo = `${raiz}${rota.caminho}/index.html`;
    if (!existsSync(arquivo)) { erros.push(`${arquivo} ausente`); continue; }
    let html = readFileSync(arquivo, 'utf8');
    if (MUT === 'robots' && rota.caminho === '/jogar/multiplayer') html = mutar(html, 'noindex, follow', 'index, follow', MUT);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const robots = /<meta name="robots" content="([^"]+)"/.exec(html)?.[1] || '';
    const ogUrl = /<meta property="og:url" content="([^"]+)"/.exec(html)?.[1];
    const esperado = SITE + (rota.canonical || rota.caminho);
    if (canonical !== esperado) erros.push(`${rota.caminho}: canonical ${canonical}, esperado ${esperado}`);
    if (ogUrl !== SITE + rota.caminho) erros.push(`${rota.caminho}: og:url ${ogUrl}`);
    const indexavel = rota.dependeDoRanking ? process.env.RANKING_ON === 'true' : rota.indexavel;
    if (indexavel !== !robots.includes('noindex')) erros.push(`${rota.caminho}: robots "${robots}" com indexavel=${indexavel}`);
    if (!html.includes('<base href="/">')) erros.push(`${rota.caminho}: sem <base href="/">`);
    if (!/<title>[^<]*CORO SOLTO/.test(html) || !html.includes(rota.titulo)) erros.push(`${rota.caminho}: title sem "${rota.titulo}"`);
    if (!html.includes('id="hub-community"')) erros.push(`${rota.caminho}: não é o hub (sem #hub-community)`);
  }
  const home = existsSync(`${raiz}/index.html`) ? readFileSync(`${raiz}/index.html`, 'utf8') : '';
  if (!home.includes(`<link rel="canonical" href="${SITE}/"`)) erros.push('home perdeu o canonical /');
  if (!home.includes('"VideoGame"')) erros.push('home perdeu o JSON-LD VideoGame');
  const sitemap = readFileSync('src/pages/sitemap.xml.ts', 'utf8');
  if (!/ROTAS_HUB\.filter\(\(r\) => r\.indexavel && \(!r\.dependeDoRanking \|\| RANKING_ON\)\)/.test(sitemap)) erros.push('sitemap.xml.ts não lista as rotas indexáveis de rotas.js');
  item('RT6', !erros.length, `build fora do contrato (${erros.length}): ${erros.slice(0, 5).join('; ')}`);
}

if (falhas.length) {
  for (const f of falhas) console.error(`✗ ${f}`);
  process.exit(1);
}
console.log(`rotas-check: ${R.ROTAS_HUB.length} rotas do hub, ${LEGADO.length} links antigos${DIST ? ', build conferido' : ''}`);
