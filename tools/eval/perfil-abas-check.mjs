/* perfil-abas-check.mjs: /u/<perfil>/<aba> tem endereço, head e conteúdo próprios (ADR 0008).
   Pedido do dono (14/10/2026): rotas como /u/rubenmarcus/privacidade. Roda o handler SSR de
   .vercel/output, o mesmo que vai para o ar, com a API social simulada.

     PA1 · canonical e og:url: aba indexável aponta para si; privacidade e o nick antigo apontam para /u/<handle>
     PA2 · robots: partidas e privacidade fora do índice; perfil e conquistas dentro
     PA3 · abas: um link por aba e aria-current na aba aberta
     PA4 · conteúdo: conquistas listadas; privacidade leva às configurações; toda aba é o hub do jogo
     PA5 · JSON-LD ProfilePage nas páginas indexáveis

   Uso: npm run build && node tools/eval/perfil-abas-check.mjs [--mutate] */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const FUNC = path.join(ROOT, '.vercel/output/functions/_render.func');
const MUTATE = process.argv.includes('--mutate');
const SITE = 'https://www.corosolto.com.br';
const ID = '66666666-6666-4666-8666-6666666666aa', HANDLE = 'abas_fixture';
const PERFIL = { id: ID, handle: HANDLE, nick: 'Abas Fixture', url: `/u/${HANDLE}`, visibility: 'public', source: 'server_verified',
  points: 10, kills: 12, deaths: 1, kd: 12, round_wins: 1, wins: 1, losses: 0, matches: 1, rounds: 1, level: 1, next_level_points: 90, position: 9,
  bio: '', socials: [], avatar_url: null, last_character: null, account_verified: false, favorites: [], history: [], play_seconds: 0,
  achievements: [{ key: 'first_kill', at: '2026-10-01T12:00:00Z' }, { key: 'ten_kills', at: '2026-10-02T12:00:00Z' }] };
const SEM_HANDLE = { ...PERFIL, handle: null, url: `/u/${ID}/Abas-Fixture` };
const PAGINAS = { perfil: '', conquistas: '/conquistas', partidas: '/partidas', privacidade: '/privacidade', antigo: `/../${ID}/Abas%20Fixture` };

async function coletar() {
  const cfg = path.join(FUNC, '.vc-config.json');
  const entry = existsSync(cfg) && path.join(FUNC, JSON.parse(readFileSync(cfg, 'utf8')).handler);
  if (!entry || !existsSync(entry)) return null;
  process.chdir(FUNC);
  const { default: handler } = await import(pathToFileURL(entry).href);
  const real = globalThis.fetch;let perfilAtual=PERFIL;
  globalThis.fetch = async (alvo, init) => (String(alvo?.url ?? alvo).includes('/api/social') ? Response.json({ profile: perfilAtual }) : real(alvo, init));
  const out = {};
  for (const [nome, sufixo] of Object.entries(PAGINAS)) {
    const url = nome === 'antigo' ? `${SITE}/u/${ID}/Abas%20Fixture` : `${SITE}/u/${HANDLE}${sufixo}`;
    const r = await handler.fetch(new Request(url, { headers: { 'x-forwarded-for': '127.0.0.1' } }));
    out[nome] = { status: r.status, html: await r.text() };
  }
  perfilAtual=SEM_HANDLE;
  const semHandle=await handler.fetch(new Request(`${SITE}/u/${ID}/partidas`,{headers:{'x-forwarded-for':'127.0.0.1'}}));
  out.semHandle={status:semHandle.status,html:await semHandle.text()};
  globalThis.fetch = real;
  process.chdir(ROOT);
  return out;
}

const attr = (html, re) => re.exec(html)?.[1] ?? null;
const canonical = (h) => attr(h, /<link rel="canonical" href="([^"]+)"/);
const ogUrl = (h) => attr(h, /<meta property="og:url" content="([^"]+)"/);
const robots = (h) => attr(h, /<meta name="robots" content="([^"]+)"/);
const atual = (h) => attr(h, /<a href="([^"]+)" aria-current="page"/);

