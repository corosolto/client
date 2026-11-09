#!/usr/bin/env node
/* ============================================================================
   share-origin-check.mjs — LINKS DE COMPARTILHAR USAM corosol.to
   ----------------------------------------------------------------------------
   O domínio curto é só para links que alguém vai copiar/enviar. O endereço que
   o crawler indexa continua sendo https://www.corosolto.com.br: canonical,
   og:url e sitemap não podem atravessar esta fronteira.

   A régua lê a fonte e o artefato de build (não o servidor de desenvolvimento).
   Sem dist/client ela falha fechado.

   Uso:
     npm run build && node tools/eval/share-origin-check.mjs
     npm run build && node tools/eval/share-origin-check.mjs --mutate

   --mutate executa mutações sintéticas sobre a mesma entrada da régua. Cada
   mutante precisa acender ao menos uma cláusula; se passar, a própria régua
   sai vermelha.
   ============================================================================ */
import {
  existsSync, readdirSync, readFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist', 'client');
const MUTATE = process.argv.includes('--mutate');
const SHARE = 'https://corosol.to';
const SITE = 'https://www.corosolto.com.br';

const SOURCE_PATHS = {
  site: path.join(ROOT, 'src', 'lib', 'site.ts'),
  index: path.join(ROOT, 'src', 'pages', 'index.astro'),
  layout: path.join(ROOT, 'src', 'layouts', 'Layout.astro'),
  share: path.join(ROOT, 'public', 'js', 'compartilhar.js'),
  invite: path.join(ROOT, 'public', 'js', 'nos.js'),
  friends: path.join(ROOT, 'public', 'js', 'convida-amigos.js'),
  profile: path.join(ROOT, 'public', 'js', 'community.js'),
  clans: path.join(ROOT, 'public', 'js', 'clans.js'),
  profilePop: path.join(ROOT, 'public', 'js', 'tp', 'perfil.js'),
  tretaStore: path.join(ROOT, 'public', 'js', 'treta-store.js'),
  social: path.join(ROOT, 'public', 'js', 'tp', 'social.js'),
  sitemap: path.join(ROOT, 'src', 'pages', 'sitemap.xml.ts'),
  sitemapPage: path.join(ROOT, 'src', 'pages', 'sitemap-[page].xml.ts'),
};

function readSources() {
  const files = {};
  for (const [name, file] of Object.entries(SOURCE_PATHS)) {
    if (!existsSync(file)) throw new Error(`fonte obrigatória ausente: ${path.relative(ROOT, file)}`);
    files[name] = readFileSync(file, 'utf8');
  }
  return files;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else out.push(file);
  }
  return out;
}

function readBuild() {
  if (!existsSync(DIST)) throw new Error(`dist/client/ não existe. Rode npm run build antes de ${path.relative(ROOT, process.argv[1])}.`);
  const files = {};
  for (const file of walk(DIST)) {
    if (!/\.(?:html?|js|mjs|xml|txt|json)$/i.test(file)) continue;
    files[path.relative(DIST, file)] = readFileSync(file, 'utf8');
  }
  if (!Object.keys(files).length) throw new Error('dist/client/ não contém artefatos HTML/JS legíveis.');
  return files;
}

function all(files, re) {
  return Object.entries(files).filter(([name, text]) => re.test(`${name}\n${text}`));
}

function tags(files, re) {
  const out = [];
  for (const [file, text] of Object.entries(files)) {
    for (const tag of text.match(re) || []) out.push({ file, tag });
  }
  return out;
}

function canonicalTags(files) {
  return tags(files, /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi);
}

function ogUrlTags(files) {
  return tags(files, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi);
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1] || '';
}

