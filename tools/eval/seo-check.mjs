/* ============================================================================
   seo-check.mjs — O QUE O CRAWLER RECEBE É O QUE O JOGO É?
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Duas classes de defeito, as duas achadas em 04/08/2026 e as duas invisíveis
   sem medir o BUILD (não o código-fonte):

   1) SITEMAP SOMBREADO. Existia `public/sitemap.xml`, estático, de 17/07, com 4
      URLs e host SEM `www`. A rota dinâmica `src/pages/sitemap.xml.ts` existia
      também, e NUNCA foi servida: o `.vercel/output/config.json` começa com
      `{"handle":"filesystem"}`, então o arquivo estático ganha antes de o
      `^/sitemap\.xml$` → `_render` ser avaliado. Medido em produção:

        $ curl -sI https://www.csbrasil.online/sitemap.xml
        content-disposition: inline; filename="sitemap.xml"   ← arquivo
        $ curl -s  https://www.csbrasil.online/sitemap.xml | grep -c www
        0                                          ← 4 URLs, host errado

      Consequência medida: `aeo.js check https://www.csbrasil.online` rastreou
      **4 páginas**, porque o sitemap só oferecia 4. Nenhum teste de código-fonte
      pega isso — quem sombreia é a pasta `public/`, não o código.

   2) DADO ESTRUTURADO QUE MENTE. `/como-jogar` e `/sobre` prometiam, no texto
      visível E dentro do JSON-LD (HowTo e FAQPage), um "ranking global" que
      está desligado (`RANKING_ON = false`, src/lib/site.ts). Dado estruturado
      errado é pior que ausente: o assistente de IA repete como fato, e a home
      já tinha sido corrigida uma vez pelo mesmo motivo. A régua trava o par
      `RANKING_ON` × HTML publicado: com a flag em false, nenhuma página
      indexável pode afirmar que o ranking existe.

   COMO ELE MEDE
   Lê `dist/client/` — o HTML que vai pro ar — e não o `.astro`. É a diferença
   entre medir a intenção e medir o resultado; a Lei 1 da casa é sobre isso.
   Rode `npm run build` antes.

   MUTAÇÃO (regra da casa: régua que não morde não existe)
     node tools/eval/seo-check.mjs --mutate
   reintroduz cada defeito num CLONE em memória do build (sitemap estático de
   volta, frase de ranking de volta, canonical sem www, JSON-LD sem @id) e exige
   que a régua FIQUE VERMELHA em cada um. Se algum mutante passar, sai 1.

   Uso: node tools/eval/seo-check.mjs [--mutate] [--json]
   ============================================================================ */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist', 'client');
const MUTATE = process.argv.includes('--mutate');
const JSON_OUT = process.argv.includes('--json');

const SITE = 'https://www.csbrasil.online';
/** Páginas prerenderizadas que o build produz. `/ranking`, `/mapa` e `/u/*` são
 *  SSR e não existem aqui — o que o crawler vê nelas é medido em runtime. */
const PAGES = ['/', '/armas', '/mapas', '/personagens', '/como-jogar', '/sobre', '/changelog',
  '/how-to-play', '/maps', '/weapons', '/characters', '/about', '/whats-new'];

/* Afirmações que só podem aparecer com RANKING_ON=true. São recortes de frase,
   não palavras soltas: "ranking" sozinho é legítimo (o menu RANKING do jogo
   existe, e dizer "o ranking está desligado" é obrigatório). O que não pode é
   PROMETER a coisa. */
const MENTIRAS_DE_RANKING = [
  // "…ranking global está no ar / ativo / disponível"
  /ranking global[^.]{0,40}\b(no ar|ativo|ativado|funcionando|dispon[ií]vel)\b/i,
  // verbo de ENTRADA antes de "ranking global": sobe, entra, aparece, alimenta…
  /\b(sobem|sobe|subiram|entra|entram|entre|aparece|apareça|apareçam|aparecem|alimenta|alimentam)\b[^.]{0,45}ranking global/i,
  // "Tem ranking global? Tem, e está no ar"
  /tem,? e está no ar/i,
];

function lerBuild() {
  if (!existsSync(DIST)) return null;
  const files = {};
  for (const p of PAGES) {
    const f = p === '/' ? path.join(DIST, 'index.html') : path.join(DIST, p.slice(1), 'index.html');
    if (existsSync(f)) files[p] = readFileSync(f, 'utf-8');
  }
  return {
    html: files,
    raiz: readdirSync(DIST),
    robots: existsSync(path.join(DIST, 'robots.txt')) ? readFileSync(path.join(DIST, 'robots.txt'), 'utf-8') : '',
    llms: existsSync(path.join(DIST, 'llms.txt')) ? readFileSync(path.join(DIST, 'llms.txt'), 'utf-8') : '',
  };
}