const CASOS = [
  ['PA1 · canonical e og:url por aba', (b) => {
    const esperado = { perfil: `/u/${HANDLE}`, conquistas: `/u/${HANDLE}/conquistas`, partidas: `/u/${HANDLE}/partidas`, privacidade: `/u/${HANDLE}`, antigo: `/u/${HANDLE}` };
    for (const [nome, caminho] of Object.entries(esperado)) {
      if (b[nome].status !== 200) return `${nome}: status ${b[nome].status}`;
      if (canonical(b[nome].html) !== SITE + caminho) return `${nome}: canonical ${canonical(b[nome].html)}, esperado ${SITE + caminho}`;
      if (ogUrl(b[nome].html) !== canonical(b[nome].html)) return `${nome}: og:url ${ogUrl(b[nome].html)} diferente do canonical`;
    }
    return null;
  }],
  ['PA2 · robots por aba', (b) => {
    for (const nome of ['partidas', 'privacidade']) if (!/noindex/.test(robots(b[nome].html) || '')) return `${nome} entrou no índice`;
    for (const nome of ['perfil', 'conquistas', 'antigo']) if (/noindex/.test(robots(b[nome].html) || '')) return `${nome} saiu do índice`;
    return null;
  }],
  ['PA3 · navegação entre abas', (b) => {
    for (const [nome, sufixo] of Object.entries(PAGINAS)) {
      if (nome === 'antigo') continue;
      const links = [...b[nome].html.matchAll(/<nav class="profile-tabs"[^>]*>([\s\S]*?)<\/nav>/g)].map((m) => m[1]).join('');
      for (const s of ['', '/conquistas', '/partidas', '/privacidade']) if (!links.includes(`href="/u/${HANDLE}${s}"`)) return `${nome}: sem link para /u/${HANDLE}${s}`;
      if (atual(links) !== `/u/${HANDLE}${sufixo}`) return `${nome}: aba marcada ${atual(links)}`;
    }
    return null;
  }],
  ['PA4 · conteúdo da aba', (b) => {
    if (!/Primeiro abate[\s\S]*Dez abates na conta/.test(b.conquistas.html)) return 'conquistas não listadas';
    if (!b.privacidade.html.includes('href="/comunidade/configuracoes"')) return 'privacidade sem caminho para as configurações';
    // /u/<perfil> é o hub (profile-in-game-check): cada aba serve o mesmo jogo, sem iframe por cima.
    for (const [nome, pagina] of Object.entries(b)) {
      if (!pagina.html.includes('id="main-menu"') || !pagina.html.includes('id="perfil-ssr"')) return `${nome}: não é o hub com o perfil`;
      if (pagina.html.includes("frame.className='profile-game'")) return `${nome}: sobe o jogo num iframe por cima`;
    }
    return null;
  }],
  ['PA5 · JSON-LD ProfilePage', (b) => {
    for (const nome of ['perfil', 'conquistas']) {
      const bloco = attr(b[nome].html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      let dado; try { dado = JSON.parse(bloco); } catch { return `${nome}: sem JSON-LD válido`; }
      if (dado['@type'] !== 'ProfilePage' || dado.mainEntity?.name !== PERFIL.nick || dado.url !== canonical(b[nome].html)) return `${nome}: JSON-LD ${bloco?.slice(0, 120)}`;
    }
    if (/application\/ld\+json/.test(b.privacidade.html)) return 'privacidade (noindex) com JSON-LD';
    return null;
  }],
  ['PA6 · conta sem handle mantém as abas em /u/<uuid>/<aba>', (b) => {
    if (b.semHandle.status!==200) return `status ${b.semHandle.status}`;
    if (canonical(b.semHandle.html)!==`${SITE}/u/${ID}/partidas`) return `canonical ${canonical(b.semHandle.html)}`;
    const links=[...b.semHandle.html.matchAll(/<nav class="profile-tabs"[^>]*>([\s\S]*?)<\/nav>/g)].map(m=>m[1]).join('');
    for(const slug of ['conquistas','partidas','privacidade'])if(!links.includes(`href="/u/${ID}/${slug}"`))return `sem link /u/${ID}/${slug}`;
    if(links.includes(`/u/${ID}/Abas-Fixture/partidas`))return 'nick legado virou segmento pai da aba';
    return null;
  }],
];

const rodar = (b) => CASOS.map(([nome, f]) => { let erro; try { erro = f(b); } catch (e) { erro = `exceção: ${e.message}`; } return { nome, erro }; });
const build = await coletar();
if (!build) { console.error('✗ sem build: rode `npm run build` antes (precisa de .vercel/output).'); process.exit(1); }

if (MUTATE) {
  const troca = (pagina, antes, depois) => (b) => ({ ...b, [pagina]: { ...b[pagina], html: b[pagina].html.replace(antes, depois) } });
  const MUTANTES = [
    ['PA1', 'aba aponta para o perfil', troca('conquistas', `${SITE}/u/${HANDLE}/conquistas"`, `${SITE}/u/${HANDLE}"`)],
    ['PA2', 'privacidade indexável', troca('privacidade', '<meta name="robots" content="noindex, follow"', '<meta name="robots" content="index"')],
    ['PA3', 'aba errada marcada', troca('partidas', ` aria-current="page"`, '')],
    ['PA4', 'jogo cobre a privacidade', troca('privacidade', '</body>', "<script>frame.className='profile-game'</script></body>")],
    ['PA4', 'aba vira página à parte', troca('conquistas', 'id="main-menu"', 'id="pagina-aba"')],
    ['PA5', 'JSON-LD some', troca('perfil', 'application/ld+json', 'application/json')],
    ['PA6', 'nick legado vira pai da aba sem handle', troca('semHandle', `${SITE}/u/${ID}/partidas"`, `${SITE}/u/${ID}/Abas-Fixture/partidas"`)],
  ];
  let cegas = 0;
  for (const [alvo, nome, aplica] of MUTANTES) {
    const m = aplica(build);
    if (JSON.stringify(m) === JSON.stringify(build)) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = rodar(m).some((r) => r.nome.startsWith(alvo) && r.erro);
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const res = rodar(build);
for (const r of res) console.log(` ${r.erro ? '✗' : '✓'} ${r.nome}${r.erro ? `\n     ${r.erro}` : ''}`);
const falhas = res.filter((r) => r.erro).length;
console.log(`${falhas ? '✗' : '✓'} abas do perfil ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
