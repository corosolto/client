/* ============================================================================
   i18n-twins-check.mjs — pares PT↔EN das páginas estáticas (issue #54)
   ----------------------------------------------------------------------------
   Uma tabela (`src/lib/i18n-pairs.ts`) alimenta hreflang, lang, og:locale e
   sitemap. A gêmea do /changelog é /whats-new; o cromo é EN e o corpo continua
   o CHANGELOG.md, parseado numa fonte só.

   Mutantes: sem-par | sem-redirect | chrome-pt | lang-pt | sem-sitemap | parser-dup
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['sem-par', 'sem-redirect', 'chrome-pt', 'lang-pt', 'sem-sitemap', 'parser-dup'].includes(MUT))
  throw new Error(`mutante desconhecido: ${MUT}`);

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');

let pairs = read('src/lib/i18n-pairs.ts');
let layout = read('src/layouts/Layout.astro');
let sitemap = read('src/pages/sitemap.xml.ts');
let changelog = read('src/pages/changelog.astro');
let gemea = read('src/pages/whats-new.astro');
let menu = read('public/js/main.js');

if (MUT === 'sem-par')
  pairs = pairs.replace("  ['/changelog', '/whats-new'],\n", '');
if (MUT === 'sem-redirect')
  changelog = changelog.replace("location.replace('/whats-new')", "location.replace('/changelog')");
if (MUT === 'chrome-pt')
  gemea = gemea.replace(/production version/g, 'versão em produção');
if (MUT === 'lang-pt')
  layout = layout.replace('<html lang={pageLang}>', '<html lang="pt-BR">');
if (MUT === 'sem-sitemap')
  sitemap = sitemap.replaceAll('PT_EN_PAIRS', '[]');
if (MUT === 'parser-dup')
  gemea = gemea.replace("from '../lib/changelog'", "from '../lib/site'");

const failures = [];
if (!pairs.includes("['/changelog', '/whats-new']"))
  failures.push('I18N0 a tabela única não declara /changelog ↔ /whats-new');
if (!layout.includes("from '../lib/i18n-pairs'") || layout.includes("const PT_EN_PAIRS: [string, string][]"))
  failures.push('I18N0 Layout ainda copia a tabela em vez de importar src/lib/i18n-pairs.ts');
if (!sitemap.includes("from '../lib/i18n-pairs'"))
  failures.push('I18N0 sitemap não lê a tabela única');

if (!existsSync('src/pages/whats-new.astro'))
  failures.push('I18N1 falta src/pages/whats-new.astro — gêmea EN do /changelog');
if (!changelog.includes("location.replace('/whats-new')"))
  failures.push('I18N2 /changelog em EN não manda para /whats-new');
if (!gemea.includes("location.replace('/changelog')"))
  failures.push('I18N2 /whats-new em PT não manda para /changelog');
if (!layout.includes("'/changelog': ['/whats-new'"))
  failures.push('I18N3 Layout GEMEA em EN não troca o href do changelog');
if (!menu.includes("'/changelog': '/whats-new'"))
  failures.push('I18N3 menu do jogo em EN não troca o href do changelog');
if (gemea && !gemea.includes('production version'))
  failures.push('I18N4 cromo da gêmea ainda não está em inglês (kicker)');
if (gemea && !gemea.includes('filter versions'))
  failures.push('I18N4 cromo da gêmea ainda não está em inglês (busca)');
if (gemea && !gemea.includes("import md from '../../CHANGELOG.md?raw'"))
  failures.push('I18N5 gêmea EN não renderiza o mesmo CHANGELOG.md');

if (!layout.includes('<html lang={pageLang}>') || !layout.includes("pairedPt ? 'en' : 'pt-BR'"))
  failures.push('I18N6 gêmea EN ainda declara html lang=pt-BR (crawler lê mentira)');
if (!layout.includes("pageLang === 'en' ? 'en_US' : 'pt_BR'"))
  failures.push('I18N6 og:locale das gêmeas EN continua pt_BR');
if (!layout.includes("inLanguage: pageLang") || !layout.includes('jsonldLang'))
  failures.push('I18N6 JSON-LD das gêmeas EN continua inLanguage pt-BR');

if (!sitemap.includes('PT_EN_PAIRS') || !/PT_EN_PAIRS\.map/.test(sitemap))
  failures.push('I18N7 sitemap não lista as rotas EN da tabela única');

if (!changelog.includes("from '../lib/changelog'") || !gemea.includes("from '../lib/changelog'")
    || !changelog.includes('{ versoes, recentes, atualVer }') || !gemea.includes('{ versoes, recentes, atualVer }'))
  failures.push('I18N8 /changelog e /whats-new não compartilham o parser (vão divergir)');

for (const failure of failures) console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
if (MUT && !failures.length) failures.push(`mutação ${MUT} não foi detectada`);

if (failures.length) {
  console.error(`\x1b[31mI18N TWINS ${failures.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}`);
  process.exitCode = 1;
} else {
  console.error('\x1b[32mI18N TWINS verde: pares numa tabela, lang/og/sitemap honestos, changelog com parser único\x1b[0m');
}