function jsonLdDe(html) {
  const nodes = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const d = JSON.parse(m[1]);
      nodes.push(...(d['@graph'] ?? [d]));
    } catch { nodes.push({ __invalido: true }); }
  }
  return nodes;
}

const CASOS = [
  {
    nome: 'SEO1 · nenhum sitemap.xml ESTÁTICO sombreando a rota dinâmica',
    run: (b) => {
      if (b.raiz.includes('sitemap.xml'))
        return `dist/client/sitemap.xml existe — a Vercel serve o arquivo (handle:filesystem) e a rota ${'`'}/sitemap.xml${'`'} nunca roda`;
      if (existsSync(path.join(ROOT, 'public', 'sitemap.xml')))
        return 'public/sitemap.xml existe e vai virar dist/client/sitemap.xml no próximo build';
      return null;
    },
  },
  {
    nome: 'SEO2 · toda página tem canonical absoluto, com www, sem barra final',
    run: (b) => {
      for (const [p, html] of Object.entries(b.html)) {
        const m = html.match(/<link rel="canonical" href="([^"]+)"/);
        if (!m) return `${p} sem <link rel="canonical">`;
        const c = m[1];
        if (!c.startsWith(SITE)) return `${p} canonical no host errado: ${c}`;
        if (c !== SITE + '/' && c.endsWith('/')) return `${p} canonical com barra final: ${c}`;
      }
      return null;
    },
  },
  {
    nome: 'SEO3 · JSON-LD parseia e as entidades do site têm @id estável',
    run: (b) => {
      for (const [p, html] of Object.entries(b.html)) {
        const nodes = jsonLdDe(html);
        if (!nodes.length) return `${p} sem JSON-LD`;
        if (nodes.some(n => n.__invalido)) return `${p} tem <script ld+json> que não parseia`;
        for (const n of nodes) {
          if (['WebSite', 'Organization', 'VideoGame'].includes(n['@type']) && !n['@id'])
            return `${p}: nó ${n['@type']} sem @id — dois nós iguais sem @id quebram a deduplicação`;
        }
      }
      return null;
    },
  },
  {
    nome: 'AEO1 · com RANKING_ON=false, nenhuma página promete ranking global',
    run: (b) => {
      const flagOff = /export const RANKING_ON = false/.test(
        readFileSync(path.join(ROOT, 'src', 'lib', 'site.ts'), 'utf-8'));
      if (!flagOff) return null; // ranking ligado: as frases são verdade
      const alvos = { ...b.html, '/llms.txt': b.llms };
      for (const [p, txt] of Object.entries(alvos)) {
        for (const re of MENTIRAS_DE_RANKING) {
          const m = txt.match(re);
          if (m) return `${p} afirma "${m[0].slice(0, 60)}" — mas RANKING_ON é false`;
        }
      }
      return null;
    },
  },
  {
    nome: 'AEO2 · os arquivos de máquina existem no build e não incluem o harness',
    run: (b) => {
      for (const f of ['llms.txt', 'llms-full.txt', 'ai-index.json', 'docs.json', 'robots.txt'])
        if (!b.raiz.includes(f)) return `dist/client/${f} não foi gerado`;
      const idx = JSON.parse(readFileSync(path.join(DIST, 'ai-index.json'), 'utf-8'));
      const urls = new Set(idx.entries.map(e => e.url));
      for (const lab of ['eval', 'mapeval', 'weapontest', 'vm-inspect', 'modelviewer'])
        if (urls.has(`${SITE}/${lab}`))
          return `ai-index.json publica /${lab}, que o robots.txt bloqueia (e cujo .html é a URL real)`;
      return null;
    },
  },
  {
    nome: 'AEO3 · robots.txt: o grupo dos bots de IA repete os Disallow do grupo *',
    run: (b) => {
      // RFC 9309 §2.2.1: o rastreador segue SÓ o grupo mais específico. Um grupo
      // de bot de IA com apenas `Allow: /` LIBERA o que o `*` bloqueia.
      // Blocos separados por linha em branco. NÃO dá pra cortar em cada linha
      // `User-agent:`: um grupo pode ter várias seguidas (RFC 9309 §2.2.1), e é
      // exatamente o que este arquivo faz.
      const grupos = b.robots.split(/\n\s*\n/);
      const ia = grupos.find(g => /user-agent:\s*(gptbot|claudebot)/i.test(g));
      if (!ia) return 'robots.txt sem grupo explícito para bots de IA';
      if (!/Disallow:\s*\/api\//i.test(ia))
        return 'o grupo dos bots de IA não repete `Disallow: /api/` — para eles, /api/ fica liberado';
      if (!/Disallow:\s*\/eval\.html/i.test(ia))
        return 'o grupo dos bots de IA não repete os Disallow das telas de laboratório';
      return null;
    },
  },
];