function sourceCases(s) {
  const canonicalLayout = /<link\s+rel=["']canonical["']\s+href=\{canonical\}/.test(s.layout)
    && /<meta\s+property=["']og:url["']\s+content=\{canonical\}/.test(s.layout)
    && !/<(?:link|meta)\b[^>]*(?:canonical|og:url)[^>]*corosol\.to/i.test(s.layout);
  const indexCanonical = /const pageUrl\s*=\s*abs\(/.test(s.index)
    && /<link\s+rel=["']canonical["']\s+href=\{pageUrl\}/.test(s.index)
    && /const selfUrl\s*=\s*abs\(/.test(s.index)
    && /<meta\s+property=["']og:url["']\s+content=\{selfUrl\}/.test(s.index)
    && !/<(?:link|meta)\b[^>]*(?:canonical|og:url)[^>]*corosol\.to/i.test(s.index);
  const sitemapSource = [s.sitemap, s.sitemapPage].every((text) =>
    text.includes('SITE') && !text.includes('SHARE_ORIGIN') && !text.includes(SHARE));

  return [
    ['SRC1', /^export\s+const\s+SHARE_ORIGIN\s*=\s*['"]https:\/\/corosol\.to['"]\s*;?/m.test(s.site), 'SHARE_ORIGIN declara corosol.to'],
    ['SRC2', /window\.__SHARE_ORIGIN\s*=\s*SHARE_ORIGIN/.test(s.index), 'SHARE_ORIGIN é injetada no HTML antes dos módulos'],
    ['SRC3', /origemCompartilhamento/.test(s.share)
      && /host\.endsWith\(['"]corosolto\.com\.br['"]\)/.test(s.share)
      && /return\s+origem\s*\|\|/.test(s.share), 'helper preserva same-origin em dev e usa a origem curta em produção'],
    ['SRC4', /linkCompartilhavel/.test(s.share)
      && /utm_source/.test(s.share) && /utm_medium/.test(s.share), 'helper compartilhável acrescenta UTM source/medium'],
    ['SRC5', /origemCompartilhamento\(\)/.test(s.invite)
      && /new URL\(\s*`\/sala\/\$\{convite\}/.test(s.invite), 'convite usa corosol.to e mantém o caminho /sala/'],
    ['SRC6', /linkConvite\s*\(/.test(s.friends)
      && /linkCompartilhavel\(/.test(s.friends), 'convite de amigos passa pelo helper compartilhável'],
    ['SRC7', /linkCompartilhavel\(p\.url,\s*["']perfil["']\)/.test(s.profile)
      && /origemCompartilhamento\(\)/.test(s.profile), 'compartilhamento de perfil usa /u/* na origem curta'],
    ['SRC8', /linkCompartilhavel\(.*\/clans\//.test(s.clans)
      && /origemCompartilhamento\(\)/.test(s.clans), 'compartilhamento de clã usa /clans/* na origem curta'],
    ['SRC9', /origemCompartilhamento\(\)|linkCompartilhavel\(/.test(s.profilePop)
      && !/\$\{location\.origin\}\/clans\//.test(s.profilePop), 'perfil Treta Pop não volta a montar link de clã com location.origin'],
    ['SRC10', /origemCompartilhamento\(\)/.test(s.tretaStore)
      && !/new URL\(\s*['"]\/['"]\s*,\s*location\.origin\)/.test(s.tretaStore), 'indicação da loja usa a origem curta, não location.origin'],
    ['SRC11', canonicalLayout && indexCanonical, 'canonical e og:url de fonte continuam no host canônico'],
    ['SRC12', sitemapSource, 'sitemap de fonte usa SITE, nunca corosol.to'],
    ['SRC13', /const publico\s*=\s*linkDeConvite\(conv,\s*origemCompartilhamento\(\)\)/.test(s.social)
      && /telegram\.href\s*=\s*`https:\/\/t\.me\/share\/url\?url=\$\{encodeURIComponent\(publico\)\}/.test(s.social)
      && /navigator\.clipboard\.writeText\(`\$\{chamada\} \$\{publico\}`\)/.test(s.social), 'sociais Treta Pop usam o convite na origem curta'],
  ];
}

function buildCases(files) {
  const html = Object.fromEntries(Object.entries(files).filter(([name]) => /\.html?$/i.test(name)));
  const js = Object.fromEntries(Object.entries(files).filter(([name]) => /\.(?:js|mjs)$/i.test(name)));
  const canon = canonicalTags(html);
  const og = ogUrlTags(html);
  const canonOk = canon.length > 0 && canon.every(({ tag }) => {
    const url = attr(tag, 'href');
    return url.startsWith(SITE) && !url.startsWith(SHARE);
  });
  const ogOk = og.length > 0 && og.every(({ tag }) => {
    const url = attr(tag, 'content');
    return url.startsWith(SITE) && !url.startsWith(SHARE);
  });
  const sitemap = all(files, /(?:^|\/)sitemap(?:-[^/]+)?\.xml(?:$|\n)/i);
  const sitemapOk = sitemap.every(([, text]) => !text.includes(SHARE));
  const jsEntries = Object.values(js);
  const jsText = jsEntries.join('\n');
  const htmlText = Object.values(html).join('\n');
  const shareJs = jsEntries.some((text) => text.includes(SHARE));
  const inviteJs = jsEntries.some((text) => text.includes('/sala/'));
  const utmJs = jsEntries.some((text) => /utm_source/.test(text) && /utm_medium/.test(text));
  const socialJs = Object.entries(js).find(([name]) => /(?:^|\/)tp\/social\.js$/.test(name))?.[1] || '';
  const surfaceHtml = htmlText.includes(SHARE) && /__SHARE_ORIGIN/.test(htmlText);

  return [
    ['BLD1', Object.keys(html).length > 0 && Object.keys(js).length > 0, 'build tem superfícies HTML e JS para auditar'],
    ['BLD2', surfaceHtml || shareJs, 'HTML/JS buildado referencia corosol.to nas superfícies de compartilhar'],
    ['BLD3', inviteJs && shareJs, 'JS buildado mantém corosol.to e /sala/ no convite'],
    ['BLD4', utmJs, 'JS buildado mantém UTM nos links compartilháveis'],
    ['BLD5', canonOk, `canonical buildado no host canônico (${canon.length} encontrado(s))`],
    ['BLD6', ogOk, `og:url buildado no host canônico (${og.length} encontrado(s))`],
    ['BLD7', sitemapOk, 'sitemap buildado, quando presente, não usa corosol.to'],
    ['BLD8', /const publico\s*=\s*linkDeConvite\(conv,\s*origemCompartilhamento\(\)\)/.test(socialJs)
      && /https:\/\/t\.me\/share\/url\?url=\$\{encodeURIComponent\(publico\)\}/.test(socialJs)
      && /navigator\.clipboard\.writeText\(`\$\{chamada\} \$\{publico\}`\)/.test(socialJs), 'bundle social do Treta Pop compartilha o convite curto'],
  ];
}

function run(snapshot) {
  return [...sourceCases(snapshot.sources), ...buildCases(snapshot.build)]
    .map(([id, ok, description]) => ({ id, ok: Boolean(ok), description }));
}

let sources;
let build;
try {
  sources = readSources();
  build = readBuild();
} catch (error) {
  console.error(`✗ SHARE-ORIGIN  ${error.message}`);
  process.exit(1);
}

const baseline = { sources, build };
const checks = run(baseline);

if (MUTATE) {
  const mutants = [
    {
      nome: 'SHARE_ORIGIN volta para o host canônico',
      aplica: (base) => ({
        ...base,
        sources: { ...base.sources, site: base.sources.site.replace(
          /export\s+const\s+SHARE_ORIGIN\s*=\s*['"]https:\/\/corosol\.to['"]/, `export const SHARE_ORIGIN = '${SITE}'`,
        ) },
      }),
    },
    {
      nome: 'convite perde o prefixo /sala/',
      aplica: (base) => ({
        ...base,
        sources: { ...base.sources, invite: base.sources.invite.replace(
          /`\/sala\/\$\{convite\}/, '`/${convite}',
        ) },
      }),
    },
    {
      nome: 'canonical buildado volta para corosol.to',
      aplica: (base) => ({
        ...base,
        build: Object.fromEntries(Object.entries(base.build).map(([file, text]) =>
          /\.html?$/i.test(file) ? [file, text.replaceAll(SITE, SHARE)] : [file, text])),
      }),
    },
  ];
  let cegas = 0;
  console.log('SHARE-ORIGIN (MUTANTES — o esperado é cada um FALHAR)\n');
  for (const mutant of mutants) {
    const mutated = mutant.aplica(baseline);
    const result = run(mutated);
    const mordeu = result.some((caseResult) => !caseResult.ok);
    if (!mordeu) cegas++;
    const vermelhas = result.filter((caseResult) => !caseResult.ok).map((caseResult) => caseResult.id).join(', ');
    console.log(` ${mordeu ? '✓' : '✗'} ${mutant.nome}${vermelhas ? ` — ${vermelhas}` : ''}`);
  }
  if (cegas) {
    console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram sem derrubar a régua.`);
    process.exit(1);
  }
  console.log(`\n✓ a régua MORDE: ${mutants.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const falhas = checks.filter((result) => !result.ok);
console.log('SHARE-ORIGIN\n');
for (const result of checks) console.log(` ${result.ok ? '✓' : '✗'} ${result.id} ${result.description}`);
console.log(`\n${falhas.length ? '✗' : '✓'} SHARE-ORIGIN ${checks.length - falhas.length}/${checks.length} casos`);
process.exit(falhas.length ? 1 : 0);