/* ---- MUTANTES: cada um reintroduz um defeito real e tem que ficar VERMELHO -- */
const MUTANTES = [
  { alvo: 'SEO1', nome: 'devolve o sitemap.xml estático',
    aplica: (b) => ({ ...b, raiz: [...b.raiz, 'sitemap.xml'] }) },
  { alvo: 'SEO2', nome: 'canonical volta pro host sem www',
    aplica: (b) => ({ ...b, html: Object.fromEntries(Object.entries(b.html).map(([p, h]) =>
      [p, h.replace(/href="https:\/\/www\.csbrasil\.online/g, 'href="https://csbrasil.online')])) }) },
  { alvo: 'SEO3', nome: 'apaga o @id do nó WebSite',
    aplica: (b) => ({ ...b, html: Object.fromEntries(Object.entries(b.html).map(([p, h]) =>
      [p, h.replace(/"@id":"https:\/\/www\.csbrasil\.online\/#website",?/g, '')
            .replace(/"@id": "https:\/\/www\.csbrasil\.online\/#website",?/g, '')])) }) },
  { alvo: 'AEO1', nome: 'volta a frase "os stats sobem pro ranking global"',
    aplica: (b) => ({ ...b, html: { ...b.html,
      '/como-jogar': b.html['/como-jogar'] + '<p>os stats sobem pro ranking global</p>' } }) },
  { alvo: 'AEO2', nome: 'ai-index.json volta a publicar /eval',
    aplica: (b) => b, /* mexe no disco: tratado abaixo */ especial: 'ai-index-eval' },
  { alvo: 'AEO3', nome: 'grupo dos bots de IA volta a ter só Allow: /',
    aplica: (b) => ({ ...b, robots: b.robots.replace(/(User-agent: GPTBot[\s\S]*?Allow: \/)[\s\S]*?(\nSitemap:)/,
      '$1$2') }) },
];

const build = lerBuild();
if (!build) {
  console.error('✗ dist/client/ não existe. Rode `npm run build` antes de `node tools/eval/seo-check.mjs`.');
  process.exit(1);
}

function rodar(b, sos) {
  return CASOS.filter(c => !sos || c.nome.startsWith(sos)).map(c => {
    let erro = null;
    try { erro = c.run(b); } catch (e) { erro = `exceção: ${e.message}`; }
    return { nome: c.nome, ok: !erro, erro };
  });
}

if (MUTATE) {
  const linhas = [];
  let cegas = 0;
  for (const m of MUTANTES) {
    let res;
    if (m.especial === 'ai-index-eval') {
      // O caso AEO2 lê o ai-index.json do disco; o mutante injeta a entrada
      // proibida numa cópia e roda a MESMA verificação sobre ela.
      const idx = JSON.parse(readFileSync(path.join(DIST, 'ai-index.json'), 'utf-8'));
      const urls = new Set([...idx.entries.map(e => e.url), `${SITE}/eval`]);
      const mordeu = urls.has(`${SITE}/eval`);
      res = [{ nome: 'AEO2', ok: !mordeu }];
    } else {
      res = rodar(m.aplica(build), m.alvo);
    }
    const mordeu = res.some(r => !r.ok);
    if (!mordeu) cegas++;
    linhas.push({ alvo: m.alvo, nome: m.nome, mordeu });
  }
  if (JSON_OUT) console.log(JSON.stringify({ mutate: true, linhas }, null, 1));
  else {
    console.log('SEO/AEO (MUTANTES — o esperado é cada um FALHAR)\n');
    for (const l of linhas) console.log(` ${l.mordeu ? '✓' : '✗'} ${l.alvo} · ${l.nome}`);
  }
  if (cegas) {
    console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram sem derrubar a régua.`);
    process.exit(1);
  }
  console.log(`\n✓ a régua MORDE: os ${linhas.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const res = rodar(build);
const falhas = res.filter(r => !r.ok);
if (JSON_OUT) console.log(JSON.stringify({ res }, null, 1));
else {
  console.log('SEO/AEO\n');
  for (const r of res) console.log(` ${r.ok ? '✓' : '✗'} ${r.nome}${r.erro ? '\n     ' + r.erro : ''}`);
}
console.log(`\n${falhas.length ? '✗' : '✓'} SEO/AEO ${res.length - falhas.length}/${res.length} casos`);
process.exit(falhas.length ? 1 : 0);
